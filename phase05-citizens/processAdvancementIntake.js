/**
 * ============================================================================
 * processAdvancementIntake v1.4
 * ============================================================================
 * 
 * v1.4 CHANGES:
 * - REMOVED logToDigest_ - main engine writeDigest_() handles Riley_Digest
 * - Prevents partial/misformatted rows when cycle crashes mid-execution
 * 
 * v1.3 CHANGES:
 * - Renamed findCol_ to findColByName_ to avoid collision
 * 
 * ============================================================================
 */

var EMERGENCE_USAGE_TYPES = [
  'quoted', 'observed', 'profile', 'scene', 'reaction', 'witness',
  'mentioned', 'interviewed', 'featured', 'community'
];

var NON_EMERGENCE_USAGE_TYPES = [
  'byline', 'stats', 'official', 'roster', 'routine', 'coverage', 'announcement'
];

function processAdvancementIntake_(ctx) {
  var ss = ctx ? ctx.ss : openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var now = ctx ? ctx.now : new Date();
  var cycle = ctx ? (ctx.summary.cycleId || ctx.config.cycleCount || 0) : getCurrentCycleFromConfig_(ss);
  
  var results = {
    usageProcessed: 0,
    usageSkipped: 0,
    advancementsProcessed: 0,
    intakeProcessed: 0,
    promotionsTriggered: 0,
    errors: []
  };
  
  Logger.log('processAdvancementIntake_ v1.4 starting - Cycle ' + cycle);
  
  var usageResults = processMediaUsage_(ss, now, cycle);
  results.usageProcessed = usageResults.processed;
  results.usageSkipped = usageResults.skipped;
  results.promotionsTriggered = usageResults.promotionsTriggered;
  
  var advResults = processAdvancementRows_(ss, now, cycle);
  results.advancementsProcessed = advResults.processed;
  
  var intakeResults = processIntakeRows_(ss, now, cycle);
  results.intakeProcessed = intakeResults.processed;
  
  if (ctx && ctx.summary) {
    ctx.summary.advancementResults = results;
  }
  
  Logger.log('processAdvancementIntake_ v1.4 complete: ' + JSON.stringify(results));
  return results;
}

function runAdvancementIntakeManual() {
  var results = processAdvancementIntake_(null);
  SpreadsheetApp.getActive().toast(
    'Usage: ' + results.usageProcessed + ' (skipped: ' + results.usageSkipped + ')' +
    ', Advancements: ' + results.advancementsProcessed + 
    ', Promotions: ' + results.promotionsTriggered,
    '✅ Advancement Complete', 10
  );
}

function getCurrentCycleFromConfig_(ss) {
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) return 0;
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'cycleCount') {
      return Number(data[i][1]) || 0;
    }
  }
  return 0;
}

function findColByName_(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === name) return i;
  }
  for (var j = 0; j < headers.length; j++) {
    if (String(headers[j]).trim().toLowerCase().startsWith(name.toLowerCase())) return j;
  }
  return -1;
}

function isEmergenceUsage_(usageType) {
  if (!usageType) return true;
  var type = String(usageType).trim().toLowerCase();
  for (var i = 0; i < EMERGENCE_USAGE_TYPES.length; i++) {
    if (type === EMERGENCE_USAGE_TYPES[i].toLowerCase()) return true;
  }
  for (var j = 0; j < NON_EMERGENCE_USAGE_TYPES.length; j++) {
    if (type === NON_EMERGENCE_USAGE_TYPES[j].toLowerCase()) return false;
  }
  return true;
}

