#!/bin/bash
# ============================================================================
# Skill Auto-Suggestion Hook (Phase 6.6)
# ============================================================================
# UserPromptSubmit hook — reads the user prompt, matches against known
# skills/workflows, and suggests relevant ones before work begins.
# ============================================================================

PROMPT="$CLAUDE_USER_PROMPT"

# Exit silently if no prompt
[ -z "$PROMPT" ] && exit 0

# Lowercase for matching
LP=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

SUGGESTIONS=""

# Edition pipeline
if echo "$LP" | grep -qE "edition|write edition|cycle pulse|desk agent|compile|publish"; then
  SUGGESTIONS="$SUGGESTIONS\n  /write-edition — Full edition production pipeline (6 desks)"
fi

# Supplemental
if echo "$LP" | grep -qE "supplemental|special edition|deep dive|breaking|wire break"; then
  SUGGESTIONS="$SUGGESTIONS\n  /write-supplemental — Supplemental edition (custom reporter team)"
fi

# Cycle run
if echo "$LP" | grep -qE "run cycle|engine cycle|cycle [0-9]|run the engine|advance"; then
  SUGGESTIONS="$SUGGESTIONS\n  /run-cycle — Run GodWorld engine cycle with pre-flight checks"
fi

# Pre-mortem
if echo "$LP" | grep -qE "pre-mortem|health check|engine health|pre.?flight|before.?cycle"; then
  SUGGESTIONS="$SUGGESTIONS\n  /pre-mortem — Scan engine phases for silent failure risks"
fi

# Tech debt
if echo "$LP" | grep -qE "tech debt|code health|audit code|dead code|determinism"; then
  SUGGESTIONS="$SUGGESTIONS\n  /tech-debt-audit — Automated code health scan"
fi

# Podcast
if echo "$LP" | grep -qE "podcast|audio|tomas|sonia|episode"; then
  SUGGESTIONS="$SUGGESTIONS\n  /podcast — Generate podcast episode from published edition"
fi

# Session end
if echo "$LP" | grep -qE "session end|wrap up|close out|sign off|goodnight|good night"; then
  SUGGESTIONS="$SUGGESTIONS\n  /session-end — Close session (journal, persistence, project state)"
fi

# Boot / recovery
if echo "$LP" | grep -qE "boot|reload identity|who am i|compaction|lost context"; then
  SUGGESTIONS="$SUGGESTIONS\n  /boot — Reload Mags identity + journal after compaction"
fi

# Individual desks
if echo "$LP" | grep -qE "civic|carmen|city hall|council|initiative"; then
  SUGGESTIONS="$SUGGESTIONS\n  /civic-desk — Write civic affairs section"
fi
if echo "$LP" | grep -qE "sport|p.?slayer|hal richmond|anthony|baseball|a'?s "; then
  SUGGESTIONS="$SUGGESTIONS\n  /sports-desk — Write Oakland sports section"
fi
if echo "$LP" | grep -qE "culture|maria keen|mason|elliot|music|art|faith"; then
  SUGGESTIONS="$SUGGESTIONS\n  /culture-desk — Write culture/seasonal section"
fi
if echo "$LP" | grep -qE "business|jordan velez|ticker|market|economic"; then
  SUGGESTIONS="$SUGGESTIONS\n  /business-desk — Write business ticker section"
fi
if echo "$LP" | grep -qE "chicago|selena grant|talia finch|bureau"; then
  SUGGESTIONS="$SUGGESTIONS\n  /chicago-desk — Write Chicago bureau section"
fi
if echo "$LP" | grep -qE "letter|citizen voice|reader|mailbag"; then
  SUGGESTIONS="$SUGGESTIONS\n  /letters-desk — Write letters to the editor"
fi

# Stub engine
if echo "$LP" | grep -qE "stub engine|function map|exported functions|phase map"; then
  SUGGESTIONS="$SUGGESTIONS\n  /stub-engine — Condensed map of all engine exports"
fi

# Batch
if echo "$LP" | grep -qE "batch|send to batch|batch this|non.?urgent"; then
  SUGGESTIONS="$SUGGESTIONS\n  /batch — Send task to Batch API (50% off, ~1hr wait)"
fi

# Output suggestions if any matched
if [ -n "$SUGGESTIONS" ]; then
  echo "Suggested skills for this task:"
  echo -e "$SUGGESTIONS"
fi

exit 0
