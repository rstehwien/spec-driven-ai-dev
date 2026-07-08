# Publishing Assessment: Human-Gated Spec-Driven AI Development

## Status of recommended improvements

Items marked `[DONE]` below have been applied to the repo in this pass and are ready for review.

| # | Improvement | Status |
| --- | --- | --- |
| 1 | Re-lead README with handoff story | [DONE] |
| 2 | Write a separate publishable article | [DONE] (skeleton at `article.md`; placeholders marked for your voice) |
| 3 | Show one real, non-synthetic worked example | [DONE] (sprite-generator example under `examples/sprite-generator/` — real artifacts copied verbatim from a shipped project) |
| 4 | Position explicitly against Spec Kit | [DONE] (later expanded to four-way comparison) |
| 5 | Verify the arxiv citations | [DONE] |
| 6 | Add "When this is overkill" callout near the top | [DONE] |
| 7 | Tighten the README (20–30% cut) | [DONE] (merged the two "Why" sections, compressed cookbook prompt blocks) |
| 8 | Add a handoff illustration | [DONE] |
| 9 | Sharpen the failure modes list | [DONE] |
| 10 | Ship a starter templates directory | [DONE] |
| 11 | Normalize artifact filename references in README | [DONE] |
| 12 | Write `comparison.md` covering Spec Kit, OpenSpec, gentle-pi, and this workflow | [DONE] |
| 13 | Expand README comparison section to four-way (Spec Kit / OpenSpec / gentle-pi / this) | [DONE] |
| 14 | Acknowledge OpenSpec deltas in "What This Process Does Not Solve" | [DONE] |
| 15 | Soften the local-LLM angle in the README's handoff section | [DONE] |
| 16 | Borrow gentle-pi's proposal-question-round focus list for `generate-questions` | Pending |
| 17 | Add a formal spec-delta artifact (`NNN-<label>-spec-delta.md`) | Pending |
| 18 | Experiment with a local model on actual phases and capture lessons | Pending (author has experimented only lightly so far) |

Files changed in the overall effort across all passes:

- `README.md` — new abstract, overkill callout, sharpened failure modes, "Designed for Model and Context Handoffs" section with mermaid diagram, four-way comparison section (Spec Kit / OpenSpec / gentle-pi / this workflow) with a deeper-dive pointer to `comparison.md`, expanded "What This Process Does Not Solve" acknowledging OpenSpec deltas and gentle-pi's status engine, pointer to templates directory, merged "Why Human-Gated"/"Why Spec-Driven" sections, compressed prompt cookbook entries, labeled-form artifact filenames consistently throughout, softer framing of the frontier/local model split.
- `article.md` — publishable-article skeleton (~1,800 words) with four `[YOUR VOICE]` placeholders for personalization, drafting notes for venue and title choices.
- `comparison.md` — detailed multi-methodology comparison (~3,500 words) covering Spec Kit, OpenSpec, gentle-pi, and this workflow with axis-by-axis breakdowns, strengths, blind spots, and a decision guide.
- `templates/specs/NNN-spec.md`, `NNN-questions-01.md`, `NNN-plan.md`, `NNN-phase-01-review.md`, `NNN-phase-01-retro.md` — new files.
- `examples/sprite-generator/README.md` plus seven real artifacts under `examples/sprite-generator/specs/` (the 001 spec/plan/review set and the 008 spec/questions/plan/review set) — worked example.
- `assessment.md` — this status table plus `[DONE]` markers on each completed item and notes on each pending one.

---

## TL;DR

The project is **worth publishing**. It is not too derivative of GitHub Spec Kit or the existing crop of "spec-driven dev with Claude Code" articles. It has at least one genuinely original contribution (the durable, numbered clarification artifact with the `> Decision:` / `> Question:` convention), a clearly stated purpose that most SDD writing misses (resilience to model and context handoffs), and a shipped, working skill — not just an essay.

The work needed before publishing is positioning and packaging, not redesign. The README is a solid manual but not yet a publishable article, and the project does not currently make its strongest differentiator visible.

