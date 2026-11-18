#!/bin/bash
# engine.347 Tasks 12+13 sandbox proof on SANDBOX 1004: stage 53 (stage 52 + the Sad mood and the retirement echo), one fire from a fresh
# live sync with four planted reflection rows, read back, then the final sync from live.
# Copied from 2026-11-17-e347-bench.sh.
#   bash output/research-build/2026-11-17-e347b-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e347b-bench-logs; mkdir -p $SP; T=$R/2026-11-17-e347b-bench.js
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/sync.out; exit 3; }
tail -1 $SP/sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75
bash $R/2026-11-17-push-e347b-bench.sh "$SRC" 2>&1 | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT push"; exit 4; }
sleep 90
node $T plant 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 7; }
sleep 60
node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
sleep 70
C=$(cc); echo "bench cycleCount $C"
node $O/2026-10-19-benchfire.js "$C" "e347b-sad-echo" > $SP/fire.out 2>&1; rc=$?
v=$(grep -o '"verdict": "[^"]*"' $SP/fire.out | head -1)
echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/fire.out)"
if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/fire.out | tail -30; exit 2; fi
sleep 60; node $T check $(( C + 1 )) 2>&1 | q; CH=${PIPESTATUS[0]}
echo "check rc=$CH"
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/sync2.out 2>&1 || echo "HOLD final sync failed"
tail -1 $SP/sync2.out | q
echo "e347b bench done (check rc=$CH)"
exit $CH
