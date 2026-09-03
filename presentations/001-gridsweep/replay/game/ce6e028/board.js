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

  function inBounds(row, column) {
    return row >= 0 && row < ROWS && column >= 0 && column < COLUMNS;
  }

  // The one place the 8-neighbour walk is written. Both callers -- the
  // adjacency count and the cascade -- get the same bounds rule for free, so
  // an edge or corner cell can never be handled two different ways.
  function forEachNeighbor(row, column, visit) {
    for (var dr = -1; dr <= 1; dr += 1) {
      for (var dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        var r = row + dr;
        var c = column + dc;
        if (inBounds(r, c)) visit(r, c);
      }
    }
  }

  function countAdjacentMines(row, column) {
    var count = 0;
    forEachNeighbor(row, column, function (r, c) {
      if (isMine(r, c)) count += 1;
    });
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

  // The layout is fixed for the life of the module, so the mine total is a
  // constant. Counting it once here says that; counting it inside snapshot()
  // said the opposite.
  var MINE_COUNT = countMines();

  var IN_PROGRESS = 'in-progress';
  var WON = 'won';
  var LOST = 'lost';

  function createGame() {
    var cells = buildCells();
    var status = IN_PROGRESS;
    var losingCell = null;

    // Flood fill outward from a zero-count cell. This is not a direct reveal
    // action, so it is not blocked by marks: a mark the cascade reaches is
    // removed and the cell revealed, exactly as if it had never been placed.
    function cascadeFrom(row, column) {
      var queue = [[row, column]];
      while (queue.length > 0) {
        var next = queue.pop();
        var cell = cells[next[0]][next[1]];
        cell.marked = false;
        cell.revealed = true;
        if (cell.adjacent !== 0) continue;
        forEachNeighbor(next[0], next[1], function (r, c) {
          if (!cells[r][c].revealed) queue.push([r, c]);
        });
      }
    }

    // The win check reads only revealed state. Marks are a player aid and are
    // never consulted, so a board can be won with none placed or with all ten
    // placed wrongly.
    function allSafeCellsRevealed() {
      for (var row = 0; row < ROWS; row += 1) {
        for (var column = 0; column < COLUMNS; column += 1) {
          var cell = cells[row][column];
          if (!cell.mine && !cell.revealed) return false;
        }
      }
      return true;
    }

    function reveal(row, column) {
      if (status !== IN_PROGRESS) return snapshot();
      if (!inBounds(row, column)) return snapshot();

      var cell = cells[row][column];
      // A mark blocks a direct reveal so a stray keypress cannot lose the game.
      if (cell.revealed || cell.marked) return snapshot();

      if (cell.mine) {
        cell.revealed = true;
        status = LOST;
        losingCell = { row: row, column: column };
        return snapshot();
      }

      if (cell.adjacent === 0) {
        cascadeFrom(row, column);
      } else {
        cell.revealed = true;
      }

      if (allSafeCellsRevealed()) status = WON;
      return snapshot();
    }

    function toggleMark(row, column) {
      if (status !== IN_PROGRESS) return snapshot();
      if (!inBounds(row, column)) return snapshot();

      var cell = cells[row][column];
      if (cell.revealed) return snapshot();

      cell.marked = !cell.marked;
      return snapshot();
    }

    function reset() {
      cells = buildCells();
      status = IN_PROGRESS;
      losingCell = null;
      return snapshot();
    }

    // The snapshot is a deep copy, so callers can read and even scribble on it
    // without reaching back into the game's own state.
    function snapshot() {
      return {
        rows: ROWS,
        columns: COLUMNS,
        mineCount: MINE_COUNT,
        status: status,
        losingCell: losingCell
          ? { row: losingCell.row, column: losingCell.column }
          : null,
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

    return {
      snapshot: snapshot,
      reveal: reveal,
      toggleMark: toggleMark,
      reset: reset,
    };
  }

  // The public surface is deliberately this small. The snapshot already carries
  // `rows`, `columns` and `mineCount`, so the dimensions do not need exporting,
  // and LAYOUT would put the mine positions on the public API for no caller.
  var Gridsweep = {
    IN_PROGRESS: IN_PROGRESS,
    WON: WON,
    LOST: LOST,
    createGame: createGame,
  };

  globalThis.Gridsweep = Gridsweep;

  if (typeof module !== 'undefined') module.exports = Gridsweep;
})();
