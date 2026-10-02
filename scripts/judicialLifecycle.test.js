/**
 * judicialLifecycle.test.js — engine.254 Task 5: judicial entry and outcome decision.
 * Synthetic ledger and cases only; no sheet. Spec: docs/plans/2026-09-21-care-and-justice-system.md
 * §Task 5 cut (test list 1–17).
 *
 * Run: node scripts/judicialLifecycle.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

// --- Apps Script global surface the chaos engine calls ---
const cm = require('../utilities/citizenMemory.js');
const comp = require('../utilities/compressLifeHistory.js');
const dialMap = require('../utilities/citizenDialMap.js');
const { makeDemandFixture_ } = require('./careJusticeService.test.js');
global.careJusticeResidentIndex_ = require('../phase04-events/careJusticeService.js').careJusticeResidentIndex_;
global.Logger = { log() {} };
global.inWorldStamp_ = () => 'C100';
['deserialize_', 'serialize_', 'accrueChaos_', 'applyChaosReaction_', 'newCitizen_']
  .forEach(k => { global[k] = cm[k]; });
global.parseDialState_ = comp.parseDialState_;
global.serializeDialState_ = comp.serializeDialState_;
global.nudgesForEvent_ = dialMap.nudgesForEvent_;
global.queueAppendIntent_ = () => {};

const jl = require('../phase05-citizens/judicialLifecycle.js');
global.admitJudicialReceipt_ = jl.admitJudicialReceipt_;
const eng = require('../phase04-events/chaosCarsEngine.js');
const acct = require('../utilities/careJusticeAccounting.js');

const rngBox = {};
vm.createContext(rngBox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'utilities/cycleModes.js'), 'utf8'), rngBox, { filename: 'cycleModes.js' });
const seededRngFor_ = rngBox.seededRngFor_;

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail != null ? ': ' + detail : ''}`); failed++; }
}
function throwsNaming(fn, key) {
  try { fn(); } catch (e) { return e.message.indexOf(key) >= 0; }
  return false;
}

const RATES_CFG = {
  judicialReleasedRate: 0.40, judicialDivertedRate: 0.25, judicialHeldRate: 0.35,
  investigationArrestRate: 0.30, judicialRepeatHeldMultiplier: 1.5,
  judicialDismissAfterCycles: 3 // Task 6b: validated by the lifecycle every Cycle
};
const rates = jl.loadJudicialRates_(RATES_CFG);
const fixed = v => () => v;                      // constant draw
const seq = vals => { let i = 0; return () => vals[i++]; };

function arrestReceipt(popId, cycle, gravity) {
  return { system: 'judicial', kind: 'intake', intakeType: 'arrest', entryType: 'arrest',
    sourceSystem: 'patrol', sourceEventId: 'patrol:synth' + cycle + ':' + popId, popId,
    name: 'Synthetic Defendant', neighborhood: 'SYNTHETIC_HOOD', cycle,
    chargeCause: 'Cop car: arrested.', chargeGravity: gravity || 'serious', priorStatus: 'Active' };
}
// advance one Cycle at a time until closed or the Cycle cap
function runToClose(c, fromCycle, rngAt, prior, cap) {
  const events = [];
  for (let cy = fromCycle; cy <= (cap || fromCycle + 10); cy++) {
    const r = jl.advanceCase_(c, cy, rates, rngAt(c), prior || 0);
    c = r.case;
    if (r.event) events.push(r.event);
    if (c.ResolveCycle !== '') break;
  }
  return { c, events };
}

// ── 1. forced draws → each outcome; held closes at HeldUntilCycle, not before ──
{
  const c0 = jl.openCaseFromReceipt_(arrestReceipt('SYN-1', 100));
  assert('1 case opens pending, decision next Cycle, 21 fields',
    c0.StatusNow === 'pending' && c0.ArrestCycle === 100 && c0.DecisionCycle === 101 &&
    Object.keys(c0).length === 21 && c0.CaseId === 'J-C100-SYN-1' && c0.PriorStatus === 'Active');
  const early = jl.advanceCase_(c0, 100, rates, fixed(0.99), 0);
  assert('1 no step in the arrest Cycle (LastTransitionCycle guard)', early.event === null && early.case.StatusNow === 'pending');

  // weights order: held [0,.35) released [.35,.75) diverted [.75,1)
  const rel = jl.advanceCase_(c0, 101, rates, fixed(0.5), 0);
  assert('1 released → exit, closed', rel.case.Outcome === 'released' && rel.case.StatusNow === 'released' &&
    rel.case.ResolveCycle === 101 && rel.case.CyclesHeld === 1 && rel.event.kind === 'exit');
  const div = jl.advanceCase_(c0, 101, rates, fixed(0.9), 0);
  assert('1 diverted → exit, no bed transfer', div.case.Outcome === 'diverted' && div.case.TransferToId === '' &&
    div.event.kind === 'exit');
  const held = jl.advanceCase_(c0, 101, rates, seq([0.1, 0.99]), 0);
  assert('1 held → transition, HeldUntil = decision + 3 (serious top)', held.case.StatusNow === 'held' &&
    held.case.HeldUntilCycle === 104 && held.event.kind === 'transition' && held.case.ResolveCycle === '');
  const notYet = jl.advanceCase_(held.case, 103, rates, fixed(0), 0);
  const served = jl.advanceCase_(notYet.case, 104, rates, fixed(0), 0);
  assert('1 held-served at HeldUntilCycle, not before', notYet.event === null && served.case.Outcome === 'held-served' &&
    served.case.StatusNow === 'closed' && served.case.CyclesHeld === 4 && served.event.kind === 'exit');
  assert('1 input case never mutated', c0.StatusNow === 'pending' && c0.ResolveCycle === '');
}

// ── 2. held length inside gravity range; repeat arrest raises held share ────
{
  let inRange = true, heldPlain = 0, heldRepeat = 0;
  const lens = { minor: new Set(), serious: new Set(), grave: new Set() };
  for (let seed = 1; seed <= 1000; seed++) {
    for (const g of ['minor', 'serious', 'grave']) {
      const c = jl.openCaseFromReceipt_(arrestReceipt('SYN-2-' + seed, 100, g));
      const r = jl.advanceCase_(c, 101, { ...rates, judicialHeldRate: 1, judicialReleasedRate: 0, judicialDivertedRate: 0 },
        seededRngFor_(101, 'judicial:' + c.SourceEventId), 0);
      const len = r.case.HeldUntilCycle - 101;
      const [lo, hi] = jl.JUDICIAL_HELD_RANGE_[g];
      if (len < lo || len > hi) inRange = false;
      lens[g].add(len);
    }
    const c = jl.openCaseFromReceipt_(arrestReceipt('SYN-2r-' + seed, 100));
    const rng = () => seededRngFor_(101, 'judicial:' + c.SourceEventId);
    if (jl.advanceCase_(c, 101, rates, rng(), 0).case.StatusNow === 'held') heldPlain++;
    if (jl.advanceCase_(c, 101, rates, rng(), 1).case.StatusNow === 'held') heldRepeat++;
  }
  assert('2 held length inside gravity range, every value reached',
    inRange && lens.minor.size === 1 && lens.serious.size === 3 && lens.grave.size === 2,
    JSON.stringify({ minor: [...lens.minor], serious: [...lens.serious], grave: [...lens.grave] }));
  assert('2 repeat arrest raises held share', heldRepeat > heldPlain + 50, `${heldPlain} → ${heldRepeat}`);
  const prior = [{ CaseId: 'J-C60-SYN', POPID: 'SYN', ArrestCycle: 60 }, { CaseId: 'J-C10-SYN', POPID: 'SYN', ArrestCycle: 10 },
    { CaseId: 'J-C90-SYN', POPID: 'SYN', ArrestCycle: '' }, { CaseId: 'J-C100-SYN', POPID: 'SYN', ArrestCycle: 100 }];
  assert('2 prior arrests: inside 52 Cycles only, self and investigations excluded',
    jl.countPriorArrests_(prior, 'SYN', 100, 'J-C100-SYN') === 1);
}

// ── 3. replay: same case, same Cycle, same outcome ──────────────────────────
{
  const c = jl.openCaseFromReceipt_(arrestReceipt('SYN-3', 100));
  const a = jl.advanceCase_(c, 101, rates, seededRngFor_(101, 'judicial:' + c.SourceEventId), 0);
  const b = jl.advanceCase_(c, 101, rates, seededRngFor_(101, 'judicial:' + c.SourceEventId), 0);
  assert('3 same case same Cycle → identical outcome', JSON.stringify(a) === JSON.stringify(b));
}

// ── 4. decisions never touch ctx.rng ────────────────────────────────────────
{
  let ctxDraws = 0;
  const ctx = { rng: () => { ctxDraws++; return 0.5; } };
  const c = jl.openCaseFromReceipt_(arrestReceipt('SYN-4', 100));
  jl.advanceCase_(c, 101, rates, seededRngFor_(101, 'judicial:' + c.SourceEventId), 0);
  assert('4 ctx.rng draw count unchanged by a decision', ctxDraws === 0 && typeof ctx.rng === 'function');
  assert('4 a due decision with no rng throws', throwsNaming(() => jl.advanceCase_(c, 101, rates, undefined, 0), 'injected rng'));
}

// ── 5 + 15. rate validation ─────────────────────────────────────────────────
{
  const bad = (patch) => ({ ...RATES_CFG, ...patch });
  assert('5 missing key throws naming it', throwsNaming(() => { const x = bad({}); delete x.judicialHeldRate; jl.loadJudicialRates_(x); }, 'judicialHeldRate'));
  assert('5 NaN throws naming it', throwsNaming(() => jl.loadJudicialRates_(bad({ investigationArrestRate: 'abc' })), 'investigationArrestRate'));
  assert('5 negative throws naming it', throwsNaming(() => jl.loadJudicialRates_(bad({ judicialDivertedRate: -0.1, judicialReleasedRate: 0.75 })), 'judicialDivertedRate'));
  assert('5 split ≠ 1 throws', throwsNaming(() => jl.loadJudicialRates_(bad({ judicialHeldRate: 0.5 })), 'must be 1'));
  let edgeOk = true;
  try {
    jl.loadJudicialRates_(bad({ investigationArrestRate: 0 }));
    jl.loadJudicialRates_(bad({ investigationArrestRate: 1 }));
    jl.loadJudicialRates_(bad({ judicialReleasedRate: 1, judicialDivertedRate: 0, judicialHeldRate: 0, judicialRepeatHeldMultiplier: 1 }));
  } catch (e) { edgeOk = false; }
  assert('15 rates at 0 and 1, multiplier 1 pass', edgeOk);
  assert('15 rate 1.01 throws', throwsNaming(() => jl.loadJudicialRates_(bad({ investigationArrestRate: 1.01 })), 'investigationArrestRate'));
  assert('15 Infinity throws', throwsNaming(() => jl.loadJudicialRates_(bad({ judicialRepeatHeldMultiplier: Infinity })), 'judicialRepeatHeldMultiplier'));
  assert('15 multiplier 0.9 throws', throwsNaming(() => jl.loadJudicialRates_(bad({ judicialRepeatHeldMultiplier: 0.9 })), 'judicialRepeatHeldMultiplier'));
}

// ── 6. investigation → arrest at the rate, else no-arrest ───────────────────
{
  const inv = jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-6', 100, 'grave'), entryType: 'investigation',
    sourceSystem: 'conduct', sourceEventId: 'conduct:C100:grave:SYN-6', kind: 'transition' });
  assert('6 investigation opens investigating, no ArrestCycle', inv.StatusNow === 'investigating' && inv.ArrestCycle === '');
  const conv = jl.advanceCase_(inv, 101, rates, fixed(0.1), 0);
  assert('6 converts → pending, intake on the same SourceEventId', conv.case.StatusNow === 'pending' &&
    conv.case.ArrestCycle === 101 && conv.case.DecisionCycle === 102 && conv.event.kind === 'intake' &&
    conv.event.intakeType === 'arrest' && conv.event.sourceEventId === 'conduct:C100:grave:SYN-6');
  const dec = jl.advanceCase_(conv.case, 102, rates, seq([0.1, 0]), 0);
  assert('6 converted case decides next Cycle; grave held 3–4', dec.case.StatusNow === 'held' && dec.case.HeldUntilCycle === 105);
  const none = jl.advanceCase_(inv, 101, rates, fixed(0.5), 0);
  assert('6 else closes no-arrest, no census event', none.case.Outcome === 'no-arrest' && none.case.StatusNow === 'closed' &&
    none.event === null && none.case.CyclesHeld === 0);
}

// ── chaos engine harness (single-row ledger: every event hits the same citizen) ──
function judicialCtx(status, extraHeaders) {
  const headers = ['POPID', 'First', 'Last', 'Neighborhood', 'LifeHistory', 'DialState', 'LastUpdated', 'Status', 'StatusStartCycle', 'HealthCause', 'ClockMode'];
  const row = ['SYNTHETIC-JUDICIAL', 'Synthetic', 'Defendant', 'Fruitvale', '', '', '', status, '', '', 'ENGINE'];
  const ledger = { headers: headers.concat(extraHeaders || []), rows: [row], dirty: false };
  return { summary: { cycleRef: 'C100', careJusticeDemand: makeDemandFixture_('Fruitvale', ledger) }, ledger };
}
const jTarget = { rowIndex: 0, popId: 'SYNTHETIC-JUDICIAL', neighborhood: 'Fruitvale', tier: 4 };
const copCar = { name: 'cop_car', displayName: 'Synthetic cop car' };
const arrested = { outcome: 'arrested', severity: 'high', lifeHistoryTag: 'Transgression-Serious', weight: 1 };

// ── 7. eligibility and receipt shape ────────────────────────────────────────
{
  const ctx = judicialCtx('Retired');
  const r = eng.writeCitizenEvent_(ctx, jTarget, copCar, arrested, 100, 'Cop car: arrested.');
  assert('7 retired adult → one unpushed arrest receipt, PriorStatus casing kept',
    r && r.system === 'judicial' && r.kind === 'intake' && r.entryType === 'arrest' && r.intakeType === 'arrest' &&
    r.sourceSystem === 'patrol' && r.sourceEventId === '' && r.chargeGravity === 'serious' &&
    r.priorStatus === 'Retired' && r.chargeCause === 'Cop car: arrested.' && !ctx.summary.judicialEvents);
  const act = eng.writeCitizenEvent_(judicialCtx('Active'), jTarget, copCar, arrested, 100, 'Cop car: arrested.');
  assert('7 active adult → receipt, Status untouched (Task 6 flips)', act && act.priorStatus === 'Active');
  const hctx = judicialCtx('hospitalized');
  const h = eng.writeCitizenEvent_(hctx, jTarget, copCar, arrested, 100, 'Cop car: arrested.');
  assert('7 hospitalized → no receipt, hook still written', h === null &&
    hctx.summary.storyHooks.some(k => k.hookType === 'CITIZEN_ARRESTED'));
  const t = eng.writeCitizenEvent_(judicialCtx('Active'), jTarget, copCar,
    { outcome: 'ticket', severity: 'low', lifeHistoryTag: 'Setback' }, 100, 'ticket');
  assert('7 a ticket opens nothing', t === null);
  assert('7 arrest with an unmapped tag throws, never defaults', throwsNaming(() =>
    eng.writeCitizenEvent_(judicialCtx('Active'), jTarget, copCar, { ...arrested, lifeHistoryTag: 'Setback' }, 100, 'x'), 'charge gravity'));
}

// ── 14. adult gate: known minor never draws arrest; unknown age = adult ─────
{
  global.chaosOutcomePool_ = v => v.textureOutcomes;
  global.validateOutcome = () => {};
  const car = { ...copCar, textureOutcomes: [arrested] };
  const minor = eng.rollOutcome_(() => 0, car, 'citizen', { lifeState: { isMinor: true, age: 15 } });
  const unknown = eng.rollOutcome_(() => 0, car, 'citizen', { lifeState: { isMinor: false, age: null } });
  assert('14 known minor → no arrest drawn', minor === null);
  assert('14 unknown age → adult default, arrest drawn', unknown && unknown.outcome === 'arrested');
  const r = eng.writeCitizenEvent_(judicialCtx('Active'), jTarget, copCar, arrested, 100, 'Cop car: arrested.');
  assert('14 unknown-age arrest writes its receipt', r && r.kind === 'intake');
}

// ── caller loop: cop car leaves the loop; its one named call arrests ─────────
global.validateAllChaosConfigs_ = () => {};
global.loadChaosCarsConfig_ = () => [
  { ...copCar, namedCallsField: 'charges', episodic: false, baseFrequencyWeight: 1,
    scopes: ['citizen'], textureOutcomes: [arrested], metricImpacts: [] },
  { name: 'synthetic_unmapped', displayName: 'Synthetic unmapped', episodic: false,
    baseFrequencyWeight: 1, scopes: ['citizen'], textureOutcomes: [
      { outcome: 'ticket', severity: 'low', lifeHistoryTag: 'Setback', weight: 1 }
    ], metricImpacts: [] }
];
function fixedCopRun(failPayload, status, clockMode) {
  const ctx = judicialCtx(status || 'Active');
  if (clockMode) ctx.ledger.rows[0][ctx.ledger.headers.indexOf('ClockMode')] = clockMode;
  ctx.summary.cycleId = 100;
  ctx.summary.careJusticeDemand.hoods.Fruitvale.charges = 1;
  ctx.summary.careJusticeDemand.exposureDial = 1000;
  let draws = 0;
  ctx.rng = () => { draws++; return draws === 1 ? 0 : ((draws * 17) % 97) / 97; };
  const recorded = [];
  global.writeChaosCarsRow_ = (_ctx, payload) => {
    if (failPayload) throw new Error('synthetic payload failure');
    recorded.push(payload.eventId);
  };
  let error = null;
  try { eng.runChaosCarsEngine_(ctx); } catch (e) { error = e; }
  return { ctx, draws, recorded, error };
}

// ── 10 + 11. rng sequence unchanged; one open case per POPID ────────────────
{
  const run = fixedCopRun(false);
  const ev = run.ctx.summary.judicialEvents || [];
  assert('10 mapped citizen-only cop has loop weight zero; 3 loop + 1 pass rows',
    eng.chaosLoopWeight_(global.loadChaosCarsConfig_()[0]) === 0 &&
    !run.error && run.recorded.length === 4, run.error ? run.error.message : run.draws);
  const first = 'patrol:' + run.recorded[3] + ':SYNTHETIC-JUDICIAL';
  assert('11 pass arrest creates one intake on its source row',
    ev.length === 1 && ev[0].kind === 'intake' && ev[0].sourceEventId === first,
    JSON.stringify(ev.map(e => [e.kind, e.sourceEventId])));
  assert('11 pass arrest keeps its hook', run.ctx.summary.storyHooks.filter(k => k.hookType === 'CITIZEN_ARRESTED').length === 1);
  assert('11 no hospital receipt from a cop car', !run.ctx.summary.hospitalEvents);
  assert('T6 arrest flips Status after source row and receipt, stamps Cycle',
    run.ctx.ledger.rows[0][run.ctx.ledger.headers.indexOf('Status')] === 'detained' &&
    run.ctx.ledger.rows[0][run.ctx.ledger.headers.indexOf('StatusStartCycle')] === 100);

  // ── 8. every receipt and lifecycle event folds through the accounting ──
  const c = jl.openCaseFromReceipt_(ev[0]);
  const life = runToClose(c, 101, cs => seededRngFor_(Number(cs.DecisionCycle), 'judicial:' + cs.SourceEventId));
  let foldOk = true, folded;
  try { folded = acct.foldCareJusticeReceipts_(ev.concat(life.events), {}); } catch (e) { foldOk = false; }
  assert('8 receipts + lifecycle events fold with no throw; one intake counted',
    foldOk && folded.receipts.filter(r => r.kind === 'intake').length === 1 && folded.transitions === life.events.filter(e => e.kind === 'transition').length,
    foldOk ? JSON.stringify(folded.receipts.map(r => r.kind)) : 'threw');
}

// ── 16. payload write throws → no receipt, error propagates ─────────────────
{
  const run = fixedCopRun(true);
  assert('16 payload failure → error surfaces, no judicial receipt',
    !!run.error && !run.ctx.summary.judicialEvents, run.error && run.error.message);
  assert('T6 source row failure leaves citizen Status unchanged',
    run.ctx.ledger.rows[0][run.ctx.ledger.headers.indexOf('Status')] === 'Active');
  const game = fixedCopRun(false, 'Active', 'GAME');
  assert('T6 GAME arrest opens case but leaves Status unchanged',
    !game.error && game.ctx.summary.judicialEvents.length === 1 &&
    game.ctx.ledger.rows[0][game.ctx.ledger.headers.indexOf('Status')] === 'Active');
}

// ── 12. overdue decision decides once, same as on time; second call is a no-op ──
{
  const c = jl.openCaseFromReceipt_(arrestReceipt('SYN-12', 100));
  const rng = () => seededRngFor_(Number(c.DecisionCycle), 'judicial:' + c.SourceEventId);
  const onTime = jl.advanceCase_(c, 101, rates, rng(), 0);
  const late = jl.advanceCase_(c, 103, rates, rng(), 0);
  assert('12 decision two Cycles late = same outcome', onTime.case.StatusNow === late.case.StatusNow &&
    onTime.case.HeldUntilCycle === late.case.HeldUntilCycle);
  const again = jl.advanceCase_(late.case, 103, rates, rng(), 0);
  assert('12 second call same Cycle → unchanged, no event', again.event === null &&
    JSON.stringify(again.case) === JSON.stringify(late.case));
  const closed = jl.advanceCase_({ ...late.case, ResolveCycle: 103, LastTransitionCycle: 103 }, 110, rates, rng(), 0);
  assert('12 a closed case never moves', closed.event === null);
  const heldCase = { ...jl.openCaseFromReceipt_(arrestReceipt('SYN-12h', 100)), StatusNow: 'held', DecisionCycle: 101, HeldUntilCycle: 102, LastTransitionCycle: 101 };
  const lateServe = jl.advanceCase_(heldCase, 106, rates, undefined, 0);
  assert('12 overdue held-served catches up with no rng', lateServe.case.Outcome === 'held-served' && lateServe.case.ResolveCycle === 106);
}

// ── 13. a civil row: open, advance, close — never custody, never census ─────
{
  jl.JUDICIAL_ENTRY_TYPES_.synthetic_civil = {
    custodial: false, openState: 'filed', decisionOffset: 2, census: 'none', arrestOnOpen: false,
    steps: { filed: (c, cycle) => {
      if (cycle < c.DecisionCycle) return null;
      c.Outcome = 'settled'; c.ResolveCycle = cycle; c.CyclesHeld = 0; c.StatusNow = 'closed'; return 'exit';
    } }
  };
  const civ = jl.openCaseFromReceipt_({ popId: 'SYN-13', cycle: 100, entryType: 'synthetic_civil',
    sourceSystem: 'synthetic', sourceEventId: 'synthetic:C100:SYN-13', counterparty: 'POP-SYN-OTHER' });
  const life = runToClose(civ, 100, () => fixed(0), 0, 110);
  assert('13 civil case opens filed, carries Counterparty, closes at +2',
    civ.StatusNow === 'filed' && civ.Counterparty === 'POP-SYN-OTHER' && civ.ArrestCycle === '' &&
    life.c.Outcome === 'settled' && life.c.ResolveCycle === 102);
  assert('13 civil case emits no census event', life.events.length === 0);
  jl.JUDICIAL_ENTRY_TYPES_.synthetic_civil.steps.filed = (c) => { c.StatusNow = 'held'; return 'transition'; };
  assert('13 a non-custodial type reaching custody throws', throwsNaming(() =>
    jl.advanceCase_(civ, 102, rates, fixed(0), 0), 'non-custodial'));
  delete jl.JUDICIAL_ENTRY_TYPES_.synthetic_civil;
}

// ── kimi Task 5 review: blank clocks fail loud; a re-arrest never opens a case ──
{
  const base = jl.openCaseFromReceipt_(arrestReceipt('SYN-K', 100));
  assert('K blank HeldUntilCycle on a held case throws', throwsNaming(() =>
    jl.advanceCase_({ ...base, StatusNow: 'held', HeldUntilCycle: '', LastTransitionCycle: 101 }, 105, rates, fixed(0), 0), 'HeldUntilCycle'));
  assert('K blank DecisionCycle on a pending case throws', throwsNaming(() =>
    jl.advanceCase_({ ...base, DecisionCycle: '' }, 105, rates, fixed(0), 0), 'DecisionCycle'));
  assert('K re-arrest transition receipt cannot open a case', throwsNaming(() =>
    jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-K', 100), kind: 'transition', reArrestEventId: 'patrol:x:SYN-K' }), 'intake receipt'));
  const inv = jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-K2', 100, 'grave'), entryType: 'investigation',
    sourceSystem: 'conduct', sourceEventId: 'conduct:C100:grave:SYN-K2', kind: 'transition' });
  assert('K investigation still opens from its transition receipt', inv.StatusNow === 'investigating');
}

// ── 9. unknown entry type / missing key throw ───────────────────────────────
{
  assert('9 unknown EntryType throws', throwsNaming(() =>
    jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-9', 100), entryType: 'duel' }), 'unknown EntryType'));
  assert('9 receipt without SourceEventId throws', throwsNaming(() =>
    jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-9', 100), sourceEventId: '' }), 'SourceEventId'));
  assert('9 admit without SourceEventId throws', throwsNaming(() =>
    jl.admitJudicialReceipt_([], { popId: 'SYN-9', sourceEventId: '' }), 'SourceEventId'));
}

// ── 17. kind-aware seen set (spec for the Task 8 fold) ──────────────────────
// Seen keys per §Task 8 requirements: ArrestCycle set → intake; exit outcome → exit;
// an investigating row seeds nothing.
function seenFrom(cases) {
  const seen = {};
  for (const c of cases) {
    if (c.ArrestCycle !== '') seen['judicial|intake|' + c.SourceEventId] = true;
    if (['released', 'diverted', 'held-served'].indexOf(c.Outcome) >= 0) seen['judicial|exit|' + c.SourceEventId] = true;
  }
  return seen;
}
{
  const inv = jl.openCaseFromReceipt_({ ...arrestReceipt('SYN-17', 100, 'grave'), entryType: 'investigation',
    sourceSystem: 'conduct', sourceEventId: 'conduct:C100:grave:SYN-17' });
  const conv = jl.advanceCase_(inv, 101, rates, fixed(0.1), 0);
  const replayConv = acct.foldCareJusticeReceipts_([conv.event], seenFrom([inv]));
  assert('17 investigation row persisted → its conversion still books one intake', replayConv.receipts.length === 1);
  const rerun = acct.foldCareJusticeReceipts_([conv.event], seenFrom([conv.case]));
  assert('17 converted row persisted → replayed conversion books none', rerun.receipts.length === 0 && rerun.duplicates === 1);
  const a = jl.openCaseFromReceipt_(arrestReceipt('SYN-17a', 100));
  const ex = jl.advanceCase_(a, 101, rates, fixed(0.5), 0);
  const replayExit = acct.foldCareJusticeReceipts_([arrestReceipt('SYN-17a', 100), ex.event], seenFrom([ex.case]));
  assert('17 arrest → exit persisted → replay books none', replayExit.receipts.length === 0 && replayExit.duplicates === 2);
}

// Task 6: exercise the scheduled phase and Phase-10 writer against an isolated,
// deliberately reordered 21-column tab. All IDs and rows are synthetic.
const phaseBox = { Logger: { log() {} }, seededRngFor_,
  requireTab_: (ss, name) => {
    const tab = ss.getSheetByName(name);
    if (!tab) throw new Error(name + ' tab missing');
    return tab;
  },
  persistWithRetry_: fn => fn(), appendRowWithRetry_: (tab, row) => tab.appendRow(row) };
vm.createContext(phaseBox);
for (const file of ['phase05-citizens/judicialLifecycle.js', 'phase10-persistence/buildCyclePacket.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), phaseBox, { filename: file });
}
const modeBox = { Logger: { log() {} }, queueBatchAppendIntent_: () => {
  throw new Error('detained mode citizen queued a sheet intent');
} };
vm.createContext(modeBox);
for (const file of ['phase05-citizens/generateCivicModeEvents.js',
  'phase05-citizens/generateMediaModeEvents.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), modeBox, { filename: file });
}
for (const mode of ['CIVIC', 'MEDIA']) {
  const headers = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'Status',
    'LifeHistory', 'LastUpdated', 'Neighborhood', 'RoleType'];
  const row = ['SYN-T6-MODE', 'Synthetic', 'Person', 4, mode, 'detained', '', '',
    'SYNTHETIC_HOOD', mode === 'CIVIC' ? 'Council Member' : 'Reporter'];
  let draws = 0;
  const ctx = { ledger: { headers, rows: [row], dirty: false },
    summary: { cycleId: 101 }, config: { cycleCount: 101 },
    rng: () => { draws++; return 0; }, ss: { getSheetByName: () => null } };
  modeBox[mode === 'CIVIC' ? 'generateCivicModeEvents_' : 'generateMediaModeEvents_'](ctx);
  assert('T6 detained ' + mode + ' citizen emits no mode event or intent',
    draws === 0 && !ctx.ledger.dirty &&
    ctx.summary[mode === 'CIVIC' ? 'civicModeEvents' : 'mediaModeEvents'] === 0);
}
function phaseFixture(status, cycle, event, cfg) {
  const fields = jl.JUDICIAL_CASE_FIELDS_.slice().reverse(); // prove header-name mapping
  const rows = [fields];
  const tab = {
    getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }),
    appendRow: row => rows.push(row.slice()),
    getRange: (r, c) => ({ setValues: values => values[0].forEach((value, offset) => {
      rows[r - 1][c - 1 + offset] = value;
    }) })
  };
  const headers = ['POPID', 'Status', 'StatusStartCycle', 'ClockMode',
    'Tier', 'BirthYear', 'Income', 'NetWorth', 'DebtLevel', 'LifeHistory']; // Task 6b: settlement columns
  const person = ['SYN-T6', status, '', 'ENGINE', 4, '', 52000, 10000, 0, ''];
  const ctx = {
    config: { ...RATES_CFG, ...cfg, cycleCount: cycle },
    summary: { cycleId: cycle, ...(event ? { judicialEvents: [event] } : {}) },
    ledger: { headers, rows: [person], dirty: false },
    cache: { getData: name => name === 'Judicial_Ledger' ?
      { exists: true, values: rows.map(row => row.slice()) } : { exists: false, values: [] } },
    ss: { getSheetByName: name => name === 'Judicial_Ledger' ? tab : null }
  };
  return { ctx, rows, fields, person };
}
function caseFromFixture(fx, r) {
  const result = {};
  fx.fields.forEach((field, i) => { result[field] = fx.rows[r || 1][i]; });
  return result;
}
{
  const ev = arrestReceipt('SYN-T6', 100, 'minor');
  const fx = phaseFixture('detained', 100, ev, {
    judicialReleasedRate: 0, judicialDivertedRate: 0, judicialHeldRate: 1
  });
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 intake writes 21 header-mapped cells with pending and PriorStatus',
    fx.rows.length === 2 && fx.rows[1].length === 21 &&
    caseFromFixture(fx).StatusNow === 'pending' && caseFromFixture(fx).PriorStatus === 'Active');
  fx.ctx.summary = { cycleId: 101 };
  fx.ctx.config.cycleCount = 101;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  const once = fx.ctx.summary.judicialEvents.length;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 second Phase-5 call emits no duplicate decision', fx.ctx.summary.judicialEvents.length === once);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 seeded decision enters held at +1 and leaves citizen detained',
    caseFromFixture(fx).StatusNow === 'held' && caseFromFixture(fx).HeldUntilCycle === 102 &&
    fx.person[1] === 'detained');
  fx.ctx.summary = { cycleId: 102 };
  fx.ctx.config.cycleCount = 102;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 held-served closes at HeldUntilCycle and restores casing',
    caseFromFixture(fx).Outcome === 'held-served' && caseFromFixture(fx).ResolveCycle === 102 &&
    fx.person[1] === 'Active');
  assert('T6 Phase-5 queues no sheet intent', !fx.ctx.intents && fx.ctx.ledger.dirty);
}
{
  const open = jl.openCaseFromReceipt_(arrestReceipt('SYN-T6', 100));
  const fx = phaseFixture('active', 101, null);
  fx.rows.push(fx.fields.map(field => open[field]));
  fx.ctx.config.judicialReleasedRate = 1;
  fx.ctx.config.judicialDivertedRate = 0;
  fx.ctx.config.judicialHeldRate = 0;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 release restores the case PriorStatus casing', fx.person[1] === 'Active');
  // The due release above restores Active. Test re-assert before the due Cycle.
  fx.rows[1][fx.fields.indexOf('DecisionCycle')] = 103;
  fx.rows[1][fx.fields.indexOf('LastTransitionCycle')] = 100;
  fx.ctx.summary = { cycleId: 102 };
  fx.ctx.config.cycleCount = 102;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 pre-decision open case re-asserts custody', fx.person[1] === 'detained');
  fx.person[1] = 'recovering';
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 care state wins custody re-assert', fx.person[1] === 'recovering');
  fx.person[1] = 'active'; fx.person[3] = 'GAME';
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 GAME clock keeps status during open custody', fx.person[1] === 'active');
}
{
  const open = jl.openCaseFromReceipt_(arrestReceipt('SYN-T6', 100));
  const fx = phaseFixture('deceased', 101);
  fx.rows.push(fx.fields.map(field => open[field]));
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 death precedes due decision and closes deceased',
    caseFromFixture(fx).Outcome === 'deceased' && fx.person[1] === 'deceased');
}
{
  const open = jl.openCaseFromReceipt_(arrestReceipt('SYN-T6', 100));
  const fx = phaseFixture('hospitalized', 101);
  fx.rows.push(fx.fields.map(field => open[field]));
  fx.ctx.config.judicialReleasedRate = 1;
  fx.ctx.config.judicialDivertedRate = 0;
  fx.ctx.config.judicialHeldRate = 0;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 case exits during care without overwriting health Status',
    caseFromFixture(fx).Outcome === 'released' && fx.person[1] === 'hospitalized');
}
for (const left of ['traded', 'inactive']) {
  const open = jl.openCaseFromReceipt_(arrestReceipt('SYN-T6', 100));
  const fx = phaseFixture(left, 101);
  fx.rows.push(fx.fields.map(field => open[field]));
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 ' + left + ' closes case with reconciliation and keeps Status',
    caseFromFixture(fx).Outcome === left + '-reconciled' && fx.person[1] === left);
}
{
  const investigate = { ...arrestReceipt('SYN-T6', 100, 'grave'), entryType: 'investigation',
    kind: 'transition', sourceSystem: 'conduct', sourceEventId: 'conduct:synthetic:SYN-T6' };
  const open = jl.openCaseFromReceipt_(investigate);
  const fx = phaseFixture('active', 101, null, { investigationArrestRate: 0 });
  fx.rows.push(fx.fields.map(field => open[field]));
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 no-arrest investigation closes row without an intake or exit receipt',
    caseFromFixture(fx).Outcome === 'no-arrest' && caseFromFixture(fx).ResolveCycle === 101 &&
    fx.ctx.summary.judicialEvents.length === 1 && fx.ctx.summary.judicialEvents[0].kind === 'transition');
}
{
  const fx = phaseFixture('detained', 100);
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 stranded detention opens visible reconcile case',
    caseFromFixture(fx).SourceSystem === 'reconcile' && caseFromFixture(fx).PriorStatus === '');
  fx.ctx.summary = { cycleId: 101 };
  fx.ctx.config.cycleCount = 101;
  fx.ctx.config.judicialReleasedRate = 1;
  fx.ctx.config.judicialDivertedRate = 0;
  fx.ctx.config.judicialHeldRate = 0;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('T6 reconcile exit restores known blank to active', fx.person[1] === 'active');
}
{
  const fx = phaseFixture('active', 101);
  assert('T6 no judicialEvents array is a valid empty Cycle', !throwsNaming(() =>
    phaseBox.runJudicialLifecycle_(fx.ctx), 'judicialEvents'));
  fx.ctx.cache.getData = () => ({ exists: false, values: [] });
  assert('T6 missing Judicial_Ledger tab throws', throwsNaming(() =>
    phaseBox.runJudicialLifecycle_(fx.ctx), 'Judicial_Ledger'));
  fx.ctx.cache.getData = () => ({ exists: true, values: [['CaseId']] });
  assert('T6 missing Judicial_Ledger header throws by name', throwsNaming(() =>
    phaseBox.runJudicialLifecycle_(fx.ctx), 'POPID'));
  fx.ctx.config.judicialHeldRate = undefined;
  assert('T6 missing judicial rate throws by key', throwsNaming(() =>
    phaseBox.runJudicialLifecycle_(fx.ctx), 'judicialHeldRate'));
}
{
  const open = jl.openCaseFromReceipt_(arrestReceipt('SYN-T6', 100));
  const fx = phaseFixture('detained', 101, null);
  fx.rows.push(fx.fields.map(field => open[field]));
  fx.rows.push(fx.fields.map(field => ({ ...open, CaseId: 'J-duplicate' })[field]));
  assert('T6 duplicate open POPID throws in Phase 5', throwsNaming(() =>
    phaseBox.runJudicialLifecycle_(fx.ctx), 'SYN-T6'));
  assert('T6 duplicate open POPID throws in writer', throwsNaming(() =>
    phaseBox.persistJudicialLedger_(fx.ctx), 'SYN-T6'));
  fx.rows.pop();
  fx.ctx.summary.judicialEvents = [{ ...arrestReceipt('SYN-T6', 101), kind: 'transition',
    sourceEventId: open.SourceEventId, reArrestEventId: 'patrol:second:SYN-T6' }];
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T6 re-arrest transition stamps Cycle without blanking StatusNow',
    caseFromFixture(fx).StatusNow === 'pending' && caseFromFixture(fx).LastTransitionCycle === 101);
}

// ── Task 6b: custody costs a livelihood — settlement, clock, dial (build spec B1, B3, B5) ──
{
  const H6 = ['POPID', 'Status', 'StatusStartCycle', 'ClockMode', 'Tier', 'BirthYear', 'Income', 'NetWorth', 'DebtLevel', 'LifeHistory'];
  const cols = { iClock: 3, iBirth: 5, iIncome: 6, iNW: 7, iDebt: 8, iLife: 9 };
  const logged = [], engineErrors = [];
  const savedQueue = global.queueAppendIntent_;
  global.queueAppendIntent_ = (ctx, tab, row) => logged.push({ tab, row });
  global.logEngineError_ = (ctx, phase, err) => engineErrors.push({ phase, message: err.message });
  function settle(rowOver, caseOver, statusBefore) {
    logged.length = 0; engineErrors.length = 0;
    const row = ['SYN-6B', 'detained', 100, 'ENGINE', 4, '', 52000, 10000, 0, ''];
    Object.keys(rowOver || {}).forEach(k => { row[H6.indexOf(k)] = rowOver[k]; });
    const c = Object.assign({ CaseId: 'J-C100-SYN-6B', POPID: 'SYN-6B', Outcome: 'released', SourceSystem: 'patrol',
      PriorStatus: 'Active', CyclesHeld: 1, ArrestCycle: 100 }, caseOver || {});
    const ctx = { ledger: { dirty: false }, now: 'synthetic' };
    const before = row.slice();
    const res = jl.judicialSettleLostPay_(ctx, row, c, 101, cols, statusBefore === undefined ? 'detained' : statusBefore);
    return { row, before, res, ctx };
  }
  const nw = r => r.row[cols.iNW];
  const untouched = r => r.res === null && JSON.stringify(r.row) === JSON.stringify(r.before) && logged.length === 0;

  let r = settle();
  assert('6b released after 1 Cycle → one week of pay off savings', nw(r) === 9000 && r.res.charge === 1000 && r.res.weeks === 1);
  assert('6b Income and every other column untouched', r.row[cols.iIncome] === 52000 && r.row[cols.iDebt] === 0 && r.row[1] === 'detained');
  assert('6b one stamped [Money] line with the case marker',
    r.row[cols.iLife] === 'Y2C49 — [Money] 1 week held with no pay — savings covered it [IncomeHit J100]');
  assert('6b one LifeHistory_Log row, ledger marked dirty',
    logged.length === 1 && logged[0].tab === 'LifeHistory_Log' && logged[0].row[3] === 'Money' && r.ctx.ledger.dirty === true);
  r = settle({}, { Outcome: 'held-served', CyclesHeld: 4 });
  assert('6b held-served after 4 Cycles → four weeks', nw(r) === 6000 && /4 weeks held/.test(r.row[cols.iLife]));
  r = settle({}, { Outcome: 'diverted', CyclesHeld: 1 });
  assert('6b diverted is charged', nw(r) === 9000);

  r = settle({ NetWorth: 400, DebtLevel: 2 });
  assert('6b savings short → NetWorth 0, DebtLevel +1, borrowed line',
    nw(r) === 0 && r.row[cols.iDebt] === 3 && r.res.borrowed === true && /borrowed to cover it \[IncomeHit J100\]$/.test(r.row[cols.iLife]));
  r = settle({ NetWorth: 400, DebtLevel: 6 });
  assert('6b DebtLevel capped at 6', nw(r) === 0 && r.row[cols.iDebt] === 6);

  for (const outcome of ['deceased', 'traded-reconciled', 'inactive-reconciled', 'no-arrest']) {
    assert('6b ' + outcome + ' close is not charged', untouched(settle({}, { Outcome: outcome })));
  }
  assert('6b GAME clock not charged', untouched(settle({ ClockMode: 'GAME' })));
  assert('6b Income 0 not charged', untouched(settle({ Income: 0 })));
  for (const tier of [1, 2, 3, 4, '']) { // builder 2026-09-30: no tier is gated from the savings charge
    assert('6b Tier ' + JSON.stringify(tier) + ' charged', nw(settle({ Tier: tier })) === 9000);
  }
  global.simYearOf_ = () => 2042;
  assert('6b a minor is not charged', untouched(settle({ BirthYear: 2026 })));
  assert('6b an adult with a BirthYear is charged', nw(settle({ BirthYear: 2000 })) === 9000);
  delete global.simYearOf_;
  assert('6b CIVIC-clock Tier 3 charged', nw(settle({ ClockMode: 'CIVIC', Tier: 3 })) === 9000);
  assert('6b PriorStatus Retired not charged (the money loop never paid them)', untouched(settle({}, { PriorStatus: 'Retired' })));
  assert('6b PriorStatus recovering not charged', untouched(settle({}, { PriorStatus: 'recovering' })));
  assert('6b blank PriorStatus on a real case counts as active', nw(settle({}, { PriorStatus: '' })) === 9000);
  assert('6b reconcile case never settled', untouched(settle({}, { SourceSystem: 'reconcile', PriorStatus: '' })));
  assert('6b closed while hospitalized → charged', nw(settle({ Status: 'hospitalized' }, {}, 'hospitalized')) === 9000);
  assert('6b second close with the life-state already restored → no charge', untouched(settle({ Status: 'Active' }, {}, 'active')));
  assert('6b marker already on the row → no second charge',
    untouched(settle({ LifeHistory: 'Y2C49 — [Money] 1 week held with no pay — savings covered it [IncomeHit J100]' })));
  assert('6b a different case\'s marker does not block this one',
    nw(settle({ LifeHistory: 'Y2C10 — [Money] 2 weeks held with no pay — savings covered it [IncomeHit J61]' })) === 9000);

  r = settle({ NetWorth: '$12,400' });
  assert('6b formatted NetWorth parsed', nw(r) === 11400);
  r = settle({ NetWorth: 'n/a' });
  assert('6b unreadable NetWorth: cell untouched, error row, no charge',
    r.res === null && nw(r) === 'n/a' && engineErrors.length === 1 && engineErrors[0].phase === 'Phase5-CustodySettlement' && logged.length === 0);
  r = settle({ NetWorth: '', DebtLevel: 4 });
  assert('6b blank NetWorth is nothing saved (the money loop\'s reading): borrowed, DebtLevel +1, the cell stays blank, no error row',
    r.res && r.res.borrowed === true && nw(r) === '' && r.row[cols.iDebt] === 5 && engineErrors.length === 0 &&
    /borrowed to cover it \[IncomeHit J100\]$/.test(r.row[cols.iLife]));
  r = settle({ NetWorth: 0, DebtLevel: 6 });
  assert('6b NetWorth 0 at the debt cap: line written, nothing else moves', r.res.borrowed === true && nw(r) === 0 && r.row[cols.iDebt] === 6);

  r = settle();
  const lineText = r.row[cols.iLife].split(' — ').slice(1).join(' — ').replace('[Money] ', '');
  const short = settle({ NetWorth: 1 });
  const shortText = short.row[cols.iLife].split(' — ').slice(1).join(' — ').replace('[Money] ', '');
  assert('6b both settlement texts fold to zero dial nudges',
    Object.keys(dialMap.nudgesForEvent_('Money', 1, lineText)).length === 0 &&
    Object.keys(dialMap.nudgesForEvent_('Money', 1, shortText)).length === 0);
  const parsed = comp.parseLifeHistoryEntries_ ? comp.parseLifeHistoryEntries_(r.row[cols.iLife]).entries : null;
  assert('6b the line parses as a stamped Money entry (not legacy)',
    parsed === null || (parsed.length === 1 && parsed[0].tag === 'Money' && parsed[0].cycle === 101));

  global.queueAppendIntent_ = savedQueue;
  delete global.logEngineError_;

  // dial (B5)
  for (const bad of [undefined, '', 0, 2.5, Infinity, 'three', -1]) {
    assert('6b dial ' + JSON.stringify(bad) + ' throws naming the key',
      throwsNaming(() => jl.loadJudicialDismissAfter_({ judicialDismissAfterCycles: bad }), 'judicialDismissAfterCycles'));
  }
  assert('6b dial 3 and "3" accepted', jl.loadJudicialDismissAfter_({ judicialDismissAfterCycles: 3 }) === 3 &&
    jl.loadJudicialDismissAfter_({ judicialDismissAfterCycles: '3' }) === 3);

  // clock (B3)
  const F = jl.JUDICIAL_CASE_FIELDS_;
  const caseRow = o => F.map(f => o[f] === undefined ? '' : o[f]);
  const clockCtx = (rows, events, cyc) => ({ summary: { judicialEvents: events || [] },
    cache: { getData: () => ({ exists: true, values: [F.slice()].concat(rows) }) } });
  const open = (pop, status, arrest) => caseRow({ CaseId: 'J-C' + arrest + '-' + pop, POPID: pop, EntryType: 'arrest',
    StatusNow: status, ArrestCycle: arrest, OpenCycle: 100, DecisionCycle: 101, SourceEventId: 'e:' + pop });
  const clock = jl.judicialCustodyClock_(clockCtx([
    open('P-PEND', 'pending', 100), open('P-HELD', 'held', 98),
    caseRow({ CaseId: 'J-inv', POPID: 'P-INV', EntryType: 'investigation', StatusNow: 'investigating', OpenCycle: 100, DecisionCycle: 101 }),
    caseRow({ CaseId: 'J-closed', POPID: 'P-DONE', EntryType: 'arrest', StatusNow: 'closed', ArrestCycle: 90, ResolveCycle: 92, Outcome: 'held-served' })
  ], [arrestReceipt('P-NEW', 101), { ...arrestReceipt('P-OLD', 100) }]), 101);
  assert('6b clock: pending and held rows carry their ArrestCycle',
    clock['P-PEND'].arrestCycle === 100 && clock['P-HELD'].arrestCycle === 98 && clock['P-HELD'].caseId === 'J-C98-P-HELD');
  assert('6b clock: this-Cycle arrest intake is elapsed 0', clock['P-NEW'].arrestCycle === 101 && clock['P-NEW'].caseId === 'J-C101-P-NEW');
  assert('6b clock: investigating, closed and stale-receipt entries absent', !clock['P-INV'] && !clock['P-DONE'] && !clock['P-OLD']);
  for (const badArrest of ['', 0, 100.5, 102, 'soon']) {
    assert('6b clock: ArrestCycle ' + JSON.stringify(badArrest) + ' throws naming the case',
      throwsNaming(() => jl.judicialCustodyClock_(clockCtx([open('P-BAD', 'held', badArrest)]), 101), 'J-C' + badArrest + '-P-BAD'));
  }
}

// Task 6b through the scheduled phase: the Status is read before the restore.
{
  const ev = arrestReceipt('SYN-T6', 100, 'minor');
  const fx = phaseFixture('detained', 100, ev, { judicialReleasedRate: 1, judicialDivertedRate: 0, judicialHeldRate: 0 });
  const iNW = 7, iLife = 9, iIncome = 6;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('6b arrest Cycle charges nothing', fx.person[iNW] === 10000 && fx.person[iLife] === '');
  fx.ctx.summary = { cycleId: 101 };
  fx.ctx.config.cycleCount = 101;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('6b normal release: charged one week AND restored (charge is non-zero, so Status was read before the restore)',
    fx.person[iNW] === 9000 && fx.person[1] === 'Active' && fx.person[iIncome] === 52000 &&
    /\[IncomeHit J100\]$/.test(fx.person[iLife]));
  // failed case write: the tab still reads pending, the ledger is restored and committed
  fx.ctx.summary = { cycleId: 102 };
  fx.ctx.config.cycleCount = 102;
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('6b case closing again after a failed case write → not charged twice', fx.person[iNW] === 9000);
  fx.person[iLife] = ''; // even with the marker aged out, the restored Status blocks it
  fx.ctx.summary = { cycleId: 102 };
  phaseBox.runJudicialLifecycle_(fx.ctx);
  assert('6b … and the Status guard alone holds without the marker', fx.person[iNW] === 9000);

  const noKey = phaseFixture('Active', 101, null);
  delete noKey.ctx.config.judicialDismissAfterCycles;
  assert('6b lifecycle throws on a missing dismissal dial, every Cycle',
    throwsNaming(() => phaseBox.runJudicialLifecycle_(noKey.ctx), 'judicialDismissAfterCycles'));
  const noCol = phaseFixture('Active', 101, null);
  noCol.ctx.ledger.headers[7] = 'NetWorthX';
  assert('6b lifecycle throws on a missing NetWorth column', throwsNaming(() => phaseBox.runJudicialLifecycle_(noCol.ctx), 'NetWorth'));
}

// ── Task 8 R2-1: the stamps the census is derived from ───────────────────────
{
  const investigate = { ...arrestReceipt('SYN-T6', 100, 'grave'), entryType: 'investigation',
    kind: 'transition', sourceSystem: 'conduct', sourceEventId: 'conduct:synthetic:SYN-T6' };
  const open = jl.openCaseFromReceipt_(investigate);
  const fx = phaseFixture('active', 101, null, { investigationArrestRate: 1 });
  fx.rows.push(fx.fields.map(field => open[field]));
  assert('T8 fixture: the investigation row carries no ArrestCycle', caseFromFixture(fx).ArrestCycle === '');
  phaseBox.runJudicialLifecycle_(fx.ctx);
  const conv = fx.ctx.summary.judicialEvents[0];
  assert('T8 conversion receipt carries ArrestCycle and DecisionCycle',
    conv.kind === 'intake' && conv.arrestCycle === 101 && conv.decisionCycle === 102);
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T8 conversion persists ArrestCycle and DecisionCycle on the open row',
    fx.rows.length === 2 && caseFromFixture(fx).ArrestCycle === 101 &&
    caseFromFixture(fx).DecisionCycle === 102 && caseFromFixture(fx).StatusNow === 'pending' &&
    caseFromFixture(fx).ResolveCycle === '');
}
{
  // A re-arrest receipt on an open case carries no arrest stamps and moves none.
  const ev = arrestReceipt('SYN-T6', 100, 'minor');
  const fx = phaseFixture('detained', 100, ev, {});
  phaseBox.persistJudicialLedger_(fx.ctx);
  fx.ctx.summary = { cycleId: 101, judicialEvents: [{ ...arrestReceipt('SYN-T6', 101, 'minor') }] };
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T8 re-arrest on an open case leaves ArrestCycle and DecisionCycle alone',
    fx.rows.length === 2 && caseFromFixture(fx).ArrestCycle === 100 && caseFromFixture(fx).DecisionCycle === 101);
}
{
  // One case per SourceEventId, ever: a replayed intake after the case closed opens nothing.
  const ev = arrestReceipt('SYN-T6', 100, 'minor');
  const closed = jl.openCaseFromReceipt_(ev);
  closed.StatusNow = 'released'; closed.ResolveCycle = 101; closed.Outcome = 'released'; closed.CyclesHeld = 1;
  const fx = phaseFixture('Active', 102, { ...ev }, {});
  fx.rows.push(fx.fields.map(field => closed[field]));
  phaseBox.persistJudicialLedger_(fx.ctx);
  assert('T8 an intake whose SourceEventId already has a case opens no second row', fx.rows.length === 2);
  // A different event for the same citizen in the Cycle of a closed case takes the next free id.
  const second = { ...arrestReceipt('SYN-T6', 100, 'minor'), sourceEventId: 'patrol:synth-second:SYN-T6' };
  const fx2 = phaseFixture('Active', 100, second, {});
  fx2.rows.push(fx2.fields.map(field => closed[field]));
  phaseBox.persistJudicialLedger_(fx2.ctx);
  assert('T8 a second case in the Cycle of a closed one takes CaseId suffix -2',
    fx2.rows.length === 3 && caseFromFixture(fx2, 1).CaseId === 'J-C100-SYN-T6' &&
    caseFromFixture(fx2, 2).CaseId === 'J-C100-SYN-T6-2', caseFromFixture(fx2, 2).CaseId);
  const third = { ...second, sourceEventId: 'patrol:synth-third:SYN-T6' };
  const closed2 = { ...closed, CaseId: 'J-C100-SYN-T6-2', SourceEventId: second.sourceEventId };
  const fx3 = phaseFixture('Active', 100, third, {});
  fx3.rows.push(fx3.fields.map(field => closed[field]));
  fx3.rows.push(fx3.fields.map(field => closed2[field]));
  phaseBox.persistJudicialLedger_(fx3.ctx);
  assert('T8 the suffix runs to the first free id (-3)', caseFromFixture(fx3, 3).CaseId === 'J-C100-SYN-T6-3');
}

// engine.271 — the scheduled phase fines a closing case and posts the court's money.
console.log('\nengine.271 — the fine and the court rows through the scheduled phase:');
{
  const revBox = { Logger: { log() {} }, seededRngFor_, appended: [], errors: [],
    queueAppendIntent_: (ctx, tab, row, reason, domain, priority) => revBox.appended.push({ tab, row, priority }),
    logEngineError_: (ctx, phase, err) => revBox.errors.push(phase + ': ' + err.message),
    requireTab_: (ss, name) => ss.getSheetByName(name), persistWithRetry_: fn => fn(), appendRowWithRetry_: (tab, row) => tab.appendRow(row) };
  vm.createContext(revBox);
  for (const file of ['phase02-world-state/applyInitiativeImplementationEffects.js', 'phase05-citizens/judicialLifecycle.js', 'phase10-persistence/buildCyclePacket.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), revBox, { filename: file });
  }
  const REV = { fineRateTicket: 0.005, fineCapTicket: 500, fineRateMinor: 0.05, fineCapMinor: 5000, fineRateSerious: 0.10, fineCapSerious: 25000,
    fineRateGrave: 0.25, propertyTaxRate: 0.01, businessTaxRate: 0, taxDayCyclePosition: 16, taxThinHoodFloor: 20 };
  const world = (cycle) => ({ cycleId: cycle, treasury: { balance: 1000000, cycle, entries: 0 },
    careJusticeDemand: { hoods: { SYNTHETIC_HOOD: { judicialIntakes: 3 }, OTHER: { judicialIntakes: 2 } } },
    neighborhoodState: { SYNTHETIC_HOOD: { medianIncome: 80000 }, OTHER: { medianIncome: 200000 } } });
  const treasury = () => revBox.appended.filter(a => a.tab === 'City_Treasury').map(a => a.row);
  const run = (rates, gravity) => {
    revBox.appended.length = 0; revBox.errors.length = 0;
    const ev = arrestReceipt('SYN-T6', 100, gravity);
    const fx = phaseFixture('detained', 100, ev, { ...REV, ...rates });
    fx.ctx.summary = { ...world(100), judicialEvents: [ev] };
    revBox.runJudicialLifecycle_(fx.ctx);
    revBox.persistJudicialLedger_(fx.ctx);
    const c100 = treasury();
    revBox.appended.length = 0;
    fx.ctx.summary = world(101); fx.ctx.config.cycleCount = 101;
    revBox.runJudicialLifecycle_(fx.ctx);
    revBox.persistJudicialLedger_(fx.ctx);
    return { fx, c100, c101: treasury() };
  };
  // the arrest Cycle: 3 cleared in the defendant's hood less the 1 tracked arrest = 2 x 4,000; OTHER 2 x 5,000 (cap)
  let r = run({ judicialReleasedRate: 0, judicialDivertedRate: 1, judicialHeldRate: 0 }, 'serious');
  assert('271 the arrest Cycle posts one COURT row: the hoods\' cleared charges less the tracked arrest', r.c100.length === 1 && r.c100[0][3] === 'COURT' &&
    r.c100[0][2] === 2 * 4000 + 2 * 5000 && r.c100[0][4] === 1000000 + 18000, JSON.stringify(r.c100));
  assert('271 a diverted serious case is fined 10% of salary when it closes, on top of the lost week', r.fx.person[7] === 10000 - 1000 - 5200 &&
    /\[Money\] fined \$5200 by the court/.test(r.fx.person[9]), r.fx.person[7] + ' / ' + r.fx.person[9]);
  assert('271 the close Cycle posts the named fine, then the court row, balances in order', r.c101.length === 2 && r.c101[0][3] === 'COURT-NAMED' && r.c101[0][2] === 5200 && /^case J-C100-SYN-T6, SYN-T6, serious$/.test(r.c101[0][5]) &&
    r.c101[1][3] === 'COURT' && r.c101[1][2] === 3 * 4000 + 2 * 5000 && r.c101[1][4] === 1000000 + 5200 + 22000, JSON.stringify(r.c101));
  assert('271 the fine raises one COURT_FINE hook for the safety desk, naming the case', (r.fx.ctx.summary.storyHooks || []).length === 1 && r.fx.ctx.summary.storyHooks[0].hookType === 'COURT_FINE' &&
    r.fx.ctx.summary.storyHooks[0].domain === 'SAFETY' && /fined \$5200 by the court on a serious charge \(diverted, case J-C100-SYN-T6\)/.test(r.fx.ctx.summary.storyHooks[0].description), JSON.stringify(r.fx.ctx.summary.storyHooks));
  assert('271 the case still closes diverted and the citizen is restored', caseFromFixture(r.fx).Outcome === 'diverted' && r.fx.person[1] === 'Active' && revBox.errors.length === 0, revBox.errors.join(';'));
  r = run({ judicialReleasedRate: 1, judicialDivertedRate: 0, judicialHeldRate: 0 }, 'grave');
  assert('271 a released case raises no fine hook', !(r.fx.ctx.summary.storyHooks || []).some(h => h.hookType === 'COURT_FINE'));
  assert('271 a released case is not fined: only the court row posts', r.c101.length === 1 && r.c101[0][3] === 'COURT' && r.fx.person[7] === 9000 && !/fined/.test(r.fx.person[9]));
  // a missing dial stops the money, not the custody work
  revBox.appended.length = 0; revBox.errors.length = 0;
  const ev = arrestReceipt('SYN-T6', 100, 'minor');
  const bad = { ...REV }; delete bad.fineCapSerious;
  const fx = phaseFixture('detained', 100, ev, { ...bad, judicialReleasedRate: 0, judicialDivertedRate: 1, judicialHeldRate: 0 });
  fx.ctx.summary = { ...world(100), judicialEvents: [ev] };
  revBox.runJudicialLifecycle_(fx.ctx);
  revBox.persistJudicialLedger_(fx.ctx);
  assert('271 a missing revenue dial is its own error row; the case still opens and nothing is posted', caseFromFixture(fx).StatusNow === 'pending' &&
    treasury().length === 0 && revBox.errors.length === 1 && /Phase5-CourtRevenue: .*fineCapSerious missing/.test(revBox.errors[0]), revBox.errors.join(';'));
}

console.log(`\njudicialLifecycle: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
