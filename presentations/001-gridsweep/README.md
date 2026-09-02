# Gridsweep — presentation material

Everything needed to run the Gridsweep demo, kept together. The finished run it
demonstrates lives in [`../../examples/gridsweep/`](../../examples/gridsweep/).

| File | What it is |
| --- | --- |
| [`001-gridsweep-spec.md`](001-gridsweep-spec.md) | The **starting** spec — 49 lines, and it never says how you win. This is the copy you hand the agent. |
| [`001-gridsweep-speaker-notes.md`](001-gridsweep-speaker-notes.md) | Presenter-only. Workspace setup, the gaps the spec is designed to expose, timings. **Keep it out of the demo workspace.** |
| [`001-gridsweep-replay.html`](001-gridsweep-replay.html) | A replay of the whole 001 cycle. Open it in a browser; nothing to install. |
| [`replay/`](replay/) | What the replay loads: screenshots, the game's own source at six commits, every diff, and the script that regenerates all of it. |

## The replay

`001-gridsweep-replay.html` is the fallback for when there is no time to run the
cycle live, and the warm-up for when there is.

It is **not a video**. Each of the fourteen turns plays out — the prompt typed
in, the agent working, the files changing, what the game looked like — and then
**stops**, with three ways to go deeper before you move on:

- **What changed** — the real `git show` diff for that commit, rendered in the
  page. Shipped source first, the prompts log last, with a jump-to-file row and
  a per-file link to the blob on GitHub.
- **Play the game** — the actual game at that commit, its own four files loaded
  live in a frame. Not a screenshot: at turn 07 you can click a cell and watch
  nothing happen, because input does not land until Phase 04. At turn 08 and
  after, you can play it — and discover for yourself that nothing on the page
  says which keys to press.
- **Commit on GitHub** — opens `github.com/rstehwien/spec-driven-ai-dev` at that
  commit in a new tab.

The panel on the right carries what the diff cannot: the reasoning, quoted from
the artifacts. The plan's own flagged deviations, the exact `TypeError` that made
Phase 02 red, the review's executive summary, the developer's `> Decision:`
triage, the mutation table, the retro's open items. Where the game is what
changed, it shows the game — six real frames of Phase 04 being played, three of a
loss. It does not restate what **What changed** already shows.

Colour carries meaning throughout. **Green** is the agent. **Amber** is the
developer prompting it — the prompt box, and the human gates. **Violet** is the
developer editing an artifact by hand with no agent running at all: the two
turns that have no prompt, the hand-edit that precedes turns 11 and 12, and the
`> Decision:` triage quoted from the review. The timeline ticks are coloured the
same way, so you can see at a glance which turns nobody prompted.

The columns are draggable: pull either grip to resize the explorer and the detail
panel, and the transcript takes what is left. Double-click a grip to reset it,
or use the arrow keys when it has focus. Widths persist per browser.

Playback is about three and a half minutes if you never stop; realistically it is
however long the room wants to spend. **Auto-advance** in the title bar turns it
back into a hands-off video for an unattended screen.

Controls: <kbd>Space</kbd> play, then next turn · <kbd>&larr;</kbd>&nbsp;<kbd>&rarr;</kbd>
turn · <kbd>D</kbd> what changed · <kbd>G</kbd> play the game · <kbd>Esc</kbd>
close · <kbd>N</kbd> presenter notes · <kbd>F</kbd> full screen ·
<kbd>1</kbd>–<kbd>4</kbd> speed. Every turn carries its own note under
<kbd>N</kbd>, so the page can be presented from directly.

### Keep the folder together

The page reads `replay/` from disk, so **`001-gridsweep-replay.html` and
`replay/` have to travel as a pair.** Copy one without the other and you get the
replay with grey placeholders where the screenshots go, an empty diff pane, and
a broken game frame — each of which says so on screen rather than failing
silently. The GitHub links keep working regardless.

Browsers vary in how much they allow a `file://` page to load from disk. Chrome
runs the whole thing; if a browser blocks the frame or the diffs, serve the
folder over HTTP instead (`python3 -m http.server` from this directory).

### Why the commit is a link and not a frame

GitHub sends `X-Frame-Options: deny` and `frame-ancestors 'none'`, so its pages
cannot be embedded anywhere. The diff is rendered from a local copy instead —
which also means the replay works with no network at all — and the link opens
the real thing in a new tab.

