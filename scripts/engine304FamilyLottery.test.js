#!/usr/bin/env node
/**
 * engine304FamilyLottery.test.js — engine.304 (builder 2026-10-19, R13–R19).
 * Plan: docs/plans/2026-10-08-engine-286-game-of-life-events.md §engine.304 design pass.
 *
 * Cut 1 — the pool (D7, D8): BirthYear relative to the sim year, youth slots of
 * both sexes, the sex floors count adults, the cap is a World_Config cell; the
 * wave's preferred-sex line takes adults only; GC age reads BirthYear first.
 *
 * Cut 2 — the lottery, the link, the arrival (D1–D6): open spots net of links, the 1% tier-weighted
 * draw, one opportunity and its fit, the link writes, the release, the emergence carry, the mint re-check
 * and the exact GC flip, the same-batch co-parent case, replay.
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

// ═══ Cut 2 ═══════════════════════════════════════════════════════════════
const logs2 = [];
function mkSheet(rows) {
  const s = { rows, appended: [], cleared: [], setCells: [] };
  s.getDataRange = () => ({ getValues: () => s.rows.map(r => r.slice()) });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; s.setCells.push([r, c, v]); },
    clearContent: () => { for (let k = 0; k < (nr || 1); k++) { s.cleared.push(r + k); if (s.rows[r + k - 1]) s.rows[r + k - 1] = s.rows[r + k - 1].map(() => ''); } },
    setValues: (vals) => { for (let k = 0; k < vals.length; k++) { while (!s.rows[r + k - 1]) s.rows.push([]); for (let m = 0; m < vals[k].length; m++) s.rows[r + k - 1][c + m - 1] = vals[k][m]; } },
  });
  return s;
}
const ADJ = { Temescal: ['Rockridge'], Rockridge: ['Temescal'] };
const sandbox2 = {
  ECONOMIC_PARAMETERS: JSON.parse(src('data/economic_parameters.json')),
  Logger: { log(m) { logs2.push(String(m)); } },
  queueAppendIntent_: () => {}, queueCellIntent_: () => {}, recordRipple_: () => {},
  inWorldStamp_: () => 'Y3C9',
  jobReferencePay_: (role) => (role === 'student' ? null : 61000),
  estimateRent_: () => 2200, inferSexFromFirstName_: () => '', getCoreSimNeighborhoods_: () => ['Temescal', 'Rockridge', 'Downtown'],
  resolveHoodOrChild_: (ctx, n) => n || null,
  setCurrentField_: (t) => t, roleFieldOf_: () => '', skillTagField_: () => '', sectorCategory_: () => '',
  requireTab_: (ss, name) => ss.getSheetByName(name),
  nextPopIdLocked_: require('../utilities/popIdAllocator').nextPopIdLocked_,
  safeRand_: (ctx) => ctx.rng,
  heritageTierByPop_: () => ({}), heritageRank_: () => 0,
  bondProximity_: () => ({ near: (a, b) => a === b || (ADJ[a] || []).indexOf(b) >= 0 }),
};
const E2 = new Function(...Object.keys(sandbox2), src('phase01-config/advanceSimulationCalendar.js') + '\n' + src('utilities/citizenDerivation.js') + '\n' + src('phase05-citizens/processAdvancementIntake.js') +
  '\nreturn { checkFamilyMatchPromotions_, checkEmergencePromotions_, processAdvancementRows_, familySpotsOpen_, familyLedgerCols_, gcFamilyLinks_, simYearFromCycle_ };')(...Object.values(sandbox2));
const SL2 = ['POPID','First','MaidenName','Last','ClockMode','Tier','RoleType','Status','BirthYear','LifeHistory','SpouseId','UsageCount','Neighborhood','HouseholdId','MaritalStatus','NumChildren','ParentIds','ChildrenIds','Income','NetWorth','DebtLevel','EducationLevel','CareerStage','YearsInCareer','EmployerBizId','Gender','SkillTags'];
const c2 = n => SL2.indexOf(n);
const sl2 = o => { const r = SL2.map(() => ''); Object.keys(o).forEach(k => { r[c2(k)] = o[k]; }); return r; };
const GCH = ['First','Last','Age','BirthYear','Neighborhood','Occupation','EmergenceCount','EmergedCycle','EmergenceContext','Status','Sex','EmployerBizId','FamilyOf','FamilyRole','MaidenName'];
const g2 = n => GCH.indexOf(n);
const gc = o => { const r = GCH.map(() => ''); Object.assign(r, {}); Object.keys(o).forEach(k => { r[g2(k)] = o[k]; }); if (r[g2('Status')] === '') r[g2('Status')] = 'Active'; if (r[g2('EmergenceCount')] === '') r[g2('EmergenceCount')] = 0; return r; };
const C2 = 113, Y2 = E2.simYearFromCycle_(C2);
function world2(ledgerRows, gcRows, rngFn) {
  const sheets = {
    Generic_Citizens: mkSheet([GCH.slice()].concat(gcRows)),
    Advancement_Intake1: mkSheet([['First','Middle','Last','RoleType','Tier','ClockMode','CIV','MED','UNI','Notes']]),
    LifeHistory_Log: mkSheet([['Timestamp','POPID','Name','EventTag','EventText','Neighborhood','Cycle']]),
    Household_Ledger: mkSheet([['HouseholdId','HeadOfHousehold','HouseholdType','Members','Neighborhood','HousingType','MonthlyRent','HousingCost','HouseholdIncome','FormedCycle','DissolvedCycle','Status','HouseholdSavings']]),
    Family_Relationships: mkSheet([['HouseholdId','Husband','Wife','RelationshipType','SinceCycle','Status','Child1','Child2','Child3','Child4','Child5']]),
    Business_Ledger: mkSheet([['BIZ_ID','Name','Sector','Neighborhood','Employee_Count','Avg_Salary','Annual_Revenue','Growth_Rate','Key_Personnel']]),
  };
  const ctx = {
    ledger: { headers: SL2.slice(), rows: ledgerRows, dirty: false },
    summary: { cycleId: C2, simYear: Y2, storyHooks: [] }, config: { cycleCount: C2 },
    rng: rngFn || (() => 0),
    ss: { getSheetByName: n => sheets[n] || null },
  };
  return { ctx, sheets };
}
const L2 = E2.familyLedgerCols_(SL2);
const darrin = () => sl2({ POPID: 'POP-00021', First: 'Darrin', Last: 'Davis', Tier: 1, Status: 'Active', BirthYear: Y2 - 33, Neighborhood: 'Temescal', MaritalStatus: 'married', NumChildren: 2, ChildrenIds: '[]', Gender: 'male', HouseholdId: 'HH-1' });

console.log('C1 open spots, net of links');
t('a married citizen with no SpouseId has one spouse spot; a linked spouse closes it; a link does not count against itself', () => {
  const d = darrin();
  eq(E2.familySpotsOpen_(L2, d, Y2, null, -1, true), { spouse: 1, child: 2, parent: 0 });
  eq(E2.familySpotsOpen_(L2, d, Y2, { spouse: [5], child: [6], parent: [] }, -1, true), { spouse: 0, child: 1, parent: 0 });
  eq(E2.familySpotsOpen_(L2, d, Y2, { spouse: [5], child: [6], parent: [] }, 5, false).spouse, 1);
});
t('a parent spot opens for a minor to draw; a link already made keeps it after 18', () => {
  const kid = sl2({ POPID: 'POP-00500', Last: 'Ortiz', Status: 'Active', BirthYear: Y2 - 9, ParentIds: '["POP-00501"]' });
  assert.strictEqual(E2.familySpotsOpen_(L2, kid, Y2, null, -1, true).parent, 1);
  const grown = sl2({ POPID: 'POP-00502', Last: 'Ortiz', Status: 'Active', BirthYear: Y2 - 19, ParentIds: '' });
  assert.strictEqual(E2.familySpotsOpen_(L2, grown, Y2, null, -1, true).parent, 0);
  assert.strictEqual(E2.familySpotsOpen_(L2, grown, Y2, { spouse: [], child: [], parent: [7] }, 7, false).parent, 2);
});

console.log('C2 the draw — 1% of the open families, tier-weighted');
t('over 2,000 seeded Cycles the citywide draws average D and a T1 is drawn about 10× a T4', () => {
  const rows = [darrin()];
  for (let i = 0; i < 99; i++) rows.push(sl2({ POPID: 'POP-1' + String(i).padStart(4, '0'), Last: 'L' + i, Tier: 4, Status: 'Active', BirthYear: Y2 - 40, Neighborhood: 'Downtown', MaritalStatus: 'married', Gender: 'female' }));
  let total = 0, t1 = 0, t4one = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    logs2.length = 0;
    const w = world2(rows.map(r => r.slice()), [gc({ First: 'Nobody', Last: 'Fits', BirthYear: Y2 - 80, Neighborhood: 'Chinatown', Sex: 'male' })], mulberry32(seed)); // an empty tab returns before the draw
    total += E2.checkFamilyMatchPromotions_(w.ctx, C2).drawn;
    if (logs2.some(m => /POP-00021 drawn/.test(m))) t1++;
    if (logs2.some(m => /POP-10000 drawn/.test(m))) t4one++;
  }
  const D = 0.01 * 100, mean = total / 2000;
  assert.ok(Math.abs(mean - D) < 0.08, 'mean draws ' + mean + ' vs D ' + D);
  const pT1 = 10 / 109, pT4 = 1 / 109; // D·w/Σw, Σw = 10 + 99
  assert.ok(Math.abs(t1 / 2000 - pT1) < 0.02, 'T1 rate ' + t1 / 2000 + ' vs ' + pT1);
  assert.ok(Math.abs(t4one / 2000 - pT4) < 0.008, 'one T4 rate ' + t4one / 2000 + ' vs ' + pT4);
});
t('same seed, same links (replay)', () => {
  const pool = [gc({ First: 'Amara', Last: 'Keane', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female' }), gc({ First: 'Bea', Last: 'Lo', BirthYear: Y2 - 30, Neighborhood: 'Rockridge', Sex: 'female' })];
  const a = world2([darrin()], pool.map(r => r.slice()), mulberry32(42)), b = world2([darrin()], pool.map(r => r.slice()), mulberry32(42));
  E2.checkFamilyMatchPromotions_(a.ctx, C2); E2.checkFamilyMatchPromotions_(b.ctx, C2);
  eq(a.sheets.Generic_Citizens.rows, b.sheets.Generic_Citizens.rows);
});

console.log('C3 one opportunity — who fits');
t('rng 0: drawn, spouse picked, and only the one row that fits every rule is linked', () => {
  const pool = [
    gc({ First: 'Man', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'male' }),          // wrong sex
    gc({ First: 'Old', Last: 'X', BirthYear: Y2 - 50, Neighborhood: 'Temescal', Sex: 'female' }),        // outside ±10
    gc({ First: 'Far', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Downtown', Sex: 'female' }),        // not same or bordering
    gc({ First: 'Hot', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female', EmergenceCount: 3 }), // the emergence door's this fire
    gc({ First: 'Civ', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female' }),        // civic mint this fire
    gc({ First: 'Darrin', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female' }),     // would become "Darrin Davis" — taken
    gc({ First: 'Wed', Last: 'X', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female', Status: 'Courting' }), // not Active
    gc({ First: 'Amara', Last: 'Keane', BirthYear: Y2 - 31, Neighborhood: 'Rockridge', Sex: 'female' }), // fits (bordering hood)
  ];
  const w = world2([darrin()], pool, () => 0);
  w.ctx.civicGcTaken = { 5: true };
  const d = darrin(); d[c2('NumChildren')] = 0; w.ctx.ledger.rows = [d];
  const res = E2.checkFamilyMatchPromotions_(w.ctx, C2);
  assert.strictEqual(res.linked, 1);
  const G = w.sheets.Generic_Citizens.rows, won = G[8];
  eq([won[g2('Status')], won[g2('First')], won[g2('Last')], won[g2('MaidenName')], won[g2('FamilyOf')], won[g2('FamilyRole')], won[g2('Neighborhood')]],
     ['Family', 'Amara', 'Davis', 'Keane', 'POP-00021', 'spouse', 'Temescal']);
  for (let r = 1; r <= 7; r++) assert.notStrictEqual(G[r][g2('Status')], 'Family');
  assert.strictEqual(w.sheets.Advancement_Intake1.appended.length, 0, 'a link mints nobody');
  assert.strictEqual(w.ctx.ledger.dirty, false, 'the ledger is not touched');
});
t('a minor fills a child spot, never a spouse or a parent spot', () => {
  const pool = [gc({ First: 'Kid', Last: 'Y', BirthYear: Y2 - 8, Neighborhood: 'Temescal', Sex: 'male' })];
  const d = darrin(); d[c2('MaritalStatus')] = 'single'; // child spots only
  const w = world2([d], pool, () => 0);
  assert.strictEqual(E2.checkFamilyMatchPromotions_(w.ctx, C2).linked, 1);
  eq(w.sheets.Generic_Citizens.rows[1][g2('FamilyRole')], 'child');
  const kidAsSpouse = world2([(() => { const x = darrin(); x[c2('NumChildren')] = 0; x[c2('BirthYear')] = Y2 - 20; return x; })()],
    [gc({ First: 'Teen', Last: 'Y', BirthYear: Y2 - 16, Neighborhood: 'Temescal', Sex: 'female' })], () => 0);
  assert.strictEqual(E2.checkFamilyMatchPromotions_(kidAsSpouse.ctx, C2).linked, 0, 'a 16-year-old is no one\'s spouse');
});
t('nobody fits → nothing for that family this Cycle', () => {
  const w = world2([darrin()], [gc({ First: 'Far', Last: 'Z', BirthYear: Y2 - 31, Neighborhood: 'Downtown', Sex: 'female' })], () => 0);
  const res = E2.checkFamilyMatchPromotions_(w.ctx, C2);
  assert.strictEqual(res.linked, 0); assert.strictEqual(res.noFit, 1);
});
t('missing link columns fail loud', () => {
  const w = world2([darrin()], []); w.sheets.Generic_Citizens.rows[0] = GCH.slice(0, 12);
  w.sheets.Generic_Citizens.rows.push(gc({ First: 'A', Last: 'B' }).slice(0, 12));
  assert.throws(() => E2.checkFamilyMatchPromotions_(w.ctx, C2), /FamilyOf\/FamilyRole\/MaidenName/);
});

console.log('C4 release');
t('a closed spot releases the link: own name back, columns cleared, count kept', () => {
  const d = darrin(); d[c2('SpouseId')] = 'POP-00777'; d[c2('NumChildren')] = 0; // remarried on camera
  const linked = gc({ First: 'Amara', Last: 'Davis', MaidenName: 'Keane', FamilyOf: 'POP-00021', FamilyRole: 'spouse', Status: 'Family', EmergenceCount: 2, BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female' });
  const w = world2([d], [linked], () => 0.99);
  assert.strictEqual(E2.checkFamilyMatchPromotions_(w.ctx, C2).released, 1);
  const r = w.sheets.Generic_Citizens.rows[1];
  eq([r[g2('Status')], r[g2('Last')], r[g2('MaidenName')], r[g2('FamilyOf')], r[g2('FamilyRole')], r[g2('EmergenceCount')]], ['Active', 'Keane', '', '', '', 2]);
});
t('more linked kids than open spots → only the extra is released', () => {
  const d = darrin(); d[c2('MaritalStatus')] = 'single'; d[c2('NumChildren')] = 1;
  const k = (f) => gc({ First: f, Last: 'Davis', MaidenName: 'Q', FamilyOf: 'POP-00021', FamilyRole: 'child', Status: 'Family', BirthYear: Y2 - 5, Neighborhood: 'Temescal', Sex: 'male' });
  const w = world2([d], [k('Ana'), k('Ben')], () => 0.99);
  assert.strictEqual(E2.checkFamilyMatchPromotions_(w.ctx, C2).released, 1);
  eq(w.sheets.Generic_Citizens.rows.slice(1).map(r => r[g2('Status')]).sort(), ['Active', 'Family']);
});
t('a citizen gone from the ledger releases their family', () => {
  const linked = gc({ First: 'Amara', Last: 'Davis', MaidenName: 'Keane', FamilyOf: 'POP-09999', FamilyRole: 'spouse', Status: 'Family', BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female' });
  const w = world2([darrin()], [linked], () => 0.99);
  E2.checkFamilyMatchPromotions_(w.ctx, C2);
  eq(w.sheets.Generic_Citizens.rows[1][g2('Last')], 'Keane');
});

console.log('C5 arrival — usage brings them to the ledger as family');
const famRow = (o) => gc(Object.assign({ First: 'Amara', Last: 'Davis', MaidenName: 'Keane', FamilyOf: 'POP-00021', FamilyRole: 'spouse', Status: 'Family', EmergenceCount: 3, BirthYear: Y2 - 31, Neighborhood: 'Temescal', Sex: 'female', Occupation: 'Nurse' }, o || {}));
t('the emergence door queues a Family row at 3 with its link and the family\'s hood', () => {
  const w = world2([darrin()], [famRow({ Neighborhood: 'Rockridge' })]);
  const res = E2.checkEmergencePromotions_(w.ctx.ss, C2, 2, Y2, w.ctx);
  assert.strictEqual(res.queued, 1); assert.strictEqual(res.family, 1);
  const q = w.sheets.Advancement_Intake1; const qh = q.rows[0]; const qr = q.appended[0];
  eq([qr[qh.indexOf('First')], qr[qh.indexOf('Last')], qr[qh.indexOf('MatchPopId')], qr[qh.indexOf('MatchType')], qr[qh.indexOf('MaidenName')], qr[qh.indexOf('Neighborhood')]],
     ['Amara', 'Davis', 'POP-00021', 'spouse', 'Keane', 'Temescal']);
});
t('a closed spot or a taken name is released at the door, not queued', () => {
  const d = darrin(); d[c2('SpouseId')] = 'POP-00777';
  const w = world2([d], [famRow()]);
  const res = E2.checkEmergencePromotions_(w.ctx.ss, C2, 2, Y2, w.ctx);
  assert.strictEqual(res.queued, 0); assert.strictEqual(res.released, 1);
  eq(w.sheets.Generic_Citizens.rows[1][g2('Status')], 'Active');
  const twin = world2([darrin(), sl2({ POPID: 'POP-00800', First: 'Amara', Last: 'Davis', Status: 'Active', BirthYear: 1990 })], [famRow()]);
  assert.strictEqual(E2.checkEmergencePromotions_(twin.ctx.ss, C2, 2, Y2, twin.ctx).released, 1);
});
t('end to end: queued, minted, wired both ways, and exactly her Family row flips', () => {
  const decoy = famRow({ FamilyOf: 'POP-00555', EmergenceCount: 0 }); // same name, someone else's family
  const w = world2([darrin()], [decoy, famRow()]);
  E2.checkEmergencePromotions_(w.ctx.ss, C2, 2, Y2, w.ctx);
  const before = w.ctx.ledger.rows.length;
  E2.processAdvancementRows_(w.ctx, 'C' + C2, C2);
  const rows = w.ctx.ledger.rows, amara = rows[before], dar = rows[0];
  assert.ok(amara, 'minted');
  eq([amara[c2('Last')], amara[c2('MaidenName')], amara[c2('SpouseId')], amara[c2('MaritalStatus')], dar[c2('SpouseId')], amara[c2('HouseholdId')], amara[c2('Neighborhood')]],
     ['Davis', 'Keane', 'POP-00021', 'married', amara[c2('POPID')], 'HH-1', 'Temescal']);
  const G = w.sheets.Generic_Citizens.rows;
  eq([G[1][g2('Status')], G[2][g2('Status')]], ['Family', 'Emerged']);
});
t('same batch: a parent\'s co-parent stroke fills the spouse spot another linked row waited on — that row is not minted', () => {
  const pa = sl2({ POPID: 'POP-00600', First: 'Pat', Last: 'Ruiz', Tier: 4, Status: 'Active', BirthYear: Y2 - 40, Neighborhood: 'Temescal', MaritalStatus: 'married', NumChildren: 1, ChildrenIds: '["POP-00601"]', Gender: 'male', HouseholdId: 'HH-2' });
  const kid = sl2({ POPID: 'POP-00601', First: 'Lu', Last: 'Ruiz', Tier: 4, Status: 'Active', BirthYear: Y2 - 9, Neighborhood: 'Temescal', MaritalStatus: 'youth', ParentIds: '["POP-00600"]', HouseholdId: 'HH-2' });
  const mom = famRow({ First: 'Ines', Last: 'Ruiz', MaidenName: 'Vo', FamilyOf: 'POP-00601', FamilyRole: 'parent', BirthYear: Y2 - 38 });
  const wife = famRow({ First: 'Joy', Last: 'Ruiz', MaidenName: 'Ng', FamilyOf: 'POP-00600', FamilyRole: 'spouse', BirthYear: Y2 - 39 });
  const w = world2([pa, kid], [mom, wife]);
  assert.strictEqual(E2.checkEmergencePromotions_(w.ctx.ss, C2, 2, Y2, w.ctx).family, 2);
  const before = w.ctx.ledger.rows.length;
  logs2.length = 0;
  E2.processAdvancementRows_(w.ctx, 'C' + C2, C2);
  const rows = w.ctx.ledger.rows;
  assert.strictEqual(rows.length, before + 1, 'one minted, not two');
  eq([rows[0][c2('SpouseId')], rows[before][c2('First')]], [rows[before][c2('POPID')], 'Ines']);
  assert.ok(logs2.some(m => /Joy Ruiz — the spouse spot of POP-00600 closed in this batch; not minted/.test(m)));
  eq(w.sheets.Generic_Citizens.rows[2][g2('Status')], 'Family'); // released by the next family pass
  const next = world2(w.ctx.ledger.rows, w.sheets.Generic_Citizens.rows.slice(1), () => 0.99);
  E2.checkFamilyMatchPromotions_(next.ctx, C2 + 1);
  eq(next.sheets.Generic_Citizens.rows[2][g2('Last')], 'Ng');
});
t('media naming a linked member is usage: the GC index admits Family rows', () => {
  assert.ok(/!== 'Active' && String\(r\[gStatusCol\] \|\| ''\) !== 'Family'\) return false;/.test(src('phase05-citizens/processAdvancementIntake.js')));
  assert.ok(/if \(gsSt !== 'active' && gsSt !== 'family'\) continue;/.test(src('phase05-citizens/generateCitizensEvents.js')));
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
