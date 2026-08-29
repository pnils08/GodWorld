#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/illnessEnvelope.test.js
 *
 * engine.133 — City health system (docs/plans/2026-08-29-city-health-system.md).
 * Proof test for the two functions the plan changes, against the live C104
 * hood fixture (Neighborhood_Demographics + Neighborhood_Map, read 2026-08-29).
 *
 *   A. applyDemographicDrift_   — D1/D2: baseline attractor beats the ratchet;
 *                                 a salient weather event is a bump that decays.
 *   B. updateNeighborhoodDemographics_ — D3: hood Sick is a population-weighted
 *                                 envelope of the city rate, uneven, never flat;
 *                                 relief sits under the envelope; a salient
 *                                 event's hoods run hot inside it.
 *
 * Written before the code (Task 1). Expected RED on the D1/D2/D3 assertions
 * until Tasks 2-3 land; the load/shape assertions pass today.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { passed++; console.log('ok ' + label); }
  else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); }
}
const r4 = v => Math.round(v * 10000) / 10000;

// ═══════════════════════════════════════════════════════════════════════════
// Live C104 fixture — 21 Neighborhood_Demographics rows joined to the C104
// Neighborhood_Map row (NoiseIndex, MedianIncome, CrimeIndex, Sentiment).
// ═══════════════════════════════════════════════════════════════════════════
const FIXTURE = {
  "Downtown": { students: 208, adults: 1994, seniors: 204, sick: 105, unemployed: 105, noiseIndex: 13.31, medianIncome: 110947, crimeIndex: 1.07, sentiment: 0.59 },
  "Temescal": { students: 272, adults: 1840, seniors: 258, sick: 105, unemployed: 105, noiseIndex: 4.52, medianIncome: 75083, crimeIndex: 0.73, sentiment: 0.58 },
  "Laurel": { students: 290, adults: 1296, seniors: 317, sick: 105, unemployed: 94, noiseIndex: 3.56, medianIncome: 97918, crimeIndex: 0.45, sentiment: 0.49 },
  "West Oakland": { students: 267, adults: 1426, seniors: 259, sick: 105, unemployed: 100, noiseIndex: 5.84, medianIncome: 80829, crimeIndex: 1.18, sentiment: 0.48 },
  "Fruitvale": { students: 368, adults: 1347, seniors: 308, sick: 104, unemployed: 95, noiseIndex: 5.14, medianIncome: 73268, crimeIndex: 0.99, sentiment: 0.54 },
  "Jack London": { students: 171, adults: 1889, seniors: 156, sick: 105, unemployed: 105, noiseIndex: 9.52, medianIncome: 113524, crimeIndex: 0.91, sentiment: 0.52 },
  "Rockridge": { students: 211, adults: 1293, seniors: 393, sick: 105, unemployed: 94, noiseIndex: 3.28, medianIncome: 114491, crimeIndex: 0.53, sentiment: 0.53 },
  "Adams Point": { students: 238, adults: 1545, seniors: 282, sick: 104, unemployed: 103, noiseIndex: 3.53, medianIncome: 97129, crimeIndex: 0.66, sentiment: 0.6 },
  "Grand Lake": { students: 272, adults: 1420, seniors: 305, sick: 104, unemployed: 100, noiseIndex: 4.04, medianIncome: 73948, crimeIndex: 0.59, sentiment: 0.48 },
  "Piedmont Ave": { students: 216, adults: 1292, seniors: 364, sick: 104, unemployed: 94, noiseIndex: 2.76, medianIncome: 72169, crimeIndex: 0.36, sentiment: 0.43 },
  "Chinatown": { students: 272, adults: 1287, seniors: 343, sick: 105, unemployed: 93, noiseIndex: 6.73, medianIncome: 74775, crimeIndex: 0.86, sentiment: 0.46 },
  "Brooklyn": { students: 301, adults: 1286, seniors: 252, sick: 104, unemployed: 93, noiseIndex: 4, medianIncome: 73578, crimeIndex: 0.68, sentiment: 0.52 },
  "Eastlake": { students: 268, adults: 1421, seniors: 252, sick: 104, unemployed: 100, noiseIndex: 3.55, medianIncome: 73726, crimeIndex: 0.52, sentiment: 0.49 },
  "Glenview": { students: 330, adults: 1283, seniors: 278, sick: 104, unemployed: 93, noiseIndex: 2.68, medianIncome: 73578, crimeIndex: 0.49, sentiment: 0.51 },
  "Dimond": { students: 302, adults: 1284, seniors: 277, sick: 104, unemployed: 93, noiseIndex: 3.33, medianIncome: 73726, crimeIndex: 0.65, sentiment: 0.59 },
  "Ivy Hill": { students: 284, adults: 1157, seniors: 360, sick: 103, unemployed: 85, noiseIndex: 2.28, medianIncome: 73726, crimeIndex: 0.22, sentiment: 0.55 },
  "San Antonio": { students: 335, adults: 1315, seniors: 262, sick: 104, unemployed: 95, noiseIndex: 5.42, medianIncome: 73652, crimeIndex: 0.79, sentiment: 0.42 },
  "Lake Merritt": { students: 27, adults: 226, seniors: 45, sick: 9, unemployed: 9, noiseIndex: 3.71, medianIncome: 96464, crimeIndex: 0.76, sentiment: 0.59 },
  "Uptown": { students: 31, adults: 234, seniors: 43, sick: 9, unemployed: 9, noiseIndex: 6.17, medianIncome: 62811, crimeIndex: 0.76, sentiment: 0.5 },
  "KONO": { students: 25, adults: 172, seniors: 22, sick: 7, unemployed: 9, noiseIndex: 5.23, medianIncome: 32770, crimeIndex: 0.57, sentiment: 0.33 },
  "Baylight District": { students: 27, adults: 163, seniors: 14, sick: 6, unemployed: 9, noiseIndex: 6.79, medianIncome: 73652, crimeIndex: 0.64, sentiment: 0.54 }
};
const HOODS = Object.keys(FIXTURE);
const popOf = d => d.students + d.adults + d.seniors;

