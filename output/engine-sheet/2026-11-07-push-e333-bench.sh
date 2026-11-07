#!/bin/bash
# engine.333 bench push: SANDBOX 1004 script project = stage 39 = stage 38 (PROD @174, manifest stage38-e331.sha256)
# + phase05-citizens/applyGameNightMoments.js at <commit>. The bench must pull as stage 38, or as a stage 39 over it
# (a re-push: the one file back at stage 38 must give stage 38). The tree outside the one file must equal stage 38.
#   bash output/engine-sheet/2026-11-07-push-e333-bench.sh <commit> <manifest-out> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S38_MAN=$OUT/stage38-e331.sha256
S38_COMMIT=f82f19c72
FILES="phase05-citizens/applyGameNightMoments.js"
SRC=${1:?commit}; MAN=${2:?manifest}; DRY=${3:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S38_MAN" >/dev/null; then echo "bench pulled = stage 38"
else
  for f in $FILES; do git show "$S38_COMMIT:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S38_MAN" >/dev/null || { echo "bench is neither stage 38 nor a stage 39 over stage 38 — stop"; exit 1; }
  echo "bench pulled = a stage 39; the file back at stage 38 = stage 38"
fi
git merge-base --is-ancestor f1b53151f "$SRC" || { echo "$SRC does not carry the engine.333 build commit — stop"; exit 1; }
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
tree > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S38_MAN") >/dev/null \
  || { echo "built stage differs from stage 38 outside the file — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S38_MAN")" ] || { echo "file count differs from stage 38 — stop"; exit 1; }
echo "stage 39 = stage 38 + engine.333 (applyGameNightMoments.js) at $SRC; manifest $MAN"
LABEL="bench 1004 = stage 39: stage 38 + engine.333 at $SRC"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
