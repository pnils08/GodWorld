// engine.304 cut 1 bench readback (plan engine.286 §engine.304 D7/D8/D9): the GC pool by adult/youth × sex, rows
// the feeder made and the wave took this Cycle, every minor who reached the ledger this Cycle (Tier, MaritalStatus,
// RoleType, employer, HouseholdId, household row), the two World_Config cells, Engine_Errors. Read-only, bench only.
//   node 2026-10-19-e304c1-poolread.js <cycle>
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env already points at the bench — refuse to guess live');
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs');
const N = Number(process.argv[2]); if (!(N >= 112)) throw new Error('cycle');
const SIM_YEAR = 2042;
(async () => {
  const gc = await sheets.getSheetData('Generic_Citizens'); const gh = gc[0]; const g = n => gh.indexOf(n);
  const pool = { aF: 0, aM: 0, yF: 0, yM: 0 }, made = { aF: 0, aM: 0, yF: 0, yM: 0 }, took = { aF: 0, aM: 0, yF: 0, yM: 0 };
  for (const r of gc.slice(1)) {
    const by = Number(r[g('BirthYear')]) || 0, age = by ? SIM_YEAR - by : (Number(r[g('Age')]) || 30);
    const k = (age < 18 ? 'y' : 'a') + (String(r[g('Sex')]).toLowerCase() === 'female' ? 'F' : 'M');
    const st = String(r[g('Status')]), ec = String(r[g('EmergedCycle')]);
    if (st === 'Active') pool[k]++;
    if (ec === 'Cycle ' + N && st === 'Active') made[k]++;
    if (ec === 'Cycle ' + N && st === 'Emerged') took[k]++;
  }
  const sl = await sheets.getSheetData('Simulation_Ledger'); const H = sl[0]; const S = n => H.indexOf(n);
  const hh = await sheets.getSheetData('Household_Ledger'); const HH = hh[0]; const hhById = {}; hh.slice(1).forEach(r => { hhById[r[HH.indexOf('HouseholdId')]] = r; });
  const LOG = '/root/GodWorld/output/engine-sheet/2026-10-19-e304c1-bench.jsonl';
  const popNum = v => Number(String(v || '').replace(/\D/g, '')) || 0;
  const maxPop = Math.max.apply(null, sl.slice(1).map(r => popNum(r[S('POPID')])));
  const prev = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(o => o.cycle === N - 1).pop() : null;
  const since = prev ? prev.maxPop : maxPop; // no prior read → nothing counts as new
  const newMinors = [];
  for (const r of sl.slice(1)) {
    const by = Number(r[S('BirthYear')]) || 0; if (!by || SIM_YEAR - by >= 18) continue;
    if (popNum(r[S('POPID')]) <= since) continue;
    const hid = String(r[S('HouseholdId')] || ''); const h = hhById[hid];
    newMinors.push({ pop: r[S('POPID')], name: r[S('First')] + ' ' + r[S('Last')], age: SIM_YEAR - by, tier: r[S('Tier')], ms: r[S('MaritalStatus')], role: r[S('RoleType')],
      emp: r[S('EmployerBizId')] || '', hh: hid, hhType: h ? h[HH.indexOf('HouseholdType')] : (hid ? 'MISSING ROW' : ''), hhHead: h ? h[HH.indexOf('HeadOfHousehold')] : '' });
  }
  const wc = await sheets.getSheetData('World_Config'); const cfg = {}; wc.forEach(r => { if (/gcPoolFloorYouth|gcPoolMaxPerCycle/.test(String(r[0]))) cfg[r[0]] = r[1]; });
  const ee = await sheets.getSheetData('Engine_Errors'); const eeN = ee.slice(1).filter(r => String(r.join(' ')).includes(String(N))).length;
  const out = { cycle: N, maxPop, pool, made, took, cfg, engineErrorsMentioningCycle: eeN, newMinorsOnLedger: newMinors };
  fs.appendFileSync('/root/GodWorld/output/engine-sheet/2026-10-19-e304c1-bench.jsonl', JSON.stringify(out) + '\n');
  console.log(`C${N} pool A ${pool.aF}F/${pool.aM}M Y ${pool.yF}F/${pool.yM}M | made A ${made.aF}F/${made.aM}M Y ${made.yF}F/${made.yM}M | wave took A ${took.aF}F/${took.aM}M Y ${took.yF}F/${took.yM}M | cfg ${JSON.stringify(cfg)} | EE~${eeN}`);
  newMinors.forEach(m => console.log('  minor on ledger: ' + JSON.stringify(m)));
})().catch(e => { console.error(e.message); process.exit(1); });
