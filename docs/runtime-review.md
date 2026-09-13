# Stuntman runtime review

Reviewed 2026-09-14 against this checkout, installed CLI catalogs, and the linked
upstream documentation. The approved Floor keeps its detailed Dubai skyline,
one header logo, project filter and demo controls in the header, and expressive
guitar, headbang, rage, and completion poses.

## Planner and executor roles

`scaffold --host claude|codex|both` adds an agent inventory to the appropriate
`CLAUDE.md` and/or `AGENTS.md`. Its default policy puts **Fable in Claude Code**
and **GPT/Astra in Codex** in charge of specifications and review. Other models
execute bounded work through `stunt`. Explicit user choices override these defaults.
The inventory does not select a new active model or configure credentials.

The recommended next development step is runtime worker selection, bounded
retries, approved fallback choices, and recorded escalation. These controls are
planned, not delivered by the roster. The intended workflow uses one Fable/Astra
lead for specs and review, delegates routine work, and reserves lead implementation
for exceptional difficulty. Direct OpenCode is the starting route; OmniRoute can
be evaluated if cross-provider failover becomes necessary.

| Worker backend | Inventory source | What it establishes |
| --- | --- | --- |
| `claude` | CLI presence; proxy preflight instructions | Proxy executor exists as a supported route; Fable in the host is a separate role. |
| `opencode` | CLI presence and `opencode models` | Provider/model IDs currently advertised to the CLI. |
| `codex` | CLI presence and local `models_cache.json` slugs | Cached model names, including `gpt-6-astra` on the reviewed machine. |
| `agy` | CLI presence and `agy models` | Antigravity's advertised Gemini, Claude, and GPT-OSS models. |
| `muse` | CLI presence and selection instructions | Installed CLI; no model or account entitlement probe. |

Installed does not mean authenticated. Discovery times out after five seconds
per CLI and makes no inference calls. A rerun refreshes only the managed roster
block, preserving memory documents and surrounding user rules. Keep overrides
outside the markers. Missing or malformed catalogs remain explicitly unknown.

The role split is a project preference, not a vendor restriction. OpenAI describes
Astra as suited to demanding workflows across multiple steps and tools; availability
depends on the account and rollout. [OpenAI model guide](https://learn.chatgpt.com/docs/models)

## Can Fable or Astra delegate to free OpenCode models?

Yes, when the host has shell access and Stuntman installed. `bin/stunt` already
supports `STUNTMAN_WORKER=opencode`, a pinned `STUNTMAN_MODEL=provider/model`, and
same-session feedback. No extra router is needed. The host writes the spec,
OpenCode executes it, and the host checks the diff and runs verification.

The local catalog included `opencode/muse-spark-1.3-contributor-free`,
`opencode/mimo-v2.5-free`, and Nemotron free variants. OpenCode's own price table
lists these as free, with time-limited availability. A model's name alone is not
a lasting price guarantee. [OpenCode Zen](https://opencode.ai/docs/zen/)

This review used the Muse Spark 1.3 Contributor Free route for real implementation
and feedback. Stuntman does not automatically substitute a paid model when a free
one fails. Upstream accounts and provider configurations retain their own billing
and routing policies; check those before treating any workflow as strictly free.

## Vault updates: what actually happens

The vault has three separate layers:

1. **Markdown notes:** agents update the affected project page, recent context,
   lessons, index, and log after meaningful work. A scaffold is an instruction
   contract; it is not a filesystem watcher or background summarizer.
2. **Knowledge graph:** rerun the Stuntman `/wiki` skill to refresh affected notes
   and perform semantic extraction/build/export. The installed Graphify 0.5.0
   implementation of `graphify update` calls `_rebuild_code`; it explicitly directs
   document changes to the assistant's semantic workflow. That command alone does
   not refresh a Markdown vault. The generated instructions now say this correctly.
3. **MCP queries:** the configured graph server loads its graph at session start.
   Restart that connection or begin a new host session after rebuilding.

The Stuntman Stop hook can nudge when a project's `updated:` date trails its latest
commit by more than seven days. It does not rewrite the note. Existing vault
contracts are preserved by the scaffolder; their old refresh wording needs a
deliberate update when maintaining those vaults.

The existing personal vault already had a Markdown-aware frontmatter/wikilink
refresh helper and separate scheduled jobs. Its Stuntman page and graph were
refreshed through that helper during this review. This is distinct from a full
semantic re-extraction: unchanged pages retain
their curated graph contributions, while changed pages get their explicit links
re-extracted. Custom schedules also need health checks; a configured interval alone
does not establish successful execution. Stuntman's generic scaffolder installs
neither those schedules nor that custom helper.

## Windows support

| Surface | Current status |
| --- | --- |
| macOS Stuntman workflow | Exercised locally: helpers, Floor, delegation, and offline tests. |
| Windows browser displaying the Floor | Standard HTML/CSS/JS; a running local backend is still required. Not verified on a Windows machine in this review. |
| Native PowerShell/CMD helpers | Not supported end to end. Bash launchers and Unix `fcntl`, `ps`, and tmux dependencies remain. |
| WSL | Plausible route for the Unix tools, but the full Stuntman workflow remains unverified. Install and authenticate the host and workers inside the same WSL environment. |
| Vault notes | Portable Markdown; rebuild machine-specific interpreter/MCP paths and graph configuration on the destination machine. |

OpenCode supports Windows and recommends WSL for terminal/tool compatibility.
That upstream support does not establish support for all Stuntman helpers.
[OpenCode Windows guide](https://opencode.ai/docs/windows-wsl/)

## OmniRoute versus OmniRouter

Several projects use similar names. **OmniRoute by diegosouzapw** is the closest
match to the description of a gateway with many free providers; this identification
is an inference because no repository URL was supplied. It documents an
OpenAI-compatible gateway, provider routing, and fallback. Its free-tier figures
aggregate different provider pools and signup allowances, rather than granting
every user one unlimited allowance. [OmniRoute repository](https://github.com/diegosouzapw/OmniRoute)

Its OpenCode integration generates a provider configuration with
`@ai-sdk/openai-compatible` and a local `/v1` endpoint. Once configured and verified,
Stuntman's existing OpenCode backend could select an `omniroute/<model-or-combo>`
ID exposed in that catalog. This is documented compatibility, not an integration
tested by this review. The fetched guide carries an inconsistent future update
date, so validate commands against an installed version before using them.
[OmniRoute OpenCode guide](https://github.com/diegosouzapw/OmniRoute/blob/main/docs/frameworks/OPENCODE.md)

For a strictly free route, every member of a fallback combination must be eligible
and free for that account; rate limits, temporary promotions, shared quotas, and
one-time signup credits still apply. The upstream free-tier guide distinguishes
these categories. [OmniRoute free-tier methodology](https://github.com/diegosouzapw/OmniRoute/blob/main/docs/reference/FREE_TIERS.md)

The separate **omnilabs-ai/OmniRouter** repository describes a unified model API
and cost-based switching; it does not establish the same free-provider proposition.
[OmniRouter repository](https://github.com/omnilabs-ai/OmniRouter)

Use the working direct OpenCode route first. Evaluate OmniRoute in an isolated
configuration if multi-provider failover becomes necessary. No router was
installed, no account was connected, and no provider configuration was changed
as part of this review.
