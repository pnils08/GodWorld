---
title: agy review — The Money Game Plan Task 5 (Heritage Doors)
created: 2026-10-21
updated: 2026-10-21
type: review
tags: [review, engine, economy, heritage]
sources:
  - docs/plans/2026-10-16-the-money-game.md
  - phase05-citizens/generationalWealthEngine.js
  - phase05-citizens/maneuverEngine.js
  - phase04-events/buildCityEvents.js
  - phase04-events/generationalEventsEngine.js
  - phase05-citizens/educationCareerEngine.js
  - phase05-citizens/processAdvancementIntake.js
  - phase07-evening-media/culturalLedger.js
  - lib/wakePerception.js
---

# agy review — The Money Game Plan Task 5 (Heritage Doors)

**Target:** `docs/plans/2026-10-16-the-money-game.md` §"Task 5 design — the heritage doors" (`:71-110`, `:149-150`, commit `e0322da9`)

**Verdict:** **HOLD**

---

## Live Source Verification (`Heritage_Ledger`, `Simulation_Ledger` C112 snapshot, `Cultural_Ledger`, `Household_Ledger`, `Business_Ledger`)

1. **Varek (`LIN-00005`, `POP-00789`) and Keane (`LIN-00003`, `POP-00001`/`POP-00002`) business counts and Varek's C113 tier are misread (`docs/plans/2026-10-16-the-money-game.md:79-80, 89, 105`; `phase05-citizens/generationalWealthEngine.js:2990-3003, 3048-3051, 3084-3100, 3234-3241`).**
   - The plan table (`:79-80`) reports `Biz = 1` for both Varek and Keane by reading `Heritage_Ledger.BusinessesOwned` (`["BIZ-00186"]` and `["BIZ-00185"]`), which stores only the heritage-minted `bizList` (`:3097`, `:3241`).
   - `heritageStanding_` (`:3100`) scores `bizCount = bizList.length + ownedBizCount (deduped)` (`:3094-3096`) via `parseKeyPersonnelOwners_` (`:1058-1089`, `:2995-3002`).
   - **Keane (`LIN-00003`):** owns **2** businesses on `Business_Ledger` (`BIZ-00103` Firehouse 29 West Oakland Baseball Academy + `BIZ-00185` Keane Mercantile), which is why `HeritageScore = 37.5` (`26.53` wealth on `$450,084,721` + `3` fame + `4 × 2` businesses = `37.53 → 37.5`). With `Biz = 1`, Keane's standing would be `33.5`.
   - **Varek (`LIN-00005`):** at C112 `:3100`, `bizCount` was **2** (`BIZ-00052` Civis Systems + `BIZ-00074` Oakland Oaks), giving `40.0 + 4 × 2 = 48.0`. Later in the same function (`:3234-3241`), Varek staked `$9,000,000` (lowering `Simulation_Ledger.NetWorth` from `10,008,607,369` to `9,999,607,369`) and opened `BIZ-00186` (Varek Systems). On live `Business_Ledger` entering C113, Varek owns **3** businesses (`BIZ-00052`, `BIZ-00074`, `BIZ-00186`), so his standing at C113 is `40.0 + 4 × 3 = 52.0` — **Prominent** (`>= 50`) under the existing `0 / 30 / 50 / 70` bands (`:2525-2530`), refuting `:89` ("Nobody is Prominent (50)") and `:105` ("Varek tops out Established (48)").

2. **Keane (`LIN-00003`) owns an active home on `Household_Ledger` despite `Heritage_Ledger.HomesOwned = 0` (`docs/plans/2026-10-16-the-money-game.md:80`; `phase05-citizens/generationalWealthEngine.js:2802, 2883, 2901-2905, 3047, 3079-3083`).**
   - On `Household_Ledger`, `HH-KEANE` (`Members: ["POP-00001","POP-00002"]`) is `HousingType = owned`, `Status = active`, so `ownedHomePops['POP-00001'] = true` (`:2905`) and `anyOwnedHome = true` (`:3047`).
   - `Heritage_Ledger.HomesOwned` is `0` (`:80`) only because `foundLine_` (`:2802`) seeds `newHl[hHomes] = 1` exclusively when `door === 'C'`, whereas Keane founded via Door `'B'` (`:2883`) and `:3079-3081` only adds incremental `S.homesPurchasedByLine` after founding.

