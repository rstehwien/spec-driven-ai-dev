# How Human-Gated Spec-Driven AI Development Compares to Other Approaches

This is a detailed comparison of four spec-driven development methodologies for AI coding:

- **GitHub Spec Kit** — the most prominent toolkit in the space.
- **OpenSpec** — a lightweight CLI plus slash-command framework with formal spec deltas.
- **gentle-pi** — a Pi-specific harness built on top of OpenSpec with persona, orchestration, and per-agent model routing.
- **This workflow** — Human-Gated Spec-Driven AI Development, the methodology this repo describes.

The goal is to be honest. All four reach similar high-level conclusions: specs belong in files, AI should work against them, humans should approve. The differences are real but narrower than vendor pitches suggest. Picking one is mostly a question of *which trade-offs match how you actually work*.

---

## Snapshot

| Aspect | Spec Kit | OpenSpec | gentle-pi | This workflow |
| --- | --- | --- | --- | --- |
| Surface | Slash commands + templates in 30+ agents | CLI (`@fission-ai/openspec`) + slash commands in 25+ agents | Pi runtime only (explicitly non-portable) | Plain markdown files in `specs/` |
| Phase model | Spec → Plan → Tasks → Implement | Proposal → Design → Tasks → Spec deltas | init → explore → proposal → spec → design → tasks → apply → verify → sync → archive (10 phases) | Spec → Questions loop → Plan → Phases (4 gates) |
| Clarification | Chat or slash commands | Inline in proposal/design | Chat by default; file fallback as section in `proposal.md` | Durable numbered `NNN-<label>-questions-YY.md` with `> Decision:` / `> Question:` |
| Spec evolution | Edits to spec files | **Formal deltas** (ADDED / MODIFIED / REMOVED + RFC 2119 + Given/When/Then) | Inherits OpenSpec deltas; archives changes into immutable timestamped folders | Free-form edits + numbered questions history |
| Tool coupling | Built around curated agent integrations | CLI + agent slash commands | Pi-only | Agent-agnostic |
| Persona / orchestration layer | None | None | "el Gentleman" parent agent with language routing and status engine | None |
| Per-agent model routing | Not explicit | Not explicit | First-class (`/gentle:models`); per-phase model assignment | Implicit (the developer points a different model at the same files) |
| TDD discipline | Recommended | Recommended | Strict mode enforces RED → GREEN → TRIANGULATE → REFACTOR evidence | Recommended red/green; full test suite before phase done |
| Design goal | Structured context for your agent | Lightweight, brownfield-first, specs as living docs | Controlled coding harness over Pi | Project state that survives model and context handoffs |

---

## GitHub Spec Kit

**Origin.** GitHub's official open-source toolkit for spec-driven development. Reached 1.0 in 2025 and quickly became the genre reference. Most "spec-driven AI development with Claude Code" articles since then either reference Spec Kit or implicitly mirror its structure.

**Structure.** Four sequential phases: **Spec → Plan → Tasks → Implement**. Each phase produces a markdown artifact that feeds the next. Clarification happens through `/clarify`-style slash commands inside the agent; the user answers in chat and the model updates the spec.

**Surface.** Slash commands native to the agent. Spec Kit ships templates and CLI scaffolding; users invoke them through their coding agent's command interface. Listed integrations include Claude Code, GitHub Copilot, Gemini CLI, Cursor, Windsurf, Codex CLI, Qwen Code, Kiro CLI, Goose, Devin for Terminal, Roo Code, IBM Bob, Mistral Vibe, and more.

**Design goal.** *Structured context for your agent.* Reduce "regenerate from scratch" cycles by giving the model real templates and intermediate artifacts to ground on, instead of ad-hoc prompts.

**Strengths.**

- Mature templates, rich examples, broad agent integration.
- Mainstream adoption — the option that requires the least defending in a team setting.
- Polished slash-command UX inside agents that ship with Spec Kit support.

**Blind spots.**

- Clarification stays in chat or in slash-command exchanges; the trail is not separately citable.
- Spec evolution is "edit the spec file" — no formal diff semantics.
- Coupled to a curated set of agent integrations; if your agent is not on the list, you reimplement the slash commands yourself.

