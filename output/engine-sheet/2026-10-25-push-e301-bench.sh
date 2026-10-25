#!/bin/bash
# engine.301 F1 bench push (shape of 2026-10-22-push-e297-bench.sh): SANDBOX 1004 script project = stage 25 (= PROD @162,
# manifest stage24-e315-G3.sha256) + applyCityDynamics.js + finalizeCycleState.js at <commit>.
# The stage is BUILT, not assumed: pull the bench, lay stage 25's culturalLedger.js (3109503e) and the two files at <commit> over it,
# then require the built tree to equal the stage-25 manifest outside the two files, and each file at <commit>^ to equal its stage-25
# copy — so the only delta riding is the commit's own diff. Pass <commit> = e3266c44^ to restore the bench to stage 25 exactly.
#   bash output/engine-sheet/2026-10-25-push-e301-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
BASE_MAN=$OUT/stage24-e315-G3.sha256
FILES="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
git show 3109503e:phase07-evening-media/culturalLedger.js > "$W/stage/phase07-evening-media/culturalLedger.js"
for f in $FILES; do
  want=$(grep " \./$f\$" "$BASE_MAN" | cut -d' ' -f1)
  have=$(git show "e3266c44^:$f" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$f at e3266c44^ differs from its stage-25 copy — another change would ride; stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
grep -v $EXCL "$MAN" | diff -q - <(grep -v $EXCL "$BASE_MAN") >/dev/null \
  || { echo "built stage differs from stage 25 outside the two files — stop"; diff <(grep -v $EXCL "$MAN") <(grep -v $EXCL "$BASE_MAN") | head; exit 1; }
echo "stage = stage 25 + 2 files at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = stage 25 + engine.301 F1 2 files at $SRC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
