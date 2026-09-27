#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/employmentEnvelope.test.js
 *
 * engine.135 — Employment System Cascade, Phases A + B2
 * (docs/plans/2026-08-29-employment-system-cascade.md). Proof test written
 * before the code, against the live C104 hood fixture joined to the authored
 * hood profile (Neighborhood_Map cols IncomeTier/BoomIndex/MedianIncome, plan
 * §B1) and the live Business_Ledger employer depth (Σ Employee_Count by hood).
 *
 *   A. applyDemographicDrift_   — the city employment dial is PULLED to the
 *                                 attractor (fraction of the gap per cycle),
 *                                 not stepped 0.0003 at a time.
 *   B. updateNeighborhoodDemographics_ — hood Unemployed is an adults-weighted
 *                                 ENVELOPE of the city rate: Σ hood = city × Σ
 *                                 adults, uneven, pointed by the canon profile
 *                                 (income tier, boom exposure, employer depth);
 *                                 a hood with no profile reads neutral.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { passed++; console.log('ok ' + label); } else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); } }
const r4 = v => Math.round(v * 10000) / 10000;

// hood: [students, adults, seniors, unemployed, tier, boomIndex, medianIncome, blEmployees]
const F = {
  'Downtown':          [208, 1994, 204, 105, 4,  0.6, 120000, 6738],
  'Temescal':          [272, 1840, 258, 105, 1, -0.7,  68000,   89],
  'Laurel':            [290, 1296, 317,  94, 3, -0.1,  86000,   13],
  'West Oakland':      [267, 1426, 259, 100, 5,  0.9, 145000,  775],
  'Fruitvale':         [368, 1347, 308,  95, 3,  0.7,  98000,  209],
  'Jack London':       [171, 1889, 156, 105, 4,  0.6, 118000, 1781],
  'Rockridge':         [211, 1293, 393,  94, 5,  0.7, 160000,   34],
  'Adams Point':       [238, 1545, 282, 103, 3,  0.4,  95000,    4],
  'Grand Lake':        [272, 1420, 305, 100, 3,  0.4, 105000,    9],
  'Piedmont Ave':      [216, 1292, 364,  94, 5,  0.4, 150000, 2614],
  'Chinatown':         [272, 1287, 343,  93, 3,  0.0,  84000,   30],
  'Brooklyn':          [301, 1286, 252,  93, 4,  0.8, 130000,    0],
  'Eastlake':          [268, 1421, 252, 100, 3,  0.0,  84000,    0],
  'Glenview':          [330, 1283, 278,  93, 2, -0.4,  82000,    0],
  'Dimond':            [302, 1284, 277,  93, 2, -0.4,  80000,   16],
  'Ivy Hill':          [284, 1157, 360,  85, 2, -0.4,  78000,    0],
  'San Antonio':       [335, 1315, 262,  95, 2, -0.3,  70000,    0],
  'Lake Merritt':      [ 27,  226,  45,   9, 6,  0.3, 185000,  134],
  'Uptown':            [ 31,  234,  43,   9, 3,  0.6,  96000,  182],
  'KONO':              [ 25,  172,  22,   9, 3,  0.3,  82000,   10],
  'Baylight District': [ 27,  163,  14,   9, 5,  1.0, 140000, 2813],
};
const HOODS = Object.keys(F);

const sandbox = {
  Logger: { log: () => {} }, Math, JSON, Object, Array, String, Number, Date, isNaN, isFinite, parseInt, parseFloat, console,
  safeRand_: ctx => (ctx && typeof ctx.rng === 'function') ? ctx.rng : (() => 0.6),
};
vm.createContext(sandbox);
for (const rel of [
  ['phase03-population', 'applyDemographicDrift.js'],
  ['utilities', 'ensureNeighborhoodDemographics.js'],
  ['phase03-population', 'updateNeighborhoodDemographics.js'],
]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); }
const applyDemographicDrift_ = sandbox.applyDemographicDrift_;
const updateNeighborhoodDemographics_ = sandbox.updateNeighborhoodDemographics_;
assert('applyDemographicDrift_ loaded', typeof applyDemographicDrift_ === 'function');
assert('updateNeighborhoodDemographics_ loaded', typeof updateNeighborhoodDemographics_ === 'function');
assert('buildHoodEmploymentWeights_ exists', typeof sandbox.buildHoodEmploymentWeights_ === 'function');

