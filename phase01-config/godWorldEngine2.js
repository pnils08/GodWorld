/**
 * ============================================================================
 * GOD WORLD ENGINE v2.14
 * ============================================================================
 *
 * v2.14 Changes:
 * - Replaced Math.random() with ctx.rng in updateWorldPopulation_ (23 instances)
 * - Deterministic RNG for reproducible population dynamics
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
 *
 * Phase 42 §B5 audit-miss 3 carve-out (S237): TWO direct sheet writes here
 * are intentional, not migration candidates:
 *   (1) L88-94 insertSheet + header appendRow — schema-setup carve-out per
 *       engine.md §Phase 42 §1.1 (fires ≤1× per spreadsheet lifetime,
 *       outside cycle-write path).
 *   (2) L99-110 errSheet.appendRow(error row) — error-path transactional
 *       carve-out. Cannot route through writeIntents/Phase 10 because Phase
 *       10 itself can throw (recorded by this function); deferred error log
 *       on a Phase 10 failure would never persist. Meta-error class. Same
 *       reasoning as Apps Script try/catch persistence pattern in lib/
 *       diagnosticLedger.js (companion node-side reader on Engine_Errors).
 */
function logEngineError_(ctx, phase, error) {
  var msg = 'GodWorld Engine Error [' + phase + ']: ' + error.message;
  Logger.log(msg);
  Logger.log('Stack: ' + (error.stack || 'N/A'));

  // Track in context for summary (push string, not object, to avoid [object Object] in join)
  if (ctx && ctx.summary && ctx.summary.auditIssues) {
    ctx.summary.auditIssues.push('[' + phase + '] ' + error.message);
  }

  // G-RC6 (engine.19, S226): dedicated counter for cycle-close reporting.
  // auditIssues is shared with crisis-bucket pushes (generateCrisisBuckets +
  // others), so `auditIssues.length` overcounts the "Errors logged" close-
  // statement label vs the actual Engine_Errors sheet append count. This
  // counter increments ONCE per logEngineError_ call → exactly matches the
  // number of Engine_Errors rows appended this cycle.
  if (ctx && ctx.summary) {
    ctx.summary.engineErrorCount = (ctx.summary.engineErrorCount || 0) + 1;
  }

  // Optionally write to Engine_Errors sheet (creates if missing).
  // S216 engine.15 Phase 3 — sheet expanded from 5 → 10 cols. Writer now
  // populates Class/Source/Severity/Resolved/Hash for cross-class diagnostic
  // ledger consistency (lib/diagnosticLedger reads same sheet). Severity
  // 'high' for FATAL phases, 'medium' for non-fatal phase failures.
  try {
    if (ctx && ctx.ss) {
      var errSheet = ctx.ss.getSheetByName('Engine_Errors');
      if (!errSheet) {
        errSheet = ctx.ss.insertSheet('Engine_Errors');
        errSheet.appendRow(['Timestamp', 'Cycle', 'Phase', 'Error', 'Stack',
          'Class', 'Source', 'Severity', 'Resolved', 'Hash']);
      }
      var cycleId = (ctx.summary && ctx.summary.cycleId) ? ctx.summary.cycleId : 'Unknown';
      var severity = /FATAL/i.test(phase) ? 'high' : 'medium';
      var hashInput = 'engine-error|' + phase + '|' + (error.message || '').substring(0, 100);
      var hash = computeShortHash_(hashInput);
      errSheet.appendRow([
        new Date().toISOString(),
        cycleId,
        phase,
        error.message,
        (error.stack || 'N/A').substring(0, 500),
        'engine-error',
        phase,
        severity,
        '',
        hash
      ]);
    }
  } catch (logErr) {
    Logger.log('Could not write to Engine_Errors sheet: ' + logErr.message);
  }
}

/**
 * Short hash for Engine_Errors dedup. Apps Script doesn't have crypto;
 * use Utilities.computeDigest with SHA1 and return first 12 hex chars.
 * Mirrors lib/diagnosticLedger.computeHash() so node-side dedup matches
 * engine-side writes.
 */
