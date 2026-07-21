/**
 * ============================================================================
 * finalizeCycleState_ v1.1
 * ============================================================================
 *
 * Purpose:
 * - Creates a comprehensive snapshot of the current cycle's final state
 * - Stores it as S.previousCycleState for next cycle comparisons
 * - Runs AFTER all analysis (shock/pattern/arcs/recovery/weight) but BEFORE persistence
 *
 * v1.1 Enhancements:
 * - Uses S.cycleFinalState instead of S.currentCycleState (avoid ShockMonitor conflict)
 * - Expanded snapshot with cycleWeight, calendar, recovery, civicLoad, weather
 * - Idempotence guard to prevent double-finalize on reruns
 * - Standardized cycle ID resolution
 *
 * Why this exists:
 * - ShockMonitor, PatternDetection, and other scripts need previousCycleState
 * - Without explicit rollover, comparisons use stale or undefined data
 * - This guarantees writers capture final cycle context including Phase 9 outputs
 *
 * Outputs:
 * - S.previousCycleState: authoritative snapshot for next cycle's comparisons
 * - S.cycleFinalState: snapshot for debugging this run (does not clobber ShockMonitor)
 * - S.cycleFinalizedAt: timestamp
 *
 * Pipeline placement:
 * - Phase9-FinalizeCycleState (after analysis, before Phase10 persistence)
 *
 * ============================================================================
 */

