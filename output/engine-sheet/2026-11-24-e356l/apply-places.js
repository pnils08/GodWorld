// engine.356 (builder 2026-11-24 "go on programs and congregations as places"): the Event_Content_Ledger lines
// that name a program or a congregation carry its place; faith lines with no name carry place:congregation.
// The list is ecl-places.json.
//   node apply-places.js bench | live
// bench also writes the two test lines of bench-lines.json below the last row, by explicit range (never the
// shared append) — they prove the $PROGRAM and $CONGREGATION slots and never go to live from here.
// Each row is checked (PoolKey + old Text) before its cells are written; a row already done is left alone;
// any mismatch stops the run before a write. Reads back after.
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
const list = JSON.parse(fs.readFileSync(__dirname + '/ecl-places.json', 'utf8'));
const benchLines = target === 'bench' ? JSON.parse(fs.readFileSync(__dirname + '/bench-lines.json', 'utf8')) : [];
const has = (cur, t) => String(cur).split(',').indexOf(t) >= 0;
(async () => {
  const d = await sheets.getSheetData('Event_Content_Ledger');
  const h = d[0], iP = h.indexOf('PoolKey'), iT = h.indexOf('Text'), iG = h.indexOf('Tags');
  if (iT !== 3 || iG !== 6 || iP !== 1 || h.length !== 9) throw new Error('header moved: ' + JSON.stringify(h));
  const updates = [], bad = []; let already = 0, written = 0;
  for (const o of list) {
    const r = d[o.row - 1], want = o.newText || o.oldText;
    if (!r || r[iP] !== o.pool) { bad.push(o.row); continue; }
    const cur = String(r[iG] || '');
    if (r[iT] === want && o.add.every(t => has(cur, t))) { already++; continue; }
    if (r[iT] !== o.oldText || /(^|,)\s*place:/.test(cur) || !/^source:/.test(cur)) { bad.push(o.row); continue; }
    const add = o.add.filter(t => !has(cur, t));
    if (o.newText) updates.push({ range: 'Event_Content_Ledger!D' + o.row, values: [[o.newText]] });
    updates.push({ range: 'Event_Content_Ledger!G' + o.row, values: [[cur + ',' + add.join(',')]] });
    written++;
  }
  if (bad.length) { console.error('STOP — rows not matching the list: ' + bad.join(',')); process.exit(1); }
  let benchAdded = 0;
  for (const bl of benchLines) {
    if (d.some(r => r[iT] === bl[3])) continue;
    const at = d.length + 1 + benchAdded;
    updates.push({ range: 'Event_Content_Ledger!A' + at + ':I' + at, values: [bl] });
    benchAdded++;
  }
  if (updates.length) await sheets.batchUpdate(updates);
  const back = await sheets.getSheetData('Event_Content_Ledger');
  let ok = 0; const miss = [];
  for (const o of list) { const r = back[o.row - 1]; if (r[iT] === (o.newText || o.oldText) && o.add.every(t => has(r[iG], t))) ok++; else miss.push(o.row); }
  let benchOk = 0;
  for (const bl of benchLines) if (back.some(r => r.length >= 9 && bl.every((v, i) => String(r[i] || '') === v))) benchOk++;
  if (benchOk !== benchLines.length) miss.push('bench lines ' + benchOk + '/' + benchLines.length);
  console.log(JSON.stringify({ target, listed: list.length, rowsWritten: written, already, readBackOk: ok, benchLines: benchOk, readBackMiss: miss, rows: back.length - 1 }));
  process.exit(miss.length ? 1 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
