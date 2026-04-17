#!/bin/bash
# GodWorld Memory-Write Gate — Phase 40.6 Layer 3
#
# Blocks Write/Edit tool calls targeting the persistent-memory directory
# (/root/.claude/projects/-root-GodWorld/memory/) unless the user has
# explicitly confirmed. Mirrors the MEMORY.md rule "never save memory files
# on your own judgment." Structural backstop for the prose rule.
#
# Input: Claude Code PreToolUse JSON on stdin.
# Extracts tool_input.file_path; matches against the memory directory prefix.
# Match → permissionDecision: "deny" with a reason the model will surface to
# the user. Miss → silent pass-through.

INPUT_JSON=$(cat)

FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

MEMORY_DIR="/root/.claude/projects/-root-GodWorld/memory/"

case "$FILE_PATH" in
  "$MEMORY_DIR"*)
    REASON="Memory-write gate (Phase 40.6 Layer 3) blocked this tool call. Writes under /root/.claude/projects/-root-GodWorld/memory/ require explicit user confirmation per MEMORY.md 'never save memory files on your own judgment.' Ask Mike before retrying, and cite the content you want to save."
    jq -n --arg reason "$REASON" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    # Log the attempt for audit
    LOG="/root/GodWorld/output/injection_blocks.log"
    mkdir -p "$(dirname "$LOG")"
    printf '[%s] memory-write-gate blocked: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FILE_PATH" >> "$LOG"
    exit 0
    ;;
esac

exit 0