3. **Verified counts (`docs/plans/2026-10-16-the-money-game.md:90-92`).**
   - Off-ledger `NetWorth >= $150M`: **8** active citizens (`POP-00125` Skenes `$245,000,000`, `POP-00124` Conrad `$240,000,743`, `POP-00003` Aitken `$225,109,646`, `POP-00031` Richards `$180,199,855`, `POP-00128` Bubic `$180,000,000`, `POP-01092` Achebe `$168,607,985`, `POP-00021` Davis `$160,142,064`, `POP-00127` Miller `$160,000,143`); **0 of 8** are in an active `owned` row on `Household_Ledger`.
   - Off-ledger `$50M–$150M`: **8** active citizens (`POP-01093` Salcedo `$132,626,692`, `POP-00024` Rivas `$100,119,017`, `POP-00126` Kerkering `$100,000,000`, `POP-00129` Rushing `$90,000,000`, `POP-01094` Zavala `$87,659,321`, `POP-01095` Voss-Adeyemi `$71,874,877`, `POP-01083` Bautista `$64,145,788`, `POP-01096` Raman `$54,148,686`); **0 of 8** are in an active `owned` row on `Household_Ledger`.
   - `Simulation_Ledger.UsageCount` (1,044 snapshot rows, 0 diffs vs live `Simulation_Ledger`): `>= 5` = **83**, `>= 10` = **36**, `>= 20` = **7** (`POP-00001` Keane `63`, `POP-00018` Dillon `62`, `POP-00527` Paulson `39`, `POP-00003` Aitken `30`, `POP-00019` Kelley `30`, `POP-00127` Miller `23`, `POP-00017` Raines `20`).
   - `Cultural_Ledger.FameScore`: **50** rows, all 50 carrying `POP-XXXXX` in `UniverseLinks`; `>= 50` = **13**, `>= 75` = **7** (`POP-00537` Marin Tao `153`, `POP-00632` Rico Valez `116`, `POP-00540` Jade Orion `104`, `POP-00539` Lena Cross `93`, `POP-00771` Sage Vienta `90`, `POP-00769` Dax Monroe `84`, `POP-00770` Kato Rivers `77`), `>= 100` = **3**. All 13 `FameScore >= 50` citizens hold `< $1M`.

---

## Hunt 1 (H1) — Recomputed Who-Is-In / Who-Is-Removed Table

The plan's table (`docs/plans/2026-10-16-the-money-game.md:96-103`) gets **6 citizens/lines wrong** across the **Fortune**, **Fame**, and **Roots** rows:

| Door (bracketed spec) | Plan claims (`:98-103`) | Recomputed live truth (C112) | Citizens / lines the plan gets wrong |
|---|---|---|---|
| **Fortune** (`1 member NW >= $150M`, **without** owned home) | Admits: 8 off-line (`Skenes`, `Conrad`, `Aitken`, `Richards`, `Bubic`, `Achebe`, `Davis`, `Miller`). Keeps: `Varek`, `Keane`, `Dillon`, `Kelley`. | Admits: **8** off-line. Keeps: **4** on-line (`Varek`, `Keane`, `Dillon`, `Kelley`). | Matches on the `without home` branch. |
| **Fortune** (`1 member NW >= $150M`, **with** owned home) | Admits: `nobody`. Keeps: `Varek, Keane, Dillon, Kelley` (`:98`); `5 kept, 8 in by Fortune (without the home) or 0 (with it)` (`:103`). | Admits: **0** via Fortune. Keeps via Fortune: **2** (`Kelley` `HH-0102-F002` owned; `Keane` `HH-KEANE` owned on `Household_Ledger`, or **1** if gated on `Heritage_Ledger.HomesOwned >= 1`). | **1. Elias Varek (`LIN-00005`, `POP-00789`, `$10.0B`)** rents `HH-0106-F026` (`HousingType = rented`, `HomesOwned = 0`), has `UsageCount = 0`, no `Cultural_Ledger` row, `1` member / `1` gen, and `CIV = no`. Under Fortune-with-home + per-Cycle re-read (`:104`), **Varek clears zero doors and goes dormant after 4 Cycles**.<br>**2. Benji Dillon (`LIN-00002`, `POP-00018`, `$396.5M`)** rents `HH-0084-004` (`HousingType = rented`, `HomesOwned = 0`); Dillon fails Fortune-with-home and survives on-line **only via Fame** (`UsageCount = 62`). |
| **Fame** (`FameScore >= 75 OR UsageCount >= 20`, AND combined `NW >= $5M`) | Admits: `nobody today at $5M` (`:99`). Keeps: `Paulson (usage 39, $76M); Keane/Dillon/Kelley also clear`. | Admits at `$5M`: **2 off-line** (`POP-00003` **Mark Aitken**, `POP-00127` **Mason Miller**). Keeps: **4 on-line** (`Paulson`, `Keane`, `Dillon`, `Kelley`). | **3. Mark Aitken (`POP-00003`)**: off-line, `UsageCount = 30 >= 20`, `NetWorth = $225,109,646 >= $5M` — **admitted at `$5M`** (even when Fortune requires an owned home, Fame does not, so `:103` "or 0 (with it)" is wrong: 2 enter via Fame).<br>**4. Mason Miller (`POP-00127`)**: off-line, `UsageCount = 23 >= 20`, `NetWorth = $160,000,143 >= $5M` — **admitted at `$5M`**. |
| **Fame at `[$0.5M]`** (`FameScore >= 75 OR UsageCount >= 20`, AND combined `NW >= $500,000`) | Admits at `$0.5M`: `Dax Monroe, Tara Ellison` (`:99`). | Admits at `$0.5M`: **3 off-line** (`POP-00003` **Mark Aitken**, `POP-00127` **Mason Miller**, `POP-00017` **Anthony Raines**). **Neither Dax Monroe nor Tara Ellison qualifies.** | **5. Dax Monroe (`POP-00769`)**: `FameScore = 84 >= 75`, `UsageCount = 1`, but `NetWorth = $487,176` (`$12,824` under `$500,000`, no spouse/family) — **does not clear `$0.5M`**.<br>**6. Tara Ellison (`POP-00546`)**: `NetWorth = $672,064 >= $0.5M`, `UsageCount = 2`, but `FameScore = 68 < 75` — **does not clear `FameScore >= 75`**.<br>**7. Anthony Raines (`POP-00017`)**: off-line, `UsageCount = 20 >= 20`, `NetWorth = $523,647 >= $0.5M` (`HH-0104-F002` owned) — **missed by the plan; admitted at `$0.5M`**. |
| **Roots** (`3 living members`, `2 gens`, combined `NW >= $25M`, `1 owned home`) | Admits: `nobody today`. Keeps: `Dillon already in on Fortune` (`:100`). | Admits: **0** off-line. Keeps: **0** on-line. | **8. Dillon (`LIN-00002`)** has 3 members across 2 generations (`POP-00018`, `POP-00742`, `POP-00743`) and `$396,503,671` NW, but **0 owned homes** (`HH-0084-004` is `rented`, `HomesOwned = 0`). Dillon does **not** clear Roots. |
| **Civic** (`1 living member CIV=yes`, combined `NW >= $25M`) | `not read yet (53 CIV citizens)` (`:101`). | Admits: **0** off-line. Keeps: **0** on-line. | Top `CIV=yes` citizens by combined family NW: `POP-00504` Warren Ashford `$12,001,310` (`Home = false`), `POP-00034` Avery Santana `$6,500,927` (`Home = false`), `POP-00514` Vincent Ramirez `$3,026,823` (`$4,231,566` with spouse, `Home = true`). None of the 9 on-line families has a `CIV=yes` member. |

**Net disposition of the 9 live lines (`:103`):**
- **Removed (4 or 5 of 9):** `Horn` (`LIN-00007`, `$90.1M`, `UsageCount = 16`, `FameScore = 8`), `Reaves` (`LIN-00008`, `$50.4M`, `UsageCount = 10`, not on `Cultural_Ledger`), `Corliss` (`LIN-00001`, `$2.49M`, max `UsageCount = 8`), `Villanueva` (`LIN-00009`, `$1.21M`, `UsageCount = 0`) — plus **`Varek` (`LIN-00005`, `$10.0B`)** if Fortune requires an owned home.
- **Admitted off-line:** **8** (`Skenes`, `Conrad`, `Aitken`, `Richards`, `Bubic`, `Achebe`, `Davis`, `Miller`) if Fortune has no home requirement; **2** (`Aitken`, `Miller` via Fame at `$5M`) or **3** (`Aitken`, `Miller`, `Raines` via Fame at `$0.5M`) if Fortune requires an owned home.

---

## Hunt 2 (H2) — `lowC` Trigger Fix Shape (`:3128`) vs Revival, Tenure, and `Status = dormant` Readers

