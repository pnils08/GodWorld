/**
 * applyChaosDecay.js — Phase 5 chaos-cars BUSINESS-scope decay applier (engine.11 T4.2).
 *
 * [engine/sheet] chaos-cars plan §S265 (tri-partite decay ownership). This owns BUSINESS
 * decay only: neighborhood residuals decay in the Phase-10 writer fold; citizen events have
 * no decay (the col-O compressLifeHistory fold is one-time). Filtering to business-scope is
 * mandatory — decaying all scopes here double-counts the neighborhood residual.
 *
 * Of the two business columns, only Annual_Revenue decays: Employee_Count is permanent (churn,
 * DECAY_RULES rate 0) AND has a real non-zero baseline (350-1000 live), so it is written once
 * by the generator and never touched here (recomputing would clobber the baseline). Annual_Revenue
 * is chaos-owned (empty live → base 0) and decays toward baseline.
 *
 * MODEL (§S265-faithful, incremental): each cycle apply the per-cycle revert STEP for every past
 * business chaos event with cyclesSince >= 1 (cyclesSince 0 = this cycle, already applied by the
 * generator's flushBusinessFold_). Step = residual(n) - residual(n-1), reusing the tested
 * chaosResidualAfter_ from utilities/chaosCarsDecay.js. Steps accumulate per business → one
 * queueCellIntent_ each (added to the current cell, which already holds prior reverts).
 *
 * CAVEAT (flag for Phase 6 / T6.2 hardening): incremental-on-a-persistent-sheet is NOT idempotent
 * — re-running the same cycle double-applies the revert step. The neighborhood path is re-run safe
 * (residual lives in ctx.summary, rebuilt each run); business is not. Acceptable for a C99-gated,
 * dry-run-validated, low-signal channel (Annual_Revenue is empty today). Harden if Annual_Revenue
 * gains a non-chaos writer or cycle re-runs become routine.
 *
 * Apps Script global style (clasped). Reads Chaos_Cars + Business_Ledger directly (reads are
 * allowed; writes via queueCellIntent_). Dual-use module guard for the Node test.
 */

var CHAOS_DECAY_DECAYING_COL = 'Annual_Revenue'; // the only business column that decays here
var CHAOS_DECAY_LOOKBACK = 60; // cycles; beyond this Annual_Revenue residuals are ~0 (rate 0.10 → (0.9)^60≈0.0018)

function applyChaosDecay_(ctx) {
  var cycle = ctx.cycle || (ctx.summary && ctx.summary.cycle) || 0;

  // Read Chaos_Cars (direct read OK). Absent (pre-first-cycle) → nothing to decay.
  var ccSheet = ctx.ss.getSheetByName('Chaos_Cars');
  if (!ccSheet) return { reverted: 0 };
  var cc = ccSheet.getDataRange().getValues();
  if (cc.length < 2) return { reverted: 0 };
  var ch = cc[0];
  var iCycle = ch.indexOf('CycleId');
  var iScope = ch.indexOf('TargetScope');
  var iTarget = ch.indexOf('TargetId');
  var iMetric = ch.indexOf('PrimaryMetric');
  var iMag = ch.indexOf('MetricMagnitude');
  if (iScope < 0 || iMetric < 0) return { reverted: 0 };

  // Accumulate revert step per bizId.
  var stepByBiz = {};
  for (var r = 1; r < cc.length; r++) {
    var row = cc[r];
    if (row[iScope] !== 'business') continue;                 // business-scope ONLY (§S265)
    if (row[iMetric] !== CHAOS_DECAY_DECAYING_COL) continue;  // Annual_Revenue only (Employee_Count permanent)
    var eCycle = Number(row[iCycle]) || 0;
    var cyclesSince = cycle - eCycle;
    if (cyclesSince < 1) continue;                            // this cycle's events already applied by generator
    if (cyclesSince > CHAOS_DECAY_LOOKBACK) continue;         // fully decayed; skip
    var mag = Number(row[iMag]) || 0;
    if (!mag) continue;
    // revert step = residual(n) - residual(n-1)  (move toward baseline; opposite sign of mag)
    var step = chaosResidualAfter_(mag, CHAOS_DECAY_DECAYING_COL, cyclesSince)
             - chaosResidualAfter_(mag, CHAOS_DECAY_DECAYING_COL, cyclesSince - 1);
    if (Math.abs(step) < 0.005) continue;
    var bizId = row[iTarget];
    stepByBiz[bizId] = (stepByBiz[bizId] || 0) + step;
  }

  var bizIds = [];
  for (var k in stepByBiz) if (stepByBiz.hasOwnProperty(k)) bizIds.push(k);
  if (!bizIds.length) return { reverted: 0 };

  // Map bizId → sheet row + trimmed Annual_Revenue column.
  var blSheet = ctx.ss.getSheetByName('Business_Ledger');
  if (!blSheet) return { reverted: 0 };
  var bl = blSheet.getDataRange().getValues();
  var bh = bl[0] || [];
  var iId = bh.indexOf('BIZ_ID');
  var iRev = -1;
  for (var c = 0; c < bh.length; c++) if (String(bh[c]).trim() === CHAOS_DECAY_DECAYING_COL) { iRev = c; break; }
  if (iId < 0 || iRev < 0) {
    throw new Error('applyChaosDecay_: Business_Ledger missing BIZ_ID or trimmed Annual_Revenue column');
  }
  var rowByBiz = {};
  // bl includes the header at index 0, so bl[b] is sheet row b+1 (1-based, past header).
  for (var b = 1; b < bl.length; b++) rowByBiz[bl[b][iId]] = b;

  var reverted = 0;
  for (var x = 0; x < bizIds.length; x++) {
    var id = bizIds[x];
    if (!(id in rowByBiz)) continue; // business no longer in ledger; skip its residual
    var dataIdx = rowByBiz[id];
    var cur = Number(bl[dataIdx][iRev]) || 0;
    var next = Math.round((cur + stepByBiz[id]) * 100) / 100;
    queueCellIntent_(ctx, 'Business_Ledger', dataIdx + 1, iRev + 1, next, 'chaos_cars revenue decay', 'chaos');
    reverted++;
  }
  Logger.log('applyChaosDecay_: reverted Annual_Revenue on ' + reverted + ' businesses (cycle ' + cycle + ')');
  return { reverted: reverted };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAOS_DECAY_DECAYING_COL: CHAOS_DECAY_DECAYING_COL,
    CHAOS_DECAY_LOOKBACK: CHAOS_DECAY_LOOKBACK,
    applyChaosDecay_: applyChaosDecay_
  };
}
