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

  // engine.61 T5 (S321): capture WealthLevel before Step 2 recomputes it —
  // the diff is what mobility tracking reads at Step 5.
  var prevWealthLevels = captureWealthLevels_(ctx);

  // Step 2: Calculate wealth levels from income + assets
  var wealthResults = calculateCitizenWealth_(ctx);
  results.wealthUpdated = wealthResults.updated;

  // Step 2.4 (engine.61 T1, S321): the bank rate walks — mean-reverting,
  // nudged by last cycle's economic mood, carried in the cycle-state snapshot.
  results.bankRate = processBankRate_(ctx, cycle);

  // Step 2.5 (engine.60 S320): the money loop — savings accrue into NetWorth,
  // debt moves both ways, threshold moments reach LifeHistory + hooks.
  // engine.61 (S321): now weathered — rate scales yield/drag, neighborhood
  // credit shapes borrowing, honest shocks land inside the same pass.
  var loopResults = processMoneyLoop_(ctx, cycle);
  results.moneyLoop = loopResults;

  // Step 3: Process inheritance for recent deaths
  var inheritanceResults = processInheritance_(ctx, cycle);
  results.inheritanceProcessed = inheritanceResults.processed;

  // Step 4: Update household wealth aggregates
  var householdResults = updateHouseholdWealth_(ctx);
  results.householdsUpdated = householdResults.updated;

  // Step 5: Track wealth mobility (upward/downward)
  // engine.61 T5 (S321): real after a lifetime as a v1.0 placeholder.
  var mobilityResults = trackWealthMobility_(ctx, cycle, prevWealthLevels);
  results.mobilityDetected = mobilityResults.events;

  // Step 6: Home ownership opportunities
  var homeResults = trackHomeOwnership_(ss, ctx, cycle);
  results.homesPurchased = homeResults.purchased;

  // Step 7 (engine.63 S322): heritage — family lines join/found/score/ascend.
  var heritageResults = updateHeritage_(ss, ctx, cycle);
  results.heritage = heritageResults;

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

// ════════════════════════════════════════════════════════════════════════════
// engine.61 (S321) — BANKING, THE FLUCTUATION LAYER
// The money loop shipped with frozen physics; banking makes them weather.
// A city bank rate walks (mean-reverting, mood-nudged, genuine jitter) and
// scales savings yield + debt drag; neighborhood credit shapes how deep a
// crisis digs and what a paydown costs; honest dice hand citizens ruinous
// weeks and windfalls nobody softens. Bounds are physics, not output caps.
// Rate persists via PREV_CYCLE_STATE_JSON (finalizeCycleState v1.8).
// ════════════════════════════════════════════════════════════════════════════
var BANK_RATE_MEAN = 5.0;
var BANK_RATE_MIN = 2.0, BANK_RATE_MAX = 10.0;   // physical bounds
var BANK_RATE_REVERSION = 0.1;                    // ~10 cycles to walk home
var BANK_RATE_MOOD_NUDGE = 0.3;                   // booming city ≈ +0.15/cycle
var BANK_RATE_JITTER = 0.4;                       // the dice speak
var SHOCK_EXPENSE_P = 0.004;                      // ~once per ~5yr per citizen
var SHOCK_WINDFALL_P = 0.002;

// engine.61 diag-emit (same channel as ENGINE59_DIAG): the fire response
// carries the rate walk's why — persistence is otherwise invisible from
// outside (Script Properties + Logger only).
var ENGINE61_DIAG = null;

function processBankRate_(ctx, cycle) {
  var S = ctx.summary || (ctx.summary = {});
  var prev = S.previousCycleState || {};
  var rate = (typeof prev.bankRate === 'number') ? prev.bankRate : BANK_RATE_MEAN;
  var mood = (typeof prev.econMood === 'number') ? prev.econMood : 50;
  var rng = safeRand_(ctx);
  var nudge = ((mood - 50) / 100) * BANK_RATE_MOOD_NUDGE;
  var jitter = (rng() * 2 - 1) * BANK_RATE_JITTER;
  rate = rate + BANK_RATE_REVERSION * (BANK_RATE_MEAN - rate) + nudge + jitter;
  rate = Math.max(BANK_RATE_MIN, Math.min(BANK_RATE_MAX, Math.round(rate * 100) / 100));
  S.bankRate = rate;
  S.bankRateDesc = rate >= 7.5 ? 'tight' : rate >= 6 ? 'firming' :
                   rate > 4 ? 'steady' : rate > 2.5 ? 'easy' : 'loose';
  // DIAG-EMIT: the walk's inputs at the decision point.
  ENGINE61_DIAG = {
    rate: rate, desc: S.bankRateDesc,
    prevRate: (typeof prev.bankRate === 'number') ? prev.bankRate : null,
    mood: mood, nudge: Math.round(nudge * 100) / 100, jitter: Math.round(jitter * 100) / 100
  };
  Logger.log('ENGINE61_RATE: ' + rate + ' (' + S.bankRateDesc + ') prev=' +
    (prev.bankRate !== undefined ? prev.bankRate : 'none') + ' mood=' + mood +
    ' nudge=' + Math.round(nudge * 100) / 100 + ' jitter=' + Math.round(jitter * 100) / 100);
  return rate;
}

