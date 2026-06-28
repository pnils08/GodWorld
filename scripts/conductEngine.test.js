/**
 * conductEngine.test.js — measured verification of the engine.32 T7 moral-test
 * engine (phase05-citizens/runConductEngine.js). Distribution checks, not
 * assertions-by-eye: saints never commit, deep-negative integrity commits at
 * the laddered rate, the LIMIT binds, the crime-spike counterweight leans
 * positive, and no-DialState citizens are untouched (inert pre-deploy).
 *
 * Engine file has no module.exports (Apps Script global style) — loaded via
 * new Function(src) with the global surface stubbed.
 *
 * Run: node scripts/conductEngine.test.js
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
// inWorldStamp_ lives in phase01 advanceSimulationCalendar.js (not loaded here)
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);

global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };

let appended = [];
global.queueAppendIntent_ = (ctx, sheet, rowArr) => { appended.push({ sheet, rowArr }); };

// deterministic rng — mulberry32, reseeded per trial
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rngImpl = mulberry32(1);
global.safeRand_ = () => rngImpl;

const src = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/runConductEngine.js'), 'utf8');
const runConductEngine_ = new Function(src + '\nreturn runConductEngine_;')();

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
  'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'DialState'];

function makeRow(popId, ds, opts) {
  opts = opts || {};
  return [popId, 'Test', popId, opts.tier || 3, 'ENGINE', 'n', 'n', 'n',
    '', '', 'Temescal', opts.birthYear || 1990, ds];
}

function makeCtx(rows, opts) {
  opts = opts || {};
  return {
    now: new Date(0),
    config: {},
    summary: {
      absoluteCycle: 100,
      economicMood: opts.econMood || 50,
      crimeMetrics: opts.crimePressure
        ? { cityWide: { avgPropertyCrime: opts.crimePressure, avgViolentCrime: opts.crimePressure } }
        : undefined
    },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
}

// run N independent single-citizen cycles, return tag counts
function trials(n, ds, opts) {
  const counts = { Resisted: 0, 'Transgression-Petty': 0, 'Transgression-Serious': 0, 'Transgression-Grave': 0, total: 0 };
  for (let i = 0; i < n; i++) {
    rngImpl = mulberry32(i + 7);
    const ctx = makeCtx([makeRow('POP-T' + i, ds, opts)], opts);
    runConductEngine_(ctx);
    const evs = ctx.summary.conductEvents || [];
    for (const ev of evs) { counts[ev.tag]++; counts.total++; }
  }
  return counts;
}

console.log('═══ T7 Section 1 — inert pre-deploy + eligibility gates');
{
  appended = [];
  const noDial = trials(3000, '');
  assert('1.1 no DialState -> ZERO conduct events (inert pre-deploy)', noDial.total === 0, JSON.stringify(noDial));

  const youth = trials(3000, dialState({ integrity: 10 }), { birthYear: 2030 });
  assert('1.2 age<16 -> ZERO conduct events', youth.total === 0, JSON.stringify(youth));

  rngImpl = mulberry32(3);
  const t5ctx = makeCtx([makeRow('POP-T5', dialState({ integrity: 10 }), { tier: 5 })]);
  // tier-5 row: eligibility requires tier 3/4
  t5ctx.ledger.rows[0][3] = 5;
  runConductEngine_(t5ctx);
  assert('1.3 non-T3/4 -> skipped', (t5ctx.summary.conductEvents || []).length === 0);
}

console.log('═══ T7 Section 2 — the integrity ladder (commit odds + severity, measured)');
{
  const saint = trials(6000, dialState({ integrity: 90 }));
  assert('2.1 saint (band +2): moral tests DO fire', saint.total > 20, 'fired ' + saint.total);
  assert('2.2 saint: ZERO transgressions (crimeReachable gate)',
    saint['Transgression-Petty'] + saint['Transgression-Serious'] + saint['Transgression-Grave'] === 0,
    JSON.stringify(saint));
  assert('2.3 saint: all resolutions are Resisted', saint.Resisted === saint.total);

  // accessor contract (engine.31, compressLifeHistory.js ~L800): crimeReachable
  // = bandIndex <= 0 = raw integrity < 20 = band -2 ONLY. Bands 0 and -1 resist.
  const neutral = trials(6000, dialState({}));            // integrity 50 -> band 0
  const midLow = trials(6000, dialState({ integrity: 30 })); // band -1 -> still unreachable
  const outlaw = trials(6000, dialState({ integrity: 10, composure: 10 })); // band -2 -> commitP .75
  const commitShare = c => (c.total ? (c.total - c.Resisted) / c.total : 0);
  assert('2.4 neutral (band 0): ZERO commits — crimeReachable gate holds',
    commitShare(neutral) === 0 && neutral.total > 20, commitShare(neutral).toFixed(3) + ' of ' + neutral.total);
  assert('2.4b band -1: ZERO commits — only far-low integrity is reachable (accessor contract)',
    commitShare(midLow) === 0 && midLow.total > 20, commitShare(midLow).toFixed(3) + ' of ' + midLow.total);
  assert('2.5 band -2 commit share ~0.75 (>0.6 measured)',
    commitShare(outlaw) > 0.6, commitShare(outlaw).toFixed(3) + ' of ' + outlaw.total);
  assert('2.6 ladder orders: -2 commits, -1 does not', commitShare(outlaw) > commitShare(midLow));
  assert('2.7 outlaw severity ladder reaches past Petty',
    outlaw['Transgression-Serious'] + outlaw['Transgression-Grave'] > 0, JSON.stringify(outlaw));
  assert('2.8 Petty stays the most common transgression (no grave-spam)',
    outlaw['Transgression-Petty'] > outlaw['Transgression-Grave'], JSON.stringify(outlaw));
}

console.log('═══ T7 Section 3 — the RimWorld counterweight (crime spike -> lean positive)');
{
  const calm = trials(8000, dialState({ integrity: 10 }), { crimePressure: 50 });
  const spike = trials(8000, dialState({ integrity: 10 }), { crimePressure: 80 });
  assert('3.1 spike fires FEWER tests (rate ×0.7)', spike.total < calm.total, spike.total + ' vs ' + calm.total);
  const commitShare = c => (c.total ? (c.total - c.Resisted) / c.total : 0);
  assert('3.2 spike commit share drops (×0.6 — resilience, no cohort darkening)',
    commitShare(spike) < commitShare(calm),
    commitShare(spike).toFixed(3) + ' vs ' + commitShare(calm).toFixed(3));
}

console.log('═══ T7 Section 4 — caps, write path, dial-loop closure');
{
  // 400 deep-negative citizens, one cycle: LIMIT must bind
  rngImpl = mulberry32(42);
  const rows = [];
  for (let i = 0; i < 400; i++) rows.push(makeRow('POP-L' + i, dialState({ integrity: 10 })));
  appended = [];
  const ctx = makeCtx(rows);
  runConductEngine_(ctx);
  const evs = ctx.summary.conductEvents || [];
  assert('4.1 LIMIT binds: <=3 resolutions across 400 eligible citizens', evs.length <= 3 && evs.length > 0, String(evs.length));
  assert('4.2 ledger marked dirty when events landed', ctx.ledger.dirty === true);
  assert('4.3 every event queued one LifeHistory_Log append', appended.length === evs.length);
  assert('4.4 append rowArr[3] carries the exact eventTag', appended.every((a, i) => a.rowArr[3] === evs[i].tag));

  // memory line format on the row + tag must be a real DIAL_MAP key
  const iLife = HEADERS.indexOf('LifeHistory');
  const touched = ctx.ledger.rows.filter(r => r[iLife]);
  assert('4.5 memory line lands as "C<cycle> — [Tag] text"', touched.length > 0 && /^C\d+ — \[[A-Za-z-]+\] .+/.test(touched[0][iLife]), touched[0] && touched[0][iLife]);
  const tagsUsed = evs.map(e => e.tag);
  const nudgeMoves = tagsUsed.every(t => {
    const fx = M.nudgesForEvent_(t, 1, '');
    return fx && typeof fx.integrity === 'number' && fx.integrity !== 0;
  });
  assert('4.6 every emitted tag resolves to an integrity-moving nudge in citizenDialMap (loop closes)', nudgeMoves, JSON.stringify(tagsUsed));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
