---
name: handoff
description: Resume a Stuntman project from HANDOFF.md, STATUS.md, and the host's AGENTS.md or CLAUDE.md memory contract. Read back the current state and continue the documented next step. Use when asked to execute a handoff or resume from project memory.
---

# stuntman: handoff — resume from the project's memory

`/scaffold` sets up the project-memory docs; `/handoff` is how you resume from
them. It reads the project's running state, orients, and continues — so a brand-
new session (or one after `/clear`) picks up with zero re-explaining.

## What to do

Read [host setup](../runtime.md). Follow `AGENTS.md` in Codex and `CLAUDE.md`
in Claude Code, including any additional read-first documents listed there.

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

2. **Check vault freshness.** If `$STUNTMAN_VAULT` (default
   `~/Documents/Documents/MyProjects/laghari-vault`) contains
   `wiki/projects/<project dirname>.md`, compare its `updated:` frontmatter to
   `git log -1 --format=%cs`. If it is more than 7 days behind, mention that in
   the read-back. If a vault-maintenance skill is available, suggest it;
   otherwise offer to refresh the page directly. `/vault` is not bundled.

3. **Orient and confirm.** Give a short read-back: where the project stands and
   the next step you picked up from `HANDOFF.md`. Surface anything stale or
   contradictory between the docs and the actual code/tree.

4. **Continue the work** from that next step — unless the user redirects you.

5. **Before you stop**, honor the host's memory contract: update `HANDOFF.md`
   (what changed, next step, gotchas), `STATUS.md` (refresh the board), and
   `README.md` (if the project's surface changed) — written for a reader with
   zero memory of this session. Never commit without explicit authorization.

## Notes

- This is the runtime half of the pair: `/scaffold` writes the system,
  `/handoff` runs it. The read-first / update-before-stopping instructions also
  live in the host's instruction file (which auto-loads), so the loop holds even if a session
  never explicitly runs `/handoff` — this command just makes the resume
  deliberate.
- Trust the working tree over the docs when they disagree — then fix the docs.
