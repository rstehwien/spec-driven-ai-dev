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

// ---------------------------------------------------------------------------
// Phase 02: reveal, marking, cascade, and end states.
// ---------------------------------------------------------------------------

// Both cascade regions on the shipped board, written out by hand from the
// adjacency grid above rather than produced by the flood fill under test.
const CASCADE_FROM_0_0 = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
];

const CASCADE_FROM_6_7 = [
  [5, 6], [5, 7], [6, 6], [6, 7], [7, 6], [7, 7],
];

const revealedCoordinates = (snapshot) => {
  const out = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (snapshot.cells[row][column].revealed) out.push([row, column]);
    }
  }
  return out;
};

const markedCoordinates = (snapshot) => {
  const out = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (snapshot.cells[row][column].marked) out.push([row, column]);
    }
  }
  return out;
};

// Reveals every safe cell that a direct reveal will accept. Marked cells are
// skipped, since a direct reveal of a marked cell is specified as a no-op.
const revealAllSafeCells = (game) => {
  for (const [row, column] of allCoordinates()) {
    const cell = game.snapshot().cells[row][column];
    if (cell.mine || cell.revealed || cell.marked) continue;
    game.reveal(row, column);
  }
  return game.snapshot();
};

function allCoordinates() {
  const out = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) out.push([row, column]);
  }
  return out;
}

test('a game starts in progress with no losing cell', () => {
  const snapshot = Gridsweep.createGame().snapshot();

  assert.equal(snapshot.status, 'in-progress');
  assert.equal(snapshot.losingCell, null);
});

test('revealing a safe cell with a non-zero count reveals only that cell', () => {
  const game = Gridsweep.createGame();

  const snapshot = game.reveal(2, 5);

  assert.deepEqual(revealedCoordinates(snapshot), [[2, 5]]);
  assert.equal(snapshot.cells[2][5].adjacent, 3);
  assert.equal(snapshot.status, 'in-progress');
});

test('revealing a mine loses the game and records the triggering mine', () => {
  const game = Gridsweep.createGame();

  const snapshot = game.reveal(4, 1);

  assert.equal(snapshot.status, 'lost');
  assert.deepEqual(snapshot.losingCell, { row: 4, column: 1 });
  assert.equal(snapshot.cells[4][1].revealed, true);
});

test('toggleMark is a two-state toggle', () => {
  const game = Gridsweep.createGame();

  assert.equal(game.toggleMark(3, 3).cells[3][3].marked, true);
  assert.equal(game.toggleMark(3, 3).cells[3][3].marked, false);
  assert.equal(game.toggleMark(3, 3).cells[3][3].marked, true);
});

test('a direct reveal of a marked cell has no effect', () => {
  const game = Gridsweep.createGame();
  game.toggleMark(2, 5);

  const snapshot = game.reveal(2, 5);

  assert.equal(snapshot.cells[2][5].revealed, false);
  assert.equal(snapshot.cells[2][5].marked, true);
  assert.equal(snapshot.status, 'in-progress');
});

test('a direct reveal of a marked mine does not lose the game', () => {
  const game = Gridsweep.createGame();
  game.toggleMark(4, 1);

  const snapshot = game.reveal(4, 1);

  assert.equal(snapshot.status, 'in-progress');
  assert.equal(snapshot.cells[4][1].revealed, false);
});

test('marking is rejected on an already-revealed cell', () => {
  const game = Gridsweep.createGame();
  game.reveal(2, 5);

  const snapshot = game.toggleMark(2, 5);

  assert.equal(snapshot.cells[2][5].marked, false);
  assert.equal(snapshot.cells[2][5].revealed, true);
});

test('a zero-count reveal cascades across the top-left region', () => {
  const game = Gridsweep.createGame();

  const snapshot = game.reveal(0, 0);

  assert.deepEqual(revealedCoordinates(snapshot), CASCADE_FROM_0_0);
  assert.equal(snapshot.status, 'in-progress');
});

test('a zero-count reveal cascades across the bottom-right region', () => {
  const game = Gridsweep.createGame();

  const snapshot = game.reveal(6, 7);

  assert.deepEqual(revealedCoordinates(snapshot), CASCADE_FROM_6_7);
});

test('the cascade region is the same whichever zero cell starts it', () => {
  const fromCorner = Gridsweep.createGame().reveal(0, 0);
  const fromMiddle = Gridsweep.createGame().reveal(0, 3);

  assert.deepEqual(
    revealedCoordinates(fromMiddle),
    revealedCoordinates(fromCorner),
  );
});

test('a cascade unmarks the marked cells it reaches and continues past them', () => {
  const game = Gridsweep.createGame();
  // (0,2) is a zero cell inside the region and (1,3) is a border cell of it.
  // Marking both proves the cascade neither stops at a mark nor leaves one.
  game.toggleMark(0, 2);
  game.toggleMark(1, 3);

  const snapshot = game.reveal(0, 0);

  assert.deepEqual(revealedCoordinates(snapshot), CASCADE_FROM_0_0);
  assert.deepEqual(markedCoordinates(snapshot), []);
});

