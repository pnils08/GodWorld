#!/bin/bash
# engine.308 bench (plan §engine.308 design + builder 2026-10-22 numbers): SANDBOX 1004 from the B start (BASELINE-1004-C112b reset + the
# 103 rows and the realign via 2026-10-21-e306-intake.js --target bench --apply) = the engine.307 B legs' start.
#   H<n> = stage 20 (PROD @157: stage 19 + the 4 engine.307 files) with generationalWealthEngine.js at <commit> — the other three files are
#   byte-identical to 7f49f3db, so the build is stage 19 + the 4 files at <commit>. C113 fire, then a three-Cycle roll (C114–C116).
# Control = B14 (stage 20) C113–C116, read on the bench before this leg by 2026-10-22-e308-check.js 116 ctl --from 113: Varek opened
# Varek Fellowship at C113 (3 firms, 1 cycle after Varek Systems) — the case engine.308 closes. After each fire: the e308 heritage
# receipt (halts on any opening over the cap, inside the cooldown, by a staker at 2 firms, or by Varek) and the e307 check (the
# athlete guard still holds). End: bench code restored to stage 20 (manifest must equal stage19-e307-B14.sha256), intake tab deleted,
# bench data left on the leg's C116. Halts on the first non-PASS.
#   usage: 2026-10-22-e308-bench.sh <commit> [<label>]   (label default H1)
set -uo pipefail
cd /root/GodWorld

O=output/engine-sheet
FILES="phase05-citizens/runCareerEngine.js phase05-citizens/generationalWealthEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js"
SP=/tmp/claude-0/-root-GodWorld/a725df2c-536e-4a81-bd5c-126e074e188f/scratchpad
TMP=$SP/e308fire.$$
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
wait_cut() { local left=$(( 300 - ($(date +%s) - CUT) )); [ $left -gt 0 ] && { echo "version cut; waiting $left s more for /exec propagation"; sleep $left; }; }
SRC=${1:?commit}; L=${2:-H1}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect> <label>
  node $O/2026-10-19-benchfire.js $1 "e308$2" > $TMP 2>&1; local rc=$?
  echo "leg $2 C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $2"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
echo "== leg $L (stage 20 + engine.308 at $SRC, the 103 rows + realign)"
for f in phase05-citizens/runCareerEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js; do
  git diff --quiet 7f49f3db "$SRC" -- $f || { echo "HALT $f differs from stage 20 at $SRC"; exit 4; }
done
bash $O/2026-10-22-push-e307-bench.sh "$SRC" $O/stage20-e308-$L.sha256 "$FILES" d86cdaeb^ || exit 4   # base = stage 19; the 4 files at $SRC = stage 20 + engine.308
CUT=$(date +%s)
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
wait_cut
fire 112 $L
node $O/2026-10-21-e306-readers.js 113 $L 2>&1 | grep -v "injected env" || exit 3
node $O/2026-10-21-e306-spots.js 113 $L 2>&1 | grep -v "injected env" || exit 3
node $O/2026-10-22-e307-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C113"; exit 3; }
node $O/2026-10-22-e308-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C113"; exit 3; }
for c in 113 114 115; do
  fire $c $L
  node $O/2026-10-22-e307-check.js $(( c + 1 )) $L $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C$(( c + 1 ))"; exit 3; }
  node $O/2026-10-22-e308-check.js $(( c + 1 )) $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e308 check C$(( c + 1 ))"; exit 3; }
done
drop_tab Business_Intake
echo "== restore bench code to stage 20"
bash $O/2026-10-22-push-e307-bench.sh 7f49f3db $SP/stage20-restore-e308.sha256 "$FILES" d86cdaeb^ || exit 4
cmp -s $SP/stage20-restore-e308.sha256 $O/stage19-e307-B14.sha256 && echo "bench code = stage 20 manifest" || { echo "HALT restore manifest != stage19-e307-B14.sha256"; exit 8; }
echo "engine.308 bench done"
