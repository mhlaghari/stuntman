# Stuntman in Codex

Stuntman can use Codex as the orchestrator: Codex prepares the spec, a selected
worker executes it, and Codex reviews and verifies the result. The worker can
be Claude through the local proxy, opencode, Codex, Antigravity, or Muse.
`STUNTMAN_WORKER` still selects the executor; it does not select the host.

## Install

With a Codex CLI that exposes `codex plugin`:

```bash
codex plugin marketplace add mhlaghari/stuntman
codex plugin add stuntman@stuntman
```

From a checkout containing the Codex support:

```bash
./install.sh --codex
```

The script registers the checkout as the `stuntman` marketplace and installs
its plugin. It does not install worker backends, configure credentials, copy
files into Claude's settings, or trust hooks automatically. Keep a local source
checkout available for later updates, or register the GitHub source once your
changes are published. `./install.sh` and `./install.sh --claude` retain the
legacy Claude standalone installation.

Start a new Codex session/thread. Use the skill picker (`$` in CLI, `@` in the
app), or ask naturally:

- “Use Stuntman to delegate this task to opencode.”
- “Use Stuntman to scaffold project memory for Codex.”
- “Use Stuntman to continue from HANDOFF.md.”
- “Open the Stuntman floor to see my agents.”
- “Use Stuntman to plan this product's launch.”

For plugin updates, update the source and reinstall with
`codex plugin add stuntman@stuntman`, then open a new thread. During local
development, change the Codex manifest version's build metadata to invalidate
an already cached version; do not edit the installed cache directly.

## Host behavior

| Skill | Codex behavior |
|---|---|
| delegate | Codex plans and verifies; the existing `bin/stunt` wrapper runs and resumes the selected worker. |
| scaffold | `bin/scaffold --host codex` appends the memory contract to AGENTS.md and creates missing living docs. `--host both` adds both host contracts. |
| handoff | Reads HANDOFF/STATUS and the AGENTS.md contract, checks the working tree, then resumes the next step. |
| wiki | `bin/wiki --host codex` writes the vault's AGENTS.md; configure graphify through `codex mcp add`. |
| launch | Uses available native agents for research, strategy, two critiques, and Markdown/HTML compilation. Falls back to sequential work when agents are unavailable. |
| relay | Reads a local Codex quota snapshot and preserves resumable state. Uses independent workers and scheduling only when actually available. |
| floor | Bundled session hooks and worker events feed the local Vexel board. Reads Codex/Claude transcripts; prompting requires a ready foreground TUI in tmux. |
| usages | Shows the existing cross-provider board. The separate `codex-window` probe is used for Codex relay decisions. |

The bundled floor recorder observes sessions after hook trust and a restart.
Worker start/finish/failure events from `bin/stunt` do not depend on hook trust.
An empty board only means no retained events have arrived.

The optional Stop hook shares Codex's documented Claude-compatible hook fields
and environment variables. It nudges once when a scaffolded project's code
changes without a handoff update. Codex runs plugin hooks only after the user
reviews and trusts them. Memory still works through AGENTS.md without the hook.

## Dependencies and limits

- The helpers require Bash, Python 3.9 or newer, and Git. The existing Claude and DeepSeek
  live quota probes also use curl. macOS and Linux are the intended shell hosts;
  on Windows use a compatible environment such as WSL. Native PowerShell is not
  an installer target.
- Configure only the worker backend you choose. No Claude login or proxy is
  needed to use Codex memory, handoff, native launch planning, or Codex quota
  snapshots. The default worker is still `claude` through the local proxy;
  select another backend explicitly if that is not configured.
- `bin/codex-window` reads `CODEX_HOME/sessions` or `~/.codex/sessions`.
  It does not invoke a model or query an API. A new empty session falls back to
  the last session containing quota data. Missing or stale data is not live
  headroom; an elapsed reset does not prove the account's current use is zero.
- Codex workers using the orchestrator's account share that account's quota.
  There is no automatic escape from a cap by starting another Codex process.
  If scheduling is unavailable, relay saves a handoff for the next user message.
- Launch requires web tools for current research. The bundled
  `launch-workflow.js` is only for hosts that expose its Workflow runtime;
  Codex uses the same phases through its own tools. Independent critiques
  require actual independent agents; sequential critiques are self-review.
- Wiki graph construction and live query access still require graphify and
  the Python MCP package. Registering an MCP configuration does not verify a
  live connection; query it from a new session to confirm.
- The worker wrapper's `cost_usd: 0` for Codex means no dollar accounting is
  reported by this wrapper. Subscription capacity or API charges still apply.

## Validate

No credentials, live models, or network calls are needed for these checks:

```bash
python3 -m unittest discover -s tests -v
bash -n install.sh bin/scaffold bin/wiki hooks/handoff-guard.sh
```

After installing, `codex plugin list --marketplace stuntman --json` confirms
the installed bundle. A new Codex session must discover all eight skills.
Tests cover both host contracts, idempotency, legacy markers, paths with spaces,
quota rollover/weekly caps, installer failures, Stop-hook continuation, concurrent
floor events, worker results, transcript filtering, and guarded tmux/HTTP input.

## Verification recorded on 2026-09-05

- Codex CLI 0.153.4 installed and enabled the local marketplace plugin.
- A fresh Codex app-server `skills/list` returned all eight enabled
  `stuntman:` skills, with bundled helpers and the shared runtime reference present.
- All 31 offline compatibility and floor tests passed; plugin/skill validators and shell
  syntax checks passed.
- Floor browser checks passed at desktop, 390px, and 320px widths with no
  JavaScript errors or horizontal overflow. Keyboard operation, escaped
  content, empty/reconnect states, reduced motion, drafts, and refused sends
  were checked against isolated fixtures. Live Codex hook delivery still
  requires user trust in a new session.
- Live worker execution, a full launch research run, graphify connectivity, and
  an actual quota-cap/reset cycle were not exercised by this compatibility check.

## References

- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [Converting Claude plugins](https://developers.openai.com/plugins/guides/submit-claude-plugin)
- [Codex plugin hooks](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks)
