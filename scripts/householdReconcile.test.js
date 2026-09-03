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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
