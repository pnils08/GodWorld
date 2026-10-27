---
title: engine.301 F1 crime carry and wave rung plan review
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine301-crime-plan-review-TASK.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
---

# engine.301 F1 — Codex plan review

Target: `docs/plans/2026-10-10-engine-214-mood-per-hood.md:318-334`, current source; builder's crime ruling at `:338-340`. **Final gate: HOLD** until the F1 fixes and a candidate/bench receipt close the checks below. The ruling itself is fixed.

## 1. Publish — FIX

- Confirmed defect: `phase02-world-state/applyCityDynamics.js:235-243` derives the per-hood count locally; its ladder reads that local at `:1282-1285`, but the published outputs at `:1846-1851` omit it. `phase05-citizens/generateCitizensEvents.js:1839-1851` therefore sees zero on the ordinary fresh-summary path. Both entry points call CityDynamics before CitizenEvents (`phase01-config/godWorldEngine2.js:583,657,2300,2374`). Publishing the derived level fixes that path.
- Reader inventory: the only production `S.crimeByNeighborhood` reads found are CityDynamics and CitizenEvents (`applyCityDynamics.js:236,1283`; `generateCitizensEvents.js:1842`). Citywide feedback still reads the separate `crimeSpikes` array (`applyCityDynamics.js:928`); Phase 3's crisis bucket counts `previousCycleState.crimeSpikes` itself (`phase03-population/generateCrisisBuckets.js:256-262`). No current downstream raw-count consumer blocks publishing a **level**.
- The compatibility clause needs a guard: `applyCityDynamics.js:236-243` lets any nonempty pre-set map override the carried spikes. A stale/pre-set 1 can make Phase 9 falsely carry a wave; a pre-set 3 can fabricate one. Normal/replay entry points initialize a new summary with no map (`godWorldEngine2.js:519-530,2206-2217`). Make the production derivation authoritative, or validate a pre-set map against the loaded Cycle and spike/wave source before using it.
- Rename the receipt's count meaning. `applyCityDynamics.js:1559-1580` logs “spike(s)” and stores `magnitude: crimeMaxSpikes`; at level 3 this is a ladder level, possibly backed by only one last-Cycle spike. The proposed “+X now” is also misleading: Phase 2 runs before the current Crime_Metrics update (`godWorldEngine2.js:583,595`), and `prevCrimeSpikes` contains last Cycle's magnitudes (`applyCityDynamics.js:230-241`). State the actual prior-Cycle metric(s) and level.

## 2. Carry — FIX

- The plan's overwrite premise is false for a normal fresh Cycle. ShockMonitor assigns `S.previousCycleState = S.currentCycleState || S.previousCycleState || {}` (`phase06-analysis/applyShockMonitor.js:463`); fresh summaries have no `currentCycleState` (`godWorldEngine2.js:519-530,2206-2217`), so the Phase 1-loaded snapshot survives. The same order holds in both runners (`godWorldEngine2.js:562,704,810,2279,2420,2519`). It can be overwritten when an existing `currentCycleState` is present. Keep the Phase 2 map as a deliberate frozen prior-rise signal, and correct the stated rationale.
- Source timing is sound: Phase 3 writes `S.crimeMetrics.shifts` (`phase03-population/updateCrimeMetrics.js:297-330`), Phase 9 compacts increase shifts (`phase09-digest/finalizeCycleState.js:797-821`), then Phase 10 serializes the whole snapshot (`:154-158,215,505-521`). `loadPreviousEvening.js:266-290` parses the whole blob without key filtering. Derive `crimeWaveHoods` from the **same one** post-cap `crimeSpikes` array, dedupe names, and require a valid Phase 2 prior-rise level; do not compact twice independently.
- Replay/dry run cannot validate historical carry: `loadPreviousEvening.js:159-168` disables cycle-stamp rejection in those modes and may read the latest live property; dry run also skips `savePreviousCycleState_` (`finalizeCycleState.js:505-510`). Engine.95 resumes after the Phase 10 save and reruns only the tail (`godWorldEngine2.js:853,862`; `phase10-persistence/cycleCheckpoint.js:306-323,485-501`); its filtered summary excludes the map (`cycleCheckpoint.js:30-35`), which is harmless **after** Phase 9 but should be tested as a tail-only resume.
- The plan's C112 13.1 KB size puts the blob beyond the 9 KB property path; `loadPreviousEvening.js:125-141` then depends on the ring. Ring write failures are caught and logged at `:54-87`, while `savePreviousCycleState_` can still log “Saved” at `finalizeCycleState.js:519-522`; presence is all the next-start gate checks (`loadPreviousEvening.js:205-226`). Require a typed readback of the cycle-stamped ring blob and next-Cycle loaded `crimeSpikes`/`crimeWaveHoods`, with a HOLD on missing, stale or malformed data. Do not call a save log durable proof.

