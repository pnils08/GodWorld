/**
 * ensureTransitMetrics.js
 *
 * Transportation and transit metrics for Oakland.
 * Tracks BART ridership, AC Transit, traffic patterns.
 *
 * @version 1.0
 * @tier 6.4
 */

// ============================================================================
// SCHEMA DEFINITION (Append-Safe)
// ============================================================================

var TRANSIT_METRICS_HEADERS = [
  'Timestamp',
  'Cycle',
  'Station',
  'RidershipVolume',
  'OnTimePerformance',
  'TrafficIndex',
  'Corridor',
  'Notes'
];

var TRANSIT_METRICS_SHEET_NAME = 'Transit_Metrics';

// ============================================================================
// OAKLAND TRANSIT INFRASTRUCTURE
// ============================================================================

/**
 * BART stations in/near Oakland.
 * Ridership figures are baseline daily averages (pre-pandemic reference).
 */
var OAKLAND_BART_STATIONS = [
  {
    station: '12th St Oakland City Center',
    neighborhood: 'Downtown',
    baseRidership: 12500,
    character: 'downtown hub, transfers',
    corridors: ['Downtown', 'Lake Merritt', 'West Oakland']
  },
  {
    station: '19th St Oakland',
    neighborhood: 'Downtown',
    baseRidership: 8500,
    character: 'uptown arts district',
    corridors: ['Downtown', 'Lake Merritt', 'Temescal']
  },
  {
    station: 'Lake Merritt',
    neighborhood: 'Lake Merritt',
    baseRidership: 5000,
    character: 'lakeside access',
    corridors: ['Lake Merritt', 'Chinatown', 'Adams Point']
  },
  {
    station: 'Fruitvale',
    neighborhood: 'Fruitvale',
    baseRidership: 7500,
    character: 'transit village, cultural hub',
    corridors: ['Fruitvale', 'Dimond', 'East Oakland']
  },
  {
    station: 'Coliseum',
    neighborhood: 'Coliseum',
    baseRidership: 6000,
    character: 'event venue, airport connector',
    corridors: ['Coliseum', 'East Oakland', 'Elmhurst']
  },
  {
    station: 'West Oakland',
    neighborhood: 'West Oakland',
    baseRidership: 4500,
    character: 'industrial transition',
    corridors: ['West Oakland', 'Jack London', 'Downtown']
  },
  {
    station: 'MacArthur',
    neighborhood: 'Temescal',
    baseRidership: 9000,
    character: 'transfer station, north-south junction',
    corridors: ['Temescal', 'Rockridge', 'North Oakland']
  },
  {
    station: 'Rockridge',
    neighborhood: 'Rockridge',
    baseRidership: 7000,
    character: 'affluent commuter',
    corridors: ['Rockridge', 'Piedmont Ave', 'Montclair']
  }
];

/**
 * Major AC Transit lines serving Oakland neighborhoods.
 */
var AC_TRANSIT_LINES = [
  { line: '1', route: 'Berkeley-Oakland-Fremont', character: 'spine route', frequency: 10 },
  { line: '1R', route: 'Rapid: Berkeley-Oakland-Fremont', character: 'BRT-lite', frequency: 12 },
  { line: '6', route: 'Downtown Oakland-Lake Merritt', character: 'circulator', frequency: 15 },
  { line: '12', route: 'Berkeley-Downtown Oakland', character: 'cross-town', frequency: 15 },
  { line: '14', route: 'Fruitvale-Downtown', character: 'eastside connector', frequency: 20 },
  { line: '18', route: 'Montclair-Downtown', character: 'hills service', frequency: 30 },
  { line: '33', route: 'Piedmont Ave-Grand Lake', character: 'neighborhood', frequency: 20 },
  { line: '40', route: 'Foothill Blvd', character: 'east oakland spine', frequency: 15 },
  { line: '51A', route: 'Rockridge-Berkeley', character: 'college town', frequency: 12 },
  { line: '57', route: 'Fruitvale-Temescal', character: 'cross-town', frequency: 20 },
  { line: '72', route: 'San Leandro-Coliseum', character: 'east bay connector', frequency: 15 },
  { line: 'NL', route: 'All Nighter: Lake Merritt', character: 'late night', frequency: 30 }
];

