#!/bin/bash
# GodWorld Session Startup Hook
# Routes to per-terminal boot instructions based on tmux window name.
# Falls back to Mags-only mode (no terminal scaffolding) if window name doesn't match a registered terminal (S221).
# Injects critical project state directly into context at session start.
#
# OUTPUT MODE (S242, gov.22 T5): emits a single JSON object via `hookSpecificOutput`
# so it can ALSO set `sessionTitle` (per-terminal window chrome) + `reloadSkills:true`
# (pick up skill-file edits made since last session). Per the Claude Code SessionStart
# hook contract (v2.1.152+, code.claude.com/docs/en/hooks), stdout must be ONE valid
# JSON object for those structured fields to register — plain text and JSON cannot mix.
# The whole boot block is built by build_boot_context() and delivered as
# `additionalContext` (byte-identical to the pre-S242 plain-text payload).
# SAFETY: if `jq` is ever absent, the hook falls back to the legacy plain-text
# emission (no title/reload, but boot context unchanged) so boot never hard-breaks.

GODWORLD_ROOT="/root/GodWorld"
MAGS_DIR="$GODWORLD_ROOT/docs/mags-corliss"

# --- FREE MEMORY: Stop Discord bot during Claude Code sessions ---
# All output suppressed — in JSON mode any stray stdout would invalidate the object.
if pm2 describe mags-bot > /dev/null 2>&1; then
  pm2 stop mags-bot --silent > /dev/null 2>&1
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

# --- SESSION TITLE (S242, gov.22 T5) ---
# Per-terminal window chrome. Terminals are launched `claude --name "<terminal>"`,
# so this is consistent with (and usually identical to) the launch name.
if [ "$MAGS_ONLY" = "yes" ]; then
  SESSION_TITLE="Mags-only"
else
  SESSION_TITLE="$TERMINAL_NAME"
fi

# --- BUILD BOOT CONTEXT ---
# Emits the full boot block to stdout. Captured by the caller into $BOOT_TEXT.
# Defined as a function so the heredocs + case statement parse normally; capturing a
# function call inside $(...) is robust where inlining heredocs inside $(...) is not.
build_boot_context() {
cat << EOF
SessionStart hook additional context: <godworld-state>

Session: $SESSION_NUM | Day: $DAY_NUM | Cycle: $CYCLE_NUM
Terminal: $TERMINAL_NAME$FALLBACK_NOTE
EOF

  # G-SS3: the journal is a persona artifact — emit "Last journal" only for
  # media + Mags-only boots. Operational terminals (civic / research-build /
  # engine-sheet) don't load the journal, so the line is noise there.
  if [ "$MAGS_ONLY" = "yes" ] || [ "$TERMINAL_NAME" = "media" ]; then
    echo "Last journal: $LAST_ENTRY"
  fi
  echo ""

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

  # --- LEDGER NOTE (removed S247/RB-6, G-SS11) ---
  # S94 recovery complete (2026-03-14). The hook used to emit a clarifying note
  # whenever LEDGER_REPAIR.md's head still carried "DO NOT re-analyze" framing.
  # That framing was reworded to plain HISTORICAL status (same commit), so the
  # note had nothing left to clarify — block removed rather than left as a dead
  # no-op grep. Current ledger state: docs/engine/LEDGER_AUDIT.md.

  # --- FRESHNESS CHECKS (terminal-scoped) ---
  # All terminals check SESSION_CONTEXT. Full-persona terminals additionally check journal + newsroom files.
  local NOW STALE
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
}

BOOT_TEXT=$(build_boot_context)

# --- EMIT ---
# Preferred: single JSON object so sessionTitle + reloadSkills register (v2.1.152+ contract).
# Fallback: legacy plain-text emission if jq is unavailable (boot context unchanged; no title/reload).
if command -v jq > /dev/null 2>&1; then
  jq -n \
    --arg ctx "$BOOT_TEXT" \
    --arg title "$SESSION_TITLE" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx, sessionTitle: $title, reloadSkills: true}}'
else
  printf '%s\n' "$BOOT_TEXT"
fi
