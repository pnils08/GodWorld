/**
 * ============================================================================
 * MEDIA ROOM STANDALONE WRITER v1.1
 * ============================================================================
 * 
 * Standalone functions for Media Room to log articles directly.
 * No engine context needed — just paste into any Apps Script project.
 * 
 * v1.1 Enhancements:
 * - Calendar columns in Press_Drafts (Season, Holiday, HolidayPriority, 
 *   IsFirstFriday, IsCreationDay, SportsSeason)
 * - Calendar columns in Media_Ledger
 * - Helper to fetch current calendar context from World_Population
 * - Aligned with GodWorld Calendar v1.0
 * 
 * SETUP:
 * 1. Copy this entire file into your Media Room's Apps Script
 * 2. Update SIM_SSID with your Simulation_Narrative spreadsheet ID
 * 3. Call logDraft() after generating each article
 * 
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — UPDATE THIS
// ════════════════════════════════════════════════════════════════════════════

var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';  // Your Simulation_Narrative spreadsheet


// ════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Logs a single article draft to Press_Drafts.
 * 
 * @param {string} reporter - Journalist name (e.g., "Elena Reyes")
 * @param {string} storyType - Type: breaking, feature, profile, opinion, sports, culture, civic, holiday, festival
 * @param {string} signalSource - What triggered it: shock-flag, health-crisis, pattern-wave, story-seed, world-event, holiday, first-friday, creation-day, editorial
 * @param {string} summaryPrompt - The headline/hook/lede
 * @param {string} draftText - Full article text
 * @returns {boolean} Success indicator
 * 
 * EXAMPLE:
 * logDraft(
 *   'Elena Reyes',
 *   'breaking',
 *   'shock-flag',
 *   'Downtown disruption rattles morning commute',
 *   'The intersection of Broadway and 14th went dark Tuesday morning...'
 * );
 */
function logDraft(reporter, storyType, signalSource, summaryPrompt, draftText) {
  
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var sheet = ensurePressDraftsSheet_(ss);
    var cycle = getCurrentCycle_(ss);
    
    // v1.1: Get calendar context
    var cal = getCurrentCalendarContext_(ss);
    
    sheet.appendRow([
      new Date(),                    // A  Timestamp
      cycle,                         // B  Cycle
      reporter || 'Unknown',         // C  Reporter
      storyType || 'general',        // D  StoryType
      signalSource || 'editorial',   // E  SignalSource
      summaryPrompt || '',           // F  SummaryPrompt
      draftText || '',               // G  DraftText
      'draft',                       // H  Status
      // v1.1: Calendar columns
      cal.season,                    // I  Season
      cal.holiday,                   // J  Holiday
      cal.holidayPriority,           // K  HolidayPriority
      cal.isFirstFriday,             // L  IsFirstFriday
      cal.isCreationDay,             // M  IsCreationDay
      cal.sportsSeason               // N  SportsSeason
    ]);
    
    Logger.log('logDraft v1.1: Logged "' + summaryPrompt.substring(0, 40) + '..." by ' + reporter + ' | Holiday: ' + cal.holiday);
    return true;
    
  } catch (e) {
    Logger.log('logDraft ERROR: ' + e.message);
    return false;
  }
}


/**
 * Logs multiple article drafts at once.
 * 
 * @param {Array} drafts - Array of draft objects
 * @returns {number} Count of drafts logged
 * 
 * Each draft object:
 * {
 *   reporter: 'Elena Reyes',
 *   storyType: 'breaking',
 *   signalSource: 'shock-flag',
 *   summaryPrompt: 'Headline here',
 *   draftText: 'Full article...'
 * }
 * 
 * EXAMPLE:
 * logDrafts([
 *   { reporter: 'Elena Reyes', storyType: 'breaking', signalSource: 'shock-flag', summaryPrompt: 'Downtown chaos', draftText: '...' },
 *   { reporter: 'Marcus Chen', storyType: 'feature', signalSource: 'health-crisis', summaryPrompt: 'Clinic surge', draftText: '...' }
 * ]);
 */
