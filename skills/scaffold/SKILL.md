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
- creates `HANDOFF.md` (session baton) and `STATUS.md` (status board), each only
  if missing.

## What to do

1. **Confirm the project root** — run from the repo root (git root:
   `git rev-parse --show-toplevel`).
2. **Run the scaffolder** and show the user its output.
3. **Populate the docs from reality.** The stubs are placeholders — fill them in
   now so the system is useful immediately, by examining the project (its
   `README.md`, structure, recent `git log`):
   - **`STATUS.md`** — the board: **Built** (what ships and works), **In
     progress** (active work), **Planned** (next, not started).
   - **`HANDOFF.md`** — the baton: **What changed this session**, the **Next
     step**, **Gotchas**, and a dated one-line summary. Write both for a reader
     with **zero memory** of this session — no "as discussed".
   - `README.md` is part of the maintained set too: the contract says to refresh
     it when the project's surface changes. Scaffold doesn't *create* one (that's
     a project-init job) — if it's missing, say so.
4. **Report**: the system is active. Every future session now reads
   `HANDOFF.md` / `STATUS.md` first (the instruction lives in `CLAUDE.md`, which
   auto-loads) and updates them before stopping. To resume any time, the user
   runs **`/handoff`** or says **"execute handoff"**.

## Notes

- Enforcement is **instruction-only**: `CLAUDE.md` auto-loads, so the
  read-first / update-before-stop steps are always in context. No hooks, no
  settings changes.
- **Self-contained**: no dependency on an external `/checkpoint` skill or memory
  system — just `CLAUDE.md` + `HANDOFF.md` + `STATUS.md`. (If the user already
  runs a `/checkpoint` that maintains `STATUS.md`, it stays compatible — same
  file, same purpose.)
- Pairs with `/relay`: when a long run pauses at the 5-hour cap, `HANDOFF.md` is
  the human-readable state the next session resumes from.
