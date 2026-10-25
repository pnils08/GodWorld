// engine.312 bench probe (BENCH ONLY), after a reset to BASELINE-1004-C112b. Two halves:
//   replay — the baseline predates the Saturday 10-24 print run, so it holds 0 pending Citizen_Media_Usage rows and C113 would
//            credit no paper. Copy live's pending C112 rows (Processed blank, read-only on live) onto the bench tab verbatim, so the
//            bench's C113 Phase 5 sees exactly what a live Cycle with engine.312 would (the printed C112 namings + bylines).
//   media-room — one Citizen_Usage_Intake row for a citizen with a Cultural_Ledger row, laid out as processCitizenUsageIntake_
//            reads it (name, type, context, reporter, status): C113's Phase 11 copies it with Source 'media-room', C114's Phase 5
//            processes it and must credit nothing (R2.1 a).
// Refuses any sheet whose title is not the bench. Dry run without --apply; reads both tabs back after the write.
// Writes output/engine-sheet/2026-10-25-e312-probe.json (the probe citizen, the replayed row count) for the receipt.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
if (LIVE === ID) throw new Error('env points at the bench; live must be the read source');
const apply = process.argv.includes('--apply');
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-25-e312-probe.json';
const PROBE_CONTEXT = 'e312 bench probe: media-room copy';
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const get = async (id, range) => ((await api.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []);
  const m = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data;
  if (m.properties.title !== TITLE) throw new Error('not the bench: ' + m.properties.title);

  const live = await get(LIVE, 'Citizen_Media_Usage');
  const bench = await get(ID, 'Citizen_Media_Usage');
  const lh = live[0], bh = bench[0];
  if (lh.join('|') !== bh.join('|')) throw new Error('header differs live vs bench:\n' + lh.join('|') + '\n' + bh.join('|'));
  const iP = lh.indexOf('Processed'), iC = lh.indexOf('Cycle');
  const pend = live.slice(1).filter(r => String(r[iP] || '') !== 'Y' && String(r[2] || '').trim() && Number(r[iC]) === 112)
    .map(r => lh.map((_, k) => (r[k] === undefined ? '' : r[k])));
  const benchPend = bench.slice(1).filter(r => String(r[iP] || '') !== 'Y' && String(r[2] || '').trim()).length;
  if (benchPend) throw new Error('bench already holds ' + benchPend + ' pending usage rows — reset first');

  const cul = await get(ID, 'Cultural_Ledger'), ch = cul[0];
  const led = await get(ID, 'Simulation_Ledger'), xh = led[0];
  const iU = ch.indexOf('UniverseLinks'), iN = ch.indexOf('Name'), iF = ch.indexOf('FameScore'), iCat = ch.indexOf('FameCategory');
  const iPop = xh.indexOf('POPID'), iFi = xh.indexOf('First'), iLa = xh.indexOf('Last');
  const count = {}; led.slice(1).forEach(r => { const k = (String(r[iFi] || '') + ' ' + String(r[iLa] || '')).trim(); count[k] = (count[k] || 0) + 1; });
  const named = {}; led.slice(1).forEach(r => { named[String(r[iPop] || '').toUpperCase()] = (String(r[iFi] || '') + ' ' + String(r[iLa] || '')).trim(); });
  const pick = cul.slice(1).find(r => { const p = String(r[iU] || '').toUpperCase(); const n = named[p];
    return p.startsWith('POP-') && n && count[n] === 1 && String(r[iCat] || '').toLowerCase() !== 'dynasty' && Number(r[iF]) > 5 && Number(r[iF]) < 90; });
  if (!pick) throw new Error('no probe citizen');
  const probe = { name: named[String(pick[iU]).toUpperCase()], popId: String(pick[iU]).toUpperCase(), culName: pick[iN], context: PROBE_CONTEXT };
  const intakeRow = [probe.name, 'mentioned', PROBE_CONTEXT, 'engine-sheet bench probe', ''];
  console.log('replay: ' + pend.length + ' live pending C112 rows → bench; media-room probe: ' + JSON.stringify(probe));
  if (!apply) { console.log('dry run — nothing written'); return; }

  await api.spreadsheets.values.append({ spreadsheetId: ID, range: 'Citizen_Media_Usage!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: pend } });
  await api.spreadsheets.values.append({ spreadsheetId: ID, range: 'Citizen_Usage_Intake!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [intakeRow] } });
  const after = await get(ID, 'Citizen_Media_Usage');
  const nowPend = after.slice(1).filter(r => String(r[iP] || '') !== 'Y' && String(r[2] || '').trim()).length;
  const intake = await get(ID, 'Citizen_Usage_Intake');
  const landed = intake.slice(1).filter(r => r[0] === probe.name && r[2] === PROBE_CONTEXT && String(r[4] || '') !== 'processed').length;
  if (nowPend !== pend.length || landed !== 1) throw new Error('read-back: pending ' + nowPend + ' (want ' + pend.length + '), intake probe rows ' + landed);
  fs.writeFileSync(OUT, JSON.stringify({ replayed: pend.length, probe }, null, 1));
  console.log('read back: bench pending usage ' + nowPend + ', intake probe 1; wrote ' + OUT);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
