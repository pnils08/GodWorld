/**
 * debtLean.test.js — engine.276: debt follows net worth against one year of the
 * hood's median income, at a rate each way; the drag is capped at a share of the
 * week's saving; a promotion takes a level off and a job loss puts one on; the
 * top level ends in default at a per-Cycle chance, and the default's mark keeps
 * the household off the home roll.
 *
 * Covers the pure pieces and processMoneyLoop_ / trackHomeOwnership_ whole-file
 * (generationalWealthEngine.js), the job-loss note (runCareerEngine.js), the
 * DialState round-trip (citizenMemory.js) and the World_Config self-arm
 * (engine94SheetContract.js). Synthetic rows only, no network.
 *
 * Run: node scripts/debtLean.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
global.inWorldStamp_ = () => 'Y3C6';
global.safeRand_ = (ctx) => ctx.rng;
global.queueAppendIntent_ = () => {};
global.queueCellIntent_ = () => {};
global.recordRipple_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);
global.logEngineError_ = () => {};

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const CAL = read('../phase01-config/advanceSimulationCalendar.js');
const M = require('../utilities/citizenDialMap.js');
['pressureBar_', 'emitPressureTag_', 'pressureText_', 'pressureRunFromState_'].forEach(k => { global[k] = M[k]; });
const MEM = require('../utilities/citizenMemory.js');
Object.keys(MEM).forEach(k => { global[k] = MEM[k]; });
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.simYearOf_ = (ctx) => ctx.summary.simYear;
const FOLD = require('../utilities/compressLifeHistory.js');
const SRC = ['../phase02-world-state/loadNeighborhoodState.js', '../phase05-citizens/generationalWealthEngine.js'].map(read).join('\n');
const E = new Function(CAL + '\n' + SRC + '\nreturn { processMoneyLoop_, trackHomeOwnership_, debtLean_, debtDrag_, debtConfig_, ' +
  'noteDebtDefault_, debtDefaultMarked_, DEBT_TOP, DEBT_DEFAULT_RESET, DEBT_PAYOFF_COST, DEBT_DRAG, ENGINE276_KEYS, ' +
  'HOME_PRICE_TO_RENT, HOME_ELIGIBLE_NW };')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + detail : '')); failed++; }
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

const CY = 110;
const CFG = { debtLineMultiple: 1, debtRiseRate: 0.02, debtFallRate: 0.08, debtDragCapShare: 0.5,
              debtDefaultCycles: 12, debtDefaultMarkCycles: 52, maneuverRetreatDebt: 6 };
const HEAD = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Income', 'NetWorth', 'SavingsRate', 'DebtLevel', 'EducationLevel',
              'HouseholdId', 'LifeHistory', 'Neighborhood', 'LastPromotionCycle', 'ClockMode', 'DialState', 'Tier', 'LineageId',
              'WealthLevel', 'InheritanceReceived'];
const col = (n) => HEAD.indexOf(n);
function row(pop, o) {
  o = o || {};
  const r = HEAD.map(() => '');
  const set = (k, v) => { r[col(k)] = v; };
  set('POPID', pop); set('First', 'A'); set('Last', pop); set('Status', 'active'); set('BirthYear', 2000);
  set('Income', o.income != null ? o.income : 52000); set('NetWorth', o.nw != null ? o.nw : 0);
  set('SavingsRate', o.sav != null ? o.sav : 0.1); set('DebtLevel', o.debt != null ? o.debt : 0);
  set('HouseholdId', o.hh || ''); set('Neighborhood', o.hood != null ? o.hood : 'Temescal');
  set('LastPromotionCycle', o.promo || ''); set('ClockMode', o.clock || 'ENGINE');
  set('DialState', o.ds !== undefined ? o.ds : JSON.stringify({ base: { integrity: 50 }, mood: {}, streak: {}, pressure: {} }));
  set('Tier', 4); set('WealthLevel', o.wealth != null ? o.wealth : '');
  return r;
}
function sheet(values) {
  return { _v: values, getDataRange() { return { getValues: () => values }; },
           getRange(r, c) { return { setValue: (v) => { values[r - 1][c - 1] = v; } }; } };
}
// rolls: an array handed out in order; when it runs dry every later draw is 0.99 (nothing fires).
function makeCtx(rows, rolls, opts) {
  opts = opts || {};
  const draws = { n: 0 };
  const q = (rolls || []).slice();
  const hh = opts.households || [['HouseholdId', 'HouseholdIncome', 'MonthlyRent', 'HouseholdSavings', 'SuperCouple', 'Status']];
  return {
    draws: draws,
    rng: () => { draws.n++; return q.length ? q.shift() : 0.99; },
    config: Object.assign({ cycleCount: CY }, CFG, opts.config || {}),
    summary: Object.assign({ cycleId: CY, simYear: 2042, bankRate: 5,
      neighborhoodState: { Temescal: { medianIncome: 100000, trajectoryMomentum: 5, housingPressure: 5 },
                           Tight: { medianIncome: 100000, trajectoryMomentum: 0, housingPressure: 10 } } }, opts.summary || {}),
    ledger: { headers: HEAD, rows: rows, dirty: false },
    ss: { getSheetByName: (n) => n === 'Household_Ledger' ? sheet(hh) : null }
  };
}
const debtOf = (r) => Number(r[col('DebtLevel')]);
const nwOf = (r) => Number(r[col('NetWorth')]);
const lifeOf = (r) => String(r[col('LifeHistory')]);
const dsOf = (r) => JSON.parse(r[col('DialState')]);

// ---------------------------------------------------------------------------
console.log('═══ 1 — the lean, pure');
(function() {
  var L = E.debtLean_;
  var a = L(0, 100000, CFG, 1, false);
  assert('1.1 net worth zero: full rise rate', a.dir === 1 && near(a.p, 0.02), JSON.stringify(a));
  var b = L(50000, 100000, CFG, 1, false);
  assert('1.2 half way to the line: half the rise rate', b.dir === 1 && near(b.p, 0.01), JSON.stringify(b));
  var c = L(100000, 100000, CFG, 1, false);
  assert('1.3 on the line: leans down with no chance', c.dir === -1 && near(c.p, 0), JSON.stringify(c));
  var d = L(150000, 100000, CFG, 1, false);
  assert('1.4 half a line over: half the fall rate', d.dir === -1 && near(d.p, 0.04), JSON.stringify(d));
  var e = L(900000, 100000, CFG, 1, false);
  assert('1.5 far over: the fall rate, never more', e.dir === -1 && near(e.p, 0.08), JSON.stringify(e));
  var f = L(0, 100000, CFG, 1.25, false), g = L(900000, 100000, CFG, 1.25, false);
  assert('1.6 hood credit scales the rise, not the fall', near(f.p, 0.025) && near(g.p, 0.08));
  var h = L(0, 0, CFG, 1, false);
  assert('1.7 no hood line: no lean', h.dir === 0 && h.p === 0);
  var i = L(900000, 100000, CFG, 1, true), j = L(900000, 0, CFG, 1, true);
  assert('1.8 net worth is the only input: no household flag turns the lean up', i.dir === -1 && near(i.p, 0.08) && j.dir === 0);
})();

console.log('═══ 2 — the drag cap');
(function() {
  assert('2.1 under the cap the drag is level × 40', E.debtDrag_(2, 1, 1000, 0.5) === 80);
  assert('2.2 over the cap it is the share of the week\'s saving', E.debtDrag_(6, 1, 100, 0.5) === 50);
  assert('2.3 no saving, no drag', E.debtDrag_(6, 1, 0, 0.5) === 0);
  assert('2.4 share 1 can take the whole saving and no more', E.debtDrag_(6, 1.5, 100, 1) === 100);
  assert('2.5 the rate factor still scales the uncapped drag', E.debtDrag_(1, 1.5, 1000, 0.5) === 60);
})();

console.log('═══ 3 — config contract');
(function() {
  var threw = null;
  try { E.debtConfig_({ config: { debtLineMultiple: 1, debtRiseRate: 0.02, debtFallRate: 0.08, debtDragCapShare: 0.5, debtDefaultCycles: 12 } }); }
  catch (e) { threw = e.message; }
  assert('3.1 a missing key throws and names it', !!threw && threw.indexOf('debtDefaultMarkCycles') >= 0, threw);
  var ok = E.debtConfig_({ config: CFG });
  assert('3.2 six keys read', E.ENGINE276_KEYS.length === 6 && ok.debtFallRate === 0.08 && ok.debtDefaultMarkCycles === 52);
  var ctx = makeCtx([row('POP-A', { debt: 3 })], [0], { config: { debtRiseRate: undefined } });
  var t2 = null; try { E.processMoneyLoop_(ctx, CY); } catch (e) { t2 = e.message; }
  assert('3.3 the loop throws before any row moves', !!t2 && debtOf(ctx.ledger.rows[0]) === 3 && ctx.draws.n === 0, t2);
})();

console.log('═══ 4 — the loop: lean');
(function() {
  // under the line, roll under the chance
  var r = [row('POP-A', { nw: 0, debt: 2, sav: 0 })];
  var ctx = makeCtx(r, [0.019]);
  var res = E.processMoneyLoop_(ctx, CY);
  assert('4.1 under the line a low roll adds a level', debtOf(r[0]) === 3 && res.leanUp === 1 && res.debtUp === 1);
  assert('4.2 the rise writes the borrowed line, no hook', lifeOf(r[0]).indexOf('borrowed against tomorrow') >= 0 && !(ctx.summary.storyHooks || []).length);

  r = [row('POP-A', { nw: 0, debt: 2, sav: 0 })];
  ctx = makeCtx(r, [0.021]); E.processMoneyLoop_(ctx, CY);
  assert('4.3 a roll over the chance leaves it', debtOf(r[0]) === 2 && lifeOf(r[0]) === '');

  r = [row('POP-A', { nw: 0, debt: 4, sav: 0 })];
  ctx = makeCtx(r, [0]); E.processMoneyLoop_(ctx, CY);
  assert('4.4 a rise landing at 5 writes the peak line and its hook',
    debtOf(r[0]) === 5 && lifeOf(r[0]).indexOf('crossed a line') >= 0 && ctx.summary.storyHooks[0].hookType === 'DEBT_CRISIS');

  // over the line
  r = [row('POP-A', { nw: 500000, debt: 3, sav: 0 })];
  ctx = makeCtx(r, [0.079]); res = E.processMoneyLoop_(ctx, CY);
  assert('4.5 over the line a low roll takes a level off and charges for it',
    debtOf(r[0]) === 2 && nwOf(r[0]) === 500000 - E.DEBT_PAYOFF_COST * 3 && res.leanDown === 1, nwOf(r[0]));

  r = [row('POP-A', { nw: 500000, debt: 1, sav: 0 })];
  ctx = makeCtx(r, [0]); E.processMoneyLoop_(ctx, CY);
  assert('4.6 the last level off writes the cleared line (it never fired before: needed 3 levels in one week)',
    debtOf(r[0]) === 0 && lifeOf(r[0]).indexOf('last debt cleared') >= 0);

  // the lean never runs against the line
  r = [row('POP-A', { nw: 500000, debt: 3, sav: 0 }), row('POP-B', { nw: 0, debt: 3, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('4.7 high rolls move nobody', debtOf(r[0]) === 3 && debtOf(r[1]) === 3);
  r = [row('POP-A', { nw: 500000, debt: 0, sav: 0 })];
  ctx = makeCtx(r, [0]); E.processMoneyLoop_(ctx, CY);
  assert('4.8 over the line with no debt: roll 0 changes nothing', debtOf(r[0]) === 0 && nwOf(r[0]) === 500000);

  // the top
  r = [row('POP-A', { nw: 0, debt: 6, sav: 0 }), row('POP-B', { nw: 0, debt: 8, sav: 0 }), row('POP-C', { nw: 900000, debt: 8, sav: 0 })];
  ctx = makeCtx(r, [0, 0.99, 0.99,  0, 0.99, 0.99,  0, 0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('4.9 the lean writes nothing above 6: a 6 stays, a seeded 8 under the line stays, a seeded 8 over it falls',
    debtOf(r[0]) === 6 && debtOf(r[1]) === 8 && debtOf(r[2]) === 7, [debtOf(r[0]), debtOf(r[1]), debtOf(r[2])].join());

  // no line
  r = [row('POP-A', { nw: 0, debt: 2, sav: 0, hood: 'Nowhere' })];
  ctx = makeCtx(r, [0]); E.processMoneyLoop_(ctx, CY);
  assert('4.10 a hood with no median income: no lean', debtOf(r[0]) === 2);

  // credit
  r = [row('POP-A', { nw: 0, debt: 2, sav: 0, hood: 'Tight' })];
  ctx = makeCtx(r, [0.024]); E.processMoneyLoop_(ctx, CY);
  assert('4.11 a tight-credit hood raises the rise chance (0.02 × 1.25)', debtOf(r[0]) === 3);

  // a rent-burdened household row with an empty savings cell (the second bench: a household formed that Cycle)
  var hh = [['HouseholdId', 'HouseholdIncome', 'MonthlyRent', 'HouseholdSavings', 'SuperCouple', 'Status'], ['HH-1', 24000, 1500, 0, '', 'active']];
  r = [row('POP-A', { nw: 900000, debt: 2, sav: 0, hh: 'HH-1' })];
  ctx = makeCtx(r, [0.019], { households: hh }); E.processMoneyLoop_(ctx, CY);
  assert('4.12 a rent-burdened household does not turn the lean up for a citizen over the line', debtOf(r[0]) === 1);
  r = [row('POP-A', { nw: 900000, debt: 2, sav: 0, hh: 'HH-1' })];
  ctx = makeCtx(r, [0.081], { households: hh }); E.processMoneyLoop_(ctx, CY);
  assert('4.13 …and the fall stays a rate, not a certainty (the old crisis path added one every week)', debtOf(r[0]) === 2);

  // the multiple moves the line: 60k against a 100k median is under at 1x and over at 0.5x
  r = [row('POP-A', { nw: 60000, debt: 2, sav: 0 })];
  ctx = makeCtx(r, [0]); E.processMoneyLoop_(ctx, CY);
  var r2 = [row('POP-A', { nw: 60000, debt: 2, sav: 0 })];
  var ctx2 = makeCtx(r2, [0], { config: { debtLineMultiple: 0.5 } }); E.processMoneyLoop_(ctx2, CY);
  assert('4.15 debtLineMultiple moves the line: the same citizen rises at 1x and pays down at 0.5x', debtOf(r[0]) === 3 && debtOf(r2[0]) === 1, debtOf(r[0]) + '/' + debtOf(r2[0]));

  // draw count does not depend on debt
  r = [row('POP-A', { nw: 0, debt: 0, sav: 0 })]; ctx = makeCtx(r, []); E.processMoneyLoop_(ctx, CY); var n0 = ctx.draws.n;
  r = [row('POP-A', { nw: 0, debt: 4, sav: 0 })]; ctx = makeCtx(r, []); E.processMoneyLoop_(ctx, CY);
  assert('4.14 one lean draw and one shock draw per adult, with or without debt', n0 === 2 && ctx.draws.n === 2, n0 + '/' + ctx.draws.n);
})();

console.log('═══ 5 — the loop: drag and saving');
(function() {
  // income 52,000 at 10% -> 100 a week saved; level 6 drag 240 uncapped, 50 capped
  var r = [row('POP-A', { nw: 1000, debt: 6, sav: 0.1, clock: 'GAME' })];
  var ctx = makeCtx(r, [0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('5.1 a level-6 debtor still puts half the week\'s saving by', nwOf(r[0]) === 1050, nwOf(r[0]));
  r = [row('POP-A', { nw: 1000, debt: 1, sav: 0.1 })];
  ctx = makeCtx(r, [0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('5.2 a small debt drags its own 40', nwOf(r[0]) === 1060, nwOf(r[0]));
})();

console.log('═══ 6 — the loop: events');
(function() {
  var r = [row('POP-A', { nw: 50000, debt: 3, sav: 0, promo: CY })];
  var ctx = makeCtx(r, [0.99, 0.99]); var res = E.processMoneyLoop_(ctx, CY);
  assert('6.1 promoted this Cycle: a level off, no cost, no roll', debtOf(r[0]) === 2 && nwOf(r[0]) === 50000 && res.eventDown === 1, nwOf(r[0]));
  r = [row('POP-A', { nw: 0, debt: 3, sav: 0, promo: CY - 1 })];
  ctx = makeCtx(r, [0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('6.2 last Cycle\'s promotion moves nothing', debtOf(r[0]) === 3);
  r = [row('POP-A', { nw: 900000, debt: 3, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99], { summary: { jobLosses: { 'POP-A': CY } } }); res = E.processMoneyLoop_(ctx, CY);
  assert('6.3 lost the job this Cycle: a level on, whatever the net worth', debtOf(r[0]) === 4 && res.eventUp === 1);
  r = [row('POP-A', { nw: 900000, debt: 6, sav: 0, clock: 'GAME' })];
  ctx = makeCtx(r, [0.99, 0.99], { summary: { jobLosses: { 'POP-A': CY } } }); E.processMoneyLoop_(ctx, CY);
  assert('6.4 a job loss at the top writes no 7', debtOf(r[0]) === 6);
  r = [row('POP-A', { nw: 0, debt: 0, sav: 0, promo: CY })];
  ctx = makeCtx(r, [0.99, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('6.5 a promotion with no debt writes no −1', debtOf(r[0]) === 0);
  r = [row('POP-A', { nw: 0, debt: 3, sav: 0, promo: CY })];
  ctx = makeCtx(r, [0, 0.99]); E.processMoneyLoop_(ctx, CY);
  assert('6.6 a lean up and a promotion in one week net to no move and no line', debtOf(r[0]) === 3 && lifeOf(r[0]) === '');
})();

console.log('═══ 7 — the loop: the shock stays');
(function() {
  var r = [row('POP-A', { nw: 100, debt: 2, sav: 0 })];
  var ctx = makeCtx(r, [0.99, 0.001, 0.5]); E.processMoneyLoop_(ctx, CY);
  assert('7.1 a shock the savings cannot hold: net worth 0, a level on, its own line and hook',
    debtOf(r[0]) === 3 && nwOf(r[0]) === 0 && lifeOf(r[0]).indexOf('cost more than the savings') >= 0 && ctx.summary.storyHooks[0].hookType === 'MONEY_SHOCK');
  r = [row('POP-A', { nw: 500000, debt: 1, sav: 0 })];
  ctx = makeCtx(r, [0, 0.001, 0.5]); E.processMoneyLoop_(ctx, CY);
  assert('7.2 a covered shock in the week the debt cleared: the cleared line wins', debtOf(r[0]) === 0 && lifeOf(r[0]).indexOf('last debt cleared') >= 0);
  r = [row('POP-A', { nw: 100, debt: 1, sav: 0, promo: CY })];
  ctx = makeCtx(r, [0.99, 0.001, 0.5]); E.processMoneyLoop_(ctx, CY);
  assert('7.3 cleared by a promotion then borrowed for a shock: no "cleared" line over a standing debt',
    debtOf(r[0]) === 1 && lifeOf(r[0]).indexOf('last debt cleared') < 0 && lifeOf(r[0]).indexOf('cost more than the savings') >= 0, lifeOf(r[0]));
})();

console.log('═══ 8 — the ending');
(function() {
  var r = [row('POP-A', { nw: 5000, debt: 6, sav: 0 })];
  var ctx = makeCtx(r, [0.99, 0.99, 0.08]); var res = E.processMoneyLoop_(ctx, CY);
  var ds = dsOf(r[0]);
  assert('8.1 a default roll under 1/12: debt to 1, net worth to 0', debtOf(r[0]) === E.DEBT_DEFAULT_RESET && nwOf(r[0]) === 0 && res.defaults === 1);
  assert('8.2 the mark lands on DialState with the Cycle and a count', ds.debtDefault && ds.debtDefault.l === CY && ds.debtDefault.n === 1 && ds.base.integrity === 50, JSON.stringify(ds));
  assert('8.3 its line and its hook', lifeOf(r[0]).indexOf('defaulted on the debts') >= 0 && ctx.summary.storyHooks[0].hookType === 'DEBT_DEFAULT');
  assert('8.4 no debt pressure tag after the default (the wear cause lifts)', !(ds.pressure && ds.pressure.debt) && lifeOf(r[0]).split('\n').length === 1, lifeOf(r[0]));
  assert('8.5 the ledger is marked dirty', ctx.ledger.dirty === true);

  r = [row('POP-A', { nw: 5000, debt: 6, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0.09]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.6 a roll over 1/12 holds the top, and the pressure tag runs', debtOf(r[0]) === 6 && res.defaults === 0 && dsOf(r[0]).pressure.debt.l === CY);

  r = [row('POP-A', { nw: 5000, debt: 6, sav: 0, clock: 'GAME' })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.7 a GAME-clock citizen never defaults and draws no default roll', debtOf(r[0]) === 6 && res.defaults === 0 && ctx.draws.n === 2);

  r = [row('POP-A', { nw: 5000, debt: 6, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0], { config: { debtDefaultCycles: 0 } }); res = E.processMoneyLoop_(ctx, CY);
  assert('8.8 debtDefaultCycles 0 turns the ending off', debtOf(r[0]) === 6 && res.defaults === 0);

  r = [row('POP-A', { nw: 0, debt: 5, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.9 under the top there is no default roll', debtOf(r[0]) === 5 && ctx.draws.n === 2);

  r = [row('POP-A', { nw: 0, debt: 8, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); E.processMoneyLoop_(ctx, CY);
  assert('8.10 a seeded 8 is at the top too', debtOf(r[0]) === 1);

  r = [row('POP-A', { nw: 0, debt: 6, sav: 0, ds: JSON.stringify({ base: { integrity: 40 }, mood: {}, streak: {}, debtDefault: { l: 20, n: 2 } }) })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); E.processMoneyLoop_(ctx, CY);
  assert('8.11 a later default counts up', dsOf(r[0]).debtDefault.n === 3 && dsOf(r[0]).debtDefault.l === CY);

  r = [row('POP-A', { nw: 0, debt: 6, sav: 0, ds: '' })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.12 no DialState: the default still lands and is counted unmarked', debtOf(r[0]) === 1 && res.unmarked === 1 && r[0][col('DialState')] === '');

  r = [row('POP-A', { nw: 90000, debt: 6, sav: 0, wealth: 9 })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); E.processMoneyLoop_(ctx, CY);
  assert('8.14 a default redoes WealthLevel from the emptied net worth, the same week', nwOf(r[0]) === 0 && Number(r[0][col('WealthLevel')]) < 9 && r[0][col('WealthLevel')] !== '', r[0][col('WealthLevel')]);
  r = [row('POP-A', { nw: 90000, debt: 6, sav: 0, wealth: 9 })];
  ctx = makeCtx(r, [0.99, 0.99, 0.5]); E.processMoneyLoop_(ctx, CY);
  assert('8.15 no default, no WealthLevel write from the loop', r[0][col('WealthLevel')] === 9);

  r = [row('POP-A', { nw: 1500000, debt: 6, sav: 0, wealth: 8 })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.17 over the line there is no default and no default roll (the first bench wiped $1.46M this way)',
    debtOf(r[0]) === 6 && nwOf(r[0]) === 1500000 && res.defaults === 0 && ctx.draws.n === 2 && !dsOf(r[0]).debtDefault, nwOf(r[0]) + '/' + ctx.draws.n);
  r = [row('POP-A', { nw: 100000, debt: 6, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.18 exactly on the line counts as over it', res.defaults === 0 && debtOf(r[0]) === 6);
  r = [row('POP-A', { nw: 1500000, debt: 6, sav: 0, hh: 'HH-1' })];
  ctx = makeCtx(r, [0.99, 0.99, 0], { households: [['HouseholdId', 'HouseholdIncome', 'MonthlyRent', 'HouseholdSavings', 'SuperCouple', 'Status'], ['HH-1', 24000, 1500, 0, '', 'active']] });
  res = E.processMoneyLoop_(ctx, CY);
  assert('8.19 a rent-burdened household is no way into a default over the line',
    res.defaults === 0 && debtOf(r[0]) === 6 && nwOf(r[0]) === 1500000 && ctx.draws.n === 2, nwOf(r[0]) + '/' + ctx.draws.n);
  r = [row('POP-A', { nw: 0, debt: 6, sav: 0, hood: 'Nowhere' })];
  ctx = makeCtx(r, [0.99, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.20 no hood line, no default', res.defaults === 0 && debtOf(r[0]) === 6);

  r = [row('POP-A', { nw: 100, debt: 5, sav: 0 })];
  ctx = makeCtx(r, [0.99, 0.001, 0.5, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.16 draw order: lean, shock, shock amount, then the default roll', res.defaults === 1 && res.expense === 1 && ctx.draws.n === 4, ctx.draws.n);

  r = [row('POP-A', { nw: 0, debt: 5, sav: 0 })];
  ctx = makeCtx(r, [0, 0.99, 0]); res = E.processMoneyLoop_(ctx, CY);
  assert('8.13 reaching the top and defaulting can share a week; the default line is the one written',
    debtOf(r[0]) === 1 && res.defaults === 1 && lifeOf(r[0]).indexOf('defaulted') >= 0 && lifeOf(r[0]).indexOf('crossed a line') < 0);
})();

console.log('═══ 9 — the mark survives the fold');
(function() {
  var c = MEM.deserialize_({ base: { integrity: 50 }, debtDefault: { l: 110, n: 1 }, wear: { d: 2, l: 109 } });
  var o = MEM.serialize_(c);
  assert('9.1 deserialize_ → serialize_ keeps debtDefault', o.debtDefault && o.debtDefault.l === 110 && o.debtDefault.n === 1 && o.wear.d === 2);
  assert('9.2 a row without one gains none', MEM.serialize_(MEM.deserialize_({ base: { integrity: 50 } })).debtDefault === undefined);
  assert('9.3 the mark reads true inside the window', E.debtDefaultMarked_(JSON.stringify(o), 161, 52) === true);
  assert('9.4 and false once the window has passed', E.debtDefaultMarked_(JSON.stringify(o), 162, 52) === false);
  // the Phase-9 fold writes with its OWN serializer (compressLifeHistory.js serializeDialState_), and so do the chaos cars
  var viaFold = JSON.parse(FOLD.serializeDialState_(MEM.deserialize_({ base: { integrity: 50 }, debtDefault: { l: 110, n: 2 } })));
  assert('9.6 the fold\'s own serializer keeps the mark', viaFold.debtDefault && viaFold.debtDefault.l === 110 && viaFold.debtDefault.n === 2, JSON.stringify(viaFold));
  // a real fold: the money loop defaults a citizen at the top, another holds the top (pressure tag -> wear -> the fold rewrites the cell)
  var FH = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'Status', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'BirthYear'];
  var full = { base: { drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: 50, family: 50, outabout: 50 },
               streak: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0 },
               mood: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0 }, folded: 100 };
  var held = Object.assign({}, full, { pressure: { debt: { n: 4, l: CY } }, debtDefault: { l: 80, n: 1 } });
  var frows = [['POP-A', '', '', JSON.stringify(held), 'Active', 4, 'ENGINE', 'no', 'no', 'no', 1990]];
  var fctx = { mode: {}, summary: { absoluteCycle: CY, simYear: 2042 }, config: { integrityWearRate: 1, integrityWearFloor: 10 }, ledger: { headers: FH, rows: frows, dirty: false } };
  FOLD.compressLifeHistory_(fctx, {});
  var after = JSON.parse(fctx.ledger.rows[0][3]);
  assert('9.7 a Phase-9 fold that rewrites the cell (wear step) carries the mark through',
    after.wear && after.wear.d === 1 && after.debtDefault && after.debtDefault.l === 80 && after.debtDefault.n === 1, JSON.stringify(after));
  assert('9.5 no mark, a broken cell, a blank: false', !E.debtDefaultMarked_('{"base":{}}', 120, 52) && !E.debtDefaultMarked_('{"debtDefault":', 120, 52) && !E.debtDefaultMarked_('', 120, 52));
})();

console.log('═══ 10 — the home roll skips a marked household');
(function() {
  function world(dsCell) {
    var r = [row('POP-A', { nw: 5000000, ds: dsCell }), row('POP-B', { nw: 5000000 })];
    var hh = [['HouseholdId', 'Members', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'Status', 'HouseholdIncome', 'HeadOfHousehold'],
              ['HH-1', JSON.stringify(['POP-A', 'POP-B']), 'Temescal', 'rented', 1000, '', 'active', 5000000, 'POP-A']];
    var ctx = makeCtx(r, [0], { households: hh });
    var sh = sheet(hh);
    return { ctx: ctx, hh: hh, res: E.trackHomeOwnership_({ getSheetByName: (n) => n === 'Household_Ledger' ? sh : null }, ctx, CY) };
  }
  var plain = world(undefined);
  assert('10.1 control: the household qualifies and buys on a low roll', plain.res.purchased === 1 && plain.hh[1][3] === 'owned', JSON.stringify(plain.res));
  var marked = world(JSON.stringify({ base: { integrity: 50 }, debtDefault: { l: CY - 10, n: 1 } }));
  assert('10.2 one member\'s default inside the window keeps the household off the roll',
    marked.res.purchased === 0 && marked.res.markedOut === 1 && marked.hh[1][3] === 'rented' && marked.ctx.draws.n === 0, JSON.stringify(marked.res));
  var old = world(JSON.stringify({ base: { integrity: 50 }, debtDefault: { l: CY - 52, n: 1 } }));
  assert('10.3 52 Cycles on the mark has lifted', old.res.purchased === 1);
  var threw = null;
  try { var c2 = makeCtx([row('POP-A')], [], { config: { debtDefaultMarkCycles: undefined } });
        E.trackHomeOwnership_({ getSheetByName: () => sheet([['HouseholdId', 'Members', 'HousingType', 'MonthlyRent']]) }, c2, CY); }
  catch (e) { threw = e.message; }
  assert('10.4 the home roll throws on a missing key', !!threw && threw.indexOf('engine.276') >= 0, threw);
})();

console.log('═══ 11 — the job-loss note');
(function() {
  var src = read('../phase05-citizens/runCareerEngine.js');
  var K = new Function(CAL + '\n' + src + '\nreturn { careerRecordLayoff_ };')();
  var ctx = { now: 'now', summary: {} }, logRows = [];
  var r = ['POP-9', 'BIZ-1', '', ''];
  K.careerRecordLayoff_(ctx, r, { iPop: 0, iEmp: 1, iLastUpd: 2, iLife: 3 }, CY, 'Let go', logRows);
  assert('11.1 every job loss notes the POPID and the Cycle', ctx.summary.jobLosses && ctx.summary.jobLosses['POP-9'] === CY && r[1] === '');
  var callers = 0, re = /careerRecordLayoff_\(/g;
  ['../phase05-citizens/runCareerEngine.js', '../phase05-citizens/judicialLifecycle.js'].forEach(f => { callers += (read(f).match(re) || []).length; });
  assert('11.2 four call sites and the definition (layoff, reconcile, custody dismissal ×2 files)', callers >= 4, callers);
  var eng = read('../phase01-config/godWorldEngine2.js');
  var iCareer = eng.indexOf("'Phase5-Career'"), iJud = eng.indexOf("'Phase5-Judicial'"), iWealth = eng.indexOf("'Phase5-GenerationalWealth'");
  assert('11.3 Career and Judicial both run before the money loop', iCareer > 0 && iCareer < iWealth && iJud < iWealth);
})();

console.log('═══ 12 — World_Config self-arm');
(function() {
  var source = read('../phase01-config/engine94SheetContract.js');
  var K = new Function(source + '\nreturn { seeds: ENGINE276_CONFIG_SEEDS, ensure: ensureEngine276Config_ };')();
  function cfgSheet(values) {
    return { getDataRange() { return { getValues: () => values }; }, getLastRow: () => values.length,
             getRange(r, c, n) { return { setValues: (v) => { for (var i = 0; i < n; i++) values[r - 1 + i] = v[i]; } }; } };
  }
  var v = [['Key', 'Value', 'Description']];
  var res = K.ensure({ getSheetByName: () => cfgSheet(v) });
  var got = {}; v.slice(1).forEach(x => { got[x[0]] = x[1]; });
  assert('12.1 six keys seeded at the cut\'s starting values', res.configSeeded === 6 && got.debtLineMultiple === 1 && got.debtRiseRate === 0.02 &&
    got.debtFallRate === 0.08 && got.debtDragCapShare === 0.5 && got.debtDefaultCycles === 12 && got.debtDefaultMarkCycles === 52, JSON.stringify(got));
  assert('12.2 the seed list and the loop read the same keys', K.seeds.map(s => s[0]).sort().join() === E.ENGINE276_KEYS.slice().sort().join());
  assert('12.3 a second run seeds nothing', K.ensure({ getSheetByName: () => cfgSheet(v) }).configSeeded === 0);
  var bad = null;
  try { K.ensure({ getSheetByName: () => cfgSheet([['Key', 'Value', 'Description'], ['debtRiseRate', 1.5, '']]) }); } catch (e) { bad = e.message; }
  assert('12.4 a rate over 1 is refused', !!bad, bad);
  var eng = read('../phase01-config/godWorldEngine2.js');
  var iEnsure = eng.indexOf('ensureEngine276Config_(ss);'), iLoad = eng.indexOf("safePhaseCall_(ctx, 'Phase1-LoadConfig'");
  assert('12.5 the self-arm runs before Phase1-LoadConfig', iEnsure > 0 && iLoad > iEnsure);
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
