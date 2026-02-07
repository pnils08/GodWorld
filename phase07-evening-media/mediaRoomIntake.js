/**
 * ============================================================================
 * MEDIA ROOM INTAKE v2.5
 * ============================================================================
 *
 * Aligned with MEDIA_ROOM_INSTRUCTIONS v2.0 and GodWorld Calendar v1.0
 *
 * v2.5 Enhancements:
 * - routeCitizenUsageToIntake_: Routes Citizen_Media_Usage rows to Intake (new)
 *   or Advancement_Intake1 (existing) based on Simulation_Ledger lookup.
 *   Uses separate "Routed" column so processMediaUsage_ (Phase 5) still sees
 *   unprocessed rows for usage counting and tier promotions.
 * - Wired into processAllIntakeSheets_ after processCitizenUsageIntake_
 * - Handles backlog: all unrouted rows processed on first run
 *
 * v2.4 Enhancements:
 * - Storyline lifecycle: "resolved" type in Storyline_Intake now finds and
 *   closes matching active storylines in Storyline_Tracker instead of appending
 * - Continuity pipeline removed: Continuity_Loop and Continuity_Intake eliminated.
 *   Direct quotes from edition route to LifeHistory_Log. All other continuity
 *   notes stay in the edition text for auditing only — no sheet storage.
 * - Template alignment: CYCLE_PULSE_TEMPLATE v1.2 pipe-separated format
 *
 * v2.3 Enhancements:
 * - processMediaIntake_(ctx): Engine-callable entry point for Phase 11
 * - processAllIntakeSheets_(): Shared processing logic
 * - Consolidated: processMediaIntake.js (v2.1) deleted — this is the single processor
 *
 * v2.2 Enhancements:
 * - Raw citizen usage log parsing (paste full log, auto-route)
 * - Citizen existence check against Simulation_Ledger
 * - Automatic routing: New → Intake, Existing → Advancement_Intake
 * - Category detection: UNI (Universe/athletes), MED (Media), CIV (Civic)
 * - Quote extraction to LifeHistory_Log
 * - Full demographic parsing (age, neighborhood, occupation)
 *
 * v2.1 Enhancements:
 * - Calendar columns in all output sheets
 * - getCurrentCalendarContext_() helper
 * - Calendar signal sources (holiday, first-friday, creation-day)
 * - Calendar story types (holiday, festival)
 * - Calendar context in Media_Ledger
 * - Upgrade functions for existing sheets
 *
 * Handles four intake streams from Media Room:
 * 1. Article Table → Press_Drafts (14 columns)
 * 2. Storylines Carried Forward → Storyline_Tracker (14 columns)
 * 3. Citizen Usage Log → Citizen_Media_Usage (12 columns)
 * 4. Continuity Notes → LifeHistory_Log (direct quotes only; everything else is audit-only in edition)
 *
 * SETUP:
 * 1. Add to Simulation_Narrative Apps Script
 * 2. Run setupMediaIntakeV2() once to create all sheets
 * 3. After each cycle: paste Media Room outputs, run processMediaIntakeV2()
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// MAIN PROCESSING FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Engine-callable function — called from Phase 11 in godWorldEngine2.js.
 * Processes all unprocessed rows in the four intake sheets.
 * @param {Object} ctx - Engine context (ctx.ss, ctx.config.cycleCount)
 */
function processMediaIntake_(ctx) {
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  var cal = getCurrentCalendarContext_(ss);

  Logger.log('processMediaIntake_ v2.5: Starting intake processing for cycle ' + cycle);

  var results = processAllIntakeSheets_(ss, cycle, cal);

  ctx.summary.intakeProcessed = results;

  var routing = results.citizenRouting || {};
  Logger.log('processMediaIntake_ v2.5: Complete. ' +
    'Articles: ' + results.articles +
    ', Storylines: ' + results.storylines +
    ', Citizens: ' + results.citizenUsage +
    ', Routed: ' + (routing.routed || 0) +
    ' (new: ' + (routing.newCitizens || 0) + ', existing: ' + (routing.existingCitizens || 0) +
    ', dupes: ' + (routing.skippedDupes || 0) + ')');

  return results;
}


/**
 * Menu-callable function — run manually from Apps Script UI.
 * No underscore = visible in script menu.
 */
function processMediaIntakeV2() {

  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var cycle = getCurrentCycle_(ss);
  var cal = getCurrentCalendarContext_(ss);

  var results = processAllIntakeSheets_(ss, cycle, cal);

  var summary = 'Media Intake v2.2 Complete:\n' +
    '- Articles: ' + results.articles + '\n' +
    '- Storylines: ' + results.storylines + '\n' +
    '- Citizen Usage: ' + results.citizenUsage + '\n' +
    '- Continuity Notes: ' + results.continuity + '\n' +
    '- Holiday: ' + cal.holiday + '\n' +
    '- Sports: ' + cal.sportsSeason;

  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);

  return results;
}


/**
 * Shared processing logic — called by both processMediaIntake_(ctx) and processMediaIntakeV2().
 */
