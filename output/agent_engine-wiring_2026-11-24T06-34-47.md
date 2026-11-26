Perfect. Now I have all the data I need to assemble the wiring card.

```
WIRING CARD — persistHospitalLedger_ (function)   map: 2026-11-23 / 179 files   

DEFINITION
  phase10-persistence/buildCyclePacket.js:861  function persistHospitalLedger_(ctx)   v3.9 (file header)

PHASE POSITION
  production entry : Phase10-CyclePacket @ godWorldEngine2.js:936  — BEFORE Phase10-ExecuteIntents (line 967)
  cycle-phases     : Phase10-CyclePacket @ godWorldEngine2.js:2647 — BEFORE Phase10-ExecuteIntents (line 2666)

CALLERS (1)
  phase10-persistence/buildCyclePacket.js:83  try { hospital = persistHospitalLedger_(ctx); }

S FIELDS
  READ  hospitalEvents    @ :863   writers: chaosCarsEngine_@phase04-events/chaosCarsEngine.js, generationalEventsEngine_@phase04-events/generationalEventsEngine.js, sportsInjure_@phase05-citizens/applyGameNightMoments.js, sportsReturn_@phase05-citizens/applyGameNightMoments.js
  READ  absoluteCycle     @ :864   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js (and 48 total readers across engine)
  READ  cycleId           @ :864   writers: advanceWorldTime_@phase01-config/godWorldEngine2.js, v3Integration_@phase08-v3-chicago/v3Integration.js (and 83+ readers)
  WRITE hospitalCensus    @ :1092  readers: NONE  [ORPHAN WRITE]

OTHER CTX
  ctx.ss @ :897, :905, :1127, :1139  (Spreadsheets service)
  ctx.ledger @ :873, :880, :1017, :1022  (Simulation_Ledger rows/headers)
  ctx.config @ :1121  (unused read)
  ctx.summary @ :862 (init), :1092 (write)

WRITE PATH
  DIRECT  sheet.getRange(openRow + 1, 7, 1, 2).setValues(...) @ :952  → Hospital_Ledger  (open row transition)
  DIRECT  sheet.getRange(openRow + 1, 5).setValue(...) @ :953  → Hospital_Ledger  (backfill cause)
  DIRECT  sheet.getRange(openRow + 1, 7, 1, 5).setValues(...) @ :991  → Hospital_Ledger  (discharge/deceased)
  DIRECT  sheet.getRange(gRow + 1, 7, 1, 5).setValues(...) @ :1035  → Hospital_Ledger  (ghost-release)
  appendRowWithRetry_(sheet, newRow, ...) @ :979, :1072  → Hospital_Ledger  (new admission / missed-admit)
  persistWithRetry_(...) wrapper @ :951, :990, :1034  (wraps all DIRECT writes above)
  Math.random: NOT FOUND

TABS
  Hospital_Ledger  writers: persistHospitalLedger_@phase10-persistence/buildCyclePacket.js  readers: hospitalPriorStatusForDischarge_@phase04-events/generationalEventsEngine.js, persistCareJusticeCensus_@phase10-persistence/buildCyclePacket.js, persistHospitalLedger_@phase10-persistence/buildCyclePacket.js  manifest: docs/engine/SHEETS_MANIFEST.md:171

OPEN WORK
  engine.254 Task 8 R2-1 @ phase10-persistence/buildCyclePacket.js:912  (HOSPITAL_RECEIPT_HEADERS_ column position)
  engine.364 (Tasks 1, 2, 4, 5) @ phase10-persistence/buildCyclePacket.js:988  (StatusNow discipline on close)
  engine.102 (S361) @ phase10-persistence/buildCyclePacket.js:1002–1046  (ghost-bed reconcile logic)
  engine.105 @ phase10-persistence/buildCyclePacket.js:1049–1078  (missed-admission reconcile)
  docs/plans/2026-09-21-care-and-justice-system.md (engine.254: hospital record chain wiring, hospital + judicial ledger schemas, task breakdown)
  docs/plans/2026-11-23-hospital-record-reads-right.md (engine.364: StatusNow discharge/deceased on close, not citizen life status)

HISTORY
  ec37df331  engine.364 Tasks 1, 2, 4, 5: the hospital record reads right. [engine/sheet]
  8d0f458dc  engine.94 B.3 v3 F8: the calendar election is deleted — no scheduled election exists…
  48225d285  engine.254 Task 10: the HospitalStrain line gets its own kept packet section
  9baec7c59  engine.254 Task 10 talk-back built: census city beds against their own middle
  3c25827dc  engine.254 Task 8 follow-up: rows below the census are reported on every outcome
  a22fa4287  engine.254 Task 8 census: codex confirm-pass fixes - exits matched to their own row, foreign rows refused

FILES OPENED
  phase10-persistence/buildCyclePacket.js (definition, callers, body, tabs, write-path)
  phase01-config/godWorldEngine2.js (phase position, entry points)
  docs/engine/ENGINE_STUB_REVERSE.json (S-field map via map_lookup)
  docs/engine/SHEETS_MANIFEST.md (Hospital_Ledger entry)
  docs/engine/ROLLOUT_PLAN.md (searched, no matches for function name)
  docs/plans/ (multiple files for context, no functional source of record)
  scripts/ (prose-parser search: no PROSE-PARSER findings on the orphaned hospitalCensus field)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=21 toolCalls=26 in=581820 out=4090_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._