# Stage Templates

## review-spec

Use this structure when the user asks for a spec review:

```md
# Spec Review

## Issues
- ambiguity
- contradictions
- missing constraints
- edge cases
- likely implementation traps

## Clarifying Questions
- must-answer question
  - Proposed fallback: the assumption recommended if the developer has no preference
  - Cost if wrong: what would have to change later
- useful clarification
  - Proposed fallback: ...
  - Cost if wrong: ...

## Assumptions at Risk
Only assumptions that are not attached to a specific question above. If an
assumption is the fallback for a question, it belongs inline with that question
and must not be repeated here.

- assumption 1

## Recommended Spec Changes
- change 1
- change 2

## Repo Context Checked
- file or directory
- relevant behavior or constraint found there
```

## questions artifact

Create `specs/NNN-questions-01.md` or the next numbered `specs/NNN-questions-YY.md` file with this structure. If the related spec uses a label (for example `001-auth-spec.md`), include the same label in the questions filename (`specs/001-auth-questions-01.md`). The label must stay consistent across the entire artifact set.

Every question carries its own proposed fallback inline, as a sub-bullet directly under that question. Do not add a trailing section that collects fallbacks or assumptions, and do not write one fallback that covers several questions at once — the reader must be able to decide each question without scrolling elsewhere. Number questions continuously across all topics and sections so a fallback is never ambiguous about which question it belongs to.

A fallback is a recommendation awaiting a decision, never a default that applies on its own. Every question requires an explicit `> Decision:` from the developer, and accepting the recommendation is itself a decision they have to write down (`> Decision: use the fallback`). An unanswered question stays unresolved.

```md
# Questions for Spec 001 (or 001-auth)

## Repo Context Checked
- file or directory: relevant fact already established
- file or directory: constraint or behavior confirmed

## Must Answer

### Topic: [topic]

1. Question
   - Proposed fallback: the specific assumption recommended if you have no preference
   - Cost if wrong: what would have to change later if the fallback is not what you wanted

2. Question
   - Proposed fallback: ...
   - Cost if wrong: ...

## Useful Clarifications

### Topic: [topic]

3. Question
   - Proposed fallback: ...
   - Cost if wrong: ...

## How to Answer

Every question needs an explicit decision, placed directly under the question it answers:

> Decision:
> The decision made was...

If the proposed fallback is what you want, say so — that is still a decision:

> Decision:
> Use the fallback.

If you are not ready to decide, raise the open point instead and it will come back in the next questions artifact:

> Question:
> I have a question...

A question left blank is unresolved, not agreed. The fallback is a recommendation and is never folded into the spec without a decision accepting it.

## User gate
- answer every question in this file with a `> Decision:`, using `> Decision: use the fallback` where the recommendation is already what you want, and `> Question:` where you need to push back before deciding
- when you are ready, run `fold-questions` rather than skipping to planning
- example prompt: `Use the human-gated-spec-driven-ai-development skill to fold-questions from 001-questions-01.md into 001-spec.md` (or `001-auth-questions-01.md` into `001-auth-spec.md` when a label is used)
```

## plan format

Use this plan structure. If the related spec uses a label, the plan filename must use the same label (`specs/001-auth-plan.md`).

```md
# Plan 001 (or 001-auth)

## Repo Context Checked
- file or directory: current module or contract to preserve
- file or directory: current test or constraint that shapes the plan

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
