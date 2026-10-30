#!/bin/bash
# research.31 bench on the exact candidate (builder 2026-10-30 "Feel free to run the bench"). SANDBOX 1004, each leg from
# BASELINE-1004-C112b + marital migration + GC header + the engine.318 Status step, then the live Undocked_Feed (13 columns,
# PointsDelta back-scored, TargetCycle <= 114) with one bench-only change: Clarissa Dane +15 points, so the points board
# (Dane 25) and the credits board (Taveras 1,170) name different leaders. Fires C113 then C114.
#   leg A = stage 31 (PROD @167): $LEADER names Taveras; night-114 slips void (no C114 pilot brought credits home)
#   leg B = stage 32 (candidate): $LEADER names Dane; night-114 slips settle on Cristina Booker (10 pts, 0 cr)
# night-113 goes to Sammie Alvarez on both boards (30 cr on one night; 10 pts on another). End: bench code = stage 31.
#   usage: 2026-10-30-r31-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/94b00c82-9f80-4936-82b1-e0e60e44f21c/scratchpad
TMP=$SP/r31fire.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/r31-fns.sh
bash -n $SP/r31-fns.sh && source $SP/r31-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=unknown
trap '[ "$CODE" = "stage31" ] || echo "BENCH LEFT: script = $CODE; restore: bash $O/2026-10-30-push-r31-bench.sh stage31"' EXIT
prep() { reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-30-r31-feed.js; }
fire() {   # fire <expect> <label>
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js "$1" "r31$2" > $TMP 2>&1; local rc=$?
  local v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "leg $2 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq 0 ] && echo "$v" | grep -q '"PASS"' || { echo "HALT fire $2"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
leg() { prep; fire 112 "$1-c113"; fire 113 "$1-c114"; step $O/2026-10-30-r31-check.js "$1"; }
echo "== research.31 bench, candidate $SRC"
echo "== leg A (stage 31 = PROD @167)"
bash $O/2026-10-30-push-r31-bench.sh stage31 || exit 4; CODE=stage31; CUT=$(date +%s)
leg A
echo "== leg B (stage 32 = stage 31 + research.31 at $SRC)"
bash $O/2026-10-30-push-r31-bench.sh "$SRC" $O/stage32-r31.sha256 || exit 4; CODE=stage32; CUT=$(date +%s)
leg B
step $O/2026-10-30-r31-check.js --compare A B
echo "== restore bench code to stage 31 (= PROD)"
bash $O/2026-10-30-push-r31-bench.sh stage31 && CODE=stage31 || { echo "HALT restore to stage 31 failed"; exit 8; }
echo "research.31 bench done"
