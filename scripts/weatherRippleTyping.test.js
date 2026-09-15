#!/usr/bin/env node
'use strict';

/**
 * engine.229 — the economy's disasters are the weather model's salient events.
 *
 * detectNewRipples_ read `S.crisisSpikes` (never written) for NATURAL_DISASTER and gated the
 * generic INFRASTRUCTURE_FAILURE on `weather.impact >= 1.4` (never crossed on 32 recorded Cycles),
 * pinned to a West Oakland literal. Now: flood_conditions → NATURAL_DISASTER (−25 × 8) on the flood
 * hoods; storm / heat_wave → INFRASTRUCTURE_FAILURE (−10 × 6) on the event's hoods; nothing else.
 * Every hood and number below is a fixture. Run: node scripts/weatherRippleTyping.test.js
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
function sandbox() {
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt,
    safeRand_: () => () => 0.5, recordRipple_: () => true, hoodNamesWithScene_: () => [], queueCellIntent_: () => {}, queueAppendIntent_: () => {}, PropertiesService: null };
  vm.createContext(sb);
  load(sb, 'phase01-config/advanceSimulationCalendar.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  return sb;
}
const HOODS = ['Jack London', 'West Oakland', 'Fruitvale', 'Chinatown', 'Rockridge', 'Lake Merritt', 'Temescal', 'Laurel'];
function run(weatherEvents, extra) {
  const sb = sandbox();
  const ns = {}; HOODS.forEach(h => { ns[h] = { employerCharacter: 'retail', boomIndex: 0 }; });
  const ctx = { config: { cycleCount: 108, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
    summary: Object.assign({ cycleId: 108, season: 'Spring', simMonth: 4, month: 4, holiday: 'none', sportsSeason: 'off-season',
      neighborhoodState: ns, economicRipples: [], economicMood: 50, worldEvents: [], weatherEvents: weatherEvents || [], weather: { type: 'rain', impact: 1.33 } }, extra || {}) };
  sb.runEconomicRippleEngine_(ctx);
  return ctx.summary;
}
const FLOOD = { type: 'flood_conditions', salient: true, cycle: 108, hoods: ['Jack London', 'West Oakland', 'Fruitvale', 'Chinatown'], detail: 'Flood conditions after 3 wet cycles — low-lying blocks taking water', magnitude: 3 };
const STORM = { type: 'storm', salient: true, cycle: 108, hoods: ['Jack London', 'West Oakland', 'Rockridge', 'Lake Merritt'], detail: 'Storm hit the city', magnitude: 3 };
const types = S => S.economicRipples.map(r => r.type);
const find = (S, t) => S.economicRipples.find(r => r.type === t);

console.log('engine.229 — weather disasters reach the economy');

// source: the phantom read and the impact literal are gone
{
  const src = fs.readFileSync(path.join(ROOT, 'phase06-analysis/economicRippleEngine.js'), 'utf8');
  check('source: no read of S.crisisSpikes', !/S\.crisisSpikes \|\|/.test(src));
  check('source: no weather.impact >= 1.4 branch, no West Oakland literal for weather', !/if \(weather\.impact >= 1\.4\)/.test(src) && !/'Severe weather disruption' \}, 'West Oakland'/.test(src));
}
// nothing salient → nothing
check('an ordinary rainy Cycle (impact 1.33, no salient event) files no weather ripple', types(run([])).every(t => t !== 'NATURAL_DISASTER' && t !== 'INFRASTRUCTURE_FAILURE'));
check('a non-salient weather event (first_frost) files nothing', types(run([{ type: 'first_frost', cycle: 108 }])).every(t => t !== 'NATURAL_DISASTER' && t !== 'INFRASTRUCTURE_FAILURE'));
check('a high impact alone (1.6) no longer files anything', !find(run([], { weather: { type: 'snow', impact: 1.6 } }), 'INFRASTRUCTURE_FAILURE'));
// flood → NATURAL_DISASTER on the flood hoods
{
  const S = run([FLOOD]); const r = find(S, 'NATURAL_DISASTER');
  check('flood conditions file NATURAL_DISASTER', !!r, types(S).join(','));
  check('NATURAL_DISASTER keeps −25 × 8', r && r.impact === -25 && r.endCycle - r.startCycle === 8, r && JSON.stringify([r.impact, r.startCycle, r.endCycle]));
  check('on the weather engine\'s flood hoods, primary = the first named', r && JSON.stringify(r.neighborhoods) === JSON.stringify(FLOOD.hoods) && r.primaryNeighborhood === 'Jack London', r && JSON.stringify(r.neighborhoods));
  check('source text is the weather detail', r && /Flood conditions/.test(r.source));
  const ne = S.neighborhoodEconomies;
  check('producer: the primary flood hood takes −3.75 (−25 × 1.5 × 0.1), a listed hood −2.5, an unlisted hood nothing',
    Math.abs((ne['Jack London'].mood - ne['Temescal'].mood) + 3.75) < 0.02 && Math.abs((ne['Fruitvale'].mood - ne['Temescal'].mood) + 2.5) < 0.02,
    JSON.stringify({ jl: ne['Jack London'].mood, fv: ne['Fruitvale'].mood, tm: ne['Temescal'].mood }));
}
// storm → INFRASTRUCTURE_FAILURE on the storm hoods
{
  const S = run([STORM]); const r = find(S, 'INFRASTRUCTURE_FAILURE');
  check('a storm files INFRASTRUCTURE_FAILURE (−10 × 6) on the storm-exposed hoods', r && r.impact === -10 && r.endCycle - r.startCycle === 6 && JSON.stringify(r.neighborhoods) === JSON.stringify(STORM.hoods) && r.primaryNeighborhood === 'Jack London', r && JSON.stringify(r));
  check('no NATURAL_DISASTER from a storm', !find(S, 'NATURAL_DISASTER'));
}
// heat wave → INFRASTRUCTURE_FAILURE; without hoods it is citywide
{
  const S = run([{ type: 'heat_wave', salient: true, cycle: 108, hoods: [], detail: 'Heat wave: 4 straight hot cycles, 96°F citywide' }]);
  const r = find(S, 'INFRASTRUCTURE_FAILURE');
  check('a heat wave with no hoods files INFRASTRUCTURE_FAILURE citywide', r && JSON.stringify(r.neighborhoods) === JSON.stringify(['all']) && r.primaryNeighborhood === '', r && JSON.stringify(r));
}
// storm + flood the same Cycle: one of each
{
  const S = run([STORM, FLOOD]);
  check('storm and flood in one Cycle: one INFRASTRUCTURE_FAILURE and one NATURAL_DISASTER', !!find(S, 'NATURAL_DISASTER') && !!find(S, 'INFRASTRUCTURE_FAILURE') && types(S).filter(t => t === 'NATURAL_DISASTER').length === 1);
}
// rng stream untouched: the seeded state after the run is the same with and without a flood
{
  const a = run([]), b = run([FLOOD]);
  check('no new rng draw: rngState identical with and without the flood', JSON.stringify(a.rngState) === JSON.stringify(b.rngState), JSON.stringify(a.rngState) + ' vs ' + JSON.stringify(b.rngState));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
