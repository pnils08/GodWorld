/**
 * ============================================================================
 * ARC LIFECYCLE ENGINE v1.2 (Week 2: Arc Automation)
 * ============================================================================
 *
 * Automates arc phase progression and resolution tracking.
 *
 * LIFECYCLE PHASES:
 * 1. seed → 2. opening → 3. building → 4. climax → 5. resolution
 *
 * PHASE DURATIONS (default):
 * - seed: 2-3 cycles
 * - opening: 3-5 cycles
 * - building: 4-8 cycles
 * - climax: 2-4 cycles
 * - resolution: 1-2 cycles
 *
 * TENSION MECHANICS:
 * - Tension builds during building/climax phases
 * - Tension decays slowly over time (TensionDecay rate)
 * - Events/media can spike tension
 * - Resolution occurs when tension resolves or time expires
 *
 * INTEGRATION:
 * - Called from Phase 06 (analysis) in godWorldEngine2.js
 * - Updates Event_Arc_Ledger (sole source — Arc_Ledger is legacy/dead)
 * - Generates story hooks for phase transitions
 *
 * v1.2 Changes:
 * - Replaced Math.random() with deterministic ctx.rng in advanceArcPhase_
 *
 * v1.1 Changes:
 * - Removed Arc_Ledger dependency (dead sheet, had ArcID/ArcId case mismatch)
 * - All reads/writes use Event_Arc_Ledger only
 * - Requires lifecycle columns: AutoAdvance, PhaseStartCycle, PhaseDuration,
 *   NextPhaseTransition, TensionDecay (run addArcLifecycleColumns.js to add)
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var PHASE_ORDER = ['seed', 'opening', 'building', 'climax', 'resolution'];

var DEFAULT_PHASE_DURATIONS = {
  'seed': { min: 2, max: 3 },
  'opening': { min: 3, max: 5 },
  'building': { min: 4, max: 8 },
  'climax': { min: 2, max: 4 },
  'resolution': { min: 1, max: 2 }
};

var TENSION_DECAY_RATES = {
  'seed': 0.05,       // Slow decay during setup
  'opening': 0.08,    // Moderate decay as story unfolds
  'building': 0.03,   // Minimal decay - tension building
  'climax': 0.02,     // Very minimal decay - peak tension
  'resolution': 0.15  // Fast decay as story resolves
};

var RESOLUTION_TRIGGERS = {
  TENSION_RESOLVED: 'tension_resolved',      // Tension < 2.0
  TIME_EXPIRED: 'time_expired',             // Max phase duration exceeded
  MANUAL: 'manual',                         // Manually resolved
  CRISIS_ENDED: 'crisis_ended',             // Crisis event ended
  INITIATIVE_PASSED: 'initiative_passed',    // Related initiative resolved
  STORYLINE_CLOSED: 'storyline_closed'      // Related storyline closed
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Advances all active arcs through their lifecycle phases.
 * Called from Phase 06 in godWorldEngine2.js.
 *
 * @param {Object} ctx - Engine context
 */
function advanceArcLifecycles_(ctx) {
  if (!ctx || !ctx.summary) return;

  var S = ctx.summary;
  var cycle = S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  Logger.log('advanceArcLifecycles_ v1.2: Processing arcs for cycle ' + cycle);

  var results = {
    processed: 0,
    advanced: 0,
    resolved: 0,
    tensionDecayed: 0,
    errors: []
  };

  try {
    // Get active arcs from context
    var arcs = S.eventArcs || [];
    if (arcs.length === 0) {
      Logger.log('advanceArcLifecycles_: No arcs found in context');
      return results;
    }

    // Load Event_Arc_Ledger (sole source for arc lifecycle tracking)
    var ss = ctx.ss;
    if (!ss) {
      Logger.log('advanceArcLifecycles_: No spreadsheet in context');
      return results;
    }

    var ledger = loadEventArcLedger_(ss);

    // Process each arc
    for (var i = 0; i < arcs.length; i++) {
      var arc = arcs[i];
      if (!arc || !arc.arcId) continue;

      results.processed++;

      var arcResult = processArcLifecycle_(ctx, arc, cycle, ledger);

      results.advanced += arcResult.advanced ? 1 : 0;
      results.resolved += arcResult.resolved ? 1 : 0;
      results.tensionDecayed += arcResult.tensionDecayed ? 1 : 0;

      if (arcResult.error) {
        results.errors.push(arcResult.error);
      }
    }

    S.arcLifecycleResults = results;

    Logger.log('advanceArcLifecycles_ v1.2: Complete. ' +
      'Processed: ' + results.processed +
      ', Advanced: ' + results.advanced +
      ', Resolved: ' + results.resolved +
      ', Tension decayed: ' + results.tensionDecayed);

  } catch (e) {
    Logger.log('advanceArcLifecycles_ ERROR: ' + e.message);
    results.errors.push(e.message);
  }

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// LEDGER LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadEventArcLedger_(ss) {
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  if (!sheet) return { sheet: null, data: [], headers: [], map: {} };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var map = {};

  var arcIdCol = headers.indexOf('ArcId');
  if (arcIdCol < 0) return { sheet: sheet, data: data, headers: headers, map: map };

  for (var i = 1; i < data.length; i++) {
    var arcId = data[i][arcIdCol];
    if (arcId) {
      map[arcId] = i;
    }
  }

  return { sheet: sheet, data: data, headers: headers, map: map };
}


