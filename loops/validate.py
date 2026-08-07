#!/usr/bin/env python3
"""
validate.py — checkable-condition validator for human-gated spec-driven AI development.

Verifies the mechanical conditions of the workflow so a skill does not have to ask an
agent to self-report them. Judgment stays with the human and the skill; this only checks
things that are true or false.

Checks, by amendment:
  A1  every plan phase has Verification: and a resolvable Bar:
  A3  no gauntlet log exists for an `automated` phase (cost rule)
  A6  plan uses no class the spec never attests; with --baseline, detects
      promotion of a phase class between runs
  A8  specification gate: questions resolved, criteria classed and barred, bars exist,
      approval recorded
  A9  invariants declared and each has a check; gauntlet rounds carry full vectors;
      regression and plateau detection across rounds

Design notes:
  - stdlib only, so it runs under any host, in CI, or from a terminal
  - distinguishes "structure not yet adopted" (info) from "structure present but wrong"
    (error), so it stays usable during incremental rollout
  - exit 0 if no errors, 1 otherwise; --json for machine consumption

Usage:
  validate.py [SPECS_DIR] [--cycle NNN] [--json] [--strict] [--quiet]

  --cycle NNN   validate only the cycle with that numeric prefix
  --baseline F  compare phase classes against snapshot F to detect promotions
  --write-baseline F   record current phase classes as a baseline, then exit
  --strict      treat "not yet adopted" info as an error
  --json        emit findings as JSON
  --quiet       suppress passing checks in text output
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field, asdict

CLASSES = ("automated", "reference", "human-eyes")
# Strictness order: a lower index means more human involvement.
CLASS_RANK = {"human-eyes": 0, "reference": 1, "automated": 2}

ERROR, WARN, INFO = "error", "warn", "info"


@dataclass
class Finding:
    severity: str
    rule: str
    path: str
    message: str
    detail: str = ""


@dataclass
class Cycle:
    prefix: str
    label: str = ""
    spec: str | None = None
    plan: str | None = None
    questions: list[str] = field(default_factory=list)
    gauntlets: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- io


def read(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError as exc:
        return f"<<UNREADABLE: {exc}>>"


def discover(specs_dir: str) -> dict[str, Cycle]:
    """Group artifacts by their three-digit numeric prefix."""
    cycles: dict[str, Cycle] = {}
    if not os.path.isdir(specs_dir):
        return cycles
    for name in sorted(os.listdir(specs_dir)):
        m = re.match(r"^(\d{3})-?([a-zA-Z0-9_-]*?)-?(spec|plan|questions-\d{2}"
                     r"|phase-\d{2}-gauntlet|phase-\d{2}-review|phase-\d{2}-retro"
                     r"|rubric-[a-zA-Z0-9_-]+)\.md$", name)
        if not m:
            continue
        prefix, label, kind = m.group(1), m.group(2), m.group(3)
        cyc = cycles.setdefault(prefix, Cycle(prefix=prefix))
        if label and not cyc.label:
            cyc.label = label
        full = os.path.join(specs_dir, name)
        if kind == "spec":
            cyc.spec = full
        elif kind == "plan":
            cyc.plan = full
        elif kind.startswith("questions"):
            cyc.questions.append(full)
        elif kind.endswith("gauntlet"):
            cyc.gauntlets.append(full)
    return cycles


# ----------------------------------------------------------------- parse: spec


def section(text: str, heading: str) -> str | None:
    """Return the body of a `## heading` section, case-insensitive."""
    pat = re.compile(rf"^#{{1,4}}\s*{re.escape(heading)}\s*$", re.I | re.M)
    m = pat.search(text)
    if not m:
        return None
    rest = text[m.end():]
    nxt = re.search(r"^#{1,4}\s+\S", rest, re.M)
    return rest[:nxt.start()] if nxt else rest


def parse_bar_table(text: str) -> list[dict]:
    """Parse the spec's acceptance-criteria bar table.

    Expects a markdown table whose header contains criterion / class / bar.
    Returns [] when no such table is present (structure not yet adopted).
    """
    rows: list[dict] = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if not line.strip().startswith("|"):
            continue
        head = [c.strip().lower() for c in line.strip().strip("|").split("|")]
        if not ({"criterion", "class"} <= set(head) and any("bar" in h for h in head)):
            continue
        ci, cl = head.index("criterion"), head.index("class")
        bi = next(i2 for i2, h in enumerate(head) if "bar" in h)
        for row in lines[i + 2:]:
            if not row.strip().startswith("|"):
                break
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            if len(cells) <= max(ci, cl, bi):
                continue
            if set(cells[ci].replace("-", "").strip()) == set():
                continue
            rows.append({"criterion": cells[ci], "class": cells[cl].lower(),
                         "bar": cells[bi]})
        break
    return rows


def parse_invariants(text: str) -> list[dict] | None:
    body = section(text, "Invariants")
    if body is None:
        return None
    out = []
    for line in body.splitlines():
        s = line.strip()
        if not s.startswith(("-", "*")):
            continue
        s = s[1:].strip()
        if not s:
            continue
        m = re.search(r"check\s*:\s*(.+)$", s, re.I)
        out.append({"text": s, "check": m.group(1).strip() if m else None})
    return out


def spec_approved(text: str) -> bool:
    return bool(re.search(r"^\s*>?\s*Approved\s*:", text, re.I | re.M))


def unresolved_questions(text: str) -> int:
    """Count must-answer items with no `> Decision:` following them."""
    body = section(text, "Must Answer") or text
    items = [l for l in body.splitlines() if l.strip().startswith(("-", "*"))]
    decisions = len(re.findall(r"^\s*>\s*Decision\s*:", text, re.I | re.M))
    return max(0, len(items) - decisions)


# ----------------------------------------------------------------- parse: plan


def parse_phases(text: str) -> list[dict]:
    phases = []
    for m in re.finditer(r"^#{2,3}\s*(Phase\s+(\d{1,2})[^\n]*)$", text, re.I | re.M):
        start = m.end()
        nxt = re.search(r"^#{2,3}\s*Phase\s+\d", text[start:], re.I | re.M)
        body = text[start:start + nxt.start()] if nxt else text[start:]
        v = re.search(r"^\s*Verification\s*:\s*(.+)$", body, re.I | re.M)
        b = re.search(r"^\s*Bar\s*:\s*(.+)$", body, re.I | re.M)
        blocked = bool(re.search(r"^\s*[-*]\s*\[!\]", body, re.M))
        phases.append({
            "title": m.group(1).strip(),
            "number": m.group(2).zfill(2),
            "verification": (v.group(1).strip().lower() if v else None),
            "bar": (b.group(1).strip() if b else None),
            "blocked": blocked,
        })
    return phases


# -------------------------------------------------------------- parse: gauntlet


def parse_rounds(text: str) -> list[dict]:
    rounds = []
    for m in re.finditer(r"^#{2,4}\s*Round\s+(\d{1,2})\s*$", text, re.I | re.M):
        start = m.end()
        nxt = re.search(r"^#{2,4}\s*(Round\s+\d|[A-Z])", text[start:], re.M)
        body = text[start:start + nxt.start()] if nxt else text[start:]
        vec = re.search(r"Bar vector\s*:\*{0,2}\s*(.+)$", body, re.I | re.M)
        parsed = {}
        if vec:
            for part in vec.group(1).split(","):
                if ":" in part:
                    k, v = part.rsplit(":", 1)
                    k = k.strip().strip("*_` ")
                    v = v.strip().strip("*_` ").lower()
                    if k:
                        parsed[k] = v
        rounds.append({"number": m.group(1).zfill(2), "vector": parsed,
                       "has_vector": bool(vec)})
    return rounds


# ------------------------------------------------------------------ bar checks


def bar_resolves(bar: str, root: str) -> tuple[bool, str]:
    """Does a Bar: value point at something real?

    Accepts: an existing path, path::test-name, or an explicit n/a for human-eyes.
    """
    b = bar.strip().strip("`")
    if not b or b.lower() in {"n/a", "none", "-", "tbd"}:
        return False, "empty or placeholder"
    if re.match(r"^(developer|human)\b", b, re.I):
        return True, "human judgment (human-eyes)"
    path = b.split("::", 1)[0].strip()
    for cand in (path, os.path.join(root, path)):
        if os.path.exists(cand):
            return True, "path exists"
    if re.search(r"\b(suite|all tests|the tests)\b", b, re.I):
        return False, "names a suite rather than a specific check"
    return False, f"path not found: {path}"


# --------------------------------------------------------------------- checking


class Validator:
    def __init__(self, specs_dir: str, root: str):
        self.specs_dir = specs_dir
        self.root = root
        self.findings: list[Finding] = []
        self.checked = 0

    def add(self, sev, rule, path, msg, detail=""):
        self.findings.append(Finding(sev, rule, path, msg, detail))

    # -- A8 ----------------------------------------------------------------
    def check_spec(self, cyc: Cycle) -> list[dict]:
        if not cyc.spec:
            self.add(WARN, "A8", f"{cyc.prefix}-*", "cycle has no spec file")
            return []
        text = read(cyc.spec)
        rel = os.path.relpath(cyc.spec, self.root)
        rows = parse_bar_table(text)

        if not rows:
            self.add(INFO, "A8", rel,
                     "no acceptance-criteria bar table found",
                     "structure not yet adopted; add a | Criterion | Class | Bar | table")
        for r in rows:
            self.checked += 1
            if r["class"] not in CLASSES:
                self.add(ERROR, "A8", rel,
                         f"criterion has unknown class {r['class']!r}",
                         r["criterion"])
                continue
            ok, why = bar_resolves(r["bar"], self.root)
            if r["class"] == "human-eyes":
                if not r["bar"].strip() or r["bar"].strip() in {"-", "n/a"}:
                    self.add(WARN, "A8", rel,
                             "human-eyes criterion does not say what judgment is needed",
                             r["criterion"])
            elif not ok:
                self.add(ERROR, "A8", rel,
                         f"{r['class']} criterion has no usable bar ({why})",
                         f"{r['criterion']} -> {r['bar']}")

        inv = parse_invariants(text)
        if inv is None:
            self.add(INFO, "A9", rel, "no ## Invariants section",
                     "structure not yet adopted")
        else:
            for item in inv:
                self.checked += 1
                if not item["check"]:
                    self.add(ERROR, "A9", rel,
                             "invariant has no check (a wish, not an invariant)",
                             item["text"])

        for q in cyc.questions:
            n = unresolved_questions(read(q))
            if n:
                self.add(WARN, "A8", os.path.relpath(q, self.root),
                         f"{n} must-answer item(s) appear unresolved",
                         "specification gate is not crossed while these remain")

        if not spec_approved(text):
            self.add(WARN, "A8", rel, "no approval marker found",
                     "expected a line like `> Approved: <date> by <name>`")
        return rows

    # -- A1 / A3 / A6 ------------------------------------------------------
    def check_plan(self, cyc: Cycle, rows: list[dict]):
        if not cyc.plan:
            self.add(INFO, "A1", f"{cyc.prefix}-*", "cycle has no plan yet")
            return []
        text = read(cyc.plan)
        rel = os.path.relpath(cyc.plan, self.root)
        phases = parse_phases(text)
        if not phases:
            self.add(WARN, "A1", rel, "no phases parsed from plan")
            return []

        spec_classes = {r["class"] for r in rows if r["class"] in CLASSES}

        # Distinguish "not yet adopted" (no phase declares a class) from "partially
        # adopted" (some do), because the second is a mistake and the first is not.
        declared = sum(1 for p in phases if p["verification"] or p["bar"])
        adopted = declared > 0
        if not adopted:
            self.add(INFO, "A1", rel,
                     "no phase declares Verification:/Bar:",
                     "structure not yet adopted in this plan")

        for ph in phases:
            self.checked += 1
            if ph["verification"] is None:
                if adopted:
                    self.add(ERROR, "A1", rel,
                             f"{ph['number']}: missing Verification: while other phases "
                             f"declare one", ph["title"])
                continue
            elif ph["verification"] not in CLASSES:
                self.add(ERROR, "A1", rel,
                         f"{ph['number']}: unknown class {ph['verification']!r}",
                         ph["title"])
            if ph["bar"] is None:
                self.add(ERROR, "A1", rel,
                         f"{ph['number']}: has Verification: but no Bar:", ph["title"])
            elif ph["verification"] in ("automated", "reference"):
                ok, why = bar_resolves(ph["bar"], self.root)
                if not ok:
                    sev = ERROR if not ph["blocked"] else WARN
                    self.add(sev, "A1", rel,
                             f"{ph['number']}: Bar: does not resolve ({why})",
                             ph["bar"] + (" [phase is blocked]" if ph["blocked"] else ""))

            # A6: the plan must not use a class the spec never justifies. Detecting an
            # actual promotion needs a recorded baseline; see check_baseline().
            if (ph["verification"] in CLASSES and spec_classes
                    and ph["verification"] not in spec_classes):
                self.add(WARN, "A6", rel,
                         f"{ph['number']}: class {ph['verification']!r} appears in the "
                         f"plan but in no spec criterion",
                         f"spec attests only: {', '.join(sorted(spec_classes))}")

        # A3: automated phases must not have gauntlet logs
        for g in cyc.gauntlets:
            m = re.search(r"phase-(\d{2})-gauntlet", g)
            if not m:
                continue
            num = m.group(1)
            match = next((p for p in phases if p["number"] == num), None)
            if match and match["verification"] == "automated":
                self.add(ERROR, "A3", os.path.relpath(g, self.root),
                         f"gauntlet log exists for automated phase {num}",
                         "a critic loop on an automated phase is avoidable cost")
            if match and match["verification"] == "human-eyes":
                self.add(ERROR, "A3", os.path.relpath(g, self.root),
                         f"gauntlet log exists for human-eyes phase {num}",
                         "there is no bar to converge on; the verdict is not evidence")
        return phases

    # -- A9 ----------------------------------------------------------------
    def check_gauntlets(self, cyc: Cycle):
        for g in cyc.gauntlets:
            rel = os.path.relpath(g, self.root)
            rounds = parse_rounds(read(g))
            if not rounds:
                self.add(INFO, "A9", rel, "no rounds parsed")
                continue
            prev = None
            for rd in rounds:
                self.checked += 1
                if not rd["has_vector"]:
                    self.add(ERROR, "A9", rel,
                             f"round {rd['number']}: no Bar vector recorded",
                             "partial verification is how silent regression happens")
                    prev = None
                    continue
                if prev is not None:
                    regressed = [k for k, v in rd["vector"].items()
                                 if prev.get(k) == "pass" and v != "pass"]
                    if regressed:
                        self.add(ERROR, "A9", rel,
                                 f"round {rd['number']}: REGRESSION in "
                                 f"{', '.join(sorted(regressed))}",
                                 "a regression stops the loop; it is not a finding "
                                 "to fix next round")
                    if rd["vector"] == prev:
                        self.add(WARN, "A9", rel,
                                 f"round {rd['number']}: plateau (vector unchanged)",
                                 "further rounds spend without moving")
                prev = rd["vector"]

    # -- A6 baseline -------------------------------------------------------
    def snapshot(self) -> dict:
        """Current phase classes, for use as a promotion baseline."""
        out: dict[str, dict[str, str]] = {}
        for prefix, cyc in sorted(discover(self.specs_dir).items()):
            if not cyc.plan:
                continue
            out[prefix] = {p["number"]: (p["verification"] or "unset")
                           for p in parse_phases(read(cyc.plan))}
        return out

    def check_baseline(self, baseline_path: str):
        """Flag any phase whose class moved toward less human involvement."""
        try:
            with open(baseline_path, encoding="utf-8") as fh:
                base = json.load(fh)
        except (OSError, ValueError) as exc:
            self.add(WARN, "A6", baseline_path, f"baseline unreadable: {exc}")
            return
        now = self.snapshot()
        for prefix, phases in now.items():
            for num, cls in phases.items():
                was = base.get(prefix, {}).get(num)
                if was in (None, "unset") or cls == "unset" or cls == was:
                    continue
                self.checked += 1
                if CLASS_RANK.get(cls, -1) > CLASS_RANK.get(was, -1):
                    self.add(ERROR, "A6", f"{prefix} phase {num}",
                             f"PROMOTED {was} -> {cls} since the baseline",
                             "promotion requires a new artifact and a human gate; "
                             "an agent may not promote during a run")
                else:
                    self.add(INFO, "A6", f"{prefix} phase {num}",
                             f"demoted {was} -> {cls} (allowed, reported)")

    def run(self, only: str | None = None):
        cycles = discover(self.specs_dir)
        if not cycles:
            self.add(WARN, "-", self.specs_dir, "no numbered artifacts found")
        for prefix in sorted(cycles):
            if only and prefix != only:
                continue
            cyc = cycles[prefix]
            rows = self.check_spec(cyc)
            self.check_plan(cyc, rows)
            self.check_gauntlets(cyc)
        return self.findings


# ----------------------------------------------------------------------- output


def report(findings, checked, strict, quiet) -> int:
    counts = defaultdict(int)
    for f in findings:
        counts[f.severity] += 1
    errors = counts[ERROR] + (counts[INFO] if strict else 0)

    by_path = defaultdict(list)
    for f in findings:
        by_path[f.path].append(f)

    icon = {ERROR: "ERROR", WARN: " WARN", INFO: " INFO"}
    for path in sorted(by_path):
        print(f"\n{path}")
        for f in by_path[path]:
            print(f"  [{icon[f.severity]}] ({f.rule}) {f.message}")
            if f.detail and not quiet:
                print(f"           {f.detail}")

    print(f"\n{checked} condition(s) checked — "
          f"{counts[ERROR]} error, {counts[WARN]} warn, {counts[INFO]} info")
    if counts[INFO] and not strict:
        print("info items are unadopted structure, not failures "
              "(use --strict to fail on them)")
    print("RESULT: FAIL" if errors else "RESULT: PASS")
    return 1 if errors else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("specs_dir", nargs="?", default="specs")
    ap.add_argument("--cycle", help="only validate this three-digit prefix")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true",
                    help="treat unadopted structure as an error")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--baseline", metavar="FILE",
                    help="compare phase classes against this snapshot (A6 promotion)")
    ap.add_argument("--write-baseline", metavar="FILE",
                    help="write the current phase classes as a baseline and exit")
    args = ap.parse_args()

    root = os.path.dirname(os.path.abspath(args.specs_dir.rstrip("/"))) or "."
    v = Validator(args.specs_dir, root)

    if args.write_baseline:
        snap = v.snapshot()
        with open(args.write_baseline, "w", encoding="utf-8") as fh:
            json.dump(snap, fh, indent=2, sort_keys=True)
        n = sum(len(x) for x in snap.values())
        print(f"wrote baseline for {len(snap)} cycle(s), {n} phase(s) "
              f"-> {args.write_baseline}")
        return 0

    findings = v.run(args.cycle)
    if args.baseline:
        v.check_baseline(args.baseline)
        findings = v.findings

    if args.json:
        errors = sum(1 for f in findings
                     if f.severity == ERROR or (args.strict and f.severity == INFO))
        print(json.dumps({
            "checked": v.checked,
            "result": "fail" if errors else "pass",
            "findings": [asdict(f) for f in findings],
        }, indent=2))
        return 1 if errors else 0

    return report(findings, v.checked, args.strict, args.quiet)


if __name__ == "__main__":
    sys.exit(main())
