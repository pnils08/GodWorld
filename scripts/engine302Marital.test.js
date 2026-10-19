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
 *   cut 2 (rulings 8, 9, 11, 12; codex plan review folded):
 *   E1  no ceiling: 40 citizens who all meet form 39 bonds (the old cap was 2–4); a reverse pair runs once
 *   E2  the meeting chance gates and the calendar factor is the largest that applies, never multiplied;
 *       sociability scales it; an already-bonded pair spends the meeting
 *   P1  deepening: a neighbor at 6+ in a shared week → friendship with one Bond line each side; one side absent
 *       → no flip; FAMILY never flips; a just-deepened bond does not turn romantic the same week
 *   A1  the wedding window 24–58: a romance at 57 marries, at 59 waits
 *   G1  GC courtship: the matured wedding marries the one Courting row of that name (not a same-name active
 *       row), writes UNI/MED/CIV no; two Courting rows of one name → no wedding; out of the window → waits;
 *       the start draws an aligned GC, near hood first, else the city; none aligned → nothing
 *   cut 3 (ruling 10): DV1–DV12 divorce on 3 crisis kinds inside 13 Cycles with a major loss — never on one
 *       issue, a stale or future mark, a marriage made this week, a widow; the couple's union; who stays
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
const OLD_NC_COUPLED = { '18-29': [[0, 0.62], [1, 0.85], [2, 0.95], [3, 1.00]], '30-44': [[0, 0.32], [1, 0.58], [2, 0.82], [3, 0.95], [4, 1.00]],
  '45-59': [[0, 0.16], [1, 0.40], [2, 0.72], [3, 0.90], [4, 0.98], [5, 1.00]], '60-74': [[0, 0.14], [1, 0.36], [2, 0.66], [3, 0.86], [4, 0.96], [5, 1.00]],
  '75+': [[0, 0.13], [1, 0.34], [2, 0.64], [3, 0.85], [4, 0.96], [5, 1.00]] }; // the old '-partnered' rows (married and partnered both read them)
const oldNcCoupled = (seed, age) => U.pickFromCDF_(U.rand01_(seed, 'NumChildren'), OLD_NC_COUPLED[U.ageBracket_(age)]);
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
      if (o === 'partnered' || o === 'married') { if (U.deriveNumChildren_(seed, age, 'married') !== oldNcCoupled(seed, age)) kidsMismatch++; }
    }
    if (L.deriveMaritalStatus(seed, age) !== ms || L.deriveNumChildren(seed, age, ms) !== kids) mirrorMismatch++;
  }
}
assert('D1 every minor draws youth with 0 children', minorBad === 0, minorBad + ' bad');
assert('D1 no draw reads partnered', partneredSeen === 0, partneredSeen + ' seen');
assert('D1 adult draw = old draw with partnered → married (old table drew partnered ' + oldPartnered + 'x)', adultMismatch === 0 && oldPartnered > 0, adultMismatch + ' mismatches');
assert('D1 a married draw has the children the old partnered/married row gave (frozen table)', kidsMismatch === 0, kidsMismatch + ' mismatches');
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
global.__SOC = {};
const B = load('../phase05-citizens/bondEngine.js', ['bondCanCourt_', 'detectNewBonds_', 'marryCitizens_', 'BOND_TYPES', 'updateExistingBonds_',
  'processRomanceAndMarriage_', 'processGCCourtship_', 'BOND_ENCOUNTER_CHANCE', 'getBondKey_'],
  'bondWarmthFactor_ = function () { return 1; }; bondFamilyFactor_ = function () { return 1; }; bondDialBand_ = function (ctx, p) { return global.__SOC[p] || 0; }; var __bid = 0; generateBondId_ = function () { return "BOND-T" + (++__bid); };',
  ['../utilities/safeRand.js', '../phase05-citizens/bondPersistence.js', '../phase04-events/generationalEventsEngine.js']);
