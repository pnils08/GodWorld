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
      var r = rng();
      if (r < 0.05) eduLevel = EDUCATION_LEVELS.HS_DROPOUT;
      else if (r < 0.15) eduLevel = EDUCATION_LEVELS.SOME_COLLEGE;
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

    // Update years in career
    yearsInCareer += 0.5; // ~6 months per cycle
    row[iYearsInCareer] = Math.round(yearsInCareer * 10) / 10;

    // Check for career stage advancement
    if (age < 22) {
      row[iCareerStage] = CAREER_STAGES.STUDENT;
    } else if (age >= 65) {
      row[iCareerStage] = CAREER_STAGES.RETIRED;
    } else {
      // Check if eligible for advancement
      var cyclesSincePromotion = cycle - lastPromotion;

      if (careerStage === CAREER_STAGES.ENTRY && cyclesSincePromotion >= ADVANCEMENT_CYCLES.ENTRY_TO_MID) {
        // Entry → Mid
        if (yearsInCareer >= 5 && rng() < 0.15) {
          row[iCareerStage] = CAREER_STAGES.MID;
          row[iLastPromotion] = cycle;
          advanced++;
        }
      } else if (careerStage === CAREER_STAGES.MID && cyclesSincePromotion >= ADVANCEMENT_CYCLES.MID_TO_SENIOR) {
        // Mid → Senior (requires education)
        var advanceChance = 0.05;
        if (education === 'bachelor') advanceChance = 0.10;
        if (education === 'graduate') advanceChance = 0.15;

        if (yearsInCareer >= 10 && rng() < advanceChance) {
          row[iCareerStage] = CAREER_STAGES.SENIOR;
          row[iLastPromotion] = cycle;
          advanced++;
        }
      }

      // Detect stagnation
      if (cyclesSincePromotion >= ADVANCEMENT_CYCLES.STAGNATION && careerStage !== CAREER_STAGES.SENIOR) {
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
