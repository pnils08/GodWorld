/**
 * ensureCrimeMetrics.js
 *
 * Crime and public safety metrics per neighborhood.
 *
 * Depends on:
 * - Neighborhood_Demographics (Tier 3)
 * - World Events engine (Tier 2)
 *
 * @version 1.0
 * @tier 6.1
 */

// ============================================================================
// SCHEMA DEFINITION (Append-Safe)
// ============================================================================

var CRIME_METRICS_HEADERS = [
  'Neighborhood',
  'PropertyCrimeIndex',    // 0-100 scale (higher = more crime)
  'ViolentCrimeIndex',     // 0-100 scale (higher = more crime)
  'ResponseTimeAvg',       // Minutes (lower = better)
  'ClearanceRate',         // 0-1 decimal (higher = more cases solved)
  'IncidentCount',         // Total incidents this cycle
  'LastUpdated'            // CycleID
];

var CRIME_METRICS_SHEET_NAME = 'Crime_Metrics';

// ============================================================================
// NEIGHBORHOOD CRIME PROFILES
// ============================================================================

/**
 * Base crime profiles per neighborhood.
 * Modifiers affect baseline crime rates (1.0 = average).
 *
 * propertyCrimeMod: Theft, vandalism, burglary
 * violentCrimeMod: Assault, robbery, homicide
 * responseMod: Police response efficiency (higher = faster)
 * baseIncidents: Expected incidents per cycle at equilibrium
 */
var NEIGHBORHOOD_CRIME_PROFILES = {
  // engine.134 Task 4 (S423) — every Neighborhood_Map hood carries a profile,
  // character strings authored from docs/canon/INSTITUTIONS.md §Neighborhoods
  // (prosperity-era Oakland), not from 2026 strife priors. Mods are tuning.
  // Montclair REMOVED: no Neighborhood_Map row, so it is not a simulated place
  // (its stale Crime_Metrics row is a hand delete — ensure* has no delete path).
  // Coliseum / Elmhurst were removed under civic.20 E2 for the same reason.
  'Downtown': {
    propertyCrimeMod: 1.3,
    violentCrimeMod: 1.1,
    responseMod: 1.2,
    baseIncidents: 12,
    character: 'civic and corporate spine, institutional'
  },
  'Temescal': {
    propertyCrimeMod: 0.9,
    violentCrimeMod: 0.7,
    responseMod: 1.0,
    baseIncidents: 5,
    character: 'behind the boom, clinic corridor'
  },
  'Rockridge': {
    propertyCrimeMod: 0.6,
    violentCrimeMod: 0.4,
    responseMod: 1.1,
    baseIncidents: 3,
    character: 'earned money, professional, tree-lined'
  },
  'Fruitvale': {
    propertyCrimeMod: 1.1,
    violentCrimeMod: 1.0,
    responseMod: 0.9,
    baseIncidents: 8,
    character: 'transit hub over a multigenerational base'
  },
  'West Oakland': {
    propertyCrimeMod: 1.2,
    violentCrimeMod: 0.9,
    responseMod: 0.85,
    baseIncidents: 10,
    character: 'boom-born industrial, Civis campus'
  },
  'East Oakland': {
    propertyCrimeMod: 1.15,
    violentCrimeMod: 1.0,
    responseMod: 0.8,
    baseIncidents: 7,
    character: 'east flatlands, the Baylight frontier'
  },
  'Lake Merritt': {
    propertyCrimeMod: 1.0,
    violentCrimeMod: 0.8,
    responseMod: 1.1,
    baseIncidents: 6,
    character: 'old money lake ring, settled'
  },
  'Jack London': {
    propertyCrimeMod: 1.1,
    violentCrimeMod: 0.9,
    responseMod: 1.15,
    baseIncidents: 7,
    character: 'estuary nightlife, waterfront'
  },
  'Piedmont Ave': {
    propertyCrimeMod: 0.5,
    violentCrimeMod: 0.3,
    responseMod: 1.2,
    baseIncidents: 2,
    character: 'boutique and medical corridor'
  },
  'Grand Lake': {
    propertyCrimeMod: 0.7,
    violentCrimeMod: 0.5,
    responseMod: 1.05,
    baseIncidents: 4,
    character: 'theater district, family retail'
  },
  'Chinatown': {
    propertyCrimeMod: 1.0,
    violentCrimeMod: 0.85,
    responseMod: 0.95,
    baseIncidents: 6,
    character: 'the neighborhood that refused, multigenerational'
  },
  'Adams Point': {
    propertyCrimeMod: 0.8,
    violentCrimeMod: 0.6,
    responseMod: 1.0,
    baseIncidents: 4,
    character: 'lake-ring spillover, young and renting'
  },
  'Dimond': {
    propertyCrimeMod: 0.75,
    violentCrimeMod: 0.55,
    responseMod: 1.0,
    baseIncidents: 3,
    character: 'village commercial, living down a name'
  },
  'Glenview': {
    propertyCrimeMod: 0.65,
    violentCrimeMod: 0.45,
    responseMod: 1.05,
    baseIncidents: 3,
    character: 'family suburban, untouched'
  },
  'Laurel': {
    propertyCrimeMod: 0.7,
    violentCrimeMod: 0.5,
    responseMod: 1.0,
    baseIncidents: 3,
    character: 'the family belt that stayed reachable'
  },
  'Uptown': {
    propertyCrimeMod: 1.0,
    violentCrimeMod: 0.6,
    responseMod: 1.1,
    baseIncidents: 6,
    character: 'arts and nightlife district'
  },
  'KONO': {
    propertyCrimeMod: 0.9,
    violentCrimeMod: 0.6,
    responseMod: 1.0,
    baseIncidents: 5,
    character: 'emerging arts corridor'
  },
  'Brooklyn': {
    propertyCrimeMod: 0.7,
    violentCrimeMod: 0.5,
    responseMod: 1.05,
    baseIncidents: 3,
    character: 'new waterfront residential, quiet'
  },
  'Baylight District': {
    propertyCrimeMod: 1.1,
    violentCrimeMod: 0.9,
    responseMod: 1.15,
    baseIncidents: 7,
    character: 'sports mecca new-build, stadium crowds'
  },
  'Eastlake': {
    propertyCrimeMod: 0.8,
    violentCrimeMod: 0.6,
    responseMod: 1.0,
    baseIncidents: 4,
    character: 'lake money thinning, transitional'
  },
  'Ivy Hill': {
    propertyCrimeMod: 0.65,
    violentCrimeMod: 0.45,
    responseMod: 1.05,
    baseIncidents: 3,
    character: 'smallest D4 village, quiet'
  },
  'San Antonio': {
    propertyCrimeMod: 1.0,
    violentCrimeMod: 0.8,
    responseMod: 0.95,
    baseIncidents: 6,
    character: 'dense working core, pressured'
  }
};

