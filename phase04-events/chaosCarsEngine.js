/**
 * chaosCarsEngine.js — Phase 4 stochastic event-injection engine (engine.11).
 *
 * [engine/sheet] chaos-cars plan docs/plans/2026-05-07-chaos-cars-engine.md (T3.1-T3.12,
 * T5.1), built to the §S265 corrected spec. Fires 3-15 typed-municipal-vehicle events per
 * cycle; each = vehicle × scope × dice-rolled outcome × magnitude, written to scope-
 * appropriate surfaces. The chaos_cars ledger row is source-of-truth (queued first);
 * scope writebacks are derived. Asymmetric decay (utilities/chaosCarsDecay.js) compounds
 * the city toward intrigue. Tier-1 citizen hits flag the Phase-5 cascade.
 *
 * Apps Script global-function style (clasped). Reads config/decay/validators from the
 * clasped utilities/ globals (chaosCarsConfig.js, chaosCarsDecay.js, citizenDialMap.js).
 * NEVER Math.random — ctx.rng only (engine.md). Writes via write-intents only, except the
 * ctx.ledger col-O mutation (the established citizen-affect seam, committed at Phase 10).
 *
 * Per-scope writeback (§S265):
 *   citizen      → col-O mutate (DIAL_MAP tag) + LifeHistory_Log append + ctx.ledger.dirty
 *   business     → ctx.summary.chaosBusinessFold { BIZ_ID: signed event } → applyBusinessDynamics_
 *                  reads it as the chaos-at-business Growth_Rate term (engine.193 cut 3b; no cells)
 *   port (ship)  → runChaosShip_: one episodic roll a Cycle → ctx.summary.chaosShip, carried in
 *                  previousCycleState; applyBusinessDynamics_ applies/releases the offset
 *   neighborhood → accumulate ctx.summary.chaosNeighborhoodFold residual → Phase-10 writer fold
 *                  consumes + decays it (NO column write — that is clobber-certain; see T1.5).
 */

var CHAOS_MIN_EVENTS = 3;
var CHAOS_MAX_EVENTS = 15;

// V2-5 (S326) — the consequence class: citizen-scope outcomes that enter the
// story surface via recordRipple_ (Ripple_Ledger + S.rippleEvents → contract
// seeds). Tickets/warnings/texture stay silent — they already ride the
// citizen-event stream and are not stories on their own.
var CHAOS_RIPPLE_OUTCOMES = {
  medical_emergency: true,
  workplace_accident: true,
  arrested: true,
  substance_intervention: true
};

// engine.254 Task 5 — the five health states (care outranks custody, R4) and the
// charge gravity an arrest outcome's dial tag carries (R3 held length).
var CHAOS_HEALTH_STATES = ['critical', 'hospitalized', 'serious-condition', 'injured', 'recovering'];
var CHAOS_CHARGE_GRAVITY = {
  'Transgression-Petty': 'minor',
  'Transgression-Serious': 'serious',
  'Transgression-Grave': 'grave'
};
function chaosChargeGravity_(outcome) {
  var g = CHAOS_CHARGE_GRAVITY[outcome.lifeHistoryTag];
  if (!g) {
    throw new Error('chaos_cars: arrest outcome "' + outcome.outcome + '" carries tag "' +
      outcome.lifeHistoryTag + '" with no charge gravity');
  }
  return g;
}

// ── primitives ──────────────────────────────────────────────────────────────

// 8-char id from the deterministic rng (NEVER Math.random / Utilities.getUuid — both
// non-deterministic, would break run reproducibility).
function chaosEventId_(rng) {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(rng() * chars.length));
  return s;
}

