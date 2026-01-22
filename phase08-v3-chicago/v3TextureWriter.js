/**
 * ============================================================================
 * V3.2 TEXTURE WRITER
 * ============================================================================
 *
 * Writes texture triggers to Texture_Trigger_Log sheet with calendar context.
 *
 * v3.2 Enhancements:
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - Aligned with GodWorld Calendar v1.0 and textureTriggerEngine v3.2
 *
 * Previous features (v3.1):
 * - Domain, neighborhood, texture key
 * - Reason and intensity tracking
 * 
 * ============================================================================
 */

function saveV3Textures_(ctx) {
  const ss = ctx.ss;
  const textures = ctx.summary.textureTriggers || [];

  if (!textures.length) return;

  // v3.2: Expanded headers with calendar columns
  const headers = [
    'Timestamp',        // A
    'Cycle',            // B
    'Domain',           // C
    'Neighborhood',     // D
    'TextureKey',       // E
    'Reason',           // F
    'Intensity',        // G
    'Holiday',          // H (v3.2)
    'HolidayPriority',  // I (v3.2)
    'FirstFriday',      // J (v3.2)
    'CreationDay',      // K (v3.2)
    'SportsSeason'      // L (v3.2)
  ];

  const sheet = ensureSheet_(ss, 'Texture_Trigger_Log', headers);

  const cycle = ctx.config.cycleCount || ctx.summary.cycleId;
  const now = ctx.now || new Date();

  // v3.2: Get current calendar context
  const holiday = ctx.summary.holiday || 'none';
  const holidayPriority = ctx.summary.holidayPriority || 'none';
  const isFirstFriday = ctx.summary.isFirstFriday || false;
  const isCreationDay = ctx.summary.isCreationDay || false;
  const sportsSeason = ctx.summary.sportsSeason || 'off-season';

  const rows = textures.map(t => [
    now,
    cycle,
    t.domain,
    t.neighborhood,
    t.textureKey,
    t.reason,
    t.intensity || 'moderate',
    holiday,          // v3.2
    holidayPriority,  // v3.2
    isFirstFriday,    // v3.2
    isCreationDay,    // v3.2
    sportsSeason      // v3.2
  ]);

  // Safe append — handles empty sheet
  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}


/**
 * ============================================================================
 * TEXTURE TRIGGER LOG SCHEMA v3.2
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
 * H - Holiday (v3.2)
 * I - HolidayPriority (v3.2)
 * J - FirstFriday (v3.2)
 * K - CreationDay (v3.2)
 * L - SportsSeason (v3.2)
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