/**
 * ============================================================================
 * EDUCATION & CAREER ENGINE v1.0
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
 * - Education → income correlation
 * - Career mobility detection
 *
 * Integration:
 * - Reads UNI/MED/CIV flags from Simulation_Ledger
 * - Updates Income based on education level
 * - Hooks into career engine for promotions
 * - Uses school quality from Neighborhood_Demographics (consolidated)
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

// Education → Income mapping (annual)
var INCOME_BY_EDUCATION = {
  'none': 28000,
  'hs-dropout': 30000,
  'hs-diploma': 42000,
  'some-college': 55000,
  'bachelor': 75000,
  'graduate': 120000
};

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
  var ss = ctx.ss;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processEducationCareer_ v1.0: Starting...');

  var results = {
    processed: 0,
    educationUpdated: 0,
    careerAdvanced: 0,
    stagnationDetected: 0,
    incomeAdjusted: 0
  };

  // Step 1: Derive education levels from existing flags
  var eduResults = deriveEducationLevels_(ss, ctx);
  results.educationUpdated = eduResults.updated;

  // Step 2: Update career stages and track progression
  var careerResults = updateCareerProgression_(ss, cycle);
  results.careerAdvanced = careerResults.advanced;
  results.stagnationDetected = careerResults.stagnant;

  // Step 3: Adjust income based on education level
  var incomeResults = matchEducationToIncome_(ss);
  results.incomeAdjusted = incomeResults.updated;

  // Step 4: Detect career mobility (advancing/stagnant/declining)
  var mobilityResults = detectCareerMobility_(ss, ctx, cycle);
  results.mobilityEvents = mobilityResults.events;

  // Step 5: Check school quality and generate alerts
  var schoolResults = checkSchoolQuality_(ss, ctx, cycle);
  results.schoolAlerts = schoolResults.alerts;

  Logger.log(
    'processEducationCareer_ v1.0: Complete. ' +
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

function deriveEducationLevels_(ss, ctx) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { updated: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { updated: 0 };

  var header = values[0];
  var rows = values.slice(1);

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
      eduLevel = Math.random() < 0.8 ? EDUCATION_LEVELS.HS_DIPLOMA : EDUCATION_LEVELS.HS_DROPOUT;
    } else {
      // Adults: 85% HS diploma, 10% some college, 5% dropout
      var r = Math.random();
      if (r < 0.05) eduLevel = EDUCATION_LEVELS.HS_DROPOUT;
      else if (r < 0.15) eduLevel = EDUCATION_LEVELS.SOME_COLLEGE;
      else eduLevel = EDUCATION_LEVELS.HS_DIPLOMA;
    }

    row[iEducation] = eduLevel;
    updated++;
  }

  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { updated: updated };
}


// ════════════════════════════════════════════════════════════════════════════
// CAREER PROGRESSION
// ════════════════════════════════════════════════════════════════════════════

function updateCareerProgression_(ss, cycle) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { advanced: 0, stagnant: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { advanced: 0, stagnant: 0 };

  var header = values[0];
  var rows = values.slice(1);

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
        if (yearsInCareer >= 5 && Math.random() < 0.15) {
          row[iCareerStage] = CAREER_STAGES.MID;
          row[iLastPromotion] = cycle;
          advanced++;
        }
      } else if (careerStage === CAREER_STAGES.MID && cyclesSincePromotion >= ADVANCEMENT_CYCLES.MID_TO_SENIOR) {
        // Mid → Senior (requires education)
        var advanceChance = 0.05;
        if (education === 'bachelor') advanceChance = 0.10;
        if (education === 'graduate') advanceChance = 0.15;

        if (yearsInCareer >= 10 && Math.random() < advanceChance) {
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
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { advanced: advanced, stagnant: stagnant };
}


// ════════════════════════════════════════════════════════════════════════════
// EDUCATION → INCOME MATCHING
// ════════════════════════════════════════════════════════════════════════════

function matchEducationToIncome_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { updated: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { updated: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iEducation = idx('EducationLevel');
  var iIncome = idx('Income');
  var iCareerStage = idx('CareerStage');
  var iStatus = idx('Status');

  if (iEducation < 0 || iIncome < 0) return { updated: 0 };

  var updated = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status === 'deceased') continue;

    var education = row[iEducation] || 'hs-diploma';
    var careerStage = iCareerStage >= 0 ? (row[iCareerStage] || 'mid-career') : 'mid-career';
    var currentIncome = Number(row[iIncome]) || 0;

    // Calculate expected income based on education + career stage
    var baseIncome = INCOME_BY_EDUCATION[education] || 42000;

    // Career stage modifiers
    var stageMod = 1.0;
    if (careerStage === 'student') stageMod = 0.3;
    else if (careerStage === 'entry-level') stageMod = 0.8;
    else if (careerStage === 'mid-career') stageMod = 1.0;
    else if (careerStage === 'senior') stageMod = 1.4;
    else if (careerStage === 'retired') stageMod = 0.6;

    var expectedIncome = Math.round(baseIncome * stageMod);

    // Only update if current income is way off (>30% difference)
    var difference = Math.abs(currentIncome - expectedIncome) / expectedIncome;
    if (difference > 0.3 || currentIncome === 0) {
      // Gradually adjust toward expected (don't jump immediately)
      var newIncome = Math.round(currentIncome * 0.7 + expectedIncome * 0.3);
      row[iIncome] = newIncome;
      updated++;
    }
  }

  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { updated: updated };
}


// ════════════════════════════════════════════════════════════════════════════
// CAREER MOBILITY DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectCareerMobility_(ss, ctx, cycle) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return { events: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { events: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iMobility = idx('CareerMobility');
  var iLastPromotion = idx('LastPromotionCycle');
  var iCareerStage = idx('CareerStage');
  var iStatus = idx('Status');
  var iName = idx('First');
  var iLast = idx('Last');

  if (iMobility < 0) return { events: 0 };

  var events = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
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
      if (Math.random() < 0.05) {
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
  }

  if (events > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

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
