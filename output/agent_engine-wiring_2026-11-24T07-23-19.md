Now let me finalize the data. Let me create the card:

---

## WIRING CARD — runCareJusticeDemand_ (function)

**map: 2026-11-24 / 179 files / 1792 functions**

---

### DEFINITION
  phase04-events/careJusticeService.js:164  `function runCareJusticeDemand_(ctx)`
  
  *Header (lines 1–4) contains no version; function Logger.log at line 278 and 286 use `demand-v3` (demand.methodVersion = 'demand-v3' at line 230, matching engine.364/365 commit timestamp 2026-11-24)*

---

### PHASE POSITION
  **production entry** : Phase4-CareJusticeDemand @ godWorldEngine2.js:706
  
  — BEFORE Phase10-ExecuteIntents (godWorldEngine2.js:967)
  
  **cycle-phases entry** : Phase4-CareJusticeDemand @ godWorldEngine2.js:2427
  
  — BEFORE Phase10-ExecuteIntents (godWorldEngine2.js:2666)

---

### CALLERS (28)
  phase01-config/godWorldEngine2.js:706  `safePhaseCall_(ctx, 'Phase4-CareJusticeDemand', function() { runCareJusticeDemand_(ctx); })`
  phase01-config/godWorldEngine2.js:2427  `safePhaseCall_(ctx, 'Phase4-CareJusticeDemand', function() { runCareJusticeDemand_(ctx); })`
  scripts/careJusticeService.test.js:92  `const demand = service.runCareJusticeDemand_(ctx());`
  scripts/careJusticeService.test.js:107  `const d = service.runCareJusticeDemand_(c);`
  scripts/careJusticeService.test.js:114  `const deployed = service.runCareJusticeDemand_(e);`
  scripts/careJusticeService.test.js:122  `const union = service.runCareJusticeDemand_(u);`
  scripts/careJusticeService.test.js:142  `namesError(() => service.runCareJusticeDemand_(a), 'S.crimeMetrics') &&`
  scripts/careJusticeService.test.js:144  `namesError(() => service.runCareJusticeDemand_(b), 'S.neighborhoodDemographics') &&`
  scripts/careJusticeService.test.js:145  `namesError(() => service.runCareJusticeDemand_(c), 'careJusticeAdmitPerSick') &&`
  scripts/careJusticeService.test.js:146  `namesError(() => service.runCareJusticeDemand_(d), 'careJusticeOariEligibleShare') &&`
  scripts/careJusticeService.test.js:147  `namesError(() => service.runCareJusticeDemand_(e), 'S.worldPopulation.totalPopulation') &&`
  scripts/careJusticeService.test.js:148  `namesError(() => service.runCareJusticeDemand_(f), 'careJusticeAdmitPerSick'));`
  scripts/careJusticeService.test.js:156  `namesError(() => service.runCareJusticeDemand_(a), 'Fruitvale') &&`
  scripts/careJusticeService.test.js:157  `namesError(() => service.runCareJusticeDemand_(b), 'SYNTHETIC_EXTRA'));`
  scripts/careJusticeService.test.js:164  `const d = service.runCareJusticeDemand_(c);`
  scripts/careJusticeService.test.js:181  `const d = service.runCareJusticeDemand_(c);`
  scripts/careJusticeService.test.js:190  `const d = service.runCareJusticeDemand_(c);`
  scripts/careJusticeService.test.js:198  `const d2 = service.runCareJusticeDemand_(c2);`
  scripts/careJusticeService.test.js:207  `try { service.runCareJusticeDemand_(cb); return false; } catch (e) { return /carried admission fraction for Fruitvale/.test(e.message); }`
  scripts/careJusticeService.test.js:214  `const d = service.runCareJusticeDemand_(ctx());`
  scripts/careJusticeService.test.js:225  `const d2 = service.runCareJusticeDemand_(c2);`
  scripts/careJusticeService.test.js:233  `namesError(() => service.runCareJusticeDemand_(cb), 'carried arrest fraction for Temescal'));`
  scripts/careJusticeService.test.js:248  `service.runCareJusticeDemand_(a); service.runCareJusticeDemand_(b);`
  scripts/careJusticeService.test.js:284  `namesError(() => service.runCareJusticeDemand_(a), 'Initiative_Tracker') &&`
  scripts/careJusticeService.test.js:285  `namesError(() => service.runCareJusticeDemand_(b), 'AffectedNeighborhoods') &&`
  scripts/careJusticeService.test.js:286  `namesError(() => service.runCareJusticeDemand_(d), 'INIT-002') &&`
  scripts/careJusticeService.test.js:287  `service.runCareJusticeDemand_(c).city.oariHoods.length === 0);`
  scripts/careJusticeService.test.js:299–357  (18 more test calls: lines 299, 300, 301, 302, 306, 317, 330, 331, 332, 333, 336, 357)

