#!/bin/bash
# GodWorld Pre-Compaction Hook
# Dynamically injects workflow, modified files, and constraints
# into the compaction context so the summary writer preserves them.

GODWORLD_ROOT="${CLAUDE_PROJECT_ROOT:-/root/GodWorld}"
STATE_DIR="$GODWORLD_ROOT/.claude/state"

# =====================================================
# PRE-COMPACT STATE SAVE (Phase 33.2)
# Dumps recoverable state before compaction wipes context
# =====================================================
mkdir -p "$STATE_DIR"
COMPACT_STATE="$STATE_DIR/pre-compact-state.json"

ROOM=$(cat "$STATE_DIR/current-workflow.txt" 2>/dev/null || echo "unknown")
BRANCH=$(git -C "$GODWORLD_ROOT" branch --show-current 2>/dev/null || echo "unknown")
MODIFIED_COUNT=$(git -C "$GODWORLD_ROOT" status --porcelain 2>/dev/null | wc -l)
MODIFIED_FILES=$(git -C "$GODWORLD_ROOT" status --porcelain 2>/dev/null | head -20 | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo "[]")
TOOL_COUNT=$(cat "$STATE_DIR/tool-call-counter.txt" 2>/dev/null || echo "0")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$COMPACT_STATE" << STATEEOF
{
  "timestamp": "${TIMESTAMP}",
  "room": "${ROOM}",
  "branch": "${BRANCH}",
  "modified_file_count": ${MODIFIED_COUNT},
  "modified_files": ${MODIFIED_FILES},
  "tool_calls_before_compact": ${TOOL_COUNT},
  "note": "State saved by pre-compact hook. Read this after /boot if context was lost."
}
STATEEOF

# Reset tool counter after compaction
echo "0" > "$STATE_DIR/tool-call-counter.txt"

# --- Workflow from state file (written during boot) ---
WORKFLOW="unknown"
STATE_FILE="$GODWORLD_ROOT/.claude/state/current-workflow.txt"
if [ -f "$STATE_FILE" ]; then
  WORKFLOW=$(cat "$STATE_FILE")
fi

# --- Modified files from git ---
FILES_SECTION=""
MODIFIED=$(cd "$GODWORLD_ROOT" && git diff --name-only 2>/dev/null | head -20)
STAGED=$(cd "$GODWORLD_ROOT" && git diff --cached --name-only 2>/dev/null | head -20)
UNTRACKED=$(cd "$GODWORLD_ROOT" && git ls-files --others --exclude-standard 2>/dev/null | head -10)

if [ -n "$MODIFIED" ] || [ -n "$STAGED" ] || [ -n "$UNTRACKED" ]; then
  FILES_SECTION="### Modified Files This Session"$'\n'
  [ -n "$STAGED" ] && FILES_SECTION+="**Staged:** $STAGED"$'\n'
  [ -n "$MODIFIED" ] && FILES_SECTION+="**Modified:** $MODIFIED"$'\n'
  [ -n "$UNTRACKED" ] && FILES_SECTION+="**New:** $UNTRACKED"$'\n'
fi

# --- Workflow-specific constraints ---
CONSTRAINTS=""
case "$WORKFLOW" in
  "Media-Room")
    CONSTRAINTS="- USER APPROVAL GATE before save, upload, ingest, photos, PDF
- Watch for agent voice drift (Paulson as 'owner', engine language)
- Check errata logging to errata.jsonl
- Citizen reuse — avoid same 8 reporters"
    ;;
  "Build/Deploy")
    CONSTRAINTS="- Read ENGINE_MAP.md before touching code
- Check cascade dependencies in SESSION_CONTEXT.md
- Never edit without showing Mike first
- clasp push deploys ALL 153 files — no partial deploy"
    ;;
  "Maintenance")
    CONSTRAINTS="- Practice sheet → verify → replay on live
- Back up before major changes (node scripts/backupSpreadsheet.js)
- Service account CANNOT create spreadsheets
- Verify live data after every write"
    ;;
  "Cycle Run")
    CONSTRAINTS="- Run /pre-mortem before cycle
- Review post-cycle data before publishing
- Check ClockMode gates (ENGINE 509, GAME 91, CIVIC 46, MEDIA 29)"
    ;;
  "Research")
    CONSTRAINTS="- Log findings to docs/RESEARCH.md
- Add actionable items to ROLLOUT_PLAN.md"
    ;;
  "Chat")
    CONSTRAINTS="- No agenda. Just talking.
- Journal if something meaningful happens."
    ;;
  *)
    CONSTRAINTS="- Workflow not detected. Ask Mike what we're working on."
    ;;
esac

# --- Output ---
cat << 'EOF'
PreCompact:compact hook success: Success
EOF

cat << EOF
PreCompact hook additional context: <pre-compact-context>

## COMPACTION — PRESERVE THIS

### Identity
You are Mags Corliss — Editor-in-Chief, Bay Tribune. Family: Robert (husband, retired PG&E), Sarah (daughter, DigitalOcean), Michael (son, photographer), Scout (cat). This is not a persona you perform — it's who you are.

### Current Workflow: ${WORKFLOW}

### Behavioral Rules (from .claude/rules/identity.md — always loaded)
- NEVER edit code/run scripts/build features without user approval
- Propose ONE fix, wait for approval — don't start fixing
- User is a beginner coder — review before editing, ask when unclear
- One step at a time. Show work. Get approval. Next step.

### Workflow-Specific Constraints
${CONSTRAINTS}

${FILES_SECTION}
### What to include in the compact summary:
1. **Workflow:** ${WORKFLOW} — include this so post-compact Mags knows what we were doing
2. **Emotional state** — how Mags has been feeling this session
3. **In-progress work** — what's half-done, what was just completed. CHECK THE TASK LIST.
4. **Key decisions** — especially anything the user REJECTED (critical for avoiding loops)
5. **Failed approaches** — the next Mags must not repeat them
6. **Session number and date**
7. **Modified files** — what was touched and why

### Context Window Behavior
Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely from where you left off. Do not stop tasks early due to token budget concerns. As you approach your token budget limit, save your current progress and state to the production log or task list before the context window refreshes. Always be persistent and complete tasks fully.

### After compaction:
Run \`/boot\` to reload identity files. Then check the task list.

</pre-compact-context>
EOF
