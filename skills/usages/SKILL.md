---
name: usages
description: Show usage and limits for every stunt-double subscription on one board — Claude's 5-hour/weekly windows (live), Codex's 5-hour/weekly windows (from its last session snapshot), the DeepSeek balance behind opencode (live), and honest n/a rows for backends that expose nothing (agy, muse). Use when the user invokes /usages, asks "how much have I used", "what are my limits", "how much codex/claude do I have left", or wants worker usage without opening each app.
---

# stuntman: usages — one board for every subscription

Run the probe and present the board. Everything it reads is zero-token and
zero-cost — no worker is invoked.

## Run it

Read [host and tool setup](../runtime.md).

```bash
USAGES="$STUNTMAN_ROOT/bin/usages"
"$USAGES" --json
```

## Present it

Render a small table from the JSON — backend, window(s), % used, reset time,
freshness. Keep the reset times in the user's local timezone (the pretty mode
`"$USAGES"` already formats them if you prefer to show its output directly).

Explain freshness honestly:

- **claude** and **deepseek** are live probes (OAuth usage endpoint / balance
  API). DeepSeek is metered — its "limit" is the remaining balance, so flag a
  low balance (< $1) as worth topping up.
- **codex** is read from the last `rate_limits` snapshot in
  `~/.codex/sessions/` — as fresh as the last codex run. If `five_hour_expired`
  / `weekly_expired` is true, that window has reset since the snapshot (usage
  is back to ~0%). If `snapshot_age_s` is large (> a day), say so and mention
  that any `/delegate` codex run refreshes it.
- **agy** and **muse** genuinely expose nothing locally (Antigravity keeps
  quota server-side; Muse's event stream has no usage) — show them as n/a with
  that reason, not as an error.

If `claude.blocked` is true, point at `/relay` (spanning the cap is exactly
what it's for).

For Codex relay decisions, use `bin/codex-window` from the same bundle. It reads
local quota snapshots without probing Claude credentials or DeepSeek. An elapsed
reset is not evidence of current usage; check the host's `/status` if stale.

## Status line

In Claude Code, if the user asks for these numbers in their status line, wire
`"$USAGES" --statusline` into their existing statusline command — it prints a
compact worker segment (e.g. `CX 23%/5h 4%/wk · DS $0.89`), caches for 5
minutes (`~/.stuntman/usages-cache.txt`), and prints nothing on failure, so
it's safe to embed. Claude's own numbers are deliberately absent from it —
Claude Code's status line JSON already carries them natively.
In Codex, present the board in the conversation; do not write Claude's status
line configuration or assume Codex accepts the same command format.
