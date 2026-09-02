# Speaker notes — Gridsweep

Presenter-only. Everything you need to run the live demo is in this file.

**Do not put this file in the workspace you open in VS Code during the demo.** It
names every gap the spec is designed to expose.

The exercise: hand an agent a deliberately incomplete spec for a minesweeper
variant, run it through all four gates in front of the room, and let the
clarification round surface a requirement nobody wrote down.

Budget 30 minutes.

---

## Before the talk

### Workspace layout

These notes and the spec both live in `spec-driven-ai-dev`:

```
spec-driven-ai-dev/
  examples/gridsweep/specs/001-gridsweep-spec.md
  presentations/001-gridsweep-speaker-notes.md      <- this file
```

**Do not run the demo from that repo.** These notes sit two directories from the
spec, so opening the repo in VS Code hands the agent the answer key.

Copy the spec into a throwaway workspace instead:

```
mkdir -p ~/gridsweep-demo/specs
cp examples/gridsweep/specs/001-gridsweep-spec.md ~/gridsweep-demo/specs/
cd ~/gridsweep-demo
git init
git add -A && git commit -m "Gridsweep spec"
```

That workspace is what you open in VS Code. One commit, containing nothing but the
spec. The process itself isn't in the workspace — it's the
`human-gated-spec-driven-ai-development` skill, installed globally on your machine
by `deploy.sh` from the `spec-driven-ai-dev` repo, so it's available in every
workspace including this throwaway one. Nothing else lives here, and nothing above
it on the filesystem the agent could wander into.

Delete it afterwards. The artifacts the demo produces are throwaway; the ones
worth keeping are already in the repo.

### Keeping the agent from reading ahead

A branch is not a hiding place. Agents run `git log`, `git branch -a`, `git show`
and `git grep` without being asked, and a completed implementation on
`demo-complete` is one command away. `.gitignore` doesn't help either — ignored
files are still on disk and still readable.

The only control that holds is **filesystem scope**. Copilot's agent mode is
bounded by the folder open in VS Code, so anything outside that folder is
genuinely out of reach — which is the whole reason the demo workspace lives away
from `spec-driven-ai-dev` rather than inside it.

The same applies to these notes. Keep them on a second screen or on paper, never
in the workspace.

For Copilot Business/Enterprise there's also repository-level content exclusion
configured in GitHub settings. It's a real control but the wrong tool here: it's
org-admin configuration, it doesn't travel to a fork, and it won't help anyone who
tries this exercise on their own afterwards.

### The model already knows minesweeper

You cannot prevent that, so don't try. Two reasons it doesn't matter:

- **The demo is about process, not novelty.** Nobody in the room believes an AI
  can't figure out minesweeper. What they're watching is whether the decisions get
  written down before the code, and whether a human approved them.
- **The spec deviates from canon on purpose.** Fixed board, no random generation,
  no chording, no timer. Prior knowledge becomes a liability — if the agent
  pattern-matches to the familiar version it produces something that fails the
  spec, and catching that is the demonstration.

### VS Code + Copilot

Verify against current VS Code docs; this surface changes often.

1. The process is the `human-gated-spec-driven-ai-development` skill, not a set of
   prompt files you paste into the workspace. Install it once with `deploy.sh`
   from the `spec-driven-ai-dev` repo — it symlinks the skill into `~/.claude` and
   `~/.agents`, which Copilot reads — and it's then available in every workspace,
   the throwaway demo one included. Nothing about the process ships inside that
   workspace; the audience sees the same global setup you'd use at work. The skill
   carries every gate rule (no code before the plan is approved, no git, one phase
   at a time, questions go to files rather than chat), so there's nothing else to
   wire up — just confirm Copilot can see the skill before you start.
2. Open **Copilot Chat in Agent mode**, not Ask mode. Ask mode won't create files
   or run the test command, and the room needs to see both happen.
3. Pre-approve the terminal tool for `node`, so Gate 3 doesn't stall on a
   permission dialog at the worst possible moment.
4. Pin the spec explicitly with `#file:specs/001-gridsweep-spec.md` in the first
   prompt. Don't rely on implicit context discovery in front of an audience.

