#!/usr/bin/env bash
# stuntman installer: --codex installs the plugin; --claude is the legacy default.
# Copies all eight skills to ~/.claude/skills/ and bundled helpers to ~/.local/bin/.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

case "${1:---claude}" in
  --codex)
    [ "$#" -eq 1 ] || { echo "usage: ./install.sh [--claude|--codex]" >&2; exit 2; }
    command -v codex >/dev/null 2>&1 || { echo "Install Codex CLI first, then rerun ./install.sh --codex" >&2; exit 1; }
    codex plugin --help >/dev/null 2>&1 || { echo "Update Codex CLI to a version with 'codex plugin' support." >&2; exit 1; }
    codex plugin marketplace add "$HERE"
    codex plugin add stuntman@stuntman
    echo "Stuntman installed for Codex. Start a new thread and ask to use Stuntman."
    exit 0
    ;;
  --claude) [ "$#" -le 1 ] || { echo "usage: ./install.sh [--claude|--codex]" >&2; exit 2; } ;;
  --help|-h) echo "usage: ./install.sh [--claude|--codex]"; exit 0 ;;
  *) echo "usage: ./install.sh [--claude|--codex]" >&2; exit 2 ;;
esac

mkdir -p "$HOME/.claude/skills/floor/board/assets" "$HOME/.claude/skills/delegate" "$HOME/.claude/skills/relay" "$HOME/.claude/skills/scaffold" "$HOME/.claude/skills/handoff" "$HOME/.claude/skills/wiki" "$HOME/.claude/skills/launch" "$HOME/.claude/skills/usages" "$HOME/.local/bin"
cp "$HERE/skills/floor/SKILL.md" "$HOME/.claude/skills/floor/SKILL.md"
cp "$HERE/skills/floor/board/index.html" "$HOME/.claude/skills/floor/board/index.html"
cp "$HERE/skills/floor/board/assets/"* "$HOME/.claude/skills/floor/board/assets/"
cp "$HERE/skills/runtime.md" "$HOME/.claude/skills/runtime.md"
cp "$HERE/skills/delegate/SKILL.md" "$HOME/.claude/skills/delegate/SKILL.md"
cp "$HERE/skills/relay/SKILL.md" "$HOME/.claude/skills/relay/SKILL.md"
cp "$HERE/skills/scaffold/SKILL.md" "$HOME/.claude/skills/scaffold/SKILL.md"
cp "$HERE/skills/handoff/SKILL.md" "$HOME/.claude/skills/handoff/SKILL.md"
cp "$HERE/skills/wiki/SKILL.md" "$HOME/.claude/skills/wiki/SKILL.md"
cp "$HERE/skills/usages/SKILL.md" "$HOME/.claude/skills/usages/SKILL.md"
cp "$HERE/skills/launch/"* "$HOME/.claude/skills/launch/"
for helper in floor floor-hook stuntman-floor-run stuntman_floor.py stunt window codex-window scaffold stuntman_roster.py wiki usages; do
  # Replace the link itself, never write through a symlink into a source checkout.
  rm -f "$HOME/.local/bin/$helper"
  cp "$HERE/bin/$helper" "$HOME/.local/bin/$helper"
  chmod +x "$HOME/.local/bin/$helper"
done

echo "✓ /delegate skill  → ~/.claude/skills/delegate/"
echo "✓ /relay skill     → ~/.claude/skills/relay/"
echo "✓ /scaffold skill  → ~/.claude/skills/scaffold/"
echo "✓ /handoff skill   → ~/.claude/skills/handoff/"
echo "✓ /wiki skill      → ~/.claude/skills/wiki/"
echo "✓ /launch skill    → ~/.claude/skills/launch/"
echo "✓ stunt worker     → ~/.local/bin/stunt"
echo "✓ window probe     → ~/.local/bin/window"
echo "✓ scaffold tool    → ~/.local/bin/scaffold"
echo "✓ wiki tool        → ~/.local/bin/wiki"
echo "✓ usages board     → ~/.local/bin/usages"
echo "✓ /floor board     → ~/.local/bin/floor (wire standalone hooks with floor --wire-hooks)"

case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "⚠ ~/.local/bin is not on your PATH — add it to your shell profile." ;;
esac

if ! command -v fcc-server >/dev/null 2>&1; then
  echo
  echo "Next: install the proxy →  uv tool install free-claude-code"
  echo "Then configure a backend →  fcc-config   and start it →  fcc-server"
fi

echo
echo "Note: /scaffold's doc-update Stop hook ships with the plugin install only,"
echo "      not this script. Everything else works the same either way."
echo "      /wiki also uses graphify for the graph step →  pip install graphifyy"
echo
echo "Done. In Claude Code, try:  /delegate <task>   ·   /loop relay <task>   ·   /scaffold   ·   /handoff   ·   /wiki   ·   /launch   ·   /usages   ·   /floor"
