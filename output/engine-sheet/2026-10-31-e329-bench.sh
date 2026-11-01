#!/bin/bash
# engine.329 bench on the exact candidate: SANDBOX 1004 at stage 36 = stage 35 (PROD) + processAdvancementIntake.js at <commit>.
# Proof: two bench-only usage rows planted (hard sports first, neutral civic second) for one citizen; one fire PASS under the
# completion contract; the hard-light line names the sports piece. End: bench code = stage 35 (= PROD).
#   usage: 2026-10-31-e329-bench.sh <commit> <POPID> <First> <Last>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SRC=${1:?commit}; POP=${2:?POPID}; FIRST=${3:?First}; LAST=${4:?Last}
SP=/tmp/claude-0/-root-GodWorld/e35d5c94-df9c-47ef-9bef-515ad7f5cd54/scratchpad
CODE=unknown
restore() { [ "$CODE" = "stage35" ] && return 0; [ "$CODE" = "unknown" ] && return 0; echo "== restore bench code to stage 35 (= PROD)"; if bash $O/2026-10-31-push-e329-bench.sh stage35; then CODE=stage35; else echo "HOLD restore failed; bench left on $CODE; restore: bash $O/2026-10-31-push-e329-bench.sh stage35"; fi; }
trap restore EXIT
count() { node -e "
require('/root/GodWorld/lib/env'); const L=process.env.GODWORLD_SHEET_ID; process.env.GODWORLD_SHEET_ID='1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID===L) process.exit(9);
require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]));" 2>&1 | grep -v "injected env"; }
echo "== engine.329 bench, candidate $SRC, probe citizen $POP $FIRST $LAST"
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | grep -v "injected env" | tail -1); echo "door: $D"
echo "$D" | grep -q '"state":"done"' || { echo "HALT a fire is running or the door is not valid"; exit 5; }
bash $O/2026-10-31-push-e329-bench.sh "$SRC" $O/stage36-e329.sha256 || exit 4; CODE=stage36; CUT=$(date +%s)
node $O/2026-10-31-e329-plant.js "$POP" "$FIRST" "$LAST" 2>&1 | grep -v "injected env" || { echo "HALT plant failed"; exit 6; }
left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s for /exec propagation"; sleep $left; }
C0=$(count); echo "bench cycleCount $C0"
node $O/2026-10-19-benchfire.js "$C0" "e329-fire1" > $SP/e329fire.$$ 2>&1; rc=$?
v=$(grep -o '"verdict": "[^"]*"' $SP/e329fire.$$ | head -1); echo "fire C$((C0 + 1)) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e329fire.$$)"
[ $rc -eq 0 ] && echo "$v" | grep -q '"PASS"' || { echo "HALT fire"; grep -v "injected env" $SP/e329fire.$$ | tail -30; exit 2; }
node $O/2026-10-31-e329-check.js "$C0" "$POP" > $SP/e329check.$$ 2>&1; rc=$?
grep -v "injected env" $SP/e329check.$$
[ $rc -eq 0 ] || { echo "HALT the check failed (rc=$rc: 3 no line written, 4 wrong piece or raw key)"; exit 2; }
restore
[ "$CODE" = "stage35" ] || exit 8
echo "engine.329 bench PASS"
