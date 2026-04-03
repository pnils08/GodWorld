/**
 * ============================================================================
 * setupCivicLedgerColumns.js v1.0
 * ============================================================================
 *
 * Adds missing columns to Civic_Office_Ledger that the civic initiative
 * engine v1.7 expects:
 *
 *   R: Approval         (0-100, mayor approval rating — used by veto logic)
 *   S: ExecutiveActions  (JSON, mayor's last 10 actions — future use)
 *
 * Also fixes Elliott Crane's status from "injured" to "recovering"
 * so he can participate in council votes again.
 *
 * WHAT THIS CHANGES:
 *   - Adds 2 columns (R, S) if they don't already exist
 *   - Sets default Approval = 65 for Mayor and all Council members
 *   - Sets empty ExecutiveActions for Mayor
 *   - Updates Elliott Crane (COUNCIL-D6) from "injured" to "recovering"
 *
 * SAFE TO RUN MULTIPLE TIMES — checks for existing columns before adding.
 *
 * Run from Apps Script editor:
 *   setupCivicLedgerColumns()     — full setup
 *   fixElliottCraneStatus()       — status fix only
 *
 * @version 1.0
 * ============================================================================
 */

/**
 * Main entry point — adds columns + fixes Elliott Crane status.
 */
function setupCivicLedgerColumns() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Civic_Office_Ledger not found.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];

  // ── Add Approval column if missing ──
  var approvalCol = headers.indexOf('Approval');
  if (approvalCol === -1) {
    // Add after last column
    var lastCol = sheet.getMaxColumns();
    sheet.insertColumnAfter(lastCol);
    approvalCol = lastCol; // 0-indexed position of new column
    var newColIndex = lastCol + 1; // 1-indexed for Sheets API

    // Set header
    sheet.getRange(1, newColIndex).setValue('Approval');
    sheet.getRange(1, newColIndex).setFontWeight('bold');
    sheet.getRange(1, newColIndex).setBackground('#e8f0fe');
    sheet.getRange(1, newColIndex).setNote(
      'Approval rating (0-100).\n' +
      'Used by civic initiative engine for mayoral veto probability.\n' +
      'Lower approval = more likely to veto.\n' +
      'Default: 65 (neutral).'
    );

    // Set default values for Mayor and Council members
    var officeIdCol = headers.indexOf('OfficeId');
    if (officeIdCol >= 0) {
      for (var i = 1; i < data.length; i++) {
        var officeId = (data[i][officeIdCol] || '').toString();
        if (officeId.indexOf('MAYOR') === 0 || officeId.indexOf('COUNCIL') === 0) {
          sheet.getRange(i + 1, newColIndex).setValue(65);
        }
      }
    }

    sheet.setColumnWidth(newColIndex, 80);
    results.push('Approval column added (default 65 for Mayor + Council)');
    Logger.log('setupCivicLedgerColumns: Approval column added at column ' + newColIndex);
  } else {
    results.push('Approval column already exists (skipped)');
  }

  // ── Add ExecutiveActions column if missing ──
  // Re-read headers since we may have added a column
  var updatedHeaders = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  var execCol = -1;
  for (var h = 0; h < updatedHeaders.length; h++) {
    if ((updatedHeaders[h] || '').toString().trim() === 'ExecutiveActions') {
      execCol = h;
      break;
    }
  }

  if (execCol === -1) {
    var lastCol2 = sheet.getMaxColumns();
    sheet.insertColumnAfter(lastCol2);
    var newColIndex2 = lastCol2 + 1;

    sheet.getRange(1, newColIndex2).setValue('ExecutiveActions');
    sheet.getRange(1, newColIndex2).setFontWeight('bold');
    sheet.getRange(1, newColIndex2).setBackground('#e8f0fe');
    sheet.getRange(1, newColIndex2).setNote(
      'JSON array of mayor executive actions.\n' +
      'Tracks last 10 mayoral decisions (vetoes, signings, etc.).\n' +
      'Populated automatically by civic initiative engine.\n' +
      'Leave empty — engine manages this.'
    );

    // Set empty JSON for mayor row
    var officeIdCol2 = headers.indexOf('OfficeId');
    if (officeIdCol2 >= 0) {
      for (var j = 1; j < data.length; j++) {
        var officeId2 = (data[j][officeIdCol2] || '').toString();
        if (officeId2.indexOf('MAYOR') === 0) {
          sheet.getRange(j + 1, newColIndex2).setValue('[]');
        }
      }
    }

    sheet.setColumnWidth(newColIndex2, 200);
    results.push('ExecutiveActions column added (empty JSON for Mayor)');
    Logger.log('setupCivicLedgerColumns: ExecutiveActions column added at column ' + newColIndex2);
  } else {
    results.push('ExecutiveActions column already exists (skipped)');
  }

  // ── Fix Elliott Crane status ──
  var craneResult = fixElliottCraneStatus_(sheet, data, headers);
  results.push(craneResult);

  // ── Report ──
  SpreadsheetApp.getUi().alert(
    'Civic Office Ledger Setup Complete!\n\n' +
    results.join('\n') + '\n\n' +
    'Approval ratings:\n' +
    '  Mayor + Council = 65 (neutral default)\n' +
    '  Adjust manually as storylines develop\n\n' +
    'Elliott Crane:\n' +
    '  "injured" → "recovering"\n' +
    '  Now available for council votes (CRC back to 3 seats)'
  );

  Logger.log('setupCivicLedgerColumns v1.0: Complete');
}

/**
 * Fix Elliott Crane status from "injured" to "recovering".
 * "recovering" is NOT in the engine's unavailable list, so he can vote again.
 * Standalone entry point if you just want the status fix.
 */
function fixElliottCraneStatus() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Civic_Office_Ledger not found.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = fixElliottCraneStatus_(sheet, data, headers);
  SpreadsheetApp.getUi().alert(result);
}

/**
 * Internal: Find Elliott Crane's row and update status.
 */
function fixElliottCraneStatus_(sheet, data, headers) {
  var officeIdCol = headers.indexOf('OfficeId');
  var statusCol = headers.indexOf('Status');
  var holderCol = headers.indexOf('Holder');

  if (officeIdCol === -1 || statusCol === -1) {
    return 'Elliott Crane: Could not find OfficeId or Status column';
  }

  for (var i = 1; i < data.length; i++) {
    var officeId = (data[i][officeIdCol] || '').toString();
    if (officeId === 'COUNCIL-D6') {
      var currentStatus = (data[i][statusCol] || '').toString();
      var holder = (data[i][holderCol] || '').toString();

      if (currentStatus.toLowerCase() === 'injured') {
        sheet.getRange(i + 1, statusCol + 1).setValue('recovering');
        Logger.log('fixElliottCraneStatus_: ' + holder + ' status: injured → recovering');
        return 'Elliott Crane (D6): injured → recovering (can now vote)';
      } else {
        return 'Elliott Crane (D6): Status is "' + currentStatus + '" (not injured, skipped)';
      }
    }
  }

  return 'Elliott Crane: COUNCIL-D6 row not found';
}
