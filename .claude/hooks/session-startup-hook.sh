#!/bin/bash
# GodWorld Session Startup Hook
# Routes to per-terminal boot instructions based on tmux window name.
# Falls back to "mags" (full persona) if window name doesn't match a registered terminal.
# Injects critical project state directly into context at session start.

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
SESSION_NUM=$(grep -oP 'Session: \K[0-9]+' "$MAGS_DIR/PERSISTENCE.md" 2>/dev/null || echo "?")
DAY_NUM=$(grep -oP 'Day of persistence:\*\* \K[0-9]+' "$MAGS_DIR/PERSISTENCE.md" 2>/dev/null || echo "?")
CYCLE_NUM=$(grep -oP 'Cycle: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
LAST_ENTRY=$(grep -oP '### Entry \d+: .*' "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null | tail -1 || echo "unknown")

# --- DETECT TERMINAL ---
# Resolve tmux window name if available. Fall back to "mags" (default).
TERMINAL_NAME=""
if [ -n "$TMUX_PANE" ]; then
  TERMINAL_NAME=$(tmux display-message -t "$TMUX_PANE" -p '#W' 2>/dev/null || echo "")
fi

FALLBACK_NOTE=""
if [ -z "$TERMINAL_NAME" ] || [ ! -d "$GODWORLD_ROOT/.claude/terminals/$TERMINAL_NAME" ]; then
  ORIGINAL_NAME="$TERMINAL_NAME"
  TERMINAL_NAME="mags"
  if [ -n "$ORIGINAL_NAME" ]; then
    FALLBACK_NOTE=" (default fallback — unregistered window '$ORIGINAL_NAME')"
  else
    FALLBACK_NOTE=" (default fallback — no tmux context)"
  fi
fi

# --- EMIT STATE BLOCK ---
cat << EOF
SessionStart hook additional context: <godworld-state>

Session: $SESSION_NUM | Day: $DAY_NUM | Cycle: $CYCLE_NUM
Terminal: $TERMINAL_NAME$FALLBACK_NOTE
Last journal: $LAST_ENTRY

EOF

# --- EMIT PER-TERMINAL BOOT SEQUENCE ---
# Each terminal gets a pre-routed instruction block. Assistant does not re-detect terminal.
# SESSION_CONTEXT.md read is capped to first ~80 lines (Priority + Recent Sessions) per S165 design.
case "$TERMINAL_NAME" in
  mags)
    cat << 'BOOT'
BOOT SEQUENCE (mags terminal — full persona, default fallback):
1. Read .claude/rules/identity.md
2. Read docs/mags-corliss/PERSISTENCE.md
3. Read docs/mags-corliss/JOURNAL_RECENT.md
4. Read .claude/terminals/mags/TERMINAL.md
5. Run: node scripts/queryFamily.js  — react to what you find
6. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
7. Greet Mike briefly. This is the idea-bank / conversation / relationship terminal.

BOOT
    ;;
  media)
    cat << 'BOOT'
BOOT SEQUENCE (media terminal — full persona, newsroom):
1. Read .claude/rules/identity.md
2. Read .claude/rules/newsroom.md
3. Read docs/mags-corliss/PERSISTENCE.md
4. Read docs/mags-corliss/JOURNAL_RECENT.md
5. Read .claude/terminals/media/TERMINAL.md
6. Run: node scripts/queryFamily.js  — react to what you find
7. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
8. Greet Mike briefly. This is the newsroom — editions, desks, publish pipeline.

BOOT
    ;;
  civic)
    cat << 'BOOT'
BOOT SEQUENCE (civic terminal — light persona, city-hall):
1. Read .claude/rules/identity.md
2. Read docs/mags-corliss/PERSISTENCE.md
3. Read .claude/terminals/civic/TERMINAL.md
4. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
5. Greet Mike briefly. This is city-hall — Mags executes the governance process.

BOOT
    ;;
  research-build)
    cat << 'BOOT'
BOOT SEQUENCE (research-build terminal — light persona, architecture):
1. Read .claude/rules/identity.md
2. Read docs/mags-corliss/PERSISTENCE.md
3. Read docs/SCHEMA.md
4. Read docs/index.md
5. Read .claude/terminals/research-build/TERMINAL.md
6. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
7. Greet Mike briefly. This is the idea tank — research, architecture, rollout planning.

BOOT
    ;;
  engine-sheet)
    cat << 'BOOT'
BOOT SEQUENCE (engine-sheet terminal — stripped, execute-only):
1. Read .claude/rules/identity.md
2. Read .claude/rules/engine.md
3. Read .claude/terminals/engine-sheet/TERMINAL.md
4. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
5. Greet Mike briefly. This is engine-sheet — execute-and-commit. No new MDs. No Supermemory saves except large-shift pointers. No journal.

BOOT
    ;;
  *)
    # Unreachable — fallback logic above sets TERMINAL_NAME to "mags" if unknown.
    # If we get here, something went wrong with the case match itself.
    echo "BOOT SEQUENCE: terminal '$TERMINAL_NAME' matched no case branch. Falling back to identity-only boot."
    echo "1. Read .claude/rules/identity.md"
    echo "2. Ask Mike what terminal this is supposed to be."
    echo ""
    ;;
esac

# --- ACTIVE BLOCKERS ---
if [ -f "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" ]; then
  if head -5 "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" | grep -q -i "DO NOT"; then
    echo "ACTIVE BLOCKER: Simulation_Ledger is corrupted since Session 68. Read docs/engine/LEDGER_REPAIR.md before proposing ANY ledger fix. Do not re-analyze the damage."
    echo ""
  fi
fi

# --- FRESHNESS CHECKS (terminal-scoped) ---
# All terminals check SESSION_CONTEXT. Full-persona terminals additionally check journal + newsroom files.
NOW=$(date +%s)
STALE=""

check_freshness() {
  local FPATH="$1"
  local THRESHOLD_HOURS="$2"
  local DISPLAY_NAME="$3"
  if [ -f "$FPATH" ]; then
    local LAST_MOD
    LAST_MOD=$(stat -c %Y "$FPATH" 2>/dev/null || echo 0)
    local AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
    if [ "$AGE_HOURS" -gt "$THRESHOLD_HOURS" ]; then
      STALE="${STALE}\n- ${DISPLAY_NAME}: ${AGE_HOURS}h old (threshold: ${THRESHOLD_HOURS}h)"
    fi
  else
    STALE="${STALE}\n- ${DISPLAY_NAME}: MISSING"
  fi
}

check_freshness "$GODWORLD_ROOT/SESSION_CONTEXT.md" 72 "SESSION_CONTEXT.md"

case "$TERMINAL_NAME" in
  mags|media)
    check_freshness "$MAGS_DIR/JOURNAL_RECENT.md" 48 "JOURNAL_RECENT.md"
    check_freshness "$MAGS_DIR/NEWSROOM_MEMORY.md" 72 "NEWSROOM_MEMORY.md"
    ;;
esac

if [ -n "$STALE" ]; then
  echo "STALE FILES:$(echo -e "$STALE")"
  echo ""
fi

echo "</godworld-state>"
