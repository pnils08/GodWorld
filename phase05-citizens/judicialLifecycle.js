/**
 * judicialLifecycle.js — engine.254 Task 5: judicial entry and outcome decision.
 *
 * Pure functions, called by nothing inside a Cycle yet. Task 6 wires the
 * advance into both scheduler entrypoints; Task 8 persists cases to
 * Judicial_Ledger. Spec: docs/plans/2026-09-21-care-and-justice-system.md
 * §Task 5 cut (reviewed: docs/research/2026-09-29-codex-care-justice-task5-cut.md).
 *
 * A case is one object with the 21 Judicial_Ledger fields. Each entry type is
 * one row of JUDICIAL_ENTRY_TYPES_: whether it can reach custody, the state it
 * opens in, its decision offset, its census treatment and one step function per
 * open state. A civil type (dispute, divorce, lawsuit) is a new row.
 *
 * Randomness is injected. The caller passes seededRngFor_(DecisionCycle,
 * 'judicial:' + SourceEventId) — never ctx.rng — so a decision is the same
 * decision however late it runs, and no other engine's draws move.
 *
 * Every step emits at most one census receipt (utilities/careJusticeAccounting.js
 * kinds): arrest opened / investigation converted = intake · pending→held =
 * transition · released / diverted / held-served = exit · no-arrest = none.
 */

var JUDICIAL_RATE_KEYS_ = [
  'judicialReleasedRate', 'judicialDivertedRate', 'judicialHeldRate',
  'investigationArrestRate', 'judicialRepeatHeldMultiplier'
];

// R3: held length 1–4 Cycles, scaled by charge gravity; uniform inside the range.
var JUDICIAL_HELD_RANGE_ = { minor: [1, 1], serious: [1, 3], grave: [3, 4] };

// R3: a second arrest inside a sim year (52 Cycles) raises the held odds.
var JUDICIAL_REPEAT_WINDOW_ = 52;

// Mirrors CARE_JUSTICE_CUSTODY_STATES — only these count as custody.
var JUDICIAL_CUSTODY_STATES_ = ['pending', 'held'];

var JUDICIAL_CASE_FIELDS_ = [
  'CaseId', 'POPID', 'Name', 'Neighborhood', 'ChargeCause', 'ChargeGravity', 'EntryType',
  'OpenCycle', 'ArrestCycle', 'DecisionCycle', 'StatusNow', 'LastTransitionCycle',
  'HeldUntilCycle', 'ResolveCycle', 'Outcome', 'CyclesHeld', 'PriorStatus',
  'SourceSystem', 'SourceEventId', 'TransferToId', 'Counterparty'
];

// ── steps shared by every custodial type ────────────────────────────────────

// pending → released / diverted / held, drawn from the World_Config split.
function judicialDecidePending_(c, cycle, rates, rng, priorArrests) {
  var wReleased = rates.judicialReleasedRate;
  var wDiverted = rates.judicialDivertedRate;
  var wHeld = rates.judicialHeldRate * (priorArrests > 0 ? rates.judicialRepeatHeldMultiplier : 1);
  var total = wReleased + wDiverted + wHeld;
  if (!(total > 0)) throw new Error('judicialLifecycle: outcome weights sum to zero for ' + c.CaseId);

  var roll = judicialDraw_(rng, c) * total;
  if (roll < wHeld) {
    var range = JUDICIAL_HELD_RANGE_[c.ChargeGravity];
    if (!range) throw new Error('judicialLifecycle: unknown ChargeGravity "' + c.ChargeGravity + '" on ' + c.CaseId);
    var length = range[0] + Math.floor(judicialDraw_(rng, c) * (range[1] - range[0] + 1));
    c.StatusNow = 'held';
    c.HeldUntilCycle = Number(c.DecisionCycle) + length;
    return 'transition';
  }
  judicialClose_(c, cycle, roll < wHeld + wReleased ? 'released' : 'diverted');
  c.StatusNow = c.Outcome;
  return 'exit';
}

// held → closed held-served at HeldUntilCycle (or later, if a Cycle was missed).
function judicialServeHeld_(c, cycle) {
  if (cycle < judicialClock_(c, 'HeldUntilCycle')) return null;
  judicialClose_(c, cycle, 'held-served');
  c.StatusNow = 'closed';
  return 'exit';
}

// investigating → arrest (pending, same Cycle) at investigationArrestRate, else no-arrest.
function judicialResolveInvestigation_(c, cycle, rates, rng) {
  if (judicialDraw_(rng, c) < rates.investigationArrestRate) {
    c.StatusNow = 'pending';
    c.ArrestCycle = cycle;
    c.DecisionCycle = cycle + judicialEntryType_(c.EntryType).decisionOffset;
    return 'intake';
  }
  judicialClose_(c, cycle, 'no-arrest');
  c.StatusNow = 'closed';
  return null;
}

