'use strict';

// Renderer coverage, in a real browser.
//
// board.test.js can only read ui.js as text, so it cannot notice a renderer
// that has stopped rendering. This file opens index.html over file:// in
// headless Chrome, drives it with real key and mouse events, and reads the
// result back out of the DOM -- never out of the game object, which the page
// no longer publishes anyway. Every expectation below is written from the spec
// by hand rather than derived from board.js, so a regression in the rules
// cannot quietly redefine what the screen is supposed to show.
//
// Chrome is optional. Where it is absent every test here skips and the run
// still exits zero, so `node --test` remains the no-install command the spec
// promises.

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');

const { findChrome, launchChrome, gameUrl } = require('../tools/chrome-driver.js');

const skip = findChrome()
  ? false
  : 'no Chrome or Chromium found; set CHROME_PATH to run the renderer tests';

const ROWS = 8;
const COLUMNS = 8;

// The shipped layout, written out from the spec.
const MINES = [
  [1, 6], [2, 1], [2, 4], [3, 6], [4, 1],
  [4, 7], [5, 3], [6, 5], [7, 0], [7, 3],
];

const isMine = (row, column) => MINES.some(([r, c]) => r === row && c === column);

// The twelve cells the top-left zero cascades over.
const CASCADE_FROM_TOP_LEFT = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
];

let browser = null;
let page = null;

before(async () => {
  if (skip) return;
  browser = await launchChrome();
  page = await browser.openPage();
});

after(async () => {
  if (browser) await browser.close();
});

// ---------------------------------------------------------------------------
// Reading the page. Everything below looks at what a player can see: element
// classes, text, labels, the status line, the counter, and where focus sits.
// ---------------------------------------------------------------------------

const readBoard = () =>
  page.evaluate(`
    const coordinates = (element) =>
      element ? { row: Number(element.dataset.row), column: Number(element.dataset.column) } : null;
    const active = document.activeElement;

    return {
      status: document.getElementById('status').textContent,
      counter: document.getElementById('mines-remaining').textContent,
      boardClass: document.getElementById('board').className,
      roving: coordinates(document.querySelector('#board [tabindex="0"]')),
      rovingCount: document.querySelectorAll('#board [tabindex="0"]').length,
      rows: document.querySelectorAll('#board [role="row"]').length,
      focused: active && active.dataset && active.dataset.row !== undefined
        ? coordinates(active)
        : null,
      cells: Array.from(document.querySelectorAll('#board .cell')).map((element) => ({
        row: Number(element.dataset.row),
        column: Number(element.dataset.column),
        className: element.className,
        text: element.textContent,
        label: element.getAttribute('aria-label'),
      })),
    };
  `);

const at = (board, row, column) =>
  board.cells.find((cell) => cell.row === row && cell.column === column);

const withClass = (board, name) =>
  board.cells.filter((cell) => cell.className.split(' ').includes(name));

// What a cell shows, as one comparable string. Deliberately excludes tabindex:
// the cursor is allowed to keep moving on a finished board, which is the
// reading of acceptance criterion 6 the spec records.
const faces = (board) =>
  board.cells.map((cell) => `${cell.row},${cell.column} ${cell.className} "${cell.text}" ${cell.label}`);

const backgroundOf = (selector) =>
  page.evaluate(`
    const element = document.querySelector(${JSON.stringify(selector)});
    return element ? getComputedStyle(element).backgroundColor : null;
  `);

// ---------------------------------------------------------------------------
// Driving the page. The cursor is tracked here so the test can say "go to
// (4,1)" while the page only ever receives arrow keys.
// ---------------------------------------------------------------------------

const openGame = async () => {
  await page.navigate(gameUrl());
  // Enter the board the way the tab order offers it, then let the arrows take
  // over. ui.js never steals focus on load.
  await page.evaluate(`document.querySelector('#board [tabindex="0"]').focus(); return true;`);
  return { row: 0, column: 0 };
};