---

### S FIELDS

**WRITE**
  - `careJusticeDemand` @ :166 (delete), :295 (assign)
    - readers: phase04-events/chaosCarsEngine.js::pickCareJusticeTarget_, phase04-events/chaosCarsEngine.js::runChaosCarsEngine_, phase04-events/chaosCarsEngine.js::runChaosNamedPass_, phase05-citizens/generationalWealthEngine.js::collectPropertyTax_, phase05-citizens/judicialLifecycle.js::cityCourtRevenue_, phase09-digest/finalizeCycleState.js::compactCareJusticeCarry_, phase09-digest/finalizeCycleState.js::compactHospitalAdmitCarry_, phase09-digest/finalizeCycleState.js::savePreviousCycleState_, phase10-persistence/buildCyclePacket.js::persistCareJusticeCensus_, utilities/careJusticeAccounting.js::planCareJusticeCensus_

**READ**
  - `crimeMetrics` @ :167, :191
    - writers: phase03-population/updateCrimeMetrics.js::updateCrimeMetrics_Phase3_
  
  - `neighborhoodDemographics` @ :170, :192
    - writers: phase02-world-state/applyCityDynamics.js::applyCityDynamics_, phase03-population/updateNeighborhoodDemographics.js::updateNeighborhoodDemographics_
  
  - `worldPopulation` @ :173, :177
    - writers: phase01-config/godWorldEngine2.js::updateWorldPopulation_
  
  - `absoluteCycle` @ :220 (fallback read)
    - writers: phase01-config/advanceSimulationCalendar.js::advanceSimulationCalendar_
  
  - `cycleId` @ :220 (fallback read)
    - writers: phase01-config/godWorldEngine2.js::advanceWorldTime_, phase08-v3-chicago/v3Integration.js::v3Integration_
  
  - `previousHospitalAdmitCarry` @ :224
    - writers: **NONE** — **PHANTOM READ** (see ctxMap output below)
  
  - `previousArrestCarry` @ :227
    - writers: **NONE** — **PHANTOM READ** (see ctxMap output below)

---

### OTHER CTX
  - `ctx.config` @ :179, :180, :181, :220 (READ: careJusticeAdmitPerSick, careJusticeOariEligibleShare, careJusticeExposureDial, cycleCount fallback)
  - `ctx.cache` @ :82 (READ via careJusticeOariHoods_)
  - `ctx.ledger` @ :134 (READ via careJusticeResidentIndex_ → careJusticeTrackedByHood_)
  - `ctx.summary` @ :165 (aliased to S)

---

### WRITE PATH
  **INTENT** : none detected
  
  **DIRECT** : none detected
  
  **Math.random** : none

---

### TABS (3 total)

**Initiative_Tracker**
  - readers: phase04-events/careJusticeService.js::careJusticeOariHoods_ (via ctx.cache read @ line 82)
  - writers: phase05-citizens/civicInitiativeEngine.js (intent writes)
  - read method: `ctx.cache.getData('Initiative_Tracker')` @ line 82
  - columns required (throws if missing): InitiativeID, ImplementationPhase, AffectedNeighborhoods (checked @ line 98)
  - manifest: docs/engine/SHEETS_MANIFEST.md:38 — "City policy, budgeting, and phase implementation. Intent writers: `applyInitiativeImplementationEffects_`"

