// engine.318 bench probe (BENCH ONLY, title-guarded), after reset_leg and the bench Status step.
//   lay   — one pending Citizen_Usage_Intake row under the live header, POPID filled the way the retired Node writer filled it:
//           [an Active ledger citizen with a unique name, their POPID, 'mentioned', 'engine.318 bench probe', 'Maria Keen', ''].
//           The old positional reader would land UsageType = the POPID; the by-name reader lands 'mentioned'. Snapshot of the whole
//           intake tab + the Citizen_Media_Usage row count → output/engine-sheet/2026-10-25-e318-probe.json.
//   check <cycle> — after the fire: exactly one new usage row in all, media-room, carrying the probe's name / type / context / reporter;
//           the probe's Status 'processed' and Reporter unchanged; every other intake cell = the snapshot; no usage row at <cycle>
//           typed with a POPID; no Engine_Errors row at <cycle> naming the media intake. Exit 1 on any miss.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-probe.json';
const HEADER = ['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter', 'Status'];
const CONTEXT = 'engine.318 bench probe', REPORTER = 'Maria Keen';
const [mode, Cs] = process.argv.slice(2);
const widen = (rows, w) => rows.map(r => { const o = []; for (let k = 0; k < w; k++) o.push(r[k] === undefined ? '' : r[k]); return o; });
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const t = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
  if (t !== TITLE) throw new Error('not the bench: ' + t);
  const get = async (range) => ((await api.spreadsheets.values.get({ spreadsheetId: ID, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []);
  const intake = await get('Citizen_Usage_Intake');
  if (JSON.stringify(intake[0]) !== JSON.stringify(HEADER)) throw new Error('intake header is not the live one: ' + JSON.stringify(intake[0]));
  const usage = await get('Citizen_Media_Usage');

  if (mode === 'lay') {
    const pending = intake.slice(1).filter(r => String(r[0] || '').trim() && r[5] !== 'processed').length;
    if (pending) throw new Error(pending + ' intake rows read pending by name — run the Status step first');
    const led = await get('Simulation_Ledger'), h = led[0];
    const iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last'), iS = h.indexOf('Status');
    const nm = r => (String(r[iF] || '') + ' ' + String(r[iL] || '')).trim();
    const count = {}; led.slice(1).forEach(r => { count[nm(r)] = (count[nm(r)] || 0) + 1; });
    const pick = led.slice(1).find(r => String(r[iS]) === 'Active' && /^POP-\d+$/.test(String(r[iP])) && String(r[iF] || '').trim() && String(r[iL] || '').trim() && count[nm(r)] === 1);
    if (!pick) throw new Error('no Active citizen with a unique name');
    const row = [nm(pick), String(pick[iP]), 'mentioned', CONTEXT, REPORTER, ''];
    await api.spreadsheets.values.update({ spreadsheetId: ID, range: 'Citizen_Usage_Intake!A' + (intake.length + 1), valueInputOption: 'RAW', requestBody: { values: [row] } });
    const after = await get('Citizen_Usage_Intake');
    const back = widen([after[intake.length]], 6)[0];
    if (JSON.stringify(back) !== JSON.stringify(row)) throw new Error('probe read back ' + JSON.stringify(back));
    fs.writeFileSync(OUT, JSON.stringify({ probe: row, probeRow: intake.length + 1, intake: widen(after, 6), usageRows: usage.length }));
    console.log('probe laid at row ' + (intake.length + 1) + ': ' + JSON.stringify(row) + '; usage rows ' + (usage.length - 1));
    return;
  }
  if (mode !== 'check' || !(Number(Cs) > 112)) throw new Error('usage: lay | check <cycle>');
  const C = Number(Cs), S = JSON.parse(fs.readFileSync(OUT, 'utf8')), fails = [];
  const now = widen(intake, 6);
  if (now.length !== S.intake.length) fails.push('intake rows ' + (S.intake.length - 1) + ' → ' + (now.length - 1));
  for (let k = 1; k < Math.min(now.length, S.intake.length); k++) {
    for (let c = 0; c < 6; c++) {
      const want = (k === S.probeRow - 1 && c === 5) ? 'processed' : S.intake[k][c];
      if (now[k][c] !== want) fails.push('intake row ' + (k + 1) + ' ' + HEADER[c] + ': ' + JSON.stringify(now[k][c]) + ' (want ' + JSON.stringify(want) + ')');
    }
  }
  const uh = usage[0], col = n => { const i = uh.indexOf(n); if (i < 0) throw new Error('usage: no ' + n + ' column'); return i; };
  const iC = col('Cycle'), iN = col('CitizenName'), iT = col('UsageType'), iX = col('Context'), iR = col('Reporter'), iSrc = col('Source');
  const added = usage.slice(S.usageRows);
  const media = added.filter(r => r[iSrc] === 'media-room');
  if (media.length !== 1) fails.push('media-room rows landed: ' + media.length + ' (want 1)');
  if (added.length !== 1) fails.push('usage rows added in all: ' + added.length + ' (want 1 — codex engine.318 §3)');
  const m = media[0] || [];
  const got = [m[iN], m[iT], m[iX], m[iR], Number(m[iC])], want = [S.probe[0], 'mentioned', CONTEXT, REPORTER, C];
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push('media-room row ' + JSON.stringify(got) + ' (want ' + JSON.stringify(want) + ')');
  const popTyped = usage.slice(1).filter(r => Number(r[iC]) === C && /^POP-/.test(String(r[iT]))).length;
  if (popTyped) fails.push(popTyped + ' usage rows at C' + C + ' typed with a POPID');
  const ee = await get('Engine_Errors'), eh = ee[0], eC = eh.indexOf('Cycle');
  const eAt = ee.slice(1).filter(r => Number(String(r[eC]).replace(/^C/, '')) === C);
  const eMedia = eAt.filter(r => /MediaIntake|Citizen_Usage_Intake|usageIntake/i.test(r.join(' ')));
  if (eMedia.length) fails.push('Engine_Errors at C' + C + ' naming the media intake: ' + eMedia.length);
  console.log('C' + C + ' probe check: usage rows added ' + added.length + ' (media-room ' + media.length + '), probe Status ' + JSON.stringify(now[S.probeRow - 1][5]) +
    ', Reporter ' + JSON.stringify(now[S.probeRow - 1][4]) + ', Engine_Errors at C' + C + ' ' + eAt.length + ' (media intake ' + eMedia.length + ')' +
    (fails.length ? '\nHOLD ' + fails.length + ':\n  ' + fails.slice(0, 20).join('\n  ') : '\nPASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
