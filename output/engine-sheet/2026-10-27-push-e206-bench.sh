#!/bin/bash
# engine.206 cut 2 bench push: SANDBOX 1004 script project = stage 31 = stage 30 (PROD @166, manifest stage30-e320.sha256)
# + the four engine.206 files at <commit>; or, with "stage30", the bench restored to stage 30 itself (= PROD).
# Stage 30 is BUILT, not assumed: the bench as it stands is checked against stage 29 (stage29d-e319.sha256 — where the
# engine.320 round left it) or stage 30; from 29, processAdvancementIntake.js at 2f2e7123 must make it stage 30 exactly.
# For stage 31 every commit 2f2e7123..<commit> on the four files must be an engine.206 commit, and the tree outside them
# must equal stage 30.
#   bash output/engine-sheet/2026-10-27-push-e206-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-27-push-e206-bench.sh stage30 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S29_MAN=$OUT/stage29d-e319.sha256
S30_MAN=$OUT/stage30-e320.sha256
F320="phase05-citizens/processAdvancementIntake.js"
F206="utilities/sportsWeekRecord.js phase02-world-state/applySportsSeason.js phase06-analysis/economicRippleEngine.js phase01-config/engine94SheetContract.js"
SRC=${1:?commit or stage30}
if [ "$SRC" = "stage30" ]; then MAN=$S30_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S30_MAN" >/dev/null; then echo "bench pulled = stage 30"
elif tree | diff -q - "$S29_MAN" >/dev/null; then
  git show "2f2e7123:$F320" > "$W/stage/$F320"
  tree | diff -q - "$S30_MAN" >/dev/null || { echo "stage 29 + engine.320 is not stage 30 — stop"; exit 1; }
  echo "bench pulled = stage 29; + engine.320 = stage 30"
elif [ -f "$OUT/stage31-e206.sha256" ] && tree | diff -q - "$OUT/stage31-e206.sha256" >/dev/null; then
  for f in $F206; do git show "2f2e7123:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S30_MAN" >/dev/null || { echo "stage 31 with the four files at 2f2e7123 is not stage 30 — stop"; exit 1; }
  echo "bench pulled = stage 31; the four engine.206 files back at 2f2e7123 = stage 30"
else echo "bench is neither stage 29, 30 nor 31 — stop"; exit 1; fi
if [ "$SRC" = "stage30" ]; then
  LABEL="bench 1004 restored = stage 30 (PROD @166)"
else
  OTHER=$(git log --format=%h "2f2e7123..$SRC" -- $F206 | while read h; do git log -1 --format=%s "$h" | grep -q '^engine.206' || echo "$h"; done)
  [ -z "$OTHER" ] || { echo "non-engine.206 commit(s) touch the four files between 2f2e7123 and $SRC: $OTHER — stop"; exit 1; }
  for f in $F206; do git show "$SRC:$f" > "$W/stage/$f"; done
  tree > "$MAN"
  PAT=$(for f in $F206; do printf -- '-e ./%s$ ' "$f"; done)
  grep -v $PAT "$MAN" | diff -q - <(grep -v $PAT "$S30_MAN") >/dev/null \
    || { echo "built stage differs from stage 30 outside the four engine.206 files — stop"; exit 1; }
  echo "stage 31 = stage 30 + engine.206 cut 2 at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 31: stage 30 + engine.206 cut 2 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