// ═══════════════════════════════════════════════════════════════════════════
// VM sandbox
// ═══════════════════════════════════════════════════════════════════════════
const logs = [];
const sandbox = {
  Logger: { log: m => logs.push(String(m)) },
  safeRand_: ctx => (ctx && typeof ctx.rng === 'function') ? ctx.rng : (() => 0.6),
};
vm.createContext(sandbox);
for (const rel of [
  ['phase03-population', 'applyDemographicDrift.js'],          // cfgNum_, pushMissingConfigWarning_
  ['utilities', 'ensureNeighborhoodDemographics.js'],          // NEIGHBORHOOD_PROFILES, DEMO_NEIGHBORHOODS, calculateDemographicShifts_
  ['phase03-population', 'updateNeighborhoodDemographics.js'],
]) {
  const p = path.join(__dirname, '..', ...rel);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
}
const applyDemographicDrift_ = sandbox.applyDemographicDrift_;
const updateNeighborhoodDemographics_ = sandbox.updateNeighborhoodDemographics_;
assert('applyDemographicDrift_ loaded', typeof applyDemographicDrift_ === 'function');
assert('updateNeighborhoodDemographics_ loaded', typeof updateNeighborhoodDemographics_ === 'function');

// ═══════════════════════════════════════════════════════════════════════════
// Config — the engine.102 W2b keys + the engine.133 D6 keys (plan defaults)
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  illnessCalmStep: 0.0004, illnessStepUp: 0.0002, illnessStepDown: 0.0002, illnessCap: 0.15,
  illnessSupportThreshold: 0.08, illnessSupportCycles: 3, illnessFallbackRate: 0.05,
  employmentFloor: 0.80, employmentAttractor: 0.90, employmentStep: 0.0003, employmentFallbackRate: 0.91,
  migrationClampLow: -5000, migrationClampHigh: 5000,
  hospitalBaseCapacity: 100, hospitalLoadPerSick: 1, hospitalTalkbackGain: 0.001,
  illnessInitiativeRelief: 0.25, illnessConvergenceRate: 0.25,
  // engine.133 D6
  illnessBaseline: 0.035, illnessAttractorPull: 0.12, illnessEventStrain: 0.015,
  illnessHoodWeightMin: 0.5, illnessHoodWeightMax: 2.0,
};

