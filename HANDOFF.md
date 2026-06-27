# HANDOFF

_The session baton — a **living doc**. The current agent updates it before
stopping; the next reads it first. Write for a reader with zero memory of this
session._

## What changed this session

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

## Next step

- **Test `/launch` end-to-end from a cold invocation** on a real product — it's syntax-checked and
  was validated as the inline workflow that produced the Adversaria plan, but the packaged skill
  (path resolution + args assembly from `SKILL.md`) hasn't been exercised from a fresh `/launch`.
- (Polish only) the landing `#commands` section now lists all six; the `#handoff` 3-card grid is
  still scaffold/handoff-only — a dedicated `/wiki` or `/launch` story card is optional.
- Then the `STATUS.md` "Planned" list: marketplace.json copy, smoke-test CI, real `/relay` test.

## Gotchas

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

## Last updated

2026-06-27 — v0.8.0: `/launch` product-launch strategist (`skills/launch/` + parameterized workflow); README + landing page + install.sh + plugin.json.
2026-06-26 — v0.7.0: `/wiki` second-brain scaffolder + docs (README/how-it-works/install.sh).
2026-06-19 — living-document system + Stop hook (v0.6.0).
