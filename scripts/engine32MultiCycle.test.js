/**
 * engine.32 GATE — multi-cycle CLOSED-LOOP harness (acceptance #5 + #7).
 *
 * The loop under test is the one engine.32 closed: events -> O (LifeHistory)
 * -> R (DialState/TraitProfile, via the REAL compressLifeHistory_ fold) ->
 * event generators (T5 dial wiring + T7 conduct biasing) -> events. Per the
 * plan's Emergence/Grok lesson, nobody can predict which way coupled feedback
 * paths run until they run — so this harness RUNS it: a 60-citizen population
 * through 120 cycles with two T5-wired generators live (household ambient +
 * the T7 conduct engine), folding through the real Phase-9 compressor each
 * cycle and carrying DialState forward exactly as the live engine does.
 *
 * TWO TRACES, because engine.31 folds nudges into base ON TRIM ONLY (the
 * 20-entry window) — measured here, not assumed:
 *
 * Trace A — realistic volume (household+conduct only, ~1.2 events/cycle
 * across 60 citizens). The window never fills, so base barely moves: the
 * loop at background-citizen rates is HEAVILY DAMPED — convergent, the
 * acceptance-#5 verdict. Runaway is structurally impossible at this volume.
 *   G1  bounded — every dial 0-100, every citizen, every cycle.
 *   G2  no cohort darkening — zero neutral-cohort transgressions
 *                     (crimeReachable gate holds in-loop for 120 cycles).
 *   G3  damped — population base distribution essentially static at
 *                     realistic volume (fold-on-trim never triggers).
 *   G4  dark loop — seeded outlaws (band -2) commit over the trace and
 *                     stay dark (no erase back to neutral).
 *   G5  redemption — Resisted events land population-wide (+5 path live).
 *   G6  no oscillation/runaway — population mean integrity drifts < 10
 *                     total and < 2 per cycle.
 *   G7  counterweight in-loop — a paired spike-trace (crimePressure 80)
 *                     fires measurably fewer conduct tests than the calm one.
 *
 * Trace B — high volume (5 ambient filler lines/citizen/cycle simulating
 * the other ~11 generators an event-rich citizen sees). Windows trim every
 * cycle, folds actually fire — the feedback paths run hot:
 *   B1  bounded under continuous folding.
 *   B2  neutral cohort integrity holds (now non-vacuous — their DialState
 *                     exists and folds every cycle).
 *   B3  no cookie-cutter — family dial keeps real variance (only household-
 *                     event recipients move) and does not population-pin.
 *   B4  dark loop folds — outlaw integrity stays far-low (commits at .75
 *                     outweigh Resisted +5), never bounces to neutral.
 *
 * Scope note: T8's fan-out (prev-evening carry-forward) is structural
 * null-safe wiring through the live snapshot channel — it needs the full
 * engine (buildCityEvents_ Phase 7 + PREV_EVENING_JSON round-trip) and is
 * verified by code-path review + the C96 copy run, not simulated here.
 *
 * Run: node scripts/engine32MultiCycle.test.js
 */

const fs = require('fs');
const path = require('path');

// --- inject the Apps Script global surface ---
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
let rngImpl = mulberry32(2026);
global.safeRand_ = () => rngImpl;

const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + fnName + ';')();
};
const runHouseholdEngine_ = loadEngine('../phase05-citizens/runHouseholdEngine.js', 'runHouseholdEngine_');
const runConductEngine_ = loadEngine('../phase05-citizens/runConductEngine.js', 'runConductEngine_');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function dialState(overrides) {
  const c = global.newCitizen_();
  Object.keys(overrides).forEach(k => { c.base[k] = overrides[k]; });
  return C.serializeDialState_(c);
}

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)',
  'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'MaritalStatus', 'NumChildren',
  'TraitProfile', 'DialState'];
const NBHDS = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel',
  'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];

// Cohorts: 50 neutral (no DialState — seeds organically through lived events),
// 5 tempted (band -1, unreachable), 5 outlaw (band -2, crimeReachable).
function buildPopulation() {
  const rows = [];
  for (let i = 0; i < 50; i++) {
    const married = i % 2 === 0;
    rows.push(['POP-N' + i, 'Neutral', String(i), 3, 'ENGINE', 'n', 'n', 'n', '', '',
      NBHDS[i % NBHDS.length], 1985, married ? 'married' : 'single', married ? (i % 3) : 0, '', '']);
  }
  for (let i = 0; i < 5; i++) {
    rows.push(['POP-T' + i, 'Tempted', String(i), 3, 'ENGINE', 'n', 'n', 'n', '', '',
      NBHDS[i % NBHDS.length], 1985, 'single', 0, '', dialState({ integrity: 25 })]);
  }
  for (let i = 0; i < 5; i++) {
    rows.push(['POP-O' + i, 'Outlaw', String(i), 3, 'ENGINE', 'n', 'n', 'n', '', '',
      NBHDS[i % NBHDS.length], 1985, 'single', 0, '', dialState({ integrity: 10, composure: 30 })]);
  }
  return rows;
}

