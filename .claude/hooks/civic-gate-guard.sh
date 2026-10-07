#!/usr/bin/env bash
# Civic gate guard — the vote is the gate; ideas are never gated.
#
# Rule (builder ruling 2026-10-04, docs/plans/2026-09-19-civic-wake-game-loop.md):
# the council vote decides an initiative. No other refusal stands between a
# seat's idea and the board. Every gate cut in civic.44/45 (district authority,
# one-move-per-wake killing a propose, an all-or-nothing sanity read) had been
# added by a session that felt a check was good engineering. None was in the
# rules. This guard catches the next one at the keyboard.
#
# What it blocks: a NEW refusal added to the civic move path — a line that
# sets a rejection reason, pushes to rejected/issues, returns blocked/apply:false,
# or throws — unless the refusal is the "engine cannot read this input" class
# (missing field, unknown id/hood/type, malformed, unavailable, not-on-board).
# A line already in HEAD passes (moved code is not a new gate). Removing a gate
# always passes.
#
# Scope: the move path only — cron-civic-run/gate, applyTrackerUpdates,
# validateTrackerUpdates, createInitiative, civicPetitions, civicMustDecide,
# civicInterventionValidation, civicSeat, lib/civic*.
#
# Modes:
#   (default)  PreToolUse hook — Edit/Write JSON on stdin, exit 2 blocks
#   --staged   pre-commit gate — scans staged ADDED lines in scope, exit 1 blocks
# No override env. A wanted gate is a sim call: the builder says so, and this
# guard's ALLOWED class gets the word — the guard is edited, never bypassed.

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SCOPE_RE='^(scripts/(cron-civic-(run|gate)|applyTrackerUpdates|validateTrackerUpdates|createInitiative|civicPetitions|civicMustDecide|civicInterventionValidation|civicSeat)\.js|lib/civic[^/]*\.js)$'
# A refusal-shaped line.
GATE_RE='(\breason\s*[=:]\s*['"'"'"`]|\bwhy\s*:\s*['"'"'"`]|\brejected\.push\(|\bissues\.push\(|\bblocked\s*:\s*true|\bapply\s*:\s*false|\bpass\s*:\s*false|\bthrow new Error\()'
# The one class that may be added: the engine cannot read the input.
ALLOWED_RE='(missing|unknown|not-an-array|not-on-board|unavailable|malformed|unparseable|not parseable|required|incomplete|mismatch|not a |no audit|ENOENT|cannot read|does not match)'

check_lines() { # $1 = file (repo-relative), stdin = candidate new lines → prints hits
  local f="$1" base
  base="$(git -C "$ROOT" show "HEAD:$f" 2>/dev/null || true)"
  while IFS= read -r line; do
    local t; t="$(printf '%s' "$line" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
    [ -z "$t" ] && continue
    printf '%s' "$t" | grep -qP "$GATE_RE" || continue
    # already in HEAD → moved, not new
    printf '%s\n' "$base" | grep -qF -- "$t" && continue
    printf '%s' "$t" | grep -qiP "$ALLOWED_RE" && continue
    printf '    %s\n' "${t:0:140}"
  done
}

block_msg() {
  echo "The vote is the gate; ideas are never gated (builder ruling 2026-10-04). A new refusal in the civic move path is a gate." >&2
  echo "Only the 'engine cannot read this input' class may be added (missing / unknown / malformed / unavailable / not-on-board)." >&2
  echo "If this refusal is a sim call the builder made, add its word to ALLOWED_RE in .claude/hooks/civic-gate-guard.sh with the ruling cited. Never bypass." >&2
}

if [ "${1:-}" = "--staged" ]; then
  files="$(git -C "$ROOT" diff --cached --name-only | grep -E "$SCOPE_RE" || true)"
  [ -z "$files" ] && exit 0
  fail=0
  while IFS= read -r f; do
    hits="$(git -C "$ROOT" diff --cached -U0 -- "$f" | grep -E '^\+[^+]' | cut -c2- | check_lines "$f" || true)"
    if [ -n "$hits" ]; then
      [ "$fail" = 0 ] && echo "BLOCKED — civic gate added:" >&2
      echo "  $f:" >&2; echo "$hits" >&2
      fail=1
    fi
  done <<< "$files"
  [ "$fail" = 1 ] && { block_msg; exit 1; }
  exit 0
fi

# PreToolUse mode
input="$(cat)"
payload="$(printf '%s' "$input" | python3 -c '
import json,sys
d=json.load(sys.stdin)
ti=d.get("tool_input",{})
print(ti.get("file_path",""))
print("---CIVIC-GUARD-SPLIT---")
print(ti.get("old_string",""))
print("---CIVIC-GUARD-SPLIT---")
print(ti.get("content","") or ti.get("new_string",""))
' 2>/dev/null)" || exit 0
fp="${payload%%$'\n'---CIVIC-GUARD-SPLIT---$'\n'*}"
rest="${payload#*$'\n'---CIVIC-GUARD-SPLIT---$'\n'}"
old="${rest%%$'\n'---CIVIC-GUARD-SPLIT---$'\n'*}"
new="${rest#*$'\n'---CIVIC-GUARD-SPLIT---$'\n'}"
rel="${fp#$ROOT/}"
printf '%s' "$rel" | grep -qE "$SCOPE_RE" || exit 0
# lines in new_string that are not in old_string
cand="$(printf '%s\n' "$new" | grep -vxF -f <(printf '%s\n' "$old") || true)"
hits="$(printf '%s\n' "$cand" | check_lines "$rel" || true)"
[ -z "$hits" ] && exit 0
{
  echo "BLOCKED — civic gate added to $rel:"
  echo "$hits"
  block_msg
} >&2
exit 2
