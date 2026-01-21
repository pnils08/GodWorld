/**
 * ============================================================================
 * generateMonthlyCivicSweep v2.5 (FIXED DATA SOURCE)
 * ============================================================================
 *
 * FIXED: Reads world state from World_Population (where it actually exists)
 * Civic data still from Simulation_Ledger
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
  var header = data[0];
  
  var colIndex = function(h) { return header.indexOf(h); };

  var iCIV = colIndex('CIV (y/n)');
  var iStatus = colIndex('Status');
  var iName = colIndex('FullName');

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

    var name = iName >= 0 ? data[r][iName] : '';
    if (name) civicRoster.push(name);

    var status = (data[r][iStatus] || "Active").toString().trim().toLowerCase();
    if (status === "scandal") scandals++;
    if (status === "resigned") resignations++;
    if (status === "retired") retirements++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ WORLD STATE FROM WORLD_POPULATION
  // ═══════════════════════════════════════════════════════════════════════════
  var popValues = pop.getDataRange().getValues();
  var popHeader = popValues[0];
  var popRow = popValues[1];

  var get = function(name) {
    var idx = popHeader.indexOf(name);
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
}