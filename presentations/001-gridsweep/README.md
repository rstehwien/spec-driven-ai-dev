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

Playback is about three minutes if you never stop; realistically it is however
long the room wants to spend. **Auto-advance** in the title bar turns it back
into a hands-off video for an unattended screen.

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

## The two frames worth pausing on

Turn 08 — where acceptance criterion 7, *"the game is fully playable using only
the keyboard"*, is satisfied honestly by a game that never tells you the keys.
Open **Play the game** and hand the keyboard to someone who has not read the
spec.

And the closing card, which is the only place in the run a human found either
defect.
