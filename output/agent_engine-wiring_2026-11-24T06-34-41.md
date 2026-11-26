Now I have all the information. Let me compile the complete wiring card:

```
WIRING CARD — runCareJusticeDemand_ (function)   map: 2026-11-23 / 179 files   

DEFINITION
  phase04-events/careJusticeService.js:162  function runCareJusticeDemand_(ctx)

PHASE POSITION
  production entry : Phase4-CareJusticeDemand @ godWorldEngine2.js:706  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase4-CareJusticeDemand @ godWorldEngine2.js:2427  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (2)
  phase01-config/godWorldEngine2.js:706  runCareJusticeDemand_(ctx)
  phase01-config/godWorldEngine2.js:2427  runCareJusticeDemand_(ctx)

S FIELDS
  WRITE careJusticeDemand   @ :280   readers: phase04-events/chaosCarsEngine.js::pickCareJusticeTarget_, phase04-events/chaosCarsEngine.js::runChaosCarsEngine_, phase04-events/chaosCarsEngine.js::runChaosNamedPass_, phase05-citizens/generationalWealthEngine.js::collectPropertyTax_, phase05-citizens/judicialLifecycle.js::cityCourtRevenue_, phase09-digest/finalizeCycleState.js::compactHospitalAdmitCarry_, phase09-digest/finalizeCycleState.js::savePreviousCycleState_, phase10-persistence/buildCyclePacket.js::persistCareJusticeCensus_, utilities/careJusticeAccounting.js::planCareJusticeCensus_
  READ  crimeMetrics   @ :165, :189   writers: phase03-population/updateCrimeMetrics.js::updateCrimeMetrics_Phase3_
  READ  neighborhoodDemographics   @ :168, :190   writers: phase02-world-state/applyCityDynamics.js::applyCityDynamics_, phase03-population/updateNeighborhoodDemographics.js::updateNeighborhoodDemographics_
  READ  worldPopulation   @ :171, :175   writers: phase01-config/godWorldEngine2.js::updateWorldPopulation_
  READ  previousHospitalAdmitCarry   @ :222   writers: phase01-config/loadPreviousEvening.js::seedCarriedHospitalAdmitCarry_
  READ  absoluteCycle   @ :218   writers: phase01-config/advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  cycleId   @ :218   writers: phase01-config/godWorldEngine2.js::advanceWorldTime_, phase08-v3-chicago/v3Integration.js::v3Integration_

OTHER CTX
  ctx.config @ :177, :179, :218
  ctx.cache @ :77 (in careJusticeOariHoods_)
  ctx.ledger @ :132 (in careJusticeResidentIndex_)
  ctx.cycle @ :218

WRITE PATH
  (none — no INTENT or DIRECT writes in function body)
  Math.random: NOT FOUND

TABS
  Initiative_Tracker  readers: careJusticeOariHoods_   writers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, phase05-citizens/civicInitiativeEngine.js::createInitiative_, phase05-citizens/householdFormationEngine.js::applyFundDisbursementBody_, phase05-citizens/runCareerEngine.js::runCareerEngine_, phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_   manifest: SHEETS_MANIFEST.md:38

OPEN WORK
  (no matches in ROLLOUT_PLAN.md for runCareJusticeDemand_)
  docs/plans/2026-09-21-care-and-justice-system.md (multiple sections on careJusticeDemand implementation)

HISTORY
  36a6c3b94 engine.364: the admission-carry summary rides the city log line
  ec37df331 engine.364 Tasks 1, 2, 4, 5: the hospital record reads right.
  7e8baf154 engine.254 Task 8: the census goes live
  0f7db9498 engine.254 Task 8 writer side: the ledgers carry the stamps
  67a8a912e engine.254 Task 6: detained gates, custody carried by the case
  f79bbe205 engine.254 Task 7b: cop-car named-hit frequency follows demand

FILES OPENED
  phase04-events/careJusticeService.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/plans/2026-09-21-care-and-justice-system.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=26 toolCalls=33 in=736782 out=4897_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._