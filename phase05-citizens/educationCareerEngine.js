/**
 * ============================================================================
 * EDUCATION & CAREER ENGINE v2.1
 * ============================================================================
 *
 * Tracks education levels, career progression, and education → career pathways.
 *
 * Part of: Week 3 Education Pipeline & Career Pathways
 *
 * Features:
 * - Education level derivation from UNI/MED/CIV flags
 * - Career stage tracking (student → entry → mid → senior → retired)
 * - Career advancement based on education + experience
 * - School quality impact on career outcomes
 * - Education → career advancement speed (was income correlation in v1.x)
 * - Career mobility detection
 *
 * v2.1 Phase 42 §5.6 alignment (S200):
 * - Simulation_Ledger reads/writes route through shared ctx.ledger.
 *   Pre-v2.1 the engine read SL via getDataRange (saw cycle-start state,
 *   missed cohort-A in-memory mutations and Wealth's same-engine Income/
 *   WealthLevel updates from earlier in Phase 5) and wrote back via direct
 *   setValues that Phase 10 commitSimulationLedger_ silently clobbered.
 *   Education levels, career stage advancements, and mobility flags were
 *   all being lost every cycle since §5.6 went live S188.
 *   Caught by S200 cohort-C audit; S185's §5.6.6 categorical orphan-clear
 *   missed it (audit grepped file names but the cycle entry point is
 *   processEducationCareer_, not the file name).
 * - Side fix: detectCareerMobility_ pre-v2.1 only persisted CareerMobility
 *   updates if at least one stagnation hook fired (events > 0). Mobility
 *   was always computed but the conditional write meant most cycles' values
 *   never landed. Under §5.6 the conditional disappears — mutations to
 *   ctx.ledger.rows persist regardless once any other writer flips dirty.
 *   Local dirty flip added so the engine doesn't depend on other writers.
 *
 * v2.0 Changes (Phase 14.2):
 * - Removed INCOME_BY_EDUCATION and matchEducationToIncome_()
 * - Income no longer overridden by education level
 * - Education affects career advancement speed, not income directly
 * - Eliminates three-way income conflict (career/education/role-based)
 *
 * Integration:
 * - Reads UNI/MED/CIV flags from Simulation_Ledger via ctx.ledger
 * - Hooks into career engine for promotions
 * - Uses school quality from Neighborhood_Demographics (own tracking sheet,
 *   read directly — not SL-related)
 *
 * Story Hooks:
 * - SCHOOL_QUALITY_CRISIS (severity 8): School quality <3
 * - CAREER_BREAKTHROUGH (severity 4): Promotion 2+ levels
 * - EDUCATION_MOBILITY (severity 5): First in family to graduate college
 * - CAREER_STAGNATION (severity 3): No advancement 20+ cycles
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// Education levels
var EDUCATION_LEVELS = {
  NONE: 'none',
  HS_DROPOUT: 'hs-dropout',
  HS_DIPLOMA: 'hs-diploma',
  SOME_COLLEGE: 'some-college',
  BACHELOR: 'bachelor',
  GRADUATE: 'graduate'
};

// Career stages
// ENGINE_REPAIR Row 24 (S327): the live CareerStage vocab drifted across
// generations of writers — S327 live quant: entry-level 88 / entry 3 / early 6
// / early-career 1, mid-career 228 / mid 64, senior 219, retired 252,
// student 62, blank 7. Exact-string comparisons froze advancement for every
// non-canonical row (ENTRY→MID never fired for 10, MID→SENIOR missed 64).
// Class-normalize on READ (runYouthEngine case-fold pattern, non-destructive);
// advancement WRITES the canonical string, so vocabulary heals forward as
// citizens advance — no bulk rewrite.
function careerStageClass_(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s === 'entry' || s === 'entry-level' || s === 'early' || s === 'early-career') return 'ENTRY';
  if (s === 'mid' || s === 'mid-career') return 'MID';
  if (s === 'senior') return 'SENIOR';
  if (s === 'student') return 'STUDENT';
  if (s === 'retired') return 'RETIRED';
  return 'MID'; // blank/unknown keeps the existing default-to-MID behavior
}

var CAREER_STAGES = {
  STUDENT: 'student',
  ENTRY: 'entry-level',
  MID: 'mid-career',
  SENIOR: 'senior',
  RETIRED: 'retired'
};

// Career mobility states
var CAREER_MOBILITY = {
  STAGNANT: 'stagnant',
  ADVANCING: 'advancing',
  DECLINING: 'declining'
};

// v14.2: REMOVED — Education no longer overrides income.
// Income is set by applyEconomicProfiles.js (role-based) and adjusted by
// Career Engine transitions. Education affects career advancement speed,
// not income directly. Old values preserved as comment for reference:
// none: 28000, hs-dropout: 30000, hs-diploma: 42000,
// some-college: 55000, bachelor: 75000, graduate: 120000

// Career stage advancement thresholds (cycles)
var ADVANCEMENT_CYCLES = {
  ENTRY_TO_MID: 10,      // 10 cycles (~6 months)
  MID_TO_SENIOR: 20,     // 20 cycles (~1 year)
  STAGNATION: 40         // 40 cycles (~2 years) without advancement
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════════════

function processEducationCareer_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('processEducationCareer_: ctx.ledger not initialized');
  }
  var rng = safeRand_(ctx);

  var ss = ctx.ss;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processEducationCareer_ v2.1: Starting...');

  var results = {
    processed: 0,
    educationUpdated: 0,
    careerAdvanced: 0,
    stagnationDetected: 0,
    incomeAdjusted: 0
  };

  // Step 1: Derive education levels from existing flags
  var eduResults = deriveEducationLevels_(ctx, rng);
  results.educationUpdated = eduResults.updated;

  // Step 2: Update career stages and track progression
  var careerResults = updateCareerProgression_(ctx, cycle, rng);
  results.careerAdvanced = careerResults.advanced;
  results.stagnationDetected = careerResults.stagnant;

  // Step 3: REMOVED in v14.2 — income no longer derived from education.
  // Income is set by role-based economic profiles (applyEconomicProfiles.js)
  // and adjusted by Career Engine transitions. Education affects career
  // advancement speed (Step 2) but does not override income.
  results.incomeAdjusted = 0;

  // Step 4: Detect career mobility (advancing/stagnant/declining)
  var mobilityResults = detectCareerMobility_(ctx, cycle, rng);
  results.mobilityEvents = mobilityResults.events;

  // Step 5: Check school quality and generate alerts (Neighborhood_Demographics
  // — not SL, signature stays direct).
  var schoolResults = checkSchoolQuality_(ss, ctx, cycle);
  results.schoolAlerts = schoolResults.alerts;

  // Step 6 (engine.57 P4): a kid's SchoolQuality follows the household's
  // neighborhood — the family's address is a causal input on the child.
  results.schoolQualitySet = updateMinorSchoolQuality_(ss, ctx, cycle);

  // Step 7 (engine.60 T4, S321): the 18th-birthday settlement — career-entry
  // draw weighted by household standing. The generational transfer moment.
  results.adulthood = settleAdulthood_(ctx, cycle, rng);

  Logger.log(
    'processEducationCareer_ v2.1: Complete. ' +
    'Education: ' + results.educationUpdated + ', ' +
    'Career: ' + results.careerAdvanced + ', ' +
    'Stagnant: ' + results.stagnationDetected + ', ' +
    'Income: ' + results.incomeAdjusted
  );

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// EDUCATION LEVEL DERIVATION
// ════════════════════════════════════════════════════════════════════════════

function deriveEducationLevels_(ctx, rng) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { updated: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iEducation = idx('EducationLevel');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iLife = idx('LifeHistory');
  var iStatus = idx('Status');
  var iBirthYear = idx('BirthYear');

  if (iEducation < 0) return { updated: 0 };

  var updated = 0;
  var simYear = 2040 + Math.floor(((ctx && ctx.summary && ctx.summary.cycleId) || 0) / 52);

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue; // Skip undefined or invalid rows
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    // S320 (Mike-direct): FILL-only, never re-roll — this loop overwrote every
    // citizen's EducationLevel with fresh RNG every cycle (a grad one cycle
    // could roll dropout the next). Same doctrine as the S319 income fix:
    // blanks get derived once; set values are identity, owned by real events
    // (graduation, promotion derivation, birth Pre-K).
    if (String(row[iEducation] || '').trim() !== '') continue;

    var uni = iUNI >= 0 ? row[iUNI].toString().toLowerCase() : 'no';
    var med = iMED >= 0 ? row[iMED].toString().toLowerCase() : 'no';
    var civ = iCIV >= 0 ? row[iCIV].toString().toLowerCase() : 'no';
    var lifeHistory = iLife >= 0 ? (row[iLife] || '').toString() : '';
    var birthYear = iBirthYear >= 0 ? (Number(row[iBirthYear]) || 0) : 0;
    var age = birthYear > 0 ? (simYear - birthYear) : 30;

    // Derive education level
    var eduLevel = EDUCATION_LEVELS.HS_DIPLOMA; // Default

    if (med === 'yes' || med === 'y') {
      eduLevel = EDUCATION_LEVELS.GRADUATE; // Medical requires grad degree
    } else if (uni === 'yes' || uni === 'y') {
      eduLevel = EDUCATION_LEVELS.BACHELOR; // University background
    } else if (civ === 'yes' || civ === 'y') {
      eduLevel = EDUCATION_LEVELS.SOME_COLLEGE; // Civic work often requires some college
    } else if (lifeHistory.indexOf('Graduation') >= 0) {
      eduLevel = EDUCATION_LEVELS.BACHELOR; // Graduated in history
    } else if (age < 18) {
      eduLevel = EDUCATION_LEVELS.NONE; // Youth
    } else if (age < 22) {
      eduLevel = rng() < 0.8 ? EDUCATION_LEVELS.HS_DIPLOMA : EDUCATION_LEVELS.HS_DROPOUT;
    } else {
      // Adults: 85% HS diploma, 10% some college, 5% dropout
      // S320: was `var r = rng()` — SHADOWED THE LOOP COUNTER; the first
      // plain adult reset r to a 0-1 float and every later index was
      // undefined, so only a prefix of the ledger ever processed per cycle.
      var eduRoll = rng();
      if (eduRoll < 0.05) eduLevel = EDUCATION_LEVELS.HS_DROPOUT;
      else if (eduRoll < 0.15) eduLevel = EDUCATION_LEVELS.SOME_COLLEGE;
      else eduLevel = EDUCATION_LEVELS.HS_DIPLOMA;
    }

    row[iEducation] = eduLevel;
    updated++;
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
  }

  return { updated: updated };
}


/**
 * Row 24 (b) — real advancement gets its narrative from the OWNING engine.
 * Pre-S327 the structural CareerStage change was silent while phase04 rolled
 * hollow [Promotion] dice with no structural effect — the two never met.
 * Person-readable EventText (Row 32 lesson: what changed in the life, not
 * tier bookkeeping); 'Promotion' is a real DIAL_MAP tag (drive +8,
 * composure +2). LifeHistory_Log rides queueAppendIntent_ (Phase-5 SL-writer
 * log class); guarded so a missing column never blocks the advancement.
 */
