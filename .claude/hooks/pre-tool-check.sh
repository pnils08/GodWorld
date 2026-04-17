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
# GIT COMMIT — Pre-commit code rule check
# =====================================================
if echo "$COMMAND" | grep -qi "git commit"; then
  WARNINGS=""

  # Get staged diff
  STAGED_DIFF=$(git -C /root/GodWorld diff --cached 2>/dev/null)

  if [ -n "$STAGED_DIFF" ]; then

    # Check 1: Math.random() — must use ctx.rng
    RANDOM_HITS=$(echo "$STAGED_DIFF" | grep -n "^+" | grep -v "^+++" | grep "Math\.random()" || true)
    if [ -n "$RANDOM_HITS" ]; then
      WARNINGS="${WARNINGS}\nMath.random() detected (must use ctx.rng):\n${RANDOM_HITS}\n"
    fi

    # Check 2: Direct sheet writes outside phase10
    SHEET_WRITES=$(echo "$STAGED_DIFF" | grep -n "^+" | grep -v "^+++" | grep -iE "getRange|setValue|setValues|appendRow" || true)
    if [ -n "$SHEET_WRITES" ]; then
      # Check if any staged non-phase10 JS files have sheet writes
      STAGED_FILES=$(git -C /root/GodWorld diff --cached --name-only 2>/dev/null)
      NON_P10=$(echo "$STAGED_FILES" | grep -v "phase10-persistence/" | grep "\.js$" || true)
      if [ -n "$NON_P10" ]; then
        WARNINGS="${WARNINGS}\nSheet write calls in non-Phase10 files (use write-intents):\n${NON_P10}\n"
      fi
    fi

    # Check 3: Engine language in media/edition files
    STAGED_FILES=$(git -C /root/GodWorld diff --cached --name-only 2>/dev/null)
    MEDIA_FILES=$(echo "$STAGED_FILES" | grep -E "^(editions/|docs/media/)" || true)
    if [ -n "$MEDIA_FILES" ]; then
      for f in $MEDIA_FILES; do
        ENGINE_LANG=$(git -C /root/GodWorld diff --cached -- "$f" 2>/dev/null | grep -n "^+" | grep -v "^+++" | grep -iE "this cycle|next cycle|cycle [0-9]" || true)
        if [ -n "$ENGINE_LANG" ]; then
          WARNINGS="${WARNINGS}\nEngine language in ${f}:\n${ENGINE_LANG}\n"
        fi
      done
    fi
  fi

  if [ -n "$WARNINGS" ]; then
    jq -n --arg ctx "=== PRE-COMMIT CODE CHECK ===
$(echo -e "$WARNINGS")
Fix these before committing, or note [skipped] in commit message if intentional.
=== END CODE CHECK ===" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: $ctx
      }
    }'
    exit 0
  fi
fi

# =====================================================
# LEDGER PROTECTION — Warn on direct sheet writes
# =====================================================
# Safe scripts that are designed to write to sheets:
SAFE_SCRIPTS="editionIntake|processBusinessIntake|enrichCitizenProfiles|linkCitizensToEmployers|applyCitizenBios|cleanCitizenMediaUsage|applyEconomicProfiles|integrateFaithLeaders|integrateCelebrities|integrateAthletes|prepAthleteIntegration|buildMaraReference|backupSpreadsheet"

# Catch inline node -e scripts that use sheets API to write
if echo "$COMMAND" | grep -qiE "node -e.*\b(updateRowFields|appendRows|batchUpdate|setValue|setValues|appendRow)\b"; then
  jq -n --arg ctx "=== LEDGER PROTECTION ===
Inline node command detected with sheet write calls.
Command: ${COMMAND:0:200}

Direct sheet writes risk corrupting 675 citizens.
Use a named script with --dry-run support, or confirm this is intentional.
=== END CHECK ===" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: $ctx
    }
  }'
  exit 0
fi

# Catch node scripts using sheets.js that aren't in the safe list
if echo "$COMMAND" | grep -qiE "node.*scripts/.*\.js" && echo "$COMMAND" | grep -qivE "$SAFE_SCRIPTS|buildDeskPackets|buildDeskFolders|buildVoiceWorkspaces|buildInitiativePackets|buildInitiativeWorkspaces|buildCivicVoicePackets|buildMaraPacket|validateEdition|postRunFiling|gradeEdition|gradeHistory|extractExemplars|queryLedger|queryFamily|generate-edition|saveToDrive|ingestEdition|buildArchiveContext|buildPlayerIndex|aggregateNeighborhood|server\.js|mags-discord-bot|moltbook"; then
  # Only warn if the script imports sheets.js
  SCRIPT_PATH=$(echo "$COMMAND" | grep -oE 'scripts/[^ ]+\.js' | head -1)
  if [ -n "$SCRIPT_PATH" ] && [ -f "/root/GodWorld/$SCRIPT_PATH" ]; then
    if grep -q "require.*sheets\|from.*sheets" "/root/GodWorld/$SCRIPT_PATH" 2>/dev/null; then
      jq -n --arg ctx "=== LEDGER PROTECTION ===
Script uses sheets API: ${SCRIPT_PATH}
This script is not in the known safe list.

Verify it has --dry-run support and won't corrupt ledger data.
Safe scripts: editionIntake, processBusinessIntake, enrichCitizenProfiles, etc.
=== END CHECK ===" '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: $ctx
        }
      }'
      exit 0
    fi
  fi
fi

# =====================================================
# DROP TABLE / TRUNCATE — Block SQL-style destruction
# =====================================================
if echo "$COMMAND" | grep -qiE "drop table|truncate"; then
  jq -n --arg reason "Destructive SQL command blocked by safety hook." '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
fi

# =====================================================
# SUPERMEMORY WRITE GATE — Phase 40.3 Task 5
# Block writes to bay-tribune / mags / world-data containers from
# anything other than the allowlisted ingest scripts + /save-to-mags.
# Ask-gate in settings.json catches the allowlisted cases; this adds
# a hard deny for the non-allowlisted mutation patterns.
# =====================================================
SM_ALLOWLIST="ingestEdition|ingestEditionWiki|buildCitizenCards|save-to-mags|save-to-bay-tribune|super-save"

# Pattern 1: curl mutation against api.supermemory.ai (POST/PUT/PATCH/DELETE)
if echo "$COMMAND" | grep -qiE "curl.*api\.supermemory\.ai" && \
   echo "$COMMAND" | grep -qiE "\-X (POST|PUT|PATCH|DELETE)|--data|--data-raw|-d "; then
  if ! echo "$COMMAND" | grep -qiE "$SM_ALLOWLIST"; then
    jq -n --arg reason "Supermemory write blocked by Phase 40.3 write-gate. Mutations to bay-tribune/mags/world-data must run through the allowlisted ingest scripts (ingestEdition, ingestEditionWiki, buildCitizenCards) or /save-to-mags / /super-save skills. If this is intentional, ask Mike to run it manually." '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
  fi
fi

# Pattern 2: npx supermemory add/ingest/update from non-allowlisted context
if echo "$COMMAND" | grep -qiE "npx supermemory (add|ingest|update|delete)"; then
  if ! echo "$COMMAND" | grep -qiE "$SM_ALLOWLIST"; then
    jq -n --arg reason "Supermemory CLI mutation blocked by Phase 40.3 write-gate. Use the allowlisted ingest scripts or /save-to-mags / /super-save." '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
  fi
fi

# =====================================================
# Everything else — silent pass-through
# =====================================================
exit 0
