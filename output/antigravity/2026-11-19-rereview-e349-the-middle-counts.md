# Adversarial Re-Review — `engine.349` Task 14 Fold (`a701ded16`)

**Reviewed:** commit `a701ded16b1077f79cb154c2a9306aabde9f92f2` (`utilities/citizenMemory.js`, `phase05-citizens/runConductEngine.js`, `phase05-citizens/casinoLedgerEngine.js`, `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/updateCivicApprovalRatings.js`, `lib/citizenDials.js`, and 10 test files), against `output/simulation_ledger_snapshot.jsonl` (`n = 1,075`).
**Reviewer:** Antigravity (agy lane, read-only; no code or sheet edits, no bench or engine fires, no model runs).
**Verdict:** **SHIP-WITH-FIXES**

All 10 touched test files pass (`node <file>`, exit 0). All blocking findings from `2026-11-18-review-e349-the-middle-counts.md` are resolved (`runConductEngine.js` four-way cut, `dialLadder_` falsy-non-number throw, `casinoLedgerEngine.js` post-place `tilt` draw, `updateCivicApprovalRatings.js` continuous drive score, `citizenDialMultiCycle.test.js` exact `crimeReach`, `LEANS` adjective phrasing). Remaining issues in the fold are listed below.

---

## 1. `phase05-citizens/runConductEngine.js:259-311` — Four-Way Cut

Expected integrity delta per test (`E[dInt]/test`, using `CONDUCT_GRAVE_P_`, `CONDUCT_SERIOUS_P_`, `CONDUCT_SLIP_P_`, `Resisted = +5`, `BoundaryKept = +1`, `BoundaryCompromised = -1`):

| `composure` | `spike` | `integrity` | `reach` | `P(Commit)` | `P(Resisted)` | `P(Slip)` | `P(Kept)` | `E[dInt]/test` | Old `E[dInt]` |
|---|---|---|---|---|---|---|---|---|---|
| 50 | false | 10 | 1.00 | 0.7500 | 0.2500 | 0.0000 | 0.0000 | **-3.7000** | -3.7000 |
| 50 | false | 15 | 0.75 | 0.5250 | 0.2250 | 0.0875 | 0.1625 | **-2.1337** | -3.7000 |
| 50 | false | 20 | 0.50 | 0.3250 | 0.1750 | 0.1750 | 0.3250 | **-0.9575** | 0.3000 |
| 50 | false | 25 | 0.25 | 0.1500 | 0.1000 | 0.2625 | 0.4875 | **-0.1525** | 0.3000 |
| 50 | false | 30 | 0.00 | 0.0000 | 0.0000 | 0.3500 | 0.6500 | **+0.3000** | 0.3000 |
| 50 | false | 45 | 0.00 | 0.0000 | 0.0000 | 0.2750 | 0.7250 | **+0.4500** | 0.5000 |
| 50 | false | 50 | 0.00 | 0.0000 | 0.0000 | 0.2500 | 0.7500 | **+0.5000** | 0.5000 |
| 50 | false | 55 | 0.00 | 0.0000 | 0.0000 | 0.2250 | 0.7750 | **+0.5500** | 0.5000 |
| 50 | true | 10 | 1.00 | 0.4500 | 0.5500 | 0.0000 | 0.0000 | **-0.2200** | -0.2200 |
| 50 | true | 15 | 0.75 | 0.3150 | 0.4350 | 0.0875 | 0.1625 | **+0.2497** | -0.2200 |
| 50 | true | 20 | 0.50 | 0.1950 | 0.3050 | 0.1750 | 0.3250 | **+0.4855** | 0.3000 |
| 50 | true | 25 | 0.25 | 0.0900 | 0.1600 | 0.2625 | 0.4875 | **+0.4985** | 0.3000 |
| 50 | true | 30 | 0.00 | 0.0000 | 0.0000 | 0.3500 | 0.6500 | **+0.3000** | 0.3000 |
| 50 | true | 45 | 0.00 | 0.0000 | 0.0000 | 0.2750 | 0.7250 | **+0.4500** | 0.5000 |
| 50 | true | 50 | 0.00 | 0.0000 | 0.0000 | 0.2500 | 0.7500 | **+0.5000** | 0.5000 |
| 50 | true | 55 | 0.00 | 0.0000 | 0.0000 | 0.2250 | 0.7750 | **+0.5500** | 0.5000 |
| 10 | false | 10 | 1.00 | 0.7500 | 0.2500 | 0.0000 | 0.0000 | **-3.8500** | -3.8500 |
| 10 | false | 15 | 1.00 | 0.7000 | 0.3000 | 0.0000 | 0.0000 | **-3.0850** | -3.8500 |
| 10 | false | 20 | 1.00 | 0.6500 | 0.3500 | 0.0000 | 0.0000 | **-2.3450** | -0.9400 |
| 10 | false | 25 | 1.00 | 0.6000 | 0.4000 | 0.0000 | 0.0000 | **-1.6300** | -0.9400 |
| 10 | false | 30 | 1.00 | 0.5500 | 0.4500 | 0.0000 | 0.0000 | **-0.9400** | -0.9400 |
| 10 | false | 45 | 0.25 | 0.1000 | 0.1500 | 0.2063 | 0.5437 | **+0.5705** | 0.5000 |
| 10 | false | 50 | 0.00 | 0.0000 | 0.0000 | 0.2500 | 0.7500 | **+0.5000** | 0.5000 |
| 10 | false | 55 | 0.00 | 0.0000 | 0.0000 | 0.2250 | 0.7750 | **+0.5500** | 0.5000 |
| 10 | true | 10 | 1.00 | 0.4500 | 0.5500 | 0.0000 | 0.0000 | **-0.3100** | -0.3100 |
| 10 | true | 15 | 1.00 | 0.4200 | 0.5800 | 0.0000 | 0.0000 | **+0.1490** | -0.3100 |
| 10 | true | 20 | 1.00 | 0.3900 | 0.6100 | 0.0000 | 0.0000 | **+0.5930** | 1.4360 |
| 10 | true | 25 | 1.00 | 0.3600 | 0.6400 | 0.0000 | 0.0000 | **+1.0220** | 1.4360 |
| 10 | true | 30 | 1.00 | 0.3300 | 0.6700 | 0.0000 | 0.0000 | **+1.4360** | 1.4360 |
| 10 | true | 45 | 0.25 | 0.0600 | 0.1900 | 0.2063 | 0.5437 | **+0.9773** | 0.5000 |
| 10 | true | 50 | 0.00 | 0.0000 | 0.0000 | 0.2500 | 0.7500 | **+0.5000** | 0.5000 |
| 10 | true | 55 | 0.00 | 0.0000 | 0.0000 | 0.2250 | 0.7750 | **+0.5500** | 0.5000 |

