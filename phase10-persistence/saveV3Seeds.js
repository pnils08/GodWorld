/**
 * ============================================================================
 * V3.2 STORY SEEDS WRITER
 * ============================================================================
 *
 * Writes seeds to Story_Seed_Deck sheet with full calendar context.
 *
 * v3.2 Enhancements:
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

function saveV3Seeds_(ctx) {
  const ss = ctx.ss;
  const seeds = ctx.summary.storySeeds || [];

  if (!seeds.length) return;

  const headers = [
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

  const sheet = ensureSheet_(ss, 'Story_Seed_Deck', headers);

  const S = ctx.summary;
  const cycle = ctx.config.cycleCount || S.cycleId;
  const now = ctx.now || new Date();

  // v3.2: Calendar context
  const season = S.season || '';
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  const rows = seeds.map(s => [
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

  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  
  Logger.log('saveV3Seeds_ v3.2: Saved ' + rows.length + ' seeds | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
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