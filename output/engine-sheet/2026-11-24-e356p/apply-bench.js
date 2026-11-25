// engine.356 cut A3 — with whom. BENCH ONLY: writes the test lines of
// bench-lines.json below the last Event_Content_Ledger row by explicit range (never the shared append).
//   node apply-bench.js
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
if (idm[1] === process.env.GODWORLD_SHEET_ID) { console.error('bench id = live id — stop'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const lines = JSON.parse(fs.readFileSync(__dirname + '/bench-lines.json', 'utf8'));
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  if (JSON.stringify(d[0]) !== JSON.stringify(['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'])) throw new Error('header moved');
  const up = []; let n = 0;
  for (const bl of lines) { if (d.some(r => r[3] === bl[3])) continue; const at = d.length + 1 + n; up.push({ range: 'Event_Content_Ledger!A' + at + ':I' + at, values: [bl] }); n++; }
  // the tab's grid ends at its last row: grow it by exactly the rows to add (as the live apply of the 23 slot lines did)
  if (up.length) await sheets.resizeSheet('Event_Content_Ledger', null, d.length + up.length);
  if (up.length) await sheets.batchUpdate(up);
  const back = await sheets.getSheetData('Event_Content_Ledger');
  const ok = lines.filter(bl => back.some(r => bl.every((v, i) => String(r[i] || '') === v))).length;
  console.log(JSON.stringify({ target: 'bench', benchLines: ok, of: lines.length, rows: back.length - 1 }));
  process.exit(ok === lines.length ? 0 : 1);
})().catch(e => { console.error(e.message || e); process.exit(2); });
