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

  // Step 2.5 (engine.60 S320): the money loop — savings accrue into NetWorth,
  // debt moves both ways, threshold moments reach LifeHistory + hooks.
  var loopResults = processMoneyLoop_(ctx, cycle);
  results.moneyLoop = loopResults;

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
// engine.60 (S320) — THE MONEY LOOP
// Savings accrual finally READS SavingsRate (it had zero readers since it was
// written); NetWorth grows from lived income, not only inheritance; DebtLevel
// moves both ways instead of staying a birthmark; threshold moments write
// LifeHistory + story hooks so the cron life feels its ledger. Mike-direct:
// education → better savings; SuperCouple households get their first "math
// in their favor"; once married the household drives events → dials → kids.
// ════════════════════════════════════════════════════════════════════════════
var DEBT_DRAG = 40;            // per level per cycle — level 6 bleeds ~12.5k/yr
var DEBT_PAYDOWN_CYCLES = 6;   // surplus cadence to shed a level
var DEBT_PAYOFF_COST = 800;    // × level, paid from NetWorth
var EDU_SAVINGS_FACTOR = { doctorate: 1.2, masters: 1.2, bachelors: 1.1 };
var SUPERCOUPLE_SAVINGS_FACTOR = 1.2;
var NETWORTH_MILESTONE = 100000;

