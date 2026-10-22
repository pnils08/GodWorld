#!/bin/bash
# engine.307 bench (plan §engine.307 design, bench watch): SANDBOX 1004 from the B start (BASELINE-1004-C112b reset + the 103 rows and the
# realign via 2026-10-21-e306-intake.js --target bench --apply), the same start as the engine.310 pair's B3 leg (= stage 19, PROD @156).
#   B7 = stage 19 + the 4 engine.307 files at <commit>. C113 fire, then a three-Cycle roll (C114–C116) on the same leg.
# Control = B3 (2026-10-21-e310-pair.sh, readers -B3-c113.json, LifeHistory sha bb0ac98b…) and its bench state read by
# 2026-10-22-e307-check.js as label `ctl` (2026-10-22, before this leg). After each fire: e306 readers + spots (C113) and the e307
# check (every Cycle; halts on an athlete career move). End: bench code restored to stage 19 (manifest must equal stage18-e310-B3.sha256),
# intake tab deleted, bench data left on B7 C116. Reset + shared functions copied from 2026-10-21-e310-pair.sh. Halts on the first non-PASS.
#   usage: 2026-10-22-e307-bench.sh <commit> [probe|roll] [<label>]   (label default B7 / B7p)
# probe (B7p): the B7 roll filled no sports window — the bench pool held no unemployed Small Business candidate. After the intake,
# 2026-10-22-e307-probe-tag.js tags two blank-tag unemployed rows 'Small Business' (bench only), then C113 only, no roll.
set -uo pipefail
cd /root/GodWorld

O=output/engine-sheet
FILES="phase05-citizens/runCareerEngine.js phase05-citizens/generationalWealthEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js"
SP=/tmp/claude-0/-root-GodWorld/a725df2c-536e-4a81-bd5c-126e074e188f/scratchpad
TMP=$SP/e307fire.$$
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
SRC=${1:?commit}; MODE=${2:-}; L=${3:-B7}; [ "$MODE" = probe ] && L=${3:-B7p}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | grep -v "injected env"); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
fire() {   # fire <expect> <label>
  node $O/2026-10-19-benchfire.js $1 "e307$2" > $TMP 2>&1; local rc=$?
  echo "leg $2 C$(( $1 + 1 )) fire rc=$rc $(grep -o '"verdict": "[^"]*"' $TMP | head -1) $(grep -o '"wallS": [0-9]*' $TMP)"
  if [ $rc -ne 0 ]; then echo "HALT leg $2"; grep -v "injected env" $TMP | tail -40; exit 2; fi
}
echo "== leg $L (stage 19 + engine.307 at $SRC, the 103 rows + realign)"
bash $O/2026-10-22-push-e307-bench.sh "$SRC" $O/stage19-e307-$L.sha256 "$FILES" d86cdaeb^ || exit 4   # base = the parent of the first engine.307 commit
CUT=$(date +%s)
reset_leg; drop_tab Business_Intake; drop_tab EA_Diag
echo "waiting 65 s: the reset's write quota clears before the intake writes"; sleep 65
node $O/2026-10-21-e306-intake.js --target bench --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT intake on bench"; exit 6; }
git diff --quiet -- data/employer_mapping.json || { echo "HALT data/employer_mapping.json changed by the bench leg"; exit 7; }
if [ "$MODE" = probe ]; then node $O/2026-10-22-e307-probe-tag.js --apply 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT probe tag"; exit 6; }; fi
wait_cut
fire 112 $L
node $O/2026-10-21-e306-readers.js 113 $L 2>&1 | grep -v "injected env" || exit 3
node $O/2026-10-21-e306-spots.js 113 $L 2>&1 | grep -v "injected env" || exit 3
node $O/2026-10-22-e307-check.js 113 $L 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C113"; exit 3; }
[ "$MODE" = probe ] || for c in 113 114 115; do
  fire $c B7
  node $O/2026-10-22-e307-check.js $(( c + 1 )) B7 B7 2>&1 | grep -v "injected env"; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT e307 check C$(( c + 1 ))"; exit 3; }
done
drop_tab Business_Intake
echo "== restore bench code to stage 19"
bash $O/2026-10-22-push-e307-bench.sh ffad3bf8 $SP/stage19-restore-e307.sha256 "$FILES" ffad3bf8 || exit 4
cmp -s $SP/stage19-restore-e307.sha256 $O/stage18-e310-B3.sha256 && echo "bench code = stage 19 manifest" || { echo "HALT restore manifest != stage18-e310-B3.sha256"; exit 8; }
echo "engine.307 bench done"
