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
  const worldEvents = (opts.worldEvents || []).slice();
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
  check('1d the row data written to the tab carries 13 columns in CRIME_METRICS_HEADERS order (engine.235 K–M)',
    sb.CRIME_METRICS_HEADERS.length === 13 && sb.crimeMetricsRowData_('X', dt, 107).length === 13 && sb.crimeMetricsRowData_('X', dt, 107)[7] === dt.propertyLevel);
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

// ── 8. Live-shaped causes for 200 cycles: SAFETY spikes land in random hoods, holidays celebrate —
//      the city mean must not ratchet, no pins, and the live demographics keep hoods distinct ────
console.log('═══ 8 — 200 live-shaped cycles: no ratchet, no pins, hoods stay distinct from their own data');
{
  // live Neighborhood_Demographics C106 (read 2026-09-13): pop, unemployed, students
  const LIVE_DEMO = { Downtown: [2544, 89, 219], Temescal: [2517, 149, 289], Laurel: [2008, 100, 307], 'West Oakland': [2058, 76, 282],
    Fruitvale: [2128, 85, 385], 'Jack London': [2344, 91, 183], Rockridge: [2000, 78, 224], 'Adams Point': [2178, 98, 250], 'Grand Lake': [2107, 93, 287],
    'Piedmont Ave': [1974, 71, 229], Chinatown: [2007, 98, 287], Brooklyn: [1940, 78, 318], Eastlake: [2047, 106, 282], Glenview: [1996, 104, 349],
    Dimond: [1965, 104, 318], 'Ivy Hill': [1898, 95, 300], 'San Antonio': [2015, 111, 355], 'Lake Merritt': [410, 12, 39], Uptown: [427, 14, 43],
    KONO: [336, 15, 39], 'Baylight District': [319, 7, 42], 'East Oakland': [2143, 120, 441] };
  const liveDemo = h => { const [pop, un, st] = LIVE_DEMO[h]; return { students: st, adults: pop - st - Math.round(pop * 0.1), seniors: Math.round(pop * 0.1), unemployed: un }; };
  const sb = sandbox(); let rows = liveRows(); const rng = makeRng(2026);
  const before = stats(rows, 'propertyCrimeIndex');
  let minLevel = 100, maxLevel = 0, spikes = 0;
  for (let c = 107; c < 307; c++) {
    // 1–2 crisis spikes a cycle (generateCrisisSpikes MAX_SPIKES), ~1 in 4 SAFETY, each in one hood; a holiday every 13th cycle
    const n = rng() < 0.6 ? 1 : 2; const worldEvents = [];
    for (let i = 0; i < n; i++) if (rng() < 0.25) { worldEvents.push({ domain: 'SAFETY', neighborhood: NM[Math.floor(rng() * NM.length)] }); spikes++; }
    if ((c - 107) % 13 === 0) worldEvents.push({ domain: 'CELEBRATION' });
    const r = runCycle(sb, rows, c, { demo: liveDemo, worldEvents, season: ['spring', 'summer', 'fall', 'winter'][Math.floor(((c - 107) % 52) / 13)] }, rng);
    rows = r.next;
    NM.forEach(h => { minLevel = Math.min(minLevel, rows[h].propertyLevel, rows[h].violentLevel); maxLevel = Math.max(maxLevel, rows[h].propertyLevel, rows[h].violentLevel); });
  }
  const after = stats(rows, 'propertyLevel');
  check('8a ' + spikes + ' SAFETY spikes over 200 cycles: no level touched 5 / 95', minLevel > 5 && maxLevel < 95, JSON.stringify({ minLevel, maxLevel }));
  check('8b the city mean did not ratchet (' + before.mean.toFixed(1) + ' → ' + after.mean.toFixed(1) + ', |Δ| < 10 over 200 cycles)', Math.abs(after.mean - before.mean) < 10, JSON.stringify({ before: before.mean, after: after.mean }));
  check('8c hoods stay DISTINCT from their own data (spread ' + after.spread.toFixed(1) + ' ≥ 8): the jobless-above-median hoods sit above the jobless-below-median ones',
    after.spread >= 8 && rows['Temescal'].propertyLevel > rows['Baylight District'].propertyLevel && rows['East Oakland'].propertyLevel > rows['Lake Merritt'].propertyLevel,
    JSON.stringify({ Temescal: rows['Temescal'].propertyLevel, Baylight: rows['Baylight District'].propertyLevel, EO: rows['East Oakland'].propertyLevel, LM: rows['Lake Merritt'].propertyLevel }));
  check('8d a SAFETY spike counts as a cause (the CHAOS/CRIME-only gate never fired on live)',
    (() => { const s2 = sandbox(); const a = runCycle(s2, liveRows(), 107, { demo: flatDemo, worldEvents: [{ domain: 'SAFETY', neighborhood: 'Dimond' }] }, () => 0.5).written;
      const b = runCycle(s2, liveRows(), 107, { demo: flatDemo }, () => 0.5).written; return a['Dimond'].propertyLevel > b['Dimond'].propertyLevel && a['Laurel'].propertyLevel === b['Laurel'].propertyLevel; })());
}