/**
 * Major traffic corridors with baseline congestion.
 */
var TRAFFIC_CORRIDORS = [
  {
    corridor: 'I-880 North',
    baseTrafficIndex: 65,
    peakHours: [7, 8, 17, 18],
    character: 'industrial freight, commuter'
  },
  {
    corridor: 'I-880 South',
    baseTrafficIndex: 60,
    peakHours: [7, 8, 17, 18],
    character: 'to San Jose corridor'
  },
  {
    corridor: 'I-580 East',
    baseTrafficIndex: 70,
    peakHours: [6, 7, 8, 17, 18, 19],
    character: 'contra costa commute'
  },
  {
    corridor: 'I-580 West',
    baseTrafficIndex: 55,
    peakHours: [7, 8, 17, 18],
    character: 'to SF via bridge'
  },
  {
    corridor: 'I-980',
    baseTrafficIndex: 45,
    peakHours: [8, 17],
    character: 'downtown connector'
  },
  {
    corridor: 'Broadway',
    baseTrafficIndex: 50,
    peakHours: [8, 9, 12, 17, 18],
    character: 'downtown-uptown artery'
  },
  {
    corridor: 'International Blvd',
    baseTrafficIndex: 55,
    peakHours: [7, 8, 9, 17, 18],
    character: 'east oakland main street'
  },
  {
    corridor: 'MacArthur Blvd',
    baseTrafficIndex: 45,
    peakHours: [8, 17, 18],
    character: 'north oakland cross-town'
  },
  {
    corridor: 'Telegraph Ave',
    baseTrafficIndex: 50,
    peakHours: [8, 12, 17, 18],
    character: 'temescal to downtown'
  },
  {
    corridor: 'Grand Ave',
    baseTrafficIndex: 40,
    peakHours: [8, 12, 17],
    character: 'lake merritt to piedmont'
  }
];

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Ensure Transit_Metrics sheet exists with correct headers.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {SpreadsheetApp.Sheet}
 */
