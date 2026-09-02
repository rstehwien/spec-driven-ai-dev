# Open Questions

> Template for `specs/NNN-questions-YY.md` or `specs/NNN-<label>-questions-YY.md`.
> Use the same `NNN` as the related spec and plan.
> Use a two-digit suffix (`01`, `02`, `03`) and increment for each new clarification pass — do not overwrite or delete prior question sets.
> When answering, use these blockquote labels so the AI knows how to fold each item:
>
> ```md
> > Decision:
> > The decision made was...
>
> > Question:
> > I have a question...
> ```
>
> `Decision` content gets folded into the spec. `Question` content stays as unresolved clarification.
> Every question needs an explicit `> Decision:`. If the proposed fallback is what you want, write
> `> Decision: use the fallback` — accepting it is still a decision. A question left blank is
> unresolved, not agreed, and its fallback is never folded in on its own.
> Delete this blockquote before answering.

## Context From Repo

- [files checked: e.g., `src/auth/middleware.ts`, `migrations/2026_01_add_users.sql`]
- [what those files confirmed, and what they did not resolve]

## Must Answer

### Topic: [topic]

1. [question that blocks planning]
   - Proposed fallback: [assumption recommended if you have no preference]
   - Cost if wrong: [what would have to change later]

2. [another blocking question]
   - Proposed fallback: [assumption]
   - Cost if wrong: [what would have to change later]

## Useful Clarifications

### Topic: [topic]

3. [question that improves the plan but is not blocking]
   - Proposed fallback: [assumption]
   - Cost if wrong: [what would have to change later]

Every question carries its own proposed fallback inline. Do not add a trailing
section collecting fallbacks or assumptions, and do not write one fallback
covering several questions. Number questions continuously across all topics.
A fallback is a recommendation awaiting a decision, not a default that applies
by itself.