function processMoneyLoop_(ctx, cycle) {
  var results = { accrued: 0, debtUp: 0, debtDown: 0, lines: 0 };
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return results;
  var idx = function(n) { return header.indexOf(n); };
  var iInc = idx('Income'), iNW = idx('NetWorth'),
      iSav = idx('SavingsRate'), iDebt = idx('DebtLevel'), iEdu = idx('EducationLevel'),
      iHH = idx('HouseholdId'), iBirth = idx('BirthYear'), iStatus = idx('Status'),
      iLife = idx('LifeHistory');
  if (iInc < 0 || iNW < 0 || iSav < 0) return results;
  var simYear = 2040 + Math.floor(cycle / 52);
  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);

  // Household money state: crisis + SuperCouple, one read
  var hhState = {};
  var hhSheet = ctx.ss.getSheetByName('Household_Ledger');
  if (hhSheet) {
    var hv = hhSheet.getDataRange().getValues();
    var hj = function(n) { return hv[0].indexOf(n); };
    var cId = hj('HouseholdId'), cInc = hj('HouseholdIncome'), cRent = hj('MonthlyRent'),
        cSav = hj('HouseholdSavings'), cSuper = hj('SuperCouple'), cStat = hj('Status');
    for (var q = 1; q < hv.length; q++) {
      if (String(hv[q][cStat] || '').toLowerCase() !== 'active') continue;
      var hInc = Number(hv[q][cInc]) || 0;
      var rentA = (Number(hv[q][cRent]) || 0) * 12;
      hhState[String(hv[q][cId])] = {
        crisis: hInc > 0 && rentA / hInc >= 0.5 &&
                (Number(hv[q][cSav]) || 0) < (Number(hv[q][cRent]) || 0) * 12,
        superCouple: cSuper >= 0 && String(hv[q][cSuper] || '').toLowerCase() === 'yes'
      };
    }
  }

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (String(row[iStatus] || 'active').toLowerCase() !== 'active') continue;
    var by = iBirth >= 0 ? (Number(row[iBirth]) || 0) : 0;
    if (by > 0 && (simYear - by) < 18) continue; // minors hold no money loop

    var income = Number(row[iInc]) || 0;
    var rate = Number(row[iSav]) || 0;
    var debt = iDebt >= 0 ? (Number(row[iDebt]) || 0) : 0;
    var nw = Number(row[iNW]) || 0;
    var hh = hhState[String(row[iHH] || '').trim()] || { crisis: false, superCouple: false };
    var eduF = EDU_SAVINGS_FACTOR[String(row[iEdu] || '').toLowerCase()] || 1.0;
    var superF = hh.superCouple ? SUPERCOUPLE_SAVINGS_FACTOR : 1.0;

    var accrual = Math.round((income / 52) * rate * eduF * superF) - (debt * DEBT_DRAG);
    var nwNew = Math.max(0, nw + accrual);
    var line = null;
    var debtBefore = debt;

    // debt accrues in a crisis household (borrowing to stay housed)
    if (hh.crisis && income > 0 && iDebt >= 0 && debt < 6) {
      debt++;
      if (debt === 5) line = '[Money] the debts crossed a line this week — sleep comes harder now';
      else line = '[Money] borrowed against tomorrow to keep the ' + 'household afloat';
    }
    // debt pays down on sustained surplus (stateless cadence: row-offset mod)
    else if (debt > 0 && accrual > 0 && ((cycle + r) % DEBT_PAYDOWN_CYCLES === 0)) {
      debt--;
      nwNew = Math.max(0, nwNew - DEBT_PAYOFF_COST * debtBefore);
      if (debt === 0 && debtBefore >= 3) line = '[Money] the last debt cleared — the ledger finally reads clean';
    }
    // milestone: first crossing of 100k lived wealth
    if (!line && nw < NETWORTH_MILESTONE && nwNew >= NETWORTH_MILESTONE &&
        String(row[iLife] || '').indexOf('crossed six figures') < 0) {
      line = '[Money] savings crossed six figures — years of steady weeks did that';
    }

    if (nwNew !== nw) { row[iNW] = nwNew; results.accrued++; }
    if (iDebt >= 0 && debt !== debtBefore) {
      row[iDebt] = debt;
      if (debt > debtBefore) results.debtUp++; else results.debtDown++;
    }
    if (line && iLife >= 0) {
      row[iLife] = (row[iLife] ? row[iLife] + '\n' : '') + stamp + ' — ' + line;
      results.lines++;
      if (line.indexOf('crossed a line') >= 0 || line.indexOf('six figures') >= 0) {
        ctx.summary.storyHooks = ctx.summary.storyHooks || [];
        ctx.summary.storyHooks.push({
          hookType: line.indexOf('six figures') >= 0 ? 'MONEY_MILESTONE' : 'DEBT_CRISIS',
          severity: 3, priority: 3,
          description: ((row[idx('First')] || '') + ' ' + (row[idx('Last')] || '')).trim() + ' — ' + line.replace('[Money] ', ''),
          cycleGenerated: cycle, neighborhood: row[idx('Neighborhood')] || '',
          domain: 'COMMUNITY', text: line.replace('[Money] ', '')
        });
      }
    }
  }
  if (results.accrued || results.debtUp || results.debtDown) ctx.ledger.dirty = true;
  Logger.log('processMoneyLoop_ engine.60: accrued ' + results.accrued + ', debt +' + results.debtUp + '/-' + results.debtDown + ', lines ' + results.lines);
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
  var iBirthYear = idx('BirthYear');

  if (iIncome < 0 || iLife < 0) return { updated: 0 };

  // v14.2: Deterministic RNG (fixes Math.random bug from v1.0)
  var rng = safeRand_(ctx);

  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;
  var simYear = 2040 + Math.floor(cycle / 52);

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased' || status === 'inactive') continue;

    // Minors earn nothing (S318 age gate; floor raised 16→18 by S320
    // kid-age ruling). Missing BirthYear is treated as adult — same
    // fallback the career engine uses.
    var birthYear = iBirthYear >= 0 ? (Number(row[iBirthYear]) || 0) : 0;
    var age = birthYear > 0 ? (simYear - birthYear) : 30;
    if (age < 18) {
      if (Number(row[iIncome]) !== 0) {
        row[iIncome] = 0;
        updated++;
      }
      continue;
    }

    // v14.2: Skip citizens with economic profiles — income already set by
    // applyEconomicProfiles.js seeding script and adjusted by Career Engine
    // transitions. Only recalculate for unseeded citizens (fallback path).
    // S319: SPORTS_OVERRIDE skips too — the sports layer owns athlete pay
    // (seeder writes income:null for it; career engine never touches it).
    // The old exclusion re-rolled 90 athlete salaries every cycle.
    var econKey = iEconKey >= 0 ? (row[iEconKey] || '').toString().trim() : '';
    if (econKey !== '') {
      continue; // Income managed externally
    }

    // S319: fallback FILLS, never re-rolls — an unseeded citizen with a
    // nonzero Income keeps it. The old per-cycle recalc overwrote 258
    // unseeded citizens (incl. manual salary backfills) on every run.
    if ((Number(row[iIncome]) || 0) > 0) {
      continue;
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

    // engine.56 (S316): estate resolves HOUSEHOLD-FIRST. Before this, heirs
    // were children-only (ParentIds — near-empty column, 3 citizens) and any
    // estate without children silently vanished: spouses inherited nothing.
    // Now: household survivors and outside children split 50/50; either group
    // alone takes all. Children living with the deceased ARE household
    // survivors (counted once). Only a citizen who dies with neither leaves
    // an unresolved estate (unchanged skip — rare, and a story in itself).
    var children = findHeirs_(ctx, deceasedId);
    var householdSurvivors = findHouseholdSurvivors_(ctx, deceasedId);
    var childrenOutside = [];
    for (var ch = 0; ch < children.length; ch++) {
      if (householdSurvivors.indexOf(children[ch]) < 0) childrenOutside.push(children[ch]);
    }
    if (householdSurvivors.length === 0 && childrenOutside.length === 0) continue;

    // Calculate inheritance (80% of net worth, 20% "lost" to taxes/fees)
    var totalInheritance = Math.round(deceasedWealth.netWorth * 0.8);
    var heirCount = householdSurvivors.length + childrenOutside.length;

    if (householdSurvivors.length && childrenOutside.length) {
      distributeInheritance_(ctx, householdSurvivors,
        Math.round(totalInheritance * 0.5 / householdSurvivors.length), deceasedId, cycle);
      distributeInheritance_(ctx, childrenOutside,
        Math.round(totalInheritance * 0.5 / childrenOutside.length), deceasedId, cycle);
    } else if (householdSurvivors.length) {
      distributeInheritance_(ctx, householdSurvivors,
        Math.round(totalInheritance / householdSurvivors.length), deceasedId, cycle);
    } else {
      distributeInheritance_(ctx, childrenOutside,
        Math.round(totalInheritance / childrenOutside.length), deceasedId, cycle);
    }

    // Generate story hook if significant
    if (totalInheritance > 50000) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'GENERATIONAL_WEALTH_TRANSFER',
        severity: totalInheritance > 200000 ? 7 : 5,
        description: 'Inheritance of $' + totalInheritance.toLocaleString() + ' distributed to ' + heirCount + ' heirs',
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

function findHouseholdSurvivors_(ctx, deceasedId) {
  // engine.56 (S316): living citizens sharing the deceased's HouseholdId.
  // Reads ctx.ledger (Phase 42 §5.6) — sees same-cycle household repairs
  // from Phase5-HouseholdFormation's reconcile pass.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return [];

  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID');
  var iStatus = idx('Status');
  var iHH = idx('HouseholdId');
  if (iHH < 0) return [];

  var deceasedHH = '';
  for (var d = 0; d < rows.length; d++) {
    if (rows[d][iPOPID] === deceasedId) { deceasedHH = rows[d][iHH] || ''; break; }
  }
  if (!deceasedHH) return [];

  var survivors = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (row[iPOPID] === deceasedId) continue;
    if ((row[iStatus] || 'active').toString().toLowerCase() === 'deceased') continue;
    if (row[iHH] === deceasedHH) survivors.push(row[iPOPID]);
  }
  survivors.sort();
  return survivors;
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

      // engine.60 (S320): SavingsBalance write RETIRED — zero readers ever,
      // and it name-collided with HouseholdSavings (householdFormationEngine,
      // which HAS a reader: the rent-crisis buffer). One concept, one column.

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
