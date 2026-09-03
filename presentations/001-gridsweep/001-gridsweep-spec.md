# Gridsweep — a fixed-board minesweeper

## Objective

A single-page browser game on a fixed 8×8 grid containing ten hidden mines. The
player reveals cells one at a time. A revealed safe cell shows how many mines sit
in the eight cells adjacent to it. Revealing a mine ends the game.

## Constraints

- Runs by opening a file in a modern browser. No build step, no bundler, no
  package installation, no dev server.
- No network access at runtime. Nothing loaded from a CDN.
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

- Revealing a safe cell with no adjacent mines also reveals its neighbours.
- The player can mark a cell as suspected to contain a mine.
- Playable with the keyboard alone.
- The board logic must be covered by automated tests that a reviewer can run and
  watch pass before approving any phase.

## Non-Goals

- No random board generation, no seeding, no difficulty levels.
- No timer, no scoring, no high scores.
- No chording (revealing neighbours by clicking a satisfied number).
- No server, no persistence between sessions.
- No animations or sound.

## Acceptance Criteria

- Revealing a mine ends the game as a loss.
- Every revealed safe cell displays its adjacent-mine count.
- Revealing a safe cell with a zero count cascades to reveal the surrounding
  region.
- Once the game has ended, further input has no effect.
- The board logic has automated test coverage and the suite passes.
