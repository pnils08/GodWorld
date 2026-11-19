#!/bin/bash
# engine.349 Task 14 PROD push: stage 58 = stage 57 + thirteen files at <commit> (the middle counts: every reader of a
# dial band reads the number), the tree benched on SANDBOX 1004 (manifest stage58-e349m.sha256, written by the bench
# push and pull-back verified there; the fires of leg n, output/research-build/2026-11-19-e349n-bench.log, PASS).
# The base must be stage 57 byte for byte; the built tree must equal the benched manifest byte for byte. No sheet
# write goes with this code. Another lane's committed and unshipped engine file is not in the tree (it is PROD's copy).
# Copied from 2026-11-18-push-e350d-prod.sh.
#   bash output/research-build/2026-11-19-push-e349m-prod.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage57-e350d.sha256; S54=$OUT/stage58-e349m.sha256
BASE=5c0c090bd
FILES="phase02-world-state/loadEventContentLedger.js phase04-events/generationalEventsEngine.js phase05-citizens/applyBusinessDynamics.js phase05-citizens/bondEngine.js phase05-citizens/casinoLedgerEngine.js phase05-citizens/generateCitizensEvents.js phase05-citizens/generationalWealthEngine.js phase05-citizens/migrationTrackingEngine.js phase05-citizens/runCareerEngine.js phase05-citizens/runConductEngine.js phase05-citizens/updateCivicApprovalRatings.js utilities/citizenMemory.js utilities/compressLifeHistory.js"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD is not stage 57 — stop"; exit 1; }
echo "PROD pull = stage 57"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
tree "$W/stage" | diff -q - "$S54" >/dev/null || { echo "built tree is not the benched stage 58 — stop"; exit 1; }
echo "built tree = benched stage 58 ($SRC), 13 files over stage 57"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 58 = stage 57 + engine.349 Task 14: the middle counts, every reader of a dial band reads the number ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S54" >/dev/null && echo "PULL-BACK: PROD = stage 58 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
