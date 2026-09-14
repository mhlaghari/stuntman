/* ==========================================================================
   THE FLOOR / DUBAI STUDIO — Retro Arcade Pixel-Art Studio Runtime
   UMD/CommonJS module supporting pure Node tests & browser runtime
   ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FloorWorld = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── Pure Helpers & Mappings ───────────────────────────────────────────

  const HOST_MAP = {
    claude: 'Claude Code',
    codex: 'Codex',
    opencode: 'OpenCode',
    agy: 'Antigravity',
    muse: 'Muse'
  };

  const SKIN_MAP = {
    claude: 'claude',
    codex: 'codex',
    agy: 'gemini',
    opencode: 'deepseek',
    muse: 'laghari'
  };

  const VOICE_MAP = {
    claude: 'claude',
    codex: 'codex',
    agy: 'gemini',
    opencode: 'deepseek',
    muse: 'laghari'
  };

  const LABEL_MAP = {
    running: 'working',
    thinking: 'thinking',
    needs_input: 'needs you',
    done: 'done',
    ghost: 'silent',
    ended: 'left',
    idle: 'idle',
    failed: 'failed'
  };

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  function skinFor(host) {
    if (!host || typeof host !== 'string') return 'laghari';
    const h = host.toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(SKIN_MAP, h) ? SKIN_MAP[h] : 'laghari';
  }

  function hostLabel(host) {
    if (!host || typeof host !== 'string') return 'Agent';
    const h = host.toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(HOST_MAP, h) ? HOST_MAP[h] : host;
  }

  function voiceForAgent(agent) {
    if (!agent) return 'laghari';
    const host = (agent.host || '').toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(VOICE_MAP, host) ? VOICE_MAP[host] : 'laghari';
  }

  function animClassFor(agent, direction) {
    if (!agent || typeof agent !== 'object') return 'anim-idle';
    const s = agent.state;
    if (s === 'running') return 'anim-riff';
    if (s === 'thinking') return 'anim-horns';
    if (s === 'needs_input') return 'anim-horns';
    if (s === 'failed') return 'anim-failed';
    if (s === 'done') {
      const age = Number(agent.age_s) || 0;
      if (age < 8) return 'anim-jump';
      if (age < 30) return 'anim-victory';
      return 'anim-idle';
    }
    return 'anim-idle';
  }

  function formatAge(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  }

  function filterRooms(rooms, projectFilter, selectedGroups) {
    if (!Array.isArray(rooms)) return [];
    const hasStatusFilter = selectedGroups !== undefined && selectedGroups !== null;
    let normalized = null;
    if (hasStatusFilter) {
      normalized = normalizeSelectedGroups(selectedGroups);
    }
    function roomMatchesProject(room) {
      if (!projectFilter || projectFilter === 'ALL') return true;
      return (room.cwd || '') === projectFilter;
    }
    if (!hasStatusFilter) {
      if (!projectFilter || projectFilter === 'ALL') return rooms.slice();
      return rooms.filter(roomMatchesProject);
    }
    const out = [];
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (!room || !roomMatchesProject(room)) continue;
      const agents = Array.isArray(room.agents) ? room.agents : [];
      const kept = [];
      for (let j = 0; j < agents.length; j++) {
        if (normalized.has(statusGroupFor(agents[j]))) kept.push(agents[j]);
      }
      if (kept.length === 0) continue;
      const copy = Object.assign({}, room);
      copy.agents = kept;
      out.push(copy);
    }
    return out;
  }

  const STATUS_GROUPS = ['working', 'needs_input', 'done', 'failed', 'idle', 'ghost', 'ended', 'other'];

  function statusGroupFor(agentOrState) {
    const s = agentOrState && typeof agentOrState === 'object' ? agentOrState.state : agentOrState;
    if (s === 'running' || s === 'thinking') return 'working';
    if (s === 'needs_input') return 'needs_input';
    if (s === 'done') return 'done';
    if (s === 'failed') return 'failed';
    if (s === 'idle') return 'idle';
    if (s === 'ghost') return 'ghost';
    if (s === 'ended') return 'ended';
    return 'other';
  }

  function normalizeSelectedGroups(selected) {
    if (selected instanceof Set) return new Set(selected);
    if (Array.isArray(selected)) return new Set(selected);
    if (selected && typeof selected === 'object') {
      const set = new Set();
      for (let i = 0; i < STATUS_GROUPS.length; i++) {
        if (selected[STATUS_GROUPS[i]]) set.add(STATUS_GROUPS[i]);
      }
      return set;
    }
    return new Set(STATUS_GROUPS);
  }

  function allGroupsSelected(selected) {
    const n = normalizeSelectedGroups(selected);
    for (let i = 0; i < STATUS_GROUPS.length; i++) {
      if (!n.has(STATUS_GROUPS[i])) return false;
    }
    return true;
  }

  function collectAllAgents(rooms) {
    if (!Array.isArray(rooms)) return [];
    const all = [];
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (r && Array.isArray(r.agents)) {
        for (let j = 0; j < r.agents.length; j++) {
          all.push(r.agents[j]);
        }
      }
    }
    return all;
  }

  function recalculateCounts(state) {
    if (!state || !Array.isArray(state.rooms)) {
      return { working: 0, needs_input: 0, done: 0 };
    }
    let working = 0, needs_input = 0, done = 0;
    const all = collectAllAgents(state.rooms);
    for (let i = 0; i < all.length; i++) {
      const s = all[i].state;
      if (s === 'running' || s === 'thinking') working++;
      else if (s === 'needs_input') needs_input++;
      else if (s === 'done') done++;
    }
    state.counts = { working: working, needs_input: needs_input, done: done };
    return state.counts;
  }

  // Format select options: room.name, or room.name (parent) if duplicate names exist
  function formatRoomOptionLabels(rooms) {
    const nameCounts = Object.create(null);
    for (let i = 0; i < rooms.length; i++) {
      const name = rooms[i].name || 'project';
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
    return rooms.map(function (r) {
      const name = r.name || 'project';
      if (nameCounts[name] > 1 && r.cwd) {
        const parts = r.cwd.replace(/[\\/]+$/, '').split(/[\\/]/);
        const parent = parts.length > 1 ? parts[parts.length - 2] : '';
        return {
          cwd: r.cwd,
          label: parent ? name + ' (' + parent + ')' : name
        };
      }
      return {
        cwd: r.cwd,
        label: name
      };
    });
  }

  // ── Browser Runtime ───────────────────────────────────────────────────

  function initBrowser(options) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    options = options || {};
    const token = options.token || window.FLOOR_TOKEN || (document.body && document.body.dataset.token) || '';

    // Cached reduced motion media query
    const mediaReducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    // Elements
    const $ = function (id) { return document.getElementById(id); };
    const elClock = $('dubai-clock-time');
    const elStatusBadge = $('connection-status');
    const elBtnSound = $('btn-sound-toggle');
    const elBtnMotion = $('btn-motion-toggle');
    const elProjectSelect = $('project-filter-select');
    const elWorkstations = $('workstations-container');
    const elAttentionList = $('attention-list');
    const elAttentionEmpty = $('attention-empty');
    const elManifestBody = $('manifest-table-body');
    const elManifestWorking = $('manifest-working-count');
    const elManifestNeeds = $('manifest-needs-count');
    const elManifestDone = $('manifest-done-count');
    const elVolSlider = $('sound-volume-slider');
    const elSoundStatus = $('sound-desk-status');

    // Drawer Elements
    const elDrawer = $('drawer');
    const elBackdrop = $('drawer-backdrop');
    const elDTitle = $('dtitle');
    const elDReach = $('dreach');
    const elDPlayCue = $('dplaycue');
    const elDClose = $('dclose');
    const elDLog = $('dlog');
    const elDSend = $('dsend');
    const elDInput = $('dinput');
    const elDBtn = $('dbtn');
    const elDNote = $('dnote');

    // State Variables
    let latestLiveState = null;
    let selectedProject = 'ALL';
    let selectedProjectLabel = null;
    let selectedGroups = new Set(STATUS_GROUPS);

    function projectBasename(cwd) {
      if (!cwd || typeof cwd !== 'string') return 'project';
      const trimmed = cwd.replace(/[\\/]+$/, '');
      if (!trimmed) return 'project';
      const parts = trimmed.split(/[\\/]/);
      return parts[parts.length - 1] || 'project';
    }
    let currentDrawerSid = null;       // composite agent.id
    let currentDrawerAgent = null;     // live reference
    let currentDrawerReach = 'none';   // 'tmux' | 'none'
    let lastActiveTriggerId = null;    // for focus restoration
    let isSending = false;
    let motionPaused = false;
    let audioInstance = null;
    let audioEnabled = false;

    // Concurrency & Generation tracking
    let isConnected = false;
    let pollGeneration = 0;
    let transcriptGeneration = 0;
    let transcriptActive = false;
    let drawerPollTimer = null;
    let movementInterval = null;

    // Persisted drafts per composite agent ID
    const drafts = new Map();

    // Keyed Persistent DOM Caches: No full innerHTML resets every tick!
    const zoneDomNodes = new Map();      // cwd -> { zoneEl, agentsWrap, titleEl, cwdEl }
    const actorDomNodes = new Map();     // id -> { root, mover, sprite, activity, msg, say, stateBadge, screen, bubble, subagentsWrap, currentDirection, currentState, currentSkin, currentAnim }
    const actorPositions = new Map();    // id -> { pos: number, dir: 1|-1 }
    const attentionDomCards = new Map(); // id -> button
    const manifestDomRows = new Map();   // id -> tr
    let lastEmptyKind = null;

    // Initialize FloorAudio
    if (window.FloorAudio && typeof window.FloorAudio.create === 'function') {
      audioInstance = window.FloorAudio.create();
    }

    // Default volume: 0.15 unless saved in localStorage
    let initialVolume = 0.15;
    try {
      const savedVol = window.localStorage.getItem('stuntman_floor_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          initialVolume = v;
        }
      }
    } catch (_) {}
    if (elVolSlider) elVolSlider.value = initialVolume;
    if (audioInstance) audioInstance.setVolume(initialVolume);

    // Persisted motion preference
    try {
      const savedMotion = window.localStorage.getItem('stuntman_floor_motion_paused');
      if (savedMotion === 'true') {
        motionPaused = true;
        document.body.classList.add('motion-paused');
      }
    } catch (_) {}
    updateToggleButtons();

    // ── Dubai Clock ──
    let dubaiFormatter = null;
    try {
      dubaiFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (_) {}

    function updateDubaiClock() {
      if (typeof document === 'undefined' || !elClock) return;
      try {
        elClock.textContent = dubaiFormatter ? dubaiFormatter.format(new Date()) : new Date().toTimeString().slice(0, 8);
      } catch (_) {
        elClock.textContent = new Date().toTimeString().slice(0, 8);
      }
    }
    const clockTimer = setInterval(updateDubaiClock, 1000);
    updateDubaiClock();

    // ── Button ARIA Synchronization ──
    function updateToggleButtons() {
      if (typeof document === 'undefined') return;
      if (elBtnSound) {
        elBtnSound.textContent = audioEnabled ? 'Sound: On' : 'Sound: Off';
        elBtnSound.classList.toggle('active', audioEnabled);
        elBtnSound.setAttribute('aria-pressed', audioEnabled ? 'true' : 'false');
        elBtnSound.setAttribute('aria-label', 'Toggle audio alerts (currently ' + (audioEnabled ? 'On' : 'Off') + ')');
      }
      if (elBtnMotion) {
        elBtnMotion.textContent = motionPaused ? 'Motion: Off' : 'Motion: On';
        elBtnMotion.classList.toggle('active', !motionPaused);
        elBtnMotion.setAttribute('aria-pressed', !motionPaused ? 'true' : 'false');
        elBtnMotion.setAttribute('aria-label', 'Toggle motion animations (currently ' + (!motionPaused ? 'On' : 'Off') + ')');
      }
    }

    // ── Motion & Animation Loop ──
    function moveActors() {
      if (typeof document === 'undefined' || motionPaused || document.hidden || (mediaReducedMotion && mediaReducedMotion.matches)) {
        return;
      }
      actorPositions.forEach(function (posData, id) {
        const cached = actorDomNodes.get(id);
        if (!cached || !cached.mover) return;

        // No lateral sliding while performing guitar riffs or staying in place
        if (posData.pos !== 0) {
          posData.pos = 0;
          cached.mover.style.transform = 'translateX(0px)';
        }

        const agent = findAgentById(id) || { id: id, state: cached.root.dataset.state, age_s: cached.root.dataset.ageS };
        const resolvedAnim = animClassFor(agent);

        if (cached.currentAnim !== resolvedAnim || cached.currentState !== agent.state) {
          cached.currentAnim = resolvedAnim;
          cached.currentState = agent.state;
          cached.sprite.className = 'sprite skin-' + cached.currentSkin + ' ' + resolvedAnim;
        }
      });
    }

    function startMovementLoop() {
      if (movementInterval) clearInterval(movementInterval);
      movementInterval = setInterval(moveActors, 200);
    }
    function stopMovementLoop() {
      if (movementInterval) {
        clearInterval(movementInterval);
        movementInterval = null;
      }
    }
    startMovementLoop();

    // Stop loops when tab is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopMovementLoop();
      } else {
        startMovementLoop();
      }
    });

    // ── Safe JSON Fetch ──
    async function jsonFetch(url, fetchOpts) {
      fetchOpts = fetchOpts || {};
      const timeout = AbortSignal.timeout(8000);
      const signal = fetchOpts.signal ? AbortSignal.any([fetchOpts.signal, timeout]) : timeout;
      const response = await fetch(url, Object.assign({}, fetchOpts, { signal: signal }));
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || (response.status === 403 ? 'Reload board to reconnect.' : 'The session is unavailable.'));
      }
      return data;
    }

    // ── Sound Controls ──
    function updateAudioStatus() {
      if (!elSoundStatus) return;
      if (!audioInstance) {
        elSoundStatus.textContent = 'Web Audio unavailable in this environment.';
        return;
      }
      if (audioEnabled) {
        elSoundStatus.textContent = 'Audio active. Alerts trigger on finished or input-required events.';
      } else {
        elSoundStatus.textContent = 'Audio off (click Sound toggle or sample to activate).';
      }
      updateToggleButtons();
    }

    async function enableAudio() {
      if (!audioInstance) {
        if (elSoundStatus) elSoundStatus.textContent = 'Web Audio unavailable in this environment.';
        return false;
      }
      try {
        const ok = await audioInstance.enable();
        if (ok) {
          audioEnabled = true;
          updateAudioStatus();
          return true;
        } else {
          audioEnabled = false;
          if (elSoundStatus) elSoundStatus.textContent = 'Audio unavailable in this environment.';
          updateToggleButtons();
          return false;
        }
      } catch (_) {
        audioEnabled = false;
        if (elSoundStatus) elSoundStatus.textContent = 'Audio unavailable in this environment.';
        updateToggleButtons();
        return false;
      }
    }

    function disableAudio() {
      if (!audioInstance) return;
      audioInstance.disable();
      audioEnabled = false;
      updateAudioStatus();
    }

    if (elBtnSound) {
      elBtnSound.addEventListener('click', async function () {
        if (audioEnabled) {
          disableAudio();
        } else {
          await enableAudio();
        }
      });
    }

    if (elVolSlider) {
      elVolSlider.addEventListener('input', function () {
        const v = parseFloat(elVolSlider.value);
        if (audioInstance) audioInstance.setVolume(v);
        try {
          window.localStorage.setItem('stuntman_floor_volume', String(v));
        } catch (_) {}
      });
    }

    // Voice sample buttons (explicit user click enables sound)
    document.querySelectorAll('[data-voice-sample]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const voice = btn.dataset.voiceSample;
        if (!audioEnabled) {
          const ok = await enableAudio();
          if (!ok) return;
        }
        if (audioInstance) {
          audioInstance.sample(voice, 'done');
        }
      });
    });

    // ── Motion Toggle ──
    if (elBtnMotion) {
      elBtnMotion.addEventListener('click', function () {
        motionPaused = !motionPaused;
        if (motionPaused) {
          document.body.classList.add('motion-paused');
        } else {
          document.body.classList.remove('motion-paused');
        }
        updateToggleButtons();
        try {
          window.localStorage.setItem('stuntman_floor_motion_paused', String(motionPaused));
        } catch (_) {}
      });
    }

    // ── Project + Status Visibility Filters ──
    const elBtnShowAll = $('btn-show-all');
    const elFilterCount = $('filter-count');

    function isFilteringActive() {
      if (selectedProject !== 'ALL') return true;
      return !allGroupsSelected(selectedGroups);
    }

    function updateFilterControls(visibleCount, totalCount) {
      const chips = typeof document !== 'undefined' && document.querySelectorAll
        ? document.querySelectorAll('[data-status-group]')
        : [];
      for (let i = 0; i < chips.length; i++) {
        const chip = chips[i];
        const g = chip.getAttribute ? chip.getAttribute('data-status-group') : chip.dataset.statusGroup;
        const on = selectedGroups.has(g);
        chip.classList.toggle('active', on);
        if (typeof chip.setAttribute === 'function') {
          const nextPressed = on ? 'true' : 'false';
          const curPressed = chip.getAttribute ? chip.getAttribute('aria-pressed') : null;
          if (curPressed !== nextPressed) {
            chip.setAttribute('aria-pressed', nextPressed);
          }
        }
      }
      if (elBtnShowAll) {
        const shouldDisable = !isFilteringActive();
        if (elBtnShowAll.disabled !== shouldDisable) {
          elBtnShowAll.disabled = shouldDisable;
        }
      }
      if (elFilterCount) {
        const nextText = 'Showing ' + visibleCount + ' of ' + totalCount + ' agents';
        if (elFilterCount.textContent !== nextText) {
          elFilterCount.textContent = nextText;
        }
      }
    }

    function setStatusGroupVisible(group, visible) {
      if (STATUS_GROUPS.indexOf(group) === -1) return;
      if (visible) selectedGroups.add(group);
      else selectedGroups.delete(group);
      updateView();
    }

    function showAllFilters() {
      selectedGroups = new Set(STATUS_GROUPS);
      selectedProject = 'ALL';
      selectedProjectLabel = null;
      if (elProjectSelect) elProjectSelect.value = 'ALL';
      updateView();
    }

    if (typeof document !== 'undefined' && document.querySelectorAll) {
      document.querySelectorAll('[data-status-group]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          const g = chip.getAttribute ? chip.getAttribute('data-status-group') : chip.dataset.statusGroup;
          const currentlyOn = selectedGroups.has(g);
          setStatusGroupVisible(g, !currentlyOn);
        });
      });
    }
    if (elBtnShowAll) {
      elBtnShowAll.addEventListener('click', showAllFilters);
    }

    // ── Project Filter ──
    if (elProjectSelect) {
      elProjectSelect.addEventListener('change', function () {
        selectedProject = elProjectSelect.value;
        if (selectedProject && selectedProject !== 'ALL') {
          let foundLabel = null;
          const opts = elProjectSelect.options || [];
          for (let oi = 0; oi < opts.length; oi++) {
            if (opts[oi].value === selectedProject) {
              foundLabel = opts[oi].text || '';
              break;
            }
          }
          if (foundLabel) {
            selectedProjectLabel = foundLabel.replace(/\s*\(no agents\)\s*$/, '');
          } else {
            selectedProjectLabel = projectBasename(selectedProject);
          }
        } else {
          selectedProjectLabel = null;
        }
        updateView();
      });
    }

    // Keep the user's project selection across empty snapshots: never reset to
    // ALL here. A selected-but-absent project stays selected via a temporary
    // retained option ("<label> (no agents)"); the suffix is removed on return.
    function updateProjectSelect(rooms) {
      if (!elProjectSelect) return;
      const formatted = formatRoomOptionLabels(rooms);
      const labelByCwd = Object.create(null);
      const seenOrder = [];
      for (let i = 0; i < formatted.length; i++) {
        const item = formatted[i];
        if (!Object.prototype.hasOwnProperty.call(labelByCwd, item.cwd)) {
          labelByCwd[item.cwd] = item.label;
          seenOrder.push(item.cwd);
        }
      }

      if (selectedProject !== 'ALL' && Object.prototype.hasOwnProperty.call(labelByCwd, selectedProject)) {
        selectedProjectLabel = labelByCwd[selectedProject];
      }

      let retained = null;
      if (selectedProject !== 'ALL' && !Object.prototype.hasOwnProperty.call(labelByCwd, selectedProject)) {
        const base = selectedProjectLabel || projectBasename(selectedProject);
        retained = { cwd: selectedProject, label: base + ' (no agents)' };
      }

      const entries = [{ cwd: 'ALL', label: 'All Projects' }];
      for (let si = 0; si < seenOrder.length; si++) {
        entries.push({ cwd: seenOrder[si], label: labelByCwd[seenOrder[si]] });
      }
      if (retained) entries.push(retained);

      const newOptsStr = entries.map(function (e) { return e.cwd + ':' + e.label; }).join('|');
      const currentOpts = Array.from(elProjectSelect.options || []).map(function (o) { return o.value + ':' + o.text; }).join('|');
      if (currentOpts === newOptsStr) {
        if (elProjectSelect.value !== selectedProject) elProjectSelect.value = selectedProject;
        return;
      }

      let html = '';
      for (let hi = 0; hi < entries.length; hi++) {
        html += '<option value="' + escapeHtml(entries[hi].cwd) + '">' + escapeHtml(entries[hi].label) + '</option>';
      }
      elProjectSelect.innerHTML = html;
      elProjectSelect.value = selectedProject;
    }

    // Find agent by composite id in current live state (full snapshot, unfiltered)
    function findAgentById(id) {
      const state = latestLiveState;
      if (!state || !Array.isArray(state.rooms)) return null;
      const all = collectAllAgents(state.rooms);
      for (let i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[i];
      }
      return null;
    }

    // Find room name for an agent (full snapshot, unfiltered)
    function findRoomNameForAgent(id) {
      const state = latestLiveState;
      if (!state || !Array.isArray(state.rooms)) return 'project';
      for (let i = 0; i < state.rooms.length; i++) {
        const r = state.rooms[i];
        if (Array.isArray(r.agents) && r.agents.some(function (a) { return a.id === id; })) {
          return r.name || 'project';
        }
      }
      return 'project';
    }

    // ── Keyed Persistent DOM Actor Creator & In-Place Updater ──
    function getOrCreateActorNode(agent, roomName) {
      const id = agent.id;
      const skin = skinFor(agent.host);
      const shortSid = String(agent.sid || '').replace(/^(?:worker-)/, '').slice(0, 8);

      if (actorDomNodes.has(id)) {
        const cached = actorDomNodes.get(id);
        cached.root.dataset.state = agent.state;
        cached.root.dataset.ageS = String(agent.age_s || 0);
        cached.root.dataset.room = roomName;
        cached.root.classList.toggle('ghosted', ['ghost', 'ended'].includes(agent.state));
        cached.root.classList.toggle('selected', currentDrawerSid === id);

        const resolvedAnim = animClassFor(agent);
        if (cached.currentAnim !== resolvedAnim || cached.currentSkin !== skin) {
          cached.currentAnim = resolvedAnim;
          cached.currentSkin = skin;
          cached.sprite.className = 'sprite skin-' + skin + ' ' + resolvedAnim;
        }

        // Update Needs You bubble
        if (agent.state === 'needs_input') {
          if (!cached.bubble) {
            const b = document.createElement('span');
            b.className = 'bubble-needs-you';
            b.textContent = 'NEEDS YOU';
            cached.stage.appendChild(b);
            cached.bubble = b;
          }
        } else if (cached.bubble) {
          cached.bubble.remove();
          cached.bubble = null;
        }

        // Update monitor screen state
        const scrClass = agent.state === 'needs_input' ? 'needs-input' : agent.state;
        cached.screen.className = 'monitor-screen ' + scrClass;

        // Update badge & activity line (1 short line max 170px)
        cached.stateBadge.textContent = LABEL_MAP[agent.state] || agent.state;
        cached.stateBadge.className = 'state-badge ' + agent.state;
        const actText = agent.tool ? 'using ' + agent.tool : (agent.say || 'standing by');
        cached.activity.textContent = actText;
        cached.activity.title = actText;

        // Update child badges when children change
        updateSubagentChips(cached.subagentsWrap, agent.children);
        return cached.root;
      }

      // Create new keyed vertical slot
      const root = document.createElement('div');
      root.className = 'desk-setup' + (['ghost', 'ended'].includes(agent.state) ? ' ghosted' : '') + (currentDrawerSid === id ? ' selected' : '');
      root.dataset.actorId = id;
      root.dataset.state = agent.state;
      root.dataset.ageS = String(agent.age_s || 0);
      root.dataset.room = roomName;
      root.tabIndex = 0;
      root.setAttribute('role', 'button');
      root.setAttribute('aria-label', hostLabel(agent.host) + ' in ' + roomName + ' (' + shortSid + ')');

      // Desk Furniture Layer (Behind & on floor)
      const furn = document.createElement('div');
      furn.className = 'desk-furniture-layer';
      const monitor = document.createElement('div');
      monitor.className = 'pixel-monitor';
      const screen = document.createElement('div');
      const scrClass = agent.state === 'needs_input' ? 'needs-input' : agent.state;
      screen.className = 'monitor-screen ' + scrClass;
      monitor.appendChild(screen);
      const monLegs = document.createElement('div');
      monLegs.className = 'monitor-legs';
      const surface = document.createElement('div');
      surface.className = 'desk-surface';
      const legsWrap = document.createElement('div');
      legsWrap.className = 'desk-legs';
      const legL = document.createElement('div');
      legL.className = 'desk-leg';
      const legR = document.createElement('div');
      legR.className = 'desk-leg';
      legsWrap.appendChild(legL);
      legsWrap.appendChild(legR);
      furn.appendChild(monitor);
      furn.appendChild(monLegs);
      furn.appendChild(surface);
      furn.appendChild(legsWrap);
      root.appendChild(furn);

      // Sprite Stage (Approx 110x112 with centered sprite)
      const stage = document.createElement('div');
      stage.className = 'actor-stage';

      const mover = document.createElement('div');
      mover.className = 'actor-mover';
      const sprite = document.createElement('div');
      const resolvedAnim = animClassFor(agent);
      sprite.className = 'sprite skin-' + skin + ' ' + resolvedAnim;
      mover.appendChild(sprite);
      stage.appendChild(mover);

      let bubble = null;
      if (agent.state === 'needs_input') {
        bubble = document.createElement('span');
        bubble.className = 'bubble-needs-you';
        bubble.textContent = 'NEEDS YOU';
        stage.appendChild(bubble);
      }
      root.appendChild(stage);

      // Centered Slot Meta
      const meta = document.createElement('div');
      meta.className = 'slot-meta';

      const who = document.createElement('div');
      who.className = 'slot-who';
      who.style.maxWidth = '100%';
      who.style.overflowWrap = 'anywhere';
      who.style.whiteSpace = 'normal';
      who.textContent = hostLabel(agent.host);

      const sidSpan = document.createElement('span');
      sidSpan.className = 'slot-sid';
      sidSpan.style.display = 'block';
      sidSpan.textContent = shortSid;
      who.appendChild(sidSpan);
      meta.appendChild(who);

      const badges = document.createElement('div');
      badges.className = 'slot-badges';
      const stateBadge = document.createElement('span');
      stateBadge.className = 'state-badge ' + agent.state;
      stateBadge.textContent = LABEL_MAP[agent.state] || agent.state;
      badges.appendChild(stateBadge);
      if (agent.worker) {
        const wp = document.createElement('span');
        wp.className = 'worker-pill';
        wp.textContent = 'worker';
        badges.appendChild(wp);
      }
      meta.appendChild(badges);

      // 1 short line activity (max 170px)
      const activity = document.createElement('div');
      activity.className = 'slot-activity';
      activity.style.width = '100%';
      activity.style.maxWidth = '170px';
      activity.style.minWidth = '0';
      const actText = agent.tool ? 'using ' + agent.tool : (agent.say || 'standing by');
      activity.textContent = actText;
      activity.title = actText;
      meta.appendChild(activity);

      // Subagents
      const subagentsWrap = document.createElement('div');
      subagentsWrap.className = 'slot-subagents';
      updateSubagentChips(subagentsWrap, agent.children);
      meta.appendChild(subagentsWrap);

      root.appendChild(meta);

      // Click / Key Listener looking up CURRENT data on demand
      function handleClick(e) {
        e.preventDefault();
        const currentData = findAgentById(id);
        const rName = findRoomNameForAgent(id);
        if (currentData) {
          openDrawer(currentData, rName);
        }
      }
      root.addEventListener('click', handleClick);
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      });

      actorDomNodes.set(id, {
        root: root,
        stage: stage,
        mover: mover,
        sprite: sprite,
        bubble: bubble,
        screen: screen,
        stateBadge: stateBadge,
        activity: activity,
        subagentsWrap: subagentsWrap,
        currentSkin: skin,
        currentAnim: resolvedAnim,
        currentState: agent.state
      });
      if (!actorPositions.has(id)) {
        actorPositions.set(id, { pos: (Math.random() * 8) - 4, dir: Math.random() > 0.5 ? 1 : -1 });
      }

      return root;
    }

    function updateSubagentChips(wrap, children) {
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!Array.isArray(children) || children.length === 0) return;
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const chip = document.createElement('span');
        chip.className = 'subagent-chip';
        chip.textContent = c.desc || c.id || 'subagent';
        chip.title = (c.id || '') + (c.desc ? ': ' + c.desc : '');
        wrap.appendChild(chip);
      }
    }

    // ── Render Studio & World (Persistent Keyed DOM) ──
    function updateView() {
      const currentState = latestLiveState;
      if (!currentState) {
        updateFilterControls(0, 0);
        if (elWorkstations && lastEmptyKind !== 'connecting') {
          lastEmptyKind = 'connecting';
          elWorkstations.innerHTML = '<div class="empty-studio">' +
            '<h3>The studio is quiet</h3>' +
            '<p>Connecting to floor service at 127.0.0.1:4517…</p>' +
            '</div>';
          zoneDomNodes.clear();
        }
        return;
      }

      const allRooms = currentState.rooms || [];
      updateProjectSelect(allRooms);
      const filteredRooms = filterRooms(allRooms, selectedProject, selectedGroups);
      const allAgents = collectAllAgents(allRooms);
      const visibleAgents = collectAllAgents(filteredRooms);
      updateFilterControls(visibleAgents.length, allAgents.length);

      // Capture active focus to restore across DOM updates
      const activeEl = document.activeElement;
      let activeActorId = null;
      if (activeEl && activeEl.dataset && activeEl.dataset.actorId) {
        activeActorId = activeEl.dataset.actorId;
      }

      // Collect all current live agent IDs (full snapshot) to evict stale nodes.
      // Filtered-out agents keep their cached nodes so toggling back restores identity.
      const allLiveAgentIds = new Set();
      for (let i = 0; i < allAgents.length; i++) {
        allLiveAgentIds.add(allAgents[i].id);
      }
      actorDomNodes.forEach(function (_, id) {
        if (!allLiveAgentIds.has(id)) {
          actorDomNodes.delete(id);
          actorPositions.delete(id);
        }
      });

      // 1. Workstations Grid in Rooftop Scene
      if (elWorkstations) {
        if (filteredRooms.length === 0) {
          const emptyKind = allAgents.length > 0 ? 'no-match' : 'no-live';
          if (lastEmptyKind !== emptyKind) {
            lastEmptyKind = emptyKind;
            elWorkstations.innerHTML = '<div class="empty-studio">' +
              '<h3>The studio is quiet</h3>' +
              '<p>' + (emptyKind === 'no-match'
                ? 'No agents match these filters. Use Show all to restore the floor.'
                : 'No agents on the floor yet. Start a session with active hooks or run Stuntman.') + '</p>' +
              '</div>';
            zoneDomNodes.clear();
          }
        } else {
          lastEmptyKind = null;
          // Remove empty-studio markup if present
          if (elWorkstations.querySelector('.empty-studio')) {
            elWorkstations.innerHTML = '';
          }

          // Ensure container grid exists
          let grid = elWorkstations.querySelector('.workstations-grid');
          if (!grid) {
            grid = document.createElement('div');
            grid.className = 'workstations-grid';
            elWorkstations.appendChild(grid);
          }

          const currentCwdSet = new Set();

          for (let i = 0; i < filteredRooms.length; i++) {
            const room = filteredRooms[i];
            const cwd = room.cwd || ('cwd-' + i);
            currentCwdSet.add(cwd);

            const hasHot = (room.agents || []).some(function (a) { return a.state === 'needs_input'; });
            const hasDone = (room.agents || []).some(function (a) { return a.state === 'done'; });

            let cachedZone = zoneDomNodes.get(cwd);
            if (!cachedZone) {
              const zone = document.createElement('section');
              zone.className = 'workstation-zone' + (hasHot ? ' hot' : (hasDone ? ' done-glow' : ''));

              const zhead = document.createElement('div');
              zhead.className = 'zone-header';
              const ztitle = document.createElement('h2');
              ztitle.className = 'zone-title';
              ztitle.textContent = room.name || 'project';
              ztitle.title = room.cwd || '';
              const zcwd = document.createElement('span');
              zcwd.className = 'zone-cwd';
              zcwd.textContent = '';
              zhead.appendChild(ztitle);
              zhead.appendChild(zcwd);
              zone.appendChild(zhead);

              const agentsWrap = document.createElement('div');
              agentsWrap.className = 'zone-agents';
              zone.appendChild(agentsWrap);

              grid.appendChild(zone);
              cachedZone = { zoneEl: zone, agentsWrap: agentsWrap, titleEl: ztitle, cwdEl: zcwd };
              zoneDomNodes.set(cwd, cachedZone);
            } else {
              // In place update of zone
              cachedZone.zoneEl.className = 'workstation-zone' + (hasHot ? ' hot' : (hasDone ? ' done-glow' : ''));
              cachedZone.titleEl.textContent = room.name || 'project';
              cachedZone.titleEl.title = room.cwd || '';
              cachedZone.cwdEl.textContent = '';
              if (!grid.contains(cachedZone.zoneEl)) {
                grid.appendChild(cachedZone.zoneEl);
              }
            }

            // Sync desk-setup children inside bay
            const agents = room.agents || [];
            const agentIdsInRoom = new Set();
            for (let j = 0; j < agents.length; j++) {
              const node = getOrCreateActorNode(agents[j], room.name || 'project');
              agentIdsInRoom.add(agents[j].id);
              if (!cachedZone.agentsWrap.contains(node)) {
                cachedZone.agentsWrap.appendChild(node);
              }
            }
            // Remove any nodes in this bay that are no longer present
            Array.from(cachedZone.agentsWrap.children).forEach(function (child) {
              if (child.dataset && child.dataset.actorId && !agentIdsInRoom.has(child.dataset.actorId)) {
                child.remove();
              }
            });
          }

          // Remove obsolete zone elements
          zoneDomNodes.forEach(function (cachedZone, cwd) {
            if (!currentCwdSet.has(cwd)) {
              cachedZone.zoneEl.remove();
              zoneDomNodes.delete(cwd);
            }
          });
        }
      }

      // Restore active actor focus if it was focused before update
      if (activeActorId) {
        const actor = actorDomNodes.get(activeActorId);
        if (actor && actor.root && document.activeElement !== actor.root) {
          actor.root.focus({ preventScroll: true });
        }
      }

      // 2. Attention Sidebar ('Needs you') - Keyed in-place update (filtered)
      const fullAttention = allAgents.filter(function (a) {
        return a.state === 'needs_input' || a.state === 'failed';
      });
      const visibleAttentionIds = new Set();
      for (let vi = 0; vi < visibleAgents.length; vi++) {
        if (visibleAgents[vi].state === 'needs_input' || visibleAgents[vi].state === 'failed') {
          visibleAttentionIds.add(visibleAgents[vi].id);
        }
      }
      const needsAttention = fullAttention.filter(function (a) { return visibleAttentionIds.has(a.id); });

      function updateAttentionEmpty() {
        const emptyText = elAttentionEmpty ? elAttentionEmpty.querySelector('.attention-empty-text') : null;
        if (!emptyText) return;
        const nextHtml = (fullAttention.length > 0 && needsAttention.length === 0)
          ? '<b>No matching alerts</b><br>Change filters to see hidden agents.'
          : '<b>All clear</b><br>Your crew has it from here.';
        if (emptyText.innerHTML !== nextHtml) {
          emptyText.innerHTML = nextHtml;
        }
      }

      if (elAttentionList && elAttentionEmpty) {
        updateAttentionEmpty();
        if (needsAttention.length === 0) {
          elAttentionEmpty.style.display = 'flex';
          elAttentionList.style.display = 'none';
          elAttentionList.innerHTML = '';
          attentionDomCards.clear();
        } else {
          elAttentionEmpty.style.display = 'none';
          elAttentionList.style.display = 'flex';

          const currentAttentionIds = new Set();
          for (let i = 0; i < needsAttention.length; i++) {
            const a = needsAttention[i];
            currentAttentionIds.add(a.id);
            const pName = findRoomNameForAgent(a.id);
            const shortSid = String(a.sid || '').replace(/^(?:worker-)/, '').slice(0, 8);
            let card = attentionDomCards.get(a.id);

            if (!card) {
              card = document.createElement('button');
              card.className = 'attention-card';
              card.dataset.agentId = a.id;
              card.setAttribute('aria-label', 'Open ' + hostLabel(a.host) + ' in ' + pName + ' (' + shortSid + ')');

              const top = document.createElement('div');
              top.className = 'attention-top';
              const h = document.createElement('span');
              h.className = 'attention-host';
              h.textContent = hostLabel(a.host);
              const st = document.createElement('span');
              st.className = 'attention-state';
              st.textContent = a.state === 'needs_input' ? 'NEEDS YOU' : a.state.toUpperCase();
              top.appendChild(h);
              top.appendChild(st);
              card.appendChild(top);

              const proj = document.createElement('div');
              proj.className = 'attention-proj';
              proj.textContent = pName + ' · ' + shortSid;
              card.appendChild(proj);

              const m = document.createElement('div');
              m.className = 'attention-msg';
              m.textContent = a.msg || '';
              card.appendChild(m);

              card.addEventListener('click', function () {
                const currentData = findAgentById(a.id);
                const rName = findRoomNameForAgent(a.id);
                if (currentData) openDrawer(currentData, rName);
              });
              attentionDomCards.set(a.id, card);
              elAttentionList.appendChild(card);
            } else {
              // Update existing card in place
              card.setAttribute('aria-label', 'Open ' + hostLabel(a.host) + ' in ' + pName + ' (' + shortSid + ')');
              const h = card.querySelector('.attention-host');
              if (h) h.textContent = hostLabel(a.host);
              const st = card.querySelector('.attention-state');
              if (st) st.textContent = a.state === 'needs_input' ? 'NEEDS YOU' : a.state.toUpperCase();
              const proj = card.querySelector('.attention-proj');
              if (proj) proj.textContent = pName + ' · ' + shortSid;
              const m = card.querySelector('.attention-msg');
              if (m) m.textContent = a.msg || '';
              if (!elAttentionList.contains(card)) {
                elAttentionList.appendChild(card);
              }
            }
          }

          // Remove evicted attention cards
          attentionDomCards.forEach(function (card, id) {
            if (!currentAttentionIds.has(id)) {
              card.remove();
              attentionDomCards.delete(id);
            }
          });
        }
      }

      // 3. Manifest Table (Below World) - Keyed in-place update (filtered counts + rows)
      let manifestWorking = 0;
      let manifestNeeds = 0;
      let manifestDone = 0;
      for (let ci = 0; ci < visibleAgents.length; ci++) {
        const cs = visibleAgents[ci].state;
        if (cs === 'running' || cs === 'thinking') manifestWorking++;
        else if (cs === 'needs_input') manifestNeeds++;
        else if (cs === 'done') manifestDone++;
      }
      if (elManifestWorking) elManifestWorking.textContent = manifestWorking;
      if (elManifestNeeds) elManifestNeeds.textContent = manifestNeeds;
      if (elManifestDone) elManifestDone.textContent = manifestDone;

      if (elManifestBody) {
        if (visibleAgents.length === 0) {
          const manifestKind = allAgents.length > 0 ? 'no-match' : 'no-live';
          const manifestText = manifestKind === 'no-match'
            ? 'No agents match these filters. Use Show all to restore the floor.'
            : 'No agents currently visible on the floor.';
          const existingEmpty = elManifestBody.querySelector('.manifest-empty');
          if (!existingEmpty || existingEmpty.textContent !== manifestText) {
            elManifestBody.innerHTML = '<tr class="manifest-empty"><td colspan="5" style="text-align:center; padding: 14px; color: var(--dim);">' +
              manifestText +
              '</td></tr>';
          }
          manifestDomRows.clear();
        } else {
          // Remove empty indicator if present
          const emptyRow = elManifestBody.querySelector('.manifest-empty');
          if (emptyRow) emptyRow.remove();

          const currentManifestIds = new Set();
          for (let i = 0; i < visibleAgents.length; i++) {
            const a = visibleAgents[i];
            currentManifestIds.add(a.id);
            const pName = findRoomNameForAgent(a.id);
            const shortSid = String(a.sid || '').replace(/^(?:worker-)/, '').slice(0, 8);
            let tr = manifestDomRows.get(a.id);

            if (!tr) {
              tr = document.createElement('tr');
              tr.className = 'manifest-row';
              tr.dataset.agentId = a.id;

              const tdHost = document.createElement('td');
              tdHost.className = 'td-host';
              tdHost.innerHTML = '<b>' + escapeHtml(hostLabel(a.host)) + '</b>' + (a.worker ? ' <span class="worker-pill">worker</span>' : '');

              const tdId = document.createElement('td');
              tdId.className = 'td-sid';
              tdId.textContent = shortSid;

              const tdProj = document.createElement('td');
              tdProj.className = 'td-proj';
              tdProj.textContent = pName;

              const tdState = document.createElement('td');
              tdState.className = 'td-state';
              tdState.innerHTML = '<span class="state-badge ' + escapeHtml(a.state) + '">' + escapeHtml(LABEL_MAP[a.state] || a.state) + '</span>';

              const tdAction = document.createElement('td');
              tdAction.className = 'td-action';
              const btn = document.createElement('button');
              btn.className = 'btn-manifest-view';
              btn.textContent = 'View';
              btn.dataset.agentId = a.id;
              btn.setAttribute('aria-label', 'View ' + hostLabel(a.host) + ' in ' + pName + ' (' + shortSid + ')');
              btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const currentData = findAgentById(a.id);
                if (currentData) openDrawer(currentData, pName);
              });
              tdAction.appendChild(btn);

              tr.appendChild(tdHost);
              tr.appendChild(tdId);
              tr.appendChild(tdProj);
              tr.appendChild(tdState);
              tr.appendChild(tdAction);

              tr.addEventListener('click', function () {
                const currentData = findAgentById(a.id);
                if (currentData) openDrawer(currentData, pName);
              });
              manifestDomRows.set(a.id, tr);
              elManifestBody.appendChild(tr);
            } else {
              // Update existing row in place
              const tdHost = tr.querySelector('.td-host');
              if (tdHost) tdHost.innerHTML = '<b>' + escapeHtml(hostLabel(a.host)) + '</b>' + (a.worker ? ' <span class="worker-pill">worker</span>' : '');
              const tdId = tr.querySelector('.td-sid');
              if (tdId) tdId.textContent = shortSid;
              const tdProj = tr.querySelector('.td-proj');
              if (tdProj) tdProj.textContent = pName;
              const tdState = tr.querySelector('.td-state');
              if (tdState) tdState.innerHTML = '<span class="state-badge ' + escapeHtml(a.state) + '">' + escapeHtml(LABEL_MAP[a.state] || a.state) + '</span>';
              const btn = tr.querySelector('.btn-manifest-view');
              if (btn) btn.setAttribute('aria-label', 'View ' + hostLabel(a.host) + ' in ' + pName + ' (' + shortSid + ')');

              if (!elManifestBody.contains(tr)) {
                elManifestBody.appendChild(tr);
              }
            }
          }

          // Remove evicted rows
          manifestDomRows.forEach(function (tr, id) {
            if (!currentManifestIds.has(id)) {
              tr.remove();
              manifestDomRows.delete(id);
            }
          });
        }
      }

      // Restore focus to attention card or manifest button if focused before update
      if (activeEl && activeEl.dataset && activeEl.dataset.agentId) {
        const id = activeEl.dataset.agentId;
        if (activeEl.classList.contains('attention-card')) {
          const card = attentionDomCards.get(id);
          if (card && document.activeElement !== card && typeof card.focus === 'function') {
            card.focus({ preventScroll: true });
          }
        } else if (activeEl.classList.contains('btn-manifest-view')) {
          const tr = manifestDomRows.get(id);
          const btn = tr ? tr.querySelector('.btn-manifest-view') : null;
          if (btn && document.activeElement !== btn && typeof btn.focus === 'function') {
            btn.focus({ preventScroll: true });
          }
        }
      }

      // Check drawer state sync on poll (drawer keeps referring to real latest state;
      // filtering an agent out does not close its open drawer)
      if (currentDrawerSid) {
        const updatedAgent = findAgentById(currentDrawerSid);
        if (updatedAgent) {
          currentDrawerAgent = updatedAgent;
          if (updatedAgent.reach !== 'tmux' || !['idle', 'done'].includes(updatedAgent.state)) {
            currentDrawerReach = 'none';
          }
          updateSendAvailability();
        } else {
          // Session ended or vanished from snapshot
          currentDrawerAgent = null;
          currentDrawerReach = 'none';
          if (elDReach) {
            elDReach.textContent = 'session ended';
            elDReach.className = 'reach none';
          }
          updateSendAvailability();
        }
      }
    }

    // ── Live Polling Loop ──
    let tickPromise = null;
    function tick() {
      if (tickPromise) return tickPromise;
      const myGen = pollGeneration;
      tickPromise = Promise.resolve().then(async function () {
        try {
          const state = await jsonFetch('state.json');
          if (myGen !== pollGeneration) return;

          isConnected = true;
          latestLiveState = state;

          // Full unfiltered snapshot observed by FloorAudio on successful live polls only.
          // Filter toggles never trigger/silence/duplicate events.
          const allLiveAgents = collectAllAgents(state.rooms || []);
          if (audioInstance) {
            const soundItems = allLiveAgents.map(function (a) {
              return { id: a.id, state: a.state, voice: voiceForAgent(a) };
            });
            audioInstance.observe(soundItems);
          }

          if (elStatusBadge) {
            elStatusBadge.className = 'status-badge live';
            elStatusBadge.textContent = 'Live Floor';
          }

          updateView();
        } catch (err) {
          if (myGen === pollGeneration) {
            isConnected = false;
            if (elStatusBadge) {
              elStatusBadge.className = 'status-badge offline';
              elStatusBadge.textContent = 'Disconnected';
            }
            // Clear audio baseline so first recovery snapshot is silent
            if (audioInstance) audioInstance.reset();
            currentDrawerReach = 'none';
            updateSendAvailability();
          }
        } finally {
          tickPromise = null;
        }
      });
      return tickPromise;
    }

    // ── Send Availability Calculation ──
    function canSendToCurrent() {
      if (!isConnected || !currentDrawerSid) return false;
      const latest = findAgentById(currentDrawerSid);
      if (!latest || latest.worker) return false;
      if (latest.reach !== 'tmux' || currentDrawerReach !== 'tmux') return false;
      if (latest.state !== 'idle' && latest.state !== 'done') return false;
      return true;
    }

    function updateSendAvailability() {
      const allowed = canSendToCurrent();

      if (!currentDrawerAgent) {
        if (elDBtn) elDBtn.disabled = true;
        if (elDInput) elDInput.disabled = true;
        return;
      }

      if (elDReach) {
        elDReach.textContent = allowed ? 'ready to prompt' : (currentDrawerReach === 'tmux' ? 'view-only (busy)' : 'view-only');
        elDReach.className = 'reach' + (allowed ? '' : ' none');
      }

      if (elDBtn) elDBtn.disabled = !allowed || isSending;
      if (elDInput) elDInput.disabled = !allowed || isSending;
      if (elDBtn) elDBtn.textContent = isSending ? 'Sending…' : 'Send';
    }

    // ── Drawer & Transcript Management ──
    let transcriptAbortController = null;

    async function refreshTranscript(isInitial) {
      if (!currentDrawerSid || !currentDrawerAgent || transcriptActive) return;
      const targetId = currentDrawerSid;
      const myTransGen = transcriptGeneration;
      transcriptActive = true;

      try {
        const signal = transcriptAbortController ? transcriptAbortController.signal : null;
        // Critical: pass composite agent.id (host:sid) so server disambiguates identical sids
        const res = await jsonFetch('transcript?sid=' + encodeURIComponent(targetId), { signal: signal });
        if (myTransGen !== transcriptGeneration || currentDrawerSid !== targetId) return;

        // Reach confirmed by transcript endpoint
        const latest = findAgentById(targetId);
        currentDrawerReach = res.reach === 'tmux' && latest && latest.reach === 'tmux' &&
          ['idle', 'done'].includes(latest.state) ? 'tmux' : 'none';
        updateSendAvailability();

        if (!isSending && elDNote) {
          elDNote.textContent = res.detail || (currentDrawerReach === 'tmux' ? 'Send a prompt into tmux.' : 'View-only: terminal input unavailable.');
          elDNote.className = '';
        }

        renderTranscriptMessages(res.messages || [], isInitial);
      } catch (err) {
        if (myTransGen !== transcriptGeneration || currentDrawerSid !== targetId) return;
        currentDrawerReach = 'none';
        updateSendAvailability();
        if (elDReach) {
          elDReach.textContent = 'unavailable';
          elDReach.className = 'reach none';
        }
        if (elDNote) {
          elDNote.textContent = err.message || 'Transcript unavailable.';
          elDNote.className = 'err';
        }
      } finally {
        if (myTransGen === transcriptGeneration) {
          transcriptActive = false;
        }
      }
    }

    function renderTranscriptMessages(messages, isInitial) {
      if (!elDLog) return;
      const atBottom = elDLog.scrollHeight - elDLog.scrollTop - elDLog.clientHeight < 50;

      if (!messages || messages.length === 0) {
        elDLog.innerHTML = '<div class="m assistant">No public conversation recorded yet.</div>';
        return;
      }

      let html = '';
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const isUser = m.role === 'user';
        html += '<div class="m ' + (isUser ? 'user' : 'assistant') + '">';
        html += escapeHtml(m.text || '');
        if (Array.isArray(m.tools) && m.tools.length > 0) {
          html += '<div class="tools">';
          for (let t = 0; t < m.tools.length; t++) {
            html += '<span class="m-tool-tag">' + escapeHtml(m.tools[t]) + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      }

      if (elDLog.innerHTML !== html) {
        elDLog.innerHTML = html;
      }
      if (isInitial || atBottom) {
        elDLog.scrollTop = elDLog.scrollHeight;
      }
    }

    function openDrawer(agent, roomName) {
      if (!agent) return;
      transcriptGeneration++;

      if (transcriptAbortController) {
        try { transcriptAbortController.abort(); } catch (_) {}
      }
      transcriptAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      transcriptActive = false;

      // Save draft of previous drawer if open
      if (currentDrawerSid && elDInput) {
        drafts.set(currentDrawerSid, elDInput.value);
      }

      // Record trigger element for focus restoration on close
      lastActiveTriggerId = agent.id;

      currentDrawerSid = agent.id;
      currentDrawerAgent = agent;
      currentDrawerReach = 'none'; // Set none until confirmed by transcript response!

      if (elDTitle) {
        elDTitle.textContent = roomName + ' · ' + hostLabel(agent.host) + ' (' + String(agent.sid || '').replace(/^(?:worker-)/, '').slice(0, 8) + ')';
      }

      if (elDInput) {
        elDInput.value = drafts.get(agent.id) || '';
      }

      if (elDrawer) elDrawer.classList.add('open');
      if (elBackdrop) elBackdrop.classList.add('open');

      // Set inert on background elements for modal focus trap
      const appHeader = document.querySelector('.app-header') || document.querySelector('header');
      const appMain = document.querySelector('.world-viewport') || document.querySelector('main') || $('workstations-container');
      if (appHeader && typeof appHeader.setAttribute === 'function') appHeader.setAttribute('inert', '');
      if (appMain && typeof appMain.setAttribute === 'function') appMain.setAttribute('inert', '');

      // Highlight selected actor in scene
      actorDomNodes.forEach(function (node, id) {
        node.root.classList.toggle('selected', id === agent.id);
      });

      if (elDLog) elDLog.innerHTML = '<div class="m assistant">Loading conversation…</div>';
      if (elDNote) elDNote.textContent = '';

      updateSendAvailability();
      refreshTranscript(true);

      clearInterval(drawerPollTimer);
      drawerPollTimer = setInterval(function () {
        refreshTranscript(false);
      }, 2500);

      if (elDClose) elDClose.focus();
    }

    function closeDrawer() {
      transcriptGeneration++;
      if (transcriptAbortController) transcriptAbortController.abort();
      transcriptAbortController = null;
      transcriptActive = false;
      if (currentDrawerSid && elDInput) {
        drafts.set(currentDrawerSid, elDInput.value);
      }
      currentDrawerSid = null;
      currentDrawerAgent = null;
      currentDrawerReach = 'none';
      clearInterval(drawerPollTimer);

      if (elDrawer) elDrawer.classList.remove('open');
      if (elBackdrop) elBackdrop.classList.remove('open');

      const appHeader = document.querySelector('.app-header') || document.querySelector('header');
      const appMain = document.querySelector('.world-viewport') || document.querySelector('main') || $('workstations-container');
      if (appHeader && typeof appHeader.removeAttribute === 'function') appHeader.removeAttribute('inert');
      if (appMain && typeof appMain.removeAttribute === 'function') appMain.removeAttribute('inert');

      // Remove selected highlight
      actorDomNodes.forEach(function (node) {
        node.root.classList.remove('selected');
      });

      // Restore focus to the trigger element by stable ID
      if (lastActiveTriggerId) {
        const actor = actorDomNodes.get(lastActiveTriggerId);
        if (actor && actor.root && typeof actor.root.focus === 'function') {
          actor.root.focus({ preventScroll: true });
        }
        lastActiveTriggerId = null;
      }
    }

    // Play Cue button in drawer (explicit user action allows audio sample)
    if (elDPlayCue) {
      elDPlayCue.addEventListener('click', async function () {
        if (!currentDrawerAgent) return;
        const targetAgent = currentDrawerAgent;
        const voice = voiceForAgent(targetAgent);
        const cueState = targetAgent.state === 'needs_input' ? 'needs_input' : (targetAgent.state === 'failed' ? 'failed' : 'done');

        if (!audioEnabled) {
          const ok = await enableAudio();
          if (!ok) return;
        }
        if (audioInstance && targetAgent) {
          audioInstance.sample(voice, cueState);
        }
      });
    }

    // ── Send Prompt with Strict Guards & Pre-await Capture ──
    async function sendPrompt() {
      // Capture targetId and text BEFORE any await
      const targetId = currentDrawerSid;
      if (!targetId || !currentDrawerAgent || !elDInput || isSending) return;
      const text = elDInput.value.trim();
      if (!text) return;

      // Explicit canSend check
      if (!canSendToCurrent()) return;

      isSending = true;
      updateSendAvailability();
      if (elDNote) {
        elDNote.textContent = 'Sending prompt into session…';
        elDNote.className = '';
      }

      try {
        // Critical: pass composite agent.id (targetId) to /send endpoint
        const body = {
          sid: targetId,
          text: text,
          token: token
        };
        const result = await jsonFetch('send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        // If drawer switched or closed during await, do NOT clear another drawer's input!
        if (result.ok) {
          drafts.delete(targetId);
          if (currentDrawerSid === targetId) {
            if (elDInput.value.trim() === text) elDInput.value = '';
            if (elDNote) elDNote.textContent = 'Prompt delivered. Awaiting response.';
            setTimeout(function () { refreshTranscript(false); }, 500);
          }
        } else {
          if (currentDrawerSid === targetId) {
            currentDrawerReach = 'none';
            if (elDNote) {
              elDNote.textContent = result.detail || 'Could not deliver prompt.';
              elDNote.className = 'err';
            }
          }
        }
      } catch (err) {
        // Restore original ambiguous delivery warning
        if (currentDrawerSid === targetId) {
          currentDrawerReach = 'none';
          if (elDNote) {
            elDNote.textContent = 'Delivery could not be confirmed. Check the session before retrying. ' + err.message;
            elDNote.className = 'err';
          }
        }
      } finally {
        isSending = false;
        updateSendAvailability();
      }
    }

    if (elDClose) elDClose.addEventListener('click', closeDrawer);
    if (elBackdrop) elBackdrop.addEventListener('click', closeDrawer);
    if (elDBtn) elDBtn.addEventListener('click', sendPrompt);
    if (elDInput) {
      elDInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendPrompt();
        }
      });
    }

    // ── Dialog Focus Trap & Escape Handler ──
    function isElementVisible(el) {
      if (!el) return false;
      let curr = el;
      while (curr && curr !== elDrawer && curr !== document.body) {
        if (curr.style && curr.style.display === 'none') return false;
        if (curr.classList && curr.classList.contains('hidden')) return false;
        curr = curr.parentElement;
      }
      return true;
    }

    document.addEventListener('keydown', function (e) {
      if (!currentDrawerSid) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key === 'Tab' && elDrawer && elDrawer.classList.contains('open')) {
        const rawFocusable = elDrawer.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
        const focusableElements = Array.prototype.filter.call(rawFocusable, isElementVisible);
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    });

    // Live-only board: an old ?demo=1 URL still polls/renders real live state.
    tick();
    const pollTimer = setInterval(tick, 2000);

    return {
      tick: tick,
      updateView: updateView,
      openDrawer: openDrawer,
      closeDrawer: closeDrawer,
      sendPrompt: sendPrompt,
      getCurrentDrawerSid: function () { return currentDrawerSid; },
      getLiveState: function () { return latestLiveState; },
      getSelectedProject: function () { return selectedProject; },
      getSelectedProjectLabel: function () { return selectedProjectLabel; },
      setSelectedProject: function (p) {
        selectedProject = p;
        if (p === 'ALL') selectedProjectLabel = null;
        updateView();
      },
      getSelectedGroups: function () { return new Set(selectedGroups); },
      setSelectedGroups: function (groups) { selectedGroups = normalizeSelectedGroups(groups); updateView(); },
      setStatusGroupVisible: setStatusGroupVisible,
      showAllFilters: showAllFilters,
      destroy: function () {
        stopMovementLoop();
        clearInterval(drawerPollTimer);
        clearInterval(pollTimer);
        clearInterval(clockTimer);
      }
    };
  }

  return {
    skinFor: skinFor,
    hostLabel: hostLabel,
    animClassFor: animClassFor,
    formatAge: formatAge,
    escapeHtml: escapeHtml,
    voiceForAgent: voiceForAgent,
    statusGroupFor: statusGroupFor,
    STATUS_GROUPS: STATUS_GROUPS.slice(),
    recalculateCounts: recalculateCounts,
    filterRooms: filterRooms,
    formatRoomOptionLabels: formatRoomOptionLabels,
    collectAllAgents: collectAllAgents,
    init: initBrowser
  };
});
