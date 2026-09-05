---
name: delegate
description: Delegate implementation to Stuntman's headless workers (Claude via proxy, opencode, Codex, Antigravity, or Muse). The current host plans, reviews the diff, verifies, and iterates. Use when asked to use Stuntman to delegate a task, send work to a stunt double, or run the delegate skill.
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

## 1. PLAN

Explore the codebase yourself and write a **self-contained
spec** to a temp file. The worker has NO access to this conversation, so the
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
- End with: "When done, run the verification commands and fix failures before
  finishing. Reply with a summary of changed files."

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
- Output is one JSON line:
  `{"backend", "session_id", "result", "is_error", "usage", "cost_usd"}`.
  Capture `session_id` (needed for iteration) and keep `usage`/`cost_usd`
  from every exec/resume call for the final report.
- If the repo is dirty, snapshot the baseline first
  (`git status --porcelain > /tmp/stunt-baseline.txt`, plus `git diff` of files
  you expect the worker to touch) so review covers only worker changes.
  Prefer delegating from a clean tree or a branch.

## 3. REVIEW (you — the second place expensive tokens go)

- `git diff` (against the baseline if the tree was dirty) and read every
  changed file.
- Check against the spec: correctness, edge cases, style match, no scope
  creep, no hallucinated APIs, no files touched beyond the spec.
- Run the verification commands yourself — never trust the worker's claim.

## 4. ITERATE or TAKE OVER

If review finds problems, send feedback to the SAME worker session:

```bash
"$STUNT" resume <session_id> "Code review feedback — fix these: ..."
```

Maximum 2 feedback rounds. If still broken after that, the task qualifies as
"heavy": fix the remaining issues yourself directly, and say so in the report.

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
