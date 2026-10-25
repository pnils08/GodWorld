#!/bin/bash
# engine.312 bench (plan 2026-10-16-celeste-dead-slice §engine.312 R5 / §B). SANDBOX 1004 = stage 27 = stage 26 (stage 25 +
# engine.301's two files at 1e6beff5) + the four engine.312 files at <commit>, from BASELINE-1004-C112b.
#   leg R (replay): reset_leg (2026-10-22-e308-bench.sh), then 2026-10-25-e312-probe.js copies live's 71 pending C112 usage rows
#         onto the bench (the baseline predates the Saturday print run) and lays one media-room intake row → fire C113 .. C(112+N);
#         snapshot before each fire, receipt after (2026-10-25-e312-receipt.js — every Cultural_Ledger row recomputed); a HOLD stops.
# End: bench code restored to stage 25 (manifest must equal stage24-e315-G3.sha256); data left on the last fired Cycle.
#   usage: 2026-10-25-e312-bench.sh <commit> [<N Cycles, default 3>]
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/297b749d-2ed0-41cd-be86-af3774fcfe46/scratchpad
TMP=$SP/e312fire.$$
SRC=${1:?commit}; N=${2:-3}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e312-fns.sh
bash -n $SP/e312-fns.sh && source $SP/e312-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect>
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js $1 "e312R" > $TMP 2>&1; local rc=$?
  echo "C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  if [ $rc -ne 0 ]; then echo "HALT fire"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
rc_() { node $O/2026-10-25-e312-receipt.js "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT receipt $*"; exit 3; }; }
RESTORED=0
trap '[ $RESTORED -eq 1 ] || echo "BENCH LEFT: script = stage 27 at $SRC (manifest $O/stage27-e312.sha256); data at the last fired Cycle; restore: bash $O/2026-10-25-restore-bench-stage25.sh"' EXIT
echo "== engine.312 bench, stage 27 at $SRC, leg R, $N Cycles"
bash $O/2026-10-25-push-e312-bench.sh "$SRC" $O/stage27-e312.sha256 || exit 4
CUT=$(date +%s)
reset_leg
node $O/2026-10-25-e312-probe.js --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT probe write"; exit 6; }
wait_cut
rc_ snap 113 R
for c in $(seq 112 $(( 111 + N ))); do
  fire $c
  rc_ check $(( c + 1 )) R
done
echo "== restore bench code to stage 25"
bash $O/2026-10-25-restore-bench-stage25.sh && RESTORED=1 || { echo "HALT restore to stage 25 failed"; exit 8; }
echo "engine.312 bench done"
