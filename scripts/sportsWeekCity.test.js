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

console.log('1b. engine.206 — the game-week ripple names the bars the week moved');
{
  function ripplesWithBars(sportsSeason, week, bars, prior) {
    const rows = [];
    const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt,
      safeRand_: () => () => 0.5, recordRipple_: (ctx, e) => { rows.push(e); return true; }, hoodNamesWithScene_: () => [], queueCellIntent_: () => {}, queueAppendIntent_: () => {}, PropertiesService: null };
    vm.createContext(sb);
    load(sb, 'phase01-config/advanceSimulationCalendar.js');
    load(sb, 'phase06-analysis/economicRippleEngine.js');
    const ns = {}; HOODS.forEach(h => { ns[h] = { employerCharacter: 'retail', boomIndex: 0 }; });
    const ctx = { config: { cycleCount: 110, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
      summary: Object.assign({ cycleId: 110, season: 'Fall', simMonth: 10, month: 10, holiday: 'none', sportsSeason,
        sportsZones: ['Jack London', 'Downtown'], neighborhoodState: ns, economicRipples: prior || [], economicMood: 50,
        worldEvents: [], weatherEvents: [], weather: { type: 'clear', impact: 1 }, sportsWeekBars: bars }, week) };
    sb.runEconomicRippleEngine_(ctx);
    return { S: ctx.summary, rows: rows.filter(r => r.causeType === 'economic-event' && /SPORTS_WEEK/.test(r.causeId)) };
  }
  const BARS = { byHood: { 'Jack London': { ids: ['BIZ-01', 'BIZ-02'], pp: 0.6 }, 'Downtown': { ids: ['BIZ-03'], pp: 0.6 }, 'Uptown': { ids: ['BIZ-04'], pp: 0.3 } },
    ids: ['BIZ-01', 'BIZ-02', 'BIZ-03', 'BIZ-04'], pp: 0.53 };
  const home = ripplesWithBars('playoffs', weekOf({ "A's": ['H:W H:W H:W', 'playoffs'] }, 110), BARS);
  const hr = sportsRipples(home.S)[0];
  check('home week: the SPORTS_WEEK ripple carries the venue hoods\' bars (Jack London + Downtown, not Uptown) and its text names them',
    hr && JSON.stringify(hr.bizIds) === '["BIZ-01","BIZ-02","BIZ-03"]' && hr.bizPp === 0.6 &&
    /^A's game-week spending — 3 bar\(s\) and restaurant\(s\) at Jack London \/ Downtown, Growth_Rate \+0\.6pp$/.test(hr.source),
    JSON.stringify([hr && hr.bizIds, hr && hr.source]));
  check('home week: the ledger row is business-scoped with those ids, at the primary venue',
    home.rows.length === 1 && home.rows[0].targetScope === 'business' && JSON.stringify(home.rows[0].targetIds) === '["BIZ-01","BIZ-02","BIZ-03"]' && home.rows[0].neighborhood === 'Jack London',
    JSON.stringify(home.rows));
  const away = ripplesWithBars('championship', weekOf({ "A's": ['A:W A:W', 'championship'] }, 110), BARS);
  const ar = sportsRipples(away.S)[0];
  check('away week: every moved bar (no franchise home) rides the citywide ripple, weighted mean pp',
    ar && JSON.stringify(ar.bizIds) === '["BIZ-01","BIZ-02","BIZ-03","BIZ-04"]' && ar.bizPp === 0.52 && /across the nightlife hoods, Growth_Rate \+0\.52pp/.test(ar.source) && away.rows[0].targetScope === 'business',
    JSON.stringify([ar && ar.bizIds, ar && ar.source]));
  const small = ripplesWithBars('regular-season', weekOf({ Oaks: ['H:W H:W', 'regular-season'] }, 110), BARS);
  check('under .15 (the Oaks\' small week): no ripple, so no bars named — one gate both ways',
    sportsRipples(small.S).length === 0 && small.rows.length === 0, JSON.stringify(small.rows));
  const carried = ripplesWithBars('playoffs', weekOf({ "A's": ['H:W H:W H:W', 'playoffs'] }, 110), null,
    [{ id: 'SPORTS_WEEK_AS_109', type: 'SPORTS_WEEK', impact: 8, sectors: ['food'], neighborhoods: ['Jack London', 'Downtown'], primaryNeighborhood: 'Jack London', startCycle: 109, endCycle: 112, currentStrength: 6, source: "A's game-week spending — 3 bar(s)" }]);
  const carryRow = carried.rows.filter(r => r.effectType === 'carryover')[0];
  check('a carried ripple stays hood-scoped (the bars were named the week it happened)',
    carryRow && carryRow.targetScope === 'neighborhood' && JSON.stringify(carryRow.targetIds) === '["Jack London"]', JSON.stringify(carryRow));
  const none = ripplesWithBars('playoffs', weekOf({ "A's": ['H:W H:W H:W', 'playoffs'] }, 110), undefined);
  const nr = sportsRipples(none.S)[0];
  check('no bars moved (S.sportsWeekBars absent): the ripple files hood-scoped with its plain text, as before',
    nr && nr.bizIds === undefined && none.rows[0].targetScope === 'neighborhood' && nr.source === "A's game-week spending", JSON.stringify([nr && nr.source, none.rows[0]]));
}

