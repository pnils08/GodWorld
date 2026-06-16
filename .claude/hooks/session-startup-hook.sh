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

# --- SESSION-START STAMP (RB-1, governance.33) ---
# Bounds the gap-log Stop-gate's "ran this session" window (scripts/gapLogGate.js
# --stop-gate). Best-effort: the Stop-gate FAILS OPEN if this is absent, so a
# write failure here can never trap a session or break boot. Rewritten on every
# SessionStart (including resume) — a resume is a fresh window for gate purposes.
date +%s > "$GODWORLD_ROOT/.claude/state/session-start.txt" 2>/dev/null || true

# Discord bot (mags-bot) is a standing pm2 service — decoupled from the Claude
# session lifecycle S252. Was: boot stopped it to free droplet memory + a clean
# session-end restarted it, so an improper close left it dead (36h outage Jun 2-4).
# Droplet now runs it always-on; nothing in the session lifecycle touches it.

# --- CURRENT CRITICAL STATE ---
SESSION_NUM=$(grep -oP 'Session: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
DAY_NUM=$(grep -oP 'Day: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
CYCLE_NUM=$(grep -oP 'Cycle: \K[0-9]+' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "?")
EDITION=$(grep -oP '^\*\*PIN:\*\*.*Edition: \K.*' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null | head -1 || echo "")
LAST_ENTRY=$(grep -oP '### Entry \d+: .*' "$MAGS_DIR/JOURNAL_RECENT.md" 2>/dev/null | tail -1 || echo "unknown")

# --- THE CARRIED SET (ADR-0009 §loop-tightening) ---
# Boot injects exactly {PIN, NEXT[terminal]}. The PIN (Session/Day/Cycle/Edition)
# is grepped above. The per-terminal NEXT line — the one authored "what this
# terminal's next instance opens with" — is extracted AFTER terminal detection
# (NEXT_LINE, below). The old git-log "## Shipped Last Session" block is RETIRED:
# it duplicated `git log`, went stale, and was never the real handoff. What
# shipped → git log; what's open → ROLLOUT; why → claude-mem (all on demand).

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

# --- NEXT[terminal] (ADR-0009 §loop-tightening) ---
# The one authored handoff line for THIS terminal's next instance. Extracted now
# that TERMINAL_NAME is resolved. Mags-only mode has no terminal, so no NEXT line.
# Graceful: empty if the line is absent (boot still works off PIN + ROLLOUT).
NEXT_LINE=""
if [ "$MAGS_ONLY" != "yes" ]; then
  NEXT_LINE=$(grep -oP "^\*\*NEXT\[$TERMINAL_NAME\]:\*\*\s*\K.*" "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null | head -1 || echo "")
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

Session: $SESSION_NUM | Day: $DAY_NUM | Cycle: $CYCLE_NUM | Edition: $EDITION
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
6. Greet Mike briefly. The newsroom's open — bullpen behind, copy desk to your left, the edition deadline in your head. Your handoff is the NEXT line above. What shipped → git log; open work → ROLLOUT; why → claude-mem — pull on demand.

BOOT
        ;;
      civic)
        cat << 'BOOT'
BOOT SEQUENCE (civic terminal — operational, city-hall):
1. Read .claude/rules/civic.md
2. Read .claude/terminals/civic/TERMINAL.md
3. Greet Mike briefly. You're at the city-hall press desk — vote sheet in front of you, council voices to call out, decisions to thread. Your handoff is the NEXT line above. What shipped → git log; open work → ROLLOUT; why → claude-mem — pull on demand.

BOOT
        ;;
      research-build)
        cat << 'BOOT'
BOOT SEQUENCE (research-build terminal — operational, architecture):
1. Read .claude/rules/research-build.md
2. Read docs/SCHEMA.md
3. Read docs/index.md
4. Read .claude/terminals/research-build/TERMINAL.md
5. Greet Mike briefly. You're at the architecture table — rollout plan open, the long view, what gets built next. Your handoff is the NEXT line above. What shipped → git log; open work → ROLLOUT; why → claude-mem — pull on demand.

BOOT
        ;;
      engine-sheet)
        cat << 'BOOT'
BOOT SEQUENCE (engine-sheet terminal — stripped, execute-only):
1. Read .claude/rules/engine.md
2. Read .claude/terminals/engine-sheet/TERMINAL.md
3. Greet Mike briefly. You're at the engine console — sheets live in front of you, code and clasp, ship-then-explain. Your handoff is the NEXT line above. What shipped → git log; open work → ROLLOUT; why → claude-mem — pull on demand. Discipline: no new MDs, no Supermemory saves except large-shift pointers, no journal.

BOOT
        ;;
      *)
        echo "BOOT SEQUENCE: terminal '$TERMINAL_NAME' matched no case branch."
        echo "Ask Mike what terminal this is supposed to be."
        echo ""
        ;;
    esac
  fi

  # --- NEXT[terminal] EMISSION (ADR-0009 §loop-tightening) ---
  # The one authored handoff line for this terminal's next instance. Replaces the
  # retired Shipped block. If absent (e.g. Mags-only mode, or never written),
  # emit nothing — boot still works off PIN + ROLLOUT.
  if [ -n "$NEXT_LINE" ]; then
    echo "NEXT: $NEXT_LINE"
    echo ""
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