function processMediaUsage_(ss, now, cycle) {
  var results = { processed: 0, skipped: 0, promotionsTriggered: 0 };
  
  var usageSheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!usageSheet) return results;
  
  var usageData = usageSheet.getDataRange().getValues();
  if (usageData.length < 2) return results;
  
  var usageHeaders = usageData[0];
  var nameCol = findColByName_(usageHeaders, 'CitizenName');
  if (nameCol < 0) nameCol = findColByName_(usageHeaders, 'Name');
  var usageTypeCol = findColByName_(usageHeaders, 'UsageType');
  var processedCol = findColByName_(usageHeaders, 'Processed');
  var contextCol = findColByName_(usageHeaders, 'Context');
  
  if (nameCol < 0) return results;
  
  if (processedCol < 0) {
    processedCol = usageHeaders.length;
    usageSheet.getRange(1, processedCol + 1).setValue('Processed');
  }
  
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  var genericData = genericSheet ? genericSheet.getDataRange().getValues() : [];
  var genericHeaders = genericData.length > 0 ? genericData[0] : [];
  var gFirstCol = findColByName_(genericHeaders, 'First');
  var gLastCol = findColByName_(genericHeaders, 'Last');
  var gEmergenceCol = findColByName_(genericHeaders, 'EmergenceCount');
  var gStatusCol = findColByName_(genericHeaders, 'Status');
  
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  var ledgerData = ledgerSheet ? ledgerSheet.getDataRange().getValues() : [];
  var ledgerHeaders = ledgerData.length > 0 ? ledgerData[0] : [];
  var lFirstCol = findColByName_(ledgerHeaders, 'First');
  var lLastCol = findColByName_(ledgerHeaders, 'Last');
  var lTierCol = findColByName_(ledgerHeaders, 'Tier');
  var lUsageCol = findColByName_(ledgerHeaders, 'UsageCount');
  var lPopIdCol = findColByName_(ledgerHeaders, 'POPID');
  
  var genericUpdates = {};
  var ledgerUpdates = {};
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  
  for (var i = 1; i < usageData.length; i++) {
    var row = usageData[i];
    var citizenName = row[nameCol] ? String(row[nameCol]).trim() : '';
    var usageType = usageTypeCol >= 0 ? String(row[usageTypeCol] || '').trim() : '';
    var context = contextCol >= 0 ? String(row[contextCol] || '').trim() : '';
    var alreadyProcessed = processedCol >= 0 && row[processedCol] === 'Y';
    
    if (!citizenName || alreadyProcessed) continue;
    
    var countsForEmergence = isEmergenceUsage_(usageType);
    
    if (!countsForEmergence) {
      usageSheet.getRange(i + 1, processedCol + 1).setValue('Y');
      results.skipped++;
      continue;
    }
    
    var nameParts = citizenName.split(' ');
    var first = nameParts[0] || '';
    var last = nameParts.slice(1).join(' ') || '';
    var found = false;
    
    if (ledgerSheet && lFirstCol >= 0 && lLastCol >= 0) {
      for (var lr = 1; lr < ledgerData.length; lr++) {
        var lFirst = String(ledgerData[lr][lFirstCol] || '').trim();
        var lLast = String(ledgerData[lr][lLastCol] || '').trim();
        
        if (lFirst.toLowerCase() === first.toLowerCase() && 
            lLast.toLowerCase() === last.toLowerCase()) {
          found = true;
          
          var currentUsage = ledgerUpdates[lr] ? ledgerUpdates[lr].usageCount : 
                            (lUsageCol >= 0 ? (Number(ledgerData[lr][lUsageCol]) || 0) : 0);
          var newUsage = currentUsage + 1;
          
          var currentTier = ledgerUpdates[lr] ? ledgerUpdates[lr].tier :
                           (lTierCol >= 0 ? (Number(ledgerData[lr][lTierCol]) || 4) : 4);
          var newTier = currentTier;
          var popId = lPopIdCol >= 0 ? ledgerData[lr][lPopIdCol] : '';
          
          if (newUsage >= 9 && currentTier > 1) {
            newTier = 1;
            results.promotionsTriggered++;
          } else if (newUsage >= 6 && currentTier > 2) {
            newTier = 2;
            results.promotionsTriggered++;
          } else if (newUsage >= 3 && currentTier > 3) {
            newTier = 3;
            results.promotionsTriggered++;
          }
          
          ledgerUpdates[lr] = { 
            usageCount: newUsage, tier: newTier, name: lFirst + ' ' + lLast,
            popId: popId, oldTier: currentTier, usageType: usageType, context: context
          };
          break;
        }
      }
    }
    
    if (!found && genericSheet && gFirstCol >= 0 && gLastCol >= 0) {
      for (var gr = 1; gr < genericData.length; gr++) {
        var gFirst = String(genericData[gr][gFirstCol] || '').trim();
        var gLast = String(genericData[gr][gLastCol] || '').trim();
        var gStatus = gStatusCol >= 0 ? String(genericData[gr][gStatusCol] || '') : 'Active';
        
        if (gStatus !== 'Active') continue;
        
        if (gFirst.toLowerCase() === first.toLowerCase() && 
            gLast.toLowerCase() === last.toLowerCase()) {
          found = true;
          var currentEmergence = genericUpdates[gr] !== undefined ? genericUpdates[gr] :
                                (gEmergenceCol >= 0 ? (Number(genericData[gr][gEmergenceCol]) || 0) : 0);
          genericUpdates[gr] = currentEmergence + 1;
          break;
        }
      }
    }
    
    usageSheet.getRange(i + 1, processedCol + 1).setValue('Y');
    if (found) {
      results.processed++;
    } else {
      results.skipped++;
    }
  }
  
  if (genericSheet && gEmergenceCol >= 0) {
    for (var gRow in genericUpdates) {
      genericSheet.getRange(Number(gRow) + 1, gEmergenceCol + 1).setValue(genericUpdates[gRow]);
    }
  }
  
  if (ledgerSheet) {
    for (var lRow in ledgerUpdates) {
      var update = ledgerUpdates[lRow];
      if (lUsageCol >= 0) {
        ledgerSheet.getRange(Number(lRow) + 1, lUsageCol + 1).setValue(update.usageCount);
      }
      if (lTierCol >= 0 && update.tier !== update.oldTier) {
        ledgerSheet.getRange(Number(lRow) + 1, lTierCol + 1).setValue(update.tier);
        if (logSheet) {
          logSheet.appendRow([now, update.popId, update.name, 'Promotion',
            'Advanced from Tier ' + update.oldTier + ' to Tier ' + update.tier,
            'Engine', cycle]);
        }
      }
    }
  }
  
  return results;
}

