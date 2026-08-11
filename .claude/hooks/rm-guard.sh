#!/bin/bash
# rm-guard.sh — PreToolUse hook (Mike-direct, S364 2026-08-10).
# After codex rm -rf'd the entire working copy: no recursive rm ever runs
# from a Claude session. Non-recursive rm stays on the "ask" permission
# list (Mike approves each one). Recursive deletes are Mike-by-hand only.
#
# Input: PreToolUse JSON on stdin ({tool_name, tool_input:{command}}).
# Exit 2 = block with message.

input=$(cat)
cmd=$(printf '%s' "$input" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const j=JSON.parse(s);process.stdout.write(String((j.tool_input&&j.tool_input.command)||""));}
  catch(e){process.stdout.write("");}
});')

# Match rm with any recursive flag anywhere in the pipeline (incl. -fr, -Rf,
# combined flags, and find -delete / rsync --delete-class destroyers).
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])rm[[:space:]]+[^;&|]*-[a-zA-Z]*[rR]'; then
  echo "BLOCKED (rm-guard, Mike-direct S364): recursive rm never runs from a Claude session. If this delete is truly wanted, Mike runs it by hand." >&2
  exit 2
fi
if printf '%s' "$cmd" | grep -qE 'find[[:space:]][^;&|]*-delete'; then
  echo "BLOCKED (rm-guard, Mike-direct S364): find -delete never runs from a Claude session. If this delete is truly wanted, Mike runs it by hand." >&2
  exit 2
fi
exit 0