---

## How the landscape looks in 2026

By mid-2026, spec-driven development is a crowded category. The shape `Spec -> Plan -> Tasks -> Implement` with markdown artifacts and human approval points is now the genre, not a contribution. Anyone publishing in this space has to accept that the basic arc is shared territory.

The reference points that matter:

- **GitHub Spec Kit.** The default. Tool-coupled (slash commands, templates), broad agent support, clarification happens in chat or via slash commands rather than in a durable file.
- **AWS Kiro.** Spec-first IDE workflow, vendor-coupled.
- **DeepLearning.AI's "Spec-Driven Development with Coding Agents" short course.** Course-level treatment; legitimizes the category.
- **Heeki Park, alexop.dev, Level Up Coding, prommer.net, BCMS guide, others.** Article-level treatments. Mostly descriptive. Most do not ship a working artifact. Few have a durable clarification mechanism.

Against that field, the question is not "is this novel SDD?" — it is "what does this version do that the others do not?"

---

## What is actually original here

Reading the README and `skills/human-gated-spec-driven-ai-development/SKILL.md` end-to-end, the contributions that stand on their own:

### 1. Durable clarification as a file, not a chat exchange

`NNN-questions-YY.md` and `NNN-<label>-questions-YY.md` files are the strongest single contribution. Spec Kit does clarification through slash commands and chat. Most articles wave at "the AI will ask questions." This project makes clarification a citable, numbered, historical artifact that can be diffed, reviewed asynchronously, and reused across sessions.

The `> Decision:` / `> Question:` blockquote convention is the small concrete touch that makes the artifact actually usable: it gives the model an unambiguous signal for "fold this into the spec" versus "this is still open."

This is the thing to lead with when publishing.

### 2. Designed for model and context handoffs

This is the real motivation behind the methodology, and it is currently underexposed in the README. The artifact set — spec, questions, plan, plan checklist state, phase reviews, retros — exists so that:

- a new context can resume mid-feature without reconstructing intent from chat history,
- a new model can be swapped in for a phase that suits its strengths (long context, better reasoning, faster, cheaper),
- a fresh phase can start in a fresh context window when hallucination risk rises in a long-running session,
- frontier models can handle spec and plan generation while local models do bulk implementation, codebase reconnaissance, or grep-style research where their quality ceiling is acceptable and the privacy, cost, or speed wins matter.

The local-model split deserves to be called out specifically. With 128 GB of unified memory you can run capable but clearly sub-frontier models. The right way to use them is not to ask them to do work they cannot — it is to let a frontier model produce a high-quality spec and plan, then hand bounded, well-specified phases (or research and grep-style subtasks) to a local model for execution. That handoff is only credible if the spec, plan, acceptance criteria, and current checklist state are durable artifacts the local model can read. A chat-only workflow with a frontier model does not produce anything a local model can pick up afterward. This methodology does. This is a workflow that mixed-hardware practitioners will immediately recognize and that almost no published SDD content currently addresses.

That framing is materially different from Spec Kit's framing. Spec Kit's pitch is "structured context for your agent." This project's pitch should be "your project state survives the model." That is a stronger and more honest position, and it is the framing most practitioners will recognize from real experience with token limits, degraded long-context behavior, and the mixed frontier/local workflows that current hardware now makes practical.

It needs to move to the top of the README and become the lede of any published article.

### 3. Tool-agnostic, plain-filesystem

Works with Codex and Claude Code today. No slash-command coupling. Nothing about it is locked to a specific agent surface. The packaging is a skill plus a markdown convention. That is exactly the property that makes the handoff story credible: if the artifact set is plain markdown in `specs/`, any sufficiently capable agent can pick it up.

Spec Kit's slash-command coupling is the opposite trade-off. Both are valid; this one deserves to be named as the deliberate choice it is.

### 4. Opinionated gates with checkpoint-commit hints

