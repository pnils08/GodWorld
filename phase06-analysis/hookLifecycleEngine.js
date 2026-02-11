/**
 * ============================================================================
 * HOOK LIFECYCLE ENGINE v1.0
 * ============================================================================
 *
 * Manages story hook lifecycle: tracks age, applies expiration, decays priority,
 * and archives stale hooks.
 *
 * Part of: Week 4 Storyline Resolution & Hook Lifecycle
 *
 * Features:
 * - Hook age calculation (cycles since generation)
 * - Hook expiration (archive hooks unused for >N cycles)
 * - Priority decay (reduce priority as hook ages)
 * - Pickup tracking (when hook was used in edition)
 * - Stale hook archival
 *
 * Integration:
 * - Called from Phase 06 after analysis
 * - Updates Story_Hook_Deck with HookAge, IsExpired, PickupCycle
 * - Companion to storyHook.js v3.9
 *
 * Note: This engine works alongside storyHook.js without modifying it.
 * For full v4.0 integration, these functions would be merged into storyHook.js.
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var DEFAULT_EXPIRATION_CYCLES = 5;  // Archive hooks unused for this many cycles
var PRIORITY_DECAY_RATE = 0.1;      // Priority reduction per cycle (e.g., 10% per cycle)
var MIN_PRIORITY = 1;                // Minimum priority floor


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Manage hook lifecycle for current cycle.
 * Updates hook age, applies expiration, decays priority.
 *
 * @param {Object} ctx - Cycle context
 * @returns {Object} - Processing results
 */
function manageHookLifecycle_(ctx) {
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount;
  var S = ctx.summary;

  var results = {
    processed: 0,
    expired: 0,
    decayed: 0,
    errors: []
  };

  try {
    // Load story hooks
    var hooks = loadStoryHooks_(ss);
    if (hooks.length === 0) {
      return results;
    }

    results.processed = hooks.length;

    // Calculate hook age
    calculateHookAge_(ss, hooks, cycle);

    // Check for expired hooks
    var expiredHooks = detectExpiredHooks_(ss, hooks, cycle);
    results.expired = expiredHooks.length;

    // Decay hook priority
    var decayedHooks = decayHookPriority_(ss, hooks, cycle);
    results.decayed = decayedHooks.length;

    // Archive expired hooks (move to Story_Hook_Archive or mark IsExpired)
    archiveExpiredHooks_(ss, expiredHooks);

    // Save results to context
    S.hookLifecycle = results;

  } catch (err) {
    results.errors.push(err.toString());
    Logger.log('manageHookLifecycle_ ERROR: ' + err);
  }

  Logger.log('manageHookLifecycle_ v1.0: Complete.');
  Logger.log('Processed: ' + results.processed + ', Expired: ' + results.expired +
             ', Priority decayed: ' + results.decayed);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadStoryHooks_(ss) {
  var sheet = ss.getSheetByName('Story_Hook_Deck');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var hooks = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip if already archived/picked up
    var pickedUp = row[headers.indexOf('PickedUp')] || '';
    if (pickedUp === 'yes' || pickedUp === true) continue;

    var hook = {
      rowIndex: i + 1,
      hookId: row[headers.indexOf('HookId')] || '',
      hookType: row[headers.indexOf('HookType')] || '',
      priority: row[headers.indexOf('Priority')] || '',
      severity: row[headers.indexOf('Severity')] || 5,
      createdCycle: row[headers.indexOf('CreatedCycle')] || '',
      hookAge: row[headers.indexOf('HookAge')] || 0,
      expiresAfter: row[headers.indexOf('ExpiresAfter')] || DEFAULT_EXPIRATION_CYCLES,
      isExpired: row[headers.indexOf('IsExpired')] || false,
      pickupCycle: row[headers.indexOf('PickupCycle')] || ''
    };

    hooks.push(hook);
  }

  return hooks;
}


// ════════════════════════════════════════════════════════════════════════════
// AGE CALCULATION
// ════════════════════════════════════════════════════════════════════════════