function stampPromotion_(ctx, row, iLife, iLastU, iPop, iFirst, iLast, iNb, iOcc, verb, years, cycle) {
  try {
    var name = ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).toString().trim();
    var occ = iOcc >= 0 ? String(row[iOcc] || '').trim() : '';
    var text = verb + ' after ' + Math.round(years) + ' years' +
      (occ ? ' as ' + (/^[aeiou]/i.test(occ) ? 'an ' : 'a ') + occ : '') + '.';
    var stamp = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : ('C' + cycle);
    if (iLife >= 0) {
      var line = stamp + ' — [Promotion] ' + text;
      var existing = row[iLife] ? row[iLife].toString() : '';
      row[iLife] = existing ? existing + '\n' + line : line;
    }
    if (iLastU >= 0) row[iLastU] = stamp;
    if (typeof queueAppendIntent_ === 'function') {
      queueAppendIntent_(ctx, 'LifeHistory_Log',
        [stamp, (iPop >= 0 ? row[iPop] : ''), name, 'Promotion', text,
         (iNb >= 0 ? (row[iNb] || '') : ''), cycle],
        'career promotion', 'citizens');
    }
  } catch (e) {
    if (typeof Logger !== 'undefined') Logger.log('stampPromotion_ soft-fail: ' + e);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CAREER PROGRESSION
// ════════════════════════════════════════════════════════════════════════════

function updateCareerProgression_(ctx, cycle, rng) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { advanced: 0, stagnant: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iCareerStage = idx('CareerStage');
  var iYearsInCareer = idx('YearsInCareer');
  var iEducation = idx('EducationLevel');
  var iBirthYear = idx('BirthYear');
  var iStatus = idx('Status');
  var iLastPromotion = idx('LastPromotionCycle');
  var iLife = idx('LifeHistory');
  // Row 24 (b): the OWNING engine stamps the promotion narrative
  var iPop24 = idx('POPID');
  var iFirst24 = idx('First');
  var iLast24 = idx('Last');
  var iNb24 = idx('Neighborhood');
  var iOcc24 = idx('Occupation');
  var iLastU24 = idx('LastUpdated');

  if (iCareerStage < 0 || iYearsInCareer < 0) return { advanced: 0, stagnant: 0 };

  var advanced = 0;
  var stagnant = 0;
  var simYear = 2040 + Math.floor(cycle / 52);

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue; // Skip undefined or invalid rows
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var birthYear = iBirthYear >= 0 ? (Number(row[iBirthYear]) || 0) : 0;
    var age = birthYear > 0 ? (simYear - birthYear) : 30;
    var careerStage = iCareerStage >= 0 ? (row[iCareerStage] || CAREER_STAGES.MID) : CAREER_STAGES.MID;
    var yearsInCareer = iYearsInCareer >= 0 ? (Number(row[iYearsInCareer]) || 0) : 0;
    var education = iEducation >= 0 ? (row[iEducation] || 'hs-diploma') : 'hs-diploma';
    var lastPromotion = iLastPromotion >= 0 ? (Number(row[iLastPromotion]) || 0) : 0;
    var lifeHistory = iLife >= 0 ? (row[iLife] || '').toString() : '';

    // Update years in career — only working-age adults accrue (S318 age
    // gate; students banked career years for cycles, e.g. age 10 with 36y).
    // engine.62b (S322): +0.5 every 26 cycles = +1 career-year per sim-year
    // (calendar runs 52 cycles/year). The old unconditional +0.5/cycle paid
    // ~26 career-years per sim-year — the machine behind the age-impossible
    // YearsInCareer fossils (112 trued S322; one C104 fire minted 10 more).
    if (age >= 22 && cycle > 0 && cycle % 26 === 0) {
      yearsInCareer += 0.5;
      row[iYearsInCareer] = Math.round(yearsInCareer * 10) / 10;
    }

    // Check for career stage advancement
    if (age < 22) {
      row[iCareerStage] = CAREER_STAGES.STUDENT;
    } else if (age >= 65) {
      row[iCareerStage] = CAREER_STAGES.RETIRED;
    } else {
      // Check if eligible for advancement — class-normalized (Row 24 a)
      var cyclesSincePromotion = cycle - lastPromotion;
      var stageClass = careerStageClass_(careerStage);

      if (stageClass === 'ENTRY' && cyclesSincePromotion >= ADVANCEMENT_CYCLES.ENTRY_TO_MID) {
        // Entry → Mid
        if (yearsInCareer >= 5 && rng() < 0.15) {
          row[iCareerStage] = CAREER_STAGES.MID;
          row[iLastPromotion] = cycle;
          stampPromotion_(ctx, row, iLife, iLastU24, iPop24, iFirst24, iLast24, iNb24, iOcc24,
            'stepped up into mid-career', yearsInCareer, cycle);
          advanced++;
        }
      } else if (stageClass === 'MID' && cyclesSincePromotion >= ADVANCEMENT_CYCLES.MID_TO_SENIOR) {
        // Mid → Senior (requires education)
        // S321 (engine.60 T4 adjacent fix): was exact-match 'bachelor' /
        // 'graduate' — the live ledger holds 'bachelors'/'masters'/'doctorate',
        // so the education boost silently never fired. eduRank_ accepts both.
        var advanceChance = 0.05;
        var advRank = eduRank_(education);
        if (advRank === 1) advanceChance = 0.10;
        if (advRank === 2) advanceChance = 0.15;

        if (yearsInCareer >= 10 && rng() < advanceChance) {
          row[iCareerStage] = CAREER_STAGES.SENIOR;
          row[iLastPromotion] = cycle;
          stampPromotion_(ctx, row, iLife, iLastU24, iPop24, iFirst24, iLast24, iNb24, iOcc24,
            'was promoted into a senior role', yearsInCareer, cycle);
          advanced++;
        }
      }

      // Detect stagnation — class-normalized (Row 24 a)
      if (cyclesSincePromotion >= ADVANCEMENT_CYCLES.STAGNATION && stageClass !== 'SENIOR') {
        stagnant++;
      }
    }
  }

  if (advanced > 0 || stagnant > 0) {
    ctx.ledger.dirty = true;
  }

  return { advanced: advanced, stagnant: stagnant };
}