test('revealing all 54 safe cells with no marks placed wins', () => {
  const game = Gridsweep.createGame();

  const snapshot = revealAllSafeCells(game);

  assert.equal(snapshot.status, 'won');
  assert.equal(revealedCoordinates(snapshot).length, 54);
});

test('the win still fires with all ten marks sitting on mines', () => {
  const game = Gridsweep.createGame();
  for (const [row, column] of MINES) game.toggleMark(row, column);

  const snapshot = revealAllSafeCells(game);

  assert.equal(snapshot.status, 'won');
  assert.equal(markedCoordinates(snapshot).length, 10);
});

test('the win still fires when ten marks were placed on safe cells', () => {
  const game = Gridsweep.createGame();
  // Ten wrong marks, all inside the top-left cascade region, so the cascade
  // clears them on its way through and the game is still winnable.
  const wrong = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  ];
  for (const [row, column] of wrong) game.toggleMark(row, column);

  const snapshot = revealAllSafeCells(game);

  assert.equal(snapshot.status, 'won');
  assert.equal(revealedCoordinates(snapshot).length, 54);
});

test('marking every mine does not by itself win the game', () => {
  const game = Gridsweep.createGame();

  let snapshot = game.snapshot();
  for (const [row, column] of MINES) snapshot = game.toggleMark(row, column);

  assert.equal(snapshot.status, 'in-progress');
});

test('all input is inert once the game is lost', () => {
  const game = Gridsweep.createGame();
  game.reveal(4, 1);
  const lost = game.snapshot();

  game.reveal(0, 0);
  game.toggleMark(3, 3);

  assert.deepEqual(game.snapshot(), lost);
});

test('all input is inert once the game is won', () => {
  const game = Gridsweep.createGame();
  revealAllSafeCells(game);
  const won = game.snapshot();

  game.reveal(4, 1);
  game.toggleMark(3, 3);

  assert.deepEqual(game.snapshot(), won);
});

test('reset returns every cell to hidden and unmarked and clears the end state', () => {
  const game = Gridsweep.createGame();
  game.toggleMark(3, 3);
  game.reveal(4, 1);

  const snapshot = game.reset();

  assert.equal(snapshot.status, 'in-progress');
  assert.equal(snapshot.losingCell, null);
  assert.deepEqual(revealedCoordinates(snapshot), []);
  assert.deepEqual(markedCoordinates(snapshot), []);
  assert.deepEqual(snapshot, Gridsweep.createGame().snapshot());
});

test('the board is playable again after a reset', () => {
  const game = Gridsweep.createGame();
  game.reveal(4, 1);
  game.reset();

  const snapshot = game.reveal(0, 0);

  assert.deepEqual(revealedCoordinates(snapshot), CASCADE_FROM_0_0);
});

test('out-of-bounds coordinates are ignored', () => {
  const game = Gridsweep.createGame();
  const before = game.snapshot();

  game.reveal(-1, 0);
  game.reveal(0, 8);
  game.toggleMark(8, 8);

  assert.deepEqual(game.snapshot(), before);
});

// ---------------------------------------------------------------------------
// Phase 03: grid rendering and accessibility structure.
//
// The tests never load ui.js -- it is DOM code and there is no DOM here. What
// they can do, and what review cannot do reliably, is hold the delivery
// constraints that only break when index.html is double-clicked: a module
// script silently refusing to load over file://, a stylesheet or font quietly
// pulled from the network, or the page losing an element the renderer needs.
// ---------------------------------------------------------------------------

