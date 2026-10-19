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
  assert('E2 the starting meeting chance is 0.1 (the builder\'s dial)', B.BOND_ENCOUNTER_CHANCE === 0.1);
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
  B.updateExistingBonds_(deepCtx([nb], ['POP-01', 'POP-02']));
  assert('P1 a deepened bond flips once (no second line)', (lh(0).match(/went from neighbor to friend/g) || []).length === 1);
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
  const two = gcWorld({ bond: 'Rui Moss', gcs: [['Rui', 'Moss', 42, '', 'Uptown', 'Chef', 'Courting', 'male'], ['Rui', 'Moss', 41, '', 'Laurel', 'Baker', 'Courting', 'male']] });
  B.processGCCourtship_(two.ctx);
  assert('G1 two Courting rows of one name → no wedding, the courtship waits', two.rows.length === 1 && two.bonds[0].bondType === 'romantic');
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

console.log(`\nengine302Marital: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