Four explicit gates (working spec, plan, each phase, final) with recommended checkpoint commits between them. Spec Kit has gates but does not push the commit cadence as hard. The checkpoint-commit hint matters specifically because it makes rollback during failed phases cheap, which is again a handoff/resilience concern.

### 5. Plan checklist states including blocked

`[ ] [-] [x] [!]` with a real "blocked" state, plus the rule that blocked items must record the reason. Small but concrete. Critical for the handoff story: a new context picking up the plan needs to see not only what is done but what failed and why.

### 6. "Cite the files you checked before asking the user"

Required behavior in the skill: prefer answering questions from the repository before asking the user, and when asking the user, cite the local files that did not resolve the question. This is a quietly important rule. It changes the failure mode from "the model asks the user everything" to "the model uses the codebase first, the user is the last resort." Most published SDD content does not say this explicitly.

### 7. The shipped skill

`skills/human-gated-spec-driven-ai-development/SKILL.md` is a real artifact. Stage commands, label-propagation rule, output behavior, reconnaissance behavior, all specified. Many SDD articles describe a process. This one ships a process you can install. That is itself a differentiator.

---

## Where it overlaps with prior art (and that is fine)

Shared with Spec Kit, Kiro, DeepLearning.AI, and most published articles:

- Spec / Plan / Phased implementation arc
- Markdown artifacts with numeric prefixes
- Human approval points
- TDD discipline as a recommended default
- Acceptance criteria attached to phases or tasks

These are the cost of entry for the category. They are not derivative — they are the genre. The project does not need to defend them, only the things it does on top of them.

---

## Why native planning modes do not close this gap

The strongest version of the "this will be obsolete soon" objection is that recent Claude Code, Codex, and Antigravity releases ship more capable planning modes that do ask clarifying questions and structure work before implementing. That is a real change worth taking seriously, and it does not close the gap this methodology addresses.

Two things those native planning modes do not do, unless specifically prompted:

1. **They do not produce durable, named artifacts that outlast the session.** The plan and the clarification questions live in the chat or in an ephemeral planning surface. When the session ends, the context resets, or the user switches to a different agent or model, that state is gone. There is nothing to hand off.

2. **Their clarification is chat-shaped, not file-shaped.** Questions are asked inline; answers are interleaved with other conversation; the trail is not citable, diffable, or reviewable asynchronously. It does not survive a context window flush, and it cannot be picked up by a second model that did not participate in the original conversation.

The gap is not "planning" — planning is increasingly handled well by every major agent. The gap is **persistence and portability of planning state**. As long as native planning modes default to chat-resident state, a methodology that puts spec, questions, plan, and checklist state into named files in `specs/` remains complementary rather than redundant.

A useful framing for the article: "Modern agents plan well within a session. This methodology is about what happens between sessions, between models, and between humans."

If and when native planning modes start emitting durable, named, agent-portable artifacts by default, this methodology's relative advantage shrinks. Even then, the specific choices it makes — the numbered clarification artifact with `> Decision:` / `> Question:`, the four explicit gates, the checklist-blocked state, the label-propagation rule — are the kind of opinionated conventions that emerge from real practice and that vendor defaults are unlikely to standardize on quickly.

---

## What to improve before publishing

These are the changes that would meaningfully raise originality and reception, in priority order.

### High-impact

1. **[DONE] Re-lead the README with the handoff story.** The current "Abstract" frames this as a control/quality discipline. The stronger and more accurate frame is operational: your project state survives token limits, context resets, and model swaps because it lives in files, not chat. Move that to the top. Make it the first paragraph. Make the rest of the methodology a consequence of that goal.
   - Abstract rewritten to lead with durable, portable artifacts and the frontier/local handoff motivation.
   - "When this is overkill" callout added directly under the abstract pointing readers at the lighter version.
   - "Designed for Model and Context Handoffs" section added after "Why This Process Exists" with a mermaid handoff diagram and an explicit note that recent native planning modes do not produce durable artifacts.

