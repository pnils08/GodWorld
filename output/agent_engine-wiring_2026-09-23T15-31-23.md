Excellent. Now I have the full picture. Let me now finalize the card with all findings, being precise about which tools I ran:

---

WIRING CARD — processRelocations_ (function)   map: 2026-09-22 / 184 files   MAP STALE — regenerate with /stub-engine

DEFINITION
  phase05-citizens/migrationTrackingEngine.js:615  function processRelocations_(ctx, cycle)  v1.2

PHASE POSITION
  production entry : Phase5-MigrationTracking @ godWorldEngine2.js:393  — BEFORE Phase10-ExecuteIntents (:598)
  cycle-phases     : Phase5-MigrationTracking @ godWorldEngine2.js:2145  — BEFORE Phase10-ExecuteIntents (:2336)

CALLERS (1)
  phase05-citizens/migrationTrackingEngine.js:456  var moves = processRelocations_(ctx, cycle);

S FIELDS
  READ  neighborhoodState  @ :640  writers: loadNeighborhoodState_@phase02-world-state/loadNeighborhoodState.js
  WRITE storyHooks  @ :770, :783  readers: runCyclePhases_@phase01-config/godWorldEngine2.js, runWorldCycle@phase01-config/godWorldEngine2.js, generateMigrationHooks_@phase05-citizens/migrationTrackingEngine.js, storyHookEngine_@phase07-evening-media/storyHook.js, buildCyclePacket_@phase10-persistence/buildCyclePacket.js, +22 others (MAP INCOMPLETE)
  WRITE relocationPressureDeltas  @ :800, :801-804  readers: updateNeighborhoodTrajectories_@phase05-citizens/neighborhoodTrajectoryEngine.js:148  [NOT IN MAP — processRelocations_ omitted from writers]

OTHER CTX
  ctx.ledger.headers @ :616
  ctx.ledger.rows @ :617, :645, :751
  ctx.ledger.dirty @ :759
  ctx.rng @ :620
  ctx.ss @ :680
  ctx.summary @ :640, :770, :783, :799

WRITE PATH
  DIRECT  sheet.getRange(r + 1, iHood + 1).setValue(destHood) @ migrationTrackingEngine:841  → Household_Ledger  [BEFORE executor — documented exception class, own-tracking tab]
  DIRECT  sheet.getRange(r + 1, iRent + 1).setValue(destRent) @ migrationTrackingEngine:844  → Household_Ledger  [BEFORE executor]
  DIRECT  sheet.getRange(r + 1, iUpdated + 1).setValue(ctx.now) @ migrationTrackingEngine:845  → Household_Ledger  [BEFORE executor]
  LEDGER mutation  mRow[iNeighborhood] / mRow[iMigIntent] / mRow[iMigReason] / mRow[iMigDest] / mRow[iMigCycle]  @ :753-757  [committed via ctx.ledger.dirty Phase 10]

TABS
  Household_Ledger  writers: updateHouseholdLedgerMove_@:841, :844-845; readers: buildHouseholdHousingMap_@:680, updateHouseholdLedgerMove_@:817  manifest: SHEETS_MANIFEST.md:171

OPEN WORK
  engine.93  Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 commute matrix/housing response, 3 sandbox suites, mutation-tested); open: live-cycle proof only; capital pool deferred to civic.14
  engine.161  (S416, builder 2026-09-04): the per-cycle ceiling is a SHARE of the city's movable units (World_Config relocationMaxShare, 0.05 → ≈43 of 849 at C105), not a fixed 2
  docs/plans/2026-06-14-ledger-representative-sample-migration-removal.md
  docs/plans/2026-09-20-housing-lever.md

HISTORY
  bb15f9c9  engine.255 Task 8: the engine.251 discount lever removed — relief writer + four Household_Ledger relief columns + net-rent helpers (householdFormationEngine), the gross/relief move branch (migrationTrackingEngine; G-EC70 refusal stays), the gross pricing/purchase-clear branches (generationalWealthEngine)
  772ae416  G-EC70 (builder ruling 2026-09-22): ownership survives migration — processRelocations_ anchors every household unit that is not rented (owned or unknown), updateHouseholdLedgerMove_ refuses an owned row
  31606eb6  gap log: owner-move defect is G-EC70 (last entry was G-EC69), pointers relabelled
  7d2f078e  engine.251: relief writer stamps gross/relief on rented movers only (bench C110 found an owned mover rebased by migration — filed G-EC87); bench proof of the disabled path recorded
  7bb4fc3a  engine.251 housing lever, Tasks 1-6: tenant rent discount wired producer -> S.initiativeHousingRelief -> Household_Ledger, off by default (civicHousingReliefEnabled 0)
  ea3fda33  S463 engine.231: the raw-carried hook reaches a desk and a journalist — Phase-5 hooks go through makeHook's own match path; producers carry domain at the source

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=29 toolCalls=37 in=659039 out=8484_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._