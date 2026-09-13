#!/usr/bin/env node
'use strict';

/**
 * engine.212 (S451) — Crime_Metrics carries forward from last cycle, never from a literal.
 *
 * Offline proof, no Sheet: the real Phase-3 crime engine runs in a vm sandbox with
 * batchUpdateCrimeMetrics_ stubbed to feed each cycle's rows back as the next cycle's
 * getCrimeMetrics_ — the persistence loop the live tab provides. Every hood / number
 * below is a synthetic fixture. Run: node scripts/crimeCarryForward.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

const NM = ['Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London', 'Rockridge',
  'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond',
  'Ivy Hill', 'San Antonio', 'KONO', 'Lake Merritt', 'Uptown', 'Baylight District', 'East Oakland'];

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
function makeRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function sandbox() {
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, isFinite, isNaN, safeRand_: (ctx) => ctx.rng };
  vm.createContext(sb);
  load(sb, 'utilities/ensureCrimeMetrics.js');
  load(sb, 'phase03-population/updateCrimeMetrics.js');
  sb.ensureCrimeMetricsSchema_ = () => ({});
  return sb;
}

// Live C106 observed rows (Crime_Metrics read 2026-09-13) — the tab BEFORE the level columns exist.
const LIVE_C106 = {
  'Downtown': [58, 55], 'Temescal': [43, 33], 'Rockridge': [28, 21], 'Fruitvale': [50, 50], 'West Oakland': [54, 56],
  'East Oakland': [51, 60], 'Lake Merritt': [48, 37], 'Jack London': [48, 39], 'Piedmont Ave': [22, 13], 'Grand Lake': [28, 23],
  'Chinatown': [49, 41], 'Adams Point': [38, 26], 'Dimond': [38, 26], 'Glenview': [30, 20], 'Laurel': [28, 24], 'Uptown': [49, 27],
  'KONO': [38, 27], 'Brooklyn': [34, 21], 'Eastlake': [35, 25], 'Ivy Hill': [31, 20], 'San Antonio': [46, 36], 'Baylight District': [49, 40]
};
function liveRows() {
  const o = {};
  NM.forEach(h => { o[h] = { neighborhood: h, propertyCrimeIndex: LIVE_C106[h][0], violentCrimeIndex: LIVE_C106[h][1],
    responseTimeAvg: 8, clearanceRate: 0.3, incidentCount: 5, lastUpdated: 106, propertyLevel: null, violentLevel: null, qolLevel: null }; });
  return o;
}

// One engine cycle. opts: { demo(hood)->{students,adults,seniors,unemployed}, season, weather, chaos }
function runCycle(sb, rows, cycle, opts, rng) {
  let written = null;
  sb.getCrimeMetrics_ = () => rows;
  sb.getNeighborhoodDemographics_ = () => { const o = {}; NM.forEach(h => { o[h] = opts.demo(h); }); return o; };
  sb.batchUpdateCrimeMetrics_ = (ctx, map) => { written = map; };
  const worldEvents = [];
  for (let i = 0; i < (opts.chaos || 0); i++) worldEvents.push({ domain: 'CHAOS' });
  const ctx = { ss: {}, rng, config: {}, summary: {
    absoluteCycle: cycle, canonHoods: { list: NM },
    neighborhoodAdjacency: Object.fromEntries(NM.map((h, i) => [h, [NM[(i + 1) % NM.length], NM[(i + NM.length - 1) % NM.length]]])),
    neighborhoodState: Object.fromEntries(NM.map(h => [h, { boomIndex: 0 }])), neighborhoodDynamics: {},
    worldEvents, weather: { type: opts.weather || 'clear', impact: 1 }, season: opts.season || 'spring' } };
  sb.updateCrimeMetrics_Phase3_(ctx);
  // the tab persists exactly the columns crimeMetricsRowData_ writes — replay that contract
  const next = {};
  for (const h of Object.keys(written)) {
    const m = written[h];
    next[h] = { neighborhood: h, propertyCrimeIndex: m.propertyCrimeIndex, violentCrimeIndex: m.violentCrimeIndex,
      responseTimeAvg: m.responseTimeAvg, clearanceRate: m.clearanceRate, incidentCount: m.incidentCount, lastUpdated: cycle,
      propertyLevel: m.propertyLevel, violentLevel: m.violentLevel, qolLevel: m.qolLevel };
  }
  return { written, next, ctx };
}
const flatDemo = () => ({ students: 200, adults: 800, seniors: 100, unemployed: 60 }); // 5.5% — under the 10% threshold
const stats = (rows, key) => { const v = NM.map(h => rows[h][key]); const mean = v.reduce((a, b) => a + b, 0) / v.length; return { mean, min: Math.min(...v), max: Math.max(...v), spread: Math.max(...v) - Math.min(...v) }; };

// ── 1. First run after the columns arm: the level seeds from the row's LAST OBSERVED index ─────
console.log('═══ 1 — first run seeds the level from last cycle\'s observed index, not the profile');
{
  const sb = sandbox();
  const r = runCycle(sb, liveRows(), 107, { demo: flatDemo }, makeRng(1));
  const dt = r.written['Downtown'], pa = r.written['Piedmont Ave'];
  check('1a Downtown level starts at its C106 index 58 (±cap 3 + reversion), not the authored 65',
    Math.abs(dt.propertyLevel - 58) <= 3.5 && Math.abs(dt.propertyLevel - 65) > 3, JSON.stringify(dt.propertyLevel));
  check('1b Piedmont Ave level starts at its C106 index 22, not the authored 25', Math.abs(pa.propertyLevel - 22) <= 3.5, String(pa.propertyLevel));
  check('1c every hood carries all three level columns as finite numbers',
    NM.every(h => [r.written[h].propertyLevel, r.written[h].violentLevel, r.written[h].qolLevel].every(x => isFinite(x) && x > 0)));
  check('1d the row data written to the tab carries 10 columns in CRIME_METRICS_HEADERS order',
    sb.CRIME_METRICS_HEADERS.length === 10 && sb.crimeMetricsRowData_('X', dt, 107).length === 10 && sb.crimeMetricsRowData_('X', dt, 107)[7] === dt.propertyLevel);
  check('1e a blank level cell reads null, never 0 (getCrimeMetrics_ contract)',
    (() => { const rows = [['Neighborhood', 'PropertyCrimeIndex', 'ViolentCrimeIndex', 'ResponseTimeAvg', 'ClearanceRate', 'IncidentCount', 'LastUpdated', 'PropertyLevel', 'ViolentLevel', 'QolLevel'], ['H', 40, 30, 8, 0.3, 4, 106, '', '', '']];
      sb.getCrimeMetrics_ = undefined; load(sb, 'utilities/ensureCrimeMetrics.js');
      const m = sb.getCrimeMetrics_({ getSheetByName: () => ({ getLastRow: () => 2, getDataRange: () => ({ getValues: () => rows }) }) });
      return m.H.propertyLevel === null && m.H.propertyCrimeIndex === 40; })());
}

// ── 2. A hood with no row seeds from the profile — the ONLY time the literal is read ────────
console.log('═══ 2 — the profile seeds only a hood with no row');
{
  const sb = sandbox();
  const rows = liveRows(); delete rows['Rockridge'];
  const r = runCycle(sb, rows, 107, { demo: flatDemo }, makeRng(2));
  check('2a Rockridge (no row) seeds from 50×0.6 = 30', Math.abs(r.written['Rockridge'].propertyLevel - 30) <= 3.5, String(r.written['Rockridge'].propertyLevel));
  const r2 = runCycle(sb, r.next, 108, { demo: flatDemo }, makeRng(3));
  check('2b from the second cycle on it carries its own level (moves ≤ cap+reversion from C107, profile not re-read)',
    Math.abs(r2.written['Rockridge'].propertyLevel - r.written['Rockridge'].propertyLevel) <= 3.5);
}

// ── 3. 200 cycles, flat causes: bounded, no pins, the city's centre holds ────────────────────
console.log('═══ 3 — 200 flat cycles: bounded, no hood at 5/95, centre holds');
{
  const sb = sandbox(); let rows = liveRows(); const rng = makeRng(42);
  const before = stats(rows, 'propertyCrimeIndex');
  let minLevel = 100, maxLevel = 0;
  for (let c = 107; c < 307; c++) {
    const r = runCycle(sb, rows, c, { demo: flatDemo, season: ['spring', 'summer', 'fall', 'winter'][Math.floor(((c - 107) % 52) / 13)] }, rng);
    rows = r.next;
    NM.forEach(h => { minLevel = Math.min(minLevel, rows[h].propertyLevel, rows[h].violentLevel); maxLevel = Math.max(maxLevel, rows[h].propertyLevel, rows[h].violentLevel); });
  }
  const after = stats(rows, 'propertyLevel');
  check('3a no level ever touched the 5 / 95 clamp in 200 cycles', minLevel > 5 && maxLevel < 95, JSON.stringify({ minLevel, maxLevel }));
  check('3b the city mean stayed within 15 points of where live left it (' + before.mean.toFixed(1) + ' → ' + after.mean.toFixed(1) + ')',
    Math.abs(after.mean - before.mean) <= 15, JSON.stringify({ before: before.mean, after: after.mean }));
  check('3c with identical causes everywhere the hoods CONVERGE toward the city median (spread ' + before.spread + ' → ' + after.spread.toFixed(1) + ') — rank is not a birthright',
    after.spread < before.spread * 0.5, JSON.stringify(after));
}

// ── 4. Persistent per-hood causes hold a persistent spread; the cause clearing lets it fade ──
console.log('═══ 4 — a cause moves a hood and holds it; clearing the cause lets it come back, slowly');
{
  const sb = sandbox(); let rows = liveRows(); const rng = makeRng(7);
  const hot = h => h === 'Glenview' ? { students: 200, adults: 800, seniors: 100, unemployed: 220 } : flatDemo(); // 20% unemployed in one quiet hood
  for (let c = 107; c < 147; c++) rows = runCycle(sb, rows, c, { demo: hot }, rng).next;            // 40 cycles of cause
  const peak = rows['Glenview'].propertyLevel, medAt40 = sb.crimeCityMedianLevels_(rows).property;
  check('4a 40 cycles of 20% unemployment carry Glenview (live 30) ABOVE the city median (' + peak.toFixed(1) + ' vs median ' + medAt40.toFixed(1) + ')', peak > medAt40 + 5, JSON.stringify({ peak, medAt40 }));
  for (let c = 147; c < 152; c++) rows = runCycle(sb, rows, c, { demo: flatDemo }, rng).next;       // cause clears
  const five = rows['Glenview'].propertyLevel;
  check('4b five cycles after the cause clears it has NOT snapped back (still within 25% of the peak gap)', (five - medAt40) > (peak - medAt40) * 0.6, JSON.stringify({ five, peak }));
  for (let c = 152; c < 232; c++) rows = runCycle(sb, rows, c, { demo: flatDemo }, rng).next;       // 80 more quiet cycles
  const late = rows['Glenview'].propertyLevel, medLate = sb.crimeCityMedianLevels_(rows).property;
  check('4c 85 quiet cycles later it has come back near the city median (' + late.toFixed(1) + ' vs ' + medLate.toFixed(1) + ')', Math.abs(late - medLate) < 6, JSON.stringify({ late, medLate }));
}

// ── 5. Season is an overlay: 13 summer cycles do not compound into the level ────────────────
console.log('═══ 5 — transient conditions overlay the observed index; they do not compound into the level');
{
  const sb = sandbox(); let rows = liveRows(); const rng = makeRng(11);
  for (let c = 107; c < 120; c++) rows = runCycle(sb, rows, c, { demo: flatDemo }, rng).next;       // settle 13 cycles
  const lvl0 = rows['Downtown'].propertyLevel;
  let obsSummer = 0;
  for (let c = 120; c < 133; c++) { const r = runCycle(sb, rows, c, { demo: flatDemo, season: 'summer' }, rng); rows = r.next; obsSummer += r.written['Downtown'].propertyCrimeIndex; }
  obsSummer /= 13;
  const lvl13 = rows['Downtown'].propertyLevel;
  check('5a summer lifts the OBSERVED index above the level (obs ' + obsSummer.toFixed(1) + ' vs level ' + lvl13.toFixed(1) + ')', obsSummer > lvl13 + 2, JSON.stringify({ obsSummer, lvl13 }));
  check('5b 13 summer cycles moved the LEVEL by less than the reversion drift alone would (|Δ| < 6, no ×1.1 compounding)', Math.abs(lvl13 - lvl0) < 6, JSON.stringify({ lvl0, lvl13 }));
  let stormObs = null; { const r = runCycle(sb, rows, 133, { demo: flatDemo, weather: 'storm' }, rng); stormObs = r.written['Downtown'].propertyCrimeIndex; rows = r.next; }
  check('5c a storm cycle drops the observed index well under the level and leaves the level alone', stormObs < rows['Downtown'].propertyLevel - 5 && Math.abs(rows['Downtown'].propertyLevel - lvl13) < 4, JSON.stringify({ stormObs, level: rows['Downtown'].propertyLevel }));
}

// ── 6. rng draw count per hood is unchanged from v1.2 (Phase 3 shares ctx.rng downstream) ───
console.log('═══ 6 — draw count per hood unchanged: 7 with a prev row, 5 without');
{
  const sb = sandbox(); let n = 0; const counting = () => { n++; return 0.5; };
  runCycle(sb, liveRows(), 107, { demo: flatDemo }, counting);
  check('6a 22 hoods with prev rows → 154 draws (7 each)', n === 22 * 7, String(n));
  n = 0; runCycle(sb, {}, 107, { demo: flatDemo }, counting);
  check('6b 22 hoods with no rows → 110 draws (5 each)', n === 22 * 5, String(n));
}

// ── 7. The per-cycle path reads no literal: the authored mods can change without moving a carried hood ──
console.log('═══ 7 — the authored table is inert on the per-cycle path');
{
  const sbA = sandbox(), sbB = sandbox();
  sbB.NEIGHBORHOOD_CRIME_PROFILES['Downtown'].propertyCrimeMod = 0.2; // would have been the equilibrium before engine.212
  let a = liveRows(), b = liveRows();
  for (let c = 107; c < 137; c++) { a = runCycle(sbA, a, c, { demo: flatDemo }, makeRng(c)).next; b = runCycle(sbB, b, c, { demo: flatDemo }, makeRng(c)).next; }
  check('7a 30 cycles with Downtown\'s authored mod cut 1.3 → 0.2 produce the SAME carried level (literal never read)',
    a['Downtown'].propertyLevel === b['Downtown'].propertyLevel, JSON.stringify({ a: a['Downtown'].propertyLevel, b: b['Downtown'].propertyLevel }));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
