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

function loadPreviousEvening_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  try {
    var json = PropertiesService.getScriptProperties().getProperty('PREV_EVENING_JSON');
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
    var json = PropertiesService.getScriptProperties().getProperty('PREV_CYCLE_STATE_JSON');
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
