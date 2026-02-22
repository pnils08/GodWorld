#!/bin/bash
# GodWorld Session Startup Hook
# Identity, journal, notes, and newsroom memory auto-load via CLAUDE.md @ references.
# This hook handles: freshness checks + a light startup reminder.

GODWORLD_ROOT="/root/GodWorld"
MAGS_DIR="$GODWORLD_ROOT/docs/mags-corliss"

cat << 'EOF'
SessionStart:startup hook success: Success
EOF

# --- FRESHNESS CHECKS ---
NOW=$(date +%s)
STALE_FILES=""

# Check JOURNAL_RECENT.md
if [ -f "$MAGS_DIR/JOURNAL_RECENT.md" ]; then
  LAST_MOD=$(stat -c %Y "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null || echo 0)
  AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
  if [ "$AGE_HOURS" -gt 48 ]; then
    STALE_FILES="${STALE_FILES}\n- JOURNAL_RECENT.md: ${AGE_HOURS}h old"
  fi
else
  STALE_FILES="${STALE_FILES}\n- JOURNAL_RECENT.md: MISSING"
fi

# Check SESSION_CONTEXT.md
if [ -f "$GODWORLD_ROOT/SESSION_CONTEXT.md" ]; then
  LAST_MOD=$(stat -c %Y "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo 0)
  AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
  if [ "$AGE_HOURS" -gt 72 ]; then
    STALE_FILES="${STALE_FILES}\n- SESSION_CONTEXT.md: ${AGE_HOURS}h old"
  fi
fi

# Check NEWSROOM_MEMORY.md
if [ -f "$MAGS_DIR/NEWSROOM_MEMORY.md" ]; then
  LAST_MOD=$(stat -c %Y "$MAGS_DIR/NEWSROOM_MEMORY.md" 2>/dev/null || echo 0)
  AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
  if [ "$AGE_HOURS" -gt 72 ]; then
    STALE_FILES="${STALE_FILES}\n- NEWSROOM_MEMORY.md: ${AGE_HOURS}h old"
  fi
fi

if [ -n "$STALE_FILES" ]; then
  echo ""
  echo "STALE FILE WARNING:$(echo -e "$STALE_FILES")"
  echo "Run /session-end to update, or /boot to refresh context."
  echo ""
fi

# --- STARTUP REMINDER ---
cat << 'EOF'

<godworld-session-startup>

Identity, journal, notes, and newsroom memory are preloaded via CLAUDE.md @ references.

**Already loaded:**
- PERSISTENCE.md — identity, family, session continuity
- JOURNAL_RECENT.md — last 3 journal entries
- NOTES_TO_SELF.md — active flags, story ideas
- NEWSROOM_MEMORY.md — errata, editorial notes, character threads
- SESSION_CONTEXT.md — engine versions, active work
- README.md — project structure

**Remaining steps:**
1. Search Supermemory — `/super-search --both "recent changes current work"`
2. Check batch results — `/batch check`
3. Confirm understanding with the user

**Recovery after compaction:** `/boot`

</godworld-session-startup>
EOF
