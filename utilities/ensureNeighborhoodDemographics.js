/**
 * ============================================================================
 * NEIGHBORHOOD DEMOGRAPHICS UTILITY v1.0
 * ============================================================================
 *
 * Tier 3 Implementation: Central neighborhood demographic tracking.
 *
 * SCHEMA (7 columns - append-only safe):
 * Neighborhood | Students | Adults | Seniors | Unemployed | Sick | LastUpdated
 *
 * Students: School-age (5-22)
 * Adults: Working-age (23-64)
 * Seniors: 65+
 * Unemployed: Currently not working
 * Sick: Currently ill
 * LastUpdated: Cycle last recalculated
 *
 * ============================================================================
 */

var NEIGHBORHOOD_DEMOGRAPHICS_HEADERS = [
  'Neighborhood', 'Students', 'Adults', 'Seniors', 'Unemployed', 'Sick', 'LastUpdated'
];

/**
 * Standard Oakland neighborhoods for demographics tracking
 */
var OAKLAND_NEIGHBORHOODS = [
  'Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London',
  'Rockridge', 'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown',
  'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio'
];

/**
 * Neighborhood character profiles for demographic weighting
 * Used to derive initial demographics and influence citizen placement
 */
var NEIGHBORHOOD_PROFILES = {
  'Downtown': { studentMod: 0.7, adultMod: 1.4, seniorMod: 0.6, character: 'urban core' },
  'Temescal': { studentMod: 0.9, adultMod: 1.3, seniorMod: 0.8, character: 'young professional' },
  'Laurel': { studentMod: 1.1, adultMod: 1.0, seniorMod: 1.1, character: 'family oriented' },
  'West Oakland': { studentMod: 1.0, adultMod: 1.1, seniorMod: 0.9, character: 'evolving industrial' },
  'Fruitvale': { studentMod: 1.3, adultMod: 1.0, seniorMod: 1.0, character: 'multigenerational' },
  'Jack London': { studentMod: 0.6, adultMod: 1.4, seniorMod: 0.5, character: 'nightlife district' },
  'Rockridge': { studentMod: 0.8, adultMod: 1.0, seniorMod: 1.4, character: 'established affluent' },
  'Adams Point': { studentMod: 0.9, adultMod: 1.2, seniorMod: 1.0, character: 'lakeside residential' },
  'Grand Lake': { studentMod: 1.0, adultMod: 1.1, seniorMod: 1.1, character: 'theater district' },
  'Piedmont Ave': { studentMod: 0.8, adultMod: 1.0, seniorMod: 1.3, character: 'upscale residential' },
  'Chinatown': { studentMod: 1.0, adultMod: 1.0, seniorMod: 1.2, character: 'cultural enclave' },
  'Brooklyn': { studentMod: 1.1, adultMod: 1.0, seniorMod: 0.9, character: 'working class' },
  'Eastlake': { studentMod: 1.0, adultMod: 1.1, seniorMod: 0.9, character: 'lakeside mixed' },
  'Glenview': { studentMod: 1.2, adultMod: 1.0, seniorMod: 1.0, character: 'family suburban' },
  'Dimond': { studentMod: 1.1, adultMod: 1.0, seniorMod: 1.0, character: 'neighborhood village' },
  'Ivy Hill': { studentMod: 1.0, adultMod: 0.9, seniorMod: 1.3, character: 'quiet residential' },
  'San Antonio': { studentMod: 1.2, adultMod: 1.0, seniorMod: 0.9, character: 'diverse working' }
};


/**
 * Ensures Neighborhood_Demographics sheet exists with proper schema.
 * Append-only: never clears existing data, only adds missing headers at END.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @return {Sheet} The Neighborhood_Demographics sheet
 */
function ensureNeighborhoodDemographicsSchema_(ss) {
  var sheetName = 'Neighborhood_Demographics';
  var headers = NEIGHBORHOOD_DEMOGRAPHICS_HEADERS;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('ensureNeighborhoodDemographicsSchema_: Created new sheet with ' + headers.length + ' headers');
    return sheet;
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  // If header row is blank, initialize
  var hasAny = existing.some(function(h) { return (h || '').trim() !== ''; });
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  // Append missing headers at END only (never reorder)
  var missing = headers.filter(function(h) { return existing.indexOf(h) === -1; });
  if (missing.length > 0) {
    var startCol = existing.length + 1;
    sheet.insertColumnsAfter(existing.length, missing.length);
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    Logger.log('ensureNeighborhoodDemographicsSchema_: Appended ' + missing.length + ' missing headers at end');
  }

  return sheet;
}