const goTo = async (cursor, row, column) => {
  const keys = [];
  for (let r = cursor.row; r < row; r += 1) keys.push('ArrowDown');
  for (let r = cursor.row; r > row; r -= 1) keys.push('ArrowUp');
  for (let c = cursor.column; c < column; c += 1) keys.push('ArrowRight');
  for (let c = cursor.column; c > column; c -= 1) keys.push('ArrowLeft');

  await page.pressAll(keys);
  cursor.row = row;
  cursor.column = column;
  return cursor;
};

const revealAt = async (cursor, row, column) => {
  await goTo(cursor, row, column);
  await page.press('Enter');
};

const markAt = async (cursor, row, column) => {
  await goTo(cursor, row, column);
  await page.press('f');
};

// ---------------------------------------------------------------------------

test('the page opens over file:// with a full hidden board and a clean console', { skip }, async () => {
  await openGame();
  const board = await readBoard();

  assert.equal(board.rows, ROWS);
  assert.equal(board.cells.length, ROWS * COLUMNS);
  assert.equal(board.boardClass, 'board');
  assert.equal(board.counter, '10');
  assert.equal(board.status, '');

  for (const cell of board.cells) {
    assert.equal(cell.className, 'cell hidden', `(${cell.row},${cell.column}) must start hidden`);
    assert.equal(cell.text, '', `(${cell.row},${cell.column}) must show nothing`);
    assert.equal(
      cell.label,
      `Row ${cell.row + 1}, column ${cell.column + 1}, hidden`,
      'every cell must describe itself to a screen reader',
    );
  }

  // Roving tabindex: exactly one cell in the tab order, and it is the cursor.
  assert.equal(board.rovingCount, 1);
  assert.deepEqual(board.roving, { row: 0, column: 0 });

  assert.deepEqual(page.problems, [], 'the page must load without errors');
});

test('the board is reachable by Tab and the cursor moves without wrapping', { skip }, async () => {
  await page.navigate(gameUrl());

  // Two tabs from the body: the New game button, then the board's one cell.
  await page.pressAll(['Tab', 'Tab']);
  assert.deepEqual((await readBoard()).focused, { row: 0, column: 0 },
    'the board must be reachable from the keyboard alone');

  // Movement stops at the edges rather than wrapping.
  await page.pressAll(['ArrowUp', 'ArrowUp', 'ArrowLeft']);
  assert.deepEqual((await readBoard()).roving, { row: 0, column: 0 }, 'the top-left corner must clamp');

  const cursor = { row: 0, column: 0 };
  await goTo(cursor, ROWS - 1, COLUMNS - 1);
  await page.pressAll(['ArrowDown', 'ArrowRight']);

  const board = await readBoard();
  assert.deepEqual(board.roving, { row: 7, column: 7 }, 'the bottom-right corner must clamp');
  assert.deepEqual(board.focused, { row: 7, column: 7 }, 'focus must follow the cursor');
  assert.equal(board.rovingCount, 1, 'only one cell may ever be in the tab order');
});

test('marking a cell shows a flag and counts down the remaining mines', { skip }, async () => {
  const cursor = await openGame();
  await markAt(cursor, 0, 2);

  let board = await readBoard();
  const marked = at(board, 0, 2);
  assert.equal(marked.className, 'cell hidden marked');
  assert.notEqual(marked.text, '', 'a marked cell must carry a visible flag');
  assert.equal(marked.label, 'Row 1, column 3, marked');
  assert.equal(board.counter, '9', 'the counter is ten minus the marks placed');

  // A direct reveal of a marked cell does nothing, by either reveal key.
  await page.pressAll(['Enter', ' ']);
  board = await readBoard();
  assert.equal(at(board, 0, 2).className, 'cell hidden marked', 'a mark must block a direct reveal');
  assert.equal(board.counter, '9');

  // Marking is a two-state toggle.
  await page.press('f');
  board = await readBoard();
  assert.equal(at(board, 0, 2).className, 'cell hidden');
  assert.equal(board.counter, '10');
});

