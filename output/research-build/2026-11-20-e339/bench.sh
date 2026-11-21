#!/bin/bash
# engine.339 bench on SANDBOX 1004 — AFTER push.sh bench put the four files on the bench (@218) and pull-back matched.
# Sync from live, open the door, seed feeds, fire N Cycles from C117 (default 2), read the family rows / births / arrivals
# after each, final sync from live. Pattern: output/engine-sheet/2026-11-20-e353/bench.sh.  bash <this> [N]
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; D=output/research-build/2026-11-20-e339; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync.out; exit 3; }
tail -2 $D/sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: ${DOOR:0:200}"
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
echo "-- pause 75 s (read quota)"; sleep 75
node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
CHK=0; N=${1:-2}
for k in $(seq 1 $N); do
  node $D/readout.js pre 2>&1 | q
  C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "e339-f$k" > $D/fire$k.out 2>&1; rc=$?
  echo "fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire$k.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire$k.out)"
  [ $rc -eq 0 ] || { echo "HALT fire"; q < $D/fire$k.out | tail -30; CHK=2; break; }
  sleep 60; node $D/readout.js "$(( C + 1 ))" 2>&1 | q; r=${PIPESTATUS[0]}; [ $r -ne 0 ] && CHK=$r
  [ $k -lt $N ] && { echo "-- pause 70 s (read quota)"; sleep 70; }
done
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final.sync.out 2>&1 || echo "HOLD final sync failed"
tail -2 $D/final.sync.out | q
echo "RESULT check exit $CHK"; exit $CHK