const iDS = HEADERS.indexOf('DialState');
const baseOf = row => {
  if (!row[iDS]) return null;
  try { return JSON.parse(row[iDS]).base; } catch (e) { return null; }
};

// One full closed-loop trace. Returns per-cycle metrics + event tallies.
// opts.fillerPerCycle: ambient lines appended per citizen per cycle to
// simulate the other ~11 generators (fills the 20-window so fold-on-trim
// actually fires). Filler tags rotate composure/openness-only — family and
// integrity stay attributable to household/conduct events.
const FILLER_TAGS = ['Background', 'Weather', 'Personal'];
function runTrace(cycles, opts) {
  opts = opts || {};
  const rows = buildPopulation();
  const tally = { fires: 0, commits: 0, resisted: 0, outlawCommits: 0, neutralCommits: 0 };
  const meanIntegrity = [];
  const iLife = HEADERS.indexOf('LifeHistory');
  let bounded = true;
  let ord = 0;
  for (let cy = 1; cy <= cycles; cy++) {
    const ctx = {
      now: new Date(0), config: {}, mode: {},
      summary: {
        absoluteCycle: 100 + cy * 5,
        economicMood: 50,
        season: ['Winter', 'Spring', 'Summer', 'Fall'][cy % 4],
        crimeMetrics: opts.crimePressure
          ? { cityWide: { avgPropertyCrime: opts.crimePressure, avgViolentCrime: opts.crimePressure } }
          : undefined
      },
      ledger: { headers: HEADERS.slice(), rows, dirty: false }
    };
    // Phase 5 generator order: household ambient, then the conduct engine
    // (shared per-ctx dial-band cache, same as the live phase list).
    runHouseholdEngine_(ctx);
    runConductEngine_(ctx);
    // ambient filler from "the other generators" (Trace B only)
    if (opts.fillerPerCycle) {
      for (const row of rows) {
        const lines = [];
        for (let f = 0; f < opts.fillerPerCycle; f++) {
          ord++;
          const dd = String((ord % 28) + 1).padStart(2, '0');
          lines.push(`2026-0${(ord % 6) + 1}-${dd} 10:0${ord % 10} — [${FILLER_TAGS[ord % FILLER_TAGS.length]}] ambient cycle ${cy}`);
        }
        row[iLife] = row[iLife] ? row[iLife] + '\n' + lines.join('\n') : lines.join('\n');
      }
    }
    for (const ev of (ctx.summary.conductEvents || [])) {
      tally.fires++;
      if (ev.tag === 'Resisted') tally.resisted++;
      else {
        tally.commits++;
        // attribute by cohort via the citizen name we seeded ("Outlaw N" / "Neutral N")
        if (/^Outlaw/.test(ev.citizen)) tally.outlawCommits++;
        if (/^Neutral/.test(ev.citizen)) tally.neutralCommits++;
      }
    }
    // The REAL Phase-9 fold — events -> DialState/TraitProfile, trim carries forward
    C.compressLifeHistory_(ctx, { forceAll: true });
    // per-cycle metrics
    let sum = 0, n = 0;
    for (const row of rows) {
      const b = baseOf(row);
      const integ = b ? b.integrity : 50;
      sum += integ; n++;
      if (b) {
        for (const d of global.DIALS) {
          if (b[d] < 0 || b[d] > 100) bounded = false;
        }
      }
    }
    meanIntegrity.push(sum / n);
  }
  return { rows, tally, meanIntegrity, bounded };
}

console.log('═══ engine.32 GATE — closed loop, 60 citizens × 120 cycles (calm city)');
const calm = runTrace(120);
console.log('   conduct tally:', JSON.stringify(calm.tally));
console.log('   mean integrity (every 12th cycle):',
  calm.meanIntegrity.filter((_, i) => i % 12 === 0).map(v => v.toFixed(1)).join(' '));

assert('G1 every dial 0-100 bounded, every citizen, every cycle', calm.bounded);

{
  // G2 — the neutral 50: integrity stays neutral-band, none crimeReachable
  const neutralRows = calm.rows.filter(r => /^POP-N/.test(r[0]));
  const finals = neutralRows.map(r => { const b = baseOf(r); return b ? b.integrity : 50; });
  assert('G2a neutral cohort integrity stays >= 40 (no cohort darkening)',
    finals.every(v => v >= 40), 'min=' + Math.min(...finals).toFixed(1));
  assert('G2b zero neutral-cohort transgressions across the whole trace',
    calm.tally.neutralCommits === 0, String(calm.tally.neutralCommits));
}

{
  // G3 — the damping verdict (acceptance #5, measured): at realistic
  // background-citizen volume the 20-window never fills, fold-on-trim never
  // triggers, and base stays essentially static. The loop CONVERGES.
  const mi = calm.meanIntegrity;
  const spread = Math.max(...mi) - Math.min(...mi);
  assert('G3 heavily damped at realistic volume — mean integrity range < 1 across 120 cycles',
    spread < 1, spread.toFixed(3));
}

