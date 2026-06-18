# HANDOFF

> The session baton. The current agent updates this before stopping; the next
> agent reads it first. Write for a reader with zero memory of this session.

## What changed this session

- Split the context-continuity feature into **two** commands (it was a single
  `/handoff` in v0.4.0):
  - **`/scaffold`** (`bin/scaffold`, `skills/scaffold`) — one-time setup: writes
    the contract into `CLAUDE.md` and creates `HANDOFF.md` (baton) + `STATUS.md`
    (board), then populates them. Marker `stuntman:scaffold` (also recognizes the
    old `stuntman:handoff` marker so upgrades don't double-add).
  - **`/handoff`** (`skills/handoff`, no `bin/`) — repurposed to the *resume*
    action: read `HANDOFF.md` / `STATUS.md` / `README.md`, orient, continue.
- Renamed `bin/handoff` → `bin/scaffold` (git mv) and expanded it (adds STATUS.md
  + a fuller contract). Tested: create-all / idempotent / old-marker / non-clobber.
- Updated `install.sh`, `plugin.json` (→ v0.5.0), `README.md`,
  `docs/how-it-works.md`, and the landing-page cards.
- Added `README.md` to the maintained-docs contract — sessions refresh it too
  when the project's surface changes (not just `HANDOFF.md` + `STATUS.md`).
- Re-scaffolded this repo to the new system (this `CLAUDE.md` + `STATUS.md` + this file).

## Next step

- **Commit + push v0.5.0** (not yet committed as of this writing), then verify
  GitHub Pages rebuilds and the landing cards show `/scaffold` + `/handoff`.
- Then work the `STATUS.md` "Planned" list (marketplace.json copy, live `/relay`
  test, smoke tests).

## Gotchas

- `bin/scaffold` skips the `CLAUDE.md` block if **either** `stuntman:scaffold` or
  the pre-0.5 `stuntman:handoff` marker is present — prevents double blocks on upgrade.
- `ScheduleWakeup` clamps to ≤ 1 h, so `/relay` auto-resumes hands-free only when
  reset is < ~55 min out; longer gaps are ping-triggered.
- `bin/*` emit Markdown via a function + quoted heredoc — backticks inside
  `$(cat <<'EOF')` break bash's paren matcher.
- GateGuard hook (everything-claude-code) gates every Edit/Write and blocks `rm`
  (use `mv`); present its requested facts then retry.

## Last updated

2026-06-19 — shipped the `/scaffold` + `/handoff` split (v0.5.0).
