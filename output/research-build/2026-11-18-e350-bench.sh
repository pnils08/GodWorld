#!/bin/bash
# engine.350 — the one bench for Task 7 and the bets of Task 8, on SANDBOX 1004 (bench code must already be stage 54,
# pushed by 2026-11-18-push-e350-bench.sh). One leg from a fresh live sync (live carries the 148 down rows and the 94
# occupation tags since 2026-11-18); the four paper-reader tags are written on the BENCH tab; N fires (default 10).
# Acceptance 5: pushes per dial within 60 / 40 on every dial but fandom; band crossings; low bands; nobody pinned.
# Copied from output/research-build/2026-11-17-e350-tab-bench.sh.
#   bash output/research-build/2026-11-18-e350-bench.sh [fires]
set -uo pipefail
cd /root/GodWorld
N=${1:-10}
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e350-bench-logs; mkdir -p $SP
T=$R/2026-11-18-e350-bench.js
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
fire() { # <n>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "e350-f$1" > $SP/fire$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/fire$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/fire$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/fire$1.out | tail -30; exit 2; fi
}
echo "== $(date -Is) engine.350 bench, $N fires"
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }

PB=$(mktemp -d); ( cd $PB && printf '{"scriptId":"%s","rootDir":""}' "1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2" > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if ( cd $PB && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - $R/stage54-e350.sha256 >/dev/null; then echo "bench code = stage 54 (pull-back)"; else echo "HALT bench code is not stage 54"; exit 4; fi

prep e350
echo "== the four paper-reader tags, bench tab only"
node scripts/occupationDialTags.js --sheet $B --apply 2>&1 | q | grep -v "^  R" | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT tags"; exit 7; }
sleep 30; node $T snap before 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT snap"; exit 8; }
C0=$(cc)
for i in $(seq 1 $N); do
  sleep 60; seed; sleep 70; fire $i; sleep 30
done
C1=$(cc); sleep 60
node $T snap after 2>&1 | q
sleep 30; node $T count all $(seq $(( C0 + 1 )) $C1) 2>&1 | q
node $T bands before after 2>&1 | q
sleep 30; node $T cells $(seq $(( C0 + 1 )) $C1) 2>&1 | q
sleep 30; node $T cross $(seq $(( C0 + 1 )) $C1) 2>&1 | q
sleep 30; node $T pulse 2>&1 | q

echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/final.sync.out 2>&1 || echo "HOLD final sync failed"
tail -1 $SP/final.sync.out | q
echo "== $(date -Is) e350 bench done"
