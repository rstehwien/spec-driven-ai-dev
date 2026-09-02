'use strict';

// Gridsweep DOM layer.
//
// Every DOM reference in the project lives here. This file is loaded only by
// index.html, as a classic script after board.js, and is never required by the
// test suite. It contains no game rules: it reads a snapshot and paints it.

(function () {
  var MARK_GLYPH = '⚑'; // black flag
  var MINE_GLYPH = '✹'; // twelve-pointed star, stands in for the mine

  // The complete key binding surface. Nothing else in this file compares a key
  // to a literal, so these three tables are the whole answer to "what does the
  // keyboard do". In particular there is no restart binding: the spec forbids
  // one so that a stray keypress can never discard a game in progress.
  var CURSOR_STEPS = {
    ArrowUp: { row: -1, column: 0 },
    ArrowDown: { row: 1, column: 0 },
    ArrowLeft: { row: 0, column: -1 },
    ArrowRight: { row: 0, column: 1 },
  };
  var REVEAL_KEYS = ['Enter', ' '];
  var MARK_KEYS = ['f', 'F'];

  var game = Gridsweep.createGame();

  // The roving-tabindex holder: the one cell in the tab order, and the cell
  // the keyboard acts on.
  var cursor = { row: 0, column: 0 };

  var boardElement = document.getElementById('board');
  var statusElement = document.getElementById('status');
  var counterElement = document.getElementById('mines-remaining');
  var newGameElement = document.getElementById('new-game');

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

  // Input. Every handler below calls only the board's public surface and then
  // repaints from the snapshot it gets back, so no game rule is restated here.

  function clamp(value, limit) {
    if (value < 0) return 0;
    if (value >= limit) return limit - 1;
    return value;
  }

  // Movement stops at the edges rather than wrapping, so holding an arrow key
  // parks the cursor on the border instead of jumping to the far side.
  function moveCursor(step) {
    setCursor(
      clamp(cursor.row + step.row, cellElements.length),
      clamp(cursor.column + step.column, cellElements[0].length),
    );
  }

  // The cell element an event landed on, or null if it landed on the board's
  // padding or a row gap.
  function cellAt(target) {
    var element = target;
    while (element && element !== boardElement) {
      if (element.dataset && element.dataset.row !== undefined) return element;
      element = element.parentNode;
    }
    return null;
  }

  // Pointer input moves the cursor too, so the roving tabindex and the visible
  // cursor never disagree with where the player last acted.
  function actOnCell(element, action) {
    var row = Number(element.dataset.row);
    var column = Number(element.dataset.column);
    action(row, column);
    setCursor(row, column);
  }

  boardElement.addEventListener('keydown', function (event) {
    // Leave browser and OS chords alone; this handler owns bare keys only.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    var key = event.key;

    if (Object.prototype.hasOwnProperty.call(CURSOR_STEPS, key)) {
      moveCursor(CURSOR_STEPS[key]);
    } else if (REVEAL_KEYS.indexOf(key) !== -1) {
      game.reveal(cursor.row, cursor.column);
      refresh();
    } else if (MARK_KEYS.indexOf(key) !== -1) {
      game.toggleMark(cursor.row, cursor.column);
      refresh();
    } else {
      // Unbound. Return before preventDefault so the page keeps every key this
      // game does not claim -- Tab out of the board, browser shortcuts, all of
      // it.
      return;
    }

    // Only now, and only for a key we handled: arrows and Space would
    // otherwise scroll the page out from under the board.
    event.preventDefault();
  });

  boardElement.addEventListener('click', function (event) {
    var element = cellAt(event.target);
    if (element) actOnCell(element, game.reveal);
  });

  // Right-click marks. Suppression is bound to the board, not the document, so
  // the context menu still works everywhere else on the page.
  boardElement.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    var element = cellAt(event.target);
    if (element) actOnCell(element, game.toggleMark);
  });

  buildGrid(game.snapshot());
  refresh();

  // Wired last: the only reset in the file, reachable only by pressing the
  // button. No key restarts the game.
  newGameElement.addEventListener('click', function () {
    game.reset();
    // Send the tab order home, as on a fresh page, but do not steal focus from
    // the button the player just pressed.
    cursor = { row: 0, column: 0 };
    refresh();
  });

  // A small handle for driving the page from the console during manual
  // verification, and the fast path the plan asks for when checking a win
  // without clicking 54 cells by hand. Input wiring is Phase 04.
  globalThis.GridsweepUI = {
    game: game,
    refresh: refresh,
    setCursor: setCursor,
  };
})();