// ════════════════════════════════════════════════════════════════════════════
// ARC PROCESSING
// ════════════════════════════════════════════════════════════════════════════

function processArcLifecycle_(ctx, arc, cycle, ledger) {
  var result = {
    advanced: false,
    resolved: false,
    tensionDecayed: false,
    error: null
  };

  // Find arc in ledger
  var arcRow = ledger.map[arc.arcId];

  if (arcRow === undefined) {
    result.error = 'Arc not found in Event_Arc_Ledger: ' + arc.arcId;
    return result;
  }

  var arcData = ledger.data[arcRow];
  var headers = ledger.headers;

  // Get lifecycle columns
  var phaseCol = headers.indexOf('Phase');
  var autoAdvanceCol = headers.indexOf('AutoAdvance');
  var phaseStartCol = headers.indexOf('PhaseStartCycle');
  var phaseDurationCol = headers.indexOf('PhaseDuration');
  var nextTransitionCol = headers.indexOf('NextPhaseTransition');
  var tensionDecayCol = headers.indexOf('TensionDecay');
  var tensionCol = headers.indexOf('Tension');

  if (autoAdvanceCol < 0 || phaseCol < 0) {
    result.error = 'Lifecycle columns not found in Event_Arc_Ledger. Run addArcLifecycleColumns.js first.';
    return result;
  }

  // Check if auto-advance is enabled
  var autoAdvance = String(arcData[autoAdvanceCol]).toLowerCase();
  if (autoAdvance !== 'yes' && autoAdvance !== 'true') {
    return result; // Skip manual arcs
  }

  var currentPhase = String(arcData[phaseCol] || 'seed').toLowerCase();
  var phaseStartCycle = Number(arcData[phaseStartCol]) || cycle;
  var phaseDuration = Number(arcData[phaseDurationCol]) || 0;
  var nextTransition = Number(arcData[nextTransitionCol]) || 0;
  var tensionDecayRate = Number(arcData[tensionDecayCol]) || TENSION_DECAY_RATES[currentPhase] || 0.1;
  var tension = Number(arcData[tensionCol]) || 5.0;

  // Skip if already resolved
  if (currentPhase === 'resolved') {
    return result;
  }

  // Initialize phase tracking if needed
  if (phaseStartCycle === 0 || !phaseStartCycle) {
    phaseStartCycle = cycle;
    ledger.sheet.getRange(arcRow + 1, phaseStartCol + 1).setValue(cycle);
  }

  // Calculate current phase duration
  phaseDuration = cycle - phaseStartCycle;
  ledger.sheet.getRange(arcRow + 1, phaseDurationCol + 1).setValue(phaseDuration);

  // Apply tension decay
  if (tension > 0) {
    var decayAmount = tension * tensionDecayRate;
    var newTension = Math.max(0, tension - decayAmount);
    newTension = Math.round(newTension * 100) / 100;

    if (newTension !== tension) {
      ledger.sheet.getRange(arcRow + 1, tensionCol + 1).setValue(newTension);
      arc.tension = newTension; // Update context
      result.tensionDecayed = true;
    }

    tension = newTension;
  }

  // Check for resolution triggers
  var resolutionTrigger = checkResolutionTriggers_(ctx, arc, tension, currentPhase, phaseDuration);
  if (resolutionTrigger) {
    resolveArc_(ctx, arc, cycle, resolutionTrigger, ledger);
    result.resolved = true;
    return result;
  }

  // Check if it's time to advance phase
  if (shouldAdvancePhase_(currentPhase, phaseDuration, tension, nextTransition, cycle)) {
    var nextPhase = getNextPhase_(currentPhase);
    if (nextPhase) {
      advanceArcPhase_(ctx, arc, cycle, currentPhase, nextPhase, ledger);
      result.advanced = true;
    }
  }

  return result;
}