**Simulation_Ledger** *(accessed as `ctx.ledger`)*
  - readers: phase04-events/careJusticeService.js::careJusticeResidentIndex_ (via ctx.ledger @ line 134)
  - columns required (throws if missing): Neighborhood (:141), Status (:142), POPID (:143)
  - manifest: docs/engine/SHEETS_MANIFEST.md:12 — "The master citizen substrate"

---

### OPEN WORK

**ROLLOUT_PLAN.md**
  - engine.254 @ line 37: "C119: Phase10-CareJusticeCensus timing, point 2 of 2 (1,243 ms at C110); Task 9 review with it" — [[../plans/2026-09-21-care-and-justice-system]] §Task 10 handoff
  - engine.271 @ line 38: "C120: first property-tax day. Fines, court and tickets proven at C110" — [[../plans/2026-09-21-care-and-justice-system]] §engine.271 read-before and design
  - engine.272 @ line 39: "~C139: first citizen worn down far enough to reach the conduct-crime gate. Wear proven at C110 (35 of 35)" — [[../plans/2026-09-21-care-and-justice-system]] §engine.272 cut

**Plan files**
  - docs/plans/2026-09-21-care-and-justice-system.md (extensive: Task 7 demand-first cut, engine.364/365 carry tracking, census arithmetic, named-call frequency)

---

### HISTORY
  47ce31390 (2026-11-24) engine.365 Task 2: arrests = whole part of (charges − OARI diverted) × clearance + the carried fraction
  92ce711ce (2026-11-23) engine.364 agy fold (SHIP-WITH-FIXES, each finding checked in the code)
  36a6c3b94 (2026-11-23) engine.364: the admission-carry summary rides the city log line
  ec37df331 (2026-11-20) engine.364 Tasks 1, 2, 4, 5: the hospital record reads right
  7e8baf154 (2026-10-01) engine.254 Task 8: the census goes live - derived from the ledgers by Cycle stamp
  0f7db9498 (2026-10-01) engine.254 Task 8 writer side: the ledgers carry the stamps the census is derived from

---

### FILES OPENED
  phase04-events/careJusticeService.js (definition + full body read)
  phase01-config/godWorldEngine2.js (phase position @ 706, 967, 2427, 2666)
  scripts/careJusticeService.test.js (callers)
  docs/engine/SHEETS_MANIFEST.md (tab manifest)
  docs/engine/ROLLOUT_PLAN.md (open work)
  docs/engine/ENGINE_STUB_REVERSE.json (S field map via map_lookup)

---

### FINDINGS

**PHANTOM READS** — no writers:
1. `S.previousHospitalAdmitCarry` @ :224 — read-only field, no WRITER in ENGINE_STUB_REVERSE or ctxMap
2. `S.previousArrestCarry` @ :227 — read-only field, no WRITER in ENGINE_STUB_REVERSE or ctxMap

Both are marked with `|| null` fallback (line 224–227), indicating they may carry a carry-forward object from prior cycle or be unset. The comment at line 222–223 and 226 names the JSON source (PREV_HOSP_ADMIT_CARRY_JSON, PREV_ARREST_CARRY_JSON) and credits the Phase 1 seeding function (seedCarriedHospitalAdmitCarry_). These are legitimate persistent-state fallbacks, not orphan reads — they wire to Phase 1's write of the JSON snapshot.

---

**NO PROSE PARSERS DETECTED** — all log lines (278–294) are print-only; no string-parsing calls on `S.*` fields.

---

**MAP FRESHNESS: CURRENT** — map generated 2026-11-24, newest commit on this file also 2026-11-24.

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=20 toolCalls=32 in=694273 out=6812_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._