---

## OpenSpec

**Origin.** A more recent entry from Fission AI, positioned as the lightweight, brownfield-first alternative to Spec Kit. Installed as a Node CLI (`npm install -g @fission-ai/openspec@latest`) plus slash-command integrations in 25+ agents.

**Structure.** A change cycle produces four artifacts:

- `proposal.md` — what is changing and why.
- `design.md` — technical decisions for the change.
- `tasks.md` — implementation steps.
- **Spec deltas** — `ADDED`, `MODIFIED`, `REMOVED` operations against canonical specs in `openspec/specs/{domain}/spec.md`.

Specs themselves use RFC 2119 keywords (MUST / SHALL / SHOULD / MAY) and Given/When/Then scenarios. Modified requirements are copied verbatim, then edited, with a `(Previously: ...)` annotation. Removed requirements get `(Reason: ...)` and `(Migration: ...)` notes. At archive time, the canonical specs are merged forward.

**Surface.** CLI + slash commands. The CLI manages the change folders and OpenSpec config; slash commands inside the agent drive the actual workflow steps.

**Design goal.** *Lightweight, brownfield-first, specs as living documentation.* OpenSpec's pitch is that mature codebases need spec-driven work the most, and that ceremony has to be light enough that practitioners actually use it.

**Strengths.**

- **Formal spec delta semantics** — a real engineering contribution. Requirement changes have explicit operations and reasons, which makes review and history meaningful.
- Specs live in version control as first-class artifacts.
- Multi-session and team-collaboration aware out of the box.
- Lightweight enough that the overhead per change is bounded.

**Blind spots.**

- No durable, separate clarification artifact. Clarification is inline.
- No explicit position on model handoffs, context resets, or local-model use.
- The Node CLI + slash-command surface is more setup than a plain-files workflow.

---

## gentle-pi

**Origin.** A harness for the Pi coding agent that wraps OpenSpec with operational discipline, subagent orchestration, and per-agent model routing. Sourced from `~/.pi/agent/npm/node_modules/gentle-pi/` once installed via Pi's package system.

**Structure.** Ten-phase pipeline:

```
init → explore → proposal → spec → design → tasks → apply → verify → sync → archive
```

Each phase has its own dedicated subagent (e.g. `sdd-proposal`, `sdd-spec`, `sdd-design`). Artifacts live under `openspec/changes/{change}/`:

- `proposal.md`
- `specs/{domain}/spec.md` (delta or full)
- `design.md`
- `tasks.md`
- `apply-progress.md`
- `verify-report.md`

Completed changes are moved to `openspec/changes/archive/YYYY-MM-DD-{change}/` as immutable history.

**Distinctive layers added on top of OpenSpec:**

- **"el Gentleman" orchestrator persona** — a parent agent identity with senior-architect framing, explicit language routing (Spanish/English including Rioplatense voseo), and a clear delegation contract that distinguishes coordinator from executor.
- **Status engine** — a structured contract that resolves which phase is ready, which artifacts exist, and which unchecked tasks are next. Downstream phase agents (`sdd-apply`, `sdd-verify`, `sdd-sync`, `sdd-archive`) are forbidden from inferring readiness from prompt context.
- **Lazy SDD preflight** — once-per-session capture of four choices: execution mode (interactive vs auto), artifact store (openspec, engram, both), PR chaining strategy, review budget in changed lines.
- **Per-agent model routing** via `/gentle:models`. Different SDD phases can be assigned different models — e.g. cheap/fast for exploration, strong reasoning for design, strong coding for apply, fresh-context for verify.
- **Strict TDD mode** — when `openspec/config.yaml` declares strict TDD and a test command, apply/verify phases must record `RED → GREEN → TRIANGULATE → REFACTOR` evidence.
- **Skill registry** — `.atl/skill-registry.md` indexes project-local `SKILL.md` files; the parent orchestrator resolves which skills are relevant and passes the paths to subagents so they don't rediscover them.
- **Engram-aware** — an optional memory layer (`gentle-engram`) for persisting findings; gentle-pi works without it but takes advantage when available.

