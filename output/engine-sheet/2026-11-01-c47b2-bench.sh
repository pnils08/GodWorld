#!/bin/bash
# civic.47 B2 F7 bench on the exact candidate: SANDBOX 1004 at stage 37 = stage 36 (PROD) + civicInitiativeEngine.js at <commit>.
# Proof (two fires): fire 1 stamps the staged transit row (INIT-003, Fruitvale hub) a conversion baseline typed
# station-serving-hood from the C0 station rows; between fires Fruitvale's C0+1 reading is planted at 4x; fire 2 counts one
# qualifying observation (edge available). Expected values are recomputed from the bench tab. End: bench code = stage 36 (= PROD),
# INIT-003 reverted.
#   usage: 2026-11-01-c47b2-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SRC=${1:?commit}
SP=/tmp/claude-0/-root-GodWorld/94e63937-f937-40ae-8afc-3df15c273de5/scratchpad
CODE=unknown; PLANTED=no
cleanup() {
  if [ "$PLANTED" = "yes" ]; then echo "== revert INIT-003"; node $O/2026-11-01-c47b2-plant.js revert 2>&1 | grep -v "injected env"; PLANTED=no; fi
  if [ "$CODE" = "stage36" ] || [ "$CODE" = "unknown" ]; then return 0; fi
  echo "== restore bench code to stage 36 (= PROD)"
  if bash $O/2026-11-01-push-c47b2-bench.sh stage36; then CODE=stage36; else echo "HOLD: bench NOT restored to stage 36 — restore by hand"; fi
}
trap cleanup EXIT
count() { node -e "
require('/root/GodWorld/lib/env'); const L=process.env.GODWORLD_SHEET_ID; process.env.GODWORLD_SHEET_ID='1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID===L) process.exit(9);
require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]));" 2>&1 | grep -v "injected env"; }
fire() { # <C> <label>
  node $O/2026-10-19-benchfire.js "$1" "$2" > $SP/c47b2.$2.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/c47b2.$2.out | head -1)
  echo "fire C$(( $1 + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/c47b2.$2.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; grep -v "injected env" $SP/c47b2.$2.out | tail -30; return 1; fi
}
echo "== civic.47 B2 F7 bench, candidate $SRC"
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | grep -v "injected env" | tail -1); echo "door: $D"
echo "$D" | grep -q '"state":"done"' || { echo "HALT a fire is running or the door is not valid"; exit 5; }
bash $O/2026-11-01-push-c47b2-bench.sh "$SRC" $O/stage37-c47b2.sha256 || exit 4; CODE=stage37; CUT=$(date +%s)
C0=$(count); echo "bench cycleCount $C0"
PLANTED=yes
node $O/2026-11-01-c47b2-plant.js plant "$C0" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant failed"; exit 6; }
left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s for /exec propagation"; sleep $left; }
fire "$C0" "c47b2-fire1" || exit 2
node $O/2026-11-01-c47b2-check.js after1 "$C0" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT after fire 1"; exit 3; }
C1=$(( C0 + 1 ))
node $O/2026-11-01-c47b2-plant.js boost "$C1" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT boost failed"; exit 6; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | grep -v "injected env" | tail -1); echo "door: $D"
echo "$D" | grep -q '"state":"done"' || { echo "HALT door not valid before fire 2"; exit 5; }
fire "$C1" "c47b2-fire2" || exit 2
node $O/2026-11-01-c47b2-check.js after2 "$C0" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT after fire 2"; exit 4; }
cleanup
[ "$CODE" = "stage36" ] || exit 8
echo "civic.47 B2 F7 bench PASS"
