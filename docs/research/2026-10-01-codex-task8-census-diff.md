---
title: Task 8 census commit diff and design review
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [engine, research, draft]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md — Task 8 cut, Revision 2
  - commit 7e8baf15 — census implementation and tests
  - docs/research/2026-09-30-codex-task8-rev1.md — six prior open items
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning design and builder ruling"
  - "[[research/2026-09-30-codex-task8-rev1]] — prior HOLD review"
---

# HOLD — engine.254 Task 8 census diff review

**Verdict: HOLD commit `7e8baf15` before PROD.** The ledger-stamp derivation, signed corrections, covered-sum scope, two cohort windows, and separate Phase 10 entry are present. The current completeness check can label a valid same-Cycle close and reopen `incomplete`, or label a Cycle `complete` when the packet failed before either ledger writer ran. A distant nonblank row can hide the prior census block from the bounded tail read. These are source-review findings; the brief reports a balanced SANDBOX C110 first census, which does not exercise them. No Sheet or engine call was made for this review.

## Numbered findings

1. **HIGH — a valid same-Cycle exit and reopen is classified as a failed ledger write.** `deriveCareJusticeMovements_` counts both stamped rows correctly, but its `openByPop` index represents the final open row, not the row that should have closed (`utilities/careJusticeAccounting.js:499-515`). The receipt cross-check requires *no* open row for a hospital exit or judicial exit (`utilities/careJusticeAccounting.js:657-665`). An old row discharged at C and a new row admitted at C for the same POPID therefore produce one exit, one intake, one open person, and `Completeness=incomplete`. The writers explicitly support a second row after close (`phase10-persistence/buildCyclePacket.js:937-989,1252-1268`); the receipt identity rule allows it (`docs/plans/2026-09-21-care-and-justice-system.md:267`). A read-only pure-planner probe with synthetic old-closed/new-open hospital rows returned `{intakes:1, exits:1, closing:1, complete:"incomplete"}`. Check each exit against the specific row's `DischargeCycle`/`ResolveCycle` and event or case identity, rather than the person's final open status. Add both hospital and judicial close-and-reopen tests.

2. **HIGH — an unrun writer can be reported `complete`.** `buildCyclePacket_` initializes `S.careJusticeWriteStatus` only after its civic-context read (`phase10-persistence/buildCyclePacket.js:73-84`). The new census entry still runs after a packet-phase throw at both call sites (`phase01-config/godWorldEngine2.js:788-790,2474-2476`). The planner treats only the literal status `failed` as incomplete (`utilities/careJusticeAccounting.js:612-616`); an absent status with readable ledger tabs and no unmatched receipts becomes `complete`. A pure-planner probe with header-only ledgers, no receipts and `writeStatus: undefined` returned both systems `complete`. R2-3 requires completeness to be checked against writer execution (`docs/plans/2026-09-21-care-and-justice-system.md:818`). Require an explicit `ok` result per writer, with an unrun writer marked `incomplete`, and test a packet failure before status initialization.

3. **HIGH — a distant stray cell can hide the prior Cycle and restart the stock as a first census.** `readTail()` anchors its ten-block window at `getLastRow()` and never scans backward beyond it (`phase10-persistence/buildCyclePacket.js:1156-1167`). `careJusticeWritePlan_` ignores blank cells inside that window and appends after its first row when no C block is found (`utilities/careJusticeAccounting.js:775-793`). If C110 occupies rows 2–217 and a whitespace-only cell is left at row 3000, the 2160-row read starts at row 841. C110 is unseen: `planCareJusticeCensus_` takes `lastPrior=null`, seeds other-resident stock again and books tracked opening as a new correction (`utilities/careJusticeAccounting.js:596-639,672-681,704-714`). The new C block is placed after row 840, leaving the earlier authoritative block outside the reader's horizon. R2-8 item 1 says stray whitespace is not a row (`docs/plans/2026-09-21-care-and-justice-system.md:838-843`); that is implemented only when the prior block remains in the bounded read. Find the last census-key row independently of unrelated `getLastRow` content, then validate the contiguous Cycle run before planning. Test a distant whitespace row, not just one directly below the block.

