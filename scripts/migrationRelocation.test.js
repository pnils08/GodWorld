/**
 * engine.55 GATE — intra-city relocation acceptance harness.
 *
 * Loads the REAL processNeighborhoodTrajectory_ + processMigrationTracking_
 * (whole-file, Apps Script global surface injected — same pattern as
 * scripts/engine32MultiCycle.test.js) and asserts:
 *
 *   A1  trajectory summary payload carries same-cycle rent/income (post-drift)
 *   A2  rent-burden signal — burden computed from MonthlyRent + income
 *       (RentBurdenPct never existed in the live sheet)
 *   A2b owners exempt from rent burden (S316 C129 fix)
 *   A2c live member income sum beats stale HouseholdIncome (S316 C129 fix)
 *   A10 MASS_EXODUS counts planning intent, not raw risk>=7 (S316 C129 fix)
 *   A3  pressure lane — planning household moves as one unit toward an
 *       affordable hood: every member row re-hooded, AN-AQ stamped
 *       (reason/destination/cycle), intent resets to staying, and the
 *       Household_Ledger row re-prices to the destination median rent
 *   A4  misfit lane — wealthy citizen in a cheap hood sorts up
 *       (reason=opportunity) with no displacement pressure
 *   A5  cap — many eligible units, at most RELOCATION.MAX_UNITS_PER_CYCLE move
 *   A6  nodes permanent — destinations only within canonical hood set;
 *       intent enum never leaves {staying, considering, planning-to-leave}
 *   A7  determinism — identical-seed runs produce byte-identical ledger +
 *       hook state
 *   A8  no-better-fit — unit stays put when no destination clears the
 *       MIN_SCORE_GAIN margin
 *   A9  split household (members in different hoods) is left alone
 *
 * Run: node scripts/migrationRelocation.test.js
 */

const fs = require('fs');
const path = require('path');

// --- Apps Script global surface ---
global.Logger = { log() {} };
let rippleCalls = [];
global.recordHookRipple_ = (ctx, cls, hook, src) => { rippleCalls.push({ cls, hook, src }); };
let cellIntents = [];
global.queueCellIntent_ = (ctx, sheet, row, col, value, why, domain) => {
  cellIntents.push({ sheet, row, col, value, why, domain });
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + fnName + ';')();
};
const processNeighborhoodTrajectory_ = loadEngine('../phase05-citizens/neighborhoodTrajectoryEngine.js', 'processNeighborhoodTrajectory_');
const processMigrationTracking_ = loadEngine('../phase05-citizens/migrationTrackingEngine.js', 'processMigrationTracking_');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// --- mock sheet infrastructure ---
function mockSheet(values) {
  const setCalls = [];
  return {
    _values: values,
    _setCalls: setCalls,
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getRange(row, col) {
      return { setValue(v) { setCalls.push({ row, col, v }); values[row - 1][col - 1] = v; } };
    }
  };
}
function mockSS(sheets) {
  return { getSheetByName: (n) => sheets[n] || null };
}

// --- fixtures ---
const NM_HEADER = ['Cycle', 'Neighborhood', 'Sentiment', 'RetailVitality', 'CrimeIndex',
  'EventAttractiveness', 'MigrationFlow', 'NeighborhoodTrajectory', 'TrajectoryMomentum',
  'TrajectoryStartCycle', 'HousingPressure', 'MedianIncome', 'MedianRent'];

// Divergent 4-hood city: Highgate booms (expensive), Lowmarket cheap+steady,
// Middleton median, Fadeside decays.
function nmValues() {
  return [
    NM_HEADER.slice(),
    // cyc hood        sent  retail crime event flow traj      mom start press income rent
    [200, 'Highgate',  0.95, 20,    0,    80,   3,  'growth',  7,  195,  6,   150000, 4500],
    [200, 'Lowmarket', 0.80, 10,    1,    30,   0,  'steady',  5,  190,  0,    45000, 1300],
    [200, 'Middleton', 0.80, 10,    1,    30,   0,  'steady',  5,  190,  1,    75000, 2200],
    [200, 'Fadeside',  0.60,  4,    3,    10,  -3,  'decay',   3,  195,  0,    60000, 2100]
  ];
}