// ═══════════════════════════════════════════════════════════════════════════
// A. applyDemographicDrift_ — the ticker
// ═══════════════════════════════════════════════════════════════════════════
function makeWorldPopulation(ill) {
  const header = ['totalPopulation', 'illnessRate', 'employmentRate', 'migration', 'economy'];
  const row = [387975, ill, 0.9015, 0, 'stable'];
  const values = [header, row];
  return {
    getDataRange: () => ({ getValues: () => values.map(r => r.slice()) }),
    getRange: (r, c) => ({ setValue: v => { values[r - 1][c - 1] = v; } }),
    read: () => values[1][1],
  };
}
// One cycle of drift under a given world context; returns the new city rate.
function driftCycle(ill, S) {
  const wp = makeWorldPopulation(ill);
  const ctx = {
    ss: { getSheetByName: n => (n === 'World_Population' ? wp : null) },
    config: Object.assign({}, CONFIG),
    summary: Object.assign({ cycleId: 200 }, S),
    rng: () => 0.6, // base term (rng - 0.6) * step == 0: only the physics speak
  };
  applyDemographicDrift_(ctx);
  return { ill: Number(wp.read()), S: ctx.summary };
}
const QUIET = { season: 'Summer', weather: { type: 'clear' }, weatherMood: {}, worldEvents: [],
  cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 }, economicMood: 50,
  holiday: 'none', isFirstFriday: false, weatherEvents: [] };
// Worst ordinary cycle: every calendar/weather push the drift knows, at once.
const WORST = Object.assign({}, QUIET, { season: 'Winter', weather: { type: 'fog' },
  weatherMood: { comfortIndex: 0.2, conflictPotential: 0.4 }, worldEvents: [{ type: 'x' }],
  economicMood: 30, holiday: 'Holiday', isFirstFriday: true });
// Typical winter cycle.
const WINTER = Object.assign({}, QUIET, { season: 'Winter', weather: { type: 'fog' }, worldEvents: [{ type: 'x' }] });

// A1 — descent from the live 10.23%: monotone, story-scale, arrives.
{
  let ill = 0.1023; const trace = [ill]; let monotone = true; let maxStep = 0;
  for (let c = 0; c < 40; c++) {
    const next = driftCycle(ill, QUIET).ill;
    if (next > ill) monotone = false;
    maxStep = Math.max(maxStep, ill - next);
    ill = next; trace.push(ill);
  }
  assert('A1 descent is monotone under a quiet sky', monotone, trace.map(r4).join(','));
  assert('A1 no single step exceeds pull x gap (no snap)', maxStep <= (0.1023 - CONFIG.illnessBaseline) * CONFIG.illnessAttractorPull + 0.0001 /* round4 */, 'maxStep=' + r4(maxStep));
  assert('A1 not a snap: still above 6% after 5 cycles', trace[5] > 0.06, 'c5=' + r4(trace[5]));
  assert('A1 arrives: within 1pp of baseline by cycle 25', Math.abs(trace[25] - CONFIG.illnessBaseline) <= 0.01, 'c25=' + r4(trace[25]));
}
// A2 — the ratchet is gone: a sustained worst-case push reaches a bounded
// equilibrium under the 8% alarm; a typical winter sits within 1pp of baseline.
{
  let ill = CONFIG.illnessBaseline; const trace = [];
  for (let c = 0; c < 60; c++) { ill = driftCycle(ill, WORST).ill; trace.push(ill); }
  assert('A2 worst-case push converges (c50 ~ c59)', Math.abs(trace[59] - trace[49]) < 0.0005, r4(trace[49]) + ' -> ' + r4(trace[59]));
  assert('A2 worst-case equilibrium stays under the 8% alarm', trace[59] < CONFIG.illnessSupportThreshold, 'eq=' + r4(trace[59]));
  let w = CONFIG.illnessBaseline;
  for (let c = 0; c < 40; c++) w = driftCycle(w, WINTER).ill;
  assert('A2 typical winter holds within 1pp of baseline', Math.abs(w - CONFIG.illnessBaseline) <= 0.01, 'winter eq=' + r4(w));
}
// A3 — a salient weather event is a bump that decays: rate rises by
// illnessEventStrain that cycle, then the attractor pulls it back.
{
  const base = driftCycle(CONFIG.illnessBaseline, QUIET).ill;
  const STORM = Object.assign({}, QUIET, { weatherEvents: [{ type: 'storm', salient: true, hoods: ['Jack London', 'West Oakland'], cycle: 200 }] });
  const hit = driftCycle(CONFIG.illnessBaseline, STORM).ill;
  assert('A3 salient storm lifts the city rate by ~illnessEventStrain', Math.abs((hit - base) - CONFIG.illnessEventStrain) < 0.002, 'lift=' + r4(hit - base));
  const after1 = driftCycle(hit, QUIET).ill; const after2 = driftCycle(after1, QUIET).ill;
  assert('A3 the bump decays after the event passes', after1 < hit && after2 < after1, [hit, after1, after2].map(r4).join(' -> '));
  const nonSalient = driftCycle(CONFIG.illnessBaseline, Object.assign({}, QUIET, { weatherEvents: [{ type: 'rain', cycle: 200 }] })).ill;
  assert('A3 a non-salient event is not a wave', Math.abs(nonSalient - base) < 0.001, 'lift=' + r4(nonSalient - base));
}

