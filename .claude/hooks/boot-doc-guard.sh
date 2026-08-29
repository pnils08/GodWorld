#!/usr/bin/env bash
# boot-doc-guard — boot docs are Mike's instructions. No agent edits them without his approval.
#
#   PreToolUse hook. Reads tool JSON on stdin. exit 2 blocks.
#   Covers Write/Edit/NotebookEdit by file_path, and Bash by command inspection
#   (heredoc/sed/tee/redirect were the hole that let a boot doc get edited without a Write call).
#
# APPROVAL: Mike, and only Mike, runs:   touch .claude/.boot-doc-unlock
# The unlock is single-use — this guard consumes it on the next allowed edit.

ROOT="${CLAUDE_PROJECT_ROOT:-/root/GodWorld}"
UNLOCK="$ROOT/.claude/.boot-doc-unlock"

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
    # Stderr/devnull redirects (2>&1, 2>/dev/null) are not writes — strip them
    # before the test, or every `ls AGENTS.md 2>/dev/null` blocks. awk is not in
    # the verb list: it can only write through its own `>`, which is caught below.
    cmdw="$(printf '%s' "$cmd" | sed -E 's/[0-9]*>&[0-9]+//g; s/[0-9]*>>? *\/dev\/null//g')"
    if printf '%s' "$cmdw" | grep -qE '>|>>|\b(sed +-i|tee|truncate|dd|mv|cp|install|patch|python3?|perl|ex|ed)\b'; then
      for tok in $(printf '%s' "$cmd" | grep -oE "[A-Za-z0-9_./-]+\.md"); do
        printf '%s' "$tok" | grep -qE "$PROTECTED_RE" && { target="$tok"; break; }
      done
    fi
    ;;
esac

[ -z "$target" ] && exit 0
printf '%s' "$target" | grep -qE "$PROTECTED_RE" || exit 0

if [ -f "$UNLOCK" ]; then
  /bin/rm -f "$UNLOCK"
  echo "boot-doc-guard: approval consumed for '$target'. Unlock cleared — the next edit blocks again." >&2
  exit 0
fi

cat >&2 <<MSG
BLOCKED — boot doc: $target

Boot docs are Mike's instructions, not a session scratchpad. No unrequested edits,
appends, session notes, rationale paragraphs, or session-number citations.

Session record -> claude-mem.  Work record -> git.  Engine truth -> the docs/ file that owns it.

If a boot doc is wrong, say so in ONE line in chat and let Mike call it. Do not fix it.
To approve this edit, Mike runs:  touch .claude/.boot-doc-unlock
MSG
exit 2
