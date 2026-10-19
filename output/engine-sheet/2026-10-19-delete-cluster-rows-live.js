// engine.214 Acceptance 6: delete the five clusterAnchors_* rows from LIVE World_Config after the stage 5 PROD push
// (PROD @148, 2026-10-19; builder go "finish the work"). No reader remains (grep of phase*/utilities/lib/scripts/dashboard;
// agy 2026-10-19 vector 5). Dry run by default; --apply deletes bottom-up, then re-reads every other key and compares.
// usage: node output/engine-sheet/2026-10-19-delete-cluster-rows-live.js [--apply]
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const APPLY = process.argv.includes('--apply');
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const L = process.env.GODWORLD_SHEET_ID;
  const meta = await api.spreadsheets.get({ spreadsheetId: L, fields: 'properties.title,sheets.properties' });
  if (meta.data.properties.title !== 'Simulation_Narrative') throw new Error('not live: ' + meta.data.properties.title);
  const wcMeta = meta.data.sheets.find(s => s.properties.title === 'World_Config');
  const read = async () => (await api.spreadsheets.values.get({ spreadsheetId: L, range: 'World_Config', valueRenderOption: 'UNFORMATTED_VALUE' })).data.values;
  const before = await read();
  const hits = [];
  before.forEach((r, i) => { if (/^clusterAnchors_/.test(String(r[0] || ''))) hits.push({ row: i + 1, key: r[0], value: String(r[1]).slice(0, 80) }); });
  console.log('World_Config rows', before.length, '| clusterAnchors_ rows:', JSON.stringify(hits, null, 1));
  if (hits.length !== 5) throw new Error('expected 5 clusterAnchors_ rows, found ' + hits.length + ' — stop');
  if (!APPLY) { console.log('dry run — nothing deleted'); return; }
  const requests = hits.slice().sort((a, b) => b.row - a.row).map(h => ({ deleteDimension: { range: { sheetId: wcMeta.properties.sheetId, dimension: 'ROWS', startIndex: h.row - 1, endIndex: h.row } } }));
  // re-check the keys at those rows immediately before the delete
  const now = await read();
  for (const h of hits) if (now[h.row - 1][0] !== h.key) throw new Error('row ' + h.row + ' moved (now ' + now[h.row - 1][0] + ') — stop');
  await api.spreadsheets.batchUpdate({ spreadsheetId: L, requestBody: { requests } });
  const after = await read();
  const map = rows => Object.fromEntries(rows.filter(r => r[0]).map(r => [r[0], JSON.stringify(r.slice(1))]));
  const B = map(before), A = map(after);
  const gone = Object.keys(B).filter(k => !(k in A)), added = Object.keys(A).filter(k => !(k in B)), changed = Object.keys(A).filter(k => k in B && A[k] !== B[k]);
  console.log('after: rows', after.length, '| keys gone', JSON.stringify(gone), '| added', JSON.stringify(added), '| other keys changed', JSON.stringify(changed));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
