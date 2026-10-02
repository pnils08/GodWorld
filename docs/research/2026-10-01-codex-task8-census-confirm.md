---
title: Task 8 census confirm review
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [engine, research, draft]
sources:
  - commit 89bc5f83 — response to the five Task 8 census findings
  - docs/for-claude-review/2026-10-01-codex-task8-census-diff.md — prior HOLD
  - docs/plans/2026-09-21-care-and-justice-system.md — Task 8 Revision 2 contract
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning Task 8 design"
---

# HOLD — Task 8 census confirm pass

**Verdict: HOLD commit `89bc5f83` before PROD.** Three of the five prior findings close as stated or by bench evidence. The column-A tail fix can silently overwrite a nonblank row whose Cycle cell is blank, and the new `closedByPop` check can accept an exit receipt for a different row of the same citizen. Both contradict the readback and fail-loud rules this cut was meant to enforce. This is a read-only source review of the shared `main` tree; no Sheet, engine, or deployment command was run.

## Five finding dispositions

| Prior finding | Confirm result |
|---|---|
| 1. Valid same-Cycle close and reopen marked incomplete | **Partial.** The ordinary close/reopen now passes for hospital and judicial (`utilities/careJusticeAccounting.js:508,664-668`; `scripts/careJusticeCensus.test.js:289-302`). New finding 2: the POPID-only closure flag can also mask a different lost exit. |
| 2. Missing writer status reported complete | **Closed.** Only explicit `ok` is clean (`utilities/careJusticeAccounting.js:615-620`). The no-events, no-status case is tested (`scripts/careJusticeCensus.test.js:285-288`); a normal `ok` Cycle with no care events still produces complete zero-named rows, as intended. |
| 3. Distant stray cell hides the prior block | **Partial.** The scan now anchors on the last nonblank Cycle in column A, and the row-3000 whitespace test retains the prior opening (`phase10-persistence/buildCyclePacket.js:1165-1180`; `scripts/careJusticeCensus.test.js:247-255`). New finding 1: a nonblank row with blank A is treated as empty and overwritten. |
| 4. Ledger read failure aborts census | **Closed.** The read is retried, then classified `unavailable` for that system (`phase10-persistence/buildCyclePacket.js:1130-1145`; `scripts/careJusticeCensus.test.js:303-307`). |
| 5. Grid boundary untested | **Closed by the supplied Apps Script bench evidence.** SANDBOX's tab began at 300 rows and grew to 1,080 through C114; C111 wrote rows 218–433 beyond the initial grid without error. This proves this writer's `getRange().setValues()` path expanded that bench grid. It is bench evidence, not a live Sheet claim. |

## Numbered findings

1. **HIGH — the new column-A scan can erase an invalid nonblank row.** `readTail()` scans only column A to locate the last Cycle (`phase10-persistence/buildCyclePacket.js:1165-1180`). With a header and row 2 containing a blank Cycle cell but `System = orphan data`, it returns an empty tail. `careJusticeWritePlan_` then treats row 2 as the append target (`utilities/careJusticeAccounting.js:775-793`), replacing that nonblank row with the first census row. An isolated VM probe through `persistCareJusticeCensus_` returned `action:write` and showed row 2 changed from `orphan data` to `hospital`. R2-8 calls only an *all-cell blank* row blank and requires foreign rows to fail before writing (`docs/plans/2026-09-21-care-and-justice-system.md:838-844`). Keep the column-A anchor for distant whitespace, but inspect rows between the last valid block and the append point (and any nonblank row without a valid Cycle); throw on nonblank foreign content. Add a blank-A/nonblank-other-column test. A header-only tab returns an empty tail; a truly empty tab fails the header check (`phase10-persistence/buildCyclePacket.js:1119-1126`); a nonnumeric text value in A reaches the Cycle parser and throws. Those named cases do not share this defect.

2. **HIGH — `closedByPop` is not a receipt-to-row match.** Derivation sets `closedByPop[system][popId]` for *any* row of that person closed at C (`utilities/careJusticeAccounting.js:507-511`), and R2-3 accepts every exit receipt for that person when the flag is true (`utilities/careJusticeAccounting.js:659-669`). In an isolated planner probe, case A for P1 closed at C, case B for P1 opened at C and remained pending, and memory contained B's intake **and exit** receipts. The planner returned judicial `complete` with one intake, one exit (A's), and one still-open person (B). Thus the check says B's lost exit landed because A closed. The new test covers an exit for A plus a fresh B intake, and does not test an exit for B that failed to reach B's row (`scripts/careJusticeCensus.test.js:289-302`). The existing writer's failure flag should catch a thrown B write, but R2-3 also promises a fresh ledger-state cross-check; a returned writer or stale readback must not turn the wrong closure into proof. Match judicial exits by the case's `SourceEventId`/`CaseId` and `ResolveCycle=C`; match hospital exits to their closing row identity where the receipt supplies it, with an explicit rule for legacy transitions lacking an event id. Test two same-person rows with the exit receipt aimed at the still-open row.

## Validation and limits

`node scripts/careJusticeCensus.test.js` passed **74/74**; `node scripts/careJusticeAccounting.test.js` passed **55/55**; `node --check` passed for both changed scripts. The new full-column-A scan reads from row 2 through `getLastRow()` on the initial plan read, each retry and the post-write readback (`phase10-persistence/buildCyclePacket.js:1165-1215`). That is no longer a bounded tail operation as the tab grows; the supplied C110–C114 bench times were 157–205 seconds, but no long-history timing was provided, so the six-minute limit remains unproven for a mature census. The source and tests do not establish production activation.
