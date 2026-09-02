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
- [x] Wire arrow keys to move the cursor one cell without wrapping at edges.
- [x] Wire `Enter` and `Space` to reveal the focused cell, and `F` to toggle a
      mark; bind no other keys, and in particular no restart key.
- [x] Wire left click to reveal and right click to toggle a mark, suppressing
      the context menu over the board only.
- [x] Update the remaining-mines counter as ten minus marks placed.
- [x] Wire the "New game" button to reset state and clear the end state,
      replaying the same fixed layout.
- [x] Play through by keyboard alone and confirm reveal, cascade, marking,
      mark-blocks-reveal, and reset all behave per the spec.
- [x] Run `node --test`.

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
  the board's own handlers. Retired: the handler is bound to `#board` and calls
  `preventDefault` only after it has decided the key is one it binds, verified
  in the browser (see evidence).

### Notes
- Input handlers call only the Phase 02 public surface and re-render from the
  returned snapshot.

## Phase 05 - End-state presentation and acceptance sweep

Goal: present win and loss correctly and verify every acceptance criterion in
the spec end to end.

### Tasks
- [x] On a loss, highlight the triggering mine distinctly, reveal all other
      mines, and mark marks left on safe cells as incorrect.
- [x] On a win, lock the board and show all remaining mines.
- [x] Display "You lose" and "You win" status messages in the status area.
- [x] Confirm all input is inert after the game ends until "New game" is
      pressed.
- [x] Walk the spec's Acceptance Criteria list one item at a time and record
      the result of each in the Implementation evidence section below.
