#!/usr/bin/env node
'use strict';

/**
 * engine.225 — hood-economy consumers read the hood RELATIVE to the hoods' own median.
 *
 * On the engine.219 bench the first per-hood economic moods ever observed sat 54.14–56.96 round
 * a city 55.83 (17 of 22 hoods at the city value). Against that band every consumer gate was a
 * §15 trick: applyEconomyLocal_ ≥70/≥60/≤40/≤30, the per-hood micro ≥70/≤30, migration's
 * 1.15/0.85 ratio on the hood median (±8 points at 55). Migration also rounded every hood mood
 * to an integer (±0.5 of pure rounding against a ±2-max signal) and re-derived the descriptor on
 * a third scale (70/30, dropping growing/sluggish) — the scale every Phase 6–9 reader then saw.
 *
 * Offline proof, no Sheet: the real Phase-2 applyCityDynamics_ and the real Phase-6
 * applyMigrationDrift_ run in a vm on the 219 C108 hood set. Every number is a fixture.
 * Run: node scripts/hoodEconomyRelative.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);

const HOODS = ['Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London', 'Rockridge', 'Adams Point', 'Grand Lake',
  'Piedmont Ave', 'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio', 'KONO', 'Lake Merritt', 'Uptown',
  'Baylight District', 'East Oakland'];
// The 219 bench C108 set after Phase 6: 17 hoods at the city value, five moved by ripples.
const MOODS = { 'Jack London': 56.96, 'Fruitvale': 54.14, 'Downtown': 54.78, 'West Oakland': 55.32 };
function fixtureEconomies(over) {
  const o = {};
  HOODS.forEach(h => { const mood = (over && h in over) ? over[h] : (h in MOODS ? MOODS[h] : 55.4); o[h] = { mood, descriptor: 'growing', activeRipples: 0, sectors: ['retail'] }; });
  return o;
}
function hoodState() { const o = {}; HOODS.forEach((h, i) => { o[h] = { employerCharacter: i % 3 === 0 ? 'retail' : (i % 3 === 1 ? 'arts' : 'services'), boomIndex: 0 }; }); return o; }
const mapRows = () => [['Neighborhood', 'CrimeIndex', 'Sentiment', 'RetailVitality', 'EventAttractiveness', 'MigrationFlow']]
  .concat(HOODS.map(h => [h, 1, 0.1, 5, 20, 0]));

function world() {
  const rows = mapRows();
  const mapSheet = { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c) => ({ setValue: v => { rows[r - 1][c - 1] = v; }, setValues: () => {} }) };
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    safeRand_: () => () => 0.5, recordRipple_: () => true, safePhaseCall_: (ctx, label, fn) => fn() };
  vm.createContext(sb);
  for (const rel of ['phase06-analysis/economicRippleEngine.js', 'phase02-world-state/applyCityDynamics.js', 'phase06-analysis/applyMigrationDrift.js']) {
    vm.runInContext(read(rel), sb, { filename: rel });
  }
  return { sb, rows };
}
function ctxFor(sb, economies) {
  return { config: { cycleCount: 108, rngSeed: 7 }, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? sb.__map : null }, writeIntents: [],
    summary: { cycleId: 108, season: 'Winter', month: 1, holiday: 'none', sportsSeason: 'off-season', weather: { type: 'clear', impact: 1 },
      neighborhoodState: hoodState(), neighborhoodEconomies: economies, economicMood: 55.4, migrationDrift: 0,
      neighborhoodDemographics: {}, worldEvents: [], storySeeds: [], crimeByNeighborhood: {}, previousCycleState: { cycle: 107, migrationDrift: 0 } } };
}

console.log('engine.225 — hood economies relative to the hood median');

// ── source: the absolute scales are gone ─────────────────────────────────────
{
  const cd = read('phase02-world-state/applyCityDynamics.js');
  const mig = read('phase06-analysis/applyMigrationDrift.js');
  check('city dynamics: the ≥60 "ahead" tier is gone', !/mood >= 60\)/.test(cd));
  check('city dynamics: no 70/30 descriptor re-derivation', !/avgMood >= 70 \? 'thriving'/.test(cd));
  check('city dynamics: the micro reads the hood median', /e0mood - hoodMoodMedian/.test(cd));
  check('migration: no 70/30 descriptor re-derivation', !/afterMood >= 70\) econ\.descriptor/.test(mig));
  check('migration: mood band is an offset, not a ratio', /nhEcon\.mood - medMood >= MOOD_BAND/.test(mig) && !/medMood \* HI/.test(mig));
  check('one descriptor scale: both consumers call describeHoodEconomy_', /describeHoodEconomy_\(avgMood\)/.test(cd) && /describeHoodEconomy_\(afterMood\)/.test(mig));
}

// ── Phase 2: the real applyCityDynamics_ on the 219 set ──────────────────────
{
  const w = world();
  const runCD = econ => { const ctx = ctxFor(w.sb, econ); w.sb.__map = null; w.sb.applyCityDynamics_(ctx); return ctx.summary; };
  const S = runCD(fixtureEconomies());
  const nd = S.neighborhoodDynamics, cl = S.clusterDynamics;
  // Phase 2 still tracks the 12 hoods of its CLUSTERS literal (engine.214 is the sheet-derived rebuild);
  // the five rippled fixture hoods are all among them.
  const TRACKED = Object.keys(nd || {});
  check('runs end-to-end on the tracked hoods', TRACKED.length >= 12 && Object.keys(MOODS).every(h => TRACKED.indexOf(h) >= 0), TRACKED.length);
  const baseline = runCD(fixtureEconomies(Object.fromEntries(HOODS.map(h => [h, 55.4])))).neighborhoodDynamics;
  // one hood above the median, everyone else on it: NORTH_HILLS (Rockridge, Temescal — not adjacent
  // to Jack London's cluster) must be byte-identical to a flat city — no relative term, no spill.
  const only = runCD(fixtureEconomies(Object.fromEntries(HOODS.map(h => [h, h === 'Jack London' ? 56.96 : 55.4])))).neighborhoodDynamics;
  const untouched = ['Rockridge', 'Temescal'].every(h => near(only[h].sentiment, baseline[h].sentiment) && near(only[h].retail, baseline[h].retail));
  check('hoods at the median, away from the moved hood, carry no relative term', untouched,
    ['Rockridge', 'Temescal'].map(h => only[h].sentiment + '/' + baseline[h].sentiment).join(' '));
  check('the moved hood alone is priced up (sentiment and retail)', only['Jack London'].sentiment > baseline['Jack London'].sentiment && only['Jack London'].retail > baseline['Jack London'].retail,
    only['Jack London'].sentiment + ' vs ' + baseline['Jack London'].sentiment);
  // the full 219 set: Jack London (+1.56) up, Fruitvale (−1.26) / Downtown (−0.62) down — the pre-declared bench proof
  check('Jack London above the median: sentiment up', nd['Jack London'].sentiment > baseline['Jack London'].sentiment,
    nd['Jack London'].sentiment + ' vs ' + baseline['Jack London'].sentiment);
  check('Fruitvale below the median: sentiment down', nd['Fruitvale'].sentiment < baseline['Fruitvale'].sentiment);
  check('Downtown below the median: retail down', nd['Downtown'].retail < baseline['Downtown'].retail);
  // cluster: the delta is the cluster average minus the hood median
  const ww = cl['WATERFRONT_WEST'] && cl['WATERFRONT_WEST'].economy;
  check('cluster economy carries the delta (WATERFRONT_WEST avg 56.14 − median 55.4)', ww && near(ww.delta, (56.96 + 55.32) / 2 - 55.4, 0.01), JSON.stringify(ww));
  // first fire: nothing carried → no relative term, no throw
  const S0 = runCD({});
  check('first fire (no hood economies): runs, no relative term', S0.neighborhoodDynamics && Object.keys(S0.neighborhoodDynamics).length >= 12 && Object.values(S0.clusterDynamics).every(c => !c.economy));
  // the depression overlay stays absolute: a hood at 28 still takes the engine.185 hit
  const dep = runCD(fixtureEconomies({ Laurel: 28 })).neighborhoodDynamics;
  check('depression overlay (≤30) still fires', dep['Laurel'].sentiment < nd['Laurel'].sentiment - 0.15, dep['Laurel'].sentiment + ' vs ' + nd['Laurel'].sentiment);
  // the relative term is capped at |delta| 6 and inert at 0 / null — on the lifted closure itself,
  // so neither the cluster term nor the ≥65 'thriving' named state muddies the read
  const SRC = read('phase02-world-state/applyCityDynamics.js');
  const grab = name => { const i = SRC.indexOf('function ' + name + '('); if (i < 0) throw new Error(name); let d = 0, started = false, j = i;
    for (; j < SRC.length; j++) { const c = SRC[j]; if (c === '{') { d++; started = true; } else if (c === '}') { d--; if (started && d === 0) { j++; break; } } } return SRC.slice(i, j); };
  const M = new Function("var clamp = function(n,min,max){ return Math.max(min, Math.min(max, n)); };\nfunction safeNum_(v,d){ if(d===undefined)d=0; var n=Number(v); return isFinite(n)?n:d; }\n"
    + grab('applyEconomyLocal_') + '\n' + grab('makeMetrics_') + '\nreturn { applyEconomyLocal_: applyEconomyLocal_, makeMetrics_: makeMetrics_ };')();
  const price = (delta, mood) => { const m = M.makeMetrics_(); M.applyEconomyLocal_(m, { mood: mood === undefined ? 50 : mood, descriptor: 'stable', delta }); return m; };
  const fresh = M.makeMetrics_();
  check('delta 0: no change', near(price(0).retail, fresh.retail) && near(price(0).sentiment, fresh.sentiment));
  check('delta null (nothing carried): no change', near(price(null).retail, fresh.retail) && near(price(null).sentiment, fresh.sentiment));
  check('delta +3: retail ×1.03, sentiment +0.03', near(price(3).retail, fresh.retail * 1.03) && near(price(3).sentiment, fresh.sentiment + 0.03), price(3).retail + ' ' + price(3).sentiment);
  check('delta −3: retail ×0.97, sentiment −0.03, tourism ×0.98', near(price(-3).retail, fresh.retail * 0.97) && near(price(-3).sentiment, fresh.sentiment - 0.03) && near(price(-3).tourism, fresh.tourism * 0.98));
  check('relative term capped at |delta| 6 (12 prices like 6)', near(price(12).retail, price(6).retail) && near(price(12).sentiment, price(6).sentiment) && near(price(6).sentiment, fresh.sentiment + 0.05));
  check('the ≥60 tier is gone: mood 62 at delta 0 prices like mood 50', near(price(0, 62).retail, price(0, 50).retail) && near(price(0, 62).sentiment, price(0, 50).sentiment));
  check('named states stay absolute: mood 28 at delta 0 takes the depression hit', near(price(0, 28).sentiment, fresh.sentiment - 0.30));
}

// ── Phase 6: the real applyMigrationDrift_ on the 219 set ────────────────────
{
  const w = world();
  const rows = w.rows;
  const mapSheet = { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c) => ({ setValue: v => { rows[r - 1][c - 1] = v; }, setValues: () => {} }) };
  w.sb.__map = mapSheet;
  const ctx = ctxFor(w.sb, fixtureEconomies());
  ctx.config.rngSeed = undefined;   // rand() = the stub's 0.5 → rInt(2) = 1, so the mood term is a deterministic +1
  ctx.config.migrationNeighborhoodEconomicFeedbackScale = 2;
  w.sb.applyMigrationDrift_(ctx);
  const S = ctx.summary;
  const nm = S.neighborhoodMigration, fb = S.neighborhoodEconomyFeedback, ne = S.neighborhoodEconomies;
  check('migration ran on 22 hoods', nm && Object.keys(nm).length === 22, nm && Object.keys(nm).length);
  // mood band: Jack London (+1.56 over the median) draws the mood term; Laurel (0) does not; the map rows are identical otherwise
  check('hood ≥ median + 1.5 draws the mood drift (was a 1.15× ratio no hood could reach)', nm['Jack London'].drift > nm['Laurel'].drift,
    nm['Jack London'].drift + ' vs ' + nm['Laurel'].drift);
  check('hood 1.26 under the median (inside the band) draws no mood penalty', nm['Fruitvale'].drift === nm['Laurel'].drift,
    nm['Fruitvale'].drift + ' vs ' + nm['Laurel'].drift);
  // one decimal, no integer clobber
  const decimals = HOODS.filter(h => ne[h].mood !== Math.round(ne[h].mood));
  check('hood moods keep a decimal after migration (were rounded to integers)', decimals.length > 0, decimals.length);
  check('fed-back mood = before + delta at one decimal', HOODS.every(h => near(fb[h].afterMood, Math.round((fb[h].beforeMood + fb[h].delta) * 10) / 10, 1e-9)));
  check('descriptor on the one scale: 55–65 reads growing, not "stable"', ne['Jack London'].descriptor === 'growing' && ne['Laurel'].descriptor === 'growing',
    ne['Jack London'].descriptor + ' / ' + ne['Laurel'].descriptor);
  check('descriptor: sluggish below 45 (the 70/30 scale had no such state)', w.sb.describeHoodEconomy_(41) === 'sluggish');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
