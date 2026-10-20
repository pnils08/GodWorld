#!/bin/bash
# engine.214 8a Cut C bench push: SANDBOX 1004 script project = stage 15 (= PROD @152) + the Cut C Apps Script files at
# <commit>. The bench must equal stage 15 outside the listed files, and each listed file at <base> must equal its stage-15 copy, so the
# only delta riding is Cut C's own diff. (Copied from 2026-10-20-push-e214b-bench.sh; base manifest stage 15.)
#   bash output/engine-sheet/2026-10-20-push-e214b-bench.sh <commit> <manifest-out> "<files>" <base-commit> [--dry-run]
#   <base-commit>: the commit whose copies of <files> must equal stage 15 (3ed34b61)
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
BASE_MAN=$OUT/stage15-e214b.sha256
SRC=${1:?commit}; MAN=${2:?manifest}; FILES=${3:?files}; BASE=${4:?base-commit}; DRY=${5:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | grep -v $EXCL | diff -q - <(grep -v $EXCL "$BASE_MAN") >/dev/null \
  || { echo "bench project differs from stage 15 outside the Cut C files — stop"; exit 1; }
echo "bench project = stage 15 outside the Cut C files"
for f in $FILES; do
  want=$(grep " \./$f\$" "$BASE_MAN" | cut -d' ' -f1)
  have=$(git show "$BASE:$f" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$f at $BASE differs from its stage-15 copy — another change would ride; stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
echo "stage = stage 15 + $(echo $FILES | wc -w) Cut C files at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "engine.214 Cut C = stage 15 + files at $SRC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
