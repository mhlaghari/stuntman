---
name: handoff
description: Resume work in a scaffolded project by reading its memory docs first, then continuing where the last session left off. Reads HANDOFF.md (the session baton), STATUS.md (the status board), README.md, and anything else the CLAUDE.md "read this first" list points to, gives a short read-back of where things stand, then picks up the next step. The runtime half of /scaffold. Use when the user invokes /handoff, says "execute handoff", "resume", "pick up where we left off", or "continue from the handoff".
---

# stuntman: handoff — resume from the project's memory

`/scaffold` sets up the project-memory docs; `/handoff` is how you resume from
them. It reads the project's running state, orients, and continues — so a brand-
new session (or one after `/clear`) picks up with zero re-explaining.

## What to do

1. **Read the memory docs, in order:**
   - `HANDOFF.md` — the session baton: what the last session changed, the next
     step, gotchas. The primary "where we are."
   - `STATUS.md` — the board: built / in progress / planned.
   - `SPEC.md` — the contract: what this is and where it's going. Build to it.
   - `STRATEGY.md` — the honest why / direction. Read before any big call.
   - `README.md` — what the project is and how to run it.

   Read what the next step needs, not the whole repo. (A lightly-scaffolded
   project may not have `SPEC.md` / `STRATEGY.md` — skip what's absent.)

   If `HANDOFF.md` / `STATUS.md` don't exist, the project isn't scaffolded yet —
   tell the user to run `/scaffold` first, and stop.

2. **Orient and confirm.** Give a short read-back: where the project stands and
   the next step you picked up from `HANDOFF.md`. Surface anything stale or
   contradictory between the docs and the actual code/tree.

3. **Continue the work** from that next step — unless the user redirects you.

4. **Before you stop**, honor the contract in `CLAUDE.md`: update `HANDOFF.md`
   (what changed, next step, gotchas), `STATUS.md` (refresh the board), and
   `README.md` (if the project's surface changed) — written for a reader with
   zero memory of this session. Never commit without explicit authorization.

## Notes

- This is the runtime half of the pair: `/scaffold` writes the system,
  `/handoff` runs it. The read-first / update-before-stopping instructions also
  live in `CLAUDE.md` (which auto-loads), so the loop holds even if a session
  never explicitly runs `/handoff` — this command just makes the resume
  deliberate.
- Trust the working tree over the docs when they disagree — then fix the docs.
