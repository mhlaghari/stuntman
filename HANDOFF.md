# HANDOFF

_The session baton — a **living doc**. The current agent updates it before
stopping; the next reads it first. Write for a reader with zero memory of this
session._

## What changed this session

- Expanded `/scaffold` from the v0.5 pair (HANDOFF + STATUS) into a **full
  living-document system**:
  - `bin/scaffold` now also creates **`SPEC.md`** (the contract) and
    **`STRATEGY.md`** (the honest why), each a self-declaring living doc with a
    changelog. The `CLAUDE.md` contract reads + maintains all of them.
    Idempotent / non-clobber tested.
  - `skills/scaffold` populates SPEC + STRATEGY too; `skills/handoff` reads them.
- Added a **Stop hook** (`hooks/handoff-guard.sh` + `hooks/hooks.json`):
  scaffolded-only nudge to update `HANDOFF.md`/`STATUS.md` before stopping when
  code changed but the docs didn't. Tested across 5 scenarios; fails open.
- `plugin.json` → **v0.6.0**. Re-scaffolded this repo (`CLAUDE.md` + `SPEC.md` +
  `STRATEGY.md` + `STATUS.md`, all populated). Updated README / how-it-works /
  landing for the living-doc set + the hook.

## Next step

- Commit + push v0.6.0, then verify GitHub Pages rebuilds.
- Then work the `STATUS.md` "Planned" list: marketplace.json copy, smoke-test CI,
  a real `/relay` capped→reset test.

## Gotchas

- The Stop hook must respect `stop_hook_active` (no loops) and **fail open**; it
  only acts when `HANDOFF.md` exists (scaffolded). It detects "code changed but
  docs not touched" via `git status --porcelain` — once HANDOFF/STATUS show as
  modified it goes quiet, so it nudges roughly once per work burst, not per turn.
- Plugin hooks **auto-load from `hooks/hooks.json`** (no `plugin.json` pointer
  needed; mirrors everything-claude-code). Command uses `${CLAUDE_PLUGIN_ROOT}`.
- `bin/scaffold` writes docs via a `make` helper + quoted heredocs (backticks safe).
- GateGuard (everything-claude-code) gates every Edit/Write and blocks `rm`.

## Last updated

2026-06-19 — living-document system + Stop hook (v0.6.0).
