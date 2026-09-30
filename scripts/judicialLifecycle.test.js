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
  investigationArrestRate: 0.30, judicialRepeatHeldMultiplier: 1.5
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
  const headers = ['POPID', 'First', 'Last', 'Neighborhood', 'LifeHistory', 'DialState', 'LastUpdated', 'Status', 'StatusStartCycle', 'HealthCause'];
  const row = ['SYNTHETIC-JUDICIAL', 'Synthetic', 'Defendant', 'Fruitvale', '', '', '', status, '', ''];
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
function fixedCopRun(failPayload, status) {
  const ctx = judicialCtx(status || 'Active');
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

console.log(`\njudicialLifecycle: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
