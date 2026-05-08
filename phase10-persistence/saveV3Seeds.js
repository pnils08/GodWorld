/**
 * ============================================================================
 * V3.6 STORY SEEDS WRITER - Write-Intent Based
 * ============================================================================
 *
 * Writes seeds to Story_Seed_Deck sheet with full calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.6 Changes (S206 — Engine A persistence per routing-foundation plan T2.7):
 * - 3 new columns (M-O) for Engine A scoring: PriorityScore, ConsequenceFloor,
 *   PriorityComponents. Populated by applyStorySeeds.js v3.11 makeSeed; persisted
 *   here so /sift Step 2 + future Engine B can read priority signal from sheet.
 * - PriorityComponents written as JSON string (object: domainWeight, severityMul,
 *   arcMul, coverageMul, raw, clampApplied).
 * - Live sheet widened from 12 → 15 cols S206 via service-account direct write
 *   (ensureSheet_ does not extend existing sheets).
 *
 * v3.5 Changes:
 * - Seed metadata persistence: 4 new columns (I-L) for SuggestedJournalist,
 *   SuggestedAngle, VoiceGuidance, MatchConfidence. These were computed in
 *   applyStorySeeds.js but silently dropped at write time. Now persisted.
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
  'Timestamp',            // A
  'Cycle',                // B
  'SeedID',               // C
  'SeedType',             // D
  'Domain',               // E
  'Neighborhood',         // F
  'Priority',             // G
  'SeedText',             // H
  'SuggestedJournalist',  // I  (v3.5)
  'SuggestedAngle',       // J  (v3.5)
  'VoiceGuidance',        // K  (v3.5)
  'MatchConfidence',      // L  (v3.5)
  'PriorityScore',        // M  (v3.6 — Engine A composite 0-10)
  'ConsequenceFloor',     // N  (v3.6 — Engine A boolean: HEALTH/SAFETY/CIVIC top-domain bottom-floor)
  'PriorityComponents'    // O  (v3.6 — Engine A breakdown JSON: {domainWeight, severityMul, arcMul, coverageMul, raw, clampApplied})
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
      s.text || '',                     // H  SeedText
      s.suggestedJournalist || '',      // I  SuggestedJournalist (v3.5)
      s.suggestedAngle || '',           // J  SuggestedAngle (v3.5)
      s.voiceGuidance || '',            // K  VoiceGuidance (v3.5)
      s.matchConfidence || '',          // L  MatchConfidence (v3.5)
      // v3.6 (S206 — Engine A): defensive nulls handle pre-priorityEngine seeds
      // and degraded-mode runs where priorityEngine.js failed to load.
      s.priorityScore != null ? s.priorityScore : '',  // M  PriorityScore (v3.6)
      s.consequenceFloor === true,                     // N  ConsequenceFloor (v3.6) — boolean to sheet
      s.priorityComponents ? JSON.stringify(s.priorityComponents) : ''  // O  PriorityComponents JSON (v3.6)
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

  Logger.log('saveV3Seeds_ v3.6: Queued ' + rows.length + ' seeds for cycle ' + cycle);
}


/**
 * ============================================================================
 * STORY SEED DECK REFERENCE v3.6
 * ============================================================================
 *
 * COLUMNS (15):
 * A   Timestamp
 * B   Cycle
 * C   SeedID
 * D   SeedType
 * E   Domain
 * F   Neighborhood
 * G   Priority
 * H   SeedText
 * I   SuggestedJournalist (v3.5 — from rosterLookup matching)
 * J   SuggestedAngle (v3.5 — angle suggestion from story engine)
 * K   VoiceGuidance (v3.5 — how the journalist should approach the story)
 * L   MatchConfidence (v3.5 — none/low/medium/high)
 * M   PriorityScore (v3.6 — Engine A composite 0-10)
 * N   ConsequenceFloor (v3.6 — Engine A boolean: HEALTH/SAFETY/CIVIC top-domain bottom-floor)
 * O   PriorityComponents (v3.6 — Engine A breakdown JSON)
 *
 * Note: Calendar columns existed in v3.2-v3.3 (cols I-N) but were never read.
 * Removed in v3.4, columns I-L repurposed in v3.5 for seed metadata.
 * Cols M-O added v3.6 for Engine A scoring; live sheet widened S206 via
 * service-account direct write (ensureSheet_ does not extend existing sheets).
 * Pre-S206 rows may have stale calendar data in M-O if their dataset includes
 * pre-v3.4 rows that survived the cleanup.
 *
 * ============================================================================
 */