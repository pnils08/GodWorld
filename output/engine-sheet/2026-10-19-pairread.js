// engine.214 pair readback on SANDBOX 1004 after a C113 fire: per-hood dynamics from the carried
// cycle state, Riley city columns, cluster rows, Engine_Errors. usage: node pairread.js <label>
require('/root/GodWorld/lib/env');
const fs = require('fs');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const label = process.argv[2] || 'x';
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const t = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (t !== 'Sandox_104_c109-live_Simulation_Narrative' || BENCH === process.env.GODWORLD_SHEET_ID) throw new Error('not bench');
  const r = await api.spreadsheets.values.batchGet({ spreadsheetId: BENCH, ranges: ['Carry_Forward_Store', 'Riley_Digest', 'World_Config!A1:B400', 'Engine_Errors'], valueRenderOption: 'UNFORMATTED_VALUE' });
  const [cfs, rd, wc, ee] = r.data.valueRanges.map(x => x.values || []);
  const cyc = Number((wc.find(x => x[0] === 'cycleCount') || [])[1]);
  const best = {}; for (const row of cfs.slice(1)) { if (!row[0]) continue; if (!best[row[0]] || Number(row[1]) > Number(best[row[0]][1])) best[row[0]] = row; }
  const pcs = best.PREV_CYCLE_STATE_JSON; let st = {}; try { st = JSON.parse(pcs[3]); } catch (e) {}
  const nd = st.neighborhoodDynamics || {};
  const hoods = Object.keys(nd).sort(); const sent = hoods.map(h => Number(nd[h].sentiment));
  const mean = sent.reduce((a, b) => a + b, 0) / (sent.length || 1);
  const h = rd[0], last = rd[rd.length - 1]; const riley = Object.fromEntries(['Cycle', 'CityEvents', 'CityTraffic', 'RetailLoad', 'TourismLoad', 'NightlifeLoad', 'CitySentiment'].map(k => [k, last[h.indexOf(k)]]));
  const out = { label, cycleCount: cyc, carryCycle: pcs && Number(pcs[1]), keysInState: Object.keys(st).slice(0, 40), hoodCount: hoods.length, hoodMeanSentiment: +mean.toFixed(4),
    spread: +(Math.max(...sent) - Math.min(...sent)).toFixed(4), cityDynamics: st.cityDynamics || null, riley, clusterAnchorsRows: wc.filter(x => /^clusterAnchors_/.test(String(x[0]))).length,
    engineErrorsRows: ee.length - 1, neighborhoodDynamics: nd };
  const f = `/root/GodWorld/output/engine-sheet/2026-10-19-engine214-pair-readback-${label}-c${cyc}.json`;
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ label, cyc, carryCycle: out.carryCycle, hoods: hoods.length, hoodMean: out.hoodMeanSentiment, spread: out.spread, CitySentiment: riley.CitySentiment, rileyCycle: riley.Cycle, clusterRows: out.clusterAnchorsRows, ee: out.engineErrorsRows, stateKeys: out.keysInState.length }));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
