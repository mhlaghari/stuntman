---
name: handoff
description: Scaffold a self-resuming session-handoff loop into the current project, so every Claude session reads HANDOFF.md first and rewrites it before stopping — then "execute handoff" resumes any session with zero re-explaining. Idempotently adds a marked block to CLAUDE.md and a HANDOFF.md stub. The context-continuity companion to /delegate (saves cost) and /relay (survives the rate limit). Use when the user invokes /handoff, says "scaffold the handoff loop", "set up auto-handoff", or "make this project resume itself across sessions".
---

# stuntman: handoff — context that survives the session boundary

`/delegate` saves cost, `/relay` survives the rate limit; this survives the
**context** boundary. It installs a tiny contract so the project carries its own
memory: each session reads `HANDOFF.md` first, and rewrites it before stopping.

## The scaffolder

```bash
HANDOFF="$(command -v handoff || echo "${CLAUDE_PLUGIN_ROOT}/bin/handoff")"
"$HANDOFF"          # scaffolds the current project (cwd)
```

Idempotent and non-destructive:
- inserts a marked block (`<!-- stuntman:handoff:start … end -->`) into
  `CLAUDE.md` — creating the file if absent, appending if present, skipping if
  the block is already there. It never rewrites existing content.
- drops a `HANDOFF.md` stub only if one doesn't already exist.

## What to do

1. **Confirm the project root** — run from the repo root, where `CLAUDE.md`
   belongs. If unsure, use the git root (`git rev-parse --show-toplevel`).
2. **Run the scaffolder** and show the user its output.
3. **If it reports the block is already there**, the loop is installed — so
   instead, offer to **update `HANDOFF.md` now** from this session's work
   (current state, what's next, gotchas). That's the living part of the loop.
4. **Report**: the loop is active for every future session. To resume any time,
   the user just says **"execute handoff"** — the next agent reads `HANDOFF.md`
   first, because that instruction now lives in `CLAUDE.md`, which auto-loads.

## Writing a good HANDOFF.md

When you (or a future session) update it, write for a reader with **zero memory
of this session**: what works right now, the immediate next steps in priority
order, and any gotcha that cost time. No references to "as discussed" — it must
stand alone.

## Notes

- Enforcement is **instruction-only** by design: `CLAUDE.md` auto-loads every
  session, so the read-first / write-before-stop steps are always in context.
  Claude follows them; nothing hard-forces it. That keeps it low-friction —
  no hooks, no settings.json changes.
- **Self-contained**: no dependency on `/checkpoint`, `STATUS.md`, or any
  external memory system. Just `CLAUDE.md` + `HANDOFF.md`.
- Pairs with `/relay`: when a long run pauses at the 5-hour cap, the same
  `HANDOFF.md` is the human-readable state the next session picks up from.