function processAdvancementRows_(ss, now, cycle) {
  var results = { processed: 0 };
  
  var intakeSheet = ss.getSheetByName('Advancement_Intake1');
  if (!intakeSheet) intakeSheet = ss.getSheetByName('Advancement_Intake');
  if (!intakeSheet) return results;
  
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!ledgerSheet) return results;
  
  var intakeData = intakeSheet.getDataRange().getValues();
  if (intakeData.length < 2) {
    Logger.log('processAdvancementRows_: No data rows in intake');
    return results;
  }
  
  var intakeHeaders = intakeData[0];
  var ledgerData = ledgerSheet.getDataRange().getValues();
  var ledgerHeaders = ledgerData[0];
  
  var iFirst = findColByName_(intakeHeaders, 'First');
  var iMiddle = findColByName_(intakeHeaders, 'Middle');
  var iLast = findColByName_(intakeHeaders, 'Last');
  var iRoleType = findColByName_(intakeHeaders, 'RoleType');
  var iTier = findColByName_(intakeHeaders, 'Tier');
  var iClockMode = findColByName_(intakeHeaders, 'ClockMode');
  var iNotes = findColByName_(intakeHeaders, 'Notes');
  
  var lPopId = findColByName_(ledgerHeaders, 'POPID');
  var lFirst = findColByName_(ledgerHeaders, 'First');
  var lMiddle = findColByName_(ledgerHeaders, 'Middle');
  var lLast = findColByName_(ledgerHeaders, 'Last');
  var lTier = findColByName_(ledgerHeaders, 'Tier');
  var lRoleType = findColByName_(ledgerHeaders, 'RoleType');
  var lClockMode = findColByName_(ledgerHeaders, 'ClockMode');
  var lStatus = findColByName_(ledgerHeaders, 'Status');
  var lLifeHistory = findColByName_(ledgerHeaders, 'LifeHistory');
  var lCreatedAt = findColByName_(ledgerHeaders, 'CreatedAt');
  var lLastUpdated = findColByName_(ledgerHeaders, 'Last Updated');
  var lUsageCol = findColByName_(ledgerHeaders, 'UsageCount');
  
  var maxPop = 0;
  for (var r = 1; r < ledgerData.length; r++) {
    var v = String(ledgerData[r][lPopId] || '').match(/POP-(\d+)/);
    if (v) maxPop = Math.max(maxPop, Number(v[1]));
  }
  
  var rowsToClear = [];
  
  for (var i = 1; i < intakeData.length; i++) {
    var row = intakeData[i];
    var first = iFirst >= 0 ? String(row[iFirst] || '').trim() : '';
    var middle = iMiddle >= 0 ? String(row[iMiddle] || '').trim() : '';
    var last = iLast >= 0 ? String(row[iLast] || '').trim() : '';
    
    if (!first && !last) continue;
    
    var roleType = iRoleType >= 0 ? (row[iRoleType] || 'Citizen') : 'Citizen';
    var tier = iTier >= 0 ? (row[iTier] || 3) : 3;
    var clockMode = iClockMode >= 0 ? (row[iClockMode] || 'ENGINE') : 'ENGINE';
    var notes = iNotes >= 0 ? (row[iNotes] || '') : '';
    
    var existingRow = -1;
    for (var lr = 1; lr < ledgerData.length; lr++) {
      var eFirst = String(ledgerData[lr][lFirst] || '').trim().toLowerCase();
      var eLast = String(ledgerData[lr][lLast] || '').trim().toLowerCase();
      if (eFirst === first.toLowerCase() && eLast === last.toLowerCase()) {
        existingRow = lr;
        break;
      }
    }
    
    if (existingRow >= 0) {
      if (lTier >= 0) ledgerSheet.getRange(existingRow + 1, lTier + 1).setValue(tier);
      if (lRoleType >= 0 && roleType) ledgerSheet.getRange(existingRow + 1, lRoleType + 1).setValue(roleType);
      if (lLastUpdated >= 0) ledgerSheet.getRange(existingRow + 1, lLastUpdated + 1).setValue(now);
      var popId = lPopId >= 0 ? ledgerData[existingRow][lPopId] : '';
      if (logSheet) {
        logSheet.appendRow([now, popId, first + ' ' + last, 'Advancement',
          'Updated to Tier ' + tier + '. ' + notes, 'Engine', cycle]);
      }
    } else {
      maxPop++;
      var newPopId = 'POP-' + String(maxPop).padStart(5, '0');
      var newRow = new Array(ledgerHeaders.length).fill('');
      if (lPopId >= 0) newRow[lPopId] = newPopId;
      if (lFirst >= 0) newRow[lFirst] = first;
      if (lMiddle >= 0) newRow[lMiddle] = middle;
      if (lLast >= 0) newRow[lLast] = last;
      if (lTier >= 0) newRow[lTier] = tier;
      if (lRoleType >= 0) newRow[lRoleType] = roleType;
      if (lClockMode >= 0) newRow[lClockMode] = clockMode;
      if (lStatus >= 0) newRow[lStatus] = 'Active';
      if (lLifeHistory >= 0) newRow[lLifeHistory] = 'Promoted to Tier ' + tier + ' in Cycle ' + cycle + '. ' + notes;
      if (lCreatedAt >= 0) newRow[lCreatedAt] = now;
      if (lLastUpdated >= 0) newRow[lLastUpdated] = now;
      if (lUsageCol >= 0) newRow[lUsageCol] = 0;
      ledgerSheet.appendRow(newRow);
      if (logSheet) {
        logSheet.appendRow([now, newPopId, first + ' ' + last, 'Promotion',
          'Added to Simulation_Ledger as Tier ' + tier + '. ' + notes, 'Engine', cycle]);
      }
      markAsEmergedInGeneric_(ss, genericSheet, first, last, cycle);
    }
    
    rowsToClear.push(i + 1);
    results.processed++;
  }
  
  if (rowsToClear.length > 0) {
    rowsToClear.sort(function(a, b) { return b - a; });
    for (var c = 0; c < rowsToClear.length; c++) {
      intakeSheet.getRange(rowsToClear[c], 1, 1, intakeSheet.getLastColumn()).clearContent();
    }
  }
  
  return results;
}

