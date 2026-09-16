#!/usr/bin/env node
'use strict';

/**
 * engine.192 — the school table breathes (SIM_DOCTRINE §16).
 *
 * SchoolQualityIndex / GraduationRate / CollegeReadinessRate / TeacherQuality / Funding on
 * Neighborhood_Demographics were backfilled once and never moved. driftNeighborhoodEducation_
 * (Phase3-NeighborhoodDemo) moves them per Cycle off signed causes relative to the city's own
 * median — hood pressure, crime level, funding, a delivering education initiative — with a step
 * cap and a slow pull toward what the funding says. Offline proof in a vm; every number a fixture.
 * Run: node scripts/schoolDrift.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt, console,
  safeRand_: () => () => 0.5, pushMissingConfigWarning_: () => {}, simYearOf_: () => 2042 };
vm.createContext(sb);
load(sb, 'phase03-population/updateNeighborhoodDemographics.js');

const HOODS = ['Downtown', 'Temescal', 'Rockridge', 'Fruitvale', 'East Oakland', 'Chinatown', 'Laurel', 'Eastlake'];
function demo(edu) {
  const d = {};
  HOODS.forEach((h, i) => { d[h] = { neighborhood: h, students: 200 + i, education: Object.assign({}, edu[h] || { quality: 7.5, gradRate: 87.5, readiness: 58, teacher: 7.5, funding: 13000 }) }; });
  return d;
}
function ctxFor(opts) {
  const nState = {}, crime = {}, init = {};
  HOODS.forEach(h => { nState[h] = { housingPressure: 3, crimeIndex: 0.7 }; crime[h] = { propertyLevel: 40, violentLevel: 30 }; });
  Object.assign(nState, opts.nState || {}); Object.keys(opts.crime || {}).forEach(h => Object.assign(crime[h], opts.crime[h]));
  Object.keys(opts.init || {}).forEach(h => { init[h] = { schoolQuality: opts.init[h] }; });
  return { config: Object.assign({}, opts.config || {}), summary: { neighborhoodState: nState, crimeMetrics: { byNeighborhood: crime }, initiativeNeighborhoodEffects: init } };
}
function run(d, opts, cycles) {
  let ctx; for (let i = 0; i < (cycles || 1); i++) { ctx = ctxFor(opts || {}); sb.driftNeighborhoodEducation_(ctx, d); }
  return ctx;
}

console.log('engine.192 — a flat city holds still');
(function () {
  const d = demo({}); run(d, {}, 50);
  check('all hoods equal → nothing moves in 50 Cycles', HOODS.every(h => d[h].education.quality === 7.5 && d[h].education.gradRate === 87.5 && d[h].education.funding === 13000),
    JSON.stringify(d.Downtown.education));
})();

console.log('engine.192 — the live backfill under live-shaped causes');
(function () {
  // the live table: Rockridge 9/95/78/9/15000, East Oakland 7/85/52/7/11000, the rest between
  const d = demo({ Rockridge: { quality: 9, gradRate: 95, readiness: 78, teacher: 9, funding: 15000 }, 'East Oakland': { quality: 7, gradRate: 85, readiness: 52, teacher: 7, funding: 11000 },
    Downtown: { quality: 8, gradRate: 91, readiness: 66, teacher: 8, funding: 14500 } });
  const ctx = run(d, {}, 1);
  const rk = ctx.summary.schoolDrift.Rockridge;
  check('S.schoolDrift published with prev/now/causes per hood', rk && rk.prev.quality === 9 && typeof rk.now.quality === 'number' && 'funding' in rk.causes);
  check('one Cycle moves quality by at most the step (0.1) + pull', HOODS.every(h => Math.abs(ctx.summary.schoolDrift[h].now.quality - ctx.summary.schoolDrift[h].prev.quality) <= 0.1 + 0.02 * 2.5 + 1e-9));
  run(d, {}, 30);
  check('30 flat Cycles: Rockridge stays above East Oakland (the money still says so)', d.Rockridge.education.quality > d['East Oakland'].education.quality + 0.5,
    d.Rockridge.education.quality + ' vs ' + d['East Oakland'].education.quality);
  check('30 flat Cycles: nothing pinned at a bound', HOODS.every(h => d[h].education.quality > 1 && d[h].education.quality < 10 && d[h].education.gradRate < 99));
  check('Funding untouched with no education initiative', HOODS.every(h => [11000, 13000, 14500, 15000].indexOf(d[h].education.funding) >= 0));
})();

console.log('engine.192 — a cause moves a hood, and it comes back when the cause clears');
(function () {
  const d = demo({});
  run(d, { crime: { Fruitvale: { propertyLevel: 80, violentLevel: 70 } }, nState: { Fruitvale: { housingPressure: 8, crimeIndex: 1.5 } } }, 20);
  const low = d.Fruitvale.education.quality;
  check('20 Cycles of high crime + pressure: Fruitvale quality falls, the others hold', low < 7.5 - 1.0 && d.Temescal.education.quality >= 7.4, low + ' / ' + d.Temescal.education.quality);
  check('gradRate lags quality down (below 87.5, above the dropout bar)', d.Fruitvale.education.gradRate < 87.5 && d.Fruitvale.education.gradRate > 65, String(d.Fruitvale.education.gradRate));
  check('readiness lags too', d.Fruitvale.education.readiness < 58);
  run(d, {}, 60);
  check('60 quiet Cycles after the cause clears: Fruitvale recovers most of the way (pull)', d.Fruitvale.education.quality > low + 0.5 && d.Fruitvale.education.quality <= 7.5, low + ' → ' + d.Fruitvale.education.quality);
})();

console.log('engine.192 — an education initiative is the one thing that moves Funding');
(function () {
  const d = demo({});
  run(d, { init: { Chinatown: 0.05 } }, 10);
  check('10 delivering Cycles: Chinatown funding grows ~2%/Cycle', d.Chinatown.education.funding > 13000 * 1.2 && d.Chinatown.education.funding < 13000 * 1.25, String(d.Chinatown.education.funding));
  check('Chinatown quality and teacher rise; the others do not', d.Chinatown.education.quality > 7.9 && d.Chinatown.education.teacher > 7.7 && d.Laurel.education.quality <= 7.5, d.Chinatown.education.quality + '/' + d.Chinatown.education.teacher);
  check('config keys steer: step 0.5 moves faster', (() => { const e = demo({}); run(e, { init: { Chinatown: 0.05 }, config: { schoolDriftStep: 0.5 } }, 10); return e.Chinatown.education.quality > d.Chinatown.education.quality; })());
})();

console.log('engine.192 — bounds hold under 200 hostile Cycles');
(function () {
  const d = demo({});
  run(d, { crime: { Downtown: { propertyLevel: 95, violentLevel: 95 } }, nState: { Downtown: { housingPressure: 10 } }, init: { Rockridge: 0.2 } }, 200);
  check('worst hood bottoms at 1, best tops at 10, no NaN', d.Downtown.education.quality >= 1 && d.Rockridge.education.quality <= 10 && HOODS.every(h => !isNaN(d[h].education.quality) && !isNaN(d[h].education.gradRate)),
    d.Downtown.education.quality + ' / ' + d.Rockridge.education.quality);
  check('gradRate floor 40, readiness floor 20', d.Downtown.education.gradRate >= 40 && d.Downtown.education.readiness >= 20);
  check('DROPOUT bar (65) is reachable by a real cause', d.Downtown.education.gradRate < 65, String(d.Downtown.education.gradRate));
})();

console.log('engine.192 — rows without the columns are left alone');
(function () {
  const d = { Downtown: { neighborhood: 'Downtown', students: 10, education: null } };
  const ctx = run(d, {}, 1);
  check('no education → no drift, empty S.schoolDrift', d.Downtown.education === null && Object.keys(ctx.summary.schoolDrift).length === 0);
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
