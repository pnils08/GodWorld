#!/bin/bash
# engine.335 bench push: SANDBOX 1004 script project = stage 41 = stage 40 (PROD @176, manifest stage40-e332.sha256)
# + the two engine.335 files at <commit>. The bench must pull as stage 40, or as a stage 41 over it
# (a re-push: the files back at stage 40 must give stage 40). The tree outside the files must equal stage 40.
#   bash output/engine-sheet/2026-11-07-push-e335-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S39_MAN=$OUT/stage40-e332.sha256
S39_COMMIT=c47769766
FILES="phase05-citizens/runHouseholdEngine.js utilities/citizenDialMap.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S39_MAN" >/dev/null; then echo "bench pulled = stage 40"
else
  for f in $FILES; do git show "$S39_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S39_MAN" >/dev/null || { echo "bench is neither stage 40 nor a stage 41 over stage 40 — stop"; exit 1; }
  echo "bench pulled = a stage 41; the files back at stage 40 = stage 40"
fi
git merge-base --is-ancestor 3184f9f50 "$SRC" || { echo "$SRC does not carry the engine.335 build — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S39_MAN") >/dev/null \
  || { echo "built stage differs from stage 40 outside the engine.335 files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S39_MAN")" ] || { echo "file count differs from stage 40 — stop"; exit 1; }
echo "stage 41 = stage 40 + engine.335 ($(echo $FILES | wc -w) files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage 41: stage 40 + engine.335 at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
