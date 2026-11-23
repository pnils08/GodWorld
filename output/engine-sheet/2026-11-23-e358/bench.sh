#!/bin/bash
# engine.358 bench: SANDBOX 1004, live-synced. (a) a fire → its run record read the Step 3.5 way;
# (b) a refused repeat fire writes no row; (c) a fire with the tab renamed away completes, no row.
# Pattern: ../2026-11-21-e356h/bench.sh.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; D=output/engine-sheet/2026-11-23-e358; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
rowsN() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('$1').then(d=>console.log((d||[]).length-1)).catch(()=>console.log('none'))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push code"; bash $D/bench-push.sh 6556c0980 > $D/bench-push.log 2>&1 || { echo "HALT push"; tail -5 $D/bench-push.log; exit 4; }; tail -1 $D/bench-push.log
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync.out; exit 3; }
tail -2 $D/sync.out | q; grep -o "missing on bench (will create): [0-9]*[^|]*" $D/sync.out | head -1
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: ${DOOR:0:160}"
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
echo "-- pause 75 s (read quota)"; sleep 75
node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
RES=0
# (a)
C=$(cc); echo "bench cycleCount $C; Engine_Run_Log rows before: $(rowsN Engine_Run_Log)"
node $O/2026-10-19-benchfire.js "$C" "e358-a" > $D/fire-a.out 2>&1; rc=$?
echo "(a) fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire-a.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire-a.out)"
[ $rc -eq 0 ] || { echo "HALT fire a"; q < $D/fire-a.out | tail -30; exit 2; }
sleep 60; node $D/read.js "$(( C + 1 ))" > $D/read-a.out 2>&1; ra=$?; q < $D/read-a.out | tail -40; echo "(a) read exit $ra"; [ $ra -eq 0 ] || RES=1
# (b)
sleep 70; R0=$(rowsN Engine_Run_Log); node $D/stale.js "$C" > $D/fire-b.out 2>&1; rb=$?; q < $D/fire-b.out | tail -1
sleep 30; R1=$(rowsN Engine_Run_Log); echo "(b) stale-expect fire rc=$rb (expect a refusal) rows $R0 -> $R1"; [ "$R0" = "$R1" ] || RES=1
# (c)
sleep 60; node $D/tabname.js Engine_Run_Log Engine_Run_Log_away 2>&1 | q
C2=$(cc); node $O/2026-10-19-benchfire.js "$C2" "e358-c-notab" > $D/fire-c.out 2>&1; rcc=$?
echo "(c) tab-away fire C$(( C2 + 1 )) rc=$rcc $(grep -o '"verdict": "[^"]*"' $D/fire-c.out | head -1)"; [ $rcc -eq 0 ] || RES=1
sleep 30; RA=$(rowsN Engine_Run_Log_away); node $D/tabname.js Engine_Run_Log_away Engine_Run_Log 2>&1 | q; echo "(c) rows on the renamed tab after: $RA (was $R1)"; [ "$RA" = "$R1" ] || RES=1
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final.sync.out 2>&1 || echo "HOLD final sync failed"
tail -2 $D/final.sync.out | q
echo "RESULT $RES"; exit $RES
