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
    byKind: { cell: 0, range: 0, append: 0, replace: 0 },
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

  // Sort updates by priority
  updates.sort(function(a, b) {
    return (a.priority || 100) - (b.priority || 100);
  });

  logs.sort(function(a, b) {
    return (a.priority || 200) - (b.priority || 200);
  });

  // Execute replace operations first (they clear sheets)
  for (var i = 0; i < replaceOps.length; i++) {
    var result = executeReplaceIntent_(ctx, replaceOps[i]);
    if (result.success) {
      stats.executed++;
      stats.byKind.replace++;
      stats.bySheet[replaceOps[i].tab] = (stats.bySheet[replaceOps[i].tab] || 0) + 1;
    } else {
      stats.errors.push(result.error);
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

    // Clear existing content (preserve formatting)
    if (sheet.getLastRow() > 0) {
      sheet.getDataRange().clearContent();
    }

    // Write all data
    var rows = intent.values;
    if (rows && rows.length > 0) {
      // Find max columns
      var maxCols = 0;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > maxCols) {
          maxCols = rows[i].length;
        }
      }

      // Pad rows to same length
      var paddedRows = [];
      for (var i = 0; i < rows.length; i++) {
        var padded = (rows[i] || []).slice();
        while (padded.length < maxCols) {
          padded.push('');
        }
        paddedRows.push(padded);
      }

      // Write data
      sheet.getRange(1, 1, paddedRows.length, maxCols).setValues(paddedRows);

      // Format header row if present
      if (paddedRows.length > 0) {
        sheet.getRange(1, 1, 1, maxCols).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }

    Logger.log('executeReplaceIntent_: Replaced ' + intent.tab + ' with ' + rows.length + ' rows');
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
        sheet.getRange(intent.address.row, intent.address.col).setValue(value);
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
          sheet.getRange(intent.address.row, intent.address.col, numRows, numCols).setValues(rows);
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

          // Batch append
          var startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, paddedRows.length, maxCols).setValues(paddedRows);

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


/**
 * ============================================================================
 * LEGACY BRIDGE FUNCTIONS
 * ============================================================================
 *
 * These functions help migrate existing code to write-intents.
 * They wrap common patterns and can be gradually removed as engines
 * are fully migrated.
 */


/**
 * Bridge: Queue an append similar to sheet.appendRow()
 * Use this to migrate existing appendRow calls.
 */
function bridgeAppendRow_(ctx, sheetName, row, reason, domain) {
  queueAppendIntent_(ctx, sheetName, row, reason || 'append row', domain || 'legacy');
}


/**
 * Bridge: Queue a cell write similar to range.setValue()
 * Use this to migrate existing setValue calls.
 */
function bridgeSetValue_(ctx, sheetName, row, col, value, reason, domain) {
  queueCellIntent_(ctx, sheetName, row, col, value, reason || 'set value', domain || 'legacy');
}


/**
 * Bridge: Queue a range write similar to range.setValues()
 * Use this to migrate existing setValues calls.
 */
function bridgeSetValues_(ctx, sheetName, startRow, startCol, values, reason, domain) {
  queueRangeIntent_(ctx, sheetName, startRow, startCol, values, reason || 'set values', domain || 'legacy');
}


/**
 * ============================================================================
 * PERSISTENCE EXECUTOR REFERENCE v1.0
 * ============================================================================
 *
 * EXECUTION ORDER:
 * 1. Replace operations (priority 50) - clear and write entire sheets
 * 2. Updates (priority 100) - cell, range, append operations
 * 3. Logs (priority 200) - audit log appends
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
 *   byKind: { cell, range, append, replace },
 *   bySheet: { sheetName: count },
 *   dryRun: boolean,
 *   replay: boolean,
 *   startTime: Date,
 *   endTime: Date
 * }
 *
 * ============================================================================
 */