// ============================================================================
// ITERATION SET + PROFILE LOOKUP (engine.134 Task 4, S423)
// ============================================================================

/**
 * The hoods the crime engine simulates: the Neighborhood_Map SET seeded at
 * Phase 1 (S.canonHoods.list, ADR-0016) — never the profile table's keys, which
 * is how ghosts (Coliseum, Elmhurst, Montclair) got live crime numbers and five
 * canon hoods got none. Without a ctx.summary seed (the ensure-and-boot path runs
 * before Phase 1) the profile keys are the only set available.
 */
function crimeIterationHoods_(S) {
  if (S && S.canonHoods && S.canonHoods.list && S.canonHoods.list.length) {
    return S.canonHoods.list.slice();
  }
  return Object.keys(NEIGHBORHOOD_CRIME_PROFILES);
}

/**
 * Profile for a hood: the authored entry, else one DERIVED from the hood's
 * Neighborhood_Map boom index (S.neighborhoodState, engine.135 B1) so a hood the
 * ledger gains tomorrow simulates from its own register on day one instead of
 * throwing on profile.propertyCrimeMod. Boom lowers crime a little; a blank
 * boom index reads 0 (the flat register), never a guess.
 */
function crimeProfileFor_(hood, S) {
  var authored = NEIGHBORHOOD_CRIME_PROFILES[hood];
  if (authored) return authored;
  var ns = S && S.neighborhoodState && S.neighborhoodState[hood];
  var boom = ns && typeof ns.boomIndex === 'number' && isFinite(ns.boomIndex) ? ns.boomIndex : 0;
  var round2 = function(n) { return Math.round(n * 100) / 100; };
  return {
    propertyCrimeMod: round2(1.0 - 0.2 * boom),
    violentCrimeMod: round2(0.8 - 0.2 * boom),
    responseMod: 1.0,
    baseIncidents: Math.max(2, Math.round(5 - 2 * boom)),
    character: 'derived from Neighborhood_Map boom index',
    derived: true
  };
}

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Ensure Crime_Metrics sheet exists with correct headers.
 * Append-safe: only adds missing columns at end.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss - Spreadsheet instance
 * @return {SpreadsheetApp.Sheet} The sheet
 */
