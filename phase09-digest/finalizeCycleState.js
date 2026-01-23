/**
 * ============================================================================
 * finalizeCycleState_ v1.0
 * ============================================================================
 *
 * Purpose:
 * - Creates a snapshot of the current cycle's final state
 * - Stores it as S.previousCycleState for next cycle comparisons
 * - Runs AFTER all analysis (shock/pattern/arcs/recovery) but BEFORE persistence
 *
 * Why this exists:
 * - ShockMonitor, PatternDetection, and other scripts need previousCycleState
 * - Without explicit rollover, comparisons use stale or undefined data
 * - This guarantees writers capture final cycle context
 *
 * Outputs:
 * - S.previousCycleState: snapshot for next cycle's comparisons
 * - S.currentCycleState: snapshot for debugging this run
 * - S.cycleFinalizedAt: timestamp
 *
 * ============================================================================
 */

function finalizeCycleState_(ctx) {
  const S = ctx.summary || (ctx.summary = {});
  const dynamics = S.cityDynamics || { sentiment: 0 };
  const worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  const arcs = Array.isArray(S.eventArcs) ? S.eventArcs : [];

  const cycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // Build final snapshot of this cycle
  const snapshot = {
    cycle: cycle,
    events: (typeof S.eventsGenerated === 'number') ? S.eventsGenerated : worldEvents.length,
    chaosCount: worldEvents.length,
    sentiment: (typeof dynamics.sentiment === 'number') ? dynamics.sentiment : 0,
    econMood: (typeof S.economicMood === 'number') ? S.economicMood : 50,
    pattern: S.patternFlag || "none",
    shockFlag: S.shockFlag || "none",
    shockStartCycle: S.shockStartCycle || 0
  };

  // This is what ShockMonitor reads next cycle
  S.previousCycleState = snapshot;

  // Keep for debugging this run
  S.currentCycleState = snapshot;

  S.cycleFinalizedAt = ctx.now || new Date();
  ctx.summary = S;
}