const CONFIG = {
  illnessCalmStep: 0.0004, illnessStepUp: 0.0002, illnessStepDown: 0.0002, illnessCap: 0.15,
  illnessSupportThreshold: 0.08, illnessSupportCycles: 3, illnessFallbackRate: 0.05,
  illnessBaseline: 0.035, illnessAttractorPull: 0.12, illnessEventStrain: 0.015, illnessHoodWeightMin: 0.5, illnessHoodWeightMax: 2.0,
  illnessInitiativeRelief: 0.25, illnessConvergenceRate: 0.25,
  migrationClampLow: -5000, migrationClampHigh: 5000, hospitalBaseCapacity: 100, hospitalLoadPerSick: 1, hospitalTalkbackGain: 0.001,
  // engine.135 A — the realistic-with-boom-kick dial (plan §Phase A)
  employmentFloor: 0.88, employmentAttractor: 0.96, employmentFallbackRate: 0.96, employmentAttractorPull: 0.12, employmentDistressGain: 0.3,
  // engine.135 B2
  employmentHoodWeightMin: 0.5, employmentHoodWeightMax: 2.0, employmentConvergenceRate: 0.25,
};

// ── A. the dial ─────────────────────────────────────────────────────────────
function makeWP(emp) {
  const header = ['totalPopulation', 'illnessRate', 'employmentRate', 'migration', 'economy'];
  const values = [header, [387975, 0.05, emp, 0, 'stable']];
  return { getDataRange: () => ({ getValues: () => values.map(r => r.slice()) }), getRange: (r, c) => ({ setValue: v => { values[r - 1][c - 1] = v; } }), read: () => values[1][2] };
}
const QUIET = { season: 'Summer', weather: { type: 'clear' }, weatherMood: {}, worldEvents: [], cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 }, economicMood: 50, holiday: 'none', isFirstFriday: false, weatherEvents: [] };
function driftCycle(emp, S) {
  const wp = makeWP(emp);
  const ctx = { ss: { getSheetByName: n => (n === 'World_Population' ? wp : null) }, config: Object.assign({}, CONFIG), summary: Object.assign({ cycleId: 200 }, S), rng: () => 0.6 };
  applyDemographicDrift_(ctx);
  return Number(wp.read());
}
{
  let emp = 0.9015; const trace = [emp]; let monotone = true;
  for (let c = 0; c < 40; c++) { const n = driftCycle(emp, QUIET); if (n < emp) monotone = false; emp = n; trace.push(emp); }
  assert('A1 dial climbs monotonically toward the attractor under a quiet sky', monotone, trace.map(r4).join(','));
  assert('A1 not a snap: still below 0.95 after 3 cycles', trace[3] < 0.95, 'c3=' + r4(trace[3]));
  assert('A1 arrives: within 0.5pp of 0.96 by cycle 25 (a 0.0003 step would need ~200)', Math.abs(trace[25] - CONFIG.employmentAttractor) <= 0.005, 'c25=' + r4(trace[25]));
  let hi = 0.985; for (let c = 0; c < 25; c++) hi = driftCycle(hi, QUIET);
  assert('A2 the pull is symmetric: an over-boom dial comes back to the attractor', Math.abs(hi - CONFIG.employmentAttractor) <= 0.005, 'c25=' + r4(hi));
  let fl = 0.80; for (let c = 0; c < 1; c++) fl = driftCycle(fl, QUIET);
  assert('A3 floor 0.88 binds', fl >= CONFIG.employmentFloor, r4(fl));
}

