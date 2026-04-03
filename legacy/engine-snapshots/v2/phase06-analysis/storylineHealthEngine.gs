/**
 * ============================================================================
 * STORYLINE HEALTH ENGINE v1.0
 * ============================================================================
 *
 * Monitors storyline health, detects stale storylines, checks resolution
 * conditions, and generates wrap-up hooks.
 *
 * Part of: Week 4 Storyline Resolution & Hook Lifecycle
 *
 * Features:
 * - Stale storyline detection (>N cycles without coverage)
 * - Resolution condition checking
 * - Automatic wrap-up hook generation
 * - Fizzled storyline flagging (>15 cycles dormant)
 * - Coverage gap tracking
 *
 * Integration:
 * - Called from Phase 06 after analysis
 * - Updates Storyline_Tracker with IsStale and WrapUpGenerated flags
 * - Generates STORYLINE_WRAP, STALE_STORYLINE, STORYLINE_FIZZLED hooks
 *
 * Story Hooks Generated:
 * - STORYLINE_WRAP (severity 5-6): Natural conclusion available
 * - STALE_STORYLINE (severity 3): Dormant >10 cycles, needs revival or close
 * - STORYLINE_FIZZLED (severity 2): Auto-closed due to inactivity >15 cycles
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var DEFAULT_STALE_THRESHOLD = 10;  // Cycles without coverage before stale
var FIZZLE_THRESHOLD = 15;          // Cycles before auto-resolving as fizzled
var HIGH_PRIORITY_STALE = 7;        // High-priority storyline stale threshold (shorter)


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Monitor storyline health for current cycle.
 * Detects stale storylines and generates resolution hooks.
 *
 * @param {Object} ctx - Cycle context
 * @returns {Object} - Processing results
 */
function monitorStorylineHealth_(ctx) {
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount;
  var S = ctx.summary;

  var results = {
    processed: 0,
    stale: 0,
    fizzled: 0,
    wrapped: 0,
    errors: []
  };

  try {
    // Load active storylines
    var storylines = loadActiveStorylines_(ss);
    if (storylines.length === 0) {
      return results;
    }

    results.processed = storylines.length;

    // Update coverage gaps
    updateCoverageGaps_(ss, storylines, cycle);

    // Detect stale storylines
    var staleStorylines = detectStaleStorylines_(ss, storylines, cycle);
    results.stale = staleStorylines.length;

    // Detect fizzled storylines (very stale)
    var fizzledStorylines = detectFizzledStorylines_(ss, storylines, cycle);
    results.fizzled = fizzledStorylines.length;

    // Check resolution conditions
    var readyToWrap = checkResolutionConditions_(ss, storylines, cycle);
    results.wrapped = readyToWrap.length;

    // Generate hooks
    var hooks = [];

    // Wrap-up hooks (natural conclusions)
    for (var i = 0; i < readyToWrap.length; i++) {
      hooks.push(generateWrapUpHook_(readyToWrap[i]));
    }

    // Stale storyline hooks
    for (var i = 0; i < staleStorylines.length; i++) {
      hooks.push(generateStaleHook_(staleStorylines[i]));
    }

    // Fizzled storyline hooks
    for (var i = 0; i < fizzledStorylines.length; i++) {
      hooks.push(generateFizzledHook_(fizzledStorylines[i]));
    }

    // Add hooks to context
    if (!S.storyHooks) S.storyHooks = [];
    S.storyHooks = S.storyHooks.concat(hooks);

    // Save results to context
    S.storylineHealth = results;

  } catch (err) {
    results.errors.push(err.toString());
    Logger.log('monitorStorylineHealth_ ERROR: ' + err);
  }

  Logger.log('monitorStorylineHealth_ v1.0: Complete.');
  Logger.log('Processed: ' + results.processed + ', Stale: ' + results.stale +
             ', Fizzled: ' + results.fizzled + ', Ready to wrap: ' + results.wrapped);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadActiveStorylines_(ss) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var storylines = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = String(row[headers.indexOf('Status')] || '').toLowerCase();

    // Only process active storylines
    if (status !== 'active') continue;

    var storyline = {
      rowIndex: i + 1,
      storylineId: row[headers.indexOf('StorylineId')] || '',
      title: row[headers.indexOf('Title')] || '',
      status: status,
      priority: row[headers.indexOf('Priority')] || '',
      lastCoverageCycle: row[headers.indexOf('LastCoverageCycle')] || '',
      mentionCount: row[headers.indexOf('MentionCount')] || 0,
      coverageGap: row[headers.indexOf('CoverageGap')] || 0,
      resolutionCondition: row[headers.indexOf('ResolutionCondition')] || '',
      staleAfterCycles: row[headers.indexOf('StaleAfterCycles')] || DEFAULT_STALE_THRESHOLD,
      isStale: row[headers.indexOf('IsStale')] || false,
      wrapUpGenerated: row[headers.indexOf('WrapUpGenerated')] || false
    };

    storylines.push(storyline);
  }

  return storylines;
}


// ════════════════════════════════════════════════════════════════════════════
// COVERAGE GAP TRACKING
// ════════════════════════════════════════════════════════════════════════════

