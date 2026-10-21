#!/bin/bash
# engine.306 landing-driver drill on SANDBOX 1004 (codex diff gate 2026-10-21 item 2): the rebuilt 2026-10-21-e306-intake.js end to end
# on the bench, then its recover path. Reset to BASELINE-1004-C112b (as every e306 leg), drop a leftover Business_Intake tab, then:
#   1. dry run (mode fresh, all gates ok)  2. --apply fresh → RECEIPT PASS
#   3. damage the bench the way the C113 quota halt did (2026-10-21-e306-legB-halt1.log): Status G63:G104 back to `staged`
#      (61 of 103 promoted), plus the mark back to 186 and D40 back to Downtown (the lagging-mark and skipped-realign branches)
#   4. dry run without --recover → mode recover, STOP on the flag  5. --recover --apply → RECEIPT PASS
#   (codex diff gate 2 item 2) 6. un-land as if the processor never ran: ledger rows 182..284 deleted, mark 186, G2:G104 `staged`,
#   D40 Downtown  7. one old cell edited (E10 +1) → restage refuses on the original-preimage gate; E10 put back  8. restage → RECEIPT PASS
# No fire. Bench left at the drill's end state; the next leg resets it.
# (Header of 2026-10-21-e306-legB.sh kept below for the shared functions.)
#: C113 from BASELINE-1004-C112b + the bench MaritalStatus migration + the Generic_Citizens
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
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
D=$O/2026-10-21-e306-intake.js
reset_leg; drop_intake_tab
echo "== 1. dry"; node $D --target bench 2>&1 | grep -v "injected env" | tail -2
echo "== 2. fresh apply"; node $D --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT fresh"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed"; exit 7; }
echo "== 3. damage (bench only)"
node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const id = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  if ((await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title' })).data.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  const wc = (await api.spreadsheets.values.get({ spreadsheetId: id, range: 'World_Config!A:A' })).data.values;
  const hw = wc.findIndex(r => String(r[0]).trim() === 'bizIdHighWater') + 1;
  await api.spreadsheets.values.batchUpdate({ spreadsheetId: id, requestBody: { valueInputOption: 'RAW', data: [
    { range: 'Business_Intake!G63:G104', values: Array.from({ length: 42 }, () => ['staged']) },
    { range: 'World_Config!B' + hw, values: [[186]] }, { range: 'Business_Ledger!D40', values: [['Downtown']] } ] } });
  console.log('damaged: G63:G104 staged, mark 186 (row ' + hw + '), D40 Downtown');
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"
echo "== 4. dry, no --recover"; node $D --target bench --apply 2>&1 | grep -v "injected env" | tail -4
echo "== 5. recover"; node $D --target bench --apply --recover 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT recover"; exit 8; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed"; exit 7; }
bench_edit() {   # bench_edit <js body using api, id, ledgerSheetId, hw>
  node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const id = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })).data;
  if (m.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  const ledgerSheetId = m.sheets.find(s => s.properties.title === 'Business_Ledger').properties.sheetId;
  const wc = (await api.spreadsheets.values.get({ spreadsheetId: id, range: 'World_Config!A:A' })).data.values;
  const hw = wc.findIndex(r => String(r[0]).trim() === 'bizIdHighWater') + 1;
  $1
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | grep -v "injected env"
}
echo "== 6. un-land (bench only): the processor never ran — ledger rows 182..284 deleted, mark 186, G2:G104 staged, D40 Downtown"
bench_edit "
  await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ deleteDimension: { range: { sheetId: ledgerSheetId, dimension: 'ROWS', startIndex: 181, endIndex: 284 } } }] } });
  await api.spreadsheets.values.batchUpdate({ spreadsheetId: id, requestBody: { valueInputOption: 'RAW', data: [
    { range: 'Business_Intake!G2:G104', values: Array.from({ length: 103 }, () => ['staged']) },
    { range: 'World_Config!B' + hw, values: [[186]] }, { range: 'Business_Ledger!D40', values: [['Downtown']] } ] } });
  console.log('un-landed: rows 182..284 deleted, G2:G104 staged, mark 186 (row ' + hw + '), D40 Downtown');"
echo "== 7. an old row edited since the fresh run (E10 +1) → restage must refuse"
bench_edit "
  const v = (await api.spreadsheets.values.get({ spreadsheetId: id, range: 'Business_Ledger!E10', valueRenderOption: 'UNFORMATTED_VALUE' })).data.values[0][0];
  await api.spreadsheets.values.update({ spreadsheetId: id, range: 'Business_Ledger!E10', valueInputOption: 'RAW', requestBody: { values: [[Number(v) + 1]] } });
  require('fs').writeFileSync('$TMP.e10', String(v)); console.log('E10 ' + v + ' → ' + (Number(v) + 1));"
node $D --target bench --apply 2>&1 | grep -v "injected env" | grep -E "^FAIL|^mode|^STOP"; [ ${PIPESTATUS[0]} -eq 2 ] || { echo "HALT restage did not refuse the edited old row"; exit 9; }
bench_edit "
  const v = require('fs').readFileSync('$TMP.e10', 'utf8');
  await api.spreadsheets.values.update({ spreadsheetId: id, range: 'Business_Ledger!E10', valueInputOption: 'RAW', requestBody: { values: [[Number(v)]] } });
  console.log('E10 back to ' + v);"
echo "waiting 65 s: steps 4-7 spent the minute's read quota (drill2 run 1: the processor's first read failed)"; sleep 65
echo "== 8. restage"; node $D --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT restage"; exit 10; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed"; exit 7; }
echo "DRILL DONE"