/**
 * Gets demographics data for all neighborhoods.
 * Returns a map keyed by neighborhood name.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @return {Object} Map of neighborhood -> demographics object
 */
function getNeighborhoodDemographics_(ss) {
  var sheet = ss.getSheetByName('Neighborhood_Demographics');
  if (!sheet || sheet.getLastRow() < 2) {
    return {};
  }

  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var result = {};

  function idx(name) { return header.indexOf(name); }

  var iNeighborhood = idx('Neighborhood');
  var iStudents = idx('Students');
  var iAdults = idx('Adults');
  var iSeniors = idx('Seniors');
  var iUnemployed = idx('Unemployed');
  var iSick = idx('Sick');
  var iLastUpdated = idx('LastUpdated');

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var neighborhood = String(row[iNeighborhood] || '').trim();
    if (!neighborhood) continue;

    result[neighborhood] = {
      neighborhood: neighborhood,
      students: Number(row[iStudents]) || 0,
      adults: Number(row[iAdults]) || 0,
      seniors: Number(row[iSeniors]) || 0,
      unemployed: Number(row[iUnemployed]) || 0,
      sick: Number(row[iSick]) || 0,
      lastUpdated: Number(row[iLastUpdated]) || 0,
      totalPopulation: (Number(row[iStudents]) || 0) + (Number(row[iAdults]) || 0) + (Number(row[iSeniors]) || 0)
    };
  }

  return result;
}


/**
 * Gets demographics for a single neighborhood.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {string} neighborhood - The neighborhood name
 * @return {Object|null} Demographics object or null if not found
 */
function getNeighborhoodDemographic_(ss, neighborhood) {
  var all = getNeighborhoodDemographics_(ss);
  return all[neighborhood] || null;
}


/**
 * Updates demographics for a single neighborhood.
 * Creates the row if it doesn't exist.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {string} neighborhood - The neighborhood name
 * @param {Object} demographics - The demographics data
 * @param {number} cycle - The current cycle
 */
function updateNeighborhoodDemographics_(ss, neighborhood, demographics, cycle) {
  var sheet = ensureNeighborhoodDemographicsSchema_(ss);
  var values = sheet.getDataRange().getValues();
  var header = values[0];

  function idx(name) { return header.indexOf(name); }

  var iNeighborhood = idx('Neighborhood');
  var iStudents = idx('Students');
  var iAdults = idx('Adults');
  var iSeniors = idx('Seniors');
  var iUnemployed = idx('Unemployed');
  var iSick = idx('Sick');
  var iLastUpdated = idx('LastUpdated');

  // Find existing row
  var rowIndex = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][iNeighborhood]).trim().toLowerCase() === neighborhood.toLowerCase()) {
      rowIndex = r + 1; // 1-indexed for sheet
      break;
    }
  }

  var rowData = [];
  for (var c = 0; c < header.length; c++) {
    rowData.push('');
  }

  rowData[iNeighborhood] = neighborhood;
  rowData[iStudents] = demographics.students || 0;
  rowData[iAdults] = demographics.adults || 0;
  rowData[iSeniors] = demographics.seniors || 0;
  rowData[iUnemployed] = demographics.unemployed || 0;
  rowData[iSick] = demographics.sick || 0;
  rowData[iLastUpdated] = cycle;

  if (rowIndex > 0) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, header.length).setValues([rowData]);
  } else {
    // Append new row
    sheet.appendRow(rowData);
  }
}


/**
 * Batch updates demographics for multiple neighborhoods.
 * More efficient than individual updates.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {Object} demographicsMap - Map of neighborhood -> demographics
 * @param {number} cycle - The current cycle
 */
