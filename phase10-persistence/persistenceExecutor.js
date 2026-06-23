/**
 * ============================================================================
 * PERSISTENCE EXECUTOR v1.0
 * ============================================================================
 *
 * Executes write intents created by engines during the cycle.
 * This is the ONLY place where sheet writes should occur in V3.
 *
 * v1.0 Features:
 * - Executes all intent types (cell, range, append, replace)
 * - Respects dryRun and replay modes
 * - Batches writes for efficiency
 * - Records execution statistics
 * - Supports rollback on error (future)
 *
 * Call this function in Phase 10 of the engine cycle.
 *
 * Usage:
 *   // In godWorldEngine2.js Phase 10:
 *   safePhaseCall_(ctx, 'Phase10-Persistence', function() {
 *     executePersistIntents_(ctx);
 *   });
 *
 * ============================================================================
 */


/**
 * Executes all pending write intents.
 * @param {Object} ctx - Engine context with persist and mode
 * @returns {Object} Execution statistics
 */
function executePersistIntents_(ctx) {
  var stats = {
    executed: 0,
    skipped: 0,
    errors: [],
    byKind: { cell: 0, range: 0, append: 0, replace: 0, ensure: 0 },
    bySheet: {},
    dryRun: false,
    replay: false,
    startTime: new Date(),
    endTime: null
  };

  // Check if persistence context exists
  if (!ctx.persist) {
    Logger.log('executePersistIntents_: No persist context, nothing to do');
    stats.endTime = new Date();
    return stats;
  }

  // Check mode flags
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  var isReplay = ctx.mode && ctx.mode.replay;
  stats.dryRun = isDryRun;
  stats.replay = isReplay;

  if (isDryRun || isReplay) {
    Logger.log('executePersistIntents_: Mode=' + (isDryRun ? 'dryRun' : 'replay') + ' - logging intents only');
    logIntentSummary_(ctx);
    stats.skipped = getTotalIntentCount_(ctx);
    stats.endTime = new Date();
    return stats;
  }

  // Collect all intents
  var replaceOps = ctx.persist.replaceOps || [];
  var updates = ctx.persist.updates || [];
  var logs = ctx.persist.logs || [];

  // Sort replaceOps by priority — ensure intents (25) fire before replace (50).
  replaceOps.sort(function(a, b) {
    return (a.priority || 50) - (b.priority || 50);
  });

  // Sort updates by priority
  updates.sort(function(a, b) {
    return (a.priority || 100) - (b.priority || 100);
  });

  logs.sort(function(a, b) {
    return (a.priority || 200) - (b.priority || 200);
  });

  // Execute replace + ensure operations first.
  // Idempotency: collapse duplicate ensure intents on same tab to a single
  // creation. Replace ops do not collapse (writer chose to clear).
  var ensuredTabs = {};
  for (var i = 0; i < replaceOps.length; i++) {
    var op = replaceOps[i];
    if (op.kind === 'ensure') {
      if (ensuredTabs[op.tab]) {
        stats.skipped++;
        continue;
      }
      ensuredTabs[op.tab] = true;
      var ensureResult = executeEnsureIntent_(ctx, op);
      if (ensureResult.success) {
        stats.executed++;
        stats.byKind.ensure++;
        stats.bySheet[op.tab] = (stats.bySheet[op.tab] || 0) + 1;
      } else {
        stats.errors.push(ensureResult.error);
      }
    } else if (op.kind === 'replace') {
      var replaceResult = executeReplaceIntent_(ctx, op);
      if (replaceResult.success) {
        stats.executed++;
        stats.byKind.replace++;
        stats.bySheet[op.tab] = (stats.bySheet[op.tab] || 0) + 1;
      } else {
        stats.errors.push(replaceResult.error);
      }
    } else {
      stats.errors.push('Unknown replaceOps intent kind for ' + op.tab + ': ' + op.kind);
    }
  }

  // Group updates by sheet for batching
  var updatesBySheet = groupIntentsBySheet_(updates);

  // Execute updates for each sheet
  for (var sheetName in updatesBySheet) {
    var sheetIntents = updatesBySheet[sheetName];
    var sheetResult = executeSheetIntents_(ctx, sheetName, sheetIntents);

    stats.executed += sheetResult.executed;
    stats.byKind.cell += sheetResult.cells;
    stats.byKind.range += sheetResult.ranges;
    stats.byKind.append += sheetResult.appends;
    stats.bySheet[sheetName] = (stats.bySheet[sheetName] || 0) + sheetResult.executed;

    if (sheetResult.errors.length > 0) {
      for (var e = 0; e < sheetResult.errors.length; e++) {
        stats.errors.push(sheetResult.errors[e]);
      }
    }
  }

  // Execute logs (usually appends to audit sheets)
  var logsBySheet = groupIntentsBySheet_(logs);

  for (var sheetName in logsBySheet) {
    var logIntents = logsBySheet[sheetName];
    var logResult = executeSheetIntents_(ctx, sheetName, logIntents);

    stats.executed += logResult.executed;
    stats.byKind.append += logResult.appends;
    stats.bySheet[sheetName] = (stats.bySheet[sheetName] || 0) + logResult.executed;

    if (logResult.errors.length > 0) {
      for (var e = 0; e < logResult.errors.length; e++) {
        stats.errors.push(logResult.errors[e]);
      }
    }
  }

  stats.endTime = new Date();

  // Log summary
  var durationMs = stats.endTime - stats.startTime;
  Logger.log('executePersistIntents_: Executed ' + stats.executed + ' intents in ' + durationMs + 'ms' +
    (stats.errors.length > 0 ? ' (' + stats.errors.length + ' errors)' : ''));

  // Store stats in ctx for audit
  ctx.persist.executionStats = stats;

  // Clear intents after successful execution
  clearAllIntents_(ctx);

  return stats;
}


