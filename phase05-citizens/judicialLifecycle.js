/**
 * judicialLifecycle.js — engine.254 Task 5: judicial entry and outcome decision.
 *
 * Task 6 wires the advance into both scheduler entrypoints and persists cases
 * to Judicial_Ledger. Spec: docs/plans/2026-09-21-care-and-justice-system.md
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

// Phase-5 reads the previous Cycle's close through the sheet cache. A missing
// tab or header is a deployment error, even on a Cycle with no arrests.
function judicialCaseData_(ctx) {
  if (!ctx.cache || typeof ctx.cache.getData !== 'function') {
    throw new Error('judicialLifecycle: Judicial_Ledger cache missing');
  }
  var cached = ctx.cache.getData('Judicial_Ledger');
  if (!cached || !cached.exists || !cached.values || !cached.values.length) {
    throw new Error('judicialLifecycle: Judicial_Ledger tab missing');
  }
  var header = cached.values[0];
  var cols = {};
  for (var f = 0; f < JUDICIAL_CASE_FIELDS_.length; f++) {
    var field = JUDICIAL_CASE_FIELDS_[f];
    cols[field] = header.indexOf(field);
    if (cols[field] < 0) throw new Error('judicialLifecycle: Judicial_Ledger.' + field + ' header missing');
  }
  var cases = [], open = {};
  for (var r = 1; r < cached.values.length; r++) {
    var row = cached.values[r], c = {};
    if (!String(row[cols.CaseId] || '').trim()) continue;
    for (var k = 0; k < JUDICIAL_CASE_FIELDS_.length; k++) {
      var name = JUDICIAL_CASE_FIELDS_[k];
      c[name] = row[cols[name]] === undefined ? '' : row[cols[name]];
    }
    cases.push(c);
    if (c.ResolveCycle === '' || c.ResolveCycle === null) {
      var pop = String(c.POPID);
      if (open.hasOwnProperty(pop)) throw new Error('judicialLifecycle: Judicial_Ledger has two open rows for ' + pop);
      open[pop] = c;
    }
  }
  return { cases: cases, open: open };
}

function judicialHealthStatus_(status) {
  return ['hospitalized', 'critical', 'serious-condition', 'injured', 'recovering']
    .indexOf(String(status || '').trim().toLowerCase()) >= 0;
}

// Hospital P is the life-state underneath custody, never the custody marker.
function judicialPriorStatusForCare_(ctx, popId, from) {
  if (String(from || '').trim().toLowerCase() !== 'detained') return from || '';
  var events = (ctx.summary && ctx.summary.judicialEvents) || [];
  for (var i = 0; i < events.length; i++) {
    if (events[i].popId === popId && events[i].kind === 'intake') return events[i].priorStatus || '';
  }
  var open = judicialCaseData_(ctx).open[String(popId)];
  if (!open) {
    // Stranded custody (a Phase-10 case write failed): Phase5-Judicial opens the
    // reconcile case after Generational, so blank here — the reconcile's own
    // known-blank convention (discharge -> active) — never a throw that would
    // take down the whole Generational phase on the Cycle that heals it.
    if (typeof Logger !== 'undefined') Logger.log('judicialLifecycle: detained ' + popId + ' admitted to care with no open case — PriorStatus blank');
    return '';
  }
  return open.PriorStatus || '';
}

// engine.254 Task 6b: Cycles in custody before a tracked employer dismisses.
// Called by the lifecycle every Cycle, so a missing key is an Engine_Errors row
// on the first fire, not on the first dismissal years later.
function loadJudicialDismissAfter_(cfg) {
  var k = 'judicialDismissAfterCycles';
  var raw = cfg ? cfg[k] : undefined;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new Error('judicialLifecycle: World_Config key "' + k + '" missing');
  }
  var v = Number(raw);
  if (!isFinite(v) || Math.floor(v) !== v || v < 1 || v > 9007199254740991) {
    throw new Error('judicialLifecycle: "' + k + '" must be a whole number of Cycles >= 1, got ' + raw);
  }
  return v;
}

// Custody's durable clock is the case, never StatusStartCycle (re-stamped at
// every re-assert). { POPID: { caseId, arrestCycle } } for open pending/held
// rows plus this Cycle's arrest intakes; an investigating row is not custody.
function judicialCustodyClock_(ctx, cycle) {
  var out = {};
  var open = judicialCaseData_(ctx).open;
  for (var pop in open) {
    if (!open.hasOwnProperty(pop)) continue;
    var c = open[pop];
    if (JUDICIAL_CUSTODY_STATES_.indexOf(String(c.StatusNow)) < 0) continue;
    var a = Number(c.ArrestCycle);
    if (c.ArrestCycle === '' || c.ArrestCycle === null || c.ArrestCycle === undefined ||
        !isFinite(a) || Math.floor(a) !== a || a < 1 || a > cycle) {
      throw new Error('judicialLifecycle: ArrestCycle "' + c.ArrestCycle + '" is not a Cycle at or before C' +
        cycle + ' on ' + c.StatusNow + ' case ' + c.CaseId);
    }
    out[pop] = { caseId: String(c.CaseId), arrestCycle: a };
  }
  var events = (ctx.summary && ctx.summary.judicialEvents) || [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (!e || e.system !== 'judicial' || e.kind !== 'intake' || e.entryType !== 'arrest') continue;
    if (Number(e.cycle) !== cycle || out[String(e.popId)]) continue;
    out[String(e.popId)] = { caseId: 'J-C' + cycle + '-' + e.popId, arrestCycle: cycle };
  }
  return out;
}

var JUDICIAL_SETTLED_OUTCOMES_ = ['released', 'diverted', 'held-served'];

// engine.254 Task 6b (builder 2026-09-30): missed pay comes out of savings.
// Income is never touched — the weekly money loop already pays only Active
// adults, so a held citizen saves nothing; this charges the weeks themselves,
// once, where the case closes, by the money loop's own shock-expense rule.
// statusBefore is the Status read BEFORE this Cycle's restore: a normal close
// finds custody or care there; a case closing a second time after a failed case
// write finds the life-state already restored and is not charged again.
function judicialSettleLostPay_(ctx, row, c, cycle, cols, statusBefore) {
  if (JUDICIAL_SETTLED_OUTCOMES_.indexOf(String(c.Outcome)) < 0) return null;
  if (String(c.SourceSystem || '').trim().toLowerCase() === 'reconcile') return null; // its clock starts at the repair
  var prior = String(c.PriorStatus || '').trim().toLowerCase();
  if (prior !== '' && prior !== 'active') return null; // only a paycheck the money loop was paying
  if (statusBefore !== 'detained' && !judicialHealthStatus_(statusBefore)) return null;
  if (String(row[cols.iClock] || '').trim().toUpperCase() === 'GAME') return null;
  // No tier is exempt (builder 2026-09-30): an arrest is an event, and every tier loses the weeks.
  if (cols.iBirth >= 0) {
    var by = Number(row[cols.iBirth]) || 0;
    if (by > 0 && typeof simYearOf_ === 'function' && (simYearOf_(ctx, cycle) - by) < 18) return null;
  }
  var income = Number(row[cols.iIncome]) || 0;
  var weeks = Number(c.CyclesHeld);
  if (!(income > 0) || !(weeks >= 1)) return null;
  var marker = '[IncomeHit J' + c.ArrestCycle + ']';
  var life = cols.iLife >= 0 ? String(row[cols.iLife] || '') : '';
  if (life.indexOf(marker) >= 0) return null;

  var rawNw = row[cols.iNW];
  // A blank NetWorth is nothing saved — the money loop's own reading (Number(cell) || 0);
  // 30 earning citizens on the live ledger carry one. Only a value that is there and
  // cannot be read stops the charge.
  var nwBlank = rawNw === '' || rawNw === null || rawNw === undefined;
  var nw = nwBlank ? 0 : Number(String(rawNw).replace(/[$,\s]/g, ''));
  if (!isFinite(nw)) {
    // never write a zero over a value that could not be read
    var unread = new Error('judicialLifecycle: NetWorth "' + rawNw + '" unreadable on ' + c.POPID + ' — case ' + c.CaseId + ' closed without the lost-pay charge');
    if (typeof logEngineError_ === 'function') logEngineError_(ctx, 'Phase5-CustodySettlement', unread);
    else if (typeof Logger !== 'undefined') Logger.log(unread.message);
    return null;
  }
  var charge = Math.round(income / 52 * weeks);
  var held = weeks + (weeks === 1 ? ' week' : ' weeks') + ' held with no pay';
  var text;
  if (nw >= charge) {
    row[cols.iNW] = nw - charge;
    text = held + ' — savings covered it';
  } else {
    if (!nwBlank) row[cols.iNW] = 0; // a blank stays blank: the gap is the ledger's, not this charge's
    if (cols.iDebt >= 0) {
      var debt = Number(row[cols.iDebt]) || 0;
      if (debt < 6) row[cols.iDebt] = debt + 1;
    }
    text = held + ' — more than the savings could hold, borrowed to cover it';
  }
  if (cols.iLife >= 0) {
    var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1); // the money loop's stamp
    row[cols.iLife] = (life ? life + '\n' : '') + stamp + ' — [Money] ' + text + ' ' + marker;
  }
  if (typeof queueAppendIntent_ === 'function') {
    queueAppendIntent_(ctx, 'LifeHistory_Log', [ctx.now, c.POPID, '', 'Money', text, '', cycle]);
  }
  ctx.ledger.dirty = true;
  return { popId: c.POPID, weeks: weeks, charge: charge, borrowed: nw < charge };
}

function judicialSetStatus_(ctx, row, status, cycle, iStatus, iStart) {
  row[iStatus] = status;
  // Custody stamps its start; a restored life-state clears it, as a care discharge does.
  row[iStart] = String(status).toLowerCase() === 'detained' ? cycle : '';
  ctx.ledger.dirty = true;
}

function judicialLifecycleReceipt_(c, kind, cycle) {
  return {
    system: 'judicial', kind: kind, intakeType: kind === 'intake' ? 'arrest' : '',
    sourceEventId: c.SourceEventId, popId: c.POPID, name: c.Name,
    neighborhood: c.Neighborhood, cycle: cycle, statusNow: c.StatusNow,
    lastTransitionCycle: c.LastTransitionCycle, heldUntilCycle: c.HeldUntilCycle,
    resolveCycle: c.ResolveCycle, outcome: c.Outcome, cyclesHeld: c.CyclesHeld,
    // Task 8 R2-1: a conversion's arrest stamps reach the writer.
    arrestCycle: c.ArrestCycle, decisionCycle: c.DecisionCycle
  };
}

function runJudicialLifecycle_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  var cycle = Number(S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount));
  if (!(cycle > 0)) throw new Error('judicialLifecycle: current Cycle missing');
  var rates = loadJudicialRates_(ctx.config);
  loadJudicialDismissAfter_(ctx.config); // Task 6b: read by the career dismissal pass; validated here every Cycle
  var data = judicialCaseData_(ctx);
  var events = S.judicialEvents || [];
  if (!Array.isArray(events)) throw new Error('judicialLifecycle: S.judicialEvents must be an array');
  S.judicialEvents = events;
  var header = ctx.ledger && ctx.ledger.headers, rows = ctx.ledger && ctx.ledger.rows;
  if (!header || !rows) throw new Error('judicialLifecycle: Simulation_Ledger missing');
  var iPop = header.indexOf('POPID'), iStatus = header.indexOf('Status');
  var iStart = header.indexOf('StatusStartCycle'), iClock = header.indexOf('ClockMode');
  if (iPop < 0 || iStatus < 0 || iStart < 0 || iClock < 0) {
    throw new Error('judicialLifecycle: Simulation_Ledger custody columns missing');
  }
  var payCols = { iClock: iClock, iBirth: header.indexOf('BirthYear'),
    iIncome: header.indexOf('Income'), iNW: header.indexOf('NetWorth'), iDebt: header.indexOf('DebtLevel'),
    iLife: header.indexOf('LifeHistory') };
  if (payCols.iIncome < 0 || payCols.iNW < 0) {
    throw new Error('judicialLifecycle: Simulation_Ledger Income/NetWorth columns missing');
  }
  var settled = [];
  var citizen = {};
  for (var r = 0; r < rows.length; r++) citizen[String(rows[r][iPop])] = rows[r];

  // New arrests are already visible in S and in the in-memory citizen row.
  var intakes = {};
  var processed = {};
  for (var e = 0, originalLength = events.length; e < originalLength; e++) {
    var receipt = events[e];
    if (!receipt || typeof receipt !== 'object') throw new Error('judicialLifecycle: invalid S.judicialEvents receipt');
    if (receipt.system === 'judicial' && receipt.statusNow !== undefined &&
        Number(receipt.cycle) === cycle) processed[receipt.popId] = true;
    if (receipt.kind !== 'intake' || receipt.system !== 'judicial') continue;
    if (intakes[receipt.popId]) throw new Error('judicialLifecycle: duplicate intake for ' + receipt.popId);
    intakes[receipt.popId] = true;
    if (!data.open[receipt.popId]) {
      var opened = openCaseFromReceipt_(receipt);
      data.open[receipt.popId] = opened;
      data.cases.push(opened);
    }
  }

  // A failed Phase-10 case write can leave Status detained without its row.
  for (var pop in citizen) {
    if (!citizen.hasOwnProperty(pop) || data.open[pop]) continue;
    if (String(citizen[pop][iStatus] || '').trim().toLowerCase() !== 'detained') continue;
    var reconcile = {
      system: 'judicial', kind: 'intake', intakeType: 'arrest', entryType: 'arrest',
      sourceSystem: 'reconcile', sourceEventId: 'reconcile:C' + cycle + ':' + pop,
      popId: pop, cycle: cycle, priorStatus: '', chargeGravity: 'minor',
      chargeCause: 'custody persistence reconciliation'
    };
    var recCase = openCaseFromReceipt_(reconcile);
    data.open[pop] = recCase;
    data.cases.push(recCase);
    events.push(reconcile);
  }

  for (var id in data.open) {
    if (!data.open.hasOwnProperty(id)) continue;
    if (processed[id]) continue;
    var c = data.open[id], row = citizen[id];
    if (!row) throw new Error('judicialLifecycle: open case citizen ' + id + ' missing from Simulation_Ledger');
    var status = String(row[iStatus] || '').trim(), lower = status.toLowerCase();
    var kind = '';
    if (lower === 'deceased' || lower === 'traded' || lower === 'inactive') {
      c.Outcome = lower === 'deceased' ? 'deceased' : lower + '-reconciled';
      c.StatusNow = 'closed';
      c.ResolveCycle = cycle;
      c.CyclesHeld = c.ArrestCycle === '' ? 0 : Math.max(0, cycle - Number(c.ArrestCycle));
      c.LastTransitionCycle = cycle;
      kind = 'exit';
    } else {
      var rng = seededRngFor_(Number(c.DecisionCycle), 'judicial:' + c.SourceEventId);
      var prior = countPriorArrests_(data.cases, id, c.ArrestCycle, c.CaseId);
      var step = advanceCase_(c, cycle, rates, rng, prior);
      c = step.case;
      if (step.event) kind = step.event.kind;
      else if (c.ResolveCycle !== '' && c.LastTransitionCycle === cycle) {
        // Investigation no-arrest has no census movement; a transition receipt
        // still carries the case closure to the Phase-10 writer.
        kind = c.Outcome === 'no-arrest' ? 'transition' : 'exit';
      }
      if (c.ResolveCycle !== '') {
        // Task 6b: `lower` is the Status before the restore below — the settlement's replay guard.
        var paid = judicialSettleLostPay_(ctx, row, c, cycle, payCols, lower);
        if (paid) settled.push(paid);
        if (c.Outcome !== 'no-arrest' && !judicialHealthStatus_(lower) && lower !== 'deceased' &&
            lower !== 'traded' && lower !== 'inactive' && lower !== 'pending' &&
            String(row[iClock] || '').trim().toUpperCase() !== 'GAME') {
          judicialSetStatus_(ctx, row, c.PriorStatus || 'active', cycle, iStatus, iStart);
        }
      } else if ((c.StatusNow === 'pending' || c.StatusNow === 'held') &&
                 !judicialHealthStatus_(lower) && lower !== 'detained' &&
                 lower !== 'traded' && lower !== 'inactive' && lower !== 'pending' &&
                 String(row[iClock] || '').trim().toUpperCase() !== 'GAME') {
        judicialSetStatus_(ctx, row, 'detained', cycle, iStatus, iStart);
      }
    }
    if (kind) events.push(judicialLifecycleReceipt_(c, kind, cycle));
  }
  if (typeof Logger !== 'undefined') Logger.log('judicialLifecycle C' + cycle + ': lost-pay settlements ' + settled.length);
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
    advanceCase_: advanceCase_,
    judicialCaseData_: judicialCaseData_, judicialPriorStatusForCare_: judicialPriorStatusForCare_,
    loadJudicialDismissAfter_: loadJudicialDismissAfter_, judicialCustodyClock_: judicialCustodyClock_,
    judicialSettleLostPay_: judicialSettleLostPay_,
    runJudicialLifecycle_: runJudicialLifecycle_
  };
}
