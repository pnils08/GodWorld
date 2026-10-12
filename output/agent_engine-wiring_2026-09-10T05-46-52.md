Perfect. Now I have all the information I need. Let me compile the wiring card.

---

```
WIRING CARD — Business_Archive (tab)   map: 2026-09-09 / 183 files / 1357 functions

DEFINITION
  phase01-config/godWorldEngine2.js:176 defines BIZ_ARCHIVE_HEADERS
  phase05-citizens/applyBusinessDynamics.js:176  var BIZ_ARCHIVE_HEADERS = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel', 'ArchiveReason', 'ExitCycle', 'SourceEventId', 'ClosedCycle'];

PHASE POSITION
  production entry : Phase11-BusinessArchive @ godWorldEngine2.js:598  — AFTER Phase10-ExecuteIntents (line 588)
  cycle-phases     : Phase11-BusinessArchive @ godWorldEngine2.js:2327  — AFTER Phase10-ExecuteIntents (line 2319)

WRITERS
  archiveClosedBusinesses_ @ phase05-citizens/applyBusinessDynamics.js:471 (Phase11-BusinessArchive)

TABS
  Business_Archive
    INTENT  queueEnsureTabIntent_(ctx, 'Business_Archive', BIZ_ARCHIVE_HEADERS, …) @ phase05-citizens/applyBusinessDynamics.js:428  → Phase10-ExecuteIntents (priority 25, runs BEFORE Phase11-BusinessArchive)
    DIRECT  ar.getRange(target, 1, 1, rowOut.length).setValues([rowOut]) @ phase05-citizens/applyBusinessDynamics.js:517  → post-commit direct write (Phase11-BusinessArchive, AFTER Phase10-ExecuteIntents)
    manifest: docs/engine/SHEETS_MANIFEST.md:131  engine.96 Task 7 (S413): Phase11-BusinessArchive, after Phase 10 — copy the committed row + exit metadata, read back by BIZ_ID, then remove

READERS (all reads via ctx.ss.getSheetByName)
  archiveClosedBusinesses_ @ phase05-citizens/applyBusinessDynamics.js:478  (row read-back at line 518 for verification)
  applyBusinessDynamics.test.js:145  (mock sheet for test coverage)

OPEN WORK
  engine.96 @ docs/plans/2026-08-01-business-lifecycle-generator.md (lines 193, 195, 197, 261, 270, 275, 281–287): Business_Archive mirrors Citizen_Archive pattern (full-row snapshot + exit metadata); copy-verify-remove of drained closures; BIZ-IDs never reissued; post-commit finalization protocol

HISTORY
  23271178 S438 [engine-sheet] engine.178 cut locally
  c98cdc00 S413 [engine-sheet] engine.96 Task 11b — heritage business seeded draw
  13461a44 S413 [engine-sheet] engine.96 Task 11 — heritage business born alive
  ba106003 S413 [engine-sheet] engine.96 closure line: week/weeks
  b50edadb S413 [engine-sheet] engine.96 Tasks 6+7 — closure wind-down + Phase11-BusinessArchive copy-verify-remove
  33de948f S413 [engine-sheet] engine.96 Tasks 2+5 — Business Lifecycle Generator drift pass

FILES OPENED
  phase01-config/godWorldEngine2.js (lines 588, 598, 2319, 2327)
  phase05-citizens/applyBusinessDynamics.js (lines 176, 427–429, 471–525, 537)
  phase05-citizens/applyBusinessDynamics.test.js (lines 128, 145)
  docs/engine/SHEETS_MANIFEST.md (line 131)
  docs/engine/ENGINE_STUB_REVERSE.json (sheets map lookup)
  docs/plans/2026-08-01-business-lifecycle-generator.md (lines 193, 195, 197, 261, 270, 275, 281–287)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=14 toolCalls=17 in=161556 out=2854_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._