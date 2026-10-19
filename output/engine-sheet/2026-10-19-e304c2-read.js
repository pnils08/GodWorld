// engine.304 cuts 1–3 bench readback (plan engine.286 §engine.304): per Cycle — the pool (adult F/M, youth F/M),
// Family links standing by role, links made and released this Cycle (EmergenceContext notes) with the citizen's
// Tier, family arrivals on the ledger and whether each is wired (spouse ↔ SpouseId, child → ParentIds, parent →
// ChildrenIds), and integrity: a Family row with no live Active citizen, a Family row missing FamilyOf/Role, a row
// that left the pool with a link but is not wired. Read-only, bench only.   node 2026-10-19-e304c2-read.js <cycle>
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env already points at the bench — refuse to guess live');
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs');
const N = Number(process.argv[2]); if (!(N >= 112)) throw new Error('cycle');
const Y = 2042;
const LOG = '/root/GodWorld/output/engine-sheet/2026-10-19-e304c2-bench.jsonl';
(async () => {
  const gc = await sheets.getSheetData('Generic_Citizens'); const gh = gc[0]; const g = n => gh.indexOf(n);
  const sl = await sheets.getSheetData('Simulation_Ledger'); const H = sl[0]; const S = n => H.indexOf(n);
  const byPop = {}; const byName = {};
  sl.slice(1).forEach(r => { byPop[r[S('POPID')]] = r; byName[(r[S('First')] + ' ' + r[S('Last')]).toLowerCase()] = r; });
  const pool = { aF: 0, aM: 0, yF: 0, yM: 0 }, standing = { spouse: 0, child: 0, parent: 0 }, made = [], bad = [];
  let released = 0;
  const arrivals = [];
  for (const r of gc.slice(1)) {
    const st = String(r[g('Status')]), by = Number(r[g('BirthYear')]) || 0, age = by ? Y - by : (Number(r[g('Age')]) || 30);
    const k = (age < 18 ? 'y' : 'a') + (String(r[g('Sex')]).toLowerCase() === 'female' ? 'F' : 'M');
    if (st === 'Active') pool[k]++;
    const of = g('FamilyOf') >= 0 ? String(r[g('FamilyOf')] || '') : '', role = g('FamilyRole') >= 0 ? String(r[g('FamilyRole')] || '') : '';
    const ctx = String(r[g('EmergenceContext')] || '');
    if (st === 'Family') {
      if (standing[role] !== undefined) standing[role]++;
      if (!of || !role) bad.push('Family row without link: ' + r[g('First')] + ' ' + r[g('Last')]);
      const a = byPop[of]; if (!a || String(a[S('Status')]).toLowerCase() !== 'active') bad.push('Family row of a missing/inactive citizen: ' + r[g('First')] + ' ' + r[g('Last')] + ' → ' + of);
    }
    const mk = ctx.match(new RegExp('Family: (spouse|child|parent) of (.+?) \\((POP-\\d{5})\\), C' + N + '(?!\\d)'));
    if (mk) { const a = byPop[mk[3]]; made.push({ role: mk[1], of: mk[3], tier: a ? a[S('Tier')] : '?', name: r[g('First')] + ' ' + r[g('Last')], age }); }
    if (new RegExp('Family link released, C' + N + '(?!\\d)').test(ctx)) released++;
    if (st === 'Emerged' && of) { // left the pool with a link → must be wired on the ledger
      const lr = byName[(r[g('First')] + ' ' + r[g('Last')]).toLowerCase()];
      let wired = false;
      if (lr) {
        if (role === 'spouse') wired = String(lr[S('SpouseId')]).includes(of) && String((byPop[of] || [])[S('SpouseId')] || '').includes(lr[S('POPID')]);
        if (role === 'child') wired = String(lr[S('ParentIds')]).includes(of);
        if (role === 'parent') wired = String(lr[S('ChildrenIds')]).includes(of);
      }
      arrivals.push({ name: r[g('First')] + ' ' + r[g('Last')], role, of, pop: lr ? lr[S('POPID')] : null, wired });
      if (!wired) bad.push('arrived unwired: ' + r[g('First')] + ' ' + r[g('Last')] + ' (' + role + ' of ' + of + ')');
    }
  }
  const out = { cycle: N, pool, standing, made, released, arrivalsTotal: arrivals.length, arrivals, bad };
  fs.appendFileSync(LOG, JSON.stringify(out) + '\n');
  const tiers = made.reduce((m, x) => { m['T' + x.tier] = (m['T' + x.tier] || 0) + 1; return m; }, {});
  console.log(`C${N} pool A ${pool.aF}F/${pool.aM}M Y ${pool.yF}F/${pool.yM}M | standing S${standing.spouse}/C${standing.child}/P${standing.parent} | made ${made.length} ${JSON.stringify(tiers)} | released ${released} | arrivals to date ${arrivals.length} | bad ${bad.length}`);
  made.forEach(m => console.log(`  link: ${m.name} (${m.age}) ${m.role} of ${m.of} T${m.tier}`));
  bad.forEach(b => console.log('  BAD ' + b));
  if (bad.length) process.exitCode = 4;
})().catch(e => { console.error(e.message); process.exit(1); });
