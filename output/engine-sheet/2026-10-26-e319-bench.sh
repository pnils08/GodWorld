#!/bin/bash
# engine.319 bench (plan 2026-07-27-employment-living-system Task 10). SANDBOX 1004, two legs on the same start
# (BASELINE-1004-C112b + the bench marital migration + GC header + the engine.318 Status step), each with the baseline's
# own two Oaks rookie rows (ClockMode 'Game') and three synthetic probes (2026-10-26-e319-probe.js lay), fired C113:
#   leg A = stage 28 (PROD @164)        — records what live does today
#   leg B = stage 29 (stage 28 + processAdvancementIntake.js at <commit>) — must land the five exactly (--expect)
# then compare A B (no mint differs outside the five). End: bench code restored to stage 28; data left at C113 (leg B).
#   usage: 2026-10-26-e319-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/4b2ac30b-6c0d-4c88-9f72-c3f1015e5265/scratchpad
TMP=$SP/e319fire.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e319-fns.sh
bash -n $SP/e319-fns.sh && source $SP/e319-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=stage28
trap '[ "$CODE" = "stage28" ] || echo "BENCH LEFT: script = stage 29 at $SRC; restore: bash $O/2026-10-26-push-e319-bench.sh stage28"' EXIT
leg() {   # leg <A|B> <push-args...>
  local L=$1; shift
  echo "== leg $L"
  bash $O/2026-10-26-push-e319-bench.sh "$@" || exit 4
  CUT=$(date +%s)
  reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-26-e319-probe.js lay
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js 112 "e319$L" > $TMP 2>&1; local rc=$?
  echo "leg $L C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq 0 ] || { echo "HALT fire leg $L"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
echo "== engine.319 bench, candidate $SRC"
leg A stage28
step $O/2026-10-26-e319-probe.js check A
CODE=stage29
leg B "$SRC" $O/stage29-e319.sha256
step $O/2026-10-26-e319-probe.js check B --expect
step $O/2026-10-26-e319-probe.js compare A B
echo "== restore bench code to stage 28"
bash $O/2026-10-26-push-e319-bench.sh stage28 && CODE=stage28 || { echo "HALT restore to stage 28 failed"; exit 8; }
echo "engine.319 bench done"
