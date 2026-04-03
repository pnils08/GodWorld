/**
 * ============================================================================
 * CYCLE ROLLBACK UTILITY v1.0
 * ============================================================================
 *
 * Deletes all data from cycles 79+ and resets the simulation to cycle 78.
 * Run rollbackToCycle78() from Apps Script editor.
 *
 * WARNING: This permanently deletes data. Make a backup first.
 *
 * ============================================================================
 */

/**
 * Main entry point - run this from Apps Script editor
 */
function rollbackToCycle78() {
  var TARGET_CYCLE = 78;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('ROLLBACK TO CYCLE ' + TARGET_CYCLE + ' STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  var totalDeleted = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEETS WITH CYCLE COLUMN (various column names)
  // ═══════════════════════════════════════════════════════════════════════════

  var sheetsWithCycleColumn = [
    { name: 'Riley_Digest', cycleCol: 'Cycle' },
    { name: 'Cycle_Packet', cycleCol: 'Cycle' },
    { name: 'WorldEvents_Ledger', cycleCol: 'Cycle' },
    { name: 'WorldEvents_V3_Ledger', cycleCol: 'Cycle' },
    { name: 'Event_Arc_Ledger', cycleCol: 'Cycle' },
    { name: 'Event_Arc_Ledger', cycleCol: 'StartCycle' },
    { name: 'Story_Seed_Deck', cycleCol: 'Cycle' },
    { name: 'Story_Seed_Deck', cycleCol: 'GeneratedCycle' },
    { name: 'Story_Hook_Deck', cycleCol: 'Cycle' },
    { name: 'Story_Hook_Deck', cycleCol: 'GeneratedCycle' },
    { name: 'Storyline_Tracker', cycleCol: 'Cycle' },
    { name: 'Storyline_Tracker', cycleCol: 'LastUpdatedCycle' },
    { name: 'LifeHistory_Log', cycleCol: 'Cycle' },
    { name: 'Media_Ledger', cycleCol: 'Cycle' },
    { name: 'Cycle_Seeds', cycleCol: 'CycleID' },
    { name: 'Domain_Tracker', cycleCol: 'Cycle' },
    { name: 'Texture_Trigger_Log', cycleCol: 'Cycle' },
    { name: 'Cycle_Weather', cycleCol: 'Cycle' },
    { name: 'Transit_Metrics', cycleCol: 'Cycle' },
    { name: 'Faith_Ledger', cycleCol: 'Cycle' },
    { name: 'Youth_Events', cycleCol: 'Cycle' },
    { name: 'Chicago_Feed', cycleCol: 'Cycle' },
    { name: 'Neighborhood_Demographics', cycleCol: 'Cycle' },
    { name: 'Generic_Citizens', cycleCol: 'CreatedCycle' },
    { name: 'Chicago_Citizens', cycleCol: 'CreatedCycle' },
    { name: 'Initiative_Tracker', cycleCol: 'VoteCycle' },
    { name: 'Election_Log', cycleCol: 'Cycle' },
    { name: 'Relationship_Bonds', cycleCol: 'BondedSinceCycle' },
    { name: 'Media_Intake', cycleCol: 'Cycle' },
    { name: 'Civic_Load_Log', cycleCol: 'Cycle' },
    { name: 'Economic_Ripple_Log', cycleCol: 'Cycle' },
    { name: 'Population_Log', cycleCol: 'Cycle' },
    { name: 'Audit_Log', cycleCol: 'Cycle' }
  ];

  // Process each sheet
  for (var i = 0; i < sheetsWithCycleColumn.length; i++) {
    var config = sheetsWithCycleColumn[i];
    var deleted = deleteRowsAfterCycle_(ss, config.name, config.cycleCol, TARGET_CYCLE);
    totalDeleted += deleted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL HANDLING: Initiative_Tracker - Revert vote outcomes
  // ═══════════════════════════════════════════════════════════════════════════

  revertInitiativeVotes_(ss, TARGET_CYCLE);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL HANDLING: Civic_Office_Ledger - Reset LastUpdated
  // ═══════════════════════════════════════════════════════════════════════════

  revertCivicOfficeUpdates_(ss, TARGET_CYCLE);

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
    restoredToCycle: TARGET_CYCLE
  };
}


/**
 * Delete rows where cycle column value > targetCycle
 */
function deleteRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('  SKIP: ' + sheetName + ' (not found)');
    return 0;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('  SKIP: ' + sheetName + ' (no data)');
    return 0;
  }

  var header = data[0];
  var cycleColIndex = header.indexOf(cycleColName);

  if (cycleColIndex < 0) {
    Logger.log('  SKIP: ' + sheetName + ' (no column: ' + cycleColName + ')');
    return 0;
  }

  // Find rows to delete (from bottom up to preserve indices)
  var rowsToDelete = [];
  for (var r = data.length - 1; r >= 1; r--) {
    var cycleValue = Number(data[r][cycleColIndex]);
    if (cycleValue > targetCycle) {
      rowsToDelete.push(r + 1); // +1 for 1-based row index
    }
  }

  // Delete rows from bottom up
  for (var d = 0; d < rowsToDelete.length; d++) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  if (rowsToDelete.length > 0) {
    Logger.log('  DELETED: ' + sheetName + ' - ' + rowsToDelete.length + ' rows (cycle > ' + targetCycle + ')');
  } else {
    Logger.log('  OK: ' + sheetName + ' - no rows to delete');
  }

  return rowsToDelete.length;
}


