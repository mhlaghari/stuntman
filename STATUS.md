# STATUS

_The board — a **living doc**. Where the project stands right now; refresh it
every session._

## Built

**v0.8.1** — six commands (each a skill + a `bin/` helper where needed), plus a
living-document system and an enforcement hook:

- **`/delegate`** (`skills/delegate`, `bin/stunt`) — plan with Claude, execute
  with a cheap worker (Claude-via-proxy or `opencode`), review with Claude.
- **`/relay`** (`skills/relay`, `bin/window`) — read the 5-hour usage window via
  a zero-token OAuth probe and span the rate-limit gap.
- **`/scaffold`** (`skills/scaffold`, `bin/scaffold`) — stand up the project-memory
  system: the `CLAUDE.md` contract + four living docs — `HANDOFF.md` (baton),
  `STATUS.md` (board), `SPEC.md` (contract), `STRATEGY.md` (honest why).
- **`/handoff`** (`skills/handoff`) — resume a scaffolded project by reading its
  living docs, then continue.
- **`/wiki`** (`skills/wiki`, `bin/wiki`) — scaffold an LLM-wiki "second brain" for
  a folder of projects (or a single project) in one shot: vault skeleton + a note
  per project from its README/code + a graphify knowledge graph + the graphify MCP
  wired for cross-project recall. Auto-detects single vs folder mode; idempotent.
- **`/launch`** (`skills/launch` — `SKILL.md` + `launch-workflow.js`) — product
  launch strategist. Fans out a multi-agent `Workflow` (cited competitor research →
  pricing + positioning + week-by-week playbook → adversarial feasibility/market
  critics → one compiled Product Success Overview, markdown + HTML). Fully
  `args`-parameterized so the one script serves any product. Born from a real
  Adversaria launch plan (~1.6M tokens, 20 agents); **validated end-to-end on a
  second product (MIQ-Agentic) — the smoke test caught + fixed an args-as-JSON-string bug (v0.8.1).**
- **Stop hook** (`hooks/handoff-guard.sh` + `hooks/hooks.json`) — in scaffolded
  projects only, nudges once if code changed but `HANDOFF.md`/`STATUS.md` didn't.
  Fails open; never touches non-scaffolded projects.

Docs: `README.md`, `docs/how-it-works.md`, landing page `docs/index.html`
(sections: how → results → relay → handoff → install). `install.sh` installs all
four skills + three `bin/` tools. Live on GitHub (`mhlaghari/stuntman`) + Pages.

## In progress

- **v2 = "Film Crew" — build started** (new repo `../film-crew/` with its own living docs; **scaffold +
  router v1 + SSE** shipped, router committed). A standalone multi-model agent crew
  (new repo; stuntman as a part): CEO = human → managers Opus[subscription] / DeepSeek Pro / GLM[API]
  → workers DeepSeek Flash[API] / Qwen[local]. Own two-bucket router (**no fcc dependency**); council
  debates a `spec.md` → CEO approves → workers build (visible) → elites verify + test. **Validated by a
  live bake-off** (`../film-crew-bench/RESULTS.md`): agentic harness beats one-shot truncation;
  verify→fix converges cheap workers; economics = free-gate-iterate + Opus-once, "pick the worker that
  lands close." Reuse `my-agents` (BYO-key server + SSE board). Next: scaffold the `film-crew` skeleton
  + SPEC, modeled on `addyosmani/agent-skills`. See HANDOFF "Next step".

## Planned

- `marketplace.json` description still only names the delegate value prop — add
  relay / scaffold / handoff.
- Exercise `/relay` through a real capped → reset cycle (never run live end-to-end).
- No tests / CI — a smoke test for `window` (parse), `scaffold` (idempotency),
  and `handoff-guard` (the five Stop-hook cases) would help.
- The Stop hook ships with the plugin route only; the `install.sh` route doesn't
  wire it into `~/.claude/settings.json` yet.

## Blockers

- _(none)_

## Last updated

2026-06-29 (later) — **Film Crew build started**: scaffolded the new repo (`../film-crew/`, own living docs) + router v1 (OpenAI-compatible roster routing; Opus via `claude` CLI / others API/local; commits `f803933`, `a468c0f`) + SSE streaming (uncommitted). Tested end-to-end.

2026-06-29 (late) — **bake-off validated v2 / Film Crew** (`../film-crew-bench/RESULTS.md`): one-shot truncates on cheap models; agentic harness + verify→fix fixes it (Flash converged, local 35B oscillated); all 3 coded real physics; economics = free-gate-iterate + Opus-once + "pick the worker that lands close." Design principles locked; ready to scaffold film-crew.
2026-06-29 — repo audit + **v2 pivot decision** (standalone multi-model agent crew; reuse `my-agents`; council + cheap/local worker team; drop fcc dependency). No code shipped — 3 questions open before building. Added `.gitignore` (`.claude/` was tripping the Stop hook).

2026-06-27 — **v0.8.1**: smoke-tested `/launch` end-to-end on a second product (MIQ-Agentic) — and it caught a real bug. The Workflow runtime delivers `args` to the script as a **JSON string**, so `args.competitors` was `undefined`, the script fell back to defaults, and the brief-less agents grounded on the ambient repo → it produced an *Adversaria* plan in the wrong folder. Fixed in `launch-workflow.js`: `JSON.parse` args + a fail-fast guard if the brief is empty. Re-ran clean: 20 agents, a correct MIQ-Agentic plan written to the MIQ repo. plugin.json 0.8.0→0.8.1.

2026-06-27 — **v0.8.0**: added `/launch` (product-launch strategist — multi-agent competitor research + pricing + launch playbook → Product Success Overview). New `skills/launch/` (SKILL.md + parameterized `launch-workflow.js`, syntax-checked); `install.sh` copies the dir (first skill with a sidecar file); README command table + new "From a blank page to a launch plan" section; landing-page `#commands` now six cards ("Six commands, one crew"); plugin.json 0.7.0→0.8.0 + keywords.
2026-06-27 — added a **Commands overview** (README table + landing-page `#commands` section); all five slash commands now listed at a glance.
2026-06-26 — **v0.7.0**: added `/wiki` (LLM-wiki second brain + graphify + MCP); scaffolder smoke-tested (single/folder/idempotent); README / how-it-works / install.sh updated. Landing-page card pending.
2026-06-19 — shipped the living-document system + Stop hook (v0.6.0).