// ── population ───────────────────────────────────────────────────────────────
console.log('2. economy label — one label, one owner (engine.281 (d))');
{
  const DRIFT = fs.readFileSync(path.join(ROOT, 'phase03-population/applyDemographicDrift.js'), 'utf8');
  const label = new Function(DRIFT.match(/function sportsEconomyLabel_[\s\S]*?\n}\n/)[0] + '\nreturn sportsEconomyLabel_;')();
  const at = (econ, city) => label(econ, city);
  check('top + above expectation: stable → booming', at('stable', { band: 'top', signed: 0.5 }) === 'booming');
  check('high + above: stable → strong, strong stays', at('stable', { band: 'high', signed: 0.3 }) === 'strong' && at('strong', { band: 'high', signed: 0.3 }) === 'strong');
  check('a bad high week steps strong down one', at('strong', { band: 'high', signed: -0.5 }) === 'stable');
  check('a bad week below high moves nothing', at('strong', { band: 'elevated', signed: -0.5 }) === 'strong');
  check('weak and struggling are never lifted', at('weak', { band: 'top', signed: 0.9 }) === 'weak' && at('struggling', { band: 'top', signed: 0.9 }) === 'struggling');
  check('no week (override / quiet) leaves the label', at('strong', undefined) === 'strong' && at('stable', { band: 'quiet', signed: 0 }) === 'stable');
  const dfn = DRIFT.slice(DRIFT.indexOf('function applyDemographicDrift_'));
  check('drift owns it: applies the week rule, publishes to S.worldPopulation.economy, no championship-word boost',
    /econ = sportsEconomyLabel_\(econ, S\.sportsCity\);/.test(dfn) && /if \(S\.worldPopulation\) S\.worldPopulation\.economy = econ;/.test(dfn)
    && !/sportsSeason === "championship" && econ !== "weak"/.test(dfn));
  const SRC = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const fn = SRC.slice(SRC.indexOf('function updateWorldPopulation_'));
  const body = fn.slice(0, fn.indexOf('\nfunction ', 10));
  check('updateWorldPopulation_ derives no label of its own', !/econ = "(booming|strong|weak|stable|unstable)"/.test(body));
  check('the phase word is not read', !/sports === "championship"|sports === "playoffs"|sports === "late-season"/.test(body));
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
  load(hsb, 'phase01-config/canonNeighborhoodLoader.js');   // engine.214 Task 14: the writer's calendar mods read Scenes
  load(hsb, 'phase08-v3-chicago/v3NeighborhoodWriter.js');
  const G = require('./fixtures/hood-geography.json'), SC = require('./fixtures/hood-scenes.json').scenes;
  const rows = [['Neighborhood', 'WeatherZone', 'Adjacent', 'AttentionWeight', 'EmployerCharacter', 'Scenes']].concat(Object.keys(G.zone).map(h => [h, G.zone[h], G.adjacent[h], G.attention[h], G.character[h], SC[h]]));
  const hctx = { summary: {}, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : null } };
  hsb.loadCanonNeighborhoods_(hctx);
  const full = { "A's": { unsigned: 1, venueShare: 1, venue: ['Jack London', 'Downtown'] } };
  const m = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_(hctx, 'none', false, false, 'championship', full)));
  check('hood writer: a full home week = the old championship mods at the venue',
    m['Jack London'].eventMod === 2 && Math.abs(m['Jack London'].nightlifeMod - 1.8) < 1e-9 && m['Downtown'].noiseMod === 1.5, JSON.stringify(m));
  const away = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_(hctx, 'none', false, false, 'championship', { "A's": { unsigned: 0.49, venueShare: 0, venue: ['Jack London'] } })));
  check('hood writer: the word with an away week moves no stadium hood', !away['Jack London'], JSON.stringify(away));
  const bay = JSON.parse(JSON.stringify(hsb.buildHolidayNeighborhoodMods_(hctx, 'none', false, false, 'playoffs', { Oaks: { unsigned: 0.2, venueShare: 0.5, venue: ['Baylight District'] } })));
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
  // engine.302: the new-bond cap became a meeting-chance factor (sports top x1.5); it still reads the band
  check('bonds: rivalry heat, the meeting factor and confront threshold read the band',
    /sportsBandU === 'top'\) \{\s*intensity \+= 1\.5/.test(bo) && /sportsCity\) \|\| \{\}\)\.band === 'top'\) calFactor = Math\.max\(calFactor, 1\.5\)/.test(bo)
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
    'phase08-v3-chicago/applyDomainCooldowns.js', 'phase08-v3-chicago/v3DomainWriter.js'];
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
  const clSrc = fs.readFileSync(path.join(ROOT, 'phase07-evening-media/culturalLedger.js'), 'utf8');
  check('engine.312: the registrar carries no sports / calendar / economy fame extra (a sighting is +1 flat; it left the a2 list)',
    !/sportsRung_\(|fameBonus|econMood/.test(clSrc));
  const sw = fs.readFileSync(path.join(ROOT, 'phase02-world-state/applySeasonWeights.js'), 'utf8');
  check('season weights: a feed week reads the rung, a Maker-declared season keeps its word',
    /\(S\.sportsSource === 'oakland-feed'\) \? sportsRung_\(S\.sportsSeason, S\.sportsCity\)/.test(sw) && /S\.sportsAtmosphereEnabled === true \? S\.sportsSeason : ""/.test(sw));
  const gg = fs.readFileSync(path.join(ROOT, 'phase05-citizens/generateGenericCitizens.js'), 'utf8');
  check('generic citizens: the stadium-hood weight reads S.sportsZones, not a literal pair',
    /genZones = \(S\.sportsZones && S\.sportsZones\.length\)/.test(gg) && !/weights\['Jack London'\] = \(weights\['Jack London'\] \|\| 1\.0\) \+ 0\.4/.test(gg));
}

// engine.296 (builder 2026-10-16): no hardcoded famous names — SPORTS_LEGENDS is the ledger's retired
// MLB-origin citizens; no literal fallback. Run the builder to the pick and read the pool it picks from.
{
  const famousPool = (rows) => {
    let picked = null;
    const sb = vm.createContext({ Logger: { log: () => {} }, Math, String, Number, Array, Object, JSON,
      decayCulturalFame_: () => {}, safeRand_: () => () => 0.5, sportsRung_: () => 'championship',
      pickRandomSet_: (uniq) => { picked = uniq; throw new Error('STOP-AT-PICK'); },
      getCoreSimNeighborhoods_: () => ['Temescal', 'Downtown'], hoodNamesWithScene_: () => [], normHood_: h => h,
      culturalStatusByPop_: () => ({}), recordRipple_: () => {}, registerCulturalEntity_: () => {} });
    load(sb, 'phase07-evening-media/buildEveningFamous.js');
    const headers = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'Status', 'OriginGame', 'Neighborhood', 'TraitProfile', 'RoleType'];
    const ctx = { summary: { cycleId: 112, sportsSeason: 'championship' }, config: {}, ledger: { headers, rows } };
    try { sb.buildEveningFamous_(ctx); } catch (e) { if (!/STOP-AT-PICK/.test(e.message)) throw e; }
    return picked || [];
  };
  const rows = [
    ['POP-90101', 'Test', 'Legend', 1, 'ENGINE', 'Retired', 'MLB', 'Temescal', ''],
    ['POP-90102', 'Test', 'Starter', 1, 'GAME', 'Active', 'MLB', 'Jack London', ''],
    ['POP-90103', 'Test', 'Hooper', 1, 'ENGINE', 'Retired', 'NBA', 'Downtown', ''],
    ['POP-90104', 'Test', 'Traded', 1, 'GAME', 'Traded', 'MLB', 'Downtown', ''],
    ['POP-90105', 'Test', 'Active Legend', 1, 'GAME', 'Active', 'MLB The Show', 'Piedmont Ave', '', "Left Fielder, Oakland A's Legend"]];
  const pool = famousPool(rows);
  const names = pool.map(p => p.name);
  const legend = pool.find(p => p.name === 'Test Legend');
  check('engine.296: a retired MLB-origin citizen is an A\'s legend in the championship pool, with its home hood',
    !!legend && legend.role === "A's legend" && legend.homeNeighborhood === 'Temescal', JSON.stringify(legend));
  check('engine.296: no hardcoded legend survives (Warriors / Rodriguez / MVP Davis)',
    !names.some(n => /Warriors|Rodriguez|MVP Davis/.test(n)), names.join(', '));
  const active = pool.filter(p => p.name === 'Test Active Legend');
  check('engine.296: an active player the ledger calls a legend is sighted as a legend; other players stay players',
    active.length > 0 && active.every(p => p.role === "A's legend" && p.homeNeighborhood === 'Piedmont Ave') &&
    pool.some(p => p.name === 'Test Starter' && p.role === "A's player"), JSON.stringify(active));
  check('engine.296: a retired NBA row and a traded MLB row are not legends',
    !pool.some(p => p.role === "A's legend" && /Hooper|Traded/.test(p.name)));
  const empty = famousPool([['POP-90102', 'Test', 'Starter', 1, 'GAME', 'Active', 'MLB', 'Jack London', '']]);
  check('engine.296: no retired MLB rows → no legends, no literal fallback',
    !empty.some(p => p.role === "A's legend" || /legend/i.test(String(p.role))), empty.map(p => p.name + '/' + p.role).join(', '));
}

