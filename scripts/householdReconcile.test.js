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

// engine.148: the calendar file carries simYearOf_ — prepended so the year resolves as it does in the flat Apps Script namespace
const CAL_SRC = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8');
const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(CAL_SRC + '\n' + src + '\nreturn ' + fnName + ';')();
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
            if (!values[row - 1 + i]) values[row - 1 + i] = []; // a write past the last row grows the sheet (Apps Script does)
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

// ═══ H6b: savings buffer prevents dissolution (S316 wiring) ══════════════════
console.log('H6b savings buffer prevents dissolution');
{
  // Same crisis as H6 (75% burden, dissolve roll passes) but the member holds
  // NetWorth -> HouseholdSavings covers 12+ months of rent -> no collapse.
  const sl = [cit('POP-21', 'Sa', 'Ved', 'Fruitvale', 40000, { hh: 'HH-C2', marital: 'single', birthYear: 1970, netWorth: 2500 * 13 })];
  const hh = [hhRow('HH-C2', 'POP-21', 'single', ['POP-21'], 'Fruitvale', 2500, 40000, 'active')];
  const ctx = buildCtx(sl, hh, () => 0.05);
  processHouseholdFormation_(ctx);
  const row = hhFind(ctx, 'HH-C2');
  assert('reserved household survives the crisis roll', row[hhi('Status')] === 'active', row[hhi('Status')]);
  assert('citizen keeps their home', sl[0][sli('HouseholdId')] === 'HH-C2', sl[0][sli('HouseholdId')]);
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

// ═══ engine.153 (S412) — cut 4: a single can own a home ═══════════════════════
console.log('engine.153 solo establishment on income alone; owned beats rented on courtship');
{
  const sl = [cit('POP-00900', 'Dara', 'Quinn', 'Temescal', 92000, { netWorth: 120000 }),
              cit('POP-00901', 'Ben', 'Poor', 'Temescal', 60000, { netWorth: 5000 })];
  const ctx = buildCtx(sl, [], () => 0.05);
  processHouseholdFormation_(ctx);
  const rows = ctx._sheets.Household_Ledger._values.slice(1);
  const dara = rows.find(r => JSON.stringify(r[hhi('Members')]).includes('POP-00900'));
  const ben = rows.find(r => JSON.stringify(r[hhi('Members')]).includes('POP-00901'));
  assert('a single earner at 92k with no Tier gate establishes a solo household at rng 0.05', !!dara && dara[hhi('HouseholdType')] === 'solo' && dara[hhi('HousingType')] === 'rented');
  assert('below the income floor: no household', !ben);
  const ctx2 = buildCtx([cit('POP-00902', 'Eve', 'Dice', 'Temescal', 92000, {})], [], () => 0.5);
  processHouseholdFormation_(ctx2);
  assert('the 10% roll still gates it (rng 0.5 → nothing)', ctx2._sheets.Household_Ledger._values.length === 1);
  assert('SOLO_TIER_MAX is gone from the formation engine', !/SOLO_TIER_MAX/.test(fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/householdFormationEngine.js'), 'utf8')));
  // bond side: pure helper + one-read map
  const bsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondEngine.js'), 'utf8');
  const BE = new Function('Logger', bsrc + '\nreturn { courtshipHousingBoost_, householdHousingById_, HOME_OWNED_COURTSHIP_BOOST, HOUSEHOLD_COURTSHIP_BOOST };')({ log() {} });
  assert('owned on either side → 2.0; rented household → 1.5; none → 1', BE.courtshipHousingBoost_('owned', '') === 2 && BE.courtshipHousingBoost_('', 'owned') === 2 && BE.courtshipHousingBoost_('rented', '') === 1.5 && BE.courtshipHousingBoost_('', '') === 1 && BE.HOME_OWNED_COURTSHIP_BOOST > BE.HOUSEHOLD_COURTSHIP_BOOST);
  const hctx = { ss: { getSheetByName: (n) => n === 'Household_Ledger' ? { getLastRow: () => 4, getDataRange: () => ({ getValues: () => [['HouseholdId', 'HousingType', 'Status'], ['HH-1', 'owned', 'active'], ['HH-2', '', 'active'], ['HH-3', 'owned', 'dissolved']] }) } : null } };
  const m = BE.householdHousingById_(hctx);
  assert('housing map: owned kept, blank reads rented, dissolved dropped, cached on ctx', m['HH-1'] === 'owned' && m['HH-2'] === 'rented' && !('HH-3' in m) && BE.householdHousingById_(hctx) === m);
  assert('the courtship step reads the housing boost', /courtshipHousingBoost_\(lkA && lkA.householdId \? housingById/.test(bsrc));
}

// ═══ engine.151 (S413) — cut 5: Tier pays on the courtship step and the home roll ═
console.log('engine.151 the rung pays on the courtship step and the home-buy roll');
{
  const pay = t => ({ 1: 1.5, 2: 1.3, 3: 1.15, 4: 1 })[Math.round(Number(t)) || 4] || 1; // the live table (tierLadderState.test.js proves it)
  const bsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondEngine.js'), 'utf8');
  const BE = new Function('Logger', 'tierPayFactor_', bsrc + '\nreturn { courtshipTierBoost_ };')({ log() {} }, pay);
  assert('courtship: the pair\'s best rung pays — (3,4) 1.15, (4,1) 1.5, (4,4) 1, blanks 1', BE.courtshipTierBoost_(3, 4) === 1.15 && BE.courtshipTierBoost_(4, 1) === 1.5 && BE.courtshipTierBoost_(4, 4) === 1 && BE.courtshipTierBoost_(undefined, '') === 1);
  const BE0 = new Function('Logger', bsrc + '\nreturn { courtshipTierBoost_ };')({ log() {} });
  assert('courtship: no helper in scope → ×1', BE0.courtshipTierBoost_(1, 1) === 1);
  assert('the step site multiplies the housing boost by the rung, under the same 0.5 cap', /boost \*= courtshipTierBoost_\(lkA \? lkA\.tier : 4, lkB \? lkB\.tier : 4\);\n\s*if \(boost > 1\) stepP = Math\.min\(0\.5, stepP \* boost\);/.test(bsrc));
  assert('the GC draw stays an unweighted lottery (doctrine 10)', /var pid2 = singles\[Math\.floor\(rng\(\) \* singles\.length\)\];/.test(bsrc));
  assert('the engine.59 flip orbit stays as ruled', /var tierFactor = \(A\.tier \+ B\.tier\) \/ 8;/.test(bsrc));
  const wsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generationalWealthEngine.js'), 'utf8');
  const WE = new Function('Logger', 'tierPayFactor_', wsrc + '\nreturn { homeBuyChance_, HOME_BUY_P };')({ log() {} }, pay);
  assert('home roll: 6.0 / 6.9 / 7.8 / 9.0 % by best rung; eligibility untouched', Math.abs(WE.homeBuyChance_(4) - 0.06) < 1e-9 && Math.abs(WE.homeBuyChance_(3) - 0.069) < 1e-9 && Math.abs(WE.homeBuyChance_(2) - 0.078) < 1e-9 && Math.abs(WE.homeBuyChance_(1) - 0.09) < 1e-9 && /if \(combinedNW < price \* HOME_ELIGIBLE_NW\) continue;/.test(wsrc));
  assert('the purchase roll reads the household\'s best rung', /if \(rng\(\) >= homeBuyChance_\(bestTier\)\) continue;/.test(wsrc) && /if \(mTier >= 1 && mTier < bestTier\) bestTier = mTier;/.test(wsrc));
}

// ═══ engine.154 (S413) — cut 6: spouse quality ══════════════════════════════════
console.log('engine.154 compatibility reads net worth + hood prosperity; the drawn spouse is priced by who and where');
{
  const wsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generationalWealthEngine.js'), 'utf8');
  const WE = new Function('Logger', wsrc + '\nreturn { deriveWealthLevel_, netWorthForBand_, WEALTH_BAND_FLOORS };')({ log() {} });
  const probes = [[999, 0], [1000, 1], [9999, 1], [10000, 2], [24999, 2], [25000, 3], [50000, 4], [100000, 5], [250000, 6], [500000, 7], [1e6, 8], [5e6, 9], [5e7, 10], [2.5e8, 11], [1e9, 12], [1e10, 12], [0, 0], [-5, 0]];
  assert('deriveWealthLevel_ walks the one band table with the v15/D1 thresholds unchanged', probes.every(([nw, b]) => WE.deriveWealthLevel_(0, 0, nw, 0) === b), JSON.stringify(probes.map(([nw]) => WE.deriveWealthLevel_(0, 0, nw, 0))));
  let inBand = true;
  for (let b = 0; b <= 12; b++) for (const u of [0, 0.37, 0.5, 0.999]) { const v = WE.netWorthForBand_(b, u); if (WE.deriveWealthLevel_(0, 0, v, 0) !== b) { inBand = false; console.log('  band miss', b, u, v); } }
  assert('netWorthForBand_ lands inside its band for every band × unit', inBand);
  assert('netWorthForBand_ clamps junk (band −3 → 0, band 40 → 12, unit 1 → inside)', WE.deriveWealthLevel_(0, 0, WE.netWorthForBand_(-3, 0.5), 0) === 0 && WE.deriveWealthLevel_(0, 0, WE.netWorthForBand_(40, 0.5), 0) === 12 && WE.deriveWealthLevel_(0, 0, WE.netWorthForBand_(6, 1), 0) === 6);

  const csrc = fs.readFileSync(path.resolve(__dirname, '../utilities/citizenDerivation.js'), 'utf8');
  const CD = new Function('Logger', csrc + '\nreturn { rand01_, ageBracket_, deriveEducationLevel_ };')({ log() {} });
  const simYearOf_ = new Function(CAL_SRC + '\nreturn simYearOf_;')();
  const bsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondEngine.js'), 'utf8');
  const BE = new Function('Logger', 'deriveWealthLevel_', 'netWorthForBand_', 'rand01_', 'ageBracket_', 'simYearOf_',
    bsrc + '\nreturn { bondWealthTerm_, bondProsperityTerm_, bondSpouseQuality_, bondCompatibility_, spouseNetWorthFor_, hoodEducationFreq_ };')(
    { log() {} }, WE.deriveWealthLevel_, WE.netWorthForBand_, CD.rand01_, CD.ageBracket_, simYearOf_);
  assert('wealth term: gap ≤1 +2, ≤3 +1, 4–5 0, ≥6 −1, blank/unknown 0', BE.bondWealthTerm_(5, 6) === 2 && BE.bondWealthTerm_(5, 5) === 2 && BE.bondWealthTerm_(5, 8) === 1 && BE.bondWealthTerm_(5, 10) === 0 && BE.bondWealthTerm_(0, 6) === -1 && BE.bondWealthTerm_(null, 5) === 0 && BE.bondWealthTerm_('', 5) === 0 && BE.bondWealthTerm_(undefined, undefined) === 0 && BE.bondWealthTerm_('x', 5) === 0);
  const nctx = { summary: { neighborhoodState: { Rockridge: { incomeTier: 5 }, Downtown: { incomeTier: 4 }, Temescal: { incomeTier: 1 }, Blank: { incomeTier: null } } } };
  assert('prosperity term: tiers within 1 → +1; a gulf, an unknown hood, a blank tier, no ctx → 0', BE.bondProsperityTerm_(nctx, 'Rockridge', 'Downtown') === 1 && BE.bondProsperityTerm_(nctx, 'Rockridge', 'Rockridge') === 1 && BE.bondProsperityTerm_(nctx, 'Rockridge', 'Temescal') === 0 && BE.bondProsperityTerm_(nctx, 'Rockridge', 'Nowhere') === 0 && BE.bondProsperityTerm_(nctx, 'Rockridge', 'Blank') === 0 && BE.bondProsperityTerm_(null, 'Rockridge', 'Downtown') === 0);
  const A = { Name: 'A', Neighborhood: 'Rockridge', Occupation: 'Nurse', BirthYear: 2008, WealthLevel: 5 };
  const B = { Name: 'B', Neighborhood: 'Rockridge', Occupation: 'Nurse', BirthYear: 2010, WealthLevel: 6 };
  const B0 = Object.assign({}, B, { WealthLevel: null });
  const base = BE.bondCompatibility_(A, B0, { summary: {} });
  assert('the like-at-all score (friendship formation) is UNCHANGED by the terms', BE.bondCompatibility_(A, B, nctx) === base && base >= 8, base + ' / ' + BE.bondCompatibility_(A, B, nctx));
  assert('spouse quality at the gate: like bands + alike hoods +3; unknown band +1; a gulf −1, never a bar', BE.bondSpouseQuality_(A, B, nctx) === 3 && BE.bondSpouseQuality_(A, B0, nctx) === 1 && BE.bondSpouseQuality_(A, Object.assign({}, B, { WealthLevel: 12 }), { summary: {} }) === -1 && BE.bondSpouseQuality_({}, {}, null) === 0);
  assert('the romance gate resolves POPID → name before the lookup and adds the term on both paths (6b: the welded door)', /var romA = romLk\[resolveCitizenName_\(ctx, bond\.citizenA\)\] \|\| \{\};/.test(bsrc) && /romCompat = bondCompatibility_\(romA, romB, ctx\);/.test(bsrc) && /romCompat \+= bondSpouseQuality_\(romA, romB, ctx\);/.test(bsrc) && !/romLk\[bond\.citizenA\]/.test(bsrc));
  assert('detectNewBonds_ scores friendships on the base compatibility only (the term has one definition and one call site: the gate)', /var compat = bondCompatibility_\(dataA, dataB, ctx\);\n\s*if \(!ctx\._bondCompatByKey\)/.test(bsrc) && (bsrc.match(/bondSpouseQuality_\(/g) || []).length === 2);
  // the drawn spouse
  const hctx = { summary: { neighborhoodState: { Rockridge: { wealthMin: 7, wealthMax: 11 }, Temescal: { wealthMin: 2, wealthMax: 5 } } } };
  const seeds = ['Ana|Lee|POP-1', 'Bo|Kim|POP-2', 'Cy|Ng|POP-3', 'Di|Oh|POP-4', 'Ed|Pa|POP-5', 'Fa|Qu|POP-6'];
  const bandsR = seeds.map(sd => WE.deriveWealthLevel_(0, 0, BE.spouseNetWorthFor_(hctx, 300000, 'Rockridge', sd), 0));
  const bandsT = seeds.map(sd => WE.deriveWealthLevel_(0, 0, BE.spouseNetWorthFor_(hctx, 300000, 'Temescal', sd), 0));
  const bandsN = seeds.map(sd => WE.deriveWealthLevel_(0, 0, BE.spouseNetWorthFor_({ summary: {} }, 300000, 'Nowhere', sd), 0));
  assert('spouse band: citizen at band 6 in Rockridge (7–11) → always 7; in Temescal (2–5) → always 5; no hood profile → 5–7', bandsR.every(b => b === 7) && bandsT.every(b => b === 5) && bandsN.every(b => b >= 5 && b <= 7) && new Set(bandsN).size >= 2, JSON.stringify([bandsR, bandsT, bandsN]));
  assert('spouse band is seeded (same seed, same answer)', BE.spouseNetWorthFor_(hctx, 300000, 'Rockridge', seeds[0]) === BE.spouseNetWorthFor_(hctx, 300000, 'Rockridge', seeds[0]));
  assert('the mint falls back to age+income pricing when the citizen is unpriced', /var spNW = pNW > 0 \? spouseNetWorthFor_\(ctx, pNW, P\.hood, dSeed\) : null;/.test(bsrc) && /deriveEducationLevel_\(dSeed, P\.hood, gAgeM, hoodEducationFreq_\(ctx\)\)/.test(bsrc));
  // hood education frequencies
  const H = ['POPID', 'Neighborhood', 'EducationLevel', 'BirthYear', 'Status'];
  const rows = [['P1', 'Rockridge', 'bachelors', 2000, 'Active'], ['P2', 'Rockridge', 'masters', 2001, 'Active'], ['P3', 'Rockridge', 'hs-diploma', 2030, 'Active'], ['P4', 'Rockridge', 'doctorate', 1990, 'Deceased'], ['P5', 'Temescal', 'hs-diploma', 1999, 'Active'], ['P6', 'Temescal', '', 1999, 'Active']];
  const ectx = { ledger: { headers: H, rows }, summary: { cycleId: 107 }, config: { cycleCount: 107 } };
  const F = BE.hoodEducationFreq_(ectx);
  const rk = F.byNeighborhood.Rockridge && F.byNeighborhood.Rockridge.educationByAge;
  assert('hood education freq: adults only, deceased + blank dropped, citywide rolled up, cached on ctx', rk && rk['30-44'] && rk['30-44'].bachelors === 1 && rk['30-44'].masters === 1 && !rk['18-29'] && !F.byNeighborhood.Rockridge.educationByAge['30-44'].doctorate && F.byNeighborhood.Temescal.educationByAge['30-44']['hs-diploma'] === 1 && F.citywide.educationByAge['30-44'].bachelors === 1 && BE.hoodEducationFreq_(ectx) === F, JSON.stringify(F));
  const big = { ledger: { headers: H, rows: [] }, summary: { cycleId: 107 }, config: { cycleCount: 107 } };
  for (let i = 0; i < 12; i++) big.ledger.rows.push(['Q' + i, 'Rockridge', i < 9 ? 'masters' : 'hs-diploma', 2000, 'Active']);
  const draws = seeds.map(sd => CD.deriveEducationLevel_(sd, 'Rockridge', 41, BE.hoodEducationFreq_(big)));
  assert('deriveEducationLevel_ now draws from the ledger frequencies (hood bucket when the bracket carries ≥5 distinct levels, else citywide — this fixture is citywide); no longer hs-diploma for everyone', draws.includes('masters') && CD.deriveEducationLevel_(seeds[0], 'Rockridge', 41, null) === 'hs-diploma', JSON.stringify(draws));
}

// ═══ engine.155 (S413) — cut 7: Door C, the household heritage door ═══════════
console.log('engine.155 Door C: an owned home + a Tier ≤ 2 name + the balance founds a line, solo or family');
{
  const updateHeritage_ = loadEngine('../phase05-citizens/generationalWealthEngine.js', 'updateHeritage_');
  const HDR = SL_HEADER.concat(['Tier', 'LineageId', 'SpouseId', 'UsageCount', 'CIV (y/n)', 'LifeHistory']);
  const hi = (n) => HDR.indexOf(n);
  const person = (popid, first, last, hood, tier, nw, hh, extra) => {
    const r = cit(popid, first, last, hood, 90000, Object.assign({ netWorth: nw, hh }, extra || {}));
    return r.concat([tier, (extra && extra.line) || '', (extra && extra.spouse) || '', 0, '', 'Y2C1 — born']);
  };
  const HL_HDR = ['LineageId', 'FamilyName', 'FounderPopId', 'FoundedCycle', 'FoundedDoor', 'Generations', 'LivingMembers', 'MembersList', 'HeritageScore', 'HeritageTier', 'TotalNetWorth', 'HomesOwned', 'BusinessesOwned', 'CivicMembers', 'FameMembers', 'LastUpdated'];
  const owned = (id, members, hood, housing) => { const r = hhRow(id, members[0], members.length > 1 ? 'family' : 'solo', members, hood, 3000, 90000, 'active'); r[hhi('HousingType')] = housing || 'owned'; return r; };
  const run = (people, hhs) => {
    const sheets = {
      Household_Ledger: mockSheet([HH_HEADER.slice()].concat(hhs)),
      Heritage_Ledger: mockSheet([HL_HDR.slice(), ['LIN-00005', 'Varek', 'POP-00789', 103, 'B', 1, 1, '["POP-00789"]', 12, 'Founding', 1e10, 0, '[]', 0, 0, 108]]),
      Family_Relationships: mockSheet([['RelationshipId', 'Citizen1', 'Citizen2', 'RelationshipType', 'SinceCycle', 'Status']])
    };
    const ctx = { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: HDR.slice(), rows: people, dirty: false }, summary: { cycleId: 109, storyHooks: [] }, config: { cycleCount: 109 }, rng: mulberry32(7), now: 'Y3C109', _sheets: sheets };
    const res = updateHeritage_(ctx.ss, ctx, 109);
    return { ctx, res, hl: sheets.Heritage_Ledger._values.slice(1), row: (id) => people.find(r => r[hi('POPID')] === id) };
  };
  // C1 solo: T2 + $600K + owned → founds by C; the member joins; the line reads the door
  {
    const t = run([person('POP-1', 'Keisha', 'Ramos', 'Lake Merritt', 2, 613000, 'HH-1')], [owned('HH-1', ['POP-1'], 'Lake Merritt')]);
    const line = t.hl.find(r => r[4] === 'C');
    assert('C1 solo T2 at $613K in an owned home founds a Door-C line, numbered after the last', t.res.founded === 1 && line && line[0] === 'LIN-00006' && line[1] === 'Ramos' && line[2] === 'POP-1' && line[9] === 'Founding' && Number(line[11]) === 1 /* the founding home counts */, JSON.stringify(t.hl));
    assert('C1 the member carries the line + the [Heritage] door-C line + a HERITAGE_FOUNDED hook naming the home', t.row('POP-1')[hi('LineageId')] === 'LIN-00006' && /\[Heritage\] the Ramos line is founded — a home, a name, and the standing to keep both/.test(t.row('POP-1')[hi('LifeHistory')]) && t.ctx.summary.storyHooks.some(h => h.hookType === 'HERITAGE_FOUNDED' && /an owned home in Lake Merritt, a Tier-2 name/.test(h.description)), t.row('POP-1')[hi('LifeHistory')]);
  }
  // C2 the floors: solo below $500K, solo at Tier 3 with millions, a rented T1 with millions, a family below $1M → nothing
  {
    const t = run([
      person('POP-1', 'A', 'Low', 'Temescal', 2, 400000, 'HH-1'),
      person('POP-2', 'B', 'Rung', 'Temescal', 3, 5000000, 'HH-2'),
      person('POP-3', 'C', 'Rent', 'Temescal', 1, 5000000, 'HH-3'),
      person('POP-4', 'D', 'Fam', 'Temescal', 2, 500000, 'HH-4'), person('POP-5', 'E', 'Fam', 'Temescal', 4, 400000, 'HH-4'),
    ], [owned('HH-1', ['POP-1'], 'Temescal'), owned('HH-2', ['POP-2'], 'Temescal'), owned('HH-3', ['POP-3'], 'Temescal', 'rented'), owned('HH-4', ['POP-4', 'POP-5'], 'Temescal')]);
    assert('C2 no floor is crossed: $400K solo, a Tier-3 millionaire, a renting Tier 1, a $900K family → 0 founded', t.res.founded === 0 && t.hl.length === 1 && [1, 2, 3, 4, 5].every(i => !t.row('POP-' + i)[hi('LineageId')]), JSON.stringify(t.res));
  }
  // C3 family: T2 + T4 spouse, $6.4M combined, owned → one line, both join, surname by count
  {
    const t = run([person('POP-1', 'Johhny', 'Necklar', 'Rockridge', 2, 6000000, 'HH-1'), person('POP-2', 'Camila', 'Necklar', 'Rockridge', 4, 373000, 'HH-1')], [owned('HH-1', ['POP-1', 'POP-2'], 'Rockridge')]);
    const line = t.hl.find(r => r[4] === 'C');
    assert('C3 family: one Door-C line, both members join, FamilyName by surname count, founder = elder', t.res.founded === 1 && line && line[1] === 'Necklar' && t.row('POP-1')[hi('LineageId')] === 'LIN-00006' && t.row('POP-2')[hi('LineageId')] === 'LIN-00006' && Number(line[6]) === 2, JSON.stringify(t.hl));
  }
  // C4 already on a line → the household is skipped (lines grow by lived events, never re-found)
  {
    const t = run([person('POP-1', 'Elias', 'Varek', 'Downtown', 1, 1e10, 'HH-1', { line: 'LIN-00005' }), person('POP-2', 'Nora', 'Varek', 'Downtown', 4, 100000, 'HH-1', { spouse: 'POP-1' })], [owned('HH-1', ['POP-1', 'POP-2'], 'Downtown')]);
    assert('C4 a household with a lined member is skipped by Door C (the spouse joins by the surname rule instead)', t.res.founded === 0 && t.res.joined === 1 && t.row('POP-2')[hi('LineageId')] === 'LIN-00005', JSON.stringify(t.res));
  }
  // C5 apex cash still founds by B, before C sees it
  {
    const t = run([person('POP-1', 'Rich', 'Apex', 'Piedmont Ave', 2, 400000000, 'HH-1')], [owned('HH-1', ['POP-1'], 'Piedmont Ave')]);
    assert('C5 $400M in an owned home founds by Door B, not C', t.res.founded === 1 && t.hl.filter(r => r[4] === 'B').length === 2 && !t.hl.some(r => r[4] === 'C'));
  }
  // C6 blank Tier reads as 4; Tier 1 at the solo floor exactly founds
  {
    const t = run([person('POP-1', 'Blank', 'Tier', 'Laurel', '', 900000, 'HH-1'), person('POP-2', 'Edge', 'Case', 'Laurel', 1, 500000, 'HH-2')], [owned('HH-1', ['POP-1'], 'Laurel'), owned('HH-2', ['POP-2'], 'Laurel')]);
    assert('C6 blank Tier is Tier 4 (no door); Tier 1 at exactly $500K founds', t.res.founded === 1 && !t.row('POP-1')[hi('LineageId')] && t.row('POP-2')[hi('LineageId')] === 'LIN-00006');
  }
  const wsrc2 = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generationalWealthEngine.js'), 'utf8');
  assert('Door C runs after Door B and before the aggregates', wsrc2.indexOf("foundLine_([bRow], bName, 'B');") < wsrc2.indexOf("foundLine_(unitC, famC, 'C');") && wsrc2.indexOf("foundLine_(unitC, famC, 'C');") < wsrc2.indexOf('// ── aggregates + score accrual'));
}

// ═══ engine.96 Task 11 (S413) — the heritage roll, born in the family's field ═══
console.log('engine.96 T11 the heritage roll mints in the family\'s field at the class size');
{
  const R2 = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  const appended = [];
  const updateHeritageT11 = new Function('Logger', 'queueAppendIntent_', 'safeRand_', 'inWorldStamp_', 'recordHookRipple_', 'parseJSON', 'ECONOMIC_PARAMETERS',
    CAL_SRC + '\n' + R2('../phase05-citizens/educationCareerEngine.js') + '\n' + R2('../phase05-citizens/runCareerEngine.js') + '\n' + R2('../phase05-citizens/applyBusinessDynamics.js') + '\n' + R2('../phase05-citizens/generationalWealthEngine.js') + '\nreturn updateHeritage_;')(
    { log() {} }, (ctx, tab, row, reason) => appended.push({ tab, row, reason }), (ctx) => ctx.rng, () => 'Y3C110', () => {}, (v, f) => { try { return JSON.parse(v); } catch (e) { return f; } }, []);
  const HDR = SL_HEADER.concat(['Tier', 'LineageId', 'SpouseId', 'UsageCount', 'CIV (y/n)', 'LifeHistory', 'SkillTags', 'RoleType']);
  const hi = (n) => HDR.indexOf(n);
  const person = (popid, first, last, hood, nw, line, tags, role) => cit(popid, first, last, hood, 90000, { netWorth: nw }).concat([1, line, '', 0, '', 'Y2C1 — born', tags, role]);
  const HL_HDR = ['LineageId', 'FamilyName', 'FounderPopId', 'FoundedCycle', 'FoundedDoor', 'Generations', 'LivingMembers', 'MembersList', 'HeritageScore', 'HeritageTier', 'TotalNetWorth', 'HomesOwned', 'BusinessesOwned', 'CivicMembers', 'FameMembers', 'LastUpdated'];
  const people = [
    person('POP-00018', 'Benji', 'Dillon', 'Rockridge', 400000000, 'LIN-00002', 'athlete', 'Pitcher, Oakland A\'s Legend'),
    person('POP-00742', 'Maya', 'Torres-Dillon', 'Rockridge', 50000, 'LIN-00002', 'Education', 'High School Science Teacher'),
  ];
  const sheets = {
    Heritage_Ledger: mockSheet([HL_HDR.slice(), ['LIN-00002', 'Dillon', 'POP-00018', 103, 'A', 1, 2, '["POP-00018","POP-00742"]', 60, 'Established', 400050000, 1, '[]', 0, 1, 109]]),
    Business_Ledger: mockSheet([['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'], ['BIZ-00179', 'Night Walk Records', 'Retail', 'Rockridge', 4, 42000, 380000, 2, '']]),
    Household_Ledger: mockSheet([HH_HEADER.slice()]),
    Family_Relationships: mockSheet([['RelationshipId', 'Citizen1', 'Citizen2', 'RelationshipType', 'SinceCycle', 'Status']])
  };
  const hwWrites = [];
  const ctx = { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: HDR.slice(), rows: people, dirty: false }, summary: { cycleId: 110, storyHooks: [] }, config: { cycleCount: 110, bizIdHighWater: 179 }, rng: () => 0.01, now: 'Y3C110', _sheets: sheets,
    cache: { getData: () => ({ exists: true, values: [['Key', 'Value', 'Description'], ['bizIdHighWater', 179, '']] }), queueWrite: (tab, r, c, v) => hwWrites.push([tab, r, c, v]) } };
  const res = updateHeritageT11(ctx.ss, ctx, 110);
  const biz = appended.find(a => a.tab === 'Business_Ledger');
  assert('an Established line with an open slot rolls (rng 0.01 < 0.15) and mints ONE business row', res.businessesOpened === 1 && !!biz, JSON.stringify(appended));
  assert('born in the family\'s field: Maya\'s Education → "Dillon Academy", Sector Education, 15 staff at $62K, revenue = capital = $1.2M (the class cap, not $80M), growth 2', biz && biz.row[1] === 'Dillon Academy' && biz.row[2] === 'Education' && biz.row[4] === 15 && biz.row[5] === 62000 && biz.row[6] === 1200000 && biz.row[7] === 2, JSON.stringify(biz && biz.row));
  assert('Key_Personnel carries the staker with the founder tag; the BIZ-ID follows the high-water mark', biz && biz.row[8] === 'POP-00018 Benji Dillon (founder)' && biz.row[0] === 'BIZ-00180', JSON.stringify(biz && biz.row));
  assert('the stake leaves the staker: Benji\'s NetWorth − $1.2M; the reason names the field', Number(people[0][hi('NetWorth')]) === 400000000 - 1200000 && /Education, family/.test(biz.reason));
  assert('the hook names the field', ctx.summary.storyHooks.some(h => h.hookType === 'HERITAGE_BUSINESS_OPENING' && /Dillon Academy/.test(h.description) && /\(Education\)/.test(h.description)));
  assert('the BIZ-ID high-water mark advances to 180 through the cache write', hwWrites.some(w => w[0] === 'World_Config' && w[3] === 180) && ctx.config.bizIdHighWater === 180, JSON.stringify(hwWrites));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
