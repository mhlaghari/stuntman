#!/usr/bin/env bash
# stuntman installer (non-plugin route).
# Copies the /delegate skill to ~/.claude/skills/ and the `stunt` worker
# wrapper to ~/.local/bin/.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.claude/skills/delegate" "$HOME/.local/bin"
cp "$HERE/skills/delegate/SKILL.md" "$HOME/.claude/skills/delegate/SKILL.md"
cp "$HERE/bin/stunt" "$HOME/.local/bin/stunt"
chmod +x "$HOME/.local/bin/stunt"

echo "✓ /delegate skill  → ~/.claude/skills/delegate/"
echo "✓ stunt worker     → ~/.local/bin/stunt"

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
echo "Done. In Claude Code, try:  /delegate <task>"
