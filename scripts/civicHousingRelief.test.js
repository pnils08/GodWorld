#!/usr/bin/env node
'use strict';
/**
 * engine.251 — housing lever (plan docs/plans/2026-09-20-housing-lever.md).
 *
 * Producer → slice → household writer → move → purchase, in one Apps-Script-shaped
 * scope. Synthetic households only (HH-9xx), no network, no canon.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
global.inWorldStamp_ = () => 'Y3C1';
global.safeRand_ = (ctx) => ctx.rng || (() => 0.5);
global.queueAppendIntent_ = () => {};
global.queueCellIntent_ = () => {};
global.recordRipple_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);
const errors = [];
global.logEngineError_ = (ctx, phase, e) => errors.push(phase + ': ' + (e && e.message));

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SRC = [
  '../phase01-config/advanceSimulationCalendar.js',
  '../phase02-world-state/applyInitiativeImplementationEffects.js',
  '../phase05-citizens/householdFormationEngine.js',
  '../phase05-citizens/migrationTrackingEngine.js',
  '../phase05-citizens/generationalWealthEngine.js',
].map(read).join('\n');
const E = new Function(SRC + '\nreturn { applyInitiativeImplementationEffects_, buildHousingReliefSlice_, getCivicHousingDials_, netRentFromGross_, housingReliefForHood_, applyHousingRelief_, ensureHousingReliefColumns_, updateHouseholdLedgerMove_, HOUSING_RELIEF_COLUMNS_ };')();

function mockSheet(values) {
  const pad = (r, n) => { while (r.length < n) r.push(''); return r; };
  let maxCols = values[0].length;
  return {
    _values: values,
    getDataRange() { return { getValues: () => values.map(r => pad(r.slice(), values[0].length)) }; },
    getLastColumn() { return values[0].length; },
    getLastRow() { return values.length; },
    getMaxColumns() { return maxCols; },
    insertColumnsAfter(after, n) { maxCols = Math.max(maxCols, after + n); },
    appendRow(row) { values.push(pad(row.slice(), values[0].length)); },
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      return {
        getValues: () => Array.from({ length: numRows }, (_, i) => Array.from({ length: numCols }, (_, j) => (values[row - 1 + i] || [])[col - 1 + j] ?? '')),
        setValues: (vals) => { for (let i = 0; i < numRows; i++) { while (values.length < row + i) values.push([]); for (let j = 0; j < numCols; j++) values[row - 1 + i][col - 1 + j] = vals[i][j]; } },
        setValue: (v) => { while (values.length < row) values.push([]); values[row - 1][col - 1] = v; },
      };
    },
  };
}
const HH_HEAD = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome', 'FormedCycle', 'DissolvedCycle', 'Status', 'HouseholdSavings'];
const TR_HEAD = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget', 'MayoralAction', 'Stage', 'LastWorkCycle', 'LastStageChangeCycle'];
const CONFIG = { civicHousingReliefEnabled: 1, civicHousingReliefRate: 0.10, civicHousingCohortMinRenters: 10, civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3 };
function ctxWith(trackerRows, hhRows, cfg, cycle) {
  const tabs = { Initiative_Tracker: mockSheet([TR_HEAD.slice(), ...trackerRows]), Household_Ledger: mockSheet([HH_HEAD.slice(), ...hhRows]) };
  return { summary: { cycleId: cycle || 110, previousCycleState: {} }, config: Object.assign({}, CONFIG, cfg || {}), persist: {}, now: 't',
    ss: { getSheetByName: (n) => tabs[n] || null }, _tabs: tabs };
}
const TR = (id, status, phase, stage, hoods, mayoral, lsc) => [id, 'Prog ' + id, status, 'housing', hoods, phase, 1000000, mayoral, stage, '', lsc || 108];
const HH = (id, hood, type, rent, income, status) => [id, 'POP-99' + id.slice(-3), 'single', JSON.stringify(['POP-99' + id.slice(-3)]), hood, type, rent, 0, income, 100, '', status || 'active', 0];
let n = 0; const ok = (c, l) => { assert(c, l); n++; };

// ---- producer → slice ----
{
  const ctx = ctxWith([TR('INIT-901', 'passed', 'operational', 'Standing', 'West Oakland, Fruitvale', 'signed')], [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  const sl = ctx.summary.initiativeHousingRelief;
  ok(sl.available === true && sl.rate === 0.10, 'slice available at the configured rate');
  ok(sl.hoods['West Oakland'].rate === 0.10 && sl.hoods['Fruitvale'].initiativeId === 'INIT-901', 'standing signed operational program serves both hoods');
  ok(sl.sources.length === 1 && sl.sources[0].tend === 1, 'tended program at full strength');
}
{
  const rows = [
    TR('INIT-902', 'passed', 'operational', 'Funded', 'Laurel', 'signed'),          // Funded pays nothing
    TR('INIT-903', 'passed', 'construction-active', 'Standing', 'Laurel', 'signed'), // construction pays nothing
    TR('INIT-904', 'passed', 'complete', 'Delivering', 'Laurel', 'signed'),          // closed service restores gross
    TR('INIT-905', 'passed', 'stalled', 'Standing', 'Laurel', 'signed'),             // failing phase
    TR('INIT-906', 'passed', 'operational', 'Standing', 'Laurel', 'none'),           // unsigned
    TR('INIT-907', 'proposed', 'operational', 'Proposed', 'Laurel', 'none'),         // pre-vote
  ];
  const ctx = ctxWith(rows, [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeHousingRelief.available === true && Object.keys(ctx.summary.initiativeHousingRelief.hoods).length === 0, 'Funded/construction/complete/stalled/unsigned/pre-vote all pay zero (valid EMPTY slice)');
}
{
  const rows = [TR('INIT-909', 'passed', 'operational', 'Standing', 'Laurel', 'signed'), TR('INIT-908', 'override-passed', 'operational', 'Delivering', 'Laurel; Temescal', 'none')];
  const ctx = ctxWith(rows, [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  const sl = ctx.summary.initiativeHousingRelief;
  ok(sl.hoods['Laurel'].initiativeId === 'INIT-908' && sl.sources.length === 2, 'equal rates tie-break by InitiativeID ascending; both stay in sources');
  ok(sl.hoods['Temescal'].initiativeId === 'INIT-908', 'override-passed qualifies; semicolon hood list splits');
}
{
  const ctx = ctxWith([TR('INIT-910', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 100)], [], {}, 110); // untended 10 > grace 6 → 1-0.15*4 = 0.4
  E.applyInitiativeImplementationEffects_(ctx);
  ok(Math.abs(ctx.summary.initiativeHousingRelief.hoods['Laurel'].rate - 0.04) < 1e-9, 'upkeep scales the rate (ruling c): untended 10 Cycles → 0.10 × 0.4');
}
{
  const ctx = ctxWith([], [], {}, 110); ctx.ss.getSheetByName = () => null;
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeHousingRelief.available === false && ctx.summary.initiativeHousingRelief.reason === 'tracker-missing', 'missing tracker → UNAVAILABLE, not empty');
}
{
  const ctx = ctxWith([TR('INIT-911', 'passed', 'operational', 'Standing', 'Laurel', 'signed')], [], { civicHousingReliefRate: '' }, 110);
  let threw = false; try { E.applyInitiativeImplementationEffects_(ctx); } catch (e) { threw = /civicHousingReliefRate/.test(e.message); }
  ok(threw, 'a missing rate dial throws by name (no silent default)');
}

// ---- pure helper ----
ok(E.netRentFromGross_(1500, 0.10).net === 1350 && E.netRentFromGross_(1500, 0.10).relief === 150, 'gross 1500 @10% → net 1350 relief 150');
ok(E.netRentFromGross_(1500, 0).net === 1500 && E.netRentFromGross_(1500, 1).net === 0, 'rates 0 and 1 are valid boundaries');
ok(E.netRentFromGross_(1333.33, 0.1).relief === 133.33 && E.netRentFromGross_(1333.33, 0.1).net === 1200, 'cent rounding, no float tails');
ok(E.netRentFromGross_(0, 0.1) === null && E.netRentFromGross_(-5, 0.1) === null && E.netRentFromGross_('x', 0.1) === null, 'invalid money → null, never a fake zero lease');
ok(E.netRentFromGross_(1000, 7).net === 0 && E.netRentFromGross_(1000, -1).net === 1000, 'rate clamps to [0,1]');

// ---- household writer ----
function hhFixture() {
  return [
    HH('HH-901', 'West Oakland', 'rented', 1500, 48000),
    HH('HH-902', 'Laurel', 'rented', 1200, 40000),         // off-hood
    HH('HH-903', 'West Oakland', 'owned', 2100, 90000),    // mortgage — never touched
    HH('HH-904', 'West Oakland', 'rented', 1400, 30000, 'dissolved'),
    HH('HH-905', 'West Oakland', 'rented', '', 20000),     // invalid rent
  ];
}
const slice = (hoods) => ({ available: true, reason: null, rate: 0.10, hoods: hoods, sources: [], unknownHoods: [] });
{ // arm + copy while DISABLED — nothing discounted
  const ctx = ctxWith([], hhFixture(), { civicHousingReliefEnabled: 0 }, 110);
  ctx.summary.initiativeHousingRelief = slice({ 'West Oakland': { rate: 0.10, initiativeId: 'INIT-901' } });
  const out = E.applyHousingRelief_(ctx, 110);
  const v = ctx._tabs.Household_Ledger._values;
  ok(out.armed === true && v[0].slice(13).join(',') === E.HOUSING_RELIEF_COLUMNS_.join(','), 'four relief columns armed after the live 13');
  const col = (name) => v[0].indexOf(name);
  ok(v[1][col('GrossMonthlyRent')] === 1500 && v[1][col('MonthlyRent')] === 1500 && out.grossCopied === 2 && out.relieved === 0, 'disabled: gross copied from MonthlyRent, obligation unchanged');
  ok(v[3][col('GrossMonthlyRent')] === '' && v[4][col('GrossMonthlyRent')] === '' && v[5][col('GrossMonthlyRent')] === '' && out.invalid === 1, 'owned, dissolved and invalid rows untouched (invalid counted)');
  const before = JSON.stringify(v);
  const out2 = E.applyHousingRelief_(ctx, 110);
  ok(out2.armed === false && JSON.stringify(v) === before, 'rerun arms nothing and changes nothing (idempotent)');
}
{ // enabled + slice
  const ctx = ctxWith([], hhFixture(), {}, 110);
  ctx.summary.initiativeHousingRelief = slice({ 'West Oakland': { rate: 0.10, initiativeId: 'INIT-901' } });
  const out = E.applyHousingRelief_(ctx, 110);
  const v = ctx._tabs.Household_Ledger._values; const col = (name) => v[0].indexOf(name);
  ok(v[1][col('MonthlyRent')] === 1350 && v[1][col('HousingReliefMonthly')] === 150 && v[1][col('HousingReliefCycle')] === 110 && v[1][col('HousingReliefInitiativeID')] === 'INIT-901' && v[1][col('GrossMonthlyRent')] === 1500, 'in-hood renter: net 1350, relief 150, receipt names the program, gross kept');
  ok(v[2][col('MonthlyRent')] === 1200 && v[2][col('HousingReliefMonthly')] === 0 && v[2][col('HousingReliefInitiativeID')] === '', 'off-hood renter: full gross, no receipt program');
  ok(v[3][col('MonthlyRent')] === 2100 && v[3][col('GrossMonthlyRent')] === '', 'owned row keeps its mortgage');
  ok(out.relieved === 1 && out.renters === 3, 'counts: one relieved of three active renters');
  const out2 = E.applyHousingRelief_(ctx, 110);
  ok(v[1][col('MonthlyRent')] === 1350 && out2.relieved === 1, 'same-Cycle rerun recomputes from gross — never a second discount');
  // program gone: valid EMPTY slice restores gross
  ctx.summary.initiativeHousingRelief = slice({});
  const out3 = E.applyHousingRelief_(ctx, 111);
  ok(v[1][col('MonthlyRent')] === 1500 && v[1][col('HousingReliefMonthly')] === 0 && v[1][col('HousingReliefInitiativeID')] === '' && out3.restored === 1, 'empty slice restores gross and clears the discount');
  // tracker unreadable: persisted state stands, nothing stamped
  ctx.summary.initiativeHousingRelief = slice({ 'West Oakland': { rate: 0.10, initiativeId: 'INIT-901' } });
  E.applyHousingRelief_(ctx, 112);
  ctx.summary.initiativeHousingRelief = { available: false, reason: 'tracker-unread', hoods: {}, sources: [] };
  const out4 = E.applyHousingRelief_(ctx, 113);
  ok(v[1][col('MonthlyRent')] === 1350 && v[1][col('HousingReliefCycle')] === 112 && out4.available === false && out4.relieved === 0, 'unavailable slice: last Cycle\'s rents stand, receipt not advanced');
}
{ // loud, non-fatal failure
  const ctx = ctxWith([], hhFixture(), { civicHousingReliefRate: 'nope' }, 110);
  ctx.summary.initiativeHousingRelief = slice({});
  const out = E.applyHousingRelief_(ctx, 110);
  ok(out.error && /civicHousingReliefRate/.test(out.error) && errors.some(e => /Phase5-HousingRelief/.test(e)), 'a bad dial is reported to Engine_Errors and returned, not thrown into the formation pass');
}

// ---- move writer ----
{
  const ctx = ctxWith([], hhFixture(), {}, 110);
  ctx.summary.initiativeHousingRelief = slice({ 'West Oakland': { rate: 0.10, initiativeId: 'INIT-901' } });
  E.applyHousingRelief_(ctx, 110);
  const v = ctx._tabs.Household_Ledger._values; const col = (name) => v[0].indexOf(name);
  E.updateHouseholdLedgerMove_(ctx, 'HH-902', 'West Oakland', 1800);   // Laurel → West Oakland at a new lease
  ok(v[2][col('Neighborhood')] === 'West Oakland' && v[2][col('GrossMonthlyRent')] === 1800 && v[2][col('MonthlyRent')] === 1620 && v[2][col('HousingReliefInitiativeID')] === 'INIT-901', 'move INTO a relief hood: gross = new lease, discount applied in the same write');
  E.updateHouseholdLedgerMove_(ctx, 'HH-901', 'Laurel', 1300);        // West Oakland → Laurel
  ok(v[1][col('GrossMonthlyRent')] === 1300 && v[1][col('MonthlyRent')] === 1300 && v[1][col('HousingReliefMonthly')] === 0 && v[1][col('HousingReliefInitiativeID')] === '', 'move OUT: gross restored at the new lease, discount cleared');
  E.updateHouseholdLedgerMove_(ctx, 'HH-903', 'Laurel', 1300);        // OWNED row handed to the move writer
  ok(v[3][col('MonthlyRent')] === 2100 && v[3][col('Neighborhood')] === 'West Oakland' && v[3][col('GrossMonthlyRent')] === '' && v[3][col('HousingReliefMonthly')] === '', 'G-EC70 (builder ruling): an owned household is never moved or rebased — mortgage, hood and relief cells untouched');
  const migSrc = read('../phase05-citizens/migrationTrackingEngine.js');
  ok(/buildHouseholdHousingMap_\(ctx\.ss\)[\s\S]*?if \(hType !== 'rented'\) \{ ownedSkipped\+\+; continue; \}/.test(migSrc), 'G-EC70: processRelocations_ skips every household unit that is not a rented one');
}

// ---- purchase reads gross, clears relief (source pins) ----
{
  const src = read('../phase05-citizens/generationalWealthEngine.js');
  ok(/if \(cGross >= 0 && Number\(hv\[q\]\[cGross\]\) > 0\) rent = Number\(hv\[q\]\[cGross\]\);\s*\n\s*if \(rent <= 0\) continue;/.test(src), 'trackHomeOwnership_ prices and gates on the GROSS lease');
  ok(/setValue\(mortgage\);[\s\S]{0,400}cGross \+ 1\)\.setValue\(''\)[\s\S]{0,200}cRelief \+ 1\)\.setValue\(0\)[\s\S]{0,200}cRInit \+ 1\)\.setValue\(''\)/.test(src), 'purchase clears gross / relief / program after writing the mortgage');
}
// ---- config seeds present, off by default ----
{
  const seeds = read('../phase01-config/engine94SheetContract.js');
  const m = seeds.match(/var ENGINE213_CONFIG_SEEDS = (\[[\s\S]*?\n\]);/);
  const arr = new Function('return ' + m[1])();
  ok(arr.every(x => Array.isArray(x) && x.length === 6), 'ENGINE213_CONFIG_SEEDS has no hole and every seed is a 6-tuple (a missing comma once indexed one seed by the next — bench C109 fatal, 2026-09-22)');
  ok(/\['civicHousingReliefEnabled', 0,/.test(seeds) && /\['civicHousingReliefRate', 0\.10,/.test(seeds) && /\['civicHousingCohortMinRenters', 10,/.test(seeds) && /\['civicDeliverMargin_housing', 0\.15,/.test(seeds), 'four dials seeded: enabled 0, rate 0.10 (rate ruling 0.20 pending the builder\'s direct word), min renters 10, margin 0.15 (measured at 20%)');
}
console.log('civicHousingRelief.test.js: ' + n + ' assertions passed');
