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
    row({ POPID: 'P8', age: 19, CareerStage: 'senior', ClockMode: 'GAME', Income: 900000 }),
    row({ POPID: 'P9', age: 40, CareerStage: 'entry-level', EconomicProfileKey: 'SPORTS_OVERRIDE' }),
    row({ POPID: 'P10', age: 40, CareerStage: 'entry-level', Status: 'deceased' }),
    row({ POPID: 'P11', age: 40, CareerStage: '', YearsInCareer: 0 }),           // blank stage, no years → mid by age
    row({ POPID: 'P12', age: 44, CareerStage: 'senior', YearsInCareer: 22 }),    // age band wins upward: 44 is mid, not senior
  ];
  const ctx = ctxWith(rows);
  let res, threw = null;
  try { res = updateCareerProgression_(ctx, CYCLE, ctx.rng); } catch (e) { threw = e.message; }
  assert('E1 no calendar roll: rng never consulted', threw === null, threw);
  const st = p => { const r = ctx.ledger.rows.find(x => x[I('POPID')] === p); return String(r[I('CareerStage')]); };
  assert('E1 <22 → student', st('P1') === 'student', st('P1'));
  assert('E1 22–29 → entry-level', st('P2') === 'entry-level', st('P2'));
  assert('E1 30–44 → mid-career', st('P3') === 'mid-career', st('P3'));
  assert('E1 45–64 → senior', st('P4') === 'senior', st('P4'));
  assert('E1 tie-break: 46 with 3 years → mid-career', st('P5') === 'mid-career', st('P5'));
  assert('E1 tie-break: 33 with 1 year → entry-level', st('P6') === 'entry-level', st('P6'));
  assert('E1 ≥65 → retired', st('P7') === 'retired', st('P7'));
  assert('E1 GAME row untouched', st('P8') === 'senior', st('P8'));
  assert('E1 SPORTS_OVERRIDE row untouched', st('P9') === 'entry-level', st('P9'));
  assert('E1 deceased untouched', st('P10') === 'entry-level', st('P10'));
  assert('E1 blank stage → mid-career by age', st('P11') === 'mid-career', st('P11'));
  assert('E1 44 with 22 years stays mid (age band, not years, sets the ceiling)', st('P12') === 'mid-career', st('P12'));
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
    row({ POPID: 'R4', age: 38, CareerStage: 'retired', ClockMode: 'GAME', Status: 'Retired', Income: 2000000 }),  // retired athlete: game engine's
    row({ POPID: 'R5', age: 38, CareerStage: 'mid-career', EconomicProfileKey: 'SPORTS_OVERRIDE', Status: 'deceased', Income: 500000 }), // sports layer, even deceased: untouched
    row({ POPID: 'R6', age: 40, CareerStage: 'mid-career', Income: 61000 }),
    row({ POPID: 'R7', age: 12, CareerStage: 'student', Income: 9000 }),
    row({ POPID: 'R8', age: 40, CareerStage: 'mid-career', EconomicProfileKey: '', Income: 0, LifeHistory: '[CareerState] income=mid' }),
  ];
  const ctx = ctxWith(rows); ctx.rng = () => 0.5;
  const res = calculateCitizenIncomes_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(x => x[I('POPID')] === p)[I('Income')]);
  assert('D5 retired (ENGINE) → 0', inc('R1') === 0, inc('R1'));
  assert('D5 deceased → 0', inc('R2') === 0, inc('R2'));
  assert('D5 retired by Status too → 0', inc('R3') === 0, inc('R3'));
  assert('D5 retired athlete (GAME) untouched', inc('R4') === 2000000, inc('R4'));
  assert('D5 SPORTS_OVERRIDE untouched even when deceased', inc('R5') === 500000, inc('R5'));
  assert('D5 active seeded adult untouched', inc('R6') === 61000, inc('R6'));
  assert('D5 minor → 0 (existing gate)', inc('R7') === 0, inc('R7'));
  assert('D5 unseeded zero-income adult still gets the fallback fill', inc('R8') > 0, inc('R8'));
  assert('D5 updated count covers the three zeroed + minor + fill', res.updated === 5, JSON.stringify(res));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
