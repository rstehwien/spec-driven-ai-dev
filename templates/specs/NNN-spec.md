# [Feature or change title]

> Template for `specs/NNN-spec.md` or `specs/NNN-<label>-spec.md`.
> Replace `NNN` with a three-digit prefix (e.g., `001`, `002`).
> An optional label (e.g., `001-auth-spec.md`) is fine; if you use one, keep it on every artifact in this cycle.
>
> **Budget: 1,000 words, hard ceiling 1,500.** State the count when you hand this back.
> **This document states target state only** - what is true when the work is done,
> in present tense, as though it had always been that way.
>
> Do not write here: what the code used to do, what changed, what was tried and rejected,
> why a decision was made, approval status, dates, commit or ticket ids, an inventory of
> the repository, or instructions aimed at the implementing agent. Decisions live in the
> questions file; codebase traps live in the project's agent instructions; open debt lives
> in the project's ledger; what changed lives in git.
>
> A correction edits its requirement in place. Never add a correction block.
> Delete this blockquote and the bracketed placeholders before approving the spec.

## Goal

[One or two sentences. What is true when this is done?]

## Why now

[One or two sentences naming what is missing or unusable today. Not a history.]

## Scope

- [the areas of the system this touches]

## Requirements

[Numbered, flat, one fact each, 50 words maximum. No nesting beyond one level.
Write each as a statement about the finished system that is either true or false of it.]

1. [requirement]
2. [requirement]

## Values

[Delete this section when the work is not visual or data-shaped. When mockups, designs,
or fixed constants are the authority, put them here as a table rather than describing
them in prose. Express a measurement as a fraction of the canvas, not a raw pixel count.]

| Element | Value | Notes |
|---|---|---|
| [name] | [fraction / token / constant] | [state or condition] |

## Acceptance Criteria

[Observable conditions. Each one names something a person or a test can check.]

- [criterion]
- [criterion]

## Non-Goals

- [explicitly out of scope]

## Assumptions

- [what this spec takes as given]
