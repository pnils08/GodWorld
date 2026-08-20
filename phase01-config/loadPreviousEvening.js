/**
 * loadPreviousEvening.js v1.0
 *
 * Loads the previous cycle's evening snapshot from PropertiesService.
 * Called in Phase 1 after loadConfig_. Sets ctx.summary.previousEvening
 * so Phase 5 citizen event generators can reference last night's
 * crowd hotspots, nightlife vibe, safety, sports, famous sightings, etc.
 *
 * People's days are shaped by what happened yesterday, not what's
 * happening tonight. This is the carry-forward mechanism.
 */

// ════════════════════════════════════════════════════════════════════════════
// Carry-forward triple redundancy (engine.122, 2026-08-19)
//
// Layer 1: script properties (fast path, original mechanism).
// Layer 2: Carry_Forward_Store sheet tab — rides the spreadsheet's version
//          history and backups, so a version restore or props wipe no longer
//          erases the cross-cycle memory. Written by the Phase-10 savers.
// Layer 3: output/carry_forward_c{XX}.json on disk, exported per-cycle by
//          scripts/engineAuditor.js from the sheet tab (git-tracked).
//
// Loaders fall back prop → sheet (re-seeding the prop on recovery), and
// assertCarryForwardPresent_ hard-aborts the cycle when BOTH layers are empty
// past cycle 1 — a missing memory is a fatal condition, never a silent
// "first cycle" shrug. (Born from the 2026-08-19 C104 incident: the S380
// recovery deleted the props and the cycle ran without C103's memory.)
// ════════════════════════════════════════════════════════════════════════════

var CARRY_FORWARD_STORE_SHEET = 'Carry_Forward_Store';

/**
 * Upsert one carry-forward blob into the Carry_Forward_Store tab.
 * Direct write — Phase-10-location carve-out (same class as bondEngine
 * L1469); the tab is engine-owned state, never read mid-cycle by any phase
 * between this write and end-of-cycle. Lazy-create kept as fallback only;
 * the tab is pre-created on live (S380 lazy-insertSheet wedge lesson).
 */
function mirrorCarryForwardToSheet_(ctx, key, json, cycle) {
  try {
    if (!ctx || !ctx.ss) return;
    var sheet = ctx.ss.getSheetByName(CARRY_FORWARD_STORE_SHEET);
    if (!sheet) {
      sheet = ctx.ss.insertSheet(CARRY_FORWARD_STORE_SHEET);
      sheet.appendRow(['Key', 'Cycle', 'UpdatedAt', 'JSON']);
      sheet.setFrozenRows(1);
    }
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) === key) { rowIndex = r + 1; break; }
    }
    var row = [key, cycle || '', new Date().toISOString(), json];
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, 4).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  } catch (e) {
    Logger.log('mirrorCarryForwardToSheet_: Failed for ' + key + ' - ' + e.message);
  }
}

/** Read one carry-forward blob from the sheet layer. Returns JSON string or null. */
function readCarryForwardFromSheet_(ctx, key) {
  try {
    if (!ctx || !ctx.ss) return null;
    var sheet = ctx.ss.getSheetByName(CARRY_FORWARD_STORE_SHEET);
    if (!sheet) return null;
    var values = sheet.getDataRange().getValues();
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) === key) {
        var json = values[r][3];
        return (json && String(json).length) ? String(json) : null;
      }
    }
    return null;
  } catch (e) {
    Logger.log('readCarryForwardFromSheet_: Failed for ' + key + ' - ' + e.message);
    return null;
  }
}

/**
 * Load a carry-forward blob: prop first, sheet fallback. On sheet recovery
 * the prop is re-seeded so layer 1 heals itself. Returns JSON string or null.
 */
function loadCarryForwardBlob_(ctx, key) {
  var json = PropertiesService.getScriptProperties().getProperty(key);
  if (json) return json;
  json = readCarryForwardFromSheet_(ctx, key);
  if (json) {
    PropertiesService.getScriptProperties().setProperty(key, json);
    Logger.log('loadCarryForwardBlob_: ' + key + ' RECOVERED from Carry_Forward_Store (prop was missing; re-seeded)');
    return json;
  }
  return null;
}

/**
 * Hard gate: past cycle 1, a cycle MUST see the previous cycle's memory in at
 * least one layer, or the run aborts before any world mutation. Called
 * UNWRAPPED (not via safePhaseCall_) so the throw reaches the fatal handler.
 * Skips: dry-run, replay, cycle <= 1. One-shot operator override for a
 * legitimate cold start (fresh bench, S328): set script property
 * CARRY_FORWARD_COLD_START_OK=1 — consumed on use.
 */
