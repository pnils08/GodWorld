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

// ── engine.281 (a1): the numeric sites outside the 204/205 census ──────────────
console.log('6. engine.281 (a1) — media, bonds, nightlife, food, migration on the band');
{
  const msb = { Logger: { log: () => {} } };
  vm.createContext(msb);
  load(msb, 'phase07-evening-media/mediaFeedbackEngine.js');
  function media(word, city, extra) {
    const S = Object.assign({ sportsSeason: word, sportsCity: city, worldEvents: [], famousPeople: [], namedSpotlights: [],
      mediaEffects: { coverageProfile: {}, hopeFactor: 0, anxietyFactor: 0, celebrityBuzz: 0, crisisSaturation: 0,
        sentimentPressure: 0, trendAmplification: {}, neighborhoodEffects: {}, eventPools: {} }, cityDynamics: { sentiment: 0 } }, extra || {});
    const ctx = { summary: S, mediaCalendarContext: { holiday: 'none', holidayPriority: 'none', sportsSeason: word, sportsCity: city, month: 6 } };
    msb.analyzeCelebrityCoverage_(ctx);
    const buzzBefore = S.mediaEffects.celebrityBuzz;
    msb.applyCalendarMediaModifiers_(ctx);
    msb.applyMediaToCityDynamics_(ctx);
    const e = S.mediaEffects;
    return { celebBase: buzzBefore, hope: e.hopeFactor, buzz: e.celebrityBuzz, trend: e.trendAmplification.sports,
      narr: e.sportsNarrative, sent: S.cityDynamics.sentiment };
  }
  // C110 as typed: lens championship, two away wins → band high, signed +.24
  const c110 = media('championship', { band: 'high', signed: 0.24, intensity: 0.515, reach: 1 });
  check('media C110: high band → playoffs payloads (hope .2, buzz .24+.15, trend .35); label stays championship_fever',
    c110.hope === 0.2 && Math.abs(c110.buzz - 0.39) < 1e-9 && c110.trend === 0.35 && c110.narr === 'championship_fever', JSON.stringify(c110));
  check('media C110: no city sentiment lift below the top band', c110.sent === 0, JSON.stringify(c110));
  const topLoss = media('championship', { band: 'top', signed: -0.5, intensity: 0.9, reach: 1 });
  check('media: a top-band LOSING week adds no hope and no sentiment, still the coverage',
    topLoss.hope === 0 && topLoss.sent === 0 && Math.abs(topLoss.buzz - 0.49) < 1e-9 && topLoss.trend === 0.5, JSON.stringify(topLoss));
  const topWin = media('playoffs', { band: 'top', signed: 0.6, intensity: 0.9, reach: 0.75 });
  check('media: a top-band winning week under a playoffs lens takes the top payload (hope .3, sentiment +.1)',
    topWin.hope === 0.3 && topWin.sent === 0.1 && topWin.narr === 'playoff_drama', JSON.stringify(topWin));
  const quietChamp = media('championship', { band: 'quiet', signed: 0, intensity: 0, reach: 0 });
  check('media: the championship word with no games moves no number',
    quietChamp.hope === 0 && quietChamp.buzz === 0 && quietChamp.trend === undefined && quietChamp.sent === 0, JSON.stringify(quietChamp));
  const elev = media('playoffs', { band: 'elevated', signed: 0.1, intensity: 0.41, reach: 0.5 });
  check('media: elevated → late-season payloads (hope .1 on a win, no buzz)', elev.hope === 0.1 && elev.buzz === 0 && elev.trend === 0.2, JSON.stringify(elev));

  // a numeric payload sitting under a phase-word test, in the five a1 files
  const WORD = /(===|!==) *['"](championship|playoffs|late-season|post-season)['"]/;
  const NUM = /\+=|-=|\*=|Math\.max\(|Math\.min\(|lean\(/;
  const a1 = ['phase07-evening-media/mediaFeedbackEngine.js', 'phase05-citizens/bondEngine.js',
    'phase07-evening-media/buildNightLife.js', 'phase07-evening-media/buildEveningFood.js',
    'phase06-analysis/applyMigrationDrift.js'];
  const hits = [];
  for (const f of a1) {
    const L = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    L.forEach((line, i) => {
      if (!WORD.test(line)) return;
      if (/\bphase === /.test(line)) return;   // migration's tier dispatcher, fed by the band
      const body = [line].concat(L.slice(i + 1, i + 3).filter(x => !WORD.test(x)));
      if (body.some(x => NUM.test(x))) hits.push(f + ':' + (i + 1));
    });
  }
  check('no numeric payload left under a phase word in the a1 files', hits.length === 0, hits.join(' '));

  const bo = fs.readFileSync(path.join(ROOT, 'phase05-citizens/bondEngine.js'), 'utf8');
  check('bonds: rivalry heat, new-bond cap and confront threshold read the band',
    /sportsBandU === 'top'\) \{\s*intensity \+= 1\.5/.test(bo) && /sportsCity\) \|\| \{\}\)\.band === 'top'\) \{[^\n]*\n\s*maxNewBonds = Math\.max\(maxNewBonds, 3\)/.test(bo)
    && /SPORTS_RIVAL && sportsBandC === 'top'\) \{\s*threshold = 6/.test(bo));
  const nl = fs.readFileSync(path.join(ROOT, 'phase07-evening-media/buildNightLife.js'), 'utf8');
  check('nightlife: volume +3/+2 and the 3-spot floor on band top/high',
    /sportsBand === "top"\) volume \+= 3;\s*else if \(sportsBand === "high"\) volume \+= 2;/.test(nl) && /sportsBand === "top"\) count = Math\.max\(count, 3\)/.test(nl));
  const fd = fs.readFileSync(path.join(ROOT, 'phase07-evening-media/buildEveningFood.js'), 'utf8');
  check('food: stadium-hood lean 3/2/1 and four restaurants on band top/high/elevated',
    /sportsBand === "top"\) lean\(sportsHoods, 3\)/.test(fd) && /sportsBand === "elevated"\) lean\(sportsHoods, 1\)/.test(fd)
    && /sportsBand === "top"\) restaurantCount = 4/.test(fd));
  const mg = fs.readFileSync(path.join(ROOT, 'phase06-analysis/applyMigrationDrift.js'), 'utf8');
  check('migration: drift tier from the band, the lede keeps the lens, a Maker override wins',
    /addSportsDrift_\(sportsDriftTier\)/.test(mg) && /sportsPhaseUsed: sportsPhase,/.test(mg) && /if \(!manualSportsPhaseOverride\) \{/.test(mg));
}

