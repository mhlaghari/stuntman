/**
 * Comprehensive test suite for Floor Dubai World module (assets/floor-world.js).
 * Live-only board: exercises pure helpers, hostile input safety, host mappings,
 * rock animations, status visibility filtering, and sequential integration tests
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

// ── 4b. Status Groups & Composed Filtering (pure) ────────────────────────

test('statusGroupFor maps running+thinking to Working and unknown to Other', function () {
  assert.strictEqual(FloorWorld.statusGroupFor('running'), 'working');
  assert.strictEqual(FloorWorld.statusGroupFor('thinking'), 'working');
  assert.strictEqual(FloorWorld.statusGroupFor({ state: 'running' }), 'working');
  assert.strictEqual(FloorWorld.statusGroupFor({ state: 'thinking' }), 'working');
  assert.strictEqual(FloorWorld.statusGroupFor('needs_input'), 'needs_input');
  assert.strictEqual(FloorWorld.statusGroupFor('done'), 'done');
  assert.strictEqual(FloorWorld.statusGroupFor('failed'), 'failed');
  assert.strictEqual(FloorWorld.statusGroupFor('idle'), 'idle');
  assert.strictEqual(FloorWorld.statusGroupFor('ghost'), 'ghost');
  assert.strictEqual(FloorWorld.statusGroupFor('ended'), 'ended');
  assert.strictEqual(FloorWorld.statusGroupFor('bogus-state'), 'other');
  assert.strictEqual(FloorWorld.statusGroupFor(undefined), 'other');
  assert.strictEqual(FloorWorld.statusGroupFor(null), 'other');
  assert.strictEqual(FloorWorld.statusGroupFor({}), 'other');
  assert.strictEqual(FloorWorld.statusGroupFor({ state: undefined }), 'other');
});

test('filterRooms with status groups composes project AND statuses without mutating input', function () {
  const rooms = [
    {
      cwd: '/a/proj', name: 'proj',
      agents: [
        { id: 'r1', state: 'running' },
        { id: 'd1', state: 'done' }
      ]
    },
    {
      cwd: '/b/proj', name: 'proj',
      agents: [{ id: 'n1', state: 'needs_input' }]
    }
  ];
  const snapshot = JSON.parse(JSON.stringify(rooms));
  const filtered = FloorWorld.filterRooms(rooms, 'ALL', new Set(['working']));
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].cwd, '/a/proj');
  assert.strictEqual(filtered[0].agents.length, 1);
  assert.strictEqual(filtered[0].agents[0].id, 'r1');
  // No mutation of source
  assert.deepStrictEqual(rooms, snapshot);
  // Project + status composition
  const projFiltered = FloorWorld.filterRooms(rooms, '/b/proj', new Set(['working']));
  assert.strictEqual(projFiltered.length, 0, 'Working filter on /b/proj (needs_input only) must drop the room');
  const projKept = FloorWorld.filterRooms(rooms, '/b/proj', new Set(['needs_input']));
  assert.strictEqual(projKept.length, 1);
});

test('filterRooms Working includes both running and thinking; all-off yields no rooms', function () {
  const rooms = [
    {
      cwd: '/p', name: 'p',
      agents: [
        { id: 'a', state: 'running' },
        { id: 'b', state: 'thinking' },
        { id: 'c', state: 'done' }
      ]
    }
  ];
  const working = FloorWorld.filterRooms(rooms, 'ALL', new Set(['working']));
  assert.strictEqual(working.length, 1);
  assert.strictEqual(working[0].agents.length, 2);
  const ids = working[0].agents.map(function (a) { return a.id; }).sort();
  assert.deepStrictEqual(ids, ['a', 'b']);
  const none = FloorWorld.filterRooms(rooms, 'ALL', new Set());
  assert.strictEqual(none.length, 0, 'All-off must yield zero rooms');
});

test('filterRooms maps unknown states to Other and drops empty rooms', function () {
  const rooms = [
    { cwd: '/p', name: 'p', agents: [{ id: 'u1', state: 'mystery' }, { id: 'd1', state: 'done' }] },
    { cwd: '/q', name: 'q', agents: [{ id: 'd2', state: 'done' }] }
  ];
  const onlyOther = FloorWorld.filterRooms(rooms, 'ALL', new Set(['other']));
  assert.strictEqual(onlyOther.length, 1);
  assert.strictEqual(onlyOther[0].cwd, '/p');
  assert.strictEqual(onlyOther[0].agents.length, 1);
  assert.strictEqual(onlyOther[0].agents[0].id, 'u1');
});

test('live-only module exposes statusGroupFor and no demo factory', function () {
  assert.strictEqual(typeof FloorWorld.statusGroupFor, 'function');
  assert.strictEqual(FloorWorld.createDemoState, undefined, 'Demo factory must be removed');
  assert(Array.isArray(FloorWorld.STATUS_GROUPS));
  assert.deepStrictEqual(
    FloorWorld.STATUS_GROUPS.slice().sort(),
    ['done', 'ended', 'failed', 'ghost', 'idle', 'needs_input', 'other', 'working'].sort()
  );
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

test('floor-world.css has no demo-specific selectors and has status filter row styles', function () {
  const cssPath = path.join(__dirname, '../skills/floor/board/assets/floor-world.css');
  const rawCss = fs.readFileSync(cssPath, 'utf8');
  assert(!rawCss.includes('.btn-demo'), 'Demo button styles must be removed');
  assert(!rawCss.includes('.drawer-demo-bar'), 'Demo drawer bar styles must be removed');
  assert(!rawCss.includes('.btn-demo-action'), 'Demo action styles must be removed');
  assert(!rawCss.includes('.demo-pose-row'), 'Demo pose row styles must be removed');
  assert(!rawCss.includes('.status-badge.demo'), 'Demo badge styles must be removed');
  assert(rawCss.includes('.header-filters'), 'Status filter row styles must exist');
  assert(rawCss.includes('.chip-toggle'), 'Chip toggle styles must exist');
  assert(rawCss.includes('.btn-show-all'), 'Show-all styles must exist');
  assert(rawCss.includes('.filter-count'), 'Filter count styles must exist');
});

test('board index.html is live-only with status filter row and no demo controls', function () {
  const htmlPath = path.join(__dirname, '../skills/floor/board/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(!html.includes('btn-demo-toggle'), 'Demo toggle button must be removed');
  assert(!html.includes('drawer-demo-controls'), 'Drawer demo bar must be removed');
  assert(!html.includes('btn-demo-celebrate'), 'Demo celebrate button must be removed');
  assert(!html.includes('Explore Demo Studio'), 'Demo empty-state links must be removed');
  assert(html.includes('header-filters'), 'Status filter row must exist');
  assert(html.includes('data-status-group="working"'), 'Working chip must exist');
  assert(html.includes('data-status-group="needs_input"'), 'Needs-you chip must exist');
  assert(html.includes('data-status-group="other"'), 'Other chip must exist');
  assert(html.includes('btn-show-all'), 'Show-all reset must exist');
  assert(html.includes('filter-count'), 'Showing N of M counter must exist');
  assert(html.includes('aria-pressed="true"'), 'Chips must be keyboard-accessible toggles pressed initially');
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
      innerText: '',
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
        try {
          el.textContent = String(val || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } catch (_) {}
        try {
          const s = String(val || '');
          if (/<option/i.test(s)) {
            const opts = [];
            const re = /<option\s+value="([^"]*)"[^>]*>([^<]*)<\/option>/g;
            let m;
            while ((m = re.exec(s)) !== null) {
              opts.push({
                value: m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
                text: m[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
              });
            }
            el.options = opts;
          } else if (s === '' && el.tagName === 'SELECT') {
            el.options = [];
          }
        } catch (_) {}
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

  // Wire standard drawer child tree according to index.html (live-only, no demo bar)
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

  // Wire attention sidebar empty text (live-only wording is set by updateView)
  const attentionEmpty = fakeDocument.getElementById('attention-empty');
  const attentionText = fakeDocument.createElement('div');
  attentionText.className = 'attention-empty-text';
  attentionText.innerHTML = '<b>All clear</b><br>Your crew has it from here.';
  attentionEmpty.appendChild(attentionText);
  fakeDocument.body.appendChild(attentionEmpty);
  const attentionList = fakeDocument.getElementById('attention-list');
  fakeDocument.body.appendChild(attentionList);

  // Wire header status filter chips (all visible initially)
  const headerFilters = fakeDocument.getElementById('header-filters');
  const chipWrap = fakeDocument.createElement('div');
  chipWrap.className = 'status-chips';
  const groups = ['working', 'needs_input', 'done', 'failed', 'idle', 'ghost', 'ended', 'other'];
  for (const g of groups) {
    const chip = fakeDocument.createElement('button');
    chip.className = 'chip-toggle active';
    chip.setAttribute('data-status-group', g);
    chip.setAttribute('aria-pressed', 'true');
    chipWrap.appendChild(chip);
  }
  headerFilters.appendChild(chipWrap);
  fakeDocument.body.appendChild(headerFilters);
  const showAll = fakeDocument.getElementById('btn-show-all');
  showAll.tagName = 'BUTTON';
  showAll.disabled = true;
  fakeDocument.body.appendChild(showAll);
  const filterCount = fakeDocument.getElementById('filter-count');
  fakeDocument.body.appendChild(filterCount);
  const manifestBody = fakeDocument.getElementById('manifest-table-body');
  fakeDocument.body.appendChild(manifestBody);

  // Wire project filter select with parsed options (exercises retained-option behavior)
  const projectSelect = fakeDocument.getElementById('project-filter-select');
  projectSelect.tagName = 'SELECT';
  projectSelect.options = [{ value: 'ALL', text: 'All Projects' }];
  projectSelect.value = 'ALL';
  fakeDocument.body.appendChild(projectSelect);

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

function installRuntimeGlobals(fakeDocument, fakeTimers, fetchImpl, windowExtra) {
  global.document = fakeDocument;
  global.setInterval = fakeTimers.setInterval;
  global.clearInterval = fakeTimers.clearInterval;
  global.setTimeout = fakeTimers.setTimeout;
  global.clearTimeout = fakeTimers.clearTimeout;
  if (fetchImpl) global.fetch = fetchImpl;
  global.window = Object.assign({
    location: { search: '' },
    matchMedia: () => ({ matches: false }),
    FloorAudio: { create: () => ({ enable: async () => true, disable() {}, setVolume() {}, sample() {}, observe() {}, reset() {} }) },
    localStorage: { getItem: () => null, setItem() {} }
  }, windowExtra || {});
}

function restoreGlobals(saved) {
  global.document = saved.doc;
  global.window = saved.win;
  global.fetch = saved.fetch;
  global.setInterval = saved.setInterval;
  global.clearInterval = saved.clearInterval;
  global.setTimeout = saved.setTimeout;
  global.clearTimeout = saved.clearTimeout;
}

function saveGlobals() {
  return {
    doc: global.document, win: global.window, fetch: global.fetch,
    setInterval: global.setInterval, clearInterval: global.clearInterval,
    setTimeout: global.setTimeout, clearTimeout: global.clearTimeout
  };
}

function liveStateFixture() {
  return {
    generated: 100,
    counts: { working: 2, needs_input: 1, done: 1 },
    rooms: [
      {
        cwd: '/projects/stuntman', name: 'stuntman',
        agents: [
          { id: 'codex:run-1', sid: 'run-1', host: 'codex', worker: false, state: 'running', tool: 'pytest', age_s: 14, reach: 'none', children: [] },
          { id: 'muse:think-2', sid: 'think-2', host: 'muse', worker: false, state: 'thinking', age_s: 42, reach: 'none', children: [] },
          { id: 'claude:done-3', sid: 'done-3', host: 'claude', worker: false, state: 'done', age_s: 14, reach: 'tmux', children: [] }
        ]
      },
      {
        cwd: '/projects/launchpad', name: 'launchpad',
        agents: [
          { id: 'agy:need-4', sid: 'need-4', host: 'agy', worker: false, state: 'needs_input', msg: 'Need review', age_s: 18, reach: 'none', children: [] },
          { id: 'opencode:fail-5', sid: 'fail-5', host: 'opencode', worker: true, state: 'failed', msg: 'Build failed', age_s: 58, reach: 'none', children: [] },
          { id: 'claude:idle-6', sid: 'idle-6', host: 'claude', worker: false, state: 'idle', age_s: 60, reach: 'tmux', children: [] }
        ]
      }
    ]
  };
}

// ── 7. Sequential Integration Tests ──────────────────────────────────────

asyncTest('Integration: ?demo=1 still polls live state and creates no synthetic agents', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  let fetchCount = 0;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      fetchCount++;
      return { ok: true, json: async () => liveStateFixture() };
    }, { location: { search: '?demo=1' } });
    runtime = FloorWorld.init({ query: '?demo=1' });
    assert.strictEqual(typeof runtime.setDemoMode, 'undefined', 'Demo toggle API must be removed');
    assert.strictEqual(typeof runtime.getIsDemo, 'undefined', 'Demo state getter must be removed');
    await runtime.tick();
    assert(fetchCount >= 1, '?demo=1 must still poll live state.json');
    const liveActor = fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]');
    assert(liveActor, 'Live agent must render even with ?demo=1');
    const badge = fakeDocument.getElementById('connection-status');
    assert.strictEqual(badge.textContent, 'Live Floor');
    assert(!fakeDocument.body.textContent.includes('Demo'), 'No demo chrome should render');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: live polling installs timers and renders live actors', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => liveStateFixture() };
    });
    runtime = FloorWorld.init({ query: '' });
    assert(fakeTimers.intervals.size >= 2, 'Must install clock, movement, and polling timers');
    await runtime.tick();
    await runtime.tick();
    const liveActor = fakeDocument.querySelector('.desk-setup[data-actor-id="agy:need-4"]');
    assert(liveActor, 'DOM must render live actor from polled state');
    const count = fakeDocument.getElementById('filter-count');
    assert(count.textContent.includes('Showing 6 of 6'), 'Counter must show full snapshot, got: ' + count.textContent);
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Working filter includes running and thinking; hiding Done removes bays and manifest rows', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => liveStateFixture() };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]'), 'running visible initially');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="muse:think-2"]'), 'thinking visible initially');
    // Hide Done only: running+thinking stay
    runtime.setSelectedGroups(['working', 'needs_input', 'failed', 'idle', 'ghost', 'ended', 'other']);
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]'), 'running stays when Done hidden');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="muse:think-2"]'), 'thinking stays when Done hidden');
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="claude:done-3"]'), 'done hidden after filter');
    assert.strictEqual(fakeDocument.getElementById('manifest-done-count').textContent, 0, 'Manifest done count must reflect visibility');
    assert.strictEqual(fakeDocument.getElementById('manifest-working-count').textContent, 2, 'Working count covers running+thinking');
    // Hide Working too: both running and thinking disappear together
    runtime.setSelectedGroups(['needs_input', 'failed', 'idle', 'ghost', 'ended', 'other']);
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]'), 'running hidden when Working off');
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="muse:think-2"]'), 'thinking hidden when Working off');
    assert.strictEqual(fakeDocument.getElementById('manifest-working-count').textContent, 0);
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: multi-toggle composition, all-off empty copy, and Show all restores project + statuses', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => liveStateFixture() };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    // Narrow to one project then hide everything
    runtime.setSelectedProject('/projects/stuntman');
    runtime.setSelectedGroups([]);
    const ws = fakeDocument.getElementById('workstations-container');
    assert(ws.textContent.includes('No agents match these filters'), 'All-off must show filter empty copy, got: ' + ws.textContent);
    assert(ws.textContent.includes('Show all'), 'All-off copy must point at Show all');
    assert(!ws.textContent.includes('Demo'), 'No demo offers in empty copy');
    const showAll = fakeDocument.getElementById('btn-show-all');
    assert.strictEqual(showAll.disabled, false, 'Reset must be enabled while filters active');
    // Show all restores project ALL and every status
    runtime.showAllFilters();
    assert.strictEqual(runtime.getSelectedProject(), 'ALL');
    assert.strictEqual(runtime.getSelectedGroups().size, 8);
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]'), 'Show all restores running agent');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="agy:need-4"]'), 'Show all restores other-project agent');
    assert.strictEqual(fakeDocument.getElementById('btn-show-all').disabled, true, 'Reset disabled when no filters active');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: project selection persists across empty snapshots with retained option; reset restores ALL', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  const roomA = {
    cwd: '/projects/alpha', name: 'alpha',
    agents: [{ id: 'claude:a1', sid: 'a1', host: 'claude', state: 'running', age_s: 5, reach: 'none', children: [] }]
  };
  const roomB = {
    cwd: '/projects/beta', name: 'beta',
    agents: [{ id: 'claude:b1', sid: 'b1', host: 'claude', state: 'running', age_s: 5, reach: 'none', children: [] }]
  };
  const mutable = { generated: 1, counts: { working: 2, needs_input: 0, done: 0 }, rooms: [roomA, roomB] };
  function optionByValue(select, value) {
    const opts = select.options || [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].value === value) return opts[i];
    }
    return null;
  }
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => mutable };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    const select = fakeDocument.getElementById('project-filter-select');
    assert(optionByValue(select, '/projects/alpha'), 'Options must be built from the full snapshot');
    assert(optionByValue(select, '/projects/beta'), 'Options must include every live project');
    // Select project A through the dropdown (exercises label capture), hide Done via API
    select.value = '/projects/alpha';
    select.dispatchEvent({ type: 'change', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(runtime.getSelectedProject(), '/projects/alpha');
    runtime.setStatusGroupVisible('done', false);
    assert(!runtime.getSelectedGroups().has('done'), 'Status selection recorded');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="claude:a1"]'), 'A visible under its project filter');
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="claude:b1"]'), 'B hidden by project filter');
    // Empty snapshot: selections persist, A retained with suffix, nothing leaks through
    mutable.rooms = [];
    await runtime.tick();
    assert.strictEqual(runtime.getSelectedProject(), '/projects/alpha', 'Project must persist across empty snapshots');
    assert(!runtime.getSelectedGroups().has('done'), 'Status selection must persist across empty snapshots');
    assert.strictEqual(select.value, '/projects/alpha', 'Retained option remains selected while absent');
    const retainedEmpty = optionByValue(select, '/projects/alpha');
    assert(retainedEmpty, 'Absent project keeps a retained dropdown option');
    assert(retainedEmpty.text.includes('(no agents)'), 'Retained option marked, got: ' + retainedEmpty.text);
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="claude:b1"]'), 'B never appears while A selected');
    // Only B live: A still selected/retained, B still filtered out
    mutable.rooms = [roomB];
    await runtime.tick();
    assert.strictEqual(runtime.getSelectedProject(), '/projects/alpha', 'Project must persist while absent');
    assert.strictEqual(select.value, '/projects/alpha', 'Dropdown stays on retained A while only B is live');
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="claude:b1"]'), 'B must not leak through an unrelated project filter');
    assert(optionByValue(select, '/projects/beta'), 'Options still built from the full snapshot');
    const retainedB = optionByValue(select, '/projects/alpha');
    assert(retainedB && retainedB.text.includes('(no agents)'), 'Retained suffix persists until A returns');
    // A returns: suffix removed, A renders, B still project-filtered, no repeat option rebuilds
    mutable.rooms = [roomA, roomB];
    await runtime.tick();
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="claude:a1"]'), 'A renders on return');
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="claude:b1"]'), 'B still hidden by the surviving project filter');
    const restored = optionByValue(select, '/projects/alpha');
    assert(restored && !restored.text.includes('(no agents)'), 'Suffix removed when project returns, got: ' + (restored && restored.text));
    const stableHtml = select.innerHTML;
    await runtime.tick();
    assert.strictEqual(select.innerHTML, stableHtml, 'Identical snapshots must not rebuild options every poll');
    // Reset restores everything
    runtime.showAllFilters();
    assert.strictEqual(runtime.getSelectedProject(), 'ALL');
    assert.strictEqual(runtime.getSelectedGroups().size, 8);
    assert.strictEqual(select.value, 'ALL');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="claude:a1"]'), 'Reset restores A');
    assert(fakeDocument.querySelector('.desk-setup[data-actor-id="claude:b1"]'), 'Reset restores B');
    assert.strictEqual(fakeDocument.getElementById('btn-show-all').disabled, true, 'Reset disabled when no filters active');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: sidebar counts reflect visibility and hidden alerts change empty wording', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => liveStateFixture() };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    assert(fakeDocument.querySelector('.attention-card[data-agent-id="agy:need-4"]'), 'needs_input card visible initially');
    assert.strictEqual(fakeDocument.getElementById('manifest-needs-count').textContent, 1);
    // Hide Needs you + Failed: attention empties but live alerts still exist
    runtime.setSelectedGroups(['working', 'done', 'idle', 'ghost', 'ended', 'other']);
    assert(!fakeDocument.querySelector('.attention-card[data-agent-id="agy:need-4"]'), 'attention card hidden by filter');
    const emptyText = fakeDocument.getElementById('attention-empty').querySelector('.attention-empty-text');
    assert(emptyText.innerHTML.includes('No matching alerts'), 'Sidebar must not say All clear while alerts hidden, got: ' + emptyText.innerHTML);
    assert(emptyText.innerHTML.includes('Change filters'), 'Sidebar must guide toward filters');
    assert.strictEqual(fakeDocument.getElementById('manifest-needs-count').textContent, 0, 'Manifest needs count must reflect visibility');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: unfiltered audio observation is unaffected by status filtering', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  const observed = [];
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => liveStateFixture() };
    }, {
      FloorAudio: {
        create: () => ({
          enable: async () => true, disable() {}, setVolume() {}, sample() {}, reset() {},
          observe(items) { observed.push(items.map(function (i) { return i.id + ':' + i.state; }).sort().join('|')); }
        })
      }
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    const baseline = observed.length;
    assert(baseline >= 1, 'Successful live poll must observe audio once');
    const firstSnapshot = observed[observed.length - 1];
    // Toggling filters must not observe again and must not change the snapshot
    runtime.setSelectedGroups(['done']);
    runtime.setSelectedGroups(['working']);
    assert.strictEqual(observed.length, baseline, 'Filter toggles must not trigger audio observation');
    await runtime.tick();
    assert.strictEqual(observed.length, baseline + 1, 'Next live poll observes once more');
    assert.strictEqual(observed[observed.length - 1], firstSnapshot, 'Audio always sees the full unfiltered snapshot');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: live status transition under active filter reveals agent without losing selection', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  const mutable = liveStateFixture();
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      return { ok: true, json: async () => mutable };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    runtime.setSelectedGroups(['done', 'needs_input', 'failed', 'idle', 'ghost', 'ended', 'other']);
    assert(!fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]'), 'running hidden while Working off');
    // Live transition running -> done: agent appears under the active Done-inclusive filter
    mutable.rooms[0].agents[0].state = 'done';
    await runtime.tick();
    const revealed = fakeDocument.querySelector('.desk-setup[data-actor-id="codex:run-1"]');
    assert(revealed, 'Transitioned agent must appear under active filter');
    assert.strictEqual(fakeDocument.getElementById('manifest-done-count').textContent, 2);
    assert(runtime.getSelectedGroups().has('done'), 'Filter selection preserved across polls');
    assert(!runtime.getSelectedGroups().has('working'), 'Hidden group stays hidden across transition');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: filtering out an open drawer keeps drafts and live transcript guards', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function (url) {
      if (url.startsWith('transcript')) {
        return { ok: true, json: async () => ({ messages: [{ role: 'user', text: 'hello' }], reach: 'none' }) };
      }
      return { ok: true, json: async () => liveStateFixture() };
    });
    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();
    const agent = { id: 'codex:run-1', sid: 'run-1', host: 'codex', state: 'running', reach: 'none', worker: false };
    runtime.openDrawer(agent, 'stuntman');
    await new Promise(r => setImmediate(r));
    fakeDocument.getElementById('dinput').value = 'draft-kept';
    runtime.setSelectedGroups(['done']);
    assert.strictEqual(runtime.getCurrentDrawerSid(), 'codex:run-1', 'Filtering out must not close the drawer');
    assert.strictEqual(fakeDocument.getElementById('dinput').value, 'draft-kept', 'Drawer draft preserved across filtering');
    await runtime.tick();
    assert.strictEqual(runtime.getCurrentDrawerSid(), 'codex:run-1', 'Polls preserve the filtered-out drawer');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Transcript GET and Send POST pass composite agent.id', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Send trust - disabled while loading, enabled on confirmed reach, disabled on snapshot change', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Drafts are preserved when switching drawers during pending send', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Transcript race - stale live request cannot overwrite newer drawer', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
    let delayedTranscriptResolve = null;
    global.fetch = async function (url) {
      if (url.startsWith('transcript')) {
        if (url.includes('live-1')) {
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
            messages: [{ role: 'user', text: 'FRESH SECOND MESSAGE' }],
            reach: 'tmux'
          })
        };
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
              { id: 'claude:live-1', sid: 'live-1', host: 'claude', state: 'done', reach: 'tmux', worker: false },
              { id: 'claude:live-2', sid: 'live-2', host: 'claude', state: 'done', reach: 'tmux', worker: false }
            ]
          }]
        })
      };
    };

    runtime = FloorWorld.init({ query: '' });
    await runtime.tick();

    // 1. Open first live drawer (starts transcript fetch that delays)
    const liveAgent = { id: 'claude:live-1', sid: 'live-1', host: 'claude', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(liveAgent, 'p');

    // 2. Open second live drawer before the first transcript resolves
    const secondAgent = { id: 'claude:live-2', sid: 'live-2', host: 'claude', state: 'done', reach: 'tmux', worker: false };
    runtime.openDrawer(secondAgent, 'p');
    for (let w = 0; w < 10; w++) {
      await new Promise(r => setImmediate(r));
      const html = fakeDocument.getElementById('dlog').innerHTML || '';
      if (html.includes('FRESH SECOND MESSAGE')) break;
    }

    const dlog = fakeDocument.getElementById('dlog');
    assert(dlog.textContent.includes('FRESH SECOND MESSAGE'), 'Second drawer must render its own transcript');

    // 3. Stale delayed first transcript resolves
    if (delayedTranscriptResolve) delayedTranscriptResolve();
    await new Promise(r => setImmediate(r));

    // Must NOT contain STALE LIVE MESSAGE
    assert(!dlog.textContent.includes('STALE LIVE MESSAGE'), 'Stale transcript must not overwrite newer drawer');
  } finally {
    if (runtime && runtime.destroy) runtime.destroy();
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Live readonly dialog focus trap wraps between Play cue and Close', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function (url) {
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
    });

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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Audio cue target is captured before enableAudio; closing drawer does not throw', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async () => ({
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
    }));

    let sampledVoice = null;
    let audioEnableResolve = null;

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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Offline poll failure resets audio baseline & recovery poll is silent', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  let audioResetCalled = false;
  let shouldFail = false;

  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, async function () {
      if (shouldFail) throw new Error('Network error');
      return {
        ok: true,
        json: async () => ({
          generated: 200,
          counts: { working: 0, needs_input: 0, done: 1 },
          rooms: [{ cwd: '/r', name: 'r', agents: [{ id: 'c:1', sid: '1', host: 'claude', state: 'done', age_s: 5 }] }]
        })
      };
    }, {
      FloorAudio: {
        create: () => ({
          enable: async () => true,
          disable() {},
          setVolume() {},
          sample() {},
          observe() {},
          reset() { audioResetCalled = true; }
        })
      }
    });

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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Actor, attention card, and manifest row identity and focus are preserved across polls', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
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
    restoreGlobals(saved);
  }
});

asyncTest('Integration: Live subagent updates modify chips in place with IDs in title', async function () {
  const { fakeDocument } = createFakeDOM();
  const fakeTimers = createFakeTimers();
  const saved = saveGlobals();
  let runtime = null;
  try {
    installRuntimeGlobals(fakeDocument, fakeTimers, null);
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
    restoreGlobals(saved);
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