- [x] Run the full `node --test` suite and record the output.

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
- Phase 04: complete (2026-09-01). Built red/green.
  - Files changed: `ui.js` (input wiring added), `test/board.test.js` (5 tests
    appended). `board.js`, `index.html` and `styles.css` were not touched --
    this phase is wiring only, and the button, counter and status element
    already existed from Phase 03.
  - Red: the 5 new tests were written and run first; all 5 failed against the
    Phase 03 `ui.js`, which had no binding tables, no listeners and no
    `newGameElement`.
  - Green: `node --test` reports `pass 37 / fail 0` and exits `0` (32 prior
    tests plus the 5 new ones).
  - Two of the five red tests failed for a reason in the *test*, not the code,
    and were corrected while still red: one assertion chained comparison
    operators (`resetAt > keydownAt === resetAt > buttonAt`, which parses as
    nonsense), and one searched for the next `addEventListener` from an offset
    that landed inside the button's own call. Both now do what they claim.
  - What the suite holds for this phase, given that it may never load `ui.js`:
    the three binding tables are the entire keyboard surface (`CURSOR_STEPS`,
    `REVEAL_KEYS`, `MARK_KEYS`), and no handler compares `event.key` to a
    literal of its own -- which is what stops a restart key, forbidden by the
    spec, from being added quietly later. Also: context-menu suppression is
    bound to the board and not to `document` or `window`; `ui.js` touches the
    board only through `reveal` / `toggleMark` / `reset` / `snapshot`, so no
    game rule can be restated in the renderer; and `game.reset()` has exactly
    one call site, inside the New game click handler.

  ### Browser verification

  - `ui.js` behaviour was driven in headless Chrome against the real
    `file:///Users/res/gridsweep-demo/index.html` -- not a probe copy of the
    page -- using real trusted input through the DevTools protocol
    (`Input.dispatchKeyEvent` / `Input.dispatchMouseEvent`). The driver is
    Node built-ins only (`WebSocket`, `fetch`), lives in the scratchpad, and
    is not part of the deliverable; the repo gained no throwaway files this
    phase. 29 checks, all passing, run twice:
    - arrows clamp at every edge: `ArrowUp`/`ArrowLeft` at (0,0) leave the
      cursor at (0,0); nine `ArrowDown` then nine `ArrowRight` land on (7,7)
      and stop there; no wrap in either direction
    - exactly one cell carries `tabindex="0"` throughout, and it is always
      `document.activeElement`
    - `F` marks and the counter drops to 9; `Enter` and `Space` on that marked
      cell both do nothing; shift+`F` unmarks and the counter returns to 10
    - a marked cell reports `Row 1, column 1, marked` to a screen reader
    - with (0,2) marked, `Enter` on (0,4) cascades the full 12-cell region,
      clears the mark it passed through, and returns the counter to 10
    - a revealed zero-count cell is blank with an `empty` label; a revealed
      count cell shows its digit with an `N adjacent mines` label
    - left click reveals and moves the cursor to the clicked cell; right click
      marks, right click again unmarks, and right click on an already-revealed
      cell does nothing
    - the context menu is suppressed over the board and left alone off it,
      measured by a document-level listener reading `defaultPrevented`: three
      board right-clicks recorded `true`, one right-click on the page margin
      recorded `false`
    - clicking a mine reveals it as `cell revealed mine` and ends the game;
      afterwards `Enter`, `F`, `Space`, a left click and a right click all
      leave the board byte-identical
    - shift+Tab from the board reaches the New game button (it sits before the
      board in the DOM), `Space` activates it, and the board comes back fully
      hidden and unmarked with the counter at 10, the status empty, and the
      cursor home at (0,0); the board is then playable again
    - no console message, page error or failed subresource was captured across
      the whole run
  - The plan's stated risk was measured directly rather than by eye. A
    document-level `keydown` listener recorded `defaultPrevented` for every key
    pressed: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`,
    `Space`, `f` and `F` all `true`; `r`, `n`, `Escape` and `Backspace` all
    `false`. The game suppresses the default action of exactly the keys it
    binds and swallows nothing else, so Tab and browser shortcuts still work
    from inside the board.
  - The window was sized 420x260 so the page genuinely scrolls, which is what
    makes that check meaningful rather than vacuous.
  - Driver artifact worth recording so nobody re-debugs it: a CDP
    `keyDown` carrying `text` that the page does *not* consume makes headless
    Chrome auto-repeat it thousands of times. It showed up only on the unbound
    keys, since every bound key calls `preventDefault`. Sending every key as
    `rawKeyDown` instead keeps `event.key` correct and is what the assertions
    run against. Some phantom `Unidentified` repeats survive; they are all
    `defaultPrevented: false`, so if anything they strengthen the claim that
    unbound keys are left alone. This is the test harness, not the page.

  ### Judgement calls, and one thing to overturn if you disagree

  - Arrow keys still move the cursor after the game has ended. Reveal and mark
    are inert, as the spec requires, but locking navigation too would trap a
    screen-reader user who wants to read the final board, and arrow navigation
    is the expected ARIA behaviour for a `role="grid"` regardless of game
    state. If you read "further input has no effect" as covering cursor
    movement as well, say so and it is a two-line change.
  - The browser scrolls to keep the cursor cell in view as it moves. That is
    `element.focus()` doing its job, not the arrow key's own scroll, which is
    suppressed. Preventing it (`focus({ preventScroll: true })`) would let the
    cursor walk off-screen on a small window, so it was left in place, and a
    check asserts the cursor cell stays within the viewport.
  - "New game" sends the roving tabindex home to (0,0) but does not steal
    focus from the button the player just pressed, so a mouse user is not
    yanked into the board. A keyboard player presses Tab once to get back.
  - Pointer input moves the cursor to the clicked cell, so the visible cursor
    and the roving tabindex never disagree with where the player last acted.
  - Small addition beyond the plan's task list: the keyboard handler ignores
    events carrying Alt, Ctrl or Meta, so browser and OS chords are untouched.
    This narrows the binding surface rather than widening it.
  - The status line stays empty, per this phase's Out of scope. Win and loss
    messages are Phase 05.
- Phase 05: complete (2026-09-01). Built red/green.
  - Files changed: `ui.js` (end-state rendering), `styles.css` (end-state
    rules), `test/board.test.js` (5 tests appended). `board.js` and
    `index.html` were not touched: everything this phase needed -- `status`,
    `losingCell`, `mine` on every cell, and the status element -- already
    existed from Phases 02 and 03.
  - Red: the 5 new tests were written and run first. Four failed against the
    Phase 04 files (no `END_MESSAGES` table, no `Gridsweep.WON` / `.LOST`
    reference, no `losingCell` read, no `.cell.exploded` rule in the
    stylesheet). The fifth is declared in its own comment as a regression
    guard rather than a red test: it pins the snapshot contract the renderer
    newly leans on, so it passed from the start.
  - Green: `node --test` reports `tests 42 / pass 42 / fail 0` and exits `0`
    (37 prior tests plus the 5 new ones).
  - The renderer was restructured rather than extended. `cellKind` now decides
    once what a cell is -- one of `hidden`, `marked`, `empty`, `count`, `mine`,
    `exploded`, `wrong-mark` -- and the glyph, the class list, and the
    `aria-label` are three lookups off that one kind. Before this phase each of
    the three walked the cell's fields itself, which is exactly the shape that
    lets a screen reader and the screen disagree once a fourth end-state case
    is added.
  - The end-state rule lives in one line of `cellKind`: a mine is drawn as a
    mine when the game has ended *or* it was revealed, and a mark is drawn as
    wrong once the game has ended. Nothing else in `ui.js` branches on the
    ending.
  - Marks on mines are not spared at the end. The spec asks for every mine
    drawn as a mine on both endings, so a correct mark is replaced by the mine
    it was covering rather than kept as a flag. That is a readable-either-way
    sentence in the spec; the literal reading was taken, and the win
    screenshot below shows what it looks like.
  - `styles.css` gained `.cell.exploded` (a hot red face, white glyph),
    `.cell.wrong-mark` (pale red face, red cross), and `.board.ended
    .cell.hidden { cursor: default }`. A test asserts `.cell.exploded` sits
    after `.cell.mine` in the file, because the two have equal specificity and
    land on the same element, so source order is the whole of the cascade
    here.
  - A wrong mark is separated from a mine three ways, not one: it keeps the
    raised unopened border (mines are flat and revealed), its face is paler,
    and its glyph is a red cross rather than a black mine. Colour alone is
    never the signal.

  ### Browser verification and the acceptance-criteria sweep

  - Driven in headless Chrome against the real
    `file:///Users/res/gridsweep-demo/index.html` with real trusted input
    through the DevTools protocol (`Input.dispatchKeyEvent` /
    `Input.dispatchMouseEvent`). The driver is Node built-ins only, lives in
    the scratchpad, and is not part of the deliverable; the repo gained no
    throwaway files this phase. 45 checks, all passing, run three times. Every
    assertion reads the DOM only -- never the game object -- so it is about
    what a player can actually see.
  - The whole board was won by keyboard alone: Tab in from the body, arrows to
    every cell in boustrophedon order, `F` on two mines along the way, `Enter`
    on all 54 safe cells. No console fast path was used, so the win path and
    the keyboard-only claim were proved by the same run.
  - Spec Acceptance Criteria, walked one at a time:
    1. *Revealing a mine ends the game as a loss.* Verified. `Enter` on (2,1)
       set the status line to `You lose` and locked the board.
    2. *Revealing the last of the 54 safe cells wins, regardless of marks.*
       Verified. The keyboard playthrough above ended on `You win` with two
       marks still standing on mines and the counter reading `8`.
    3. *Every revealed safe cell with adjacent mines shows its count; a
       zero-count cell is blank.* Verified. (0,0) rendered empty with label
       `Row 1, column 1, empty`; (0,5) rendered `1` as `count-1`; (1,5)
       rendered `2` as `count-2`. The win screenshot shows the complete digit
       grid, which matches the adjacency fixture at the top of this plan.
    4. *A zero-count reveal cascades, unmarking and revealing marked cells it
       reaches.* Verified. With (0,2) marked, `Enter` on (0,4) revealed 12
       cells, left (0,2) as `cell revealed`, and returned the counter to `10`.
    5. *A direct reveal of a marked cell has no effect until the mark is
       removed.* Verified. On the marked (0,2), both `Enter` and `Space` left
       it `cell hidden marked`.
    6. *Once the game has ended, further input has no effect until "New game"
       is pressed.* Verified on both endings. After the loss, `Enter`, `Space`,
       `f`, `r`, `Escape`, a left click and a right click left every cell's
       class, text and label identical, the status line still `You lose`, and
       the counter still `9`. Same after the win. One documented exception
       below.
    7. *The game is fully playable using only the keyboard.* Verified. Entry,
       movement, marking, revealing, the full win, and "New game" (reached by
       Tab, activated with `Space`) were all keyboard-only.
    8. *The board logic has automated coverage runnable with `node --test`, and
       the suite passes.* Verified: `tests 42 / pass 42 / fail 0`, exit `0`.
  - Loss presentation, checked against the spec sentence by sentence: the mine
    that was hit rendered `cell revealed mine exploded` with label `Row 3,
    column 2, mine, the one that ended the game`, painted `rgb(208, 32, 32)`
    against `rgb(232, 180, 180)` for the nine others; all ten mines showed the
    mine glyph; exactly one cell carried `exploded`; the mark left on the safe
    cell (3,0) rendered `cell hidden marked wrong-mark` showing a cross, with
    label `Row 4, column 1, incorrect mark`; and untouched safe cells stayed
    plain `cell hidden` -- a loss opens the mines, not the board.
  - Win presentation: all ten mines rendered `cell revealed mine`, including
    the two the player had marked; no cell carried `exploded`; every safe cell
    was revealed; the board carried `board ended`.
  - "New game" after the loss cleared the status line, dropped `ended`, returned
    all 64 cells to `cell hidden`, reset the counter to `10`, and sent the tab
    order home to (0,0). The board was then played to a win, so the reset is
    not merely cosmetic.
  - The console stayed clean across the whole run: no console message, no page
    error, no failed subresource. Chrome's own stderr carries the usual macOS
    headless `CVDisplayLinkCreateWithCGDisplay` noise, which is the browser's
    display layer, not the page.
  - Two screenshots were taken at the two end states and read back to confirm
    the board looks the way the assertions claim. They live in the scratchpad,
    not the repo.

  ### Judgement calls

  - The Phase 04 call that navigation stays live after the game ends now
    extends to pointer input: a click on a finished board moves the cursor,
    because `ui.js` calls `setCursor` after every pointer action and the
    board's own `reveal` is the thing that has gone inert. This is measured
    rather than assumed -- the inertness checks above compare each cell's
    class, text and label and deliberately exclude the roving `tabindex`, and
    a separate check records the cursor moving to the clicked cell. If you read
    the spec's "further input has no effect" as covering cursor movement, this
    is still the two-line change it was at the Phase 04 gate, and it is now
    the only open reading of that criterion.
  - `aria-disabled="true"` on the finished grid was considered and left out.
    The spec's accessibility list is explicit and does not include it, the
    status line already announces the ending, and the cell labels already
    change to name every mine. The visual lock is the `.board.ended` class
    only.
  - The remaining-mines counter is left alone at the end rather than zeroed or
    hidden. It is defined in the spec as ten minus marks placed, and that stays
    true and readable on a finished board.
  - `END_MESSAGES` is keyed by the status constants from `board.js`, and a test
    asserts `ui.js` contains no `'won'` / `'lost'` / `'in-progress'` literal, so
    the renderer cannot drift from the board's own vocabulary.

