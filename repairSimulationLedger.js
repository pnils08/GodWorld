/**
 * ============================================================================
 * Simulation Ledger Repair Utility v1.2
 * ============================================================================
 * 
 * v1.2 FIXES:
 * - Removed trailing underscores so functions appear in Run menu
 * - Added Neighborhood column if missing (appends to end)
 * 
 * ============================================================================
 */

var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

/**
 * Master repair function - runs all repairs
 * RUN THIS ONE
 */
function repairSimulationLedger() {
  var ss = SpreadsheetApp.openById(SIM_SSID);
  var ledger = ss.getSheetByName('Simulation_Ledger');
  
  // First, ensure Neighborhood column exists
  var header = ledger.getRange(1, 1, 1, ledger.getLastColumn()).getValues()[0];
  var iNeighborhood = header.indexOf('Neighborhood');
  
  if (iNeighborhood < 0) {
    // Add Neighborhood column at the end
    var lastCol = ledger.getLastColumn();
    ledger.getRange(1, lastCol + 1).setValue('Neighborhood');
    Logger.log('Added Neighborhood column at position ' + (lastCol + 1));
  }
  
  var results = {
    birthYears: repairMissingBirthYears(ss),
    neighborhoods: repairMissingNeighborhoods(ss),
    newCitizens: 0
  };
  
  var currentCount = ledger.getLastRow() - 1;
  
  if (currentCount < 500) {
    results.newCitizens = generateCitizensToTarget(ss, 500);
  }
  
  var summary = 'Simulation Ledger Repair Complete:\n' +
    '- BirthYears fixed: ' + results.birthYears + '\n' +
    '- Neighborhoods assigned: ' + results.neighborhoods + '\n' +
    '- New citizens generated: ' + results.newCitizens + '\n' +
    '- Total citizens: ' + (currentCount + results.newCitizens);
  
  Logger.log(summary);
  return results;
}


/**
 * ============================================================================
 * DIAGNOSTIC - v1.2
 * ============================================================================
 */
function diagnoseSimulationLedger() {
  var ss = SpreadsheetApp.openById(SIM_SSID);
  var ledger = ss.getSheetByName('Simulation_Ledger');
  
  if (!ledger) {
    Logger.log('ERROR: Simulation_Ledger not found');
    return;
  }
  
  var data = ledger.getDataRange().getValues();
  var header = data[0];
  
  var col = function(name) { return header.indexOf(name); };
  
  Logger.log('Headers found: ' + header.join(' | '));
  
  var stats = {
    totalCitizens: data.length - 1,
    missingBirthYear: 0,
    missingNeighborhood: 0,
    engineMode: 0,
    gameMode: 0,
    tier4: 0,
    tier3: 0,
    tier2: 0,
    tier1: 0,
    neighborhoodDistribution: {}
  };
  
  var iBirthYear = col('BirthYear');
  var iNeighborhood = col('Neighborhood');
  var iMode = col('ClockMode');
  var iTier = col('Tier');
  
  Logger.log('Column indices - BirthYear: ' + iBirthYear + ', Neighborhood: ' + iNeighborhood + ', ClockMode: ' + iMode + ', Tier: ' + iTier);
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    var birthYear = row[iBirthYear];
    if (!birthYear || birthYear < 1900 || birthYear === 0) {
      stats.missingBirthYear++;
    }
    
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '').toString().trim() : '';
    if (!neighborhood || neighborhood.length < 3) {
      stats.missingNeighborhood++;
    } else {
      stats.neighborhoodDistribution[neighborhood] = (stats.neighborhoodDistribution[neighborhood] || 0) + 1;
    }
    
    var mode = iMode >= 0 ? (row[iMode] || '').toString().toUpperCase() : '';
    if (mode === 'ENGINE') stats.engineMode++;
    if (mode === 'GAME') stats.gameMode++;
    
    var tier = Number(row[iTier]) || 0;
    if (tier === 4) stats.tier4++;
    if (tier === 3) stats.tier3++;
    if (tier === 2) stats.tier2++;
    if (tier <= 1) stats.tier1++;
  }
  
  Logger.log('=== SIMULATION LEDGER DIAGNOSTIC v1.2 ===');
  Logger.log('Total Citizens: ' + stats.totalCitizens);
  Logger.log('Missing BirthYear: ' + stats.missingBirthYear);
  Logger.log('Missing Neighborhood: ' + stats.missingNeighborhood);
  Logger.log('ENGINE Mode: ' + stats.engineMode);
  Logger.log('GAME Mode: ' + stats.gameMode);
  Logger.log('Tier 1: ' + stats.tier1);
  Logger.log('Tier 2: ' + stats.tier2);
  Logger.log('Tier 3: ' + stats.tier3);
  Logger.log('Tier 4: ' + stats.tier4);
  Logger.log('Neighborhood Distribution: ' + JSON.stringify(stats.neighborhoodDistribution));
  
  return stats;
}


