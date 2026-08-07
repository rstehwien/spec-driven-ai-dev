# Review of `pending-updates.md` Through the Gauntlet-Loop Lens

Companion to `gauntlet-loop-with-spec-driven-dev.md`. This is a review of the pending-updates notes,
not a restatement of them — it assumes you know what you wrote.

Structure:

1. [The central finding: §5 diagnoses §7](#1-the-central-finding-5-diagnoses-7)
2. [The missing third verification class](#2-the-missing-third-verification-class)
3. [The experimental prompt: eight specific defects](#3-the-experimental-prompt-eight-specific-defects)
4. [A corrected prompt](#4-a-corrected-prompt)
5. [Minimalism and autonomy trade off](#5-minimalism-and-autonomy-trade-off)
6. [Open questions the Shumer material actually settles](#6-open-questions-the-shumer-material-actually-settles)
7. [Corrections to the companion guide](#7-corrections-to-the-companion-guide)
8. [Suggested amendments to §8's file list](#8-suggested-amendments-to-8s-file-list)
9. [Eight amendments in repo-ready form](#9-eight-amendments-in-repo-ready-form)
   - [The fidelity argument they rest on](#the-fidelity-argument-they-rest-on)
   - [A1 — `generate-plan` emits the bar](#a1--generate-plan-emits-the-bar)
   - [A2 — rubrics as a first-class bar type](#a2--rubrics-as-a-first-class-bar-type)
   - [A3 — loop selection by verification class](#a3--loop-selection-by-verification-class)
   - [A4 — README amendment on bars and artifacts](#a4--readme-amendment-on-bars-and-artifacts)
   - [A5 — split `SKILL.md` before §8 grows it](#a5--split-skillmd-before-8-grows-it)
   - [A6 — promotion and demotion rules](#a6--promotion-and-demotion-rules)
   - [A7 — `bars.md` for a Godot project](#a7--barsmd-for-a-godot-project)
   - [A8 — bars move to specification](#a8--bars-move-to-specification)

---

## 1. The central finding: §5 diagnoses §7

Your §7 defines the gauntlet loop as: implement → verify → independent review → fix, repeated
**until the review passes**.

Your §5 records a review that passed while the battle system resolved entirely inside `_ready()` and
the heal/revive items had no `use_item` code path anywhere in the codebase.

Those two sections are about the same defect and the notes treat them as separate topics. The reason
the Tier 2 review passed is not primarily that the reviewer was insufficiently independent. It is that
**the reviewer's own satisfaction was the exit condition.**

This is the difference between two kinds of bar:

| | Exit condition | Failure mode |
|---|---|---|
| **Absence-of-objection** | "the reviewer reports no findings" | A reviewer that stops looking satisfies it perfectly. Undetectable from inside. |
| **Presence-of-comparison** | "our output beats the reference / meets the named measurement" | A reviewer that stops looking produces *no verdict*, which is visibly not a pass. |

Your loop is the first kind. Shumer's is the second. That single property — not the subagent
architecture, not the fan-out, not `ultracode` — is what the Gauntlet Loop contributes, and it is the
thing your notes are missing.

You already half-say this in §7: *"'Reviewer has no findings' is evidence for advancing the queue, not
permission to self-approve final portfolio completion."* Correct, and it doesn't go far enough. If
"no findings" is only *evidence*, then something else has to be the *bar*, and §7 never names it.
The loop currently has a reviewer where it needs a reference.

Your own §5 note contains the generalization: **self-review catches code defects and misses missing
behavior.** Worth pushing on why that's true, because it explains what kind of bar fixes it. A
reviewer reading a diff is checking the code against itself — internal consistency, obvious errors,
plausibility. Nothing in that activity can surface a code path that doesn't exist, because absent code
produces no diff to review. The only thing that catches missing behavior is **executing the artifact
against an expectation that came from outside the artifact.** That is a bar. Independence of the
reviewer is necessary and nowhere near sufficient.

So the amendment I'd make to §7 step 5 is not about the reviewer at all:

> Each review round must compare the running artifact against a named external expectation — the
> spec's acceptance criteria exercised at runtime, a reference artifact, or a measurement. A review
> that produces no comparison produces no verdict. "No findings" without a named comparison is an
> incomplete review, not a pass.

And the corresponding amendment to §5's honesty rule, which currently says to prefer reporting a gap
over grading your own work green:

> State which comparison you performed and what you ran. A review that names no comparison and no
> executed behavior is a **reading**, not a review. Reading is a legitimate contribution; it must not
> advance a queue.

That reframing also makes §5's rule enforceable rather than aspirational. "Prefer reporting a gap" is
a request for good character. "Name your comparison or your review doesn't count" is a check.

---

## 2. The missing third verification class

`Verification: automated | human-eyes` is the strongest single idea in the notes, and the rule that
makes it work is the one I'd have missed: **a phase that cannot name its check is `human-eyes`.** That
default is what keeps the field from decaying into decoration. I proposed something similar in the
companion guide (classify each acceptance criterion as automated / reference / judgment /
unsettleable) and yours is better positioned, because it lives on the phase in a durable template
rather than in a review prompt.

But your `automated` class is doing two jobs. Your definition:

> acceptance criteria are machine-checkable: a test asserts them, a build or lint gate covers them, **or
> output matches a known-correct reference.**

The first two are boolean gates — an assertion runs and returns pass/fail. The third is not. Comparing
output against a reference is a *judgment against an artifact*. It can be delegated to a fresh critic
subagent, and it can run unattended, but it produces a preference with evidence rather than a boolean.
Folding it into `automated` loses the distinction that matters most for autonomous execution.

I'd argue for three classes:

```
Verification: automated | reference | human-eyes
```

- **`automated`** — an assertion, gate, or measurement returns pass/fail with no judgment. Name the
  specific check. Implement, verify, continue.
- **`reference`** — correctness is settled by comparing the running artifact against a named external
  artifact or measurement. Name the reference and where it lives. A fresh critic subagent inspects the
  real output, compares blind where blindness is possible, and returns a verdict plus the largest gap
  with evidence. Implement, compare, continue — **but the comparison evidence is retained for the
  human**, because the verdict is a judgment even when the agent made it.
- **`human-eyes`** — correctness is a judgment with no available external reference. Implement, capture
  evidence, stop and report even in autonomous mode.

**Why this earns its keep.** Look at your own §4 worked example: of eight milestones, three were
`human-eyes` — a pixel grid overlay, sprite animation registration, and character movement. A pixel
grid overlay compared against a reference screenshot is *exactly* the Call of Duty blind A/B, and it
does not need a human in the loop to produce a verdict. Under a three-class scheme it's `reference`,
and roughly two-thirds of the run's calendar time becomes unattended instead of half — without putting
any judgment on autopilot, because the comparison is against something the human named in advance.

You'd already spotted the path: *"`human-eyes` phases get promoted to `automated` once a pixel-exact
comparison exists to back them."* The `reference` class is that promotion, made available immediately
rather than after you build an assertion harness. Pixel-exact comparison is the eventual `automated`
version; reference comparison is what you can do today.

The distinction also gives you a much better honesty check than "did the reviewer find anything." At
plan time, the human reviewing a phase marked `reference` is asked a specific, answerable question:
*is this reference actually a bar, and does it exist?* A phase claiming `reference` against an artifact
that doesn't exist yet is a spec defect, and it's visible at the gate. That's the same function your
"name the specific check" rule performs for `automated`.

One caution specific to your workplace context: `reference` is the class most likely to collide with
data-handling rules. A reference that is a screenshot or payload derived from real member data is a
bar *and* a disclosure. Reference artifacts for anything data-adjacent need to be synthetic fixtures or
structural/schema-level standards. Some of the best available bars will be ones you can't use.

---

## 3. The experimental prompt: eight specific defects

You already flagged it as not a good example. Here's what specifically is wrong with it, since that's
the useful part. Roughly in order of severity.

**1. The bar is the reviewer's satisfaction.** *"when fully satisfied the the specification it should
be committed"* — this is §1's absence-of-objection problem stated directly in the prompt. Nothing
external is named, so the loop's exit is whenever a subagent stops objecting. Given §5's recorded
history on this exact codebase, this is the defect most likely to reproduce the Tier 2 outcome.

**2. The implementer triages the critic's findings.** *"Iterate fixing critical items in the review
but less critical items can be documented and skipped."* This inverts the whole point of separating
builder from critic. The critic's job is to name the largest gap; the builder's job is to close it.
Letting the implementing side decide which findings are "less critical" hands self-approval authority
back to the party you just spent a subagent spawn removing it from. If severity triage is needed — and
it is — the critic classifies, and anything below the bar that's being deferred gets recorded as a
deferral for the human, not silently skipped by the fixer.

**3. Committing is part of the loop's exit condition.** *"when fully satisfied ... it should be
comitted to git."* This collapses "done" and "committed" into one event, which means the loop's
self-assessment directly produces Git history. Your own §3 rules — check the branch first, create one
if on default, commit at phase boundaries, one logical change per commit — appear nowhere. The prompt
doesn't name a branch, so on a bad run this writes to whatever branch happens to be checked out.

**4. No stop condition at all.** *"Keep looping until all of Tier 3 has been implemented."* Your §7
lists the exit conditions the loop needs — blocker, `human-eyes` phase, conflicting specs, failed
integration, exhausted retry or diff-size budget, repeated findings indicating spec incompleteness.
The prompt has none of them. This is the runaway-guard question from §9 answered by omission.

**5. No `human-eyes` handling.** If any Tier 3 phase involves a judgment about how something looks or
feels — and in a Godot project, several will — the prompt has no mechanism to stop. It will produce a
verdict on those phases anyway, which is worse than stopping, because the verdict looks like evidence.

**6. Reviewer independence is architectural, not informational.** *"another sub-agent should review"*
gets you a separate context window. It does not withhold the implementer's narrative, which is the
part that actually matters. Your §7 already specifies this correctly — reviewer gets spec, plan, diff,
and test evidence but not the persuasive narrative — and the prompt doesn't encode it.

**7. "Sequentially" is not dependency order.** The prompt orders work by position in
`docs/dev-checklist.md`. §7 step 2 says the coordinator chooses the next ready spec *from dependency
order*. Checklist order is authoring order; those coincide only by luck. This is the concrete version
of your §9 question about the smallest dependency declaration that prevents two sound specs from
making incompatible contract changes.

**8. "Fan out subagents" is the wrong verb here.** In Shumer's game prompt, fan-out was across
genuinely independent *visual pieces* — the gun, the trees, the lighting. Your fan-out is across
*roles* — plan, then implement, then review — which is a pipeline, inherently sequential per spec.
Nothing is being parallelized; the phrase is carried over from a prompt where it meant something else.
Worth dropping, both because it's inaccurate and because the Claude of Duty repo itself found broad
fan-out performed worse than sequential ownership for coupled work. `ultracode` is a genuine
carry-over and worth keeping.

Not a defect, but worth noting: the prompt asks the AI to follow the skill's guidelines *and* gives it
an execution mode the skill doesn't define yet. That ambiguity is exactly what §6 is about. Until
`execution:` and `commits:` exist as durable settings, a prompt like this is chat-resident
configuration — the thing the methodology exists to eliminate.

---

## 4. A corrected prompt

This is longer than Shumer's, deliberately. See §5 below for why that's correct rather than a
regression.

Assumes the three-class `Verification:` field and the `execution:` / `commits:` settings exist. Where
they don't yet, the prompt states them inline, which is the honest interim.

```text
Follow /human-gated-spec-driven-ai-development to plan and implement the Tier 3 spec set.

EFFECTIVE SETTINGS FOR THIS RUN
execution: portfolio-autonomous
commits: ai-on-branch
branch: tier3   (verify you are on it before the first commit; do not create commits on the
                 default branch under any circumstance)

THE SET AND ITS ORDER
The Tier 3 set is exactly the specs listed in docs/dev-checklist.md under Tier 3, each of which
has completed its question and specification phase. Before starting, read all of them and write
the dependency order to specs/tier3-queue.md, naming for each spec what it depends on and which
shared contracts it touches. Work that order, not checklist order. If two specs modify the same
contract, say so and stop — do not guess a reconciliation.

PER-SPEC LIFECYCLE
For each ready spec, in queue order:

1. A planning subagent grounds a plan in the current repository state and writes
   specs/NNN-<label>-plan.md. Every phase carries Verification: automated | reference |
   human-eyes. Name the specific check for automated. Name the reference artifact and its
   location for reference. A phase that cannot name its check is human-eyes. Do not
   reclassify a phase later to avoid a stop.

2. An implementation subagent works one phase at a time, red/green TDD where feasible, keeping
   the plan checklist accurate as it goes — not only at the end. It does not absorb work from
   later phases.

3. After each phase, verify according to its class:
   - automated: run the named check plus the full suite. Record real output, not a description.
   - reference: spawn a critic in a FRESH context. Give it the spec, the phase acceptance
     criteria, the reference artifact, and instructions for running or rendering the real
     output. Do NOT give it the implementer's reasoning or diff narrative. The critic runs or
     renders the artifact, compares it against the reference blind where blindness is possible,
     states which it prefers, and names the single largest remaining gap with evidence. Record
     the comparison and the evidence.
   - human-eyes: capture evidence and STOP THE RUN. Report and wait. This holds regardless of
     how much of the queue remains.

4. Review rounds are bounded and must name a comparison. Every review states what it executed
   and what external expectation it compared against. A review that names no comparison and no
   executed behavior is a reading, not a review, and does not advance anything. The critic — not
   the implementer — classifies each finding as must-fix, should-fix, or deferred. The
   implementer fixes must-fix items only and may not reclassify. Deferred items are written to
   specs/NNN-<label>-review-findings.md for me, never silently skipped.

5. Each round must change strategy. Repeating a failed approach against the same evidence is
   spinning. Log failed approaches in the findings artifact so a fresh context does not retry
   them.

6. Commit at phase boundaries only, on the branch named above, one logical change per commit,
   leaving the project building and the plan checklist accurate. Never mid-phase. Never
   force-push, rewrite history, or delete a branch with unmerged work. Keep any bulk file moves
   or vendored dependencies in their own commits.

7. After the spec's phases are complete, run integration against the specs already landed in
   this run, then update specs/tier3-queue.md and start the next ready spec against the new
   repository state.

STOP THE RUN AND REPORT ON ANY OF
- a human-eyes phase is reached
- a phase is blocked ([!]) — do not skip ahead and do not re-scope around it
- two specs need incompatible changes to the same contract
- integration fails
- the same finding class recurs across 3 review rounds — this indicates the spec is incomplete,
  not that the implementation needs another pass
- 5 review rounds on a single spec
- cumulative diff exceeds <N> lines beyond what the plans anticipated
- any acceptance criterion turns out to be unverifiable as written
- anything requires a credential, a network call outside the project, or a change to a shared
  environment

NEVER SELF-APPROVE
Final review across the whole set is reported to me. "The reviewer found nothing" is evidence for
advancing the queue; it is never permission to declare the set complete. Push, merge, PR
creation, and final acceptance remain mine.

AT THE END
Report per-spec status, the comparison evidence for every reference phase, all deferred findings,
commits and branch state, dependency decisions you made, and every unresolved question. Say
plainly which phases you classified as automated or reference that you now think should have been
human-eyes.

Use ultracode.
```

That last instruction — asking it to flag its own optimistic classifications retrospectively — is
worth keeping. It's cheap, and misclassification is the failure mode that makes the whole
`Verification:` mechanism unsafe. Your §4 note that "questionable classifications become visible
evidence at final handoff" only happens if something asks for them.

---

## 5. Minimalism and autonomy trade off

Shumer's advice is emphatic that shorter is better: give the destination, not the route; don't
prescribe the architecture, the decomposition, or the round count. That advice is correct in his
setting and misleading in yours, and it's worth being explicit about why, because the corrected prompt
above visibly violates it.

His setting has a human watching. He says so directly — the run was still improving when he stopped
it, and he recommends a live progress page you check from your phone specifically so you can decide
when to stop. **The human is the stop condition.** Under that arrangement, boundaries in the prompt
are redundant: you are the boundary, and over-specifying only replaces the model's judgment with
yours.

Your level 2 removes the human from the run entirely. Once nobody is watching, every boundary that
was implicit in "I'll stop it when I'm happy" has to become explicit in the prompt or in durable
settings. So:

> Prompt minimalism is affordable in proportion to how closely a human is watching. Autonomy and
> minimalism are inversely related, not independent.

This is a real correction to the source advice as it applies to your methodology, and I think it
belongs in the README section §8 anticipates being argued rather than asserted. It also explains why
your experimental prompt feels off: it borrowed the *register* of a prompt written for supervised
execution and applied it to unsupervised execution. The `ultracode` / `fan out` phrasing is the tell.

Corollary worth noting: the thing that should stay minimal is **decomposition**. Let the planning
subagent decide phases and the coordinator decide dependency order. What should be maximal is
**boundaries and evidence requirements**. Shumer's "don't prescribe the architecture" survives intact;
his "keep it short" does not.

---

## 6. Open questions the Shumer material actually settles

From §9. Several are genuinely open and I'd leave them alone; these three I think have defensible
answers now.

**"What bounds the gauntlet: pass count, elapsed time, diff growth, repeated finding class, or some
combination?"**

Repeated finding class is the strongest bound and the others are backstops. Rationale: pass count and
elapsed time are proxies for cost, not for progress — they can't distinguish a loop that's converging
from one that's spinning. Repeated finding class measures the thing you actually care about, which is
whether the loop is adapting. And a recurring finding class carries diagnostic information the others
don't: the same class recurring usually means the *spec* is incomplete rather than the implementation
being deficient, which is a different escalation with a different fix.

Suggested combination: repeated finding class (3 rounds) as primary, diff growth beyond plan
expectation as the runaway guard, pass count (5) as the backstop, elapsed time not at all for
correctness purposes — only for cost. Note this also answers your separate question about whether
autonomous execution needs a phase-count or diff-size ceiling: diff-size, yes, and it's a better guard
than phase count because it detects scope leak rather than just length.

**"Should review always use a fresh subagent, and how much implementation context should be withheld
to preserve independence without forcing wasteful rediscovery?"**

Always fresh, and the line to draw is **withhold rationale, supply orientation.** Specifically:

- Withhold: why choices were made, what tradeoffs were accepted, what the implementer thinks is
  complete, any narrative framing of the diff, prior review verdicts on the same artifact.
- Supply: the spec, the acceptance criteria, the reference or named check, the diff, test output, and
  *where things are* — module layout, how to run the build, how to render or exercise the artifact.

Rediscovering repository geography is pure waste and buys no independence. Rediscovering the
implementer's reasoning is the entire point. The rediscovery cost people worry about is almost always
the first kind, which means it's avoidable without compromising anything.

**"Does integration review happen after every workstream, after each dependency layer, or once at the
end?"**

After each dependency layer. Shumer's smoothing pass runs at the end of each *wave* rather than after
each piece, for a reason that transfers: the conflict class you're hunting is interaction between
independently-improved parts, which doesn't exist yet after one workstream and is at its most
expensive to unwind if you wait until the end. Dependency layers are the natural wave boundary in your
level 2, because that's where shared contracts are exercised by more than one consumer for the first
time. Per-workstream integration mostly re-verifies what the workstream's own phases already covered.

---

## 7. Corrections to the companion guide

Reading your notes, three things in `gauntlet-loop-with-spec-driven-dev.md` are wrong or misplaced.

**The proposed `gauntlet-phase` stage is redundant and I'd drop it.** I positioned the loop as a
phase-level stage inside incremental mode. Your architecture puts it inside level-1 and level-2
execution, which is the better placement — the loop is a property of an execution mode, not a stage
the human invokes between other stages. Invoking a gauntlet by hand between `implement-next-phase` and
`review-phase` is just doing the review twice. What survives from that section is the *content* of the
critic brief, which should move into `references/review-principles.md` and the `reference`
verification class, not into a new stage.

**The loop budget is in the wrong file.** I put it in the plan's phase blocks. Your §6 is right that
the plan can't be the authority at level 1, because the autonomous run generates the plan — a
generated artifact can't authorize the autonomy that generated it. Loop budget belongs where the
`execution:` setting belongs: repo-level default, overridden by the approved spec header, copied into
generated plans for reconstruction only. Same argument, and I should have caught it since your §6 makes
it explicitly.

**The bar-finder template should be folded into the `Verification:` field rather than kept
separate.** My four-way classification during `review-spec` and your per-phase field are the same idea
at different times. Yours is better placed, because it's durable and sits at the plan gate. The one
thing worth lifting from mine is the `unsettleable` verdict — a criterion that cannot be evidenced *at
all* is different from one needing human eyes, and it's a spec defect that should block
`generate-plan` rather than becoming a phase that stops the run. Suggest handling it during
`review-spec` and routing it to a questions artifact, which leaves the phase field with the clean
three-way `automated | reference | human-eyes`.

The parts of the guide I'd keep as-is: the absence-of-objection versus presence-of-comparison
distinction (Part 2, now sharpened by §1 above), the critic brief content, the gauntlet log's *failed
approaches* section — which your §7 independently asks for as "repeated findings" detection — and the
regulated-work boundaries section, none of which your notes cover since they're written from personal
projects.

---

## 8. Suggested amendments to §8's file list

Additions to what you already have listed:

- `templates/specs/NNN-plan.md` — `Verification: automated | reference | human-eyes`, three classes
  rather than two, with the naming requirement for both `automated` and `reference` and the
  cannot-name-it-is-`human-eyes` default.
- `references/review-principles.md` — the amended honesty rule from §1 above (name your comparison or
  it's a reading, not a review), plus the withhold-rationale-supply-orientation contract from §6.
- `SKILL.md` — the gauntlet's exit condition needs to be stated as a comparison requirement, not a
  reviewer-satisfaction requirement. This is the substantive change; everything else is plumbing.
- `README.md` — the minimalism/autonomy tradeoff from §5 belongs alongside the two-axis table. It's
  the piece most likely to be misread by someone arriving from the Claude of Duty demo, since the
  source advice points the opposite direction.
- A `specs/NNN-<label>-review-findings.md` template. You already have a real instance of this
  (`017b-tier2-review-findings.md`) and it's currently ad hoc. Given that deferred findings are the
  mechanism preventing the implementer from silently skipping work, the artifact holding them should
  be standard rather than improvised.
- `comparison.md` — worth checking whether OpenSpec's Given/When/Then scenarios already function as a
  `reference`-class bar. If they do, that's a row where they're ahead of this workflow, and it's
  adjacent to the delta-semantics gap you already acknowledge.

One thing I'd *not* add: a portfolio status artifact, until the experiments say deriving the queue is
too expensive. Your instinct that it must stay an index rather than a second source of truth is right,
and index-that-becomes-a-source-of-truth is a very common drift. The `tier3-queue.md` in the corrected
prompt above is deliberately minimal — dependency order and shared contracts only, nothing that
duplicates per-spec state.

---

## 9. Eight amendments in repo-ready form

Paste-able text for each change, with its target file. Placeholders are in `<angle brackets>`.
Cross-references written as `[...](#)` need real anchors once the target files exist.

A1–A5 came first; A6–A8 were added after working through what a Godot project and an autonomous
execution mode actually need. **A8 supersedes part of A1** — bars are authored during specification
rather than emitted by `generate-plan`. A1's field definitions and bar-quality rules all stand; only
the timing changes. Read A1 for the mechanics and A8 for when it happens.

### The fidelity argument they rest on

A1, A2, and A4 all depend on one claim, so it's worth stating once rather than three times.

The methodology currently uses the markdown spec for two jobs: stating intent, and serving as the
standard the implementation is judged against. Markdown is good at the first and bad at the second.

Prose is a lossy encoding of a standard. A fresh critic reading the same acceptance criterion in a
fresh context on round three reaches a slightly different reading than it did on round one — not
because anything changed, but because prose admits multiple readings and fresh context is the whole
point of the critic. So the target drifts while nobody moves it. **That is the mechanism behind the
"moving goalposts" complaint in the criticism circulating about the Gauntlet Loop, and it is a
fidelity problem rather than an argument against specification.** More prose makes it worse. The same
standard encoded as a test, a mockup, or an anchored rubric makes it go away, because those either
pass or don't.

Anthropic's July 2026 context-engineering guidance for the Claude 5 generation reaches the same
conclusion from the model side: one of its six documented shifts is away from simple markdown specs
toward richer references — test suites, code, HTML artifacts, and rubrics — on the grounds that code
is a higher-fidelity instruction than a description of code, and that an HTML mockup of a design
outperforms both a description and a screenshot of it.

Two consequences worth being explicit about, because they cut against the obvious reading:

- **This strengthens the portability claim rather than threatening it.** A test suite survives a model
  swap, a context reset, and an agent change better than a paragraph does, because it executes instead
  of being interpreted. Durable files were always the design goal; this says some formats are more
  durable *in meaning* than others.
- **It does not reduce the amount of specification.** The spec still states intent in full. What
  changes is that judgment moves to an artifact the spec points at.

### A1 — `generate-plan` emits the bar

**Targets:** `templates/specs/NNN-plan.md`, `skills/.../references/stage-templates.md`, and the
`generate-plan` stage in `SKILL.md`.

Phase template:

```markdown
## Phase NN — <short goal>

Goal: <one sentence>
Verification: automated | reference | human-eyes
Bar: <resolvable path or identifier of the thing that settles this phase>

### Tasks
- [ ] <task>

### Acceptance criteria
- <criterion>

### Out of scope
- <item>
```

Stage rules:

```markdown
### Bar emission

Every phase carries `Verification:` and `Bar:`. The `Bar:` value must be a resolvable path or
identifier, not a description of one.

- `automated` — name the specific check: a test path and test name, a build or lint gate, or a
  measurement with its threshold. "The test suite" is not a bar; a named test is.
- `reference` — name an artifact that exists on disk at plan approval time. If it does not exist,
  create it as part of planning. If it cannot be created here because it must come from a designer,
  a vendor, or a system of record, mark the phase `[!]` blocked and name the missing artifact. A
  `reference` phase whose bar does not exist is not plannable.
- `human-eyes` — state what judgment is required and who can make it. This remains the honest
  default: a phase that can name neither a check nor a reference is `human-eyes`.

Prose acceptance criteria are inputs to a bar, never a bar themselves. A loop run against prose
re-interprets it each round, so the target drifts without anyone changing it.

Bar artifacts follow the existing numeric-prefix convention:

    specs/NNN-<label>-rubric-<slug>.md
    specs/NNN-<label>-mockup-<slug>.html

Bars that are code or tests live in the normal source tree and are referenced by path, not copied
into specs/.
```

At the plan gate this gives the developer a sharper question than "are these the right phases":
*does every bar exist, and is it actually a bar?* A phase claiming `reference` against an artifact
nobody has produced is a spec defect, and it is visible before implementation rather than after.

### A2 — rubrics as a first-class bar type

**Targets:** new `templates/specs/NNN-rubric.md`; a pointer from `references/review-principles.md`.

A rubric is what makes a bar available when the property being judged is a matter of taste but its
*dimensions* can still be named. It is the cheapest way to promote a `human-eyes` phase to
`reference`, and it is the mechanism Anthropic's guidance describes for verifier agents checking
work against a standard rather than a test.

```markdown
> Instructional: copy this file, replace NNN and <label>, and delete this blockquote before the
> rubric is used as a bar. A rubric is a bar, not guidance — every dimension must be scoreable by
> someone who did not build the thing being scored.

# <Subject> Rubric — NNN-<label>

## Scope
What this rubric judges. What it explicitly does not judge.

## How to score
Score each dimension pass / fail / unverifiable against its anchors, and cite the evidence used.
`unverifiable` is a legitimate score: it means the artifact could not be inspected for that
dimension. Say what was missing rather than guessing.

This document is a bar only if two independent critics would score the same artifact the same way.
A dimension that routinely produces disagreement has anchors that are too vague — tighten them, or
move that dimension to `human-eyes` and stop pretending it is checkable.

## Dimensions

### <Dimension name>
Judging: <which property of the artifact>
Fails when: <concrete description of a failing instance>
Passes when: <concrete description of a passing instance>
Evidence required: <what the critic must run, render, or measure>

### <Dimension name>
Judging:
Fails when:
Passes when:
Evidence required:

## Out of scope
Observations a critic may record for the developer but must not score, and must not return to the
builder as gaps.
```

Two notes on building these:

- Much of `references/review-principles.md` is already rubric content written as prose guidance —
  the SOLID / DRY / YAGNI / KISS lens, coupling and cohesion, testability. Restructuring the parts
  that have nameable anchors into scoreable dimensions costs little and converts guidance a reviewer
  may or may not apply into a bar a critic must report against.
- The anchors are what make scores reproducible across fresh contexts, so they are worth more effort
  than the dimension names. Note that this is not in tension with Anthropic's "examples become
  interface design" shift: that finding is about *tool-use* examples narrowing exploration, which is a
  different job from calibrating a judgment.

### A3 — loop selection by verification class

**Targets:** `SKILL.md`, `references/review-principles.md`.

This is the cost control, and it falls out of the classification rather than needing separate
machinery.

```markdown
### Loop selection by verification class

The verification class determines which loop runs, and the loop determines the cost.

| Class | Loop | Exit condition |
|---|---|---|
| `automated` | repair loop — run the named check, fix failures, rerun | the named check passes |
| `reference` | gauntlet — fresh-context critic compares the running artifact against the bar | the critic prefers our output, or a budget fires |
| `human-eyes` | none | implement, capture evidence, stop and report |

Rules:

- **Never run a gauntlet on an `automated` phase.** A critic loop there pays for judgment that a
  named check performs for free. This is the largest avoidable cost in the workflow.
- If an `automated` phase passes its check but the result is still wrong, that is a defect in the
  check or in the spec. Escalate it; do not add a critic loop to compensate for a bad assertion.
- **Never run a gauntlet on a `human-eyes` phase.** There is no bar, so the loop has nothing to
  converge on, and it will produce a confident verdict that looks like evidence.
- Gauntlet rounds are bounded even on `reference` phases. Stop at whichever fires first: the same
  finding class recurring across 3 rounds, 5 rounds total, or diff growth beyond what the plan
  anticipated. A recurring finding class usually means the spec is incomplete rather than the
  implementation deficient — escalate rather than spending the remaining rounds.
```

Worth stating plainly in the README too: detailed specs do not make the gauntlet expensive. They
make most phases `automated`, which makes most phases ineligible for a gauntlet — and that is the
cheap outcome. A project with no automatable tier pays gauntlet prices for everything because a
critic loop is its only available verification.

### A4 — README amendment on bars and artifacts

**Target:** `README.md`, as a dated amendment near the artifact-conventions material.

```markdown
### Amendment: bars are artifacts, not descriptions (August 2026)

This workflow originally used the markdown spec for two jobs — stating intent, and serving as the
standard against which the implementation is judged. Those are different jobs, and markdown is only
good at the first.

The spec remains the source of truth for intent: what must become true, for whom, under what
constraints, and what is out of scope. That does not change.

What changes is how a phase is judged. Prose is a lossy encoding of a standard. Two readers — or one
fresh reviewer across two rounds — reach slightly different readings of the same acceptance
criterion, so work can be iterated against prose indefinitely without converging. Higher-fidelity
encodings do not behave that way: a test passes or fails, a mockup renders or does not, a rubric
dimension has anchors. Anthropic's July 2026 context-engineering guidance for the Claude 5
generation makes the same point, recommending test suites, code, HTML mockups, and rubrics over prose
descriptions on the grounds that code is a higher-fidelity instruction than a description of code.

This strengthens rather than weakens the portability claim that motivates this methodology. A test
suite survives a model swap, a context reset, and an agent change better than a paragraph does,
because it executes instead of being interpreted. Durable files were always the point; this
amendment adds that some formats are more durable in meaning than others.

In practice: the spec states intent, and `generate-plan` emits a bar per phase via `Verification:`
and `Bar:`. See [Verification classes](#) and [Bars](#).

Guidance earlier in this README that treats the markdown spec as the judging standard was calibrated
to a model generation where prose was the practical option. The tradeoff moved; the earlier reasoning
was not wrong for its moment.
```

That last paragraph is worth keeping. The repo is public and the earlier framing is already
published, so a dated amendment that says what changed is more useful — and more credible — than a
silent edit.

### A5 — split `SKILL.md` before §8 grows it

**Target:** `skills/human-gated-spec-driven-ai-development/`.

§8 plans to add a settings section, two autonomy levels, orchestration, commit rules, and the
honesty rule to `SKILL.md`. That is roughly a doubling of an always-loaded file, and always-resident
instructions compete for adherence in a way that per-stage references do not. Anthropic's guidance
for exactly this case is progressive disclosure: divide long skills into many files and load them
when needed.

Proposed layout:

```
skills/human-gated-spec-driven-ai-development/
  SKILL.md                      # router only: stage list, settings resolution, load table
  references/
    settings.md                 # execution:, commits:, resolution order, defaults
    verification-classes.md     # automated | reference | human-eyes; bar requirements
    bars.md                     # choosing and building a bar; rubric guidance
    stage-templates.md          # artifact templates
    review-principles.md        # review lens, honesty rule, critic contract
    orchestration.md            # level 1 and level 2, queue, subagent contracts
    commit-discipline.md        # branch rules, commit boundaries, prohibitions
```

Load table for `SKILL.md`:

| Stage | Loads |
|---|---|
| `review-spec` | `verification-classes`, `bars`, `stage-templates` |
| `generate-questions` | `stage-templates` |
| `fold-questions` | `stage-templates` |
| `generate-plan` | `settings`, `verification-classes`, `bars`, `stage-templates` |
| `implement-next-phase` | `settings`, `verification-classes`, `commit-discipline` |
| `review-phase` | `review-principles`, `verification-classes` |
| `final-review` | `review-principles`, `orchestration` |
| level-2 coordinator | `settings`, `orchestration`, `commit-discipline` |

What stays in `SKILL.md`: the stage list, how settings resolve (repo default → spec header →
portfolio manifest), the load table above, and the small number of rules that must hold in every
stage — never self-approve `final-review`, a blocked phase stops the run, the human owns push, merge,
PR, and final acceptance. Everything else moves.

`/doctor` in Claude Code will audit the result and flag instructions that are no longer needed for
current models, which is worth running once after the split rather than reasoning about it.

### A6 — promotion and demotion rules

**Target:** `references/verification-classes.md`.

The three classes are only honest if movement between them is governed. Without rules, `human-eyes`
drifts upward whenever a stop is inconvenient, which is the failure that makes the whole field
decorative.

The governing asymmetry: **promotion reduces human oversight, demotion increases it.** So they get
different authority requirements.

```markdown
### Promotion and demotion

Promotion means moving a phase toward less human involvement:

    human-eyes  →  reference  →  automated

#### Promotion requires a new artifact and a human gate

A class may only be promoted because something now exists that did not exist before. Judgment
improving, or the run being in a hurry, is never grounds.

- `human-eyes` → `reference` — requires a rubric whose anchors are concrete enough that two
  independent critics score the same artifact the same way. If scoring is not reproducible, the
  phase is still `human-eyes` and the rubric is not yet a bar.
- `reference` → `automated` — requires an assertion, gate, or measurement that settles what the
  critic was judging. Name it. A comparison a human still has to read is not `automated`.

**Promotion happens only at a human gate** — during specification, or at the plan gate in
incremental mode. **An agent may never promote a phase during a run**, including when it has just
written the assertion that would justify promotion. Write the assertion, record the proposal, let
the next gate approve it.

Record every promotion in the phase retro with the artifact that justified it. Promotions over
time are the signal that the project's verification harness is maturing; if nothing ever gets
promoted, the harness is static and every cycle pays full price.

#### Demotion is always allowed, mid-run included

Moving a phase toward more human involvement is conservative, needs no approval, and should be
reported rather than requested:

- `automated` → escalate — the named check passes but the result is wrong. This is a defect in
  the check or the spec. Do not add a critic to compensate for a bad assertion.
- `reference` → `human-eyes` — critics disagree on the same artifact, or the bar turns out not to
  discriminate. Capture the evidence, stop, report.
- Any class → `[!]` blocked — the bar does not exist, or a criterion turns out unverifiable as
  written.

#### The anti-gaming rule

A phase's class may not be changed in a direction that avoids a stop the current class would have
caused. If an agent finds itself reasoning toward a promotion that would let a run continue, that
reasoning is the signal to stop and report instead.
```

That last rule is the one worth stating explicitly, because it is the exact shape of the temptation:
an autonomous run reaching a `human-eyes` phase has a strong local incentive to decide the phase is
really `reference` after all.

### A7 — `bars.md` for a Godot project

**Target:** `references/bars.md`, plus project-specific content in dragon-academy's `AGENTS.md`.

An honest correction to the companion guide first: **its bar guidance is web-shaped.** HTML mockups
are the recommended `reference` bar there, and they do not exist for a game project. Working out what
does exist changes the shape of the class distribution substantially.

```markdown
### Choosing a bar

A bar is the artifact or measurement a phase is judged against. It is not the acceptance criteria;
those are inputs to it. See [Verification classes](#).

Prefer the highest-fidelity bar available, because fidelity is what keeps the target still across
rounds and fresh contexts:

| Bar medium | Class | Why it holds still |
|---|---|---|
| Named test or measurement | `automated` | Executes. One reading. |
| Reference implementation to port from | `reference` | Executes. Ambiguity resolves by inspection. |
| Golden file / snapshot | `automated` if diffable, else `reference` | Byte- or state-identical every run. |
| Rendered artifact (HTML mockup, etc.) | `reference` | Renders identically every round. |
| Anchored rubric | `reference` | Concrete pass/fail anchors, so scores reproduce. |
| Screenshot | `reference` | Stable, but silent on behavior and states. |
| Prose acceptance criteria | none | Re-interpreted every round. Not a bar. |

#### Bars for game and simulation projects

There is no mockup tier, so the distribution differs from web work: more `automated` than you
would expect, a thin `reference` tier dominated by rubrics, and a permanent `human-eyes`
residue that should not be forced upward.

`automated` — most verification belongs here:
- data loading, schema validation, index generation, filtering
- save/load round-trips
- deterministic simulation: fixed seed and fixed input sequence produce an identical state trace
- golden state snapshots, where the state is serializable and stable
- **reachability**: every authored id has a handler reachable from the dispatch path
- **runtime sequencing**: behavior fires on its triggering input, not at scene load

`reference` — thin, and mostly rubrics:
- an anchored rubric for things with nameable dimensions but no assertion
- a prior working implementation to port or match
- golden visual snapshots, only where rendering is deterministic; anything with physics jitter,
  frame timing, or particle randomness is not a stable bar and belongs in `automated` behind a
  tolerance, or in `human-eyes`

`human-eyes` — and correctly permanent:
- feel, pacing, responsiveness, difficulty balance, whether an animation reads well

Some dimensions are never promotable. A rubric that claims to score "game feel" is a rubric with
vague anchors wearing a costume. Leaving these `human-eyes` is the honest outcome, not a gap.

#### The two mandatory assertion families

Both correspond to defects that reached review on this codebase, so they are checked by default
rather than when someone remembers:

Reachability — catches authored content with no code path:

    for each id in <authored dataset>.all_ids():
        assert a registered handler exists for id
        assert that handler is reachable from the dispatch path,
               not merely defined somewhere in the tree

Runtime sequencing — catches behavior resolving at load rather than on input:

    drive the build to the scenario
    assert the behavior has NOT occurred yet
    deliver the triggering input
    assert the behavior has now occurred

The second family requires actually running the build. Reading source does not verify behavior;
this is the check that reading cannot replace.
```

Two notes on scoping this file:

**Harness specifics are yours to fill in.** Which test framework, how you run headless, how you
simulate input — name the concrete tooling yourself rather than taking my guess at it. The rule "name
the specific check" applies here too.

**The build-verification instruction belongs in the project, not the skill.** `deploy.sh` symlinks the
skill into `~/.claude/skills/`, so it is global across every project including work. "Run the Godot
build and observe the scenario" in the skill would follow you into eligibility work where it is
meaningless. The skill says *how to verify by class*; dragon-academy's `AGENTS.md` says *what running
the thing means here*.

### A8 — bars move to specification

**Targets:** `templates/specs/NNN-spec.md`, `references/verification-classes.md`, and the
specification gate definition in `SKILL.md`.

This is the amendment that closes a hole A1 leaves open, and it also answers the §9 open question
about what artifact marks a spec as sufficiently specified.

**The hole.** A1 puts the bar-quality check at the plan gate: the developer asks "does every bar
exist, and is it actually a bar?" But in `spec-autonomous`, **there is no plan gate** — the run
generates the plan. So the agent classifies its own phases, chooses its own bars, and then judges
itself against them. That is the §5 finding one level up: not the builder grading its own work, but
the *planner setting its own bar*. The check disappears precisely when autonomy rises and it is
needed most.

**The fix.** Bars are authored during specification, by the human, at the gate that still exists.

```markdown
### Bars in the spec

Every must-have acceptance criterion carries a bar before the spec is considered specified.

| Criterion | Class | Bar | Exists |
|---|---|---|---|
| <criterion> | automated | <test path::test name> | yes |
| <criterion> | reference | specs/NNN-<label>-rubric-<slug>.md | yes |
| <criterion> | human-eyes | <what judgment, and who makes it> | n/a |

Rules:

- A criterion that can name neither a check nor an existing reference artifact is `human-eyes`.
- A criterion that cannot be evidenced at all is **unsettleable**: it is a spec defect, it goes to
  the questions artifact, and the spec is not specified until it is resolved or dropped.
- `reference` bars must exist on disk. A bar that is planned but unwritten does not count.

### The specification gate

A spec is sufficiently specified when all of the following hold:

1. No unresolved must-answer questions remain in its questions artifacts.
2. Every must-have acceptance criterion has a class and a bar per the table above.
3. Every `reference` bar named in that table exists on disk.
4. The developer has approved it.

This is a checkable condition, not a judgment. A resumed agent — or a portfolio coordinator —
determines whether the gate has been crossed by checking it, and cannot infer specification from
the absence of an unanswered questions file.
```

What `generate-plan` does instead of authoring bars: assign a class per phase, point each phase at a
bar that already exists in the spec's table, and mark the phase `[!]` blocked if the bar it needs is
missing. It composes bars; it does not invent them.

**The cost is real and the trade is correct.** This front-loads more human work before an autonomous
run begins — which is already the premise of both autonomy levels. Level 2 in particular asks you to
take every spec through specification before any implementation starts; adding "and write its bars" to
that gate is consistent rather than novel.

**Interaction with incremental mode:** the plan gate still exists there, so this is belt-and-braces
rather than the only check. Worth keeping anyway, because a bar written while thinking about the
problem is usually better than one written while thinking about the plan.

---

## Sources

- Matt Shumer, *How to Run a Gauntlet Loop* — https://somethingbig.ai/gauntlet-loop
- *Claude of Duty* repository — https://github.com/mshumer/Claude-of-Duty
- Stephen / The Prompt Index, *AI Loop Engineering in 2026* —
  https://www.thepromptindex.com/ai-loop-engineering-gauntlet-loop-guide.html
- rstehwien, `pending-updates.md` and `README.md` —
  https://github.com/rstehwien/spec-driven-ai-dev
- Thariq Shihipar (Anthropic), *The new rules of context engineering for Claude 5 generation models*,
  July 24 2026 —
  https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models
- Jaroslawicz et al., *How Many Instructions Can LLMs Follow at Once?* (IFScale) —
  https://arxiv.org/abs/2507.11538

Two sourcing notes, since both claims circulate in distorted form and A4 depends on getting them
right.

The widely repeated "models hold only 150–200 instructions, Claude Code uses ~50, so keep
`CLAUDE.md` under 200 lines" is a composite that neither source supports. IFScale measures
keyword-inclusion instructions from 10 to 500 and finds top reasoning models near-perfect *through*
150+ instructions, with the best frontier models at 68% accuracy at 500. Its 150–200 figure is where
primacy bias — attention favoring earlier instructions — peaks, not a capacity ceiling. The "~50
instructions" figure appears nowhere in Anthropic's post. The composite also silently converts
"instruction" (one keyword requirement) into "line of markdown," which is a category error: a
300-line spec may contain twenty instructions.

The Anthropic 80% figure is real and primary. Its documented mechanism is *conflicting* instructions
rather than instruction volume — transcripts showed overlapping directives clashing within a single
request, forcing deliberation before work. That distinction matters for A5: the argument for splitting
`SKILL.md` is contradiction and progressive disclosure, not a line budget.
