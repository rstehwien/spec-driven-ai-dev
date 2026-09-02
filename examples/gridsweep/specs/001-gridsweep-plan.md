# Plan 001-gridsweep

Working spec: `specs/001-gridsweep-spec.md` (all 15 questions in
`specs/001-gridsweep-questions-01.md` resolved and folded).

## Repo Context Checked

- Repository root and `git log`: greenfield. No source, tests, `package.json`,
  readme, or tooling config exists. Every file below is new, and there is no
  existing module contract or test suite to preserve.
- `specs/001-gridsweep-spec.md`: the working spec and the only source of
  constraints. Fixes the file layout (`index.html`, `board.js`, `ui.js`,
  `styles.css`, `test/`), the no-build / no-network / `file://` delivery
  constraint, the classic-script + CommonJS-tail dual-load requirement, and the
  public surface (`reveal`, `toggleMark`, state snapshot).
- `specs/001-gridsweep-questions-01.md`: records why the dual-load shape was
  chosen and flags it as the decision whose cost-if-wrong is highest and only
  visible when `index.html` is double-clicked. Phase 01 therefore proves it
  before any real logic is built on top.
- Local toolchain: `node --version` reports v24.13.1, which satisfies the
  spec's Node 18+ assumption for `node --test`. No install step is needed.

## Derived fixtures (computed from the fixed layout, for use in tests)

Adjacency counts for the shipped board, `*` marking the ten mines:

```
0 0 0 0 0 1 1 1
1 1 1 1 1 2 * 1
1 * 1 1 * 3 2 2
2 2 2 1 1 2 * 2
1 * 2 1 1 1 2 *
1 1 2 * 2 1 2 1
1 1 2 2 3 * 1 0
* 1 1 * 2 1 1 0
```

- Zero-count cells: (0,0) (0,1) (0,2) (0,3) (0,4) (6,7) (7,7). Only two cascade
  regions exist, so cascade coverage needs both.
- Cascade from (0,0) reveals exactly 12 cells: (0,0)-(0,5) and (1,0)-(1,5).
- Cascade from (6,7) reveals exactly 6 cells: (5,6) (5,7) (6,6) (6,7) (7,6) (7,7).
- 10 mines, 54 safe cells.

These are recomputed by the implementation, not hard-coded into `board.js`;
they are hard-coded into the tests as independent expectations.

## Phase 01 - Dual-load skeleton and board construction

Goal: prove that one `board.js` loads both as a `file://` classic script and as
a Node `require` target, and have it build the fixed board with correct
adjacency counts.

### Tasks
- [x] Create `board.js` holding the fixed 8x8 layout, board construction, and
      adjacency-count computation, with no DOM references.
- [x] Give `board.js` a single global assignment for the browser and a
      `if (typeof module !== 'undefined') module.exports = ...` tail for Node.
- [x] Create `test/board.test.js` using `node:test` and `node:assert/strict`;
      write failing tests first for mine placement, mine count, safe-cell
      count, and the full adjacency grid above.
- [x] Implement until those tests pass; run `node --test`.
- [x] Create a minimal `index.html` that loads `board.js` as a classic script
      and renders a plain text dump of the board state, purely to confirm the
      page works when opened directly from disk.
- [x] Open `index.html` from the filesystem and confirm no console errors and
      no module/CORS failure.

### Acceptance criteria
- `node --test` passes and exits zero.
- Tests assert 10 mines at the ten specified coordinates, 54 safe cells, and
  the complete 8x8 adjacency-count grid.
- `index.html` opened over `file://` loads `board.js` and shows board data with
  a clean console.
- `board.js` contains no DOM references and no `import` / `export`.

### Out of scope
- Reveal, marking, cascade, win/loss state.
- Any real UI, styling, or input handling.

### Risks / blockers
- This phase exists to retire the highest-cost risk in the spec: a `file://`
  page silently failing on module scripts. If the dual-load shape does not
  work, stop and revisit the spec rather than proceeding.

