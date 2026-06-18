#!/usr/bin/env bash
# stuntman Stop hook — nudge to keep the project-memory docs current.
#
# Acts ONLY in scaffolded projects (a HANDOFF.md at the project root). Everywhere
# else it exits silently. It NEVER hard-traps you: it blocks the stop at most once
# per stop (it respects stop_hook_active), and any error fails open.
#
# Trigger: code changed in the working tree but neither HANDOFF.md nor STATUS.md
# was touched this round → remind the agent to refresh them before stopping.
# Once HANDOFF.md/STATUS.md show up as modified, it goes quiet.

input="$(cat 2>/dev/null)"

# Parse stop_hook_active + cwd in one shot (cwd may contain spaces → line-split).
parsed="$(printf '%s' "$input" | python3 -c "
import json, sys
try: d = json.load(sys.stdin)
except Exception: d = {}
print('1' if d.get('stop_hook_active') else '0')
print(d.get('cwd', '') or '')
" 2>/dev/null)"
active="$(printf '%s\n' "$parsed" | sed -n 1p)"
proj="$(printf '%s\n' "$parsed" | sed -n 2p)"

# Already inside a stop-hook continuation → don't nag again.
[ "$active" = "1" ] && exit 0

[ -z "$proj" ] && proj="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$proj" 2>/dev/null || exit 0

# Only enforce where the project opted in by scaffolding.
[ -f HANDOFF.md ] || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

porcelain="$(git status --porcelain 2>/dev/null)"
[ -z "$porcelain" ] && exit 0   # clean tree → nothing to nudge about

non_doc=0
docs_touched=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  f="${line:3}"          # strip the "XY " status prefix
  f="${f##* -> }"        # rename: keep the new path
  case "$(basename "$f")" in
    HANDOFF.md|STATUS.md) docs_touched=1 ;;
    CLAUDE.md|SPEC.md|STRATEGY.md|README.md) : ;;   # docs, but don't count as "work"
    *) non_doc=1 ;;
  esac
done <<EOF
$porcelain
EOF

if [ "$non_doc" = "1" ] && [ "$docs_touched" = "0" ]; then
  python3 -c "import json; print(json.dumps({'decision': 'block', 'reason': 'stuntman: code changed but HANDOFF.md / STATUS.md were not updated. Per this project CLAUDE.md contract, refresh them (what changed, the next step, and the STATUS board) and any SPEC/STRATEGY/README the change touched, then stop again. This nudge fires once.'}))"
fi
exit 0
