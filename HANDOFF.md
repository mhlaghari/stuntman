# HANDOFF

## Current handoff — 2026-09-14

The user approved the Floor and authorized committing and pushing it, adding a
real screenshot to the repository and existing website, and completing the queued
Stuntman runtime review. This delivery uses `main` and the existing GitHub Pages
source `docs/`; it does not reinstall the plugin or create a separate hosted site.

**Delivery verified:** commit `1025c181ab63e6ab75ef41b5d71d5c6353c42a08`
is on `origin/main`. GitHub Pages reports that revision built successfully;
the public Floor section is present and its JPEG returns HTTP 200 with bytes
identical to the repository asset.

The delegation-policy documentation was subsequently committed and pushed as
`16f32f1`; its remote SHA was verified. README embeds the tracked screenshot,
and the live website's JPEG still matches the repository asset byte-for-byte.

### What changed

- **Latest direction:** the user reaffirmed that Fable and Astra should plan,
  write specifications, and review, with implementation delegated by default and
  lead-model implementation reserved for exceptionally hard work. The recommended
  next step is runtime worker selection, bounded retries, approved fallbacks, and
  recorded escalation reasons. This discussion changed documentation only;
  automatic routing/enforcement is not implemented and OmniRoute is not installed.
- **Approved Floor:** detailed Dubai skyscraper panorama and project rooftop bays,
  one supplied Laghari Labs lightning logo, **lagharilabs.com**, and project/demo
  controls in the header. Keep this composition; the tall project-building
  experiment was rejected. Five exact expressive Vexel atlases are retained.
- Working agents riff on guitar; thinking/needs-input agents headbang with rock
  horns; failures rage; completion starts with a guitar jump, then victory, then
  idle. No continuous running. Demo drawers include eight-second pose previews.
- Audio remains opt-in with five voices and separate done/help/failure cues.
  Initial/reconnect snapshots are silent. Pause/reduced-motion, stable keyed DOM,
  focus/drafts, transcript cancellation, and guarded tmux prompting are retained.
- **Screenshot:** `docs/assets/floor-demo.jpg` is an actual Safari capture of the
  approved public demo, linked from README and a new Floor showcase on the site.
  It contains simulated projects only. The user plans to supply a video later.
- **Scaffold:** `bin/stuntman_roster.py` adds a managed inventory block to selected
  `CLAUDE.md` / `AGENTS.md`. Fable and GPT/Astra are preferred spec writers/reviewers;
  other models execute. CLI presence and bounded catalogs are snapshots, not
  authentication/price guarantees. Reruns replace only their own valid block,
  preserve user text byte-for-byte, and skip malformed markers with a warning.
  The legacy installer includes the new helper. No model inference in discovery.
- **Wiki:** corrected generated and skill instructions: Graphify 0.5.0's
  `graphify update` rebuilds code, not Markdown semantics. Agents maintain notes;
  `/wiki` rebuilds their graph; the Stop hook only nudges. The post-delivery hook
  then requested a personal-vault sync: its Stuntman page, index, hot cache, log,
  and existing graph-refresh lesson were updated. The vault's own Markdown-aware
  helper refreshed graph JSON, HTML, and canvas. Restart the graph MCP/new session
  after a rebuild; the current connection was not claimed to reload automatically.
- **Runtime review:** `docs/runtime-review.md` records verified direct OpenCode
  delegation, the Windows/WSL support boundary, and cited research distinguishing
  OmniRoute from OmniRouter. Native Windows is not supported end to end; WSL is
  unverified. No router or account configuration was installed or changed.

### Review and verification

The Floor implementation was delegated to Antigravity `gemini-3.8-flash-high` and
Muse in the earlier visual pass, with host fixes after review. This runtime pass
used `opencode/muse-spark-1.3-contributor-free` for scaffold and site/wiki changes.
Host review corrected overbroad cache parsing and trailing-newline preservation
through same-session feedback. The source scaffold was also exercised against
real installed catalogs in a disposable project for both hosts.

- 46 Python tests and 48 JavaScript checks (22 world + 26 audio) pass.
- Shell syntax, whitespace, asset HTTP/MIME/body checks, and screenshot dimensions
  checked; the approved demo was inspected in Safari. No real prompts were sent
  from the Floor during verification. Site rendering and public deployment passed.
- Worker accounting is saved in `/tmp/stuntman-review-20260914/`; OpenCode reports
  usage and zero cost for the selected free route. Host usage is separate.

### Next step

Recommended next development task: specify and implement delegation policy in
Stuntman's execution path. Use one Fable/Astra lead per task, delegate routine
exploration/implementation/tests/docs, run deterministic checks before lead review,
and escalate with a recorded reason after bounded worker attempts. The scaffold
currently records instructions; it does not enforce automatic worker routing.
Start with the tested direct OpenCode route and evaluate a small backup pool;
current free availability/pricing must be checked, with no silent paid fallback.
OmniRoute remains an optional provider-failover layer to evaluate later.

Add the user's video to the existing Floor showcase when supplied. No redesign
is queued. Full WSL validation remains optional future work.
Child-specific Vexel rigs and optional server auto-start remain deferred.

