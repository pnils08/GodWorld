#!/bin/bash
# engine.320 bench (the off-map hood refused for the whole queue) on the exact candidate. SANDBOX 1004, three legs from the
# same start (BASELINE-1004-C112b + marital migration + GC header + the engine.318 Status step), C113:
#   N6 = stage 30, neutral queue (rookie rows blanked, no probe) — compare with round 5's N5 (stage 29 = PROD, same start,
#        same seed): byte-equal
#   H6 = stage 30, the rookies + three probes + 'Benchprobe Badhood-E320' (hood 'Temescall') last — the whole queue refused
#        (--expect-badhood: Engine_Errors exactly +1 naming the row and the cell, no queued name minted, no row cleared)
#   P6 = stage 29 (PROD), the same lay — recorded: the defect as live has it (the mints ahead of the typo land, no row clears)
# End: bench code = stage 29 (= PROD @165); data left at C113 (leg P6).
#   usage: 2026-10-27-e320-bench6.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/4b2ac30b-6c0d-4c88-9f72-c3f1015e5265/scratchpad
TMP=$SP/e320fire6.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e319-fns.sh
bash -n $SP/e319-fns.sh && source $SP/e319-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=stage30
trap '[ "$CODE" = "stage29" ] || echo "BENCH LEFT: script = stage 30 at $SRC; restore: bash $O/2026-10-27-push-e320-bench.sh stage29"' EXIT
prep() { reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-26-e319-probe2.js lay "$@"; }
fire() {   # fire <leg> <verdict-regex> <allowed-rc>
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js 112 "e320r6$1" > $TMP 2>&1; local rc=$?
  local v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "leg $1 C113 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq $3 ] && echo "$v" | grep -Eq "$2" || { echo "HALT fire leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
echo "== engine.320 bench, candidate $SRC"
bash $O/2026-10-27-push-e320-bench.sh "$SRC" $O/stage30-e320.sha256 || exit 4; CUT=$(date +%s)
echo "== leg N6 (stage 30, neutral)"
prep N6 --neutral; fire N6 '"PASS"' 0
step $O/2026-10-26-e319-probe2.js check N6
step $O/2026-10-26-e319-probe2.js compare N5 N6
echo "== leg H6 (stage 30, typo hood last in the queue)"
prep H6 --badhood; fire H6 'PASS-WITH-NEW-EE' 2
step $O/2026-10-26-e319-probe2.js check H6 --expect-badhood
echo "== restore bench code to stage 29 (= PROD)"
bash $O/2026-10-27-push-e320-bench.sh stage29 && CODE=stage29 && CUT=$(date +%s) || { echo "HALT restore to stage 29 failed"; exit 8; }
echo "== leg P6 (stage 29, the same typo — the defect as live has it, recorded)"
prep P6 --badhood; fire P6 'PASS|PASS-WITH-NEW-EE' 2
node $O/2026-10-26-e319-probe2.js check P6 2>&1 | grep -v "injected env"
echo "engine.320 bench done"
