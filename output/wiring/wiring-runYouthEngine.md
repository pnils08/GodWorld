WIRING CARD — runYouthEngine_ (function)   map: 2026-09-02 / 186 files   [MAP CURRENT]

DEFINITION
  phase05-citizens/runYouthEngine.js:107  function runYouthEngine_(ctx)        [v1.3]

PHASE POSITION
  production entry : Phase5-Youth @ godWorldEngine2.js:354  — BEFORE Phase10-ExecuteIntents (:573)
  cycle-phases     : Phase5-Youth @ godWorldEngine2.js:2085 — BEFORE Phase10-ExecuteIntents (:2290)

CALLERS (2)
  phase01-config/godWorldEngine2.js:354   safePhaseCall_(ctx, 'Phase5-Youth', function() { runYouthEngine_(ctx); })
  phase01-config/godWorldEngine2.js:2085  safePhaseCall_(ctx, 'Phase5-Youth', function() { runYouthEngine_(ctx); })

S FIELDS
  READ  absoluteCycle       @ :110   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js
  READ  simMonth            @ :119   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js
  READ  season              @ :120   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3preLoader_@phase08-v3-chicago/v3preLoader.js
  READ  crimeMetrics        @ :123   writers: updateCrimeMetrics_Phase3_@phase03-population/updateCrimeMetrics.js, generateCitizensEvents_@phase05-citizens/generateCitizensEvents.js, generateAngle_@phase07-evening-media/applyStorySeeds.js
  READ  simYear             @ :558   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js
  WRITE youthEvents         @ :265   readers: getYouthStorySignals_@phase05-citizens/runYouthEngine.js                                         [ORPHANED: written in runYouthEngine_, read only in same file]

OTHER CTX
  ctx.ss            @ :108  (passed to getSheetByName for Community_Programs read)
  ctx.summary       @ :109  (aliased as S; READ)
  ctx.ledger        @ :365  (READ for namedYouth retrieval; WRITE at :763-764 for LifeHistory col-O citizen row update)
  ctx.ledger.dirty  @ :764  (flagged after direct row write)

TYPEOF GUARDS (10)
  :114   typeof ensureYouthEventsSchema_ === 'function'   →   ensureYouthEventsSchema_(ss)
  :136   typeof getNeighborhoodDemographics_ === 'function'   →   getNeighborhoodDemographics_(ss)
  :146   typeof ss.getSheetByName === 'function'   (fail-soft Community_Programs read)
  :242   typeof recordRipple_ === 'function'   →   recordRipple_(ctx, {...schoolEvents ripple})
  :260   typeof batchRecordYouthEvents_ === 'function'   →   batchRecordYouthEvents_(ctx, events)
  :459   typeof assignSchoolForYouth_ === 'function'   →   assignSchoolForYouth_(youth.age, youth.neighborhood, rng)
  :465   typeof selectYouthEventType_ === 'function'   →   selectYouthEventType_(youth.age, month, rng)
  :480   typeof pickYouthEvent_ === 'function'   →   pickYouthEvent_(eventType, rng)
  :516   typeof generateYouthOutcome_ === 'function'   →   generateYouthOutcome_(eventType, rng)
  :767   typeof queueAppendIntent_ === 'function'   →   queueAppendIntent_(ctx, 'LifeHistory_Log', [...], ...)

WRITE PATH
  INTENT  queueAppendIntent_  @ :768  → LifeHistory_Log  (youth life history for named citizens; flows to Phase10-ExecuteIntents)

TABS
  Community_Programs     readers: runYouthEngine_@phase05-citizens/runYouthEngine.js::runYouthEngine_, contractSeedBackdropIndex_@phase07-evening-media/buildContractSeeds.js   writers: none (canon-managed)   manifest: SHEETS_MANIFEST.md:46
  LifeHistory_Log        writers: 14 files including recordYouthLifeHistory_@phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_   readers: 16 files   manifest: SHEETS_MANIFEST.md:38

OAKLAND UNIFIED / OUSD STRINGS
  :575   youthName: 'Oakland Unified'         (fall_start school-wide event; narrative only)
  :576   youthId: 'SCHOOL-OUSD'                (event ID slug; non-canon placeholder)
  :580   school: 'Oakland Unified'             (narrative field in event object; fall_start context)
  [CONTEXT: Lines 554-570 (graduation) and 589-601 (homecoming) reference OAKLAND_SCHOOLS.high array with canon voice "an Oakland City Schools high school in [neighborhood]" — these are NOT "Oakland Unified" strings but real data-driven institutional references. OUSD placeholder at :575-580 only. Rebuilt at lines 85-94 per S398 canon audit.]

CONSTANTS DEFINED
  YOUTH_ENGINE_VERSION = '1.3'                                    @ :37
  YOUTH_EVENT_LIMITS = {MAX_EVENTS_PER_CYCLE: 25, ...}            @ :40-45
  YOUTH_EVENT_PROBS = {elementary: 0.15, ...}                     @ :48-53
  ACADEMIC_CALENDAR = {1: {...}, ...}                             @ :61-74   [restored S360; was in youthActivities.js, removed S357]
  OAKLAND_SCHOOLS = {high: [{id, name, neighborhood}, ...]}       @ :85-94  [rebuilt S398 in canon voice; was missing S357-S398]

OPEN WORK
  docs/plans/2026-05-22-c94-gap-log-triage.md              (gap triage mentions youth engine context)
  docs/plans/2026-06-15-story-seed-deck-engine-emergence.md (youth engine context seed integration)
  docs/plans/2026-07-18-event-pools-design.md              (event pool design includes youth stream)

HISTORY
  543361c4 S398 engine.135: dial definition resolved (Q5), B3 East Oakland ND row on bench, OAKLAND_SCHOOLS youth throw fixed in canon voice
  582ea5ec S360 runYouthEngine: restore ACADEMIC_CALENDAR — S357 youthActivities retirement broke Phase5-Youth [engine/sheet]
  ca1c8fed S326 V2-5 youth ripple emitter: school-wide events (graduation/homecoming/kickoff) -> youth-event 0.02 hood texture; individual dial-molding stays silent per spec
  a21b4c95 S325 engine.69: tier decay (fame ladder runs both ways, earned rungs only) + youth events mold children (Mike-approved)
  c9473260 S325 engine.67 step 4b: youth engine gone-status gate (bench C109 caught a pending citizen drawing youth-civic_participation)
  e4f4977a S313 research.24 T6: youth events name community programs (runYouthEngine, plan target corrected)

FILES OPENED
  phase05-citizens/runYouthEngine.js (main target)
  phase01-config/godWorldEngine2.js (phase position, callers)
  docs/engine/ENGINE_STUB_REVERSE.json (field/tab maps)
  docs/engine/SHEETS_MANIFEST.md (tab manifest)
  docs/engine/ROLLOUT_PLAN.md (open work)
  docs/plans/ (4 plan docs mentioning function)
