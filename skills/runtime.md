# Running Stuntman in Claude Code and Codex

The host is the application running this conversation. It is independent of
`STUNTMAN_WORKER`, which selects the executor. Codex can plan and review while
any supported backend executes. Honor the user's chosen host and worker.

## Locate the bundled tools

For plugin installs, start in the directory containing the loaded `SKILL.md`
(`skills/<name>/`) and walk up two directories to the plugin root. Set `STUNTMAN_ROOT` to that actual
path; run `"$STUNTMAN_ROOT/bin/<tool>"` from the user's project directory.
Use the installed bundle before a command on PATH, which may be an older copy.
Never guess a cache version or assume the project directory is the plugin.

`CLAUDE_PLUGIN_ROOT` can supply the root when present. Codex sets `PLUGIN_ROOT`
and the Claude-compatible alias for hooks, but do not assume those variables
are injected into ordinary shell tool calls. Use the loaded skill's path.

The legacy `install.sh --claude` route puts skills in `~/.claude/skills/` and
helpers in `~/.local/bin/`. In that layout, set `STUNTMAN_ROOT` to `~/.local`
(expanded to an absolute path), use `~/.local/bin` for helpers and
the loaded launch skill's directory for `launch-workflow.js`.

## Host differences

| Capability | Claude Code | Codex |
|---|---|---|
| Invoke a skill | `/stuntman:delegate` or the installed short command | Select the Stuntman skill with `$` in CLI or `@` in the app; natural language works too |
| Project instructions | `CLAUDE.md` | `AGENTS.md` |
| Scaffold helper | `--host claude` (default) | `--host codex`; use `--host both` when requested |
| Usage probe for relay | `bin/window` (live Claude quota) | `bin/codex-window` (local snapshot, never live quota) |
| Parallel work | Available agent/Workflow tools | Available native subagent tools, bounded by host limits |
| Timed resume | Use scheduling only if actually available | Use scheduling only if actually available; otherwise save a handoff |

Use the host's own tools for reading, editing, questions, web research, and
background execution. Do not invoke a named tool that is absent. If parallel
agents are unavailable, perform the same phases sequentially; never pretend
an independent review or background task happened.

Stuntman's installed Stop hook is optional. Codex requires the user to trust
plugin hooks before running them; leave that trust decision to Codex. The
memory skills work through the instruction files even without hooks.

Delegation applies only to work the user authorized. Preserve host permissions,
user changes, and project constraints. Keep credentials in each backend's normal
configuration, never in prompts or handoff files.