/**
 * Retry wrapper for sheet write operations (S271).
 * Transient Google Spreadsheets service errors ("Service Spreadsheets timed
 * out", "try again later", internal errors) are a KNOWN recurring event in
 * this environment. Without retry, a single hiccup during Phase 10 drops the
 * ENTIRE cycle's writes — C100 lost 0/25 intents on one doc timeout. Backoff:
 * 0 / 2 / 5 / 12s. Only transient classes retry; real errors (bad range, type
 * errors) rethrow immediately so genuine bugs still surface. Safe to retry: a
 * thrown setValues writes nothing (atomic all-or-throw); setValue is idempotent
 * (same cell, same value); clearContent+rewrite is idempotent. fn() runs
 * synchronously, so loop-var closures resolve to the current iteration.
 */
function persistWithRetry_(fn, label) {
  var delays = [0, 2000, 5000, 12000];
  var lastErr = null;
  for (var a = 0; a < delays.length; a++) {
    if (delays[a] > 0 && typeof Utilities !== 'undefined') Utilities.sleep(delays[a]);
    try {
      return fn();
    } catch (e) {
      lastErr = e;
      var msg = String((e && e.message) || e);
      if (!/timed out|Service Spreadsheets|try again|temporarily|rate limit|quota|Internal error|too many/i.test(msg)) {
        throw e; // not transient — surface the real bug, don't mask it behind retries
      }
      if (typeof Logger !== 'undefined') {
        Logger.log('persistWithRetry_[' + label + ']: transient attempt ' + (a + 1) + '/' + delays.length + ' — ' + msg);
      }
    }
  }
  throw lastErr;
}


/**
 * Executes an ensure-tab intent.
 * Creates the tab and writes headers if missing; no-op if tab already exists.
 * Idempotency-collapse for same-tab repeats is handled by caller.
 */
function executeEnsureIntent_(ctx, intent) {
  try {
    var validation = validateIntent_(intent);
    if (!validation.valid) {
      return { success: false, error: 'Ensure validation failed: ' + validation.error };
    }

    var sheet = ctx.ss.getSheetByName(intent.tab);
    if (sheet) {
      // Tab exists — no-op. Headers are not enforced against existing tab
      // (writer is responsible for header alignment when reading existing data).
      Logger.log('executeEnsureIntent_: ' + intent.tab + ' already exists — no-op');
      return { success: true };
    }

    var headers = (intent.values && intent.values[0]) || [];
    persistWithRetry_(function() {
      sheet = ctx.ss.getSheetByName(intent.tab) || ctx.ss.insertSheet(intent.tab);
      if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }, intent.tab + ' ensure');
    Logger.log('executeEnsureIntent_: Created ' + intent.tab + ' with ' + headers.length + ' headers');
    return { success: true };

  } catch (e) {
    return { success: false, error: 'Ensure ' + intent.tab + ': ' + e.message };
  }
}


