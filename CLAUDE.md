# CLAUDE.md

<!-- stuntman:scaffold:start -->
## Project memory protocol

**Read this first — start of every session** (or just run `/handoff`):
1. `HANDOFF.md` — what the last session changed, what's next, and the gotchas.
   Assume you have zero memory of prior sessions; this is your memory of them.
2. `STATUS.md` — the running status board: what's built, in progress, and planned.
3. `README.md` — what the project is and how to run it.
4. Any doc those reference (specs, design notes) before building in that area.

**Before you stop — end of every session:**
- Update `HANDOFF.md`: what changed, what's next, and any gotcha that cost time.
  Write it for someone with zero memory of this session.
- Update `STATUS.md`: refresh the board to match reality.
- Update `README.md` if the project's surface changed (features, install, usage).
- Never commit without explicit user authorization.

A task isn't "done" until `HANDOFF.md` and `STATUS.md` reflect it (and `README.md`, if it changed).
<!-- stuntman:scaffold:end -->
