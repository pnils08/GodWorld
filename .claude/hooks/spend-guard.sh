#!/usr/bin/env bash
# spend-guard — no hand-run of a cron or wake script, and no paid model call, from a session without
# Mike's approval (builder 2026-11-21: "yes add, no call openrouter to spend in a cli session either").
#
#   PreToolUse hook on Bash. Reads tool JSON on stdin. spend-scan.js reads the command, follows the
#   script's requires, and refuses on a hit — dry-run flags included. Hard block (exit 2).
#   Crons are not tool calls and are untouched.
#   Unlock: Mike runs `! touch /root/GodWorld/.claude/.spend-unlock`; holds 60 minutes from that touch.
#   Claude may not create or touch it — any command naming it is blocked.
#
#   This was the second half of test-guard.sh. The test half (no test written or run without approval,
#   2026-11-20) was removed on the builder's word 2026-11-21: "Remove the test guard".
ROOT="/root/GodWorld"
UNLOCK="$ROOT/.claude/.spend-unlock"
UNLOCK_MIN=60

payload="$(cat)"
field() {
  printf '%s' "$payload" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    v=d
    for k in sys.argv[1].split('.'): v=v.get(k,'') if isinstance(v,dict) else ''
    print(v or '')
except Exception: print('')
" "$1" 2>/dev/null
}
tool="$(field tool_name)"
block() { echo "BLOCKED (spend-guard, 2026-11-21): $1 Hand-runs of cron scripts and paid model calls need Mike's approval; he unlocks with: ! touch $UNLOCK (60 min)." >&2; exit 2; }
unlocked() {
  [ -f "$UNLOCK" ] || return 1
  local age=$(( ( $(date +%s) - $(stat -c %Y "$UNLOCK" 2>/dev/null || echo 0) ) / 60 ))
  [ "$age" -lt "$UNLOCK_MIN" ]
}

[ "$tool" = "Bash" ] || exit 0
cmd="$(field tool_input.command)"
printf '%s' "$cmd" | grep -q '\.spend-unlock' && block "the spend unlock is Mike's to set, by hand."
why="$(printf '%s' "$payload" | node "$ROOT/.claude/hooks/spend-scan.js" 2>/dev/null)"; rc=$?
if [ "$rc" -ne 0 ]; then
  unlocked && exit 0
  [ -z "$why" ] && why="spend-scan failed to run (exit $rc); refused rather than guessed."
  block "$why"
fi
exit 0
