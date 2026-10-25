#!/bin/bash
# engine.318 bench (plan 2026-10-16-celeste-dead-slice §engine.318). SANDBOX 1004 = stage 28 = stage 27 (PROD @163) + the two
# engine.318 files at <commit>, from BASELINE-1004-C112b: reset_leg → the Status step on the bench (freeze / apply / verify,
# 2026-10-25-e318-status-step.js) → one probe row (2026-10-25-e318-probe.js lay) → fire C113 → probe check.
# End: bench code restored to stage 27 (manifest must equal stage27-e312.sha256); data left at C113.
#   usage: 2026-10-25-e318-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/297b749d-2ed0-41cd-be86-af3774fcfe46/scratchpad
TMP=$SP/e318fire.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e318-fns.sh
bash -n $SP/e318-fns.sh && source $SP/e318-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
RESTORED=0
trap '[ $RESTORED -eq 1 ] || echo "BENCH LEFT: script = stage 28 at $SRC (manifest $O/stage28-e318.sha256); restore: bash $O/2026-10-25-push-e318-bench.sh stage27"' EXIT
echo "== engine.318 bench, stage 28 at $SRC"
bash $O/2026-10-25-push-e318-bench.sh "$SRC" $O/stage28-e318.sha256 || exit 4
CUT=$(date +%s)
reset_leg
step $O/2026-10-25-e318-status-step.js bench freeze
step $O/2026-10-25-e318-status-step.js bench apply --expect 105
step $O/2026-10-25-e318-status-step.js bench verify
step $O/2026-10-25-e318-probe.js lay
wait_cut
t0=$(date +%s)
node $O/2026-10-19-benchfire.js 112 "e318" > $TMP 2>&1; rc=$?
echo "C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
[ $rc -eq 0 ] || { echo "HALT fire"; grep -v "injected env" $TMP | tail -40; exit 2; }
step $O/2026-10-25-e318-probe.js check 113
echo "== restore bench code to stage 27"
bash $O/2026-10-25-push-e318-bench.sh stage27 && RESTORED=1 || { echo "HALT restore to stage 27 failed"; exit 8; }
echo "engine.318 bench done"
