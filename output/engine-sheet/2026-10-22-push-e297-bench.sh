#!/bin/bash
# engine.297 bench push (copy of 2026-10-22-push-e307-bench.sh, true deploy label): SANDBOX 1004 script project = stage 19 (= PROD @156, manifest stage18-e310-B3.sha256) + <files> at <commit>.
# The bench sits on stage 18 after the engine.310 pair, so the stage is BUILT, not assumed: pull the bench, lay stage 19's writer
# (v3NeighborhoodWriter.js at ffad3bf8) and <files> at <commit> over it, then require the built tree to equal the stage-19 manifest
# outside <files>, and each of <files> at <base> to equal its stage-19 copy — so the only delta riding is the commit's own diff.
# Pass <commit> = ffad3bf8 to restore the bench to stage 19 exactly. (Shape from 2026-10-21-push-e306-bench.sh.)
#   bash output/engine-sheet/2026-10-22-push-e307-bench.sh <commit> <manifest-out> "<files>" <base-commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
BASE_MAN=$OUT/stage18-e310-B3.sha256
SRC=${1:?commit}; MAN=${2:?manifest}; FILES=${3:?files}; BASE=${4:?base-commit}; DRY=${5:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
git show ffad3bf8:phase08-v3-chicago/v3NeighborhoodWriter.js > "$W/stage/phase08-v3-chicago/v3NeighborhoodWriter.js"
for f in $FILES; do
  want=$(grep " \./$f\$" "$BASE_MAN" | cut -d' ' -f1)
  have=$(git show "$BASE:$f" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$f at $BASE differs from its stage-19 copy — another change would ride; stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
grep -v $EXCL "$MAN" | diff -q - <(grep -v $EXCL "$BASE_MAN") >/dev/null \
  || { echo "built stage differs from stage 19 outside the listed files — stop"; diff <(grep -v $EXCL "$MAN") <(grep -v $EXCL "$BASE_MAN") | head; exit 1; }
echo "stage = stage 19 + $(echo $FILES | wc -w) files at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = stage 19 + $(echo $FILES | wc -w) files at $SRC (stage 22 = stage 21 + engine.297 when the e307/e308/e297 files)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