function finalizeCycleState_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  var dynamics = S.cityDynamics || { sentiment: 0 };
  var weather = S.weather || {};
  var worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];

  // Standardized cycle ID resolution (prefer cycleId, fallback to config)
  var cycle = S.cycleId || S.cycle || (ctx.config && ctx.config.cycleCount) || 0;

  // v1.1: Idempotence guard - prevent double-finalize on reruns
  if (S.previousCycleState && S.previousCycleState.cycle === cycle) {
    return;
  }

  // Build comprehensive final snapshot of this cycle
  var snapshot = {
    // Core identifiers
    cycle: cycle,

    // Event metrics
    events: (typeof S.eventsGenerated === 'number') ? S.eventsGenerated : worldEvents.length,
    chaosCount: worldEvents.length,

    // City dynamics
    sentiment: (typeof dynamics.sentiment === 'number') ? dynamics.sentiment : 0,
    econMood: (typeof S.economicMood === 'number') ? S.economicMood : 50,

    // Pattern/Shock state
    pattern: S.patternFlag || "none",
    shockFlag: S.shockFlag || "none",
    shockStartCycle: S.shockStartCycle || 0,

    // v1.1: Civic load
    civicLoad: S.civicLoad || "stable",
    civicLoadScore: S.civicLoadScore || 0,

    // v1.1: Weather context
    weatherType: weather.type || "clear",
    weatherImpact: weather.impact || 1,

    // v1.1: Cycle weight (from Phase 9)
    cycleWeight: S.cycleWeight || "low-signal",
    cycleWeightScore: S.cycleWeightScore || 0,

    // v1.1: Recovery/cooldown state
    recoveryLevel: S.recoveryLevel || "none",
    overloadScore: S.overloadScore || 0,
    activeCooldowns: S.activeCooldowns || "none",

    // v1.1: Calendar context
    holiday: S.holiday || "none",
    holidayPriority: S.holidayPriority || "none",
    isFirstFriday: !!S.isFirstFriday,
    isCreationDay: !!S.isCreationDay,
    sportsSeason: S.sportsSeason || "off-season",
    season: S.season || "Spring",

    // v1.2: Media effects for next cycle's city dynamics feedback
    mediaEffects: compactMediaEffects_(S.mediaEffects),

    // v1.3: Neighborhood dynamics for cross-cycle momentum
    neighborhoodDynamics: compactNeighborhoodDynamics_(S.neighborhoodDynamics),

    // v1.4: Domain presence for editorial balance cooldowns
    domainPresence: S.domainPresence || null,
    dominantDomain: S.dominantDomain || null,

    // v1.5 (engine.45 T2): active ripples survive the cycle boundary — the decay/
    // expiry code in processActiveRipples_/applyActiveInitiativeRipples_ was
    // unreachable because these arrays died with ctx every cycle (traces E1/E2/C2).
    economicRipples: compactEconomicRipples_(S.economicRipples, cycle),
    initiativeRipples: compactInitiativeRipples_(S.initiativeRipples, cycle),

    // v1.5 (engine.45 T2): migration→mood loop — economicRippleEngine reads
    // previousCycleState.migrationDrift, which was never serialized (always 0).
    migrationDrift: (typeof S.migrationDrift === 'number') ? S.migrationDrift : 0,
    migrationDriftFactors: (S.migrationDriftFactors || []).slice(0, 5),

    // v1.8 (engine.61 T1): the bank rate survives the cycle boundary — the
    // walk needs its prior position or it resets to the mean every cycle.
    // ~15 bytes; same carry class as migrationDrift/weatherTracking.
    bankRate: (typeof S.bankRate === 'number') ? S.bankRate : null,

    // v1.6 (engine.45 T3b): crime spikes for next cycle's city dynamics — the
    // crime branch inputs (S.crimeSpikes/S.crimeByNeighborhood) had no writer
    // (trace K gap G1); Phase-2 position means prev-cycle is the honest grain.
    // Same channel as migrationDrift. Increase-shifts only, responseTime excluded.
    crimeSpikes: compactCrimeSpikes_(S.crimeMetrics),

    // v1.7 (engine.44 Class 3): weather streak state survives the cycle
    // boundary — applyWeatherModel's streak-gated alerts (heat_wave ≥6,
    // prolonged_rain ≥4, cold_snap ≥5, fog_advisory ≥3) and comfort-streak
    // mood effects (≥3) were unreachable because S.weatherTracking was reborn
    // every cycle, pinning currentStreak at 1. Same failure class as the v1.5
    // ripple carry. Cycle_Weather cols E (Advisory) / H (Alerts) never filled
    // as a result. ~150 bytes.
    weatherTracking: compactWeatherTracking_(S.weatherTracking),

    // v1.9 (engine.70 W-1): the Markov front chain survives the cycle
    // boundary — applyWeatherModel_'s multi-day fronts (the whole point of
    // v3.5) were reborn every cycle because weatherFrontTracking was never
    // serialized: frontStreak pinned at ~1, frontStrength reset to 0.55
    // baseline, STORM/HEAT fronts couldn't build. Bench-proven (400-yr Node
    // harness): heat_wave alert unreachable (max hot streak 2 vs bar 6),
    // major storms 0.24/yr. With carry: storms ~1.1/yr, heat streaks build.
    // Same failure class as the v1.7 weatherTracking carry. ~120 bytes.
    weatherFrontTracking: compactFrontTracking_(S.weatherFrontTracking),

    // v1.9 (engine.70 T-1): one boolean — updateTransitMetrics' salience pass
    // dedupes consecutive disruption cycles against it (a 3-cycle storm is one
    // disruption story, not three).
    transitDisrupted: !!(S.transitState && S.transitState.disruptionOngoing),

    // v1.9 (engine.71 CR-2/3): crisis arcs live across cycles on this carry
    // (weatherFrontTracking pattern — the detector re-evaluates channel state
    // each cycle; mean-reversion IS the recovery physics). hospitalEvents
    // carry one cycle so the detector's hospital-cluster channel has the
    // prev-cycle grain (Hospital_Ledger is lazy-created — absent until the
    // first admission — so the tab can't be the reliable read).
    crisisArcs: compactCrisisArcs_(S.crisisArcsActive),
    hospitalEvents: compactHospitalEvents_(S.hospitalEvents),

  };

  // This is what downstream scripts read next cycle
  S.previousCycleState = snapshot;

  // v1.1: Use cycleFinalState for debugging (doesn't clobber ShockMonitor's currentCycleState)
  S.cycleFinalState = snapshot;

  S.cycleFinalizedAt = ctx.now || new Date();
  ctx.summary = S;
}


