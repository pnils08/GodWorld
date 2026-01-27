/**
 * ============================================================================
 * MEDIA ROOM INTAKE v2.2
 * ============================================================================
 *
 * Aligned with MEDIA_ROOM_INSTRUCTIONS v2.0 and GodWorld Calendar v1.0
 *
 * v2.2 Enhancements:
 * - Citizen existence checking against Simulation_Ledger and Generic_Citizens
 * - New citizens routed to Intake sheet for processing
 * - Civic figure detection (CIV flagging)
 * - LifeHistory append for existing Simulation_Ledger citizens
 * - EmergenceCount/Cycle/Context update for Generic_Citizens
 * - New input columns: Age, Neighborhood, Occupation
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
 * 4. Continuity Notes → Continuity_Loop (13 columns)
 *
 * SETUP:
 * 1. Add to Simulation_Narrative Apps Script
 * 2. Run setupMediaIntakeV2() once to create all sheets
 * 3. After each cycle: paste Media Room outputs, run processMediaIntakeV2()
 *
 * ============================================================================
 */

var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';


// ════════════════════════════════════════════════════════════════════════════
// MAIN PROCESSING FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Process all Media Room intake sheets at once
 */
function processMediaIntakeV2() {
  
  var ss = SpreadsheetApp.openById(SIM_SSID);
  var cycle = getCurrentCycle_(ss);
  
  // v2.1: Get calendar context
  var cal = getCurrentCalendarContext_(ss);
  
  var results = {
    articles: 0,
    storylines: 0,
    citizenUsage: 0,
    continuity: 0
  };
  
  // Process each intake type (pass calendar context)
  results.articles = processArticleIntake_(ss, cycle, cal);
  results.storylines = processStorylineIntake_(ss, cycle, cal);
  results.citizenUsage = processCitizenUsageIntake_(ss, cycle, cal);
  results.continuity = processContinuityIntake_(ss, cycle, cal);
  
  var summary = 'Media Intake v2.2 Complete:\n' +
    '- Articles: ' + results.articles + '\n' +
    '- Storylines: ' + results.storylines + '\n' +
    '- Citizen Usage: ' + results.citizenUsage + '\n' +
    '- Continuity Notes: ' + results.continuity + '\n' +
    '- Holiday: ' + cal.holiday + '\n' +
    '- Sports: ' + cal.sportsSeason + '\n' +
    '(v2.2: Check logs for citizen routing details)';
  
  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);
  
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
  var storylines = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // Skip empty or processed
    if (!row[0] && !row[1]) continue;
    if (row[5] === 'processed') continue;
    
    storylines.push({
      storylineType: row[0] || 'arc',        // arc / question / thread
      description: row[1] || '',
      neighborhood: row[2] || '',
      relatedCitizens: row[3] || '',
      priority: row[4] || 'normal'
    });
    
    intakeSheet.getRange(i + 1, 6).setValue('processed');
  }
  
  if (storylines.length === 0) return 0;
  
  // Write to Storyline_Tracker (v2.1: 14 columns with calendar)
  var trackerSheet = ensureStorylineTracker_(ss);
  var now = new Date();
  
  var rows = [];
  for (var j = 0; j < storylines.length; j++) {
    var s = storylines[j];
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
  
  return storylines.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 3. CITIZEN USAGE LOG (v2.2: with existence checks and routing)
// ════════════════════════════════════════════════════════════════════════════

function processCitizenUsageIntake_(ss, cycle, cal) {

  var intakeSheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!intakeSheet) return 0;

  var data = intakeSheet.getDataRange().getValues();
  var header = data[0];

  // v2.2: Column index helper
  var idx = function(name) { return header.indexOf(name); };

  // v2.2: Pre-fetch ledger and generic data for existence checks
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  var simLedgerVals = ledgerSheet ? ledgerSheet.getDataRange().getValues() : [];
  var genericVals = genericSheet ? genericSheet.getDataRange().getValues() : [];

  var usages = [];
  var routed = { newCitizens: 0, ledgerUpdates: 0, genericUpdates: 0 };

  // v2.2: Find status column index (last column in new format)
  var statusColIdx = idx('Status');
  if (statusColIdx < 0) statusColIdx = header.length - 1;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip empty or processed
    if (!row[0]) continue;
    if (row[statusColIdx] === 'processed') continue;

    var citizenName = (row[idx('CitizenName')] || row[0] || '').toString().trim();
    var usageType = (row[idx('UsageType')] || row[1] || 'mentioned').toString().trim();
    var context = (row[idx('Context')] || row[2] || '').toString().trim();
    var reporter = (row[idx('Reporter')] || row[3] || '').toString().trim();
    // v2.2: New columns
    var age = row[idx('Age')] || row[4] || '';
    var neighborhood = (row[idx('Neighborhood')] || row[5] || '').toString().trim();
    var occupation = (row[idx('Occupation')] || row[6] || '').toString().trim();

    usages.push({
      citizenName: citizenName,
      usageType: usageType,
      context: context,
      reporter: reporter,
      age: age,
      neighborhood: neighborhood,
      occupation: occupation
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2: CITIZEN ROUTING LOGIC
    // ═══════════════════════════════════════════════════════════════════════════

    // STEP 1: Parse CitizenName into First + Last
    var nameParts = citizenName.trim().split(' ');
    var first = nameParts[0] || '';
    var last = nameParts.slice(1).join(' ') || '';

    // STEP 2: Check existence
    var existsInSimLedger = existsInLedgerMedia_(simLedgerVals, first, last);
    var existsInGeneric = existsInGenericCitizens_(genericVals, first, last, neighborhood);

    // STEP 3: Route based on existence
    if (!existsInSimLedger && !existsInGeneric) {
      // NEW CITIZEN — route to Intake sheet
      addToIntake_(ss, {
        first: first,
        last: last,
        birthYear: calculateBirthYear_(ss, age),
        neighborhood: neighborhood,
        roleType: occupation,
        originGame: 'Media Room',
        civ: isCivicFigure_(context, occupation) ? 'yes' : 'no',
        status: 'Active'
      });
      routed.newCitizens++;
    } else if (existsInSimLedger) {
      // EXISTING in Simulation_Ledger — append LifeHistory
      appendLifeHistory_(ss, 'Simulation_Ledger', first, last, cycle, context);
      routed.ledgerUpdates++;
    } else if (existsInGeneric) {
      // EXISTING in Generic_Citizens — update EmergenceCount
      // This feeds into promotion pipeline (>=3 triggers eligibility)
      updateGenericCitizenEmergence_(ss, first, last, neighborhood, cycle, context);
      routed.genericUpdates++;
    }

    // Mark processed
    intakeSheet.getRange(i + 1, statusColIdx + 1).setValue('processed');
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

  // Log routing summary
  Logger.log('processCitizenUsageIntake_ v2.2: ' +
    usages.length + ' processed, ' +
    routed.newCitizens + ' new citizens routed to Intake, ' +
    routed.ledgerUpdates + ' LifeHistory updates, ' +
    routed.genericUpdates + ' EmergenceCount updates');

  return usages.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 4. CONTINUITY NOTES
// ════════════════════════════════════════════════════════════════════════════

function processContinuityIntake_(ss, cycle, cal) {
  
  var intakeSheet = ss.getSheetByName('Continuity_Intake');
  if (!intakeSheet) return 0;
  
  var data = intakeSheet.getDataRange().getValues();
  var notes = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // Skip empty or processed
    if (!row[0] && !row[1]) continue;
    if (row[4] === 'processed') continue;
    
    notes.push({
      noteType: row[0] || 'builton',  // builton / introduced / question / resolved
      description: row[1] || '',
      relatedArc: row[2] || '',
      affectedCitizens: row[3] || ''
    });
    
    intakeSheet.getRange(i + 1, 5).setValue('processed');
  }
  
  if (notes.length === 0) return 0;
  
  // Write to Continuity_Loop (v2.1: 13 columns with calendar)
  var loopSheet = ensureContinuityLoop_(ss);
  var now = new Date();
  
  var rows = [];
  for (var j = 0; j < notes.length; j++) {
    var n = notes[j];
    rows.push([
      now,                    // A  Timestamp
      cycle,                  // B  Cycle
      n.noteType,             // C  NoteType
      n.description,          // D  Description
      n.relatedArc,           // E  RelatedArc
      n.affectedCitizens,     // F  AffectedCitizens
      'active',               // G  Status
      // v2.1: Calendar columns
      cal.season,             // H  Season
      cal.holiday,            // I  Holiday
      cal.holidayPriority,    // J  HolidayPriority
      cal.isFirstFriday,      // K  IsFirstFriday
      cal.isCreationDay,      // L  IsCreationDay
      cal.sportsSeason        // M  SportsSeason
    ]);
  }
  
  var startRow = loopSheet.getLastRow() + 1;
  loopSheet.getRange(startRow, 1, rows.length, 13).setValues(rows);
  
  return notes.length;
}


// ════════════════════════════════════════════════════════════════════════════
// SETUP FUNCTION — Creates all intake sheets
// ════════════════════════════════════════════════════════════════════════════

function setupMediaIntakeV2() {
  
  var ss = SpreadsheetApp.openById(SIM_SSID);
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
  
  // 3. Citizen_Usage_Intake (v2.2: added Age, Neighborhood, Occupation)
  var usageSheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!usageSheet) {
    usageSheet = ss.insertSheet('Citizen_Usage_Intake');
    usageSheet.appendRow(['CitizenName', 'UsageType', 'Context', 'Reporter', 'Age', 'Neighborhood', 'Occupation', 'Status']);
    usageSheet.setFrozenRows(1);
    setupUsageValidation_(usageSheet);
    created.push('Citizen_Usage_Intake');
  }
  
  // 4. Continuity_Intake
  var contSheet = ss.getSheetByName('Continuity_Intake');
  if (!contSheet) {
    contSheet = ss.insertSheet('Continuity_Intake');
    contSheet.appendRow(['NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status']);
    contSheet.setFrozenRows(1);
    setupContinuityValidation_(contSheet);
    created.push('Continuity_Intake');
  }
  
  // Ensure output sheets exist too (v2.1 versions with calendar columns)
  ensurePressDraftsSheet_(ss);
  ensureStorylineTracker_(ss);
  ensureCitizenMediaUsage_(ss);
  ensureContinuityLoop_(ss);
  
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
  // v2.2: UsageType validation
  var types = SpreadsheetApp.newDataValidation()
    .requireValueInList(['mentioned', 'quoted', 'profiled', 'featured', 'background'])
    .build();
  sheet.getRange('B2:B100').setDataValidation(types);

  // v2.2: Neighborhood validation (12 Oakland neighborhoods)
  var neighborhoods = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
      'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
      'Eastlake', 'Piedmont Ave', 'Grand Lake', 'Adams Point'
    ])
    .build();
  sheet.getRange('F2:F100').setDataValidation(neighborhoods);

  sheet.setColumnWidth(1, 150);  // CitizenName
  sheet.setColumnWidth(3, 250);  // Context
  sheet.setColumnWidth(5, 60);   // Age
  sheet.setColumnWidth(6, 120);  // Neighborhood
  sheet.setColumnWidth(7, 150);  // Occupation
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
    // v2.1: 12 columns with calendar
    sheet.appendRow([
      'Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter',
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(5, 250);
  }
  return sheet;
}

