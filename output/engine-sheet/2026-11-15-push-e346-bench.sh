#!/bin/bash
# engine.346 bench push: SANDBOX 1004 script project = stage 46 (news) = stage 45 (PROD @180, manifest stage45-e334.sha256)
# + the three engine.346 files at <commit>. The bench may pull as stage 45, as the parked engine.339 stage (stage 45 + its two
# files), or as an earlier engine.346 push: every one of those five files put back at stage 45 must give stage 45.
# The engine.339 bench code is REPLACED by this push (its row is parked on the builder's calls; re-push it from its own script).
# Copied from 2026-11-08-push-e339-bench.sh.
#   bash output/engine-sheet/2026-11-15-push-e346-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S45_MAN=$OUT/stage45-e334.sha256
S45_COMMIT=e15eb443f
FILES="phase05-citizens/applyGameNightMoments.js phase07-evening-media/storyHook.js utilities/setupSportsFeedValidation.js"
E339_FILES="phase05-citizens/processAdvancementIntake.js utilities/citizenDerivation.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}; STAGE=${STAGE:-46}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S45_MAN" >/dev/null; then echo "bench pulled = stage 45"
else
  for f in $FILES $E339_FILES; do git show "$S45_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S45_MAN" >/dev/null || { echo "bench is not stage 45 under the engine.339 / engine.346 files — stop"; exit 1; }
  echo "bench pulled = a stage over stage 45; the five files back at stage 45 = stage 45"
fi
git merge-base --is-ancestor e15eb443f "$SRC" || { echo "$SRC does not carry the stage 45 commit — stop"; exit 1; }
# the three files must differ from stage 45 ONLY by engine.346: nothing else may have landed in them since
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
grep -q "'news': 'hook'" "$W/stage/phase05-citizens/applyGameNightMoments.js" || { echo "staged moments file lacks the news route — stop"; exit 1; }
grep -q "'news': " "$W/stage/phase07-evening-media/storyHook.js" || { echo "staged hook file lacks the news hook — stop"; exit 1; }
grep -q "^  'news',$" "$W/stage/utilities/setupSportsFeedValidation.js" || { echo "staged vocabulary lacks news — stop"; exit 1; }
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S45_MAN") >/dev/null \
  || { echo "built stage differs from stage 45 outside the three files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S45_MAN")" ] || { echo "file count differs from stage 45 — stop"; exit 1; }
echo "stage $STAGE = stage 45 + engine.346 (3 files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage $STAGE: stage 45 + engine.346 news at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
