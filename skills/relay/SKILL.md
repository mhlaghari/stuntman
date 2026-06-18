---
name: relay
description: Run long work across Claude's 5-hour usage limit automatically. A rate-limit-aware self-loop — it reads your 5-hour window (utilization + exact reset time) at zero token cost, keeps the cheap stunt double executing while Claude is capped (the worker has no Anthropic limit), and resumes the Claude side the moment the window reopens. Use when the user invokes /relay, says "keep working across the limit", "resume when my 5-hour limit resets", "don't let the rate limit stop the loop", or sets a long autonomous task that may outlast the window.
---

# stuntman: relay — work across the 5-hour window

The 5-hour limit shouldn't stall a long run. This loop **detects** how much of
the window is gone and exactly when it resets, **keeps the second unit (the
stunt double) rolling** while Claude is capped, and **picks up the Claude side**
as soon as the window is open again.

## The window probe

```bash
WINDOW="$(command -v window || echo "${CLAUDE_PLUGIN_ROOT}/bin/window")"
STUNT="$(command -v stunt || echo "${CLAUDE_PLUGIN_ROOT}/bin/stunt")"
"$WINDOW"
# → {"five_hour_pct":62.0,"resets_at":"...","seconds_until_reset":9056,
#    "blocked":false,"severity":"normal","seven_day_pct":11.0,...}
```

Zero tokens, no Claude call — safe to poll even mid-blackout. If it returns
`{"error":...}` (token missing/expired), tell the user and stop.

## How it runs

Self-paced loop. Start it with **`/loop` and no interval**, e.g.
`/loop relay <task> across the limit`. Omitting the interval lets you self-pace
via `ScheduleWakeup`, using the probe to decide when to wake next. Invoked
directly (`/relay`) without `/loop`, it does a single detect → act → arm cycle.

Tunable constant:

- `PAUSE_AT = 90` (%). At/above this, treat the Claude window as effectively
  closed and stop spending Claude tokens — leaving headroom to hand off cleanly.

## Each iteration

1. **Probe** `"$WINDOW"`.

2. **Window open** (`five_hour_pct < PAUSE_AT` and not `blocked`): do the next
   *Claude-side* unit — plan the next spec, or review the worker's last output
   (git diff + run the verification yourself; never trust the worker's claim).
   Advance the task queue. If running unattended, `ScheduleWakeup` a short
   interval (e.g. 300–600s, stays cache-warm) to check back; otherwise continue
   interactively.

3. **Window closed** (`five_hour_pct >= PAUSE_AT` or `blocked`):
   a. **Save a handoff** to `.stuntman/relay-state.json` in the project: the
      task, queue position, the worker `session_id`, and exactly what to resume.
   b. **Keep the second unit rolling.** If execution work is already spec'd,
      hand it to the stunt double — it bills your own near-free key, not
      Anthropic, so the cap doesn't touch it. Run it `run_in_background`:
      `"$STUNT" exec "$(cat /tmp/stunt-spec.md)"` (or `"$STUNT" resume <sid> ...`).
      Capture `session_id`/`usage` per the `/delegate` contract.
   c. **Arm the resume** off `seconds_until_reset`:
      - **≤ 3300s (~55 min):** `ScheduleWakeup(delaySeconds = seconds_until_reset + 90)`.
        Claude wakes itself just after reset and continues — fully hands-free.
      - **> 3300s:** `ScheduleWakeup` is clamped to 1 hour and Claude can't wake
        itself mid-blackout (a wakeup that fires while still capped just 429s).
        So report: *"Capped — resets at <local time>. The stunt double is
        handling <X> meanwhile. Ping me anytime after that and I'll pick up from
        the handoff."* Resume is then triggered by the user's next message.
   d. **Report:** current `five_hour_pct`, reset time (localized from
      `resets_at`), what the worker is doing, and how resume will happen.

## Resume (on a scheduled wakeup, or the user's ping after reset)

1. Probe `"$WINDOW"`. If still `blocked`, re-arm / notify as above.
2. If open: read `.stuntman/relay-state.json`, **review whatever the worker
   produced during the cap** (git diff + run verification), then continue the
   task queue from where it paused.

## Notes

- The probe hits the same OAuth usage endpoint as `/usage` (`five_hour` +
  `seven_day`); it spends no tokens and makes no Claude call.
- `ScheduleWakeup` is clamped to `[60, 3600]`s — that's why gaps over ~55 min
  fall back to a ping-triggered resume. For a scheduled wakeup to fire, the
  machine must be awake and online at that time.
- Watch `seven_day_pct` too — if the weekly limit is the binding one, no
  amount of waiting for the 5-hour reset helps; say so.
- During the cap only the worker runs (opencode / local-proxy backend); see
  `/delegate` for the full plan → execute → review worker contract.
- State lives in `.stuntman/relay-state.json` — add `.stuntman/` to
  `.gitignore`.