/**
 * Compact weatherTracking to the streak fields applyWeatherModel_ re-seeds
 * from next cycle (v1.7, engine.44 Class 3). history[] deliberately excluded —
 * per-cycle rebuild, would bloat the 9KB PropertiesService budget.
 */
function compactWeatherTracking_(t) {
  if (!t) return null;
  return {
    currentStreak: t.currentStreak || 0,
    streakType: t.streakType || '',
    consecutiveUncomfortableDays: t.consecutiveUncomfortableDays || 0,
    consecutiveComfortableDays: t.consecutiveComfortableDays || 0,
    seasonFirsts: t.seasonFirsts || {}
  };
}


/**
 * Compact weatherFrontTracking to the fields applyWeatherModel_ re-seeds from
 * next cycle (v1.9, engine.70 W-1). history[] deliberately excluded — per-cycle
 * rebuild, same budget rule as compactWeatherTracking_. The wetRun* fields are
 * the engine.70 salience-pass accumulators (storm/flood once-per-front-run
 * dedup + cumulative precip) — they live on the carried object so a wet front
 * spanning cycles can't double-fire its event.
 */
function compactFrontTracking_(ft) {
  if (!ft) return null;
  return {
    frontState: ft.frontState || 'CLEAR',
    frontStreak: ft.frontStreak || 1,
    frontStrength: ft.frontStrength || 0.55,
    lastTransitionCycle: ft.lastTransitionCycle || 0,
    wetRunLen: ft.wetRunLen || 0,
    wetRunPrecip: ft.wetRunPrecip || 0,
    wetRunStormFired: !!ft.wetRunStormFired,
    wetRunFloodFired: !!ft.wetRunFloodFired,
    heatEventFired: !!ft.heatEventFired
  };
}


/**
 * Compact active crisis arcs for carry-forward (v1.9, engine.71). Resolved
 * arcs never carry; citizens capped 6 (bounded accumulator); evidence prose
 * excluded — the detector rebuilds it from live channels each cycle.
 */
var SNAPSHOT_CRISIS_ARC_CAP = 8;

function compactCrisisArcs_(arcs) {
  if (!Array.isArray(arcs)) return [];
  var out = [];
  for (var i = 0; i < arcs.length && out.length < SNAPSHOT_CRISIS_ARC_CAP; i++) {
    var a = arcs[i];
    if (!a || a.phase === 'resolved') continue;
    out.push({
      arcId: a.arcId,
      type: a.type,
      phase: a.phase,
      tension: a.tension,
      neighborhood: a.neighborhood,
      domainTag: a.domainTag,
      domain: a.domain,
      summary: String(a.summary || '').slice(0, 160),
      citizens: (a.citizens || []).slice(0, 6),
      consecutiveBad: a.consecutiveBad || 1,
      cycleCreated: a.cycleCreated,
      phaseStartCycle: a.phaseStartCycle || a.cycleCreated,
      source: a.source || 'DETECTED'
    });
  }
  return out;
}

/**
 * Compact this cycle's hospital admissions for the detector's prev-cycle
 * cluster channel (v1.9, engine.71). popId + neighborhood only; capped 12.
 */
function compactHospitalEvents_(events) {
  if (!Array.isArray(events)) return [];
  var out = [];
  for (var i = 0; i < events.length && out.length < 12; i++) {
    var e = events[i];
    if (!e || !e.neighborhood) continue;
    out.push({ popId: e.popId || '', neighborhood: e.neighborhood });
  }
  return out;
}

/**
 * Compact mediaEffects to only the fields needed for next cycle's
 * city dynamics feedback. Full object is too large for PropertiesService.
 */
