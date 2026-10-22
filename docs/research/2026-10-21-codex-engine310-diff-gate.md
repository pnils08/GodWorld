---
title: Codex engine.310 diff gate
created: 2026-10-21
updated: 2026-10-21
type: plan
tags: [engine, draft]
sources: [docs/research/2026-10-21-engine310-diff-gate-TASK.md]
---

# Engine.310 diff gate

- **1 Code — SHIP:** `eventAttractBase_` counts each published city name, skips `city-event` seeds, retains separate world-event domain/text hits and uses whole-word regexes without `g`; the three removed locals fed only the old base. No other JS declaration/reference of the new globals found; stub-map changes only move these `S` reads into the new function. Other writer columns and RNG calls stay outside the changed path. `phase08-v3-chicago/v3NeighborhoodWriter.js:294-341,391-415`; `docs/engine/ENGINE_STUB_MAP.md:3399-3407`; `docs/research/2026-10-21-engine310-plan-TASK.md:69-75`.
- **2 Fixtures — SHIP:** The old base is marker-cut from `50d433b7`; 104 event names run individually, ten tapped lines are checked, false/admitted words and empty/duplicate city-seed cases are covered, and the B2 reconstruction is explicitly analytical. `output/engine-sheet/2026-10-21-e310-fixtures.js:19-28,34-63,65-112`; `output/engine-sheet/2026-10-21-e310-fixtures.json:1-7`.
- **3 Bench — SHIP (bounded):** B3/B3t C113 receipts and judge support base 5 = city 3 + seed 2, 22 per-hood predictions, equal reader/spot receipts apart from EA, equal draw marks/fold inputs, clean fire records, and restored stage-18 bench code. Judge `diffKeys` is one-sided and does not compare `pre5`; direct read-only checks found equal top-level key sets, equal `pre5`, and equal 22-hood sets in these saved receipts. This proves this paired bench, not a live Cycle or every Sheet tab. `output/engine-sheet/2026-10-21-e310-check.js:24-26,32-85`; `output/engine-sheet/2026-10-21-e310-check.json:239-240`; `output/engine-sheet/2026-10-21-e310-pair.log:79-92`.
- **4 PROD plan — FIX:** Keep the C113 live read before the push; the stage-19 push script is still only a plan, so review its stage-18 preimage, exact `ffad3bf8` writer, committed B3 manifest, pinned deployment/pull-back and `2896c46c` rollback before PROD. A pre-push numeric estimate from Riley Q/U and Story_Hook_Deck would omit unsaved seeds and folds; do not require it as proof. Add a C114 watch line for Riley staged-event count, story-seed/hook counts, every saved EA and sum/range against C113, Phase10/Engine_Errors and persistence; an all-hood drop or spike needs diagnosis, not automatic attribution to this patch. Check C115 migration/trajectory too, since they read the prior saved map. `docs/research/2026-10-21-engine310-diff-gate-TASK.md:23-25`; `output/engine-sheet/2026-10-21-push-e306-prod.sh:13-27,30-42`; `docs/reference/DEPLOY_HISTORY.md:170`; `phase05-citizens/neighborhoodTrajectoryEngine.js:95-112`; `phase06-analysis/applyMigrationDrift.js:363-407`.

**Gate: code/fixtures/bench SHIP; PROD HOLD** until C113 live read and a reviewable stage-19 push/watch artifact. Source and saved bench receipts reviewed read-only; no live or deployment action taken.
