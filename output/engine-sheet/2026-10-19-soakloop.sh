#!/bin/bash
# engine.300 soak sitting: reset (optional) then fire FROM..TO one Cycle at a time on SANDBOX 1004,
# each held to the completion contract (benchfire.js) and read back (soakread.js). Halts on the first
# non-PASS. Never re-fires.  usage: soakloop.sh <fromCycle> <toCycle> <label> [--reset]
set -uo pipefail
cd /root/GodWorld
FROM=$1; TO=$2; LABEL=$3; RESET=${4:-}
O=output/engine-sheet
if [ "$RESET" = "--reset" ]; then
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
  node $O/2026-10-19-soakread.js 112 --init 2>&1 | grep -v "injected env" || exit 1
  node $O/2026-10-19-benchclear.js 113 2>&1 | grep -v "injected env"
fi
for ((N=FROM; N<=TO; N++)); do
  node $O/2026-10-19-benchfire.js $((N-1)) $LABEL > /tmp/soakfire.$$ 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' /tmp/soakfire.$$ | head -1)
  echo "C$N fire rc=$rc $v $(grep -o '"wallS": [0-9]*' /tmp/soakfire.$$)"
  if [ $rc -ne 0 ]; then echo "HALT at C$N"; grep -v "injected env" /tmp/soakfire.$$ | tail -40; exit 2; fi
  node $O/2026-10-19-soakread.js $N 2>&1 | grep -v "injected env" || { echo "READBACK FAILED at C$N"; exit 3; }
done
echo "SITTING DONE C$FROM-C$TO"
