/**
 * ============================================================================
 * applyInitiativeImplementationEffects_ v1.1 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27 civic feedback loop
 *
 * v1.1 (S311, engine.45 T3e): outputs made real — per-initiative Ripple_Ledger
 * rows at compute site; sentimentBoost folded into finalCity.sentiment by
 * applyCityDynamics; dead S.sentiment write + unread triggers publish removed.
 *
 * Reads ImplementationPhase from Initiative_Tracker and applies ongoing
 * domain-specific effects to AffectedNeighborhoods. Voice agents set
 * ImplementationPhase via applyTrackerUpdates.js; this function makes
 * the engine react to those decisions.
 *
 * A live dispatch program (OARI) affects SAFETY in D1/D3/D5.
 * Active disbursement (Stabilization Fund) affects ECONOMIC in West Oakland.
 * Construction (Baylight) affects SPORTS+ECONOMIC in Jack London.
 *
 * Runs in Phase 2 after EditionCoverage, before Weather.
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * loadCivicVoiceSentiment_ v2.0 (ES5) — engine.138 / G-PF18
 * ============================================================================
 *
 * Sets S.civicVoiceSentiment for compound effects in
 * applyEditionCoverageEffects_. Run BEFORE applyEditionCoverageEffects_.
 *
 * v2.0 CARRIER CHANGE. v1.0 read output/civic_sentiment_c{XX}.json through
 * `require('fs')`. Apps Script has no `require` and no filesystem, so that
 * branch never executed on the live engine: `content` stayed empty, both
 * candidate cycles missed, and the function logged "No civic sentiment file
 * found" and left the value at 0. **Civic voice sentiment therefore
 * contributed exactly 0 to the live world for the entire life of the
 * feature** — every hearing the city ever held was scored, written down, and
 * never felt. The loader only ever worked under a Node test harness.
 *
 * The value now rides the same carrier every other Phase-2 channel uses: a
 * World_Config key, written by the civic close (scripts/applyTrackerUpdates.js
 * --apply) and already in ctx.config by Phase1-LoadConfig. No filesystem, no
 * fetch, nothing Apps Script cannot do.
 *
 *   civicVoiceSentiment       — the statement-weighted score
 *   civicVoiceSentimentCycle  — the cycle it was computed for
 *
 * The cycle key is the staleness gate: a score is accepted for the current
 * cycle or the one before it (the civic close runs a cycle behind the fire),
 * and refused beyond that rather than letting an old hearing keep pushing the
 * world. Refusal is logged with the numbers so a stalled civic chain shows up
 * as a stale reading instead of a silent 0 — the failure mode this replaces.
 *
 * ============================================================================
 */
function loadCivicVoiceSentiment_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.civicVoiceSentiment = 0;

  var currentCycle = Number(S.cycleId || S.cycle || 0);
  if (!currentCycle) {
    Logger.log('loadCivicVoiceSentiment_ v2.0: no cycleId on the summary — sentiment stays 0');
    ctx.summary = S;
    return;
  }

  var cfg = ctx.config || {};
  var raw = cfg.civicVoiceSentiment;
  if (raw === undefined || raw === null || raw === '') {
    Logger.log('loadCivicVoiceSentiment_ v2.0: World_Config key civicVoiceSentiment not set — ' +
      'the civic close has never written it (defaulting to 0)');
    ctx.summary = S;
    return;
  }

  var score = Number(raw);
  if (isNaN(score)) {
    Logger.log('loadCivicVoiceSentiment_ v2.0: World_Config civicVoiceSentiment is not numeric ("' +
      raw + '") — defaulting to 0');
    ctx.summary = S;
    return;
  }

  var stamped = Number(cfg.civicVoiceSentimentCycle || 0);
  var age = currentCycle - stamped;
  if (!stamped || age < 0 || age > 1) {
    Logger.log('loadCivicVoiceSentiment_ v2.0: STALE — World_Config carries ' + score +
      ' stamped for cycle ' + (stamped || '(none)') + ', engine is at cycle ' + currentCycle +
      '. Refusing it; sentiment stays 0. The civic close has not run for this cycle.');
    ctx.summary = S;
    return;
  }

  S.civicVoiceSentiment = score;
  Logger.log('loadCivicVoiceSentiment_ v2.0: Loaded sentiment ' + score +
    ' from World_Config (stamped cycle ' + stamped + ', engine cycle ' + currentCycle + ')');

  ctx.summary = S;
}


/**
 * engine.131 T7 — is this the Baylight/stadium initiative?
 * Matched by name rather than a hardcoded INIT id so a renamed or re-filed
 * row still reconciles.
 */
function isBaylightInitiative_(name) {
  return /baylight/i.test(String(name || ''));
}


/**
 * engine.131 T7 — has a franchise actually opened in Baylight this cycle?
 * Reads the zone set applySportsSeason_ published at Phase2-SportsSeason, which
 * runs BEFORE this function at both entry points (godWorldEngine2.js:276 vs
 * :280). Absent or empty is a safe no — nothing reconciles and behaviour is
 * exactly what it was.
 */
function sportsHasOpenedBaylight_(S) {
  var zones = (S && S.sportsZones) || [];
  for (var i = 0; i < zones.length; i++) {
    if (zones[i] === 'Baylight District') return true;
  }
  return false;
}


/**
 * civic.38 Task 4 — upkeep (plan §Delivered is not forever, rulings c/e/g).
 * Engine mirror of lib/initiativePhaseContract.js tendFactor — parity-tested,
 * never edit one without the other. A row at Standing or Delivering pays phase
 * intensity x this factor: full inside the grace, then linear decay per Cycle
 * untended to the floor. "Untended since" = the later of LastWorkCycle and
 * LastStageChangeCycle. No reference Cycle => no decay.
 *
 * @param {Object} t {stage, cycle, lastWorkCycle, lastStageChangeCycle, grace, decay, floor}
 * @return {{factor:number, untended:number, reference:number}}
 */
var CIVIC_TEND_STAGES_ = ['Standing', 'Delivering'];
var INITIATIVE_PHASE_INTENSITY_ = {
  'announced': 0,
  'legislation-filed': 0.05,
  'vote-scheduled': 0,
  'vote-ready': 0.15,
  'visioning': 0.1,
  'visioning-complete': 0.15,
  'design-phase': 0.2,
  'construction-planning': 0.3,
  'construction-active': 0.8,
  'implementation-active': 0.8,
  'disbursement-active': 1.0,
  'dispatch-live': 1.0,
  'pilot-active': 0.6,
  'pilot_evaluation': 0.6,
  'operational': 0.9,
  'complete': 0.5,
  'stalled': -0.5,
  'blocked': -0.7,
  'suspended': -0.6,
  'defunded': -1.0
};
// One phase → intensity match for every reader (engine.254 Task 8, kimi Task 7
// F1): the exact key first, then the first table key the phase contains, else 0.
function initiativePhaseIntensity_(phase) {
  var p = String(phase === undefined || phase === null ? '' : phase);
  if (INITIATIVE_PHASE_INTENSITY_.hasOwnProperty(p)) return INITIATIVE_PHASE_INTENSITY_[p];
  for (var pk in INITIATIVE_PHASE_INTENSITY_) {
    if (INITIATIVE_PHASE_INTENSITY_.hasOwnProperty(pk) && p.indexOf(pk) >= 0) return INITIATIVE_PHASE_INTENSITY_[pk];
  }
  return 0;
}
function civicTendFactor_(t) {
  t = t || {};
  var out = { factor: 1, untended: 0, reference: 0 };
  if (CIVIC_TEND_STAGES_.indexOf(String(t.stage == null ? '' : t.stage).replace(/^\s+|\s+$/g, '')) < 0) return out;
  var cycle = Number(t.cycle);
  if (!isFinite(cycle) || cycle < 1) return out;
  var work = Number(t.lastWorkCycle);
  var change = Number(t.lastStageChangeCycle);
  var ref = Math.max(isFinite(work) && work >= 1 ? work : 0, isFinite(change) && change >= 1 ? change : 0);
  if (!(ref >= 1)) return out;
  out.reference = ref;
  out.untended = Math.max(0, cycle - ref);
  var grace = Number(t.grace), decay = Number(t.decay), floor = Number(t.floor);
  if (!isFinite(grace) || !isFinite(decay) || !isFinite(floor)) return out;
  if (out.untended <= grace) return out;
  var f = 1 - decay * (out.untended - grace);
  if (f < floor) f = floor;
  if (f > 1) f = 1;
  if (f < 0) f = 0;
  out.factor = Math.round(f * 10000) / 10000;
  return out;
}

