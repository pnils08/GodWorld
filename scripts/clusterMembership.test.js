#!/usr/bin/env node
'use strict';

/**
 * engine.214 (S458) — every hood on Neighborhood_Map gets its own dynamics track.
 *
 * Offline proof, no Sheet: the real Phase-1 loader and the real Phase-2 applyCityDynamics_
 * run in a vm sandbox against the live 22-row Neighborhood_Map (District + Adjacent,
 * read 2026-09-14). Pre-fix (`c37d85ea`) the CLUSTERS literal seats twelve hoods, so
 * S.neighborhoodDynamics carries 12 keys and the other ten ride the city scalar in the
 * Phase-8 writer. Run: node scripts/clusterMembership.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

// Live Neighborhood_Map, sheet row order: [Neighborhood, District, Adjacent]
const MAP = [
  ['Downtown', 'D2', 'Uptown, Chinatown, Lake Merritt, Jack London, West Oakland'],
  ['Temescal', 'D7', 'Uptown, KONO, Rockridge, Piedmont Ave'],
  ['Laurel', 'D9', 'Fruitvale, Dimond, East Oakland'],
  ['West Oakland', 'D1', 'Jack London, Downtown, Uptown, Baylight District'],
  ['Fruitvale', 'D3', 'San Antonio, Dimond, Laurel, East Oakland, Ivy Hill'],
  ['Jack London', 'D2', 'Downtown, West Oakland, Chinatown, Brooklyn, Baylight District'],
  ['Rockridge', 'D7', 'Temescal, Piedmont Ave'],
  ['Adams Point', 'D8', 'Lake Merritt, Grand Lake, Piedmont Ave, Uptown'],
  ['Grand Lake', 'D8', 'Lake Merritt, Adams Point, Eastlake, Glenview, Piedmont Ave'],
  ['Piedmont Ave', 'D6', 'KONO, Adams Point, Grand Lake, Rockridge, Glenview, Temescal'],
  ['Chinatown', 'D2', 'Downtown, Lake Merritt, Jack London, Eastlake'],
  ['Brooklyn', 'D1', 'Jack London, Eastlake, San Antonio'],
  ['Eastlake', 'D8', 'Lake Merritt, Chinatown, Brooklyn, San Antonio, Grand Lake'],
  ['Glenview', 'D4', 'Dimond, Ivy Hill, Grand Lake, Piedmont Ave'],
  ['Dimond', 'D4', 'Laurel, Fruitvale, Glenview, Ivy Hill'],
  ['Ivy Hill', 'D4', 'San Antonio, Dimond, Glenview, Fruitvale'],
  ['San Antonio', 'D3', 'Eastlake, Brooklyn, Fruitvale, Ivy Hill'],
  ['KONO', 'D7', 'Uptown, Temescal, Lake Merritt, Piedmont Ave'],
  ['Lake Merritt', 'D8', 'Downtown, Uptown, KONO, Chinatown, Adams Point, Grand Lake, Eastlake'],
  ['Uptown', 'D9', 'Downtown, KONO, Temescal, Lake Merritt, West Oakland, Adams Point'],
  ['Baylight District', 'D5', 'West Oakland, Jack London'],
  ['East Oakland', 'D5', 'Fruitvale, Laurel']
];
const ALL = MAP.map(r => r[0]);

// What the live map resolves to (anchors first, then joiners in sheet row order).
const EXPECTED = {
  DOWNTOWN_CORE: ['Downtown', 'Uptown', 'KONO', 'Chinatown'],
  WATERFRONT_WEST: ['Jack London', 'West Oakland', 'Brooklyn', 'Baylight District'],
  LAKE_CORRIDOR: ['Lake Merritt', 'Piedmont Ave', 'Adams Point', 'Grand Lake', 'Eastlake', 'Glenview'],
  NORTH_HILLS: ['Rockridge', 'Temescal'],
  EAST_OAKLAND: ['Fruitvale', 'Laurel', 'Dimond', 'Ivy Hill', 'San Antonio', 'East Oakland']
};

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

function sandbox() {
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, isFinite, isNaN, Error };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase02-world-state/applyCityDynamics.js');
  return sb;
}

function sheetFrom(rows) {
  const values = [['Neighborhood', 'District', 'Adjacent']].concat(rows);
  return { getDataRange: () => ({ getValues: () => values.map(r => r.slice()) }) };
}

// One Phase-1 + Phase-2 pass. opts.map overrides the fixture; opts.prev seeds last cycle's dynamics.
function run(sb, opts) {
  opts = opts || {};
  const sheet = sheetFrom(opts.map || MAP);
  const ctx = {
    ss: { getSheetByName: (n) => (n === 'Neighborhood_Map' ? sheet : null) },
    config: {},
    summary: { season: 'Spring', weather: { type: 'clear', impact: 1 }, sportsSeason: 'off-season',
      previousCycleState: opts.prev ? { neighborhoodDynamics: opts.prev } : undefined }
  };
  sb.loadCanonNeighborhoods_(ctx);
  sb.applyCityDynamics_(ctx);
  return ctx.summary;
}

console.log('T1 every hood on the map carries its own dynamics track');
{
  const S = run(sandbox());
  const keys = Object.keys(S.neighborhoodDynamics || {});
  check('22 of 22 hoods in S.neighborhoodDynamics', keys.length === 22, keys.length + ' keys: ' + keys.join(', '));
  const missing = ALL.filter(h => !S.neighborhoodDynamics[h]);
  check('no hood rides the city scalar', missing.length === 0, 'missing: ' + missing.join(', '));
  for (const h of ALL) {
    const nd = S.neighborhoodDynamics[h] || {};
    if (!isFinite(nd.sentiment) || !isFinite(nd.retail)) { check('finite dynamics for ' + h, false); }
  }
}

console.log('T2 membership is the sheet-derived table, anchors first');
{
  const S = run(sandbox());
  for (const ck of Object.keys(EXPECTED)) {
    const got = (S.clusterDefinitions[ck] || {}).neighborhoods || [];
    check(ck + ' = ' + EXPECTED[ck].join(', '), JSON.stringify(got) === JSON.stringify(EXPECTED[ck]), 'got ' + got.join(', '));
  }
  const anchors = Object.keys(EXPECTED).map(ck => S.clusterDefinitions[ck].anchors.length).join('/');
  check('anchors unchanged (4/2/2/2/2)', anchors === '4/2/2/2/2', anchors);
  const seated = [].concat(...Object.keys(EXPECTED).map(ck => S.clusterDefinitions[ck].neighborhoods));
  check('every hood seated exactly once', seated.length === 22 && new Set(seated).size === 22, seated.length + ' seats');
}

console.log('T3 cluster adjacency is derived from the sheet — the literal plus Brooklyn–Eastlake');
{
  const S = run(sandbox());
  const adj = (ck) => S.clusterDefinitions[ck].adjacent.slice().sort().join(',');
  check('DOWNTOWN_CORE ↔ WATERFRONT_WEST, LAKE_CORRIDOR, NORTH_HILLS', adj('DOWNTOWN_CORE') === 'LAKE_CORRIDOR,NORTH_HILLS,WATERFRONT_WEST', adj('DOWNTOWN_CORE'));
  check('WATERFRONT_WEST ↔ DOWNTOWN_CORE, EAST_OAKLAND, LAKE_CORRIDOR (new edge)', adj('WATERFRONT_WEST') === 'DOWNTOWN_CORE,EAST_OAKLAND,LAKE_CORRIDOR', adj('WATERFRONT_WEST'));
  check('LAKE_CORRIDOR ↔ DOWNTOWN_CORE, EAST_OAKLAND, NORTH_HILLS, WATERFRONT_WEST', adj('LAKE_CORRIDOR') === 'DOWNTOWN_CORE,EAST_OAKLAND,NORTH_HILLS,WATERFRONT_WEST', adj('LAKE_CORRIDOR'));
  check('NORTH_HILLS ↔ DOWNTOWN_CORE, LAKE_CORRIDOR', adj('NORTH_HILLS') === 'DOWNTOWN_CORE,LAKE_CORRIDOR', adj('NORTH_HILLS'));
  check('EAST_OAKLAND ↔ LAKE_CORRIDOR, WATERFRONT_WEST', adj('EAST_OAKLAND') === 'LAKE_CORRIDOR,WATERFRONT_WEST', adj('EAST_OAKLAND'));
}

console.log('T4 Eastlake is the one District tie on the live map — D8 seats it with Lake Merritt');
{
  // Flip Eastlake to D2 (Chinatown's district): the same 1:1 tie now resolves to DOWNTOWN_CORE.
  const map = MAP.map(r => (r[0] === 'Eastlake' ? ['Eastlake', 'D2', r[2]] : r));
  const S = run(sandbox(), { map });
  check('Eastlake → DOWNTOWN_CORE when its District is D2', S.clusterDefinitions.DOWNTOWN_CORE.neighborhoods.indexOf('Eastlake') >= 0);
  // A district neither side holds (D3) leaves the pass-1 tie standing — the flood must NOT give up:
  // Brooklyn, San Antonio and Grand Lake seat in pass 1, and pass 2 reads LAKE 2 : DT 1 : WF 1 : EAST 1.
  const map2 = MAP.map(r => (r[0] === 'Eastlake' ? ['Eastlake', 'D3', r[2]] : r));
  const S2 = run(sandbox(), { map: map2 });
  const lake2 = S2.clusterDefinitions.LAKE_CORRIDOR.neighborhoods;
  check('a provisional tie defers and resolves on the next pass (Eastlake D3 → LAKE_CORRIDOR)', lake2.indexOf('Eastlake') >= 0, lake2.join(', '));
  check('the deferred hood seats after the pass-1 joiners', lake2.indexOf('Eastlake') > lake2.indexOf('Grand Lake'), lake2.join(', '));
  const seated2 = [].concat(...Object.keys(EXPECTED).map(ck => S2.clusterDefinitions[ck].neighborhoods));
  check('all 22 still seated exactly once', seated2.length === 22 && new Set(seated2).size === 22, seated2.length + ' seats');
}

console.log('T5 sheet drift fails loud, never a silent seat');
{
  // A persistent tie: a hood touching exactly one DOWNTOWN_CORE anchor and one NORTH_HILLS anchor,
  // in a District neither cluster ever holds — no later pass changes its neighbours' clusters.
  const mapTie = MAP.concat([['Tie Hollow', 'D3', 'Downtown, Temescal']]);
  let err = null; try { run(sandbox(), { map: mapTie }); } catch (e) { err = e; }
  check('a tie no pass can break throws, naming the hood and both clusters',
    !!err && /"Tie Hollow" \(DOWNTOWN_CORE \/ NORTH_HILLS, District D3\)/.test(err.message), err && err.message);
  // A hood with no path to any anchor (Adjacent lists only itself/nothing).
  const map = MAP.concat([['Montclair Ridge', 'D4', '']]);
  err = null; try { run(sandbox(), { map }); } catch (e) { err = e; }
  check('an unreachable hood throws, naming it', !!err && /no cluster reaches Montclair Ridge/.test(err.message), err && err.message);
  // An anchor renamed on the sheet.
  const map2 = MAP.map(r => (r[0] === 'KONO' ? ['Koreatown Northgate', r[1], r[2]] : r)).map(r => [r[0], r[1], r[2].replace(/\bKONO\b/g, 'Koreatown Northgate')]);
  err = null; try { run(sandbox(), { map: map2 }); } catch (e) { err = e; }
  check('an anchor missing from the map throws', !!err && /anchor "KONO" is not a hood/.test(err.message), err && err.message);
  // No adjacency seed at all.
  const sb = sandbox();
  const ctx = { ss: {}, config: {}, summary: { canonHoods: { list: ALL, district: {} } } };
  err = null; try { sb.applyCityDynamics_(ctx); } catch (e) { err = e; }
  check('missing S.neighborhoodAdjacency throws', !!err && /neighborhoodAdjacency not seeded/.test(err.message), err && err.message);
}

console.log('T6 the ten hoods now carry momentum from their own prior state');
{
  const prev = {};
  for (const h of ALL) prev[h] = { sentiment: h === 'Glenview' ? 0.9 : 0.0 };
  const S = run(sandbox(), { prev });
  const g = S.neighborhoodDynamics.Glenview.sentiment;
  const d = S.neighborhoodDynamics.Dimond.sentiment;
  check('Glenview (prior 0.9) sits above Dimond (prior 0.0) on the same cycle inputs', g > d, 'Glenview ' + g + ' vs Dimond ' + d);
}

console.log('T7 anchors are the authored seats, copied — and the joiners now receive per-hood consequences');
{
  const S = run(sandbox());
  check('DOWNTOWN_CORE anchors = Downtown, Uptown, KONO, Chinatown', S.clusterDefinitions.DOWNTOWN_CORE.anchors.join(',') === 'Downtown,Uptown,KONO,Chinatown');
  check('EAST_OAKLAND anchors = Fruitvale, Laurel', S.clusterDefinitions.EAST_OAKLAND.anchors.join(',') === 'Fruitvale,Laurel');
  S.clusterDefinitions.EAST_OAKLAND.anchors.push('X');
  check('published anchors are a copy', run(sandbox()).clusterDefinitions.EAST_OAKLAND.anchors.length === 2);
  // engine.93 Task 5 bus: an approval delta aimed at a joiner reaches its dynamics and clears; anchors do not move.
  const sb = sandbox();
  const base = run(sb);
  const sb2 = sandbox();
  const sheet = sheetFrom(MAP);
  const ctx = { ss: { getSheetByName: (n) => (n === 'Neighborhood_Map' ? sheet : null) }, config: {},
    summary: { season: 'Spring', weather: { type: 'clear', impact: 1 }, sportsSeason: 'off-season',
      approvalNeighborhoodEffects: { 'East Oakland': { sentiment: 0.1 } } } };
  sb2.loadCanonNeighborhoods_(ctx); sb2.applyCityDynamics_(ctx);
  const S2 = ctx.summary;
  check('East Oakland (joiner) receives the approval bus', S2.neighborhoodDynamics['East Oakland'].sentiment > base.neighborhoodDynamics['East Oakland'].sentiment,
    S2.neighborhoodDynamics['East Oakland'].sentiment + ' vs ' + base.neighborhoodDynamics['East Oakland'].sentiment);
  check('the bus is consumed', Object.keys(S2.approvalNeighborhoodEffects).length === 0);
  const moved = ALL.filter(h => h !== 'East Oakland' && S2.neighborhoodDynamics[h].sentiment !== base.neighborhoodDynamics[h].sentiment);
  check('no other hood moves on a joiner-targeted bus', moved.length === 0, moved.join(', '));
}

console.log('T8 the ten carry through the real snapshot: compact → previousCycleState → next cycle, 22 × 6 fields');
{
  const fin = fs.readFileSync(path.join(ROOT, 'phase09-digest/finalizeCycleState.js'), 'utf8');
  const i0 = fin.indexOf('function compactNeighborhoodDynamics_(');
  let d = 0, started = false, j = i0;
  for (; j < fin.length; j++) { const c = fin[j]; if (c === '{') { d++; started = true; } else if (c === '}') { d--; if (started && d === 0) { j++; break; } } }
  const compact = new Function(fin.slice(i0, j) + '\nreturn compactNeighborhoodDynamics_;')();
  const S1 = run(sandbox());
  const carried = compact(S1.neighborhoodDynamics);
  const keys = Object.keys(carried);
  const fields = ['sentiment', 'nightlife', 'retail', 'tourism', 'publicSpaces', 'communityEngagement'];
  check('snapshot carries 22 hoods', keys.length === 22, keys.length + '');
  check('each carried hood has the six momentum fields, finite', keys.every(h => fields.every(f => isFinite(carried[h][f]))));
  // Perturb one joiner in the carried state and re-run: only that hood's momentum term reads it.
  carried.Brooklyn.sentiment = 0.9;
  const S2 = run(sandbox(), { prev: carried });
  check('Brooklyn momentum reads its carried sentiment on cycle 2', S2.neighborhoodDynamics.Brooklyn.sentiment > S1.neighborhoodDynamics.Brooklyn.sentiment,
    S2.neighborhoodDynamics.Brooklyn.sentiment + ' vs ' + S1.neighborhoodDynamics.Brooklyn.sentiment);
  check('a second cycle still seats 22', Object.keys(S2.neighborhoodDynamics).length === 22);
}

console.log('T9 through the real safePhaseCall_: a graph error is an Engine_Errors row and a cycle with no dynamics, not a silent seat');
{
  const eng = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const i0 = eng.indexOf('function safePhaseCall_(');
  let d = 0, started = false, j = i0;
  for (; j < eng.length; j++) { const c = eng[j]; if (c === '{') { d++; started = true; } else if (c === '}') { d--; if (started && d === 0) { j++; break; } } }
  const sb = sandbox();
  const logged = [];
  sb.recordPhaseTiming_ = () => {};
  sb.logEngineError_ = (ctx, phase, e) => logged.push(phase + ': ' + e.message);
  vm.runInContext(eng.slice(i0, j), sb);
  const sheet = sheetFrom(MAP.concat([['Tie Hollow', 'D3', 'Downtown, Temescal']]));
  const ctx = { ss: { getSheetByName: (n) => (n === 'Neighborhood_Map' ? sheet : null) }, config: {},
    summary: { season: 'Spring', weather: { type: 'clear', impact: 1 }, sportsSeason: 'off-season' } };
  sb.loadCanonNeighborhoods_(ctx);
  const ok = sb.safePhaseCall_(ctx, 'Phase2-CityDynamics', () => sb.applyCityDynamics_(ctx));
  check('safePhaseCall_ returns false', ok === false);
  check('the error is logged under Phase2-CityDynamics naming Tie Hollow', logged.length === 1 && /Phase2-CityDynamics: .*"Tie Hollow"/.test(logged[0]), logged.join(' | '));
  check('no partial dynamics published (city and hoods both unset)', ctx.summary.cityDynamics === undefined && ctx.summary.neighborhoodDynamics === undefined);
  check('no cluster definitions published on a failed seat', ctx.summary.clusterDefinitions === undefined);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