// Neighborhood credit as a COST factor: <1 in a rising hood (cheap paydown),
// >1 in a pressured one (costly paydown, deeper crisis digs). Reads the
// Phase-2 S.neighborhoodState load — one-cycle lag by design, zero new reads.
function creditFactorFor_(nbState, hood) {
  var st = nbState[String(hood || '').trim()];
  if (!st) return 1.0;
  var mom = (typeof st.trajectoryMomentum === 'number') ? st.trajectoryMomentum : 5;
  var press = (typeof st.housingPressure === 'number') ? st.housingPressure : 5;
  var f = 1 - (mom - 5) * 0.04 + Math.max(0, press - 7) * 0.03;
  return Math.max(0.75, Math.min(1.25, f));
}

function processMoneyLoop_(ctx, cycle) {
  var results = { accrued: 0, debtUp: 0, debtDown: 0, lines: 0, expense: 0, windfall: 0, deepDigs: 0 };
  // engine.61 T2 (S321): the rate reaches the loop. Factors normalize to 1.0
  // at the mean, so neutral weather reproduces the engine.60 proven baseline.
  var bankRate = (typeof ctx.summary.bankRate === 'number') ? ctx.summary.bankRate : BANK_RATE_MEAN;
  var yieldF = 0.6 + 0.08 * bankRate;   // savers win more in high-rate weeks
  var dragF = 0.5 + 0.1 * bankRate;     // debt bleeds harder in them too
  var nbState = ctx.summary.neighborhoodState || {};
  var rng = safeRand_(ctx);  // engine.61: deep-digs + shocks roll genuine dice
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return results;
  var idx = function(n) { return header.indexOf(n); };
  var iInc = idx('Income'), iNW = idx('NetWorth'),
      iSav = idx('SavingsRate'), iDebt = idx('DebtLevel'), iEdu = idx('EducationLevel'),
      iHH = idx('HouseholdId'), iBirth = idx('BirthYear'), iStatus = idx('Status'),
      iLife = idx('LifeHistory'), iHood = idx('Neighborhood');
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

    // engine.61 T2/T3: yield and drag ride the rate; credit rides the hood.
    var creditF = creditFactorFor_(nbState, iHood >= 0 ? row[iHood] : '');
    var accrual = Math.round((income / 52) * rate * eduF * superF * yieldF) -
                  Math.round(debt * DEBT_DRAG * dragF);
    var nwNew = Math.max(0, nw + accrual);
    var line = null;
    var debtBefore = debt;

    // debt accrues in a crisis household (borrowing to stay housed)
    if (hh.crisis && income > 0 && iDebt >= 0 && debt < 6) {
      debt++;
      // engine.61 T3: in a tight-credit hood the same crisis digs deeper —
      // bad terms compound. p scales with how far creditF sits above 1.
      if (creditF > 1 && debt < 6 && rng() < (creditF - 1) * 2) {
        debt++;
        results.deepDigs++;
      }
      if (debt >= 5) line = '[Money] the debts crossed a line this week — sleep comes harder now';
      else line = '[Money] borrowed against tomorrow to keep the ' + 'household afloat';
    }
    // debt pays down on sustained surplus (stateless cadence: row-offset mod)
    else if (debt > 0 && accrual > 0 && ((cycle + r) % DEBT_PAYDOWN_CYCLES === 0)) {
      debt--;
      // engine.61 T2/T3: payoff cost scales with the rate AND the hood's credit.
      nwNew = Math.max(0, nwNew - Math.round(DEBT_PAYOFF_COST * debtBefore * dragF * creditF));
      if (debt === 0 && debtBefore >= 3) line = '[Money] the last debt cleared — the ledger finally reads clean';
    }

    // engine.61 T4: honest dice — the week can hit, or hand you something.
    // One roll decides; probabilities are the physics, no caps on outcomes.
    var shockRoll = rng();
    if (shockRoll < SHOCK_EXPENSE_P) {
      var hit = Math.round((1500 + rng() * 6500) / 100) * 100;
      results.expense++;
      if (nwNew >= hit) {
        nwNew -= hit;
        if (!line) line = '[Money] an unplanned $' + hit + ' week — savings took the hit';
      } else {
        nwNew = 0;
        if (iDebt >= 0 && debt < 6) debt++;
        if (!line) line = '[Money] the bad week cost more than the savings could hold — borrowed to cover it';
      }
    } else if (shockRoll < SHOCK_EXPENSE_P + SHOCK_WINDFALL_P) {
      var gift = Math.round((2000 + rng() * 13000) / 100) * 100;
      nwNew += gift;
      results.windfall++;
      if (!line) line = '[Money] a windfall landed — $' + gift + ', banked';
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
      if (line.indexOf('crossed a line') >= 0 || line.indexOf('six figures') >= 0 ||
          line.indexOf('cost more than the savings') >= 0) {
        ctx.summary.storyHooks = ctx.summary.storyHooks || [];
        ctx.summary.storyHooks.push({
          hookType: line.indexOf('six figures') >= 0 ? 'MONEY_MILESTONE' :
                    line.indexOf('cost more than the savings') >= 0 ? 'MONEY_SHOCK' : 'DEBT_CRISIS',
          severity: 3, priority: 3,
          description: ((row[idx('First')] || '') + ' ' + (row[idx('Last')] || '')).trim() + ' — ' + line.replace('[Money] ', ''),
          cycleGenerated: cycle, neighborhood: row[idx('Neighborhood')] || '',
          domain: 'COMMUNITY', text: line.replace('[Money] ', '')
        });
      }
    }
  }
  if (results.accrued || results.debtUp || results.debtDown) ctx.ledger.dirty = true;
  if (ENGINE61_DIAG) ENGINE61_DIAG.loop = {
    accrued: results.accrued, debtUp: results.debtUp, debtDown: results.debtDown,
    deepDigs: results.deepDigs, expense: results.expense, windfall: results.windfall
  };
  Logger.log('processMoneyLoop_ engine.61: rate ' + bankRate + ', accrued ' + results.accrued +
    ', debt +' + results.debtUp + '/-' + results.debtDown + ' (deep ' + results.deepDigs + ')' +
    ', shocks ' + results.expense + 'x/' + results.windfall + 'w, lines ' + results.lines);
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
// WEALTH MOBILITY TRACKING — REAL as of engine.61 T5 (S321).
// Placeholder since v1.0; the call site at Step 5 waited years for a body.
// Diffs the WealthLevel captured before Step 2's recompute against the new
// value: a move of 2+ rungs in one cycle is a life moment, not noise.
// ════════════════════════════════════════════════════════════════════════════

