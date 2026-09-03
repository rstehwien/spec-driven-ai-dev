---
name: human-gated-spec-driven-ai-development
description: manage a local-filesystem workflow for human-gated spec-driven ai development using numbered markdown artifacts in specs/ such as 001-spec.md, 001-auth-spec.md, 001-questions-01.md, and 001-plan.md. use when the user wants to review a spec, generate numbered questions artifacts, iteratively fold answered questions back into the spec until the spec is sufficient to generate a phased plan, generate or update that plan with checklist items, implement the next phase in red/green tdd style while updating plan status, implement every phase of an approved plan in one run when the developer asks for the whole spec at once, review a completed phase, or run a final implementation review. supports bare filenames and markdown file links as artifact references.
---

Use this skill to run one stage at a time against a project on the local filesystem.

## Workflow overview

1. Resolve the requested stage.
2. Locate referenced artifacts from bare filenames or markdown links.
3. Read the current spec and plan state before making changes.
4. Perform a quick reconnaissance of the relevant codebase and project documentation before asking the user questions or proposing a plan.
5. Perform only the requested stage.
6. Update durable markdown artifacts in `specs/`.
7. Leave the project in a handoff-ready state.

## Human gates

This workflow is human-gated through explicit pauses between stages.

- Do not infer approval from silence.
- After any gated stage, tell the user what to review and what next stage to run if they approve.
- Give at least one concrete copy-paste prompt for the next stage using the actual artifact names from the current spec cycle.
- Treat the user's next stage invocation as implicit approval to continue from the prior gate unless they say otherwise.
- If the user asks to revise an artifact instead of advancing, treat that as withholding approval and update only the requested artifact.

The standard gates are:

- after `review-spec`, the user reviews either the generated questions artifact or the generated plan, or revises the spec if requested
- after `generate-questions`, the user answers the generated `NNN-questions-YY.md` file and then asks for `fold-questions`
- after `fold-questions`, the user either reviews and approves the updated working spec or answers the next generated `NNN-questions-YY.md` file if more clarification is still needed
- after `generate-plan`, the user reviews the plan and either asks for plan revisions or asks for `implement-next-phase` or `implement-spec` if approved
- after `implement-next-phase`, the user reviews the implementation evidence and optionally asks for `review-phase` if they want AI-assisted formal phase review recorded
- after `implement-spec`, the user reviews the implementation evidence for every phase that ran, and either accepts the spec as implemented or asks for `review-phase` or `final-review`
- after `review-phase`, the user decides whether to revise the phase or continue by asking for `implement-next-phase`
- after `final-review`, the user decides whether the work is complete or whether the AI should make another bounded improvement pass and return for review again

## Human responsibilities

The developer remains responsible for review, approval, and delivery actions outside the AI workflow.

- The human is responsible for code review and deciding whether a phase is acceptable.
- The human is responsible for committing changes, pushing branches, opening pull requests, and handling GitHub review flow.
- The AI must not make commits, create pull requests, merge branches, or otherwise act as the delivery authority unless the user explicitly overrides this workflow.
- The AI may prepare code and artifacts for review, but the human owns the final judgment and repository history.

## Artifact conventions

Assume the canonical artifact set below unless the repo clearly uses a compatible variant:

- `specs/001-spec.md`
- `specs/001-auth-spec.md`
- `specs/001-plan.md`
- `specs/001-auth-plan.md`
- `specs/001-questions-01.md` for the first clarification pass
- `specs/001-auth-questions-01.md` for the first clarification pass
- `specs/001-phase-01-review.md`
- `specs/001-auth-phase-01-review.md`
- `specs/001-phase-01-retro.md`
- `specs/001-auth-phase-01-retro.md`

Use three-digit spec ids such as `001`, `002`, `003`.
An optional label may appear between the numeric prefix and artifact type, for example `001-auth-spec.md`.

**The numeric prefix is implementation order, not authoring order.** Two things follow, and both matter:

- **A higher number supersedes a lower one** wherever they conflict. That is the whole value of the ordering: a reader can tell which decision is current from the filenames alone, without reading both.
- **Take the next number when the cycle begins, not when the idea occurs.** A spec authored several cycles ahead of its turn describes a repository that will not exist by the time it runs, and its factual premises go stale silently. Author each spec against the tree as it actually stands.

