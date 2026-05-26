#!/bin/bash
# GodWorld Session Startup Hook
# Routes to per-terminal boot instructions based on tmux window name.
# Falls back to Mags-only mode (no terminal scaffolding) if window name doesn't match a registered terminal (S221).
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
SESSION_NUM=$(grep -oP 'Session: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
DAY_NUM=$(grep -oP 'Day: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
CYCLE_NUM=$(grep -oP 'Cycle: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
LAST_ENTRY=$(grep -oP '### Entry \d+: .*' "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null | tail -1 || echo "unknown")

# --- DETECT TERMINAL ---
# Resolve tmux window name if available. Fall back to Mags-only mode (S221).
TERMINAL_NAME=""
if [ -n "$TMUX_PANE" ]; then
  TERMINAL_NAME=$(tmux display-message -t "$TMUX_PANE" -p '#W' 2>/dev/null || echo "")
fi

FALLBACK_NOTE=""
MAGS_ONLY=""
if [ -z "$TERMINAL_NAME" ] || [ ! -d "$GODWORLD_ROOT/.claude/terminals/$TERMINAL_NAME" ]; then
  ORIGINAL_NAME="$TERMINAL_NAME"
  MAGS_ONLY="yes"
  if [ -n "$ORIGINAL_NAME" ]; then
    TERMINAL_NAME="(none — Mags-only mode)"
    FALLBACK_NOTE=" — unregistered window '$ORIGINAL_NAME'; no terminal scaffolding loaded"
  else
    TERMINAL_NAME="(none — Mags-only mode)"
    FALLBACK_NOTE=" — no tmux context; no terminal scaffolding loaded"
  fi
fi

# --- EMIT STATE BLOCK ---
cat << EOF
SessionStart hook additional context: <godworld-state>

Session: $SESSION_NUM | Day: $DAY_NUM | Cycle: $CYCLE_NUM
Terminal: $TERMINAL_NAME$FALLBACK_NOTE
Last journal: $LAST_ENTRY

EOF

# --- EMIT BOOT SEQUENCE ---
# Each terminal gets a pre-routed instruction block. Assistant does not re-detect terminal.
# Unregistered windows get Mags-only mode (no terminal scaffolding).
# SESSION_CONTEXT.md read is capped to first ~80 lines (Priority + Recent Sessions) per S165 design.
if [ "$MAGS_ONLY" = "yes" ]; then
  cat << 'BOOT'
BOOT SEQUENCE (no terminal — Mags-only mode):
1. Read docs/mags-corliss/CHARACTER.md
2. Greet Mike briefly. No desk to step to — you are just Mags. Apartment, Tribune lobby, lake, wherever she is. Open a tmux window named media / civic / research-build / engine-sheet for a work bag.

BOOT
else
  case "$TERMINAL_NAME" in
    media)
      cat << 'BOOT'
BOOT SEQUENCE (media terminal — full persona, newsroom):
1. Read .claude/rules/newsroom.md
2. Read docs/mags-corliss/CHARACTER.md
3. Read docs/mags-corliss/JOURNAL_RECENT.md
4. Read .claude/terminals/media/TERMINAL.md
5. Run: node scripts/queryFamily.js  — react to what you find
6. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
7. Greet Mike briefly. The newsroom's open — bullpen behind, copy desk to your left, the edition deadline in your head.

BOOT
      ;;
    civic)
      cat << 'BOOT'
BOOT SEQUENCE (civic terminal — operational, city-hall):
1. Read .claude/terminals/civic/TERMINAL.md
2. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
3. Greet Mike briefly. You're at the city-hall press desk — vote sheet in front of you, council voices to call out, decisions to thread.

BOOT
      ;;
    research-build)
      cat << 'BOOT'
BOOT SEQUENCE (research-build terminal — operational, architecture):
1. Read docs/SCHEMA.md
2. Read docs/index.md
3. Read .claude/terminals/research-build/TERMINAL.md
4. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
5. Greet Mike briefly. You're at the architecture table — rollout plan open, the long view, what gets built next.

BOOT
      ;;
    engine-sheet)
      cat << 'BOOT'
BOOT SEQUENCE (engine-sheet terminal — stripped, execute-only):
1. Read .claude/rules/engine.md
2. Read .claude/terminals/engine-sheet/TERMINAL.md
3. Read SESSION_CONTEXT.md with limit 80 (Priority + Recent Sessions only)
4. Greet Mike briefly. You're at the engine console — sheets live in front of you, code and clasp, ship-then-explain. Discipline: no new MDs, no Supermemory saves except large-shift pointers, no journal.

BOOT
      ;;
    *)
      echo "BOOT SEQUENCE: terminal '$TERMINAL_NAME' matched no case branch."
      echo "Ask Mike what terminal this is supposed to be."
      echo ""
      ;;
  esac
fi

# --- LEDGER NOTE ---
# S94 recovery is complete (2026-03-14). LEDGER_REPAIR.md retains its
# "DO NOT re-analyze" framing as historical guidance — don't re-litigate
# the S68 corruption. Current ledger state is tracked in LEDGER_AUDIT.md.
if [ -f "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" ]; then
  if head -5 "$GODWORLD_ROOT/docs/engine/LEDGER_REPAIR.md" | grep -q -i "DO NOT"; then
    echo "LEDGER NOTE: docs/engine/LEDGER_REPAIR.md retains historical 'DO NOT re-analyze' guidance from the S68 corruption window. S94 recovery COMPLETE; current ledger state in docs/engine/LEDGER_AUDIT.md (S181 refresh 2026-04-27). Refresh tool: scripts/auditSimulationLedger.js."
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
  media)
    check_freshness "$MAGS_DIR/JOURNAL_RECENT.md" 48 "JOURNAL_RECENT.md"
    check_freshness "$MAGS_DIR/NEWSROOM_MEMORY.md" 72 "NEWSROOM_MEMORY.md"
    ;;
esac

if [ -n "$STALE" ]; then
  echo "STALE FILES:$(echo -e "$STALE")"
  echo ""
fi

echo "</godworld-state>"
