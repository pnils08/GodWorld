/**
 * engine.38 Phase A — COVERAGE RULER.
 *
 * Measures how many of the live Simulation_Ledger citizens get >=1 life event
 * per cycle from generateCitizensEvents_ (the per-citizen texture workhorse —
 * the generator the LIMIT=25 throttle lives in, and the one Phase A modifies).
 *
 * It runs the REAL generator whole-file (same Apps Script global-injection
 * pattern as scripts/engine32MultiCycle.test.js), against the REAL ledger
 * pulled live via lib/sheets, with ctx.ss stubbed so LifeHistory_Log writes
 * are captured instead of hitting the sheet. Coverage = distinct POPIDs in the
 * captured event rows. Nothing is written back to any sheet.
 *
 * Scope: this measures generateCitizensEvents_ in ISOLATION — not whole-engine
 * coverage (household/conduct/career/civic generators add more). But this is
 * the dominant per-citizen lever and the one being tuned, so its coverage is
 * the right ruler for tuning `base` against the 60-80% acceptance band.
 *
 * Usage:
 *   node scripts/coverageReport.js [cycles]      # default 1 cycle
 *   node scripts/coverageReport.js 3             # 3 cycles, carry LifeHistory forward
 *
 * engine.38 Task A0. Plan: docs/plans/2026-06-19-living-city-full-population-coverage.md
 */

const fs = require('fs');
const path = require('path');
require('../lib/env'); // loads GODWORLD_SHEET_ID + service-account creds into process.env
const sheets = require('../lib/sheets.js');

// ── inject the Apps Script global surface (mirror engine32MultiCycle.test.js) ──
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('../utilities/compressLifeHistory.js');
global.getCitizenDialBands_ = C.getCitizenDialBands_;
global.Utilities = { formatDate: () => '2041-01-01 10:00' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.queueAppendIntent_ = () => {};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
global.mulberry32_ = mulberry32;

// ── load the real generator whole-file ──
const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + fnName + ';')();
};
const generateCitizensEvents_ = loadEngine(
  '../phase05-citizens/generateCitizensEvents.js', 'generateCitizensEvents_');

// ── capture LifeHistory_Log writes instead of hitting the sheet ──
// logState carries the append-only log forward across cycles so the A2 anti-inert
// floor reads real accruing coverage. logState = { header, rows } mirroring the
// live LifeHistory_Log [Timestamp,POPID,Name,EventTag,EventText,Neighborhood,Cycle].
function makeCtx(headers, rows, cycle, seed, logState) {
  const captured = [];
  const lifeLogStub = {
    getLastRow: () => logState.rows.length + 1,
    getDataRange: () => ({ getValues: () => [logState.header].concat(logState.rows) }),
    getRange: () => ({ setValues: (vals) => { for (const v of vals) { captured.push(v); logState.rows.push(v); } } })
  };
  const ctx = {
    now: new Date(0),
    config: { cycleCount: cycle },
    rng: mulberry32((seed >>> 0) ^ (cycle >>> 0)),
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' ? lifeLogStub : null) },
    summary: {
      cycleId: cycle,
      season: ['Winter', 'Spring', 'Summer', 'Fall'][cycle % 4],
      economicMood: 50,
      simYear: 2041,
      cycleActiveCitizens: []
    },
    ledger: { headers: headers.slice(), rows, dirty: false }
  };
  return { ctx, captured };
}

