---
title: Codex review — engine.285 hazards 2–6
created: 2026-10-16
updated: 2026-10-16
type: reference
tags: [engine, infrastructure, active]
sources:
  - "ddb3d4fd8110b4c67e76c81ae9db78baba1310a8"
  - docs/research/2026-10-08-codex-engine95-design.md
  - docs/for-claude-review/2026-10-16-engine285-hazards2-6-review-TASK.md
pointers:
  - "[[../research/2026-10-08-codex-engine95-design]] — original §7 findings"
---

# engine.285 hazards 2–6 — FIX

Target: `ddb3d4fd`, commit message read first. The six changed production files match that commit in the inspected working tree. Review is against §7's failure mechanisms, not the commit's unverified live-tab inventory. No Sheet, clasp, cron, deployment, or external service was accessed. Only this report was written; existing shared-tree changes were preserved.

## Verdicts per hazard

| Hazard (commit numbering) | Verdict | Evidence and boundary |
|---|---|---|
| 2 — BusinessArchive copy/remove | **PARTIAL** | `phase05-citizens/applyBusinessDynamics.js:784–821` now recognizes an existing BIZ_ID and removes the source without another copy. Sorting at `:795–798` is correctly descending by actual row. The identity assumption still depends on an intact high-water mark; allocation paths permit reuse when that mark is absent/stale. |
| 3 — CitizenArchive copy/remove | **PARTIAL** | `utilities/archiveCitizenExits.js:205–223` fixes ordinary copy-before-delete recovery across Cycles. It also newly discards a current exit when an earlier restoration has an absent/stale return stamp; same-Cycle return/exit retries still duplicate. See reproduced findings below. |
| 4 — MediaIntake / routing | **PARTIAL** | `phase07-evening-media/mediaRoomIntake.js:427–505` safely retries each buffered target block at a fixed address and preserves successful-run routing semantics. Durable routing receipts remain absent; the two original mark-before-output readers are unchanged and still called at `:147–149`. Dormancy does not close their source hazard. |
| 5 — Ensure interruption | **CLOSED** | `phase10-persistence/persistenceExecutor.js:245–270` fills supplied headers when an existing tab has zero content rows, and leaves populated tabs alone. This closes insert-landed/header-missing recovery; it is not general schema repair. |
| 6 — Batch append lost acknowledgement | **CLOSED** | `phase10-persistence/persistenceExecutor.js:453–456` allocates the tail once and retries the same padded block. `persistWithRetry_` at `:195–213` is synchronous, with no intervening application writer. Cross-execution replay/concurrent external writers remain outside this fix. |

## 1. Executor / ensure hunt

No same-execution overwrite path was found: cell/range work precedes batch append; all append intents for the tab are flattened into one block (`phase10-persistence/persistenceExecutor.js:376–419`). While the fixed-address callback retries, the caller cannot advance to another intent. The retry loop only sleeps, calls the callback, and logs (`:195–213`). A second writer in another execution could occupy the range during backoff after an unlanded attempt; this implementation is not a lock or receipt and must not be presented as concurrency safety.

The empty-tab branch requires both supplied headers and `getLastRow() === 0` (`:252`). Headerless ensure intents remain no-ops on existing empty tabs (`utilities/writeIntents.js:239–246`). The production ensure callers found are header-bearing tables: Business_Archive (`phase05-citizens/applyBusinessDynamics.js:684`), Chaos_Cars (`phase10-persistence/saveChaosCars.js:35`), Ripple_Ledger (`utilities/rippleLedger.js:48`), and Content_Telemetry (`phase05-citizens/generateCitizensEvents.js:3651`, pre-existing dirty file). No deliberately headerless caller was found that this branch would damage. No arbitrary empty tab is swept.

Residual documentation drift: the retry wrapper's old comment still says thrown `setValues` means nothing landed (`phase10-persistence/persistenceExecutor.js:190–192`), contradicting the corrected append comment at `:448–452` and the lost-ack test. Correct that comment when landing follow-up work; it is pre-existing prose, not a newly introduced runtime defect.

## 2. BusinessArchive hunt

