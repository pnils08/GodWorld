/**
 * ============================================================================
 * HOUSEHOLD FORMATION ENGINE v1.1
 * ============================================================================
 *
 * v1.1 Fixes:
 * - FIX: Math.random() → ctx.rng for deterministic cycles
 * - FIX: currentYear 2024 → 2041 (simulation year)
 *
 * Manages household lifecycle: formation, dissolution, births, marriages, income.
 *
 * Part of: Week 1 Household Formation & Family Trees
 *
 * Features:
 * - Household formation (young adults, couples, births)
 * - Household dissolution (death, divorce, economic hardship)
 * - Household income aggregation
 * - Household stress detection (rent burden, overcrowding)
 * - Birth generation
 * - Marriage/divorce tracking
 *
 * Integration:
 * - Called from Phase 05 after citizen events
 * - Requires Household_Ledger and Family_Relationships sheets
 * - Updates Simulation_Ledger with household linkage
 *
 * DIRECT WRITES (intentional — NOT legacy):
 * This engine uses direct setValue/appendRow instead of write-intents because
 * GenerationalWealth (next in Phase 5 sequence) reads Household_Ledger
 * immediately after this engine runs. Deferring writes to Phase 10 would
 * cause GenWealth to miss newly formed households.
 * Execution order: HouseholdFormation → GenerationalWealth → EducationCareer
 * (see godWorldEngine2.js lines 210-212)
 *
 * Story Hooks Generated:
 * - HOUSEHOLD_FORMED (severity 2): New household established
 * - HOUSEHOLD_DISSOLVED (severity 3): Household breakup
 * - MULTIGENERATIONAL_HOUSEHOLD (severity 4): Extended family together
 * - RENT_BURDEN_CRISIS (severity 6): Rent >50% income
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var HOUSEHOLD_TYPES = {
  SINGLE: 'single',
  COUPLE: 'couple',
  FAMILY: 'family',
  MULTIGENERATIONAL: 'multigenerational',
  ROOMMATES: 'roommates'
};

var HOUSING_TYPES = {
  OWNED: 'owned',
  RENTED: 'rented',
  SUBSIDIZED: 'subsidized'
};

var MARITAL_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  PARTNERED: 'partnered',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed'
};

var RELATIONSHIP_TYPES = {
  PARENT_CHILD: 'parent-child',
  SPOUSE: 'spouse',
  SIBLING: 'sibling',
  GRANDPARENT_GRANDCHILD: 'grandparent-grandchild'
};

// Income thresholds for household formation
var MIN_INCOME_SINGLE_HOUSEHOLD = 30000;  // $30k to afford own place
var MIN_INCOME_COUPLE_HOUSEHOLD = 40000;  // $40k combined

// Rent burden thresholds
var RENT_BURDEN_WARNING = 0.40;  // 40% of income
var RENT_BURDEN_CRISIS = 0.50;   // 50% of income

// Age ranges
var YOUNG_ADULT_MIN_AGE = 22;
var YOUNG_ADULT_MAX_AGE = 28;
var MARRIAGE_MIN_AGE = 25;
var MARRIAGE_MAX_AGE = 45;
var BIRTH_MIN_PARENT_AGE = 20;
var BIRTH_MAX_PARENT_AGE = 45;


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Process household formation and lifecycle for current cycle.
 *
 * @param {Object} ctx - Cycle context
 * @returns {Object} - Processing results
 */
