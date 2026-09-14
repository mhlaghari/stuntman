# STATUS

_The board — a **living doc**. Where the project stands right now; refresh it
every session._

## Delivery — 2026-09-14

| Area | Status |
| --- | --- |
| Floor scene | Approved detailed Dubai skyline and project rooftop bays retained. |
| Branding and controls | One header logo, lagharilabs.com, and project/status filters with Show all and visible/total counts. Five expressive Vexel skins. |
| Animation/audio | Guitar, rock-sign headbanging, rage, jump/victory; opt-in voices and completion/help/failure cues. Demo world and pose previews removed. |
| Live interaction | Live-only polling; status filters compose with project selection across bays, manifest, and attention sidebar. Selection survives empty snapshots. Stable DOM/focus, drafts, cancellation, and guarded tmux sending retained. |
| Scaffold | Managed agent roster, Fable/GPT-Astra planner roles, bounded model discovery, preservation and idempotence tests. |
| Delegation policy | Role instructions shipped; automatic worker selection, retry/fallback policy, and recorded escalation remain planned. Latest discussion reaffirmed delegating implementation by default. |
| Wiki review | Agent-driven notes and semantic graph refresh documented; incorrect code-only update advice fixed. |
| OpenCode | Free Muse Spark 1.3 Contributor route used for implementation and review feedback through Stuntman. |
| Windows/router review | WSL remains unverified; native Windows unsupported end to end. OmniRoute investigated and documented, not installed. |
| Validation | 46 Python + 36 world + 26 audio checks pass (108 total); syntax/whitespace pass. Safari verified hide/restore, combined filters, Show all, and former demo URL rendering real agents. |
| Website/repo | Earlier visual delivery `1025c18` built on GitHub Pages. Follow-up docs describe live-only filtering and label the retained JPEG as an earlier staged preview. |
| Documentation delivery | Delegation policy and next steps committed and pushed as `16f32f1`; remote SHA verified. README screenshot and public image rechecked. |
| Personal vault | Stuntman page, index/hot/log, and graph-refresh lesson updated; Markdown-aware helper refreshed graph JSON/HTML/canvas. Existing scheduled graph job reports exit 78 and needs a separate repair. |

Recommended next: implement runtime delegation policy using the working direct
OpenCode route. Add the user's video when provided. WSL validation and an isolated
OmniRoute trial are optional future work. No further Floor redesign is queued. No plugin
reinstall or version bump is part of this source/site delivery.

Earlier post-push audit: no tracked changes remained. Three preserved, pre-existing
untracked duplicate files cause the Stop hook to repeat its memory warning after
commits; this does not indicate missing implementation or memory updates.

## Built

**v0.13.0 release baseline** — eight skills for Claude Code and Codex, shared helpers, project
memory, and a local agent board.

- **Codex compatibility:** native manifest and marketplace, CLI installation,
  eight host-aware skills, AGENTS.md memory, optional shared Stop hook,
  snapshot-only quota probe, and native launch phases.
- **`/floor`:** Claude/Codex session hooks plus Stuntman worker events, grouped
  by project with host labels and the expressive Vexel atlas. Transcript
  drawer, real child IDs, overlapping tool calls, concurrent log rotation,
  worker failure state, keyboard/mobile/reduced-motion support. Prompting
  requires an idle/done foreground TUI in tmux and verified process identity;
  other sessions are view-only. Origin/token/size checks protect local input.
- **Release-baseline validation (2026-09-05):** 31 offline tests, plugin/skill validators, and shell checks
  pass. Fresh Codex discovery finds eight enabled skills with no load errors.
  Browser checks pass at desktop, 390px, and 320px widths, including keyboard,
  drafts, failed sends, reduced motion, escaping, and empty/reconnect states.
  Live Codex hook delivery awaits the user’s hook trust in a new session.