function processIntakeRows_(ss, now, cycle) {
  var results = { processed: 0 };
  var intakeSheet = ss.getSheetByName('Intake');
  if (!intakeSheet) return results;
  var intakeData = intakeSheet.getDataRange().getValues();
  if (intakeData.length < 2) return results;
  var intakeHeaders = intakeData[0];
  var iFirst = findColByName_(intakeHeaders, 'First');
  var iLast = findColByName_(intakeHeaders, 'Last');
  for (var i = 1; i < intakeData.length; i++) {
    var first = iFirst >= 0 ? String(intakeData[i][iFirst] || '').trim() : '';
    var last = iLast >= 0 ? String(intakeData[i][iLast] || '').trim() : '';
    if (first || last) results.processed++;
  }
  return results;
}

function markAsEmergedInGeneric_(ss, genericSheet, first, last, cycle) {
  if (!genericSheet) genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return;
  var data = genericSheet.getDataRange().getValues();
  var headers = data[0];
  var gFirst = findColByName_(headers, 'First');
  var gLast = findColByName_(headers, 'Last');
  var gStatus = findColByName_(headers, 'Status');
  if (gFirst < 0 || gLast < 0) return;
  for (var r = 1; r < data.length; r++) {
    var f = String(data[r][gFirst] || '').trim();
    var l = String(data[r][gLast] || '').trim();
    if (f.toLowerCase() === first.toLowerCase() && l.toLowerCase() === last.toLowerCase()) {
      if (gStatus >= 0) genericSheet.getRange(r + 1, gStatus + 1).setValue('Emerged');
      break;
    }
  }
}