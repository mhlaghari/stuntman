# SPEC

_The product contract — a **living doc**. What stuntman is and where it's going
(`CLAUDE.md` covers the current code; this covers the destination). Every session
reads this first; keep it current._

## Vision

A Claude Code plugin that lets long, autonomous work survive the three boundaries
that normally kill it — **cost**, the **rate limit**, and **context** — by
splitting each so the expensive model (Claude, on subscription) does only what
needs intelligence and cheap or automatic mechanisms carry the rest.

## Principles (load-bearing — do not violate)

1. **Claude plans and reviews; a cheap model executes.** Never spend subscription
   tokens on mechanical typing — that's the worker's job (`/delegate`).
2. **Specs leave the worker zero decisions.** Weak models executing great
   instructions beat strong models executing vague ones.
3. **Claude trusts nothing it didn't verify.** Review reads the diff and re-runs
   the verification itself.
4. **Read your own meter, spend nothing doing it.** `/relay`'s probe hits the same
   endpoint `/usage` uses — zero tokens, no Claude call.
5. **The project carries its own memory.** `/scaffold` + `/handoff` make the docs
   the source of truth across sessions; a session resumes from `HANDOFF.md`, not chat.
6. **Idempotent, never-clobber, fail-open.** Setup tools and hooks must be safe to
   re-run and must never trap the user or destroy their files.

## Scope

- **In:** the four commands (`/delegate`, `/relay`, `/scaffold`, `/handoff`), the
  `bin/` helpers (`stunt`, `window`, `scaffold`), the Stop hook, the docs + site.
- **Out (for now):** hosting the worker proxy itself; non-macOS credential paths
  beyond the `~/.claude/.credentials.json` fallback; a GUI.

## Open decisions

- Whether `/scaffold`'s doc set should be tiered (minimal vs full) by project size
  — currently always the full SPEC / STRATEGY / STATUS / HANDOFF set.
- Whether to ship the Stop hook for the non-plugin (`install.sh`) route too.

## Changelog
- 2026-06-19 — created. The v0.6 four-command shape + load-bearing principles.
