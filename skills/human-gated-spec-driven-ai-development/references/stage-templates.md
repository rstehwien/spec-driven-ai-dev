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

## Clarifying Questions
- must-answer
- useful clarification

## Assumptions at Risk
- assumption 1
- assumption 2

## Recommended Spec Changes
- change 1
- change 2
```

## questions.md

Create `docs/questions.md` with this structure:

```md
# Questions for Spec 001

## Must Answer
### Topic: [topic]
1. Question
2. Question

## Useful Clarifications
### Topic: [topic]
1. Question
2. Question

## Fallback Assumptions if Unanswered
- assumption 1
- assumption 2
```

## plan format

Use this plan structure:

```md
# Plan 001

## Phase 01 - [title]

Goal: [one sentence]

### Tasks
- [ ] task
- [ ] task

### Acceptance criteria
- criterion
- criterion

### Notes
- dependency
- risk

## Phase 02 - [title]
...
```

## phase review artifact

Use `docs/001-phase-01-review.md`:

```md
# Phase 01 Review

## Scope compliance
- notes

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
```

## phase retro artifact

Use `docs/001-phase-01-retro.md`:

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
```