Keep these notes on your laptop screen and VS Code on the projector. Check the
mirroring before you start — the whole demo is reading files on screen, and a
projector showing your notes instead of the editor ends the talk early.

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
border — the first six cells of row 1 and the first six of row 2, twelve in total,
no mine among them. Zero cells keep expanding; numbered cells are revealed but
stop the cascade there.

The naive reading opens the cell and its three neighbours and stops, which
produces a game nobody would call minesweeper.

Twelve is a number you can assert in a test and count on screen.

---

## Everything else that's planted

| # | Gap | Notes |
|---|-----|-------|
| 1 | Win condition | Above. The headline. |
| 2 | Cascade recursion | Above. Produces a hard test assertion. |
| 3 | How do you mark with a keyboard? | The spec demands keyboard-only play and a marking action. Right-click has no keyboard equivalent, and a 2D grid needs arrow navigation plus a focus model. Real work, real accessibility question, and the phase you'll run out of time for. |
| 4 | Can a marked cell be revealed? | Most implementations block it. Spec doesn't say. Also: can you unmark? Is there a third "maybe" state? |
| 5 | What happens on a loss? | Reveal all mines? Highlight the one you hit? Show which marks were wrong? Nothing at all? Four different games. |
| 6 | Is there a mine counter? | Ten mines exist. Does the player see how many remain unmarked? Does marking decrement it? Not stated. |
| 7 | Test harness vs "no build step" | See below. |
| 8 | The board is in the source | A sharp attendee will point out the player can read the answer in devtools. Correct. Good instinct, wrong project — say so, then note that "is this a non-goal or a defect?" is exactly what the spec should have settled. |

You want 1, 2 and 3 to surface. If the agent only raises cosmetic ones, drive it
with the P1b follow-up.

---

## Why the fixed board is doing work

The Non-Goals rule out random generation on purpose. Randomness would drag in
seeding and first-click-safety — two genuinely interesting problems that would eat
the whole slot and teach nothing about the process.

Say this out loud when you reach the Non-Goals section. It's right-sizing in
miniature: **the spec cut scope before the AI could spend an hour on it.** If
someone asks "wouldn't a real game need random boards?", the answer is yes, and
that's feature 002.

The fixed board also makes every test deterministic with no test-double
machinery, which is why Phase 01 can be genuinely green in three minutes.

---

## The test harness question

The spec requires automated tests a reviewer can watch pass, and it requires no
build step. These are in tension, and the tension is planted deliberately — it
forces the room to confront what "done" means.

Three resolutions, in the order to offer them:

1. **Three files, zero setup.** `logic.js` holding all the logic and no DOM,
   `logic.test.js` runnable with a bare `node --test`, and `index.html` pulling in
   `logic.js`. Node is already installed. The agent can run the tests itself, so
   Gate 3 is real evidence rather than a claim.
2. **True single file** with a `?test=1` mode rendering a pass/fail panel. Ships as
   one file; the agent can't verify it without a headless browser, so you're back
   to trusting the output.
3. **Single file plus a small runner** that reads `index.html`, extracts the script
   block and evaluates it. Genuinely single-file-shippable, mildly cursed.

Option 1 is the right answer. Let the agent propose it rather than pre-deciding —
watching a testability constraint reshape the file layout is a better argument for
the process than any slide.

### One trap worth knowing about in advance

If the agent reaches for `<script type="module">` and a relative `import`, that
combination is **blocked under `file://`**. A spec that says "open it in a
browser" therefore rules out ES modules unless you add a server, which the
constraints also rule out.

The fix is a classic script that assigns to a single global — works in the
browser, and still loads into Node for the tests via a side-effect import.

Don't pre-empt this. The failure is instant and legible in the console, and an
agent hitting it and recovering is a good thirty seconds of demo. Just know the
answer so you can steer if it flails.

---

## Running the stages

Each beat is one skill stage. You invoke a stage by naming the skill and the stage
in plain language; the skill already enforces the gate rules, writes numbered
files into `specs/`, and stops at each gate, so you don't hand-roll "don't write
code" instructions into every prompt. Copy-paste in order. Agent mode, not Ask
mode.

