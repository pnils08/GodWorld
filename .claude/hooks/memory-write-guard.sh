#!/usr/bin/env bash
# memory-write-guard — no memory write without Mike's approval (builder 2026-11-01:
# "Block all memories writes without my approval").
#
#   PreToolUse hook. Reads tool JSON on stdin. Hard block (exit 2) on every write to a memory store:
#     - the memory files: /root/.claude/projects/-root-GodWorld/memory/** (MEMORY.md and every memory file)
#     - the remember buffer: /root/GodWorld/.remember/**
#     - supermemory saves: `supermemory add` / `supermemory upload` from any shell, and the MCP save tools
#       (add_memory, guided-save, upload-file, forget_memory on the supermemory and Mara servers)
#   Covers Write/Edit/NotebookEdit by file_path, Bash by command inspection, MCP tools by name.
#   Unlock: Mike runs `! touch /root/GodWorld/.claude/.memory-write-unlock`; holds 60 minutes from that
#   touch. Claude may not create or touch it — any command naming it is blocked.
#   Reads stay free: search, grep, cat, brainSearch, search_memory.

ROOT="/root/GodWorld"
UNLOCK="$ROOT/.claude/.memory-write-unlock"
UNLOCK_MIN=60
# 2026-11-13: `cd …/memory && cat >> file.md` passed — the folder named with no trailing slash, the file by bare
# name. The folder name now matches with or without the slash, and a shell already in that folder is checked too.
MEM_RE='(^|[^A-Za-z0-9_])(/root/\.claude/projects/-root-GodWorld/memory([^A-Za-z0-9_-]|$)|-root-GodWorld/memory([^A-Za-z0-9_-]|$)|/root/GodWorld/\.remember([^A-Za-z0-9_-]|$)|\.remember/|/memory/MEMORY\.md|memory/[A-Za-z0-9_.-]+\.md|MEMORY\.md)'
MCP_RE='^mcp__(plugin_supermemory_supermemory|claude_ai_Mara|supermemory|claude_ai_supermemory)__(add_memory|guided-save|upload-file|forget_memory)$'

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

block() { echo "BLOCKED (memory-write-guard, builder 2026-11-01): $1 Memory writes need Mike's approval; he unlocks with: ! touch $UNLOCK (60 min)." >&2; exit 2; }

unlocked() {
  [ -f "$UNLOCK" ] || return 1
  local age=$(( ( $(date +%s) - $(stat -c %Y "$UNLOCK" 2>/dev/null || echo 0) ) / 60 ))
  [ "$age" -lt "$UNLOCK_MIN" ]
}

case "$tool" in
  Write|Edit|NotebookEdit)
    p="$(field tool_input.file_path)"; [ -z "$p" ] && p="$(field tool_input.notebook_path)"
    [ -z "$p" ] && exit 0
    a="$(abspath "$p")"
    case "$a" in
      /root/.claude/projects/-root-GodWorld/memory/*|"$ROOT"/.remember/*)
        unlocked && exit 0
        block "'$a' is a memory file."
        ;;
    esac
    exit 0
    ;;
  Bash)
    cmd="$(field tool_input.command)"
    printf '%s' "$cmd" | grep -q 'memory-write-unlock' && block "the memory-write unlock is Mike's to set, by hand."
    # supermemory saves are allowed (builder: the block is on memory .md files only)
    # a write-shaped command naming a memory path (redirect, tee, cp/mv/rm/sed -i/touch/truncate, or an
    # interpreter heredoc that can open the file). Reads (cat, grep, ls, head, sed -n) stay free.
    incwd=0; case "$cwd" in /root/.claude/projects/-root-GodWorld/memory*|"$ROOT"/.remember*) incwd=1 ;; esac
    if [ "$incwd" = 1 ] || printf '%s' "$cmd" | grep -Eq "$MEM_RE"; then
      if printf '%s' "$cmd" | grep -Eq '(>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\bsed[[:space:]]+-[a-zA-Z]*i|\btouch\b|\btruncate\b|\binstall\b|\bdd\b|python3?[[:space:]]+-|python3?[[:space:]]*<<|node[[:space:]]+-e|node[[:space:]]*<<|perl[[:space:]]+-|ruby[[:space:]]+-|\bopen\(|writeFileSync|appendFileSync)'; then
        unlocked && exit 0
        block "this command writes to a memory path."
      fi
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
