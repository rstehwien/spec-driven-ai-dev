# Questions for Spec [NNN]

> Template for `specs/NNN-questions-YY.md` or `specs/NNN-<label>-questions-YY.md`.
> Use the same `NNN` as the related spec and plan.
> Use a two-digit suffix (`01`, `02`, `03`) and increment for each new clarification pass -
> do not overwrite or delete prior question sets.
>
> **Budget: 1,000 words, hard ceiling 1,500.**
> Ask only what changes what gets built. If both answers produce the same code, it is not a question.
> **Every question carries a recommendation**, written inline under that question, so answering can be one word.
> Number questions continuously across all topics. Never collect recommendations into a trailing section.
> `Decision` content gets folded into the spec. `Question` content stays as unresolved clarification.
> A question left blank is unresolved, not agreed, and its recommendation is never folded in on its own.
> Delete this blockquote before answering.

## Repo Context Checked

- [file or directory: the fact it established, so it is not asked below]

## Must Answer

### Topic: [topic]

#### Q1 - [the question, one line]

**Recommend:** [the answer you would choose, and the reason, in one or two sentences.]
**If wrong:** [what this changes if the recommendation is not what you want.]

#### Q2 - [the question, one line]

**Recommend:** [...]
**If wrong:** [...]

## Useful Clarifications

### Topic: [topic]

#### Q3 - [the question, one line]

**Recommend:** [...]

## How to Answer

Answer under each question with a blockquote.

To take the recommendation as written:

> Decision: accept recommendation

To override it, say what you want instead:

> Decision: [the answer]

To defer, because it cannot be answered yet:

> Question: [what you need first]

**Every question needs an explicit answer.** A recommendation is never adopted by
default - an unanswered question stays open and blocks the fold. Accepting is two
words, so accepting is cheap; it is just never automatic.

## User gate

- answer this file directly, then run `fold-questions`
- example prompt: `Use the human-gated-spec-driven-ai-development skill to fold-questions from NNN-questions-01.md into NNN-spec.md`
