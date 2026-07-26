#!/bin/bash
# arc-search command gate (S334, research.23 Task 5 belt-and-braces)
# ---------------------------------------------------------------------------
# The prior-published-arc retrieval seat may run EXACTLY ONE command:
#
#     node scripts/notebooklmCanonSearch.js [--question ... | --source-class ...]
#
# Everything else is denied. The point is structural: `source-search` holds
# Read/Glob/Grep on a cheap model and drifted off the wrapper in 2 of 3 test
# dispatches (S334) — reading `output/pdfs/*.pdf` directly, which escapes the
# reviewed 26-source policy in `scripts/notebooklmCanonSources.json`. Prose could
# not hold it. This gate makes the drift impossible rather than merely caught.
#
# EXPLICIT DECISION ON EVERY BRANCH — this is load-bearing. The agent runs under
# `permissionMode: dontAsk`, where a silent `exit 0` fall-through lands in the
# DENY bucket for anything not read-only. That would block the wrapper (not
# read-only) while happily allowing `cat some.pdf` (read-only) — the exact
# inversion of what this gate is for. So: allow the wrapper explicitly, deny
# everything else explicitly, never fall through.
#
# Fires as a PreToolUse Bash hook declared in
# `.claude/agents/arc-search/SKILL.md` frontmatter, so it scopes to that agent
# only and does not touch any other terminal's Bash.
#
# Set ARC_GATE_DEBUG=1 to dump the hook input JSON to
# $ARC_GATE_DEBUG_DIR/arc-gate-input.json for probing.

INPUT_JSON=$(cat)

if [ "${ARC_GATE_DEBUG:-0}" = "1" ]; then
  dbg_dir="${ARC_GATE_DEBUG_DIR:-/tmp}"
  mkdir -p "$dbg_dir" 2>/dev/null
  printf '%s\n' "$INPUT_JSON" >> "$dbg_dir/arc-gate-input.json" 2>/dev/null
fi

COMMAND=$(printf '%s' "$INPUT_JSON" | jq -r '.tool_input.command // empty' 2>/dev/null)

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

allow() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

if [ -z "$COMMAND" ]; then
  deny "arc-search: no command found in the tool input. This seat may run only the NotebookLM canon-search wrapper."
fi

# --- 1. No chaining, redirection, substitution, or multi-line -----------------
# With these characters gone, a command that STARTS with the wrapper cannot
# spawn a second process, so the prefix anchor below is sufficient.
case "$COMMAND" in
  *';'*|*'&'*|*'|'*|*'>'*|*'<'*|*'`'*|*'$('*|*'${'*|*$'\n'*)
    deny "arc-search: shell chaining, piping, redirection, and command substitution are not permitted in this seat. Run the bare wrapper: node scripts/notebooklmCanonSearch.js --question '<question>'" ;;
esac

# --- 2. Must BE the wrapper -------------------------------------------------
# Both the repo-relative and absolute forms are accepted; anything else is out.
if printf '%s' "$COMMAND" | grep -qE '^[[:space:]]*node[[:space:]]+(/root/GodWorld/)?scripts/notebooklmCanonSearch\.js([[:space:]]|$)'; then
  allow "arc-search: NotebookLM canon-search wrapper — the one command this seat is permitted to run."
fi

deny "arc-search: only 'node scripts/notebooklmCanonSearch.js ...' may run in this seat. Reading edition artifacts directly (output/pdfs/**, editions/**, the archive) is exactly what this gate exists to prevent — it escapes the reviewed source policy in scripts/notebooklmCanonSources.json. If the wrapper fails, return NO_RESULT for this lane; do not route around it."
