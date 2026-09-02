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
 * - School quality stamped on minors from the household's neighborhood
 * - EducationLevel is identity plus lived graduation (education loop, S409):
 *   minors carry a school stage derived from age; the 18th-birthday settlement
 *   mints the adult credential; [Graduation] (generationalEventsEngine) writes
 *   the next credential. CareerStage is age (engine.135 E1); employer success
 *   is the promotion path (E2). Education does NOT change advancement speed.
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
 * - Education no longer touches income (and, since E1, not advancement either)
 * - Eliminates three-way income conflict (career/education/role-based)
 *
 * Integration:
 * - Reads UNI/MED/CIV flags from Simulation_Ledger via ctx.ledger
 * - Career engine owns promotions; this file never reads EducationLevel for them
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
// Education loop (S409): ONE vocabulary, the live plural one. Before this the
// engine wrote singular `bachelor` / catch-all `graduate` while the ledger,
// intake (lib/citizenDerivation EDUCATION_LEVELS), savings (EDU_SAVINGS_FACTOR)
// and courtship (bondFitnessOf_) all exact-match the plural tokens — an
// engine-filled graduate was invisible to every downstream that pays for a
// degree. Child stages live in the same column until 18 (settleAdulthood_
// overwrites with the credential — that overwrite IS the K-12 graduation).
var EDUCATION_LEVELS = {
  // school stages (minors — derived from age each cycle, see deriveMinorEducationStage_)
  PRE_K: 'Pre-K',
  ELEMENTARY: 'Elementary',
  MIDDLE: 'Middle School',
  HIGH: 'High School',
  // credentials (adults — identity once set; only settlement + [Graduation] write them)
  HS_DROPOUT: 'hs-dropout',
  HS_DIPLOMA: 'hs-diploma',
  SOME_COLLEGE: 'some-college',
  ASSOCIATES: 'associates',
  TRADE_CERT: 'trade-cert',
  BACHELORS: 'bachelors',
  MASTERS: 'masters',
  DOCTORATE: 'doctorate'
};

// Legacy tokens the engine used to write → canonical. Anything else passes
// through unchanged (never invent a credential from an unknown string).
var EDUCATION_LEGACY_WRITE = {
  'bachelor': 'bachelors',
  'graduate': 'masters',   // a graduate degree, not a doctorate — never mint PhDs from a flag
  'none': 'Pre-K'
};

function canonicalEducationWrite_(v) {
  var t = String(v || '').trim();
  return Object.prototype.hasOwnProperty.call(EDUCATION_LEGACY_WRITE, t) ? EDUCATION_LEGACY_WRITE[t] : t;
}

// School stage from age — the E1 move for minors: a description of where the
// child is, not a dice promotion. null for adults (their cell is a credential).
function schoolStageForAge_(age) {
  if (!(age >= 0)) return null;
  if (age < 5) return EDUCATION_LEVELS.PRE_K;
  if (age <= 10) return EDUCATION_LEVELS.ELEMENTARY;
  if (age <= 13) return EDUCATION_LEVELS.MIDDLE;
  if (age <= 17) return EDUCATION_LEVELS.HIGH;
  return null;
}

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
// Career Engine transitions. Education does not touch income or, since
// engine.135 E1, advancement speed. Old values preserved as comment for reference:
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

  Logger.log('processEducationCareer_ v2.2: Starting...');

  var results = {
    processed: 0,
    educationUpdated: 0,
    careerAdvanced: 0,
    stagnationDetected: 0,
    incomeAdjusted: 0
  };

  // Step 1: Derive education levels from existing flags (fill-only)
  var eduResults = deriveEducationLevels_(ctx, rng);
  results.educationUpdated = eduResults.updated;

  // Step 1b (education loop, S409): minors' school stage follows age — the E1
  // analog. Runs after the fill so a freshly filled minor is stage-correct.
  var stageResults = deriveMinorEducationStage_(ctx, cycle);
  results.minorStagesRestamped = stageResults.restamped;
  results.minors = stageResults.minors;

  // Step 2: Update career stages and track progression
  var careerResults = updateCareerProgression_(ctx, cycle, rng);
  results.careerAdvanced = careerResults.advanced;
  results.stagnationDetected = careerResults.stagnant;

  // Step 3: REMOVED in v14.2 — income no longer derived from education.
  // Income is set by role-based economic profiles (applyEconomicProfiles.js)
  // and adjusted by Career Engine transitions. Education drives neither
  // income nor advancement speed (E1: CareerStage is age).
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
    'processEducationCareer_ v2.2: Complete. ' +
    'Education: ' + results.educationUpdated + ', ' +
    'MinorStages: ' + results.minorStagesRestamped + '/' + results.minors + ', ' +
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
      eduLevel = EDUCATION_LEVELS.DOCTORATE; // Medical: the doctorate is the licence
    } else if (uni === 'yes' || uni === 'y') {
      eduLevel = EDUCATION_LEVELS.BACHELORS; // University background
    } else if (civ === 'yes' || civ === 'y') {
      eduLevel = EDUCATION_LEVELS.SOME_COLLEGE; // Civic work often requires some college
    } else if (lifeHistory.indexOf('Graduation') >= 0) {
      eduLevel = EDUCATION_LEVELS.BACHELORS; // Graduated in history
    } else if (age < 18) {
      eduLevel = schoolStageForAge_(age); // Youth: school stage, healed forward each cycle
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

    row[iEducation] = canonicalEducationWrite_(eduLevel);
    updated++;
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
  }

  return { updated: updated };
}


