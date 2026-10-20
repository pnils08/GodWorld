#!/bin/bash
# engine.304 cuts 1–3 (engine side) bench sitting on SANDBOX 1004 (stage 9 + 8 files at <commit>): reset from
# BASELINE-1004-C112b + the bench MaritalStatus migration + the Generic_Citizens M–O header (after the reset —
# the reset copies the C112 tab back), then fire FROM..TO one at a time, each held to the completion contract
# (benchfire.js) and read back (e304c1-poolread.js minors + e304c2-read.js links). Halts on the first non-PASS.
#   usage: e304c2-sitting.sh <fromCycle> <toCycle> [--reset]
set -uo pipefail
cd /root/GodWorld
FROM=$1; TO=$2; RESET=${3:-}
O=output/engine-sheet
TMP=/tmp/claude-0/-root-GodWorld/dca13535-74bd-41d0-b12a-96caa737789e/scratchpad/e304c2fire.$$
if [ "$RESET" = "--reset" ]; then
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
  node $O/2026-10-19-e304c1-poolread.js 112 2>&1 | grep -v "injected env" || exit 1
  node $O/2026-10-19-e304c2-read.js 112 2>&1 | grep -v "injected env" || exit 1
fi
for ((N=FROM; N<=TO; N++)); do
  node $O/2026-10-19-benchfire.js $((N-1)) e304c2 > $TMP 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "C$N fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT at C$N"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  node $O/2026-10-19-e304c1-poolread.js $N 2>&1 | grep -v "injected env" | grep "minor on ledger" || true
  node $O/2026-10-19-e304c2-read.js $N > $TMP.read 2>&1; r=$?; grep -v "injected env" $TMP.read
  if [ $r -ne 0 ]; then echo "READBACK FLAGGED at C$N"; exit 3; fi
done
echo "SITTING DONE C$FROM-C$TO"
