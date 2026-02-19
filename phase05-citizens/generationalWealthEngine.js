/**
 * ============================================================================
 * GENERATIONAL WEALTH ENGINE v1.0
 * ============================================================================
 *
 * Tracks wealth accumulation, inheritance, and economic mobility.
 *
 * Part of: Week 2 Generational Wealth & Inheritance
 *
 * Features:
 * - Income calculation from career data
 * - Wealth level tracking (0-10 scale)
 * - Inheritance mechanics (wealth transfer on death)
 * - Wealth mobility detection (upward/downward movement)
 * - Home ownership tracking
 * - Savings & debt management
 *
 * Integration:
 * - Reads career data from runCareerEngine.js (incomeBand)
 * - Hooks into generationalEventsEngine.js death events
 * - Updates householdFormationEngine.js with real income
 *
 * DIRECT WRITES (intentional — NOT legacy):
 * This engine uses direct setValues instead of write-intents because:
 * 1. It reads Household_Ledger data written by HouseholdFormation (prior engine)
 * 2. EducationCareer (next engine) reads Income data written here
 * Deferring writes to Phase 10 would break the Phase 5 data chain.
 * Execution order: HouseholdFormation → GenerationalWealth → EducationCareer
 * (see godWorldEngine2.js lines 210-212)
 *
 * Story Hooks:
 * - GENERATIONAL_WEALTH_TRANSFER (severity 5): Large inheritance received
 * - WEALTH_GAP_WIDENING (severity 7): Neighborhood wealth disparity
 * - DOWNWARD_MOBILITY (severity 6): Citizen drops 3+ wealth levels
 * - HOME_OWNERSHIP_ACHIEVED (severity 4): First-time homebuyer
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// Income bands mapped to dollar amounts (annual)
var INCOME_BY_BAND = {
  'low': 35000,
  'mid': 62000,
  'high': 110000
};

// Wealth level thresholds (based on income + assets)
var WEALTH_THRESHOLDS = {
  POVERTY: 0,       // <$30k income
  LOW: 2,           // $30k-$45k
  WORKING: 4,       // $45k-$60k
  MIDDLE: 5,        // $60k-$85k
  UPPER_MIDDLE: 7,  // $85k-$120k
  WEALTHY: 9,       // $120k+
  ELITE: 10         // $200k+ or significant assets
};

// Home ownership thresholds by neighborhood (median home prices)
var HOME_PRICES_BY_NEIGHBORHOOD = {
  'Rockridge': 950000,
  'Piedmont Ave': 850000,
  'Grand Lake': 780000,
  'Temescal': 720000,
  'Lake Merritt': 680000,
  'Adams Point': 650000,
  'Downtown': 620000,
  'Uptown': 580000,
  'Jack London': 560000,
  'Laurel': 520000,
  'Chinatown': 480000,
  'Fruitvale': 450000,
  'West Oakland': 430000,
  'Brooklyn': 410000,
  'Eastlake': 400000
};

// Savings rate by wealth level
var SAVINGS_RATE_BY_WEALTH = {
  0: 0.00,   // No savings capacity
  1: 0.01,
  2: 0.02,
  3: 0.03,
  4: 0.05,
  5: 0.08,
  6: 0.10,
  7: 0.12,
  8: 0.15,
  9: 0.18,
  10: 0.20
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════════════

function processGenerationalWealth_(ctx) {
  var ss = ctx.ss;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processGenerationalWealth_ v1.0: Starting...');

  var results = {
    processed: 0,
    wealthUpdated: 0,
    inheritanceProcessed: 0,
    mobilityDetected: 0,
    homesPurchased: 0
  };

  // Step 1: Calculate citizen income from career data
  var incomeResults = calculateCitizenIncomes_(ss);
  results.incomeUpdated = incomeResults.updated;

  // Step 2: Calculate wealth levels from income + assets
  var wealthResults = calculateCitizenWealth_(ss);
  results.wealthUpdated = wealthResults.updated;

  // Step 3: Process inheritance for recent deaths
  var inheritanceResults = processInheritance_(ss, ctx, cycle);
  results.inheritanceProcessed = inheritanceResults.processed;

  // Step 4: Update household wealth aggregates
  var householdResults = updateHouseholdWealth_(ss);
  results.householdsUpdated = householdResults.updated;

  // Step 5: Track wealth mobility (upward/downward)
  var mobilityResults = trackWealthMobility_(ss, ctx, cycle);
  results.mobilityDetected = mobilityResults.events;

  // Step 6: Home ownership opportunities
  var homeResults = trackHomeOwnership_(ss, ctx, cycle);
  results.homesPurchased = homeResults.purchased;

  Logger.log(
    'processGenerationalWealth_ v1.0: Complete. ' +
    'Income: ' + results.incomeUpdated + ', ' +
    'Wealth: ' + results.wealthUpdated + ', ' +
    'Inheritance: ' + results.inheritanceProcessed + ', ' +
    'Mobility: ' + results.mobilityDetected + ', ' +
    'Homes: ' + results.homesPurchased
  );

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// INCOME CALCULATION
// ════════════════════════════════════════════════════════════════════════════

function calculateCitizenIncomes_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { updated: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { updated: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iIncome = idx('Income');
  var iLife = idx('LifeHistory');
  var iStatus = idx('Status');
  var iTier = idx('Tier');

  if (iIncome < 0 || iLife < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased' || status === 'inactive') continue;

    var lifeHistory = row[iLife] ? row[iLife].toString() : '';
    var tier = Number(row[iTier]) || 5;

    // Extract incomeBand from most recent CareerState
    var incomeBand = extractIncomeBand_(lifeHistory);

    // Convert to dollar amount
    var income = calculateIncomeFromBand_(incomeBand, tier);

    row[iIncome] = income;
    updated++;
  }

  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { updated: updated };
}

function extractIncomeBand_(lifeHistory) {
  if (!lifeHistory) return 'low';

  // Find most recent CareerState line
  var lines = lifeHistory.split('\n');
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i];
    if (line.indexOf('[CareerState]') >= 0) {
      // Parse: [CareerState] industry=tech|employer=startup|income=high|level=3...
      var match = line.match(/income=([a-z]+)/i);
      if (match) return match[1].toLowerCase();
    }
  }

  return 'low'; // Default
}

function calculateIncomeFromBand_(incomeBand, tier) {
  var rng = Math.random; // centralization prep — no ctx in scope
  var baseIncome = INCOME_BY_BAND[incomeBand] || INCOME_BY_BAND['low'];

  // Tier modifiers (higher tier = higher income within band)
  var tierMod = 1.0;
  if (tier === 1) tierMod = 1.3;  // Elite tier
  else if (tier === 2) tierMod = 1.15;
  else if (tier === 3) tierMod = 1.0;
  else if (tier === 4) tierMod = 0.9;
  else tierMod = 0.8;

  // Add randomness (+/- 10%)
  var variance = 0.9 + (rng() * 0.2);

  return Math.round(baseIncome * tierMod * variance);
}


// ════════════════════════════════════════════════════════════════════════════
// WEALTH CALCULATION
// ════════════════════════════════════════════════════════════════════════════

function calculateCitizenWealth_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { updated: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { updated: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iWealth = idx('WealthLevel');
  var iIncome = idx('Income');
  var iInheritance = idx('InheritanceReceived');
  var iNetWorth = idx('NetWorth');
  var iStatus = idx('Status');
  var iSavings = idx('SavingsRate');
  var iDebt = idx('DebtLevel');
  var iHouseholdId = idx('HouseholdId');

  if (iWealth < 0 || iIncome < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var income = Number(row[iIncome]) || 0;
    var inheritance = iInheritance >= 0 ? (Number(row[iInheritance]) || 0) : 0;
    var netWorth = iNetWorth >= 0 ? (Number(row[iNetWorth]) || 0) : 0;
    var debt = iDebt >= 0 ? (Number(row[iDebt]) || 0) : 0;

    // Calculate wealth level (0-10)
    var wealthLevel = deriveWealthLevel_(income, inheritance, netWorth, debt);

    row[iWealth] = wealthLevel;

    // Update savings rate
    if (iSavings >= 0) {
      row[iSavings] = SAVINGS_RATE_BY_WEALTH[wealthLevel] || 0.05;
    }

    updated++;
  }

  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { updated: updated };
}

function deriveWealthLevel_(income, inheritance, netWorth, debt) {
  var baseWealth = 0;

  // Income-based wealth
  if (income < 30000) baseWealth = 0;
  else if (income < 45000) baseWealth = 2;
  else if (income < 60000) baseWealth = 4;
  else if (income < 85000) baseWealth = 5;
  else if (income < 120000) baseWealth = 7;
  else if (income < 200000) baseWealth = 9;
  else baseWealth = 10;

  // Inheritance boost
  if (inheritance > 100000) baseWealth += 2;
  else if (inheritance > 50000) baseWealth += 1;

  // Net worth boost
  if (netWorth > 500000) baseWealth += 2;
  else if (netWorth > 200000) baseWealth += 1;

  // Debt penalty
  if (debt >= 8) baseWealth -= 2;
  else if (debt >= 5) baseWealth -= 1;

  // Clamp to 0-10
  if (baseWealth < 0) baseWealth = 0;
  if (baseWealth > 10) baseWealth = 10;

  return baseWealth;
}


// ════════════════════════════════════════════════════════════════════════════
// INHERITANCE PROCESSING
// ════════════════════════════════════════════════════════════════════════════

function processInheritance_(ss, ctx, cycle) {
  // Check for recent deaths in ctx.summary.generationalEvents
  var events = (ctx.summary && ctx.summary.generationalEvents) || [];
  var deathEvents = events.filter(function(e) {
    return e.tag === 'Death' || e.newStatus === 'deceased';
  });

  if (deathEvents.length === 0) return { processed: 0 };

  var processed = 0;

  for (var i = 0; i < deathEvents.length; i++) {
    var deathEvent = deathEvents[i];
    var deceasedId = deathEvent.popId;
    if (!deceasedId) continue;

    // Get deceased's wealth
    var deceasedWealth = getCitizenWealth_(ss, deceasedId);
    if (deceasedWealth.netWorth <= 0) continue;

    // Find children/heirs
    var heirs = findHeirs_(ss, deceasedId);
    if (heirs.length === 0) continue;

    // Calculate inheritance (80% of net worth, 20% "lost" to taxes/fees)
    var totalInheritance = Math.round(deceasedWealth.netWorth * 0.8);
    var perHeir = Math.round(totalInheritance / heirs.length);

    // Distribute to heirs
    distributeInheritance_(ss, heirs, perHeir, deceasedId, cycle);

    // Generate story hook if significant
    if (totalInheritance > 50000) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'GENERATIONAL_WEALTH_TRANSFER',
        severity: totalInheritance > 200000 ? 7 : 5,
        description: 'Inheritance of $' + totalInheritance.toLocaleString() + ' distributed to ' + heirs.length + ' heirs',
        cycleGenerated: cycle,
        deceasedId: deceasedId,
        totalAmount: totalInheritance
      });
    }

    processed++;
  }

  return { processed: processed };
}

function getCitizenWealth_(ss, popId) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { netWorth: 0, wealthLevel: 0 };

  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var idx = function(n) { return header.indexOf(n); };

  var iPOPID = idx('POPID');
  var iNetWorth = idx('NetWorth');
  var iWealth = idx('WealthLevel');

  for (var r = 1; r < values.length; r++) {
    if (values[r][iPOPID] === popId) {
      return {
        netWorth: Number(values[r][iNetWorth]) || 0,
        wealthLevel: Number(values[r][iWealth]) || 0
      };
    }
  }

  return { netWorth: 0, wealthLevel: 0 };
}

function findHeirs_(ss, deceasedId) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var idx = function(n) { return header.indexOf(n); };

  var iPOPID = idx('POPID');
  var iParentIds = idx('ParentIds');
  var iStatus = idx('Status');

  var heirs = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var parentIds = row[iParentIds] ? row[iParentIds].toString() : '[]';
    try {
      var parents = JSON.parse(parentIds);
      if (Array.isArray(parents) && parents.indexOf(deceasedId) >= 0) {
        heirs.push(row[iPOPID]);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return heirs;
}

function distributeInheritance_(ss, heirs, amountPerHeir, deceasedId, cycle) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var rows = values.slice(1);
  var idx = function(n) { return header.indexOf(n); };

  var iPOPID = idx('POPID');
  var iInheritance = idx('InheritanceReceived');
  var iNetWorth = idx('NetWorth');

  for (var r = 0; r < rows.length; r++) {
    var popId = rows[r][iPOPID];
    if (heirs.indexOf(popId) >= 0) {
      if (iInheritance >= 0) {
        rows[r][iInheritance] = (Number(rows[r][iInheritance]) || 0) + amountPerHeir;
      }
      if (iNetWorth >= 0) {
        rows[r][iNetWorth] = (Number(rows[r][iNetWorth]) || 0) + amountPerHeir;
      }
    }
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Also record in Family_Relationships
  recordInheritanceInFamily_(ss, heirs, amountPerHeir, deceasedId, cycle);
}

function recordInheritanceInFamily_(ss, heirs, amount, deceasedId, cycle) {
  var sheet = ss.getSheetByName('Family_Relationships');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);
  var idx = function(n) { return header.indexOf(n); };

  var iCitizen1 = idx('Citizen1');
  var iCitizen2 = idx('Citizen2');
  var iType = idx('RelationshipType');
  var iInheritance = idx('InheritanceAmount');
  var iCycle = idx('InheritanceCycle');

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var c1 = row[iCitizen1];
    var c2 = row[iCitizen2];
    var type = (row[iType] || '').toString().toLowerCase();

    // Check if this is a parent-child relationship involving the deceased
    if (type === 'parent-child') {
      if ((c1 === deceasedId && heirs.indexOf(c2) >= 0) ||
          (c2 === deceasedId && heirs.indexOf(c1) >= 0)) {
        if (iInheritance >= 0) row[iInheritance] = amount;
        if (iCycle >= 0) row[iCycle] = cycle;
      }
    }
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}


// ════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD WEALTH AGGREGATION
// ════════════════════════════════════════════════════════════════════════════

function updateHouseholdWealth_(ss) {
  var householdSheet = ss.getSheetByName('Household_Ledger');
  var citizenSheet = ss.getSheetByName('Simulation_Ledger');
  if (!householdSheet || !citizenSheet) return { updated: 0 };

  var householdValues = householdSheet.getDataRange().getValues();
  var citizenValues = citizenSheet.getDataRange().getValues();

  if (householdValues.length < 2 || citizenValues.length < 2) return { updated: 0 };

  var hHeader = householdValues[0];
  var hRows = householdValues.slice(1);
  var cHeader = citizenValues[0];

  var hidx = function(n) { return hHeader.indexOf(n); };
  var cidx = function(n) { return cHeader.indexOf(n); };

  var iHouseholdId = hidx('HouseholdId');
  var iHouseholdWealth = hidx('HouseholdWealth');
  var iHouseholdIncome = hidx('HouseholdIncome');
  var iSavingsBalance = hidx('SavingsBalance');

  var iPopId = cidx('POPID');
  var iCitizenHousehold = cidx('HouseholdId');
  var iIncome = cidx('Income');
  var iWealth = cidx('WealthLevel');

  if (iHouseholdId < 0 || iHouseholdWealth < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < hRows.length; r++) {
    var household = hRows[r];
    var householdId = household[iHouseholdId];
    if (!householdId) continue;

    // Find all members
    var totalIncome = 0;
    var totalWealth = 0;
    var memberCount = 0;

    for (var c = 1; c < citizenValues.length; c++) {
      var citizen = citizenValues[c];
      if (citizen[iCitizenHousehold] === householdId) {
        totalIncome += Number(citizen[iIncome]) || 0;
        totalWealth += Number(citizen[iWealth]) || 0;
        memberCount++;
      }
    }

    if (memberCount > 0) {
      // Update household income (real calculation now!)
      if (iHouseholdIncome >= 0) {
        household[iHouseholdIncome] = totalIncome;
      }

      // Update household wealth (average)
      household[iHouseholdWealth] = Math.round(totalWealth / memberCount);

      // Update savings balance (estimated)
      if (iSavingsBalance >= 0) {
        var avgSavingsRate = 0.05;
        household[iSavingsBalance] = Math.round(totalIncome * avgSavingsRate);
      }

      updated++;
    }
  }

  if (updated > 0) {
    householdSheet.getRange(2, 1, hRows.length, hRows[0].length).setValues(hRows);
  }

  return { updated: updated };
}


// ════════════════════════════════════════════════════════════════════════════
// WEALTH MOBILITY TRACKING
// ════════════════════════════════════════════════════════════════════════════

function trackWealthMobility_(ss, ctx, cycle) {
  // Would track changes in wealth level over time
  // For v1.0, this is a placeholder
  return { events: 0 };
}


// ════════════════════════════════════════════════════════════════════════════
// HOME OWNERSHIP
// ════════════════════════════════════════════════════════════════════════════

function trackHomeOwnership_(ss, ctx, cycle) {
  // Would track home purchases based on wealth + savings
  // For v1.0, this is a placeholder
  return { purchased: 0 };
}