The normal producer supplies one closure per business row, and the mover retains its employee gates (`phase05-citizens/applyBusinessDynamics.js:574–578,656,768–776,804–805`). Missing IDs sort after actual rows and are skipped; unique existing IDs sort numerically by row index, so out-of-ID-order ledgers are now handled correctly. Duplicate BIZ_IDs/duplicate closure entries could still schedule the same physical row twice; neither this diff nor the old implementation validates that corruption. No new comparator mis-order was found for valid unique IDs.

Normal mint/intake paths allocate `max(highWater, activeMax)+1`: `scripts/processBusinessIntake.js:106–110`, `scripts/ingestPublishedEntities.js:886–901`, and `phase05-citizens/generationalWealthEngine.js:3203–3218`. The heritage path drops archived businesses from active ownership rather than restoring them (`:2969–2975`). No business restore path was found in the searched scripts/utilities/engine source.

However, “IDs never reissued” is conditional, not enforced against archive contents. `lib/sheets.js:272–280` returns null for a missing/unparseable high-water mark; both Node allocators merely warn and fall back to active max. The engine allocator likewise accepts a missing/non-numeric mark (`generationalWealthEngine.js:3216–3218`). If the largest ID is archived and World_Config is restored to an older value or its mark is removed, the next allocation can reissue that ID. When the new business later closes, the new `archived[id]` branch (`applyBusinessDynamics.js:808–821`) deletes it without archiving its current state. This is a source-supported failure path, **not evidence of live reuse**.

Smallest safety boundary: make allocation fail closed on an unavailable/regressed identity watermark, with an explicit repair that includes archive IDs; for removal, require a matching closure identity/payload rather than accepting any historical BIZ_ID. Normal unique-ID copy-before-delete recovery is repaired, but the unconditional identity claim is too broad.

## 3. CitizenArchive hunt — new destructive behavior

### High: stale or missing return evidence can erase a fresh exit

`utilities/archiveCitizenExits.js:217–223` treats missing `ReturnedCycle`, blank, non-numeric, and stale numeric values as evidence for removal without a new snapshot. `verified.push(c)` bypasses the fresh copy/read-back path (`:229–242`), and `:246–253` deletes the source.

A concrete existing operator path admits the bad stamp: `scripts/restoreCitizen.js:34` accepts any finite Cycle >=1; it never reads World_Config to validate the current Cycle (`:40–48`). `restoreCitizenPlan_` does not compare the supplied Cycle with the latest archive ExitCycle (`utilities/archiveCitizenExits.js:323–339`). It returns an Active row with that supplied value, and the script appends it (`scripts/restoreCitizen.js:60–61`). Its final read-back checks the same caller-supplied stamp, not its chronology (`:69–75`). Thus `--cycle=99` can restore a C100 snapshot; a subsequent C108 trade is mistaken for unfinished C100 removal.

**Executed local probe:** real restore planner + real archive mover, existing test sheet doubles, visibly synthetic POP-90001, no files/external writes. C100 snapshot had UsageCount 10; planner accepted return Cycle 99; current C108 Traded row had UsageCount 99. Result: `remaining=0`, `archiveCount=1`, `resumed=1`; sole archived UsageCount remained 10. The current exit was lost. Parent source used the current-Cycle key, so this different-Cycle case would take the new-copy branch; an attempted parent execution comparison was blocked by local subprocess/FD errors, so the before/after distinction is source-derived rather than a completed paired run.

Other reachable boundary failures: the planner only requires POPID/Status headers and conditionally stamps ReturnedCycle (`archiveCitizenExits.js:298–300,317,339`); a matching legacy ledger/archive schema without that column can restore without a durable return stamp. A hand edit to Active also bypasses stamping, and a subsequent planner call returns `noop` at `:313`. A later same-reason exit can then hit the same destructive branch. A rollback of the ledger without its corresponding archive/return history has the same ambiguity. These are recovery/operator-path risks, not claims that such edits occurred live.

**Smallest fix direction:** reject stale restore Cycles and missing return-stamp schema before any restore write; do not classify absence/malformed chronology as proof of a completed current snapshot. For delete-only recovery, compare the archived snapshot's exit identity and full source payload (or a durable copy receipt) with the row being removed. If they disagree, retain the row and fail visibly. Changing `<` to `<=` alone is not safe.

### Medium: same-Cycle return and exit do not converge after copy-before-delete

