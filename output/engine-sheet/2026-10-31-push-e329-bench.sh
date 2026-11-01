#!/bin/bash
# engine.329 bench push: SANDBOX 1004 script project = stage 36 = stage 35 (PROD @171, manifest stage35-e316.sha256)
# + processAdvancementIntake.js at <commit>; or, with "stage35", the bench restored to stage 35 (= PROD). The bench may be
# pulled at stage 34 (the three e316 files at 57cef469 make it stage 35), stage 35, or a stage 36 (the one file back at
# 57cef469 = stage 35). The tree outside the one file must equal stage 35.
#   bash output/engine-sheet/2026-10-31-push-e329-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-31-push-e329-bench.sh stage35 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S34_MAN=$OUT/stage34-e317b.sha256
S35_MAN=$OUT/stage35-e316.sha256
S36_MAN=$OUT/stage36-e329.sha256
E316_FILES="phase05-citizens/runNeighborhoodEngine.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js"
FILE=phase05-citizens/processAdvancementIntake.js
S35=57cef469
SRC=${1:?commit or stage35}
if [ "$SRC" = "stage35" ]; then MAN=$S35_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S35_MAN" >/dev/null; then echo "bench pulled = stage 35"
elif tree | diff -q - "$S34_MAN" >/dev/null; then
  for f in $E316_FILES; do git show "$S35:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S35_MAN" >/dev/null || { echo "stage 34 with the three e316 files at $S35 is not stage 35 — stop"; exit 1; }
  echo "bench pulled = stage 34; three e316 files at $S35 = stage 35"
elif [ -f "$S36_MAN" ] && tree | diff -q - "$S36_MAN" >/dev/null; then
  git show "$S35:$FILE" > "$W/stage/$FILE"
  tree | diff -q - "$S35_MAN" >/dev/null || { echo "stage 36 with $FILE at $S35 is not stage 35 — stop"; exit 1; }
  echo "bench pulled = stage 36; $FILE back at $S35 = stage 35"
else echo "bench is neither stage 34, 35 nor 36 — stop"; exit 1; fi
if [ "$SRC" = "stage35" ]; then
  LABEL="bench 1004 restored = stage 35 (PROD @171)"
else
  git merge-base --is-ancestor 41160fe3 "$SRC" || { echo "$SRC does not carry engine.329 — stop"; exit 1; }
  git show "$SRC:$FILE" > "$W/stage/$FILE"
  tree > "$MAN"
  grep -v "$FILE\$" "$MAN" | diff -q - <(grep -v "$FILE\$" "$S35_MAN") >/dev/null \
    || { echo "built stage differs from stage 35 outside $FILE — stop"; exit 1; }
  echo "stage 36 = stage 35 + $FILE at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 36: stage 35 + engine.329 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
