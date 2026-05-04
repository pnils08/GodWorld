/**
 * ============================================================================
 * MIGRATION TRACKING ENGINE v1.1
 * ============================================================================
 *
 * Tracks individual migration decisions, displacement risk, and migration events.
 *
 * Part of: Week 4 Gentrification & Migration Tracking
 *
 * Features:
 * - Displacement risk assessment (0-10 scale)
 * - Migration intent tracking (staying → considering → planning-to-leave → left)
 * - Migration reason detection (job, family, cost, crime, opportunity, displaced)
 * - Migration event logging (moved-in, moved-out, moved-within, returned)
 * - Push/pull factor analysis
 *
 * v1.1 Phase 42 §5.6 alignment (S200):
 * - Simulation_Ledger reads/writes route through shared ctx.ledger.
 *   Pre-v1.1 the engine read SL via getDataRange (saw cycle-start state,
 *   missed cohort-A run*Engine mutations + the Income/WealthLevel/Education
 *   updates GenWealth and EducationCareer just made earlier in Phase 5)
 *   and wrote DisplacementRisk + MigrationIntent back via direct setValues
 *   that Phase 10 commitSimulationLedger_ silently clobbered. Risk + intent
 *   updates were lost every cycle since §5.6 went live S188.
 *   Caught by S200 cohort-C audit; S185's §5.6.6 categorical orphan-clear
 *   missed it (audit grepped file names but the cycle entry point is
 *   processMigrationTracking_, not the file name).
 * - Helper readers for Neighborhood_Map + Household_Ledger stay direct —
 *   those are own-tracking sheets, not affected by §5.6.
 *
 * Integration:
 * - Reads Simulation_Ledger via ctx.ledger
 * - Reads Household_Ledger for rent burden data (own tracking, direct)
 * - Reads Neighborhood_Map for gentrification/crime/displacement pressure
 *   (own tracking, direct)
 * - Writes displacement risk and migration intent to ctx.ledger.rows;
 *   Phase 10 commits in single consolidated intent
 * - Logs migration events to Migration_Events sheet (TODO — placeholder)
 * - Generates story hooks for forced migrations
 *
 * Story Hooks:
 * - FORCED_MIGRATION (severity 7): Citizen displaced by rent/eviction
 * - MASS_EXODUS (severity 8): 5+ citizens leave same neighborhood in one cycle
 * - RETURN_MIGRATION (severity 4): Citizen returns to Oakland after leaving
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var MIGRATION_INTENT = {
  STAYING: 'staying',
  CONSIDERING: 'considering',
  PLANNING: 'planning-to-leave',
  LEFT: 'left'
};

var MIGRATION_REASONS = {
  JOB: 'job',
  FAMILY: 'family',
  COST: 'cost',
  CRIME: 'crime',
  OPPORTUNITY: 'opportunity',
  DISPLACED: 'displaced'
};

var EVENT_TYPES = {
  MOVED_IN: 'moved-in',
  MOVED_OUT: 'moved-out',
  MOVED_WITHIN: 'moved-within',
  RETURNED: 'returned'
};

// Displacement risk weights
var RISK_WEIGHTS = {
  RENT_BURDEN_HIGH: 4,        // Rent >50% income
  RENTER: 2,                  // Renter vs owner
  INCOME_BELOW_MEDIAN: 3,     // Income < neighborhood median
  NO_COLLEGE: 2,              // No bachelor degree
  SENIOR: 1,                  // Age >65
  RENT_INCREASE_SEVERE: 5     // Rent increase >20% in 1 year
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════════════

function processMigrationTracking_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('processMigrationTracking_: ctx.ledger not initialized');
  }
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processMigrationTracking_ v1.1: Starting...');

  var results = {
    assessed: 0,
    highRisk: 0,
    events: 0,
    displaced: 0
  };

  // Step 1: Assess displacement risk for all citizens
  var riskResults = assessDisplacementRisk_(ctx, cycle);
  results.assessed = riskResults.assessed;
  results.highRisk = riskResults.highRisk;

  // Step 2: Update migration intent based on risk
  var intentResults = updateMigrationIntent_(ctx, cycle);

  // Step 3: Process migration events (simulated for now - will be driven by other systems)
  // For now, just track existing displaced citizens
  var eventResults = processMigrationEvents_(ctx, cycle);
  results.events = eventResults.events;
  results.displaced = eventResults.displaced;

  // Step 4: Generate story hooks
  var hookResults = generateMigrationHooks_(ctx, cycle);

  Logger.log('processMigrationTracking_ v1.1: Complete.');
  Logger.log('  Assessed: ' + results.assessed + ', High risk: ' + results.highRisk + ', Events: ' + results.events);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// DISPLACEMENT RISK ASSESSMENT
// ════════════════════════════════════════════════════════════════════════════

function assessDisplacementRisk_(ctx, cycle) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  // Helper readers (Neighborhood_Map, Household_Ledger) stay direct — those
  // are own-tracking sheets, not affected by §5.6.
  var ss = ctx.ss;
  var simHeader = ctx.ledger.headers;
  var simRows = ctx.ledger.rows;
  if (!simRows.length) return { assessed: 0, highRisk: 0 };

  var idx = function(n) { return simHeader.indexOf(n); };
  var iStatus = idx('Status');
  var iBirthYear = idx('BirthYear');
  var iNeighborhood = idx('Neighborhood');
  var iDisplRisk = idx('DisplacementRisk');
  var iEducation = idx('EducationLevel');
  var iHouseholdId = idx('HouseholdId');

  if (iDisplRisk < 0) return { assessed: 0, highRisk: 0 };

  // Load neighborhood displacement pressure (Neighborhood_Map — direct read)
  var neighborhoodPressure = buildNeighborhoodPressureMap_(ss);

  // Load household rent burden (Household_Ledger — direct read; if Week 1 deployed)
  var householdRentBurden = {};
  if (iHouseholdId >= 0) {
    householdRentBurden = buildHouseholdRentBurdenMap_(ss);
  }

  var assessed = 0;
  var highRisk = 0;
  var simYear = 2040 + Math.floor(cycle / 52);

  for (var r = 0; r < simRows.length; r++) {
    var row = simRows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var neighborhood = row[iNeighborhood] || '';
    var birthYear = Number(row[iBirthYear]) || 0;
    var age = birthYear > 0 ? (simYear - birthYear) : 30;
    var education = iEducation >= 0 ? (row[iEducation] || 'hs-diploma').toString().toLowerCase() : 'hs-diploma';
    var householdId = iHouseholdId >= 0 ? (row[iHouseholdId] || '') : '';

    // Calculate displacement risk
    var risk = 0;

    // Neighborhood displacement pressure
    var pressure = neighborhoodPressure[neighborhood] || 0;
    risk += Math.floor(pressure / 2); // Pressure 8 → +4 risk

    // Rent burden (if household data available)
    if (householdId && householdRentBurden[householdId]) {
      var rentBurden = householdRentBurden[householdId];
      if (rentBurden > 50) risk += RISK_WEIGHTS.RENT_BURDEN_HIGH;
      if (rentBurden > 30) risk += 1;
    }

    // Education (no college = higher risk)
    if (education === 'hs-dropout' || education === 'hs-diploma' || education === 'none') {
      risk += RISK_WEIGHTS.NO_COLLEGE;
    }

    // Age (seniors more vulnerable)
    if (age > 65) {
      risk += RISK_WEIGHTS.SENIOR;
    }

    // Cap at 10
    risk = Math.min(risk, 10);

    row[iDisplRisk] = risk;
    assessed++;

    if (risk >= 7) {
      highRisk++;
    }
  }

  if (assessed > 0) {
    ctx.ledger.dirty = true;
  }

  return { assessed: assessed, highRisk: highRisk };
}

function buildNeighborhoodPressureMap_(ss) {
  var sheet = ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return {};

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iNeighborhood = idx('Neighborhood');
  var iDisplPressure = idx('DisplacementPressure');

  if (iDisplPressure < 0) return {};

  var map = {};
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var neighborhood = row[iNeighborhood];
    var pressure = Number(row[iDisplPressure]) || 0;
    map[neighborhood] = pressure;
  }

  return map;
}

function buildHouseholdRentBurdenMap_(ss) {
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return {};

  try {
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return {};

    var header = values[0];
    var rows = values.slice(1);

    var idx = function(n) { return header.indexOf(n); };
    var iHouseholdId = idx('HouseholdId');
    var iRentBurden = idx('RentBurdenPct');

    if (iHouseholdId < 0 || iRentBurden < 0) return {};

    var map = {};
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var householdId = row[iHouseholdId];
      var rentBurden = Number(row[iRentBurden]) || 0;
      map[householdId] = rentBurden;
    }

    return map;
  } catch (err) {
    // Household_Ledger might not exist if Week 1 not deployed
    return {};
  }
}


// ════════════════════════════════════════════════════════════════════════════
// MIGRATION INTENT
// ════════════════════════════════════════════════════════════════════════════

function updateMigrationIntent_(ctx, cycle) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; sees DisplacementRisk values
  // assessDisplacementRisk_ just wrote earlier in this engine.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { updated: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iStatus = idx('Status');
  var iDisplRisk = idx('DisplacementRisk');
  var iMigIntent = idx('MigrationIntent');

  if (iMigIntent < 0 || iDisplRisk < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var displRisk = Number(row[iDisplRisk]) || 0;
    var currentIntent = (row[iMigIntent] || 'staying').toString().toLowerCase();

    // Update intent based on risk
    var newIntent = currentIntent;

    if (displRisk >= 8) {
      newIntent = MIGRATION_INTENT.PLANNING;
    } else if (displRisk >= 5) {
      newIntent = MIGRATION_INTENT.CONSIDERING;
    } else {
      newIntent = MIGRATION_INTENT.STAYING;
    }

    if (newIntent !== currentIntent) {
      row[iMigIntent] = newIntent;
      updated++;
    }
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
  }

  return { updated: updated };
}


// ════════════════════════════════════════════════════════════════════════════
// MIGRATION EVENTS (SIMULATION FOR NOW)
// ════════════════════════════════════════════════════════════════════════════

function processMigrationEvents_(ctx, cycle) {
  // For now, this is a placeholder
  // Future enhancement: Process actual migration events from other systems
  // (career changes, household dissolution, crime events, etc.)

  var results = {
    events: 0,
    displaced: 0
  };

  // Check for citizens with very high displacement risk
  var displaced = checkForDisplacedCitizens_(ctx, cycle);
  results.displaced = displaced.count;

  return results;
}

function checkForDisplacedCitizens_(ctx, cycle) {
  // Phase 42 §5.6: read-only — reads ctx.ledger.rows so it sees the
  // DisplacementRisk + MigrationIntent values written upstream.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { count: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iStatus = idx('Status');
  var iDisplRisk = idx('DisplacementRisk');
  var iMigIntent = idx('MigrationIntent');

  if (iDisplRisk < 0) return { count: 0 };

  var count = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var displRisk = Number(row[iDisplRisk]) || 0;
    var migIntent = (row[iMigIntent] || 'staying').toString().toLowerCase();

    // Count citizens at severe displacement risk
    if (displRisk >= 8 && migIntent === MIGRATION_INTENT.PLANNING) {
      count++;
    }
  }

  return { count: count };
}


// ════════════════════════════════════════════════════════════════════════════
// STORY HOOKS
// ════════════════════════════════════════════════════════════════════════════

function generateMigrationHooks_(ctx, cycle) {
  // Phase 42 §5.6: read-only — reads ctx.ledger.rows so hooks reference
  // the DisplacementRisk + MigrationIntent values written upstream.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { alerts: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iStatus = idx('Status');
  var iNeighborhood = idx('Neighborhood');
  var iDisplRisk = idx('DisplacementRisk');
  var iMigIntent = idx('MigrationIntent');

  var alerts = 0;
  var displacementByNeighborhood = {};

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var popid = row[iPOPID];
    var first = row[iFirst] || '';
    var last = row[iLast] || '';
    var neighborhood = row[iNeighborhood] || '';
    var displRisk = Number(row[iDisplRisk]) || 0;
    var migIntent = (row[iMigIntent] || 'staying').toString().toLowerCase();

    // Track displacement by neighborhood
    if (displRisk >= 7) {
      displacementByNeighborhood[neighborhood] = (displacementByNeighborhood[neighborhood] || 0) + 1;
    }

    // FORCED_MIGRATION (individual at severe risk)
    if (displRisk >= 9 && migIntent === MIGRATION_INTENT.PLANNING) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'FORCED_MIGRATION',
        severity: 7,
        description: first + ' ' + last + ' at severe displacement risk in ' + neighborhood + ' (risk: ' + displRisk + '/10)',
        cycleGenerated: cycle,
        popid: popid,
        neighborhood: neighborhood,
        displacementRisk: displRisk
      });
      alerts++;
    }
  }

  // MASS_EXODUS (5+ citizens at risk in same neighborhood)
  for (var hood in displacementByNeighborhood) {
    var count = displacementByNeighborhood[hood];
    if (count >= 5) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'MASS_EXODUS',
        severity: 8,
        description: hood + ' mass displacement risk: ' + count + ' residents planning to leave',
        cycleGenerated: cycle,
        neighborhood: hood,
        atRiskCount: count
      });
      alerts++;
    }
  }

  return { alerts: alerts };
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS (for testing)
// ════════════════════════════════════════════════════════════════════════════

// Entry point called from godWorldEngine2.js
// processMigrationTracking_(ctx)
