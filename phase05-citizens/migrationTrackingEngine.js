/**
 * ============================================================================
 * MIGRATION TRACKING ENGINE v1.2
 * ============================================================================
 *
 * Tracks individual migration decisions, displacement risk, and migration events.
 *
 * Part of: Week 4 Gentrification & Migration Tracking
 *
 * Features:
 * - Displacement risk assessment (0-10 scale)
 * - Migration intent tracking (staying → considering → planning-to-leave)
 * - Migration reason detection (job, family, cost, crime, opportunity, displaced)
 * - Intra-city relocation (v1.2 / engine.55 S316): the intent ladder resolves
 *   as moved-within — whole households sort toward economically-fitting
 *   neighborhoods (pressure lane sorts down, misfit lane sorts up), scored
 *   against same-cycle trajectory state (rent/income/pressure/trajectory)
 *   from Phase5-Trajectory. Fills AN-AQ (MigrationReason / Destination /
 *   MigratedCycle) which were dead since Week 4. Nodes stay permanent —
 *   every move is inside the canonical Neighborhood_Map node set.
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
 * - Reads Neighborhood_Map for housing pressure (S315 trajectory block)
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
 * - CITIZEN_RELOCATED (severity 5): unit completed an intra-city move (engine.55)
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// NODES ARE PERMANENT (S257 + S313, Mike-direct). The Simulation_Ledger is a
// representative sample (~1 node : 438 sim-people) — an individual node leaving
// asserts hundreds left, which the engine can never justify. So the intent
// ladder deliberately TOPS OUT at planning-to-leave: migration produces texture
// and pressure, never departures. The former 'left' exit state was an unwired
// constant (zero writers, verified S313) and is removed so no future session
// "completes" the state machine. Do NOT add an exit state without Mike's
// explicit go. Plan: docs/plans/2026-06-14-ledger-representative-sample-migration-removal.md
var MIGRATION_INTENT = {
  STAYING: 'staying',
  CONSIDERING: 'considering',
  PLANNING: 'planning-to-leave'
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

// S316 savings wiring: months of rent a household must hold in reserve for
// HouseholdSavings to absorb rent-burden risk (same constant class as the
// stress check in householdFormationEngine — keep the two aligned).
var SAVINGS_BUFFER_MONTHS = 12;

// Displacement risk weights
var RISK_WEIGHTS = {
  RENT_BURDEN_HIGH: 4,        // Rent >50% income
  RENTER: 2,                  // Renter vs owner
  INCOME_BELOW_MEDIAN: 3,     // Income < neighborhood median
  NO_COLLEGE: 2,              // No bachelor degree
  SENIOR: 1,                  // Age >65
  RENT_INCREASE_SEVERE: 5     // Rent increase >20% in 1 year
};

// engine.55 — intra-city relocation (S316). Resolves the intent ladder WITHIN
// the permanent-nodes rule: planning-to-leave -> moved-within, never an exit.
// Citizens spawn into random neighborhoods at ingest; this is the slow-burn
// sorter that moves them (whole household as one unit) toward neighborhoods
// their economic life actually fits, using the same-cycle trajectory state
// exported by Phase5-Trajectory (ctx.summary.neighborhoodTrajectory).
var RELOCATION = {
  MAX_UNITS_PER_CYCLE: 2,     // hard cap — moves are rare, qualitative (1:438 sample)
  PRESSURE_MOVE_CHANCE: 0.35, // per-cycle roll for planning-to-leave units
  MISFIT_MOVE_CHANCE: 0.15,   // per-cycle roll for economic-misfit units (slower burn)
  MISFIT_INCOME_RATIO: 2.5,   // unit income >= 2.5x hood median income = under-housed
  MAX_BURDEN: 0.40,           // never move where rent > 40% of monthly income
  TARGET_BURDEN: 0.30,        // affordability scoring peak (rent = 30% of monthly income)
  MIN_SCORE_GAIN: 1.5         // destination must beat current hood by this margin
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

  // Load neighborhood housing pressure (Neighborhood_Map — direct read)
  var neighborhoodPressure = buildNeighborhoodPressureMap_(ss);

  // Load household housing facts (Household_Ledger — direct read; if Week 1 deployed)
  var householdHousing = {};
  if (iHouseholdId >= 0) {
    householdHousing = buildHouseholdHousingMap_(ss);
  }

  // S316 fix: Household_Ledger.HouseholdIncome is seeded at formation and goes
  // stale (C129 audit: 123/276 active households under half their members'
  // live SL income sum — a 192k earner got "priced out" off a 50k ledger
  // value). Burden uses the LIVE member income sum; ledger income is fallback.
  var iIncome = idx('Income');
  var liveIncomeByHH = {};
  if (iHouseholdId >= 0 && iIncome >= 0) {
    for (var li = 0; li < simRows.length; li++) {
      var liRow = simRows[li];
      if ((liRow[iStatus] || 'active').toString().toLowerCase() === 'deceased') continue;
      var liHH = liRow[iHouseholdId];
      if (!liHH) continue;
      liveIncomeByHH[liHH] = (liveIncomeByHH[liHH] || 0) + (Number(liRow[iIncome]) || 0);
    }
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

    // Rent burden — renters only (S316 fix: owners were getting +5 risk off
    // a housing cost they don't pay as rent), live member income sum first.
    // Savings buffer (S316 wiring): a household holding SAVINGS_BUFFER_MONTHS
    // of rent in reserve doesn't take burden risk — reserves absorb the spike.
    if (householdId && householdHousing[householdId]) {
      var hInfo = householdHousing[householdId];
      if (hInfo.housingType !== 'owned' && hInfo.rent > 0) {
        var buffered = hInfo.savings >= hInfo.rent * SAVINGS_BUFFER_MONTHS;
        var annualIncome = liveIncomeByHH[householdId] || hInfo.ledgerIncome || 0;
        if (!buffered && annualIncome > 0) {
          var rentBurden = Math.round((hInfo.rent * 12 / annualIncome) * 100);
          if (rentBurden > 50) risk += RISK_WEIGHTS.RENT_BURDEN_HIGH;
          if (rentBurden > 30) risk += 1;
        }
      }
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
  var iDisplPressure = idx('HousingPressure');

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

function buildHouseholdHousingMap_(ss) {
  // engine.55 (S316): raw housing facts per household. The caller computes
  // burden against LIVE member income (Household_Ledger.HouseholdIncome is
  // formation-seeded and stale — kept only as fallback). The original
  // RentBurdenPct read was dead — that column never existed in the live sheet,
  // so the burden signal was silently zero since Week 4.
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return {};

  try {
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return {};

    var header = values[0];
    var rows = values.slice(1);

    var idx = function(n) { return header.indexOf(n); };
    var iHouseholdId = idx('HouseholdId');
    var iRent = idx('MonthlyRent');
    var iIncome = idx('HouseholdIncome');
    var iType = idx('HousingType');
    var iStatus = idx('Status');
    var iSavings = idx('HouseholdSavings');

    if (iHouseholdId < 0 || iRent < 0) return {};

    var map = {};
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var householdId = row[iHouseholdId];
      if (!householdId) continue;
      if (iStatus >= 0 && String(row[iStatus]).toLowerCase() === 'dissolved') continue;
      map[householdId] = {
        rent: Number(row[iRent]) || 0,
        housingType: iType >= 0 ? String(row[iType] || '').toLowerCase() : '',
        ledgerIncome: iIncome >= 0 ? (Number(row[iIncome]) || 0) : 0,
        savings: iSavings >= 0 ? (Number(row[iSavings]) || 0) : 0
      };
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
  // engine.55 (S316): the placeholder is now the intra-city relocation engine.
  var results = {
    events: 0,
    displaced: 0
  };

  // Execute intra-city moves (moved-within — nodes permanent, no exits)
  var moves = processRelocations_(ctx, cycle);
  results.events = moves.moved;

  // engine.61 wire (S321): the settled-in check — MigrationReason/Destination/
  // MigratedCycle get their first readers.
  results.settledIn = processSettledInCheck_(ctx, cycle);

  // Check for citizens with very high displacement risk
  var displaced = checkForDisplacedCitizens_(ctx, cycle);
  results.displaced = displaced.count;

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// engine.61 wire (S321) — THE SETTLED-IN CHECK
// AN-AP were written on every relocation (engine.55) and never read: the move
// happened, the why evaporated. Ten cycles after MigratedCycle, look at the
// neighborhood the citizen actually landed in (S.neighborhoodState, one-cycle
// lag) and write the verdict their cron-wake should know: did the move work?
// Fires exactly once — only at the exact cycle offset. Reads all three columns.
// ════════════════════════════════════════════════════════════════════════════
var SETTLED_IN_CYCLES = 10;

function processSettledInCheck_(ctx, cycle) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var iMigCycle = idx('MigratedCycle'), iMigReason = idx('MigrationReason'),
      iMigDest = idx('MigrationDestination'), iHood = idx('Neighborhood'),
      iLife = idx('LifeHistory'), iStatus = idx('Status');
  if (iMigCycle < 0 || iLife < 0) return 0;
  var nbState = (ctx.summary && ctx.summary.neighborhoodState) || {};
  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);

  var checked = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    if (String(row[iStatus] || 'active').toLowerCase() !== 'active') continue;
    var migCycle = Number(row[iMigCycle]) || 0;
    if (migCycle <= 0 || (cycle - migCycle) !== SETTLED_IN_CYCLES) continue;

    var hood = String(row[iHood] || '').trim();
    var dest = iMigDest >= 0 ? String(row[iMigDest] || '').trim() : '';
    // moved again since, or drifted off the recorded destination — no verdict
    if (dest && hood && dest !== hood) continue;
    var st = nbState[hood];
    if (!st) continue;

    var reason = iMigReason >= 0 ? String(row[iMigReason] || '').toLowerCase() : '';
    var press = (typeof st.housingPressure === 'number') ? st.housingPressure : 5;
    var traj = String(st.trajectory || '').toLowerCase();
    // The verdict is physics, not sentiment: a cost-driven move judged on
    // pressure where they landed; an opportunity move judged on trajectory.
    var worked;
    if (reason.indexOf('cost') >= 0 || reason.indexOf('displaced') >= 0) {
      worked = press < 7;
    } else {
      worked = traj.indexOf('declin') < 0;
    }
    var line = worked ?
      '[Home] ten weeks in ' + hood + ' — the move worked' :
      '[Home] ten weeks in ' + hood + ' — same problems, new address';
    row[iLife] = (row[iLife] ? row[iLife] + '\n' : '') + stamp + ' — ' + line;
    checked++;
  }

  if (checked > 0) ctx.ledger.dirty = true;
  if (checked > 0) Logger.log('processSettledInCheck_ engine.61: ' + checked + ' verdict(s)');
  return checked;
}


// ════════════════════════════════════════════════════════════════════════════
// INTRA-CITY RELOCATION (engine.55, S316)
// ════════════════════════════════════════════════════════════════════════════
//
// Two eligibility lanes, one shared per-cycle cap:
//   PRESSURE lane — intent 'planning-to-leave' (risk >= 8): priced-out units
//     sort DOWN toward affordable neighborhoods.
//   MISFIT lane — unit income >= MISFIT_INCOME_RATIO x current hood median:
//     under-housed units sort UP. This corrects random neighborhood assignment
//     at ingest without needing displacement pressure.
// A unit = a household (all SL rows sharing HouseholdId move together, and the
// Household_Ledger row re-prices to the destination median rent) or a single
// citizen with no HouseholdId. Destination scoring is deterministic; only the
// move-roll consumes ctx.rng.

function buildRelocationHoodState_(ctx) {
  // Prefer the same-cycle export from Phase5-Trajectory (runs immediately
  // before this engine; its sheet intents don't commit until Phase 10).
  var S = ctx.summary || {};
  var out = {};
  var fromSummary = S.neighborhoodTrajectory || null;
  if (fromSummary) {
    for (var hood in fromSummary) {
      var t = fromSummary[hood];
      if (t && t.rent !== null && t.rent > 0 && t.income !== null && t.income > 0) {
        out[hood] = { trajectory: t.trajectory, pressure: t.pressure, rent: t.rent, income: t.income };
      }
    }
    return out;
  }
  // Fallback (manual/operator runs without Phase5-Trajectory): last-committed
  // Neighborhood_Map state, direct read (own-tracking sheet, documented exception).
  var sheet = ctx.ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return out;
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return out;
  var header = values[0];
  var idx = function(n) { return header.indexOf(n); };
  var iHood = idx('Neighborhood'), iTraj = idx('NeighborhoodTrajectory'),
      iPress = idx('HousingPressure'), iRent = idx('MedianRent'), iIncome = idx('MedianIncome');
  if (iHood < 0 || iRent < 0 || iIncome < 0) return out;
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var rent = Number(row[iRent]) || 0, income = Number(row[iIncome]) || 0;
    if (!row[iHood] || rent <= 0 || income <= 0) continue;
    out[row[iHood]] = {
      trajectory: String(row[iTraj] || 'steady').toLowerCase(),
      pressure: iPress >= 0 ? (Number(row[iPress]) || 0) : 0,
      rent: rent,
      income: income
    };
  }
  return out;
}

function scoreHoodFit_(unitIncome, hood) {
  // Deterministic fit score for a unit in a neighborhood. Higher = better fit.
  var monthly = unitIncome / 12;
  if (monthly <= 0) return null;
  var burden = hood.rent / monthly;
  var score = 0;
  // Affordability: peak at TARGET_BURDEN, falls off both directions
  score += Math.max(0, 4 - Math.abs(burden - RELOCATION.TARGET_BURDEN) * 20);
  // Trajectory: growth pulls, decay repels
  if (hood.trajectory === 'growth') score += 1.5;
  else if (hood.trajectory === 'decay') score -= 2;
  // Don't move into the same pressure trap
  score -= hood.pressure / 4;
  // Class alignment: income proximity to hood median
  score += Math.max(0, 3 - Math.abs(unitIncome - hood.income) / 25000);
  return { score: score, burden: burden };
}

function processRelocations_(ctx, cycle) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { moved: 0 };

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : function() {
    throw new Error('processRelocations_: ctx.rng required (no Math.random fallback)');
  };

  var hoods = buildRelocationHoodState_(ctx);
  var hoodNames = Object.keys(hoods).sort(); // sorted — deterministic iteration
  if (hoodNames.length < 2) return { moved: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID'), iFirst = idx('First'), iLast = idx('Last'),
      iStatus = idx('Status'), iNeighborhood = idx('Neighborhood'),
      iIncome = idx('Income'), iHouseholdId = idx('HouseholdId'),
      iDisplRisk = idx('DisplacementRisk'), iMigIntent = idx('MigrationIntent'),
      iMigReason = idx('MigrationReason'), iMigDest = idx('MigrationDestination'),
      iMigCycle = idx('MigratedCycle');
  if (iNeighborhood < 0 || iIncome < 0 || iMigIntent < 0) return { moved: 0 };

  // ── Build move units: household groups + solo citizens, in row order ──────
  var units = [];       // { key, rowIdxs[], hood, income, planning, maxRisk }
  var byHousehold = {}; // householdId -> unit
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (String(row[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    var hood = row[iNeighborhood] || '';
    if (!hoods[hood]) continue; // no canonical hood state -> not movable
    var hhId = iHouseholdId >= 0 ? (row[iHouseholdId] || '') : '';
    var income = Number(row[iIncome]) || 0;
    var planning = String(row[iMigIntent] || '').toLowerCase() === MIGRATION_INTENT.PLANNING;
    var risk = iDisplRisk >= 0 ? (Number(row[iDisplRisk]) || 0) : 0;
    if (hhId) {
      var u = byHousehold[hhId];
      if (!u) {
        u = { key: hhId, rowIdxs: [], hood: hood, income: 0, planning: false, maxRisk: 0 };
        byHousehold[hhId] = u;
        units.push(u);
      }
      if (u.hood !== hood) continue; // split household across hoods — leave alone
      u.rowIdxs.push(r);
      u.income += income; // unit income = summed member income
      u.planning = u.planning || planning;
      u.maxRisk = Math.max(u.maxRisk, risk);
    } else {
      units.push({ key: 'POP:' + (row[iPOPID] || r), rowIdxs: [r], hood: hood,
                   income: income, planning: planning, maxRisk: risk });
    }
  }

  // ── Eligibility + roll + cap ──────────────────────────────────────────────
  var moved = 0;
  for (var u2 = 0; u2 < units.length && moved < RELOCATION.MAX_UNITS_PER_CYCLE; u2++) {
    var unit = units[u2];
    if (unit.income <= 0 || !unit.rowIdxs.length) continue;

    var current = hoods[unit.hood];
    var misfit = unit.income >= current.income * RELOCATION.MISFIT_INCOME_RATIO;
    var lane = unit.planning ? 'pressure' : (misfit ? 'misfit' : null);
    if (!lane) continue;

    var chance = lane === 'pressure' ? RELOCATION.PRESSURE_MOVE_CHANCE : RELOCATION.MISFIT_MOVE_CHANCE;
    if (rng() >= chance) continue;

    // ── Destination: best deterministic fit, must clear current by margin ──
    var currentFit = scoreHoodFit_(unit.income, current);
    if (!currentFit) continue;
    var best = null, bestName = '';
    for (var h = 0; h < hoodNames.length; h++) {
      var name = hoodNames[h];
      if (name === unit.hood) continue;
      var fit = scoreHoodFit_(unit.income, hoods[name]);
      if (!fit || fit.burden > RELOCATION.MAX_BURDEN) continue;
      if (!best || fit.score > best.score) { best = fit; bestName = name; }
    }
    if (!best || best.score < currentFit.score + RELOCATION.MIN_SCORE_GAIN) continue;

    // ── Reason (enum) + narrative phrase ──────────────────────────────────
    var reason, phrase;
    if (unit.maxRisk >= 9) {
      reason = MIGRATION_REASONS.DISPLACED;
      phrase = 'displaced from ' + unit.hood + ' (risk ' + unit.maxRisk + '/10)';
    } else if (lane === 'pressure') {
      reason = MIGRATION_REASONS.COST;
      phrase = 'priced out of ' + unit.hood;
    } else {
      reason = MIGRATION_REASONS.OPPORTUNITY;
      phrase = 'moving up from ' + unit.hood;
    }

    // ── Execute: mutate every member row in ctx.ledger (Phase 10 commits) ──
    for (var m = 0; m < unit.rowIdxs.length; m++) {
      var mRow = rows[unit.rowIdxs[m]];
      mRow[iNeighborhood] = bestName;
      mRow[iMigIntent] = MIGRATION_INTENT.STAYING;
      if (iMigReason >= 0) mRow[iMigReason] = reason;
      if (iMigDest >= 0) mRow[iMigDest] = bestName;
      if (iMigCycle >= 0) mRow[iMigCycle] = cycle;
    }
    ctx.ledger.dirty = true;

    // Household_Ledger: move + re-price (own-tracking sheet, documented exception)
    if (unit.key.indexOf('POP:') !== 0) {
      updateHouseholdLedgerMove_(ctx, unit.key, bestName, hoods[bestName].rent);
    }

    // ── Hook: the newsroom sees every move with its why ────────────────────
    var headRow = rows[unit.rowIdxs[0]];
    var who = ((headRow[iFirst] || '') + ' ' + (headRow[iLast] || '')).trim() || unit.key;
    if (unit.rowIdxs.length > 1) who = 'The ' + (headRow[iLast] || who) + ' household (' + unit.rowIdxs.length + ')';
    ctx.summary.storyHooks = ctx.summary.storyHooks || [];
    var moveHook = {
      hookType: 'CITIZEN_RELOCATED',
      severity: 5,
      description: who + ' moved from ' + unit.hood + ' to ' + bestName + ' — ' + phrase,
      cycleGenerated: cycle,
      popid: headRow[iPOPID],
      neighborhood: bestName,
      fromNeighborhood: unit.hood,
      reason: reason,
      eventType: EVENT_TYPES.MOVED_WITHIN
    };
    ctx.summary.storyHooks.push(moveHook);
    if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'migration', moveHook, 'migrationTrackingEngine');

    moved++;
  }

  if (moved > 0) Logger.log('processRelocations_: ' + moved + ' unit(s) relocated');
  return { moved: moved };
}

function updateHouseholdLedgerMove_(ctx, householdId, destHood, destRent) {
  // Direct write to own-tracking sheet — documented exception class
  // (engine.md Phase 5 citizen life engines: migrationTrackingEngine).
  try {
    var sheet = ctx.ss.getSheetByName('Household_Ledger');
    if (!sheet) return;
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return;
    var header = values[0];
    var idx = function(n) { return header.indexOf(n); };
    var iHH = idx('HouseholdId'), iHood = idx('Neighborhood'),
        iRent = idx('MonthlyRent'), iStatus = idx('Status'), iUpdated = idx('LastUpdated');
    if (iHH < 0) return;
    for (var r = 1; r < values.length; r++) {
      if (values[r][iHH] !== householdId) continue;
      if (iStatus >= 0 && String(values[r][iStatus]).toLowerCase() === 'dissolved') continue;
      if (iHood >= 0) sheet.getRange(r + 1, iHood + 1).setValue(destHood);
      if (iRent >= 0 && destRent > 0) sheet.getRange(r + 1, iRent + 1).setValue(destRent);
      if (iUpdated >= 0 && ctx.now) sheet.getRange(r + 1, iUpdated + 1).setValue(ctx.now);
      return;
    }
  } catch (err) {
    Logger.log('updateHouseholdLedgerMove_: ' + err);
  }
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

    // Track displacement by neighborhood — count actual planning intent
    // (S316 fix: risk>=7 counting fired 12 hoods/cycle once the rent-burden
    // signal went live, and mislabeled at-risk as planning; the hook text
    // says "planning to leave", so count exactly that)
    if (migIntent === MIGRATION_INTENT.PLANNING) {
      displacementByNeighborhood[neighborhood] = (displacementByNeighborhood[neighborhood] || 0) + 1;
    }

    // FORCED_MIGRATION (individual at severe risk)
    if (displRisk >= 9 && migIntent === MIGRATION_INTENT.PLANNING) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      var forcedHook = {
        hookType: 'FORCED_MIGRATION',
        severity: 7,
        description: first + ' ' + last + ' at severe displacement risk in ' + neighborhood + ' (risk: ' + displRisk + '/10)',
        cycleGenerated: cycle,
        popid: popid,
        neighborhood: neighborhood,
        displacementRisk: displRisk
      };
      ctx.summary.storyHooks.push(forcedHook);
      // engine.45 T1: hooks carried cause-in-description but never reached a sheet (trace E4)
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'migration', forcedHook, 'migrationTrackingEngine');
      alerts++;
    }
  }

  // MASS_EXODUS (5+ citizens at risk in same neighborhood)
  for (var hood in displacementByNeighborhood) {
    var count = displacementByNeighborhood[hood];
    if (count >= 5) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      var exodusHook = {
        hookType: 'MASS_EXODUS',
        severity: 8,
        description: hood + ' mass displacement risk: ' + count + ' residents planning to leave',
        cycleGenerated: cycle,
        neighborhood: hood,
        atRiskCount: count
      };
      ctx.summary.storyHooks.push(exodusHook);
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'migration', exodusHook, 'migrationTrackingEngine');
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
