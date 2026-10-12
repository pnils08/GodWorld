WIRING CARD — S.mediaEffects (field)   map: 2026-09-15 / 183 files   [MAP FRESH]

DEFINITION
  phase07-evening-media/mediaFeedbackEngine.js:134  ctx.summary.mediaEffects = {...}  v2.3
  phase08-v3-chicago/v3preLoader.js:76              if (!S.mediaEffects) S.mediaEffects = {};  (guard init)

PHASE POSITION
  production entry : Phase8-V3Integration @ godWorldEngine2.js:524  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase8-V3Integration @ godWorldEngine2.js:2273 — BEFORE Phase10-ExecuteIntents (:2329)

  (v3PreloadContext_ guard runs Phase8-V3Preload @ 502/2251, BEFORE the main writer @ 524/2273)

CALLERS WRITE (2)
  phase08-v3-chicago/v3Integration.js:44  return runMediaFeedbackEngine_(ctx);

CALLERS READ (10 sites, 8 reader functions)
  phase02-world-state/applySeasonWeights.js:409            var mediaEffects = S.mediaEffects || {};
  phase05-citizens/runRelationshipEngine.js:558            var mediaEffects = ctx.summary.mediaEffects;
  phase06-analysis/applyShockMonitor.js:57                 var mediaEffects = S.mediaEffects || {};
  phase06-analysis/prioritizeEvents.js:67                  var mediaEffects = S.mediaEffects || {};
  phase07-evening-media/mediaFeedbackEngine.js:210         var effects = S.mediaEffects;    [internal reader: amplifyArcsFromCoverage_]
  phase07-evening-media/mediaFeedbackEngine.js:358         var effects = S.mediaEffects;    [internal reader: analyzeEntertainmentSignals_]
  phase07-evening-media/mediaFeedbackEngine.js:513         var effects = S.mediaEffects;    [internal reader: calculateCoverageIntensity_]
  phase07-evening-media/mediaFeedbackEngine.js:614         var effects = S.mediaEffects;    [internal reader: calculateSentimentPressure_]
  phase07-evening-media/mediaFeedbackEngine.js:708         var effects = S.mediaEffects;    [internal reader: applyNeighborhoodMediaEffects_]
  phase07-evening-media/mediaFeedbackEngine.js:777         var effects = S.mediaEffects;    [internal reader: amplifyArcsFromCoverage_]
  phase07-evening-media/mediaFeedbackEngine.js:823         var effects = S.mediaEffects;    [internal reader: generateMediaEventPools_]
  phase07-evening-media/mediaFeedbackEngine.js:911         var effects = S.mediaEffects;    [internal reader: applyMediaToCityDynamics_]
  phase07-evening-media/mediaFeedbackEngine.js:1006        var effects = S.mediaEffects;    [internal reader: generateMediaSummary_]
  phase07-evening-media/mediaFeedbackEngine.js:1135        var effects = S.mediaEffects;    [internal reader: getMediaInfluencedEvent_]
  phase07-evening-media/mediaFeedbackEngine.js:1175        var effects = S.mediaEffects;    [internal reader: isMediaSaturated_]
  phase07-evening-media/mediaFeedbackEngine.js:1232        var mediaEffects = ctx.summary ? ctx.summary.mediaEffects : null;
  phase07-evening-media/mediaFeedbackEngine.js:1332        var effects = (ctx.summary && ctx.summary.mediaEffects) ? ctx.summary.mediaEffects : null;
  phase07-evening-media/mediaFeedbackEngine.js:1357        var effects = (ctx.summary && ctx.summary.mediaEffects) ? ctx.summary.mediaEffects : null;
  phase09-digest/applyCycleWeight.js:299                   var mediaEffects = S.mediaEffects || {};
  phase09-digest/applyCompressionDigestSummary.js:123     var mediaEffects = S.mediaEffects || {};
  phase09-digest/finalizeCycleState.js:91                  mediaEffects: compactMediaEffects_(S.mediaEffects),
  phase10-persistence/recordMediaLedger.js:137            var mediaEffects = S.mediaEffects || {};

