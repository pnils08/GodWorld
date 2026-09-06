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
// engine.119 Task 3: rows kept per key on the sheet layer. A ring, not a log —
// slots are overwritten in place (the oldest Cycle goes first), never deleted:
// deleteRow is a structural mutation, the same wedge class as insertSheet.
var CARRY_FORWARD_RING = 3;
// engine.119 T3 diag-emit (same pattern as ENGINE59_DIAG / ENGINE95_TIMING_DIAG):
// every ghost skip and sheet recovery is recorded here and rides the fire response
// (utilities/webTrigger.js) — there is no GCP project, so clasp logs are unreachable
// and Logger.log alone cannot prove a recovery from outside.
var CARRY_FORWARD_DIAG = [];

/**
 * Mirror one carry-forward blob into the Carry_Forward_Store tab.
 * Direct write — Phase-10-location carve-out (same class as bondEngine
 * L1469); the tab is engine-owned state, never read mid-cycle by any phase
 * between this write and end-of-cycle. Writes run under retry (engine.119 T2).
 *
 * engine.119 T3: one row per (key, cycle) inside a CARRY_FORWARD_RING-slot ring.
 * Before this the mirror upserted by key alone, so a crashed run's blob (the
 * self-ghost, see loadCarryForwardBlob_) overwrote the only copy of the last
 * GOOD cycle on both layers — which is why recovery needed a manual property
 * wipe plus a version-history restore. Now the good cycle's row survives the
 * ghost and the loader can step back to it.
 */
function mirrorCarryForwardToSheet_(ctx, key, json, cycle) {
  try {
    if (!ctx || !ctx.ss) return;
    var sheet = ctx.ss.getSheetByName(CARRY_FORWARD_STORE_SHEET);
    if (!sheet) {
      // engine.119: never insertSheet mid-run. The prop layer still holds the blob;
      // assertCarryForwardPresent_ is the loud gate if BOTH layers end up empty.
      Logger.log('mirrorCarryForwardToSheet_: ' + CARRY_FORWARD_STORE_SHEET + ' tab missing — mirror for ' + key + ' skipped (pre-create the tab)');
      return;
    }
    var cyc = Number(cycle) || 0;
    var values = sheet.getDataRange().getValues();
    var slots = [];   // { rowIndex (1-based), cycle }
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) === key) slots.push({ rowIndex: r + 1, cycle: Number(values[r][1]) || 0 });
    }
    var target = -1;
    for (var s = 0; s < slots.length; s++) {
      if (slots[s].cycle === cyc) { target = slots[s].rowIndex; break; }   // same cycle → overwrite in place
    }
    if (target < 0 && slots.length >= CARRY_FORWARD_RING) {
      var oldest = slots[0];
      for (var o = 1; o < slots.length; o++) if (slots[o].cycle < oldest.cycle) oldest = slots[o];
      target = oldest.rowIndex;                                             // ring full → reuse the oldest slot
    }
    var row = [key, cyc || '', new Date().toISOString(), json];
    if (target > 0) {
      persistWithRetry_(function() { sheet.getRange(target, 1, 1, 4).setValues([row]); }, 'Carry_Forward_Store ' + key);
    } else {
      appendRowWithRetry_(sheet, row, 'Carry_Forward_Store ' + key);           // ring not full → new slot
    }
  } catch (e) {
    Logger.log('mirrorCarryForwardToSheet_: Failed for ' + key + ' - ' + e.message);
  }
}

/**
 * Read one carry-forward blob from the sheet layer: the row for `key` with the
 * highest Cycle strictly below `beforeCycle` (any cycle when beforeCycle is 0).
 * Returns { json, cycle } or null.
 */
function readCarryForwardFromSheet_(ctx, key, beforeCycle) {
  try {
    if (!ctx || !ctx.ss) return null;
    var sheet = ctx.ss.getSheetByName(CARRY_FORWARD_STORE_SHEET);
    if (!sheet) return null;
    var bound = Number(beforeCycle) || 0;
    var values = sheet.getDataRange().getValues();
    var best = null;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) !== key) continue;
      var json = values[r][3];
      if (!json || !String(json).length) continue;
      var cyc = Number(values[r][1]) || 0;
      if (bound && cyc >= bound) continue;
      if (!best || cyc > best.cycle) best = { json: String(json), cycle: cyc };
    }
    return best;
  } catch (e) {
    Logger.log('readCarryForwardFromSheet_: Failed for ' + key + ' - ' + e.message);
    return null;
  }
}

/**
 * engine.119 T3 — the one writer for a carry-forward blob. Sets the prop, stamps
 * the cycle the blob belongs to in a sibling prop (`<key>_CYCLE`, so a blob with
 * no cycle field of its own — the chaos fold — can still be dated), and mirrors
 * to the sheet ring. Folds the three set+mirror pairs that used to live in
 * saveEveningSnapshot_ / savePreviousCycleState_ / writeChaosNeighborhoodStore_.
 */
function saveCarryForwardBlob_(ctx, key, json, cycle) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(key, json);
  props.setProperty(key + '_CYCLE', String(Number(cycle) || 0));
  mirrorCarryForwardToSheet_(ctx, key, json, cycle);
}