When a cycle is inserted out of order, or a planned cycle is paused or dropped, the ordering guarantee is only as good as the numbering. Either renumber so the order holds, or record in the project's checklist that it no longer does.

This assumes one implementation stream. Concurrent streams on one repository need a different scheme; do not assume this one generalizes to them.
Use two-digit phase ids such as `01`, `02`, `03` inside artifact names when phase-specific files are created.
Use two-digit question-set ids such as `01`, `02`, `03` inside questions artifact names when multiple clarification passes occur.

Accept either of these artifact reference styles:

- bare filenames such as `001-plan.md`
- bare filenames such as `001-auth-plan.md`
- markdown links such as `[plan](specs/001-plan.md)` or `[](001-plan.md)`

When a bare filename is provided, look for it in `specs/` first.

For naming, prefer:

- `specs/001-spec.md`
- `specs/001-auth-spec.md`
- `specs/001-plan.md`
- `specs/001-auth-plan.md`
- `specs/001-phase-01-review.md`
- `specs/001-auth-phase-01-review.md`
- `specs/001-phase-01-retro.md`
- `specs/001-auth-phase-01-retro.md`

The label is optional and exists only to help developers recognize the workstream at a glance. The three-digit numeric prefix remains the primary grouping key, and if a label is used it must stay consistent across every related artifact in the set.

Label propagation rule: whenever the working spec uses a label (for example `001-auth-spec.md`), every artifact you create or update for the same cycle must include the same label. That includes questions artifacts (`001-auth-questions-YY.md`), the plan (`001-auth-plan.md`), phase review artifacts (`001-auth-phase-NN-review.md`), and phase retro artifacts (`001-auth-phase-NN-retro.md`). Do not drop the label, do not change the label between artifacts, and do not mix labeled and unlabeled filenames within one cycle. Before creating any new artifact, check the existing spec filename for a label and reuse it verbatim.

For tiny or low-risk work, a lighter version of the workflow is acceptable:

- use a short spec
- generate a compact plan with 2 to 4 steps or one short phase
- skip phase review and retro artifacts unless the user asks for the full workflow
- still pause for human review before implementation and before declaring completion

## Stage commands

Treat these user intents as the standard stage commands:

- `review-spec`
- `generate-questions`
- `fold-questions`
- `generate-plan`
- `implement-next-phase`
- `implement-spec`
- `review-phase`
- `final-review`

If the request is phrased naturally instead of using the command name, map it to the closest stage.

If the user explicitly says `lightweight mode` or clearly asks for a lighter version of the workflow, use the lightweight variant described in this skill while preserving the same core gates: clarify intent before coding, pause for approval before implementation, and require evidence before calling the work complete.

## Required operating rules

- Work on exactly one stage per invocation. `implement-spec` is one stage that runs many phases; running the plan to completion is that stage's defined behavior, not an expansion of another stage's scope.
- Treat the spec as the source of truth.
- Treat the plan as a living artifact that must reflect current checklist state.
- Do not silently expand scope into later phases.
- Recommend a checkpoint commit after the working spec and plan are both approved, especially before risky implementation begins.
- Recommend another checkpoint commit after a phase is approved and before the next phase starts.
- Before `review-spec`, `generate-questions`, or `generate-plan`, inspect relevant local context such as nearby code, tests, schemas, configs, and readmes.
- Prefer answering questions from the repository before asking the user.
- Ask the user only about issues that remain unresolved after checking the local codebase and docs.
- When asking a question that could have been answered locally, first cite the files you checked and why they did not fully resolve it.
- Before implementation, restate the target phase goal, assumptions, and done criteria.
- Before ending a gated stage, tell the user what to review and what stage to run next if approved.
- Before ending a gated stage, include one or more concrete next-step prompts, for example `Use the human-gated-spec-driven-ai-development skill to generate-plan for 006-spec.md`.
- During implementation, update code and tests in red/green tdd style whenever feasible.
- After implementation, verify the project compiles and the full project test suite passes before marking a phase complete.
- If compilation or tests fail, record the blocked state honestly in the plan and review artifacts.
- Hold every artifact to the budgets and content rules in this skill. Cut to fit before handing a stage back.
- Write specs as target state only. Route history, rationale, and process state to the homes listed in this skill, or delete them.
- Keep questions artifacts such as `NNN-questions-YY.md` or `NNN-<label>-questions-YY.md` as a numbered clarification history. Do not delete prior question sets after folding them into the spec.
- Give every question in a questions artifact a concrete recommendation, so the developer can settle it by accepting rather than by composing an answer.
- Whenever you write a question for the developer, in a questions artifact or in a spec review, put its recommendation inline under that question rather than in a trailing summary section. A recommendation separated from its question forces the developer to re-derive which question it belongs to, which is exactly the review cost this workflow exists to avoid.
- In questions artifacts, treat blockquoted labels such as `> Decision:` and `> Question:` as developer feedback. `> Decision: accept recommendation` takes that question's recommendation as written. Any other `Decision` content overrides it. `Question` content stays as unresolved clarification.
- **Every question needs an explicit answer.** An unanswered question is unanswered - never treat silence as acceptance, and never fold a recommendation the developer did not accept in writing.
- Treat `fold-questions` as the clarification-loop stage: after answers are added, update the spec as far as possible and then either keep the resolved questions file as history or produce the next numbered set of unresolved questions.
- Keep handoff notes in the plan, review, and retro artifacts rather than creating a separate handoff file.