READER PHASES — BEFORE vs AFTER WRITER
  BEFORE (dead in current cycle):
    phase02 applySeasonWeights.js:409             [Phase2-SeasonalWeights @ 287, reads empty / fallback to {}]
    phase05 runRelationshipEngine.js:558          [Phase5-Relationships @ 349, reads empty]
    phase06 applyShockMonitor.js:57               [Phase6-ShockMonitor @ 421, reads empty / fallback to {}]
    phase06 prioritizeEvents.js:67                [Phase6-Prioritize @ 408, reads empty / fallback to {}]
    phase07 mediaFeedbackEngine.js (internal)     [Phase7-ChaosArcs @ 481, reads empty / partial init at :134–160]

  AFTER (current cycle's mediaEffects available):
    phase09 applyCycleWeight.js:299               [Phase8-CycleWeightSignal @ 525, reads inputs written @ 524 in Phase8-V3Integration]
    phase09 applyCompressionDigestSummary.js:123  [Phase9-DigestSummary @ 540]
    phase09 finalizeCycleState.js:91               [Phase9-FinalizeCycleState @ 545, compacts via compactMediaEffects_]
    phase10 recordMediaLedger.js:137              [Phase10-MediaLedger @ 581]

STATE COMPACTION — Phase 9 → previous Cycle
  compactMediaEffects_ @ phase09-digest/finalizeCycleState.js:285
    Saves keys:
      sentimentPressure    — media coverage sentiment aggregate
      anxietyFactor        — anxiety/crisis tone in coverage
      hopeFactor           — hopeful/positive tone in coverage
      crisisSaturation     — sustained crisis coverage intensity
      celebrityBuzz        — celebrity/famous-people coverage
      neighborhoodEffects  — per-neighborhood media pressure

  Phase 10 integration:
    finalizeCycleState_ saves compacted mediaEffects to PropertiesService via snapshotEveningForCarryForward_
    Loaded next cycle @ Phase1-PrevCycleState via loadPreviousCycleState_ (line 282 godWorldEngine2.js)
    Accessible to ALL phases after Phase 1 as S.previousCycleState.mediaEffects

PREVIOUS-CYCLE READER — Phase 2 Feedback Loop
  phase02-world-state/applyCityDynamics.js:1573-1589  [Phase2-CityDynamics @ 299]
    var prevState = S.previousCycleState || {};
    var prevMedia = prevState.mediaEffects || null;
    
    if (prevMedia):
      • Sentiment feedback: hopeFactor − anxietyFactor → city sentiment ±0.04
      • Crisis saturation: crisisSat > 0.5 → public spaces −0.03, community engagement −0.02
      • Celebrity buzz: spotlight → tourism/nightlife tick up

  Availability to Phase 6 readers: YES
    previousCycleState loaded @ Phase1-PrevCycleState (line 282), available to phase6 readers via S.previousCycleState

WRITE PATH
  NO SHEET INTENTS (mediaEffects is not queued to sheets)
  NO DIRECT WRITES (mediaEffects saved to PropertiesService, not Sheets API)
  State persistence only: compactMediaEffects_ in finalizeCycleState, PropertiesService save/restore

OTHER CTX
  ctx.mediaCalendarContext @ phase07-evening-media/mediaFeedbackEngine.js:131  (calendar context for media analysis)
  ctx.previousCycleState @ all phases after Phase 1 (loaded @ Phase1-PrevCycleState)

TABS
  (none — mediaEffects is ctx.summary only, no sheet tab writes)

OPEN WORK
  engine.220  (S461, PROD @89) — media feedback scheduling moved from Phase7 to Phase8-V3Integration; duplicate write removed; Phase-7 slot deleted. BENCH-PROVEN @37 C108–C109 (132/132).
  engine.224  (S461, PROD @90) — cycle-weight signal scored AFTER Phase8-V3Integration (was BEFORE, reading empty mediaEffects). BENCH-PROVEN @38 C108–C109.
  engine.217  (mentioned in ROLLOUT; codex-led, not yet a full row) — economy runs once per cycle; v3Integration no longer re-runs economicRippleEngine_.

  Rollout line 145: engine.220 detail
  Rollout line 149: engine.224 detail

HISTORY
  e31399b9  S461 engine.219: a hood remembers last Cycle's economy — own carry key, Phase-1 seed, producer untouched
  8efb8ec4  S461 engine.222: the economy's inputs are keyed to what the calendar and the events write — month, season, closure
  3006ba67  S459 engine-sheet takes the lead back (Mike-direct 2026-09-14 20:21, codex at 6% weekly budget): engine.214 rejected cut REVERTED off HEAD (applyCityDynamics.js == PROD c37d85ea, test removed, STUB_MAP regenerated) so repo HEAD == PROD candidate; engine.219–222 reassigned to engine-sheet; PIN/NEXT flipped; PROD + push ready on Mike's word
  9189addf  S458 engine.217 (codex-led): the economy runs once per cycle — Phase-8 v3Integration no longer re-runs economicRippleEngine_
  29ba3d75  S458 engine-sheet: engine.214 — every hood on Neighborhood_Map gets its own dynamics track (cluster membership from the sheet, not a literal)
  c37d85ea  engine.213d: the poll answers from a season — smoothed hood mood carried across Cycles

FILES OPENED
  phase07-evening-media/mediaFeedbackEngine.js
  phase08-v3-chicago/v3preLoader.js
  phase08-v3-chicago/v3Integration.js
  phase09-digest/finalizeCycleState.js
  phase02-world-state/applyCityDynamics.js
  phase01-config/godWorldEngine2.js
  phase02-world-state/applySeasonWeights.js
  phase05-citizens/runRelationshipEngine.js
  phase06-analysis/applyShockMonitor.js
  phase06-analysis/prioritizeEvents.js
  phase09-digest/applyCycleWeight.js
  phase09-digest/applyCompressionDigestSummary.js
  phase10-persistence/recordMediaLedger.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
