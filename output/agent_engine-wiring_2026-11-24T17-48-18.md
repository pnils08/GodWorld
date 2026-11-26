Now I will produce the final, complete WIRING CARD:

```
WIRING CARD — applyBusinessDynamics_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/applyBusinessDynamics.js:603  function applyBusinessDynamics_(ctx) — engine.96

PHASE POSITION
  production entry : Phase5-BusinessDynamics @ godWorldEngine2.js:739  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-BusinessDynamics @ godWorldEngine2.js:2460 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (14)
  phase01-config/godWorldEngine2.js:739  safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase01-config/godWorldEngine2.js:2460  safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase05-citizens/applyBusinessDynamics.test.js:91  const out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:98  mod.applyBusinessDynamics_(ctxWith({ S: {} }));
  phase05-citizens/applyBusinessDynamics.test.js:101  mod.applyBusinessDynamics_(ctxWith({ bl: split }));
  phase05-citizens/applyBusinessDynamics.test.js:103  let threw = ''; try { mod.applyBusinessDynamics_(ctxWith({ bl: [['BIZ_ID', 'Name'], ['BIZ-1', 'x']] }));
  phase05-citizens/applyBusinessDynamics.test.js:133  let out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:137  mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:142  out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:148  out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:153  mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:257  mod.applyBusinessDynamics_(ctxWith({ S: { initiativeNeighborhoodEffects: bus } }));
  phase05-citizens/applyBusinessDynamics.test.js:372  const out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:421  mod.applyBusinessDynamics_(ctxWith({ bl: bl }));

S FIELDS
  READ  cycleId                        @ :605  writers: advanceSimulationCalendar_, v3Integration_
  READ  previousCycleState             @ :621  writers: loadPreviousCycleState_, applyShockMonitor_, finalizeCycleState_
  READ  neighborhoodState              @ :622  writers: loadNeighborhoodState_
  READ  chaosBusinessFold              @ :624  writers: accumulateBusinessEvent_
  READ  chaosNeighborhoodFold          @ :625  writers: accumulateNeighborhoodFold_, resolveChaosNeighborhoodFold_
  READ  initiativeNeighborhoodEffects  @ :626  writers: applyInitiativeImplementationEffects_
  READ  sportsWeek                     @ :631  writers: applySportsSeason_
  READ  chaosShip                      @ :636  writers: runChaosShip_
  READ  weather                        @ :740  writers: advanceSimulationCalendar_, applyWeatherModel_
  READ  canonHoods                     @ :659  writers: loadCanonNeighborhoods_
  WRITE businessDynamicsState          @ :612, :882  readers: finalizeCycleState_
  WRITE hoodBusinessMomentum           @ :612, :855  readers: runCivicRoleEngine_, hoodBusinessFactor_, hoodBusinessCity_
  WRITE hoodSpots                      @ :612, :889  readers: generateCitizensEvents_
  WRITE businessDeclines               @ :856  readers: runCareerEngine_
  WRITE businessClosures               @ :857  readers: archiveClosedBusinesses_, runCivicRoleEngine_
  WRITE worldEvents                    @ :799  readers: [76+ across all phases]; pushed onto existing array
  WRITE sportsWeekBars                 @ :880  readers: detectCalendarRipples_

OTHER CTX
  ctx.config   @ :605 (cycleCount)
  ctx.ss       @ :609, :923 (getSheetByName — also in archiveClosedBusinesses_)
  ctx.ledger   @ :913 (headers, rows — in archiveClosedBusinesses_ post-commit, Phase11-BusinessArchive)

WRITE PATH
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, revCol, 'engine.96 business dynamics drift (Annual_Revenue, Growth_Rate)') @ :863  → Business_Ledger
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, revCol, 'engine.96 business dynamics drift (Annual_Revenue)') @ :865  → Business_Ledger
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iGrow + 1, growCol, 'engine.96 business dynamics drift (Growth_Rate)') @ :866  → Business_Ledger
  INTENT  queueEnsureTabIntent_(ctx, 'Business_Archive', BIZ_ARCHIVE_HEADERS, 'engine.96 closure ledger (lazy tab, Phase-10 ensure)') @ :818  → Business_Archive
  DIRECT  ar.getRange(target, 1, 1, rowOut.length).setValues([rowOut]); bl.deleteRow(q2 + 1); @ :963, :968  → Business_Ledger, Business_Archive  [after-executor, Phase11-BusinessArchive post-commit]

TABS
  Business_Ledger   writers: applyBusinessDynamics_, generationalWealthEngine_, runCareerEngine_, processAdvancementRowsBody_   
                    readers: [11+ engine functions and test scripts]
                    manifest: docs/engine/SHEETS_MANIFEST.md:26
  Business_Archive  writers: [none — created by queueEnsureTabIntent_]   
                    readers: archiveClosedBusinesses_
                    manifest: docs/engine/SHEETS_MANIFEST.md:146
  Civic_Office_Ledger  readers: bizMayorApproval_ (via :623 call)
                    manifest: docs/engine/SHEETS_MANIFEST.md:36

OPEN WORK
  docs/plans/2026-08-01-business-lifecycle-generator.md  — engine.96 Task 5 (S413): full plan covering lifecycle drift, decline, closure, heritage mint, testing
  docs/plans/2026-09-13-codex-dial-drift-review.md  — owner dials regression, personnel parser integration, closure decision deferral
  docs/plans/2026-10-10-engine-214-mood-per-hood.md  — spot rows (hoodSpots), hood momentum feedback, hood-scoped facts
  docs/plans/2026-11-21-a-moment-has-a-place.md  — spot placement, moment-centric venue design, ECL tag list integration

HISTORY
  30920d7bd  engine.356 cut A2: a place by what the moment is
  56fb48160  engine.356: agy's read of the every-signal cut folded (SHIP-WITH-FIXES)
  c80381c63  engine.356: the hood score reads every hood signal, all dials on World_Config
  3eb7d3180  engine.356: agy's read of the hood-growth cut folded (output/antigravity)
  45710b3ed  engine.356: a business's success stems from how its hood performs
  e39a38052  engine.349 Task 14: the middle counts (every reader of a dial band reads the number)

FILES OPENED
  phase05-citizens/applyBusinessDynamics.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/plans/2026-08-01-business-lifecycle-generator.md
  docs/plans/2026-09-13-codex-dial-drift-review.md
  docs/plans/2026-10-10-engine-214-mood-per-hood.md
  docs/plans/2026-11-21-a-moment-has-a-place.md
```

