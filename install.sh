#!/usr/bin/env bash
# stuntman installer (non-plugin route).
# Copies the /delegate and /relay skills to ~/.claude/skills/ and the `stunt`
# worker + `window` usage probe to ~/.local/bin/.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.claude/skills/delegate" "$HOME/.claude/skills/relay" "$HOME/.local/bin"
cp "$HERE/skills/delegate/SKILL.md" "$HOME/.claude/skills/delegate/SKILL.md"
cp "$HERE/skills/relay/SKILL.md" "$HOME/.claude/skills/relay/SKILL.md"
cp "$HERE/bin/stunt" "$HOME/.local/bin/stunt"
cp "$HERE/bin/window" "$HOME/.local/bin/window"
chmod +x "$HOME/.local/bin/stunt" "$HOME/.local/bin/window"

echo "✓ /delegate skill  → ~/.claude/skills/delegate/"
echo "✓ /relay skill     → ~/.claude/skills/relay/"
echo "✓ stunt worker     → ~/.local/bin/stunt"
echo "✓ window probe     → ~/.local/bin/window"

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
echo "Done. In Claude Code, try:  /delegate <task>   or   /loop relay <task> across the limit"
