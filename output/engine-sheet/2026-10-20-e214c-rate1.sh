#!/bin/bash
# engine.214 Cut C rate bench on SANDBOX 1004 (builder 2026-10-20: "1 every 10 cycles"), C113 from BASELINE-1004-C112b + the bench
# MaritalStatus migration + the Generic_Citizens M–O header, each leg reset first:
#   Brate = stage 16 with generateCitizensEvents.js at <commit> (SPOT_LINE_WEIGHT_), the stage-17 candidate;
#   Bratediag = <diag-commit> = <commit> + read-only spot taps (expDraws = sum over slots of spot mass / usable mass) writing one
#   Spot_Diag row; its line set must equal Brate's. The A leg is known (stage 16 on this baseline = sha 330ba1da, B2).
# Each fire held to the completion contract (benchfire.js), then the e214c receipt. Halts on the first non-PASS. Bench left on Brate.
# (Copied from 2026-10-20-e214c-spotdiag.sh.)
#   usage: 2026-10-20-e214c-rate1.sh <commit>   (one clean leg; copied from -rate.sh without the tapped leg)
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
SRC=${1:?commit}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== leg Brate (stage 16 + generateCitizensEvents.js at $SRC)"
bash $O/2026-10-20-push-e214c-bench.sh "$SRC" /tmp/claude-0/-root-GodWorld/1278dd4d-7ce3-4acf-826a-759a4fe124c9/scratchpad/rate-Brate.sha256 "$FILES" 3ed34b61 || exit 4
CUT=$(date +%s); reset_leg; wait_cut
fire_leg Brate
echo "bench = Brate ($SRC)"
echo "RATE DONE"
