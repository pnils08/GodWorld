/**
 * ============================================================================
 * v3Integration_ v3.5
 * ============================================================================
 *
 * Executes all V3 modules in correct order.
 * Safe function checks that handle undefined functions.
 *
 * v3.5 Enhancements:
 * - SECURITY: Removed eval() - now uses function registry pattern
 * - Function lookup via V3_FUNCTIONS object instead of dynamic eval
 *
 * v3.4 Enhancements:
 * - Built-in engine wrappers for economicRipple, mediaFeedback, bond engines
 * - No more "is not defined" errors for these engines
 *
 * v3.3 Features:
 * - Version alignment with GodWorld Calendar v1.0 ecosystem
 * - Calendar context debug logging
 * - Calendar validation check
 *
 * Previous features (v3.2):
 * - Safe function calls with error handling
 * - Ordered module execution
 * - New arc generation and merging
 * 
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════════════════
// v3.4: ENGINE WRAPPERS
// These bridge v3Integration naming to your actual function names
// ═══════════════════════════════════════════════════════════════════════════

function economicRippleEngine_(ctx) {
  if (typeof runEconomicRippleEngine_ === 'function') {
    return runEconomicRippleEngine_(ctx);
  }
}

function mediaFeedbackEngine_(ctx) {
  if (typeof runMediaFeedbackEngine_ === 'function') {
    return runMediaFeedbackEngine_(ctx);
  }
}

function bondEngine_(ctx) {
  if (typeof runBondEngine_ === 'function') {
    return runBondEngine_(ctx);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN INTEGRATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function v3Integration_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;
  S.cycleId = (ctx.config ? ctx.config.cycleCount : 0) || S.cycleId || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.3: CALENDAR CONTEXT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    season: S.season || 'unknown'
  };

  Logger.log('v3Integration v3.4: Cycle ' + S.cycleId + 
    ' | Calendar: ' + calendarContext.holiday + ' (' + calendarContext.holidayPriority + ')' +
    ' | FirstFriday: ' + calendarContext.isFirstFriday + 
    ' | CreationDay: ' + calendarContext.isCreationDay + 
    ' | Sports: ' + calendarContext.sportsSeason);

  // Function registry - maps names to actual functions (replaces eval for security)
  var V3_FUNCTIONS = {
    // engine.72 G-EC55: eventArcEngine_ slot REMOVED — arc loop retired S313
    // (Mike-direct, b6897a08: stories are seeded, never re-ingested).
    // generateNewArcs_ was deleted in that commit; eventArcEngine_ only
    // updated arcs that no longer generate, so it no-oped every cycle and
    // made the module count lie ("7/8"). Same disable pattern as the
    // engine.57 P5 bondEngine_ removal below. File retained for reversibility.
    'domainTracker_': typeof domainTracker_ === 'function' ? domainTracker_ : null,
    'storyHookEngine_': typeof storyHookEngine_ === 'function' ? storyHookEngine_ : null,
    'textureTriggerEngine_': typeof textureTriggerEngine_ === 'function' ? textureTriggerEngine_ : null,
    'chicagoSatelliteEngine_': typeof chicagoSatelliteEngine_ === 'function' ? chicagoSatelliteEngine_ : null,
    'economicRippleEngine_': typeof economicRippleEngine_ === 'function' ? economicRippleEngine_ : null,
    'mediaFeedbackEngine_': typeof mediaFeedbackEngine_ === 'function' ? mediaFeedbackEngine_ : null
    // engine.57 P5: bondEngine_ REMOVED — it already runs at Phase5-Bonds
    // (godWorldEngine2 L306/L1852); this second run re-rolled bond detection
    // with empty sources every cycle (the S318 audit's double-run).
  };

  // Helper for safe function calls (no eval - uses registry lookup)
  var safeCall = function(fnName) {
    try {
      var fn = V3_FUNCTIONS[fnName];
      if (typeof fn === 'function') {
        fn(ctx);
        return true;
      }
    } catch (e) {
      Logger.log('v3Integration: ' + fnName + ' skipped or error: ' + e.message);
    }
    return false;
  };

  // v3.4: Track which modules ran
  var modulesRan = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // V3 MODULE EXECUTION ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Arc update — RETIRED S313 (engine.72 G-EC55: slot removed, see registry note)

  // 2. Domain mapping
  if (safeCall('domainTracker_')) modulesRan.push('domainTracker');

  // 3. Story hooks
  if (safeCall('storyHookEngine_')) modulesRan.push('storyHookEngine');

  // 4. Texture triggers
  if (safeCall('textureTriggerEngine_')) modulesRan.push('textureTriggerEngine');

  // 5. Chicago snapshot
  if (safeCall('chicagoSatelliteEngine_')) modulesRan.push('chicagoSatelliteEngine');

  // 6. Economic ripple effects (v3.4: now has wrapper)
  if (safeCall('economicRippleEngine_')) modulesRan.push('economicRippleEngine');

  // 7. Media feedback loop (v3.4: now has wrapper)
  if (safeCall('mediaFeedbackEngine_')) modulesRan.push('mediaFeedbackEngine');

  // 8. Bond engine — engine.57 P5: no longer runs here (double-run fix).
  // Phase5-Bonds is the single run; see godWorldEngine2.

  // 9-10. New-arc generation + merge — RETIRED S313 (generateNewArcs_ deleted
  // in b6897a08; the typeof guard here silently skipped forever — engine.72
  // G-EC55). S.eventArcs stays initialized: 27 downstream readers expect the
  // array and run correctly at length 0.
  if (!S.eventArcs) S.eventArcs = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.4: INTEGRATION STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  S.v3IntegrationComplete = true;
  S.v3CalendarContext = calendarContext;
  S.v3ModulesRan = modulesRan;

  // Log summary - ES5 compatible arc count
  var arcCount = 0;
  if (S.eventArcs) {
    for (var ai = 0; ai < S.eventArcs.length; ai++) {
      var arc = S.eventArcs[ai];
      if (arc && arc.phase !== 'resolved') arcCount++;
    }
  }
  var textureCount = S.textureTriggers ? S.textureTriggers.length : 0;
  var domainCount = S.domainPresence ? Object.keys(S.domainPresence).length : 0;
  var rippleCount = S.economicRipples ? S.economicRipples.length : 0;
  var bondCount = S.relationshipBonds ? S.relationshipBonds.length : 0;

  Logger.log('v3Integration v3.4: Complete | Modules: ' + modulesRan.length + '/' + Object.keys(V3_FUNCTIONS).length + ' | Arcs: ' + arcCount + ' | Textures: ' + textureCount + ' | Domains: ' + domainCount + ' | Ripples: ' + rippleCount + ' | Bonds: ' + bondCount);

  ctx.summary = S;
}


/**
 * ============================================================================
 * V3 INTEGRATION REFERENCE v3.4
 * ============================================================================
 * 
 * v3.4 CHANGES:
 * - Added wrapper functions for:
 *   - economicRippleEngine_() → runEconomicRippleEngine_()
 *   - mediaFeedbackEngine_() → runMediaFeedbackEngine_()
 *   - bondEngine_() → runBondEngine_()
 * - Module tracking (S.v3ModulesRan)
 * - Enhanced logging with ripple and bond counts
 * - ES5 syntax compatibility
 * 
 * EXECUTION ORDER:
 * 1. eventArcEngine_ - Update existing arcs (phase + tension)
 * 2. domainTracker_ - Domain presence mapping
 * 3. storyHookEngine_ - Story hook generation
 * 4. textureTriggerEngine_ - Environmental texture triggers
 * 5. chicagoSatelliteEngine_ - Chicago satellite data
 * 6. economicRippleEngine_ - Economic ripple effects (→ runEconomicRippleEngine_)
 * 7. mediaFeedbackEngine_ - Media feedback loop (→ runMediaFeedbackEngine_)
 * 8. bondEngine_ - Citizen relationships (→ runBondEngine_)
 * 9. generateNewArcs_ - Generate new story arcs
 * 10. Merge new arcs into ctx.summary.eventArcs
 * 
 * CALENDAR CONTEXT (v3.3+):
 * Reads from ctx.summary:
 * - holiday, holidayPriority
 * - isFirstFriday, isCreationDay
 * - sportsSeason, season
 * 
 * Stores in ctx.summary:
 * - v3CalendarContext (for downstream reference)
 * - v3ModulesRan (array of modules that executed)
 * 
 * DEBUG OUTPUT:
 * - Calendar state at integration start
 * - Module counts at integration end
 * - Ripple and bond counts
 * 
 * ============================================================================
 */