// engine.356 (builder 2026-11-24: "10 child lines are approved"): the ten child lines of draft-child-lines.json onto the LIVE
// Event_Content_Ledger, below its last row, by explicit range (never the shared append). Idempotent; reads back.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const lines = JSON.parse(fs.readFileSync(__dirname + '/draft-child-lines.json', 'utf8'));
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  if (JSON.stringify(d[0]) !== JSON.stringify(['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'])) throw new Error('header moved');
  if (d.some((r, i) => i > 0 && !r[0] && !r[3])) throw new Error('a blank row inside the tab');
  const add = lines.filter(l => !d.some(r => r[3] === l[3]));
  // the tab's grid ends at its last row: grow it by exactly the rows to add (keeps the column count)
  if (add.length) await sheets.resizeSheet('Event_Content_Ledger', null, d.length + add.length);
  if (add.length) { const at = d.length + 1; await sheets.batchUpdate([{ range: 'Event_Content_Ledger!A' + at + ':I' + (at + add.length - 1), values: add }]); }
  const back = await sheets.getSheetData('Event_Content_Ledger');
  const ok = lines.filter(l => back.some(r => l.every((v, i) => String(r[i] || '') === v))).length;
  console.log(JSON.stringify({ target: 'live', listed: lines.length, written: add.length, readBackOk: ok, rowsBefore: d.length - 1, rowsAfter: back.length - 1 }));
  process.exit(ok === lines.length ? 0 : 1);
})().catch(e => { console.error(e.message || e); process.exit(2); });
