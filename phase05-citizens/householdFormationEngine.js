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
    results.householdsFormed = 0;

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
      iMarital = idx('MaritalStatus'), iBirthYear = idx('BirthYear');
  if (iPOPID < 0 || iHH < 0) return out;
  var simYear = 2040 + Math.floor(cycle / 52);

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
          newType = (headMar === 'married' || headMar === 'partnered') ? 'couple' : 'single';
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
    if (li('MonthlyRent') >= 0) newRow[li('MonthlyRent')] = estimateRent_(hood2);
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
  var simYear = 2040 + Math.floor(cycle / 52);

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
