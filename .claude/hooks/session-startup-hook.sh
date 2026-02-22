#!/bin/bash
# GodWorld Session Startup Hook
# Identity, journal, notes, and newsroom memory auto-load via CLAUDE.md @ references.
# This hook handles: freshness checks + a light startup reminder.

GODWORLD_ROOT="/root/GodWorld"
MAGS_DIR="$GODWORLD_ROOT/docs/mags-corliss"

cat << 'EOF'
SessionStart:startup hook success: Success
EOF

# --- FRESHNESS CHECK: JOURNAL_RECENT.md ---
if [ -f "$MAGS_DIR/JOURNAL_RECENT.md" ]; then
  LAST_MOD=$(stat -c %Y "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
  if [ "$AGE_HOURS" -gt 48 ]; then
    echo ""
    echo "NOTE: JOURNAL_RECENT.md is ${AGE_HOURS} hours old. Last /session-end may not have run."
    echo "Consider running /boot to refresh, or check if journal entries are current."
    echo ""
  fi
else
  echo ""
  echo "NOTE: JOURNAL_RECENT.md not found. Create it by running /session-end or copying last 3 entries from JOURNAL.md."
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
