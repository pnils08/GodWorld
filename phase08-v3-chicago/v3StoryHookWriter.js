/**
 * ============================================================================
 * V3.3 STORY HOOK WRITER - Write-Intent Based
 * ============================================================================
 *
 * Writes hooks to Story_Hook_Deck sheet with calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.4 Changes:
 * - Removed dead calendar columns (Holiday through CalendarTrigger)
 *   Calendar data is already in ctx.summary — sheet duplication was never read
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, arrow functions, .map())
 *
 * Previous features (v3.1):
 * - Hook type, domain, neighborhood
 * - Priority and linked arc tracking
 * - Suggested desks
 *
 * ============================================================================
 */

var HOOK_DECK_HEADERS = [
  'Timestamp',        // A
  'Cycle',            // B
  'HookID',           // C
  'HookType',         // D
  'Domain',           // E
  'Neighborhood',     // F
  'Priority',         // G
  'HookText',         // H
  'LinkedArcID',      // I
  'SuggestedDesks'    // J
];


function saveV3Hooks_(ctx) {
  var ss = ctx.ss;
  var hooks = ctx.summary.storyHooks || [];

  if (!hooks.length) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Ensure sheet exists with headers
  var sheet = ensureSheet_(ss, 'Story_Hook_Deck', HOOK_DECK_HEADERS);

  var S = ctx.summary;
  var cycle = ctx.config.cycleCount || S.cycleId;
  var now = ctx.now || new Date();

  // Build rows (ES5 compatible)
  var rows = [];
  for (var i = 0; i < hooks.length; i++) {
    var h = hooks[i];
    rows.push([
      now,                              // A  Timestamp
      cycle,                            // B  Cycle
      h.hookId || '',                   // C  HookID
      h.hookType || 'signal',           // D  HookType
      h.domain || '',                   // E  Domain
      h.neighborhood || '',             // F  Neighborhood
      h.priority || 1,                  // G  Priority
      h.text || '',                     // H  HookText
      h.linkedArcId || '',              // I  LinkedArcID
      h.suggestedDesks || ''            // J  SuggestedDesks
    ]);
  }

  // Queue batch append intent
  queueBatchAppendIntent_(
    ctx,
    'Story_Hook_Deck',
    rows,
    'Save ' + rows.length + ' story hooks for cycle ' + cycle,
    'media',
    100
  );

  Logger.log('saveV3Hooks_ v3.4: Queued ' + rows.length + ' hooks for cycle ' + cycle);
}


/**
 * ============================================================================
 * STORY HOOK DECK SCHEMA v3.4
 * ============================================================================
 *
 * COLUMNS (10):
 * A - Timestamp
 * B - Cycle
 * C - HookID
 * D - HookType (signal, arc-driven, pattern, calendar, etc.)
 * E - Domain
 * F - Neighborhood
 * G - Priority (1-5)
 * H - HookText
 * I - LinkedArcID
 * J - SuggestedDesks
 *
 * Note: Calendar columns (K-P) existed in v3.2-v3.3 but were never read.
 * Removed in v3.4. Existing rows retain historical data in cols K-P.
 *
 * ============================================================================
 */
