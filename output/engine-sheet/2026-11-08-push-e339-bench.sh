#!/bin/bash
# engine.339 bench push: SANDBOX 1004 script project = stage 46 = stage 45 (PROD @180, manifest stage45-e334.sha256)
# + processAdvancementIntake.js and utilities/citizenDerivation.js at <commit>. The bench must pull as stage 45, or as a stage 46 over it (a re-push:
# the two files back at stage 45 must give stage 45). The tree outside the two files must equal stage 45.
# Copied from 2026-11-08-push-e338b-bench.sh.
#   bash output/engine-sheet/2026-11-08-push-e334-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S45_MAN=$OUT/stage45-e334.sha256
S45_COMMIT=e15eb443f
FILES="phase05-citizens/processAdvancementIntake.js utilities/citizenDerivation.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}; STAGE=${STAGE:-46}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S45_MAN" >/dev/null; then echo "bench pulled = stage 45"
else
  for f in $FILES; do git show "$S45_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S45_MAN" >/dev/null || { echo "bench is neither stage 45 nor a stage 46 over stage 45 — stop"; exit 1; }
  echo "bench pulled = a stage 46; the two files back at stage 45 = stage 45"
fi
git merge-base --is-ancestor e15eb443f "$SRC" || { echo "$SRC does not carry the stage 45 commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
grep -q "engine.339" "$W/stage/phase05-citizens/processAdvancementIntake.js" || { echo "staged intake file lacks the engine.339 marker — stop"; exit 1; }
! grep -q "deriveMaritalStatus_" "$W/stage/utilities/citizenDerivation.js" || { echo "staged derivation file still has the dice — stop"; exit 1; }
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S45_MAN") >/dev/null \
  || { echo "built stage differs from stage 45 outside the two files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S45_MAN")" ] || { echo "file count differs from stage 45 — stop"; exit 1; }
echo "stage $STAGE = stage 45 + engine.339 (2 files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage $STAGE: stage 45 + engine.339 at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