## Artifact size and content rules

These are gates, not guidance. An artifact that violates them is not ready for the
next stage.

### Budgets

| Artifact | Budget | Hard ceiling |
|---|---|---|
| spec | 1,000 words | 1,500 |
| plan, per phase | 300 words | 500 |
| questions file | 1,000 words | 1,500 |
| a single requirement | 50 words | - |

State the word count when you create or update a spec or plan. If an artifact is over
budget, cut it before handing it back rather than handing back an over-budget artifact
with an apology. If the work genuinely does not fit, that is a signal to split the
cycle, not to raise the budget.

### A spec states target state only

Write every requirement as a fact about the finished system, in present tense, as if it
had always been that way. Someone who has never seen this project should be able to act
on it.

Never put these in a spec:

- what the code used to do, or what changed
- what was tried and rejected
- why a decision was made, or what the alternatives would have cost
- approval status, dates, commit ids, ticket or tier ids, naming conventions, who has authority
- an inventory of what the repository currently contains
- instructions aimed at the implementing agent, such as `do not fix from this paragraph`
- restatements of standing project rules that already live in `AGENTS.md` or `CLAUDE.md`

Each of those already has a home:

| Content | Home |
|---|---|
| a decision and the alternatives it beat | the `NNN-questions-YY.md` file that asked it |
| a trap in the codebase | the project's agent instructions file |
| why one line of code is the way it is | a comment at that line |
| an open finding or inherited debt | the project's findings or debt ledger |
| what changed | git |

A correction to a requirement edits that requirement in place. A spec must never carry a
dated correction block, a superseded paragraph, or a note saying that an earlier
paragraph is wrong. If a spec needs a rule for reading its own contradictions, the fix is
to remove the contradiction.

### Specs for visual work

When mockups, designs, or screenshots are the authority, the section immediately after
the goal is a table of the values taken from them: element, measurement, colour token,
and state. Express a measurement as a fraction of the canvas rather than a raw pixel
count, so it survives a canvas change.

Prose describing a layout is not a specification of it. A value that appears once inside
a paragraph arguing for it will not survive into the implementation.

### Specs whose deliverable is not code

Some cycles produce an artifact rather than shipped behavior: an audit, a
register of differences, a survey, a measurement. Write these as their own spec,
and keep them separate from the cycle that acts on the findings.

- **The deliverable is the artifact.** Say so in the goal, and say plainly that
  nothing user-facing changes in this cycle.
- **Acceptance criteria describe the artifact's completeness**, not a passing
  build: it covers every case in scope, every row cites its evidence, every
  finding carries a severity and an owner. Any tooling the analysis needs is
  still verified normally.
- **An analysis spec never plans the fixes it will justify.** A spec that says
  its own later phases cannot be planned yet is two specs. Split it: the fix
  cycle is the next spec, authored from the finished artifact.
- **Do not fix opportunistically during the analysis.** A finding fixed mid-pass
  is a finding with no record, and it changes the thing being measured.

The signal that a spec needs this split is a phase list that trails off into
`04+`, or a requirement stating that scope is unknowable until an earlier phase
produces something.

