#!/bin/bash
# engine.304 cut 1 bench sitting on SANDBOX 1004 (@63 = stage 9 + 6 files at 85c9104e): reset from BASELINE-1004-C112b
# + the bench MaritalStatus migration (stage 9 carries engine.302), then fire C113..C117 one at a time, each held to the
# completion contract (benchfire.js) and read back (e304c1-poolread.js). Halts on the first non-PASS. Never re-fires.
#   usage: e304c1-sitting.sh <fromCycle> <toCycle> [--reset]
set -uo pipefail
cd /root/GodWorld
FROM=$1; TO=$2; RESET=${3:-}
O=output/engine-sheet
if [ "$RESET" = "--reset" ]; then
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-benchclear.js 113 2>&1 | grep -v "injected env"
  node $O/2026-10-19-e304c1-poolread.js 112 2>&1 | grep -v "injected env" || exit 1
fi
for ((N=FROM; N<=TO; N++)); do
  node $O/2026-10-19-benchfire.js $((N-1)) e304c1 > /tmp/claude-0/-root-GodWorld/dca13535-74bd-41d0-b12a-96caa737789e/scratchpad/e304fire.$$ 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' /tmp/claude-0/-root-GodWorld/dca13535-74bd-41d0-b12a-96caa737789e/scratchpad/e304fire.$$ | head -1)
  echo "C$N fire rc=$rc $v $(grep -o '"wallS": [0-9]*' /tmp/claude-0/-root-GodWorld/dca13535-74bd-41d0-b12a-96caa737789e/scratchpad/e304fire.$$)"
  if [ $rc -ne 0 ]; then echo "HALT at C$N"; grep -v "injected env" /tmp/claude-0/-root-GodWorld/dca13535-74bd-41d0-b12a-96caa737789e/scratchpad/e304fire.$$ | tail -40; exit 2; fi
  node $O/2026-10-19-e304c1-poolread.js $N 2>&1 | grep -v "injected env" || { echo "READBACK FAILED at C$N"; exit 3; }
done
echo "SITTING DONE C$FROM-C$TO"
