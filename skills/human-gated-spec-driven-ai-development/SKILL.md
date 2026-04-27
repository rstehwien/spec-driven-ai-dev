---
name: human-gated-spec-driven-ai-development
description: manage a local-filesystem workflow for human-gated spec-driven ai development using numbered markdown artifacts in specs/ such as 001-spec.md, 001-auth-spec.md, 001-questions.md, and 001-plan.md. use when the user wants to review a spec, generate numbered questions artifacts, iteratively fold answered questions back into the spec until the spec is sufficient to generate a phased plan, generate or update that plan with checklist items, implement the next phase in red/green tdd style while updating plan status, review a completed phase, or run a final implementation review. supports bare filenames and markdown file links as artifact references.
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
- after `generate-questions`, the user answers `NNN-questions.md` and then asks for `fold-questions`
- after `fold-questions`, the user either reviews and approves the updated working spec or answers the refreshed `NNN-questions.md` if more clarification is still needed
- after `generate-plan`, the user reviews the plan and either asks for plan revisions or asks for `implement-next-phase` if approved
- after `implement-next-phase`, the user reviews the implementation evidence and optionally asks for `review-phase` if they want AI-assisted formal phase review recorded
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
- `specs/001-questions.md` for transient clarification work
- `specs/001-auth-questions.md` for transient clarification work
- `specs/001-phase-01-review.md`
- `specs/001-auth-phase-01-review.md`
- `specs/001-phase-01-retro.md`
- `specs/001-auth-phase-01-retro.md`

Use three-digit spec ids such as `001`, `002`, `003`.
An optional label may appear between the numeric prefix and artifact type, for example `001-auth-spec.md`.
Use two-digit phase ids such as `01`, `02`, `03` inside artifact names when phase-specific files are created.

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

The label is optional and exists only to help developers recognize the workstream at a glance. The three-digit numeric prefix remains the primary grouping key, and if a label is used it should stay consistent across the related artifact set.

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
- `review-phase`
- `final-review`

If the request is phrased naturally instead of using the command name, map it to the closest stage.

If the user explicitly says `lightweight mode` or clearly asks for a lighter version of the workflow, use the lightweight variant described in this skill while preserving the same core gates: clarify intent before coding, pause for approval before implementation, and require evidence before calling the work complete.

## Required operating rules

- Work on exactly one stage per invocation.
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
- Keep questions artifacts such as `NNN-questions.md` or `NNN-<label>-questions.md` transient. After `fold-questions`, delete them by default when all questions are fully resolved and absorbed into the spec. Only leave them behind if there is a specific reason to preserve them, and then mark them clearly transient and obsolete.
- In questions artifacts, treat blockquoted labels such as `> Decision:` and `> Question:` as developer feedback. Fold `Decision` content into the spec when it resolves an issue, and preserve or refine `Question` content as unresolved clarification.
- Treat `fold-questions` as the clarification-loop stage: after answers are added, update the spec as far as possible and then either delete the resolved questions file or produce a cleaner next set of unresolved questions.
- Keep handoff notes in the plan, review, and retro artifacts rather than creating a separate handoff file.

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

Create or update the spec review in-place or in a review artifact if the user requests it. Prefer concise, actionable feedback.

This stage is the normal front door for the workflow. After the review, choose the next action yourself instead of making the developer choose between intermediate stages:

- if the spec needs structured clarification, immediately create or update `specs/NNN-questions.md` or `specs/NNN-<label>-questions.md` and tell the developer to answer it and then run `fold-questions`
- if the spec is already clear enough to plan, immediately create or update the related plan artifact and tell the developer to review and approve it before running `implement-next-phase`
- if the spec needs direct revision before either of those paths makes sense, explain the blocking issue and tell the developer what to revise

When this stage creates questions, the next prompt should point to `fold-questions` after the developer answers them.

When this stage creates a plan, remind the developer that approval of the working spec and plan is a strong point for an optional checkpoint commit before implementation begins.

Consult `references/stage-templates.md` for the review structure.

### `generate-questions`

Create `specs/NNN-questions.md` or `specs/NNN-<label>-questions.md` as a transient artifact using the same three-digit prefix as the related spec and plan.

Only include questions that remain unresolved after checking the relevant codebase and docs.

Group questions by topic. Distinguish must-answer questions from useful clarifications. Include fallback assumptions that would apply if a question remains unanswered.

Before each topic, briefly note the files checked when that context materially reduced or eliminated uncertainty.

Do not tell the user to choose between answering the questions and skipping straight to planning. The expected next step after this stage is that the user answers `NNN-questions.md` and then runs `fold-questions`.

This stage remains available when the user explicitly wants the clarification loop as a separate step instead of using the combined `review-spec` entry point.

Consult `references/stage-templates.md` for the template.

### `fold-questions`

Read the answered `specs/NNN-questions.md` or `specs/NNN-<label>-questions.md` and fold the answers into the spec. Remove ambiguity where possible. Preserve intent.

Then decide whether clarification is complete:

- if yes, update the related spec artifact and delete the related questions artifact by default
- if not, update the related spec artifact as far as possible and regenerate the related questions artifact so it contains only the still-unresolved questions

This stage is the single iterative clarification loop. Use it repeatedly until the spec is clear enough for the developer to approve as the working spec.

When this stage resolves all questions, delete the related questions artifact by default.

Only keep the questions file after clarification if there is a specific reason to preserve it for audit or handoff purposes, and then mark it clearly transient and obsolete.

When this stage still leaves open questions, keep the related questions artifact current and do not generate a partial or speculative plan that still depends on unresolved product decisions.

### `generate-plan`

Generate or revise the related plan artifact from the current spec when the spec is already sufficiently clarified and approved by the developer as the working spec. Break work into small, reviewable phases. Order phases to reduce uncertainty early. Use the checklist structure from this skill.

Ground the phase breakdown in the current codebase structure so the plan reflects real modules, integration points, tests, and constraints rather than a generic implementation outline.

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