// ═══════════════════════════════════════════════════════════════════════════
// B. updateNeighborhoodDemographics_ — the envelope
// ═══════════════════════════════════════════════════════════════════════════
function cloneDemo() {
  const d = {};
  for (const h of HOODS) { const f = FIXTURE[h]; d[h] = { students: f.students, adults: f.adults, seniors: f.seniors, sick: f.sick, unemployed: f.unemployed }; }
  return d;
}
function hoodState() {
  const s = {};
  for (const h of HOODS) { const f = FIXTURE[h]; s[h] = { noiseIndex: f.noiseIndex, medianIncome: f.medianIncome, crimeIndex: f.crimeIndex, sentiment: f.sentiment, housingPressure: 0, medianRent: 0, migrationFlow: 5 }; }
  return s;
}
// Run N cycles of the hood allocator against a fixed city rate; returns the
// final demographics map. Sheet I/O is stubbed at the utility seam.
function runHoods(cycles, cityRate, extraS) {
  let demo = cloneDemo(); let written = null;
  sandbox.getNeighborhoodDemographics_ = () => demo;
  sandbox.batchUpdateNeighborhoodDemographics_ = (ss, map) => { written = map; };
  for (let c = 0; c < cycles; c++) {
    const ctx = {
      ss: {}, config: Object.assign({}, CONFIG), rng: () => 0.6,
      summary: Object.assign({
        cycleId: 200 + c, demographicDrift: { illnessRate: cityRate, employmentRate: 0.9015, migration: 0 },
        neighborhoodState: hoodState(), weatherEvents: [], holiday: 'none', isFirstFriday: false, isCreationDay: false,
      }, extraS || {}),
    };
    updateNeighborhoodDemographics_(ctx);
    demo = written;
  }
  return demo;
}
function rates(demo) { const o = {}; for (const h of HOODS) o[h] = demo[h].sick / popOf(demo[h]); return o; }
function aggregate(demo) { let p = 0, s = 0; for (const h of HOODS) { p += popOf(demo[h]); s += demo[h].sick; } return s / p; }

