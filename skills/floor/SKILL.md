---
name: floor
description: Open a local live board of Claude Code sessions, Codex sessions, and Stuntman workers across projects, shown as Laghari Vexel avatars. Use when the user invokes /floor, asks which agents are running or need feedback, or wants to read agent conversations and prompt ready tmux sessions from one board.
---

# Stuntman floor

Read [host and tool setup](../runtime.md) first. The floor displays lifecycle
events from sessions with active hooks and runs launched through the bundled
`stunt` wrapper. It groups agents by project and labels their host and worker
status. Watching uses no model calls.

## Open the board

Resolve `STUNTMAN_ROOT` from this installed skill, then check whether
`http://127.0.0.1:4517/state.json` already serves the floor. If it does, open
or link to `http://127.0.0.1:4517/`. Otherwise start the bundled helper using
the host's background-process tool:

```bash
"$STUNTMAN_ROOT/bin/floor" --no-open
```

It prints the board URL. Open that URL with the available browser tool or give
it to the user. For a terminal glance, run `"$STUNTMAN_ROOT/bin/floor" --json`
and summarize who is working, who needs input, and who finished.

The board renders a pixel-art Dubai rooftop studio with a panorama skyline
at sunset and five bundled Vexel skins mapped to hosts: Claude Code (`claude`),
Codex (`codex`), Antigravity (`gemini`), OpenCode (`deepseek`), and Muse / default
(`laghari`). Use the header controls to filter by project workstation and by agent
status (Working covers running and thinking; plus Needs you, Done, Failed, Idle,
Silent, Left, Other), with a `Show all` reset and a `Showing N of M agents`
counter. Click a status to hide it; click again to restore it. Show all clears
both project and status filters. The board is live-only with no demo mode. Audio cues for
done, needs-input, and failure events are strictly opt-in via the Sound toggle or
Sound Desk samples. Motion can be paused with the Motion button or via system
`prefers-reduced-motion`. Working agents play guitar, thinking/input agents
headbang with rock horns, failures rage, and completed tasks jump then celebrate.

## Event setup

Plugin installs bundle the recorder in `hooks/hooks.json`. Start a new session
after installing or updating. In Codex, the user must review and trust the
hooks through `/hooks` before session events can arrive; never bypass trust.
Do not add duplicate global hooks for a plugin install.

For the standalone helper installation, wire the intended host explicitly:

```bash
"$STUNTMAN_ROOT/bin/floor" --wire-hooks --host codex
# Or --host claude / --host both for the user's chosen hosts.
```

This merges settings and keeps a backup. Codex uses its `hooks.json`; Claude
uses `settings.json`. Hooks only observe sessions where they are active, so
an empty board does not prove no agents are running. Stuntman worker start,
completion, and failure events work independently of host hook trust.

## Read and send

Click an agent to read its latest conversation. The server reads public
Claude/Codex transcript messages, omitting reasoning, system content, and tool
results. Worker cards can show their final summary even without a transcript.
Subagents are matched by their actual IDs and shown as labeled chips; separate
son/daughter rigs remain a future addition.

The prompt box is enabled only for an idle or finished interactive Claude
Code or Codex session in tmux. Before sending, the server verifies the recorded
process identity and foreground terminal group. Busy sessions, approvals,
workers, headless processes, and sessions outside tmux are view-only. Use the
session's own window for approvals and questions. Resume workers through
Stuntman with their original backend and returned session ID.

Sending a prompt runs work in that session and consumes its normal capacity.
Only send the text and target the user authorized. The server binds to
127.0.0.1 and validates origin, host, and a per-run token for sending.

## States and limits

- Prompt submitted → thinking; tool started → running; overlapping tools stay
  running until all finish; turn stopped → done.
- Permission requests and question tools → needs input. Claude's standalone
  Notification hook can also report permission/idle prompts.
- Worker failure → failed; ended session → ended briefly, then removed.
- A busy agent silent for five minutes → silent. It may still be working.
- The event log in `~/.stuntman/floor/events.jsonl` rotates near 5 MB. Writes
  use a short lock and fail open if the log is unavailable or contended.
- `STUNTMAN_FLOOR_DIR`, `STUNTMAN_FLOOR_PORT`, and `STUNTMAN_FLOOR_BOARD` support
  isolated testing. Default port: 4517. `--port 0` picks a free port.