**Clarification model.** Interactive by default. From the orchestrator: *"Before sdd-proposal in interactive mode, offer the user a proposal question round instead of silently deciding whether the proposal is clear enough."* The proposal subagent itself includes a focused list of 10 product/business clarification themes (business problem, target users, business rules, product outcome, current-state gap, implications, edge cases, decision gaps, scope boundaries, business risk) and explicitly avoids asking about test commands, PR shape, or other harness mechanics during proposal time. If interactive asking is blocked, the questions and assumptions are written into a `## Proposal question round` section of `proposal.md` — a fallback, not the default path.

**Surface.** Pi runtime only. `orchestrator.md` line 20 explicitly says *"Do not claim portability outside the Pi runtime."* This is not accidental — gentle-pi takes Pi-specific concepts (`pi-subagents`, `outputMode: "file-only"`, the orchestrator/executor model) as substrate and builds the harness from there.

**Design goal.** *Turn Pi from a powerful coding agent into a controlled development harness.* Add operational discipline, safety guardrails, and per-phase model routing on top of an underlying agent that would otherwise run more freely.

**Strengths.**

- **Per-agent model routing is genuinely first-class.** Different phases can be assigned different models through configuration.
- **Strict TDD enforcement** is unique among the four — most workflows recommend TDD; gentle-pi can make it a contract.
- **The proposal question round design** is well thought out — focused on product/business clarification, explicitly excludes harness mechanics. Worth borrowing as a prompt-engineering reference.
- **Status engine + skill registry** make multi-phase orchestration safer in long projects.
- **Inherits OpenSpec's delta semantics** for free.

**Blind spots.**

- **Pi-only.** Not portable to Claude Code, Codex, or any other agent surface.
- **Heavy.** Ten phases with their own subagents, plus a status engine, plus a preflight, plus a skill registry, plus a persona — the cognitive load is real.
- **Clarification is chat-first.** The proposal question round happens interactively by default; the file-based artifact is fallback only.
- **Local-model support is configurable but not documented.** The model routing system accepts any provider string; in practice the worked examples reference hosted models.

---

## This Workflow

**Origin.** A personal workflow that grew out of repeated frustration with chat-resident state being lost when sessions ended, context windows compacted, models swapped, or agents changed.

**Structure.** Four explicit human gates:

1. Working spec approved.
2. Phased plan approved.
3. Each completed phase approved.
4. Final implementation approved.

Artifacts under `specs/`:

- `NNN-<label>-spec.md`
- `NNN-<label>-questions-YY.md` (numbered clarification history)
- `NNN-<label>-plan.md` (with `[ ] [-] [x] [!]` checklist states)
- `NNN-<label>-phase-NN-review.md` (optional)
- `NNN-<label>-phase-NN-retro.md` (optional)

**Clarification model.** Durable, numbered, file-based. The AI writes open questions into `NNN-<label>-questions-YY.md`. The developer answers them inline using a blockquote convention:

```md
> Decision:
> Yes, use bilinear resampling for the resize step.

> Question:
> Should the threshold be CLI-configurable, or only via config file?
```

`Decision` content gets folded into the spec; `Question` content stays as unresolved clarification. If clarification needs another pass, a new `NNN-<label>-questions-02.md` is created with only the still-open items. Prior question files stay as resolved history.

**Surface.** Plain markdown files in `specs/`. The supporting skill (`skills/human-gated-spec-driven-ai-development/`) maps stage commands onto natural-language invocations but is not required — any agent that can read and write files can follow the convention manually.

**Design goal.** *Project state that survives model and context handoffs.* The reason artifacts are durable, named, and portable is so that a new context — same model, different model, or different agent — can pick up the work by reading the files. Model and context handoffs are the design constraint that drives every other decision.

**Strengths.**