function processAllIntakeSheets_(ss, cycle, cal) {
  var results = {
    articles: 0,
    storylines: 0,
    citizenUsage: 0
  };

  results.articles = processArticleIntake_(ss, cycle, cal);
  results.storylines = processStorylineIntake_(ss, cycle, cal);
  results.citizenUsage = processCitizenUsageIntake_(ss, cycle, cal);
  results.citizenRouting = routeCitizenUsageToIntake_(ss, cycle, cal);
  // Continuity pipeline removed — quotes route to LifeHistory_Log via
  // parseContinuityNotes_ in parseMediaRoomMarkdown.js during parse step.

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// v2.1: CALENDAR CONTEXT HELPER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets current calendar context from World_Population sheet.
 * Returns defaults if sheet or columns don't exist.
 */
function getCurrentCalendarContext_(ss) {
  var defaults = {
    season: '',
    holiday: 'none',
    holidayPriority: 'none',
    isFirstFriday: false,
    isCreationDay: false,
    sportsSeason: 'off-season',
    month: 0
  };

  try {
    var sheet = ss.getSheetByName('World_Population');
    if (!sheet) return defaults;

    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return defaults;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var dataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

    var idx = function(name) {
      return headers.indexOf(name);
    };

    if (idx('season') >= 0) defaults.season = dataRow[idx('season')] || '';
    if (idx('holiday') >= 0) defaults.holiday = dataRow[idx('holiday')] || 'none';
    if (idx('holidayPriority') >= 0) defaults.holidayPriority = dataRow[idx('holidayPriority')] || 'none';
    if (idx('isFirstFriday') >= 0) defaults.isFirstFriday = dataRow[idx('isFirstFriday')] === true || dataRow[idx('isFirstFriday')] === 'TRUE';
    if (idx('isCreationDay') >= 0) defaults.isCreationDay = dataRow[idx('isCreationDay')] === true || dataRow[idx('isCreationDay')] === 'TRUE';
    if (idx('sportsSeason') >= 0) defaults.sportsSeason = dataRow[idx('sportsSeason')] || 'off-season';
    if (idx('month') >= 0) defaults.month = Number(dataRow[idx('month')]) || 0;

    return defaults;

  } catch (e) {
    Logger.log('getCurrentCalendarContext_ ERROR: ' + e.message);
    return defaults;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// 1. ARTICLE TABLE PROCESSING
// ════════════════════════════════════════════════════════════════════════════

function processArticleIntake_(ss, cycle, cal) {

  var intakeSheet = ss.getSheetByName('Media_Intake');
  if (!intakeSheet) return 0;

  var data = intakeSheet.getDataRange().getValues();
  var drafts = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip empty or processed rows
    if (!row[0] && !row[1] && !row[2]) continue;
    if (row[6] === 'processed') continue;

    drafts.push({
      reporter: row[0] || 'Unknown',
      storyType: row[1] || 'general',
      signalSource: row[2] || 'editorial',
      headline: row[3] || '',
      articleText: row[4] || '',
      culturalMentions: row[5] || ''
    });

    // Mark processed
    intakeSheet.getRange(i + 1, 7).setValue('processed');
  }

  if (drafts.length === 0) return 0;

  // Write to Press_Drafts (v2.1: 14 columns with calendar)
  var pressSheet = ensurePressDraftsSheet_(ss);
  var now = new Date();

  var rows = [];
  for (var j = 0; j < drafts.length; j++) {
    var d = drafts[j];
    rows.push([
      now,                    // A  Timestamp
      cycle,                  // B  Cycle
      d.reporter,             // C  Reporter
      d.storyType,            // D  StoryType
      d.signalSource,         // E  SignalSource
      d.headline,             // F  SummaryPrompt
      d.articleText,          // G  DraftText
      'draft',                // H  Status
      // v2.1: Calendar columns
      cal.season,             // I  Season
      cal.holiday,            // J  Holiday
      cal.holidayPriority,    // K  HolidayPriority
      cal.isFirstFriday,      // L  IsFirstFriday
      cal.isCreationDay,      // M  IsCreationDay
      cal.sportsSeason        // N  SportsSeason
    ]);
  }

  var startRow = pressSheet.getLastRow() + 1;
  pressSheet.getRange(startRow, 1, rows.length, 14).setValues(rows);

  // Process cultural mentions → Media_Ledger
  for (var k = 0; k < drafts.length; k++) {
    var draft = drafts[k];
    if (draft.culturalMentions) {
      var mentions = draft.culturalMentions.split(',');
      for (var m = 0; m < mentions.length; m++) {
        var name = mentions[m].trim();
        if (name) {
          logCulturalMention_(ss, cycle, draft.reporter, name, cal);
        }
      }
    }
  }

  return drafts.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 2. STORYLINES CARRIED FORWARD
// ════════════════════════════════════════════════════════════════════════════

function processStorylineIntake_(ss, cycle, cal) {

  var intakeSheet = ss.getSheetByName('Storyline_Intake');
  if (!intakeSheet) return 0;

  var data = intakeSheet.getDataRange().getValues();
  var newStorylines = [];
  var resolveDescriptions = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip empty or processed
    if (!row[0] && !row[1]) continue;
    if (row[5] === 'processed') continue;

    var type, description, neighborhood, citizens, priority;

    // Check if pipe-separated data was pasted entirely in column A
    var colA = String(row[0] || '').trim();
    if (colA.indexOf('|') >= 0 && !row[1]) {
      var parts = colA.replace(/^[—–-]\s*/, '').split('|');
      type = (parts[0] || '').trim().toLowerCase();
      description = (parts[1] || '').trim();
      neighborhood = (parts[2] || '').trim();
      citizens = (parts[3] || '').trim();
      priority = (parts[4] || '').trim();
    } else {
      type = colA.toLowerCase();
      description = String(row[1] || '').trim();
      neighborhood = String(row[2] || '').trim();
      citizens = String(row[3] || '').trim();
      priority = String(row[4] || '').trim();
    }

    if (type === 'resolved') {
      // This entry closes a matching storyline in the tracker
      resolveDescriptions.push(description);
    } else {
      // New storyline to add
      newStorylines.push({
        storylineType: type || 'arc',
        description: description,
        neighborhood: neighborhood,
        relatedCitizens: citizens,
        priority: priority || 'normal'
      });
    }

    intakeSheet.getRange(i + 1, 6).setValue('processed');
  }

  var trackerSheet = ensureStorylineTracker_(ss);
  var totalProcessed = 0;

  // --- Resolve matching storylines in tracker ---
  if (resolveDescriptions.length > 0) {
    var trackerData = trackerSheet.getDataRange().getValues();
    var headers = trackerData[0];
    var descCol = headers.indexOf('Description');
    var statusCol = headers.indexOf('Status');

    if (descCol >= 0 && statusCol >= 0) {
      for (var r = 1; r < trackerData.length; r++) {
        var trackerDesc = String(trackerData[r][descCol] || '').trim().toLowerCase();
        var trackerStatus = String(trackerData[r][statusCol] || '').trim().toLowerCase();

        // Only resolve active storylines
        if (trackerStatus !== 'active') continue;

        for (var d = 0; d < resolveDescriptions.length; d++) {
          var resolveKey = resolveDescriptions[d].toLowerCase();
          // Match if tracker description contains the resolve key or vice versa
          if (trackerDesc.indexOf(resolveKey) >= 0 || resolveKey.indexOf(trackerDesc) >= 0) {
            trackerSheet.getRange(r + 1, statusCol + 1).setValue('resolved');
            Logger.log('processStorylineIntake_: Resolved storyline row ' + (r + 1) + ': ' + trackerData[r][descCol]);
            totalProcessed++;
            break;
          }
        }
      }
    }
  }

  // --- Add new storylines ---
  if (newStorylines.length > 0) {
    var now = new Date();
    var rows = [];
    for (var j = 0; j < newStorylines.length; j++) {
      var s = newStorylines[j];
      rows.push([
        now,                    // A  Timestamp
        cycle,                  // B  CycleAdded
        s.storylineType,        // C  StorylineType
        s.description,          // D  Description
        s.neighborhood,         // E  Neighborhood
        s.relatedCitizens,      // F  RelatedCitizens
        s.priority,             // G  Priority
        'active',               // H  Status
        // v2.1: Calendar columns
        cal.season,             // I  Season
        cal.holiday,            // J  Holiday
        cal.holidayPriority,    // K  HolidayPriority
        cal.isFirstFriday,      // L  IsFirstFriday
        cal.isCreationDay,      // M  IsCreationDay
        cal.sportsSeason        // N  SportsSeason
      ]);
    }

    var startRow = trackerSheet.getLastRow() + 1;
    trackerSheet.getRange(startRow, 1, rows.length, 14).setValues(rows);
    totalProcessed += newStorylines.length;
  }

  Logger.log('processStorylineIntake_: ' + newStorylines.length + ' new, ' +
    resolveDescriptions.length + ' resolved');

  return totalProcessed;
}


// ════════════════════════════════════════════════════════════════════════════
// 3. CITIZEN USAGE LOG
// ════════════════════════════════════════════════════════════════════════════

function processCitizenUsageIntake_(ss, cycle, cal) {

  var intakeSheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!intakeSheet) return 0;

  var data = intakeSheet.getDataRange().getValues();
  var usages = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip empty or processed
    if (!row[0]) continue;
    if (row[4] === 'processed') continue;

    usages.push({
      citizenName: row[0] || '',
      usageType: row[1] || 'mentioned',  // mentioned / quoted / profiled / featured
      context: row[2] || '',
      reporter: row[3] || ''
    });

    intakeSheet.getRange(i + 1, 5).setValue('processed');
  }

  if (usages.length === 0) return 0;

  // Write to Citizen_Media_Usage (v2.1: 12 columns with calendar)
  var usageSheet = ensureCitizenMediaUsage_(ss);
  var now = new Date();

  var rows = [];
  for (var j = 0; j < usages.length; j++) {
    var u = usages[j];
    rows.push([
      now,                    // A  Timestamp
      cycle,                  // B  Cycle
      u.citizenName,          // C  CitizenName
      u.usageType,            // D  UsageType
      u.context,              // E  Context
      u.reporter,             // F  Reporter
      // v2.1: Calendar columns
      cal.season,             // G  Season
      cal.holiday,            // H  Holiday
      cal.holidayPriority,    // I  HolidayPriority
      cal.isFirstFriday,      // J  IsFirstFriday
      cal.isCreationDay,      // K  IsCreationDay
      cal.sportsSeason        // L  SportsSeason
    ]);

    // If profiled or featured, flag for tier review
    if (u.usageType === 'profiled' || u.usageType === 'featured') {
      flagCitizenForTierReview_(ss, u.citizenName, cycle, u.usageType);
    }
  }

  var startRow = usageSheet.getLastRow() + 1;
  usageSheet.getRange(startRow, 1, rows.length, 12).setValues(rows);

  return usages.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 3B. CITIZEN USAGE ROUTING (v2.5)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Route unrouted Citizen_Media_Usage rows to Intake (new) or Advancement_Intake1 (existing).
 * Uses a separate "Routed" column so processMediaUsage_ (Phase 5) still sees rows
 * for usage counting and tier promotions via the "Processed" column.
 *
 * @param {Spreadsheet} ss
 * @param {number} cycle
 * @param {Object} cal - Calendar context
 * @return {{ routed: number, newCitizens: number, existingCitizens: number }}
 */
function routeCitizenUsageToIntake_(ss, cycle, cal) {
  var results = { routed: 0, newCitizens: 0, existingCitizens: 0, skippedDupes: 0 };

  var usageSheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!usageSheet) return results;

  var data = usageSheet.getDataRange().getValues();
  if (data.length < 2) return results;

  var headers = data[0];

  // Find or create Routed column
  var routedCol = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim() === 'Routed') { routedCol = h; break; }
  }
  if (routedCol < 0) {
    routedCol = headers.length;
    usageSheet.getRange(1, routedCol + 1).setValue('Routed');
  }

  // Find CitizenName and UsageType columns
  var nameCol = -1;
  var usageTypeCol = -1;
  var contextCol = -1;
  for (var c = 0; c < headers.length; c++) {
    var hdr = String(headers[c]).trim();
    if (hdr === 'CitizenName' || hdr === 'Name') nameCol = c;
    if (hdr === 'UsageType') usageTypeCol = c;
    if (hdr === 'Context') contextCol = c;
  }
  if (nameCol < 0) return results;

  // Load Simulation_Ledger for existence checks
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var ledgerData = ledger ? ledger.getDataRange().getValues() : [];

  // Get target sheets
  var intakeSheet = ss.getSheetByName('Intake');
  var advSheet = ss.getSheetByName('Advancement_Intake1');
  if (!advSheet) advSheet = ss.getSheetByName('Advancement_Intake');

  // Dedup: track names already routed in this batch (normalized lowercase key)
  var seenNew = {};      // names routed to Intake this batch
  var seenExisting = {}; // names routed to Advancement this batch

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip already routed
    if (routedCol < row.length && row[routedCol] === 'Y') continue;

    var citizenName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    if (!citizenName) continue;

    var usageType = usageTypeCol >= 0 ? String(row[usageTypeCol] || '').trim() : '';
    var context = contextCol >= 0 ? String(row[contextCol] || '').trim() : '';

    var nameParts = splitName_(citizenName);
    var nameKey = (nameParts.first + ' ' + nameParts.last).toLowerCase().trim();
    var exists = citizenExistsInLedger_(ledgerData, nameParts.first, nameParts.last);

    if (exists) {
      // Existing citizen → Advancement_Intake1 (first appearance only)
      if (!seenExisting[nameKey]) {
        if (advSheet) {
          advSheet.appendRow([
            nameParts.first,          // A: First
            '',                       // B: Middle
            nameParts.last,           // C: Last
            '',                       // D: RoleType (keep existing)
            '',                       // E: Tier (keep existing)
            '',                       // F: ClockMode (keep existing)
            '',                       // G: CIV
            '',                       // H: MED
            '',                       // I: UNI
            'Media usage C' + cycle + ' (' + usageType + '): ' + context // J: Notes
          ]);
          results.existingCitizens++;
        }
        seenExisting[nameKey] = true;
      } else {
        results.skippedDupes++;
      }
    } else {
      // New citizen → Intake (first appearance only)
      if (!seenNew[nameKey]) {
        if (intakeSheet) {
          intakeSheet.appendRow([
            nameParts.first,          // A: First
            '',                       // B: Middle
            nameParts.last,           // C: Last
            '',                       // D: OriginGame
            'no',                     // E: UNI
            'no',                     // F: MED
            'no',                     // G: CIV
            'ENGINE',                 // H: ClockMode
            4,                        // I: Tier (default for media-introduced)
            'Citizen',                // J: RoleType
            'Active',                 // K: Status
            '',                       // L: BirthYear
            'Oakland',                // M: OriginCity
            'Introduced via Media Room C' + cycle + '. ' + context, // N: LifeHistory
            '',                       // O: OriginVault
            ''                        // P: Neighborhood
          ]);
          results.newCitizens++;
        }
        seenNew[nameKey] = true;
      } else {
        results.skippedDupes++;
      }
    }

    // Mark as routed (all appearances, including dupes)
    usageSheet.getRange(i + 1, routedCol + 1).setValue('Y');
    results.routed++;
  }

  Logger.log('routeCitizenUsageToIntake_: Routed ' + results.routed +
    ' citizens (new: ' + results.newCitizens + ', existing: ' + results.existingCitizens +
    ', dupes skipped: ' + results.skippedDupes + ')');

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// 4. CONTINUITY NOTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * DEPRECATED — Continuity pipeline removed.
 * Continuity notes stay in the edition for auditing.
 * Direct quotes route to LifeHistory_Log via parseContinuityNotes_ in parseMediaRoomMarkdown.js.
 * This stub exists only for backwards compatibility if called from old code.
 */