/**
 * The three upkeep dials, read once per fire and ONLY when a staged row asks —
 * a world with every Stage blank never touches them. Fail-loud like every other
 * self-armed key (seeded by ensureEngine213Config_ at cycle open).
 */
function getCivicTendDials_(ctx) {
  if (ctx && ctx._civicTendDials) return ctx._civicTendDials;
  var source = ctx && ctx.config;
  if (!source) throw new Error('civic upkeep: ctx.config required');
  var required = function(key, min, max) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) || value < min || value > max) {
      throw new Error('civic upkeep: invalid or missing World_Config.' + key);
    }
    return value;
  };
  var dials = {
    grace: required('civicTendGraceCycles', 0, 52),
    decay: required('civicTendDecayPerCycle', 0, 1),
    floor: required('civicTendFloor', 0, 1)
  };
  if (ctx) ctx._civicTendDials = dials;
  return dials;
}


function applyInitiativeImplementationEffects_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.initiativeImplementationEffects = null;

  var ss = ctx.ss;
  if (!ss) return;

  // engine.259: the disbursement slice — one program per Standing/Delivering fund
  // in `disbursement-active` with money left; published every fire, same
  // unavailable-vs-empty contract as the relief slice.
  S.initiativeDisbursement = { available: false, reason: 'tracker-unread', programs: [] };
  var sheet = ss.getSheetByName('Initiative_Tracker');
  if (!sheet) {
    Logger.log('applyInitiativeImplementationEffects_ v1.0: Initiative_Tracker not found (skipping)');
    S.initiativeDisbursement.reason = 'tracker-missing';
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { S.initiativeDisbursement = { available: true, reason: null, programs: [] }; return; }

  var headers = data[0];

  // Find columns
  var iName = findImplCol_(headers, ['Name', 'name']);
  var iStatus = findImplCol_(headers, ['Status', 'status']);
  var iPhase = findImplCol_(headers, ['ImplementationPhase', 'implementationphase']);
  var iDomain = findImplCol_(headers, ['PolicyDomain', 'policydomain']);
  var iHoods = findImplCol_(headers, ['AffectedNeighborhoods', 'affectedneighborhoods']);
  var iBudget = findImplCol_(headers, ['Budget', 'budget']);
  var iInitId = findImplCol_(headers, ['InitiativeID', 'initiativeid']);
  // civic.38 Task 4 upkeep — the three stage cells the tend factor reads. Absent
  // columns (-1) or a blank Stage leave every row at full strength.
  var iStage = findImplCol_(headers, ['Stage']);
  var iLastWork = findImplCol_(headers, ['LastWorkCycle']);
  var iLastStageChange = findImplCol_(headers, ['LastStageChangeCycle']);
  var iMayoral = findImplCol_(headers, ['MayoralAction', 'mayoralaction']);
  // engine.259 (builder 2026-09-24: "the fund should move"): the phase says the
  // money is flowing — keyed on phase, never domain (no housing program; any
  // fund a seat stands up in this phase spends). Which other phases spend a
  // budget (construction, dispatch, operational) is the builder's call; only
  // `disbursement-active` does today.
  var FUND_DISBURSE_PHASES = { 'disbursement-active': true };
  var iBudgetRemaining = findImplCol_(headers, ['BudgetRemaining']);
  var iLastDisburse = findImplCol_(headers, ['LastDisburseCycle']);
  var pendingDisbursement = [];
  // Initiatives in the World Job 5 (builder 2026-09-26: "build + running both
  // spend"): a build spends its capital share across its build weeks, a running
  // program burns its operating runway and closes at zero like the fund. The
  // fund's own phase stays on the grants path above.
  var BUILD_SPEND_PHASES = { 'construction-planning': true, 'construction-active': true };
  var RUN_SPEND_PHASES = { 'implementation-active': true, 'dispatch-live': true, 'pilot-active': true, 'pilot_evaluation': true, 'operational': true };
  var iBudgetTotal = findImplCol_(headers, ['BudgetTotal']);
  var iNotesImpl = findImplCol_(headers, ['MilestoneNotes']);
  var spendSlice = [];
  // Initiatives in the World Job 6: the renewal columns (self-armed by the Phase-5
  // engine). A renewal passed at last fire's Phase 5 is credited here, first.
  var iRenewAmt = findImplCol_(headers, ['RenewalAmount']);
  var iRenewOut = findImplCol_(headers, ['RenewalOutcome']);
  var iRenewCredit = findImplCol_(headers, ['RenewalCreditCycle']);
  var renewalSlice = [];

  // engine.262 — the treasury opens before any money moves this fire.
  var treasury = null;
  var trSheet = ss.getSheetByName('City_Treasury');
  if (trSheet) {
    var trCycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
    var trRows = trSheet.getLastRow() >= 1 ? trSheet.getDataRange().getValues() : [];
    treasury = readTreasuryLedger_(trRows);
    treasury.cycle = trCycle;
    treasury.entries = [];
    treasury.underfunded = [];
    var trPost = function(entry, amount, counterparty, note) {
      treasury.entries.push([trCycle, entry, Math.round(amount), counterparty, Math.round(treasury.balance), note || '']);
    };
    treasury.post = trPost;
    if (treasury.empty) {
      var opening = Number(ctx.config && ctx.config.treasuryOpeningBalance);
      if (!(opening >= 0)) opening = 100000000;
      treasury.balance = opening;
      trPost('OPENING', opening, 'GENERAL-FUND', 'general fund opens (Baylight apart — its own tax-increment district)');
      // Programs the council funded before the treasury existed keep their money: recorded, not charged.
      for (var tp = 1; tp < data.length; tp++) {
        var tpName = iName !== -1 ? String(data[tp][iName] || '') : '';
        var tpId = iInitId !== -1 ? String(data[tp][iInitId] || '').trim() : '';
        if (!tpId || isBaylightInitiative_(tpName)) continue;
        if (!treasuryIsVotedProgram_(iStatus !== -1 ? data[tp][iStatus] : '', iMayoral !== -1 ? data[tp][iMayoral] : '')) continue;
        treasury.appropriated[tpId] = true;
        trPost('PREFUNDED', 0, tpId, 'funded before the treasury');
      }
    }
    // engine.271 (builder 2026-10-02): the allocation stood in for taxes — it ends
    // for good once the first property-tax row is on the tab.
    if (!treasury.taxLanded && !treasury.revenueCycles[String(trCycle)]) {
      var weekly = Number(ctx.config && ctx.config.treasuryWeeklyAllocation);
      if (!(weekly >= 0)) weekly = 5000000;
      treasury.balance += weekly;
      treasury.revenueCycles[String(trCycle)] = true;
      trPost('REVENUE', weekly, 'WEEKLY-ALLOCATION', 'weekly budget allocation');
    }
  }

  // engine.250: last Cycle's phase per initiative (previousCycleState.initiativePhases,
  // written by updateCivicApprovalRatings_ from the tracker SHEET), gated on the blob
  // being exactly one Cycle old — same gate, same keys as engine.139. Tells a phase
  // TRANSITION (an event) from a standing phase (a state). No prior data => nothing
  // reads as a transition, the conservative direction.
  var implCycle = Number(S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0);
  var implPrev = S.previousCycleState || {};
  var prevPhases = (Number(implPrev.cycle) === implCycle - 1 && implPrev.initiativePhases)
    ? implPrev.initiativePhases : null;
  // civic.38 Task 4 (plan ruling 7): phases the Phase-5 stage handler moved last
  // Cycle, by the phase each row LEFT. Same one-Cycle-old gate. Consulted ahead of
  // initiativePhases, which already holds the new phase for those rows.
  var enginePhaseMoves = (Number(implPrev.cycle) === implCycle - 1 && implPrev.initiativeEnginePhaseMoves)
    ? implPrev.initiativeEnginePhaseMoves : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLEMENTATION PHASE → INTENSITY MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  // engine.132 — phases where a health initiative is actually TREATING people.
  // A construction site cures nobody, so planning/design/construction are absent
  // by intent: relief begins when care begins. Keys mirror PHASE_INTENSITY.
  var HEALTH_DELIVERING_PHASES = {
    'implementation-active': true,
    'disbursement-active': true,
    'dispatch-live': true,
    'pilot-active': true,
    'pilot_evaluation': true,
    'operational': true,
    'complete': true
  };

  var pendingHealthRelief = [];

  var PHASE_INTENSITY = INITIATIVE_PHASE_INTENSITY_;

  // ═══════════════════════════════════════════════════════════════════════════
  // POLICY DOMAIN → NEIGHBORHOOD EFFECTS
  // Mirrors applyNeighborhoodRipple_ in civicInitiativeEngine.js
  // ═══════════════════════════════════════════════════════════════════════════

  var DOMAIN_EFFECTS = {
    'health': {
      sentiment: 0.06, communityEngagement: 0.04, publicSpaces: 0.02
    },
    'transit': {
      retail: 0.06, traffic: 0.10, sentiment: 0.04
    },
    'economic': {
      retail: 0.08, sentiment: 0.05, nightlife: 0.03
    },
    'housing': {
      sentiment: 0.08, communityEngagement: 0.06
    },
    'safety': {
      sentiment: 0.05, communityEngagement: 0.03, nightlife: 0.02
    },
    'sports': {
      retail: 0.08, nightlife: 0.06, traffic: 0.05, sentiment: 0.04
    },
    'workforce': {
      sentiment: 0.04, communityEngagement: 0.05, retail: 0.03
    },
    'environment': {
      sentiment: 0.05, publicSpaces: 0.04, communityEngagement: 0.03
    },
    'education': {
      sentiment: 0.04, communityEngagement: 0.05,
      schoolQuality: 0.05   // engine.192: a delivering education initiative is the one thing that moves a hood's school funding and pulls its quality up (read by driftNeighborhoodEducation_)
    }
  };

  var DEFAULT_EFFECTS = {
    sentiment: 0.03, communityEngagement: 0.02
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS EACH INITIATIVE
  // ═══════════════════════════════════════════════════════════════════════════

  var neighborhoodEffects = {};
  var triggers = [];
  var totalSentiment = 0;
  var processed = 0;
  // engine.183 — the transit slice: every transit-domain initiative and Baylight,
  // with the phase and hoods AFTER the T7 correction, for updateTransitMetrics_
  // (Phase2-Transit, downstream). One tracker read serves the whole Phase 2.
  var transitSlice = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var name = iName !== -1 ? (row[iName] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var phase = iPhase !== -1 ? (row[iPhase] || '').toString().trim().toLowerCase() : '';
    var domain = iDomain !== -1 ? (row[iDomain] || '').toString().trim().toLowerCase() : '';
    var hoodsStr = iHoods !== -1 ? (row[iHoods] || '').toString().trim() : '';

    // engine.262 — a newly voted program is charged once; one the treasury can't
    // cover opens underfunded (BudgetRemaining capped at what was paid).
    if (treasury && iInitId !== -1 && iBudgetTotal !== -1 && iBudgetRemaining !== -1 && !isBaylightInitiative_(name)) {
      var apId = String(row[iInitId] || '').trim();
      if (apId && !treasury.appropriated[apId] && treasuryIsVotedProgram_(status, iMayoral !== -1 ? row[iMayoral] : '')) {
        var apWant = Number(row[iBudgetTotal]) || 0;
        var ap = treasuryDraw_(treasury.balance, apWant);
        treasury.balance = ap.balance;
        treasury.appropriated[apId] = true;
        treasury.post('APPROPRIATION', -ap.paid, apId, ap.short > 0
          ? 'opens underfunded: ' + treasuryMoney_(ap.paid) + ' of ' + treasuryMoney_(apWant)
          : 'funded in full');
        if (ap.short > 0) {
          var apRem = Math.min(Number(row[iBudgetRemaining]) || 0, ap.paid);
          queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iBudgetRemaining + 1, apRem, 'engine.262 underfunded appropriation ' + apId, 'civic', 3);
          row[iBudgetRemaining] = apRem;
          treasury.underfunded.push({ id: apId, name: name, paid: ap.paid, budget: apWant });
          if (iNotesImpl !== -1) {
            var apPrior = String(row[iNotesImpl] == null ? '' : row[iNotesImpl]);
            var apNote = 'C' + treasury.cycle + ': opens underfunded — the treasury covered ' + treasuryMoney_(ap.paid) + ' of ' + treasuryMoney_(apWant) + '.';
            queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iNotesImpl + 1, (apPrior ? apPrior + '\n' : '') + apNote, 'engine.262 underfunded note ' + apId, 'civic', 3);
            row[iNotesImpl] = (apPrior ? apPrior + '\n' : '') + apNote;
          }
        }
      }
    }

    // Skip if no implementation phase set or no name
    if (!phase || !name) continue;

    // Job 6: a renewal the council passed at the last fire lands its money now,
    // on BudgetRemaining only — BudgetTotal stays the program's size, which sets
    // its weekly cost, so the renewal buys amount ÷ weekly cost more weeks,
    // before this fire spends, so each fire has one writer of BudgetRemaining and
    // the fund's Phase-5 tranche reads the credited balance. Priority 4 lands ahead
    // of this fire's own spend writes (5). A dry-closed program goes back to the
    // phase it was running in. The reopen registers once, at the NEXT fire (the
    // sheet still reads `complete` when this fire's phase record is taken — the
    // same one-fire lag as T7); the guard below stops this fire counting it too.
    var renewalRevived = false;
    if (iRenewOut !== -1 && iRenewCredit !== -1 && iRenewAmt !== -1 && iBudgetRemaining !== -1) {
      var rc = planRenewalCredit_({ outcome: row[iRenewOut], creditCycle: row[iRenewCredit], amount: row[iRenewAmt],
        remaining: row[iBudgetRemaining], phase: phase,
        notes: iNotesImpl !== -1 ? row[iNotesImpl] : '' });
      if (rc && treasury && !isBaylightInitiative_(name)) {
        // engine.262 — the renewal is paid from the treasury; short money renews short.
        var rcWant = rc.newRemaining - (Number(row[iBudgetRemaining]) || 0);
        var rd = treasuryDraw_(treasury.balance, rcWant);
        treasury.balance = rd.balance;
        treasury.post('RENEWAL', -rd.paid, iInitId !== -1 ? String(row[iInitId] || '').trim() : name,
          rd.short > 0 ? 'renewed short: ' + treasuryMoney_(rd.paid) + ' of ' + treasuryMoney_(rcWant) : 'renewal paid');
        if (rd.short > 0) {
          rc.newRemaining = (Number(row[iBudgetRemaining]) || 0) + rd.paid;
          rc.money = treasuryMoney_(rd.paid) + ' of ' + treasuryMoney_(rcWant) + ' (the treasury ran short)';
        }
      }
      if (rc) {
        var rcId = iInitId !== -1 ? String(row[iInitId] || '').trim() : name;
        queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iBudgetRemaining + 1, rc.newRemaining, 'Job 6 renewal credit C' + implCycle + ' ' + rcId, 'civic', 4);
        queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iRenewCredit + 1, implCycle, 'Job 6 renewal credit receipt C' + implCycle + ' ' + rcId, 'civic', 4);
        row[iBudgetRemaining] = rc.newRemaining;
        row[iRenewCredit] = implCycle;
        if (iNotesImpl !== -1) {
          var rcPrior = String(row[iNotesImpl] == null ? '' : row[iNotesImpl]);
          row[iNotesImpl] = (rcPrior ? rcPrior + '\n' : '') + 'C' + implCycle + ': renewal money lands — ' + rc.money +
            ' added to the budget' + (rc.revivePhase ? ', the program reopens' : '');
          queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iNotesImpl + 1, row[iNotesImpl], 'Job 6 renewal credit note', 'civic', 4);
        }
        if (rc.revivePhase && iPhase !== -1) {
          queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iPhase + 1, rc.revivePhase, 'Job 6 renewal reopens C' + implCycle + ' ' + rcId, 'civic', 4);
          row[iPhase] = rc.revivePhase;
          phase = rc.revivePhase;
          renewalRevived = true;
        }
        renewalSlice.push({ initiativeId: rcId, name: name, credit: rc.amount,
          newRemaining: rc.newRemaining, revivedTo: rc.revivePhase });
      }
    }

    // engine.250: transition test on the RAW sheet phase, before the T7 Baylight
    // correction below — initiativePhases stores the sheet's value, and the T7
    // write lands at Phase 10, so comparing the corrected phase would read the
    // stadium opening as a transition on two consecutive Cycles.
    var initKey = (iInitId !== -1 ? (row[iInitId] || '').toString().trim() : '') || name;
    var prevPhase = initiativePrevPhaseFor_(prevPhases, enginePhaseMoves, initKey);
    var phaseMoved = !!prevPhase && String(prevPhase) !== String(phase);
    // civic.38 Task 5 revival guard, business side: coming back from a failing
    // phase (stalled / blocked / suspended / defunded) is getting back to where
    // you were, not an advance — otherwise a stall/revive loop farms the lift.
    if (phaseMoved && PHASE_INTENSITY[String(prevPhase)] < 0) phaseMoved = false;
    // Job 6: the in-memory reopen is not this fire's transition — it counts once,
    // next fire, against the recorded `complete` (a reopen is news: §15 aftermath).
    if (renewalRevived) phaseMoved = false;

    // ─────────────────────────────────────────────────────────────────────
    // engine.131 T7 reconciliation — sports is the source of truth
    // ─────────────────────────────────────────────────────────────────────
    // Bench C107 produced a world that contradicted itself in a single cycle:
    // the engine had the Oaks playing in Baylight (feed-derived, T7) while this
    // function announced "Baylight District ... is construction-planning —
    // ongoing sports effects in Jack London, Downtown". Both were internally
    // correct; nothing reconciled them. Same failure class as the C104 Grand
    // Lake contradiction that started this work.
    //
    // Reconciled in the direction the project actually runs: a franchise
    // playing in a stadium IS the stadium being finished. The engine does not
    // wait for a civic phase to be hand-advanced, and no construction schedule
    // is modelled — this is a game, not a civic simulation. The tracker gets
    // corrected to match the world, once, when the world changes.
    // civic.38 ruling 6 (codex F5): a STAGED row's phase has one owner — the
    // Phase-5 stage handler. T7's queued `operational` would land at Phase 10 on
    // top of a stall decided in the same run and silently undo the losing clock,
    // so T7 yields on any row with a Stage. Baylight (INIT-006) converts unstaged
    // and keeps this path.
    var t7Staged = iStage !== -1 && !!String(row[iStage] == null ? '' : row[iStage]).trim();
    if (!t7Staged && isBaylightInitiative_(name) && sportsHasOpenedBaylight_(S)) {
      if (phase !== 'operational' && phase !== 'complete') {
        // Write it back so the tracker stops asserting a building site, and so
        // the silence/nag machinery stops charging officials for not narrating
        // a project the city can already see finished. Cell intent — Phase 2 is
        // upstream of the Phase 10 executor, so this commits normally.
        if (iPhase !== -1 && typeof queueCellIntent_ === 'function') {
          queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iPhase + 1, 'operational',
            'engine.131 T7 — a franchise is playing in Baylight, so the stadium is built',
            'civic', 5);
        }
        Logger.log('applyInitiativeImplementationEffects_: T7 — "' + name +
          '" advanced ' + phase + ' -> operational (sport is live in Baylight)');
      }
      phase = 'operational';
      // ...and its effects land where the sport actually is, not where the
      // tracker's stale AffectedNeighborhoods still point.
      if (S.sportsZones && S.sportsZones.length) hoodsStr = S.sportsZones.join(', ');
    }

    // Get intensity from phase
    var intensity = initiativePhaseIntensity_(phase);

    // civic.38 Task 4 upkeep (rulings c/e): a delivered service nobody tends
    // weakens. Staged rows only (Standing / Delivering) and positive intensity
    // only — a stall is not softened by neglect, a legacy row (blank Stage) and
    // the sport-opened Baylight (never staged) are untouched. Every consumer
    // below reads the EFFECTIVE intensity; the transit slice also carries the
    // factor, because the station gates on the phase name (ruling g).
    var tend = 1;
    var untended = 0;
    if (intensity > 0 && iStage !== -1) {
      var stageCell = (row[iStage] || '').toString().trim();
      if (stageCell === 'Standing' || stageCell === 'Delivering') {
        var tendDials = getCivicTendDials_(ctx);
        var tf = civicTendFactor_({
          stage: stageCell,
          cycle: implCycle,
          lastWorkCycle: iLastWork !== -1 ? row[iLastWork] : '',
          lastStageChangeCycle: iLastStageChange !== -1 ? row[iLastStageChange] : '',
          grace: tendDials.grace, decay: tendDials.decay, floor: tendDials.floor
        });
        tend = tf.factor;
        untended = tf.untended;
        if (tend < 1) intensity = Math.round(intensity * tend * 10000) / 10000;
      }
    }

    // engine.183 — publish before the zero-intensity skip: a hub in design
    // (intensity 0.2) and one merely announced (0) both name themselves on the
    // transit rows; only construction and opening move the numbers.
    if (domain === 'transit' || isBaylightInitiative_(name)) {
      var tHoods = [];
      var tParts = String(hoodsStr || '').split(/[,;]+/);
      for (var tp = 0; tp < tParts.length; tp++) {
        var th = tParts[tp].replace(/^\s+|\s+$/g, '');
        if (th) tHoods.push(th);
      }
      transitSlice.push({
        name: name,
        phase: phase,
        intensity: intensity,
        tend: tend,   // civic.38 upkeep factor, 1 = tended or not staged
        domain: domain,
        hoods: tHoods,
        baylight: isBaylightInitiative_(name)
      });
    }

    // Skip zero-intensity phases
    if (intensity === 0) continue;

    // engine.132 — remember which hoods have care actually being DELIVERED this
    // cycle, and how strongly. Collected after the T7 phase correction above so a
    // reconciled phase counts, and before the domain-effect fan-out so it is not
    // entangled with the sentiment path.
    if (domain === 'health' && HEALTH_DELIVERING_PHASES[phase] === true) {
      pendingHealthRelief.push({ hoodsStr: hoodsStr, intensity: intensity, name: name });
    }
    // engine.259: a voted, Standing/Delivering fund in a disbursing phase with
    // money left spends a tranche this Cycle.
    if (FUND_DISBURSE_PHASES[phase] === true && iStage !== -1 && iInitId !== -1 && iBudgetRemaining !== -1) {
      var dStage = String(row[iStage] == null ? '' : row[iStage]).trim();
      var dVoted = status === 'override-passed' ||
        (status === 'passed' && iMayoral !== -1 && String(row[iMayoral] == null ? '' : row[iMayoral]).trim().toLowerCase() === 'signed');
      var dRemaining = Number(row[iBudgetRemaining]);
      if ((dStage === 'Standing' || dStage === 'Delivering') && dVoted && isFinite(dRemaining) && dRemaining > 0) {
        pendingDisbursement.push({ initiativeId: String(row[iInitId] || '').trim(), name: name, domain: domain, hoodsStr: hoodsStr, phase: phase, stage: dStage, tend: tend,
          remaining: dRemaining, lastDisburseCycle: iLastDisburse !== -1 ? Number(row[iLastDisburse]) || 0 : 0, sheetRow: i + 1 });
      }
    }
    // Job 5: builds and running programs spend. Same voted + Standing/Delivering
    // gate as the fund; same LastDisburseCycle receipt so a re-fire never debits twice.
    if ((BUILD_SPEND_PHASES[phase] === true || RUN_SPEND_PHASES[phase] === true) &&
        iStage !== -1 && iInitId !== -1 && iBudgetRemaining !== -1 && iBudgetTotal !== -1) {
      var sStage = String(row[iStage] == null ? '' : row[iStage]).trim();
      var sVoted = status === 'override-passed' ||
        (status === 'passed' && iMayoral !== -1 && String(row[iMayoral] == null ? '' : row[iMayoral]).trim().toLowerCase() === 'signed');
      var sRemRaw = row[iBudgetRemaining], sTotRaw = row[iBudgetTotal];
      var sLast = iLastDisburse !== -1 ? Number(row[iLastDisburse]) || 0 : 0;
      if ((sStage === 'Standing' || sStage === 'Delivering') && sVoted && sLast !== implCycle &&
          sRemRaw !== '' && sRemRaw !== null && sTotRaw !== '' && sTotRaw !== null) {
        var sPlan = planInitiativeSpend_({
          phase: phase, build: BUILD_SPEND_PHASES[phase] === true, total: Number(sTotRaw), remaining: Number(sRemRaw), tend: tend,
          renewed: iRenewCredit !== -1 && String(row[iRenewCredit] == null ? '' : row[iRenewCredit]).trim() !== '',
          buildCycles: getCivicBuildCycles_(ctx, domain), dials: getCivicSpendDials_(ctx)
        });
        if (sPlan && sPlan.debit > 0) {
          var sId = String(row[iInitId] || '').trim();
          queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iBudgetRemaining + 1, sPlan.newRemaining,
            'Job 5 ' + (sPlan.build ? 'build' : 'operating') + ' spend C' + implCycle + ' ' + sId, 'civic', 5);
          if (iLastDisburse !== -1) queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iLastDisburse + 1, implCycle,
            'Job 5 spend receipt C' + implCycle + ' ' + sId, 'civic', 5);
          if (sPlan.exhausted && iPhase !== -1) {
            queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iPhase + 1, 'complete',
              'Job 5 operating budget exhausted C' + implCycle + ' ' + sId, 'civic', 5);
            if (iNotesImpl !== -1) {
              var sPrior = String(row[iNotesImpl] == null ? '' : row[iNotesImpl]);
              queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iNotesImpl + 1,
                (sPrior ? sPrior + '\n' : '') + 'C' + implCycle + ': operating budget exhausted — service ends unless the council renews it (was ' + phase + ')',
                'Job 5 budget exhausted note', 'civic', 5);
            }
          }
          spendSlice.push({ initiativeId: sId, name: name, phase: phase, build: sPlan.build, debit: sPlan.debit,
            newRemaining: sPlan.newRemaining, weeksLeft: sPlan.weeksLeft, exhausted: sPlan.exhausted });
        }
      }
    }

    // Get domain effects
    var effects = DOMAIN_EFFECTS[domain] || DEFAULT_EFFECTS;

    // Parse neighborhoods
    var hoods = [];
    if (hoodsStr) {
      var parts = hoodsStr.split(/[,;]+/);
      for (var hi = 0; hi < parts.length; hi++) {
        var h = parts[hi].trim();
        if (h) hoods.push(h);
      }
    }

    if (hoods.length === 0) continue; // Can't apply effects without target neighborhoods

    // Determine sign: positive intensity = benefits, negative = harm
    var sign = intensity >= 0 ? 1 : -1;
    var mag = Math.abs(intensity);

    // Apply effects to each neighborhood
    for (var ni = 0; ni < hoods.length; ni++) {
      var hood = hoods[ni];
      if (!neighborhoodEffects[hood]) {
        neighborhoodEffects[hood] = {
          traffic: 0, retail: 0, nightlife: 0,
          publicSpaces: 0, communityEngagement: 0, sentiment: 0,
          schoolQuality: 0,  // engine.192
          advanced: 0        // engine.250: count of initiatives here that changed phase THIS Cycle into a positive-intensity phase — read by applyBusinessDynamics_; not a fold field
        };
      }
      if (phaseMoved && intensity > 0) neighborhoodEffects[hood].advanced += 1;

      var ne = neighborhoodEffects[hood];
      for (var ek in effects) {
        if (effects.hasOwnProperty(ek) && ne.hasOwnProperty(ek)) {
          ne[ek] += effects[ek] * mag * sign;
        }
      }
    }

    // Sentiment contribution (city-wide, scaled by intensity)
    var sentDelta = (effects.sentiment || 0.03) * intensity * 0.5; // half weight for city-wide
    totalSentiment += sentDelta;

    // Generate triggers for high-intensity active phases
    if (mag >= 0.8) {
      triggers.push({
        type: 'initiative-active',
        initiative: name,
        phase: phase,
        domain: domain,
        neighborhoods: hoods,
        intensity: intensity
      });
    }

    // Generate triggers for stalled/blocked
    if (intensity < 0) {
      triggers.push({
        type: 'initiative-stalled',
        initiative: name,
        phase: phase,
        domain: domain,
        neighborhoods: hoods,
        intensity: intensity
      });
    }

    processed++;

    // engine.45 T3e: persist the implementation-phase contribution at the compute
    // site — the voice-agent-set ImplementationPhase is the cause, the tracker's
    // AffectedNeighborhoods are the targets. One row per initiative per cycle
    // (this is an ongoing per-cycle effect, duration 1, same grain as the folds).
    if (typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'initiative-implementation',
        causeId: name,
        causeDetail: name + ' is ' + phase + ' — ongoing ' + domain +
          ' effects in ' + hoods.join(', ') +
          (tend < 1 ? ' — untended ' + untended + ' Cycles, running at ' + Math.round(tend * 100) + '% strength' : ''),
        effectType: Object.keys(effects).join('/'),
        targetScope: 'neighborhood',
        targetIds: hoods,
        neighborhood: hoods.length === 1 ? hoods[0] : '',
        magnitude: intensity,
        duration: 1,
        sourceEngine: 'applyInitiativeImplementationEffects'
      });
    }

    Logger.log('  ' + name + ': ' + phase + ' (' + domain + ') → intensity ' +
      intensity.toFixed(2) + (tend < 1 ? ' (upkeep ' + tend.toFixed(2) + ', untended ' + untended + ')' : '') +
      ' → ' + hoods.join(', '));
  }

  // Clamp total sentiment
  totalSentiment = Math.max(-0.15, Math.min(0.15, totalSentiment));

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  // engine.132 — resolve the collected health initiatives to a per-hood relief
  // map. Hoods are parsed the same way the effect fan-out parses them, so an
  // initiative relieves exactly the neighborhoods it claims and no others.
  var healthRelief = {};
  for (var hr = 0; hr < pendingHealthRelief.length; hr++) {
    var item = pendingHealthRelief[hr];
    var parts = String(item.hoodsStr || '').split(/[,;]+/);
    for (var hp = 0; hp < parts.length; hp++) {
      var hood = parts[hp].replace(/^\s+|\s+$/g, '');
      if (!hood) continue;
      // Strongest delivering initiative wins per hood — two clinics in one
      // neighborhood is not double the medicine.
      if (!healthRelief[hood] || item.intensity > healthRelief[hood]) {
        healthRelief[hood] = item.intensity;
      }
    }
    Logger.log('applyInitiativeImplementationEffects_: engine.132 health relief from "' +
      item.name + '" intensity ' + item.intensity + ' -> ' + item.hoodsStr);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // engine.132 — the repair-mechanism wire
  // ═══════════════════════════════════════════════════════════════════════════
  // The initiative ledger exists so a broken engine number can be answered by an
  // IN-WORLD event instead of a commit (Mike-direct 2026-08-27: the sim is
  // living, so a number cannot be bad one cycle and fine the next). The Temescal
  // Community Health Center IS the response to the Temescal health crisis.
  //
  // It has never been able to work. DOMAIN_EFFECTS.health moves sentiment,
  // communityEngagement and publicSpaces; the string "illness" appears nowhere in
  // this file. So a $45M health centre could run forever and sickness would not
  // move. Publishing the health slice here is what lets Phase 3 treat a
  // delivering health initiative as a real same-cycle cause, exactly like a heat
  // wave — see updateNeighborhoodDemographics_ hoodIllnessMod.
  //
  // DELIVERING phases only. A building site treats nobody, so construction and
  // planning publish nothing; relief starts when care starts.
  S.initiativeHealthRelief = healthRelief;
  S.initiativeDisbursement = buildDisbursementSlice_(ctx, pendingDisbursement);

  // engine.262 — this fire's treasury entries (Phase 10 appends) + the balance for readers.
  if (treasury) {
    for (var te = 0; te < treasury.entries.length; te++) {
      queueAppendIntent_(ctx, 'City_Treasury', treasury.entries[te], 'engine.262 treasury ' + treasury.entries[te][1], 'civic', 5);
    }
    S.treasury = { balance: Math.round(treasury.balance), cycle: treasury.cycle,
      entries: treasury.entries.length, underfunded: treasury.underfunded,
      lastTaxCycle: treasury.lastTaxCycle || 0 }; // engine.271: later phases post revenue against this balance
  }
  S.initiativeSpend = spendSlice;
  S.initiativeRenewalCredits = renewalSlice;
  if (spendSlice.length) {
    Logger.log('applyInitiativeImplementationEffects_: Job 5 spend — ' + spendSlice.map(function (sp) {
      return sp.initiativeId + ' ' + (sp.build ? 'build' : 'operating') + ' -' + sp.debit + ' -> ' + sp.newRemaining +
        (sp.exhausted ? ' EXHAUSTED' : (sp.weeksLeft !== null ? ' (' + sp.weeksLeft + ' wk left)' : ''));
    }).join('; '));
  }
  if (renewalSlice.length) {
    Logger.log('applyInitiativeImplementationEffects_: Job 6 renewal credit — ' + renewalSlice.map(function (rc) {
      return rc.initiativeId + ' +' + rc.credit + ' -> ' + rc.newRemaining + (rc.revivedTo ? ' REOPENED ' + rc.revivedTo : '');
    }).join('; '));
  }

  S.initiativeImplementationEffects = {
    processed: processed,
    sentimentBoost: totalSentiment,
    neighborhoodCount: Object.keys(neighborhoodEffects).length,
    triggerCount: triggers.length,
    transit: transitSlice   // engine.183 — read by updateTransitMetrics_Phase2_
  };

  // Merge into existing neighborhood effects (don't overwrite)
  if (!S.initiativeNeighborhoodEffects) S.initiativeNeighborhoodEffects = {};
  for (var nh in neighborhoodEffects) {
    if (!S.initiativeNeighborhoodEffects[nh]) {
      S.initiativeNeighborhoodEffects[nh] = neighborhoodEffects[nh];
    } else {
      var existing = S.initiativeNeighborhoodEffects[nh];
      var incoming = neighborhoodEffects[nh];
      for (var mk in incoming) {
        if (incoming.hasOwnProperty(mk)) {
          existing[mk] = (existing[mk] || 0) + incoming[mk];
        }
      }
    }
  }

  // engine.45 T3e: the S.initiativeImplementationTriggers publish is gone — it had
  // zero readers since landing; the story path is contract seeds built from the
  // per-initiative Ripple_Ledger rows written above. Local `triggers` feeds the
  // count in the summary stats + log line only.
  // The dead `S.sentiment +=` write is gone too (same class S294 deleted in
  // applySportsSeason/applyEditionCoverageEffects): sentimentBoost now reaches
  // finalCity.sentiment via the applyCityDynamics T3e fold.
  // S.initiativeNeighborhoodEffects (merged above) lives the whole Cycle (engine.250):
  // Phase 2 applyCityDynamics_ folds the six metric fields into hood state, Phase 3
  // driftNeighborhoodEducation_ reads schoolQuality, Phase 5 applyBusinessDynamics_
  // reads `advanced` (event) and the sign of `sentiment` (condition).

  Logger.log('applyInitiativeImplementationEffects_ v1.0: ' + processed + ' initiatives → ' +
    'sentiment ' + totalSentiment.toFixed(4) + ', ' +
    Object.keys(neighborhoodEffects).length + ' neighborhoods, ' +
    triggers.length + ' triggers');

  ctx.summary = S;
}


