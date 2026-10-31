#!/bin/bash
# engine.316 bench push: SANDBOX 1004 script project = stage 34 = stage 33 (PROD @169, manifest stage33-e317.sha256)
# + phase05-citizens/runNeighborhoodEngine.js at <commit>; or, with "stage33", the bench restored to stage 33 (= PROD).
# Stage 33 is BUILT, not assumed: the bench must be stage 32 (+ webTrigger.js at eb1ed5fa = stage 33), stage 33, or a
# stage 34 (the engine file back at 6b0732f4^ = stage 33). The tree outside the engine file must equal stage 33.
#   bash output/engine-sheet/2026-10-30-push-e316-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-30-push-e316-bench.sh stage33 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S32_MAN=$OUT/stage32-r31.sha256
S33_MAN=$OUT/stage33-e317.sha256
S34_MAN=$OUT/stage34-e316.sha256
F317="utilities/webTrigger.js"
F316="phase05-citizens/runNeighborhoodEngine.js"
BASE=6b0732f4^
SRC=${1:?commit or stage33}
if [ "$SRC" = "stage33" ]; then MAN=$S33_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S33_MAN" >/dev/null; then echo "bench pulled = stage 33"
elif tree | diff -q - "$S32_MAN" >/dev/null; then
  git show "eb1ed5fa:$F317" > "$W/stage/$F317"
  tree | diff -q - "$S33_MAN" >/dev/null || { echo "stage 32 + engine.317 at eb1ed5fa is not stage 33 — stop"; exit 1; }
  echo "bench pulled = stage 32; + engine.317 at eb1ed5fa = stage 33"
elif [ -f "$S34_MAN" ] && tree | diff -q - "$S34_MAN" >/dev/null; then
  git show "$BASE:$F316" > "$W/stage/$F316"
  tree | diff -q - "$S33_MAN" >/dev/null || { echo "stage 34 with the engine file at $BASE is not stage 33 — stop"; exit 1; }
  echo "bench pulled = stage 34; engine file back at $BASE = stage 33"
else echo "bench is neither stage 32, 33 nor 34 — stop"; exit 1; fi
if [ "$SRC" = "stage33" ]; then
  LABEL="bench 1004 restored = stage 33 (PROD @169)"
else
  git show "$SRC:$F316" > "$W/stage/$F316"
  tree > "$MAN"
  grep -v -e "./$F316$" "$MAN" | diff -q - <(grep -v -e "./$F316$" "$S33_MAN") >/dev/null \
    || { echo "built stage differs from stage 33 outside the engine file — stop"; exit 1; }
  echo "stage 34 = stage 33 + engine.316 at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 34: stage 33 + engine.316 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
