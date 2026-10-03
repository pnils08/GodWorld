#!/usr/bin/env node
'use strict';

/**
 * engine.204/205 slice B — the city-scale consumers read the week, not the phase word.
 * Ripple: one SPORTS_WEEK per franchise-week sized by the signed result (home week at the
 * venue, away week city-wide; |signed| < .15 none; no CHAMPIONSHIP_BOOM / PLAYOFF_SPENDING).
 * Population: emp/migration on intensity, economy label on band + signed (a bad high week
 * steps it down). Shock monitor: no simMonth read; thresholds from the band.
 * Every number below is a fixture. Run: node scripts/sportsWeekCity.test.js
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

// ── the week objects, built by the real slice A code ─────────────────────────
const wsb = { Logger: { log: () => {} } };
vm.createContext(wsb);
load(wsb, 'utilities/sportsWeekRecord.js');
load(wsb, 'phase02-world-state/applySportsSeason.js');
function weekOf(cells, cycle) {
  const weeks = {};
  for (const f of Object.keys(cells)) {
    const [cell, lens] = cells[f];
    weeks[f] = wsb.buildSportsWeek_(f, wsb.parseSportsWeekRecord_(cell), lens, {}, cycle);
  }
  const city = wsb.deriveSportsIntensity_(weeks, {}, {}, {}, cycle);
  return JSON.parse(JSON.stringify({ sportsWeek: weeks, sportsCity: city }));
}

// ── ripple ───────────────────────────────────────────────────────────────────
const HOODS = ['Jack London', 'Downtown', 'West Oakland', 'Fruitvale', 'Chinatown', 'Rockridge'];
function ripples(sportsSeason, week) {
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt,
    safeRand_: () => () => 0.5, recordRipple_: () => true, hoodNamesWithScene_: () => [], queueCellIntent_: () => {}, queueAppendIntent_: () => {}, PropertiesService: null };
  vm.createContext(sb);
  load(sb, 'phase01-config/advanceSimulationCalendar.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  const ns = {}; HOODS.forEach(h => { ns[h] = { employerCharacter: 'retail', boomIndex: 0 }; });
  const ctx = { config: { cycleCount: 110, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
    summary: Object.assign({ cycleId: 110, season: 'Fall', simMonth: 10, month: 10, holiday: 'none', sportsSeason,
      sportsZones: ['Jack London', 'Downtown'], neighborhoodState: ns, economicRipples: [], economicMood: 50,
      worldEvents: [], weatherEvents: [], weather: { type: 'clear', impact: 1 } }, week) };
  sb.runEconomicRippleEngine_(ctx);
  return ctx.summary;
}
const sportsRipples = S => S.economicRipples.filter(r => /SPORTS_WEEK|CHAMPIONSHIP_BOOM|PLAYOFF_SPENDING/.test(r.type));

console.log('1. ripple — one per franchise-week, signed');
{
  const S = ripples('championship', weekOf({ "A's": ['A:W A:W', 'championship'] }, 110));
  const r = sportsRipples(S);
  check('C110 shape: one SPORTS_WEEK, positive, under 15, city-wide (two away games)',
    r.length === 1 && r[0].type === 'SPORTS_WEEK' && r[0].impact > 0 && r[0].impact < 15 && r[0].neighborhoods.join() === 'all',
    JSON.stringify(r.map(x => [x.type, x.impact, x.neighborhoods])));
  const lost = sportsRipples(ripples('playoffs', weekOf({ "A's": ['H:L H:L H:L', 'playoffs'] }, 110)));
  check('a home losing playoff week: one negative ripple at the venue',
    lost.length === 1 && lost[0].impact < 0 && lost[0].neighborhoods.join() === 'Jack London,Downtown',
    JSON.stringify(lost.map(x => [x.impact, x.neighborhoods])));
  const word = sportsRipples(ripples('championship', {}));
  check('the word alone (no games) files no sports ripple', word.length === 0, JSON.stringify(word));
  const both = sportsRipples(ripples('playoffs', weekOf({ "A's": ['H:W H:W H:W', 'playoffs'], Oaks: ['H:W H:W', 'regular-season'] }, 110)));
  check('two franchises can each file one (ids differ); the Oaks small week files none under .15',
    both.length === 1 && /_AS_110$/.test(both[0].id), JSON.stringify(both.map(x => x.id)));
}

// ── population ───────────────────────────────────────────────────────────────
console.log('2. population label');
{
  const SRC = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const fn = SRC.slice(SRC.indexOf('function updateWorldPopulation_'));
  const body = fn.slice(fn.indexOf('// Sports economy — engine.204/205'), fn.indexOf('// WRITE BACK TO SHEET'));
  const label = new Function('econ', 'sportsCity', 'sportsBandAtLeast_',
    'var sportsSigned = 0;' + body.replace(/^.*\n/, '').replace('var sportsSigned =', 'sportsSigned =') + '; return econ;');
  const at = (econ, city) => label(econ, city, wsb.sportsBandAtLeast_);
  check('top + above expectation: stable → booming', at('stable', { band: 'top', signed: 0.5 }) === 'booming');
  check('high + above: stable → strong, strong stays', at('stable', { band: 'high', signed: 0.3 }) === 'strong' && at('strong', { band: 'high', signed: 0.3 }) === 'strong');
  check('a bad high week steps strong down one', at('strong', { band: 'high', signed: -0.5 }) === 'stable');
  check('a bad week below high moves nothing', at('strong', { band: 'elevated', signed: -0.5 }) === 'strong');
  check('weak is never lifted', at('weak', { band: 'top', signed: 0.9 }) === 'weak');
  check('the phase word is not read', !/sports === "championship"|sports === "playoffs"|sports === "late-season"/.test(fn.slice(0, fn.indexOf('\nfunction ', 10))));
}

// ── shock monitor ────────────────────────────────────────────────────────────
console.log('3. shock monitor');
{
  const SRC = fs.readFileSync(path.join(ROOT, 'phase06-analysis/applyShockMonitor.js'), 'utf8');
  check('no simMonth read', !/S\.simMonth/.test(SRC));
  check('thresholds keyed on the band', /sportsCityShock\.band === "top"/.test(SRC) && /sportsCityShock\.band === "high"/.test(SRC));
}

// ── slice C: venue consumers ─────────────────────────────────────────────────
console.log('4. venue consumers');
{
  const hsb = { Logger: { log: () => {} } };
  vm.createContext(hsb);
  load(hsb, 'phase08-v3-chicago/v3NeighborhoodWriter.js');
  const full = { "A's": { unsigned: 1, venueShare: 1, venue: ['Jack London', 'Downtown'] } };
  const m = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_('none', false, false, 'championship', full)));
  check('hood writer: a full home week = the old championship mods at the venue',
    m['Jack London'].eventMod === 2 && Math.abs(m['Jack London'].nightlifeMod - 1.8) < 1e-9 && m['Downtown'].noiseMod === 1.5, JSON.stringify(m));
  const away = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_('none', false, false, 'championship', { "A's": { unsigned: 0.49, venueShare: 0, venue: ['Jack London'] } })));
  check('hood writer: the word with an away week moves no stadium hood', !away['Jack London'], JSON.stringify(away));
  const bay = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_('none', false, false, 'playoffs', { Oaks: { unsigned: 0.2, venueShare: 0.5, venue: ['Baylight District'] } })));
  check('hood writer: the Oaks at Baylight, scaled by home volume .1', Math.abs(bay['Baylight District'].eventMod - 1.1) < 1e-9 && !bay['Jack London'], JSON.stringify(bay));

  const src = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ge = src('phase05-citizens/generateCitizensEvents.js');
  check('game night gates on games played (S.sportsWeek g > 0)', /gnWeeks\[gwf\]\.g > 0/.test(ge) && /gnAny && gnf < gnFeed\.length/.test(ge));
  const ev = src('phase07-evening-media/cityEveningSystems.js');
  check('evening: no sportsNeighborhoodEffects read; crowd at the venue by home volume',
    !/S\.sportsNeighborhoodEffects \|\|/.test(ev) && /venueShare\) \|\| 0\) \* 10\)/.test(ev));
  const cr = src('phase03-population/generateCrisisSpikes.js');
  check('crisis: no Jack London/Downtown fallback literal', !/S\.sportsZones \|\| \['Jack London', 'Downtown'\]/.test(cr));
  const bo = src('phase05-citizens/bondEngine.js');
  check('bonds: the rivalry hoods are S.sportsZones, not a literal', !/var sportsHoods = \['Jack London', 'Downtown'\]/.test(bo));
}

// ── acceptance 5: word tests left in the converted files (exempt lines named) ──
console.log('5. phase-word tests left in the converted numeric files');
{
  const WORD = /(===|!==) *['"](championship|playoffs|late-season|post-season)['"]/;
  const files = ['phase02-world-state/applyCityDynamics.js', 'phase06-analysis/economicRippleEngine.js',
    'phase01-config/godWorldEngine2.js', 'phase03-population/generateCrisisSpikes.js',
    'phase07-evening-media/cityEveningSystems.js', 'phase08-v3-chicago/v3NeighborhoodWriter.js',
    'phase05-citizens/bondEngine.js', 'phase02-world-state/updateTransitMetrics.js',
    'phase06-analysis/applyShockMonitor.js'];
  const left = [];
  const lineOf = x => { const [f, n] = x.split(':'); return fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')[Number(n) - 1]; };
  for (const f of files) {
    fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => { if (WORD.test(line)) left.push(f + ':' + (i + 1)); });
  }
  // exempt, by design: the city sentiment lines (engine.194's) read the normalized word
  // ('postseason'/'finals'), not these; the Maker-override branch in the shock monitor; the
  // seed calendar boost; bond intensity/decay (follow-up row); population calendarFactors label
  const EXEMPT = /applyShockMonitor\.js|bondEngine\.js/;
  const exemptLine = /m\.sentiment|if \(s === /;   // city sentiment (194's) + its normalizer
  const unexpected = left.filter(x => !EXEMPT.test(x) && !exemptLine.test(lineOf(x)));
  check('no unexpected word test in a converted numeric file', unexpected.length === 0, unexpected.join(' '));
  console.log('     exempt word tests left: ' + left.filter(x => EXEMPT.test(x)).join(' '));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
