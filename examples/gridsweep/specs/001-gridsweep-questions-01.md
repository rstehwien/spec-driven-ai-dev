# Questions for Spec 001-gridsweep

## Repo Context Checked

- `specs/001-gridsweep-spec.md`: the only content in the repository.
- Repository root and `git log`: greenfield. No source, tests, `package.json`,
  tooling config, readme, or prior art. Nothing in the repo constrains the
  answers below, so none of these questions could be resolved locally.
- Board layout in the spec was verified by hand: 10 mines, at
  (r1,c6), (r2,c1), (r2,c4), (r3,c6), (r4,c1), (r4,c7), (r5,c3), (r6,c5),
  (r7,c0), (r7,c3), with rows and columns zero-indexed from the top-left.
  This matches the stated ten mines and leaves 54 safe cells.

## Must Answer

### Topic: Win condition

1. The spec defines only how the game is lost. What ends the game as a win?
   There are 54 safe cells; nothing says what happens when the last one is
   revealed, and "Once the game has ended, further input has no effect" implies
   a win state exists without ever defining it.
   - Proposed fallback: the game is won the moment all 54 safe cells are
     revealed, regardless of flag placement. On a win the board locks, all
     remaining mines are shown as mines, and a "You win" status message is
     displayed.
   - Cost if wrong: cheap now, expensive later. The win predicate sits at the
     centre of the state machine and is the thing tests assert against; changing
     it after the logic module and its test suite exist means reworking both.

  > Decision: Use proposed fallback.

2. Does correct flagging play any part in winning — for example, must all ten
   mines be flagged, or must there be no incorrect flags?
   - Proposed fallback: no. Flags are a player aid only and are never consulted
     by the win check. Revealing all safe cells wins even with zero flags placed
     or with all ten flags placed wrongly.
   - Cost if wrong: moderate. Coupling flags to the win condition makes flag
     state part of the core logic rather than a marking layer, and adds a second
     win path that needs its own tests.

  > Decision: Use proposed fallback.

### Topic: How tests run without a build step

3. The spec requires automated tests a reviewer can run and watch pass, and
   also forbids package installation and a dev server. Those constraints
   together rule out every third-party test runner. How should the suite run?
   - Proposed fallback: Node's built-in test runner — `node --test` over a
     `test/` directory using `node:test` and `node:assert/strict`. It installs
     nothing, needs no config, prints a pass/fail summary, and exits non-zero on
     failure. Requires Node 18 or newer on the reviewer's machine.
   - Cost if wrong: low if caught now, annoying later. If the reviewer must not
     be assumed to have Node, the alternative is a `tests.html` page opened in
     the browser with a small hand-written assertion harness, which changes the
     test file format but not the logic under test.

  > Decision: Used proposed fallback.

4. Related and load-bearing: a browser blocks `<script type="module">` and all
   ES module imports when the page is opened over `file://`, which is exactly
   how the spec says the game must run. So the game cannot use `import` /
   `export` across files, yet the test runner needs to load the board logic
   from outside the page. How should the logic be shared?
   - Proposed fallback: put all board logic in `board.js` with no DOM
     references, loaded by `index.html` as a plain classic script
     (`<script src="board.js"></script>`, no `type="module"`) that assigns to a
     single global, and ending with a CommonJS tail
     (`if (typeof module !== 'undefined') module.exports = ...`) so `node --test`
     can `require` the same file. `ui.js` holds all DOM code and is never
     imported by tests. No `package.json`, so `.js` stays CommonJS in Node.
   - Cost if wrong: high if discovered during implementation. The wrong choice
     here is only found when the reviewer double-clicks `index.html` and gets a
     blank page with a CORS error in the console. Choosing instead to inline
     everything into one HTML file would make the logic untestable from Node and
     force answer 3 to the browser-harness option.

  > Decision: Use proposed fallback.

### Topic: Marking suspected mines

5. What are the marking states, and does a marked cell resist being revealed?
   - Proposed fallback: a two-state toggle, marked or unmarked, with no
     question-mark third state. A marked cell cannot be revealed until it is
     unmarked, which protects the player from losing to a stray keypress.
   - Cost if wrong: low. Adding a third state or letting reveal override the
     mark is a contained change to one transition, though it does invalidate the
     tests written for the toggle.

  > Decision: Use proposed fallback

6. When a zero-count cascade reaches a cell the player has marked, does it
   reveal that cell or stop there?
   - Proposed fallback: the cascade stops at marked cells and leaves them
     marked and hidden, consistent with question 5 treating a mark as reveal
     protection. Cascade continues around them.
   - Cost if wrong: low mechanically, but this is a genuine edge case that will
     be encoded directly in the flood-fill test fixtures, so it is worth
     deciding before those are written.

  > Decision: As mentioned before the flag state is just for the user.  If they marked a cell incorrectly, the cascade should unflag and reveal.  Then continue as if it wasn't flagged at all.

### Topic: Input