// engine.259 — the fund dials (engine94SheetContract seeds). Fail loud on a missing key.
/** Job 5 dials, fail-loud (seeded by ensureEngine213Config_). */
function getCivicSpendDials_(ctx) {
  var source = ctx && ctx.config;
  if (!source) throw new Error('civic spend: ctx.config required');
  var required = function (key, min, max) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) || value < min || value > max) {
      throw new Error('civic spend: invalid or missing World_Config.' + key);
    }
    return value;
  };
  return { capitalShare: required('civicCapitalShare', 0, 1), operatingWeeks: required('civicOperatingWeeks', 1, 520) };
}

/**
 * Initiatives in the World Job 6 — the credit for a renewal the council passed.
 * Due when RenewalOutcome reads RENEWED and RenewalCreditCycle is blank.
 * BudgetRemaining rises by the amount; BudgetTotal is untouched (it is the
 * program's size and sets its weekly cost). A `complete` row reopens in the phase its
 * dry-close marker names (renewalDryClosePhase_). Returns null when nothing is due.
 * Pure.
 */
function planRenewalCredit_(input) {
  if (String(input.outcome == null ? '' : input.outcome).trim().indexOf('RENEWED') !== 0) return null;
  if (String(input.creditCycle == null ? '' : input.creditCycle).trim() !== '') return null;
  var amount = typeof input.amount === 'number' ? (input.amount > 0 ? Math.round(input.amount) : null) : parseBudgetMoney_(input.amount);
  if (!amount) return null;
  var remaining = Number(input.remaining);
  if (!isFinite(remaining)) return null;
  var revivePhase = String(input.phase || '').toLowerCase() === 'complete' ? renewalDryClosePhase_(input.notes) : null;
  return {
    amount: amount, money: renewalMoneyText_(amount), revivePhase: revivePhase,
    newRemaining: Math.round((Math.max(0, remaining) + amount) * 100) / 100
  };
}

