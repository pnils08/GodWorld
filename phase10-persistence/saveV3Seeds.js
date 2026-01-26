/**
 * ============================================================================
 * V3.3 STORY SEEDS WRITER - Write-Intent Based
 * ============================================================================
 *
 * Writes seeds to Story_Seed_Deck sheet with full calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible
 *
 * v3.2 Features (preserved):
 * - Season column
 * - Holiday column
 * - HolidayPriority column
 * - IsFirstFriday column
 * - IsCreationDay column
 * - SportsSeason column
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.1):
 * - 8 columns for seed tracking
 * - Domain, neighborhood, priority
 *
 * ============================================================================
 */

var SEED_DECK_HEADERS = [
  'Timestamp',       // A
  'Cycle',           // B
  'SeedID',          // C
  'SeedType',        // D
  'Domain',          // E
  'Neighborhood',    // F
  'Priority',        // G
  'SeedText',        // H
  // v3.2: Calendar columns
  'Season',          // I
  'Holiday',         // J
  'HolidayPriority', // K
  'IsFirstFriday',   // L
  'IsCreationDay',   // M
  'SportsSeason'     // N
];


function saveV3Seeds_(ctx) {
  var ss = ctx.ss;
  var seeds = ctx.summary.storySeeds || [];

  if (!seeds.length) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Ensure sheet exists (still need this for header setup)
  var sheet = ensureSheet_(ss, 'Story_Seed_Deck', SEED_DECK_HEADERS);

  var S = ctx.summary;
  var cycle = ctx.config.cycleCount || S.cycleId;
  var now = ctx.now || new Date();

  // v3.2: Calendar context
  var season = S.season || '';
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Build rows
  var rows = [];
  for (var i = 0; i < seeds.length; i++) {
    var s = seeds[i];
    rows.push([
      now,                              // A  Timestamp
      cycle,                            // B  Cycle
      s.seedId || '',                   // C  SeedID
      s.seedType || 'signal',           // D  SeedType
      s.domain || '',                   // E  Domain
      s.neighborhood || '',             // F  Neighborhood
      s.priority || 1,                  // G  Priority
      s.text || '',                     // H  SeedText
      // v3.2: Calendar columns
      season,                           // I  Season
      holiday,                          // J  Holiday
      holidayPriority,                  // K  HolidayPriority
      isFirstFriday,                    // L  IsFirstFriday
      isCreationDay,                    // M  IsCreationDay
      sportsSeason                      // N  SportsSeason
    ]);
  }

  // Queue batch append intent
  queueBatchAppendIntent_(
    ctx,
    'Story_Seed_Deck',
    rows,
    'Save ' + rows.length + ' story seeds for cycle ' + cycle,
    'media',
    100
  );

  Logger.log('saveV3Seeds_ v3.3: Queued ' + rows.length + ' seeds | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
}


/**
 * upgradeStorySeedDeck_ v3.2
 * Adds calendar columns to existing Story_Seed_Deck sheet.
 * Run once to upgrade v3.1 sheets to v3.2 format.
 */
function upgradeStorySeedDeck_(ctx) {
  const ss = ctx.ss;
  const sheet = ss.getSheetByName('Story_Seed_Deck');
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if calendar columns exist
  const hasSeason = headers.includes('Season');

  if (!hasSeason) {
    // Add calendar columns
    const lastCol = sheet.getLastColumn();
    const newHeaders = ['Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason'];

    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');

    // Set defaults for existing rows
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const defaults = [];
      for (let i = 2; i <= lastRow; i++) {
        defaults.push(['', 'none', 'none', false, false, 'off-season']);
      }
      sheet.getRange(2, lastCol + 1, lastRow - 1, 6).setValues(defaults);
    }

    Logger.log('upgradeStorySeedDeck_ v3.2: Added 6 calendar columns to Story_Seed_Deck');
  }
}


/**
 * ============================================================================
 * STORY SEED DECK REFERENCE v3.2
 * ============================================================================
 * 
 * COLUMNS (14):
 * A   Timestamp
 * B   Cycle
 * C   SeedID
 * D   SeedType
 * E   Domain
 * F   Neighborhood
 * G   Priority
 * H   SeedText
 * I   Season (v3.2)
 * J   Holiday (v3.2)
 * K   HolidayPriority (v3.2)
 * L   IsFirstFriday (v3.2)
 * M   IsCreationDay (v3.2)
 * N   SportsSeason (v3.2)
 * 
 * ============================================================================
 */