4. **MEDIUM — unreadable ledger values abort the entire census instead of making that system unavailable.** `ledgerImage()` handles a missing tab and malformed header, but `getDataRange().getValues()` sits outside its `try` (`phase10-persistence/buildCyclePacket.js:1128-1141`). A read failure therefore escapes the census phase before any rows are planned. R2-3 says a tab or headers that cannot be read make that system `unavailable` with blank counts (`docs/plans/2026-09-21-care-and-justice-system.md:818`). Either classify a failed read as unavailable after a bounded read retry or state an intentional fail-loud exception in the contract; exercise the read-error path in the fake sheet.

5. **MEDIUM — the fake sheet does not test the pre-created grid boundary.** The writer calls `getRange(startRow, 1, count, 22).setValues(...)` without checking `getMaxRows()` or extending the grid (`phase10-persistence/buildCyclePacket.js:1190-1195`). The test fake writes into an unbounded JavaScript array (`scripts/careJusticeCensus.test.js:45-57`), so its first-Cycle, later-Cycle and eight-gap cases cannot establish that an actual pre-created tab has capacity for the next contiguous block. The code should ensure the grid extends through the target row, or the bench must demonstrate that this exact Apps Script range call expands it. This is a deployment risk, not a claimed observed failure on SANDBOX.

## Six prior open items

| Revision 1 open item | Code disposition |
|---|---|
| 1. Census booking separate from ledger write | Ledger Cycle stamps replace booked keys (`utilities/careJusticeAccounting.js:447-519`); movement no longer depends on post-write `seenKeys`. Mechanism closes; finding 1 concerns the receipt cross-check. |
| 2. Guaranteed pre-write ledger image | Superseded by fresh post-write derivation (`phase10-persistence/buildCyclePacket.js:1128-1142`); no lazy-cache dependency remains. |
| 3. Partial `unallocated` scope | Closed on the ruled covered-sum basis (`utilities/careJusticeAccounting.js:588-595`; `docs/plans/2026-09-21-care-and-justice-system.md:820,854`). |
| 4. Missed-Cycle recovery | Unavailable gap blocks and signed restart corrections are implemented (`utilities/careJusticeAccounting.js:605-639,670-681,735-740`); finding 3 leaves tail discovery unsafe. |
| 5. Keyed replace and readback | Duplicate-key/complete-block refusal, retry-local locate, and written-block verification are present (`utilities/careJusticeAccounting.js:766-841`; `phase10-persistence/buildCyclePacket.js:1188-1202`); findings 3 and 5 remain. `persistWithRetry_` rethrows non-transient errors immediately (`phase10-persistence/persistenceExecutor.js:195-213`), so the planner's structural throws are not silently retried. |
| 6. Scenario tests | `careJusticeCensus.test.js` passes 70/70 and `careJusticeAccounting.test.js` passes 55/55 locally. The new suite misses findings 1–4 and its fake has no grid limit (`scripts/careJusticeCensus.test.js:45-57,151-179,257-284`). |

## Other checks and scope

R2-6's fixed estimate is implemented by filling missing cohorts from the next known intake in the window (`utilities/careJusticeAccounting.js:552-564,704-714`); the stay-three gap test exercises stability across the following Cycles (`scripts/careJusticeCensus.test.js:228-238`). R2-8 item 0 is checked during planning and again in the retried write unit (`utilities/careJusticeAccounting.js:596-600,775-784`). The two phase entries follow `Phase10-CyclePacket` (`phase01-config/godWorldEngine2.js:788-790,2474-2476`), and both Apps Script files are eligible under `.claspignore`; the VM loads these globals explicitly, while the reported SANDBOX first census is the only supplied runtime load-order evidence. The census header is 22 columns. Sheet number/string comparison uses `String` for cell values (`utilities/careJusticeAccounting.js:756-757,807-811,835-838`), so ordinary numeric readback should compare; no date-typed Cycle cell was tested. The bounded tail can read up to 2160 × 22 cells more than once (`phase10-persistence/buildCyclePacket.js:1156-1167,1169-1201`); the reported first bench Cycle finished, but there is no later full-tail timing result here. No production runtime or Sheet state was inspected.