function computeShortHash_(input) {
  try {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, input);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      var s = b.toString(16);
      hex += s.length === 1 ? '0' + s : s;
    }
    return hex.substring(0, 12);
  } catch (e) {
    return '';
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

  // Phase 42 §5.6: shared in-memory Simulation_Ledger. All cycle-path
  // SL writers/readers route through ctx.ledger.rows. Phase 10 commits
  // the final state via a single queueRangeIntent_. Must precede every
  // SL toucher in the cycle.
  initSimulationLedger_(ctx);

  try {
  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CORE TIME + CONFIG
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase1-LoadConfig', function() { loadConfig_(ctx); });
  safePhaseCall_(ctx, 'Phase1-AdvanceTime', function() { advanceWorldTime_(ctx); });
  safePhaseCall_(ctx, 'Phase1-Calendar', function() { advanceSimulationCalendar_(ctx); });
  safePhaseCall_(ctx, 'Phase1-ResetAudit', function() { resetCycleAuditIssues_(ctx); });
  safePhaseCall_(ctx, 'Phase1-PrevEvening', function() { loadPreviousEvening_(ctx); });
  safePhaseCall_(ctx, 'Phase1-PrevCycleState', function() { loadPreviousCycleState_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: WORLD STATE (MUST run BEFORE population/events)
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase2-SeasonalWeights', function() { applySeasonalWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsSeason', function() { applySportsSeason_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsFeed', function() { applySportsFeedTriggers_(ctx); });  // v2.14
  safePhaseCall_(ctx, 'Phase2-CivicSentiment', function() { loadCivicVoiceSentiment_(ctx); });  // v1.0 S137b
  safePhaseCall_(ctx, 'Phase2-EditionCoverage', function() { applyEditionCoverageEffects_(ctx); });  // v2.0 S137b
  safePhaseCall_(ctx, 'Phase2-InitiativeEffects', function() { applyInitiativeImplementationEffects_(ctx); });  // v1.0 S137b
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
  // S205: Phase5-GenericCitizens DISABLED — Path B no-grow legacy. Generator writes to
  // Generic_Citizens (10 cols, no Gender col) with flat age distribution 18-75 and
  // ungendered name picks; live tab is ~83% male from pre-v2.6 grandfathered clusters.
  // Architecture decision S205: SL is single source of truth (836 active, Tier 1-5 +
  // Gender col AU); GC retained as no-grow legacy. Future SL-Tier-5 generator TBD.
  // safePhaseCall_(ctx, 'Phase5-GenericCitizens', function() { generateGenericCitizens_(ctx); });
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
  safePhaseCall_(ctx, 'Phase5-ApprovalRatings', function() { updateCivicApprovalRatings_(ctx); });  // v1.0 S137b
  safePhaseCall_(ctx, 'Phase5-CivicModeEvents', function() { generateCivicModeEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-MediaModeEvents', function() { generateMediaModeEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Career', function() { runCareerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Education', function() { runEducationEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Household', function() { runHouseholdEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Conduct', function() { runConductEngine_(ctx); }); // engine.32 T7 — moral tests (inert until DialState deploys)
  safePhaseCall_(ctx, 'Phase5-Generational', function() { runGenerationalEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Youth', function() { runYouthEngine_(ctx); });

  // eventArcEngine_ removed from Phase 5 — arcs load at Phase 8 preload,
  // so this was always a no-op. Arc processing happens via v3Integration.
  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-NamedCitizens', function() { updateNamedCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Promotions', function() { checkForPromotions_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-HouseholdFormation', function() { processHouseholdFormation_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenerationalWealth', function() { processGenerationalWealth_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EducationCareer', function() { processEducationCareer_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Gentrification', function() { processGentrification_(ctx); });
  safePhaseCall_(ctx, 'Phase5-MigrationTracking', function() { processMigrationTracking_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  // NOTE: Phase 5 Tier-5 engines (HouseholdFormation, GenerationalWealth,
  // EducationCareer, MigrationTracking) historically used direct sheet
  // writes; the original Session-30 rationale was that subsequent engines
  // read from sheets updated by prior engines. Phase 42 §5.6 (S188) replaced
  // sheet-as-IPC with shared ctx.ledger (the chain still exists, but as
  // in-memory mutation). Cohort-C migration completed S200 (commits a829c7f,
  // ed25ea8, 7f95521, 93cd3a4). See PHASE_42_PATTERNS.md §5.6 + per-engine
  // file headers. Phase 6 engines below have their own write semantics —
  // not audited as part of S200 cohort-C work.
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

  // Arc lifecycle moved to Phase 8 (after v3PreloadContext_ loads eventArcs)
  // Was here as Phase6-ArcLifecycle — but arcs aren't loaded until Phase 8.
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
  // PHASE 6.5: PRE-PUBLICATION VALIDATION
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase6.5-Validation', function() {
    if (typeof runPrePublicationValidation_ === 'function') {
      var validationReport = runPrePublicationValidation_(ctx);
      ctx.summary.validationReport = validationReport;
      Logger.log('Phase 6.5: Validation complete - ' + validationReport.overallStatus);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 7: EVENING + MEDIA SYSTEMS
  // ═══════════════════════════════════════════════════════════
  // Phase 7 ordering: producers before consumers
  // CityEvents/Nightlife/Sports SET S.cityEvents, S.nightlife, S.nightlifeVolume, S.eveningSports
  // Food READS S.nightlifeVolume; Famous/EveningMedia READ S.eveningSports
  // CitySystems READS S.nightlife, S.eveningSports, S.cityEvents (all three)
  safePhaseCall_(ctx, 'Phase7-CityEvents', function() { buildCityEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Nightlife', function() { buildNightlife_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Sports', function() { buildEveningSportsAndStreaming_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Food', function() { buildEveningFood_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Famous', function() { buildEveningFamous_(ctx); });
  safePhaseCall_(ctx, 'Phase7-EveningMedia', function() { buildEveningMedia_(ctx); });
  safePhaseCall_(ctx, 'Phase7-CitySystems', function() { buildCityEveningSystems_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaPacket', function() { buildMediaPacket_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaFeedback', function() { runMediaFeedbackEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase7-StorylineWeaving', function() { weaveStorylines_(ctx); });

  safePhaseCall_(ctx, 'Phase7-SeasonalSeeds', function() { applySeasonalStorySeeds_(ctx); });
  safePhaseCall_(ctx, 'Phase7-ChaosWeights', function() { applyChaosCategoryWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase7-StorySeeds', function() { applyStorySeeds_(ctx); });


  // ═══════════════════════════════════════════════════════════
  // PHASE 8: V3 INTEGRATION + CHICAGO
  // (CycleWeight SIGNAL moved here from Phase 9 so arc engine has the
  // weight/reason/score on ctx.summary. S237: was calling
  // applyCycleWeightForLatestCycle_ — wrapper that ALSO wrote to
  // Riley_Digest before Phase 10 had appended this cycle's row →
  // corrupted previous cycle's row via lastRow fallback. Wrapper +
  // file retired; direct call to applyCycleWeight_ gives the signal
  // with no side effects. writeDigest_ at Phase 10 now writes the
  // canonical cycle row including CycleWeight + Reason from
  // ctx.summary populated here.)
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase8-CycleWeightSignal', function() { applyCycleWeight_(ctx); });
  safePhaseCall_(ctx, 'Phase8-V3Preload', function() { v3PreloadContext_(ctx); });
  // Arc lifecycle runs here — after v3PreloadContext_ loads eventArcs into ctx.summary
  safePhaseCall_(ctx, 'Phase8-ArcLifecycle', function() { processArcLifecycle_(ctx); });
  safePhaseCall_(ctx, 'Phase8-StorylineStatus', function() { updateStorylineStatus_(ctx); });
  safePhaseCall_(ctx, 'Phase8-StorylineHealth', function() { monitorStorylineHealth_(ctx); });
  safePhaseCall_(ctx, 'Phase8-V3Integration', function() { v3Integration_(ctx); });
  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });

  // S229 DISABLED — Chicago is canonically dead in the sim (Path B no-grow-legacy,
  // mirror of S205 Phase5-GenericCitizens disable). Pool frozen at ~124 rows in
  // Chicago_Citizens sheet; no more SEED/MAINTAIN/CHURN cycle-path writes. File
  // `phase05-citizens/generateChicagoCitizensv1.js` retained for reversibility.
  // Sister disable: Phase10-Chicago later in this function + both Chicago sites
  // in the cycle-phases entry point below. Mechanical-w/-refactor batch in
  // PHASE_42_PATTERNS §3.5 (L78/L102/L136) reclassified to verify-only-phase-disabled.
  // safePhaseCall_(ctx, 'Phase8-ChicagoCitizens', function() { generateChicagoCitizens_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 9: FINAL ANALYSIS + DIGEST
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase9-DigestSummary', function() { applyCompressedDigestSummary_(ctx); });
  // v2.13: Compress LifeHistory into TraitProfiles for archetype-aware event generation
  safePhaseCall_(ctx, 'Phase9-CompressLifeHistory', function() { compressLifeHistory_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizePopulation', function() { finalizeWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase9-EveningSnapshot', function() { snapshotEveningForCarryForward_(ctx); });
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
  // S229 DISABLED — sister of Phase8-ChicagoCitizens disable above.
  // No more per-cycle Chicago_Feed appends. Pool frozen + feed frozen.
  // safePhaseCall_(ctx, 'Phase10-Chicago', function() { saveV3Chicago_(ctx); });

  safePhaseCall_(ctx, 'Phase10-CyclePacket', function() { buildCyclePacket_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaBriefing', function() { generateMediaBriefing_(ctx); });

  // Media Ledger - records cultural entity media mentions (uses ctx.summary.mediaIntake from buildMediaPacket_)
  safePhaseCall_(ctx, 'Phase10-MediaLedger', function() { recordMediaLedger_(ctx); });

  // v2.12: Save cycle seed for replay capability
  safePhaseCall_(ctx, 'Phase10-CycleSeed', function() { saveCycleSeed_(ctx); });

  // Save evening snapshot for next cycle's citizen events
  safePhaseCall_(ctx, 'Phase10-EveningSnapshot', function() { saveEveningSnapshot_(ctx); });
  // Save cycle state for next cycle's analyzers (shock, pattern, recovery)
  safePhaseCall_(ctx, 'Phase10-CycleState', function() { savePreviousCycleState_(ctx); });
  // Phase 42 §5.6: consolidated Simulation_Ledger commit (matches runCyclePhases_).
  safePhaseCall_(ctx, 'Phase10-CommitLedger', function() { commitSimulationLedger_(ctx); });
  // Execute all queued write intents (V3 persistence model)
  safePhaseCall_(ctx, 'Phase10-ExecuteIntents', function() { executePersistIntents_(ctx); });

  // v3.2 REMOVED: appendPopulationHistory_ had a cache-flush ordering bug —
  // it read row 2 before cache.flush(), capturing stale previous-cycle values.
  // Nothing reads the history rows. World_Population is a single-row state sheet.

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

    // Log cycle completion summary. G-RC6 (engine.19, S226): report
    // engineErrorCount (Engine_Errors sheet append count) — NOT
    // auditIssues.length, which conflates errors with crisis-bucket pushes
    // and produced the "errors logged: 2 vs Engine_Errors row: 1" gap.
    var engineErrors = (ctx && ctx.summary && ctx.summary.engineErrorCount) || 0;
    var auditIssueCount = (ctx && ctx.summary && ctx.summary.auditIssues) ? ctx.summary.auditIssues.length : 0;
    Logger.log('Cycle completed. Engine errors logged: ' + engineErrors + '; audit issues tracked: ' + auditIssueCount);
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

  // DRY-RUN FIX: Don't increment cycle in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (!isDryRun) {
    cycle++;
  }

  ctx.summary.cycleId = cycle;

  // v2.10: Queue writes instead of immediate writes
  // DRY-RUN FIX: Don't queue writes in dry-run mode (executePersistIntents will skip anyway, but be explicit)
  if (!isDryRun) {
    if (cycleRow) ctx.cache.queueWrite('World_Config', cycleRow, 2, cycle);
    if (lastRunRow) ctx.cache.queueWrite('World_Config', lastRunRow, 2, ctx.now);
  }

  ctx.config.cycleCount = cycle;
}


/**
 * ============================================================================
 * UPDATE WORLD POPULATION v2.3 (v2.14 - deterministic RNG)
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

  var rng = safeRand_(ctx);

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
  ill += (rng() - 0.5) * 0.001;

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
  emp += (rng() - 0.5) * 0.0012;

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
  mig += Math.round((rng() - 0.5) * 20);

  // TRAVEL HOLIDAYS - High movement volatility
  var travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "MemorialDay", "LaborDay", "Independence"
  ];
  if (travelHolidays.indexOf(holiday) >= 0) {
    mig += Math.round((rng() - 0.5) * 50);
  }

  // GATHERING HOLIDAYS - Net inflow for celebrations
  var gatheringInflow = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival",
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos"
  ];
  if (gatheringInflow.indexOf(holiday) >= 0) {
    mig += Math.round(rng() * 40);
  }

  // CULTURAL HOLIDAYS - Diaspora visitors
  var culturalVisitorHolidays = [
    "DiaDeMuertos", "CincoDeMayo", "Juneteenth",
    "BlackHistoryMonth", "PrideMonth", "LunarNewYear"
  ];
  if (culturalVisitorHolidays.indexOf(holiday) >= 0) {
    mig += Math.round(rng() * 25);
  }

  // MINOR HOLIDAYS - Slight local movement
  var minorHolidays = [
    "Valentine", "StPatricksDay", "Easter", "Halloween",
    "MothersDay", "FathersDay", "EarthDay"
  ];
  if (minorHolidays.indexOf(holiday) >= 0) {
    mig += Math.round((rng() - 0.5) * 20);
  }

  // CIVIC OBSERVATION HOLIDAYS - Reduced movement
  var civicRestHolidays = ["MLKDay", "PresidentsDay", "VeteransDay"];
  if (civicRestHolidays.indexOf(holiday) >= 0) {
    mig += Math.round((rng() - 0.5) * 10);
  }

  // HOLIDAY PRIORITY EFFECTS
  if (holidayPriority === "major") {
    mig += Math.round((rng() - 0.5) * 30);
  } else if (holidayPriority === "oakland") {
    mig += Math.round(rng() * 35);
  } else if (holidayPriority === "cultural") {
    mig += Math.round(rng() * 20);
  }

  // FIRST FRIDAY - Draws visitors to arts districts
  if (isFirstFriday) {
    mig += Math.round(rng() * 30);
  }

  // CREATION DAY - Settling effect
  if (isCreationDay) {
    mig += Math.round(rng() * 15);
  }

  // SPORTS SEASON EFFECTS
  if (sports === "championship") {
    mig += Math.round(rng() * 60);
  } else if (sports === "playoffs" || sports === "post-season") {
    mig += Math.round(rng() * 40);
  } else if (sports === "late-season") {
    mig += Math.round(rng() * 20);
  }

  // CHAOS → MOVEMENT VOLATILITY
  if (chaos.length > 0) mig += Math.round((rng() - 0.5) * 30);
  if (chaos.length >= 5) mig += Math.round((rng() - 0.5) * 20);

  // CITY DYNAMICS
  if (dynamics.publicSpaces >= 1.4) mig += Math.round((rng() - 0.5) * 20);
  if (dynamics.culturalActivity >= 1.4) mig += Math.round(rng() * 15);
  if (dynamics.communityEngagement >= 1.3) mig += Math.round(rng() * 10);

  // WEATHER PUSH
  if (weather.impact >= 1.3) mig += Math.round((rng() - 0.5) * 15);
  if (weather.impact >= 1.5) mig += Math.round((rng() - 0.5) * 25);

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


// S237 REMOVED: `appendPopulationHistory_` (was here at L897-938). Two
// v3.2-removed comment markers at the cycle-phases entry points (L438 +
// L1738 — both kept as archaeology) confirmed the function had been
// unreachable since v3.2. Caller graph audit verified zero callers
// project-wide; only references left were the two removal markers and
// the function's own Logger.log strings. Body was a Phase-10-following
// step that copied World_Population row 2 → end-of-sheet for trend
// history; superseded by the explicit cache-flush-aware history path
// noted in the L438 marker. Surfaced during Phase 42 §B5 audit-miss 3
// per-site classification as the 3rd dead-function in same audit pass
// (alongside applyCycleWeightForLatestCycle_ stub + determineNoteType_).
// Pattern: feedback_measure-twice-cascading-effects (cohort-C scope
// expansion class — dead writers masquerading as migration candidates).


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

/**
 * Phase 42 §B5 audit-miss 3 carve-out (S237): the `intake.getRange(...).
 * clearContent()` direct write at L1085 is intentional. Intake is an
 * operator-fed source tab; processIntake_'s stage-then-clear pattern is
 * transactional with its own ledger.rows push. Deferring the clear to
 * Phase 10 would split that transaction across phases (stage commits, but
 * clear waits; if Phase 10 partial-fails the source rows live on and are
 * re-staged next cycle → duplicates). The writeIntents API also has no
 * clear intent type; introducing one would be invasive for a single
 * use-case. Same reasoning as the healthCauseIntake operator-fired
 * carve-out documented in engine.md §Phase 11 media intake (S236).
 */
function processIntake_(ctx) {
  // Phase 42 §5.6: SL writes via shared ctx.ledger (push staged rows;
  // Phase 10 consolidated commit auto-extends the sheet). Direct
  // sheet-append removed — would clobber checkForPromotions /
  // processAdvancementIntake pushes that ran later in Phase 5.
  if (!ctx.ledger) {
    throw new Error('processIntake_: ctx.ledger not initialized');
  }
  var intake = ctx.ss.getSheetByName('Intake');
  if (!intake) return;

  var intakeVals = intake.getDataRange().getValues();
  if (intakeVals.length < 2) return;

  var intakeHeader = intakeVals[0];
  var ledgerHeader = ctx.ledger.headers;
  // Composite for existsInLedger_ + getMaxPopId_ helper compatibility
  // (they iterate from r=1 skipping header).
  var ledgerVals = [ledgerHeader].concat(ctx.ledger.rows);

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
  // STAGE 2: Phase 42 §5.6 — push staged rows to ctx.ledger.rows; Phase 10
  // consolidated commit auto-extends the sheet (impl shape #18).
  // Direct ledger.getRange(getLastRow()+1, ...).setValues removed: under
  // §5.6 it would clobber later push-writers (checkForPromotions,
  // processAdvancementIntake) when Phase 10 commits the unified array.
  // ═══════════════════════════════════════════════════════════════════════════
  if (stagedRows.length > 0) {
    for (var s = 0; s < stagedRows.length; s++) {
      ctx.ledger.rows.push(stagedRows[s]);
    }
    ctx.ledger.dirty = true;
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


// S185 dead-code scan removal: nextPopIdSafe_ — superseded by other POPID
// generators; no callers verified.


/**
 * ============================================================================
 * UPDATE NAMED CITIZENS — SAFE, NO RANDOM EVENTS
 * ============================================================================
 */
function updateNamedCitizens_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // Audit-miss: §5.6.6 spec did not list this writer (it's in godWorldEngine2.js
  // itself). Migrated S188 to keep its LastUpdated mutations from being
  // clobbered by the consolidated commit. Spec table A1 entry #11
  // (`generateNamedCitizensEvents.js:715`) has zero callers — orphan.
  if (!ctx.ledger) {
    throw new Error('updateNamedCitizens_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(name) { return header.indexOf(name); };

  var iClock = idx('ClockMode');
  var iStatus = idx('Status');
  var iLast = idx('LastUpdated');

  var updated = 0;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    var mode = row[iClock] || 'ENGINE';
    var status = row[iStatus] || 'Active';

    if (status === 'Deceased') continue;
    if (mode !== 'ENGINE') continue;

    row[iLast] = ctx.now;

    rows[i] = row;
    ctx.summary.citizensUpdated++;
    updated++;
  }

  if (updated > 0) {
    ctx.ledger.dirty = true;
  }
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
  // S237 Phase 42 §B5 audit-miss 3 cohort close: appendRow → queueAppendIntent_.
  // dryRun guard dropped — write-intents respect dryRun at Phase 10 flush time
  // (same pattern as applyEditionCoverageEffects v2.1 / advanceSimulationCalendar
  // v2.4 / finalizeWorldPopulation v1.3 from S236). The pre-existing
  // `getSheetByName('Riley_Digest')` + null-guard returned early when the tab
  // was missing — queueAppendIntent_ + persistenceExecutor will auto-create
  // the sheet at flush time, so the guard is no longer load-bearing.
  // Companion fix: `applyCycleWeightForLatestCycle_` (phase09-digest, deleted
  // this commit) was writing CycleWeight/Reason to Riley_Digest in Phase 8 —
  // before this function appended the cycle row. That corrupted PREVIOUS
  // cycle's row via lastRow fallback. ctx.summary.cycleWeight + Reason are
  // now produced by the slim Phase 8 `applyCycleWeight_` call and consumed
  // here at row[6]/row[7] of the canonical append.

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

  queueAppendIntent_(ctx, 'Riley_Digest', row, 'writeDigest_: cycle digest append', 'audit');
}


// S237 REMOVED: stub `applyCycleWeightForLatestCycle_` definition.
// Collided with the canonical v2.3 impl in
// phase09-digest/applyCycleWeightForLatestCycle.js (Apps Script flat namespace
// — one def silently overrides the other based on load order). The stub:
//   - Read EventsGenerated col 5 + wrote CycleWeight col 7 only
//   - Hardcoded thresholds (events ≥20 → high-signal, ≥5 → medium-signal)
//   - Wrote to lastRow without cycle-safe row targeting
// vs phase09-digest v2.3:
//   - Calls applyCycleWeight_(ctx) for full scoring (sets
//     S.cycleWeight/Reason/Score on ctx.summary)
//   - Cycle-safe row targeting (lastIndexOf cycle in Cycle col → targetRow)
//   - Writes 9 columns: CycleWeight + CycleWeightReason + CycleWeightScore +
//     6 calendar columns (Holiday/HolidayPriority/FirstFriday/CreationDay/
//     SportsSeason/Season/CalendarSummary)
// The two cycle-phases call sites at L372/L1694 now bind unambiguously to
// the v2.3 impl. Caller graph: only those two sites + a doc-comment ref in
// phase03-population/finalizeWorldPopulation.js (already accurate). Surfaced
// during Phase 42 §B5 audit-miss 3 per-site classification work — exact
// Phase A reversal class (S199 recordWorldEventsv25). Pattern:
// feedback_measure-twice-cascading-effects.


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

  // Get intent summary (from utilities/writeIntents.js)
  var summary = getIntentSummary_(ctx);

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('DRY-RUN COMPLETE - Intent Summary:');
  Logger.log('  Total intents: ' + summary.totalIntents);
  Logger.log('  Replace ops: ' + summary.replaceOps);
  Logger.log('  Updates: ' + summary.updates);
  Logger.log('  Logs: ' + summary.logs);
  Logger.log('  Sheets affected: ' + Object.keys(summary.bySheet || {}).length);
  Logger.log('═══════════════════════════════════════════════════════════');

  // Phase 42 verification harness — structured snapshot between markers.
  // Capture via `clasp logs` then grep PHASE42_VERIFY_BEGIN..END for the JSON.
  // Per-writer breakdown surfaces beyond the byDomain/bySheet tallies in summary.
  var perWriter = computePhase42PerWriter_(ctx);
  Logger.log('PHASE42_VERIFY_BEGIN');
  Logger.log(JSON.stringify({
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    cycleId: ctx.summary && ctx.summary.cycleId,
    summary: summary,
    perWriter: perWriter
  }));
  Logger.log('PHASE42_VERIFY_END');

  return summary;
}


/**
 * Per-writer intent counts for the Phase 42 verification harness. Walks all
 * pending intents and groups by (tab, kind, domain) — that's the diff axis
 * for verifying a migration changes only the intended writer's intent shape.
 * @param {Object} ctx - Engine context (post-cycle, intents not yet cleared)
 * @returns {Object} { 'tab|kind|domain': count, ... }
 */
function computePhase42PerWriter_(ctx) {
  var out = {};
  if (!ctx.persist) return out;
  var all = []
    .concat(ctx.persist.replaceOps || [])
    .concat(ctx.persist.updates || [])
    .concat(ctx.persist.logs || []);
  for (var i = 0; i < all.length; i++) {
    var it = all[i];
    var key = (it.tab || '?') + '|' + (it.kind || '?') + '|' + (it.domain || '?');
    out[key] = (out[key] || 0) + 1;
  }
  return out;
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
  // Phase 42 §5.6: shared in-memory Simulation_Ledger (matches runWorldCycle).
  // All cycle-path SL writers/readers route through ctx.ledger.rows; Phase 10
  // commits the final state via a single queueRangeIntent_.
  initSimulationLedger_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CORE TIME + CONFIG
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase1-LoadConfig', function() { loadConfig_(ctx); });
  safePhaseCall_(ctx, 'Phase1-AdvanceTime', function() { advanceWorldTime_(ctx); });
  safePhaseCall_(ctx, 'Phase1-Calendar', function() { advanceSimulationCalendar_(ctx); });
  safePhaseCall_(ctx, 'Phase1-ResetAudit', function() { resetCycleAuditIssues_(ctx); });
  safePhaseCall_(ctx, 'Phase1-PrevEvening', function() { loadPreviousEvening_(ctx); });
  safePhaseCall_(ctx, 'Phase1-PrevCycleState', function() { loadPreviousCycleState_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: WORLD STATE
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase2-SeasonalWeights', function() { applySeasonalWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsSeason', function() { applySportsSeason_(ctx); });
  safePhaseCall_(ctx, 'Phase2-SportsFeed', function() { applySportsFeedTriggers_(ctx); });  // v2.14
  safePhaseCall_(ctx, 'Phase2-CivicSentiment', function() { loadCivicVoiceSentiment_(ctx); });  // v1.0 S137b
  safePhaseCall_(ctx, 'Phase2-EditionCoverage', function() { applyEditionCoverageEffects_(ctx); });  // v2.0 S137b
  safePhaseCall_(ctx, 'Phase2-InitiativeEffects', function() { applyInitiativeImplementationEffects_(ctx); });  // v1.0 S137b
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
  // S205: Phase5-GenericCitizens DISABLED — Path B no-grow legacy. Generator writes to
  // Generic_Citizens (10 cols, no Gender col) with flat age distribution 18-75 and
  // ungendered name picks; live tab is ~83% male from pre-v2.6 grandfathered clusters.
  // Architecture decision S205: SL is single source of truth (836 active, Tier 1-5 +
  // Gender col AU); GC retained as no-grow legacy. Future SL-Tier-5 generator TBD.
  // safePhaseCall_(ctx, 'Phase5-GenericCitizens', function() { generateGenericCitizens_(ctx); });
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
  safePhaseCall_(ctx, 'Phase5-ApprovalRatings', function() { updateCivicApprovalRatings_(ctx); });  // v1.0 S137b
  safePhaseCall_(ctx, 'Phase5-CivicModeEvents', function() { generateCivicModeEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-MediaModeEvents', function() { generateMediaModeEvents_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Career', function() { runCareerEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Education', function() { runEducationEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Household', function() { runHouseholdEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Conduct', function() { runConductEngine_(ctx); }); // engine.32 T7 — moral tests (inert until DialState deploys)
  safePhaseCall_(ctx, 'Phase5-Generational', function() { runGenerationalEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Youth', function() { runYouthEngine_(ctx); });

  // eventArcEngine_ removed from Phase 5 — arcs load at Phase 8 preload,
  // so this was always a no-op. Arc processing happens via v3Integration.
  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });

  safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-NamedCitizens', function() { updateNamedCitizens_(ctx); });
  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Promotions', function() { checkForPromotions_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase5-HouseholdFormation', function() { processHouseholdFormation_(ctx); });
  safePhaseCall_(ctx, 'Phase5-GenerationalWealth', function() { processGenerationalWealth_(ctx); });
  safePhaseCall_(ctx, 'Phase5-EducationCareer', function() { processEducationCareer_(ctx); });
  safePhaseCall_(ctx, 'Phase5-Gentrification', function() { processGentrification_(ctx); });
  safePhaseCall_(ctx, 'Phase5-MigrationTracking', function() { processMigrationTracking_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  // NOTE: Phase 5 Tier-5 engines (HouseholdFormation, GenerationalWealth,
  // EducationCareer, MigrationTracking) historically used direct sheet
  // writes; the original Session-30 rationale was that subsequent engines
  // read from sheets updated by prior engines. Phase 42 §5.6 (S188) replaced
  // sheet-as-IPC with shared ctx.ledger (the chain still exists, but as
  // in-memory mutation). Cohort-C migration completed S200 (commits a829c7f,
  // ed25ea8, 7f95521, 93cd3a4). See PHASE_42_PATTERNS.md §5.6 + per-engine
  // file headers. Phase 6 engines below have their own write semantics —
  // not audited as part of S200 cohort-C work.
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
  // Arc lifecycle moved to Phase 8 (after v3PreloadContext_ loads eventArcs)
  // Was here as Phase6-ArcLifecycle — but arcs aren't loaded until Phase 8.
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
  // PHASE 6.5: PRE-PUBLICATION VALIDATION
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase6.5-Validation', function() {
    if (typeof runPrePublicationValidation_ === 'function') {
      var validationReport = runPrePublicationValidation_(ctx);
      ctx.summary.validationReport = validationReport;
      Logger.log('Phase 6.5: Validation complete - ' + validationReport.overallStatus);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 7: EVENING + MEDIA SYSTEMS
  // ═══════════════════════════════════════════════════════════
  // Phase 7 ordering: producers before consumers
  // CityEvents/Nightlife/Sports SET S.cityEvents, S.nightlife, S.nightlifeVolume, S.eveningSports
  // Food READS S.nightlifeVolume; Famous/EveningMedia READ S.eveningSports
  // CitySystems READS S.nightlife, S.eveningSports, S.cityEvents (all three)
  safePhaseCall_(ctx, 'Phase7-CityEvents', function() { buildCityEvents_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Nightlife', function() { buildNightlife_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Sports', function() { buildEveningSportsAndStreaming_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Food', function() { buildEveningFood_(ctx); });
  safePhaseCall_(ctx, 'Phase7-Famous', function() { buildEveningFamous_(ctx); });
  safePhaseCall_(ctx, 'Phase7-EveningMedia', function() { buildEveningMedia_(ctx); });
  safePhaseCall_(ctx, 'Phase7-CitySystems', function() { buildCityEveningSystems_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaPacket', function() { buildMediaPacket_(ctx); });
  safePhaseCall_(ctx, 'Phase7-MediaFeedback', function() { runMediaFeedbackEngine_(ctx); });
  safePhaseCall_(ctx, 'Phase7-SeasonalSeeds', function() { applySeasonalStorySeeds_(ctx); });
  safePhaseCall_(ctx, 'Phase7-ChaosWeights', function() { applyChaosCategoryWeights_(ctx); });
  safePhaseCall_(ctx, 'Phase7-StorySeeds', function() { applyStorySeeds_(ctx); });

  // ═══════════════════════════════════════════════════════════
  // PHASE 8: V3 INTEGRATION + CHICAGO
  // (CycleWeight SIGNAL moved here from Phase 9 so arc engine has the
  // weight/reason/score on ctx.summary. S237: was calling
  // applyCycleWeightForLatestCycle_ — wrapper that ALSO wrote to
  // Riley_Digest before Phase 10 had appended this cycle's row →
  // corrupted previous cycle's row via lastRow fallback. Wrapper +
  // file retired; direct call to applyCycleWeight_ gives the signal
  // with no side effects. writeDigest_ at Phase 10 now writes the
  // canonical cycle row including CycleWeight + Reason from
  // ctx.summary populated here.)
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase8-CycleWeightSignal', function() { applyCycleWeight_(ctx); });
  safePhaseCall_(ctx, 'Phase8-V3Preload', function() { v3PreloadContext_(ctx); });
  // Arc lifecycle runs here — after v3PreloadContext_ loads eventArcs into ctx.summary
  safePhaseCall_(ctx, 'Phase8-ArcLifecycle', function() { processArcLifecycle_(ctx); });
  safePhaseCall_(ctx, 'Phase8-StorylineStatus', function() { updateStorylineStatus_(ctx); });
  safePhaseCall_(ctx, 'Phase8-StorylineHealth', function() { monitorStorylineHealth_(ctx); });
  safePhaseCall_(ctx, 'Phase8-V3Integration', function() { v3Integration_(ctx); });
  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });
  // S229 DISABLED — Chicago Path B no-grow-legacy. See production entry point
  // comment block above for full rationale + reversibility note. Cycle-phases sister.
  // safePhaseCall_(ctx, 'Phase8-ChicagoCitizens', function() { generateChicagoCitizens_(ctx); });
  // v2.13: Compress LifeHistory into TraitProfiles for archetype-aware event generation
  safePhaseCall_(ctx, 'Phase9-CompressLifeHistory', function() { compressLifeHistory_(ctx); });
  safePhaseCall_(ctx, 'Phase9-FinalizePopulation', function() { finalizeWorldPopulation_(ctx); });
  safePhaseCall_(ctx, 'Phase9-EveningSnapshot', function() { snapshotEveningForCarryForward_(ctx); });
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
  // S229 DISABLED — sister of Phase8-ChicagoCitizens disable above (cycle-phases path).
  // safePhaseCall_(ctx, 'Phase10-Chicago', function() { saveV3Chicago_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CyclePacket', function() { buildCyclePacket_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaBriefing', function() { generateMediaBriefing_(ctx); });
  safePhaseCall_(ctx, 'Phase10-MediaLedger', function() { recordMediaLedger_(ctx); });
  safePhaseCall_(ctx, 'Phase10-CycleSeed', function() { saveCycleSeed_(ctx); });

  // Save evening snapshot for next cycle's citizen events
  safePhaseCall_(ctx, 'Phase10-EveningSnapshot', function() { saveEveningSnapshot_(ctx); });
  // Save cycle state for next cycle's analyzers (shock, pattern, recovery)
  safePhaseCall_(ctx, 'Phase10-CycleState', function() { savePreviousCycleState_(ctx); });
  // Phase 42 §5.6: consolidated Simulation_Ledger commit (matches runWorldCycle).
  safePhaseCall_(ctx, 'Phase10-CommitLedger', function() { commitSimulationLedger_(ctx); });
  // Execute all queued write intents (V3 persistence model)
  safePhaseCall_(ctx, 'Phase10-ExecuteIntents', function() { executePersistIntents_(ctx); });

  // v3.2 REMOVED: appendPopulationHistory_ (cache-flush ordering bug, no readers)

  // ═══════════════════════════════════════════════════════════
  // PHASE 11: MEDIA INTAKE — process any unprocessed intake rows
  // ═══════════════════════════════════════════════════════════
  safePhaseCall_(ctx, 'Phase11-MediaIntake', function() { processMediaIntake_(ctx); });

  // Flush cache
  if (ctx.cache) {
    try {
      ctx.cache.flush();
    } catch (e) {
      Logger.log('Cache flush error: ' + e.message);
    }
  }
}