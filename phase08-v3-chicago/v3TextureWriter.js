/**
 * ============================================================================
 * V3.4 TEXTURE WRITER
 * ============================================================================
 *
 * Writes texture triggers to Texture_Trigger_Log sheet with calendar context.
 *
 * v3.4 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx
 * - for loops instead of .map()
 *
 * v3.3 Features:
 * - Hardened null guards for all fields
 * - Intensity normalization
 * - Cache layer support (uses ctx.cache.append if available)
 * - Aligned with textureTriggerEngine v3.3
 *
 * Previous features (v3.2):
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - Domain, neighborhood, texture key
 * - Reason and intensity tracking
 *
 * ============================================================================
 */

function saveV3Textures_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.ss) return;

  var ss = ctx.ss;
  var textures = (ctx.summary && ctx.summary.textureTriggers) ? ctx.summary.textureTriggers : [];
  if (!textures.length) return;

  var headers = [
    'Timestamp',        // A
    'Cycle',            // B
    'Domain',           // C
    'Neighborhood',     // D
    'TextureKey',       // E
    'Reason',           // F
    'Intensity',        // G
    'Holiday',          // H
    'HolidayPriority',  // I
    'FirstFriday',      // J
    'CreationDay',      // K
    'SportsSeason'      // L
  ];

  var sheet = ensureSheet_(ss, 'Texture_Trigger_Log', headers);

  var cycle = (ctx.config && ctx.config.cycleCount) || (ctx.summary && ctx.summary.cycleId) || 0;
  var now = ctx.now || new Date();

  // Calendar context with null guards
  var holiday = (ctx.summary && ctx.summary.holiday) || 'none';
  var holidayPriority = (ctx.summary && ctx.summary.holidayPriority) || 'none';
  var isFirstFriday = !!(ctx.summary && ctx.summary.isFirstFriday);
  var isCreationDay = !!(ctx.summary && ctx.summary.isCreationDay);
  var sportsSeason = (ctx.summary && ctx.summary.sportsSeason) || 'off-season';

  // Intensity normalization helper
  function normalizeIntensity(x) {
    var v = (x || 'moderate').toString().toLowerCase();
    if (v === 'low' || v === 'moderate' || v === 'high') return v;
    return 'moderate';
  }

  // Build rows (ES5 compatible)
  var rows = [];
  for (var ti = 0; ti < textures.length; ti++) {
    var t = textures[ti];
    rows.push([
      now,
      cycle,
      (t && t.domain) || 'GENERAL',
      (t && t.neighborhood) || '',
      (t && t.textureKey) || 'unknown_texture',
      (t && t.reason) || '',
      normalizeIntensity(t && t.intensity),
      holiday,
      holidayPriority,
      isFirstFriday,
      isCreationDay,
      sportsSeason
    ]);
  }

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Queue batch append intent
  queueBatchAppendIntent_(
    ctx,
    'Texture_Trigger_Log',
    rows,
    'Save ' + rows.length + ' texture triggers for cycle ' + cycle,
    'media',
    100
  );

  Logger.log('saveV3Textures_ v3.4: Queued ' + rows.length + ' textures | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
}


/**
 * ============================================================================
 * TEXTURE TRIGGER LOG SCHEMA v3.3
 * ============================================================================
 *
 * COLUMNS (12):
 * A - Timestamp
 * B - Cycle
 * C - Domain (WEATHER, FESTIVAL, HOLIDAY, ARTS, SPORTS, etc.)
 * D - Neighborhood (Oakland 12 neighborhoods or empty for citywide)
 * E - TextureKey (e.g., lion_dance_drums, gallery_crawl, championship_fever)
 * F - Reason (human-readable explanation)
 * G - Intensity (low, moderate, high)
 * H - Holiday
 * I - HolidayPriority
 * J - FirstFriday
 * K - CreationDay
 * L - SportsSeason
 *
 * QUERY EXAMPLES:
 * - All Pride textures: =FILTER(E:E, H:H="OaklandPride")
 * - First Friday textures: =FILTER(E:E, J:J=TRUE)
 * - High intensity holiday textures: =FILTER(E:E, (G:G="high")*(H:H<>"none"))
 * - Championship atmosphere: =FILTER(E:E, L:L="championship")
 * - Chinatown Lunar New Year: =FILTER(E:E, (D:D="Chinatown")*(H:H="LunarNewYear"))
 *
 * ============================================================================
 */