## It is a reconstruction, and it says so on screen

Taken from the repository, unaltered:

- every prompt, from [`prompts.md`](../../examples/gridsweep/prompts.md);
- every commit sha, file path and line count, from `git show --numstat`;
- every diff, from `git show`;
- every quoted artifact excerpt, from the files in `specs/`;
- every screenshot — captured by checking the tree out at that commit, driving
  the page with scripted clicks, and screenshotting it in headless Chrome. The
  mid-game and end-game boards are real game states, not mock-ups;
- the playable game, which is that commit's own `index.html`, `board.js`,
  `ui.js` and `styles.css`.

Invented: the pacing, and the tool-call lines under each turn. The original
session was never recorded, so those lines describe what the skill does at that
stage rather than quoting a transcript.

## Regenerating `replay/`

```sh
cd presentations/001-gridsweep/replay
./capture.sh
```

Needs git, node, python3 and Google Chrome. It rebuilds `shots/`, `game/` and
`diffs.js` from the repository — nothing in there is hand-drawn or hand-edited,
so it is safe to delete and rebuild. Change a stage's screenshot by editing the
`shot` lines in the script rather than by editing a PNG.

## Two process details the replay makes visible

**Every turn ran in a fresh session.** A rule beneath each turn header reads
`SESSION nn OF 12 · FRESH CONTEXT`. Nothing carried over in conversation between
turns, because nothing needed to — the spec, the plan and its checklist state
are on disk. The retro counts twelve sessions across the run, and there are
exactly twelve turns with an agent in them. Turn 13 is the single exception and
says so: three prompts, one session.

**Almost none of the prompts were written by hand.** Most agent turns end by
*writing the next prompt* into the `## User gate` section of the artifact they
just produced, and the replay shows that where it happens — a green
**SUGGESTED NEXT STEP** block at the end of the turn, with the prompt in it. The
one the developer went on to run is highlighted amber, because it is about to
reappear as the next turn's prompt box. Options that were offered and not taken
are shown dimmed beside it.

Every block is checked against the artifact as it stood at that commit:

- **Turn 01** is the only prompt written from nothing.
- **Turns 03–11** were each handed over by the previous turn. Turn 04's is the
  odd one: the folded spec is the single artifact with no User gate, so that
  suggestion lived only in the agent's reply — in the transcript, which is
  exactly what this workflow treats as disposable.
- **Turn 09** offers two, and the unused one is `review-phase` — a real stage
  command this project never ran. **Turn 10** offers two as well, and its
  untaken branch is the 002 cycle.
- **Turns 11 and 12** end with *NO NEXT PROMPT SUGGESTED*. Turn 11 points at
  *"the natural next pass"* but writes no prompt, so naming debt items 1 and 3 —
  and adding the `must not add npm packages` constraint — was the developer's
  judgement. Those turns' prompts carry an amber *written by the developer* line
  instead.
- **Turn 13** was nobody's suggestion, and still ends by writing two prompts of
  its own. Neither has been run; one of them is where cycle 002 starts.

Turn 11 is worth being precise about: its prompt **was** handed over, verbatim,
in the final review's own *Example prompts* block. It is the last one the run
suggests.

## Stage commands, and the turns that are not one

The header chip on each turn is green for the five of the skill's seven stage
commands this run used — `review-spec`, `fold-questions`, `generate-plan`,
`implement-next-phase`, `final-review` — and **amber from turn 11 on**, because
nothing after `final-review` is a stage command at all.

The skill names a *bounded improvement cycle* as what follows a review, but it
is not one of the seven, and there is no retro command. Turns 11, 12 and 13 are
plain requests that the skill maps onto the artifacts it already has. Turn 11's
panel says so and quotes the skill. It is worth being precise about in a room
that is deciding whether to adopt this.

Two commands never ran: `generate-questions`, because `review-spec` produced the
questions artifact directly, and `review-phase`, folded into each phase's
acceptance walk. Defensible at this size; the first thing to add back on a real
project.

## The two frames worth pausing on

Turn 08 — where acceptance criterion 7, *"the game is fully playable using only
the keyboard"*, is satisfied honestly by a game that never tells you the keys.
Open **Play the game** and hand the keyboard to someone who has not read the
spec.

And the closing card, which is the only place in the run a human found either
defect.
