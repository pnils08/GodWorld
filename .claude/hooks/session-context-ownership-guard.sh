#!/bin/bash
# SESSION_CONTEXT ownership guard (Mike-direct S304)
# ---------------------------------------------------------------------------
# Enforces the one-owner-per-line rule: a terminal may edit ONLY the shared
# PIN line and its own NEXT[<self>] line in SESSION_CONTEXT.md. Editing any
# other terminal's NEXT[<other>] line is BLOCKED.
#
# Why: SESSION_CONTEXT.md is a shared AI->AI handoff. When a NEXT line goes
# stale, the fix is for THAT terminal to rewrite its own line — not for another
# terminal to reach in. The C304 case: engine-sheet rewrote NEXT[civic] because
# civic hadn't closed a session in ~20 cycles. Correct content, wrong hand.
#
# Fires on PreToolUse Edit|Write. Detects the acting terminal from the tmux
# window name (same mechanism as session-startup-hook.sh).
#
# FAIL-OPEN by design: if the file isn't SESSION_CONTEXT.md, or the acting
# terminal can't be determined (no tmux / Mags-only mode), the edit is allowed
# silently. A hard block only fires when we KNOW the terminal AND it is changing
# another registered terminal's NEXT line.

INPUT_JSON=$(cat)

FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Scope: only SESSION_CONTEXT.md
case "$FILE_PATH" in
  */SESSION_CONTEXT.md|SESSION_CONTEXT.md) ;;
  *) exit 0 ;;
esac

# Acting terminal = tmux window name (same detection as the boot hook)
SELF=""
if [ -n "$TMUX_PANE" ]; then
  SELF=$(tmux display-message -t "$TMUX_PANE" -p '#W' 2>/dev/null || echo "")
fi

# Can't identify the terminal (no tmux, or Mags-only mode) -> allow, don't trap.
if [ -z "$SELF" ]; then
  exit 0
fi

REGISTERED="media civic engine-sheet research-build jarvis"
TOOL_NAME=$(echo "$INPUT_JSON" | jq -r '.tool_name // empty' 2>/dev/null)

violated=""
for t in $REGISTERED; do
  [ "$t" = "$SELF" ] && continue
  marker="**NEXT[$t]:**"

  if [ "$TOOL_NAME" = "Edit" ]; then
    # Block if either side of the edit touches another terminal's NEXT line.
    old=$(echo "$INPUT_JSON" | jq -r '.tool_input.old_string // empty' 2>/dev/null)
    new=$(echo "$INPUT_JSON" | jq -r '.tool_input.new_string // empty' 2>/dev/null)
    if printf '%s\n%s' "$old" "$new" | grep -qF "$marker"; then
      violated="$t"; break
    fi
  elif [ "$TOOL_NAME" = "Write" ]; then
    # Block if the other terminal's line in the proposed content differs from
    # what's currently on disk (changed or removed).
    content=$(echo "$INPUT_JSON" | jq -r '.tool_input.content // empty' 2>/dev/null)
    cur_line=$(grep -F "$marker" "$FILE_PATH" 2>/dev/null)
    new_line=$(printf '%s' "$content" | grep -F "$marker")
    if [ "$cur_line" != "$new_line" ]; then
      violated="$t"; break
    fi
  fi
done

if [ -n "$violated" ]; then
  jq -n --arg self "$SELF" --arg other "$violated" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("SESSION_CONTEXT ownership guard (Mike-direct S304): the \($self) terminal may edit only the shared PIN line and its own NEXT[\($self)] line. This edit changes NEXT[\($other)] — another terminal'"'"'s line. Each terminal owns only its own NEXT line. If NEXT[\($other)] is stale, leave it for the \($other) terminal to rewrite at its next close, or raise it with Mike — do not reach into it.")
    }
  }'
  exit 0
fi

exit 0
