/**
 * ============================================================================
 * setupSportsFeedValidation.js v2.1
 * ============================================================================
 *
 * Sets up Oakland_Sports_Feed and Chicago_Sports_Feed with:
 *   - Dropdown validation on key columns (EventType, SeasonType, TeamsUsed,
 *     PlayerMood, EventTrigger, HomeNeighborhood)
 *   - New columns: StoryAngle, PlayerMood, EventTrigger, HomeNeighborhood
 *   - Dead columns grayed out (VideoGameDate, VideoGame)
 *   - Header notes explaining what goes where
 *   - Column widths optimized for readability
 *
 * COLUMN LAYOUT (after running):
 *   A: Cycle           (number — required)
 *   B: SeasonType      (dropdown — off-season, mid-season, etc.)
 *   C: EventType       (dropdown — game-result, roster-move, etc.)
 *   D: TeamsUsed       (dropdown — team-specific)
 *   E: NamesUsed       (text — comma-separated player names)
 *   F: Notes           (text — freeform description)
 *   G: Stats           (text — stat lines like 22pts/8ast)
 *   H: Team Record     (text — W-L format like 39-16)
 *   I: VideoGameDate   (DEAD — grayed, kept for backward compat)
 *   J: VideoGame       (DEAD — grayed, kept for backward compat)
 *   K: StoryAngle      (NEW — text, your 10-word headline instinct)
 *   L: PlayerMood      (NEW — dropdown)
 *   M: EventTrigger    (NEW — dropdown)
 *   N: HomeNeighborhood (NEW — dropdown, team-specific)
 *   O: Streak          (NEW — text, W6/L3 format — feeds engine sentiment)
 *
 * Run from Apps Script editor:
 *   setupSportsFeedValidation()    — sets up both sheets
 *   setupOaklandFeedOnly()         — Oakland only
 *   setupChicagoFeedOnly()         — Chicago only
 *   clearSportsFeedValidation()    — removes all validation from both
 *
 * Safe to run multiple times — updates existing validations.
 *
 * @version 2.0
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED DROPDOWN VALUES
// ─────────────────────────────────────────────────────────────────────────────

var SEASON_TYPE_VALUES = [
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

var EVENT_TYPE_VALUES = [
  'game-result',
  'roster-move',
  'player-feature',
  'front-office',
  'fan-civic',
  'season-state',
  'editorial-note'
];

var PLAYER_MOOD_VALUES = [
  '',
  'confident',
  'frustrated',
  'hungry',
  'reflective',
  'dominant',
  'uncertain',
  'locked-in',
  'quiet',
  'electric'
];

var EVENT_TRIGGER_VALUES = [
  '',
  'hot-streak',
  'cold-streak',
  'playoff-push',
  'playoff-clinch',
  'eliminated',
  'championship',
  'rivalry',
  'home-opener',
  'season-finale',
  'trade-deadline',
  'all-star',
  'draft'
];

var OAKLAND_TEAMS = ["A's", 'Warriors'];

var CHICAGO_TEAMS = ['Bulls'];

var FEED_NEIGHBORHOODS = [
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
  'Old Oakland',
  'Laurel',
  'Dimond',
  'Glenview',
  'Eastlake'
];

var CHICAGO_NEIGHBORHOODS = [
  '',
  'Bridgeport',
  'Bronzeville',
  'South Loop',
  'West Loop',
  'Pilsen',
  'Hyde Park',
  'Wicker Park',
  'Logan Square',
  'Lincoln Park',
  'United Center Area'
];

// ─────────────────────────────────────────────────────────────────────────────
// HEADER NOTES (shown when you hover over column headers)
// ─────────────────────────────────────────────────────────────────────────────

var HEADER_NOTES = {
  'Cycle': 'Required. The simulation cycle number (e.g. 81, 82).',
  'SeasonType': 'Select from dropdown. Where the team is in their season.',
  'EventType': 'Select from dropdown. One event per row.\n\n' +
    'game-result = After a game (score, performers, record)\n' +
    'roster-move = Trades, signings, injuries, cuts\n' +
    'player-feature = Community events, milestones, off-field\n' +
    'front-office = GM moves, coaching, organizational\n' +
    'fan-civic = Stadium, fan events, civic appearances\n' +
    'season-state = Standings update, playoff status change\n' +
    'editorial-note = Your instinct — story angles, observations',
  'TeamsUsed': 'Select from dropdown. Which team this entry is about.',
  'NamesUsed': 'Comma-separated player/person names.\nExample: Josh Giddey, Hank Trepagnier',
  'Notes': 'Freeform description. Your voice lives here.\nKeep facts in structured columns, use Notes for color.',
  'Stats': 'Stat line for the entry. Slash-separated.\nExample: 22pts/8ast or 8.2pts/9.1reb/2.1blk\nLeave blank if not applicable.',
  'Team Record': 'Current W-L record after this event.\nExample: 39-16\nUpdate on every game-result row.',
  'VideoGameDate': 'DEAD COLUMN — no longer read by any engine.\nLeave blank. Kept for backward compatibility.',
  'VideoGame': 'DEAD COLUMN — no longer read by any engine.\nLeave blank. Kept for backward compatibility.',
  'StoryAngle': 'Your 10-word headline instinct.\nWhat would you tell P Slayer at the morning meeting?\nExample: "Kessler gamble paying off in locker room"',
  'PlayerMood': 'Select from dropdown. One-word emotional register.\nApplies to the primary player(s) in NamesUsed.',
  'EventTrigger': 'Select from dropdown. Optional.\nFlags special story-generating moments.\nLeave blank for routine entries.',
  'HomeNeighborhood': 'Select from dropdown. Optional.\nWhere the impact of this event lands.\nUsed for neighborhood-specific coverage.',
  'Streak': 'Current team streak. Format: W6 or L3.\nW = wins, L = losses, number = consecutive games.\nFeeds engine sentiment calculation.\nLeave blank if not applicable.'
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up BOTH Oakland_Sports_Feed and Chicago_Sports_Feed.
 * Run this from the Apps Script editor.
 */
