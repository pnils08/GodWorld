#!/bin/bash
# engine.306 bench leg B on SANDBOX 1004: C113 from BASELINE-1004-C112b + the bench MaritalStatus migration + the Generic_Citizens
# M–O header (the reset every e214c leg used), the stage-18 candidate = stage 17 + phase05-citizens/processAdvancementIntake.js at
# <commit> (the landmark owner-door exclusion), and the 103 roster rows + the BIZ-00039 realign landed through the live write's own
# path (2026-10-21-e306-intake.js --target bench --apply). Leg A is known: stage 17 on this baseline = LifeHistory 2322 rows,
# sha 130462736b782fbe (2026-10-20-e214c-rate1.log), read into 2026-10-21-e306-{readers,spots}-A-c113.json from the bench as it stood.
# Fire held to the completion contract (benchfire.js); then the readers + spot receipts for B. Halts on the first non-PASS.
# Bench left on leg B; its Business_Intake tab is deleted at the end (the baseline has none).
#   usage: 2026-10-21-e306-legB.sh <commit>   (copied from 2026-10-20-e214c-rate1.sh)
set -uo pipefail
cd /root/GodWorld

O=output/engine-sheet
FILES="phase05-citizens/processAdvancementIntake.js"
TMP=/tmp/claude-0/-root-GodWorld/328c1adc-17bc-4de1-ab8c-06c687f639e9/scratchpad/e306fire.$$
reset_leg() {
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  local cmp; cmp=$(node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1)
  echo "$cmp"; echo "$cmp" | grep -q "tabs with diffs: 0$" || { echo "HALT bench differs from the baseline after reset"; exit 1; }
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
}
drop_intake_tab() {
  node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const id = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })).data;
  if (m.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  const s = m.sheets.find(x => x.properties.title === 'Business_Intake');
  if (s) { await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ deleteSheet: { sheetId: s.properties.sheetId } }] } }); console.log('bench Business_Intake tab deleted'); }
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"
}
wait_cut() { local left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s more for /exec propagation"; sleep $left; }; }
SRC=${1:?commit}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== leg B (stage 17 + $FILES at $SRC + the 103 rows + realign)"
bash $O/2026-10-21-push-e306-bench.sh "$SRC" $O/stage18-e306.sha256 "$FILES" 9ac1ea99 || exit 4
CUT=$(date +%s); reset_leg; drop_intake_tab   # a halted leg leaves the tab; the intake gate wants it absent
wait_cut   # also clears the minute's write quota the reset spent before the intake writes
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
node $O/2026-10-19-benchfire.js 112 "e306B" > $TMP 2>&1; rc=$?
echo "leg B C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
if [ $rc -ne 0 ]; then echo "HALT leg B"; grep -v "injected env" $TMP | tail -40; exit 2; fi
node $O/2026-10-21-e306-readers.js 113 B 2>&1 | grep -v "injected env" || exit 3
node $O/2026-10-21-e306-spots.js 113 B 2>&1 | grep -v "injected env" || exit 3
drop_intake_tab
echo "bench = leg B ($SRC + rows)"
echo "LEG B DONE"
