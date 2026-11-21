#!/usr/bin/env bash
# test-guard — no test written or run without Mike's approval (2026-11-20: "Place a block on your
# ability to write and run tests without my approval").
#
#   PreToolUse hook. Reads tool JSON on stdin. Hard block (exit 2) on:
#     - writing a test file: Write/Edit/NotebookEdit on *.test.js|mjs|cjs|ts, *.spec.*, a __tests__/ or
#       __fixtures__/ path, or a shell command that writes to one (redirect, tee, cp/mv, sed -i, heredoc)
#     - running tests: node <...>.test.*, node --test, npm/pnpm/yarn test, npx jest|mocha|vitest|ava|tap
#     - hand-running a cron or wake script, or any code that reaches a paid model endpoint (OpenRouter, the
#       Anthropic / OpenAI / Google model APIs): spend-scan.js reads the command, follows the script's requires,
#       and refuses on a hit — dry-run flags included (builder 2026-11-21: "yes add, no call openrouter to spend
#       in a cli session either"). Crons are not tool calls and are untouched.
#   Unlock: Mike runs `! touch /root/GodWorld/.claude/.test-unlock`; holds 60 minutes from that touch.
#   Claude may not create or touch it — any command naming it is blocked.
#   Reading a test file (cat, grep, sed -n) stays free. Git's own pre-commit checks are not tool calls
#   and are not touched by this guard.
ROOT="/root/GodWorld"
UNLOCK="$ROOT/.claude/.test-unlock"
UNLOCK_MIN=60
TEST_PATH_RE='(\.test\.(js|mjs|cjs|ts)|\.spec\.(js|mjs|cjs|ts)|/__tests__/|/__fixtures__/)'
RUN_RE='(\bnode\b[^|;&]*\.(test|spec)\.(js|mjs|cjs|ts)\b|\bnode[[:space:]]+--test\b|\b(npm|pnpm|yarn)[[:space:]]+(run[[:space:]]+)?test\b|\bnpx[[:space:]]+(jest|mocha|vitest|ava|tap)\b|\b(jest|mocha|vitest)[[:space:]])'
WRITE_RE='(>|>>|\btee\b|\bcp\b|\bmv\b|\bsed[[:space:]]+-[a-zA-Z]*i|\btouch\b|\btruncate\b|python3?[[:space:]]*<<|node[[:space:]]*<<|writeFileSync|appendFileSync)'

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
block() { echo "BLOCKED (test-guard, 2026-11-20): $1 Tests, hand-runs of cron scripts and paid model calls need Mike's approval; he unlocks with: ! touch $UNLOCK (60 min)." >&2; exit 2; }
unlocked() {
  [ -f "$UNLOCK" ] || return 1
  local age=$(( ( $(date +%s) - $(stat -c %Y "$UNLOCK" 2>/dev/null || echo 0) ) / 60 ))
  [ "$age" -lt "$UNLOCK_MIN" ]
}

case "$tool" in
  Write|Edit|NotebookEdit)
    p="$(field tool_input.file_path)"; [ -z "$p" ] && p="$(field tool_input.notebook_path)"
    [ -z "$p" ] && exit 0
    if printf '%s' "$p" | grep -Eq "$TEST_PATH_RE"; then
      unlocked && exit 0
      block "'$p' is a test file."
    fi
    exit 0
    ;;
  Bash)
    cmd="$(field tool_input.command)"
    printf '%s' "$cmd" | grep -q '\.test-unlock' && block "the test unlock is Mike's to set, by hand."
    if printf '%s' "$cmd" | grep -Eq "$RUN_RE"; then
      unlocked && exit 0
      block "this command runs tests."
    fi
    if printf '%s' "$cmd" | grep -Eq "$TEST_PATH_RE" && printf '%s' "$cmd" | grep -Eq "$WRITE_RE"; then
      unlocked && exit 0
      block "this command writes to a test file."
    fi
    # hand-run of a cron / wake script, or code that reaches a paid model endpoint (spend-scan.js)
    why="$(printf '%s' "$payload" | node "$ROOT/.claude/hooks/spend-scan.js" 2>/dev/null)"; rc=$?
    if [ "$rc" -ne 0 ]; then
      unlocked && exit 0
      [ -z "$why" ] && why="spend-scan failed to run (exit $rc); refused rather than guessed."
      block "$why"
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
