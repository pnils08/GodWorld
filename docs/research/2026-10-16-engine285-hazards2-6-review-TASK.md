# TASK — codex review: engine.285 hazards 2–6 against your own §7 findings

**Your findings:** `docs/research/2026-10-08-codex-engine95-design.md` §7 (the table rows for ensure, setValues retry, MediaIntake/routing, BusinessArchive, CitizenArchive). **The fix:** commit `ddb3d4fd` (`git show ddb3d4fd`). Read the commit message first — it states what was changed, what was deliberately NOT changed (the two dead intake readers) and the residual (routing exactly-once → engine.95 receipts).
**Deliver:** `docs/research/2026-10-16-codex-engine285-hazards2-6-review.md` (filed from the inbox) — one verdict per hazard (CLOSED / PARTIAL / OPEN) with file:line, then any new defect the diff introduces. Read-only: no tracked-file edits, no Sheet, no clasp, no cron.

## Hunts
1. Executor (`persistenceExecutor.js` batch append + `executeEnsureIntent_`): with the tail fixed outside the retry, is there any path where a retry now overwrites rows another writer appended in the same execution? Does the empty-tab header write break any tab that is deliberately created empty?
2. BusinessArchive (`applyBusinessDynamics.js` `archiveClosedBusinesses_`): BIZ_ID-only identity — any path that reissues or re-lists a BIZ_ID already on Business_Archive (restore, intake, mint)? The row-order sort — any case it mis-orders?
3. CitizenArchive (`utilities/archiveCitizenExits.js`): the identity rule (latest snapshot for POPID|reason, ReturnedCycle blank or < its ExitCycle → remove only). Find a real path (restore planner, `scripts/restoreCitizen.js`, rollback, hand edit) where that rule removes a row WITHOUT the row's current exit being on the archive.
4. Routing (`mediaRoomIntake.js` `routeCitizenUsageToIntake_` via `advancementLogBuffer_`): did batching change who gets routed, the Notes text, the S302 mark-only-if-landed guard, or the GC skip? Is the residual stated in the commit accurate?

Tests: `node scripts/cycleCheckpointWiring.test.js && node phase05-citizens/applyBusinessDynamics.test.js && node scripts/archiveCitizenExits.test.js && node scripts/mediaRoomIntake.test.js`. Done = the review md exists. Then print one line: `engine285 review done`.
