#!/bin/bash
# engine.333 sandbox proof on SANDBOX 1004 (plan Task 3): push stage 39 (stage 38 + applyGameNightMoments.js at
# <commit>), sync from live, then two fires in a row. Bench-only citizens (POP-99333/4/5, Notes/Bio marker
# E333-BENCH NON-CANON) and bench-only feed rows; the final sync from live removes them.
#   fire 1 at N:   retirement (Bench Retiree), injury (Bench Injuree), award (Bench Injuree)
#   fire 2 at N+1: the same retirement row (idempotent), injury-return (Bench Injuree),
#                  injury on a player the "dashboard" stamped this Cycle (Bench Stamped)
#   usage: bash output/engine-sheet/2026-11-07-e333-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/a69a39ce-98e2-4685-b549-0e0db6c70d46/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e333.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e333.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e333.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e333.$1.out | tail -30; exit 2; fi
  node $O/2026-11-07-e333-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
plant() { # <fire>
  local C; C=$(cc); local N=$(( C + 1 ))
  echo "== plant fire $1 at C$N"; node $O/2026-11-07-e333-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 39"; bash $O/2026-11-07-push-e333-bench.sh "$SRC" $O/stage39-e333.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e333.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e333.sync.out; exit 3; }
tail -2 $SP/e333.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
plant 1; fire e333-f1
plant 2; fire e333-f2
echo "== owed dry replay on the bench (nothing written)"
GODWORLD_SHEET_ID=$B timeout 170 node scripts/citizen-wake.js --dry-run --wake=morning --cycle=$(cc) 2>&1 | grep -i "owed\|woke" | head -8
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e333.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e333.sync.final.out | q
echo "engine.333 bench done"
