# Speaker notes — Gridsweep

Presenter-only. Everything you need to run the live demo is in this file.

**Do not put this file in the workspace you open in VS Code during the demo.** It
names every gap the spec is designed to expose.

The exercise: hand an agent a deliberately incomplete spec for a minesweeper
variant, run it through the gates in front of the room, and let the clarification
round surface a requirement nobody wrote down.

Budget 30 minutes.

The whole cycle has already been run once, and the result — spec, questions,
plan, five phases, final review, two improvement passes, a retro, and every
prompt that produced them — is committed at
[`examples/gridsweep/`](../../examples/gridsweep/). Read
[its README](../../examples/gridsweep/README.md) before you present. It tells you
what the agent actually asks, what it gets right without asking, and where the
run went long.

That same run is also replayable as a page: open
[`001-gridsweep-replay.html`](001-gridsweep-replay.html) next to these notes. It
plays each of the fourteen turns — prompt, agent, files changed, what the game
looked like — and then **stops**, so you can read the real diff, play the actual
game as it stood at that commit, or open the commit on GitHub before moving on.
Use it as a warm-up before the live demo, or as the fallback if the live run
stalls; **Auto-advance** turns it back into a hands-off video. It carries its own
per-turn presenter notes under `N`, and it is labelled on screen as a
reconstruction, which is what it is: the prompts, commits, diffs and screenshots
are real, the pacing and the tool lines are not. See
[its README](README.md) — the page needs the `replay/` folder next to it.

---

## Before the talk

### The spec to hand out

The starting spec — the 49-line version, before any question was folded into it
— is right next to these notes:

```
presentations/001-gridsweep/001-gridsweep-spec.md           <- copy this
presentations/001-gridsweep/001-gridsweep-speaker-notes.md  <- this file, keep it out
```

**Do not use `examples/gridsweep/specs/001-gridsweep-spec.md`.** That one is the
finished, folded spec with every answer already in it. Handing the agent that
version skips the entire demo.

### Workspace setup

Copy the spec into a throwaway workspace. Run this from the root of
`spec-driven-ai-dev`:

```sh
mkdir -p ~/gridsweep-demo/specs
cp presentations/001-gridsweep/001-gridsweep-spec.md ~/gridsweep-demo/specs/
cd ~/gridsweep-demo
git init
git add -A && git commit -m "Gridsweep spec"
```

That workspace is what you open in VS Code. One commit, containing nothing but
the spec.

**Do not run the demo from `spec-driven-ai-dev`.** A finished implementation, a
retro that explains every planted gap, and these notes are all in that repo. The
agent will find them.

The process itself isn't in the workspace either — it's the
`human-gated-spec-driven-ai-development` skill, installed globally on your
machine by `deploy.sh` from this repo, so it's available in every workspace
including the throwaway one.

Delete the workspace afterwards. Its artifacts are disposable; the ones worth
keeping are already committed.

### Keeping the agent from reading ahead

A branch is not a hiding place. Agents run `git log`, `git branch -a`, `git show`
and `git grep` without being asked. `.gitignore` doesn't help either — ignored
files are still on disk and still readable.

The only control that holds is **filesystem scope**. Copilot's agent mode is
bounded by the folder open in VS Code, so anything outside that folder is
genuinely out of reach — which is the whole reason the demo workspace lives away
from `spec-driven-ai-dev` rather than inside it.

The same applies to these notes. Keep them on a second screen or on paper, never
in the workspace.

For Copilot Business/Enterprise there's also repository-level content exclusion
configured in GitHub settings. It's a real control but the wrong tool here: it's
org-admin configuration, it doesn't travel to a fork, and it won't help anyone
who tries this exercise on their own afterwards.

### The model already knows minesweeper

You cannot prevent that, so don't try. Two reasons it doesn't matter:

- **The demo is about process, not novelty.** Nobody in the room believes an AI
  can't figure out minesweeper. What they're watching is whether the decisions
  get written down before the code, and whether a human approved them.
- **The spec deviates from canon on purpose.** Fixed board, no random
  generation, no chording, no timer. Prior knowledge becomes a liability — if the
  agent pattern-matches to the familiar version it produces something that fails
  the spec, and catching that is the demonstration.

### VS Code + Copilot

Verify against current VS Code docs; this surface changes often.

