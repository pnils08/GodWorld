/**
 * ============================================================================
 * CYCLE MODES - V3 Replay and Dry-Run Support
 * ============================================================================
 *
 * Implements V3 Architecture mode flags for deterministic cycle execution.
 *
 * MODES:
 * - dryRun: Full execution, writes staged but not committed
 * - replay: Re-run past cycleId with same seed, compare outputs
 * - strict: Throw on invariant violations (vs log-and-continue)
 * - profile: Capture phase timings in ctx.audit.phaseTimingsMs
 *
 * v1.0 Features:
 * - Mode initialization and configuration
 * - Seeded RNG for deterministic execution
 * - Replay cycle loader
 * - Output comparison utilities
 * - Cycle seed persistence
 *
 * Usage:
 *   // Dry-run mode
 *   initializeDryRunMode_(ctx);
 *   runWorldCycle();  // Intents logged, not executed
 *
 *   // Replay mode
 *   initializeReplayMode_(ctx, 75);  // Replay cycle 75
 *   runWorldCycle();  // Uses seed from cycle 75
 *
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════════════════
// SEEDED RNG - Deterministic Randomness
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a seeded random number generator.
 * Uses a simple LCG (Linear Congruential Generator).
 * @param {number} seed - The seed value (typically cycleId)
 * @returns {function} Function that returns 0-1 random values
 */
function seededRng_(seed) {
  var state = hashInt32_(seed);

  return function() {
    // LCG parameters (same as glibc)
    state = ((state * 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}


/**
 * Creates a named seeded RNG (for domain-specific randomness).
 * @param {number} seed - Base seed (typically cycleId)
 * @param {string} salt - Domain name for salting
 * @returns {function} Function that returns 0-1 random values
 */
function seededRngFor_(seed, salt) {
  var saltHash = hashString_(salt || 'default');
  var combinedSeed = seed ^ saltHash;
  return seededRng_(combinedSeed);
}


/**
 * Hash a 32-bit integer.
 */
function hashInt32_(x) {
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return x >>> 0;  // Convert to unsigned
}


/**
 * Hash a string to a 32-bit integer.
 */
function hashString_(str) {
  var hash = 0;
  if (!str || str.length === 0) return hash;

  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return hash >>> 0;  // Convert to unsigned
}


// ═══════════════════════════════════════════════════════════════════════════
// MODE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initializes ctx.mode with default values.
 */
function initializeModeFlags_(ctx) {
  ctx.mode = ctx.mode || {};
  ctx.mode.dryRun = ctx.mode.dryRun || false;
  ctx.mode.replay = ctx.mode.replay || false;
  ctx.mode.strict = ctx.mode.strict || false;
  ctx.mode.profile = ctx.mode.profile || false;
  ctx.mode.replayCycleId = ctx.mode.replayCycleId || null;

  return ctx;
}


/**
 * Initializes dry-run mode.
 * Full execution, writes staged but not committed.
 * @param {Object} ctx - Engine context
 */
function initializeDryRunMode_(ctx) {
  initializeModeFlags_(ctx);
  ctx.mode.dryRun = true;

  Logger.log('initializeDryRunMode_: Enabled dry-run mode - writes will be logged, not executed');
  return ctx;
}


/**
 * Initializes replay mode for a specific cycle.
 * @param {Object} ctx - Engine context
 * @param {number} cycleId - The cycle to replay
 */
function initializeReplayMode_(ctx, cycleId) {
  initializeModeFlags_(ctx);
  ctx.mode.replay = true;
  ctx.mode.replayCycleId = cycleId;

  // Load seed for the cycle
  var seedData = loadCycleSeed_(ctx.ss, cycleId);
  if (seedData) {
    ctx.replaySeed = seedData;
    ctx.rng = seededRng_(seedData.seed);
    Logger.log('initializeReplayMode_: Loaded seed for cycle ' + cycleId + ': ' + seedData.seed);
  } else {
    // No seed found, generate one from cycleId
    ctx.rng = seededRng_(cycleId);
    Logger.log('initializeReplayMode_: No stored seed for cycle ' + cycleId + ', using cycleId as seed');
  }

  Logger.log('initializeReplayMode_: Enabled replay mode for cycle ' + cycleId);
  return ctx;
}


/**
 * Initializes seeded RNG for the current cycle.
 * Call this at cycle start (Phase 0/1) for deterministic execution.
 * @param {Object} ctx - Engine context
 */
function initializeSeededRng_(ctx) {
  var cycleId = ctx.summary.cycleId || ctx.config.cycleCount || 1;
  var seed = cycleId;

  // If replaying, use stored seed
  if (ctx.mode && ctx.mode.replay && ctx.replaySeed) {
    seed = ctx.replaySeed.seed;
  }

  ctx.rng = seededRng_(seed);
  ctx.rngFor = function(salt) {
    return seededRngFor_(seed, salt);
  };

  // Store seed for replay capability
  ctx.cycleSeed = seed;

  Logger.log('initializeSeededRng_: Initialized RNG with seed ' + seed);
  return ctx;
}


// ═══════════════════════════════════════════════════════════════════════════
// CYCLE SEED PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

var CYCLE_SEEDS_HEADERS = [
  'CycleID',
  'Seed',
  'Timestamp',
  'Weather',
  'Holiday',
  'EventCount',
  'PopulationDelta',
  'Checksum'
];


/**
 * Saves the current cycle's seed and key outputs for replay.
 * @param {Object} ctx - Engine context
 */
function saveCycleSeed_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary;

  var cycleId = S.cycleId || ctx.config.cycleCount || 0;
  var seed = ctx.cycleSeed || cycleId;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Build checksum from key outputs
  var checksum = buildCycleChecksum_(ctx);

  var row = [
    cycleId,
    seed,
    ctx.now || new Date(),
    S.weather ? S.weather.type : '',
    S.holiday || 'none',
    S.worldEvents ? S.worldEvents.length : 0,
    S.worldPopulation ? S.worldPopulation.migration : 0,
    checksum
  ];

  // Ensure sheet exists
  var sheet = ensureSheet_(ss, 'Cycle_Seeds', CYCLE_SEEDS_HEADERS);

  // Queue append intent
  queueAppendIntent_(
    ctx,
    'Cycle_Seeds',
    row,
    'Save seed for cycle ' + cycleId,
    'audit',
    200
  );

  Logger.log('saveCycleSeed_: Queued seed ' + seed + ' for cycle ' + cycleId);
}


/**
 * Loads a cycle's seed from storage.
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cycleId - The cycle to load
 * @returns {Object|null} Seed data or null if not found
 */
function loadCycleSeed_(ss, cycleId) {
  var sheet = ss.getSheetByName('Cycle_Seeds');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var header = data[0];
  var col = function(name) { return header.indexOf(name); };

  var iCycle = col('CycleID');
  var iSeed = col('Seed');
  var iWeather = col('Weather');
  var iHoliday = col('Holiday');
  var iEvents = col('EventCount');
  var iPopDelta = col('PopulationDelta');
  var iChecksum = col('Checksum');

  var targetCycle = Number(cycleId);

  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][iCycle]) === targetCycle) {
      return {
        cycleId: targetCycle,
        seed: Number(data[i][iSeed]),
        weather: iWeather >= 0 ? data[i][iWeather] : '',
        holiday: iHoliday >= 0 ? data[i][iHoliday] : '',
        eventCount: iEvents >= 0 ? Number(data[i][iEvents]) : 0,
        populationDelta: iPopDelta >= 0 ? Number(data[i][iPopDelta]) : 0,
        checksum: iChecksum >= 0 ? data[i][iChecksum] : ''
      };
    }
  }

  return null;
}


