#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/careerStage.test.js
 *
 * engine.135 — Employment System Cascade, Phases D1 / D5 / E1
 * (docs/plans/2026-08-29-employment-system-cascade.md). Proof test written
 * before the code.
 *
 *   E1. updateCareerProgression_ — CareerStage is DERIVED from age (student
 *       <22 · entry 22–29 · mid 30–44 · senior 45–64 · retired ≥65), with
 *       YearsInCareer breaking ties downward at the band edges. No calendar
 *       roll: the rng is never consulted, LastPromotionCycle is never written,
 *       no promotion narrative is stamped. Sports-layer rows untouched.
 *   D1. deriveWealthLevel_ — NetWorth bands extended 10 → 12
 *       (≥$50M · ≥$250M · ≥$1B); SAVINGS_RATE_BY_WEALTH carries 11 and 12.
 *   D5. calculateCitizenIncomes_ — retired or deceased → Income 0; the
 *       sports layer keeps whatever the game engine set.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { passed++; console.log('ok ' + label); } else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); } }

const sandbox = {
  Logger: { log: () => {} }, Math, JSON, Object, Array, String, Number, Date, isNaN, isFinite, parseInt, parseFloat, console,
  safeRand_: ctx => (ctx && typeof ctx.rng === 'function') ? ctx.rng : (() => 0.6),
};
vm.createContext(sandbox);
for (const rel of [
  ['phase05-citizens', 'educationCareerEngine.js'],
  ['phase05-citizens', 'generationalWealthEngine.js'],
]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); }
const { updateCareerProgression_, deriveWealthLevel_, calculateCitizenIncomes_, SAVINGS_RATE_BY_WEALTH } = sandbox;
assert('updateCareerProgression_ loaded', typeof updateCareerProgression_ === 'function');
assert('deriveWealthLevel_ loaded', typeof deriveWealthLevel_ === 'function');
assert('calculateCitizenIncomes_ loaded', typeof calculateCitizenIncomes_ === 'function');

// ── fixture ledger ──────────────────────────────────────────────────────────
const H = ['POPID', 'First', 'Last', 'Neighborhood', 'Occupation', 'Status', 'Tier', 'BirthYear', 'CareerStage', 'YearsInCareer',
  'EducationLevel', 'LastPromotionCycle', 'LifeHistory', 'LastUpdated', 'ClockMode', 'EconomicProfileKey', 'Income', 'NetWorth', 'WealthLevel'];
const I = n => H.indexOf(n);
// cycle 200 → simYear 2043 (2040 + floor(200/52))
const CYCLE = 200, SIM_YEAR = 2043;
function row(o) {
  const r = new Array(H.length).fill('');
  const d = { POPID: 'POP-X', First: 'A', Last: 'B', Neighborhood: 'Laurel', Occupation: 'clerk', Status: 'Active', Tier: 4,
    CareerStage: 'senior', YearsInCareer: 0, EducationLevel: 'hs-diploma', LastPromotionCycle: 0, LifeHistory: 'Y1C1 — born',
    ClockMode: 'ENGINE', EconomicProfileKey: 'RETAIL_CLERK', Income: 50000, NetWorth: 10000, WealthLevel: 2 };
  Object.assign(d, o);
  if (o.age !== undefined) d.BirthYear = SIM_YEAR - o.age;
  for (const k of H) r[I(k)] = d[k];
  return r;
}
function ctxWith(rows, cycle) {
  return { ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false }, summary: { cycleId: cycle || CYCLE }, config: { cycleCount: cycle || CYCLE },
    rng: () => { throw new Error('rng consulted — a calendar roll survived'); } };
}