function processHouseholdFormation_(ctx) {
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount;
  var S = ctx.summary;
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  var results = {
    processed: 0,
    householdsFormed: 0,
    householdsDissolved: 0,
    births: 0,
    marriages: 0,
    divorces: 0,
    rentBurdenCrisis: 0,
    errors: []
  };

  try {
    // Verify required sheets exist
    var householdSheet = ss.getSheetByName('Household_Ledger');
    var familySheet = ss.getSheetByName('Family_Relationships');

    if (!householdSheet) {
      results.errors.push('Household_Ledger sheet not found. Run migration first.');
      return results;
    }
    if (!familySheet) {
      results.errors.push('Family_Relationships sheet not found. Run migration first.');
      return results;
    }

    // Load citizen data
    var citizens = loadCitizens_(ss);
    if (citizens.length === 0) {
      return results;
    }

    results.processed = citizens.length;

    // Load existing households
    var households = loadHouseholds_(ss);

    // Form new households
    var newHouseholds = formNewHouseholds_(ss, citizens, households, cycle, rng);
    results.householdsFormed = newHouseholds.length;

    // Process births
    var births = generateBirths_(ss, citizens, households, cycle);
    results.births = births.length;

    // Process marriages
    var marriages = processMarriages_(ss, citizens, cycle);
    results.marriages = marriages.length;

    // Process divorces
    var divorces = processDivorces_(ss, citizens, households, cycle);
    results.divorces = divorces.length;

    // Update household incomes
    updateHouseholdIncomes_(ss, households, citizens);

    // Detect household stress
    var stressedHouseholds = detectHouseholdStress_(ss, households);
    results.rentBurdenCrisis = stressedHouseholds.filter(h => h.rentBurden >= RENT_BURDEN_CRISIS).length;

    // Dissolve stressed households
    var dissolved = dissolveStressedHouseholds_(ss, stressedHouseholds, cycle, rng);
    results.householdsDissolved = dissolved.length;

    // Generate story hooks
    var hooks = [];

    for (var i = 0; i < newHouseholds.length; i++) {
      hooks.push(generateHouseholdFormedHook_(newHouseholds[i]));
    }

    for (var i = 0; i < dissolved.length; i++) {
      hooks.push(generateHouseholdDissolvedHook_(dissolved[i]));
    }

    for (var i = 0; i < stressedHouseholds.length; i++) {
      if (stressedHouseholds[i].rentBurden >= RENT_BURDEN_CRISIS) {
        hooks.push(generateRentBurdenHook_(stressedHouseholds[i]));
      }
    }

    // Add hooks to context
    if (!S.storyHooks) S.storyHooks = [];
    S.storyHooks = S.storyHooks.concat(hooks);

    // Save results to context
    S.householdFormation = results;

  } catch (err) {
    results.errors.push(err.toString());
    Logger.log('processHouseholdFormation_ ERROR: ' + err);
  }

  Logger.log('processHouseholdFormation_ v1.0: Complete.');
  Logger.log('Processed: ' + results.processed + ', Formed: ' + results.householdsFormed +
             ', Dissolved: ' + results.householdsDissolved + ', Births: ' + results.births);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadCitizens_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var citizens = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var citizen = {
      rowIndex: i + 1,
      popId: row[headers.indexOf('POPID')] || '',
      first: row[headers.indexOf('First')] || '',
      last: row[headers.indexOf('Last')] || '',
      status: row[headers.indexOf('Status')] || 'active',
      birthYear: row[headers.indexOf('BirthYear')] || 2000,
      neighborhood: row[headers.indexOf('Neighborhood')] || '',
      householdId: row[headers.indexOf('HouseholdId')] || '',
      maritalStatus: row[headers.indexOf('MaritalStatus')] || 'single',
      numChildren: row[headers.indexOf('NumChildren')] || 0,
      parentIds: parseJSON(row[headers.indexOf('ParentIds')], []),
      childrenIds: parseJSON(row[headers.indexOf('ChildrenIds')], [])
    };

    // Only process active citizens
    if (citizen.status === 'active') {
      citizens.push(citizen);
    }
  }

  return citizens;
}

function loadHouseholds_(ss) {
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var households = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var household = {
      rowIndex: i + 1,
      householdId: row[headers.indexOf('HouseholdId')] || '',
      headOfHousehold: row[headers.indexOf('HeadOfHousehold')] || '',
      householdType: row[headers.indexOf('HouseholdType')] || '',
      members: parseJSON(row[headers.indexOf('Members')], []),
      neighborhood: row[headers.indexOf('Neighborhood')] || '',
      housingType: row[headers.indexOf('HousingType')] || '',
      monthlyRent: parseFloat(row[headers.indexOf('MonthlyRent')] || 0),
      housingCost: parseFloat(row[headers.indexOf('HousingCost')] || 0),
      householdIncome: parseFloat(row[headers.indexOf('HouseholdIncome')] || 0),
      formedCycle: row[headers.indexOf('FormedCycle')] || '',
      status: row[headers.indexOf('Status')] || 'active'
    };

    // Only process active households
    if (household.status === 'active') {
      households.push(household);
    }
  }

  return households;
}

