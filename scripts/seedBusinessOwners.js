#!/usr/bin/env node
'use strict';
// engine.96 Task 12 (S440, builder-direct 2026-09-08): seed the top profit
// tier with owners NOW, through the owner door's own selector — not by hand.
//
// Loads the live Business_Ledger, Generic_Citizens, Simulation_Ledger and
// Advancement_Intake1 into the engine's own mock-sheet harness, restricts the
// door's pool to the top-N eligible businesses by profit, forces the event
// (bizOwnerMintP = 1) and gives it N slots, so every one of them draws its
// citizen from its own hood exactly as the engine would (whiffs stay whiffs).
// The queued rows are then written to the LIVE Advancement_Intake1 with an
// explicit A<row> range (appendRows' bare-sheet-name range bug, S438b) —
// updateRangeByPosition's startCol is 0-BASED (the first apply passed 1 and
// landed everything one column right; repaired in place) — and read back. They mint at the builder's next live fire through
// processAdvancementRows_; wireBusinessOwners_ writes Key_Personnel if the
// door is on PROD by then, else scripts/backfill by name (the six-founder
// follow-up) does it.
//
//   node scripts/seedBusinessOwners.js            # dry run — the plan only
//   node scripts/seedBusinessOwners.js --apply    # write the queue rows
//   --top=N (default 8)   --seed=N (default 106, the cycle)
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const sheets = require('../lib/sheets');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const TOP = Number((args.find(a => a.startsWith('--top=')) || '--top=8').slice(6));
const SEED = Number((args.find(a => a.startsWith('--seed=')) || '--seed=106').slice(7));
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkSheet(rows) {
  const s = { rows, appended: [], setCells: [] };
  s.getDataRange = () => ({ getValues: () => s.rows.map(r => r.slice()) });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.getMaxColumns = () => Math.max(...s.rows.map(r => r.length));
  s.insertColumnsAfter = () => {};
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; s.setCells.push([r, c, v]); },
  });
  return s;
}
const logs = [];
const sandbox = {
  Logger: { log(m) { logs.push(String(m)); } },
  queueAppendIntent_: () => {}, queueCellIntent_: () => {}, recordRipple_: () => {},
  inWorldStamp_: () => '', jobReferencePay_: () => null, estimateRent_: () => 1900, inferSexFromFirstName_: () => '',
  getCoreSimNeighborhoods_: () => [], resolveHoodOrChild_: (ctx, n) => n, setCurrentField_: (a) => a, roleFieldOf_: () => null,
  requireTab_: (ss, name) => ss.getSheetByName(name),
  safeRand_: (ctx) => ctx.rng,
  businessProfit_: (rev, empCount, avgSalary) => { // generationalWealthEngine.js:927
    const r = Number(String(rev === null || rev === undefined ? '' : rev).replace(/[$,\s]/g, ''));
    if (rev === '' || rev === null || rev === undefined || isNaN(r)) return null;
    return Math.round(r - (Number(empCount) || 0) * (Number(avgSalary) || 0));
  },
  nextPopIdLocked_: () => { throw new Error('seed never mints'); },
};
const src = R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('utilities/citizenDerivation.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { checkBusinessOwnerPromotions_, buildOwnerDoorPool_, OWNER_QUEUE_COLS_ };')(...Object.values(sandbox));

