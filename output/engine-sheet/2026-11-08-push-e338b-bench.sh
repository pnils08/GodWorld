#!/bin/bash
# engine.338 Tasks 2b–2d bench push: SANDBOX 1004 script project = stage 43 = stage 42 (PROD @178, manifest stage42-e338a.sha256)
# + the six engine.338b files at <commit>. The bench must pull as stage 42, or as a stage 43 over it (a re-push: the six files
# back at stage 42 must give stage 42). The tree outside the six files must equal stage 42.
# Copied from 2026-11-07-push-e338a-bench.sh.
#   bash output/engine-sheet/2026-11-08-push-e338b-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S42_MAN=$OUT/stage42-e338a.sha256
S42_COMMIT=323311fc4
FILES="utilities/setupSportsFeedValidation.js utilities/citizenDialMap.js phase02-world-state/applySportsSeason.js phase05-citizens/applyGameNightMoments.js phase05-citizens/processAdvancementIntake.js phase05-citizens/educationCareerEngine.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}; STAGE=${STAGE:-43}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S42_MAN" >/dev/null; then echo "bench pulled = stage 42"
else
  for f in $FILES; do git show "$S42_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S42_MAN" >/dev/null || { echo "bench is neither stage 42 nor a stage 43 over stage 42 — stop"; exit 1; }
  echo "bench pulled = a stage 43; the six files back at stage 42 = stage 42"
fi
git merge-base --is-ancestor bd2c0e574 "$SRC" || { echo "$SRC does not carry the engine.338 Task 2b build commit — stop"; exit 1; }
git merge-base --is-ancestor 39eccc129 "$SRC" || { echo "$SRC does not carry the engine.338 Task 2c/2d build commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S42_MAN") >/dev/null \
  || { echo "built stage differs from stage 42 outside the six files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S42_MAN")" ] || { echo "file count differs from stage 42 — stop"; exit 1; }
echo "stage $STAGE = stage 42 + engine.338b (6 files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage $STAGE: stage 42 + engine.338b at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
