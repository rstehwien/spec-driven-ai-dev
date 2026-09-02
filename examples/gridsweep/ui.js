'use strict';

// Gridsweep DOM layer.
//
// Every DOM reference in the project lives here. This file is loaded only by
// index.html, as a classic script after board.js, and is never required by the
// test suite. It contains no game rules: it reads a snapshot and paints it.

(function () {
  var MARK_GLYPH = '⚑'; // black flag
  var MINE_GLYPH = '✹'; // twelve-pointed star, stands in for the mine

  var game = Gridsweep.createGame();

  // The roving-tabindex holder. Arrow-key movement is Phase 04; this phase
  // only has to keep exactly one cell in the tab order and keep it correct
  // across re-renders.
  var cursor = { row: 0, column: 0 };

  var boardElement = document.getElementById('board');
  var statusElement = document.getElementById('status');
  var counterElement = document.getElementById('mines-remaining');

  // The 64 cell elements are built once and then updated in place. Rebuilding
  // the grid on every render would destroy the focused element mid-keystroke
  // and drop focus to the body, which is exactly the roving-tabindex trap.
  var cellElements = [];

  function buildGrid(snapshot) {
    boardElement.textContent = '';
    cellElements = [];

    for (var row = 0; row < snapshot.rows; row += 1) {
      var rowElement = document.createElement('div');
      rowElement.className = 'row';
      rowElement.setAttribute('role', 'row');

      var rowCells = [];
      for (var column = 0; column < snapshot.columns; column += 1) {
        var cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.setAttribute('role', 'gridcell');
        cellElement.setAttribute('tabindex', '-1');
        cellElement.dataset.row = String(row);
        cellElement.dataset.column = String(column);
        rowElement.appendChild(cellElement);
        rowCells.push(cellElement);
      }

      boardElement.appendChild(rowElement);
      cellElements.push(rowCells);
    }
  }

  function cellLabel(cell, row, column) {
    var where = 'Row ' + (row + 1) + ', column ' + (column + 1) + ', ';

    if (cell.marked) return where + 'marked';
    if (!cell.revealed) return where + 'hidden';
    if (cell.mine) return where + 'mine';
    if (cell.adjacent === 0) return where + 'empty';
    return (
      where +
      cell.adjacent +
      (cell.adjacent === 1 ? ' adjacent mine' : ' adjacent mines')
    );
  }

  // A hidden cell must never leak whether it holds a mine. The snapshot still
  // carries `mine` on every cell -- Phase 05 needs it to open the board at game
  // end -- so the renderer is the boundary that keeps it out of the DOM.
  function cellFace(cell) {
    if (cell.marked) return MARK_GLYPH;
    if (!cell.revealed) return '';
    if (cell.mine) return MINE_GLYPH;
    if (cell.adjacent === 0) return '';
    return String(cell.adjacent);
  }

  function cellClassName(cell) {
    var names = ['cell'];

    if (cell.revealed) {
      names.push('revealed');
      if (cell.mine) names.push('mine');
      else if (cell.adjacent > 0) names.push('count-' + cell.adjacent);
    } else {
      names.push('hidden');
      if (cell.marked) names.push('marked');
    }

    return names.join(' ');
  }

  function countMarks(snapshot) {
    var marks = 0;
    snapshot.cells.forEach(function (line) {
      line.forEach(function (cell) {
        if (cell.marked) marks += 1;
      });
    });
    return marks;
  }

  function render(snapshot) {
    for (var row = 0; row < snapshot.rows; row += 1) {
      for (var column = 0; column < snapshot.columns; column += 1) {
        var cell = snapshot.cells[row][column];
        var element = cellElements[row][column];

        element.className = cellClassName(cell);
        element.textContent = cellFace(cell);
        element.setAttribute('aria-label', cellLabel(cell, row, column));
        element.setAttribute(
          'tabindex',
          row === cursor.row && column === cursor.column ? '0' : '-1',
        );
      }
    }

    counterElement.textContent = String(
      snapshot.mineCount - countMarks(snapshot),
    );

    // Win and loss messages are Phase 05. While a game is in progress the
    // status line stays empty rather than narrating every move.
    statusElement.textContent = '';

    return snapshot;
  }

  function refresh() {
    return render(game.snapshot());
  }

  function setCursor(row, column) {
    cursor = { row: row, column: column };
    refresh();
    cellElements[row][column].focus();
  }

  buildGrid(game.snapshot());
  refresh();

  // A small handle for driving the page from the console during manual
  // verification, and the fast path the plan asks for when checking a win
  // without clicking 54 cells by hand. Input wiring is Phase 04.
  globalThis.GridsweepUI = {
    game: game,
    refresh: refresh,
    setCursor: setCursor,
  };
})();
