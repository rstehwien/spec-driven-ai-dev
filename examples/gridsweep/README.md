# Gridsweep — a worked example, start to finish

Gridsweep is a fixed-board minesweeper: an 8×8 grid, ten mines in known
positions, no build step, no dependencies. Open `index.html` in a browser and
play it.

The game is not the point. **This directory is a complete record of one run of
the `human-gated-spec-driven-ai-development` workflow** — a deliberately
incomplete spec, the questions the agent asked about it, the answers, the plan,
five implementation phases, a final review, two bounded improvement passes, and
a retro that argues with the spec's own constraints.

Where [`../sprite-generator/`](../sprite-generator/) shows what the workflow
artifacts look like on a real project, this one shows the **whole cycle end to
end, with the code it produced**, small enough to read in a sitting.

## Run it

```sh
open index.html          # or double-click it — file:// is all it needs
node --test              # 54 tests, no install, no config
```

`node --test` needs Node 18 or newer. The renderer tests drive a real headless
Chrome; if no Chrome or Chromium is on the machine they skip themselves and the
suite still exits zero.

## What's here

| | |
| --- | --- |
| `index.html`, `board.js`, `ui.js`, `styles.css` | the game. `board.js` is pure logic with no DOM; `ui.js` is all DOM and is never loaded into Node. |
| `test/board.test.js` | board logic plus source-shape guards, under `node --test`. |
| `test/browser.test.js` | renderer coverage, driving real key and mouse events. |
| `tools/chrome-driver.js` | a hand-rolled Chrome DevTools Protocol client, written with Node built-ins only. |
| `specs/` | the workflow artifacts, below. |
| `prompts.md` | every prompt that produced all of the above, mapped to its commit. |

## The artifacts, in the order they were made

1. [`specs/001-gridsweep-spec.md`](specs/001-gridsweep-spec.md) — the spec.
   **This is the folded version, not the one the run started from.** The
   starting spec was 49 lines and never said how you win; the copy preserved for
   the demo is [`../../presentations/001-gridsweep-spec.md`](../../presentations/001-gridsweep-spec.md).
2. [`specs/001-gridsweep-questions-01.md`](specs/001-gridsweep-questions-01.md)
   — fifteen numbered questions across five must-answer topics, each with why it
   matters and a proposed fallback, answered inline as `> Decision:` blocks in
   the developer's own words. The first topic is the win condition, which the
   original spec omitted entirely.
3. [`specs/001-gridsweep-plan.md`](specs/001-gridsweep-plan.md) — five phases,
   each independently reviewable and each ending green. It opens with the
   adjacency counts and cascade sizes computed from the fixed layout, so the
   tests have expectations derived independently of the implementation.
4. [`specs/001-gridsweep-final-review.md`](specs/001-gridsweep-final-review.md)
   — review against the spec, the plan, and design principles, with a technical
   debt register. The two improvement passes that closed it are appended to the
   same file.
5. [`specs/001-gridsweep-retro.md`](specs/001-gridsweep-retro.md) — the project
   retro: what the process caught, what it structurally could not catch, and
   what the whole thing cost in time and tokens.

## How it was built

Every prompt is in [`prompts.md`](prompts.md), one section per turn, each tagged
with the commit it produced.

The run happened in a **separate, empty repo** containing nothing but the
starting spec — deliberately, so the agent could not read ahead to a finished
implementation or to the speaker notes. Each commit from that repo was then
copied here, which is why the history reads as a clean sequence of workflow
stages. The git history in this repo *is* the process record: `git log --oneline
-- examples/gridsweep` walks the stages in order.

Nothing here is synthesized after the fact. The questions are the ones the agent
actually asked, the answers are the ones actually given, and the code is what
actually came out.

## Why there is no `package.json`

The spec required the game to run by opening a file in a browser, with no build
step, no bundler, no install, and no network at runtime. That is a real delivery
constraint and it held: `index.html` works today, cold, offline, and will still
work in five years given a browser.

The project then inherited a second constraint that does not actually follow
from the first — *therefore no development dependencies either* — and paid for
it. Test tooling never ships. The renderer could have been tested with
Playwright without changing a byte of the delivered artifact. Instead:

- `tools/chrome-driver.js` is 416 hand-written lines doing what ~10 lines of
  config would do.
- Roughly 390 lines of `test/board.test.js` are regexes policing "no ES modules,
  no network, classic scripts in order" — rules a linter or a bundler would
  enforce for free.
- Test and tooling code outweighs shipped code 2.2 : 1.

For `board.js` the constraint was clearly right — pure logic, `node --test`, no
config, nothing to install. For the renderer it was expensive, and two of the
four technical debt items exist only because of it.

The retro works through the trade-off in full, including the
custom-driver-vs-Playwright comparison and the recommendation for next time
(keep the delivery constraint; make "no dev dependencies" a separate decision
that has to justify itself):
[**Was the no-`package.json` approach right?**](specs/001-gridsweep-retro.md#was-the-no-packagejson-approach-right)

## The part worth reading twice

The retro's [What the process missed](specs/001-gridsweep-retro.md#what-the-process-missed)
section. Nine acceptance criteria, 54 tests, a headless browser sweep, a
phase-by-phase acceptance walk and a final review — and none of them could
notice that the game never tells the player which keys to press. A human found
it in minutes of actually playing.

The workflow is very good at holding code to a spec. It has no mechanism for
noticing what the spec forgot to want, which is precisely what the human gates
are there for.
