#!/bin/bash
# engine.302 bench push: SANDBOX 1004 script project = stage 5 (@57, = PROD @148) + the 8 Apps Script files of
# engine.302 cuts 1 + 2 at HEAD (each must equal its pre-302 parent in the stage first, so nothing else rides).
#   bash output/engine-sheet/push-e302-bench.sh <commit> <manifest-out> [--dry-run]   (stage 6 = 5f057a26 → stage6-e302.sha256)
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
PRE=0125b59a^
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
FILES="utilities/citizenDerivation.js phase05-citizens/processAdvancementIntake.js phase04-events/generationalEventsEngine.js phase05-citizens/checkForPromotions.js phase05-citizens/citizenContextBuilder.js phase05-citizens/runHouseholdEngine.js phase05-citizens/householdFormationEngine.js phase05-citizens/bondEngine.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | grep -v $EXCL | diff -q - <(grep -v $EXCL "$OUT/stage5-e214.sha256") >/dev/null \
  || { echo "bench project differs from stage 5 outside the 8 engine.302 files — stop"; exit 1; }
echo "bench project = stage 5 outside the 8 engine.302 files"
for f in $FILES; do
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
echo "stage = stage 5 + 8 engine.302 files at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "engine.302 = stage 5 + 8 files at $SRC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