The plan (`docs/plans/2026-10-16-the-money-game.md:104`) specifies:
> *"the `lowC` trigger at `:3122` becomes 'clears no door this Cycle' for **every** line (drop the PeakTier guard), with `HERITAGE_LOW_CYCLES` re-bracketed from 52 to **[4]** as the grace; the dormant row, the readers' skip, the household fallback and the revival path (`:3112-3119`, the line's own members clear a door again) are untouched."*

Tracing `phase05-citizens/generationalWealthEngine.js:3099-3322` and grepping all readers of `Heritage_Ledger` across `phase*/`, `scripts/`, and `lib/` exposes **5 defects**:

1. **Leaving the revival check (`generationalWealthEngine.js:3117-3120`) "untouched" creates an infinite 5-Cycle dormant/revive oscillation for all 4 removed lines.**
   - Lines `3117-3120` hardcode the old doors:
     ```js
     var revive = livingN > 0 && (
       maxLivingNW >= HERITAGE_DOOR_B_NETWORTH ||
       (livingN >= HERITAGE_DOOR_A_MEMBERS && totalNW >= HERITAGE_DOOR_A_NETWORTH) ||
       (anyOwnedHome && totalNW >= HERITAGE_DOOR_C_SOLO_NETWORTH));
     ```
   - If `lowC` (`:3128`) is changed to "clears no new door this Cycle" with `HERITAGE_LOW_CYCLES = 4` while `:3117-3120` is untouched, `Corliss` (`4` members, `$2.49M`), `Villanueva` (`4` members, `$1.21M`), `Horn` (owned home, `$90.1M`), and `Reaves` (owned home, `$50.4M`) go dormant on Cycle `t + 4`, then **immediately satisfy `revive` on Cycle `t + 5`** via old Door A (`:3119`) or old Door C (`:3120`), resetting `lowC = 0` and `tenure = 0` (`:3123`) and oscillating every 5 Cycles forever.
   - Fix: extract one shared `lineClearsAnyDoor_(...)` predicate (reading `Cultural_Ledger` via `culturalStatusByPop_(ctx)` at `phase07-evening-media/culturalLedger.js:98-130`, `UsageCount`, `maxLivingNW`, `totalNW`, `livingN`, `generations`, `anyOwnedHome`, `civ`) and call it identically for both `revive` (`:3117`) and `lowC` (`:3128`).

2. **`maneuverEngine.js` and `lib/wakePerception.js` do NOT treat a dormant line member as "no line / fall back to a household" (`docs/plans/2026-10-16-the-money-game.md:104, 150`; `phase05-citizens/maneuverEngine.js:99-103, 201-222, 266, 294, 344-352`; `phase05-citizens/generationalWealthEngine.js:2110`; `lib/wakePerception.js:606-638`).**
   - Contrary to `:150` (*"every reader (... maneuver engine) treats a dormant member as no line ... they fall back to a household"*), `maneuverGoal_` (`maneuverEngine.js:99-103`) checks `if (lineageId) return String(lineStatus || 'active').toLowerCase() === 'dormant' ? 'revive' : 'tenure';` **before** `!householdId → 'establish'` and `owned ? 'wealth' : 'home'`.
   - Consequence 1 (mechanics): When `Corliss` or `Villanueva` (both renting households) or an unhoused member goes dormant, their `goal` becomes `'revive'`, not `'home'` or `'establish'`. In `trackHomeOwnership_` (`generationalWealthEngine.js:2110`), `maneuverFactor_(ctx, headPop, 'home')` checks `if (goalFilter && e.goal !== goalFilter) return 1;` (`maneuverEngine.js:347`), **zeroing out their `1.5×` climb multiplier on the home-purchase roll** — even when buying a home is the gate needed to revive! The same happens for `maneuverFactor_(ctx, pop, 'establish')` in `phase05-citizens/householdFormationEngine.js:434`.
   - Consequence 2 (narrative/voice): On dormancy, `prevGoal !== goal` (`'tenure' !== 'revive'`, `maneuverEngine.js:294`) writes `[Maneuver-Climb] playing to climb — the name to bring back` (`:155, 162, 314`) to `LifeHistory`, and `lib/wakePerception.js:613-614, 636-638` injects *"Your family, the Corliss line, is on the city's ledger ... — but the name has gone quiet; nobody is carrying it right now ... What you're playing for, when the moment comes: the name to bring back"* into every wake for a family that was removed for never belonging on the ledger.