// ── A2. engine.193 cut 3 — the target reads the business ledger ─────────────
function bizSheet(rows) {
  const v = [['BIZ_ID', 'Name', 'Employee_Count']].concat(rows);
  return { getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }) };
}
// 10 businesses × 1,000 stated jobs; `bad` of them went negative last week
function distressCycle(emp, bad, cfgOver, dynOver) {
  const wp = makeWP(emp);
  const rows = [], dyn = {};
  for (let i = 0; i < 10; i++) { rows.push(['BIZ-' + i, 'B' + i, 1000]); dyn['BIZ-' + i] = [i < bad ? 3 : 0, 0, 0]; }
  const ctx = { ss: { getSheetByName: n => (n === 'World_Population' ? wp : n === 'Business_Ledger' ? bizSheet(rows) : null) },
    config: Object.assign({}, CONFIG, cfgOver || {}),
    summary: Object.assign({ cycleId: 200, previousCycleState: { businessDynamics: dynOver === undefined ? dyn : dynOver } }, QUIET), rng: () => 0.6 };
  applyDemographicDrift_(ctx);
  return { emp: Number(wp.read()), d: ctx.summary.employmentDistress };
}
{
  const healthy = distressCycle(0.96, 0);
  assert('A2 healthy ledger: target = attractor, nothing standing', healthy.d.share === 0 && Math.abs(healthy.d.target - 0.96) < 1e-9, JSON.stringify(healthy.d));
  const two = distressCycle(0.96, 2);
  assert('A2 20% of stated jobs distressed: target 0.96 − 0.3×0.2 = 0.90', Math.abs(two.d.target - 0.90) < 1e-9 && two.d.distressedJobs === 2000 && two.d.statedJobs === 10000, JSON.stringify(two.d));
  let e = 0.96; for (let c = 0; c < 20; c++) e = distressCycle(e, 3).emp;
  assert('A2 sustained 30% distress holds employment down past the 8% tier (target 0.87)', e < 0.92 && e >= 0.87 - 0.005, r4(e));
  let held = e; for (let c = 0; c < 5; c++) held = distressCycle(held, 3).emp;
  assert('A2 the attractor does not pull it back while businesses are still shedding', held <= e + 0.002, r4(e) + '→' + r4(held));
  let rec = held; const recTrace = []; for (let c = 0; c < 25; c++) { rec = distressCycle(rec, 0).emp; recTrace.push(rec); }
  assert('A2 recovery releases it: climbs back toward 0.96 once the ledger heals', recTrace.every((v, i) => i === 0 || v >= recTrace[i - 1]) && rec > 0.95, r4(rec));
  let deep = 0.96; for (let c = 0; c < 60; c++) deep = distressCycle(deep, 10, { employmentFloor: 0.85 }).emp;
  assert('A2 a whole-ledger collapse stops at the floor (0.85 → 15% unemployed max)', Math.abs(deep - 0.85) < 1e-9, r4(deep));
  const cold = distressCycle(0.96, 5, null, null);
  assert('A2 no carried business state (cold start) → share 0, no invented distress', cold.d.share === 0);
  const closing = distressCycle(0.96, 0, null, { 'BIZ-0': [0, 0, 118] });
  assert('A2 a closing business counts as distressed', Math.abs(closing.d.share - 0.1) < 1e-9, JSON.stringify(closing.d));
}

