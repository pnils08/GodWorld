---
title: Engine.214 Cut C final PROD gate 2
created: 2026-10-20
updated: 2026-10-20
type: reference
tags: [engine, citizens, review]
sources:
  - docs/research/2026-10-20-engine214-cutC-final-gate2-TASK.md
  - docs/research/2026-10-20-codex-engine214-cutC-final-gate.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
---

# Engine.214 Cut C — final gate 2

Read-only source and saved-receipt review. No test, model, Sheet, bench, clasp, cron, commit, or push run here.

| Hunt | Verdict | Finding |
| --- | --- | --- |
| 1. Taps | **SHIP** | Selection-neutral reads are correctly placed; the diagnostic does queue one bench-only `Spot_Diag` write. Identical line hashes support ordinary-fire neutrality, not equality of every hidden state. |
| 2. Reach | **SHIP** | Real-fire offered, filtered, whole-pool, drawn, and zero-first-draw evidence closes gate 1's reach HOLD. The observed count is compatible with sparse selection. |
| 3. Halt | **SHIP for Cut C** | The first sitting failed across persistence tabs with bench advancement 0; the same-baseline retry passed. This is a Sheets availability risk for any fire, with no evidence of a Cut C mechanism defect. |
| 4. PROD | **SHIP for guarded stage-16 push** | The fold, committed-manifest guard, and Bdiag receipt support pushing `72dacd68` through the reviewed script. Deployment and first live Cycle remain to be verified by the authorized operator. |

## Evidence and limits

1. **Taps.** `15a1e2ac` is a direct child of `72dacd68`; its only changed file adds diagnostic statements (`git show 15a1e2ac:phase05-citizens/generateCitizensEvents.js:419-421,3457,3532-3537,3807,3930-3933`). The first tap is after T5 and before grief/continuity adjustments (`:3450-3463`), so its 267.5 mean is the offered pool at that point, not final usable mass. The draw tap reads `usePool` after balancing and immediately before `pickWeighted_` (`:3528-3534`); the draw and first-draw pulse taps follow selection and line grading (`:3535-3537,3804-3808`). They do not change pool entries or RNG. `Spot_Diag` is an added bench write intent, so “read-only” describes the taps' selection effect, not the whole diagnostic commit (`:3930-3933`). The pulse-kind helper only returns a kind (`utilities/neighborhoodPulseMap.js:147-150`). Bdiag and B2 each saved 2,373 LifeHistory rows with identical SHA `330ba1da…` (`output/engine-sheet/2026-10-20-e214c-receipt-Bdiag-c113.json:2-6`; `…-B2-c113.json:2-6`). That proves saved-line equality for this fire; source inspection supplies the selection-neutrality argument, and neither proves all hidden state equal.
2. **Reach.** The single typed row reports 915 pool builds, 148 citizens offered at least one spot entry, and 152 event offers (lift 135, quiet 13, shed 4); multiple offers explain the excess over citizens (`output/engine-sheet/2026-10-20-e214c-spotdiag-c113.json:2-10`; diagnostic tap `:3457`). Offered mass is 262.5/39,594.78 = 0.663%; mean whole pool for offered citizens is 267.53. Of 2,351 draw slots, 368 had usable spot weight; 659/97,581.85 = 0.675%, with 2 filtered spot-entry occurrences and 1 quiet draw (`…-spotdiag-c113.json:11-21`; diagnostic tap `:3532-3537`). Using aggregate share gives about 2.5 expected draws; one is plausible, and the exact expectation needs per-slot fractions. No count contradicts the mechanism. The estimated 1-in-30–60 Cycles per holder per continuing fact is a builder dial, not a gate (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:234`).
3. **Pulse.** The sole spot draw was not `ev === 0`: `firstDraw: 0`, empty pulse objects (`output/engine-sheet/2026-10-20-e214c-spotdiag-c113.json:16-24`). The production path calls `recordPulse_` only on first draw (`phase05-citizens/generateCitizensEvents.js:3791-3801`), so zero is the expected real-fire result; this fire does not exercise a positive pulse or typed post-write hood readback. C9e's Claremont-only generator run asserts parent-hood routing and both signed kinds in isolation (`scripts/testNeighborhoodLoop.js:833-847,859-865`); I inspected, not reran, that test.
4. **Halt.** The saved first attempt reports Spreadsheets timeouts for `Spot_Diag` and many unrelated tabs, `post.bench=112`, `post.live=112`, and `bench advanced 0`; the next Bdiag attempt reports `PASS`, no persistence errors, `post.bench=113`, `post.live=112` (`output/engine-sheet/2026-10-19-benchfires.jsonl:108-109`). This does not isolate why Sheets timed out or prove live persistence reliability. It does not implicate Cut C's selection code; `Spot_Diag` is absent from the stage-16 source (`git show 15a1e2ac:phase05-citizens/generateCitizensEvents.js:3930-3933`; `phase05-citizens/generateCitizensEvents.js:3922-3928`). The successful Bdiag receipt and restored stage-16 bench are recorded at `output/engine-sheet/2026-10-20-e214c-spotdiag.log:14-20`.
5. **Push boundary.** Stage 16's two changed file hashes are pinned at `output/engine-sheet/stage16-e214c.sha256:39,49`; the PROD script requires the named manifest to match committed HEAD, a fresh stage-15 pull, both stage-15 preimages, and whole-tree stage-16 bytes before push (`output/engine-sheet/2026-10-20-push-e214c-prod.sh:14-28`). It then checks the served deployment and pull-back (`:30-42`). Those are execution gates, not observations from this review. A later Sheet outage remains a live-fire operational risk; apply the plan's C113 typed readback and rollback watch (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:230-234`).

**Final PROD gate: SHIP for the guarded stage-16 push.** No PROD deployment or live Cycle was performed or verified in this review.