function setupSportsFeedValidation() {
  var ss = openSimSpreadsheet_();
  var results = [];

  var oakSheet = ss.getSheetByName('Oakland_Sports_Feed');
  if (oakSheet) {
    setupFeedSheet_(oakSheet, 'Oakland', OAKLAND_TEAMS, FEED_NEIGHBORHOODS);
    results.push('Oakland_Sports_Feed: OK');
  } else {
    results.push('Oakland_Sports_Feed: NOT FOUND (skipped)');
  }

  var chiSheet = ss.getSheetByName('Chicago_Sports_Feed');
  if (chiSheet) {
    setupFeedSheet_(chiSheet, 'Chicago', CHICAGO_TEAMS, CHICAGO_NEIGHBORHOODS);
    results.push('Chicago_Sports_Feed: OK');
  } else {
    results.push('Chicago_Sports_Feed: NOT FOUND (skipped)');
  }

  Logger.log('setupSportsFeedValidation v2.1: Complete');
  SpreadsheetApp.getUi().alert(
    'Sports Feed Setup Complete!\n\n' +
    results.join('\n') + '\n\n' +
    'Columns with dropdowns:\n' +
    '  B: SeasonType\n' +
    '  C: EventType (NEW taxonomy)\n' +
    '  D: TeamsUsed\n' +
    '  L: PlayerMood (NEW)\n' +
    '  M: EventTrigger (NEW)\n' +
    '  N: HomeNeighborhood (NEW)\n\n' +
    'New columns added:\n' +
    '  K: StoryAngle (text)\n' +
    '  L: PlayerMood (dropdown)\n' +
    '  O: Streak (text — W6/L3 format)\n\n' +
    'Dead columns grayed out:\n' +
    '  I: VideoGameDate\n' +
    '  J: VideoGame'
  );
}

/** Oakland only */
function setupOaklandFeedOnly() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Oakland_Sports_Feed');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Oakland_Sports_Feed not found.');
    return;
  }
  setupFeedSheet_(sheet, 'Oakland', OAKLAND_TEAMS, FEED_NEIGHBORHOODS);
  SpreadsheetApp.getUi().alert('Oakland_Sports_Feed setup complete!');
}

/** Chicago only */
function setupChicagoFeedOnly() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Chicago_Sports_Feed');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Chicago_Sports_Feed not found.');
    return;
  }
  setupFeedSheet_(sheet, 'Chicago', CHICAGO_TEAMS, CHICAGO_NEIGHBORHOODS);
  SpreadsheetApp.getUi().alert('Chicago_Sports_Feed setup complete!');
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE SETUP LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up a single feed sheet with dropdowns, headers, formatting.
 */