function processContinuityIntake_(ss, cycle, cal) {
  Logger.log('processContinuityIntake_: DEPRECATED — continuity pipeline removed. Quotes route via parseMediaRoomMarkdown.');
  return 0;
}


// ════════════════════════════════════════════════════════════════════════════
// SETUP FUNCTION — Creates all intake sheets
// ════════════════════════════════════════════════════════════════════════════

function setupMediaIntakeV2() {

  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var created = [];

  // 1. Media_Intake (Articles)
  var articleSheet = ss.getSheetByName('Media_Intake');
  if (!articleSheet) {
    articleSheet = ss.insertSheet('Media_Intake');
    articleSheet.appendRow(['Reporter', 'StoryType', 'SignalSource', 'Headline', 'ArticleText', 'CulturalMentions', 'Status']);
    articleSheet.setFrozenRows(1);
    setupArticleValidation_(articleSheet);
    created.push('Media_Intake');
  }

  // 2. Storyline_Intake
  var storylineSheet = ss.getSheetByName('Storyline_Intake');
  if (!storylineSheet) {
    storylineSheet = ss.insertSheet('Storyline_Intake');
    storylineSheet.appendRow(['StorylineType', 'Description', 'Neighborhood', 'RelatedCitizens', 'Priority', 'Status']);
    storylineSheet.setFrozenRows(1);
    setupStorylineValidation_(storylineSheet);
    created.push('Storyline_Intake');
  }

  // 3. Citizen_Usage_Intake
  var usageSheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!usageSheet) {
    usageSheet = ss.insertSheet('Citizen_Usage_Intake');
    usageSheet.appendRow(['CitizenName', 'UsageType', 'Context', 'Reporter', 'Status']);
    usageSheet.setFrozenRows(1);
    setupUsageValidation_(usageSheet);
    created.push('Citizen_Usage_Intake');
  }

  // 4. Continuity_Intake — REMOVED (continuity pipeline eliminated)
  // Quotes route to LifeHistory_Log via parseMediaRoomMarkdown.js

  // Ensure output sheets exist too (v2.1 versions with calendar columns)
  ensurePressDraftsSheet_(ss);
  ensureStorylineTracker_(ss);
  ensureCitizenMediaUsage_(ss);

  var msg = created.length > 0
    ? 'Created sheets: ' + created.join(', ')
    : 'All intake sheets already exist';

  Logger.log('setupMediaIntakeV2: ' + msg);
  SpreadsheetApp.getUi().alert('Media Intake v2.2 Setup Complete\n\n' + msg);
}


