#!/usr/bin/env node
/**
 * engine304FamilyLottery.test.js — engine.304 (builder 2026-10-19, R13–R19).
 * Plan: docs/plans/2026-10-08-engine-286-game-of-life-events.md §engine.304 design pass.
 *
 * Cut 1 — the pool (D7, D8): BirthYear relative to the sim year, youth slots of
 * both sexes, the sex floors count adults, the cap is a World_Config cell; the
 * wave's preferred-sex line takes adults only; GC age reads BirthYear first.
 *
 * Run: node scripts/engine304FamilyLottery.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
const src = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const HOODS = ['Temescal','Downtown','Fruitvale','Lake Merritt','West Oakland','Laurel','Rockridge','Jack London','Uptown','KONO','Chinatown','Piedmont Ave','East Oakland','Baylight District','Glenview','Dimond','Ivy Hill','Adams Point','Grand Lake','Eastlake','Brooklyn','San Antonio'];
const SIM_YEAR = 2042;
const CONFIG = { hoodCitizenFloor: 12, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 20, hoodFloorPromotePerCycle: 6,
  gcPoolFloorFemale: 120, gcPoolFloorMale: 40, gcPoolFloorYouth: 40, gcPoolMaxPerCycle: 12 };

function mapSheet() {
  return [['Neighborhood', 'CoreSimRank', 'District', 'ChildAreas', 'Scenes']].concat(HOODS.map((h, i) => [h, i + 1, 'D1', '', h === 'Temescal' ? 'arts' : '']));
}
function ledger(perHood) { // male-heavy adults, every hood at perHood
  const headers = ['POPID', 'First', 'Last', 'Neighborhood', 'Status', 'Gender'];
  const rows = []; let n = 1;
  HOODS.forEach(h => { for (let i = 0; i < perHood; i++) rows.push(['POP-' + (n++), 'A', 'B', h, 'Active', i % 3 === 0 ? 'female' : 'male']); });
  return { headers, rows, dirty: false };
}
function makeSandbox() {
  const sb = { console, Logger: { log() {} } };
  vm.createContext(sb);
  ['utilities/sportsWeekRecord.js', 'phase01-config/advanceSimulationCalendar.js', 'phase01-config/canonNeighborhoodLoader.js', 'phase01-config/engine94SheetContract.js',
   'phase05-citizens/generateGenericCitizens.js', 'phase05-citizens/checkForPromotions.js'].forEach(f => load(sb, f));
  return sb;
}
function makeCtx(sb, perHood, config, gcRows) {
  const GC_HEAD = ['First', 'Last', 'Age', 'BirthYear', 'Neighborhood', 'Occupation', 'EmergenceCount', 'EmergedCycle', 'EmergenceContext', 'Status', 'Sex', 'EmployerBizId'];
  const gc = [GC_HEAD].concat(gcRows || []);
  const written = [];
  const gcSheet = {
    getDataRange: () => ({ getValues: () => gc.map(r => r.slice()) }),
    getLastRow: () => gc.length,
    getLastColumn: () => GC_HEAD.length,
    getRange: () => ({ setValues: v => { v.forEach(r => written.push(r)); } }),
  };
  const ctx = {
    summary: { simYear: SIM_YEAR, cycleId: 113, season: 'Fall', weather: { impact: 1 }, weatherMood: {}, worldEvents: [], cityDynamics: {}, economicMood: 50, holiday: 'none' },
    config: Object.assign({ cycleCount: 113 }, CONFIG, config || {}),
    rng: mulberry32(7),
    ledger: ledger(perHood),
    ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => mapSheet() }) } : n === 'Generic_Citizens' ? gcSheet : null },
  };
  sb.loadCanonNeighborhoods_(ctx);
  return { ctx, written, GC_HEAD };
}

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
const sb = makeSandbox();

console.log('P1 the feeder slot plan');
t('adult and youth deficits both open → slots alternate adult/youth, adults first; youth alternate sex', () => {
  const s = sb.planFeederSlots_(8, 31, 0, 40, 0, 0, 'female');
  eq(s.map(x => (x.youth ? 'y' : 'a') + x.sex[0]), ['af', 'yf', 'af', 'ym', 'af', 'yf', 'af', 'ym']);
});
t('no adult deficit → every slot youth, the scarcer sex first', () => {
  const s = sb.planFeederSlots_(4, 0, 0, 40, 10, 3, null);
  eq(s.map(x => (x.youth ? 'y' : 'a') + x.sex[0]), ['ym', 'ym', 'ym', 'ym']);
  const even = sb.planFeederSlots_(4, 0, 0, 40, 0, 0, null);
  eq(even.map(x => x.sex[0]), ['f', 'm', 'f', 'm']);
});
t('no youth deficit → today\'s order: female deficit, male deficit, then the wave preference', () => {
  const s = sb.planFeederSlots_(6, 2, 1, 0, 0, 0, 'male');
  eq(s.map(x => (x.youth ? 'y' : 'a') + x.sex[0]), ['af', 'af', 'am', 'am', 'am', 'am']);
  const noPref = sb.planFeederSlots_(3, 0, 0, 0, 0, 0, null);
  eq(noPref.map(x => x.sex[0]), ['f', 'm', 'f']);
});
t('the youth line stops at its deficit; adults take the rest', () => {
  const s = sb.planFeederSlots_(8, 31, 0, 2, 0, 0, 'female');
  eq(s.filter(x => x.youth).length, 2);
  eq(s.filter(x => !x.youth).length, 6);
});

console.log('P2 the generator end to end');
const gcAdults = (nF, nM) => {
  const rows = [];
  for (let i = 0; i < nF; i++) rows.push(['F' + i, 'Row', '', 1990, 'Temescal', 'Barista', 0, 'Cycle 100', '', 'Active', 'female', '']);
  for (let i = 0; i < nM; i++) rows.push(['M' + i, 'Row', '', 1990, 'Temescal', 'Barista', 0, 'Cycle 100', '', 'Active', 'male', '']);
  return rows;
};
t('women short + no youth → the cap (12) fills alternating women and children; BirthYear relative; minors are students', () => {
  const { ctx, written, GC_HEAD } = makeCtx(sb, 20, null, gcAdults(89, 187));
  sb.generateGenericCitizens_(ctx);
  const iBY = GC_HEAD.indexOf('BirthYear'), iSex = GC_HEAD.indexOf('Sex'), iOcc = GC_HEAD.indexOf('Occupation'), iAge = GC_HEAD.indexOf('Age');
  assert.strictEqual(written.length, 12);
  const kids = written.filter(r => SIM_YEAR - r[iBY] < 18), adults = written.filter(r => SIM_YEAR - r[iBY] >= 18);
  assert.strictEqual(kids.length, 6);
  assert.strictEqual(adults.length, 6);
  adults.forEach(r => { assert.strictEqual(r[iSex], 'female'); assert.ok(SIM_YEAR - r[iBY] <= 75, 'adult ≤ 75'); assert.notStrictEqual(r[iOcc], 'student'); });
  kids.forEach(r => { assert.ok(r[iBY] <= SIM_YEAR && r[iBY] > SIM_YEAR - 18); assert.strictEqual(r[iOcc], 'student'); });
  eq(kids.map(r => r[iSex]).sort(), ['female', 'female', 'female', 'male', 'male', 'male']);
  written.forEach(r => assert.strictEqual(r[iAge], '', 'Age is not written — readers take BirthYear'));
});
t('girls in the pool do not count toward the women\'s floor', () => {
  const girls = []; for (let i = 0; i < 40; i++) girls.push(['G' + i, 'Row', '', 2034, 'Temescal', 'student', 0, 'Cycle 100', '', 'Active', i % 2 ? 'female' : 'male', '']);
  const { ctx, written, GC_HEAD } = makeCtx(sb, 20, null, gcAdults(119, 187).concat(girls));
  sb.generateGenericCitizens_(ctx);
  const iBY = GC_HEAD.indexOf('BirthYear'), iSex = GC_HEAD.indexOf('Sex');
  assert.strictEqual(written.length, 1); // one woman short; youth at its floor of 40
  assert.strictEqual(written[0][iSex], 'female');
  assert.ok(SIM_YEAR - written[0][iBY] >= 18);
});
t('every floor met and no hood short → pool-at-floor skip', () => {
  const kids = []; for (let i = 0; i < 40; i++) kids.push(['K' + i, 'Row', '', 2034, 'Temescal', 'student', 0, 'Cycle 100', '', 'Active', i % 2 ? 'female' : 'male', '']);
  const { ctx, written } = makeCtx(sb, 20, null, gcAdults(120, 40).concat(kids));
  sb.generateGenericCitizens_(ctx);
  assert.strictEqual(written.length, 0);
  assert.strictEqual(ctx.summary.genericCitizensDistribution.skipped, 'pool-at-floor');
  assert.strictEqual(ctx.summary.genericCitizensDistribution.activeYouth, 40);
});
t('the cap is the World_Config cell; a missing youth floor or cap fails loud', () => {
  const { ctx, written } = makeCtx(sb, 20, { gcPoolMaxPerCycle: 5 }, gcAdults(89, 187));
  sb.generateGenericCitizens_(ctx);
  assert.strictEqual(written.length, 5);
  assert.throws(() => sb.generateGenericCitizens_(makeCtx(sb, 20, { gcPoolFloorYouth: undefined }, gcAdults(89, 187)).ctx), /gcPoolFloorYouth\/gcPoolMaxPerCycle missing/);
  assert.throws(() => sb.generateGenericCitizens_(makeCtx(sb, 20, { gcPoolMaxPerCycle: undefined }, gcAdults(89, 187)).ctx), /gcPoolFloorYouth\/gcPoolMaxPerCycle missing/);
});
t('no fixed birth-year range is left in the generator', () => {
  const g = src('phase05-citizens/generateGenericCitizens.js');
  assert.ok(!/minBirthYear\s*=\s*1966/.test(g) && !/maxBirthYear\s*=\s*2023/.test(g));
  assert.ok(!/var MAX_PER_CYCLE = 8;/.test(g));
});
t('the two new cells seed through engine.148 with their values', () => {
  const plan = sb.inspectEngine94Config_([['Key', 'Value', 'Description']], sb.ENGINE148_CONFIG_SEEDS);
  const byKey = {}; plan.additions.forEach(a => { byKey[a[0]] = a[1]; });
  assert.strictEqual(byKey.gcPoolFloorYouth, 40);
  assert.strictEqual(byKey.gcPoolMaxPerCycle, 12);
});

t('a blank BirthYear with an explicit Age 0 is a newborn, a blank Age is an adult', () => {
  const kids = []; for (let i = 0; i < 40; i++) kids.push(['N' + i, 'Row', 0, '', 'Temescal', 'student', 0, 'Cycle 100', '', 'Active', i % 2 ? 'female' : 'male', '']);
  const blanks = []; for (let i = 0; i < 120; i++) blanks.push(['B' + i, 'Row', '', '', 'Temescal', 'Barista', 0, 'Cycle 100', '', 'Active', 'female', '']);
  const { ctx, written } = makeCtx(sb, 20, null, blanks.concat(gcAdults(0, 40)).concat(kids));
  sb.generateGenericCitizens_(ctx);
  assert.strictEqual(written.length, 0, '120 blank-age women meet the floor, 40 Age-0 rows meet the youth floor');
});

console.log('P3 the wave takes adults first, minors still');
const WAVE = [['First', 'Last', 'Neighborhood', 'Status', 'Sex', 'EmergedCycle', 'BirthYear']]
  .concat([['girl', 'x', 'Eastlake', 'Active', 'female', '', 2032], ['woman', 'x', 'Eastlake', 'Active', 'female', '', 1990], ['man', 'x', 'Eastlake', 'Active', 'male', '', 1990]]);
const sparse = (sb2) => { const { ctx } = makeCtx(sb2, 20); ctx.ledger.rows = ctx.ledger.rows.filter(r => r[3] !== 'Eastlake'); return ctx; };
t('a girl never takes the women-first line; the woman goes first', () => {
  const ctx = sparse(sb); ctx.config.hoodFloorPromotePerCycle = 1;
  assert.strictEqual(sb.waveSexPreference_(ctx), 'female');
  for (let seed = 1; seed <= 20; seed++) eq(Object.keys(sb.selectFloorWaveRows_(ctx, WAVE, 2, 3, 4, 5, 113, mulberry32(seed), 6)), ['2']);
});
t('with room for all three, the girl is still taken (kids reach the ledger through the wave)', () => {
  const ctx = sparse(sb);
  eq(Object.keys(sb.selectFloorWaveRows_(ctx, WAVE, 2, 3, 4, 5, 113, mulberry32(3), 6)).sort(), ['1', '2', '3']);
});
t('a girl with a blank BirthYear and Age 9 stays out of the women-first line', () => {
  const W2 = [['First', 'Last', 'Neighborhood', 'Status', 'Sex', 'EmergedCycle', 'BirthYear', 'Age']]
    .concat([['girl', 'x', 'Eastlake', 'Active', 'female', '', '', 9], ['woman', 'x', 'Eastlake', 'Active', 'female', '', '', 34], ['man', 'x', 'Eastlake', 'Active', 'male', '', 1990, '']]);
  const ctx = sparse(sb); ctx.config.hoodFloorPromotePerCycle = 1;
  for (let seed = 1; seed <= 20; seed++) eq(Object.keys(sb.selectFloorWaveRows_(ctx, W2, 2, 3, 4, 5, 113, mulberry32(seed), 6, 7)), ['2']);
});
t('no BirthYear column passed → today\'s behaviour (no sim-year read)', () => {
  const ctx = sparse(sb); ctx.config.hoodFloorPromotePerCycle = 1;
  const picked = Object.keys(sb.selectFloorWaveRows_(ctx, WAVE, 2, 3, 4, 5, 113, mulberry32(5)));
  assert.ok(picked[0] === '1' || picked[0] === '2', 'a female row, minor or not');
});

console.log('P4 age from BirthYear (D8)');
t('the wave mint reads BirthYear before the Age column (blank Age is not 30)', () => {
  const c = src('phase05-citizens/checkForPromotions.js');
  assert.ok(/var age = rowBY > 1900 \? simYear - rowBY : Number\(row\[gAge\] \|\| 30\);/.test(c));
  assert.ok(/selectFloorWaveRows_\(ctx, gVals, gNeigh, gStat, gSex, gEmergedCycle, cycle, rng, gBirthYear, gAge\)/.test(c));
});
t('both live courtship reads take BirthYear first', () => {
  const b = src('phase05-citizens/bondEngine.js');
  assert.ok(/var gAgeM = Number\(gRowM\[gBirth\]\) \? simYear - Number\(gRowM\[gBirth\]\) : \(Number\(gRowM\[gAge\]\) \|\| 0\);/.test(b));
  assert.ok(/var ga2 = Number\(gr2\[gBirth\]\) \? simYear - Number\(gr2\[gBirth\]\) : \(Number\(gr2\[gAge\]\) \|\| 0\);/.test(b));
});

t('surfacing: no child under 13 in the acquaintance pool; a teen gets only the neutral line', () => {
  const e = src('phase05-citizens/generateCitizensEvents.js');
  assert.ok(/if \(gsAge < 13\) continue;/.test(e));
  assert.ok(/minor: gsAge < 18/.test(e));
  assert.ok(/if \(!gcPick\.minor\) \{[\s\S]{0,400}gcT1[\s\S]{0,200}gcT2[\s\S]{0,300}\}\n\s*pool\.push\(makeEntry\(gcT3/.test(e));
});
t('the queue mint zeroes a minor\'s income, debt and net worth (GAME rows excepted)', () => {
  const m = src('phase05-citizens/processAdvancementIntake.js');
  assert.ok(/if \(age < 18 && String\(clockMode \|\| ''\)\.trim\(\)\.toUpperCase\(\) !== 'GAME'\) \{\s*if \(lIncomeN >= 0\) newRow\[lIncomeN\] = 0;\s*if \(lDebtLevel >= 0\) newRow\[lDebtLevel\] = 0;\s*if \(lNetWorth >= 0\) newRow\[lNetWorth\] = 0;/.test(m));
  // behaviour: scripts/householdIntake.test.js §2 runs the mint and asserts the kids at 0/0/0
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