1. The process is the `human-gated-spec-driven-ai-development` skill, not a set
   of prompt files you paste into the workspace. Install it once with
   `deploy.sh` — it symlinks the skill into `~/.claude` and `~/.agents`, which
   Copilot reads — and it's then available in every workspace, the throwaway demo
   one included. The skill carries every gate rule (no code before the plan is
   approved, no git, one phase at a time, questions go to files rather than
   chat), so there's nothing else to wire up — just confirm Copilot can see the
   skill before you start.
2. Open **Copilot Chat in Agent mode**, not Ask mode. Ask mode won't create files
   or run the test command, and the room needs to see both happen.
3. Pre-approve the terminal tool for `node`, so the implementation gate doesn't
   stall on a permission dialog at the worst possible moment.
4. Pin the spec explicitly with `#file:specs/001-gridsweep-spec.md` in the first
   prompt. Don't rely on implicit context discovery in front of an audience.

Keep these notes on your laptop screen and VS Code on the projector. Check the
mirroring before you start — the whole demo is reading files on screen, and a
projector showing your notes instead of the editor ends the talk early.

---

## The opening prompt

This is the one that starts everything. Agent mode, spec pinned:

```
Use the human-gated-spec-driven-ai-development skill to review-spec for
#file:specs/001-gridsweep-spec.md.
```

That is the whole prompt — the plain skill invocation, nothing appended. Say so
while you type it. Part of the argument is that a bare stage invocation is
enough; if you steer the agent toward the gap, the room can reasonably wonder
whether you planted the answer.

The skill reviews for ambiguity, gaps, and risks, then — because this spec is
deliberately incomplete — writes numbered questions to
`specs/001-gridsweep-questions-01.md`, each with why it matters and a proposed
fallback default.

In the recorded run this exact prompt produced **fifteen questions across five
must-answer topics, and the first topic was the win condition.** It surfaces
unprompted. Run it privately at least once anyway, so you know what the room is
about to see.

If you'd rather guarantee the questions artifact than let the skill choose
between questions and a plan, invoke `generate-questions` instead of
`review-spec`.

Open the questions file on the projector and read two of them aloud before
answering anything. **The audience should see the AI's questions in a file, not
in a chat pane.** That is the single most important image in the talk.

### If the win condition somehow doesn't come up

```
Walk me through what happens if I reveal every cell that isn't a mine. What state
is the game in, according to the spec?
```

Let it discover the hole itself. Much better on stage than you announcing it.

---

## The board

```
. . . . . . . .        row 1
. . . . . . * .        row 2
. * . . * . . .        row 3
. . . . . . * .        row 4
. * . . . . . *        row 5
. . . * . . . .        row 6
. . . . . * . .        row 7
* . . * . . . .        row 8
```

Ten mines. Fifty-four safe cells. Adjacent counts across the top two rows are
`0 0 0 0 0 1 1 1` and `1 1 1 1 1 2 · 1`.

Top-left is a zero cell, which is what makes the cascade demo work.

---

## The two gaps that matter

### 1. The spec never says how you win

Read the Acceptance Criteria aloud, slowly. It states exactly how you lose. It
says nothing whatsoever about winning.

Put both candidates to the room and take a show of hands:

> **(a)** You win when every safe cell has been revealed.
> **(b)** You win when every mine has been correctly marked.

They are not equivalent, and whichever gets said first sounds obviously right.
Under (a) you can win having placed no marks at all — 54 cells revealed, zero
flags, game over, you win. Under (b) you can win with most of the board still
hidden. Real minesweeper uses (a); marks are a note-taking aid with no bearing on
the outcome, which surprises plenty of people who've played it for twenty years.

This is a **missing acceptance criterion**, not an edge case. An attentive human
reviewer would have caught it. Nobody did. That's the whole argument.

A split room is the best possible outcome here. If everyone votes the same way,
say so and point out that unanimity in the room is not the same as it being
written down.

### 2. "Also reveals its neighbours" — and then what?

The spec says a zero-count cell reveals its neighbours. It never says whether
those neighbours do the same.

Concrete, checkable, and dramatic on a projector:

> **Reveal the top-left cell.**
> Non-recursive reading: **4 cells** open.
> Recursive reading: **12 cells** open.

The correct behaviour opens the zero region across the top plus its numbered
border — the first six cells of row 1 and the first six of row 2, twelve in
total, no mine among them. Zero cells keep expanding; numbered cells are revealed
but stop the cascade there.

**Know this before you go on stage: in the recorded run the agent never asked.**
It assumed the recursive reading, silently, and it was right. Plan for that
outcome — see the fallback under "Ask before you approve the first phase" below.

---

## Everything else that's planted