### Notes
- The `index.html` stub here is deliberately throwaway; Phase 03 replaces its
  body with the real grid.
- No `package.json` is created, so `.js` stays CommonJS in Node.

## Phase 02 - Reveal, marking, cascade, and end states

Goal: complete the board logic state machine behind the spec's public surface,
fully covered by tests, with no DOM involvement.

### Tasks
- [x] Add failing tests for direct `reveal(row, column)` of a safe cell with a
      non-zero count, and for `reveal` of a mine ending the game as a loss with
      the triggering mine recorded.
- [x] Add failing tests for `toggleMark(row, column)` as a two-state toggle,
      for a direct reveal of a marked cell being a no-op, and for marking being
      rejected on an already-revealed cell.
- [x] Add failing tests for zero-count cascade using both fixture regions
      above, including that a cascade passing through a marked cell unmarks it,
      reveals it, and continues.
- [x] Add failing tests for the win condition: revealing all 54 safe cells wins
      with zero marks placed, and also wins with all ten marks placed on safe
      cells.
- [x] Add failing tests that all input is inert once the game has ended, in
      both the won and lost states, and that a reset returns every cell to
      hidden and unmarked and clears the end state.
- [x] Implement `reveal`, `toggleMark`, reset, and the readable state snapshot
      until the suite is green; refactor with tests passing.
- [x] Run the full `node --test` suite.

### Acceptance criteria
- All spec game rules are encoded in tests that pass.
- The snapshot exposes, per cell, whether it is hidden / revealed / marked and
  its adjacent count, plus game status (in progress / won / lost) and the
  losing cell when lost.
- Cascade never blocks on marks; direct reveal always does.
- The win check never reads mark state.
- Reveal, mark, and reset are no-ops after the game ends.

### Out of scope
- Anything in `ui.js`, `styles.css`, or the real `index.html` grid.
- The remaining-mines counter, which is a presentation concern derived from
  mark count.

### Risks / blockers
- Cascade unmarking is the spec's genuinely non-standard rule; it must be
  asserted directly rather than assumed to fall out of the flood fill.

### Notes
- Keep every transition pure with respect to the DOM so `ui.js` can stay a thin
  renderer.

## Phase 03 - Grid rendering and accessibility structure

Goal: render the real board from a state snapshot, with the accessible grid
structure and stylesheet the spec requires.

### Tasks
- [x] Replace the Phase 01 stub `index.html` with the real page: a status area,
      a remaining-mines counter, a "New game" button, and the board container.
- [x] Create `ui.js` holding all DOM code, loaded as a classic script after
      `board.js`, never required by tests.
- [x] Render the board as `role="grid"` with rows and cells, roving `tabindex`
      so exactly one cell is tabbable, and an `aria-label` per cell describing
      its state.
- [x] Create `styles.css` with classic per-digit colours for 1-8, blank
      zero-count cells, and a clearly visible focus outline on the cursor cell.
- [x] Verify by hand in the browser that hidden, revealed-digit, revealed-blank,
      and marked cells all render distinctly.
- [x] Run `node --test` to confirm the logic suite is unaffected.

### Acceptance criteria
- The page renders an 8x8 grid from the snapshot with correct digits and blank
  zero cells.
- Exactly one cell is in the tab order at any time.
- Each cell has an `aria-label` reflecting its current state.
- No `import` / `export` anywhere the browser loads; page still opens over
  `file://` with a clean console.

### Out of scope
- Input handling and end-state presentation.

### Risks / blockers
- Roving `tabindex` and re-rendering can fight each other; decide early whether
  to re-render cells in place or rebuild, and keep focus correct either way.

### Notes
- Rendering reads only the snapshot, so the render path stays testable by
  inspection and free of game rules.

## Phase 04 - Input, new game, and status wiring

