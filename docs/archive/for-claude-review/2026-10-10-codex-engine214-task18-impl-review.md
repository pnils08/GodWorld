---
title: Codex review — engine.214 Tasks 17/18/19 implementation
created: 2026-10-10
updated: 2026-10-10
type: review
tags: [review, engine]
sources:
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md §Tasks 17/18/19
  - commits 1ce99668 and 7cacd759
---

# Codex review — engine.214 Tasks 17/18/19 implementation

**Target:** `1ce99668` and `7cacd759` against the plan's Tasks 17/18/19; six hunts in the task brief.

**Result:** HOLD

## Findings

1. **PASS — reader ownership.** Phase 2 now reads only `S.storySeedsCarried`; the Phase 3 crime reader and Phase 5 bond reader retain `S.storySeeds`, which Phase 7 writes later. No other Phase 1–7 `S.storySeeds` reader needs this carry. `phase02-world-state/applyCityDynamics.js:212`; `phase03-population/updateCrimeMetrics.js:168`; `phase05-citizens/bondEngine.js:379`; `phase01-config/godWorldEngine2.js:582`, `:594`, `:666`, `:752`.

2. **PASS — citywide baseline and first-use rule.** Cycle-state compaction records `citywideSeedWeight` only when Phase 2 had a nonempty carried seed array and a signal, and old activity entries preserve the key's absence. The baseline filters to entries bearing the key and averages the latest six such reads; no history means ratio 1. `phase09-digest/finalizeCycleState.js:642`, `:658`; `phase02-world-state/applyCityDynamics.js:1102`, `:1201`. The carried-cycle test covers absent key, first read, next-cycle baseline, and all-hood lift (`scripts/activityObservationsCarry.test.js:194`, `:209`, `:213`, `:222`, `:233`).

3. **PASS — Task 19 floor and share.** `crimeX` stays 1 below three carried spikes; both existing ratio bands apply the 0.5 share to each of their crime effects, with no other branch of `applyObservedFeedback_` changed. `phase02-world-state/applyCityDynamics.js:87`, `:88`, `:789`, `:792`, `:794`; exact-number tests are at `scripts/sentimentRestingLevel.test.js:250`, `:252`, `:254`, `:258`, `:261`.

4. **HIGH — an empty seed Cycle replays older seeds.** `compactStorySeeds_` returns `null` when the current deck is empty, and the saver then leaves the old `PREV_STORY_SEEDS_JSON` property and ring row untouched. The loader accepts any stamped property older than the target Cycle, not only yesterday's; it therefore reopens stale seeds and can apply their hood and citywide effects again. `phase09-digest/finalizeCycleState.js:697`, `:525`; `phase01-config/loadPreviousEvening.js:165`, `:168`, `:397`, `:418`. Local read-only VM repro: target Cycle 110 with a seed property stamped 108 loaded one seed with `carriedFromCycle: 108`. Save an explicit empty, stamped blob for zero-seed Cycles, or enforce an exact previous-Cycle stamp for this key; test nonempty → empty → next-Cycle load. The synthetic 60-seed compact blob is 3,043 characters (`scripts/activityObservationsCarry.test.js:177`), below the 9 KB prop cap, and the existing saver mirrors a refused prop to the sheet ring (`phase01-config/loadPreviousEvening.js:125`, `:133`, `:141`); the new-key test does not exercise prop refusal or ring recovery.

5. **MED — corrupt or unreadable seed carry silently becomes no input.** `seedCarriedStorySeeds_` catches a carry read failure or JSON parse error and returns without an Engine_Errors row or a carry diagnostic; an invalid payload shape also returns. The general carry-presence gate checks only the evening and cycle-state keys. Thus a present but malformed seed property can disable the newly live gates while the Cycle continues, even if the ring has a valid row. `phase01-config/loadPreviousEvening.js:221`, `:222`, `:397`, `:400`, `:401`; `phase02-world-state/applyCityDynamics.js:212`. Distinguish a missing first-fire key from malformed or failed reads, and test the failure path. No added `Math.random()` call appears in either reviewed commit's code diff.

6. **PASS with test gap — real wrapper, new seed contract.** The existing error-path tests load the real `godWorldEngine2.js` and call `safePhaseCall_`, but use a stubbed ripple collector (`scripts/perHoodDynamics.test.js:325`, `:327`, `:332`, `:340`). The Task 18 carry test calls Phase 1, 2, 9, and the saver directly with a stub `safePhaseCall_` (`scripts/activityObservationsCarry.test.js:38`, `:184`, `:204`, `:211`); it does not prove wrapper handling for carry corruption or the empty-after-nonempty transition. The flipped citywide test now asserts no lift before a baseline and tiered lift against the city's own baseline, so it encodes the new plan contract (`scripts/perHoodDynamics.test.js:151`, `:160`, `:171`). Independently reran the three named suites: `perHoodDynamics` **69/69**, `activityObservationsCarry` **37/37**, and `sentimentRestingLevel` **36/36**. The `7cacd759` commit message's per-hood count says 70/70; this checkout runs 69/69.

## Disposition

Pending engine-sheet reconciliation of findings 4 and 5. This is source and local-test evidence, not a bench or live-Sheet acceptance claim.

**Reconciled in:** [[../plans/2026-10-10-engine-214-mood-per-hood]] §Reviews reconciled
