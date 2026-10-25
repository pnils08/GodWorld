#!/bin/bash
# engine.312 bench push (shape of 2026-10-25-push-e301-bench.sh): SANDBOX 1004 script project = stage 27 = stage 26
# (stage 25 + engine.301's two files at 1e6beff5, manifest stage26-e301.sha256) + the four engine.312 files at <commit>.
# The stage is BUILT, not assumed: pull the bench, lay stage 25's culturalLedger.js (3109503e) and engine.301's two files
# (1e6beff5), require the tree to equal the stage-26 manifest, then lay the four files at <commit>. Each file at engine.312's
# base (BASE = 4826c757^, the commit before engine.312's first) must equal its stage-26 copy, every commit BASE..<commit> on the
# four files must be an engine.312 commit, and the tree outside the four must equal stage 26 — so only engine.312's diff rides.
# Restore the bench to stage 25: bash output/engine-sheet/2026-10-25-push-e301-bench.sh e3266c44^ <manifest>.
#   bash output/engine-sheet/2026-10-25-push-e312-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S26_MAN=$OUT/stage26-e301.sha256
F301="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
FILES="phase07-evening-media/culturalLedger.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js phase01-config/godWorldEngine2.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
BASE=4826c757^
OTHER=$(git log --format=%h "$BASE..$SRC" -- $FILES | while read h; do git log -1 --format=%s "$h" | grep -q '^engine.312' || echo "$h"; done)
[ -z "$OTHER" ] || { echo "non-engine.312 commit(s) touch the four files between $BASE and $SRC: $OTHER — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
git show 3109503e:phase07-evening-media/culturalLedger.js > "$W/stage/phase07-evening-media/culturalLedger.js"
for f in $F301; do git show "1e6beff5:$f" > "$W/stage/$f"; done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$S26_MAN" >/dev/null \
  || { echo "bench + engine.301 is not stage 26 — stop"; exit 1; }
for f in $FILES; do
  want=$(grep " \./$f\$" "$S26_MAN" | cut -d' ' -f1)
  have=$(git show "$BASE:$f" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$f at $BASE differs from its stage-26 copy — another change would ride; stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$MAN"
EXCL=$(for f in $FILES; do printf -- '-e ./%s$ ' "$f"; done)
grep -v $EXCL "$MAN" | diff -q - <(grep -v $EXCL "$S26_MAN") >/dev/null \
  || { echo "built stage differs from stage 26 outside the four files — stop"; exit 1; }
echo "stage 27 = stage 26 + 4 files at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = stage 27: stage 26 + engine.312 4 files at $SRC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