## Handoff notes

- Files this plan creates: `index.html`, `board.js`, `ui.js`, `styles.css`, and
  `test/board.test.js`. No `package.json`, no dependencies, no build step.
- The only automated coverage is over `board.js`; `ui.js` is verified by hand in
  the browser at the end of Phases 03, 04, and 05.
- Phase order front-loads the dual-load risk (Phase 01) and the full rule set
  (Phase 02) so the UI phases build on settled behaviour.

## User gate

- Phase 05 is implemented and the plan is complete. All five phases are done,
  `node --test` passes 42/42, and every acceptance criterion in the spec has
  been walked and recorded in the evidence above.
- Review the end-state block in `ui.js` (`cellKind` and the three lookup
  tables), the three new rules at the bottom of `styles.css`, and the five
  tests at the end of `test/board.test.js`. Run `node --test` yourself, then
  open `index.html` from Finder.
- Try in particular: mark a safe cell, then walk into a mine -- the board
  should open, the mine you hit should be the red one, your wrong mark should
  become a red cross, and safe cells you never touched should stay closed.
  Then press "New game" and confirm the board comes back clean.
- Two readings of the spec are still yours to overturn, and both are cheap to
  change now:
  - navigation stays live after the game ends, for the keyboard and now for
    the mouse too, so a player can read the finished board. Reveal and mark are
    inert as required.
  - a correctly marked mine is redrawn as a mine at the end rather than kept as
    a flag, following the spec's "all remaining mines are shown as mines"
    literally.
- Also still unruled from earlier gates: `snapshot()` exposes `mine` on hidden
  cells with `ui.js` holding the line, and the status line is `role="status"`.
- This is a good point for a checkpoint commit.
- If you want AI-assisted formal review of this phase:
  `Use the human-gated-spec-driven-ai-development skill to review-phase for 001-gridsweep-plan.md`
- Or, since this was the last phase:
  `Use the human-gated-spec-driven-ai-development skill to final-review for 001-gridsweep-plan.md`
