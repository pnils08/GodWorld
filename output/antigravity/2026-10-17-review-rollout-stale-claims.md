# Adversarial Claim Check — ROLLOUT Stale Claims (`engine.5`, `engine.257`, `engine.256`, `engine.197`, `engine.104`)

Review date: 2026-10-17  
Reviewer: `antigravity`  
Scope: Read-only verification of claims C1–C5 in `output/antigravity/2026-10-17-rollout-stale-claims-TASK.md` against `phase*/`, `utilities/`, `lib/`, `data/`, `output/simulation_ledger_snapshot.jsonl`, and `output/engine201/cohort-c110.json` / `cohort-c111.json`.

---

## C1 — `engine.5` ("life events still need causal household effects (Phase 2b)")

**Verdict:** `PARTIAL`

### `file:line` Evidence
- **Weddings (causal & active):**
  - `phase05-citizens/bondEngine.js:2109–2190` (`processRomanceAndMarriage_`, called from `runBondEngine_` at `bondEngine.js:116`) triggers `marryCitizens_` (`bondEngine.js:2192–2335`) when an active romantic bond reaches `MARRIAGE_THRESHOLD` (`8`, `bondEngine.js:1822`).
  - `marryCitizens_` writes `MaritalStatus = 'married'` (`bondEngine.js:2199–2200`) and `SpouseId` (`bondEngine.js:2203–2204`) on both `Simulation_Ledger` rows, merges or creates their `Household_Ledger` row and sets `HouseholdId` on both citizens (`bondEngine.js:2213–2290`), and queues `Family_Relationships` rows (`bondEngine.js:2299–2305`).
  - Two additional GC wedding paths in `phase05-citizens/bondEngine.js` also call `marryCitizens_`: `processGCCourtship_` (`bondEngine.js:2349–2435`, line `2433`) and `processGCMarriageLottery_` (`bondEngine.js:2499–2630`, line `2627`).
- **Retired dice wedding:**
  - `checkWedding_` (`phase04-events/generationalEventsEngine.js:1014–1061`) has zero callers in the repository; `runGenerationalEngine_` explicitly notes at `phase04-events/generationalEventsEngine.js:550–554` that weddings were retired from the generational roll in `engine.55` (`S319`) in favor of `bondEngine.js`.
- **Births (causal & active):**
  - `runGenerationalEngine_` (`phase04-events/generationalEventsEngine.js:556–603`) calls `checkBirth_` (`L1063–1128`) and `createChildRow_` (`L1135–1254`), increments `NumChildren` on the birthing parent (`L565`, `L591`) and on the linked spouse (`L1203`), appends a full minor row (`RoleType = 'student'`, `CareerStage = 'child'`, `ParentIds`, `HouseholdId`) to `ctx.ledger.rows` (`L1155–1200`), updates `ChildrenIds` on both parents (`L1207–1213`), appends the child POPID to `Household_Ledger.Members` (`L1224`), or forms a single-parent household via `formSingleParentHousehold_` (`L580`, `L1256–1288`).
- **Contradiction 1 — `householdFormationEngine.js` TODO stubs ARE on the live call path (and divorce is still unimplemented):**
  - `processHouseholdFormation_` (`phase05-citizens/householdFormationEngine.js:143`, invoked every cycle by `phase01-config/godWorldEngine2.js:669` and `:2386`) directly calls `generateBirths_(ctx, cycle)` at `householdFormationEngine.js:213`, `processMarriages_(ctx, cycle)` at `:217`, and `processDivorces_(ctx, cycle)` at `:221`.
  - Those three functions (`phase05-citizens/householdFormationEngine.js:943–972`) are live-called no-op stubs returning `[]`, and while births and marriages were implemented in `generationalEventsEngine.js` and `bondEngine.js`, **divorce has no causal engine implementation anywhere** (`processDivorces_` at `householdFormationEngine.js:963–972` remains a `TODO` stub).
- **Contradiction 2 — Promotions do NOT change `CareerStage`:**
  - In `phase05-citizens/runCareerEngine.js:429–439` (`careerApplyPromotion_`, called by `applyPromotionDie_` at `L555, 572` and `applyEmployerSuccess_` at `L645`), a promotion raises `Income` by `+6–12%` (`L430`), stamps `LastPromotionCycle` (`L431`), and writes `[Promotion]` (`L433`), but never touches `CareerStage` (confirmed by the header contract at `runCareerEngine.js:39`).
  - `CareerStage` is owned by `updateCareerProgression_` (`phase05-citizens/educationCareerEngine.js:518–558`), which calls `deriveCareerStageFromAge_` (`educationCareerEngine.js:438–460`) to set `CareerStage` purely from age (`<22` student, `<30` entry-level, `<50` mid-career, `<65` senior, `>=65` retired) and `YearsInCareer`.

