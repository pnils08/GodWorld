#!/bin/bash
# engine.316 + pipeline.99 bench push: SANDBOX 1004 script project = stage 35 = stage 34 (PROD @170, manifest stage34-e317b.sha256)
# + the three files at <commit>; or, with "stage34", the bench restored to stage 34 (= PROD). The bench must be stage 34 or a
# stage 35 (the three files back at 6b0732f4^ = stage 34). The tree outside the three files must equal stage 34.
#   bash output/engine-sheet/2026-10-31-push-e316-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-31-push-e316-bench.sh stage34 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S34_MAN=$OUT/stage34-e317b.sha256
S35_MAN=$OUT/stage35-e316.sha256
FILES="phase05-citizens/runNeighborhoodEngine.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js"
BASE=6b0732f4^
SRC=${1:?commit or stage34}
if [ "$SRC" = "stage34" ]; then MAN=$S34_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S34_MAN" >/dev/null; then echo "bench pulled = stage 34"
elif [ -f "$S35_MAN" ] && tree | diff -q - "$S35_MAN" >/dev/null; then
  for f in $FILES; do git show "$BASE:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S34_MAN" >/dev/null || { echo "stage 35 with the three files at $BASE is not stage 34 — stop"; exit 1; }
  echo "bench pulled = stage 35; three files back at $BASE = stage 34"
else echo "bench is neither stage 34 nor 35 — stop"; exit 1; fi
if [ "$SRC" = "stage34" ]; then
  LABEL="bench 1004 restored = stage 34 (PROD @170)"
else
  git merge-base --is-ancestor 94e024b6 "$SRC" || { echo "$SRC does not carry the hard-light fix — stop"; exit 1; }
  for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
  tree > "$MAN"
  P=$(echo $FILES | sed 's/ /|/g')
  grep -vE "($P)$" "$MAN" | diff -q - <(grep -vE "($P)$" "$S34_MAN") >/dev/null \
    || { echo "built stage differs from stage 34 outside the three files — stop"; exit 1; }
  echo "stage 35 = stage 34 + the three files at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 35: stage 34 + engine.316 + pipeline.99 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
