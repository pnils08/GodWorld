#!/bin/bash
# engine.319 bench round 5 (codex final look §1, the strict refusal) on the exact PROD candidate. SANDBOX 1004, three legs from the same start
# (BASELINE-1004-C112b + marital migration + GC header + the engine.318 Status step), C113, all on stage 29d:
#   N5 = neutral queue (rookie rows blanked, no probe) — compare with round 3's A0 (stage 28, same start, same seed): byte-equal
#   B5  = the rookies + three probes — the five land (clock,
#         employer, role, hood, Active, Tier 4), 13 minted, the repeat processed as the update, Engine_Errors +0 (--expect)
#   C5  = the rookies + three probes + 'Gaem' last — the whole queue refused (--expect-badclock; benchfire exits 2 on
#         PASS-WITH-NEW-EE, so the check runs on rc 2 when the verdict says so)
# End: bench code restored to stage 28; data left at C113 (leg C5).
#   usage: 2026-10-27-e319-bench5.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/4b2ac30b-6c0d-4c88-9f72-c3f1015e5265/scratchpad
TMP=$SP/e319fire4.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e319-fns.sh
bash -n $SP/e319-fns.sh && source $SP/e319-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=stage29
trap '[ "$CODE" = "stage28" ] || echo "BENCH LEFT: script = stage 29d at $SRC; restore: bash $O/2026-10-26-push-e319-bench.sh stage28"' EXIT
prep() { reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-26-e319-probe2.js lay "$@"; }
fire() {   # fire <leg> <verdict-regex> <allowed-rc>
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js 112 "e319r5$1" > $TMP 2>&1; local rc=$?
  local v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "leg $1 C113 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq $3 ] && echo "$v" | grep -Eq "$2" || { echo "HALT fire leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
echo "== engine.319 bench round 4, candidate $SRC"
bash $O/2026-10-26-push-e319-bench.sh "$SRC" $O/stage29d-e319.sha256 || exit 4; CUT=$(date +%s)
echo "== leg N5 (neutral)"
prep N5 --neutral; fire N5 '"PASS"' 0
step $O/2026-10-26-e319-probe2.js check N5
step $O/2026-10-26-e319-probe2.js compare A0 N5
echo "== leg B5 (the five)"
prep B5; fire B5 '"PASS"' 0
step $O/2026-10-26-e319-probe2.js check B5 --expect
echo "== leg C5 (bad clock last in the queue)"
prep C5 --badclock; fire C5 'PASS-WITH-NEW-EE' 2
step $O/2026-10-26-e319-probe2.js check C5 --expect-badclock
echo "== restore bench code to stage 28"
bash $O/2026-10-26-push-e319-bench.sh stage28 && CODE=stage28 || { echo "HALT restore to stage 28 failed"; exit 8; }
echo "engine.319 bench round 4 done"
