#!/bin/bash
# engine.297 bench (plan 2026-10-16 Task 9 + builder 2026-10-17): SANDBOX 1004 from the B start (BASELINE-1004-C112b reset + the 103 rows
# and the realign via 2026-10-21-e306-intake.js --target bench --apply) = the engine.307 / 308 legs' start.
#   F<n> = stage 21 (PROD @158) + buildEveningFamous.js / culturalLedger.js at <commit>: the 4 engine.307/308 files at <commit> must equal
#   stage 21 (3 at 7f49f3db, generationalWealthEngine.js at c88b5012), so the only delta riding is engine.297. C113 fire, then C114–C116.
# Control = e308 H1 (stage 21) C113–C116, read on the bench before this leg: e297-check 116 ctl --from 113 --final PASS, 9 sighted, 2 minted.
# After each fire: the e297 fame receipt (halts on a sighting-minted row naming no living citizen, a retired literal name, an Inactive or
# dead-linked row sighted, a sighting outside every pool; --final: no ledger-bucket row sighted in the roll), plus the e307 / e308 checks.
# End: bench code restored to stage 21 (manifest must equal stage20-e308-H1.sha256), intake tab deleted, data left on the leg's C116.
#   usage: 2026-10-22-e297-bench.sh <commit> [<label>]   (label default F1)
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
E307="phase05-citizens/runCareerEngine.js phase05-citizens/generationalWealthEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js"
FILES="$E307 phase07-evening-media/buildEveningFamous.js phase07-evening-media/culturalLedger.js"
SP=/tmp/claude-0/-root-GodWorld/a725df2c-536e-4a81-bd5c-126e074e188f/scratchpad
TMP=$SP/e297fire.$$
SRC=${1:?commit}; L=${2:-F1}
# fixed after leg F1: the sed range ended drop_tab at its JS '})().catch' line (source failed there: no drop_tab, no wait_cut, so F1's
# C113 fired ~280 s after the cut). Extract each function to its own closing '}' line, and syntax-check before sourcing.
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e297-fns.sh
bash -n $SP/e297-fns.sh && source $SP/e297-fns.sh && type reset_leg drop_tab wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect> <label>
  node $O/2026-10-19-benchfire.js $1 "e297$2" > $TMP 2>&1; local rc=$?
  echo "leg $2 C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $2"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
chk() {   # chk <cycle> [--final]
  node $O/2026-10-22-e307-check.js $1 $L $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C$1"; exit 3; }
  node $O/2026-10-22-e308-check.js $1 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C$1"; exit 3; }
  node $O/2026-10-22-e297-check.js $1 $L --from 113 ${2:-} 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e297 check C$1"; exit 3; }
}
echo "== leg $L (stage 21 + engine.297 at $SRC, the 103 rows + realign)"
for f in phase05-citizens/runCareerEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js; do
  git diff --quiet 7f49f3db "$SRC" -- $f || { echo "HALT $f differs from stage 21 at $SRC"; exit 4; }
done
git diff --quiet c88b5012 "$SRC" -- phase05-citizens/generationalWealthEngine.js || { echo "HALT generationalWealthEngine.js differs from stage 21"; exit 4; }
bash $O/2026-10-22-push-e297-bench.sh "$SRC" $O/stage21-e297-$L.sha256 "$FILES" d86cdaeb^ || exit 4
CUT=$(date +%s)
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
wait_cut
fire 112 $L
node $O/2026-10-22-e307-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C113"; exit 3; }
node $O/2026-10-22-e308-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C113"; exit 3; }
node $O/2026-10-22-e297-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e297 check C113"; exit 3; }
for c in 113 114 115; do
  fire $c $L
  if [ $c -eq 115 ]; then chk 116 --final; else chk $(( c + 1 )); fi
done
drop_tab Business_Intake
echo "== restore bench code to stage 21"
bash $O/2026-10-22-push-e297-bench.sh c88b5012 $SP/stage21-restore-e297.sha256 "$FILES" d86cdaeb^ || exit 4   # fixed after F1: all six files, the fame pair included
cmp -s $SP/stage21-restore-e297.sha256 $O/stage20-e308-H1.sha256 && echo "bench code = stage 21 manifest" || { echo "HALT restore manifest != stage20-e308-H1.sha256"; exit 8; }
echo "engine.297 bench done"