function captureWealthLevels_(ctx) {
  var header = ctx.ledger.headers, rows = ctx.ledger.rows;
  var iPop = header.indexOf('POPID'), iWL = header.indexOf('WealthLevel');
  var map = {};
  if (iPop < 0 || iWL < 0) return map;
  for (var r = 0; r < rows.length; r++) {
    if (rows[r] && rows[r][iPop]) map[String(rows[r][iPop]).trim()] = Number(rows[r][iWL]) || 0;
  }
  return map;
}

function trackWealthMobility_(ctx, cycle, prevLevels) {
  var results = { events: 0, up: 0, down: 0 };
  var header = ctx.ledger.headers, rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iWL = idx('WealthLevel'), iStatus = idx('Status'),
      iBirth = idx('BirthYear'), iLife = idx('LifeHistory');
  if (iPop < 0 || iWL < 0 || iLife < 0 || !prevLevels) return results;

  var simYear = 2040 + Math.floor(cycle / 52);
  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    if (String(row[iStatus] || 'active').toLowerCase() !== 'active') continue;
    var by = iBirth >= 0 ? (Number(row[iBirth]) || 0) : 0;
    if (by > 0 && (simYear - by) < 18) continue; // minors: no mobility arc yet
    var prev = prevLevels[String(row[iPop]).trim()];
    // prev >= 2 gate: a first WealthLevel (settlement kids, fresh promotions
    // from GC) is an entry, not mobility — the arc needs a standing to move from.
    if (typeof prev !== 'number' || prev < 2) continue;
    var now = Number(row[iWL]) || 0;
    var delta = now - prev;
    if (delta < 2 && delta > -2) continue;

    results.events++;
    if (delta > 0) results.up++; else results.down++;
    var life = String(row[iLife] || '');
    // engine.60 display bound holds: one [Money] line per citizen per cycle.
    if (life.indexOf(stamp + ' — [Money]') >= 0) continue;
    var line = delta > 0 ?
      '[Money] moved up in the world — the ledger says so' :
      '[Money] the ground gave a little — ' + Math.abs(delta) + ' rungs down in one season';
    row[iLife] = (life ? life + '\n' : '') + stamp + ' — ' + line;
    ctx.summary.storyHooks = ctx.summary.storyHooks || [];
    ctx.summary.storyHooks.push({
      hookType: 'WEALTH_MOBILITY',
      severity: 4, priority: 3,
      description: ((row[idx('First')] || '') + ' ' + (row[idx('Last')] || '')).trim() +
        ' — ' + line.replace('[Money] ', '') + ' (' + prev + '→' + now + ')',
      cycleGenerated: cycle, neighborhood: row[idx('Neighborhood')] || '',
      domain: 'COMMUNITY', text: line.replace('[Money] ', '')
    });
  }

  if (results.events > 0) ctx.ledger.dirty = true;
  if (ENGINE61_DIAG) ENGINE61_DIAG.mobility = { events: results.events, up: results.up, down: results.down };
  Logger.log('trackWealthMobility_ engine.61 T5: ' + results.events +
    ' moves (' + results.up + ' up / ' + results.down + ' down)');
  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// HOME OWNERSHIP
