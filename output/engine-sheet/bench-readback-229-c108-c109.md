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