function ensureContinuityLoop_(ss) {
  var sheet = ss.getSheetByName('Continuity_Loop');
  if (!sheet) {
    sheet = ss.insertSheet('Continuity_Loop');
    // v2.1: 13 columns with calendar
    sheet.appendRow([
      'Timestamp', 'Cycle', 'NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status',
      'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
    sheet.setColumnWidth(4, 300);
  }
  return sheet;
}


// ════════════════════════════════════════════════════════════════════════════
// v2.2: CITIZEN ROUTING HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if citizen exists in Simulation_Ledger.
 * Uses normalized name matching for consistency.
 */
function existsInLedgerMedia_(ledgerVals, first, last) {
  if (ledgerVals.length < 2) return false;

  var header = ledgerVals[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');

  var normFirst = normalizeIdentityMedia_(first);
  var normLast = normalizeIdentityMedia_(last);

  for (var r = 1; r < ledgerVals.length; r++) {
    var f = normalizeIdentityMedia_(ledgerVals[r][idxFirst]);
    var l = normalizeIdentityMedia_(ledgerVals[r][idxLast]);
    if (f === normFirst && l === normLast) return true;
  }
  return false;
}


/**
 * Check if citizen exists in Generic_Citizens.
 * Optionally matches neighborhood if provided.
 */
function existsInGenericCitizens_(genericVals, first, last, neighborhood) {
  if (genericVals.length < 2) return false;

  var header = genericVals[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');
  var idxNeighborhood = header.indexOf('Neighborhood');

  var normFirst = normalizeIdentityMedia_(first);
  var normLast = normalizeIdentityMedia_(last);

  for (var r = 1; r < genericVals.length; r++) {
    var f = normalizeIdentityMedia_(genericVals[r][idxFirst]);
    var l = normalizeIdentityMedia_(genericVals[r][idxLast]);

    if (f === normFirst && l === normLast) {
      // If neighborhood provided, match it too
      if (neighborhood && idxNeighborhood >= 0) {
        var n = (genericVals[r][idxNeighborhood] || '').toString().trim();
        if (n !== neighborhood) continue;
      }
      return true;
    }
  }
  return false;
}


/**
 * Normalize identity string for consistent matching.
 * Local version to avoid cross-file dependency.
 */
function normalizeIdentityMedia_(str) {
  if (!str) return '';
  return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}


/**
 * Calculate birth year from current age.
 * Uses World_Config currentYear or defaults to 2041.
 */
function calculateBirthYear_(ss, age) {
  if (!age) return '';
  var currentYear = getCurrentYear_(ss);
  return currentYear - Number(age);
}


/**
 * Get current simulation year from World_Config.
 */
function getCurrentYear_(ss) {
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) return 2041;

  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'currentYear' || data[i][0] === 'simYear') {
      return Number(data[i][1]) || 2041;
    }
  }
  return 2041;
}


/**
 * Detect if citizen is a civic figure based on context and occupation.
 * Returns true if civic keywords found.
 */
function isCivicFigure_(context, occupation) {
  var civicKeywords = [
    'OPOA', 'Director', 'Chief', 'President', 'Commissioner',
    'Coalition', 'Union Rep', 'Battalion', 'Councilmember',
    'Mayor', 'Captain', 'Sergeant', 'Lieutenant', 'Superintendent',
    'Board Member', 'Chairperson', 'Executive Director'
  ];

  var combined = ((context || '') + ' ' + (occupation || '')).toLowerCase();

  for (var i = 0; i < civicKeywords.length; i++) {
    if (combined.indexOf(civicKeywords[i].toLowerCase()) >= 0) {
      return true;
    }
  }
  return false;
}


/**
 * Append to LifeHistory for existing Simulation_Ledger citizen.
 */
function appendLifeHistory_(ss, sheetName, first, last, cycle, context) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');
  var idxHistory = header.indexOf('LifeHistory');

  if (idxHistory < 0) return;

  var normFirst = normalizeIdentityMedia_(first);
  var normLast = normalizeIdentityMedia_(last);

  for (var r = 1; r < data.length; r++) {
    var f = normalizeIdentityMedia_(data[r][idxFirst]);
    var l = normalizeIdentityMedia_(data[r][idxLast]);

    if (f === normFirst && l === normLast) {
      var existing = data[r][idxHistory] || '';
      var dateStr = new Date().toISOString().split('T')[0];
      var newEntry = '\n' + dateStr + ' — [Civic] quoted in media coverage re: ' + context;
      sheet.getRange(r + 1, idxHistory + 1).setValue(existing + newEntry);
      Logger.log('appendLifeHistory_: Updated ' + first + ' ' + last);
      return;
    }
  }
}