function updateCoverageGaps_(ss, storylines, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var gapColIndex = headers.indexOf('CoverageGap') + 1;

  if (gapColIndex === 0) {
    Logger.log('Warning: CoverageGap column not found (Week 1 column). Skipping gap update.');
    return;
  }

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];
    var gap = 0;

    if (storyline.lastCoverageCycle) {
      gap = cycle - Number(storyline.lastCoverageCycle);
    } else {
      // No coverage yet, gap = age of storyline (if we had created cycle)
      gap = 0; // Conservative default
    }

    // Update gap in sheet
    sheet.getRange(storyline.rowIndex, gapColIndex).setValue(gap);

    // Update in-memory object
    storyline.coverageGap = gap;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// STALE DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectStaleStorylines_(ss, storylines, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var isStaleColIndex = headers.indexOf('IsStale') + 1;

  if (isStaleColIndex === 0) {
    Logger.log('Warning: IsStale column not found. Run migration first.');
    return [];
  }

  var stale = [];

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];

    // Determine stale threshold
    var threshold = storyline.staleAfterCycles;
    if (storyline.priority === 'high' && threshold > HIGH_PRIORITY_STALE) {
      threshold = HIGH_PRIORITY_STALE;
    }

    // Check if stale
    var isStale = storyline.coverageGap >= threshold;

    if (isStale && !storyline.isStale) {
      // Newly stale
      stale.push(storyline);

      // Update sheet
      sheet.getRange(storyline.rowIndex, isStaleColIndex).setValue(true);
      storyline.isStale = true;

    } else if (!isStale && storyline.isStale) {
      // No longer stale (recently covered)
      sheet.getRange(storyline.rowIndex, isStaleColIndex).setValue(false);
      storyline.isStale = false;
    }
  }

  return stale;
}


// ════════════════════════════════════════════════════════════════════════════
// FIZZLE DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectFizzledStorylines_(ss, storylines, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusColIndex = headers.indexOf('Status') + 1;

  var fizzled = [];

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];

    // Check if coverage gap exceeds fizzle threshold
    if (storyline.coverageGap >= FIZZLE_THRESHOLD) {
      fizzled.push(storyline);

      // Auto-resolve as "resolved" (fizzled)
      sheet.getRange(storyline.rowIndex, statusColIndex).setValue('resolved');
      storyline.status = 'resolved';

      // Note: Could add a ResolutionNotes column update here if it exists
    }
  }

  return fizzled;
}


// ════════════════════════════════════════════════════════════════════════════
// RESOLUTION CONDITIONS
// ════════════════════════════════════════════════════════════════════════════

function checkResolutionConditions_(ss, storylines, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var wrapUpColIndex = headers.indexOf('WrapUpGenerated') + 1;

  if (wrapUpColIndex === 0) {
    Logger.log('Warning: WrapUpGenerated column not found. Run migration first.');
    return [];
  }

  var readyToWrap = [];

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];

    // Skip if wrap-up already generated
    if (storyline.wrapUpGenerated) continue;

    // Check resolution condition
    var shouldWrap = false;

    if (storyline.resolutionCondition) {
      // Check if condition is met (basic keyword matching)
      shouldWrap = checkResolutionKeywords_(storyline.resolutionCondition, cycle);
    } else {
      // No explicit condition: check if naturally concluded
      // (e.g., high mention count + recent stale)
      if (storyline.mentionCount >= 5 && storyline.coverageGap >= 5 && storyline.coverageGap < 10) {
        shouldWrap = true;
      }
    }

    if (shouldWrap) {
      readyToWrap.push(storyline);

      // Mark wrap-up generated
      sheet.getRange(storyline.rowIndex, wrapUpColIndex).setValue(true);
      storyline.wrapUpGenerated = true;
    }
  }

  return readyToWrap;
}

function checkResolutionKeywords_(condition, cycle) {
  // Simple keyword-based resolution checking
  // In production, this would check actual initiative status, citizen status, etc.

  var keywords = condition.toLowerCase();

  // Example keywords:
  // - "initiative passes" → check initiative status
  // - "citizen deceased" → check citizen status
  // - "10 cycles" → check cycle count

  // For now, return false (manual resolution required)
  // Future enhancement: integrate with Initiative_Tracker, Simulation_Ledger, etc.

  return false;
}


// ════════════════════════════════════════════════════════════════════════════
// HOOK GENERATION
// ════════════════════════════════════════════════════════════════════════════

function generateWrapUpHook_(storyline) {
  var severity = 5;
  if (storyline.priority === 'high') severity = 6;

  return {
    hookType: 'STORYLINE_WRAP',
    storylineId: storyline.storylineId,
    title: storyline.title,
    mentionCount: storyline.mentionCount,
    severity: severity,
    description: 'Storyline "' + storyline.title + '" ready for wrap-up conclusion'
  };
}

function generateStaleHook_(storyline) {
  return {
    hookType: 'STALE_STORYLINE',
    storylineId: storyline.storylineId,
    title: storyline.title,
    coverageGap: storyline.coverageGap,
    severity: 3,
    description: 'Storyline "' + storyline.title + '" dormant for ' + storyline.coverageGap + ' cycles'
  };
}

function generateFizzledHook_(storyline) {
  return {
    hookType: 'STORYLINE_FIZZLED',
    storylineId: storyline.storylineId,
    title: storyline.title,
    coverageGap: storyline.coverageGap,
    severity: 2,
    description: 'Storyline "' + storyline.title + '" auto-closed after ' + storyline.coverageGap + ' cycles inactive'
  };
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Main function for external calls
