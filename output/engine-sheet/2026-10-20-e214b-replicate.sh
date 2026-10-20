#!/bin/bash
# engine.214 8a Cut B replicate (codex final gate 2026-10-20): each leg reset from BASELINE-1004-C112b (+ bench MaritalStatus
# migration + GC M–O header; sheet compare must read 0 diffs) and fired C113..C117 one Cycle at a time, each held to the
# completion contract (benchfire.js); then the leg's trajectory lines read back (e214b-multi.js). A = stage 14 (e305 push at
# ea777cae, manifest = stage14-e305), B = stage 15 (Cut B push at <commit>, manifest = stage15-e214b). Halts on the first non-PASS.
# Carried state: every fire after a reset steps back to the sheet ring (props stamped ahead are ghost-skipped, loadPreviousEvening.js).
#   usage: 2026-10-20-e214b-replicate.sh <commit>
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}
O=output/engine-sheet
TMP=/tmp/claude-0/-root-GodWorld/b345423b-3fe7-448e-b910-c08b8d9c2a6f/scratchpad/e214brep.$$
reset_leg() {
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  local cmp; cmp=$(node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1)
  echo "$cmp"; echo "$cmp" | grep -q "tabs with diffs: 0$" || { echo "HALT bench differs from the baseline after reset"; exit 1; }
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
}
wait_cut() { local left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s more for /exec propagation"; sleep $left; }; }
sit_leg() {
  for N in 113 114 115 116 117; do
    node $O/2026-10-19-benchfire.js $((N-1)) "e214brep$1" > $TMP 2>&1; rc=$?
    echo "leg $1 C$N fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
    if [ $rc -ne 0 ]; then echo "HALT leg $1 C$N"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  done
  node $O/2026-10-20-e214b-multi.js "$1" 113 117 2>&1 | grep -v "injected env" || exit 3
}
echo "== leg A (stage 14)"
bash $O/2026-10-19-push-e305-bench.sh ea777cae $O/2026-10-20-e214b-repA.sha256 "phase05-citizens/generateCitizensEvents.js utilities/neighborhoodPulseMap.js" ac5acf2a || exit 4
diff -q $O/2026-10-20-e214b-repA.sha256 $O/stage14-e305.sha256 >/dev/null || { echo "leg A stage is not stage 14 — stop"; exit 4; }
echo "leg A stage = stage14-e305.sha256 byte for byte"; CUT=$(date +%s)
reset_leg; wait_cut; sit_leg A
echo "== leg B (stage 14 + Cut B at $SRC)"
bash $O/2026-10-20-push-e214b-bench.sh "$SRC" $O/2026-10-20-e214b-repB.sha256 "phase05-citizens/generateCitizensEvents.js" ea777cae || exit 4
diff -q $O/2026-10-20-e214b-repB.sha256 $O/stage15-e214b.sha256 >/dev/null || { echo "leg B stage is not stage 15 — stop"; exit 4; }
echo "leg B stage = stage15-e214b.sha256 byte for byte"; CUT=$(date +%s)
reset_leg; wait_cut; sit_leg B
echo "REPLICATE DONE"
