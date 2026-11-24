// engine.356 A2: write the act: / place: tags of ecl-act-tags.json onto Event_Content_Ledger's Tags cells.
//   node apply-tags.js bench | live
// Each row is checked against the list (PoolKey + Text) before its cell is written; a row already
// carrying act: is left alone; any mismatch stops the run before a write. Reads back after.
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
const list = JSON.parse(fs.readFileSync(__dirname + '/ecl-act-tags.json', 'utf8'));
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  const h = d[0], iP = h.indexOf('PoolKey'), iT = h.indexOf('Text'), iG = h.indexOf('Tags');
  if (iG !== 6 || iP < 0 || iT < 0) throw new Error('header moved: Tags at ' + iG);
  const updates = [], bad = []; let already = 0;
  for (const o of list) {
    const r = d[o.row - 1];
    if (!r || r[iP] !== o.pool || r[iT] !== o.text) { bad.push(o.row); continue; }
    const cur = String(r[iG] || '');
    if (/(^|,)\s*act:/.test(cur)) { already++; continue; }
    if (!/^source:/.test(cur)) { bad.push(o.row); continue; }
    updates.push({ range: 'Event_Content_Ledger!G' + o.row, values: [[cur + ',' + o.add.join(',')]] });
  }
  if (bad.length) { console.error('STOP — rows not matching the list: ' + bad.join(',')); process.exit(1); }
  await sheets.batchUpdate(updates);
  const back = await sheets.getSheetData('Event_Content_Ledger');
  let ok = 0; const miss = [];
  for (const o of list) { const cur = String(back[o.row - 1][iG] || ''); if (o.add.every(t => cur.split(',').indexOf(t) >= 0)) ok++; else miss.push(o.row); }
  console.log(JSON.stringify({ target, listed: list.length, written: updates.length, already, readBackOk: ok, readBackMiss: miss, rows: back.length - 1 }));
  process.exit(miss.length ? 1 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
