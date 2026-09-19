// @cycle-status: off-cycle — one-time setup, menu item (utilities/godWorldMenu.js)
/**
 * ============================================================================
 * setupSportsFeedValidation.js v3.0
 * ============================================================================
 *
 * v3.0 (engine.202): every step finds its column by HEADER NAME. The feed
 * grows (WeekRecord appended at U on Oakland) and will shrink (dead columns
 * deleted on Mike's go), so nothing past the K–O bootstrap assumes a position.
 * A header the sheet does not carry is skipped, which is how Chicago (no
 * WeekRecord) keeps its own contract.
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
 *   P–T: FanSentiment, FranchiseStability, EconomicFootprint,
 *        CommunityInvestment, MediaProfile
 *   U: WeekRecord      (Oakland only — engine.202 weekly summary)
 *
 * Positions above describe today's sheets; the code reads names, not letters.
 *
 * Run from Apps Script editor:
 *   setupSportsFeedValidation()    — sets up both sheets
 *   setupOaklandFeedOnly()         — Oakland only
 *   setupChicagoFeedOnly()         — Chicago only
 *   clearSportsFeedValidation()    — removes all validation from both
 *
 * Safe to run multiple times — updates existing validations.
 *
 * @version 3.0
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

var OAKLAND_EVENT_TYPE_VALUES = [
  'game-result',
  'stat-capture',
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

// Exactly the keys of TRIGGER_HOOKS (phase07-evening-media/storyHook.js) —
// the only reader that turns a trigger into a story. trade-deadline / all-star
// / draft had no hook and were dropped (engine.202 cut 3); giving them one is
// a sim call. Free text still reaches the media handoff (allowInvalid).
// scripts/sportsFeedContract.test.js pins this list to the hook table.
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
  'injury',
  'injury-return',
  'debut'
];

// P–T: exactly the words applySportsSeason.js parses (parseFanSentiment_,
// parseFranchiseStability_, parseEconomicFootprint_,
// parseCommunityInvestment_, parseMediaProfile_). Pinned by the same test.
var FAN_SENTIMENT_VALUES = ['', 'electric', 'euphoric', 'high', 'confident', 'excited', 'neutral', 'moderate',
  'uncertain', 'anxious', 'low', 'apathetic', 'disappointed', 'frustrated', 'angry', 'hostile'];
var FRANCHISE_STABILITY_VALUES = ['', 'stable', 'strong', 'growing', 'uncertain', 'unstable', 'crisis', 'relocating'];
var ECONOMIC_FOOTPRINT_VALUES = ['', 'growing', 'booming', 'stable', 'steady', 'shrinking', 'declining', 'uncertain'];
var COMMUNITY_INVESTMENT_VALUES = ['', 'active', 'strong', 'heavy', 'moderate', 'growing', 'passive', 'minimal',
  'declining', 'none', 'absent'];
var MEDIA_PROFILE_VALUES = ['', 'local', 'regional', 'national', 'international'];

var OAKLAND_TEAMS = ["A's", 'Oaks'];

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
  'Streak': 'Current team streak. Format: W6 or L3.\nW = wins, L = losses, number = consecutive games.\nFeeds engine sentiment calculation.\nLeave blank if not applicable.',
  'WeekRecord': 'This franchise\'s games this Cycle, in played order.\nOne summary row per franchise per Cycle.\n' +
    'H:W = home win, H:L = home loss, A:W = away win, A:L = away loss.\nExample: H:W H:L A:W\n' +
    'Games need EventType game-result. none = no games this Cycle (EventType season-state).\n' +
    'Blank = not reported. The casino settles on the first game.'
};

// Header-name layout for setupFeedSheet_ / clearSportsFeedValidation.
var FEED_DEAD_HEADERS = ['VideoGameDate', 'VideoGame'];
var FEED_NEW_HEADERS = ['StoryAngle', 'PlayerMood', 'EventTrigger', 'HomeNeighborhood', 'Streak', 'WeekRecord'];
var FEED_DROPDOWN_HEADERS = ['SeasonType', 'EventType', 'TeamsUsed', 'PlayerMood', 'EventTrigger', 'HomeNeighborhood',
  'FanSentiment', 'FranchiseStability', 'EconomicFootprint', 'CommunityInvestment', 'MediaProfile'];
var FEED_COLUMN_WIDTHS = {
  'Cycle': 60, 'SeasonType': 120, 'EventType': 120, 'TeamsUsed': 90,
  'NamesUsed': 200, 'Notes': 350, 'Stats': 160, 'Team Record': 90,
  'VideoGameDate': 50, 'VideoGame': 50, 'StoryAngle': 250, 'PlayerMood': 100,
  'EventTrigger': 120, 'HomeNeighborhood': 140, 'Streak': 80, 'WeekRecord': 140
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

  Logger.log('setupSportsFeedValidation v3.0: Complete');
  SpreadsheetApp.getUi().alert(
    'Sports Feed Setup Complete!\n\n' +
    results.join('\n') + '\n\n' +
    'Columns with dropdowns:\n  ' + FEED_DROPDOWN_HEADERS.join(', ') + '\n\n' +
    'Dead columns grayed out:\n  ' + FEED_DEAD_HEADERS.join(', ')
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

  // ── Everything below reads the live header row by NAME ──
  var headerRow = feedHeaderRow_(sheet);
  var colOf = function(name) { return headerRow.indexOf(name) + 1; }; // 0 = absent

  // ── Apply dropdowns ──
  var eventTypeValues = city === 'Oakland'
    ? OAKLAND_EVENT_TYPE_VALUES
    : EVENT_TYPE_VALUES;
  var dropdownValues = {
    'SeasonType': SEASON_TYPE_VALUES,
    'EventType': eventTypeValues,
    'TeamsUsed': teamValues,
    'PlayerMood': PLAYER_MOOD_VALUES,
    'EventTrigger': EVENT_TRIGGER_VALUES,
    'HomeNeighborhood': neighborhoodValues,
    'FanSentiment': FAN_SENTIMENT_VALUES,
    'FranchiseStability': FRANCHISE_STABILITY_VALUES,
    'EconomicFootprint': ECONOMIC_FOOTPRINT_VALUES,
    'CommunityInvestment': COMMUNITY_INVESTMENT_VALUES,
    'MediaProfile': MEDIA_PROFILE_VALUES
  };
  var dropdownCount = 0;
  for (var d = 0; d < FEED_DROPDOWN_HEADERS.length; d++) {
    var dropdownCol = colOf(FEED_DROPDOWN_HEADERS[d]);
    if (!dropdownCol) continue;
    applyDropdownValidation_(sheet, 2, dropdownCol, dataRows,
      dropdownValues[FEED_DROPDOWN_HEADERS[d]], FEED_DROPDOWN_HEADERS[d]);
    dropdownCount++;
  }

  // ── Header notes (hover help) ──
  for (var i = 0; i < headerRow.length; i++) {
    var note = HEADER_NOTES[headerRow[i]];
    if (note) {
      sheet.getRange(1, i + 1).setNote(note);
    }
  }

  // ── Format ALL headers ──
  var headerRange = sheet.getRange(1, 1, 1, headerRow.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8f0fe');

  // ── Gray out dead columns ──
  var deadCount = 0;
  for (var g = 0; g < FEED_DEAD_HEADERS.length; g++) {
    var deadCol = colOf(FEED_DEAD_HEADERS[g]);
    if (!deadCol) continue;
    var deadRange = sheet.getRange(1, deadCol, lastRow, 1);
    deadRange.setBackground('#f0f0f0');
    deadRange.setFontColor('#999999');
    deadCount++;
  }

  // ── Highlight new columns with light green headers ──
  for (var n = 0; n < FEED_NEW_HEADERS.length; n++) {
    var newCol = colOf(FEED_NEW_HEADERS[n]);
    if (newCol) sheet.getRange(1, newCol).setBackground('#d9ead3');
  }

  // ── Color-code the core dropdown headers lightly ──
  ['SeasonType', 'EventType', 'TeamsUsed'].forEach(function(name) {
    var coreCol = colOf(name);
    if (coreCol) sheet.getRange(1, coreCol).setBackground('#fce5cd');
  });

  // ── Column widths ──
  for (var w = 0; w < headerRow.length; w++) {
    var width = FEED_COLUMN_WIDTHS[headerRow[w]];
    if (width) sheet.setColumnWidth(w + 1, width);
  }

  // ── Freeze header row ──
  sheet.setFrozenRows(1);

  Logger.log('setupFeedSheet_(' + city + '): Complete — ' + headerRow.length + ' columns, ' +
    dropdownCount + ' dropdowns, ' + deadCount + ' dead cols grayed');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The live header row as trimmed strings, full width.
 */
