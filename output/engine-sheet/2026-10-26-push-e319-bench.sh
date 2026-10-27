#!/bin/bash
# engine.319 bench push: SANDBOX 1004 script project = stage 29 = stage 28 (PROD @164, manifest stage28-e318.sha256) +
# phase05-citizens/processAdvancementIntake.js at <commit>; or, with "stage28", the bench restored to stage 28 itself.
# Stage 28 is BUILT, not assumed: pull the bench, lay engine.312's four files + parseMediaRoomMarkdown.js at 3e04d8a5 and
# engine.301's two at 1e6beff5 (= stage 27, checked), then engine.318's two at 5ed4ceba (= stage 28, checked). For stage 29
# the file at 5ed4ceba must equal its stage-28 copy, every commit 5ed4ceba..<commit> on it must be an engine.319 commit, and
# the tree outside it must equal stage 28.
#   bash output/engine-sheet/2026-10-26-push-e319-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-26-push-e319-bench.sh stage28 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S27_MAN=$OUT/stage27-e312.sha256
S28_MAN=$OUT/stage28-e318.sha256
F301="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
F312="phase07-evening-media/culturalLedger.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js phase01-config/godWorldEngine2.js phase07-evening-media/parseMediaRoomMarkdown.js"
F318="phase07-evening-media/mediaRoomIntake.js phase07-evening-media/parseMediaRoomMarkdown.js"
FILE="phase05-citizens/processAdvancementIntake.js"
SRC=${1:?commit or stage28}
if [ "$SRC" = "stage28" ]; then MAN=$S28_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
for f in $F312; do git show "3e04d8a5:$f" > "$W/stage/$f"; done
for f in $F301; do git show "1e6beff5:$f" > "$W/stage/$f"; done
tree | diff -q - "$S27_MAN" >/dev/null || { echo "bench + engine.301 + engine.312 is not stage 27 — stop"; exit 1; }
for f in $F318; do git show "5ed4ceba:$f" > "$W/stage/$f"; done
tree | diff -q - "$S28_MAN" >/dev/null || { echo "stage 27 + engine.318 is not stage 28 — stop"; exit 1; }
if [ "$SRC" = "stage28" ]; then
  echo "stage 28 rebuilt from the bench"; LABEL="bench 1004 restored = stage 28 (PROD @164)"
else
  OTHER=$(git log --format=%h "5ed4ceba..$SRC" -- $FILE | while read h; do git log -1 --format=%s "$h" | grep -q '^engine.319' || echo "$h"; done)
  [ -z "$OTHER" ] || { echo "non-engine.319 commit(s) touch $FILE between 5ed4ceba and $SRC: $OTHER — stop"; exit 1; }
  want=$(grep " \./$FILE\$" "$S28_MAN" | cut -d' ' -f1)
  have=$(git show "5ed4ceba:$FILE" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$FILE at 5ed4ceba differs from its stage-28 copy — another change would ride; stop"; exit 1; }
  git show "$SRC:$FILE" > "$W/stage/$FILE"
  tree > "$MAN"
  grep -v -e "./$FILE\$" "$MAN" | diff -q - <(grep -v -e "./$FILE\$" "$S28_MAN") >/dev/null \
    || { echo "built stage differs from stage 28 outside $FILE — stop"; exit 1; }
  echo "stage 29 = stage 28 + $FILE at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 29: stage 28 + engine.319 $FILE at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