function compactMediaEffects_(mediaEffects) {
  if (!mediaEffects) return null;
  return {
    sentimentPressure: mediaEffects.sentimentPressure || 0,
    anxietyFactor: mediaEffects.anxietyFactor || 0,
    hopeFactor: mediaEffects.hopeFactor || 0,
    crisisSaturation: mediaEffects.crisisSaturation || 0,
    celebrityBuzz: mediaEffects.celebrityBuzz || 0,
    neighborhoodEffects: mediaEffects.neighborhoodEffects || {}
  };
}


/**
 * ============================================================================
 * snapshotEveningForCarryForward_ v1.0
 * ============================================================================
 *
 * Builds a compact snapshot of this cycle's evening data for carry-forward
 * to the next cycle. Citizens in Phase 5 can't see Phase 7 evening data,
 * so we snapshot it here (Phase 9, after Phase 7 is done) and restore it
 * next cycle via loadPreviousEvening_.
 *
 * People's days are shaped by what happened yesterday, not tonight.
 *
 * Estimated snapshot size: 500-1500 bytes JSON.
 * Storage: PropertiesService (9KB per-property limit, 500KB total).
 *
 * ============================================================================
 */

function snapshotEveningForCarryForward_(ctx) {
  var S = ctx.summary || {};
  var nightlife = S.nightlife || {};
  var food = S.eveningFood || {};
  var sightings = S.famousSightings || [];

  var snapshot = {
    cycle: S.cycleId || 0,
    crowdHotspots: S.crowdHotspots || [],
    nightlifeVolume: S.nightlifeVolume || 0,
    nightlifeVibe: nightlife.vibe || 'normal',
    eveningSafety: S.eveningSafety || 'normal',
    eveningTraffic: S.eveningTraffic || 'light',
    foodTrend: (food.trend && food.trend !== 'none') ? food.trend : '',
    streamingTrend: S.streamingTrend || '',
    eveningSports: S.eveningSports || '',
    famousNames: []
  };

  // Compact: just name + neighborhood for first 3 sightings
  for (var i = 0; i < Math.min(sightings.length, 3); i++) {
    var s = sightings[i];
    if (s && s.name) {
      // T5 (research.24): venue rides the carry-forward line when present
      snapshot.famousNames.push(s.name + (s.venue && s.venue.name ? ' at ' + s.venue.name : '') + (s.neighborhood ? ' in ' + s.neighborhood : ''));
    }
  }

  // engine.32 T8 — carry the SPECIFIC city events forward so next cycle's
  // citizen generators can fan them out (attendance / heard-about memories).
  // Until now only crowd scores/vibe survived the cycle boundary; the events
  // themselves were dropped. Compact: first 3 events, up to 3 tags each.
  snapshot.cityEvents = [];
  var cityDetails = S.cityEventDetails || [];
  for (var cei = 0; cei < Math.min(cityDetails.length, 3); cei++) {
    var ce = cityDetails[cei];
    if (ce && ce.name) {
      snapshot.cityEvents.push({
        name: ce.name,
        neighborhood: ce.neighborhood || '',
        tags: (ce.tags || []).slice(0, 3)
      });
    }
  }

  // Compact crowd: top 4 neighborhoods with scores
  var crowdMap = S.crowdMap || {};
  var crowdKeys = Object.keys(crowdMap);
  var crowdPairs = [];
  for (var ci = 0; ci < crowdKeys.length; ci++) {
    crowdPairs.push({ hood: crowdKeys[ci], score: crowdMap[crowdKeys[ci]] });
  }
  crowdPairs.sort(function(a, b) { return b.score - a.score; });
  snapshot.topCrowds = {};
  for (var ti = 0; ti < Math.min(crowdPairs.length, 4); ti++) {
    snapshot.topCrowds[crowdPairs[ti].hood] = crowdPairs[ti].score;
  }

  S.eveningSnapshot = snapshot;
  ctx.summary = S;
  Logger.log('snapshotEveningForCarryForward_: Built snapshot for cycle ' + snapshot.cycle +
    ' (' + snapshot.crowdHotspots.length + ' hotspots, vol=' + snapshot.nightlifeVolume +
    ', safety=' + snapshot.eveningSafety + ')');
}