// ── engine.281 (a2): the ladder sites read sportsRung_ ──────────────────────────
console.log('7. engine.281 (a2) — sportsRung_ and the ladder sites');
{
  const R = (lens, band) => wsb.sportsRung_(lens, band ? { band } : undefined);
  check('rung: band top/high/elevated → championship/playoffs/late-season, whatever the lens',
    R('playoffs', 'top') === 'championship' && R('championship', 'high') === 'playoffs' && R('regular-season', 'elevated') === 'late-season');
  check('rung: a ruled lens on a normal band is an ordinary game week, on a quiet one no rung (Q1)',
    R('championship', 'normal') === 'regular-season' && R('playoffs', 'quiet') === '' && R('late-season', 'quiet') === '' && R('post-season', 'normal') === 'regular-season');
  check('rung: an unruled lens passes through below elevated; no lens reads off-season',
    R('mid-season', 'quiet') === 'mid-season' && R('regular-season', 'normal') === 'regular-season' && R('off-season') === 'off-season' && R(undefined) === 'off-season');
  check('rung: C110 as typed (championship lens, band high) → playoffs', R('championship', 'high') === 'playoffs');

  const a2 = ['phase05-citizens/applyNamedCitizenSpotlight.js', 'phase05-citizens/generateCitizensEvents.js',
    'phase06-analysis/filterNoiseEvents.js', 'phase07-evening-media/buildEveningFamous.js', 'phase05-citizens/checkForPromotions.js',
    'phase05-citizens/generateGenericCitizens.js', 'phase06-analysis/applyCivicLoadIndicator.js', 'phase09-digest/applyCycleWeight.js',
    'phase07-evening-media/domainTracker.js', 'phase06-analysis/applyPatternDetection.js', 'phase06-analysis/prioritizeEvents.js',
    'phase07-evening-media/culturalLedger.js', 'phase08-v3-chicago/applyDomainCooldowns.js', 'phase08-v3-chicago/v3DomainWriter.js'];
  const WORD = /sportsSeason (===|!==) *['"](championship|playoffs|late-season|post-season)['"]/;
  // a number moved under the word: += / *= (not a string concatenation), a count, a tally,
  // a placement or an athlete-weighted pool; the window takes the line before (a condition
  // continued from it) and the two after
  const NUM = /\+= *(?![\s'"]*['"])|-=|\*=|Math\.max\(|Math\.min\(|= \d|\|\| 0\) \+ \d|isHighActivityPeriod|return true|calendarBoostedDomains|neighborhood = |pool = pool\.concat\(athlete/;
  const hits = [], noDecl = [];
  for (const f of a2) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!/var sportsRung = sportsRung_\(sportsSeason, S\.sportsCity\);/.test(src)) noDecl.push(f);
    const L = src.split('\n');
    L.forEach((line, i) => {
      if (!WORD.test(line)) return;
      const body = [L[i - 1] || '', line].concat(L.slice(i + 1, i + 3)).filter(x => x === line || (!WORD.test(x) && !/sportsRung/.test(x)));
      if (body.some(x => NUM.test(x))) hits.push(f + ':' + (i + 1));
    });
  }
  check('every a2 file reads the rung once, beside its lens', noDecl.length === 0, noDecl.join(' '));
  check('no numeric payload left under a lens word test in the a2 files', hits.length === 0, hits.join(' '));
  const sw = fs.readFileSync(path.join(ROOT, 'phase02-world-state/applySeasonWeights.js'), 'utf8');
  check('season weights: a feed week reads the rung, a Maker-declared season keeps its word',
    /\(S\.sportsSource === 'oakland-feed'\) \? sportsRung_\(S\.sportsSeason, S\.sportsCity\)/.test(sw) && /S\.sportsAtmosphereEnabled === true \? S\.sportsSeason : ""/.test(sw));
  const gg = fs.readFileSync(path.join(ROOT, 'phase05-citizens/generateGenericCitizens.js'), 'utf8');
  check('generic citizens: the stadium-hood weight reads S.sportsZones, not a literal pair',
    /genZones = \(S\.sportsZones && S\.sportsZones\.length\)/.test(gg) && !/weights\['Jack London'\] = \(weights\['Jack London'\] \|\| 1\.0\) \+ 0\.4/.test(gg));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