// ════════════════════════════════════════════════════════════════════════════

function trackHomeOwnership_(ss, ctx, cycle) {
  // Would track home purchases based on wealth + savings
  // For v1.0, this is a placeholder
  return { purchased: 0 };
}


// ════════════════════════════════════════════════════════════════════════════
// engine.63 (S322) — HERITAGE: FAMILY LINES
// Names display, NUMBERS track (Mike-direct S322). Heritage_Ledger holds one
// row per family line keyed LIN-##### — the id survives marriages, moves, and
// household dissolutions (Household_Ledger rows die with DissolvedCycle; a
// line does not). Membership grows through lived events only: kids inherit a
// parent's line, a spouse joins the line whose surname they took (MaidenName
// keeps their birth line), a married line-less pair founds a new line. Score
// is PHYSICS — accrued each cycle from real ledger state (wealth, generations,
// civic roles, fame, businesses, homes); tiers promote at thresholds; which
// lines become dynasties EMERGES, never assigned. Seed: heritage_seed.js (T1).
// Heritage_Ledger is this engine's own tracking sheet (Phase 5 Tier-5 class);
// full-table rewrite is safe — no later phase reads it within the cycle.
// ════════════════════════════════════════════════════════════════════════════

var HERITAGE_TIERS = [
  { name: 'Founding', min: 0 },
  { name: 'Established', min: 50 },
  { name: 'Prominent', min: 150 },
  { name: 'Dynasty', min: 350 }
];

function heritageTierFor_(score) {
  var t = HERITAGE_TIERS[0].name;
  for (var i = 0; i < HERITAGE_TIERS.length; i++) {
    if (score >= HERITAGE_TIERS[i].min) t = HERITAGE_TIERS[i].name;
  }
  return t;
}

function heritageRank_(tierName) {
  for (var i = 0; i < HERITAGE_TIERS.length; i++) {
    if (HERITAGE_TIERS[i].name === tierName) return i;
  }
  return 0;
}

// engine.63 T3 — deterministic 8-hex id fragment for CUL rows (djb2, Apps
// Script-safe; mirrors the CUL-XXXXXXXX convention in Cultural_Ledger).
function heritageHash8_(s) {
  var h = 5381;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  var hex = (h >>> 0).toString(16).toUpperCase();
  while (hex.length < 8) hex = '0' + hex;
  return hex.slice(0, 8);
}

// engine.63 T3 — family business flavor by sector; name pattern is
// deterministic per line (no gendered '& Sons' — lines are whole families).
var HERITAGE_BIZ_SECTORS = [
  { sector: 'Restaurant', suffix: 'Kitchen' },
  { sector: 'Retail', suffix: 'Mercantile' },
  { sector: 'Real Estate', suffix: 'Properties' },
  { sector: 'Construction', suffix: 'Builders' },
  { sector: 'Professional Services', suffix: '& Co.' },
  { sector: 'Arts & Media', suffix: 'Studio' }
];