function calculateHookAge_(ss, hooks, cycle) {
  var sheet = ss.getSheetByName('Story_Hook_Deck');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ageColIndex = headers.indexOf('HookAge') + 1;

  if (ageColIndex === 0) {
    Logger.log('Warning: HookAge column not found. Run migration first.');
    return;
  }

  for (var i = 0; i < hooks.length; i++) {
    var hook = hooks[i];
    var age = 0;

    if (hook.createdCycle) {
      age = cycle - Number(hook.createdCycle);
    }

    // Update age in sheet
    sheet.getRange(hook.rowIndex, ageColIndex).setValue(age);

    // Update in-memory object
    hook.hookAge = age;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// EXPIRATION DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectExpiredHooks_(ss, hooks, cycle) {
  var sheet = ss.getSheetByName('Story_Hook_Deck');
  if (!sheet) return [];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var isExpiredColIndex = headers.indexOf('IsExpired') + 1;

  if (isExpiredColIndex === 0) {
    Logger.log('Warning: IsExpired column not found. Run migration first.');
    return [];
  }

  var expired = [];

  for (var i = 0; i < hooks.length; i++) {
    var hook = hooks[i];

    // Check if hook has exceeded expiration threshold
    if (hook.hookAge >= hook.expiresAfter && !hook.isExpired) {
      expired.push(hook);

      // Mark as expired
      sheet.getRange(hook.rowIndex, isExpiredColIndex).setValue(true);
      hook.isExpired = true;
    }
  }

  return expired;
}


// ════════════════════════════════════════════════════════════════════════════
// PRIORITY DECAY
// ════════════════════════════════════════════════════════════════════════════

function decayHookPriority_(ss, hooks, cycle) {
  var sheet = ss.getSheetByName('Story_Hook_Deck');
  if (!sheet) return [];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var severityColIndex = headers.indexOf('Severity') + 1;

  if (severityColIndex === 0) {
    Logger.log('Warning: Severity column not found.');
    return [];
  }

  var decayed = [];

  for (var i = 0; i < hooks.length; i++) {
    var hook = hooks[i];

    // Only decay hooks older than 2 cycles
    if (hook.hookAge <= 2) continue;

    // Calculate decay amount
    var currentSeverity = Number(hook.severity);
    var decayAmount = Math.floor(hook.hookAge * PRIORITY_DECAY_RATE);
    var newSeverity = Math.max(MIN_PRIORITY, currentSeverity - decayAmount);

    // Only update if changed
    if (newSeverity !== currentSeverity) {
      decayed.push(hook);

      // Update severity
      sheet.getRange(hook.rowIndex, severityColIndex).setValue(newSeverity);
      hook.severity = newSeverity;
    }
  }

  return decayed;
}


// ════════════════════════════════════════════════════════════════════════════
// ARCHIVAL
// ════════════════════════════════════════════════════════════════════════════

function archiveExpiredHooks_(ss, expiredHooks) {
  if (expiredHooks.length === 0) return;

  // Option 1: Move to Story_Hook_Archive sheet (if it exists)
  var archiveSheet = ss.getSheetByName('Story_Hook_Archive');

  if (archiveSheet) {
    // Copy expired hooks to archive
    var hookSheet = ss.getSheetByName('Story_Hook_Deck');
    var headers = hookSheet.getRange(1, 1, 1, hookSheet.getLastColumn()).getValues()[0];

    for (var i = 0; i < expiredHooks.length; i++) {
      var hook = expiredHooks[i];
      var rowData = hookSheet.getRange(hook.rowIndex, 1, 1, headers.length).getValues()[0];

      // Append to archive
      archiveSheet.appendRow(rowData);
    }

    Logger.log('Archived ' + expiredHooks.length + ' expired hooks to Story_Hook_Archive');
  } else {
    // Option 2: Just mark as expired (IsExpired = true already set)
    Logger.log('Marked ' + expiredHooks.length + ' hooks as expired (no archive sheet)');
  }
}


// ════════════════════════════════════════════════════════════════════════════
// PICKUP TRACKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mark a hook as picked up by edition.
 * Called when hook is used in article generation.
 *
 * @param {Object} ss - Spreadsheet
 * @param {string} hookId - Hook ID
 * @param {number} cycle - Current cycle
 */
function markHookPickedUp_(ss, hookId, cycle) {
  var sheet = ss.getSheetByName('Story_Hook_Deck');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var hookIdCol = headers.indexOf('HookId');
  var pickupCycleCol = headers.indexOf('PickupCycle') + 1;
  var pickedUpCol = headers.indexOf('PickedUp') + 1;

  if (pickupCycleCol === 0) {
    Logger.log('Warning: PickupCycle column not found. Run migration first.');
    return;
  }

  // Find hook row
  for (var i = 1; i < data.length; i++) {
    if (data[i][hookIdCol] === hookId) {
      // Mark as picked up
      if (pickupCycleCol > 0) {
        sheet.getRange(i + 1, pickupCycleCol).setValue(cycle);
      }
      if (pickedUpCol > 0) {
        sheet.getRange(i + 1, pickedUpCol).setValue('yes');
      }

      Logger.log('Hook ' + hookId + ' marked as picked up in cycle ' + cycle);
      return;
    }
  }

  Logger.log('Warning: Hook ' + hookId + ' not found in Story_Hook_Deck');
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Main function for external calls
// markHookPickedUp_ can be called from edition processing
