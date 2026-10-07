---
name: delegate
description: Delegate implementation or read-only research to Stuntman's headless workers (Claude via proxy, opencode, Codex, Antigravity, or Muse). The current host plans, reviews the diff, verifies, and iterates. Use when asked to use Stuntman to delegate a task, send work or research to a stunt double, or run the delegate skill.
---

# stuntman: plan → execute → review

Read [host and tool setup](../runtime.md) first. You, in Claude Code or Codex,
are the **architect and reviewer**. A
worker model (`stunt`) is the **executor**. Never implement the task yourself
unless the worker fails twice.

## Resolve the worker command

```bash
STUNT="$STUNTMAN_ROOT/bin/stunt"
```

Use `"$STUNT"` everywhere below. The worker backend is `$STUNTMAN_WORKER`
(`claude` via local proxy — the default —, `opencode`, `codex`, `agy`, or
`muse`).

If the user specifies a worker, set `STUNTMAN_WORKER` for every exec and resume
call. Otherwise preserve their environment/default. Save the backend and any
model pin with the session ID so review resumes the same provider. Running in
Codex does not automatically select Codex as the worker.

### Several workers: `STUNTMAN_WORKER_ORDER`

The user can list more than one worker, most preferred first, each with an
optional model:

```bash
STUNTMAN_WORKER_ORDER="agy=gemini-3.8-flash-high opencode=opencode/big-pickle codex"
```

When it is set and the user named no worker for this task, spread the work
across the list instead of sending everything to one backend:

- **One unit:** the first listed worker that passes the probe below.
- **Several units that touch different files:** give each to a different listed
  worker and run them in parallel.
- **Scouts (step 0):** prefer a listed worker that is free or flat-rate; keep
  the strongest model for the hardest unit.
- **A worker fails its probe, or two feedback rounds:** move the unit to the
  next listed worker once before you take it over (step 4).

Set `STUNTMAN_WORKER` on each call, plus `STUNTMAN_MODEL` when the entry has
`=model`; an entry without one uses that backend's own default. Record which
worker ran each unit.

**Probe before a large delegation.** Subscription workers run out without
warning. Send a one-line prompt with the same `STUNTMAN_WORKER` /
`STUNTMAN_MODEL` (`"$STUNT" exec "Reply with the single word ok."`). If it
returns `is_error` or a quota message, pick another model or backend and tell
the user which one you used.

## Preflight

- Backend `claude` (default): check the proxy —
  `curl -s -m 2 http://localhost:8082/v1/models -H "x-api-key: freecc" -o /dev/null -w "%{http_code}"`.
  If unreachable, start `fcc-server` with the host's background execution tool,
  wait a few seconds, re-check. If still down, tell the user and stop.
- Backend `opencode`: check `opencode --version`. If missing, tell the user
  to install it (`brew install sst/tap/opencode`) and stop.
- Backend `codex`: check `codex --version` and `codex login status`. If the
  CLI is missing, tell the user to install it (`npm install -g @openai/codex`)
  and stop. If not logged in, tell the user to run `codex login` and stop.
- Backend `agy`: check `agy --version`. If missing, tell the user to install
  Google Antigravity (the `agy` CLI ships with it; `agy install` wires the
  PATH) and stop.
- Backend `muse`: check `muse --version`. If missing, tell the user to install
  Meta's Muse Code CLI and run `muse login`, then stop.

## 0. SCOUT (optional — let a worker do the reading)

Your own reading is the largest cost in this loop: every file you open is
resent on every later turn. When the area is large or unfamiliar, or the
question needs web research, send a read-only scout before you plan:

- Ask numbered questions, and say what the answers are for.
- Include: "Do not edit, create or delete any file."
- Ask for evidence: `path:line` for code, a URL for web claims.
- Cap the reply: "Reply in at most 30 lines."

Run it like any exec (step 2). Check `git status` afterwards — a scout that
changed files broke its brief. Verify any number or claim your plan depends
on: scouts are fast, not authoritative.

## 1. PLAN

