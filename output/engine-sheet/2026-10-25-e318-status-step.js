// engine.318 data step: Citizen_Usage_Intake rows the old positional reader marked in column E (Reporter) carry no Status mark.
// Under the by-name reader they would read pending and land a second time. Status := 'processed' on exactly the rows where
// Status is blank and Reporter reads 'processed' (the old reader's own mark) — nothing else is written.
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> freeze   read-only: the whole tab + the row manifest
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> apply    every manifest row re-matched, then one batch write
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> verify   typed read-back: manifest Status = 'processed',
//                                                                                  every other cell of the tab = the freeze
// bench = SANDBOX 1004 (title-guarded); live = the sheet the engine code pins (DEFAULT_SIM_SSID), env must agree. Live apply
// only on the builder's go.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const PINNED_LIVE = (fs.readFileSync('/root/GodWorld/utilities/utilityFunctions.js', 'utf8').match(/DEFAULT_SIM_SSID = '([^']+)'/) || [])[1];
const HEADER = ['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter', 'Status'];
const TAB = 'Citizen_Usage_Intake';
const [target, mode] = process.argv.slice(2);
if (!['bench', 'live'].includes(target) || !['freeze', 'apply', 'verify'].includes(mode)) throw new Error('usage: <bench|live> <freeze|apply|verify>');
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-' + target + '.json';
const cell = (r, k) => (r[k] === undefined ? '' : r[k]);
const widen = (rows) => rows.map(r => HEADER.map((_, k) => cell(r, k)));
(async () => {
  let ID;
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  if (target === 'bench') {
    ID = BENCH;
    const t = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
    if (t !== BENCH_TITLE) throw new Error('not the bench: ' + t);
  } else {
    ID = process.env.GODWORLD_SHEET_ID;
    if (!ID || !PINNED_LIVE || ID !== PINNED_LIVE || ID === BENCH) throw new Error('env sheet is not the live sheet the engine code pins — stop');
  }
  const read = async () => ((await api.spreadsheets.values.get({ spreadsheetId: ID, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []);
  const tab = await read();
  if (JSON.stringify(tab[0]) !== JSON.stringify(HEADER)) throw new Error('header is not ' + HEADER.join(', ') + ': ' + JSON.stringify(tab[0]));
  const iN = 0, iR = 4, iS = 5;

  if (mode === 'freeze') {
    // live: one freeze per apply. bench: each run starts from a fresh reset, so a refreeze replaces the last run's file.
    if (target === 'live' && fs.existsSync(OUT) && JSON.parse(fs.readFileSync(OUT, 'utf8')).applied) throw new Error(OUT + ' records an apply — not refrozen');
    const rows = widen(tab.slice(1));
    const manifest = [];
    rows.forEach((r, k) => { if (String(r[iN]).trim() && r[iS] === '' && r[iR] === 'processed') manifest.push({ row: k + 2, cells: r }); });
    fs.writeFileSync(OUT, JSON.stringify({ target, sheet: ID.slice(0, 6) + '…', frozenAt: new Date().toISOString(), rows: rows.length, manifest, tab: rows }));
    console.log(target + ' frozen: ' + rows.length + ' rows; Status blank with Reporter processed: ' + manifest.length +
      '; Status processed ' + rows.filter(r => r[iS] === 'processed').length + '; other Status ' + rows.filter(r => r[iS] !== '' && r[iS] !== 'processed').length +
      '; Status blank, Reporter not processed (would read pending) ' + rows.filter(r => String(r[iN]).trim() && r[iS] === '' && r[iR] !== 'processed').length + ' → ' + OUT);
    return;
  }
  const F = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const now = widen(tab.slice(1));
  if (mode === 'apply') {
    if (F.applied) throw new Error('already applied ' + F.applied);
    if (now.length !== F.rows) throw new Error('row count moved since the freeze: ' + F.rows + ' → ' + now.length + ' — refreeze');
    const moved = F.tab.map((r, k) => (JSON.stringify(r) === JSON.stringify(now[k]) ? null : k + 2)).filter(Boolean);
    if (moved.length) throw new Error('rows changed since the freeze: ' + moved.slice(0, 10).join(', ') + ' — refreeze, nothing written');
    if (!F.manifest.length) { console.log('manifest empty — nothing to write'); return; }
    await api.spreadsheets.values.batchUpdate({ spreadsheetId: ID, requestBody: { valueInputOption: 'RAW',
      data: F.manifest.map(m => ({ range: TAB + '!F' + m.row, values: [['processed']] })) } });
    F.applied = new Date().toISOString();
    fs.writeFileSync(OUT, JSON.stringify(F));
    console.log(target + ' applied: Status := processed on ' + F.manifest.length + ' rows; run verify');
    return;
  }
  // verify
  const fails = [];
  if (now.length !== F.rows) fails.push('row count ' + F.rows + ' → ' + now.length);
  const want = F.tab.map(r => r.slice());
  F.manifest.forEach(m => { want[m.row - 2][iS] = 'processed'; });
  for (let k = 0; k < Math.min(want.length, now.length); k++) {
    for (let c = 0; c < HEADER.length; c++) {
      if (now[k][c] !== want[k][c] || typeof now[k][c] !== typeof want[k][c]) fails.push('row ' + (k + 2) + ' ' + HEADER[c] + ': ' + JSON.stringify(now[k][c]) + ' (want ' + JSON.stringify(want[k][c]) + ')');
    }
  }
  const pendingNow = now.filter(r => String(r[iN]).trim() && r[iS] !== 'processed').length;
  console.log(target + ' verify: ' + F.manifest.length + ' manifest rows, ' + now.length + ' rows; rows the by-name reader would take as pending: ' + pendingNow +
    (fails.length ? '\nFAIL ' + fails.length + ':\n  ' + fails.slice(0, 20).join('\n  ') : '\nPASS — every manifest Status reads processed, every other cell = the freeze'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
