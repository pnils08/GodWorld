#!/bin/bash
# engine.338 Task 2a sandbox proof on SANDBOX 1004: push stage 42 (stage 41 + the three 338a files at <commit>), sync from
# live, then two fires in a row. Bench-only players (POP-99338/9/40, marker E338-BENCH NON-CANON, Tier 1 / 2 / 3) each retire
# at fire 1 beside the builder's live C115 Vinnie row; fire 2 re-fires the same three rows (idempotent). The final sync from
# live removes the bench rows. Copied from 2026-11-07-e333-bench.sh.
#   usage: bash output/engine-sheet/2026-11-07-e338a-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/7aace044-7926-49c3-ab04-a5d078f0119e/scratchpad
TAG=${TAG:-e338a}
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/$TAG.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/$TAG.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/$TAG.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/$TAG.$1.out | tail -30; exit 2; fi
  node $O/2026-11-07-e338a-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
plant() { # <fire>
  local C; C=$(cc); local N=$(( C + 1 ))
  echo "== plant fire $1 at C$N"; node $O/2026-11-07-e338a-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 42"; bash $O/2026-11-07-push-e338a-bench.sh "$SRC" $O/stage42-e338a.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$TAG.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/$TAG.sync.out; exit 3; }
tail -2 $SP/$TAG.sync.out | q
echo "== World_Config before the fire (the 338 keys must be absent — live has none; the fire's open seeds them)"
node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>{const k=['postCareerIncomeTier1','postCareerIncomeTier2'].map(x=>x+'='+((d.find(r=>r[0]===x)||[])[1]));console.log('rows '+(d.length-1)+' '+k.join(' '))})" 2>&1 | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
plant 1; fire $TAG-f1
plant 2; fire $TAG-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$TAG.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/$TAG.sync.final.out | q
echo "engine.338a bench done"
