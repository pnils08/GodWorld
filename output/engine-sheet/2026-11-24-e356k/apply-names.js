// engine.356 A2 (builder 2026-11-24 "go on 1"): the Event_Content_Ledger lines that describe a ledger business
// in plain words name it, and carry its place:<BIZ_ID> — the list is ecl-place-names.json.
//   node apply-names.js bench | live
// Each row is checked (PoolKey + old Text) before its cells are written; a row already at the new text is
// left alone; any mismatch stops the run before a write. Reads back after.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const target = process.argv[2];
if (target !== 'bench' && target !== 'live') { console.error('say bench or live'); process.exit(2); }
if (target === 'bench') {
  const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
  if (!idm) { console.error('no bench sheet id'); process.exit(2); }
  process.env.GODWORLD_SHEET_ID = idm[1];
}
const sheets = require('/root/GodWorld/lib/sheets');
const list = JSON.parse(fs.readFileSync(__dirname + '/ecl-place-names.json', 'utf8'));
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  const h = d[0], iP = h.indexOf('PoolKey'), iT = h.indexOf('Text'), iG = h.indexOf('Tags');
  if (iT !== 3 || iG !== 6 || iP < 0) throw new Error('header moved: Text at ' + iT + ', Tags at ' + iG);
  const updates = [], bad = []; let already = 0;
  for (const o of list) {
    const r = d[o.row - 1];
    if (!r || r[iP] !== o.pool) { bad.push(o.row); continue; }
    const cur = String(r[iG] || '');
    if (r[iT] === o.newText && cur.split(',').indexOf(o.place) >= 0) { already++; continue; }
    if (r[iT] !== o.oldText || /(^|,)\s*place:/.test(cur) || !/(^|,)\s*act:/.test(cur)) { bad.push(o.row); continue; }
    updates.push({ range: 'Event_Content_Ledger!D' + o.row, values: [[o.newText]] });
    updates.push({ range: 'Event_Content_Ledger!G' + o.row, values: [[cur + ',' + o.place]] });
  }
  if (bad.length) { console.error('STOP — rows not matching the list: ' + bad.join(',')); process.exit(1); }
  await sheets.batchUpdate(updates);
  const back = await sheets.getSheetData('Event_Content_Ledger');
  let ok = 0; const miss = [];
  for (const o of list) { const r = back[o.row - 1]; if (r[iT] === o.newText && String(r[iG]).split(',').indexOf(o.place) >= 0) ok++; else miss.push(o.row); }
  console.log(JSON.stringify({ target, listed: list.length, rowsWritten: updates.length / 2, already, readBackOk: ok, readBackMiss: miss, rows: back.length - 1 }));
  process.exit(miss.length ? 1 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