/**
 * Executes a replace intent (clear and write all data).
 */
function executeReplaceIntent_(ctx, intent) {
  try {
    var validation = validateIntent_(intent);
    if (!validation.valid) {
      return { success: false, error: 'Replace validation failed: ' + validation.error };
    }

    var sheet = ctx.ss.getSheetByName(intent.tab);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ctx.ss.insertSheet(intent.tab);
    }

    // Build padded rows first, then clear+write atomically under one retry — a
    // re-attempt re-clears and re-writes, so a transient mid-replace never leaves
    // the tab wiped (S271: clearContent-then-timeout was the one destructive path).
    var rows = intent.values;
    var maxCols = 0;
    var paddedRows = [];
    if (rows && rows.length > 0) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > maxCols) maxCols = rows[i].length;
      }
      for (var i = 0; i < rows.length; i++) {
        var padded = (rows[i] || []).slice();
        while (padded.length < maxCols) padded.push('');
        paddedRows.push(padded);
      }
    }

    persistWithRetry_(function() {
      if (sheet.getLastRow() > 0) sheet.getDataRange().clearContent();
      if (paddedRows.length > 0) {
        sheet.getRange(1, 1, paddedRows.length, maxCols).setValues(paddedRows);
        sheet.getRange(1, 1, 1, maxCols).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }, intent.tab + ' replace');

    Logger.log('executeReplaceIntent_: Replaced ' + intent.tab + ' with ' + (rows ? rows.length : 0) + ' rows');
    return { success: true };

  } catch (e) {
    return { success: false, error: 'Replace ' + intent.tab + ': ' + e.message };
  }
}


/**
 * Executes intents for a single sheet (batched for efficiency).
 */
function executeSheetIntents_(ctx, sheetName, intents) {
  var result = {
    executed: 0,
    cells: 0,
    ranges: 0,
    appends: 0,
    errors: []
  };

  if (!intents || intents.length === 0) {
    return result;
  }

  try {
    var sheet = ctx.ss.getSheetByName(sheetName);

    if (!sheet) {
      // Try to create the sheet
      sheet = ctx.ss.insertSheet(sheetName);
      Logger.log('executeSheetIntents_: Created new sheet ' + sheetName);
    }

    // Separate by kind for batching
    var cellIntents = [];
    var rangeIntents = [];
    var appendIntents = [];

    for (var i = 0; i < intents.length; i++) {
      var intent = intents[i];
      if (intent.kind === 'cell') {
        cellIntents.push(intent);
      } else if (intent.kind === 'range') {
        rangeIntents.push(intent);
      } else if (intent.kind === 'append') {
        appendIntents.push(intent);
      }
    }

    // Execute cell writes (could batch these further)
    for (var i = 0; i < cellIntents.length; i++) {
      var intent = cellIntents[i];
      try {
        var value = intent.values[0][0];
        persistWithRetry_(function() {
          sheet.getRange(intent.address.row, intent.address.col).setValue(value);
        }, sheetName + ' cell');
        result.cells++;
        result.executed++;
      } catch (e) {
        result.errors.push('Cell write ' + sheetName + '[' + intent.address.row + ',' + intent.address.col + ']: ' + e.message);
      }
    }

    // Execute range writes
    for (var i = 0; i < rangeIntents.length; i++) {
      var intent = rangeIntents[i];
      try {
        var rows = intent.values;
        var numRows = rows.length;
        var numCols = rows[0] ? rows[0].length : 0;

        if (numRows > 0 && numCols > 0) {
          persistWithRetry_(function() {
            sheet.getRange(intent.address.row, intent.address.col, numRows, numCols).setValues(rows);
          }, sheetName + ' range');
          result.ranges++;
          result.executed++;
        }
      } catch (e) {
        result.errors.push('Range write ' + sheetName + ': ' + e.message);
      }
    }

    // Batch execute appends
    if (appendIntents.length > 0) {
      try {
        // Collect all rows to append
        var allRows = [];
        for (var i = 0; i < appendIntents.length; i++) {
          var intentRows = appendIntents[i].values;
          for (var j = 0; j < intentRows.length; j++) {
            allRows.push(intentRows[j]);
          }
        }

        if (allRows.length > 0) {
          // Find max columns
          var maxCols = 0;
          for (var i = 0; i < allRows.length; i++) {
            if (allRows[i] && allRows[i].length > maxCols) {
              maxCols = allRows[i].length;
            }
          }

          // Pad rows
          var paddedRows = [];
          for (var i = 0; i < allRows.length; i++) {
            var padded = (allRows[i] || []).slice();
            while (padded.length < maxCols) {
              padded.push('');
            }
            paddedRows.push(padded);
          }

          // Batch append. getLastRow() inside the retry so a re-attempt recomputes
          // the tail (a thrown setValues added nothing, so startRow stays correct —
          // no double-append).
          persistWithRetry_(function() {
            var startRow = sheet.getLastRow() + 1;
            sheet.getRange(startRow, 1, paddedRows.length, maxCols).setValues(paddedRows);
          }, sheetName + ' append');

          result.appends = appendIntents.length;
          result.executed += appendIntents.length;
        }
      } catch (e) {
        result.errors.push('Batch append ' + sheetName + ': ' + e.message);
      }
    }

  } catch (e) {
    result.errors.push('Sheet ' + sheetName + ': ' + e.message);
  }

  return result;
}


