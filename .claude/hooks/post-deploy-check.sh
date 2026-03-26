#!/bin/bash
# GodWorld Post-Deploy Verification Hook
# Fires after Bash tool calls. Checks if a clasp push just ran and verifies it.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
STDOUT=$(echo "$INPUT" | jq -r '.tool_response.stdout // empty' 2>/dev/null)
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_response.exitCode // "0"' 2>/dev/null)

# Only act on clasp push commands
echo "$COMMAND" | grep -qi "clasp push" || exit 0

REPORT=""

if [ "$EXIT_CODE" != "0" ]; then
  REPORT="DEPLOY FAILED (exit code ${EXIT_CODE})\n"
  REPORT+="Check: clasp login status, .clasp.json scriptId, API quotas\n"
else
  # Count pushed files from output
  FILE_COUNT=$(echo "$STDOUT" | grep -c "└─" 2>/dev/null || echo "0")
  if [ "$FILE_COUNT" -eq 0 ]; then
    FILE_COUNT=$(echo "$STDOUT" | grep -ciE "pushed|uploaded" 2>/dev/null || echo "0")
  fi

  # Count local engine files for comparison
  LOCAL_COUNT=$(find /root/GodWorld/phase*/ /root/GodWorld/utilities/ /root/GodWorld/lib/ -name "*.js" 2>/dev/null | wc -l)

  REPORT="DEPLOY COMPLETE\n"
  REPORT+="Files pushed: ${FILE_COUNT} (expected ~153, local count: ${LOCAL_COUNT})\n"
  REPORT+="Branch: $(git -C /root/GodWorld branch --show-current 2>/dev/null)\n"

  # Check for uncommitted changes that were deployed but aren't in git
  DIRTY=$(git -C /root/GodWorld status --porcelain -- '*.js' 2>/dev/null | head -5)
  if [ -n "$DIRTY" ]; then
    DIRTY_COUNT=$(echo "$DIRTY" | wc -l)
    REPORT+="WARNING: ${DIRTY_COUNT} uncommitted .js file(s) were deployed but aren't committed:\n${DIRTY}\n"
  fi

  # Record deploy timestamp
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') clasp-push branch=$(git -C /root/GodWorld branch --show-current 2>/dev/null) files=${FILE_COUNT}" >> /root/GodWorld/.claude/state/deploy-log.txt 2>/dev/null
fi

# Output as additional context
jq -n --arg ctx "=== POST-DEPLOY VERIFICATION ===
$(echo -e "$REPORT")
=== END VERIFICATION ===" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
