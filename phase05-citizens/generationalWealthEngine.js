/**
 * ============================================================================
 * GENERATIONAL WEALTH ENGINE v2.1
 * ============================================================================
 *
 * Tracks wealth accumulation, inheritance, and economic mobility.
 *
 * Part of: Week 2 Generational Wealth & Inheritance
 *
 * Features:
 * - Income from role-based economic profiles (v2.0, was career bands in v1.0)
 * - Wealth level tracking (0-10 scale)
 * - Inheritance mechanics (wealth transfer on death)
 * - Wealth mobility detection (upward/downward movement)
 * - Home ownership tracking
 * - Savings & debt management
 *
 * v2.1 Phase 42 §5.6 alignment (S200):
 * - Simulation_Ledger reads/writes route through shared ctx.ledger.
 *   Pre-v2.1 the engine read SL via getDataRange (saw cycle-start state,
 *   missed cohort-A in-memory mutations to Income/etc.) and wrote back via
 *   direct setValues that Phase 10 commitSimulationLedger_ silently clobbered.
 *   271/836 citizens (32%) hit the fallback recalc path per cycle, so the
 *   clobber was material — unseeded Income + every WealthLevel + inheritance
 *   distribution were all being lost. Caught by S200 cohort-C audit; S185's
 *   §5.6.6 categorical orphan-clear missed it (audit grepped file names but
 *   the cycle entry point is processGenerationalWealth_, not the file name).
 * - Household_Ledger + Family_Relationships writes remain direct: those are
 *   own-tracking sheets, exempt per engine.md, and updateHouseholdWealth_
 *   still aggregates SL Income/WealthLevel into Household_Ledger inline.
 *
 * v2.0 Changes (Phase 14.2):
 * - Income no longer recalculated from career bands for seeded citizens
 * - Career Engine directly adjusts income on transitions (+6-12% promo, etc.)
 * - Wealth thresholds recalibrated for 2041 ($300K elite, $180K wealthy)
 * - SavingsRate preserved if already seeded by applyEconomicProfiles.js
 * - Math.random determinism bug fixed (now accepts ctx.rng)
 *
 * Integration:
 * - Reads EconomicProfileKey to determine seeded vs unseeded citizens
 * - Career Engine adjusts Income directly on transitions (v14.2)
 * - Hooks into generationalEventsEngine.js death events
 * - Updates householdFormationEngine.js with real income via ctx.ledger
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
// v14.2: LEGACY FALLBACK ONLY — used for citizens without EconomicProfileKey.
// Seeded citizens get role-based income from applyEconomicProfiles.js.
var INCOME_BY_BAND = {
  'low': 35000,
  'mid': 62000,
  'high': 110000
};

// Wealth level thresholds (based on income + assets)
// v14.2: Recalibrated for 2041 Oakland role-based income distribution
var WEALTH_THRESHOLDS = {
  POVERTY: 0,       // <$30k income
  LOW: 2,           // $30k-$45k
  WORKING: 4,       // $45k-$60k
  WORKING_PLUS: 5,  // $60k-$85k
  MIDDLE: 6,        // $85k-$120k
  UPPER_MIDDLE: 7,  // $120k-$180k
  WEALTHY: 9,       // $180k-$300k
  ELITE: 10         // $300k+ or significant assets
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
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('processGenerationalWealth_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processGenerationalWealth_ v2.1: Starting...');

  var results = {
    processed: 0,
    wealthUpdated: 0,
    inheritanceProcessed: 0,
    mobilityDetected: 0,
    homesPurchased: 0
  };

  // Step 1: Calculate citizen income from career data
  // v14.2: Now skips seeded citizens (income set by applyEconomicProfiles.js,
  // adjusted by Career Engine transitions). Only recalculates for unseeded citizens.
  var incomeResults = calculateCitizenIncomes_(ctx);
  results.incomeUpdated = incomeResults.updated;

  // Step 2: Calculate wealth levels from income + assets
  var wealthResults = calculateCitizenWealth_(ctx);
  results.wealthUpdated = wealthResults.updated;

  // Step 3: Process inheritance for recent deaths
  var inheritanceResults = processInheritance_(ctx, cycle);
  results.inheritanceProcessed = inheritanceResults.processed;

  // Step 4: Update household wealth aggregates
  var householdResults = updateHouseholdWealth_(ctx);
  results.householdsUpdated = householdResults.updated;

  // Step 5: Track wealth mobility (upward/downward)
  var mobilityResults = trackWealthMobility_(ss, ctx, cycle);
  results.mobilityDetected = mobilityResults.events;

  // Step 6: Home ownership opportunities
  var homeResults = trackHomeOwnership_(ss, ctx, cycle);
  results.homesPurchased = homeResults.purchased;

  Logger.log(
    'processGenerationalWealth_ v2.1: Complete. ' +
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

function calculateCitizenIncomes_(ctx) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { updated: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iIncome = idx('Income');
  var iLife = idx('LifeHistory');
  var iStatus = idx('Status');
  var iTier = idx('Tier');
  var iEconKey = idx('EconomicProfileKey');

  if (iIncome < 0 || iLife < 0) return { updated: 0 };

  // v14.2: Deterministic RNG (fixes Math.random bug from v1.0)
  var rng = safeRand_(ctx);

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased' || status === 'inactive') continue;

    // v14.2: Skip citizens with economic profiles — income already set by
    // applyEconomicProfiles.js seeding script and adjusted by Career Engine
    // transitions. Only recalculate for unseeded citizens (fallback path).
    var econKey = iEconKey >= 0 ? (row[iEconKey] || '').toString().trim() : '';
    if (econKey !== '' && econKey !== 'SPORTS_OVERRIDE') {
      continue; // Income managed externally
    }

    // Fallback: unseeded citizens use legacy band logic
    var lifeHistory = row[iLife] ? row[iLife].toString() : '';
    var tier = Number(row[iTier]) || 5;

    // Extract incomeBand from most recent CareerState
    var incomeBand = extractIncomeBand_(lifeHistory);

    // Convert to dollar amount (with deterministic RNG)
    var income = calculateIncomeFromBand_(incomeBand, tier, rng);

    row[iIncome] = income;
    updated++;
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
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

function calculateIncomeFromBand_(incomeBand, tier, rng) {
  if (typeof rng !== 'function') throw new Error('generationalWealthEngine.calculateIncomeFromBand_: rng parameter required (Phase 40.3 Path 1)');
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

function calculateCitizenWealth_(ctx) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { updated: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iWealth = idx('WealthLevel');
  var iIncome = idx('Income');
  var iInheritance = idx('InheritanceReceived');
  var iNetWorth = idx('NetWorth');
  var iStatus = idx('Status');
  var iSavings = idx('SavingsRate');
  var iDebt = idx('DebtLevel');

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

    // Update savings rate (preserve seeded values from applyEconomicProfiles.js)
    if (iSavings >= 0) {
      var currentSavings = Number(row[iSavings]) || 0;
      if (currentSavings <= 0) {
        // Only set if not already seeded with a role-based savings rate
        row[iSavings] = SAVINGS_RATE_BY_WEALTH[wealthLevel] || 0.05;
      }
    }

    updated++;
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
  }

  return { updated: updated };
}

function deriveWealthLevel_(income, inheritance, netWorth, debt) {
  // v14.2: Recalibrated for 2041 Oakland role-based income distribution.
  // Aligned with economicLookup.js deriveWealthLevel() thresholds.
  // Uses effective income = income + 5% of net worth as annual yield.
  var effectiveIncome = income + (netWorth * 0.05);

  var baseWealth = 0;
  if (effectiveIncome >= 300000) baseWealth = 10;      // Elite
  else if (effectiveIncome >= 180000) baseWealth = 9;   // Wealthy
  else if (effectiveIncome >= 120000) baseWealth = 7;   // Upper-middle
  else if (effectiveIncome >= 85000) baseWealth = 6;    // Middle
  else if (effectiveIncome >= 60000) baseWealth = 5;    // Working+
  else if (effectiveIncome >= 45000) baseWealth = 4;    // Working
  else if (effectiveIncome >= 30000) baseWealth = 2;    // Low
  else baseWealth = 0;                                   // Poverty

  // Inheritance boost
  if (inheritance > 100000) baseWealth += 2;
  else if (inheritance > 50000) baseWealth += 1;

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

function processInheritance_(ctx, cycle) {
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

    // Get deceased's wealth (read from ctx.ledger — sees in-cycle mutations)
    var deceasedWealth = getCitizenWealth_(ctx, deceasedId);
    if (deceasedWealth.netWorth <= 0) continue;

    // Find children/heirs
    var heirs = findHeirs_(ctx, deceasedId);
    if (heirs.length === 0) continue;

    // Calculate inheritance (80% of net worth, 20% "lost" to taxes/fees)
    var totalInheritance = Math.round(deceasedWealth.netWorth * 0.8);
    var perHeir = Math.round(totalInheritance / heirs.length);

    // Distribute to heirs
    distributeInheritance_(ctx, heirs, perHeir, deceasedId, cycle);

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

function getCitizenWealth_(ctx, popId) {
  // Phase 42 §5.6: read from ctx.ledger so this sees inheritance distributions
  // and other in-cycle mutations applied earlier in this same engine run.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { netWorth: 0, wealthLevel: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID');
  var iNetWorth = idx('NetWorth');
  var iWealth = idx('WealthLevel');

  for (var r = 0; r < rows.length; r++) {
    if (rows[r][iPOPID] === popId) {
      return {
        netWorth: Number(rows[r][iNetWorth]) || 0,
        wealthLevel: Number(rows[r][iWealth]) || 0
      };
    }
  }

  return { netWorth: 0, wealthLevel: 0 };
}

function findHeirs_(ctx, deceasedId) {
  // Phase 42 §5.6: read from ctx.ledger.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return [];

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID');
  var iParentIds = idx('ParentIds');
  var iStatus = idx('Status');

  var heirs = [];

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
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

function distributeInheritance_(ctx, heirs, amountPerHeir, deceasedId, cycle) {
  // Phase 42 §5.6: mutate ctx.ledger.rows; flip dirty; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID');
  var iInheritance = idx('InheritanceReceived');
  var iNetWorth = idx('NetWorth');

  var mutated = false;
  for (var r = 0; r < rows.length; r++) {
    var popId = rows[r][iPOPID];
    if (heirs.indexOf(popId) >= 0) {
      if (iInheritance >= 0) {
        rows[r][iInheritance] = (Number(rows[r][iInheritance]) || 0) + amountPerHeir;
        mutated = true;
      }
      if (iNetWorth >= 0) {
        rows[r][iNetWorth] = (Number(rows[r][iNetWorth]) || 0) + amountPerHeir;
        mutated = true;
      }
    }
  }

  if (mutated) ctx.ledger.dirty = true;

  // Also record in Family_Relationships (own-tracking sheet — stays direct).
  recordInheritanceInFamily_(ctx, heirs, amountPerHeir, deceasedId, cycle);
}

function recordInheritanceInFamily_(ctx, heirs, amount, deceasedId, cycle) {
  // Family_Relationships is an own-tracking sheet (engine.md exempt) — direct
  // read+write stays the same; only signature aligned to ctx for consistency.
  var ss = ctx.ss;
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

function updateHouseholdWealth_(ctx) {
  // Phase 42 §5.6: SL read sources from ctx.ledger so it sees the Income +
  // WealthLevel mutations calculateCitizenIncomes_/Wealth_ just made earlier
  // in this same engine run. Household_Ledger read+write stays direct
  // (own-tracking sheet, exempt per engine.md).
  var ss = ctx.ss;
  var householdSheet = ss.getSheetByName('Household_Ledger');
  if (!householdSheet) return { updated: 0 };

  var householdValues = householdSheet.getDataRange().getValues();
  if (householdValues.length < 2) return { updated: 0 };

  var hHeader = householdValues[0];
  var hRows = householdValues.slice(1);

  var cHeader = ctx.ledger.headers;
  var citizenRows = ctx.ledger.rows;
  if (!citizenRows.length) return { updated: 0 };

  var hidx = function(n) { return hHeader.indexOf(n); };
  var cidx = function(n) { return cHeader.indexOf(n); };

  var iHouseholdId = hidx('HouseholdId');
  var iHouseholdWealth = hidx('HouseholdWealth');
  var iHouseholdIncome = hidx('HouseholdIncome');
  var iSavingsBalance = hidx('SavingsBalance');

  var iCitizenHousehold = cidx('HouseholdId');
  var iIncome = cidx('Income');
  var iWealth = cidx('WealthLevel');

  if (iHouseholdId < 0 || iHouseholdWealth < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < hRows.length; r++) {
    var household = hRows[r];
    var householdId = household[iHouseholdId];
    if (!householdId) continue;

    // Find all members (iterates ctx.ledger.rows — sees in-memory mutations)
    var totalIncome = 0;
    var totalWealth = 0;
    var memberCount = 0;

    for (var c = 0; c < citizenRows.length; c++) {
      var citizen = citizenRows[c];
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
