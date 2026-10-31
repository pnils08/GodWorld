#!/bin/bash
# engine.316 bench on the exact candidate: SANDBOX 1004 as engine.317 left it. Stage 34 = stage 33 + the five hoods' signed
# lines. Proof: two fires PASS under the completion contract, and a drafted line lands only in its own hood. End: bench code
# = stage 33 (= PROD).
#   usage: 2026-10-30-e316-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SRC=${1:?commit}
SP=/tmp/claude-0/-root-GodWorld/06126fb8-1d8e-449f-9af1-bc53e61e0b80/scratchpad
CODE=unknown
restore() { [ "$CODE" = "stage33" ] && return 0; echo "== restore bench code to stage 33 (= PROD)"; if bash $O/2026-10-30-push-e316-bench.sh stage33; then CODE=stage33; else echo "HOLD restore failed; bench left on $CODE; restore: bash $O/2026-10-30-push-e316-bench.sh stage33"; fi; }
trap restore EXIT
count() { node -e "
require('/root/GodWorld/lib/env'); const L=process.env.GODWORLD_SHEET_ID; process.env.GODWORLD_SHEET_ID='1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID===L) process.exit(9);
require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]));" 2>&1 | grep -v "injected env"; }
echo "== engine.316 bench, candidate $SRC"
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
bash $O/2026-10-30-push-e316-bench.sh "$SRC" $O/stage34-e316.sha256 || exit 4; CODE=stage34; CUT=$(date +%s)
left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s for /exec propagation"; sleep $left; }
C0=$(count); echo "bench cycleCount $C0"
for i in 1 2; do
  C=$(count)
  node $O/2026-10-19-benchfire.js "$C" "e316-fire$i" > $SP/e316fire.$$ 2>&1; rc=$?
  v=$(grep -o '"verdict": "[^"]*"' $SP/e316fire.$$ | head -1); echo "fire C$((C + 1)) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e316fire.$$)"
  [ $rc -eq 0 ] && echo "$v" | grep -q '"PASS"' || { echo "HALT fire"; grep -v "injected env" $SP/e316fire.$$ | tail -30; exit 2; }
done
node $O/2026-10-30-e316-check.js "$C0" > $SP/e316check.$$ 2>&1; rc=$?
grep -v "injected env" $SP/e316check.$$
[ $rc -eq 0 ] || { echo "HALT the check failed (rc=$rc: 3 no line written, 4 a line outside its hood)"; exit 2; }
restore
[ "$CODE" = "stage33" ] || exit 8
echo "engine.316 bench PASS"
