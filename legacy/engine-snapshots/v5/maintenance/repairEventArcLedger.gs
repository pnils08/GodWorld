/**
 * ============================================================================
 * EVENT_ARC_LEDGER REPAIR SCRIPT v1.0
 * ============================================================================
 * 
 * Problem: Headers got misaligned with data columns
 * Solution: Analyze data patterns, fix header row to match existing data
 * 
 * DOES NOT MOVE DATA — only repairs header row
 * 
 * Run repairEventArcLedger_DIAGNOSE() first to see the damage
 * Run repairEventArcLedger_FIX() to apply the repair
 * 
 * ============================================================================
 */

/**
 * STEP 1: Diagnose — see what's in each column
 */
function repairEventArcLedger_DIAGNOSE() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  
  if (!sheet) {
    Logger.log('ERROR: Event_Arc_Ledger not found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var numCols = sheet.getLastColumn();
  var numRows = data.length;
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('EVENT_ARC_LEDGER DIAGNOSIS');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Total columns: ' + numCols);
  Logger.log('Total rows: ' + numRows);
  Logger.log('Header count: ' + headers.length);
  Logger.log('');
  Logger.log('CURRENT HEADERS:');
  
  for (var h = 0; h < headers.length; h++) {
    Logger.log('  Col ' + (h + 1) + ': "' + headers[h] + '"');
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('COLUMN DATA ANALYSIS (sampling rows 2-6):');
  Logger.log('═══════════════════════════════════════════════════════════════');
  
  // Analyze each column
  for (var c = 0; c < numCols; c++) {
    var samples = [];
    for (var r = 1; r < Math.min(6, numRows); r++) {
      var val = data[r][c];
      if (val !== '' && val !== null && val !== undefined) {
        samples.push(String(val).substring(0, 30));
      }
    }
    
    var headerName = headers[c] || '(NO HEADER)';
    var inferredType = inferColumnType_(samples);
    
    Logger.log('');
    Logger.log('Col ' + (c + 1) + ' | Header: "' + headerName + '"');
    Logger.log('  Inferred: ' + inferredType);
    Logger.log('  Samples: ' + samples.join(' | '));
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Run repairEventArcLedger_FIX() to apply repairs');
  Logger.log('═══════════════════════════════════════════════════════════════');
}


/**
 * Infer what type of data is in a column based on samples
 */
function inferColumnType_(samples) {
  if (samples.length === 0) return 'EMPTY';
  
  var allDates = true;
  var allNumbers = true;
  var allBooleans = true;
  var hasArcId = false;
  var hasPhase = false;
  var hasNeighborhood = false;
  var hasDomain = false;
  var hasHoliday = false;
  var hasSeason = false;
  var hasPriority = false;
  
  var phases = ['early', 'rising', 'peak', 'falling', 'resolved'];
  var neighborhoods = ['Downtown', 'Temescal', 'Laurel', 'Fruitvale', 'Lake Merritt', 
                       'West Oakland', 'Rockridge', 'Jack London', 'Uptown', 'KONO', 
                       'Chinatown', 'Piedmont Ave'];
  var domains = ['CIVIC', 'HEALTH', 'GENERAL', 'COMMUNITY', 'ECONOMIC', 'SAFETY', 
                 'INFRASTRUCTURE', 'ENVIRONMENT', 'SPORTS', 'ARTS'];
  var holidays = ['none', 'MothersDay', 'FathersDay', 'MemorialDay', 'Independence', 
                  'LaborDay', 'Thanksgiving', 'Holiday', 'NewYear', 'MLKDay', 
                  'PresidentsDay', 'Easter', 'CincoDeMayo', 'Juneteenth', 'Halloween',
                  'VeteransDay', 'BlackFriday', 'NewYearsEve', 'LunarNewYear', 
                  'DiaDeMuertos', 'OaklandPride', 'OpeningDay'];
  var priorities = ['none', 'minor', 'major'];
  var seasons = ['early-season', 'mid-season', 'late-season', 'playoffs', 
                 'championship', 'off-season', 'spring-training', 'post-season'];
  
  for (var i = 0; i < samples.length; i++) {
    var s = String(samples[i]).trim();
    
    // Check date pattern
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) allDates = false;
    
    // Check number
    if (isNaN(Number(s))) allNumbers = false;
    
    // Check boolean
    if (s !== 'TRUE' && s !== 'FALSE' && s !== 'true' && s !== 'false') {
      allBooleans = false;
    }
    
    // Check arc ID pattern (8 hex chars)
    if (/^[0-9a-f]{8}$/i.test(s)) hasArcId = true;
    
    // Check phase
    if (phases.indexOf(s.toLowerCase()) >= 0) hasPhase = true;
    
    // Check neighborhood
    if (neighborhoods.indexOf(s) >= 0) hasNeighborhood = true;
    
    // Check domain
    if (domains.indexOf(s.toUpperCase()) >= 0) hasDomain = true;
    
    // Check holiday
    if (holidays.indexOf(s) >= 0) hasHoliday = true;
    
    // Check priority
    if (priorities.indexOf(s.toLowerCase()) >= 0) hasPriority = true;
    
    // Check season
    if (seasons.indexOf(s.toLowerCase()) >= 0) hasSeason = true;
  }
  
  if (allDates) return 'TIMESTAMP';
  if (hasArcId) return 'ARCID';
  if (hasPhase) return 'PHASE';
  if (hasNeighborhood) return 'NEIGHBORHOOD';
  if (hasDomain) return 'DOMAIN';
  if (hasHoliday) return 'HOLIDAY';
  if (hasPriority) return 'HOLIDAY_PRIORITY';
  if (hasSeason) return 'SPORTS_SEASON';
  if (allBooleans) return 'BOOLEAN';
  if (allNumbers) return 'NUMBER';
  
  return 'TEXT';
}


/**
 * STEP 2: Fix — apply the correct headers
 */
function repairEventArcLedger_FIX() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  
  if (!sheet) {
    Logger.log('ERROR: Event_Arc_Ledger not found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var numCols = sheet.getLastColumn();
  
  Logger.log('Analyzing ' + numCols + ' columns...');
  
  // Build column type map
  var colTypes = [];
  for (var c = 0; c < numCols; c++) {
    var samples = [];
    for (var r = 1; r < Math.min(10, data.length); r++) {
      var val = data[r][c];
      if (val !== '' && val !== null && val !== undefined) {
        samples.push(String(val));
      }
    }
    colTypes.push(inferColumnType_(samples));
  }
  
  Logger.log('Column types: ' + colTypes.join(', '));
  
  // Build correct header row based on expected schema + detected types
  // Original C69 schema: Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, Summary, CitizenCount, CycleCreated, CycleResolved
  // Added later: ArcAge, Holiday, HolidayPriority, MakerHold, ForceResolve, SportsSeason, ResolutionReason
  
  var correctHeaders = [];
  
  for (var c = 0; c < numCols; c++) {
    var type = colTypes[c];
    var currentHeader = data[0][c] || '';
    
    // Map detected types to correct header names
    var newHeader = currentHeader; // Default: keep current
    
    if (c === 0 && type === 'TIMESTAMP') newHeader = 'Timestamp';
    else if (c === 1 && type === 'NUMBER') newHeader = 'Cycle';
    else if (type === 'ARCID') newHeader = 'ArcId';
    else if (c === 3 && type === 'TEXT') newHeader = 'Type';
    else if (type === 'PHASE') newHeader = 'Phase';
    else if (c === 5 && type === 'NUMBER') newHeader = 'Tension';
    else if (type === 'NEIGHBORHOOD') newHeader = 'Neighborhood';
    else if (type === 'DOMAIN') newHeader = 'DomainTag';
    else if (c === 8 && type === 'TEXT') newHeader = 'Summary';
    else if (c === 9 && type === 'NUMBER') newHeader = 'CitizenCount';
    else if (c === 10 && type === 'NUMBER') newHeader = 'CycleCreated';
    else if (c === 11 && type === 'NUMBER') newHeader = 'CycleResolved';
    else if (c === 12 && type === 'NUMBER') newHeader = 'ArcAge';
    else if (type === 'HOLIDAY' && currentHeader !== 'ResolutionReason') newHeader = 'Holiday';
    else if (type === 'HOLIDAY_PRIORITY') newHeader = 'HolidayPriority';
    else if (type === 'BOOLEAN' && correctHeaders.indexOf('MakerHold') < 0) newHeader = 'MakerHold';
    else if (type === 'BOOLEAN' && correctHeaders.indexOf('MakerHold') >= 0) newHeader = 'ForceResolve';
    else if (type === 'SPORTS_SEASON') newHeader = 'SportsSeason';
    
    // Last column that has holiday data but header says ResolutionReason
    // This is the corruption - holiday got written to ResolutionReason column
    if (currentHeader === 'ResolutionReason' && type === 'HOLIDAY') {
      newHeader = 'ResolutionReason_CORRUPTED';
    }
    
    correctHeaders.push(newHeader);
  }
  
  Logger.log('');
  Logger.log('HEADER REPAIR PLAN:');
  for (var h = 0; h < correctHeaders.length; h++) {
    var old = data[0][h] || '(empty)';
    var newH = correctHeaders[h];
    if (old !== newH) {
      Logger.log('  Col ' + (h + 1) + ': "' + old + '" → "' + newH + '"');
    }
  }
  
  // Apply the fix
  sheet.getRange(1, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('HEADERS REPAIRED');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('');
  Logger.log('MANUAL CLEANUP NEEDED:');
  Logger.log('1. Column "ResolutionReason_CORRUPTED" has holiday data in it');
  Logger.log('2. Clear that column data (it\'s duplicate holiday info)');
  Logger.log('3. Rename header back to "ResolutionReason"');
  Logger.log('4. Add new columns at END if needed: Escalate, ResolutionType, ResolutionCycle, PrevPhase');
}


/**
 * STEP 3: Verify the repair
 */
function repairEventArcLedger_VERIFY() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  
  if (!sheet) {
    Logger.log('ERROR: Event_Arc_Ledger not found');
    return;
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('EVENT_ARC_LEDGER VERIFICATION');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('');
  Logger.log('CURRENT HEADERS (' + headers.length + ' columns):');
  
  for (var h = 0; h < headers.length; h++) {
    Logger.log('  ' + (h + 1) + '. ' + headers[h]);
  }
  
  // Check for expected headers
  var required = ['Timestamp', 'Cycle', 'ArcId', 'Type', 'Phase', 'Tension', 
                  'Neighborhood', 'DomainTag', 'Summary', 'CycleCreated', 'CycleResolved'];
  
  Logger.log('');
  Logger.log('REQUIRED HEADERS CHECK:');
  
  var missing = [];
  for (var i = 0; i < required.length; i++) {
    var found = headers.indexOf(required[i]) >= 0;
    Logger.log('  ' + required[i] + ': ' + (found ? 'OK' : 'MISSING'));
    if (!found) missing.push(required[i]);
  }
  
  if (missing.length > 0) {
    Logger.log('');
    Logger.log('WARNING: Missing required headers: ' + missing.join(', '));
  } else {
    Logger.log('');
    Logger.log('All required headers present.');
  }
}