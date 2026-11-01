---
title: pipeline.94 page-day final rereview of 7a6b2cf6
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [media, citizens, wakes, active]
sources:
  - commit 7a6b2cf6
  - docs/for-claude-review/2026-10-30-codex-pipeline94-page-day-review.md
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — pipeline.94 rerun contract"
---

# pipeline.94 page-day final rereview

**Verdict: SHIP-WITH-FIXES for the weekday switch.** The original F1 is settled as an explicit slot contract: a second run for the same citizen, Cycle, daypart, and Central weekday appends to that slot's document and does not receipt an owed event on the repeat. The fold also acknowledges that an already indexed document is not refreshed. One sentence in the plan promises a later wake that the code cannot guarantee; correct that claim before treating the plan as proof of delivery.

## Original F1 disposition — SHIP

`docs/plans/2026-10-29-owed-responses.md:90` now names same-day reruns, forced reruns, and a Cycle longer than a week as collisions, and states the append/no-receipt rule. This matches the producer and journal paths: `lib/citizenPage.js:69-73,133-135` computes and writes the weekday ID; `scripts/citizen-wake.js:261-262,406-415` gives the same day to `owedPageKey` and `appendReflection_` and empties `receipted` when the page key is taken; `lib/wakePerception.js:1076-1088` reconstructs taken page keys from the journal. The no-refresh reader ceiling is stated in the plan and follows from `scripts/scanCitizenPages.js:238,246,259-264`.

The new fixture calls the real `pageDayOf` and `appendReflection_` (`lib/wakePerception.test.js:610-623`). Its fetch stub keys the simulated store by the **posted** customId and appends content under a taken ID (`:613-615`), matching the stated store rule. The dates are feasible: October 29 then 30 produce Thursday/Friday and separate docs with a spent event (`:632-635`); October 29 twice produces one appended doc and an unspent event (`:636-638`); October 29 then November 5 produces the same Thursday key (`:639-641`). The legacy no-day case remains covered (`:642-644`). This closes the earlier hand-built-ID and impossible weekday/date fixture objections. The test still injects the journal and store; it does not execute the full `citizen-wake` script or prove a live service write.

## Finding

1. **FIX — the plan guarantees a later wake after a repeat, but an owed event can expire first.** `docs/plans/2026-10-29-owed-responses.md:90` says an event shown on a repeated slot “stays owed and the citizen gets another wake for it” and calls the outcome “never a missed one.” Input: in the last C113 wake before the C114 fire, a same-day forced rerun shows a C112 event that the first run did not have available (for example, its source tab failed on the first read and succeeded on the rerun). The first journal line occupies the page key; `scripts/citizen-wake.js:406-410` records no ID on the rerun even though the page append succeeds. At C114, `lib/wakePerception.js:899,932-935` excludes the C112 event from the two-Cycle window, so `owedCandidates` cannot select it (`:1030-1048`) and no later wake for that event is guaranteed. The actual output is an unreceipted, lapsed event, with the appended words potentially absent from the local index (`scripts/scanCitizenPages.js:238,246`). The code follows the chosen no-receipt contract; amend the plan to say the event remains eligible **only until its window ends**, and remove the guaranteed extra-wake/no-miss claim.

## Evidence boundary

This is a source and diff rereview. I inspected `7a6b2cf6`, the original review, the rerun contract, and the affected code and fixtures. I did not run tests, a wake, the scanner, Sheets, a model, or the page service. The commit reports 182/183 wakePerception assertions, with the known snippet-cap failure; that count is author-reported here. `PAGE_DAY_KEY` remains false (`scripts/citizen-wake.js:54`). No network wiring card was run because the task forbids network calls.

**Gate:** correct the one delivery guarantee in the plan, then the source-level pipeline.94 switch is SHIP. Live page, receipt, scanner, and cron behavior remain unverified by this rereview.