const SL_HEADER = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Neighborhood',
  'EducationLevel', 'HouseholdId', 'Income', 'DisplacementRisk', 'MigrationIntent',
  'MigrationReason', 'MigrationDestination', 'MigratedCycle', 'ReturnedCycle'];

function citizen(popid, first, last, hood, income, opts) {
  opts = opts || {};
  return [popid, first, last, opts.status || 'active', opts.birthYear || 2000, hood,
    opts.edu || 'bachelors', opts.hh || '', income, opts.risk || 0,
    opts.intent || 'staying', '', '', 0, 0];
}

const HH_HEADER = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members',
  'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome',
  'FormedCycle', 'DissolvedCycle', 'Status', 'CreatedAt', 'LastUpdated'];

function buildCtx(slRows, hhRows, rngFn, nmRows) {
  const sheets = {
    Neighborhood_Map: mockSheet(nmRows || nmValues()),
    Household_Ledger: mockSheet([HH_HEADER.slice()].concat(hhRows || []))
  };
  return {
    ss: mockSS(sheets),
    ledger: { headers: SL_HEADER.slice(), rows: slRows, dirty: false },
    summary: { cycleId: 200, storyHooks: [] },
    config: { cycleCount: 200 },
    rng: rngFn,
    now: '2041-06-01T00:00:00.000Z',
    _sheets: sheets
  };
}

function runBoth(ctx) {
  processNeighborhoodTrajectory_(ctx);   // populates ctx.summary.neighborhoodTrajectory
  processMigrationTracking_(ctx);        // risk -> intent -> relocation -> hooks
}

const col = (n) => SL_HEADER.indexOf(n);

// ═══ A1: trajectory summary carries same-cycle rent/income ═══════════════════
console.log('A1 trajectory summary payload rent/income');
{
  rippleCalls = []; cellIntents = [];
  const ctx = buildCtx([], [], mulberry32(1));
  processNeighborhoodTrajectory_(ctx);
  const t = ctx.summary.neighborhoodTrajectory;
  assert('payload exists for all 4 hoods', t && Object.keys(t).length === 4, JSON.stringify(Object.keys(t || {})));
  assert('rent present + numeric', t.Lowmarket && t.Lowmarket.rent === 1300);
  assert('income present + numeric', t.Lowmarket && t.Lowmarket.income === 45000);
  // Highgate stays growth (score high) -> rent drifts up; payload must carry
  // the POST-drift value, matching the queued intent, not the sheet value.
  const rentIntent = cellIntents.find(i => i.why === 'trajectory rent drift');
  if (rentIntent) {
    assert('post-drift rent in payload matches queued intent', t.Highgate.rent === rentIntent.value,
      `payload ${t.Highgate.rent} vs intent ${rentIntent.value}`);
  } else {
    assert('drift fired for growth hood (expected with growth trajectory)', false, 'no rent drift intent queued');
  }
}

// ═══ A2: rent-burden fallback from MonthlyRent + HouseholdIncome ═════════════
console.log('A2 rent-burden fallback (no RentBurdenPct column)');
{
  rippleCalls = []; cellIntents = [];
  // Household paying 2600/mo on 40k/yr = 78% burden -> +4 +1 risk points.
  const hh = [['HH-T1', 'POP-1', 'family', '["POP-1"]', 'Middleton', 'rented', 2600, 0, 40000, 100, '', 'active', '', '']];
  const slA = [citizen('POP-1', 'Ana', 'Burden', 'Middleton', 40000, { hh: 'HH-T1', edu: 'bachelors' })];
  const slB = [citizen('POP-2', 'Bo', 'Free', 'Middleton', 40000, { edu: 'bachelors' })]; // same, no household
  const ctxA = buildCtx(slA, hh, () => 0.99); // rng 0.99 -> no moves, isolate risk
  const ctxB = buildCtx(slB, [], () => 0.99);
  runBoth(ctxA); runBoth(ctxB);
  const riskA = slA[0][col('DisplacementRisk')];
  const riskB = slB[0][col('DisplacementRisk')];
  assert('burdened household risk > identical no-household risk', riskA === riskB + 5,
    `withHH ${riskA} vs without ${riskB}`);
}

