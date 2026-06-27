#!/usr/bin/env bash
# stuntman installer (non-plugin route).
# Copies the /delegate, /relay, /scaffold, /handoff, /wiki, and /launch skills to ~/.claude/skills/
# and the `stunt` worker, `window` usage probe, `scaffold`, and `wiki` tools to ~/.local/bin/.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.claude/skills/delegate" "$HOME/.claude/skills/relay" "$HOME/.claude/skills/scaffold" "$HOME/.claude/skills/handoff" "$HOME/.claude/skills/wiki" "$HOME/.claude/skills/launch" "$HOME/.local/bin"
cp "$HERE/skills/delegate/SKILL.md" "$HOME/.claude/skills/delegate/SKILL.md"
cp "$HERE/skills/relay/SKILL.md" "$HOME/.claude/skills/relay/SKILL.md"
cp "$HERE/skills/scaffold/SKILL.md" "$HOME/.claude/skills/scaffold/SKILL.md"
cp "$HERE/skills/handoff/SKILL.md" "$HOME/.claude/skills/handoff/SKILL.md"
cp "$HERE/skills/wiki/SKILL.md" "$HOME/.claude/skills/wiki/SKILL.md"
cp "$HERE/skills/launch/"* "$HOME/.claude/skills/launch/"
cp "$HERE/bin/stunt" "$HOME/.local/bin/stunt"
cp "$HERE/bin/window" "$HOME/.local/bin/window"
cp "$HERE/bin/scaffold" "$HOME/.local/bin/scaffold"
cp "$HERE/bin/wiki" "$HOME/.local/bin/wiki"
chmod +x "$HOME/.local/bin/stunt" "$HOME/.local/bin/window" "$HOME/.local/bin/scaffold" "$HOME/.local/bin/wiki"

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
echo "Done. In Claude Code, try:  /delegate <task>   ·   /loop relay <task>   ·   /scaffold   ·   /handoff   ·   /wiki   ·   /launch"
