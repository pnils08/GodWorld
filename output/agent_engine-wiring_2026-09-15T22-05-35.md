Perfect. Now let me compile the card. First, let me make sure I have all the facts by summarizing the reference locations:

**WRITE PATH:**
- Line 288: `queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iPhase + 1, 'operational', ...)` — INTENT (before Phase10)
- Line 2810: `queueAppendIntent_(ctx, 'Initiative_Tracker', row, ...)` — INTENT (before Phase10)

**READ SITES:**
- applyInitiativeImplementationEffects: line 141 (DIRECT getSheetByName)
- civicInitiativeEngine: lines 99, 1917, 1991, 2191, 2254, 2735 (READ getSheetByName or requireTab)
- updateCivicApprovalRatings: lines 424, 432 (READ getDataRange)
- getInitiativeSummaryForMedia: line 2254 (READ)
- manualRunVote: line 1991 (READ)
- seedInitiativeTracker: line 2191 (READ)
- createInitiativeTrackerSheet: line 1854 (DIRECT insertSheet)
- addSwingVoter2Columns: line 1917 (DIRECT insertColumnsAfter)
- compileHandoff loadInitiatives_: line 533 (READ via cache)
- cycleRollback revertInitiativeVotes_: line 164 (READ/WRITE direct setValues)
- cycleRollback previewRollbackToCycle78: line 281 (READ-adjacent, data config)
- setupInitiativeTrackerValidation: lines 24, 193 (READ)

Now assemble the card:

```
WIRING CARD — Initiative_Tracker (tab)   map: 2026-09-15 / 183 files   [NOT STALE]

DEFINITION
  docs/engine/ENGINE_STUB_REVERSE.json  tab defined with 3 writers, 15 readers

PHASE POSITION
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:292 — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-Initiatives @ godWorldEngine2.js:354 — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:355 — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2041 — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-Initiatives @ godWorldEngine2.js:2103 — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2104 — BEFORE Phase10-ExecuteIntents (:2329)

WRITERS (3)
  phase02-world-state/applyInitiativeImplementationEffects.js  v1.0 — INTENT queueCellIntent @ :288
  phase05-citizens/civicInitiativeEngine.js  v2.0 — INTENT queueAppendIntent @ :2810
  phase05-citizens/updateCivicApprovalRatings.js  v1.0 — cycle carrier for approval math (no direct writes)

READERS (15)
  phase02-world-state/applyInitiativeImplementationEffects.js  @ :141  (DIRECT READ getSheetByName → getDataRange)
  phase05-citizens/civicInitiativeEngine.js::createInitiativeTrackerSheet_  @ :1854  (DIRECT insertSheet)
  phase05-citizens/civicInitiativeEngine.js::addSwingVoter2Columns  @ :1917  (DIRECT READ + insertColumnsAfter)
  phase05-citizens/civicInitiativeEngine.js::seedInitiativeTracker_  @ :2191  (DIRECT READ + setValues)
  phase05-citizens/civicInitiativeEngine.js::manualRunVote  @ :1991  (DIRECT READ)
  phase05-citizens/civicInitiativeEngine.js::createInitiative_  @ :2735  (DIRECT READ + intent append @ :2810)
  phase05-citizens/civicInitiativeEngine.js::getInitiativeSummaryForMedia_  @ :2254  (DIRECT READ)
  phase05-citizens/civicInitiativeEngine.js::runCivicInitiativeEngine_  @ :99  (requireTab_ READ-locked)
  phase05-citizens/updateCivicApprovalRatings.js  @ :424  (DIRECT READ)
  phase10-persistence/compileHandoff.js::loadInitiatives_  @ :533  (READ via cache)
  utilities/cycleRollback.js::revertInitiativeVotes_  @ :164  (DIRECT READ + WRITE setValues — not engine cycle)
  utilities/cycleRollback.js::previewRollbackToCycle78  @ :281  (config list, READ-adjacent)
  utilities/setupInitiativeTrackerValidation.js::setupInitiativeTrackerValidation  @ :24  (DIRECT READ)
  utilities/setupInitiativeTrackerValidation.js::clearInitiativeTrackerValidation  @ :193  (DIRECT READ)

WRITE PATH
  INTENT  queueCellIntent_ @ phase02-world-state/applyInitiativeImplementationEffects.js:288  → Initiative_Tracker  [BEFORE Phase10-ExecuteIntents]
  INTENT  queueAppendIntent_ @ phase05-citizens/civicInitiativeEngine.js:2810  → Initiative_Tracker  [BEFORE Phase10-ExecuteIntents]
  DIRECT  setValues @ utilities/cycleRollback.js:197  → Initiative_Tracker  (revertInitiativeVotes_ — offline utility, not engine cycle)

MANIFESTO
  docs/engine/SHEETS_MANIFEST.md:34  Initiative_Tracker: City policy, budgeting, and phase implementation.
  docs/engine/SHEETS_MANIFEST.md:155  civicInitiativeEngine.js | Initiative_Tracker | own-tab | tab is requireTab_ on cycle path (engine.119); seedInitiativeTracker() is menu creator
  docs/engine/SHEETS_MANIFEST.md:159  updateCivicApprovalRatings.js | Initiative_Tracker | own-tab | approval recomputation

OPEN WORK
  civic.14  Initiative_Tracker contract + fine-tune (in-progress) — [[../plans/2026-06-01-initiative-tracker-contract]] (D-1.1 ` DONE S256 (research-build); full 28-col schema live-read from sheet)
  docs/plans/2026-06-01-initiative-tracker-contract.md — contract defini

