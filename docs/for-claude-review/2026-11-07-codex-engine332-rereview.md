---
title: Codex rereview — engine.332 review fold
created: 2026-11-07
updated: 2026-11-07
type: review
tags: [review, engine]
sources:
  - commit c47769766, folding the review of 2048ad406
  - docs/plans/2026-11-07-coverage-reaction-seeds.md Design 1, 4, 7 and Reviews reconciled A1-A5
---

# Codex rereview — engine.332 review fold

**Target:** `c47769766` over `2048ad406`, plus the revised plan sections named above. Current source for the four folded Apps Script files and `scripts/buildWorldSummary.js` equals the named candidate. This is the last source rereview; bench and PROD are separate gates.

**Result:** SHIP

## Findings

No PROD-blocking finding in the fold.

## Fold disposition

1. **F1 closed — prior severity high; no remaining fold defect.** `phase07-evening-media/buildContractSeeds.js:594-599` adds `causeType` to each in-memory seed. `phase09-digest/finalizeCycleState.js:732-745` removes only `coverage-reaction` seeds before `compactSeedList_`; `phase10-persistence/saveV3Seeds.js:92-128` still writes the full `S.contractSeeds` deck. The old S202 route remains: Phase 2 pushes a trigger for each strong row (`phase02-world-state/applyEditionCoverageEffects.js:270-299`), Phase 7 builds its engine-list seed (`phase07-evening-media/applyStorySeeds.js:1313-1327`), and Phase 9 compacts that list separately (`phase09-digest/finalizeCycleState.js:550-564,715-719`). Both engine entry points run Phase 2 coverage before Phase 7 story/contract seeds and Phase 9/10 carry writes (`phase01-config/godWorldEngine2.js:571,756-759,813,856,2291,2473-2476,2525,2562`). The new deck row therefore adds no second weight to next Cycle's `S.contractSeedsCarried` path (`phase01-config/loadPreviousEvening.js:398-401`; `phase02-world-state/applyCityDynamics.js:208-221`).
2. **F2 closed — prior severity medium; no remaining fold defect.** `phase02-world-state/applyEditionCoverageEffects.js:436-444` now reports the rating, stored tone, article count and reporter without asserting that a beat moved the applied city mood. This remains true when the aggregate is clamped (`:318-340`) or a positive rating has a negative rater tone (`scripts/rateEditionCoverage.js:444-450`). The revised §1b tests cover both the conflicting tone and blank fields (`phase02-world-state/applyEditionCoverageEffects.test.js:79-100`).
3. **F3 closed — prior severity medium; no remaining fold defect.** Phase 2's `entries` and `processedRows` are appended together for each eligible sheet row (`phase02-world-state/applyEditionCoverageEffects.js:79-108`), so `processedRows[ei]` supplies a distinct `:R<sheet row>` suffix (`:288-298`). Phase 7 clusters on the full causeId (`phase07-evening-media/buildContractSeeds.js:469-475`); HEALTH +3 and −3 from the same rating Cycle now make two major rows (`buildContractSeeds.test.js:413-420`). Desk parsing takes only the first colon-delimited beat (`buildContractSeeds.js:94-99`), and the Node desk signal uses that same parser (`scripts/buildWorldSummary.js:817-825,1424-1428`). No current reader requires the old exact two-part causeId; `scripts/buildWorldSummary.js:1115-1133` applies its exact patterns only to crisis and initiative types. The added `emitDeskSignal` test exercises the new three-part IDs (`scripts/buildWorldSummary.test.js:506-518`).

## Remaining ceiling and verification

- **S202 carry is not literally one seed per rating row.** Its text contains beat, tone, rating, article count and reporter, but no sheet-row identity (`phase07-evening-media/applyStorySeeds.js:1317-1326`); identical texts deduplicate at `:1440-1454`, and `compactStorySeeds_` caps the carried list at 60 by priority (`phase09-digest/finalizeCycleState.js:715-719,748-768`). Thus the revised plan's “rating counts once” is an ordinary-path statement, not a per-row guarantee. This is pre-existing S202 behavior. The fold does not make that behavior worse: each qualifying row still has its own deck ripple and row, while none of those rows adds a new contract-list mood weight. This ceiling does not change the new sim-visible deck/desk answer or block this candidate.
- **Other contract seeds and empty carry:** `causeType` is not serialized to a deck column (`phase10-persistence/saveV3Seeds.js:111-132`), and the only production consumer of the in-memory `S.contractSeeds` object beyond that writer is `compactContractSeeds_` (`phase09-digest/finalizeCycleState.js:732-745`). Its `count` now means carry-eligible rows; the production reader checks `seeds`, not `count` (`phase01-config/loadPreviousEvening.js:430-458`), while the saver only logs the count (`finalizeCycleState.js:561-565`). An all-reaction deck yields `{cycle, count:0, calendarContext:null, seeds:[]}` (`:736-768`); the saver writes this truthy stamped object (`:561-565`), and the next loader accepts the stamp and opens no contract list (`loadPreviousEvening.js:430-440`). It cannot replay an older deck. The changed diagnostic count is not a gate.
- **Local evidence:** `applyEditionCoverageEffects.test.js`, `buildContractSeeds.test.js`, and `scripts/activityObservationsCarry.test.js` passed (the last reported 61/61); `node --check` passed for the four candidate Apps Script files and `scripts/buildWorldSummary.js`. The world-summary test file was source-read but not run because loading that script also loads the environment module. The prior Haiku wiring-card attempt returned `[FATAL] Connection error`; it was not retried. Sandbox fires, PROD, Sheet readback and live desk-signal output remain unverified and belong to the plan's later gates.

## Disposition

F1–F3 are closed for this candidate, with no fold regression found. Engine-sheet should retain the S202 carry ceiling as a bounded plan claim. No further Codex fold round is requested.

**Reconciled in:** `[[../plans/2026-11-07-coverage-reaction-seeds]]` §Reviews reconciled.