// ═══ A2b: owners pay no rent burden ══════════════════════════════════════════
console.log('A2b owner household exempt from rent burden');
{
  rippleCalls = []; cellIntents = [];
  const hh = [['HH-T2', 'POP-3', 'family', '["POP-3"]', 'Middleton', 'owned', 2600, 0, 40000, 100, '', 'active', '', '']];
  const sl = [citizen('POP-3', 'Own', 'Er', 'Middleton', 40000, { hh: 'HH-T2', edu: 'bachelors' })];
  const ctx = buildCtx(sl, hh, () => 0.99);
  runBoth(ctx);
  assert('owner gets zero burden risk', sl[0][col('DisplacementRisk')] === 0,
    String(sl[0][col('DisplacementRisk')]));
}

// ═══ A2c: stale ledger income ignored when live member income exists ═════════
console.log('A2c live member income beats stale HouseholdIncome');
{
  rippleCalls = []; cellIntents = [];
  // Ledger says 50k (formation-seeded), member actually earns 192k.
  // Rent 4204 rented: stale burden 101% (+5 risk); live burden 26% (0).
  const hh = [['HH-T3', 'POP-4', 'single', '["POP-4"]', 'Middleton', 'rented', 4204, 0, 50000, 100, '', 'active', '', '']];
  const sl = [citizen('POP-4', 'Ste', 'Phan', 'Middleton', 192245, { hh: 'HH-T3', edu: 'masters' })];
  const ctx = buildCtx(sl, hh, () => 0.99);
  runBoth(ctx);
  assert('high earner not flagged off stale ledger income', sl[0][col('DisplacementRisk')] === 0,
    String(sl[0][col('DisplacementRisk')]));
}

// ═══ A10: MASS_EXODUS counts planning intent, not raw risk ═══════════════════
console.log('A10 MASS_EXODUS threshold on planning intent');
{
  rippleCalls = []; cellIntents = [];
  // 5 renters in Middleton at burden>50% + no-college + senior = risk 8 ->
  // planning. 5 more without senior = risk 7 -> considering (must NOT count).
  const hh = [], sl = [];
  for (let i = 0; i < 10; i++) {
    const hhId = 'HH-E' + i;
    hh.push([hhId, 'POP-8' + i, 'single', '[]', 'Middleton', 'rented', 2600, 0, 40000, 100, '', 'active', '', '']);
    sl.push(citizen('POP-8' + i, 'Ex', 'Od' + i, 'Middleton', 40000,
      { hh: hhId, edu: 'hs-diploma', birthYear: i < 5 ? 1970 : 2000 }));
  }
  const ctx = buildCtx(sl, hh, () => 0.99); // no relocation rolls pass
  runBoth(ctx);
  const planning = sl.filter(r => r[col('MigrationIntent')] === 'planning-to-leave').length;
  assert('exactly 5 planning (seniors)', planning === 5, String(planning));
  const exodus = ctx.summary.storyHooks.filter(h => h.hookType === 'MASS_EXODUS');
  assert('one MASS_EXODUS for Middleton', exodus.length === 1 && exodus[0].neighborhood === 'Middleton',
    JSON.stringify(exodus.map(h => h.neighborhood)));
  assert('exodus count = planning count, not risk>=7 count', exodus[0].atRiskCount === 5,
    String(exodus[0].atRiskCount));
}

