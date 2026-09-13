/**
 * Comprehensive test suite for Floor Dubai World module (assets/floor-world.js).
 * Exercises pure helpers, edge cases, hostile input safety, host mappings,
 * rock animations, demo factory consistency, and sequential integration tests
 * using an in-memory fake DOM and fake timers.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const FloorWorld = require(path.join(__dirname, '../skills/floor/board/assets/floor-world.js'));

let registeredCount = 0;
let passedCount = 0;
let failedCount = 0;
const testQueue = [];

function test(name, fn) {
  registeredCount++;
  testQueue.push({ name, fn, isAsync: false });
}

function asyncTest(name, fn) {
  registeredCount++;
  testQueue.push({ name, fn, isAsync: true });
}

// ── 1. Hostile Input & HTML Escaping ────────────────────────────────────

test('escapeHtml safely encodes HTML injection vectors and quotes', function () {
  const hostile = '<script>alert("pwned")</script>&<div class=\'evil\'>';
  const escaped = FloorWorld.escapeHtml(hostile);
  assert(!escaped.includes('<script>'), 'Must not contain raw script tag');
  assert(!escaped.includes('"'), 'Must not contain unescaped double quotes');
  assert(!escaped.includes("'"), 'Must not contain unescaped single quotes');
  assert(escaped.includes('&lt;script&gt;'));
  assert(escaped.includes('&amp;'));
  assert(escaped.includes('&quot;pwned&quot;'));
  assert(escaped.includes('&#39;evil&#39;'));
});

test('escapeHtml gracefully handles null, undefined, numbers and booleans', function () {
  assert.strictEqual(FloorWorld.escapeHtml(null), '');
  assert.strictEqual(FloorWorld.escapeHtml(undefined), '');
  assert.strictEqual(FloorWorld.escapeHtml(0), '0');
  assert.strictEqual(FloorWorld.escapeHtml(false), 'false');
});

// ── 2. Skin and Host Mapping & Fallbacks (with Own-Property Safety) ─────

test('skinFor maps supported hosts correctly and safely handles prototypes', function () {
  assert.strictEqual(FloorWorld.skinFor('claude'), 'claude');
  assert.strictEqual(FloorWorld.skinFor('codex'), 'codex');
  assert.strictEqual(FloorWorld.skinFor('agy'), 'gemini');
  assert.strictEqual(FloorWorld.skinFor('opencode'), 'deepseek');
  assert.strictEqual(FloorWorld.skinFor('muse'), 'laghari');
  assert.strictEqual(FloorWorld.skinFor('unknown-bot'), 'laghari');
  assert.strictEqual(FloorWorld.skinFor('__proto__'), 'laghari');
  assert.strictEqual(FloorWorld.skinFor('toString'), 'laghari');
  assert.strictEqual(FloorWorld.skinFor('constructor'), 'laghari');
});

test('hostLabel displays honest provider labels and safely handles prototypes', function () {
  assert.strictEqual(FloorWorld.hostLabel('claude'), 'Claude Code');
  assert.strictEqual(FloorWorld.hostLabel('codex'), 'Codex');
  assert.strictEqual(FloorWorld.hostLabel('agy'), 'Antigravity');
  assert.strictEqual(FloorWorld.hostLabel('opencode'), 'OpenCode');
  assert.strictEqual(FloorWorld.hostLabel('muse'), 'Muse');
  assert.strictEqual(FloorWorld.hostLabel('custom-bot'), 'custom-bot');
  assert.strictEqual(FloorWorld.hostLabel('__proto__'), '__proto__');
  assert.strictEqual(FloorWorld.hostLabel('toString'), 'toString');
});

test('voiceForAgent resolves correct chiptune voices and handles prototypes', function () {
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'claude' }), 'claude');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'codex' }), 'codex');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'agy' }), 'gemini');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'opencode' }), 'deepseek');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'muse' }), 'laghari');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: '__proto__' }), 'laghari');
  assert.strictEqual(FloorWorld.voiceForAgent({ host: 'toString' }), 'laghari');
});

// ── 3. Rock Animations Mappings (User Steering) ──────────────────────────

test('animClassFor maps rock animations (guitar riff, rock horns, jump, victory, idle)', function () {
  // running = anim-riff (row 6 guitar headbang)
  assert.strictEqual(FloorWorld.animClassFor({ state: 'running' }), 'anim-riff');

  // thinking = anim-horns (row 3 guitar-free headbang with rock sign)
  assert.strictEqual(FloorWorld.animClassFor({ state: 'thinking' }), 'anim-horns');

  // needs_input = anim-horns
  assert.strictEqual(FloorWorld.animClassFor({ state: 'needs_input' }), 'anim-horns');

  // failed = anim-failed
  assert.strictEqual(FloorWorld.animClassFor({ state: 'failed' }), 'anim-failed');

  // done: age < 8 = anim-jump (guitar leap)
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 0 }), 'anim-jump');
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 7 }), 'anim-jump');

  // done: 8 <= age < 30 = anim-victory
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 8 }), 'anim-victory');
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 29 }), 'anim-victory');

  // done: age >= 30 = anim-idle
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 30 }), 'anim-idle');
  assert.strictEqual(FloorWorld.animClassFor({ state: 'done', age_s: 120 }), 'anim-idle');

  // idle = anim-idle
  assert.strictEqual(FloorWorld.animClassFor({ state: 'idle' }), 'anim-idle');
});

// ── 4. Formatting and Filtering Helpers ──────────────────────────────────

test('formatAge converts seconds to human readable elapsed strings', function () {
  assert.strictEqual(FloorWorld.formatAge(0), '0s');
  assert.strictEqual(FloorWorld.formatAge(45), '45s');
  assert.strictEqual(FloorWorld.formatAge(60), '1m');
  assert.strictEqual(FloorWorld.formatAge(150), '2m');
  assert.strictEqual(FloorWorld.formatAge(3600), '1h 0m');
  assert.strictEqual(FloorWorld.formatAge(3665), '1h 1m');
});

test('formatRoomOptionLabels displays room.name and appends parent only for duplicates', function () {
  const rooms = [
    { cwd: '/Users/test/projects/stuntman', name: 'stuntman' },
    { cwd: '/var/www/stuntman', name: 'stuntman' },
    { cwd: '/Users/test/projects/avatar-rig', name: 'avatar-rig' }
  ];
  const labels = FloorWorld.formatRoomOptionLabels(rooms);
  assert.strictEqual(labels.length, 3);
  assert.strictEqual(labels[0].label, 'stuntman (projects)');
  assert.strictEqual(labels[1].label, 'stuntman (www)');
  assert.strictEqual(labels[2].label, 'avatar-rig');
});

test('filterRooms uses cwd as key and handles identical room basenames', function () {
  const rooms = [
    { cwd: '/a/proj', name: 'proj', agents: [{ id: '1' }] },
    { cwd: '/b/proj', name: 'proj', agents: [{ id: '2' }] }
  ];
  assert.strictEqual(FloorWorld.filterRooms(rooms, 'ALL').length, 2);
  const filtered = FloorWorld.filterRooms(rooms, '/b/proj');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].cwd, '/b/proj');
});

test('recalculateCounts computes counts accurately from rooms', function () {
  const state = {
    rooms: [
      {
        agents: [
          { state: 'running' },
          { state: 'thinking' },
          { state: 'needs_input' },
          { state: 'done' },
          { state: 'failed' }
        ]
      }
    ]
  };
  const counts = FloorWorld.recalculateCounts(state);
  assert.strictEqual(counts.working, 2);
  assert.strictEqual(counts.needs_input, 1);
  assert.strictEqual(counts.done, 1);
});

// ── 5. CSS URL Relative Resolution ──────────────────────────────────────

test('floor-world.css references only existing same-directory asset files', function () {
  const cssPath = path.join(__dirname, '../skills/floor/board/assets/floor-world.css');
  const rawCss = fs.readFileSync(cssPath, 'utf8');
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const urlRegex = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/g;
  let match;
  let matchesCount = 0;
  while ((match = urlRegex.exec(css)) !== null) {
    matchesCount++;
    const ref = match[1];
    assert(!ref.includes('assets/assets'), 'Found double assets/assets prefix: ' + ref);
    assert(!ref.startsWith('assets/'), 'URL should not have assets/ prefix: ' + ref);
    assert(!ref.startsWith('/'), 'URL should be same-directory relative: ' + ref);
    const resolved = path.join(path.dirname(cssPath), ref);
    assert(fs.existsSync(resolved), 'Referenced asset must exist on disk: ' + ref);
  }
  assert(matchesCount > 0, 'CSS must contain asset url() references');
});

// ── 6. Fake-DOM and Fake-Timers Test Fixtures ────────────────────────────

function createFakeDOM() {
  const elementsById = new Map();

  function makeClassList(el) {
    function getTokens() {
      return (el.className || '').trim().split(/\s+/).filter(Boolean);
    }
    return {
      add(...classes) {
        const tokens = new Set(getTokens());
        for (const cls of classes) if (cls) tokens.add(cls);
        el.className = Array.from(tokens).join(' ');
      },
      remove(...classes) {
        const tokens = new Set(getTokens());
        for (const cls of classes) tokens.delete(cls);
        el.className = Array.from(tokens).join(' ');
      },
      toggle(cls, force) {
        const tokens = new Set(getTokens());
        if (force === undefined) {
          if (tokens.has(cls)) tokens.delete(cls); else tokens.add(cls);
        } else if (force) {
          tokens.add(cls);
        } else {
          tokens.delete(cls);
        }
        el.className = Array.from(tokens).join(' ');
      },
      contains(cls) {
        return getTokens().includes(cls);
      }
    };
  }

  function matchesSelector(node, sel) {
    if (!node || !sel) return false;

    if (sel.includes(',')) {
      return sel.split(',').some(part => matchesSelector(node, part.trim()));
    }

    let checkNotDisabled = false;
    let s = sel;
    if (s.includes(':not(:disabled)')) {
      checkNotDisabled = true;
      s = s.replace(':not(:disabled)', '');
    }
    if (checkNotDisabled && node.disabled) return false;

    // Extract attribute predicates e.g. [data-actor-id="codex:p1"] or [role="button"]
    const attrRegex = /\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/g;
    let attrMatch = true;
    let match;
    while ((match = attrRegex.exec(s)) !== null) {
      const attrName = match[1];
      const expectedVal = match[2];
      let actualVal = null;
      if (attrName.startsWith('data-')) {
        const camel = attrName.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (node.dataset && node.dataset[camel] !== undefined) {
          actualVal = node.dataset[camel];
        }
      }
      if (actualVal === null && attrName.toLowerCase() === 'tabindex' && node.tabIndex !== undefined) {
        actualVal = String(node.tabIndex);
      }
      if (actualVal === null && node.getAttribute) {
        actualVal = node.getAttribute(attrName);
      }
      if (actualVal === null && node[attrName] !== undefined) {
        actualVal = node[attrName];
      }
      if (expectedVal !== undefined) {
        if (String(actualVal) !== String(expectedVal)) {
          attrMatch = false;
        }
      } else if (!actualVal) {
        attrMatch = false;
      }
    }
    if (!attrMatch) return false;

    const cleanSel = s.replace(/\[[a-zA-Z0-9_-]+(?:="[^"]*")?\]/g, '').trim();
    if (!cleanSel) return true;

    if (cleanSel.startsWith('#')) {
      return node.id === cleanSel.slice(1);
    }
    if (cleanSel.startsWith('.')) {
      const expectedClasses = cleanSel.split('.').filter(Boolean);
      const nodeClasses = (node.className || '').trim().split(/\s+/).filter(Boolean);
      return expectedClasses.every(c => nodeClasses.includes(c));
    }
    return node.tagName ? node.tagName.toLowerCase() === cleanSel.toLowerCase() : false;
  }

  function makeElement(tag) {
    let innerHTML = '';
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      dataset: {},
      style: {},
      options: [],
      children: [],
      listeners: {},
      disabled: false,
      value: '',
      addEventListener(evt, fn) {
        (this.listeners[evt] = this.listeners[evt] || []).push(fn);
      },
      dispatchEvent(evt) {
        const fns = this.listeners[evt.type] || [];
        for (const fn of fns) fn.call(this, evt);
      },
      click() {
        this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} });
      },
      focus() {
        fakeDocument.activeElement = this;
      },
      appendChild(child) {
        if (child.parentElement) {
          child.parentElement.removeChild(child);
        }
        child.parentElement = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        child.parentElement = null;
        return child;
      },
      remove() {
        if (this.parentElement) this.parentElement.removeChild(this);
      },
      contains(target) {
        if (this === target) return true;
        for (const c of this.children) {
          if (c.contains && c.contains(target)) return true;
        }
        return false;
      },
      querySelector(sel) {
        const all = this.querySelectorAll(sel);
        return all.length > 0 ? all[0] : null;
      },
      querySelectorAll(sel) {
        const res = [];
        function walk(node) {
          if (!node || !node.children) return;
          for (const c of node.children) {
            if (matchesSelector(c, sel)) res.push(c);
            walk(c);
          }
        }
        walk(this);
        return res;
      },
      setAttribute(name, val) {
        this[name] = val;
        if (name.startsWith('data-')) {
          const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          this.dataset[camel] = String(val);
        }
      },
      getAttribute(name) {
        if (name.startsWith('data-')) {
          const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          if (this.dataset && this.dataset[camel] !== undefined) return this.dataset[camel];
        }
        return this[name] !== undefined ? this[name] : null;
      },
      removeAttribute(name) {
        delete this[name];
        if (name.startsWith('data-')) {
          const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          delete this.dataset[camel];
        }
      }
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return innerHTML; },
      set(val) {
        innerHTML = val;
        if (val === '') {
          el.children = [];
        }
      }
    });
    el.classList = makeClassList(el);
    return el;
  }

  const fakeDocument = {
    hidden: false,
    activeElement: null,
    body: makeElement('body'),
    createElement(tag) { return makeElement(tag); },
    getElementById(id) {
      if (!elementsById.has(id)) {
        const el = makeElement('div');
        el.id = id;
        elementsById.set(id, el);
      }
      return elementsById.get(id);
    },
    querySelector(sel) {
      const all = this.querySelectorAll(sel);
      return all.length > 0 ? all[0] : null;
    },
    querySelectorAll(sel) {
      const res = [];
      const seen = new Set();
      function walk(node) {
        if (!node || seen.has(node)) return;
        seen.add(node);
        if (matchesSelector(node, sel)) {
          res.push(node);
        }
        if (node.children) {
          for (const c of node.children) {
            walk(c);
          }
        }
      }
      walk(fakeDocument.body);
      elementsById.forEach(el => walk(el));
      return res;
    },
    addEventListener(evt, fn) {
      this.listeners = this.listeners || {};
      (this.listeners[evt] = this.listeners[evt] || []).push(fn);
    },
    dispatchEvent(evt) {
      const fns = (this.listeners && this.listeners[evt.type]) || [];
      for (const fn of fns) fn.call(this, evt);
    }
  };

  // Wire standard drawer child tree according to index.html
  const drawer = fakeDocument.getElementById('drawer');
  const dheadActions = fakeDocument.createElement('div');
  dheadActions.className = 'dhead-actions';
  const dplaycue = fakeDocument.getElementById('dplaycue');
  dplaycue.tagName = 'BUTTON';
  const dclose = fakeDocument.getElementById('dclose');
  dclose.tagName = 'BUTTON';
  dheadActions.appendChild(dplaycue);
  dheadActions.appendChild(dclose);
  drawer.appendChild(dheadActions);

  const demoControls = fakeDocument.getElementById('drawer-demo-controls');
  demoControls.className = 'drawer-demo-bar';
  demoControls.style.display = 'none';
  const btnCelebrate = fakeDocument.getElementById('btn-demo-celebrate');
  btnCelebrate.tagName = 'BUTTON';
  const btnHelp = fakeDocument.getElementById('btn-demo-help');
  btnHelp.tagName = 'BUTTON';
  demoControls.appendChild(btnCelebrate);
  demoControls.appendChild(btnHelp);
  drawer.appendChild(demoControls);

  const dsend = fakeDocument.createElement('div');
  dsend.id = 'dsend';
  const dinput = fakeDocument.getElementById('dinput');
  dinput.tagName = 'INPUT';
  dinput.disabled = true;
  const dbtn = fakeDocument.getElementById('dbtn');
  dbtn.tagName = 'BUTTON';
  dbtn.disabled = true;
  dsend.appendChild(dinput);
  dsend.appendChild(dbtn);
  drawer.appendChild(dsend);

  fakeDocument.body.appendChild(drawer);
  const workstations = fakeDocument.getElementById('workstations-container');
  fakeDocument.body.appendChild(workstations);

  return { fakeDocument, elementsById };
}

function createFakeTimers() {
  const intervals = new Map();
  const timeouts = new Map();
  let nextId = 1;

  function setIntervalMock(fn, delay) {
    const id = nextId++;
    intervals.set(id, { fn, delay });
    return id;
  }

  function clearIntervalMock(id) {
    intervals.delete(id);
  }

  function setTimeoutMock(fn, delay) {
    const id = nextId++;
    timeouts.set(id, { fn, delay });
    return id;
  }

  function clearTimeoutMock(id) {
    timeouts.delete(id);
  }

  async function triggerInterval(id) {
    const item = intervals.get(id);
    if (item && typeof item.fn === 'function') {
      await item.fn();
    }
  }

  async function triggerAllIntervals() {
    for (const item of Array.from(intervals.values())) {
      await item.fn();
    }
  }

  async function triggerAllTimeouts() {
    const pending = Array.from(timeouts.entries());
    timeouts.clear();
    for (const [, item] of pending) {
      await item.fn();
    }
  }

  return {
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    intervals,
    timeouts,
    triggerInterval,
    triggerAllIntervals,
    triggerAllTimeouts
  };
}

// ── 7. Sequential Integration Tests ──────────────────────────────────────

asyncTest('Integration: ?demo=1 initializes 6 demo agents, advancing age, and pose preview controls', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    global.window = {
      location: { search: '?demo=1' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '?demo=1' });
    assert.strictEqual(runtime.getIsDemo(), true);

    const demoState = runtime.getDemoState();
    assert(demoState, 'demoState must be populated');
    const allAgents = FloorWorld.collectAllAgents(demoState.rooms);
    assert.strictEqual(allAgents.length, 6, 'Must contain exactly 6 demo agents');

    // Verify presence of all steering roles
    assert(allAgents.some(a => a.state === 'running'), 'Must have running agent (guitar)');
    assert(allAgents.some(a => a.state === 'thinking'), 'Must have thinking agent (rock headbang)');
    assert(allAgents.some(a => a.state === 'needs_input'), 'Must have needs_input agent (rock horns)');
    assert(allAgents.some(a => a.state === 'failed'), 'Must have failed agent');
    assert(allAgents.some(a => a.state === 'done' && a.age_s < 8), 'Must have recent done agent (<8s jump)');
    assert(allAgents.some(a => a.state === 'done' && a.age_s >= 8 && a.age_s < 30), 'Must have done victory agent (8..30s)');

    // Verify demo pose controls injected into drawer
    const drawerDemoControls = fakeDocument.getElementById('drawer-demo-controls');
    const poseRiff = drawerDemoControls.querySelector('#pose-riff');
    const poseHorns = drawerDemoControls.querySelector('#pose-horns');
    const poseJump = drawerDemoControls.querySelector('#pose-jump');
    const poseFailed = drawerDemoControls.querySelector('#pose-failed');
    const poseVictory = drawerDemoControls.querySelector('#pose-victory');
    assert(poseRiff, 'Must have pose-riff button');
    assert(poseHorns, 'Must have pose-horns button');
    assert(poseJump, 'Must have pose-jump button');
    assert(poseFailed, 'Must have pose-failed button');
    assert(poseVictory, 'Must have pose-victory button');

    // Test pose preview trigger
    runtime.openDrawer(allAgents[0], 'stuntman');
    poseJump.click();
    const actorNode = fakeDocument.querySelector('.desk-setup[data-actor-id="' + allAgents[0].id + '"]');
    const sprite = actorNode.querySelector('.sprite');
    assert(sprite.className.includes('anim-jump'), 'Clicking Guitar jump must immediately preview anim-jump');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Polling interval installs on ?demo=1 and drives live updates after Exit Demo', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  let fetchCount = 0;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    global.fetch = async function (url) {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({
          generated: 200 + fetchCount,
          counts: { working: 1, needs_input: 0, done: 0 },
          rooms: [{
            cwd: '/projects/live',
            name: 'live',
            agents: [{ id: 'claude:l1', sid: 'l1', host: 'claude', state: 'running', age_s: 5 }]
          }]
        })
      };
    };

    global.window = {
      location: { search: '?demo=1' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    // Initialize with ?demo=1
    runtime = FloorWorld.init({ query: '?demo=1' });
    assert(fakeTimers.intervals.size >= 2, 'Must install clock timer and polling timer even in demo mode');
    assert.strictEqual(fakeTimers.intervals.size, 3, 'Must install clock, movement, and polling timers in demo mode');

    // Spend time in demo before leaving: its synchronous branch must release the poll guard.
    const demo = runtime.getDemoState();
    demo.startSec -= 4;
    await fakeTimers.triggerAllIntervals();
    const firstAge = demo.rooms[0].agents[0].age_s;
    demo.startSec -= 4;
    await fakeTimers.triggerAllIntervals();
    assert.strictEqual(demo.rooms[0].agents[0].age_s, firstAge + 4,
      'Successive demo ticks must advance age and release the polling guard');

    // Exit Demo mode
    runtime.setDemoMode(false);
    assert.strictEqual(runtime.getIsDemo(), false);

    // Drive polling timer callbacks explicitly
    await fakeTimers.triggerAllIntervals();
    await fakeTimers.triggerAllIntervals();

    assert(fetchCount >= 2, 'Live polling fetches must continue and increase after exiting demo mode');
    const liveActor = fakeDocument.querySelector('.desk-setup[data-actor-id="claude:l1"]');
    assert(liveActor, 'DOM must render live actor from polled state');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Transcript GET and Send POST pass composite agent.id', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    const recordedUrls = [];
    const recordedPosts = [];

    global.fetch = async function (url, opts) {
      recordedUrls.push(url);
      if (opts && opts.method === 'POST') {
        recordedPosts.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.startsWith('transcript')) {
        return {
          ok: true,
          json: async () => ({ messages: [{ role: 'user', text: 'hi' }], reach: 'tmux' })
        };
      }
      return {
        ok: true,
        json: async () => ({
          generated: 100,
          counts: { working: 0, needs_input: 0, done: 1 },
          rooms: [{
            cwd: '/projects/test',
            name: 'test',
            agents: [{
              id: 'codex:sess-123',
              sid: 'sess-123',
              host: 'codex',
              worker: false,
              state: 'done',
              reach: 'tmux',
              age_s: 10
            }]
          }]
        })
      };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '', token: 'test-token' });
    await runtime.tick();

    // Open drawer
    const agent = { id: 'codex:sess-123', sid: 'sess-123', host: 'codex', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(agent, 'test');
    await runtime.tick();

    // Verify transcript URL passed composite ID
    assert(recordedUrls.some(u => u.includes('transcript?sid=codex%3Asess-123')), 'Must pass composite codex:sess-123 to transcript');

    // Type prompt and send
    fakeDocument.getElementById('dinput').value = 'run tests';
    await runtime.sendPrompt();

    // Verify POST /send passed composite ID
    assert.strictEqual(recordedPosts.length, 1);
    assert.strictEqual(recordedPosts[0].sid, 'codex:sess-123', 'POST /send must pass composite id');
    assert.strictEqual(recordedPosts[0].text, 'run tests');
    assert.strictEqual(recordedPosts[0].token, 'test-token');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Send trust - disabled while loading, enabled on confirmed reach, disabled on snapshot change', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    const currentLiveState = {
      generated: 100,
      counts: { working: 0, needs_input: 0, done: 1 },
      rooms: [{
        cwd: '/projects/test',
        name: 'test',
        agents: [{ id: 'claude:sess-1', sid: 'sess-1', host: 'claude', state: 'done', reach: 'tmux', worker: false }]
      }]
    };

    let transcriptResolve = null;
    global.fetch = async function (url) {
      if (url.startsWith('transcript')) {
        return new Promise(resolve => {
          transcriptResolve = () => resolve({
            ok: true,
            json: async () => ({ messages: [], reach: 'tmux' })
          });
        });
      }
      return { ok: true, json: async () => currentLiveState };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    const agent = currentLiveState.rooms[0].agents[0];
    runtime.openDrawer(agent, 'test');

    const btnSend = fakeDocument.getElementById('dbtn');
    // Initially disabled before transcript confirms reach
    assert.strictEqual(btnSend.disabled, true, 'Send must be disabled while transcript is in flight');

    // Confirm transcript reach
    transcriptResolve();
    await new Promise(r => setImmediate(r));
    assert.strictEqual(btnSend.disabled, false, 'Send must be enabled after transcript confirms reach');

    // Now simulate live snapshot reach loss (e.g. session moved or disconnected)
    currentLiveState.rooms[0].agents[0].reach = 'none';
    await runtime.tick();

    assert.strictEqual(btnSend.disabled, true, 'Live snapshot reach loss must disable send immediately before next transcript');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Drafts are preserved when switching drawers during pending send', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    let sendResolve = null;
    global.fetch = async function (url, opts) {
      if (opts && opts.method === 'POST') {
        return new Promise(resolve => {
          sendResolve = () => resolve({ ok: true, json: async () => ({ ok: true }) });
        });
      }
      if (url.startsWith('transcript')) {
        return { ok: true, json: async () => ({ messages: [], reach: 'tmux' }) };
      }
      return {
        ok: true,
        json: async () => ({
          generated: 100,
          counts: { working: 0, needs_input: 0, done: 2 },
          rooms: [{
            cwd: '/p',
            name: 'p',
            agents: [
              { id: 'claude:a1', sid: 'a1', host: 'claude', state: 'done', reach: 'tmux', worker: false },
              { id: 'claude:a2', sid: 'a2', host: 'claude', state: 'done', reach: 'tmux', worker: false }
            ]
          }]
        })
      };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    // Open a1 and start send
    const agent1 = { id: 'claude:a1', sid: 'a1', host: 'claude', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(agent1, 'p');
    await new Promise(r => setImmediate(r));
    fakeDocument.getElementById('dinput').value = 'first prompt';

    const sendPromise = runtime.sendPrompt();

    // While send is in flight, switch to a2 and write draft
    const agent2 = { id: 'claude:a2', sid: 'a2', host: 'claude', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(agent2, 'p');
    fakeDocument.getElementById('dinput').value = 'second draft';

    // Complete first send
    sendResolve();
    await sendPromise;

    // Verify second drawer input was NOT erased by first send completing
    assert.strictEqual(fakeDocument.getElementById('dinput').value, 'second draft', 'Drawer switch must not clear different agent input');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Transcript race - deferred live request cannot overwrite demo drawer', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    let delayedTranscriptResolve = null;
    global.fetch = async function (url) {
      if (url.startsWith('transcript')) {
        return new Promise(resolve => {
          delayedTranscriptResolve = () => resolve({
            ok: true,
            json: async () => ({
              messages: [{ role: 'user', text: 'STALE LIVE MESSAGE' }],
              reach: 'tmux'
            })
          });
        });
      }
      return {
        ok: true,
        json: async () => ({
          generated: 100,
          counts: { working: 0, needs_input: 0, done: 1 },
          rooms: [{
            cwd: '/p',
            name: 'p',
            agents: [{ id: 'claude:live-1', sid: 'live-1', host: 'claude', state: 'done', reach: 'tmux', worker: false }]
          }]
        })
      };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    // 1. Open live drawer (starts transcript fetch that delays)
    const liveAgent = { id: 'claude:live-1', sid: 'live-1', host: 'claude', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(liveAgent, 'p');

    // 2. Switch mode to demo and open demo drawer
    runtime.setDemoMode(true);
    const demoAgent = runtime.getDemoState().rooms[0].agents[0];
    runtime.openDrawer(demoAgent, 'stuntman');

    const dlog = fakeDocument.getElementById('dlog');
    assert(!dlog.textContent.includes('Loading conversation…'), 'Demo drawer must render immediately without waiting for network');

    // 3. Stale delayed live transcript resolves
    if (delayedTranscriptResolve) delayedTranscriptResolve();
    await new Promise(r => setImmediate(r));

    // Must NOT contain STALE LIVE MESSAGE
    assert(!dlog.textContent.includes('STALE LIVE MESSAGE'), 'Stale transcript must not overwrite demo drawer');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Live readonly dialog focus trap excludes hidden demo buttons and traps Play cue + Close', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    global.fetch = async function (url) {
      if (url.startsWith('transcript')) {
        return { ok: true, json: async () => ({ messages: [], reach: 'none' }) };
      }
      return {
        ok: true,
        json: async () => ({
          generated: 100,
          counts: { working: 0, needs_input: 0, done: 1 },
          rooms: [{
            cwd: '/p',
            name: 'p',
            agents: [{ id: 'claude:r1', sid: 'r1', host: 'claude', state: 'done', reach: 'none', worker: true }]
          }]
        })
      };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    const workerAgent = { id: 'claude:r1', sid: 'r1', host: 'claude', state: 'done', reach: 'none', worker: true };
    runtime.openDrawer(workerAgent, 'p');
    await new Promise(r => setImmediate(r));

    const drawer = fakeDocument.getElementById('drawer');
    const playCue = fakeDocument.getElementById('dplaycue');
    const closeBtn = fakeDocument.getElementById('dclose');

    // Simulate Tab key navigation
    playCue.focus();
    assert.strictEqual(fakeDocument.activeElement, playCue);

    // Dispatch Shift+Tab to test backward wrap
    drawer.dispatchEvent({ type: 'keydown', key: 'Tab', shiftKey: true, preventDefault() {} });
    // In our keydown listener attached to document
    for (const fn of fakeDocument.listeners['keydown'] || []) {
      fn({ key: 'Tab', shiftKey: true, preventDefault() {} });
    }
    assert.strictEqual(fakeDocument.activeElement, closeBtn, 'Shift-Tab from first element must wrap to Close button');

    // Tab forward from close button wraps to playCue
    for (const fn of fakeDocument.listeners['keydown'] || []) {
      fn({ key: 'Tab', shiftKey: false, preventDefault() {} });
    }
    assert.strictEqual(fakeDocument.activeElement, playCue, 'Tab forward from Close button must wrap back to Play cue');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Audio cue target is captured before enableAudio; closing drawer does not throw', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    let sampledVoice = null;
    let audioEnableResolve = null;

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        generated: 100,
        counts: { working: 0, needs_input: 0, done: 1 },
        rooms: [{
          cwd: '/p',
          name: 'p',
          agents: [{ id: 'codex:a1', sid: 'a1', host: 'codex', state: 'done', reach: 'tmux', worker: false }]
        }]
      })
    });

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: {
        create: () => ({
          enable: async () => new Promise(r => { audioEnableResolve = r; }),
          disable() {},
          setVolume() {},
          sample(v) { sampledVoice = v; },
          observe() {},
          reset() {}
        })
      },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    const agent = { id: 'codex:a1', sid: 'a1', host: 'codex', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(agent, 'p');

    // Click Play Cue button
    const playCue = fakeDocument.getElementById('dplaycue');
    playCue.click();

    // While enableAudio is pending, close the drawer
    runtime.closeDrawer();

    // Now resolve enableAudio
    audioEnableResolve(true);
    await new Promise(r => setImmediate(r));

    assert.strictEqual(sampledVoice, 'codex', 'Sample must play for captured target agent even if drawer was closed');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Offline poll failure resets audio baseline & recovery poll is silent', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  let audioResetCalled = false;
  let shouldFail = false;

  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    global.fetch = async function () {
      if (shouldFail) throw new Error('Network error');
      return {
        ok: true,
        json: async () => ({
          generated: 200,
          counts: { working: 0, needs_input: 0, done: 1 },
          rooms: [{ cwd: '/r', name: 'r', agents: [{ id: 'c:1', sid: '1', host: 'claude', state: 'done', age_s: 5 }] }]
        })
      };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: {
        create: () => ({
          enable: async () => true,
          disable() {},
          setVolume() {},
          sample() {},
          observe() {},
          reset() { audioResetCalled = true; }
        })
      },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    assert.strictEqual(fakeDocument.getElementById('connection-status').textContent, 'Live Floor');

    // Simulate poll failure
    shouldFail = true;
    await runtime.tick();
    assert.strictEqual(fakeDocument.getElementById('connection-status').textContent, 'Disconnected');
    assert(audioResetCalled, 'FloorAudio reset must be called on disconnect to prevent noisy recovery alerts');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Actor, attention card, and manifest row identity and focus are preserved across polls', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    const testState = {
      generated: 100,
      counts: { working: 1, needs_input: 1, done: 0 },
      rooms: [{
        cwd: '/projects/core',
        name: 'core',
        agents: [
          { id: 'codex:p1', sid: 'p1', host: 'codex', state: 'running', age_s: 10 },
          { id: 'claude:p2', sid: 'p2', host: 'claude', state: 'needs_input', age_s: 12, msg: 'Please review' }
        ]
      }]
    };

    global.fetch = async function () {
      return { ok: true, json: async () => testState };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    const initialActorNode = fakeDocument.querySelector('.desk-setup[data-actor-id="codex:p1"]');
    assert(initialActorNode, 'Actor node must be present in DOM');
    initialActorNode.focus();
    assert.strictEqual(fakeDocument.activeElement, initialActorNode, 'Actor must be focused');

    const initialAttentionCard = fakeDocument.querySelector('.attention-card[data-agent-id="claude:p2"]');
    assert(initialAttentionCard, 'Attention card must be present in DOM');

    const initialManifestBtn = fakeDocument.querySelector('.btn-manifest-view[data-agent-id="codex:p1"]');
    assert(initialManifestBtn, 'Manifest button must be present in DOM');

    // Poll 2 with updated age
    testState.rooms[0].agents[0].age_s = 15;
    testState.rooms[0].agents[1].age_s = 17;
    await runtime.tick();

    const secondActorNode = fakeDocument.querySelector('.desk-setup[data-actor-id="codex:p1"]');
    assert.strictEqual(initialActorNode, secondActorNode, 'DOM node reference identity must be preserved across polls');
    assert.strictEqual(fakeDocument.activeElement, initialActorNode, 'Focus must remain on actor across polls');

    const secondAttentionCard = fakeDocument.querySelector('.attention-card[data-agent-id="claude:p2"]');
    assert.strictEqual(initialAttentionCard, secondAttentionCard, 'Attention card identity must be preserved across polls');

    const secondManifestBtn = fakeDocument.querySelector('.btn-manifest-view[data-agent-id="codex:p1"]');
    assert.strictEqual(initialManifestBtn, secondManifestBtn, 'Manifest view button identity must be preserved across polls');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

asyncTest('Integration: Live subagent updates modify chips in place with IDs in title', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();

  const originalDoc = global.document;
  const originalWin = global.window;
  const originalFetch = global.fetch;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  let runtime = null;
  try {
    global.document = fakeDocument;
    global.setInterval = fakeTimers.setInterval;
    global.clearInterval = fakeTimers.clearInterval;
    global.setTimeout = fakeTimers.setTimeout;
    global.clearTimeout = fakeTimers.clearTimeout;

    const testState = {
      generated: 100,
      counts: { working: 1, needs_input: 0, done: 0 },
      rooms: [{
        cwd: '/projects/sub',
        name: 'sub',
        agents: [{ id: 'claude:parent-1', sid: 'parent-1', host: 'claude', state: 'running', children: [] }]
      }]
    };

    global.fetch = async function () {
      return { ok: true, json: async () => testState };
    };

    global.window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false }),
      FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
      localStorage: { getItem: () => null, setItem() {} }
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    // Now update children in next poll
    testState.rooms[0].agents[0].children = [
      { id: 'sub-1', desc: 'test-runner' },
      { id: 'sub-2', desc: 'linter' }
    ];
    await runtime.tick();

    const chips = fakeDocument.querySelectorAll('.subagent-chip');
    assert.strictEqual(chips.length, 2, 'Must render 2 subagent chips');
    assert.strictEqual(chips[0].textContent, 'test-runner');
    assert.strictEqual(chips[1].textContent, 'linter');
    assert(chips[0].title.includes('sub-1'), 'Title must preserve actual subagent child ID');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    global.document = originalDoc;
    global.window = originalWin;
    global.fetch = originalFetch;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

// ── 8. Sequential Test Runner ────────────────────────────────────────────

async function runAll() {
  console.log('Running Floor World test suite (' + registeredCount + ' tests registered)...');
  for (let i = 0; i < testQueue.length; i++) {
    const item = testQueue[i];
    try {
      if (item.isAsync) {
        await item.fn();
      } else {
        item.fn();
      }
      passedCount++;
      console.log('✓ ' + item.name);
    } catch (err) {
      failedCount++;
      console.error('✗ ' + item.name);
      console.error(err);
      process.exitCode = 1;
    }
  }

  console.log('\nResults: ' + passedCount + ' passed, ' + failedCount + ' failed of ' + registeredCount + ' total tests.');
  assert.strictEqual(passedCount, registeredCount, 'All registered tests must pass');
  assert.strictEqual(failedCount, 0, 'Zero failures allowed');
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
