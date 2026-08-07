# Pending updates

Proposed adjustments to the methodology and the skill. Working notes — not part of the
published article yet.

Origin: running the workflow on a personal Godot project
(`~/Documents/assets/minifantasy/minifantasy-workbench`) surfaced two places where the
current defaults are the *only* option when they should be a choice. A prototype of both
lives in that project's `AGENTS.md` (branch `chore/workbench-design`) and can be lifted
from there.

---

## 1. The headline: autonomy has levels, and commit authority is a separate axis

The instinct is to add a single autonomy switch. That would be wrong. There are two
autonomous execution levels under experiment, plus today's incremental baseline:

- **spec-autonomous** — after one spec has completed its question/clarification phase and
  the human accepts it as specified, agents plan, implement, run the review/fix gauntlet,
  and return the completed spec for human review
- **portfolio-autonomous** — after a set of specs have all completed specification, a
  coordinator advances the entire set through planning, implementation, review/fix, and
  integration before returning the portfolio

Neither level says who may commit. **How far the AI runs between human gates** and **who
is allowed to write Git history** remain separate decisions, and real environments mix
them.

| | Incremental | Spec-autonomous | Portfolio-autonomous |
|---|---|---|---|
| **Commits: human-only** | today's default | likely workplace single-cycle setting | plausible for a batch prepared as one large human-reviewed diff |
| **Commits: AI-on-branch** | useful for long phases | personal-project setting | long-running experimental branch, such as `dragon-academy`'s `tier3` |

The middle and top-right cells matter. A workplace can plausibly accept "the AI completed
the approved spec set and here is the diff" while still insisting that every commit
carries a human's name after human review. Bundling execution scope and commit authority
into one flag makes those combinations unreachable.

So: two independent settings — execution scope and commit authority — defaulting to the
conservative value of each.

The step from one autonomous spec to a set is not just "full-plan, repeated." It changes
the unit of scheduling from a phase to a workstream, and introduces dependency,
integration, isolation, and cross-spec drift concerns (§7).

---

## 2. Execution scope

Possible vocabulary, still provisional:

```md
execution: incremental | spec-autonomous | portfolio-autonomous
```

### `execution: incremental` (default, current behavior)

`implement-next-phase` does exactly one phase and stops. Human reviews, then invokes again.

### `execution: spec-autonomous` — level 1

Once the question phase is complete, its answers have been folded into the spec, and the
human accepts the working spec as sufficiently specified, the AI owns the rest of that
cycle: generate the plan, implement every phase, review it, feed findings back through a
fix loop, and stop only at final handoff — or at a condition that genuinely needs the
human (§4). The plan remains a required durable artifact, but its creation is inside the
autonomous run rather than another mandatory approval gate.

Rationale for adding it: the question/specification gate catches *wrong goal* and missing
product-decision errors before code begins. Planning, phase implementation, and review
are then delegated as one bounded job. This deliberately experiments with whether a
separate human plan gate still pays for its latency; the generated plan is available for
post-run diagnosis even when it is not pre-approved.

Rules that must survive in `spec-autonomous` mode:

- `final-review` is **never** self-approved. It is reported to the human, always.
- A blocked phase (`[!]`) **stops the run**. Do not skip ahead to a later phase, and do not
  quietly re-scope around the blocker.
- The plan checklist stays accurate throughout, not just at the end, so an interrupted run
  is still a legible handoff. This is the existing durable-artifact premise and autonomous
  execution makes it more important, not less.
- Scope discipline is unchanged: the plan is still the boundary, and phases still may not
  absorb work from later phases.

### `execution: portfolio-autonomous` — level 2

After every spec in a declared set has completed the same question/specification gate, a
coordinator runs the level-1 lifecycle for each of them and integrates the results. The
set boundary must be explicit: one ready spec cannot lend implied approval to an
unfinished neighbour. See §7 for queue ordering, subagent roles, and the gauntlet loop.

`until-gate` may still be useful as a stop policy within either autonomous level: continue
until a `human-eyes` phase or another declared escalation condition. It is not itself a
third autonomy level.

---

## 3. Commit authority

### `commits: human-only` (default, current behavior)

The AI prepares work and recommends checkpoint commits. The human commits. Matches the
current README stance that the human owns commits, PRs, and delivery.

