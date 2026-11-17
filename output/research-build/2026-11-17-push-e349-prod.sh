#!/bin/bash
# engine.349 PROD push: stage 51 = stage 50 (PROD @185) + Tasks 6 and 2 at 5da47216d, the tree benched on SANDBOX 1004
# (manifest stage51-e349.sha256, written by the bench push and pull-back verified there). Builder 2026-11-16: "1 yes".
# The base must be stage 50 byte for byte; the built tree must equal the benched manifest byte for byte.
#   bash output/research-build/2026-11-17-push-e349-prod.sh [--dry-run]
set -euo pipefail
cd /root/GodWorld
DRY=${1:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/research-build
S50=$OUT/stage50-buildnotes.sha256; S51=$OUT/stage51-e349.sha256
SRC=5da47216d; BASE=71975a90f
FILES="phase01-config/engine94SheetContract.js phase01-config/godWorldEngine2.js phase01-config/initSimulationLedger.js utilities/citizenMemory.js utilities/compressLifeHistory.js utilities/citizenDialMap.js phase05-citizens/generateCitizensEvents.js phase05-citizens/generationalWealthEngine.js"
PAI=phase05-citizens/processAdvancementIntake.js
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S50" >/dev/null || { echo "PROD is not stage 50 — stop"; exit 1; }
echo "PROD pull = stage 50"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
cp "$OUT/stage51/processAdvancementIntake.js" "$W/stage/$PAI"
tree "$W/stage" | diff -q - "$S51" >/dev/null || { echo "built tree is not the benched stage 51 — stop"; exit 1; }
echo "built tree = benched stage 51 ($SRC), 9 files over stage 50"
[ "$DRY" = "--dry-run" ] && { echo "dry run: stopping before the push"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 51 = stage 50 + engine.349: dial speed keys, Dial_Moves / Dial_Pulse, wrong reads fixed ($SRC)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S51" >/dev/null && echo "PULL-BACK: PROD = stage 51 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