const CITY = 0.035;
const conv = runHoods(30, CITY);
const convRates = rates(conv);
const rateVals = HOODS.map(h => convRates[h]);
// B1 — envelope: hood aggregate lands on the city rate, not 21 copies of it.
assert('B1 Σ hood Sick / Σ pop lands on the city rate (±0.2pp)', Math.abs(aggregate(conv) - CITY) <= 0.002, 'agg=' + r4(aggregate(conv)));
assert('B1 hoods are uneven: max/min rate >= 1.4', Math.max(...rateVals) / Math.min(...rateVals) >= 1.4, 'ratio=' + r4(Math.max(...rateVals) / Math.min(...rateVals)));
assert('B1 no hood is a flat copy of the city rate (>= 6 hoods off by > 0.3pp)', rateVals.filter(v => Math.abs(v - CITY) > 0.003).length >= 6, rateVals.map(r4).join(','));
// B2 — the weights point the right way on the live data.
assert('B2 the oldest hood (Rockridge, seniors 1.4x) runs above the city rate', convRates['Rockridge'] > CITY, r4(convRates['Rockridge']));
assert('B2 the richest hood (Rockridge/Jack London) runs below the poorest (KONO)', convRates['KONO'] > Math.min(convRates['Rockridge'], convRates['Jack London']), 'KONO=' + r4(convRates['KONO']));
// B3 — relief sits UNDER the envelope; the clinic does not tax its neighbors.
{
  const relieved = runHoods(30, CITY, { initiativeHealthRelief: { Temescal: 1 } });
  const rr = rates(relieved);
  assert('B3 relief pulls the delivering hood below its share', rr['Temescal'] < convRates['Temescal'] - 0.003, r4(convRates['Temescal']) + ' -> ' + r4(rr['Temescal']));
  assert('B3 aggregate stays inside the envelope (<= city rate)', aggregate(relieved) <= CITY + 0.0005, 'agg=' + r4(aggregate(relieved)));
  const others = HOODS.filter(h => h !== 'Temescal');
  const shifted = others.filter(h => Math.abs(rr[h] - convRates[h]) > 0.0015);
  assert('B3 relief in Temescal does not push its patients onto other hoods', shifted.length === 0, 'moved: ' + shifted.join(','));
}
// B4 — a salient storm's hoods run hot inside the envelope.
{
  const storm = runHoods(30, CITY, { weatherEvents: [{ type: 'storm', salient: true, hoods: ['Jack London', 'West Oakland'], cycle: 200 }] });
  const sr = rates(storm);
  assert('B4 storm hoods run above their structural share', sr['Jack London'] > convRates['Jack London'] + 0.002 && sr['West Oakland'] > convRates['West Oakland'] + 0.002, r4(sr['Jack London']) + '/' + r4(sr['West Oakland']));
  assert('B4 envelope holds with the event inside it (±0.2pp)', Math.abs(aggregate(storm) - CITY) <= 0.002, 'agg=' + r4(aggregate(storm)));
}
// B5 — engine.132 convergence survives: no hood steps more than max(3, 25% of gap).
{
  let demo = cloneDemo(); let written = null;
  sandbox.getNeighborhoodDemographics_ = () => demo;
  sandbox.batchUpdateNeighborhoodDemographics_ = (ss, map) => { written = map; };
  const ctx = { ss: {}, config: Object.assign({}, CONFIG), rng: () => 0.6, summary: { cycleId: 200, demographicDrift: { illnessRate: CITY, employmentRate: 0.9015, migration: 0 }, neighborhoodState: hoodState(), weatherEvents: [] } };
  updateNeighborhoodDemographics_(ctx);
  let ok = true, worst = '';
  for (const h of HOODS) { const step = Math.abs(written[h].sick - FIXTURE[h].sick); const gap = Math.abs(popOf(FIXTURE[h]) * CITY - FIXTURE[h].sick); if (step > Math.max(3, Math.ceil(gap * 0.25 * 2.2)) ) { ok = false; worst += h + ':' + step + ' '; } }
  assert('B5 per-cycle hood step stays on the engine.132 convergence timescale', ok, worst);
}

