/**
 * engine.302 cut 1 — the five marital statuses, the courting door, no hood gate on forming a bond.
 * Plan: docs/plans/2026-10-08-engine-286-game-of-life-events.md §Bench soak (rulings 1–7, cut 1 design A–F,
 * codex plan review folded). Loads the real engine files whole (the householdReconcile.test.js pattern).
 *
 *   D1  derivation, both mirrors: a minor is youth with 0 children; no partnered ever; an adult's status is the
 *       old draw with partnered read as married; NumChildren for married = the old partnered/married row
 *   D2  lib/ and utilities/ mirrors agree seed for seed
 *   N1  a newborn row reads youth
 *   Y1  the 18th year: 17 stays youth, 18 turns single, an adult's other status is untouched
 *   W1  widowing: the survivor's own pointer + married → widowed, SpouseId kept; a deceased-side pointer alone,
 *       a non-married survivor, a deceased row — untouched; triggerDeathCascade_ ends in the widowing call
 *   C1  bondCanCourt_: single / divorced / widowed yes; married / youth / blank no; a live reciprocal married
 *       SpouseId refuses
 *   B1  detectNewBonds_: same hood → NEIGHBOR "Neighbors in"; adjacent → NEIGHBOR across the line; far → NEIGHBOR
 *       with no hood, "Crossed paths in the city", last in the chain; adjacency missing → throws
 *   R1  remarriage: the joiner's own minor moves into the joined household with them; the head's child stays
 *
 * Run: node scripts/engine302Marital.test.js
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.safeRand_ = (ctx) => ctx.rng;
global.hoodNamesWithScene_ = () => [];
global.nextPopIdLocked_ = () => 'POP-09999';

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const R = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const CAL_SRC = R('../phase01-config/advanceSimulationCalendar.js');
const load = (rel, names, extra, pre) => new Function(CAL_SRC + '\n' + (pre || []).map(R).join('\n') + '\n' + R(rel) + '\n' + (extra || '') + '\nreturn {' + names.join(',') + '};')();

// ── D1 / D2 derivation ─────────────────────────────────────────────────────────
const U = load('../utilities/citizenDerivation.js', ['deriveMaritalStatus_', 'deriveNumChildren_', 'rand01_', 'pickFromCDF_', 'ageBracket_']);
const L = require('../lib/citizenDerivation.js');
const OLD_MS = { // the pre-engine.302 table, frozen for the old -> new mapping
  '18-29': [['single', 0.60], ['partnered', 0.78], ['married', 0.98], ['divorced', 1.00]],
  '30-44': [['single', 0.24], ['partnered', 0.35], ['married', 0.91], ['divorced', 1.00]],
  '45-59': [['single', 0.12], ['partnered', 0.17], ['married', 0.73], ['divorced', 0.96], ['widowed', 1.00]],
  '60-74': [['single', 0.09], ['partnered', 0.12], ['married', 0.61], ['divorced', 0.86], ['widowed', 1.00]],
  '75+':   [['single', 0.06], ['partnered', 0.08], ['married', 0.44], ['divorced', 0.64], ['widowed', 1.00]]
};
const oldMs = (seed, age) => U.pickFromCDF_(U.rand01_(seed, 'MaritalStatus'), OLD_MS[U.ageBracket_(age)]);
let minorBad = 0, partneredSeen = 0, adultMismatch = 0, kidsMismatch = 0, mirrorMismatch = 0, oldPartnered = 0, n = 0;
for (let i = 0; i < 5000; i++) {
  const seed = 'Seed' + i + '|Last|POP-' + i;
  for (const age of [0, 5, 12, 17, 18, 22, 29, 30, 44, 45, 59, 60, 74, 75, 90]) {
    n++;
    const ms = U.deriveMaritalStatus_(seed, age), kids = U.deriveNumChildren_(seed, age, ms);
    if (ms === 'partnered') partneredSeen++;
    if (age < 18) { if (ms !== 'youth' || kids !== 0) minorBad++; }
    else {
      const o = oldMs(seed, age); if (o === 'partnered') oldPartnered++;
      if (ms !== (o === 'partnered' ? 'married' : o)) adultMismatch++;
      if (ms === 'married' && kids !== U.deriveNumChildren_(seed, age, 'married')) kidsMismatch++;
    }
    if (L.deriveMaritalStatus(seed, age) !== ms || L.deriveNumChildren(seed, age, ms) !== kids) mirrorMismatch++;
  }
}
assert('D1 every minor draws youth with 0 children', minorBad === 0, minorBad + ' bad');
assert('D1 no draw reads partnered', partneredSeen === 0, partneredSeen + ' seen');
assert('D1 adult draw = old draw with partnered → married (old table drew partnered ' + oldPartnered + 'x)', adultMismatch === 0 && oldPartnered > 0, adultMismatch + ' mismatches');
assert('D1 NumChildren deterministic for married', kidsMismatch === 0);
assert('D2 lib/ mirror agrees with utilities/ on ' + n + ' draws', mirrorMismatch === 0, mirrorMismatch + ' mismatches');

// ── N1 / Y1 / W1 generational engine ───────────────────────────────────────────
const G = load('../phase04-events/generationalEventsEngine.js', ['createChildRow_', 'youthComesOfAge_', 'widowSurvivingSpouse_']);
const GH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Neighborhood', 'HouseholdId', 'MaritalStatus', 'SpouseId',
  'Gender', 'Income', 'NumChildren', 'EducationLevel', 'ParentIds', 'ChildrenIds', 'LifeHistory', 'RoleType', 'Tier', 'ClockMode', 'OrginCity'];
const g = n => GH.indexOf(n);
const grow = (pop, o) => { const r = GH.map(() => ''); r[g('POPID')] = pop; r[g('Last')] = 'Vale'; r[g('Status')] = o.status || 'Active';
  r[g('BirthYear')] = o.by || 1990; r[g('MaritalStatus')] = o.m || 'single'; r[g('SpouseId')] = o.sp || ''; r[g('Neighborhood')] = 'Downtown'; return r; };
{
  const ctx = { ledger: { headers: GH, rows: [grow('POP-00100', { m: 'married' })], dirty: false }, summary: { simYear: 2042, cycleId: 113 }, config: { cycleCount: 113 }, _rng: () => 0.3 };
  G.createChildRow_(ctx, 0, 113);
  const kid = ctx.ledger.rows[1];
  assert('N1 a newborn row reads youth', kid && kid[g('MaritalStatus')] === 'youth', kid && kid[g('MaritalStatus')]);
}
{
  const a = grow('POP-1', { m: 'youth' }), b = grow('POP-2', { m: 'youth' }), c = grow('POP-3', { m: 'divorced' }), d = grow('POP-4', { m: 'youth' });
  const r17 = G.youthComesOfAge_(a, g('MaritalStatus'), 2025, 17), r18 = G.youthComesOfAge_(b, g('MaritalStatus'), 2024, 18);
  const rOther = G.youthComesOfAge_(c, g('MaritalStatus'), 1990, 52), rNoBy = G.youthComesOfAge_(d, g('MaritalStatus'), 0, 0);
  assert('Y1 17 stays youth', !r17 && a[g('MaritalStatus')] === 'youth');
  assert('Y1 18 turns single', r18 && b[g('MaritalStatus')] === 'single');
  assert('Y1 an adult reading divorced is untouched', !rOther && c[g('MaritalStatus')] === 'divorced');
  assert('Y1 no BirthYear: never classified', !rNoBy && d[g('MaritalStatus')] === 'youth');
  const gsrc = R('../phase04-events/generationalEventsEngine.js');
  const loopAt = gsrc.indexOf('if (youthComesOfAge_(row, iMarital, birthYear, age)) updatedRows[r] = true;');
  assert('Y1 the flip sits after the skip list and before the health branch', loopAt > gsrc.indexOf('status === "traded" || status === "pending") continue;') && loopAt < gsrc.indexOf('// HEALTH STATUS LIFECYCLE'));
}
{
  const dead = grow('POP-10', { m: 'married', sp: 'POP-11 Ana Vale', status: 'deceased' });
  const survivor = grow('POP-11', { m: 'married', sp: 'POP-10 Rui Vale' });
  const oneWay = grow('POP-12', { m: 'married', sp: 'POP-99 Someone' });       // the deceased-side pointer below names 12
  const divorcedEx = grow('POP-13', { m: 'divorced', sp: 'POP-10 Rui Vale' });
  const dead2 = grow('POP-20', { m: 'married', sp: 'POP-12 X', status: 'deceased' });
  const ctx = { ledger: { headers: GH, rows: [dead, survivor, oneWay, divorcedEx, dead2], dirty: false } };
  const n1 = G.widowSurvivingSpouse_(ctx, 'POP-10'), n2 = G.widowSurvivingSpouse_(ctx, 'POP-20');
  assert('W1 survivor with own pointer + married → widowed', survivor[g('MaritalStatus')] === 'widowed' && n1 === 1);
  assert('W1 SpouseId kept on the widow', survivor[g('SpouseId')] === 'POP-10 Rui Vale');
  assert('W1 a deceased-side pointer alone widows nobody', oneWay[g('MaritalStatus')] === 'married' && n2 === 0);
  assert('W1 a non-married row pointing at the deceased is untouched', divorcedEx[g('MaritalStatus')] === 'divorced');
  assert('W1 the deceased row itself is untouched', dead[g('MaritalStatus')] === 'married');
  const gsrc = R('../phase04-events/generationalEventsEngine.js');
  const casc = gsrc.slice(gsrc.indexOf('function triggerDeathCascade_('), gsrc.indexOf('function widowSurvivingSpouse_('));
  assert('W1 triggerDeathCascade_ ends in widowSurvivingSpouse_', /widowSurvivingSpouse_\(ctx, deceasedId\);\n\}\n/.test(casc));
  assert('W1 both death paths reach triggerDeathCascade_', (gsrc.match(/triggerDeathCascade_\(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext\)/g) || []).length === 2);
}

// ── C1 / B1 / R1 bond engine ───────────────────────────────────────────────────
const B = load('../phase05-citizens/bondEngine.js', ['bondCanCourt_', 'detectNewBonds_', 'marryCitizens_', 'BOND_TYPES'],
  'bondWarmthFactor_ = function () { return 1; };', ['../utilities/safeRand.js', '../phase05-citizens/bondPersistence.js']);
{
  const people = { 'POP-1': { marital: 'single' }, 'POP-2': { marital: 'divorced' }, 'POP-3': { marital: 'widowed', spouse: 'POP-9' },
    'POP-4': { marital: 'married' }, 'POP-5': { marital: 'youth' }, 'POP-6': { marital: '' },
    'POP-7': { marital: 'divorced', spouse: 'POP-8' }, 'POP-8': { marital: 'married', spouse: 'POP-7' } };
  const yes = ['POP-1', 'POP-2', 'POP-3'].every(p => B.bondCanCourt_(people, p));
  const no = ['POP-4', 'POP-5', 'POP-6', 'POP-7', 'POP-404'].every(p => !B.bondCanCourt_(people, p));
  assert('C1 single / divorced / widowed (late spouse off the ledger) can court', yes);
  assert('C1 married / youth / blank / unknown / live reciprocal married spouse cannot', no);
}
function bondCtx(hoodA, hoodB, rngValue, opts) {
  opts = opts || {};
  const lookup = {
    'Ana Vale': { Name: 'Ana Vale', Neighborhood: hoodA, Occupation: 'Accountant', BirthYear: 1990 },
    'Ben Roe':  { Name: 'Ben Roe',  Neighborhood: hoodB, Occupation: 'Florist', BirthYear: 1991 }
  };
  const summary = { cycleId: 113, simYear: 2042, relationshipBonds: [], eventArcs: [],
    neighborhoodAdjacency: opts.noAdj ? undefined : { Downtown: ['Uptown'], Uptown: ['Downtown'], Laurel: [] } };
  return { summary, config: { cycleCount: 113 }, rng: () => rngValue, _bondActivePool: ['Ana Vale', 'Ben Roe'], _bondNameLookup: lookup,
    neighborhoodList: ['Downtown', 'Uptown', 'Laurel'], bondCalendarContext: {}, _bondKeySet: {} };
}
{
  const same = B.detectNewBonds_(bondCtx('Downtown', 'Downtown', 0.17));
  assert('B1 same hood → NEIGHBOR "Neighbors in Downtown"', same.length === 1 && same[0].bondType === 'neighbor' && /Neighbors in Downtown/.test(same[0].notes), JSON.stringify(same[0] || null));
  const adj = B.detectNewBonds_(bondCtx('Downtown', 'Uptown', 0.17));
  assert('B1 adjacent hood → NEIGHBOR across the line', adj.length === 1 && adj[0].bondType === 'neighbor' && /across the Downtown–Uptown line/.test(adj[0].notes), JSON.stringify(adj[0] || null));
  const adjFric = B.detectNewBonds_(bondCtx('Downtown', 'Uptown', 0.1));
  assert('B1 adjacent pair reaches the friction lane first (TENSION)', adjFric.length === 1 && adjFric[0].bondType === 'tension');
  const far = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', 0.17));
  assert('B1 far pair → NEIGHBOR with no hood, "Crossed paths in the city"', far.length === 1 && far[0].bondType === 'neighbor' && !far[0].neighborhood && /Crossed paths in the city/.test(far[0].notes), JSON.stringify(far[0] || null));
  const farFric = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', 0.1));
  assert('B1 far pair never takes the friction lane (no proximity, no shared trade)', farFric.length === 1 && farFric[0].bondType === 'neighbor');
  const none = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', 0.5));
  assert('B1 a missed draw forms nothing', none.length === 0);
  let threw = false; try { B.detectNewBonds_(bondCtx('Downtown', 'Laurel', 0.17, { noAdj: true })); } catch (e) { threw = /neighborhoodAdjacency/.test(e.message); }
  assert('B1 missing adjacency throws (sheet truth, no fallback)', threw);
}
{
  const LH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'HouseholdId', 'MaritalStatus', 'SpouseId', 'ParentIds', 'LifeHistory', 'LastUpdated'];
  const l = n => LH.indexOf(n);
  const lrow = (pop, first, by, hh, m, parents) => { const r = LH.map(() => ''); r[l('POPID')] = pop; r[l('First')] = first; r[l('Last')] = 'X';
    r[l('Status')] = 'Active'; r[l('BirthYear')] = by; r[l('HouseholdId')] = hh; r[l('MaritalStatus')] = m; r[l('ParentIds')] = JSON.stringify(parents || []); return r; };
  const rows = [lrow('POP-A', 'Ana', 1990, 'HH-A', 'widowed'), lrow('POP-AK', 'Kid', 2032, 'HH-A', 'youth', ['POP-A']),
    lrow('POP-B', 'Ben', 1989, 'HH-B', 'divorced'), lrow('POP-BK', 'Kid', 2034, 'HH-B', 'youth', ['POP-B'])];
  const HH = [['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Status'],
    ['HH-A', 'POP-A', 'family', JSON.stringify(['POP-A', 'POP-AK']), 'active'], ['HH-B', 'POP-B', 'family', JSON.stringify(['POP-B', 'POP-BK']), 'active']];
  const FR = [['HouseholdId', 'Husband', 'Wife', 'Type', 'Cycle', 'Status', 'c1', 'c2', 'c3', 'c4', 'c5']];
  const sheet = v => ({ getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }), getLastColumn: () => v[0].length,
    getRange: (r, c) => ({ setValue: x => { v[r - 1][c - 1] = x; }, getValues: () => [v[r - 1].slice()] }), appendRow: x => v.push(x) });
  const ctx = { ledger: { headers: LH, rows, dirty: false }, summary: { cycleId: 113, simYear: 2042, storyHooks: [] }, config: { cycleCount: 113 }, rng: () => 0.5,
    ss: { getSheetByName: n => n === 'Household_Ledger' ? sheet(HH) : (n === 'Family_Relationships' ? sheet(FR) : null) } };
  const A = { idx: 0, name: 'Ana X', householdId: 'HH-A', hood: 'Downtown', gender: 'female', tier: 4, income: 1 };
  const Bp = { idx: 2, name: 'Ben X', householdId: 'HH-B', hood: 'Uptown', gender: 'male', tier: 4, income: 1 };
  B.marryCitizens_(ctx, { citizenA: 'POP-A', citizenB: 'POP-B', notes: '' }, A, Bp, 113);
  const memA = JSON.parse(HH[1][3]);
  assert('R1 both read married', rows[0][l('MaritalStatus')] === 'married' && rows[2][l('MaritalStatus')] === 'married');
  assert('R1 the joiner moves in', rows[2][l('HouseholdId')] === 'HH-A' && memA.indexOf('POP-B') >= 0);
  assert('R1 the joiner\'s own child moves with them', rows[3][l('HouseholdId')] === 'HH-A' && memA.indexOf('POP-BK') >= 0, rows[3][l('HouseholdId')] + ' ' + HH[1][3]);
  assert('R1 the head\'s child stays, gaining the joiner as a parent', rows[1][l('HouseholdId')] === 'HH-A' && JSON.parse(rows[1][l('ParentIds')]).indexOf('POP-B') >= 0);
}

console.log(`\nengine302Marital: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
