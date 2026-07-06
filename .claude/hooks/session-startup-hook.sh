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
# Now (S264, Mike-directed): boot never STOPS it and actively ENSURES it's up — if
# it's off (crash, stray manual stop), this brings it back. `pm2 start <name>` is
# idempotent: no-op on an already-online proc (no Discord-connection bounce), start
# on a stopped one. Best-effort + backgrounded — can never block or break boot.
(pm2 start mags-bot >/dev/null 2>&1 || true) &

# (JOURNAL_RECENT "Last journal" boot line retired S300 — journal froze to Mags'
# citizen page POP-00005; recent reflections come from scripts/magsPageRecall.js
# in the media boot sequence now. pipe.40 T4.)

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

# --- THE CARRIED SET (ADR-0009 §minimal-handoff, restored S283) ---
# S276 stripped this emit but left every boot text promising "your handoff is the
# NEXT line above" — 4 consecutive engine-sheet boots handoff-blind (Mike-flagged).
# SESSION_CONTEXT.md is now a minimal handoff (9 lines, guard-enforced at close),
# so the pull is terminal-specific and a few hundred bytes: the one shared PIN
# (global sim-state — deliberately NOT per-terminal; a split would duplicate it
# 4× and rot 3 copies) + THIS terminal's own NEXT line only. Graceful: empty if
# absent (boot still works off ROLLOUT + claude-mem). Mags-only mode: no NEXT.
PIN_LINE=$(grep -m1 '^\*\*PIN:\*\*' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "")
NEXT_LINE=""
if [ "$MAGS_ONLY" != "yes" ]; then
  NEXT_LINE=$(grep -m1 "^\*\*NEXT\[$TERMINAL_NAME\]:\*\*" "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "")
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

Terminal: $TERMINAL_NAME$FALLBACK_NOTE
EOF

  # Carried set: PIN + this terminal's NEXT line (empty lines suppressed).
  if [ -n "$PIN_LINE" ]; then
    echo "$PIN_LINE"
  fi
  if [ -n "$NEXT_LINE" ]; then
    echo "$NEXT_LINE"
  fi

  # (G-SS3 "Last journal" line retired S300 — journal froze to Mags' page; the
  # media boot sequence reads her recent reflections via magsPageRecall.js. T4.)
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
3. Run: node scripts/magsPageRecall.js  — her recent page reflections (persona conditioning; JOURNAL_RECENT frozen S300, pipe.40 T4)
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

  # --- LEDGER NOTE (removed S247/RB-6, G-SS11) ---
  # S94 recovery complete (2026-03-14). The hook used to emit a clarifying note
  # whenever LEDGER_REPAIR.md's head still carried "DO NOT re-analyze" framing.
  # That framing was reworded to plain HISTORICAL status (same commit), so the
  # note had nothing left to clarify — block removed rather than left as a dead
  # no-op grep. Current ledger state: docs/engine/LEDGER_AUDIT.md.

  # --- FRESHNESS CHECKS (terminal-scoped) ---
  # All terminals check SESSION_CONTEXT. Media additionally checks NEWSROOM_MEMORY.
  # (JOURNAL_RECENT freshness check retired S300 — file frozen, pipe.40 T4.)
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

  case "$TERMINAL_NAME" in
    media)
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