WIRING CARD — applyBusinessDynamics_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/applyBusinessDynamics.js:603  function applyBusinessDynamics_(ctx) — engine.96

PHASE POSITION
  production entry : Phase5-BusinessDynamics @ godWorldEngine2.js:739  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-BusinessDynamics @ godWorldEngine2.js:2460 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (14)
  phase01-config/godWorldEngine2.js:739  safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase01-config/godWorldEngine2.js:2460  safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase05-citizens/applyBusinessDynamics.test.js:91  const out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:98  mod.applyBusinessDynamics_(ctxWith({ S: {} }));
  phase05-citizens/applyBusinessDynamics.test.js:101  mod.applyBusinessDynamics_(ctxWith({ bl: split }));
  phase05-citizens/applyBusinessDynamics.test.js:103  let threw = ''; try { mod.applyBusinessDynamics_(ctxWith({ bl: [['BIZ_ID', 'Name'], ['BIZ-1', 'x']] }));
  phase05-citizens/applyBusinessDynamics.test.js:133  let out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:137  mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:142  out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:148  out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:153  mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:257  mod.applyBusinessDynamics_(ctxWith({ S: { initiativeNeighborhoodEffects: bus } }));
  phase05-citizens/applyBusinessDynamics.test.js:372  const out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:421  mod.applyBusinessDynamics_(ctxWith({ bl: bl }));

S FIELDS
  READ  cycleId                        @ :605  writers: advanceSimulationCalendar_, v3Integration_
  READ  previousCycleState             @ :621  writers: loadPreviousCycleState_, applyShockMonitor_, finalizeCycleState_
  READ  neighborhoodState              @ :622  writers: loadNeighborhoodState_
  READ  chaosBusinessFold              @ :624  writers: accumulateBusinessEvent_
  READ  chaosNeighborhoodFold          @ :625  writers: accumulateNeighborhoodFold_, resolveChaosNeighborhoodFold_
  READ  initiativeNeighborhoodEffects  @ :626  writers: applyInitiativeImplementationEffects_
  READ  sportsWeek                     @ :631  writers: applySportsSeason_
  READ  chaosShip                      @ :636  writers: runChaosShip_
  READ  weather                        @ :740  writers: advanceSimulationCalendar_, applyWeatherModel_
  READ  canonHoods                     @ :659  writers: loadCanonNeighborhoods_
  WRITE businessDynamicsState          @ :612, :882  readers: finalizeCycleState_
  WRITE hoodBusinessMomentum           @ :612, :855  readers: runCivicRoleEngine_, hoodBusinessFactor_, hoodBusinessCity_
  WRITE hoodSpots                      @ :612, :889  readers: generateCitizensEvents_
  WRITE businessDeclines               @ :856  readers: runCareerEngine_
  WRITE businessClosures               @ :857  readers: archiveClosedBusinesses_, runCivicRoleEngine_
  WRITE worldEvents                    @ :799  readers: [76+ across all phases]; pushed onto existing array
  WRITE sportsWeekBars                 @ :880  readers: detectCalendarRipples_

OTHER CTX
  ctx.config   @ :605 (cycleCount)
  ctx.ss       @ :609, :923 (getSheetByName — also in archiveClosedBusinesses_)
  ctx.ledger   @ :913 (headers, rows — in archiveClosedBusinesses_ post-commit, Phase11-BusinessArchive)

WRITE PATH
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, revCol, 'engine.96 business dynamics drift (Annual_Revenue, Growth_Rate)') @ :863  → Business_Ledger
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, revCol, 'engine.96 business dynamics drift (Annual_Revenue)') @ :865  → Business_Ledger
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iGrow + 1, growCol, 'engine.96 business dynamics drift (Growth_Rate)') @ :866  → Business_Ledger
  INTENT  queueEnsureTabIntent_(ctx, 'Business_Archive', BIZ_ARCHIVE_HEADERS, 'engine.96 closure ledger (lazy tab, Phase-10 ensure)') @ :818  → Business_Archive
  DIRECT  ar.getRange(target, 1, 1, rowOut.length).setValues([rowOut]); bl.deleteRow(q2 + 1); @ :963, :968  → Business_Ledger, Business_Archive  [after-executor, Phase11-BusinessArchive post-commit]

