#!/bin/bash
# GodWorld Post-Write Validation Hook
# Catches contamination in agent-facing files at write time.
# Fires after Write|Edit. Reads file path from tool input/response.

INPUT=$(cat)

# Extract the file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)

# No file path = nothing to check
[ -z "$FILE_PATH" ] && exit 0

# Only check agent-facing files (skills, agents, desk packets, newsroom docs)
# Skip hooks, scripts, engine code, config files
case "$FILE_PATH" in
  */.claude/hooks/*|*/.claude/state/*|*/node_modules/*|*/phase0*|*/scripts/*|*/lib/*|*.json|*.env)
    exit 0
    ;;
esac

# Only check if file exists and is text
[ -f "$FILE_PATH" ] || exit 0
file "$FILE_PATH" | grep -q "text" || exit 0

# --- Contamination patterns ---
WARNINGS=""

# "godworld" as container name (should be "bay-tribune" for canon, "mags" for personal)
if grep -qi 'containerTags.*godworld\|container.*"godworld"\|godworld.*container' "$FILE_PATH" 2>/dev/null; then
  WARNINGS+="- Found 'godworld' container reference — should be 'bay-tribune' (canon) or 'mags' (personal)\n"
fi

# Simulation language leaking into agent/editorial files
if echo "$FILE_PATH" | grep -qE '(agents|skills|editions|desk)' 2>/dev/null; then
  if grep -qi 'simulation engine\|simulation cycle\|ctx\.\|phase [0-9]' "$FILE_PATH" 2>/dev/null; then
    # Don't flag engine-specific skills
    case "$FILE_PATH" in
      *pre-mortem*|*stub-engine*|*tech-debt*|*run-cycle*|*ENGINE*) ;;
      *)
        WARNINGS+="- Engine/simulation language detected in agent-facing file — agents should see the world, not the engine\n"
        ;;
    esac
  fi
fi

# "the user" or "the maker" in editorial content
if echo "$FILE_PATH" | grep -qE '(editions|output|desk)' 2>/dev/null; then
  if grep -qi 'the user\|the maker\|mike paulson.*builder\|behind the simulation' "$FILE_PATH" 2>/dev/null; then
    WARNINGS+="- Found builder/user references in editorial content — breaks fourth wall\n"
  fi
fi

# Output warnings if any
if [ -n "$WARNINGS" ]; then
  cat << EOF
{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "POST-WRITE CHECK: Contamination detected in ${FILE_PATH}:\n${WARNINGS}Review and fix before continuing."}}
EOF
fi
