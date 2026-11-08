#!/bin/bash
# engine.338b bench RESUME after fire 1 (the first read halted on an over-strict count of other phases' log rows; the
# engine was right). Re-reads fire 1 with the corrected checks, then the dry wake, fire 2, fire 3, final sync.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/01da4ba3-fe39-4267-a36a-19c514e8819d/scratchpad
TAG=e338b
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/$TAG.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/$TAG.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/$TAG.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/$TAG.$1.out | tail -30; exit 2; fi
  node $O/2026-11-08-e338b-bench.js read "$1" $(( C + 1 )) > $SP/$TAG.$1.read 2>&1; local rr=$?
  tail -1 $SP/$TAG.$1.read
  [ $rr -eq 0 ] || { echo "HALT read"; exit 7; }
}
plant() { local C; C=$(cc); local N=$(( C + 1 ))
  echo "== plant fire $1 at C$N"; node $O/2026-11-08-e338b-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
C=$(cc); [ "$C" = "115" ] || { echo "HALT bench is at C$C, expected 115"; exit 1; }
echo "== re-read fire 1 (corrected checks)"
node $O/2026-11-08-e338b-bench.js read $TAG-f1 115 > $SP/$TAG.f1.reread 2>&1; tail -1 $SP/$TAG.f1.reread; grep -q "READ OK" $SP/$TAG.f1.reread || { echo "HALT re-read"; exit 7; }
echo "== Task 3 dry wake against the bench on the asked player (writes nothing; two model calls)"
node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; process.argv=['node','citizen-wake.js','--dry-run','--wake=evening','--cycle=115','--pop=POP-99338']; require('/root/GodWorld/scripts/citizen-wake.js');" > $SP/$TAG.wake.out 2>&1
echo "wake rc=$? — lines of note:"; grep -E "woke |owed |next-chapter|MOVE|provocation=question|dry-run\] would|FATAL|ERROR" $SP/$TAG.wake.out | q | cut -c1-260 | head -16
grep -q "next-chapter: POP-99338 answered" $SP/$TAG.wake.out || echo "HOLD: the dry wake did not carry the question (see $SP/$TAG.wake.out)"
plant 2; fire $TAG-f2
plant 3; fire $TAG-f3
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$TAG.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/$TAG.sync.final.out | q
echo "engine.338b bench done"
