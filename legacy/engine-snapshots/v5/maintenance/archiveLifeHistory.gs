/**
 * ============================================================================
 * archiveLifeHistory.js v1.0
 * ============================================================================
 *
 * Maintenance script: moves old LifeHistory_Log rows to LifeHistory_Archive.
 *
 * LifeHistory_Log grows 20-50 rows per cycle. At C81 it has ~2,552 rows.
 * Without intervention it hits 10,000 rows around C250 and degrades Sheets
 * performance. The data is already compressed into Simulation_Ledger via
 * compressLifeHistory.js, so these rows are an audit trail — safe to archive.
 *
 * HOW TO RUN:
 *   1. Open Apps Script editor
 *   2. Select archiveLifeHistory (or archiveLifeHistoryDryRun for preview)
 *   3. Click Run
 *
 * WHAT IT DOES:
 *   - Reads LifeHistory_Log
 *   - Identifies rows where Cycle < (maxCycle - retainCycles)
 *   - Creates LifeHistory_Archive sheet if it doesn't exist
 *   - Appends old rows to LifeHistory_Archive
 *   - Deletes old rows from LifeHistory_Log
 *   - Logs summary
 *
 * SAFE TO RUN REPEATEDLY: Only archives rows not already moved.
 *
 * @version 1.0
 * @phase maintenance
 * ============================================================================
 */

// How many recent cycles to keep in the active sheet
var ARCHIVE_RETAIN_CYCLES = 50;

// ============================================================================
// PUBLIC ENTRY POINTS (appear in Apps Script Run menu)
// ============================================================================

/**
 * Archive old LifeHistory_Log rows (live mode).
 * RUN THIS ONE for real archival.
 */
function archiveLifeHistory() {
  runArchive_(false);
}

/**
 * Preview what would be archived without changing any data.
 */
function archiveLifeHistoryDryRun() {
  runArchive_(true);
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

function runArchive_(dryRun) {
  var ss = openSimSpreadsheet_();

  // --- Read LifeHistory_Log ---
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!logSheet) {
    Logger.log('archiveLifeHistory: LifeHistory_Log sheet not found');
    return;
  }

  var allData = logSheet.getDataRange().getValues();
  if (allData.length < 2) {
    Logger.log('archiveLifeHistory: No data rows to process');
    return;
  }

  var header = allData[0];
  var rows = allData.slice(1);

  // --- Find Cycle column ---
  var iCycle = header.indexOf('Cycle');
  if (iCycle < 0) {
    // Fallback: try column G (index 6) which is where Cycle lives per schema
    iCycle = 6;
    Logger.log('archiveLifeHistory: "Cycle" header not found, using column G (index 6)');
  }

  // --- Determine max cycle from data ---
  var maxCycle = 0;
  for (var i = 0; i < rows.length; i++) {
    var c = parseInt(rows[i][iCycle], 10);
    if (!isNaN(c) && c > maxCycle) maxCycle = c;
  }

  if (maxCycle === 0) {
    Logger.log('archiveLifeHistory: Could not determine max cycle from data');
    return;
  }

  var cutoff = maxCycle - ARCHIVE_RETAIN_CYCLES;
  Logger.log('archiveLifeHistory: maxCycle=' + maxCycle +
    ', retainCycles=' + ARCHIVE_RETAIN_CYCLES +
    ', cutoff=' + cutoff +
    ', totalRows=' + rows.length);

  // --- Split rows into keep vs archive ---
  var keepRows = [];
  var archiveRows = [];

  for (var j = 0; j < rows.length; j++) {
    var cycle = parseInt(rows[j][iCycle], 10);

    // Rows with no valid cycle number stay in the active sheet (safety)
    if (isNaN(cycle) || cycle > cutoff) {
      keepRows.push(rows[j]);
    } else {
      archiveRows.push(rows[j]);
    }
  }

  Logger.log('archiveLifeHistory: ' + archiveRows.length + ' rows to archive, ' +
    keepRows.length + ' rows to keep');

  if (archiveRows.length === 0) {
    Logger.log('archiveLifeHistory: Nothing to archive (all rows within retention window)');
    return;
  }

  if (dryRun) {
    Logger.log('archiveLifeHistory: DRY RUN — no changes made');
    logCycleSummary_(archiveRows, iCycle, 'Would archive');
    return;
  }

  // --- Get or create LifeHistory_Archive sheet ---
  var archiveSheet = ss.getSheetByName('LifeHistory_Archive');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('LifeHistory_Archive');
    // Write header row
    archiveSheet.getRange(1, 1, 1, header.length).setValues([header]);
    Logger.log('archiveLifeHistory: Created LifeHistory_Archive sheet');
  }

  // --- Append archived rows to archive sheet ---
  var archiveLastRow = archiveSheet.getLastRow();
  archiveSheet.getRange(archiveLastRow + 1, 1, archiveRows.length, archiveRows[0].length)
    .setValues(archiveRows);

  Logger.log('archiveLifeHistory: Appended ' + archiveRows.length +
    ' rows to LifeHistory_Archive (now ' + (archiveLastRow + archiveRows.length) + ' rows)');

  // --- Rewrite LifeHistory_Log with only kept rows ---
  // Clear all data rows (keep header)
  if (logSheet.getLastRow() > 1) {
    logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).clearContent();
  }

  // Write back kept rows
  if (keepRows.length > 0) {
    logSheet.getRange(2, 1, keepRows.length, keepRows[0].length).setValues(keepRows);
  }

  // Delete any extra empty rows beyond the data (clean up sheet size)
  var excessRows = logSheet.getMaxRows() - (keepRows.length + 1);
  if (excessRows > 50) {
    // Keep a small buffer of empty rows, remove the rest
    logSheet.deleteRows(keepRows.length + 2 + 50, excessRows - 50);
  }

  Logger.log('archiveLifeHistory: LifeHistory_Log now has ' + keepRows.length + ' data rows');

  // --- Summary ---
  logCycleSummary_(archiveRows, iCycle, 'Archived');
  Logger.log('archiveLifeHistory v1.0: COMPLETE — ' +
    archiveRows.length + ' archived, ' +
    keepRows.length + ' retained');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Log a breakdown of archived rows by cycle range.
 */
function logCycleSummary_(rows, iCycle, label) {
  var cycleCounts = {};
  var minCycle = Infinity;
  var maxCycle = 0;

  for (var i = 0; i < rows.length; i++) {
    var c = parseInt(rows[i][iCycle], 10);
    if (isNaN(c)) continue;
    cycleCounts[c] = (cycleCounts[c] || 0) + 1;
    if (c < minCycle) minCycle = c;
    if (c > maxCycle) maxCycle = c;
  }

  var cycleRange = (minCycle === Infinity) ? 'unknown' : ('C' + minCycle + '-C' + maxCycle);
  var uniqueCycles = Object.keys(cycleCounts).length;

  Logger.log(label + ': ' + rows.length + ' rows across ' +
    uniqueCycles + ' cycles (' + cycleRange + ')');
}
