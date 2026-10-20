#!/bin/bash
# engine.214 8a Cut C bench diagnostic on SANDBOX 1004 (B2 = the diff-review fold, Bnolift = a dangling bench-only commit with the game-week lift off), C113 from BASELINE-1004-C112b + the bench MaritalStatus migration + the
# Generic_Citizens M–O header, each leg reset first: A = stage 15 (= PROD @152; the two Cut C files at 3ed34b61, checked
# against stage15-e214b.sha256), B = stage 15 + Cut C (applyBusinessDynamics.js + generateCitizensEvents.js at <commit>).
# Each fire held to the completion contract (benchfire.js), then the e214c receipt. Halts on the first non-PASS.
# (Copied from 2026-10-20-e214b-pair.sh.)
#   usage: 2026-10-20-e214c-diag.sh
set -uo pipefail
cd /root/GodWorld

O=output/engine-sheet
FILES="phase05-citizens/applyBusinessDynamics.js phase05-citizens/generateCitizensEvents.js"
TMP=/tmp/claude-0/-root-GodWorld/1278dd4d-7ce3-4acf-826a-759a4fe124c9/scratchpad/e214cfire.$$
reset_leg() {
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  local cmp; cmp=$(node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1)
  echo "$cmp"; echo "$cmp" | grep -q "tabs with diffs: 0$" || { echo "HALT bench differs from the baseline after reset"; exit 1; } # codex final gate 2026-10-20
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
}
wait_cut() { local left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s more for /exec propagation"; sleep $left; }; }
fire_leg() {
  node $O/2026-10-19-benchfire.js 112 "e214c$1" > $TMP 2>&1; rc=$?
  echo "leg $1 C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  node $O/2026-10-20-e214c-receipt.js 113 "$1" 2>&1 | grep -v "injected env" || exit 3
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
for leg in "B2 72dacd68" "Bnolift 8d652b5dd4a6f0c064cb4253a955354998451082"; do
  set -- $leg
  echo "== leg $1 (stage 15 + Cut C files at $2)"
  bash $O/2026-10-20-push-e214c-bench.sh "$2" /tmp/claude-0/-root-GodWorld/1278dd4d-7ce3-4acf-826a-759a4fe124c9/scratchpad/diag-$1.sha256 "$FILES" 3ed34b61 || exit 4
  CUT=$(date +%s); reset_leg; wait_cut
  fire_leg $1
done
echo "DIAG DONE"