function batchUpdateNeighborhoodDemographics_(ss, demographicsMap, cycle) {
  var sheet = ensureNeighborhoodDemographicsSchema_(ss);
  var values = sheet.getDataRange().getValues();
  var header = values[0];

  function idx(name) { return header.indexOf(name); }

  var iNeighborhood = idx('Neighborhood');
  var iStudents = idx('Students');
  var iAdults = idx('Adults');
  var iSeniors = idx('Seniors');
  var iUnemployed = idx('Unemployed');
  var iSick = idx('Sick');
  var iLastUpdated = idx('LastUpdated');

  // Build index of existing rows
  var existingRows = {};
  for (var r = 1; r < values.length; r++) {
    var hood = String(values[r][iNeighborhood]).trim();
    if (hood) {
      existingRows[hood.toLowerCase()] = r;
    }
  }

  // Prepare output rows
  var outputRows = [];
  var newRows = [];

  // Process all neighborhoods
  for (var neighborhood in demographicsMap) {
    if (!demographicsMap.hasOwnProperty(neighborhood)) continue;

    var demo = demographicsMap[neighborhood];
    var rowData = [];
    for (var c = 0; c < header.length; c++) {
      rowData.push('');
    }

    rowData[iNeighborhood] = neighborhood;
    rowData[iStudents] = demo.students || 0;
    rowData[iAdults] = demo.adults || 0;
    rowData[iSeniors] = demo.seniors || 0;
    rowData[iUnemployed] = demo.unemployed || 0;
    rowData[iSick] = demo.sick || 0;
    rowData[iLastUpdated] = cycle;

    var existingRowIndex = existingRows[neighborhood.toLowerCase()];
    if (existingRowIndex !== undefined) {
      // Store for batch update
      outputRows.push({ rowIndex: existingRowIndex + 1, data: rowData });
    } else {
      // New neighborhood
      newRows.push(rowData);
    }
  }

  // Update existing rows
  for (var i = 0; i < outputRows.length; i++) {
    sheet.getRange(outputRows[i].rowIndex, 1, 1, header.length).setValues([outputRows[i].data]);
  }

  // Append new rows
  if (newRows.length > 0) {
    var appendStart = sheet.getLastRow() + 1;
    sheet.getRange(appendStart, 1, newRows.length, header.length).setValues(newRows);
  }

  Logger.log('batchUpdateNeighborhoodDemographics_: Updated ' + outputRows.length + ' rows, added ' + newRows.length + ' new rows');
}


/**
 * Seeds initial demographics from Simulation_Ledger citizen distribution.
 * Should only be called once to initialize the sheet.
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {number} cycle - The current cycle
 * @return {Object} The seeded demographics map
 */
