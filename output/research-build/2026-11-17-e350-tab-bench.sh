#!/bin/bash
# engine.350 Task 7 on SANDBOX 1004, no code change (bench code must already be stage 53 = PROD): what the 148 down lines
# do to the count of pushes up against down. Two legs, each from a fresh live sync, each two fires (C117, C118):
#   ctl  : the tab as it is on live
#   rows : the tab + scripts/downLinesEclPool.js (148 rows, Weight 0.5)
# Then the final sync from live (which also takes the rows back off the bench tab).
# Copied from output/research-build/2026-11-16-e349-bench.sh.
#   bash output/research-build/2026-11-17-e350-tab-bench.sh
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e350-tab-bench-logs; mkdir -p $SP
T=$R/2026-11-17-e350-tab-bench.js
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q | tail -1; }
prep() { # sync from live, open the door
  echo "== sync from live ($1)"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$1.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/$1.sync.out; exit 3; }
  tail -2 $SP/$1.sync.out | q
  node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
  local D; D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: ${D:0:200}"
  local RC; RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
  [ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q | tail -1)"
  echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q | tail -1)"
  echo "-- pause 75 s (read quota)"; sleep 75
}
seed() {
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
fire() { # <leg> <n>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "e350-tab-$1-f$2" > $SP/$1.fire$2.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/$1.fire$2.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/$1.fire$2.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/$1.fire$2.out | tail -30; exit 2; fi
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }

PB=$(mktemp -d); ( cd $PB && printf '{"scriptId":"%s","rootDir":""}' "1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2" > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if ( cd $PB && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - $R/stage53-e347b.sha256 >/dev/null; then echo "bench code = stage 53 (pull-back)"; else echo "HALT bench code is not stage 53"; exit 4; fi

echo "=== leg ctl: the tab as on live"
prep ctl
seed; sleep 70; fire ctl 1
sleep 75; seed; sleep 70; fire ctl 2
C=$(cc); sleep 60; node $T count ctl $(( C - 1 )) $C 2>&1 | q

echo "=== leg rows: the tab + the 148 down lines"
prep rows
node $T apply 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT apply"; exit 7; }
sleep 60; seed; sleep 70; fire rows 1
sleep 75; seed; sleep 70; fire rows 2
C=$(cc); sleep 60; node $T count rows $(( C - 1 )) $C 2>&1 | q
node $T cmp ctl rows 2>&1 | q

echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/final.sync.out 2>&1 || echo "HOLD final sync failed"
tail -1 $SP/final.sync.out | q
echo "e350 tab bench done"