async function main() {
  const cycles = Math.max(1, parseInt(process.argv[2] || '1', 10));
  const SEED = 2026;

  console.log('Pulling live Simulation_Ledger…');
  const vals = await sheets.getSheetData('Simulation_Ledger');
  if (!vals || vals.length < 2) { console.error('ledger empty'); process.exit(1); }
  const headers = vals[0];
  const rows = vals.slice(1).filter(r => r[headers.indexOf('POPID')]);
  const total = rows.length;
  const iPop = headers.indexOf('POPID');
  const iDial = headers.indexOf('DialState');
  const withDial = rows.filter(r => r[iDial]).length;
  console.log(`Ledger: ${total} citizens, ${withDial} with DialState (${(100 * withDial / total).toFixed(1)}%)`);

  // Pull the append-only LifeHistory_Log; carry it forward across harness cycles
  // so the A2 anti-inert floor reads real accruing coverage. Run at REALISTIC
  // cycle numbers (maxLogCycle+1..) — else cycle-lastEv goes negative and A2
  // can't fire. Eligible universe = Tier1/2 (any mode) + Tier3/4 ENGINE (option-1).
  const ll = await sheets.getSheetData('LifeHistory_Log');
  const logHeader = ll[0];
  const logRows = ll.slice(1);
  const iLogCyc = logHeader.indexOf('Cycle');
  let maxLogCycle = 0;
  for (const lr of logRows) maxLogCycle = Math.max(maxLogCycle, Number(lr[iLogCyc]) || 0);
  const logState = { header: logHeader.slice(), rows: logRows.map(r => r.slice()) };
  const baseCycle = maxLogCycle;
  const iTier = headers.indexOf('Tier'), iMode = headers.indexOf('ClockMode');
  const eligible = rows.filter(r => {
    const t = Number(r[iTier]) || 0, m = String(r[iMode] || '');
    return (t === 1 || t === 2) || ((t === 3 || t === 4) && m === 'ENGINE');
  }).map(r => r[iPop]);
  console.log(`LifeHistory_Log: ${logRows.length} rows, maxCycle=${maxLogCycle}; eligible universe=${eligible.length}/${total}`);
  console.log(`Running ${cycles} cycle(s) from cycle ${baseCycle + 1}…\n`);

  // events/citizen accumulated, per-cycle distinct coverage, per-cycle covered-set
  const eventsByPop = Object.create(null);
  const perCycleCoverage = [];
  const coveredByCycle = []; // array of Set(popId) per harness cycle

  for (let i = 0; i < cycles; i++) {
    const cy = baseCycle + 1 + i;
    const { ctx, captured } = makeCtx(headers, rows, cy, SEED, logState);
    generateCitizensEvents_(ctx);
    const distinct = new Set();
    for (const ev of captured) {
      const pop = ev[1];
      distinct.add(pop);
      eventsByPop[pop] = (eventsByPop[pop] || 0) + 1;
    }
    coveredByCycle.push(distinct);
    perCycleCoverage.push(distinct.size);
    console.log(`  cycle ${cy}: ${captured.length} events across ${distinct.size} distinct citizens ` +
      `(${(100 * distinct.size / total).toFixed(1)}% coverage)`);
  }

  // ── A2 acceptance: max consecutive dark-run per eligible citizen ──
  // (only meaningful when cycles > ANTI_INERT_N; counts in-harness dark streaks)
  if (cycles >= 1) {
    let worstRun = 0, worstPop = '';
    const runHist = Object.create(null);
    for (const pop of eligible) {
      let run = 0, mx = 0;
      for (const set of coveredByCycle) {
        if (set.has(pop)) run = 0; else { run++; if (run > mx) mx = run; }
      }
      runHist[mx] = (runHist[mx] || 0) + 1;
      if (mx > worstRun) { worstRun = mx; worstPop = pop; }
    }
    console.log(`\n── A2 anti-inert (eligible only, ${cycles} cycles) ──`);
    console.log(`worst in-harness consecutive dark run: ${worstRun} cycles (${worstPop || 'n/a'})`);
    console.log('dark-run histogram (run: #citizens):',
      JSON.stringify(Object.fromEntries(Object.keys(runHist).map(Number).sort((a, b) => a - b).map(k => [k, runHist[k]]))));
  }

  // ── histogram: events/citizen over the whole run ──
  const counts = Object.values(eventsByPop);
  const hist = Object.create(null);
  for (const c of counts) hist[c] = (hist[c] || 0) + 1;
  const everCovered = counts.length;

  console.log(`\n── Summary over ${cycles} cycle(s) ──`);
  console.log(`distinct citizens ever covered: ${everCovered}/${total} (${(100 * everCovered / total).toFixed(1)}%)`);
  console.log(`avg per-cycle coverage: ${(perCycleCoverage.reduce((a, b) => a + b, 0) / cycles).toFixed(1)} citizens`);
  console.log('events/citizen histogram (events: #citizens):');
  Object.keys(hist).map(Number).sort((a, b) => a - b)
    .forEach(k => console.log(`  ${k}: ${hist[k]}`));

  // ── correlation of coverage with dial activityScore (drive/outabout/sociability mult) ──
  // sanity: covered citizens should skew higher-activity than uncovered once A1 lands.
  const tmpCtx = { citizenLookup: {}, _dialBandCache: {} };
  for (const r of rows) tmpCtx.citizenLookup[r[iPop]] = { DialState: r[iDial] || '' };
  function activity(pop) {
    const b = C.getCitizenDialBands_(tmpCtx, pop);
    if (!b) return null;
    return (b.mult.drive + b.mult.outabout + b.mult.sociability) / 3;
  }
  let covSum = 0, covN = 0, unSum = 0, unN = 0;
  for (const r of rows) {
    const pop = r[iPop];
    const a = activity(pop);
    if (a == null) continue;
    if (eventsByPop[pop]) { covSum += a; covN++; } else { unSum += a; unN++; }
  }
  if (covN && unN) {
    console.log(`\nmean activityScore — covered: ${(covSum / covN).toFixed(3)} | uncovered: ${(unSum / unN).toFixed(3)} ` +
      `(>1 gap = dial-weighting is selecting active citizens)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
