/**
 * saveChaosCars.js — Chaos_Cars ledger row writer (engine.11 T3.11 + T1.3).
 *
 * [engine/sheet] chaos-cars plan §Schema Appendix (12 cols A-L). Called once per generated
 * event from the Phase-4 orchestrator (runChaosCarsEngine_) — the chaos_cars row is
 * source-of-truth, queued FIRST, scope writebacks derived (§Hard Constraints). Writes via
 * queueAppendIntent_ (engine.md write-intent rule); lazy-creates the tab via an ensure-tab
 * intent on first call per cycle (satisfies T1.3 without manual pre-creation — service
 * account / clasp don't need to pre-build it).
 *
 * Apps Script global style (clasped). Dual-use module guard for the Node generator test.
 */

var CHAOS_CARS_TAB = 'Chaos_Cars';
var CHAOS_CARS_HEADERS = [
  'CycleId', 'EventId', 'VehicleType', 'TargetScope', 'TargetId', 'TargetTier',
  'DiceOutcome', 'PrimaryMetric', 'MetricMagnitude', 'ConsequenceFloorFired',
  'ChaosNarrativeSeed', 'CycleStamp'
];

// S271: in-world cycle stamp (Y{year}C{cycle}), NOT a real-world wall clock.
// Header renamed TimestampUtc → CycleStamp (tab never created yet, no consumers).
function chaosTimestampUtc_(ctx) {
  if (typeof inWorldStamp_ === 'function') return inWorldStamp_(ctx);
  return (ctx && ctx.summary && ctx.summary.cycleRef) || '';
}

/**
 * Queue one Chaos_Cars append (12-col row) + ensure the tab exists once per cycle.
 * @param {Object} ctx
 * @param {Object} payload  from the orchestrator (see runChaosCarsEngine_)
 */
function writeChaosCarsRow_(ctx, payload) {
  if (!ctx._chaosTabEnsured) {
    queueEnsureTabIntent_(ctx, CHAOS_CARS_TAB, CHAOS_CARS_HEADERS, 'chaos_cars lazy tab create', 'chaos');
    ctx._chaosTabEnsured = true;
  }
  var row = [
    payload.cycleId,
    payload.eventId,
    payload.vehicleType,
    payload.targetScope,
    payload.targetId,
    (payload.targetTier === null || payload.targetTier === undefined) ? '' : payload.targetTier,
    payload.diceOutcome,
    payload.primaryMetric,
    payload.metricMagnitude,
    payload.consequenceFloorFired ? 'TRUE' : 'FALSE',
    payload.narrativeSeed || '',
    chaosTimestampUtc_(ctx)
  ];
  queueAppendIntent_(ctx, CHAOS_CARS_TAB, row, 'chaos_cars source row', 'chaos');
  return row;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAOS_CARS_TAB: CHAOS_CARS_TAB,
    CHAOS_CARS_HEADERS: CHAOS_CARS_HEADERS,
    writeChaosCarsRow_: writeChaosCarsRow_
  };
}
