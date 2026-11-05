#!/bin/bash
# engine.330 sandbox proof on SANDBOX 1004 (bench code unchanged, stage 36 @181): two legs on the same live-synced state.
#   cold: sync from live → guard 0 → clearfire → clearcheckpoint → fire → read
#   seed: sync from live → guard 0 → clearfire → clearcheckpoint → seedSandboxFeeds --apply (twice: the second adds nothing) → fire → read
# Then a final sync from live, and the marker count read back (Acceptance 5).
#   usage: bash output/engine-sheet/2026-11-05-e330-bench.sh
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/e1939919-ef7b-4b3f-a69b-f47635c62c11/scratchpad
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
reset() {
  echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e330.sync.$1.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e330.sync.$1.out; exit 3; }
  tail -3 $SP/e330.sync.$1.out | q
  node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
  local D; D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
  local RC; RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
  [ -n "$RC" ] && { echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"; }
  echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
}
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e330.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e330.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e330.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e330.$1.out | tail -30; exit 2; fi
  node $O/2026-11-05-e330-bench.js read "$1" $(( C + 1 )) 2>&1 | q
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
reset cold; fire e330-cold
reset seed
node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -v "^  " ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
echo "== second apply (must add nothing)"; node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "rows|appended"
node scripts/seedSandboxFeeds.js --sheet-id $B --check 2>&1 | q | tail -1
fire e330-seed
echo "== final sync from live (Acceptance 5)"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e330.sync.final.out 2>&1 || echo "HOLD final sync failed"
node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; const s=require('/root/GodWorld/lib/sheets');
(async()=>{let n=0; for (const t of ['Edition_Coverage_Ratings','Citizen_Media_Usage','Advancement_Intake1','Oakland_Sports_Feed']) { const d=await s.getSheetData(t); n+=d.filter(r=>/sandbox-generic/i.test(r.join(' '))).length; } console.log('marker rows after resync: '+n); process.exit(n?1:0); })()" 2>&1 | q
echo "engine.330 bench done"