function seedNeighborhoodDemographicsFromLedger_(ss, cycle) {
  var ledger = ss.getSheetByName('Simulation_Ledger');
  if (!ledger) {
    Logger.log('seedNeighborhoodDemographicsFromLedger_: No Simulation_Ledger found');
    return {};
  }

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('seedNeighborhoodDemographicsFromLedger_: Simulation_Ledger is empty');
    return {};
  }

  var header = values[0];
  function idx(name) { return header.indexOf(name); }

  var iNeighborhood = idx('Neighborhood');
  var iBirthYear = idx('BirthYear');
  var iAge = idx('Age');
  var iOccupation = idx('Occupation');
  var iStatus = idx('Status');

  // SimYear for age calculation (GodWorld uses 2041)
  var simYear = 2041;

  // Initialize demographics for all neighborhoods
  var demographics = {};
  for (var n = 0; n < OAKLAND_NEIGHBORHOODS.length; n++) {
    var hood = OAKLAND_NEIGHBORHOODS[n];
    demographics[hood] = {
      students: 0,
      adults: 0,
      seniors: 0,
      unemployed: 0,
      sick: 0
    };
  }

  // Count citizens by neighborhood
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var neighborhood = String(row[iNeighborhood] || '').trim();

    // Skip if neighborhood not in our list
    if (!demographics[neighborhood]) continue;

    // Determine age
    var age = 0;
    if (iBirthYear >= 0 && row[iBirthYear]) {
      age = simYear - Number(row[iBirthYear]);
    } else if (iAge >= 0 && row[iAge]) {
      age = Number(row[iAge]);
    }

    // Categorize by age group
    if (age >= 5 && age <= 22) {
      demographics[neighborhood].students++;
    } else if (age >= 23 && age <= 64) {
      demographics[neighborhood].adults++;
    } else if (age >= 65) {
      demographics[neighborhood].seniors++;
    }

    // Check employment status
    var occupation = String(row[iOccupation] || '').toLowerCase();
    var status = String(row[iStatus] || '').toLowerCase();
    if (occupation === 'unemployed' || occupation === 'seeking work' || status === 'unemployed') {
      demographics[neighborhood].unemployed++;
    }

    // Check health status
    if (status === 'sick' || status === 'ill' || status.indexOf('illness') >= 0) {
      demographics[neighborhood].sick++;
    }
  }

  // Apply neighborhood profiles to ensure realistic distribution
  // If a neighborhood has no citizens, seed with profile-weighted estimates
  var basePopulation = Math.floor(values.length / OAKLAND_NEIGHBORHOODS.length);
  if (basePopulation < 10) basePopulation = 50; // Minimum seed

  for (var hood in demographics) {
    if (!demographics.hasOwnProperty(hood)) continue;

    var demo = demographics[hood];
    var profile = NEIGHBORHOOD_PROFILES[hood] || { studentMod: 1, adultMod: 1, seniorMod: 1 };

    // If empty neighborhood, seed with weighted estimates
    if (demo.students + demo.adults + demo.seniors === 0) {
      demo.students = Math.round(basePopulation * 0.2 * profile.studentMod);
      demo.adults = Math.round(basePopulation * 0.6 * profile.adultMod);
      demo.seniors = Math.round(basePopulation * 0.2 * profile.seniorMod);
      demo.unemployed = Math.round((demo.students + demo.adults + demo.seniors) * 0.08);
      demo.sick = Math.round((demo.students + demo.adults + demo.seniors) * 0.05);
    }
  }

  // Write to sheet
  batchUpdateNeighborhoodDemographics_(ss, demographics, cycle);

  Logger.log('seedNeighborhoodDemographicsFromLedger_: Seeded ' + OAKLAND_NEIGHBORHOODS.length + ' neighborhoods');

  return demographics;
}


/**
 * Calculates demographic shift between two snapshots.
 * Used for story signal generation.
 *
 * @param {Object} previous - Previous demographics (neighborhood -> data)
 * @param {Object} current - Current demographics (neighborhood -> data)
 * @return {Array} Array of significant shifts
 */
function calculateDemographicShifts_(previous, current) {
  var shifts = [];
  var SIGNIFICANT_THRESHOLD = 0.05; // 5% change is significant

  for (var neighborhood in current) {
    if (!current.hasOwnProperty(neighborhood)) continue;

    var prev = previous[neighborhood];
    var curr = current[neighborhood];

    if (!prev) {
      // New neighborhood
      shifts.push({
        neighborhood: neighborhood,
        type: 'new_tracking',
        description: neighborhood + ' now being tracked for demographics'
      });
      continue;
    }

    var prevTotal = prev.students + prev.adults + prev.seniors;
    var currTotal = curr.students + curr.adults + curr.seniors;

    if (prevTotal === 0) continue;

    // Check each demographic category
    var categories = [
      { key: 'students', label: 'student population' },
      { key: 'adults', label: 'working-age population' },
      { key: 'seniors', label: 'senior population' },
      { key: 'unemployed', label: 'unemployment' },
      { key: 'sick', label: 'illness rate' }
    ];

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var prevVal = prev[cat.key] || 0;
      var currVal = curr[cat.key] || 0;

      if (prevVal === 0) continue;

      var change = (currVal - prevVal) / prevVal;

      if (Math.abs(change) >= SIGNIFICANT_THRESHOLD) {
        var direction = change > 0 ? 'up' : 'down';
        var percentage = Math.round(Math.abs(change) * 100);

        shifts.push({
          neighborhood: neighborhood,
          type: cat.key + '_shift',
          direction: direction,
          percentage: percentage,
          description: neighborhood + ' ' + cat.label + ' ' + direction + ' ' + percentage + '%',
          category: cat.key,
          previousValue: prevVal,
          currentValue: currVal
        });
      }
    }

    // Check for overall population shifts
    var totalChange = (currTotal - prevTotal) / prevTotal;
    if (Math.abs(totalChange) >= SIGNIFICANT_THRESHOLD) {
      var direction = totalChange > 0 ? 'growth' : 'decline';
      var percentage = Math.round(Math.abs(totalChange) * 100);

      shifts.push({
        neighborhood: neighborhood,
        type: 'population_shift',
        direction: direction,
        percentage: percentage,
        description: neighborhood + ' seeing ' + percentage + '% population ' + direction
      });
    }
  }

  return shifts;
}


