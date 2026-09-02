'use strict';

// Gridsweep DOM layer.
//
// Every DOM reference in the project lives here. This file is loaded only by
// index.html, as a classic script after board.js, and is never required by the
// test suite. It contains no game rules: it reads a snapshot and paints it.

(function () {
  var MARK_GLYPH = '⚑'; // black flag
  var MINE_GLYPH = '✹'; // twelve-pointed star, stands in for the mine
  var WRONG_GLYPH = '✗'; // a mark the finished board proved wrong

  // The only two things the status line ever says, and the only place this
  // file names a game status at all. Everything else asks board.js.
  var END_MESSAGES = {};
  END_MESSAGES[Gridsweep.WON] = 'You win';
  END_MESSAGES[Gridsweep.LOST] = 'You lose';

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

  // The board's dimensions, taken from the snapshot. The element array is a
  // projection of the board and never the authority on its size.
  var boardSize = { rows: 0, columns: 0 };

  function buildGrid(snapshot) {
    boardElement.textContent = '';
    cellElements = [];
    boardSize = { rows: snapshot.rows, columns: snapshot.columns };

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

  // How one cell should be drawn, as one of seven kinds. While the game runs a
  // cell is drawn from its own state alone. Once it ends the board opens up:
  // every mine shows whether or not the player found it, the mine that ended
  // the game is singled out from the ones merely uncovered alongside it, and a
  // mark still sitting on a safe cell is shown as the mistake it turned out to
  // be. Marks on mines are not spared: the spec asks for every mine drawn as a
  // mine at the end.
  function cellKind(cell, row, column, snapshot) {
    var ended = snapshot.status !== Gridsweep.IN_PROGRESS;

    if (cell.mine && (ended || cell.revealed)) {
      return isLosingCell(snapshot, row, column) ? 'exploded' : 'mine';
    }
    // A mark hides whatever is under it for as long as the game is live, which
    // is what keeps a hidden mine out of the DOM.
    if (cell.marked) return ended ? 'wrong-mark' : 'marked';
    if (!cell.revealed) return 'hidden';
    return cell.adjacent === 0 ? 'empty' : 'count';
  }

  function isLosingCell(snapshot, row, column) {
    return (
      snapshot.losingCell !== null &&
      snapshot.losingCell.row === row &&
      snapshot.losingCell.column === column
    );
  }

  // Everything below is a lookup from that one kind, so the decision about what
  // a cell is happens once and the glyph, the classes, and the screen-reader
  // label can never disagree about it. `count` is the one kind that needs the
  // cell itself, since it carries a digit.

  var FACES = {
    hidden: '',
    marked: MARK_GLYPH,
    empty: '',
    mine: MINE_GLYPH,
    exploded: MINE_GLYPH,
    'wrong-mark': WRONG_GLYPH,
  };

  var CLASSES = {
    hidden: 'hidden',
    marked: 'hidden marked',
    empty: 'revealed',
    mine: 'revealed mine',
    exploded: 'revealed mine exploded',
    'wrong-mark': 'hidden marked wrong-mark',
  };

  var LABELS = {
    hidden: 'hidden',
    marked: 'marked',
    empty: 'empty',
    mine: 'mine',
    exploded: 'mine, the one that ended the game',
    'wrong-mark': 'incorrect mark',
  };

  // A hidden cell must never leak whether it holds a mine. The snapshot carries
  // `mine` on every cell, because the end-state render needs it, so this
  // renderer is the boundary that keeps it out of the DOM until the game ends.
  function cellFace(kind, cell) {
    return kind === 'count' ? String(cell.adjacent) : FACES[kind];
  }

  function cellClassName(kind, cell) {
    return (
      'cell ' +
      (kind === 'count' ? 'revealed count-' + cell.adjacent : CLASSES[kind])
    );
  }

  function cellLabel(kind, cell, row, column) {
    var where = 'Row ' + (row + 1) + ', column ' + (column + 1) + ', ';

    if (kind !== 'count') return where + LABELS[kind];
    return (
      where +
      cell.adjacent +
      (cell.adjacent === 1 ? ' adjacent mine' : ' adjacent mines')
    );
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
    var ended = snapshot.status !== Gridsweep.IN_PROGRESS;

    for (var row = 0; row < snapshot.rows; row += 1) {
      for (var column = 0; column < snapshot.columns; column += 1) {
        var cell = snapshot.cells[row][column];
        var element = cellElements[row][column];
        var kind = cellKind(cell, row, column, snapshot);

        element.className = cellClassName(kind, cell);
        element.textContent = cellFace(kind, cell);
        element.setAttribute('aria-label', cellLabel(kind, cell, row, column));
        element.setAttribute(
          'tabindex',
          row === cursor.row && column === cursor.column ? '0' : '-1',
        );
      }
    }

    counterElement.textContent = String(
      snapshot.mineCount - countMarks(snapshot),
    );

    // board.js is what actually locks the board -- reveal and mark go inert the
    // moment the game ends. This only stops the page offering what it will no
    // longer do.
    boardElement.className = ended ? 'board ended' : 'board';

    // The status line stays empty while the game runs rather than narrating
    // every move. It has exactly two things to say, and only at the end.
    statusElement.textContent = ended ? END_MESSAGES[snapshot.status] : '';

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
      clamp(cursor.row + step.row, boardSize.rows),
      clamp(cursor.column + step.column, boardSize.columns),
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

})();
