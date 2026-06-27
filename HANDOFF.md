# HANDOFF

_The session baton — a **living doc**. The current agent updates it before
stopping; the next reads it first. Write for a reader with zero memory of this
session._

## What changed this session

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

## Next step

- **`/launch` is validated end-to-end** (smoke-tested on MIQ-Agentic, v0.8.1 — 20 agents, correct
  product, right repo). Remaining: run it once via the `install.sh` route (`~/.claude/skills/launch/`)
  to exercise the path-resolution branch, and from a true `/launch` slash invocation (this session
  drove the workflow directly via `scriptPath`, not the SKILL's resolver).
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
- **The Workflow runtime delivers `args` to the script as a JSON STRING**, not a parsed object —
  `launch-workflow.js` `JSON.parse`s it into `ARGS` (and fails fast if the brief is empty). Any new
  `args`-driven workflow must do the same, or `args.foo` is silently `undefined`, the run falls back
  to defaults, and (brief-less) the research agents ground on whatever repo the run sits in — which is
  exactly how the first MIQ smoke test produced an Adversaria plan in the wrong folder.

## Last updated

2026-06-27 — v0.8.1: smoke-tested `/launch` on MIQ-Agentic; fixed the args-as-JSON-string bug it caught (`JSON.parse` + fail-fast). Re-ran clean.
2026-06-27 — v0.8.0: `/launch` product-launch strategist (`skills/launch/` + parameterized workflow); README + landing page + install.sh + plugin.json.
2026-06-26 — v0.7.0: `/wiki` second-brain scaffolder + docs (README/how-it-works/install.sh).
2026-06-19 — living-document system + Stop hook (v0.6.0).
