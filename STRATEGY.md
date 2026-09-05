# STRATEGY

_A **living doc** — the honest version on purpose, not a pitch. Maintain it;
revisit before any big direction call._

## Bottom line (read this first)

- stuntman's real story isn't "use a cheap model" — it's **"make long autonomous
  work survive the boundaries that kill it"** (cost / rate-limit / context). That
  framing is the differentiator; the individual commands are the proof.
- The **moat is harness discipline**, not any single trick: zero-decision specs,
  trust-nothing review, zero-token metering, idempotent never-clobber setup.
- Biggest risk: **scope sprawl** — four commands + a hook + a doc system is a lot
  of surface for a plugin. Each addition must earn the boundary it removes.

## Honest assessment

- **Works, shipped, documented, live** (GitHub + Pages). The `/delegate` benchmark
  (Opus DIY vs the stunt double) is real and favourable.
- **Unproven in the wild:** `/relay` has never run a real capped → reset cycle
  end-to-end; the living-doc system is brand new (v0.6). No external users or tests.
- **macOS-first** assumptions (Keychain for the OAuth token) limit reach; Linux is
  only a fallback path.

## Direction

- Support Claude Code and Codex through the same eight skills and worker wrapper.
  Host-specific memory files and quota/scheduling capabilities are explicit;
  avoid duplicating the product into separate implementations.

- **v2 = "Film Crew"** (validated 2026-06-29 via the `../film-crew-bench` bake-off): a standalone
  multi-model agent crew, fcc-independent. The moat shifts from "use a cheap model" to **"a free
  deterministic gate does the iteration; Opus does judgment once"** — and *pick the cheapest worker
  that lands close*, not the cheapest worker. See `../film-crew-bench/RESULTS.md`.
- Prove the loops on real work before adding a fifth command — depth over breadth.
- Lean into the "survives every boundary" narrative across the README + site.
- Add a smoke-test CI before the surface grows further.

## Open questions / to revisit

- Who is the user — solo builders running long autonomous sessions, or teams?
- Is the Stop-hook nudge the right default, or too opinionated for some projects?
- Does the doc system want a tiered (minimal / full) mode for tiny repos?

## Changelog
- 2026-09-05 — Added Codex host compatibility while retaining Claude Code support; shared workflows with capability-aware execution.
- 2026-06-29 — v2 "Film Crew" direction validated via the bake-off; "free gate iterates, Opus judges once" is the new moat.
- 2026-06-19 — created. Honest read at v0.6 (four commands + the living-doc system).