- **`/usages`** (`skills/usages`, `bin/usages`) — **v0.12.0:** one board for
  every stunt double's usage + limits, all zero-token: Claude 5h/7d live (via
  `bin/window`), Codex 5h/weekly from its last session snapshot in
  `~/.codex/sessions/` (expired windows shown as ~0%), DeepSeek balance live
  (opencode's stored key), agy/muse honestly n/a (neither exposes usage
  locally — verified). `--json` and a cached `--statusline` mode (300s TTL,
  fails silent); the user's `~/.claude/statusline-command.sh` now appends the
  `🎬` worker segment.

- **`/delegate`** (`skills/delegate`, `bin/stunt`) — plan with Claude, execute
  with a cheap worker (Claude-via-proxy, `opencode`, `codex`, `agy`, or
  `muse`), review with Claude. **v0.9.0:** added `codex` as a third backend
  (OpenAI's Codex CLI, no proxy, reuses the user's own `codex login`) — same
  plan/execute/review/iterate contract as the other two, smoke-tested live
  end-to-end. **v0.10.0:** added `agy` (Google's Antigravity CLI) as a fourth
  backend — no proxy, reuses the user's Antigravity subscription; roster spans
  Gemini 3.x, Claude Sonnet/Opus 4.6, and GPT-OSS (`agy models`). Smoke-tested
  live end-to-end. **v0.11.0:** added `muse` (Meta's Muse Code CLI) as a fifth
  backend — no proxy, reuses the user's `muse login`; approval off, OS sandbox
  on; no usage data in its event stream (reports zeros). Smoke-tested live
  end-to-end. Grok + Kimi documented as opencode-backend routes (`xai/…` /
  `moonshotai/…` with a key) — no new code needed.
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

- **`/floor` follow-ups:** real son/daughter Vexel rigs (user drives likeness;
  same rig format as `laghari-vexel/assets/avatar-rig`); optional server auto-start.
- **NEW build candidate — a `/launch`-adjacent ideation command** ("what should I make?"): propose
  buildable ideas grounded in the user's own projects (graphify vault / `my-agents` graph), each with a
  one-paragraph plan + an adversarial **"roast"** pass so only survivors surface. Bookends `/launch`
  (idea-in vs ship-out); reuses the proven multi-agent `Workflow`. Working name `/forge` / `/ideate`.
  Scope next session.
- Exercise `/relay` through a real capped → reset cycle (never run live end-to-end).
- Add CI for the offline Python test suite.
- The Stop hook ships with the plugin route only; the `install.sh` route doesn't
  wire it into `~/.claude/settings.json` yet.

## Blockers

- _(none)_

## Last updated

2026-09-14 — Removed Demo World; added independent status visibility toggles and
Show all reset alongside project filtering. One OpenCode/Muse review round fixed
project retention during empty snapshots. Host verification: 108 checks and Safari
interaction review passed. Project docs and screenshot captions reflect the change.

2026-09-14 — Approved Floor, scaffold roster, runtime review, and screenshot
published to main and the existing website. Delivery validation: 94 checks pass.
Delegation-policy documentation subsequently pushed as `16f32f1`; automatic
runtime routing remains planned. Post-push memory audit corrected this older
uncommitted-status entry and recorded the duplicate-file hook warning.

2026-09-05 — Combined Codex host support and the completed floor draft in v0.13.0.


2026-08-31 (night, round 2) — **the floor became interactive**: 💬 last-words on every card, click →
conversation drawer (transcript tail), prompt box that types into tmux-hosted sessions for real
(verified live: board → send-keys → TUI → reply back in the drawer). Vexel expressive v2 atlas
dropped in (guitar/rock animations, same geometry). Non-tmux sessions = view-only, said honestly.

2026-08-31 (night) — **v0.13.0 (uncommitted): `/floor`, the eighth command** — the agent floor:
every Claude Code session on the machine as a live Laghari Vexel avatar (working / thinking /
waving-needs-you / done / silent), rooms per project, Task sub-agents as son/daughter placeholders.
Hooks wired machine-wide (`floor --wire-hooks`, settings.json backed up), zero-token, view-only by
design. Inherits Munder Difflin's event-plane ideology; avoids its non-commercial LimeZu assets by
using the user's own Vexel rig. Smoke-tested live with real hooks + Playwright-verified rendering.

2026-08-29 (night, later) — README "What's what" section added (the moving-parts cast table) —
delegated to Gemini via the agy backend as a live dogfood of `/delegate` (verbatim insertion,
15+/0−, verification passed, zero iterations).

2026-08-29 (night) — **README + website revamp for v0.12.0 reality.** README: intro/diagram/table/
"The trick" now tell the five-backend story (incl. the vendor-CLI convergence trick), install.sh copy
list corrected, and `/usages` got its own section (sample board + freshness story + statusline).
Website (`docs/index.html`): hero + meta description mention Codex/Antigravity/Muse, step chips list
all five doubles, commands section is now "Seven commands, one crew" with a `/usages` card, and the
`/delegate` card names all five backends. `marketplace.json` description now covers all seven commands
(closes the long-standing Planned item).

2026-08-29 (evening) — **v0.12.0**: added `/usages`, the seventh command — one zero-token board for
every stunt double's usage + limits. `bin/usages`: Claude live (reuses `bin/window`), Codex from the
newest `rate_limits` snapshot in `~/.codex/sessions/` (primary=5h, secondary=weekly, plan type; windows
whose reset passed since the snapshot report ~0%), DeepSeek balance live via opencode's stored key,
agy + muse honestly n/a (Antigravity keeps quota server-side — verified `quota_manager` logs but no
local persistence; Muse's event stream carries no usage). Modes: pretty board / `--json` /
`--statusline` (compact `CX 23%/5h 4%/wk · DS $0.89` segment, 300s cache at
`~/.stuntman/usages-cache.txt`, prints nothing on failure). Wired into the user's
`~/.claude/statusline-command.sh` (🎬 segment appended via printf args — worker %s are data, not
format; original backed up as `.bak-pre-stuntman`). New `skills/usages/SKILL.md`; install.sh copies
both; README command table row. plugin.json 0.11.0→0.12.0.

2026-08-29 (later) — **v0.11.0**: `/delegate` gained a fifth backend, `muse` (Meta's Muse Code CLI).
`bin/stunt` dispatches to `muse exec --json --approval-mode never` (exec) / the same plus
`--session-id <id>` (resume — plain `muse resume` is TUI-only), normalizing the JSONL event stream
(session id from `stream{kind:"session"}`, result + error from the `run.terminal.*` event) to the
shared shape. Muse emits no token usage → zeros; `cost_usd` 0 (flat Meta-account billing). Approval
off but muse's OS sandbox stays ON (codex-style profile); writes land in the cwd with no extra flag.
Smoke-tested live end-to-end through `bin/stunt` (exec wrote a file; resume applied review feedback in
the same session). Grok/Kimi: no dedicated CLIs installed — documented as opencode-backend routes
(`xai/…` / `moonshotai/…` after `opencode auth login`). SKILL.md / README (Route E + Grok-Kimi note +
FAQ) / how-it-works updated. plugin.json 0.10.0→0.11.0 + muse/meta/grok/kimi keywords.

2026-08-29 — **v0.10.0**: `/delegate` gained a fourth backend, `agy` (Google's Antigravity CLI).
`bin/stunt` dispatches to `agy -p … --output-format json --dangerously-skip-permissions --add-dir
"$PWD" --print-timeout 30m` (exec) / the same plus `--conversation <id>` (resume), normalizing agy's
single-line JSON (`conversation_id`/`response`/`status`; `output_tokens` already includes thinking) to
the shared `{backend, session_id, result, is_error, usage, cost_usd}` shape — `cost_usd` is always `0`
(flat Antigravity subscription, like codex). Two gotchas baked into the wrapper: `--add-dir "$PWD"` is
load-bearing (agy otherwise edits `~/.gemini/antigravity-cli/scratch`, not the project) and the default
5m print timeout is lifted to 30m. Smoke-tested live end-to-end through `bin/stunt` (exec wrote a file
with model pin `gemini-3.7-flash-high`; resume applied review feedback in the same conversation).
`skills/delegate/SKILL.md`, `README.md`, `docs/how-it-works.md` updated. plugin.json 0.9.1→0.10.0.

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
