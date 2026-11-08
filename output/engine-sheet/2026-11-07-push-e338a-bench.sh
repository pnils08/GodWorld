#!/bin/bash
# engine.338 Task 2a bench push: SANDBOX 1004 script project = stage 42 = stage 41 (PROD @177, manifest stage41-e335.sha256)
# + the three engine.338a files at <commit>. The bench must pull as stage 41, or as a stage 42 over it (a re-push: the
# three files back at stage 41 must give stage 41). The tree outside the three files must equal stage 41.
# Copied from 2026-11-07-push-e333-bench.sh.
#   bash output/engine-sheet/2026-11-07-push-e338a-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S41_MAN=$OUT/stage41-e335.sha256
S41_COMMIT=3184f9f50
FILES="phase01-config/engine94SheetContract.js phase01-config/godWorldEngine2.js phase05-citizens/applyGameNightMoments.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S41_MAN" >/dev/null; then echo "bench pulled = stage 41"
else
  for f in $FILES; do git show "$S41_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S41_MAN" >/dev/null || { echo "bench is neither stage 41 nor a stage 42 over stage 41 — stop"; exit 1; }
  echo "bench pulled = a stage 42; the three files back at stage 41 = stage 41"
fi
git merge-base --is-ancestor 673e8be44 "$SRC" || { echo "$SRC does not carry the engine.338 Task 2a build commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S41_MAN") >/dev/null \
  || { echo "built stage differs from stage 41 outside the three files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S41_MAN")" ] || { echo "file count differs from stage 41 — stop"; exit 1; }
echo "stage 42 = stage 41 + engine.338a (3 files) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage 42: stage 41 + engine.338a at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
