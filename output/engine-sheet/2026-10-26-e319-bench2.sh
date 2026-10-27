#!/bin/bash
# engine.319 bench round 2 (codex diff gate §5). SANDBOX 1004, three legs from the same start (BASELINE-1004-C112b + the bench
# marital migration + GC header + the engine.318 Status step), the baseline's two Oaks rookie rows ('Game') + three probes, C113:
#   A2 = stage 28 (PROD @164) — record
#   B2 = stage 29 (stage 28 + processAdvancementIntake.js at <commit>) — the five land (--expect); compare A2 B2: every minted
#        column, every Employee_Count, every Ripple_Ledger row, every Generic_Citizens flip and the queue equal outside the five
#   C  = stage 29 + a fourth probe with ClockMode 'Gaem' LAST in queue order — Engine_Errors exactly +1 naming the row, no queued
#        name minted, the queue uncleared, no Emerged flip (--expect-badclock)
# End: bench code restored to stage 28; data left at C113 (leg C).
#   usage: 2026-10-26-e319-bench2.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/4b2ac30b-6c0d-4c88-9f72-c3f1015e5265/scratchpad
TMP=$SP/e319fire2.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e319-fns.sh
bash -n $SP/e319-fns.sh && source $SP/e319-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=stage28
trap '[ "$CODE" = "stage28" ] || echo "BENCH LEFT: script = stage 29 at $SRC; restore: bash $O/2026-10-26-push-e319-bench.sh stage28"' EXIT
prep() {   # prep <leg> [--badclock]
  reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-26-e319-probe2.js lay "$@"
}
fire() {   # fire <leg> <verdict-regex>
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js 112 "e319r2$1" > $TMP 2>&1; local rc=$?
  local v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "leg $1 C113 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq 0 ] && echo "$v" | grep -Eq "$2" || { echo "HALT fire leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
echo "== engine.319 bench round 2, candidate $SRC"
echo "== leg A2 (stage 28)"
bash $O/2026-10-26-push-e319-bench.sh stage28 || exit 4; CUT=$(date +%s)
prep A2; fire A2 '"PASS"'
step $O/2026-10-26-e319-probe2.js check A2
echo "== leg B2 (stage 29 at $SRC)"
CODE=stage29
bash $O/2026-10-26-push-e319-bench.sh "$SRC" $O/stage29b-e319.sha256 || exit 4; CUT=$(date +%s)
prep B2; fire B2 '"PASS"'
step $O/2026-10-26-e319-probe2.js check B2 --expect
step $O/2026-10-26-e319-probe2.js compare A2 B2
echo "== leg C (stage 29, bad clock last in the queue)"
prep C --badclock; fire C 'PASS-WITH-NEW-EE'
step $O/2026-10-26-e319-probe2.js check C --expect-badclock
echo "== restore bench code to stage 28"
bash $O/2026-10-26-push-e319-bench.sh stage28 && CODE=stage28 || { echo "HALT restore to stage 28 failed"; exit 8; }
echo "engine.319 bench round 2 done"