const readProjectFile = (name) =>
  fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('ui.js is free of ES module syntax', () => {
  const source = readProjectFile('ui.js');

  assert.ok(!/^\s*import\s/m.test(source), 'ui.js must not use import');
  assert.ok(!/^\s*export\s/m.test(source), 'ui.js must not use export');
  assert.ok(
    !/\bimport\s*\(/.test(source),
    'ui.js must not use dynamic import',
  );
});

test('the test suite never loads ui.js', () => {
  const loaded = Object.keys(require.cache).filter((file) =>
    file.endsWith(`${path.sep}ui.js`),
  );

  assert.deepEqual(loaded, [], 'ui.js must stay out of the test runner');
});

// HTML comments cannot make the browser load anything, but they can mention
// the very syntax these scans forbid, so strip them before matching.
const withoutHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

test('index.html loads board.js then ui.js as classic scripts', () => {
  const html = withoutHtmlComments(readProjectFile('index.html'));

  assert.ok(
    !/type\s*=\s*["']module["']/.test(html),
    'index.html must not use type="module"; file:// blocks module scripts',
  );

  const boardAt = html.indexOf('src="board.js"');
  const uiAt = html.indexOf('src="ui.js"');
  assert.ok(boardAt !== -1, 'index.html must load board.js');
  assert.ok(uiAt !== -1, 'index.html must load ui.js');
  assert.ok(boardAt < uiAt, 'board.js must load before ui.js');
});

test('nothing the browser loads reaches the network', () => {
  for (const name of ['index.html', 'ui.js', 'styles.css']) {
    const source = withoutHtmlComments(readProjectFile(name));
    assert.ok(
      !/\bhttps?:\/\//.test(source),
      `${name} must not reference an absolute http(s) URL`,
    );
    assert.ok(
      !/(?:src|href)\s*=\s*["']\/\//.test(source),
      `${name} must not reference a protocol-relative URL`,
    );
  }
});

test('index.html links the stylesheet and provides the elements ui.js renders into', () => {
  const html = readProjectFile('index.html');

  assert.ok(
    /<link[^>]+href="styles\.css"/.test(html),
    'index.html must link styles.css',
  );
  for (const id of ['status', 'mines-remaining', 'new-game', 'board']) {
    assert.ok(
      new RegExp(`id="${id}"`).test(html),
      `index.html must contain an element with id="${id}"`,
    );
  }
});

// ---------------------------------------------------------------------------
// Phase 04: input, new game, and status wiring.
//
// Behaviour still has to be driven in a browser, since ui.js is DOM code the
// suite may never load. What the suite can hold are the rules that are easy to
// break by accident and expensive to catch by eye: the binding table being the
// only place a key is bound (so no restart key can creep in), the context menu
// being suppressed over the board rather than the whole page, and reset having
// exactly one entry point.
// ---------------------------------------------------------------------------

// Pulls the quoted key names out of one named binding table in ui.js, so the
// test reads the actual bindings rather than trusting a comment about them.
const bindingTable = (source, name) => {
  const match = new RegExp(`var ${name} = ([\\[{][\\s\\S]*?[\\]}]);`).exec(
    source,
  );
  assert.ok(match, `ui.js must declare a ${name} binding table`);
  return (match[1].match(/'([^']*)'|(\bArrow\w+\b)|(\bEnter\b)/g) || []).map(
    (token) => token.replace(/'/g, ''),
  );
};

test('ui.js moves the cursor with the four arrow keys and nothing else', () => {
  const source = readProjectFile('ui.js');

  assert.deepEqual(bindingTable(source, 'CURSOR_STEPS').sort(), [
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
  ]);
});

test('ui.js reveals on Enter and Space and marks on F, and binds no other key', () => {
  const source = readProjectFile('ui.js');

  assert.deepEqual(bindingTable(source, 'REVEAL_KEYS').sort(), [' ', 'Enter']);
  assert.deepEqual(bindingTable(source, 'MARK_KEYS').sort(), ['F', 'f']);

  // The tables above are the whole binding surface only if no handler compares
  // event.key to a literal of its own. This is the guard that keeps a restart
  // key -- which the spec forbids outright -- from ever being added quietly.
  assert.ok(
    !/\bkey\s*===\s*['"]/.test(source),
    'ui.js must bind keys through the tables, not by comparing event.key',
  );
});

test('ui.js suppresses the context menu over the board only', () => {
  const source = readProjectFile('ui.js');

  assert.ok(
    /boardElement\.addEventListener\(\s*'contextmenu'/.test(source),
    'ui.js must suppress the context menu on the board element',
  );
  assert.ok(
    !/(?:document|window)\.addEventListener\(\s*'contextmenu'/.test(source),
    'context-menu suppression must not reach the whole page',
  );
});

test('ui.js reads the board only through the public surface', () => {
  const source = readProjectFile('ui.js');

  // ui.js may not reimplement a rule. Everything it changes must go through
  // reveal / toggleMark / reset, and everything it draws comes from snapshot.
  const calls = (source.match(/\bgame\.(\w+)\(/g) || []).map((call) =>
    call.slice('game.'.length, -1),
  );
  assert.deepEqual(
    [...new Set(calls)].sort(),
    ['reset', 'reveal', 'snapshot', 'toggleMark'],
  );
});

test('the New game button is the only way to reset the game', () => {
  const source = readProjectFile('ui.js');

  assert.equal(
    (source.match(/\bgame\.reset\(/g) || []).length,
    1,
    'reset must have exactly one call site',
  );
  assert.ok(
    /newGameElement\.addEventListener\(\s*'click'/.test(source),
    'the New game button must be wired to a click handler',
  );
  // The single reset call site has to be the button's, not a key handler's:
  // it must fall after the New game listener and before any listener wired
  // after it, which pins it inside that handler's body.
  const wiring = "newGameElement.addEventListener('click'";
  const buttonAt = source.indexOf(wiring);
  const resetAt = source.indexOf('game.reset(');
  assert.ok(
    resetAt > buttonAt,
    'the reset call must live inside the New game click handler',
  );
  const nextListenerAt = source.indexOf(
    'addEventListener(',
    buttonAt + wiring.length,
  );
  assert.ok(
    nextListenerAt === -1 || resetAt < nextListenerAt,
    'the reset call must not sit in a listener wired after the button',
  );
});
