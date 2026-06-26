---
name: wiki
description: Scaffold an LLM-wiki "second brain" for the current folder in one shot — lays the vault skeleton, writes a note per project from its README/code, builds a graphify knowledge graph, and wires the graphify MCP so Claude can query prior work across projects. Auto-detects a single project vs a folder of many projects. Use when the user invokes /wiki, says "scaffold the LLM wiki", "build a second brain here", "graphify this folder", or "turn these projects into a knowledge base".
---

# stuntman: wiki — stand up an LLM-wiki second brain + graphify

`/scaffold` gives one project a memory; **`/wiki`** gives a whole *folder of projects*
a shared brain: a navigable Obsidian vault of notes-about-projects, a graphify
knowledge graph, and a live MCP so any future session can ask *"did I already solve this?"*
across everything.

It's the Karpathy "LLM wiki" pattern, automated. Run it once in the target folder.

## Dependencies
- **graphify** (`pip install graphifyy`, or the user's `/graphify` skill) — builds the graph.
- **mcp** python package + the **`claude`** CLI — to wire the live query server.
The skill installs/checks these along the way; if one is truly unavailable, do that step's fallback and tell the user.

## What to do

### 1. Scaffold the skeleton (deterministic, idempotent)
```bash
WIKI="$(command -v wiki || echo "${CLAUDE_PLUGIN_ROOT}/bin/wiki")"
"$WIKI"            # current folder; or:  "$WIKI" /path/to/folder
```
Read its output: `VAULT=…`, `MODE=single|folder`, and (folder mode) the `PROJECTS:` list.
Never clobbers — re-running only fills gaps. `$VAULT` is `<folder>-wiki/`.

### 2. Ensure graphify is installed
Resolve an interpreter that can `import graphify` (uv tool / pipx / venv / system). If none,
`pip install graphifyy -q` (add `--break-system-packages` if needed). Save the interpreter path to
`$VAULT/graphify-out/.graphify_python` for later steps.

### 3. Populate the notes from reality
Write notes that a reader with zero memory of the codebase can use. Follow the schema in
`$VAULT/CLAUDE.md` (frontmatter + Summary / Architecture / Connections / Notable).

- **MODE=folder:** one `$VAULT/wiki/projects/<name>.md` per detected project. For more than ~4
  projects, **dispatch parallel `general-purpose` subagents** (one per cluster of 3–5 projects)
  to read each project's README / manifest / structure / key entry files and return a structured
  summary; then **author the notes centrally** so cross-links are consistent (linking needs a
  global view of all projects). Group projects into families and write `wiki/_PROJECTS_MOC.md`,
  fill `wiki/index.md`, and seed `wiki/hot.md`. Create a `wiki/concepts/` or `wiki/patterns/` note
  **only** where a pattern genuinely spans ≥3 projects.
- **MODE=single:** read the current project and write one `wiki/projects/<folder>.md`; point
  `index.md` and `hot.md` at it.
- **Selective linking** is the quality lever — 2–4 high-signal `[[wikilinks]]` per note, only where
  one project genuinely informs another. Capture any ⚠️ secrets/security issues in `wiki/lessons-learned/`.

### 4. Build the graph
Run graphify over `$VAULT/wiki` (the notes, not the project code — keeps it fast and at the right
altitude). Preferred: invoke the **`/graphify`** skill on `$VAULT/wiki`. If that skill isn't present,
run the pipeline directly with the saved interpreter: detect → semantic-extract the notes via
`general-purpose` subagents → `build_from_json` → `cluster` → `report.generate` → `export.to_json` /
`to_html`, and `export.to_canvas` into `$VAULT/graph.canvas`. Output lands in `$VAULT/graphify-out/`
(`graph.html`, `graph.json`, `GRAPH_REPORT.md`).

### 5. Wire the live MCP (so Claude queries it automatically later)
```bash
INTERP="$(cat "$VAULT/graphify-out/.graphify_python")"
"$INTERP" -c "import mcp" 2>/dev/null || uv pip install --python "$INTERP" mcp -q || "$INTERP" -m pip install mcp -q
NAME="$(basename "$VAULT")"          # e.g. myprojects-wiki
claude mcp remove "$NAME" --scope user 2>/dev/null || true
claude mcp add "$NAME" --scope user -- "$INTERP" -m graphify.serve "$VAULT/graphify-out/graph.json"
claude mcp list | grep "$NAME"       # expect ✔ Connected
```
The server loads `graph.json` at session start, so the brain is queryable from the user's **next**
session. (If `claude` CLI is unavailable, print the exact `claude mcp add` command for them to run.)

### 6. Report
Show: the vault path, project/concept counts, and from `GRAPH_REPORT.md` the **God Nodes** and
**Surprising Connections**. Tell the user to open `$VAULT` as a vault in Obsidian (graph view is
pre-colored; `graph.canvas` is the community layout), that the `<name>` MCP is live next session,
and the maintenance loop: re-run `/wiki` (or `graphify update wiki` from the vault) after meaningful
work to refresh the graph. Optionally offer to add a "check the second brain before rebuilding"
note to their global `~/.claude/CLAUDE.md`.

## Notes
- **Notes only, never code.** The vault holds summaries/lessons; project code stays in its own folder, untouched.
- **Idempotent.** Safe to re-run — the scaffolder skips existing files; re-running mainly refreshes notes + graph.
- Pairs with `/scaffold` (per-project memory) and the graphify MCP (cross-project recall): scaffold makes
  one project resumable; `/wiki` makes the *whole portfolio* searchable.
