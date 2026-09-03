#!/usr/bin/env python3
"""Check spec/plan/questions artifacts against the size and content gates.

Usage:
    tools/spec-lint.py specs/                 # every artifact in a directory
    tools/spec-lint.py specs/038-spec.md      # named files
    tools/spec-lint.py --fold-ready specs/038-questions-01.md
    tools/spec-lint.py --quiet specs/         # errors only

Exit status is 1 if any ERROR was reported, otherwise 0, so this works as a
pre-commit hook or a CI step.
"""

import argparse
import pathlib
import re
import sys

BUDGET = {  # artifact type -> (budget, hard ceiling)
    "spec": (1000, 1500),
    "questions": (1000, 1500),
    "phase": (300, 500),  # plans are measured per phase
}
MAX_REQUIREMENT_WORDS = 50
MAX_BOLD_SHARE = 0.03
MAX_GAP_LINES = 5

# Phrases that mean a spec is recording history, process state, or arguing
# with its reader rather than stating what is true when the work is done.
BANNED = [
    (r"\bpreviously\b|\bused to\b|\bno longer\b|\bformerly\b|\bearlier draft\b", "history"),
    (r"\bwas changed\b|\bhas been changed\b|\bwe tried\b|\btried and (dropped|rejected)\b", "history"),
    (r"\brecorded because\b|\bsuperseded\b|\bfor the record\b", "history"),
    (r"^\s*>?\s*\*{0,2}(Drafted|Amendment|Correction|Status)\b", "process state"),
    (r"\b(not )?approved\b|\bawaiting (approval|the owner)\b", "process state"),
    (r"\b[0-9a-f]{7,40}\b(?![\w./-])", "commit id"),
    (r"\bdo not fix from\b|\banyone (who|writing)\b|\bthe next person\b", "agent-directed"),
]

Finding = tuple  # (level, line_no, message)


def strip_template_header(text):
    """Drop the leading 'Template for ...' blockquote, which is instructions to
    the author and is deleted before an artifact is approved."""
    lines = text.splitlines()
    out, i = [], 0
    while i < len(lines):
        if lines[i].lstrip().startswith(">"):
            block, j = [], i
            while j < len(lines) and (lines[j].lstrip().startswith(">") or not lines[j].strip()):
                block.append(lines[j])
                j += 1
            if "Template for" in "\n".join(block):
                out.extend("" for _ in block)
                i = j
                continue
        out.append(lines[i])
        i += 1
    return "\n".join(out)


def strip_code(text):
    """Blank out fenced code blocks so they do not count toward prose."""
    out, in_fence = [], False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append("")
        else:
            out.append("" if in_fence else line)
    return "\n".join(out)


def words(text):
    return len(strip_code(text).split())


def artifact_type(path):
    n = path.name
    if re.search(r"-questions-\d+\.md$", n):
        return "questions"
    if n.endswith("-plan.md"):
        return "plan"
    if n.endswith("-spec.md"):
        return "spec"
    return None


def section(text, pattern):
    """Return the body of the first heading matching pattern, or ''."""
    lines = strip_code(text).splitlines()
    body, depth = [], None
    for line in lines:
        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            if depth is None and re.search(pattern, h.group(2), re.I):
                depth = len(h.group(1))
                continue
            if depth is not None and len(h.group(1)) <= depth:
                break
        elif depth is not None:
            body.append(line)
    return "\n".join(body)


def check_budget(text, kind, label="document"):
    lo, hi = BUDGET[kind]
    n = words(text)
    if n > hi:
        return [("ERROR", 1, f"{label} is {n} words, over the {hi}-word ceiling")]
    if n > lo:
        return [("WARN", 1, f"{label} is {n} words, over the {lo}-word budget")]
    return [("INFO", 1, f"{label} is {n} words, within the {lo}-word budget")]


def check_density(text):
    found = []
    body = strip_code(text)
    total = len(body.split())
    bold = sum(len(m.split()) for m in re.findall(r"\*\*(.+?)\*\*", body, re.S))
    if total and bold / total > MAX_BOLD_SHARE:
        found.append(("WARN", 1,
                      f"bold is {bold / total:.0%} of words (limit {MAX_BOLD_SHARE:.0%}); "
                      "emphasis this dense carries no signal"))
    refs = len(re.findall(r"\b[\w./-]+\.(md|py|gd|ts|tsx|js|json|sh|tscn|yml|yaml)\b", body))
    if refs > 10:
        found.append(("WARN", 1, f"{refs} file cross-references; cite a file only when the reader must open it"))
    return found


def check_requirements(text):
    found = []
    body = section(text, r"^requirements")
    if not body.strip():
        return found
    items, current, start = [], [], 0
    for i, line in enumerate(body.splitlines(), 1):
        if re.match(r"^\s*(\d+\.|[-*]|R\d+(\.\d+)?)\s+\S", line):
            if current:
                items.append((start, " ".join(current)))
            current, start = [line], i
        elif current and line.strip():
            current.append(line)
        elif current and not line.strip():
            items.append((start, " ".join(current)))
            current = []
    if current:
        items.append((start, " ".join(current)))
    for _, item in items:
        n = len(item.split())
        if n > MAX_REQUIREMENT_WORDS:
            head = re.sub(r"\s+", " ", item)[:60]
            found.append(("ERROR", 0, f"requirement is {n} words (limit {MAX_REQUIREMENT_WORDS}): {head}..."))
    if any(re.match(r"^\s+(\d+\.|[-*])\s", l) for l in body.splitlines()):
        found.append(("WARN", 0, "requirements are nested; keep the list flat, one fact per item"))
    return found


