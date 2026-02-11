/**
 * ============================================================================
 * GOD WORLD ENGINE v2.13
 * ============================================================================
 *
 * v2.13 Changes:
 * - Added compressLifeHistory_ call in Phase 9 for TraitProfile generation
 * - Enables archetype-aware event generation in generateCitizensEvents v2.7
 * - Compresses LifeHistory column to TraitProfile (column R) periodically
 *
 * v2.12 Changes:
 * - Wired up cycle modes (dry-run, replay) from utilities/cycleModes.js
 * - Calls initializeModeFlags_() and initializeSeededRng_() at cycle start
 * - Calls saveCycleSeed_() in Phase 10 for replay capability
 * - Added runDryRunCycle() wrapper for testing without writes
 * - Added replayCycle(cycleId) wrapper for deterministic replay
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

  // Track in context for summary (push string, not object, to avoid [object Object] in join)
  if (ctx && ctx.summary && ctx.summary.auditIssues) {
    ctx.summary.auditIssues.push('[' + phase + '] ' + error.message);
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
  var ss, ctx;

  try {
    ss = openSimSpreadsheet_();  // v2.14: Use configured spreadsheet ID
  } catch (e) {
    Logger.log('FATAL: Cannot open spreadsheet: ' + e.message);
    throw e; // Cannot continue without spreadsheet
  }

  var now = new Date();

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

  // v2.12: Initialize mode flags and seeded RNG for replay/dry-run support
  initializeModeFlags_(ctx);
  initializeSeededRng_(ctx);

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
  safePhaseCall_(ctx, 'Phase2-SportsFeed', function() { applySportsFeedTriggers_(ctx); });  // v2.14
  safePhaseCall_(ctx, 'Phase2-Weather', function() { applyWeatherModel_(ctx); });
  safePhaseCall_(ctx, 'Phase2-CityDynamics', function() { applyCityDynamics_(ctx); });
  safePhaseCall_(ctx, 'Phase2-Transit', function() { updateTransitMetrics_Phase2_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: POPULATION + CRISIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase3-Population', function() { updateWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase3-Demographics', function() { applyDemographicDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrisisSpikes', function() { generateCrisisSpikes_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrisisBuckets', function() { generateCrisisBuckets_(ctx); });
  safePhaseCall_(ctx, 'Phase3-Crime', function() { updateCrimeMetrics_Phase3_(ctx); });
  safePhaseCall_(ctx, 'Phase3-NeighborhoodDemo', function() { updateNeighborhoodDemographics_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: RECOVERY + WORLD EVENTS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase4-CycleRecovery', function() { applyCycleRecovery_(ctx); });
  safePhaseCall_(ctx, 'Phase4-DomainCooldowns', function() { applyDomainCooldowns_(ctx); });
  safePhaseCall_(ctx, 'Phase4-WorldEvents', function() { worldEventsEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase4-FaithEvents', function() { runFaithEventsEngine_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: CITIZENS + RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase5-GenericCitizens', function() { generateGenericCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenericMicroEvents', function() { generateGenericCitizenMicroEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GameModeMicroEvents', function() { generateGameModeMicroEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase5-EnsureEventsLedger', function() { ensureWorldEventsLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EnsureMediaLedger', function() { ensureMediaLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EnsureEventsV3', function() { ensureWorldEventsV3Ledger_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EnsureBonds', function() { ensureRelationshipBondSchemas_(ctx); });

  safePhaseCall_(ctx, 'Phase5-LoadBonds', function() { loadRelationshipBonds_(ctx); });
  safePhaseCall_(ctx, 'Phase5-SeedBonds', function() { seedRelationshipBonds_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Relationships', function() { runRelationshipEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Neighborhoods', function() { runNeighborhoodEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Universe', function() { runAsUniversePipeline_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CivicRoles', function() { runCivicRoleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Elections', function() { runCivicElections_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Initiatives', function() { runCivicInitiativeEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Career', function() { runCareerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Education', function() { runEducationEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Household', function() { runHouseholdEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Generational', function() { runGenerationalEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Youth', function() { runYouthEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-EventArc', function() { eventArcEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-NamedCitizens', function() { updateNamedCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Promotions', function() { checkForPromotions_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-HouseholdFormation', function() { processHouseholdFormation_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenerationalWealth', function() { processGenerationalWealth_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase6-FilterNoise', function() { filterNoiseEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Prioritize', function() { prioritizeEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase6-Spotlights', function() { applyNamedCitizenSpotlights_(ctx); });
  safePhaseCall_(ctx, 'Phase6-RecurringCitizens', function() { computeRecurringCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase6-CivicLoad', function() { applyCivicLoadIndicator_(ctx); });
  safePhaseCall_(ctx, 'Phase6-EconomicRipple', function() { runEconomicRippleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase6-InitiativeRipple', function() {
    if (typeof applyActiveInitiativeRipples_ === 'function') {
      applyActiveInitiativeRipples_(ctx);
    }
  });
  safePhaseCall_(ctx, 'Phase6-Migration', function() { applyMigrationDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase6-PatternDetect', function() { applyPatternDetection_(ctx); });
  safePhaseCall_(ctx, 'Phase6-ShockMonitor', function() { applyShockMonitor_(ctx); });

  safePhaseCall_(ctx, 'Phase6-ArcLifecycle', function() { processArcLifecycle_(ctx); });
  safePhaseCall_(ctx, 'Phase6-StorylineStatus', function() { updateStorylineStatus_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Textures', function() { textureTriggerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase6-TransitSignals', function() {
    if (typeof getTransitStorySignals_ === 'function') {
      var signals = getTransitStorySignals_(ctx);
      if (signals.length > 0) {
        var S = ctx.summary || {};
        S.transitStorySignals = signals;
      }
    }
  });
  safePhaseCall_(ctx, 'Phase6-FaithSignals', function() {
    if (typeof getFaithStorySignals_ === 'function') {
      var signals = getFaithStorySignals_(ctx);
      if (signals.length > 0) {
        var S = ctx.summary || {};
        S.faithStorySignals = signals;
      }
    }
  });

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
  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });

  safePhaseCall_(ctx, 'Phase8-ChicagoCitizens', function() { generateChicagoCitizens_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 9: FINAL ANALYSIS + DIGEST
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase9-DigestSummary', function() { applyCompressedDigestSummary_(ctx); });
  safePhaseCall_(ctx, 'Phase9-CycleWeight', function() { applyCycleWeightForLatestCycle_(ctx); });
  // v2.13: Compress LifeHistory into TraitProfiles for archetype-aware event generation
  safePhaseCall_(ctx, 'Phase9-CompressLifeHistory', function() { compressLifeHistory_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizePopulation', function() { finalizeWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizeCycleState', function() { finalizeCycleState_(ctx); });

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
  safePhaseCall_(ctx, 'Phase10-BondLedger', function() { saveV3BondsToLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Domains', function() { saveV3Domains_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Seeds', function() { saveV3Seeds_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Hooks', function() { saveV3Hooks_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Textures', function() { saveV3Textures_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Chicago', function() { saveV3Chicago_(ctx); });

  safePhaseCall_(ctx, 'Phase10-CyclePacket', function() { buildCyclePacket_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaBriefing', function() { generateMediaBriefing_(ctx); });

  // Media Ledger - records cultural entity media mentions (uses ctx.summary.mediaIntake from buildMediaPacket_)
  safePhaseCall_(ctx, 'Phase10-MediaLedger', function() { recordMediaLedger_(ctx); });

  // v2.12: Save cycle seed for replay capability
  safePhaseCall_(ctx, 'Phase10-CycleSeed', function() { saveCycleSeed_(ctx); });

  // Execute all queued write intents (V3 persistence model)
  safePhaseCall_(ctx, 'Phase10-ExecuteIntents', function() { executePersistIntents_(ctx); });

  // v3.2: Append World_Population row 2 as history row for time series tracking
  safePhaseCall_(ctx, 'Phase10-PopulationHistory', function() { appendPopulationHistory_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 11: MEDIA INTAKE — process any unprocessed intake rows
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase11-MediaIntake', function() { processMediaIntake_(ctx); });

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

  var iTotal = idx('totalPopulation');
  var iIll = idx('illnessRate');
  var iEmp = idx('employmentRate');
  var iMig = idx('migration');
  var iEcon = idx('economy');

  var total = Number(row[iTotal] || 0);
  var ill = Number(row[iIll] || 0.05);
  var emp = Number(row[iEmp] || 0.91);
  var mig = Number(row[iMig] || 0);
  var econ = (row[iEcon] || "stable").toString();

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;

  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, publicSpaces: 1, traffic: 1,
    culturalActivity: 1, communityEngagement: 1
  };
  var sports = S.sportsSeason || "off-season";

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

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
  var gatheringHolidays = [
    "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "Independence", "OpeningDay", "OaklandPride"
  ];
  if (gatheringHolidays.indexOf(holiday) >= 0) {
    ill += 0.0006;
  }

  // Post-holiday illness bump (winter holidays especially)
  var winterHolidays = ["Holiday", "NewYear", "Hanukkah"];
  if (winterHolidays.indexOf(holiday) >= 0 && season === "Winter") {
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
  var retailHolidays = ["Holiday", "BlackFriday", "Valentine", "MothersDay", "FathersDay"];
  if (retailHolidays.indexOf(holiday) >= 0) {
    emp += 0.0008;
  }

  // Summer/outdoor event holidays boost service employment
  var serviceHolidays = ["Independence", "MemorialDay", "LaborDay", "CincoDeMayo"];
  if (serviceHolidays.indexOf(holiday) >= 0) {
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

  var baseBirthRate = 0.010;
  var baseDeathRate = 0.008;

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
  var ILLNESS_MORTALITY_FACTOR = 0.02; // 2% of illness rate adds to death rate
  var illnessDeathModifier = Math.max(0, (ill - 0.05)) * ILLNESS_MORTALITY_FACTOR;
  baseDeathRate += illnessDeathModifier;

  var births = Math.round(total * baseBirthRate);
  var deaths = Math.round(total * baseDeathRate);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MIGRATION UPDATE (Full Calendar Awareness)
  // ═══════════════════════════════════════════════════════════════════════════

  // Base fluctuation
  mig += Math.round((Math.random() - 0.5) * 20);

  // TRAVEL HOLIDAYS - High movement volatility
  var travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "MemorialDay", "LaborDay", "Independence"
  ];
  if (travelHolidays.indexOf(holiday) >= 0) {
    mig += Math.round((Math.random() - 0.5) * 50);
  }

  // GATHERING HOLIDAYS - Net inflow for celebrations
  var gatheringInflow = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival",
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos"
  ];
  if (gatheringInflow.indexOf(holiday) >= 0) {
    mig += Math.round(Math.random() * 40);
  }

  // CULTURAL HOLIDAYS - Diaspora visitors
  var culturalVisitorHolidays = [
    "DiaDeMuertos", "CincoDeMayo", "Juneteenth",
    "BlackHistoryMonth", "PrideMonth", "LunarNewYear"
  ];
  if (culturalVisitorHolidays.indexOf(holiday) >= 0) {
    mig += Math.round(Math.random() * 25);
  }

  // MINOR HOLIDAYS - Slight local movement
  var minorHolidays = [
    "Valentine", "StPatricksDay", "Easter", "Halloween",
    "MothersDay", "FathersDay", "EarthDay"
  ];
  if (minorHolidays.indexOf(holiday) >= 0) {
    mig += Math.round((Math.random() - 0.5) * 20);
  }

  // CIVIC OBSERVATION HOLIDAYS - Reduced movement
  var civicRestHolidays = ["MLKDay", "PresidentsDay", "VeteransDay"];
  if (civicRestHolidays.indexOf(holiday) >= 0) {
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
  var MAX_MIGRATION_RATE = 0.005;
  var maxMigration = Math.round(total * MAX_MIGRATION_RATE);
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
 * APPEND POPULATION HISTORY v1.0
 * ============================================================================
 * Copies World_Population row 2 (current state) to the end of the sheet.
 * Row 2 stays as "current state" for all existing readers.
 * Rows 3+ build a time series for trend analysis.
 * Runs after ExecuteIntents so all Phase writes have landed on row 2.
 */
