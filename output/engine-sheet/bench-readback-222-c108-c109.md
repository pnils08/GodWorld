# Bench readback — engine.222 economy inputs (engine-sheet S461, 2026-09-14) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app `AKfycby-f9gv5s…` **@35** = repo `8efb8ec4` (PROD @86 + engine.222) + bench-only diag217 overlay. Resynced typed from live C107 again this session (82 tabs / 53,083 rows, read-back OK). Pre-fire typed read (`bench-222-prefire.json`): cycleCount **107 (number)**, `econMoodInertia` absent (self-arms), Engine_Errors 0, ring C105 59.28 / C106 59.54 / C107 **59.01**, ledger 943 — identical to the engine.221 baseline.

Sole suspect for any economy/media anomaly: engine.222 (221 is proven on the same state at @34). Ghost guard selects the C107 slot — expected.

## C108 predictions (January, no holiday, Winter — the ring says C108 holiday `none`)

1. Fire `ok:true`, cycleCount 108, 0 Engine_Errors, 133/133 phases.
2. Ring C108 `economicRipples`: **no `FACTORY_CLOSURE`** (the "road closure decision" line still draws — same seed — but files nothing); **`WINTER_DOLDRUMS` −4 present** (start 108, end 114), the first time it has ever fired.
3. Level (`diag217.moodAfterRun` back-solved): under @34 the level was 48.81 with ripples summing −16.93. Under @35: −16.93 + 20 (no closure) − 4 (doldrums) = −0.93 → ×0.1 = −0.09; +0.5 drift; **January −2** now live → level ≈ **48.4**. `moodAfterRun` ≈ 59.01 + 0.3 × (48.4 − 59.01) ≈ **55.8**. Band 54.5–57.5 (the skipped closure neighborhood draw shifts later rng).
4. Persisted C108 econMood ≈ 56 (integer, post-migration).
5. `World_Events` rows stamped Cycle 108 carry **Month = 1** (was 0 on every live row).
6. Carried `mediaEffects` (compacted) — `seasonalMood` `winter_doldrums` if the compactor keeps it; otherwise not claimed.
7. `econMoodInertia` self-armed 0.3; engine.217 holds (1 run, 5/5).

## C109 predictions

1. Fire ok, 109, 0 errors. `diag61.mood` = C108 persisted.
2. `WINTER_DOLDRUMS` still carried (cur −4 × decay), still no `FACTORY_CLOSURE`; level ≈ 48–49; `moodAfterRun` ≈ C108-persisted + 0.3 × (level − C108-persisted) ≈ **53.7**; persisted ≈ 54.

## Results — C108 on @35, fired 2026-09-14 ~22:32 Chicago (207 s wall, `bench-222-c108-fire-response.txt`, `bench-222-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 108, 0 errors, 133/133 | `ok:true`, ranMs 203,643, cycleCount **108 (number)**, Engine_Errors **0**, **133/133** | PASS |
| Ring C108 ripples | no FACTORY_CLOSURE; WINTER_DOLDRUMS −4 present | 6 ripples, sum **−0.93**: CRIME_SPIKE −8 (Downtown), PLAYOFF 6.4, BUSINESS_EXPANSION 4, **WINTER_DOLDRUMS −4 (108→114, "Post-holiday spending slowdown")**, PLAYOFF 2.67, CRIME_SPIKE −2 — **no FACTORY_CLOSURE** (@34 had it at −20 from "road closure decision") | PASS |
| `diag217.moodAfterRun` | ≈55.8 (band 54.5–57.5) | **55.83** → level 48.41 (−0.09 ripple + 0.5 drift − 2 January) | PASS |
| Persisted C108 econMood | ≈56 | **56**, sentiment −0.18 | PASS |
| `WorldEvents_Ledger` Month | C108 rows = 1 | C105 13 rows / C106 8 / C107 11 all **0**; **C108 9 rows = 1** | PASS |
| `econMoodInertia` / engine.217 | 0.3; 1 run, 5/5 | 0.3 (number); `economyRuns 1`, `modules 5/5`; `diag61.mood` 59.01 | PASS |
| Carried mediaEffects `seasonalMood` | if the compactor keeps it | compactor does not carry it (anxietyFactor 0.4, hopeFactor 0.1 present) — not claimed; the media seasonal branch is proven by the vm test | — |

## Results — C109 on unchanged @35, fired ~22:37 (195 s wall, `bench-222-c109-fire-response.txt`, `bench-222-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors | `ok:true`, ranMs 188,719, cycleCount **109 (number)**, Engine_Errors **0**, **133/133** | PASS |
| `diag61.mood` | 56 (C108 carry) | **56** | PASS |
| Ring C109 ripples | doldrums carried, no closure | 4 ripples, sum −4.13: CRIME_SPIKE −6, **WINTER_DOLDRUMS −3.33**, PLAYOFF 3.2, BUSINESS_EXPANSION 2; no FACTORY_CLOSURE | PASS |
| `diag217.moodAfterRun` | ≈53.7 | **53.63** (level ≈ 48.1) | PASS |
| Persisted C109 econMood | ≈54 | **54**, sentiment −0.15 | PASS |
| `WorldEvents_Ledger` Month | C109 rows = 1 | **C109 9 rows = 1** | PASS |
| Ledger | — | 955 rows | — |

**Bench state after C109:** SANDBOX 0908 @35 = `8efb8ec4` + bench-only diag217; sheet at C109, bench-only since this session's second typed C107 resync (C108–C109 and everything they wrote: 12 feeder mints, ring slots 108/109, the `econMoodInertia` row).
