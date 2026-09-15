# Bench readback — engine.219 hood economic carry + engine.223 carry save guard (engine-sheet S461, 2026-09-14) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app `AKfycby-f9gv5s…` **@36** = repo `e31399b9` (PROD @87 + engine.223 + engine.223b + engine.219) + bench-only diag217 overlay + bench-only diag219 overlay (`output/engine-sheet/engine219-diag-overlay.js`: hood moods at Phase 2 open, after the Phase-6 economy, after Phase-6 migration). Third typed resync from live C107 this session. Pre-fire typed read (`bench-219-prefire.json`): cycleCount 107 (number), ring C105/C106/C107 = live, no `PREV_HOOD_ECON_JSON` row, 0 Engine_Errors, 943 rows.

Pre-declared suspects: any hood value → engine.219; any `carryForward` diag event other than the expected `missing` for `PREV_HOOD_ECON_JSON` at C108, or a `prop-too-large` event → engine.223 (a `prop-too-large` would also be a finding about the blob size, not a defect of the guard). Two changes ride one bench by this seat's call: separable outputs.

## C108 predictions (first fire on this code — the hood blob does not exist yet)

1. Fire `ok:true`, 108, 0 Engine_Errors, 133/133. Fire JSON `carryForward` carries exactly one event: `{key: PREV_HOOD_ECON_JSON, event: missing, cycleId: 108}` (graceful, not an abort).
2. `diag219.phase2Hoods` = **{}** (nothing carried yet). `diag219.afterEconomy` = 22 hoods; **range:** every hood within a few points of the city Phase-6 mood (55.8 at @35): Jack London / Downtown above it (playoff + business ripples), West Oakland / Downtown pulled by the crime spikes, the rest equal to the city value. `afterMigration` = the same set ±2 where migration moved a hood.
3. Ring gains a `PREV_HOOD_ECON_JSON` row for cycle 108, ~22 entries, < 1 KB. `PREV_CYCLE_STATE_JSON` size unchanged in kind (~8.2 KB) and carries no `neighborhoodEconomies` key.
4. Economy unchanged from @35: `moodAfterRun` ≈ 55.8, persisted ≈ 56, no FACTORY_CLOSURE, WINTER_DOLDRUMS present.

## C109 predictions (the causal proof)

1. Fire ok, 109, 0 errors, 133/133, **no** `carryForward` events (the hood blob exists now).
2. `diag219.phase2Hoods` = C108's `afterMigration` set exactly (22 hoods, one-decimal rounding) — Phase 2 opened on last Cycle's hood economies for the first time.
3. Consumers: `applyEconomyLocal_` fires `retail ×1.03 / sentiment +0.02` for any cluster whose C108 hood-mood average ≥ 60 — declared from the C108 emit below before the C109 fire; the per-hood micro (≥70 / ≤30) stays dark at this band.
4. Ring `PREV_HOOD_ECON_JSON` rotates (rows for 108 and 109).

## Results — C108 on @36, fired 2026-09-14 ~22:55 Chicago (199 s wall, `bench-219-c108-fire-response.txt`, `bench-219-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 108, 0 errors, 133/133 | `ok:true`, ranMs 195,162, cycleCount **108 (number)**, Engine_Errors **0**, **133/133** | PASS |
| `carryForward` | one `missing` for `PREV_HOOD_ECON_JSON` | `PREV_HOOD_ECON_JSON missing` present; plus `ghost-skipped (stamped 109) → recovered-from-sheet (107)` for the three original keys — the bench's PropertiesService still held the @35 run's C109 stamps and the sync copies the sheet only; engine.119's guard stepped back to the C107 ring as designed. **No `prop-too-large`.** | PASS (ghost recoveries expected on a resynced bench) |
| `diag219.phase2Hoods` | `{}` | **`{}`** | PASS |
| `diag219.afterEconomy` range | 22 hoods within a few points of the city 55.83 | **22 hoods, 54.14 (Fruitvale) – 56.96 (Jack London)**; Downtown 54.78 (crime spike), West Oakland 55.32, 17 hoods at 55.31–55.51 (= city ± sensitivity of the citywide doldrums ripple) | PASS |
| `diag219.afterMigration` | same set ±2 | integers **54–57** (migration rounds): Temescal/Jack London/Grand Lake 57; Fruitvale/West Oakland/Chinatown/KONO/Uptown/Baylight 54 | PASS |
| Ring `PREV_HOOD_ECON_JSON` | one row, 22 entries, < 1 KB | **row for 108, 338 chars, 22 hoods**; `PREV_CYCLE_STATE_JSON` C108 8,244 chars, no `neighborhoodEconomies` key | PASS |
| Economy unchanged from @35 | ≈55.8 / 56 | `moodAfterRun` **55.83**, persisted **56**, `diag61.mood` 59.01, 1 run, 5/5 | PASS |

**Declared for C109 from this emit:** no cluster's C108 hood-mood average reaches 60 (all 22 hoods sit 54–57), so `applyEconomyLocal_`'s ≥60 branch does not fire at C109 and the per-hood micro stays dark. The C109 proof is the plumbing: `phase2Hoods` must equal the `afterMigration` set above.

## Results — C109 on unchanged @36, fired ~22:59 (160 s wall, `bench-219-c109-fire-response.txt`, `bench-219-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors, 133/133, no `carryForward` events | `ok:true`, ranMs 156,716, cycleCount **109 (number)**, Engine_Errors **0**, **133/133**, `carryForward` **absent** (hood blob found, no ghosts) | PASS |
| `diag219.phase2Hoods` = C108 `afterMigration` | 22/22 | **22/22 equal** — Phase 2 opened on last Cycle's hood economies for the first time | PASS — the causal proof |
| Consumers | no cluster ≥ 60 → `applyEconomyLocal_` ≥60 branch dark; micro dark | consistent (all 22 at 54–57 on open); city economy identical to @35 (`moodAfterRun` 53.63, persisted 54, `diag61.mood` 56) — the seeded values crossed no threshold at this band, as declared | PASS |
| C109 `afterEconomy` / `afterMigration` | hoods hug the city (53.63) | **52.5–53.8** after economy; **51–55** after migration (Jack London 55; Brooklyn / Ivy Hill / San Antonio / Baylight / East Oakland 51) | — (range on record) |
| Ring `PREV_HOOD_ECON_JSON` | rotates | rows for **108 and 109**, 338 chars / 22 hoods each | PASS |
| engine.223 | no `prop-too-large` | none (blob 8,244 chars, under the cap); guard proven by the 9/9 vm test | no regression |

**Range on record (first ever per-hood economic moods observed on this bench):** hoods sit within about ±2 of the smoothed city mood after Phase 6 and within ±3 after migration's rounding. The cluster-economy consumer's absolute bars (≥60 / ≤40, ≥70 / ≤30) sit outside today's band — a relative band (§15) is the follow-up, filed on the watch list, not in this cut.

**Bench state after C109:** SANDBOX 0908 @36 = `e31399b9` + bench-only diag217 + diag219; sheet at C109, bench-only since this session's third typed C107 resync (C108–C109 and everything they wrote: 12 feeder mints, ring slots 108/109 incl. the new hood key, the `econMoodInertia` row).