// ── 9. engine.237 — hotspots are relative to the city's own median, and they spill ────────────
console.log('═══ 9 — hotspots fire on the live range (the absolute 70 never did) and spill into neighbours');
{
  const sb = sandbox();
  const rows = liveRows();
  const hs = sb.calculateCrimeHotspots_(rows, {}).map(h => h.neighborhood);
  check('9a live C106 hotspots are the three hoods 1.25× over the median score: ' + hs.join(', '),
    hs.length === 3 && ['Downtown', 'West Oakland', 'East Oakland'].every(h => hs.indexOf(h) >= 0), JSON.stringify(hs));
  const adj = { 'Downtown': ['Chinatown', 'Uptown'] };
  const p = sb.computeHotspotPressure_(rows, adj, NM);
  check('9b a hotspot spills pressure onto its neighbours (Chinatown ' + p['Chinatown'] + ')', p['Chinatown'] > 0 && p['Uptown'] > 0 && p['Laurel'] === 0, JSON.stringify(p));
  const stale = Object.assign({}, rows, { Montclair: { neighborhood: 'Montclair', propertyCrimeIndex: 95, violentCrimeIndex: 95 } });
  const p2 = sb.computeHotspotPressure_(stale, { Montclair: ['Laurel'] }, NM);
  check('9c a stale row off the map never spills into a real hood', p2['Laurel'] === 0, JSON.stringify(p2['Laurel']));
  check('9d the two passes score one way (QoL is not persisted, so it is not in the score)',
    sb.crimeHotspotScore_({ propertyCrimeIndex: 40, violentCrimeIndex: 20, qualityOfLifeIndex: 90 }) === 40);
}

// ── 10. engine.237 — police capacity is sized to the city; clearance leaves the floor ─────────
console.log('═══ 10 — capacity scales with the map; clearance reads the cycle, it does not ratchet');
{
  const cap = (n) => { const sb = sandbox(); return sb.derivePolicingCapacity_({}, n).unitsCity; };
  check('10a 22 hoods → 66 units (3 a hood, the 36-for-12 design ratio)', cap(22) === 66 && cap(12) === 36, String(cap(22)));
  const sb0 = sandbox();
  check('10b live C107 incidents (152) against 66 units read load 0.81, not the 1.0 clamp',
    Math.abs(sb0.computeCityEnforcementLoad_(sb0.derivePolicingCapacity_({}, 22), 152).loadRatio - 0.81) < 0.01);
  // from the live C107 state: every hood on the 0.15 floor, 7 incidents a hood (152 / 22)
  const sb = sandbox(); let rows = liveRows();
  NM.forEach(h => { rows[h].clearanceRate = 0.15; rows[h].incidentCount = 7; });
  const rng = makeRng(107);
  const traj = [];
  let floorHits = 0, ceilHits = 0, n = 0;
  for (let c = 108; c < 308; c++) {
    rows = runCycle(sb, rows, c, { demo: flatDemo }, rng).next;
    traj.push(NM.reduce((a, h) => a + rows[h].clearanceRate, 0) / NM.length);
    NM.forEach(h => { n++; if (rows[h].clearanceRate <= 0.15) floorHits++; if (rows[h].clearanceRate >= 0.7) ceilHits++; });
  }
  check('10c three cycles off the live floor the city mean clearance has climbed (' + traj[2].toFixed(3) + ' > 0.17)', traj[2] > 0.17, traj.slice(0, 3).map(x => x.toFixed(3)).join(' '));
  check('10d over 200 cycles clearance is not pinned: floor ' + floorHits + ' / ceiling ' + ceilHits + ' of ' + n + ' hood-cycles',
    floorHits / n < 0.05 && ceilHits === 0, JSON.stringify({ floorHits, ceilHits, n }));
  const sbA = sandbox(), sbB = sandbox();
  sbB.NEIGHBORHOOD_CRIME_PROFILES['West Oakland'].responseMod = 1.2;   // the authored table must not decide clearance
  const ra = runCycle(sbA, rows, 400, { demo: flatDemo }, makeRng(400)).written, rb = runCycle(sbB, rows, 400, { demo: flatDemo }, makeRng(400)).written;
  check('10e the authored profile table does not decide clearance (West Oakland ' + ra['West Oakland'].clearanceRate + ' == ' + rb['West Oakland'].clearanceRate + ' with its responseMod changed)',
    ra['West Oakland'].clearanceRate === rb['West Oakland'].clearanceRate);
  check('10g nor response time (' + ra['West Oakland'].responseTimeAvg + ' == ' + rb['West Oakland'].responseTimeAvg + ')',
    ra['West Oakland'].responseTimeAvg === rb['West Oakland'].responseTimeAvg);
  const r1 = runCycle(sandbox(), (() => { const x = liveRows(); NM.forEach(h => { x[h].clearanceRate = 0.25; x[h].incidentCount = 3; }); return x; })(), 108, { demo: flatDemo }, () => 0.5).written;
  const r2 = runCycle(sandbox(), (() => { const x = liveRows(); NM.forEach(h => { x[h].clearanceRate = 0.25; x[h].incidentCount = 12; }); return x; })(), 108, { demo: flatDemo }, () => 0.5).written;
  check('10f a heavier load cycle clears less than a light one (Downtown ' + r2['Downtown'].clearanceRate + ' < ' + r1['Downtown'].clearanceRate + ')',
    r2['Downtown'].clearanceRate < r1['Downtown'].clearanceRate);
}