function feedHeaderRow_(sheet) {
  var width = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, width).getValues()[0].map(function(h) {
    return String(h == null ? '' : h).trim();
  });
}

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

  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    var headerRow = feedHeaderRow_(sheet);

    for (var i = 0; i < FEED_DROPDOWN_HEADERS.length; i++) {
      var col = headerRow.indexOf(FEED_DROPDOWN_HEADERS[i]) + 1;
      if (!col) continue;
      var range = sheet.getRange(2, col, Math.max(lastRow - 1, 1), 1);
      range.clearDataValidations();
    }
    Logger.log('Cleared validation from ' + sheetNames[s]);
  }

  SpreadsheetApp.getUi().alert('Validation cleared from both feed sheets.');
}

// Node: scripts/sportsFeedContract.js validates dashboard drafts against these
// same lists, so the sheet dropdown and the validator cannot drift apart.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEASON_TYPE_VALUES: SEASON_TYPE_VALUES,
    OAKLAND_EVENT_TYPE_VALUES: OAKLAND_EVENT_TYPE_VALUES,
    PLAYER_MOOD_VALUES: PLAYER_MOOD_VALUES,
    EVENT_TRIGGER_VALUES: EVENT_TRIGGER_VALUES,
    FEED_NEIGHBORHOODS: FEED_NEIGHBORHOODS,
    FAN_SENTIMENT_VALUES: FAN_SENTIMENT_VALUES,
    FRANCHISE_STABILITY_VALUES: FRANCHISE_STABILITY_VALUES,
    ECONOMIC_FOOTPRINT_VALUES: ECONOMIC_FOOTPRINT_VALUES,
    COMMUNITY_INVESTMENT_VALUES: COMMUNITY_INVESTMENT_VALUES,
    MEDIA_PROFILE_VALUES: MEDIA_PROFILE_VALUES
  };
}
