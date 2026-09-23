/**
 * ============================================================================
 * HOUSEHOLD FORMATION ENGINE v1.3
 * ============================================================================
 *
 * v1.3 engine.56 (S316) — the ledger becomes true:
 * - reconcileHouseholds_ runs every cycle: SL HouseholdId is the membership
 *   truth source. Spouse-merge (married/partnered, same Last+hood, exactly-2
 *   groups, absorb single/unassigned side), adopt intake-authored households
 *   the ledger never had (HH-KEANE class), rebuild Members, repair
 *   Head/Neighborhood/Type, un-dissolve rows citizens still live in,
 *   dissolve rows nobody lives in. Deterministic, no rng.
 * - updateHouseholdIncomes_ double-parse bug fixed: real member-income sums
 *   had NEVER executed — every household carried the flat formation
 *   estimates (50000/85000/95000). Now also writes HouseholdSavings
 *   (sum member NetWorth; column ensured at header, schema-setup carve-out).
 * - dissolveStressedHouseholds_ is real: members' SL HouseholdId clears and
 *   the row's Members empties (was pure bookkeeping — 272 "dissolved" rows
 *   still had citizens living in them at the C129 audit).
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

// S316 savings wiring — reserves (HouseholdSavings) absorb burden stress when
// they cover this many months of housing cost. Same value declared in
// migrationTrackingEngine.js for the displacement-risk buffer; legal var
// redeclaration in the flat Apps Script namespace, keep the two aligned.
var SAVINGS_BUFFER_MONTHS = 12;

// engine.57 P2 (S318): a married household whose spouse is off-camera (couple
// row, one tracked member) still earns the spouse's income. DIAL — Mike sets;
// flat by design so it's legible and adjustable in one place.
var GENERIC_SPOUSE_SALARY = 48000;

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

    // engine.56 (S316): reconcile the ledger against SL truth BEFORE any
    // formation/income math — spouse-merge, adopt missing households
    // (HH-KEANE class), rebuild Members, repair status/neighborhood.
    var reconcile = reconcileHouseholds_(ctx, cycle);
    results.reconciled = reconcile;
    if (reconcile.rowsCreated || reconcile.merged || reconcile.membersRebuilt ||
        reconcile.undissolved || reconcile.emptied) {
      households = loadHouseholds_(ss); // reload post-repair
    }

    // Form new households
    // engine.57 P2 (S318): DISABLED — Mike's model: no household has one
    // person; households form ONLY at marriage (or single-parent events).
    // formNewHouseholds_ minted single-person households (15%/cycle, cap 3).
    // Marriage-driven formation lands in engine.57 P5. Function retained.
    var newHouseholds = [];
    // engine.64 (S322, Mike-direct): criteria formation — a citizen line
    // becomes a household the cycle the record already says family. Computed,
    // never backfilled; no hooks/LifeHistory (record-keeping, not an event).
    var criteriaForm = formCriteriaHouseholds_(ctx, households, cycle);
    results.householdsFormed = criteriaForm.formed;
    results.householdsAdopted = criteriaForm.adopted;

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

    // engine.255 Task 4: a standing, budgeted housing initiative pays grants onto
    // this Cycle's flagged households BEFORE stress reads their savings. Then
    // reload: granted savings, this Cycle's formed rows and the income pass all
    // land in the objects stress and the dissolution roll consume. (engine.251's
    // discount writer is no longer called; its removal is Task 8.)
    results.housingDisbursement = applyHousingDisbursement_(ctx, cycle);
    households = loadHouseholds_(ss);

    // Detect household stress
    var stressedHouseholds = detectHouseholdStress_(ss, households);
    results.rentBurdenCrisis = stressedHouseholds.filter(h => h.rentBurden >= RENT_BURDEN_CRISIS).length;

    // Dissolve stressed households
    var dissolved = dissolveStressedHouseholds_(ctx, stressedHouseholds, cycle, rng);
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

// engine.64 (S322, Mike-direct): off-camera family members earn generically —
// same rate as the engine's off-camera spouse pricing (GC_SPOUSE_INCOME).
var GENERIC_OFFCAM_INCOME = 48000;

// engine.73 (S328, Mike-direct): solo establishment. Household = 2+ group by
// doctrine; the one exception is an ESTABLISHED single — income >= the floor —
// who rolls a per-cycle chance to form a household of one (type 'solo').
// engine.153 (S412, builder's chain 2026-09-02: "a citizen may start single as
// Tier 4, generate their pay, build wealth, purchase a house"): the Tier <= 3
// gate is gone — a Tier-4 earner establishes on income alone. Home purchase is
// household physics, so this is the door to the first rung of the chain. This is an event in a life (coverable), not a stamp, and it
// unlocks the household-only physics (home purchase, savings, relocation).
// Gate sized S328: 67 of 358 unhoused true-singles eligible (~19%); at 10%
// chance that's a ~6-7/cycle trickle. Solo households do NOT register in
// Family_Relationships (that ledger is families with on-camera members).
var SOLO_INCOME_FLOOR = 85000;
var SOLO_ESTABLISH_CHANCE = 0.10;

/**
 * engine.64 (S322, Mike-direct) — criteria household formation.
 *
 * A citizen line becomes a household the cycle the record already says
 * family: MaritalStatus=married, OR adult with on-ledger kids, OR minor with
 * no parents. The household is COMPUTED — off-camera members contribute
 * GENERIC_OFFCAM_INCOME (married-no-spouse-on-camera: +1 generic; parentless
 * minor: +2 generics). No one is minted or backfilled — the drip lottery is
 * the only door on-camera, and a lottery win later upgrades the household's
 * real dynamics.
 *
 * Household-as-truth guards (Mike-direct):
 *  - If the citizen already appears in an ACTIVE household's Members, ADOPT
 *    that household onto their SL row (repair the pointer). Never form a twin.
 *  - Existing Household_Ledger rows are never modified or deleted here —
 *    this function only appends new rows and fills blank SL HouseholdIds.
 *  - Bond-engine weddings already form/join households completely (verified
 *    S322): anything they made is truth this function routes around.
 */
