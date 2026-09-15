# Bench readback — engine.229 weather disasters reach the economy (engine-sheet S462, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@43** = repo `fe85a787` (PROD @91 `8ea1624b` + engine.229) **+ DIAG229 bench-only overlay** (a synthetic `flood_conditions` event pushed by the weather model at C108 on the four flood hoods — never ships). Fifth typed resync from live C107 this session. Baseline: @42's C108/C109 (`bench-228b-c10{8,9}-readback.json`: C108 econ 56 / sentiment −0.16, hood blob 53.7–57.4 with Jack London 57.4 top, Fruitvale 53.7 bottom; ripples CRIME_SPIKE, PLAYOFF_SPENDING ×2, BUSINESS_EXPANSION, WINTER_DOLDRUMS, CRIME_SPIKE).

## C108 predictions (the flood Cycle)
1. Fire ok, 108, 0 Engine_Errors.
2. Ring `economicRipples@108` gains **one NATURAL_DISASTER(−25, 108)** with `neighborhoods` = Jack London, West Oakland, Fruitvale, Chinatown and `primaryNeighborhood` Jack London; @42's six ripples still present; no INFRASTRUCTURE_FAILURE.
3. City economy **below @42's 56** (the −25 enters the city level).
4. Hood blob: the **four flood hoods are the four lowest** — Jack London (primary, −3.75) drops from the top of the table to the bottom group; each flood hood at least 2 points under the lowest non-flood hood. Other hoods keep their @42 order among themselves.
5. Chaos cars and demographics also read the synthetic flood (1–3 `flood-business` Ripple_Ledger lines, illness strain) — bench-only side effects, not asserted.

## C109 predictions
1. Fire ok, 109, 0 errors; NATURAL_DISASTER still on the ring with `currentStrength` decayed toward 0 (8-Cycle ripple); the four flood hoods still the lowest but closer to the rest than at C108; the engine.225 Phase-2 term prices them down at C109 (`neighborhoodDynamics` Jack London / Fruitvale sentiment below @42's C109 values).

## Results — C108 on @43 (flood), fired ~14:19: the ripple is right, the run was killed at the cap

- **The wire works:** ring `economicRipples@108` gained **NATURAL_DISASTER(−25, 108→116)** with `neighborhoods` Jack London / West Oakland / Fruitvale / Chinatown, primary Jack London, source the flood detail; @42's six ripples still present; no INFRASTRUCTURE_FAILURE. Hood blob: the four flood hoods are the **four lowest** — West Oakland 49.4 (@42 54.1), Fruitvale 50.4 (53.7), Chinatown 50.6 (54.6), **Jack London 51.8 (57.4 — from the top of the table to the bottom group)**; lowest non-flood hood 53.2 (Downtown). City economy **55** (@42 56). Engine_Errors 0. Riley_Digest C108 present.
- **But the run took 362 s** (every earlier fire this session 144–236 s) and **World_Config.cycleCount stayed 107** while every other tab moved to 108 — the engine.136 stall signature: the run was killed at Apps Script's 6-minute cap before the end-of-Cycle flush. Bench left inconsistent → resynced.
- **Diag fire @44 (flood + bench-only `Diag_Fire` progress overlay), ~14:37, wall 362 s again:** last phase reached **Phase10-CommitLedger (126 of 132) at 358 s**. Phases over 4 s: Phase5-Advancement **152.1 s**, HouseholdFormation 21.1 s, Education 14.9 s, GenerationalWealth 12.3 s, MigrationTracking 11.3 s, Promotions 11.3 s, ContractSeeds 9.7 s, CitizenEvents 8.1 s, Famous 6.3 s, CyclePacket 4.2 s, CycleState 4.1 s. Control fire (no flood, same overlay) next — @45 — to attribute the extra ~160 s.

# @46 = `47063de6` (PROD @91 + engine.229 + engine.230) + DIAG229 synthetic flood at C108, no progress overlay — PRE-DECLARED
Sixth typed resync from live C107 (14:54). Predictions: C108 **completes** (World_Config.cycleCount 108, wall under 360 s — the run-clears take Advancement's 143 round-trips to a handful), 0 Engine_Errors, NATURAL_DISASTER(−25, 108) on the ring with the four flood hoods and primary Jack London, the four flood hoods the four lowest on the hood blob, economy 55. C109: completes, ripple decayed, hoods starting back, Phase-2 term prices the flood hoods down.

## Results — C108 on @46 (229 + 230, flood), fired ~14:59 (348 s wall incl. the interstitial; `bench-230-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| The Cycle completes | cycleCount 108, under the cap | **cycleCount 108** (flush landed — the first afternoon fire today to do so; @43 / @44 / @45 all died at ~350–362 s), Engine_Errors **0**, Riley_Digest C108 present | PASS |
| NATURAL_DISASTER | −25 × 8 on the four flood hoods, primary Jack London | **NATURAL_DISASTER(−25, 108→116)**, neighborhoods Jack London / West Oakland / Fruitvale / Chinatown, primary Jack London, source the flood detail | PASS |
| Hood blob | the four flood hoods lowest | **West Oakland 49.4, Fruitvale 50.4, Chinatown 50.6, Jack London 51.8**, then Downtown 53.2 — identical to @43's flood Cycle (deterministic) | PASS |
| Economy | 55 | **55**, sentiment −0.16; activity entry `{events 1587, seeds 31, media 0, crime 0, shockCount 9}` | PASS |

## Results — C109 on unchanged @46, fired ~15:05 (284 s; `bench-230-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Completes | 109, 0 errors | **cycleCount 109**, Engine_Errors **0** | PASS |
| Ripple decays | strength toward 0 | NATURAL_DISASTER `currentStrength` **−21.87** (from −25), still on the four hoods | PASS |
| Flood hoods | still lowest, starting back; Phase-2 term prices them down | lowest four **Jack London 48.2, Fruitvale 48.5, West Oakland 48.7, Chinatown 49.0** (median 51.35); `neighborhoodDynamics` sentiment vs @42's C109: Jack London **−0.2896 (−0.2452)**, Fruitvale −0.1676 (−0.1484), West Oakland −0.1224 (−0.0811), Chinatown −0.2906 (−0.2739); Temescal −0.1914 (−0.1917, unchanged) | PASS — a flood on the waterfront is now a lived week: the four hoods' own streets price it |
| Economy | carries the hit | **52** (@42 54), sentiment −0.15; two activity entries on the ring | PASS |

**Bench state after C109:** SANDBOX 0908 @46 = `47063de6` + bench-only flood overlay; sheet at C109. **PROD @92 (version 81) = `47063de6`** pushed ~15:12 on Mike's go, pull-back byte-identical (168/168 js, 0 test files, no overlay).