/**
 * Update EmergenceCount, EmergedCycle, and EmergenceContext for Generic_Citizens.
 * Feeds into the promotion pipeline (EmergenceCount >= 3 triggers promotion eligibility).
 */
function updateGenericCitizenEmergence_(ss, first, last, neighborhood, cycle, context) {
  var sheet = ss.getSheetByName('Generic_Citizens');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');
  var idxNeigh = header.indexOf('Neighborhood');
  var idxCount = header.indexOf('EmergenceCount');
  var idxCycle = header.indexOf('EmergedCycle');
  var idxContext = header.indexOf('EmergenceContext');

  var normFirst = normalizeIdentityMedia_(first);
  var normLast = normalizeIdentityMedia_(last);

  for (var r = 1; r < data.length; r++) {
    var f = normalizeIdentityMedia_(data[r][idxFirst]);
    var l = normalizeIdentityMedia_(data[r][idxLast]);

    if (f === normFirst && l === normLast) {
      // Optional neighborhood match
      if (neighborhood && idxNeigh >= 0) {
        var n = (data[r][idxNeigh] || '').toString().trim();
        if (n !== neighborhood) continue;
      }

      // Update EmergenceCount
      if (idxCount >= 0) {
        var count = Number(data[r][idxCount]) || 0;
        sheet.getRange(r + 1, idxCount + 1).setValue(count + 1);
      }

      // Update EmergedCycle (optional column)
      if (idxCycle >= 0) {
        sheet.getRange(r + 1, idxCycle + 1).setValue(cycle);
      }

      // Update EmergenceContext (optional column)
      if (idxContext >= 0) {
        sheet.getRange(r + 1, idxContext + 1).setValue(context);
      }

      Logger.log('updateGenericCitizenEmergence_: Updated ' + first + ' ' + last + ' (count=' + (count + 1) + ')');
      return;
    }
  }
}


