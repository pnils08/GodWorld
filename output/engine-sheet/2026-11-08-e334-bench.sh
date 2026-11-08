#!/bin/bash
# engine.334 sandbox proof on SANDBOX 1004 (plan Task 6): push stage 45 (stage 44 + buildContractSeeds.js at <commit>),
# sync from live, then two fires in a row on the seeder's feeds (no plant). After each fire the readback rebuilds the
# Cycle's seeds from the bench's own Ripple_Ledger rows with the stage-44 builder and the candidate: every deck row must
# equal the candidate's seed; the rows the old builder would have written differently are listed. Final sync from live.
#   usage: bash output/engine-sheet/2026-11-08-e334-bench.sh <commit>       (TAG=e334-2 for a second run)
# Copied from 2026-11-07-e332-bench.sh.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/dbb8a02b-99b3-47ac-ae71-7c924acbfc2d/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e334.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e334.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e334.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e334.$1.out | tail -30; exit 2; fi
  node $O/2026-11-08-e334-bench.js read "$1" $(( C + 1 )) "$SRC" 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || echo "READBACK MISMATCH (see the JSON)"
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 45"; bash $O/2026-11-08-push-e334-bench.sh "$SRC" $O/stage45-e334.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e334.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e334.sync.out; exit 3; }
tail -2 $SP/e334.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
echo "== fire 1"; seed; fire ${TAG:-e334}-f1
echo "== fire 2"; seed; fire ${TAG:-e334}-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e334.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e334.sync.final.out | q
echo "engine.334 bench done"