| # | Gap | Notes |
|---|-----|-------|
| 1 | Win condition | Above. The headline. Surfaced as question topic 1. |
| 2 | Cascade recursion | Above. Not asked in the recorded run — assumed correctly. |
| 3 | How do you mark with a keyboard? | The spec demands keyboard-only play and a marking action. Right-click has no keyboard equivalent, and a 2D grid needs arrow navigation plus a focus model. Real work, real accessibility question. |
| 4 | Can a marked cell be revealed? | Most implementations block it. Spec doesn't say. Also: can you unmark? Is there a third "maybe" state? |
| 5 | What happens on a loss? | Reveal all mines? Highlight the one you hit? Show which marks were wrong? Nothing at all? Four different games. |
| 6 | Is there a mine counter? | Ten mines exist. Does the player see how many remain unmarked? Does marking decrement it? Not stated. |
| 7 | Test harness vs "no build step" | See below. |
| 8 | The board is in the source | A sharp attendee will point out the player can read the answer in devtools. Correct. Good instinct, wrong project — say so, then note that "is this a non-goal or a defect?" is exactly what the spec should have settled. |

You want 1 and 3 to surface. Both did in the recorded run.

---

## Why the fixed board is doing work

The Non-Goals rule out random generation on purpose. Randomness would drag in
seeding and first-click-safety — two genuinely interesting problems that would
eat the whole slot and teach nothing about the process.

Say this out loud when you reach the Non-Goals section. It's right-sizing in
miniature: **the spec cut scope before the AI could spend an hour on it.** If
someone asks "wouldn't a real game need random boards?", the answer is yes, and
that's feature 002.

The fixed board also makes every test deterministic with no test-double
machinery, which is why the first phase can be genuinely green in a few minutes.

---

## The test harness question

The spec requires automated tests a reviewer can watch pass, and it requires no
build step. These are in tension, and the tension is planted deliberately.

In the recorded run the agent resolved it the right way, and unprompted: logic in
`board.js` with no DOM, loaded by `index.html` as a classic script that assigns
to a global, with a CommonJS tail so `node --test` can `require` the same file.
No install, no config, no bundler. Watching a testability constraint reshape the
file layout is a better argument for the process than any slide — so let the
agent propose it rather than pre-deciding.

### One trap worth knowing about in advance

If the agent reaches for `<script type="module">` and a relative `import`, that
combination is **blocked under `file://`**. A spec that says "open it in a
browser" therefore rules out ES modules unless you add a server, which the
constraints also rule out.

The fix is the classic-script-plus-global shape above. Don't pre-empt it — the
failure is instant and legible in the console, and an agent hitting it and
recovering is a good thirty seconds of demo. Just know the answer so you can
steer if it flails.

### If someone asks what this cost

They will, and the honest answer is in the retro. Test and tooling code ended up
outweighing shipped code **2.2 : 1**, and roughly 800 lines exist purely as
substitutes for standard tooling — including a hand-written 416-line Chrome
DevTools Protocol driver, because "no dependencies" was read as applying to
development too.