// ════════════════════════════════════════════════════════════════════════════
// VALIDATION SETUP (v2.1: includes calendar story types and signals)
// ════════════════════════════════════════════════════════════════════════════

function setupArticleValidation_(sheet) {
  // v2.1: StoryType with holiday/festival
  var storyTypes = SpreadsheetApp.newDataValidation()
    .requireValueInList(['breaking', 'feature', 'profile', 'opinion', 'analysis', 'sports', 'culture', 'civic', 'health', 'recap', 'holiday', 'festival'])
    .build();
  sheet.getRange('B2:B100').setDataValidation(storyTypes);

  // v2.1: SignalSource with calendar signals
  var signals = SpreadsheetApp.newDataValidation()
    .requireValueInList(['shock-flag', 'health-crisis', 'pattern-wave', 'crisis-arc', 'story-seed', 'world-event', 'citizen-event', 'cultural-entity', 'sports-season', 'weather', 'editorial', 'continuity', 'holiday', 'first-friday', 'creation-day', 'championship', 'playoffs'])
    .build();
  sheet.getRange('C2:C100').setDataValidation(signals);

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 400);
  sheet.setColumnWidth(6, 150);
}

function setupStorylineValidation_(sheet) {
  // v2.1: Added holiday-related storyline types
  var types = SpreadsheetApp.newDataValidation()
    .requireValueInList(['arc', 'question', 'thread', 'mystery', 'developing', 'seasonal', 'festival', 'sports'])
    .build();
  sheet.getRange('A2:A100').setDataValidation(types);

  var priorities = SpreadsheetApp.newDataValidation()
    .requireValueInList(['urgent', 'high', 'normal', 'low', 'background'])
    .build();
  sheet.getRange('E2:E100').setDataValidation(priorities);

  sheet.setColumnWidth(2, 300);
}

function setupUsageValidation_(sheet) {
  var types = SpreadsheetApp.newDataValidation()
    .requireValueInList(['mentioned', 'quoted', 'profiled', 'featured', 'background'])
    .build();
  sheet.getRange('B2:B100').setDataValidation(types);

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(3, 250);
}

function setupContinuityValidation_(sheet) {
  // v2.1: Added seasonal callback type
  var types = SpreadsheetApp.newDataValidation()
    .requireValueInList(['builton', 'introduced', 'question', 'resolved', 'callback', 'seasonal'])
    .build();
  sheet.getRange('A2:A100').setDataValidation(types);

  sheet.setColumnWidth(2, 300);
}


// ════════════════════════════════════════════════════════════════════════════
// OUTPUT SHEET CREATION (v2.1: with calendar columns)
// ════════════════════════════════════════════════════════════════════════════