(async () => {
  const [biz, gc, sl, adv] = await Promise.all(['Business_Ledger', 'Generic_Citizens', 'Simulation_Ledger', 'Advancement_Intake1'].map(sheets.getSheetData));
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return isNaN(n) ? v : n; };
  const numeric = (rows, cols) => rows.map((r, i) => i === 0 ? r : r.map((v, c) => cols.includes(rows[0][c]) ? num(v) : v));
  const cfg = { bizOwnerMintP: 1, bizOwnerMaxStaff: 250, bizOwnerMinAge: 35, bizOwnerMinProfit: 0 };
  const ctx0 = { ledger: { headers: sl[0].slice(), rows: sl.slice(1) }, config: cfg, ss: { getSheetByName: (n) => ({ Business_Ledger: mkSheet(numeric(biz, ['Employee_Count', 'Avg_Salary', 'Annual_Revenue'])) })[n] || null } };
  const pool = E.buildOwnerDoorPool_(ctx0, cfg).sort((a, b) => b.profit - a.profit);
  const top = pool.slice(0, TOP);
  console.log(`eligible ${pool.length}; top ${TOP} by profit:`);
  top.forEach(p => console.log(`  ${p.id} ${p.name.padEnd(34)} ${p.hood.padEnd(16)} profit $${p.profit.toLocaleString()}`));
  const keep = new Set(top.map(p => p.id));
  const bizTop = [biz[0]].concat(biz.slice(1).filter(r => keep.has(String(r[0]).trim())));
  const advMock = mkSheet(adv.map(r => r.slice()));
  const world = {
    Business_Ledger: mkSheet(numeric(bizTop, ['Employee_Count', 'Avg_Salary', 'Annual_Revenue'])),
    Generic_Citizens: mkSheet(numeric(gc, ['Age', 'BirthYear'])),
    Advancement_Intake1: advMock,
  };
  const ctx = { ledger: ctx0.ledger, summary: { cycleId: SEED }, config: Object.assign({ cycleCount: SEED }, cfg), rng: mulberry32(SEED * 7919 + 12), ss: { getSheetByName: (n) => world[n] || null } };
  const res = E.checkBusinessOwnerPromotions_(ctx, SEED, TOP);
  console.log(`\ndoor: ${JSON.stringify(res)}`);
  logs.filter(m => /checkBusinessOwnerPromotions_/.test(m)).forEach(m => console.log('  ' + m.replace('checkBusinessOwnerPromotions_: ', '')));
  // name collisions with the live ledger → the populator would skip them; drop here, the engine door gets them next cycle
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const iF = sl[0].indexOf('First'), iL = sl[0].indexOf('Last');
  const onLedger = new Set(sl.slice(1).map(r => norm(r[iF]) + ' ' + norm(r[iL])));
  const qh = advMock.rows[0];
  const qF = qh.indexOf('First'), qL = qh.indexOf('Last'), qO = qh.indexOf('OwnerOfBizId');
  const queued = advMock.appended.filter(r => { const hit = onLedger.has(norm(r[qF]) + ' ' + norm(r[qL])); if (hit) console.log(`  DROP ${r[qF]} ${r[qL]} — name already on Simulation_Ledger`); return !hit; });
  // the queue must not already hold one of these businesses
  const liveOwn = adv[0].indexOf('OwnerOfBizId');
  const already = new Set(liveOwn >= 0 ? adv.slice(1).map(r => String(r[liveOwn] || '').trim()).filter(Boolean) : []);
  const rows = queued.filter(r => { const dup = already.has(r[qO]); if (dup) console.log(`  DROP ${r[qO]} — already queued live`); return !dup; });
  console.log(`\n${rows.length} row(s) to queue; live Advancement_Intake1 has ${adv.length - 1} data row(s), ${adv[0].length} header cols`);
  if (!APPLY) { console.log('dry run — pass --apply to write'); return; }

  // headers the door self-arms, at the same positions the mock put them
  const liveH = adv[0].slice();
  for (let c = liveH.length; c < qh.length; c++) {
    await sheets.updateRangeByPosition('Advancement_Intake1', 1, c, [[qh[c]]]); // startCol is 0-based (lib/sheets.js:637)
    console.log(`armed header ${qh[c]} at col ${c + 1}`);
  }
  const startRow = adv.length + 1;
  const width = qh.length;
  const values = rows.map(r => { const o = r.slice(0, width); while (o.length < width) o.push(''); return o; });
  await sheets.updateRangeByPosition('Advancement_Intake1', startRow, 0, values); // 0-based: column A
  const back = await sheets.getSheetData('Advancement_Intake1');
  let ok = 0;
  for (let i = 0; i < values.length; i++) {
    const live = back[startRow - 1 + i] || [];
    const same = values[i].every((v, c) => String(v) === String(live[c] === undefined ? '' : live[c]));
    console.log(`  row ${startRow + i}: ${same ? 'ok' : 'MISMATCH'} ${live[qF]} ${live[qL]} → ${live[qO]}`);
    if (same) ok++;
  }
  console.log(`read-back ${ok}/${values.length}; header now ${back[0].length} cols`);
  if (ok !== values.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
