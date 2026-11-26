Perfect. Now I have all the information I need. Let me compile the wiring card:

```
WIRING CARD — Story_Seed_Deck (tab)   map: 2026-11-21 / 180 files   

DEFINITION
  docs/engine/SHEETS_MANIFEST.md:80  Story_Seed_Deck: Queued ideas for LLM articles.

STUB_REVERSE
  writers: phase10-persistence/saveV3Seeds.js::saveV3Seeds_
  readers: phase07-evening-media/buildContractSeeds.js::contractSeedUsageTally_, phase10-persistence/saveV3Seeds.js::migrateSeedDeckV4_, phase10-persistence/saveV3Seeds.js::saveV3Seeds_, utilities/cycleRollback.js::previewRollbackToCycle78, utilities/cycleRollback.js::rollbackToCycle78

PHASE POSITION
  production entry : Phase10-Seeds @ godWorldEngine2.js:861  — BEFORE Phase10-ExecuteIntents (896)
  cycle-phases     : Phase10-Seeds @ godWorldEngine2.js:2573  — BEFORE Phase10-ExecuteIntents (2595)

WRITERS
  phase10-persistence/saveV3Seeds.js:138-145 | queueBatchAppendIntent_ | INTENT → Story_Seed_Deck
    — function saveV3Seeds_ v4.0 (phase10-persistence/saveV3Seeds.js:91)
    — called by godWorldEngine2.js:861 (prod) and :2573 (cycle-phases)
    — precondition: S.contractSeeds.length > 0 (returns early at :96 if not)
  phase10-persistence/saveV3Seeds.js:63-89 | migrateSeedDeckV4_ (direct writes via setName, setValues)
    — setValues @ :74 (header extend P/Q/R for v4.1→v4.2)
    — setName @ :84 (v3 deck park to Story_Seed_Deck_v3_legacy[_n])
    — called by saveV3Seeds_ @ :105
    — v4.2 amendment (S313): P/Q/R append on existing v4.1 tab; v3/v4.0 tabs parked
  utilities/cycleRollback.js:39-40, 264 | deleteRows_ (DIRECT via Sheet API)
    — utility function, not in cycle phase order, editor-run only
    — hardcoded TARGET_CYCLE=78; scans Cycle and GeneratedCycle columns
    — entries: rollbackToCycle78 (:18) and previewRollbackToCycle78 (:249)
    — called by: no code callers; godWorldMenu.js (menu item only)

READERS
  phase07-evening-media/buildContractSeeds.js:447-470 | contractSeedUsageTally_(ctx, cycle)
    — reads Cycle (col A) and SuggestedJournalist (col P)
    — called by buildContractSeeds_ @ phase01-config/godWorldEngine2.js:786 (prod) / :2504 (cycle-phases)
    — phase position: Phase7-ContractSeeds, BEFORE Phase10-ExecuteIntents
    — reads rows from past 3 cycles (floor = cycle - 3) to tally journalist usage
  phase10-persistence/saveV3Seeds.js:63-89 | migrateSeedDeckV4_(ss)
    — READER: checks existing deck header shape (first row) for v4.2, v4.1, or v3 columns
    — reads Cycle (col A) and Desk (col C) to determine version
    — called by saveV3Seeds_ before append (defensive migration, fail-soft)
  phase10-persistence/saveV3Seeds.js:91-148 | saveV3Seeds_(ctx)
    — WRITER that is ALSO a reader (queries S.contractSeeds built upstream)
    — queries the Cycle column to detect v4.1 vs v4.2 header state within migrateSeedDeckV4_
    — phase position: Phase10-Seeds
  utilities/cycleRollback.js:18-105 | rollbackToCycle78()
    — utility function (no code callers; manual trigger only)
    — reads Cycle / GeneratedCycle columns to filter rows >= TARGET_CYCLE
    — also reads/writes Initiative_Tracker (setValues) and World_Config (setValue)
  utilities/cycleRollback.js:249-294 | previewRollbackToCycle78()
    — utility function (no code callers; manual trigger only)
    — dry-run version: countRowsAfterCycle_ (reads Cycle columns only, no writes)

MANIFEST
  docs/engine/SHEETS_MANIFEST.md:80 (tab definition)
  docs/engine/SHEETS_MANIFEST.md:198 (engine.341 rollout: migrateSeedDeckV4_, engine.119; engine.341 header-shape gate, v4.2 no-op)
  docs/engine/SHEETS_MANIFEST.md:199 (engine.341 rollout: cycleRollback.js operators deleteRowsAfterCycle_, revertInitiativeVotes_, resetCycleCounter_)

WRITE INTENT DETAILS
  phase10-persistence/saveV3Seeds.js:138-145
    — intent type: queueBatchAppendIntent_
    — rows buffered: rows array built :111-136, one row per seed in S.contractSeeds
    — row columns (A–R): Cycle, SeedID, Desk, Class, Domain, Neighborhood, What, Why, Citizens, CitizenEvents, Businesses, OtherEntities, Magnitude, Trend, CycleStamp, SuggestedJournalist, SuggestedAngle, MatchConfidence
    — priority: 100 (media desk)
    — executed at: Phase10-ExecuteIntents (:896 prod / :2595 cycle-phases)

S FIELD DEPENDENCIES (saveV3Seeds_ reader side)
  READ S.contractSeeds @ phase10-persistence/saveV3Seeds.js:94
    — written by: phase07-evening-media/buildContractSeeds.js::buildContractSeeds_ (Phase7-ContractSeeds)
    — source: buildContractSeeds_ populates from S.rippleEvents (causes) + LifeHistory_Log citizen events
  READ S.cycleId @ :97 (fallback if ctx.config.cycleCount not set)
    — written by: phase09-cycle-state/initializePhase9.js::initializePhase9_ (Phase9-Init)

OTHER CTX
  ctx.ss (spreadsheet handle) @ :92
  ctx.config.cycleCount @ :108
  ctx.persist @ :101 (checked, initialized if missing)

SCRIPT REFERENCES (non-engine)
  phase10-persistence/cycleExportAutomation.js:62 — Story_Seed_Deck in EXPORT_SHEETS list (menu item, off-cycle export)
  utilities/sheetNames.js:27 — STORY_SEED_DECK constant
  utilities/cycleRollback.js:39-40 — cycle-keyed deletion configuration (editor utility, not wired into cycle)
  scripts/buildArtsSlice.js:27 — Story_Seed_Deck in tabs list (packet slice builder)
  scripts/buildEconomicSlice.js:85 — Story_Seed_Deck in BEAT_TABS (packet slice builder)
  scripts/buildLivesSlice.js:38 — Story_Seed_Deck in tabs list (packet slice builder)
  scripts/buildNeighborhoodTexture.js:525 — story seeds read with fail-soft catch (neighborhood texture builder)
  scripts/buildOaksBeatSlice.js:25 — Story_Seed_Deck in tabs list (packet slice builder)
  scripts/buildOaksGroundSlice.js:24 — Story_Seed_Deck in tabs list (packet slice builder)
  scripts/buildTransitSlice.js:25 — Story_Seed_Deck in tabs list (packet slice builder)
  scripts/checkBylineCadence.js:31 — SHEET = 'Story_Seed_Deck' (diagnostic script)
  scripts/diagnoseRoutingMatcher.js:23 — SHEET = 'Story_Seed_Deck' (diagnostic script)
  scripts/dumpBeatTabs.js:62 — Story_Seed_Deck in tab list (diagnostic export)
  scripts/engineCycleAuditTest.js:93,117 — reads and asserts on Story_Seed_Deck (test harness)
  scripts/sportsSubstrate.js:352 — readTab('Story_Seed_Deck') (utility reader)
  scripts/auditSheetHeaders.js:45 — Schema definition for v4.2 deck (header audit validator)
  scripts/auditSheetHeaders.contract.test.js:62 — Story_Seed_Deck in schema list (test)
  scripts/validatePriorityEngine.contract.test.js:69 — reads Story_Seed_Deck sheet (test, now obsolete per plan 2026-11-08)
  scripts/buildArtsSlice.js … scripts/buildTransitSlice.js — packet builders read the deck as canonical seed source (not engine phases; post-cycle write operations)

OPEN WORK
  engine.341 | [[docs/engine/ROLLOUT_PLAN.md]] | Seed Deck Dead Readers Writers Plan (2026-11-08, completed 2026-11-21): retired v3 deck writers (citizen-signal-detector.js, routePatternSeeds.js), handoff tool (compileHandoff.js), and stale readers (validatePriorityEngine.js); migrateSeedDeckV4_ schema-setup moved to §9; cycleRollback.js operators added to manifest; maps regenerated.
  
  engine.334 | Story Seed Mixed Magnitudes Plan (2026-11-05, in progress / 2026-11-08, completed): buildContractSeeds_ now groups ripples by unit and prints cross-unit mixes correctly; What and Magnitude cells no longer sum unlike things; Class assigned per group, not per cluster.

HISTORY
  dd706855a engine.340 Tasks 3-4: multi-hood initiative is its own seed (cluster key carries causeId; C110-C116 Cycles merged citywide split into initiatives); SeedID written with leading apostrophe for text-format safety. Task 2 bars unchanged.
  3b8b51b49 S428 engine.119 Wave A — cycle never creates tabs; retry on C104 crash; pre-mortem diffs require tabs vs sheet
  353aeca99 S313 seed deck v4.2: journalist pre-match rides every seed row (Mike-direct)
  f7ed668f2 S296 [engine-sheet] T4/T5 closed contract form — Desk column routes seeds per desk (v4.1); statuses trued
  bd4f0195b S296 [engine-sheet] deck v3→v4 self-migration — one-time rename keeps all rows, idempotent, fail-soft
  b8359fc95 S296 [engine-sheet] seed contract v2 writers — deck rows carry What/Why/exact citizens (Mike-direct)

FILES OPENED
  phase10-persistence/saveV3Seeds.js (writer function, migration)
  phase07-evening-media/buildContractSeeds.js (reader function)
  utilities/cycleRollback.js (utility readers/writers, not in cycle order)
  phase01-config/godWorldEngine2.js (phase order, two entry points)
  docs/engine/SHEETS_MANIFEST.md (tab definition and rollout rows)
  docs/engine/ENGINE_STUB_REVERSE.json (map metadata)
  phase10-persistence/cycleExportAutomation.js (off-cycle export configuration)
  utilities/sheetNames.js (sheet constant)
  scripts/buildArtsSlice.js, scripts/buildEconomicSlice.js, scripts/buildLivesSlice.js, scripts/buildNeighborhoodTexture.js, scripts/buildOaksBeatSlice.js, scripts/buildOaksGroundSlice.js, scripts/buildTransitSlice.js (packet builders)
  scripts/checkBylineCadence.js, scripts/diagnoseRoutingMatcher.js, scripts/dumpBeatTabs.js, scripts/engineCycleAuditTest.js, scripts/sportsSubstrate.js (diagnostic and test scripts)
  scripts/auditSheetHeaders.js, scripts/auditSheetHeaders.contract.test.js, scripts/validatePriorityEngine.contract.test.js (schema and test validators)
  docs/plans/2026-11-08-seed-deck-dead-readers-writers.md (plan: engine.341)
  docs/plans/2026-11-05-story-seed-mixed-magnitudes.md (plan: engine.334)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=20 toolCalls=31 in=355201 out=6145_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._