TABS
  Business_Ledger   writers: applyBusinessDynamics_, generationalWealthEngine_, runCareerEngine_, processAdvancementRowsBody_   
                    readers: [11+ engine functions and test scripts]
                    manifest: docs/engine/SHEETS_MANIFEST.md:26
  Business_Archive  writers: [none — created by queueEnsureTabIntent_]   
                    readers: archiveClosedBusinesses_
                    manifest: docs/engine/SHEETS_MANIFEST.md:146
  Civic_Office_Ledger  readers: bizMayorApproval_ (via :623 call)
                    manifest: docs/engine/SHEETS_MANIFEST.md:36

OPEN WORK
  docs/plans/2026-08-01-business-lifecycle-generator.md  — engine.96 Task 5 (S413): full plan covering lifecycle drift, decline, closure, heritage mint, testing
  docs/plans/2026-09-13-codex-dial-drift-review.md  — owner dials regression, personnel parser integration, closure decision deferral
  docs/plans/2026-10-10-engine-214-mood-per-hood.md  — spot rows (hoodSpots), hood momentum feedback, hood-scoped facts
  docs/plans/2026-11-21-a-moment-has-a-place.md  — spot placement, moment-centric venue design, ECL tag list integration

HISTORY
  30920d7bd  engine.356 cut A2: a place by what the moment is
  56fb48160  engine.356: agy's read of the every-signal cut folded (SHIP-WITH-FIXES)
  c80381c63  engine.356: the hood score reads every hood signal, all dials on World_Config
  3eb7d3180  engine.356: agy's read of the hood-growth cut folded (output/antigravity)
  45710b3ed  engine.356: a business's success stems from how its hood performs
  e39a38052  engine.349 Task 14: the middle counts (every reader of a dial band reads the number)

FILES OPENED
  phase05-citizens/applyBusinessDynamics.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/plans/2026-08-01-business-lifecycle-generator.md
  docs/plans/2026-09-13-codex-dial-drift-review.md
  docs/plans/2026-10-10-engine-214-mood-per-hood.md
  docs/plans/2026-11-21-a-moment-has-a-place.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=16 toolCalls=26 in=487208 out=10063_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._