function formCriteriaHouseholds_(ctx, households, cycle) {
  var out = { formed: 0, adopted: 0, solo: 0 };
  var rng = safeRand_(ctx); // engine.73: solo establishment dice
  var headers = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return headers.indexOf(n); };
  var iHH = idx('HouseholdId'), iInc = idx('Income'), iPop = idx('POPID');
  if (iHH < 0 || iPop < 0) return out;

  var sheet = ctx.ss.getSheetByName('Household_Ledger');
  if (!sheet) return out;
  var hHead = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Truth index: citizen -> the ACTIVE household whose Members already list them.
  var memberOf = {};
  for (var h = 0; h < households.length; h++) {
    for (var m = 0; m < households[h].members.length; m++) {
      memberOf[String(households[h].members[m]).trim()] = households[h].householdId;
    }
  }

  var simYear = simYearOf_(ctx, cycle);

  // Mike-ruled S322 status set — SCOPED TO FORMATION ONLY (the engine's main
  // loadCitizens_ stays Active-only so births/marriages/divorces are
  // unchanged): Retired/Recovering residents form households (retired A's
  // with families live here); Traded = departed Oakland, never forms (and is
  // slated to lose ALL events unless flipped back to Active — separate
  // iteration); pending = awaiting Mike's verification, waits.
  var FORMS_STATUS = { active: true, retired: true, recovering: true };
  var iFirstC = idx('First'), iLastC = idx('Last'), iStatusC = idx('Status'),
      iBirthC = idx('BirthYear'), iNbhdC = idx('Neighborhood'),
      iMarC = idx('MaritalStatus'), iParC = idx('ParentIds'), iChC = idx('ChildrenIds'),
      iTierC = idx('Tier'), iGenC = idx('Gender'); // engine.73: solo gate + registry format
  var parseArr = function(v) { try { var a = JSON.parse(String(v || '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  var citizens = [];
  for (var cr = 0; cr < rows.length; cr++) {
    var crow = rows[cr];
    if (!crow || !crow[iPop]) continue;
    if (!FORMS_STATUS[String(crow[iStatusC] || 'active').toLowerCase()]) continue;
    citizens.push({
      ledgerIndex: cr,
      popId: crow[iPop] || '',
      name: ((iFirstC >= 0 ? crow[iFirstC] || '' : '') + ' ' + (iLastC >= 0 ? crow[iLastC] || '' : '')).trim(),
      gender: iGenC >= 0 ? String(crow[iGenC] || '').toLowerCase() : '',
      tier: iTierC >= 0 ? (Number(crow[iTierC]) || 4) : 4,
      birthYear: crow[iBirthC] || 2000,
      neighborhood: iNbhdC >= 0 ? (crow[iNbhdC] || '') : '',
      maritalStatus: iMarC >= 0 ? (crow[iMarC] || 'single') : 'single',
      parentIds: parseArr(iParC >= 0 ? crow[iParC] : '[]'),
      childrenIds: parseArr(iChC >= 0 ? crow[iChC] : '[]')
    });
  }
  var byPop = {};
  for (var b = 0; b < citizens.length; b++) byPop[String(citizens[b].popId).trim()] = citizens[b];
  var popIdOf = function(v) { var mm = String(v || '').match(/POP-\d+/); return mm ? mm[0] : ''; };
  var liveHH = function(cz) { return String(rows[cz.ledgerIndex][iHH] || '').trim(); };
  var seq = 0;

  for (var i = 0; i < citizens.length; i++) {
    var cz = citizens[i];
    if (liveHH(cz)) continue; // live check — a kid housed earlier this pass skips

    var pop = String(cz.popId).trim();
    if (memberOf[pop]) { // guard 1: household truth wins — adopt, don't form
      rows[cz.ledgerIndex][iHH] = memberOf[pop];
      ctx.ledger.dirty = true;
      out.adopted++;
      continue;
    }

    var age = simYear - (Number(cz.birthYear) || 0);
    var married = String(cz.maritalStatus).toLowerCase() === 'married';
    var onKids = [];
    var rawKids = cz.childrenIds || [];
    for (var k = 0; k < rawKids.length; k++) {
      var kid = byPop[popIdOf(rawKids[k])];
      if (kid && !liveHH(kid)) onKids.push(String(kid.popId).trim());
    }
    var orphanMinor = age < 18 && !(cz.parentIds || []).length;
    var ownInc = iInc >= 0 ? (Number(String(rows[cz.ledgerIndex][iInc]).replace(/[$,\s]/g, '')) || 0) : 0;

    if (!married && !(age >= 18 && onKids.length) && !orphanMinor) {
      // engine.73 solo establishment — the one non-group door, gated + diced.
      // engine.157: the citizen's posture multiplies the door's odds when the goal is a place of their own
      var soloF = (typeof maneuverFactor_ === 'function') ? maneuverFactor_(ctx, pop, 'establish') : 1;
      if (age >= 18 && ownInc >= SOLO_INCOME_FLOOR &&
          rng() < SOLO_ESTABLISH_CHANCE * soloF) { // engine.153: income alone — no Tier gate
        var soloId = 'HH-' + String(cycle).padStart(4, '0') + '-F' + String(++seq).padStart(3, '0');
        var soloVals = {
          HouseholdId: soloId, HeadOfHousehold: pop, HouseholdType: 'solo',
          Members: JSON.stringify([pop]), Neighborhood: cz.neighborhood || 'Downtown',
          HousingType: 'rented',
          MonthlyRent: estimateRent_(cz.neighborhood, ctx),
          HouseholdIncome: ownInc, FormedCycle: cycle, Status: 'active'
        };
        var soloRow = new Array(hHead.length).fill('');
        for (var sc = 0; sc < hHead.length; sc++) {
          if (soloVals[hHead[sc]] !== undefined) soloRow[sc] = soloVals[hHead[sc]];
        }
        sheet.appendRow(soloRow);
        rows[cz.ledgerIndex][iHH] = soloId;
        ctx.ledger.dirty = true;
        out.solo = (out.solo || 0) + 1;
      }
      continue;
    }

    var members = [pop];
    var income = ownInc;
    var type = 'couple';
    // An off-camera member has no job on record, so they earn the generic figure
    // (2026-09-07: the hood is out of the pay math — pay comes from a job).
    var offcamInc = GENERIC_OFFCAM_INCOME;
    if (married) income += offcamInc;                       // off-camera spouse
    if (age >= 18 && onKids.length) {
      type = 'family';
      for (var k2 = 0; k2 < onKids.length; k2++) members.push(onKids[k2]);
    }
    if (orphanMinor) { type = 'family'; income = ownInc + offcamInc * 2; } // both parents off-camera

    var hhId = 'HH-' + String(cycle).padStart(4, '0') + '-F' + String(++seq).padStart(3, '0');
    var vals = {
      HouseholdId: hhId, HeadOfHousehold: pop, HouseholdType: type,
      Members: JSON.stringify(members), Neighborhood: cz.neighborhood || 'Downtown',
      HousingType: 'rented',
      MonthlyRent: estimateRent_(cz.neighborhood, ctx),
      HouseholdIncome: income, FormedCycle: cycle, Status: 'active'
    };
    var rowOut = new Array(hHead.length).fill('');
    for (var c = 0; c < hHead.length; c++) {
      if (vals[hHead[c]] !== undefined) rowOut[c] = vals[hHead[c]];
    }
    sheet.appendRow(rowOut); // append-only — existing rows never touched
    for (var m2 = 0; m2 < members.length; m2++) {
      var mc = byPop[members[m2]];
      if (mc && !liveHH(mc)) rows[mc.ledgerIndex][iHH] = hhId;
    }

    // engine.73 register hook: criteria formations with on-camera family now
    // land in Family_Relationships (Mike's format — names beside IDs). Before
    // this, only live bondEngine weddings / single-parent formations / births
    // registered; bulk criteria households never did (88/103 family-linked
    // citizens were missing from the registry, S328 measure).
    var regSheet = ctx.ss.getSheetByName('Family_Relationships');
    if (regSheet) {
      var headLabel = pop + (cz.name ? ' ' + cz.name : '');
      var husband = cz.gender === 'male' ? headLabel : '';
      var wife = cz.gender === 'female' ? headLabel : '';
      if (!husband && !wife) { husband = headLabel; } // unknown gender — head goes in col B
      var relType = married ? 'married' : 'single-parent';
      var childCells = ['', '', '', '', ''];
      for (var ck = 0; ck < onKids.length && ck < 5; ck++) {
        var kidC = byPop[onKids[ck]];
        childCells[ck] = onKids[ck] + (kidC && kidC.name ? ' ' + kidC.name : '');
      }
      regSheet.appendRow([hhId, husband, wife, relType, cycle, 'active',
        childCells[0], childCells[1], childCells[2], childCells[3], childCells[4]]);
    }

    ctx.ledger.dirty = true;
    out.formed++;
  }

  if (out.formed || out.adopted || out.solo) {
    Logger.log('formCriteriaHouseholds_ engine.64: formed ' + out.formed + ', adopted ' + out.adopted + ', solo ' + (out.solo || 0));
  }
  return out;
}

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

    // Only process active citizens. S319: case-insensitive — the ledger
    // stores 'Active' (capital), so the === 'active' check matched ZERO
    // rows since Week 1 and the citizens.length===0 gate silently no-oped
    // this whole engine every cycle (reconcile included).
    if (String(citizen.status).toLowerCase() === 'active') {
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
      householdSavings: headers.indexOf('HouseholdSavings') >= 0 ? parseFloat(row[headers.indexOf('HouseholdSavings')] || 0) : 0,
      formedCycle: row[headers.indexOf('FormedCycle')] || '',
      status: row[headers.indexOf('Status')] || 'active',
      // engine.251 housing relief columns (blank until the engine arms them)
      grossMonthlyRent: headers.indexOf('GrossMonthlyRent') >= 0 ? parseFloat(row[headers.indexOf('GrossMonthlyRent')] || 0) : 0,
      housingReliefMonthly: headers.indexOf('HousingReliefMonthly') >= 0 ? parseFloat(row[headers.indexOf('HousingReliefMonthly')] || 0) : 0,
      housingReliefCycle: headers.indexOf('HousingReliefCycle') >= 0 ? (row[headers.indexOf('HousingReliefCycle')] || '') : '',
      housingReliefInitiativeId: headers.indexOf('HousingReliefInitiativeID') >= 0 ? (row[headers.indexOf('HousingReliefInitiativeID')] || '') : ''
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
// HOUSEHOLD RECONCILE (engine.56, S316)
// ════════════════════════════════════════════════════════════════════════════
//
// The Household_Ledger drifted into fiction: 272 households marked dissolved
// with citizens still living in them, intake-authored households (HH-KEANE)
// with no ledger row at all, married couples split across auto-minted single
// households, and 498/529 incomes stuck on formation-seed estimates. SL
// HouseholdId is the membership truth source; this pass makes the ledger
// agree with it every cycle.
//
// Order: spouse-merge (mutates SL HouseholdId via ctx.ledger) -> rebuild
// member map -> repair every ledger row (Members/Head/Neighborhood/Type/
// Status) -> create rows for SL households the ledger has never seen.
// Deterministic — no rng anywhere in this pass.

var AUTO_HH_ID = /^HH-\d{4}-\d{3}$/; // formation-minted IDs (HH-<cycle>-<n>)

function reconcileHouseholds_(ctx, cycle) {
  var ss = ctx.ss;
  var out = { merged: 0, rowsCreated: 0, membersRebuilt: 0, undissolved: 0, emptied: 0 };
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return out;

  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var iPOPID = idx('POPID'), iLast = idx('Last'), iStatus = idx('Status'),
      iNeighborhood = idx('Neighborhood'), iHH = idx('HouseholdId'),
      iMarital = idx('MaritalStatus'), iBirthYear = idx('BirthYear'),
      iTierRec = idx('Tier'), iIncomeRec = idx('Income'); // engine.73: solo typing
  if (iPOPID < 0 || iHH < 0) return out;
  var simYear = simYearOf_(ctx, cycle);

  var alive = function(row) {
    return String(row[iStatus] || 'active').toLowerCase() !== 'deceased';
  };

  // ── 1. Spouse-merge: married/partnered pairs sharing Last name + hood but
  //      split across households. Conservative: exactly-2-candidate groups
  //      only, and only absorb a single-member-or-unassigned side into the
  //      other. Ambiguity (3+ same-name married in one hood) → skip.
  var memberCount = {};
  for (var c = 0; c < rows.length; c++) {
    if (!alive(rows[c])) continue;
    var h0 = rows[c][iHH];
    if (h0) memberCount[h0] = (memberCount[h0] || 0) + 1;
  }
  var pairGroups = {};
  if (iLast >= 0 && iMarital >= 0 && iNeighborhood >= 0) {
    for (var p = 0; p < rows.length; p++) {
      var pr = rows[p];
      if (!alive(pr)) continue;
      var ms = String(pr[iMarital] || '').toLowerCase();
      if (ms !== 'married' && ms !== 'partnered') continue;
      var last = String(pr[iLast] || '').trim();
      var hood = String(pr[iNeighborhood] || '').trim();
      if (!last || !hood) continue;
      var key = last + '||' + hood;
      (pairGroups[key] = pairGroups[key] || []).push(p);
    }
  }
  var groupKeys = Object.keys(pairGroups).sort(); // deterministic order
  for (var g = 0; g < groupKeys.length; g++) {
    var grp = pairGroups[groupKeys[g]];
    if (grp.length !== 2) continue; // 1 = nothing to merge; 3+ = ambiguous
    var a = rows[grp[0]], b = rows[grp[1]];
    var hhA = a[iHH] || '', hhB = b[iHH] || '';
    if (hhA === hhB && hhA) continue; // already together
    // Pick target: prefer the non-auto (authored) ID; then the larger
    // household; then lexicographically smaller ID. The other side must be
    // absorbable (unassigned or single-member).
    var pick = null; // [targetHH, absorbRowIdx]
    var candidates = [
      { target: hhA, absorbIdx: grp[1], absorbHH: hhB },
      { target: hhB, absorbIdx: grp[0], absorbHH: hhA }
    ].filter(function(o) {
      if (!o.target) return false;
      return !o.absorbHH || (memberCount[o.absorbHH] || 0) <= 1;
    });
    if (!candidates.length) continue; // both sides multi-member — leave alone
    candidates.sort(function(x, y) {
      var xa = AUTO_HH_ID.test(x.target) ? 1 : 0, ya = AUTO_HH_ID.test(y.target) ? 1 : 0;
      if (xa !== ya) return xa - ya;                                   // authored first
      var xm = memberCount[y.target] || 0, ym = memberCount[x.target] || 0;
      if (xm !== ym) return xm - ym;                                   // larger first
      return x.target < y.target ? -1 : 1;                             // stable
    });
    pick = candidates[0];
    var absorbRow = rows[pick.absorbIdx];
    var oldHH = absorbRow[iHH];
    absorbRow[iHH] = pick.target;
    ctx.ledger.dirty = true;
    memberCount[pick.target] = (memberCount[pick.target] || 0) + 1;
    if (oldHH) memberCount[oldHH] = Math.max(0, (memberCount[oldHH] || 1) - 1);
    out.merged++;
  }

  // ── 2. Live member map (post-merge), deceased excluded ────────────────────
  var membersByHH = {};
  var citizenByPOPID = {};
  for (var m = 0; m < rows.length; m++) {
    var mr = rows[m];
    citizenByPOPID[mr[iPOPID]] = mr;
    if (!alive(mr)) continue;
    var mh = mr[iHH];
    if (!mh) continue;
    (membersByHH[mh] = membersByHH[mh] || []).push(mr[iPOPID]);
  }
  Object.keys(membersByHH).forEach(function(k) { membersByHH[k].sort(); });

  // ── 3. Repair existing ledger rows (single batched write) ────────────────
  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return out;
  var lh = data[0];
  var li = function(n) { return lh.indexOf(n); };
  var lHH = li('HouseholdId'), lHead = li('HeadOfHousehold'), lType = li('HouseholdType'),
      lMembers = li('Members'), lHood = li('Neighborhood'), lStatus = li('Status'),
      lDissolved = li('DissolvedCycle'), lUpdated = li('LastUpdated');
  if (lHH < 0 || lMembers < 0) return out;

  var seenHH = {};
  var changed = false;
  for (var r = 1; r < data.length; r++) {
    var lrow = data[r];
    var hid = lrow[lHH];
    if (!hid) continue;
    seenHH[hid] = true;
    var actual = membersByHH[hid] || [];
    var recordedJson = JSON.stringify(actual);
    var rowChanged = false;

    if (String(lrow[lMembers]) !== recordedJson) {
      lrow[lMembers] = recordedJson; rowChanged = true; out.membersRebuilt++;
    }
    if (actual.length > 0) {
      // Head must be a member; keep if so, else first (sorted) member
      var head = lrow[lHead];
      if (actual.indexOf(head) < 0) { lrow[lHead] = actual[0]; head = actual[0]; rowChanged = true; }
      // Neighborhood follows the head's real one
      var headRow = citizenByPOPID[head];
      var realHood = headRow && iNeighborhood >= 0 ? (headRow[iNeighborhood] || '') : '';
      if (realHood && lHood >= 0 && lrow[lHood] !== realHood) { lrow[lHood] = realHood; rowChanged = true; }
      // Type from live composition — engine.57 two-type model (S319 fix; the
      // engine.56 count-only rule retyped off-camera-spouse couples 'single'):
      //   any minor member          → family (kids define a family household)
      //   2+ members                → couple
      //   1 member, head married    → couple (off-camera generic spouse, P2)
      //   1 member, head unmarried  → single (shouldn't exist post-migration;
      //                               typed visibly, NOT auto-dissolved)
      if (lType >= 0) {
        var hasMinor = false;
        for (var am = 0; am < actual.length; am++) {
          var amRow = citizenByPOPID[actual[am]];
          var amBY = amRow && iBirthYear >= 0 ? (Number(amRow[iBirthYear]) || 0) : 0;
          if (amBY > 0 && (simYear - amBY) < 18) { hasMinor = true; break; } // <18 = minor (S320 kid-age ruling)
        }
        var newType;
        if (hasMinor) {
          newType = 'family';
        } else if (actual.length >= 2) {
          newType = 'couple';
        } else {
          var headMar = headRow && iMarital >= 0 ? String(headRow[iMarital] || '').toLowerCase() : '';
          if (headMar === 'married' || headMar === 'partnered') {
            newType = 'couple';
          } else {
            // engine.73/153: an established single (income >= SOLO_INCOME_FLOOR,
            // any Tier since engine.153) legitimately holds a household of one —
            // type 'solo'. Below the gate stays 'single' (visible debt,
            // NOT auto-dissolved), unchanged from engine.57.
            var recTier = headRow && iTierRec >= 0 ? (Number(headRow[iTierRec]) || 4) : 4;
            var recInc = headRow && iIncomeRec >= 0 ? (Number(String(headRow[iIncomeRec]).replace(/[$,\s]/g, '')) || 0) : 0;
            newType = (recInc >= SOLO_INCOME_FLOOR) ? 'solo' : 'single';
          }
        }
        if (lrow[lType] !== newType) { lrow[lType] = newType; rowChanged = true; }
      }
      // Citizens live here — it is not dissolved (the 272-row rot)
      if (lStatus >= 0 && String(lrow[lStatus]).toLowerCase() === 'dissolved') {
        lrow[lStatus] = 'active';
        if (lDissolved >= 0) lrow[lDissolved] = '';
        rowChanged = true; out.undissolved++;
      }
    } else {
      // Nobody lives here — it is not active
      if (lStatus >= 0 && String(lrow[lStatus]).toLowerCase() === 'active') {
        lrow[lStatus] = 'dissolved';
        if (lDissolved >= 0 && !lrow[lDissolved]) lrow[lDissolved] = cycle;
        rowChanged = true; out.emptied++;
      }
    }
    if (rowChanged && lUpdated >= 0 && ctx.now) lrow[lUpdated] = ctx.now;
    if (rowChanged) changed = true;
  }
  if (changed) {
    sheet.getRange(1, 1, data.length, lh.length).setValues(data);
  }

  // ── 4. Adopt SL households the ledger has never seen (HH-KEANE class) ────
  var missing = Object.keys(membersByHH).filter(function(h) { return !seenHH[h]; }).sort();
  for (var n = 0; n < missing.length; n++) {
    var nid = missing[n];
    var mem = membersByHH[nid];
    var headP = citizenByPOPID[mem[0]];
    var hood2 = headP && iNeighborhood >= 0 ? (headP[iNeighborhood] || '') : '';
    var newRow = [];
    for (var col = 0; col < lh.length; col++) newRow.push('');
    newRow[lHH] = nid;
    if (lHead >= 0) newRow[lHead] = mem[0];
    if (lType >= 0) {
      // Same two-type rule as step 3 (S319): minor member → family;
      // 2+ → couple; solo married head → couple (off-camera spouse).
      var adoptMinor = false;
      for (var an = 0; an < mem.length; an++) {
        var anRow = citizenByPOPID[mem[an]];
        var anBY = anRow && iBirthYear >= 0 ? (Number(anRow[iBirthYear]) || 0) : 0;
        if (anBY > 0 && (simYear - anBY) < 18) { adoptMinor = true; break; } // <18 = minor (S320 kid-age ruling)
      }
      if (adoptMinor) {
        newRow[lType] = 'family';
      } else if (mem.length >= 2) {
        newRow[lType] = 'couple';
      } else {
        var adoptMar = headP && iMarital >= 0 ? String(headP[iMarital] || '').toLowerCase() : '';
        newRow[lType] = (adoptMar === 'married' || adoptMar === 'partnered') ? 'couple' : 'single';
      }
    }
    newRow[lMembers] = JSON.stringify(mem);
    if (lHood >= 0) newRow[lHood] = hood2;
    if (li('HousingType') >= 0) newRow[li('HousingType')] = 'rented';
    if (li('MonthlyRent') >= 0) newRow[li('MonthlyRent')] = estimateRent_(hood2, ctx);
    if (li('HousingCost') >= 0) newRow[li('HousingCost')] = 0;
    if (li('HouseholdIncome') >= 0) newRow[li('HouseholdIncome')] = 0; // income pass fills
    if (li('FormedCycle') >= 0) newRow[li('FormedCycle')] = cycle;
    if (lStatus >= 0) newRow[lStatus] = 'active';
    if (li('CreatedAt') >= 0) newRow[li('CreatedAt')] = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : (ctx.now || '');
    if (lUpdated >= 0) newRow[lUpdated] = ctx.now || '';
    sheet.appendRow(newRow);
    out.rowsCreated++;
  }

  return out;
}


// ════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD FORMATION
// ════════════════════════════════════════════════════════════════════════════

function formNewHouseholds_(ctx, citizens, existingHouseholds, cycle, rng) {
  var ss = ctx.ss;
  var newHouseholds = [];
  var currentYear = simYearOf_(ctx, cycle); // engine.164 (no live caller — kept honest)

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
    var monthlyRent = estimateRent_(citizen.neighborhood, ctx);

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
      createdAt: inWorldStamp_(ctx), // S290 in-world, not wall-clock
      lastUpdated: inWorldStamp_(ctx)
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

function estimateRent_(neighborhood, ctx) {
  // engine.160 (S414): one hood rent rule. A new household pays its hood's
  // MedianRent, which Phase 2 derives from the Neighborhood_Map MedianIncome
  // (INSTITUTIONS §Neighborhoods, engine.135 B1) × World_Config hoodRentShare —
  // see hoodRentFromIncome_ (loadNeighborhoodState.js). The 12-hood 2026 rent
  // table that lived here priced 221 of 319 live leases under their hood's
  // median; it is gone, and there is no fallback — a hood the ledger does not
  // price cannot house anyone (ADR-0016).
  var hood = (neighborhood || '').toString().trim();
  var st = ctx && ctx.summary && ctx.summary.neighborhoodState ? ctx.summary.neighborhoodState[hood] : null;
  var med = st ? Number(st.medianRent) : NaN;
  if (!(med > 0)) {
    throw new Error('estimateRent_: no canon rent for hood "' + hood + '" — Neighborhood_Map has no row or no MedianIncome for it (ADR-0016, engine.160).');
  }
  return Math.round(med);
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
  // engine.56 (S316) rewrite. The original re-JSON.parsed a members value
  // loadHouseholds_ had ALREADY parsed into an array — that throw hit on
  // every household since Week 1, and the catch silently wrote the flat
  // formation estimates (single=50000 / couple=85000 / family=95000).
  // 498/529 households carried those estimates as "income" at the C129
  // audit; the real-income path below had never executed. Also writes
  // HouseholdSavings (sum of member NetWorth) — the column is ensured at
  // the header if absent (schema-setup carve-out, fires once).
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var incomeCol = headers.indexOf('HouseholdIncome') + 1;
  if (incomeCol === 0) return;

  var savingsCol = headers.indexOf('HouseholdSavings') + 1;
  if (savingsCol === 0) {
    savingsCol = headers.length + 1;
    sheet.getRange(1, savingsCol).setValue('HouseholdSavings');
  }

  var citizenMoney = buildCitizenMoneyLookup_(ctx);
  if (!citizenMoney) return;

  // Batched write: one column vector each, aligned to sheet rows 2..lastRow.
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var incomeVec = sheet.getRange(2, incomeCol, lastRow - 1, 1).getValues();
  var savingsVec = sheet.getRange(2, savingsCol, lastRow - 1, 1).getValues();

  for (var i = 0; i < households.length; i++) {
    var household = households[i];
    var members = Array.isArray(household.members) ? household.members : [];
    var totalIncome = 0, totalSavings = 0;
    for (var m = 0; m < members.length; m++) {
      var money = citizenMoney[members[m]];
      if (!money) continue;
      totalIncome += money.income;
      totalSavings += money.netWorth;
    }
    // engine.57 P2: off-camera spouse earns too (couple row, 1 tracked member)
    if (household.householdType === HOUSEHOLD_TYPES.COUPLE && members.length === 1) {
      totalIncome += GENERIC_SPOUSE_SALARY;
    }
    // engine.57 P8 (S319): family households with off-camera parents earn too.
    //   all tracked members minors (orphan backfill) → two generic salaries
    //   an adult member married to an untracked spouse → one generic salary
    if (household.householdType === HOUSEHOLD_TYPES.FAMILY) {
      var famAdults = 0, offCamSpouse = false;
      for (var fa = 0; fa < members.length; fa++) {
        var famMoney = citizenMoney[members[fa]];
        if (!famMoney) continue;
        if (famMoney.adult) {
          famAdults++;
          if (famMoney.married && (!famMoney.spousePop || members.indexOf(famMoney.spousePop) < 0)) {
            offCamSpouse = true;
          }
        }
      }
      if (famAdults === 0) totalIncome += 2 * GENERIC_SPOUSE_SALARY;
      else if (offCamSpouse) totalIncome += GENERIC_SPOUSE_SALARY;
    }
    var vecIdx = household.rowIndex - 2;
    if (vecIdx >= 0 && vecIdx < incomeVec.length) {
      incomeVec[vecIdx][0] = totalIncome;
      savingsVec[vecIdx][0] = totalSavings;
    }
    household.householdIncome = totalIncome;
    household.householdSavings = totalSavings;
  }

  sheet.getRange(2, incomeCol, lastRow - 1, 1).setValues(incomeVec);
  sheet.getRange(2, savingsCol, lastRow - 1, 1).setValues(savingsVec);
}

function buildCitizenMoneyLookup_(ctx) {
  // Phase 42 §5.6: read from shared ctx.ledger; cohort-A income mutations
  // (runCareerEngine, runEducationEngine etc.) live in ctx.ledger.rows by
  // the time this runs in Phase 5.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return null;

  var popIdCol = header.indexOf('POPID');
  var incomeCol = header.indexOf('Income');
  var netWorthCol = header.indexOf('NetWorth');
  var birthYearCol = header.indexOf('BirthYear');
  var maritalCol = header.indexOf('MaritalStatus');
  var spouseCol = header.indexOf('SpouseId');

  if (popIdCol < 0 || incomeCol < 0) return null;

  // S319 P8: adult/marital/spouse flags so updateHouseholdIncomes_ can price
  // off-camera parents. Missing BirthYear = adult (age-gate fallback).
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;
  var simYear = simYearOf_(ctx, cycle);

  var lookup = {};
  for (var r = 0; r < rows.length; r++) {
    var by = birthYearCol >= 0 ? (Number(rows[r][birthYearCol]) || 0) : 0;
    var ms = maritalCol >= 0 ? String(rows[r][maritalCol] || '').toLowerCase() : '';
    var sp = spouseCol >= 0 ? String(rows[r][spouseCol] || '').trim() : '';
    // S320: minors earn nothing — enforce here too, not just in the wealth
    // engine's zero pass (which runs AFTER household sums; a stale minor
    // salary on-sheet inflated family HouseholdIncome for one cycle —
    // 0716 first-fire artifact, kids carried S313 script-backfilled pay)
    var isMinor = by > 0 && (simYear - by) < 18;
    lookup[rows[r][popIdCol]] = {
      income: isMinor ? 0 : (Number(rows[r][incomeCol]) || 0),
      netWorth: netWorthCol >= 0 ? (Number(rows[r][netWorthCol]) || 0) : 0,
      adult: by > 0 ? (simYear - by) >= 18 : true, // 18+ = adult (S320 kid-age ruling)
      married: ms === 'married' || ms === 'partnered',
      spousePop: sp ? sp.split(' ')[0] : ''
    };
  }

  return lookup;
}

// ============================================================================
// engine.251 — housing relief (plan docs/plans/2026-09-20-housing-lever.md,
// builder ruled 2026-09-22: tenant rent discount, flat rate, off by default).
//
// Contract: MonthlyRent stays the tenant's EFFECTIVE monthly obligation (the
// mortgage on an owned row). GrossMonthlyRent is the undiscounted lease, armed
// by this engine and copied from MonthlyRent the first time a rented row is
// seen with a blank gross — so the gross is in place before activation and the
// copy is idempotent. Relief is always recomputed from gross, never from last
// Cycle's discounted net. Owned and dissolved rows are never touched. An
// unavailable relief slice keeps the persisted rents (a failed read is not a
// policy change); a valid empty slice restores gross and clears the discount.
// Direct own-tab write, same class as updateHouseholdIncomes_ (SHEETS_MANIFEST §9).
// ============================================================================
var HOUSING_RELIEF_COLUMNS_ = ['GrossMonthlyRent', 'HousingReliefMonthly', 'HousingReliefCycle', 'HousingReliefInitiativeID'];

function ensureHousingReliefColumns_(sheet, header) {
  var missing = [];
  for (var i = 0; i < HOUSING_RELIEF_COLUMNS_.length; i++) {
    if (header.indexOf(HOUSING_RELIEF_COLUMNS_[i]) === -1) missing.push(HOUSING_RELIEF_COLUMNS_[i]);
  }
  if (!missing.length) return false;
  var lastCol = sheet.getLastColumn();
  var short = (lastCol + missing.length) - sheet.getMaxColumns();
  if (short > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), short);
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  Logger.log('householdFormationEngine: engine.251 appended relief columns to Household_Ledger — ' + missing.join(', '));
  return true;
}

// Pure. gross → { gross, relief, net } at cent precision, or null on invalid money.
// rate outside [0,1] is clamped; 0 and 1 are valid boundaries (net 0 is a real obligation of zero).
function netRentFromGross_(gross, rate) {
  var g = Number(gross);
  if (!isFinite(g) || g <= 0) return null;
  var r = Number(rate);
  if (!isFinite(r) || r < 0) r = 0;
  if (r > 1) r = 1;
  g = Math.round(g * 100) / 100;
  var relief = Math.round(g * r * 100) / 100;
  var net = Math.round((g - relief) * 100) / 100;
  if (net < 0) net = 0;
  return { gross: g, relief: relief, net: net };
}

// The winning program for one household's hood off the Phase-2 slice, or null.
// The household hood folds to its canon parent when the canon set is seeded.
function housingReliefForHood_(ctx, hood, slice) {
  var sl = slice || (ctx && ctx.summary ? ctx.summary.initiativeHousingRelief : null);
  if (!sl || sl.available !== true || !sl.hoods) return null;
  var raw = String(hood == null ? '' : hood).trim();
  if (!raw) return null;
  var key = raw;
  if (typeof resolveHoodOrChild_ === 'function' && ctx && ctx.summary && ctx.summary.canonHoods && ctx.summary.canonHoods.set) {
    var folded = resolveHoodOrChild_(ctx, raw);
    if (folded) key = folded;
  }
  var hit = sl.hoods[key];
  if (!hit || !(Number(hit.rate) > 0)) return null;
  return { rate: Number(hit.rate), initiativeId: String(hit.initiativeId || ''), name: hit.name || '' };
}

function applyHousingRelief_(ctx, cycle) {
  var out = { armed: false, enabled: false, available: false, reason: null, rows: 0, renters: 0,
              grossCopied: 0, relieved: 0, restored: 0, unchanged: 0, invalid: 0, error: null };
  // Fail loud, never fatal: a broken relief pass reaches Engine_Errors and the
  // persisted rents stand, but households still form, stress and dissolve this
  // Cycle. Relief is a service on top of their lives, not a gate in front of them.
  try {
    return applyHousingReliefBody_(ctx, cycle, out);
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
    out.reason = 'error';
    Logger.log('householdFormationEngine: engine.251 housing relief ERROR — ' + out.error);
    if (typeof logEngineError_ === 'function') {
      try { logEngineError_(ctx, 'Phase5-HousingRelief', e); } catch (e2) { /* the log itself must not throw */ }
    }
    return out;
  }
}

function applyHousingReliefBody_(ctx, cycle, out) {
  if (typeof getCivicHousingDials_ !== 'function') throw new Error('getCivicHousingDials_ unavailable (applyInitiativeImplementationEffects.js not loaded)');
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) { out.reason = 'no-sheet'; return out; }
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dials = getCivicHousingDials_(ctx);
  out.enabled = dials.enabled;
  // engine.255 (builder 2026-09-22): a disabled lever arms nothing. The four
  // relief columns land on Household_Ledger only when the dial is 1 — a column
  // that never moves is scenery (SIM_DOCTRINE §16), and the lever's shape is
  // being redesigned as a budgeted disbursement.
  if (!dials.enabled && header.indexOf('GrossMonthlyRent') === -1) { out.reason = 'disabled'; return out; }
  if (ensureHousingReliefColumns_(sheet, header)) {
    out.armed = true;
    header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return out;
  var idx = function (n) { return header.indexOf(n); };
  var iType = idx('HousingType'), iRent = idx('MonthlyRent'), iStatus = idx('Status'), iHood = idx('Neighborhood'),
      iGross = idx('GrossMonthlyRent'), iRelief = idx('HousingReliefMonthly'), iRCycle = idx('HousingReliefCycle'), iRInit = idx('HousingReliefInitiativeID');
  if (iType < 0 || iRent < 0 || iGross < 0 || iRelief < 0 || iRCycle < 0 || iRInit < 0) { out.reason = 'columns-missing'; return out; }
  var slice = ctx.summary ? ctx.summary.initiativeHousingRelief : null;
  out.available = !!(slice && slice.available === true);
  out.reason = slice ? (slice.reason || null) : 'slice-missing';
  var n = data.length - 1;
  var rentVec = [], grossVec = [], reliefVec = [], cycVec = [], initVec = [];
  var touched = false;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var curRent = row[iRent], curGross = row[iGross], curRelief = row[iRelief], curCyc = row[iRCycle], curInit = row[iRInit];
    var type = String(row[iType] == null ? '' : row[iType]).trim().toLowerCase();
    var status = iStatus >= 0 ? String(row[iStatus] == null ? '' : row[iStatus]).trim().toLowerCase() : 'active';
    out.rows++;
    var keep = function () { rentVec.push([curRent]); grossVec.push([curGross]); reliefVec.push([curRelief]); cycVec.push([curCyc]); initVec.push([curInit]); };
    if (type !== 'rented' || status !== 'active') { keep(); continue; }
    out.renters++;
    var gross = Number(curGross);
    if (!(gross > 0)) {
      var seed = Number(curRent);
      if (!(seed > 0)) { out.invalid++; keep(); continue; }
      gross = Math.round(seed * 100) / 100;
      curGross = gross;
      out.grossCopied++;
      touched = true;
    }
    if (!dials.enabled || !out.available) { out.unchanged++; keep(); continue; }
    var src = housingReliefForHood_(ctx, iHood >= 0 ? row[iHood] : '', slice);
    var calc = netRentFromGross_(gross, src ? src.rate : 0);
    if (!calc) { out.invalid++; keep(); continue; }
    var hadRelief = Number(curRelief) > 0;
    if (src && calc.relief > 0) out.relieved++;
    else if (hadRelief) out.restored++;
    else out.unchanged++;
    if (Number(curRent) !== calc.net || Number(curRelief) !== calc.relief || String(curInit || '') !== (src ? src.initiativeId : '') || Number(curCyc) !== Number(cycle)) touched = true;
    rentVec.push([calc.net]); grossVec.push([gross]); reliefVec.push([calc.relief]); cycVec.push([Number(cycle)]); initVec.push([src ? src.initiativeId : '']);
  }
  if (touched) {
    sheet.getRange(2, iRent + 1, n, 1).setValues(rentVec);
    sheet.getRange(2, iGross + 1, n, 1).setValues(grossVec);
    sheet.getRange(2, iRelief + 1, n, 1).setValues(reliefVec);
    sheet.getRange(2, iRCycle + 1, n, 1).setValues(cycVec);
    sheet.getRange(2, iRInit + 1, n, 1).setValues(initVec);
  }
  Logger.log('householdFormationEngine: engine.251 housing relief — enabled ' + out.enabled + ', slice ' +
    (out.available ? 'available' : 'UNAVAILABLE (' + out.reason + ')') + ', renters ' + out.renters +
    ', gross copied ' + out.grossCopied + ', relieved ' + out.relieved + ', restored ' + out.restored +
    ', invalid ' + out.invalid + (touched ? ' — written' : ' — nothing to write'));
  return out;
}

// ============================================================================
// engine.255 Task 4 — the housing grant writer (plan
// docs/plans/2026-09-22-initiative-budget-disbursement.md §The shape).
//
// For each program on S.initiativeDisbursement (Phase 2, one per Standing/
// Delivering housing row with money left): the flagged active rented households
// in its folded hoods — the engine's own stress rule, burden ≥ RENT_BURDEN_WARNING
// and savings under the 12-month buffer — not granted by ANY initiative inside
// the cooldown, ordered worst burden first, get a grant that fills savings to the
// buffer within the cap, until the tranche is spent. Durable money is the head of
// household's NetWorth on ctx.ledger (Phase 10 commits; HouseholdSavings derives
// from member NetWorth every Cycle in updateHouseholdIncomes_), with a same-Cycle
// HouseholdSavings write so THIS fire's stress read and dissolution roll see it.
// The whole tranche leaves the fund (BudgetRemaining -= tranche, a Phase-10 cell
// intent): tracked grants are the on-camera part, the rest is the director's
// off-camera disbursement. Budget at zero → phase `complete`.
//
// Idempotency: a household granted this Cycle (LastGrantCycle == cycle) is never
// paid again this Cycle; a program whose tracker LastDisburseCycle == cycle, or
// whose pool already carries this Cycle's receipts, is not debited again.
// Direct own-tab column-vector write, same class as updateHouseholdIncomes_
// (SHEETS_MANIFEST §9). Fail loud, never fatal.
// ============================================================================
var HOUSING_GRANT_COLUMNS_ = ['LastGrantCycle', 'LastGrantInitiativeID', 'LastGrantAmount'];

function ensureHousingGrantColumns_(sheet, header) {
  var missing = [];
  for (var i = 0; i < HOUSING_GRANT_COLUMNS_.length; i++) {
    if (header.indexOf(HOUSING_GRANT_COLUMNS_[i]) === -1) missing.push(HOUSING_GRANT_COLUMNS_[i]);
  }
  if (!missing.length) return false;
  var lastCol = sheet.getLastColumn();
  var short = (lastCol + missing.length) - sheet.getMaxColumns();
  if (short > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), short);
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  Logger.log('householdFormationEngine: engine.255 appended grant receipt columns to Household_Ledger — ' + missing.join(', '));
  return true;
}

// Pure planner. header/rows are the Household_Ledger grid (rows = body, index 0 =
// sheet row 2); program is one S.initiativeDisbursement entry; hoodOf folds a raw
// hood string. Returns the ordered grants and every exclusion counted.
function planHousingDisbursement_(header, rows, program, cycle, hoodOf, savingsOf) {
  var idx = function (n) { return header.indexOf(n); };
  var iId = idx('HouseholdId'), iHead = idx('HeadOfHousehold'), iHood = idx('Neighborhood'), iType = idx('HousingType'),
      iRent = idx('MonthlyRent'), iInc = idx('HouseholdIncome'), iStatus = idx('Status'), iSav = idx('HouseholdSavings'), iLG = idx('LastGrantCycle'), iMem = idx('Members');
  var out = { eligible: 0, grants: [], paid: 0, trancheLeft: Number(program.tranche) || 0,
              skipped: { inactive: 0, owned: 0, offHood: 0, invalid: 0, unflagged: 0, cooldown: 0, alreadyThisCycle: 0 } };
  if (iId < 0 || iHood < 0 || iType < 0 || iRent < 0 || iInc < 0 || iSav < 0) { out.reason = 'columns-missing'; return out; }
  var hoods = program.hoods || [];
  var cap = Number(program.grantCapMonths); if (!isFinite(cap) || cap < 0) cap = 0;
  // headroom above the buffer: the money loop moves NetWorth a few hundred a week, so a grant
  // that lands exactly on the 12-month line re-flags next Cycle (bench C112: 248 short)
  var headroom = Number(program.grantHeadroomMonths); if (!isFinite(headroom) || headroom < 0) headroom = 0;
  var cooldown = Number(program.cooldownCycles); if (!isFinite(cooldown) || cooldown < 0) cooldown = 0;
  var cands = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = iStatus >= 0 ? String(row[iStatus] == null ? '' : row[iStatus]).trim().toLowerCase() : 'active';
    if (status !== 'active') { out.skipped.inactive++; continue; }
    if (String(row[iType] == null ? '' : row[iType]).trim().toLowerCase() !== 'rented') { out.skipped.owned++; continue; }
    var hood = hoodOf(String(row[iHood] == null ? '' : row[iHood]).trim());
    if (!hood || hoods.indexOf(hood) < 0) { out.skipped.offHood++; continue; }
    var rent = Number(row[iRent]), income = Number(row[iInc]);
    if (!(rent > 0) || !(income > 0)) { out.skipped.invalid++; continue; }
    var savings = Number(row[iSav]); if (!isFinite(savings) || savings < 0) savings = 0;
    // bench C110/C111: a household formed THIS Cycle carries HouseholdSavings 0 until the
    // income pass derives it from member NetWorth, while its head may hold six figures —
    // the durable truth is the ledger, so the flag reads the greater of the cell and the
    // members' NetWorth (the same sum updateHouseholdIncomes_ writes next Cycle)
    if (typeof savingsOf === 'function') {
      var led = savingsOf(iMem >= 0 ? row[iMem] : '', iHead >= 0 ? row[iHead] : '');
      if (isFinite(led) && led > savings) savings = led;
    }
    var burden = rent * 12 / income;
    if (savings >= rent * SAVINGS_BUFFER_MONTHS || burden < RENT_BURDEN_WARNING) { out.skipped.unflagged++; continue; }
    var last = iLG >= 0 ? Number(row[iLG]) : 0;
    if (isFinite(last) && last > 0) {
      if (last === Number(cycle)) { out.skipped.alreadyThisCycle++; continue; }
      if (Number(cycle) - last < cooldown) { out.skipped.cooldown++; continue; }
    }
    cands.push({ bodyIndex: r, householdId: String(row[iId]), head: iHead >= 0 ? String(row[iHead] == null ? '' : row[iHead]).trim() : '', hood: hood, rent: rent, savings: savings, burden: burden });
  }
  cands.sort(function (a, b) { return b.burden - a.burden || (a.householdId < b.householdId ? -1 : a.householdId > b.householdId ? 1 : 0); });
  out.eligible = cands.length;
  for (var c = 0; c < cands.length && out.trancheLeft > 0; c++) {
    var h = cands[c];
    var need = Math.max(0, h.rent * SAVINGS_BUFFER_MONTHS - h.savings);
    var grant = Math.min(Math.min(need, cap * h.rent) + headroom * h.rent, out.trancheLeft);
    grant = Math.round(grant * 100) / 100;
    if (!(grant > 0)) continue;
    out.grants.push({ bodyIndex: h.bodyIndex, householdId: h.householdId, head: h.head, hood: h.hood, rent: h.rent, burden: h.burden,
                      savingsBefore: h.savings, amount: grant, savingsAfter: Math.round((h.savings + grant) * 100) / 100, clearsBuffer: h.savings + grant >= h.rent * SAVINGS_BUFFER_MONTHS });
    out.trancheLeft = Math.round((out.trancheLeft - grant) * 100) / 100;
    out.paid = Math.round((out.paid + grant) * 100) / 100;
  }
  return out;
}

function applyHousingDisbursement_(ctx, cycle) {
  var out = { available: false, reason: null, programs: 0, grants: 0, paid: 0, debited: 0, armed: false, error: null, detail: [] };
  try {
    return applyHousingDisbursementBody_(ctx, cycle, out);
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
    out.reason = 'error';
    Logger.log('householdFormationEngine: engine.255 housing disbursement ERROR — ' + out.error);
    if (typeof logEngineError_ === 'function') {
      try { logEngineError_(ctx, 'Phase5-HousingDisbursement', e); } catch (e2) { /* the log itself must not throw */ }
    }
    return out;
  }
}

function applyHousingDisbursementBody_(ctx, cycle, out) {
  var S = ctx.summary || {};
  var slice = S.initiativeDisbursement;
  out.available = !!(slice && slice.available === true);
  if (!out.available) { out.reason = slice ? (slice.reason || 'slice-unavailable') : 'slice-missing'; return out; }
  var programs = (slice.programs || []).filter(function (p) { return p && p.domain === 'housing'; });
  if (!programs.length) { out.reason = 'no-program'; return out; }
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Household_Ledger');
  if (!sheet) { out.reason = 'no-sheet'; return out; }
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { out.reason = 'no-households'; return out; }
  var body = data.slice(1);
  var canFold = typeof resolveHoodOrChild_ === 'function' && S.canonHoods && S.canonHoods.set;
  var hoodOf = function (raw) { if (!raw) return ''; if (!canFold) return raw; var f = resolveHoodOrChild_(ctx, raw); return f || ''; };
  var tracker = ss.getSheetByName('Initiative_Tracker');
  var tHeader = tracker ? tracker.getRange(1, 1, 1, tracker.getLastColumn()).getValues()[0] : [];
  var tRemain = tHeader.indexOf('BudgetRemaining'), tLast = tHeader.indexOf('LastDisburseCycle'), tPhase = tHeader.indexOf('ImplementationPhase'), tNotes = tHeader.indexOf('MilestoneNotes');
  var lHeaders = ctx.ledger && ctx.ledger.headers ? ctx.ledger.headers : [];
  var lPop = lHeaders.indexOf('POPID'), lNW = lHeaders.indexOf('NetWorth'), lLastUpd = lHeaders.indexOf('LastUpdated');
  var nwByPop = {};
  if (lPop >= 0 && lNW >= 0 && ctx.ledger.rows) {
    for (var li = 0; li < ctx.ledger.rows.length; li++) {
      var lrow = ctx.ledger.rows[li];
      nwByPop[String(lrow[lPop]).trim()] = Number(String(lrow[lNW]).replace(/[$,\s]/g, '')) || 0;
    }
  }
  var savingsOf = function (membersRaw, head) {
    var ids = [];
    try { var parsed = typeof membersRaw === 'string' ? JSON.parse(membersRaw || '[]') : membersRaw; if (Array.isArray(parsed)) ids = parsed; } catch (e) { ids = []; }
    if (!ids.length && head) ids = [head];
    var sum = 0, seen = false;
    for (var mi = 0; mi < ids.length; mi++) { var k = String(ids[mi]).trim(); if (Object.prototype.hasOwnProperty.call(nwByPop, k)) { sum += nwByPop[k]; seen = true; } }
    return seen ? sum : NaN;
  };
  var touched = false;
  for (var pi = 0; pi < programs.length; pi++) {
    var program = programs[pi];
    out.programs++;
    if (Number(program.lastDisburseCycle) === Number(cycle)) { program.status = 'already-disbursed'; out.detail.push(program.initiativeId + ': already disbursed C' + cycle); continue; }
    if (!(program.tranche > 0)) { program.status = 'no-tranche'; continue; }
    // arm the receipt columns only when a grant is about to be written
    var plan = planHousingDisbursement_(header, body, program, cycle, hoodOf, savingsOf);
    if (plan.skipped && plan.skipped.alreadyThisCycle > 0) { program.status = 'already-disbursed'; out.detail.push(program.initiativeId + ': receipts already stamped C' + cycle); continue; }
    if (plan.grants.length && ensureHousingGrantColumns_(sheet, header)) {
      out.armed = true;
      header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      data = sheet.getDataRange().getValues(); body = data.slice(1);
      plan = planHousingDisbursement_(header, body, program, cycle, hoodOf, savingsOf);
    }
    var iSav = header.indexOf('HouseholdSavings'), iLG = header.indexOf('LastGrantCycle'), iLI = header.indexOf('LastGrantInitiativeID'), iLA = header.indexOf('LastGrantAmount');
    for (var g = 0; g < plan.grants.length; g++) {
      var gr = plan.grants[g];
      var brow = body[gr.bodyIndex];
      brow[iSav] = gr.savingsAfter; brow[iLG] = Number(cycle); brow[iLI] = program.initiativeId; brow[iLA] = gr.amount;
      touched = true;
      // durable money: the head's NetWorth on ctx.ledger (HouseholdSavings re-derives from it next Cycle)
      if (lPop >= 0 && lNW >= 0 && gr.head && ctx.ledger.rows) {
        for (var lr = 0; lr < ctx.ledger.rows.length; lr++) {
          if (String(ctx.ledger.rows[lr][lPop]).trim() === gr.head) {
            var nw0 = Number(String(ctx.ledger.rows[lr][lNW]).replace(/[$,\s]/g, '')) || 0;
            ctx.ledger.rows[lr][lNW] = Math.round((nw0 + gr.amount) * 100) / 100;
            if (lLastUpd >= 0) ctx.ledger.rows[lr][lLastUpd] = ctx.now;
            ctx.ledger.dirty = true;
            break;
          }
        }
      }
      if (typeof queueAppendIntent_ === 'function' && gr.head) {
        queueAppendIntent_(ctx, 'LifeHistory_Log', [ctx.now, gr.head, '', 'Relief',
          'received a $' + Math.round(gr.amount) + ' stabilization grant from ' + program.name + ' (' + program.initiativeId + ')' + (gr.clearsBuffer ? ' — the rent is covered for the year' : ' — a partial, the rent is still heavy'), '', cycle],
          'engine.255 housing grant', 'civic', 5);
      }
    }
    program.paid = plan.paid; program.grants = plan.grants.length; program.eligible = plan.eligible; program.skipped = plan.skipped;
    out.grants += plan.grants.length; out.paid = Math.round((out.paid + plan.paid) * 100) / 100;
    // the whole tranche leaves the fund
    var debit = Math.round(Number(program.tranche) * 100) / 100;
    var newRemaining = Math.round((Number(program.remaining) - debit) * 100) / 100;
    if (newRemaining < 0) newRemaining = 0;
    program.debited = debit; program.newRemaining = newRemaining; program.status = newRemaining <= 0 ? 'exhausted' : 'disbursed';
    out.debited = Math.round((out.debited + debit) * 100) / 100;
    if (tracker && typeof queueCellIntent_ === 'function' && program.sheetRow > 1) {
      if (tRemain >= 0) queueCellIntent_(ctx, 'Initiative_Tracker', program.sheetRow, tRemain + 1, newRemaining, 'engine.255 tranche C' + cycle + ' ' + program.initiativeId, 'civic', 5);
      if (tLast >= 0) queueCellIntent_(ctx, 'Initiative_Tracker', program.sheetRow, tLast + 1, Number(cycle), 'engine.255 disburse receipt C' + cycle + ' ' + program.initiativeId, 'civic', 5);
      if (newRemaining <= 0 && tPhase >= 0) {
        queueCellIntent_(ctx, 'Initiative_Tracker', program.sheetRow, tPhase + 1, 'complete', 'engine.255 budget exhausted C' + cycle + ' ' + program.initiativeId, 'civic', 5);
        if (tNotes >= 0) {
          var prior = String(tracker.getRange(program.sheetRow, tNotes + 1).getValue() || '');
          queueCellIntent_(ctx, 'Initiative_Tracker', program.sheetRow, tNotes + 1, (prior ? prior + '\n' : '') + 'C' + cycle + ': budget exhausted — $' + Math.round(Number(program.remaining)) + ' spent this Cycle closes the fund; service ends', 'engine.255 budget exhausted note', 'civic', 5);
        }
      }
    }
    out.detail.push(program.initiativeId + ': ' + plan.grants.length + ' grant(s) $' + plan.paid + ' of tranche $' + debit + ', remaining ' + newRemaining +
      ' (eligible ' + plan.eligible + '; skipped unflagged ' + plan.skipped.unflagged + ', cooldown ' + plan.skipped.cooldown + ', off-hood ' + plan.skipped.offHood + ')');
  }
  if (touched) {
    var n = body.length;
    var iSav2 = header.indexOf('HouseholdSavings'), iLG2 = header.indexOf('LastGrantCycle'), iLI2 = header.indexOf('LastGrantInitiativeID'), iLA2 = header.indexOf('LastGrantAmount');
    var col = function (i) { var v = []; for (var r = 0; r < n; r++) v.push([body[r][i] === undefined ? '' : body[r][i]]); return v; };
    sheet.getRange(2, iSav2 + 1, n, 1).setValues(col(iSav2));
    sheet.getRange(2, iLG2 + 1, n, 1).setValues(col(iLG2));
    sheet.getRange(2, iLI2 + 1, n, 1).setValues(col(iLI2));
    sheet.getRange(2, iLA2 + 1, n, 1).setValues(col(iLA2));
  }
  out.reason = touched ? 'written' : (out.programs ? 'nothing-to-write' : 'no-program');
  Logger.log('householdFormationEngine: engine.255 housing disbursement — ' + out.programs + ' program(s), ' + out.grants + ' grant(s) $' + out.paid + ', debited $' + out.debited + (out.detail.length ? ' | ' + out.detail.join(' | ') : ''));
  return out;
}

function detectHouseholdStress_(ss, households) {
  var stressed = [];

  for (var i = 0; i < households.length; i++) {
    var household = households[i];

    if (household.householdIncome === 0) continue;

    // Calculate housing burden. engine.159 (S414): MonthlyRent is the monthly
    // number for BOTH tenures — on a purchase trackHomeOwnership_ writes the
    // mortgage payment into MonthlyRent and the PRICE into HousingCost. The
    // old ternary read the price as an owned household's monthly cost, so
    // every buyer sat in permanent "crisis" (burden ≈ 50×) and rolled the
    // 10 % dissolution every cycle — live C105: 47 of 117 owned households,
    // bench C106–C118: 9–14 owned dissolutions per fire, every one a buyer.
    var monthlyCost = household.monthlyRent;
    var annualCost = monthlyCost * 12;
    var rentBurden = annualCost / household.householdIncome;

    // S316 savings wiring: reserves absorb the crisis — a household holding
    // SAVINGS_BUFFER_MONTHS of housing cost doesn't collapse from a burden
    // spike. Keep the constant aligned with migrationTrackingEngine's.
    if (monthlyCost > 0 && (household.householdSavings || 0) >= monthlyCost * SAVINGS_BUFFER_MONTHS) continue;

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

function dissolveStressedHouseholds_(ctx, stressedHouseholds, cycle, rng) {
  if (typeof rng !== 'function') throw new Error('householdFormationEngine.dissolveStressedHouseholds_: rng parameter required (Phase 40.3 Path 1)');
  var ss = ctx.ss;
  var dissolved = [];

  // engine.56 (S316): dissolution is now REAL — members' SL HouseholdId is
  // cleared (via ctx.ledger, Phase 10 commits) and the row's Members empties.
  // Before this, "dissolved" was pure bookkeeping: citizens stayed assigned,
  // and 272 such rows had rotted in the ledger by the C129 audit (the
  // reconcile pass would also have resurrected them next cycle).
  var lHeader = ctx.ledger.headers;
  var lHHCol = lHeader.indexOf('HouseholdId');

  for (var i = 0; i < stressedHouseholds.length; i++) {
    var stressed = stressedHouseholds[i];

    if (stressed.severity === 'crisis' && rng() < 0.10) {  // 10% chance
      dissolved.push(stressed.household);

      var sheet = ss.getSheetByName('Household_Ledger');
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var statusCol = headers.indexOf('Status') + 1;
      var dissolvedCol = headers.indexOf('DissolvedCycle') + 1;
      var membersCol = headers.indexOf('Members') + 1;

      if (statusCol > 0) {
        sheet.getRange(stressed.household.rowIndex, statusCol).setValue('dissolved');
      }
      if (dissolvedCol > 0) {
        sheet.getRange(stressed.household.rowIndex, dissolvedCol).setValue(cycle);
      }
      if (membersCol > 0) {
        sheet.getRange(stressed.household.rowIndex, membersCol).setValue('[]');
      }

      // Release the citizens — they become unhoused-of-record until the
      // formation engine re-homes them (young singles) or intake reassigns
      var mem = Array.isArray(stressed.household.members) ? stressed.household.members : [];
      if (lHHCol >= 0 && mem.length) {
        for (var r = 0; r < ctx.ledger.rows.length; r++) {
          var popId = ctx.ledger.rows[r][lHeader.indexOf('POPID')];
          if (mem.indexOf(popId) >= 0 && ctx.ledger.rows[r][lHHCol] === stressed.household.householdId) {
            ctx.ledger.rows[r][lHHCol] = '';
            ctx.ledger.dirty = true;
          }
        }
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
    domain: 'COMMUNITY',
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
    domain: 'COMMUNITY',
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
    domain: 'COMMUNITY',
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