/**
 * Add new citizen to Intake sheet for processing into Simulation_Ledger.
 * Sets OriginGame to 'Media Room' and CIV based on civic detection.
 */
function addToIntake_(ss, citizenData) {
  var intake = ss.getSheetByName('Intake');
  if (!intake) {
    Logger.log('addToIntake_: Intake sheet not found');
    return;
  }

  var header = intake.getRange(1, 1, 1, intake.getLastColumn()).getValues()[0];
  var newRow = [];
  for (var i = 0; i < header.length; i++) {
    newRow.push('');
  }

  // Helper to set column value by name
  var setCol = function(name, value) {
    var idx = header.indexOf(name);
    if (idx >= 0) newRow[idx] = value;
  };

  setCol('First', citizenData.first);
  setCol('Last', citizenData.last);
  setCol('BirthYear', citizenData.birthYear);
  setCol('Neighborhood', citizenData.neighborhood);
  setCol('RoleType', citizenData.roleType);
  setCol('OriginGame', citizenData.originGame || 'Media Room');
  setCol('CIV (y/n)', citizenData.civ || 'no');
  setCol('Status', citizenData.status || 'Active');
  setCol('OriginVault', 'Media Room');
  setCol('Tier', '3'); // Default Tier-3 for media-discovered citizens

  intake.appendRow(newRow);
  Logger.log('addToIntake_: Added ' + citizenData.first + ' ' + citizenData.last + ' (CIV=' + citizenData.civ + ')');
}


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
  var ss = SpreadsheetApp.openById(SIM_SSID);
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

  // Upgrade Continuity_Loop
  if (upgradeSheetWithCalendarColumns_(ss, 'Continuity_Loop', 7)) {
    upgraded.push('Continuity_Loop');
  }

  // Upgrade Media_Ledger (7 columns including Month)
  if (upgradeMediaLedgerWithCalendar_(ss)) {
    upgraded.push('Media_Ledger');
  }

  // v2.2: Upgrade Citizen_Usage_Intake with new columns
  if (upgradeCitizenUsageIntakeColumns_(ss)) {
    upgraded.push('Citizen_Usage_Intake');
  }

  var msg = upgraded.length > 0
    ? 'Upgraded sheets: ' + upgraded.join(', ')
    : 'All sheets already have calendar columns';

  Logger.log('upgradeMediaIntakeSheets: ' + msg);
  SpreadsheetApp.getUi().alert('Upgrade Complete\n\n' + msg);
}


