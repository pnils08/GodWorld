#!/bin/bash
# engine.356 A3 bench: push, sync from live, one fire, the with-whom read, final sync.
#   bash output/engine-sheet/2026-11-24-e356q/run.sh <commit>
# Pattern: ../2026-11-23-e361/run.sh + research-build/2026-11-21-e351/run.sh (two fires).
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}; LABEL=${2:?label base|move|full}
O=output/engine-sheet; D=output/engine-sheet/2026-11-24-e356q; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push code $SRC"; bash $D/bench-push.sh "$SRC" > $D/bench-push.log 2>&1 || { echo "HALT push"; tail -5 $D/bench-push.log; exit 4; }; tail -1 $D/bench-push.log
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync.out; exit 3; }; tail -1 $D/sync.out | q
AB=$(node $D/apply-bench.js 2>&1 | q | tail -1); echo "bench lines: $AB"; echo "$AB" | grep -q '"benchLines":5,"of":5' || { echo "HALT bench lines not on the tab"; exit 3; }; sleep 20
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1)
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75; node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"
CHK=0
for k in 1; do
  C=$(cc); echo "bench cycleCount $C"
  echo "clearfire $(( C + 1 )): $(node $O/2026-10-19-benchclear.js $(( C + 1 )) 2>&1 | q | tail -1)"
  node $O/2026-10-19-benchfire.js "$C" "e356q-f$k" > $D/fire$k.out 2>&1; rc=$?
  echo "fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire$k.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire$k.out)"
  [ $rc -eq 0 ] || { echo "HALT fire"; q < $D/fire$k.out | tail -30; CHK=2; break; }
  MODE=start; [ $k -eq 2 ] && MODE=ring
  sleep 60; node $D/read.js "$(( C + 1 ))" "$LABEL" > $D/read$k.out 2>&1; r=$?; q < $D/read$k.out | tail -40; echo "read $k exit $r"; [ $r -ne 0 ] && CHK=$r
  [ $k -lt 1 ] && { echo "-- pause 70 s (read quota)"; sleep 70; }
done
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final.sync.out 2>&1 || echo "HOLD final sync failed"; tail -1 $D/final.sync.out | q
exit $CHK