test('a zero-count reveal cascades on screen and clears a mark it reaches', { skip }, async () => {
  const cursor = await openGame();
  await markAt(cursor, 0, 2);
  await revealAt(cursor, 0, 4);

  const board = await readBoard();
  const revealed = withClass(board, 'revealed').map((cell) => [cell.row, cell.column]);
  assert.deepEqual(revealed.sort(), CASCADE_FROM_TOP_LEFT.slice().sort(),
    'the cascade must open exactly the top-left region');

  assert.equal(at(board, 0, 2).className, 'cell revealed', 'the cascade must unmark and reveal');
  assert.equal(board.counter, '10', 'clearing the mark must give the counter back');

  // Digits, and the blank that a zero count renders as.
  assert.equal(at(board, 0, 0).text, '', 'a zero-count cell renders blank');
  assert.equal(at(board, 0, 0).label, 'Row 1, column 1, empty');
  assert.equal(at(board, 0, 5).text, '1');
  assert.ok(at(board, 0, 5).className.includes('count-1'), 'the digit must carry its colour class');
  assert.equal(at(board, 0, 5).label, 'Row 1, column 6, 1 adjacent mine');
  assert.equal(at(board, 1, 5).text, '2');
  assert.equal(at(board, 1, 5).label, 'Row 2, column 6, 2 adjacent mines');

  assert.deepEqual(page.problems, []);
});

test('the mouse reveals, marks, and never opens the context menu over the board', { skip }, async () => {
  await openGame();

  await page.evaluate(`
    window.contextMenuSuppressed = null;
    document.addEventListener('contextmenu', (event) => {
      window.contextMenuSuppressed = event.defaultPrevented;
    });
    return true;
  `);

  await page.clickSelector('#board .cell[data-row="0"][data-column="5"]');
  let board = await readBoard();
  assert.equal(at(board, 0, 5).text, '1', 'a left click must reveal');
  assert.deepEqual(board.roving, { row: 0, column: 5 }, 'a click moves the cursor to the cell clicked');

  await page.clickSelector('#board .cell[data-row="7"][data-column="0"]', 'right');
  board = await readBoard();
  assert.equal(at(board, 7, 0).className, 'cell hidden marked', 'a right click must mark');
  assert.equal(board.counter, '9');
  assert.equal(
    await page.evaluate('return window.contextMenuSuppressed;'),
    true,
    'the browser context menu must be suppressed over the board',
  );
});

test('losing opens every mine, singles out the one that ended it, and shows a wrong mark', { skip }, async () => {
  const cursor = await openGame();
  await markAt(cursor, 3, 0); // a mark on a safe cell, so the loss can prove it wrong
  await revealAt(cursor, 2, 1); // a mine

  const board = await readBoard();
  assert.equal(board.status, 'You lose');
  assert.equal(board.boardClass, 'board ended');
  assert.equal(board.counter, '9', 'the counter stays ten minus marks placed');

  assert.equal(withClass(board, 'mine').length, MINES.length, 'a loss opens all ten mines');
  for (const [row, column] of MINES) {
    assert.ok(at(board, row, column).className.includes('mine'), `(${row},${column}) must show as a mine`);
    assert.notEqual(at(board, row, column).text, '', 'a mine must be drawn, not just classed');
  }

  const exploded = withClass(board, 'exploded');
  assert.equal(exploded.length, 1, 'exactly one mine ended the game');
  assert.deepEqual([exploded[0].row, exploded[0].column], [2, 1]);
  assert.equal(exploded[0].label, 'Row 3, column 2, mine, the one that ended the game');

  const wrong = at(board, 3, 0);
  assert.equal(wrong.className, 'cell hidden marked wrong-mark');
  assert.equal(wrong.label, 'Row 4, column 1, incorrect mark');

  // A loss opens the mines, not the board: an untouched safe cell stays shut.
  assert.equal(at(board, 7, 7).className, 'cell hidden');

  // The stylesheet has to make those two states look different, and only the
  // browser can settle that -- it is the cascade's answer, not the file's.
  assert.notEqual(
    await backgroundOf('#board .cell[data-row="2"][data-column="1"]'),
    await backgroundOf('#board .cell[data-row="1"][data-column="6"]'),
    'the mine that ended the game must not look like the ones opened with it',
  );
  assert.notEqual(
    await backgroundOf('#board .cell[data-row="3"][data-column="0"]'),
    await backgroundOf('#board .cell[data-row="7"][data-column="7"]'),
    'a mark the board proved wrong must not look like an untouched cell',
  );
});