// ── E1. stage from age ──────────────────────────────────────────────────────
{
  const rows = [
    row({ POPID: 'P1', age: 19, CareerStage: 'senior', YearsInCareer: 0 }),
    row({ POPID: 'P2', age: 25, CareerStage: 'senior', YearsInCareer: 2 }),
    row({ POPID: 'P3', age: 35, CareerStage: 'entry-level', YearsInCareer: 8 }),
    row({ POPID: 'P4', age: 50, CareerStage: 'mid-career', YearsInCareer: 20 }),
    row({ POPID: 'P5', age: 46, CareerStage: 'senior', YearsInCareer: 3 }),      // tie-break: senior band, too few years → mid
    row({ POPID: 'P6', age: 33, CareerStage: 'senior', YearsInCareer: 1 }),      // tie-break: mid band, too few years → entry
    row({ POPID: 'P7', age: 70, CareerStage: 'senior', YearsInCareer: 40 }),
    row({ POPID: 'P14', age: 70, CareerStage: 'retired', Status: 'Active', YearsInCareer: 40 }), // old age-rule stamp: left alone, not flipped back
    row({ POPID: 'P15', age: 19, CareerStage: 'early-career', YearsInCareer: 1 }),  // working 19-year-old stays working (entry)
    row({ POPID: 'P16', age: 20, CareerStage: 'student', YearsInCareer: 0 }),        // 20-year-old student stays a student
    row({ POPID: 'P17', age: 16, CareerStage: 'entry-level', YearsInCareer: 0 }),    // <18 → student
    row({ POPID: 'P18', age: 25, CareerStage: 'senior', ClockMode: 'CIVIC', Income: 180000 }),  // CIVIC: outside
    row({ POPID: 'P19', age: 70, CareerStage: 'senior', ClockMode: 'MEDIA', Income: 220000 }),  // MEDIA: outside
    row({ POPID: 'P8', age: 19, CareerStage: 'senior', ClockMode: 'GAME', Income: 900000 }),
    row({ POPID: 'P9', age: 40, CareerStage: 'entry-level', EconomicProfileKey: 'SPORTS_OVERRIDE' }),
    row({ POPID: 'P10', age: 40, CareerStage: 'entry-level', Status: 'deceased' }),
    row({ POPID: 'P11', age: 40, CareerStage: '', YearsInCareer: 0 }),           // blank stage, no years → mid by age
    row({ POPID: 'P12', age: 44, CareerStage: 'senior', YearsInCareer: 22 }),    // age band wins upward: 44 is mid, not senior
    row({ POPID: 'P13', age: 37, CareerStage: 'retired', Status: 'Retired', Tier: 1 }), // deliberate retirement (ex-athlete, ENGINE clock): stage stays
  ];
  const ctx = ctxWith(rows);
  let res, threw = null;
  try { res = updateCareerProgression_(ctx, CYCLE, ctx.rng); } catch (e) { threw = e.message; }
  assert('E1 no calendar roll: rng never consulted', threw === null, threw);
  const st = p => { const r = ctx.ledger.rows.find(x => x[I('POPID')] === p); return String(r[I('CareerStage')]); };
  assert('E1 19-year-old stamped senior with 0 years → entry-level (working stamp kept as a career, not student)', st('P1') === 'entry-level', st('P1'));
  assert('E1 22–29 → entry-level', st('P2') === 'entry-level', st('P2'));
  assert('E1 30–44 → mid-career', st('P3') === 'mid-career', st('P3'));
  assert('E1 45–64 → senior', st('P4') === 'senior', st('P4'));
  assert('E1 tie-break: 46 with 3 years → mid-career', st('P5') === 'mid-career', st('P5'));
  assert('E1 tie-break: 33 with 1 year → entry-level', st('P6') === 'entry-level', st('P6'));
  assert('E1 70 and Active stays senior — no age retires anyone', st('P7') === 'senior', st('P7'));
  assert('E1 existing retired stamp on an Active 70-year-old is left alone', st('P14') === 'retired', st('P14'));
  assert('E1 working 19-year-old keeps a career (entry-level)', st('P15') === 'entry-level', st('P15'));
  assert('E1 20-year-old student stays a student', st('P16') === 'student', st('P16'));
  assert('E1 16-year-old → student', st('P17') === 'student', st('P17'));
  assert('E1 CIVIC row untouched', st('P18') === 'senior', st('P18'));
  assert('E1 MEDIA row untouched', st('P19') === 'senior', st('P19'));
  assert('E1 GAME row untouched', st('P8') === 'senior', st('P8'));
  assert('E1 SPORTS_OVERRIDE row untouched', st('P9') === 'entry-level', st('P9'));
  assert('E1 deceased untouched', st('P10') === 'entry-level', st('P10'));
  assert('E1 blank stage → mid-career by age', st('P11') === 'mid-career', st('P11'));
  assert('E1 44 with 22 years stays mid (age band, not years, sets the ceiling)', st('P12') === 'mid-career', st('P12'));
  assert('E1 Status=Retired row is not re-derived from age', st('P13') === 'retired', st('P13'));
  const lp = ctx.ledger.rows.every(r => Number(r[I('LastPromotionCycle')]) === 0);
  assert('E1 LastPromotionCycle never written by the derivation', lp);
  const lh = ctx.ledger.rows.every(r => String(r[I('LifeHistory')]) === 'Y1C1 — born');
  assert('E1 no promotion narrative stamped (a stage is a description, not an event)', lh);
  assert('E1 returns advanced=0 (no rolls) and restamped count', res && res.advanced === 0 && res.restamped >= 8, JSON.stringify(res));
  assert('E1 ledger marked dirty', ctx.ledger.dirty === true);
  // idempotent: a second pass changes nothing
  const before = JSON.stringify(ctx.ledger.rows);
  ctx.ledger.dirty = false;
  const res2 = updateCareerProgression_(ctx, CYCLE + 1, ctx.rng);
  assert('E1 idempotent on the next cycle', JSON.stringify(ctx.ledger.rows) === before && res2.restamped === 0, JSON.stringify(res2));
  // YearsInCareer accrual survives (+0.5 every 26 cycles, adults only)
  const ctx3 = ctxWith([row({ POPID: 'Q1', age: 30, YearsInCareer: 4 }), row({ POPID: 'Q2', age: 19, YearsInCareer: 0 })], 208);
  updateCareerProgression_(ctx3, 208, ctx3.rng);
  assert('E1 YearsInCareer accrues +0.5 on a 26-cycle boundary for adults', Number(ctx3.ledger.rows[0][I('YearsInCareer')]) === 4.5, ctx3.ledger.rows[0][I('YearsInCareer')]);
  assert('E1 YearsInCareer does not accrue for a student', Number(ctx3.ledger.rows[1][I('YearsInCareer')]) === 0, ctx3.ledger.rows[1][I('YearsInCareer')]);
}

