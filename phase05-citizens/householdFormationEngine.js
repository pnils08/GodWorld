/**
 * ============================================================================
 * HOUSEHOLD FORMATION ENGINE v1.2
 * ============================================================================
 *
 * v1.2 Phase 42 §5.6 alignment (S200):
 * - Simulation_Ledger reads/writes route through shared ctx.ledger
 *   (read-staleness + write-clobber bugs caught by S200 cohort-C audit;
 *   S185 §5.6.6 audit had cleared this engine as orphan, missed because
 *   the audit grepped file names instead of the exposed process*_ entry).
 * - Household_Ledger + Family_Relationships writes remain direct: those
 *   are own-tracking sheets, exempt per engine.md, and GenerationalWealth's
 *   updateHouseholdWealth_ still reads Household_Ledger inline.
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
 * - Updates Simulation_Ledger HouseholdId via ctx.ledger.rows (Phase 10 commit)
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
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('processHouseholdFormation_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount;
  var S = ctx.summary;
  var rng = safeRand_(ctx);

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
    var citizens = loadCitizens_(ctx);
    if (citizens.length === 0) {
      return results;
    }

    results.processed = citizens.length;

    // Load existing households
    var households = loadHouseholds_(ss);

    // Form new households
    var newHouseholds = formNewHouseholds_(ctx, citizens, households, cycle, rng);
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
    updateHouseholdIncomes_(ctx, households, citizens);

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

function loadCitizens_(ctx) {
  // Phase 42 §5.6: read from shared ctx.ledger; rowIndex maps to sheet row
  // (ctx.ledger.rows[0] = sheet row 2, so rowIndex = i + 2 in body-row space).
  var headers = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return [];

  var iPopId = headers.indexOf('POPID');
  var iFirst = headers.indexOf('First');
  var iLast = headers.indexOf('Last');
  var iStatus = headers.indexOf('Status');
  var iBirthYear = headers.indexOf('BirthYear');
  var iNeighborhood = headers.indexOf('Neighborhood');
  var iHouseholdId = headers.indexOf('HouseholdId');
  var iMaritalStatus = headers.indexOf('MaritalStatus');
  var iNumChildren = headers.indexOf('NumChildren');
  var iParentIds = headers.indexOf('ParentIds');
  var iChildrenIds = headers.indexOf('ChildrenIds');

  var citizens = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    var citizen = {
      rowIndex: i + 2,  // sheet-row-1-indexed (body row i → sheet row i+2)
      ledgerIndex: i,    // 0-indexed into ctx.ledger.rows (for direct mutation)
      popId: row[iPopId] || '',
      first: row[iFirst] || '',
      last: row[iLast] || '',
      status: row[iStatus] || 'active',
      birthYear: row[iBirthYear] || 2000,
      neighborhood: row[iNeighborhood] || '',
      householdId: row[iHouseholdId] || '',
      maritalStatus: row[iMaritalStatus] || 'single',
      numChildren: row[iNumChildren] || 0,
      parentIds: parseJSON(row[iParentIds], []),
      childrenIds: parseJSON(row[iChildrenIds], [])
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

// parseJSON_ helper deleted S199 (Phase B.4 collision dedup) — identical impl
// lives in phase07-evening-media/storylineWeavingEngine.js, resolved via flat
// namespace. Internal callers in this file use the global def.


// ════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD FORMATION
// ════════════════════════════════════════════════════════════════════════════

function formNewHouseholds_(ctx, citizens, existingHouseholds, cycle, rng) {
  var ss = ctx.ss;
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

  // Form single households. Household_Ledger writes stay direct (own tracking
  // sheet, exempt per engine.md); SL HouseholdId mutation routes through
  // ctx.ledger per Phase 42 §5.6.
  var householdSheet = ss.getSheetByName('Household_Ledger');
  var iLedgerHouseholdId = ctx.ledger.headers.indexOf('HouseholdId');

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

    // Append to Household_Ledger (own tracking sheet — stays direct)
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

    // Mutate citizen's HouseholdId in shared ctx.ledger; Phase 10 commits.
    if (iLedgerHouseholdId >= 0 && citizen.ledgerIndex !== undefined) {
      ctx.ledger.rows[citizen.ledgerIndex][iLedgerHouseholdId] = householdId;
      ctx.ledger.dirty = true;
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

function updateHouseholdIncomes_(ctx, households, citizens) {
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var incomeCol = headers.indexOf('HouseholdIncome') + 1;

  if (incomeCol === 0) return;

  // Build income lookup from ctx.ledger (Phase 42 §5.6 — sees in-memory
  // Income mutations from cohort-A run*Engine writers earlier in Phase 5).
  var citizenIncomes = buildCitizenIncomeLookup_(ctx);

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

function buildCitizenIncomeLookup_(ctx) {
  // Phase 42 §5.6: read from shared ctx.ledger; cohort-A income mutations
  // (runCareerEngine, runEducationEngine etc.) live in ctx.ledger.rows by
  // the time this runs in Phase 5.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return null;

  var popIdCol = header.indexOf('POPID');
  var incomeCol = header.indexOf('Income');

  if (popIdCol < 0 || incomeCol < 0) return null;

  var lookup = {};
  for (var r = 0; r < rows.length; r++) {
    var popId = rows[r][popIdCol];
    var income = Number(rows[r][incomeCol]) || 0;
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
  if (typeof rng !== 'function') throw new Error('householdFormationEngine.dissolveStressedHouseholds_: rng parameter required (Phase 40.3 Path 1)');
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