Goal: make the game fully playable, keyboard-first, with pointer support and a
working "New game" button.

### Tasks
- [ ] Wire arrow keys to move the cursor one cell without wrapping at edges.
- [ ] Wire `Enter` and `Space` to reveal the focused cell, and `F` to toggle a
      mark; bind no other keys, and in particular no restart key.
- [ ] Wire left click to reveal and right click to toggle a mark, suppressing
      the context menu over the board only.
- [ ] Update the remaining-mines counter as ten minus marks placed.
- [ ] Wire the "New game" button to reset state and clear the end state,
      replaying the same fixed layout.
- [ ] Play through by keyboard alone and confirm reveal, cascade, marking,
      mark-blocks-reveal, and reset all behave per the spec.
- [ ] Run `node --test`.

### Acceptance criteria
- The game is completable using only the keyboard.
- Mouse and touch work as specified and the context menu is suppressed over the
  board.
- The counter tracks marks placed and can be driven negative only if the spec's
  simple formula makes it so; it is never treated as a score.
- "New game" fully resets the board; no key does.

### Out of scope
- Win and loss visual presentation, which is Phase 05.

### Risks / blockers
- Arrow keys must not scroll the page; `preventDefault` needs to be scoped to
  the board's own handlers.

### Notes
- Input handlers call only the Phase 02 public surface and re-render from the
  returned snapshot.

## Phase 05 - End-state presentation and acceptance sweep

Goal: present win and loss correctly and verify every acceptance criterion in
the spec end to end.

### Tasks
- [ ] On a loss, highlight the triggering mine distinctly, reveal all other
      mines, and mark marks left on safe cells as incorrect.
- [ ] On a win, lock the board and show all remaining mines.
- [ ] Display "You lose" and "You win" status messages in the status area.
- [ ] Confirm all input is inert after the game ends until "New game" is
      pressed.
- [ ] Walk the spec's Acceptance Criteria list one item at a time and record
      the result of each in the Implementation evidence section below.
- [ ] Run the full `node --test` suite and record the output.

### Acceptance criteria
- Every acceptance criterion in `specs/001-gridsweep-spec.md` is verified and
  recorded.
- Loss and win presentation match the spec exactly.
- `node --test` passes.
- The game still runs from a double-clicked `index.html` with no network access
  and no console errors.

### Out of scope
- Anything in the spec's Non-Goals: random boards, timers, scoring, chording,
  persistence, animation, sound, a question-mark state, or a restart key.

### Risks / blockers
- None known; this phase is presentation plus verification.

### Notes
- A full win requires revealing 54 cells, so keep a documented fast path for
  manual verification (for example, driving `reveal` from the browser console)
  rather than clicking through every time.

## Implementation evidence

- Phase 01: complete (2026-09-01). Built red/green.
  - Files created: `board.js`, `test/board.test.js`, `index.html` (throwaway
    Phase 01 stub, replaced in Phase 03).
  - Red: `test/board.test.js` was written first and failed with
    `MODULE_NOT_FOUND` before `board.js` existed.
  - Green: `node --test` reports `pass 7 / fail 0` and exits `0`.
  - Tests assert the ten mine coordinates (as an exact ordered list), 10 mines,
    54 safe cells, the complete 8x8 adjacency grid, that every cell starts
    hidden and unmarked, and that two games do not share cell state.
  - The adjacency fixture in this plan was recomputed independently from the
    spec's ten mine coordinates before being hard-coded into the tests; it
    matched exactly.
  - A source-scanning test asserts `board.js` contains no `document`, `window`,
    or `navigator` references and no `import` / `export`, so the `file://`
    delivery constraint is now enforced by the suite rather than by review.
  - Dual load proved both ways: Node `require` (the suite itself), and a
    classic-script load simulated in a `vm` context with no `module`,
    `require`, or `exports` in scope, which still assigns the `Gridsweep`
    global.
  - `file://` load verified in Chrome (headless, new mode) against
    `file:///Users/res/gridsweep-demo/index.html`: the page rendered the full
    board dump, matching the fixture grid exactly. A throwaway probe page
    installed `window.onerror`, a capturing `error` listener, and
    `console.error` / `console.warn` shims before loading `board.js`; it
    recorded no events other than its own success line, so the page console is
    clean and there was no module or CORS failure. The probe was deleted
    afterwards and is not part of the deliverable.
  - Public surface so far: `Gridsweep.createGame()` returning an object with
    `snapshot()`. The snapshot is a deep copy, exposing per cell `mine`,
    `adjacent`, `revealed`, and `marked`, plus `rows`, `columns`, and
    `mineCount`. `reveal`, `toggleMark`, reset, and game status are Phase 02.
  - Deviation from the plan text, deliberate: the layout is stored in
    `board.js` as an array of eight 8-character strings rather than the spec's
    spaced grid, which is the same data in a form the code can index directly.
    Mine placement is asserted against the spec's coordinates, so the two
    representations are held equal by test.
