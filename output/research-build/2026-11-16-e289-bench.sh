#!/bin/bash
# engine.289 sandbox proof on SANDBOX 1004 @201 = stage 49 (stage 48 + engine.289): sync from live, two fires (the first writes
# the hooded evening seeds to the carry, the second is the first Cycle whose CULTURE / NIGHTLIFE bars read them), read back
# after each, final sync from live. Copied from output/engine-sheet/2026-11-15-e346-bench-run3.sh (no plant: nothing to plant).
#   bash output/research-build/2026-11-16-e289-bench.sh
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/9a7cc799-4f35-4f5c-8e35-c11d53345eb8/scratchpad
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e289.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e289.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e289.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e289.$1.out | tail -30; exit 2; fi
  sleep 60; node $R/2026-11-16-e289-bench.js read $(( C + 1 )) 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || echo "READBACK MISMATCH (see the JSON)"
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e289.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e289.sync.out; exit 3; }
tail -2 $SP/e289.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
echo "== pause 75 s (read quota)"; sleep 75; node $R/2026-11-16-e289-bench.js pre 2>&1 | q
echo "== fire 1"; sleep 60; seed; sleep 70; fire e289-f1
echo "== fire 2"; sleep 70; seed; sleep 70; fire e289-f2
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/e289.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e289.sync.final.out | q
echo "engine.289 bench done"
