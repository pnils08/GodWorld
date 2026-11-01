---
title: pipeline.93 owed wake fold re-review of 15e44d0d
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [media, citizens, wakes, active]
sources:
  - output/codex/TASK-2026-10-29-pipeline93-owed-rereview.md
  - docs/for-claude-review/2026-10-29-codex-pipeline93-owed-diff-review.md
  - commit 15e44d0d
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — builder rulings and owning build"
---

# pipeline.93 owed wake fold re-review

**Verdict: HOLD for turning `OWED_RESERVE` from 0 to 6.** Commit `15e44d0d` fixes the single-admission case, the win-versus-loss pin collision, and the six-distinct-lines receipt error. Four mechanisms below still allow a reserved wake or receipt to contradict the builder's event and absorption rules. This is a source and local-fixture review; the saved C113 replay is a claim about that snapshot, not live propagation proof.

## F1–F6 disposition

| Original finding | Re-review | Evidence and limit |
|---|---|---|
| F1 hospital admission hidden by another lived event | **SHIP** for one admission | `livedFor` now prefers the owed admission (`lib/wakePerception.js:830-838,992-1000`); the wake applies that preference before constructing `livedLine` (`scripts/citizen-wake.js:263-270`). A missing or already spent lived admission is `unshowable` at `lib/wakePerception.js:1013-1020`, so it takes no reserved slot. The local birth-after-admission fixture passed. |
| F2 casino pins the opposite outcome | **FIX** | Status-specific regexes separate wins from losses, including both Setback loss variants (`lib/wakePerception.js:913-918,951-962`). The earlier big-loss/small-win case is fixed. Same-status slips remain indistinguishable and can be falsely receipted; Finding 1 below. |
| F3 reconciliation creates an arrest with no line | **SHIP** for a well-formed Judicial_Ledger | `SourceSystem=reconcile` is skipped with a reason (`lib/wakePerception.js:975-985`), and a non-reconcile case without a matching line is `unshowable` (`:1013-1020`). The skip is not reliable if its header is missing; Finding 3 below. |
| F4 six distinct pins, five visible lines, six receipts | **SHIP** for distinct lines | The wake filters `mineOwed` through `owedShown` after `lifeTailOf`, then receipts only `shownOwed` (`scripts/citizen-wake.js:263-269,434-435`; `lib/wakePerception.js:997-1000`). The six-distinct-line fixture leaves the omitted mark open. Same-status lines defeat this test; Finding 1 below. |
| F5 one failed or malformed tab suppresses all marks | **HOLD** | `Promise.allSettled` preserves other successfully read tabs, and named required-column errors are logged (`lib/wakePerception.js:927-934,1050-1061`; `scripts/citizen-wake.js:243-254`). An unavailable severe tab now changes the absorption answer, and `SourceSystem` is not required; Findings 2–3 below. |
| F6 quiet-wake ageing and lost state write | **HOLD** | `ageOwedState` runs after an owed-enabled landed wake even with zero shown events (`lib/wakePerception.js:1035-1047`; `scripts/citizen-wake.js:434-436`). Read-back detects a missing receipt/count, but only logs and continues (`scripts/citizen-wake.js:87-88,437-447`); Finding 4 below. |

## Remaining findings

1. **HOLD — one same-status line can receipt two distinct casino wagers.** `lib/wakePerception.js:913-918,961` gives every settled loss in one Cycle the same regex pin, while the writer's LifeHistory line contains no `WagerId` (`phase05-citizens/casinoLedgerEngine.js:427-430,813-824`). `owedShown` tests each mark against the same final block (`lib/wakePerception.js:997-1000`), then the wake spends every match (`scripts/citizen-wake.js:263-269,434-435`). Input: two C113 settled losses above the stake bar but only one `[Casino] the slip came back empty` line visible. Local result: owed `[casino:W1, casino:W2]`, shown `[casino:W1, casino:W2]`, and both spent. A lower-stake loss after a qualifying loss has the same ambiguity: the visible line may be the lower-stake slip. The status split fixes opposite outcomes, not event identity or the claim that each spent event's evidence was shown.

2. **HOLD — an unavailable severe tab makes low chaos eligible contrary to per-Cycle absorption.** `loadOwedRecords` omits a rejected tab from `rec` (`lib/wakePerception.js:1050-1060`); `owedFrom` treats that absence as no events (`:927-934`), and `owedCandidates` derives `severeCycles` only from the surviving list (`:1007-1013`). Input: a C113 high-stake casino loss and a low chaos ticket both fired, but Casino_Ledger read fails on a wake. The local fixture with both tabs gave `severeCycles=[113]` and only the casino mark ready; with the casino tab unavailable it gave `severeCycles=[]` and the low ticket ready. `scripts/citizen-wake.js:243-259` can spend a reserved slot on that ticket despite the builder's rule that low hits absorb only when no listed event fired in their Cycle (`docs/plans/2026-10-29-owed-responses.md:41-43`). A named read error is logged, but unknown severe-event status is being treated as zero.

3. **FIX — the reconciliation skip relies on a column the validator does not require.** `OWED_COLS.judicial` requires only POPID and ArrestCycle (`lib/wakePerception.js:905-912`), while the reconcile check is conditional on finding `SourceSystem` (`:975-984`). Input: a Judicial_Ledger row produced by the reconciliation path (`phase05-citizens/judicialLifecycle.js:606-619`) under a malformed/missing `SourceSystem` header, with a separate same-Cycle `[Transgression-...]` life line for that citizen. The local malformed-header fixture yielded `skipped=[]` and `ready=[judicial:J-REC]`; the unrelated line can satisfy `owedShown`, reserving and spending a wake for bookkeeping rather than a new arrest. Require the column or otherwise bind the court row to the arrest source.

4. **HOLD — state read-back detects a lost write but does not preserve the reservation.** `saveState` still swallows write errors (`scripts/citizen-wake.js:87-88`); the new read-back logs a mismatch but returns success (`:434-447`). Input: a page append lands for an owed citizen and the state-file write fails. Output: the next wake reloads the old `owedSpent` and `owedWakes` values, can select the same mark again, and can use more than R actual owed pages while counting fewer than R. This was the durable-spend half of F6; logging the failure does not settle it. The new focused tests cover in-memory ageing, not a failed file write or a competing wake (`lib/wakePerception.test.js:275-289`).

## Checked evidence and gate

- The default `OWED_RESERVE=0` path remains guarded: `scripts/citizen-wake.js:243-250,434-443` does not read owed tabs, pin a life line, or write owed state. `node output/research-build/pipeline93-tail-equiv.js` returned **1,053 rows, 0 no-pin differences, 0 nonmatching-pin differences**. This is not a live cron byte comparison.
- `node lib/wakePerception.test.js` ran locally: **152 passed, 1 failed**. The one failure is the pre-existing `snippet capped at 180` assertion, present before `15e44d0d`. The fold's added pure-function fixtures passed; none covers Findings 1–4 above.
- The appended C113 replay in `output/research-build/2026-10-29-pipeline93-c113-replay.txt:121-241` reports the same six due citizens, all shown, and one dry-run prompt. No live wake, Sheet read/write, state-file write, or model voice call was run in this review. The required Haiku wiring-card command was attempted once and returned `[FATAL] Connection error.`; direct source inspection supplies the wiring evidence above.

**Gate:** keep `OWED_RESERVE=0` until event-specific receipts, unknown-severity absorption, the Judicial source header, and failed state persistence are settled. A local test or saved C113 dry run cannot establish the C114 live mark lifecycle, concurrent wake accounting, or Sheet persistence.
