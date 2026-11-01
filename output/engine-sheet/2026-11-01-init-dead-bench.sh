#!/bin/bash
# Six rejected initiatives on SANDBOX 1004: set dead, fire two Cycles, check they stayed dead. Bench code stage 35; PROD is stage 36 (one media file over).
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
J=$O/2026-11-01-init-dead-bench.js
SP=/tmp/claude-0/-root-GodWorld/3bea904a-a04d-4110-975f-d1ecdb367b7d/scratchpad
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | grep -v "injected env" | tail -1)
echo "$D" | grep -q '"state":"done"' || { echo "HALT a fire is running or the door is not valid: $D"; exit 5; }
node $J plant 2>&1 | grep -v "injected env"; [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "HALT plant failed"; exit 6; }
C=128
for n in 1 2; do
  node $O/2026-10-19-benchfire.js "$C" "init-dead-fire$n" > $SP/initdead$n.out 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' $SP/initdead$n.out | head -1)
  echo "fire C$((C + 1)) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/initdead$n.out)"
  [ $rc -eq 0 ] && echo "$v" | grep -q 'PASS' || { echo "HALT fire"; grep -v "injected env" $SP/initdead$n.out | tail -30; exit 2; }
  grep -A6 '"newEE"' $SP/initdead$n.out | cut -c1-200
  node $J check "after fire $n" 2>&1 | grep -v "injected env"; [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "HALT dead check failed"; exit 3; }
  C=$((C + 1))
done
echo "init-dead bench PASS"