### What the claim gets wrong or leaves out
The claim is right that weddings and births are now causal on the ledger, but wrong that the `householdFormationEngine.js:943–972` stubs are off the live path (`processHouseholdFormation_` calls all three at lines `213–221`, and divorce is still an unimplemented stub) and wrong that promotions change `CareerStage` (`careerApplyPromotion_` only raises `Income`, while `deriveCareerStageFromAge_` sets `CareerStage` strictly by age).

---

## C2 — `engine.257` ("Household stress from real outflows: build spending (makes vs spends)")

**Verdict:** `CONFIRMED`

### `file:line` Evidence
- **Existing money outflows and downward adjustments in `phase05-citizens/generationalWealthEngine.js`:**
  - **Debt drag on weekly savings:** `processMoneyLoop_` (`generationalWealthEngine.js:436–439`) subtracts `debtDrag_(weekSaving, debt, cfg.debtDragPerLevel, cfg.debtDragCapShare)` (`L302–306`) from `weekSaving` before adding to `NetWorth` (note: because `debtDrag_` is capped at `debtDragCapShare * weekSaving` at `L305`, `accrual` is floored at `>= 0`—it reduces positive saving rather than turning weekly cashflow negative).
  - **Debt payoff debit:** `processMoneyLoop_` (`generationalWealthEngine.js:455–461`) deducts `Math.round(DEBT_PAYOFF_COST * debt * dragF * creditF)` (`$2,500 * debt * ...`, `L281`) from `nwNew` when a citizen rolls a debt-level reduction.
  - **Shock expenses:** `processMoneyLoop_` (`generationalWealthEngine.js:472–484`) rolls `SHOCK_EXPENSE_P` (`0.004`, `L283`) for `$1,500–$8,000` (`L284–285`); if `nwNew >= shockCost` it subtracts `shockCost` from `NetWorth` (`L477`), otherwise it zeroes `NetWorth` and increments `DebtLevel` (`L480–481`).
  - **Debt defaults (`engine.276`):** `processMoneyLoop_` (`generationalWealthEngine.js:508–525`) zeroes `NetWorth` (`nwNew = 0`, `row[iNW] = 0` at `L512–513`), resets `DebtLevel` to `DEBT_DEFAULT_RESET` (`2`, `L287`), and stamps `DialState.debtDefault` (`L515–518`).
  - **Job loss adding debt & cutting income:** `careerRecordLayoff_` (`phase05-citizens/runCareerEngine.js:238–240`) records `S.jobLosses[pop] = cycle` alongside a `12–20%` income cut (`runCareerEngine.js:355, 444`), and `processMoneyLoop_` (`generationalWealthEngine.js:467–468`) increments `DebtLevel` by `+1`.
  - **Property tax (`engine.271`):** `collectPropertyTax_` (`generationalWealthEngine.js:1833–1923`) debits `Math.round(value * rate / 52)` from owner-household members' `NetWorth` (`L1904–1908`), or zeroes `NetWorth` and increments `DebtLevel` when savings cannot cover the tax (`L1910–1915`).
  - **Home purchase down payment (`engine.60`):** `trackHomeOwnership_` (`generationalWealthEngine.js:2131–2139`) deducts `down = Math.round(price * HOME_DOWN)` (`20%`) from buyer household members' `NetWorth`.
  - **Forced home sale (`engine.286`):** `homeDieOwned_` (`generationalWealthEngine.js:2203–2287`) forces stretched/defaulted owners to sell via `updateHouseholdLedgerMove_` (`L2247`) and `sellHouseholdHome_` (`L2259`, `L2321–2396`), losing ownership status (though `sellHouseholdHome_` credits any remaining equity `proceeds` *back* to member `NetWorth` at `L2347–2352`; equity is lost only when market drop wipes out the down payment at `L2302–2304`).
  - **Casino losses:** `processCasinoLedger_` (`phase05-citizens/casinoLedgerEngine.js:353–356`, called at `generationalWealthEngine.js:169`) subtracts weekly gambling losses from `NetWorth`.
