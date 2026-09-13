---
name: scaffold
description: Set up Stuntman project memory in AGENTS.md for Codex, CLAUDE.md for Claude Code, or both. Create and populate HANDOFF, STATUS, SPEC, and STRATEGY without clobbering existing content. Use when asked to scaffold project memory or set up handoff/status docs.
---

# stuntman: scaffold — stand up the project-memory system

`/delegate` saves cost, `/relay` survives the rate limit; `scaffold` + `handoff`
make a project **document and resume itself** across sessions. This command is
the one-time **setup**; `/handoff` is the per-session **resume**.

## The scaffolder

Read [host and tool setup](../runtime.md). Set `STUNTMAN_HOST` to `codex` in
Codex or `claude` in Claude Code; use `both` when the user requests both hosts.

```bash
SCAFFOLD="$STUNTMAN_ROOT/bin/scaffold"
"$SCAFFOLD" --host "$STUNTMAN_HOST"
```

Idempotent and non-destructive. It:
- writes a contract block (`<!-- stuntman:scaffold:start … end -->`) into
  the host's instruction file (`AGENTS.md`, `CLAUDE.md`, or both) — created if absent, appended if present, skipped if already there
  (recognizes the pre-0.5 `stuntman:handoff` marker too). Never rewrites
  existing memory or user-owned content.
- creates the living docs it references — `HANDOFF.md` (the session baton),
  `STATUS.md` (the board), `SPEC.md` (the contract), `STRATEGY.md` (the honest
  why) — each only if missing. Each self-declares as a living doc.
- appends or refreshes a managed agent roster block
  (`<!-- stuntman:agents:start … end -->`) in the same instruction file(s) —
  one full inventory snapshot shared by every selected host. Rerunning
  refreshes only that block; memory content is untouched, and user overrides
  persist outside the block. The roster states role preferences — Fable in
  Claude Code and Astra/GPT in Codex for spec writing and review, everything
  else executing through `stunt` — which are preferences, not availability or
  login proof. Installed means the CLI is on `PATH`, not that it is
  authenticated. Discovery runs `opencode models` / `agy models` with a short
  timeout and reads the local Codex model cache; it makes no model inference
  calls. Refreshing the snapshot never installs or configures models.

## What to do

1. **Confirm the project root** — run from the repo root (git root:
   `git rev-parse --show-toplevel`).
2. **Run the scaffolder** and show the user its output.
3. **Populate the docs from reality.** The stubs are living-doc skeletons — fill
   them in now so the system is useful immediately, by examining the project (its
   `README.md`, structure, recent `git log`):
   - **`SPEC.md`** — the contract: a one-paragraph **Vision**, the load-bearing
     **Principles**, **Scope** (in / out), **Open decisions**. Draft from what the
     project clearly is; flag guesses for the user.
   - **`STRATEGY.md`** — the honest **Bottom line**, **Assessment**, **Direction**.
     The critical version, not a pitch. If you can't assess honestly yet, say what
     you'd need to.
   - **`STATUS.md`** — the board: **Built** / **In progress** / **Planned** / **Blockers**.
   - **`HANDOFF.md`** — the baton: **What changed this session**, the **Next step**,
     **Gotchas**, dated.
   Write all of them for a reader with **zero memory** of this session, and set
   each doc's date / changelog. `README.md` is maintained too (refresh when the
   surface changes); scaffold doesn't *create* one — if it's missing, say so.
4. **Report**: the system is active. Every future session now reads
   `HANDOFF.md` / `STATUS.md` first (the instruction lives in the host's instruction file, which
   auto-loads) and updates them before stopping. To resume any time, the user
   runs **`/handoff`** or says **"execute handoff"**.

## Notes

- The contract is **instruction-driven** (the host's instruction file auto-loads, so read-first /
  update-before-stop is always in context), and a **Stop hook** (ships with the
  plugin) backs it up: in scaffolded projects only, if the session changed code
  but didn't update `HANDOFF.md` / `STATUS.md`, it nudges once before the turn
  ends. It fails open and never touches non-scaffolded projects. Codex only runs
  the hook after the user trusts it; the memory workflow does not require it.
- **Self-contained**: no dependency on an external `/checkpoint` skill or memory
  system — just the host's instruction file + the living docs. (If the user already runs a
  `/checkpoint` that maintains `STATUS.md`, it stays compatible — same file.)
- Pairs with `/relay`: when a long run pauses at the 5-hour cap, `HANDOFF.md` is
  the human-readable state the next session resumes from.