The personal vault has separately configured four-hour graph refresh and nightly
03:30 ingest jobs. Read-only launchd inspection found the graph job's last exit
was 78 (EX_CONFIG); the ingest job's current record had zero runs. Manual graph
refresh passed. Repairing scheduled automation is a separate follow-up; no job,
privacy, power, or authentication settings were changed here.

Local Floor: `http://127.0.0.1:4517/?demo=1` (live: `/`). If stopped, run
`./bin/floor --no-open`. The installed plugin cache remains the earlier version;
this task publishes source/site changes, not a plugin reinstall.

Review artifacts: `/tmp/stuntman-review-20260914/`. Prior visual specs, worker
results, and rejected artwork: `/tmp/stuntman-floor-world/`. The repository assets
are authoritative; temporary artifacts may disappear. Preserve the pre-existing
untracked `bin/floor 2`, `bin/floor-hook 2`, and `skills/floor/SKILL 2.md`.
The post-push Stop-hook audit found no tracked changes. The hook inspects only
working-tree status, so these three pre-existing untracked files trigger its
missing-memory warning after memory updates are committed. Do not delete them
or create repeated documentation commits just to silence that warning.

## Previous handoff — 2026-09-05

The user authorized finishing `/floor` together with Codex compatibility and
committing the combined work. Version 0.13.0 brings all eight skills to Claude
Code and Codex. The original floor draft was incorporated from the main
checkout in the isolated `codex/compatibility` worktree.

- Codex manifest and marketplace, `install.sh --codex`, shared host setup,
  AGENTS.md scaffolding, local quota snapshots, and native launch phases.
- `/floor` retains the user's expressive Vexel atlas. Shared plugin hooks
  record Claude/Codex lifecycle events; the `stunt` wrapper emits worker
  start/finish/failure events without changing its stdout result contract.
- Sessions are keyed by host and ID, subagents by actual ID. Concurrent tool
  calls and locked log rotation are handled. Transcript reads omit reasoning,
  system content, and tool results. Monitoring makes no model calls.
- Prompting requires a ready live foreground TUI in tmux, checked by PID and
  process birth identity. Workers, approvals, busy/headless and non-tmux
  sessions are view-only. HTTP input validates host, origin, token, and size.
- The board supports keyboard navigation, reduced motion, mobile width,
  per-session drafts, stale-request protection, and reconnect states.
- All 31 offline tests pass, as do manifest/skill validators and shell checks.
  Fresh Codex app-server discovery returns all eight enabled skills, no load
  errors, and all required helpers/hooks/assets. Desktop and 390/320px browser
  checks cover keyboard controls, escaping, empty/reconnect states, reduced
  motion, per-session drafts, and failed sends; no JavaScript errors or
  horizontal overflow. No paid model calls were used for these checks.

The original floor draft is preserved in the named Git stash
`stuntman-floor-before-codex-integration-2026-09-05` when integrating main.
Keep that recovery copy until the user no longer needs it.

Start a new Codex thread after installing. The user reviews/trusts session
hooks through `/hooks`; installation does not bypass trust. `floor --wire-hooks
--host claude|codex|both` is for standalone installs, not an extra plugin step.

Prior floor work (Aug 30–31): local hook-fed Vexel board, transcript drawer,
and tmux prompting were implemented and exercised against live Claude Code.
The custom son/daughter rigs and floor auto-start remain optional follow-ups.
The earlier usage board still estimates expired windows as approximately zero;
Codex relay instead uses `codex-window`, which correctly treats expired data as
unknown current capacity.

## Earlier context

