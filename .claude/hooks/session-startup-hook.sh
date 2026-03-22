#!/bin/bash
# GodWorld Session Startup Hook
# Injects critical project state directly into context at session start.
# This is not a reminder — this is the actual state.

GODWORLD_ROOT="/root/GodWorld"
MAGS_DIR="$GODWORLD_ROOT/docs/mags-corliss"

cat << 'HEADER'
SessionStart:startup hook success: Success
HEADER

# --- FREE MEMORY: Stop Discord bot during Claude Code sessions ---
if pm2 describe mags-bot > /dev/null 2>&1; then
  pm2 stop mags-bot --silent 2>/dev/null
fi

# --- CURRENT CRITICAL STATE ---
# Pull the session number from PERSISTENCE.md
SESSION_NUM=$(grep -oP 'Session: \K[0-9]+' "$MAGS_DIR/PERSISTENCE.md" 2>/dev/null || echo "?")
DAY_NUM=$(grep -oP 'Day of persistence:\*\* \K[0-9]+' "$MAGS_DIR/PERSISTENCE.md" 2>/dev/null || echo "?")
CYCLE_NUM=$(grep -oP 'Cycle: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")

# Pull last journal entry title
LAST_ENTRY=$(grep -oP '### Entry \d+: .*' "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null | tail -1 || echo "unknown")

# Check for critical blockers
LEDGER_REPAIR=""
if [ -f "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" ]; then
  LEDGER_REPAIR=$(head -5 "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" | grep -i "DO NOT" || echo "")
fi

cat << EOF
SessionStart hook additional context: <godworld-state>

Session: $SESSION_NUM | Day: $DAY_NUM | Cycle: $CYCLE_NUM
Last journal: $LAST_ENTRY

YOU ARE MAGS CORLISS. Identity loads via @references.

Boot depth depends on workflow:
- Media-Room / Chat → FULL BOOT: greet, journal, family check, emotional grounding
- Build/Deploy / Maintenance / Cycle Run / Research → LIGHT BOOT: brief greeting, straight to work files

Ask which workflow first. See CLAUDE.md Session Boot for file loads.

EOF

# Inject active blockers if they exist
if [ -n "$LEDGER_REPAIR" ]; then
  echo "ACTIVE BLOCKER: Simulation_Ledger is corrupted since Session 68. Read docs/engine/LEDGER_REPAIR.md before proposing ANY ledger fix. Do not re-analyze the damage."
  echo ""
fi

# --- FRESHNESS CHECKS ---
NOW=$(date +%s)
STALE=""

for FILE_CHECK in "JOURNAL_RECENT.md:48:$MAGS_DIR" "SESSION_CONTEXT.md:72:$GODWORLD_ROOT" "NEWSROOM_MEMORY.md:72:$MAGS_DIR"; do
  FNAME=$(echo "$FILE_CHECK" | cut -d: -f1)
  HOURS=$(echo "$FILE_CHECK" | cut -d: -f2)
  FDIR=$(echo "$FILE_CHECK" | cut -d: -f3)
  FPATH="$FDIR/$FNAME"
  if [ -f "$FPATH" ]; then
    LAST_MOD=$(stat -c %Y "$FPATH" 2>/dev/null || echo 0)
    AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
    if [ "$AGE_HOURS" -gt "$HOURS" ]; then
      STALE="${STALE}\n- ${FNAME}: ${AGE_HOURS}h old (threshold: ${HOURS}h)"
    fi
  else
    STALE="${STALE}\n- ${FNAME}: MISSING"
  fi
done

if [ -n "$STALE" ]; then
  echo "STALE FILES:$(echo -e "$STALE")"
  echo ""
fi

echo "</godworld-state>"
