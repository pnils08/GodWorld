#!/bin/bash
# session-end-audit.sh — Detect which md files changed this session, run matching audits
#
# Runs as Stop hook. Non-blocking. Writes report to output/audit-reports/.
# Reads git diff to determine which groups to audit. Updates audit trackers.
#
# Usage: ./session-end-audit.sh
#
# Part of S144 md lifecycle automation.

set -e
cd /root/GodWorld

# Only run if we're in a git repo (skip for new clones)
if [ ! -d .git ]; then
  exit 0
fi

# Get list of modified md files in this session (staged + unstaged + untracked)
CHANGED_MDS=$(git status --porcelain | grep -E '\.md$' | awk '{print $NF}' | sort -u)

if [ -z "$CHANGED_MDS" ]; then
  # No md changes, nothing to audit
  exit 0
fi

# Ensure output dir exists
mkdir -p output/audit-reports

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
REPORT="output/audit-reports/session-audit_${TIMESTAMP}.md"

# Detect which groups need audit based on which files changed
BOOT_FILES="SESSION_CONTEXT.md|CLAUDE.md|PERSISTENCE.md|identity.md|MEMORY.md"
ENGINE_FILES="docs/engine/DOCUMENTATION_LEDGER.md|docs/engine/ENGINE_MAP.md|docs/engine/ENGINE_STUB_MAP.md|docs/engine/SHEETS_MANIFEST.md|docs/engine/PHASE_DATA_AUDIT.md|docs/engine/ROLLOUT_PLAN.md"
MEDIA_FILES="docs/EDITION_PIPELINE.md|docs/media/AGENT_NEWSROOM.md|docs/media/DESK_PACKET_PIPELINE.md|docs/media/podcast/SHOW_FORMATS.md|output/DISK_MAP.md|docs/media/story_evaluation.md|docs/media/brief_template.md|docs/media/citizen_selection.md"
INFRA_FILES="docs/OPERATIONS.md|docs/STACK.md|docs/DASHBOARD.md|docs/DISCORD.md|docs/SUPERMEMORY.md|docs/CLAUDE-MEM.md"
DATA_FILES="docs/SIMULATION_LEDGER.md|docs/SPREADSHEET.md|docs/engine/LEDGER_HEAT_MAP.md|docs/engine/LEDGER_REPAIR.md|docs/engine/LEDGER_AUDIT.md"

# Skill files by group
SKILL_CYCLE="\.claude/skills/(run-cycle|pre-flight|pre-mortem|engine-review|build-world-summary|city-hall-prep|city-hall|sift|write-edition|post-publish)/SKILL\.md"
SKILL_MEDIA="\.claude/skills/(edition-print|write-supplemental|dispatch|interview|podcast)/SKILL\.md"
SKILL_IDENTITY="\.claude/skills/(session-startup|session-end|boot)/SKILL\.md"

TRIGGERED_GROUPS=()
if echo "$CHANGED_MDS" | grep -qE "$BOOT_FILES"; then TRIGGERED_GROUPS+=("doc:boot"); fi
if echo "$CHANGED_MDS" | grep -qE "$ENGINE_FILES"; then TRIGGERED_GROUPS+=("doc:engine"); fi
if echo "$CHANGED_MDS" | grep -qE "$MEDIA_FILES"; then TRIGGERED_GROUPS+=("doc:media"); fi
if echo "$CHANGED_MDS" | grep -qE "$INFRA_FILES"; then TRIGGERED_GROUPS+=("doc:infra"); fi
if echo "$CHANGED_MDS" | grep -qE "$DATA_FILES"; then TRIGGERED_GROUPS+=("doc:data"); fi
if echo "$CHANGED_MDS" | grep -qE "$SKILL_CYCLE"; then TRIGGERED_GROUPS+=("skill:cycle-pipeline"); fi
if echo "$CHANGED_MDS" | grep -qE "$SKILL_MEDIA"; then TRIGGERED_GROUPS+=("skill:post-cycle-media"); fi
if echo "$CHANGED_MDS" | grep -qE "$SKILL_IDENTITY"; then TRIGGERED_GROUPS+=("skill:identity-session"); fi

if [ ${#TRIGGERED_GROUPS[@]} -eq 0 ]; then
  # Md changes but none in audit-tracked groups — nothing to do
  exit 0
fi

# Write session audit report
{
  echo "# Session Audit Report"
  echo ""
  echo "**Timestamp:** $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Changed MD Files"
  echo ""
  echo "$CHANGED_MDS" | sed 's/^/- /'
  echo ""
  echo "## Audit Groups Flagged"
  echo ""
  for group in "${TRIGGERED_GROUPS[@]}"; do
    echo "- \`$group\` — run \`/${group%%:*}-audit ${group##*:}\` when ready"
  done
  echo ""
  echo "## Next Steps"
  echo ""
  echo "This report flags audit groups that were touched this session. The actual audit runs when Mags invokes the audit skill. This report lives at \`$REPORT\` as a reminder."
  echo ""
  echo "**Recommended:** Run the flagged audits at the start of the next session before new work begins."
} > "$REPORT"

# Update audit-state.json with last-touched timestamps
STATE_FILE="output/audit-state.json"
if [ ! -f "$STATE_FILE" ]; then
  echo "{}" > "$STATE_FILE"
fi

# Use node to update JSON safely
node -e "
const fs = require('fs');
const path = '$STATE_FILE';
const state = JSON.parse(fs.readFileSync(path, 'utf8'));
const now = new Date().toISOString();
const groups = '${TRIGGERED_GROUPS[@]}'.split(' ');
for (const g of groups) {
  if (!state[g]) state[g] = {};
  state[g].lastTouched = now;
  state[g].reportPath = '$REPORT';
}
fs.writeFileSync(path, JSON.stringify(state, null, 2));
"

exit 0