console.log('engine.297 — synthetic, non-canon Cultural_Ledger buckets');
{
  const cats = ['actor', 'musician', 'athlete', 'influencer', 'journalist', 'chef', 'streamer',
    'author', 'civic-figure', 'business-figure', 'artist', 'community-leader'];
  const keys = ['ACTORS', 'MUSICIANS', 'ATHLETES', 'INFLUENCERS', 'JOURNALISTS', 'CHEFS',
    'STREAMERS', 'AUTHORS', 'CIVIC', 'BUSINESS', 'ARTISTS', 'CULTURAL_LEADERS'];
  const rows = cats.map((c, i) => ['Synthetic Fame ' + i, c, c, 'Active', '', 'Downtown']);
  const headers = ['Name', 'RoleType', 'FameCategory', 'Status', 'UniverseLinks', 'Neighborhood'];
  let reads = 0, picked = [], ripples = [], registered = [];
  const sb = vm.createContext({ Logger: { log: () => {} }, Math, String, Number, Array, Object, JSON,
    safeRand_: ctx => ctx.rng, getCoreSimNeighborhoods_: () => ['Downtown'],
    hoodNamesWithScene_: () => ['Downtown'], culturalStatusByPop_: () => ({}),
    recordRipple_: (ctx, r) => ripples.push(r), registerCulturalEntity_: (ctx, n) => registered.push(n),
    pickRandomSet_: (pool, count) => { picked = pool; return pool.slice(0, count); } });
  load(sb, 'utilities/sportsWeekRecord.js');
  load(sb, 'phase07-evening-media/culturalLedger.js');
  sb.decayCulturalFame_ = () => {};
  sb.culturalStatusByPop_ = () => ({});
  sb.registerCulturalEntity_ = (ctx, n) => registered.push(n);
  load(sb, 'phase07-evening-media/buildEveningFamous.js');
  const make = data => ({ rng: () => 0.5, config: {}, summary: { cycleId: 112, season: 'Summer',
    sportsCity: { band: 'top' }, sportsSeason: 'championship', isCreationDay: true, isFirstFriday: true,
    holiday: 'Thanksgiving', worldEvents: ['synthetic'], economicMood: 70,
    cityDynamics: { sentiment: 0.5, culturalActivity: 1.5, communityEngagement: 1.5 } },
    ledger: { headers: ['POPID', 'Neighborhood', 'Status'], rows: [['POP-99001', 'Temescal', 'Active']] },
    ss: { getSheetByName: name => name === 'Cultural_Ledger' ? {
      getLastRow: () => data.length + 1, getDataRange: () => ({ getValues: () => { reads++; return [headers, ...data]; } })
    } : null } });
  const ctx = make(rows);
  sb.buildEveningFamous_(ctx);
  const buckets = sb.culturalSightingBuckets_(ctx);
  check('engine.297: all twelve Active categories enter their bucket', keys.every((k, i) => buckets[k].length === 1 && buckets[k][0].name === rows[i][0]));
  check('engine.297: sightings, registration and ripples use only ledger names', ctx.summary.famousSightings.length === 4 &&
    ctx.summary.famousPeople.every(n => rows.some(r => r[0] === n)) &&
    registered.join() === ctx.summary.famousPeople.join() && ripples.every(r => registered.includes(r.causeId)));
  check('engine.297: unchanged weighting admits eleven buckets; cultural ATHLETES is not a generic fallback',
    picked.length === 11 && !picked.some(p => p.name === rows[2][0]));
  check('engine.297: bucket read is cached per ctx', reads === 1 && sb.culturalSightingBuckets_(ctx) === buckets);
  const sparse = make([['Synthetic Fallback', 'chef', '', 'Active', 'POP-99001', 'Wrong hood'],
    ['Synthetic Excluded', 'actor', 'actor', 'Inactive', '', 'Downtown'],
    ['Synthetic Override', 'chef', 'author', 'Active', '', 'Rockridge'],
    ['Synthetic Missing Link', 'actor', 'actor', 'Active', 'POP-99002', 'Wrong hood']]);
  const b = sb.culturalSightingBuckets_(sparse);
  check('engine.297: blank category uses shared classifier and linked current hood', b.CHEFS[0].homeNeighborhood === 'Temescal');
  check('engine.297: explicit category wins; unlinked uses row hood; inactive is excluded',
    b.AUTHORS[0].homeNeighborhood === 'Rockridge' && !b.ACTORS.some(e => e.name === 'Synthetic Excluded'));
  check('engine.297: a POP link off the ledger (archived / deceased) is not sighted, never a stale cultural hood', b.ACTORS.length === 0);
  const life = make([['Synthetic Living', 'actor', 'actor', 'Active', 'POP-99001', ''], ['Synthetic Retired', 'author', 'author', 'Active', 'POP-99003', ''],
    ['Synthetic Gone', 'actor', 'actor', 'Active', 'POP-99004', ''], ['Synthetic Ward', 'actor', 'actor', 'Active', 'POP-99005', '']]);
  life.ledger = { headers: ['POPID', 'Neighborhood', 'Status'], rows: [['POP-99001', 'Temescal', 'Active'], ['POP-99003', 'Fruitvale', 'Retired'],
    ['POP-99004', 'Downtown', 'Deceased'], ['POP-99005', 'Downtown', 'Hospitalized']] };
  const lb = sb.culturalSightingBuckets_(life);
  check('engine.297: only a living linked citizen (active or retired) is sighted; deceased / hospitalized rows stay home',
    lb.ACTORS.map(e => e.name).join() === 'Synthetic Living' && lb.AUTHORS.map(e => e.name + '/' + e.homeNeighborhood).join() === 'Synthetic Retired/Fruitvale');
  const unk = sb.culturalSightingBuckets_(make([['Synthetic Leader', 'cultural leader', 'unknown', 'Active', '', 'Downtown'],
    ['Synthetic Figure', 'cultural figure', '', 'Active', '', 'Downtown'], ['Synthetic Model', 'model', 'model', 'Active', '', 'Downtown']]));
  check('engine.297: an unknown category re-reads the role words (live Rosa Martinez / Li Wei shape); a bucketless category stays out',
    unk.CULTURAL_LEADERS.map(e => e.name).join() === 'Synthetic Leader,Synthetic Figure' &&
    !Object.keys(unk).some(k => unk[k].some(e => e.name === 'Synthetic Model')));
  const auth = sb.culturalSightingBuckets_(make([['Synthetic ModelChef', 'chef', 'model', 'Active', '', 'Downtown'],
    ['Synthetic ModelLeader', 'cultural leader', 'model', 'Active', '', 'Downtown'], ['Synthetic Personality', 'cultural figure', 'media-personality', 'Active', '', 'Downtown']]));
  check('engine.297 (codex 1a): an authored unmapped category stays out whatever the role says (model/chef, model/cultural leader, media-personality/cultural figure)',
    !Object.keys(auth).some(k => auth[k].length));
  const noStatus = make([['Synthetic Linked', 'actor', 'actor', 'Active', 'POP-99001', '']]);
  noStatus.ledger = { headers: ['POPID', 'Neighborhood'], rows: [['POP-99001', 'Temescal']] };
  const ns = sb.culturalSightingBuckets_(noStatus);
  check('engine.297 (codex 1b): a ledger with no Status column vouches for no linked row', ns.ACTORS.length === 0);
  sb.buildEveningFamous_(sparse);
  check('engine.297: empty musician bucket contributes no name', b.MUSICIANS.length === 0 && !picked.some(p => p.role === 'musician'));
  const empty = make([]);
  sb.buildEveningFamous_(empty);
  check('engine.297: empty ledger has no literal fallback', empty.summary.famousSightings.length === 0);
  const oldNames = ["Lena Cross","Evan Morello","Sage Vienta","Marcus Duval","Nina Reyes","Rico Valez","Marin Tao","Jade Orion","Theo Banks","Celeste Moon","Dax Monroe","Kato Rivers","Nila James","Jordan Steele","Malik Torres","Sienna Vale","Brody Kale","Lumi Crest","Zara Kim","Tara Ellison","Rowan Pierce","Derek Obi","Carmen Dreel","Mason Tril","Sofia Nguyen","Pixel Pete","GameGirl Gia","NightOwl Nate","Claire Ashford","Marcus Webb","Councilwoman Rivera","Advocate Simmons","Community Director Hayes","Tech CEO Warren","Venture Kate Lin","Gallery Owner Mei Chen","Muralist Dante Reyes","Sculptor Alma Vasquez","Photographer Kai Tanaka","Heritage Director Rosa Martinez","Festival Organizer James Williams","Cultural Ambassador Li Wei"];
  const source = fs.readFileSync(path.join(ROOT, 'phase07-evening-media/buildEveningFamous.js'), 'utf8');
  check('engine.297: none of the ' + oldNames.length + ' former literal names survives in source', oldNames.every(n => !source.includes(n)));
}

