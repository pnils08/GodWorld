// engine.307 bench probe (bench only, never live): the C112 bench pool holds no unemployed Small Business candidate, so the B7 roll
// never filled a sports window. Tags the first two Active ENGINE working-age (18–64) unemployed rows with blank SkillTags as
// 'Small Business' on SANDBOX 1004, reads them back, and writes the picks to output/engine-sheet/2026-10-22-e307-probe-picks.json.
// usage: node 2026-10-22-e307-probe-tag.js --apply
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.argv[2] !== '--apply') throw new Error('usage: --apply');
process.env.GODWORLD_SHEET_ID = BENCH;
const { google } = require('/root/GodWorld/node_modules/googleapis');
const sh = require('/root/GodWorld/lib/sheets');
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data;
  if (m.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench');
  const led = await sh.getSheetData('Simulation_Ledger'), h = led[0], c = n => h.indexOf(n);
  const col = c('SkillTags'); if (col < 0) throw new Error('no SkillTags');
  const A1 = n => { let s = ''; n++; while (n > 0) { const k = (n - 1) % 26; s = String.fromCharCode(65 + k) + s; n = Math.floor((n - 1) / 26); } return s; };
  const picks = [];
  led.slice(1).forEach((r, i) => {
    if (picks.length >= 2) return;
    if (String(r[c('Status')]).trim() !== 'Active' || String(r[c('ClockMode')]).trim() !== 'ENGINE') return;
    if (String(r[c('EmployerBizId')] || '').trim() !== '' || String(r[c('EconomicProfileKey')]).trim() === 'SPORTS_OVERRIDE') return;
    const age = 2042 - (Number(r[c('BirthYear')]) || 0); if (age < 18 || age >= 65) return;
    if (String(r[col] || '').trim() !== '') return;
    picks.push({ row: i + 2, pop: r[c('POPID')], role: r[c('RoleType')], hood: r[c('Neighborhood')], tier: r[c('Tier')], income: r[c('Income')] });
  });
  if (picks.length !== 2) throw new Error('found ' + picks.length + ' probe rows');
  for (const p of picks) {
    const range = 'Simulation_Ledger!' + A1(col) + p.row;
    await api.spreadsheets.values.update({ spreadsheetId: BENCH, range, valueInputOption: 'RAW', requestBody: { values: [['Small Business']] } });
    const back = (await api.spreadsheets.values.get({ spreadsheetId: BENCH, range })).data.values;
    if (!back || back[0][0] !== 'Small Business') throw new Error('read-back ' + range + ' ' + JSON.stringify(back));
    console.log('probe ' + p.pop + ' (' + p.role + ', ' + p.hood + ') ' + range + ' = Small Business, read back');
  }
  require('fs').writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-22-e307-probe-picks.json', JSON.stringify(picks, null, 1));
})().catch(e => { console.error(e.message); process.exit(1); });
