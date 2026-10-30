// research.31 bench feed: SANDBOX 1004 Undocked_Feed := the live feed as it stands (13 columns, PointsDelta back-scored
// 2026-10-30, every row TargetCycle <= 114 — what the C114 fire will read), plus ONE bench-only change so the two boards
// disagree: Clarissa Dane's first aired row gets +15 points (her 10 -> 25, over Eric Taveras's 20; credits still have
// Taveras on top). Read-only on live. Title-guarded on the bench; typed read-back after the write.
//   node output/engine-sheet/2026-10-30-r31-feed.js
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const LIVE = process.env.GODWORLD_SHEET_ID;
const BOOST_POP = 'POP-00143', BOOST = 15;
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const meta = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title,sheets.properties' })).data;
  if (meta.properties.title !== BENCH_TITLE || BENCH === LIVE) throw new Error('target check failed');
  const get = async (id, range) => (await api.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const live = await get(LIVE, 'Undocked_Feed!A1:Z1000');
  const hdr = live[0];
  if (hdr.length !== 13 || hdr[12] !== 'PointsDelta') throw new Error('live header is not the 13-column points header: ' + JSON.stringify(hdr));
  const iT = hdr.indexOf('TargetCycle'), iP = hdr.indexOf('POPID'), iPts = hdr.indexOf('PointsDelta');
  const rows = live.slice(1).filter(r => Number(r[iT]) <= 114).map(r => hdr.map((_, i) => r[i] === undefined ? '' : r[i]));
  const b = rows.findIndex(r => r[iP] === BOOST_POP && Number(r[iT]) <= 112);
  if (b < 0) throw new Error('no aired row for ' + BOOST_POP);
  rows[b][iPts] = Number(rows[b][iPts] || 0) + BOOST;
  const before = await get(BENCH, 'Undocked_Feed!A1:Z1000');
  const sh = meta.sheets.find(s => s.properties.title === 'Undocked_Feed');
  if (!sh) throw new Error('bench has no Undocked_Feed');
  const g = sh.properties.gridProperties, reqs = [];
  if (g.columnCount < 13) reqs.push({ appendDimension: { sheetId: sh.properties.sheetId, dimension: 'COLUMNS', length: 13 - g.columnCount } });
  if (g.rowCount < rows.length + 1) reqs.push({ appendDimension: { sheetId: sh.properties.sheetId, dimension: 'ROWS', length: rows.length + 1 - g.rowCount } });
  if (reqs.length) await api.spreadsheets.batchUpdate({ spreadsheetId: BENCH, requestBody: { requests: reqs } });
  await api.spreadsheets.values.clear({ spreadsheetId: BENCH, range: 'Undocked_Feed!A1:Z1000' });
  const want = [hdr].concat(rows);
  await api.spreadsheets.values.update({ spreadsheetId: BENCH, range: 'Undocked_Feed!A1', valueInputOption: 'RAW', requestBody: { values: want } });
  const back = await get(BENCH, 'Undocked_Feed!A1:Z1000');
  const norm = r => hdr.map((_, i) => r[i] === undefined ? '' : r[i]);
  const bad = want.findIndex((r, i) => JSON.stringify(norm(r)) !== JSON.stringify(norm(back[i] || [])));
  if (back.length !== want.length || bad >= 0) throw new Error('read-back mismatch at row ' + bad);
  const byT = {}; rows.forEach(r => { byT[r[iT]] = (byT[r[iT]] || 0) + 1; });
  console.log('bench Undocked_Feed: ' + (before.length - 1) + ' baseline rows -> ' + rows.length + ' live rows ' + JSON.stringify(byT) +
    ', 13 columns; bench-only +' + BOOST + ' pts on ' + rows[b][hdr.indexOf('EpisodeId')] + ' (' + BOOST_POP + '); read back');
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