/**
 * Groups intents by sheet name.
 */
function groupIntentsBySheet_(intents) {
  var groups = {};
  for (var i = 0; i < intents.length; i++) {
    var tab = intents[i].tab;
    if (!groups[tab]) {
      groups[tab] = [];
    }
    groups[tab].push(intents[i]);
  }
  return groups;
}


/**
 * Gets total count of all pending intents.
 */
function getTotalIntentCount_(ctx) {
  if (!ctx.persist) return 0;
  return (ctx.persist.replaceOps || []).length +
         (ctx.persist.updates || []).length +
         (ctx.persist.logs || []).length;
}


/**
 * Logs a summary of all pending intents (for dryRun/debug).
 */
function logIntentSummary_(ctx) {
  var summary = getIntentSummary_(ctx);

  Logger.log('===== INTENT SUMMARY =====');
  Logger.log('Total intents: ' + summary.totalIntents);
  Logger.log('  Replace ops: ' + summary.replaceOps);
  Logger.log('  Updates: ' + summary.updates);
  Logger.log('  Logs: ' + summary.logs);

  Logger.log('By domain:');
  for (var domain in summary.byDomain) {
    Logger.log('  ' + domain + ': ' + summary.byDomain[domain]);
  }

  Logger.log('By sheet:');
  for (var sheet in summary.bySheet) {
    Logger.log('  ' + sheet + ': ' + summary.bySheet[sheet]);
  }
  Logger.log('==========================');
}


// S185 dead-code scan removals: bridgeAppendRow_, bridgeSetValue_, bridgeSetValues_
// — legacy bridges from the V2→V3 intent-API migration; all engines migrated;
// scan confirmed zero callers. Modern code uses queueAppendIntent_ /
// queueCellIntent_ / queueRangeIntent_ directly.


/**
 * ============================================================================
 * PERSISTENCE EXECUTOR REFERENCE v1.0
 * ============================================================================
 *
 * EXECUTION ORDER:
 * 1. Ensure operations (priority 25) - create tab + headers if missing
 * 2. Replace operations (priority 50) - clear and write entire sheets
 * 3. Updates (priority 100) - cell, range, append operations
 * 4. Logs (priority 200) - audit log appends
 *
 * MODE FLAGS:
 * - ctx.mode.dryRun = true: Log intents, don't execute
 * - ctx.mode.replay = true: Log intents, don't execute
 * - ctx.mode.strict = true: Throw on validation errors
 *
 * BATCHING:
 * - Appends to same sheet are batched into single write
 * - Cell writes could be further optimized (future)
 *
 * ERROR HANDLING:
 * - Errors are collected, not thrown
 * - Check stats.errors after execution
 * - In strict mode, throws on first error
 *
 * STATS RETURNED:
 * {
 *   executed: number,     // Total intents executed
 *   skipped: number,      // Skipped (dryRun/replay)
 *   errors: string[],     // Error messages
 *   byKind: { cell, range, append, replace, ensure },
 *   bySheet: { sheetName: count },
 *   dryRun: boolean,
 *   replay: boolean,
 *   startTime: Date,
 *   endTime: Date
 * }
 *
 * ============================================================================
 */