function saveEveningSnapshot_(ctx) {
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('saveEveningSnapshot_: Skipped (dry-run mode)');
    return;
  }

  var S = ctx.summary || {};
  var snapshot = S.eveningSnapshot;
  if (!snapshot) {
    Logger.log('saveEveningSnapshot_: No snapshot to save');
    return;
  }

  try {
    var json = JSON.stringify(snapshot);
    PropertiesService.getScriptProperties().setProperty('PREV_EVENING_JSON', json);
    Logger.log('saveEveningSnapshot_: Saved ' + json.length + ' bytes for cycle ' + snapshot.cycle);
  } catch (e) {
    Logger.log('saveEveningSnapshot_: Failed - ' + e.message);
  }
}


/**
 * ============================================================================
 * savePreviousCycleState_ v1.0
 * ============================================================================
 *
 * Persists S.previousCycleState to PropertiesService so it survives across
 * spreadsheet close/reopen. Without this, shock arcs, pattern escalation,
 * recovery trajectories, and civic load history are lost between sessions.
 *
 * Mirrors saveEveningSnapshot_ pattern. Called in Phase 10 after
 * finalizeCycleState_ has built the snapshot.
 *
 * Storage: PropertiesService (9KB per-property limit, 500KB total).
 * Estimated size: 400-800 bytes JSON.
 *
 * ============================================================================
 */

function savePreviousCycleState_(ctx) {
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('savePreviousCycleState_: Skipped (dry-run mode)');
    return;
  }

  var S = ctx.summary || {};
  var snapshot = S.previousCycleState;
  if (!snapshot) {
    Logger.log('savePreviousCycleState_: No snapshot to save');
    return;
  }

  try {
    var json = JSON.stringify(snapshot);
    PropertiesService.getScriptProperties().setProperty('PREV_CYCLE_STATE_JSON', json);
    Logger.log('savePreviousCycleState_: Saved ' + json.length + ' bytes for cycle ' + snapshot.cycle);
  } catch (e) {
    Logger.log('savePreviousCycleState_: Failed - ' + e.message);
  }
}


/**
 * Compact neighborhoodDynamics to core metrics for next cycle's momentum blend.
 * Keeps sentiment, nightlife, retail, tourism per neighborhood.
 */
function compactNeighborhoodDynamics_(nd) {
  if (!nd) return null;
  var compact = {};
  for (var hood in nd) {
    if (!nd.hasOwnProperty(hood)) continue;
    var n = nd[hood];
    if (!n) continue;
    compact[hood] = {
      sentiment: n.sentiment || 0,
      nightlife: n.nightlife || 1,
      retail: n.retail || 1,
      tourism: n.tourism || 1,
      publicSpaces: n.publicSpaces || 1,
      communityEngagement: n.communityEngagement || 1
    };
  }
  return compact;
}


/**
 * ============================================================================
 * v1.5 (engine.45 T2): RIPPLE COMPACTORS
 * ============================================================================
 *
 * Bounded accumulators — active-only, strongest-first, hard caps — so the
 * PropertiesService payload stays well under the 9KB per-property limit
 * (pre-T2 snapshot ~400-800 bytes; worst case with both caps hit ~5KB).
 * Explicit field copy also strips transient flags (_ledgered, _carryLedgered)
 * so per-cycle ledger dedup guards reset naturally at the boundary.
 */

var SNAPSHOT_ECON_RIPPLE_CAP = 12;
var SNAPSHOT_INIT_RIPPLE_CAP = 12;

