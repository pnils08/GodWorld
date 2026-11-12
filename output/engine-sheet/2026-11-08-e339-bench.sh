#!/bin/bash
# engine.339 sandbox proof on SANDBOX 1004: push stage 46 (stage 45 + the intake door and the derivation library at <commit>),
# sync from live, then two fires, each with six fresh arrivals planted through Advancement_Intake1 (no spouse, no household).
# After each fire the readback checks every arrival is single (youth under 18) with 0 children. Final sync from live.
#   usage: bash output/engine-sheet/2026-11-08-e339-bench.sh <commit>       (TAG=e339-2 for a second run)
# Copied from 2026-11-08-e339-bench.sh.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/32205a5b-dd1f-4868-ab60-6bb30618a2b1/scratchpad
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/e339.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/e339.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e339.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/e339.$1.out | tail -30; exit 2; fi
  node $O/2026-11-08-e339-bench.js read "$1" $(( C + 1 )) "$SRC" 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || echo "READBACK MISMATCH (see the JSON)"
}
plant() { # <fire>
  local N; N=$(( $(cc) + 1 )); echo "== plant fire $1 at C$N"; node $O/2026-11-08-e339-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 46"; bash $O/2026-11-08-push-e339-bench.sh "$SRC" $O/stage46-e339.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e339.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/e339.sync.out; exit 3; }
tail -2 $SP/e339.sync.out | q
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
echo "== fire 1"; plant 1; fire ${TAG:-e339}-f1
echo "== fire 2"; plant 2; fire ${TAG:-e339}-f2
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/e339.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/e339.sync.final.out | q
echo "engine.339 bench done"