2. **[DONE] Write a separate publishable article.** The README is a manual at 37KB. It is not the artifact a reader bounces off Hacker News or dev.to onto. Produce a 2,000–3,000-word piece that:
   - opens with the handoff problem (concrete scenario: running out of context mid-feature, swapping models between phases),
   - shows why chat-based SDD breaks under that pressure,
   - introduces the durable clarification artifact as the missing piece,
   - shows one real worked example,
   - links to the repo as the canonical implementation.
   - Skeleton drafted at `article.md` (~1,800 words). Lead is the four-scenario handoff hook. Spec Kit comparison and native-planning-modes objection both addressed. Worked example linked. Four `[YOUR VOICE]` placeholders mark where the piece needs a personal touch: the moment you arrived at the workflow, your local hardware and model choices, a real captured decision, and the closing call to action. Drafting notes at the end cover title options and venue cadence.

3. **[DONE] Show one real, non-synthetic worked example.** The `CSV Export for Admin Reports` example is clean but obviously constructed. One real spec + real questions artifact + real plan from a feature you actually shipped would be more persuasive than the rest of the README combined. Even a small one. The realness is the point.
   - The `examples/sprite-generator/` worked example holds real artifacts copied verbatim from a shipped RPG Maker sprite-generation project. (An earlier synthetic `image-normalizer` placeholder was replaced with these once the real project's specs were available — the whole point of this item was *non-synthetic*.) Two complete sets: the 001 helper-scripts set (spec / plan / code-review) and the 008 artifacts-reorg set (spec / questions-01 / plan / final-review). The 008 questions artifact shows a real clarification round with `> Decision:` answers in the developer's own voice, several of which redirect the plan.

4. **[DONE] Position explicitly against Spec Kit.** Currently the README does not compare itself to any specific prior art beyond a references section. For publishing, pick two or three specific differences and name them:
   - clarification as a durable file vs. clarification in chat or slash commands,
   - plain filesystem vs. tool-coupled slash commands,
   - handoff-resilience as the design goal vs. structured-context as the design goal.
   This is not picking a fight; it is letting the reader know what category of trade-off they are choosing.
   - "How This Compares to GitHub Spec Kit" section added with a four-row comparison table (surface, clarification, tool coupling, design goal) and explicit "not mutually exclusive" framing. Placed between "Choosing the Right Weight" and "Process Flow".

### Medium-impact

5. **[DONE] Verify the arxiv citations.** `arxiv.org/abs/2512.23844` and `arxiv.org/abs/2602.00180` should be checked to confirm they resolve and that the titles and authors match. Citations that look real but fail to resolve are credibility-expensive.
   - Both citations resolve correctly:
     - `2512.23844` is Dong, Sampath, Lee, Shi, Macvean, "From Correctness to Collaboration: Toward a Human-Centered Framework for Evaluating AI Agent Behavior in Software Engineering" (submitted Dec 29, 2025).
     - `2602.00180` is Piskala, "Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants" (submitted Jan 30, 2026; cs.SE / cs.AI).
   - Title and author strings in the README match the resolved pages. No change needed.

6. **[DONE] Add a short "When this is overkill" section near the top, not buried.** "Choosing the Right Weight" already exists, but readers in the publishing context need to see the disclaimer early so the methodology does not read as bureaucratic by default.
   - Added as a single-paragraph blockquote callout immediately under the abstract, with an in-page link to "Choosing the Right Weight" for the longer version.

7. **[DONE] Tighten the README.** It is repetitive in places ("Why Human-Gated Matters" and "Why Spec-Driven Matters" cover similar ground; the workflow detail and the skill prompt cookbook overlap). A 20–30% cut would improve the doc without removing anything load-bearing.
   - Merged "Why Human-Gated Matters" and "Why Spec-Driven Matters" into one tighter combined section ("What Human-Gated and Spec-Driven Each Mean"), down from ~370 words to ~190 words while preserving every load-bearing point.
   - Compressed the prompt cookbook: each of the seven stage entries dropped from three prompt forms (Most explicit / Natural / Short) to two (Canonical / Short), and the multi-bullet "Expected result" sections collapsed to single tight paragraphs that name the file produced and the next stage to run. Net: roughly 30% shorter in the cookbook with no loss of navigational value.

### Low-impact but worthwhile

8. **[DONE] Add a one-page diagram or worked-handoff illustration** that shows the same plan being picked up by a second model after the first ran out of context. The visual would do a lot of the persuasion work that prose currently has to do.
   - Mermaid handoff diagram added inside the new "Designed for Model and Context Handoffs" section. Shows frontier model producing artifacts in `specs/`, then phase implementations being picked up by frontier model, local model, and a new context — all feeding back into updated plan checklist state and developer review.

9. **[DONE] Name the failure modes the methodology prevents.** "Scope drift" is mentioned. The list could be sharper: silent architectural decisions, plan staleness, lost rationale across context resets, hallucinated acceptance, etc. Each one is a moment a reader will recognize.
   - "Why This Process Exists" bullet list expanded to nine specific failure modes including silent architectural choices, state loss on model swap, hallucinations getting committed because nothing forces a fresh check, and lost rationale across context resets.

10. **[DONE] Optional: ship a starter `specs/` directory** with templates for `NNN-spec.md`, `NNN-questions-01.md`, `NNN-plan.md`. The skill describes them; shipping the templates as files makes adoption a `cp` away.
    - Created `templates/specs/` with five starter files: `NNN-spec.md`, `NNN-questions-01.md`, `NNN-plan.md`, `NNN-phase-01-review.md`, `NNN-phase-01-retro.md`. Each has an instructional blockquote at the top explaining how to use and customize it.
    - "Recommended Artifact Conventions" section now points readers at `templates/specs/` with copy-and-rename guidance.

---

## Publishing plan

The project has a shipped artifact, not just an essay. That changes the venue ranking. The strongest venues are the ones that reward tangible tools, in this order.

### Phase 1: Prepare (1–2 evenings of work)

- Rewrite the README opening to lead with the handoff story.
- Draft the standalone article (2k–3k words) with the handoff frame.
- Replace or supplement the synthetic worked example with one real artifact set.
- Verify all citations resolve.
- Add a `Comparison to GitHub Spec Kit` short section in the README (3–5 bullets).

### Phase 2: Soft launch

- **Anthropic builder community / Claude Code Discord.** Real users of the exact tools the skill targets. Low-stakes feedback, high signal. Post the repo and ask for critique before broader launch.
- **GitHub Discussions on `github/spec-kit`.** Post under "Show and tell" or "Ideas" framed as a related approach focused on durable clarification artifacts. The Spec Kit maintainers and serious users read these. High credibility, low traffic.
- **DeepLearning.AI community / course forum** for the SDD short course. You cite the course; the audience is precisely calibrated.

The goal of Phase 2 is to find the rough edges before posting anywhere with a large audience.

### Phase 3: Public launch

- **Hacker News, as a Show HN.** This is the right venue because you have a real shipped artifact, not just an article. Title roughly: `Show HN: Human-gated spec-driven AI dev — a Codex/Claude Code skill`. Body should lead with the handoff motivation in two sentences. Submit Tuesday through Thursday, 8–10am ET. One submission only; do not resubmit if it does not catch. Expect either silence or a hard, useful comment thread; both outcomes are fine.
- **r/ClaudeAI.** Strong topical fit. Post the same content, slightly less formal. This subreddit responds well to "here is a workflow I actually use" framing.
- **r/codex (or whatever the active Codex/OpenAI-coding subreddit is at the time of posting).** Same content; the skill works there too and the audience is currently underserved.
- **r/LocalLLaMA.** The frontier-plus-local split angle is a strong fit here. Frame the post around the mixed-model workflow specifically — how durable artifacts let a local 70B-class model usefully pick up bounded phases from a frontier-planned spec — rather than as a general SDD methodology piece. This subreddit responds well to concrete hardware-aware workflows.
- **r/programming or r/ExperiencedDevs** are possible but lower fit and harsher audiences. Only post there if the dev.to article version is strong enough to stand on its own without the repo.

### Phase 4: Long-tail discovery

- **dev.to.** Publish the standalone article. Cross-post to Hashnode if it is convenient. dev.to is searchable and indexes well for "spec-driven Claude Code" queries.
- **`awesome-claude-code` / `awesome-claude-skills` / `awesome-ai-agents` lists.** Submit PRs adding the repo. These drive slow but persistent traffic and improve discoverability inside the Claude/Codex ecosystem.
- **Lobsters** if you have an invite. Smaller than HN, but the comments tend to be high-quality.
- **LinkedIn.** Only if your professional network includes engineering leadership making AI-tooling decisions. Skip otherwise.

Venues to skip:

- **Twitter/X cold.** SDD content does not go viral cold.
- **Medium without dev.to syndication.** Medium is crowded with shallow SDD posts and your piece will not stand out unless syndicated and linked from somewhere else.

---

## Risk factors

These are the things most likely to draw legitimate criticism, worth pre-empting in the article:

- **"This is just Spec Kit."** Pre-empt by naming the comparison explicitly and pointing to the durable clarification artifact and the handoff motivation as the differentiators.
- **"This is bureaucratic for small work."** Pre-empt by leading with the lightweight mode visible early.
- **"There is no evidence it actually helps."** Pre-empt with one real worked example and an honest "How to Measure Whether It Helps" section. The current section exists but is generic; tighten it with the specific signals you have noticed.
- **"This is just process theater for AI."** Pre-empt by tying every gate to a concrete failure mode it prevents.
- **"Won't Claude / Codex / Antigravity native planning modes obsolete this?"** Pre-empt by pointing at the dedicated section above: native planning modes plan well within a session but do not produce durable, named, agent-portable artifacts by default. The gap is persistence and portability, not planning quality.
- **"Local models cannot do real implementation work."** Pre-empt by being honest about the split: frontier models for spec and plan, local models for bounded implementation, reconnaissance, and grep-style research. The methodology is what makes that split workable; it is not claiming local models are frontier-equivalent.

---

## Findings from the OpenSpec and gentle-pi comparison

After reading the gentle-pi sources locally at `~/.pi/agent/npm/node_modules/gentle-pi/` and the OpenSpec materials, the methodology landscape is richer than the original Spec Kit comparison captured. Several findings shape the positioning:

1. **gentle-pi reaches similar conclusions about artifact-centric work.** Its framing ("Artifacts over floating chat context") is close to the design goal of this workflow. The README now credits this explicitly rather than treating Spec Kit as the only peer.

2. **gentle-pi's clarification is chat-first by default.** The proposal question round is offered interactively; a file-based fallback exists as a section in `proposal.md`. The durable, numbered, citable `NNN-<label>-questions-YY.md` artifact in this workflow remains a real differentiator.

3. **gentle-pi is hard-coupled to Pi.** The orchestrator explicitly says *"Do not claim portability outside the Pi runtime."* This strengthens this workflow's tool-agnostic positioning rather than weakening it.

4. **OpenSpec's spec deltas (inherited by gentle-pi) are a real engineering contribution this workflow does not match.** Formal ADDED / MODIFIED / REMOVED operations with RFC 2119 keywords and Given/When/Then scenarios are more rigorous than free-form spec edits. The README now acknowledges this in "What This Process Does Not Solve" rather than ignoring it.

5. **gentle-pi's proposal question round prompt is well-engineered.** The list of ten product/business clarification themes (business problem, target users, business rules, product outcome, current-state gap, implications, edge cases, decision gaps, scope boundaries, business risk) — and the explicit prohibition on asking about harness mechanics during proposal time — is good prompt design and worth borrowing for this workflow's `generate-questions` stage.

## Pending suggestions

### 16. Borrow gentle-pi's proposal-question-round focus list for `generate-questions`

Source: `~/.pi/agent/npm/node_modules/gentle-pi/assets/agents/sdd-proposal.md` lines 17-27.

What to do: add a focus-areas reference to the `generate-questions` stage in `skills/human-gated-spec-driven-ai-development/SKILL.md`. The questions the AI generates should be biased toward product/business clarification (business problem, target users, rules, outcome, gap, implications, edge cases, decision gaps, scope, business risk) and should explicitly avoid asking about harness mechanics (test commands, PR shape, changed-line budget) during spec clarification.

Why: gentle-pi's design here is solid. Borrowing it would raise the quality of generated questions without changing the artifact convention.

Cost: small. One edit to the skill file plus possibly a `references/question-focus-areas.md` reference document.

### 17. Add a formal spec-delta artifact

Source: OpenSpec's delta format (ADDED / MODIFIED / REMOVED Requirements with RFC 2119 keywords, Given/When/Then scenarios, `(Previously: ...)`, `(Reason: ...)`, `(Migration: ...)` annotations).

What to do: introduce an optional `specs/NNN-<label>-spec-delta.md` artifact that captures what changed between approved working-spec revisions. Add a `generate-spec-delta` stage to the skill that produces it. Pair it with the existing numbered questions history so the two cover different views of spec evolution: questions record *why*, deltas record *what*.

Why: it closes a real gap versus OpenSpec/gentle-pi without rewriting the workflow. The artifact pairs naturally with the workflow's existing conventions and is a small addition.

Cost: medium. New artifact convention, new skill stage, optional template under `templates/specs/`. Documentation updates in the README's "Recommended Artifact Conventions" and a brief mention in the comparison.

Trade-off note: adopting the full OpenSpec delta format brings RFC 2119 keywords and Given/When/Then scenarios with it. That increases rigor but also raises the writing cost per change. A lighter delta format (just `ADDED` / `MODIFIED` / `REMOVED` bullets without the scenario structure) would be cheaper but less aligned with OpenSpec.

### 18. Experiment with a local model on actual phases and capture lessons

What to do: run an end-to-end cycle where a frontier model produces the spec and plan and a local model picks up at least one implementation phase or one reconnaissance task. Capture the experience honestly: what worked, what broke, what the artifacts needed to look like for the handoff to succeed, where the local model's quality ceiling actually fell.

Why: the README and article currently frame mixed-model workflows as a possibility the workflow enables rather than something the author runs daily. That framing is honest but a worked example would let the local-model angle support its own weight. r/LocalLLaMA in particular responds well to concrete hardware-aware posts; the same audience will discount theoretical "you could do X" framing.

Cost: significant — depends on the size of the example chosen. The sprite-generator worked example is one candidate, though it is large; a separate smaller example specifically aimed at a local model would also work.

Status note: the author has experimented lightly with local models but does not yet have a real worked example. The README has been softened to reflect this. gentle-pi's documented examples focus on hosted models, but Pi itself can use local models — so this is not unique to this workflow; it's a property of any file-based methodology.

## Bottom line

You have a shipped skill, a real motivating problem (model and context handoffs), at least one concrete artifact contribution (the numbered clarification file with `> Decision:` / `> Question:`), and a defensible answer to the strongest "this will be obsolete" objection (native planning modes do not produce durable, portable artifacts by default). After examining gentle-pi and OpenSpec, the positioning is sharper rather than weaker: gentle-pi reaches similar artifact-centric conclusions but is Pi-only and chat-first on clarification; OpenSpec has a formal delta semantic this workflow can borrow if you want it. The tool-agnostic plain-filesystem approach plus the durable clarification artifact remain the real differentiators.

The work between here and publishing is mostly framing: lead with the handoff story, credit gentle-pi where its conclusions overlap, acknowledge OpenSpec's delta rigor as a gap rather than pretending it doesn't matter, keep the frontier/local angle honest (a possibility the workflow enables, not a use case the author runs daily), show the worked example you have, and post it as a Show HN with cross-posts to r/ClaudeAI and r/codex. r/LocalLLaMA stays in the venue list but earns a stronger post once a real mixed-model example exists.