// ════════════════════════════════════════════════════════════════════════════
// EDUCATION → INCOME MATCHING (REMOVED in v14.2)
// ════════════════════════════════════════════════════════════════════════════
// matchEducationToIncome_() removed. Income is now set by role-based economic
// profiles (applyEconomicProfiles.js) and adjusted by Career Engine transitions.
// Education affects career advancement speed (updateCareerProgression_) but
// does not directly set or override income. This eliminates the three-way
// income conflict between Career Engine bands, Education income map, and
// role-based profiles.


// ════════════════════════════════════════════════════════════════════════════
// CAREER MOBILITY DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectCareerMobility_(ctx, cycle, rng) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { events: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iMobility = idx('CareerMobility');
  var iLastPromotion = idx('LastPromotionCycle');
  var iCareerStage = idx('CareerStage');
  var iStatus = idx('Status');
  var iName = idx('First');
  var iLast = idx('Last');

  if (iMobility < 0) return { events: 0 };

  var events = 0;
  var mutated = false;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue; // Skip undefined or invalid rows
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var lastPromotion = iLastPromotion >= 0 ? (Number(row[iLastPromotion]) || 0) : 0;
    var careerStage = iCareerStage >= 0 ? (row[iCareerStage] || 'mid-career') : 'mid-career';
    var cyclesSincePromotion = cycle - lastPromotion;

    var mobility = CAREER_MOBILITY.STAGNANT;

    if (cyclesSincePromotion < 15 && careerStage !== 'retired') {
      mobility = CAREER_MOBILITY.ADVANCING;
    } else if (cyclesSincePromotion >= ADVANCEMENT_CYCLES.STAGNATION) {
      mobility = CAREER_MOBILITY.STAGNANT;

      // Generate stagnation story hook
      if (rng() < 0.05) {
        var name = (iName >= 0 ? row[iName] : '') + ' ' + (iLast >= 0 ? row[iLast] : '');
        ctx.summary.storyHooks = ctx.summary.storyHooks || [];
        ctx.summary.storyHooks.push({
          hookType: 'CAREER_STAGNATION',
          severity: 3,
          description: name.trim() + ' has not advanced in ' + Math.floor(cyclesSincePromotion / 2) + ' years',
          cycleGenerated: cycle,
          careerStage: careerStage,
          cyclesSincePromotion: cyclesSincePromotion
        });
        events++;
      }
    }

    row[iMobility] = mobility;
    mutated = true;
  }

  // Side fix v2.1: pre-fix conditional `if (events > 0)` write meant most
  // cycles' Mobility values never landed. Mutations are unconditional in the
  // loop above; flip dirty whenever any row was processed so values always
  // commit at Phase 10.
  if (mutated) ctx.ledger.dirty = true;

  return { events: events };
}