An allowed restore at C100 followed by another trade at C100 yields `ReturnedCycle === ExitCycle`. The strict `<` check at `:218` treats it as a new exit every retry. **Executed local probe:** old C100 snapshot → restore at C100 → changed Traded row → mover → reinsert the same source row to model failed deletion → mover again. Archive count became **3**, all with ExitCycle 100. The existing new test covers return C104 / exit C108 (`scripts/archiveCitizenExits.test.js:138–150`), not this equality boundary.

Before the diff, a matching current-Cycle key stalled removal; after it, this boundary appends repeatedly. A payload/receipt discriminator must distinguish the old same-Cycle snapshot from the newly landed one; the date comparison cannot do so. This is why hazard 3 is PARTIAL despite the ordinary recovery tests passing.

## 4. Routing / dead-reader hunt

Successful-run parity holds. Already-routed/empty-name filters and ledger/name resolution are unchanged (`mediaRoomIntake.js:434–452`); the existing-citizen Notes string remains at `:468`, the new-citizen Notes string at `:484`. The lean helper only calls `appendRow`, so its buffer proxy is compatible (`:1092–1096`). GC-only rows still route nowhere and become mark-only (`:471–475`). Missing optional Intake still leaves newcomers unmarked (`:479–486`). S302 is preserved: target flush returns before its indices become markable (`:493–495`).

The residual in the commit is accurate but narrower than all failure cases. A kill or exhausted transient failure after a landed block but before source marks can replay the entire block. There is also a newly widened failure window: Advancement flush succeeds at `:494`, Intake flush throws at `:495`, and **none** of the already-landed advancement rows receives a Routed mark. Before batching, earlier successful rows were marked individually. No process kill is required for that case. Mark each successful target group promptly to reduce this regression; exactly-once still needs durable, consumer-honored receipts. Phase 5 clears consumed advancement rows (`phase05-citizens/processAdvancementIntake.js:1045`), so looking only in the target is insufficient.

The two unchanged readers remain called from `processAllIntakeSheets_` (`mediaRoomIntake.js:147–149`). Article intake marks at `:241` before cultural outputs at `:250–257`; citizen usage intake marks at `:301` before output at `:335–336`. The stated live “0 unprocessed” and no-feeder inventory was not independently checked, as this review prohibits Sheet access. Even if currently dormant, their §7 loss ordering remains OPEN within hazard 4; the routing improvement does not close it.

## Validation and handoff

Ran the exact requested chain successfully (exit 0):

`node scripts/cycleCheckpointWiring.test.js && node phase05-citizens/applyBusinessDynamics.test.js && node scripts/archiveCitizenExits.test.js && node scripts/mediaRoomIntake.test.js`

Business tests: 103 passed / 0 failed. CitizenArchive: 12 / 0. MediaRoomIntake: 26/26. Checkpoint wiring also passed. These are local mocks/VM tests, not live crash, concurrency, bench, or deploy proof. The routing test's new block/retry assertions are an **existing dirty edit** to `scripts/mediaRoomIntake.test.js`, absent from `ddb3d4fd`; its pass must not be attributed solely to the committed test suite. The other three named test files match the target commit. Two additional in-memory synthetic CitizenArchive probes produced the failure results above.

New adverse behavior: fresh-exit loss under stale/missing return evidence; same-Cycle retry duplication; broader unmarked-success window across routing targets; and conditional loss of a reissued BIZ_ID's new closure snapshot. No new valid-row sort, same-execution retry overwrite, or deliberately-empty-tab break was found. **FIX before claiming hazards 2–6 fully closed**, with CitizenArchive's destructive inference the first blocker. Follow-up changes and regression tests belong to the authorized engine-sheet lane; none were applied here.

**Reconciled in:** `fe348e1d` (engine-sheet, 2026-10-16) — every finding verified against code and accepted: CitizenArchive and BusinessArchive identity moved to an identical copy already on the archive (no stamp or high-water trust), routing marks per target, the two intake readers write then mark, the retry comment corrected, the missing test file committed. Not taken: restoreCitizen.js stale-cycle validation (the mover no longer reads ReturnedCycle); exactly-once routing → engine.95 receipts. Dispatch: [[2026-10-16-engine285-hazards2-6-review-TASK]].
