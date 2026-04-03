#!/bin/bash
# GodWorld Tool Call Counter (Phase 33.3)
# Increments a counter on every tool call.
# At thresholds, suggests strategic compaction.

STATE_DIR="${CLAUDE_PROJECT_ROOT:-/root/GodWorld}/.claude/state"
COUNTER_FILE="$STATE_DIR/tool-call-counter.txt"

mkdir -p "$STATE_DIR"

# Read current count
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Suggest compaction at thresholds
# 150 = typical task boundary, 250 = getting heavy
if [ "$COUNT" -eq 150 ]; then
  cat << 'EOF'
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "TOOL COUNTER: 150 tool calls this session. Consider /compact at the next natural task boundary to preserve context quality."}}
EOF
elif [ "$COUNT" -eq 250 ]; then
  cat << 'EOF'
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "TOOL COUNTER: 250 tool calls. Context is getting heavy. Strongly recommend /compact before starting the next major task."}}
EOF
fi

exit 0