// ════════════════════════════════════════════════════════════════════════════
// PHASE ADVANCEMENT
// ════════════════════════════════════════════════════════════════════════════

function shouldAdvancePhase_(currentPhase, phaseDuration, tension, nextTransition, cycle) {
  // If next transition cycle is set and reached, advance
  if (nextTransition > 0 && cycle >= nextTransition) {
    return true;
  }

  // Check duration thresholds
  var durations = DEFAULT_PHASE_DURATIONS[currentPhase];
  if (!durations) return false;

  // Advance if minimum duration met AND (max duration reached OR tension threshold met)
  var minMet = phaseDuration >= durations.min;
  var maxReached = phaseDuration >= durations.max;

  // Phase-specific advancement logic
  if (currentPhase === 'seed') {
    // Seed advances when setup complete (min duration)
    return phaseDuration >= durations.max;
  } else if (currentPhase === 'opening') {
    // Opening advances when tension starts building (>3.0) or max duration
    return minMet && (tension >= 3.0 || maxReached);
  } else if (currentPhase === 'building') {
    // Building advances when tension peaks (>7.0) or max duration
    return minMet && (tension >= 7.0 || maxReached);
  } else if (currentPhase === 'climax') {
    // Climax advances to resolution after peak tension subsides or max duration
    return minMet && (tension < 6.0 || maxReached);
  } else if (currentPhase === 'resolution') {
    // Resolution completes when tension resolved or max duration
    return tension < 2.0 || maxReached;
  }

  return false;
}


function getNextPhase_(currentPhase) {
  var currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex < 0 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}


function advanceArcPhase_(ctx, arc, cycle, oldPhase, newPhase, ledger) {
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  var arcRow = ledger.map[arc.arcId];
  var headers = ledger.headers;

  var phaseCol = headers.indexOf('Phase');
  var phaseStartCol = headers.indexOf('PhaseStartCycle');
  var phaseDurationCol = headers.indexOf('PhaseDuration');
  var nextTransitionCol = headers.indexOf('NextPhaseTransition');
  var tensionDecayCol = headers.indexOf('TensionDecay');

  // Update phase
  ledger.sheet.getRange(arcRow + 1, phaseCol + 1).setValue(newPhase);

  // Reset phase tracking
  ledger.sheet.getRange(arcRow + 1, phaseStartCol + 1).setValue(cycle);
  ledger.sheet.getRange(arcRow + 1, phaseDurationCol + 1).setValue(0);

  // Set next transition (random within duration range)
  var durations = DEFAULT_PHASE_DURATIONS[newPhase];
  if (durations) {
    var transitionCycle = cycle + durations.min + Math.floor(rng() * (durations.max - durations.min + 1));
    ledger.sheet.getRange(arcRow + 1, nextTransitionCol + 1).setValue(transitionCycle);
  }

  // Update tension decay rate for new phase
  var newDecayRate = TENSION_DECAY_RATES[newPhase] || 0.1;
  ledger.sheet.getRange(arcRow + 1, tensionDecayCol + 1).setValue(newDecayRate);

  // Update context
  arc.phase = newPhase;

  // Generate story hook for phase transition
  generatePhaseTransitionHook_(ctx, arc, oldPhase, newPhase);

  Logger.log('advanceArcPhase_: ' + arc.arcId + ' advanced from ' + oldPhase + ' → ' + newPhase);
}


// ════════════════════════════════════════════════════════════════════════════
// RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

function checkResolutionTriggers_(ctx, arc, tension, currentPhase, phaseDuration) {
  // Tension fully resolved
  if (tension < 1.0 && currentPhase !== 'seed') {
    return RESOLUTION_TRIGGERS.TENSION_RESOLVED;
  }

  // Time expired in resolution phase
  if (currentPhase === 'resolution') {
    var durations = DEFAULT_PHASE_DURATIONS.resolution;
    if (phaseDuration >= durations.max) {
      return RESOLUTION_TRIGGERS.TIME_EXPIRED;
    }
  }

  // Check for external resolution triggers
  // (Future: integrate with initiative votes, crisis events, etc.)

  return null;
}