/**
 * Builds a checksum from key cycle outputs.
 * Used to verify replay produces same results.
 */
function buildCycleChecksum_(ctx) {
  var S = ctx.summary;

  var parts = [
    S.weather ? S.weather.type : 'none',
    S.holiday || 'none',
    S.worldEvents ? S.worldEvents.length : 0,
    S.storySeeds ? S.storySeeds.length : 0,
    S.relationshipBonds ? S.relationshipBonds.length : 0,
    S.worldPopulation ? Math.round(S.worldPopulation.illnessRate * 1000) : 0
  ];

  return parts.join('|');
}


// ═══════════════════════════════════════════════════════════════════════════
// REPLAY COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compares replay output to original cycle.
 * @param {Object} ctx - Engine context (after replay execution)
 * @returns {Object} Comparison result
 */
function compareReplayOutput_(ctx) {
  if (!ctx.mode || !ctx.mode.replay || !ctx.mode.replayCycleId) {
    return { match: false, error: 'Not in replay mode' };
  }

  var originalSeed = loadCycleSeed_(ctx.ss, ctx.mode.replayCycleId);
  if (!originalSeed) {
    return { match: false, error: 'No original seed data found for cycle ' + ctx.mode.replayCycleId };
  }

  var currentChecksum = buildCycleChecksum_(ctx);
  var originalChecksum = originalSeed.checksum;

  var match = currentChecksum === originalChecksum;

  var result = {
    match: match,
    cycleId: ctx.mode.replayCycleId,
    originalChecksum: originalChecksum,
    currentChecksum: currentChecksum,
    differences: []
  };

  // Detail any differences
  if (!match) {
    var S = ctx.summary;

    if ((S.weather ? S.weather.type : 'none') !== originalSeed.weather) {
      result.differences.push('Weather: ' + originalSeed.weather + ' vs ' + (S.weather ? S.weather.type : 'none'));
    }

    if ((S.holiday || 'none') !== originalSeed.holiday) {
      result.differences.push('Holiday: ' + originalSeed.holiday + ' vs ' + (S.holiday || 'none'));
    }

    var eventCount = S.worldEvents ? S.worldEvents.length : 0;
    if (eventCount !== originalSeed.eventCount) {
      result.differences.push('EventCount: ' + originalSeed.eventCount + ' vs ' + eventCount);
    }
  }

  Logger.log('compareReplayOutput_: ' + (match ? 'MATCH' : 'MISMATCH') + ' for cycle ' + ctx.mode.replayCycleId);
  if (!match) {
    Logger.log('Differences: ' + result.differences.join(', '));
  }

  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// PROFILE MODE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initializes profile mode for phase timing capture.
 * @param {Object} ctx - Engine context
 */
function initializeProfileMode_(ctx) {
  initializeModeFlags_(ctx);
  ctx.mode.profile = true;

  ctx.audit = ctx.audit || {};
  ctx.audit.phaseTimingsMs = {};
  ctx.audit.phaseStartTime = null;

  Logger.log('initializeProfileMode_: Enabled profiling mode');
  return ctx;
}


/**
 * Records start time for a phase.
 * @param {Object} ctx - Engine context
 * @param {string} phaseName - Name of the phase
 */
function startPhaseTimer_(ctx, phaseName) {
  if (ctx.mode && ctx.mode.profile) {
    ctx.audit = ctx.audit || {};
    ctx.audit.phaseStartTime = new Date().getTime();
    ctx.audit.currentPhase = phaseName;
  }
}


/**
 * Records end time for a phase and stores duration.
 * @param {Object} ctx - Engine context
 * @param {string} phaseName - Name of the phase
 */
function endPhaseTimer_(ctx, phaseName) {
  if (ctx.mode && ctx.mode.profile && ctx.audit && ctx.audit.phaseStartTime) {
    var endTime = new Date().getTime();
    var duration = endTime - ctx.audit.phaseStartTime;

    ctx.audit.phaseTimingsMs = ctx.audit.phaseTimingsMs || {};
    ctx.audit.phaseTimingsMs[phaseName] = duration;

    ctx.audit.phaseStartTime = null;
    ctx.audit.currentPhase = null;
  }
}


/**
 * Gets a summary of phase timings.
 * @param {Object} ctx - Engine context
 * @returns {Object} Timing summary
 */
function getPhaseTimingSummary_(ctx) {
  if (!ctx.audit || !ctx.audit.phaseTimingsMs) {
    return { totalMs: 0, phases: {} };
  }

  var total = 0;
  var timings = ctx.audit.phaseTimingsMs;

  for (var phase in timings) {
    if (timings.hasOwnProperty(phase)) {
      total += timings[phase];
    }
  }

  return {
    totalMs: total,
    phases: timings
  };
}


/**
 * ============================================================================
 * CYCLE MODES REFERENCE v1.0
 * ============================================================================
 *
 * MODE FLAGS:
 * - dryRun: Log writes, don't execute
 * - replay: Re-run past cycle with same seed
 * - strict: Throw on invariant violations
 * - profile: Capture phase timings
 *
 * SEEDED RNG:
 * - ctx.rng() returns 0-1 random value
 * - ctx.rngFor('weather')() returns domain-specific random
 * - Same seed = same sequence
 *
 * REPLAY WORKFLOW:
 * 1. initializeReplayMode_(ctx, cycleId)
 * 2. Run cycle normally
 * 3. compareReplayOutput_(ctx) to check match
 *
 * DRY-RUN WORKFLOW:
 * 1. initializeDryRunMode_(ctx)
 * 2. Run cycle normally
 * 3. getIntentSummary_(ctx) to inspect planned writes
 *
 * SEED STORAGE:
 * - Cycle_Seeds sheet tracks: CycleID, Seed, key outputs, checksum
 * - saveCycleSeed_(ctx) at end of each cycle
 * - loadCycleSeed_(ss, cycleId) for replay
 *
 * ============================================================================
 */
