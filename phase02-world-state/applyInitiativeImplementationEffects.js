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
      sentiment: 0.04, communityEngagement: 0.05
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

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var name = iName !== -1 ? (row[iName] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var phase = iPhase !== -1 ? (row[iPhase] || '').toString().trim().toLowerCase() : '';
    var domain = iDomain !== -1 ? (row[iDomain] || '').toString().trim().toLowerCase() : '';
    var hoodsStr = iHoods !== -1 ? (row[iHoods] || '').toString().trim() : '';

    // Skip if no implementation phase set or no name
    if (!phase || !name) continue;

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
    if (isBaylightInitiative_(name) && sportsHasOpenedBaylight_(S)) {
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
          publicSpaces: 0, communityEngagement: 0, sentiment: 0
        };
      }

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
          ' effects in ' + hoods.join(', '),
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
      intensity.toFixed(2) + ' → ' + hoods.join(', '));
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
    triggerCount: triggers.length
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
  // NOTE: S.initiativeNeighborhoodEffects (merged above) still has no per-hood
  // consumer — same open seam as per-hood editionNeighborhoodEffects; filed in
  // the engine.45 plan as the per-hood fold follow-up. Kept published for it.

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