### `commits: ai-on-branch`

The AI may commit during a cycle, **only on a working branch, never on the default
branch.** Pushing, merging, and opening PRs remain human actions in both settings — this
setting lowers the cost of a bad cycle, it does not transfer delivery authority.

The condition is what makes it acceptable: backing out a bad cycle should be one branch
deletion, not a history rewrite on `main`.

Concrete rules to write into the skill:

- Check the current branch before the first commit of a run; create one if on the default
  branch. Naming used in the prototype: `spec/NNN-<label>` for a cycle, `chore/<slug>` for
  groundwork, `spike/<slug>` for experiments.
- Commit at phase boundaries, never mid-phase. Each commit leaves the project building and
  the plan checklist accurate.
- One logical change per commit. Keep vendored dependencies and bulk file moves in their
  own commit so they revert without taking real work with them.
- Never force-push, rewrite published history, or delete a branch with unmerged work.
- Report the branch and what was committed at the end of the run.

Note the workplace angle: `ai-on-branch` is likely a non-starter in many organizations
regardless of branch discipline, because of commit attribution, signed-commit policies,
and audit requirements. That is fine — it is exactly why this is its own axis with a
conservative default, and why the docs should say plainly that `human-only` is the
expected setting for shared or regulated repositories.

---

## 4. The enabling mechanism: per-phase verification class

Autonomous execution is only sound if a phase can *prove* itself. Otherwise it degrades into
the AI declaring phases done on evidence that does not support the claim.

Add a field to each phase in `templates/specs/NNN-plan.md`:

```md
Verification: automated | human-eyes
```

- `automated` — acceptance criteria are machine-checkable: a test asserts them, a build or
  lint gate covers them, or output matches a known-correct reference. Implement, verify,
  continue.
- `human-eyes` — correctness is a judgement about how something looks, feels, or reads
  that no assertion captures. Implement, capture evidence, **stop and report** even in
  an autonomous mode.

`generate-plan` assigns this per phase and must justify any `automated` claim by naming the
specific check. **A phase that cannot name its check is `human-eyes`.** That default is
what keeps the field honest instead of decorative.

In incremental mode this gives the human something concrete to review at the plan gate:
not just "are these the right phases" but "do I agree these four can prove themselves."
In autonomous modes the coordinator must make and record that judgment, and questionable
classifications become visible evidence at final handoff.

Worked example from the prototype: of eight milestones, five were `automated` (data
loading, index generation, filtering, schema validation, round-trip save/load) and three
were `human-eyes` (a pixel grid overlay, sprite animation registration, character
movement). Roughly half the calendar time becomes unattended without putting a judgement
call on autopilot. The ratio improves as the project builds its own assertion harness —
`human-eyes` phases get promoted to `automated` once a pixel-exact comparison exists to
back them.

---

## 5. Self-review honesty rule

Needed regardless of mode, but autonomous execution makes it load-bearing, because every
review before the final human handoff is still produced inside the automation boundary —
even when a fresh subagent makes it more independent of the implementer.

Proposed addition to `references/review-principles.md` and to the `review-phase` stage:

> A review written by the automation that did the implementation is a **checklist pass,
> not a verdict.** Say so in the review artifact. Prefer reporting a gap over grading your
> own work green. Look specifically for what a spec cannot describe: pacing, feedback,
> reachability, and whether authored data has a code path that actually uses it.

This is not hypothetical. On a different project (`~/src/dragon-academy`), a Tier 2
self-review reported "no critical issues" while the battle system resolved entirely inside
`_ready()` and the heal/revive items had no `use_item` code path anywhere in the codebase.
Both were obvious within minutes of running the build and invisible from reading the
specs. Recorded there in `specs/017b-tier2-review-findings.md`.

The lesson generalizes: **self-review catches code defects and misses missing behavior.**
An `automated` verification class is a partial answer, since a test that was never written
cannot fail — which is another argument for keeping `human-eyes` as the default.

---

## 6. Where the settings live

This needs a decision and it is more consequential than it looks.

The methodology's central claim is that state belongs in durable markdown artifacts rather
than chat. A mode selected by how the user phrased an invocation is exactly the
chat-resident state this process exists to eliminate — and it would silently change
behavior across a context reset or a model handoff.

