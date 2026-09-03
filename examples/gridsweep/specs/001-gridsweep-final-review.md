# Final Review — 001-gridsweep

Reviewed 2026-09-01 against `specs/001-gridsweep-spec.md` and
`specs/001-gridsweep-plan.md`, all five phases complete.

Read: `board.js`, `ui.js`, `index.html`, `styles.css`, `test/board.test.js`,
the spec, the plan (including the Phase 05 acceptance sweep), and
`001-gridsweep-questions-01.md`.

Verified rather than assumed:

- `node --test` → `tests 42 / pass 42 / fail 0`, exit `0`.
- Swept every zero-count cell on the shipped board: a cascade never reveals a
  mine from any starting cell.
- Revealing all 54 safe cells directly reaches `won`.
- Cascade queue does no redundant work: the 12-cell region costs exactly 12
  queue pops.
- Two brittleness claims below were reproduced on a scratch copy, not inferred.

## Executive summary

The implementation matches the spec. Every acceptance criterion holds, the
board logic is genuinely DOM-free, the delivery constraints (`file://`, classic
scripts, no network, no build step) are enforced by tests rather than by
memory, and the plan's evidence trail is unusually honest — including two
deviations it flags against itself.

Architecture is sound: one rule engine, one renderer, a snapshot boundary
between them, and no game rule restated in `ui.js`. The Phase 05 restructuring
of the renderer around a single `cellKind` decision is the right call and is
the strongest piece of design in the project.

Nothing blocks acceptance. What follows is one piece of dead code, one real
piece of test debt, and a short list of cleanups.

## Spec compliance

Compliant on every acceptance criterion. Spot-checks:

- Mark semantics are exactly as specified: two-state, blocking on direct
  reveal, cleared by cascade, never consulted by the win check
  ([board.js:122-158](board.js#L122-L158)).
- No restart key exists, and the suite actively guards against one being added
  ([test/board.test.js:499-509](test/board.test.js#L499-L509)).
- Zero-count cells render blank because they carry no `count-N` class at all,
  rather than by a special case
  ([styles.css:121-130](styles.css#L121-L130)).

Two deviations the plan raised, both correctly resolved:

- The plan's "win with all ten marks on safe cells" test describes a state that
  cannot exist. The substitute coverage (win with zero marks, with ten marks on
  mines, and with ten wrong marks the cascade clears) tests the rule the spec
  actually means. Agreed.
- Marks on mines are replaced by the mine glyph at game end. The spec is
  readable both ways and the literal reading was taken. Agreed, and it should
  stay documented in the spec rather than only in the plan.

One open reading remains, and it is yours to close, not mine:

- Criterion 6 says "further input has no effect" once the game ends. Reveal and
  mark are inert; cursor movement (arrows, and clicks via `setCursor`) is not.
  The justification in the plan — that locking navigation traps a screen-reader
  user on a `role="grid"` — is the right instinct, and I would keep the current
  behaviour. But the criterion as written does not say that, so either the
  behaviour changes or the spec sentence gains the exception.

  > Decision: Keep current behavior

## Architecture assessment

- **Separation of concerns**: clean. `board.js` has no DOM reference and
  `ui.js` has no rule. The snapshot deep-copy means the renderer cannot reach
  back into game state even by accident
  ([board.js:165-187](board.js#L165-L187)).
- **Cohesion**: high in both files. `ui.js`'s split of `cellKind` → three
  lookup tables means the glyph, the classes, and the `aria-label` cannot
  disagree about what a cell is ([ui.js:82-156](ui.js#L82-L156)). This is the
  design decision most worth preserving through any future change.
- **Coupling**: `ui.js` depends on `Gridsweep` only through `createGame` and
  the three status constants. Verified by grep: nothing else off that global is
  read anywhere.
- **Testability**: the rule engine is fully testable and well covered. The
  renderer is, by the spec's own constraint, not loaded by the suite — which
  produces the one substantive debt item below.
- **KISS/YAGNI**: mostly good. Three small violations listed below.

## Critical issues

None. No must-fix.

## Important improvements

### 1. `GridsweepUI` is dead code that publishes the live game object

[ui.js:308-312](ui.js#L308-L312):

```js
globalThis.GridsweepUI = {
  game: game,
  refresh: refresh,
  setCursor: setCursor,
};
```

Its comment calls it "the fast path the plan asks for when checking a win
without clicking 54 cells by hand" — but the Phase 05 evidence records that the
browser driver reads "the DOM only -- never the game object", and the win was
driven by keyboard with "no console fast path". Grep confirms the only
occurrence of `GridsweepUI` in the repo is this assignment.

So it is a scaffold that outlived its use, and it hands any script on the page
a mutable handle to game state that the renderer would then paint. Delete it.

> Decision: Delete the unneeded scaffolding.

### 2. A third of the suite tests source text, not behaviour

15 of the 42 tests assert regexes over `ui.js`, `styles.css`, and `index.html`.
That was a reasonable response to the spec's "`ui.js` is never loaded by the
tests" constraint, and a few of them earn their place. But several are coupled
to formatting and identifier names, so ordinary refactoring goes red without
anything being broken. Reproduced on a scratch copy:

- Changing `var CURSOR_STEPS` / `REVEAL_KEYS` / `MARK_KEYS` to `const` — a
  no-op for the browser — fails 2 tests (40/42). `bindingTable` matches the
  literal string `var ${name} = ` ([test/board.test.js:475-483](test/board.test.js#L475-L483)).
- Changing `background:` to `background-color:` in `.cell.exploded` fails 1
  test. `declaration()` requires the shorthand by name
  ([test/board.test.js:690-698](test/board.test.js#L690-L698)).

Two more of the same shape, by inspection: `'ui.js reads the board only through
the public surface'` requires the variable be named exactly `game`, and `'the
New game button is the only way to reset'` depends on `indexOf` offsets, so
moving the button wiring earlier in the file breaks it.

The converse is worse than the false alarms: these tests stay green while the
renderer is completely broken, because none of them ever runs it.

Recommendation — narrow rather than delete:

- **Keep** the checks that guard delivery constraints which fail silently in
  the browser and cannot be caught any other way: no `type="module"`, no
  `import`/`export`, no `http(s)://` or protocol-relative URL, `board.js`
  before `ui.js`, the four element ids, and no `document`/`window` in
  `board.js`. These are stable — they match syntax the code must never contain,
  not syntax it happens to contain today.
- **Re-aim or drop** the ones that pin identifier names, `var` vs `const`,
  declaration order, and CSS property spelling. Where the underlying rule is
  worth holding (no restart key; one reset call site; renderer never names a
  status literal), the durable form of the check is "this file contains no
  match for the forbidden thing" — which is how the `key === '...'` and the
  `'won'`/`'lost'` guards are already written, and those are the good ones.
- Do **not** solve this by loading `ui.js` under a DOM stub. That contradicts
  the spec's structure constraint, and the headless-Chrome sweep in Phase 05
  already covers renderer behaviour better than a stub would.

This belongs on the debt register either way — see below.

> Decision: Narrow the scripts focusing on not allowing tests to stay green while renderer is completely broken.  Implement the suggestions above.


## Cleanup opportunities

- **Narrow the public surface.** `Gridsweep.ROWS`, `.COLUMNS`, and `.LAYOUT`
  are exported ([board.js:197-205](board.js#L197-L205)) and have zero consumers
  in `ui.js` or the tests — the snapshot already carries `rows`/`columns`.
  `LAYOUT` in particular puts the mine positions on the public API for no
  reason. Export `createGame` and the three status constants.
- **`countMines()` recomputes a constant.** [board.js:62-70](board.js#L62-L70)
  rescans all 64 layout characters on every `snapshot()` call, and `reveal`
  can call `snapshot()` several times. The value is fixed at 10 by a layout
  that never changes; compute it once at module scope. Cheap at this size —
  this is about the code saying what it means, not about speed.
- **Two copies of the 8-neighbour walk.** `countAdjacentMines`
  ([board.js:31-42](board.js#L31-L42)) and `cascadeFrom`
  ([board.js:88-105](board.js#L88-L105)) each write the `dr`/`dc` double loop,
  and the first re-implements its own bounds check inline while `inBounds`
  exists 30 lines below it ([board.js:76-78](board.js#L76-L78)). Hoist
  `inBounds` above both, and consider one `forEachNeighbor(row, column, fn)`.
- **CSS correctness rests on file order.** `.cell.exploded` and
  `.cell.wrong-mark` beat `.cell.mine` / `.cell.hidden` only because they sit
  lower in the file — documented in a comment
  ([styles.css:139-142](styles.css#L139-L142)) and held by a test asserting
  `indexOf` positions. Writing them as `.cell.mine.exploded` and
  `.cell.marked.wrong-mark` makes the precedence explicit in the selector and
  lets that assertion go away.
- **Test helpers.** `revealedCoordinates`, `markedCoordinates`, and
  `mineCoordinates` are three copies of the same 8×8 scan differing only in the
  predicate. One `coordinatesWhere(snapshot, predicate)` covers all three.
- **`moveCursor` clamps against the DOM.** [ui.js:226-231](ui.js#L226-L231)
  uses `cellElements.length` / `cellElements[0].length` as the board
  dimensions. Harmless today, but the snapshot's `rows`/`columns` are the
  authority; the element array standing in for them is the kind of substitution
  that goes wrong quietly.

> Decision: Do suggested cleanup.

## Technical debt register

1. **No automated coverage of renderer behaviour.** Structural, accepted, and
   correctly mitigated by the Phase 05 headless-Chrome sweep — but that sweep
   lives in the scratchpad and is not in the repo, so it does not re-run. Any
   future change to `ui.js` is guarded only by grep tests and by hand.
   *If this project ever grows, promoting that driver into the repo is the
   highest-value single change available.*
   > Decision: promote the driver into the repo.

2. **15 source-grep tests, several coupled to formatting.** As above. Cost is
   paid on every refactor of `ui.js` or `styles.css`.
   > Decision: cleanup

3. **Criterion 6 has two readings and the code takes one of them.** Not a
   defect; an unclosed decision. Close it in the spec.
   > Decision: Close in spec with code as source of truth.

4. Manual verification evidence (screenshots, the CDP driver) is recorded in
   the plan but the artifacts themselves are gone. Fine for a demo; worth
   knowing if the loss/win presentation is ever disputed.
   > Decision: We can regenerate screenshots and CDP driver if needed.  This is ok for demo.

## Go / no-go recommendation

**Go.** The work satisfies the spec, the suite passes, and there is no
must-fix. Items 1 and 2 under Important improvements are worth a single
bounded cleanup pass before you call it finished, but neither is a defect in
the shipped game.

## User gate

- Review this final review against your own reading of the code, in particular
  the two Important improvements and the open question on acceptance criterion
  6.
- If you accept it as is, the work is complete — commit and you are done.
- If you want the cleanup, ask for a bounded improvement pass against this same
  spec and plan. Suggested scope: delete `GridsweepUI`, narrow the `Gridsweep`
  export, re-aim the brittle grep tests, hoist `inBounds` and `countMines`, and
  make the two end-state CSS selectors explicit. No spec or plan change needed
  for any of it.

Example prompts:

```
Use the human-gated-spec-driven-ai-development skill to make a bounded
improvement pass for 001-gridsweep-plan.md covering the Important improvements
and Cleanup opportunities in 001-gridsweep-final-review.md
```

```
Use the human-gated-spec-driven-ai-development skill to review-spec for
specs/002-spec.md
```

## Approval state

- draft pending user review
> Decision: approved draft

## Improvement pass 01 — applied 2026-09-02

Bounded pass covering the decisions recorded above under **Important
improvements** and **Cleanup opportunities**. Full detail and evidence are in
[001-gridsweep-plan.md](001-gridsweep-plan.md) under "Improvement pass 01".

| Item | Decision | State |
| --- | --- | --- |
| Imp. 1 — dead `GridsweepUI` global | delete the scaffolding | done |
| Imp. 2 — source-grep tests | narrow, per the keep / re-aim list | done |
| Cleanup — narrow the `Gridsweep` export | do it | done |
| Cleanup — `countMines()` recomputes a constant | do it | done |
| Cleanup — two copies of the 8-neighbour walk | do it | done |
| Cleanup — CSS correctness rests on file order | do it | done |
| Cleanup — three duplicate test helpers | do it | done |
| Cleanup — `moveCursor` clamps against the DOM | do it | done |
| Debt 1 — promote the browser driver into the repo | promote it | **not done — out of the pass's scope** |
| Debt 2 — brittle source-grep tests | cleanup | done, as Imp. 2 |
| Debt 3 — criterion 6 has two readings | close in spec, code as source of truth | **not done — out of the pass's scope** |
| Debt 4 — manual verification artifacts are gone | acceptable for a demo | no action |

`node --test` after the pass: `tests 43 / pass 43 / fail 0`. The renderer was
re-verified in headless Chrome, and the review's own sweeps (cascade never
reveals a mine, 54 safe cells reach `won`, 12 cells cost 12 queue pops) were
re-run against the refactored engine with identical results.

Both brittleness claims the review reproduced now pass under the mutation that
used to break them, and eight mutations that *should* be caught were confirmed
to still go red. The list is in the plan.

What this pass did **not** fix, because it is what the review said it was: the
suite still cannot notice a broken renderer. Debt item 1 is the fix, its
decision is recorded, and it is the natural next pass.

## Improvement pass 02 — applied 2026-09-02

Bounded pass covering technical debt register items **1** and **3**, the two
left open after pass 01. Full detail and evidence are in
[001-gridsweep-plan.md](001-gridsweep-plan.md) under "Improvement pass 02".

| Item | Decision | State |
| --- | --- | --- |
| Debt 1 — promote the browser driver into the repo | promote it | done |
| Debt 3 — criterion 6 has two readings | close in spec, code as source of truth | done |
| Debt 2 — brittle source-grep tests | cleanup | done in pass 01 |
| Debt 4 — manual verification artifacts are gone | acceptable for a demo | no action |

The driver is `tools/chrome-driver.js` and the coverage is
`test/browser.test.js`, nine tests that open `index.html` over `file://` in
headless Chrome, drive it with real key and mouse events, and assert only
against the DOM. Both are Node built-ins only — the driver speaks the DevTools
protocol over Chrome's pipe transport rather than a WebSocket, which is what
lets it add no package while still working on Node 18.

`node --test` after the pass: `tests 54 / pass 54 / fail 0`, about 2.3s. On a
machine with no browser: `pass 45 / skipped 9 / fail 0`, exit `0`.

The debt is genuinely paid rather than merely addressed: of thirteen renderer
mutations tried on scratch copies, **eleven were invisible to the old suite and
all thirteen are caught now** — a board that draws nothing, a flag that does not
appear, a status line that stays empty, a cursor that wraps, labels that stop
describing cells, a context menu that opens. The table is in the plan.

Criterion 6 is closed in the spec the way the review recommended and the
developer decided: reveal and mark go inert at the end, cursor movement stays
live so the finished board can be read, and the reason — not trapping a
screen-reader user inside the `role="grid"` — is written down next to the rule.

No shipped file changed. `board.js`, `ui.js`, `styles.css` and `index.html` are
byte-for-byte what pass 01 left, which is what makes the mutation table
meaningful.

## Approval state

- draft pending user review
- approved by developer, with decisions recorded inline
- improvement pass 01 applied 2026-09-02; debt items 1 and 3 still open
- improvement pass 02 applied 2026-09-02; all four debt register items now
  closed or explicitly accepted