### Density

- At most one bold span per requirement, and none in most of them. Bold above roughly 3%
  of a document's words carries no signal.
- A cross-reference costs the reader a file open. Cite a file when the reader must go
  there, never to justify a sentence.
- Prefer a table to a paragraph wherever the content is values rather than reasoning.

## Plan requirements

When generating or updating a plan, use markdown headers for each phase and include:

- phase goal
- out of scope notes
- risks or blockers
- checklist items using these states:
  - `[ ]` not started
  - `[-]` in progress
  - `[x]` completed
  - `[!]` blocked

A good default phase section is:

```md
## Phase 01 - [short title]

Goal: [one concise sentence]

### Tasks
- [ ] task 1
- [ ] task 2
- [ ] task 3

### Acceptance criteria
- criterion 1
- criterion 2

### Out of scope
- item 1

### Risks / blockers
- item 1

### Notes
- risks, assumptions, or dependencies
```

For implementation stages, update checklist items as work progresses and leave the plan current at the end of the run so the developer can see what is in progress, what was completed, and what is blocked.

## Stage-specific behavior

### Reconnaissance before question-heavy stages

Before `review-spec`, `generate-questions`, or `generate-plan`, do a short targeted scan of the repo so the stage is grounded in existing implementation and documentation.

Prioritize sources closest to the spec's topic:

- readmes and docs near the affected module
- existing code in the feature area
- tests that encode current behavior
- schemas, DTOs, API contracts, and example payloads
- configs, migrations, and wiring that constrain the design

Use that reconnaissance to separate:

- facts already established in the repo
- assumptions that can be stated explicitly without asking the user
- genuinely unresolved decisions that still need user input

### `review-spec`

Read the current spec and identify ambiguity, contradictions, missing constraints, unresolved assumptions, edge cases, and likely implementation traps.

Use repo reconnaissance to call out where the spec already aligns with existing code or docs, and where it conflicts with them.

Check the spec against the budgets and content rules in this skill, and report each violation as an issue with the cut that fixes it. An over-budget spec, or one carrying history, rationale, or process state, is not ready to plan from.

Create or update the spec review in-place or in a review artifact if the user requests it. Prefer concise, actionable feedback.

This stage is the normal front door for the workflow. After the review, choose the next action yourself instead of making the developer choose between intermediate stages:

- if the spec needs structured clarification, immediately create the next numbered `specs/NNN-questions-YY.md` or `specs/NNN-<label>-questions-YY.md` file and tell the developer to answer it and then run `fold-questions`
- if the spec is already clear enough to plan, immediately create or update the related plan artifact and tell the developer to review and approve it before running `implement-next-phase`
- if the spec needs direct revision before either of those paths makes sense, explain the blocking issue and tell the developer what to revise

When this stage creates questions, the next prompt should point to `fold-questions` after the developer answers them.

When this stage creates a plan, remind the developer that approval of the working spec and plan is a strong point for an optional checkpoint commit before implementation begins.

Consult `references/stage-templates.md` for the review structure.

### `generate-questions`

Create `specs/NNN-questions-YY.md` or `specs/NNN-<label>-questions-YY.md` using the same three-digit prefix as the related spec and plan. Start with `01` and increment the two-digit suffix for each new clarification pass.

Only include questions that remain unresolved after checking the relevant codebase and docs.

Group questions by topic. Distinguish must-answer questions from useful clarifications.

**Every question carries a recommendation.** Name the answer you would choose and give the reason in one or two sentences, so the developer can settle the question by accepting it rather than by composing an answer from scratch. State what it costs if the recommendation is wrong, so the developer knows which ones are worth overriding.

Write the recommendation inline, directly under its question. Never collect recommendations or assumptions into a trailing section at the end of the artifact, and never write a single recommendation that answers several questions at once. Each question must be decidable in place, without the reader scrolling elsewhere to find out what you are proposing.

The recommendation makes approval cheap; it does not make it automatic. A question the developer did not answer stays open and blocks the fold. **There is no fallback and no default answer** - never label a recommendation as one, and never keep a separate list of assumptions that apply when a question goes unanswered. One recommendation, written next to its question, answered explicitly.

Number questions continuously across every topic and section so each recommendation is unambiguously tied to one question.

Ask a question only when the answer changes what gets built. A question whose two answers produce the same code is not a question.

