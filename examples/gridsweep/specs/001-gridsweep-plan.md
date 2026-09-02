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
- [ ] Create `board.js` holding the fixed 8x8 layout, board construction, and
      adjacency-count computation, with no DOM references.
- [ ] Give `board.js` a single global assignment for the browser and a
      `if (typeof module !== 'undefined') module.exports = ...` tail for Node.
- [ ] Create `test/board.test.js` using `node:test` and `node:assert/strict`;
      write failing tests first for mine placement, mine count, safe-cell
      count, and the full adjacency grid above.
- [ ] Implement until those tests pass; run `node --test`.
- [ ] Create a minimal `index.html` that loads `board.js` as a classic script
      and renders a plain text dump of the board state, purely to confirm the
      page works when opened directly from disk.
- [ ] Open `index.html` from the filesystem and confirm no console errors and
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
- [ ] Add failing tests for direct `reveal(row, column)` of a safe cell with a
      non-zero count, and for `reveal` of a mine ending the game as a loss with
      the triggering mine recorded.
- [ ] Add failing tests for `toggleMark(row, column)` as a two-state toggle,
      for a direct reveal of a marked cell being a no-op, and for marking being
      rejected on an already-revealed cell.
- [ ] Add failing tests for zero-count cascade using both fixture regions
      above, including that a cascade passing through a marked cell unmarks it,
      reveals it, and continues.
- [ ] Add failing tests for the win condition: revealing all 54 safe cells wins
      with zero marks placed, and also wins with all ten marks placed on safe
      cells.
- [ ] Add failing tests that all input is inert once the game has ended, in
      both the won and lost states, and that a reset returns every cell to
      hidden and unmarked and clears the end state.
- [ ] Implement `reveal`, `toggleMark`, reset, and the readable state snapshot
      until the suite is green; refactor with tests passing.
- [ ] Run the full `node --test` suite.

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
- [ ] Replace the Phase 01 stub `index.html` with the real page: a status area,
      a remaining-mines counter, a "New game" button, and the board container.
- [ ] Create `ui.js` holding all DOM code, loaded as a classic script after
      `board.js`, never required by tests.
- [ ] Render the board as `role="grid"` with rows and cells, roving `tabindex`
      so exactly one cell is tabbable, and an `aria-label` per cell describing
      its state.
- [ ] Create `styles.css` with classic per-digit colours for 1-8, blank
      zero-count cells, and a clearly visible focus outline on the cursor cell.
- [ ] Verify by hand in the browser that hidden, revealed-digit, revealed-blank,
      and marked cells all render distinctly.
- [ ] Run `node --test` to confirm the logic suite is unaffected.

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

- Phase 01: not started.
- Phase 02: not started.
- Phase 03: not started.
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

- Review this plan, particularly the phase boundaries and whether Phase 01's
  throwaway `index.html` stub is worth the step.
- If approved, this is a good point for a checkpoint commit of the working spec
  and plan before implementation begins.
- Next stage if approved:
  `Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md`
- If you want changes instead, ask for plan revisions rather than implementation.