// ═══════════════════════════════════════════════════════════════════════════
// C. applyStorySeeds_ — D4: the HEALTH seed names the hoods that crossed and
//    the citizens in them; no hot hood, no seed. applyStorySeeds_ leans on a
//    dozen optional engine globals (byline, priority, storyline state) that are
//    all typeof-guarded or degrade to null, so a permissive sandbox stubs them.
// ═══════════════════════════════════════════════════════════════════════════
{
  let uu = 0;
  const real = { Utilities: { getUuid: () => 'uuid-' + (++uu) }, Logger: { log: () => {} }, safeRand_: ctx => ctx.rng,
    Math, JSON, Object, Array, String, Number, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat };
  const sb = new Proxy(real, { has: () => true, get: (t, k) => (k in t) ? t[k] : (typeof k === 'symbol' ? undefined : function () { return undefined; }) });
  vm.createContext(sb);
  const p = path.join(__dirname, '..', 'phase07-evening-media', 'applyStorySeeds.js');
  vm.runInContext(fs.readFileSync(p, 'utf8'), sb, { filename: p });
  const hood = (pop, sick) => ({ students: Math.round(pop * 0.15), adults: Math.round(pop * 0.7), seniors: pop - Math.round(pop * 0.15) - Math.round(pop * 0.7), sick, unemployed: 50 });
  function runSeeds(nd, events) {
    const S = { cycleId: 114, neighborhoodDemographics: nd, demographicDrift: { illnessRate: 0.045, illnessSupportThreshold: 0.08 },
      generationalEvents: events, worldEvents: [], weather: {}, cityDynamics: {}, worldPopulation: { illnessRate: 0.045 }, domainPresence: {}, eventArcs: [], crimeMetrics: {} };
    const ctx = { ss: null, config: {}, summary: S, rng: () => 0.6, ledger: null };
    real.applyStorySeeds_(ctx);
    return (ctx.summary.storySeeds || []).filter(x => String(x.domain).toUpperCase() === 'HEALTH');
  }
  const ev = (name, popId, hoodName) => ({ type: 'health_event', tag: 'Health', citizen: name, popId, neighborhood: hoodName, description: 'x' });
  // C1 — watch bar: one hood at 6.1%, faces from that hood only
  const c1 = runSeeds({ Chinatown: hood(2288, 140), Rockridge: hood(2280, 100), Baylight: hood(627, 10) }, [ev('Mei Tan', 'POP-00999', 'Chinatown'), ev('Lou Reed', 'POP-00998', 'Rockridge')]);
  assert('C1 one HEALTH seed when one hood passes the 6% watch bar', c1.length === 1, 'got ' + c1.length);
  assert('C1 seed names the crossing hood, not Temescal', c1[0] && c1[0].neighborhood === 'Chinatown' && /Chinatown/.test(c1[0].text) && !/Temescal/.test(c1[0].text), c1[0] && c1[0].text);
  assert('C1 priority 2 below the 8% threshold', c1[0] && c1[0].priority === 2, c1[0] && String(c1[0].priority));
  assert('C1 faces are the hood\'s own Health cases (Mei Tan in, Lou Reed out)', c1[0] && c1[0].suggestedCitizens.length === 1 && c1[0].suggestedCitizens[0].name === 'Mei Tan', c1[0] && JSON.stringify(c1[0].suggestedCitizens));
  // C2 — crossed: 8.5% → priority 3, "past the illness threshold", face named in text
  const c2 = runSeeds({ Chinatown: hood(2288, 195), Rockridge: hood(2280, 100) }, [ev('Mei Tan', 'POP-00999', 'Chinatown')]);
  assert('C2 crossing the threshold is priority 3 and says so', c2.length === 1 && c2[0].priority === 3 && /past the illness threshold/.test(c2[0].text) && /Mei Tan/.test(c2[0].text), c2[0] && c2[0].text);
  // C3 — quiet city: no hood over 6% → no HEALTH seed, whatever the city rate says
  const c3 = runSeeds({ Chinatown: hood(2288, 100), Rockridge: hood(2280, 90) }, [ev('Mei Tan', 'POP-00999', 'Chinatown')]);
  assert('C3 no hot hood → no HEALTH seed', c3.length === 0, 'got ' + c3.length);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