function pickFromArrayChaos_(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Weighted sample. items = array; weightFn(item) → number. Returns the chosen item.
function weightedPickChaos_(rng, items, weightFn) {
  var total = 0;
  for (var i = 0; i < items.length; i++) total += Math.max(0, Number(weightFn(items[i])) || 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  var roll = rng() * total;
  var acc = 0;
  for (var j = 0; j < items.length; j++) {
    acc += Math.max(0, Number(weightFn(items[j])) || 0);
    if (roll < acc) return items[j];
  }
  return items[items.length - 1];
}

// T3.1 — variable event count in [MIN,MAX] inclusive.
function pickEventCount_(rng) {
  return CHAOS_MIN_EVENTS + Math.floor(rng() * (CHAOS_MAX_EVENTS - CHAOS_MIN_EVENTS + 1));
}

// T3.2 — vehicle weighted by baseFrequencyWeight. Episodic vehicles (the ship) are never
// drawn here — runChaosShip_ rolls them once a Cycle.
function pickVehicle_(rng, configs) {
  return weightedPickChaos_(rng, configs, function (v) { return v.episodic ? 0 : v.baseFrequencyWeight; });
}

// T3.6 — outcome weighted by outcome.weight; re-validate no-death at roll time.
// Scope-aware: a CITIZEN hit may only roll outcomes that carry a lifeHistoryTag (a real
// DIAL_MAP tag). Untagged outcomes are neighborhood/biz texture (e.g. street_sweeper's
// street_beautification) and have no citizen meaning — rolling one onto a citizen would
// have no dial to move (writeCitizenEvent_ requires a tag). Non-citizen scopes use the
// full pool (the tag is simply unused). Returns null if a citizen scope has no tagged
// outcome (caller skips the event with a friction note).
// engine.67 step 8 (S325): outcome-level life-state gates — what can happen to
// a citizen depends on who they are (impossible-bar ruling). A student draws
// no workplace accident; a child is never arrested or ticketed. Unlisted
// outcomes stay universal (being NEAR chaos is possible at any age).
var CHAOS_OUTCOME_GATES = {
  workplace_accident:  function (ls) { return ls.working === 'working'; },
  arrested:            function (ls) { return !ls.isMinor; },
  ticket:              function (ls) { return ls.age === null || ls.age >= 16; },
  pulled_over_warning: function (ls) { return ls.age === null || ls.age >= 16; },
  // S325 acceptance catch: C102-104 fresh-bench run put a substance
  // intervention on a 4-year-old. OARI treats adults; de-escalation teen+.
  substance_intervention: function (ls) { return !ls.isMinor; },
  deescalated:            function (ls) { return ls.age === null || ls.age >= 13; }
};

function rollOutcome_(rng, vehicle, scope, target) {
  var pool = chaosOutcomePool_(vehicle, scope); // engine.193 cut 3b: an outcome's own scopes[]
  if (scope === 'citizen') {
    var scoped = pool;
    pool = [];
    var tls = target && target.lifeState;
    for (var i = 0; i < scoped.length; i++) {
      var oc = scoped[i];
      if (!oc.lifeHistoryTag) continue;
      if (tls && CHAOS_OUTCOME_GATES[oc.outcome] && !CHAOS_OUTCOME_GATES[oc.outcome](tls)) continue; // engine.67 step 8
      pool.push(oc);
    }
    if (!pool.length) return null;
  }
  var outcome = weightedPickChaos_(rng, pool, function (o) { return o.weight; });
  validateOutcome(outcome.outcome); // throws on any forbidden token (defence in depth)
  return outcome;
}

// T3.7 — sample a signed magnitude within range. Float-aware (round2 — neighborhood cols
// are fractional 0.02-0.15; business/event/retail are larger). Sign by direction.
function sampleMagnitude_(rng, impact) {
  var lo = impact.magnitudeRange[0];
  var hi = impact.magnitudeRange[1];
  var v = lo + rng() * (hi - lo);
  v = Math.round(v * 100) / 100;
  return impact.direction === 'down' ? -v : v;
}

// Filter a vehicle's metricImpacts to a chosen scope + the rolled outcome's onOutcome gate.
function impactsForScope_(vehicle, scope, outcomeName) {
  var out = [];
  var impacts = vehicle.metricImpacts || [];
  for (var i = 0; i < impacts.length; i++) {
    var m = impacts[i];
    if (m.scope !== scope) continue;
    if (m.onOutcome) {
      var ok = (typeof m.onOutcome === 'string') ? (m.onOutcome === outcomeName)
        : (m.onOutcome.indexOf(outcomeName) >= 0);
      if (!ok) continue;
    }
    out.push(m);
  }
  return out;
}

// ── target pickers (T3.3 / T3.4 / T3.5) ──────────────────────────────────────

// T3.3 — uniform-random citizen from the shared ledger (no tier protection, §S205).
// engine.67 step 2 (S325): eligibility filter — chaos can only hit citizens who
// are actually IN the city. Deceased/inactive/traded/pending are unreachable
// (the S325 conditioning matrix caught deceased rows as pickable). Being hit by
// street chaos is possible at any age, so no age gate here — status only.
// Filter consumes no rng; the pick stays one draw over the eligible set.
function pickCitizenTarget_(rng, ctx) {
  if (!ctx.ledger || !ctx.ledger.rows || ctx.ledger.rows.length === 0) return null;
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iPop = header.indexOf('POPID');
  var iTier = header.indexOf('Tier');
  var iNb = header.indexOf('Neighborhood');
  var iStatus = header.indexOf('Status');
  var eligible = [];
  for (var ei = 0; ei < rows.length; ei++) {
    if (iStatus >= 0) {
      var st = String(rows[ei][iStatus] || '').trim().toLowerCase();
      if (st === 'deceased' || st === 'inactive' || st === 'traded' || st === 'pending') continue;
    }
    eligible.push(ei);
  }
  if (!eligible.length) return null;
  var r = eligible[Math.floor(rng() * eligible.length)];
  return chaosCitizenTargetAt_(ctx, r);
}

function chaosCitizenTargetAt_(ctx, r) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iPop = header.indexOf('POPID');
  var iTier = header.indexOf('Tier');
  var iNb = header.indexOf('Neighborhood');
  var iStatus = header.indexOf('Status');
  var row = rows[r];
  // engine.67 step 8: carry the target's life-state so the outcome roll can
  // gate what can happen TO them (deriveLifeState_ — citizenContextBuilder).
  var tgtLifeState = null;
  if (typeof deriveLifeState_ === 'function') {
    var iBY8 = header.indexOf('BirthYear'), iRT8 = header.indexOf('RoleType');
    tgtLifeState = deriveLifeState_({
      birthYear: iBY8 >= 0 ? row[iBY8] : 0,
      simYear: simYearOf_(ctx), // engine.164
      status: iStatus >= 0 ? row[iStatus] : '',
      occupation: iRT8 >= 0 ? row[iRT8] : '',
      roleType: iRT8 >= 0 ? row[iRT8] : ''
    });
  }
  var tierRaw = iTier >= 0 ? row[iTier] : null;
  var tierNum = parseInt(String(tierRaw).replace(/[^0-9]/g, ''), 10);
  return {
    rowIndex: r,
    popId: iPop >= 0 ? row[iPop] : '',
    tier: isNaN(tierNum) ? null : tierNum,
    neighborhood: iNb >= 0 ? (row[iNb] || '') : '',
    lifeState: tgtLifeState // engine.67 step 8
  };
}

// Business_Ledger cached read (direct read OK — engine.md allows reads; writes go via intent).
function loadBusinessRows_(ctx) {
  if (ctx._chaosBizCache) return ctx._chaosBizCache;
  var data = null;
  if (ctx.cache && typeof ctx.cache.getData === 'function') {
    // getData returns the cache wrapper {values, header, sheet, exists} — unwrap to the
    // 2D values array. (S271 fix: was treating the wrapper as an array → data.slice threw
    // live, since tests run without ctx.cache and silently took the direct-read fallback.)
    var cd = ctx.cache.getData('Business_Ledger');
    data = cd && cd.values ? cd.values : null;
  }
  if (!Array.isArray(data)) {
    var sh = ctx.ss.getSheetByName('Business_Ledger');
    data = sh ? sh.getDataRange().getValues() : [];
  }
  var header = data.length ? data[0] : [];
  // Trimmed header lookup — col G is stored '  Annual_Revenue  ' (verified live S265);
  // a literal indexOf returns -1 and silently drops the write.
  function tcol(name) {
    for (var i = 0; i < header.length; i++) if (String(header[i]).trim() === name) return i;
    return -1;
  }
  var cache = {
    header: header,
    rows: data.slice(1),
    iId: tcol('BIZ_ID'),
    iSector: tcol('Sector'),
    iNb: tcol('Neighborhood'),
    iRevenue: tcol('Annual_Revenue'),
    iEmployees: tcol('Employee_Count')
  };
  ctx._chaosBizCache = cache;
  return cache;
}

// T3.4 — uniform-random business. Returns the 1-based sheet row for cell intents.
function pickBusinessTarget_(rng, ctx) {
  var biz = loadBusinessRows_(ctx);
  if (!biz.rows.length) return null;
  var r = Math.floor(rng() * biz.rows.length);
  var row = biz.rows[r];
  return {
    rowIndex: r,
    sheetRow: r + 2, // past header, 1-based
    bizId: biz.iId >= 0 ? row[biz.iId] : '',
    sector: biz.iSector >= 0 ? (row[biz.iSector] || '') : '',
    neighborhood: biz.iNb >= 0 ? (row[biz.iNb] || '') : ''
  };
}

// T3.5 — uniform-random neighborhood from the live Neighborhood_Map.
function loadNeighborhoodNames_(ctx) {
  if (ctx._chaosNbCache) return ctx._chaosNbCache;
  var data = null;
  if (ctx.cache && typeof ctx.cache.getData === 'function') {
    var cd = ctx.cache.getData('Neighborhood_Map');  // unwrap cache wrapper {values,...} — S271 fix (same class as loadBusinessRows_)
    data = cd && cd.values ? cd.values : null;
  }
  if (!Array.isArray(data)) {
    var sh = ctx.ss.getSheetByName('Neighborhood_Map');
    data = sh ? sh.getDataRange().getValues() : [];
  }
  var header = data.length ? data[0] : [];
  var iName = header.indexOf('Neighborhood');
  var names = [];
  for (var i = 1; i < data.length; i++) {
    var n = iName >= 0 ? data[i][iName] : null;
    if (n) names.push(n);
  }
  ctx._chaosNbCache = names;
  return names;
}

function pickNeighborhoodTarget_(rng, ctx) {
  var names = loadNeighborhoodNames_(ctx);
  if (!names.length) return null;
  return { neighborhood: pickFromArrayChaos_(rng, names) };
}

// Task 7: place demand-vehicle events by the city's hood numbers. A citizen
// scope event still names one tracked resident when a positive weight exists.
function pickCareJusticeTarget_(rng, ctx, scope, vehicle) {
  var demand = ctx.summary && ctx.summary.careJusticeDemand;
  if (!demand || !demand.hoods) throw new Error('chaos_cars: S.careJusticeDemand missing');
  var hoods = Object.keys(demand.hoods);
  var indicesByHood = {};
  if (scope === 'citizen') {
    var ledger = ctx.ledger;
    if (!ledger || !ledger.headers || !ledger.rows) throw new Error('chaos_cars: ctx.ledger missing');
    var iHood = ledger.headers.indexOf('Neighborhood');
    var iStatus = ledger.headers.indexOf('Status');
    if (iHood < 0) throw new Error('chaos_cars: Simulation_Ledger.Neighborhood missing');
    for (var i = 0; i < ledger.rows.length; i++) {
      var row = ledger.rows[i];
      if (iStatus >= 0) {
        var status = String(row[iStatus] || '').trim().toLowerCase();
        if (status === 'deceased' || status === 'inactive' || status === 'traded' || status === 'pending') continue;
      }
      var rowHood = String(row[iHood] || '').trim();
      if (!indicesByHood[rowHood]) indicesByHood[rowHood] = [];
      indicesByHood[rowHood].push(i);
    }
  }
  var weightByHood = {};
  var total = 0;
  for (var h = 0; h < hoods.length; h++) {
    var hood = hoods[h];
    var record = demand.hoods[hood];
    var base = vehicle.name === 'ambulance' ? record.sick : record.charges;
    if (vehicle.name === 'oari_van' && record.oariDeployed !== true) base = 0;
    var weight = scope === 'citizen' ? base * record.trackedShare : base;
    if (!isFinite(weight) || weight < 0) {
      throw new Error('chaos_cars: invalid careJusticeDemand weight for ' + hood);
    }
    weightByHood[hood] = weight;
    total += weight;
  }
  // weightedPickChaos_ deliberately has a uniform zero-weight fallback; demand
  // placement must not use it when the city has no eligible weight.
  if (!(total > 0)) return null;
  var chosen = weightedPickChaos_(rng, hoods, function(name) { return weightByHood[name]; });
  if (scope === 'neighborhood') return { neighborhood: chosen };
  var candidates = indicesByHood[chosen] || [];
  if (!candidates.length) throw new Error('chaos_cars: careJusticeDemand trackedShare mismatch for ' + chosen);
  return chaosCitizenTargetAt_(ctx, pickFromArrayChaos_(rng, candidates));
}

// ── scope writebacks (T3.8 / T3.9 / T3.10) ───────────────────────────────────

// T3.8 — citizen: mutate col O with the DIAL_MAP tag + append LifeHistory_Log + dirty flag.
// Mirrors generateCitizensEvents.js:1705-1709 + :1739.
function writeCitizenEvent_(ctx, target, vehicle, outcome, cycle, text) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iLife = header.indexOf('LifeHistory');
  var iLastU = header.indexOf('LastUpdated');
  var iFirst = header.indexOf('First');
  var iLast = header.indexOf('Last');
  var iPop = header.indexOf('POPID');
  var iNb = header.indexOf('Neighborhood');
  var iDialState = header.indexOf('DialState');
  var row = rows[target.rowIndex];

  // The bracket tag in col O MUST be a real DIAL_MAP tag, else compressLifeHistory folds it
  // to DEFAULT_AMBIENT (+composure) — the inverse of intended adversity (§S265). Every
  // citizen-scope outcome carries lifeHistoryTag; fail loud if a config slips through.
  var dialTag = outcome.lifeHistoryTag;
  if (!dialTag) {
    throw new Error('chaos_cars: citizen-scope outcome "' + outcome.outcome + '" (vehicle ' +
      vehicle.name + ') has no lifeHistoryTag — would fall through DIAL_MAP to +composure.');
  }

  var stamp = inWorldStamp_(ctx);
  var line = stamp + ' — [' + dialTag + '] ' + text;
  var existing = (iLife >= 0 && row[iLife]) ? row[iLife].toString() : '';
  if (iLife >= 0) row[iLife] = existing ? existing + '\n' + line : line;
  if (iLastU >= 0) row[iLastU] = inWorldStamp_(ctx);  // S271 in-world, not wall-clock
  rows[target.rowIndex] = row;
  ctx.ledger.dirty = true;

  // engine.42 chaos-trauma (S275): this hit feeds the citizen's persisted, cross-cycle
  // chaos accumulator carried on DialState. accrueChaos_ bumps the count (severity from
  // outcome.severity, type = vehicle); applyChaosReaction_ applies a ONE-TIME labeled break
  // (wary -> traumatized) to base when repetition crosses the threshold — the second tier on
  // top of the [dialTag] fold above. DialState (de)serializes via the same clasped globals
  // compress (Phase 9) uses, so the two cycle-path DialState writers compose without clobber
  // (compress preserves chaosExposure + lazy-decays it). Cross-cycle persistence is mandatory:
  // ctx.summary folds reset each cycle, so the threshold could never accumulate there.
  var chaosReactionTag = '';
  if (iDialState >= 0) {
    var dc = deserialize_(parseDialState_(row[iDialState] || ''));
    accrueChaos_(dc, outcome.severity, vehicle.name, cycle);
    var reaction = applyChaosReaction_(dc);
    if (reaction) chaosReactionTag = '|' + reaction.tags[0];  // chaos:wary | chaos:trauma
    row[iDialState] = serializeDialState_(dc);
    rows[target.rowIndex] = row;
  }

  // engine.67 step 8 (S325, Mike doctrine: chaos vehicles are crisis IGNITERS —
  // "each has a generator to attach to"). High-severity medical outcomes enter
  // the REAL health lifecycle: Status flips, and generationalEventsEngine's
  // health transitions, runCareerEngine's income hit, and runHouseholdEngine's
  // hospital-strain pool all take over next phases — the crisis changes the
  // citizen's running life-state instead of just being remembered. Guard:
  // only active/recovering/blank transition (a retiree keeps 'retired' —
  // overwriting it would resurrect their career at discharge; they keep the
  // texture line only). Arrest + OARI interventions surface as storyHooks.
  var iStatusW = ctx.ledger.headers.indexOf('Status');
  var iStatusStartW = ctx.ledger.headers.indexOf('StatusStartCycle');
  var iHealthCauseW = ctx.ledger.headers.indexOf('HealthCause');
  var curStatusW = iStatusW >= 0 ? String(row[iStatusW] || '').trim().toLowerCase() : '';
  var newStatusW = '';
  if (vehicle.name === 'ambulance' && outcome.outcome === 'medical_emergency') newStatusW = 'critical';
  else if (vehicle.name === 'ambulance' && outcome.outcome === 'workplace_accident') newStatusW = 'hospitalized';
  var S8 = ctx.summary || (ctx.summary = {});
  if (!S8.storyHooks) S8.storyHooks = [];
  var hookName8 = ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).toString().trim();
  var hookHood8 = iNb >= 0 ? (row[iNb] || '') : (target.neighborhood || '');
  var hospitalReceipt = null;
  if (newStatusW && iStatusW >= 0 && (curStatusW === '' || curStatusW === 'active' || curStatusW === 'recovering')) {
    row[iStatusW] = newStatusW;
    if (iStatusStartW >= 0) row[iStatusStartW] = cycle;
    // S325 sweep catch: HealthCause feeds citizen-facing death prose verbatim
    // ("complications from <cause>") and a non-empty value excludes the citizen
    // from the Media-Room cause queue — so write HUMAN prose, not the machine
    // tag. Provenance stays in the LifeHistory line + chaos_cars source row.
    if (iHealthCauseW >= 0 && !row[iHealthCauseW]) {
      row[iHealthCauseW] = (outcome.outcome === 'workplace_accident') ? 'a workplace accident' : 'a sudden medical emergency';
    }
    rows[target.rowIndex] = row;
    var isIntake = curStatusW !== 'recovering';
    hospitalReceipt = {
      popId: iPop >= 0 ? row[iPop] : target.popId,
      name: hookName8, neighborhood: hookHood8,
      cause: iHealthCauseW >= 0 ? (row[iHealthCauseW] || '') : '',
      from: curStatusW || 'active', to: newStatusW, cycle: cycle,
      kind: isIntake ? 'intake' : 'transition',
      intakeType: isIntake ? (outcome.outcome === 'workplace_accident' ? 'injury' : 'illness') : '',
      sourceSystem: isIntake ? 'ambulance' : '', sourceEventId: ''
    };
    S8.storyHooks.push({
      hookType: 'CITIZEN_HOSPITALIZED', severity: 6, priority: 5,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'HEALTH', text: text
    });
  }
  var judicialReceipt = null;
  if (outcome.outcome === 'arrested') {
    S8.storyHooks.push({
      hookType: 'CITIZEN_ARRESTED', severity: 6, priority: 5,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'SAFETY', text: text
    });
    // engine.254 Task 5: an arrest is a typed judicial receipt. Not for a citizen
    // in a health state — PriorStatus is what release restores (R4) and a health
    // state is not a restorable life-state; that hit stays hook + LifeHistory.
    // The caller stamps sourceEventId once the payload eventId is drawn.
    if (CHAOS_HEALTH_STATES.indexOf(curStatusW) < 0) {
      judicialReceipt = {
        system: 'judicial', kind: 'intake', intakeType: 'arrest', entryType: 'arrest',
        sourceSystem: 'patrol', sourceEventId: '',
        popId: iPop >= 0 ? row[iPop] : target.popId,
        name: hookName8, neighborhood: hookHood8, cycle: cycle,
        chargeCause: text,
        chargeGravity: chaosChargeGravity_(outcome),
        priorStatus: iStatusW >= 0 ? String(row[iStatusW] || '').trim() : ''
      };
    }
  }
  if (vehicle.name === 'oari_van' && (outcome.outcome === 'deescalated' || outcome.outcome === 'substance_intervention')) {
    S8.storyHooks.push({
      hookType: 'OARI_INTERVENTION', severity: 5, priority: 4,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'CIVIC', text: text
    });
  }

  // LifeHistory_Log archive row — live 7-col schema. EventTag = "{DialTag}|chaos_cars|{vehicle}"
  // (+ chaos:wary/chaos:trauma when this hit triggered a fresh break — legible provenance).
  // (PrimaryTag is the real DIAL_MAP tag; chaos_cars + vehicle are provenance.)
  var name = ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).toString().trim();
  var eventTag = dialTag + '|chaos_cars|' + vehicle.name + chaosReactionTag;
  queueAppendIntent_(ctx, 'LifeHistory_Log',
    [inWorldStamp_(ctx), (iPop >= 0 ? row[iPop] : target.popId), name, eventTag, text,
      (iNb >= 0 ? (row[iNb] || '') : target.neighborhood), cycle],
    'chaos_cars citizen event', 'chaos');
  return hospitalReceipt || judicialReceipt;
}

