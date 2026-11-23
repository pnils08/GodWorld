#!/bin/bash
# engine.359 bench: push, sync, one fire, the milestone-row read, final sync.

set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}
O=output/engine-sheet; D=output/engine-sheet/2026-11-23-e361; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push code $SRC"; bash $D/bench-push.sh "$SRC" > $D/bench-push2.log 2>&1 || { echo "HALT push"; tail -5 $D/bench-push2.log; exit 4; }; tail -1 $D/bench-push2.log
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync2.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync2.out; exit 3; }; tail -1 $D/sync2.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1)
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75; node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"
C=$(cc); echo "bench cycleCount $C"
node $O/2026-10-19-benchfire.js "$C" "e361-a" > $D/fire-a2.out 2>&1; rc=$?
echo "fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire-a2.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire-a2.out)"
[ $rc -eq 0 ] || { echo "HALT fire"; q < $D/fire-a2.out | tail -30; exit 2; }
sleep 60; node $D/read.js "$(( C + 1 ))" > $D/read-a2.out 2>&1; ra=$?; q < $D/read-a2.out | tail -40; echo "read exit $ra"
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final2.sync.out 2>&1 || echo "HOLD final sync failed"; tail -1 $D/final2.sync.out | q
exit $ra
