'use strict';

// Gridsweep board logic.
//
// This file is loaded two ways from one source: as a classic script in the
// browser (it assigns a single global) and via require() in the Node test
// runner (it exports through a CommonJS tail). It therefore contains no ES
// module syntax, which a page opened over file:// would refuse to load, and no
// browser API references at all.

(function () {
  var ROWS = 8;
  var COLUMNS = 8;

  // The fixed layout that ships with the game. '*' is a mine, '.' is safe.
  var LAYOUT = [
    '........',
    '......*.',
    '.*..*...',
    '......*.',
    '.*.....*',
    '...*....',
    '.....*..',
    '*..*....',
  ];

  function isMine(row, column) {
    return LAYOUT[row][column] === '*';
  }

  function countAdjacentMines(row, column) {
    var count = 0;
    for (var dr = -1; dr <= 1; dr += 1) {
      for (var dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        var r = row + dr;
        var c = column + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) continue;
        if (isMine(r, c)) count += 1;
      }
    }
    return count;
  }

  function buildCells() {
    var cells = [];
    for (var row = 0; row < ROWS; row += 1) {
      var line = [];
      for (var column = 0; column < COLUMNS; column += 1) {
        line.push({
          mine: isMine(row, column),
          adjacent: countAdjacentMines(row, column),
          revealed: false,
          marked: false,
        });
      }
      cells.push(line);
    }
    return cells;
  }

  function countMines() {
    var total = 0;
    for (var row = 0; row < ROWS; row += 1) {
      for (var column = 0; column < COLUMNS; column += 1) {
        if (isMine(row, column)) total += 1;
      }
    }
    return total;
  }

  function createGame() {
    var cells = buildCells();

    // The snapshot is a deep copy, so callers can read and even scribble on it
    // without reaching back into the game's own state.
    function snapshot() {
      return {
        rows: ROWS,
        columns: COLUMNS,
        mineCount: countMines(),
        cells: cells.map(function (line) {
          return line.map(function (cell) {
            return {
              mine: cell.mine,
              adjacent: cell.adjacent,
              revealed: cell.revealed,
              marked: cell.marked,
            };
          });
        }),
      };
    }

    return { snapshot: snapshot };
  }

  var Gridsweep = {
    ROWS: ROWS,
    COLUMNS: COLUMNS,
    LAYOUT: LAYOUT,
    createGame: createGame,
  };

  globalThis.Gridsweep = Gridsweep;

  if (typeof module !== 'undefined') module.exports = Gridsweep;
})();