// T3.9 — business: engine.193 cut 3b. A hit is a signed Growth_Rate EVENT on the business
// (outcome.bizEvent, units of bizEventShockScale), summed per BIZ_ID for the Cycle and read by
// applyBusinessDynamics_ (Phase 5) as its chaos-at-business term. No cells: Annual_Revenue is
// the dynamics column (the old revenue cells overwrote its range — 0848f7d3), and a closure
// sheds jobs through the Task-6 distress streak, not a direct Employee_Count cut.
function accumulateBusinessEvent_(ctx, bizId, bizEvent) {
  if (!ctx.summary.chaosBusinessFold) ctx.summary.chaosBusinessFold = {};
  var id = String(bizId || '').trim();
  if (!id) return;
  var fold = ctx.summary.chaosBusinessFold;
  fold[id] = Math.round(((fold[id] || 0) + (Number(bizEvent) || 0)) * 100) / 100;
}

// T3.10 — neighborhood: accumulate the swing into the off-sheet residual. The Phase-10
// writer (v3NeighborhoodWriter saveV3NeighborhoodMap_) consumes ctx.summary.chaosNeighborhoodFold
// additively alongside S.neighborhoodPulse and decays it in place (residual can't be read back
// from the rebuilt sheet). NO column write here — that is reverted by executePersistIntents_
// (T1.5). Targets the 4 citizen-movable cols only; NoiseIndex dropped (zero readers).
function accumulateNeighborhoodFold_(ctx, hood, impacts, magnitudesByColumn) {
  if (!hood) return;
  if (!ctx.summary.chaosNeighborhoodFold) ctx.summary.chaosNeighborhoodFold = {};
  var fold = ctx.summary.chaosNeighborhoodFold;
  if (!fold[hood]) fold[hood] = {};
  for (var i = 0; i < impacts.length; i++) {
    var col = impacts[i].column;
    fold[hood][col] = (fold[hood][col] || 0) + (magnitudesByColumn[col] || 0);
  }
}

