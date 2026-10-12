WIRING CARD — detectNewRipples_ (function)   map: 2026-09-15 / 183 files   [FRESH]

DEFINITION
  phase06-analysis/economicRippleEngine.js:504  function detectNewRipples_(ctx, currentCycle)  v2.5

PHASE POSITION
  production entry : Phase6-EconomicRipple @ godWorldEngine2.js:413  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase6-EconomicRipple @ godWorldEngine2.js:2161  — BEFORE Phase10-ExecuteIntents (:2329)

CALLERS (1)
  phase06-analysis/economicRippleEngine.js:214  detectNewRipples_(ctx, currentCycle);

S FIELDS
  READ  worldEvents       @ :507   writers: generateCrisisBuckets_, generateCrisisSpikes_, runFaithEventsEngine_, worldEventsEngine_, applyBusinessDynamics_, v3PreloadContext_
  READ  citizenEvents     @ :508   writers: generateCitizensEvents_
  READ  crisisSpikes      @ :509   writers: [PHANTOM READ — no writers found]
  READ  domainPresence    @ :510   writers: domainTracker_, v3PreloadContext_
  READ  weather           @ :561   writers: advanceSimulationCalendar_, applyWeatherModel_
  WRITE economicRipples   @ :638 (via createRipple_)   readers: applyMigrationDrift_, v3Integration_, applyCycleWeight_, applyCompressedDigestSummary_, finalizeCycleState_

OTHER CTX
  ctx.economicCalendarContext @ :506  (set by runEconomicRippleEngine_ @ phase06-analysis/economicRippleEngine.js:190)
  ctx.rng implicit via S._rng @ :600  (set by runEconomicRippleEngine_ @ phase06-analysis/economicRippleEngine.js:154)

WRITE PATH
  MEMORY  S.economicRipples.push(ripple) @ :638  (createRipple_ creates ripple object; no sheet writes, no queueIntents)

KEYWORD BRANCHES WITH RIPPLE TYPES
  'investment' / 'funding'           → TECH_INVESTMENT         impact: +15, duration: 8 cycles
  'championship' / 'victory'         → SPORTS_CHAMPIONSHIP     impact: +10, duration: 4 cycles
  'new store' / 'grand opening'      → NEW_BUSINESS            impact: +5, duration: 6 cycles
  'construction' / 'development'     → CONSTRUCTION_BOOM       impact: +12, duration: 10 cycles  [engine.222: target keywords for ±development ripple]
  'layoff' / 'job cuts'              → MAJOR_LAYOFFS           impact: -15, duration: 10 cycles
  'closure' / 'shut down' + typed domain check  → FACTORY_CLOSURE  impact: -20, duration: 12 cycles  [engine.222: isBusinessClosure_ typed-domain pattern]
  'crime' / 'robbery'                → CRIME_SPIKE             impact: -8, duration: 4 cycles
  'festival' / 'cultural'            → CULTURAL_EVENT          impact: +6, duration: 3 cycles
  'infrastructure' / 'power outage'  → INFRASTRUCTURE_FAILURE  impact: -10, duration: 6 cycles
  domains['BUSINESS'] >= 3           → NEW_BUSINESS            impact: +5, duration: 6 cycles  [line 550: domain surge detection]
  crisisEvents type='natural_disaster' or severity > 7  → NATURAL_DISASTER  impact: -25, duration: 8 cycles
  weather.impact >= 1.4              → INFRASTRUCTURE_FAILURE  impact: -10, duration: 6 cycles

TYPED-DOMAIN PATTERN (isBusinessClosure_)
  phase06-analysis/economicRippleEngine.js:576  — engine.222 established this pattern:
    - Prioritizes evt.domain (typed, from worldEventsEngine / generateCitizensEvents)
    - Returns true if domain === 'BUSINESS'
    - Returns false if domain in ['CIVIC', 'TRAFFIC', 'INFRASTRUCTURE', 'WEATHER']
    - Falls back to business noun detection (factory, plant, business, store, shop, restaurant, warehouse, employer, company, firm, office, workers, jobs, mill, brewery, cafe, bar)
    - Filters false positives: CIVIC "road closure decision" excluded

CONSUMERS OF S.economicRipples
  Phase 6 (within same engine):
    - processActiveRipples_      @ phase06-analysis/economicRippleEngine.js:651  (decay & re-strength)
    - calculateEconomicMood_     @ phase06-analysis/economicRippleEngine.js:693  (aggregate ripple effects into mood)
    - calculateNeighborhoodEconomies_  @ phase06-analysis/economicRippleEngine.js:804  (per-hood ripple impact)
  
  Phase 6 (migration):
    - applyMigrationDrift_       @ phase06-analysis/applyMigrationDrift.js:211   (ripple direction as migration signal)
  
  Later phases:
    - v3Integration_             @ phase08-v3-chicago/v3Integration.js:176       (ripple count for v3 weighting)
    - applyCycleWeight_           @ phase09-digest/applyCycleWeight.js:280        (ripple count as cycle intensity)
    - applyCompressedDigestSummary_  @ phase09-digest/applyCompressionDigestSummary.js:118  (ripple count)
    - finalizeCycleState_         @ phase09-digest/finalizeCycleState.js:103      (compact economicRipples for next-cycle carry)

OPEN WORK
  engine.222 @ ROLLOUT_PLAN.md:147   three dead inputs fixed: (1) S.month read by 5 functions, nothing wrote it; (2) lowercase seasonKey mismatch with calendar's 'Winter'; (3) isBusinessClosure_ typed-domain pattern as filter for FACTORY_CLOSURE. Status: PROD @87 (version 76)
  engine.219 @ ROLLOUT_PLAN.md:144   per-hood economic memory — Phase 1 seeds last Cycle's saved mood, Phase 6 produces = no-op on fire 1. Status: PROD @88 (version 77)
  engine.221 @ ROLLOUT_PLAN.md:146   economic mood carry with inertia 0.3 smoothing. Status: PROD @86 (version 75)
  engine.217 @ ROLLOUT_PLAN.md (search needed)   duplicate economic execution; awaiting decision on bench-proven cut
  docs/plans/2026-09-11-sports-as-a-lived-system.md — sports economy build (magnitude from record, not just season state)
  docs/plans/2026-09-13-run-cycle-packages-the-world.md — cycle packaging roundup including engine.219/221/222

HISTORY (6 commits)
  e31399b9  S461 engine.219: a hood remembers last Cycle's economy — own carry key, Phase-1 seed, producer untouched
  8efb8ec4  S461 engine.222: the economy's inputs are keyed to what the calendar and the events write — month, season, closure
  a05aa6b1  S461 engine.221: the city economic mood has memory — Phase 1 seeds the carry, Phase 6 closes inertia of the gap to the level
  835cb097  S423 engine.99 Finding #9 — child areas become ledger truth: Neighborhood_Map.ChildAreas, one Phase-1 seed, three folds retired
  4b164e75  S423 engine.134 Tasks 2–3 — the economy blob and the business fold read the ledger set
  e9ce67a5  engine.131 T7: the sports zone follows the stadium (ships dark)

FILES OPENED
  phase06-analysis/economicRippleEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
