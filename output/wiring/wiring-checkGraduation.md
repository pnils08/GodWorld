WIRING CARD — checkGraduation_ (function)   map: 2026-09-02 / 186 files   FRESH

DEFINITION
  phase04-events/generationalEventsEngine.js:866  function checkGraduation_(ctx, popId, age, lifeHistory, tier, cal)  [V2.7 file header]

PHASE POSITION
  production entry : Phase5-Generational @ godWorldEngine2.js:353  — BEFORE Phase10-ExecuteIntents (:573)
  cycle-phases     : Phase5-Generational @ godWorldEngine2.js:2084 — BEFORE Phase10-ExecuteIntents (:2290)

CALLERS (1)
  phase04-events/generationalEventsEngine.js:447  var gradResult = checkGraduation_(ctx, popId, age, lifeHistory, tier, calendarContext);

S FIELDS
  WRITE  ctx.summary.generationalEvents @ :449  [indirect via applyMilestone_ return value]
  (no direct S.* field reads or writes in checkGraduation_ body)

OTHER CTX
  ctx._rng  @ :877, :891  (via chance_ and pick_ utility functions)

WRITE PATH
  (no direct sheet writes; return value passed to applyMilestone_ which queues intent)

BODY SUMMARY
  Lines 866–892. Pure calculation function: checks [Graduation] tag presence in LifeHistory, validates age against AGE_RANGES.GRADUATION (22–28), applies probability modifiers by tier and seasonality (spring 3×, May/June 2×), rolls RNG via chance_(ctx, c), selects description text. Returns milestone object {type: MILESTONE_TYPES.GRADUATION, description, tag: "Graduation", season} or null. No state mutation, no sheet access.

CONSTANTS REFERENCED
  AGE_RANGES.GRADUATION  (min: 22, max: 28) @ :868, 79
  MILESTONE_TYPES.GRADUATION  @ :891, 63

UTILITIES CALLED
  chance_(ctx, p)  @ :877  (phase04-events/generationalEventsEngine.js:155)
  pick_(ctx, arr)  @ :891  (phase04-events/generationalEventsEngine.js:159)

OPEN WORK
  NOT FOUND in ROLLOUT_PLAN.md
  NOT FOUND in docs/plans/

HISTORY
  8285601d  engine-sheet (landed by kimi): engine.94 Task 3 — grief calibration as required World_Config state + bounded situational grief
  5a989406  mags: engine.102 Task 7 — legacy blank-cause backfill at lifecycle transition
  febd6492  mags: engine.102 Task 7 — W4 admission cause + hospital talk-back
  87e68f94  mags: engine.102 Task 6 — W3 hood-scoped illness dose + wake health read
  a567f933  mags: engine.102 Task 5 — W2b land (physics literals -> World_Config reads)
  8e1f355c  S328 engine.74: household ledger drives family fates (Mike-direct design)

FILES OPENED
  phase04-events/generationalEventsEngine.js (definition, caller context, constants, utilities)
  phase01-config/godWorldEngine2.js (phase registration)
