/**
 * ============================================================================
 * V3.3 TEXTURE WRITER
 * ============================================================================
 *
 * Writes texture triggers to Texture_Trigger_Log sheet with calendar context.
 *
 * v3.3 Enhancements:
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
  const ss = ctx.ss;
  const textures = (ctx.summary && ctx.summary.textureTriggers) ? ctx.summary.textureTriggers : [];
  if (!textures.length) return;

  const headers = [
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

  const sheet = ensureSheet_(ss, 'Texture_Trigger_Log', headers);

  const cycle = (ctx.config && ctx.config.cycleCount) || (ctx.summary && ctx.summary.cycleId) || 0;
  const now = ctx.now || new Date();

  // Calendar context with null guards
  const holiday = (ctx.summary && ctx.summary.holiday) || 'none';
  const holidayPriority = (ctx.summary && ctx.summary.holidayPriority) || 'none';
  const isFirstFriday = !!(ctx.summary && ctx.summary.isFirstFriday);
  const isCreationDay = !!(ctx.summary && ctx.summary.isCreationDay);
  const sportsSeason = (ctx.summary && ctx.summary.sportsSeason) || 'off-season';

  // Intensity normalization helper
  const normalizeIntensity = function(x) {
    const v = (x || 'moderate').toString().toLowerCase();
    if (v === 'low' || v === 'moderate' || v === 'high') return v;
    return 'moderate';
  };

  const rows = textures.map(function(t) {
    return [
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
    ];
  });

  // Use cache append if available (batched writes)
  if (ctx.cache && typeof ctx.cache.append === 'function') {
    ctx.cache.append(sheet, rows);
    return;
  }

  // Fallback: direct sheet write
  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
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
