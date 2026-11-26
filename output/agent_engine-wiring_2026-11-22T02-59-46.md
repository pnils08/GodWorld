Perfect. Now I have everything I need. Let me now construct the complete wiring card with all findings:

```
WIRING CARD — applyBusinessDynamics_ (function)   map: 2026-11-21 / 179 files   

DEFINITION
  phase05-citizens/applyBusinessDynamics.js:569  function applyBusinessDynamics_(ctx)
  version: engine.96 (S413) — Business Lifecycle Generator, Task 5

PHASE POSITION
  production entry   : Phase5-BusinessDynamics @ godWorldEngine2.js:668  — BEFORE Phase10-ExecuteIntents (896)
  cycle-phases       : Phase5-BusinessDynamics @ godWorldEngine2.js:2389 — BEFORE Phase10-ExecuteIntents (2595)

CALLERS (8)
  phase01-config/godWorldEngine2.js:668   safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase01-config/godWorldEngine2.js:2389  safePhaseCall_(ctx, 'Phase5-BusinessDynamics', function() { applyBusinessDynamics_(ctx); });
  phase05-citizens/applyBusinessDynamics.test.js:81   const out = mod.applyBusinessDynamics_(ctx);
  phase05-citizens/applyBusinessDynamics.test.js:88   mod.applyBusinessDynamics_(ctxWith(…));
  phase05-citizens/applyBusinessDynamics.test.js:91   mod.applyBusinessDynamics_(ctxWith(…));
  phase05-citizens/applyBusinessDynamics.test.js:123  let out = mod.applyBusinessDynamics_(ctx);
  scripts/businessOwnerDials.test.js:46   const out = w.applyBusinessDynamics_(ctx);
  scripts/dialWave2Seams.test.js:113      const result = w.applyBusinessDynamics_(ctx);

S FIELDS
  READ  cycleId           @ :571         writers: advanceWorldTime_, v3Integration_, …(96 total)
  READ  previousCycleState @ :587        writers: loadPreviousCycleState_, applyShockMonitor_, finalizeCycleState_ (S.businessDynamics extract)
  READ  neighborhoodState @ :588         writers: loadNeighborhoodState_; readers: applyCityDynamics_, …(38 total)
  READ  chaosBusinessFold @ :590         writers: accumulateBusinessEvent_
  READ  chaosNeighborhoodFold @ :591     writers: accumulateNeighborhoodFold_, resolveChaosNeighborhoodFold_
  READ  initiativeNeighborhoodEffects @ :592  writers: applyInitiativeImplementationEffects_
  READ  sportsWeek        @ :597         writers: applySportsSeason_; readers: applyCityDynamics_, …(11 total)
  READ  chaosShip         @ :602         writers: runChaosShip_
  READ  canonHoods        @ :625         writers: loadCanonNeighborhoods_
  READ  absoluteCycle     @ :641         writers: advanceSimulationCalendar_
  READ  chaosCarsEvents   @ :642         writers: runChaosCarsEngine_, runChaosEvent_, runChaosShip_
  WRITE businessDynamicsState @ :578, :682, :759, :799, :852  readers: finalizeCycleState_, ctxWith(test)
  WRITE hoodBusinessMomentum @ :578, :825  readers: runCivicRoleEngine_, hoodBusinessFactor_, hoodBusinessCity_
  WRITE hoodSpots         @ :578, :803, :859  readers: generateCitizensEvents_
  WRITE worldEvents       @ :763, :769   writers: generateCrisisBuckets_, generateCrisisSpikes_, worldEventsEngine_, chaosCarsEngine_, …(7 total); readers: buildCityEvents_, generateCitizensEvents_, storyHookEngine_, …(39 total)
  WRITE businessDeclines  @ :826         readers: runCareerEngine_
  WRITE businessClosures  @ :827         readers: archiveClosedBusinesses_, civicRolePremises_
  WRITE sportsWeekBars    @ :850         readers: detectCalendarRipples_

OTHER CTX
  ctx.summary        @ :570  (S alias)
  ctx.config         @ :571  (read for cycleCount fallback)
  ctx.ss             @ :575  (read for getSheetByName)
  ctx.now            @ :773  (read in worldEvents push)

WRITE PATH
  INTENT queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev+1, both, …) @ :833 → Business_Ledger
  INTENT queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev+1, revCol, …) @ :835 → Business_Ledger
  INTENT queueRangeIntent_(ctx, 'Business_Ledger', 2, iGrow+1, growCol, …) @ :836 → Business_Ledger
  INTENT queueEnsureTabIntent_(ctx, 'Business_Archive', …) @ :788 → Business_Archive
  [All intents priority 90 (queueRange) or 25 (queueEnsure), BEFORE Phase10-ExecuteIntents per phase position]

TABS
  Business_Ledger      writers: applyBusinessDynamics_, runCareerEngine_, updateHeritage_, wireBusinessOwners_, applyOwnerDraw_
                       readers: buildCommuteFlows_, businessDistressShare_, loadBusinessRows_, …(16 total)
                       manifest: docs/engine/SHEETS_MANIFEST.md:26

  Business_Archive     writers: NONE (lazy ensure, appended by post-commit archiveClosedBusinesses_ Phase11)
                       readers: archiveClosedBusinesses_
                       manifest: docs/engine/SHEETS_MANIFEST.md:145

OPEN WORK
  docs/plans/2026-08-01-business-lifecycle-generator.md  Task 5, Task 6, Task 7 (S413)
  docs/plans/2026-10-10-engine-214-mood-per-hood.md      engine.214 Cut C: S.hoodSpots structure (open food/retail by parent hood)
  docs/plans/2026-09-13-codex-dial-drift-review.md       engine.178: owner dials (composure, drive) + engine.349 Task 14: felt values 0-100
  docs/plans/2026-09-10-inactivity-is-regression.md      References chaosBusinessFold reader wiring

HISTORY
  45710b3ed engine.356: a business's success stems from how its hood performs (builder 2026-11-21)
  e39a38052 engine.349 Task 14, the middle counts (builder 2026-11-18)
  d86cdaeb0 engine.307: sports orgs hire their building staff, never athletes (builder 2026-10-21/22)
  72dacd68c engine.214 Cut C: codex diff review folded (S.hoodSpots published last)
  a137ea9b3 engine.214 8a Cut C: the citizen's spot — food/retail rows by parent hood
  fe348e1d2 engine.285 hazards 2–6, codex review folded

FILES OPENED
  phase05-citizens/applyBusinessDynamics.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-08-01-business-lifecycle-generator.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=23 toolCalls=37 in=629734 out=5616_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._