// ── D1. WealthLevel 10 → 12 ─────────────────────────────────────────────────
{
  assert('D1 $4.9M → 8', deriveWealthLevel_(0, 0, 4900000, 0) === 8);
  assert('D1 $5M → 9', deriveWealthLevel_(0, 0, 5000000, 0) === 9);
  assert('D1 $49M → 9', deriveWealthLevel_(0, 0, 49000000, 0) === 9);
  assert('D1 $50M → 10', deriveWealthLevel_(0, 0, 50000000, 0) === 10);
  assert('D1 $249M → 10', deriveWealthLevel_(0, 0, 249000000, 0) === 10);
  assert('D1 $250M → 11', deriveWealthLevel_(0, 0, 250000000, 0) === 11);
  assert('D1 $999M → 11', deriveWealthLevel_(0, 0, 999000000, 0) === 11);
  assert('D1 $1B → 12', deriveWealthLevel_(0, 0, 1000000000, 0) === 12);
  assert('D1 $10B → 12', deriveWealthLevel_(0, 0, 10000000000, 0) === 12);
  assert('D1 <$1K → 0', deriveWealthLevel_(0, 0, 500, 0) === 0);
  assert('D1 SAVINGS_RATE_BY_WEALTH 11/12 defined and monotone', SAVINGS_RATE_BY_WEALTH[11] > SAVINGS_RATE_BY_WEALTH[10] && SAVINGS_RATE_BY_WEALTH[12] > SAVINGS_RATE_BY_WEALTH[11], JSON.stringify(SAVINGS_RATE_BY_WEALTH));
}

