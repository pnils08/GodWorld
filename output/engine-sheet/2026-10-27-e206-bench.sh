#!/bin/bash
# engine.206 cut 2 bench (the streak bar) on the exact candidate. SANDBOX 1004, the engine.320 prep (BASELINE-1004-C112b +
# marital migration + GC header + the engine.318 Status step + probe2 lay --neutral), C113. The baseline feed carries one
# C113 Oaks row: H:W, Streak W2.
#   leg A = engine.320's N6 (stage 30, same prep, same seed) — not re-fired; receipts 2026-10-26-e319-r2-N6.json
#   S5 = stage 31, the bar absent (the self-arm writes 5): probe2 compare N6 S5 equal; no SPORTS_WEEK ripple, no streak seed
#   S2 = stage 31, bench World_Config sportsStreakHeadline = 2 written before the fire: one Oaks SPORTS_WEEK ripple at the
#        week's own magnitude ("— 2 straight wins") + exactly one ECONOMIC streak seed
# End: bench code = stage 30 (= PROD @166); data left at C113 (leg S2).
#   usage: 2026-10-27-e206-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet
SP=/tmp/claude-0/-root-GodWorld/e5ce7cec-51bf-49aa-bafe-2ec13a27caf3/scratchpad
TMP=$SP/e206fire.$$
SRC=${1:?commit}
awk '/^(reset_leg|drop_tab)\(\) \{/{f=1} f{print} f&&/^}$/{f=0} /^wait_cut\(\) \{/{print}' $O/2026-10-22-e308-bench.sh > $SP/e206-fns.sh
bash -n $SP/e206-fns.sh && source $SP/e206-fns.sh && type reset_leg wait_cut >/dev/null || { echo "HALT bench helpers did not load"; exit 9; }
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
step() { node "$@" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT $*"; exit 3; }; }
CODE=stage31
trap '[ "$CODE" = "stage30" ] || echo "BENCH LEFT: script = stage 31 at $SRC; restore: bash $O/2026-10-27-push-e206-bench.sh stage30"' EXIT
prep() { reset_leg
  step $O/2026-10-25-e318-status-step.js bench freeze
  step $O/2026-10-25-e318-status-step.js bench apply --expect 105
  step $O/2026-10-25-e318-status-step.js bench verify
  step $O/2026-10-26-e319-probe2.js lay "$1" --neutral; }
setbar() {   # the leg's bar, written as a typed row the self-arm keeps (bench only, title-guarded)
  BAR="$1" node -e "
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const t = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
  if (t !== TITLE || ID === process.env.GODWORLD_SHEET_ID) throw new Error('target check failed');
  const wc = (await api.spreadsheets.values.get({ spreadsheetId: ID, range: 'World_Config!A1:C400' })).data.values || [];
  if (wc.some(r => r[0] === 'sportsStreakHeadline')) throw new Error('key already present after reset');
  await api.spreadsheets.values.append({ spreadsheetId: ID, range: 'World_Config!A1:C1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [['sportsStreakHeadline', Number(process.env.BAR), 'engine.206 bench leg bar']] } });
  const back = ((await api.spreadsheets.values.get({ spreadsheetId: ID, range: 'World_Config!A1:C400', valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []).filter(r => r[0] === 'sportsStreakHeadline');
  if (back.length !== 1 || back[0][1] !== Number(process.env.BAR)) throw new Error('bar write did not read back: ' + JSON.stringify(back));
  console.log('bench World_Config sportsStreakHeadline = ' + back[0][1]);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });" 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT setbar $1"; exit 6; }; }
fire() {   # fire <leg>
  wait_cut
  local t0=$(date +%s)
  node $O/2026-10-19-benchfire.js 112 "e206$1" > $TMP 2>&1; local rc=$?
  local v=$(grep -o '"verdict": "[^"]*"' $TMP | head -1)
  echo "leg $1 C113 fire rc=$rc $v $(grep -o '"wallS": [0-9]*' $TMP) ($(( $(date +%s) - t0 )) s)"
  [ $rc -eq 0 ] && echo "$v" | grep -q '"PASS"' || { echo "HALT fire leg $1"; grep -v "injected env" $TMP | tail -40; exit 2; }
}
echo "== engine.206 cut 2 bench, candidate $SRC"
bash $O/2026-10-27-push-e206-bench.sh "$SRC" $O/stage31-e206.sha256 || exit 4; CUT=$(date +%s)
echo "== leg S5 (stage 31, the self-armed bar 5)"
prep S5; fire S5
step $O/2026-10-26-e319-probe2.js check S5
step $O/2026-10-26-e319-probe2.js compare N6 S5
step $O/2026-10-27-e206-check.js S5 --bar 5
echo "== leg S2 (stage 31, bench bar 2 — the baseline's W2 Oaks week reaches the business desk)"
prep S2; setbar 2; fire S2
step $O/2026-10-26-e319-probe2.js check S2
node $O/2026-10-26-e319-probe2.js compare N6 S2 2>&1 | grep -v "injected env" | tail -6
step $O/2026-10-27-e206-check.js S2 --bar 2 --expect-headline
echo "== restore bench code to stage 30 (= PROD)"
bash $O/2026-10-27-push-e206-bench.sh stage30 && CODE=stage30 || { echo "HALT restore to stage 30 failed"; exit 8; }
echo "engine.206 bench done"
