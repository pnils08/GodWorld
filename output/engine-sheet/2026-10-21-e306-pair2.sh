#!/bin/bash
# engine.306 bench pair 2 on SANDBOX 1004 (codex diff gate 2 item 3): row-specific A/B evidence. Both legs on the stage-18 candidate
# (stage 17 + phase05-citizens/processAdvancementIntake.js at <commit>; the landmark term is inert on the 180, so A2 must reproduce
# leg A's LifeHistory sha 130462736b782fbe — the check that A2 = stage-17 A). A2 = BASELINE-1004-C112b reset, C113 fire, extended
# readers + spots. B2 = the same reset + the 103 rows and the realign through 2026-10-21-e306-intake.js --target bench --apply, C113
# fire, extended readers + spots (B2 must reproduce leg B's sha bb0ac98b0284f1cd). Then 2026-10-21-e306-attrib.js A2 B2.
# Reset and shared functions copied from 2026-10-21-e306-legB.sh. Halts on the first non-PASS. Bench left on B2, intake tab deleted.
#   usage: 2026-10-21-e306-pair2.sh <commit>
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
bash $O/2026-10-21-push-e306-bench.sh "$SRC" $O/stage18-e306.sha256 "$FILES" 9ac1ea99 || exit 4
CUT=$(date +%s)
fire() {   # fire <label>
  node $O/2026-10-19-benchfire.js 112 "e306$1" > $TMP 2>&1; local rc=$?
  echo "leg $1 C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  node $O/2026-10-21-e306-readers.js 113 $1 2>&1 | grep -v "injected env" || exit 3
  node $O/2026-10-21-e306-spots.js 113 $1 2>&1 | grep -v "injected env" || exit 3
}
echo "== leg A2 (stage 18, no rows)"
reset_leg; drop_intake_tab; wait_cut
fire A2
echo "== leg B2 (stage 18 + the 103 rows + realign)"
reset_leg; drop_intake_tab
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
fire B2
drop_intake_tab
node $O/2026-10-21-e306-attrib.js A2 B2 2>&1 | grep -v "injected env" || exit 3
echo "bench = leg B2 ($SRC + rows)"
echo "PAIR2 DONE"
