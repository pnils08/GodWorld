/**
 * engine.56 GATE — Household_Ledger truth harness.
 *
 * Loads the REAL processHouseholdFormation_ (householdFormationEngine.js v1.3)
 * and processInheritance_ (generationalWealthEngine.js) whole-file with the
 * Apps Script surface injected (same pattern as migrationRelocation.test.js)
 * and asserts:
 *
 *   H1  income double-parse fix — HouseholdIncome = real member sum, not the
 *       flat formation estimates; HouseholdSavings column ensured + summed
 *   H2  un-dissolve — a "dissolved" row citizens still live in returns to
 *       active with DissolvedCycle cleared (the 272-row rot)
 *   H3  adopt — an SL household with no ledger row (HH-KEANE class) gets a
 *       row: members, head, hood, type, active
 *   H4  spouse-merge — married same-Last same-hood pair split across
 *       households: single-member auto side absorbed into the authored one
 *   H5  ambiguity guard — 3+ same-Last married in one hood: no merge
 *   H6  real dissolution — crisis dissolve clears members' SL HouseholdId
 *       and empties the row's Members
 *   H7  inheritance household-first — spouse-only estate goes to spouse;
 *       spouse + outside child split 50/50; childless+spouseless skips
 *   H8  determinism — same-seed runs byte-identical
 *
 * Run: node scripts/householdReconcile.test.js
 */

const fs = require('fs');
const path = require('path');

// --- Apps Script global surface ---
global.Logger = { log() {} };
global.parseJSON = (v, fallback) => { try { const p = JSON.parse(v); return p === null ? fallback : p; } catch (e) { return fallback; } };
global.inWorldStamp_ = (ctx) => 'Y3C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);
global.safeRand_ = (ctx) => ctx.rng;
global.queueAppendIntent_ = () => {};
global.recordHookRipple_ = () => {};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + fnName + ';')();
};
const processHouseholdFormation_ = loadEngine('../phase05-citizens/householdFormationEngine.js', 'processHouseholdFormation_');
const processInheritance_ = loadEngine('../phase05-citizens/generationalWealthEngine.js', 'processInheritance_');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// --- mock sheet infrastructure ---
function mockSheet(values) {
  const pad = (rowArr, len) => { while (rowArr.length < len) rowArr.push(''); return rowArr; };
  return {
    _values: values,
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getLastColumn() { return values[0].length; },
    getLastRow() { return values.length; },
    appendRow(row) { values.push(pad(row.slice(), values[0].length)); },
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      return {
        getValues: () => Array.from({ length: numRows }, (_, i) =>
          Array.from({ length: numCols }, (_, j) =>
            (values[row - 1 + i] && values[row - 1 + i][col - 1 + j] !== undefined) ? values[row - 1 + i][col - 1 + j] : '')),
        setValue(v) { pad(values[row - 1], col); values[row - 1][col - 1] = v; },
        setValues(vals) {
          for (let i = 0; i < vals.length; i++) {
            pad(values[row - 1 + i], col - 1 + vals[i].length);
            for (let j = 0; j < vals[i].length; j++) values[row - 1 + i][col - 1 + j] = vals[i][j];
          }
        }
      };
    }
  };
}

const SL_HEADER = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Neighborhood',
  'EducationLevel', 'HouseholdId', 'Income', 'NetWorth', 'MaritalStatus', 'NumChildren',
  'ParentIds', 'ChildrenIds', 'InheritanceReceived', 'LastUpdated'];
const sli = (n) => SL_HEADER.indexOf(n);

function cit(popid, first, last, hood, income, opts) {
  opts = opts || {};
  return [popid, first, last, opts.status || 'active', opts.birthYear || 1985, hood,
    opts.edu || 'bachelors', opts.hh || '', income, opts.netWorth || 0,
    opts.marital || 'single', 0, JSON.stringify(opts.parents || []), '[]', 0, ''];
}

const HH_HEADER = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members',
  'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome',
  'FormedCycle', 'DissolvedCycle', 'Status', 'CreatedAt', 'LastUpdated'];
