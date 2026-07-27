#!/bin/bash
# ============================================================================
# Topic Inventory Hook (S335)
# ============================================================================
# UserPromptSubmit hook. Greps the repo for the distinctive terms in Mike's
# prompt and injects the matching FILE PATHS — paths only, never content.
#
# WHY THIS EXISTS (S335 measurement):
#   The corpus is 489 active MDs. A full working session opened 17 of them
#   (3.5%). That session concluded five things did not exist which did — the
#   five-layer employment resolver, the roster tabs, the media->canon business
#   mint, the 198-role career taxonomy, the named data-analyst seat — and
#   planned rebuilds around the imagined gaps. `Employment_Roster` is
#   documented in one line of SHEETS_MANIFEST.md, present in six documents,
#   and was found by accident in hour three.
#
# WHY PATHS AND NOT CONTENT:
#   Injecting content would trade one failure for another — a stale doc
#   believed over live data. A path list is generated fresh every prompt, so it
#   CANNOT go stale, and it says nothing about what is inside. The instance
#   still has to open and verify. It only removes the "didn't know the door
#   existed" class. (research: docs/research/2026-07-27-boot-rebirth-model-fit-routing.md)
#
# RANK, DO NOT FILTER (corrected S335 after the first build failed):
#   The first version dropped any term matching more than 12 files as "too
#   generic". Measured against the real corpus that was backwards — employment
#   hits 51 files, roster 232, ledger 423 — so the filter discarded exactly the
#   domain terms it existed to serve, and the hook returned nothing on the very
#   prompt that motivated it. Corrected: rank by CONCENTRATION. A file naming a
#   term 40 times is about that term; one naming it once is not. No hardcoded
#   vocabulary either way — nothing to maintain, nothing to rot.
# ============================================================================

PROMPT="$CLAUDE_USER_PROMPT"
[ -z "$PROMPT" ] && exit 0
[ "${#PROMPT}" -lt 12 ] && exit 0          # "yes" / "go" / "proceed" — nothing to look up

ROOT="${CLAUDE_PROJECT_ROOT:-/root/GodWorld}"
cd "$ROOT" 2>/dev/null || exit 0

MAX_TERMS=5        # full-corpus scans we are willing to spend
MAX_PATHS=3        # paths shown per term — the most concentrated ones
MAX_LINES=5        # terms reported

# Words worth grepping: >=4 chars, letters/digits/underscore. Longest first —
# longer tokens are usually more specific, so they earn the limited grep budget.
# 4 not 5, because the sharpest terms in this project are short proper nouns:
# rhea, sift, oaks, mint, dial, ctx. S335 test missed "rhea gate" entirely at 5.
TERMS=$(printf '%s' "$PROMPT" \
  | tr '[:upper:]' '[:lower:]' \
  | grep -oE '[a-z][a-z0-9_]{3,}' \
  | grep -vwE 'about|after|again|agent|already|another|anything|because|been|before|being|between|build|could|different|doing|done|during|each|else|every|first|from|going|great|have|having|here|holds|into|just|know|last|like|little|looks|made|make|makes|many|maybe|might|more|most|much|must|need|needs|never|next|nothing|only|other|over|part|place|please|point|probably|really|right|same|should|since|some|something|start|still|such|sure|take|than|that|their|them|then|there|these|they|thing|things|think|this|those|through|time|under|until|very|want|were|what|when|where|which|while|will|with|without|work|working|would|your|does|done|does|were|been|both|came|come|down|even|ever|find|from|gave|gets|give|goes|good|kind|left|less|lets|look|lots|main|mean|move|much|name|need|once|ones|open|plan|puts|real|rest|runs|said|says|seen|sets|show|side|sort|stay|step|sure|tell|than|them|thus|told|turn|used|uses|view|ways|well|went|were|what|when|will|wont|your|yeah|okay|also|able|away|back|best|call|case|days|deal|each|else|fact|fine|full|half|hand|help|here|high|hold|home|hour|idea|into|item|just|keep|last|late|like|line|list|live|long|made|make|many|more|most|move|must|near|next|nice|only|onto|over|part|past|pick|play|plus|read|same|save|seem|sent|ship|size|slow|some|soon|stop|such|sure|take|talk|team|tend|test|text|that|then|they|this|time|tiny|took|took|true|type|upon|very|wait|walk|want|ways|week|were|when|wide|with|word|work|year' \
  | sort -u | awk '{print length"\t"$0}' | sort -rn | cut -f2 | head -$MAX_TERMS)

[ -z "$TERMS" ] && exit 0

OUT=""
COUNT=0
for T in $TERMS; do
  [ "$COUNT" -ge "$MAX_LINES" ] && break
  # Rank by how CONCENTRATED the term is per file, not by whether it is rare.
  # Files whose PATH names the term rank first — a file called
  # bayTribuneRoster.js is about rosters in a way JOURNAL.md is not, however
  # often the journal says the word.
  BYNAME=$(find docs .claude/skills .claude/agents scripts lib \
          \( -name '*.md' -o -name '*.js' -o -name '*.json' \) 2>/dev/null \
          | grep -v '/archive/' | grep -iF "$T")
  # Then by concentration. Logs and generated maps are excluded: they repeat
  # domain words constantly without being about them.
  BYCOUNT=$(grep -rc -i --binary-files=without-match \
          --include='*.md' --include='*.js' --include='*.json' \
          -e "$T" docs .claude/skills .claude/agents scripts lib 2>/dev/null \
          | grep -v '/archive/' | grep -v ':0$' \
          | grep -viE 'JOURNAL|SESSION_HISTORY|DAILY_REFLECT|_REVERSE|COL_MAP|ARTICLE_INDEX' \
          | awk -F: '{print $NF"\t"$0}' | sort -rn \
          | cut -f2 | sed 's/:[0-9]*$//')
  RANKED=$(printf '%s\n%s\n' "$BYNAME" "$BYCOUNT" | awk 'NF && !seen[$0]++')
  [ -z "$RANKED" ] && continue
  N=$(printf '%s\n' "$RANKED" | wc -l | tr -d ' ')
  PATHS=$(printf '%s\n' "$RANKED" | head -$MAX_PATHS | tr '\n' ' ')
  MORE=""
  [ "$N" -gt "$MAX_PATHS" ] && MORE="(+$((N - MAX_PATHS)) more)"
  OUT="${OUT}  ${T}: ${PATHS}${MORE}\n"
  COUNT=$((COUNT + 1))
done

[ -z "$OUT" ] && exit 0

echo "ON FILE for this prompt (paths only, grepped live — contents unread):"
printf '%b' "$OUT"
echo "Open what is relevant before concluding something does not exist. S335: five \"gaps\" turned out to be built already."
exit 0
