WIRING CARD — S.neighborhoodEconomies (field)   map: 2026-09-15 / 183 files / 1399 functions

DEFINITION
  phase01-config/loadPreviousEvening.js:344  S.neighborhoodEconomies = out  (seedCarriedNeighborhoodEconomies_)
  phase06-analysis/economicRippleEngine.js:931  S.neighborhoodEconomies = nhEconomies  (runEconomicRippleEngine_)
  phase06-analysis/applyMigrationDrift.js:517  S.neighborhoodEconomies = neighborhoodEconomies  (applyMigrationDrift_)
  phase06-analysis/economicRippleEngine.js:158  S.neighborhoodEconomies = S.neighborhoodEconomies || {}  (runEconomicRippleEngine_ init)

PHASE POSITION
  production entry  : Phase1-PrevEvening @ godWorldEngine2.js:281  — BEFORE Phase10-ExecuteIntents (:594)
  production entry  : Phase6-EconomicRipple @ godWorldEngine2.js:413  — BEFORE Phase10-ExecuteIntents (:594)
  production entry  : Phase6-Migration @ godWorldEngine2.js:419  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases      : Phase1-PrevEvening @ godWorldEngine2.js:2030  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases      : Phase6-EconomicRipple @ godWorldEngine2.js:2161  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases      : Phase6-Migration @ godWorldEngine2.js:2167  — BEFORE Phase10-ExecuteIntents (:2329)

CALLERS (8 sites)
  phase01-config/loadPreviousEvening.js:327  if (S.neighborhoodEconomies && Object.keys(S.neighborhoodEconomies).length) return;  [guard READ]
  phase02-world-state/applyCityDynamics.js:98  var neighborhoodEconomies = S.neighborhoodEconomies || {};  [READ]
  phase06-analysis/economicRippleEngine.js:158  S.neighborhoodEconomies = S.neighborhoodEconomies || {};  [READ + WRITE]
  phase06-analysis/economicRippleEngine.js:944  var nhEcon = S.neighborhoodEconomies || {};  [READ]
  phase06-analysis/applyMigrationDrift.js:210  var neighborhoodEconomies = S.neighborhoodEconomies || {};  [READ]
  phase06-analysis/applyMigrationDrift.js:522  var econ = S.neighborhoodEconomies[hood] || { mood: 50, descriptor: 'stable' };  [READ per-hood]
  phase06-analysis/applyMigrationDrift.js:538  S.neighborhoodEconomies[hood] = econ;  [WRITE per-hood]
  phase09-digest/finalizeCycleState.js:444  var hoodEcon = compactNeighborhoodEconomies_(S.neighborhoodEconomies);  [READ]
  phase10-persistence/buildCyclePacket.js:674  var nhEcon = S.neighborhoodEconomies || {};  [READ]

OTHER CTX
  ctx.config (applyMigrationDrift.js:510-512 — migration feedback tuning params)
  ctx.economicCalendarContext (economicRippleEngine.js:941)
  ctx.economicMigrationContext (economicRippleEngine.js:942)
  ctx.ss (applyCityDynamics.js:93 — for neighborhood demographics lookup)

WRITE PATH
  phase09-digest/finalizeCycleState.js:447  DIRECT  saveCarryForwardBlob_(ctx, 'PREV_HOOD_ECON_JSON', hoodJson, snapshot.cycle)  [Phase-10 after Phase10-ExecuteIntents; carries mood to next cycle]

DESCRIPTOR THRESHOLDS (CRITICAL — THREE DIFFERENT SCALES)
  
  Scale 1: describeHoodEconomy_ (economicRippleEngine.js:772-778) — PRIMARY PRODUCER
    mood >= 65 → 'thriving'
    mood >= 55 → 'growing'
    mood >= 45 → 'stable'
    mood >= 35 → 'sluggish'
    mood < 35  → 'struggling'
  
  Scale 2: applyMigrationDrift.js (lines 534-536) — MIGRATION FEEDBACK REDESCRIPTOR
    mood >= 70 → 'thriving'  [DIFFERENT: 70 not 65]
    mood <= 30 → 'struggling'  [DIFFERENT: 30 not 35]
    else       → 'stable'  [SIMPLIFIED: drops growing/sluggish]
  
  Scale 3: applyCityDynamics.js:1109 — CLUSTER-ECONOMY DERIVATIVE DESCRIPTOR
    avgMood >= 70 → 'thriving'  [DIFFERENT: 70 not 65]
    avgMood <= 30 → 'struggling'  [DIFFERENT: 30 not 35]
    else          → 'stable'  [SIMPLIFIED: drops growing/sluggish]