- **What `engine.257`'s actual open item still is (`docs/plans/2026-09-22-initiative-budget-disbursement.md`):**
  - Per `docs/plans/2026-09-22-initiative-budget-disbursement.md:96–121`, `:204–206`, and Builder Call 8 (`:226–229`), `detectHouseholdStress_` (`phase05-citizens/householdFormationEngine.js:1337–1396`, specifically `L1369`) skips any rent-burdened household whose `HouseholdSavings >= MonthlyRent * 12`, where `HouseholdSavings` is the sum of members' full `NetWorth` (`updateHouseholdIncomes_` at `householdFormationEngine.js:1019`, median `$369k` across 363 of 392 renters), leaving only 5–7 renter households flagged citywide and starving housing initiatives (`INIT-001`).
  - Crucially, `processMoneyLoop_` (`generationalWealthEngine.js:436`) accrues `(income / 52) * savingsRate` directly into `NetWorth` without ever deducting `Household_Ledger.MonthlyRent` (rent or mortgage) or ordinary living expenses (`generationalWealthEngine.js:2291` explicitly comments: *"the sim keeps no home value, no loan balance, and never deducts a payment"*), so the open work in `engine.257` is modeling recurring household spending (`makes vs spends`) where rent and living costs actually debit income/savings.

### What the claim gets wrong or leaves out
The claim is right that episodic losses, taxes, and down payments already reduce `NetWorth`, leaving only two nuances out: `debtDrag_` (`generationalWealthEngine.js:305`) is capped at `debtDragCapShare * weekSaving` so it never causes a net weekly loss, and `sellHouseholdHome_` (`L2350`) adds remaining equity back to `NetWorth`, while the open `engine.257` item is specifically recurring household living/rent expenditure (`makes vs spends`) so `HouseholdSavings` is not an unspent `NetWorth` accumulator that masks rent stress at `householdFormationEngine.js:1369`.

---

## C3 — `engine.256` ("Leases on one hood-median stamp")

**Verdict:** `PARTIAL`

### `file:line` Evidence
- **Every formation writer of `MonthlyRent` stamps the flat neighborhood median (`estimateRent_`):**
  - `estimateRent_(neighborhood, ctx)` (`phase05-citizens/householdFormationEngine.js:1169–1187`) returns `ctx.summary.neighborhoodState[neighborhood].medianRent` (`L1178–1180`, or static `NEIGHBORHOOD_MEDIANS[neighborhood].rent` at `L1184`, or `2100` at `L1185`) with zero household variance or income scaling.
  - All 6 household-creation paths call `estimateRent_`:
    1. `reconcileHouseholds_` family formation (`phase05-citizens/householdFormationEngine.js:413`)
    2. `reconcileHouseholds_` single-adult formation (`phase05-citizens/householdFormationEngine.js:446`)
    3. `formCriteriaHouseholds_` (`phase05-citizens/householdFormationEngine.js:815`)
    4. `marryCitizens_` new household creation (`phase05-citizens/bondEngine.js:2278`)
    5. `formSingleParentHousehold_` (`phase04-events/generationalEventsEngine.js:1276`)
    6. `formIntakeHouseholds_` (`phase05-citizens/processAdvancementIntake.js:2409`)
- **Post-formation writers of `MonthlyRent` — three paths exist beyond home purchase:**
  1. **Home purchase (`trackHomeOwnership_`):** `phase05-citizens/generationalWealthEngine.js:2052, 2116` rewrites `MonthlyRent` on `Household_Ledger` to `mortgage = Math.round(price * HOME_MORTGAGE_MONTHLY)` when a renter household flips to `'owned'`.
  2. **Renter relocation (`processRelocations_` → `updateHouseholdLedgerMove_`):** `phase05-citizens/migrationTrackingEngine.js:836` calls `updateHouseholdLedgerMove_(ctx, unit.key, bestName, hoods[bestName].rent)`, which rewrites `row[iRent] = destRent` (`migrationTrackingEngine.js:930`) to the destination neighborhood's `medianRent` (`hoods[bestName].rent`, loaded from `S.neighborhoodState` at `migrationTrackingEngine.js:633`).
  3. **Owner relocation (`executeOwnerMove_` → `updateHouseholdLedgerMove_`):** `phase05-citizens/migrationTrackingEngine.js:785–792, 835` calls `executeOwnerMove_` (`phase05-citizens/generationalWealthEngine.js:2450–2488`), which rewrites `MonthlyRent` (`migrationTrackingEngine.js:930`) either to the new `plan.mortgage` (`mode === 'trade-up'`) or to the destination neighborhood's flat `plan.destRent` (`mode === 'rent'`, flipping `HousingType` back to `'rented'`).
  4. **Forced home sale (`homeDieOwned_` → `updateHouseholdLedgerMove_`):** `phase05-citizens/generationalWealthEngine.js:2247` calls `updateHouseholdLedgerMove_(ctx, hhId, hood, Math.round(destRent), { housingType: 'rented', monthly: Math.round(destRent), housingCost: 0 })`, rewriting `MonthlyRent` (`migrationTrackingEngine.js:930`) from the mortgage back to the neighborhood's current `medianRent` (`homeMarketRent_`).