const seq = (arr, rest) => { const q = arr.slice(); return () => (q.length ? q.shift() : (rest === undefined ? 0.99 : rest)); };
{
  const people = { 'POP-1': { marital: 'single' }, 'POP-2': { marital: 'divorced' }, 'POP-3': { marital: 'widowed', spouse: 'POP-9' },
    'POP-4': { marital: 'married' }, 'POP-5': { marital: 'youth' }, 'POP-6': { marital: '' },
    'POP-7': { marital: 'divorced', spouse: 'POP-8' }, 'POP-8': { marital: 'married', spouse: 'POP-7' } };
  const yes = ['POP-1', 'POP-2', 'POP-3'].every(p => B.bondCanCourt_(people, p));
  const no = ['POP-4', 'POP-5', 'POP-6', 'POP-7', 'POP-404'].every(p => !B.bondCanCourt_(people, p));
  assert('C1 single / divorced / widowed (late spouse off the ledger) can court', yes);
  assert('C1 married / youth / blank / unknown / live reciprocal married spouse cannot', no);
}
function bondCtx(hoodA, hoodB, rngFn, opts) {
  opts = opts || {};
  const lookup = {
    'Ana Vale': { Name: 'Ana Vale', Neighborhood: hoodA, Occupation: 'Accountant', BirthYear: 1990 },
    'Ben Roe':  { Name: 'Ben Roe',  Neighborhood: hoodB, Occupation: 'Florist', BirthYear: 1991 }
  };
  const summary = { cycleId: 113, simYear: 2042, relationshipBonds: [], eventArcs: [],
    neighborhoodAdjacency: opts.noAdj ? undefined : { Downtown: ['Uptown'], Uptown: ['Downtown'], Laurel: [] } };
  return { summary, config: { cycleCount: 113 }, rng: typeof rngFn === 'function' ? rngFn : () => rngFn, _bondActivePool: ['Ana Vale', 'Ben Roe'], _bondNameLookup: lookup,
    neighborhoodList: ['Downtown', 'Uptown', 'Laurel'], bondCalendarContext: {}, _bondKeySet: {} };
}
{
  const same = B.detectNewBonds_(bondCtx('Downtown', 'Downtown', seq([0.05, 0, 0.17, 0.17])));
  assert('B1 same hood → NEIGHBOR "Neighbors in Downtown"', same.length === 1 && same[0].bondType === 'neighbor' && /Neighbors in Downtown/.test(same[0].notes), JSON.stringify(same[0] || null));
  const adj = B.detectNewBonds_(bondCtx('Downtown', 'Uptown', seq([0.05, 0, 0.17, 0.17])));
  assert('B1 adjacent hood → NEIGHBOR across the line', adj.length === 1 && adj[0].bondType === 'neighbor' && /across the Downtown–Uptown line/.test(adj[0].notes), JSON.stringify(adj[0] || null));
  const adjFric = B.detectNewBonds_(bondCtx('Downtown', 'Uptown', seq([0.05, 0, 0.1, 0.1])));
  assert('B1 adjacent pair reaches the friction lane first (TENSION)', adjFric.length === 1 && adjFric[0].bondType === 'tension');
  const far = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', seq([0.05, 0, 0.17, 0.17])));
  assert('B1 far pair → NEIGHBOR with no hood, "Crossed paths in the city"', far.length === 1 && far[0].bondType === 'neighbor' && !far[0].neighborhood && /Crossed paths in the city/.test(far[0].notes), JSON.stringify(far[0] || null));
  const farFric = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', seq([0.05, 0, 0.1, 0.1])));
  assert('B1 far pair never takes the friction lane (no proximity, no shared trade)', farFric.length === 1 && farFric[0].bondType === 'neighbor');
  const none = B.detectNewBonds_(bondCtx('Downtown', 'Laurel', seq([0.05, 0, 0.5, 0.5])));
  assert('B1 a missed draw forms nothing', none.length === 0);
  let threw = false; try { B.detectNewBonds_(bondCtx('Downtown', 'Laurel', seq([0.05, 0, 0.17]), { noAdj: true })); } catch (e) { threw = /neighborhoodAdjacency/.test(e.message); }
  assert('B1 missing adjacency throws (sheet truth, no fallback)', threw);
}
{
  const LH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'HouseholdId', 'MaritalStatus', 'SpouseId', 'ParentIds', 'LifeHistory', 'LastUpdated'];
  const l = n => LH.indexOf(n);
  const lrow = (pop, first, by, hh, m, parents) => { const r = LH.map(() => ''); r[l('POPID')] = pop; r[l('First')] = first; r[l('Last')] = 'X';
    r[l('Status')] = 'Active'; r[l('BirthYear')] = by; r[l('HouseholdId')] = hh; r[l('MaritalStatus')] = m; r[l('ParentIds')] = JSON.stringify(parents || []); return r; };
  const rows = [lrow('POP-A', 'Ana', 1990, 'HH-A', 'widowed'), lrow('POP-AK', 'Kid', 2032, 'HH-A', 'youth', ['POP-A']),
    lrow('POP-B', 'Ben', 1989, 'HH-B', 'divorced'), lrow('POP-BK', 'Kid', 2034, 'HH-B', 'youth', ['POP-B']),
    lrow('POP-AK2', 'Kid2', 2033, 'HH-A', 'youth', ['POP-A', 'POP-LATE'])];
  const HH = [['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Status'],
    ['HH-A', 'POP-A', 'family', JSON.stringify(['POP-A', 'POP-AK', 'POP-AK2']), 'active'], ['HH-B', 'POP-B', 'family', JSON.stringify(['POP-B', 'POP-BK', 'POP-BX']), 'active']];
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
  assert('R1 a child who already lists two parents gains no third', JSON.parse(rows[4][l('ParentIds')]).length === 2);
  const rows2 = [lrow('POP-A', 'Ana', 1990, 'HH-A', 'widowed'), lrow('POP-AK', 'Kid', 2032, 'HH-A', 'youth', ['POP-A']),
    lrow('POP-B', 'Ben', 1989, 'HH-B', 'divorced'), lrow('POP-BK', 'Kid', 2034, 'HH-B', 'youth', ['POP-B'])];
  const HH2 = [['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Status'],
    ['HH-A', 'POP-A', 'family', JSON.stringify(['POP-A', 'POP-AK']), 'active'], ['HH-B', 'POP-B', 'family', JSON.stringify(['POP-B', 'POP-BK']), 'active']];
  const failing = v => ({ getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }), getLastColumn: () => v[0].length,
    getRange: () => ({ setValue: () => { throw new Error('quota'); }, getValues: () => [v[0].slice()] }), appendRow: () => {} });
  const ctx2 = { ledger: { headers: LH, rows: rows2, dirty: false }, summary: { cycleId: 113, simYear: 2042, storyHooks: [] }, config: { cycleCount: 113 }, rng: () => 0.5,
    ss: { getSheetByName: n => n === 'Household_Ledger' ? failing(HH2) : null } };
  let threw2 = false; try { B.marryCitizens_(ctx2, { citizenA: 'POP-A', citizenB: 'POP-B', notes: '' }, Object.assign({}, A, { idx: 0 }), Object.assign({}, Bp, { idx: 2 }), 113); } catch (e) { threw2 = true; }
  assert('R1 a destination write that throws moves no child (the write comes first)', threw2 && rows2[3][l('HouseholdId')] === 'HH-B');
  assert('R1 the old row is left to the same Cycle\'s reconcile (no direct write); the ledger carries the move', HH[2][3] === JSON.stringify(['POP-B', 'POP-BK', 'POP-BX']) && rows[2][l('HouseholdId')] === 'HH-A' && rows[3][l('HouseholdId')] === 'HH-A');
}

