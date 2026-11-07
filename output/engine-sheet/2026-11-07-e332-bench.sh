#!/bin/bash
# engine.332 sandbox proof on SANDBOX 1004 (plan Task 4): push stage 40 (stage 39 + the three engine.332 files at
# <commit>), sync from live, then two fires in a row. Bench-only Edition_Coverage_Ratings rows (Reporter
# E332-BENCH NON-CANON); the final sync from live removes them.
#   fire 1 at N:   HEALTH -4, ENVIRONMENT +5, SPORTS +3, CIVIC +2 at N-1; ENVIRONMENT +3 at N; plus the seeder's
#                  generic medians for the other beats
#   fire 2 at N+1: no plant — the seeder's medians only; no causeId from fire 1 may recur (processed rows stay quiet)
#   usage: bash output/engine-sheet/2026-11-07-e332-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/626ff346-a58a-456a-b6f0-cb953889570a/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e332.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e332.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e332.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e332.$1.out | tail -30; exit 2; fi
  node $O/2026-11-07-e332-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 40"; bash $O/2026-11-07-push-e332-bench.sh "$SRC" $O/stage40-e332.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e332.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e332.sync.out; exit 3; }
tail -2 $SP/e332.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
N=$(( $(cc) + 1 ))
echo "== plant fire 1 at C$N"; node $O/2026-11-07-e332-bench.js plant $N 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
seed; fire ${TAG:-e332}-f1
echo "== fire 2: seeder only"; seed; fire ${TAG:-e332}-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e332.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e332.sync.final.out | q
echo "engine.332 bench done"
