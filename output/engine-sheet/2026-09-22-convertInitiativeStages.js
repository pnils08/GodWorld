// civic.38 Task 4 step 4 runner — six-row legacy conversion through lib/sheets.js.
// Usage: node convertStages.js --sheet-id=<id> --cycle=<N> [--apply]
require('/root/GodWorld/lib/env');
const argv = process.argv.slice(2);
const arg = (k, d) => { const m = argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const SHEET = arg('sheet-id', null); const CYCLE = Number(arg('cycle', NaN)); const APPLY = argv.includes('--apply');
if (!SHEET || !Number.isInteger(CYCLE)) { console.error('need --sheet-id= and --cycle='); process.exit(2); }
process.env.GODWORLD_SHEET_ID = SHEET; // AFTER lib/env (DEPLOY trap 1/2b)
const s = require('/root/GodWorld/lib/sheets');
const C = require('/root/GodWorld/lib/initiativePhaseContract');
(async () => {
  console.log('target sheet:', process.env.GODWORLD_SHEET_ID, '| cycle', CYCLE, '| apply', APPLY);
  const data = await s.getSheetData('Initiative_Tracker');
  const headers = data[0];
  const missing = C.STAGE_COLUMNS.filter(h => headers.indexOf(h) === -1);
  console.log('tracker cols', headers.length, '| missing stage cols:', missing.length ? missing.join(',') : 'none');
  if (missing.length) {
    if (missing.length !== C.STAGE_COLUMNS.length) throw new Error('partial stage header — refuse: ' + missing.join(','));
    console.log(APPLY ? 'arming stage columns at col ' + (headers.length + 1) : '[dry] would arm stage columns at col ' + (headers.length + 1));
    const client = await s.getClient();
    const meta = await client.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties' });
    const gp = meta.data.sheets.find(x => x.properties.title === 'Initiative_Tracker').properties.gridProperties;
    const need = headers.length + C.STAGE_COLUMNS.length;
    console.log('grid columnCount', gp.columnCount, '| needed', need, gp.columnCount < need ? '(will widen)' : '(no resize)');
    if (APPLY) { if (gp.columnCount < need) await s.resizeSheet('Initiative_Tracker', need, null); await s.appendColumns('Initiative_Tracker', 1, headers.length, C.STAGE_COLUMNS); }
  }
  const rows = await s.getSheetAsObjects('Initiative_Tracker');
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const id = String(r.InitiativeID || '').trim();
    if (!(id in C.LEGACY_STAGE_CONVERSION)) { console.log(id, '— not in the table, skipped'); continue; }
    const u = C.legacyStageConversion(r, CYCLE);
    if (!u) { console.log(id, '— no change (' + (C.LEGACY_STAGE_CONVERSION[id].stage ? 'already staged' : 'left unstaged by ruling') + ')'); continue; }
    n++;
    console.log(id, '→', JSON.stringify(Object.assign({}, u, { MilestoneNotes: u.MilestoneNotes.slice(-160) })));
    if (APPLY) { const res = await s.updateRowFields('Initiative_Tracker', i + 2, u); console.log('   wrote', res.map(x => x.range).join(' ')); }
  }
  console.log((APPLY ? 'WROTE ' : '[dry] would write ') + n + ' row(s)');
  if (APPLY) {
    const back = await s.getSheetAsObjects('Initiative_Tracker');
    for (const r of back) if (r.InitiativeID in C.LEGACY_STAGE_CONVERSION) console.log('readback', r.InitiativeID, '| Status', r.Status, '| MA', r.MayoralAction, r.MayoralActionCycle, '| Vote', JSON.stringify(r.VoteCycle), '| Stage', JSON.stringify(r.Stage), '| LSC', r.LastStageChangeCycle);
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