function ensurePressDraftsSheet_(ss) {
  var sheet = ss.getSheetByName('Press_Drafts');
  if (!sheet) {
    sheet = ss.insertSheet('Press_Drafts');
    // v2.1: 14 columns with calendar
    sheet.appendRow([
      'Timestamp', 'Cycle', 'Reporter', 'StoryType', 'SignalSource',
      'SummaryPrompt', 'DraftText', 'Status',
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setColumnWidth(6, 300);
    sheet.setColumnWidth(7, 500);
  }
  return sheet;
}

function ensureStorylineTracker_(ss) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) {
    sheet = ss.insertSheet('Storyline_Tracker');
    // v2.1: 14 columns with calendar
    sheet.appendRow([
      'Timestamp', 'CycleAdded', 'StorylineType', 'Description', 'Neighborhood',
      'RelatedCitizens', 'Priority', 'Status',
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setColumnWidth(4, 300);
  }
  return sheet;
}

function ensureCitizenMediaUsage_(ss) {
  var sheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!sheet) {
    sheet = ss.insertSheet('Citizen_Media_Usage');
    // v2.5: 13 columns with calendar + Routed
    sheet.appendRow([
      'Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter',
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason',
      'Routed'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(5, 250);
  }
  return sheet;
}

// ensureContinuityLoop_ — REMOVED (continuity pipeline eliminated)


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function getCurrentCycle_(ss) {
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) return 0;

  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'cycleCount') {
      return Number(data[i][1]) || 0;
    }
  }
  return 0;
}


/**
 * v2.1: Updated to include calendar context
 */
function logCulturalMention_(ss, cycle, journalist, entityName, cal) {
  var mediaSheet = ss.getSheetByName('Media_Ledger');
  if (!mediaSheet) {
    // Create with v2.1 headers
    mediaSheet = ss.insertSheet('Media_Ledger');
    mediaSheet.appendRow([
      'Timestamp', 'Cycle', 'Journalist', 'NameUsed', 'FameCategory',
      'CulturalDomain', 'FameScore', 'TrendTrajectory', 'MediaSpread',
      'CityTier', 'Neighborhood', 'StorySeedCount', 'CycleWeight',
      'CycleWeightReason', 'ChaosEvents', 'NightlifeVolume', 'Sentiment',
      'CivicLoad', 'ShockFlag', 'PatternFlag', 'EconomicMood',
      'WeatherType', 'WeatherMood', 'MediaIntensity', 'ActiveArcs',
      // v2.1: Calendar columns
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday',
      'IsCreationDay', 'SportsSeason', 'Month'
    ]);
    mediaSheet.setFrozenRows(1);
    mediaSheet.getRange(1, 1, 1, 32).setFontWeight('bold');
  }

  // Look up entity
  var culSheet = ss.getSheetByName('Cultural_Ledger');
  var entityData = {};

  if (culSheet) {
    var data = culSheet.getDataRange().getValues();
    var headers = data[0];
    var col = function(n) { return headers.indexOf(n); };

    for (var i = 1; i < data.length; i++) {
      if (data[i][col('Name')] === entityName) {
        entityData = {
          fameCategory: data[i][col('FameCategory')] || '',
          domain: data[i][col('CulturalDomain')] || '',
          fameScore: data[i][col('FameScore')] || '',
          trend: data[i][col('TrendTrajectory')] || '',
          spread: data[i][col('MediaSpread')] || '',
          tier: data[i][col('CityTier')] || '',
          neighborhood: data[i][col('Neighborhood')] || ''
        };
        break;
      }
    }
  }

  // v2.1: Include calendar context
  cal = cal || { season: '', holiday: 'none', holidayPriority: 'none', isFirstFriday: false, isCreationDay: false, sportsSeason: 'off-season', month: 0 };

  mediaSheet.appendRow([
    new Date(), cycle, journalist, entityName,
    entityData.fameCategory || '', entityData.domain || '',
    entityData.fameScore || '', entityData.trend || '',
    entityData.spread || '', entityData.tier || '',
    entityData.neighborhood || '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // v2.1: Calendar columns
    cal.season, cal.holiday, cal.holidayPriority,
    cal.isFirstFriday, cal.isCreationDay, cal.sportsSeason, cal.month
  ]);
}


function flagCitizenForTierReview_(ss, citizenName, cycle, usageType) {
  // Add to Advancement_Intake if profiled/featured
  var advSheet = ss.getSheetByName('Advancement_Intake');
  if (!advSheet) return;

  // Check if already flagged
  var data = advSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === citizenName || data[i][1] === citizenName) {
      // Already in list, update notes
      var notesCol = data[0].indexOf('Notes');
      if (notesCol === -1) notesCol = data[0].length - 1;
      var existingNotes = data[i][notesCol] || '';
      advSheet.getRange(i + 1, notesCol + 1).setValue(existingNotes + ' [Media ' + usageType + ' C' + cycle + ']');
      return;
    }
  }

  // Add new entry
  advSheet.appendRow([citizenName, '', '', '', '', '', 'pending', 'Media ' + usageType + ' C' + cycle]);
  Logger.log('flagCitizenForTierReview_: ' + citizenName + ' flagged for tier review');
}


// ════════════════════════════════════════════════════════════════════════════
// v2.1: UPGRADE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Upgrades all output sheets to v2.1 format with calendar columns.
 * Run once to upgrade existing v2.0 sheets.
 */
function upgradeMediaIntakeSheets() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var upgraded = [];

  // Upgrade Press_Drafts
  if (upgradeSheetWithCalendarColumns_(ss, 'Press_Drafts', 8)) {
    upgraded.push('Press_Drafts');
  }

  // Upgrade Storyline_Tracker
  if (upgradeSheetWithCalendarColumns_(ss, 'Storyline_Tracker', 8)) {
    upgraded.push('Storyline_Tracker');
  }

  // Upgrade Citizen_Media_Usage
  if (upgradeSheetWithCalendarColumns_(ss, 'Citizen_Media_Usage', 6)) {
    upgraded.push('Citizen_Media_Usage');
  }

  // Continuity_Loop — REMOVED (continuity pipeline eliminated)

  // Upgrade Media_Ledger (7 columns including Month)
  if (upgradeMediaLedgerWithCalendar_(ss)) {
    upgraded.push('Media_Ledger');
  }

  var msg = upgraded.length > 0
    ? 'Upgraded sheets: ' + upgraded.join(', ')
    : 'All sheets already have calendar columns';

  Logger.log('upgradeMediaIntakeSheets: ' + msg);
  SpreadsheetApp.getUi().alert('Upgrade Complete\n\n' + msg);
}