function resolveArc_(ctx, arc, cycle, trigger, ledger) {
  var arcRow = ledger.map[arc.arcId];
  var headers = ledger.headers;

  // Update phase to resolved
  var phaseCol = headers.indexOf('Phase');
  if (phaseCol >= 0) {
    ledger.sheet.getRange(arcRow + 1, phaseCol + 1).setValue('resolved');
  }

  // Update resolution columns
  var resTriggerCol = headers.indexOf('ResolutionTrigger');
  var resCycleCol = headers.indexOf('ResolutionCycle');
  var resNotesCol = headers.indexOf('ResolutionNotes');
  // Also try the existing column names in the sheet
  if (resTriggerCol < 0) resTriggerCol = headers.indexOf('ResolutionType');

  if (resTriggerCol >= 0) {
    ledger.sheet.getRange(arcRow + 1, resTriggerCol + 1).setValue(trigger);
  }
  if (resCycleCol >= 0) {
    ledger.sheet.getRange(arcRow + 1, resCycleCol + 1).setValue(cycle);
  }
  if (resNotesCol >= 0) {
    var notes = 'Arc resolved via ' + trigger + ' at cycle ' + cycle;
    ledger.sheet.getRange(arcRow + 1, resNotesCol + 1).setValue(notes);
  }

  // Update context
  arc.phase = 'resolved';

  // Generate resolution story hook
  generateResolutionHook_(ctx, arc, trigger);

  Logger.log('resolveArc_: ' + arc.arcId + ' resolved via ' + trigger);
}


// ════════════════════════════════════════════════════════════════════════════
// STORY HOOK GENERATION
// ════════════════════════════════════════════════════════════════════════════

function generatePhaseTransitionHook_(ctx, arc, oldPhase, newPhase) {
  if (!ctx.summary.storyHooks) {
    ctx.summary.storyHooks = [];
  }

  var severity = 5; // Default
  if (newPhase === 'climax') severity = 7;
  if (newPhase === 'resolution') severity = 6;

  var hook = {
    hookType: 'ARC_PHASE_TRANSITION',
    arcId: arc.arcId,
    arcType: arc.type || 'arc',
    oldPhase: oldPhase,
    newPhase: newPhase,
    tension: arc.tension || 0,
    severity: severity,
    description: 'Arc "' + (arc.name || arc.arcId) + '" advanced from ' + oldPhase + ' to ' + newPhase
  };

  ctx.summary.storyHooks.push(hook);
}


function generateResolutionHook_(ctx, arc, trigger) {
  if (!ctx.summary.storyHooks) {
    ctx.summary.storyHooks = [];
  }

  var hook = {
    hookType: 'ARC_RESOLVED',
    arcId: arc.arcId,
    arcType: arc.type || 'arc',
    resolutionTrigger: trigger,
    severity: 7,
    description: 'Arc "' + (arc.name || arc.arcId) + '" resolved via ' + trigger
  };

  ctx.summary.storyHooks.push(hook);
}


/**
 * ============================================================================
 * ARC LIFECYCLE ENGINE REFERENCE v1.2
 * ============================================================================
 *
 * SHEET: Event_Arc_Ledger (sole source — Arc_Ledger is legacy/dead)
 *
 * REQUIRED COLUMNS (run addArcLifecycleColumns.js if missing):
 * - Phase, Tension (exist)
 * - AutoAdvance, PhaseStartCycle, PhaseDuration, NextPhaseTransition,
 *   TensionDecay (lifecycle columns — must be added)
 *
 * PHASE PROGRESSION:
 * seed (2-3 cycles) → opening (3-5) → building (4-8) → climax (2-4) → resolution (1-2)
 *
 * ADVANCEMENT TRIGGERS:
 * - seed → opening: Max duration reached
 * - opening → building: Tension ≥3.0 OR max duration
 * - building → climax: Tension ≥7.0 OR max duration
 * - climax → resolution: Tension <6.0 OR max duration
 * - resolution → resolved: Tension <2.0 OR max duration
 *
 * TENSION DECAY RATES:
 * - seed: 5% per cycle
 * - opening: 8% per cycle
 * - building: 3% per cycle (tension building)
 * - climax: 2% per cycle (peak tension)
 * - resolution: 15% per cycle (fast resolution)
 *
 * RESOLUTION TRIGGERS:
 * - tension_resolved: Tension <1.0
 * - time_expired: Max duration exceeded
 * - manual: Manually resolved
 * - crisis_ended: Related crisis ended
 * - initiative_passed: Related initiative resolved
 * - storyline_closed: Related storyline closed
 *
 * STORY HOOKS GENERATED:
 * - ARC_PHASE_TRANSITION: When arc advances to new phase
 * - ARC_RESOLVED: When arc completes
 *
 * INTEGRATION:
 * - Called from Phase 06 (analysis) in godWorldEngine2.js
 * - After eventArcEngine_ but before digest generation
 *
 * ============================================================================
 */
