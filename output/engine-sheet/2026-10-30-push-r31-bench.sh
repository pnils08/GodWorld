#!/bin/bash
# research.31 bench push: SANDBOX 1004 script project = stage 32 = stage 31 (PROD @167, manifest stage31-e206.sha256)
# + the two research.31 engine files at <commit>; or, with "stage31", the bench restored to stage 31 itself (= PROD).
# Stage 31 is BUILT, not assumed: the bench as it stands must be stage 30 (+ the four engine.206 files at 66c62f13 = stage 31),
# stage 31, or stage 32 (the two files back at 59e4ce18^ = stage 31). Every commit 59e4ce18^..<commit> on the two files must
# be a research.31 commit, and the tree outside them must equal stage 31.
#   bash output/engine-sheet/2026-10-30-push-r31-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-30-push-r31-bench.sh stage31 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S30_MAN=$OUT/stage30-e320.sha256
S31_MAN=$OUT/stage31-e206.sha256
S32_MAN=$OUT/stage32-r31.sha256
F206="utilities/sportsWeekRecord.js phase02-world-state/applySportsSeason.js phase06-analysis/economicRippleEngine.js phase01-config/engine94SheetContract.js"
FR31="phase02-world-state/loadEventContentLedger.js phase05-citizens/casinoLedgerEngine.js"
BASE=59e4ce18^
SRC=${1:?commit or stage31}
if [ "$SRC" = "stage31" ]; then MAN=$S31_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S31_MAN" >/dev/null; then echo "bench pulled = stage 31"
elif tree | diff -q - "$S30_MAN" >/dev/null; then
  for f in $F206; do git show "66c62f13:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S31_MAN" >/dev/null || { echo "stage 30 + engine.206 is not stage 31 — stop"; exit 1; }
  echo "bench pulled = stage 30; + engine.206 at 66c62f13 = stage 31"
elif [ -f "$S32_MAN" ] && tree | diff -q - "$S32_MAN" >/dev/null; then
  for f in $FR31; do git show "$BASE:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S31_MAN" >/dev/null || { echo "stage 32 with the two files at $BASE is not stage 31 — stop"; exit 1; }
  echo "bench pulled = stage 32; the two research.31 files back at $BASE = stage 31"
else echo "bench is neither stage 30, 31 nor 32 — stop"; exit 1; fi
if [ "$SRC" = "stage31" ]; then
  LABEL="bench 1004 restored = stage 31 (PROD @167)"
else
  OTHER=$(git log --format=%h "$BASE..$SRC" -- $FR31 | while read h; do git log -1 --format=%s "$h" | grep -q '^research.31' || echo "$h"; done)
  [ -z "$OTHER" ] || { echo "non-research.31 commit(s) touch the two files between $BASE and $SRC: $OTHER — stop"; exit 1; }
  for f in $FR31; do git show "$SRC:$f" > "$W/stage/$f"; done
  tree > "$MAN"
  PAT=$(for f in $FR31; do printf -- '-e ./%s$ ' "$f"; done)
  grep -v $PAT "$MAN" | diff -q - <(grep -v $PAT "$S31_MAN") >/dev/null \
    || { echo "built stage differs from stage 31 outside the two research.31 files — stop"; exit 1; }
  echo "stage 32 = stage 31 + research.31 engine at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 32: stage 31 + research.31 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
