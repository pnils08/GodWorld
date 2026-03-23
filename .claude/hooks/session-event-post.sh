#!/bin/bash
# Posts session events to the dashboard API.
# Called from SessionStart and Stop hooks.
# Expects EVENT_TYPE env var to be set by the caller.

EVENT_TYPE="${EVENT_TYPE:-unknown}"
DASHBOARD_URL="http://localhost:3001/api/session-events"

# Read stdin for any hook input
INPUT=$(cat 2>/dev/null || echo '{}')

# Build the payload
PAYLOAD=$(jq -n \
  --arg type "$EVENT_TYPE" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg session_id "$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)" \
  '{type: $type, timestamp: $ts, session_id: $session_id}' 2>/dev/null)

# Post to dashboard (fire-and-forget, don't block Claude)
curl -s -X POST "$DASHBOARD_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" > /dev/null 2>&1 || true
