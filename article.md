# Project state belongs in files, not chat

> Skeleton draft. About 1,800 words at this length. Sections marked with `[YOUR VOICE]` are where my draft is generic and your specific experience would make the piece better. Cut anything that does not sound like you. Add the things I left out.

---

## The scenario

You are six hours into a feature with a coding agent. You started clean: a small chat-mode plan, a few clarifying exchanges, then implementation. The model is mostly doing the work; you are reviewing and steering.

Now one of these things happens:

- The session runs out of context, or the agent compacts it and important detail is gone.
- The agent starts hallucinating — confidently editing files that do not exist, citing functions you do not have, asserting tests pass when they do not.
- You realize the next phase would be easier with a different model. Maybe a longer context window, maybe a model that handles the specific framework better, maybe a cheaper model for the bulk grunt work.
- You want to hand the next phase to a local model running on your own hardware to save API spend, keep the code off a third-party server, or just because you can.

In all four cases you are in the same position: most of the useful state from the last six hours lives in chat, and the chat is either gone, degraded, or stuck to one model.

You can start over. You can paste the chat history into a new session. You can try to summarize what the agent decided. None of those are good.

This is the failure mode that pushed me to a different workflow.

## What I do

I write a short spec in a markdown file. The AI reads it and either asks me clarifying questions (in a numbered markdown file, not in chat) or generates a plan. I review the plan. The AI implements one phase at a time, updates the plan checklist as it goes, and pauses for me to review at each phase boundary.

The whole project state lives in files under `specs/`:

```
specs/
  001-feature-spec.md
  001-feature-questions-01.md
  001-feature-plan.md
  001-feature-phase-01-review.md
  001-feature-phase-01-retro.md
```

That layout is the whole point. The spec defines what to build. The questions file captures the clarifications I had to make and why. The plan defines the phases and tracks the current checklist state. The phase review and retro record the approved outcome of each phase.

When the session ends, the next session — same model or different, same agent or different, same machine or different — picks up by reading those files. There is no need to reconstruct intent from chat history. The intent is on disk.

[YOUR VOICE: one paragraph here about how you actually arrived at this. Was it a specific bad session? A pattern that recurred? Be specific. The piece needs one moment that grounds it in your own work.]

## The single most important choice

The choice that everything else falls out of is: **project state lives in files, not in chat**.

That sounds obvious until you watch how most agentic coding sessions actually work. Modern Claude Code, Codex, and Antigravity have real planning modes. They ask clarifying questions before they implement. They sequence work. They track progress within the session.

But the plans, the questions, and the answers stay in chat. They survive the current session and that is it. When the context window fills, when the user opens a new window, when a different model would do better on the next phase — that state is gone or stuck.

The fix is small in concept and large in consequence: put the plan and the clarifications in named files. The agent reads them at the start of each phase, updates them as work progresses, and the developer reviews them at gates.

Once you accept that constraint, four things become possible that chat-based workflows do not support.

## The four handoff scenarios

**Resume across sessions.** Open a new window with the same model. Point it at `specs/001-feature-spec.md` and `specs/001-feature-plan.md` and ask it to continue from the next incomplete phase. It can, because the plan tracks which checklist items are done, in progress, blocked, or not started.

**Swap models between phases.** Phase 02 is a tricky refactor that benefits from a stronger reasoning model. Phase 03 is mechanical and a cheaper, faster model would be fine. With chat-only state, swapping mid-feature means losing context. With file-based state, the second model reads the same artifacts.

**Recover from degraded long-context behavior.** Even with very long context windows, agents lose track late in a session. Hallucinations creep in. Tool calls miss obvious files. The fix is a fresh context. Without durable artifacts, "fresh context" means starting over. With them, it means a new session pointing at the current artifact state.

**Split frontier and local models.** This is the one I cared about most. Frontier models do clarification and planning, where the reasoning quality matters. Local models — running on whatever hardware I have — do bounded phases of implementation, codebase reconnaissance, grep-style research. The local models are not frontier-quality. They do not need to be. They are picking up a well-specified phase from a plan that was itself produced by a stronger model. The spec, the plan, and the checklist state are the contract between them.

[YOUR VOICE: mention your actual local hardware and which models you use. Be specific about which jobs you send to local models vs frontier models. Readers on the same hardware will care a lot about this paragraph.]

## The clarification artifact

The single piece of this workflow I am most opinionated about is the questions file.

Most "spec-driven development" treatments handle clarification through chat. The agent reads the spec, asks questions, the user answers, the agent revises. That works for a single session. It does not survive any of the handoffs above.

I capture clarification in a numbered markdown file, `NNN-questions-YY.md`. The agent writes the open questions there. I answer them with blockquote labels:

```md
> Decision:
> Yes, use bilinear resampling for the resize step.

> Question:
> Should the threshold be CLI-configurable, or only via config file?
```

The agent then folds answers labeled `Decision` into the spec and treats `Question` content as still-open. If clarification needs another pass, the agent creates `NNN-questions-02.md` with only the still-unresolved items.

What this gets me:

- A citable record of every clarification I made and why.
- A second model can read that record and have the same understanding I do.
- I can answer questions on my own time, not in chat. I can leave the file open in my editor, think, edit my answer, and run the next stage when I am ready.
- Six months from now, when I do not remember why we chose bilinear over bicubic, the answer is in the file.

[YOUR VOICE: one example here of a real decision you captured this way that you would have lost otherwise. Even a small one. The realness is what makes this section persuasive.]