function ensureTransitMetricsSchema_(ss) {
  if (!ss) {
    throw new Error('ensureTransitMetricsSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(TRANSIT_METRICS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TRANSIT_METRICS_SHEET_NAME);
    sheet.appendRow(TRANSIT_METRICS_HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Check for missing headers
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missing = [];

  for (var i = 0; i < TRANSIT_METRICS_HEADERS.length; i++) {
    if (existing.indexOf(TRANSIT_METRICS_HEADERS[i]) === -1) {
      missing.push(TRANSIT_METRICS_HEADERS[i]);
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
 * Get all BART stations.
 *
 * @return {Array}
 */
function getBARTStations_() {
  return OAKLAND_BART_STATIONS.map(function(s) {
    return {
      station: s.station,
      neighborhood: s.neighborhood,
      baseRidership: s.baseRidership,
      character: s.character,
      corridors: s.corridors
    };
  });
}

/**
 * Get BART station by neighborhood.
 *
 * @param {string} neighborhood
 * @return {Object|null}
 */
function getBARTStationForNeighborhood_(neighborhood) {
  for (var i = 0; i < OAKLAND_BART_STATIONS.length; i++) {
    if (OAKLAND_BART_STATIONS[i].neighborhood === neighborhood) {
      return OAKLAND_BART_STATIONS[i];
    }
    // Check corridors
    if (OAKLAND_BART_STATIONS[i].corridors.indexOf(neighborhood) !== -1) {
      return OAKLAND_BART_STATIONS[i];
    }
  }
  return null;
}

/**
 * Get AC Transit lines.
 *
 * @return {Array}
 */
function getACTransitLines_() {
  return AC_TRANSIT_LINES.map(function(l) {
    return {
      line: l.line,
      route: l.route,
      character: l.character,
      frequency: l.frequency
    };
  });
}

/**
 * Get traffic corridor data.
 *
 * @return {Array}
 */
function getTrafficCorridors_() {
  return TRAFFIC_CORRIDORS.map(function(c) {
    return {
      corridor: c.corridor,
      baseTrafficIndex: c.baseTrafficIndex,
      peakHours: c.peakHours,
      character: c.character
    };
  });
}

/**
 * Get transit metrics from sheet.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cycle - Optional, get metrics for specific cycle
 * @return {Array}
 */
function getTransitMetrics_(ss, cycle) {
  var sheet = ss.getSheetByName(TRANSIT_METRICS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var rowCycle = Number(row[idx('Cycle')]) || 0;

    // Filter by cycle if specified
    if (cycle !== undefined && rowCycle !== cycle) {
      continue;
    }

    result.push({
      timestamp: row[idx('Timestamp')],
      cycle: rowCycle,
      station: String(row[idx('Station')] || ''),
      ridershipVolume: Number(row[idx('RidershipVolume')]) || 0,
      onTimePerformance: Number(row[idx('OnTimePerformance')]) || 0,
      trafficIndex: Number(row[idx('TrafficIndex')]) || 0,
      corridor: String(row[idx('Corridor')] || ''),
      notes: String(row[idx('Notes')] || '')
    });
  }

  return result;
}

/**
 * Get city-wide transit summary.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cycle
 * @return {Object}
 */
function getTransitSummary_(ss, cycle) {
  var metrics = getTransitMetrics_(ss, cycle);

  if (metrics.length === 0) {
    return {
      totalRidership: 0,
      avgOnTime: 0.85,
      avgTraffic: 50,
      stationsReported: 0
    };
  }

  var totalRidership = 0;
  var sumOnTime = 0;
  var sumTraffic = 0;
  var count = 0;

  for (var i = 0; i < metrics.length; i++) {
    var m = metrics[i];
    totalRidership += m.ridershipVolume;
    sumOnTime += m.onTimePerformance;
    sumTraffic += m.trafficIndex;
    count++;
  }

  return {
    totalRidership: totalRidership,
    avgOnTime: count > 0 ? Math.round((sumOnTime / count) * 100) / 100 : 0.85,
    avgTraffic: count > 0 ? Math.round(sumTraffic / count) : 50,
    stationsReported: count
  };
}

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

/**
 * Record transit metrics for a station/corridor.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} metrics - Metrics data
 */
function recordTransitMetrics_(ctx, metrics) {
  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rowData = [
    timestamp,
    cycle,
    metrics.station || '',
    metrics.ridershipVolume || 0,
    metrics.onTimePerformance || 0.85,
    metrics.trafficIndex || 50,
    metrics.corridor || '',
    metrics.notes || ''
  ];

  if (typeof queueAppendIntent_ === 'function') {
    queueAppendIntent_(ctx, TRANSIT_METRICS_SHEET_NAME, rowData,
      'record transit metrics', 'population', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureTransitMetricsSchema_(ss);
    sheet.appendRow(rowData);
  }
}

/**
 * Batch record transit metrics.
 *
 * @param {Object} ctx
 * @param {Array} metricsArray
 */
function batchRecordTransitMetrics_(ctx, metricsArray) {
  if (!metricsArray || metricsArray.length === 0) return;

  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rows = [];
  for (var i = 0; i < metricsArray.length; i++) {
    var m = metricsArray[i];
    rows.push([
      timestamp,
      cycle,
      m.station || '',
      m.ridershipVolume || 0,
      m.onTimePerformance || 0.85,
      m.trafficIndex || 50,
      m.corridor || '',
      m.notes || ''
    ]);
  }

  if (typeof queueBatchAppendIntent_ === 'function') {
    queueBatchAppendIntent_(ctx, TRANSIT_METRICS_SHEET_NAME, rows,
      'batch record transit metrics', 'population', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureTransitMetricsSchema_(ss);
    for (var j = 0; j < rows.length; j++) {
      sheet.appendRow(rows[j]);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate ridership modifier based on context.
 *
 * @param {Object} context - { weather, dayType, events, season }
 * @return {number} Modifier (1.0 = normal)
 */
function calculateRidershipModifier_(context) {
  var mod = 1.0;

  // Weather impacts
  var weather = (context.weather || '').toLowerCase();
  if (weather === 'storm') {
    mod *= 0.75; // 25% reduction
  } else if (weather === 'rain') {
    mod *= 0.9; // 10% reduction
  } else if (weather === 'heatwave') {
    mod *= 0.95; // 5% reduction
  }

  // Day type impacts
  var dayType = (context.dayType || '').toLowerCase();
  if (dayType === 'weekend') {
    mod *= 0.6; // 40% reduction on weekends
  } else if (dayType === 'holiday') {
    mod *= 0.4; // 60% reduction on holidays
  }

  // Season impacts
  var season = (context.season || '').toLowerCase();
  if (season === 'summer') {
    mod *= 0.9; // 10% less in summer
  }

  // Events boost ridership
  var events = context.events || 0;
  if (events > 0) {
    mod *= (1 + events * 0.05); // 5% boost per major event
  }

  return mod;
}

/**
 * Calculate traffic modifier based on context.
 *
 * @param {Object} context - { weather, events, gameDay, sentiment }
 * @return {number} Modifier (1.0 = normal)
 */
function calculateTrafficModifier_(context) {
  var mod = 1.0;

  // Weather impacts
  var weather = (context.weather || '').toLowerCase();
  if (weather === 'storm') {
    mod *= 1.3; // 30% worse traffic
  } else if (weather === 'rain') {
    mod *= 1.15; // 15% worse traffic
  } else if (weather === 'fog') {
    mod *= 1.1; // 10% worse traffic
  }

  // Events increase traffic
  var events = context.events || 0;
  if (events > 0) {
    mod *= (1 + events * 0.1); // 10% worse per major event
  }

  // Game day
  if (context.gameDay) {
    mod *= 1.25; // 25% worse on game days
  }

  return mod;
}

/**
 * Get nearest BART station for a neighborhood.
 *
 * @param {string} neighborhood
 * @return {string} Station name
 */
function getNearestBARTStation_(neighborhood) {
  // Direct match
  for (var i = 0; i < OAKLAND_BART_STATIONS.length; i++) {
    if (OAKLAND_BART_STATIONS[i].neighborhood === neighborhood) {
      return OAKLAND_BART_STATIONS[i].station;
    }
  }

  // Corridor match
  for (var j = 0; j < OAKLAND_BART_STATIONS.length; j++) {
    if (OAKLAND_BART_STATIONS[j].corridors.indexOf(neighborhood) !== -1) {
      return OAKLAND_BART_STATIONS[j].station;
    }
  }

  // Default to 12th St
  return '12th St Oakland City Center';
}

/**
 * Get traffic corridor for a neighborhood.
 *
 * @param {string} neighborhood
 * @return {string}
 */
function getCorridorForNeighborhood_(neighborhood) {
  var corridorMap = {
    'Downtown': 'Broadway',
    'Lake Merritt': 'Grand Ave',
    'Temescal': 'Telegraph Ave',
    'Rockridge': 'Telegraph Ave',
    'Fruitvale': 'International Blvd',
    'East Oakland': 'International Blvd',
    'West Oakland': 'I-880 North',
    'Jack London': 'I-880 North',
    'Coliseum': 'I-880 South',
    'Montclair': 'I-580 East',
    'Piedmont Ave': 'Broadway',
    'Grand Lake': 'Grand Ave',
    'Adams Point': 'Grand Ave',
    'Chinatown': 'Broadway',
    'Dimond': 'MacArthur Blvd',
    'Glenview': 'I-580 East',
    'Elmhurst': 'International Blvd'
  };

  return corridorMap[neighborhood] || 'I-880 North';
}
