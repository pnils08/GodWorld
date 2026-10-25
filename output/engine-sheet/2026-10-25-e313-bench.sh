#!/bin/bash
# engine.313 bench (plan 2026-10-16 §engine.313; builder 2026-10-25 "Bench it"): SANDBOX 1004 from the same B start as e297 F1
# (BASELINE-1004-C112b reset + the 103 rows and the realign via 2026-10-21-e306-intake.js --target bench --apply) — the baseline keeps
# its 10 Cultural rows named differently from their citizen (4 at the fame bar), the fixture the fix must reach.
#   G<n> = stage 23 (PROD @160, manifest stage21-e297-F2.sha256) + culturalLedger.js at <commit>; the manifest must differ from stage 23
#   in that one file only. C113 fire, then C114–C116. Before = e297 F1 (stage 21 + engine.297, same start): minted Dante Reyes.
# After each fire: the e297 receipt with --e313 (HOLD on a new personal row doubling a POPID; a citizen sighted under their ledger name
# whose differently named row was not reached; --final: the fallback never exercised), plus the e307 / e308 checks as in F1.
# End: bench code restored to stage 23 (manifest must equal stage21-e297-F2.sha256), intake tab deleted, data left on the leg's C116.
#   usage: 2026-10-25-e313-bench.sh <commit> [<label>]   (label default G1)
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
E307="phase05-citizens/runCareerEngine.js phase05-citizens/generationalWealthEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js"
FILES="$E307 phase07-evening-media/buildEveningFamous.js phase07-evening-media/culturalLedger.js"
SP=/tmp/claude-0/-root-GodWorld/8be5af3d-03ad-4d5f-9ee9-b90da9b2cc27/scratchpad
TMP=$SP/e313fire.$$
SRC=${1:?commit}; L=${2:-G1}
# fixed after leg F1: the sed range ended drop_tab at its JS '})().catch' line (source failed there: no drop_tab, no wait_cut, so F1's
# C113 fired ~280 s after the cut). Extract each function to its own closing '}' line, and syntax-check before sourcing.
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e313-fns.sh
bash -n $SP/e313-fns.sh && source $SP/e313-fns.sh && type reset_leg drop_tab wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect> <label>
  node $O/2026-10-19-benchfire.js $1 "e313$2" > $TMP 2>&1; local rc=$?
  echo "leg $2 C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $2"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
chk() {   # chk <cycle> [--final]
  node $O/2026-10-22-e307-check.js $1 $L $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C$1"; exit 3; }
  node $O/2026-10-22-e308-check.js $1 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C$1"; exit 3; }
  node $O/2026-10-22-e297-check.js $1 $L --from 113 --e313 ${2:-} 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e297 check C$1"; exit 3; }
}
echo "== leg $L (stage 23 + engine.313 culturalLedger.js at $SRC, the 103 rows + realign)"
for f in phase05-citizens/runCareerEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js; do
  git diff --quiet 7f49f3db "$SRC" -- $f || { echo "HALT $f differs from stage 21 at $SRC"; exit 4; }
done
git diff --quiet c88b5012 "$SRC" -- phase05-citizens/generationalWealthEngine.js || { echo "HALT generationalWealthEngine.js differs from stage 21"; exit 4; }
git diff --quiet c933cd0b "$SRC" -- phase07-evening-media/buildEveningFamous.js || { echo "HALT buildEveningFamous.js differs from stage 23"; exit 4; }
bash $O/2026-10-22-push-e297-bench.sh "$SRC" $O/stage23-e313-$L.sha256 "$FILES" d86cdaeb^ || exit 4
D=$(diff <(grep -v ' ./phase07-evening-media/culturalLedger.js$' $O/stage23-e313-$L.sha256) <(grep -v ' ./phase07-evening-media/culturalLedger.js$' $O/stage21-e297-F2.sha256) | wc -l)
[ "$D" = "0" ] && ! cmp -s $O/stage23-e313-$L.sha256 $O/stage21-e297-F2.sha256 && echo "bench = stage 23 + culturalLedger.js only" || { echo "HALT bench stage is not stage 23 + one file"; exit 4; }
CUT=$(date +%s)
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
wait_cut
fire 112 $L
node $O/2026-10-22-e307-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C113"; exit 3; }
node $O/2026-10-22-e308-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C113"; exit 3; }
node $O/2026-10-22-e297-check.js 113 $L --e313 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e297 check C113"; exit 3; }
for c in 113 114 115; do
  fire $c $L
  if [ $c -eq 115 ]; then chk 116 --final; else chk $(( c + 1 )); fi
done
drop_tab Business_Intake
echo "== restore bench code to stage 23"
bash $O/2026-10-22-push-e297-bench.sh c933cd0b $SP/stage23-restore-e313.sha256 "$FILES" d86cdaeb^ || exit 4
cmp -s $SP/stage23-restore-e313.sha256 $O/stage21-e297-F2.sha256 && echo "bench code = stage 23 manifest" || { echo "HALT restore manifest != stage21-e297-F2.sha256"; exit 8; }
echo "engine.313 bench done"