/**
 * ============================================================================
 * 1. REPAIR MISSING BIRTHYEARS
 * ============================================================================
 */
function repairMissingBirthYears(ss) {
  ss = ss || SpreadsheetApp.openById(SIM_SSID);
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var data = ledger.getDataRange().getValues();
  var header = data[0];
  
  var col = function(name) { return header.indexOf(name); };
  var iBirthYear = col('BirthYear');
  var iLifeHistory = col('LifeHistory');
  
  if (iBirthYear < 0) {
    Logger.log('ERROR: BirthYear column not found');
    return 0;
  }
  
  var currentYear = 2025;
  var fixed = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var birthYear = row[iBirthYear];
    
    if (!birthYear || birthYear < 1900 || birthYear === 0) {
      var lifeHistory = iLifeHistory >= 0 ? (row[iLifeHistory] || '').toString() : '';
      
      var ageMatch = lifeHistory.match(/(\d{2})\s+(Temescal|Downtown|Fruitvale|Lake Merritt|West Oakland|Laurel|Rockridge|Jack London|Uptown|KONO|Chinatown|Piedmont Ave|Adams Point)/i);
      if (!ageMatch) {
        ageMatch = lifeHistory.match(/age\s*(\d{2})/i);
      }
      
      if (ageMatch) {
        var age = parseInt(ageMatch[1]);
        if (age >= 18 && age <= 100) {
          var calculatedBirthYear = currentYear - age;
          ledger.getRange(i + 1, iBirthYear + 1).setValue(calculatedBirthYear);
          fixed++;
        }
      } else {
        var randomAge = 25 + Math.floor(Math.random() * 40);
        var calculatedBirthYear = currentYear - randomAge;
        ledger.getRange(i + 1, iBirthYear + 1).setValue(calculatedBirthYear);
        fixed++;
      }
    }
  }
  
  Logger.log('repairMissingBirthYears: Fixed ' + fixed + ' rows');
  return fixed;
}


/**
 * ============================================================================
 * 2. REPAIR MISSING NEIGHBORHOODS
 * ============================================================================
 */
function repairMissingNeighborhoods(ss) {
  ss = ss || SpreadsheetApp.openById(SIM_SSID);
  var ledger = ss.getSheetByName('Simulation_Ledger');
  
  // Re-read data to get fresh header (in case column was just added)
  var data = ledger.getDataRange().getValues();
  var header = data[0];
  
  var col = function(name) { return header.indexOf(name); };
  var iNeighborhood = col('Neighborhood');
  var iLifeHistory = col('LifeHistory');
  
  if (iNeighborhood < 0) {
    Logger.log('ERROR: Neighborhood column not found');
    return 0;
  }
  
  var neighborhoods = [
    'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland',
    'Laurel', 'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave', 'Adams Point'
  ];
  
  var fixed = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var currentNeighborhood = (row[iNeighborhood] || '').toString().trim();
    
    if (!currentNeighborhood || currentNeighborhood.length < 3) {
      var lifeHistory = iLifeHistory >= 0 ? (row[iLifeHistory] || '').toString() : '';
      var foundNeighborhood = '';
      
      for (var n = 0; n < neighborhoods.length; n++) {
        if (lifeHistory.indexOf(neighborhoods[n]) >= 0) {
          foundNeighborhood = neighborhoods[n];
          break;
        }
      }
      
      var settledMatch = lifeHistory.match(/Settled in\s+([A-Za-z\s]+?)[\.\,\n]/i);
      if (settledMatch && !foundNeighborhood) {
        var possibleNeighborhood = settledMatch[1].trim();
        for (var n = 0; n < neighborhoods.length; n++) {
          if (possibleNeighborhood.toLowerCase() === neighborhoods[n].toLowerCase()) {
            foundNeighborhood = neighborhoods[n];
            break;
          }
        }
      }
      
      if (!foundNeighborhood) {
        foundNeighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
      }
      
      ledger.getRange(i + 1, iNeighborhood + 1).setValue(foundNeighborhood);
      fixed++;
    }
  }
  
  Logger.log('repairMissingNeighborhoods: Fixed ' + fixed + ' rows');
  return fixed;
}