// ═══ A3: pressure lane — household moves as a unit ═══════════════════════════
console.log('A3 pressure lane household move');
{
  rippleCalls = []; cellIntents = [];
  // Family of 3 in expensive Highgate on 48k combined: burden 4500/(4000/mo)
  // >50% -> risk 8+ -> planning -> move roll 0.0 passes -> best fit Lowmarket.
  const hh = [['HH-M1', 'POP-10', 'family', '["POP-10","POP-11","POP-12"]', 'Highgate', 'rented', 4500, 0, 48000, 100, '', 'active', '', '']];
  const sl = [
    citizen('POP-10', 'Rosa', 'Vega', 'Highgate', 30000, { hh: 'HH-M1', edu: 'hs-diploma' }),
    citizen('POP-11', 'Luis', 'Vega', 'Highgate', 18000, { hh: 'HH-M1', edu: 'hs-diploma' }),
    citizen('POP-12', 'Mia', 'Vega', 'Highgate', 0, { hh: 'HH-M1', edu: 'none', birthYear: 2032 }),
    citizen('POP-13', 'Stan', 'Still', 'Middleton', 75000, { edu: 'bachelors' })
  ];
  const ctx = buildCtx(sl, hh, () => 0.0);
  runBoth(ctx);
  const dest = sl[0][col('Neighborhood')];
  assert('household left Highgate', dest !== 'Highgate', dest);
  assert('destination is Lowmarket (affordability + class fit)', dest === 'Lowmarket', dest);
  assert('all 3 members moved together',
    sl[1][col('Neighborhood')] === dest && sl[2][col('Neighborhood')] === dest);
  assert('MigrationReason stamped', ['cost', 'displaced'].indexOf(sl[0][col('MigrationReason')]) >= 0,
    sl[0][col('MigrationReason')]);
  assert('MigrationDestination stamped', sl[0][col('MigrationDestination')] === dest);
  assert('MigratedCycle stamped', sl[0][col('MigratedCycle')] === 200);
  assert('intent reset to staying', sl[0][col('MigrationIntent')] === 'staying');
  const hhSheet = ctx._sheets.Household_Ledger;
  assert('Household_Ledger re-hooded', hhSheet._values[1][HH_HEADER.indexOf('Neighborhood')] === dest);
  assert('Household_Ledger rent re-priced to destination median',
    hhSheet._values[1][HH_HEADER.indexOf('MonthlyRent')] === 1300,
    String(hhSheet._values[1][HH_HEADER.indexOf('MonthlyRent')]));
  const moveHooks = ctx.summary.storyHooks.filter(h => h.hookType === 'CITIZEN_RELOCATED');
  assert('CITIZEN_RELOCATED hook emitted once', moveHooks.length === 1, String(moveHooks.length));
  assert('hook eventType moved-within', moveHooks[0] && moveHooks[0].eventType === 'moved-within');
  assert('hook reached ripple recorder', rippleCalls.some(c => c.hook.hookType === 'CITIZEN_RELOCATED' && c.src === 'migrationTrackingEngine'));
  assert('bystander did not move', sl[3][col('Neighborhood')] === 'Middleton');
}

// ═══ A4: misfit lane — wealthy citizen sorts up ══════════════════════════════
console.log('A4 misfit lane upward sort');
{
  rippleCalls = []; cellIntents = [];
  // 160k income in Lowmarket (median 45k): ratio 3.5x >= 2.5 -> misfit lane.
  const sl = [citizen('POP-20', 'Vera', 'Rich', 'Lowmarket', 160000, { edu: 'masters' })];
  const ctx = buildCtx(sl, [], () => 0.0);
  runBoth(ctx);
  const dest = sl[0][col('Neighborhood')];
  assert('moved out of Lowmarket', dest !== 'Lowmarket', dest);
  assert('destination is Highgate (income-aligned)', dest === 'Highgate', dest);
  assert('reason is opportunity', sl[0][col('MigrationReason')] === 'opportunity', sl[0][col('MigrationReason')]);
}

// ═══ A5: per-cycle cap ═══════════════════════════════════════════════════════
console.log('A5 relocation cap');
{
  rippleCalls = []; cellIntents = [];
  // 6 independent misfit citizens, all rolls pass — only MAX (2) may move.
  const sl = [];
  for (let i = 0; i < 6; i++) sl.push(citizen('POP-3' + i, 'Cit', 'N' + i, 'Lowmarket', 160000, { edu: 'masters' }));
  const ctx = buildCtx(sl, [], () => 0.0);
  runBoth(ctx);
  const movedN = sl.filter(r => r[col('Neighborhood')] !== 'Lowmarket').length;
  assert('exactly 2 units moved (cap)', movedN === 2, String(movedN));
}