3. **Pre-existing bug in `updateHeritage_` revival hook (`phase05-citizens/generationalWealthEngine.js:3123` vs `:3317, 3321`).**
   - At `:3123`, revival clears `hl[hDorm] = '';` immediately, **before** `:3317` builds the `HERITAGE_REVIVED` hook description (`'dormant since C' + String(hl[hDorm] || '?')`), and then `:3321` clears `hl[hDorm] = '';` a second time. Every revival hook therefore prints `dormant since C?`. Removing `hl[hDorm] = '';` from `:3123` (keeping `:3321`) fixes it.

4. **`HERITAGE_DORMANT` LifeHistory line and story hook hardcode `HERITAGE_LOW_STANDING` (`10`) and `"the money that made it is gone"` (`phase05-citizens/generationalWealthEngine.js:3291, 3297`).**
   - At `:3291`, `dormantWhy === 'low'` writes `[Heritage] the <Family> line went dormant — the money that made it is gone`.
   - At `:3297`, the `HERITAGE_DORMANT` hook writes `'standing under ' + HERITAGE_LOW_STANDING + ' for ' + HERITAGE_LOW_CYCLES + ' cycles'`.
   - Under the re-read trigger ("clears no door this Cycle"), `Horn` (standing `24.5`, `$90.1M`), `Reaves` (standing `22.0`, `$50.4M`), and a `Fame` line whose `FameScore` decayed below `75` have neither standing `< 10` nor lost money.

5. **Tenure and business roll during the 4-Cycle grace window (`phase05-citizens/generationalWealthEngine.js:3128-3138, 3172`).**
   - While `0 < lowC < 4`, execution takes the `else` branch (`:3133-3138`): `tenure` and `tierTen` continue incrementing, `newTier` stays populated, and `HERITAGE_BIZ_ROLL[newTier]` (`:3172`) continues rolling storefronts for any line with `standing >= 30` (e.g., if `Varek` at `52.0` or `Dillon` at `36.0` is failing Fortune-with-home, they still roll for heritage businesses during Cycles 1–3 of their grace period).
   - All other `Heritage_Ledger` readers properly skip dormant rows:
     - `heritageTierByPop_` (`generationalWealthEngine.js:2624-2625`) skips blank `HeritageTier` and `Status === 'dormant'`, covering `applyOwnerDraw_` (`:1142`), `processInheritance_` (`:1362`), `generationalEventsEngine.js:274, 1107` (birth boost), `generateCitizensEvents.js:3238`, `educationCareerEngine.js:1183` (settlement), and `processAdvancementIntake.js:2048` (family lottery).
     - `ctx.summary.heritage.lineByPop` (`generationalWealthEngine.js:3160`) is guarded by `if (status === 'active')`, covering `educationCareerEngine.js:697` (`SchoolQuality +1`).
     - `phase04-events/buildCityEvents.js:533-534` does not read `Status`, but skips rows where `HeritageTier` is blank (`if (!herName || !herT) continue;`), which holds while dormant because `:3130` sets `newTier = ''`.

---

## Hunt 3 (H3) — Engine Readers Keyed on Door `A` / `B` / `C` (`FoundedDoor`, Heritage Births, `engine.306` Owner Door)

Grepping `FoundedDoor`, `hDoor`, `HERITAGE_DOOR_*`, and `door ===` across `phase*/`, `lib/`, `utilities/`, `scripts/`, and `schemas/`:

1. **`foundLine_` home-seeding gate (`phase05-citizens/generationalWealthEngine.js:2802`) — breaks on rename:**
   - `:2802`: `if (door === 'C' && hHomes >= 0) newHl[hHomes] = 1;`
   - Renaming doors to `'Fortune'` / `'Fame'` / `'Roots'` / `'Civic'` orphans `door === 'C'`, so lines founded with an existing owned home under `'Roots'`, `'Fortune'`, `'Fame'`, or `'Civic'` start with `HomesOwned = 0` on `Heritage_Ledger` (losing `+2` standing and omitting `"a home"` in `lib/wakePerception.js:623-625`).
   - Fix: replace `if (door === 'C' && hHomes >= 0) newHl[hHomes] = 1;` with a check on whether any founding `memberRows` entry is in `ownedHomePops` (which also requires moving the `ownedHomePops` scan at `:2886-2906` above `foundLine_` so all doors see it).