/**
 * Job 5 — one Cycle of a build's or a running program's spend. Pure.
 * A build category (buildCycles > 0) splits its budget: capitalShare is spent
 * evenly across the build weeks (scaled by tend — an untended site does less
 * work and spends less), never below the operating floor; the rest is runway.
 * A running row spends runway evenly over operatingWeeks; a no-build category's
 * whole budget is runway. A running row still holding capital (a site that
 * opened before this rule, or one that under-spent its build) is trued down to
 * the floor first — except a renewed row (input.renewed, Job 6), whose renewal
 * money sits above the floor by design. Returns null when nothing moves.
 */
function planInitiativeSpend_(input) {
  var total = Number(input.total), remaining = Number(input.remaining);
  if (!isFinite(total) || total <= 0 || !isFinite(remaining) || remaining <= 0) return null;
  var d = input.dials || {};
  var buildCycles = Math.max(0, Math.floor(Number(input.buildCycles) || 0));
  var opShare = buildCycles > 0 ? (1 - Number(d.capitalShare)) : 1;
  var floor = Math.round(total * opShare * 100) / 100;
  var newRemaining;
  if (input.build) {
    if (buildCycles <= 0) return null;
    var tend = Number(input.tend); if (!isFinite(tend) || tend < 0) tend = 1; if (tend > 1) tend = 1;
    var weekly = total * Number(d.capitalShare) / buildCycles * tend;
    newRemaining = Math.max(floor, remaining - weekly);
  } else {
    // Job 6: a renewed program holds renewal money above its floor by design;
    // the true-down is only for a site that opened still holding capital.
    var base = input.renewed ? remaining : Math.min(remaining, floor);
    newRemaining = Math.max(0, base - floor / Number(d.operatingWeeks));
  }
  newRemaining = Math.round(newRemaining * 100) / 100;
  var debit = Math.round((remaining - newRemaining) * 100) / 100;
  if (!(debit > 0)) return null;
  var perWeek = floor / Number(d.operatingWeeks);
  return {
    build: !!input.build, debit: debit, newRemaining: newRemaining,
    exhausted: !input.build && newRemaining <= 0,
    weeksLeft: input.build ? null : (perWeek > 0 ? Math.ceil(newRemaining / perWeek) : null)
  };
}