/**
 * Education loop (S409) — minors' EducationLevel is DERIVED from age each
 * cycle, exactly the move engine.135 E1 made for CareerStage: a description
 * of where the child is (Pre-K / Elementary / Middle School / High School),
 * never a roll. Restamping heals a bad mint forward (a 16-year-old carrying
 * `bachelors` reads High School next cycle). Adults are untouched here —
 * settleAdulthood_ mints the credential at 18 and [Graduation] moves it.
 * Same scope as E1: ENGINE-clock rows only; sports-layer rows skipped.
 */
function deriveMinorEducationStage_(ctx, cycle) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { restamped: 0, minors: 0 };
  var idx = function(n) { return header.indexOf(n); };
  var iEdu = idx('EducationLevel'), iBirth = idx('BirthYear'), iStatus = idx('Status'),
      iClock = idx('ClockMode'), iEcon = idx('EconomicProfileKey');
  if (iEdu < 0 || iBirth < 0) return { restamped: 0, minors: 0 };

  var simYear = 2040 + Math.floor(((ctx && ctx.summary && ctx.summary.cycleId) || cycle || 0) / 52);
  var restamped = 0, minors = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    if (String(row[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    if (!isEngineClockRow_(row, iClock)) continue;
    if (isSportsLayerRow_(row, iClock, iEcon)) continue;
    var by = Number(row[iBirth]) || 0;
    if (by <= 0) continue;
    var stage = schoolStageForAge_(simYear - by);
    if (!stage) continue; // adult — credential, not a stage
    minors++;
    if (String(row[iEdu] || '').trim() !== stage) { row[iEdu] = stage; restamped++; }
  }
  if (restamped > 0) ctx.ledger.dirty = true;
  return { restamped: restamped, minors: minors };
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

// engine: the sports layer owns its citizens' careers and pay, so civilian
// career logic must not touch them. The pre-existing guards in this family key
// on EconomicProfileKey === 'SPORTS_OVERRIDE' (or merely non-empty), but athlete
// rows are not reliably minted carrying that field — so the guard silently did
// not fire and three GAME rows were overwritten on the C104 fire (2026-08-21):
// AJ Dybantsa POP-01024 "SF / The Oaks" $17,000,000 -> "Nurse Aide" $44,600,
// and Dame Sarr POP-01025 / Coen Carr POP-01026 salaries zeroed at $7.5M and $3M.
// ClockMode is the STRUCTURAL marker and is always present, so test it first and
// treat EconomicProfileKey as the secondary signal.
function isSportsLayerRow_(row, iClock, iEcon) {
  if (iClock >= 0 && String(row[iClock] || '').trim().toUpperCase() === 'GAME') return true;
  if (iEcon >= 0 && String(row[iEcon] || '').trim() === 'SPORTS_OVERRIDE') return true;
  return false;
}

/**
 * engine.135 (builder 2026-08-30): "game, civic and media are outside these."
 * The employment cascade's stage derivation (E1), tracked-employer floor
 * (D3) and retired/deceased zeroing (D5) apply to ClockMode=ENGINE rows
 * only. GAME rows are Paulson's, CIVIC and MEDIA rows are authored offices
 * and newsroom staff. A blank ClockMode reads as ENGINE.
 */
function isEngineClockRow_(row, iClock) {
  if (iClock < 0) return true;
  var m = String(row[iClock] || '').trim().toUpperCase();
  return m === '' || m === 'ENGINE';
}

/**
 * engine.135 E1 — CareerStage from age, YearsInCareer breaking ties downward.
 * Pure: (age, yearsInCareer) → canonical CAREER_STAGES string.
 */
function deriveCareerStageFromAge_(age, yearsInCareer, currentStage) {
  var y = Number(yearsInCareer) || 0;
  if (age < 18) return CAREER_STAGES.STUDENT;
  if (age < 22) {
    // 18–21 (builder 2026-08-30: "so no 22 year old has a career?"): a
    // working kid keeps working, a student stays a student — the stored
    // stage decides, no birthday edit either way. Blank/unknown → student.
    var cls = careerStageClass_(currentStage);
    if (String(currentStage || '').trim() === '') return CAREER_STAGES.STUDENT;
    return (cls === 'STUDENT') ? CAREER_STAGES.STUDENT : CAREER_STAGES.ENTRY;
  }
  // No age retires anyone (builder, 2026-08-30: "just cause a citizen is 65
  // doesn't automatically retire them" — 98 citizens are 65+ by the engine
  // clock, 63 of them working; a mayor or an editor does not stop on a
  // birthday). Retirement is an EVENT: Status=Retired, which the caller
  // skips before reaching this derivation. 45+ is senior.
  // YearsInCareer 0/blank is UNKNOWN (never accrued), not "just started" —
  // the tie-break only applies when the years are known.
  if (y <= 0) return age >= 45 ? CAREER_STAGES.SENIOR : (age >= 30 ? CAREER_STAGES.MID : CAREER_STAGES.ENTRY);
  if (age >= 45) return y >= 10 ? CAREER_STAGES.SENIOR : (y >= 3 ? CAREER_STAGES.MID : CAREER_STAGES.ENTRY);
  if (age >= 30) return y >= 3 ? CAREER_STAGES.MID : CAREER_STAGES.ENTRY;
  return CAREER_STAGES.ENTRY;
}

function updateCareerProgression_(ctx, cycle, rng) {
  // Phase 42 §5.6: read/mutate ctx.ledger.rows; Phase 10 commits.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return { advanced: 0, stagnant: 0 };

  var idx = function(n) { return header.indexOf(n); };
  var iCareerStage = idx('CareerStage');
  var iYearsInCareer = idx('YearsInCareer');
  // (EducationLevel deliberately NOT read here — E1: CareerStage is age; S409 removed the dead read.)
  var iBirthYear = idx('BirthYear');
  var iStatus = idx('Status');
  var iLastPromotion = idx('LastPromotionCycle');
  var iLife = idx('LifeHistory');
  var iClockCP = idx('ClockMode');
  var iEconCP = idx('EconomicProfileKey');
  // Row 24 (b): the OWNING engine stamps the promotion narrative
  var iPop24 = idx('POPID');
  var iFirst24 = idx('First');
  var iLast24 = idx('Last');
  var iNb24 = idx('Neighborhood');
  var iOcc24 = idx('Occupation');
  var iLastU24 = idx('LastUpdated');

  if (iCareerStage < 0 || iYearsInCareer < 0) return { advanced: 0, stagnant: 0 };

  var advanced = 0;   // always 0 since engine.135 E1 — kept for the results contract
  var stagnant = 0;
  var restamped = 0;  // engine.135 E1: rows whose derived stage differed from the stored one
  var yearsAccrued = 0;
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
      yearsAccrued++;
    }

    // engine.135 E1 (S398, builder direction points 14: "Nothing free" —
    // no promotion because N cycles passed; CareerStage is age-related).
    // CareerStage is DERIVED, not rolled: student <22 · entry 22–29 · mid
    // 30–44 · senior 45+ (retirement is an event, never an age), YearsInCareer breaking ties
    // DOWNWARD at the band edges (a 46-year-old with 3 career years is mid;
    // a 33-year-old with 1 is entry). The age band is the ceiling — years
    // never lift a citizen above it. The calendar rolls this replaced
    // (ENTRY→MID 15%/cycle after 10 cycles, MID→SENIOR 5–15%/cycle after
    // 20) were the C103→C104 promotion spike (13 → 29/cycle) and would have
    // made the whole mid class senior in ~15 cycles. No rng, no
    // LastPromotionCycle write, no stampPromotion_: a stage is a description
    // of where a citizen is in life, not an event. Promotions with a
    // narrative and an Income consequence are the employer-success path
    // (plan §Phase E, runCareerEngine_ transitions) — stampPromotion_ stays
    // defined for that caller.
    // A sports-layer citizen is never regressed to student on age alone: a
    // 16-year-old under contract is a professional, and demoting him to student
    // is what zeroed Sarr's and Carr's salaries (students/minors earn nothing,
    // S320 convention) and what fed Dybantsa into settleAdulthood_ at 18.
    if (isSportsLayerRow_(row, iClockCP, iEconCP) || !isEngineClockRow_(row, iClockCP)) {
      // GAME / CIVIC / MEDIA: leave CareerStage, Income and RoleType exactly as their layer set them
    } else if (status === 'retired' || careerStageClass_(row[iCareerStage]) === 'RETIRED') {
      // A deliberate Status=Retired (a 37-year-old ex-A's star, Paulson's
      // roster decisions) is not re-derived from age — the stage stays retired.
      // An existing 'retired' stamp is left alone too: un-retiring the 84
      // rows the old age rule stamped would be the same mass edit in reverse.
      // Retirement changes by event (Status), never by this derivation.
    } else {
      var derived = deriveCareerStageFromAge_(age, yearsInCareer, row[iCareerStage]);
      if (String(row[iCareerStage] || '') !== derived) {
        row[iCareerStage] = derived;
        restamped++;
      }
      // Stagnation counter (summary-only, feeds results.stagnationDetected):
      // unchanged meaning — cycles since the last real promotion.
      var cyclesSincePromotion = cycle - lastPromotion;
      if (cyclesSincePromotion >= ADVANCEMENT_CYCLES.STAGNATION && careerStageClass_(derived) !== 'SENIOR' &&
          careerStageClass_(derived) !== 'STUDENT' && careerStageClass_(derived) !== 'RETIRED') {
        stagnant++;
      }
    }
  }

  if (advanced > 0 || restamped > 0 || yearsAccrued > 0) {
    ctx.ledger.dirty = true;
  }

  return { advanced: advanced, stagnant: stagnant, restamped: restamped };
}


