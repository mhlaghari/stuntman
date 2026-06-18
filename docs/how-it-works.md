# How stuntman works

The core harness is two small files and one idea — plus a rate-limit relay and
a scaffold/handoff project-memory loop layered on top. This doc is the idea, in
enough detail to modify or rebuild it.

## The core trick: Claude Code driving Claude Code

Claude Code respects `ANTHROPIC_BASE_URL`. Point it at any server that speaks
the Anthropic Messages API (`/v1/messages`) and you get a fully functional
Claude Code — agentic loop, file tools, bash, the lot — whose brain is
whatever model the server puts behind that endpoint.

[free-claude-code](https://github.com/Alishahryar1/free-claude-code) is such a
server: a local FastAPI proxy (default `localhost:8082`) that translates
Anthropic-API traffic to 17 backends (DeepSeek, OpenRouter, Groq, Gemini,
NVIDIA NIM, Ollama, …).

Claude Code also has a headless mode:

```bash
claude -p "do the thing" --output-format json
```

It runs the full agentic loop with no UI and prints a JSON result containing,
among other things, `result` (the final message) and `session_id`.

Put those together and your interactive, subscription-backed Claude Code
session can **spawn and manage a second Claude Code whose brain is nearly
free** — via nothing more exotic than its own Bash tool.

## The worker: `bin/stunt`

The wrapper exposes two verbs with one normalized JSON output shape
(`{"backend", "session_id", "result", "is_error"}`), dispatching to a backend
chosen by `STUNTMAN_WORKER`:

```
stunt exec "<spec>"                  # run the worker on a spec
stunt resume <session_id> "<text>"   # review feedback into the same session

backend claude (default):
        claude -p --output-format json --dangerously-skip-permissions
        + proxy env (via fcc-claude, or ANTHROPIC_BASE_URL directly)
        + CLAUDE_CONFIG_DIR=~/.claude-stuntman
        + optional --model pin (STUNTMAN_MODEL)

backend opencode:
        opencode run --format json [--model provider/model] [--session id]
        no proxy — opencode authenticates to providers natively
```

The isolated `CLAUDE_CONFIG_DIR` matters: without it, the worker shares
`~/.claude` with your real session — login state, session history, settings.
With it, the worker is a hermetically separate install that happens to share
the binary.

`fcc-claude` (the proxy's own launcher) is preferred when present because it
strips all `ANTHROPIC_*` variables from the environment before injecting the
proxy's own, and preflights that the server is actually up.

## The protocol: `skills/delegate/SKILL.md`

The skill is a set of instructions to the *orchestrating* Claude. The phases:

### 1. Plan

Claude explores the codebase and writes a spec **with zero open decisions**:
exact files, exact signatures, exact test code, exact verification commands.

This is the load-bearing wall. Cheap models fail at design and judgment, not
at typing. A spec that pre-makes every decision converts the task from "design
this" (worker fails) to "transcribe this" (worker excels). If you find the
worker failing reviews repeatedly, the spec was too vague — that's a planning
bug, not a worker bug.

The spec must be self-contained: the worker is a fresh process with no access
to the orchestrator's conversation.

### 2. Execute

```bash
stunt -p "$(cat /tmp/stunt-spec.md)" --output-format json --dangerously-skip-permissions
```

`--dangerously-skip-permissions` is what lets the worker edit files and run
tests unattended; it is also why you only delegate inside trusted repos.
The orchestrator parses `session_id` out of the JSON — that's the handle for
review rounds.

If the tree is dirty, the orchestrator snapshots `git status` / `git diff`
first, so review can isolate the worker's changes from pre-existing ones.

### 3. Review

The orchestrator (expensive model again) reads the full diff and **re-runs
the verification commands itself**. Worker claims of "all tests pass" are
treated as noise — models lie most confidently about their own work.

### 4. Iterate, then take over

```bash
stunt -p --resume <session_id> "Code review feedback — fix these: …" …
```

`--resume` reattaches to the worker's own session, so feedback lands with
full context of what it just did — much cheaper and more accurate than
re-explaining from scratch.

Two failed rounds is the cutoff. After that the task has demonstrated it
needs the expensive model, and the orchestrator finishes it directly. This
cap is what keeps the harness honest: it degrades to "Claude does it" rather
than looping a weak model forever.

## Cost model

| Phase | Model | Cost |
|---|---|---|
| Plan (explore + spec) | Claude (subscription) | the thinking you'd pay for anyway |
| Execute (the bulk of tokens) | worker model | ~free |
| Review (diff + verify) | Claude (subscription) | small — reading, not generating |
| Iterate | worker model | ~free |

Execution is where agentic coding burns tokens — tool loops, file dumps,
retries. That is exactly the part that moves off your subscription.

## Working across the 5-hour limit: `bin/window` + `skills/relay`

The plan → execute → review loop can outlast Claude's 5-hour usage window.
`relay` spans it.

`bin/window` reads that window at no token cost: it pulls the OAuth token
Claude Code already stores (macOS Keychain, or `~/.claude/.credentials.json`)
and GETs the same `oauth/usage` endpoint `/usage` uses. One JSON line:

```
{"five_hour_pct":62.0,"resets_at":"…","seconds_until_reset":9056,
 "blocked":false,"seven_day_pct":11.0,…}
```

No `/v1/messages` call, so it's safe to poll even mid-blackout.

`skills/relay/SKILL.md` is the loop logic the orchestrator follows:

1. **Detect.** Probe the window each iteration.
2. **Hand off at the cap.** At ≥90% utilization, save a handoff to
   `.stuntman/relay-state.json` and keep the stunt double executing in the
   background — the worker runs on your own key, untouched by Anthropic's limit.
3. **Resume at reset.** If the reset is ≤~55 min out, `ScheduleWakeup` fires
   Claude just after it and the loop continues hands-free. Longer gaps fall
   back to a ping-triggered resume — `ScheduleWakeup` is clamped to one hour,
   and Claude can't wake itself mid-blackout (the wakeup would 429).

The asymmetry is the whole point: the rate limit is Anthropic's, so the part
that keeps moving during the cap is precisely the part that doesn't run on
Anthropic.

## Project memory across sessions: `bin/scaffold` + `/scaffold` & `/handoff`

`/relay` spans the rate-limit gap; the `scaffold`/`handoff` pair spans the
*context* gap — a fresh session, or one after `/clear`. `/scaffold` is the
one-time setup; `/handoff` is the per-session resume.

`bin/scaffold` is the deterministic setup. Idempotently, and without clobbering:

- it inserts a marked contract (`<!-- stuntman:scaffold:start … end -->`) into
  `CLAUDE.md` — created if absent, appended if present, skipped if already there
  (it also recognizes the pre-0.5 `stuntman:handoff` marker);
- it creates the four **living docs** it references, each only if missing:
  `HANDOFF.md` (the baton — what changed, next step, gotchas), `STATUS.md` (the
  board — built / in progress / planned), `SPEC.md` (the contract — vision,
  principles, scope), and `STRATEGY.md` (the honest assessment + direction). Each
  self-declares as a living doc with a changelog.

The mechanism is just that `CLAUDE.md` auto-loads into every session. The
contract says two things: *read `HANDOFF.md` / `STATUS.md` first, assume zero
memory* and *update them (and `README.md`, if it changed) before you stop*. So
the project carries its own running memory.

`/handoff` (the `skills/handoff` instructions) is the runtime half: read those
docs + `README.md` + whatever the contract lists, orient, and continue — then
update the docs before stopping. `/scaffold` (the `skills/scaffold`
instructions) runs `bin/scaffold` and then populates the stubs from the
project's real state.

Two enforcement layers. The contract lives in the always-loaded `CLAUDE.md`, so
the read-first / update-before-stop steps are always in context (the soft layer).
A **Stop hook** (`hooks/handoff-guard.sh`, shipped with the plugin) backs it up:
in scaffolded projects only, if a turn changed code but left `HANDOFF.md` /
`STATUS.md` untouched, it blocks the stop once with a reminder. It respects
`stop_hook_active` (no loops), only acts where a `HANDOFF.md` exists, and fails
open — so it never traps you or touches non-scaffolded projects.

## Failure modes & mitigations

- **Vague spec → confident garbage.** Mitigation: the skill forbids open
  decisions; review catches what slips through.
- **Worker scope creep.** Mitigation: spec lists allowed files; review diffs
  against a baseline and flags anything extra.
- **Worker lies about verification.** Mitigation: orchestrator re-runs
  verification, always.
- **Infinite feedback loop.** Mitigation: hard 2-round cap, then take-over.
- **Proxy down.** Mitigation: preflight check; `fcc-claude` also preflights.
