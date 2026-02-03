/**
 * ============================================================================
 * setupInitiativeTrackerValidation.js v1.0
 * ============================================================================
 *
 * One-time setup script to add data validation dropdowns to Initiative_Tracker.
 * Run this once from the Apps Script editor: setupInitiativeTrackerValidation()
 *
 * Adds/updates:
 *   - Column D (Status) dropdown
 *   - Column H (Projection) dropdown
 *   - Column R (AffectedNeighborhoods) - header only (free text, comma-separated)
 *   - Column S (PolicyDomain) dropdown
 *
 * Safe to run multiple times - updates existing validations.
 *
 * @version 1.0
 * ============================================================================
 */

function setupInitiativeTrackerValidation() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Initiative_Tracker');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Initiative_Tracker sheet not found. Please create it first.');
    return;
  }

  var lastRow = Math.max(sheet.getLastRow(), 20); // At least 20 rows for validation
  var dataRows = lastRow - 1; // Exclude header

  // Ensure we have enough columns
  if (sheet.getMaxColumns() < 19) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 19 - sheet.getMaxColumns());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DROPDOWN VALUES
  // ─────────────────────────────────────────────────────────────────────────

  var statusValues = [
    'proposed',
    'active',
    'pending-vote',
    'delayed',
    'passed',
    'failed',
    'resolved',
    'inactive'
  ];

  var typeValues = [
    'vote',
    'council-vote',
    'grant',
    'federal-grant',
    'external',
    'visioning',
    'input'
  ];

  var projectionValues = [
    'likely pass',
    'lean pass',
    'toss-up',
    'lean fail',
    'likely fail',
    'uncertain',
    'needs swing'
  ];

  var policyDomainValues = [
    '',
    'health',
    'transit',
    'economic',
    'housing',
    'safety',
    'environment',
    'sports',
    'education'
  ];

  var neighborhoodValues = [
    'Downtown',
    'Jack London',
    'Rockridge',
    'Temescal',
    'Fruitvale',
    'West Oakland',
    'Lake Merritt',
    'Piedmont Ave',
    'Grand Lake',
    'Montclair',
    'Chinatown',
    'Old Oakland'
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // SET HEADERS (if missing)
  // ─────────────────────────────────────────────────────────────────────────

  var headers = sheet.getRange(1, 1, 1, 19).getValues()[0];

  var headerUpdates = {
    17: 'AffectedNeighborhoods',  // R (index 17)
    18: 'PolicyDomain'            // S (index 18)
  };

  for (var col in headerUpdates) {
    var idx = parseInt(col);
    if (!headers[idx] || headers[idx].toString().trim() === '') {
      sheet.getRange(1, idx + 1).setValue(headerUpdates[col]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APPLY DATA VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  // C: Type (column 3)
  applyInitiativeDropdown_(sheet, 2, 3, dataRows, typeValues, 'Type');

  // D: Status (column 4)
  applyInitiativeDropdown_(sheet, 2, 4, dataRows, statusValues, 'Status');

  // H: Projection (column 8)
  applyInitiativeDropdown_(sheet, 2, 8, dataRows, projectionValues, 'Projection');

  // S: PolicyDomain (column 19)
  applyInitiativeDropdown_(sheet, 2, 19, dataRows, policyDomainValues, 'PolicyDomain');

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT NEW COLUMNS
  // ─────────────────────────────────────────────────────────────────────────

  // Header formatting for new columns
  var newHeaders = sheet.getRange(1, 18, 1, 2); // R, S
  newHeaders.setFontWeight('bold');
  newHeaders.setBackground('#e8f0fe');

  // Column widths
  sheet.setColumnWidth(18, 180); // R: AffectedNeighborhoods
  sheet.setColumnWidth(19, 120); // S: PolicyDomain

  // Add notes to headers
  sheet.getRange(1, 18).setNote(
    'Comma-separated list of neighborhoods affected by this initiative.\n' +
    'Example: Downtown, Jack London, West Oakland\n' +
    'Used to determine where ripple effects apply.'
  );

  sheet.getRange(1, 19).setNote(
    'Explicit policy domain for ripple effects.\n' +
    'If blank, engine detects domain from initiative name.\n' +
    'Setting this overrides keyword detection.'
  );

  Logger.log('setupInitiativeTrackerValidation: Complete');
  SpreadsheetApp.getUi().alert(
    'Initiative_Tracker Setup Complete!\n\n' +
    'Added/updated dropdowns for:\n' +
    '- C: Type\n' +
    '- D: Status\n' +
    '- H: Projection\n' +
    '- S: PolicyDomain\n\n' +
    'Column R (AffectedNeighborhoods) is free text.\n' +
    'Use comma-separated neighborhood names.'
  );
}

/**
 * Helper: Apply dropdown validation (reuses from setupSportsFeedValidation)
 */
function applyInitiativeDropdown_(sheet, startRow, col, numRows, values, name) {
  var range = sheet.getRange(startRow, col, numRows, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .setHelpText('Select ' + name)
    .build();
  range.setDataValidation(rule);
  Logger.log('Applied validation to column ' + col + ' (' + name + ')');
}

/**
 * Removes all Initiative_Tracker validations (if you need to reset)
 */
function clearInitiativeTrackerValidation() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Initiative_Tracker');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Initiative_Tracker sheet not found.');
    return;
  }

  // Clear validation from columns C, D, H, S
  var cols = [3, 4, 8, 19];
  var lastRow = sheet.getLastRow();

  for (var i = 0; i < cols.length; i++) {
    var range = sheet.getRange(2, cols[i], Math.max(lastRow - 1, 1), 1);
    range.clearDataValidations();
  }

  Logger.log('clearInitiativeTrackerValidation: Complete');
  SpreadsheetApp.getUi().alert('Initiative_Tracker validations cleared.');
}