/**
 * Revert initiative votes that happened after targetCycle
 */
function revertInitiativeVotes_(ss, targetCycle) {
  var sheet = ss.getSheetByName('Initiative_Tracker');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var header = data[0];
  var iVoteCycle = header.indexOf('VoteCycle');
  var iStatus = header.indexOf('Status');
  var iOutcome = header.indexOf('Outcome');
  var iConsequences = header.indexOf('Consequences');
  var iLastUpdated = header.indexOf('LastUpdated');

  if (iVoteCycle < 0 || iStatus < 0) return;

  var reverted = 0;

  for (var r = 1; r < data.length; r++) {
    var voteCycle = Number(data[r][iVoteCycle]) || 0;
    var status = (data[r][iStatus] || '').toString().toLowerCase();

    // If vote happened after target cycle and status shows it resolved
    if (voteCycle > targetCycle && (status === 'passed' || status === 'failed' || status === 'resolved')) {
      // Revert to pending-vote status
      data[r][iStatus] = 'pending-vote';
      if (iOutcome >= 0) data[r][iOutcome] = '';
      if (iConsequences >= 0) data[r][iConsequences] = '';
      if (iLastUpdated >= 0) data[r][iLastUpdated] = '';
      reverted++;
    }
  }

  if (reverted > 0) {
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    Logger.log('  REVERTED: Initiative_Tracker - ' + reverted + ' votes reset to pending-vote');
  }
}


/**
 * Reset Civic_Office_Ledger updates that happened after targetCycle
 */
function revertCivicOfficeUpdates_(ss, targetCycle) {
  var sheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var header = data[0];
  var iLastUpdated = header.indexOf('LastUpdated');
  var iLastElection = header.indexOf('LastElection');

  // If LastUpdated is a cycle number > targetCycle, we may need to handle it
  // For now, just log - manual review may be needed

  Logger.log('  NOTE: Civic_Office_Ledger may need manual review for cycle ' + targetCycle + '+ updates');
}


/**
 * Reset the cycle counter in World_Config
 */