console.log('engine.313 — synthetic, non-canon: one citizen, one fame row (real registrar, intents, helpers)');
{
  const CH = ['Timestamp', 'CUL-ID', 'Name', 'RoleType', 'FameCategory', 'CulturalDomain', 'Status', 'UniverseLinks',
    'FirstSeenCycle', 'LastSeenCycle', 'MediaCount', 'FameScore', 'TrendTrajectory', 'FirstRefSource', 'MediaSpread',
    'CityTier', 'Neighborhood', 'Holiday', 'HolidayPriority', 'SportsSeason'];
  const C = n => CH.indexOf(n) + 1;   // 1-based, as the intents address it
  const row = (id, name, role, cat, pop, fame) => ['C100', id, name, role, cat, cat === 'dynasty' ? 'Community' : 'Arts', 'Active', pop,
    100, 100, 3, fame, 'stable', '', 1, 'Local', '', '', '', ''];
  let ids = 0;
  const logs = [], helperCalls = [];
  const rsb = vm.createContext({ Logger: { log: m => logs.push(String(m)) }, Math, String, Number, Array, Object, JSON, Date,
    safeRand_: () => () => 0.5, getCoreSimNeighborhoods_: () => ['Downtown'], sportsRung_: () => '', hoodNamesWithScene_: () => [],
    shortId_: () => 'syn' + (++ids), inWorldStamp_: () => 'C113' });
  ['utilities/writeIntents.js', 'phase07-evening-media/updateMediaSpread.js', 'phase07-evening-media/updateTrendTrajectory.js',
    'phase03-population/updateCityTier.js', 'phase07-evening-media/culturalLedger.js'].forEach(f => load(rsb, f));
  for (const fn of ['updateMediaSpread_', 'updateTrendTrajectory_', 'updateCityTier_']) {
    const real = rsb[fn];
    rsb[fn] = function (sheet, r) { helperCalls.push(fn + '@' + r); return real.apply(null, arguments); };
  }
  const LEDGER = [['POP-99101', 'Synthia', 'Arden'], ['POP-99102', 'Synthor', 'Bell']];
  // a fresh Cycle per run: mutable fake tab (the helpers write it direct), fresh ctx (resolver cache, registry, intents)
  const mkSheet = rows => {
    const v = [CH.slice()].concat(rows.map(r => r.slice()));
    return { v, sheet: { getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }), getLastRow: () => v.length,
      getLastColumn: () => CH.length,
      getRange: (r, c, nr, nc) => ({ getValues: () => v.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
        getValue: () => v[r - 1][c - 1], setValue: x => { v[r - 1][c - 1] = x; } }) } };
  };
  const run = (rows, calls, ledger, extra) => {
    const { v, sheet } = mkSheet(rows);
    rsb.ensureCulturalLedger_ = () => sheet;
    logs.length = 0; helperCalls.length = 0;
    const ctx = { summary: Object.assign({ cycleId: 113, economicMood: 50 }, extra || {}), config: {}, ss: { getSheetByName: () => sheet },
      ledger: { headers: ['POPID', 'First', 'Last'], rows: ledger || LEDGER } };
    const returned = [];
    for (const [name, role] of calls) returned.push(rsb.registerCulturalEntity_(ctx, name, role, 'SystemEngine', ''));
    const noFameBeforeFlush = !ctx.persist.updates.some(u => u.kind === 'cell' && u.address.col === C('FameScore'));
    rsb.flushCulturalFame_(ctx);   // engine.312: Phase7-FameFlush writes the one FameScore per row
    const ups = ctx.persist.updates;
    return { ctx, v, returned, noFameBeforeFlush, ups, cells: ups.filter(u => u.kind === 'cell'), appends: ups.filter(u => u.kind === 'append'),
      keys: Object.keys(ctx.summary.culturalRegistry), helpers: helperCalls.slice(), logs: logs.slice() };
  };
  const onCol = (res, col) => res.cells.filter(u => u.address.col === C(col));
  const rowsHit = res => [...new Set(res.cells.map(u => u.address.row))].join();

  const a = run([row('CUL-SYN001', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 45)], [['Synthia Arden', 'artist']]);
  check('engine.313: a citizen-name call updates the linked row named differently — same CUL-ID, no new row',
    a.returned[0] === 'CUL-SYN001' && a.appends.length === 0 && rowsHit(a) === '2', JSON.stringify({ r: a.returned, ap: a.appends.length, rows: rowsHit(a) }));
  check('engine.313: CUL-ID, Name and UniverseLinks are never written; the row keeps its own FameCategory / CulturalDomain',
    !a.cells.some(u => [C('CUL-ID'), C('Name'), C('UniverseLinks'), C('FameCategory'), C('CulturalDomain')].includes(u.address.col)) &&
    a.v[1][C('Name') - 1] === 'Muralist Synthia Arden' && a.v[1][C('FameCategory') - 1] === 'artist');
  check('engine.313: each direct helper runs once, on that row; the resolution is logged',
    a.helpers.join() === 'updateMediaSpread_@2,updateTrendTrajectory_@2,updateCityTier_@2' && a.logs.some(l => /engine\.313/.test(l) && /CUL-SYN001/.test(l)),
    a.helpers.join() + ' | ' + a.logs.join(' / '));

  for (const order of [[['Synthia Arden', 'artist'], ['Muralist Synthia Arden', 'artist']], [['Muralist Synthia Arden', 'artist'], ['Synthia Arden', 'artist']]]) {
    const b = run([row('CUL-SYN002', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 45)], order);
    const mc = onCol(b, 'MediaCount'), fsI = onCol(b, 'FameScore');
    check('engine.313: both spellings in one Cycle (' + order[0][0] + ' first) → one registry entry, one intent set, MediaCount +2; engine.312: one FameScore 45 + 2, written only by the flush',
      b.keys.join() === 'row:2' && b.appends.length === 0 && mc.length === 1 && mc[0].values[0][0] === 5 && fsI.length === 1 &&
      fsI[0].values[0][0] === 47 && b.noFameBeforeFlush && onCol(b, 'LastSeenCycle').length === 1 && b.returned.every(x => x === 'CUL-SYN002') && rowsHit(b) === '2',
      JSON.stringify({ keys: b.keys, ap: b.appends.length, mc: mc.map(u => u.values[0][0]), fame: fsI.map(u => u.values[0][0]), rows: rowsHit(b) }));
    check('engine.313: … and the helpers run once on that row (' + order[0][0] + ' first)',
      b.helpers.join() === 'updateMediaSpread_@2,updateTrendTrajectory_@2,updateCityTier_@2', b.helpers.join());
  }

  // F1 — the selected row is the write target; no rescan by label
  const c1 = run([row('CUL-SYN010', 'Synthetic Shared Label', 'artist', 'artist', 'POP-99102', 5),
    row('CUL-SYN011', 'Synthetic Shared Label', 'artist', 'artist', 'POP-99101', 40)],
    [['Synthetic Shared Label', 'artist'], ['Synthia Arden', 'artist']]);
  check('engine.313 (codex F1): an earlier row with the same label and another POPID is not the citizen\'s target, even when already registered this Cycle',
    c1.returned.join() === 'CUL-SYN010,CUL-SYN011' && c1.keys.sort().join() === 'row:2,row:3' &&
    onCol(c1, 'MediaCount').map(u => u.address.row + ':' + u.values[0][0]).join() === '2:4,3:4' && c1.appends.length === 0 &&
    onCol(c1, 'FameScore').map(u => u.address.row + ':' + u.values[0][0]).join() === '2:6,3:41' &&
    c1.helpers.join() === 'updateMediaSpread_@2,updateTrendTrajectory_@2,updateCityTier_@2,updateMediaSpread_@3,updateTrendTrajectory_@3,updateCityTier_@3',
    JSON.stringify({ r: c1.returned, keys: c1.keys, mc: onCol(c1, 'MediaCount').map(u => u.address.row + ':' + u.values[0][0]),
      fs: onCol(c1, 'FameScore').map(u => u.address.row + ':' + u.values[0][0]), h: c1.helpers }));
  const c2 = run([row('CUL-SYN020', 'Photographer Synthia Arden', 'Photographer', 'artist', 'POP-99101', 10),
    row('CUL-SYN021', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthia Arden', 'artist']]);
  check('engine.313 (codex F1): one POPID on two personal rows → the higher-fame row, not the first', c2.returned[0] === 'CUL-SYN021' && rowsHit(c2) === '3');
  const c3 = run([row('CUL-SYN030', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80),
    row('CUL-SYN031', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthia Arden', 'dynasty']]);
  check('engine.313 (codex F1/F2): a higher-fame dynasty row first → the personal row; its category stays artist, the family row untouched',
    c3.returned[0] === 'CUL-SYN031' && rowsHit(c3) === '3' && onCol(c3, 'FameCategory').length === 0 && onCol(c3, 'CulturalDomain').length === 0 &&
    c3.v[2][C('FameCategory') - 1] === 'artist' && c3.v[1].join() === row('CUL-SYN030', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80).join(),
    JSON.stringify({ r: c3.returned, rows: rowsHit(c3) }));
  const c4 = run([row('CUL-SYN040', 'Photographer Synthia Arden', 'Photographer', 'artist', 'POP-99101', 30),
    row('CUL-SYN041', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 30)], [['Synthia Arden', 'artist']]);
  check('engine.313: an equal-fame tie goes to the earlier row', c4.returned[0] === 'CUL-SYN040' && rowsHit(c4) === '2');
  const c5 = run([row('CUL-SYN050', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80)], [['Synthia Arden', 'dynasty']]);
  check('engine.313: a dynasty-only link is no personal row → CREATE under the citizen name and POPID; the family row untouched',
    c5.appends.length === 1 && c5.appends[0].values[0][C('Name') - 1] === 'Synthia Arden' && c5.appends[0].values[0][C('UniverseLinks') - 1] === 'POP-99101' &&
    c5.cells.length === 0 && c5.helpers.length === 0);
  const c6 = run([row('CUL-SYN060', 'Synthia Arden', 'artist', 'artist', 'POP-99999', 5),
    row('CUL-SYN061', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthia Arden', 'author']]);
  check('engine.313: exact Name still wins (old precedence); engine.315: its authored category stands against the role word',
    c6.returned[0] === 'CUL-SYN060' && rowsHit(c6) === '2' && onCol(c6, 'FameCategory').length === 0 &&
    !c6.logs.some(l => /engine\.313/.test(l)));
  const c7 = run([row('CUL-SYN070', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthetic Stranger', 'artist']]);
  check('engine.313: an unresolved name creates as before (blank link)',
    c7.appends.length === 1 && c7.appends[0].values[0][C('UniverseLinks') - 1] === '' && c7.cells.length === 0);
  const c8 = run([row('CUL-SYN080', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthia Arden', 'artist']],
    [['POP-99101', 'Synthia', 'Arden'], ['POP-99103', 'Synthia', 'Arden']]);
  check('engine.313: an ambiguous citizen name resolves no POPID → no fallback (never the wrong citizen)',
    c8.appends.length === 1 && c8.appends[0].values[0][C('UniverseLinks') - 1] === '' && c8.cells.length === 0);

  // codex diff gate F1: the conflicting row already registered this Cycle, for the score and dynasty cases
  const c9 = run([row('CUL-SYN090', 'Photographer Synthia Arden', 'Photographer', 'artist', 'POP-99101', 10),
    row('CUL-SYN091', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Photographer Synthia Arden', 'artist'], ['Synthia Arden', 'artist']]);
  check('engine.313 (codex gate F1): lower-fame row registered first → the citizen still reaches the higher row, each on its own intents',
    c9.returned.join() === 'CUL-SYN090,CUL-SYN091' && c9.keys.sort().join() === 'row:2,row:3' &&
    onCol(c9, 'MediaCount').map(u => u.address.row + ':' + u.values[0][0]).join() === '2:4,3:4' && c9.appends.length === 0,
    JSON.stringify({ r: c9.returned, keys: c9.keys }));
  const c10 = run([row('CUL-SYN100', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80),
    row('CUL-SYN101', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['The Arden Family', 'dynasty'], ['Synthia Arden', 'dynasty']]);
  check('engine.313 (codex gate F1): dynasty registered first by its own name → the citizen still reaches the personal row; engine.315: neither category rewritten (dynasty no longer → unknown)',
    c10.returned.join() === 'CUL-SYN100,CUL-SYN101' && c10.keys.sort().join() === 'row:2,row:3' && c10.appends.length === 0 &&
    onCol(c10, 'FameCategory').length === 0, JSON.stringify({ r: c10.returned, keys: c10.keys, cat: onCol(c10, 'FameCategory').map(u => u.address.row + ':' + u.values[0][0]) }));

  // codex diff gate F2: on the POPID path the row's own category drives the fame bonus and the summary (First Friday: Arts +4)
  const c11 = run([row('CUL-SYN110', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80),
    row('CUL-SYN111', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)], [['Synthia Arden', 'dynasty']], null, { isFirstFriday: true });
  const up11 = c11.ctx.summary.culturalEntityUpdates || [];
  check('engine.313 (codex gate F2): a dynasty role word on the POPID path → the artist row (engine.312: 40 + 1, the First Friday extra retired), summary artist / Arts, no category write',
    c11.returned[0] === 'CUL-SYN111' && onCol(c11, 'FameScore').map(u => u.address.row + ':' + u.values[0][0]).join() === '3:41' &&
    up11.length === 1 && up11[0].fameCategory === 'artist' && up11[0].domain === 'Arts' && up11[0].name === 'Muralist Synthia Arden' &&
    onCol(c11, 'FameCategory').length === 0, JSON.stringify({ fs: onCol(c11, 'FameScore').map(u => u.values[0][0]), up: up11 }));

  // codex diff gate F2, through the actual bridge: the fame bar admits the citizen, the bridge passes the dynasty's category
  {
    const { v, sheet } = mkSheet([row('CUL-SYN120', 'The Arden Family', 'Institution', 'dynasty', 'POP-99101', 80),
      row('CUL-SYN121', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 40)]);
    let picked = null;
    const bsb = vm.createContext({ Logger: { log: () => {} }, Math, String, Number, Array, Object, JSON, Date,
      safeRand_: () => () => 0.5, getCoreSimNeighborhoods_: () => ['Downtown'], hoodNamesWithScene_: () => [], normHood_: h => h,
      sportsRung_: () => '', recordRipple_: () => {}, shortId_: () => 'syn' + (++ids), inWorldStamp_: () => 'C113',
      pickRandomSet_: (pool, n) => { picked = pool.filter(p => p.name === 'Synthia Arden'); return picked.slice(0, 1); } });
    ['utilities/writeIntents.js', 'phase07-evening-media/updateMediaSpread.js', 'phase07-evening-media/updateTrendTrajectory.js',
      'phase03-population/updateCityTier.js', 'phase07-evening-media/culturalLedger.js', 'phase07-evening-media/buildEveningFamous.js'].forEach(f => load(bsb, f));
    bsb.decayCulturalFame_ = () => {};
    bsb.ensureCulturalLedger_ = () => sheet;
    const ctx = { rng: () => 0.5, config: {}, summary: { cycleId: 113, economicMood: 50, isFirstFriday: true },
      ss: { getSheetByName: n => n === 'Cultural_Ledger' ? sheet : null },
      ledger: { headers: ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'Status', 'OriginGame', 'Neighborhood', 'TraitProfile', 'RoleType'],
        rows: [['POP-99101', 'Synthia', 'Arden', 3, 'ENGINE', 'Active', '', 'Downtown', '', '']] } };
    bsb.buildEveningFamous_(ctx);
    bsb.flushCulturalFame_(ctx);
    const ups = ctx.persist ? ctx.persist.updates : [];
    const fsB = ups.filter(u => u.kind === 'cell' && u.address.col === C('FameScore'));
    const upB = ctx.summary.culturalEntityUpdates || [];
    check('engine.313 (codex gate F2, real bridge): the dynasty-role sighting reaches the artist row (engine.312: +1), no append, no category write',
      !!picked && picked.length > 0 && picked[0].role === 'dynasty' && ctx.summary.famousPeople.join() === 'Synthia Arden' &&
      ups.filter(u => u.kind === 'append').length === 0 && fsB.map(u => u.address.row + ':' + u.values[0][0]).join() === '3:41' &&
      !ups.some(u => u.kind === 'cell' && (u.address.row === 2 || u.address.col === C('FameCategory'))) &&
      upB.length === 1 && upB[0].fameCategory === 'artist' && v.length === 3,
      JSON.stringify({ picked: picked && picked.map(p => p.role), famous: ctx.summary.famousPeople, fs: fsB.map(u => u.address.row + ':' + u.values[0][0]),
        ap: ups.filter(u => u.kind === 'append').length, up: upB }));
  }

  // engine.315: on an existing row an authored FameCategory decides — the role word never rewrites it
  const dom = (r, d) => { r[C('CulturalDomain') - 1] = d; return r; };
  const catCells = res => onCol(res, 'FameCategory').concat(onCol(res, 'CulturalDomain')).map(u => u.address.row + ':' + u.values[0][0]).join();
  const d1 = run([row('CUL-SYN130', 'Synthetic Star', 'Celebrity', 'musician', '', 40)], [['Synthetic Star', 'Celebrity']], null, { isFirstFriday: true });
  check('engine.315: "Celebrity" on a musician row → no category write; the authored category in the summary (engine.312: 40 + 1, no First Friday extra)',
    catCells(d1) === '' && onCol(d1, 'FameScore').map(u => u.values[0][0]).join() === '41' &&
    (d1.ctx.summary.culturalEntityUpdates || [])[0].fameCategory === 'musician', JSON.stringify({ cat: catCells(d1), fs: onCol(d1, 'FameScore').map(u => u.values[0][0]) }));
  const rung = rsb.sportsRung_; rsb.sportsRung_ = () => 'championship';
  const d2 = run([dom(row('CUL-SYN140', 'Synthetic Legend', "Shortstop, Oakland A's Legend", 'athlete', '', 40), 'Sports')], [['Synthetic Legend', "A's legend"]]);
  rsb.sportsRung_ = rung;
  check('engine.315: "A\'s legend" on an athlete row → no category write (engine.312: 40 + 1, no championship extra)',
    catCells(d2) === '' && onCol(d2, 'FameScore').map(u => u.values[0][0]).join() === '41', JSON.stringify({ cat: catCells(d2), fs: onCol(d2, 'FameScore').map(u => u.values[0][0]) }));
  const d3 = run([dom(row('CUL-SYN150', 'Synthetic Manager', 'General Manager', 'sports-figure', '', 25), 'Sports')], [['Synthetic Manager', 'sports-figure']]);
  check('engine.315: the bridge\'s copied "sports-figure" on a sports-figure row → no rewrite to athlete', catCells(d3) === '', catCells(d3));
  const d4 = run([dom(row('CUL-SYN160', 'Synthetic Cook', 'Heritage Director', 'unknown', '', 20), 'Other')], [['Synthetic Cook', 'chef']]);
  check('engine.315: an unknown category is filled when the role word classifies (chef / Culinary)', catCells(d4) === '2:chef,2:Culinary', catCells(d4));
  const d5 = run([dom(row('CUL-SYN170', 'Synthetic Blank', 'Celebrity', '', '', 20), '')], [['Synthetic Blank', 'Celebrity']]);
  check('engine.315: a blank category and a role word that does not classify → nothing written (no unknown / Other)', catCells(d5) === '', catCells(d5));
  const d6 = run([dom(row('CUL-SYN180', 'Painter Synthia Arden', 'Painter', '', 'POP-99101', 30), '')], [['Synthia Arden', 'dynasty']]);
  check('engine.315: POPID path, blank category → filled from the row\'s own RoleType ("Painter" → artist), never the caller\'s dynasty word',
    d6.returned[0] === 'CUL-SYN180' && catCells(d6) === '2:artist,2:Arts', catCells(d6));

  // engine.314: a same-Cycle repeat of a new entity keeps the CREATE row's calendar columns (live header)
  const cal = { holiday: 'Thanksgiving', holidayPriority: 'major', sportsSeason: 'mid-season' };
  const e1 = run([], [['Synthetic Newcomer', 'artist'], ['Synthetic Newcomer', 'artist']], null, cal);
  const ap1 = e1.appends.length === 1 ? e1.appends[0].values[0] : [];
  check('engine.314: a new entity twice in one Cycle → one append, MediaCount 2, Holiday / HolidayPriority / SportsSeason as CREATE wrote them',
    e1.appends.length === 1 && ap1[C('MediaCount') - 1] === 2 && ap1[C('Holiday') - 1] === 'Thanksgiving' &&
    ap1[C('HolidayPriority') - 1] === 'major' && ap1[C('SportsSeason') - 1] === 'mid-season',
    JSON.stringify({ n: e1.appends.length, cal: ap1.slice(17) }));
  {
    // a v2.2 header (FirstSeenHoliday / LastSeenHoliday / CalendarContext): the repeat writes those two by name
    const H22 = CH.slice(0, 17).concat(['FirstSeenHoliday', 'LastSeenHoliday', 'CalendarContext']);
    const v22 = [H22.slice()];
    const sheet22 = { getDataRange: () => ({ getValues: () => v22.map(r => r.slice()) }), getLastRow: () => v22.length, getLastColumn: () => H22.length,
      getRange: () => ({ getValues: () => [H22.slice()], getValue: () => '', setValue: () => {} }) };
    rsb.ensureCulturalLedger_ = () => sheet22;
    const ctx22 = { summary: Object.assign({ cycleId: 113, economicMood: 50 }, cal), config: {}, ss: { getSheetByName: () => sheet22 },
      ledger: { headers: ['POPID', 'First', 'Last'], rows: LEDGER } };
    rsb.registerCulturalEntity_(ctx22, 'Synthetic Newcomer', 'artist', 'SystemEngine', '');
    rsb.registerCulturalEntity_(ctx22, 'Synthetic Newcomer', 'artist', 'SystemEngine', '');
    const ap22 = ctx22.persist.updates.filter(u => u.kind === 'append');
    const r22 = ap22.length === 1 ? ap22[0].values[0] : [];
    check('engine.314: on a v2.2 header the repeat writes LastSeenHoliday / CalendarContext by name',
      ap22.length === 1 && r22[H22.indexOf('LastSeenHoliday')] === 'Thanksgiving' && r22[H22.indexOf('CalendarContext')] === 'Thanksgiving, mid-season',
      JSON.stringify(r22.slice(17)));
  }
}

console.log('engine.312 — synthetic, non-canon: fame from the paper (real citation pass, ladder floor, fade, sightings, one flush)');
{
  const CH = ['Timestamp', 'CUL-ID', 'Name', 'RoleType', 'FameCategory', 'CulturalDomain', 'Status', 'UniverseLinks',
    'FirstSeenCycle', 'LastSeenCycle', 'MediaCount', 'FameScore', 'TrendTrajectory', 'FirstRefSource', 'MediaSpread',
    'CityTier', 'Neighborhood', 'Holiday', 'HolidayPriority', 'SportsSeason'];
  const C = n => CH.indexOf(n) + 1;
  const crow = (id, name, pop, fame, last) => ['C100', id, name, 'artist', 'artist', 'Arts', 'Active', pop, 100, last, 3, fame, 'stable', '', 1, 'Local', '', '', '', ''];
  const UH = ['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed', 'Sentiment'];
  const LH = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UsageCount', 'Status', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'Famous', 'RoleType'];
  const lrow = (pop, first, last, use, famous) => [pop, first, last, 4, 'ENGINE', use, 'Active', '', '', 'Downtown', famous || '', 'Painter'];
  let ids = 0;
  const fsb = vm.createContext({ Logger: { log: () => {} }, Math, String, Number, Array, Object, JSON, Date,
    safeRand_: () => () => 0.5, getCoreSimNeighborhoods_: () => ['Downtown'], hoodNamesWithScene_: () => [],
    shortId_: () => 'e312n' + (++ids), inWorldStamp_: () => 'C113', recordRipple_: () => {} });
  ['utilities/writeIntents.js', 'phase07-evening-media/updateMediaSpread.js', 'phase07-evening-media/updateTrendTrajectory.js',
    'phase03-population/updateCityTier.js', 'phase07-evening-media/culturalLedger.js', 'phase01-config/advanceSimulationCalendar.js',
    'phase05-citizens/processAdvancementIntake.js'].forEach(f => load(fsb, f));
  const tab = (rows) => {
    const v = rows.map(r => r.slice());
    return { v, getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }), getLastRow: () => v.length,
      getLastColumn: () => Math.max(...v.map(r => r.length)),
      getRange: (r, c, nr, nc) => ({ getValues: () => v.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
        getValue: () => (v[r - 1] || [])[c - 1], setValue: x => { (v[r - 1] = v[r - 1] || [])[c - 1] = x; } }) };
  };
  const world = () => {
    const cul = tab([CH].concat([
      crow('CUL-E1', 'Muralist Synthia Arden', 'POP-99101', 40, 100),   // r2: paper +5 −2, quiet since C100 (fade −1), two sightings
      crow('CUL-E2', 'Synthor Bell', 'POP-99102', 99, 112),              // r3: paper +5, a sighting → 105 → the cap
      crow('CUL-E3', 'Synthetic Famous', 'POP-99104', 20, 112),          // r4: held as Famous → the 25 floor
      crow('CUL-E4', 'Synthetic Low', 'POP-99105', 1, 112)               // r5: paper −2 → clamp 0
    ]));
    const use = tab([UH].concat([
      ['C110', 110, 'Synthia Arden', 'mentioned', 'a delayed Cycle', 'R', '', 'positive'],   // +5 (an older pending Cycle counts)
      ['C112', 112, 'Synthia Arden', 'quoted', 'q', 'R', '', 'negative'],                    // −2
      ['C112', 112, 'Synthia Arden', 'byline-landed', 'own', 'Synthia Arden', '', ''],       // own work 0
      ['C112', 112, 'Synthia Arden', 'family-own-words', 'page', '', '', ''],               // family 0
      ['C112', 112, 'Synthia Arden', 'POP-99101', 'shifted', '', '', ''],                   // off-list (a POPID in the type cell) 0
      ['C112', 112, 'Synthea Twin', 'mentioned', 'amb', 'R', '', 'positive'],                // ambiguous name → nothing, counted
      ['C112', 112, 'Synthor Bell', 'featured', 'f', 'R', '', 'positive'],                   // +5
      ['C112', 112, 'Synthetic Low', 'mentioned', 'm', 'R', '', 'negative'],                 // −2
      ['C100', 100, 'Synthetic Newstar', 'mentioned', 'old', 'R', 'Y', 'positive'],          // processed: record 5, no credit tonight
      ['C112', 112, 'Synthetic Newstar', 'quoted', 'new', 'R', '', ''],                      // +1, no CUL row → counted; record 6
      ['C100', 100, 'Synthetic Rostered', 'mentioned', 'old', 'R', 'Y', 'positive']          // record 5
    ]));
    // the Phase-11 media-room copy: Source named, no print → 0 (the column is armed on the first pass)
    use.v[0][8] = 'Source';
    use.v.push(['C112', 112, 'Synthia Arden', 'mentioned', 'media room', 'R', '', 'positive', 'media-room']);
    const ledger = { headers: LH.slice(), dirty: false, rows: [
      lrow('POP-99101', 'Synthia', 'Arden', 4), lrow('POP-99102', 'Synthor', 'Bell', 4), lrow('POP-99104', 'Synthetic', 'Famous', 30, 'C100'),
      lrow('POP-99105', 'Synthetic', 'Low', 2), lrow('POP-99106', 'Synthea', 'Twin', 1), lrow('POP-99107', 'Synthea', 'Twin', 1),
      lrow('POP-99108', 'Synthetic', 'Newstar', 2), lrow('POP-99109', 'Synthetic', 'Rostered', 40), lrow('POP-99110', 'Synthetic', 'Quiet', 26, 'C100')] };
    fsb.ensureCulturalLedger_ = () => cul;
    const ctx = { summary: { cycleId: 113, economicMood: 50 }, config: {}, ledger,
      ss: { getSheetByName: n => n === 'Cultural_Ledger' ? cul : n === 'Citizen_Media_Usage' ? use : null } };
    return { ctx, cul, use };
  };
  const updatesOf = ctx => (ctx.persist ? ctx.persist.updates : []);
  const fameCells = ctx => updatesOf(ctx).filter(u => u.kind === 'cell' && u.address.col === C('FameScore'));
  const byRow = ctx => fameCells(ctx).map(u => u.address.row + ':' + u.values[0][0]).sort().join();
  const appendsOf = ctx => ctx.persist.updates.filter(u => u.kind === 'append' && u.tab === 'Cultural_Ledger').map(u => u.values[0]);

  // ── the whole Cycle in phase order ──
  const w = world();
  const pm = fsb.processMediaUsage_(w.ctx, 'C113', 113);
  fsb.applyTierLadderState_(w.ctx, 113);
  const noFameYet = fameCells(w.ctx).length === 0;
  fsb.decayCulturalFame_(w.ctx);
  for (const n of ['Synthia Arden', 'Synthia Arden', 'Synthor Bell', 'Synthetic Rostered', 'Synthetic Newstar', 'Synthetic Newstar '])
    fsb.registerCulturalEntity_(w.ctx, n, 'artist', 'SystemEngine', '', 'sighting');
  const flushed = fsb.flushCulturalFame_(w.ctx);
  const ap = appendsOf(w.ctx);
  const apBy = name => ap.filter(r => r[C('Name') - 1] === name);
  check('engine.312: nothing writes FameScore before the flush (Phase 5 and the ladder only accumulate)', noFameYet);
  check('engine.312: one FameScore intent per touched row — r2 40 +5 −2 −1 fade +2 sightings = 44; r3 99 +5 +1 → 100 (cap); r4 20 → 25 (famous floor); r5 1 −2 → 0',
    byRow(w.ctx) === '2:44,3:100,4:25,5:0' && fameCells(w.ctx).length === 4, byRow(w.ctx));
  check('engine.312: credits counted — 4 rows credited, 1 with no row (Newstar), 1 unresolved (the ambiguous twin); own work / family / off-list / media-room add nothing',
    pm.paperFame === 4 && pm.paperFameNoRow === 1 && pm.paperFameUnresolved === 1, JSON.stringify(pm));
  check('engine.312: the whole-tab record (Processed or not) — Newstar 5 + 1 = 6, Rostered 5, Arden +3 (media-room 0)',
    w.ctx.summary.paperFameByPop['POP-99108'] === 6 && w.ctx.summary.paperFameByPop['POP-99109'] === 5 && w.ctx.summary.paperFameByPop['POP-99101'] === 3,
    JSON.stringify(w.ctx.summary.paperFameByPop));
  const ns = apBy('Synthetic Newstar'), ro = apBy('Synthetic Rostered'), qu = apBy('Synthetic Quiet');
  check('engine.312: a new row starts at its paper record + tonight\'s sightings — Newstar 6 + 2 = 8; the whitespace alias is a repeat by POPID, not a twin row',
    ns.length === 1 && ap.length === 3 && ns[0][C('FameScore') - 1] === 8 && ns[0][C('MediaCount') - 1] === 2 && ns[0][C('UniverseLinks') - 1] === 'POP-99108',
    JSON.stringify(ap.map(r => [r[2], r[9], r[10], r[11]])));
  check('engine.312: a roster create then a sighting the same Cycle → one row, the sighting counted (MediaCount 1, LastSeen 113), 5 + 1 lifted to the famous floor 25',
    ro.length === 1 && ro[0][C('MediaCount') - 1] === 1 && ro[0][C('LastSeenCycle') - 1] === 113 && ro[0][C('FameScore') - 1] === 25,
    JSON.stringify(ro.map(r => [r[9], r[10], r[11]])));
  check('engine.312: a roster create never sighted marks no sighting (LastSeenCycle blank, MediaCount 0) and starts at the famous floor 25',
    qu.length === 1 && qu[0][C('LastSeenCycle') - 1] === '' && qu[0][C('MediaCount') - 1] === 0 && qu[0][C('FameScore') - 1] === 25 && qu[0][C('FirstRefSource') - 1] === 'engine.118',
    JSON.stringify(qu.map(r => [r[9], r[10], r[11], r[13]])));
  const processedMarks = w.ctx.persist.updates.filter(u => u.kind === 'cell' && u.tab === 'Citizen_Media_Usage');
  check('engine.312: every pending usage row still gets its Processed mark (UsageCount path unchanged)', processedMarks.length === 10, String(processedMarks.length));
  check('engine.312: the flush reports its counts on the summary', flushed.touched === 4 && flushed.written === 4 && flushed.pending === 3 && w.ctx.summary.culturalFameFlush === flushed, JSON.stringify(flushed));
  check('engine.312: the Source header self-armed nothing new (already present); MediaCount on r2 is 3 + 2 sightings',
    w.use.v[0].filter(h => h === 'Source').length === 1 &&
    w.ctx.persist.updates.some(u => u.kind === 'cell' && u.address.row === 2 && u.address.col === C('MediaCount') && u.values[0][0] === 5));

  // ── R2.1(d): the Famous phase throws after the fade — the separate flush still persists the paper credit ──
  const f = world();
  fsb.processMediaUsage_(f.ctx, 'C113', 113);
  try { fsb.decayCulturalFame_(f.ctx); throw new Error('synthetic Famous-phase failure'); } catch (e) { /* safePhaseCall_ logs and moves on */ }
  fsb.flushCulturalFame_(f.ctx);
  check('engine.312 (R2.1 d): a Famous-phase throw → the flush still writes the paper (r2 40 +3 −1 = 42, r3 → 100, r5 → 0)',
    byRow(f.ctx) === '2:42,3:100,5:0', byRow(f.ctx));
  const src2 = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const order = src2.match(/safePhaseCall_\(ctx, 'Phase7-Famous'[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*safePhaseCall_\(ctx, 'Phase7-FameFlush', function\(\) \{ flushCulturalFame_\(ctx\); \}\);/g) || [];
  check('engine.312 (R2.1 d): Phase7-FameFlush is its own phase right after Phase7-Famous at both entry points', order.length === 2, String(order.length));

  // ── caller orders on one existing row: roster then sighting, sighting then roster → +1 and one set of sighting marks either way ──
  for (const seq of [['roster', 'sighting'], ['sighting', 'roster']]) {
    const o = world();
    for (const cause of seq) fsb.registerCulturalEntity_(o.ctx, 'Synthor Bell', 'artist', 'SystemEngine', '', cause);
    fsb.flushCulturalFame_(o.ctx);
    const mcs = o.ctx.persist.updates.filter(u => u.kind === 'cell' && u.address.col === C('MediaCount'));
    const ls = o.ctx.persist.updates.filter(u => u.kind === 'cell' && u.address.col === C('LastSeenCycle'));
    check('engine.312: ' + seq.join(' → ') + ' on an existing row → FameScore 99 + 1 = 100, MediaCount 4, one LastSeenCycle 113',
      byRow(o.ctx) === '3:100' && mcs.length === 1 && mcs[0].values[0][0] === 4 && ls.length === 1 && ls[0].values[0][0] === 113,
      JSON.stringify({ f: byRow(o.ctx), mc: mcs.map(u => u.values[0][0]), ls: ls.map(u => u.values[0][0]) }));
  }
  {
    const o = world();
    fsb.registerCulturalEntity_(o.ctx, 'Synthor Bell', 'artist', 'engine.118', '', 'roster');
    fsb.flushCulturalFame_(o.ctx);
    check('engine.312: a roster call alone on an existing row → no FameScore change, no LastSeenCycle, no MediaCount, no helper writes',
      fameCells(o.ctx).length === 0 && !updatesOf(o.ctx).some(u => u.kind === 'cell' && [C('LastSeenCycle'), C('MediaCount')].includes(u.address.col)) &&
      o.cul.v[2][C('TrendTrajectory') - 1] === 'stable');
  }

  // ── the one record rule ──
  const D = fsb.paperFameDelta_;
  check('engine.312 R1: +5 / +1 / +1 (blank) / −2; own work, family, journalist, legacy byline, off-list 0; a named non-print source 0; print counts',
    D('mentioned', 'positive', '') === 5 && D('quoted', 'neutral', '') === 1 && D('featured', '', '') === 1 && D('referenced', 'negative', '') === -2 &&
    D('new_citizen', '', '') === 1 && D('existing_new_role', '', '') === 1 && D('byline-landed', 'positive', '') === 0 && D('byline-published', '', '') === 0 &&
    D('journalist', '', '') === 0 && D('byline', '', '') === 0 && D('family-own-words', '', '') === 0 && D('POP-00034', '', '') === 0 && D('', '', '') === 0 &&
    D('mentioned', 'positive', 'media-room') === 0 && D('mentioned', 'positive', 'print') === 5 && D(' Mentioned ', ' POSITIVE ', '') === 5);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
