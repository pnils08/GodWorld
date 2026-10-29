#!/usr/bin/env bash
# boot-doc-guard — boot docs are Mike's instructions.
#
#   PreToolUse hook. Reads tool JSON on stdin.
#   LOCKED (hard block, exit 2) — builder 2026-10-28, "edited with deliberate edits, not notes":
#     /root/GodWorld/CLAUDE.md, /root/GodWorld/AGENTS.md, .claude/terminals/*/TERMINAL.md.
#     Unlock: Mike runs `! touch /root/GodWorld/.claude/.boot-doc-unlock` (or from any shell);
#     the unlock holds for 60 minutes from that touch. Claude may not create or touch it.
#   WARN-ONLY (S426): MEMORY.md, .claude/rules/*.md, the session-startup skill.
#   Covers Write/Edit/NotebookEdit by file_path, and Bash by command inspection
#   (heredoc/sed/tee/redirect were the hole that let a boot doc get edited without a Write call).

ROOT="/root/GodWorld"
UNLOCK="$ROOT/.claude/.boot-doc-unlock"
UNLOCK_MIN=60
LOCKED_RE="^$ROOT/(CLAUDE\.md|AGENTS\.md|\.claude/terminals/[^/]+/TERMINAL\.md)$"
WARN_RE='(^|/)MEMORY\.md$|\.claude/rules/[^/]+\.md$|\.claude/skills/session-startup/SKILL\.md$'

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
cwd="$(field cwd)"; [ -z "$cwd" ] && cwd="$ROOT"

abspath() { case "$1" in /*) printf '%s' "$1" ;; *) python3 -c 'import os,sys; print(os.path.normpath(os.path.join(sys.argv[1],sys.argv[2])))' "$cwd" "$1" ;; esac; }

block() { echo "BLOCKED (boot-doc-guard, builder 2026-10-28): $1" >&2; exit 2; }

unlocked() {
  [ -f "$UNLOCK" ] || return 1
  local age=$(( ( $(date +%s) - $(stat -c %Y "$UNLOCK" 2>/dev/null || echo 0) ) / 60 ))
  [ "$age" -lt "$UNLOCK_MIN" ]
}

targets=""
case "$tool" in
  Write|Edit|NotebookEdit)
    p="$(field tool_input.file_path)"; [ -z "$p" ] && p="$(field tool_input.notebook_path)"
    [ -n "$p" ] && targets="$(abspath "$p")"
    ;;
  Bash)
    cmd="$(field tool_input.command)"
    # The unlock is Mike's hand only.
    printf '%s' "$cmd" | grep -q 'boot-doc-unlock' && block "the boot-doc unlock is Mike's to set, by hand."
    # Only a WRITE-shaped bash command counts; reading a boot doc stays free.
    # Heredoc bodies and quoted prose (commit messages, saved facts) are not write targets —
    # drop them, EXCEPT a heredoc fed to an interpreter (python/node/perl/ruby/sh), whose body
    # is code that can write. The opener line stays, so `cat > CLAUDE.md <<EOF` still counts.
    cmdw="$(printf '%s' "$cmd" | python3 -c '
import re,sys
c=sys.stdin.read()
code=[]
def hd(m):
    op = m.group(1)
    if re.search(r"(^|[\s;&|(])(bash|sh)(\s|$)", op): code.append(m.group(0))   # shell body: analyse whole
    elif re.search(r"(^|[\s;&|(])(python3?|node|perl|ruby)(\s|$)", op):
        code.extend(re.findall(r"[\x27\x22]([^\x27\x22\s]*\.md)[\x27\x22]", m.group(0)))   # code body: path literals only
    return op
c=re.sub(r"([^\n]*<<-?\s*([\x27\x22]?)(\w+)\2[^\n]*)\n.*?\n\s*\3(?=\n|$)", hd, c, flags=re.S)
c=re.sub(r"\x27[^\x27]*\s[^\x27]*\x27|\x22[^\x22]*\s[^\x22]*\x22", "", c)
c=re.sub(r"\d*>&\d+|\d*>>?\s*/dev/null", "", c)
print(c + "\n" + "\n".join(code))')"
    if printf '%s' "$cmdw" | grep -qE '>|>>|\b(sed +-i|tee|truncate|dd|mv|cp|install|patch|python3?|node|perl|ruby|ex|ed|rm)\b'; then
      for tok in $(printf '%s' "$cmdw" | grep -oE "[A-Za-z0-9_./-]+\.md"); do
        targets="$targets $(abspath "$tok")"
      done
    fi
    ;;
  *) exit 0 ;;
esac

[ -z "${targets// /}" ] && exit 0

for t in $targets; do
  [ "$t" = "$UNLOCK" ] && block "the boot-doc unlock is Mike's to set, by hand."
  if printf '%s' "$t" | grep -qE "$LOCKED_RE"; then
    unlocked || block "'$t' is locked — CLAUDE.md, AGENTS.md and TERMINAL.md change only by deliberate edit. Ask Mike; he unlocks with: ! touch $UNLOCK (60 min)."
  fi
done

for t in $targets; do
  if printf '%s' "$t" | grep -qE "$LOCKED_RE|$WARN_RE"; then
    # A PreToolUse hook's stderr on exit 0 reaches the debug log only — Claude never sees it.
    # additionalContext is the non-blocking channel Claude reads (hooks docs, 2026-10-07).
    msg="boot-doc-guard: editing boot doc '$t' — Mike's instruction file, not a session scratchpad. Deliberate edits only: no notes, rationale paragraphs or session history."
    python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":sys.argv[1]}}))' "$msg"
    exit 0
  fi
done
exit 0
