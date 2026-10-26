#!/bin/bash
# engine.302 soak sitting on SANDBOX 1004 (engine.286 plan §Bench soak, step c): optional reset from BASELINE-1004-C112b
# + the bench-side MaritalStatus migration, then fire FROM..TO one Cycle at a time, each held to the completion contract
# (benchfire.js) and read back (e302-soakread.js). Halts on the first non-PASS. Never re-fires.
#   usage: e302-soakloop.sh <fromCycle> <toCycle> <label> [--reset]
set -uo pipefail
cd /root/GodWorld
FROM=$1; TO=$2; LABEL=$3; RESET=${4:-}
O=output/engine-sheet
if [ "$RESET" = "--reset" ]; then
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e302-soakread.js 112 --init 2>&1 | grep -v "injected env" || exit 1
  node $O/2026-10-19-benchclear.js 113 2>&1 | grep -v "injected env"
fi
for ((N=FROM; N<=TO; N++)); do
  node $O/2026-10-19-benchfire.js $((N-1)) $LABEL > /tmp/e302fire.$$ 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' /tmp/e302fire.$$ | head -1)
  echo "C$N fire rc=$rc $v $(grep -o '"wallS": [0-9]*' /tmp/e302fire.$$)"
  if [ $rc -ne 0 ]; then echo "HALT at C$N"; grep -v "injected env" /tmp/e302fire.$$ | tail -40; exit 2; fi
  node $O/2026-10-19-e302-soakread.js $N 2>&1 | grep -v "injected env" || { echo "READBACK FAILED at C$N"; exit 3; }
done
echo "SITTING DONE C$FROM-C$TO"
