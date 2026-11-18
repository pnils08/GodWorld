#!/bin/bash
# engine.350 PROD push: stage 54 = stage 53 (PROD @188) + the eleven engine.350 files at <commit>, the tree benched on
# SANDBOX 1004 @209 (manifest stage54-e350.sha256, written by the bench push and pull-back verified there; ten fires
# C117-C126 PASS). The base must be stage 53 byte for byte; the built tree must equal the benched manifest byte for byte.
# The live content tab must already carry the occupation and paper-reader tags (a Work or Media row with no sign is not
# written by this code). Copied from 2026-11-17-push-e347b-prod.sh.
#   bash output/research-build/2026-11-18-push-e350-prod.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage53-e347b.sha256; S54=$OUT/stage54-e350.sha256
BASE=623bc326a
FILES="phase01-config/engine94SheetContract.js phase04-events/generateGameModeMicroEvents.js phase05-citizens/casinoLedgerEngine.js phase05-citizens/educationCareerEngine.js phase05-citizens/generateCitizensEvents.js phase05-citizens/generateMediaModeEvents.js phase05-citizens/generationalWealthEngine.js phase05-citizens/runCareerEngine.js phase05-citizens/runEducationEngine.js phase05-citizens/runYouthEngine.js utilities/citizenDialMap.js"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
# the live tab is signed: nothing left to tag, no conflicts
TAGS=$(node scripts/occupationDialTags.js 2>&1 | grep "^tab rows"); echo "$TAGS"
echo "$TAGS" | grep -q "to tag 0, already tagged 98, plain 7, on the tab but not listed 0, listed but not on the tab 0, conflicts 0" || { echo "the live content tab is not fully signed — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD is not stage 53 — stop"; exit 1; }
echo "PROD pull = stage 53"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
tree "$W/stage" | diff -q - "$S54" >/dev/null || { echo "built tree is not the benched stage 54 — stop"; exit 1; }
echo "built tree = benched stage 54 ($SRC), 11 files over stage 53"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 54 = stage 53 + engine.350: lines move a dial by what they say (Career, Education, youth, Work, Media, Money), bets by size ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S54" >/dev/null && echo "PULL-BACK: PROD = stage 54 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