/**
 * Load a carry-forward blob for the cycle about to run. Prop first, sheet
 * fallback; a sheet recovery re-seeds the prop so layer 1 heals itself.
 *
 * engine.119 T3 — self-ghost guard. A run that crashes in Phase 10 has already
 * saved PREV_* for the cycle it was producing (Phase 9), but cycleCount never
 * advanced — so the re-fire is producing THAT SAME cycle and would read the
 * crashed run's half-world as "yesterday". A prop stamped at or past the cycle
 * about to run is that ghost: it is ignored and the sheet ring is asked for the
 * newest row BELOW the cycle (the last good one), which re-seeds the prop. The
 * manual property wipe that recovery used to need is gone. `cycleId` is the
 * cycle about to run; 0 = unknown → no ghost check (dry-run / replay / cold).
 * Legacy props with no `_CYCLE` stamp are trusted (one fire on this code
 * stamps them).
 */
function loadCarryForwardBlob_(ctx, key, cycleId) {
  var props = PropertiesService.getScriptProperties();
  var target = Number(cycleId) || 0;
  var json = props.getProperty(key);
  if (json) {
    var stamped = Number(props.getProperty(key + '_CYCLE')) || 0;
    if (!(target && stamped && stamped >= target)) return json;
    Logger.log('loadCarryForwardBlob_: ' + key + ' prop is a SELF-GHOST (stamped cycle ' + stamped +
      ' >= cycle ' + target + ' about to run — a crashed run wrote it); ignoring, stepping back to the sheet ring');
    CARRY_FORWARD_DIAG.push({ key: key, event: 'ghost-skipped', stamped: stamped, cycleId: target });
  }
  var rec = readCarryForwardFromSheet_(ctx, key, target);
  if (rec && rec.json) {
    props.setProperty(key, rec.json);
    props.setProperty(key + '_CYCLE', String(rec.cycle || 0));
    Logger.log('loadCarryForwardBlob_: ' + key + ' RECOVERED cycle ' + rec.cycle + ' from Carry_Forward_Store (re-seeded the prop)');
    CARRY_FORWARD_DIAG.push({ key: key, event: 'recovered-from-sheet', cycle: rec.cycle, cycleId: target });
    return rec.json;
  }
  if (target) CARRY_FORWARD_DIAG.push({ key: key, event: 'missing', cycleId: target });
  return null;
}

/**
 * Hard gate: past cycle 1, a cycle MUST see the previous cycle's memory in at
 * least one layer, or the run aborts. Called UNWRAPPED (not via
 * safePhaseCall_) so the throw reaches the fatal handler, and placed
 * IMMEDIATELY after Phase1-LoadConfig — before AdvanceTime queues the
 * cycleCount/lastRun bump — so an abort leaves ZERO writes queued (the
 * finally-block cache flush would otherwise commit the counter bump of a
 * run that never happened). Reads ctx.config.cycleCount (last completed
 * cycle), which LoadConfig has just populated.
 * Skips: dry-run, replay, cycleCount < 1. One-shot operator override for a
 * legitimate cold start (fresh bench, S328): set script property
 * CARRY_FORWARD_COLD_START_OK=1 — consumed on use.
 */
function assertCarryForwardPresent_(ctx) {
  if (ctx.mode && (ctx.mode.dryRun || ctx.mode.replay)) return;
  var lastCycle = Number(ctx.config && ctx.config.cycleCount) || 0;
  if (lastCycle < 1) return;
  var cycleId = lastCycle + 1;  // the cycle this run is about to produce
  var props = PropertiesService.getScriptProperties();
  var override = props.getProperty('CARRY_FORWARD_COLD_START_OK');
  if (override) {
    props.deleteProperty('CARRY_FORWARD_COLD_START_OK');
    Logger.log('assertCarryForwardPresent_: cold start explicitly allowed (one-shot override consumed)');
    return;
  }
  // engine.119 T3: the authoritative "cycle about to run", computed BEFORE
  // AdvanceTime bumps ctx.config.cycleCount in memory; the Phase-1/4 loaders read it.
  ctx.carryForwardCycleId = cycleId;
  var missing = [];
  if (!loadCarryForwardBlob_(ctx, 'PREV_EVENING_JSON', cycleId)) missing.push('PREV_EVENING_JSON');
  if (!loadCarryForwardBlob_(ctx, 'PREV_CYCLE_STATE_JSON', cycleId)) missing.push('PREV_CYCLE_STATE_JSON');
  if (missing.length) {
    throw new Error('FATAL: carry-forward memory missing for cycle ' + cycleId + ' (' + missing.join(', ') +
      ') in BOTH script properties and Carry_Forward_Store. The world must not run without yesterday. ' +
      'If this is a deliberate cold start (fresh bench), set script property CARRY_FORWARD_COLD_START_OK=1 and re-fire.');
  }
}

/** The cycle about to run: the assert's stash, else the post-AdvanceTime cycleCount. */
function carryForwardCycleId_(ctx) {
  if (ctx && ctx.carryForwardCycleId) return Number(ctx.carryForwardCycleId) || 0;
  return Number(ctx && ctx.config && ctx.config.cycleCount) || 0;
}

function loadPreviousEvening_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  try {
    var json = loadCarryForwardBlob_(ctx, 'PREV_EVENING_JSON', carryForwardCycleId_(ctx));
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
    var json = loadCarryForwardBlob_(ctx, 'PREV_CYCLE_STATE_JSON', carryForwardCycleId_(ctx));
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
