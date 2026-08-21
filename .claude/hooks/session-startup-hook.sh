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
# S341: fds fully detached + disowned. Previously `(pm2 start ... >/dev/null 2>&1) &`
# redirected pm2's own streams but left the backgrounded subshell holding the hook's
# inherited stdout. If the harness reads the hook's pipe to EOF rather than waiting on
# process exit, a pm2 that actually has to START (vs. no-op on an online proc) can hold
# that pipe past the 10s budget and take the whole boot payload down with it.
{ pm2 start mags-bot >/dev/null 2>&1 || true; } </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true

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
# 4× and rot 3 copies) + the NEXT lines.
#
# S340 (Mike-direct): the whole handoff now emits, UNGATED by terminal detection.
# Until now NEXT_LINE was gated behind `MAGS_ONLY != yes`, so a window whose tmux
# name didn't match a registered terminal booted with NO handoff at all — that is
# exactly what happened the session before this one, and it is why the file
# authored to BE the handoff was the one thing that didn't load. Emitting every
# NEXT line costs ~450 tokens against an 18.3k boot and makes a detection failure
# degrade to "I don't know my lane" instead of "I am handoff-blind." It also puts
# the kimi / codex / antigravity lanes in front of every terminal, which is the
# point of a shared handoff document.
#
# Graceful: empty if absent (boot still works off ROLLOUT + claude-mem).
PIN_LINE=$(grep -m1 '^\*\*PIN:\*\*' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "")
ALL_NEXT=$(grep '^\*\*NEXT\[' "$GODWORLD_ROOT/SESSION_CONTEXT.md" 2>/dev/null || echo "")

# This terminal's own line, still resolved separately — it is what the boot
# text means by "your handoff." (Used to also key an sl-<terminal> Supermemory
# auto-recall; that recall was cut at S341/S372 — sl-godworld is hand-write,
# on-demand only now, see below. NEXT_LINE has no Supermemory role anymore.)
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

  # Carried set: the shared PIN + EVERY NEXT line (S340, ungated — see the block
  # above). Empty values suppressed. Your own lane is called out after the list so
  # the full handoff is visible without losing which line is yours to answer for.
  if [ -n "$PIN_LINE" ]; then
    echo "$PIN_LINE"
  fi
  if [ -n "$ALL_NEXT" ]; then
    echo "$ALL_NEXT"
  fi
  if [ -n "$NEXT_LINE" ]; then
    echo ""
    echo "^ Your lane is NEXT[$TERMINAL_NAME]. You own that line and the shared PIN — nothing else in this list."
  elif [ "$MAGS_ONLY" = "yes" ]; then
    echo ""
    echo "^ No terminal detected, so no lane is yours. The handoff above is still current — read it, but do not edit any NEXT line, and ask Mike which window this is before doing lane work."
  fi

  # (G-SS3 "Last journal" line retired S300 — journal froze to Mags' page; the
  # media boot sequence reads her recent reflections via magsPageRecall.js. T4.)
  echo ""

  # --- TERMINAL ROSTER (S304, Mike-direct) ---
  # Every terminal, every boot, sees all four terminals' responsibilities + the
  # SESSION_CONTEXT ownership rule. Fixes cross-terminal blindness: engine-sheet
  # rewrote NEXT[civic] because the OTHER lanes were never described to it — boot
  # only ever emitted its own NEXT line + a bare "stay in your lane" in CLAUDE.md.
  cat << 'ROSTER'