// ── neighborhood residual persistence (T3.10 cross-cycle, S265 verify-fix) ────
// ctx.summary is rebuilt every cycle, and Neighborhood_Map is replaced wholesale by the
// Phase-10 writer, so the residual can't be read back from the sheet (§S265). It persists
// in PropertiesService (the established T8 PREV_EVENING_JSON pattern), keyed per hood per
// column — which also fixes the multi-impact secondary-loss (Chaos_Cars stores only the
// primary metric, but the live residual here holds ALL columns). Run AFTER the generator
// (Phase 4) and BEFORE the Phase-10 writer: load prior → decay one step → add this cycle's
// fresh swings → hand the total to the writer (ctx.summary.chaosNeighborhoodFold) → persist.
// CAVEAT (same as business decay): persistence makes this non-idempotent on a re-run.

var CHAOS_NBHD_STORE_KEY = 'CHAOS_NBHD_FOLD_JSON';

function readChaosNeighborhoodStore_(ctx) {
  try {
    if (typeof PropertiesService === 'undefined') return {};
    var json;
    // engine.122 layer-2 fallback + engine.119 T3 ghost guard: go through the
    // loader whenever it is present (GAS); the unit harness reads the prop direct.
    if (typeof loadCarryForwardBlob_ === 'function' && ctx && ctx.ss) {
      var cyc = (typeof carryForwardCycleId_ === 'function') ? carryForwardCycleId_(ctx) : 0;
      json = loadCarryForwardBlob_(ctx, CHAOS_NBHD_STORE_KEY, cyc);
    } else {
      json = PropertiesService.getScriptProperties().getProperty(CHAOS_NBHD_STORE_KEY);
    }
    return json ? JSON.parse(json) : {};
  } catch (e) { return {}; }
}

