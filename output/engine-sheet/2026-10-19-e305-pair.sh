#!/bin/bash
# engine.305 (engine.214 8a Cut A) bench pair on SANDBOX 1004, C113 from BASELINE-1004-C112b + the bench MaritalStatus
# migration + the Generic_Citizens M–O header, each leg reset first: A = stage 13 (@66), B = stage 13 + engine.305 at
# <commit>. Each fire held to the completion contract (benchfire.js), then e305-read.js. Halts on the first non-PASS.
#   usage: 2026-10-19-e305-pair.sh <commit>
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}
O=output/engine-sheet
TMP=/tmp/claude-0/-root-GodWorld/49426d47-11d9-4b90-9331-bb7b90e61856/scratchpad/e305fire.$$
reset_leg() {
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
}
fire_leg() {
  node $O/2026-10-19-benchfire.js 112 "e305$1" > $TMP 2>&1; rc=$?
  echo "leg $1 C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  node $O/2026-10-19-e305-read.js 113 "$1" 2>&1 | grep -v "injected env" || exit 3
}
echo "== leg A (stage 13)"; reset_leg; fire_leg A
echo "== leg B (stage 13 + engine.305 at $SRC)"; reset_leg
bash $O/2026-10-19-push-e305-bench.sh "$SRC" $O/stage14-e305.sha256 "phase05-citizens/generateCitizensEvents.js utilities/neighborhoodPulseMap.js" ac5acf2a || exit 4
echo "version cut; waiting 300 s for /exec propagation"; sleep 300
fire_leg B
echo "PAIR DONE"
