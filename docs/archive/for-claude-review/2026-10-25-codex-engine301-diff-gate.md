---
title: engine.301 F1 candidate diff gate 1
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine301-diff-gate-TASK.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
  - docs/archive/for-claude-review/2026-10-25-codex-engine301-crime-plan-review.md
---

# engine.301 F1 — Codex diff gate 1

Target: commit `e3266c44` and the four named bench scripts; source inspected at that commit/current matching files. **Final gate: HOLD** on the code failure path and receipt validation below. Bench is still running; this is no bench or PROD verdict.

## 1. Code against plan review §§1–2 — FIX

- Closed: CityDynamics no longer reads a pre-set map; it counts carried spikes and dedupes carried wave names (`phase02-world-state/applyCityDynamics.js:245-259`). Phase 9 compacts once into `crimeCarry`, gives the same list to both snapshot fields, and reads the published prior level (`phase09-digest/finalizeCycleState.js:56-58,158-169,834-853`). The log says “level” (`applyCityDynamics.js:1575-1577`). These are real source changes, not bench proof.
- **HIGH — failed Phase 2 can still mint a wave.** `S.crimeByNeighborhood` is assigned at `applyCityDynamics.js:259`, before `getCanonNeighborhoods_` can throw at `:853` and before the remaining fold. The runner catches that exception and continues (`phase01-config/godWorldEngine2.js:159-169,583,810`); Phase 9 then treats the stale publication as a successful prior-rise signal (`finalizeCycleState.js:164-169,841-853`). This contradicts the plan's “unset when Phase 2 failed” claim (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:326,336`). Publish the map only on successful CityDynamics completion, or explicitly clear it on failure; test an actual throw **after** derivation with a current qualifying rise.
- **MED — a carried name alone can fabricate level 3.** The wave loop accepts a nonempty string in `previousCycleState.crimeWaveHoods` without requiring that hood in `prevCrimeSpikes` (`applyCityDynamics.js:247-259`). The normal Phase 9 writer constructs a subset (`finalizeCycleState.js:56-58,162-169`), but the loader parses an unvalidated blob (`phase01-config/loadPreviousEvening.js:266-290`). Intersect the prior wave list with prior spikes and the canon hood set; assert malformed/foreign wave entries do not create a rung or a receipt.
- **MED — receipt semantics only partly closed.** `Magnitude` is now the maximum **level**, even when one prior spike backs level 3 (`applyCityDynamics.js:1299-1301,1592-1595`); `causeDetail` still prints `(now X)` for a prior-Cycle Crime_Metrics value and never labels the number 3 as a level (`:1582-1589`). The plan review asked for prior-Cycle metrics and the level (`2026-10-25-codex-engine301-crime-plan-review.md:21`). State “last Cycle” and “level 3” in the receipt; pin the one-spike wave case. The log correction alone does not correct the ledger row.

## 2. Tests — FIX

- Block 6/6c loads the real Phase 2 source (`scripts/perHoodDynamics.test.js:42-69`): dropping publication fails `:245-247`, dropping the Phase 9 wave fails `:274-282`, and reading a pre-set map fails `:235-237`. The snapshot chain and the no-decay case are useful (`:261-290`). These are focused VM assertions; the commit's 89/89 and 296/296 claims were not rerun here.
- Two plausible regressions pass: the “Phase 2 failed” fixture simply omits the map, never makes CityDynamics throw **after** its early assignment (`perHoodDynamics.test.js:298-301`); the cap test calls the helper on an already capped list, while the full snapshot test has only two spikes (`:274-278,291-297`). Add a real failed-phase wrapper case and a 13-rise `finalizeCycleState_` snapshot assertion that the two carried fields agree.
- T11 drives the real Phase 5 generator and compares 600 identical seeds at levels 0/1/3 (`scripts/engine299Graded.test.js:179-205`); extracting `hoodStateMedian_`/`hoodCrimeBar_` from source and setting the actual World_Config defaults is acceptable for this isolated pool (`:185-196`; `phase01-config/engine94SheetContract.js:504-505`). It directly sets levels, stubs other hood texture, and uses an empty one-hood state (`engine299Graded.test.js:183,193-197`), so it proves draw reach/order here, not the Phase 2→5 handoff, live pool share, exact `min(1, level/3)` weight, or an actual DialState delta. Assert the entry weights or a bounded offer share and a decoded dial change; keep the draw test as supplemental evidence.