// ── E1 / E2 encounters (cut 2, ruling 8) ───────────────────────────────────────
function poolCtx(n, rngFn, cal) {
  const lookup = {}, pool = [];
  for (let i = 0; i < n; i++) { const nm = 'Cit Zen' + i; pool.push(nm); lookup[nm] = { Name: nm, Neighborhood: 'Downtown', Occupation: 'Accountant', BirthYear: 1990 }; }
  return { summary: { cycleId: 113, simYear: 2042, relationshipBonds: [], eventArcs: [], neighborhoodAdjacency: { Downtown: [] }, sportsCity: cal && cal.sportsTop ? { band: 'top' } : {} },
    config: { cycleCount: 113 }, rng: rngFn, _bondActivePool: pool, _bondNameLookup: lookup, neighborhoodList: ['Downtown'],
    bondCalendarContext: Object.assign({}, cal || {}), _bondKeySet: {} };
}
{
  const many = B.detectNewBonds_(poolCtx(40, () => 0.01));
  assert('E1 no ceiling: 40 citizens who all meet form 39 bonds (the old cap was 2–4)', many.length === 39, many.length);
  const keys = new Set(many.map(b => [b.citizenA, b.citizenB].sort().join('|')));
  assert('E1 every met pair forms at most once (the reverse meeting is spent)', keys.size === many.length);
  const both = B.detectNewBonds_(poolCtx(2, () => 0.01));
  assert('E1 two citizens who each meet the other form one bond (the reverse meeting is spent)', both.length === 1);
  assert('E2 the starting meeting chance is 0.1 (the builder\'s dial)', B.BOND_ENCOUNTER_CHANCE === 0.1);
  assert('E2 sports band top alone ×1.5 (0.14 meets, 0.16 does not)',
    B.detectNewBonds_(poolCtx(10, () => 0.14, { sportsTop: true })).length > 0 && B.detectNewBonds_(poolCtx(10, () => 0.16, { sportsTop: true })).length === 0);
  assert('E2 a draw at 0.15 meets nobody on an ordinary week', B.detectNewBonds_(poolCtx(10, () => 0.15)).length === 0);
  assert('E2 a major holiday doubles the chance (0.15 < 0.2)', B.detectNewBonds_(poolCtx(10, () => 0.15, { holiday: 'Thanksgiving', holidayPriority: 'major' })).length > 0);
  assert('E2 holiday + First Friday + sports top is ×2, never multiplied (0.25 meets nobody)',
    B.detectNewBonds_(poolCtx(10, () => 0.25, { holiday: 'Thanksgiving', holidayPriority: 'major', isFirstFriday: true, sportsTop: true })).length === 0);
  assert('E2 First Friday alone ×1.5 (0.14 meets, 0.16 does not)',
    B.detectNewBonds_(poolCtx(10, () => 0.14, { isFirstFriday: true })).length > 0 && B.detectNewBonds_(poolCtx(10, () => 0.16, { isFirstFriday: true })).length === 0);
  global.__SOC = { 'Cit Zen0': 2 };
  const soc = B.detectNewBonds_(poolCtx(2, seq([0.11, 0, 0.01], 0.99)));
  global.__SOC = {};
  const plain = B.detectNewBonds_(poolCtx(2, seq([0.11, 0, 0.01], 0.99)));
  assert('E2 a magnetic citizen (sociability +2, ×1.25) meets at 0.11; an average one does not', soc.length === 1 && plain.length === 0);
  const known = poolCtx(2, () => 0.01); known._bondKeySet['Cit Zen0|Cit Zen1'] = true; known._bondKeySet['Cit Zen1|Cit Zen0'] = true;
  assert('E2 an already-bonded pair spends the meeting', B.detectNewBonds_(known).length === 0);
}

// ── P1 deepening (cut 2, ruling 9) ─────────────────────────────────────────────
function deepCtx(bonds, active) {
  const LH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'MaritalStatus', 'Gender', 'Neighborhood', 'LifeHistory', 'LastUpdated'];
  const rows = ['POP-01', 'POP-02', 'POP-03', 'POP-04'].map((p, i) => [p, 'F' + i, 'L' + i, 'Active', 1990, 'single', i % 2 ? 'male' : 'female', 'Downtown', '', '']);
  return { ledger: { headers: LH, rows, dirty: false }, summary: { cycleId: 113, simYear: 2042, relationshipBonds: bonds, eventArcs: [] },
    config: { cycleCount: 113 }, rng: () => 0.99, _bondActivePool: active, bondCalendarContext: {}, LH };
}
const bondRow = (id, a, b, type, intensity, hood) => ({ bondId: id, citizenA: a, citizenB: b, bondType: type, intensity, status: 'active', neighborhood: hood === undefined ? 'Downtown' : hood, cycleCreated: 100, lastUpdate: 100, notes: '' });
{
  const nb = bondRow('B1', 'POP-01', 'POP-02', 'neighbor', 5.9);
  const pr = bondRow('B2', 'POP-03', 'POP-04', 'professional', 5.8);
  const fam = bondRow('B3', 'POP-01', 'POP-03', 'family', 9);
  const ctx = deepCtx([nb, pr, fam], ['POP-01', 'POP-02', 'POP-03']);   // POP-04 not in the pool: B2 is one-sided
  B.updateExistingBonds_(ctx);
  const lh = r => String(ctx.ledger.rows[r][ctx.LH.indexOf('LifeHistory')] || '');
  assert('P1 a neighbor grows 0.4 on a shared week and deepens at 6 → friendship', nb.bondType === 'friendship' && nb.intensity >= 6 && /Deepened into friendship C113/.test(nb.notes), nb.bondType + ' ' + nb.intensity);
  assert('P1 one Bond line on each side', (lh(0).match(/went from neighbor to friend/g) || []).length === 1 && (lh(1).match(/went from neighbor to friend/g) || []).length === 1, lh(0) + ' / ' + lh(1));
  assert('P1 one side absent → no flip (and the bond fades)', pr.bondType === 'professional' && pr.intensity < 5.8);
  assert('P1 FAMILY never flips', fam.bondType === 'family');
  ctx._bondActivePool = ['POP-01', 'POP-02', 'POP-03', 'POP-04'];
  B.updateExistingBonds_(ctx);
  assert('P1 a deepened bond flips once (same ledger, a second shared week: still one line)', (lh(0).match(/went from neighbor to friend/g) || []).length === 1);
  const fest = bondRow('B4', 'POP-01', 'POP-04', 'festival', 5.8); const fctx = deepCtx([fest], ['POP-01']); fctx.bondCalendarContext = { holiday: 'Thanksgiving' };
  B.updateExistingBonds_(fctx);
  assert('P1 a holiday boost alone (one side absent) never deepens a festival bond', fest.bondType === 'festival');
  const fest2 = bondRow('B5', 'POP-01', 'POP-02', 'festival', 5.8); const f2 = deepCtx([fest2], ['POP-01', 'POP-02']); f2.bondCalendarContext = { holiday: 'Thanksgiving' };
  B.updateExistingBonds_(f2);
  assert('P1 a festival bond at 6+ in a shared week deepens', fest2.bondType === 'friendship');
  const lone = bondRow('B6', 'POP-01', 'POP-77', 'professional', 5.9); const lctx = deepCtx([lone], ['POP-01', 'POP-77']);
  B.updateExistingBonds_(lctx);
  assert('P1 a partner missing from the ledger: the present side still gets its line', lone.bondType === 'friendship' && /POP-77 became a real friend/.test(String(lctx.ledger.rows[0][lctx.LH.indexOf('LifeHistory')])));
  const romCtx = bond => { const c = deepCtx([bond], ['POP-01', 'POP-02']); c.rng = () => 0; c._bondNameLookup = {};
    c._bondCompatByKey = {}; c._bondCompatByKey[B.getBondKey_(bond.citizenA, bond.citizenB)] = 10; return c; };
  nb.intensity = 7;
  B.processRomanceAndMarriage_(romCtx(nb));
  assert('P1 a bond deepened this week does not turn romantic the same week', nb.bondType === 'friendship');
  const old = bondRow('B9', 'POP-01', 'POP-02', 'friendship', 7); old.notes = '[Deepened into friendship C112]';
  B.processRomanceAndMarriage_(romCtx(old));
  assert('P1 control: a friendship deepened last week can turn romantic', old.bondType === 'romantic');
}

