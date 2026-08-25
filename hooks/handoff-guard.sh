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
# Separately, flag a project vault page that trails the latest commit by more
# than a week, throttled to at most once per project per day.

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
non_doc=0
docs_touched=0
handoff_reason=""
if [ -n "$porcelain" ]; then
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
    handoff_reason='stuntman: code changed but HANDOFF.md / STATUS.md were not updated. Per this project CLAUDE.md contract, refresh them (what changed, the next step, and the STATUS board) and any SPEC/STRATEGY/README the change touched, then stop again. This nudge fires once.'
  fi
fi

# Project vault pages should not silently drift behind the code they describe.
vault_reason=""
VAULT="${STUNTMAN_VAULT:-$HOME/Documents/Documents/MyProjects/laghari-vault}"
project_name="$(basename "$proj")"
page="$VAULT/wiki/projects/$project_name.md"
if [ -f "$page" ]; then
  page_date="$(sed -n '1,20s/^updated:[[:space:]]*//p' "$page" 2>/dev/null | head -1)"
  valid_page_date="$(printf '%s\n' "$page_date" | sed -n '/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/p')"
  if [ -n "$page_date" ] && [ "$valid_page_date" = "$page_date" ]; then
    commit_date="$(git log -1 --format=%cs 2>/dev/null)"
    if [ -n "$commit_date" ]; then
      epoch() { date -j -f "%Y-%m-%d" "$1" +%s 2>/dev/null || date -d "$1" +%s 2>/dev/null; }
      page_epoch="$(epoch "$page_date")"
      commit_epoch="$(epoch "$commit_date")"
      if [ -n "$page_epoch" ] && [ -n "$commit_epoch" ] &&
         [ "$((commit_epoch - page_epoch))" -gt 604800 ]; then
        today="$(date +%F 2>/dev/null)"
        marker_dir="$HOME/.claude/plugins/data/stuntman-stuntman"
        marker="$marker_dir/vault-nudge-$project_name"
        if [ -n "$today" ] && mkdir -p "$marker_dir" 2>/dev/null; then
          marker_date="$(cat "$marker" 2>/dev/null)"
          if [ "$marker_date" != "$today" ] && printf '%s\n' "$today" 2>/dev/null > "$marker"; then
            vault_reason="stuntman: the vault page wiki/projects/$project_name.md was last updated $page_date, but this project's latest commit is $commit_date — more than a week of drift. Run /vault to refresh the page (the graph refresh rides along). This nudge fires at most once per day."
          fi
        fi
      fi
    fi
  fi
fi

reason="$handoff_reason"
if [ -n "$vault_reason" ]; then
  [ -n "$reason" ] && reason="$reason "
  reason="${reason}${vault_reason}"
fi

if [ -n "$reason" ]; then
  STUNTMAN_STOP_REASON="$reason" python3 -c "import json, os; print(json.dumps({'decision': 'block', 'reason': os.environ['STUNTMAN_STOP_REASON']}))" 2>/dev/null
fi
exit 0