function writeChaosNeighborhoodStore_(fold, ctx) {
  try {
    if (typeof PropertiesService === 'undefined') return;
    var json = JSON.stringify(fold || {});
    var cycle = (ctx && ctx.summary && ctx.summary.cycleId) || (ctx && ctx.config && ctx.config.cycleCount) || '';
    // engine.122 layer 2 + engine.119 T3: the one writer stamps the cycle and mirrors
    // to the sheet ring (Phase-10 location — ChaosNbhdResolve); unit harness: prop only.
    if (typeof saveCarryForwardBlob_ === 'function' && ctx && ctx.ss) {
      saveCarryForwardBlob_(ctx, CHAOS_NBHD_STORE_KEY, json, cycle);
    } else {
      PropertiesService.getScriptProperties().setProperty(CHAOS_NBHD_STORE_KEY, json);
    }
  } catch (e) { /* best-effort persistence; a write failure just resets the residual */ }
}

function resolveChaosNeighborhoodFold_(ctx) {
  function r2(n) { return Math.round(n * 100) / 100; }
  var prior = readChaosNeighborhoodStore_(ctx);
  var fresh = (ctx.summary && ctx.summary.chaosNeighborhoodFold) || {};
  var merged = {};

  // decay last cycle's residual one step (per-column asymmetric, snap-to-zero)
  for (var h in prior) {
    if (!prior.hasOwnProperty(h)) continue;
    for (var c in prior[h]) {
      if (!prior[h].hasOwnProperty(c)) continue;
      var decayed = chaosDecayResidualOneCycle_(prior[h][c], c);
      if (decayed !== 0) { if (!merged[h]) merged[h] = {}; merged[h][c] = decayed; }
    }
  }
  // add this cycle's fresh swings (full magnitude — not yet decayed)
  for (var h2 in fresh) {
    if (!fresh.hasOwnProperty(h2)) continue;
    for (var c2 in fresh[h2]) {
      if (!fresh[h2].hasOwnProperty(c2)) continue;
      if (!merged[h2]) merged[h2] = {};
      var v = r2((merged[h2][c2] || 0) + fresh[h2][c2]);
      if (v === 0) delete merged[h2][c2]; else merged[h2][c2] = v;
    }
  }
  // prune empty hoods
  for (var h3 in merged) {
    if (merged.hasOwnProperty(h3)) {
      var any = false;
      for (var k in merged[h3]) if (merged[h3].hasOwnProperty(k)) { any = true; break; }
      if (!any) delete merged[h3];
    }
  }

  ctx.summary.chaosNeighborhoodFold = merged; // total residual the Phase-10 writer folds
  writeChaosNeighborhoodStore_(merged, ctx);  // persist for next cycle (prop + sheet mirror)
  return merged;
}

// ── orchestrator (T3.12 + T5.1) ──────────────────────────────────────────────

function pickTargetByScope_(rng, ctx, scope, vehicle) {
  if (vehicle && (vehicle.name === 'cop_car' || vehicle.name === 'ambulance' || vehicle.name === 'oari_van') &&
      (scope === 'citizen' || scope === 'neighborhood')) {
    return pickCareJusticeTarget_(rng, ctx, scope, vehicle);
  }
  if (scope === 'citizen') return pickCitizenTarget_(rng, ctx);
  if (scope === 'business') return pickBusinessTarget_(rng, ctx);
  if (scope === 'neighborhood') return pickNeighborhoodTarget_(rng, ctx);
  return null;
}

