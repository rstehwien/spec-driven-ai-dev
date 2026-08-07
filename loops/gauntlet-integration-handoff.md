# Gauntlet Integration — Handoff

Portable state for continuing this work in a new session, on a new machine, with a fresh context or a
different model. Read this file first; it is the index and the action list. The other two documents
are the reasoning behind it.

Last updated: August 2026.

---

## Contents

- [For a fresh agent: read this first](#for-a-fresh-agent-read-this-first)
- [The files](#the-files)
- [Enforcement layers: skill, validator, harness](#enforcement-layers-skill-validator-harness)
- [Settled decisions](#settled-decisions)
- [Open decisions — blocked on the developer](#open-decisions--blocked-on-the-developer)
- [Build order](#build-order)
- [Tier 3 harvest](#tier-3-harvest)
- [Tier 4 launch kit](#tier-4-launch-kit)
- [If you build an orchestrator](#if-you-build-an-orchestrator)
- [Work vs personal projects](#work-vs-personal-projects)
- [Pre-run checklist](#pre-run-checklist)

---

## For a fresh agent: read this first

**What this project is.** Robert Stehwien maintains
[`rstehwien/spec-driven-ai-dev`](https://github.com/rstehwien/spec-driven-ai-dev), a human-gated
spec-driven AI development methodology whose central design goal is that project state lives in
durable markdown files rather than chat, so work survives context resets, token exhaustion, and model
handoffs.

**What this work stream is.** Integrating the Gauntlet Loop pattern (Matt Shumer) into that
methodology, and resolving the pending-updates notes in the repo that predate it.

**The one-paragraph summary of the whole analysis.** The Gauntlet Loop's real contribution is not
subagents or fan-out; it is that the loop's exit condition is a *comparison against an external bar*
rather than a *reviewer's satisfaction*. The repo's existing review loop exits on "the reviewer found
nothing," which a reviewer that stops looking satisfies perfectly — and the repo already documents a
real instance of exactly that failure. The fix is a per-phase `Verification:` class
(`automated` | `reference` | `human-eyes`) with a named `Bar:` artifact, which simultaneously supplies
the missing bar and controls cost, since only `reference` phases warrant a critic loop at all.

**Do not** re-derive the analysis or re-litigate the design. It is settled below. Pick up at
[Build order](#build-order).

---

## The files

| File | What it is | When to read it |
|---|---|---|
| `gauntlet-integration-handoff.md` | This file. Index, decisions, action list, launch kit. | First, always. |
| `pending-updates-gauntlet-review.md` | Review of the repo's `pending-updates.md`, plus eight repo-ready amendments (A1–A8) with paste-able text. | When implementing a specific amendment. |
| `gauntlet-loop-with-spec-driven-dev.md` | Conceptual guide to the Gauntlet Loop and its integration. Templates, worked examples, failure modes. | For background, or to explain the approach to someone else. |
| `validate.py` | Working validator for the mechanical conditions in A1, A3, A6, A8, A9. Stdlib only. Tested. | Drop into the repo root; run it now. |

The amendments in A1–A11 are the actionable content. The guide is context. `validate.py` is the only
executable artifact and the only one that enforces anything.

---

## Enforcement layers: skill, validator, harness

The recurring question — *when does a skill stay useful across Copilot, Claude, and Codex, and when
does writing your own harness become better?* — has a third answer that sits between the two, and it is
the one that fits almost everything in these amendments.

| Layer | Handles | Portable | Effort |
|---|---|---|---|
| **Skill** (markdown) | judgment — spec review, rubric scoring, "is this actually a bar" | every host | already done |
| **Validator** (script) | checkable conditions — gates, bar resolution, regression, promotion | every host, plus humans and CI | one file, exists |
| **Harness** (orchestrator) | control — model routing, sequencing, parallelism, hard refusal to advance | host-specific | real project |

**The decision criterion:** a skill is enough when what you want is the host's judgment. A validator is
needed when a rule is true-or-false and you want it enforced identically everywhere. A harness is
needed only for control the host will not give you.

Applying it: nearly every enforcement rule in A1–A9 is a checkable condition, not a judgment. That is
why the validator lands first in the build order — it converts the amendments from requests an agent
may honor into checks that either pass or fail.

**What actually needs a harness is thin.** One item: per-role model routing, which A10 argues you need
for uncorrelated critics. Parallel workstreams at level 2 are optional by your own notes. Hard refusal
to advance is covered in practice by the validator plus a human gate.

### Prior art: what ChatDev's trajectory shows

Worth recording, because it is the closest well-known project and the lesson is not the obvious one.

ChatDev 1.0 was the virtual software company — CEO, CTO, programmer, reviewer in role-playing
seminars. **As of January 2026 that is the legacy branch.** ChatDev 2.0 is a generic zero-code
multi-agent orchestration platform: YAML workflow definitions, visual canvas, configurable nodes.
Software development is one template among data visualization, 3D generation, and deep research. The
arc across their own papers runs chain topology → DAG (MacNet) → RL-trained orchestrator (Puppeteer,
NeurIPS 2025) → generic platform. That is a sustained retreat from fixed roles.

Two conclusions:

- **Roles were never a verification mechanism.** A "reviewer" agent that declares code good is exactly
  the absence-of-objection exit condition A9 and A10 exist to fix. Do not adopt a role-based topology;
  the abstraction here is the verification class, which is evidence-shaped rather than people-shaped.
- **Their YAML defines a workflow graph; your markdown defines state.** A graph is imperative — run
  this node, then that one. State is declarative — here is where we are, anyone can pick up. The
  declarative form is what buys portability; the imperative form requires the framework. Their config
  is also `API_KEY` + `BASE_URL`, which is the subscription problem, not a solution to it.

## Settled decisions

These are decided. Do not reopen without new evidence.

1. **The loop belongs to an execution mode, not a stage.** An earlier proposal for a `gauntlet-phase`
   stage is withdrawn — invoking it by hand between implementation and review is just reviewing twice.
2. **Three verification classes,** not two: `automated | reference | human-eyes`. A `reference` phase
   is checked by a fresh-context critic against an artifact; it needs no human stop but its evidence
   is retained.
3. **A phase that can name neither a check nor an existing reference artifact is `human-eyes`.** This
   default is what keeps the field honest.
4. **Bars are artifacts, not prose.** Prose acceptance criteria are re-interpreted by a fresh critic
   every round, which is the mechanism behind apparent moving goalposts. Criteria are inputs to a bar,
   never the bar.
5. **Loop selection follows the class.** `automated` → repair loop, no critic. `reference` → gauntlet.
   `human-eyes` → no loop, stop and report. Never run a critic loop where an assertion settles the
   question; that is the largest avoidable cost.
6. **Bars are authored during specification, by the human** (A8). `generate-plan` composes bars; it
   does not invent them.
7. **Promotion between classes requires a new artifact and a human gate; demotion is always allowed
   mid-run** (A6).
8. **The critic classifies finding severity, not the implementer.** Letting the implementing side
   decide what is "less critical" restores the self-approval the split exists to remove.
9. **Loop budget lives with the execution settings,** not in the plan header — a generated artifact
   cannot authorize the autonomy that generated it.
10. **Prompt minimalism is a function of supervision.** Boundaries stay implicit only while a human is
    watching. Autonomous runs need them explicit, in durable files where possible.
11. **Build-verification specifics belong in the project's `AGENTS.md`, not the skill.** `deploy.sh`
    symlinks the skill globally, so project-specific instructions would leak across projects.
12. **`orchestration.md` is deferred** until Tier 3's retros provide evidence. Writing it now would
    calcify a design still being learned, which the repo's own notes argue against.
13. **Every loop round re-verifies the whole bar and records the full pass/fail vector.** A dimension
    that passed before and fails now is a **regression, which stops the loop** — not a finding to fix
    next round. Plateau (vector unchanged for two rounds) also stops. Best round ≠ latest round, so
    the loop must be able to return to the best one (A9).
14. **A rubric is a closed set of dimensions.** A critic may not add or redefine one mid-loop. This is
    what stops a loop from renewing its own mandate; changing the objective requires a human gate (A9).
15. **Context isolation is not independence.** Same model family means shared blind spots. Three
    levers in increasing strength: context isolation, model diversity, assertions. Never call a
    same-family fresh-context critic "independent review" — and when a defect class escapes review
    twice, write the assertion rather than strengthening the critic (A10).
16. **Three enforcement layers, not two.** Skill for judgment, validator for checkable conditions,
    harness only for control the host will not give you (A11).
17. **The validator comes before the reference files.** It is what makes them enforceable rather than
    advisory, and it works under every host including plain CI. `validate.py` exists and is tested.
18. **No harness or Pi plugin yet.** The only genuinely harness-shaped need is per-role model routing
    for A10. The falsifiable trigger for building one: Tier 4 shows same-family critics missing things
    the Tier 3 harvest assertions would have caught. A plugin would also lock the enforcement layer to
    one runtime, where a standalone script serves all of them.
19. **The validator must never check judgment.** "Is this anchor concrete enough" is a human question.
    A validator that scores quality becomes a critic with no context, and its pass would carry
    authority it has not earned — the same failure as a reviewer with no bar.

---

## Open decisions — blocked on the developer

These block `settings.md` and `orchestration.md`. They cannot be resolved by analysis; they are
choices about how much autonomy to grant and where authority lives.

- [ ] **1. Settings resolution order.** The notes lean toward: repo-level default → overridden by
      approved spec header (level 1) → or portfolio manifest (level 2), copied into generated plans for
      reconstruction only. Confirm or change.
- [ ] **2. Which conditions may interrupt a level-1 run** besides a `human-eyes` phase. Candidates
      already identified: blocked phase, unverifiable criterion, missing bar, contract conflict, diff
      growth ceiling, recurring finding class.
- [ ] **3. Per-stage conditional behavior.** `implement-next-phase` stopping after one phase versus
      continuing is described as prose in the notes but has no stage-instruction form. Needs writing
      as behavior conditioned on `execution:`.
- [ ] **4. Whether `human-eyes` phases should be clustered late** so unattended runs are longer. The
      notes flag this as conflicting with the existing rule that phases are ordered to reduce
      uncertainty early, and lean toward uncertainty-first winning. Probably decide "no" and record why.

A8 resolves what was previously a fifth open question — what artifact marks a spec as sufficiently
specified. The answer is the spec's bar table plus a checkable four-condition gate.

---

## Build order

Ordered so that the files paying off in both work and personal contexts come first, and the ones
blocked on open decisions come last.

- [ ] **1. `validate.py` at the repo root** — already written and tested; drop it in and run it
      against the current `specs/`. On an un-migrated repo it reports info, not errors, so it is safe
      to add before anything else. Add a `Validation` section to `README.md` (**A11**). Optionally
      wire it into a pre-commit hook or CI. **Do this first:** it makes every amendment below
      enforceable instead of advisory, and it costs nothing.
- [ ] **2. `references/commit-discipline.md`** — lift directly from `pending-updates.md` §3. Branch
      check before first commit, `spec/NNN-<label>` / `chore/<slug>` / `spike/<slug>` naming, commit at
      phase boundaries only, one logical change per commit, vendored deps and bulk moves in their own
      commits, never force-push or rewrite published history, report branch and commits at end of run.
      **This content is already written; it just needs a home.**
- [ ] **3. `references/verification-classes.md`** — three class definitions, the cannot-name-it
      default, bar requirements per class, loop selection table. Source: review §2, A1, A3. Then add
      the promotion/demotion rules from **A6** and the round contract, regression rule, and plateau
      detection from **A9**. `validate.py` already enforces the mechanical half of all three.
- [ ] **4. `references/bars.md`** — fidelity ranking, naming conventions, the Godot-shaped guidance
      and the two mandatory assertion families. Source: **A7**. Then copy A2's rubric template to
      `templates/specs/NNN-rubric.md`, including the closed-dimension-set rule from **A9**.
- [ ] **5. Spec and plan template changes** — bar table in the spec template, the specification gate
      definition (**A8**), and an `## Invariants` section (**A9**); `Verification:` and `Bar:` per
      phase in the plan template (**A1**).
- [ ] **6. `references/review-principles.md` amendments** — the honesty rule ("a review that names no
      comparison and no executed behavior is a reading, not a review"), the withhold-rationale /
      supply-orientation critic contract, the coverage audit, the critic-classifies-severity rule, and
      the independence-levers correction from **A10**.
- [ ] **7. Split `SKILL.md`** into a thin router plus the load table (**A5**). Run `/doctor` after.
- [ ] **8. `references/settings.md`** — blocked on open decisions 1 and 3.
- [ ] **9. `references/orchestration.md`** — blocked on open decision 2 and on Tier 3 retro evidence.
- [ ] **10. `README.md` dated amendment** (**A4**) and a `comparison.md` row on the two axes.

Items 1–5 are what Tier 4 needs. Items 6–7 are cheap and improve everything. Items 8–10 can wait.
Items 1–6 also pay off at work and depend on none of the open decisions; 8–9 are personal-project
only and blocked.

---

## Tier 3 harvest

Do this when Tier 3 finishes (currently 6 of 8 specs complete, running to completion). It is higher
leverage than any prompt improvement.

Two defects reached review on this codebase and were recorded in
`specs/017b-tier2-review-findings.md`: a battle system that resolved entirely inside `_ready()`, and
heal/revive items with no `use_item` code path anywhere. Both were invisible from reading specs and
obvious within minutes of running the build.

**Read those two escapes as a possible shared-blind-spot failure, not just a self-approval failure.**
Per A10, a same-family critic brings the builder's blind spots to the artifact. "What should exist and
does not" is exactly the question a same-family reviewer may fail to ask for the same reason the
builder did — absent code produces no diff to notice. If that is what happened, no amount of critic
independence would have caught it, and the assertions below are the only response that works. This
makes the harvest the highest-value item on the whole list rather than merely a good idea.

- [ ] Audit all completed Tier 3 cycles for the same two classes:
      **reachability** (authored id with no reachable handler) and
      **runtime sequencing** (behavior resolving at load rather than on input).
- [ ] Write whatever the audit finds as assertions in the test harness. This converts the project's
      only *known* failure class from something a critic might notice into something a check catches
      for free — and promotes those phases to `automated`, the cheap loop.
- [ ] If the audit finds nothing across eight specs, record that too. It is evidence that fresh-context
      review is working on this codebase, and it justifies weighting Tier 4's `reference` budget down.
- [ ] Record in the Tier 3 retros: gauntlet passes per spec, findings that escaped self-review, human
      interventions, rework after final review, and **cost per phase broken out by verification
      class.** The last one is the comparison that would settle the cost objection against this
      pattern, and nobody has published it.

---

## Tier 4 launch kit

### Manifest

`specs/tier4-manifest.md`. This is the authority for the run in both the medium and short prompt
versions — it carries set membership, dependency order, and settings.

```markdown
# Tier 4 Portfolio Manifest

settings:
  execution: portfolio-autonomous
  commits: ai-on-branch
  branch: tier4
  loop-budget:
    max-rounds-per-spec: 5
    stop-on-recurring-finding-class: 3
    stop-on-diff-growth-beyond-plan: <N> lines

## Specification gate
Every spec listed below has completed question, fold, and specification review; has a bar for every
must-have acceptance criterion; has every `reference` bar present on disk; and is approved as
sufficiently specified. A spec not listed here is not in the set, and no spec lends implied approval
to any other.

| Spec | Specified on | Depends on | Shared contracts touched | Layer |
|---|---|---|---|---|
| 0NN-<label> | 2026-08-XX | — | <contract> | 1 |
| 0NN-<label> | 2026-08-XX | 0NN | <contract> | 2 |

## Dependency layers
Layer 1: <specs> — independent
Layer 2: <specs> — depend on layer 1
Integration review runs at each layer boundary.

## Known contract conflicts
<none | list requiring human resolution before the run>
```

### Medium prompt — use this for Tier 4

Assumes build-order items 1–4 are done, so bars, classes, and commit rules live in files. Keeps
orchestration, stop conditions, and the calibration stop inline because those files do not exist yet.

```text
Implement the Tier 4 portfolio on branch `tier4`, following
/human-gated-spec-driven-ai-development.

AUTHORITY AND ORDER
specs/tier4-manifest.md is the authority for this run: which specs are in the set, their
dependency order, and the effective settings. Work that order. Do not take order from
docs/dev-checklist.md, and do not add a spec to the set because it looks ready.

BEFORE PLANNING ANYTHING
Read the Tier 3 retros and review-findings artifacts. Carry forward what escaped review
there — do not rediscover it. Ground every plan in the repository state Tier 3 actually
left behind, not in what its specs said it would leave.

CALIBRATION STOP
Complete the first spec in dependency order end to end, then STOP and report before
starting the second. I am checking your phase classifications, your bar selections, and
your critic evidence before you replicate them across the set. This stop is not
optional and does not indicate anything is wrong.

BARS AND CLASSES
Follow the skill's verification-classes and bars references. Each phase takes its class
and its Bar: from the bar table in its spec — compose from what is there, do not invent
bars mid-run. A phase whose required bar is missing is [!] blocked; say so and stop
rather than substituting something.
You may not promote a phase's class during this run, including when you have just
written the assertion that would justify it. Record the proposal instead. Demotion and
escalation are always allowed and should be reported.

RUN THE GAME. Reading GDScript does not verify behavior. For any phase touching
gameplay, drive the build through the scenario and observe it.

EVERY ROUND RE-VERIFIES THE WHOLE BAR
Check every rubric dimension, every acceptance criterion, and every invariant declared
in the spec — not just the gap you are repairing. Record the full pass/fail vector for
the round and its delta against the previous round.
A dimension that passed before and fails now is a REGRESSION: stop, report the vector
and the last clean round, do not attempt to fix it in another round.
If the vector is unchanged across two consecutive rounds, that is a plateau: stop.
Tag each round so the best-scoring round can be recovered. The best round is not
necessarily the last one; report which it was.

DO NOT ADD DIMENSIONS. A rubric is a closed set. You may not introduce a new dimension
or redefine an existing one mid-run to justify further work. A newly noticed dimension
is a finding for me and a candidate rubric amendment at the next gate.

Once per spec, run a coverage audit: for each acceptance criterion, name the test that
verifies it. A criterion with no verifying test is a finding even when the suite is
green. Once per spec, not per round.

INTEGRATION
At each dependency-layer boundary in the manifest, run one fresh agent over the combined
result of that layer before starting the next. Not after every spec, not only at the end.

STOP AND REPORT ON: a human-eyes phase; a blocked phase [!] — do not skip ahead or
re-scope around it; two specs needing incompatible changes to the same contract; failed
layer integration; the same finding class recurring across 3 rounds, which means the
spec is incomplete rather than the implementation deficient; 5 rounds on one spec; diff
growth well beyond plan expectation; any criterion that turns out unverifiable as
written.

NEVER SELF-APPROVE. Final review across the set comes to me. "The reviewer found
nothing" is evidence for advancing the queue, never permission to declare the set
complete.

AT THE END: per-spec status; comparison evidence for every reference phase; all deferred
findings; commits and branch state; dependency decisions you made; and which phases you
classified automated or reference that you now believe should have been human-eyes.

Use ultracode.
```

### Short prompt — the target after build-order items 7–8

```text
Implement the Tier 4 portfolio per /human-gated-spec-driven-ai-development.
specs/tier4-manifest.md is the authority for the set, order, and settings.

Read the Tier 3 retros and findings before planning — carry forward what escaped
review there.

Complete the first spec end to end, then stop and report so I can check your
classifications and bars before you replicate them across the set.

Use ultracode.
```

Roughly the length of the original Tier 3 prompt. That is the point: prompts get short again once
boundaries live in durable files instead of in the prompt. The medium version is long because it is
paying in prompt tokens for settings that have no home yet.

**Keep the calibration stop in the prompt permanently,** even after everything else moves into the
skill. It is a judgment about this run's risk tolerance, not a standing property of the workflow, and
it is the cheapest protection against one systematic misclassification being replicated across every
spec in the set.

---

## If you build an orchestrator

Deferred per settled decision 18. Recorded here so the design does not need rediscovering, and so the
trigger is explicit rather than a matter of mood.

**Build it only when:** Tier 4 shows same-family critics missing defects that the Tier 3 harvest
assertions catch. That is the falsifiable trigger. The harvest may answer it before any code is written.

**The key design property, and it is better than it first appears.** Because state lives in files, the
orchestrator never parses agent output. It invokes a CLI, waits, runs `validate.py` against the files,
and decides the next step. Standard streams are for logging, not for the protocol.

That is a far more robust integration boundary than parsing stdout or a JSON stream, and it is exactly
what ChatDev does not have — their node-to-node messages are in-framework objects. The spec artifacts
are already a message-passing protocol with a schema and a validator. Being slower and dumber across
process boundaries is what makes them work across hosts.

    invoke <cli> with a stage prompt
      -> agent reads specs/, writes specs/ and source
      -> python validate.py specs/ --baseline specs/.class-baseline.json
      -> orchestrator branches on exit code and findings
      -> next stage, or stop and report

**This is how A10's model diversity gets delivered.** Claude Code builds, Codex critiques, both read
the same spec, plan, and bar. Nothing else in the toolkit produces uncorrelated review.

**The Pi tension, stated plainly.** gentle-pi has per-agent model routing natively via
`/gentle:models` — the exact feature you would otherwise build — but Pi wants API keys. CLI
orchestration gets you subscriptions but you write the routing. That is the real trade, and it is not
skill-versus-harness.

**A hybrid resolves most of it:** builders via subscription CLI, critics via cheap API to a different
family. Critics do strictly less work than builders — read the artifact, compare against the bar, name
one gap — so the half you pay per-token for is the small half. You buy uncorrelated review for modest
spend without routing the main workload through an API.

- [ ] **Before building: check the terms for automated invocation of each CLI.** Claude Code ships a
      non-interactive print mode intended for scripting, so scripted use is not inherently off-limits.
      Copilot's CLI story differs and should be verified rather than assumed symmetric. Scripting your
      own workflow on your own subscription is a different thing from building a service, but read the
      specifics rather than inferring them.

**Do not build a Pi plugin for the enforcement layer.** It would tie the checks to one runtime, where
the same logic as a standalone script already serves Pi, Claude Code, Codex, Copilot, and CI. If you
later want Pi-specific ergonomics, wrap the script; do not reimplement it inside a plugin.

## Work vs personal projects

An earlier framing in this work stream collapsed two things that the repo's own notes keep separate.
Restating correctly, because it changes what is available at work:

**Execution scope and commit authority are independent axes.** "AI is not allowed to commit" blocks
`commits: ai-on-branch`. It does not block loops.

**The loop mechanism needs no autonomy increase at all.** A fresh-context critic comparing one phase's
output against a bar runs entirely inside `execution: incremental`, between `implement-next-phase` and
the developer's review, with the human committing. Nothing about it requires the agent to write history
or skip a gate.

So, available in a regulated or shared-repo context today:

- verification classes and bars
- fresh-context critics and the critic contract
- rubrics as bars — the schema-DDL rubric is a work-shaped use case needing no loops
- the coverage audit
- critic-classifies-severity
- the review honesty rule
- **`validate.py`** — it runs anywhere, enforces nothing that needs autonomy, and is arguably more
  valuable in a regulated context, where "the gate conditions were mechanically verified" is a
  stronger claim than "the agent said it followed the process"

Blocked at work: `commits: ai-on-branch`, and multi-phase autonomy past the plan gate.

This is also why build-order items 1–5 come first: they pay off in both contexts and depend on none of
the open decisions. Items 7–8 are personal-project-only and blocked.

---

## Pre-run checklist

Before launching any autonomous run:

- [ ] Every spec in the set has crossed the A8 specification gate — no open must-answer questions,
      every must-have criterion classed and barred, every `reference` bar present on disk, developer
      approved.
- [ ] Every spec declares its **invariants**, and every invariant has a check (A9). An invariant
      without a check is a wish.
- [ ] Decide whether critics run on a different model family than builders, and record which
      independence lever you actually used (A10). If the answer is "same family," say so in the retro
      rather than describing the review as independent.
- [ ] The manifest exists, lists the set explicitly, and states dependency order and layers.
- [ ] Known contract conflicts are resolved or recorded as requiring human resolution.
- [ ] The Tier 3 assertions are in the harness.
- [ ] The working tree is clean and the branch is correct.
- [ ] `python validate.py specs/ --strict` passes for every spec in the set.
- [ ] A class baseline is written (`--write-baseline`) so promotion during the run is detectable
      afterward.
- [ ] **Diff the prompt against the current `SKILL.md` and delete anything already covered there
      rather than paraphrasing it.** Sixty lines of prompt alongside a skill covering the same ground
      is a conflicting-instruction surface — the documented failure mode is overlapping directives
      forcing reconciliation before work. Paraphrase is worse than either omitting or restating
      verbatim, because near-identical-but-not-quite is exactly what generates the cost. Anywhere the
      prompt and skill disagree slightly, a conflict has been manufactured.
- [ ] The loop budget numbers in the manifest are ones you would actually be willing to spend.