- Phase 02: complete (2026-09-01). Built red/green.
  - Files changed: `board.js` (reveal / mark / cascade / reset / status added),
    `test/board.test.js` (20 new tests appended).
  - Red: the 20 new tests were appended and run first; every one failed with
    `TypeError: game.reveal is not a function` / `game.toggleMark is not a
    function`, because `createGame()` still returned only `snapshot`.
  - Green: `node --test` reports `pass 27 / fail 0` and exits `0` (7 Phase 01
    tests plus the 20 new ones).
  - Public surface now: `createGame()` returns `snapshot()`, `reveal(row,
    column)`, `toggleMark(row, column)`, and `reset()`. Each mutator returns a
    fresh snapshot, so `ui.js` can re-render straight from the return value.
  - Snapshot additions: `status` (`'in-progress'` / `'won'` / `'lost'`) and
    `losingCell` (`{ row, column }` when lost, otherwise `null`). The status
    strings are also exported as `Gridsweep.IN_PROGRESS` / `.WON` / `.LOST` so
    `ui.js` does not have to hard-code them. Per-cell fields are unchanged:
    `mine`, `adjacent`, `revealed`, `marked`.
  - Cascade is an explicit flood fill that clears `marked` before setting
    `revealed` on every cell it visits, so the spec's non-standard
    unmark-and-continue rule is enforced in code rather than assumed. Both
    fixture regions are asserted as exact revealed-coordinate lists (12 cells
    from (0,0), 6 from (6,7)), and a third test asserts the region is identical
    whether the cascade starts at (0,0) or (0,3).
  - The cascade-through-marks test marks both an interior zero cell (0,2) and a
    border cell (1,3) of the region, then asserts the full 12-cell region is
    revealed and zero marks remain.
  - `allSafeCellsRevealed()` reads only `revealed` and `mine`, never `marked`.
    A test asserts that marking all ten mines does not by itself win.
  - Verified after the change that `board.js` still loads as a classic script:
    executed in a `vm` context with `module`, `require`, and `exports` all
    `undefined`, it still assigns the `Gridsweep` global, cascades 12 cells
    from (0,0), and reports `lost` with `losingCell {row:4,column:1}`. The
    Phase 01 source-scanning test (no `document` / `window` / `navigator`, no
    `import` / `export`) still passes over the enlarged file.
  - Deviation from the plan text, and worth your attention: the plan asked for
    a win test "with all ten marks placed on safe cells". That state cannot
    exist at win time, because winning requires all 54 safe cells revealed and
    a cell can never be both revealed and marked (direct reveal is blocked on
    marks, and cascade clears them). The rule the spec actually means -- the
    win check never consults marks -- is covered by three tests instead: a win
    with zero marks, a win with all ten marks sitting on mines, and a win in a
    game that began with ten marks wrongly placed on safe cells inside the
    cascade region, which the cascade clears on its way through.
  - Small addition beyond the plan's task list: `reveal` and `toggleMark` guard
    against out-of-bounds coordinates and return an unchanged snapshot, with a
    test. This keeps Phase 04's arrow-key edge handling from being the only
    thing standing between the UI and an exception.