// ── B. the envelope ─────────────────────────────────────────────────────────
function cloneDemo() { const d = {}; for (const h of HOODS) { const f = F[h]; d[h] = { students: f[0], adults: f[1], seniors: f[2], sick: 100, unemployed: f[3] }; } return d; }
function hoodState(withProfile) {
  const s = {};
  for (const h of HOODS) { const f = F[h]; s[h] = withProfile
    ? { noiseIndex: 5, medianIncome: f[6], incomeTier: f[4], boomIndex: f[5], boomExposure: 'x', employerCharacter: 'x', wealthMin: 3, wealthMax: 6, crimeIndex: 0.7, sentiment: 0.5 }
    : { noiseIndex: 5, medianIncome: null, incomeTier: null, boomIndex: null, boomExposure: '', employerCharacter: '', wealthMin: null, wealthMax: null, crimeIndex: 0.7, sentiment: 0.5 }; }
  return s;
}
function depth() { const d = {}; for (const h of HOODS) { const e = F[h][7]; d[h] = { rows: e > 0 ? 1 : 0, employees: e, growthWeighted: e * 0.03 }; } return d; }
function runHoods(cycles, cityEmp, opts) {
  opts = opts || {}; let demo = cloneDemo(); let written = null;
  sandbox.getNeighborhoodDemographics_ = () => demo;
  sandbox.batchUpdateNeighborhoodDemographics_ = (ss, map) => { written = map; };
  for (let c = 0; c < cycles; c++) {
    const ctx = { ss: {}, config: Object.assign({}, CONFIG), rng: () => 0.6, summary: Object.assign({
      cycleId: 200 + c, demographicDrift: { illnessRate: 0.04, employmentRate: cityEmp, migration: 0 }, worldPopulation: { totalPopulation: 450000 },
      neighborhoodState: hoodState(opts.profile !== false), hoodEmployerDepth: opts.depth === false ? undefined : depth(),
      weatherEvents: [], holiday: 'none', isFirstFriday: false, isCreationDay: false }, opts.S || {}) };
    updateNeighborhoodDemographics_(ctx); demo = written;
  }
  return demo;
}
const urate = (demo, h) => demo[h].unemployed / demo[h].adults;
function agg(demo) { let a = 0, u = 0; for (const h of HOODS) { a += demo[h].adults; u += demo[h].unemployed; } return u / a; }
const CITY_EMP = 0.96, CITY_U = 1 - CITY_EMP;
const conv = runHoods(40, CITY_EMP);
const rates = {}; HOODS.forEach(h => rates[h] = urate(conv, h));
const vals = HOODS.map(h => rates[h]);
assert('B1 Σ hood Unemployed / Σ adults lands on the city rate (±0.2pp)', Math.abs(agg(conv) - CITY_U) <= 0.002, 'agg=' + r4(agg(conv)) + ' city=' + CITY_U);
assert('B1 hoods are uneven: max/min >= 1.8', Math.max(...vals) / Math.min(...vals) >= 1.8, 'ratio=' + r4(Math.max(...vals) / Math.min(...vals)));
assert('B1 spread top-bottom >= 2pp', Math.max(...vals) - Math.min(...vals) >= 0.02, 'spread=' + r4(Math.max(...vals) - Math.min(...vals)));
assert('B2 Temescal (behind, tier 1) runs above the city rate', rates['Temescal'] > CITY_U, r4(rates['Temescal']));
assert('B2 Lake Merritt (untouched, tier 6) runs below the city rate', rates['Lake Merritt'] < CITY_U, r4(rates['Lake Merritt']));
assert('B2 San Antonio (absorbed) above Fruitvale (transit)', rates['San Antonio'] > rates['Fruitvale'], r4(rates['San Antonio']) + ' vs ' + r4(rates['Fruitvale']));
assert('B2 employer depth matters: Downtown below Adams Point at the same tier band', rates['Downtown'] < rates['Adams Point'], r4(rates['Downtown']) + ' vs ' + r4(rates['Adams Point']));
{
  const flat = runHoods(40, CITY_EMP, { profile: false, depth: false });
  const fv = HOODS.map(h => urate(flat, h));
  // integer rounding on the 163–234-adult hoods is ±0.3pp by itself; big hoods must sit within 0.1pp
  const big = HOODS.filter(h => F[h][1] >= 1000).map(h => urate(flat, h));
  assert('B3 no profile, no depth → neutral weights: big hoods within 0.1pp, all within 0.8pp, envelope still holds', Math.max(...big) - Math.min(...big) <= 0.001 && Math.max(...fv) - Math.min(...fv) <= 0.008 && Math.abs(agg(flat) - CITY_U) <= 0.002, 'bigSpread=' + r4(Math.max(...big) - Math.min(...big)) + ' spread=' + r4(Math.max(...fv) - Math.min(...fv)));
}
{
  let demo = cloneDemo(); let written = null;
  sandbox.getNeighborhoodDemographics_ = () => demo; sandbox.batchUpdateNeighborhoodDemographics_ = (ss, map) => { written = map; };
  const ctx = { ss: {}, config: Object.assign({}, CONFIG), rng: () => 0.6, summary: { cycleId: 200, worldPopulation: { totalPopulation: 450000 }, demographicDrift: { illnessRate: 0.04, employmentRate: CITY_EMP, migration: 0 }, worldPopulation: { totalPopulation: 450000 }, neighborhoodState: hoodState(true), hoodEmployerDepth: depth(), weatherEvents: [] } };
  // engine.134 Task 7: the ctx publication was an orphaned write and is gone;
  // the target weights are recomputed from the same inputs the engine reads.
  const W = sandbox.buildHoodEmploymentWeights_(ctx, ctx.summary, cloneDemo()).byHood;
  updateNeighborhoodDemographics_(ctx);
  let wa = 0, aa = 0; for (const h of HOODS) { wa += (W[h] ? W[h].weight : 1) * F[h][1]; aa += F[h][1]; } const mean = wa / aa;
  let ok = true, worst = '';
  for (const h of HOODS) { const target = F[h][1] * CITY_U * ((W[h] ? W[h].weight : 1) / mean); const gap = Math.abs(target - F[h][3]); const step = Math.abs(written[h].unemployed - F[h][3]); if (step > Math.max(3, Math.ceil(gap * 0.25)) + 1) { ok = false; worst += h + ':' + step + '/' + r4(gap) + ' '; } }
  assert('B4 per-cycle step is bounded (convergence, not a snap)', ok, worst);
  assert('B4 S.neighborhoodEmploymentWeights is NOT published (orphaned write retired, engine.134 T7)', ctx.summary.neighborhoodEmploymentWeights === undefined);
}
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
