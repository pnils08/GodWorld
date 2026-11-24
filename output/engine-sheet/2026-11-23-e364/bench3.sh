#!/bin/bash
# engine.364 bench run 3: no push (bench = e364.sha256), plant one open stay, one fire, the stamp read. Run 1-2 header:
# engine.364 bench: push, sync from live, two fires (fire 1 starts every hood at one half = rounding,
# fire 2 reads fire 1's carry), the census/carry/stamp read after each, final sync from live.
#   bash output/engine-sheet/2026-11-23-e364/bench.sh <commit>
# Pattern: ../2026-11-23-e361/bench.sh + research-build/2026-11-21-e351/bench.sh (two fires).
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}
O=output/engine-sheet; D=output/engine-sheet/2026-11-23-e364; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync3.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync3.out; exit 3; }; tail -1 $D/sync3.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1)
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75; node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"
CHK=0
PL=$(node $D/plant.js plant 2>&1 | q); POP=$(echo "$PL" | grep -o 'PLANTED POP-[0-9]*' | cut -d' ' -f2); [ -n "$POP" ] || { echo "HALT plant: $PL"; node scripts/syncSandboxFromLive.js $B --apply > $D/final3.sync.out 2>&1; exit 6; }; echo "planted $POP"
C=$(cc); echo "bench cycleCount $C"
echo "clearfire $(( C + 1 )): $(node $O/2026-10-19-benchclear.js $(( C + 1 )) 2>&1 | q | tail -1)"
node $O/2026-10-19-benchfire.js "$C" "e364-f3" > $D/fire3.out 2>&1; rc=$?
echo "fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire3.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire3.out)"
[ $rc -eq 0 ] || { echo "HALT fire"; q < $D/fire3.out | tail -30; CHK=2; }
if [ $CHK -eq 0 ]; then
  sleep 60; node $D/read.js "$(( C + 1 ))" start > $D/read3.out 2>&1; r=$?; q < $D/read3.out | grep -E '"(cityAdmits|verdict)"|problems' ; echo "census read exit $r"; [ $r -ne 0 ] && CHK=$r
  sleep 20; node $D/plant.js read "$(( C + 1 ))" "$POP" 2>&1 | q; r=${PIPESTATUS[0]}; echo "stamp read exit $r"; [ $r -ne 0 ] && CHK=$r
fi
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final3.sync.out 2>&1 || echo "HOLD final sync failed"; tail -1 $D/final3.sync.out | q
exit $CHK
