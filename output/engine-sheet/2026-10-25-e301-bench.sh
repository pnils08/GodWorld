#!/bin/bash
# engine.301 F1 bench (plan 2026-10-10-engine-214 §engine.301 F1; codex plan review 2026-10-25). SANDBOX 1004 = stage 26 = stage 25
# (PROD @162, stage24-e315-G3.sha256) + applyCityDynamics.js + finalizeCycleState.js at <commit>. Each leg from BASELINE-1004-C112b
# (reset_leg only — no fame fixtures).
#   leg P (consumer + producer probe): reset, then 2026-10-25-e301-probe.js names Fruitvale a wave on the C112 carry (consumer: C113
#         reads Fruitvale at 3) and lowers Baylight District's PropertyCrimeIndex 10 (producer: C113 registers a Baylight rise on top of
#         its baseline C112 spike, so C113's Phase 9 carries Baylight as a wave and C114 reads it at 3) → fire C113, C114; receipt each.
#   reset_leg = BASELINE-1004-C112b + the two live-replayed migrations every leg since 2026-10-19 carries (MaritalStatus, the
#         Generic_Citizens M–O header) + the fire-record clears (codex diff gate 1 §3).
#   leg S (soak):  reset → fire C113 .. C(112+N) organically; receipt after every fire; a HOLD stops the leg; --final window at the end.
# End: bench code restored to stage 25 (manifest must equal stage24-e315-G3.sha256); data left on the last leg's last Cycle.
#   usage: 2026-10-25-e301-bench.sh <commit> [<legs: P|S|PS>] [<N soak Cycles, default 25>]
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/c71e23c5-5b82-41e2-94f1-aaf641272b3e/scratchpad
TMP=$SP/e301fire.$$
SRC=${1:?commit}; LEGS=${2:-PS}; N=${3:-25}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e301-fns.sh
bash -n $SP/e301-fns.sh && source $SP/e301-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect> <leg>
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js $1 "e301$2" > $TMP 2>&1; local rc=$?
  echo "leg $2 C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  if [ $rc -ne 0 ]; then echo "HALT leg $2"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
RESTORED=0
trap '[ $RESTORED -eq 1 ] || echo "BENCH LEFT: script = stage 26 at $SRC (manifest $O/stage26-e301.sha256); data at the last fired Cycle; restore: bash $O/2026-10-25-push-e301-bench.sh e3266c44^ <manifest>"' EXIT
rcpt() {   # rcpt <cycle> <leg> [--final <from>] [--expect-* <hood>]
  node $O/2026-10-25-e301-receipt.js "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT receipt C$1 leg $2"; exit 3; }
}
echo "== engine.301 F1 bench, stage 26 at $SRC, legs $LEGS, soak $N"
bash $O/2026-10-25-push-e301-bench.sh "$SRC" $O/stage26-e301.sha256 || exit 4
CUT=$(date +%s)
if [[ "$LEGS" == *P* ]]; then
  echo "== leg P (intervention probe: Fruitvale wave on the C112 carry = consumer; Baylight index -10 = producer)"
  reset_leg
  node $O/2026-10-25-e301-probe.js --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT probe write"; exit 6; }
  wait_cut
  fire 112 P; rcpt 113 P --expect-wave Fruitvale --expect-lines Fruitvale --expect-carry-wave "Baylight District"
  fire 113 P; rcpt 114 P --expect-wave "Baylight District" --final 113
fi
if [[ "$LEGS" == *S* ]]; then
  echo "== leg S (soak C113-C$(( 112 + N )))"
  reset_leg
  wait_cut
  for c in $(seq 112 $(( 111 + N ))); do
    fire $c S
    if [ $c -eq $(( 111 + N )) ]; then rcpt $(( c + 1 )) S --final 113; else rcpt $(( c + 1 )) S; fi
  done
fi
echo "== restore bench code to stage 25"
bash $O/2026-10-25-push-e301-bench.sh e3266c44^ $SP/stage25-restore-e301.sha256 || exit 4
cmp -s $SP/stage25-restore-e301.sha256 $O/stage24-e315-G3.sha256 && { RESTORED=1; echo "bench code = stage 25 manifest"; } || { echo "HALT restore manifest != stage24-e315-G3.sha256"; exit 8; }
echo "engine.301 F1 bench done"
