// engine.301 F1 bench probe (BENCH ONLY): after a reset to BASELINE-1004-C112b, add a Fruitvale property rise and name Fruitvale in
// crimeWaveHoods on the C112 PREV_CYCLE_STATE_JSON ring row, so the next fire (C113) reads Fruitvale at level 3 — the real Apps Script
// path for rung 3, the wave receipt and the full-weight crime carry. The baseline's own Baylight District spike stays (level 1).
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
  console.log('read back: crimeWaveHoods ' + JSON.stringify(b.crimeWaveHoods) + ', ' + b.crimeSpikes.length + ' spikes');
})().catch(e => { console.error(e.message); process.exit(1); });