- **30 -> 10 monotonicity:** At `composure = 50, spike = false`, `E[dInt]/test` moves strictly downward (`+0.3000` -> `-0.1525` -> `-0.9575` -> `-2.1337` -> `-3.7000`) with no bump. Under `spike = true`, `E[dInt]/test` bumps slightly upward between `30` (`+0.3000`) and `25` (`+0.4985`) / `20` (`+0.4855`) because `0.6 * commitL` makes the crime share net-positive (`0.36 * (-5.28) + 0.64 * 5 = +1.30`).
- **`composure = 10` burnout path (`integrity = 30..49.9`):** Citizens at `integrity = 40..49.9` and `composure < 30` (where previously `Resisted` was impossible) now draw `Resisted` (`+5`) on `6.3%` (`int = 48`) to `27.5%` (`int = 40`) of calm tests (`7.8%`–`36.5%` under spike), producing a calm bump from `+0.5000` (`int = 50`) up to `+0.5705` (`int = 45`). In `output/simulation_ledger_snapshot.jsonl`, **`0 / 1,075`** citizens have `composure < 30` (`min composure = 33.89`, `min integrity = 43.00`), so no live citizen enters this path today, though any future citizen dropping under `composure 30` with `integrity 40–49` hits it.

---

## 2. `phase05-citizens/generateCitizensEvents.js:941-959` — `archetypeWeightsFromDials_`

