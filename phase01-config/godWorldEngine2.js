/**
 * ============================================================================
 * GOD WORLD ENGINE v2.11
 * ============================================================================
 *
 * v2.11 Changes:
 * - Identity normalization in existsInLedger_() prevents duplicates
 * - Uses normalizeIdentity_() from utilities/utilityFunctions.js
 * - Handles case differences, extra whitespace consistently
 *
 * v2.10 Changes:
 * - Added Sheets API caching layer (ctx.cache)
 * - Reduces API calls from ~1,347 to ~100 per cycle
 * - See utilities/sheetCache.js for cache API
 *
 * v2.9 Changes:
 * - Added error handling wrapper to runWorldCycle()
 * - Errors are logged to Logger and Engine_Errors sheet (if available)
 * - Cycle continues to attempt recovery after non-fatal errors
 *
 * v2.8 Changes:
 * - BUGFIX: Added column bounds checking in updateWorldPopulation_
 * - Prevents crash if World_Population columns are missing
 *
 * v2.7 Changes:
 * - FIXED: ensureWorldEventsV3Ledger_ bug (was missing parentheses)
 * - UPDATED: updateWorldPopulation_ v2.1 with full calendar integration
 * - All 30+ holidays now affect population dynamics
 * - First Friday, Creation Day, sports season awareness
 * 
 * Tabs used:
 * - World_Config
 * - World_Population
 * - Simulation_Ledger
 * - Intake
 * - Riley_Digest
 * - LifeHistory_Log
 * 
 * ============================================================================
 */

/**
 * Logs engine errors to Logger and optionally to Engine_Errors sheet.
 * No schema impact - creates sheet only if it doesn't exist.
 */
