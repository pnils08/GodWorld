// engine.318 data step: Citizen_Usage_Intake rows the old positional reader marked in column E (Reporter) carry no Status mark.
// Under the by-name reader they would read pending and land a second time. Status := 'processed' on exactly the rows where
// Status is blank and Reporter reads 'processed' (the old reader's own mark) — nothing else is written.
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> freeze           read-only: the whole tab (every returned
//                                                         cell, past F too) + the row manifest, also listed in …-manifest.txt
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> apply --expect N  refuses unless the manifest holds exactly
//                                                         N rows, no other row reads pending by name, and every cell = the freeze;
//                                                         then one batch write
//   node output/engine-sheet/2026-10-25-e318-status-step.js <bench|live> verify           typed read-back: manifest Status =
//                                                         'processed', every other cell = the freeze, 0 rows pending by name
// (codex engine.318 diff gate §2 folded: expected-count gate, full-width compare, verify fails on a pending row.) The window
// between verify and the push is guarded by push-e318-prod.sh: the Cycle must not move and 0 rows may read pending by name at
// each of its three reads.
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
if (!['bench', 'live'].includes(target) || !['freeze', 'apply', 'verify'].includes(mode)) throw new Error('usage: <bench|live> <freeze|apply --expect N|verify>');
const EXPECT = process.argv.includes('--expect') ? Number(process.argv[process.argv.indexOf('--expect') + 1]) : NaN;
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-' + target + '.json';
const cell = (r, k) => (r[k] === undefined ? '' : r[k]);
const widthOf = (rows) => Math.max(HEADER.length, ...rows.map(r => r.length));
const widen = (rows, w) => rows.map(r => { const o = []; for (let k = 0; k < w; k++) o.push(cell(r, k)); return o; });
const pendingByName = (rows) => rows.filter(r => String(r[0]).trim() && r[5] !== 'processed').length;
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
    const width = widthOf(tab), rows = widen(tab.slice(1), width);
    const manifest = [];
    rows.forEach((r, k) => { if (String(r[iN]).trim() && r[iS] === '' && r[iR] === 'processed') manifest.push({ row: k + 2, cells: r }); });
    const otherPending = pendingByName(rows) - manifest.length;
    const pastF = rows.filter(r => r.slice(HEADER.length).some(v => v !== '')).length;
    fs.writeFileSync(OUT, JSON.stringify({ target, sheet: ID.slice(0, 6) + '…', frozenAt: new Date().toISOString(), rows: rows.length, width, otherPending, pastF, manifest, tab: rows }));
    fs.writeFileSync(OUT.replace(/\.json$/, '-manifest.txt'), 'row\tCitizenName\tPOPID\tUsageType\tContext\tReporter\tStatus\n' +
      manifest.map(m => [m.row].concat(m.cells.slice(0, HEADER.length)).join('\t')).join('\n') + '\n');
    console.log(target + ' frozen: ' + rows.length + ' rows, width ' + width + ' (rows with cells past F: ' + pastF + '); manifest (Status blank, Reporter processed) ' + manifest.length +
      (manifest.length ? ' = rows ' + manifest[0].row + '..' + manifest[manifest.length - 1].row : '') + '; Status processed ' + rows.filter(r => r[iS] === 'processed').length +
      '; other Status ' + rows.filter(r => r[iS] !== '' && r[iS] !== 'processed').length + '; pending by name outside the manifest ' + otherPending + ' → ' + OUT);
    return;
  }
  const F = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  // A freeze written before the full-width fold carries no width: W would be NaN and every cell compare would be skipped.
  if (!Number.isInteger(F.width) || F.width < HEADER.length) throw new Error(OUT + ' carries no width (written before the full-width compare) — refreeze');
  // Codex recheck 3 §3: the freeze's own shape, before any write — every frozen row present at its width, every manifest row
  // inside the tab and equal to its frozen row (a freeze that lost a tab row would otherwise let apply write a row it never compared).
  const shapeBad = !Number.isInteger(F.rows) || !Array.isArray(F.tab) || F.tab.length !== F.rows || F.tab.some(r => !Array.isArray(r) || r.length !== F.width) ||
    !Array.isArray(F.manifest) || F.manifest.some(m => !Number.isInteger(m.row) || m.row < 2 || m.row > F.rows + 1 || JSON.stringify(m.cells) !== JSON.stringify(F.tab[m.row - 2]));
  if (shapeBad) throw new Error(OUT + ' freeze shape is not coherent (rows / tab / width / manifest) — refreeze, nothing written');
  const W = Math.max(F.width, widthOf(tab));
  const now = widen(tab.slice(1), W), frozen = widen(F.tab, W);
  if (mode === 'apply') {
    if (F.applied) throw new Error('already applied ' + F.applied);
    if (!(EXPECT >= 0) || F.manifest.length !== EXPECT) throw new Error('manifest holds ' + F.manifest.length + ' rows, --expect ' + EXPECT + ' — nothing written');
    if (F.otherPending !== 0) throw new Error(F.otherPending + ' rows outside the manifest read pending by name — the step does not cover them; nothing written');
    if (now.length !== F.rows) throw new Error('row count moved since the freeze: ' + F.rows + ' → ' + now.length + ' — refreeze');
    const moved = frozen.map((r, k) => (JSON.stringify(r) === JSON.stringify(now[k]) ? null : k + 2)).filter(Boolean);
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
  const want = frozen.map(r => r.slice());
  F.manifest.forEach(m => { want[m.row - 2][iS] = 'processed'; });
  for (let k = 0; k < Math.min(want.length, now.length); k++) {
    for (let c = 0; c < W; c++) {
      if (now[k][c] !== want[k][c] || typeof now[k][c] !== typeof want[k][c]) fails.push('row ' + (k + 2) + ' ' + (HEADER[c] || 'col ' + (c + 1)) + ': ' + JSON.stringify(now[k][c]) + ' (want ' + JSON.stringify(want[k][c]) + ')');
    }
  }
  const pendingNow = pendingByName(now);
  if (pendingNow !== 0) fails.push(pendingNow + ' rows read pending by name');
  console.log(target + ' verify: ' + F.manifest.length + ' manifest rows, ' + now.length + ' rows; rows the by-name reader would take as pending: ' + pendingNow +
    (fails.length ? '\nFAIL ' + fails.length + ':\n  ' + fails.slice(0, 20).join('\n  ') : '\nPASS — every manifest Status reads processed, every other cell = the freeze'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
