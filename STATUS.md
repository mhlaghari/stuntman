# STATUS

> Where the project stands right now. Refreshed each session alongside HANDOFF.md.

## Built

**v0.5.0** — four commands, each a skill (+ a `bin/` helper where it needs one):

- **`/delegate`** (`skills/delegate`, `bin/stunt`) — plan with Claude, execute
  with a cheap worker (Claude-via-proxy or `opencode`), review with Claude.
- **`/relay`** (`skills/relay`, `bin/window`) — read the 5-hour usage window via
  a zero-token OAuth probe and span the rate-limit gap.
- **`/scaffold`** (`skills/scaffold`, `bin/scaffold`) — set up the project-memory
  system: `CLAUDE.md` contract + `HANDOFF.md` (baton) + `STATUS.md` (board).
- **`/handoff`** (`skills/handoff`) — resume a scaffolded project by reading its
  memory docs, then continue.

Docs: `README.md`, `docs/how-it-works.md`, landing page `docs/index.html`
(sections: how → results → relay → handoff → install). `install.sh` installs all
four skills + three `bin/` tools. Live on GitHub (`mhlaghari/stuntman`) + Pages.

## In progress

- _(nothing active)_

## Planned

- `marketplace.json` description still only names the delegate value prop — add
  relay / scaffold / handoff.
- Exercise `/relay` through a real capped → reset cycle (never run live end-to-end).
- No tests / CI — a smoke test for `window` (parse) + `scaffold` (idempotency).

## Last updated

2026-06-19 — shipped the `/scaffold` + `/handoff` split (v0.5.0).