function runChaosCarsEngine_(ctx) {
  if (typeof ctx.rng !== 'function') {
    throw new Error('chaos_cars: ctx.rng required (deterministic runs — engine.md, no Math.random).');
  }
  validateAllChaosConfigs_(); // config-load-time no-death + scale + weight gate
  var rng = ctx.rng;
  var configs = loadChaosCarsConfig_();
  // S271 G-EC31: live engine sets ctx.summary.cycleId / ctx.config.cycleCount (set Phase1-AdvanceTime,
  // before Phase4-ChaosCars), NOT ctx.cycle — old read fell through to 0 on the live path. Match the
  // proven worldEventsEngine_ idiom; keep ctx.cycle last so the ctx.cycle-based test fixtures still pass.
  var cycle = (ctx.summary && (ctx.summary.absoluteCycle || ctx.summary.cycleId)) ||
    (ctx.config && ctx.config.cycleCount) || ctx.cycle || (ctx.summary && ctx.summary.cycle) || 0;

  if (!ctx.summary.chaosCarsEvents) ctx.summary.chaosCarsEvents = [];
  if (!ctx.summary.tier1ChaosEvents) ctx.summary.tier1ChaosEvents = [];
  if (!ctx.summary.careJusticeDemand) throw new Error('chaos_cars: S.careJusticeDemand missing');
  var friction = [];

  var n = pickEventCount_(rng);
  for (var i = 0; i < n; i++) {
    var vehicle = pickVehicle_(rng, configs);
    var scope = pickFromArrayChaos_(rng, vehicle.scopes);
    var target = pickTargetByScope_(rng, ctx, scope, vehicle);
    if (!target) { friction.push('event ' + i + ': empty target pool for scope ' + scope + ' (vehicle ' + vehicle.name + ')'); continue; }

    var outcome = rollOutcome_(rng, vehicle, scope, target); // engine.67 step 8: target-aware
    if (!outcome) { friction.push('event ' + i + ': ' + vehicle.name + ' has no citizen-taggable outcome for scope ' + scope); continue; }
    var impacts = impactsForScope_(vehicle, scope, outcome.outcome);

    // Sample one magnitude per impacted column (a vehicle may move >1 column for a scope).
    var magnitudesByColumn = {};
    var primaryMetric = '';
    var primaryMagnitude = 0;
    for (var k = 0; k < impacts.length; k++) {
      var mag = sampleMagnitude_(rng, impacts[k]);
      magnitudesByColumn[impacts[k].column] = mag;
      if (k === 0) { primaryMetric = impacts[k].column; primaryMagnitude = mag; }
    }
    if (scope === 'business') { primaryMetric = 'Growth_Rate'; primaryMagnitude = Number(outcome.bizEvent) || 0; }

    var text = chaosEventText_(vehicle, outcome, target, scope);

    // Tier-1 cascade flag (T5.1): citizen-scope + Tier-1 + high-severity outcome.
    var consequenceFloorFired = false;
    if (scope === 'citizen' && target.tier === 1 && outcome.severity === 'high') {
      consequenceFloorFired = true;
    }

    // Writeback by scope.
    var receipt = null; // hospital (ambulance) or judicial (cop_car) — one hit is never both
    if (scope === 'citizen') {
      receipt = writeCitizenEvent_(ctx, target, vehicle, outcome, cycle, text);
      primaryMetric = outcome.lifeHistoryTag; // citizen "metric" = the dial tag (provenance)
      primaryMagnitude = 0;
    } else if (scope === 'business') {
      accumulateBusinessEvent_(ctx, target.bizId, outcome.bizEvent);
    } else if (scope === 'neighborhood') {
      accumulateNeighborhoodFold_(ctx, target.neighborhood, impacts, magnitudesByColumn);
    }

    // chaos_cars source row FIRST (§Hard Constraints — canonical, scope writeback derived).
    var payload = {
      cycleId: cycle,
      eventId: chaosEventId_(rng),
      vehicleType: vehicle.name,
      targetScope: scope,
      targetId: (scope === 'citizen') ? target.popId : (scope === 'business') ? target.bizId : target.neighborhood,
      targetTier: (scope === 'citizen') ? target.tier : null,
      diceOutcome: outcome.outcome,
      primaryMetric: primaryMetric,
      metricMagnitude: primaryMagnitude,
      consequenceFloorFired: consequenceFloorFired,
      narrativeSeed: outcome.narrativeSeed || '',
      coverageContribution: outcome.coverageContribution === true
    };
    if (typeof writeChaosCarsRow_ === 'function') writeChaosCarsRow_(ctx, payload);
    ctx.summary.chaosCarsEvents.push(payload);
    if (consequenceFloorFired) ctx.summary.tier1ChaosEvents.push(payload);
    if (receipt && receipt.system === 'judicial') {
      // engine.254 Task 5: no reader until Task 8 persists cases — pushed and dropped each Cycle.
      receipt.sourceEventId = 'patrol:' + payload.eventId + ':' + receipt.popId;
      ctx.summary.judicialEvents = ctx.summary.judicialEvents || [];
      admitJudicialReceipt_(ctx.summary.judicialEvents, receipt); // one open case per POPID (F1)
    } else if (receipt) {
      if (receipt.kind === 'intake') {
        receipt.sourceEventId = 'ambulance:' + payload.eventId + ':' + receipt.popId;
      }
      ctx.summary.hospitalEvents = ctx.summary.hospitalEvents || [];
      ctx.summary.hospitalEvents.push(receipt);
    }

    // V2-5 (S326): consequence-class chaos hit → story surface. Solo-major
    // magnitude (0.05) — a hospitalization or arrest IS a story. Event-level,
    // not conditional on the status flip (a retiree's medical emergency is
    // still the neighborhood's news even though their Status stays 'retired').
    // engine.41 Wire 1 (S499): the story line is the outcome's authored narrativeSeed
    // when it has one ("Lights and sirens at the curb — a medical emergency…"), the
    // mechanical event text only when it doesn't.
    if (scope === 'citizen' && CHAOS_RIPPLE_OUTCOMES[outcome.outcome] &&
        typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'chaos-event',
        causeId: payload.eventId,
        causeDetail: payload.narrativeSeed || text,
        effectType: outcome.outcome,
        targetScope: 'citizen',
        targetIds: [target.popId],
        neighborhood: target.neighborhood || '',
        magnitude: 0.05,
        duration: 1,
        sourceEngine: 'chaosCarsEngine'
      });
    }

    // engine.41 Wire 1 (S499): a high-severity hit on a business or a neighborhood
    // is a public event — its own story seed (builder S275). Wire 1 seeded these
    // through applyStorySeeds' S.storySeeds, which Phase 10 no longer persists
    // (saveV3Seeds writes S.contractSeeds, built from ripples), so none of the 22
    // narrative-seeded hits C101–C108 ever reached Story_Seed_Deck. The authored
    // narrativeSeed is the gate, as Wire 1 specified: low-severity blips stay silent.
    if ((scope === 'business' || scope === 'neighborhood') && payload.narrativeSeed &&
        typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'chaos-event',
        causeId: payload.eventId,
        causeDetail: payload.narrativeSeed,
        effectType: outcome.outcome,
        targetScope: scope,
        targetIds: scope === 'business' ? [target.bizId] : [],
        neighborhood: target.neighborhood || '',
        magnitude: 0.05,
        duration: 1,
        sourceEngine: 'chaosCarsEngine'
      });
    }
  }

  // ── engine.70 W-3 (S327): salient weather hits businesses ────────────────
  // A storm/flood cycle (applyWeatherModel PART 13, Phase 2) dents 1-3
  // businesses in the event's exposed hoods through the SAME fold the vehicles
  // use — a −1 Growth_Rate event each (engine.193 cut 3b: was a $8-20 revenue
  // cell). The draw count is unchanged (the magnitude draw is kept and unused)
  // so every later ctx.rng draw lands where it did. One business-scope ripple
  // per event carries the named businesses to the story surface.
  var wxEvts = (ctx.summary && ctx.summary.weatherEvents) || [];
  for (var wxi = 0; wxi < wxEvts.length; wxi++) {
    var wxEv = wxEvts[wxi];
    if (!wxEv.salient || (wxEv.type !== 'storm' && wxEv.type !== 'flood_conditions')) continue;
    var wxBiz = loadBusinessRows_(ctx);
    if (!wxBiz || !wxBiz.rows.length) break;
    var wxHoodSet = {};
    for (var wxh = 0; wxh < (wxEv.hoods || []).length; wxh++) wxHoodSet[wxEv.hoods[wxh]] = true;
    var wxCands = [];
    for (var wxr = 0; wxr < wxBiz.rows.length; wxr++) {
      var wxHood = wxBiz.iNb >= 0 ? wxBiz.rows[wxr][wxBiz.iNb] : '';
      if (wxHoodSet[wxHood]) wxCands.push(wxr);
    }
    if (!wxCands.length) continue;
    var wxHits = Math.min(wxCands.length, 1 + Math.floor(ctx.rng() * 3)); // 1-3
    var wxHitNames = [];
    for (var wxk = 0; wxk < wxHits; wxk++) {
      var wxPick = Math.floor(ctx.rng() * wxCands.length);
      var wxRowIdx = wxCands.splice(wxPick, 1)[0];
      var wxTarget = {
        rowIndex: wxRowIdx,
        sheetRow: wxRowIdx + 2,
        bizId: wxBiz.rows[wxRowIdx][wxBiz.iId],
        neighborhood: wxBiz.iNb >= 0 ? wxBiz.rows[wxRowIdx][wxBiz.iNb] : ''
      };
      ctx.rng(); // was the [-8,-20] revenue magnitude — kept so the draw sequence is unchanged
      accumulateBusinessEvent_(ctx, wxTarget.bizId, -1);
      wxHitNames.push(String(wxTarget.bizId));
    }
    if (wxHitNames.length && typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'weather-event',
        causeId: wxEv.type === 'storm' ? 'storm-c' + cycle : 'flood-c' + cycle,
        causeDetail: (wxEv.type === 'storm' ? 'Storm' : 'Flood conditions') +
          ' cut into business along ' + (wxEv.hoods || []).join(', ') +
          ' — ' + wxHitNames.length + ' storefront(s) took the hit',
        effectType: wxEv.type === 'storm' ? 'storm-business' : 'flood-business',
        targetScope: 'business',
        targetIds: wxHitNames,
        neighborhood: (wxEv.hoods && wxEv.hoods[0]) || '',
        magnitude: 0.05,
        duration: 1,
        sourceEngine: 'chaosCarsEngine.weatherBusinessFold'
      });
    }
  }
  // ── end engine.70 W-3 business block ─────────────────────────────────────

  var bizHit = 0;
  for (var bk in (ctx.summary.chaosBusinessFold || {})) if (ctx.summary.chaosBusinessFold.hasOwnProperty(bk)) bizHit++;

  var ship = runChaosShip_(ctx, rng, cycle, configs);

  // T6.4 — friction log (ADR-0003). Empty file = clean run.
  writeChaosFrictionLog_(ctx, cycle, friction);

  Logger.log('runChaosCarsEngine_: ' + ctx.summary.chaosCarsEvents.length + ' events | ' +
    ctx.summary.tier1ChaosEvents.length + ' tier-1 | ' + bizHit + ' businesses hit | ship ' +
    (ship ? ship.outcome + ' ' + ship.phase + ' x' + ship.factor : 'none') + ' | ' +
    friction.length + ' friction');
  return {
    events: ctx.summary.chaosCarsEvents.length,
    tier1: ctx.summary.tier1ChaosEvents.length,
    businessesHit: bizHit,
    ship: ship,
    friction: friction.length
  };
}

