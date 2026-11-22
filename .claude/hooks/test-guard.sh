#!/usr/bin/env bash
# test-guard — the block on tests and sandbox runs, put back (builder 2026-11-21: "Put the block back on tests and
# Sandbox runs, in the block state the only reading code passes a fix").
#
#   The only thing that passes a fix is reading the code. A test passing or a sandbox run coming back ok is not a pass.
#   PreToolUse hook. Reads tool JSON on stdin. Hard block (exit 2) on:
#     - writing a test file: Write/Edit/NotebookEdit on *.test.js|mjs|cjs|ts, *.spec.*, a __tests__/ or
#       __fixtures__/ path, or a shell command that writes to one (redirect, tee, cp/mv, sed -i, heredoc)
#     - running tests: node <...>.test.*, node --test, npm/pnpm/yarn test, npx jest|mocha|vitest|ava|tap
#     - a sandbox run: a Cycle fire (script.google.com/macros, CYCLE_TRIGGER_TOKEN), the bench scripts
#       (benchfire, benchclear, clearfire, clearcheckpoint, seedSandboxFeeds, syncSandboxFromLive), or any node
#       script that names the sandbox sheet / script / web-app id or the trigger token (the named script is read once).
#   Hand-runs of cron scripts and paid model calls stay with spend-guard.sh; this hook does not touch them.
#   Unlock: Mike runs `! touch /root/GodWorld/.claude/.test-unlock`; holds 60 minutes from that touch.
#   Claude may not create or touch it — any command naming it is blocked.
#   Reading a test file (cat, grep, sed -n) stays free. Git's own pre-commit checks are not tool calls.
ROOT="/root/GodWorld"
UNLOCK="$ROOT/.claude/.test-unlock"
UNLOCK_MIN=60
TEST_PATH_RE='(\.test\.(js|mjs|cjs|ts)|\.spec\.(js|mjs|cjs|ts)|/__tests__/|/__fixtures__/)'
SANDBOX_RE='(script\.google\.com/macros|CYCLE_TRIGGER_TOKEN|benchfire|benchclear|clearfire|clearcheckpoint|seedSandboxFeeds|syncSandboxFromLive|1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA|1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2|AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ)'
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
block() { echo "BLOCKED (test-guard): $1 The only thing that passes a fix is reading the code — a test or a sandbox run does not pass it. Read the code. Mike unlocks by hand with: ! touch $UNLOCK (60 min)." >&2; exit 2; }
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
    # a sandbox run: the command itself, or the node script it names, carries a sandbox marker
    if printf '%s' "$cmd" | grep -Eq "$SANDBOX_RE"; then
      unlocked && exit 0
      block "this command is a sandbox run."
    fi
    runs=""; printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)([A-Za-z_]+=[^[:space:]]+[[:space:]]+)*(node|bash|sh)[[:space:]]' && runs=1
    for f in $( [ -n "$runs" ] && printf '%s' "$cmd" | grep -oE '[A-Za-z0-9_./-]+\.(js|mjs|cjs|sh)' | head -5 ); do
      case "$f" in *.claude/hooks/*) continue ;; esac
      [ -f "$f" ] || f="$ROOT/$f"
      [ -f "$f" ] || continue
      if grep -Eq "$SANDBOX_RE" "$f" 2>/dev/null; then
        unlocked && exit 0
        block "'$f' is a sandbox run."
      fi
    done
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
