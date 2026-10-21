---
title: Engine.214 Cut C stage 17 rate gate recheck
created: 2026-10-20
updated: 2026-10-20
type: reference
tags: [engine, citizens, review]
sources:
  - docs/research/2026-10-20-engine214-cutC-rate-gate2-TASK.md
  - docs/research/2026-10-20-codex-engine214-cutC-rate-gate.md
---

# Engine.214 Cut C rate gate 2

1. **Fold — SHIP.** `9ac1ea99` adds only the `spotTag_` skip to the generator. Spot entries carry `source:nbhdState`, `spot:*`, `dial:outabout:*` and calendar tags, none of the archetype category tags; the skip therefore removes only whole-text trait boosts (`phase05-citizens/generateCitizensEvents.js:255-256,2826-2830,3411-3433`).
2. **Later weight passes — SHIP by source inspection.** T5 matches other source/reaction tags; grief matches other tags; continuity compares spot tags to primary kinds, which are not spot tags; ledger balancing requires `eclPoolKey`, absent from `makeEntry` spot entries (`phase05-citizens/generateCitizensEvents.js:134-155,1057-1063,1087-1129,3437-3483,3503-3538,57-86`). Recent-text and within-Cycle filters change availability, not weight (`:3503-3525`).
3. **C9f — HOLD as a mutation-proof test.** The named spot is `Clockwork Noticed Coordinated Cafe`, but the three production `indexOf` checks are case-sensitive: only lowercase `work` matches; uppercase `Noticed` and `Coordinated` do not. Thus C9f kills the old 12.65 mutant but misses a regression limited to either of those two boosts (`scripts/testNeighborhoodLoop.js:889-901`; `phase05-citizens/generateCitizensEvents.js:3428-3433`). Its `spotEntries >= 8` also permits loss of most of the four facts across eight citizens. Use lowercase `noticed coordinated` and assert the expected entry count, then prove each single-boost mutant fails. The tap is before grief/continuity, whose safety is established above by source, not C9f (`scripts/testNeighborhoodLoop.js:876-880`; `phase05-citizens/generateCitizensEvents.js:3464-3483`).
4. **Rate transfer — SHIP for C113 only.** The saved clean leg at `9ac1ea99` reports PASS, 2,322 rows and the same receipt line SHA as v2 (`output/engine-sheet/2026-10-20-e214c-rate1.log:2-19`; `output/engine-sheet/2026-10-20-e214c-receipt-Brate-c113.json:2-6`; `output/engine-sheet/2026-10-20-e214c-v2-receipt-Brate-c113.json:2-6`). The two saved TSVs are byte-identical; all 82 receipt spot names lack the three case-sensitive boost substrings (`output/engine-sheet/2026-10-20-e214c-receipt-Brate-c113.json:14-1078`). Source equivalence on those names supports reusing v2's tapped conditional estimate, 13.503/147 = 0.092 per offered holder-fact (`output/engine-sheet/2026-10-20-e214c-ratediag-c113.json:2-20`). Equal output alone would not prove equal probabilities or a long-run rate.
5. **Stage — SHIP as a candidate.** Stage 16 and 17 manifests differ only at the generator hash; stage 17's `9a433ac8…` matches `9ac1ea99` and this clean checkout (`output/engine-sheet/stage17-e214c-rate.sha256:49`). The push script admits only the pinned committed manifest, fresh stage-16 PROD preimage and matching built tree, then checks served version and pull-back; none of those PROD guards has been executed here (`output/engine-sheet/2026-10-20-push-e214c-rate-prod.sh:12-42`).

**Final PROD gate — HOLD** until C9f exercises all three boosts and its expected spot-entry count. This is a test-coverage gate; the inspected fold and C113 calibration pass. No test, live push, live Cycle or typed post-write readback was performed in this review.

2026-10-20 verdict map: **Hunt 1 SHIP** (items 1–2); **Hunt 2 HOLD** (item 3; rate transfer in item 4 SHIP); **Hunt 3 HOLD** (item 5 and final gate).
