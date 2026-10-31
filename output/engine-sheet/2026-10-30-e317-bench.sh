#!/bin/bash
# engine.317 bench on the exact candidate: SANDBOX 1004 as research.31's leg B2 left it (C114). Stage 33 = stage 32 + the
# read-only door. Proof: the door returns a valid record and moves nothing (two reads equal, cycleCount unchanged); a normal
# fire through the same doGet still runs (PASS) and the door then shows that Cycle done. End: bench code = stage 32 (= PROD).
#   usage: 2026-10-30-e317-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SRC=${1:?commit}
SP=/tmp/claude-0/-root-GodWorld/94b00c82-9f80-4936-82b1-e0e60e44f21c/scratchpad
CODE=unknown
trap '[ "$CODE" = "stage32" ] || echo "BENCH LEFT: script = $CODE; restore: bash $O/2026-10-30-push-e317-bench.sh stage32"' EXIT
count() { node -e "
require('/root/GodWorld/lib/env'); const L=process.env.GODWORLD_SHEET_ID; process.env.GODWORLD_SHEET_ID='1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID===L) process.exit(9);
require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]));" 2>&1 | grep -v "injected env"; }
door() { node $O/2026-10-30-e317-door.js bench 2>&1 | grep -v "injected env"; }
echo "== engine.317 bench, candidate $SRC"
bash $O/2026-10-30-push-e317-bench.sh "$SRC" $O/stage33-e317.sha256 || exit 4; CODE=stage33; CUT=$(date +%s)
left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s for /exec propagation"; sleep $left; }
C0=$(count); echo "bench cycleCount $C0"
R1=$(door); echo "door read 1: $R1"; echo "$R1" | grep -q '"valid":true' || { echo "HALT door read 1 not valid"; exit 2; }
R2=$(door); echo "door read 2: $R2"
[ "$R1" = "$R2" ] || { echo "HALT two reads differ"; exit 2; }
C1=$(count); [ "$C0" = "$C1" ] || { echo "HALT cycleCount moved across the reads ($C0 -> $C1)"; exit 2; }
echo "reads equal, cycleCount unchanged ($C1)"
node $O/2026-10-19-benchfire.js "$C1" "e317-fire" > $SP/e317fire.$$ 2>&1; rc=$?
v=$(grep -o '"verdict": "[^"]*"' $SP/e317fire.$$ | head -1); echo "fire C$((C1 + 1)) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/e317fire.$$)"
[ $rc -eq 0 ] && echo "$v" | grep -q '"PASS"' || { echo "HALT fire"; grep -v "injected env" $SP/e317fire.$$ | tail -30; exit 2; }
R3=$(door); echo "door read 3: $R3"
echo "$R3" | grep -q "\"cycle\":$((C1 + 1)),.*\"state\":\"done\"" || { echo "HALT the door does not show C$((C1 + 1)) done"; exit 2; }
echo "the door shows the fired Cycle done"
echo "== restore bench code to stage 32 (= PROD)"
bash $O/2026-10-30-push-e317-bench.sh stage32 && CODE=stage32 || { echo "HALT restore failed"; exit 8; }
echo "engine.317 bench done"
