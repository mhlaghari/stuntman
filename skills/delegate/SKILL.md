---
name: delegate
description: Delegate implementation work to a cheap-model stunt double (a headless worker — Claude Code via a local proxy, or opencode — running DeepSeek/Groq/Ollama). Claude plans the task, the worker executes it, Claude reviews the diff and iterates. Use when the user invokes /delegate <task>, or says "delegate this" / "have the stunt double do it" / "send this to the worker". Saves expensive subscription tokens for planning and review only.
---

# stuntman: plan → execute → review

You (Claude, on subscription) are the **architect and reviewer**. A cheap
worker model (`stunt`) is the **executor**. Never implement the task yourself
unless the worker fails twice.

## Resolve the worker command

```bash
STUNT="$(command -v stunt || echo "${CLAUDE_PLUGIN_ROOT}/bin/stunt")"
```

Use `"$STUNT"` everywhere below. The worker backend is `$STUNTMAN_WORKER`
(`claude` via local proxy — the default — or `opencode`).

## Preflight

- Backend `claude` (default): check the proxy —
  `curl -s -m 2 http://localhost:8082/v1/models -H "x-api-key: freecc" -o /dev/null -w "%{http_code}"`.
  If unreachable, start `fcc-server` in the background (run_in_background),
  wait a few seconds, re-check. If still down, tell the user and stop.
- Backend `opencode`: check `opencode --version`. If missing, tell the user
  to install it (`brew install sst/tap/opencode`) and stop.

## 1. PLAN (you — this is where the expensive tokens earn their keep)

Explore the codebase yourself (Read/Grep/Glob) and write a **self-contained
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
- End with: "When done, run the verification commands and fix failures before
  finishing. Reply with a summary of changed files."

Keep task units small. For large work, split into multiple sequential
delegations, reviewing each before the next.

## 2. EXECUTE (the stunt double)

From the **project root**:

```bash
"$STUNT" exec "$(cat /tmp/stunt-spec.md)"
```

- Use a generous Bash timeout (600000); workers can be slow.
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

> Worker: 14,162 tokens (8,166 out) · $0.0002 · Claude spent: planning + review only

If the user wants their own (orchestrator) side measured too, point them at
`/cost` for the session or the per-message `usage` blocks in the session
transcript under `~/.claude/projects/<project>/`.

## Notes

- Backend `claude` = headless Claude Code + isolated
  `CLAUDE_CONFIG_DIR=~/.claude-stuntman` + a local Anthropic-compatible proxy
  (free-claude-code on :8082). Backend `opencode` talks to its provider
  directly — no proxy. Neither consumes Anthropic credits. Pin a model with
  `STUNTMAN_MODEL` (claude: proxy model id; opencode: `provider/model`).
- The worker runs without permission prompts (claude:
  `--dangerously-skip-permissions`; opencode: its default run policy) — only
  delegate within trusted project directories.