function upgradeSheetWithCalendarColumns_(ss, sheetName, expectedOriginalCols) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if already upgraded
  if (headers.indexOf('Season') >= 0) return false;

  var lastCol = sheet.getLastColumn();
  var newHeaders = ['Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'];

  sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');

  // Set defaults for existing rows
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var defaults = [];
    for (var i = 2; i <= lastRow; i++) {
      defaults.push(['', 'none', 'none', false, false, 'off-season']);
    }
    sheet.getRange(2, lastCol + 1, lastRow - 1, 6).setValues(defaults);
  }

  Logger.log('upgradeSheetWithCalendarColumns_: Upgraded ' + sheetName);
  return true;
}


function upgradeMediaLedgerWithCalendar_(ss) {
  var sheet = ss.getSheetByName('Media_Ledger');
  if (!sheet) return false;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if already upgraded
  if (headers.indexOf('Season') >= 0) return false;

  var lastCol = sheet.getLastColumn();
  var newHeaders = ['Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason', 'Month'];

  sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');

  // Set defaults for existing rows
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var defaults = [];
    for (var i = 2; i <= lastRow; i++) {
      defaults.push(['', 'none', 'none', false, false, 'off-season', 0]);
    }
    sheet.getRange(2, lastCol + 1, lastRow - 1, 7).setValues(defaults);
  }

  Logger.log('upgradeMediaLedgerWithCalendar_: Upgraded Media_Ledger');
  return true;
}


// ════════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function clearAllProcessedIntake() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var sheets = ['Media_Intake', 'Storyline_Intake', 'Citizen_Usage_Intake'];
  var total = 0;

  for (var s = 0; s < sheets.length; s++) {
    var sheet = ss.getSheetByName(sheets[s]);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    var statusCol = data[0].length; // Last column is status

    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][statusCol - 1] === 'processed') {
        sheet.deleteRow(i + 1);
        total++;
      }
    }
  }

  Logger.log('Cleared ' + total + ' processed rows across intake sheets');
}


// ════════════════════════════════════════════════════════════════════════════
// v2.2: RAW CITIZEN USAGE LOG PARSING & ROUTING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parse raw citizen usage log text and route citizens appropriately.
 *
 * Input format sections:
 * - CIVIC OFFICIALS: → CIV category
 * - SPORTS — [TEAM]: → UNI category
 * - JOURNALISTS: → MED category
 * - CITIZENS QUOTED IN ARTICLES (NEW): → Quote extraction + intake/advancement
 * - CITIZENS IN LETTERS (NEW): → Standard intake/advancement
 *
 * Flow:
 * 1. Parse text into structured citizen data
 * 2. Check if citizen exists in Simulation_Ledger
 * 3. Route: New → Intake sheet, Existing → Advancement_Intake
 * 4. Log quotes to LifeHistory_Log
 */
function processRawCitizenUsageLog_(ss, rawText, cycle, cal) {
  var results = {
    parsed: 0,
    newCitizens: 0,
    existingCitizens: 0,
    quotesLogged: 0,
    errors: []
  };

  if (!rawText || rawText.trim() === '') return results;

  // Parse raw text into structured sections
  var parsed = parseRawCitizenUsageLog_(rawText);
  results.parsed = parsed.totalCount;

  // Get ledger data for existence checks
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var ledgerData = ledger ? ledger.getDataRange().getValues() : [];

  // Process each category
  results = processCategoryEntries_(ss, parsed.civic, 'CIV', ledgerData, cycle, cal, results);
  results = processCategoryEntries_(ss, parsed.sports, 'UNI', ledgerData, cycle, cal, results);
  results = processCategoryEntries_(ss, parsed.journalists, 'MED', ledgerData, cycle, cal, results);
  results = processQuotedCitizens_(ss, parsed.quotedNew, ledgerData, cycle, cal, results);
  results = processQuotedCitizens_(ss, parsed.lettersNew, ledgerData, cycle, cal, results);

  Logger.log('processRawCitizenUsageLog_: ' + JSON.stringify(results));
  return results;
}


/**
 * Parse raw citizen usage log text into structured data.
 */
function parseRawCitizenUsageLog_(rawText) {
  var result = {
    civic: [],
    sports: [],
    journalists: [],
    quotedNew: [],
    lettersNew: [],
    totalCount: 0
  };

  var lines = rawText.split('\n');
  var currentSection = null;
  var currentTeam = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.indexOf('###') === 0) continue;

    // Detect section headers
    if (line.indexOf('CIVIC OFFICIALS') === 0) {
      currentSection = 'civic';
      currentTeam = null;
      continue;
    }
    if (line.indexOf('SPORTS') === 0) {
      currentSection = 'sports';
      // Extract team name: "SPORTS — A'S:" or "SPORTS — BULLS:"
      var teamMatch = line.match(/SPORTS\s*[—–-]\s*([^:]+)/i);
      currentTeam = teamMatch ? teamMatch[1].trim() : 'Unknown';
      continue;
    }
    if (line.indexOf('JOURNALISTS') === 0) {
      currentSection = 'journalists';
      currentTeam = null;
      continue;
    }
    if (line.indexOf('CITIZENS QUOTED IN ARTICLES') >= 0) {
      currentSection = 'quotedNew';
      currentTeam = null;
      continue;
    }
    if (line.indexOf('CITIZENS IN LETTERS') >= 0) {
      currentSection = 'lettersNew';
      currentTeam = null;
      continue;
    }

    // Skip section separator lines
    if (line.indexOf('-----') === 0) continue;

    // Parse citizen entry (starts with — or -)
    if (line.indexOf('—') === 0 || line.indexOf('-') === 0) {
      var entry = line.replace(/^[—–-]\s*/, '').trim();
      if (!entry) continue;

      var citizen = parseCitizenEntry_(entry, currentSection, currentTeam);
      if (citizen) {
        result[currentSection].push(citizen);
        result.totalCount++;
      }
    }
  }

  return result;
}


/**
 * Parse a single citizen entry based on section type.
 */
