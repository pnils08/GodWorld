/**
 * rippleLedger.js — Ripple_Ledger attribution row writer (engine.45 T1).
 *
 * [engine/sheet] Persists cause→effect the moment an engine computes an effect —
 * one row per attributed ripple. Model: the Chaos_Cars source row (saveChaosCars.js,
 * trace K4): queueEnsureTabIntent_ lazy tab create (schema-setup carve-out, Phase 42
 * §1.1) + queueAppendIntent_, committed by the Phase-10 executor. Callers must be
 * Phase ≤9 (engine.md post-executor rule — a Phase 11+ caller's intent silently drops).
 *
 * Fail-soft: recordRipple_ never throws into a calling phase; drops are logged.
 * Write-only in T1 — consumers arrive at engine.45 T4 (desk slices) / T6 (WHY layer).
 *
 * Apps Script global style (clasped). Dual-use module guard for the Node test.
 */

var RIPPLE_LEDGER_TAB = 'Ripple_Ledger';
var RIPPLE_LEDGER_HEADERS = [
  'Cycle', 'CauseType', 'CauseId', 'CauseDetail', 'EffectType', 'TargetScope',
  'TargetIds', 'Neighborhood', 'Magnitude', 'Duration', 'RemainingStrength',
  'SourceEngine', 'CycleStamp'
];
var RIPPLE_TARGET_IDS_CAP = 20;
var RIPPLE_DETAIL_CAP = 300;

// In-world stamp (Y{year}C{cycle}), never a wall clock (S269 wall-clock removal).
function rippleCycleStamp_(ctx) {
  if (typeof inWorldStamp_ === 'function') return inWorldStamp_(ctx);
  return (ctx && ctx.summary && ctx.summary.cycleRef) || '';
}

/**
 * Queue one Ripple_Ledger append. Fail-soft — logs and returns false on any error.
 * @param {Object} ctx  engine context (ctx.persist via writeIntents)
 * @param {Object} e    {causeType, causeId, causeDetail, effectType, targetScope
 *                       (citizen|business|neighborhood|citywide), targetIds[],
 *                       neighborhood, magnitude, duration, remainingStrength,
 *                       sourceEngine, cycle?}
 * @return {boolean} true if queued
 */
function recordRipple_(ctx, e) {
  try {
    if (!ctx || !e) return false;
    if (typeof queueAppendIntent_ !== 'function' || typeof queueEnsureTabIntent_ !== 'function') {
      if (typeof Logger !== 'undefined') Logger.log('recordRipple_: writeIntents unavailable — dropped ' + (e.causeType || '?'));
      return false;
    }
    if (!ctx._rippleTabEnsured) {
      queueEnsureTabIntent_(ctx, RIPPLE_LEDGER_TAB, RIPPLE_LEDGER_HEADERS, 'ripple ledger lazy tab create', 'ripple');
      ctx._rippleTabEnsured = true;
    }
    var S = ctx.summary || {};
    var cycle = (e.cycle !== undefined && e.cycle !== null) ? e.cycle : (S.cycleId || S.cycle || 0);
    var ids = e.targetIds || [];
    if (!Array.isArray(ids)) ids = [ids];
    var idStr = ids.slice(0, RIPPLE_TARGET_IDS_CAP).join('|');
    if (ids.length > RIPPLE_TARGET_IDS_CAP) idStr += '|+' + (ids.length - RIPPLE_TARGET_IDS_CAP) + ' more';
    var detail = String(e.causeDetail || '');
    if (detail.length > RIPPLE_DETAIL_CAP) detail = detail.slice(0, RIPPLE_DETAIL_CAP - 1) + '…';
    var row = [
      cycle,
      e.causeType || '',
      e.causeId || '',
      detail,
      e.effectType || '',
      e.targetScope || '',
      idStr,
      e.neighborhood || '',
      (e.magnitude === undefined || e.magnitude === null) ? '' : e.magnitude,
      (e.duration === undefined || e.duration === null) ? 1 : e.duration,
      (e.remainingStrength === undefined || e.remainingStrength === null) ? '' : e.remainingStrength,
      e.sourceEngine || '',
      rippleCycleStamp_(ctx)
    ];
    queueAppendIntent_(ctx, RIPPLE_LEDGER_TAB, row, 'ripple attribution row', 'ripple');
    ctx._rippleRowsQueued = (ctx._rippleRowsQueued || 0) + 1;
    // In-ctx accumulation for same-cycle consumers — the Phase-7 contract-seed
    // builder joins these against this cycle's citizen events (seed contract v2).
    if (!S.rippleEvents) S.rippleEvents = [];
    S.rippleEvents.push({
      cycle: cycle,
      causeType: e.causeType || '',
      causeId: e.causeId || '',
      causeDetail: detail,
      effectType: e.effectType || '',
      targetScope: e.targetScope || '',
      targetIds: ids.slice(0, RIPPLE_TARGET_IDS_CAP),
      neighborhood: e.neighborhood || '',
      magnitude: (e.magnitude === undefined || e.magnitude === null) ? 0 : e.magnitude,
      duration: (e.duration === undefined || e.duration === null) ? 1 : e.duration,
      remainingStrength: (e.remainingStrength === undefined || e.remainingStrength === null) ? '' : e.remainingStrength,
      sourceEngine: e.sourceEngine || ''
    });
    return true;
  } catch (err) {
    try { if (typeof Logger !== 'undefined') Logger.log('recordRipple_ dropped: ' + err); } catch (ignored) {}
    return false;
  }
}

/**
 * Convenience: persist a story hook (gentrification/migration shape) as a ripple row.
 * Hooks carry {hookType, severity, description, cycleGenerated, neighborhood, popid?}.
 */
function recordHookRipple_(ctx, causeType, hook, sourceEngine) {
  if (!hook) return false;
  return recordRipple_(ctx, {
    causeType: causeType,
    causeId: hook.popid || hook.neighborhood || '',
    causeDetail: hook.description || '',
    effectType: hook.hookType || '',
    targetScope: hook.popid ? 'citizen' : 'neighborhood',
    targetIds: hook.popid ? [hook.popid] : (hook.neighborhood ? [hook.neighborhood] : []),
    neighborhood: hook.neighborhood || '',
    magnitude: hook.severity,
    duration: 1,
    cycle: hook.cycleGenerated,
    sourceEngine: sourceEngine
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RIPPLE_LEDGER_TAB: RIPPLE_LEDGER_TAB,
    RIPPLE_LEDGER_HEADERS: RIPPLE_LEDGER_HEADERS,
    RIPPLE_TARGET_IDS_CAP: RIPPLE_TARGET_IDS_CAP,
    recordRipple_: recordRipple_,
    recordHookRipple_: recordHookRipple_
  };
}
