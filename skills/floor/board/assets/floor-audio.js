/* FloorAudio — retro chiptune alerts */
(function () {
  'use strict';
  const TRIGGER = { done: 1, needs_input: 1, failed: 1 };
  const VOICES = {
    laghari: { base: 440, type: 'triangle' },
    claude: { base: 349, type: 'triangle' },
    codex: { base: 330, type: 'square' },
    gemini: { base: 262, type: 'triangle' },
    deepseek: { base: 523, type: 'square' }
  };
  const MOTIFS = {
    done: { steps: [0, 4, 7, 12], rhythm: [0.11, 0.11, 0.11, 0.18], gap: 0.02 },
    needs_input: { steps: [0, 7, 12, 7], rhythm: [0.10, 0.10, 0.10, 0.14], gap: 0.02 },
    failed: { steps: [0, 3, 6, 0], rhythm: [0.13, 0.13, 0.13, 0.20], gap: 0.02 }
  };
  const MAX_QUEUE = 3;
  const DEFAULT_VOLUME = 0.15;
  const MASTER_CAP = 0.3;

  function normalizeVoice(v) {
    if (typeof v !== 'string') return 'laghari';
    const n = v.trim().toLowerCase();
    if (n === 'claude-red' || n === 'claude') return 'claude';
    if (n === 'codex') return 'codex';
    if (n === 'gemini') return 'gemini';
    if (n === 'deepseek') return 'deepseek';
    if (n === 'muse' || n === 'laghari') return 'laghari';
    return 'laghari';
  }

  function freqForVoice(voice, semi) {
    const conf = VOICES[voice] || VOICES.laghari;
    return conf.base * Math.pow(2, semi / 12);
  }

  function motifDuration(state) {
    const m = MOTIFS[state] || MOTIFS.done;
    let d = 0;
    for (let i = 0; i < m.rhythm.length; i++) d += m.rhythm[i] + m.gap;
    return d;
  }

  function getCtor() {
    if (typeof window !== 'undefined' && window.AudioContext) return window.AudioContext;
    if (typeof window !== 'undefined' && window.webkitAudioContext) return window.webkitAudioContext;
    if (typeof globalThis !== 'undefined' && globalThis.AudioContext) return globalThis.AudioContext;
    if (typeof globalThis !== 'undefined' && globalThis.webkitAudioContext) return globalThis.webkitAudioContext;
    return null;
  }

  function create() {
    let enabled = false;
    let ctx = null;
    let masterGain = null;
    let volume = DEFAULT_VOLUME;
    let prevStates = new Map();
    let initialized = false;
    let queue = [];
    let isPlaying = false;
    let nextTimer = null;
    let activeNodes = [];
    let enableGen = 0;
    let queueGen = 0;
    let pendingEnable = null;

    function clampVolume(v) {
      const n = Number(v);
      if (!isFinite(n)) return volume;
      return Math.max(0, Math.min(1, n));
    }
    function effectiveGain() {
      return clampVolume(volume) * MASTER_CAP;
    }
    function applyMasterGain() {
      if (!masterGain) return;
      const g = effectiveGain();
      try {
        if (ctx && masterGain.gain.setValueAtTime) masterGain.gain.setValueAtTime(g, ctx.currentTime);
        else masterGain.gain.value = g;
      } catch (_) {
        try { masterGain.gain.value = g; } catch (_) {}
      }
    }
    function ensureContext() {
      if (ctx) return ctx;
      const Ctor = getCtor();
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
        masterGain = ctx.createGain();
        masterGain.gain.value = effectiveGain();
        try { masterGain.connect(ctx.destination); } catch (_) {}
        return ctx;
      } catch (_) { ctx = null; masterGain = null; return null; }
    }
    function clearNextTimer() {
      if (nextTimer !== null) { clearTimeout(nextTimer); nextTimer = null; }
    }
    function stopActive() {
      const nodes = activeNodes.slice();
      activeNodes = [];
      for (const n of nodes) {
        try { n.osc.stop(); } catch (_) {}
        try { n.osc.disconnect(); } catch (_) {}
        try { n.gain.disconnect(); } catch (_) {}
        if (n.cleanupTimer) clearTimeout(n.cleanupTimer);
        try { n.osc.onended = null; } catch (_) {}
      }
    }

    function playMotif(voice, state) {
      if (!enabled || !ctx || !masterGain) return;
      const norm = normalizeVoice(voice);
      const motif = MOTIFS[state] || MOTIFS.done;
      const vConf = VOICES[norm] || VOICES.laghari;
      const now = ctx.currentTime || 0;
      let t = now;
      for (let i = 0; i < motif.steps.length; i++) {
        const freq = freqForVoice(norm, motif.steps[i]);
        const dur = motif.rhythm[i];
        let osc, gain;
        try {
          osc = ctx.createOscillator();
          gain = ctx.createGain();
        } catch (_) { t += dur + motif.gap; continue; }
        osc.type = vConf.type;
        try { osc.frequency.value = freq; } catch (_) { try { osc.frequency.setValueAtTime(freq, t); } catch (_) {} }
        gain.gain.value = 0;
        let connectedOsc = false, connectedGain = false;
        try { osc.connect(gain); connectedOsc = true; } catch (_) {}
        try { gain.connect(masterGain); connectedGain = true; } catch (_) {}
        if (!connectedOsc || !connectedGain) {
          try { osc.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
          t += dur + motif.gap;
          continue;
        }
        const envPeak = 0.6;
        try {
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(envPeak, t + 0.015);
          gain.gain.setValueAtTime(envPeak, t + dur - 0.02);
          gain.gain.linearRampToValueAtTime(0, t + dur);
        } catch (_) { try { gain.gain.value = envPeak * 0.5; } catch (_) {} }
        try { osc.start(t); } catch (_) {}
        try { osc.stop(t + dur + 0.01); } catch (_) {}
        const node = { osc, gain, cleanupTimer: null, cleaned: false };
        activeNodes.push(node);
        const cleanup = () => {
          if (node.cleaned) return;
          node.cleaned = true;
          if (node.cleanupTimer) { clearTimeout(node.cleanupTimer); node.cleanupTimer = null; }
          try { osc.onended = null; } catch (_) {}
          try { osc.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
          const idx = activeNodes.indexOf(node);
          if (idx !== -1) activeNodes.splice(idx, 1);
        };
        try { osc.onended = cleanup; } catch (_) {}
        const delayMs = Math.max(0, (t + dur + 0.02 - now) * 1000 + 20);
        node.cleanupTimer = setTimeout(cleanup, delayMs);
        t += dur + motif.gap;
      }
    }

    function scheduleNext() {
      if (!enabled || isPlaying || queue.length === 0) return;
      const genAtSchedule = queueGen;
      const item = queue.shift();
      isPlaying = true;
      playMotif(item.voice, item.state);
      const dur = motifDuration(item.state);
      nextTimer = setTimeout(() => {
        nextTimer = null;
        if (genAtSchedule !== queueGen) { isPlaying = false; return; }
        isPlaying = false;
        scheduleNext();
      }, dur * 1000 + 25);
    }

    function enqueue(voice, state) {
      const outstanding = queue.length + (isPlaying ? 1 : 0);
      if (outstanding >= MAX_QUEUE) return;
      queue.push({ voice: normalizeVoice(voice), state });
      scheduleNext();
    }

    return {
      enable() {
        if (pendingEnable) return pendingEnable;
        const myGen = ++enableGen;
        // create context/resume synchronously before yielding (user gesture)
        let syncCtx = null;
        let syncResumePromise = null;
        let syncFailed = false;
        if (enabled && ctx) {
          if (ctx.state === 'suspended' && ctx.resume) {
            try { syncResumePromise = ctx.resume(); } catch (_) { syncFailed = true; }
          } else {
            // already running
            const p = Promise.resolve(true);
            pendingEnable = p;
            p.finally(() => { if (myGen === enableGen) pendingEnable = null; });
            return p;
          }
        } else {
          syncCtx = ensureContext();
          if (!syncCtx) {
            const p = Promise.resolve(false);
            pendingEnable = p;
            p.finally(() => { if (myGen === enableGen) pendingEnable = null; });
            return p;
          }
          if (syncCtx.state === 'suspended' && syncCtx.resume) {
            try { syncResumePromise = syncCtx.resume(); } catch (_) { syncFailed = true; }
          }
        }
        if (syncFailed) {
          enabled = false;
          const p = Promise.resolve(false);
          pendingEnable = p;
          p.finally(() => { if (myGen === enableGen) pendingEnable = null; });
          return p;
        }
        if (syncResumePromise && typeof syncResumePromise.then === 'function') {
          const p = syncResumePromise.then(() => {
            if (myGen !== enableGen) return false;
            enabled = true;
            applyMasterGain();
            return true;
          }, () => {
            if (myGen !== enableGen) return false;
            enabled = false;
            return false;
          });
          pendingEnable = p;
          p.finally(() => { if (myGen === enableGen) pendingEnable = null; });
          return p;
        }
        // no async resume needed
        enabled = true;
        applyMasterGain();
        const p = Promise.resolve(true);
        pendingEnable = p;
        p.finally(() => { if (myGen === enableGen) pendingEnable = null; });
        return p;
      },
      disable() {
        enableGen++;
        queueGen++;
        enabled = false;
        clearNextTimer();
        isPlaying = false;
        stopActive();
        queue = [];
        pendingEnable = null;
        try {
          if (ctx && ctx.suspend) {
            const p = ctx.suspend();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        } catch (_) {}
      },
      setVolume(v) {
        volume = clampVolume(v);
        applyMasterGain();
      },
      sample(voice, state) {
        if (!enabled || !ctx) return;
        const s = TRIGGER[state] ? state : 'done';
        enqueue(voice, s);
      },
      observe(agents) {
        if (!Array.isArray(agents)) return;
        const next = new Map();
        const triggers = [];
        for (const a of agents) {
          if (!a || typeof a.id !== 'string' || typeof a.state !== 'string') continue;
          const voice = normalizeVoice(a.voice || a.host || 'laghari');
          next.set(a.id, { state: a.state, voice });
          if (!initialized) continue;
          const prev = prevStates.get(a.id);
          const prevState = prev ? prev.state : null;
          if (prevState !== a.state && TRIGGER[a.state]) triggers.push({ voice, state: a.state });
        }
        if (!initialized) {
          prevStates = next;
          initialized = true;
          return;
        }
        prevStates = next;
        if (!enabled) return;
        for (const t of triggers) {
          const outstanding = queue.length + (isPlaying ? 1 : 0);
          if (outstanding >= MAX_QUEUE) break;
          enqueue(t.voice, t.state);
        }
      },
      reset() {
        queueGen++;
        clearNextTimer();
        isPlaying = false;
        stopActive();
        queue = [];
        prevStates = new Map();
        initialized = false;
        if (enabled) applyMasterGain();
      },
      _debug: {
        get enabled() { return enabled; },
        get ctx() { return ctx; },
        get masterGain() { return masterGain; },
        get queueLen() { return queue.length; },
        get isPlaying() { return isPlaying; },
        get pendingTimer() { return nextTimer; },
        get activeCount() { return activeNodes.length; }
      }
    };
  }

  const api = { create };
  if (typeof window !== 'undefined') window.FloorAudio = api;
  if (typeof globalThis !== 'undefined') globalThis.FloorAudio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
