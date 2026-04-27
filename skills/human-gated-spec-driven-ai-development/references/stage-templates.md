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

Create `specs/NNN-questions.md` with this structure:

```md
# Questions for Spec 001

## Repo Context Checked
- file or directory: relevant fact already established
- file or directory: constraint or behavior confirmed

## Must Answer
### Topic: [topic]
1. Question
2. Question

## Useful Clarifications
### Topic: [topic]
1. Question
2. Question

## How to Answer
Use blockquoted labels for comments and feedback:

> Decision:
> The decision made was...

> Question:
> I have a question...

## Fallback Assumptions if Unanswered
- assumption 1
- assumption 2

## User gate
- answer this file directly, preferably using `> Decision:` for settled answers and `> Question:` for follow-up uncertainty
- when you are ready, run `fold-questions` rather than skipping to planning
- example prompt: `Use the human-gated-spec-driven-ai-development skill to fold-questions from 001-questions.md into 001-spec.md`
```

## plan format

Use this plan structure:

```md
# Plan 001

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

Use `specs/001-phase-01-review.md`:

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
- example prompt: `Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-plan.md`
```

## phase retro artifact

Use `specs/001-phase-01-retro.md`:

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
- example prompt: `Use the human-gated-spec-driven-ai-development skill to review-spec for specs/002-spec.md`
```