function logEngineError_(ctx, phase, error) {
  var msg = 'GodWorld Engine Error [' + phase + ']: ' + error.message;
  Logger.log(msg);
  Logger.log('Stack: ' + (error.stack || 'N/A'));

  // Track in context for summary
  if (ctx && ctx.summary && ctx.summary.auditIssues) {
    ctx.summary.auditIssues.push({
      phase: phase,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Optionally write to Engine_Errors sheet (creates if missing)
  try {
    if (ctx && ctx.ss) {
      var errSheet = ctx.ss.getSheetByName('Engine_Errors');
      if (!errSheet) {
        errSheet = ctx.ss.insertSheet('Engine_Errors');
        errSheet.appendRow(['Timestamp', 'Cycle', 'Phase', 'Error', 'Stack']);
      }
      var cycleId = (ctx.summary && ctx.summary.cycleId) ? ctx.summary.cycleId : 'Unknown';
      errSheet.appendRow([
        new Date().toISOString(),
        cycleId,
        phase,
        error.message,
        (error.stack || 'N/A').substring(0, 500)
      ]);
    }
  } catch (logErr) {
    Logger.log('Could not write to Engine_Errors sheet: ' + logErr.message);
  }
}

/**
 * Safely executes a phase function with error handling.
 * Returns true if successful, false if error occurred.
 */
function safePhaseCall_(ctx, phaseName, fn) {
  try {
    fn();
    return true;
  } catch (e) {
    logEngineError_(ctx, phaseName, e);
    return false;
  }
}

function runWorldCycle() {
  const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

  var ss, ctx;

  try {
    ss = SpreadsheetApp.openById(SIM_SSID);
  } catch (e) {
    Logger.log('FATAL: Cannot open spreadsheet: ' + e.message);
    throw e; // Cannot continue without spreadsheet
  }

  const now = new Date();

  // Initialize sheet cache for reduced API calls (v2.10)
  var cache = createSheetCache_(ss);

  ctx = {
    ss: ss,
    cache: cache,  // v2.10: Sheets API caching layer
    now: now,
    config: {},
    summary: {
      cycleId: null,
      intakeProcessed: 0,
      citizensUpdated: 0,
      eventsGenerated: 0,
      auditIssues: []
    }
  };

  try {
  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CORE TIME + CONFIG
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase1-LoadConfig', function() { loadConfig_(ctx); });
  safePhaseCall_(ctx, 'Phase1-AdvanceTime', function() { advanceWorldTime_(ctx); });
  safePhaseCall_(ctx, 'Phase1-Calendar', function() { advanceSimulationCalendar_(ctx); });
  safePhaseCall_(ctx, 'Phase1-ResetAudit', function() { resetCycleAuditIssues_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: WORLD STATE (MUST run BEFORE population/events)
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase2-SeasonalWeights', function() { applySeasonalWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsSeason', function() { applySportsSeason_(ctx); });
  safePhaseCall_(ctx, 'Phase2-Weather', function() { applyWeatherModel_(ctx); });
  safePhaseCall_(ctx, 'Phase2-CityDynamics', function() { applyCityDynamics_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: POPULATION + CRISIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase3-Population', function() { updateWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase3-Demographics', function() { applyDemographicDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrisisSpikes', function() { generateCrisisSpikes_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrisisBuckets', function() { generateCrisisBuckets_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: WORLD EVENTS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase4-WorldEvents', function() { worldEventsEngine_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: CITIZENS + RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase5-GenericCitizens', function() { generateGenericCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenericMicroEvents', function() { generateGenericCitizenMicroEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GameModeMicroEvents', function() { generateGameModeMicroEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase5-EnsureEventsLedger', function() { ensureWorldEventsLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EnsureMediaLedger', function() { ensureMediaLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EnsureEventsV3', function() { ensureWorldEventsV3Ledger_(ctx); });

  safePhaseCall_(ctx, 'Phase5-LoadBonds', function() { loadRelationshipBonds_(ctx); });
  safePhaseCall_(ctx, 'Phase5-SeedBonds', function() { seedRelationshipBonds_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Relationships', function() { runRelationshipEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Neighborhoods', function() { runNeighborhoodEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Universe', function() { runAsUniversePipeline_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CivicRoles', function() { runCivicRoleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Elections', function() { runCivicElections_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Career', function() { runCareerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Education', function() { runEducationEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Household', function() { runHouseholdEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Generational', function() { runGenerationalEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-EventArc', function() { eventArcEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-NamedCitizens', function() { updateNamedCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Promotions', function() { checkForPromotions_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase6-FilterNoise', function() { filterNoiseEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Prioritize', function() { prioritizeEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase6-Spotlights', function() { applyNamedCitizenSpotlights_(ctx); });
  safePhaseCall_(ctx, 'Phase6-CivicLoad', function() { applyCivicLoadIndicator_(ctx); });
  safePhaseCall_(ctx, 'Phase6-EconomicRipple', function() { runEconomicRippleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Migration', function() { applyMigrationDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase6-PatternDetect', function() { applyPatternDetection_(ctx); });
  safePhaseCall_(ctx, 'Phase6-ShockMonitor', function() { applyShockMonitor_(ctx); });

  safePhaseCall_(ctx, 'Phase6-ArcLifecycle', function() { processArcLifecycle_(ctx); });
  safePhaseCall_(ctx, 'Phase6-StorylineStatus', function() { updateStorylineStatus_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 7: EVENING + MEDIA SYSTEMS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase7-EveningMedia', function() { buildEveningMedia_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Famous', function() { buildEveningFamous_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Food', function() { buildEveningFood_(ctx); });
  safePhaseCall_(ctx, 'Phase7-CityEvents', function() { buildCityEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Nightlife', function() { buildNightlife_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Sports', function() { buildEveningSportsAndStreaming_(ctx); });
  safePhaseCall_(ctx, 'Phase7-CitySystems', function() { buildCityEveningSystems_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaPacket', function() { buildMediaPacket_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaFeedback', function() { runMediaFeedbackEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase7-SeasonalSeeds', function() { applySeasonalStorySeeds_(ctx); });
  safePhaseCall_(ctx, 'Phase7-ChaosWeights', function() { applyChaosCategoryWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase7-StorySeeds', function() { applyStorySeeds_(ctx); });


  // ═══════════════════════════════════════════════════════════
  // PHASE 8: V3 INTEGRATION + CHICAGO
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase8-V3Preload', function() { v3PreloadContext_(ctx); });
  safePhaseCall_(ctx, 'Phase8-V3Integration', function() { v3Integration_(ctx); });

  safePhaseCall_(ctx, 'Phase8-CycleRecovery', function() { applyCycleRecovery_(ctx); });
  safePhaseCall_(ctx, 'Phase8-DomainCooldowns', function() { applyDomainCooldowns_(ctx); });
  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });

  safePhaseCall_(ctx, 'Phase8-ChicagoCitizens', function() { generateChicagoCitizens_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 9: FINAL ANALYSIS + DIGEST
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase9-DigestSummary', function() { applyCompressedDigestSummary_(ctx); });
  safePhaseCall_(ctx, 'Phase9-CycleWeight', function() { applyCycleWeightForLatestCycle_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizePopulation', function() { finalizeWorldPopulation_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 10: PERSISTENCE (write to sheets)
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase10-WriteDigest', function() { writeDigest_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CycleWeather', function() { recordCycleWeather_(ctx); });
  safePhaseCall_(ctx, 'Phase10-RecordEvents25', function() { recordWorldEvents25_(ctx); });
  safePhaseCall_(ctx, 'Phase10-RecordEventsV3', function() { recordWorldEventsv3_(ctx); });

  safePhaseCall_(ctx, 'Phase10-NeighborhoodMap', function() { saveV3NeighborhoodMap_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Arcs', function() { saveV3ArcsToLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Bonds', function() { saveRelationshipBonds_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Domains', function() { saveV3Domains_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Seeds', function() { saveV3Seeds_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Hooks', function() { saveV3Hooks_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Textures', function() { saveV3Textures_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Chicago', function() { saveV3Chicago_(ctx); });

  safePhaseCall_(ctx, 'Phase10-CyclePacket', function() { buildCyclePacket_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaBriefing', function() { generateMediaBriefing_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 11: MEDIA INTAKE RETURN (if media output exists)
  // ═══════════════════════════════════════════════════════════
  if (ctx.mediaOutput) {
    safePhaseCall_(ctx, 'Phase11-MediaIntake', function() { processMediaIntake_(ctx, ctx.mediaOutput); });
    safePhaseCall_(ctx, 'Phase11-MediaLedger', function() { recordMediaLedger_(ctx); });
  }

  } catch (fatalError) {
    // Log fatal error that crashed the entire cycle
    logEngineError_(ctx, 'FATAL-CycleError', fatalError);
    throw fatalError; // Re-throw so Apps Script logs it
  } finally {
    // v2.10: Flush cached writes to sheets
    if (ctx && ctx.cache) {
      try {
        var flushStats = ctx.cache.flush();
        Logger.log('Cache flush: ' + flushStats.writes + ' writes, ' + flushStats.appends + ' appends');
        if (flushStats.errors && flushStats.errors.length > 0) {
          Logger.log('Cache flush errors: ' + flushStats.errors.join(', '));
        }
      } catch (flushErr) {
        Logger.log('Cache flush failed: ' + flushErr.message);
      }
    }

    // Log cycle completion summary
    var errorCount = (ctx && ctx.summary && ctx.summary.auditIssues) ? ctx.summary.auditIssues.length : 0;
    Logger.log('Cycle completed. Errors logged: ' + errorCount);
  }
}


/**
 * ============================================================================
 * LOAD CONFIG (v2.10 - uses cache)
 * ============================================================================
 */
function loadConfig_(ctx) {
  // v2.10: Use cache instead of direct sheet access
  var cached = ctx.cache.getData('World_Config');
  if (!cached.exists) return;

  var values = cached.values;
  for (var r = 1; r < values.length; r++) {
    var key = (values[r][0] || '').toString().trim();
    if (!key) continue;

    var val = values[r][1];
    if (typeof val === 'string') {
      var num = parseFloat(val);
      if (!isNaN(num)) val = num;
    }
    ctx.config[key] = val;
  }
}


/**
 * ============================================================================
 * ADVANCE WORLD TIME (v2.10 - uses cache)
 * ============================================================================
 */
function advanceWorldTime_(ctx) {
  // v2.10: Use cache for reads, queue writes
  var cached = ctx.cache.getData('World_Config');
  if (!cached.exists) return;

  var values = cached.values;

  var cycleRow = null;
  var lastRunRow = null;

  for (var r = 1; r < values.length; r++) {
    var k = (values[r][0] || '').toString().trim();
    if (k === 'cycleCount') cycleRow = r + 1;
    if (k === 'lastRun') lastRunRow = r + 1;
  }

  var cycle = Number(ctx.config.cycleCount || 0);
  cycle++;

  ctx.summary.cycleId = cycle;

  // v2.10: Queue writes instead of immediate writes
  if (cycleRow) ctx.cache.queueWrite('World_Config', cycleRow, 2, cycle);
  if (lastRunRow) ctx.cache.queueWrite('World_Config', lastRunRow, 2, ctx.now);

  ctx.config.cycleCount = cycle;
}


/**
 * ============================================================================
 * UPDATE WORLD POPULATION v2.2 (v2.10 - uses cache)
 * ============================================================================
 *
 * Safe, realistic city-level population update with GodWorld Calendar integration.
 *
 * v2.2 Enhancements (v2.10):
 * - Uses sheet cache for reads, queued writes for batching
 *
 * v2.1 Enhancements:
 * - Full 30+ holiday awareness for migration patterns
 * - First Friday population dynamics
 * - Creation Day settling effects
 * - Sports season crowd impacts
 * - Cultural activity and community engagement modifiers
 * - Holiday-specific illness patterns
 *
 * Still NEVER touches:
 * - Named citizens
 * - Roles
 * - Status
 * - Neighborhoods
 * - Simulation_Ledger
 */
function updateWorldPopulation_(ctx) {

  // v2.10: Use cache for reads
  var cached = ctx.cache.getData('World_Population');
  if (!cached.exists) return;

  var values = cached.values;
  if (values.length < 2) return;

  var header = values[0];
  var row = values[1];

  // v2.10: Use createColIndex_ for efficient lookups
  var idx = createColIndex_(header);

  const iTotal = idx('totalPopulation');
  const iIll = idx('illnessRate');
  const iEmp = idx('employmentRate');
  const iMig = idx('migration');
  const iEcon = idx('economy');

  let total = Number(row[iTotal] || 0);
  let ill = Number(row[iIll] || 0.05);
  let emp = Number(row[iEmp] || 0.91);
  let mig = Number(row[iMig] || 0);
  let econ = (row[iEcon] || "stable").toString();

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, publicSpaces: 1, traffic: 1,
    culturalActivity: 1, communityEngagement: 1 
  };
  const sports = S.sportsSeason || "off-season";

  // Calendar context
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ILLNESS UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Random micro-shift
  ill += (Math.random() - 0.5) * 0.001;

  // Seasonal illness pressure
  if (season === "Winter") ill += 0.0008;
  if (season === "Spring") ill -= 0.0003;

  // Weather influence
  if (weather.type === "fog") ill += 0.0005;
  if (weather.type === "rain") ill += 0.0004;
  if (weather.type === "heatwave") ill += 0.0006;
  if (weather.type === "storm") ill += 0.0003;

  // City mood
  if (dynamics.sentiment <= -0.5) ill += 0.0004;

  // Holiday illness patterns - large gatherings increase transmission
  const gatheringHolidays = [
    "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "Independence", "OpeningDay", "OaklandPride"
  ];
  if (gatheringHolidays.includes(holiday)) {
    ill += 0.0006;
  }

  // Post-holiday illness bump (winter holidays especially)
  const winterHolidays = ["Holiday", "NewYear", "Hanukkah"];
  if (winterHolidays.includes(holiday) && season === "Winter") {
    ill += 0.0004;
  }

  // First Friday - slight increase from crowds
  if (isFirstFriday) {
    ill += 0.0002;
  }

  // High community engagement can improve health awareness
  if (dynamics.communityEngagement >= 1.4) {
    ill -= 0.0002;
  }

  if (ill < 0) ill = 0;
  if (ill > 0.15) ill = 0.15;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYMENT RATE UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Slight drift to stay realistic
  emp += (Math.random() - 0.5) * 0.0012;

  // Sentiment influence
  if (dynamics.sentiment <= -0.4) emp -= 0.0008;
  if (dynamics.sentiment >= 0.4) emp += 0.0006;

  // Weather → work disruptions
  if (weather.impact >= 1.3) emp -= 0.0005;

  // Holiday employment effects - retail holidays boost employment
  const retailHolidays = ["Holiday", "BlackFriday", "Valentine", "MothersDay", "FathersDay"];
  if (retailHolidays.includes(holiday)) {
    emp += 0.0008;
  }

  // Summer/outdoor event holidays boost service employment
  const serviceHolidays = ["Independence", "MemorialDay", "LaborDay", "CincoDeMayo"];
  if (serviceHolidays.includes(holiday)) {
    emp += 0.0005;
  }

  // Sports season employment boost
  if (sports === "championship") {
    emp += 0.001;
  } else if (sports === "playoffs" || sports === "post-season") {
    emp += 0.0006;
  }

  // First Friday boosts arts/service employment
  if (isFirstFriday) {
    emp += 0.0004;
  }

  // High cultural activity boosts employment
  if (dynamics.culturalActivity >= 1.4) {
    emp += 0.0004;
  }

  if (emp < 0) emp = 0;
  if (emp > 1) emp = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BIRTHS & DEATHS (SEASON-ADJUSTED + ILLNESS-COUPLED v2.11)
  // ═══════════════════════════════════════════════════════════════════════════

  let baseBirthRate = 0.010;
  let baseDeathRate = 0.008;

  // Seasonal patterns
  if (season === "Summer") baseBirthRate += 0.002;
  if (season === "Winter") baseDeathRate += 0.002;

  // More births expected in Fall (9 months after winter holidays)
  if (season === "Fall") baseBirthRate += 0.001;

  // Severe weather increases death rate slightly
  if (weather.impact >= 1.5) baseDeathRate += 0.001;

  // v2.11: Illness coupled to mortality
  // Higher illness rates increase death rate proportionally
  // At 5% illness (baseline): no modifier
  // At 10% illness: +0.001 death rate
  // At 15% illness (max): +0.002 death rate
  const ILLNESS_MORTALITY_FACTOR = 0.02; // 2% of illness rate adds to death rate
  const illnessDeathModifier = Math.max(0, (ill - 0.05)) * ILLNESS_MORTALITY_FACTOR;
  baseDeathRate += illnessDeathModifier;

  const births = Math.round(total * baseBirthRate);
  const deaths = Math.round(total * baseDeathRate);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MIGRATION UPDATE (Full Calendar Awareness)
  // ═══════════════════════════════════════════════════════════════════════════

  // Base fluctuation
  mig += Math.round((Math.random() - 0.5) * 20);

  // TRAVEL HOLIDAYS - High movement volatility
  const travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "MemorialDay", "LaborDay", "Independence"
  ];
  if (travelHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 50);
  }

  // GATHERING HOLIDAYS - Net inflow for celebrations
  const gatheringInflow = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival",
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos"
  ];
  if (gatheringInflow.includes(holiday)) {
    mig += Math.round(Math.random() * 40);
  }

  // CULTURAL HOLIDAYS - Diaspora visitors
  const culturalVisitorHolidays = [
    "DiaDeMuertos", "CincoDeMayo", "Juneteenth",
    "BlackHistoryMonth", "PrideMonth", "LunarNewYear"
  ];
  if (culturalVisitorHolidays.includes(holiday)) {
    mig += Math.round(Math.random() * 25);
  }

  // MINOR HOLIDAYS - Slight local movement
  const minorHolidays = [
    "Valentine", "StPatricksDay", "Easter", "Halloween",
    "MothersDay", "FathersDay", "EarthDay"
  ];
  if (minorHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 20);
  }

  // CIVIC OBSERVATION HOLIDAYS - Reduced movement
  const civicRestHolidays = ["MLKDay", "PresidentsDay", "VeteransDay"];
  if (civicRestHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 10);
  }

  // HOLIDAY PRIORITY EFFECTS
  if (holidayPriority === "major") {
    mig += Math.round((Math.random() - 0.5) * 30);
  } else if (holidayPriority === "oakland") {
    mig += Math.round(Math.random() * 35);
  } else if (holidayPriority === "cultural") {
    mig += Math.round(Math.random() * 20);
  }

  // FIRST FRIDAY - Draws visitors to arts districts
  if (isFirstFriday) {
    mig += Math.round(Math.random() * 30);
  }

  // CREATION DAY - Settling effect
  if (isCreationDay) {
    mig += Math.round(Math.random() * 15);
  }

  // SPORTS SEASON EFFECTS
  if (sports === "championship") {
    mig += Math.round(Math.random() * 60);
  } else if (sports === "playoffs" || sports === "post-season") {
    mig += Math.round(Math.random() * 40);
  } else if (sports === "late-season") {
    mig += Math.round(Math.random() * 20);
  }

  // CHAOS → MOVEMENT VOLATILITY
  if (chaos.length > 0) mig += Math.round((Math.random() - 0.5) * 30);
  if (chaos.length >= 5) mig += Math.round((Math.random() - 0.5) * 20);

  // CITY DYNAMICS
  if (dynamics.publicSpaces >= 1.4) mig += Math.round((Math.random() - 0.5) * 20);
  if (dynamics.culturalActivity >= 1.4) mig += Math.round(Math.random() * 15);
  if (dynamics.communityEngagement >= 1.3) mig += Math.round(Math.random() * 10);

  // WEATHER PUSH
  if (weather.impact >= 1.3) mig += Math.round((Math.random() - 0.5) * 15);
  if (weather.impact >= 1.5) mig += Math.round((Math.random() - 0.5) * 25);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. NEW TOTAL POPULATION (v2.11: migration clamped)
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.11: Clamp migration to prevent unrealistic swings
  // Max migration per cycle = 0.5% of total population
  const MAX_MIGRATION_RATE = 0.005;
  const maxMigration = Math.round(total * MAX_MIGRATION_RATE);
  mig = Math.max(-maxMigration, Math.min(maxMigration, mig));

  total = total + births - deaths + mig;
  if (total < 0) total = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ECONOMY LABEL
  // ═══════════════════════════════════════════════════════════════════════════

  if (emp > 0.94) econ = "strong";
  else if (emp < 0.88) econ = "weak";
  else econ = "stable";

  // Chaos → can destabilize economy
  if (chaos.length > 0 && econ === "stable") econ = "unstable";

  // Major holidays during strong economy = "booming"
  if (holidayPriority === "major" && emp > 0.92 && econ === "strong") {
    econ = "booming";
  }

  // Championship economy boost
  if (sports === "championship" && econ !== "weak") {
    if (econ === "stable") econ = "strong";
    if (econ === "strong") econ = "booming";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE BACK TO SHEET (v2.10: queued writes with column bounds checking)
  // ═══════════════════════════════════════════════════════════════════════════

  if (iTotal >= 0) ctx.cache.queueWrite('World_Population', 2, iTotal + 1, total);
  if (iIll >= 0) ctx.cache.queueWrite('World_Population', 2, iIll + 1, ill);
  if (iEmp >= 0) ctx.cache.queueWrite('World_Population', 2, iEmp + 1, emp);
  if (iMig >= 0) ctx.cache.queueWrite('World_Population', 2, iMig + 1, mig);
  if (iEcon >= 0) ctx.cache.queueWrite('World_Population', 2, iEcon + 1, econ);

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE IN CTX FOR DOWNSTREAM USE
  // ═══════════════════════════════════════════════════════════════════════════
  S.worldPopulation = {
    totalPopulation: total,
    illnessRate: ill,
    employmentRate: emp,
    migration: mig,
    economy: econ,
    calendarFactors: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sports
    }
  };
  
  ctx.summary = S;
}


/**
 * ============================================================================
 * PROCESS INTAKE v2.11 — Transactional (stage-then-commit)
 * ============================================================================
 * Stages all valid rows in memory first, then batch writes.
 * Prevents partial intake corruption if cycle crashes mid-execution.
 */
function processIntake_(ctx) {
  const intake = ctx.ss.getSheetByName('Intake');
  const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!intake || !ledger) return;

  const intakeVals = intake.getDataRange().getValues();
  if (intakeVals.length < 2) return;

  const intakeHeader = intakeVals[0];
  const ledgerVals = ledger.getDataRange().getValues();
  const ledgerHeader = ledgerVals[0];

  const idxI = name => intakeHeader.indexOf(name);
  const idxL = name => ledgerHeader.indexOf(name);

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: Validate and stage all rows in memory
  // ═══════════════════════════════════════════════════════════════════════════
  const stagedRows = [];
  const rowsToClear = [];
  let nextPopNum = getMaxPopId_(ledgerVals) + 1;

  // Track names we're adding in this batch to prevent intra-batch duplicates
  const batchNames = new Set();

  for (let r = 1; r < intakeVals.length; r++) {
    const row = intakeVals[r];

    const first = (row[idxI('First')] || '').toString().trim();
    const last = (row[idxI('Last')] || '').toString().trim();
    if (!first && !last) continue;

    // Check against existing ledger (normalized)
    if (existsInLedger_(ledgerVals, first, last)) {
      rowsToClear.push(r + 1); // Still clear duplicate intake rows
      continue;
    }

    // Check against names already staged in this batch
    const normKey = normalizeIdentity_(first) + '|' + normalizeIdentity_(last);
    if (batchNames.has(normKey)) {
      rowsToClear.push(r + 1); // Duplicate within batch
      continue;
    }
    batchNames.add(normKey);

    // Build the new ledger row
    const middle = (row[idxI('Middle')] || '').toString().trim();
    const originGame = (row[idxI('OriginGame')] || '').toString().trim();
    const uni = (row[idxI('UNI (y/n)')] || '').toString().trim();
    const med = (row[idxI('MED (y/n)')] || '').toString().trim();
    const civ = (row[idxI('CIV (y/n)')] || '').toString().trim();
    const clock = (row[idxI('ClockMode')] || 'ENGINE').toString().trim();
    const tier = row[idxI('Tier')] || '';
    const roleType = row[idxI('RoleType')] || '';
    const status = row[idxI('Status')] || 'Active';
    const birthYear = row[idxI('BirthYear')] || '';
    const originCity = row[idxI('OriginCity')] || '';
    const lifeHist = row[idxI('LifeHistory')] || '';
    const vault = row[idxI('OriginVault')] || '';
    const neighborhood = row[idxI('Neighborhood')] || '';

    const popId = 'POP-' + String(nextPopNum++).padStart(5, '0');

    const newRow = new Array(ledgerHeader.length).fill('');

    if (idxL('POPID') >= 0) newRow[idxL('POPID')] = popId;
    if (idxL('First') >= 0) newRow[idxL('First')] = first;
    if (idxL('Middle') >= 0) newRow[idxL('Middle')] = middle;
    if (idxL('Last') >= 0) newRow[idxL('Last')] = last;
    if (idxL('OriginGame') >= 0) newRow[idxL('OriginGame')] = originGame;
    if (idxL('UNI (y/n)') >= 0) newRow[idxL('UNI (y/n)')] = uni;
    if (idxL('MED (y/n)') >= 0) newRow[idxL('MED (y/n)')] = med;
    if (idxL('CIV (y/n)') >= 0) newRow[idxL('CIV (y/n)')] = civ;
    if (idxL('ClockMode') >= 0) newRow[idxL('ClockMode')] = clock;
    if (idxL('Tier') >= 0) newRow[idxL('Tier')] = tier;
    if (idxL('RoleType') >= 0) newRow[idxL('RoleType')] = roleType;
    if (idxL('Status') >= 0) newRow[idxL('Status')] = status;
    if (idxL('BirthYear') >= 0) newRow[idxL('BirthYear')] = birthYear;
    if (idxL('OriginCity') >= 0) newRow[idxL('OriginCity')] = originCity;
    if (idxL('LifeHistory') >= 0) newRow[idxL('LifeHistory')] = lifeHist;
    if (idxL('OriginVault') >= 0) newRow[idxL('OriginVault')] = vault;
    if (idxL('Neighborhood') >= 0) newRow[idxL('Neighborhood')] = neighborhood;
    if (idxL('CreatedAt') >= 0) newRow[idxL('CreatedAt')] = ctx.now;
    if (idxL('LastUpdated') >= 0) newRow[idxL('LastUpdated')] = ctx.now;
    if (idxL('UsageCount') >= 0) newRow[idxL('UsageCount')] = 0;

    stagedRows.push(newRow);
    rowsToClear.push(r + 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: Batch write all staged rows at once
  // ═══════════════════════════════════════════════════════════════════════════
  if (stagedRows.length > 0) {
    const startRow = ledger.getLastRow() + 1;
    ledger.getRange(startRow, 1, stagedRows.length, ledgerHeader.length)
          .setValues(stagedRows);
    ctx.summary.intakeProcessed += stagedRows.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: Clear processed intake rows (after successful write)
  // ═══════════════════════════════════════════════════════════════════════════
  rowsToClear.sort((a, b) => b - a);
  rowsToClear.forEach(i => {
    intake.getRange(i, 1, 1, intake.getLastColumn()).clearContent();
  });
}

/**
 * Helper: Get max POP-ID number from ledger
 */
function getMaxPopId_(ledgerValues) {
  if (ledgerValues.length < 2) return 0;

  const header = ledgerValues[0];
  const idx = header.indexOf('POPID');
  if (idx < 0) return 0;

  let maxN = 0;
  for (let r = 1; r < ledgerValues.length; r++) {
    const v = (ledgerValues[r][idx] || '').toString().trim();
    const m = v.match(/^POP-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > maxN) maxN = n;
    }
  }
  return maxN;
}


/**
 * ============================================================================
 * DUPLICATE CHECKER (v2.11 - with identity normalization)
 * ============================================================================
 * Uses normalizeIdentity_() for consistent duplicate detection.
 * Prevents duplicates from case differences or extra whitespace.
 */
function existsInLedger_(ledgerValues, first, last) {
  if (ledgerValues.length < 2) return false;

  const header = ledgerValues[0];
  const idxFirst = header.indexOf('First');
  const idxLast = header.indexOf('Last');

  // Normalize input names
  const normFirst = normalizeIdentity_(first);
  const normLast = normalizeIdentity_(last);

  for (let r = 1; r < ledgerValues.length; r++) {
    const f = normalizeIdentity_(ledgerValues[r][idxFirst]);
    const l = normalizeIdentity_(ledgerValues[r][idxLast]);
    if (f === normFirst && l === normLast) return true;
  }
  return false;
}


/**
 * ============================================================================
 * SAFE POP-ID GENERATOR
 * ============================================================================
 */
function nextPopIdSafe_(ledgerValues) {
  if (ledgerValues.length < 2) return 'POP-00001';

  const header = ledgerValues[0];
  const idx = header.indexOf('POPID');

  let maxN = 0;
  for (let r = 1; r < ledgerValues.length; r++) {
    const v = (ledgerValues[r][idx] || '').toString().trim();
    const m = v.match(/^POP-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > maxN) maxN = n;
    }
  }
  return 'POP-' + String(maxN + 1).padStart(5, '0');
}


/**
 * ============================================================================
 * UPDATE NAMED CITIZENS — SAFE, NO RANDOM EVENTS
 * ============================================================================
 */
function updateNamedCitizens_(ctx) {
  const sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = name => header.indexOf(name);

  const iClock = idx('ClockMode');
  const iStatus = idx('Status');
  const iLast = idx('LastUpdated');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const mode = row[iClock] || 'ENGINE';
    const status = row[iStatus] || 'Active';

    if (status === 'Deceased') continue;
    if (mode !== 'ENGINE') continue;

    // Only update LastUpdated
    row[iLast] = ctx.now;

    rows[i] = row;
    ctx.summary.citizensUpdated++;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}


/**
 * ============================================================================
 * UTILITY FUNCTIONS - See utilities/utilityFunctions.js
 * ============================================================================
 * Consolidated in v2.9: pickRandom_, pickRandomSet_, maybePick_, shortId_,
 * ensureSheet_, colIndex_, safeGet_ are now defined in utilityFunctions.js
 */


/**
 * ============================================================================
 * DIGEST WRITER
 * ============================================================================
 */
function writeDigest_(ctx) {
  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const S = ctx.summary;

  const row = [
    // A – Timestamp
    ctx.now,

    // B – Cycle
    S.cycleId,

    // C – IntakeProcessed
    S.intakeProcessed,

    // D – CitizensAged (updated)
    S.citizensUpdated,

    // E – EventsGenerated
    S.eventsGenerated,

    // F – Issues
    S.auditIssues ? S.auditIssues.join(", ") : "",

    // G – CycleWeight
    S.cycleWeight || "",

    // H - CycleWeightReason
    S.cycleWeightReason || "",

    // I – CivicLoad
    S.civicLoad || "",

    // J – MigrationDrift
    S.migrationDrift || 0,

    // K – PatternFlag
    S.patternFlag || "",

    // L – ShockFlag
    S.shockFlag || "",

    // M – StorySeedCount
    S.storySeeds ? S.storySeeds.length : 0,

    // N – EveningMedia
    S.eveningMedia ? JSON.stringify(S.eveningMedia) : "",

    // O – FamousPeople
    S.famousPeople ? S.famousPeople.join(", ") : "",

    // P – EveningFood
    S.eveningFood ? JSON.stringify(S.eveningFood) : "",

    // Q – CityEvents
    S.cityEvents ? S.cityEvents.join(", ") : "",

    // R – Nightlife
    S.nightlife ? JSON.stringify(S.nightlife) : "",

    // S – Sports
    S.eveningSports || "",

    // T – StreamingTrend
    S.streamingTrend || "",

    // U – WorldEvents
    JSON.stringify(S.worldEvents || []),

    // V – Weather
    JSON.stringify(S.weather || {}),

    // W – CityTraffic
    S.cityDynamics ? S.cityDynamics.traffic : "",

    // X – RetailLoad
    S.cityDynamics ? S.cityDynamics.retail : "",

    // Y – TourismLoad
    S.cityDynamics ? S.cityDynamics.tourism : "",

    // Z – NightlifeLoad
    S.cityDynamics ? S.cityDynamics.nightlife : "",

    // AA – PublicSpaceLoad
    S.cityDynamics ? S.cityDynamics.publicSpaces : "",

    // AB – Sentiment
    S.cityDynamics ? S.cityDynamics.sentiment : ""
  ];

  sheet.appendRow(row);
}


/**
 * ============================================================================
 * APPLY CYCLE WEIGHT FOR LATEST CYCLE
 * ============================================================================
 */
function applyCycleWeightForLatestCycle_(ctx) {
  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const lastRow = sheet.getLastRow();

  // EventsGenerated is column 5 (E)
  const events = Number(sheet.getRange(lastRow, 5).getValue()) || 0;

  let weight = 'low-signal';
  if (events >= 20) {
    weight = 'high-signal';
  } else if (events >= 5) {
    weight = 'medium-signal';
  }

  // CycleWeight column = 7 (G)
  sheet.getRange(lastRow, 7).setValue(weight);
}