/**
 * ============================================================================
 * setupSportsFeedValidation.js v1.0
 * ============================================================================
 *
 * One-time setup script to add data validation dropdowns to Sports_Feed sheet.
 * Run this once from the Apps Script editor: setupSportsFeedValidation()
 *
 * Adds/updates:
 *   - Column F (SeasonState) dropdown
 *   - Column G (PlayoffRound) dropdown
 *   - Column H (PlayoffStatus) dropdown
 *   - Column N (SentimentModifier) - header only (manual number entry)
 *   - Column O (EventTrigger) dropdown
 *   - Column P (HomeNeighborhood) dropdown
 *
 * Safe to run multiple times - updates existing validations.
 *
 * @version 1.0
 * ============================================================================
 */

function setupSportsFeedValidation() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Sports_Feed');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sports_Feed sheet not found. Please create it first.');
    return;
  }

  var lastRow = Math.max(sheet.getLastRow(), 10); // At least 10 rows for validation
  var dataRows = lastRow - 1; // Exclude header

  // Ensure we have enough columns
  if (sheet.getMaxColumns() < 16) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 16 - sheet.getMaxColumns());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DROPDOWN VALUES
  // ─────────────────────────────────────────────────────────────────────────

  var seasonStateValues = [
    'off-season',
    'spring-training',
    'preseason',
    'early-season',
    'mid-season',
    'late-season',
    'regular-season',
    'playoffs',
    'post-season',
    'championship',
    'finals',
    'world-series'
  ];

  var playoffRoundValues = [
    '',
    'wild-card',
    'division-series',
    'alds',
    'nlds',
    'league-championship',
    'alcs',
    'nlcs',
    'conference-finals',
    'world-series',
    'nba-finals',
    'championship'
  ];

  var playoffStatusValues = [
    '',
    'contending',
    'in-the-race',
    'clinched',
    'clinched-division',
    'clinched-playoffs',
    'eliminated',
    'out-of-contention',
    'won-series',
    'lost-series'
  ];

  var eventTriggerValues = [
    '',
    'hot-streak',
    'cold-streak',
    'playoff-push',
    'playoff-clinch',
    'eliminated',
    'championship',
    'rivalry',
    'home-opener',
    'season-finale'
  ];

  var neighborhoodValues = [
    '',
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

  var headers = sheet.getRange(1, 1, 1, 16).getValues()[0];

  // Check and set headers for new columns
  var headerUpdates = {
    5: 'SeasonState',      // F (index 5)
    6: 'PlayoffRound',     // G (index 6)
    7: 'PlayoffStatus',    // H (index 7)
    13: 'SentimentModifier', // N (index 13)
    14: 'EventTrigger',    // O (index 14)
    15: 'HomeNeighborhood' // P (index 15)
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

  // F: SeasonState (column 6)
  applyDropdownValidation_(sheet, 2, 6, dataRows, seasonStateValues, 'SeasonState');

  // G: PlayoffRound (column 7)
  applyDropdownValidation_(sheet, 2, 7, dataRows, playoffRoundValues, 'PlayoffRound');

  // H: PlayoffStatus (column 8)
  applyDropdownValidation_(sheet, 2, 8, dataRows, playoffStatusValues, 'PlayoffStatus');

  // O: EventTrigger (column 15)
  applyDropdownValidation_(sheet, 2, 15, dataRows, eventTriggerValues, 'EventTrigger');

  // P: HomeNeighborhood (column 16)
  applyDropdownValidation_(sheet, 2, 16, dataRows, neighborhoodValues, 'HomeNeighborhood');

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT NEW COLUMNS
  // ─────────────────────────────────────────────────────────────────────────

  // Header formatting
  var newHeaders = sheet.getRange(1, 14, 1, 3); // N, O, P
  newHeaders.setFontWeight('bold');
  newHeaders.setBackground('#e8f0fe');

  // Column widths
  sheet.setColumnWidth(14, 120); // N: SentimentModifier
  sheet.setColumnWidth(15, 120); // O: EventTrigger
  sheet.setColumnWidth(16, 140); // P: HomeNeighborhood

  // Add note to SentimentModifier header
  sheet.getRange(1, 14).setNote(
    'Optional manual override (-0.10 to +0.10).\n' +
    'Leave blank to auto-calculate from Record, SeasonState, PlayoffRound, PlayoffStatus, and Streak.'
  );

  Logger.log('setupSportsFeedValidation: Complete');
  SpreadsheetApp.getUi().alert(
    'Sports_Feed Setup Complete!\n\n' +
    'Added dropdowns to:\n' +
    '- F: SeasonState\n' +
    '- G: PlayoffRound\n' +
    '- H: PlayoffStatus\n' +
    '- O: EventTrigger\n' +
    '- P: HomeNeighborhood\n\n' +
    'Column N (SentimentModifier) is for optional manual override.'
  );
}

/**
 * Helper: Apply dropdown validation to a column range
 */
function applyDropdownValidation_(sheet, startRow, col, numRows, values, name) {
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
 * Removes all Sports_Feed validations (if you need to reset)
 */
function clearSportsFeedValidation() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Sports_Feed');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sports_Feed sheet not found.');
    return;
  }

  // Clear validation from columns F, G, H, O, P
  var cols = [6, 7, 8, 15, 16];
  var lastRow = sheet.getLastRow();

  for (var i = 0; i < cols.length; i++) {
    var range = sheet.getRange(2, cols[i], Math.max(lastRow - 1, 1), 1);
    range.clearDataValidations();
  }

  Logger.log('clearSportsFeedValidation: Complete');
  SpreadsheetApp.getUi().alert('Sports_Feed validations cleared.');
}
