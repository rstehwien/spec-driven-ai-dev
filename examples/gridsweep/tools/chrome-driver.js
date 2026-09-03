'use strict';

// A minimal headless-Chrome driver, built from Node built-ins only.
//
// The project ships with no package.json and no dependencies, so this speaks
// the DevTools protocol directly. It uses Chrome's pipe transport
// (`--remote-debugging-pipe`): messages are NUL-terminated JSON written to the
// child's fd 3 and read back from fd 4. That avoids a WebSocket client
// entirely, which is what would otherwise have forced either a dependency or a
// Node version newer than the spec's "Node 18 or newer".
//
// Nothing here knows a game rule. It opens a page, sends real input events,
// and reads the DOM back -- the same things a player's browser does.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Where a browser is likely to be, in the order worth trying. CHROME_PATH
// wins so a reviewer can point the suite at any Chromium build they have.
const CANDIDATE_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

// The one question the test file asks before deciding whether to run: is there
// a browser on this machine at all? Returns null rather than throwing, because
// "no Chrome here" is a skip, not a failure.
function findChrome() {
  for (const candidate of CANDIDATE_PATHS) {
    if (!candidate) continue;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Not this one.
    }
  }
  return null;
}

const LAUNCH_ARGS = [
  '--headless=new',
  '--remote-debugging-pipe',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--mute-audio',
  '--window-size=1024,900',
];

const COMMAND_TIMEOUT_MS = 20000;

// One CDP connection over the pipe. Commands are promises keyed by id; events
// go to whoever is waiting for them, so a hang fails loudly on a timeout
// instead of parking `node --test` forever.
class Connection {
  constructor(child) {
    this.child = child;
    this.writer = child.stdio[3];
    this.reader = child.stdio[4];
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
    this.closed = null;
    this.buffer = Buffer.alloc(0);

    this.reader.on('data', (chunk) => this.receive(chunk));
    child.on('exit', (code, signal) => {
      this.fail(new Error(`chrome exited early (code ${code}, signal ${signal})`));
    });
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let end = this.buffer.indexOf(0);
    while (end !== -1) {
      const message = this.buffer.subarray(0, end).toString('utf8');
      this.buffer = this.buffer.subarray(end + 1);
      end = this.buffer.indexOf(0);
      if (message) this.dispatch(JSON.parse(message));
    }
  }