function getCivicDisburseDials_(ctx) {
  var source = ctx && ctx.config;
  if (!source) throw new Error('civic disbursement: ctx.config required');
  var required = function(key, min, max) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) || value < min || value > max) {
      throw new Error('civic disbursement: invalid or missing World_Config.' + key);
    }
    return value;
  };
  return {
    tranche: required('civicDisburseTranche', 0, 1e12),
    grantCapMonths: required('civicGrantCapMonths', 0, 60),
    grantHeadroomMonths: required('civicGrantHeadroomMonths', 0, 12),
    cooldownCycles: required('civicGrantCooldownCycles', 0, 520)
  };
}

// engine.259 — one program per qualifying row. tranche = min(remaining,
// dial × tend): the money that leaves the fund this Cycle, on and off camera.
// Hoods fold through resolveHoodOrChild_ when the canon set is seeded.
function buildDisbursementSlice_(ctx, pending) {
  var out = { available: true, reason: null, programs: [] };
  var list = pending || [];
  if (!list.length) return out;
  var canFold = typeof resolveHoodOrChild_ === 'function' && ctx && ctx.summary && ctx.summary.canonHoods && ctx.summary.canonHoods.set;
  list.sort(function (a, b) { return a.initiativeId < b.initiativeId ? -1 : a.initiativeId > b.initiativeId ? 1 : 0; });
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var dials = getCivicDisburseDials_(ctx);
    var tend = Number(item.tend);
    if (!isFinite(tend) || tend < 0) tend = 1;
    if (tend > 1) tend = 1;
    var tranche = Math.min(item.remaining, Math.round(dials.tranche * tend * 100) / 100);
    var folded = [], unknown = [];
    var parts = String(item.hoodsStr || '').split(/[,;]+/);
    for (var p = 0; p < parts.length; p++) {
      var raw = parts[p].replace(/^\s+|\s+$/g, '');
      if (!raw) continue;
      var hood = canFold ? resolveHoodOrChild_(ctx, raw) : raw;
      if (!hood) { if (unknown.indexOf(raw) < 0) unknown.push(raw); continue; }
      if (folded.indexOf(hood) < 0) folded.push(hood);
    }
    out.programs.push({ initiativeId: item.initiativeId, name: item.name, domain: item.domain, phase: item.phase, stage: item.stage, tend: tend,
      remaining: item.remaining, tranche: tranche, hoods: folded, unknownHoods: unknown, lastDisburseCycle: item.lastDisburseCycle, sheetRow: item.sheetRow,
      grantCapMonths: dials.grantCapMonths, grantHeadroomMonths: dials.grantHeadroomMonths, cooldownCycles: dials.cooldownCycles,
      paid: 0, grants: 0, debited: 0, newRemaining: item.remaining, status: 'pending' });
  }
  Logger.log('applyInitiativeImplementationEffects_: engine.259 fund disbursement — ' + out.programs.length + ' program(s): ' +
    out.programs.map(function (pr) { return pr.initiativeId + ' ' + pr.domain + ' tranche ' + pr.tranche + ' of ' + pr.remaining; }).join('; '));
  return out;
}

