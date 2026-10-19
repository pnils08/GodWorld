// engine.304 bench probe (SANDBOX 1004 only): set EmergenceCount 3 on two Family rows — the spouse link with the lowest
// row (Colette Paulson if present) and the child link with the lowest row — so the next fire exercises the arrival path
// (emergence door → mint re-check → wireFamilyMatch_ → exact flip). Prints the chosen rows; --apply writes and reads back.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
(async () => {
  if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env points at the bench');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const t = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (t !== BENCH_TITLE) throw new Error('REFUSED: not the bench');
  const v = (await api.spreadsheets.values.get({ spreadsheetId: BENCH, range: 'Generic_Citizens' })).data.values;
  const h = v[0], c = n => h.indexOf(n);
  const fam = v.map((r, i) => ({ r, i })).slice(1).filter(x => x.r[c('Status')] === 'Family');
  const pick = [fam.find(x => x.r[c('FamilyRole')] === 'spouse'), fam.find(x => x.r[c('FamilyRole')] === 'child')]; // the highest rows: the door is top-down under the cap
  const above = v.slice(1).filter((r, i) => r[c('Status')] === 'Active' && Number(r[c('EmergenceCount')]) >= 2).length;
  pick.forEach(x => console.log('row', x.i + 1, x.r[c('First')], x.r[c('Last')], x.r[c('FamilyRole')], 'of', x.r[c('FamilyOf')], 'count', x.r[c('EmergenceCount')]));
  console.log('Active rows at count >= 2 (can take a cap slot first):', above);
  if (!process.argv.includes('--apply')) return;
  const col = String.fromCharCode(65 + c('EmergenceCount'));
  for (const x of pick) await api.spreadsheets.values.update({ spreadsheetId: BENCH, range: `Generic_Citizens!${col}${x.i + 1}`, valueInputOption: 'RAW', requestBody: { values: [[3]] } });
  const back = (await api.spreadsheets.values.get({ spreadsheetId: BENCH, range: 'Generic_Citizens' })).data.values;
  pick.forEach(x => console.log('read back row', x.i + 1, back[x.i][c('EmergenceCount')]));
})().catch(e => { console.error(e.message); process.exit(1); });