// ── engine.193 cut 3b: the ship (episodic, port scope) ─────────────────────
// One episode at a time, carried in previousCycleState.chaosShip. Each Cycle this draws
// exactly two ctx.rng values (the start roll and the outcome pick) whether or not an
// episode is running, so the ship never shifts later draws by its own state.
// Strength by week t of an episode `weeks` long: one-week episode 1; otherwise start
// (t=0) 0.5, peak 1, end (t=weeks-1) 0.5; t=weeks is the aftermath — factor 0, which
// releases every point applyBusinessDynamics_ applied — then the slot is free again.
var CHAOS_SHIP_DEFAULT_CHANCE = 0.18; // ~1 episode per 5-6 quiet weeks (builder: 1 per 4-8)

function chaosShipFactor_(t, weeks) {
  if (t < 0 || t >= weeks) return 0;
  if (weeks === 1) return 1;
  return (t === 0 || t === weeks - 1) ? 0.5 : 1;
}

function runChaosShip_(ctx, rng, cycle, configs) {
  var S = ctx.summary;
  var rollStart = rng();
  var rollPick = rng();
  var vehicle = null;
  for (var v = 0; v < configs.length; v++) if (configs[v].scopes.indexOf('port') >= 0) { vehicle = configs[v]; break; }
  if (!vehicle) { S.chaosShip = null; return null; }

  var prev = (S.previousCycleState && S.previousCycleState.chaosShip) || null;
  var ep = null;
  if (prev && prev.phase !== 'aftermath' && Number(prev.startCycle) > 0) {
    var t = cycle - Number(prev.startCycle);
    var weeks = Number(prev.weeks) || 1;
    ep = {
      eventId: prev.eventId, outcome: prev.outcome, startCycle: Number(prev.startCycle),
      weeks: weeks, peakPp: Number(prev.peakPp) || 0,
      factor: chaosShipFactor_(t, weeks),
      phase: t >= weeks ? 'aftermath' : (t === weeks - 1 && weeks > 1 ? 'end' : (t === 0 ? 'start' : 'peak'))
    };
    if (ep.phase === 'aftermath') chaosShipWorldEvent_(ctx, cycle, ep, vehicle, false);
    S.chaosShip = ep;
    return ep;
  }

  var chance = Number(ctx.config && ctx.config.chaosShipChancePerCycle);
  if (!isFinite(chance) || chance < 0) chance = CHAOS_SHIP_DEFAULT_CHANCE;
  if (rollStart >= chance) { S.chaosShip = null; return null; }

  var pool = vehicle.textureOutcomes, total = 0, acc = 0, oc = pool[pool.length - 1];
  for (var i = 0; i < pool.length; i++) total += Number(pool[i].weight) || 0;
  for (var j = 0; j < pool.length; j++) {
    acc += Number(pool[j].weight) || 0;
    if (rollPick * total < acc) { oc = pool[j]; break; }
  }
  validateOutcome(oc.outcome);
  var w = Math.max(1, Math.round(Number(oc.weeks) || 1));
  ep = {
    eventId: 'ship-c' + cycle, outcome: oc.outcome, startCycle: cycle, weeks: w,
    peakPp: Number(oc.peakPp) || 0, factor: chaosShipFactor_(0, w), phase: 'start'
  };
  S.chaosShip = ep;

  var payload = {
    cycleId: cycle, eventId: ep.eventId, vehicleType: vehicle.name, targetScope: 'port',
    targetId: 'Port of Oakland', targetTier: null, diceOutcome: oc.outcome,
    primaryMetric: 'Growth_Rate', metricMagnitude: ep.peakPp,
    consequenceFloorFired: false, narrativeSeed: oc.narrativeSeed || '', coverageContribution: false
  };
  if (typeof writeChaosCarsRow_ === 'function') writeChaosCarsRow_(ctx, payload);
  S.chaosCarsEvents.push(payload);
  chaosShipWorldEvent_(ctx, cycle, ep, vehicle, true);
  return ep;
}

