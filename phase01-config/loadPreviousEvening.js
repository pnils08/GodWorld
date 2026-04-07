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
    } else {
      S.previousCycleState = null;
      Logger.log('loadPreviousCycleState_: No previous cycle state found (first cycle or cleared)');
    }
  } catch (e) {
    S.previousCycleState = null;
    Logger.log('loadPreviousCycleState_: Failed - ' + e.message);
  }
}