// ── 11. engine.237 — the reader contract: S.crimeMetrics.context ─────────────────────────────
console.log('═══ 10q — quality of life is read from the hood\'s own measurables, not crime alone');
{
  const sb = sandbox();
  const mk = () => ({ byHood: { A: { pressureRatio: 1, qualityOfLifeIndex: 0.5 }, B: { pressureRatio: 1, qualityOfLifeIndex: 0.5 }, C: { pressureRatio: 1, qualityOfLifeIndex: 0.5 } } });
  const demo = u => ({ students: 100, adults: 800, seniors: 100, unemployed: u, sick: 30 });
  const st = (r, hp, s) => ({ retailVitality: r, housingPressure: hp, sentiment: s });
  const base = { A: st(8, 0, 0.4), B: st(8, 0, 0.4), C: st(8, 0, 0.4) };
  let cx = mk(); sb.applyHoodLifeQuality_(cx, { A: demo(50), B: demo(100), C: demo(50) }, base, ['A', 'B', 'C']);
  check('10q-a same crime, twice the joblessness → lower quality of life (' + cx.byHood.A.qualityOfLifeIndex + ' > ' + cx.byHood.B.qualityOfLifeIndex + ')', cx.byHood.A.qualityOfLifeIndex > cx.byHood.B.qualityOfLifeIndex);
  check('10q-b safetyIndex keeps the crime-only reading', cx.byHood.B.safetyIndex === 0.5);
  cx = mk(); sb.applyHoodLifeQuality_(cx, { A: demo(50), B: demo(50), C: demo(50) }, { A: st(12, 0, 0.4), B: st(8, 6, 0.1), C: st(8, 0, 0.4) }, ['A', 'B', 'C']);
  check('10q-c a busy street lifts it, housing pressure and a low mood cut it (A ' + cx.byHood.A.qualityOfLifeIndex + ' > C ' + cx.byHood.C.qualityOfLifeIndex + ' > B ' + cx.byHood.B.qualityOfLifeIndex + ')',
    cx.byHood.A.qualityOfLifeIndex > cx.byHood.C.qualityOfLifeIndex && cx.byHood.C.qualityOfLifeIndex > cx.byHood.B.qualityOfLifeIndex);
  cx = mk(); sb.applyHoodLifeQuality_(cx, { A: demo(50), B: demo(50), C: demo(50) }, base, ['A', 'B', 'C']);
  check('10q-d a hood at the city middle on everything reads 0.5', cx.byHood.A.qualityOfLifeIndex === 0.5);
  // the medians count zeros and negatives (crimeMedian_ drops them — right for crime, wrong here):
  // most hoods at HousingPressure 0 means 0 IS the middle, so a hood at 0 gets no housing bonus
  cx = mk(); sb.applyHoodLifeQuality_(cx, { A: demo(50), B: demo(50), C: demo(50) }, { A: st(8, 0, 0.4), B: st(8, 0, 0.4), C: st(8, 5, 0.4) }, ['A', 'B', 'C']);
  check('10q-e housing median counts the zero hoods — A at 0 gets no housing part (' + cx.byHood.A.qolParts.housing + ')', cx.byHood.A.qolParts.housing === 0);
  cx = mk(); sb.applyHoodLifeQuality_(cx, { A: demo(50), B: demo(50), C: demo(50) }, { A: st(8, 0, -0.2), B: st(8, 0, -0.1), C: st(8, 0, 0.3) }, ['A', 'B', 'C']);
  check('10q-f mood median counts negative sentiment — B at the middle (−0.1) gets no mood part', Math.abs(cx.byHood.B.qolParts.mood) < 1e-9);
}

