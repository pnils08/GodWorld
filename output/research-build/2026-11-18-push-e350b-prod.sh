#!/bin/bash
# engine.350 PROD push: stage 55 = stage 54 (PROD @189) + three files at <commit> (a coming-of-age line is not a graduation; the employer content condition), the tree benched on
# SANDBOX 1004 @210 (manifest stage55-e350b.sha256, written by the bench push and pull-back verified there; three fires
# C117-C119 PASS). The base must be stage 54 byte for byte; the built tree must equal the benched manifest byte for byte.
# The live content tab must already carry the occupation and paper-reader tags (a Work or Media row with no sign is not
# written by this code). Copied from 2026-11-17-push-e347b-prod.sh.
#   bash output/research-build/2026-11-18-push-e350b-prod.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage54-e350.sha256; S54=$OUT/stage55-e350b.sha256
BASE=0c85bcd03
FILES="phase02-world-state/loadEventContentLedger.js phase04-events/generationalEventsEngine.js phase05-citizens/generateCitizensEvents.js"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
# the live tab is signed: nothing left to tag, no conflicts
TAGS=$(node scripts/occupationDialTags.js 2>&1 | grep "^tab rows"); echo "$TAGS"
echo "$TAGS" | grep -q "to tag 0, already tagged 98, plain 7, on the tab but not listed 0, listed but not on the tab 0, conflicts 0" || { echo "the live content tab is not fully signed — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD is not stage 54 — stop"; exit 1; }
echo "PROD pull = stage 54"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
tree "$W/stage" | diff -q - "$S54" >/dev/null || { echo "built tree is not the benched stage 55 — stop"; exit 1; }
echo "built tree = benched stage 55 ($SRC), 3 files over stage 54"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 55 = stage 54 + engine.350: a coming-of-age line is not a graduation; content rows can be aimed at an employer ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S54" >/dev/null && echo "PULL-BACK: PROD = stage 55 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
