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
    dominantDomain: S.dominantDomain || null
  };

  // This is what downstream scripts read next cycle
  S.previousCycleState = snapshot;

  // v1.1: Use cycleFinalState for debugging (doesn't clobber ShockMonitor's currentCycleState)
  S.cycleFinalState = snapshot;

  S.cycleFinalizedAt = ctx.now || new Date();
  ctx.summary = S;
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
      snapshot.famousNames.push(s.name + (s.neighborhood ? ' in ' + s.neighborhood : ''));
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
