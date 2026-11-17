#!/bin/bash
# PROD push (stage 49): PROD stage 48 (@183) + the three engine.289 files at <commit> — exactly the tree benched on SANDBOX
# 1004 @201 (manifest stage49-e289.sha256; two fires C117/C118 PASS, readback 2026-11-16-e289-reads.jsonl). Builder's standing
# go for a PROD push with its smoke-test note. Live must be stage 48 before; must be stage 49 after, byte for byte.
#   bash output/research-build/2026-11-16-push-e289-prod.sh <commit>
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
S48=/root/GodWorld/output/engine-sheet/stage48-clearfire.sha256
S49=/root/GodWorld/output/research-build/stage49-e289.sha256
FILES="phase07-evening-media/applyStorySeeds.js phase08-v3-chicago/v3NeighborhoodWriter.js phase02-world-state/applyCityDynamics.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S48" >/dev/null || { echo "LIVE IS NOT STAGE 48 — stop, nothing pushed"; exit 1; }
echo "live pull = stage 48"
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree "$W/stage" | diff -q - "$S49" >/dev/null || { echo "built tree is not the benched stage 49 — stop, nothing pushed"; exit 1; }
echo "built = benched stage 49"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 49 = stage 48 + engine.289 at $SRC (evening culture and nightlife land on their hood)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S49" >/dev/null && echo "PULL-BACK: live = stage 49, byte for byte ($(date +%H:%M:%S))" \
  || { echo "PULL-BACK MISMATCH — read the live script before anything else"; exit 1; }