function logDrafts(drafts) {
  
  if (!drafts || drafts.length === 0) {
    Logger.log('logDrafts: No drafts provided');
    return 0;
  }
  
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var sheet = ensurePressDraftsSheet_(ss);
    var cycle = getCurrentCycle_(ss);
    var now = new Date();
    
    // v1.1: Get calendar context
    var cal = getCurrentCalendarContext_(ss);
    
    var rows = [];
    for (var i = 0; i < drafts.length; i++) {
      var d = drafts[i];
      rows.push([
        now,                           // A  Timestamp
        cycle,                         // B  Cycle
        d.reporter || 'Unknown',       // C  Reporter
        d.storyType || 'general',      // D  StoryType
        d.signalSource || 'editorial', // E  SignalSource
        d.summaryPrompt || '',         // F  SummaryPrompt
        d.draftText || '',             // G  DraftText
        'draft',                       // H  Status
        // v1.1: Calendar columns
        cal.season,                    // I  Season
        cal.holiday,                   // J  Holiday
        cal.holidayPriority,           // K  HolidayPriority
        cal.isFirstFriday,             // L  IsFirstFriday
        cal.isCreationDay,             // M  IsCreationDay
        cal.sportsSeason               // N  SportsSeason
      ]);
    }
    
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, 14).setValues(rows);
    
    Logger.log('logDrafts v1.1: Logged ' + rows.length + ' drafts for Cycle ' + cycle + ' | Holiday: ' + cal.holiday);
    return rows.length;
    
  } catch (e) {
    Logger.log('logDrafts ERROR: ' + e.message);
    return 0;
  }
}


/**
 * Logs a cultural entity mention to Media_Ledger.
 * Call this when an article mentions a celebrity/public figure.
 * 
 * @param {string} journalist - Who wrote the piece
 * @param {string} entityName - Cultural entity mentioned (must exist in Cultural_Ledger)
 * @returns {boolean} Success indicator
 * 
 * EXAMPLE:
 * logCulturalMention('Elena Reyes', 'Theo Banks');
 */
