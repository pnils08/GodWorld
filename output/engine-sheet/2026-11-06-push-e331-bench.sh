#!/bin/bash
# engine.331 bench push: SANDBOX 1004 script project = stage 38 = stage 37 (PROD @173, manifest stage37-c47b2.sha256)
# + the seven engine.331 Apps Script files at <commit>. The bench may be pulled at stage 36 (civicInitiativeEngine.js at
# 2fc359eb4 makes it stage 37) or stage 37. The tree outside the seven files must equal stage 37.
#   bash output/engine-sheet/2026-11-06-push-e331-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S36_MAN=$OUT/stage36-e329.sha256
S37_MAN=$OUT/stage37-c47b2.sha256
C47_FILE=phase05-citizens/civicInitiativeEngine.js
C47_COMMIT=2fc359eb4
FILES="utilities/setupSportsFeedValidation.js utilities/sportsWeekRecord.js phase02-world-state/applySportsSeason.js phase05-citizens/applyGameNightMoments.js phase05-citizens/generateCitizensEvents.js phase05-citizens/runHouseholdEngine.js phase07-evening-media/storyHook.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S37_MAN" >/dev/null; then echo "bench pulled = stage 37"
elif tree | diff -q - "$S36_MAN" >/dev/null; then
  git show "$C47_COMMIT:$C47_FILE" > "$W/stage/$C47_FILE"
  tree | diff -q - "$S37_MAN" >/dev/null || { echo "stage 36 with $C47_FILE at $C47_COMMIT is not stage 37 — stop"; exit 1; }
  echo "bench pulled = stage 36; $C47_FILE at $C47_COMMIT = stage 37"
else
  # a re-push over an earlier stage 38 candidate: the seven files back at stage 37 must give stage 37
  for f in $FILES; do git show "592707c09^:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S37_MAN" >/dev/null || { echo "bench is neither stage 36, 37 nor a stage 38 over stage 37 — stop"; exit 1; }
  echo "bench pulled = a stage 38; the seven files back at stage 37 = stage 37"
fi
git merge-base --is-ancestor 592707c09 "$SRC" || { echo "$SRC does not carry the engine.331 build commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S37_MAN") >/dev/null \
  || { echo "built stage differs from stage 37 outside the seven files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S37_MAN")" ] || { echo "file count differs from stage 37 — stop"; exit 1; }
echo "stage 38 = stage 37 + engine.331 (7 files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage 38: stage 37 + engine.331 at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
