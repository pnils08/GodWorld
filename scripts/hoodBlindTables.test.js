/**
 * hoodBlindTables.test.js — engine.148 Phase 2: the keyed hood tables that
 * left ten hoods invisible are gone. Weather zones, adjacency and the attention
 * knob are Neighborhood_Map columns; crisis weight is earned from hood state;
 * the gender table and the dead transit corridor map are deleted.
 *
 * Run: node scripts/hoodBlindTables.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const G = require('./fixtures/hood-geography.json');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
const src = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

const HOODS = ['Temescal','Downtown','Fruitvale','Lake Merritt','West Oakland','Laurel','Rockridge','Jack London','Uptown','KONO','Chinatown','Piedmont Ave','East Oakland','Baylight District','Glenview','Dimond','Ivy Hill','Adams Point','Grand Lake','Eastlake','Brooklyn','San Antonio'];
const TIER = { Temescal:1, Downtown:4, Fruitvale:3, 'Lake Merritt':6, 'West Oakland':5, Laurel:3, Rockridge:5, 'Jack London':4, Uptown:3, KONO:3, Chinatown:3, 'Piedmont Ave':5, 'East Oakland':2, 'Baylight District':5, Glenview:2, Dimond:2, 'Ivy Hill':2, 'Adams Point':3, 'Grand Lake':3, Eastlake:3, Brooklyn:4, 'San Antonio':2 };
const CRIME = { Temescal:0.73, Downtown:1.07, Fruitvale:1.0, 'Lake Merritt':0.83, 'West Oakland':1.16, Laurel:0.5, Rockridge:0.54, 'Jack London':0.9, Uptown:0.64, KONO:0.57, Chinatown:0.87, 'Piedmont Ave':0.39, 'East Oakland':1.17, 'Baylight District':0.65, Glenview:0.5, Dimond:0.64, 'Ivy Hill':0.18, 'Adams Point':0.62, 'Grand Lake':0.53, Eastlake:0.51, Brooklyn:0.6, 'San Antonio':0.78 };

function mapSheet(over) {
  over = over || {};
  const header = ['Neighborhood', 'CoreSimRank', 'ChildAreas', 'WeatherZone', 'Adjacent', 'AttentionWeight'];
  const rows = HOODS.map((h, i) => [h, i + 1, h === 'Piedmont Ave' ? 'Montclair' : '', over.zone && h in over.zone ? over.zone[h] : G.zone[h], over.adj && h in over.adj ? over.adj[h] : G.adjacent[h], over.att && h in over.att ? over.att[h] : G.attention[h]]);
  return [header].concat(rows);
}
function makeSandbox() {
  const sb = { console, Logger: { log() {} }, Utilities: {}, SpreadsheetApp: {} };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase02-world-state/applyWeatherModel.js');
  load(sb, 'phase03-population/updateCrimeMetrics.js');
  load(sb, 'phase06-analysis/prioritizeEvents.js');
  load(sb, 'phase03-population/generateCrisisSpikes.js');
  load(sb, 'utilities/citizenDerivation.js');
  return sb;
}
function makeCtx(sb, over) {
  const ctx = { summary: {}, config: {}, ledger: { headers: ['Neighborhood', 'Status'], rows: [] }, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => mapSheet(over) }) } : null } };
  sb.loadCanonNeighborhoods_(ctx);
  ctx.summary.neighborhoodState = {};
  HOODS.forEach(h => { ctx.summary.neighborhoodState[h] = { incomeTier: TIER[h], crimeIndex: CRIME[h] }; });
  return ctx;
}
let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const sb = makeSandbox();

console.log('T1 loader seeds the three columns');
t('every hood has a zone, a numeric attention, and a mirrored adjacency', () => {
  const ctx = makeCtx(sb);
  HOODS.forEach(h => { assert.ok(sb.getHoodWeatherZone_(ctx, h)); assert.ok(isFinite(sb.getHoodAttention_(ctx, h))); assert.ok(sb.getAdjacentHoods_(ctx, h).length >= 1, h + ' has no neighbours'); });
  assert.ok(sb.getAdjacentHoods_(ctx, 'West Oakland').includes('Downtown')); // Downtown lists West Oakland → mirrored
  assert.ok(sb.getAdjacentHoods_(ctx, 'Baylight District').includes('West Oakland'));
  HOODS.forEach(h => sb.getAdjacentHoods_(ctx, h).forEach(o => assert.ok(sb.getAdjacentHoods_(ctx, o).includes(h), h + '↔' + o + ' not symmetric')));
});
t('a child area in Adjacent folds to its parent; an off-map name throws at seed', () => {
  const ctx = makeCtx(sb, { adj: { Rockridge: 'Temescal, Montclair' } });
  assert.ok(sb.getAdjacentHoods_(ctx, 'Rockridge').includes('Piedmont Ave'));
  assert.throws(() => makeCtx(sb, { adj: { Rockridge: 'Temescal, Atlantis' } }), /names "Atlantis"/);
});
t('a blank zone or blank attention fails loud on read; missing columns fail loud', () => {
  const ctx = makeCtx(sb, { zone: { Eastlake: '' }, att: { Brooklyn: '' } });
  assert.throws(() => sb.getHoodWeatherZone_(ctx, 'Eastlake'), /WeatherZone is blank for Eastlake/);
  assert.throws(() => sb.getHoodAttention_(ctx, 'Brooklyn'), /AttentionWeight is blank/);
  const bare = { summary: {}, config: {}, ledger: { headers: [], rows: [] }, ss: { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [['Neighborhood', 'CoreSimRank']].concat(HOODS.map((h, i) => [h, i + 1])) }) }) } };
  sb.loadCanonNeighborhoods_(bare);
  assert.throws(() => sb.getHoodWeatherZone_(bare, 'Downtown'), /no WeatherZone column/);
  assert.throws(() => sb.getAdjacentHoods_(bare, 'Downtown'), /no Adjacent column/);
  assert.throws(() => sb.getHoodAttention_(bare, 'Downtown'), /no AttentionWeight column/);
});

console.log('T2 weather');
t('every hood resolves to a zone profile; an unknown label throws; the 12-key literal is gone', () => {
  const ctx = makeCtx(sb);
  HOODS.forEach(h => { const p = sb.hoodWeatherProfile_(ctx, h); assert.ok(typeof p.tempMod === 'number' && p.description); });
  assert.strictEqual(sb.hoodWeatherProfile_(ctx, 'Jack London').description, 'waterfront cool');
  assert.strictEqual(sb.hoodWeatherProfile_(ctx, 'Rockridge').tempMod, -2);
  const bad = makeCtx(sb, { zone: { Dimond: 'tundra' } });
  assert.throws(() => sb.hoodWeatherProfile_(bad, 'Dimond'), /"tundra" for Dimond is not a zone/);
  assert.ok(!/OAKLAND_WEATHER_PROFILES/.test(src('phase02-world-state/applyWeatherModel.js')));
  assert.ok(/getCanonNeighborhoods_\(ctx\)/.test(src('phase02-world-state/applyWeatherModel.js')));
});

console.log('T3 crime adjacency');
t('graph is a copy of the sheet seed; unseeded throws; the literal + cluster fallback are gone', () => {
  const ctx = makeCtx(sb);
  const g = sb.buildCrimeAdjacencyGraph_(ctx.summary);
  assert.strictEqual(Object.keys(g).length, 22);
  g.Downtown.push('X'); assert.ok(!ctx.summary.neighborhoodAdjacency.Downtown.includes('X'));
  assert.throws(() => sb.buildCrimeAdjacencyGraph_({}), /not seeded/);
  const s = src('phase03-population/updateCrimeMetrics.js');
  const body = s.slice(s.indexOf('function buildCrimeAdjacencyGraph_')); const fn = body.slice(0, body.indexOf('\nfunction ', 10));
  assert.ok(!/DEFAULT_NEIGHBORHOOD_ADJACENCY/.test(s) && !/clusterDefinitions/.test(fn));
});

console.log('T4 crisis weight is earned');
t('formula matches the recorded before/after table and clamps', () => {
  const ctx = makeCtx(sb);
  const w = h => sb.crisisHoodWeight_(ctx, h);
  assert.strictEqual(w('Temescal'), 1.26);
  assert.strictEqual(w('West Oakland'), 0.79);
  assert.strictEqual(w('Piedmont Ave'), 0.56);
  assert.strictEqual(w('Lake Merritt'), 0.54);
  assert.strictEqual(w('East Oakland'), 1.24);
  assert.strictEqual(w('Ivy Hill'), 0.94);
  ctx.summary.neighborhoodState.Temescal.crimeIndex = 5; assert.strictEqual(w('Temescal'), 1.5);
  ctx.summary.neighborhoodState['Lake Merritt'].crimeIndex = -5; assert.strictEqual(w('Lake Merritt'), 0.4);
  delete ctx.summary.neighborhoodState.Dimond; assert.throws(() => w('Dimond'), /no S.neighborhoodState for Dimond/);
  assert.ok(!/CRISIS_HOOD_WEIGHTS/.test(src('phase03-population/generateCrisisSpikes.js')));
});

console.log('T5 event hood → attention');
t('blank is citywide, a child spelling folds, an unknown name throws; priority is the affine map', () => {
  const ctx = makeCtx(sb);
  assert.strictEqual(sb.eventHoodOrNull_(ctx, ''), null);
  assert.strictEqual(sb.eventHoodOrNull_(ctx, undefined), null);
  assert.strictEqual(sb.eventHoodOrNull_(ctx, 'Montclair'), 'Piedmont Ave');
  assert.throws(() => sb.eventHoodOrNull_(ctx, 'Atlantis'), /"Atlantis", which is not on Neighborhood_Map/);
  assert.strictEqual(sb.eventHoodWeight_(ctx, 'Downtown'), 1.3);
  assert.strictEqual(sb.eventHoodWeight_(ctx, 'Laurel'), 0.8);
  assert.strictEqual(sb.getHoodAttention_(ctx, 'East Oakland'), 1.5);
  assert.ok(!/neighborhoodWeight = \{/.test(src('phase06-analysis/prioritizeEvents.js')));
  assert.ok(!/neighborhoodBonus = \{/.test(src('phase05-citizens/applyNamedCitizenSpotlight.js')));
  assert.ok(/eventHoodOrNull_\(ctx, neighborhood\)/.test(src('phase05-citizens/applyNamedCitizenSpotlight.js')));
});

console.log('T6 gender table + transit literal gone');
t('deriveGender_ keeps its signature, ignores the hood, and both copies lost the table', () => {
  assert.strictEqual(sb.deriveGender_('seed-1', 'Eastlake'), sb.deriveGender_('seed-1', 'Piedmont Ave'));
  assert.ok(['male', 'female'].includes(sb.deriveGender_('seed-2', 'Brooklyn')));
  const lib = require('../lib/citizenDerivation.js');
  assert.strictEqual(lib.deriveGender('seed-1', 'Eastlake'), lib.deriveGender('seed-1', 'Glenview'));
  assert.ok(!/NEIGHBORHOOD_GENDER_VARIANCE/.test(src('utilities/citizenDerivation.js')));
  assert.ok(!/NEIGHBORHOOD_GENDER_VARIANCE/.test(src('lib/citizenDerivation.js')));
  assert.ok(!/function getCorridorForNeighborhood_/.test(src('utilities/ensureTransitMetrics.js')));
});
t('v3NeighborhoodWriter self-arms the three headers', () => {
  const s = src('phase08-v3-chicago/v3NeighborhoodWriter.js');
  assert.ok(/'WeatherZone', 'Adjacent', 'AttentionWeight'/.test(s));
});

// Live C107 canon (Neighborhood_Map EmployerCharacter, MedianIncome, BoomIndex)
// + tracked Business_Ledger employees per hood.
const CANON_C107 = {"Downtown":["institutional",120721,0.6,6739],"Temescal":["clinic",68409,-0.7,89],"Laurel":["schools-retail",86000,-0.1,56],"West Oakland":["campus",144855,0.9,775],"Fruitvale":["transit-retail",98196,0.7,209],"Jack London":["nightlife",118472,0.6,1781],"Rockridge":["professional",160962,0.7,79],"Adams Point":["residential",95190,0.4,41],"Grand Lake":["retail",105420,0.4,56],"Piedmont Ave":["medical",150000,0.4,2650],"Chinatown":["family-retail",84336,0,78],"Brooklyn":["residential",129870,0.8,64],"Eastlake":["mixed",84000,0,47],"Glenview":["residential",81918,-0.4,42],"Dimond":["village-retail",80000,-0.4,52],"Ivy Hill":["residential",78000,-0.4,27],"San Antonio":["service-labor",69930,-0.3,48],"KONO":["arts",82164,0.3,46],"Lake Merritt":["residential",185741,0.3,134],"Uptown":["nightlife",96577,0.6,204],"Baylight District":["stadium",140000,1,2813],"East Oakland":["construction",72144,0.2,73]};
function canonS(over) {
  const S = { neighborhoodState: {}, hoodEmployerDepth: {}, sportsZones: [] };
  for (const [h, [label, income, boom, emp]] of Object.entries(Object.assign({}, CANON_C107, over || {}))) {
    S.neighborhoodState[h] = { employerCharacter: label, medianIncome: income, boomIndex: boom };
    if (emp) S.hoodEmployerDepth[h] = { employees: emp };
  }
  return S;
}
function writerSandbox() {
  const w = { console, Logger: { log() {} } };
  vm.createContext(w);
  load(w, 'phase08-v3-chicago/v3NeighborhoodWriter.js');
  return w;
}

console.log('T7 hood profile is read from canon, not a hood table (real-Oakland retail/crime/mood table retired)');
t('no hood-name-keyed profile table on the per-cycle path', () => {
  const s = src('phase08-v3-chicago/v3NeighborhoodWriter.js');
  assert.ok(!/var neighborhoods = \{/.test(s));
  assert.ok(!/'West Oakland':\s*\{\s*nightlifeMod/.test(s));
  assert.ok(!/profile\.(crimeMod|sentimentMod)/.test(s));
  assert.ok(/hoodProfileFromCanon_\(name, S, hoodCity\)/.test(s));
});
t('C107 canon: the boom\'s birthplace is above the city on retail, the hood it left behind is below', () => {
  const w = writerSandbox();
  const S = canonS();
  const city = w.hoodCharacterCity_(S, w.NMAP_NEIGHBORHOODS);
  const mod = {};
  for (const h of w.NMAP_NEIGHBORHOODS) mod[h] = w.hoodProfileFromCanon_(h, S, city).retailMod;
  const sorted = Object.values(mod).sort((a, b) => a - b);
  const med = (sorted[10] + sorted[11]) / 2;
  assert.ok(mod['West Oakland'] > med, 'West Oakland ' + mod['West Oakland'] + ' vs median ' + med);
  assert.ok(mod['Temescal'] < med, 'Temescal ' + mod['Temescal']);
  assert.ok(mod['San Antonio'] < med && mod['Grand Lake'] > med && mod['Rockridge'] > med);
  for (const v of Object.values(mod)) assert.ok(v >= 0.5 && v <= 1.6);
  assert.ok(Object.values(mod).filter(v => v >= 1.6).length === 0, "no hood pinned at the cap");
  assert.ok(Math.abs(Object.values(mod).reduce((a, b) => a + b, 0) / 22 - 1) < 0.01, "centred on the city mean");
});
t('Baylight is a build site until a franchise opens in it, then the stadium district', () => {
  const w = writerSandbox();
  const S = canonS();
  const city = w.hoodCharacterCity_(S, w.NMAP_NEIGHBORHOODS);
  const site = w.hoodProfileFromCanon_('Baylight District', S, city);
  S.sportsZones = ['Baylight District'];
  const open = w.hoodProfileFromCanon_('Baylight District', S, city);
  assert.ok(open.retailMod > site.retailMod && open.eventMod === 1.35 && site.eventMod === 0.6);
});
t('the name carries nothing: same canon, same profile', () => {
  const w = writerSandbox();
  const S = canonS({ Rockridge: CANON_C107['West Oakland'] });
  const city = w.hoodCharacterCity_(S, w.NMAP_NEIGHBORHOODS);
  eq(w.hoodProfileFromCanon_('Rockridge', S, city), w.hoodProfileFromCanon_('West Oakland', S, city));
});
t('businesses move it, bounded: a hood whose employers grow gains retail, capped at +10%', () => {
  const w = writerSandbox();
  const S0 = canonS();
  const c0 = w.hoodCharacterCity_(S0, w.NMAP_NEIGHBORHOODS);
  const before = w.hoodProfileFromCanon_('Dimond', S0, c0).retailMod;
  const S1 = canonS({ Dimond: ['village-retail', 80000, -0.4, 5000] });
  const after = w.hoodProfileFromCanon_('Dimond', S1, w.hoodCharacterCity_(S1, w.NMAP_NEIGHBORHOODS)).retailMod;
  const S2 = canonS({ Dimond: ['village-retail', 80000, -0.4, 0] });   // no tracked employers → depth neutral
  const base = w.hoodProfileFromCanon_('Dimond', S2, w.hoodCharacterCity_(S2, w.NMAP_NEIGHBORHOODS)).retailMod;
  assert.ok(after > before && after <= base * 1.1 + 1e-9, before + ' -> ' + after + ' (base ' + base + ')');
});
t('a blank or unknown label throws (a new label needs a row)', () => {
  const w = writerSandbox();
  const city = { income: 90000, employees: 60 };
  assert.throws(() => w.hoodProfileFromCanon_('KONO', canonS({ KONO: ['', 82164, 0.3, 46] }), city), /EmployerCharacter is blank/);
  assert.throws(() => w.hoodProfileFromCanon_('KONO', canonS({ KONO: ['spaceport', 82164, 0.3, 46] }), city), /no HOOD_CHARACTER_MODS row/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