### What the claim gets wrong or leaves out
The claim is right that every formation path sets `MonthlyRent` to the flat neighborhood `medianRent` via `estimateRent_`, but wrong that `MonthlyRent` is never rewritten after formation except on a home purchase: `updateHouseholdLedgerMove_` (`phase05-citizens/migrationTrackingEngine.js:930`) also rewrites `MonthlyRent` on renter relocations (`migrationTrackingEngine.js:836`), owner sell-and-rent relocations (`generationalWealthEngine.js:2485`), and forced home sales (`generationalWealthEngine.js:2247`), though all renter rewrites still stamp the destination neighborhood's flat `medianRent` and staying renters never re-price.

---

## C4 — `engine.197` ("the ~60% all-neutral share via event-engine reach")

**Verdict:** `PARTIAL`

### `file:line` Evidence
- **Snapshot & cohort recomputation (`output/simulation_ledger_snapshot.jsonl`, `output/engine201/cohort-c110.json`, `cohort-c111.json`):**
  - **Dialed citizens:** `1,032` of `1,032` rows carry a valid `DialState` JSON with `base`, `mood`, and `streak`.
  - **Nonzero mood at C111:** `961` of `1,032` (`93.1%`) have `mood != 0` on at least one of the 8 core dials (`drive`, `sociability`, `warmth`, `openness`, `composure`, `integrity`, `family`, `outabout`); `963` of `1,032` (`93.3%`) when including the 9th dial `fandom` (`DIALS` in `utilities/citizenMemory.js:34`).
  - **All-neutral `base` (`40–60`):** `656` of `1,032` (`63.6%`) have all 8 core `base` dials in `[40, 60]` (also `656` for `[40, 60)` where `bandIndex_ === 2` at `citizenMemory.js:56–62`); across all 9 dials in `DIALS` (including `fandom`), `602` of `1,032` (`58.3%`) are in `[40, 60]`.
  - **Median per-citizen largest `|mood|`:** `2.778` (`≈ 2.8`) across both 8 and 9 dials.
  - **Cohort C110→C111 (`48` citizens):** `9` of `48` (`POP-00007`, `POP-00003`, `POP-01057`, `POP-00033`, `POP-00057`, `POP-01056`, `POP-00002`, `POP-00013`, `POP-00164`) had any `base` move; the max single-dial move was `1.3258` (`≈ 1.33`) on `POP-00003` `warmth` (`50.896 → 52.222`).
- **Dial conversion mechanism & event effect sizes (`utilities/citizenMemory.js`, `utilities/citizenDialMap.js`):**
  - `settleCycle_` (`utilities/citizenMemory.js:221–231`, called every cycle before new events fold at `utilities/compressLifeHistory.js:612`) multiplies every `mood[d]` by `MOOD_DECAY = 0.8` (`citizenMemory.js:46`) and snaps `|mood[d]| < MOOD_SNAP` (`0.5`, `citizenMemory.js:47`) to `0`.
  - `applyCycleEffects_` (`utilities/citizenMemory.js:143–179`, called by `foldNewEntries_` at `utilities/compressLifeHistory.js:1644`) only increments `streak[d]` when `sameSign && Math.abs(priorMood) >= MOOD_SNAP` (`citizenMemory.js:161–162`); otherwise `streak[d]` resets to `±1`. Only when `|streak[d]| >= HARDEN_STREAK` (`3`, `L44, 164`) does `HARDEN_FRACTION` (`0.4`, `L45, 169`) of `mood[d] * room` bake into `base[d]`.
  - In `utilities/citizenDialMap.js:41–48, 348–359`, `ROUTINE_DAMPING = 0.45` scales 19 routine tags (`Daily`, `Background`, `Weather`, `PrevEvening`, `Holiday`, `FirstFriday`, `CreationDay`, and their `Household-*`/`Career-*`/`Education-*`/`PostCareer-*` variants), whose raw `TAG_DELTAS` (`citizenDialMap.js:51–145`) are `0.5–1.5`. Any single cycle effect `< 0.625` (including a `1.0` routine delta damped to `0.45`) decays to `< 0.5` (`0.45 * 0.8 = 0.36 < MOOD_SNAP`) in `settleCycle_` on the very next cycle, snapping `priorMood` to `0` and making a 3-cycle streak mathematically impossible without multiple same-cycle events.
