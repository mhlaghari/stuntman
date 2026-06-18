#!/usr/bin/env bash
# stuntman installer (non-plugin route).
# Copies the /delegate, /relay, /scaffold, and /handoff skills to ~/.claude/skills/
# and the `stunt` worker, `window` usage probe, and `scaffold` tool to ~/.local/bin/.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.claude/skills/delegate" "$HOME/.claude/skills/relay" "$HOME/.claude/skills/scaffold" "$HOME/.claude/skills/handoff" "$HOME/.local/bin"
cp "$HERE/skills/delegate/SKILL.md" "$HOME/.claude/skills/delegate/SKILL.md"
cp "$HERE/skills/relay/SKILL.md" "$HOME/.claude/skills/relay/SKILL.md"
cp "$HERE/skills/scaffold/SKILL.md" "$HOME/.claude/skills/scaffold/SKILL.md"
cp "$HERE/skills/handoff/SKILL.md" "$HOME/.claude/skills/handoff/SKILL.md"
cp "$HERE/bin/stunt" "$HOME/.local/bin/stunt"
cp "$HERE/bin/window" "$HOME/.local/bin/window"
cp "$HERE/bin/scaffold" "$HOME/.local/bin/scaffold"
chmod +x "$HOME/.local/bin/stunt" "$HOME/.local/bin/window" "$HOME/.local/bin/scaffold"

echo "✓ /delegate skill  → ~/.claude/skills/delegate/"
echo "✓ /relay skill     → ~/.claude/skills/relay/"
echo "✓ /scaffold skill  → ~/.claude/skills/scaffold/"
echo "✓ /handoff skill   → ~/.claude/skills/handoff/"
echo "✓ stunt worker     → ~/.local/bin/stunt"
echo "✓ window probe     → ~/.local/bin/window"
echo "✓ scaffold tool    → ~/.local/bin/scaffold"

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
echo "Done. In Claude Code, try:  /delegate <task>   ·   /loop relay <task>   ·   /scaffold   ·   /handoff"