The stage sequence for this demo:

`review-spec` → answer questions → `fold-questions` → `generate-plan` →
`implement-next-phase` → `review-phase` → (optional later phases) →
`final-review`.

### P1 · review-spec — Gate 1 opens

```
Use the human-gated-spec-driven-ai-development skill to review-spec for
#file:specs/001-gridsweep-spec.md.

Pay particular attention to whether the acceptance criteria actually cover every
outcome the game can reach.
```

The skill's `review-spec` reviews for ambiguity, gaps, and risks, then — because
this spec is deliberately incomplete — writes numbered questions to
`specs/001-gridsweep-questions-01.md`, each with why it matters and a fallback
default. If you'd rather guarantee the questions artifact than let the skill
decide between questions and a plan, invoke `generate-questions` instead of
`review-spec`.

The appended sentence nudges toward the win-condition gap without naming it. Drop
it if you'd rather find out cold — but run it privately at least once first.

Open the questions file on the projector and read two of them aloud before
answering anything. The audience should see the AI's questions in a file, not in a
chat pane.

### P1b · If the win condition didn't come up

```
Walk me through what happens if I reveal every cell that isn't a mine. What state
is the game in, according to the spec?
```

Let it discover the hole itself. Much better on stage than you announcing it.

### P2 · fold-questions — answer live, then fold in

Answer in the questions file, in the editor, on the projector. `> Decision:` for
answers, leave anything you're punting as `> Question:` — the skill reads exactly
these blockquote labels.

Take the vote on the win condition before you write it down.

```
Use the human-gated-spec-driven-ai-development skill to fold-questions for
specs/001-gridsweep-questions-01.md.
```

The skill folds every `> Decision:` into `specs/001-gridsweep-spec.md`, keeps the
answered questions file as history, and carries anything still marked
`> Question:` into `specs/001-gridsweep-questions-02.md`. Ask it to show you a diff
of the spec, and point at the new acceptance criterion when it comes up. That line
did not exist ten minutes ago, and the feature would have shipped without it.

### P3 · generate-plan — Gate 2

The skill already requires every phase to be independently reviewable, end with a
passing suite, and use `[ ]` / `[-]` / `[x]` / `[!]` task states. You only add the
demo-specific shaping.

```
Use the human-gated-spec-driven-ai-development skill to generate-plan for
specs/001-gridsweep-spec.md.

Shape it for this demo:
- Phase 01 must contain no UI code at all — board state, adjacency counts, reveal
  and cascade logic only.
- Keyboard navigation and marking belong in their own phase.
- Four phases maximum.
```

Push back on the first plan if there's an honest reason to — merge two phases, or
cut something speculative. Ask for the revision by naming `generate-plan` again;
the skill treats that as a plan revision rather than a step forward. The room
needs to see the human shaping the plan, not rubber-stamping it. If the plan comes
back good enough that rejecting it would be theatre, don't fake it; approve it and
buy yourself three minutes.

### P4 · implement-next-phase — Gate 3

The skill implements only the next incomplete phase (Phase 01 here), refuses to
run ahead, runs the tests itself, updates the plan checkboxes, and never touches
git — so the invocation is short.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for
specs/001-gridsweep-plan.md.
```

### P4b · The gotcha — run this before you approve

```
Before I review this: if I reveal the top-left cell, how many cells end up
revealed in total? Show me the code path that decides where the cascade stops.
```

Twelve. If it says four, you've earned your slide.

If it says twelve, that is **not a failed demo** — say:

> It got that right. It has seen a thousand of these. Now — did anyone in this
> room approve that behaviour? It's correct by luck, not by agreement, and next
> time the subject is our eligibility rules we won't be lucky and none of us will
> know.

### P5 · review-phase — close the phase

```
Use the human-gated-spec-driven-ai-development skill to review-phase for
specs/001-gridsweep-plan.md.
```

The skill reviews Phase 01 against its acceptance criteria and writes
`specs/001-gridsweep-phase-01-review.md` (what was built, tested, deferred) plus
`specs/001-gridsweep-phase-01-retro.md` (what in the spec or plan was unclear or
badly scoped). Run `git commit` yourself, on screen, narrating it. The AI never
touches git — worth saying out loud while you type.

### P6 · Later phases

Same `implement-next-phase` invocation — the skill advances to the next incomplete
phase on its own, no number to swap. Phase 02 (rendering) is the one worth running
live — it's where a playable board appears on screen, and it's the closest thing
you have to a reveal. Phase 03 (keyboard navigation and marking) is the one to
skip.

Without a prebuilt version in your back pocket, Phase 02 is load-bearing: if the
agent stalls there, you have no visible game to end on. Two mitigations — run the
whole thing privately first so you know roughly how long Phase 02 takes, and be
ready to close on the `specs/` file tree instead. The paper trail is a legitimate
ending; a half-rendered board is not.

### P7 · final-review — Gate 4

```
Use the human-gated-spec-driven-ai-development skill to do a final-review across
specs/001-gridsweep-spec.md and specs/001-gridsweep-plan.md.

