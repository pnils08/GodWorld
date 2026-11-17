#!/bin/bash
# engine.349 final bench leg: the exact PROD candidate (stage 51 with the Name fix), one fire from a fresh live sync with the
# 13 marks at 107, read back, then the final sync from live. Functions copied from 2026-11-16-e349-bench.sh.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e349-bench-logs; T=$R/2026-11-16-e349-bench.js
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== sync from live (final leg)"; node scripts/syncSandboxFromLive.js $B --apply > $SP/final.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/final.sync.out; exit 3; }
tail -1 $SP/final.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75
bash $R/2026-11-16-push-e349-bench.sh all 2>&1 | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT push"; exit 4; }
sleep 90
node $T mark107 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT mark107"; exit 7; }
sleep 30; node $T pre 2>&1 | q; node $T open final 2>&1 | q
sleep 60
node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
sleep 70
C=$(cc); echo "bench cycleCount $C"
node $O/2026-10-19-benchfire.js "$C" "e349-final" > $SP/final.fire.out 2>&1; rc=$?
v=$(grep -o '"verdict": "[^"]*"' $SP/final.fire.out | head -1)
echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/final.fire.out)"
if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/final.fire.out | tail -30; exit 2; fi
sleep 60; node $T read final $(( C + 1 )) 2>&1 | q
node $T moves final 2>&1 | q; echo "moves rc=${PIPESTATUS[0]}"
node -e 'const r=JSON.parse(require("fs").readFileSync("/root/GodWorld/output/research-build/2026-11-16-e349-bench-final.json","utf8"));const m=r.moves.slice(1);console.log("rows with a name:",m.filter(x=>String(x[2]).trim()).length,"of",m.length);m.slice(0,3).forEach(x=>console.log("   ",x.join(" | ").slice(0,170)));const t=m.filter(x=>/^POP-010(29|3\d|40|41)$/.test(x[1]));console.log("rows for the 13:",t.length);const d=r.dial;let f=0;for(let i=1029;i<=1041;i++){const x=JSON.parse(d["POP-0"+i]);if(x.folded>=116&&x.folded<=117)f++;}console.log("of the 13, marks now at this Cycle:",f);'
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/final2.sync.out 2>&1 || echo "HOLD final sync failed"
tail -1 $SP/final2.sync.out | q
echo "final leg done"
