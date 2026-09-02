'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Gridsweep = require('../board.js');

// Independent expectations for the shipped fixed layout. These are written out
// by hand from the spec rather than derived from board.js, so a regression in
// the construction code cannot quietly redefine what "correct" means.
const MINES = [
  [1, 6], [2, 1], [2, 4], [3, 6], [4, 1],
  [4, 7], [5, 3], [6, 5], [7, 0], [7, 3],
];

const ADJACENT = [
  [0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 2, 0, 1],
  [1, 0, 1, 1, 0, 3, 2, 2],
  [2, 2, 2, 1, 1, 2, 0, 2],
  [1, 0, 2, 1, 1, 1, 2, 0],
  [1, 1, 2, 0, 2, 1, 2, 1],
  [1, 1, 2, 2, 3, 0, 1, 0],
  [0, 1, 1, 0, 2, 1, 1, 0],
];

const isExpectedMine = (row, column) =>
  MINES.some(([r, c]) => r === row && c === column);

test('the board is 8x8 with ten mines', () => {
  const snapshot = Gridsweep.createGame().snapshot();

  assert.equal(snapshot.rows, 8);
  assert.equal(snapshot.columns, 8);
  assert.equal(snapshot.mineCount, 10);
  assert.equal(snapshot.cells.length, 8);
  for (const row of snapshot.cells) {
    assert.equal(row.length, 8);
  }
});

test('mines sit at exactly the ten specified coordinates', () => {
  const { cells } = Gridsweep.createGame().snapshot();
  const placed = [];

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      assert.equal(
        cells[row][column].mine,
        isExpectedMine(row, column),
        `mine flag wrong at (${row},${column})`,
      );
      if (cells[row][column].mine) placed.push([row, column]);
    }
  }

  assert.deepEqual(placed, MINES);
});

test('the board has 54 safe cells', () => {
  const { cells } = Gridsweep.createGame().snapshot();
  const safe = cells.flat().filter((cell) => !cell.mine);

  assert.equal(safe.length, 54);
});

test('every safe cell reports its adjacent-mine count', () => {
  const { cells } = Gridsweep.createGame().snapshot();

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (cells[row][column].mine) continue;
      assert.equal(
        cells[row][column].adjacent,
        ADJACENT[row][column],
        `adjacent count wrong at (${row},${column})`,
      );
    }
  }
});

test('every cell starts hidden and unmarked', () => {
  const { cells } = Gridsweep.createGame().snapshot();

  for (const cell of cells.flat()) {
    assert.equal(cell.revealed, false);
    assert.equal(cell.marked, false);
  }
});

test('two games do not share cell state', () => {
  const first = Gridsweep.createGame();
  const second = Gridsweep.createGame();

  first.snapshot().cells[0][0].revealed = true;

  assert.equal(second.snapshot().cells[0][0].revealed, false);
  assert.equal(first.snapshot().cells[0][0].revealed, false);
});

// The spec's delivery constraint: index.html is opened over file://, where a
// module script is blocked and board.js must load as a plain classic script.
test('board.js is DOM-free and free of ES module syntax', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'board.js'),
    'utf8',
  );

  for (const forbidden of ['document', 'window', 'navigator']) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`).test(source),
      `board.js must not reference ${forbidden}`,
    );
  }
  assert.ok(!/^\s*import\s/m.test(source), 'board.js must not use import');
  assert.ok(!/^\s*export\s/m.test(source), 'board.js must not use export');
});
