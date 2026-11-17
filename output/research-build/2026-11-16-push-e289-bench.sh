#!/bin/bash
# engine.289 bench push: SANDBOX 1004 script project = stage 49 = stage 48 (PROD @183, manifest stage48-clearfire.sha256)
# + the three engine.289 files at <commit>. The tree is built from a pull of PROD, which must be exactly stage 48, so the bench
# also carries stage 47/48 (the off-season word, clearFireRecordAfterRollback) — live and never benched.
# Copied from output/engine-sheet/2026-11-15-push-e346-bench.sh. Run after the builder cleared the bench versions (2026-11-16).
#   bash output/research-build/2026-11-16-push-e289-bench.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
S48_MAN=/root/GodWorld/output/engine-sheet/stage48-clearfire.sha256
OUT=/root/GodWorld/output/research-build
FILES="phase07-evening-media/applyStorySeeds.js phase08-v3-chicago/v3NeighborhoodWriter.js phase02-world-state/applyCityDynamics.js"
SRC=${1:?commit}; DRY=${2:-}
MAN=$OUT/stage49-e289.sha256
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S48_MAN" >/dev/null || { echo "PROD pull is not stage 48 — stop"; exit 1; }
echo "PROD pull = stage 48"
# each file must differ from stage 48 only by engine.289: the stage-48 copy must equal the file at the commit's base
for f in $FILES; do
  git show "c4c929b40:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the stage-48 source copy — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
grep -q "'nightlife-spot'" "$W/stage/phase07-evening-media/applyStorySeeds.js" || { echo "staged seeds file lacks the evening seeds — stop"; exit 1; }
grep -q "'dining-spot'" "$W/stage/phase08-v3-chicago/v3NeighborhoodWriter.js" || { echo "staged writer lacks the EA skip — stop"; exit 1; }
grep -q "engine.289: evening bars" "$W/stage/phase02-world-state/applyCityDynamics.js" || { echo "staged dynamics lacks the log line — stop"; exit 1; }
tree "$W/stage" > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S48_MAN") >/dev/null || { echo "differs from stage 48 outside the three files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S48_MAN")" ] || { echo "file count differs from stage 48 — stop"; exit 1; }
echo "stage 49 = stage 48 + engine.289 (3 files) at $SRC; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = stage 49: stage 48 + engine.289 at $SRC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