{
  // G4 — the dark loop: seeded outlaws commit and stay dark
  assert('G4a outlaw cohort commits transgressions over the trace',
    calm.tally.outlawCommits > 0, String(calm.tally.outlawCommits));
  const outlawRows = calm.rows.filter(r => /^POP-O/.test(r[0]));
  const finals = outlawRows.map(r => baseOf(r).integrity);
  assert('G4b no outlaw erased back to neutral (all final integrity < 40)',
    finals.every(v => v < 40), finals.map(v => v.toFixed(0)).join(' '));
}

assert('G5 redemption path live — Resisted events land across the population',
  calm.tally.resisted > 0, String(calm.tally.resisted));

{
  // G6 — convergence, not divergence or oscillation
  const mi = calm.meanIntegrity;
  const drift = Math.abs(mi[mi.length - 1] - mi[0]);
  let maxStep = 0;
  for (let i = 1; i < mi.length; i++) maxStep = Math.max(maxStep, Math.abs(mi[i] - mi[i - 1]));
  assert('G6a population mean integrity total drift < 10', drift < 10, drift.toFixed(2));
  assert('G6b no oscillation: max per-cycle mean swing < 2', maxStep < 2, maxStep.toFixed(2));
}

console.log('═══ counterweight in-loop — same 120 cycles under citywide crime spike');
rngImpl = mulberry32(2026); // same seed -> paired comparison
const spike = runTrace(120, { crimePressure: 80 });
console.log('   conduct tally:', JSON.stringify(spike.tally));
assert('G7a spike city fires FEWER moral tests than calm city',
  spike.tally.fires < calm.tally.fires, spike.tally.fires + ' vs ' + calm.tally.fires);
assert('G7b spike commit share <= calm commit share (lean positive, no runaway)',
  (spike.tally.commits / Math.max(1, spike.tally.fires)) <= (calm.tally.commits / Math.max(1, calm.tally.fires)),
  (spike.tally.commits / Math.max(1, spike.tally.fires)).toFixed(3) + ' vs ' +
  (calm.tally.commits / Math.max(1, calm.tally.fires)).toFixed(3));
assert('G7c spike trace stays bounded too', spike.bounded);

console.log('═══ Trace B — high volume (5 filler lines/citizen/cycle), folds fire every cycle');
rngImpl = mulberry32(777);
const hot = runTrace(40, { fillerPerCycle: 5 });
console.log('   conduct tally:', JSON.stringify(hot.tally));
console.log('   mean integrity (every 4th cycle):',
  hot.meanIntegrity.filter((_, i) => i % 4 === 0).map(v => v.toFixed(1)).join(' '));

assert('B1 bounded under continuous folding (every dial 0-100)', hot.bounded);

{
  const neutralRows = hot.rows.filter(r => /^POP-N/.test(r[0]));
  const seeded = neutralRows.filter(r => baseOf(r) !== null).length;
  const finals = neutralRows.map(r => { const b = baseOf(r); return b ? b.integrity : 50; });
  assert('B2a neutral cohort DialState actually seeded under volume (non-vacuous)',
    seeded === neutralRows.length, seeded + '/' + neutralRows.length);
  assert('B2b neutral cohort integrity holds >= 40 under continuous folding',
    finals.every(v => v >= 40), 'min=' + Math.min(...finals).toFixed(1));
}

{
  // B3 — no cookie-cutter: only household-event recipients move family, and
  // the movement is damped (engine.31 fold fraction), never population-wide.
  // Measured sd ~0.26 over 40 cycles at LIMIT 6/cycle — small by design;
  // assert the MECHANISM (variance exists, partial movers, no pinning),
  // not an arbitrary magnitude.
  const fams = hot.rows.map(r => { const b = baseOf(r); return b ? b.family : 50; });
  const pinned = fams.filter(v => v >= 99).length;
  const movers = fams.filter(v => Math.abs(v - 50) > 0.001).length;
  const mean = fams.reduce((a, v) => a + v, 0) / fams.length;
  const sd = Math.sqrt(fams.reduce((a, v) => a + (v - mean) * (v - mean), 0) / fams.length);
  assert('B3a family dial NOT population-pinned (<half at 100)',
    pinned < fams.length / 2, pinned + '/' + fams.length + ' pinned');
  assert('B3b family variance exists but stays damped (0 < sd, no degenerate collapse)',
    sd > 0.05, 'sd=' + sd.toFixed(2));
  assert('B3c only SOME citizens moved family (household recipients) — not all, not none',
    movers > 0 && movers < fams.length, movers + '/' + fams.length + ' moved');
}

{
  const outlawRows = hot.rows.filter(r => /^POP-O/.test(r[0]));
  const finals = outlawRows.map(r => baseOf(r).integrity);
  assert('B4 dark loop folds — outlaw integrity stays far-low (<20), bounded >= 0',
    finals.every(v => v < 20 && v >= 0), finals.map(v => v.toFixed(1)).join(' '));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