/**
 * v2.2: Upgrade Citizen_Usage_Intake with Age, Neighborhood, Occupation columns.
 * Inserts new columns before Status column.
 */
function upgradeCitizenUsageIntakeColumns_(ss) {
  var sheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!sheet) return false;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if already upgraded
  if (headers.indexOf('Age') >= 0) return false;

  // Find Status column (should be column 5 in old format)
  var statusIdx = headers.indexOf('Status');
  if (statusIdx < 0) statusIdx = headers.length;

  // Insert 3 columns before Status
  sheet.insertColumnsBefore(statusIdx + 1, 3);

  // Set new headers
  sheet.getRange(1, statusIdx + 1, 1, 3).setValues([['Age', 'Neighborhood', 'Occupation']]);
  sheet.getRange(1, statusIdx + 1, 1, 3).setFontWeight('bold');

  // Set column widths
  sheet.setColumnWidth(statusIdx + 1, 60);   // Age
  sheet.setColumnWidth(statusIdx + 2, 120);  // Neighborhood
  sheet.setColumnWidth(statusIdx + 3, 150);  // Occupation

  // Add neighborhood validation
  var neighborhoods = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
      'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
      'Eastlake', 'Piedmont Ave', 'Grand Lake', 'Adams Point'
    ])
    .build();
  sheet.getRange(2, statusIdx + 2, 99, 1).setDataValidation(neighborhoods);

  Logger.log('upgradeCitizenUsageIntakeColumns_: Upgraded Citizen_Usage_Intake with Age, Neighborhood, Occupation');
  return true;
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
  var ss = SpreadsheetApp.openById(SIM_SSID);
  var sheets = ['Media_Intake', 'Storyline_Intake', 'Citizen_Usage_Intake', 'Continuity_Intake'];
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


