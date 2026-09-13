# SPEC

_The product contract — a **living doc**. What stuntman is and where it's going
(`CLAUDE.md` covers the current code; this covers the destination). Every session
reads this first; keep it current._

## Vision

A Claude Code and Codex plugin that lets long, autonomous work survive the three boundaries
that normally kill it — **cost**, the **rate limit**, and **context** — by
splitting each so the orchestrator model in the current host does only what
needs intelligence and cheap or automatic mechanisms carry the rest.

## Principles (load-bearing — do not violate)

1. **The host plans and reviews; a selected worker executes.** Never spend subscription
   tokens on mechanical typing — that's the worker's job (`/delegate`).
2. **Specs leave the worker zero decisions.** Weak models executing great
   instructions beat strong models executing vague ones.
3. **The host trusts nothing it didn't verify.** Review reads the diff and re-runs
   the verification itself.
4. **Read your own meter, spend nothing doing it.** `/relay`'s probe hits the same
   endpoint `/usage` uses in Claude Code, or reads local Codex quota snapshots.
   Never represent a snapshot as live quota or promise a reset gives fresh capacity.
5. **The project carries its own memory.** `/scaffold` + `/handoff` make the docs
   the source of truth across sessions; a session resumes from `HANDOFF.md`, not chat.
6. **Idempotent, never-clobber, fail-open.** Setup tools and hooks must be safe to
   re-run and must never trap the user or destroy their files.

## Scope

- **In:** eight skills (`delegate`, `relay`, `scaffold`, `handoff`, `wiki`,
  `launch`, `usages`, `floor`), shared `bin/` helpers, both plugin manifests, the optional
  Stop hook, lifecycle recording and the local floor board, the docs + site. `AGENTS.md` is the Codex memory contract; `CLAUDE.md`
  remains the Claude Code contract. The worker backend is independent of the host.
- **Out (for now):** hosting the worker proxy itself; non-macOS credential paths
  beyond the `~/.claude/.credentials.json` fallback; a desktop agent launcher.

## Floor experience

The local Floor groups real sessions by project in a pixel Dubai rooftop studio.
Retain the user's preferred detailed skyscraper panorama and rooftop bays, with
a single Laghari Labs lightning logo in the header and lagharilabs.com branding.
Project filtering and Demo controls share that header. Expressive
Vexels use guitar, rock-sign headbanging, rage, and completion celebrations.
Animation must preserve the agent's actual status; pose previews and simulated
state changes belong to the clearly labeled demo. Sound is opt-in, initial and
reconnect snapshots are silent, and motion respects pause/reduced-motion settings.
Conversation viewing and prompting retain the existing local trust boundaries.

## Agent roles and portable memory

Scaffolded host instructions include a managed roster of all five worker backends
and bounded model discovery. Fable and GPT/Astra are preferred spec writers and
reviewers; other models execute. User overrides win. A catalog is a snapshot,
not an entitlement or price promise, and scaffold must never switch the active
host or silently choose a paid fallback. Refresh only Stuntman's own roster block;
preserve user instructions and memory documents.

**Planned execution policy:** one Fable/Astra lead plans, writes acceptance
criteria, and reviews; workers handle routine exploration, implementation, tests,
and documentation. Add worker selection, bounded retries, approved fallback
choices, and explicit escalation reasons within Stuntman's execution path.
Lead-model implementation is reserved for exceptionally hard work. These runtime
controls are not implemented by the current roster or instruction files.

Wiki maintenance is agent-driven. Markdown changes require Markdown-aware
extraction and a rebuilt graph, not Graphify's code-only update. Full semantic
extraction adds inferred relationships; a custom vault helper can refresh explicit
frontmatter/wikilink relationships mechanically. The Stop hook reminds;
it does not synchronize vault contents. macOS is verified; native Windows support
and full WSL validation are outside the current delivery.

## Open decisions

- Whether `/scaffold`'s doc set should be tiered (minimal vs full) by project size
  — currently always the full SPEC / STRATEGY / STATUS / HANDOFF set.
- Whether to ship the Stop hook for the non-plugin (`install.sh`) route too.

## v2 direction — "Film Crew" (validated 2026-06-29)

The destination is a **standalone multi-model agent crew** (see `STRATEGY.md`, `HANDOFF.md`, and
`../film-crew-bench/RESULTS.md`), validated by a live bake-off. Load-bearing v2 principles: the worker
self-iterates against a **free deterministic gate** (render + console errors); **Opus enters once** for
judgment + a surgical fix; **pick the cheapest worker that lands _close_**; verify must actually render
(never "tags present"); feedback style scales with worker tier; own the cost accounting (provider rates).

## Changelog
- 2026-09-14 — Recorded the user's delegation-by-default direction and marked runtime routing/retry/escalation controls as planned.
- 2026-09-14 — Clarified custom Markdown-aware vault refresh versus full semantic extraction after syncing the existing personal vault.
- 2026-09-14 — Added scaffolded agent roles/catalog snapshots, clarified wiki graph maintenance and Windows support, and published the approved Floor screenshot in repo/site.
- 2026-09-14 — Recorded the preferred Floor composition, expressive animations, and opt-in sound/demo behavior.
- 2026-09-05 — Added Codex as an orchestrator host; shared skills and independent worker selection, explicit quota/scheduling limits, dual memory contracts.
- 2026-06-29 — v2 "Film Crew" direction validated via the Milky Way bake-off; design principles locked.
- 2026-06-19 — created. The v0.6 four-command shape + load-bearing principles.
