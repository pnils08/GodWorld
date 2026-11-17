// engine.349 Task 2(e) — LIVE ledger: the 13 stuck watermarks (DialState.folded 133) set to 107, so the engine folds their
// held C108+ lines itself at the next fire. Builder 2026-11-16: "1 yes" (the list named "13 citizens' lives have not counted
// … (a stuck marker)"). Only `folded` changes; every other byte of the cell is kept. Guards (agy re-review §5): the exact
// thirteen POPIDs, each at exactly 133, nothing but the mark changing, backup written before the write, read back after.
// Run between fires (the live Cycle fires Sundays).
//   node output/research-build/2026-11-17-e349-live-marks.js            (dry: prints what it would do)
//   node output/research-build/2026-11-17-e349-live-marks.js --apply
require('/root/GodWorld/lib/env');
const fs = require('fs');
const s = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const WANT = []; for (let i = 1029; i <= 1041; i++) WANT.push('POP-0' + i);
const BACKUP = '/root/GodWorld/output/repairs/2026-11-17-e349-watermarks-BEFORE.json';
(async () => {
  const cfg = await s.getSheetData('World_Config');
  const cc = Number((cfg.find((r) => r[0] === 'cycleCount') || [])[1]);
  const led = await s.getSheetData('Simulation_Ledger'); const h = led[0], iP = h.indexOf('POPID'), iD = h.indexOf('DialState');
  if (iP < 0 || iD < 0) throw new Error('columns not found');
  const col = s.columnIndexToLetter(iD); const ups = [], back = [], past = [];
  led.forEach((r, i) => { if (!i || !r[iD]) return; let d; try { d = JSON.parse(r[iD]); } catch (e) { return; }
    if (d.folded > cc) past.push(String(r[iP]));
    if (!WANT.includes(String(r[iP]))) return;
    if (d.folded !== 133) throw new Error(r[iP] + ' is at ' + d.folded + ', not 133 — stop');
    back.push({ row: i + 1, pop: r[iP], was: r[iD] }); d.folded = 107; ups.push({ row: i + 1, pop: r[iP], value: JSON.stringify(d) }); });
  console.log(`live cycleCount ${cc}; rows past it: ${past.length}; the thirteen found at 133: ${ups.length}`);
  if (ups.length !== 13 || past.length !== 13 || past.some((p) => !WANT.includes(p))) throw new Error('not exactly the thirteen — stop');
  for (const u of ups) { const a = JSON.parse(back.find((b) => b.pop === u.pop).was), b = JSON.parse(u.value); delete a.folded; delete b.folded; if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(u.pop + ': more than the mark would change — stop'); }
  if (!APPLY) { console.log('dry: would set ' + ups.map((u) => u.pop).join(' ') + ` (${col}${ups[0].row}…) to 107`); return; }
  fs.writeFileSync(BACKUP, JSON.stringify(back, null, 1)); console.log('backup ' + BACKUP);
  await s.batchUpdate(ups.map((u) => ({ range: `Simulation_Ledger!${col}${u.row}`, values: [[u.value]] })));
  const after = await s.getSheetData('Simulation_Ledger'); let ok = 0;
  ups.forEach((u) => { const r = after[u.row - 1]; if (String(r[iP]) === String(u.pop) && r[iD] === u.value) ok++; });
  console.log(ok === 13 ? 'read back: 13 of 13 at 107, cells otherwise unchanged' : 'READ-BACK MISMATCH ' + ok + ' of 13'); process.exit(ok === 13 ? 0 : 1);
})().catch((e) => { console.error('STOP', e.message); process.exit(1); });