2. **`foundLine_` LifeHistory and `HERITAGE_FOUNDED` story hook branches (`phase05-citizens/generationalWealthEngine.js:2805-2809, 2823-2826`):**
   - Both ternaries test `door === 'B'` and `door === 'C'` and fall through to the Door A copy (`'[Heritage] the ' + famName + ' line is founded — the family earned the ledger'` and `memberRows.length + ' on-camera members and a seven-figure balance'`). New door tokens (`'Fortune'`, `'Fame'`, `'Roots'`, `'Civic'`) will all emit the Door A `seven-figure balance` hook description unless given branches.

3. **`HERITAGE_DOOR_*` constants (`phase05-citizens/generationalWealthEngine.js:2541-2551, 2854-2857, 2880, 2925, 3118-3120`):**
   - Consumed only inside `generationalWealthEngine.js` (at the founding loops `:2854-2925` and the revival check `:3118-3120`).
   - Referenced in prose by `engine.309` (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:251`: `Door C (HERITAGE_DOOR_C_SOLO_NETWORTH $50M + an owned home)`).

4. **`Heritage_Ledger.FoundedDoor` column (`phase05-citizens/generationalWealthEngine.js:2568, 2729, 2798`; `schemas/SCHEMA_HEADERS.md:865`):**
   - Written once at founding (`newHl[hDoor] = door` at `:2798`) and logged in `:3418`. No runtime reader in `phase*/`, `lib/`, or `scripts/` branches on the stored `FoundedDoor` cell value of existing rows (`LIN-00001..00009`).
   - **Heritage citizen births** (`phase04-events/generationalEventsEngine.js:274, 1107`, `HERITAGE_BIRTH_MULT` at `generationalWealthEngine.js:2563-2565`) and **heritage business births** (`generationalWealthEngine.js:3172`, `phase05-citizens/applyBusinessDynamics.js:150-205`) key strictly on `HeritageTier`, never `FoundedDoor`.
   - **The `engine.306` / `engine.96` owner door** (`phase05-citizens/processAdvancementIntake.js:2179-2425`) does not read `Heritage_Ledger` or `FoundedDoor`.
   - **Tests that hardcode `'A'` / `'B'` / `'C'`:** `scripts/householdReconcile.test.js:455, 472, 483, 491` asserts `r[4] === 'C'`, `r[4] === 'B'`, and source substring order `foundLine_([bRow], bName, 'B')` before `foundLine_(unitC, famC, 'C')`.

---

## Hunt 4 (H4) — Weakest Assumption in the Design

The design's weakest assumption is that **a single Fame door (`Cultural_Ledger.FameScore >= [75] OR UsageCount >= [20]` with `NetWorth >= [$5M]`, `:91, :99`) paired with the unmodified `heritageStanding_` formula (`generationalWealthEngine.js:2581-2592, 3045`) produces a dynamic "rise and fall with the decay" loop (`:91, :104`)**: in reality, its two halves are mutually contradictory and disconnected from the standing ladder. On the `Cultural_Ledger` half, all 13 citizens with `FameScore >= 50` hold `$489–$672,064` (among `FameScore >= 75`, max is `POP-00769` Dax Monroe at `$487,176`) and none owns a business, so at `[$5M]` the `FameScore >= 75` branch admits **0 citizens today and 0 by savings drift** (at ~$15k/yr banked savings via `processMoneyLoop_`, crossing `$5M` takes ~300 sim years / 15,000+ Cycles); yet if the money floor is lowered to `[$0.5M]` so cultural figures can enter, `heritageStanding_` (`:2583, 2587, 3045`) awards `0` wealth points below `$1M` (`10 * Math.log10(nw / 1e6)`) and ignores `Cultural_Ledger.FameScore` entirely (counting only `Simulation_Ledger.UsageCount >= 5` at `:3045`, which 12 of the 13 `FameScore >= 50` citizens fail with `UsageCount` `0–2`), stranding any cultural entrant at a `HeritageScore` of **`0.0`** (bottom of `Founding`, 25–30 points below `Established`). Conversely, on the `UsageCount >= [20]` half, `Simulation_Ledger.UsageCount` is a lifetime cumulative counter that **never decays**, so every citizen who enters or stays via `UsageCount >= 20` (`Paulson` `39`, `Aitken` `30`, `Miller` `23`, `Raines` `20`) is permanently immune to fame decay and can never fall off the ledger unless they lose their money.
