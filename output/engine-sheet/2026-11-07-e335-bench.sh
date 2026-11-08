#!/bin/bash
# engine.335 sandbox proof on SANDBOX 1004 (plan Task 3): push stage 41 (stage 40 + the two engine.335 files at
# <commit>), sync from live, then two fires in a row:
#   fire 1 at N:   the seeder's Oaks row (Streak L1) — a loss night: household game-night lines tag -Loss
#   fire 2 at N+1: a bench-only Oaks row with Streak W2 (Notes E335-BENCH NON-CANON) — a win night: -Win
# Each fire snapshots every ledger row's family / fandom first, then reads the household lines, their tag, the dial
# map's nudges and the citizen's TraitProfile before / after. The final sync from live removes the bench rows.
#   usage: bash output/engine-sheet/2026-11-07-e335-bench.sh <commit>       (TAG=e335-2 for a second run)
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/626ff346-a58a-456a-b6f0-cb953889570a/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-11-07-e335-bench.js snap "$1" 2>&1 | q
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e335.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e335.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e335.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e335.$1.out | tail -30; exit 2; fi
  node $O/2026-11-07-e335-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)|Oaks" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 41"; bash $O/2026-11-07-push-e335-bench.sh "$SRC" $O/stage41-e335.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e335.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e335.sync.out; exit 3; }
tail -2 $SP/e335.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
echo "== fire 1: the seeder's Oaks L1 (a loss night)"; seed; fire ${TAG:-e335}-f1
N=$(( $(cc) + 1 ))
echo "== fire 2: plant an Oaks W2 at C$N (a win night)"; node $O/2026-11-07-e335-bench.js plantwin $N 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
seed; fire ${TAG:-e335}-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e335.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e335.sync.final.out | q
echo "engine.335 bench done"