const hhi = (n) => HH_HEADER.indexOf(n);

function hhRow(id, head, type, members, hood, rent, income, status, dissolvedCycle) {
  return [id, head, type, JSON.stringify(members), hood, 'rented', rent, 0, income,
    84, dissolvedCycle || '', status, 'Y2C84', ''];
}

function buildCtx(slRows, hhRows, rngFn) {
  const sheets = {
    Household_Ledger: mockSheet([HH_HEADER.slice()].concat(hhRows)),
    Family_Relationships: mockSheet([['RelationshipId', 'Citizen1', 'Citizen2', 'RelationshipType', 'SinceCycle', 'Status']])
  };
  return {
    ss: { getSheetByName: (n) => sheets[n] || null },
    ledger: { headers: SL_HEADER.slice(), rows: slRows, dirty: false },
    summary: { cycleId: 200, storyHooks: [] },
    config: { cycleCount: 200 },
    rng: rngFn,
    now: 'Y3C200',
    _sheets: sheets
  };
}

const hhFind = (ctx, id) => ctx._sheets.Household_Ledger._values.find(r => r[hhi('HouseholdId')] === id);

// ═══ H1 + H2: income/savings truth + un-dissolve ═════════════════════════════
console.log('H1+H2 income/savings + un-dissolve');
{
  const sl = [
    cit('POP-00005', 'Mags', 'Corliss', 'Lake Merritt', 99456, { hh: 'HH-0084-001', marital: 'married', netWorth: 311000 }),
    cit('POP-00594', 'Robert', 'Corliss', 'Lake Merritt', 124345, { hh: 'HH-0084-001', marital: 'married', netWorth: 240000 })
  ];
  const hh = [hhRow('HH-0084-001', 'POP-00005', 'family', ['POP-00005', 'POP-00594'], 'Lake Merritt', 6155, 95000, 'dissolved', 94)];
  const ctx = buildCtx(sl, hh, () => 0.99);
  processHouseholdFormation_(ctx);
  const row = hhFind(ctx, 'HH-0084-001');
  const hdr = ctx._sheets.Household_Ledger._values[0];
  assert('income = real member sum', row[hhi('HouseholdIncome')] === 223801, String(row[hhi('HouseholdIncome')]));
  assert('HouseholdSavings column ensured', hdr.indexOf('HouseholdSavings') >= 0);
  assert('savings = summed NetWorth', row[hdr.indexOf('HouseholdSavings')] === 551000, String(row[hdr.indexOf('HouseholdSavings')]));
  assert('un-dissolved (citizens live here)', row[hhi('Status')] === 'active', row[hhi('Status')]);
  assert('DissolvedCycle cleared', row[hhi('DissolvedCycle')] === '');
  assert('type corrected to couple', row[hhi('HouseholdType')] === 'couple', row[hhi('HouseholdType')]);
}

// ═══ H3 + H4: adopt missing household + spouse merge ═════════════════════════
console.log('H3+H4 adopt + spouse-merge');
{
  const sl = [
    cit('POP-00001', 'Vinnie', 'Keane', 'Rockridge', 41840, { hh: 'HH-KEANE', marital: 'married', netWorth: 500000 }),
    cit('POP-00002', 'Amara', 'Keane', 'Rockridge', 180599, { hh: 'HH-0084-005', marital: 'married', netWorth: 175000 }),
    cit('POP-00099', 'By', 'Stander', 'Fruitvale', 60000, { hh: 'HH-0084-050', marital: 'single' })
  ];
  const hh = [
    hhRow('HH-0084-005', 'POP-00002', 'single', ['POP-00002'], 'Montclair', 3762, 50000, 'active'),
    hhRow('HH-0084-050', 'POP-00099', 'single', ['POP-00099'], 'Fruitvale', 2400, 50000, 'active')
  ];
  const ctx = buildCtx(sl, hh, () => 0.99);
  processHouseholdFormation_(ctx);
  assert('Amara SL moved into HH-KEANE', sl[1][sli('HouseholdId')] === 'HH-KEANE', sl[1][sli('HouseholdId')]);
  const keane = hhFind(ctx, 'HH-KEANE');
  assert('HH-KEANE row created', !!keane);
  assert('both Keanes are members', keane && keane[hhi('Members')] === JSON.stringify(['POP-00001', 'POP-00002']), keane && keane[hhi('Members')]);
  assert('KEANE hood from head (Rockridge, not Montclair)', keane && keane[hhi('Neighborhood')] === 'Rockridge');
  assert('KEANE income = both salaries', keane && keane[hhi('HouseholdIncome')] === 222439, keane && String(keane[hhi('HouseholdIncome')]));
  const old = hhFind(ctx, 'HH-0084-005');
  assert('Amara old solo household emptied + dissolved', old && old[hhi('Status')] === 'dissolved' && old[hhi('Members')] === '[]', old && old[hhi('Status')] + '/' + old[hhi('Members')]);
  assert('bystander untouched', sl[2][sli('HouseholdId')] === 'HH-0084-050');
}