function setupFeedSheet_(sheet, city, teamValues, neighborhoodValues) {
  var lastRow = Math.max(sheet.getLastRow(), 20);
  var dataRows = lastRow - 1;

  // ── Ensure we have 15 columns ──
  var currentCols = sheet.getMaxColumns();
  if (currentCols < 15) {
    sheet.insertColumnsAfter(currentCols, 15 - currentCols);
  }

  // ── Set headers for new columns (K-O) ──
  var expectedHeaders = {
    11: 'StoryAngle',       // K (1-indexed col 11)
    12: 'PlayerMood',       // L
    13: 'EventTrigger',     // M
    14: 'HomeNeighborhood', // N
    15: 'Streak'            // O
  };

  var headers = sheet.getRange(1, 1, 1, 15).getValues()[0];

  for (var col in expectedHeaders) {
    var c = parseInt(col);
    var current = (headers[c - 1] || '').toString().trim();
    if (!current) {
      sheet.getRange(1, c).setValue(expectedHeaders[col]);
    }
  }

  // ── Apply dropdowns ──

  // B: SeasonType (column 2)
  applyDropdownValidation_(sheet, 2, 2, dataRows, SEASON_TYPE_VALUES, 'SeasonType');

  // C: EventType (column 3)
  applyDropdownValidation_(sheet, 2, 3, dataRows, EVENT_TYPE_VALUES, 'EventType');

  // D: TeamsUsed (column 4)
  applyDropdownValidation_(sheet, 2, 4, dataRows, teamValues, 'TeamsUsed');

  // L: PlayerMood (column 12)
  applyDropdownValidation_(sheet, 2, 12, dataRows, PLAYER_MOOD_VALUES, 'PlayerMood');

  // M: EventTrigger (column 13)
  applyDropdownValidation_(sheet, 2, 13, dataRows, EVENT_TRIGGER_VALUES, 'EventTrigger');

  // N: HomeNeighborhood (column 14)
  applyDropdownValidation_(sheet, 2, 14, dataRows, neighborhoodValues, 'HomeNeighborhood');

  // ── Header notes (hover help) ──
  var allHeaders = ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'NamesUsed',
                    'Notes', 'Stats', 'Team Record', 'VideoGameDate', 'VideoGame',
                    'StoryAngle', 'PlayerMood', 'EventTrigger', 'HomeNeighborhood', 'Streak'];

  for (var i = 0; i < allHeaders.length; i++) {
    var note = HEADER_NOTES[allHeaders[i]];
    if (note) {
      sheet.getRange(1, i + 1).setNote(note);
    }
  }

  // ── Format ALL headers ──
  var headerRange = sheet.getRange(1, 1, 1, 15);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8f0fe');

  // ── Gray out dead columns (I: VideoGameDate, J: VideoGame) ──
  var deadColI = sheet.getRange(1, 9, lastRow, 1);
  var deadColJ = sheet.getRange(1, 10, lastRow, 1);
  deadColI.setBackground('#f0f0f0');
  deadColI.setFontColor('#999999');
  deadColJ.setBackground('#f0f0f0');
  deadColJ.setFontColor('#999999');

  // ── Highlight new columns with light green headers ──
  var newColHeaders = sheet.getRange(1, 11, 1, 5); // K, L, M, N, O
  newColHeaders.setBackground('#d9ead3');

  // ── Color-code dropdown columns lightly ──
  // SeasonType header
  sheet.getRange(1, 2).setBackground('#fce5cd');
  // EventType header
  sheet.getRange(1, 3).setBackground('#fce5cd');
  // TeamsUsed header
  sheet.getRange(1, 4).setBackground('#fce5cd');

  // ── Column widths ──
  sheet.setColumnWidth(1, 60);   // A: Cycle
  sheet.setColumnWidth(2, 120);  // B: SeasonType
  sheet.setColumnWidth(3, 120);  // C: EventType
  sheet.setColumnWidth(4, 90);   // D: TeamsUsed
  sheet.setColumnWidth(5, 200);  // E: NamesUsed
  sheet.setColumnWidth(6, 350);  // F: Notes (wide — your voice)
  sheet.setColumnWidth(7, 160);  // G: Stats
  sheet.setColumnWidth(8, 90);   // H: Team Record
  sheet.setColumnWidth(9, 50);   // I: VideoGameDate (narrow — dead)
  sheet.setColumnWidth(10, 50);  // J: VideoGame (narrow — dead)
  sheet.setColumnWidth(11, 250); // K: StoryAngle (wide)
  sheet.setColumnWidth(12, 100); // L: PlayerMood
  sheet.setColumnWidth(13, 120); // M: EventTrigger
  sheet.setColumnWidth(14, 140); // N: HomeNeighborhood
  sheet.setColumnWidth(15, 80);  // O: Streak

  // ── Freeze header row ──
  sheet.setFrozenRows(1);

  Logger.log('setupFeedSheet_(' + city + '): Complete — 15 columns, 6 dropdowns, 2 dead cols grayed');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply dropdown validation to a column range.
 * allowInvalid=true so existing freeform data isn't rejected.
 */
function applyDropdownValidation_(sheet, startRow, col, numRows, values, name) {
  var range = sheet.getRange(startRow, col, numRows, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(true)
    .setHelpText('Select ' + name)
    .build();
  range.setDataValidation(rule);
  Logger.log('Applied validation to column ' + col + ' (' + name + ')');
}

/**
 * Removes all validation from both feed sheets (reset).
 */
function clearSportsFeedValidation() {
  var ss = openSimSpreadsheet_();
  var sheetNames = ['Oakland_Sports_Feed', 'Chicago_Sports_Feed'];
  var dropdownCols = [2, 3, 4, 12, 13, 14]; // B, C, D, L, M, N

  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();

    for (var i = 0; i < dropdownCols.length; i++) {
      var range = sheet.getRange(2, dropdownCols[i], Math.max(lastRow - 1, 1), 1);
      range.clearDataValidations();
    }
    Logger.log('Cleared validation from ' + sheetNames[s]);
  }

  SpreadsheetApp.getUi().alert('Validation cleared from both feed sheets.');
}