function parseJSON(value, defaultValue) {
  if (!value || value === '') return defaultValue;
  try {
    return JSON.parse(value);
  } catch (err) {
    return defaultValue;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD FORMATION
// ════════════════════════════════════════════════════════════════════════════

function formNewHouseholds_(ss, citizens, existingHouseholds, cycle, rng) {
  var newHouseholds = [];
  var currentYear = 2041;  // Simulation year — aligned with roster intake

  // Find young adults without households
  var eligibleSingles = [];

  for (var i = 0; i < citizens.length; i++) {
    var citizen = citizens[i];
    var age = currentYear - citizen.birthYear;

    // Eligible if: young adult age range, no household, single status
    if (age >= YOUNG_ADULT_MIN_AGE && age <= YOUNG_ADULT_MAX_AGE &&
        !citizen.householdId &&
        citizen.maritalStatus === 'single') {

      // Check if they have minimum income (would need income column)
      // For now, random chance
      if (rng() < 0.15) {  // 15% chance per cycle
        eligibleSingles.push(citizen);
      }
    }
  }

  // Form single households
  var householdSheet = ss.getSheetByName('Household_Ledger');
  var simSheet = ss.getSheetByName('Simulation_Ledger');

  for (var i = 0; i < eligibleSingles.length && i < 3; i++) {  // Limit to 3 per cycle
    var citizen = eligibleSingles[i];

    // Generate household ID
    var householdId = 'HH-' + String(cycle).padStart(4, '0') + '-' + String(i + 1).padStart(3, '0');

    // Estimate rent based on neighborhood (simplified)
    var monthlyRent = estimateRent_(citizen.neighborhood);

    var household = {
      householdId: householdId,
      headOfHousehold: citizen.popId,
      householdType: HOUSEHOLD_TYPES.SINGLE,
      members: [citizen.popId],
      neighborhood: citizen.neighborhood,
      housingType: HOUSING_TYPES.RENTED,
      monthlyRent: monthlyRent,
      housingCost: 0,
      householdIncome: 0,  // Will be calculated
      formedCycle: cycle,
      dissolvedCycle: '',
      status: 'active',
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // Append to Household_Ledger
    householdSheet.appendRow([
      household.householdId,
      household.headOfHousehold,
      household.householdType,
      JSON.stringify(household.members),
      household.neighborhood,
      household.housingType,
      household.monthlyRent,
      household.housingCost,
      household.householdIncome,
      household.formedCycle,
      household.dissolvedCycle,
      household.status,
      household.createdAt,
      household.lastUpdated
    ]);

    // Update citizen's HouseholdId in Simulation_Ledger
    var headers = simSheet.getRange(1, 1, 1, simSheet.getLastColumn()).getValues()[0];
    var householdIdCol = headers.indexOf('HouseholdId') + 1;
    if (householdIdCol > 0) {
      simSheet.getRange(citizen.rowIndex, householdIdCol).setValue(householdId);
    }

    newHouseholds.push(household);
  }

  return newHouseholds;
}

function estimateRent_(neighborhood) {
  // Simplified rent estimates by neighborhood
  var rentMap = {
    'Rockridge': 2400,
    'Piedmont Ave': 2200,
    'Lake Merritt': 2000,
    'Temescal': 1900,
    'Uptown': 1850,
    'Downtown': 1800,
    'Jack London': 1750,
    'KONO': 1700,
    'Laurel': 1650,
    'Fruitvale': 1500,
    'West Oakland': 1450,
    'Chinatown': 1600
  };

  return rentMap[neighborhood] || 1700;  // Default $1,700
}


// ════════════════════════════════════════════════════════════════════════════
// BIRTHS, MARRIAGES, DIVORCES
// ════════════════════════════════════════════════════════════════════════════

function generateBirths_(ss, citizens, households, cycle) {
  var births = [];
  // TODO: Implement birth generation
  // - Find married couples in childbearing age
  // - Random chance of birth
  // - Create new citizen entry
  // - Add parent-child relationship
  // - Update NumChildren
  return births;
}

function processMarriages_(ss, citizens, cycle) {
  var marriages = [];
  // TODO: Implement marriage mechanics
  // - Find eligible singles
  // - Form marriage bond
  // - Update MaritalStatus
  // - Combine households if separate
  return marriages;
}

function processDivorces_(ss, citizens, households, cycle) {
  var divorces = [];
  // TODO: Implement divorce mechanics
  // - Random chance for married couples
  // - Higher chance if economic stress
  // - Split household
  // - Update MaritalStatus to divorced
  return divorces;
}


// ════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD INCOME & STRESS
// ════════════════════════════════════════════════════════════════════════════

function updateHouseholdIncomes_(ss, households, citizens) {
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var incomeCol = headers.indexOf('HouseholdIncome') + 1;

  if (incomeCol === 0) return;

  // Build income lookup from citizens (if Income column exists)
  var citizenIncomes = buildCitizenIncomeLookup_(ss);

  for (var i = 0; i < households.length; i++) {
    var household = households[i];
    var totalIncome = 0;

    // Sum income of all members from real data
    if (citizenIncomes && household.members) {
      try {
        var members = JSON.parse(household.members);
        for (var m = 0; m < members.length; m++) {
          totalIncome += citizenIncomes[members[m]] || 0;
        }
      } catch (e) {
        // If Income column doesn't exist yet, fall back to estimates
        if (household.householdType === HOUSEHOLD_TYPES.SINGLE) {
          totalIncome = 50000;
        } else if (household.householdType === HOUSEHOLD_TYPES.COUPLE) {
          totalIncome = 85000;
        } else if (household.householdType === HOUSEHOLD_TYPES.FAMILY) {
          totalIncome = 95000;
        }
      }
    } else {
      // Fallback estimates if no income data available
      if (household.householdType === HOUSEHOLD_TYPES.SINGLE) {
        totalIncome = 50000;
      } else if (household.householdType === HOUSEHOLD_TYPES.COUPLE) {
        totalIncome = 85000;
      } else if (household.householdType === HOUSEHOLD_TYPES.FAMILY) {
        totalIncome = 95000;
      }
    }

    // Update sheet
    sheet.getRange(household.rowIndex, incomeCol).setValue(totalIncome);
    household.householdIncome = totalIncome;
  }
}

function buildCitizenIncomeLookup_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  var header = values[0];
  var popIdCol = header.indexOf('POPID');
  var incomeCol = header.indexOf('Income');

  if (popIdCol < 0 || incomeCol < 0) return null;

  var lookup = {};
  for (var r = 1; r < values.length; r++) {
    var popId = values[r][popIdCol];
    var income = Number(values[r][incomeCol]) || 0;
    lookup[popId] = income;
  }

  return lookup;
}

function detectHouseholdStress_(ss, households) {
  var stressed = [];

  for (var i = 0; i < households.length; i++) {
    var household = households[i];

    if (household.householdIncome === 0) continue;

    // Calculate rent burden
    var monthlyCost = household.housingType === HOUSING_TYPES.RENTED ?
                      household.monthlyRent : household.housingCost;
    var annualCost = monthlyCost * 12;
    var rentBurden = annualCost / household.householdIncome;

    if (rentBurden >= RENT_BURDEN_WARNING) {
      stressed.push({
        household: household,
        rentBurden: rentBurden,
        severity: rentBurden >= RENT_BURDEN_CRISIS ? 'crisis' : 'warning'
      });
    }
  }

  return stressed;
}

function dissolveStressedHouseholds_(ss, stressedHouseholds, cycle, rng) {
  rng = rng || Math.random;
  var dissolved = [];

  // Only dissolve households in crisis with random chance
  for (var i = 0; i < stressedHouseholds.length; i++) {
    var stressed = stressedHouseholds[i];

    if (stressed.severity === 'crisis' && rng() < 0.10) {  // 10% chance
      dissolved.push(stressed.household);

      // Mark household as dissolved
      var sheet = ss.getSheetByName('Household_Ledger');
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var statusCol = headers.indexOf('Status') + 1;
      var dissolvedCol = headers.indexOf('DissolvedCycle') + 1;

      if (statusCol > 0) {
        sheet.getRange(stressed.household.rowIndex, statusCol).setValue('dissolved');
      }
      if (dissolvedCol > 0) {
        sheet.getRange(stressed.household.rowIndex, dissolvedCol).setValue(cycle);
      }
    }
  }

  return dissolved;
}


// ════════════════════════════════════════════════════════════════════════════
// STORY HOOKS
// ════════════════════════════════════════════════════════════════════════════

function generateHouseholdFormedHook_(household) {
  return {
    hookType: 'HOUSEHOLD_FORMED',
    householdId: household.householdId,
    householdType: household.householdType,
    neighborhood: household.neighborhood,
    severity: 2,
    description: 'New ' + household.householdType + ' household formed in ' + household.neighborhood
  };
}

function generateHouseholdDissolvedHook_(household) {
  return {
    hookType: 'HOUSEHOLD_DISSOLVED',
    householdId: household.householdId,
    householdType: household.householdType,
    neighborhood: household.neighborhood,
    severity: 3,
    description: 'Household dissolved in ' + household.neighborhood + ' due to economic hardship'
  };
}

function generateRentBurdenHook_(stressed) {
  var household = stressed.household;
  var burden = Math.round(stressed.rentBurden * 100);

  return {
    hookType: 'RENT_BURDEN_CRISIS',
    householdId: household.householdId,
    neighborhood: household.neighborhood,
    rentBurden: burden,
    severity: 6,
    description: 'Household in ' + household.neighborhood + ' spending ' + burden + '% of income on housing'
  };
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Main function for external calls
