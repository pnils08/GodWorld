/**
 * ============================================================================
 * recordCycleWeather_ v1.0
 * ============================================================================
 *
 * Writes weather data to centralized Cycle_Weather sheet.
 * This is the single source of truth for weather by cycle.
 *
 * Schema:
 *   CycleID | Type | Temp | Impact | Advisory | Comfort | Mood | Alerts
 *
 * Other ledgers may still embed weather for self-contained readability,
 * but this sheet is the canonical source for historical weather lookups.
 *
 * ============================================================================
 */

var CYCLE_WEATHER_HEADERS = [
  'CycleID',      // Cycle number
  'Type',         // clear, fog, rain, storm, heatwave, etc.
  'Temp',         // Temperature in Fahrenheit
  'Impact',       // Mood modifier (1.0 = neutral)
  'Advisory',     // Alert text if any
  'Comfort',      // Comfort index 0-1
  'Mood',         // Primary mood effect
  'Alerts',       // Active weather alerts (comma-separated)
  'Streak',       // Current weather streak count
  'StreakType',   // Type of streak (rain, hot, etc.)
  'Timestamp'     // When recorded
];


/**
 * Records weather for the current cycle to Cycle_Weather sheet
 * @param {Object} ctx - Engine context with ss and summary
 */
function recordCycleWeather_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary;

  if (!S || !S.weather) {
    Logger.log('recordCycleWeather_: No weather data to record');
    return;
  }

  var weather = S.weather;
  var weatherSum = S.weatherSummary || {};
  var tracking = S.weatherTracking || {};
  var cycleId = S.absoluteCycle || S.cycleId || ctx.config?.cycleCount || 0;

  // Ensure sheet exists with headers
  var sheet = ensureCycleWeatherSheet_(ss);
  if (!sheet) {
    Logger.log('recordCycleWeather_: Could not create/access Cycle_Weather sheet');
    return;
  }

  // Check if this cycle already has a weather record (avoid duplicates)
  var existingData = sheet.getDataRange().getValues();
  var cycleCol = 0; // CycleID is first column

  for (var i = 1; i < existingData.length; i++) {
    if (existingData[i][cycleCol] === cycleId) {
      Logger.log('recordCycleWeather_: Cycle ' + cycleId + ' already recorded, skipping');
      return;
    }
  }

  // Build advisory text from alerts
  var alerts = tracking.activeAlerts || weatherSum.alerts || [];
  var advisory = '';
  if (alerts.length > 0) {
    advisory = alerts.map(function(a) {
      return a.replace(/_/g, ' ').toUpperCase();
    }).join('; ');
  }

  // Build row
  var row = [
    cycleId,                                    // CycleID
    weather.type || 'clear',                    // Type
    weather.temp || weather.temperature || 65,  // Temp
    weather.impact || 1.0,                      // Impact
    advisory,                                   // Advisory
    weatherSum.comfort || 0.5,                  // Comfort
    weatherSum.mood || 'neutral',               // Mood
    alerts.join(', '),                          // Alerts
    tracking.currentStreak || 1,                // Streak
    tracking.streakType || weather.type,        // StreakType
    new Date().toISOString()                    // Timestamp
  ];

  // Append row
  sheet.appendRow(row);

  Logger.log('recordCycleWeather_: Recorded weather for cycle ' + cycleId +
             ' - ' + weather.type + ' ' + weather.temp + '°F');
}


/**
 * Ensures Cycle_Weather sheet exists with proper headers
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @returns {SpreadsheetApp.Sheet}
 */
function ensureCycleWeatherSheet_(ss) {
  var sheetName = 'Cycle_Weather';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, CYCLE_WEATHER_HEADERS.length).setValues([CYCLE_WEATHER_HEADERS]);
    sheet.setFrozenRows(1);

    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, CYCLE_WEATHER_HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#E8F0FE');

    Logger.log('ensureCycleWeatherSheet_: Created Cycle_Weather sheet');
  }

  return sheet;
}


/**
 * Looks up weather for a specific cycle from Cycle_Weather sheet
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cycleId - The cycle to look up
 * @returns {Object|null} Weather data or null if not found
 */
function getWeatherForCycle_(ss, cycleId) {
  var sheet = ss.getSheetByName('Cycle_Weather');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === cycleId) {
      var weather = {};
      for (var j = 0; j < headers.length; j++) {
        weather[headers[j]] = data[i][j];
      }
      return weather;
    }
  }

  return null;
}


/**
 * Gets weather history for a range of cycles
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} startCycle - First cycle to include
 * @param {number} endCycle - Last cycle to include
 * @returns {Array} Array of weather objects
 */
function getWeatherHistory_(ss, startCycle, endCycle) {
  var sheet = ss.getSheetByName('Cycle_Weather');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var history = [];

  for (var i = 1; i < data.length; i++) {
    var cycleId = data[i][0];
    if (cycleId >= startCycle && cycleId <= endCycle) {
      var weather = {};
      for (var j = 0; j < headers.length; j++) {
        weather[headers[j]] = data[i][j];
      }
      history.push(weather);
    }
  }

  // Sort by cycle
  history.sort(function(a, b) {
    return a.CycleID - b.CycleID;
  });

  return history;
}
