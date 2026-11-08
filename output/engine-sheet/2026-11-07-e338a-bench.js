// engine.338 Task 2a bench helpers on SANDBOX 1004 (no token echoed). Bench-only citizens and feed rows, marker E338-BENCH NON-CANON.
//   node 2026-11-07-e338a-bench.js plant <N> <1|2>   fire 1: three bench players cloned from live GAME rows (Tier 1 / 2 / 3) + a
//                                                   retirement row for each at N; fire 2: the same three rows again (idempotent)
//   node 2026-11-07-e338a-bench.js read <label> <N>  readback, one JSON line appended to 2026-11-07-e338a-reads.jsonl
// Copied from 2026-11-07-e333-bench.js. Live Vinnie (POP-00001, the builder's own C115 retirement row) rides along on fire 1.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-07-e338a-reads.jsonl';
const MARK = 'E338-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

// three bench players, each cloned from a live GAME row of the Tier under test (every other cell real)
const BENCH_POPS = {
  'POP-99338': { from: 'POP-00001', First: 'Bench', Last: 'Tierone', RoleType: "Designated Hitter, Oakland A's", tier: 1, expectIncome: 250000 },
  'POP-99339': { from: 'POP-00033', First: 'Bench', Last: 'Tiertwo', RoleType: "Starting Pitcher, Oakland A's", tier: 2, expectIncome: 120000 },
  'POP-99340': { from: 'POP-00053', First: 'Bench', Last: 'Tierthree', RoleType: "Third Baseman, Oakland A's", tier: 3, expectIncome: null } // untouched
};
const BLANK = ['SpouseId', 'HouseholdId', 'ParentIds', 'ChildrenIds', 'SMPageId', 'Famous', 'MemoryRegisters', 'StatusStartCycle', 'HealthCause', 'LineageId'];

function feedRows(N) {
  const A = o => Object.assign({ Cycle: N, TeamsUsed: "A's", SeasonType: 'off-season', Notes: MARK, EventType: 'player-feature', EventTrigger: 'retirement' }, o);
  return [A({ NamesUsed: 'Bench Tierone (DH)' }), A({ NamesUsed: 'Bench Tiertwo (SP)' }), A({ NamesUsed: 'Bench Tierthree (3B)' })];
}

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'plant') {
    const N = Number(a1), fire = a2;
    const feed = obj(await sh.getSheetData('Oakland_Sports_Feed'));
    if (feed.rows.some(r => num(r.Cycle) === N && String(r.Notes).indexOf(MARK) === 0)) throw new Error('bench already has E338 C' + N + ' feed rows — stop');
    const liveAtN = feed.rows.filter(r => num(r.Cycle) === N).map(r => r.TeamsUsed + ':' + r.EventType + ':' + (r.EventTrigger || '-') + ':' + r.NamesUsed);
    const led = await sh.getSheetData('Simulation_Ledger');
    const H = led[0].map(x => String(x).trim());
    const col = n => H.indexOf(n);
    const have = new Set(led.slice(1).map(r => String(r[col('POPID')])));
    if (fire === '1') {
      for (const pop of Object.keys(BENCH_POPS)) if (have.has(pop)) throw new Error(pop + ' already on the bench — stop');
      const planted = [];
      for (const pop of Object.keys(BENCH_POPS)) {
        const spec = BENCH_POPS[pop];
        const src = led.slice(1).find(r => String(r[col('POPID')]) === spec.from);
        if (!src) throw new Error('template ' + spec.from + ' not on the bench');
        if (Number(src[col('Tier')]) !== spec.tier) throw new Error('template ' + spec.from + ' is Tier ' + src[col('Tier')] + ', not ' + spec.tier);
        const row = src.slice();
        row[col('POPID')] = pop; row[col('First')] = spec.First; row[col('Last')] = spec.Last;
        row[col('RoleType')] = spec.RoleType; row[col('Status')] = 'Active'; row[col('ClockMode')] = 'GAME'; row[col('EconomicProfileKey')] = 'SPORTS_OVERRIDE';
        row[col('LifeHistory')] = 'Y3C10 — [Sports] bench-only fixture (' + MARK + ')';
        row[col('CitizenBio')] = MARK + ' bench-only row cloned from ' + spec.from + '. ' + spec.RoleType + '.';
        row[col('UsageCount')] = 0; row[col('MaritalStatus')] = 'single'; row[col('NumChildren')] = 0;
        for (const b of BLANK) if (col(b) >= 0) row[col(b)] = '';
        planted.push(row);
      }
      await sh.appendRows('Simulation_Ledger', planted);
    } else {
      for (const pop of Object.keys(BENCH_POPS)) if (!have.has(pop)) throw new Error(pop + ' not on the bench — fire 1 did not plant it');
    }
    const rows = feedRows(N);
    for (const r of rows) for (const k of Object.keys(r)) if (!feed.h.includes(k)) throw new Error('no header ' + k);
    await sh.appendRows('Oakland_Sports_Feed', rows.map(r => feed.h.map(h => r[h] === undefined ? '' : r[h])));
    const back = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N && String(r.Notes).indexOf(MARK) === 0);
    const led2 = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => BENCH_POPS[r.POPID]);
    console.log(JSON.stringify({ fire, N, liveRowsAtN: liveAtN, planted: rows.length, readBack: back.length,
      triggers: back.map(r => r.EventTrigger + ':' + r.NamesUsed), benchCitizens: led2.map(r => r.POPID + ' ' + r.First + ' ' + r.Last + ' T' + r.Tier + ' ' + r.ClockMode + '/' + r.Status + ' inc ' + r.Income) }));
    process.exit(back.length === rows.length && led2.length === 3 ? 0 : 1);
  }
  if (cmd !== 'read') throw new Error('usage: plant <N> <1|2> | read <label> <N>');

  const label = a1, N = Number(a2);
  const READ = Object.assign({ 'POP-00001': { live: true, tier: 1, expectIncome: 250000 } }, BENCH_POPS);
  const led = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => READ[r.POPID]);
  const citizens = led.map(r => ({ pop: r.POPID, name: r.First + ' ' + r.Last, clock: r.ClockMode, econ: r.EconomicProfileKey, role: r.RoleType, status: r.Status,
    tier: r.Tier, income: r.Income, netWorth: r.NetWorth, savingsRate: r.SavingsRate, expectIncome: READ[r.POPID].expectIncome,
    incomeOk: READ[r.POPID].expectIncome === null ? null : Number(r.Income) === READ[r.POPID].expectIncome,
    retirementLines: String(r.LifeHistory).split('\n').filter(l => /\[Retirement\]/.test(l)) }));
  const lh = obj(await sh.getSheetData('LifeHistory_Log')).rows.filter(r => num(r.Cycle) === N && READ[r.POPID])
    .map(r => ({ pop: r.POPID, tag: String(r.EventTag), text: String(r.EventText) }));
  const wc = await sh.getSheetData('World_Config');
  const key = k => { const r = wc.find(x => String(x[0]).trim() === k); return r ? r[1] : undefined; };
  const ee = obj(await sh.getSheetData('Engine_Errors'));
  const eeN = ee.rows.filter(r => num(r.Cycle) === N).map(r => Object.values(r).join(' | ').slice(0, 220));
  const out = { label, N, at: new Date().toISOString(), cycleCount: key('cycleCount'),
    config338: { postCareerIncomeTier1: key('postCareerIncomeTier1'), postCareerIncomeTier2: key('postCareerIncomeTier2'), worldConfigRows: wc.length - 1 },
    feedRowsAtN: obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N).length,
    citizens, logRows: lh, engineErrorsAtN: eeN };
  fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
