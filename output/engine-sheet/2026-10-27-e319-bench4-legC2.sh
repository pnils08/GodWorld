#!/bin/bash
# engine.319 bench round 4, leg C2 + restore (the round-4 runner halted on leg B3's check, which expected Tier 4 where the
# repeat row correctly lifts the civic citizen to 3; the check was corrected and re-read on the same data, PASS). Bench code
# is still stage 29c at <commit> from the runner's push (its /exec propagation window long past).
#   usage: 2026-10-27-e319-bench4-legC2.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/4b2ac30b-6c0d-4c88-9f72-c3f1015e5265/scratchpad
TMP=$SP/e319fire4c.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e319-fns.sh
source $SP/e319-fns.sh && type reset_leg >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
PB=$(mktemp -d); ( cd "$PB" && printf '{"scriptId":"%s","rootDir":""}' 1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2 > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
( cd "$PB" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - $O/stage29c-e319.sha256 >/dev/null \
  && echo "bench script pulled = stage29c-e319.sha256 (the candidate is what will run)" || { echo "HALT bench script is not stage 29c"; exit 4; }
trap 'echo "BENCH LEFT: script = stage 29c at $SRC; restore: bash $O/2026-10-26-push-e319-bench.sh stage28"' EXIT
echo "== leg C2 (bad clock last in the queue)"
reset_leg
step $O/2026-10-25-e318-status-step.js bench freeze
step $O/2026-10-25-e318-status-step.js bench apply --expect 105
step $O/2026-10-25-e318-status-step.js bench verify
step $O/2026-10-26-e319-probe2.js lay C2 --badclock
t0=$(date +%s); node $O/2026-10-19-benchfire.js 112 "e319r4C2" > $TMP 2>&1; rc=$?
v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
echo "leg C2 C113 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
[ $rc -eq 2 ] && echo "$v" | grep -q 'PASS-WITH-NEW-EE' || { echo "HALT fire leg C2"; grep -v "injected env" $TMP | tail -40; exit 2; }
step $O/2026-10-26-e319-probe2.js check C2 --expect-badclock
echo "== restore bench code to stage 28"
bash $O/2026-10-26-push-e319-bench.sh stage28 || { echo "HALT restore to stage 28 failed"; exit 8; }
trap - EXIT
echo "engine.319 bench round 4 leg C2 done"