- Phase 03: complete (2026-09-01). Built red/green.
  - Files created: `ui.js`, `styles.css`. Files changed: `index.html` (Phase 01
    stub replaced with the real page), `test/board.test.js` (5 tests appended).
  - Red: the five new tests were written and run before `ui.js` or
    `styles.css` existed. Four failed -- `ENOENT` on `ui.js`, no `src="ui.js"`
    in `index.html`, no `styles.css` to scan, no stylesheet link or renderer
    element ids. The fifth ("the test suite never loads ui.js") passes
    trivially by design; it is a regression guard, not a red test.
  - Green: `node --test` reports `pass 32 / fail 0` and exits `0` (27 prior
    tests plus the 5 new ones). `board.js` was not touched this phase.
  - What the tests can and cannot cover: `ui.js` is DOM code and the suite has
    no DOM, so the spec's "never loaded by the tests" rule holds and rendering
    itself is verified in the browser, below. What the suite now does hold are
    the delivery constraints that only fail when `index.html` is
    double-clicked: no `type="module"` and no ES module syntax anywhere the
    browser loads, `board.js` loading before `ui.js`, no absolute or
    protocol-relative URL in `index.html` / `ui.js` / `styles.css`, the
    stylesheet actually linked, the four element ids the renderer writes into
    present, and `require.cache` free of `ui.js` after a full run.
  - One of those scans initially failed on an HTML comment in `index.html`
    that named `type="module"` while warning against it. A comment cannot make
    the browser load a module, so the scan now strips HTML comments before
    matching rather than the comment being reworded to appease it.
  - Risk called out in this phase's Risks section, now decided: cells are built
    once and updated in place (className, textContent, `aria-label`,
    `tabindex`) rather than rebuilt per render. Rebuilding would destroy the
    focused element mid-keystroke and drop focus to `<body>`, which is exactly
    the roving-tabindex trap; updating in place keeps the cursor cell alive
    across every re-render Phase 04 will trigger.
  - Structure: `#board` is `role="grid"`, holding 8 `role="row"` divs of 8
    `role="gridcell"` divs. Verified in Chrome over
    `file:///Users/res/gridsweep-demo/index.html` via `--dump-dom`: 64
    gridcells, 8 rows, 1 grid, exactly one `tabindex="0"` (at (0,0)), every
    cell carrying an `aria-label`, counter reading `10`, status empty, and no
    mine glyph anywhere in the initial DOM.
  - Render states verified in the browser with a throwaway probe page that
    installed `window.onerror`, a capturing `error` listener, and
    `console.error` / `console.warn` shims before `board.js` and `ui.js`
    loaded, then drove one game through every state the renderer paints. The
    probe was deleted afterwards and is not part of the deliverable. Results:
    - hidden: `cell hidden`, empty text, raised `outset` border on the darker
      face, label `Row 8, column 1, hidden`
    - marked: `cell hidden marked`, glyph `⚑` in red on the hidden face
    - revealed blank (cascade interior, count 0): `cell revealed`, empty text,
      flat `solid` border on the lighter face, label `Row 1, column 1, empty`
    - revealed digit: `cell revealed count-1`, text `1`, blue, label `Row 3,
      column 1, 1 adjacent mine`; and `count-2` green at the cascade border,
      label `Row 2, column 6, 2 adjacent mines`
    - revealed mine: `cell revealed mine`, glyph `✹` on a distinct pink face
    - all eight digit colours read off the live stylesheet and confirmed
      distinct (1 blue, 2 green, 3 red, 4 navy, 5 maroon, 6 teal, 7 black,
      8 grey)
  - Roving `tabindex` verified live: after moving the cursor to (3,3), exactly
    one of the 64 cells had `tabindex="0"`, it was (3,3), it was
    `document.activeElement`, and its focus outline computed to `3px solid`.
  - Console was clean: the probe's captured event list came back empty, so no
    page error, no failed subresource, and no module or CORS failure. Chrome's
    own stderr carries `CVDisplayLinkCreateWithCGDisplay` noise on macOS
    headless; that is the browser's display layer, not the page.
  - Hidden cells leak nothing. `snapshot()` still carries `mine` on every cell
    (Phase 05 needs it to open the board at game end), so `ui.js` is the
    boundary that keeps it out of the DOM: a hidden cell over a mine rendered
    as plain `cell hidden` with empty text and a `hidden` label, identical to
    any other hidden cell. This is the answer to the question left open at the
    Phase 02 gate -- the snapshot shape was kept, and the containment moved to
    the renderer.
  - The remaining-mines counter is rendered here rather than deferred, because
    it is derived from the snapshot like everything else on the page: it read
    `9` after one mark was placed. Phase 04 only has to keep calling `refresh`.
  - Deliberately not done, per this phase's Out of scope: no input is wired, so
    arrow keys, `Enter` / `Space`, `F`, clicks, and the "New game" button are
    inert markup for now (Phase 04), and the status line stays empty because
    win and loss messages are Phase 05.
  - Small addition beyond the plan's task list: `ui.js` exposes
    `globalThis.GridsweepUI = { game, refresh, setCursor }`. It is what made
    the probe above possible with no input wired, and it is the documented
    console fast path the Phase 05 note asks for so a win can be checked
    without clicking 54 cells.