function parseCitizenEntry_(entry, section, team) {
  var citizen = {
    name: '',
    role: '',
    team: team || '',
    age: '',
    neighborhood: '',
    occupation: '',
    context: '',
    articleCount: 0
  };

  if (section === 'civic') {
    // Format: "Name (Role)" e.g., "Avery Santana (Mayor)"
    var civicMatch = entry.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (civicMatch) {
      citizen.name = civicMatch[1].trim();
      citizen.role = civicMatch[2].trim();
    } else {
      citizen.name = entry;
    }
  } else if (section === 'sports') {
    // Format: "Name (Position)" e.g., "Vinnie Keane (3B)"
    var sportsMatch = entry.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (sportsMatch) {
      citizen.name = sportsMatch[1].trim();
      citizen.role = sportsMatch[2].trim();
    } else {
      citizen.name = entry;
    }
  } else if (section === 'journalists') {
    // Format: "Name (N article[s])" e.g., "Maria Keen (1 article)"
    var journoMatch = entry.match(/^([^(]+)\s*\((\d+)\s*article/i);
    if (journoMatch) {
      citizen.name = journoMatch[1].trim();
      citizen.articleCount = parseInt(journoMatch[2], 10);
      citizen.role = 'Journalist';
    } else {
      citizen.name = entry;
      citizen.role = 'Journalist';
    }
  } else if (section === 'quotedNew' || section === 'lettersNew') {
    // Format: "Name, Age, Neighborhood, Occupation (Article context)"
    // e.g., "Terrell Davis, Laurel, Cook (Juneteenth front page)"
    // or: "Javier Harris, 57, West Oakland, Electrician (Stabilization Fund)"
    var quotedMatch = entry.match(/^([^,]+),\s*(\d+)?,?\s*([^,]+),\s*([^(]+)\s*\(([^)]+)\)/);
    if (quotedMatch) {
      citizen.name = quotedMatch[1].trim();
      citizen.age = quotedMatch[2] ? quotedMatch[2].trim() : '';
      citizen.neighborhood = quotedMatch[3].trim();
      citizen.occupation = quotedMatch[4].trim();
      citizen.context = quotedMatch[5].trim();
    } else {
      // Try simpler format: "Name, Neighborhood, Occupation (context)"
      var simpleMatch = entry.match(/^([^,]+),\s*([^,]+),\s*([^(]+)\s*\(([^)]+)\)/);
      if (simpleMatch) {
        citizen.name = simpleMatch[1].trim();
        citizen.neighborhood = simpleMatch[2].trim();
        citizen.occupation = simpleMatch[3].trim();
        citizen.context = simpleMatch[4].trim();
      } else {
        // Fallback: just use the whole entry as name
        citizen.name = entry.replace(/\s*\([^)]*\)\s*$/, '').trim();
        var ctxMatch = entry.match(/\(([^)]+)\)/);
        if (ctxMatch) citizen.context = ctxMatch[1].trim();
      }
    }
  }

  return citizen.name ? citizen : null;
}


/**
 * Check if citizen exists in ledger (normalized comparison).
 */
function citizenExistsInLedger_(ledgerData, firstName, lastName) {
  if (ledgerData.length < 2) return null;

  var headers = ledgerData[0];
  var firstCol = headers.indexOf('First');
  var lastCol = headers.indexOf('Last');
  var popIdCol = headers.indexOf('POPID');

  if (firstCol < 0 || lastCol < 0) return null;

  var normFirst = normalizeIdentity_(firstName);
  var normLast = normalizeIdentity_(lastName);

  for (var r = 1; r < ledgerData.length; r++) {
    var f = normalizeIdentity_(ledgerData[r][firstCol]);
    var l = normalizeIdentity_(ledgerData[r][lastCol]);
    if (f === normFirst && l === normLast) {
      return {
        row: r,
        popId: popIdCol >= 0 ? ledgerData[r][popIdCol] : '',
        data: ledgerData[r]
      };
    }
  }
  return null;
}


/**
 * Split full name into first and last.
 */
function splitName_(fullName) {
  var parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(' ')
  };
}


/**
 * Process category entries (CIV, UNI, MED) and route appropriately.
 */
function processCategoryEntries_(ss, entries, category, ledgerData, cycle, cal, results) {
  if (!entries || entries.length === 0) return results;

  var intakeSheet = ss.getSheetByName('Intake');
  var advSheet = ss.getSheetByName('Advancement_Intake1');
  if (!advSheet) advSheet = ss.getSheetByName('Advancement_Intake');

  for (var i = 0; i < entries.length; i++) {
    var citizen = entries[i];
    var nameParts = splitName_(citizen.name);
    var exists = citizenExistsInLedger_(ledgerData, nameParts.first, nameParts.last);

    if (exists) {
      // Send to Advancement_Intake
      if (advSheet) {
        advSheet.appendRow([
          nameParts.first,          // A: First
          '',                       // B: Middle
          nameParts.last,           // C: Last
          citizen.role || '',       // D: RoleType
          '',                       // E: Tier (keep existing)
          '',                       // F: ClockMode (keep existing)
          category === 'CIV' ? 'yes' : '', // G: CIV
          category === 'MED' ? 'yes' : '', // H: MED
          category === 'UNI' ? 'yes' : '', // I: UNI
          'Media usage C' + cycle + ': ' + (citizen.role || citizen.team || '') // J: Notes
        ]);
        results.existingCitizens++;
      }
    } else {
      // Send to Intake for new citizen creation
      if (intakeSheet) {
        intakeSheet.appendRow([
          nameParts.first,          // A: First
          '',                       // B: Middle
          nameParts.last,           // C: Last
          citizen.team || '',       // D: OriginGame
          category === 'UNI' ? 'yes' : 'no', // E: UNI (y/n)
          category === 'MED' ? 'yes' : 'no', // F: MED (y/n)
          category === 'CIV' ? 'yes' : 'no', // G: CIV (y/n)
          'ENGINE',                 // H: ClockMode
          3,                        // I: Tier
          citizen.role || 'Citizen', // J: RoleType
          'Active',                 // K: Status
          '',                       // L: BirthYear
          'Oakland',                // M: OriginCity
          'Introduced via Media Room C' + cycle + '. ' + (citizen.role || ''), // N: LifeHistory
          '',                       // O: OriginVault
          ''                        // P: Neighborhood
        ]);
        results.newCitizens++;
      }
    }
  }

  return results;
}


/**
 * Process quoted citizens with full demographic data.
 */