function resetCycleCounter_(ss, targetCycle) {
  var sheet = ss.getSheetByName('World_Config');
  if (!sheet) {
    Logger.log('  ERROR: World_Config not found!');
    return;
  }

  var data = sheet.getDataRange().getValues();

  for (var r = 0; r < data.length; r++) {
    var key = (data[r][0] || '').toString().toLowerCase();
    if (key === 'cyclecount') {
      sheet.getRange(r + 1, 2).setValue(targetCycle);
      Logger.log('  RESET: World_Config cycleCount = ' + targetCycle);
      return;
    }
  }

  Logger.log('  ERROR: cycleCount not found in World_Config');
}


/**
 * DRY RUN - Shows what would be deleted without actually deleting
 * Run this first to preview the rollback
 */
function previewRollbackToCycle78() {
  var TARGET_CYCLE = 78;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('PREVIEW ROLLBACK TO CYCLE ' + TARGET_CYCLE);
  Logger.log('This is a DRY RUN - no data will be deleted');
  Logger.log('═══════════════════════════════════════════════════════════');

  var sheetsWithCycleColumn = [
    { name: 'Riley_Digest', cycleCol: 'Cycle' },
    { name: 'Cycle_Packet', cycleCol: 'Cycle' },
    { name: 'WorldEvents_Ledger', cycleCol: 'Cycle' },
    { name: 'WorldEvents_V3_Ledger', cycleCol: 'Cycle' },
    { name: 'Event_Arc_Ledger', cycleCol: 'Cycle' },
    { name: 'Story_Seed_Deck', cycleCol: 'Cycle' },
    { name: 'Story_Hook_Deck', cycleCol: 'Cycle' },
    { name: 'Storyline_Tracker', cycleCol: 'Cycle' },
    { name: 'LifeHistory_Log', cycleCol: 'Cycle' },
    { name: 'Media_Ledger', cycleCol: 'Cycle' },
    { name: 'Cycle_Seeds', cycleCol: 'CycleID' },
    { name: 'Domain_Tracker', cycleCol: 'Cycle' },
    { name: 'Texture_Trigger_Log', cycleCol: 'Cycle' },
    { name: 'Cycle_Weather', cycleCol: 'Cycle' },
    { name: 'Transit_Metrics', cycleCol: 'Cycle' },
    { name: 'Faith_Ledger', cycleCol: 'Cycle' },
    { name: 'Youth_Events', cycleCol: 'Cycle' },
    { name: 'Chicago_Feed', cycleCol: 'Cycle' },
    { name: 'Initiative_Tracker', cycleCol: 'VoteCycle' },
    { name: 'Election_Log', cycleCol: 'Cycle' },
    { name: 'Relationship_Bonds', cycleCol: 'BondedSinceCycle' },
    { name: 'Audit_Log', cycleCol: 'Cycle' }
  ];

  var totalWouldDelete = 0;

  for (var i = 0; i < sheetsWithCycleColumn.length; i++) {
    var config = sheetsWithCycleColumn[i];
    var count = countRowsAfterCycle_(ss, config.name, config.cycleCol, TARGET_CYCLE);
    totalWouldDelete += count;
  }

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('PREVIEW COMPLETE');
  Logger.log('Total rows that WOULD be deleted: ' + totalWouldDelete);
  Logger.log('Run rollbackToCycle78() to execute the rollback');
  Logger.log('═══════════════════════════════════════════════════════════');
}


/**
 * Count rows that would be deleted (for preview)
 */
function countRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('  SKIP: ' + sheetName + ' (not found)');
    return 0;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('  SKIP: ' + sheetName + ' (no data)');
    return 0;
  }

  var header = data[0];
  var cycleColIndex = header.indexOf(cycleColName);

  if (cycleColIndex < 0) {
    Logger.log('  SKIP: ' + sheetName + ' (no column: ' + cycleColName + ')');
    return 0;
  }

  var count = 0;
  for (var r = 1; r < data.length; r++) {
    var cycleValue = Number(data[r][cycleColIndex]);
    if (cycleValue > targetCycle) {
      count++;
    }
  }

  Logger.log('  WOULD DELETE: ' + sheetName + ' - ' + count + ' rows');
  return count;
}
