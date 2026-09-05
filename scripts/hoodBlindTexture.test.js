/**
 * hoodBlindTexture.test.js — engine.148 Phase 3: texture pools key by the
 * hood's place label (Neighborhood_Map.EmployerCharacter) with bespoke lines
 * on top; arts / holiday / crowd membership lists are Neighborhood_Map.Scenes
 * tags. No hood on the map is silent; no label without a pool passes quietly.
 *
 * Run: node scripts/hoodBlindTexture.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const G = require('./fixtures/hood-geography.json');
const SC = require('./fixtures/hood-scenes.json').scenes;
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

const HOODS = ['Temescal','Downtown','Fruitvale','Lake Merritt','West Oakland','Laurel','Rockridge','Jack London','Uptown','KONO','Chinatown','Piedmont Ave','East Oakland','Baylight District','Glenview','Dimond','Ivy Hill','Adams Point','Grand Lake','Eastlake','Brooklyn','San Antonio'];
const BESPOKE_12 = HOODS.slice(0, 12);
// Live Neighborhood_Map.EmployerCharacter, read 2026-09-05 (17 distinct labels).
const CHAR = { Downtown:'institutional', Temescal:'clinic', Laurel:'schools-retail', 'West Oakland':'campus', Fruitvale:'transit-retail', 'Jack London':'nightlife', Rockridge:'professional', 'Adams Point':'residential', 'Grand Lake':'retail', 'Piedmont Ave':'medical', Chinatown:'family-retail', Brooklyn:'residential', Eastlake:'mixed', Glenview:'residential', Dimond:'village-retail', 'Ivy Hill':'residential', 'San Antonio':'service-labor', KONO:'arts', 'Lake Merritt':'residential', Uptown:'nightlife', 'Baylight District':'stadium', 'East Oakland':'construction' };
const LABELS = Array.from(new Set(Object.values(CHAR)));
assert.strictEqual(LABELS.length, 17);

function mapSheet(over) {
  over = over || {};
  const header = ['Neighborhood', 'CoreSimRank', 'ChildAreas', 'WeatherZone', 'Adjacent', 'AttentionWeight', 'EmployerCharacter', 'Scenes'];
  const rows = HOODS.map((h, i) => [h, i + 1, h === 'Piedmont Ave' ? 'Montclair' : (h === 'Downtown' ? 'Old Oakland' : ''), G.zone[h], G.adjacent[h], G.attention[h],
    over.chr && h in over.chr ? over.chr[h] : CHAR[h], over.sc && h in over.sc ? over.sc[h] : SC[h]]);
  if (over.dropCols) { const keep = header.map((c, i) => over.dropCols.indexOf(c) < 0 ? i : -1).filter(i => i >= 0); return [header].concat(rows).map(r => keep.map(i => r[i])); }
  return [header].concat(rows);
}
const ENGINES = [
  ['phase05-citizens/runNeighborhoodEngine.js', 'NEIGHBORHOOD_DRIFT_BY_CHARACTER_', 'NEIGHBORHOOD_DRIFT_BESPOKE_'],
  ['phase05-citizens/runCareerEngine.js', 'CAREER_TEXTURE_BY_CHARACTER_', 'CAREER_TEXTURE_BESPOKE_'],
  ['phase05-citizens/runEducationEngine.js', 'EDUCATION_TEXTURE_BY_CHARACTER_', 'EDUCATION_TEXTURE_BESPOKE_'],
  ['phase05-citizens/runHouseholdEngine.js', 'HOUSEHOLD_TEXTURE_BY_CHARACTER_', 'HOUSEHOLD_TEXTURE_BESPOKE_'],
  ['phase05-citizens/runAsUniversePipeline.js', 'POSTCAREER_TEXTURE_BY_CHARACTER_', 'POSTCAREER_TEXTURE_BESPOKE_'],
  ['phase05-citizens/runCivicRoleEngine.js', 'CIVIC_NOTE_BY_CHARACTER_', 'CIVIC_NOTE_BESPOKE_'],
  ['phase05-citizens/generateCitizensEvents.js', 'CITIZEN_EVENT_TEXTURE_BY_CHARACTER_', 'CITIZEN_EVENT_TEXTURE_BESPOKE_'],
  ['phase05-citizens/generateCitizensEvents.js', 'CITIZEN_VENUES_BY_CHARACTER_', 'CITIZEN_VENUES_BESPOKE_'],
  ['phase05-citizens/generateCitizensEvents.js', 'CITIZEN_INSTITUTIONS_BY_CHARACTER_', 'CITIZEN_INSTITUTIONS_BESPOKE_'],
];
function makeSandbox() {
  const sb = { console, Logger: { log() {} }, Utilities: {}, SpreadsheetApp: {}, Math };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  const seen = {};
  ENGINES.forEach(e => { if (!seen[e[0]]) { seen[e[0]] = 1; load(sb, e[0]); } });
  return sb;
}
function makeCtx(sb, over) {
  const ctx = { summary: {}, config: {}, ledger: { headers: ['Neighborhood', 'Status'], rows: [] }, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => mapSheet(over) }) } : null } };
  sb.loadCanonNeighborhoods_(ctx);
  return ctx;
}
let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const sb = makeSandbox();

console.log('T1 loader seeds character + scenes');
t('every hood has a character; scenes parse with weights; blank scenes = {}', () => {
  const ctx = makeCtx(sb);
  HOODS.forEach(h => assert.strictEqual(sb.getHoodCharacter_(ctx, h), CHAR[h]));
  eq(sb.getHoodScenes_(ctx, 'Chinatown'), { LunarNewYear: 5 });
  eq(sb.getHoodScenes_(ctx, 'KONO'), { arts: 1, FirstFriday: 3 });
  eq(sb.getHoodScenes_(ctx, 'Laurel'), {});
  assert.strictEqual(sb.hoodSceneWeight_(ctx, 'Uptown', 'FirstFriday'), 4);
  assert.strictEqual(sb.hoodSceneWeight_(ctx, 'Uptown', 'Halloween'), 0);
});
t('the four arts hoods and the holiday hosts come back from the tags, sheet order, weighted', () => {
  const ctx = makeCtx(sb);
  // fixture row order = HOODS order (Temescal, Downtown, Fruitvale, ..., Uptown, KONO, ...)
  eq(sb.hoodNamesWithScene_(ctx, 'arts'), ['Temescal', 'Jack London', 'Uptown', 'KONO']);
  eq(sb.hoodsWithScene_(ctx, 'LunarNewYear'), [['Downtown', 2], ['Chinatown', 5]]);
  eq(sb.hoodsWithScene_(ctx, 'FirstFriday'), [['Temescal', 2], ['Downtown', 1], ['Jack London', 1], ['Uptown', 4], ['KONO', 3]]);
  eq(sb.hoodNamesWithScene_(ctx, 'CincoDeMayo'), ['Downtown', 'Fruitvale', 'San Antonio']);
  eq(sb.hoodsWithScene_(ctx, 'none'), []);
});
t('blank character, malformed scene, missing columns, off-map hood all fail loud', () => {
  const ctx = makeCtx(sb, { chr: { Eastlake: '' } });
  assert.throws(() => sb.getHoodCharacter_(ctx, 'Eastlake'), /EmployerCharacter is blank for Eastlake/);
  assert.throws(() => makeCtx(sb, { sc: { Dimond: 'arts:lots' } }), /malformed entry "arts:lots"/);
  const bare = makeCtx(sb, { dropCols: ['EmployerCharacter', 'Scenes'] });
  assert.throws(() => sb.getHoodCharacter_(bare, 'Temescal'), /no EmployerCharacter column/);
  assert.throws(() => sb.hoodsWithScene_(bare, 'arts'), /no Scenes column/);
  assert.throws(() => sb.getHoodScenes_(makeCtx(sb), 'Atlantis'), /not a hood on Neighborhood_Map/);
});

console.log('T2 texture pools — every hood, every label, every engine');
ENGINES.forEach(([file, byLabel, bespoke]) => {
  t(byLabel + ' covers the 17 live labels; bespoke keys are hoods on the map', () => {
    const pools = sb[byLabel], extra = sb[bespoke];
    LABELS.forEach(l => assert.ok(Array.isArray(pools[l]) && pools[l].length >= 2, byLabel + ' has no pool for ' + l));
    Object.keys(extra).forEach(h => assert.ok(HOODS.indexOf(h) >= 0, bespoke + ' keys "' + h + '", not on the map'));
    assert.deepStrictEqual(Object.keys(extra).sort(), BESPOKE_12.slice().sort(), bespoke + ' should carry exactly the twelve');
  });
  t(byLabel + ': all 22 hoods draw a non-empty pool; the twelve get their bespoke lines on top', () => {
    const ctx = makeCtx(sb);
    HOODS.forEach(h => {
      const pool = sb.hoodTexturePool_(ctx, h, sb[byLabel], sb[bespoke], 'test');
      assert.ok(pool.length >= 2, h + ' drew an empty pool');
      const base = sb[byLabel][CHAR[h]];
      base.forEach(line => assert.ok(pool.indexOf(line) >= 0, h + ' missing its ' + CHAR[h] + ' line'));
      if (BESPOKE_12.indexOf(h) >= 0) sb[bespoke][h].forEach(line => assert.ok(pool.indexOf(line) >= 0, h + ' missing bespoke line'));
      else assert.strictEqual(pool.length, base.length, h + ' should have only its label pool');
    });
  });
});
t('hoodTexturePool_: blank hood = empty pool; child area folds to its parent; off-map name throws; a new label throws', () => {
  const ctx = makeCtx(sb);
  const P = sb.CAREER_TEXTURE_BY_CHARACTER_, B = sb.CAREER_TEXTURE_BESPOKE_;
  eq(sb.hoodTexturePool_(ctx, '', P, B, 'test'), []);
  eq(sb.hoodTexturePool_(ctx, 'Oakland, CA', P, B, 'test'), []);
  eq(sb.hoodTexturePool_(ctx, 'Old Oakland', P, B, 'test'), sb.hoodTexturePool_(ctx, 'Downtown', P, B, 'test'));
  eq(sb.hoodTexturePool_(ctx, 'montclair', P, B, 'test'), sb.hoodTexturePool_(ctx, 'Piedmont Ave', P, B, 'test'));
  assert.throws(() => sb.hoodTexturePool_(ctx, 'Atlantis', P, B, 'test'), /"Atlantis" is not on Neighborhood_Map/);
  const ctx2 = makeCtx(sb, { chr: { Brooklyn: 'space-port' } });
  assert.throws(() => sb.hoodTexturePool_(ctx2, 'Brooklyn', P, B, 'runCareerEngine_'), /runCareerEngine_: no texture pool for EmployerCharacter "space-port" \(Brooklyn\)/);
});

console.log('T3 the literals are gone');
t('no engine file keeps a hood-keyed texture table or arts/holiday list', () => {
  const files = ['phase05-citizens/runNeighborhoodEngine.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/runEducationEngine.js', 'phase05-citizens/runHouseholdEngine.js', 'phase05-citizens/runAsUniversePipeline.js', 'phase05-citizens/runCivicRoleEngine.js', 'phase05-citizens/generateCitizensEvents.js', 'phase05-citizens/checkForPromotions.js', 'phase04-events/generateGenericCitizenMicroEvent.js', 'phase07-evening-media/buildEveningFamous.js', 'phase07-evening-media/culturalLedger.js', 'phase05-citizens/generateGenericCitizens.js', 'phase05-citizens/bondEngine.js', 'phase07-evening-media/mediaFeedbackEngine.js', 'phase07-evening-media/cityEveningSystems.js'];
  files.forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/\["Uptown", "KONO", "Temescal", "Jack London"\]/.test(s), f + ' still carries the arts literal');
    assert.ok(!/HOLIDAY_CROWD|FESTIVAL_NEIGHBORHOODS\s*=|ARTS_DISTRICT_NEIGHBORHOODS\s*=|genericEvents|\|\| "a familiar (spot|corner)"/.test(s), f + ' still carries a hood default');
    // in-function hood-keyed tables are gone: any 'Temescal': [ must sit inside a *_BESPOKE_ table.
    // runNeighborhoodEngine keeps holidayNeighborhoodEvents / firstFridayEvents — bespoke prose
    // per holiday × hood, gated by the calendar, not a per-hood default (plan: keep bespoke lines).
    const inFn = s.split('\n').filter(l => /^\s{4,}['"]Temescal['"]\s*:/.test(l));
    const allowed = /runNeighborhoodEngine/.test(f) ? 1 : 0; // the firstFridayEvents Temescal entry
    assert.strictEqual(inFn.length, allowed, f + ' still has an in-function Temescal-keyed table');
    if (/runNeighborhoodEngine/.test(f)) assert.ok(!/var neighborhoodEvents\b/.test(s), 'neighborhoodEvents literal survived');
  });
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
