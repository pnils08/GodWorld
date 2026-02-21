#!/bin/bash
# GodWorld Pre-Tool Safety Check
# Fires on all Bash commands. Only acts on critical ones.
# Input arrives as JSON on stdin. Parse with jq.

# Read stdin into variable (the hook input JSON)
INPUT_JSON=$(cat)

# Extract the command
COMMAND=$(echo "$INPUT_JSON" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  # No command found — not a Bash tool call we care about
  exit 0
fi

# =====================================================
# CLASP PUSH — Deploy to Google Apps Script
# =====================================================
if echo "$COMMAND" | grep -qi "clasp push"; then
  PREFLIGHT=""

  # Check for uncommitted changes
  DIRTY=$(git -C /root/GodWorld status --porcelain 2>/dev/null | head -20)
  if [ -n "$DIRTY" ]; then
    PREFLIGHT="${PREFLIGHT}WARNING — Uncommitted changes detected:\n${DIRTY}\n\nClasp reads the working tree, not git HEAD. These WILL be deployed.\nConsider committing first so git history matches what is deployed.\n\n"
  fi

  # Show changed .js files since last commit
  CHANGED_STAGED=$(git -C /root/GodWorld diff --cached --name-only -- '*.js' 2>/dev/null)
  CHANGED_UNSTAGED=$(git -C /root/GodWorld diff --name-only HEAD -- '*.js' 2>/dev/null)
  UNTRACKED=$(git -C /root/GodWorld ls-files --others --exclude-standard -- '*.js' 2>/dev/null)

  FILES=""
  [ -n "$CHANGED_STAGED" ] && FILES="${FILES}${CHANGED_STAGED}\n"
  [ -n "$CHANGED_UNSTAGED" ] && FILES="${FILES}${CHANGED_UNSTAGED}\n"
  [ -n "$UNTRACKED" ] && FILES="${FILES}(new) ${UNTRACKED}\n"

  if [ -n "$FILES" ]; then
    PREFLIGHT="${PREFLIGHT}Changed .js files:\n${FILES}\n"
  fi

  # Current branch
  BRANCH=$(git -C /root/GodWorld branch --show-current 2>/dev/null)
  PREFLIGHT="${PREFLIGHT}Branch: ${BRANCH}"

  # Output as additionalContext so it shows in the approval prompt
  jq -n --arg ctx "=== CLASP PUSH PRE-FLIGHT ===
$(echo -e "$PREFLIGHT")
=== END PRE-FLIGHT ===" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: $ctx
    }
  }'
  exit 0
fi

# =====================================================
# GIT PUSH — Push commits to remote
# =====================================================
if echo "$COMMAND" | grep -qi "git push"; then
  PREFLIGHT=""
  BRANCH=$(git -C /root/GodWorld branch --show-current 2>/dev/null)
  PREFLIGHT="${PREFLIGHT}Branch: ${BRANCH}\n"

  # Warn on main/master
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    PREFLIGHT="${PREFLIGHT}\nPushing directly to ${BRANCH}.\n"
  fi

  # Check for force push attempt (belt + suspenders with deny rule)
  if echo "$COMMAND" | grep -qiE "\-\-force|\-f "; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Force push blocked by safety hook. This is denied in settings.json. If you truly need this, ask the user to run it manually."
      }
    }'
    exit 0
  fi

  # Show commits that will be pushed
  COMMITS=$(git -C /root/GodWorld log --oneline @{upstream}..HEAD 2>/dev/null)
  if [ -n "$COMMITS" ]; then
    COMMIT_COUNT=$(echo "$COMMITS" | wc -l)
    PREFLIGHT="${PREFLIGHT}\n${COMMIT_COUNT} commit(s) to push:\n${COMMITS}\n"
  else
    PREFLIGHT="${PREFLIGHT}\n(No upstream set or no new commits)\n"
  fi

  # Files changed
  STAT=$(git -C /root/GodWorld diff --stat @{upstream}..HEAD 2>/dev/null)
  if [ -n "$STAT" ]; then
    PREFLIGHT="${PREFLIGHT}\nFiles changed:\n${STAT}"
  fi

  jq -n --arg ctx "=== GIT PUSH PRE-FLIGHT ===
$(echo -e "$PREFLIGHT")
=== END PRE-FLIGHT ===" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: $ctx
    }
  }'
  exit 0
fi

# =====================================================
# DESTRUCTIVE GIT OPS — reset, checkout ., clean
# =====================================================
if echo "$COMMAND" | grep -qiE "git (reset --hard|checkout \.|clean -f)"; then
  DIRTY=$(git -C /root/GodWorld status --porcelain 2>/dev/null | head -20)
  DIRTY_COUNT=$(echo "$DIRTY" | grep -c . 2>/dev/null || echo "0")

  jq -n --arg ctx "=== DESTRUCTIVE GIT ACTION ===
Command: ${COMMAND}
Working tree has ${DIRTY_COUNT} changed file(s).
This action may discard uncommitted work.
=== END CHECK ===" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: $ctx
    }
  }'
  exit 0
fi

# =====================================================
# RM -RF — Block recursive force delete, suggest safer alternatives
# =====================================================
if echo "$COMMAND" | grep -qiE "rm -rf "; then
  jq -n --arg reason "rm -rf blocked by safety hook. Use 'rm -r' (without -f) so you get prompted for protected files, or delete files individually. If you truly need rm -rf, ask the user to run it manually." '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
fi

# =====================================================
# RM — File deletion (non-rf)
# =====================================================
if echo "$COMMAND" | grep -qiE "^rm |; rm |&& rm "; then
  if echo "$COMMAND" | grep -qiE "rm -r"; then
    jq -n --arg ctx "=== FILE DELETION CHECK ===
Recursive delete detected: ${COMMAND}
Verify the target path is correct.
=== END CHECK ===" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: $ctx
      }
    }'
    exit 0
  fi
fi

# =====================================================
# Everything else — silent pass-through
# =====================================================
exit 0
