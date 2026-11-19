#!/bin/bash
# engine.350 Task 7 — the bench legs after the coded-pool leg, on SANDBOX 1004 (bench code must already be the stage named;
# default stage 57, pushed by 2026-11-18-push-e350d-bench.sh). Copied from 2026-11-18-e350c-bench.sh.
#   LEG=<name>            names the cells file and the snaps (default d)
#   PLACED=1              the nine placed rows and the flyer row go on the BENCH tab (leave off once they are on live)
#   SPEED="2 0.25"        the two speed keys set on the BENCH World_Config before the first fire (engine.349 Task 9)
#   STAGE=57 MAN=stage57-e350d.sha256
# What follows is the coded-pool leg's own header.
# engine.350 Task 7, the down side of the coded pools — the bench, on SANDBOX 1004 (bench code must already be stage 56,
# pushed by 2026-11-18-push-e350c-bench.sh). One leg from a fresh live sync; the nine PLACED rows and the flyer row's
# Active = no go on the BENCH tab only; N fires (default 10). After each fire the Cycle's pushes are counted off the
# citizens' own cells (what the fold reads) — the log carries lines no cell holds (advancement intake) and misses
# lines the cells hold (bets, money). Acceptance 5 (pushes within 60 / 40 on every dial but fandom) is read from the
# cells; the pulse rows say who moved for good. Copied from 2026-11-18-e350-bench.sh.
#   LEG=d bash output/research-build/2026-11-18-e350d-bench.sh [fires]
set -uo pipefail
cd /root/GodWorld
N=${1:-10}
STAGE=${STAGE:-57}; MAN=${MAN:-stage57-e350d.sha256}; LEG=${LEG:-d}; PLACED=${PLACED:-0}; SPEED=${SPEED:-}
export E350_LEG=$LEG
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e350$LEG-bench-logs; mkdir -p $SP
T=$R/2026-11-18-e350-bench.js; TC=$R/2026-11-18-e350d-bench.js
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
  node $O/2026-10-19-benchfire.js "$C" "e350$LEG-f$1" > $SP/fire$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/fire$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/fire$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/fire$1.out | tail -30; exit 2; fi
}
echo "== $(date -Is) engine.350 bench leg $LEG, stage $STAGE, $N fires, placed=$PLACED speed=${SPEED:-seed}"
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }

PB=$(mktemp -d); ( cd $PB && printf '{"scriptId":"%s","rootDir":""}' "1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2" > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if ( cd $PB && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - $R/$MAN >/dev/null; then echo "bench code = stage $STAGE (pull-back)"; else echo "HALT bench code is not stage $STAGE"; exit 4; fi

prep e350$LEG
if [ "$PLACED" = "1" ]; then echo "== the nine placed rows and the flyer row, bench tab only"
  node $TC placed 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT placed"; exit 7; }; fi
if [ -n "$SPEED" ]; then echo "== speed keys, bench only"; sleep 20
  node $TC speed $SPEED 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT speed"; exit 7; }; fi
node $TC cellreset 2>&1 | q
sleep 30; node $T snap $LEG-before 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT snap"; exit 8; }
C0=$(cc)
for i in $(seq 1 $N); do
  sleep 60; seed; sleep 70; fire $i; sleep 30
  node $TC cellcount $(( C0 + i )) 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT cellcount"; exit 9; }
done
C1=$(cc); sleep 60
node $T snap $LEG-after 2>&1 | q
sleep 30; node $T count $LEG-all $(seq $(( C0 + 1 )) $C1) 2>&1 | q
node $T bands $LEG-before $LEG-after 2>&1 | q
# the cross mode writes fixed file names: keep the stage-54 leg's files as they are
for f in cells cross; do [ -f $R/2026-11-18-e350-bench-$f.json ] && cp $R/2026-11-18-e350-bench-$f.json $SP/keep-$f.json; done
sleep 30; node $T cross $(seq $(( C0 + 1 )) $C1) 2>&1 | q
[ -f $R/2026-11-18-e350-bench-cross.json ] && cp $R/2026-11-18-e350-bench-cross.json $R/2026-11-18-e350$LEG-bench-cross.json
for f in cells cross; do [ -f $SP/keep-$f.json ] && cp $SP/keep-$f.json $R/2026-11-18-e350-bench-$f.json; done
node $TC cellsum 2>&1 | q
sleep 30; node $T pulse 2>&1 | q

echo "== final sync from live"; sleep 70; node scripts/syncSandboxFromLive.js $B --apply > $SP/final.sync.out 2>&1 || echo "HOLD final sync failed"
tail -1 $SP/final.sync.out | q
echo "== $(date -Is) e350 leg $LEG bench done"