Before each topic, briefly note the files checked when that context materially reduced or eliminated uncertainty.

Do not tell the user to choose between answering the questions and skipping straight to planning. The expected next step after this stage is that the user answers the generated `NNN-questions-YY.md` file and then runs `fold-questions`.

This stage remains available when the user explicitly wants the clarification loop as a separate step instead of using the combined `review-spec` entry point.

Consult `references/stage-templates.md` for the template.

### `fold-questions`

Read the answered `specs/NNN-questions-YY.md` or `specs/NNN-<label>-questions-YY.md` and fold the answers into the spec. Remove ambiguity where possible. Preserve intent.

`> Decision: accept recommendation` takes that question's recommendation as written. Any other `Decision` content overrides it.

**A question with no `> Decision:` is unanswered.** Do not fold it, do not adopt its recommendation, and do not describe the spec as fully specified while it stands. Carry it into the next numbered questions artifact and say so. Silence is not acceptance - the recommendation exists to make approving cheap, not to make it automatic.

**Folding replaces; it never appends.** Rewrite the affected requirement in place, delete the wording the answer supersedes, and remove any `open question`, `provisional`, or `to be decided` marker the earlier draft carried. After a fold, the spec must not mention the question, the recommendation, or the deliberation - the resolved requirement reads as though it was always known. The questions file keeps that history, which is the whole reason it is kept.

Check the word count before and after. **A spec that grew during a fold was appended to, not folded.** Growth is only correct when an answer genuinely adds a requirement that did not exist; if it grew for any other reason, redo the fold as a replacement.

Report which recommendations were accepted and which were overridden, and name the ones that change what ships. Once folded, an accepted recommendation is a commitment and the spec states it as fact, with no trace of the question it settled.

Say plainly in your summary which questions came back because they were never decided.

Then decide whether clarification is complete:

- if yes, update the related spec artifact and keep the answered questions artifact as the record of that clarification pass
- if not, update the related spec artifact as far as possible and create the next numbered questions artifact so it contains only the still-unresolved questions

This stage is the single iterative clarification loop. Use it repeatedly until the spec is clear enough for the developer to approve as the working spec.

When this stage resolves all questions, keep the answered questions artifact as history.

When this stage still leaves open questions, create the next numbered questions artifact and do not generate a partial or speculative plan that still depends on unresolved product decisions.

### `generate-plan`

Generate or revise the related plan artifact from the current spec when the spec is already sufficiently clarified and approved by the developer as the working spec. Break work into small, reviewable phases. Order phases to reduce uncertainty early. Use the checklist structure from this skill.

Ground the phase breakdown in the current codebase structure so the plan reflects real modules, integration points, tests, and constraints rather than a generic implementation outline.

**Do not open the plan with an inventory of the repository.** The implementing agent can read the codebase; what it cannot derive is the intent and the order. Recon informs how you phase the work - it is not content to be transcribed into the artifact.

Where a phase depends on something surprising that already exists, or on something the spec assumes exists but does not, state it in that phase's `Notes` in one line with a `file:line`. Cap that to five lines across the whole plan. A longer list means the spec is being re-litigated in the plan, which is a signal to go back to the spec rather than to write more plan.

A plan is a checklist, not a memo. Nobody re-reads thirty pages, and an implementing agent attends to the opening and the phase it is on regardless of what else is in the file.

When the work is tiny or low-risk, a compact plan is acceptable if it still preserves clear scope boundaries and a human approval pause before implementation.

If the user requests plan revisions after reviewing a generated plan, treat that as another `generate-plan` invocation scoped to revising the existing plan rather than moving on to implementation.

This stage remains available when the user explicitly wants plan generation as a separate step instead of using the combined `review-spec` entry point.

Consult `references/stage-templates.md` and `references/review-principles.md`.

### `implement-next-phase`

1. Read the current spec and plan.
2. Find the next phase that is not complete and not explicitly blocked.
3. Restate the phase goal, assumptions, and done criteria.
4. Mark the active checklist items as `[-]` while working.
5. Implement only that phase in code and tests.
6. Use red/green tdd style whenever feasible:
   - add or update a failing test for the target behavior
   - implement the smallest change to pass
   - refactor while keeping tests green
