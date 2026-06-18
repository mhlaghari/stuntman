---
name: scaffold
description: Set up a project's self-resuming memory system in one shot. Writes a contract into CLAUDE.md (a "read this first" list + a "before you stop" process contract) and creates the docs it references — HANDOFF.md (the session baton) and STATUS.md (the status board) — then populates them from the project's current state. Idempotent, never clobbers. After this, every session reads those docs first and rewrites them before stopping, and /handoff resumes any session. Use when the user invokes /scaffold, says "scaffold this project", "set up the handoff/status docs", or "make this project document and resume itself".
---

# stuntman: scaffold — stand up the project-memory system

`/delegate` saves cost, `/relay` survives the rate limit; `scaffold` + `handoff`
make a project **document and resume itself** across sessions. This command is
the one-time **setup**; `/handoff` is the per-session **resume**.

## The scaffolder

```bash
SCAFFOLD="$(command -v scaffold || echo "${CLAUDE_PLUGIN_ROOT}/bin/scaffold")"
"$SCAFFOLD"          # sets up the current project (cwd)
```

Idempotent and non-destructive. It:
- writes a contract block (`<!-- stuntman:scaffold:start … end -->`) into
  `CLAUDE.md` — created if absent, appended if present, skipped if already there
  (recognizes the pre-0.5 `stuntman:handoff` marker too). Never rewrites
  existing content.
- creates the living docs it references — `HANDOFF.md` (the session baton),
  `STATUS.md` (the board), `SPEC.md` (the contract), `STRATEGY.md` (the honest
  why) — each only if missing. Each self-declares as a living doc.

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
   `HANDOFF.md` / `STATUS.md` first (the instruction lives in `CLAUDE.md`, which
   auto-loads) and updates them before stopping. To resume any time, the user
   runs **`/handoff`** or says **"execute handoff"**.

## Notes

- The contract is **instruction-driven** (`CLAUDE.md` auto-loads, so read-first /
  update-before-stop is always in context), and a **Stop hook** (ships with the
  plugin) backs it up: in scaffolded projects only, if the session changed code
  but didn't update `HANDOFF.md` / `STATUS.md`, it nudges once before the turn
  ends. It fails open and never touches non-scaffolded projects.
- **Self-contained**: no dependency on an external `/checkpoint` skill or memory
  system — just `CLAUDE.md` + the living docs. (If the user already runs a
  `/checkpoint` that maintains `STATUS.md`, it stays compatible — same file.)
- Pairs with `/relay`: when a long run pauses at the 5-hour cap, `HANDOFF.md` is
  the human-readable state the next session resumes from.