## 3. Ruling semantics — HOLD

- The mechanism defines “rose” as **≥5 index points** in property or violent crime (`utilities/ensureCrimeMetrics.js:490-523`), then takes only the 12 strongest increases across all hoods (`finalizeCycleState.js:797-817`). Thus a +1 to +4 rise is invisible, and a qualifying rise outside the top 12 is invisible; a literal back-to-back rise is broader than this signal. Make this narrowing explicit in the plan/receipt and put excluded qualifying hoods in the bench count before treating the ruling as met.
- The one-Cycle lag is real and consistent with the existing carry grain: Cycle N's second increase is compacted in Phase 9 and level 3 affects Cycle N+1 in Phase 2 (`godWorldEngine2.js:583,595,810`; `finalizeCycleState.js:154-158`). Dropping to 0 after a no-rise Cycle is the plan's stated no-decay choice (`plan:325-328`); no code change is needed for that choice.
- “One hood, not a mass wave” is not a global bound: 12 carried entries can name 12 distinct hoods, and the next 12 can intersect all 12 (`finalizeCycleState.js:797-817`). No F1 rate governor is proposed (`plan:325-326`). Report the per-Cycle maximum and distribution of simultaneous level-3 hoods; if the bench produces a mass event, return its measured shape for a builder decision rather than inventing a cap.

## 4. Tests and bench — HOLD

- Existing block 6 is a stub for the new path: it pre-sets levels 1/2/3, including an impossible live 3, and asserts the old prose (`scripts/perHoodDynamics.test.js:211-230`). Replace/add a real `previousCycleState.crimeSpikes + crimeWaveHoods → applyCityDynamics_ → published map/ladder/receipt` test; include pre-set map, malformed wave list, cap/tie, two successive Cycles, and a failed Phase 2 publication. The VM already loads the real CityDynamics source (`perHoodDynamics.test.js:42-69`). Test Phase 5 through its real generator/pool, checking offer and weight separately from random draws (`generateCitizensEvents.js:1842-1851`).
- The finalize test currently exercises the real compactor (`phase09-digest/finalizeCycleState.test.js:181-210`) but `npm test` searches only `scripts` and `lib` (`scripts/run-tests.js:23-36`). Put the new finalize/chain test under `scripts/` and load the real Phase 9 source, or register the existing phase test in the runner. A passing stubbed level-3 test cannot establish carry reach.
- The proposed 25-Cycle bench (`plan:332`) is a useful observation window, not reach proof by itself. Require per-Cycle typed input shifts (including pre-cap/post-cap losses), published per-hood levels, level-3 hood count, persisted/loaded wave names, Phase 5 offers/draws by hood, and the actual rung-3 mood/receipt. **Zero level-3 hits in C113–C137 means reach remains unproven**, even if the rate is reported; keep PROD on HOLD pending the builder's rate decision. No bench, Sheet, model, or live validation was run in this review.

## 5. Scope — SHIP

F1 stays in the two proposed engine files plus directly relevant tests/receipt text (`plan:324-334`). F6 drift pools and the engine.289 CULTURE/NIGHTLIFE gates are outside this review (`TASK:5`; `plan:338-340`). The source and plan were read; no engine files or concurrent dirty work were changed.
