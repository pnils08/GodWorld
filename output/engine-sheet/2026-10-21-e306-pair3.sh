#!/bin/bash
# engine.306 gate-3 FIX step 2 (codex plan review 2026-10-21 items 1-2): the tapped pair on SANDBOX 1004. Bench code = stage 18 + the
# bench-only EA tap at <diag-commit> (godWorldEngine2.js safePhaseCall_ marks + v3NeighborhoodWriter.js EA_Diag row; never merged).
# A2t = BASELINE-1004-C112b reset, C113 fire; B2t = the same reset + the 103 rows and the realign through 2026-10-21-e306-intake.js
# --target bench --apply, C113 fire. After each fire: extended readers + spots + the EA_Diag C113 row(s). The EA_Diag tab is deleted
# before each fire so each leg writes exactly one C113 row. Acceptance is judged by 2026-10-21-e306-eacheck.js, not here.
# End: bench code restored to stage 18 (manifest must equal stage18-e306.sha256), intake + EA_Diag tabs deleted, bench left on B2t.
# Reset and shared functions copied from 2026-10-21-e306-pair2.sh. Halts on the first non-PASS.
#   usage: 2026-10-21-e306-pair3.sh <diag-commit>
set -uo pipefail
cd /root/GodWorld

O=output/engine-sheet
FILES="phase05-citizens/processAdvancementIntake.js phase01-config/godWorldEngine2.js phase08-v3-chicago/v3NeighborhoodWriter.js"
SP=/tmp/claude-0/-root-GodWorld/9492d79f-059f-4c0f-b0d9-253c7b976fb5/scratchpad
TMP=$SP/e306fire.$$
reset_leg() {
  node $O/2026-10-19-reset-from-baseline-c112.js --apply 2>&1 | grep -v "injected env" | grep -v "tabs written" | tail -1 || exit 1
  local cmp; cmp=$(node $O/2026-10-19-cmpsheets.js 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA 2>&1 | grep -v "injected env" | tail -1)
  echo "$cmp"; echo "$cmp" | grep -q "tabs with diffs: 0$" || { echo "HALT bench differs from the baseline after reset"; exit 1; }
  node $O/2026-10-19-engine302-marital-migrate.js --target bench --apply 2>&1 | grep -v "injected env" | tail -2 || exit 1
  node $O/2026-10-19-e304-gc-header.js --target bench --apply 2>&1 | grep -v "injected env" || exit 1
  for c in $(seq 113 140); do node $O/2026-10-19-benchclear.js $c 2>&1 | grep -v "injected env" | grep -q '"ok":true' && echo "cleared fire record C$c"; done
}
drop_tab() {   # drop_tab <tab>
  TAB="$1" node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const id = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })).data;
  if (m.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  const s = m.sheets.find(x => x.properties.title === process.env.TAB);
  if (s) { await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ deleteSheet: { sheetId: s.properties.sheetId } }] } }); console.log('bench ' + process.env.TAB + ' tab deleted'); }
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"
}
make_diag_tab() {   # run 1 HALTed on A2t: every C113 save timed out after the cycle's own insertSheet of EA_Diag (engine.275 guard,
  # benchfires e306A2t 19:03Z). The tab + header are made here, before the fire, so the in-cycle ensure is a no-op
  # (persistenceExecutor.js:247-262) and the tap's only Sheet op inside the Cycle is its one append.
  node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const id = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })).data;
  if (m.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  if (m.sheets.find(x => x.properties.title === 'EA_Diag')) throw new Error('EA_Diag exists — drop it first');
  await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ addSheet: { properties: { title: 'EA_Diag' } } }] } });
  await api.spreadsheets.values.update({ spreadsheetId: id, range: 'EA_Diag!A1:F1', valueInputOption: 'RAW', requestBody: { values: [['Cycle', 'Totals', 'Contrib', 'Hoods', 'Marks', 'Pre5Events']] } });
  const h = (await api.spreadsheets.values.get({ spreadsheetId: id, range: 'EA_Diag!A1:F2' })).data.values;
  if (h.length !== 1 || h[0].join() !== 'Cycle,Totals,Contrib,Hoods,Marks,Pre5Events') throw new Error('EA_Diag header read-back ' + JSON.stringify(h));
  console.log('bench EA_Diag tab made, header read back');
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT EA_Diag tab not made"; exit 9; }
}
read_diag() {   # read_diag <label> — every EA_Diag C113 row, raw cells, to 2026-10-21-e306-eadiag-<label>-c113.json
  LABEL="$1" node -e "
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
require('/root/GodWorld/lib/sheets').getSheetData('EA_Diag').then(d => {
  const rows = d.slice(1).filter(x => Number(String(x[0]).replace(/^C/, '')) === 113);
  require('fs').writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-21-e306-eadiag-' + process.env.LABEL + '-c113.json', JSON.stringify({ header: d[0], rows }, null, 1));
  console.log('EA_Diag C113 rows ' + rows.length + (rows.length ? ' totals ' + rows[0][1] : ''));
  if (rows.length !== 1) process.exit(3);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT EA_Diag C113 rows != 1 for $1"; exit 3; }
}
wait_cut() { local left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s more for /exec propagation"; sleep $left; }; }
DIAG=${1:?diag-commit}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
bash $O/2026-10-21-push-e306-bench.sh "$DIAG" $SP/stage18-eatap.sha256 "$FILES" 9ac1ea99 || exit 4
CUT=$(date +%s)
fire() {   # fire <label>
  node $O/2026-10-19-benchfire.js 112 "e306$1" > $TMP 2>&1; local rc=$?
  echo "leg $1 C113 fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; fi
  node $O/2026-10-21-e306-readers.js 113 $1 2>&1 | grep -v "injected env" || exit 3
  node $O/2026-10-21-e306-spots.js 113 $1 2>&1 | grep -v "injected env" || exit 3
  read_diag $1
}
echo "== leg A2t (stage 18 + EA tap, no rows)"
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag; make_diag_tab; wait_cut
fire A2t
echo "== leg B2t (stage 18 + EA tap + the 103 rows + realign)"
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
drop_tab EA_Diag; make_diag_tab
fire B2t
drop_tab Business_Intake; drop_tab EA_Diag
echo "== restore bench code to stage 18"
bash $O/2026-10-21-push-e306-bench.sh 2896c46c $SP/stage18-restore.sha256 "$FILES" 9ac1ea99 || exit 4
cmp -s $SP/stage18-restore.sha256 $O/stage18-e306.sha256 && echo "bench code = stage 18 manifest" || { echo "HALT restore manifest != stage18-e306.sha256"; exit 8; }
echo "pair 3 done"