/**
 * engine.45 T3b: compact this cycle's crime increase-shifts for carry-forward.
 * Next cycle's applyCityDynamics_ derives both consumer shapes from this one
 * list: crimeSpikes (array → citywide rolling-average count) and
 * crimeByNeighborhood (per-hood counts → cluster ripple thresholds 1/2/3).
 * responseTime shifts and decreases are not spikes — excluded. Capped at 12
 * (bounded accumulator; snapshot shares the 9KB PropertiesService limit).
 */
function compactCrimeSpikes_(crimeMetrics) {
  var shifts = (crimeMetrics && Array.isArray(crimeMetrics.shifts)) ? crimeMetrics.shifts : [];
  var out = [];
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    if (!s || s.direction !== 'increase') continue;
    if (s.metric !== 'propertyCrime' && s.metric !== 'violentCrime') continue;
    out.push({
      neighborhood: s.neighborhood,
      metric: s.metric,
      magnitude: s.magnitude,
      newValue: s.newValue
    });
  }
  out.sort(function(a, b) { return (b.magnitude || 0) - (a.magnitude || 0); });
  if (out.length > 12) {
    if (typeof Logger !== 'undefined') {
      Logger.log('compactCrimeSpikes_: capped ' + out.length + ' → 12 (weakest dropped)');
    }
    out = out.slice(0, 12);
  }
  if (out.length && typeof Logger !== 'undefined') {
    Logger.log('compactCrimeSpikes_: carrying ' + out.length + ' crime spike(s) to next cycle');
  }
  return out;
}

/**
 * Trim active economic ripples for carry-forward. Keeps every field the
 * next-cycle consumers read: processActiveRipples_ (startCycle/endCycle/impact/
 * currentStrength), calculateNeighborhoodEconomies_ (neighborhoods/
 * primaryNeighborhood/currentStrength), applyMigrationDrift (impact sign),
 * createRipple_ dedup (id), T1 ledger loop (id/source/sectors).
 */
function compactEconomicRipples_(ripples, cycle) {
  if (!Array.isArray(ripples)) return [];
  var active = [];
  for (var i = 0; i < ripples.length; i++) {
    var r = ripples[i];
    if (!r || typeof r.endCycle !== 'number') continue;
    if (r.endCycle <= cycle) continue;
    active.push(r);
  }
  active.sort(function(a, b) {
    return Math.abs(b.currentStrength || 0) - Math.abs(a.currentStrength || 0);
  });
  if (active.length > SNAPSHOT_ECON_RIPPLE_CAP) {
    if (typeof Logger !== 'undefined') {
      Logger.log('compactEconomicRipples_: capped ' + active.length + ' → ' +
        SNAPSHOT_ECON_RIPPLE_CAP + ' (weakest dropped)');
    }
    active = active.slice(0, SNAPSHOT_ECON_RIPPLE_CAP);
  }
  var out = [];
  for (var j = 0; j < active.length; j++) {
    var a = active[j];
    out.push({
      id: a.id,
      type: a.type,
      impact: a.impact,
      sectors: a.sectors || [],
      neighborhoods: a.neighborhoods || [],
      primaryNeighborhood: a.primaryNeighborhood || '',
      startCycle: a.startCycle,
      endCycle: a.endCycle,
      currentStrength: a.currentStrength,
      source: String(a.source || 'System').slice(0, 80),
      // T4 (research.24, S313): business-threaded ripples keep their scope
      // across the cycle boundary — carryover ledger rows stay business-scoped.
      bizId: a.bizId || '',
      bizName: a.bizName || ''
    });
  }
  return out;
}

/**
 * Trim active initiative ripples for carry-forward. Keeps every field
 * applyActiveInitiativeRipples_ reads (status/startCycle/endCycle/duration/
 * effects/initiativeName/rippleType/affectedNeighborhoods) plus direction/
 * strength for carryover ledger magnitude.
 */
