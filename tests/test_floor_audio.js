#!/usr/bin/env node
'use strict';
const assert = require('node:assert');
const path = require('node:path');

let instances = [];

class FakeAudioContext {
  constructor() {
    instances.push(this);
    this.currentTime = 0;
    this.state = 'running';
    this.destination = { _isDestination: true };
    this.createdOsc = [];
    this.createdGain = [];
    this.masterGain = null;
  }
  createOscillator() {
    const ctx = this;
    const osc = {
      type: '',
      frequency: { value: 0, setValueAtTime(v) { this.value = v; } },
      _startTime: null, _stopTime: null, _disconnected: false, _started: false,
      createdAt: Date.now(),
      onended: null,
      connect(target) { this._connectedTo = target; },
      start(t) { this._started = true; this._startTime = t !== undefined ? t : ctx.currentTime; this.createdAt = Date.now(); },
      stop(t) { this._stopTime = t !== undefined ? t : ctx.currentTime; if (this.onended) setTimeout(() => { try { this.onended(); } catch (_) {} }, 5); },
      disconnect() { this._disconnected = true; },
    };
    this.createdOsc.push(osc);
    return osc;
  }
  createGain() {
    const g = {
      gain: {
        value: 0,
        setValueAtTime(v) { this.value = v; },
        linearRampToValueAtTime(v) { this.value = v; },
      },
      _connectedTo: null,
      connect(target) { this._connectedTo = target; if (target && target._isDestination) this._connectedToDestination = true; },
      disconnect() { this._disconnected = true; },
    };
    this.createdGain.push(g);
    // first gain is master if not set
    if (!this.masterGain) this.masterGain = g;
    return g;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

function installFake() {
  instances = [];
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = FakeAudioContext;
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  globalThis.window.AudioContext = FakeAudioContext;
  globalThis.window.webkitAudioContext = FakeAudioContext;
}
function uninstallFake() {
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  if (globalThis.window) { delete globalThis.window.AudioContext; delete globalThis.window.webkitAudioContext; }
}
function freshModule() {
  const p = path.resolve(__dirname, '../skills/floor/board/assets/floor-audio.js');
  delete require.cache[require.resolve(p)];
  return require(p);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  let pass = 0, fail = 0;
  const tests = [];
  const delayRefs = [];
  function keepDelay(ms) { const pr = delay(ms); delayRefs.push(pr); return pr; }
  function test(name, fn) { tests.push({ name, fn }); }

  test('no AudioContext before enable', async () => {
    installFake(); instances = [];
    const mod = freshModule(); const api = mod.create();
    assert.equal(instances.length, 0);
    const ok = await api.enable();
    assert.equal(ok, true); assert.equal(instances.length, 1);
    api.disable(); api.reset(); await keepDelay(40);
  });

  test('first observe silent', async () => {
    installFake(); instances = [];
    const mod = freshModule(); const a = mod.create(); await a.enable();
    const before = instances[0].createdOsc.length;
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }, { id: '2', state: 'needs_input', voice: 'codex' }]);
    await keepDelay(50);
    assert.equal(instances[0].createdOsc.length, before);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('repeat silent', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(20);
    const before = instances[0].createdOsc.length;
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(80);
    assert.equal(instances[0].createdOsc.length, before);
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(50);
    assert.equal(instances[0].createdOsc.length, before);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('state transitions sound only once', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '1', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    const base = instances[0].createdOsc.length;
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(700);
    const afterDone = instances[0].createdOsc.length; assert.ok(afterDone > base);
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(80);
    assert.equal(instances[0].createdOsc.length, afterDone);
    a.observe([{ id: '1', state: 'running', voice: 'laghari' }]); await keepDelay(80);
    assert.equal(instances[0].createdOsc.length, afterDone);
    a.observe([{ id: '1', state: 'needs_input', voice: 'laghari' }]); await keepDelay(700);
    assert.ok(instances[0].createdOsc.length > afterDone);
    const beforeFailed = instances[0].createdOsc.length;
    a.observe([{ id: '1', state: 'failed', voice: 'laghari' }]); await keepDelay(700);
    assert.ok(instances[0].createdOsc.length > beforeFailed);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('five voices distinct', async () => {
    const voices = ['laghari', 'claude', 'codex', 'gemini', 'deepseek'];
    const freqSets = [];
    for (const v of voices) {
      instances = []; installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
      a.sample(v, 'done'); await keepDelay(80);
      const freqs = instances[0].createdOsc.map(o => o.frequency.value);
      freqSets.push(freqs.join(',')); a.disable(); a.reset(); await keepDelay(20);
    }
    assert.equal(new Set(freqSets).size, 5, `distinct voices ${freqSets}`);
  });

  test('patterns distinct', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    async function pat(s) {
      const b = instances[0].createdOsc.length;
      a.sample('laghari', s);
      await keepDelay(750);
      return instances[0].createdOsc.slice(b).map(o=>o.frequency.value).join(',');
    }
    const d = await pat('done'), n = await pat('needs_input'), f = await pat('failed');
    assert.notEqual(d, n); assert.notEqual(d, f); assert.notEqual(n, f);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('master gain restored after reset then sample', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    const master = a._debug.masterGain;
    assert.ok(master); const g0 = master.gain.value;
    assert.ok(Math.abs(g0 - 0.045) < 0.02, `default gain ~0.045 (0.15*0.3) got ${g0}`);
    a.observe([{ id: '1', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(200);
    a.reset();
    assert.equal(a._debug.enabled, true, 'reset retains enabled');
    const gAfterReset = a._debug.masterGain.gain.value;
    assert.ok(Math.abs(gAfterReset - g0) < 0.01, `master after reset should be restored, got ${gAfterReset}`);
    const before = instances[0].createdOsc.length;
    a.sample('laghari', 'done');
    await keepDelay(100);
    assert.ok(instances[0].createdOsc.length > before, 'sample after reset should sound');
    assert.ok(Math.abs(a._debug.masterGain.gain.value - g0) < 0.01);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('disable -> enable restores gain and sample works', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    const g0 = a._debug.masterGain.gain.value;
    a.disable(); await keepDelay(20);
    // after disable, master may still be g0 (not zeroed)
    const ok = await a.enable();
    assert.equal(ok, true);
    const g1 = a._debug.masterGain.gain.value;
    assert.ok(Math.abs(g1 - g0) < 0.01, `gain after re-enable should be restored ${g0} vs ${g1}`);
    const before = instances[0].createdOsc.length;
    a.sample('laghari', 'done'); await keepDelay(100);
    assert.ok(instances[0].createdOsc.length > before, 'sample after re-enable should sound');
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('serial queue no overlap observe burst', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '0', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    // trigger 4 rapid distinct ids -> only 3 queued, serial
    const start = Date.now();
    a.observe([
      { id: '1', state: 'done', voice: 'laghari' },
      { id: '2', state: 'done', voice: 'codex' },
      { id: '3', state: 'done', voice: 'gemini' },
      { id: '4', state: 'done', voice: 'deepseek' },
    ]);
    // wait for all 3 motifs to complete serially (~0.6*3≈1.8s)
    await keepDelay(2200);
    const oscs = instances[0].createdOsc;
    // 3 motifs *4 notes =12 oscillators
    assert.equal(oscs.length, 12, `expected 12 oscillators for 3 motifs, got ${oscs.length}`);
    // Verify start times spaced by motif duration (no overlap)
    // Group by creation batches of 4
    const batches = [];
    for (let i = 0; i < oscs.length; i += 4) batches.push(oscs.slice(i, i + 4));
    for (let i = 1; i < batches.length; i++) {
      const prevEnd = batches[i - 1][0].createdAt;
      const curStart = batches[i][0].createdAt;
      const gap = curStart - prevEnd;
      assert.ok(gap >= 450, `motifs should not overlap, gap ${gap}ms <450`);
      assert.ok(gap <= 900, `gap too large ${gap}`);
    }
    // total bounded
    assert.equal(batches.length, 3);
    // no timer leak
    assert.equal(a._debug.pendingTimer, null);
    assert.equal(a._debug.isPlaying, false);
    assert.equal(a._debug.queueLen, 0);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('serial queue no overlap rapid sample clicks', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    // rapid sample clicks 5 times
    for (let i = 0; i < 5; i++) a.sample('laghari', 'done');
    await keepDelay(2200);
    const oscs = instances[0].createdOsc;
    // bounded to 3
    assert.equal(oscs.length, 12, `rapid samples bounded to 3, got ${oscs.length}`);
    const batches = [];
    for (let i = 0; i < oscs.length; i += 4) batches.push(oscs.slice(i, i + 4));
    for (let i = 1; i < batches.length; i++) {
      const gap = batches[i][0].createdAt - batches[i - 1][0].createdAt;
      assert.ok(gap >= 450, `sample motifs overlap gap ${gap}`);
    }
    assert.equal(a._debug.pendingTimer, null);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('disable stops queue and no new oscillators after', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '1', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    a.observe([
      { id: '1', state: 'done', voice: 'laghari' },
      { id: '2', state: 'failed', voice: 'codex' },
      { id: '3', state: 'needs_input', voice: 'gemini' },
    ]);
    await keepDelay(15);
    const before = instances[0].createdOsc.length;
    // capture active nodes before disable
    const activeBefore = a._debug.activeCount;
    a.disable();
    // immediately after disable, active nodes should be stopped/disconnected
    assert.equal(a._debug.activeCount, 0, 'disable should clear active nodes');
    // check that previously created oscillators are stopped/disconnected
    const oscs = instances[0].createdOsc.slice(0, before);
    for (const o of oscs) {
      // if any had started, they should now be disconnected/stopped
      if (o._started) assert.ok(o._disconnected || o._stopTime !== null, 'active nodes should be stopped/disconnected');
    }
    await keepDelay(800);
    assert.equal(instances[0].createdOsc.length, before, 'no new oscillators after disable');
    assert.equal(a._debug.pendingTimer, null);
    a.reset(); await keepDelay(20);
  });

  test('no timer leak after completion', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '0', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(900);
    assert.equal(a._debug.pendingTimer, null);
    assert.equal(a._debug.isPlaying, false);
    assert.equal(a._debug.queueLen, 0);
    // after completion, active nodes should be cleaned
    await keepDelay(400);
    assert.equal(a._debug.activeCount, 0);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('generation guard disable during resume', async () => {
    class SlowCtx extends FakeAudioContext {
      constructor() { super(); this.state = 'suspended'; }
      resume() { return new Promise(res => setTimeout(() => { this.state = 'running'; res(); }, 120)); }
    }
    instances = []; globalThis.AudioContext = SlowCtx; globalThis.webkitAudioContext = SlowCtx;
    if (globalThis.window) globalThis.window.AudioContext = SlowCtx;
    const mod = freshModule(); const a = mod.create();
    const p = a.enable(); // pending
    await keepDelay(20);
    a.disable(); // should invalidate pending
    const ok = await p;
    assert.equal(ok, false, 'pending enable after disable should resolve false');
    assert.equal(a._debug.enabled, false, 'should stay muted');
    // sample should not sound
    const before = instances.length ? instances[0].createdOsc.length : 0;
    a.sample('laghari', 'done'); await keepDelay(80);
    const after = instances.length ? instances[0].createdOsc.length : 0;
    assert.equal(after, before, 'should stay muted after stale resume');
    a.reset(); await keepDelay(20);
    installFake();
  });

  test('concurrent enables single context', async () => {
    installFake(); instances = []; const mod = freshModule(); const a = mod.create();
    const p1 = a.enable(), p2 = a.enable(), p3 = a.enable();
    const results = await Promise.all([p1, p2, p3]);
    assert.ok(results.every(r => r === true));
    assert.equal(instances.length, 1, 'concurrent enables should create one context');
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('failed resume leaves disabled and master correct', async () => {
    class RejectCtx extends FakeAudioContext {
      constructor() { super(); this.state = 'suspended'; this.masterGain = null; }
      resume() { return Promise.reject(new Error('fail')); }
    }
    instances = []; globalThis.AudioContext = RejectCtx; globalThis.webkitAudioContext = RejectCtx;
    if (globalThis.window) globalThis.window.AudioContext = RejectCtx;
    const mod = freshModule(); const a = mod.create();
    const ok = await a.enable();
    assert.equal(ok, false); assert.equal(a._debug.enabled, false);
    // master should be null or not affect, but enable should not have created active gain
    // try again with good context after failure should succeed
    installFake(); instances = [];
    // need fresh module or same api? Ensure next enable uses new context? Our ctx already created but failed, next enable should retry?
    // For this test, create new api
    const mod2 = freshModule(); const b = mod2.create();
    const ok2 = await b.enable(); assert.equal(ok2, true);
    assert.ok(b._debug.masterGain);
    b.disable(); b.reset(); await keepDelay(20);
  });

  test('arpeggio oscillator start/stop strictly ascending within single motif', async () => {
    installFake();
    const mod = freshModule(); const a = mod.create(); await a.enable();
    const ctx = a._debug.ctx;
    // clear previous
    const before = ctx.createdOsc.length;
    a.sample('laghari', 'done');
    await keepDelay(150);
    const oscs = ctx.createdOsc.slice(before);
    assert.equal(oscs.length, 4, `single motif should create 4 notes, got ${oscs.length}`);
    for (let i = 1; i < oscs.length; i++) {
      assert.ok(oscs[i]._startTime > oscs[i-1]._startTime, `start ${i} ${oscs[i]._startTime} should be > prev ${oscs[i-1]._startTime}`);
      assert.ok(oscs[i]._startTime >= oscs[i-1]._stopTime - 1e-9, `start ${oscs[i]._startTime} should be >= prev stop ${oscs[i-1]._stopTime}`);
    }
    // verify gap: each next start = prev start + prev dur + 0.02
    // done motif durations are 0.11,0.11,0.11,0.18 with gap 0.02
    const expectedGaps = [0.13, 0.13, 0.13];
    for (let i = 1; i < oscs.length; i++) {
      const gap = oscs[i]._startTime - oscs[i-1]._startTime;
      assert.ok(Math.abs(gap - expectedGaps[i-1]) < 0.001, `gap ${i} ${gap} expected ${expectedGaps[i-1]}`);
    }
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('unavailable then install fake enables', async () => {
    uninstallFake();
    const mod = freshModule(); const a = mod.create();
    const ok1 = await a.enable();
    assert.equal(ok1, false, 'unavailable should return false');
    assert.equal(a._debug.ctx, null);
    // now install fake and retry with same instance should succeed and call ctor synchronously
    installFake(); instances = [];
    let ctorCalled = false;
    const Orig = globalThis.AudioContext;
    class TrackingCtx extends Orig {
      constructor() { super(); ctorCalled = true; }
    }
    globalThis.AudioContext = TrackingCtx; globalThis.webkitAudioContext = TrackingCtx;
    if (globalThis.window) globalThis.window.AudioContext = TrackingCtx;
    const ok2 = await a.enable();
    assert.equal(ctorCalled, true, 'enable should call AudioContext ctor synchronously after available');
    assert.equal(ok2, true);
    assert.ok(a._debug.ctx);
    assert.ok(Math.abs(a._debug.masterGain.gain.value - 0.045) < 0.02);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('already running externally suspended resume', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    assert.equal(a._debug.enabled, true);
    // externally suspend
    a._debug.ctx.state = 'suspended';
    let resumeCalled = false;
    const origResume = a._debug.ctx.resume;
    a._debug.ctx.resume = () => { resumeCalled = true; a._debug.ctx.state = 'running'; return Promise.resolve(); };
    const ok = await a.enable();
    assert.equal(resumeCalled, true, 'enable should call resume when externally suspended');
    assert.equal(ok, true);
    assert.ok(Math.abs(a._debug.masterGain.gain.value - 0.045) < 0.02, 'master restored after resume');
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('disable during deferred resume plus new enable generation guard', async () => {
    class SlowCtx extends FakeAudioContext {
      constructor() { super(); this.state = 'suspended'; }
      resume() { return new Promise(res => setTimeout(() => { this.state = 'running'; res(); }, 150)); }
    }
    instances = []; globalThis.AudioContext = SlowCtx; globalThis.webkitAudioContext = SlowCtx;
    if (globalThis.window) globalThis.window.AudioContext = SlowCtx;
    const mod = freshModule(); const a = mod.create();
    const p1 = a.enable(); // pending slow resume
    await keepDelay(30);
    a.disable(); // increments gen, stays disabled, clears pending
    const p2 = a.enable(); // new enable with same SlowCtx, should also be slow but not cleared by p1
    const ok2 = await p2;
    assert.equal(ok2, true, 'new enable after disable should succeed');
    assert.equal(a._debug.enabled, true);
    const ok1 = await p1;
    assert.equal(ok1, false, 'stale p1 should resolve false and not clear p2');
    assert.equal(a._debug.enabled, true, 'stale should not re-disable');
    assert.ok(Math.abs(a._debug.masterGain.gain.value - 0.045) < 0.02);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('volume smooth mapping single multiplier', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    const master = a._debug.masterGain;
    assert.ok(Math.abs(master.gain.value - 0.045) < 0.02, `default 0.045 got ${master.gain.value}`);
    a.setVolume(0); await keepDelay(10); assert.equal(master.gain.value, 0);
    a.setVolume(0.25); await keepDelay(10); const g025 = master.gain.value;
    a.setVolume(0.5); await keepDelay(10); const g05 = master.gain.value;
    a.setVolume(1); await keepDelay(10); const g1 = master.gain.value;
    assert.ok(g025 < g05 && g05 < g1, `smooth mapping 0.25:${g025} 0.5:${g05} 1:${g1}`);
    assert.ok(Math.abs(g025 - 0.075) < 0.02, `0.25 should map ~0.075 got ${g025}`);
    assert.ok(Math.abs(g05 - 0.15) < 0.02, `0.5 should map ~0.15 got ${g05}`);
    assert.ok(Math.abs(g1 - 0.3) < 0.02, `1 should map ~0.3 got ${g1}`);
    a.setVolume(0.2); await keepDelay(10);
    assert.ok(Math.abs(master.gain.value - 0.06) < 0.01);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('no fallback to destination bypassing master', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.sample('laghari', 'done'); await keepDelay(80);
    const gains = instances[0].createdGain.slice(1); // skip master
    for (const g of gains) {
      assert.ok(g._connectedTo && !g._connectedTo._isDestination, 'voice gain should connect to master, not destination');
      assert.equal(g._connectedTo, a._debug.masterGain, 'should connect to masterGain');
    }
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('cleanup via onended', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.sample('laghari', 'done'); await keepDelay(900);
    const oscs = instances[0].createdOsc;
    assert.ok(oscs.length > 0);
    for (const o of oscs) assert.equal(o._disconnected, true, 'onended should disconnect');
    assert.equal(a._debug.activeCount, 0);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('reset retains enabled and clears baseline, stale queue invalidated', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '1', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(30);
    // queue has maybe 1 playing, then reset should invalidate queued next
    a.observe([{ id: '2', state: 'done', voice: 'codex' }]);
    a.reset();
    assert.equal(a._debug.enabled, true, 'reset retains enabled');
    assert.equal(a._debug.queueLen, 0);
    assert.equal(a._debug.isPlaying, false);
    assert.equal(a._debug.pendingTimer, null);
    // after reset, same id with same state should be silent (baseline cleared)
    const before = instances[0].createdOsc.length;
    a.observe([{ id: '1', state: 'done', voice: 'laghari' }]); await keepDelay(80);
    assert.equal(instances[0].createdOsc.length, before, 'after reset baseline cleared, first observe silent');
    // stale queued item (id 2 done) should not have fired
    await keepDelay(700);
    assert.equal(instances[0].createdOsc.length, before, 'stale queue should be invalidated');
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('never make sound for running/idle/ghost/ended', async () => {
    installFake(); const mod = freshModule(); const a = mod.create(); await a.enable();
    a.observe([{ id: '1', state: 'idle', voice: 'laghari' }]); await keepDelay(20);
    const base = instances[0].createdOsc.length;
    for (const s of ['running', 'idle', 'ghost', 'ended']) {
      a.observe([{ id: '1', state: s, voice: 'laghari' }]); await keepDelay(60);
    }
    assert.equal(instances[0].createdOsc.length, base);
    a.disable(); a.reset(); await keepDelay(20);
  });

  test('sample only when enabled', async () => {
    installFake(); const mod = freshModule(); const a = mod.create();
    a.sample('laghari', 'done'); assert.equal(instances.length, 0);
    await a.enable(); const b = instances[0].createdOsc.length; a.sample('laghari','done'); await keepDelay(80); assert.ok(instances[0].createdOsc.length > b);
    a.disable(); const after = instances[0].createdOsc.length; a.sample('laghari','done'); await keepDelay(60); assert.equal(instances[0].createdOsc.length, after);
    a.reset(); await keepDelay(20);
  });

  test('errors handled unavailable', async () => {
    uninstallFake(); const mod = freshModule(); const a = mod.create(); const ok = await a.enable(); assert.equal(ok, false);
    assert.doesNotThrow(() => a.sample('laghari','done'));
    assert.doesNotThrow(() => a.observe([{id:'1',state:'done',voice:'laghari'}]));
    assert.doesNotThrow(() => a.setVolume(0.5));
    assert.doesNotThrow(() => a.disable());
    assert.doesNotThrow(() => a.reset());
  });

  for (const t of tests) {
    try {
      uninstallFake(); installFake();
      await t.fn();
      console.log(`✓ ${t.name}`);
      pass++;
    } catch (e) { console.error(`✗ ${t.name}`); console.error(e.stack||e); fail++; }
    finally { uninstallFake(); await delay(10); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  assert.equal(fail, 0, `${fail} tests failed`);
  assert.equal(pass, tests.length, `expected ${tests.length} tests`);
  if (fail) process.exitCode = 1;
}
run().catch(e=>{console.error(e);process.exit(1);});
