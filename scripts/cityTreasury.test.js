#!/usr/bin/env node
'use strict';
/**
 * engine.262 — the city treasury (builder rulings 2026-09-28): general fund with Baylight apart,
 * a weekly budget allocation, and a program the treasury can't cover opens underfunded.
 * Drives the real applyInitiativeImplementationEffects_ over mock sheets (initiativeSpend harness).
 * Run: node scripts/cityTreasury.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
const cells = [];
const appends = [];
global.queueCellIntent_ = (ctx, tab, row, col, value, reason) => cells.push({ tab, row, col, value, reason });
global.queueAppendIntent_ = (ctx, tab, row) => appends.push({ tab, row });
global.recordRipple_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SRC = ['../phase01-config/advanceSimulationCalendar.js', '../phase02-world-state/applyInitiativeImplementationEffects.js',
  '../phase05-citizens/civicInitiativeEngine.js'].map(read).join('\n');
const E = new Function(SRC + '\nreturn { applyInitiativeImplementationEffects_, readTreasuryLedger_, treasuryDraw_, treasuryIsVotedProgram_ };')();

function mockSheet(values) {
  return {
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getLastColumn() { return values[0].length; },
    getLastRow() { return values.length; },
    getRange(row, col) { return { getValue: () => (values[row - 1] || [])[col - 1] ?? '' }; },
  };
}
const HEAD = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget', 'MayoralAction',
  'Stage', 'LastWorkCycle', 'LastStageChangeCycle', 'BudgetTotal', 'BudgetRemaining', 'LastDisburseCycle', 'MilestoneNotes'];
const col = (n) => HEAD.indexOf(n) + 1;
const CONFIG = { civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3, civicDisburseTranche: 400000,
  civicGrantCapMonths: 12, civicGrantHeadroomMonths: 1, civicGrantCooldownCycles: 26, civicCapitalShare: 0.6, civicOperatingWeeks: 52,
  civicBuildCycles_health: 8, civicBuildCycles_education: 8, civicBuildCycles_transit: 10, civicBuildCycles_sports: 12, civicBuildCycles_environment: 6,
  treasuryOpeningBalance: 100000000, treasuryWeeklyAllocation: 5000000 };
const ROW = (o) => [o.id, o.name || ('Program ' + o.id), o.status || 'passed', o.domain || 'health', 'Temescal', o.phase || '', '$', o.mayoral || 'signed',
  'Standing', 109, 109, o.total, o.remaining == null ? o.total : o.remaining, '', ''];
const TR_HEAD = ['Cycle', 'Entry', 'Amount', 'Counterparty', 'BalanceAfter', 'Note'];
function fire(rows, ledger, cycle) {
  cells.length = 0; appends.length = 0;
  const tabs = { Initiative_Tracker: mockSheet([HEAD.slice(), ...rows.map(ROW)]), City_Treasury: mockSheet([TR_HEAD.slice(), ...(ledger || [])]) };
  const ctx = { summary: { cycleId: cycle || 110, previousCycleState: {} }, config: Object.assign({}, CONFIG), now: 't',
    ss: { getSheetByName: (n) => tabs[n] || null } };
  E.applyInitiativeImplementationEffects_(ctx);
  return ctx;
}
const tr = () => appends.filter(a => a.tab === 'City_Treasury').map(a => a.row);
let n = 0; const ok = (c, l) => { assert(c, l); n++; console.log('  ok  ' + l); };

console.log('engine.262 — city treasury');
{
  const ctx = fire([
    { id: 'INIT-001', total: 28000000 },
    { id: 'INIT-006', name: 'Baylight District — Final Council Vote', total: 2100000000 },
    { id: 'INIT-003', status: 'proposed', mayoral: '', total: 230000000 },
  ]);
  const rows = tr();
  ok(rows[0][1] === 'OPENING' && rows[0][2] === 100000000, 'an empty ledger opens the general fund at the configured balance');
  ok(rows.some(r => r[1] === 'PREFUNDED' && r[3] === 'INIT-001' && r[2] === 0), 'a program voted before the treasury is recorded, not charged');
  ok(!rows.some(r => r[3] === 'INIT-006'), 'Baylight stays off the general fund');
  ok(!rows.some(r => r[3] === 'INIT-003'), 'a proposed program is not charged');
  ok(rows.some(r => r[1] === 'REVENUE' && r[2] === 5000000), 'the weekly allocation lands');
  ok(ctx.summary.treasury.balance === 105000000, 'balance = opening + weekly (' + ctx.summary.treasury.balance + ')');
}
{
  // existing ledger with 40M left; a new $45M program passes → opens underfunded at 40M+5M weekly = 45M? use 60M program
  const ledger = [[109, 'OPENING', 100000000, 'GENERAL-FUND', 100000000, ''], [109, 'APPROPRIATION', -60000000, 'INIT-010', 40000000, '']];
  const ctx = fire([{ id: 'INIT-011', total: 60000000 }], ledger, 110);
  const ap = tr().find(r => r[1] === 'APPROPRIATION' && r[3] === 'INIT-011');
  ok(ap && ap[2] === -45000000, 'the program takes what is there: 40M balance + 5M weekly = 45M of 60M');
  ok(/opens underfunded/.test(ap[5]), 'the entry says it opened underfunded');
  const rem = cells.find(c => c.col === col('BudgetRemaining') && /underfunded/.test(c.reason));
  ok(rem && rem.value === 45000000, 'BudgetRemaining is capped at what was paid');
  ok(ctx.summary.treasury.balance === 0 && ctx.summary.treasury.underfunded.length === 1, 'the treasury is empty and the shortfall is on the record');
}
{
  const ledger = [[109, 'OPENING', 100000000, 'GENERAL-FUND', 100000000, ''], [109, 'APPROPRIATION', -12500000, 'INIT-012', 87500000, ''],
    [110, 'REVENUE', 5000000, 'WEEKLY-ALLOCATION', 92500000, '']];
  fire([{ id: 'INIT-012', total: 12500000 }], ledger, 110);
  ok(!tr().some(r => r[3] === 'INIT-012'), 'a program is charged once (ledger remembers it)');
  ok(!tr().some(r => r[1] === 'REVENUE'), 'the weekly allocation lands once per Cycle (a re-fire does not double it)');
}
{
  const d = E.treasuryDraw_(10, 25);
  ok(d.paid === 10 && d.short === 15 && d.balance === 0, 'draw: pays what is there, reports the shortfall');
  ok(E.treasuryIsVotedProgram_('override-passed', '') && E.treasuryIsVotedProgram_('passed', 'signed') && !E.treasuryIsVotedProgram_('passed', 'vetoed'), 'voted program = signed or overridden');
}
{
  // no City_Treasury tab: nothing changes (money appears at passage, as before)
  cells.length = 0; appends.length = 0;
  const tabs = { Initiative_Tracker: mockSheet([HEAD.slice(), ROW({ id: 'INIT-020', total: 1000 })]) };
  const ctx = { summary: { cycleId: 110, previousCycleState: {} }, config: Object.assign({}, CONFIG), now: 't', ss: { getSheetByName: (x) => tabs[x] || null } };
  E.applyInitiativeImplementationEffects_(ctx);
  ok(tr().length === 0 && ctx.summary.treasury === undefined, 'no treasury tab → no treasury writes');
}
{
  // a renewal passed last fire draws from the treasury; short money renews short
  const H2 = HEAD.concat(['RenewalAmount', 'RenewalOutcome', 'RenewalCreditCycle']);
  const r = ROW({ id: 'INIT-030', total: 12000000, remaining: 500000, phase: 'implementation-active' }).concat([4000000, 'RENEWED C109', '']);
  cells.length = 0; appends.length = 0;
  const ledger = [[109, 'OPENING', 100000000, 'GENERAL-FUND', 100000000, ''], [109, 'APPROPRIATION', -99000000, 'INIT-030', 1000000, ''],
    [110, 'REVENUE', 0, 'WEEKLY-ALLOCATION', 1000000, '']];
  const tabs = { Initiative_Tracker: mockSheet([H2, r]), City_Treasury: mockSheet([TR_HEAD.slice(), ...ledger]) };
  const ctx = { summary: { cycleId: 110, previousCycleState: {} }, config: Object.assign({}, CONFIG), now: 't', ss: { getSheetByName: (x) => tabs[x] || null } };
  E.applyInitiativeImplementationEffects_(ctx);
  const rn = tr().find(x => x[1] === 'RENEWAL');
  ok(rn && rn[2] === -1000000 && /renewed short/.test(rn[5]), 'a $4M renewal with $1M in the treasury renews short at $1M');
  const credit = cells.find(c => c.col === H2.indexOf('BudgetRemaining') + 1 && /renewal credit/.test(c.reason));
  ok(credit && credit.value === 1500000, 'BudgetRemaining gets only what was paid (0.5M + 1M)');
}
console.log('\ncityTreasury.test.js: ' + n + ' assertions passed');
