# HANDOFF

_The session baton — a **living doc**. The current agent updates it before
stopping; the next reads it first. Write for a reader with zero memory of this
session._

## What changed this session

- Added a **5th command, `/wiki`** — scaffolds an LLM-wiki "second brain" + graphify
  for the current folder, in one shot. New files:
  - `bin/wiki` — deterministic, idempotent scaffolder. Auto-detects **single project
    vs folder of projects** (≥2 project-like subdirs → folder mode). Lays a vault at
    `<folder>-wiki/`: `CLAUDE.md` schema, `wiki/{projects,concepts,patterns,lessons-learned,references}`,
    `index.md` / `_PROJECTS_MOC.md` / `hot.md` / `Projects-Dashboard.md` (Dataview),
    `.obsidian/{app,graph,core-plugins}.json` (graph colored by status/type). Prints
    `VAULT=`, `MODE=`, and the detected `PROJECTS:` list. Smoke-tested: single, folder
    (3 projects), and idempotent re-run (skips all 8 files).
  - `skills/wiki/SKILL.md` — orchestrates: run scaffolder → ensure graphify (`graphifyy`)
    → populate notes from READMEs/code (parallel `general-purpose` subagents for many
    projects, then author cross-links centrally) → build the graph (invoke `/graphify`
    on `<vault>/wiki`, fallback to the pipeline) → wire the graphify MCP at user scope
    (`claude mcp add <vault-name> -- <interp> -m graphify.serve …`) → report.
- `plugin.json` keywords extended (second-brain / wiki / graphify / knowledge-graph).
- Bumped to **v0.7.0**; updated `README.md`, `docs/how-it-works.md`, and `install.sh`
  for the 5th command. This mirrors what was built by hand for `laghari-vault` — now
  portable + generic.
- **Commands overview** added (follow-up): a 5-command table at the top of `README.md`
  and a new `#commands` section on the landing page (`docs/index.html`). Every slash
  command is now visible at a glance — previously `/delegate` and `/relay` weren't even
  named on the site.

## Next step

- (Polish only) the landing `#handoff` 3-card grid still shows scaffold/handoff; the new
  `#commands` section already lists all five incl. `/wiki`, so the page is complete — a
  dedicated `/wiki` story card is now optional.
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

## Last updated

2026-06-26 — v0.7.0: `/wiki` second-brain scaffolder + docs (README/how-it-works/install.sh).
2026-06-19 — living-document system + Stop hook (v0.6.0).
