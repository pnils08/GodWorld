/**
 * ============================================================================
 * ROLLBACK TO CYCLE 80 - Clean Cycle 81 Data
 * ============================================================================
 *
 * Removes cycle 81 data that was written during dry-run test.
 * Run rollbackToCycle80() from Apps Script editor.
 *
 * Targets:
 * - World_Population (1 row)
 * - Cycle_Packet (1 row)
 * - Riley_Digest (1 row)
 * - Media_Briefing (1 row)
 * - Neighborhood_Map (17 rows)
 * - LifeHistory_Log (21 rows)
 * - Engine_Errors (2 rows)
 * - World_Config cycleCount
 *
 * ============================================================================
 */

function rollbackToCycle80() {
  var TARGET_CYCLE = 80;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('ROLLBACK TO CYCLE 80 - Remove Cycle 81 Data');
  Logger.log('═══════════════════════════════════════════════════════════');

  var totalDeleted = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE CYCLE 81 ROWS FROM AFFECTED SHEETS
  // ═══════════════════════════════════════════════════════════════════════════

  var sheetsToClean = [
    { name: 'World_Population', cycleCol: 'Cycle' },
    { name: 'Cycle_Packet', cycleCol: 'Cycle' },
    { name: 'Riley_Digest', cycleCol: 'Cycle' },
    { name: 'Media_Briefing', cycleCol: 'Cycle' },
    { name: 'Neighborhood_Map', cycleCol: 'Cycle' },
    { name: 'LifeHistory_Log', cycleCol: 'Cycle' },
    { name: 'Engine_Errors', cycleCol: 'Cycle' }
  ];

  for (var i = 0; i < sheetsToClean.length; i++) {
    var config = sheetsToClean[i];
    var deleted = deleteRowsAfterCycle_(ss, config.name, config.cycleCol, TARGET_CYCLE);
    totalDeleted += deleted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET CYCLE COUNTER IN WORLD_CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  resetCycleCounter_(ss, TARGET_CYCLE);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('ROLLBACK COMPLETE');
  Logger.log('Total rows deleted: ' + totalDeleted);
  Logger.log('Cycle counter reset to: ' + TARGET_CYCLE);
  Logger.log('Next cycle run will be: ' + (TARGET_CYCLE + 1));
  Logger.log('═══════════════════════════════════════════════════════════');

  return {
    success: true,
    rowsDeleted: totalDeleted,
    currentCycle: TARGET_CYCLE
  };
}


/**
 * Delete all rows where cycle column > TARGET_CYCLE
 */
function deleteRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('⚠️  Sheet not found: ' + sheetName);
    return 0;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('⚠️  Sheet is empty: ' + sheetName);
    return 0;
  }

  var header = data[0];
  var cycleColIdx = header.indexOf(cycleColName);

  if (cycleColIdx === -1) {
    Logger.log('⚠️  Cycle column "' + cycleColName + '" not found in: ' + sheetName);
    return 0;
  }

  // Find rows to delete (in reverse order to avoid index shifting)
  var rowsToDelete = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var cycleValue = Number(data[i][cycleColIdx]);
    if (cycleValue > targetCycle) {
      rowsToDelete.push(i + 1); // Convert to 1-indexed
    }
  }

  if (rowsToDelete.length === 0) {
    Logger.log('✓ ' + sheetName + ': No cycle ' + (targetCycle + 1) + ' data found');
    return 0;
  }

  // Delete rows
  for (var j = 0; j < rowsToDelete.length; j++) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  Logger.log('✓ ' + sheetName + ': Deleted ' + rowsToDelete.length + ' rows (cycle > ' + targetCycle + ')');
  return rowsToDelete.length;
}


/**
 * Reset cycle counter in World_Config
 */
function resetCycleCounter_(ss, targetCycle) {
  var sheet = ss.getSheetByName('World_Config');
  if (!sheet) {
    Logger.log('⚠️  World_Config sheet not found');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var keyCol = 0;
  var valueCol = 1;

  for (var i = 0; i < data.length; i++) {
    if (data[i][keyCol] === 'cycleCount') {
      var currentValue = data[i][valueCol];
      sheet.getRange(i + 1, valueCol + 1).setValue(targetCycle);
      Logger.log('✓ World_Config: Reset cycleCount from ' + currentValue + ' to ' + targetCycle);
      return;
    }
  }

  Logger.log('⚠️  cycleCount not found in World_Config');
}