- **Other writers that move `base` outside `applyCycleEffects_` streak hardening:**
  1. **Reflection accretion:** `accreteReflectionsIntoBase_` (`utilities/citizenMemory.js:190–217`, called at `utilities/compressLifeHistory.js:665`) writes `delta * REFLECTION_MULT (0.45) * REFLECTION_ACCRETION_FRAC (0.5) * room` directly into `c.base[d]`.
  2. **Integrity wear and regain (`engine.272`):** `applyIntegrityWear_` (`utilities/citizenMemory.js:430–447`, called at `utilities/compressLifeHistory.js:616`) directly steps `c.base.integrity` down or up by `wearRate` (in fact, `POP-00002`'s `+1.0` `base.integrity` move from `49 → 50` in `cohort-c110.json` → `cohort-c111.json` came from `applyIntegrityWear_` regain, as `POP-00002`'s `wear.d` dropped from `1 → 0` with `streak.integrity = 0`).
  3. **Chaos trauma break (`engine.42`):** `applyChaosReaction_` (`utilities/citizenMemory.js:244–278`, called at `utilities/citizenDialMap.js:345`) directly subtracts `TRAUMA_BASE_DROP = 5` (`citizenMemory.js:239`) from `c.base.composure` and `c.base.outabout` (`L268–269`) when `chaosExposure.count >= 3`.
  4. **Fandom & challenger seeding (`engine.208`, `engine.94`):** `compressLifeHistory_` (`utilities/compressLifeHistory.js:585–600`) writes `c.base.fandom = inherited.v` (up to `65`) on first fold, and `mintChallengerOnLedger_` (`phase05-citizens/updateCivicApprovalRatings.js:1498–1506, 1619`) seeds non-50 `base` dials on new civic candidates.