function appendPopulationHistory_(ctx) {
  var sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var currentRow = data[1]; // row 2 (0-indexed)
  // Set timestamp and cycle on the history copy
  var header = data[0];
  var row = currentRow.slice(); // copy
  var tsIdx = header.indexOf('timestamp');
  var cyIdx = header.indexOf('cycle');
  if (tsIdx >= 0) row[tsIdx] = new Date();
  if (cyIdx >= 0) row[cyIdx] = ctx.summary.cycleId || ctx.summary.absoluteCycle || '';
  sheet.appendRow(row);
}


/**
 * ============================================================================
 * PROCESS INTAKE v2.11 — Transactional (stage-then-commit)
 * ============================================================================
 * Stages all valid rows in memory first, then batch writes.
 * Prevents partial intake corruption if cycle crashes mid-execution.
 */
/**
 * Helper: Pad string to specified length (ES5-compatible padStart replacement)
 */
function padStart_(str, targetLength, padChar) {
  str = String(str);
  padChar = padChar || '0';
  while (str.length < targetLength) {
    str = padChar + str;
  }
  return str;
}

function processIntake_(ctx) {
  var intake = ctx.ss.getSheetByName('Intake');
  var ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!intake || !ledger) return;

  var intakeVals = intake.getDataRange().getValues();
  if (intakeVals.length < 2) return;

  var intakeHeader = intakeVals[0];
  var ledgerVals = ledger.getDataRange().getValues();
  var ledgerHeader = ledgerVals[0];

  var idxI = function(name) { return intakeHeader.indexOf(name); };
  var idxL = function(name) { return ledgerHeader.indexOf(name); };

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: Validate and stage all rows in memory
  // ═══════════════════════════════════════════════════════════════════════════
  var stagedRows = [];
  var rowsToClear = [];
  var nextPopNum = getMaxPopId_(ledgerVals) + 1;

  // Track names we're adding in this batch to prevent intra-batch duplicates
  var batchNames = new Set();

  for (var r = 1; r < intakeVals.length; r++) {
    var row = intakeVals[r];

    var first = (row[idxI('First')] || '').toString().trim();
    var last = (row[idxI('Last')] || '').toString().trim();
    if (!first && !last) continue;

    // Check against existing ledger (normalized)
    if (existsInLedger_(ledgerVals, first, last)) {
      rowsToClear.push(r + 1); // Still clear duplicate intake rows
      continue;
    }

    // Check against names already staged in this batch
    var normKey = normalizeIdentity_(first) + '|' + normalizeIdentity_(last);
    if (batchNames.has(normKey)) {
      rowsToClear.push(r + 1); // Duplicate within batch
      continue;
    }
    batchNames.add(normKey);

    // Build the new ledger row
    var middle = (row[idxI('Middle')] || '').toString().trim();
    var originGame = (row[idxI('OriginGame')] || '').toString().trim();
    var uni = (row[idxI('UNI (y/n)')] || '').toString().trim();
    var med = (row[idxI('MED (y/n)')] || '').toString().trim();
    var civ = (row[idxI('CIV (y/n)')] || '').toString().trim();
    var clock = (row[idxI('ClockMode')] || 'ENGINE').toString().trim();
    var tier = row[idxI('Tier')] || '';
    var roleType = row[idxI('RoleType')] || '';
    var status = row[idxI('Status')] || 'Active';
    var birthYear = row[idxI('BirthYear')] || '';
    var originCity = row[idxI('OriginCity')] || '';
    var lifeHist = row[idxI('LifeHistory')] || '';
    var vault = row[idxI('OriginVault')] || '';
    var neighborhood = row[idxI('Neighborhood')] || '';

    var popId = 'POP-' + padStart_(nextPopNum++, 5, '0');

    var newRow = new Array(ledgerHeader.length).fill('');

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
    var startRow = ledger.getLastRow() + 1;
    ledger.getRange(startRow, 1, stagedRows.length, ledgerHeader.length)
          .setValues(stagedRows);
    ctx.summary.intakeProcessed += stagedRows.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: Clear processed intake rows (after successful write)
  // ═══════════════════════════════════════════════════════════════════════════
  rowsToClear.sort(function(a, b) { return b - a; });
  for (var i = 0; i < rowsToClear.length; i++) {
    intake.getRange(rowsToClear[i], 1, 1, intake.getLastColumn()).clearContent();
  }
}