// ═══ A6: nodes permanent ═════════════════════════════════════════════════════
console.log('A6 nodes permanent');
{
  rippleCalls = []; cellIntents = [];
  const sl = [];
  for (let i = 0; i < 8; i++) {
    sl.push(citizen('POP-4' + i, 'Cit', 'P' + i, ['Highgate', 'Lowmarket', 'Middleton', 'Fadeside'][i % 4],
      [30000, 160000, 75000, 20000][i % 4], { edu: i % 2 ? 'hs-diploma' : 'masters', hh: i < 2 ? 'HH-X1' : '' }));
  }
  const hh = [['HH-X1', 'POP-40', 'family', '[]', 'Highgate', 'rented', 4500, 0, 50000, 100, '', 'active', '', '']];
  const ctx = buildCtx(sl, hh, mulberry32(7));
  runBoth(ctx);
  const canonical = { Highgate: 1, Lowmarket: 1, Middleton: 1, Fadeside: 1 };
  assert('every Neighborhood value stays canonical', sl.every(r => canonical[r[col('Neighborhood')]]));
  const intents = { staying: 1, considering: 1, 'planning-to-leave': 1 };
  assert('intent enum never leaves the permanent-nodes ladder', sl.every(r => intents[r[col('MigrationIntent')]]),
    JSON.stringify(sl.map(r => r[col('MigrationIntent')])));
}

// ═══ A7: determinism ═════════════════════════════════════════════════════════
console.log('A7 determinism');
{
  const snap = (ctx, sl) => JSON.stringify({ sl, hooks: ctx.summary.storyHooks, hh: ctx._sheets.Household_Ledger._values });
  const mk = () => {
    const sl = [
      citizen('POP-50', 'Da', 'Vinci', 'Highgate', 30000, { hh: 'HH-D1', edu: 'hs-diploma' }),
      citizen('POP-51', 'Mo', 'Net', 'Lowmarket', 160000, { edu: 'masters' }),
      citizen('POP-52', 'Fri', 'Da', 'Fadeside', 55000, { edu: 'bachelors' })
    ];
    const hh = [['HH-D1', 'POP-50', 'single', '["POP-50"]', 'Highgate', 'rented', 4500, 0, 30000, 100, '', 'active', '', '']];
    return { sl, hh };
  };
  rippleCalls = []; cellIntents = [];
  const a = mk(); const ctxA = buildCtx(a.sl, a.hh, mulberry32(42)); runBoth(ctxA);
  rippleCalls = []; cellIntents = [];
  const b = mk(); const ctxB = buildCtx(b.sl, b.hh, mulberry32(42)); runBoth(ctxB);
  assert('identical-seed runs byte-identical', snap(ctxA, a.sl) === snap(ctxB, b.sl));
}

// ═══ A8: no-better-fit stays put ═════════════════════════════════════════════
console.log('A8 no-better-fit stays');
{
  rippleCalls = []; cellIntents = [];
  // Flat city: all hoods identical -> no destination clears MIN_SCORE_GAIN.
  const flat = [NM_HEADER.slice()];
  ['H1', 'H2', 'H3'].forEach(h => flat.push([200, h, 0.8, 10, 1, 30, 0, 'steady', 5, 190, 0, 75000, 1875]));
  const sl = [citizen('POP-60', 'Ok', 'Fine', 'H1', 75000, { edu: 'masters', intent: 'planning-to-leave', risk: 8 })];
  const ctx = buildCtx(sl, [], () => 0.0, flat);
  runBoth(ctx);
  assert('unit stayed (no gain margin)', sl[0][col('Neighborhood')] === 'H1', sl[0][col('Neighborhood')]);
  assert('no relocation hook', !ctx.summary.storyHooks.some(h => h.hookType === 'CITIZEN_RELOCATED'));
}

// ═══ A9: split household left alone ══════════════════════════════════════════
console.log('A9 split household untouched');
{
  rippleCalls = []; cellIntents = [];
  const hh = [['HH-S1', 'POP-70', 'family', '["POP-70","POP-71"]', 'Highgate', 'rented', 4500, 0, 48000, 100, '', 'active', '', '']];
  const sl = [
    citizen('POP-70', 'He', 'Re', 'Highgate', 30000, { hh: 'HH-S1', edu: 'hs-diploma' }),
    citizen('POP-71', 'Aw', 'Ay', 'Middleton', 18000, { hh: 'HH-S1', edu: 'hs-diploma' })
  ];
  const ctx = buildCtx(sl, hh, () => 0.0);
  runBoth(ctx);
  // Unit anchors to first-seen hood; the stray member row is excluded from the
  // move set, so both stay put OR only the anchored contingent moves — the
  // stray must never be re-hooded by a unit it doesn't co-reside with.
  assert('stray member not dragged', sl[1][col('Neighborhood')] === 'Middleton', sl[1][col('Neighborhood')]);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
