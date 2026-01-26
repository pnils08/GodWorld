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
    season: S.season || "Spring"
  };

  // This is what downstream scripts read next cycle
  S.previousCycleState = snapshot;

  // v1.1: Use cycleFinalState for debugging (doesn't clobber ShockMonitor's currentCycleState)
  S.cycleFinalState = snapshot;

  S.cycleFinalizedAt = ctx.now || new Date();
  ctx.summary = S;
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
