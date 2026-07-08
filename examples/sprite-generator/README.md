# Sprite Generator — Worked Example

These are **real artifacts from a real project**: the specs, questions, plans, and reviews that drove an RPG Maker sprite-generation toolchain built with the human-gated spec-driven AI development workflow. They are copied verbatim from that project's `specs/` directory — nothing here is synthesized or trimmed for illustration.

Because they are real, some in-artifact links point at files that live in the source project (`../docs/rpgmaker-graphics.md`, `../scripts/cli.py`, `../tests/…`) and will not resolve inside this example directory. That is expected: the point is to show what the *workflow artifacts* look like at full fidelity, not to reproduce the whole codebase. Links between the numbered artifacts themselves (spec ↔ plan ↔ questions ↔ review) do resolve.

Two complete sets are included, chosen to show the workflow at two different points in a project's life.

## Set 001 — the first spec (spec → plan → review)

The first numbered work in the project: the deterministic helper-script layer. It is the most approachable set because it is self-contained and small enough to hold in your head.

- [`specs/001-helpers-spec.md`](specs/001-helpers-spec.md) — the spec: scope, guiding principles, per-script contracts, a shared validation-report schema, and an "Open Questions" section where resolutions are recorded inline as a chronicle of decisions.
- [`specs/001-helpers-plan.md`](specs/001-helpers-plan.md) — the phased, checklist-driven plan (Phases 0–6). Each phase has a goal, tasks with `[ ]`/`[x]` markers, and exit criteria that gate the next phase. TDD red/green is baked into the how-to-use notes.
- [`specs/001-helpers-review.md`](specs/001-helpers-review.md) — an independent code review against the spec and plan, with severity-ranked findings, evidence for each, recommended fixes, and a resolution update once the findings were addressed.

## Set 008 — mid-project (spec → questions → plan → review)

A later spec, once the project had history and conventions. It reorganizes the per-character artifacts layout. This set adds the **questions artifact** — the durable clarification pass the workflow centers on — and shows how a spec is shaped by both its own open questions and fresh code reconnaissance.

- [`specs/008-artifacts-reorg-spec.md`](specs/008-artifacts-reorg-spec.md) — the spec, cross-referencing its sibling specs (006 → 007 → 008 → 009 → 010) and the live project layout that drives the audit.
- [`specs/008-artifacts-reorg-questions-01.md`](specs/008-artifacts-reorg-questions-01.md) — the first clarification pass. Section A carries the spec's own open questions forward with a recommended default for each; Section B adds questions derived from reconnaissance against the real codebase. Every answer is an inline `> Decision:` in the developer's own voice, reasoning included — several answers change the plan's direction (e.g. "just remove the agent skill").
- [`specs/008-artifacts-reorg-plan.md`](specs/008-artifacts-reorg-plan.md) — the eight-phase apply sequence derived from the fully-resolved spec, opening with the concrete repo context it was checked against.
- [`specs/008-artifacts-reorg-final-review.md`](specs/008-artifacts-reorg-final-review.md) — a final implementation review against the spec plus SOLID/DRY/YAGNI/KISS heuristics. Findings are triaged must-fix / should-fix / optional, each answered with an inline `> Decision:`, and closed out with a bounded improvement cycle at the end.

## How to read these

- The **spec** defines what to build and why — constraints, non-goals, explicit risks, and a running record of resolved questions.
- The **questions** artifact captures decisions the spec was not ready to make. Notice that every `> Decision:` cites reasoning, not just an answer, and that some decisions reshape the work.
- The **plan** splits the work into phases small enough that each is a single review gate.
- The **review** (mid-plan or final) is an independent pass that produces its own durable artifact, with findings that are answered and resolved rather than lost in chat.

The numbering and `NNN-<label>-<type>` filenames are the workflow's naming convention. The full set survives across sessions, models, and tools — which is the entire point.
