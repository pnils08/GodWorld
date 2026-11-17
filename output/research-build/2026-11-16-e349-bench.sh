#!/bin/bash
# engine.349 sandbox proof on SANDBOX 1004, three fires of the same Cycle, each from a fresh live sync:
#   ctl  : stage 50 (= PROD @185)                       -> every citizen's DialState saved
#   keys : stage 51a = stage 50 + Task 6 (4e2e075b0)    -> DialState must equal ctl cell for cell; Dial_Moves = the difference
#   all  : stage 51  = stage 50 + Tasks 6 and 2 (6eb7bdb51), the 13 stuck watermarks set to 107 on the bench first
# No final sync here: the bench is read first (2026-11-16-e349-bench.js), then synced by hand.
# Copied from output/research-build/2026-11-16-buildnotes-bench.sh.
#   bash output/research-build/2026-11-16-e349-bench.sh
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; R=output/research-build; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=$R/e349-bench-logs; mkdir -p $SP
T=$R/2026-11-16-e349-bench.js
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
fire() { # <leg>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "e349-$1" > $SP/$1.fire.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/$1.fire.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/$1.fire.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/$1.fire.out | tail -30; exit 2; fi
  sleep 60; node $T read $1 $(( C + 1 )) 2>&1 | q
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }

echo "=== leg ctl: stage 50"
PB=$(mktemp -d); ( cd $PB && printf '{"scriptId":"%s","rootDir":""}' "1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2" > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if ( cd $PB && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - $R/stage50-buildnotes.sha256 >/dev/null; then echo "bench code = stage 50 (pull-back)"; else
  echo "bench code is not stage 50 — pushing stage 50"; bash $R/2026-11-16-push-e349-bench.sh s50 2>&1 | tail -2; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT bench is not stage 50"; exit 4; }; sleep 90; fi
prep ctl; node $T pre 2>&1 | q; node $T open ctl 2>&1 | q
sleep 60; seed; sleep 70; fire ctl

echo "=== leg keys: stage 51a (Task 6)"
prep keys
bash $R/2026-11-16-push-e349-bench.sh keys 2>&1 | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT push keys"; exit 4; }
echo "-- pause 90 s (deployment)"; sleep 90
node $T pre 2>&1 | q; node $T open keys 2>&1 | q
sleep 60; seed; sleep 70; fire keys
node $T cmp ctl keys 2>&1 | q; echo "cmp rc=${PIPESTATUS[0]}"
node $T moves keys 2>&1 | q; echo "moves rc=${PIPESTATUS[0]}"

echo "=== leg all: stage 51 (Tasks 6 and 2), 13 watermarks at 107"
prep all
bash $R/2026-11-16-push-e349-bench.sh all 2>&1 | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT push all"; exit 4; }
echo "-- pause 90 s (deployment)"; sleep 90
node $T mark107 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT mark107"; exit 7; }
sleep 30; node $T pre 2>&1 | q; node $T open all 2>&1 | q
sleep 60; seed; sleep 70; fire all
node $T moves all 2>&1 | q; echo "moves rc=${PIPESTATUS[0]}"
node $T cmp keys all 2>&1 | q | head -3
echo "e349 bench done — bench left at stage 51, data = this fire; read, then sync from live"
