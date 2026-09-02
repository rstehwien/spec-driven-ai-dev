# Gridsweep — a fixed-board minesweeper

## Objective

A single-page browser game on a fixed 8×8 grid containing ten hidden mines. The
player reveals cells one at a time. A revealed safe cell shows how many mines sit
in the eight cells adjacent to it. Revealing a mine ends the game as a loss;
revealing every safe cell ends it as a win.

## Constraints

### Delivery

- Runs by opening a file in a modern browser. No build step, no bundler, no
  package installation, no dev server.
- No network access at runtime. Nothing loaded from a CDN.

### The board

- The board is fixed and ships with the game. It is exactly this layout, where
  `*` is a mine and `.` is safe:

  ```
  . . . . . . . .
  . . . . . . * .
  . * . . * . . .
  . . . . . . * .
  . * . . . . . *
  . . . * . . . .
  . . . . . * . .
  * . . * . . . .
  ```

- Cells are addressed as `(row, column)`, zero-indexed from the top-left. The
  ten mines are therefore at (1,6), (2,1), (2,4), (3,6), (4,1), (4,7), (5,3),
  (6,5), (7,0) and (7,3), leaving 54 safe cells.

### Game rules

- Revealing a safe cell with no adjacent mines also reveals its neighbours,
  cascading outward until every cell on the border of the revealed region has a
  non-zero count.
- The player can mark a cell as suspected to contain a mine. Marking is a
  two-state toggle — marked or unmarked. There is no question-mark third state.
- A marked cell cannot be revealed by a direct reveal action; the player must
  unmark it first. This protects against losing to a stray keypress.
- A cascade is not a direct reveal action and is not blocked by marks. When a
  zero-count cascade reaches a marked cell, it unmarks that cell, reveals it, and
  continues as though the mark had never been placed.
- Marks are a player aid only. The win check never consults them: revealing all
  54 safe cells wins with zero marks placed, or with all ten placed wrongly.

### Input

- Playable with the keyboard alone:
  - arrow keys move a visible cursor one cell at a time and do not wrap at the
    board edges
  - `Enter` or `Space` reveals the focused cell
  - `F` toggles a mark on the focused cell
  - no other key bindings; in particular there is no keyboard shortcut for
    starting a new game, so a stray keypress cannot discard a game in progress
- Mouse and touch input are also supported: left click reveals, right click
  toggles a mark, and the browser context menu is suppressed over the board.
  Keyboard input remains fully sufficient on its own.

### Structure and testing

- All board logic lives in `board.js` and contains no DOM references. It is
  loaded by `index.html` as a plain classic script
  (`<script src="board.js"></script>`, never `type="module"`) that assigns to a
  single global, and ends with a CommonJS tail
  (`if (typeof module !== 'undefined') module.exports = ...`) so the test runner
  can `require` the same file. There is no `package.json`, so `.js` files stay
  CommonJS in Node.
- ES module `import` / `export` must not be used anywhere the browser loads,
  because a page opened over `file://` blocks module scripts.
- All DOM code lives in `ui.js` and is never loaded by the tests.
- The board logic's public surface is board creation from the fixed layout plus
  `reveal(row, column)`, `toggleMark(row, column)`, and a readable state
  snapshot. All state transitions are pure with respect to the DOM.
- Tests run with Node's built-in runner: `node --test` over a `test/` directory
  using `node:test` and `node:assert/strict`. Nothing is installed, no config is
  needed, and the run exits non-zero on failure. This assumes Node 18 or newer on
  the reviewer's machine.
- The board logic must be covered by automated tests that a reviewer can run and
  watch pass before approving any phase.

### Presentation

- A revealed safe cell with one or more adjacent mines displays that count as a
  digit from 1 to 8. A revealed zero-count cell is rendered blank.
- A counter above the board shows remaining unmarked mines, computed as ten
  minus the number of marks placed. It is a marking aid, not a score or timer.
- On a loss: the mine that was revealed is highlighted distinctly, all other
  mines are revealed as mines, marks left on safe cells are shown as incorrect,
  and a "You lose" status message is displayed.
- On a win: the board locks, all remaining mines are shown as mines, and a
  "You win" status message is displayed.
- A "New game" button resets all cell state back to hidden and unmarked and
  clears the end state, replaying the same fixed layout. Nothing persists between
  games.
- Accessibility: the board is a `role="grid"` with roving `tabindex` so exactly
  one cell is in the tab order at a time, and each cell carries an `aria-label`
  describing its state. There are no live-region announcements of cascades or
  game end beyond the status text itself.
- Styling is a single plain stylesheet with classic per-digit colours for 1–8 and
  a clearly visible focus outline on the cursor cell. No theme switching, no
  animations.

## Non-Goals

- No random board generation, no seeding, no difficulty levels.
- No timer, no scoring, no high scores.
- No chording (revealing neighbours by clicking a satisfied number).
- No server, no persistence between sessions.
- No animations or sound.
- No question-mark marking state.
- No keyboard binding for restarting the game.

## Acceptance Criteria

- Revealing a mine ends the game as a loss.
- Revealing the last of the 54 safe cells ends the game as a win, regardless of
  how many marks are placed or whether they are correct.
- Every revealed safe cell with one or more adjacent mines displays its
  adjacent-mine count; a revealed zero-count cell is blank.
- Revealing a safe cell with a zero count cascades to reveal the surrounding
  region, unmarking and revealing any marked cells the cascade reaches.
- A direct reveal of a marked cell has no effect until the mark is removed.
- Once the game has ended, further input has no effect until "New game" is
  pressed.
- The game is fully playable using only the keyboard.
- The board logic has automated test coverage runnable with `node --test`, and
  the suite passes.
