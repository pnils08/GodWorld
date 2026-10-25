#!/bin/bash
# engine.318 bench push: SANDBOX 1004 script project = stage 28 = stage 27 (PROD @163, manifest stage27-e312.sha256) + the two
# engine.318 files at <commit>; or, with "stage27", the bench restored to stage 27 itself.
# Stage 27 is BUILT, not assumed: pull the bench, lay engine.312's four files and parseMediaRoomMarkdown.js at 3e04d8a5 and engine.301's two at 1e6beff5,
# require the tree to equal the stage-27 manifest. For stage 28 each of the two files at 3e04d8a5 must equal its stage-27 copy,
# every commit 3e04d8a5..<commit> on them must be an engine.318 commit, and the tree outside them must equal stage 27.
#   bash output/engine-sheet/2026-10-25-push-e318-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-25-push-e318-bench.sh stage27 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S27_MAN=$OUT/stage27-e312.sha256
F301="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
F312="phase07-evening-media/culturalLedger.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js phase01-config/godWorldEngine2.js"
FILES="phase07-evening-media/mediaRoomIntake.js phase07-evening-media/parseMediaRoomMarkdown.js"
SRC=${1:?commit or stage27}
if [ "$SRC" = "stage27" ]; then MAN=$S27_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
for f in $F312; do git show "3e04d8a5:$f" > "$W/stage/$f"; done
for f in $F301; do git show "1e6beff5:$f" > "$W/stage/$f"; done
git show "3e04d8a5:phase07-evening-media/parseMediaRoomMarkdown.js" > "$W/stage/phase07-evening-media/parseMediaRoomMarkdown.js"   # stage 28 changes it too
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$S27_MAN" >/dev/null \
  || { echo "bench + engine.301 + engine.312 is not stage 27 — stop"; exit 1; }
if [ "$SRC" = "stage27" ]; then
  echo "stage 27 rebuilt from the bench + six files"; LABEL="bench 1004 restored = stage 27 (PROD @163)"
else
  OTHER=$(git log --format=%h "3e04d8a5..$SRC" -- $FILES | while read h; do git log -1 --format=%s "$h" | grep -q '^engine.318' || echo "$h"; done)
  [ -z "$OTHER" ] || { echo "non-engine.318 commit(s) touch the two files between 3e04d8a5 and $SRC: $OTHER — stop"; exit 1; }
  for f in $FILES; do
    want=$(grep " \./$f\$" "$S27_MAN" | cut -d' ' -f1)
    have=$(git show "3e04d8a5:$f" | sha256sum | cut -d' ' -f1)
    [ "$want" = "$have" ] || { echo "$f at 3e04d8a5 differs from its stage-27 copy — another change would ride; stop"; exit 1; }
    git show "$SRC:$f" > "$W/stage/$f"
  done
  ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
  EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
  grep -v $EXCL "$MAN" | diff -q - <(grep -v $EXCL "$S27_MAN") >/dev/null \
    || { echo "built stage differs from stage 27 outside the two files — stop"; exit 1; }
  echo "stage 28 = stage 27 + 2 files at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 28: stage 27 + engine.318 2 files at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
