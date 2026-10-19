---
title: Codex review — engine.288 implementation
created: 2026-10-10
updated: 2026-10-10
type: review
tags: [review, engine]
sources:
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md §Task 20 / engine.288
  - commit 5c6c551d
---

# Codex review — engine.288 implementation

**Target:** `5c6c551d` against Task 20 in `docs/plans/2026-10-10-engine-214-mood-per-hood.md`; seven hunts in the task brief.

**Result:** HOLD

## Findings

1. **PASS — deck mapping reaches the intended gates.** `buildContractSeeds_` writes `what`, `domain`, `neighborhood`, `magnitude`, and `seedClass` (`phase07-evening-media/buildContractSeeds.js:559`); `compactSeedList_` accepts `what` as text, and `compactContractSeeds_` maps major → 3, texture → 2, and ECONOMIC → BUSINESS (`phase09-digest/finalizeCycleState.js:704`, `:720`). The loader supplies the `text`, `priority`, `seedType`, `domain`, and `neighborhood` fields read by `buildSeedSignals_` and the domain gates (`phase01-config/loadPreviousEvening.js:427`; `phase02-world-state/applyCityDynamics.js:1015`, `:1047`, `:1049`, `:1050`, `:1177`). The deck producer has no `calendarContext`, so its compact blob carries `null` and `seedCalendarBoost_` returns 0; its mapped priority sets the weight without a calendar multiplier (`phase07-evening-media/buildContractSeeds.js:559`; `phase09-digest/finalizeCycleState.js:722`; `phase02-world-state/applyCityDynamics.js:975`). `magnitude` is preserved for the record but is not a weight input, as the plan specifies (`phase01-config/loadPreviousEvening.js:433`; `phase02-world-state/applyCityDynamics.js:1015`).

2. **HIGH — `seedLists` confuses deck-only with engine-only.** Phase 2 sets the marker to the **count** of nonempty lists, so either list alone records `1`; activity compaction persists that `1`, and the baseline treats old entries with no marker as engine-only `1` (`phase02-world-state/applyCityDynamics.js:216`, `:219`, `:1116`; `phase09-digest/finalizeCycleState.js:650`, `:654`). The new test expressly demonstrates deck-only `listsRead === 1` (`scripts/perHoodDynamics.test.js:178`), but its baseline test covers engine-only and both-list cases only (`scripts/perHoodDynamics.test.js:184`). Thus a Cycle with a failed/empty engine list and a present deck compares its deck-only citywide weight with the earlier engine-only series; the reverse transition leaks too, creating an unearned lift or suppressing one. Record list identity (for example engine=1, deck=2, both=3, absent historical=engine-only) and test both one-list directions through persistence.

3. **MED — shared loader distinguishes the keys, but accepts an unstamped payload.** Both keys use the same read, malformed, stale, and diagnostic paths (`phase01-config/loadPreviousEvening.js:398`, `:410`, `:414`, `:445`); the underlying property `_CYCLE` ghost check is per key (`phase01-config/loadPreviousEvening.js:165`, `:171`). An in-memory check with malformed `PREV_STORY_SEEDS_JSON` and valid contract carry logged the story fault and still opened the deck. But `stamped = Number(carried.cycle) || 0` and the `target && stamped` guard accept a nonempty blob whose `cycle` is 0 or missing, with no fault (`phase01-config/loadPreviousEvening.js:416`, `:417`). An in-memory target Cycle 110 with contract payload cycle 0 and property stamp 109 opened that seed as `carriedFromCycle: 0`. Require the payload Cycle to equal target−1 on normal fires, including rejection of zero/missing, and test it for each key.

4. **PASS — bounded carry strips the long deck text.** The shared compactor writes only `n/d/p/t/m`, one optional calendar object, and at most 60 rows; it does not carry `what` or `why` (`phase09-digest/finalizeCycleState.js:709`, `:720`, `:732`). A read-only measurement of the local `output/beats/Story_Seed_Deck.jsonl` snapshot mapped 37 rows at C105 to 2,601 UTF-8 bytes and 52 rows at C110 to 3,614 bytes, both below the 9 KB property limit. The common writer clears a refused property and mirrors its blob to the sheet ring (`phase01-config/loadPreviousEvening.js:125`, `:136`, `:141`). This is a local export and source check, not a readback of the proposed C113 bench.

5. **PASS with an attribution cost — both lists add, including overlap.** Phase 2 concatenates the engine and deck arrays, then sums each seed into the same hood/domain weight; the test proves Laurel 2+3=5 with two counted seeds (`phase02-world-state/applyCityDynamics.js:218`, `:1055`, `:1058`; `scripts/perHoodDynamics.test.js:182`). The contract deck derives from `S.rippleEvents` while the engine list has its own Phase-7 producer (`phase07-evening-media/buildContractSeeds.js:413`, `:416`; `phase07-evening-media/applyStorySeeds.js:1448`). If a cause appears through both routes, this code has no cross-list identity or deduplication. The builder's “both lists” ruling authorizes the additive read; bench attribution should account for the overlap rather than call the sum a unique event count.

6. **MED — later absence of the new carry key still becomes no deck input.** `seedCarriedSeedList_` returns on `!json` without an Engine_Errors row, regardless of whether this is its first fire or a later missing blob (`phase01-config/loadPreviousEvening.js:412`). The generic loader emits a `CARRY_FORWARD_DIAG` missing event, but the hard presence gate checks only the evening and cycle-state keys (`phase01-config/loadPreviousEvening.js:188`, `:221`). Both property and ring writes can fail without propagating an exception to this gate (`phase01-config/loadPreviousEvening.js:136`, `:141`, `:85`). Consequently a lost later `PREV_CONTRACT_SEEDS_JSON` silently removes the deck from Phase 2 and triggers finding 2's wrong-mix baseline; distinguish first adoption from a missing established key and surface the latter as a keyed engine error. No added `Math.random()` call appears in the reviewed code diff.

7. **PASS with gaps — tests encode the positive contract, but not the failing mix/fault cases.** The new tests verify mapping, the stamped empty deck, two-list carry, a first two-list baseline, and stale contract rejection (`scripts/activityObservationsCarry.test.js:283`, `:294`, `:307`, `:314`, `:326`). The earlier empty-night assertion was changed from ratio 0 to ratio 1 because zero lists now have no comparable baseline; that matches the Task 20 mechanism (`scripts/activityObservationsCarry.test.js:252`; `phase02-world-state/applyCityDynamics.js:1116`). No earlier check was merely removed. The direct carry harness stubs `safePhaseCall_`, while the separate engine.214 wrapper checks still load the real wrapper (`scripts/activityObservationsCarry.test.js:38`; `scripts/perHoodDynamics.test.js:341`, `:354`). Independently reran `perHoodDynamics` **72/72** and `activityObservationsCarry` **55/55**. Neither suite tests deck-only against engine-only history, zero/missing blob Cycle, or a later absent contract key.

## Disposition

Pending engine-sheet reconciliation of findings 2, 3, and 6. Source and local tests do not establish bench or live-Sheet behavior.

**Reconciled in:** [[../plans/2026-10-10-engine-214-mood-per-hood]] §Reviews reconciled
