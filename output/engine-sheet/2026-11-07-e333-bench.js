// engine.333 bench helpers on SANDBOX 1004 (no token echoed). Bench-only citizens and feed rows, marker E333-BENCH NON-CANON.
//   node 2026-11-07-e333-bench.js plant <N> <1|2>     fire 1: three bench citizens cloned from live rows + the fire-1 feed rows;
//                                                     fire 2: the "dashboard" stamp on Bench Stamped + the fire-2 feed rows
//   node 2026-11-07-e333-bench.js read <label> <N>    readback, one JSON line appended to 2026-11-07-e333-reads.jsonl
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-07-e333-reads.jsonl';
const MARK = 'E333-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

// three bench citizens, each cloned from a live GAME row so every other cell (DialState, economics, hood) is real
const BENCH_POPS = {
  'POP-99333': { from: 'POP-00001', First: 'Bench', Last: 'Retiree', Name: 'Bench Retiree', RoleType: "Designated Hitter, Oakland A's" },
  'POP-99334': { from: 'POP-00025', First: 'Bench', Last: 'Injuree', Name: 'Bench Injuree', RoleType: "Starting Pitcher, Oakland A's" },
  'POP-99335': { from: 'POP-00025', First: 'Bench', Last: 'Stamped', Name: 'Bench Stamped', RoleType: "Third Baseman, Oakland A's" }
};
const BLANK = ['SpouseId', 'HouseholdId', 'ParentIds', 'ChildrenIds', 'SMPageId', 'Famous', 'MemoryRegisters', 'StatusStartCycle', 'HealthCause', 'LineageId'];

