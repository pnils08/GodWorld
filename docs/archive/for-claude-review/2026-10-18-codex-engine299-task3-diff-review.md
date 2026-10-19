---
title: Codex diff review — engine.299 Task 3
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commit fbcb6e7b30481ff058c287cba214ecd5ef8a93c1
  - docs/plans/2026-10-18-event-engines-move-dials.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# FIX — unsigned world-event presence becomes Down; registry remains stale

Reviewed `git show fbcb6e7b`. Reviewed engine/test/resolver/registry files match that commit at checkout HEAD b8a10293. The trajectory path and revised seam tests work. Two local fixes remain: the chaos entry still invents a negative direction, and the registry describes the superseded writer behavior. No implementation, commit, push, Sheet read/write, bench fire, model or canon operation was performed; only this review file was written.

## Hunt 1 — FIX: trajectory is sound; chaos presence is not a signed fact

**Trajectory portion SHIP.** `phase05-citizens/runNeighborhoodEngine.js:491-494` reads only this citizen's hood's `S.neighborhoodState[neighborhood].trajectory`: growth Up, decay Down. Neither rank nor citizen dial bands decide its sign. Citizen outabout still affects selection frequency, as before. `phase02-world-state/loadNeighborhoodState.js:73,125` loads NeighborhoodTrajectory, trimmed, from Neighborhood_Map. Phase 2 loads it before Phase 5 neighborhoods (`phase01-config/godWorldEngine2.js:582,634`); this is the persisted inbound trajectory, not a freshly computed same-Cycle movement measurement.

**F1 — Medium: any world event becomes Composure-Down.** The variable named chaos is actually `S.worldEvents` (`runNeighborhoodEngine.js:255`). The new entry at **:531-533** requires only a nonempty array and assigns `dial:composure:down` to “felt atmosphere influenced by recent city events.” Neither the predicate nor the neutral text supplies a negative direction.

This is reachable with positive upstream entries: `phase04-events/worldEventsEngine.js:122-137` includes “team-sponsored community cleanup day” and “community appearance boosts turnout at a local market”; :348-360 appends those records to S.worldEvents. WorldEvents runs before neighborhoods (`godWorldEngine2.js:603,634`). The array's name does not make its contents adverse.

**Reproduction:** use the committed seam harness with one synthetic citizen, steady hood, low pressure, neutral weather/economy/dynamics, and a single worldEvents record whose description is the existing “team-sponsored community cleanup day” text. Force the drift draw to 0 and pool selection to 0.99. The real writer emits **`[Neighborhood-Composure-Down-S] felt atmosphere influenced by recent city events`** in both cell and queued log, with no skip. This reproduces a negative nudge without a negative fact.

**Required fix:** select a direction supported by the actual event/entry, or leave this neutral entry unsigned and skip it. Do not assume every world event is negative, or replace that assumption with default Up. Add a positive/unsigned-world-event regression case; the current trajectory fixture does not exercise this branch.

## Hunt 2 — SHIP: unsigned texture skips with visible counts

Independent real-writer probes used the same synthetic hood at identical high retail/event rank, neutral context and low pressure. Each consumed two RNG draws:

| Trajectory | Cell/log outcome | Skip counter |
|---|---|---|
| growth | Neighborhood-Outabout-Up-S | none |
| decay | Neighborhood-Outabout-Down-S | none |
| steady | no line | runNeighborhoodEngine:Neighborhood:steady = 1 |
| blank | no line | runNeighborhoodEngine:Neighborhood:no-trajectory = 1 |
| missing | no line | runNeighborhoodEngine:Neighborhood:no-trajectory = 1 |

Admission/counting at `runNeighborhoodEngine.js:580-587` precedes cell/log writes. “Steady writes nothing” applies to **unsigned hood texture**, not every possible line: independently signed calendar/weather entries and the preserved pressure path may still write. A steady-hood rain probe correctly selected Neighborhood-Outabout-Down-S. The Friction path remains ahead of unsigned-texture admission (:550-567); both committed pressure tests pass.

## Hunt 3 — FIX documentation; runtime readers SHIP

Runtime normalization works: `utilities/citizenDialMap.js:330-367` preserves Neighborhood as the base kind while resolving the grade. Both Up and Down probes return baseTag_ = Neighborhood and outabout ±1. `utilities/neighborhoodPulseMap.js:92-97` normalizes through baseTag_; both tags retain the existing Neighborhood pulse `{sentiment:1}`. That is preserved kind behavior, not a new directional pulse rule. This writer contains no recordPulse_ call, and this cut adds none; parser compatibility is not proof of a new pulse emission path.

Newsroom street sourcing uses equivalent `gradedParts_.kind` normalization (`scripts/newsroomSourcing.js:13,313`), and its test passes. Phase 9 folds the full graded tag through nudgesForEvent_ (`utilities/compressLifeHistory.js:1636,1653`). Cell and queued log carry the same graded eventTag (`runNeighborhoodEngine.js:594,606`). No runtime exact-kind reader loss was found in this cut.

**F2 — Low: update the owning truth docs.** `docs/engine/TAG_REGISTRY.md:47` still says the ordinary hood line is a plain Neighborhood line regardless of rank; :49 still names only generateCitizensEvents as the current graded writer and puts the other emitters in future Tasks 3–4. `docs/engine/EVENT_SYSTEM_MAP.md:58` also omits this newly changed contract. The commit updates the plan but neither owning reference. Preserve S451's no-rank rule and historical inert tags while documenting trajectory grading, unsigned skips, independent context signs and the pressure exception.

## Hunt 4 — SHIP: existing RNG and persistence paths

Uses safeRand_(ctx) at `runNeighborhoodEngine.js:202` and the existing chance/selection draws (:483,546); the added grading code adds no random sign draw or Math.random. Shared ctx.ledger rows remain the Phase 10 persistence path (:596-597,631); LifeHistory_Log uses queueAppendIntent_ (:600-613). No direct Sheet mutation or new file is introduced by the commit. The pressure branch is unchanged apart from surrounding pool representation.

## Hunt 5 — SHIP for the revised assertions; F1 coverage still needed

`node scripts/dialWave2Seams.test.js`: **26 passed, 0 failed**. The string-returning hood fixture matches the real helper contract. Assertions at :145-158 observe actual log tags, persisted pressure behavior and counted missing-trajectory rejection; :244-247 also exercises a bottom-quarter resident with growth.

**Negative control:** ran the current test with only its runNeighborhoodEngine source read replaced in memory by `git show fbcb6e7b^:phase05-citizens/runNeighborhoodEngine.js`. Result: **21 passed, 5 failed**. The two trajectory assertions, two missing-trajectory assertions and bottom-quarter assertion fail on the old bare-tag writer. They do not merely assert fixture setup. Independent steady/blank/missing probes above extend the committed test's missing-field coverage.

Additional checks: citizenDials **75 passed**, newsroomSourcing **PASS**, node --check clean for engine and changed test. Full suite was not rerun for this bounded review; the commit's 290/290 is author-reported, not independently reproduced here.

## Hunt 6 — SHIP: no rebuild

Three existing files changed: writer, seam test and owning plan. Wrapping existing pool strings with dial metadata and grading at admission is a local cleanup. No new engine, schema, ledger, scheduler or reader system was added. F1 can be repaired at the existing context-entry construction; F2 is documentation propagation.

**Final gate: FIX F1 and F2, then re-review.** Trajectory attribution, steady/blank texture skips, pressure preservation, runtime kind readers and the revised seam assertions are closed. No Task 3 bench/deployment/live proof is claimed.