/**
 * Helper: Get max POP-ID number from ledger
 */
function getMaxPopId_(ledgerValues) {
  if (ledgerValues.length < 2) return 0;

  var header = ledgerValues[0];
  var idx = header.indexOf('POPID');
  if (idx < 0) return 0;

  var maxN = 0;
  for (var r = 1; r < ledgerValues.length; r++) {
    var v = (ledgerValues[r][idx] || '').toString().trim();
    var m = v.match(/^POP-(\d+)$/);
    if (m) {
      var n = Number(m[1]);
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

  var header = ledgerValues[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');

  // Normalize input names
  var normFirst = normalizeIdentity_(first);
  var normLast = normalizeIdentity_(last);

  for (var r = 1; r < ledgerValues.length; r++) {
    var f = normalizeIdentity_(ledgerValues[r][idxFirst]);
    var l = normalizeIdentity_(ledgerValues[r][idxLast]);
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

  var header = ledgerValues[0];
  var idx = header.indexOf('POPID');

  var maxN = 0;
  for (var r = 1; r < ledgerValues.length; r++) {
    var v = (ledgerValues[r][idx] || '').toString().trim();
    var m = v.match(/^POP-(\d+)$/);
    if (m) {
      var n = Number(m[1]);
      if (n > maxN) maxN = n;
    }
  }
  return 'POP-' + padStart_(maxN + 1, 5, '0');
}


/**
 * ============================================================================
 * UPDATE NAMED CITIZENS — SAFE, NO RANDOM EVENTS
 * ============================================================================
 */
function updateNamedCitizens_(ctx) {
  var sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iClock = idx('ClockMode');
  var iStatus = idx('Status');
  var iLast = idx('LastUpdated');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    var mode = row[iClock] || 'ENGINE';
    var status = row[iStatus] || 'Active';

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
  var sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  var S = ctx.summary;

  var row = [
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
  var sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();

  // EventsGenerated is column 5 (E)
  var events = Number(sheet.getRange(lastRow, 5).getValue()) || 0;

  var weight = 'low-signal';
  if (events >= 20) {
    weight = 'high-signal';
  } else if (events >= 5) {
    weight = 'medium-signal';
  }

  // CycleWeight column = 7 (G)
  sheet.getRange(lastRow, 7).setValue(weight);
}


/**
 * ============================================================================
 * DRY-RUN CYCLE (v2.12)
 * ============================================================================
 * Runs a full cycle without writing to sheets.
 * All intents are logged but not executed.
 * Use this to test cycle logic without side effects.
 *
 * Usage (from Apps Script editor):
 *   runDryRunCycle()
 *
 * Returns: Intent summary showing what would have been written
 */
function runDryRunCycle() {
  var ss, ctx;

  try {
    ss = openSimSpreadsheet_();  // v2.14: Use configured spreadsheet ID
  } catch (e) {
    Logger.log('FATAL: Cannot open spreadsheet: ' + e.message);
    throw e;
  }

  var now = new Date();
  var cache = createSheetCache_(ss);

  ctx = {
    ss: ss,
    cache: cache,
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

  // Enable dry-run mode
  initializeDryRunMode_(ctx);
  initializeSeededRng_(ctx);

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('DRY-RUN CYCLE STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  // Run the cycle (writes will be logged but not executed)
  runCyclePhases_(ctx);

  // Get intent summary
  var summary = getIntentSummary_(ctx);

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('DRY-RUN COMPLETE - Intent Summary:');
  Logger.log('  Updates: ' + summary.updateCount);
  Logger.log('  Logs: ' + summary.logCount);
  Logger.log('  Replaces: ' + summary.replaceCount);
  Logger.log('  Sheets affected: ' + summary.sheetsAffected.join(', '));
  Logger.log('═══════════════════════════════════════════════════════════');

  return summary;
}


/**
 * ============================================================================
 * REPLAY CYCLE (v2.12)
 * ============================================================================
 * Re-runs a past cycle using the same seed for deterministic output.
 * Compares output to original cycle checksum.
 * Use this to verify cycle logic is deterministic.
 *
 * Usage (from Apps Script editor):
 *   replayCycle(75)  // Replay cycle 75
 *
 * @param {number} cycleId - The cycle ID to replay
 * @returns {Object} Comparison result with match status
 */
function replayCycle(cycleId) {
  if (!cycleId || typeof cycleId !== 'number') {
    Logger.log('ERROR: replayCycle requires a numeric cycleId');
    return { error: 'Invalid cycleId' };
  }

  var ss, ctx;

  try {
    ss = openSimSpreadsheet_();  // v2.14: Use configured spreadsheet ID
  } catch (e) {
    Logger.log('FATAL: Cannot open spreadsheet: ' + e.message);
    throw e;
  }

  var now = new Date();
  var cache = createSheetCache_(ss);

  ctx = {
    ss: ss,
    cache: cache,
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

  // Enable replay mode for the specified cycle
  initializeReplayMode_(ctx, cycleId);

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('REPLAY CYCLE ' + cycleId + ' STARTED');
  Logger.log('Using seed: ' + (ctx.replaySeed ? ctx.replaySeed.seed : cycleId));
  Logger.log('═══════════════════════════════════════════════════════════');

  // Run the cycle (writes will be logged but not executed)
  runCyclePhases_(ctx);

  // Compare output to original
  var comparison = compareReplayOutput_(ctx);

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('REPLAY COMPLETE - Comparison Result:');
  Logger.log('  Match: ' + (comparison.match ? 'YES ✓' : 'NO ✗'));
  if (!comparison.match && comparison.differences) {
    Logger.log('  Differences:');
    for (var i = 0; i < comparison.differences.length; i++) {
      Logger.log('    - ' + comparison.differences[i]);
    }
  }
  Logger.log('═══════════════════════════════════════════════════════════');

  return comparison;
}


/**
 * ============================================================================
 * RUN CYCLE PHASES (v2.12 - internal helper)
 * ============================================================================
 * Extracted cycle phase execution for reuse by wrapper functions.
 * @param {Object} ctx - Engine context
 */
function runCyclePhases_(ctx) {
  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CORE TIME + CONFIG
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase1-LoadConfig', function() { loadConfig_(ctx); });
  safePhaseCall_(ctx, 'Phase1-AdvanceTime', function() { advanceWorldTime_(ctx); });
  safePhaseCall_(ctx, 'Phase1-Calendar', function() { advanceSimulationCalendar_(ctx); });
  safePhaseCall_(ctx, 'Phase1-ResetAudit', function() { resetCycleAuditIssues_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: WORLD STATE
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase2-SeasonalWeights', function() { applySeasonalWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsSeason', function() { applySportsSeason_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsFeed', function() { applySportsFeedTriggers_(ctx); });  // v2.14
  safePhaseCall_(ctx, 'Phase2-Weather', function() { applyWeatherModel_(ctx); });
  safePhaseCall_(ctx, 'Phase2-CityDynamics', function() { applyCityDynamics_(ctx); });
  safePhaseCall_(ctx, 'Phase2-Transit', function() { updateTransitMetrics_Phase2_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: POPULATION + CRISIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase3-Population', function() { updateWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase3-Demographics', function() { applyDemographicDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrisisSpikes', function() { generateCrisisSpikes_(ctx); });
  safePhaseCall_(ctx, 'Phase3-CrimeMetrics', function() { generateCrimeMetrics_(ctx); });
  // Note: V3 runs faith in Phase 3 (before world events). Crisis detection uses
  // sentiment only — worldEvents-based crisis keywords don't fire in V3 pipeline.
  safePhaseCall_(ctx, 'Phase3-Faith', function() { runFaithEventsEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase3-Youth', function() { runYouthEngine_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: INITIATIVES + VOTING
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase4-CivicInitiatives', function() { runCivicInitiativeEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase4-LoadBonds', function() { loadRelationshipBonds_(ctx); });
  safePhaseCall_(ctx, 'Phase4-BondEngine', function() { runBondEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase4-ArcGen', function() { generateNewStoryArcs_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: CITIZENS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntakeV3_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenerationalEvents', function() { runGenerationalEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-AsUniverse', function() { runAsUniversePipeline_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Education', function() { runEducationEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Career', function() { runCareerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CivicRole', function() { runCivicRoleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Relationships', function() { runRelationshipEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Neighborhood', function() { runNeighborhoodEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Household', function() { runHouseholdEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CivicElections', function() { runCivicElections_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase6-FilterNoise', function() { filterNoiseEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Prioritize', function() { prioritizeEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Spotlights', function() { applyNamedCitizenSpotlights_(ctx); });
  safePhaseCall_(ctx, 'Phase6-RecurringCitizens', function() { computeRecurringCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase6-CivicLoad', function() { applyCivicLoadIndicator_(ctx); });
  safePhaseCall_(ctx, 'Phase6-EconomicRipple', function() { runEconomicRippleEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase6-InitiativeRipple', function() {
    if (typeof applyActiveInitiativeRipples_ === 'function') {
      applyActiveInitiativeRipples_(ctx);
    }
  });
  safePhaseCall_(ctx, 'Phase6-Migration', function() { applyMigrationDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase6-PatternDetect', function() { applyPatternDetection_(ctx); });
  safePhaseCall_(ctx, 'Phase6-ShockMonitor', function() { applyShockMonitor_(ctx); });
  safePhaseCall_(ctx, 'Phase6-ArcLifecycle', function() { processArcLifecycle_(ctx); });
  safePhaseCall_(ctx, 'Phase6-StorylineStatus', function() { updateStorylineStatus_(ctx); });
  safePhaseCall_(ctx, 'Phase6-Textures', function() { textureTriggerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase6-TransitSignals', function() {
    if (typeof getTransitStorySignals_ === 'function') {
      var signals = getTransitStorySignals_(ctx);
      if (signals.length > 0) {
        var S = ctx.summary || {};
        S.transitStorySignals = signals;
      }
    }
  });
  safePhaseCall_(ctx, 'Phase6-FaithSignals', function() {
    if (typeof getFaithStorySignals_ === 'function') {
      var signals = getFaithStorySignals_(ctx);
      if (signals.length > 0) {
        var S = ctx.summary || {};
        S.faithStorySignals = signals;
      }
    }
  });

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
  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });
  safePhaseCall_(ctx, 'Phase8-ChicagoCitizens', function() { generateChicagoCitizens_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 9: FINAL ANALYSIS + DIGEST
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase9-DigestSummary', function() { applyCompressedDigestSummary_(ctx); });
  safePhaseCall_(ctx, 'Phase9-CycleWeight', function() { applyCycleWeightForLatestCycle_(ctx); });
  // v2.13: Compress LifeHistory into TraitProfiles for archetype-aware event generation
  safePhaseCall_(ctx, 'Phase9-CompressLifeHistory', function() { compressLifeHistory_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizePopulation', function() { finalizeWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizeCycleState', function() { finalizeCycleState_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 10: PERSISTENCE
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase10-WriteDigest', function() { writeDigest_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CycleWeather', function() { recordCycleWeather_(ctx); });
  safePhaseCall_(ctx, 'Phase10-RecordEvents25', function() { recordWorldEvents25_(ctx); });
  safePhaseCall_(ctx, 'Phase10-RecordEventsV3', function() { recordWorldEventsv3_(ctx); });
  safePhaseCall_(ctx, 'Phase10-NeighborhoodMap', function() { saveV3NeighborhoodMap_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Arcs', function() { saveV3ArcsToLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Bonds', function() { saveRelationshipBonds_(ctx); });
  safePhaseCall_(ctx, 'Phase10-BondLedger', function() { saveV3BondsToLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Domains', function() { saveV3Domains_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Seeds', function() { saveV3Seeds_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Hooks', function() { saveV3Hooks_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Textures', function() { saveV3Textures_(ctx); });
  safePhaseCall_(ctx, 'Phase10-Chicago', function() { saveV3Chicago_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CyclePacket', function() { buildCyclePacket_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaBriefing', function() { generateMediaBriefing_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaLedger', function() { recordMediaLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CycleSeed', function() { saveCycleSeed_(ctx); });
  safePhaseCall_(ctx, 'Phase10-ExecuteIntents', function() { executePersistIntents_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 11: EXPORT ARTIFACTS (OpenClaw Integration)
  // ═══════════════════════════════════════════════════════════
  // Exports cycle-XX-summary.json, cycle-XX-context.json, and manifest.json
  // to Drive folder "exports/" for OpenClaw consumption.
  // See: utilities/exportCycleArtifacts.js
  safePhaseCall_(ctx, 'Phase11-ExportArtifacts', function() {
    if (typeof exportCycleArtifacts_ === 'function') {
      exportCycleArtifacts_(ctx, { includePretty: true });
    }
  });

  // Flush cache
  if (ctx.cache) {
    try {
      ctx.cache.flush();
    } catch (e) {
      Logger.log('Cache flush error: ' + e.message);
    }
  }
}