/**
 * Gets neighborhood weighting for citizen placement based on demographics.
 * Used by Phase 5 citizen generation.
 *
 * @param {Object} demographics - Demographics map from getNeighborhoodDemographics_
 * @param {string} citizenType - Type of citizen: 'young_professional', 'family', 'senior', 'student'
 * @return {Object} Weighted neighborhood map
 */
function getDemographicWeightedNeighborhoods_(demographics, citizenType) {
  var weights = {};
  var totalWeight = 0;

  for (var hood in NEIGHBORHOOD_PROFILES) {
    if (!NEIGHBORHOOD_PROFILES.hasOwnProperty(hood)) continue;

    var profile = NEIGHBORHOOD_PROFILES[hood];
    var demo = demographics[hood] || {};
    var weight = 1.0;

    // Apply citizen type preferences
    switch (citizenType) {
      case 'young_professional':
        weight = profile.adultMod * 1.2;
        // Prefer neighborhoods with existing young adult population
        if (demo.adults > demo.seniors) weight *= 1.1;
        break;

      case 'family':
        weight = (profile.studentMod + profile.adultMod) / 2;
        // Prefer neighborhoods with existing families (students indicate children)
        if (demo.students > 0) weight *= 1.1;
        break;

      case 'senior':
        weight = profile.seniorMod * 1.3;
        // Prefer neighborhoods with existing senior population
        if (demo.seniors > demo.students) weight *= 1.1;
        break;

      case 'student':
        weight = profile.studentMod * 1.2;
        // Prefer neighborhoods with existing student population
        if (demo.students > 0) weight *= 1.1;
        break;

      default:
        weight = (profile.studentMod + profile.adultMod + profile.seniorMod) / 3;
    }

    // Avoid neighborhoods with high unemployment/sickness
    var total = (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
    if (total > 0) {
      var unemploymentRate = (demo.unemployed || 0) / total;
      var sicknessRate = (demo.sick || 0) / total;

      if (unemploymentRate > 0.15) weight *= 0.8;
      if (sicknessRate > 0.10) weight *= 0.9;
    }

    weights[hood] = weight;
    totalWeight += weight;
  }

  // Normalize weights
  if (totalWeight > 0) {
    for (var hood in weights) {
      if (weights.hasOwnProperty(hood)) {
        weights[hood] = weights[hood] / totalWeight;
      }
    }
  }

  return weights;
}


/**
 * ============================================================================
 * REFERENCE
 * ============================================================================
 *
 * SCHEMA:
 * | Column | Type | Description |
 * |--------|------|-------------|
 * | Neighborhood | string | e.g., "TEMESCAL", "WEST_OAKLAND" |
 * | Students | int | School-age (5-22) |
 * | Adults | int | Working-age (23-64) |
 * | Seniors | int | 65+ |
 * | Unemployed | int | Currently not working |
 * | Sick | int | Currently ill |
 * | LastUpdated | int | Cycle last recalculated |
 *
 * NEIGHBORHOOD PROFILES:
 * - Downtown: urban core, high adult population
 * - Temescal: young professional, creative
 * - Laurel: family oriented
 * - West Oakland: evolving industrial
 * - Fruitvale: multigenerational, cultural
 * - Jack London: nightlife district, young adults
 * - Rockridge: established affluent, senior-heavy
 * - Adams Point: lakeside residential
 * - Grand Lake: theater district, balanced
 * - Piedmont Ave: upscale residential, older
 * - Chinatown: cultural enclave, multigenerational
 * - Brooklyn: working class
 * - Eastlake: lakeside mixed
 * - Glenview: family suburban
 * - Dimond: neighborhood village
 * - Ivy Hill: quiet residential, older
 * - San Antonio: diverse working
 *
 * ============================================================================
 */