- **Band middles:** Exact match to `getArchetypeWeights_` on all 5 used pool categories (`work`, `alliance`, `rivalry`, `neighborhood`, `continuity`) at `70` (`Striver`, `Connector`, `Caretaker`, `Watcher`, `Anchor`, `Regular`) and `10` (`Catalyst`, `Outlaw`). At `50` (`Drifter`), `archetypeWeightsFromDials_` returns `reflective: 1.0, volatile: 1.0` vs `getArchetypeWeights_('Drifter')` returning `1.1` (`reflective` and `volatile` are unused in `:3629-3634`, so identical in effect).
- **Winner-take-all `argmax` cliff (`:948-949`):** `for (var i = 1; i < cand.length; i++) { if (cand[i].v > lead.v) lead = cand[i]; }` still switches abruptly when two high dials cross:
  - Example: `drive = 70.0, sociability = 69.9` gives `work = 1.30, alliance = 1.00`; `sociability = 70.1` flips `work` `1.30 -> 1.00` and `alliance` `1.00 -> 1.30`.
  - Worse with **`Regular` (`outabout`)**, which has no `switch` case in `getArchetypeWeights_` (returns all `1.0`): if `drive = 69.9` (`work = 1.2985`) and `outabout` crosses from `69.9` to `70.0`, **`work` collapses `1.2985 -> 1.00` and `rivalry` collapses `1.199 -> 1.00`**.
- **Striver-on-base with felt `drive = 58` vs Drifter-on-base with felt `drive = 62`:**
  - `Striver` (`base >= 60`, felt `drive = 58`, leading): OLD `work = 1.30, rivalry = 1.20` -> NEW (`dialHigh_(58, 1) = 0.40`): `work = 1.12, rivalry = 1.08`.
  - `Drifter` (`base < 60`, felt `drive = 62`, leading): OLD `work = 1.00, rivalry = 1.00` -> NEW (`dialHigh_(62, 1) = 0.60`): `work = 1.18, rivalry = 1.12`.
- **Snapshot summed weights (`n = 1,075`, `8` `TraitProfile` vs `base` mismatches):**

| Category (`generateCitizensEvents.js` tag) | OLD (`TraitProfile`) | OLD (`base` label) | NEW (`dials`) | Ratio `NEW / OLD_TP` |
|---|---|---|---|---|
| `source:occupation` (`work`) | `1,112.50` | `1,113.40` | `1,131.20` | `1.0168x` |
| `relationship:alliance` (`alliance`) | `1,137.80` | `1,138.10` | `1,155.28` | `1.0154x` |
| `relationship:rivalry` (`rivalry`) | `1,100.00` | `1,100.60` | `1,112.47` | `1.0113x` |
| `source:neighborhood` (`neighborhood`) | `1,112.20` | `1,112.50` | `1,131.67` | `1.0175x` |
| `source:continuity` (`continuity`) | `1,080.10` | `1,080.40` | `1,086.37` | `1.0058x` |

---

## 3. `phase05-citizens/generateCitizensEvents.js` — `drawMass_` / `dialShare`

- **Verified safe:** `gatedPool`, `showPool`, `filtered`, `usePool`, and `hardPool` (`:3580, 3609, 3739, 3741, 3747`) keep the same object reference (never dropping `dialShare`), and `composeContentLine_` (`:1504`) preserves `dialShare` on copied fragments. `reservedGriefEntry` (`:3715`) uses hardcoded grief lines only.
- **Mixed-`PoolKey` dilution in `balanceContentLedgerPoolWeights_` (`:63-85`):** `balanceContentLedgerPoolWeights_` still sums `entry.weight` **without** `dialShare` into `groups[clk].total` and `ledgerTotal`. In any mixed `PoolKey` holding both unconditional rows and low-`dialShare` rows (like live `culture.spacemolt-pilot` and `culture.spacemolt-show`), the dial-gated rows claim a full-weight share of `bucketMass` during balancing, diluting the unconditional rows in that same `PoolKey` and dropping the `PoolKey`'s actual drawn mass below `bucketMass` once `drawMass_` applies `dialShare`. (`transitCommuteMass_` at `:97-105` has the same unscaled-weight sum, though no live `occupation.transit` row carries a dial term.)
- **`eclEligibleByPool` / `eclExclusivePools` (`:3537, 3559`) & `eclTelemetry.eligible` (`:3536`):** Both count `+1` whole line regardless of `dialShare`. Three `0.01`-share rows (`warmth = 50.2`) in an `eclExclusivePools` key still satisfy `eclEligibleByPool[exclPoolKey] >= 3` and drop all hardcoded `ecl:domain:*` rows for that domain.

