#!/bin/bash
# engine.334 bench push: SANDBOX 1004 script project = stage 45 = stage 44 (PROD @179, manifest stage44-e338b2.sha256)
# + phase07-evening-media/buildContractSeeds.js at <commit>. The bench must pull as stage 44, or as a stage 45 over it (a re-push:
# the one file back at stage 44 must give stage 44). The tree outside the one file must equal stage 44.
# Copied from 2026-11-08-push-e338b-bench.sh.
#   bash output/engine-sheet/2026-11-08-push-e334-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S44_MAN=$OUT/stage44-e338b2.sha256
S44_COMMIT=86174e9db
FILES="phase07-evening-media/buildContractSeeds.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}; STAGE=${STAGE:-45}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S44_MAN" >/dev/null; then echo "bench pulled = stage 44"
else
  for f in $FILES; do git show "$S44_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S44_MAN" >/dev/null || { echo "bench is neither stage 44 nor a stage 45 over stage 44 — stop"; exit 1; }
  echo "bench pulled = a stage 45; the one file back at stage 44 = stage 44"
fi
git merge-base --is-ancestor e15eb443f "$SRC" || { echo "$SRC does not carry the engine.334 build commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
grep -q "CONTRACT_SEED_UNIT" "$W/stage/phase07-evening-media/buildContractSeeds.js" || { echo "staged file lacks the engine.334 marker — stop"; exit 1; }
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S44_MAN") >/dev/null \
  || { echo "built stage differs from stage 44 outside the one file — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S44_MAN")" ] || { echo "file count differs from stage 44 — stop"; exit 1; }
echo "stage $STAGE = stage 44 + engine.334 (1 file) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage $STAGE: stage 44 + engine.334 at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