function assertCarryForwardPresent_(ctx) {
  if (ctx.mode && (ctx.mode.dryRun || ctx.mode.replay)) return;
  var cycleId = (ctx.summary && ctx.summary.cycleId) || 0;
  if (cycleId <= 1) return;
  var props = PropertiesService.getScriptProperties();
  var override = props.getProperty('CARRY_FORWARD_COLD_START_OK');
  if (override) {
    props.deleteProperty('CARRY_FORWARD_COLD_START_OK');
    Logger.log('assertCarryForwardPresent_: cold start explicitly allowed (one-shot override consumed)');
    return;
  }
  var missing = [];
  if (!loadCarryForwardBlob_(ctx, 'PREV_EVENING_JSON')) missing.push('PREV_EVENING_JSON');
  if (!loadCarryForwardBlob_(ctx, 'PREV_CYCLE_STATE_JSON')) missing.push('PREV_CYCLE_STATE_JSON');
  if (missing.length) {
    throw new Error('FATAL: carry-forward memory missing for cycle ' + cycleId + ' (' + missing.join(', ') +
      ') in BOTH script properties and Carry_Forward_Store. The world must not run without yesterday. ' +
      'If this is a deliberate cold start (fresh bench), set script property CARRY_FORWARD_COLD_START_OK=1 and re-fire.');
  }
}

function loadPreviousEvening_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  try {
    var json = loadCarryForwardBlob_(ctx, 'PREV_EVENING_JSON');
    if (json) {
      S.previousEvening = JSON.parse(json);
      Logger.log('loadPreviousEvening_: Loaded evening data from cycle ' + (S.previousEvening.cycle || '?'));
    } else {
      S.previousEvening = null;
      Logger.log('loadPreviousEvening_: No previous evening data found (first cycle or cleared)');
    }
  } catch (e) {
    S.previousEvening = null;
    Logger.log('loadPreviousEvening_: Failed - ' + e.message);
  }
}


/**
 * loadPreviousCycleState_ v1.0
 *
 * Restores the previous cycle's finalized state from PropertiesService.
 * Called in Phase 1 after loadConfig_. Sets ctx.summary.previousCycleState
 * so Phase 6 analyzers (ShockMonitor, PatternDetection, CivicLoad) can
 * compare against last cycle's state.
 *
 * Without this, multi-cycle shock arcs, pattern escalation, recovery
 * trajectories, and civic load history are lost between sessions.
 */

function loadPreviousCycleState_(ctx) {
  var S = ctx.summary || (ctx.summary = {});

  // Don't overwrite if already set (e.g., by back-to-back cycle runs)
  if (S.previousCycleState && S.previousCycleState.cycle) {
    Logger.log('loadPreviousCycleState_: Already set for cycle ' + S.previousCycleState.cycle + ' (skipping restore)');
    return;
  }

  try {
    var json = loadCarryForwardBlob_(ctx, 'PREV_CYCLE_STATE_JSON');
    if (json) {
      S.previousCycleState = JSON.parse(json);
      Logger.log('loadPreviousCycleState_: Restored state from cycle ' + (S.previousCycleState.cycle || '?'));
      restoreCarriedRipples_(S);
    } else {
      S.previousCycleState = null;
      Logger.log('loadPreviousCycleState_: No previous cycle state found (first cycle or cleared)');
    }
  } catch (e) {
    S.previousCycleState = null;
    Logger.log('loadPreviousCycleState_: Failed - ' + e.message);
  }
}


/**
 * restoreCarriedRipples_ v1.0 (engine.45 T2)
 *
 * Seeds the live ripple arrays from the restored snapshot so the decay/expiry
 * code in processActiveRipples_ (Phase 6) and applyActiveInitiativeRipples_
 * (post-Phase-6) sees prior-cycle ripples. Before this, both arrays were born
 * empty every cycle and every ripple died at its birth cycle regardless of
 * duration (traces E1/E2/C2) — this is the first multi-cycle ripple mechanism
 * in the sim's history.
 *
 * Only seeds when the live array is empty (back-to-back runs in one execution
 * keep their in-memory state; the snapshot is the cold-start path). Expiry is
 * NOT filtered here — the consumers own expiry semantics.
 */
function restoreCarriedRipples_(S) {
  var prev = S.previousCycleState || {};
  var econ = Array.isArray(prev.economicRipples) ? prev.economicRipples : [];
  var init = Array.isArray(prev.initiativeRipples) ? prev.initiativeRipples : [];

  if (econ.length && !(Array.isArray(S.economicRipples) && S.economicRipples.length)) {
    S.economicRipples = econ;
  }
  if (init.length && !(Array.isArray(S.initiativeRipples) && S.initiativeRipples.length)) {
    S.initiativeRipples = init;
  }
  if (econ.length || init.length) {
    Logger.log('restoreCarriedRipples_: carried ' + econ.length + ' economic + ' +
      init.length + ' initiative ripple(s) from cycle ' + (prev.cycle || '?'));
  }
}

// Dual-use module guard for the Node round-trip test (claspignored *.test.js).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    restoreCarriedRipples_: restoreCarriedRipples_
  };
}
