#!/bin/bash
# engine.317 bench push: SANDBOX 1004 script project = stage 33 = stage 32 (PROD @168, manifest stage32-r31.sha256)
# + utilities/webTrigger.js at <commit>; or, with "stage32", the bench restored to stage 32 itself (= PROD).
# Stage 32 is BUILT, not assumed: the bench must be stage 31 (+ the two research.31 files at 7b0a93f5 = stage 32),
# stage 32, or stage 33 (webTrigger.js back at 3b746f0c^ = stage 32). Commits 3b746f0c^..<commit> on webTrigger.js must be
# engine.317 commits, and the tree outside it must equal stage 32.
#   bash output/engine-sheet/2026-10-30-push-e317-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-10-30-push-e317-bench.sh stage32 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S31_MAN=$OUT/stage31-e206.sha256
S32_MAN=$OUT/stage32-r31.sha256
S33_MAN=$OUT/stage33-e317.sha256
FR31="phase02-world-state/loadEventContentLedger.js phase05-citizens/casinoLedgerEngine.js"
F317="utilities/webTrigger.js"
BASE=3b746f0c^
SRC=${1:?commit or stage32}
if [ "$SRC" = "stage32" ]; then MAN=$S32_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S32_MAN" >/dev/null; then echo "bench pulled = stage 32"
elif tree | diff -q - "$S31_MAN" >/dev/null; then
  for f in $FR31; do git show "7b0a93f5:$f" > "$W/stage/$f"; done
  tree | diff -q - "$S32_MAN" >/dev/null || { echo "stage 31 + research.31 at 7b0a93f5 is not stage 32 — stop"; exit 1; }
  echo "bench pulled = stage 31; + research.31 at 7b0a93f5 = stage 32"
elif [ -f "$S33_MAN" ] && tree | diff -q - "$S33_MAN" >/dev/null; then
  git show "$BASE:$F317" > "$W/stage/$F317"
  tree | diff -q - "$S32_MAN" >/dev/null || { echo "stage 33 with webTrigger.js at $BASE is not stage 32 — stop"; exit 1; }
  echo "bench pulled = stage 33; webTrigger.js back at $BASE = stage 32"
else echo "bench is neither stage 31, 32 nor 33 — stop"; exit 1; fi
if [ "$SRC" = "stage32" ]; then
  LABEL="bench 1004 restored = stage 32 (PROD @168)"
else
  OTHER=$(git log --format=%h "$BASE..$SRC" -- $F317 | while read h; do git log -1 --format=%s "$h" | grep -q '^engine.317' || echo "$h"; done)
  [ -z "$OTHER" ] || { echo "non-engine.317 commit(s) touch webTrigger.js between $BASE and $SRC: $OTHER — stop"; exit 1; }
  git show "$SRC:$F317" > "$W/stage/$F317"
  tree > "$MAN"
  grep -v -e "./$F317$" "$MAN" | diff -q - <(grep -v -e "./$F317$" "$S32_MAN") >/dev/null \
    || { echo "built stage differs from stage 32 outside webTrigger.js — stop"; exit 1; }
  echo "stage 33 = stage 32 + engine.317 at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 33: stage 32 + engine.317 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
