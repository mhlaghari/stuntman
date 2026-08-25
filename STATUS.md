# STATUS

_The board — a **living doc**. Where the project stands right now; refresh it
every session._

## Built

**v0.9.1** — six commands (each a skill + a `bin/` helper where needed), plus a
living-document system and an enforcement hook:

- **`/delegate`** (`skills/delegate`, `bin/stunt`) — plan with Claude, execute
  with a cheap worker (Claude-via-proxy, `opencode`, or `codex`), review with
  Claude. **v0.9.0:** added `codex` as a third backend (OpenAI's Codex CLI,
  no proxy, reuses the user's own `codex login`) — same plan/execute/review/
  iterate contract as the other two, smoke-tested live end-to-end.
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
  **v0.8.2:** vaults now scaffold with `.graphifyignore` (nav pages excluded from
  the graph — they god-node everything) + `wiki/log.md`, and notes follow OKF v0.1
  (`type:` + `description:` frontmatter) — lessons from the laghari-vault rebuild.
- **`/launch`** (`skills/launch` — `SKILL.md` + `launch-workflow.js`) — product
  launch strategist. Fans out a multi-agent `Workflow` (cited competitor research →
  pricing + positioning + week-by-week playbook → adversarial feasibility/market
  critics → one compiled Product Success Overview, markdown + HTML). Fully
  `args`-parameterized so the one script serves any product. Born from a real
  Adversaria launch plan (~1.6M tokens, 20 agents); **validated end-to-end on a
  second product (MIQ-Agentic) — the smoke test caught + fixed an args-as-JSON-string bug (v0.8.1).**
- **Stop hook** (`hooks/handoff-guard.sh` + `hooks/hooks.json`) — in scaffolded
  projects only, nudges once if code changed but `HANDOFF.md`/`STATUS.md` didn't.
  **v0.9.1:** also flags a matching vault project page more than 7 days behind
  the latest commit, including on clean trees, throttled to once per day.
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
  lands close." Reuse `my-agents` (BYO-key server + SSE board). Build is now well advanced — 4-skill
  orchestrator + web board + BYO-key + render-gate — and **this session the `claude -p` process leak was
  fixed** via a new `anthropic-oauth` provider (Opus → OAuth token → Anthropic API, no CLI / MCP spawns;
  committed in film-crew `e1b9e8c`). See `../film-crew/STATUS.md` for the live board.

## Planned

- **NEW build candidate — a `/launch`-adjacent ideation command** ("what should I make?"): propose
  buildable ideas grounded in the user's own projects (graphify vault / `my-agents` graph), each with a
  one-paragraph plan + an adversarial **"roast"** pass so only survivors surface. Bookends `/launch`
  (idea-in vs ship-out); reuses the proven multi-agent `Workflow`. Working name `/forge` / `/ideate`.
  Scope next session. _(6-vs-4 resolved → **keep all 6**; `SPEC.md` still says "four commands" — fix when touched.)_
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

2026-08-25 — **v0.9.1**: added the fail-open vault-staleness nudge to the Stop hook and `/handoff`
read-back; project pages over 7 days behind the latest commit now prompt a once-daily `/vault` refresh.

2026-08-11 — **v0.9.0**: `/delegate` gained a third backend, `codex` (OpenAI's Codex CLI). `bin/stunt`
now dispatches to `codex exec --json --skip-git-repo-check -s workspace-write` / `codex exec resume`,
normalizing its JSONL event stream (thread.started/item.completed/turn.completed) to the same
`{backend, session_id, result, is_error, usage, cost_usd}` shape as claude/opencode — `cost_usd` is
always `0` since Codex bills via flat ChatGPT/API subscription, not a metered rate. No isolated config
dir needed (unlike the `claude` backend's fcc-proxy identity): codex reuses the user's real `codex
login`. Smoke-tested live (not just syntax-checked) — exec wrote a file, resume with review feedback
correctly rewrote it, same session id both times. `skills/delegate/SKILL.md`, `README.md`,
`docs/how-it-works.md` updated to document the new route. plugin.json 0.8.2→0.9.0.

2026-07-03 — **v0.8.2**: `/wiki` graph-hygiene + OKF upgrade. `bin/wiki` scaffolds `.graphifyignore` (nav pages excluded from every graphify build — they god-node the graph into a hairball; lesson from the laghari-vault rebuild, Wiki Index alone had 52 edges) + `wiki/log.md` (OKF §7 history); embedded schema + SKILL.md now require OKF v0.1 frontmatter (`type:` + one-line `description:`) and kebab-case link targets (Title-Case links = ghost nodes). Smoke-tested (folder mode, idempotent). plugin.json 0.8.1→0.8.2.

2026-06-29 (night) — **Film Crew `claude -p` leak fixed** (new `anthropic-oauth` provider: Opus → OAuth token → Anthropic API, no CLI / MCP spawns; committed in film-crew `e1b9e8c`). **stuntman 6-vs-4 resolved → keep all 6.** New build candidate captured: a `/launch`-adjacent ideation/"roast" command (`/forge`). Session closed.

2026-06-29 (later) — **Film Crew build started**: scaffolded the new repo (`../film-crew/`, own living docs) + router v1 (OpenAI-compatible roster routing; Opus via `claude` CLI / others API/local; commits `f803933`, `a468c0f`) + SSE streaming (uncommitted). Tested end-to-end.

2026-06-29 (late) — **bake-off validated v2 / Film Crew** (`../film-crew-bench/RESULTS.md`): one-shot truncates on cheap models; agentic harness + verify→fix fixes it (Flash converged, local 35B oscillated); all 3 coded real physics; economics = free-gate-iterate + Opus-once + "pick the worker that lands close." Design principles locked; ready to scaffold film-crew.
2026-06-29 — repo audit + **v2 pivot decision** (standalone multi-model agent crew; reuse `my-agents`; council + cheap/local worker team; drop fcc dependency). No code shipped — 3 questions open before building. Added `.gitignore` (`.claude/` was tripping the Stop hook).

2026-06-27 — **v0.8.1**: smoke-tested `/launch` end-to-end on a second product (MIQ-Agentic) — and it caught a real bug. The Workflow runtime delivers `args` to the script as a **JSON string**, so `args.competitors` was `undefined`, the script fell back to defaults, and the brief-less agents grounded on the ambient repo → it produced an *Adversaria* plan in the wrong folder. Fixed in `launch-workflow.js`: `JSON.parse` args + a fail-fast guard if the brief is empty. Re-ran clean: 20 agents, a correct MIQ-Agentic plan written to the MIQ repo. plugin.json 0.8.0→0.8.1.

2026-06-27 — **v0.8.0**: added `/launch` (product-launch strategist — multi-agent competitor research + pricing + launch playbook → Product Success Overview). New `skills/launch/` (SKILL.md + parameterized `launch-workflow.js`, syntax-checked); `install.sh` copies the dir (first skill with a sidecar file); README command table + new "From a blank page to a launch plan" section; landing-page `#commands` now six cards ("Six commands, one crew"); plugin.json 0.7.0→0.8.0 + keywords.
2026-06-27 — added a **Commands overview** (README table + landing-page `#commands` section); all five slash commands now listed at a glance.
2026-06-26 — **v0.7.0**: added `/wiki` (LLM-wiki second brain + graphify + MCP); scaffolder smoke-tested (single/folder/idempotent); README / how-it-works / install.sh updated. Landing-page card pending.
2026-06-19 — shipped the living-document system + Stop hook (v0.6.0).