HISTORY  (applyInitiativeImplementationEffects.js)
  6ee31754 engine.183 transit × hoods — the numbers carry their causes
  1ef134c3 S405 G-PF18 — civic voice sentiment reaches the world
  95a7359a engine.132: initiative ledger can touch illness — built, tested, NOT deployed
  95da9e52 engine.131: sports overrides civic tracker on stadium, no clock
  df986b0d S311 engine.45 T3e — initiative-implementation effects made real
  b15fa740 S180 PRE-C93 phase-vocabulary parity

FILES OPENED
  phase01-config/godWorldEngine2.js (production & cycle-phases entry points)
  phase02-world-state/applyInitiativeImplementationEffects.js
  phase05-citizens/civicInitiativeEngine.js
  phase05-citizens/updateCivicApprovalRatings.js
  phase10-persistence/compileHandoff.js
  phase10-persistence/cycleExportAutomation.js
  utilities/cycleRollback.js
  utilities/setupInitiativeTrackerValidation.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-06-01-initiative-tracker-contract.md
```

Wait, I need to be more precise. Let me re-read the instructions for the tab card format. The card should follow the exact format shown. Let me rebuild it properly.

```
WIRING CARD — Initiative_Tracker (tab)   map: 2026-09-15 / 183 files   [NOT STALE]

DEFINITION
  docs/engine/ENGINE_STUB_REVERSE.json  sheets[Initiative_Tracker]

PHASE POSITION
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:292  — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-Initiatives @ godWorldEngine2.js:354  — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:355  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2041  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-Initiatives @ godWorldEngine2.js:2103  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2104  — BEFORE Phase10-ExecuteIntents (:2329)

REFERENCES (all sites, classified)
  INTENT   queueCellIntent_ @ phase02-world-state/applyInitiativeImplementationEffects.js:288 — applyInitiativeImplementationEffects_
  READ     getSheetByName @ phase02-world-state/applyInitiativeImplementationEffects.js:141 — applyInitiativeImplementationEffects_
  
  INTENT   queueAppendIntent_ @ phase05-citizens/civicInitiativeEngine.js:2810 — createInitiative_
  READ     requireTab_ @ phase05-citizens/civicInitiativeEngine.js:99 — runCivicInitiativeEngine_
  DIRECT   insertSheet @ phase05-citizens/civicInitiativeEngine.js:1854 — createInitiativeTrackerSheet_
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:1917 — addSwingVoter2Columns
  DIRECT   insertColumnsAfter + setValues @ phase05-citizens/civicInitiativeEngine.js:1941, 1944 — addSwingVoter2Columns
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:1991 — manualRunVote
  DIRECT   setValues @ phase05-citizens/civicInitiativeEngine.js:2148 — manualRunVote (cell write via setValues)
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2191 — seedInitiativeTracker_
  DIRECT   setValues @ phase05-citizens/civicInitiativeEngine.js:2238 — seedInitiativeTracker_ (range write)
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2254 — getInitiativeSummaryForMedia_
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2735 — createInitiative_
  
  READ     getDataRange @ phase05-citizens/updateCivicApprovalRatings.js:424 — updateCivicApprovalRatings_
  
  READ     cache.getValues @ phase10-persistence/compileHandoff.js:533 — loadInitiatives_
  
  READ     getSheetByName @ utilities/cycleRollback.js:164 — revertInitiativeVotes_ (utility, not engine cycle)
  DIRECT   setValues @ utilities/cycleRollback.js:197 — revertInitiativeVotes_ (utility)
  READ     config list @ utilities/cycleRollback.js:58, 281 — cycleRollback cycle-specific sheets
  
  READ     getSheetByName @ utilities/setupInitiativeTrackerValidation.js:24 — setupInitiativeTrackerValidation (utility)
  READ     getSheetByName @ utilities/setupInitiativeTrackerValidation.js:193 — clearInitiativeTrackerValidation (utility)
  
  EXPORT   config list @ phase10-persistence/cycleExportAutomation.js:64 — CONFIG.EXPORT_SHEETS