// ── D5. retired / deceased → Income 0 ───────────────────────────────────────
{
  const rows = [
    row({ POPID: 'R1', age: 70, CareerStage: 'retired', Income: 82000 }),
    row({ POPID: 'R2', age: 40, Status: 'deceased', CareerStage: 'mid-career', Income: 60000 }),
    row({ POPID: 'R3', age: 55, CareerStage: 'retired', Status: 'Retired', Income: 45000 }),
    row({ POPID: 'R9', age: 64, CareerStage: 'retired', Status: 'Active', Income: 83497 }),   // false-retired, Active: NOT zeroed (E1 corrects the stage)
    row({ POPID: 'R10', age: 37, CareerStage: 'retired', Status: 'Retired', Tier: 1, Income: 223635 }), // Tier-1 retired star: money is story's
    row({ POPID: 'R11', age: 68, CareerStage: 'senior', Status: 'Active', Income: 90000 }),   // 68 and still stamped senior: retired by age → 0
    row({ POPID: 'R4', age: 38, CareerStage: 'retired', ClockMode: 'GAME', Status: 'Retired', Income: 2000000 }),  // retired athlete: game engine's
    row({ POPID: 'R5', age: 38, CareerStage: 'mid-career', EconomicProfileKey: 'SPORTS_OVERRIDE', Status: 'deceased', Income: 500000 }), // sports layer, even deceased: untouched
    row({ POPID: 'R6', age: 40, CareerStage: 'mid-career', Income: 61000 }),
    row({ POPID: 'R7', age: 12, CareerStage: 'student', Income: 9000 }),
    row({ POPID: 'R8', age: 40, CareerStage: 'mid-career', EconomicProfileKey: '', Income: 0, LifeHistory: '[CareerState] income=mid' }),
    row({ POPID: 'R12', age: 60, Status: 'Retired', CareerStage: 'retired', ClockMode: 'CIVIC', Income: 120000 }), // CIVIC retired: outside
    row({ POPID: 'R13', age: 45, Status: 'deceased', ClockMode: 'MEDIA', Income: 90000 }),                        // MEDIA deceased: outside
  ];
  const ctx = ctxWith(rows); ctx.rng = () => 0.5;
  const res = calculateCitizenIncomes_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(x => x[I('POPID')] === p)[I('Income')]);
  assert('D5 stage-retired but Status Active: keeps salary (stage is not the event)', inc('R1') === 82000, inc('R1'));
  assert('D5 deceased → 0', inc('R2') === 0, inc('R2'));
  assert('D5 retired by Status too → 0', inc('R3') === 0, inc('R3'));
  assert('D5 retired athlete (GAME) untouched', inc('R4') === 2000000, inc('R4'));
  assert('D5 SPORTS_OVERRIDE untouched even when deceased', inc('R5') === 500000, inc('R5'));
  assert('D5 active seeded adult untouched', inc('R6') === 61000, inc('R6'));
  assert('D5 minor → 0 (existing gate)', inc('R7') === 0, inc('R7'));
  assert('D5 unseeded zero-income adult still gets the fallback fill', inc('R8') > 0, inc('R8'));
  assert('D5 Active 64-year-old stamped retired keeps her salary', inc('R9') === 83497, inc('R9'));
  assert('D5 Tier-1 retired star untouched', inc('R10') === 223635, inc('R10'));
  assert('D5 68-year-old Active senior keeps salary — no age retires anyone', inc('R11') === 90000, inc('R11'));
  assert('D5 CIVIC retired row untouched', inc('R12') === 120000, inc('R12'));
  assert('D5 MEDIA deceased row untouched', inc('R13') === 90000, inc('R13'));
  assert('D5 updated count: R2 (deceased) + R3 (Status Retired) zeroed + minor + fill', res.updated === 4, JSON.stringify(res));
}