7. Which keys do what? "Playable with the keyboard alone" fixes the
   requirement but not the bindings.
   - Proposed fallback: arrow keys move a visible cursor one cell and do not
     wrap at the edges; `Enter` or `Space` reveals the focused cell; `F`
     toggles a mark on the focused cell. No other bindings.
   - Cost if wrong: trivial. Bindings live in one input-handling map.

  > Decision: Use proposed fallback.

8. Is mouse or touch input supported as well? The spec never mentions it, but
   the non-goals exclude "chording (revealing neighbours by clicking a
   satisfied number)", which reads as though clicking exists.
   - Proposed fallback: yes — left click reveals, right click toggles a mark
     with the browser context menu suppressed over the board. Keyboard remains
     fully sufficient on its own, so the keyboard-only constraint still holds.
   - Cost if wrong: low. Dropping pointer support later is deletion; adding it
     later is a small, isolated addition to the same event layer.

  > Decision: Use proposed fallback.

### Topic: End of game

9. On a loss, what does the board show? The spec says input stops but not what
   the player sees.
   - Proposed fallback: the mine that was revealed is highlighted distinctly,
     all other mines are revealed as mines, incorrect marks on safe cells are
     shown as incorrect, and a "You lose" status message is displayed.
   - Cost if wrong: low. Purely presentational and confined to the render layer.

  > Decision: Use proposed fallback.

10. Can the player start over without reloading the page? The board is fixed,
    so a restart replays the same layout.
    - Proposed fallback: yes — a "New game" button, plus an `R` key binding,
      that resets all cell state back to hidden and unmarked and clears the end
      state. Nothing persists between games, per the non-goals.
    - Cost if wrong: low. If restart is dropped, page reload is the only reset
      and the button and its reset path are removed.

  > Decision: Add a "New game" button but don't add the suggested `R` key binding.  Accidentally typing `R` and restarting a game you were about to win would be disappointing.

## Useful Clarifications

### Topic: Display details

11. Should the UI show a count of remaining unflagged mines, for example
    "10 − marks placed"?
    - Proposed fallback: yes, a simple counter above the board. It is a marking
      aid, not a score or timer, so it does not conflict with the non-goals.
    - Cost if wrong: trivial. One element in the status area.

  > Decision: Use proposed fallback

12. The acceptance criteria say "Every revealed safe cell displays its
    adjacent-mine count", which read literally means a zero-count cell renders
    the character `0`. Conventional minesweeper leaves those cells blank. Which
    is intended?
    - Proposed fallback: render zero-count cells blank and show digits 1–8 only.
      The acceptance criterion should be reworded to say that a revealed safe
      cell with one or more adjacent mines displays its count.
    - Cost if wrong: trivial to change, but it is worth fixing the wording so
      the acceptance criterion is not read as failing when the board looks
      correct.

  > Decision: Use proposed fallback

13. How far should accessibility go beyond keyboard operation? Screen-reader
    announcements are neither required nor excluded by the spec.
    - Proposed fallback: build the board as a `role="grid"` with roving
      `tabindex` so exactly one cell is in the tab order at a time, and give each
      cell an `aria-label` describing its state. No live-region announcements of
      cascades or game end beyond the status text itself.
    - Cost if wrong: moderate if full screen-reader support is wanted later, as
      focus and announcement handling would have to be retrofitted through the
      render layer.

  > Decision: Use proposed fallback

14. Is there a preferred shape for the board logic's public surface, given
    tests are written against it directly?
    - Proposed fallback: a small module exposing board creation from the fixed
      layout plus `reveal(r, c)`, `toggleMark(r, c)`, and a readable state
      snapshot, with `(row, column)` zero-indexed from the top-left as verified
      above, and all state transitions pure with respect to the DOM.
    - Cost if wrong: low, but it is the interface every test line touches, so
      renaming later is a wide mechanical edit.

  > Decision: Use proposed fallback

15. Any constraints on visual styling — cell size, colour coding of the digits
    1–8, light or dark background?
    - Proposed fallback: a single plain stylesheet, classic per-digit colours,
      a clearly visible focus outline on the cursor cell, and no theme switching.
      No animations, per the non-goals.
    - Cost if wrong: trivial and cosmetic.

  > Decision: Use proposed fallback

## How to Answer

Every question needs an explicit decision, placed directly under the question it
answers:

> Decision:
> The decision made was...

If the proposed fallback is what you want, say so — that is still a decision:

> Decision:
> Use the fallback.

If you are not ready to decide, raise the open point instead and it will come
back in the next questions artifact:

> Question:
> I have a question...

A question left blank is unresolved, not agreed. The fallback is a
recommendation and is never folded into the spec without a decision accepting it.

## User gate

- Answer every question in this file with a `> Decision:`, using
  `> Decision: use the fallback` where the recommendation is already what you
  want, and `> Question:` where you need to push back before deciding.
- When you are ready, run `fold-questions` rather than skipping to planning.
- Example prompt:
  `Use the human-gated-spec-driven-ai-development skill to fold-questions from 001-gridsweep-questions-01.md into 001-gridsweep-spec.md`