// The ship is the BUSINESS desk's story at both ends: the week it arrives and the week it
// lets go (engine.190 pattern — a closure is a BUSINESS world event).
function chaosShipWorldEvent_(ctx, cycle, ep, vehicle, starting) {
  var S = ctx.summary;
  S.worldEvents = S.worldEvents || [];
  var readable = ep.outcome.replace(/_/g, ' ');
  var down = ep.peakPp < 0;
  var desc = starting
    ? 'Port of Oakland: ' + readable + ' — ' + (down ? 'the waterfront, the shops and the builders who run on its cargo take the hit' : 'the waterfront and the businesses that run on its cargo pick up') + (ep.weeks > 1 ? ', expected to run ' + ep.weeks + ' weeks' : '')
    : 'Port of Oakland: the ' + readable + ' is over — ' + (down ? 'the berths are filling again, and the businesses that waited it out take stock' : 'the rush settles back to an ordinary week at the terminals');
  S.worldEvents.push({
    cycle: cycle, domain: 'BUSINESS', subdomain: 'port-' + (starting ? 'episode' : 'aftermath'),
    neighborhood: 'Jack London',
    severity: (starting && ep.peakPp <= -7) ? 'high' : 'medium',
    description: desc, impactScore: Math.min(40, Math.round(Math.abs(ep.peakPp) * 2.5)),
    source: 'ENGINE', timestamp: ctx.now, vehicle: vehicle.name, shipEventId: ep.eventId
  });
}

// Human-facing event text for col O / LifeHistory_Log / desk packets.
function chaosEventText_(vehicle, outcome, target, scope) {
  var readable = outcome.outcome.replace(/_/g, ' ');
  if (scope === 'neighborhood') return vehicle.displayName + ': ' + readable + ' in ' + target.neighborhood + '.';
  if (scope === 'business') return vehicle.displayName + ': ' + readable + '.';
  return vehicle.displayName + ': ' + readable + '.';
}

// T6.4 — friction log writer. In Apps Script there is no filesystem; the log accumulates
// onto ctx.summary.chaosFriction for a downstream Node consumer to persist (ADR-0003 path
// output/skill_friction/chaos_cars_engine_c{XX}.md). Empty array = clean run.
function writeChaosFrictionLog_(ctx, cycle, friction) {
  ctx.summary.chaosFriction = { cycle: cycle, entries: friction || [] };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAOS_MIN_EVENTS: CHAOS_MIN_EVENTS,
    CHAOS_MAX_EVENTS: CHAOS_MAX_EVENTS,
    pickEventCount_: pickEventCount_,
    pickVehicle_: pickVehicle_,
    rollOutcome_: rollOutcome_,
    sampleMagnitude_: sampleMagnitude_,
    impactsForScope_: impactsForScope_,
    weightedPickChaos_: weightedPickChaos_,
    pickFromArrayChaos_: pickFromArrayChaos_,
    chaosEventId_: chaosEventId_,
    resolveChaosNeighborhoodFold_: resolveChaosNeighborhoodFold_,
    accumulateBusinessEvent_: accumulateBusinessEvent_,
    runChaosShip_: runChaosShip_,
    chaosShipFactor_: chaosShipFactor_,
    writeCitizenEvent_: writeCitizenEvent_,
    pickTargetByScope_: pickTargetByScope_,
    pickCareJusticeTarget_: pickCareJusticeTarget_,
    runChaosCarsEngine_: runChaosCarsEngine_
  };
}
