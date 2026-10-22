---
title: Codex review of engine.310 event draw plan
created: 2026-10-21
updated: 2026-10-21
type: plan
tags: [engine, draft]
sources: [docs/research/2026-10-21-engine310-plan-TASK.md]
---

# Engine.310 plan review

- **Step 1 — FIX:** Direct `S.cityEvents` counting and `seedType` exclusion fit the ruling, but the producer publishes names before ripple calls; a later throw leaves counted events after `safePhaseCall_` records failure. Define whether those staged names are valid or make publication atomic. `phase04-events/buildCityEvents.js:630-679`; `phase01-config/godWorldEngine2.js:159-169`.
- **Step 2 — SHIP:** B2 base 4 has two genuine `community` seeds, one city-event seed and one Carter false hit; three staged names give new base 5. The per-hood round and folds are correctly described. `output/engine-sheet/2026-10-21-e306-eadiag-B2t-c113.json:13-15`; `output/engine-sheet/2026-10-21-e306-step0-B2-c113.json:53`; `phase08-v3-chicago/v3NeighborhoodWriter.js:514-541`.
- **Step 3 — FIX:** An aggregate 104-name input with expected `city=104` cannot show each name counted once. Assert each name separately, plus empty entries and `city-event` seed exclusion; B2 reconstructed from digest/tap is an analytical fixture, not a saved full `S`. `phase04-events/buildCityEvents.js:625-633`; `output/engine-sheet/2026-10-21-e306-eadiag-B2t-c113.json:13-14`.
- **Step 4 — FIX:** B3 cannot assume B2t chaos fold from sheet reset alone: the loader accepts a prior-cycle PropertiesService value before trying the copied ring. Compare B3t `mod`/`pulseDelta`/`chaosEA` to B2t, require B3 and B3t saved EA equality, and rebase the tap's substring/seed logic onto the helper. `phase01-config/loadPreviousEvening.js:159-174`; `phase04-events/chaosCarsEngine.js:642-709`; `output/engine-sheet/2026-10-21-e306-eatap.patch:73-90`.
- **Step 5 — SHIP:** The proposed diff gate and post-C113 PROD order preserve the first live stage-18 read; no earlier PROD claim follows from the bench plan. `docs/research/2026-10-21-engine310-plan-TASK.md:56`.
- **H1 — FIX:** A fresh Cycle summary prevents prior-Cycle `cityEvents` carryover and the empty-pool fallback writes `[]`; a ripple throw after names are assigned still leaves partial current-Cycle publication. `phase01-config/godWorldEngine2.js:519-530`; `phase04-events/buildCityEvents.js:558-570,630-679`.
- **H2 — SHIP:** The staged-event story-seed producer marks `city-event`, and the ripple deck routes separately through `S.contractSeeds`; no second EA path was found. Keep the exclusion exact. `phase07-evening-media/applyStorySeeds.js:1415-1419`; `phase01-config/godWorldEngine2.js:753-756`; `phase04-events/buildCityEvents.js:655-675`.
- **H3 — SHIP:** Whole-word matching deliberately drops producer `artists`/`artistic` and false `party`/`Carter`; `arts`, `celebrations`, and `markets` remain admitted. ASCII `\b` and non-English boundaries are an explicit plan limit. `phase07-evening-media/applyStorySeeds.js:625-674`; `output/engine-sheet/2026-10-21-e306-eadiag-B2t-c113.json:14`.
- **H4 — SHIP:** Engine EA readers compare against a neighborhood mean/median; business dynamics uses `S.chaosNeighborhoodFold`, not saved EA. Relative outcomes can still move through rounding and absolute folds. `phase05-citizens/neighborhoodTrajectoryEngine.js:95-112,179-180`; `phase06-analysis/applyMigrationDrift.js:392-446`; `phase05-citizens/applyBusinessDynamics.js:499`.
- **H5 — SHIP:** Neighborhood_Map writes in Phase 10 after migration/trajectory; later CyclePacket reads `S`, and the later event recorder has already run. No same-Cycle saved-EA reader found; deep equality remains a bench gate. `phase01-config/godWorldEngine2.js:815-845`; `phase08-v3-chicago/v3NeighborhoodWriter.js:582-583`; `phase10-persistence/buildCyclePacket.js:42-58`.
- **H6 — SHIP:** Pair-3 B leg resets baseline, applies the 103 rows, then fires C113; B2 digest identifies three names and B2t identifies exactly two surviving `community` hits. This proves the B2 fixture, not the unsaved A2 event list. `output/engine-sheet/2026-10-21-e306-pair3.sh:88-94`; `output/engine-sheet/2026-10-21-e306-step0-B2-c113.json:53`; `output/engine-sheet/2026-10-21-e306-eadiag-B2t-c113.json:13-14`.

**Gate: FIX** Steps 1, 3, and 4 before implementation/bench approval. Source review only; fixture, bench, Sheet, and PROD behavior unverified here.