// ════════════════════════════════════════════════════════════════════════════
// SCHOOL QUALITY CHECKS
// ════════════════════════════════════════════════════════════════════════════

// CANON NOTE (S247): SCHOOL_QUALITY_CRISIS (quality<3) and DROPOUT_WAVE (grad<65%)
// are deprivation-coded hooks. GodWorld Oakland is the ascended/prosperous timeline
// (median >$90K) — school CRISIS is off-canon by construction. Neighborhood_Demographics
// education columns are backfilled with prosperity-calibrated values (>=7 quality /
// >=85 grad via scripts/backfillNeighborhoodEducation.js), so these gates stay DORMANT
// BY THE DATA, which is correct — do NOT "fix" the dormancy by lowering school values to
// make crises fire (that re-introduces the S245 invented-struggle fidelity failure). The
// function still runs as a guard: if a real value ever dropped below the gates it would
// surface, but in canon it should not. The columns feed POSITIVE display downstream
// (buildNeighborhoodCards/MCP, buildInitiativePackets, buildCivicVoicePackets).
function updateMinorSchoolQuality_(ss, ctx, cycle) {
  // engine.57 P4: minors (< 18) in a household get SchoolQuality stamped from
  // their neighborhood's SchoolQualityIndex. ctx.ledger mutation; Phase 10
  // commits. Adults and household-less rows untouched.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return 0;
  var idx = function(n) { return header.indexOf(n); };
  var iBirth = idx('BirthYear'), iHood = idx('Neighborhood'),
      iHH = idx('HouseholdId'), iSQ = idx('SchoolQuality'), iStatus = idx('Status');
  if (iSQ < 0 || iBirth < 0 || iHood < 0) return 0;

  var demoSheet = ss.getSheetByName('Neighborhood_Demographics');
  if (!demoSheet) return 0;
  var demo = demoSheet.getDataRange().getValues();
  var dh = demo[0];
  var dHood = dh.indexOf('Neighborhood'), dQ = dh.indexOf('SchoolQualityIndex');
  if (dHood < 0 || dQ < 0) return 0;
  var qualityByHood = {};
  for (var d = 1; d < demo.length; d++) qualityByHood[demo[d][dHood]] = Number(demo[d][dQ]) || 5;

  var simYear = 2040 + Math.floor(((ctx && ctx.summary && ctx.summary.cycleId) || cycle || 0) / 52);
  // engine.65 (S323): heritage tier unlock — a kid in an Established+ line
  // reads one notch above the neighborhood index (the parents' life buying
  // the children's start). Same-cycle signal: generationalWealthEngine runs
  // before this engine in Phase 5 and publishes S.heritage.lineByPop.
  var lineByPop = (ctx && ctx.summary && ctx.summary.heritage && ctx.summary.heritage.lineByPop) || {};
  var iPopSQ = idx('POPID');
  var set = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased' || status === 'inactive') continue;
    var by = Number(row[iBirth]) || 0;
    if (by <= 0) continue;
    var age = simYear - by;
    if (age >= 18) continue;
    if (iHH >= 0 && !String(row[iHH] || '').trim()) continue; // household kids only
    var q = qualityByHood[row[iHood]];
    if (q === undefined) continue;
    var hLine = iPopSQ >= 0 ? lineByPop[String(row[iPopSQ] || '').trim()] : null;
    if (hLine && heritageRank_(hLine.tier) >= 1) q = Math.min(10, q + 1);
    if (Number(row[iSQ]) !== q) { row[iSQ] = q; set++; }
  }
  if (set > 0) ctx.ledger.dirty = true;
  return set;
}