// ════════════════════════════════════════════════════════════════════════════
// EDUCATION → INCOME MATCHING (REMOVED in v14.2)
// ════════════════════════════════════════════════════════════════════════════
// matchEducationToIncome_() removed. Income is now set by role-based economic
// profiles (applyEconomicProfiles.js) and adjusted by Career Engine transitions.
// Education touches neither income nor (since engine.135 E1) advancement
// speed; it is identity plus lived graduation. This eliminates the three-way
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

      // Generate stagnation story hook — engine.135 E2 (S399): LastPromotionCycle
      // now moves only on a real employer promotion, so most rows read as
      // "stagnant"; the hook fires only for a tracked employee (an employer that
      // could have promoted them) and rarely (0.5%/cycle, was 5%).
      var iEmpStag = ctx.ledger.headers.indexOf('EmployerBizId');
      var trackedStag = iEmpStag >= 0 && /^BIZ-/.test(String(row[iEmpStag] || '').trim());
      if (trackedStag && rng() < 0.005) {
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
// v2.2 (S336, employment-living-system Task 5): also returns statedById —
// Employee_Count per business (null when blank/non-numeric) — so the
// settlement draw can be capacity-aware. A hire that pushes tracked past
// stated is the one illegal state; the kid takes an open slot or goes elsewhere.
function buildSettleBizPool_(ctx) {
  try {
    var bizSheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (!bizSheet) return null;
    var bizData = bizSheet.getDataRange().getValues();
    if (bizData.length < 2) return null;
    var bh = bizData[0], bId = -1, bSector = -1, bCount = -1;
    for (var c = 0; c < bh.length; c++) {
      var h = String(bh[c]).trim();
      if (h === 'BIZ_ID') bId = c;
      if (h === 'Sector') bSector = c;
      if (h === 'Employee_Count') bCount = c;
    }
    if (bId < 0 || bSector < 0) return null;
    var pools = { tech: [], service: [], public: [], creative: [] };
    var statedById = {};
    // engine.144 loops 1+2: field counts per hood from the SAME read (no second
    // Business_Ledger fetch — quota). sectorCategory_ is runCareerEngine's;
    // absent (unit harness) the hood source is simply empty.
    var byHood = {}, cityWide = {}, catById = {};
    var bHood = -1;
    for (var c2 = 0; c2 < bh.length; c2++) if (String(bh[c2]).trim() === 'Neighborhood') bHood = c2;
    var catFn = (typeof sectorCategory_ === 'function') ? sectorCategory_ : null;
    for (var r = 1; r < bizData.length; r++) {
      var id = String(bizData[r][bId] || '').trim();
      if (!id) continue;
      pools[classifySettleSector_(bizData[r][bSector])].push(id);
      var rawCount = bCount >= 0 ? bizData[r][bCount] : '';
      statedById[id] = (rawCount === '' || rawCount === null || rawCount === undefined || isNaN(Number(rawCount)))
        ? null : Number(rawCount);
      if (catFn && bHood >= 0) {
        var fcat = catFn(bizData[r][bSector], true);
        if (fcat) {
          catById[id] = fcat;
          var hoodName = String(bizData[r][bHood] || '').trim();
          if (hoodName === 'City-wide') cityWide[fcat] = (cityWide[fcat] || 0) + 1;
          else if (hoodName) { if (!byHood[hoodName]) byHood[hoodName] = {}; byHood[hoodName][fcat] = (byHood[hoodName][fcat] || 0) + 1; }
        }
      }
    }
    return { pools: pools, statedById: statedById, byHood: byHood, cityWide: cityWide, catById: catById };
  } catch (e) {
    Logger.log('buildSettleBizPool_: Business_Ledger read failed (' + e.message + ') — settlement employer skipped');
    return null;
  }
}

// v2.2 (S336 Task 7): settlement role → SkillTags category. MUST stay in
// vocab-sync with the S336 SkillTags backfill and runCareerEngine's
// sectorCategory_ — canonical 15-category strings only. Known settlement
// roles mapped by their SETTLE_ECON_KEYS profile's category; keyword fallback
// for band roles with no econ key. A settling 18-year-old is matchable by the
// rehire matcher from day one.
var SETTLE_TAG_BY_ROLE = {
  'Biotech Lab Assistant': 'Healthcare', 'Research Assistant': 'Healthcare',
  'Nurse Aide': 'Healthcare',
  'Junior Accountant': 'Professional', 'Paralegal': 'Government & Civic',
  'Civic Program Assistant': 'Government & Civic',
  'Smart Grid Trainee': 'Transit & Infrastructure',
  'Apprentice Electrician': 'Trades', 'Carpenter Apprentice': 'Trades',
  'Solar Installer': 'Trades',
  'Office Assistant': 'Professional', 'Bank Teller': 'Professional'
};
function settleSkillTag_(role) {
  if (SETTLE_TAG_BY_ROLE[role]) return SETTLE_TAG_BY_ROLE[role];
  var s = String(role || '').toLowerCase();
  if (/retail|clerk|shop|store/.test(s)) return 'Small Business';
  if (/food|cook|server|barista|dish|restaurant|fast/.test(s)) return 'Food & Culture';
  if (/warehouse|labor|mover|dock/.test(s)) return 'Port & Labor';
  if (/clean|janitor|custodial/.test(s)) return 'Trades';
  if (/aide|care/.test(s)) return 'Healthcare';
  return 'Small Business';
}

// ════════════════════════════════════════════════════════════════════════════
// engine.144 loops 1+2 (S411) — FIELD-FIRST SETTLEMENT
// The field of study/work is chosen BEFORE the role, from causes the citizen
// actually has: a parent's field (SkillTags), the neighborhood's businesses
// (Business_Ledger by hood), and the school years already on the LifeHistory
// (runYouthEngine_ dial tags). SkillTags = the field, directly — the same
// token runCareerEngine's E3 same-field matcher reads, so the credential can
// aim from the first adult cycle. No new column. The band still sets money
// and the role's seniority; the field sets WHERE. No source → the legacy
// band draw, unchanged. One rng draw per settlement, fixed field order.
// ════════════════════════════════════════════════════════════════════════════

// The twelve fields = sectorCategory_'s outputs (runCareerEngine.js), fixed
// order so the weighted draw is deterministic. 'Trades' / 'The Vulnerable' /
// '2041-Specific' are live tags but not fields E3 can match — never drawn.
var SETTLE_FIELDS = [
  'Port & Labor', 'Construction & Baylight', 'Healthcare', 'Tech & Innovation',
  'Transit & Infrastructure', 'Education', 'Government & Civic', 'Faith & Community',
  'Creative & Arts', 'Professional', 'Small Business', 'Food & Culture'
];

// One entry role per field × band. Existing settlement roles kept where they
// fit; new ones name a first job an 18-year-old can hold in that field.
var SETTLE_ROLES_BY_FIELD = {
  'Port & Labor':             { rich: 'Logistics Coordinator Trainee', solid: 'Dockworker',                rough: 'Warehouse Hand' },
  'Construction & Baylight':  { rich: 'Construction Engineering Trainee', solid: 'Apprentice Electrician', rough: 'Construction Laborer' },
  'Healthcare':               { rich: 'Biotech Lab Assistant',        solid: 'Nurse Aide',                rough: 'Hospital Orderly' },
  'Tech & Innovation':        { rich: 'Junior Software Developer',    solid: 'IT Support Technician',     rough: 'Data Entry Clerk' },
  'Transit & Infrastructure': { rich: 'Smart Grid Trainee',           solid: 'Transit Operator Trainee',  rough: 'Station Attendant' },
  'Education':                { rich: 'Teaching Assistant',           solid: 'After-School Program Aide', rough: 'Youth Program Aide' },
  'Government & Civic':       { rich: 'Civic Program Assistant',      solid: 'Records Clerk',             rough: 'Parks Maintenance Aide' },
  'Faith & Community':        { rich: 'Community Programs Coordinator', solid: 'Outreach Assistant',      rough: 'Food Bank Helper' },
  'Creative & Arts':          { rich: 'Junior Graphic Designer',      solid: 'Studio Assistant',          rough: 'Gallery Attendant' },
  'Professional':             { rich: 'Junior Accountant',            solid: 'Bank Teller',               rough: 'Mailroom Clerk' },
  'Small Business':           { rich: 'Assistant Store Manager',      solid: 'Sales Associate',           rough: 'Retail Clerk' },
  'Food & Culture':           { rich: 'Pastry Apprentice',            solid: 'Line Cook',                 rough: 'Server' }
};

// Econ keys for the new field roles (canonical economic_parameters.json roles;
// the SETTLE_ECON_KEYS trainee→profile pattern). Others fall back to the role.
var SETTLE_FIELD_ECON_KEYS = {
  'Logistics Coordinator Trainee':    'Port Logistics Coordinator',
  'Construction Engineering Trainee': 'Construction Engineer',
  'Junior Software Developer':        'Software Engineer (General)',
  'Transit Operator Trainee':         'Bus Operator',
  'Records Clerk':                    'Municipal Court Clerk',
  'Community Programs Coordinator':   'Community Organizer',
  'Junior Graphic Designer':          'Graphic Designer (Freelance)',
  'Pastry Apprentice':                'Pastry Chef',
  'Hospital Orderly':                 'Home Health Aide'
};

// Youth dial tags (runYouthEngine_ YOUTH_DIAL_TAG) → the field they point to.
var SETTLE_YOUTH_FIELD = {
  'Education': 'Education', 'Team': 'Education',
  'Cultural': 'Creative & Arts', 'Civic': 'Government & Civic', 'Community': 'Faith & Community'
};
var SETTLE_SOURCE_WEIGHT = 3; // each parent, the school years (capped), the hood (normalized) — equal pull

function isSettleField_(tag) { return SETTLE_FIELDS.indexOf(String(tag || '').trim()) >= 0; }

// Youth-history counts off a LifeHistory string: {dialTag: n} for the five
// youth dial tags only. [Sports]/[Daily]/… are adult-deck lines, not school years.
function settleYouthCounts_(lifeHistory) {
  var counts = {};
  var re = /\[(Education|Team|Cultural|Civic|Community)\]/g, m;
  var s = String(lifeHistory || '');
  while ((m = re.exec(s)) !== null) counts[m[1]] = (counts[m[1]] || 0) + 1;
  return counts;
}

/**
 * The field draw. PURE: no sheet, no ledger, exactly one rng() call.
 *   ownTag      — the citizen's existing SkillTags (a canonical field wins outright)
 *   parents     — [{name, tags}] resolved parent rows (tags = raw SkillTags string)
 *   hoodCats    — {field: count} businesses in the citizen's hood
 *   cityCats    — {field: count} 'City-wide' businesses (count half, for every hood)
 *   youthCounts — settleYouthCounts_ output
 * Returns {field, cause: 'own'|'parent'|'school'|'hood'|null, parentName}.
 * cause names the source that put weight on the drawn field (parent > school
 * > hood), so the [Adulthood] line can say why — only when a cause decided.
 */
function settleField_(ownTag, parents, hoodCats, cityCats, youthCounts, rng) {
  var roll = rng(); // one draw, always, so the settlement's rng stream is stable
  var own = String(ownTag || '').trim();
  if (isSettleField_(own)) return { field: own, cause: 'own', parentName: '' };

  var w = {}, byParent = {}, bySchool = {}, byHood = {}, i, f;
  for (i = 0; i < SETTLE_FIELDS.length; i++) w[SETTLE_FIELDS[i]] = 0;

  // parents — each canonical tag on each parent
  for (i = 0; i < (parents || []).length; i++) {
    var tags = String(parents[i].tags || '').split('|');
    for (var t = 0; t < tags.length; t++) {
      f = tags[t].trim();
      if (!isSettleField_(f)) continue;
      w[f] += SETTLE_SOURCE_WEIGHT;
      if (!byParent[f]) byParent[f] = parents[i].name || '';
    }
  }
  // school years — one per youth line, capped at one source's weight
  var yc = youthCounts || {}, ySpent = 0;
  for (var tag in SETTLE_YOUTH_FIELD) {
    if (!Object.prototype.hasOwnProperty.call(yc, tag)) continue;
    var n = Math.min(Number(yc[tag]) || 0, SETTLE_SOURCE_WEIGHT - ySpent);
    if (n <= 0) continue;
    f = SETTLE_YOUTH_FIELD[tag];
    w[f] += n; ySpent += n; bySchool[f] = true;
  }
  // the hood — local businesses + half-weight city-wide ones, normalized to one source's weight
  var hoodRaw = {}, hoodTotal = 0;
  for (i = 0; i < SETTLE_FIELDS.length; i++) {
    f = SETTLE_FIELDS[i];
    var c = (Number((hoodCats || {})[f]) || 0) + 0.5 * (Number((cityCats || {})[f]) || 0);
    if (c > 0) { hoodRaw[f] = c; hoodTotal += c; }
  }
  if (hoodTotal > 0) {
    for (f in hoodRaw) { w[f] += SETTLE_SOURCE_WEIGHT * hoodRaw[f] / hoodTotal; byHood[f] = true; }
  }

  var total = 0;
  for (i = 0; i < SETTLE_FIELDS.length; i++) total += w[SETTLE_FIELDS[i]];
  if (total <= 0) return { field: null, cause: null, parentName: '' };

  var pick = roll * total, acc = 0, chosen = SETTLE_FIELDS[SETTLE_FIELDS.length - 1];
  for (i = 0; i < SETTLE_FIELDS.length; i++) {
    f = SETTLE_FIELDS[i];
    if (w[f] <= 0) continue;
    acc += w[f];
    if (pick < acc) { chosen = f; break; }
  }
  var cause = byParent[chosen] !== undefined ? 'parent' : (bySchool[chosen] ? 'school' : (byHood[chosen] ? 'hood' : null));
  return { field: chosen, cause: cause, parentName: byParent[chosen] || '' };
}

// The clause on the [Adulthood] line — names the cause, never a score.
function settleFieldClause_(pick) {
  if (!pick || !pick.field || !pick.cause || pick.cause === 'own') return '';
  if (pick.cause === 'parent') return ' (following ' + (pick.parentName || 'family') + ' into ' + pick.field + ')';
  if (pick.cause === 'school') return ' (the field their school years pointed to: ' + pick.field + ')';
  return ' (the neighborhood\'s trade: ' + pick.field + ')';
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

/**
 * engine.144 (S410): one ordinal over the LIVE plural vocabulary, for the two
 * employer-driven career events to read as a secondary key. Distinct from
 * eduRank_ (0-2, feeds the 18th-birthday settlement — untouched). Never a
 * gate: rank 0 is still eligible for everything.
 */
function credentialRank_(v) {
  v = String(v || '').toLowerCase().trim();
  if (!v) return 0;
  if (v.indexOf('doctorate') >= 0) return 6;
  if (v.indexOf('masters') >= 0 || v === 'graduate') return 5;
  if (v.indexOf('bachelor') >= 0) return 4;
  if (v.indexOf('associate') >= 0) return 3;
  if (v.indexOf('trade-cert') >= 0 || v.indexOf('some-college') >= 0) return 2;
  if (v.indexOf('hs-diploma') >= 0) return 1;
  return 0; // hs-dropout, none, child-stage tokens
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
  var trackedByBiz = {}, trackedBuilt = false; // v2.2 (S336): Active tracked count per business, built once with bizPool; reserves hires within the cycle
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
    // The EconomicProfileKey test alone was insufficient: athlete rows are not
    // reliably minted with that field, so AJ Dybantsa (POP-01024) fell through
    // and this function wrote "Nurse Aide" / $44,600 over "SF / The Oaks" /
    // $17,000,000. ClockMode is checked first because it is always present.
    if (isSportsLayerRow_(row, idx('ClockMode'), iEcon)) continue;
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

    // engine.144 loops 1+2 (S411): the FIELD first — parents' fields, the hood's
    // businesses, the school years on the LifeHistory — then the role for that
    // field at this band. No source → the legacy band draw, unchanged.
    if (bizPool === undefined) bizPool = buildSettleBizPool_(ctx);
    var iTagsF = idx('SkillTags'), iFirstF = idx('First'), iNbhdF = idx('Neighborhood');
    var parentsF = [];
    if (iParents >= 0 && row[iParents] && iTagsF >= 0) {
      var pidsF = [];
      try { pidsF = JSON.parse(String(row[iParents])); } catch (e2) { pidsF = []; }
      for (var pk = 0; pk < pidsF.length; pk++) {
        var pRowF = rowByPop[String(pidsF[pk]).trim()];
        if (pRowF) parentsF.push({ name: iFirstF >= 0 ? String(pRowF[iFirstF] || '').trim() : '', tags: pRowF[iTagsF] });
      }
    }
    var hoodF = iNbhdF >= 0 ? String(row[iNbhdF] || '').trim() : '';
    var fieldPick = settleField_(
      iTagsF >= 0 ? row[iTagsF] : '', parentsF,
      (bizPool && bizPool.byHood && bizPool.byHood[hoodF]) || {},
      (bizPool && bizPool.cityWide) || {},
      settleYouthCounts_(life), rng);
    if (fieldPick.field && SETTLE_ROLES_BY_FIELD[fieldPick.field]) {
      row[iRole] = SETTLE_ROLES_BY_FIELD[fieldPick.field][band];
    } else {
      row[iRole] = b.roles[Math.floor(rng() * b.roles.length)];
    }
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
    // v2.2 (S336 Task 5): the draw is CAPACITY-AWARE — only businesses with
    // room (stated Employee_Count above the Active tracked count, minus hires
    // already made this cycle) are candidates. Blank-count rows can't prove
    // room, so they never take hires. No opening anywhere → the citizen is
    // explicitly recorded as seeking work; silence is not an outcome.
    if (iEcon >= 0) row[iEcon] = SETTLE_ECON_KEYS[row[iRole]] || SETTLE_FIELD_ECON_KEYS[row[iRole]] || row[iRole];
    var settledBiz = '';
    if (iEmployer >= 0) {
      if (bizPool === undefined) bizPool = buildSettleBizPool_(ctx); // (field pick above normally built it)
      if (!trackedBuilt) {
        trackedBuilt = true;
        if (bizPool) {
          // Active tracked headcount per business — one pass, then kept
          // current via the cycle-local reservation below.
          trackedByBiz = {};
          for (var tb = 0; tb < rows.length; tb++) {
            var tRow = rows[tb];
            if (!tRow || String(tRow[iStatus] || 'active').toLowerCase() !== 'active') continue;
            var tEmp = String(iEmployer >= 0 ? (tRow[iEmployer] || '') : '').trim();
            if (tEmp.indexOf('BIZ-') === 0) trackedByBiz[tEmp] = (trackedByBiz[tEmp] || 0) + 1;
          }
        }
      }
      if (bizPool) {
        var hasRoom = function (bid) {
          var stated = bizPool.statedById[bid];
          return stated !== null && stated !== undefined && stated > (trackedByBiz[bid] || 0);
        };
        // engine.144 loops 1+2: a field role hires INTO the field — businesses of
        // that exact category first (any hood), then the field's industry bucket,
        // then the legacy per-role bucket / service fallback.
        var pool = [];
        if (fieldPick.field && bizPool.catById) {
          for (var fb in bizPool.catById) if (bizPool.catById[fb] === fieldPick.field && hasRoom(fb)) pool.push(fb);
        }
        var ind = fieldPick.field ? classifySettleSector_(fieldPick.field) : (SETTLE_INDUSTRY[row[iRole]] || 'service');
        if (!pool.length) pool = (bizPool.pools[ind] || []).filter(hasRoom);
        if (!pool.length) pool = (bizPool.pools.service || []).filter(hasRoom);
        if (pool.length) {
          settledBiz = pool[Math.floor(rng() * pool.length)];
          row[iEmployer] = settledBiz;
          trackedByBiz[settledBiz] = (trackedByBiz[settledBiz] || 0) + 1; // reserve the slot this cycle
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

    // v2.2 (S336 Task 7): stamp the field tag so the rehire matcher can route
    // this citizen from their first adult cycle. Never overwrites.
    // engine.144 loops 1+2: the tag IS the field when one was drawn.
    var iTags2 = idx('SkillTags');
    if (iTags2 >= 0 && !String(row[iTags2] || '').trim()) {
      row[iTags2] = fieldPick.field || settleSkillTag_(row[iRole]);
    }

    row[iLife] = (life ? life + '\n' : '') +
      stamp + ' — [Adulthood] ' + b.line + ' — ' + row[iRole] + settleFieldClause_(fieldPick) +
      (settledBiz ? '' : ' — seeking work (no tracked opening)');

    results.settled++;
    results[band]++;
    // DIAG-EMIT (S320 Mike-blessed): log the computed draw at the decision
    // point for the first few settlements so the execution log carries the why.
    if (diag < 5) {
      Logger.log('ENGINE60_T4: ' + (iPop >= 0 ? row[iPop] : 'row' + r) +
        ' hhInc=' + hhInc + ' sq=' + sq + ' parentRank=' + parentRank +
        (hTier ? ' heritage=' + hTier : '') +
        ' total=' + Math.round(total * 100) / 100 + ' -> ' + band +
        ' field=' + (fieldPick.field || 'none') + '/' + (fieldPick.cause || 'none') +
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
