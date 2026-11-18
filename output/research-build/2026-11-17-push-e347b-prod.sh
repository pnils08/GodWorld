#!/bin/bash
# engine.347 Tasks 12+13 PROD push: stage 53 = stage 52 (PROD @187) + the Sad mood and the retirement echo (two files) at <commit>, the tree
# benched on SANDBOX 1004 (manifest stage53-e347b.sha256, written by the bench push and pull-back verified there).
# The base must be stage 52 byte for byte; the built tree must equal the benched manifest byte for byte. Copied from 2026-11-17-push-e347-prod.sh.
#   bash output/research-build/2026-11-17-push-e347b-prod.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S51=$OUT/stage52-e347.sha256; S52=$OUT/stage53-e347b.sha256
BASE=b426c40c8
FILES="utilities/citizenDialMap.js utilities/compressLifeHistory.js"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S51" >/dev/null || { echo "PROD is not stage 52 — stop"; exit 1; }
echo "PROD pull = stage 52"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
tree "$W/stage" | diff -q - "$S52" >/dev/null || { echo "built tree is not the benched stage 53 — stop"; exit 1; }
echo "built tree = benched stage 53 ($SRC), 2 files over stage 52"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 53 = stage 52 + engine.347: the Sad mood; a retirement spoken of again moves by its mood only ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S52" >/dev/null && echo "PULL-BACK: PROD = stage 53 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
