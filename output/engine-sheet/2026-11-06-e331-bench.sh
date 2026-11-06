#!/bin/bash
# engine.331 sandbox proof on SANDBOX 1004: push stage 38 (stage 37 + engine.331 at <commit>), then two fires in a row on
# live-synced state (plan Task 6). No resync between the fires — fire 2 must not hear fire 1's words.
#   reset: sync from live → guard 0 → clearfire → clearcheckpoint
#   fire 1: plant the fire-1 rows at N → seed (ratings / usage; sports skipped, both clubs planted) → fire → read
#   fire 2: plant the fire-2 rows at N+1 → seed → fire → read
# Then a final sync from live (bench data = live; bench code stays stage 38 until PROD).
#   usage: bash output/engine-sheet/2026-11-06-e331-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/04bcf796-8277-4202-8cae-c252b680508a/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e331.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e331.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e331.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e331.$1.out | tail -30; exit 2; fi
  node $O/2026-11-06-e331-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
plant() { # <fire>
  local C; C=$(cc); local N=$(( C + 1 ))
  echo "== plant fire $1 at C$N"; node $O/2026-11-06-e331-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 38"; bash $O/2026-11-06-push-e331-bench.sh "$SRC" $O/stage38-e331.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e331.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e331.sync.out; exit 3; }
tail -2 $SP/e331.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
plant 1; fire e331-f1
plant 2; fire e331-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e331.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e331.sync.final.out | q
echo "engine.331 bench done"
