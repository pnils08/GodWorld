/**
 * ============================================================================
 * V3.3 STORY SEEDS WRITER - Write-Intent Based
 * ============================================================================
 *
 * Writes seeds to Story_Seed_Deck sheet with full calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.4 Changes:
 * - Removed dead calendar columns (Season through SportsSeason)
 *   Calendar data is already in ctx.summary — sheet duplication was never read
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible
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
  'SeedText'         // H
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
      s.text || ''                      // H  SeedText
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

  Logger.log('saveV3Seeds_ v3.4: Queued ' + rows.length + ' seeds for cycle ' + cycle);
}


/**
 * ============================================================================
 * STORY SEED DECK REFERENCE v3.4
 * ============================================================================
 *
 * COLUMNS (8):
 * A   Timestamp
 * B   Cycle
 * C   SeedID
 * D   SeedType
 * E   Domain
 * F   Neighborhood
 * G   Priority
 * H   SeedText
 *
 * Note: Calendar columns (I-N) existed in v3.2-v3.3 but were never read.
 * Removed in v3.4. Existing rows retain historical data in cols I-N.
 *
 * ============================================================================
 */