#!/usr/bin/env node
'use strict';

/**
 * engine.134 — hood-identity remainder (Tasks 4–7, S423).
 *
 * Every remaining engine copy of "what this neighborhood is" reads the ledger:
 *   - crime iterates the Neighborhood_Map SET (S.canonHoods), profiles authored
 *     from INSTITUTIONS canon, a derived default for a hood with no profile;
 *   - evening food names come from the live Business_Ledger, never a pool;
 *   - Opening Day athlete sightings follow S.sportsZones when set.
 * Tasks 2–3 (economicRippleEngine.js fold + economy keys) ride with engine.131
 * T7 (ruled option 2, builder 2026-09-05) — covered below.
 *
 * Plan: docs/plans/2026-08-30-hood-identity-remainder-plan.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

const NM = ['Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London', 'Rockridge',
  'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond',
  'Ivy Hill', 'San Antonio', 'KONO', 'Lake Merritt', 'Uptown', 'Baylight District', 'East Oakland'];
assert.strictEqual(NM.length, 22);

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
// mulberry32 — reproducible and well-mixed on the very first draw
function makeRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── Task 4: crime ─────────────────────────────────────────────────────────
console.log('═══ Task 4 — crime iterates the Neighborhood_Map set');
{
  const logs = [];
  const sb = { Logger: { log: (m) => logs.push(String(m)) }, Math, Object, Array, Number, String, JSON, isFinite, isNaN, safeRand_: (ctx) => ctx.rng };
  vm.createContext(sb);
  load(sb, 'utilities/ensureCrimeMetrics.js');
  load(sb, 'phase03-population/updateCrimeMetrics.js');

  const P = sb.NEIGHBORHOOD_CRIME_PROFILES;
  check('T4a Montclair has no profile', !P.Montclair);
  check('T4b every Neighborhood_Map hood has an authored profile', NM.every(h => P[h]), NM.filter(h => !P[h]).join(','));
  check('T4c no 2026 strife labels survive', !Object.keys(P).some(h => /underserved|gentrifying/i.test(P[h].character)));
  check('T4d iteration set = canonHoods.list when seeded',
    JSON.stringify(sb.crimeIterationHoods_({ canonHoods: { list: NM } })) === JSON.stringify(NM));
  check('T4e iteration set falls to profile keys only when unseeded',
    sb.crimeIterationHoods_({}).length === Object.keys(P).length);
  const d1 = sb.crimeProfileFor_('New Place', { neighborhoodState: { 'New Place': { boomIndex: 1 } } });
  const d0 = sb.crimeProfileFor_('New Place', { neighborhoodState: { 'New Place': { boomIndex: null } } });
  check('T4f derived default from boom index (boom 1 → quieter)', d1.derived && d1.propertyCrimeMod === 0.8 && d1.violentCrimeMod === 0.6 && d1.baseIncidents === 3, JSON.stringify(d1));
  check('T4g derived default reads a blank boom as flat', d0.propertyCrimeMod === 1.0 && d0.violentCrimeMod === 0.8 && d0.baseIncidents === 5, JSON.stringify(d0));
  check('T4h authored profile wins over derivation', sb.crimeProfileFor_('Temescal', {}) === P.Temescal);

  // End-to-end: Phase 3 writes one metrics row per canon hood, nothing for ghosts.
  let written = null;
  sb.ensureCrimeMetricsSchema_ = () => ({});
  sb.getCrimeMetrics_ = () => ({ Montclair: { incidentCount: 4 }, Downtown: { incidentCount: 12 } });
  sb.getNeighborhoodDemographics_ = () => { const o = {}; NM.forEach(h => { o[h] = { students: 200, adults: 800, seniors: 100, unemployed: 40 }; }); return o; };
  sb.batchUpdateCrimeMetrics_ = (ctx, map) => { written = map; };
  const ns = {}; NM.forEach(h => { ns[h] = { boomIndex: 0.2 }; });
  const ctx = { ss: {}, rng: makeRng(7), config: {}, summary: {
    absoluteCycle: 106, canonHoods: { list: NM }, neighborhoodState: ns, neighborhoodDynamics: {}, worldEvents: [], weather: { type: 'clear', impact: 1 } } };
  let threw = null;
  try { sb.updateCrimeMetrics_Phase3_(ctx); } catch (e) { threw = e; }
  check('T4i Phase 3 runs on the 22-hood set', !threw, threw && threw.stack);
  check('T4j one metrics row per Neighborhood_Map hood', written && Object.keys(written).length === 22 && NM.every(h => written[h]), written && Object.keys(written).join(','));
  check('T4k Montclair (ghost) is not written', written && !written.Montclair);
  check('T4l the five formerly-missing hoods carry numbers',
    written && ['Brooklyn', 'Baylight District', 'Eastlake', 'Ivy Hill', 'San Antonio'].every(h => typeof written[h].incidentCount === 'number'));
  check('T4m S.crimeMetrics.byNeighborhood keyed on the same set', ctx.summary.crimeMetrics && Object.keys(ctx.summary.crimeMetrics.byNeighborhood).length === 22);
}

// ── Task 5: evening food from the Business_Ledger ─────────────────────────
console.log('═══ Task 5 — evening food names come from the Business_Ledger');
{
  const BL_HEADER = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood'];
  const BL = [
    ['BIZ-1', 'Harborline Grill', 'Restaurant & Dining', 'Jack London'],
    ['BIZ-2', 'Ninth Street Kitchen', 'Restaurant & Dining', 'Chinatown'],
    ['BIZ-3', 'Heritage Bakehouse', 'Food & Beverage', 'Chinatown'],
    ['BIZ-4', 'Glenview Cafe', 'Cafe / dining', 'Glenview'],
    ['BIZ-5', 'Green & Gold Tavern', 'Sports Bar & Dining', 'Jack London'],
    ['BIZ-6', 'The Northgate Bar', 'Nightlife & Entertainment', 'KONO'],
    ['BIZ-7', 'SpeedyBurger', 'Fast Food & Quick Service', 'Downtown'],
    ['BIZ-8', 'Dollar Pho', 'Services', 'Fruitvale'],          // wrong sector: must never be served
    ['BIZ-9', 'Civis Systems', 'Urban Systems Intelligence Firm', 'West Oakland']
  ];
  const ssOf = (rows) => ({ getSheetByName: (n) => n === 'Business_Ledger' ? ({ getLastRow: () => rows.length + 1, getDataRange: () => ({ getValues: () => [BL_HEADER].concat(rows) }) }) : null });
  const mk = (rows, summary, seed) => {
    const sb = { Logger: { log() {} }, Math, Object, Array, Number, String, JSON, RegExp, safeRand_: () => makeRng(seed || 3) };
    vm.createContext(sb);
    load(sb, 'phase07-evening-media/buildEveningFood.js');
    const ctx = { ss: ssOf(rows), summary: Object.assign({ nightlifeVolume: 5, economicMood: 50 }, summary || {}) };
    sb.buildEveningFood_(ctx);
    return ctx.summary.eveningFood;
  };
  const ledgerNames = new Set(BL.filter(r => r[2] !== 'Services' && !/Urban Systems/.test(r[2])).map(r => r[1]));

  const src = fs.readFileSync(path.join(ROOT, 'phase07-evening-media/buildEveningFood.js'), 'utf8');
  check('T5a the invented pools are gone from the file', !/Dollar Pho|Value Eats|Budget Bites|Crisis Coffee|Lucky Dim Sum|Golden Dragon/.test(src));

  let allIn = true, sawDollar = false, sawNames = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const f = mk(BL, { holiday: 'none' }, seed);
    f.restaurants.forEach(n => { sawNames++; if (!ledgerNames.has(n)) allIn = false; if (n === 'Dollar Pho') sawDollar = true; });
    f.fast.forEach(n => { if (n !== 'SpeedyBurger') allIn = false; });
  }
  check('T5b every served name is a ledger food/nightlife row (40 seeds)', allIn && sawNames > 0);
  check('T5c a mis-sectored name is never served', !sawDollar);
  const f1 = mk(BL, { holiday: 'none' }, 5);
  check('T5d details carry bizId + neighborhood', f1.restaurantDetails.every(d => d.bizId && d.neighborhood));
  check('T5e fast comes from the quick-service rows only', f1.fast.length === 1 && f1.fast[0] === 'SpeedyBurger');
  const empty = mk([['BIZ-9', 'Civis Systems', 'Urban Systems Intelligence Firm', 'West Oakland']], {}, 2);
  check('T5f a ledger with no food rows serves nothing, invents nothing', empty.restaurants.length === 0 && empty.fast.length === 0 && typeof empty.trend === 'string');
  // Lunar New Year leans on Chinatown: across seeds Chinatown must be served more often than under 'none'.
  const countHood = (holiday) => { let c = 0; for (let s = 1; s <= 60; s++) mk(BL, { holiday }, s).restaurantDetails.forEach(d => { if (d.neighborhood === 'Chinatown') c++; }); return c; };
  check('T5g Lunar New Year leans the draw toward Chinatown', countHood('LunarNewYear') > countHood('none'));
  // First Friday lean is ledger-derived (employerCharacter), not a hood literal
  const ff = mk(BL, { isFirstFriday: true, neighborhoodState: { KONO: { employerCharacter: 'arts' } } }, 9);
  check('T5h First Friday adds the nightlife rows and still stays on the ledger', ff.restaurants.every(n => ledgerNames.has(n)) && ff.restaurants.length === 3);
  const noBL = (() => { const sb = { Logger: { log() {} }, Math, Object, Array, Number, String, JSON, RegExp, safeRand_: () => makeRng(1) }; vm.createContext(sb); load(sb, 'phase07-evening-media/buildEveningFood.js'); const ctx = { ss: { getSheetByName: () => { throw new Error('boom'); } }, summary: {} }; sb.buildEveningFood_(ctx); return ctx.summary.eveningFood; })();
  check('T5i ledger read failure is fail-soft (empty lists, shape intact)', noBL && noBL.restaurants.length === 0 && Array.isArray(noBL.fast));
}

// ── Task 6: athlete sightings follow S.sportsZones ────────────────────────
console.log('═══ Task 6 — athlete sightings follow the sports zone');
{
  const sb = { Logger: { log() {} }, Math, Object, Array, Number, String, JSON };
  vm.createContext(sb);
  load(sb, 'phase07-evening-media/buildEveningFamous.js');
  const pick = sb.pickAthleteSightingHood_;
  check('T6a sportsZones set → picks from it', pick({ sportsZones: ['Baylight District'] }, makeRng(4)) === 'Baylight District');
  const two = new Set(); for (let s = 1; s <= 30; s++) two.add(pick({ sportsZones: ['Baylight District', 'Jack London'] }, makeRng(s)));
  check('T6b two zones → both reachable', two.has('Baylight District') && two.has('Jack London'));
  const dark = new Set(); for (let s = 1; s <= 30; s++) dark.add(pick({ sportsZones: [] }, makeRng(s)));
  check('T6c empty zones (T7 dark) → Jack London / Downtown fallback only', [...dark].every(h => h === 'Jack London' || h === 'Downtown') && dark.size === 2);
  check('T6d no sportsZones field at all → same fallback', ['Jack London', 'Downtown'].indexOf(pick({}, makeRng(2))) !== -1);
}

// ── Tasks 2–3: the economy engine reads the ledger set ────────────────────
console.log('═══ Tasks 2–3 — fold + economy blob from Neighborhood_Map B1');
{
  const sb = { Logger: { log() {} }, Math, Object, Array, Number, String, JSON, isFinite, isNaN, Date };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  const src = fs.readFileSync(path.join(ROOT, 'phase06-analysis/economicRippleEngine.js'), 'utf8');
  check('T2a NEIGHBORHOOD_ECONOMIES literal is gone', !/var NEIGHBORHOOD_ECONOMIES\s*=/.test(src));
  check('T2a2 no child-fold literal left in the economy engine', !/Old Oakland/.test(src));
  const ns = {}; NM.forEach(h => { ns[h] = { employerCharacter: 'residential', boomIndex: 0 }; });
  ns['KONO'].employerCharacter = 'arts'; ns['Jack London'].employerCharacter = 'nightlife'; ns['Temescal'].employerCharacter = 'clinic'; ns['Temescal'].boomIndex = -0.7; ns['Baylight District'].employerCharacter = 'stadium'; ns['Baylight District'].boomIndex = 1;
  // engine.99 #9 — the Phase-1 seed built from a Neighborhood_Map fixture WITH a ChildAreas column
  const header = ['Neighborhood', 'CoreSimRank', 'District', 'ChildAreas'];
  const childOf = { 'Downtown': 'Old Oakland, City Center', 'Jack London': 'Jack London Square, Brooklyn Basin', 'Temescal': 'Telegraph corridor', 'East Oakland': 'Coliseum, Elmhurst', 'Piedmont Ave': 'Montclair, Downtown' /* a hood named as a child is ignored */ };
  const values = [header].concat(NM.map((h, i) => [h, i + 1, 'D1', childOf[h] || '']));
  const seedCtx = { summary: {}, ss: { getSheetByName: (n) => n === 'Neighborhood_Map' ? ({ getDataRange: () => ({ getValues: () => values }) }) : null } };
  sb.loadCanonNeighborhoods_(seedCtx);
  const CH = seedCtx.summary.canonHoods;
  check('T2c loader seeds children from ChildAreas (8 child areas; a hood named as a child is ignored)', CH.childList.length === 8 && CH.children['montclair'] === 'Piedmont Ave' && CH.children['downtown'] === undefined, JSON.stringify(CH.childList));
  const S = Object.assign({ neighborhoodState: ns }, { canonHoods: CH });
  const fold = (n) => sb.mapToCanonicalNeighborhood_(n, { summary: S });
  const cases = { 'Old Oakland': 'Downtown', 'Telegraph corridor': 'Temescal', 'Brooklyn Basin': 'Jack London', 'Coliseum': 'East Oakland', 'Montclair': 'Piedmont Ave', 'City-wide': null, 'Uptown': 'Uptown', 'KONO': 'KONO', 'Brooklyn': 'Brooklyn', 'Glenview': 'Glenview', 'Piedmont Ave': 'Piedmont Ave', 'Piedmont Avenue': null, 'Bridgeport': null, 'piedmont ave': 'Piedmont Ave', 'OLD OAKLAND': 'Downtown', '': null };
  const bad = Object.keys(cases).filter(k => fold(k) !== cases[k]).map(k => k + '→' + fold(k));
  check('T2b ledger child-fold then identity, no substring matching (' + Object.keys(cases).length + ' cases)', bad.length === 0, bad.join(' '));
  let threw = false; try { sb.resolveHoodOrChild_({ summary: {} }, 'Downtown'); } catch (e) { threw = /not seeded/.test(e.message); }
  check('T2d accessor throws unseeded (ADR-0016 wall)', threw);
  const ctx = { summary: Object.assign({ economicRipples: [], economicMood: 50 }, S), economicCalendarContext: { holiday: 'none', isFirstFriday: true, sportsSeason: 'championship', sportsZones: ['Baylight District'] } };
  sb.calculateNeighborhoodEconomies_(ctx);
  const E = ctx.summary.neighborhoodEconomies;
  check('T3a economy blob has exactly the 22 Neighborhood_Map keys', Object.keys(E).length === 22 && NM.every(h => E[h]) && !E.Montclair, Object.keys(E).join(','));
  check('T3b sectors come from employerCharacter (stadium → entertainment-led; clinic → healthcare-led)', E['Baylight District'].sectors[0] === 'entertainment' && E['Temescal'].sectors[0] === 'healthcare');
  check('T3c First Friday lifts arts/nightlife hoods by label, not by name', E['KONO'].mood === 53 && E['Jack London'].mood === 53 && E['Rockridge'].mood === 50, JSON.stringify([E.KONO.mood, E['Jack London'].mood, E.Rockridge.mood]));
  check('T3d championship bonus lands on the sports zone only', E['Baylight District'].mood === 58 && E['Baylight District'].isSportsZone === true && E['Downtown'].isSportsZone === false, JSON.stringify([E['Baylight District'].mood, E.Downtown.mood]));
  const dark = { summary: Object.assign({ economicRipples: [], economicMood: 50 }, S), economicCalendarContext: { holiday: 'none', sportsSeason: 'championship', sportsZones: [] } };
  sb.calculateNeighborhoodEconomies_(dark);
  check('T3e T7 dark (empty zones) → no sports bonus anywhere', NM.every(h => dark.summary.neighborhoodEconomies[h].mood === 50));
}

// ── Task 7: orphaned ctx publications are gone ────────────────────────────
console.log('═══ Task 7 — orphaned weight publications retired');
{
  const src = fs.readFileSync(path.join(ROOT, 'phase03-population/updateNeighborhoodDemographics.js'), 'utf8');
  check('T7a S.neighborhoodEmploymentWeights is no longer written', !/S\.neighborhoodEmploymentWeights\s*=/.test(src));
  check('T7b S.neighborhoodIllnessWeights is no longer written', !/S\.neighborhoodIllnessWeights\s*=/.test(src));
}

console.log('\n' + passed + '/' + (passed + failed) + ' passed');
process.exit(failed ? 1 : 0);
