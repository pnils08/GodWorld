// engine.356 cut A4 — the line rows whose words say a time carry it (when-rows.json: row, text, add).
// Appends the when:<part> tags to the row's Tags cell, only where the row still holds the same Text and
// carries no when: yet; reads every row back.
//   node apply-when.js bench     (the sandbox tab, after a sync from live)
//   node apply-when.js live      (the live tab — builder 2026-11-25, on rule 4: "approved , procced on all")
require('/root/GodWorld/lib/env');
const fs = require('fs');
const target = process.argv[2];
if (target !== 'bench' && target !== 'live') { console.error('bench | live'); process.exit(2); }
const liveId = process.env.GODWORLD_SHEET_ID;
if (target === 'bench') {
  const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
  if (!idm) { console.error('no bench sheet id'); process.exit(2); }
  if (idm[1] === liveId) { console.error('bench id = live id — stop'); process.exit(2); }
  process.env.GODWORLD_SHEET_ID = idm[1];
}
const sheets = require('/root/GodWorld/lib/sheets');
const rows = JSON.parse(fs.readFileSync(__dirname + '/when-rows.json', 'utf8'));
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  if (JSON.stringify(d[0]) !== JSON.stringify(['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'])) throw new Error('header moved');
  const up = [], moved = [], already = [];
  for (const w of rows) {
    const r = d[w.row - 1] || [];
    if (String(r[3] || '') !== w.text) { moved.push(w.row); continue; }       // the row is not the line it was — never tag by position alone
    const have = String(r[6] || '').split(',').map(t => t.trim()).filter(Boolean);
    if (have.some(t => t.indexOf('when:') === 0)) { already.push(w.row); continue; }
    up.push({ range: 'Event_Content_Ledger!G' + w.row, values: [[have.concat(w.add).join(',')]] });
  }
  if (moved.length) { console.log(JSON.stringify({ target, written: 0, moved })); process.exit(1); }   // nothing is written when any row moved
  if (up.length) await sheets.batchUpdate(up);
  const back = await sheets.getSheetData('Event_Content_Ledger');
  const ok = rows.filter(w => {
    const r = back[w.row - 1] || [], have = String(r[6] || '').split(',').filter(t => t.indexOf('when:') === 0);
    return String(r[3] || '') === w.text && have.length === w.add.length && w.add.every(t => have.indexOf(t) >= 0);
  }).length;
  console.log(JSON.stringify({ target, whenRows: ok, of: rows.length, written: up.length, already: already.length }));
  process.exit(ok === rows.length ? 0 : 1);
})().catch(e => { console.error(e.message || e); process.exit(2); });
