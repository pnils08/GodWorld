/**
 * cityRevenue.test.js — engine.271: the city takes money in.
 * A fine is a share of salary by level, capped below the grave level; a ticket is
 * the lowest level. A named defendant's fine and a ticket come out of NetWorth by
 * the money loop's shock rule and reach the treasury as they were paid. The
 * city's own court money is each hood's cleared charges at the minor fine on the
 * hood's median income. On tax day the owner households pay property tax and the
 * treasury is credited at city scale, hood by hood, thin hoods pooled; from then
 * on the weekly allocation is gone. No rng anywhere.
 *
 * Synthetic rows only, no network. Run: node scripts/cityRevenue.test.js
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
global.inWorldStamp_ = () => 'Y3C16';
global.safeRand_ = (ctx) => ctx.rng;
const appends = [];
global.queueAppendIntent_ = (ctx, tab, row, reason, domain, priority) => { appends.push({ tab, row, reason, domain, priority }); };
global.queueCellIntent_ = () => {};
global.recordRipple_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);
const errors = [];
global.logEngineError_ = (ctx, phase, err) => { errors.push({ phase, message: err.message }); };
global.simYearOf_ = (ctx) => ctx.summary.simYear;

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const M = require('../utilities/citizenDialMap.js');
['pressureBar_', 'emitPressureTag_', 'pressureText_', 'pressureRunFromState_'].forEach(k => { global[k] = M[k]; });
const MEM = require('../utilities/citizenMemory.js');
Object.keys(MEM).forEach(k => { global[k] = MEM[k]; });
global.nudgesForEvent_ = M.nudgesForEvent_; global.nudgesForReflection_ = M.nudgesForReflection_; global.baseTag_ = M.baseTag_;

const SRC = ['../phase01-config/advanceSimulationCalendar.js', '../phase02-world-state/applyInitiativeImplementationEffects.js',
  '../phase05-citizens/civicInitiativeEngine.js', '../phase02-world-state/loadNeighborhoodState.js',
  '../phase05-citizens/generationalWealthEngine.js', '../phase05-citizens/judicialLifecycle.js',
  '../phase04-events/chaosCarsEngine.js', '../phase01-config/engine94SheetContract.js'].map(read).join('\n');
const E = new Function(SRC + '\nreturn { cityFine_, cityChargeNetWorth_, cityRevenueConfig_, postTreasuryRevenue_, cityHoodMultipliers_, ' +
  'readTreasuryLedger_, ENGINE271_KEYS, ENGINE271_CONFIG_SEEDS, ensureEngine271Config_, judicialSettleFine_, cityCourtRevenue_, ' +
  'chaosTicketFine_, CHAOS_TICKET_OUTCOMES, collectPropertyTax_, homeCarries_, homeAnnualTax_, HOME_PRICE_TO_RENT, HOME_CARRY_MAX };')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + detail : '')); failed++; }
}
function throws(fn) { try { fn(); return false; } catch (e) { return e.message; } }

const CFG = { fineRateTicket: 0.005, fineCapTicket: 500, fineRateMinor: 0.05, fineCapMinor: 5000, fineRateSerious: 0.10,
  fineCapSerious: 25000, fineRateGrave: 0.25, propertyTaxRate: 0.01, businessTaxRate: 0, taxDayCyclePosition: 16, taxThinHoodFloor: 20 };
const HEAD = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Income', 'NetWorth', 'DebtLevel', 'HouseholdId', 'LifeHistory',
  'Neighborhood', 'ClockMode', 'WealthLevel', 'InheritanceReceived'];
const col = (n) => HEAD.indexOf(n);
function row(pop, o) {
  o = o || {};
  const r = HEAD.map(() => '');
  r[col('POPID')] = pop; r[col('First')] = 'A'; r[col('Last')] = pop; r[col('Status')] = o.status || 'active';
  r[col('BirthYear')] = o.by != null ? o.by : 2000; r[col('Income')] = o.income != null ? o.income : 60000;
  r[col('NetWorth')] = o.nw !== undefined ? o.nw : 100000; r[col('DebtLevel')] = o.debt != null ? o.debt : 0;
  r[col('Neighborhood')] = o.hood || 'Rockridge'; r[col('ClockMode')] = o.clock || 'ENGINE';
  return r;
}
const nwOf = (r) => r[col('NetWorth')], debtOf = (r) => r[col('DebtLevel')], lifeOf = (r) => String(r[col('LifeHistory')]);
function sheet(values) { return { getDataRange() { return { getValues: () => values.map(r => r.slice()) }; } }; }
function makeCtx(rows, o) {
  o = o || {};
  appends.length = 0; errors.length = 0;
  const tabs = { Household_Ledger: o.households ? sheet(o.households) : null, Business_Ledger: o.business ? sheet(o.business) : null };
  return {
    config: Object.assign({}, CFG, o.cfg || {}), now: 'now',
    ledger: { headers: HEAD.slice(), rows: rows, dirty: false },
    summary: {
      simYear: 2042, cycleOfYear: o.position != null ? o.position : 16,
      treasury: o.noTreasury ? undefined : { balance: o.balance != null ? o.balance : 1000000, cycle: o.cycle || 120, entries: 0, lastTaxCycle: o.lastTax || 0 },
      careJusticeDemand: o.noDemand ? undefined : { hoods: o.demand || {
        Rockridge: { judicialIntakes: 2, ratePopulation: 19000, trackedResidents: 95 },
        Downtown: { judicialIntakes: 3, ratePopulation: 24000, trackedResidents: 80 },
        Eastlake: { judicialIntakes: 1, ratePopulation: 20000, trackedResidents: 4 },
        Glenview: { judicialIntakes: 0, ratePopulation: 19000, trackedResidents: 6 } } },
      neighborhoodState: o.hoodState || { Rockridge: { medianRent: 4000, medianIncome: 160000 }, Downtown: { medianRent: 3000, medianIncome: 90000 },
        Eastlake: { medianRent: 1800, medianIncome: 70000 }, Glenview: { medianRent: 1600, medianIncome: 72000 } }
    },
    ss: { getSheetByName: (n) => tabs[n] || null }
  };
}
const treasuryRows = () => appends.filter(a => a.tab === 'City_Treasury').map(a => a.row);

console.log('\n1. the fine — a share of salary by level, capped below grave:');
(function () {
  assert('1.1 a $60K salary pays 300 / 3,000 / 6,000 / 15,000 by level', E.cityFine_(60000, 'ticket', CFG) === 300 && E.cityFine_(60000, 'minor', CFG) === 3000 &&
    E.cityFine_(60000, 'serious', CFG) === 6000 && E.cityFine_(60000, 'grave', CFG) === 15000);
  assert('1.2 the caps hold at the top: a $100M salary pays 500 / 5,000 / 25,000', E.cityFine_(1e8, 'ticket', CFG) === 500 && E.cityFine_(1e8, 'minor', CFG) === 5000 && E.cityFine_(1e8, 'serious', CFG) === 25000);
  assert('1.3 grave has no cap: $25M on $100M', E.cityFine_(1e8, 'grave', CFG) === 25000000);
  assert('1.4 no salary, no fine', E.cityFine_(0, 'minor', CFG) === 0 && E.cityFine_('', 'grave', CFG) === 0);
  assert('1.5 an unknown level throws', /unknown fine level/.test(throws(() => E.cityFine_(60000, 'petty', CFG)) || ''));
  assert('1.6 the rate dial moves the fine; the cap dial moves the ceiling', E.cityFine_(60000, 'minor', Object.assign({}, CFG, { fineRateMinor: 0.02 })) === 1200 &&
    E.cityFine_(1e8, 'minor', Object.assign({}, CFG, { fineCapMinor: 9000 })) === 9000);
})();

console.log('\n2. the charge — savings cover it, or zero and one debt level:');
(function () {
  let r = row('P', { nw: 10000, debt: 2 });
  let p = E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 3000);
  assert('2.1 savings cover it: net worth down by the amount, debt untouched', nwOf(r) === 7000 && debtOf(r) === 2 && p.paid === 3000 && p.borrowed === false);
  r = row('P', { nw: 1000, debt: 2 });
  p = E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 3000);
  assert('2.2 savings fall short: net worth to zero, debt up one, the full amount is owed', nwOf(r) === 0 && debtOf(r) === 3 && p.paid === 3000 && p.borrowed === true);
  r = row('P', { nw: 0, debt: 6 });
  E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 3000);
  assert('2.3 debt never goes past 6', debtOf(r) === 6);
  r = row('P', { nw: '', debt: 1 });
  p = E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 3000);
  assert('2.4 a blank net worth is nothing saved: it stays blank, debt up one', nwOf(r) === '' && debtOf(r) === 2 && p.borrowed === true);
  r = row('P', { nw: 'n/a', debt: 1 });
  p = E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 3000);
  assert('2.5 a net worth that cannot be read is never overwritten and nothing is charged', p === null && nwOf(r) === 'n/a' && debtOf(r) === 1);
  r = row('P', { nw: '$12,500', debt: 0 });
  E.cityChargeNetWorth_(r, col('NetWorth'), col('DebtLevel'), 500);
  assert('2.6 a formatted net worth is read as its number', nwOf(r) === 12000);
  assert('2.7 nothing to charge, nothing done', E.cityChargeNetWorth_(row('P'), col('NetWorth'), col('DebtLevel'), 0) === null);
})();

console.log('\n3. the dials:');
(function () {
  const seeds = E.ENGINE271_CONFIG_SEEDS.map(s => s[0]);
  assert('3.1 the seed list and the reader hold the same eleven keys', JSON.stringify(seeds.slice().sort()) === JSON.stringify(E.ENGINE271_KEYS.slice().sort()) && seeds.length === 11);
  assert('3.2 the starting values are the ruled ones', JSON.stringify(E.ENGINE271_CONFIG_SEEDS.map(s => s[1])) === JSON.stringify([0.005, 500, 0.05, 5000, 0.10, 25000, 0.25, 0.01, 0.01, 16, 20]));
  assert('3.3 business tax starts at 1% (builder 2026-10-02)', E.ENGINE271_CONFIG_SEEDS.find(s => s[0] === 'businessTaxRate')[1] === 0.01);
  const miss = Object.assign({}, CFG); delete miss.fineCapMinor;
  assert('3.4 a missing key throws by name', /fineCapMinor missing/.test(throws(() => E.cityRevenueConfig_({ config: miss })) || ''));
  assert('3.4b a blank or unreadable value is missing, not zero', /propertyTaxRate missing/.test(throws(() => E.cityRevenueConfig_({ config: Object.assign({}, CFG, { propertyTaxRate: '' }) })) || '') &&
    /taxDayCyclePosition missing/.test(throws(() => E.cityRevenueConfig_({ config: Object.assign({}, CFG, { taxDayCyclePosition: 'soon' }) })) || '') &&
    E.cityRevenueConfig_({ config: Object.assign({}, CFG, { businessTaxRate: 0 }) }).businessTaxRate === 0);
  const wc = [['Key', 'Value', 'Description'], ['cycleCount', 109, '']];
  const cfgSheet = { getDataRange() { return { getValues: () => wc.map(r => r.slice()) }; }, getLastRow: () => wc.length,
    getRange(r, c, n) { return { setValues: (v) => { v.forEach((x, i) => { wc[r - 1 + i] = x.slice(); }); } }; } };
  const res = E.ensureEngine271Config_({ getSheetByName: (n) => (n === 'World_Config' ? cfgSheet : null) });
  assert('3.5 the self-arm seeds all eleven on a sheet without them, and nothing the second time', res.configSeeded === 11 && wc.length === 13 &&
    E.ensureEngine271Config_({ getSheetByName: () => cfgSheet }).configSeeded === 0);
  const eng = read('../phase01-config/godWorldEngine2.js');
  assert('3.6 the self-arm runs at open, before the config is loaded', eng.indexOf('ensureEngine271Config_(ss)') > 0 && eng.indexOf('ensureEngine271Config_(ss)') < eng.indexOf("'Phase1-LoadConfig'"));
})();

console.log('\n4. the treasury post:');
(function () {
  let ctx = makeCtx([], { balance: 1000000, cycle: 120 });
  const r1 = E.postTreasuryRevenue_(ctx, 'COURT', 130000.4, 'note');
  const r2 = E.postTreasuryRevenue_(ctx, 'TICKETS', 300, '');
  assert('4.1 one REVENUE row: Cycle, entry, amount, counterparty, balance after, note', JSON.stringify(r1) === JSON.stringify([120, 'REVENUE', 130000, 'COURT', 1130000, 'note']));
  assert('4.2 the balance carries from one post to the next', r2[4] === 1130300 && ctx.summary.treasury.balance === 1130300);
  assert('4.3 queued on City_Treasury at the treasury\'s own priority (after the Phase-2 rows, in queue order)', appends.length === 2 && appends.every(a => a.tab === 'City_Treasury' && a.priority === 5));
  assert('4.4 nothing to post, no row', E.postTreasuryRevenue_(ctx, 'COURT', 0, '') === null && E.postTreasuryRevenue_(ctx, 'COURT', -5, '') === null && appends.length === 2);
  ctx = makeCtx([], { noTreasury: true });
  assert('4.5 no treasury this fire: nothing posted, and the missing credit is an error row by name and amount', E.postTreasuryRevenue_(ctx, 'COURT', 5000, 'n') === null && appends.length === 0 &&
    errors.length === 1 && errors[0].phase === 'TreasuryPost' && /COURT \$5000 not posted/.test(errors[0].message), JSON.stringify(errors));
  ctx = makeCtx([], { balance: 700, cycle: 120 });
  const z = E.postTreasuryRevenue_(ctx, 'PROPERTY-TAX', 0, 'nothing collected', true);
  assert('4.6 a zero row posts only when asked for (tax day): the day is on the tab whatever it collected', z && z[2] === 0 && z[4] === 700 && E.postTreasuryRevenue_(ctx, 'COURT', 0, '') === null);
})();

console.log('\n5. the ledger read — the allocation and the tax:');
(function () {
  const h = ['Cycle', 'Entry', 'Amount', 'Counterparty', 'BalanceAfter', 'Note'];
  let t = E.readTreasuryLedger_([h, [110, 'OPENING', 1e8, 'GENERAL-FUND', 1e8, ''], [110, 'REVENUE', 5e6, 'WEEKLY-ALLOCATION', 1.05e8, ''], [110, 'REVENUE', 130000, 'COURT', 105130000, '']]);
  assert('5.1 the balance is the last row\'s', t.balance === 105130000);
  assert('5.2 the allocation\'s own row marks its Cycle paid', t.revenueCycles['110'] === true);
  t = E.readTreasuryLedger_([h, [110, 'OPENING', 1e8, 'GENERAL-FUND', 1e8, ''], [111, 'REVENUE', 130000, 'COURT', 100130000, '']]);
  assert('5.3 a court row alone does not stand in for the allocation', !t.revenueCycles['111'] && t.taxLanded === false);
  t = E.readTreasuryLedger_([h, [110, 'OPENING', 1e8, 'GENERAL-FUND', 1e8, ''], [120, 'REVENUE', 3e8, 'PROPERTY-TAX', 4e8, ''], [172, 'REVENUE', 3e8, 'PROPERTY-TAX', 7e8, '']]);
  assert('5.4 a property-tax row marks the tax landed, and the latest tax Cycle is kept', t.taxLanded === true && t.lastTaxCycle === 172);
  assert('5.4b a damaged header stops the treasury instead of reading as an empty tab', /header must carry/.test(throws(() => E.readTreasuryLedger_([['Cycle', 'Entry', 'Amount', 'Counterparty', 'Note'], [110, 'OPENING', 1e8, 'GENERAL-FUND', '']])) || ''));
  t = E.readTreasuryLedger_([h, [110, 'OPENING', 1e8, 'GENERAL-FUND', 1e8, ''], [111, 'REVENUE', 100, 'COURT', '', '']]);
  assert('5.4c a blank balance cell is not a zero balance', t.balance === 1e8);
  const src = read('../phase02-world-state/applyInitiativeImplementationEffects.js');
  assert('5.5 the allocation is credited only while no tax has landed', /if \(!treasury\.taxLanded && !treasury\.revenueCycles\[String\(trCycle\)\]\)/.test(src));
  assert('5.6 the last tax Cycle rides S.treasury to the later phases', /lastTaxCycle: treasury\.lastTaxCycle \|\| 0/.test(src));
})();

console.log('\n6. the hood multiplier — thin hoods pooled:');
(function () {
  const demand = { hoods: { A: { ratePopulation: 20000, trackedResidents: 100 }, B: { ratePopulation: 5000, trackedResidents: 50 },
    C: { ratePopulation: 20000, trackedResidents: 5 }, D: { ratePopulation: 19000, trackedResidents: 8 }, Z: { ratePopulation: 18000, trackedResidents: 0 } } };
  const m = E.cityHoodMultipliers_(demand, 20);
  assert('6.1 a hood with enough tracked residents has its own: population over tracked', m.A === 200 && m.B === 100);
  assert('6.2 thin hoods share one: their populations over their tracked residents, together', m.C === 57000 / 13 && m.D === m.C && m.Z === m.C, m.C);
  const lone = E.cityHoodMultipliers_({ hoods: { A: { ratePopulation: 20000, trackedResidents: 100 }, E1: { ratePopulation: 20000, trackedResidents: 1 },
    E2: { ratePopulation: 20000, trackedResidents: 9 } } }, 20);
  assert('6.3 pooled, a hood with one tracked resident counts 4,000 times, not 20,000', lone.E1 === 4000 && lone.E2 === 4000 && lone.A === 200);
  const own = E.cityHoodMultipliers_(demand, 0);
  assert('6.4 floor 0: every hood with a tracked resident stands alone, a hood with none has no multiplier', own.C === 4000 && own.Z === undefined);
  assert('6.5 no hood table, no multipliers', Object.keys(E.cityHoodMultipliers_(null, 20)).length === 0);
  const allThin = E.cityHoodMultipliers_({ hoods: { Z: { ratePopulation: 1000, trackedResidents: 0 } } }, 20);
  assert('6.6 a pool with no tracked resident divides nothing', allThin.Z === undefined);
})();

console.log('\n7. the named fine — where the case closes:');
(function () {
  const cols = { iClock: col('ClockMode'), iBirth: col('BirthYear'), iIncome: col('Income'), iNW: col('NetWorth'), iDebt: col('DebtLevel'), iLife: col('LifeHistory') };
  const kase = (o) => Object.assign({ CaseId: 'J-1', POPID: 'P', Outcome: 'diverted', ChargeGravity: 'serious', ArrestCycle: 118, SourceSystem: 'patrol' }, o || {});
  const run = (r, c, before) => E.judicialSettleFine_(makeCtx([r]), r, c, 120, cols, CFG, before === undefined ? 'detained' : before);
  let r = row('P', { income: 60000, nw: 50000 });
  let f = run(r, kase());
  assert('7.1 a diverted serious case pays 10% of salary out of savings', f && f.fine === 6000 && nwOf(r) === 44000 && /\[Money\] fined \$6000 by the court — paid out of savings \[Fine J118\]/.test(lifeOf(r)), lifeOf(r));
  r = row('P', { income: 60000, nw: 50000 });
  f = run(r, kase({ Outcome: 'held-served', ChargeGravity: 'grave' }));
  assert('7.2 a held case pays when it is served; grave is 25%', f && f.fine === 15000 && nwOf(r) === 35000);
  r = row('P', { income: 60000, nw: 50000 });
  assert('7.3 a released case pays nothing', run(r, kase({ Outcome: 'released' })) === null && nwOf(r) === 50000 && lifeOf(r) === '');
  assert('7.4 no-arrest and a death pay nothing', run(row('P'), kase({ Outcome: 'no-arrest' })) === null && run(row('P'), kase({ Outcome: 'deceased' })) === null);
  r = row('P', { income: 60000, nw: 1000, debt: 2 });
  f = run(r, kase({ ChargeGravity: 'minor' }));
  assert('7.5 a fine the savings cannot hold: zero, one debt level, and the line says so', f.borrowed === true && nwOf(r) === 0 && debtOf(r) === 3 && /borrowed to cover it/.test(lifeOf(r)));
  r = row('P', { income: 60000, nw: 50000 });
  run(r, kase());
  assert('7.6 a case closing a second time is not fined twice', run(r, kase()) === null && nwOf(r) === 44000);
  assert('7.7 a GAME-clock citizen pays nothing', run(row('P', { clock: 'GAME' }), kase()) === null);
  assert('7.8 a minor pays nothing', run(row('P', { by: 2030 }), kase()) === null);
  assert('7.9 a reconcile case pays nothing (its gravity is a placeholder)', run(row('P'), kase({ SourceSystem: 'reconcile', ChargeGravity: 'minor' })) === null);
  assert('7.10 a case with no level pays nothing and does not throw', run(row('P'), kase({ ChargeGravity: '' })) === null);
  r = row('P', { income: 1e8, nw: 5e8 });
  f = run(r, kase({ ChargeGravity: 'serious' }));
  assert('7.11 the cap protects the top earner: $25,000 on a serious charge at $100M', f.fine === 25000);
  r = row('P', { nw: 'n/a' });
  const ctx = makeCtx([r]);
  assert('7.12 a net worth that cannot be read: no fine, an error row, the value untouched', E.judicialSettleFine_(ctx, r, kase(), 120, cols, CFG, 'detained') === null && nwOf(r) === 'n/a' && errors.length === 1 && errors[0].phase === 'Phase5-CourtRevenue');
  r = row('P', { income: 60000, nw: 50000 });
  assert('7.13 a case closing again after the citizen was already restored is not fined — the guard that does not depend on the life line', run(r, kase(), 'active') === null && nwOf(r) === 50000);
  r = row('P', { income: 60000, nw: 50000 });
  assert('7.14 a defendant in care when the case closes still pays', run(r, kase(), 'hospitalized') !== null && nwOf(r) === 44000);
  f = run(row('P', { income: 60000, nw: 50000 }), kase({ CaseId: 'J-C118-P' }));
  assert('7.15 the fine carries its case', f.caseId === 'J-C118-P' && f.popId === 'P');
})();

console.log('\n8. the city\'s court money — the hoods\' cleared charges:');
(function () {
  const ctx = makeCtx([]);
  let c = E.cityCourtRevenue_(ctx, CFG, {});
  // Rockridge 2 x 5,000 (cap) + Downtown 3 x 4,500 + Eastlake 1 x 3,500 + Glenview 0
  assert('8.1 each cleared charge pays the minor fine on its hood\'s median income', c.amount === 2 * 5000 + 3 * 4500 + 1 * 3500 && c.cases === 6, c.amount);
  c = E.cityCourtRevenue_(ctx, CFG, { Downtown: 1 });
  assert('8.2 a tracked arrest in the hood is taken out — the named fine is counted where it is paid', c.amount === 2 * 5000 + 2 * 4500 + 3500 && c.cases === 5);
  c = E.cityCourtRevenue_(ctx, CFG, { Eastlake: 4 });
  assert('8.3 more tracked arrests than cleared charges never goes below zero', c.cases === 5 && c.amount === 2 * 5000 + 3 * 4500);
  const noMed = makeCtx([], { hoodState: { Rockridge: { medianIncome: 160000 } } });
  assert('8.4 a hood with no median income on the map pays nothing rather than a guess', E.cityCourtRevenue_(noMed, CFG, {}).cases === 2);
  const none = E.cityCourtRevenue_(makeCtx([], { noDemand: true }), CFG, {});
  assert('8.5 no hood table is "unavailable", not zero charges', none.amount === 0 && /careJusticeDemand missing/.test(none.unavailable));
  const stale = makeCtx([]); stale.summary.cycleId = 120; stale.summary.careJusticeDemand.cycle = 119;
  assert('8.6 a hood table stamped for another Cycle is unavailable too', /is for Cycle 119, not 120/.test(E.cityCourtRevenue_(stale, CFG, {}).unavailable));
  const fresh = makeCtx([]); fresh.summary.cycleId = 120; fresh.summary.careJusticeDemand.cycle = 120;
  assert('8.7 this Cycle\'s table is read', E.cityCourtRevenue_(fresh, CFG, {}).cases === 6 && E.cityCourtRevenue_(fresh, CFG, {}).unavailable === '');
})();

console.log('\n9. the ticket:');
(function () {
  assert('9.1 a cop-car ticket and a parking ticket are tickets; a warning and an arrest are not', E.CHAOS_TICKET_OUTCOMES.ticket && E.CHAOS_TICKET_OUTCOMES.parking_ticket &&
    !E.CHAOS_TICKET_OUTCOMES.pulled_over_warning && !E.CHAOS_TICKET_OUTCOMES.arrested);
  let r = row('P', { income: 60000, nw: 10000 });
  let p = E.chaosTicketFine_(makeCtx([r]), r, 120, CFG);
  assert('9.2 a ticket costs 0.5% of salary: $300 at $60K, out of savings', p.paid === 300 && nwOf(r) === 9700);
  r = row('P', { income: 250000, nw: 10000 });
  assert('9.3 capped at $500', E.chaosTicketFine_(makeCtx([r]), r, 120, CFG).paid === 500);
  r = row('P', { income: 60000, nw: 100, debt: 1 });
  p = E.chaosTicketFine_(makeCtx([r]), r, 120, CFG);
  assert('9.4 a ticket the savings cannot hold: zero and one debt level', p.borrowed && nwOf(r) === 0 && debtOf(r) === 2);
  assert('9.5 a GAME-clock citizen, a minor and a citizen with no salary pay nothing', E.chaosTicketFine_(makeCtx([]), row('P', { clock: 'GAME' }), 120, CFG) === null &&
    E.chaosTicketFine_(makeCtx([]), row('P', { by: 2030 }), 120, CFG) === null && E.chaosTicketFine_(makeCtx([]), row('P', { income: 0 }), 120, CFG) === null);
  const src = read('../phase04-events/chaosCarsEngine.js');
  assert('9.6 the ticket is charged where it lands and posted as TICKETS', /CHAOS_TICKET_OUTCOMES\[outcome\.outcome\]/.test(src) && /postTreasuryRevenue_\(ctx, 'TICKETS', ticketPaid\.paid/.test(src));
})();

console.log('\n10. tax day:');
(function () {
  const HH = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome', 'FormedCycle', 'DissolvedCycle', 'Status'];
  const hhRow = (id, members, hood, type, status) => [id, members[0], 'family', JSON.stringify(members), hood, type || 'owned', 5000, 900000, 200000, 90, '', status || 'active'];
  const world = (o) => {
    const rows = [row('A1', { nw: 300000, hood: 'Rockridge' }), row('A2', { nw: 100000, hood: 'Rockridge' }), row('K1', { nw: 50000, by: 2035, hood: 'Rockridge' }),
      row('B1', { nw: 2000, debt: 1, hood: 'Eastlake' }), row('R1', { nw: 50000, hood: 'Downtown' }), row('D1', { nw: 80000, hood: 'Downtown', status: 'deceased' }), row('D2', { nw: 40000, hood: 'Downtown' })];
    const households = [HH, hhRow('H1', ['A1', 'A2', 'K1'], 'Rockridge'), hhRow('H2', ['B1'], 'Eastlake'), hhRow('H3', ['R1'], 'Downtown', 'rented'),
      hhRow('H4', ['D1', 'D2'], 'Downtown'), hhRow('H5', ['A1'], 'Rockridge', 'owned', 'dissolved')];
    return { rows, ctx: makeCtx(rows, Object.assign({ households }, o || {})) };
  };
  const byPop = (w, p) => w.rows.find(r => r[col('POPID')] === p);
  // home values: Rockridge 4000 x 12 x 22 = 1,056,000 -> 10,560; Eastlake 1800 x 264 = 475,200 -> 4,752; Downtown 3000 x 264 = 792,000 -> 7,920
  let w = world();
  let res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.1 on tax day the three owned, active households pay; the renter and the dissolved one do not', res.taxDay && res.households === 3 && nwOf(byPop(w, 'R1')) === 50000, JSON.stringify(res));
  assert('10.2 the bill is 1% of the hood\'s home value, split between the adults by net-worth share', nwOf(byPop(w, 'A1')) === 300000 - 7920 && nwOf(byPop(w, 'A2')) === 100000 - 2640, nwOf(byPop(w, 'A1')) + '/' + nwOf(byPop(w, 'A2')));
  assert('10.3 the household pays exactly its tax', (300000 - nwOf(byPop(w, 'A1'))) + (100000 - nwOf(byPop(w, 'A2'))) === 10560);
  assert('10.4 a minor shares the house, not the bill — a child\'s savings are neither billed nor counted in the split', nwOf(byPop(w, 'K1')) === 50000 && debtOf(byPop(w, 'K1')) === 0 && lifeOf(byPop(w, 'K1')) === '');
  assert('10.5 an owner who cannot cover it goes to zero and up one debt level', nwOf(byPop(w, 'B1')) === 0 && debtOf(byPop(w, 'B1')) === 2 && /property tax on the place in Eastlake — more than the savings could hold/.test(lifeOf(byPop(w, 'B1'))));
  assert('10.6 a dead member is not billed; the living adult carries the whole tax', nwOf(byPop(w, 'D1')) === 80000 && nwOf(byPop(w, 'D2')) === 40000 - 7920);
  assert('10.7 each payer gets one [Home] line with the amount', /Y3C16 — \[Home\] paid \$7920 in property tax on the place in Rockridge$/.test(lifeOf(byPop(w, 'A1'))), lifeOf(byPop(w, 'A1')));
  assert('10.8 collected is what the households paid', res.collected === 10560 + 4752 + 7920 && res.payers === 4 && res.borrowed === 1);
  // multipliers: Rockridge 19000/95 = 200, Downtown 24000/80 = 300, thin pool (Eastlake 4 + Glenview 6) = 39000/10 = 3900
  const expectCity = 10560 * 200 + 7920 * 300 + 4752 * 3900;
  const tr = treasuryRows();
  assert('10.9 the treasury is credited at city scale, hood by hood, the thin hoods on one pooled multiplier', res.cityTotal === expectCity && tr.length === 1 && tr[0][3] === 'PROPERTY-TAX' && tr[0][2] === expectCity && tr[0][4] === 1000000 + expectCity, res.cityTotal + ' vs ' + expectCity);
  assert('10.10 the tax Cycle is recorded for the rest of the fire', w.ctx.summary.treasury.lastTaxCycle === 120 && w.ctx.ledger.dirty === true);
  assert('10.11 wealth level is re-derived for a payer', byPop(w, 'A1')[col('WealthLevel')] !== '');

  w = world({ hoodState: { Nowhere: { medianRent: 1 } }, households: null });
  w.ctx.ss = { getSheetByName: (n) => (n === 'Household_Ledger' ? { getDataRange: () => ({ getValues: () => [HH] }) } : null) };
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.11b a tax day that collects nothing still posts its row — the day is on the tab', res.taxDay && res.collected === 0 && treasuryRows().length === 1 && treasuryRows()[0][3] === 'PROPERTY-TAX' && treasuryRows()[0][2] === 0 && w.ctx.summary.treasury.lastTaxCycle === 120);

  w = world({ position: 15 });
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 119);
  assert('10.12 any other week: nobody pays, nothing is posted', res.taxDay === false && nwOf(byPop(w, 'A1')) === 300000 && treasuryRows().length === 0);
  w = world({ cfg: { taxDayCyclePosition: 0 } });
  assert('10.13 position 0 turns tax day off', E.collectPropertyTax_(w.ctx.ss, w.ctx, 120).taxDay === false);
  w = world({ lastTax: 110 });
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.14 a tax day inside half a year of the last one bills nobody (a moved dial cannot bill twice)', res.taxDay === false && nwOf(byPop(w, 'A1')) === 300000);
  w = world({ lastTax: 68 });
  assert('10.15 a year later it bills again', E.collectPropertyTax_(w.ctx.ss, w.ctx, 120).taxDay === true);
  w = world({ noDemand: true });
  assert('10.16 no hood table: it throws before anyone is charged', /careJusticeDemand missing/.test(throws(() => E.collectPropertyTax_(w.ctx.ss, w.ctx, 120)) || '') && nwOf(byPop(w, 'A1')) === 300000);
  w = world({ noTreasury: true });
  assert('10.17 no treasury: it throws before anyone is charged', /no treasury/.test(throws(() => E.collectPropertyTax_(w.ctx.ss, w.ctx, 120)) || '') && nwOf(byPop(w, 'A1')) === 300000);
  w = world({ cfg: { propertyTaxRate: 0.02 } });
  E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.18 the rate dial moves the bill', (300000 - nwOf(byPop(w, 'A1'))) + (100000 - nwOf(byPop(w, 'A2'))) === 21120);
  w = world({ cfg: { taxThinHoodFloor: 0 } });
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.19 floor 0: the thin hood stands on its own multiplier (20,000 / 4)', res.cityTotal === 10560 * 200 + 7920 * 300 + 4752 * 5000);
  w = world({ hoodState: { Rockridge: { medianRent: 4000 }, Downtown: { medianRent: 3000 } } });
  E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.20 a hood off the map is taxed on the price the house was bought at', nwOf(byPop(w, 'B1')) === 0 && /paid \$9000/.test(lifeOf(byPop(w, 'B1'))), lifeOf(byPop(w, 'B1')));
  const BZ = [['BIZ_ID', 'Name', 'Annual_Revenue'], ['B1', 'x', 4000000], ['B2', 'y', 6000000], ['B3', 'z', '']];
  w = world({ business: BZ });
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.21 business tax at rate 0: no row', res.businessTax === 0 && treasuryRows().length === 1);
  w = world({ business: BZ, cfg: { businessTaxRate: 0.01 } });
  res = E.collectPropertyTax_(w.ctx.ss, w.ctx, 120);
  assert('10.22 with a rate, business tax is that share of ledger revenue, unscaled, in its own row', res.businessTax === 100000 && treasuryRows().length === 2 && treasuryRows()[1][3] === 'BUSINESS-TAX' && treasuryRows()[1][2] === 100000);
})();

console.log('\n11. the tax in the price of owning:');
(function () {
  assert('11.1 without a tax the carry test reads as before: mortgage x 12 against 30% of income', E.homeCarries_(2500, 100000) === true && E.homeCarries_(2501, 100000) === false);
  assert('11.2 the yearly tax is part of the carry', E.homeCarries_(2000, 100000, 6000) === true && E.homeCarries_(2000, 100000, 6001) === false);
  assert('11.3 no income carries nothing', E.homeCarries_(100, 0, 0) === false);
  assert('11.4 the tax on a house is the rate times its price', E.homeAnnualTax_({ config: CFG }, 1056000) === 10560);
  assert('11.5 no dial to read: no tax in the test, no throw', E.homeAnnualTax_({ config: {} }, 1056000) === 0 && E.homeAnnualTax_(null, 1056000) === 0);
  const src = read('../phase05-citizens/generationalWealthEngine.js');
  assert('11.6 both the purchase and the trade-up pass the tax into the carry test', (src.match(/homeAnnualTax_\(ctx, price\)\)/g) || []).length === 2);
})();

console.log('\n12. no dice:');
(function () {
  const files = ['../phase02-world-state/applyInitiativeImplementationEffects.js', '../phase05-citizens/judicialLifecycle.js'];
  const treasurySrc = read(files[0]);
  const block = treasurySrc.slice(treasurySrc.indexOf('// engine.271 — CITY REVENUE'));
  assert('12.1 the revenue helpers draw nothing', !/rng\(|Math\.random/.test(block));
  const gwe = read('../phase05-citizens/generationalWealthEngine.js');
  const tax = gwe.slice(gwe.indexOf('function collectPropertyTax_'), gwe.indexOf('function trackHomeOwnership_'));
  assert('12.2 tax day draws nothing', tax.length > 500 && !/rng\(|safeRand_|Math\.random/.test(tax));
  const jl = read(files[1]);
  const fineFn = jl.slice(jl.indexOf('function judicialSettleFine_'), jl.indexOf('function judicialSetStatus_'));
  assert('12.3 the fine and the court money draw nothing', fineFn.length > 500 && !/rng\(|judicialDraw_|Math\.random/.test(fineFn));
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