function logCulturalMention(journalist, entityName) {
  
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var cycle = getCurrentCycle_(ss);
    
    // v1.1: Get calendar context
    var cal = getCurrentCalendarContext_(ss);
    
    // Get cultural entity data
    var culSheet = ss.getSheetByName('Cultural_Ledger');
    var entityData = null;
    
    if (culSheet) {
      var data = culSheet.getDataRange().getValues();
      var headers = data[0];
      
      var col = function(name) {
        return headers.indexOf(name);
      };
      
      for (var i = 1; i < data.length; i++) {
        var nameIdx = col('Name');
        if (nameIdx >= 0 && data[i][nameIdx] === entityName) {
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
    
    // Ensure Media_Ledger exists with v1.1 headers
    var mediaSheet = ss.getSheetByName('Media_Ledger');
    if (!mediaSheet) {
      mediaSheet = ss.insertSheet('Media_Ledger');
      mediaSheet.appendRow([
        'Timestamp', 'Cycle', 'Journalist', 'NameUsed', 'FameCategory',
        'CulturalDomain', 'FameScore', 'TrendTrajectory', 'MediaSpread',
        'CityTier', 'Neighborhood', 'StorySeedCount', 'CycleWeight',
        'CycleWeightReason', 'ChaosEvents', 'NightlifeVolume', 'Sentiment',
        'CivicLoad', 'ShockFlag', 'PatternFlag', 'EconomicMood',
        'WeatherType', 'WeatherMood', 'MediaIntensity', 'ActiveArcs',
        // v1.1: Calendar columns
        'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 
        'IsCreationDay', 'SportsSeason', 'Month'
      ]);
      mediaSheet.setFrozenRows(1);
      mediaSheet.getRange(1, 1, 1, 32).setFontWeight('bold');
    }
    
    // Write row
    mediaSheet.appendRow([
      new Date(),
      cycle,
      journalist,
      entityName,
      entityData ? entityData.fameCategory : '',
      entityData ? entityData.domain : '',
      entityData ? entityData.fameScore : '',
      entityData ? entityData.trend : '',
      entityData ? entityData.spread : '',
      entityData ? entityData.tier : '',
      entityData ? entityData.neighborhood : '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', // Context columns (filled by engine if needed)
      // v1.1: Calendar columns
      cal.season,
      cal.holiday,
      cal.holidayPriority,
      cal.isFirstFriday,
      cal.isCreationDay,
      cal.sportsSeason,
      cal.month
    ]);
    
    Logger.log('logCulturalMention v1.1: ' + entityName + ' covered by ' + journalist + ' | Holiday: ' + cal.holiday);
    return true;
    
  } catch (e) {
    Logger.log('logCulturalMention ERROR: ' + e.message);
    return false;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets current cycle from World_Config.
 */
function getCurrentCycle_(ss) {
  try {
    var configSheet = ss.getSheetByName('World_Config');
    if (!configSheet) return 0;
    
    var data = configSheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'cycleCount') {
        return Number(data[i][1]) || 0;
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
}


/**
 * v1.1: Gets current calendar context from World_Population sheet.
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


/**
 * Ensures Press_Drafts sheet exists with correct v1.1 headers.
 */
function ensurePressDraftsSheet_(ss) {
  var sheet = ss.getSheetByName('Press_Drafts');
  
  if (!sheet) {
    sheet = ss.insertSheet('Press_Drafts');
    sheet.appendRow([
      'Timestamp',       // A
      'Cycle',           // B
      'Reporter',        // C
      'StoryType',       // D
      'SignalSource',    // E
      'SummaryPrompt',   // F
      'DraftText',       // G
      'Status',          // H
      // v1.1: Calendar columns
      'Season',          // I
      'Holiday',         // J
      'HolidayPriority', // K
      'IsFirstFriday',   // L
      'IsCreationDay',   // M
      'SportsSeason'     // N
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setColumnWidth(6, 300);
    sheet.setColumnWidth(7, 500);
  }
  
  return sheet;
}


/**
 * v1.1: Upgrades existing Press_Drafts sheet to add calendar columns.
 */
function upgradePressDraftsSheet() {
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var sheet = ss.getSheetByName('Press_Drafts');
    if (!sheet) {
      Logger.log('upgradePressDraftsSheet: Press_Drafts not found');
      return;
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasSeason = headers.indexOf('Season') >= 0;
    
    if (!hasSeason) {
      var lastCol = sheet.getLastColumn();
      var newHeaders = ['Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'];
      
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');
      
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var defaults = [];
        for (var i = 2; i <= lastRow; i++) {
          defaults.push(['', 'none', 'none', false, false, 'off-season']);
        }
        sheet.getRange(2, lastCol + 1, lastRow - 1, 6).setValues(defaults);
      }
      
      Logger.log('upgradePressDraftsSheet: Added 6 calendar columns');
    } else {
      Logger.log('upgradePressDraftsSheet: Already upgraded');
    }
  } catch (e) {
    Logger.log('upgradePressDraftsSheet ERROR: ' + e.message);
  }
}


/**
 * v1.1: Upgrades existing Media_Ledger sheet to add calendar columns.
 */
function upgradeMediaLedgerSheet() {
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var sheet = ss.getSheetByName('Media_Ledger');
    if (!sheet) {
      Logger.log('upgradeMediaLedgerSheet: Media_Ledger not found');
      return;
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasSeason = headers.indexOf('Season') >= 0;
    
    if (!hasSeason) {
      var lastCol = sheet.getLastColumn();
      var newHeaders = ['Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason', 'Month'];
      
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');
      
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var defaults = [];
        for (var i = 2; i <= lastRow; i++) {
          defaults.push(['', 'none', 'none', false, false, 'off-season', 0]);
        }
        sheet.getRange(2, lastCol + 1, lastRow - 1, 7).setValues(defaults);
      }
      
      Logger.log('upgradeMediaLedgerSheet: Added 7 calendar columns');
    } else {
      Logger.log('upgradeMediaLedgerSheet: Already upgraded');
    }
  } catch (e) {
    Logger.log('upgradeMediaLedgerSheet ERROR: ' + e.message);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// QUICK REFERENCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * STORY TYPES:
 * - breaking     : Urgent news, shock events
 * - feature      : In-depth coverage
 * - profile      : Person-focused
 * - opinion      : Editorial/commentary
 * - analysis     : Pattern/trend examination
 * - recap        : Event summary
 * - sports       : Athletics coverage
 * - culture      : Arts/entertainment
 * - civic        : Government/community
 * - holiday      : v1.1: Holiday coverage
 * - festival     : v1.1: Festival coverage
 * 
 * SIGNAL SOURCES:
 * - shock-flag       : Sudden disruption
 * - pattern-wave     : Recurring micro-events
 * - health-crisis    : Health arc activity
 * - crisis-arc       : General crisis
 * - story-seed       : From seed deck
 * - world-event      : From world events
 * - citizen-event    : From named citizen
 * - cultural-entity  : Celebrity coverage
 * - sports-season    : Sports calendar
 * - weather          : Weather-driven
 * - editorial        : Editor's choice (no signal)
 * - holiday          : v1.1: Holiday-triggered
 * - first-friday     : v1.1: First Friday triggered
 * - creation-day     : v1.1: Creation Day triggered
 */


// ════════════════════════════════════════════════════════════════════════════
// TEST FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run this to test the connection.
 */
function testMediaRoomWriter() {
  var success = logDraft(
    'Test Reporter',
    'feature',
    'editorial',
    'Test headline - DELETE THIS ROW',
    'This is a test article to verify the Media Room writer is working.'
  );
  
  if (success) {
    Logger.log('SUCCESS: Check Press_Drafts sheet for test row (delete it after)');
  } else {
    Logger.log('FAILED: Check logs for error');
  }
}


/**
 * v1.1: Run this to test calendar context retrieval.
 */
function testCalendarContext() {
  try {
    var ss = SpreadsheetApp.openById(SIM_SSID);
    var cal = getCurrentCalendarContext_(ss);
    
    Logger.log('Calendar Context:');
    Logger.log('  Season: ' + cal.season);
    Logger.log('  Holiday: ' + cal.holiday);
    Logger.log('  HolidayPriority: ' + cal.holidayPriority);
    Logger.log('  IsFirstFriday: ' + cal.isFirstFriday);
    Logger.log('  IsCreationDay: ' + cal.isCreationDay);
    Logger.log('  SportsSeason: ' + cal.sportsSeason);
    Logger.log('  Month: ' + cal.month);
    
  } catch (e) {
    Logger.log('testCalendarContext ERROR: ' + e.message);
  }
}


/**
 * ============================================================================
 * MEDIA ROOM STANDALONE WRITER REFERENCE v1.1
 * ============================================================================
 * 
 * PRESS_DRAFTS COLUMNS (14):
 * A   Timestamp
 * B   Cycle
 * C   Reporter
 * D   StoryType
 * E   SignalSource
 * F   SummaryPrompt
 * G   DraftText
 * H   Status
 * I   Season (v1.1)
 * J   Holiday (v1.1)
 * K   HolidayPriority (v1.1)
 * L   IsFirstFriday (v1.1)
 * M   IsCreationDay (v1.1)
 * N   SportsSeason (v1.1)
 * 
 * MEDIA_LEDGER COLUMNS (32):
 * A-Y  Original columns (25)
 * Z    Season (v1.1)
 * AA   Holiday (v1.1)
 * AB   HolidayPriority (v1.1)
 * AC   IsFirstFriday (v1.1)
 * AD   IsCreationDay (v1.1)
 * AE   SportsSeason (v1.1)
 * AF   Month (v1.1)
 * 
 * UPGRADE FUNCTIONS:
 * - upgradePressDraftsSheet() - Run once to add calendar columns
 * - upgradeMediaLedgerSheet() - Run once to add calendar columns
 * 
 * TEST FUNCTIONS:
 * - testMediaRoomWriter() - Test draft logging
 * - testCalendarContext() - Test calendar retrieval
 * 
 * ============================================================================
 */