function ensureCrimeMetricsSchema_(ss) {
  if (!ss) {
    throw new Error('ensureCrimeMetricsSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(CRIME_METRICS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CRIME_METRICS_SHEET_NAME);
    sheet.appendRow(CRIME_METRICS_HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Check for missing headers (append-safe)
  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missing = [];

  for (var i = 0; i < CRIME_METRICS_HEADERS.length; i++) {
    var h = CRIME_METRICS_HEADERS[i];
    if (existingHeaders.indexOf(h) === -1) {
      missing.push(h);
    }
  }

  if (missing.length > 0) {
    var lastCol = sheet.getLastColumn();
    for (var j = 0; j < missing.length; j++) {
      sheet.getRange(1, lastCol + j + 1).setValue(missing[j]);
    }
  }

  return sheet;
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all crime metrics data.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss - Spreadsheet instance
 * @return {Object} Map of neighborhood -> metrics object
 */
function getCrimeMetrics_(ss) {
  var sheet = ss.getSheetByName(CRIME_METRICS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return {};
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iNeighborhood = idx('Neighborhood');
  var iPropertyCrime = idx('PropertyCrimeIndex');
  var iViolentCrime = idx('ViolentCrimeIndex');
  var iResponseTime = idx('ResponseTimeAvg');
  var iClearanceRate = idx('ClearanceRate');
  var iIncidentCount = idx('IncidentCount');
  var iLastUpdated = idx('LastUpdated');

  var result = {};

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var neighborhood = String(row[iNeighborhood] || '').trim();
    if (!neighborhood) continue;

    result[neighborhood] = {
      neighborhood: neighborhood,
      propertyCrimeIndex: Number(row[iPropertyCrime]) || 0,
      violentCrimeIndex: Number(row[iViolentCrime]) || 0,
      responseTimeAvg: Number(row[iResponseTime]) || 0,
      clearanceRate: Number(row[iClearanceRate]) || 0,
      incidentCount: Number(row[iIncidentCount]) || 0,
      lastUpdated: Number(row[iLastUpdated]) || 0
    };
  }

  return result;
}

/**
 * Get crime metrics for a single neighborhood.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} neighborhood
 * @return {Object|null} Metrics object or null
 */
function getCrimeMetricsForNeighborhood_(ss, neighborhood) {
  var all = getCrimeMetrics_(ss);
  return all[neighborhood] || null;
}

/**
 * Get aggregate city-wide crime statistics.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Object} City-wide aggregates
 */
function getCityWideCrimeStats_(ss) {
  var metrics = getCrimeMetrics_(ss);
  var neighborhoods = Object.keys(metrics);

  if (neighborhoods.length === 0) {
    return {
      avgPropertyCrime: 50,
      avgViolentCrime: 50,
      avgResponseTime: 8,
      avgClearanceRate: 0.35,
      totalIncidents: 0,
      neighborhoodCount: 0
    };
  }

  var sumProperty = 0, sumViolent = 0, sumResponse = 0, sumClearance = 0, totalIncidents = 0;

  for (var i = 0; i < neighborhoods.length; i++) {
    var m = metrics[neighborhoods[i]];
    sumProperty += m.propertyCrimeIndex;
    sumViolent += m.violentCrimeIndex;
    sumResponse += m.responseTimeAvg;
    sumClearance += m.clearanceRate;
    totalIncidents += m.incidentCount;
  }

  var n = neighborhoods.length;
  return {
    avgPropertyCrime: Math.round(sumProperty / n),
    avgViolentCrime: Math.round(sumViolent / n),
    avgResponseTime: Math.round((sumResponse / n) * 10) / 10,
    avgClearanceRate: Math.round((sumClearance / n) * 100) / 100,
    totalIncidents: totalIncidents,
    neighborhoodCount: n
  };
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

/**
 * Update crime metrics for a single neighborhood.
 * Uses write-intents pattern.
 *
 * @param {Object} ctx - Engine context
 * @param {string} neighborhood
 * @param {Object} metrics - New metrics values
 */
function updateCrimeMetrics_(ctx, neighborhood, metrics) {
  var ss = ctx.ss;
  var sheet = ensureCrimeMetricsSchema_(ss);
  var data = sheet.getDataRange().getValues();
  var header = data[0];

  var idx = function(name) { return header.indexOf(name); };
  var iNeighborhood = idx('Neighborhood');

  // Find existing row
  var rowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iNeighborhood] || '').trim() === neighborhood) {
      rowIndex = r + 1; // 1-indexed for sheet
      break;
    }
  }

  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var rowData = [
    neighborhood,
    metrics.propertyCrimeIndex || 0,
    metrics.violentCrimeIndex || 0,
    metrics.responseTimeAvg || 8,
    metrics.clearanceRate || 0.35,
    metrics.incidentCount || 0,
    cycle
  ];

  if (rowIndex > 0) {
    // Update existing row
    if (typeof queueRangeIntent_ === 'function') {
      queueRangeIntent_(ctx, CRIME_METRICS_SHEET_NAME, rowIndex, 1, [rowData],
        'update crime metrics for ' + neighborhood, 'neighborhoods', 100);
    } else {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    }
  } else {
    // Append new row
    if (typeof queueAppendIntent_ === 'function') {
      queueAppendIntent_(ctx, CRIME_METRICS_SHEET_NAME, rowData,
        'add crime metrics for ' + neighborhood, 'neighborhoods', 100);
    } else {
      sheet.appendRow(rowData);
    }
  }
}

/**
 * Batch update crime metrics for multiple neighborhoods.
 * More efficient than individual updates.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} metricsMap - Map of neighborhood -> metrics
 */
function batchUpdateCrimeMetrics_(ctx, metricsMap) {
  var ss = ctx.ss;
  var sheet = ensureCrimeMetricsSchema_(ss);
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var existingRows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };
  var iNeighborhood = idx('Neighborhood');

  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;

  // Build existing neighborhood map
  var existingMap = {};
  for (var r = 0; r < existingRows.length; r++) {
    var hood = String(existingRows[r][iNeighborhood] || '').trim();
    if (hood) {
      existingMap[hood] = r + 2; // 1-indexed + header
    }
  }

  var updates = [];
  var appends = [];
  var neighborhoods = Object.keys(metricsMap);

  for (var i = 0; i < neighborhoods.length; i++) {
    var neighborhood = neighborhoods[i];
    var m = metricsMap[neighborhood];

    var rowData = [
      neighborhood,
      m.propertyCrimeIndex || 0,
      m.violentCrimeIndex || 0,
      m.responseTimeAvg || 8,
      m.clearanceRate || 0.35,
      m.incidentCount || 0,
      cycle
    ];

    if (existingMap[neighborhood]) {
      updates.push({ row: existingMap[neighborhood], data: rowData });
    } else {
      appends.push(rowData);
    }
  }

  // Execute updates
  for (var u = 0; u < updates.length; u++) {
    if (typeof queueRangeIntent_ === 'function') {
      queueRangeIntent_(ctx, CRIME_METRICS_SHEET_NAME, updates[u].row, 1, [updates[u].data],
        'batch update crime metrics', 'neighborhoods', 100);
    } else {
      sheet.getRange(updates[u].row, 1, 1, updates[u].data.length).setValues([updates[u].data]);
    }
  }

  // Execute appends
  if (appends.length > 0) {
    if (typeof queueBatchAppendIntent_ === 'function') {
      queueBatchAppendIntent_(ctx, CRIME_METRICS_SHEET_NAME, appends,
        'batch append crime metrics', 'neighborhoods', 100);
    } else {
      for (var a = 0; a < appends.length; a++) {
        sheet.appendRow(appends[a]);
      }
    }
  }
}

