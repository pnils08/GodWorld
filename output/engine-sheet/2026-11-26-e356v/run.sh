#!/bin/bash
# engine.356 cut C bench: push, sync from live, (picks: seed the bench ledger), one fire, the read, final sync.
#   bash output/engine-sheet/2026-11-26-e356v/run.sh d09eedf38 base        (stage 89 itself)
#   bash output/engine-sheet/2026-11-26-e356v/run.sh <cut C commit> full   (no pick stored)
#   node output/engine-sheet/2026-11-26-e356v/compare.js base full
#   bash output/engine-sheet/2026-11-26-e356v/run.sh <cut C commit> picks  (bench ledger seeded; read against full) — LAST
# Pattern: ../2026-11-25-e356u/run.sh.
set -uo pipefail
cd /root/GodWorld
SRC=${1:?commit}; LABEL=${2:?label base|full|picks}
O=output/engine-sheet; D=output/engine-sheet/2026-11-26-e356v; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
hdr() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; const s=require('/root/GodWorld/lib/sheets'); s.getRawSheetData('Spot_Picks').then(d=>console.log('bench Spot_Picks: present, '+(d.length-1)+' picks'),()=>console.log('bench Spot_Picks: absent'))" 2>&1 | q | tail -1; }
drop() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; const s=require('/root/GodWorld/lib/sheets'); s.deleteSheet('Spot_Picks').then(()=>console.log('bench Spot_Picks dropped'),e=>console.log('bench Spot_Picks not dropped: '+e.message))" 2>&1 | q | tail -1; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1; echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push code $SRC"; bash $D/bench-push.sh "$SRC" > $D/bench-push-$LABEL.log 2>&1 || { echo "HALT push"; tail -5 $D/bench-push-$LABEL.log; exit 4; }; tail -1 $D/bench-push-$LABEL.log
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $D/sync-$LABEL.out 2>&1 || { echo "HALT sync"; tail -20 $D/sync-$LABEL.out; exit 3; }; tail -1 $D/sync-$LABEL.out | q
hdr
if [ "$LABEL" = picks ]; then node $D/seed.js 2>&1 | q | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 3; }; hdr; else hdr | grep -q "present, [1-9]" && { echo "HALT the bench ledger holds picks on a no-pick run"; exit 3; }; fi
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard"; exit 3; }
DOOR=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1)
RC=$(echo "$DOOR" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$'); [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
sleep 75; node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(appended|CHECK)"
C=$(cc); echo "bench cycleCount $C"
echo "clearfire $(( C + 1 )): $(node $O/2026-10-19-benchclear.js $(( C + 1 )) 2>&1 | q | tail -1)"
node $O/2026-10-19-benchfire.js "$C" "e356v-$LABEL" > $D/fire-$LABEL.out 2>&1; rc=$?
echo "fire C$(( C + 1 )) rc=$rc $(grep -o '"verdict": "[^"]*"' $D/fire-$LABEL.out | head -1) $(grep -o '"wallS": [0-9]*' $D/fire-$LABEL.out)"
CHK=0
if [ $rc -ne 0 ]; then echo "HALT fire"; q < $D/fire-$LABEL.out | tail -30; CHK=2
else sleep 60; node $D/read.js "$(( C + 1 ))" "$LABEL" > $D/read-$LABEL.out 2>&1; CHK=$?; q < $D/read-$LABEL.out | tail -40; echo "read exit $CHK"; fi
[ "$LABEL" = picks ] && drop
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $D/final.sync.out 2>&1 || echo "HOLD final sync failed"; tail -1 $D/final.sync.out | q
hdr
exit $CHK