test('reveal and mark are inert once the game has ended', { skip }, async () => {
  const cursor = await openGame();
  await revealAt(cursor, 2, 1);

  const before = await readBoard();
  const beforeFaces = faces(before);

  // Every key the game binds, plus two it does not, plus both mouse buttons.
  await goTo(cursor, 5, 5);
  await page.pressAll(['Enter', ' ', 'f', 'F']);
  await page.pressIgnoredKey('r');
  await page.pressIgnoredKey('Escape');
  await page.clickSelector('#board .cell[data-row="6"][data-column="6"]');
  await page.clickSelector('#board .cell[data-row="6"][data-column="6"]', 'right');

  const after = await readBoard();
  assert.deepEqual(faces(after), beforeFaces, 'no cell may change after the game has ended');
  assert.equal(after.status, 'You lose');
  assert.equal(after.counter, before.counter);

  // The recorded reading of acceptance criterion 6: reveal and mark go inert,
  // navigation does not, so a screen-reader user is not trapped on the grid.
  assert.deepEqual(after.roving, { row: 6, column: 6 }, 'the cursor must still move on a finished board');
});

test('New game returns a clean board and sends the tab order home', { skip }, async () => {
  const cursor = await openGame();
  await markAt(cursor, 0, 2);
  await revealAt(cursor, 2, 1);
  assert.equal((await readBoard()).status, 'You lose');

  await page.clickSelector('#new-game');

  const board = await readBoard();
  assert.equal(board.status, '');
  assert.equal(board.boardClass, 'board');
  assert.equal(board.counter, '10');
  assert.deepEqual(board.roving, { row: 0, column: 0 }, 'the tab order goes home, as on a fresh page');
  assert.equal(board.focused, null, 'the reset must not steal focus from the button just pressed');
  for (const cell of board.cells) {
    assert.equal(cell.className, 'cell hidden', `(${cell.row},${cell.column}) must be closed again`);
    assert.equal(cell.text, '');
  }

  // The reset is not merely cosmetic: the same board plays again. Tab moves on
  // from the button to the board's one cell, which is where the cursor went.
  await page.press('Tab');
  cursor.row = 0;
  cursor.column = 0;
  assert.deepEqual((await readBoard()).focused, { row: 0, column: 0 });

  await page.press('Enter');
  assert.equal(withClass(await readBoard(), 'revealed').length, CASCADE_FROM_TOP_LEFT.length);
});

test('revealing all 54 safe cells by keyboard alone wins, with marks still standing', { skip }, async () => {
  const cursor = await openGame();
  const marked = [[1, 6], [2, 1]];

  // Boustrophedon over all 64 cells: arrows only, Enter on the safe ones, and
  // a mark left on two mines to prove the win ignores marks entirely.
  for (let row = 0; row < ROWS; row += 1) {
    const columns = [];
    for (let column = 0; column < COLUMNS; column += 1) columns.push(column);
    if (row % 2 === 1) columns.reverse();

    for (const column of columns) {
      await goTo(cursor, row, column);
      if (!isMine(row, column)) {
        await page.press('Enter');
      } else if (marked.some(([r, c]) => r === row && c === column)) {
        await page.press('f');
      }
    }
  }

  const board = await readBoard();
  assert.equal(board.status, 'You win');
  assert.equal(board.boardClass, 'board ended');
  assert.equal(board.counter, '8', 'two marks were still standing at the win');

  assert.equal(withClass(board, 'exploded').length, 0, 'nothing exploded on a win');
  assert.equal(withClass(board, 'mine').length, MINES.length, 'a win shows all ten mines');
  for (const [row, column] of MINES) {
    assert.equal(
      at(board, row, column).className,
      'cell revealed mine',
      `(${row},${column}) must be drawn as a mine, marked or not`,
    );
  }

  const revealedSafe = board.cells.filter(
    (cell) => !isMine(cell.row, cell.column) && cell.className.includes('revealed'),
  );
  assert.equal(revealedSafe.length, 54, 'every safe cell must be open at the win');

  assert.deepEqual(page.problems, [], 'a whole game must run without a console error');
});