// ── D3. tracked-employer Income floor ───────────────────────────────────────
{
  const applyTrackedEmployerFloor_ = sandbox.applyTrackedEmployerFloor_;
  assert('applyTrackedEmployerFloor_ loaded', typeof applyTrackedEmployerFloor_ === 'function');
  const H2 = H.concat(['EmployerBizId']);
  const I2 = n => H2.indexOf(n);
  function row2(o) { const r = row(o).concat(['']); r[I2('EmployerBizId')] = o.EmployerBizId || ''; return r; }
  const BL = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-00170', 'MacArthur Kitchen', 'Restaurant & Dining', 'Laurel', 11, 45000, 990000, 3, ''],
    ['BIZ-00177', 'College Avenue Dental', 'Healthcare', 'Rockridge', 8, 154000, 2464000, 2, ''],
    ['BIZ-00098', 'Apprenticeship Pipeline', 'Workforce Development', 'Downtown', 11, 0, 12500000, 0, ''],
    ['BIZ-00005', 'Oakland Athletics', 'Sports Franchise', 'Baylight District', 520, 3342924, 53357135, 8, '']];
  const rows = [
    row2({ POPID: 'F1', age: 25, CareerStage: 'entry-level', Income: 20000, EmployerBizId: 'BIZ-00170' }),   // floor 0.75×45k = 33750
    row2({ POPID: 'F2', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00170' }),    // floor 45000
    row2({ POPID: 'F3', age: 50, CareerStage: 'senior', Income: 30000, EmployerBizId: 'BIZ-00170' }),        // floor 58500
    row2({ POPID: 'F4', age: 35, CareerStage: 'mid-career', Income: 90000, EmployerBizId: 'BIZ-00170' }),    // above: untouched
    row2({ POPID: 'F5', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00177', Tier: 1 }),  // Tier-1 never re-paid
    row2({ POPID: 'F6', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00177', Tier: 2 }),  // Tier-2 only by story event
    row2({ POPID: 'F7', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'SELF_EMPLOYED' }),  // not tracked
    row2({ POPID: 'F8', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00098' }),     // Avg_Salary 0 → no floor
    row2({ POPID: 'F9', age: 28, CareerStage: 'entry-level', Income: 30000, EmployerBizId: 'BIZ-00005', ClockMode: 'GAME' }), // sports layer
    row2({ POPID: 'F10', age: 70, CareerStage: 'retired', Income: 0, EmployerBizId: 'BIZ-00170' }),           // retired: no floor
    row2({ POPID: 'F11', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00170', Status: 'deceased' }),
    row2({ POPID: 'F12', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-99999' }),    // employer not on ledger
    row2({ POPID: 'F13', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00005' }),    // ENGINE row at a sports franchise: athlete avg must not floor it
    row2({ POPID: 'F14', age: 35, CareerStage: 'mid-career', Income: 30000, EmployerBizId: 'BIZ-00170', ClockMode: 'CIVIC' }), // CIVIC: no floor
  ];
  const ctx = { ledger: { headers: H2.slice(), rows: rows.map(r => r.slice()), dirty: false }, summary: { cycleId: CYCLE }, config: {},
    ss: { getSheetByName: n => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => BL.map(r => r.slice()) }) } : null } };
  const res = applyTrackedEmployerFloor_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(x => x[I2('POPID')] === p)[I2('Income')]);
  assert('D3 entry floor = 0.75 × Avg_Salary', inc('F1') === 33750, inc('F1'));
  assert('D3 mid floor = 1.0 × Avg_Salary', inc('F2') === 45000, inc('F2'));
  assert('D3 senior floor = 1.3 × Avg_Salary', inc('F3') === 58500, inc('F3'));
  assert('D3 raise-only: above the floor untouched', inc('F4') === 90000, inc('F4'));
  assert('D3 Tier-1 never re-paid', inc('F5') === 30000, inc('F5'));
  assert('D3 Tier-2 untouched (story events only)', inc('F6') === 30000, inc('F6'));
  assert('D3 SELF_EMPLOYED not a tracked employer', inc('F7') === 30000, inc('F7'));
  assert('D3 employer with Avg_Salary 0 sets no floor', inc('F8') === 30000, inc('F8'));
  assert('D3 sports layer exempt', inc('F9') === 30000, inc('F9'));
  assert('D3 retired: no floor', inc('F10') === 0, inc('F10'));
  assert('D3 deceased: no floor', inc('F11') === 30000, inc('F11'));
  assert('D3 unknown employer id: no floor', inc('F12') === 30000, inc('F12'));
  assert('D3 sports-franchise employer sets no floor for an ENGINE row', inc('F13') === 30000, inc('F13'));
  assert('D3 CIVIC row gets no floor', inc('F14') === 30000, inc('F14'));
  assert('D3 result counts', res.raised === 3 && res.checked >= 3, JSON.stringify(res));
  assert('D3 no LifeHistory line (a floor correction is not an event)', ctx.ledger.rows.every(r => String(r[I2('LifeHistory')]) === 'Y1C1 — born'));
  assert('D3 ledger dirty', ctx.ledger.dirty === true);
  const ctxNoBL = { ledger: { headers: H2.slice(), rows: rows.map(r => r.slice()), dirty: false }, summary: { cycleId: CYCLE }, config: {}, ss: { getSheetByName: () => null } };
  const res2 = applyTrackedEmployerFloor_(ctxNoBL);
  assert('D3 no Business_Ledger → no-op', res2.raised === 0 && ctxNoBL.ledger.dirty === false, JSON.stringify(res2));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