MOOD THRESHOLDS IN EFFECTS (applyCityDynamics.js:521-533, applyEconomyLocal_)
  mood >= 70  → retail *= 1.06, sentiment += 0.05, tourism *= 1.04
  mood >= 60  → retail *= 1.03, sentiment += 0.02
  mood <= 30  → retail *= 0.90, sentiment -= 0.30, tourism *= 0.93  [engine.185 defect: depression repriced]
  mood <= 40  → retail *= 0.95, sentiment -= 0.12
  descriptor === 'thriving'  → retail *= 1.04, culturalActivity *= 1.03
  descriptor === 'struggling' → retail *= 0.95, sentiment -= 0.07

MATH.ROUND APPLICATIONS
  economicRippleEngine.js:915  Math.round(Math.max(0, Math.min(100, localMood)) * 100) / 100  [0–2 decimals on hood mood]
  applyMigrationDrift.js:529  Math.round(clamp(rawNhDelta, -nhFeedbackMaxDelta, nhFeedbackMaxDelta))  [delta]
  applyMigrationDrift.js:531  Math.round(beforeMood + delta)  [afterMood, clamped 0–100]
  finalizeCycleState.js:473  Math.round(mood * 10) / 10  [one decimal for carry-forward blob]

OBJECT STRUCTURE (per neighborhood)
  {
    mood: <number 0–100>,
    descriptor: <'thriving'|'growing'|'stable'|'sluggish'|'struggling'>,
    activeRipples: <count>,
    sectors: <array of primary sector strings>,
    isHolidayZone: <boolean>,
    isSportsZone: <boolean>,
    carried: <boolean, only in Phase 1 seed>
  }

DEFAULT FALLBACK (applyCityDynamics.js:98, applyMigrationDrift.js:210,522)
  S.neighborhoodEconomies || {} → defaults to empty object
  Per-hood default (line 522): { mood: 50, descriptor: 'stable' }

SUMMARY DERIVATION (economicRippleEngine.js:991-999, generateEconomicSummary_)
  strugglingNeighborhoods: descriptors === 'struggling' OR 'sluggish'
  thrivingNeighborhoods: descriptors === 'thriving' OR 'growing'
  Written to S.economicSummary.strugglingNeighborhoods / .thrivingNeighborhoods (Phase-6)
  Read by buildCyclePacket.js:380-384 for Phase-10 packet (NEIGHBORHOOD ECONOMIES section)

CARRY-FORWARD MECHANISM (engine.219)
  Phase 10: finalizeCycleState.js:444-448 compacts S.neighborhoodEconomies → {hood: mood (1 decimal)} → PREV_HOOD_ECON_JSON blob (~376 chars, 22 hoods)
  Phase 1: seedCarriedNeighborhoodEconomies_.js:329-346 loads PREV_HOOD_ECON_JSON, re-seeds descriptor via describeHoodEconomy_, seeds S.neighborhoodEconomies
  No descriptor carried — recomputed every cycle by producer (economicRippleEngine) or seed (Phase 1)

OPEN WORK
  engine.219 @ ROLLOUT_PLAN.md:144  CUT S461 (engine-sheet): hood mood carry-forward, Phase-1 seed, Phase-10 persist … BENCH-PROVEN @36 C108–C109 … PROD @88 … Watch: cluster consumer's absolute bars (≥60/≤40, ≥70/≤30) sit outside ±3 band — relative band follow-up | done-pending-archive
  engine.221 @ ROLLOUT_PLAN.md:146  CUT S461: city economic mood carry, inertia gap closer, Phase-1 seed … BENCH-PROVEN @34 C108–C109 … PROD @86 | done-pending-archive
  engine.185 @ ROLLOUT_PLAN.md:118  Sentiment repriced; crime/shock gates relative; hood 0-floor removed … HOLD from PROD until engine.188 | in-progress
  docs/plans/2026-09-13-run-cycle-packages-the-world.md  (Task 7 via engine.221)
  docs/plans/2026-09-09-health-slice-freshness.md  (via engine.185)

HISTORY
  e31399b9  S461 engine.219: a hood remembers last Cycle's economy — own carry key, Phase-1 seed, producer untouched
  8efb8ec4  S461 engine.222: the economy's inputs are keyed to what the calendar and the events write — month, season, closure
  a05aa6b1  S461 engine.221: the city economic mood has memory — Phase 1 seeds the carry, Phase 6 closes inertia of the gap to the level
  835cb097  S423 engine.99 Finding #9 — child areas become ledger truth: Neighborhood_Map.ChildAreas, one Phase-1 seed, three folds retired
  4b164e75  S423 engine.134 Tasks 2–3 — the economy blob and the business fold read the ledger set
  e9ce67a5  engine.131 T7: the sports zone follows the stadium (ships dark)

FILES OPENED
  phase01-config/loadPreviousEvening.js
  phase01-config/godWorldEngine2.js
  phase02-world-state/applyCityDynamics.js
  phase06-analysis/economicRippleEngine.js
  phase06-analysis/applyMigrationDrift.js
  phase09-digest/finalizeCycleState.js
  phase10-persistence/buildCyclePacket.js
  docs/engine/ROLLOUT_PLAN.md
  docs/engine/ENGINE_STUB_REVERSE.json