### What the claim gets wrong or leaves out
All snapshot and cohort numbers in the claim are exact for the 8 core dials (`DIALS` actually has 9 dials including `fandom`, which puts 9-dial neutral share at `602/1,032 = 58.3%`), but `base` is not moved *only* by 3-cycle streak hardening: `accreteReflectionsIntoBase_` (`citizenMemory.js:211`), `applyIntegrityWear_` (`citizenMemory.js:437, 442`—which caused `POP-00002`'s `integrity` move in the C110→C111 cohort), `applyChaosReaction_` (`citizenMemory.js:268–269`), and first-fold `fandom` seeding (`compressLifeHistory.js:597`) all write directly to `base`.

---

## C5 — `engine.104` ("Mint economy: arrivals born right … 545/988 unmapped")

**Verdict:** `CONFIRMED`

### `file:line` Evidence
- **`generateGenericCitizens.js` occupation list vs `data/economic_parameters.json`:**
  - `phase05-citizens/generateGenericCitizens.js:418–436` defines a 32-title `occupations` array and assigns `var occ = randItem(occupations)` at line `637`.
  - Against `data/economic_parameters.json` (`309` roles, loaded in Apps Script via `economicParameters_()` at `utilities/citizenDerivation.js:28–71`), **15 of the 32 titles are completely absent** even case-insensitively (`EV mechanic`, `Solar panel installer`, `Fleet dispatcher`, `Drone logistics coordinator`, `Port automation monitor`, `Last-mile delivery driver`, `Nurse`, `Pharmacy tech`, `Youth mentor`, `Data entry specialist`, `IT support technician`, `QA tester`, `Building maintenance tech`, `Transit operator`, `Urban garden worker`), and 5 more of the remaining 17 (`Vertical farm technician`, `Home health aide`, `Community health worker`, `Security guard`, `Hair stylist`) differ in capitalization from `economic_parameters.json` (so strict `===` in `lookupIncome_` at `utilities/citizenDerivation.js:146–153` matches only **12 of 32**, whereas lowercased `jobPayTable_` at `phase05-citizens/generationalWealthEngine.js:897` matches **17 of 32**).
- **Live snapshot counts (`output/simulation_ledger_snapshot.jsonl`):**
  - Total `Status === "Active"` rows: `988` (of `1,032` total rows).
  - Unmapped against `data/role_mapping.json` (`295` role keys): **`545` of `988`** case-insensitively (`551` case-sensitively).
  - Unmapped against `data/economic_parameters.json` (`309` roles): **`453` of `988`** case-insensitively (`494` case-sensitively), of which **`43` are `"student"`**.
- **Other mint and role-assignment paths that bypass or draw outside `economic_parameters.json`:**
  1. **Migration wave & direct GC lottery (`checkForPromotions_` in `phase05-citizens/checkForPromotions.js:303, 335, 363`):** Copies `row[gOcc] || "Citizen"` directly from `Generic_Citizens.Occupation` into `Simulation_Ledger.RoleType` without calling `deriveRoleType_`, importing the 15 non-catalog `generateGenericCitizens.js` titles verbatim.
  2. **Emergence & family-match drip (`checkEmergencePromotions_` at `phase05-citizens/processAdvancementIntake.js:1717`; `checkFamilyMatchPromotions_` at `:1923`; `processAdvancementRows_` at `:705, 825–829`):** Queues `Generic_Citizens.Occupation` into `Advancement_Intake1.RoleType` and passes it as `roleTypeOverride: rawRole || null` to `deriveCitizenProfile_` (`utilities/citizenDerivation.js:431`), which skips `deriveRoleType_` whenever `rawRole` is non-empty.
  3. **`citizenDerivation.js` fallback pool (`DEMOGRAPHIC_VOICE_FALLBACK_` at `utilities/citizenDerivation.js:84–100, 256` and `lib/citizenDerivation.js:212–228`, mirrored in `DEMOGRAPHIC_VOICE_ROLES` at `phase05-citizens/processAdvancementIntake.js:52–83`):** When `deriveRoleType_` falls back, it draws from a hardcoded 65-title list in which **22 of 65 titles** (26 case-sensitively, e.g., `Harbor Tugboat Captain`, `Sea Level Monitoring Technician`, `Public School Teacher`, `Corporate Accountant`, `Mutual Aid Network Organizer`, `Ex-Offender Reentry Counselor`) are not in `data/economic_parameters.json`.
  4. **GC courtship & GC marriage lottery (`processGCCourtship_` at `phase05-citizens/bondEngine.js:2395`; `processGCMarriageLottery_` at `:2587`):** Copies `Generic_Citizens.Occupation` or defaults to `'Service worker'` (also absent from `economic_parameters.json`).
  5. **Business owner door, household door, civic challenger mint, births, and 18th-birthday settlement / cross-field rehire:** `checkBusinessOwnerPromotions_` (`phase05-citizens/processAdvancementIntake.js:2118`) writes `'Owner, ' + biz.name`; `queueHouseholdIntake_` (`:2336–2338`) writes operator `RoleType` or `'student'`; `mintChallengerOnLedger_` (`phase05-citizens/updateCivicApprovalRatings.js:1613`) writes `'Civic candidate'`; `createChildRow_` (`phase04-events/generationalEventsEngine.js:1165`) writes `'student'`; and `settleAdulthood_` / `matchUnemployedToOpenings_` (`phase05-citizens/educationCareerEngine.js:731–753, 893–906` and `phase05-citizens/runCareerEngine.js:1756–1760, 1824`) assign `ADULT_START_BANDS` / `SETTLE_ROLES_BY_FIELD` / `'Train Operator'` titles where 26 of the 36 `SETTLE_ROLES_BY_FIELD` titles are not in `economic_parameters.json`.

### What the claim gets wrong or leaves out
The claim's numbers (`15/32`, `545/988`, `453/988`, and `43` `"student"`) are confirmed on case-insensitive matching (case-sensitive matching makes it `20/32` missing in `generateGenericCitizens.js` and `494/988` on the snapshot), and far from `generateGenericCitizens.js` being the sole leak, almost every other mint path—migration wave (`checkForPromotions.js:363`), emergence/family drip (`processAdvancementIntake.js:826, 1717, 1923`), GC weddings (`bondEngine.js:2395, 2587`), `citizenDerivation.js`'s own 65-role fallback pool (`utilities/citizenDerivation.js:84–100`, 22/65 absent), and adulthood settlement (`educationCareerEngine.js:893–906`, 26/36 absent)—either preserves non-catalog `RoleType` values or draws from separate hardcoded lists.
