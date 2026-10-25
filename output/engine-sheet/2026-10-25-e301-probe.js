// engine.301 F1 bench probe (BENCH ONLY), two halves, after a reset to BASELINE-1004-C112b:
//   consumer — add a Fruitvale property rise and name Fruitvale in crimeWaveHoods on the C112 PREV_CYCLE_STATE_JSON ring row, so the
//              next fire (C113) reads Fruitvale at level 3: rung 3, the wave receipt and the full-weight crime carry on the real path.
//   producer — lower Baylight District's Crime_Metrics PropertyCrimeIndex by 10 (PropertyLevel untouched), so C113's own update
//              (calculateCrimeShifts_: sheet index vs the index rebuilt from the persistent level) registers a Baylight rise. Baylight
//              carries the baseline's own C112 spike (level 1 at C113), so C113's Phase 9 must carry it as a wave; C114 reads it at 3.
// The props blob is stamped past C112 after a reset, so the loader steps back to this ring row (DEPLOY.md, engine.119 T3).
// Refuses any sheet whose title is not the bench. Dry run without --apply; reads the cell back after the write.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const apply = process.argv.includes('--apply');
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const m = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data;
  if (m.properties.title !== TITLE) throw new Error('not the bench: ' + m.properties.title);
  const v = (await api.spreadsheets.values.get({ spreadsheetId: ID, range: 'Carry_Forward_Store!A1:D40' })).data.values;
  const idx = v.findIndex((r, i) => i > 0 && r[0] === 'PREV_CYCLE_STATE_JSON' && Number(r[1]) === 112);
  if (idx < 0) throw new Error('no C112 PREV_CYCLE_STATE_JSON ring row — reset first');
  const j = JSON.parse(v[idx][3]);
  if (Number(j.cycle) !== 112) throw new Error('ring row carries cycle ' + j.cycle);
  if (Array.isArray(j.crimeWaveHoods)) throw new Error('C112 row already carries crimeWaveHoods ' + JSON.stringify(j.crimeWaveHoods) + ' — reset first');
  j.crimeSpikes = (j.crimeSpikes || []).concat([{ neighborhood: 'Fruitvale', metric: 'propertyCrime', magnitude: 6, newValue: 41 }]);
  j.crimeWaveHoods = ['Fruitvale'];
  const cell = 'Carry_Forward_Store!D' + (idx + 1), json = JSON.stringify(j);
  console.log((apply ? 'APPLY ' : 'DRY ') + cell + ' crimeSpikes ' + JSON.stringify(j.crimeSpikes) + ' crimeWaveHoods ' + JSON.stringify(j.crimeWaveHoods) + ' (' + json.length + ' chars)');
  if (!apply) return;
  await api.spreadsheets.values.update({ spreadsheetId: ID, range: cell, valueInputOption: 'RAW', requestBody: { values: [[json]] } });
  const back = (await api.spreadsheets.values.get({ spreadsheetId: ID, range: cell })).data.values[0][0];
  const b = JSON.parse(back);
  if (JSON.stringify(b.crimeWaveHoods) !== '["Fruitvale"]' || b.crimeSpikes.length !== j.crimeSpikes.length) throw new Error('read-back mismatch');
  if (JSON.stringify(b) !== json) throw new Error('read-back mismatch: the ring row is not the written blob');
  console.log('read back: crimeWaveHoods ' + JSON.stringify(b.crimeWaveHoods) + ', ' + b.crimeSpikes.length + ' spikes, row byte-identical');
  // producer half
  const cm = (await api.spreadsheets.values.get({ spreadsheetId: ID, range: 'Crime_Metrics!A1:M40' })).data.values;
  const hc = cm[0], iN = hc.indexOf('Neighborhood'), iP = hc.indexOf('PropertyCrimeIndex'), iL = hc.indexOf('PropertyLevel');
  const bi = cm.findIndex((r, i) => i > 0 && r[iN] === 'Baylight District');
  if (bi < 0 || iP < 0 || iL < 0) throw new Error('no Baylight District / PropertyCrimeIndex / PropertyLevel on Crime_Metrics');
  const oldIdx = Number(cm[bi][iP]), lvl = Number(cm[bi][iL]);
  const newIdx = Math.max(5, oldIdx - 10);
  const pc = 'Crime_Metrics!' + String.fromCharCode(65 + iP) + (bi + 1);
  await api.spreadsheets.values.update({ spreadsheetId: ID, range: pc, valueInputOption: 'RAW', requestBody: { values: [[newIdx]] } });
  const pb = Number((await api.spreadsheets.values.get({ spreadsheetId: ID, range: pc })).data.values[0][0]);
  if (pb !== newIdx) throw new Error('Crime_Metrics read-back mismatch');
  console.log('producer: ' + pc + ' Baylight District PropertyCrimeIndex ' + oldIdx + ' -> ' + newIdx + ' (PropertyLevel ' + lvl + ' kept), read back');
})().catch(e => { console.error(e.message); process.exit(1); });
