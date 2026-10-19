---
title: Codex engine.304 cut 1 diff review
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
sources:
  - docs/for-claude-review/2026-10-19-engine304-cut1-diff-review-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
  - commit 25ee233c
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.304 cut 1 — diff review

Source review of `25ee233c` against D7/D8 and the folded review. The reviewed implementation files are unchanged at HEAD. No Cycle, test, model, Sheet, bench, canon, or live run. **Final gate: HOLD cut 1 before bench/push until the minor economic mint and wave Age fallback are fixed and covered; then measure both adult-women and youth trajectories on the bench.**

## 1. Feeder — FIX

- **SHIP:** Active sex floors now count adults, the youth floor counts minors, BirthYear takes precedence, and rows with neither field count adult (`phase05-citizens/generateGenericCitizens.js:374-392`). Early exit and fill count include the youth deficit and hood shortfall (`:393-407`). The slot plan alternates adult/youth while both deficits remain, balances youth sexes, and uses adults for excess hood seats (`:880-902`). Only this file reads `sexQueue`, as `{sex,youth}` at `:407,416,640,648,651`.
- **FIX:** A blank BirthYear plus explicit `Age=0` is counted as adult because `pYouth` requires `page>0` (`generateGenericCitizens.js:382-384`); D7's 0–17 band includes a newborn. Distinguish an explicit zero from a missing Age cell.
- **SHIP with rate caveat:** `poolYear-randInt(18)` reaches ages 0 and 17; adult `18+randInt(58)` reaches 18 and 75; minors get `student` (`generateGenericCitizens.js:648-651`). With both the 31-woman and 40-youth deficits open, cap 12 produces six adult women and six youths, not 12 women (`:397-407,889-899`; `scripts/engine304FamilyLottery.test.js:105-117`). Against the plan's prior 4-woman wave drain (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:496`), the projected net is about +2, not the old +8 estimate; actual rates need the planned bench.
- **HOLD replay equivalence claim:** Fixed seed and state still give deterministic draws, but youth slots skip the adult occupation draw and the cap expands to 12 (`generateGenericCitizens.js:640-651`), shifting later name/hood and subsequent shared `ctx.rng` draws. No old-output or downstream replay parity is established by `scripts/engine304FamilyLottery.test.js:20-27,105-152`.

## 2. Config — HOLD for setup

- **SHIP:** Both keys and values are in `ENGINE148_CONFIG_SEEDS` (`phase01-config/engine94SheetContract.js:558-565`); production self-arms before cache and Cycle work (`phase01-config/godWorldEngine2.js:483-510`).
- **HOLD:** `runDryRunCycle` calls `runCyclePhases_` without that self-arm (`godWorldEngine2.js:2083-2119,2259-2275`). Missing keys make the feeder throw (`generateGenericCitizens.js:365-367`), but `safePhaseCall_` catches it and continues the Cycle (`godWorldEngine2.js:159-169,2334-2335`). A dry run or checkpoint replay on an unseeded bench can therefore appear to complete while producing no pool. Seed and read back both cells before replay, or make the missing-key failure fatal; no bench read was made here.

## 3. Wave and existing adults — FIX

- **SHIP:** The wave calls `simYearOf_` only when passed a BirthYear column and keeps minors in `other` rather than excluding them (`phase05-citizens/checkForPromotions.js:641-679`). The mint now uses BirthYear before Age (`:330-349`).
- **FIX:** Preferred-line age checks only BirthYear (`checkForPromotions.js:654-671`). A female GC row with blank BirthYear and `Age=9` enters the women-first line even though the mint reads her as nine (`:332-333`); pass/read Age there too, with BirthYear precedence. `scripts/engine304FamilyLottery.test.js:155-174` tests only populated BirthYear or an omitted column.
- **Visible adult effect:** For existing rows whose Age conflicts with valid BirthYear (plan's 158/276 is an earlier live observation, not reverified), the minted BirthYear was already retained but now the economic and status fields follow that year too: career years/stage and income (`checkForPromotions.js:380-398`), student/zero income and RoleType for an actual minor (`:400-407`), education, debt/net worth and `youth`/`single` (`:408-413`). This can change the recorded job pay, assets and marital status of a promoted row; it does not rewrite the GC Age cell.

## 4. Courtship — SHIP

- Both live GC reads changed only their age expression to prefer BirthYear (`phase05-citizens/bondEngine.js:2585,2685`); wedding window and eligibility remain adjacent and unchanged (`:2586-2589,2681-2688`). R15's courtship rules were not changed. Existing Age/BirthYear conflicts may change eligibility by the intended D8 read correction.

## 5. Minors downstream — HOLD

- **SHIP for wave:** A pooled minor reaches a Tier-4 ledger row with student RoleType/stage, `youth`, zero income, career years, debt and net worth, and no employer assignment (`checkForPromotions.js:355-366,380-413,479-486`).
- **FIX for usage emergence:** The other door queues pooled BirthYear, `student` and Tier 4 (`phase05-citizens/processAdvancementIntake.js:1705-1735`); the mint derives `youth` and skips employer for age <18 (`:808-830,895-933`). But it copies `profile.DebtLevel` and `profile.NetWorth` into the minor row (`:862-864`) and has no minor zero guard at the income block (`:877-894`). `deriveCitizenProfile_` computes those fields from an adult style profile (`utilities/citizenDerivation.js:433-451`); `deriveDebtLevel_` and `deriveNetWorth_` return positive values even below 18 (`:317-357`). Thus the usage door can mint a child with debt/assets, and Income is not explicitly set to zero. Fix at this mint site before accepting D7's child path.
- **SHIP with limit:** After both mint doors, `processHouseholdFormation_` calls `formCriteriaHouseholds_` (`phase01-config/godWorldEngine2.js:658-669`; `phase05-citizens/householdFormationEngine.js:208`). A parentless minor without a HouseholdId forms a one-member family household and receives the ID in memory (`householdFormationEngine.js:383-404,443-460`), provided that phase succeeds; no Cycle-end readback was done.
- **FIX for adult text:** GC surfacing filters Active/status and names without age (`phase05-citizens/generateCitizensEvents.js:2323-2345`); it can give a six-year-old the adult acquaintance lines “swapped stories” and “haul something heavy” (`:2979-3008`) and tick emergence. Civic challenger checks BirthYear age 25–70 (`phase05-citizens/updateCivicApprovalRatings.js:1670-1684`), so new minors with BirthYear are excluded. Owner door authors from business personnel and does not draw GC (`phase05-citizens/processAdvancementIntake.js:1951-1963,2109-2111`).

## 6. Tests — FIX

- The new VM test executes feeder and wave slot selection (`scripts/engine304FamilyLottery.test.js:48-174`), but tests for wave mint and courtship are source regexes only (`:177-188`). It does not run either child ledger mint or same-Cycle household formation, missing-key dry run, explicit `Age=0`, or blank-BirthYear minor wave priority. Add focused behavioral coverage for the two FIX paths before treating the 15/15 claim as a cut-1 gate. No local tests were run for this review.