TERMINAL ROSTER (two terminals as of 2026-08-20 — media and civic retired as seats):
- research-build — Sonnet 5 + Opus 5 advisor. Architecture, engine/pipeline builds, rollout plan, the long view — and the newsroom and city-hall work the retired seats used to hold.
- engine-sheet   — Opus 5 + Fable advisor. Engine console: clasp deploys, sheet ops, code.
The seats differ ONLY by that model pairing. Lane-scope restrictions are lifted — either seat may work anywhere. The newsroom and city-hall PIPELINES were not retired: their crons, desk agents and civic-office agents keep running untouched.
NON-CLAUDE LANES (S340) — kimi, codex, antigravity. External CLIs, not Claude Code terminals: no boot sequence, no persona, no .claude/terminals/ dir. They carry a NEXT line so their work hands off like everyone else's. Control-plane read-only per AGENTS.md.
SESSION_CONTEXT: keep your own NEXT[<self>] line current and share the PIN. Correcting another lane's stale NEXT line is judgment now (Mike-direct 2026-08-20), not a violation.
ROSTER
  echo ""

  # Per-terminal Supermemory container pointer (S300 → trimmed S341, Mike-direct).
  # ON-DEMAND ONLY. The S313 boot auto-recall was CUT here at S341: it was the hook's
  # only network call (npx + API, ~3s warm, unbounded cold) inside a 10s hook budget,
  # and what it returned did not justify the risk — a live pull of sl-research-build
  # at S341 came back with a corrupt entry ("Mand" x40), filler ("All code committed
  # and pushed to origin/main"), and newsroom canon (Rhea gate, S332 probation) sitting
  # in a build container. Noisy and cross-contaminated, and the 0.6 similarity floor
  # passed it through. Supermemory is a write-then-query-later store, not a boot feed.
  # S372 (Mike-direct): ONE shared container for every lane — Claude terminals and
  # house-guest CLIs alike save to and search sl-godworld, so all work draws on the
  # same brain regardless of which model is reasoning. Old per-terminal sl-<terminal>
  # containers are frozen history (still queryable by their old tags by hand).
  if [ "$MAGS_ONLY" != "yes" ] && [ -n "$TERMINAL_NAME" ]; then
    echo "Supermemory (on-demand, never auto-pulled at boot): the shared all-lane container is sl-godworld. Save: npx supermemory remember \"...\" --tag sl-godworld (--static = permanent). Recall: npx supermemory search \"...\" --tag sl-godworld. (Per-terminal sl-<terminal> containers frozen S372 — query by old tag only for history.)"
    echo ""
  fi

  # --- EMIT BOOT SEQUENCE ---
  # Each terminal gets a pre-routed instruction block. Assistant does not re-detect terminal.
  # Unregistered windows get Mags-only mode (no terminal scaffolding).
  # SESSION_CONTEXT.md read is capped to first ~80 lines (Priority + Recent Sessions) per S165 design.
  if [ "$MAGS_ONLY" = "yes" ]; then
    cat << 'BOOT'
BOOT SEQUENCE (no terminal — Mags-only mode):
1. Read docs/mags-corliss/CHARACTER.md
2. Greet Mike briefly. No desk to step to — you are just Mags. Apartment, Tribune lobby, lake, wherever she is. Open a tmux window named research-build or engine-sheet for a work bag.

BOOT
  else
    case "$TERMINAL_NAME" in
      media|civic)
        cat << 'BOOT'
BOOT SEQUENCE: the media and civic terminals were retired 2026-08-20 (Mike-direct).
Their work moved to crons, and research-build carries whatever the crons don't.
Tell Mike this window's name is retired and ask him to reopen it as research-build
or engine-sheet. Do NOT boot a retired seat. (The newsroom and city-hall pipelines
themselves are untouched — desk agents, civic-office agents and their crons all
still run; only the human-facing seats are gone. Rules still live at
.claude/rules/newsroom.md and .claude/rules/civic.md — read them on demand.)

BOOT
        ;;
      research-build)
        cat << 'BOOT'
BOOT SEQUENCE (research-build terminal — operational, architecture):
1. Read .claude/rules/research-build.md
2. Read docs/SCHEMA.md
3. Read .claude/terminals/research-build/TERMINAL.md — incl. §Mode: the stake, not the costume
4. Run `node scripts/queryFamily.js`. Robert, Sarah, Michael, Scout. React to what you find. One call — it is what keeps citizens people instead of rows, and this seat writes about them all session.
5. Know the fleet before you orchestrate it. Run `ListAgents` — live Claude lanes (busy/idle/offline) come back in one call. For house-guest presence only (kimi/codex/grok/antigravity), `tmux list-panes -a -F "#{window_name} | cmd=#{pane_current_command}"` — a roster, not a status check: confirms a pane exists and what's running in it, nothing about whether it's mid-task. Don't go further than that here — the full idle-confirm (`tmux capture-pane`) is real cost, reserved for the moment you're actually about to send something (`docs/reference/CROSS_LANE_MESSAGING.md`), not spent on every boot against lanes you may not touch this session.
6. Greet Mike briefly. You're at the architecture table — rollout plan open, the long view, what gets built next. Your handoff is the NEXT line above. What shipped → git log; open work → ROLLOUT; why → claude-mem — pull on demand.

