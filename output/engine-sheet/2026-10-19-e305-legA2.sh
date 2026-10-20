#!/bin/bash
# engine.305 leg A re-fire (codex recheck: like-for-like receipt). Reset as the pair did, put stage 13 back on the bench
# (push-e305-bench.sh with SRC = ac5acf2a builds stage 13 itself; manifest must equal stage13-e304.sha256), fire C113,
# then the receipt.
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SC=/tmp/claude-0/-root-GodWorld/49426d47-11d9-4b90-9331-bb7b90e61856/scratchpad
node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1
node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
bash $O/2026-10-19-push-e305-bench.sh ac5acf2a $SC/stage13-rebuilt.sha256 "phase05-citizens/generateCitizensEvents.js utilities/neighborhoodPulseMap.js" ac5acf2a || exit 4
diff -q $SC/stage13-rebuilt.sha256 $O/stage13-e304.sha256 && echo "bench back on stage 13 byte for byte" || { echo "rebuilt != stage 13 — stop"; exit 5; }
echo "version cut; waiting 300 s"; sleep 300
node $O/2026-10-19-benchfire.js 112 e305A2 > $SC/e305A2.out 2>&1; rc=$?
echo "leg A2 C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $SC/e305A2.out | head -1) $(grep -o '"wallS": [0-9]*' $SC/e305A2.out)"
[ $rc -eq 0 ] || { grep -v "injected env" $SC/e305A2.out | tail -30; exit 2; }
node $O/2026-10-19-e305-receipt.js 113 A 2>&1 | grep -v "injected env"
echo "LEG A2 DONE"
