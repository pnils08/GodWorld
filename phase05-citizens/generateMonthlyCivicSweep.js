/**
 * ============================================================================
 * generateMonthlyCivicSweep v2.6
 * ============================================================================
 *
 * v2.6 Changes:
 * - Add guard for missing CIV (y/n) column
 * - Add guard for empty World_Population (no data row)
 * - Build name from First + Last if FullName column missing
 * - Fallback to POPID if no name available
 *
 * v2.5:
 * - FIXED: Reads world state from World_Population (where it actually exists)
 * - Civic data still from Simulation_Ledger
 *
 * ORIGINAL SCHEMA (15 columns) - UNCHANGED
 *
 * ============================================================================
 */

function generateMonthlyCivicSweep(ssOverride) {

  var ss = ssOverride || SpreadsheetApp.openById('1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk');

  var ledger = ss.getSheetByName('Simulation_Ledger');
  var pop = ss.getSheetByName('World_Population');
  var sweep = ss.getSheetByName('Civic_Sweep_Report');

  // ═══════════════════════════════════════════════════════════════════════════
  // ORIGINAL SCHEMA (15 columns) - DO NOT CHANGE ORDER
  // ═══════════════════════════════════════════════════════════════════════════
  var HEADERS = [
    'Timestamp',        // A
    'CivicRoster',      // B
    'CivicCount',       // C
    'Scandals',         // D
    'Resignations',     // E
    'Retirements',      // F
    'CivicLoad',        // G
    'CycleWeight',      // H
    'CycleWeightReason',// I
    'WorldEventsCount', // J
    'PatternFlag',      // K
    'ShockFlag',        // L
    'WeatherType',      // M
    'WeatherImpact',    // N
    'Sentiment'         // O
  ];

  // Create sheet with headers if missing
  if (!sweep) {
    sweep = ss.insertSheet('Civic_Sweep_Report');
    sweep.appendRow(HEADERS);
    sweep.setFrozenRows(1);
  }

  if (!ledger || !pop) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCAN LEDGER FOR CIV DATA
  // ═══════════════════════════════════════════════════════════════════════════
  var data = ledger.getDataRange().getValues();
  if (data.length < 2) return;

  var header = data[0];

  var colIndex = function(h) { return header.indexOf(h); };

  var iCIV = colIndex('CIV (y/n)');
  var iStatus = colIndex('Status');
  var iName = colIndex('FullName');
  var iFirst = colIndex('First');
  var iLast = colIndex('Last');
  var iPopId = colIndex('POPID');

  // v2.6: Guard for missing CIV column
  if (iCIV < 0) {
    Logger.log('generateMonthlyCivicSweep: Missing column "CIV (y/n)" in Simulation_Ledger');
    return;
  }

  var civicCount = 0;
  var scandals = 0;
  var resignations = 0;
  var retirements = 0;
  var civicRoster = [];

  for (var r = 1; r < data.length; r++) {
    var civVal = (data[r][iCIV] || "").toString().toLowerCase().trim();
    var isCIV = civVal === "y" || civVal === "yes";
    if (!isCIV) continue;

    civicCount++;

    // v2.6: Build name from First + Last if FullName missing
    var name = '';
    if (iName >= 0 && data[r][iName]) {
      name = data[r][iName];
    } else {
      var first = iFirst >= 0 ? (data[r][iFirst] || '') : '';
      var last = iLast >= 0 ? (data[r][iLast] || '') : '';
      name = (String(first).trim() + ' ' + String(last).trim()).trim();
      // Fallback to POPID if no name
      if (!name && iPopId >= 0) {
        name = data[r][iPopId] || '';
      }
    }
    if (name) civicRoster.push(name);

    // v2.6: Default to "Active" if Status column missing
    var status = iStatus >= 0 ? (data[r][iStatus] || "Active") : "Active";
    status = status.toString().trim().toLowerCase();

    if (status === "scandal") scandals++;
    if (status === "resigned") resignations++;
    if (status === "retired") retirements++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ WORLD STATE FROM WORLD_POPULATION
  // ═══════════════════════════════════════════════════════════════════════════
  var popValues = pop.getDataRange().getValues();

  // v2.6: Guard for empty World_Population
  if (popValues.length < 2) {
    Logger.log('generateMonthlyCivicSweep: World_Population has no data row');
    return;
  }

  var popHeader = popValues[0];
  var popRow = popValues[1];

  var get = function(colName) {
    var idx = popHeader.indexOf(colName);
    return idx >= 0 ? popRow[idx] : '';
  };

  var civicLoad = get('civicLoad') || '';
  var cycleWeight = get('cycleWeight') || '';
  var cycleWeightReason = get('cycleWeightReason') || '';
  var worldEventsCount = get('worldEventsCount') || 0;
  var patternFlag = get('patternFlag') || '';
  var shockFlag = get('shockFlag') || '';
  var weatherType = get('weatherType') || '';
  var weatherImpact = get('weatherImpact') || '';
  var sentiment = get('sentiment') || '';

  // ═══════════════════════════════════════════════════════════════════════════
  // APPEND ROW - ORIGINAL COLUMN ORDER
  // ═══════════════════════════════════════════════════════════════════════════
  sweep.appendRow([
    new Date(),                              // A  Timestamp
    civicRoster.slice(0, 10).join(', '),     // B  CivicRoster
    civicCount,                              // C  CivicCount
    scandals,                                // D  Scandals
    resignations,                            // E  Resignations
    retirements,                             // F  Retirements
    civicLoad,                               // G  CivicLoad
    cycleWeight,                             // H  CycleWeight
    cycleWeightReason,                       // I  CycleWeightReason
    worldEventsCount,                        // J  WorldEventsCount
    patternFlag,                             // K  PatternFlag
    shockFlag,                               // L  ShockFlag
    weatherType,                             // M  WeatherType
    weatherImpact,                           // N  WeatherImpact
    sentiment                                // O  Sentiment
  ]);

  Logger.log('generateMonthlyCivicSweep v2.6: CivicCount=' + civicCount +
             ', Scandals=' + scandals + ', Resignations=' + resignations +
             ', Retirements=' + retirements);
}


/**
 * ============================================================================
 * REFERENCE v2.6
 * ============================================================================
 *
 * OUTPUT SCHEMA (15 columns - DO NOT CHANGE ORDER):
 * A - Timestamp
 * B - CivicRoster (up to 10 names)
 * C - CivicCount
 * D - Scandals
 * E - Resignations
 * F - Retirements
 * G - CivicLoad
 * H - CycleWeight
 * I - CycleWeightReason
 * J - WorldEventsCount
 * K - PatternFlag
 * L - ShockFlag
 * M - WeatherType
 * N - WeatherImpact
 * O - Sentiment
 *
 * DATA SOURCES:
 * - Simulation_Ledger: CIV (y/n), Status, First, Last, POPID
 * - World_Population: civicLoad, cycleWeight, cycleWeightReason,
 *   worldEventsCount, patternFlag, shockFlag, weatherType,
 *   weatherImpact, sentiment
 *
 * ============================================================================
 */
