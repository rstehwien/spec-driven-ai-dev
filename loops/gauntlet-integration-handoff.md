# Gauntlet Integration — Handoff

Portable state for continuing this work in a new session, on a new machine, with a fresh context or a
different model. Read this file first; it is the index and the action list. The other two documents
are the reasoning behind it.

Last updated: August 2026.

---

## Contents

- [For a fresh agent: read this first](#for-a-fresh-agent-read-this-first)
- [The three documents](#the-three-documents)
- [Settled decisions](#settled-decisions)
- [Open decisions — blocked on the developer](#open-decisions--blocked-on-the-developer)
- [Build order](#build-order)
- [Tier 3 harvest](#tier-3-harvest)
- [Tier 4 launch kit](#tier-4-launch-kit)
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

## The three documents

| File | What it is | When to read it |
|---|---|---|
| `gauntlet-integration-handoff.md` | This file. Index, decisions, action list, launch kit. | First, always. |
| `pending-updates-gauntlet-review.md` | Review of the repo's `pending-updates.md`, plus eight repo-ready amendments (A1–A8) with paste-able text. | When implementing a specific amendment. |
| `gauntlet-loop-with-spec-driven-dev.md` | Conceptual guide to the Gauntlet Loop and its integration. Templates, worked examples, failure modes. | For background, or to explain the approach to someone else. |

The amendments in A1–A8 are the actionable content. The guide is context.

---

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

- [ ] **1. `references/commit-discipline.md`** — lift directly from `pending-updates.md` §3. Branch
      check before first commit, `spec/NNN-<label>` / `chore/<slug>` / `spike/<slug>` naming, commit at
      phase boundaries only, one logical change per commit, vendored deps and bulk moves in their own
      commits, never force-push or rewrite published history, report branch and commits at end of run.
      **This content is already written; it just needs a home.**
- [ ] **2. `references/verification-classes.md`** — three class definitions, the cannot-name-it
      default, bar requirements per class, loop selection table. Source: review §2, A1, A3. Then add
      the promotion/demotion rules from **A6**.
- [ ] **3. `references/bars.md`** — fidelity ranking, naming conventions, the Godot-shaped guidance
      and the two mandatory assertion families. Source: **A7**. Then copy A2's rubric template to
      `templates/specs/NNN-rubric.md`.
- [ ] **4. Spec and plan template changes** — bar table in the spec template and the specification
      gate definition (**A8**); `Verification:` and `Bar:` per phase in the plan template (**A1**).
- [ ] **5. `references/review-principles.md` amendments** — the honesty rule ("a review that names no
      comparison and no executed behavior is a reading, not a review"), the withhold-rationale /
      supply-orientation critic contract, the coverage audit, and the critic-classifies-severity rule.
- [ ] **6. Split `SKILL.md`** into a thin router plus the load table (**A5**). Run `/doctor` after.
- [ ] **7. `references/settings.md`** — blocked on open decisions 1 and 3.
- [ ] **8. `references/orchestration.md`** — blocked on open decision 2 and on Tier 3 retro evidence.
- [ ] **9. `README.md` dated amendment** (**A4**) and a `comparison.md` row on the two axes.

Items 1–4 are what Tier 4 needs. Items 5–6 are cheap and improve everything. Items 7–9 can wait.

---

## Tier 3 harvest

Do this when Tier 3 finishes (currently 6 of 8 specs complete, running to completion). It is higher
leverage than any prompt improvement.

Two defects reached review on this codebase and were recorded in
`specs/017b-tier2-review-findings.md`: a battle system that resolved entirely inside `_ready()`, and
heal/revive items with no `use_item` code path anywhere. Both were invisible from reading specs and
obvious within minutes of running the build.

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

Blocked at work: `commits: ai-on-branch`, and multi-phase autonomy past the plan gate.

This is also why build-order items 1–5 come first: they pay off in both contexts and depend on none of
the open decisions. Items 7–8 are personal-project-only and blocked.

---

## Pre-run checklist

Before launching any autonomous run:

- [ ] Every spec in the set has crossed the A8 specification gate — no open must-answer questions,
      every must-have criterion classed and barred, every `reference` bar present on disk, developer
      approved.
- [ ] The manifest exists, lists the set explicitly, and states dependency order and layers.
- [ ] Known contract conflicts are resolved or recorded as requiring human resolution.
- [ ] The Tier 3 assertions are in the harness.
- [ ] The working tree is clean and the branch is correct.
- [ ] **Diff the prompt against the current `SKILL.md` and delete anything already covered there
      rather than paraphrasing it.** Sixty lines of prompt alongside a skill covering the same ground
      is a conflicting-instruction surface — the documented failure mode is overlapping directives
      forcing reconciliation before work. Paraphrase is worse than either omitting or restating
      verbatim, because near-identical-but-not-quite is exactly what generates the cost. Anywhere the
      prompt and skill disagree slightly, a conflict has been manufactured.
- [ ] The loop budget numbers in the manifest are ones you would actually be willing to spend.
