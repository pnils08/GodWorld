// engine.304 D1: write the three family-link headers (FamilyOf, FamilyRole, MaidenName) after the last
// Generic_Citizens header, then read them back. Bench by default; --target live needs the builder's go and
// refuses unless --go is also passed. Idempotent: present headers are left alone. Dry run without --apply.
//   node 2026-10-19-e304-gc-header.js --target bench|live [--apply] [--go]
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const LIVE = process.env.GODWORLD_SHEET_ID;
const COLS = ['FamilyOf', 'FamilyRole', 'MaidenName'];
const target = process.argv[process.argv.indexOf('--target') + 1];
const APPLY = process.argv.includes('--apply');
(async () => {
  if (target !== 'bench' && target !== 'live') throw new Error('--target bench|live');
  if (target === 'live' && APPLY && !process.argv.includes('--go')) throw new Error('REFUSED: the live header waits for the builder\'s go (--go)');
  if (!LIVE || LIVE === BENCH) throw new Error('REFUSED: env live id missing or equals the bench');
  const id = target === 'bench' ? BENCH : LIVE;
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const meta = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })).data;
  if (target === 'bench' && meta.properties.title !== BENCH_TITLE) throw new Error('REFUSED: bench title is not ' + BENCH_TITLE);
  if (target === 'live' && meta.properties.title === BENCH_TITLE) throw new Error('REFUSED: live id points at the bench');
  const tab = meta.sheets.find(s => s.properties.title === 'Generic_Citizens');
  if (!tab) throw new Error('Generic_Citizens not found');
  const head = ((await api.spreadsheets.values.get({ spreadsheetId: id, range: 'Generic_Citizens!1:1' })).data.values || [[]])[0];
  const missing = COLS.filter(c => head.indexOf(c) < 0);
  console.log(`${target} "${meta.properties.title}" Generic_Citizens: ${head.length} headers (${head.join(', ')}); grid ${tab.properties.gridProperties.columnCount} cols; missing: ${missing.join(', ') || 'none'}`);
  if (!missing.length || !APPLY) { if (!APPLY && missing.length) console.log('dry run — nothing written'); return; }
  if (missing.length !== COLS.length) throw new Error('REFUSED: only some link headers present — read the tab before writing');
  const need = head.length + COLS.length;
  if (tab.properties.gridProperties.columnCount < need) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ appendDimension: { sheetId: tab.properties.sheetId, dimension: 'COLUMNS', length: need - tab.properties.gridProperties.columnCount } }] } });
  }
  const colL = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  await api.spreadsheets.values.update({ spreadsheetId: id, range: `Generic_Citizens!${colL(head.length)}1:${colL(need - 1)}1`, valueInputOption: 'RAW', requestBody: { values: [COLS] } });
  const back = ((await api.spreadsheets.values.get({ spreadsheetId: id, range: 'Generic_Citizens!1:1' })).data.values || [[]])[0];
  const ok = COLS.every((c, k) => back[head.length + k] === c) && back.slice(0, head.length).join('|') === head.join('|');
  console.log(`read back: ${back.join(', ')} — ${ok ? 'OK' : 'MISMATCH'}`);
  if (!ok) process.exit(2);
})().catch(e => { console.error(e.message); process.exit(1); });