/**
 * ============================================================================
 * MEDIA ROOM INTAKE REFERENCE v2.2
 * ============================================================================
 *
 * INPUT SHEET COLUMNS:
 *
 * Citizen_Usage_Intake (8 columns - v2.2):
 * A: CitizenName
 * B: UsageType (mentioned/quoted/profiled/featured/background)
 * C: Context
 * D: Reporter
 * E: Age (NEW v2.2)
 * F: Neighborhood (NEW v2.2)
 * G: Occupation (NEW v2.2)
 * H: Status
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
 * Continuity_Loop (13):
 * A-G: Original columns
 * H-M: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason
 *
 * Media_Ledger (32):
 * A-Y: Original columns (25)
 * Z-AF: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason, Month
 *
 * v2.2 ROUTING LOGIC:
 *
 * When processCitizenUsageIntake_() runs:
 * 1. Parses CitizenName into First + Last
 * 2. Checks existence in Simulation_Ledger and Generic_Citizens
 * 3. Routes based on existence:
 *    - NEW citizen → Intake sheet (with CIV flag if civic figure)
 *    - Existing in Simulation_Ledger → LifeHistory append
 *    - Existing in Generic_Citizens → EmergenceCount increment
 * 4. All citizens → Citizen_Media_Usage (existing behavior)
 * 5. profiled/featured → flagCitizenForTierReview_() (existing behavior)
 *
 * EMERGENCE → TIER ADVANCEMENT PIPELINE:
 * - EmergenceCount >= 3 in Generic_Citizens triggers promotion eligibility
 * - checkForPromotions_() promotes eligible citizens to Simulation_Ledger (Tier-3)
 * - Base 20% promotion chance with calendar modifiers
 *
 * UPGRADE: Run upgradeMediaIntakeSheets() once to add new columns to existing sheets
 *
 * ============================================================================
 */