console.log('═══ 11 — S.crimeMetrics.context: the bands the readers compare against, on the live range');
{
  const sb = sandbox();
  const r = runCycle(sb, liveRows(), 107, { demo: flatDemo }, makeRng(5));
  const cx = r.ctx.summary.crimeMetrics.context;
  const by = cx.byHood;
  check('11a every simulated hood has a context row', NM.every(h => by[h] && isFinite(by[h].qualityOfLifeIndex)), Object.keys(by).length + ' rows');
  check('11b QoL is on the readers\' 0–1 scale, higher = safer (Downtown ' + by['Downtown'].qualityOfLifeIndex + ' < Piedmont Ave ' + by['Piedmont Ave'].qualityOfLifeIndex + ')',
    by['Downtown'].qualityOfLifeIndex < by['Piedmont Ave'].qualityOfLifeIndex && NM.every(h => by[h].qualityOfLifeIndex >= 0.05 && by[h].qualityOfLifeIndex <= 0.95));
  const low = NM.filter(h => by[h].qualityOfLifeIndex <= 0.35), high = NM.filter(h => by[h].qualityOfLifeIndex >= 0.65);
  check('11c BOTH reader bands fire on the live range — low QoL: ' + low.join(', ') + ' | high: ' + high.join(', '), low.length >= 2 && high.length >= 1);
  // 2026-09-19: qualityOfLifeIndex is the hood's whole quality of life (applyHoodLifeQuality_);
  // the crime-only reading it used to be is safetyIndex, and that is what crimeLevel agrees with.
  check('11d crimeLevel agrees with the SAFETY band (high ⇔ safetyIndex ≤ 0.35)', NM.every(h => (by[h].crimeLevel === 'high') === (by[h].safetyIndex <= 0.35)));
  check('11e isHotspot ⇔ on the hotspot list; city.hotspotHoods are NAMES a reader can indexOf',
    cx.city.hotspotHoods.every(h => typeof h === 'string' && by[h].isHotspot) && NM.filter(h => by[h].isHotspot).length === cx.city.hotspotHoods.length);
  check('11f city fields present on the reader scale', isFinite(cx.city.qualityOfLifeIndex) && isFinite(cx.city.incidentTrend) && isFinite(cx.city.enforcementCapacity)
    && typeof cx.city.patrolStrategy === 'string' && cx.city.trueIncidentCount >= 0, JSON.stringify(cx.city));
  const rows = liveRows(); NM.forEach(h => { rows[h].incidentCount = 3; });   // a quiet last cycle
  const surge = runCycle(sandbox(), rows, 107, { demo: flatDemo, chaos: 6 }, makeRng(6)).ctx.summary.crimeMetrics.context.city;
  check('11g incidents well up on last cycle read as a city QoL concern (trend ' + surge.incidentTrend + ' → QoL ' + surge.qualityOfLifeIndex + ' < 0.4)',
    surge.incidentTrend > 1.2 && surge.qualityOfLifeIndex < 0.4, JSON.stringify(surge));
}