## 3. Bench scripts — HOLD

- Static target check **SHIP**: push uses fixed sandbox Script ID/deployment and compares the built stage outside two files plus `e3266c44^` copies against the stage-25 manifest before a pull-back compare (`output/engine-sheet/2026-10-25-push-e301-bench.sh:10-36`). Probe hardcodes the sandbox Sheet ID/title (`2026-10-25-e301-probe.js:8-16`); receipt reads the sandbox and frozen baseline (`2026-10-25-e301-receipt.js:18-29`). The runner's fire helper reads the live counter but its fixed URL and title check target the bench (`2026-10-19-benchfire.js:9-11,24-34,57-58`). No live write path was found in these calls. The pull-back proves project files, not by itself the deployed URL's version.
- The probe writes **both** Fruitvale's C112 spike and its wave name (`e301-probe.js:17-28`); it is a valid rung/receipt/Phase 5 consumer probe but bypasses the two-Cycle wave producer. Its readback checks only the wave list and spike count, not the exact row. Leg S must carry the organic producer proof; label P accordingly (`e301-bench.sh:31-46`).
- **HIGH — receipt can PASS with broken behavior.** It reconstructs `levels` from C−1's ring row, never observes the published `S.crimeByNeighborhood` (`e301-receipt.js:54-59`); it rejects lines at level 0 but requires no line or offer at level 1/3 (`:84-92`), so a silent Phase 5 reader can pass. It records Engine_Errors but never HOLDs on them (`:109-112,114-134`). Require the probe's expected Fruitvale output or typed offer/draw receipt, and make unexpected Engine_Errors a HOLD.
- **HIGH — ring/window checks are incomplete.** `prevCarried` wrongly unions prior `crimeWaveHoods` with prior `crimeSpikes`, so a wave can pass the back-to-back test without a prior spike (`e301-receipt.js:47-53`); prior wave shape, spike element types/metrics, uniqueness, and exact C/C−1 consistency are not checked (`:34-59`). `--final` silently skips missing Cycle receipts and exits by the current Cycle's holds only (`:122-134`). Require previous **spikes**, validate both typed blobs, and fail unless every expected receipt exists and passed.
- The borrowed `reset_leg` does more than reset: after its baseline comparison it applies marital migration and Generic_Citizens headers (`e301-bench.sh:15-16`; `2026-10-22-e308-bench.sh:19-26`). Show post-reset deltas or use a clean F1 reset before treating P/S as `BASELINE-1004-C112b`. A HALT exits before the declared stage-25 restoration (`e301-bench.sh:23-26,48-50`); report the left-on-bench version explicitly in the halted receipt. The runner's `aimcheck` also writes/clears `_CycleCheckpoint!A1` without refusing a pre-existing manifest (`2026-10-19-aimcheck.js:13-20`); guard that marker operation before reuse.

## 4. Remaining diff scope — SHIP

The commit changes only the two F1 engine files, their two focused test files, and generated stub maps reflecting the new writer/helper (`git show --stat e3266c44`; `docs/engine/ENGINE_STUB_REVERSE.md:106`). No F6 drift pool or engine.289 CULTURE/NIGHTLIFE implementation appears in this diff. No tests, bench fire, Sheet read/write, model call, commit, or push was performed for this gate.

**Correction — 2026-10-25 (codex):** The receipt also only *reports* `risesDroppedByCap`; it never rejects a missing carry when fewer than 12 qualifying rises exist (`output/engine-sheet/2026-10-25-e301-receipt.js:70-79,114-134`). A broken `compactCrimeSpikes_` could drop every organic rise and still PASS leg S. Require each pre-cap qualifying metric to appear in the post-cap list unless it was genuinely displaced by 12 stronger entries; verify carried magnitude/newValue against the Crime_Metrics delta and row.