- **Durable, citable, asynchronous clarification.** The numbered questions file with `> Decision:` / `> Question:` is the strongest single contribution. Neither Spec Kit nor OpenSpec nor gentle-pi has a direct equivalent (gentle-pi has the *idea* in fallback mode; this workflow makes it the default).
- **Tool-agnostic.** Works with Claude Code, Codex, and anything else that can read and write markdown.
- **Light.** Four gates, no harness, no orchestrator, no preflight. The artifact set is the methodology.
- **File-based state enables model handoffs.** If you want to run some phases on a local model and others on a frontier model, the artifacts make that practical — though this is a possibility the workflow keeps open, not a primary workflow the author runs all the time.

**Blind spots.**

- **No formal spec delta semantics.** Spec evolution is implicit through edits + questions history. OpenSpec's ADDED / MODIFIED / REMOVED model is more rigorous and not provided here.
- **No status engine.** Tracking what phase is ready depends on the developer reading the plan; no automated state machine.
- **No per-session preflight or persona layer.** gentle-pi captures more about how the developer wants to work; this workflow assumes you'll just tell the agent what to do.
- **No skill registry or auto-discovery.** The supporting skill is one file; gentle-pi's skill registry indexes many.

---

## Comparison by axis

### Surface

| Surface | Methodologies |
| --- | --- |
| Plain markdown files only | This workflow |
| CLI + slash commands | OpenSpec |
| Slash commands inside curated agents | Spec Kit |
| Agent-specific runtime harness | gentle-pi |

The trade-off is portability versus polish. This workflow is the most portable and the least polished. Spec Kit and OpenSpec sit in the middle. gentle-pi is the most polished within Pi and explicitly non-portable outside it.

### Phase model

| Workflow | Phase count | Phase boundaries |
| --- | --- | --- |
| Spec Kit | 4 | Spec → Plan → Tasks → Implement |
| OpenSpec | 4 | Proposal → Design → Tasks → Deltas |
| gentle-pi | 10 | init → explore → proposal → spec → design → tasks → apply → verify → sync → archive |
| This workflow | 4 gates | Working spec → Plan → Each phase → Final |

Phase count is a rough proxy for ceremony. gentle-pi is the heaviest; the other three are similar. The difference is that this workflow's "each phase" gate is repeated per implementation phase, so the actual number of human review points scales with the size of the work — typically more than Spec Kit's four-phase model.

### Clarification

| Workflow | Clarification mechanism |
| --- | --- |
| Spec Kit | Chat / slash commands |
| OpenSpec | Inline in proposal and design docs |
| gentle-pi | Chat by default; file-based fallback as a `## Proposal question round` section inside `proposal.md` |
| This workflow | Dedicated numbered file `NNN-<label>-questions-YY.md` with `> Decision:` / `> Question:` blockquote labels |

This is the largest single difference between this workflow and the other three. Even gentle-pi, which has the most thought-out clarification prompt (the ten focus areas in `sdd-proposal.md`), defaults to chat and only writes a file when interactive asking is blocked.

### Spec evolution

| Workflow | Spec evolution |
| --- | --- |
| Spec Kit | Edits to the spec file |
| OpenSpec | **Formal deltas**: ADDED / MODIFIED / REMOVED requirements with RFC 2119 keywords, Given/When/Then scenarios, and `(Previously: ...)` / `(Reason: ...)` / `(Migration: ...)` annotations |
| gentle-pi | Inherits OpenSpec deltas; archives entire change folders into immutable timestamped folders at completion |
| This workflow | Free-form edits to the working spec; durable numbered questions history records *why* the spec evolved |

OpenSpec's deltas are a real engineering contribution that this workflow does not match. The questions history captures a different kind of evolution — the rationale for changes — but not the structural diff. The two are complementary, not equivalent.

### Persona and orchestration

| Workflow | Persona / orchestration |
| --- | --- |
| Spec Kit | None |
| OpenSpec | None |
| gentle-pi | "el Gentleman" parent agent with explicit identity contract, language routing (Spanish/English with regional voseo support), status engine, work routing ladder, mandatory delegation triggers |
| This workflow | None |

gentle-pi is the outlier. The persona layer is structurally meaningful — it changes how subagent prompts are written, how language is routed for user-facing vs. technical artifacts, and how delegation decisions are made. The other three methodologies leave persona and orchestration to whoever is using them.