var JUDICIAL_ENTRY_TYPES_ = {
  arrest: {
    custodial: true, openState: 'pending', decisionOffset: 1, census: 'arrest', arrestOnOpen: true,
    steps: {
      pending: function (c, cycle, rates, rng, prior) {
        return cycle >= judicialClock_(c, 'DecisionCycle') ? judicialDecidePending_(c, cycle, rates, rng, prior) : null;
      },
      held: function (c, cycle) { return judicialServeHeld_(c, cycle); }
    }
  },
  investigation: {
    custodial: true, openState: 'investigating', decisionOffset: 1, census: 'arrest', arrestOnOpen: false,
    steps: {
      investigating: function (c, cycle, rates, rng) {
        return cycle >= judicialClock_(c, 'DecisionCycle') ? judicialResolveInvestigation_(c, cycle, rates, rng) : null;
      },
      pending: function (c, cycle, rates, rng, prior) {
        return cycle >= judicialClock_(c, 'DecisionCycle') ? judicialDecidePending_(c, cycle, rates, rng, prior) : null;
      },
      held: function (c, cycle) { return judicialServeHeld_(c, cycle); }
    }
  }
};

// ── helpers ─────────────────────────────────────────────────────────────────

// A clock read from a case must be a real Cycle: Number('') is 0, and a blank
// clock would decide or release at once (kimi Task 5 review). Fail loud.
function judicialClock_(c, field) {
  var v = Number(c[field]);
  if (c[field] === '' || c[field] === null || c[field] === undefined || !(v > 0)) {
    throw new Error('judicialLifecycle: ' + field + ' is blank or not a Cycle on ' + c.StatusNow + ' case ' + c.CaseId);
  }
  return v;
}

function judicialDraw_(rng, c) {
  if (typeof rng !== 'function') {
    throw new Error('judicialLifecycle: a decision on ' + c.CaseId + ' needs an injected rng (seededRngFor_)');
  }
  return rng();
}

function judicialClose_(c, cycle, outcome) {
  c.Outcome = outcome;
  c.ResolveCycle = cycle;
  c.CyclesHeld = c.ArrestCycle === '' ? 0 : cycle - Number(c.ArrestCycle);
}

function judicialEntryType_(name) {
  var t = JUDICIAL_ENTRY_TYPES_[name];
  if (!t) throw new Error('judicialLifecycle: unknown EntryType "' + name + '"');
  return t;
}

// ── public surface ──────────────────────────────────────────────────────────

/**
 * World_Config → validated rates. Throws naming the key on a missing,
 * non-finite or out-of-domain value (codex F6).
 * @param {Object} cfg  key → value
 */
function loadJudicialRates_(cfg) {
  var out = {};
  for (var i = 0; i < JUDICIAL_RATE_KEYS_.length; i++) {
    var k = JUDICIAL_RATE_KEYS_[i];
    var raw = cfg ? cfg[k] : undefined;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      throw new Error('judicialLifecycle: World_Config key "' + k + '" missing');
    }
    var v = Number(raw);
    if (!isFinite(v)) throw new Error('judicialLifecycle: World_Config key "' + k + '" is not a finite number (' + raw + ')');
    if (k === 'judicialRepeatHeldMultiplier') {
      if (v < 1) throw new Error('judicialLifecycle: "' + k + '" must be >= 1 (R3 raises held odds), got ' + v);
    } else if (v < 0 || v > 1) {
      throw new Error('judicialLifecycle: "' + k + '" must be in [0, 1], got ' + v);
    }
    out[k] = v;
  }
  var split = out.judicialReleasedRate + out.judicialDivertedRate + out.judicialHeldRate;
  if (Math.abs(split - 1) > 0.001) {
    throw new Error('judicialLifecycle: judicialReleasedRate + judicialDivertedRate + judicialHeldRate = ' + split + ', must be 1');
  }
  return out;
}

/**
 * One open case per POPID inside a Cycle (codex F1). A second arrest of a
 * citizen already arrested this Cycle is a transition on that case — same
 * SourceEventId, its own key kept as reArrestEventId — never a second intake.
 * @param {Array} events  S.judicialEvents (mutated: the receipt is pushed)
 * @param {Object} receipt
 * @return {Object} the receipt as pushed
 */
function admitJudicialReceipt_(events, receipt) {
  if (!receipt || !receipt.sourceEventId || !receipt.popId) {
    throw new Error('judicialLifecycle: judicial receipt without SourceEventId or POPID');
  }
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (e.kind === 'intake' && e.popId === receipt.popId) {
      receipt.reArrestEventId = receipt.sourceEventId;
      receipt.sourceEventId = e.sourceEventId;
      receipt.kind = 'transition';
      break;
    }
  }
  events.push(receipt);
  return receipt;
}

/**
 * Typed receipt → case object with the 21 Judicial_Ledger fields.
 */
