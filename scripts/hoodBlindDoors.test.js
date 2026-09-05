/**
 * hoodBlindDoors.test.js — engine.148 Phase 1: the doors into the tracked
 * ledger see all 22 hoods and pull toward the under-floor ones.
 *
 * Covers: World_Config self-arm seeds (4 keys), tracked headcount seed with the
 * ChildAreas fold, floor deficit + fail-loud on a missing cell, feeder weights
 * from the CoreSimRank order (no 12-key literal, no `|| 1.0`), the surfacing
 * floor draw, and the migration-wave row selection (greedy by deficit).
 *
 * Run: node scripts/hoodBlindDoors.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const HOODS = ['Temescal','Downtown','Fruitvale','Lake Merritt','West Oakland','Laurel','Rockridge','Jack London','Uptown','KONO','Chinatown','Piedmont Ave','East Oakland','Baylight District','Glenview','Dimond','Ivy Hill','Adams Point','Grand Lake','Eastlake','Brooklyn','San Antonio'];

function mapSheet() {
  const header = ['Neighborhood', 'CoreSimRank', 'District', 'ChildAreas'];
  const rows = HOODS.map((h, i) => [h, i + 1, 'D1', h === 'Downtown' ? 'Old Oakland, City Center' : h === 'Jack London' ? 'Jack London Square, Brooklyn Basin' : '']);
  return [header].concat(rows);
}

function ledgerFixture(counts) {
  const headers = ['POPID', 'First', 'Last', 'Neighborhood', 'Status', 'Gender'];
  const rows = [];
  let n = 1;
  Object.keys(counts).forEach(h => { for (let i = 0; i < counts[h]; i++) rows.push(['POP-' + (n++), 'A', 'B', h, 'Active', i % 3 === 0 ? 'female' : 'male']); }); // male-heavy, like the live ledger
  rows.push(['POP-9990', 'Dead', 'Row', 'Eastlake', 'Deceased']);
  rows.push(['POP-9991', 'Child', 'Spelling', 'Old Oakland', 'Active']);
  rows.push(['POP-9992', 'Off', 'Map', 'Los Angeles', 'Active']);
  return { headers, rows, dirty: false };
}

function makeSandbox() {
  const sb = { console, Logger: { log() {} } };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase01-config/engine94SheetContract.js');
  load(sb, 'phase05-citizens/generateGenericCitizens.js');
  load(sb, 'phase05-citizens/generateCitizensEvents.js');
  load(sb, 'phase05-citizens/checkForPromotions.js');
  return sb;
}

function makeCtx(sb, counts, config) {
  const ctx = {
    summary: {},
    config: Object.assign({ hoodCitizenFloor: 12, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 20, hoodFloorPromotePerCycle: 6, gcPoolFloorFemale: 120, gcPoolFloorMale: 40 }, config || {}),
    ledger: ledgerFixture(counts),
    ss: { getSheetByName: name => name === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => mapSheet() }) } : null },
  };
  sb.loadCanonNeighborhoods_(ctx);
  return ctx;
}

const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b)); // vm realm: no shared prototypes
let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }

const sb = makeSandbox();
const FULL = {}; HOODS.forEach(h => { FULL[h] = 20; });
const SPARSE = Object.assign({}, FULL, { Eastlake: 0, Brooklyn: 3, Glenview: 6, 'San Antonio': 12 });

console.log('T1 World_Config self-arm seeds');
t('six engine.148 keys seed on a bare World_Config', () => {
  const plan = sb.inspectEngine94Config_([['Key', 'Value', 'Description']], sb.ENGINE148_CONFIG_SEEDS);
  eq(plan.additions.map(a => a[0]).sort(), ['gcPoolFloorFemale', 'gcPoolFloorMale', 'gcSurfaceChance', 'hoodCitizenFloor', 'hoodFloorPromotePerCycle', 'hoodFloorSurfaceQuota']);
  assert.strictEqual(plan.additions.length, 6);
});
t('an out-of-range or fractional integer cell fails loud', () => {
  assert.throws(() => sb.inspectEngine94Config_([['Key', 'Value', 'Description'], ['hoodCitizenFloor', 2.5, '']], sb.ENGINE148_CONFIG_SEEDS), /invalid World_Config.hoodCitizenFloor/);
  assert.throws(() => sb.inspectEngine94Config_([['Key', 'Value', 'Description'], ['gcSurfaceChance', 1.5, '']], sb.ENGINE148_CONFIG_SEEDS), /invalid World_Config.gcSurfaceChance/);
});
t('the boot wires ensureEngine148Config_ next to engine.161', () => {
  const src = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  assert.ok(/ensureEngine161Config_\(ss\);[^\n]*\n\s*ensureEngine148Config_\(ss\);/.test(src));
});

console.log('T2 tracked headcount seed');
t('Active rows counted per hood, deceased skipped, child spelling folds, off-map lands in _other', () => {
  const ctx = makeCtx(sb, SPARSE);
  assert.strictEqual(ctx.summary.hoodHeadcount, undefined); // lazy: counted on first read
  sb.getHoodHeadcount_(ctx, 'Eastlake');
  const hc = ctx.summary.hoodHeadcount;
  assert.strictEqual(hc.Eastlake, 0);
  assert.strictEqual(hc.Brooklyn, 3);
  assert.strictEqual(hc.Downtown, 21); // 20 + 'Old Oakland'
  assert.strictEqual(hc._other, 1);
  assert.strictEqual(Object.keys(hc).length, 23);
});
t('getHoodHeadcount_ throws before the canon seed', () => {
  assert.throws(() => sb.getHoodHeadcount_({ summary: {} }, 'Eastlake'), /not seeded/);
});
t('the first headcount read throws when the ledger is not in ctx', () => {
  const ctx = { summary: {}, config: {}, ss: { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => mapSheet() }) }) } };
  sb.loadCanonNeighborhoods_(ctx);
  assert.throws(() => sb.getHoodHeadcount_(ctx, 'Eastlake'), /ctx.ledger not loaded/);
});

console.log('T3 floor deficit');
t('deficit is (floor − count) / floor, 0 at or above floor', () => {
  const ctx = makeCtx(sb, SPARSE);
  assert.strictEqual(sb.hoodFloorDeficit_(ctx, 'Eastlake'), 1);
  assert.strictEqual(sb.hoodFloorDeficit_(ctx, 'Brooklyn'), 0.75);
  assert.strictEqual(sb.hoodFloorDeficit_(ctx, 'Glenview'), 0.5);
  assert.strictEqual(sb.hoodFloorDeficit_(ctx, 'San Antonio'), 0);
  assert.strictEqual(sb.hoodFloorDeficit_(ctx, 'Downtown'), 0);
  eq(sb.underFloorHoods_(ctx), ['Glenview', 'Eastlake', 'Brooklyn']); // core order
});
t('missing hoodCitizenFloor fails loud; 0 switches the floor off', () => {
  const ctx = makeCtx(sb, SPARSE, { hoodCitizenFloor: undefined });
  assert.throws(() => sb.hoodFloorDeficit_(ctx, 'Eastlake'), /hoodCitizenFloor missing/);
  const off = makeCtx(sb, SPARSE, { hoodCitizenFloor: 0 });
  assert.strictEqual(sb.hoodFloorDeficit_(off, 'Eastlake'), 0);
  eq(sb.underFloorHoods_(off), []);
});

console.log('T4 feeder weights');
t('22 keys from the CoreSimRank order, rank 1 = 1.3, floor 0.6, deficit ×(1+2d)', () => {
  const ctx = makeCtx(sb, SPARSE);
  const w = sb.feederHoodWeights_(ctx, sb.getCoreSimNeighborhoods_(ctx));
  assert.strictEqual(Object.keys(w).length, 22);
  assert.ok(Math.abs(w.Temescal - 1.3) < 1e-9);
  assert.ok(Math.abs(w['San Antonio'] - 0.67) < 1e-9); // rank 22: 1.3 − 0.63
  assert.ok(Math.abs(w.Eastlake - (1.3 - 0.03 * 19) * 3) < 1e-9);
  assert.ok(Math.abs(w.Brooklyn - (1.3 - 0.03 * 20) * 2.5) < 1e-9);
  HOODS.forEach(h => assert.ok(w[h] > 0));
});
t('the old 12-key literal and its `|| 1.0` are gone', () => {
  const src = fs.readFileSync(path.join(ROOT, 'phase05-citizens/generateGenericCitizens.js'), 'utf8');
  assert.ok(!/'Piedmont Ave':\s*0\.7/.test(src));
  assert.ok(!/weights\[neighborhood\] \|\| 1\.0/.test(src));
});

console.log('T5 surfacing floor draw');
const POOL = [
  { name: 'A One', nbhd: 'Eastlake', sheetRow: 2, count: 0 },
  { name: 'B Two', nbhd: 'Eastlake', sheetRow: 3, count: 1 },
  { name: 'C Three', nbhd: 'Brooklyn', sheetRow: 4, count: 0 },
  { name: 'D Four', nbhd: 'Downtown', sheetRow: 5, count: 2 },
];
t('draws only from under-floor hoods, weighted by deficit', () => {
  const ctx = makeCtx(sb, SPARSE);
  const rng = mulberry32(7);
  const seen = {};
  for (let i = 0; i < 400; i++) { const p = sb.pickUnderFloorGc_(ctx, POOL, rng); seen[p.nbhd] = (seen[p.nbhd] || 0) + 1; }
  assert.ok(!seen.Downtown);
  assert.ok(seen.Eastlake > seen.Brooklyn); // deficit 1.0 vs 0.75
  assert.ok(seen.Brooklyn > 80);
});
t('null when no under-floor hood has anyone waiting', () => {
  const ctx = makeCtx(sb, FULL);
  assert.strictEqual(sb.pickUnderFloorGc_(ctx, POOL, mulberry32(1)), null);
  const ctx2 = makeCtx(sb, SPARSE);
  assert.strictEqual(sb.pickUnderFloorGc_(ctx2, [POOL[3]], mulberry32(1)), null);
});
t('the surfacing dials read World_Config, not a literal', () => {
  const src = fs.readFileSync(path.join(ROOT, 'phase05-citizens/generateCitizensEvents.js'), 'utf8');
  assert.ok(!/GC_SURFACE_CHANCE = 0\.06/.test(src));
  assert.ok(/ctx\.config\.gcSurfaceChance/.test(src) && /ctx\.config\.hoodFloorSurfaceQuota/.test(src));
});

console.log('T6 migration wave');
const GVALS = [['First', 'Last', 'Neighborhood', 'Status', 'Sex', 'EmergedCycle']]
  .concat([['e1', 'x', 'Eastlake', 'Active', 'male', ''], ['e2', 'x', 'Eastlake', 'Active', 'female', 'Cycle 100'], ['e3', 'x', 'Eastlake', 'Emerged', 'female', 'Cycle 104'],
           ['b1', 'x', 'Brooklyn', 'Active', 'male', ''], ['b2', 'x', 'Brooklyn Basin', 'Active', 'female', ''],
           ['g1', 'x', 'Glenview', 'Active', 'male', ''], ['d1', 'x', 'Downtown', 'Active', 'female', ''], ['o1', 'x', 'Los Angeles', 'Active', 'female', ''],
           ['n1', 'x', 'Eastlake', 'Active', 'female', 'Cycle 106']]); // minted this cycle — waits
t('greedy by deficit: quota 6 takes every waiting row in the under-floor hoods; never Downtown, a folded child of a full hood, or off-map', () => {
  const ctx = makeCtx(sb, SPARSE);
  const picked = sb.selectFloorWaveRows_(ctx, GVALS, 2, 3, 4, 5, 106, mulberry32(3));
  const hoods = Object.values(picked).sort();
  // Eastlake 2 Active (Emerged row skipped) + Brooklyn 1 + Glenview 1 = 4 < quota 6;
  // 'Brooklyn Basin' folds to Jack London, which holds its floor → never drawn.
  assert.strictEqual(hoods.length, 4);
  eq(hoods, ['Brooklyn', 'Eastlake', 'Eastlake', 'Glenview']);
  assert.ok(!Object.keys(picked).includes('7')); // Downtown row
  assert.ok(!Object.keys(picked).includes('8')); // off-map row
  assert.ok(!Object.keys(picked).includes('9')); // minted this cycle
});
t('quota 0 picks nothing; missing cell fails loud', () => {
  const off = makeCtx(sb, SPARSE, { hoodFloorPromotePerCycle: 0 });
  eq(sb.selectFloorWaveRows_(off, GVALS, 2, 3, 4, 5, 106, mulberry32(3)), {});
  const missing = makeCtx(sb, SPARSE, { hoodFloorPromotePerCycle: undefined });
  assert.throws(() => sb.selectFloorWaveRows_(missing, GVALS, 2, 3, 4, 5, 106, mulberry32(3)), /hoodFloorPromotePerCycle missing/);
});
t('the wave draws the sex the ledger is short of first (male-heavy ledger → women first), then the rest', () => {
  const ctx = makeCtx(sb, SPARSE);
  assert.strictEqual(sb.waveSexPreference_(ctx), 'female');
  const one = makeCtx(sb, SPARSE, { hoodFloorPromotePerCycle: 1 });
  const first = sb.selectFloorWaveRows_(one, GVALS, 2, 3, 4, 5, 106, mulberry32(5)); // Eastlake (deficit 1.0) has e1 male + e2 female → e2 (row 2)
  eq(Object.keys(first), ['2']);
  const balanced = makeCtx(sb, SPARSE); balanced.ledger.rows.forEach((r, i) => { r[5] = i % 2 ? 'female' : 'male'; }); balanced.ledger.rows.push(['POP-x', 'A', 'B', 'Downtown', 'Active', balanced.ledger.rows.filter(r => r[5] === 'female').length < balanced.ledger.rows.filter(r => r[5] === 'male').length ? 'female' : 'male']);
  const pref = sb.waveSexPreference_(balanced); assert.ok(pref === null || pref === 'female' || pref === 'male');
  const noGender = makeCtx(sb, SPARSE); noGender.ledger.headers = noGender.ledger.headers.slice(0, 5); assert.strictEqual(sb.waveSexPreference_(noGender), null);
});
t('a full city waves nobody', () => {
  const ctx = makeCtx(sb, FULL);
  eq(sb.selectFloorWaveRows_(ctx, GVALS, 2, 3, 4, 5, 106, mulberry32(3)), {});
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
