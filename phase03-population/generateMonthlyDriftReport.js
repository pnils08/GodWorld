/**
 * ============================================================================
 * generateMonthlyDriftReport v2.5 (FIXED DATA SOURCE)
 * ============================================================================
 *
 * FIXED: Reads ALL data from World_Population (where it actually exists)
 * Riley_Digest lookup removed - was looking for columns that don't exist there
 * 
 * ORIGINAL SCHEMA (22 columns) - UNCHANGED
 *
 * ============================================================================
 */

function generateMonthlyDriftReport(ssOverride) {

  var ss = ssOverride || openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID

  var pop = ss.getSheetByName('World_Population');
  if (!pop) return;

  var driftSheet = ss.getSheetByName('World_Drift_Report');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ORIGINAL SCHEMA (22 columns) - DO NOT CHANGE ORDER
  // ═══════════════════════════════════════════════════════════════════════════
  var HEADERS = [
    'Timestamp',        // A
    'totalPopulation',  // B
    'illnessRate',      // C
    'employmentRate',   // D
    'migration',        // E
    'economy',          // F
    'cycle',            // G
    'cycleWeight',      // H
    'cycleWeightReason',// I
    'civicLoad',        // J
    'migrationDrift',   // K
    'patternFlag',      // L
    'shockFlag',        // M
    'worldEventsCount', // N
    'weatherType',      // O
    'weatherImpact',    // P
    'trafficLoad',      // Q
    'retailLoad',       // R
    'tourismLoad',      // S
    'nightlifeLoad',    // T
    'publicSpacesLoad', // U
    'sentiment'         // V
  ];
  
  // Create sheet with headers if missing
  if (!driftSheet) {
    driftSheet = ss.insertSheet('World_Drift_Report');
    driftSheet.appendRow(HEADERS);
    driftSheet.setFrozenRows(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ ALL DATA FROM WORLD_POPULATION (row 2)
  // ═══════════════════════════════════════════════════════════════════════════
  var popValues = pop.getDataRange().getValues();
  var popHeader = popValues[0];
  var popRow = popValues[1];

  var get = function(name) {
    var idx = popHeader.indexOf(name);
    return idx >= 0 ? popRow[idx] : '';
  };

  // Core population data
  var total = get('totalPopulation') || 0;
  var ill = get('illnessRate') || 0;
  var emp = get('employmentRate') || 0;
  var mig = get('migration') || 0;
  var econ = get('economy') || 'stable';

  // Cycle signals
  var cycle = get('cycle') || '';
  var cycleWeight = get('cycleWeight') || '';
  var cycleWeightReason = get('cycleWeightReason') || '';
  var civicLoad = get('civicLoad') || '';
  var migrationDrift = get('migrationDrift') || '';
  var patternFlag = get('patternFlag') || '';
  var shockFlag = get('shockFlag') || '';
  var worldEventsCount = get('worldEventsCount') || 0;

  // Weather
  var weatherType = get('weatherType') || '';
  var weatherImpact = get('weatherImpact') || '';

  // City dynamics
  var trafficLoad = get('trafficLoad') || '';
  var retailLoad = get('retailLoad') || '';
  var tourismLoad = get('tourismLoad') || '';
  var nightlifeLoad = get('nightlifeLoad') || '';
  var publicSpacesLoad = get('publicSpacesLoad') || '';
  var sentiment = get('sentiment') || '';

  // ═══════════════════════════════════════════════════════════════════════════
  // APPEND ROW - ORIGINAL COLUMN ORDER
  // ═══════════════════════════════════════════════════════════════════════════
  driftSheet.appendRow([
    new Date(),         // A  Timestamp
    total,              // B  totalPopulation
    ill,                // C  illnessRate
    emp,                // D  employmentRate
    mig,                // E  migration
    econ,               // F  economy
    cycle,              // G  cycle
    cycleWeight,        // H  cycleWeight
    cycleWeightReason,  // I  cycleWeightReason
    civicLoad,          // J  civicLoad
    migrationDrift,     // K  migrationDrift
    patternFlag,        // L  patternFlag
    shockFlag,          // M  shockFlag
    worldEventsCount,   // N  worldEventsCount
    weatherType,        // O  weatherType
    weatherImpact,      // P  weatherImpact
    trafficLoad,        // Q  trafficLoad
    retailLoad,         // R  retailLoad
    tourismLoad,        // S  tourismLoad
    nightlifeLoad,      // T  nightlifeLoad
    publicSpacesLoad,   // U  publicSpacesLoad
    sentiment           // V  sentiment
  ]);
}