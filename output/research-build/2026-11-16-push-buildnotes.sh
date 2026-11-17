#!/bin/bash
# Build-note fix (9c3996a58, engine-sheet 2026-11-15) as stage 50 = stage 49 + bondEngine.js at 9c3996a58 + processAdvancementIntake.js
# = live's copy (86174e9db) with ONLY the 9c3996a58 hunks applied (HEAD's copy also carries engine.339, parked, not shipped).
# Builder 2026-11-16: "yes on both". Target bench|prod; the base must be stage 49 byte for byte, the result stage 50.
#   bash output/research-build/2026-11-16-push-buildnotes.sh bench|prod [--dry-run]
set -euo pipefail
cd /root/GodWorld
T=${1:?bench|prod}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
R=/root/GodWorld/output/research-build
S49=$R/stage49-e289.sha256; S50=$R/stage50-buildnotes.sha256
if [ "$T" = bench ]; then ID=$BENCH_ID; DEP=$BENCH_DEP; else ID=$PROD_ID; DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S49" >/dev/null || { echo "$T is not stage 49 — stop"; exit 1; }
echo "$T pull = stage 49"
cp $R/stage50/processAdvancementIntake.js "$W/stage/phase05-citizens/processAdvancementIntake.js"
git show 9c3996a58:phase05-citizens/bondEngine.js > "$W/stage/phase05-citizens/bondEngine.js"
tree "$W/stage" > "$W/m"
if [ -f "$S50" ]; then diff -q "$W/m" "$S50" >/dev/null || { echo "built tree is not the benched stage 50 — stop"; exit 1; }; else cp "$W/m" "$S50"; fi
grep -vE "processAdvancementIntake.js$|bondEngine.js$" "$S50" | diff -q - <(grep -vE "processAdvancementIntake.js$|bondEngine.js$" "$S49") >/dev/null || { echo "differs from stage 49 outside the two files — stop"; exit 1; }
echo "stage 50 = stage 49 + build-note fix (2 files)"
[ "$DRY" = "--dry-run" ] && { echo "dry run"; exit 0; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 50 = stage 49 + build-note writers fixed (9c3996a58 hunks only)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$S50" >/dev/null && echo "PULL-BACK: $T = stage 50 byte for byte" || { echo "PULL-BACK MISMATCH"; exit 1; }
