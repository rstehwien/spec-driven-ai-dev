---
name: human-gated-spec-driven-ai-development
description: manage a local-filesystem workflow for human-gated spec-driven ai development using numbered markdown artifacts in docs/ such as 001-spec.md and 001-plan.md. use when the user wants to review a spec, generate questions.md, fold answers back into the spec, generate or update a phased plan with checklist items, implement the next phase in red/green tdd style while updating plan status, review a completed phase, or run a final implementation review. supports bare filenames and markdown file links as artifact references.
---

Use this skill to run one stage at a time against a project on the local filesystem.

## Workflow overview

1. Resolve the requested stage.
2. Locate referenced artifacts from bare filenames or markdown links.
3. Read the current spec and plan state before making changes.
4. Perform only the requested stage.
5. Update durable markdown artifacts in `docs/`.
6. Leave the project in a handoff-ready state.

## Artifact conventions

Assume the canonical artifact set below unless the repo clearly uses a compatible variant:

- `docs/001-spec.md`
- `docs/001-plan.md`
- `docs/questions.md` for transient clarification work
- `docs/001-phase-01-review.md`
- `docs/001-phase-01-retro.md`

Use three-digit spec ids such as `001`, `002`, `003`.
Use two-digit phase ids such as `01`, `02`, `03` inside artifact names when phase-specific files are created.

Accept either of these artifact reference styles:

- bare filenames such as `001-plan.md`
- markdown links such as `[plan](docs/001-plan.md)` or `[](001-plan.md)`

When a bare filename is provided, look for it in `docs/` first.

For naming, prefer:

- `docs/001-spec.md`
- `docs/001-plan.md`
- `docs/001-phase-01-review.md`
- `docs/001-phase-01-retro.md`

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

## Required operating rules

- Work on exactly one stage per invocation.
- Treat the spec as the source of truth.
- Treat the plan as a living artifact that must reflect current checklist state.
- Do not silently expand scope into later phases.
- Before implementation, restate the target phase goal, assumptions, and done criteria.
- During implementation, update code and tests in red/green tdd style whenever feasible.
- After implementation, verify the project compiles and all relevant tests pass before marking work complete.
- If compilation or tests fail, record the blocked state honestly in the plan and review artifacts.
- Keep `questions.md` transient. Fold resolved answers into the spec, then delete it or leave it marked transient and obsolete.
- Keep handoff notes in the plan, review, and retro artifacts rather than creating a separate handoff file.

## Plan requirements

When generating or updating a plan, use markdown headers for each phase and include:

- phase goal
- out of scope notes when needed
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

### Notes
- risks, assumptions, or dependencies
```
```

For implementation stages, update checklist items as work progresses and leave the plan current at the end of the run.

## Stage-specific behavior

### `review-spec`

Read the current spec and identify ambiguity, contradictions, missing constraints, unresolved assumptions, and edge cases.

Create or update the spec review in-place or in a review artifact if the user requests it. Prefer concise, actionable feedback.

Consult `references/stage-templates.md` for the review structure.

### `generate-questions`

Create `docs/questions.md` as a transient artifact.

Group questions by topic. Distinguish must-answer questions from useful clarifications. Include fallback assumptions that would apply if a question remains unanswered.

Consult `references/stage-templates.md` for the template.

### `fold-questions`

Read the answered `docs/questions.md` and fold the answers into the spec. Remove ambiguity where possible. Preserve intent. After updating the spec, either delete `docs/questions.md` or mark it clearly as transient and obsolete.

### `generate-plan`

Generate or revise `docs/NNN-plan.md` from the current spec. Break work into small, reviewable phases. Order phases to reduce uncertainty early. Use the checklist structure from this skill.

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
8. Run relevant tests. Prefer targeted tests first, then broader validation when appropriate.
9. Update the plan checklist states accurately.
10. Write or update the phase review and retro artifacts.

Never mark a task complete unless the implementation and validation support it.

Consult `references/stage-templates.md` for review and retro formats.

### `review-phase`

Review the completed phase against its acceptance criteria and against the design principles in `references/review-principles.md`.

Classify findings into:

- must-fix
- should-fix
- optional improvements

Update or create the phase review artifact.

### `final-review`

Review the full implementation against the spec, plan, architecture quality, maintainability, and the design principles in `references/review-principles.md`.

Focus especially on:

- SOLID
- DRY
- YAGNI
- KISS
- separation of concerns
- coupling and cohesion
- testability
- hidden technical debt

## Filesystem behavior

This skill is for local filesystem environments such as Codex or Claude Code.

Prefer editing existing repo files directly when the requested stage calls for it. Keep markdown artifacts in `docs/`. When creating a new spec cycle, choose the next available three-digit prefix.

## Output behavior

Be concise in chat. Put durable state in files.

When you finish a stage, report:

- which files were read
- which files were created or updated
- current phase status if relevant
- any blocked items or remaining risks

## References

Read these files when relevant:

- `references/stage-templates.md` for artifact templates and stage output structure
- `references/review-principles.md` for code review and final review heuristics