function updateHeritage_(ss, ctx, cycle) {
  var results = { lines: 0, joined: 0, founded: 0, promoted: 0 };
  var hlSheet = ss.getSheetByName('Heritage_Ledger');
  if (!hlSheet) return results; // T1 seed hasn't run on this spreadsheet — quiet no-op

  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iLast = idx('Last'), iLin = idx('LineageId'),
      iStatus = idx('Status'), iSpouse = idx('SpouseId'), iParents = idx('ParentIds'),
      iChildren = idx('ChildrenIds'), iNW = idx('NetWorth'), iCiv = idx('CIV (y/n)'),
      iUsage = idx('UsageCount'), iBirth = idx('BirthYear'), iLife = idx('LifeHistory');
  if (iPop < 0 || iLin < 0) return results;

  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);
  var popIdOf = function(v) { var m = String(v || '').match(/POP-\d+/); return m ? m[0] : null; };

  var rowByPop = {};
  for (var r0 = 0; r0 < rows.length; r0++) {
    if (rows[r0] && rows[r0][iPop]) rowByPop[String(rows[r0][iPop]).trim()] = rows[r0];
  }

  // ── Heritage_Ledger snapshot ──
  var hv = hlSheet.getDataRange().getValues();
  var hh = hv[0];
  var hIdx = function(n) { return hh.indexOf(n); };
  var hLin = hIdx('LineageId'), hName = hIdx('FamilyName'), hFounder = hIdx('FounderPopId'),
      hFounded = hIdx('FoundedCycle'), hGen = hIdx('Generations'), hLiving = hIdx('LivingMembers'),
      hMem = hIdx('MembersList'), hScore = hIdx('HeritageScore'), hTier = hIdx('HeritageTier'),
      hNW = hIdx('TotalNetWorth'), hHomes = hIdx('HomesOwned'), hBiz = hIdx('BusinessesOwned'),
      hCiv = hIdx('CivicMembers'), hFame = hIdx('FameMembers'), hUpd = hIdx('LastUpdated');

  var lines = {}; // linId -> {row array from hv}
  var maxLin = 0;
  for (var r1 = 1; r1 < hv.length; r1++) {
    var lid = String(hv[r1][hLin] || '').trim();
    if (!lid) continue;
    lines[lid] = hv[r1];
    var lm = /^LIN-(\d+)$/.exec(lid);
    if (lm && +lm[1] > maxLin) maxLin = +lm[1];
  }

  // ── membership growth: lived events, never re-derivation ──
  for (var r2 = 0; r2 < rows.length; r2++) {
    var row = rows[r2];
    if (!row || !row[iPop]) continue;
    if (String(row[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    if (String(row[iLin] || '').trim()) continue;

    // Kid inherits: any parent already in a line.
    var joined = false;
    var pids = [];
    try { pids = JSON.parse(String(row[iParents] || '[]')); } catch (e) { pids = []; }
    for (var k = 0; k < pids.length && !joined; k++) {
      var pr = rowByPop[popIdOf(pids[k])];
      if (pr && String(pr[iLin] || '').trim() && lines[String(pr[iLin]).trim()]) {
        row[iLin] = String(pr[iLin]).trim();
        joined = true;
      }
    }
    // Spouse joins the line whose surname they took (name follows the house;
    // their MaidenName keeps the birth line for later chains).
    if (!joined) {
      var sp = rowByPop[popIdOf(row[iSpouse])];
      if (sp && String(sp[iLin] || '').trim() && lines[String(sp[iLin]).trim()] &&
          String(sp[iLast] || '').trim() === String(row[iLast] || '').trim()) {
        row[iLin] = String(sp[iLin]).trim();
        joined = true;
      }
    }
    if (joined) { results.joined++; ctx.ledger.dirty = true; }
  }

  // ── founding: a married line-less pair founds a line when they share a
  // surname OR a household (matches the T1 seed, which founded from
  // couple/family-household components regardless of surname). Line takes
  // the elder partner's surname as display. ──
  var iHHf = idx('HouseholdId');
  for (var r3 = 0; r3 < rows.length; r3++) {
    var fRow = rows[r3];
    if (!fRow || !fRow[iPop]) continue;
    if (String(fRow[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    if (String(fRow[iLin] || '').trim()) continue;
    var fSp = rowByPop[popIdOf(fRow[iSpouse])];
    if (!fSp || String(fSp[iLin] || '').trim()) continue;
    if (String(fSp[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    var lastA = String(fRow[iLast] || '').trim();
    var sameName = lastA && lastA === String(fSp[iLast] || '').trim();
    var hhA = iHHf >= 0 ? String(fRow[iHHf] || '').trim() : '';
    var sameHouse = hhA && hhA === String(fSp[iHHf] || '').trim();
    if (!sameName && !sameHouse) continue;

    var newLin = 'LIN-' + String(++maxLin).padStart(5, '0');
    var aBirth = Number(fRow[iBirth]) || 9999, bBirth = Number(fSp[iBirth]) || 9999;
    var aElder = aBirth < bBirth || (aBirth === bBirth && String(fRow[iPop]) < String(fSp[iPop]));
    var founder = aElder ? String(fRow[iPop]).trim() : String(fSp[iPop]).trim();
    var lineName = sameName ? lastA :
      String((aElder ? fRow : fSp)[iLast] || lastA).trim(); // elder's surname displays
    fRow[iLin] = newLin;
    fSp[iLin] = newLin;
    ctx.ledger.dirty = true;
    var newHl = new Array(hh.length).fill('');
    newHl[hLin] = newLin; newHl[hName] = lineName; newHl[hFounder] = founder;
    newHl[hFounded] = cycle; newHl[hGen] = 1; newHl[hScore] = 0;
    newHl[hTier] = 'Founding'; newHl[hBiz] = '[]'; newHl[hUpd] = cycle;
    lines[newLin] = newHl;
    results.founded++;
  }

  // ── aggregates + score accrual + tier promotion ──
  var membersByLine = {};
  for (var r4 = 0; r4 < rows.length; r4++) {
    var mRow = rows[r4];
    if (!mRow || !mRow[iPop]) continue;
    var ml = String(mRow[iLin] || '').trim();
    if (ml && lines[ml]) (membersByLine[ml] = membersByLine[ml] || []).push(mRow);
  }

  var outRows = [];
  // T3 state: lazy Business_Ledger max-id read (only when a line qualifies),
  // shared counter so same-cycle multi-founding can't collide ids.
  var nextBizNum = null;
  var promotedLines = [], businessesOpened = [], dynasties = [];
  for (var linId in lines) {
    if (!lines.hasOwnProperty(linId)) continue;
    var hl = lines[linId];
    var members = membersByLine[linId] || [];
    var living = 0, totalNW = 0, civ = 0, fame = 0;
    var memberIds = [];
    var memberSet = {};
    for (var m2 = 0; m2 < members.length; m2++) {
      var mr = members[m2];
      var mid = String(mr[iPop]).trim();
      memberIds.push(mid);
      memberSet[mid] = true;
      if (String(mr[iStatus] || 'active').toLowerCase() === 'deceased') continue;
      living++;
      totalNW += Number(String(mr[iNW]).replace(/[$,\s]/g, '')) || 0;
      if (String(mr[iCiv] || '').toLowerCase() === 'yes') civ++;
      if ((Number(mr[iUsage]) || 0) >= 5) fame++;
    }
    // Generations: longest parent->child chain inside the line.
    var genMemo = {};
    var genDepth = function(pid, seen) {
      if (genMemo[pid] !== undefined) return genMemo[pid];
      if (seen[pid]) return 1;
      seen[pid] = true;
      var kids = [];
      try { kids = JSON.parse(String((rowByPop[pid] || [])[iChildren] || '[]')); } catch (e) { kids = []; }
      var best = 0;
      for (var g = 0; g < kids.length; g++) {
        var kid = popIdOf(kids[g]);
        if (kid && memberSet[kid]) best = Math.max(best, genDepth(kid, seen));
      }
      delete seen[pid];
      genMemo[pid] = 1 + best;
      return genMemo[pid];
    };
    var generations = 1;
    for (var m3 = 0; m3 < memberIds.length; m3++) {
      generations = Math.max(generations, genDepth(memberIds[m3], {}));
    }

    var homes = Number(hl[hHomes]) || 0; // written by home-purchase (T4); carried until then
    var bizList = [];
    try { bizList = JSON.parse(String(hl[hBiz] || '[]')); } catch (e) { bizList = []; }

    // Score accrual — physics per cycle, no caps on the total (SIM_DOCTRINE):
    // wealth compounds (capped per-cycle contribution, not per-line total),
    // depth of the line, civic presence, fame, owned assets.
    var pts = Math.min(4, totalNW / 500000) +
      Math.max(0, generations - 1) +
      Math.min(3, civ) + Math.min(3, fame) +
      (bizList.length * 2) + homes;
    var score = (Number(hl[hScore]) || 0) + Math.round(pts * 10) / 10;
    var oldTier = String(hl[hTier] || 'Founding');
    var newTier = heritageTierFor_(score);

    hl[hName] = hl[hName] || '';
    hl[hGen] = generations;
    hl[hLiving] = living;
    hl[hMem] = JSON.stringify(memberIds.sort());
    hl[hScore] = Math.round(score * 10) / 10;
    hl[hTier] = newTier;
    hl[hNW] = totalNW;
    hl[hCiv] = civ;
    hl[hFame] = fame;
    hl[hUpd] = cycle;

    // ── T3 ascension: a Prominent+ line with no business opens one ──
    // Real capital, real stake: the wealthiest living member stakes 20% of
    // their NetWorth (min $50k, needs $100k+). Business lands in
    // Business_Ledger via write-intent (Phase 10 commits); runCareerEngine's
    // live pool picks it up next cycle, so the family firm starts hiring.
    if (heritageRank_(newTier) >= 2 && bizList.length === 0) {
      var stakePop = null, stakeRow = null, stakeNW = 0;
      for (var s1 = 0; s1 < members.length; s1++) {
        var sRow = members[s1];
        if (String(sRow[iStatus] || 'active').toLowerCase() === 'deceased') continue;
        var sNW = Number(String(sRow[iNW]).replace(/[$,\s]/g, '')) || 0;
        if (sNW > stakeNW) { stakeNW = sNW; stakeRow = sRow; stakePop = String(sRow[iPop]).trim(); }
      }
      if (stakeRow && stakeNW >= 100000) {
        if (nextBizNum === null) {
          nextBizNum = 1;
          try {
            var bizSheet = ss.getSheetByName('Business_Ledger');
            var bizVals = bizSheet.getDataRange().getValues();
            for (var b1 = 1; b1 < bizVals.length; b1++) {
              var bm = /^BIZ-(\d+)$/.exec(String(bizVals[b1][0] || '').trim());
              if (bm && +bm[1] >= nextBizNum) nextBizNum = +bm[1] + 1;
            }
          } catch (eB) { nextBizNum = null; }
        }
        if (nextBizNum !== null) {
          var capital = Math.max(50000, Math.round(stakeNW * 0.2));
          var flavor = HERITAGE_BIZ_SECTORS[parseInt(heritageHash8_(linId), 16) % HERITAGE_BIZ_SECTORS.length];
          var bizId = 'BIZ-' + String(nextBizNum++).padStart(5, '0');
          var bizName = String(hl[hName]) + ' ' + flavor.suffix;
          var bizNbhd = String(stakeRow[idx('Neighborhood')] || '') || 'Downtown';
          stakeRow[iNW] = stakeNW - capital;
          ctx.ledger.dirty = true;
          queueAppendIntent_(ctx, 'Business_Ledger',
            [bizId, bizName, flavor.sector, bizNbhd, 2, 62000, capital * 4, 0.03,
             stakePop + ' ' + String(stakeRow[idx('First')] || '') + ' ' + String(stakeRow[idx('Last')] || '')],
            'engine.63 T3 family business founding (' + linId + ')', 'COMMUNITY', 70);
          bizList.push(bizId);
          hl[hBiz] = JSON.stringify(bizList);
          var openLife = String(stakeRow[iLife] || '');
          if (openLife.indexOf(stamp + ' — [Heritage] opened') < 0) {
            stakeRow[iLife] = (openLife ? openLife + '\n' : '') + stamp +
              ' — [Heritage] opened ' + bizName + ' in ' + bizNbhd + ' — the family has a storefront now';
          }
          ctx.summary.storyHooks = ctx.summary.storyHooks || [];
          ctx.summary.storyHooks.push({
            hookType: 'HERITAGE_BUSINESS_OPENING', severity: 4, priority: 4,
            description: 'The ' + String(hl[hName]) + ' family (' + newTier + ' line) opened ' + bizName +
              ' in ' + bizNbhd + ' — $' + capital + ' of family capital staked by ' + stakePop,
            cycleGenerated: cycle, neighborhood: bizNbhd, domain: 'COMMUNITY',
            text: 'The ' + String(hl[hName]) + ' family opened ' + bizName
          });
          businessesOpened.push({ lineageId: linId, family: String(hl[hName]), bizId: bizId, name: bizName, neighborhood: bizNbhd });
        }
      }
    }

    // Promotion is an event the family lives — one line per living member,
    // once per promotion (tier changes are rare by construction).
    if (heritageRank_(newTier) > heritageRank_(oldTier)) {
      results.promoted++;
      promotedLines.push({ lineageId: linId, family: String(hl[hName] || linId), tier: newTier });
      var famName = String(hl[hName] || linId);
      var promoLine = newTier === 'Dynasty' ?
        '[Heritage] the ' + famName + ' name now belongs to Oakland itself — a dynasty by any measure' :
        newTier === 'Prominent' ?
        '[Heritage] doors open when the ' + famName + ' name is spoken — the line is prominent now' :
        '[Heritage] the ' + famName + ' line has roots deep enough to notice — established';
      for (var m4 = 0; m4 < members.length; m4++) {
        var pRow = members[m4];
        if (String(pRow[iStatus] || 'active').toLowerCase() === 'deceased') continue;
        var lifeStr = String(pRow[iLife] || '');
        if (lifeStr.indexOf(stamp + ' — [Heritage]') >= 0) continue;
        pRow[iLife] = (lifeStr ? lifeStr + '\n' : '') + stamp + ' — ' + promoLine;
      }
      ctx.ledger.dirty = true;
      if (heritageRank_(newTier) >= 2) { // Prominent+ reaches the newsroom
        ctx.summary.storyHooks = ctx.summary.storyHooks || [];
        ctx.summary.storyHooks.push({
          hookType: newTier === 'Dynasty' ? 'HERITAGE_DYNASTY' : 'HERITAGE_PROMINENT',
          severity: newTier === 'Dynasty' ? 5 : 4,
          priority: newTier === 'Dynasty' ? 5 : 4,
          description: 'The ' + String(hl[hName]) + ' family line (' + linId + ') reached ' + newTier +
            ' — ' + living + ' living members across ' + generations + ' generations, $' + totalNW + ' held',
          cycleGenerated: cycle, neighborhood: '', domain: 'COMMUNITY',
          text: 'The ' + String(hl[hName]) + ' line reached ' + newTier
        });
        // T3: a Dynasty becomes a cultural institution — Cultural_Ledger row
        // (intent path; CUL-id deterministic per line so re-promotion can't
        // duplicate: the [Heritage] guard above already gates, this is belt).
        if (newTier === 'Dynasty') {
          var wealthiest = null, wNW = -1;
          for (var w1 = 0; w1 < members.length; w1++) {
            if (String(members[w1][iStatus] || 'active').toLowerCase() === 'deceased') continue;
            var wv = Number(String(members[w1][iNW]).replace(/[$,\s]/g, '')) || 0;
            if (wv > wNW) { wNW = wv; wealthiest = String(members[w1][iPop]).trim(); }
          }
          queueAppendIntent_(ctx, 'Cultural_Ledger',
            ['C' + cycle, 'CUL-' + heritageHash8_(linId), 'The ' + String(hl[hName]) + ' Family',
             'Institution', 'dynasty', 'Community', 'Active', wealthiest || '',
             cycle, cycle, 0, Math.round(score), 'rising', 'engine.63', 0, '', '', '', '', ''],
            'engine.63 T3 dynasty cultural institution (' + linId + ')', 'COMMUNITY', 70);
          dynasties.push({ lineageId: linId, family: String(hl[hName]) });
        }
      }
    }
    outRows.push(hl);
    results.lines++;
  }

  // Deterministic order: by LIN id. Full-table rewrite (own tracking sheet).
  outRows.sort(function(a, b) { return String(a[hLin]) < String(b[hLin]) ? -1 : 1; });
  if (outRows.length) {
    hlSheet.getRange(2, 1, outRows.length, hh.length).setValues(outRows);
  }

  // Evening engines / phase-8 consumers read the cycle's heritage signal here.
  results.businessesOpened = businessesOpened.length;
  ctx.summary.heritage = {
    lines: results.lines, joined: results.joined,
    founded: results.founded, promoted: results.promoted,
    promotedLines: promotedLines, businessesOpened: businessesOpened,
    dynasties: dynasties
  };

  Logger.log('updateHeritage_ engine.63: lines ' + results.lines + ', joined ' + results.joined +
    ', founded ' + results.founded + ', promoted ' + results.promoted);
  return results;
}