def check_banned(text):
    found = []
    for i, line in enumerate(strip_code(text).splitlines(), 1):
        if line.lstrip().startswith("|"):
            continue  # tables of values are fine
        for pattern, kind in BANNED:
            m = re.search(pattern, line, re.I | re.M)
            if m:
                found.append(("WARN", i, f"{kind}: \"{m.group(0).strip()}\" - route it or cut it"))
                break
    return found


def check_spec(text):
    text = strip_template_header(text)
    found = check_budget(text, "spec")
    found += check_requirements(text)
    found += check_banned(text)
    found += check_density(text)
    return found


def check_plan(text):
    text = strip_template_header(text)
    found = []
    body = strip_code(text)
    phases = re.split(r"^##\s+(?=Phase\b)", body, flags=re.M | re.I)
    preamble = phases[0]
    for name, chunk in ((re.split(r"\n", p, maxsplit=1) + [""])[:2] for p in phases[1:]):
        found += check_budget(chunk, "phase", f"phase '{name.strip()}'")
    if len(phases) == 1:
        found.append(("WARN", 1, "no '## Phase NN' sections found"))
    # Anything substantial before the first phase is the repo-inventory smell.
    pre_words = len(re.sub(r"^#.*$", "", preamble, flags=re.M).split())
    if pre_words > 120:
        found.append(("ERROR", 1,
                      f"{pre_words} words before the first phase; a plan is a checklist, "
                      "not a memo - cut the preamble to a Gaps list"))
    gaps = section(text, r"^gaps")
    n_gaps = len([l for l in gaps.splitlines() if re.match(r"^\s*[-*]\s+\S", l)])
    if n_gaps > MAX_GAP_LINES:
        found.append(("WARN", 1, f"{n_gaps} gap lines (limit {MAX_GAP_LINES}); the spec needs another pass"))
    found += check_density(text)
    return found


def check_questions(text, fold_ready):
    text = strip_template_header(text)
    found = check_budget(text, "questions")
    body = strip_code(text)
    # Question headings may be ## or ###; a block ends at the next heading of
    # the same level or higher, so a shared "How to Answer" example is not read
    # as an answer to the last question.
    blocks = []
    for m in re.finditer(r"^(#{2,4})\s+(Q\d+\b.*)$", body, flags=re.M):
        level = len(m.group(1))
        rest = body[m.end():]
        stop = re.search(r"^#{1,%d}\s+" % level, rest, flags=re.M)
        blocks.append(m.group(2) + "\n" + (rest[:stop.start()] if stop else rest))
    if not blocks:
        found.append(("WARN", 1, "no '## Qn', '### Qn' or '#### Qn' question headings found"))
    unanswered = []
    for block in blocks:
        title = block.splitlines()[0].strip()
        answered = re.search(r"^\s*>\s*\*{0,2}Decision", block, re.M | re.I)
        # A recommendation exists to make answering cheap; once answered it is moot.
        if not answered and not re.search(r"^\s*>?\s*\*{0,2}Recommend", block, re.M | re.I):
            found.append(("ERROR", 0, f"question has no recommendation: {title}"))
        if not answered:
            unanswered.append(title)
    if unanswered:
        level = "ERROR" if fold_ready else "INFO"
        found.append((level, 0, f"{len(unanswered)} question(s) with no '> Decision:': "
                                + "; ".join(unanswered[:4]) + ("; ..." if len(unanswered) > 4 else "")))
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", type=pathlib.Path)
    ap.add_argument("--fold-ready", action="store_true",
                    help="fail when a questions file still has unanswered questions")
    ap.add_argument("--quiet", "-q", action="store_true", help="show errors only")
    ap.add_argument("--warn-only", action="store_true", help="always exit 0")
    args = ap.parse_args()

    targets = []
    for p in args.paths:
        targets.extend(sorted(p.rglob("*.md")) if p.is_dir() else [p])

    errors = 0
    for path in targets:
        kind = artifact_type(path)
        if kind is None:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if kind == "spec":
            found = check_spec(text)
        elif kind == "plan":
            found = check_plan(text)
        else:
            found = check_questions(text, args.fold_ready)

        errors += sum(1 for lvl, _, _ in found if lvl == "ERROR")
        shown = [f for f in found if not (args.quiet and f[0] != "ERROR")]
        if not shown:
            continue
        print(f"\n{path}  [{kind}]")
        for level, line, msg in shown:
            where = f":{line}" if line else ""
            print(f"  {level:<5}{where:<6} {msg}")

    print(f"\n{len(targets)} file(s) checked, {errors} error(s).")
    return 0 if args.warn_only else (1 if errors else 0)


if __name__ == "__main__":
    sys.exit(main())