Explore the codebase yourself (or read the scout's report) and write a
**self-contained spec** to a temp file. The worker has NO access to this conversation, so the
spec must include:

- Exact goal and acceptance criteria.
- Files to create/modify with absolute or repo-relative paths, and precisely
  what changes to make (signatures, behavior, edge cases). Decide everything
  yourself — leave the worker zero design decisions. Weak models executing
  great instructions beat strong models executing vague ones.
- Constraints: match existing style, no extra refactors, no new dependencies
  unless listed, never run git write commands.
- Verification: the exact commands that must pass (tests, build, lint),
  including any env activation they need.
- Include: "You are the Stuntman executor. Implement directly; do not delegate
  or launch more Stuntman workers." This avoids recursive delegation when the
  worker also has Stuntman installed.
- A loop cap: "If verification still fails after 3 attempts, stop and report
  what fails." A worker that self-tests without limit costs what a lead costs.
- End with: "When done, run the verification commands and fix failures before
  finishing. Reply in at most 10 lines: files changed, verification result,
  anything unfinished." The reply lands in your context, so keep it short.

Keep task units small. For large work, split into multiple sequential
delegations, reviewing each before the next.

## 2. EXECUTE (the stunt double)

From the **project root**:

```bash
"$STUNT" exec "$(cat /tmp/stunt-spec.md)"
```

- Use the host's supported long-running process mechanism; workers can be slow.
  Retain the process handle and capture stdout/stderr to task-specific files
  when needed. An output file is not complete until the process exits. Never
  start a replacement worker just because the first poll returned no output.
- **Wait, don't poll.** Start the worker in the background and wait for it to
  exit; Claude Code notifies you when a background command finishes. Every "is
  it done yet?" check resends your whole context and returns nothing.
- Output is one JSON line:
  `{"backend", "session_id", "result", "is_error", "usage", "cost_usd"}`.
  Capture `session_id` (needed for iteration) and keep `usage`/`cost_usd`
  from every exec/resume call for the final report.
- If the repo is dirty, snapshot the baseline first
  (`git status --porcelain > /tmp/stunt-baseline.txt`, plus `git diff` of files
  you expect the worker to touch) so review covers only worker changes.
  Prefer delegating from a clean tree or a branch.

## 3. REVIEW (you — the second place expensive tokens go)

- **Gate, then look.** Run the verification commands yourself first — never
  trust the worker's claim. If the gate fails, send the failing output back
  (step 4); do not read the code to find the bug for the worker.
- Then read `git diff` (against the baseline if the tree was dirty). Read the
  diff, not whole files; open a full file only where the diff is unclear.
- Check against the spec: correctness, edge cases, style match, no scope
  creep, no hallucinated APIs, no files touched beyond the spec.

## 4. ITERATE or TAKE OVER

If review finds problems, send feedback to the SAME worker session:

```bash
"$STUNT" resume <session_id> "Code review feedback — fix these: ..."
```

Maximum 2 feedback rounds. If still broken after that and
`STUNTMAN_WORKER_ORDER` lists another worker, hand the unit to the next one
once: a fresh exec with the same spec plus the failing output. If that also
fails, or there is no other worker, the task qualifies as "heavy": fix the
remaining issues yourself directly, and say so in the report.

## Report to the user

End with: what was delegated, which backend/model executed, what review
found, iterations needed, and verification results. Be explicit about
anything you had to fix yourself.

Always include a cost line, summing `usage`/`cost_usd` across all worker
calls (exec + resumes):

> Worker: 14,162 tokens (8,166 out) · $0.0002 · Orchestrator: planning + review

For orchestrator usage, use the current host's session accounting. Claude Code
offers `/cost`; Codex offers `/status` for limits and its own usage telemetry.
Never infer orchestrator tokens from the worker totals.

## Notes

- Backend `claude` = headless Claude Code + isolated
  `CLAUDE_CONFIG_DIR=~/.claude-stuntman` + a local Anthropic-compatible proxy
  (free-claude-code on :8082). Backend `opencode` talks to its provider
  directly — no proxy. Backend `codex` runs `codex exec`/`codex exec resume`
  directly — no proxy, no isolated config; it reuses the user's own
  `codex login` (ChatGPT subscription or API key), same as running `codex`
  interactively, so worker sessions land in the same `codex resume` history.
  Backend `agy` runs Google's Antigravity CLI headlessly (`agy -p`), reusing
  the user's own Antigravity subscription login — its roster (`agy models`)
  spans Gemini 3.x, Claude Sonnet/Opus, and GPT-OSS. The wrapper passes
  `--add-dir "$PWD"` (without it agy edits its own scratch workspace, not the
  project) — so specs for agy should use absolute paths. Backend `muse` runs
  Meta's Muse Code CLI headlessly (`muse exec --json`; resume is `muse exec
  --session-id <id>` — plain `muse resume` is TUI-only), reusing the user's
  own `muse login`; it emits no token usage, so usage reads zeros. Grok and
  Kimi models route through the `opencode` backend (`xai/…` /
  `moonshotai/…` with the matching key). Worker usage is recorded separately
  from the orchestrator's per-call accounting. A worker using the same subscription
  as the host can share its quota. Pin a model with `STUNTMAN_MODEL`
  (claude: proxy model id; opencode: `provider/model`; codex: a model id
  accepted by `codex exec -m`; agy: an id from `agy models`; muse: an id
  accepted by `muse exec --model`).
- The worker runs without permission prompts (claude and agy:
  `--dangerously-skip-permissions`; opencode: its default run policy; codex:
  `-s workspace-write`, sandboxed to the project directory but no per-action
  approval; muse: `--approval-mode never` with muse's OS sandbox left ON) —
  only delegate within trusted project directories.
- Codex, agy, and muse report `cost_usd: 0` because this wrapper has no dollar
  accounting for them. This does not mean free execution; Codex can also use
  metered API-key billing. Muse additionally reports zero token usage (its event stream
  has no usage data) — say "usage not reported by muse" in the cost line.