function feedRows(N, fire) {
  const A = o => Object.assign({ Cycle: N, TeamsUsed: "A's", SeasonType: 'off-season', Notes: MARK }, o);
  if (fire === '1') return [
    A({ EventType: 'player-feature', EventTrigger: 'retirement', NamesUsed: 'Bench Retiree (DH)' }),
    A({ EventType: 'injury', EventTrigger: 'injury', NamesUsed: 'Bench Injuree (SP)', Notes: MARK + ' hamstring' }),
    A({ EventType: 'player-feature', EventTrigger: 'award', NamesUsed: 'Bench Injuree (SP)' })
  ];
  if (fire === '2') return [
    A({ EventType: 'player-feature', EventTrigger: 'retirement', NamesUsed: 'Bench Retiree (DH)' }),
    A({ EventType: 'injury', EventTrigger: 'injury-return', NamesUsed: 'Bench Injuree (SP)' }),
    A({ EventType: 'injury', EventTrigger: 'injury', NamesUsed: 'Bench Stamped (3B)' })
  ];
  throw new Error('fire must be 1 or 2');
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
    // live rows for N (the builder enters next Cycle's feed ahead of Sunday) ride along — they are live data, not a plant;
    // only a second E333 plant at N is refused
    if (feed.rows.some(r => num(r.Cycle) === N && String(r.Notes).indexOf(MARK) === 0)) throw new Error('bench already has E333 C' + N + ' feed rows — stop');
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
        const row = src.slice();
        row[col('POPID')] = pop; row[col('First')] = spec.First; row[col('Last')] = spec.Last; // no Name column on the sheet (G-PF22)
        row[col('RoleType')] = spec.RoleType; row[col('Status')] = 'Active'; row[col('ClockMode')] = 'GAME'; row[col('EconomicProfileKey')] = 'SPORTS_OVERRIDE';
        row[col('LifeHistory')] = 'Y3C10 — [Sports] bench-only fixture (' + MARK + ')';
        row[col('CitizenBio')] = MARK + ' bench-only row cloned from ' + spec.from + '. ' + spec.RoleType + '.';
        row[col('UsageCount')] = 0; row[col('MaritalStatus')] = 'single'; row[col('NumChildren')] = 0;
        for (const b of BLANK) if (col(b) >= 0) row[col(b)] = '';
        planted.push(row);
      }
      await sh.appendRows('Simulation_Ledger', planted);
    } else {
      // the "dashboard" stamp on Bench Stamped: Status injured, StatusStartCycle = this Cycle, its own cause — no bed
      const i = led.slice(1).findIndex(r => String(r[col('POPID')]) === 'POP-99335');
      if (i < 0) throw new Error('POP-99335 not on the bench — fire 1 did not plant it');
      await sh.updateRowFields('Simulation_Ledger', i + 2, { Status: 'injured', StatusStartCycle: N, HealthCause: 'dashboard: ankle (' + MARK + ')' });
    }
    const rows = feedRows(N, fire);
    for (const r of rows) for (const k of Object.keys(r)) if (!feed.h.includes(k)) throw new Error('no header ' + k);
    await sh.appendRows('Oakland_Sports_Feed', rows.map(r => feed.h.map(h => r[h] === undefined ? '' : r[h])));
    const back = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N && String(r.Notes).indexOf(MARK) === 0);
    const led2 = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => BENCH_POPS[r.POPID]);
    console.log(JSON.stringify({ fire, N, liveRowsAtN: liveAtN, planted: rows.length, readBack: back.length, marked: back.filter(r => String(r.Notes).indexOf(MARK) === 0).length,
      triggers: back.map(r => r.EventTrigger + ':' + r.NamesUsed), benchCitizens: led2.map(r => r.POPID + ' ' + r.First + ' ' + r.Last + ' ' + r.ClockMode + '/' + r.Status + '/' + (r.StatusStartCycle || '-')) }));
    process.exit(back.length === rows.length && led2.length === 3 ? 0 : 1);
  }
  if (cmd !== 'read') throw new Error('usage: plant <N> <1|2> | read <label> <N>');

  const label = a1, N = Number(a2);
  const READ = Object.assign({ 'POP-00001': { live: true } }, BENCH_POPS); // live Vinnie rides along: his real C115 row is on the feed
  const led = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => READ[r.POPID]);
  const citizens = led.map(r => ({ pop: r.POPID, name: r.First + ' ' + r.Last, clock: r.ClockMode, econ: r.EconomicProfileKey, role: r.RoleType, status: r.Status,
    statusStart: r.StatusStartCycle, cause: r.HealthCause, tier: r.Tier, employer: r.EmployerBizId, uni: r['UNI (y/n)'], stage: r.CareerStage, income: r.Income,
    bioHead: String(r.CitizenBio).slice(0, 90), lifeTail: String(r.LifeHistory).split('\n').slice(-4) }));
  const lh = obj(await sh.getSheetData('LifeHistory_Log')).rows.filter(r => num(r.Cycle) === N && READ[r.POPID])
    .map(r => ({ pop: r.POPID, tag: String(r.EventTag), text: String(r.EventText) }));
  const hosp = obj(await sh.getSheetData('Hospital_Ledger')).rows.filter(r => READ[r.POPID])
    .map(r => ({ pop: r.POPID, admit: r.AdmitCycle, status: r.Status, discharge: r.DischargeCycle, outcome: r.Outcome, intakeType: r.IntakeType,
      source: r.SourceSystem, eventId: r.SourceEventId, prior: r.PriorStatus, cause: r.Cause }));
  const rip = obj(await sh.getSheetData('Ripple_Ledger'));
  const ck = k => rip.h.find(h => h.toLowerCase() === k);
  const ripples = rip.rows.filter(r => num(r[ck('cycle')]) === N && String(r[ck('causetype')]).toLowerCase() === 'sports' && /gameNight/i.test(String(r[ck('causeid')])))
    .map(r => ({ effect: r[ck('effecttype')], detail: String(r[ck('causedetail')]), mag: r[ck('magnitude')] }));
  const ee = obj(await sh.getSheetData('Engine_Errors'));
  const eeN = ee.rows.filter(r => num(r.Cycle) === N).map(r => Object.values(r).join(' | ').slice(0, 220));
  const hooks = obj(await sh.getSheetData('Story_Hook_Deck')).rows.filter(r => num(r.Cycle) === N && String(r.Domain).toUpperCase() === 'SPORTS')
    .map(r => String(r.HookText).slice(0, 120));
  const wk = obj([['Key', 'Value'], ...(await sh.getSheetData('World_Config')).slice(1)]).rows;
  const out = { label, N, at: new Date().toISOString(), cycleCount: (wk.find(r => r.Key === 'cycleCount') || {}).Value,
    feedRowsAtN: obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N).length,
    citizens, logRows: lh, hospital: hosp, gameNightRipple: ripples, sportsHooks: hooks, engineErrorsAtN: eeN };
  fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