WRITERS (3 engine writers)
  phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_ (v1.0 S137b)
  phase05-citizens/civicInitiativeEngine.js::createInitiative_ (civic.22 S376)
  phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_ (v1.0 S137b) — Phase 5 carrier only (readies data, no direct writes to tracker)

READERS (8 engine + 5 utility)
  Engine:
    phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_
    phase05-citizens/civicInitiativeEngine.js::runCivicInitiativeEngine_ (requireTab_ at :99)
    phase05-citizens/civicInitiativeEngine.js::createInitiativeTrackerSheet_
    phase05-citizens/civicInitiativeEngine.js::addSwingVoter2Columns
    phase05-citizens/civicInitiativeEngine.js::seedInitiativeTracker_
    phase05-citizens/civicInitiativeEngine.js::manualRunVote
    phase05-citizens/civicInitiativeEngine.js::getInitiativeSummaryForMedia_
    phase05-citizens/civicInitiativeEngine.js::createInitiative_
    phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_
    phase10-persistence/compileHandoff.js::loadInitiatives_
  Utility:
    utilities/cycleRollback.js::revertInitiativeVotes_
    utilities/cycleRollback.js::previewRollbackToCycle78
    utilities/setupInitiativeTrackerValidation.js::setupInitiativeTrackerValidation
    utilities/setupInitiativeTrackerValidation.js::clearInitiativeTrackerValidation

MANIFEST
  docs/engine/SHEETS_MANIFEST.md:34  Initiative_Tracker: City policy, budgeting, and phase implementation.
  docs/engine/SHEETS_MANIFEST.md:155  civicInitiativeEngine.js | Initiative_Tracker | own-tab | tab is requireTab_ on cycle path (engine.119); seedInitiativeTracker() is menu creator
  docs/engine/SHEETS_MANIFEST.md:159  updateCivicApprovalRatings.js | Initiative_Tracker | own-tab | approval recomputation

WRITE DISCIPLINE
  queueCellIntent_ (Phase 2, upstream of Phase10-ExecuteIntents, committed normally) — line 288
  queueAppendIntent_ (Phase 5, upstream of Phase10-ExecuteIntents, committed normally) — line 2810
  DIRECT writes (utility cycleRollback, offline, NOT engine cycle) — line 197
  DIRECT writes (utility manualRunVote, setupInitiativeTrackerValidation, offline, NOT engine cycle)

OPEN WORK
  civic.14  Initiative_Tracker contract + fine-tune (in-progress)  docs/plans/2026-06-01-initiative-tracker-contract.md — D-1.1 DONE S256 (research-build); full 28-col schema live-read from sheet; D-2 (engine enforce phase vocabulary) awaiting Phase 3 civic-chain integration

HISTORY  (applyInitiativeImplementationEffects.js)
  6ee31754 engine.183 transit × hoods — the numbers carry their causes
  1ef134c3 S405 G-PF18 — civic voice sentiment reaches the world
  95a7359a engine.132: initiative ledger can touch illness — built, tested, NOT deployed
  95da9e52 engine.131: sports overrides civic tracker on stadium
  df986b0d S311 engine.45 T3e — initiative-implementation effects made real
  b15fa740 S180 PRE-C93 phase-vocabulary parity

FILES OPENED
  phase01-config/godWorldEngine2.js
  phase02-world-state/applyInitiativeImplementationEffects.js
  phase05-citizens/civicInitiativeEngine.js
  phase05-citizens/updateCivicApprovalRatings.js
  phase10-persistence/compileHandoff.js
  phase10-persistence/cycleExportAutomation.js
  utilities/cycleRollback.js
  utilities/setupInitiativeTrackerValidation.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-06-01-initiative-tracker-contract.md