/**
 * ============================================================================
 * 3. GENERATE CITIZENS TO TARGET
 * ============================================================================
 */
function generateCitizensToTarget(ss, target) {
  ss = ss || SpreadsheetApp.openById(SIM_SSID);
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var currentCount = ledger.getLastRow() - 1;
  
  if (currentCount >= target) {
    Logger.log('Already at ' + currentCount + ' citizens, target is ' + target);
    return 0;
  }
  
  var needed = target - currentCount;
  Logger.log('Need to generate ' + needed + ' citizens to reach ' + target);
  
  var header = ledger.getRange(1, 1, 1, ledger.getLastColumn()).getValues()[0];
  var col = function(name) { return header.indexOf(name); };
  
  var firstNames = ['Marcus', 'Aaliyah', 'DeShawn', 'Jasmine', 'Lorenzo', 'Rosa', 'Xavier', 'Brianna', 'Darius', 'Sofia', 'Andre', 'Ivy', 'Tariq', 'Janelle', 'Kevin', 'Maya', 'Ramon', 'Destiny', 'Jamal', 'Crystal'];
  var lastNames = ['Williams', 'Johnson', 'Brown', 'Davis', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Gonzalez', 'Cruz', 'Perez', 'Kim', 'Park', 'Patel', 'Santos', 'Ochoa', 'Hernandez', 'Wong', 'Foster', 'Cook', 'Harris', 'Mitchell', 'Brooks', 'Thompson'];
  var neighborhoods = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel', 'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];
  
  var lastPopId = currentCount;
  var newRows = [];
  var currentYear = 2025;
  
  for (var i = 0; i < needed; i++) {
    lastPopId++;
    var popId = 'POP-' + ('00000' + lastPopId).slice(-5);
    var firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    var lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    var neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    var age = 22 + Math.floor(Math.random() * 50);
    var birthYear = currentYear - age;
    var tier = Math.random() < 0.7 ? 4 : 3;
    
    var row = [];
    for (var c = 0; c < header.length; c++) {
      row.push('');
    }
    
    if (col('POPID') >= 0) row[col('POPID')] = popId;
    if (col('First') >= 0) row[col('First')] = firstName;
    if (col('Last') >= 0) row[col('Last')] = lastName;
    if (col('UNI (y/n)') >= 0) row[col('UNI (y/n)')] = 'n';
    if (col('MED (y/n)') >= 0) row[col('MED (y/n)')] = 'n';
    if (col('CIV (y/n)') >= 0) row[col('CIV (y/n)')] = 'n';
    if (col('ClockMode') >= 0) row[col('ClockMode')] = 'ENGINE';
    if (col('Tier') >= 0) row[col('Tier')] = tier;
    if (col('RoleType') >= 0) row[col('RoleType')] = 'Citizen';
    if (col('Status') >= 0) row[col('Status')] = 'Active';
    if (col('BirthYear') >= 0) row[col('BirthYear')] = birthYear;
    if (col('Neighborhood') >= 0) row[col('Neighborhood')] = neighborhood;
    if (col('LifeHistory') >= 0) row[col('LifeHistory')] = 'Generated citizen. ' + age + ' ' + neighborhood + '.';
    if (col('CreatedAt') >= 0) row[col('CreatedAt')] = new Date();
    if (col('Last Updated') >= 0) row[col('Last Updated')] = new Date();
    
    newRows.push(row);
  }
  
  if (newRows.length > 0) {
    ledger.getRange(ledger.getLastRow() + 1, 1, newRows.length, header.length).setValues(newRows);
  }
  
  Logger.log('generateCitizensToTarget: Generated ' + newRows.length + ' new citizens');
  return newRows.length;
}