// ════════════════════════════════════════════════════════════════════════════
// engine.60 T4 (S321) — THE 18TH-BIRTHDAY SETTLEMENT
// On a citizen's age crossing 18 (BirthYear-computed, fires once via the
// [Adulthood] LifeHistory marker): career-entry quality draw weighted by
// household standing — HouseholdIncome band + SchoolQuality (engine.57 P4
// stamp) + best parent EducationLevel (ParentIds, JSON array). Seeds
// RoleType / Income / EducationLevel as rich-start / solid-start /
// rough-start. Mike-direct: "better career-engine outcomes for their kids
// at 18" — inheritance of opportunity. Jitter is upward-only (prosperity
// canon: the floor can rise, the draw never punishes below the score).
// ════════════════════════════════════════════════════════════════════════════

var ADULT_START_BANDS = {
  rich: {
    edu: 'bachelors',
    incomeMin: 55000, incomeMax: 72000,
    roles: ['Biotech Lab Assistant', 'Junior Accountant', 'Civic Program Assistant',
            'Research Assistant', 'Paralegal', 'Smart Grid Trainee'],
    line: 'stepped into adult life with the wind at their back'
  },
  solid: {
    edu: 'some-college',
    incomeMin: 38000, incomeMax: 52000,
    roles: ['Apprentice Electrician', 'Nurse Aide', 'Office Assistant',
            'Bank Teller', 'Solar Installer', 'Carpenter Apprentice'],
    line: 'stepped into adult life steady, first paycheck in hand'
  },
  rough: {
    edu: 'hs-diploma',
    incomeMin: 28000, incomeMax: 36000,
    roles: ['Line Cook', 'Server', 'Barista', 'Retail Clerk',
            'Security Guard', 'Construction Laborer'],
    line: 'started from scratch and knows it'
  }
};