function processQuotedCitizens_(ss, entries, ledgerData, cycle, cal, results) {
  if (!entries || entries.length === 0) return results;

  var intakeSheet = ss.getSheetByName('Intake');
  var advSheet = ss.getSheetByName('Advancement_Intake1');
  if (!advSheet) advSheet = ss.getSheetByName('Advancement_Intake');
  var logSheet = ss.getSheetByName('LifeHistory_Log');

  for (var i = 0; i < entries.length; i++) {
    var citizen = entries[i];
    var nameParts = splitName_(citizen.name);
    var exists = citizenExistsInLedger_(ledgerData, nameParts.first, nameParts.last);

    // Calculate birth year from age if provided
    var birthYear = '';
    if (citizen.age) {
      var currentYear = cal && cal.month ? new Date().getFullYear() : 2026;
      birthYear = currentYear - parseInt(citizen.age, 10);
    }

    if (exists) {
      // Send to Advancement_Intake with quote context
      if (advSheet) {
        advSheet.appendRow([
          nameParts.first,
          '',
          nameParts.last,
          citizen.occupation || '',
          '',  // Tier
          '',  // ClockMode
          '',  // CIV
          '',  // MED
          '',  // UNI
          'Quoted in article C' + cycle + ': "' + citizen.context + '"'
        ]);
        results.existingCitizens++;
      }

      // Log quote to LifeHistory_Log
      if (logSheet && citizen.context) {
        logSheet.appendRow([
          new Date(),               // A: Timestamp
          exists.popId,             // B: POPID
          citizen.name,             // C: Name
          'Quoted',                 // D: EventTag
          'Quoted in article: ' + citizen.context, // E: EventText
          citizen.neighborhood || '',// F: Neighborhood
          cycle,                    // G: Cycle
          '',                       // H: (empty)
          ''                        // I: (empty)
        ]);
        results.quotesLogged++;
      }
    } else {
      // Send to Intake for new citizen creation
      if (intakeSheet) {
        intakeSheet.appendRow([
          nameParts.first,
          '',
          nameParts.last,
          '',                       // OriginGame
          'no',                     // UNI
          'no',                     // MED
          'no',                     // CIV
          'ENGINE',
          4,                        // Tier 4 for quoted citizens
          citizen.occupation || 'Citizen',
          'Active',
          birthYear,
          'Oakland',
          'First quoted in Media Room C' + cycle + ': ' + citizen.context,
          '',
          citizen.neighborhood || ''
        ]);
        results.newCitizens++;
      }

      // Log quote to LifeHistory_Log (new citizen, no POPID yet)
      if (logSheet && citizen.context) {
        logSheet.appendRow([
          new Date(),
          '',                       // No POPID yet
          citizen.name,
          'Quoted',
          'First quoted in article: ' + citizen.context,
          citizen.neighborhood || '',
          cycle,
          '',
          ''
        ]);
        results.quotesLogged++;
      }
    }
  }

  return results;
}


/**
 * Manual runner for raw citizen usage log processing.
 * Paste log into MediaRoom_Paste sheet, then run this.
 */
function processRawCitizenUsageLogManual() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var cycle = getCurrentCycle_(ss);
  var cal = getCurrentCalendarContext_(ss);

  // Get raw text from MediaRoom_Paste sheet
  var pasteSheet = ss.getSheetByName('MediaRoom_Paste');
  if (!pasteSheet) {
    SpreadsheetApp.getUi().alert('MediaRoom_Paste sheet not found');
    return;
  }

  var rawText = pasteSheet.getRange('A2').getValue();
  if (!rawText) {
    SpreadsheetApp.getUi().alert('No text found in MediaRoom_Paste A2');
    return;
  }

  var results = processRawCitizenUsageLog_(ss, rawText, cycle, cal);

  var summary = 'Citizen Usage Log v2.2 Complete:\n' +
    '- Parsed: ' + results.parsed + ' entries\n' +
    '- New Citizens → Intake: ' + results.newCitizens + '\n' +
    '- Existing → Advancement: ' + results.existingCitizens + '\n' +
    '- Quotes Logged: ' + results.quotesLogged;

  if (results.errors.length > 0) {
    summary += '\n- Errors: ' + results.errors.length;
  }

  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);

  // Mark as parsed
  pasteSheet.getRange('A1').setValue('Last parsed: ' + new Date().toLocaleString());
}


/**
 * ============================================================================
 * MEDIA ROOM INTAKE REFERENCE v2.2
 * ============================================================================
 *
 * v2.2 ADDITIONS:
 * - parseRawCitizenUsageLog_(): Parse raw text format into structured data
 * - citizenExistsInLedger_(): Check for existing citizens (normalized)
 * - processCategoryEntries_(): Route CIV/UNI/MED citizens to intake or advancement
 * - processQuotedCitizens_(): Handle quoted citizens with demographics + life history
 * - processRawCitizenUsageLogManual(): Manual runner from MediaRoom_Paste
 *
 * CATEGORIES:
 * - UNI = Universe (game players/athletes)
 * - MED = Media (journalists)
 * - CIV = Civic (officials, council members)
 *
 * INPUT FORMAT (paste into MediaRoom_Paste A2):
 * ############################################################
 * CITIZEN USAGE LOG
 * ############################################################
 *
 * CIVIC OFFICIALS:
 * — Name (Role)
 *
 * SPORTS — [TEAM]:
 * — Name (Position)
 *
 * JOURNALISTS:
 * — Name (N article[s])
 *
 * CITIZENS QUOTED IN ARTICLES (NEW):
 * — Name, Age, Neighborhood, Occupation (Article context)
 *
 * CITIZENS IN LETTERS (NEW):
 * — Name, Age, Neighborhood, Occupation
 *
 * ROUTING:
 * - New citizens → Intake sheet (for processIntakeV3_ to create in ledger)
 * - Existing citizens → Advancement_Intake1 (for processAdvancementIntake_ to update)
 * - Quotes → LifeHistory_Log
 *
 * ============================================================================
 */


/**
 * ============================================================================
 * MEDIA ROOM INTAKE REFERENCE v2.1
 * ============================================================================
 *
 * OUTPUT SHEET COLUMNS:
 *
 * Press_Drafts (14):
 * A-H: Original columns
 * I-N: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason
 *
 * Storyline_Tracker (14):
 * A-H: Original columns
 * I-N: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason
 *
 * Citizen_Media_Usage (12):
 * A-F: Original columns
 * G-L: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason
 *
 * Continuity_Loop: REMOVED — continuity pipeline eliminated.
 * Direct quotes route to LifeHistory_Log via parseMediaRoomMarkdown.js.
 *
 * Media_Ledger (32):
 * A-Y: Original columns (25)
 * Z-AF: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason, Month
 *
 * NEW VALIDATION OPTIONS:
 * - StoryTypes: holiday, festival
 * - SignalSources: holiday, first-friday, creation-day, championship, playoffs
 * - StorylineTypes: seasonal, festival, sports
 * - ContinuityTypes: seasonal
 *
 * UPGRADE: Run upgradeMediaIntakeSheets() once to add calendar columns to existing sheets
 *
 * ============================================================================
 */