// ── A1 the wedding window (cut 2, ruling 11) ───────────────────────────────────
function weddingCtx(byA, byB) {
  const LH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'MaritalStatus', 'Gender', 'SpouseId', 'HouseholdId', 'LifeHistory', 'LastUpdated'];
  const rows = [['POP-01', 'Ana', 'Vale', 'Active', byA, 'single', 'female', '', '', '', ''], ['POP-02', 'Ben', 'Roe', 'Active', byB, 'divorced', 'male', '', '', '', '']];
  const bond = bondRow('BW', 'POP-01', 'POP-02', 'romantic', 8.5);
  return { ctx: { ledger: { headers: LH, rows, dirty: false }, summary: { cycleId: 113, simYear: 2042, relationshipBonds: [bond], storyHooks: [] }, config: { cycleCount: 113 },
    rng: () => 0.5, ss: { getSheetByName: () => null }, _bondNameLookup: {} }, bond, rows, m: LH.indexOf('MaritalStatus') };
}
{
  const w57 = weddingCtx(2042 - 57, 2042 - 50); B.processRomanceAndMarriage_(w57.ctx);
  assert('A1 a grown romance at 57 marries (a divorced partner can)', w57.rows[0][w57.m] === 'married' && w57.rows[1][w57.m] === 'married');
  const w59 = weddingCtx(2042 - 59, 2042 - 50); B.processRomanceAndMarriage_(w59.ctx);
  assert('A1 at 59 the romance waits', w59.rows[0][w59.m] === 'single' && w59.bond.bondType === 'romantic');
}