So the settings belong in a file. Options:

1. **In the spec's header block** — visible at the specification gate, before autonomous
   planning begins. This is probably right for `spec-autonomous`.
2. **In a portfolio manifest** — names the complete, individually specified set and its
   order or dependencies. This is probably required for `portfolio-autonomous`; chat is
   not a durable declaration of the batch boundary.
3. **In the plan's header block** — too late to be the authority for level 1, because the
   autonomous run generates the plan. Still useful for recording the effective mode and
   reconstructing an interrupted run.
4. **A repo-level config** (`specs/config.md` or a project's `AGENTS.md`) — right for a
   project-wide default, wrong as the only mechanism, since one risky cycle inside an
   otherwise routine project should be able to opt back into `incremental`.

Leaning toward: repo-level default, overridden by the approved spec for level 1 or a
portfolio manifest for level 2. Copy the effective setting into generated plans so a
resumed session can reconstruct it, but do not make a generated artifact the source of
authority for autonomy that has already begun.

---

## 7. Level 2: multi-spec orchestration and a gauntlet loop

Level 2 front-loads all of the human specification work: write several specs and take
**every one** through its question, fold, and specification-review process. Only after the
set is fully specified does a coordinator use subagents to plan, implement, review, and
integrate the workstreams. Each workstream internally follows the level-1 lifecycle; the
additional job is keeping the whole set coherent and moving.

This is running now on `~/src/dragon-academy`, branch `tier3`. The branch provides a useful
longitudinal example rather than a hypothetical one: completed cycles have independent
spec, plan, and final-review artifacts; cycle 027 (T3-8) records six completed phases plus
a review/fix round and follow-up commits; cycle 028 (T3-9) is currently in its plan,
implementation, and runtime-review working-tree state. Later Tier 3 specs remain durable
queue inputs rather than being compressed into one giant tier plan.

A plausible shape is:

1. The human completes specification for every member of the set. Each spec remains
   independently numbered, scoped, and approved; one ready spec cannot lend implied
   approval to an unfinished neighbour.
2. A coordinator chooses the next ready spec from dependency order and gives it to a
   planning subagent, which grounds a plan in the repository state left by prior cycles.
3. An implementation subagent works the plan. The queue may run sequentially on one
   long-lived branch, as `tier3` currently does; concurrency is an optional optimization,
   not part of the definition of level 2.
4. A separate review subagent checks the implementation against the spec, plan, tests,
   runtime behavior, and review principles. It should not inherit the implementer's
   conclusion that the work is complete.
5. Review findings go back to an implementation agent, then through review again. This is
   the **gauntlet loop**: implement → verify → independent review → fix, repeated until the
   review passes or an explicit stop condition is reached.
6. After a spec passes its gauntlet, integrate or checkpoint it, update the durable queue,
   and start the next ready spec against the new repo state.
7. The coordinator reports the whole set to the human with per-spec status, evidence,
   findings, commits or branches, and unresolved decisions. Final acceptance and delivery
   remain human decisions.

The experiment's gate is deliberately earlier than today's workflow: completing and
approving specification is authority for subagents to plan and implement without a human
pause on every generated plan. That is the defining difference, not an accidental effect
of using subagents. The tradeoff is giving up the wrong-decomposition gate; plans
therefore need especially strong repo reconnaissance, explicit dependency checks, and
preservation as evidence for diagnosing rework.

The loop needs bounded and honest exit conditions. It should stop on a blocker, a
`human-eyes` phase, conflicting specs, failed integration, exhausted retry or diff-size
budget, or repeated findings that indicate the spec itself is incomplete. "Reviewer has
no findings" is evidence for advancing the queue, not permission to self-approve final
portfolio completion.

Durable artifacts are what make this tractable. The coordinator should reconstruct the
queue from specs and plans rather than chat history. A small portfolio status artifact
may be justified, but it should index canonical per-spec state instead of duplicating it.
At minimum it would record each cycle's current stage, effective execution and commit
settings, dependency state, assigned branch or worktree, latest review result, and next
action.

Subagents help most when their roles create real independence, not merely more context
windows. The reviewer should receive the spec, plan, diff, and test evidence but not the
implementer's persuasive narrative. The coordinator should reconcile findings and
dependencies, not perform a shallow final review of every workstream itself. Sequential
agents can safely share the portfolio branch. If implementations are made concurrent,
separate branches or worktrees plus an explicit integration order become prerequisites.

Before turning this into published configuration, capture a few runs: number of specs,
number of gauntlet passes, findings that escaped self-review, merge conflicts, human
interventions, and rework after final review. The evidence should show whether level 2
reduces latency without hiding correlated mistakes across specs.

---

## 8. Files to touch

- `skills/human-gated-spec-driven-ai-development/SKILL.md` — a settings section; define
  specification as the autonomy gate; add level-1 and level-2 orchestration; amend the
  "AI must not commit" rule to reference `commits:`; add the self-review honesty rule.
- `skills/.../references/stage-templates.md` — `Verification:` in the phase template;
  a plan header block carrying the effective settings.
- `skills/.../references/review-principles.md` — the self-review honesty rule.
- `templates/specs/NNN-plan.md` — `Verification:` per phase, settings header.
- `README.md` — a section on the two autonomous levels and independent commit axis, with
  the 2×3 table and the explicit statement that `human-only` commits is the expected
  workplace setting. This is the part most likely to draw disagreement, so it should be
  argued, not asserted.
- `comparison.md` — other spec-driven approaches likely differ on exactly these two axes;
  worth a row.
- `examples/` — use the minifantasy workbench for level 1 and `dragon-academy`'s `tier3`
  branch for level 2, since the latter records a real sequence of spec/plan/review/fix
  cycles.
- A coordinator skill or orchestration reference — define queue reconstruction,
  dependency checks, subagent input/output contracts, gauntlet stop conditions, and
  branch/worktree isolation before making `portfolio-autonomous` a supported mode.
- A portfolio status template, if experiments show that deriving the queue from individual
  plans is too expensive or ambiguous. It must remain an index, not a second source of
  truth.

---

## 9. Open questions

- At level 1, which conditions besides `human-eyes` are allowed to interrupt the run after
  the human has declared the spec sufficiently specified?
- Should `human-eyes` phases be reorderable — i.e. should `generate-plan` deliberately
  cluster `automated` phases early so the unattended run is longer before the first stop?
  Tempting, but it conflicts with the existing rule that phases are ordered to reduce
  uncertainty early. Uncertainty-first should probably win.
- Does autonomous execution need a phase-count or diff-size ceiling before it forces a
  stop, as a runaway guard?
- Should the retro artifact record which mode ran, so a project can look back and ask
  whether autonomous cycles produced more rework? That measurement is the only way to
  know if any of this is actually a good idea, and it connects to the README's existing
  "How to Measure Whether It Helps" section.
- What exact artifact or marker means "question phase complete and this spec is sufficiently
  specified" so a resumed agent cannot infer the gate from an unanswered questions file?
- For level 2, what exact artifact declares that the whole set has crossed specification
  and names its dependency order?
- What is the smallest dependency declaration that prevents two individually sound specs
  from making incompatible changes to the same contract?
- Should review always use a fresh subagent, and how much implementation context should be
  withheld to preserve independence without forcing wasteful rediscovery?
- What bounds the gauntlet: pass count, elapsed time, diff growth, repeated finding class,
  or some combination?
- Does integration review happen after every workstream, after each dependency layer, or
  once at the end? A final-only integration pass maximizes autonomy but discovers the most
  expensive class of conflict latest.

# Experimental example

## Original Prompt
The following prompt was given to Claude in an attempt at running 8 different specs 
that had passed the question phase. The prompt isn't the best example of the
guantlet loop.

Do not run this prompt.
```
I want you to follow the /human-gated-spec-driven-ai-development guidelines to plan and 
implement `Tier 3` of docs/dev-checklist.md.  Each  item in `Tier 3` has already been 
through the specification and question phase which can be found in specs.  I want you to 
plan and implment each `Tier 3` spec sequentially.

For each spec fan out sub-agents.  One sub-agent will plan and when that is complete 
another sub-agent will implment the plan updating the plan as it goes according to 
/human-gated-spec-driven-ai-development .  Once the plan is implemented another 
sub-agent should review the implementation and when fully satisfied the the 
specification it should be comitted to git.  Iterate fixing critical items in the 
review but less critical items can be documented and skipped.

Keep looping until all of Tier 3 has been implemented according to the specifications.  
Fan out subagents and ultracode.
```

## Possible Improvement
### Manifest
Do not run this prompt
```
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
Every spec listed below has completed question, fold, and specification review and is
approved as sufficiently specified. A spec not listed here is not in the set, and no
spec lends implied approval to any other.

| Spec | Specified on | Depends on | Shared contracts touched | Layer |
|---|---|---|---|---|
| 030-<label> | 2026-08-XX | — | <contract> | 1 |
| 031-<label> | 2026-08-XX | 030 | <contract> | 2 |

## Dependency layers
Layer 1: 030, 032 — independent
Layer 2: 031, 033 — depend on layer 1
Integration review runs at each layer boundary.

## Known contract conflicts
<none | list requiring human resolution before the run>
```
### Prompt
Do not run this prompt
```
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
starting the second. I am checking your phase classifications, your bars, and your
critic evidence before you replicate them across the set. This stop is not optional and
not a sign anything is wrong.

PER-PHASE BAR
Every phase carries:
  Verification: automated | reference | human-eyes
  Bar: <resolvable path — a named test, a reference artifact, or a rubric>
"The test suite" is not a bar; a named test is. Prose acceptance criteria are inputs to
a bar, never the bar itself. A phase that can name neither a check nor an existing
reference artifact is human-eyes. If a phase needs a bar that does not exist, mark it
[!] blocked and name the missing artifact — do not invent one mid-run. Never reclassify
a phase later to avoid a stop.

LOOPS BY CLASS
  automated  — run the named check, fix, rerun. NO critic loop. If a check passes but
               the result is wrong, that is a defect in the check or the spec:
               escalate, do not add a critic to compensate.
  reference  — fresh-context critic. Give it the spec, the acceptance criteria, the bar
               artifact, and how to run the build. Do NOT give it your reasoning, your
               diff narrative, or your view that the work is done. It runs or renders
               the real thing, compares against the bar, says which it prefers, and
               names ONE largest gap with evidence.
  human-eyes — capture evidence, STOP, report. Produce no verdict.

RUN THE GAME. Reading GDScript does not verify behavior. For any phase touching
gameplay, drive the build through the scenario and observe it.

Once per spec, run a coverage audit: for each acceptance criterion, name the test that
verifies it. A criterion with no verifying test is a finding even when the suite is
green. Once, not per round — repeating it adds no information.

THE CRITIC CLASSIFIES SEVERITY, NOT THE IMPLEMENTER. Deferred findings go to
specs/NNN-<label>-review-findings.md for me. The implementer fixes must-fix items only
and may never downgrade a finding to move on.

INTEGRATION
At each dependency-layer boundary in the manifest, run one fresh agent over the
combined result of that layer before starting the next. Not after every spec, and not
only at the end.

COMMITS
Branch `tier4` only, never main. Verify the branch before the first commit. Phase
boundaries only, one logical change per commit, leaving the build green and the plan
checklist accurate. No push, merge, PR, force-push, or history rewrite.

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
### Collapsed
Once `settings.md`, `verification-classes.md`, `bars.md`, `commit-discipline.md`,
and `orchestration.md ` exist and `SKILL.md` routes to them, nearly everything above is 
a standing property of the workflow rather than a fact about this run:

```
Implement the Tier 4 portfolio per /human-gated-spec-driven-ai-development.
specs/tier4-manifest.md is the authority for the set, order, and settings.

Read the Tier 3 retros and findings before planning — carry forward what escaped
review there.

Complete the first spec end to end, then stop and report so I can check your
classifications and bars before you replicate them across the set.

Use ultracode.
```

That's about the length of your original, and it's the concrete demonstration of the 
minimalism point: prompts get short again when the boundaries live in durable files. 
The long version above is what you pay in prompt tokens for settings that have no home 
yet — which is the chat-resident configuration your §6 objects to.

The calibration stop is the one line I'd keep even after everything else moves into the 
skill. It costs one gate and it's the cheapest protection against a systematic 
misclassification getting replicated eight times.