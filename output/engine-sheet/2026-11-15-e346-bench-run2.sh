#!/bin/bash
# engine.346 sandbox proof on SANDBOX 1004: push stage 46 (stage 45 + the three news files at <commit>), sync from live,
# set EventTrigger news on the bench copy of the C116 Dillon rumor row, one fire, read back, final sync from live.
#   usage: bash output/engine-sheet/2026-11-15-e346-bench.sh <commit>
# Copied from 2026-11-08-e334-bench.sh.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/ab778994-0b0a-402a-8c9d-66ab1a720bb6/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e346.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e346.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e346.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e346.$1.out | tail -30; exit 2; fi
  node $O/2026-11-15-e346-bench.js read $(( C + 1 )) 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || echo "READBACK MISMATCH (see the JSON)"
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 46 (news)"; bash $O/2026-11-15-push-e346-bench.sh "$SRC" $O/stage46-e346.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e346.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e346.sync.out; exit 3; }
tail -2 $SP/e346.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
echo "== pause 75 s (read quota)"; sleep 75; echo "== plant"; node $O/2026-11-15-e346-bench.js plant 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 7; }
echo "== fire 1"; sleep 70; seed; sleep 70; fire ${TAG:-e346}-f1
echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/e346.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e346.sync.final.out | q
echo "engine.346 bench done"