- Phase 04: not started.
- Phase 05: not started.

## Handoff notes

- Files this plan creates: `index.html`, `board.js`, `ui.js`, `styles.css`, and
  `test/board.test.js`. No `package.json`, no dependencies, no build step.
- The only automated coverage is over `board.js`; `ui.js` is verified by hand in
  the browser at the end of Phases 03, 04, and 05.
- Phase order front-loads the dual-load risk (Phase 01) and the full rule set
  (Phase 02) so the UI phases build on settled behaviour.

## User gate

- Phase 03 is implemented and awaiting your review. Review `index.html`,
  `ui.js`, `styles.css`, and the 5 tests at the bottom of
  `test/board.test.js`, run `node --test` yourself to watch all 32 pass, and
  open `index.html` from Finder to see the grid.
- What you cannot see yet, by design: nothing is clickable and no key does
  anything. Phase 03 renders; Phase 04 wires input. The "New game" button and
  the status line are present but inert.
- Two questions from the Phase 02 gate that you moved past without answering.
  Neither blocked this phase, and both were resolved in the direction the gate
  recommended, but they are still yours to overturn:
  - `snapshot()` still exposes `mine` on hidden cells. Rather than change the
    snapshot, `ui.js` now holds the line: a hidden cell over a mine renders
    byte-identically to any other hidden cell, verified in the browser. If you
    still want the snapshot itself to withhold `mine`, say so -- it is a
    `board.js` change plus a renderer tweak, and it gets more expensive once
    Phase 05 starts reading `mine` to open the board at game end.
  - The Phase 02 reading of "win with all ten marks placed wrongly" stands
    unchanged; nothing in this phase depended on it.
- One judgement call worth a look: the status line is `role="status"`, a live
  region. The spec says there are "no live-region announcements of cascades or
  game end beyond the status text itself", which reads as permitting exactly
  this one. Without it a screen reader user is never told they won. Say so if
  you read that sentence as forbidding it.
- This is a good point for a checkpoint commit before Phase 04 wires input.
- Next stage if approved:
  `Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md`
- If you want AI-assisted formal review of this phase first:
  `Use the human-gated-spec-driven-ai-development skill to review-phase for 001-gridsweep-plan.md`