### Per-agent model routing

| Workflow | Per-agent model routing |
| --- | --- |
| Spec Kit | Not explicit |
| OpenSpec | Not explicit |
| gentle-pi | First-class via `/gentle:models` — each SDD phase can be assigned a different model with its own thinking-mode configuration |
| This workflow | Implicit — the developer points a different model at the same files when desired |

gentle-pi has built the machinery. This workflow makes the same handoff possible by virtue of artifacts being durable and portable, but does not provide the routing config. Spec Kit and OpenSpec don't address this directly.

### TDD discipline

| Workflow | TDD treatment |
| --- | --- |
| Spec Kit | Recommended |
| OpenSpec | Recommended |
| gentle-pi | **Enforceable** via `openspec/config.yaml`. Strict mode requires apply/verify phases to record RED → GREEN → TRIANGULATE → REFACTOR evidence |
| This workflow | Recommended red/green; full project test suite before declaring a phase done |

gentle-pi is the only one of the four that turns TDD into a contract rather than a suggestion.

### Design goal

| Workflow | Stated goal |
| --- | --- |
| Spec Kit | Structured context for your agent |
| OpenSpec | Lightweight, brownfield-first, specs as living documentation |
| gentle-pi | Turn a powerful coding agent into a controlled development harness |
| This workflow | Project state that survives model and context handoffs |

All four are coherent. The differences in goal explain most of the differences in mechanism.

---

## What each does best

- **Spec Kit** is best when you want a polished, mainstream, slash-command experience inside a Spec Kit-supported agent and you do not need to defend the choice to a team.
- **OpenSpec** is best when formal requirement evolution matters — diffable specs, ADDED / MODIFIED / REMOVED semantics, RFC 2119 keywords, Given/When/Then scenarios. It is also a good middle weight if Spec Kit feels too coupled and this workflow feels too manual.
- **gentle-pi** is best when you are already running Pi, want strict TDD enforcement, want per-agent model routing as a first-class feature, or want a harness with explicit safety guards and a status engine. It is the heaviest option and Pi-only.
- **This workflow** is best when you want durable, portable artifacts you can hand off across sessions, models, and agents, when clarification deserves to be a citable historical artifact rather than chat, and when you want the lightest possible surface — plain files, no harness, no CLI.

---

## What each could learn from the others

- **From OpenSpec / gentle-pi to this workflow:** formal spec delta semantics. A `NNN-<label>-spec-delta.md` artifact would close a real gap and is a small addition.
- **From gentle-pi to this workflow:** the proposal question round's focused list of ten product/business clarification themes is good prompt engineering. Borrowing it as a `generate-questions` reference would improve the quality of generated questions without changing the artifact convention.
- **From gentle-pi to OpenSpec and Spec Kit:** per-agent model routing as a first-class feature. The infrastructure exists; the documentation could lead with mixed-model workflows.
- **From this workflow to all three:** treating clarification as a durable, citable, numbered artifact instead of a chat exchange or an inline section in the proposal.

---

## How to choose

A rough decision tree:

1. **Do you want to stay inside one agent and not think about it?** → Spec Kit.
2. **Do you care about formal requirement evolution and diffable specs?** → OpenSpec.
3. **Are you using Pi and want a controlled harness with model routing and strict TDD?** → gentle-pi.
4. **Do you want durable artifacts you can hand off across sessions, models, or agents, with the least possible tooling commitment?** → This workflow.

These are not mutually exclusive. The artifact conventions in this workflow can be adopted alongside Spec Kit's templates. OpenSpec's delta format can be adopted alongside this workflow's questions history. gentle-pi is the most opinionated and the most coupled — if you adopt it, you adopt most of the others through it.

---

## A note on what this comparison is not

This is a comparison of methodologies, not of agents or vendors. All four can be used with multiple AI coding agents (gentle-pi excepted, by its own statement). All four are open-source or freely available. All four are evolving — what is documented here reflects what was visible at the time of writing, and the field is moving quickly.

If you spot something wrong in this comparison, the right move is to open an issue against the repo. The goal is to be accurate, not to win.
