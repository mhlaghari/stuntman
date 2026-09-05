---
name: relay
description: Continue authorized Stuntman work around the current host's usage limit. Inspect Claude's live quota or Codex's local quota snapshot, save resumable state, and run already specified work on an independent worker when available. Use when asked to relay work across a usage reset or keep a task resumable at the limit.
---

# Stuntman relay

Read [host and tool setup](../runtime.md). The host plans and reviews; an
independent worker can execute a prepared spec while the host is capped.
The host's quota and the worker's quota may be shared: a Codex worker using
this Codex account does not provide extra capacity around its limit.

## Inspect the current host's window

In Claude Code, run `"$STUNTMAN_ROOT/bin/window"`. This uses Claude's live
usage endpoint, with `five_hour_pct`, `blocked`, `seconds_until_reset`,
`resets_at`, and `seven_day_pct`. If it returns an error, report that the
quota is unavailable; do not treat that as zero use.

In Codex, run `"$STUNTMAN_ROOT/bin/codex-window"`. This reads local session
files only, never credentials or a model. It returns `available`, `live: false`,
`snapshot_age_s`, `stale`, and `windows` containing `used_percent`,
`window_minutes`, `resets_at` (Unix seconds), and `expired`.

- A Codex snapshot is an observation, not a live quota check. Missing windows,
  `available: false`, `stale: true`, or elapsed resets mean current headroom
  is unknown. Use current host quota information if available, or explain
  that `/status` is needed. Never promise zero use after a reset.
- Treat a known window at 90% or higher as a reason to preserve a handoff.
  Check every reported window; a weekly cap can outlast the shorter reset.
- For a known cap, the relevant reset is the latest reset among the binding
  windows, not automatically the five-hour reset. If a binding window has no
  reset time, do not invent one.

## Continue or checkpoint

While the host has headroom, complete the next planning or review unit using
[delegate](../delegate/SKILL.md): prepare the exact spec, inspect the worker's
diff, and run verification yourself before advancing the queue.

As a cap approaches, write `.stuntman/relay-state.json` with:

- Host, task, acceptance criteria, and the current queue position.
- Worker backend, optional model pin, session ID (if issued), and process
  handle/PID while running. Keep credentials out of this file.
- Absolute project, spec, stdout, and stderr paths; baseline and verification
  commands; whether work is running, awaiting review, or awaiting execution.
- Observed quota timestamp, binding windows, and the exact next step.

Use task-specific files under `.stuntman/` so concurrent runs do not overwrite
one another. Preserve any existing state. Add the directory to `.gitignore`
when appropriate for the project.

If an already specified unit can run on a worker with independent capacity,
start it with the host's supported background-process facility and capture
its output. Keep the chosen backend and model fixed for later resume calls.
Do not start a worker on a shared capped account. If no independent worker is
configured, save the handoff and explain what is waiting.

A process started in a tool call is not necessarily detached from the host.
Only say it will survive the cap/session exit when the actual process facility
supports that lifetime. Confirm launch and retain its handle. Never infer
completion from the presence of a partially written output file.

## Resume scheduling

Use a scheduling tool only when the current host actually exposes one and
supports the required delay and persistence. Claude Code's `/loop` and
`ScheduleWakeup`, when present, are optional host facilities; do not issue
those calls in Codex or assume every Claude environment provides them.

If a supported wakeup was created, report its actual schedule. Otherwise
report the observed reset in the user's timezone and explain that the next
user message/new session must resume from the saved state. Do not claim that
sleeping in a tool call can wake a capped model automatically.

## On resume

1. Read the saved state and inspect the host's quota again.
2. Check whether the recorded process/session is still running before starting
   anything. Avoid duplicate execution.
3. Once the worker exits, read complete stdout and stderr, record the session
   ID and usage, and review the diff against the saved baseline.
4. Run verification, send any feedback to the same backend/session, and
   advance the queue only after review passes.

Report the quota source/freshness, completed work, what is still running or
waiting, and exactly how the next resume happens. Stuntman cannot guarantee
unattended review while the orchestrator itself has no capacity.