function openCaseFromReceipt_(receipt) {
  if (!receipt || !receipt.sourceEventId || !receipt.popId) {
    throw new Error('judicialLifecycle: cannot open a case from a receipt without SourceEventId or POPID');
  }
  var type = judicialEntryType_(receipt.entryType);
  // A re-arrest is a transition on an open case, never a new one (kimi Task 5 review).
  if (type.arrestOnOpen && receipt.kind !== 'intake') {
    throw new Error('judicialLifecycle: ' + receipt.entryType + ' case opens only from an intake receipt, got "' +
      receipt.kind + '" (' + receipt.sourceEventId + ')');
  }
  var cycle = Number(receipt.cycle);
  if (!(cycle > 0)) throw new Error('judicialLifecycle: receipt ' + receipt.sourceEventId + ' has no Cycle');

  var c = {};
  for (var i = 0; i < JUDICIAL_CASE_FIELDS_.length; i++) c[JUDICIAL_CASE_FIELDS_[i]] = '';
  c.CaseId = 'J-C' + cycle + '-' + receipt.popId;
  c.POPID = receipt.popId;
  c.Name = receipt.name || '';
  c.Neighborhood = receipt.neighborhood || '';
  c.ChargeCause = receipt.chargeCause || '';
  c.ChargeGravity = receipt.chargeGravity || '';
  c.EntryType = receipt.entryType;
  c.OpenCycle = cycle;
  c.ArrestCycle = type.arrestOnOpen ? cycle : '';
  c.DecisionCycle = cycle + type.decisionOffset;
  c.StatusNow = type.openState;
  c.LastTransitionCycle = cycle;
  c.PriorStatus = receipt.priorStatus || '';
  c.SourceSystem = receipt.sourceSystem || '';
  c.SourceEventId = receipt.sourceEventId;
  c.Counterparty = receipt.counterparty || '';
  return c;
}

/**
 * Prior arrests of this POPID inside the repeat window, this case excluded.
 */
function countPriorArrests_(cases, popId, arrestCycle, caseId) {
  var n = 0;
  for (var i = 0; i < (cases || []).length; i++) {
    var p = cases[i];
    if (p.POPID !== popId || p.CaseId === caseId || p.ArrestCycle === '' || p.ArrestCycle === undefined) continue;
    var gap = Number(arrestCycle) - Number(p.ArrestCycle);
    if (gap > 0 && gap <= JUDICIAL_REPEAT_WINDOW_) n++;
  }
  return n;
}

/**
 * Advance one case by at most one step this Cycle (codex F3). Due means
 * cycle >= the step's clock, so a missed Cycle catches up; a case already
 * moved this Cycle is returned unchanged. The input case is not mutated.
 *
 * @return {{case: Object, event: Object|null}}
 */
function advanceCase_(caseIn, cycle, rates, rng, priorArrests) {
  var c = {};
  for (var k in caseIn) if (caseIn.hasOwnProperty(k)) c[k] = caseIn[k];
  if (c.ResolveCycle !== '' && c.ResolveCycle !== undefined) return { case: c, event: null };
  if (Number(c.LastTransitionCycle) === cycle) return { case: c, event: null };

  var type = judicialEntryType_(c.EntryType);
  var step = type.steps[c.StatusNow];
  if (!step) throw new Error('judicialLifecycle: no step for state "' + c.StatusNow + '" on ' + c.EntryType + ' case ' + c.CaseId);

  var kind = step(c, cycle, rates, rng, priorArrests || 0);
  if (kind === null && c.ResolveCycle === '') return { case: caseIn, event: null };

  if (!type.custodial && JUDICIAL_CUSTODY_STATES_.indexOf(c.StatusNow) >= 0) {
    throw new Error('judicialLifecycle: non-custodial ' + c.EntryType + ' case ' + c.CaseId + ' reached custody state ' + c.StatusNow);
  }
  c.LastTransitionCycle = cycle;
  if (!kind || type.census === 'none') return { case: c, event: null };
  return {
    case: c,
    event: {
      system: 'judicial', kind: kind, intakeType: type.census, sourceEventId: c.SourceEventId,
      popId: c.POPID, name: c.Name, neighborhood: c.Neighborhood, cycle: cycle, statusNow: c.StatusNow
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JUDICIAL_ENTRY_TYPES_: JUDICIAL_ENTRY_TYPES_,
    JUDICIAL_CASE_FIELDS_: JUDICIAL_CASE_FIELDS_,
    JUDICIAL_HELD_RANGE_: JUDICIAL_HELD_RANGE_,
    loadJudicialRates_: loadJudicialRates_,
    admitJudicialReceipt_: admitJudicialReceipt_,
    openCaseFromReceipt_: openCaseFromReceipt_,
    countPriorArrests_: countPriorArrests_,
    advanceCase_: advanceCase_
  };
}