## A worked example

There is a worked example in the repo at [`examples/sprite-generator/`](./examples/sprite-generator/) — real artifacts, copied verbatim from a project that built an RPG Maker sprite-generation toolchain with this workflow. Two complete sets are included, chosen to show the workflow at two points in a project's life.

The **001 set** is the project's first spec — the deterministic helper scripts. It is the most approachable because it is self-contained:

- `001-helpers-spec.md` — the initial spec, with explicit non-goals, risks, and a running record of resolved open questions.
- `001-helpers-plan.md` — a phased, checklist-driven plan where each phase's exit criteria gate the next.
- `001-helpers-review.md` — an independent code review with severity-ranked, evidence-backed findings and a resolution update.

The **008 set** is a mid-project spec that reorganizes the artifacts layout, and it adds the clarification artifact the workflow centers on:

- `008-artifacts-reorg-spec.md`, `008-artifacts-reorg-plan.md`, `008-artifacts-reorg-final-review.md` — the same spec → plan → review arc, now with project history behind it.
- `008-artifacts-reorg-questions-01.md` — a real clarification pass with `> Decision:` answers in the developer's own voice, showing the reasoning, not just the answer. Some decisions change the plan's direction.

Because these are real, a few in-artifact links point at files in the source project that don't resolve inside the example directory. That is the honest cost of using real artifacts instead of a toy: what you see is exactly what the workflow produced.

## How this compares to other approaches

The closest comparison is GitHub Spec Kit. It is the most prominent toolkit in this space. The methodologies share the high-level arc: spec, plan, phased implementation, markdown artifacts.

The differences are deliberate trade-offs:

- **Surface.** Spec Kit is slash commands and templates inside the agent. This workflow is plain markdown files in `specs/`.
- **Clarification.** Spec Kit clarifies through chat or slash commands. This workflow clarifies in numbered files with `> Decision:` / `> Question:` blockquotes.
- **Tool coupling.** Spec Kit is built around a curated set of agent integrations. This workflow is agent-agnostic — anything that can read and write files can use it.
- **Design goal.** Spec Kit's pitch is "structured context for your agent." Mine is "project state that survives model and context handoffs."

If you want a polished, slash-command-driven SDD experience inside one agent, Spec Kit is the right choice. If you want durable artifacts you can hand off across sessions and models, this is probably closer to what you want. They are not mutually exclusive — Spec Kit's templates and this workflow's clarification artifact work together.

The "native planning modes are getting good" objection deserves an answer too. They are. Claude, Codex, and Antigravity all have capable planning modes that ask clarifying questions and structure work. They plan well *within* a session. The gap I care about is not planning quality. It is persistence and portability of planning state — and that is what is still missing from native modes unless you explicitly prompt them to emit durable artifacts.

[YOUR VOICE: one sentence here about your honest take on Spec Kit. You can be respectful and still pick a side.]

## What this does not solve

A workflow does not replace judgment.

- It will not save you from a weak product spec. If the spec is wrong, the plan is wrong, and the implementation is wrong on schedule.
- It will not protect you from under-skilled reviewers. The gates only work if the human reviewing actually understands what is being approved.
- It is overhead for tiny work. A one-line fix does not need a spec and a plan. There is a lightweight version of the workflow for small tasks; even that is overhead a five-line patch does not need.
- It does not make AI code correct. Tests do that. The workflow makes it easier to run tests at the right moments and to record the result, but it does not generate the tests.

[YOUR VOICE: anything you have actually tried that did not work, or anywhere the workflow failed you. This section is more persuasive when it is specific.]

## Try it

The repo is at [github.com/rstehwien/spec-driven-ai-dev](https://github.com/rstehwien/spec-driven-ai-dev). It includes:

- The README, which is the long-form manual.
- A working skill that maps the workflow onto stage commands you can invoke from Claude Code or Codex.
- Starter templates under [`templates/specs/`](./templates/specs/) so you can copy-and-rename to get started.
- The worked example mentioned above.

I am not a professional writer. I am a software engineer who built a workflow that works for me and decided to share it. It may not work for you. I would genuinely like to hear what breaks when you try it, what you change, or what you find unnecessary. The point of putting this out there is to find out what other practitioners do with the same problem.

[YOUR VOICE: closing paragraph in your own words. Suggest specific things you would like feedback on. Mention how to reach you. Optional: link to where you will be cross-posting.]

---

## Drafting notes

These are notes for me as the author, not for publication. Delete this section before posting.

- Target venue order: Show HN first (you have a shipped artifact), then r/ClaudeAI and r/codex, then r/LocalLLaMA framed around the frontier+local split, then dev.to as the indexed long-form version.
- Length is about 1,800 words. Probably right for HN and dev.to. Could trim by ~400 for r/ClaudeAI if you want a shorter Reddit version.
- Keep the title concrete and specific. "Project state belongs in files, not chat" is one option. Others to consider: "Spec-driven AI dev with durable artifacts", "How I keep AI project state from dissolving when the session ends".
- The four placeholders are the places this skeleton most needs your voice. Without them the piece will read like generic SDD content. With them it reads like your actual experience.
- For the local-model paragraph in particular, name your hardware and the specific local models you use. That detail is what makes the r/LocalLLaMA crowd take it seriously.
- Consider adding one screenshot or asciinema clip of the workflow in action. Optional, but it raises engagement on Reddit and HN.