// ============================================================================
// SEEDING AND INITIALIZATION
// ============================================================================

/**
 * Seed crime metrics from neighborhood profiles.
 * Call once to initialize the sheet.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} demographicsOpt - Optional demographics data for weighting
 */
function seedCrimeMetricsFromProfiles_(ctx, demographicsOpt) {
  var demographics = demographicsOpt || {};
  var metricsMap = {};
  var neighborhoods = Object.keys(NEIGHBORHOOD_CRIME_PROFILES);

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var profile = NEIGHBORHOOD_CRIME_PROFILES[hood];
    var demo = demographics[hood] || {};

    // Base indices (scale 0-100)
    var baseProperty = 50 * profile.propertyCrimeMod;
    var baseViolent = 50 * profile.violentCrimeMod;

    // Adjust by demographics
    var unemploymentRate = demo.unemployed ? (demo.unemployed / ((demo.adults || 1000) + (demo.seniors || 100))) : 0.08;
    var youthRatio = demo.students ? (demo.students / ((demo.students || 100) + (demo.adults || 500) + (demo.seniors || 100))) : 0.2;

    // Unemployment increases property crime
    baseProperty += (unemploymentRate - 0.08) * 100;

    // Youth population correlates with some crime types
    baseViolent += (youthRatio - 0.2) * 30;

    // Clamp values
    baseProperty = Math.max(5, Math.min(95, Math.round(baseProperty)));
    baseViolent = Math.max(5, Math.min(95, Math.round(baseViolent)));

    // Response time (minutes) - affected by response modifier
    var responseTime = Math.round((8 / profile.responseMod) * 10) / 10;

    // Clearance rate (0-1) - baseline 0.35, modified by response efficiency
    var clearanceRate = Math.min(0.7, Math.max(0.15, 0.35 * profile.responseMod));
    clearanceRate = Math.round(clearanceRate * 100) / 100;

    metricsMap[hood] = {
      propertyCrimeIndex: baseProperty,
      violentCrimeIndex: baseViolent,
      responseTimeAvg: responseTime,
      clearanceRate: clearanceRate,
      incidentCount: profile.baseIncidents
    };
  }

  batchUpdateCrimeMetrics_(ctx, metricsMap);

  return metricsMap;
}