// ═══ H5: ambiguity guard ═════════════════════════════════════════════════════
console.log('H5 ambiguity guard');
{
  const sl = [
    cit('POP-10', 'A', 'Lee', 'Chinatown', 50000, { hh: 'HH-L1', marital: 'married' }),
    cit('POP-11', 'B', 'Lee', 'Chinatown', 50000, { hh: 'HH-L2', marital: 'married' }),
    cit('POP-12', 'C', 'Lee', 'Chinatown', 50000, { hh: 'HH-L3', marital: 'married' })
  ];
  const hh = [
    hhRow('HH-L1', 'POP-10', 'single', ['POP-10'], 'Chinatown', 2500, 50000, 'active'),
    hhRow('HH-L2', 'POP-11', 'single', ['POP-11'], 'Chinatown', 2500, 50000, 'active'),
    hhRow('HH-L3', 'POP-12', 'single', ['POP-12'], 'Chinatown', 2500, 50000, 'active')
  ];
  const ctx = buildCtx(sl, hh, () => 0.99);
  processHouseholdFormation_(ctx);
  assert('no merge among 3 same-name married', sl[0][sli('HouseholdId')] === 'HH-L1' && sl[1][sli('HouseholdId')] === 'HH-L2' && sl[2][sli('HouseholdId')] === 'HH-L3');
}

// ═══ H6: real dissolution ════════════════════════════════════════════════════
console.log('H6 real dissolution');
{
  // Crisis: rent 30000/yr on real income 40000 = 75% burden; rng 0.05 < 0.10 dissolves.
  const sl = [cit('POP-20', 'Po', 'Or', 'Fruitvale', 40000, { hh: 'HH-C1', marital: 'single', birthYear: 1970 })];
  const hh = [hhRow('HH-C1', 'POP-20', 'single', ['POP-20'], 'Fruitvale', 2500, 40000, 'active')];
  const ctx = buildCtx(sl, hh, () => 0.05);
  processHouseholdFormation_(ctx);
  const row = hhFind(ctx, 'HH-C1');
  assert('household dissolved under real crisis burden', row[hhi('Status')] === 'dissolved', row[hhi('Status')]);
  assert('members emptied on row', row[hhi('Members')] === '[]', row[hhi('Members')]);
  assert('citizen SL HouseholdId released', sl[0][sli('HouseholdId')] === '', sl[0][sli('HouseholdId')]);
}

