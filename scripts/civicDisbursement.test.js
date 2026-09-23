#!/usr/bin/env node
'use strict';
/**
 * engine.255 — initiative budget disbursement (plan
 * docs/plans/2026-09-22-initiative-budget-disbursement.md Tasks 2 + 4).
 *
 * Producer → slice → household grant writer → tracker debit, in one Apps-Script-
 * shaped scope. Synthetic households only (HH-9xx / POP-99xxx), no network.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
global.inWorldStamp_ = () => 'Y3C1';
global.safeRand_ = (ctx) => ctx.rng || (() => 0.5);
const appends = [], cells = [];
global.queueAppendIntent_ = (ctx, tab, row) => appends.push({ tab, row });
global.queueCellIntent_ = (ctx, tab, row, col, value, reason) => cells.push({ tab, row, col, value, reason });
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
  '../phase05-citizens/civicInitiativeEngine.js',
].map(read).join('\n');
const E = new Function(SRC + '\nreturn { applyInitiativeImplementationEffects_, buildDisbursementSlice_, getCivicDisburseDials_, civicDomainDisburses_, planHousingDisbursement_, applyHousingDisbursement_, HOUSING_GRANT_COLUMNS_, CIVIC_STAGE_CATALOG_ };')();

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
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      return {
        getValues: () => Array.from({ length: numRows }, (_, i) => Array.from({ length: numCols }, (_, j) => (values[row - 1 + i] || [])[col - 1 + j] ?? '')),
        getValue: () => (values[row - 1] || [])[col - 1] ?? '',
        setValues: (vals) => { for (let i = 0; i < numRows; i++) { while (values.length < row + i) values.push([]); for (let j = 0; j < numCols; j++) values[row - 1 + i][col - 1 + j] = vals[i][j]; } },
        setValue: (v) => { while (values.length < row) values.push([]); values[row - 1][col - 1] = v; },
      };
    },
  };
}
const HH_HEAD = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome', 'FormedCycle', 'DissolvedCycle', 'Status', 'HouseholdSavings'];
const TR_HEAD = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget', 'MayoralAction', 'Stage', 'LastWorkCycle', 'LastStageChangeCycle', 'BudgetTotal', 'BudgetRemaining', 'LastDisburseCycle', 'MilestoneNotes'];
const CONFIG = { civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3,
  civicDisburseTranche_housing: 400000, civicHousingGrantCapMonths: 12, civicHousingGrantHeadroomMonths: 1, civicGrantCooldownCycles: 26, civicHousingCohortMinFlagged: 5 };
function ctxWith(trackerRows, hhRows, cfg, cycle, ledgerRows) {
  const tabs = { Initiative_Tracker: mockSheet([TR_HEAD.slice(), ...trackerRows]), Household_Ledger: mockSheet([HH_HEAD.slice(), ...hhRows]) };
  return { summary: { cycleId: cycle || 110, previousCycleState: {} }, config: Object.assign({}, CONFIG, cfg || {}), persist: {}, now: 't',
    ledger: { headers: ['POPID', 'Name', 'NetWorth', 'LastUpdated'], rows: ledgerRows || [], dirty: false },
    ss: { getSheetByName: (n) => tabs[n] || null }, _tabs: tabs };
}
const TR = (id, status, phase, stage, hoods, mayoral, lsc, remaining, domain, lastDisb) =>
  [id, 'Fund ' + id, status, domain || 'housing', hoods, phase, '$28M', mayoral, stage, lsc || 108, lsc || 108, 28000000, remaining == null ? 28000000 : remaining, lastDisb == null ? '' : lastDisb, 'notes'];
const HH = (id, hood, type, rent, income, savings, status, lastGrant) => {
  const r = [id, 'POP-99' + id.slice(-3), 'single', JSON.stringify(['POP-99' + id.slice(-3)]), hood, type, rent, 0, income, 100, '', status || 'active', savings || 0];
  if (lastGrant !== undefined) { r.push(lastGrant, 'INIT-OLD', 1); }
  return r;
};
let n = 0; const ok = (c, l) => { assert(c, l); n++; };

// ---- catalog flag ----
ok(E.civicDomainDisburses_('housing') === true && E.civicDomainDisburses_('health') === false && E.civicDomainDisburses_('economic') === false && E.civicDomainDisburses_('') === false, 'only housing disburses (catalog flag, not playable)');

// ---- producer → slice ----
{
  const ctx = ctxWith([TR('INIT-001', 'passed', 'disbursement-active', 'Standing', 'West Oakland', 'signed')], [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  const sl = ctx.summary.initiativeDisbursement;
  ok(sl.available === true && sl.programs.length === 1, 'one program on the slice');
  const p = sl.programs[0];
  ok(p.initiativeId === 'INIT-001' && p.domain === 'housing' && p.tranche === 400000 && p.remaining === 28000000 && p.tend === 1 && p.hoods.join() === 'West Oakland' && p.sheetRow === 2, 'tended standing signed program: tranche = dial, hoods folded, sheet row carried');
  ok(p.grantCapMonths === 12 && p.grantHeadroomMonths === 1 && p.cooldownCycles === 26, 'dials ride the program');
}
{
  const rows = [
    TR('INIT-902', 'passed', 'disbursement-active', 'Funded', 'Laurel', 'signed'),                 // Funded pays nothing
    TR('INIT-903', 'passed', 'construction-active', 'Standing', 'Laurel', 'signed'),               // construction pays nothing
    TR('INIT-904', 'passed', 'complete', 'Delivering', 'Laurel', 'signed'),                        // closed
    TR('INIT-905', 'passed', 'stalled', 'Standing', 'Laurel', 'signed'),                           // failing phase
    TR('INIT-906', 'passed', 'operational', 'Standing', 'Laurel', 'none'),                         // unsigned
    TR('INIT-907', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 108, 0),               // budget exhausted
    TR('INIT-908', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 108, 5000, 'health'),  // playable domain that does not disburse
    TR('INIT-909', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 108, ''),              // BudgetRemaining blank (no budget)
  ];
  const ctx = ctxWith(rows, [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeDisbursement.available === true && ctx.summary.initiativeDisbursement.programs.length === 0, 'Funded/construction/complete/stalled/unsigned/exhausted/non-disbursing/no-budget all pay zero (valid EMPTY slice)');
}
{
  const ctx = ctxWith([TR('INIT-910', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 100)], [], {}, 110); // untended 10 > grace 6 → 0.4 (both clocks at 100 — the tend clock counts from the later of the two)
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeDisbursement.programs[0].tranche === 160000, 'upkeep scales the tranche: untended 10 Cycles → 400000 × 0.4');
}
{
  const ctx = ctxWith([TR('INIT-911', 'passed', 'operational', 'Standing', 'Laurel', 'signed', 108, 1234.5)], [], {}, 110);
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeDisbursement.programs[0].tranche === 1234.5, 'tranche never exceeds what is left');
}
{
  const ctx = ctxWith([], [], {}, 110); ctx.ss.getSheetByName = () => null;
  E.applyInitiativeImplementationEffects_(ctx);
  ok(ctx.summary.initiativeDisbursement.available === false && ctx.summary.initiativeDisbursement.reason === 'tracker-missing', 'missing tracker → UNAVAILABLE, not empty');
}
{
  const ctx = ctxWith([TR('INIT-912', 'passed', 'operational', 'Standing', 'Laurel', 'signed')], [], { civicDisburseTranche_housing: '' }, 110);
  let threw = false; try { E.applyInitiativeImplementationEffects_(ctx); } catch (e) { threw = /civicDisburseTranche_housing/.test(e.message); }
  ok(threw, 'a missing tranche dial throws by name (no silent default)');
}

// ---- planner ----
function pool() {
  return [
    HH('HH-901', 'West Oakland', 'rented', 3625, 81430, 12776),          // crisis 0.534, needs 30724
    HH('HH-902', 'West Oakland', 'rented', 3621, 104654, 0),             // warning 0.415, needs 43452
    HH('HH-903', 'West Oakland', 'rented', 3625, 60000, 500000),         // burden high but buffered → unflagged
    HH('HH-904', 'West Oakland', 'owned', 4134, 60000, 0),               // owned crisis → never
    HH('HH-905', 'West Oakland', 'rented', 3625, 40000, 0, 'dissolved'), // dissolved → never
    HH('HH-906', 'Laurel', 'rented', 3000, 40000, 0),                    // off-hood
    HH('HH-907', 'West Oakland', 'rented', 1000, 20000, 0),              // burden 0.6, needs 12000
    HH('HH-908', 'West Oakland', 'rented', 3625, 150000, 0),             // burden 0.29 → unflagged
  ];
}
{
  const hdr = HH_HEAD.concat(E.HOUSING_GRANT_COLUMNS_);
  const rows = pool().map(r => r.concat(['', '', '']));
  rows.push(HH('HH-909', 'West Oakland', 'rented', 3625, 50000, 0, 'active', 100)); // cooldown: granted C100, 10 < 26
  rows.push(HH('HH-910', 'West Oakland', 'rented', 3625, 50000, 0, 'active', 110)); // already this Cycle
  const program = { initiativeId: 'INIT-001', tranche: 50000, remaining: 28000000, hoods: ['West Oakland'], grantCapMonths: 12, grantHeadroomMonths: 1, cooldownCycles: 26 };
  const plan = E.planHousingDisbursement_(hdr, rows, program, 110, h => h);
  ok(plan.eligible === 3 && plan.skipped.owned === 1 && plan.skipped.inactive === 1 && plan.skipped.offHood === 1 && plan.skipped.unflagged === 2 && plan.skipped.cooldown === 1 && plan.skipped.alreadyThisCycle === 1, 'eligibility matrix: owned, dissolved, off-hood, buffered, low-burden, cooldown and same-Cycle rows all excluded and counted');
  ok(plan.grants.map(g => g.householdId).join() === 'HH-907,HH-901,HH-902', 'order: worst burden first (0.60, 0.534, 0.415)');
  ok(plan.grants[0].amount === 13000 && plan.grants[0].clearsBuffer === true, 'grant fills to the buffer plus one month of headroom: 13 × 1000 − 0');
  ok(plan.grants[1].amount === 34349 && plan.grants[1].savingsAfter === 47125 && plan.grants[1].clearsBuffer === true, 'HH-901: 13 × 3625 − 12776 = 34349, buffer cleared with headroom');
  ok(plan.grants[2].amount === 2651 && plan.grants[2].clearsBuffer === false && plan.paid === 50000 && plan.trancheLeft === 0, 'tranche exhausted mid-list: HH-902 gets the honest partial 2651, paid == tranche');
}
{
  const hdr = HH_HEAD.concat(E.HOUSING_GRANT_COLUMNS_);
  const rows = [HH('HH-920', 'West Oakland', 'rented', 3625, 50000, 0).concat(['', '', ''])];
  const plan = E.planHousingDisbursement_(hdr, rows, { initiativeId: 'X', tranche: 400000, remaining: 1e6, hoods: ['West Oakland'], grantCapMonths: 6, grantHeadroomMonths: 1, cooldownCycles: 26 }, 110, h => h);
  ok(plan.grants[0].amount === 25375 && plan.grants[0].clearsBuffer === false, 'cap binds the buffer fill: 6 months × 3625 + 1 month headroom = 25375, still under the buffer (stays flagged, eligible again after cooldown)');
}

{ // fresh-row trap (bench C110/C111): cell savings 0, head holds 400k on the ledger → unflagged
  const hdr = HH_HEAD.concat(E.HOUSING_GRANT_COLUMNS_);
  const rows = [HH('HH-930', 'West Oakland', 'rented', 3625, 50000, 0).concat(['', '', '']), HH('HH-931', 'West Oakland', 'rented', 3625, 50000, 0).concat(['', '', ''])];
  const nw = { 'POP-99930': 400000, 'POP-99931': 100 };
  const savingsOf = (members) => { const ids = JSON.parse(members || '[]'); let sum = 0, seen = false; for (const id of ids) if (id in nw) { sum += nw[id]; seen = true; } return seen ? sum : NaN; };
  const plan = E.planHousingDisbursement_(hdr, rows, { initiativeId: 'X', tranche: 400000, remaining: 1e6, hoods: ['West Oakland'], grantCapMonths: 12, grantHeadroomMonths: 1, cooldownCycles: 26 }, 110, h => h, savingsOf);
  ok(plan.grants.length === 1 && plan.grants[0].householdId === 'HH-931' && plan.skipped.unflagged === 1 && plan.grants[0].savingsBefore === 100, 'the ledger is the truth for a fresh row: HH-930 (head 400k) unflagged, HH-931 (head 100) paid from its real savings');
  const noLedger = E.planHousingDisbursement_(hdr, rows, { initiativeId: 'X', tranche: 400000, remaining: 1e6, hoods: ['West Oakland'], grantCapMonths: 12, grantHeadroomMonths: 1, cooldownCycles: 26 }, 110, h => h, () => NaN);
  ok(noLedger.grants.length === 2, 'no ledger reading → the cell stands (never blocks)');
}

// ---- apply: household vectors + ledger + intents + tracker debit ----
{
  appends.length = 0; cells.length = 0;
  const ledger = [['POP-99901', 'A', 10000, ''], ['POP-99902', 'B', '$5,000', ''], ['POP-99907', 'C', 0, '']];   // heads under the buffer: the cell is the greater for HH-901 (12776), the ledger for HH-902 (5000)
  const ctx = ctxWith([TR('INIT-001', 'passed', 'disbursement-active', 'Standing', 'West Oakland', 'signed')], pool(), { civicDisburseTranche_housing: 50000 }, 110, ledger);
  E.applyInitiativeImplementationEffects_(ctx);
  const out = E.applyHousingDisbursement_(ctx, 110);
  const v = ctx._tabs.Household_Ledger._values; const col = (name) => v[0].indexOf(name);
  ok(out.available && out.programs === 1 && out.grants === 3 && out.paid === 50000 && out.debited === 50000 && out.armed === true && errors.length === 0, 'applied: 3 grants, $50,000 paid, $50,000 debited, receipt columns armed, no engine error');
  ok(v[0].slice(13).join(',') === E.HOUSING_GRANT_COLUMNS_.join(','), 'receipt columns armed after the live 13');
  ok(v[1][col('HouseholdSavings')] === 47125 && v[1][col('LastGrantCycle')] === 110 && v[1][col('LastGrantInitiativeID')] === 'INIT-001' && v[1][col('LastGrantAmount')] === 34349, 'HH-901 row: savings 47125, receipts stamped');
  ok(v[7][col('HouseholdSavings')] === 13000 && v[2][col('HouseholdSavings')] === 7651, 'HH-907 13000, HH-902 partial 2651 on top of the ledger-read 5000');
  ok(v[3][col('HouseholdSavings')] === 500000 && v[4][col('LastGrantCycle')] === '' && v[6][col('LastGrantCycle')] === '', 'buffered, owned and off-hood rows untouched');
  ok(ctx.ledger.rows[0][2] === 44349 && ctx.ledger.rows[1][2] === 7651 && ctx.ledger.rows[2][2] === 13000 && ctx.ledger.dirty === true, 'durable: head NetWorth += grant on ctx.ledger (a "$5,000" string parses)');
  ok(appends.length === 3 && appends.every(a => a.tab === 'LifeHistory_Log' && a.row[3] === 'Relief' && /stabilization grant from Fund INIT-001 \(INIT-001\)/.test(a.row[4])) && /covered for the year/.test(appends.find(a => a.row[1] === 'POP-99901').row[4]) && /partial/.test(appends.find(a => a.row[1] === 'POP-99902').row[4]), 'three LifeHistory lines, tag Relief, naming the fund; full vs partial worded');
  const tr = cells.filter(c => c.tab === 'Initiative_Tracker');
  const remainCol = TR_HEAD.indexOf('BudgetRemaining') + 1, lastCol = TR_HEAD.indexOf('LastDisburseCycle') + 1;
  ok(tr.length === 2 && tr.find(c => c.col === remainCol).value === 27950000 && tr.find(c => c.col === remainCol).row === 2 && tr.find(c => c.col === lastCol).value === 110, 'tracker intents: BudgetRemaining 28,000,000 − 50,000 and LastDisburseCycle 110 on the program row; no phase change');
  const p = ctx.summary.initiativeDisbursement.programs[0];
  ok(p.paid === 50000 && p.grants === 3 && p.debited === 50000 && p.newRemaining === 27950000 && p.status === 'disbursed', 'slice carries paid / grants / debited / newRemaining');
  // same-Cycle rerun pays nothing twice and debits nothing twice
  appends.length = 0; cells.length = 0;
  const out2 = E.applyHousingDisbursement_(ctx, 110);
  ok(out2.grants === 0 && out2.debited === 0 && appends.length === 0 && cells.length === 0 && v[1][col('HouseholdSavings')] === 47125, 'rerun in the same Cycle: receipts already stamped → no grant, no debit, no intent');
}
{ // tracker already stamped this Cycle → skip program
  appends.length = 0; cells.length = 0;
  const ctx = ctxWith([TR('INIT-001', 'passed', 'disbursement-active', 'Standing', 'West Oakland', 'signed', 108, 28000000, 'housing', 110)], pool(), {}, 110, []);
  E.applyInitiativeImplementationEffects_(ctx);
  const out = E.applyHousingDisbursement_(ctx, 110);
  ok(out.grants === 0 && out.debited === 0 && cells.length === 0 && ctx.summary.initiativeDisbursement.programs[0].status === 'already-disbursed', 'LastDisburseCycle == cycle → program skipped whole');
}
{ // budget end
  appends.length = 0; cells.length = 0;
  const ctx = ctxWith([TR('INIT-001', 'passed', 'disbursement-active', 'Standing', 'West Oakland', 'signed', 108, 30000)], pool(), {}, 110, []);
  E.applyInitiativeImplementationEffects_(ctx);
  const out = E.applyHousingDisbursement_(ctx, 110);
  const p = ctx.summary.initiativeDisbursement.programs[0];
  ok(p.tranche === 30000 && out.debited === 30000 && p.newRemaining === 0 && p.status === 'exhausted', 'last tranche = what is left; remaining 0');
  const phaseCol = TR_HEAD.indexOf('ImplementationPhase') + 1, notesCol = TR_HEAD.indexOf('MilestoneNotes') + 1;
  ok(cells.some(c => c.col === phaseCol && c.value === 'complete') && cells.some(c => c.col === notesCol && /budget exhausted/.test(c.value) && /^notes\n/.test(c.value)), 'budget at zero → phase complete + MilestoneNotes appended (prior notes kept)');
  ok(out.paid === 30000 && out.grants === 2, 'the final 30,000 still pays what it can (13000 + 17000 partial)');
}
{ // empty pool still drains the fund (off-camera disbursement is the fact)
  appends.length = 0; cells.length = 0;
  const ctx = ctxWith([TR('INIT-001', 'passed', 'disbursement-active', 'Standing', 'Dimond', 'signed')], pool(), {}, 110, []);
  E.applyInitiativeImplementationEffects_(ctx);
  const out = E.applyHousingDisbursement_(ctx, 110);
  ok(out.grants === 0 && out.debited === 400000 && out.armed === false && cells.length === 2, 'no eligible tracked row: nothing armed, nothing granted, the tranche still leaves the fund');
}
{ // unavailable slice → nothing
  const ctx = ctxWith([], pool(), {}, 110, []); ctx.summary.initiativeDisbursement = { available: false, reason: 'tracker-missing', programs: [] };
  const out = E.applyHousingDisbursement_(ctx, 110);
  ok(out.available === false && out.reason === 'tracker-missing' && out.grants === 0, 'unavailable slice → no writes, reason carried');
}

// ---- seeds ----
{
  const seeds = read('../phase01-config/engine94SheetContract.js');
  const m = seeds.match(/var ENGINE213_CONFIG_SEEDS = (\[[\s\S]*?\n\]);/);
  const arr = new Function('return ' + m[1])();
  const keys = arr.map(x => x[0]);
  ok(['civicDisburseTranche_housing', 'civicHousingGrantCapMonths', 'civicHousingGrantHeadroomMonths', 'civicGrantCooldownCycles', 'civicHousingCohortMinFlagged'].every(k => keys.includes(k)) && arr.every(x => Array.isArray(x) && x.length === 6), 'five disbursement dials seeded as 6-tuples');
  const by = Object.fromEntries(arr.map(x => [x[0], x[1]]));
  ok(by.civicDisburseTranche_housing === 400000 && by.civicHousingGrantCapMonths === 12 && by.civicHousingGrantHeadroomMonths === 1 && by.civicGrantCooldownCycles === 26 && by.civicHousingCohortMinFlagged === 5, 'seed values as the builder ruled (400k / 12 / +1 / 26 / 5)');
}
// ---- catalog parity ----
{
  const C = require('../lib/initiativePhaseContract');
  ok(JSON.stringify(E.CIVIC_STAGE_CATALOG_) === JSON.stringify(C.stageCatalogByDomain()), 'engine stage catalog (with disburses) deep-equals the lib projection');
  ok(C.INTERVENTION_CATALOG['housing-program'].disburses === true && Object.keys(C.INTERVENTION_CATALOG).filter(k => C.INTERVENTION_CATALOG[k].disburses).length === 1, 'only housing-program carries disburses:true');
}

console.log('civicDisbursement.test.js: ' + n + ' assertions passed');