// engine.62 (S322): settlement employer wire.
// EconomicProfileKey: canonical economic_parameters.json role where one exists,
// else the RoleType itself — either way non-empty, which is the gate that stops
// generationalWealthEngine.calculateCitizenIncomes_ from re-deriving a settled
// 18-year-old's income on later cycles (same contract applyEconomicProfiles.js
// seeds) and lets runCareerEngine adjust income on transitions.
var SETTLE_ECON_KEYS = {
  'Biotech Lab Assistant':   'Medical Lab Technician',
  'Junior Accountant':       'Accountant / CPA',
  'Civic Program Assistant': 'City Council Aide',
  'Research Assistant':      'Medical Lab Technician',
  'Paralegal':               'Municipal Court Clerk',
  'Smart Grid Trainee':      'Smart Grid Technician',
  'Apprentice Electrician':  'Electrician',
  'Nurse Aide':              'Home Health Aide'
};

// Industry bucket per settlement role — drives the employer draw. Default 'service'.
var SETTLE_INDUSTRY = {
  'Biotech Lab Assistant': 'tech', 'Research Assistant': 'tech',
  'Civic Program Assistant': 'public', 'Paralegal': 'public',
  'Smart Grid Trainee': 'public', 'Nurse Aide': 'public'
};

// Sector → industry classifier. MUST stay in sync with classifySectorToIndustry_
// inside runCareerEngine_ (function-scoped there, so not callable from this file).
function classifySettleSector_(sector) {
  var s = String(sector || '').toLowerCase();
  if (/tech|software|cloud|\bai\b|analytics|platform|agent|biotech|intelligence|coworking|venture/.test(s)) return 'tech';
  if (/media|journal|gallery|entertainment|nightlife|music|design|architect|arts/.test(s)) return 'creative';
  if (/public|municipal|government|transit|utilit|civic|education|healthcare|legal|judicial|safety|\bport\b|logistic|faith|community|housing|social/.test(s)) return 'public';
  return 'service';
}

// Live Business_Ledger pool by industry — same shape runCareerEngine builds.
// Returns null on read failure; caller then skips the employer write (blank
// EmployerBizId is the pre-wire status quo, never a thrown cycle).
function buildSettleBizPool_(ctx) {
  try {
    var bizSheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (!bizSheet) return null;
    var bizData = bizSheet.getDataRange().getValues();
    if (bizData.length < 2) return null;
    var bh = bizData[0], bId = -1, bSector = -1;
    for (var c = 0; c < bh.length; c++) {
      var h = String(bh[c]).trim();
      if (h === 'BIZ_ID') bId = c;
      if (h === 'Sector') bSector = c;
    }
    if (bId < 0 || bSector < 0) return null;
    var pools = { tech: [], service: [], public: [], creative: [] };
    for (var r = 1; r < bizData.length; r++) {
      var id = String(bizData[r][bId] || '').trim();
      if (id) pools[classifySettleSector_(bizData[r][bSector])].push(id);
    }
    return pools;
  } catch (e) {
    Logger.log('buildSettleBizPool_: Business_Ledger read failed (' + e.message + ') — settlement employer skipped');
    return null;
  }
}

// Education rank shared by the settlement draw and career advancement.
// Accepts both live-ledger spellings (bachelors/masters/doctorate) and the
// engine constants (bachelor/graduate) — the ledger predominantly holds the
// plural forms, so exact-match checks silently never fire on live data.
function eduRank_(v) {
  v = String(v || '').toLowerCase();
  if (v.indexOf('doctorate') >= 0 || v.indexOf('masters') >= 0 || v === 'graduate') return 2;
  if (v.indexOf('bachelor') >= 0) return 1;
  return 0;
}

