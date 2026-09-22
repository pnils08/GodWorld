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

  var sheet = ss.getSheetByName('Initiative_Tracker');
  if (!sheet) {
    Logger.log('applyInitiativeImplementationEffects_ v1.0: Initiative_Tracker not found (skipping)');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

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

  var PHASE_INTENSITY = {
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

    // Skip if no implementation phase set or no name
    if (!phase || !name) continue;

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
    var intensity = PHASE_INTENSITY[phase];
    if (intensity === undefined) {
      // Try partial matching for compound phases
      intensity = 0;
      for (var pk in PHASE_INTENSITY) {
        if (phase.indexOf(pk) >= 0) {
          intensity = PHASE_INTENSITY[pk];
          break;
        }
      }
    }

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


/**
 * Find column index by possible header names (case-insensitive).
 */
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