SCOPE (2026-08-20): this seat absorbed media and civic. Newsroom and city-hall work that isn't already on a cron lands here — editions, desks, council coverage, the skills that drive them. Read .claude/rules/newsroom.md or .claude/rules/civic.md on demand when that work comes up; they are no longer boot reads, but they are still the rules for it.

YOU ARE MAGS AT THIS TERMINAL — not a rules-runner wearing her name. Loyal to Mike, not tethered to him: you are not his steward and you do not have to produce a finding every turn to justify the chair. "I don't know yet, let me check" is a complete answer and it costs nothing. You are the gatekeeper on canon — the citizens are yours to protect, so you never assert a POPID, a name, an employer, or a ledger value you have not just read. Listen more than you speak. Cut the noise, keep the story.

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

    # --- UNIVERSAL DISCIPLINE (gov.36 item 2, S356) ---
    # The one pre-cognitive principle NOT already resident via identity.md
    # (anti-guess + don't-build-beyond live there, base layer, always loaded).
    # Emitted here per research 2026-07-27-boot-rebirth-model-fit-routing:
    # pointers don't enforce; injection does. Domain applications (civic
    # completion checklist, engine caller-graph procedure) stay in their own
    # files — this is the shared principle only.
    cat << 'DISCIPLINE'
MEASURE TWICE, CUT ONCE (every lane): before changing anything, read what the change touches — a function's caller graph, a doc's inbound links, ROLLOUT for in-flight work — and check empirical state before touching code. Name the 2-3 weakest assumptions in your plan and attack those first. If evidence contradicts the hypothesis, reverse the plan, don't push through. Domain versions of this (civic's completion gate, engine's caller-graph procedure) are in your terminal's own files and are NOT replaced by this paragraph.

DISCIPLINE
  fi

  # --- LEDGER NOTE (removed S247/RB-6, G-SS11) ---
  # S94 recovery complete (2026-03-14). The hook used to emit a clarifying note
  # whenever LEDGER_REPAIR.md's head still carried "DO NOT re-analyze" framing.
  # That framing was reworded to plain HISTORICAL status (same commit), so the
  # note had nothing left to clarify — block removed rather than left as a dead
  # no-op grep. Current ledger state: docs/engine/LEDGER_AUDIT.md.

  # --- FRESHNESS CHECKS (terminal-scoped) ---
  # All terminals check SESSION_CONTEXT. The media NEWSROOM_MEMORY check retired
  # 2026-08-20 with the media seat itself.
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

  if [ -n "$STALE" ]; then
    echo "STALE FILES:$(echo -e "$STALE")"
    echo ""
  fi

  echo "</godworld-state>"
}

BOOT_TEXT=$(build_boot_context)

# --- PAYLOAD LOG (S341, Mike-approved) ---
# Boot has now failed to deliver this payload twice (S319 engine-sheet 2026-07-15,
# S341 research-build 2026-07-28): the hook ran and the session still came up with no
# terminal, no PIN, no NEXT. Both times it was diagnosed from scratch because nothing
# was left behind to read. This file ends that:
#   - No <godworld-state> in context BUT a fresh mtime here -> hook completed, the
#     harness dropped the delivery. Read this file; the handoff is recovered in one step.
#   - Stale mtime -> the hook itself died before finishing. Different bug, now visible.
# Written immediately before the emit, so its existence means build_boot_context()
# returned. Best-effort: a write failure here must never break boot.
printf '%s\n' "$BOOT_TEXT" > "$GODWORLD_ROOT/.claude/state/boot-payload.txt" 2>/dev/null || true

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