function settleAdulthood_(ctx, cycle, rng) {
  var results = { settled: 0, rich: 0, solid: 0, rough: 0 };
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return results;
  var idx = function(n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iBirth = idx('BirthYear'), iLife = idx('LifeHistory'),
      iStatus = idx('Status'), iHH = idx('HouseholdId'), iSQ = idx('SchoolQuality'),
      iParents = idx('ParentIds'), iEdu = idx('EducationLevel'), iRole = idx('RoleType'),
      iInc = idx('Income'), iEcon = idx('EconomicProfileKey'), iEmployer = idx('EmployerBizId');
  if (iBirth < 0 || iLife < 0 || iEdu < 0 || iRole < 0 || iInc < 0) return results;

  var simYear = 2040 + Math.floor(cycle / 52);
  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);

  // Household income map — one read, same source the money loop uses.
  var hhIncome = {};
  var hhSheet = ctx.ss.getSheetByName('Household_Ledger');
  if (hhSheet) {
    var hv = hhSheet.getDataRange().getValues();
    var hId = hv[0].indexOf('HouseholdId'), hInc = hv[0].indexOf('HouseholdIncome'),
        hStat = hv[0].indexOf('Status');
    for (var q = 1; q < hv.length; q++) {
      if (String(hv[q][hStat] || '').toLowerCase() !== 'active') continue;
      hhIncome[String(hv[q][hId])] = Number(hv[q][hInc]) || 0;
    }
  }

  // POPID → row lookup for the parent-education leg of the draw.
  var rowByPop = {};
  if (iPop >= 0 && iParents >= 0) {
    for (var p = 0; p < rows.length; p++) {
      if (rows[p] && rows[p][iPop]) rowByPop[String(rows[p][iPop]).trim()] = rows[p];
    }
  }

  var diag = 0;
  var bizPool; // engine.62: lazy — Business_Ledger read only on cycles that settle someone
  var heritageByPop = null; // engine.66: lazy — Heritage_Ledger read only on cycles that settle someone
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    if (String(row[iStatus] || 'active').toLowerCase() !== 'active') continue;
    var by = Number(row[iBirth]) || 0;
    if (by <= 0 || (simYear - by) !== 18) continue;
    var life = String(row[iLife] || '');
    if (life.indexOf('[Adulthood]') >= 0) continue; // fires exactly once
    // Seeded/sports rows are managed externally — the settlement is for
    // kids the sim raised, not citizens the seeder or sports layer owns.
    if (iEcon >= 0 && String(row[iEcon] || '').trim() !== '') continue;

    // The draw: household income band + school quality + best parent edu,
    // plus upward-only jitter. Bands per plan §T4: rich ≥140k HH / rough <60k.
    var score = 0;
    var hhInc = hhIncome[String(row[iHH] || '').trim()] || 0;
    if (hhInc >= 140000) score += 2; else if (hhInc >= 60000) score += 1;
    var sq = iSQ >= 0 ? (Number(row[iSQ]) || 0) : 0;
    if (sq >= 8) score += 2; else if (sq >= 6) score += 1;
    var parentRank = 0;
    if (iParents >= 0 && row[iParents]) {
      var pids = [];
      try { pids = JSON.parse(String(row[iParents])); } catch (e) { pids = []; }
      for (var k = 0; k < pids.length; k++) {
        var pRow = rowByPop[String(pids[k]).trim()];
        if (pRow) parentRank = Math.max(parentRank, eduRank_(pRow[iEdu]));
      }
    }
    score += parentRank;
    // engine.66 (S324, Mike-direct): the family-network perk — a settling
    // 18-year-old on a founded heritage line draws with the line's weight
    // behind them. Not a handout: a score bump into the same dice, tier-scaled
    // (Founding/Established +1, Prominent/Dynasty +2). The better band IS the
    // "first good job" — roles and income follow the draw, physics intact.
    var hTier = null;
    if (iPop >= 0) {
      if (heritageByPop === null) {
        heritageByPop = (typeof heritageTierByPop_ === 'function') ? heritageTierByPop_(ctx.ss) : {};
      }
      hTier = heritageByPop[String(row[iPop]).trim()] || null;
      if (hTier) score += (hTier === 'Prominent' || hTier === 'Dynasty') ? 2 : 1;
    }
    var total = score + rng() * 1.5;
    var band = total >= 5 ? 'rich' : (total >= 2 ? 'solid' : 'rough');
    var b = ADULT_START_BANDS[band];

    row[iEdu] = (band === 'rough' && rng() < 0.15) ? 'hs-dropout' : b.edu;
    row[iRole] = b.roles[Math.floor(rng() * b.roles.length)];
    row[iInc] = Math.round((b.incomeMin + rng() * (b.incomeMax - b.incomeMin)) / 100) * 100;

    // engine.62b (S322): a settled 18-year-old starts adult money life —
    // young-adult DebtLevel + starter NetWorth + years 0 + entry stage
    // (C105 cohort landed with blanks; the truing detector flags them every
    // New Year otherwise). Derivation lib, seed First|Last|POPID.
    var sSeed = (iPop >= 0 ? String(row[iPop]) : 'row' + r);
    sSeed = String(row[idx('First')] || '') + '|' + String(row[idx('Last')] || '') + '|' + sSeed;
    var iDebt2 = idx('DebtLevel'), iNW2 = idx('NetWorth'), iYears2 = idx('YearsInCareer'), iStage2 = idx('CareerStage');
    if (iDebt2 >= 0) row[iDebt2] = deriveDebtLevel_(sSeed, 18, row[iInc]);
    if (iNW2 >= 0) row[iNW2] = deriveNetWorth_(sSeed, 18, row[iInc], '');
    if (iYears2 >= 0) row[iYears2] = 0;
    // 'student' matches the <22 stamp updateCareerProgression_ re-applies every
    // cycle — writing 'entry-level' here would just flip-flop against it.
    if (iStage2 >= 0) row[iStage2] = 'student';

    // engine.62 (S322): employer wire — first job gets an econ key + employer.
    // Without the key, calculateCitizenIncomes_ re-derives this income next
    // cycle (no "managed externally" signal); without the employer, the
    // citizen works nowhere and the business rosters never see the hire.
    if (iEcon >= 0) row[iEcon] = SETTLE_ECON_KEYS[row[iRole]] || row[iRole];
    var settledBiz = '';
    if (iEmployer >= 0) {
      if (bizPool === undefined) bizPool = buildSettleBizPool_(ctx);
      if (bizPool) {
        var ind = SETTLE_INDUSTRY[row[iRole]] || 'service';
        var pool = (bizPool[ind] && bizPool[ind].length) ? bizPool[ind] : bizPool.service;
        if (pool && pool.length) {
          settledBiz = pool[Math.floor(rng() * pool.length)];
          row[iEmployer] = settledBiz;
          // Register the hire so Phase-6 ripples see it (career engine owns
          // the structure; it ran earlier in Phase 5, so it exists by now).
          var cs = ctx.summary && ctx.summary.careerSignals;
          if (cs && cs.businessDeltas) {
            if (!cs.businessDeltas[settledBiz]) cs.businessDeltas[settledBiz] = { gained: 0, lost: 0 };
            cs.businessDeltas[settledBiz].gained += 1;
          }
        }
      }
    }

    row[iLife] = (life ? life + '\n' : '') +
      stamp + ' — [Adulthood] ' + b.line + ' — ' + row[iRole];

    results.settled++;
    results[band]++;
    // DIAG-EMIT (S320 Mike-blessed): log the computed draw at the decision
    // point for the first few settlements so the execution log carries the why.
    if (diag < 5) {
      Logger.log('ENGINE60_T4: ' + (iPop >= 0 ? row[iPop] : 'row' + r) +
        ' hhInc=' + hhInc + ' sq=' + sq + ' parentRank=' + parentRank +
        (hTier ? ' heritage=' + hTier : '') +
        ' total=' + Math.round(total * 100) / 100 + ' -> ' + band +
        ' (' + row[iRole] + ' @ ' + row[iInc] +
        ' key=' + (iEcon >= 0 ? row[iEcon] : 'n/a') +
        ' biz=' + (settledBiz || 'none') + ')');
      diag++;
    }
  }

  if (results.settled > 0) ctx.ledger.dirty = true;
  Logger.log('settleAdulthood_ engine.60 T4: settled ' + results.settled +
    ' (rich ' + results.rich + ' / solid ' + results.solid + ' / rough ' + results.rough + ')');
  return results;
}

function checkSchoolQuality_(ss, ctx, cycle) {
  var sheet = ss.getSheetByName('Neighborhood_Demographics');
  if (!sheet) return { alerts: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { alerts: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iNeighborhood = idx('Neighborhood');
  var iQuality = idx('SchoolQualityIndex');
  var iGradRate = idx('GraduationRate');

  var alerts = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue; // Skip undefined or invalid rows
    var neighborhood = row[iNeighborhood];
    var quality = Number(row[iQuality]) || 5;
    var gradRate = Number(row[iGradRate]) || 75;

    // Alert if school quality is critically low
    if (quality < 3) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'SCHOOL_QUALITY_CRISIS',
        severity: 8,
        description: neighborhood + ' schools rated critically low (quality: ' + quality + '/10)',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        quality: quality,
        gradRate: gradRate
      });
      alerts++;
    }

    // Alert if graduation rate is very low
    if (gradRate < 65) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'DROPOUT_WAVE',
        severity: 6,
        description: neighborhood + ' graduation rate at ' + gradRate + '% (below crisis threshold)',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        gradRate: gradRate
      });
      alerts++;
    }
  }

  return { alerts: alerts };
}