The retro's verdict is worth quoting: *"the artifact ships with no build step"*
is a real delivery constraint that held perfectly; *"therefore the project has no
dev dependencies"* does not follow, and nobody noticed the two were separable
because they arrived in the same bullet of the same spec section. Full argument:
[Was the no-`package.json` approach right?](../../examples/gridsweep/specs/001-gridsweep-retro.md#was-the-no-packagejson-approach-right)

---

## Running the rest of the stages

Each beat is one skill stage. You invoke a stage by naming the skill and the
stage in plain language; the skill already enforces the gate rules, writes
numbered files into `specs/`, and stops at each gate, so you don't hand-roll
"don't write code" instructions into every prompt. Agent mode, not Ask mode.

Every prompt below is the one actually used, verbatim, in
[`examples/gridsweep/prompts.md`](../../examples/gridsweep/prompts.md) — with the
commit each one produced.

### Answer live, then fold in

Answer in the questions file, in the editor, on the projector. `> Decision:` for
answers; leave anything you're punting as `> Question:` — the skill reads exactly
these blockquote labels.

Take the vote on the win condition before you write it down.

```
Use the human-gated-spec-driven-ai-development skill to fold-questions from
001-gridsweep-questions-01.md into 001-gridsweep-spec.md
```

The skill folds every `> Decision:` into the spec, keeps the answered questions
file as history, and carries anything still marked `> Question:` into
`specs/001-gridsweep-questions-02.md`. **Ask it for a diff of the spec**, and
point at the new win-condition acceptance criterion when it comes up. That line
did not exist ten minutes ago, and the feature would have shipped without it.

The spec goes from 49 lines to about 134. Show that on screen.

### Generate the plan — the second gate

The skill already requires every phase to be independently reviewable, end with
a passing suite, and use `[ ]` / `[-]` / `[x]` / `[!]` task states.

```
Use the human-gated-spec-driven-ai-development skill to generate-plan for
001-gridsweep-spec.md
```

The recorded run produced five phases: dual-load skeleton and board
construction; reveal/marking/cascade/end states; grid rendering and
accessibility; input and status wiring; end-state presentation and acceptance
sweep. Phase 01 has no UI in it at all, which is what you want to point out — the
riskiest decision in the project gets settled first, in the smallest phase.

The recorded run used the bare prompt above and nothing else. If you want to
shape the plan for the room you can append constraints (phase 01 must be logic
only, keyboard work in its own phase, four phases maximum) — but you'll get a
different plan than the one committed. Push back on the first plan if there's an
honest reason to — the room needs to see the
human shaping the plan, not rubber-stamping it. Ask for the revision by naming
`generate-plan` again; the skill treats that as a plan revision rather than a
step forward. If the plan comes back good enough that rejecting it would be
theatre, don't fake it; approve it and buy yourself three minutes.

### Implement — the third gate

The skill implements only the next incomplete phase, refuses to run ahead, runs
the tests itself, updates the plan checkboxes, and never touches git — so the
invocation is short, and it is **the same prompt every time**:

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for
001-gridsweep-plan.md
```

Say that out loud. There is no phase number to swap; the plan file is the state.

### Ask before you approve the first phase

```
Before I review this: if I reveal the top-left cell, how many cells end up
revealed in total? Show me the code path that decides where the cascade stops.
```

Twelve. If it says four, you've earned your slide.

It will almost certainly say twelve — it did in the recorded run, without ever
having asked the question. That is **not a failed demo**. Say:

> It got that right. It has seen a thousand of these. Now — did anyone in this
> room approve that behaviour? It's correct by luck, not by agreement, and next
> time the subject is our eligibility rules we won't be lucky and none of us will
> know.

Then commit, on screen, narrating it. The AI never touches git — worth saying out
loud while you type.

### Later phases

Same invocation. Phase 02 or 03 is the one worth running live — it's where a
playable board appears on screen, and it's the closest thing you have to a
reveal.

Without a prebuilt version in your back pocket that phase is load-bearing: if the
agent stalls, you have no visible game to end on. Two mitigations — run the whole
thing privately first so you know roughly how long it takes, and be ready to
close on the `specs/` file tree instead. The paper trail is a legitimate ending;
a half-rendered board is not.

If you need a guaranteed finished game on screen, open
`examples/gridsweep/index.html` **from a second window that is not the demo
workspace.** Never open that folder in the VS Code the agent is running in.

### Final review — the last gate

```
Use the human-gated-spec-driven-ai-development skill to final-review for
001-gridsweep-plan.md
```

The skill reports against the spec, the plan, and its design principles (SOLID,
DRY, YAGNI, KISS, coupling, testability), and leaves fixes for a separate bounded
pass — triage first, which is exactly what you want here. In the recorded run it
produced a four-item technical debt register, and the two bounded passes that
closed it are appended to the same review file.

---

## The closing point

If you have two minutes left, this is the one to spend them on.

The finished project has nine acceptance criteria, 54 automated tests, a
headless-browser sweep driving real keyboard and mouse input, a phase-by-phase
acceptance walk, and a final review. **None of it noticed that the game never
tells the player which keys to press.** A human found that in minutes, by opening
the page and trying to play.

Criterion 7 says *"the game is fully playable using only the keyboard."* It was
verified honestly and it is literally true — and it is hollow for a first-time
player who cannot play at all without being told the bindings.

> This process is very good at holding code to a spec. It has no mechanism at all
> for noticing what the spec forgot to want. That is what the human gates are
> for — and it's why they aren't a formality.

Full write-up:
[What the process missed](../../examples/gridsweep/specs/001-gridsweep-retro.md#what-the-process-missed).

---

## Recovery prompts

Have these ready. Something will go wrong, and recovering calmly on stage is more
convincing than a clean run.

**It wrote code before the gate:**
```
You've started writing implementation code. Revert those files. We haven't passed
the plan gate yet — go back to updating the spec and stop there.
```

**It answered its own question:**
```
You answered question 3 yourself instead of leaving it for me. That decision is
mine. Restore it as an open question and remove the assumption from the spec.
```

**It over-built the phase:**
```
List everything you built that isn't in Phase 01 of the plan. Then remove it.
```

**It built random board generation anyway:**
```
The spec lists random board generation as a non-goal. Remove it and use the fixed
layout from the spec.
```
Do this one slowly if it happens. A non-goal catching an unwanted feature in
public is the best advertisement the Non-Goals section will ever get.

**It went quiet or long:** stop it and say "in a real session I'd let that run and
go get coffee — the point is that when it comes back, everything it did is written
down in the plan file." Then move to the `specs/` file tree and close there.

---

## Fallback answers

If the clarification round runs long, these are defensible answers to every
planted gap — and they are the answers actually given in the recorded run, so
the committed spec agrees with them. Prefer letting the room reach them, but
don't burn ten minutes getting there.

| Question | Answer | Why |
|---|---|---|
| How do you win? | Every safe cell revealed. Marks are irrelevant to the outcome. | The spec had no winning criterion at all. |
| Cascade behaviour | Zero-count cells keep expanding; numbered cells are revealed but stop there. | Non-recursive reading opens 4 cells instead of 12. |
| Marking with a keyboard | Arrow keys move a cursor via roving tabindex, `Enter`/`Space` reveals, `F` marks. Right-click also marks, for habit. | The spec demands keyboard-only play and right-click has no keyboard equivalent. |
| Can a marked cell be revealed? | Not by a direct reveal — unmark it first. A cascade reaching a marked cell unmarks and reveals it. | A mark protects against a stray keypress; it shouldn't distort the cascade. |
| Third "maybe" state | No. | Not in the spec, and it doubles the input model. |
| On a loss | All mines shown, the detonated one highlighted, incorrect marks shown as wrong. | Otherwise the player learns nothing from losing. |
| Mine counter | Shown; counts marks placed, not marks that are correct. | Counting only correct marks would leak the answer. |
| Test harness | Logic in a DOM-free file, tests under `node --test`. | The implementation gate needs evidence a reviewer can watch. |
| Input after the game ends | Reveal and mark go inert; the cursor keeps moving. | Locking navigation traps a screen-reader user in the grid with no way to hear where the mines were. |

---

## Timing — 30 minutes

| Min | Beat |
|-----|------|
| 0–3 | Read the spec on screen. Read the Acceptance Criteria twice. |
| 3–7 | The opening prompt. Read the questions file aloud. |
| 7–13 | Vote on the win condition. Answer in the file. Fold. Show the diff, point at the new criterion. |
| 13–17 | Generate the plan. Push back once. Approve. Commit on screen. |
| 17–24 | Implement phase 01. Tests green. Count to twelve on the projector. |
| 24–27 | Commit. Start the next phase if the clock allows. |
| 27–30 | Show the `specs/` file tree with real files in it. The closing point. Q&A. |

Tightest stretch is 7–13. If the vote runs hot, cut the diff review and go
straight to the plan.

Everything from minute 24 is optional. The demo is complete once you have one
approved spec, one approved plan, and one phase implemented with passing tests,
all of it on disk. Don't let a slow phase push you past your slot — and don't
skip the closing point to fit in more code.

---

## Pre-flight

On the laptop you'll actually present from:

- [ ] `human-gated-spec-driven-ai-development` skill installed globally (via
      `deploy.sh`) and visible to Copilot in the demo workspace
- [ ] Demo workspace exists outside `spec-driven-ai-dev`, holding only
      `presentations/001-gridsweep/001-gridsweep-spec.md` copied to `specs/`, committed
- [ ] You copied the **presentations** spec, not the folded one in
      `examples/gridsweep/specs/`
- [ ] These notes are **not** in that workspace, and neither is anything else
      from the repo
- [ ] Copilot Chat opens in Agent mode
- [ ] `node --version` works in the VS Code terminal
- [ ] Terminal tool pre-approved for `node`
- [ ] Projector mirrors the editor, not your notes
- [ ] Read [`examples/gridsweep/README.md`](../../examples/gridsweep/README.md) and
      skimmed the retro
- [ ] Ran the whole thing once, start to finish, and know which questions the
      agent actually asks and roughly how long each phase takes
- [ ] `001-gridsweep-replay.html` opens and plays, with its `replay/` folder
      alongside it, in case the live run stalls and you need the fallback
- [ ] In the replay, **Play the game** on turn 08 actually responds to clicks on
      the machine you are presenting from