```

Actually, I need to be even more careful and follow the exact format from the instructions. Let me re-read the card format spec and build it correctly:

---

WIRING CARD — Initiative_Tracker (tab)   map: 2026-09-15 / 183 files   [NOT STALE]

DEFINITION
  docs/engine/ENGINE_STUB_REVERSE.json  sheets[Initiative_Tracker]

PHASE POSITION
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:292  — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-Initiatives @ godWorldEngine2.js:354  — BEFORE Phase10-ExecuteIntents (:594)
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:355  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2041  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-Initiatives @ godWorldEngine2.js:2103  — BEFORE Phase10-ExecuteIntents (:2329)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2104  — BEFORE Phase10-ExecuteIntents (:2329)

ALL REFERENCES
  INTENT   queueCellIntent_ @ phase02-world-state/applyInitiativeImplementationEffects.js:288
  READ     getSheetByName @ phase02-world-state/applyInitiativeImplementationEffects.js:141
  
  INTENT   queueAppendIntent_ @ phase05-citizens/civicInitiativeEngine.js:2810
  READ     requireTab_ @ phase05-citizens/civicInitiativeEngine.js:99
  DIRECT   insertSheet @ phase05-citizens/civicInitiativeEngine.js:1854
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:1917
  DIRECT   insertColumnsAfter @ phase05-citizens/civicInitiativeEngine.js:1941
  DIRECT   setValues @ phase05-citizens/civicInitiativeEngine.js:1944
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:1991
  DIRECT   setValues @ phase05-citizens/civicInitiativeEngine.js:2148
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2191
  DIRECT   setValues @ phase05-citizens/civicInitiativeEngine.js:2238
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2254
  READ     getSheetByName @ phase05-citizens/civicInitiativeEngine.js:2735
  
  READ     getDataRange @ phase05-citizens/updateCivicApprovalRatings.js:424
  
  READ     cache.getValues @ phase10-persistence/compileHandoff.js:533
  
  READ     getSheetByName @ utilities/cycleRollback.js:164
  DIRECT   setValues @ utilities/cycleRollback.js:197
  READ     (config ref) @ utilities/cycleRollback.js:58
  READ     (config ref) @ utilities/cycleRollback.js:281
  
  READ     getSheetByName @ utilities/setupInitiativeTrackerValidation.js:24
  READ     getSheetByName @ utilities/setupInitiativeTrackerValidation.js:193

WRITERS
  applyInitiativeImplementationEffects_ @ phase02-world-state/applyInitiativeImplementationEffects.js  INTENT @ :288 → Initiative_Tracker
  createInitiative_ @ phase05-citizens/civicInitiativeEngine.js  INTENT @ :2810 → Initiative_Tracker
  updateCivicApprovalRatings_ @ phase05-citizens/updateCivicApprovalRatings.js  (carrier, no direct writes)

MANIFEST
  docs/engine/SHEETS_MANIFEST.md:34  City policy, budgeting, and phase implementation.
  docs/engine/SHEETS_MANIFEST.md:155  civicInitiativeEngine.js — own-tab | tab is requireTab_ on cycle path (engine.119); seedInitiativeTracker() is menu creator
  docs/engine/SHEETS_MANIFEST.md:159  updateCivicApprovalRatings.js — own-tab | approval recomputation

WRITE SEMANTICS
  INTENT writes queue for Phase10-ExecuteIntents (both BEFORE the executor, so committed normally):
    queueCellIntent_ @ applyInitiativeImplementationEffects.js:288
    queueAppendIntent_ @ createInitiative_.js:2810
  DIRECT writes (offline utilities, NOT engine cycle):
    setValues @ cycleRollback.js:197 (utility revert, not cycle)
    setValues @ civicInitiativeEngine.js:2148, 2238, 1944 (manual functions, not cycle-wired)
    insertSheet/insertColumnsAfter @ civicInitiativeEngine.js:1854, 1941 (manual/setup utilities)

OPEN WORK
  civic.14  Initiative_Tracker contract + fine-tune (in-progress)  docs/plans/2026-06-01-initiative-tracker-contract.md:1–55 — Phase 0 (C96 stopgap) DONE S251; Phase 1 (28-col schema + contract doc INITIATIVE_TRACKER_CONTRACT.md) DONE S256 (research-build); Phase 2 (engine enforce vocabulary) awaiting civic-chain integration

HISTORY  (applyInitiativeImplementationEffects.js)
  6ee31754 engine.183 transit × hoods — the numbers carry their causes
  1ef134c3 S405 G-PF18 — civic voice sentiment reaches the world
  95a7359a engine.132: initiative ledger can touch illness — built, tested, NOT deployed
  95da9e52 engine.131: sports overrides civic tracker on stadium
  df986b0d S311 engine.45 T3e — initiative-implementation effects made real
  b15fa740 S180 PRE-C93 phase-vocabulary parity

FILES OPENED
  phase01-config/godWorldEngine2.js
  phase02-world-state/applyInitiativeImplementationEffects.js
  phase05-citizens/civicInitiativeEngine.js
  phase05-citizens/updateCivicApprovalRatings.js
  phase10-persistence/compileHandoff.js
  phase10-persistence/cycleExportAutomation.js
  utilities/cycleRollback.js
  utilities/setupInitiativeTrackerValidation.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-06-01-initiative-tracker-contract.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=25 toolCalls=24 in=985562 out=9127_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._