7. Verify the code compiles or builds successfully.
8. Run relevant tests during iteration as needed, then run the full project test suite before the phase can be considered done.
9. Update the plan checklist states accurately as work progresses.
10. When work is blocked, mark the relevant items as `[!]` and record the reason in the plan so the developer can review the actual blocker.
11. Write or update implementation evidence in the plan.
12. If the user asked for full workflow artifacts, create or update draft phase review and retro artifacts, but keep them clearly unapproved until `review-phase` is run.

Never mark a task complete unless the implementation and validation support it.

Consult `references/stage-templates.md` for review and retro formats.

### `implement-spec`

Use this stage when the developer asks for a whole spec implemented in one run rather than a phase at a time. It is `implement-next-phase` applied repeatedly to one approved plan, with the per-phase gate removed and the gate at the end of the spec kept.

It is opt-in. Never widen `implement-next-phase` into this on your own initiative; the developer chooses the granularity, and choosing it once does not make it the default for later cycles.

Run the plan to completion:

1. Read the spec and the plan. Restate the whole sequence of phases and their done criteria before starting, so the developer can stop you before the first change rather than after the last.
2. Run each remaining phase in order, following `implement-next-phase` in full for each one — including red/green tdd, updating checklist state as work progresses, verifying the build, running the full project test suite at the phase boundary, and writing implementation evidence into the plan.
3. Do not carry work backwards or forwards across phases. Each phase is still bounded by its own scope; running the plan without stopping is not permission to reorder it, merge phases, or start a later phase's work early.
4. After each phase, state in chat which phase completed and what its verification reported. A single summary at the end hides which phase introduced a problem.

Stop before the end of the plan when any of these is true, and report rather than working around it:

- a phase is blocked and belongs in `[!]`
- a phase's verification fails, and fails again after one repair attempt
- a remaining phase depends on something the spec does not answer
- completing a phase would require changing the spec or the plan rather than implementing it
- the change is growing well beyond what the plan described

When you stop early, leave the plan accurate: completed phases marked complete, the stopping phase marked `[!]` with the reason, and later phases untouched. A partially implemented spec that is honestly recorded is a good outcome; one that is reported as finished is not.

At the end, report per phase rather than in aggregate: which phases completed, what each one's verification reported, which phases did not run and why, what remains blocked, and which files changed. Then hand back for review.

This stage removes the per-phase gate. It does not remove the review gate. Completing every phase is evidence for review, never a substitute for it, and the developer still owns whether the spec is done.

### `review-phase`

Use this optional stage to assist the developer's phase review. Review the completed phase against its acceptance criteria and against the design principles in `references/review-principles.md`.

Classify findings into:

- must-fix
- should-fix
- optional improvements

Update or create the phase review artifact.

If the user approves the phase after this review, update the retro artifact to reflect the approved outcome and recommended next step.

### `final-review`

Use this optional stage to assist the developer's final review. Review the full implementation against the spec, plan, architecture quality, maintainability, and the design principles in `references/review-principles.md`.

Focus especially on:

- SOLID
- DRY
- YAGNI
- KISS
- separation of concerns
- coupling and cohesion
- testability
- hidden technical debt

If the user wants changes after the final review, treat that as a new bounded improvement cycle grounded in the same approved spec and plan unless they explicitly ask to revise those artifacts too.

In that bounded improvement cycle, normally rerun the relevant tests and update affected plan, review, or retro artifacts before returning the work to the developer.

## Filesystem behavior

This skill is for local filesystem environments such as Codex or Claude Code.

Prefer editing existing repo files directly when the requested stage calls for it. Keep markdown artifacts in `specs/`. When creating a new spec cycle, choose the next available three-digit prefix.

## Output behavior

Be concise in chat. Put durable state in files.

When you finish a stage, report:

- which files were read
- which files were created or updated
- current phase status if relevant
- any blocked items or remaining risks
- what relevant repo context was learned before asking questions or proposing the plan
- what the user should review
- what stage to run next if they approve
- at least one copy-paste prompt that runs the next stage against the current artifact names
- if the clarification loop is still active, say explicitly whether the next step is to answer refreshed questions and rerun `fold-questions`, or to review the newly generated plan

## References

Read these files when relevant:

- `references/stage-templates.md` for artifact templates and stage output structure
- `references/review-principles.md` for code review and final review heuristics
