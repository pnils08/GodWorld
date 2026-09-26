#!/usr/bin/env node
'use strict';
/**
 * Initiatives in the World Job 5 (builder 2026-09-26: "build + running both
 * spend"). A build spends its capital share across its build weeks; a running
 * program burns its operating runway and closes at zero like the fund.
 * Producer (Phase 2) → Initiative_Tracker cell intents, in one Apps-Script-shaped
 * scope. Synthetic INIT-9xx rows, no network.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
const cells = [];
global.queueCellIntent_ = (ctx, tab, row, col, value, reason) => cells.push({ tab, row, col, value, reason });
global.queueAppendIntent_ = () => {};
global.recordRipple_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SRC = [
  '../phase01-config/advanceSimulationCalendar.js',
  '../phase02-world-state/applyInitiativeImplementationEffects.js',
  '../phase05-citizens/civicInitiativeEngine.js',
].map(read).join('\n');
const E = new Function(SRC + '\nreturn { applyInitiativeImplementationEffects_, planInitiativeSpend_, getCivicSpendDials_ };')();

function mockSheet(values) {
  return {
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getLastColumn() { return values[0].length; },
    getRange(row, col) { return { getValue: () => (values[row - 1] || [])[col - 1] ?? '' }; },
  };
}
const HEAD = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget', 'MayoralAction',
  'Stage', 'LastWorkCycle', 'LastStageChangeCycle', 'BudgetTotal', 'BudgetRemaining', 'LastDisburseCycle', 'MilestoneNotes'];
const col = (n) => HEAD.indexOf(n) + 1;
const CONFIG = { civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3,
  civicDisburseTranche: 400000, civicGrantCapMonths: 12, civicGrantHeadroomMonths: 1, civicGrantCooldownCycles: 26,
  civicCapitalShare: 0.6, civicOperatingWeeks: 52,
  civicBuildCycles_health: 8, civicBuildCycles_education: 8, civicBuildCycles_transit: 10, civicBuildCycles_sports: 12, civicBuildCycles_environment: 6 };
const ROW = (o) => [o.id, 'Program ' + o.id, o.status || 'passed', o.domain, 'Temescal', o.phase, '$', o.mayoral || 'signed',
  o.stage === undefined ? 'Standing' : o.stage, o.lastWork == null ? 109 : o.lastWork, 109, o.total, o.remaining, o.lastDisb == null ? '' : o.lastDisb, 'notes'];
function fire(rows, cfg, cycle) {
  cells.length = 0;
  const tabs = { Initiative_Tracker: mockSheet([HEAD.slice(), ...rows.map(ROW)]) };
  const ctx = { summary: { cycleId: cycle || 110, previousCycleState: {} }, config: Object.assign({}, CONFIG, cfg || {}), now: 't',
    ss: { getSheetByName: (n) => tabs[n] || null } };
  E.applyInitiativeImplementationEffects_(ctx);
  return ctx;
}
const valueAt = (c) => { const hit = cells.find(x => x.col === c); return hit ? hit.value : undefined; };
let n = 0; const ok = (c, l) => { assert(c, l); n++; };

// ---- a build spends capital across its build weeks ----
{
  const ctx = fire([{ id: 'INIT-950', domain: 'health', phase: 'construction-active', total: 45000000, remaining: 45000000 }]);
  ok(valueAt(col('BudgetRemaining')) === 41625000, 'clinic build week: 45M × 0.6 / 8 = 3.375M spent → 41,625,000');
  ok(valueAt(col('LastDisburseCycle')) === 110, 'spend receipt stamped with the Cycle');
  ok(!cells.some(c => c.col === col('ImplementationPhase')), 'a build never closes on spend');
  ok(ctx.summary.initiativeSpend.length === 1 && ctx.summary.initiativeSpend[0].build === true, 'slice names the build spend');
}
{
  fire([{ id: 'INIT-951', domain: 'health', phase: 'construction-active', total: 45000000, remaining: 18500000 }]);
  ok(valueAt(col('BudgetRemaining')) === 18000000, 'a build never spends below the operating floor (45M × 0.4)');
}
{
  fire([{ id: 'INIT-952', domain: 'health', phase: 'construction-active', total: 45000000, remaining: 18000000 }]);
  ok(cells.length === 0, 'a build at its floor spends nothing more');
}
{
  fire([{ id: 'INIT-953', domain: 'health', phase: 'construction-active', total: 45000000, remaining: 45000000, lastWork: 100 }], {}, 110);
  // both clocks: LastWorkCycle 100, LastStageChangeCycle 109 → tend clock counts from 109, inside grace → full tend
  ok(valueAt(col('BudgetRemaining')) === 41625000, 'tend clock counts from the later of work/stage change');
}
{
  const plan = E.planInitiativeSpend_({ build: true, total: 45000000, remaining: 45000000, tend: 0.4, buildCycles: 8, dials: { capitalShare: 0.6, operatingWeeks: 52 } });
  ok(plan.debit === 1350000 && plan.newRemaining === 43650000, 'an untended site (tend 0.4) does less work and spends less');
}

// ---- a running program burns runway ----
{
  const ctx = fire([{ id: 'INIT-954', domain: 'health', phase: 'operational', total: 45000000, remaining: 45000000 }]);
  ok(valueAt(col('BudgetRemaining')) === 17653846.15, 'clinic opened holding capital: trued to the 18M floor, then 18M / 52 → 17,653,846.15');
  ok(ctx.summary.initiativeSpend[0].weeksLeft === 51, 'weeks left reported for the board');
}
{
  fire([{ id: 'INIT-955', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000 }]);
  ok(valueAt(col('BudgetRemaining')) === 12259615.38, 'OARI shape: no-build category, whole budget is runway, 12.5M / 52 → 12,259,615.38');
}
{
  const ctx = fire([{ id: 'INIT-956', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 100 }]);
  ok(valueAt(col('BudgetRemaining')) === 0, 'last dollars spent');
  ok(valueAt(col('ImplementationPhase')) === 'complete', 'runway at zero → phase complete');
  ok(/^notes\nC110: operating budget exhausted/.test(valueAt(col('MilestoneNotes'))), 'exhaustion line appended, prior notes kept');
  ok(ctx.summary.initiativeSpend[0].exhausted === true, 'slice flags exhaustion');
}

// ---- gates ----
{
  fire([
    { id: 'INIT-957', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000, lastDisb: 110 },   // already spent this Cycle
    { id: 'INIT-958', domain: 'safety', phase: 'dispatch-live', total: '', remaining: '' },                               // pre-backfill blank
    { id: 'INIT-959', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000, mayoral: 'none' },   // unsigned
    { id: 'INIT-960', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000, stage: 'Funded' },   // not standing
    { id: 'INIT-961', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000, stage: '' },         // unstaged (the live INIT-007 shape)
    { id: 'INIT-962', domain: 'safety', phase: 'stalled', total: 12500000, remaining: 12500000 },                          // failing phase
    { id: 'INIT-963', domain: 'safety', phase: 'complete', total: 12500000, remaining: 12500000 },                         // closed
  ]);
  ok(cells.length === 0, 'already-spent / blank budget / unsigned / Funded / unstaged / stalled / complete spend nothing');
}
{
  const ctx = fire([{ id: 'INIT-964', domain: 'economic', phase: 'disbursement-active', total: 28000000, remaining: 28000000 }]);
  ok(ctx.summary.initiativeSpend.length === 0 && ctx.summary.initiativeDisbursement.programs.length === 1, 'the fund stays on its own grants path — Job 5 never touches disbursement-active');
}
{
  let threw = false;
  try { fire([{ id: 'INIT-965', domain: 'safety', phase: 'dispatch-live', total: 12500000, remaining: 12500000 }], { civicOperatingWeeks: '' }); }
  catch (e) { threw = /civicOperatingWeeks/.test(e.message); }
  ok(threw, 'a missing spend dial throws by name (no silent default)');
}

console.log('initiativeSpend.test.js: ' + n + ' assertions passed');