function compactInitiativeRipples_(ripples, cycle) {
  if (!Array.isArray(ripples)) return [];
  var active = [];
  for (var i = 0; i < ripples.length; i++) {
    var r = ripples[i];
    if (!r || typeof r.endCycle !== 'number') continue;
    if (r.endCycle <= cycle) continue;
    if (r.status === 'expired' || r.status === 'completed') continue;
    active.push(r);
  }
  active.sort(function(a, b) {
    return Math.abs(b.strength || 0) - Math.abs(a.strength || 0);
  });
  if (active.length > SNAPSHOT_INIT_RIPPLE_CAP) {
    if (typeof Logger !== 'undefined') {
      Logger.log('compactInitiativeRipples_: capped ' + active.length + ' → ' +
        SNAPSHOT_INIT_RIPPLE_CAP + ' (weakest dropped)');
    }
    active = active.slice(0, SNAPSHOT_INIT_RIPPLE_CAP);
  }
  var out = [];
  for (var j = 0; j < active.length; j++) {
    var a = active[j];
    out.push({
      initiativeName: a.initiativeName,
      rippleType: a.rippleType,
      direction: a.direction,
      strength: a.strength,
      effects: a.effects || {},
      affectedNeighborhoods: a.affectedNeighborhoods || [],
      startCycle: a.startCycle,
      duration: a.duration,
      endCycle: a.endCycle,
      status: 'active'
    });
  }
  return out;
}

// Dual-use module guard for the Node round-trip test (claspignored *.test.js).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    finalizeCycleState_: finalizeCycleState_,
    compactEconomicRipples_: compactEconomicRipples_,
    compactInitiativeRipples_: compactInitiativeRipples_,
    compactCrimeSpikes_: compactCrimeSpikes_,
    compactWeatherTracking_: compactWeatherTracking_,
    compactFrontTracking_: compactFrontTracking_,
    compactCrisisArcs_: compactCrisisArcs_,
    compactHospitalEvents_: compactHospitalEvents_,
    SNAPSHOT_ECON_RIPPLE_CAP: SNAPSHOT_ECON_RIPPLE_CAP,
    SNAPSHOT_INIT_RIPPLE_CAP: SNAPSHOT_INIT_RIPPLE_CAP
  };
}


/**
 * ============================================================================
 * FINALIZE CYCLE STATE REFERENCE
 * ============================================================================
 *
 * SNAPSHOT FIELDS:
 *
 * Core:
 * - cycle: Current cycle ID
 * - events: Number of events generated
 * - chaosCount: Total world events
 *
 * Dynamics:
 * - sentiment: City sentiment (-1 to 1)
 * - econMood: Economic mood (0-100)
 * - civicLoad: "stable", "minor-variance", "load-strain"
 * - civicLoadScore: Numeric score
 *
 * Pattern/Shock:
 * - pattern: "none", "micro-event-wave", "strain-trend", etc.
 * - shockFlag: "none", "shock-flag", "shock-fading", "shock-chronic"
 * - shockStartCycle: When shock began (0 if none)
 *
 * Weather:
 * - weatherType: "clear", "rain", "storm", etc.
 * - weatherImpact: 1.0 = normal, >1.3 = significant
 *
 * Cycle Weight:
 * - cycleWeight: "low-signal", "medium-signal", "high-signal"
 * - cycleWeightScore: Numeric score
 *
 * Recovery:
 * - recoveryLevel: "none", "mild", "moderate", "heavy"
 * - overloadScore: Numeric overload score
 * - activeCooldowns: String summary of active domain cooldowns
 *
 * Calendar:
 * - holiday: Holiday name or "none"
 * - holidayPriority: "major", "oakland", "cultural", "minor", "none"
 * - isFirstFriday: Boolean
 * - isCreationDay: Boolean
 * - sportsSeason: "off-season", "late-season", "playoffs", "championship"
 * - season: "Spring", "Summer", "Fall", "Winter"
 *
 * OUTPUTS:
 * - S.previousCycleState: Read by next cycle's analyzers
 * - S.cycleFinalState: Debug snapshot (doesn't conflict with ShockMonitor)
 * - S.cycleFinalizedAt: Timestamp
 *
 * ============================================================================
 */
