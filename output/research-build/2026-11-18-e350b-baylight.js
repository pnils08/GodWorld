// engine.350 — the two Baylight-office lines go to the people who work in those offices.
// Builder 2026-11-18, on who should draw them: "Which ever it logical to how life works".
// Their Conditions cells on Event_Content_Ledger were `wealth>=7` and `lifestate=working; wealth>=7` (anyone wealthy,
// 435 citizens after C116; of the 143 times the two lines were drawn, 5 were by someone who works in those offices);
// both become `lifestate=working; employer=<the four Baylight District tech offices>` (12 citizens after C116).
// Needs the stage-55 loader (the `employer` field); on an older loader the two rows are skipped, not drawn.
//   node …-e350b-baylight.js plan  [--sheet <id>]     what would change (no write)
//   node …-e350b-baylight.js apply [--sheet <id>]     write the two Conditions cells, read back
//   node …-e350b-baylight.js who <cycle...> [--sheet <id>]   who drew the two lines in those Cycles, and where they work
require('/root/GodWorld/lib/env');
const iS = process.argv.indexOf('--sheet');
if (iS >= 0) { const id = String(process.argv[iS + 1] || ''); if (!id || id.indexOf('--') === 0) throw new Error('--sheet needs an id'); process.env.GODWORLD_SHEET_ID = id; }
const s = require('/root/GodWorld/lib/sheets');
const OFFICES = ['BIZ-00001', 'BIZ-00002', 'BIZ-00003', 'BIZ-00004'];
const OLD = ['wealth>=7', 'lifestate=working; wealth>=7'], NEW = 'lifestate=working; employer=' + OFFICES.join('|');
const LINES = [
  'badged into the Baylight office early and tried not to think about the protestors from last month',
  'drank the free cold brew in the company kitchen and felt completely disconnected from the neighborhood outside'
];
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const mode = process.argv[2];
  if (mode === 'plan' || mode === 'apply') {
    const biz = await s.getSheetAsObjects('Business_Ledger');
    OFFICES.forEach((id) => { const b = biz.find((x) => x.BIZ_ID === id); if (!b || !/Baylight/i.test(b.Neighborhood || '')) throw new Error(id + ' is not a Baylight District business on this sheet'); console.log(`  ${id} ${b.Name} — ${b.Sector}, ${b.Neighborhood}`); });
    const data = await s.getRawSheetData('Event_Content_Ledger'); const h = data[0], ix = (n) => h.indexOf(n);
    const todo = [], done = [];
    LINES.forEach((t) => {
      const hits = data.map((r, i) => ({ r, row: i + 1 })).filter((x) => x.row > 1 && norm(x.r[ix('Text')]) === norm(t));
      if (hits.length !== 1) throw new Error('expected one row for: ' + t + ' — found ' + hits.length);
      const cur = String(hits[0].r[ix('Conditions')] || '').trim();
      if (hits[0].r[ix('PoolKey')] !== 'work.tech') throw new Error('row R' + hits[0].row + ' is not in work.tech');
      if (cur === NEW) done.push(hits[0].row);
      else if (OLD.indexOf(cur) >= 0) todo.push(hits[0].row);
      else throw new Error('row R' + hits[0].row + ' Conditions is neither the old nor the new cell: ' + cur);
    });
    console.log(`Conditions: ${todo.length} to write (${todo.map((r) => 'R' + r).join(' ')}), ${done.length} already set -> ${NEW}`);
    if (mode === 'plan' || !todo.length) { console.log(mode === 'plan' ? 'plan — nothing written' : 'nothing to write'); return; }
    const col = s.columnIndexToLetter(ix('Conditions'));
    await s.batchUpdate(todo.map((r) => ({ range: 'Event_Content_Ledger!' + col + r, values: [[NEW]] })));
    const after = await s.getRawSheetData('Event_Content_Ledger');
    const bad = todo.filter((r) => String(after[r - 1][ix('Conditions')] || '').trim() !== NEW);
    if (bad.length) throw new Error('read-back missed R' + bad.join(' R'));
    console.log('wrote ' + todo.length + ' Conditions cells; read back OK');
    return;
  }
  if (mode === 'who') {
    const cycles = process.argv.slice(3).filter((a) => /^\d+$/.test(a)).map(Number); if (!cycles.length) throw new Error('who <cycle...>');
    const stamps = cycles.map((c) => 'Y' + (Math.floor((c - 1) / 52) + 1) + 'C' + (((c - 1) % 52) + 1));
    const led = await s.getSheetAsObjects('Simulation_Ledger');
    let inside = 0, outside = 0, eligible = 0; const out = [];
    led.forEach((r) => {
      const emp = String(r.EmployerBizId || '').trim();
      if (OFFICES.indexOf(emp) >= 0) eligible++;
      String(r.LifeHistory || '').split('\n').forEach((ln) => {
        const m = /^(\S+) — \[([^\]]+)\] (.*)$/.exec(ln); if (!m || stamps.indexOf(m[1]) < 0) return;
        if (!LINES.some((t) => norm(m[3]).indexOf(norm(t)) === 0)) return;
        if (OFFICES.indexOf(emp) >= 0) inside++; else outside++;
        out.push(`  ${m[1]} ${r.POPID} ${emp || '(no employer)'} ${r.RoleType} [${m[2]}]`);
      });
    });
    console.log(`who ${stamps.join(',')}: ${eligible} citizens work at the four offices; the two lines were drawn ${inside} time(s) by them, ${outside} time(s) by anyone else`);
    out.slice(0, 20).forEach((l) => console.log(l));
    return;
  }
  throw new Error('mode: plan | apply | who');
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
