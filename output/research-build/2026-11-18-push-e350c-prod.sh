#!/bin/bash
# engine.350 PROD push: stage 56 = stage 55 (PROD @190) + one file at <commit> (engine.350 Task 7, the down side of the coded pools), the tree benched on
# SANDBOX 1004 (manifest stage56-e350c.sha256, written by the bench push and pull-back verified there; the fires
# of 2026-11-18-e350c-bench.sh PASS). The base must be stage 55 byte for byte; the built tree must equal the benched manifest byte for byte.
# The live content tab must already carry the occupation and paper-reader tags (a Work or Media row with no sign is not
# written by this code); the placed rows of scripts/downLinesEclPool.js are a tab write of their own and not needed by this code. Copied from 2026-11-18-push-e350b-prod.sh.
#   bash output/research-build/2026-11-18-push-e350c-prod.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage55-e350b.sha256; S54=$OUT/stage56-e350c.sha256
BASE=8252c6f57
FILES="phase05-citizens/generateCitizensEvents.js"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
# the live tab is signed: nothing left to tag, no conflicts
TAGS=$(node scripts/occupationDialTags.js 2>&1 | grep "^tab rows"); echo "$TAGS"
echo "$TAGS" | grep -q "to tag 0, already tagged" && echo "$TAGS" | grep -q "on the tab but not listed 0" && echo "$TAGS" | grep -q "conflicts 0" || { echo "the live content tab is not fully signed — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD is not stage 55 — stop"; exit 1; }
echo "PROD pull = stage 55"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
tree "$W/stage" | diff -q - "$S54" >/dev/null || { echo "built tree is not the benched stage 56 — stop"; exit 1; }
echo "built tree = benched stage 56 ($SRC), 1 file over stage 55"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 56 = stage 55 + engine.350: the down side of the coded pools ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S54" >/dev/null && echo "PULL-BACK: PROD = stage 56 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
