#!/usr/bin/env bash
# boot-doc-guard — boot docs are Mike's instructions. Edits get flagged, not blocked.
#
#   PreToolUse hook. Reads tool JSON on stdin. Warn-only (S426, Mike-direct: loosened
#   from a hard block to a warn hook — same class as block-memory-md-writes.local.md).
#   Covers Write/Edit/NotebookEdit by file_path, and Bash by command inspection
#   (heredoc/sed/tee/redirect were the hole that let a boot doc get edited without a Write call).

# Boot docs: anything loaded before Mike asks a question.
PROTECTED_RE='(^|/)(CLAUDE\.md|AGENTS\.md|MEMORY\.md)$|\.claude/rules/[^/]+\.md$|\.claude/terminals/[^/]+/TERMINAL\.md$|\.claude/skills/(boot|session-startup)/SKILL\.md$'

payload="$(cat)"

tool="$(printf '%s' "$payload" | python3 -c "
import sys,json
try: print(json.load(sys.stdin).get('tool_name',''))
except Exception: print('')
" 2>/dev/null)"

target=""
case "$tool" in
  Write|Edit|NotebookEdit)
    target="$(printf '%s' "$payload" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin).get('tool_input',{})
    print(d.get('file_path') or d.get('notebook_path') or '')
except Exception: print('')
" 2>/dev/null)"
    ;;
  Bash)
    cmd="$(printf '%s' "$payload" | python3 -c "
import sys,json
try: print(json.load(sys.stdin).get('tool_input',{}).get('command',''))
except Exception: print('')
" 2>/dev/null)"
    # only a WRITE-shaped bash command counts; reading a boot doc stays free.
    # heredoc bodies and quoted prose (commit messages, saved facts) are not write targets —
    # drop them whole-command (they span lines; sed can't). The heredoc opener line stays, so
    # `cat > CLAUDE.md <<EOF` still warns; a quoted bare path ("CLAUDE.md") stays visible.
    cmdw="$(printf '%s' "$cmd" | python3 -c '
import re,sys
c=sys.stdin.read()
c=re.sub(r"(<<-?\s*([\x27\x22]?)(\w+)\2[^\n]*)\n.*?\n\s*\3(?=\n|$)", r"\1", c, flags=re.S)
c=re.sub(r"\x27[^\x27]*\s[^\x27]*\x27|\x22[^\x22]*\s[^\x22]*\x22", "", c)
c=re.sub(r"\d*>&\d+|\d*>>?\s*/dev/null", "", c)
print(c)')"
    if printf '%s' "$cmdw" | grep -qE '>|>>|\b(sed +-i|tee|truncate|dd|mv|cp|install|patch|python3?|perl|ex|ed)\b'; then
      for tok in $(printf '%s' "$cmdw" | grep -oE "[A-Za-z0-9_./-]+\.md"); do
        printf '%s' "$tok" | grep -qE "$PROTECTED_RE" && { target="$tok"; break; }
      done
    fi
    ;;
esac

[ -z "$target" ] && exit 0
printf '%s' "$target" | grep -qE "$PROTECTED_RE" || exit 0

# A PreToolUse hook's stderr on exit 0 reaches the debug log only — Claude never sees it.
# additionalContext is the non-blocking channel Claude reads (hooks docs, 2026-10-07).
msg="boot-doc-guard: editing boot doc '$target' — Mike's instruction file, not a session scratchpad. Make sure this was requested (by him, or in-scope mechanism he asked for), not an unrequested add, rationale paragraph or session note. Warn-only (S426 Mike-direct)."
python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":sys.argv[1]}}))' "$msg"
exit 0