/**
 * Find column index by possible header names (case-insensitive).
 */
// ============================================================================
// engine.262 — the city treasury (builder rulings 2026-09-28)
// ============================================================================
// General fund (Baylight apart — its own tax-increment district), opening at
// World_Config.treasuryOpeningBalance; a weekly budget allocation
// (treasuryWeeklyAllocation) credits it every fire; a voted program is charged its
// BudgetTotal once, and one the treasury can't cover OPENS UNDERFUNDED — it gets what
// is there, the shortfall is on the record; renewals draw the same way. Ledger tab
// City_Treasury (append-only): Cycle · Entry · Amount · Counterparty · BalanceAfter · Note.
// A missing tab leaves the old behaviour untouched (money appears at passage).
var TREASURY_HEADERS_ = ['Cycle', 'Entry', 'Amount', 'Counterparty', 'BalanceAfter', 'Note'];

/** Read the ledger: balance, and which counterparties were ever appropriated. Pure over rows. */
function readTreasuryLedger_(rows) {
  var out = { balance: 0, empty: true, appropriated: {}, revenueCycles: {}, taxLanded: false, lastTaxCycle: 0 };
  if (!rows || rows.length < 2) return out;
  var h = rows[0];
  var iC = h.indexOf('Cycle'), iE = h.indexOf('Entry'), iP = h.indexOf('Counterparty'), iB = h.indexOf('BalanceAfter');
  for (var r = 1; r < rows.length; r++) {
    var e = String(rows[r][iE] || '').trim();
    if (!e) continue;
    out.empty = false;
    var bal = Number(rows[r][iB]);
    if (isFinite(bal)) out.balance = bal;
    var cp = String(rows[r][iP] || '').trim();
    if ((e === 'APPROPRIATION' || e === 'PREFUNDED') && cp) out.appropriated[cp] = true;
    // engine.271: only the allocation's own row marks its Cycle paid — a court or
    // ticket row posted the same Cycle is revenue too and must not stand in for it.
    if (e === 'REVENUE' && (cp === 'WEEKLY-ALLOCATION' || cp === '')) out.revenueCycles[String(rows[r][iC])] = true;
    if (e === 'REVENUE' && cp === 'PROPERTY-TAX') {
      out.taxLanded = true;
      out.lastTaxCycle = Math.max(out.lastTaxCycle, Number(rows[r][iC]) || 0);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// engine.271 — CITY REVENUE (builder rulings 2026-09-29, 2026-10-02)
// The treasury takes money in from three places: the court (each hood's cleared
// charges, plus what named citizens are fined), tickets, and on tax day the
// property and business tax. A fine is a share of salary by level, capped below
// the grave level. What a tracked citizen pays comes out of NetWorth by the
// money loop's shock rule: savings cover it, or savings go to zero and debt
// rises a level. No rng anywhere here — arithmetic on values already on the row.
// Spec: docs/plans/2026-09-21-care-and-justice-system.md §engine.271.
// ════════════════════════════════════════════════════════════════════════════
var ENGINE271_KEYS = ['fineRateTicket', 'fineCapTicket', 'fineRateMinor', 'fineCapMinor', 'fineRateSerious',
  'fineCapSerious', 'fineRateGrave', 'propertyTaxRate', 'businessTaxRate', 'taxDayCyclePosition', 'taxThinHoodFloor'];

// World_Config read — a missing key throws (ADR-0015: ensureEngine271Config_ self-arms at open).
function cityRevenueConfig_(ctx) {
  var out = {};
  for (var i = 0; i < ENGINE271_KEYS.length; i++) {
    var k = ENGINE271_KEYS[i];
    var v = ctx && ctx.config ? Number(ctx.config[k]) : NaN;
    if (isNaN(v)) throw new Error('engine.271: World_Config ' + k + ' missing — ensureEngine271Config_ did not run (ADR-0015)');
    out[k] = v;
  }
  return out;
}

// A fine in dollars: yearly income x the level's rate, capped. Levels: ticket,
// minor, serious, grave (the Judicial_Ledger ChargeGravity values; grave has no cap).
function cityFine_(income, level, cfg) {
  var inc = Number(income) || 0;
  if (!(inc > 0)) return 0;
  var rate, cap;
  if (level === 'ticket') { rate = cfg.fineRateTicket; cap = cfg.fineCapTicket; }
  else if (level === 'minor') { rate = cfg.fineRateMinor; cap = cfg.fineCapMinor; }
  else if (level === 'serious') { rate = cfg.fineRateSerious; cap = cfg.fineCapSerious; }
  else if (level === 'grave') { rate = cfg.fineRateGrave; cap = Infinity; }
  else throw new Error('engine.271: unknown fine level "' + level + '"');
  return Math.round(Math.min(inc * rate, cap));
}

// Take `amount` out of a ledger row's NetWorth. Savings cover it, or they go to
// zero and DebtLevel rises one (never past 6) — the money loop's shock rule, the
// one the custody settlement uses. A blank NetWorth is nothing saved and stays
// blank; a value that cannot be read is never overwritten (returns null, nothing
// charged). Returns { paid, borrowed }.
function cityChargeNetWorth_(row, iNW, iDebt, amount) {
  var amt = Math.round(Number(amount) || 0);
  if (!(amt > 0) || iNW < 0) return null;
  var raw = row[iNW];
  var blank = raw === '' || raw === null || raw === undefined;
  var nw = blank ? 0 : Number(String(raw).replace(/[$,\s]/g, ''));
  if (!isFinite(nw)) return null;
  if (nw >= amt) { row[iNW] = nw - amt; return { paid: amt, borrowed: false }; }
  if (!blank) row[iNW] = 0;
  if (iDebt >= 0) {
    var debt = Number(row[iDebt]) || 0;
    if (debt < 6) row[iDebt] = debt + 1;
  }
  return { paid: amt, borrowed: true };
}

// One REVENUE row on City_Treasury, this Cycle, from any phase after the treasury
// opened (Phase2-InitiativeEffects). BalanceAfter continues from S.treasury.balance
// and advances it; the intent carries the treasury's own priority, so Phase 10
// appends it after the Phase-2 rows in queue order. No treasury this fire (no tab,
// or its phase failed) → nothing is posted and null comes back: the citizen's side
// has already happened and is not undone.
function postTreasuryRevenue_(ctx, counterparty, amount, note) {
  var amt = Math.round(Number(amount) || 0);
  if (!(amt > 0)) return null;
  var S = ctx.summary || {};
  var t = S.treasury;
  if (!t || !isFinite(Number(t.balance))) return null;
  t.balance = Math.round(Number(t.balance) + amt);
  t.entries = (Number(t.entries) || 0) + 1;
  var row = [t.cycle, 'REVENUE', amt, String(counterparty), t.balance, note || ''];
  queueAppendIntent_(ctx, 'City_Treasury', row, 'engine.271 treasury ' + counterparty, 'civic', 5);
  return row;
}

// The city multiplier for each hood: its scaled population over its tracked
// residents (S.careJusticeDemand.hoods — ratePopulation, trackedResidents). A hood
// with fewer tracked residents than `floor` shares one pooled multiplier with the
// other thin hoods (their populations over their tracked residents, together), so
// a single household cannot swing the city's number. Returns { hood: multiplier };
// a hood absent from the demand table has none (its collections stay unscaled).
function cityHoodMultipliers_(demand, floor) {
  var out = {};
  if (!demand || !demand.hoods) return out;
  var thin = [], thinPop = 0, thinTracked = 0;
  for (var h in demand.hoods) {
    if (!demand.hoods.hasOwnProperty(h)) continue;
    var pop = Number(demand.hoods[h].ratePopulation) || 0;
    var tr = Number(demand.hoods[h].trackedResidents) || 0;
    if (tr < floor) { thin.push(h); thinPop += pop; thinTracked += tr; }
    else if (tr > 0) out[h] = pop / tr;
  }
  var pooled = thinTracked > 0 ? thinPop / thinTracked : 0;
  for (var i = 0; i < thin.length; i++) if (pooled > 0) out[thin[i]] = pooled;
  return out;
}

/** Draw up to `amount` from `balance`. Pure. */
function treasuryDraw_(balance, amount) {
  var want = Math.max(0, Number(amount) || 0);
  var have = Math.max(0, Number(balance) || 0);
  var paid = Math.min(want, have);
  return { paid: paid, short: want - paid, balance: have - paid };
}

function treasuryMoney_(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return '$' + (Math.round(n / 1e8) / 10) + 'B';
  if (n >= 1e6) return '$' + (Math.round(n / 1e5) / 10) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}

/** A program the council funded: passed + signed, or passed over a veto. */
function treasuryIsVotedProgram_(status, mayoral) {
  var st = String(status || '').trim().toLowerCase();
  var m = String(mayoral || '').trim().toLowerCase();
  return st === 'override-passed' || (st === 'passed' && m === 'signed');
}

function findImplCol_(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = (headers[i] || '').toString().toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (h === possibleNames[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * civic.38 Task 4 (plan ruling 7) — last Cycle's phase for one initiative, as the
 * transition detector should see it. An engine-written move wins: for that row the
 * carried phase map already shows the NEW phase. Pure.
 */
function initiativePrevPhaseFor_(prevPhases, enginePhaseMoves, initKey) {
  if (enginePhaseMoves && Object.prototype.hasOwnProperty.call(enginePhaseMoves, initKey) && enginePhaseMoves[initKey]) {
    return String(enginePhaseMoves[initKey]);
  }
  return prevPhases ? (prevPhases[initKey] || null) : null;
}