  dispatch(message) {
    if (message.id !== undefined) {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new Error(`${message.error.message} (${entry.method})`));
      } else {
        entry.resolve(message.result);
      }
      return;
    }
    for (const handler of [...this.handlers]) handler(message);
  }

  fail(error) {
    this.closed = this.closed || error;
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }

  send(method, params, sessionId) {
    if (this.closed) return Promise.reject(this.closed);

    const id = this.nextId;
    this.nextId += 1;

    const message = { id, method, params: params || {} };
    if (sessionId) message.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out after ${COMMAND_TIMEOUT_MS}ms: ${method}`));
      }, COMMAND_TIMEOUT_MS);
      timer.unref();

      this.pending.set(id, { resolve, reject, timer, method });
      this.writer.write(`${JSON.stringify(message)}\0`);
    });
  }

  // Resolves on the first matching event. Used only for load notifications,
  // where the alternative is polling the DOM for readiness.
  once(method, sessionId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.handlers.delete(handler);
        reject(new Error(`timed out after ${COMMAND_TIMEOUT_MS}ms waiting for ${method}`));
      }, COMMAND_TIMEOUT_MS);
      timer.unref();

      const handler = (message) => {
        if (message.method !== method) return;
        if (sessionId && message.sessionId !== sessionId) return;
        clearTimeout(timer);
        this.handlers.delete(handler);
        resolve(message.params);
      };
      this.handlers.add(handler);
    });
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

// Enough of a key descriptor for Chrome to deliver the event the page would
// see from a real press. `text` is what separates a character-producing key
// from a bare navigation key.
//
// Deliberately only the keys the page consumes, plus Tab, whose default action
// the renderer performs itself. See `press` below for why an unconsumed key
// cannot go through this path.
const KEYS = {
  ArrowUp: { keyCode: 38, code: 'ArrowUp' },
  ArrowDown: { keyCode: 40, code: 'ArrowDown' },
  ArrowLeft: { keyCode: 37, code: 'ArrowLeft' },
  ArrowRight: { keyCode: 39, code: 'ArrowRight' },
  Enter: { keyCode: 13, code: 'Enter', text: '\r' },
  ' ': { keyCode: 32, code: 'Space', text: ' ' },
  f: { keyCode: 70, code: 'KeyF', text: 'f' },
  F: { keyCode: 70, code: 'KeyF', text: 'F', modifiers: 8 },
  Tab: { keyCode: 9, code: 'Tab' },
};

class Page {
  constructor(connection, sessionId) {
    this.connection = connection;
    this.sessionId = sessionId;
    this.problems = [];
  }

  command(method, params) {
    return this.connection.send(method, params, this.sessionId);
  }

  // Anything the page complained about: a thrown exception, a console error,
  // or a subresource that failed to load. A clean run leaves this empty, which
  // is itself one of the assertions worth making.
  watchForProblems() {
    this.connection.on((message) => {
      if (message.sessionId !== this.sessionId) return;
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        this.problems.push(
          `exception: ${details.exception ? details.exception.description : details.text}`,
        );
      }
      if (message.method === 'Runtime.consoleAPICalled') {
        if (message.params.type !== 'error') return;
        const text = message.params.args
          .map((arg) => arg.description || arg.value)
          .join(' ');
        this.problems.push(`console.error: ${text}`);
      }
      if (message.method === 'Log.entryAdded') {
        const entry = message.params.entry;
        if (entry.level === 'error') this.problems.push(`log: ${entry.text}`);
      }
    });
  }

  async navigate(url) {
    this.problems = [];
    const loaded = this.connection.once('Page.loadEventFired', this.sessionId);
    await this.command('Page.navigate', { url });
    await loaded;
    // The scripts are classic and synchronous, so the load event is the point
    // at which the first render has already happened.
  }

  async evaluate(expression) {
    const result = await this.command('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const details = result.exceptionDetails;
      throw new Error(
        `page threw: ${details.exception ? details.exception.description : details.text}`,
      );
    }
    return result.result.value;
  }

  // A real key event, delivered through the browser's input pipeline and
  // awaited, so the page has finished reacting by the time this resolves.
  //
  // Only for keys the page consumes. When a key event reaches the browser
  // unconsumed -- no preventDefault, no renderer-side default action -- headless
  // Chrome's acknowledgement of the dispatch stalls for seconds and sometimes
  // past any sane timeout. That is reproducible on about:blank with no page of
  // ours involved, so it is the browser's input plumbing, not the game. Use
  // pressIgnoredKey for anything the page is meant to ignore.
  async press(key) {
    const descriptor = KEYS[key];
    if (!descriptor) throw new Error(`no descriptor for key ${JSON.stringify(key)}`);

    const base = {
      key,
      code: descriptor.code,
      windowsVirtualKeyCode: descriptor.keyCode,
      nativeVirtualKeyCode: descriptor.keyCode,
      modifiers: descriptor.modifiers || 0,
    };

    await this.command('Input.dispatchKeyEvent', {
      ...base,
      type: descriptor.text ? 'keyDown' : 'rawKeyDown',
      text: descriptor.text,
    });
    await this.command('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  }

  async pressAll(keys) {
    for (const key of keys) await this.press(key);
  }

  // A key the page is expected to ignore, dispatched as a KeyboardEvent on the
  // focused element so it bubbles into the same listener a real press would
  // reach. This is the escape hatch for the stall described on `press`: it
  // costs the browser's own default handling, which is precisely the part a
  // key the game does not bind has no business exercising.
  async pressIgnoredKey(key) {
    const literal = JSON.stringify(key);
    await this.evaluate(`
      const target = document.activeElement || document.body;
      const init = { key: ${literal}, bubbles: true, cancelable: true };
      target.dispatchEvent(new KeyboardEvent('keydown', init));
      target.dispatchEvent(new KeyboardEvent('keyup', init));
      return true;
    `);
  }

  // A real pointer press at the centre of an element, found by selector. The
  // coordinates come from the page's own layout, so this is a click where the
  // player would see the thing they are clicking.
  async clickSelector(selector, button) {
    const box = await this.evaluate(`
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    `);
    if (!box) throw new Error(`no element matches ${selector}`);

    const which = button || 'left';
    const buttons = which === 'right' ? 2 : 1;
    const common = { x: box.x, y: box.y, button: which, buttons, clickCount: 1 };

    await this.command('Input.dispatchMouseEvent', { ...common, type: 'mousePressed' });
    await this.command('Input.dispatchMouseEvent', {
      ...common,
      type: 'mouseReleased',
      buttons: 0,
    });
  }
}

class Browser {
  constructor(child, connection, userDataDir) {
    this.child = child;
    this.connection = connection;
    this.userDataDir = userDataDir;

    // A test run that dies before close() -- an assertion that throws inside a
    // hook, a Ctrl-C -- must not leave a browser and a profile directory
    // behind on the reviewer's machine.
    this.cleanup = () => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Already gone.
      }
      fs.rmSync(userDataDir, { recursive: true, force: true });
    };
    process.once('exit', this.cleanup);
  }

  async openPage() {
    const { targetId } = await this.connection.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await this.connection.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });

    const page = new Page(this.connection, sessionId);
    page.watchForProblems();
    await page.command('Runtime.enable');
    await page.command('Log.enable');
    await page.command('Page.enable');
    return page;
  }

  async close() {
    process.removeListener('exit', this.cleanup);

    try {
      await this.connection.send('Browser.close');
    } catch {
      this.child.kill('SIGKILL');
    }
    await new Promise((resolve) => {
      if (this.child.exitCode !== null || this.child.signalCode !== null) return resolve();
      this.child.once('exit', resolve);
      setTimeout(() => {
        this.child.kill('SIGKILL');
        resolve();
      }, 5000).unref();
    });
    fs.rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

async function launchChrome() {
  const executable = findChrome();
  if (!executable) throw new Error('no Chrome or Chromium found');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gridsweep-chrome-'));
  const child = spawn(executable, [...LAUNCH_ARGS, `--user-data-dir=${userDataDir}`], {
    // fd 3 is what Chrome reads commands from; fd 4 is what it answers on.
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
  });

  // Chrome's own stderr carries display-layer noise on a headless mac. It is
  // the browser talking, not the page, so it is drained and dropped.
  child.stderr.resume();

  const connection = new Connection(child);
  const browser = new Browser(child, connection, userDataDir);

  try {
    await connection.send('Target.setDiscoverTargets', { discover: true });
  } catch (error) {
    await browser.close();
    throw error;
  }

  return browser;
}

// The page under test, as a file:// URL -- the way the spec says the game is
// delivered. Serving it over http would test a page nobody opens.
function gameUrl() {
  return new URL(`file://${path.join(__dirname, '..', 'index.html')}`).href;
}

module.exports = { findChrome, launchChrome, gameUrl };