// ═══ H7: inheritance household-first ═════════════════════════════════════════
console.log('H7 inheritance household-first');
{
  // Spouse-only: estate 100000 -> 80000 to spouse.
  const sl = [
    cit('POP-30', 'De', 'Ceased', 'Laurel', 0, { hh: 'HH-I1', status: 'deceased', netWorth: 100000 }),
    cit('POP-31', 'Wi', 'Dow', 'Laurel', 50000, { hh: 'HH-I1', marital: 'widowed', netWorth: 10000 })
  ];
  const ctx = buildCtx(sl, [], () => 0.99);
  ctx.summary.generationalEvents = [{ tag: 'Death', popId: 'POP-30' }];
  processInheritance_(ctx, 200);
  assert('spouse inherits 80%', sl[1][sli('NetWorth')] === 90000, String(sl[1][sli('NetWorth')]));
  assert('InheritanceReceived stamped', sl[1][sli('InheritanceReceived')] === 80000, String(sl[1][sli('InheritanceReceived')]));

  // Spouse + outside child: 50/50.
  const sl2 = [
    cit('POP-40', 'Ri', 'Chest', 'Laurel', 0, { hh: 'HH-I2', status: 'deceased', netWorth: 200000 }),
    cit('POP-41', 'Sp', 'Ouse', 'Laurel', 50000, { hh: 'HH-I2', netWorth: 0 }),
    cit('POP-42', 'Ki', 'D', 'KONO', 30000, { hh: 'HH-I3', netWorth: 0, parents: ['POP-40'] })
  ];
  const ctx2 = buildCtx(sl2, [], () => 0.99);
  ctx2.summary.generationalEvents = [{ tag: 'Death', popId: 'POP-40' }];
  processInheritance_(ctx2, 200);
  assert('spouse gets 50% of estate', sl2[1][sli('InheritanceReceived')] === 80000, String(sl2[1][sli('InheritanceReceived')]));
  assert('outside child gets 50% of estate', sl2[2][sli('InheritanceReceived')] === 80000, String(sl2[2][sli('InheritanceReceived')]));

  // Neither household nor children: skipped, no mutation.
  const sl3 = [
    cit('POP-50', 'Al', 'One', 'Laurel', 0, { status: 'deceased', netWorth: 500000 }),
    cit('POP-51', 'Un', 'Related', 'Laurel', 40000, { netWorth: 1000 })
  ];
  const ctx3 = buildCtx(sl3, [], () => 0.99);
  ctx3.summary.generationalEvents = [{ tag: 'Death', popId: 'POP-50' }];
  const res3 = processInheritance_(ctx3, 200);
  assert('estate with no heirs skips untouched', res3.processed === 0 && sl3[1][sli('NetWorth')] === 1000);
}

// ═══ H8: determinism ═════════════════════════════════════════════════════════
console.log('H8 determinism');
{
  const mk = () => {
    const sl = [
      cit('POP-00001', 'Vinnie', 'Keane', 'Rockridge', 41840, { hh: 'HH-KEANE', marital: 'married', netWorth: 500000 }),
      cit('POP-00002', 'Amara', 'Keane', 'Rockridge', 180599, { hh: 'HH-0084-005', marital: 'married', netWorth: 175000 }),
      cit('POP-00005', 'Mags', 'Corliss', 'Lake Merritt', 99456, { hh: 'HH-0084-001', marital: 'married', netWorth: 311000 }),
      cit('POP-00594', 'Robert', 'Corliss', 'Lake Merritt', 124345, { hh: 'HH-0084-001', marital: 'married', netWorth: 240000 })
    ];
    const hh = [
      hhRow('HH-0084-001', 'POP-00005', 'family', ['POP-00005', 'POP-00594'], 'Lake Merritt', 6155, 95000, 'dissolved', 94),
      hhRow('HH-0084-005', 'POP-00002', 'single', ['POP-00002'], 'Montclair', 3762, 50000, 'active')
    ];
    return { sl, hh };
  };
  const snap = (ctx, sl) => JSON.stringify({ sl, hh: ctx._sheets.Household_Ledger._values, hooks: ctx.summary.storyHooks });
  const a = mk(); const ctxA = buildCtx(a.sl, a.hh, mulberry32(42)); processHouseholdFormation_(ctxA);
  const b = mk(); const ctxB = buildCtx(b.sl, b.hh, mulberry32(42)); processHouseholdFormation_(ctxB);
  assert('same-seed runs byte-identical', snap(ctxA, a.sl) === snap(ctxB, b.sl));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
