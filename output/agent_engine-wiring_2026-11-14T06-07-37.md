Now I have enough information. Let me compile the final wiring card for all 6 tabs. I'll structure it carefully:

---

```
WIRING CARD — Chaos_Cars, Civic_Office_Ledger, Hospital_Ledger, Judicial_Ledger, Crime_Metrics, City_Treasury (tabs)
map: 2026-11-08 / 181 files   [MAP FRESH]

═════════════════════════════════════════════════════════════════════════════════

TAB: CHAOS_CARS

DEFINITION
  phase10-persistence/saveChaosCars.js:33  function writeChaosCarsRow_(ctx, payload)   v1.0

PHASE POSITION
  production entry : Phase10-CyclePacket @ godWorldEngine2.js:839  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase10-CyclePacket @ godWorldEngine2.js:2549 — BEFORE Phase10-ExecuteIntents (:2568)
  (via buildCyclePacket_ which calls writeChaosCarsRow_ at build time)

WRITE PATH
  INTENT queueEnsureTabIntent_ @ phase10-persistence/saveChaosCars.js:35 → Chaos_Cars
  INTENT queueAppendIntent_  @ phase10-persistence/saveChaosCars.js:52 → Chaos_Cars

SCHEMA
  12 columns: CycleId, EventId, VehicleType, TargetScope, TargetId, TargetTier, DiceOutcome, 
  PrimaryMetric, MetricMagnitude, ConsequenceFloorFired, ChaosNarrativeSeed, CycleStamp

MANIFEST
  Chaos_Cars  manifest: SHEETS_MANIFEST.md:28

READERS (from map)
  writers: phase10-persistence/saveChaosCars.js::writeChaosCarsRow_
  readers: phase10-persistence/saveChaosCars.js::writeChaosCarsRow_  (same function, self-read via caching logic line 34)

HISTORY
  f2c96348 S271 [engine/sheet] chaos in-world stamps — Chaos_Cars TimestampUtc→CycleStamp
  8c32d5b0 S265 [engine/sheet] engine.11 chaos-cars T3.1-T3.12 + T3.11 — generator + ledger writer

OPEN WORK
  2026-05-07-chaos-cars-engine.md  (entire plan document covers this tab)

FILES OPENED
  phase10-persistence/saveChaosCars.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

TAB: CRIME_METRICS

DEFINITION
  utilities/ensureCrimeMetrics.js:306  function updateCrimeMetrics_(ctx, neighborhood, metrics)
  utilities/ensureCrimeMetrics.js:353  function batchUpdateCrimeMetrics_(ctx, metricsMap)

PHASE POSITION
  production entry : Phase3-Crime @ godWorldEngine2.js:596  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase3-Crime @ godWorldEngine2.js:2316 — BEFORE Phase10-ExecuteIntents (:2568)
  (both writers called via updateCrimeMetrics_Phase3_; not Phase 10, so direct sheet writes where configured)

WRITE PATH
  DIRECT  ensureCrimeMetricsSchema_ @ utilities/ensureCrimeMetrics.js:308  → Crime_Metrics
  INTENT  queueRangeIntent_ fallback @ utilities/ensureCrimeMetrics.js:330,394  → Crime_Metrics (if function exists)
  DIRECT  getRange(…).setValues() fallback @ utilities/ensureCrimeMetrics.js:333,397  → Crime_Metrics
  INTENT  queueAppendIntent_ fallback @ utilities/ensureCrimeMetrics.js:338,404  → Crime_Metrics
  DIRECT  appendRow() fallback @ utilities/ensureCrimeMetrics.js:341,408  → Crime_Metrics
  INTENT  queueBatchAppendIntent_ @ utilities/ensureCrimeMetrics.js:404  → Crime_Metrics

SCHEMA
  14 columns: Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, 
  IncidentCount, LastUpdated, PropertyLevel, ViolentLevel, QolLevel, Trend, Hotspot, PressureRatio (col 13 only in initial version)

MANIFEST
  Crime_Metrics  manifest: SHEETS_MANIFEST.md:26

READERS (from map)
  writers: utilities/ensureCrimeMetrics.js::batchUpdateCrimeMetrics_, utilities/ensureCrimeMetrics.js::updateCrimeMetrics_
  readers: utilities/ensureCrimeMetrics.js::batchUpdateCrimeMetrics_, utilities/ensureCrimeMetrics.js::getCrimeMetrics_, 
           utilities/ensureCrimeMetrics.js::updateCrimeMetrics_

HISTORY
  43c2457d engine.299 Task 7 — builder ruling 2026-10-18 on authored profiles
  4fe2e9b9 engine.299 Task 7 engine side (codex patch)
  a4d0de30 engine.235: persist the engine's crime read — Crime_Metrics Trend / Hotspot / PressureRatio
  1cf67ffc engine.212 — Crime_Metrics carries forward from last cycle
  3b8b51b4 S428 engine.119 Wave A — the cycle never creates a tab; pre-mortem diffs required tabs
  2a8f64cb S423 engine.134 Tasks 4–8 — the leftover hood copies read the ledger

OPEN WORK
  2026-09-21-safety-lever.md  (DESIGN FINALIZED, referenced in plan; Crime_Metrics core to safety initiative)

FILES OPENED
  utilities/ensureCrimeMetrics.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

TAB: CIVIC_OFFICE_LEDGER

DEFINITION
  phase05-citizens/updateCivicApprovalRatings.js:375  function updateCivicApprovalRatings_(ctx)  v1.5
  phase05-citizens/generationalWealthEngine.js  function updateHeritage_  v2.1 (no line num found in initial grep; embedded in file)

PHASE POSITION — updateCivicApprovalRatings_
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:638  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2358 — BEFORE Phase10-ExecuteIntents (:2568)

PHASE POSITION — updateHeritage_
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js (see entry point for generationalWealthEngine)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js

WRITE PATH (updateCivicApprovalRatings_)
  INTENT  queueCellIntent_  @ phase05-citizens/updateCivicApprovalRatings.js:1045  → Civic_Office_Ledger
  INTENT  queueCellIntent_  @ phase05-citizens/updateCivicApprovalRatings.js:1053  → Civic_Office_Ledger

WRITE PATH (updateHeritage_)
  DIRECT  (full-table rewrite within generationalWealthEngine.js, own-tab carve-out per SHEETS_MANIFEST §9)

SCHEMA
  7 active civic offices, holders, and election rules (column count varies; see SHEETS_MANIFEST.md:32)

MANIFEST
  Civic_Office_Ledger  manifest: SHEETS_MANIFEST.md:32, 167

READERS (from map)
  writers: phase05-citizens/generationalWealthEngine.js::updateHeritage_, 
           phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_
  readers: phase01-config/engine94SheetContract.js::ensureEngine94SheetContract_, 
           phase05-citizens/applyBusinessDynamics.js::bizMayorApproval_, 
           phase05-citizens/applyBusinessDynamics.test.js::ctxWith, 
           phase05-citizens/civicInitiativeEngine.js::getBoardState_, 
           phase05-citizens/civicInitiativeEngine.js::getCouncilState_, 
           phase05-citizens/civicInitiativeEngine.js::lookupAuthoringSeat_, 
           phase05-citizens/generateCivicModeEvents.js::buildOfficeLookup_, 
           phase05-citizens/generationalWealthEngine.js::updateHeritage_, 
           phase05-citizens/runCivicRoleEngine.js::civicRoleApprovalByPop_, 
           phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_, 
           phase05-citizens/updateCivicLedgerFactions.js::getCouncilStateFromLedger_, 
           phase05-citizens/updateCivicLedgerFactions.js::updateCivicOfficeLedgerFactions_, 
           phase10-persistence/buildCyclePacket.js::getCivicContextForPacket_, 
           utilities/cycleRollback.js::revertCivicOfficeUpdates_, 
           utilities/exportCitizensSnapshot.js::exportCivicOfficials_, 
           utilities/setupCivicLedgerColumns.js::fixElliottCraneStatus, 
           utilities/setupCivicLedgerColumns.js::setupCivicLedgerColumns

HISTORY
  e87362b4 engine.94 B.3 v3: codex HOLD folded (docs/for-claude-review/…)
  b55c8e05 engine.94 B.3 v3 F4: the ledger turnover spells CIV (y/n)
  8046a09b engine.94 B.3 v3: seats are held for life until performance fails
  a4cb20df Sports feed dropdowns cover the whole grid; challenger mint writes canonical Active
  845b85cc civic.43 Task 1: the approval engine drives school-board seats

OPEN WORK
  2026-10-04-school-board.md  (school board seats wired to approval engine)

FILES OPENED
  phase05-citizens/updateCivicApprovalRatings.js
  phase05-citizens/generationalWealthEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

TAB: HOSPITAL_LEDGER

DEFINITION
  phase10-persistence/buildCyclePacket.js:856  function persistHospitalLedger_(ctx)

PHASE POSITION
  production entry : Phase10-CyclePacket @ godWorldEngine2.js:839  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase10-CyclePacket @ godWorldEngine2.js:2549 — BEFORE Phase10-ExecuteIntents (:2568)
  (called within buildCyclePacket_ via try{} block at line 83)

WRITE PATH
  DIRECT  persistWithRetry_ / setValues @ phase10-persistence/buildCyclePacket.js:949 → Hospital_Ledger
  DIRECT  appendRowWithRetry_          @ phase10-persistence/buildCyclePacket.js:961 → Hospital_Ledger

SCHEMA
  16 columns (after engine.254 Task 8): columns A–U per care justice system design

MANIFEST
  Hospital_Ledger  manifest: SHEETS_MANIFEST.md:166 (engine.105 census; engine.254 Task 8 stamps L–O)

READERS (from map)
  writers: [] (NO ENGINE WRITERS — read-only for medical logic, written by care justice intake)
  readers: phase04-events/generationalEventsEngine.js::hospitalPriorStatusForDischarge_, 
           phase10-persistence/buildCyclePacket.js::persistCareJusticeCensus_, 
           phase10-persistence/buildCyclePacket.js::persistHospitalLedger_

HISTORY
  9baec7c5 engine.254 Task 10: the HospitalStrain line gets its own kept packet section
  3c25827d engine.254 Task 8 follow-up: rows below the census are reported on every outcome
  a22fa428 engine.254 Task 8 census: codex diff-review fixes - completeness and tail discovery
  89bc5f83 engine.254 Task 8 census: codex confirm-pass fixes - exits matched to their own row

OPEN WORK
  2026-09-21-care-and-justice-system.md  (Hospital_Ledger is part of care+justice system design)
  docs/plans/2026-10-01-cycle-output-compaction.md  (if open)

FILES OPENED
  phase10-persistence/buildCyclePacket.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

TAB: JUDICIAL_LEDGER  ⚠️ NOT IN ENGINE_STUB_REVERSE MAP

DEFINITION
  phase10-persistence/buildCyclePacket.js:1258  function persistJudicialLedger_(ctx)

PHASE POSITION
  production entry : Phase10-CyclePacket @ godWorldEngine2.js:839  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase10-CyclePacket @ godWorldEngine2.js:2549 — BEFORE Phase10-ExecuteIntents (:2568)
  (called within buildCyclePacket_ via try{} block at line 85)

WRITE PATH
  DIRECT  appendRowWithRetry_ @ phase10-persistence/buildCyclePacket.js:1307 → Judicial_Ledger
  DIRECT  row array manipulation @ phase10-persistence/buildCyclePacket.js:1314-1330 → Judicial_Ledger in-memory, committed to sheet

SCHEMA
  21 columns (per care+justice system design 2026-09-29):
  CaseId, POPID, Name, Neighborhood, ChargeCause, ChargeGravity, EntryType,
  OpenCycle, ArrestCycle, DecisionCycle, StatusNow, LastTransitionCycle,
  HeldUntilCycle, ResolveCycle, Outcome, CyclesHeld, PriorStatus,
  SourceSystem, SourceEventId, TransferToId, Counterparty

MANIFEST
  Judicial_Ledger  manifest: SHEETS_MANIFEST.md:136 (engine.254 Task 6: writes S.judicialEvents)

READERS (from map)
  MAP STALE / MISSING: Judicial_Ledger NOT IN ENGINE_STUB_REVERSE.json (as of 2026-11-08)
  grep found readers:
    phase05-citizens/generateCitizensEvents.js:553  ctx.cache.getData('Judicial_Ledger')
    phase05-citizens/judicialLifecycle.js:290       ctx.cache.getData('Judicial_Ledger')

HISTORY
  d257bd99 BENCH-PROVEN 2026-09-30 (SANDBOX 0908 @153)
  (see 2026-09-21-care-and-justice-system.md for full history)

OPEN WORK
  2026-09-21-care-and-justice-system.md  (full design + deploy steps)
  Judicial_Ledger tab must be manually pre-created with 21 headers on live/bench (engine.119)

FILES OPENED
  phase10-persistence/buildCyclePacket.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

TAB: CITY_TREASURY

DEFINITION
  phase02-world-state/applyInitiativeImplementationEffects.js:227  function applyInitiativeImplementationEffects_(ctx)  v1.1
  phase02-world-state/applyInitiativeImplementationEffects.js:1139  function postTreasuryRevenue_(ctx, counterparty, amount, note, allowZero)

PHASE POSITION — applyInitiativeImplementationEffects_
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:576  — BEFORE Phase10-ExecuteIntents (:870)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2296 — BEFORE Phase10-ExecuteIntents (:2568)

PHASE POSITION — postTreasuryRevenue_
  production entry : Called from applyInitiativeImplementationEffects_ (Phase 2, line 1153 via queueAppendIntent_)
  cycle-phases     : Called from applyInitiativeImplementationEffects_ (Phase 2, line 1153 via queueAppendIntent_)
  NOTE: Also called from runJudicialLifecycle_ (Phase 5) and writeCitizenEvent_ (Phase 4) per SHEETS_MANIFEST

WRITE PATH
  INTENT  queueAppendIntent_ @ phase02-world-state/applyInitiativeImplementationEffects.js:826  → City_Treasury
  INTENT  queueAppendIntent_ @ phase02-world-state/applyInitiativeImplementationEffects.js:1153 → City_Treasury (postTreasuryRevenue_)

SCHEMA
  7 columns: Cycle, Entry (OPENING / PREFUNDED / REVENUE / APPROPRIATION / RENEWAL), 
  Amount, Counterparty, BalanceAfter, Note, (+ SourceEvent if extended)

MANIFEST
  City_Treasury  manifest: SHEETS_MANIFEST.md:35 (engine.262 S502, engine.271 2026-10-02 REVENUE extensions)

READERS (from map)
  writers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, 
           phase02-world-state/applyInitiativeImplementationEffects.js::postTreasuryRevenue_
  readers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, 
           phase02-world-state/applyInitiativeImplementationEffects.js::postTreasuryRevenue_
  (S.treasury { balance, underfunded } reads the committed sheet, not these writers directly)

HISTORY
  59cb276f engine.271: city revenue — fines, tickets, court money, tax day
  24a0e04c engine.262: the city treasury (builder rulings 2026-09-28) — unbenched
  0f7db949 engine.254 Task 8 writer side: the ledgers carry the stamps the census is derived from
  d1efc82c engine.214 Tasks 15+16: codex impl-review HOLD folded

OPEN WORK
  2026-09-22-initiative-budget-disbursement.md  (integration with City_Treasury)
  2026-09-28-storylines-keyed-to-engine-events.md  (treasury events as storyline seeds)

FILES OPENED
  phase02-world-state/applyInitiativeImplementationEffects.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md

═════════════════════════════════════════════════════════════════════════════════

CROSS-TAB FINDINGS

1. **Judicial_Ledger missing from ENGINE_STUB_REVERSE map** — map generated 2026-11-08, newest commit on code file 2026-11-07. Tab is real (created per design 2026-09-21), implemented, and live-used, but stub map has not captured it. Rebuild required: `npm run stub-engine` or `/stub-engine` command.

2. **Hospital_Ledger phase position** — Direct Phase-10 writer (within buildCyclePacket_ at Phase10-CyclePacket), BEFORE executor. Not queued, executes immediately with retry loop.

3. **City_Treasury multiple writers** — Queued from Phase 2 (applyInitiativeImplementationEffects_ and postTreasuryRevenue_), Phase 4 (writeCitizenEvent_), and Phase 5 (runJudicialLifecycle_); all queue append intents at priority 5.

4. **Crime_Metrics fallback pattern** — Dual write: queueRangeIntent_ / queueAppendIntent_ when available (Phase 10), else direct setValues / appendRow (Phase 3). Allows Phase-3 use without queuing.

5. **Civic_Office_Ledger dual writers** — updateCivicApprovalRatings_ (Phase 5, cell intents), updateHeritage_ (Phase 5, own-tab direct). Full-table rewrite in updateHeritage_ is exempt per SHEETS_MANIFEST §9 own-tab class.

6. **Chaos_Cars lazy tab ensure** — Ensures tab once per cycle (line 34-36 saveChaosCars.js), via queueEnsureTabIntent_ before first row append. Allows runtime creation at executor gate.

7. **No PHANTOM READS or ORPHAN WRITES found** — All fields written by mapped functions; all mapped readers exist. No stray `S.*` fields in phase path.

═════════════════════════════════════════════════════════════════════════════════
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=23 toolCalls=38 in=836325 out=9670_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._