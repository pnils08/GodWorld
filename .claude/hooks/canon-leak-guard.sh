#!/usr/bin/env bash
# Canon-leak guard — sim-facing/agent-read files never carry real-world dates
# or builder identity. Rules and notes are written as law, unattributed.
# Scope: .claude/agents/ .claude/agent-memory/ docs/canon/ docs/media/
# Modes:
#   (default)  PreToolUse hook — reads Edit/Write tool JSON on stdin, exit 2 blocks
#   --staged   pre-commit gate — scans staged ADDED lines in scope, exit 1 blocks
# No override env. If a block is wrong, the guard gets edited, not bypassed.

set -u

SCOPE_RE='^(\.claude/agents/|\.claude/agent-memory/|docs/canon/|docs/media/)'
# Builder identity: Mike-direct, bare Mike (Mike Paulson is canon and passes), the builder
NAME_PAT='Mike-direct|\bMike\b(?!\s+P(aulson|AULSON))|\b[Tt]he [Bb]uilder\b'
# Real-world-era date forms (2010s-2030s). Sim-era 2040s and bare years pass.
DATE_PAT='\b20(1[0-9]|2[0-9]|3[0-9])-[01]?[0-9]-[0-3]?[0-9]\b|\b[01]?[0-9]/[0-3]?[0-9]/20(1[0-9]|2[0-9]|3[0-9])\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+20(1[0-9]|2[0-9]|3[0-9])\b'

# Drop file-path tokens (a date inside docs/research/2026-*.md is a pointer,
# not content) and frontmatter created:/updated: metadata lines.
clean() {
  grep -Ev '^[[:space:]]*(created|updated):' \
    | sed -E 's![A-Za-z0-9_.~-]*[A-Za-z_]/[A-Za-z0-9_.-]\S*!!g'
}

scan() { # stdin: text to check → prints hits, returns 0 if leaks found
  clean | grep -nP "$NAME_PAT|$DATE_PAT" | head -8
}

if [ "${1:-}" = "--staged" ]; then
  files="$(git diff --cached --name-only | grep -E "$SCOPE_RE" || true)"
  [ -z "$files" ] && exit 0
  fail=0
  while IFS= read -r f; do
    hits="$(git diff --cached -U0 -- "$f" | grep -E '^\+[^+]' | cut -c2- | scan || true)"
    if [ -n "$hits" ]; then
      [ "$fail" = 0 ] && echo "BLOCKED — canon leak: real-world date or builder reference added to sim-facing file(s):" >&2
      echo "  $f:" >&2; echo "$hits" | sed 's/^/    /' >&2
      fail=1
    fi
  done <<< "$files"
  [ "$fail" = 1 ] && { echo "Write the rule as law — no builder attribution, no real-world dates. Fix the lines and re-commit." >&2; exit 1; }
  exit 0
fi

# PreToolUse mode
input="$(cat)"
payload="$(printf '%s' "$input" | python3 -c '
import json,sys
d=json.load(sys.stdin)
ti=d.get("tool_input",{})
print(ti.get("file_path",""))
print("---CANON-GUARD-SPLIT---")
print(ti.get("content","") or ti.get("new_string",""))
' 2>/dev/null)" || exit 0
fp="${payload%%$'\n'---CANON-GUARD-SPLIT---$'\n'*}"
txt="${payload#*$'\n'---CANON-GUARD-SPLIT---$'\n'}"
rel="${fp#/root/GodWorld/}"
printf '%s' "$rel" | grep -qE "$SCOPE_RE" || exit 0
hits="$(printf '%s\n' "$txt" | scan || true)"
[ -z "$hits" ] && exit 0
{
  echo "BLOCKED — canon leak into sim-facing file ($rel):"
  echo "$hits" | sed 's/^/  /'
  echo "Agents read this file. No real-world dates, no builder references — write the rule as law, unattributed. (Sim-era 2040s dates and 'Mike Paulson' pass.)"
} >&2
exit 2