- **Prior (2026-08-29, later): added `muse` (Meta's Muse Code CLI) as a fifth `/delegate`
  backend + documented the Grok/Kimi route (v0.10.0 → v0.11.0, committed with authorization).**
  User asked to "add for opencode too, and grok, and kimi and muse". Findings: **opencode was already
  a backend** (Route B since the start); **grok/kimi have no CLIs installed on this machine**, but both
  are already reachable through the opencode backend (`xai/…` / `moonshotai/…` once a key is added via
  `opencode auth login`) — documented in README/SKILL rather than coded; **muse was installed and fully
  wireable**. `bin/stunt` gained a `muse` branch: exec = `muse exec --json --approval-mode never
  [--model id] "<spec>"`, resume = same + `--session-id <id>` (**plain `muse resume` is TUI-only** —
  headless continuation is exec with a reused session id, verified live: it recalled prior context and
  edited the same file). `normalize_muse()` reads the JSONL event stream: session id from any event's
  `stream{kind:"session"}.id`, result/error from the `run.terminal.*` event (`payload.text`,
  `payload.terminal != "completed"` → is_error). **Muse emits no token usage in exec events** — usage
  reports zeros and `cost_usd` 0 (flat Meta-account billing; `muse login`). Safety profile: approval
  off but **muse's OS sandbox stays ON** (its default; codex-workspace-write-style). Muse writes to the
  cwd correctly with no extra flag (unlike agy's `--add-dir`). Smoke-tested live end-to-end through
  `bin/stunt` (exec created a file; resume applied review feedback in the same session,
  `muse-spark-1.2-contributor` default model). Docs: SKILL.md, README (Route E + Grok/Kimi note under
  Route B + FAQ), how-it-works, plugin.json 0.11.0 + muse/meta/grok/kimi keywords. Also this session:
  the earlier agy work was committed + pushed (`9d97c40`), muse as `8f28ad2`, and the marketplace
  clone fast-forwarded to both. **Mystery solved:** the clone's repeated uncommitted `bin/stunt` drift
  was self-inflicted — `~/.local/bin/stunt` is a SYMLINK into the marketplace clone, so "syncing" via
  `cp` wrote through it into the clone's working tree (see Gotchas).

- **Prior (2026-08-29): added `agy` (Google Antigravity CLI) as a fourth `/delegate` backend
  (v0.9.1 → v0.10.0, NOT committed).** User has an Antigravity subscription and wanted its models usable
  from the same plan/execute/review loop. `bin/stunt` gained an `agy` branch: exec = `agy -p "<spec>"
  --output-format json --dangerously-skip-permissions --add-dir "$PWD" --print-timeout 30m [--model id]`,
  resume = same plus `--conversation <id>`; `normalize_agy()` parses the single JSON line
  (`conversation_id` → session_id, `response` → result, `status != "SUCCESS"` → is_error;
  `output_tokens` already includes thinking, `total = input + output`, so no summing). `cost_usd`
  hardcoded `0` (flat subscription billing, like codex). Two load-bearing discoveries: (1) **without
  `--add-dir "$PWD"` agy edits its own scratch workspace** (`~/.gemini/antigravity-cli/scratch`), not the
  project — the wrapper always passes it, and specs should use absolute paths; (2) **`--print-timeout`
  defaults to 5m**, too short for real tasks — the wrapper passes 30m. **Smoke-tested live end-to-end
  through `bin/stunt` itself**: exec created a file (model pin `gemini-3.7-flash-high` honored), resume
  with review feedback rewrote it in the same conversation. The agy roster (`agy models`) spans
  Gemini 3.x tiers, Claude Sonnet 4.6 / Opus 4.6, and GPT-OSS 120B — one subscription, three model
  families. Docs updated: `skills/delegate/SKILL.md` (description, backend list, preflight, notes),
  `README.md` (Route D + choosing section), `docs/how-it-works.md` (backend block),
  `.claude-plugin/plugin.json` (0.10.0 + antigravity/gemini keywords). Edits made in the
  **Documents working copy** (no EPERM this session — the old sandbox gotcha didn't bite); the
  marketplace clone at `~/.claude/plugins/marketplaces/stuntman` needs a pull after commit/push.

- **Prior (2026-08-25): added a vault-staleness nudge to project handoff.** Project pages in
  the cross-project vault could silently drift far behind shipped code, so `hooks/handoff-guard.sh`
  now checks the matching `wiki/projects/<project>.md` even on a clean tree and nudges when its
  `updated:` date trails the latest commit by more than 7 days, with a fail-open once-per-day marker.
  The hook still emits at most one Stop decision and combines this with its unchanged handoff-docs
  reminder when both apply. `/handoff` now checks the same freshness signal during read-back and
  suggests `/vault`. Files touched: `hooks/handoff-guard.sh`, `hooks/hooks.json`,
  `skills/handoff/SKILL.md`, `README.md`, `.claude-plugin/plugin.json` (v0.9.1), `HANDOFF.md`, and
  `STATUS.md`.

- **Prior (2026-08-11, night): added `codex` as a third `/delegate` backend (v0.8.2 → v0.9.0,
  NOT committed).** Context: user installed OpenAI's official `codex-plugin-cc` Claude Code plugin and
  asked to wire the same CLI into stuntman's existing plan/execute/review loop. `bin/stunt` now has a
  `codex_invoke`-equivalent branch (inline, matching the opencode pattern) calling `codex exec --json
  --skip-git-repo-check -s workspace-write` for the first call and `codex exec resume <thread_id> --json
  --skip-git-repo-check` for iteration, plus `normalize_codex()` parsing the JSONL event stream
  (`thread.started` → session id, `item.completed`/`agent_message` → result — **last** one, since codex
  emits a preamble message before doing work and a final summary after, unlike claude/opencode's
  single-shot result, `turn.completed.usage` → tokens). No `STUNTMAN_CONFIG_DIR`-style isolation: unlike
  the `claude` backend (which needs a fake identity for the fcc proxy), codex reuses the user's real
  `codex login` directly, so worker sessions land in the same `codex resume` history as the user's own —
  documented as an accepted tradeoff, not a bug. `cost_usd` is hardcoded to `0` (ChatGPT/API flat billing,
  no metered field in the event stream). **Smoke-tested live end-to-end** (not just syntax-checked):
  `exec` wrote a haiku to a file, `resume` with review feedback correctly rewrote it (5-7-5, ends in
  "cut") reusing the same `thread_id` — full plan→execute→review→iterate loop confirmed working with real
  file edits. Docs updated to match: `skills/delegate/SKILL.md` (preflight check, Notes section, backend
  list in frontmatter description), `README.md` (Route C install block, `STUNTMAN_WORKER=codex` example,
  two FAQ answers), `docs/how-it-works.md` (backend table). `plugin.json` → 0.9.0 + `codex`/`openai`
  keywords. **Not synced to the `Documents/MyProjects/stuntman` working copy** — that path returns EPERM
  under the current sandbox (see Gotchas); all edits happened directly in the plugin marketplace clone at
  `~/.claude/plugins/marketplaces/stuntman`, which `git remote -v` confirms tracks
  `github.com/mhlaghari/stuntman` directly, so this **is** the canonical repo, just accessed via its
  install path. Next: get explicit commit authorization from the user (CLAUDE.md: never commit without
  it), then push.

- **Prior (2026-07-03, midday): `/wiki` upgraded with the graph-hygiene + OKF lessons from the
  laghari-vault rebuild (NOT committed).** Context: the vault's graph was a hairball because nav pages
  (index/hot/MOC/Dashboard) god-noded everything (Wiki Index alone had 52 edges); fixing it also adopted
  Google's OKF v0.1 (`type:` + one-line `description:` in every note's frontmatter, `log.md` per §7).
  Changes: **`bin/wiki`** now scaffolds `$VAULT/.graphifyignore` (nav pages + `_TEMPLATE*` excluded from
  every graphify build — `detect()` honors it natively incl. `graphify update`) and `wiki/log.md`, and the
  embedded CLAUDE.md schema gained `description:` + OKF/link-hygiene rules (link kebab-case basenames, not
  Title Case — broken links = ghost nodes in Obsidian). **`skills/wiki/SKILL.md`**: step 3 requires
  type/description frontmatter; step 4 explains the .graphifyignore and says never graph nav pages.
  Smoke-tested on a scratch 2-project folder (folder mode detected, new files written, idempotent).
  Both copies synced: repo ↔ `~/.claude/plugins/marketplaces/stuntman/` (diff-verified identical).
  The user-level `/vault` command (`~/.claude/commands/vault.md` — NOT part of stuntman) was rewritten
  the same way: OKF conventions, people/meetings/ideas awareness, new `ingest` (Adversaria DB → raw →
  curated pages) and `lint` subcommands. ✅ Shipped as **v0.8.2** (`aada4d6`, pushed; marketplace clone
  fast-forwarded). **⚠️ Follow-up found 2026-07-04:** the `/wiki` maintenance loop still tells users
  `graphify update wiki` — but `graphify update` only re-extracts CODE files (silent no-op on md-only
  vaults; verified live). The laghari-vault now uses its own `scripts/refresh_graph.py` (mechanical
  wikilink/frontmatter re-extraction of changed pages) — port that into `bin/wiki`'s scaffold + fix the
  SKILL.md/CLAUDE.md maintenance advice in the next release (v0.8.3 candidate). Lesson note:
  `laghari-vault/wiki/lessons-learned/graphify-update-md-vaults.md`.

- **Prior (2026-06-29, night): fixed the Film Crew `claude -p` process leak + closed stuntman's
  scope question.** The code fix lives in `../film-crew/` (committed `e1b9e8c`): Opus now reaches the
  subscription via the **OAuth token → Anthropic API** (`anthropic-oauth` provider), not `claude -p` —
  no CLI, no MCP spawns, faster. Also fixed a latent missing-import crash (`homedir`/`execSync`).
  Smoke-tested: real reply, `$0`/subscription, **zero `claude -p` workers system-wide**. Full detail in
  `../film-crew/HANDOFF.md`. **Product calls made:** (1) **stuntman keeps all 6 commands** — `/wiki` +
  `/launch` stay (they're good); the 6-vs-4 question is closed at **6**. (2) Captured a new build
  candidate — a `/launch`-adjacent ideation command (see Next step).
- _(Older entries below are from prior sessions — the Film Crew scaffold + bake-off direction. The
  intervening build sessions are logged in `../film-crew/HANDOFF.md` + `STATUS.md`.)_
- **Scaffolded the `film-crew` repo + shipped the router — the v2 build began.** New sibling repo
  `../film-crew/` (with its own CLAUDE/HANDOFF/STATUS living docs): an `agent-skills`-style scaffold
  (commit `f803933`) + an OpenAI-compatible **router v1** that routes by roster role — Opus via the
  `claude` CLI (subscription), others API/local — with BYO-key + `<think>`-strip + strip-params-on-400
  (commit `a468c0f`), plus **SSE streaming** (token-streamed for HTTP backends; uncommitted). Both hard
  paths tested end-to-end (Opus-on-subscription + local Ollama). See `../film-crew/HANDOFF.md`.
- **Validated the v2 direction with a live bake-off** (`../film-crew-bench/`, full writeup in its
  `RESULTS.md`). Hard spec (a self-contained Milky Way HTML with real physics) run across **Opus**
  (subscription), **DeepSeek Flash** (fcc), **Qwen3.6-35B-coding** (local Ollama). Findings: (1)
  **one-shot truncates** on cheap models (output cap → blank files); the **agentic harness**
  (incremental file write) fixes it — all three then rendered error-free. (2) **verify→fix works**:
  Flash converged (broken→clean galaxy in 3 rounds); the local 35B oscillated + needed **error-driven**
  (not visual) feedback. (3) **All three coded REAL physics** (flat rotation curve + density-wave arms,
  not painted-and-spun). (4) **Economics:** delegate-then-Opus-fix is far cheaper *iff the worker lands
  close* — a correctness fix cost Opus ~1% of a build; making weak output *good* ≈ a rebuild.
- **Film Crew design principles locked from the bench:** free **deterministic gate** (render + console
  errors) for the worker's self-iteration ($0 — Opus never sees those rounds); **Opus enters once** for
  judgment + a surgical fix; **pick the cheapest worker that lands _close_**, not the cheapest; verify
  must actually render (never "tags present"); feedback style scales with worker tier (mechanical for
  weak, subjective for strong); own the cost accounting (provider rates, not stunt's Claude-priced est).
- **Session = repo audit + a v2 *direction* decision. No product code shipped.** Read the whole repo
  (6 skills, `bin/stunt` + `bin/window`, the Stop hook, packaging, all four living docs), fetched the
  real free-claude-code (fcc) docs, and mined the vault (`my-agents`, `multi-agent-debate`,
  `claude-code-local`, `local-vs-cloud-llm`, `trading-agents`).
- **Mismatches surfaced** (user's "things feel mismatched"): (1) **scope sprawl** — SPEC says a
  3-boundary / 4-command tool but the repo ships **6**; `/wiki` + `/launch` remove no boundary;
  (2) docs disagree on the count (`SPEC.md` still says "the four commands"); (3) the **fcc coupling
  is half-hearted + brittle** — hardcoded `freecc`/`8082`, `install.sh` says `fcc-config` (doesn't
  exist — it's `fcc-init`), and raw `STUNTMAN_MODEL` bypasses fcc's tier routing; (4) **core loop
  unproven** (`/relay` never run live; no tests).
- **Proposed pivot (deliberate, NOT yet locked):** stuntman v2 = a **standalone multi-model agent
  crew**, no fcc dependency. Own *simple* router with **two buckets** — *Elite* (Claude / DeepSeek
  v4 Pro / GLM 5.2 → spec + debate + verify) and *Coding* (Qwen-local / DeepSeek Flash → execute).
  An **elite council** debates a human-written `spec.md` into an approved plan + design system, then
  a **cheap/local worker team** executes it (visible, tmux-style) and the elites verify + test.
- **Reuse + risk from the vault:** fork **`my-agents`** (TS/React/Express/SSE) — it already has
  BYO-key localStorage config, a model picker, and a live SSE "agent board" (the watch-them-work UI).
  Load-bearing risk = **real tool execution by cheap/local workers** (`claude-code-local`: naive local
  setups *narrate* tool calls and run nothing). Fixes the vault already names: real `tool_use`
  (vllm-mlx), DeepSeek **prompt-based** fncall (not native), OpenAI-compatible endpoints,
  strip-unknown-body-params-on-400, strip `<think>` leakage.
- Added `.gitignore` (`.claude/`, `.stuntman/`): the untracked `.claude/` session dir was tripping
  the Stop hook every turn (false positive). **Commit `.gitignore`** to keep future bare sessions quiet.

### Earlier — v0.7.0–v0.8.1 (prior sessions)

- **v0.8.1 — smoke-tested `/launch` end-to-end and fixed a real bug it surfaced.** Ran `/launch` on a
  second product (MIQ-Agentic). The run produced an *Adversaria* plan written to the wrong folder →
  root cause: the **Workflow runtime hands `args` to the script as a JSON STRING, not an object**, so
  `args.competitors` / `args.productBrief` were `undefined`, everything fell to defaults, and the
  brief-less research agents grounded on the ambient repo. Confirmed with a zero-agent diagnostic
  (`typeof args === 'string'`, both inline and scriptPath). Fix: `launch-workflow.js` now `JSON.parse`s
  `args` into `ARGS` and **throws** if there's no brief/competitors (no more silent generic plans).
  Re-ran clean — 20 agents, a correct MIQ-Agentic plan (recommended the vertical audit/CCM beachhead,
  respected the build-auth-first timeline, caught MIQ-specific issues like the DeepSeek-on-single-H100
  contradiction) written to `MIQ-Agentic/LAUNCH_PLAN.md` + `launch-plan-miq-agentic.html`. plugin.json → 0.8.1.
- Added a **6th command, `/launch`** — a product-launch strategist. New dir `skills/launch/`:
  - `launch-workflow.js` — a parameterized multi-agent `Workflow`: Phase 1 fan-out cited
    competitor + market/tailwinds/channel research → Phase 2 parallel synthesis (assessment,
    pricing, launch playbook, positioning) → Phase 3 two adversarial critics (feasibility +
    market-reality) → Phase 4 compile one **Product Success Overview** (returns markdown, writes
    a styled HTML report). Fully `args`-driven (productBrief / launchBrief / differentiators /
    competitors / date / htmlOut) so the one script serves any product. Syntax-checked (ESM +
    top-level await). Born from a real Adversaria launch plan (20 agents, ~1.6M tokens).
  - `SKILL.md` — orchestrates: ground in the repo docs → ask the 4 GTM decisions
    (beachhead/monetization/timeline/resources via AskUserQuestion) → build an 8–12 competitor
    set → resolve the script path (plugin or install.sh route) → run `Workflow` → write
    `LAUNCH_PLAN.md` (unescape entities) + report the verdict, surfacing any recommended pivot.
- **v0.8.0**: `plugin.json` bumped + keywords (launch / go-to-market / competitive-research /
  product-strategy); `install.sh` now copies the whole `skills/launch/` dir (first skill with a
  sidecar file, not SKILL.md-only); `README.md` command table + new "From a blank page to a launch
  plan" section; landing page `#commands` → **six cards** ("Six commands, one crew").
- _Prior this session (v0.7.0):_ added `/wiki` (second-brain scaffolder + graphify + MCP) and the
  commands-overview table/landing section — see the v0.7.0 entry in `STATUS.md`.

## Earlier next steps (historical)

- **`/floor` follow-ups (v0.13.x):** (1) **real son/daughter Vexel rigs** — generate in the same
  format as `laghari-vexel/assets/avatar-rig` (the user drives likeness; board slots them in by
  swapping the `.kid` sprite classes); (2) **put the stunt doubles on the floor** — `bin/stunt`
  emits exec/resume/review events into the same log so `/delegate` workers appear as cast members;
  (3) landing page card ("Eight commands"); (4) auto-start `floor` server (launchd or on-demand from
  the statusline). Get **commit authorization** for v0.13.0 first.

- **The bake-off answered the open build questions** (see `../film-crew-bench/RESULTS.md`): worker =
  DeepSeek-Flash tier (lands close) + local via Ollama/MLX; harness must be **agentic** (incremental
  write) with a **real render gate**; Opus reviews **once**. Name = **Film Crew** (new repo; stuntman
  is a part), modeled on `addyosmani/agent-skills` layout (`crew/` personas + `skills/` workflows +
  bundled router/server + web board reused from `my-agents`).
- **Next concrete move:** scaffold the `film-crew` repo skeleton + its `SPEC.md`, encoding the locked
  principles above. Roles: CEO = human → managers = Opus (subscription, via local `claude` CLI) /
  DeepSeek v4 Pro / GLM 5.2 (API) → workers = DeepSeek Flash (API) / Qwen (local Ollama|MLX). Flow:
  human writes `spec.md` → council debates → CEO approves → workers build (visible) → elites verify+test.
- **6-vs-4 RESOLVED → keep all 6.** `/wiki` + `/launch` stay; stuntman spans **idea → build → ship**.
  (`SPEC.md` still says "four commands" — update it to 6 the next time it's touched.)
- **New build candidate (user idea, not yet scoped): a `/launch`-adjacent command at the IDEA end.**
  stuntman has build (`/delegate`, `/scaffold`, `/handoff`, `/relay`) and ship (`/launch`) but no
  "what should I make?" front door. Proposal: an **ideation strategist** — given a domain + the user's
  own projects (via the graphify vault / `my-agents` graph), propose buildable ideas, each with a
  one-paragraph plan, and run every idea through an adversarial **"roast"** pass so only ones that
  survive critique surface. It bookends `/launch` (idea-in vs ship-out) and reuses the proven
  multi-agent `Workflow` + vault recall. Working names: `/forge` / `/ideate`. The user floated "roast"
  and "a plan on what to make" — fold both in: roast = the critic stage; plan = the output. **Scope it
  next session; don't build yet.**

### Deferred — pre-pivot polish (only if v1 continues)

- **`/launch` is validated end-to-end** (smoke-tested on MIQ-Agentic, v0.8.1 — 20 agents, correct
  product, right repo). Remaining: run it once via the `install.sh` route (`~/.claude/skills/launch/`)
  to exercise the path-resolution branch, and from a true `/launch` slash invocation (this session
  drove the workflow directly via `scriptPath`, not the SKILL's resolver).
- (Polish only) the landing `#commands` section now lists all six; the `#handoff` 3-card grid is
  still scaffold/handoff-only — a dedicated `/wiki` or `/launch` story card is optional.
- Then the `STATUS.md` "Planned" list: marketplace.json copy, smoke-test CI, real `/relay` test.

## Gotchas

- **`/floor` wiring lives in `~/.claude/settings.json`, not the plugin's `hooks/hooks.json`** — it's
  machine-level (must fire in every project), and shipping it in the plugin too would double-log
  every event. `floor --wire-hooks` is the one sanctioned wiring path (idempotent, backs up).
  Sessions only emit after they (re)start — though PreToolUse hooks were observed hot-loading into
  the already-running session that did the wiring.
- **`~/.local/bin/floor` + `floor-hook` symlink to the WORKING COPY** (`Documents/MyProjects/stuntman/bin/`),
  unlike `stunt` which links to the marketplace clone — repoint after the v0.13.0 release lands there.
- **Chrome resolves `localhost` to `::1` but `bin/floor` binds `127.0.0.1`** — the board URL that
  always works in every browser is `http://127.0.0.1:4517/`. (The Claude-in-Chrome extension also
  couldn't screenshot it; Playwright could.)
- **The floor's prompt path only reaches tmux-hosted sessions.** The hook's parent process is the
  `claude` binary itself; `/send` walks it up to a `tmux` pane and send-keys into it. VS Code
  integrated terminals have no injection API — those sessions are view-only on the board (the
  drawer says so). The `/send` token is per-server-run; restarting `bin/floor` invalidates open
  tabs (reload the page).
- The Vexel atlas cell math is load-bearing in `board/index.html`: 192×208 cells, one animation row
  each — idle r0/7f, waving r3/4f, jumping r4/5f, failed r5/8f, waiting r6/6f, running r7/6f,
  review r8/6f. If the atlas is regenerated, re-derive from `validation-extended.json`.
- **`~/.local/bin/stunt` is a SYMLINK to `~/.claude/plugins/marketplaces/stuntman/bin/stunt`** (since
  2026-08-25). Never `cp` a new stunt onto it — that writes through the symlink into the marketplace
  clone's working tree, dirtying it and blocking `git pull --ff-only`. The correct "sync" is: commit +
  push from the working copy, then `git -C ~/.claude/plugins/marketplaces/stuntman pull --ff-only`
  (discard any byte-identical drift with `git checkout -- bin/stunt` first). The PATH copy updates
  automatically via the symlink.
- **`muse resume` is TUI-only** — headless continuation is `muse exec --session-id <uuid>`. Muse's
  exec event stream carries no token usage (usage reports zeros). Approval is disabled per-run
  (`--approval-mode never`) while muse's OS sandbox stays ON.
- **agy (Antigravity CLI) works in its own scratch workspace by default** —
  `~/.gemini/antigravity-cli/scratch` — unless `--add-dir "$PWD"` is passed. `bin/stunt` always passes
  it, but any manual `agy -p` invocation without it will "succeed" while writing files to the wrong
  place. Give agy specs absolute paths. Also: agy's `--print-timeout` defaults to **5m** (stunt passes
  30m), and its `output_tokens` already includes `thinking_tokens` (don't sum them — that double-counts).
- **`~/Documents/Documents/MyProjects/stuntman` (the "real" working-copy path) returns `EPERM` under the
  current agent sandbox** — both Read and Bash. The plugin marketplace clone at
  `~/.claude/plugins/marketplaces/stuntman` is a full, clean, up-to-date checkout of the same
  `github.com/mhlaghari/stuntman` origin (verified via `git remote -v` + `git status`), so it's a safe
  stand-in — commits/pushes from there land in the same repo. If a future session needs the Documents
  path specifically, that's a macOS sandbox/TCC permission grant, not something fixable in-session.
- `codex exec resume` does **not** accept `-s`/`--sandbox` (errors: "unexpected argument") — the resumed
  thread inherits whatever sandbox mode the initial `exec` started with. Only pass `-s workspace-write` on
  the first call.
- Both `codex exec` and `codex exec resume` need `--skip-git-repo-check` outside a trusted git directory,
  or they refuse to run ("Not inside a trusted directory").
- The Stop hook (`hooks/handoff-guard.sh`) counts **any** untracked/modified non-doc path as "work"
  — incl. `.claude/`. So a dirty tree with no HANDOFF/STATUS edit nags on every stop. `.gitignore` now
  covers `.claude/` + `.stuntman/`; touching HANDOFF/STATUS also silences it.
- The Stop hook must respect `stop_hook_active` (no loops) and **fail open**; it
  only acts when `HANDOFF.md` exists (scaffolded). It detects "code changed but
  docs not touched" via `git status --porcelain` — once HANDOFF/STATUS show as
  modified it goes quiet, so it nudges roughly once per work burst, not per turn.
- Plugin hooks **auto-load from `hooks/hooks.json`** (no `plugin.json` pointer
  needed; mirrors everything-claude-code). Command uses `${CLAUDE_PLUGIN_ROOT}`.
- `bin/scaffold` writes docs via a `make` helper + quoted heredocs (backticks safe).
- GateGuard (everything-claude-code) gates every Edit/Write and blocks `rm`.
- `/wiki` is a **soft-depends on graphify** (`pip install graphifyy`) + `mcp` pkg + the
  `claude` CLI (for MCP wiring). The SKILL prefers invoking the user's `/graphify` skill
  for the graph step but documents a direct-pipeline fallback so the plugin stays usable
  standalone. `bin/wiki` itself has **zero deps** (pure bash) — only the populate/graph
  steps need graphify. Vault is `<folder>-wiki/`; graphify runs over the *notes*, not the
  project code (right altitude, avoids the node_modules explosion).
- `/launch` ships a **sidecar `launch-workflow.js`** beside `SKILL.md` — the only skill that
  isn't SKILL.md-only, so `install.sh` copies the whole dir (`cp "$HERE/skills/launch/"* …`).
  The skill resolves the script via `${CLAUDE_PLUGIN_ROOT}/skills/launch/…` (plugin) or
  `~/.claude/skills/launch/…` (install.sh route). It's **token-heavy** (real web research,
  ~15–25 agents) and authorizes its own `Workflow` call. Pass `date` explicitly — workflow
  scripts can't read the clock (`Date.now()`/`new Date()` are unavailable).
- **The Workflow runtime delivers `args` to the script as a JSON STRING**, not a parsed object —
  `launch-workflow.js` `JSON.parse`s it into `ARGS` (and fails fast if the brief is empty). Any new
  `args`-driven workflow must do the same, or `args.foo` is silently `undefined`, the run falls back
  to defaults, and (brief-less) the research agents ground on whatever repo the run sits in — which is
  exactly how the first MIQ smoke test produced an Adversaria plan in the wrong folder.

## Last updated

2026-09-14 — Completed and verified the Floor visual/audio upgrade; restored the
user-preferred skyline/rooftop layout, retained new branding and rock animations.
Changes remain uncommitted.

2026-08-31 (night, round 2) — `/floor` is now interactive: cards show each agent's last words;
click → drawer with the live conversation + a prompt box that types into tmux-hosted sessions via
send-keys (ppid→pane resolution, token-guarded POST /send; verified live end-to-end). Non-tmux
sessions = view-only with an honest badge. Expressive v2 Vexel atlas swapped in (same geometry).

2026-08-31 (night) — added `/floor` (v0.13.0, uncommitted): one live avatar board for every Claude
Code session on the machine — Munder Difflin's hooks-as-event-plane ideology + the Laghari Vexel
cast. `bin/floor-hook` (8 lifecycle hooks in `~/.claude/settings.json`, backed up) →
`~/.stuntman/floor/events.jsonl` → `bin/floor` state reducer + board at `127.0.0.1:4517`. States:
working/thinking/**waving-needs-you**/done/silent; rooms per project; Task sub-agents as hue-shifted
son/daughter placeholders. Smoke-tested with real hooks (caught this session + a concurrent
meeting-note-taker session live). Next: real kid rigs, stunt doubles on the floor, commit auth.

2026-08-29 (night, later) — README gained a "What's what" cast table (orchestrator / stunt double /
five backends / bin tools / living docs / Stop hook) — **written by the Gemini stunt double itself**
(`/delegate` via agy, `gemini-3.7-flash-high`, verbatim spec insertion, 15+/0−, zero review rounds).

2026-08-29 (night) — README + website revamped to the v0.12.0 reality: five-backend story everywhere
(hero, diagram, command table, "The trick" gains the vendor-CLI-convergence paragraph), `/usages` got a
README section + a seventh landing-page card ("Seven commands, one crew"), and `marketplace.json`'s
description finally lists all seven commands. Also synced the vault this session (`/vault`: stuntman
page refreshed + new [[vendor-cli-headless-contracts]] lesson; graph refreshed).

2026-08-29 (evening) — added `/usages` (v0.12.0): one zero-token usage/limits board across the stunt
doubles (Claude live, Codex from its session-file `rate_limits` snapshot with expired-window handling,
DeepSeek balance live, agy/muse honestly n/a) + a cached `--statusline` segment wired into the user's
statusline script (backup kept). Smoke-tested all three modes live.

2026-08-29 (later) — added `muse` (Meta's Muse Code CLI) as a fifth `/delegate` backend (v0.11.0):
exec + resume via `muse exec --json --approval-mode never` (+ `--session-id` for resume; `muse resume`
itself is TUI-only), smoke-tested live end-to-end through `bin/stunt`. No token usage in muse's event
stream → zeros; sandbox stays on. Grok/Kimi documented as opencode-backend routes (`xai/…` /
`moonshotai/…`) — no dedicated CLIs installed. agy work committed (`9d97c40`), marketplace clone
fast-forwarded.

2026-08-29 — added `agy` (Google Antigravity CLI) as a fourth `/delegate` backend (v0.10.0): exec +
resume wired through `bin/stunt` with `--add-dir "$PWD"` (load-bearing) and a 30m print timeout,
smoke-tested live end-to-end (file created, review feedback applied in the same conversation, model pin
honored). Roster spans Gemini 3.x / Claude 4.6 / GPT-OSS on the user's flat subscription. Docs +
plugin.json updated. Not committed — needs user authorization first.

2026-08-11 (night) — added `codex` as a third `/delegate` backend (v0.9.0), wiring OpenAI's Codex CLI
into the existing plan/execute/review loop alongside claude/opencode. Smoke-tested live end-to-end
(exec + resume, real file edits, session continuity). Docs + plugin.json updated. Not committed — needs
user authorization first. Session closed.

2026-06-29 (night) — fixed the Film Crew `claude -p` process leak via an `anthropic-oauth` provider (Opus → OAuth token → Anthropic API, like fcc / Claude Code); committed in film-crew (`e1b9e8c`). **Resolved stuntman 6-vs-4 → keep all 6** (`/wiki` + `/launch` stay). Captured a new build candidate: a `/launch`-adjacent ideation/"roast" command (`/forge`). Session closed.
2026-06-29 (late) — **bake-off validated the v2 direction** (`../film-crew-bench/`, see `RESULTS.md`): agentic harness fixes one-shot truncation; verify→fix converges cheap workers; all 3 models coded real physics; economics = free-gate-iterate + Opus-once, "pick the worker that lands close." Film Crew design principles locked.
2026-06-29 — repo audit + **v2 direction decision** (standalone multi-model agent crew; reuse `my-agents`; council + cheap/local worker team; drop fcc dependency). No code shipped — 3 questions open before building. Added `.gitignore`. See "What changed this session."
2026-06-27 — v0.8.1: smoke-tested `/launch` on MIQ-Agentic; fixed the args-as-JSON-string bug it caught (`JSON.parse` + fail-fast). Re-ran clean.
2026-06-27 — v0.8.0: `/launch` product-launch strategist (`skills/launch/` + parameterized workflow); README + landing page + install.sh + plugin.json.
2026-06-26 — v0.7.0: `/wiki` second-brain scaffolder + docs (README/how-it-works/install.sh).
2026-06-19 — living-document system + Stop hook (v0.6.0).
