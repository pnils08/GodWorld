/**
 * ============================================================================
 * V3.7 STORY SEEDS WRITER - Write-Intent Based
 * ============================================================================
 *
 * Writes seeds to Story_Seed_Deck sheet with full calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.7 Changes (S206 — Engine B persistence per routing-foundation plan T3.7):
 * - 3 new columns (P-R) for Engine B byline ranking: BylineCandidate,
 *   BylineConfidence, BylineRationale (JSON: {components, alternates}).
 *   Populated by applyStorySeeds.js v3.12 makeSeed via scoreAllBylines_.
 * - Live sheet widened from 15 → 18 cols S206 via service-account direct write.
 * - **DEPRECATION NOTE:** SuggestedJournalist (col I), SuggestedAngle (col J),
 *   VoiceGuidance (col K), MatchConfidence (col L) are kept populated for ONE
 *   transition cycle so /sift consumers can switch over without breakage. Next
 *   engine-sheet pickup (post-C94 smoke-test) retires the suggestStoryAngle_
 *   call site in applyStorySeeds.js + drops cols I-L from this writer per T3.6
 *   "replace" framing. During transition, SuggestedJournalist is still computed
 *   from suggestStoryAngle_ (independent path); BylineCandidate is computed
 *   from scoreAllBylines_ — they MAY diverge for the transition cycle, that's
 *   expected. Consumers should prefer BylineCandidate going forward.
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
  'SuggestedJournalist',  // I  (v3.5 — DEPRECATED v3.7, retired next session post-C94)
  'SuggestedAngle',       // J  (v3.5 — DEPRECATED v3.7, retired next session post-C94)
  'VoiceGuidance',        // K  (v3.5 — DEPRECATED v3.7, retired next session post-C94)
  'MatchConfidence',      // L  (v3.5 — DEPRECATED v3.7, retired next session post-C94)
  'PriorityScore',        // M  (v3.6 — Engine A composite 0-10)
  'ConsequenceFloor',     // N  (v3.6 — Engine A boolean: HEALTH/SAFETY/CIVIC top-domain bottom-floor)
  'PriorityComponents',   // O  (v3.6 — Engine A breakdown JSON)
  'BylineCandidate',      // P  (v3.7 — Engine B top-ranked journalist name)
  'BylineConfidence',     // Q  (v3.7 — Engine B confidence label: high/medium/low)
  'BylineRationale',      // R  (v3.7 — Engine B JSON: {components, alternates} — top components + top-3 alternates)
  'PacketRef',            // S  (v3.8 — S259 engine.35 P2: baseline_brief id for engine-emergent pattern seeds; '' for in-cycle calendar/texture/followup seeds)
  'CoveringJournalistPOPID' // T  (v3.8 — S259 engine.35 P2: covering citizen-journalist POPID from Bay_Tribune_Oakland; '' for in-cycle seeds)
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
  var now = inWorldStamp_(ctx); // S290 in-world, not wall-clock (engine.44)

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
      s.priorityComponents ? JSON.stringify(s.priorityComponents) : '',  // O  PriorityComponents JSON (v3.6)
      // v3.7 (S206 — Engine B): defensive nulls for pre-bylineEngine seeds
      // and degraded-mode runs (empty roster, scoreAllBylines_ throw, etc.).
      s.bylineCandidate || '',                                           // P  BylineCandidate (v3.7)
      s.bylineConfidence || '',                                          // Q  BylineConfidence (v3.7)
      s.bylineRationale ? JSON.stringify(s.bylineRationale) : '',        // R  BylineRationale JSON (v3.7)
      // v3.8 (S259 engine.35 P2): PacketRef + CoveringJournalistPOPID are populated
      // ONLY by the post-cycle Node router (routePatternSeeds.js) on pattern-emergent
      // seeds. In-cycle calendar/texture/followup seeds carry '' here — the columns
      // exist so the deck stays width-aligned across both writers.
      s.packetRef || '',                                                 // S  PacketRef (v3.8)
      s.coveringJournalistPopid || ''                                    // T  CoveringJournalistPOPID (v3.8)
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

  Logger.log('saveV3Seeds_ v3.7: Queued ' + rows.length + ' seeds for cycle ' + cycle);
}


/**
 * ============================================================================
 * STORY SEED DECK REFERENCE v3.7
 * ============================================================================
 *
 * COLUMNS (18):
 * A   Timestamp
 * B   Cycle
 * C   SeedID
 * D   SeedType
 * E   Domain
 * F   Neighborhood
 * G   Priority
 * H   SeedText
 * I   SuggestedJournalist (v3.5 — DEPRECATED v3.7, retired next session post-C94)
 * J   SuggestedAngle (v3.5 — DEPRECATED v3.7)
 * K   VoiceGuidance (v3.5 — DEPRECATED v3.7)
 * L   MatchConfidence (v3.5 — DEPRECATED v3.7)
 * M   PriorityScore (v3.6 — Engine A composite 0-10)
 * N   ConsequenceFloor (v3.6 — Engine A boolean)
 * O   PriorityComponents (v3.6 — Engine A breakdown JSON)
 * P   BylineCandidate (v3.7 — Engine B top-ranked journalist)
 * Q   BylineConfidence (v3.7 — high/medium/low confidence label)
 * R   BylineRationale (v3.7 — Engine B JSON {components, alternates})
 * S   PacketRef (v3.8 — S259 engine.35 P2 — baseline_brief id; '' for in-cycle seeds)
 * T   CoveringJournalistPOPID (v3.8 — S259 engine.35 P2 — covering journalist POPID; '' for in-cycle seeds)
 *
 * Live-sheet widen (S→T) is a service-account add at the C98 rollout window (like
 * the S206 M-O / P-R widenings) — ensureSheet_ does not extend existing sheets.
 *
 * Note: Calendar columns existed in v3.2-v3.3 (cols I-N) but were never read.
 * Removed in v3.4, columns I-L repurposed in v3.5 for seed metadata.
 * Cols M-O added v3.6 for Engine A; cols P-R added v3.7 for Engine B. Live
 * sheet widened S206 via service-account direct write (ensureSheet_ does not
 * extend existing sheets).
 *
 * ============================================================================
 */