// ── G1 GC courtship (cut 2, ruling 12; codex H4/H5) ────────────────────────────
function gcWorld(opts) {
  const LH = ['POPID', 'First', 'Last', 'MaidenName', 'Tier', 'RoleType', 'ClockMode', 'Status', 'BirthYear', 'OrginCity', 'Neighborhood', 'MaritalStatus', 'Gender',
    'UsageCount', 'YearsInCareer', 'CareerStage', 'Income', 'EducationLevel', 'DebtLevel', 'NetWorth', 'LifeHistory', 'SpouseId', 'HouseholdId', 'LastUpdated',
    'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)'];
  const row = LH.map(() => ''); row[LH.indexOf('POPID')] = 'POP-01'; row[LH.indexOf('First')] = 'Ana'; row[LH.indexOf('Last')] = 'Vale';
  row[LH.indexOf('Status')] = 'Active'; row[LH.indexOf('BirthYear')] = 2042 - (opts.ageA || 40); row[LH.indexOf('MaritalStatus')] = 'widowed';
  row[LH.indexOf('Gender')] = 'female'; row[LH.indexOf('Neighborhood')] = 'Downtown'; row[LH.indexOf('NetWorth')] = 0;
  const GH = ['First', 'Last', 'Age', 'BirthYear', 'Neighborhood', 'Occupation', 'Status', 'Sex'];
  const GC = [GH].concat(opts.gcs);
  const sheets = { Generic_Citizens: GC, Household_Ledger: [['HouseholdId', 'Members', 'Status']], Family_Relationships: [['HouseholdId']] };
  const sheet = v => ({ getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }), getLastColumn: () => v[0].length, getLastRow: () => v.length,
    getRange: (r, c) => ({ setValue: x => { v[r - 1][c - 1] = x; }, getValues: () => [v[r - 1].slice()] }), appendRow: x => v.push(x) });
  const bonds = opts.bond ? [bondRow('BG', 'POP-01', 'GC:' + opts.bond, 'romantic', 8.5)] : [];
  if (opts.bond && opts.stamp !== false) { // stamped as a courtship start stamps it: the first Courting row of that name
    const gi = GC.findIndex((r, i) => i > 0 && (r[0] + ' ' + r[1]) === opts.bond && r[6] === 'Courting');
    if (gi > 0) bonds[0].notes = 'Met by chance in Downtown (C100) [gc:' + GC[gi][4] + '|' + GC[gi][7] + '|r' + (gi + 1) + ']';
  }
  const ctx = { ledger: { headers: LH, rows: [row], dirty: false }, summary: { cycleId: 113, simYear: 2042, relationshipBonds: bonds, storyHooks: [], neighborhoodAdjacency: { Downtown: ['Uptown'], Uptown: ['Downtown'], Laurel: [] } },
    config: { cycleCount: 113 }, rng: opts.rng || (() => 0.99), ss: { getSheetByName: n => sheets[n] ? sheet(sheets[n]) : null }, _bondNameLookup: {} };
  return { ctx, GC, LH, rows: ctx.ledger.rows, bonds };
}
global.jobReferencePay_ = () => 60000; global.deriveYearsInCareer_ = () => 10; global.deriveEducationLevel_ = () => 'bachelors';
global.deriveDebtLevel_ = () => 0; global.deriveNetWorth_ = () => 1000; global.estimateRent_ = () => 2000;
{
  const w = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', 42, '', 'Uptown', 'Chef', 'active', 'male'], ['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(w.ctx);
  const sp = w.rows[1];
  assert('G1 the matured wedding mints the spouse', !!sp && w.rows[0][w.LH.indexOf('MaritalStatus')] === 'married');
  assert('G1 it promotes the Courting row, not the same-name active one', w.GC[2][6] === 'Promoted' && w.GC[1][6] === 'active' && sp && sp[w.LH.indexOf('RoleType')] === 'Baker');
  assert('G1 the mint writes UNI / MED / CIV no', sp && ['UNI (y/n)', 'MED (y/n)', 'CIV (y/n)'].every(k => sp[w.LH.indexOf(k)] === 'no'));
  const unst = gcWorld({ bond: 'Rui Moss', stamp: false, gcs: [['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(unst.ctx);
  assert('G1 an unstamped courtship bond fails closed — no wedding, it waits (codex A2)', unst.rows.length === 1 && unst.bonds[0].bondType === 'romantic');
  const old = gcWorld({ ageA: 60, bond: 'Rui Moss', gcs: [['Rui', 'Moss', 55, '', 'Uptown', 'Chef', 'Courting', 'male']] });
  B.processGCCourtship_(old.ctx);
  assert('G1 a matured courtship outside 24–58 waits', old.rows.length === 1);
  // start: 20% gate (0.1), single pick (0), GC pick (0)
  const near = gcWorld({ rng: seq([0.1, 0, 0]), gcs: [['Far', 'One', 42, '', 'Laurel', 'Chef', 'active', 'male'], ['Near', 'Two', 44, '', 'Uptown', 'Chef', 'active', 'male'], ['Young', 'Three', 22, '', 'Downtown', 'Chef', 'active', 'male']] });
  B.processGCCourtship_(near.ctx);
  const nb2 = near.ctx.summary.relationshipBonds[0];
  assert('G1 the start prefers a GC from the citizen\'s own or an adjacent hood', nb2 && nb2.citizenB === 'GC:Near Two' && near.GC[2][6] === 'Courting' && /in Downtown/.test(nb2.notes), JSON.stringify(nb2 || null));
  const city = gcWorld({ rng: seq([0.1, 0, 0]), gcs: [['Far', 'One', 42, '', 'Laurel', 'Chef', 'active', 'male'], ['Wrong', 'Sex', 40, '', 'Downtown', 'Chef', 'active', 'female']] });
  B.processGCCourtship_(city.ctx);
  const cb = city.ctx.summary.relationshipBonds[0];
  assert('G1 no near GC → one from across the city', cb && cb.citizenB === 'GC:Far One' && /across the city/.test(cb.notes), JSON.stringify(cb || null));
  const none = gcWorld({ rng: seq([0.1, 0, 0]), gcs: [['Too', 'Young', 22, '', 'Downtown', 'Chef', 'active', 'male'], ['No', 'Age', '', '', 'Downtown', 'Chef', 'active', 'male']] });
  B.processGCCourtship_(none.ctx);
  assert('G1 nobody lines up (age outside the window or unknown) → no courtship', none.ctx.summary.relationshipBonds.length === 0);
}

// ── I1 intake: a minor marries no one (codex diff review H2) ───────────────────
{
  const IW = load('../phase05-citizens/processAdvancementIntake.js', ['wireFamilyMatch_']);
  const IH = ['POPID', 'First', 'Last', 'BirthYear', 'MaritalStatus', 'SpouseId', 'ParentIds', 'ChildrenIds', 'NumChildren', 'HouseholdId', 'Neighborhood', 'LifeHistory'];
  const ir = (pop, by, m) => { const r = IH.map(() => ''); r[0] = pop; r[1] = 'X'; r[2] = 'Y'; r[3] = by; r[4] = m; return r; };
  const rows = [ir('POP-T', 2027, 'youth'), ir('POP-N', 2000, 'single')];
  const ctx = { ledger: { headers: IH, rows }, summary: { simYear: 2042, cycleId: 113 }, config: { cycleCount: 113 } };
  const wiredMinor = IW.wireFamilyMatch_(ctx, 1, 'POP-N', 'POP-T', 'spouse', 'now', 113, { appendRow() {} }, 'test');
  assert('I1 an authored spouse link onto a minor is refused whole (returns not-wired)', wiredMinor !== true && rows[0][4] === 'youth' && rows[1][4] === 'single' && !rows[0][5] && !rows[1][5]);
  rows.push(ir('POP-W', 1995, 'single'));
  const wiredAdult = IW.wireFamilyMatch_(ctx, 1, 'POP-N', 'POP-W', 'spouse', 'now', 113, null, 'test');
  assert('I1 an adult spouse link wires and returns true; both married', wiredAdult === true && rows[1][4] === 'married' && rows[2][4] === 'married');
  const isrc = R('../phase05-citizens/processAdvancementIntake.js');
  assert('I1 the household door counts a member linked only when the wiring happened', /linked: familyWired \}/.test(isrc) && /familyWired = \(famDeadAnchor[\s\S]{0,400}: wireFamilyMatch_\(/.test(isrc));
}

// ── G2 courtship binding, the same pass, missing age, 57/59 (codex diff review H7/H8) ──
{
  const twoBonds = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  twoBonds.bonds.push(Object.assign(bondRow('BG2', 'POP-01', 'GC:Rui Moss', 'romantic', 9), { notes: twoBonds.bonds[0].notes }));
  B.processGCCourtship_(twoBonds.ctx);
  assert('G2 two matured bonds on one citizen + one GC name in a pass: one mint, one wedding', twoBonds.rows.length === 2);
  const tok = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  tok.bonds[0].notes = 'Met by chance in Downtown (C100) [gc:Uptown|male]';
  B.processGCCourtship_(tok.ctx);
  assert('G2 a stamped bond marries only the Courting row with its hood and sex', tok.rows.length === 1);
  const noAge = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', '', '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(noAge.ctx);
  assert('G2 a GC with no age on record never marries (no 35 default)', noAge.rows.length === 1);
  const at58 = gcWorld({ ageA: 58, bond: 'Rui Moss', gcs: [['Rui', 'Moss', 50, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(at58.ctx);
  const at59 = gcWorld({ ageA: 59, bond: 'Rui Moss', gcs: [['Rui', 'Moss', 50, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(at59.ctx);
  const gc59 = gcWorld({ ageA: 50, bond: 'Rui Moss', gcs: [['Rui', 'Moss', 59, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(gc59.ctx);
  assert('G2 the GC wedding window: 58 marries, 59 waits (either side)', at58.rows.length === 2 && at59.rows.length === 1 && gc59.rows.length === 1);
  const st = gcWorld({ rng: seq([0.1, 0, 0]), gcs: [['Near', 'Two', 44, '', 'Uptown', 'Chef', 'active', 'male']] });
  B.processGCCourtship_(st.ctx);
  const sb = st.ctx.summary.relationshipBonds[0];
  assert('G2 the courtship start stamps [gc:<hood>|<sex>] and the life line says where they met',
    sb && /\[gc:Uptown\|male\|r2\]/.test(sb.notes) && /met Near Two in Downtown — something starting/.test(String(st.rows[0][st.LH.indexOf('LifeHistory')])));
  const same = [['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Promoted', 'male'], ['Rui', 'Moss', 44, '', 'Laurel', 'Chef', 'Courting', 'male']];
  const look = gcWorld({ bond: 'Rui Moss', gcs: same.map(r => r.slice()) }); look.bonds[0].notes = 'Met by chance in Laurel (C100) [gc:Laurel|male|r2]';
  B.processGCCourtship_(look.ctx);
  assert('G2 a stamped row no longer Courting: the bond waits, never the same-name/hood/sex lookalike', look.rows.length === 1 && look.GC[2][6] === 'Courting');
  const own = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', 44, '', 'Laurel', 'Chef', 'Courting', 'male'], ['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  own.bonds[0].notes = 'Met by chance in Laurel (C100) [gc:Laurel|male|r3]';
  B.processGCCourtship_(own.ctx);
  assert('G2 two lookalike Courting rows: the stamped row marries', own.rows.length === 2 && own.GC[2][6] === 'Promoted' && own.GC[1][6] === 'Courting');
}

// ── DV divorce on stacked crisis (cut 3, ruling 10) ────────────────────────────
{
  const HF = load('../phase05-citizens/householdFormationEngine.js', ['processDivorces_', 'DIVORCE_CRISIS_WINDOW', 'DIVORCE_CRISIS_COUNT'], '',
    ['../utilities/safeRand.js', '../phase05-citizens/bondPersistence.js', '../phase05-citizens/bondEngine.js', '../utilities/archiveCitizenExits.js']);
  const C = 120, ST = 'Y3C16';
  const DH = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'MaritalStatus', 'SpouseId', 'HouseholdId', 'ParentIds', 'ChildrenIds', 'Income', 'Neighborhood', 'DialState', 'LifeHistory'];
  const d = n => DH.indexOf(n);
  const drow = (pop, o) => { const r = DH.map(() => ''); r[d('POPID')] = pop; r[d('First')] = pop.slice(-2); r[d('Last')] = 'Q'; r[d('Status')] = o.status || 'Active';
    r[d('BirthYear')] = o.by || 1990; r[d('MaritalStatus')] = o.m || 'married'; r[d('SpouseId')] = o.sp || ''; r[d('HouseholdId')] = o.hh || '';
    r[d('ParentIds')] = JSON.stringify(o.par || []); r[d('ChildrenIds')] = JSON.stringify(o.ch || []); r[d('Income')] = o.inc || 50000; r[d('Neighborhood')] = 'Fruitvale';
    r[d('DialState')] = o.ds === undefined ? '' : (typeof o.ds === 'string' ? o.ds : JSON.stringify(o.ds)); r[d('LifeHistory')] = o.life || ''; return r; };
  const HHH = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Status'];
  const world = (rows, hhRows, bonds) => {
    const HV = [HHH].concat(hhRows || []);
    const sheet = { getLastColumn: () => HHH.length, failWrites: false, getRange: (r, c) => ({ getValues: () => [HV[r - 1].slice()], setValue: v => { HV[r - 1][c - 1] = v; },
      setValues: v => { if (sheet.failWrites) throw new Error('quota'); HV[r - 1] = v[0].slice(); } }) };
    const households = (hhRows || []).map((r, i) => ({ rowIndex: i + 2, householdId: r[0], headOfHousehold: r[1], householdType: r[2], members: JSON.parse(r[3]), status: r[4] }));
    const ctx = { ledger: { headers: DH, rows, dirty: false }, summary: { cycleId: C, simYear: 2042, storyHooks: [], relationshipBonds: bonds || [], relationshipBondsLoaded: true },
      config: { cycleCount: C }, ss: { getSheetByName: n => n === 'Household_Ledger' ? sheet : null } };
    return { ctx, households, HV, rows, sheet };
  };
  const run = w => HF.processDivorces_(w.ctx, w.households, C);
  const m = (w, i) => w.rows[i][d('MaritalStatus')];
  const crisis = (o) => ({ debtDefault: o.def ? { l: o.def, n: 1 } : undefined, grief: o.grief ? { l: o.grief } : undefined,
    pressure: Object.fromEntries(Object.entries(o.p || {}).map(([k, l]) => [k, { n: 3, l }])) });

  let w = world([drow('POP-01', { hh: 'HH-1', ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }) })], [['HH-1', 'POP-01', 'couple', '["POP-01"]', 'active']]);
  run(w);
  assert('DV1 a default + rent + debt (3 kinds, a major loss) ends an off-camera marriage', m(w, 0) === 'divorced' && /\[Divorce\] the marriage ended/.test(w.rows[0][d('LifeHistory')]));
  assert('DV1 the off-camera couple household retypes in memory (no generic spouse income this week)', w.households[0].householdType === 'single');
  assert('DV1 one CITIZEN_DIVORCED hook', w.ctx.summary.storyHooks.filter(x => x.hookType === 'CITIZEN_DIVORCED').length === 1);
  w = world([drow('POP-01', { ds: crisis({ p: { rent: C - 1, debt: C - 1, hood: C - 1 } }) })]); run(w);
  assert('DV2 three issues with no major loss: no divorce', m(w, 0) === 'married');
  w = world([drow('POP-01', { ds: crisis({ def: C - 1, p: { rent: C - 1 } }) })]); run(w);
  assert('DV3 two kinds with a major loss: no divorce', m(w, 0) === 'married');
  w = world([drow('POP-01', { ds: crisis({ def: C - 13, p: { rent: C - 1, debt: C - 1 } }) })]); run(w);
  const w12 = world([drow('POP-01', { ds: crisis({ def: C - 12, p: { rent: C - 1, debt: C - 1 } }) })]); run(w12);
  assert('DV4 the window is 13 Cycles: a default 13 back is stale, 12 back counts', m(w, 0) === 'married' && m(w12, 0) === 'divorced');
  w = world([drow('POP-01', { ds: crisis({ def: C + 3, p: { rent: C - 1, debt: C - 1 } }) })]); run(w);
  assert('DV5 a future-stamped mark never counts', m(w, 0) === 'married');
  w = world([drow('POP-01', { ds: '{not json', life: '' })]); let threw = false; try { run(w); } catch (e) { threw = true; }
  assert('DV5 a malformed DialState reads as no record (no throw, no divorce)', !threw && m(w, 0) === 'married');
  w = world([drow('POP-01', { ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }), life: ST + ' — [Wedding] married X; a household begins in Fruitvale' })]); run(w);
  const wi = world([drow('POP-01', { ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }), life: ST + ' — [Family] Came on-camera — married to X Y (household intake)' })]); run(wi);
  assert('DV6 a marriage made this Cycle (the bond wedding or the intake spouse match) is never divorced the same week', m(w, 0) === 'married' && m(wi, 0) === 'married');
  w = world([drow('POP-01', { m: 'widowed', ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-02', { status: 'deceased', ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }) })]); run(w);
  assert('DV7 a widow and a deceased row are never divorced', m(w, 0) === 'widowed' && m(w, 1) === 'married');
  w = world([drow('POP-01', { status: 'critical', ds: crisis({ def: C - 2, p: { rent: C - 1 } }) })]); run(w);
  assert('DV8 a health crisis held now counts (a non-Active row is read)', m(w, 0) === 'divorced');
  w = world([drow('POP-01', { ds: crisis({ p: { rent: C - 1, debt: C - 1 } }), life: 'Y3C10 — [LifeEvent-Home-Down-L] lost the house' })]); run(w);
  assert('DV9 a forced home sale on LifeHistory inside the window is a major loss', m(w, 0) === 'divorced');
  // on-ledger couple: A (head, step-parent) has the default; B (the child's recorded parent) carries rent + hood
  const bond = { bondId: 'BW', citizenA: 'POP-00701', citizenB: 'POP-00702', bondType: 'romantic', status: 'active', intensity: 9, notes: 'Married C100' };
  w = world([drow('POP-00701', { sp: 'POP-00702 X', hh: 'HH-2', ds: crisis({ def: C - 3 }) }),
             drow('POP-00702', { sp: 'POP-00701 X', hh: 'HH-2', ch: ['POP-00703'], ds: crisis({ p: { rent: C - 1, hood: C - 2 } }) }),
             drow('POP-00703', { m: 'youth', by: 2034, hh: 'HH-2', par: ['POP-00702', 'POP-00701'] })],
            [['HH-2', 'POP-00701', 'family', '["POP-00701","POP-00702","POP-00703"]', 'active']], [bond]);
  run(w);
  assert('DV10 a couple\'s record is the union of both: both divorced, SpouseIds cleared', m(w, 0) === 'divorced' && m(w, 1) === 'divorced' && !w.rows[0][d('SpouseId')] && !w.rows[1][d('SpouseId')]);
  assert('DV10 the child\'s recorded parent stays, the step-parent head leaves; the child never moves', w.rows[1][d('HouseholdId')] === 'HH-2' && w.rows[0][d('HouseholdId')] === '' && w.rows[2][d('HouseholdId')] === 'HH-2');
  assert('DV10 this week\'s household (in memory) drops the leaver and passes the head to the stayer; the sheet row is left to next Cycle\'s reconcile',
    w.households[0].headOfHousehold === 'POP-00702' && JSON.stringify(w.households[0].members) === '["POP-00702","POP-00703"]' && w.HV[1][1] === 'POP-00701');
  assert('DV10 the romantic bond is resolved', bond.status === 'resolved' && /\[Divorced C120\]/.test(bond.notes));
  assert('DV10 one [Divorce] line each, naming the other', /the marriage to 02 Q \(POP-00702\) ended/.test(w.rows[0][d('LifeHistory')]) && /the marriage to 01 Q \(POP-00701\) ended/.test(w.rows[1][d('LifeHistory')]));
  w = world([drow('POP-00701', { sp: 'POP-00702 X', hh: 'HH-3', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-00702', { sp: 'POP-00701 X', hh: 'HH-3' })],
            [['HH-3', 'POP-00701', 'couple', '["POP-00701","POP-00702"]', 'active']]);
  run(w);
  assert('DV11 no children: a tie keeps the head', w.rows[0][d('HouseholdId')] === 'HH-3' && w.rows[1][d('HouseholdId')] === '' && w.HV[1][1] === 'POP-00701');
  assert('DV12 the set amount is 3 kinds over a 13-Cycle window (the builder\'s dials)', HF.DIVORCE_CRISIS_COUNT === 3 && HF.DIVORCE_CRISIS_WINDOW === 13);
  // codex cut-3 diff review
  const wm = world([drow('POP-00711', { sp: 'POP-00712 X', hh: 'HH-5', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-00712', { sp: 'POP-00711 X', hh: 'HH-5' })],
            [['HH-5', 'POP-00711', 'couple', '["POP-00711","POP-00712"]', 'active']]); run(wm);
  assert('DV13 divorce writes no Household_Ledger cell (the row waits for the reconcile)', wm.HV[1][3] === '["POP-00711","POP-00712"]');
  const HFa = load('../phase05-citizens/householdFormationEngine.js', ['applyDivorceEditsToHouseholds_']);
  const reloaded = [{ householdId: 'HH-5', headOfHousehold: 'POP-00711', householdType: 'couple', members: ['POP-00711', 'POP-00712'] }];
  HFa.applyDivorceEditsToHouseholds_(reloaded, [{ householdId: 'HH-5', edit: { Members: '["POP-00711"]' } }]);
  assert('DV13 after the post-fund reload the edit is re-applied — stress, dissolution and a sale see the leaver gone', JSON.stringify(reloaded[0].members) === '["POP-00711"]');
  const wo = world([drow('POP-01', { hh: 'HH-1', inc: 90000, ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }) })], [['HH-1', 'POP-01', 'couple', '["POP-01"]', 'active']]); run(wo);
  assert('DV13 an off-camera couple retypes in memory (solo at 90k); the row is the reconcile\'s', wo.households[0].householdType === 'solo' && wo.HV[1][2] === 'couple');
  const wx = world([drow('POP-00751', { sp: 'POP-00752 X', hh: 'HH-8', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-00752', { sp: 'POP-00751 X', hh: 'HH-8' })],
            [['HH-8', 'POP-00751', 'couple', '["POP-00751","POP-00752"]', 'active']]);
  wx.sheet.failWrites = true; run(wx);
  assert('DV18 a sheet that refuses writes does not matter — divorce writes none', m(wx, 0) === 'divorced' && m(wx, 1) === 'divorced');
  const archBond = { bondId: 'BX', citizenA: 'POP-00761', citizenB: 'POP-09999', bondType: 'romantic', status: 'active', intensity: 9, notes: '' };
  const wa = world([drow('POP-00761', { sp: 'POP-09999 Gone', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) })], null, [archBond]);
  wa.ctx._citizenArchiveByPop = { 'POP-09999': { row: [], reason: 'traded-away' } }; run(wa);
  assert('DV19 a spouse on Citizen_Archive (traded away): judged like an off-camera marriage, and their romantic bond resolved', m(wa, 0) === 'divorced' && archBond.status === 'resolved');
  const wau = world([drow('POP-00781', { sp: 'POP-09998 Gone', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) })]);
  wau.ctx._citizenArchiveByPop = { 'POP-09998': { row: [] } }; wau.ctx.summary.relationshipBondsLoaded = false; run(wau);
  assert('DV19 an archived-spouse divorce waits too when the bond load did not certify', m(wau, 0) === 'married');
  const wq = world([drow('POP-00771', { sp: 'POP-08888 Nobody', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) })]);
  wq.ctx._citizenArchiveByPop = {}; run(wq);
  assert('DV19 a SpouseId on neither the ledger nor the archive is an unproven link: never divorced', m(wq, 0) === 'married');
  const wu = world([drow('POP-00721', { sp: 'POP-00722 X', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-00722', { sp: 'POP-00721 X' })]);
  wu.ctx.summary.relationshipBondsLoaded = false; run(wu);
  assert('DV14 a couple waits a Cycle when the bond load did not certify', m(wu, 0) === 'married' && m(wu, 1) === 'married');
  const wn = world([drow('POP-00731', { sp: 'POP-00732 X', ds: crisis({ def: C - 3, p: { rent: C - 1, debt: C - 1 } }) }), drow('POP-00732', { m: 'single' })]); run(wn);
  assert('DV15 a married row pointing at an on-ledger partner who is not married back is never divorced alone', m(wn, 0) === 'married');
  const longLife = [ST + ' — [Wedding] married X; a household begins in Fruitvale'].concat(Array.from({ length: 20 }, (_, i) => ST + ' — [Daily] line ' + i)).join('\n');
  const wl = world([drow('POP-01', { ds: crisis({ def: C - 2, p: { rent: C - 1, debt: C - 1 } }), life: longLife })]); run(wl);
  assert('DV16 a wedding this Cycle 20 lines back still blocks the divorce', m(wl, 0) === 'married');
  const wf = world([drow('POP-01', { ds: crisis({ def: C - 2.5, p: { rent: C - 1, debt: C - 1 } }) })]); run(wf);
  assert('DV17 a fractional cycle stamp is not a Cycle', m(wf, 0) === 'married');
  // A1 through the household door: a head + a refused minor spouse forms no household
  const IF = load('../phase05-citizens/processAdvancementIntake.js', ['formIntakeHouseholds_']);
  const FH = ['POPID', 'First', 'Last', 'HouseholdId', 'MaritalStatus', 'NumChildren', 'ChildrenIds', 'Income', 'Gender', 'Neighborhood', 'LifeHistory', 'BirthYear'];
  const fr = (pop, by) => { const r = FH.map(() => ''); r[0] = pop; r[1] = 'A'; r[2] = 'B'; r[4] = by < 2024 ? 'single' : 'youth'; r[11] = by; return r; };
  const fctx = { ledger: { headers: FH, rows: [fr('POP-08001', 1990), fr('POP-08002', 2030)] }, summary: { simYear: 2042, cycleId: C }, config: { cycleCount: C }, ss: { getSheetByName: () => null } };
  const mints = { k1: { head: { pop: 'POP-08001', idx: 0, type: 'head', linked: false }, members: [{ pop: 'POP-08001', idx: 0, type: 'head', linked: false }, { pop: 'POP-08002', idx: 1, type: 'spouse', linked: false }] } };
  const fo = IF.formIntakeHouseholds_(fctx, mints, C, 'now', null);
  assert('A1 a head and a refused (minor) spouse form no household', fo.formed === 0 && !fctx.ledger.rows[0][3] && !fctx.ledger.rows[1][3] && fctx.ledger.rows[1][4] === 'youth');
}

// ── RC the record catches up (codex final gate B4) ─────────────────────────────
{
  const w = weddingCtx(2042 - 40, 2042 - 41);
  w.rows[0][w.m] = 'divorced'; w.rows[1][w.m] = 'divorced';
  w.rows[0][w.ctx.ledger.headers.indexOf('LifeHistory')] = 'Y3C15 — [Divorce] the marriage to Ben Roe (POP-02) ended';
  B.processRomanceAndMarriage_(w.ctx);
  assert('RC a romantic bond still active between a pair whose record says divorced is resolved, never re-married', w.bond.status === 'resolved' && w.rows[0][w.m] === 'divorced');
  const w2 = weddingCtx(2042 - 40, 2042 - 41);
  w2.rows[0][w2.m] = 'divorced'; w2.rows[1][w2.m] = 'divorced'; w2.bond.cycleCreated = 125;
  w2.rows[0][w2.ctx.ledger.headers.indexOf('LifeHistory')] = 'Y3C15 — [Divorce] the marriage to Ben Roe (POP-02) ended';
  B.processRomanceAndMarriage_(w2.ctx);
  assert('RC a courtship the same two start after the divorce is a new bond: it stands (and can marry again)', w2.bond.status === 'active' && w2.rows[0][w2.m] === 'married');
  const w3 = weddingCtx(2042 - 40, 2042 - 41);
  w3.rows[0][w3.m] = 'divorced'; w3.rows[1][w3.m] = 'divorced';
  w3.rows[0][w3.ctx.ledger.headers.indexOf('LifeHistory')] = 'Y3C15 — [Divorce] the marriage to Ben Roe (POP-77) ended';
  B.processRomanceAndMarriage_(w3.ctx);
  assert('RC a same-name divorce line about someone else never resolves this bond', w3.bond.status === 'active');
  const HR = load('../phase05-citizens/householdFormationEngine.js', ['reconcileHouseholds_']);
  const RH = ['POPID', 'Last', 'Status', 'Neighborhood', 'HouseholdId', 'MaritalStatus', 'BirthYear', 'Tier', 'Income'];
  const rr = (pop, by, m) => [pop, 'Q', 'Active', 'Fruitvale', 'HH-9', m, by, 4, 50000];
  const lrows = [rr('POP-00002', 2034, 'youth'), rr('POP-00005', 1990, 'divorced')]; // the old head POP-00001 left
  const HV = [['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'Status'], ['HH-9', 'POP-00001', 'family', '["POP-00001","POP-00002","POP-00005"]', 'Fruitvale', 'active']];
  const sheet = { getDataRange: () => ({ getValues: () => HV.map(r => r.slice()) }), getRange: () => ({ setValues: v => { v.forEach((r, i) => { HV[i] = r.slice(); }); } }), appendRow: () => {}, getLastRow: () => HV.length };
  HR.reconcileHouseholds_({ ss: { getSheetByName: n => n === 'Household_Ledger' ? sheet : null }, ledger: { headers: RH, rows: lrows }, summary: { simYear: 2042 }, config: { cycleCount: 120 } }, 120);
  assert('RC the reconcile re-heads a home its head left to an adult member, never the child', HV[1][1] === 'POP-00005', HV[1][1]);
}

console.log(`\nengine302Marital: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