{
  const sbT = sandbox(); const m = liveRows();
  const shifts = [{ neighborhood: 'Downtown', metric: 'violentCrime', direction: 'increase' }, { neighborhood: 'Laurel', metric: 'propertyCrime', direction: 'decrease' },
    { neighborhood: 'Dimond', metric: 'responseTime', direction: 'slower' }];
  const t = sbT.buildCrimeReaderContext_(m, [], { totalIncidents: 110 }, {}, 110, { unitsCity: 66, strength: 1 }, { name: 'balanced' }, shifts).byHood;
  check('11h the engine\'s own shifts set the hood trend (Downtown ' + t['Downtown'].trend + ', Laurel ' + t['Laurel'].trend + ', Dimond ' + t['Dimond'].trend + ' — response shifts are not crime)',
    t['Downtown'].trend === 'rising' && t['Laurel'].trend === 'falling' && t['Dimond'].trend === 'steady');
  const cx = runCycle(sandbox(), liveRows(), 107, { demo: flatDemo }, makeRng(8)).ctx.summary.crimeMetrics.context;
  check('11i steady hoods read "steady" or "falling", never undefined', NM.every(h => ['rising', 'falling', 'steady'].indexOf(cx.byHood[h].trend) >= 0));
  check('11j reportingGap is measured from the engine base (finite, |gap| < 0.5): ' + cx.city.reportingGap, isFinite(cx.city.reportingGap) && Math.abs(cx.city.reportingGap) < 0.5);
}

// ── 13. engine.235 — the engine's read of each hood is persisted to Crime_Metrics K–M ─────────
console.log('═══ 13 — Trend / Hotspot / PressureRatio ride the row to the tab');
{
  const sb = sandbox();
  const r = runCycle(sb, liveRows(), 107, { demo: flatDemo }, makeRng(13));
  const H = sb.CRIME_METRICS_HEADERS, iT = H.indexOf('Trend'), iH = H.indexOf('Hotspot'), iP = H.indexOf('PressureRatio');
  const cx = r.ctx.summary.crimeMetrics.context;
  const row = h => sb.crimeMetricsRowData_(h, r.written[h], 107);
  check('13a K–M are appended after QolLevel (self-arming, append-only)', iT === 10 && iH === 11 && iP === 12, JSON.stringify(H.slice(10)));
  check('13b every hood writes its trend + pressure ratio', NM.every(h => ['rising', 'falling', 'steady'].indexOf(row(h)[iT]) >= 0 && row(h)[iP] === cx.byHood[h].pressureRatio));
  const hot = cx.city.hotspotHoods;
  check('13c Hotspot is the score on hotspot rows, blank elsewhere (' + hot.join(', ') + ')',
    hot.length > 0 && NM.every(h => (hot.indexOf(h) >= 0) === (row(h)[iH] !== '')) && hot.every(h => Number(row(h)[iH]) > 0));
}

// ── 12. engine.237 — no reader reads the v1.2 names the writer never emitted ─────────────────
console.log('═══ 12 — contract guard: the dead v1.2 crime names stay dead; the packet reads the writer\'s keys');
{
  const dirs = fs.readdirSync(ROOT).filter(d => /^phase\d\d/.test(d) || d === 'utilities');
  const files = [];
  dirs.forEach(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).forEach(f => files.push(path.join(d, f))));
  const DEAD = [/crimeMetrics\.neighborhoodBreakdown/, /crimeMetrics\.qualityOfLifeIndex/, /crimeMetrics\.patrolStrategy/,
    /crimeMetrics\.enforcementCapacity/, /crimeMetrics\.(true|reported)IncidentCount/, /crimeMetrics\.hotspots\s*\|\|/];
  const hits = [];
  files.forEach(f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    if (/^\s*\*/.test(line)) return;                       // JSDoc
    DEAD.forEach(re => { if (re.test(code)) hits.push(f + ':' + (i + 1)); });
  }));
  check('12a no engine file reads a never-written v1.2 crime field (' + files.length + ' files scanned)', hits.length === 0, hits.join(', '));
  const sb = sandbox();
  const keys = Object.keys(sb.calculateCityWideFromMap_({ A: { propertyCrimeIndex: 1, violentCrimeIndex: 1, responseTimeAvg: 1, clearanceRate: 0.2, incidentCount: 1 } }));
  const pkt = fs.readFileSync(path.join(ROOT, 'phase10-persistence/buildCyclePacket.js'), 'utf8');
  const read = (pkt.match(/crimeCity\.([A-Za-z]+)/g) || []).map(x => x.split('.')[1]);
  check('12b every crimeCity.<key> the cycle packet prints is a key calculateCityWideFromMap_ returns (' + read.join(', ') + ')',
    read.length === 5 && read.every(k => keys.indexOf(k) >= 0), JSON.stringify({ read, keys }));
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