---

## 4. `phase05-citizens/casinoLedgerEngine.js:985-989` — Tilt Order and `S.casinoGates`

- **RNG order:** Placing `tilt` at `:986` (after `rng() >= p` at `:985`, before `pickShow` at `:988`) fixes all wasted draws and `tilt` increments on non-betting/ineligible rows. Against `5c0c090bd` (pre-Task-14, 0 tilt draws), a bettor with `10 < composure < 30` shifts `pickShow` by one draw (`#2 -> #3`); against `e39a38052`, `p` and `tilt` swap draws `#1` and `#2`. No existing test pins `pickShow` for `10 < composure < 30` (putting `tilt` after `pickShow` right before `casinoStake_` at `:989` would avoid shifting `pickShow` too, though `0` live snapshot citizens have `composure < 30`).
- **`S.casinoGates`:** Repo-wide grep confirms **zero readers** of `S.casinoGates` outside `casinoLedgerEngine.js:975,987` and `scripts/casinoLedgerEngine.test.js:469`.

---

## 5. `lib/citizenDials.js:50-58` — New `LEANS` in All Three Frames

- **`lib/provocationBank.js:65` (`"You've been carrying a <disp> mood lately."`):**
  - `fandom` low (`40-46`): `'only loosely interested in the teams'` renders **`"You've been carrying a only loosely interested in the teams mood lately."`** (`"a only"` article mismatch).
  - Multi-word prepositional/infinitive phrases (`'slightly loose with small rules'`, `'somewhat fond of routine'`, `'somewhat apart from family'`, `'somewhat inclined to stay in'`, `'somewhat inclined to go out'`, `'casually interested in the teams'`) work cleanly in Frame 1 (`Your temperament: ...`) and Frame 2 (`Lately you've been ...`), and read awkwardly before `"mood"` in Frame 3 (same pre-existing limit as multi-clause `POLES`).
- **Strength vs pole:** All 18 phrases now read noticeably milder than their adjacent poles (`'slightly loose with small rules'` vs `'bends rules when it suits'`, `'somewhat inclined to go out'` vs `'often out in the neighborhood'`, `'casually interested in the teams'` vs `'a real fan, plans around games'`). Note `'only loosely interested in the teams'` (`40-46`) and `'casually interested in the teams'` (`54-59`) remain close in apparent strength to `fandom` pole 1 (`20-39`: `'keeps half an eye on the scores'`).

---

## 6. New Tests in `a701ded16`

- **`scripts/contentLedgerCompose.test.js:659-732`:**
  - `FIX2` (`:663-679`) two-PoolKey ratios (`0.7–1.4` at `70`, `0.3–0.75` at `60`, `0.1–0.45` at `55`) reject the old `1.00` `balanceContentLedgerPoolWeights_` bug, **but** because each `PoolKey` (`test.fan`, `test.plain`) has only 1 row, `FIX2` never exercises the mixed-`PoolKey` dilution in §3.
  - `archetypeWeightsFromDials_` (`:710-732`) tests extracted slices via `new Function(...)` without running `generateCitizensEvents_`, and skips comparing `at({})` against `getArchetypeWeights_('Drifter')` (`1.0` vs `1.1` on unused `reflective`/`volatile`).
- **`scripts/businessOwnerDials.test.js:337-360`:**
  - `k60 >= 70 && k60 <= 130` (`0.35..0.65`) and `k55 >= 25 && k55 <= 75` (`0.125..0.375`) reject `0` and `200`, though `k55`'s upper edge (`75`) overlaps `k60`'s lower edge (`70`) (`k55 = 70, k60 = 71` would pass `k55 < k60`).
- **`scripts/conductEngine.test.js:230-254`:**
  - `fourWay` tests exact calculated cuts across `25`, `20`, `15`, `40/10`, `45/10` (`spike = false` only; `spike = true` is not tested at middle integrity).
- **`lib/citizenDials.test.js:92-95`:**
  - Asserts regexes over the 5 exact opener words chosen in `LEANS` (`somewhat|slightly|fairly|only loosely|casually`) rather than testing the three prompt template strings directly (which missed `"a only loosely ..."` in `provocationBank.js:65`).