// ============================================================================
// CRIME EVENT DETECTION (for story signals)
// ============================================================================

/**
 * Calculate crime shifts between two snapshots.
 * Returns significant changes for story generation.
 *
 * @param {Object} prevMetrics - Previous cycle metrics
 * @param {Object} currMetrics - Current cycle metrics
 * @return {Array} Array of shift objects
 */
function calculateCrimeShifts_(prevMetrics, currMetrics) {
  var shifts = [];
  var THRESHOLD = 5; // 5-point change considered significant

  var neighborhoods = Object.keys(currMetrics);

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var prev = prevMetrics[hood] || { propertyCrimeIndex: 50, violentCrimeIndex: 50 };
    var curr = currMetrics[hood];

    var propertyDelta = curr.propertyCrimeIndex - prev.propertyCrimeIndex;
    var violentDelta = curr.violentCrimeIndex - prev.violentCrimeIndex;
    var responseDelta = curr.responseTimeAvg - (prev.responseTimeAvg || 8);

    if (Math.abs(propertyDelta) >= THRESHOLD) {
      shifts.push({
        neighborhood: hood,
        metric: 'propertyCrime',
        direction: propertyDelta > 0 ? 'increase' : 'decrease',
        magnitude: Math.abs(propertyDelta),
        newValue: curr.propertyCrimeIndex
      });
    }

    if (Math.abs(violentDelta) >= THRESHOLD) {
      shifts.push({
        neighborhood: hood,
        metric: 'violentCrime',
        direction: violentDelta > 0 ? 'increase' : 'decrease',
        magnitude: Math.abs(violentDelta),
        newValue: curr.violentCrimeIndex
      });
    }

    if (Math.abs(responseDelta) >= 1) { // 1 minute change significant
      shifts.push({
        neighborhood: hood,
        metric: 'responseTime',
        direction: responseDelta > 0 ? 'slower' : 'faster',
        magnitude: Math.abs(responseDelta),
        newValue: curr.responseTimeAvg
      });
    }
  }

  return shifts;
}

/**
 * Get high-crime neighborhoods (for event targeting).
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} crimeType - 'property' or 'violent'
 * @param {number} threshold - Index threshold (default 60)
 * @return {Array} Neighborhoods above threshold
 */
function getHighCrimeNeighborhoods_(ss, crimeType, threshold) {
  var metrics = getCrimeMetrics_(ss);
  var thresh = threshold || 60;
  var result = [];

  var neighborhoods = Object.keys(metrics);
  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var m = metrics[hood];

    var index = (crimeType === 'violent') ? m.violentCrimeIndex : m.propertyCrimeIndex;
    if (index >= thresh) {
      result.push({
        neighborhood: hood,
        index: index,
        crimeType: crimeType
      });
    }
  }

  // Sort by index descending
  result.sort(function(a, b) { return b.index - a.index; });

  return result;
}

/**
 * Get the crime profile for a neighborhood.
 *
 * @param {string} neighborhood
 * @return {Object} Profile or default
 */
function getCrimeProfile_(neighborhood) {
  return NEIGHBORHOOD_CRIME_PROFILES[neighborhood] || {
    propertyCrimeMod: 1.0,
    violentCrimeMod: 1.0,
    responseMod: 1.0,
    baseIncidents: 5,
    character: 'standard neighborhood'
  };
}
