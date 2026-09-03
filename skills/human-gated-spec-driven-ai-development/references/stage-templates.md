# Stage Templates

## review-spec

Use this structure when the user asks for a spec review:

```md
# Spec Review

## Budget and content check
- word count: N of 1,000
- target-state violations: history, rationale, process state, repo inventory, or agent-directed instructions found in the spec, each with the cut that fixes it
- density: bold as a share of words, longest requirement, cross-reference count

## Issues
- ambiguity
- contradictions
- missing constraints
- edge cases
- likely implementation traps

## Clarifying Questions
- must-answer
- useful clarification

## Assumptions at Risk
- assumption 1
- assumption 2

## Recommended Spec Changes
- change 1
- change 2

## Repo Context Checked
- file or directory
- relevant behavior or constraint found there
```

## questions artifact

Create `specs/NNN-questions-01.md` or the next numbered `specs/NNN-questions-YY.md` file with this structure. If the related spec uses a label (for example `001-auth-spec.md`), include the same label in the questions filename (`specs/001-auth-questions-01.md`). The label must stay consistent across the entire artifact set.

Budget: 1,000 words. Every question carries a recommendation so the developer can settle it by accepting rather than by composing an answer. Every question still needs an explicit answer - a recommendation is never adopted by default.

```md
# Questions for Spec 001 (or 001-auth)

## Repo Context Checked
- file or directory: the fact it established, so it is not asked below

## Must Answer

### Q1 - [the question, one line]
**Recommend:** [the answer you would choose, and why, in one or two sentences]
**If wrong:** [what this changes if it is not what the developer wants]

### Q2 - [the question, one line]
**Recommend:** [...]
**If wrong:** [...]

## Useful Clarifications

### Q3 - [the question, one line]
**Recommend:** [...]

## How to Answer

To take the recommendation as written:

> Decision: accept recommendation

To override it:

> Decision: [the answer]

To defer, because it cannot be answered yet:

> Question: [what you need first]

Every question needs an answer. An unanswered question stays open and blocks the fold.

## User gate
- answer this file directly, then run `fold-questions`
- example prompt: `Use the human-gated-spec-driven-ai-development skill to fold-questions from 001-questions-01.md into 001-spec.md` (or `001-auth-questions-01.md` into `001-auth-spec.md` when a label is used)
```

## plan format

Use this plan structure. If the related spec uses a label, the plan filename must use the same label (`specs/001-auth-plan.md`).

Budget: 300 words per phase. A plan is a checklist, not a memo. It does not open with an inventory of the repository, does not restate the spec's requirements, and does not re-argue the questions file's decisions.

```md
# Plan 001 (or 001-auth)

## Gaps
- [something the spec assumes exists but does not, with `file:line`]
- [max five lines across the whole plan; more means the spec needs another pass]

## Phase 01 - [title]

Goal: [one sentence]

### Tasks
- [ ] task
- [ ] task

### Acceptance criteria
- criterion
- criterion

### Out of scope
- item

### Risks / blockers
- risk

### Notes
- dependency
- risk

## Phase 02 - [title]
...
```

## phase review artifact

Use `specs/001-phase-01-review.md`, or `specs/001-auth-phase-01-review.md` when the related spec and plan use a label. Always carry the spec's label forward into the review filename:

```md
# Phase 01 Review

## Scope compliance
- notes

## Validation evidence
- targeted tests run
- full project test suite result

## Acceptance criteria review
- criterion: met | not met | partial

## Must-fix issues
- issue

## Should-fix issues
- issue

## Optional improvements
- improvement

## Approval recommendation
- approve | revise

## User gate
- review this artifact and implementation evidence
- if approved, run `implement-next-phase` for the next phase or `final-review` if all phases are complete
- example prompt: `Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-plan.md` (or `001-auth-plan.md` when a label is used)
```

## phase retro artifact

Use `specs/001-phase-01-retro.md`, or `specs/001-auth-phase-01-retro.md` when the related spec and plan use a label. Always carry the spec's label forward into the retro filename:

```md
# Phase 01 Retrospective

## What changed
- change

## Checklist updates
- completed
- blocked

## Known issues
- issue

## Risks discovered
- risk

## Recommended next step
- next step

## Approval state
- draft pending user review | approved
```

## final review

Use this structure:

```md
# Final Review

## Executive summary
- summary

## Spec compliance
- finding

## Architecture assessment
- finding

## Critical issues
- issue

## Important improvements
- item

## Cleanup opportunities
- item

## Technical debt register
- debt

## Go / no-go recommendation
- go | no-go

## User gate
- review final implementation, tests, and open risks
- if approved, treat the work as complete; otherwise start another spec or implementation cycle
- example prompt: `Use the human-gated-spec-driven-ai-development skill to review-spec for specs/002-spec.md` (or `specs/002-auth-spec.md` when a label is used)
```
