#!/usr/bin/env node
/* engine.347 Task 5 — the real path with the append captured. The nine days of statements read off the pages
 * (2026-11-17-job-statements-rows.json) are queued into a scratch spool at the time each was saved, then
 * flushed through lib/jobStatementRows.js with the live sheet read and the live classifier; appendRows is
 * captured and printed. NOTHING is written to a sheet or a page.
 * Run: node output/research-build/2026-11-17-job-statements-dryflush.js <scratch-dir>   (live classifier calls, cents)
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const js = require('/root/GodWorld/lib/jobStatementRows');
const dm = require('/root/GodWorld/utilities/citizenDialMap');
const sheets = require('/root/GodWorld/lib/sheets');
const rc = require('/root/GodWorld/lib/reflectionClassifier');
const dir = process.argv[2];
if (!dir) { console.error('usage: <scratch-dir>'); process.exit(1); }
fs.rmSync(dir, { recursive: true, force: true });
const all = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-11-17-job-statements-rows.json'), 'utf8'));
const strip = (t) => String(t).replace(/^datawake:\s*/i, '').replace(/\s\|\s(action|signal):.*$/i, '').replace(/^stated:\s*(\[[^\]]*\]\s*)?([^—]{1,60}—\s*)?/i, '').trim();
const names = {};
const src = all.filter((r) => r.daypart === 'CIVIC' || r.daypart === 'journal').sort((a, b) => String(a.customId).localeCompare(String(b.customId)));
const stamps = {};
let queued = 0, refused = {};
// page docs carry no per-line save time in the rows file; the day is known, so lines are stamped in order within their day (18:00Z)
for (const r of src) {
  names[r.pop] = r.name;
  const n = (stamps[r.pop + r.day] = (stamps[r.pop + r.day] || 0) + 1);
  const q = js.queue({ pop: r.pop, cycle: Number(r.cycle), daypart: r.daypart, text: strip(r.text), src: r.kind }, { dir, now: r.day + 'T18:00:' + String(n).padStart(2, '0') + 'Z' });
  if (q.queued) queued++; else refused[q.why] = (refused[q.why] || 0) + 1;
}
console.log('queued', queued, 'of', src.length, 'refused', JSON.stringify(refused));
(async () => {
  const captured = [];
  const t0 = Date.now();
  const sum = await js.flush({ dir, lock: async (p, fn) => fn(),
    readRows: () => sheets.getRawSheetData('Reflection_Intake'),
    appendRows: async (rows) => { captured.push(...rows); },
    classify: (text, open) => rc.classifyTripleReflection_(text, open),
    log: (m) => console.log('  ' + m) });
  console.log('\nflush', JSON.stringify(sum), Math.round((Date.now() - t0) / 1000) + 's');
  const moves = captured.filter((r) => Object.keys(dm.nudgesForReflection_(r[4], r[7], 1, r[5])).some((d) => dm.nudgesForReflection_(r[4], r[7], 1, r[5])[d]));
  console.log('rows', captured.length, ' move a dial', moves.length);
  const t = {};
  for (const r of captured) { const fx = dm.nudgesForReflection_(r[4], r[7], 1, r[5]); for (const d of Object.keys(fx)) { if (!fx[d]) continue; t[d] = t[d] || { up: 0, down: 0 }; t[d][fx[d] > 0 ? 'up' : 'down']++; } }
  console.log('dial rows up / down:', Object.keys(t).map((d) => d + ' ' + t[d].up + ' / ' + t[d].down).join(', '));
  const pair = {}; captured.forEach((r) => { const k = (r[4] || '-') + '|' + (r[7] || '-'); pair[k] = (pair[k] || 0) + 1; });
  console.log('tags:', JSON.stringify(pair));
  console.log('\nrows that move a dial:');
  for (const r of moves) console.log('  ' + (names[r[1]] || r[1]).padEnd(22) + r[0].slice(0, 10) + ' ' + r[3].padEnd(8) + (r[4] + '|' + r[7]).padEnd(18) + JSON.stringify(dm.nudgesForReflection_(r[4], r[7], 1, r[5])) + '  "' + r[5].slice(0, 110) + '"');
  fs.writeFileSync(path.join(__dirname, '2026-11-17-job-statements-dryflush-rows.json'), JSON.stringify(captured, null, 1));
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
