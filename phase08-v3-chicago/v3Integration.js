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
  
  const S = ctx.summary;
  S.cycleId = ctx.config.cycleCount || S.cycleId || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.3: CALENDAR CONTEXT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  const calendarContext = {
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
    'eventArcEngine_': typeof eventArcEngine_ === 'function' ? eventArcEngine_ : null,
    'domainTracker_': typeof domainTracker_ === 'function' ? domainTracker_ : null,
    'storyHookEngine_': typeof storyHookEngine_ === 'function' ? storyHookEngine_ : null,
    'textureTriggerEngine_': typeof textureTriggerEngine_ === 'function' ? textureTriggerEngine_ : null,
    'chicagoSatelliteEngine_': typeof chicagoSatelliteEngine_ === 'function' ? chicagoSatelliteEngine_ : null,
    'economicRippleEngine_': typeof economicRippleEngine_ === 'function' ? economicRippleEngine_ : null,
    'mediaFeedbackEngine_': typeof mediaFeedbackEngine_ === 'function' ? mediaFeedbackEngine_ : null,
    'bondEngine_': typeof bondEngine_ === 'function' ? bondEngine_ : null
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

  // 1. Update existing arcs (phase + tension)
  if (safeCall('eventArcEngine_')) modulesRan.push('eventArcEngine');

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

  // 8. Bond engine (citizen relationships) (v3.4: now has wrapper)
  if (safeCall('bondEngine_')) modulesRan.push('bondEngine');

  // 9. Generate new arcs
  var newArcs = [];
  try {
    if (typeof generateNewArcs_ === 'function') {
      newArcs = generateNewArcs_(ctx) || [];
      modulesRan.push('generateNewArcs');
    }
  } catch (e) {
    Logger.log('v3Integration: generateNewArcs_ error: ' + e.message);
  }

  // 10. Merge new arcs in-memory (no writes)
  if (!S.eventArcs) S.eventArcs = [];
  S.eventArcs = S.eventArcs.concat(newArcs);

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.4: INTEGRATION STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  S.v3IntegrationComplete = true;
  S.v3CalendarContext = calendarContext;
  S.v3ModulesRan = modulesRan;

  // Log summary
  var arcCount = S.eventArcs ? S.eventArcs.filter(function(a) { return a && a.phase !== 'resolved'; }).length : 0;
  var textureCount = S.textureTriggers ? S.textureTriggers.length : 0;
  var domainCount = S.domainPresence ? Object.keys(S.domainPresence).length : 0;
  var rippleCount = S.economicRipples ? S.economicRipples.length : 0;
  var bondCount = S.relationshipBonds ? S.relationshipBonds.length : 0;

  Logger.log('v3Integration v3.4: Complete | Modules: ' + modulesRan.length + '/8 | Arcs: ' + arcCount + ' | Textures: ' + textureCount + ' | Domains: ' + domainCount + ' | Ripples: ' + rippleCount + ' | Bonds: ' + bondCount);

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