# Bench readback — engine.220 media feedback once per Cycle (engine-sheet S461, 2026-09-14) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@37** = repo `31e2f9d0` (PROD @88 + engine.220 `f559f557`) + bench-only diag217 overlay. Fourth typed resync from live C107 this session; pre-fire typed read (`bench-220-prefire.json`) identical to live (cycleCount 107, ring C105/C106/C107, 0 errors, 943 rows). Sole suspect: engine.220.

## C108 predictions

1. Fire `ok:true`, 108, 0 Engine_Errors. **`timing.phaseCount` = 132** (was 133) and **no `Phase7-MediaFeedback` entry** in `timing.timings`; every recorded phase ok.
2. Economy identical to @36: `diag61.mood` 59.01, `moodAfterRun` 55.83, persisted 56, 1 run, 5/5.
3. Ring C108 `sentiment` differs from @36's −0.18 by at most the one removed media shift (the doubled `applyMediaToCityDynamics_` step ≤ 0.25); `mediaEffects` still carried (Phase 8 owns it now).
4. Ghost-skip → sheet-recovery diag for the three original keys (bench props still stamped 109) plus a `PREV_HOOD_ECON_JSON missing` — expected on a resynced bench.

## C109 predictions

1. Fire ok, 109, 0 errors, **132/132**, no `Phase7-MediaFeedback`; `diag61.mood` = C108 persisted; economy as @36 (53.63 / 54).

## Results — C108 on @37, fired 2026-09-14 ~23:36 Chicago (254 s wall, `bench-220-c108-fire-response.txt`, `bench-220-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 108, 0 errors, phaseCount 132, no `Phase7-MediaFeedback` | `ok:true`, ranMs 249,452, cycleCount **108 (number)**, Engine_Errors **0**, **phaseCount 132, 132 recorded, 0 MediaFeedback entries, 0 not-ok** | PASS |
| Economy unchanged | 59.01 / 55.83 / 56, 1 run 5/5 | `diag61.mood` 59.01, `moodAfterRun` **55.83**, persisted **56**, `economyRuns 1`, `5/5` | PASS |
| Ring C108 sentiment | @36's −0.18 ± the one removed media shift | **−0.16** (+0.02 = the doubled `applyMediaToCityDynamics_` step gone); `mediaEffects` carried (sentimentPressure −0.3, anxiety 0.4, hope 0.1, crisisSat 0.3, celeb 0.36) | PASS |
| `carryForward` | ghost-skips → recoveries for the original keys, hood key missing | as predicted (the resync copies the sheet; the bench props still carried the @36 run's C109 stamps; the hood ring row did not survive the resync → `ghost-skipped` then `missing`, graceful) | PASS |

## Results — C109 on unchanged @37, fired ~23:41 (173 s wall, `bench-220-c109-fire-response.txt`, `bench-220-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors, 132/132, no media slot, no carry events | `ok:true`, ranMs 168,460, cycleCount **109 (number)**, Engine_Errors **0**, **132/132**, 0 MediaFeedback entries, `carryForward` **absent** | PASS |
| Economy | as @36 | `diag61.mood` **56**, `moodAfterRun` **53.63**, persisted **54** | PASS |
| Ring C109 sentiment | @36's −0.15 ± one shift | **−0.14** | PASS |

**Bench state after C109:** SANDBOX 0908 @37 = `31e2f9d0` + bench-only diag217; sheet at C109, bench-only since this session's fourth typed C107 resync.