Write findings to specs/001-gridsweep-final-review.md. Don't fix anything yet — I
want to triage the list first.
```

The skill's `final-review` reports against the spec, the plan, and its design
principles (SOLID, DRY, YAGNI, KISS, coupling, testability) and leaves fixes for a
separate bounded pass — exactly the triage-first behaviour you want here.

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
planted gap. Prefer letting the room reach them — but don't burn ten minutes
getting there.

| Question | Answer | Why |
|---|---|---|
| How do you win? | Every safe cell revealed. Marks are irrelevant to the outcome. | The spec had no winning criterion at all. |
| Cascade behaviour | Zero-count cells keep expanding; numbered cells are revealed but stop there. | Non-recursive reading opens 4 cells instead of 12. |
| Marking with a keyboard | Arrow keys move focus via roving tabindex, `Enter`/`Space` reveals, `F` marks. Right-click also marks, for habit. | The spec demands keyboard-only play and right-click has no keyboard equivalent. |
| Can a marked cell be revealed? | No — unmark it first. | A mark is a commitment; protecting it is the point of placing one. |
| Third "maybe" state | No. | Not in the spec, and it doubles the input model. |
| On a loss | All mines shown, the detonated one highlighted, incorrect marks struck through. | Otherwise the player learns nothing from losing. |
| Mine counter | Shown; counts marks placed, not marks that are correct. | Counting only correct marks would leak the answer. |
| Test harness | Logic in a file with no DOM, tests under `node --test`. | Gate 3 needs evidence a reviewer can watch. |

---

## Timing — 30 minutes

| Min | Beat |
|-----|------|
| 0–3 | Read the spec on screen. Read the Acceptance Criteria twice. |
| 3–7 | P1. Read the questions file aloud. P1b if needed. |
| 7–13 | Vote on the win condition. Answer in the file. P2. Show the diff, point at the new criterion. |
| 13–17 | P3. Push back on the plan once. Approve. Commit on screen. |
| 17–24 | P4. Tests green. P4b — count to twelve on the projector. |
| 24–27 | P5. Commit. Start Phase 02 if the clock allows. |
| 27–30 | Show the `specs/` file tree with real files in it. Q&A. |

Tightest stretch is 7–13. If the vote runs hot, cut P2's diff review and go
straight to the plan.

Everything from minute 24 is optional. The demo is complete at the end of P5 —
one approved spec, one approved plan, one reviewed phase with passing tests, all
of it on disk. Anything past that is a bonus, so don't let a slow Phase 02 push
you past your slot.

---

## Pre-flight

On the laptop you'll actually present from:

- [ ] `human-gated-spec-driven-ai-development` skill installed globally (via
      `deploy.sh`) and visible to Copilot in the demo workspace
- [ ] Demo workspace exists outside `spec-driven-ai-dev`, holding only the spec,
      committed
- [ ] These notes are **not** in that workspace, and neither is anything else from
      the repo
- [ ] Copilot Chat opens in Agent mode
- [ ] `node --version` works in the VS Code terminal
- [ ] Terminal tool pre-approved for `node`
- [ ] Projector mirrors the editor, not your notes
- [ ] Ran the whole thing once, start to finish, and know which questions the agent
      actually asks and roughly how long Phase 02 takes