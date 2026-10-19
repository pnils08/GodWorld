---
title: Codex engine.304 cut 1 recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
sources:
  - docs/for-claude-review/2026-10-19-engine304-cut1-recheck-TASK.md
  - docs/for-claude-review/2026-10-19-codex-engine304-cut1-diff-review.md
  - commit 85c9104e
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.304 cut 1 — recheck

Source review of `85c9104e`; its changed implementation files are unchanged at HEAD. Local tests only: `engine304FamilyLottery` 19/19 and `householdIntake` 59/59. No Cycle, model, Sheet, bench, canon or live run. **Final gate: SHIP cut 1 to the specified C113–C117 sandbox bench; HOLD any PROD claim until the bench reads back minor ledger economics/households and both pool trajectories.**

## 1. Minor mint economics — SHIP for newly minted non-GAME children; HOLD universal cleanup

- The new guard runs after the pay/profile writes and forces Income, DebtLevel and NetWorth to 0 for every new non-GAME row with age <18 (`phase05-citizens/processAdvancementIntake.js:862-903`). That covers GC emergence (`:1705-1735`) and household children (`:899-910`); the latter mint executes in `scripts/householdIntake.test.js:148-165` and passed locally.
- The existing-row branch only blocks *new* salary derivation for a minor (`processAdvancementIntake.js:753-794`); it does not clear any already stored income, debt or net worth. This does not mint new adult economics, but an intake update can leave a previously contaminated minor unchanged. The patch expressly exempts GAME rows from all three zeroes (`:897-903`), preserving their sports salary and derived debt/net worth (`:862-894`; the GAME salary contract is in `docs/plans/2026-08-29-employment-system-cascade.md:83`). Neither exception is a newly pooled ENGINE child's path. The reported live 3 debt / 5 net-worth minors were not read or repaired here.

## 2. Surfacing — SHIP for this event route

- Under-13 rows are rejected before insertion into `gcSurfacePool`; age is BirthYear-first, then Age, with unknown age treated as adult (`phase05-citizens/generateCitizensEvents.js:2324-2353`). Both random and forced picks draw solely from that pool (`:2986-2997`; `:3898-3920`). For teens, only `gcT3` enters the event pool and pending tick map (`:2999-3016`); the tick requires a mapped picked line (`:3655-3660`). Thus this event route cannot tick an under-13 through the forced picker or its later write. Other intake/media usage paths were outside this edit.

## 3. Age fallbacks — SHIP

- The feeder distinguishes blank Age from explicit 0, counting the latter as youth (`phase05-citizens/generateGenericCitizens.js:372-386`). The wave passes `gAge`, uses BirthYear first and Age if blank, including Age 9 in `other` (`phase05-citizens/checkForPromotions.js:303,641-670`). Behavioral tests for both cases passed (`scripts/engine304FamilyLottery.test.js:156-163,177-183`).

## 4. Self-arm and replay — SHIP for the named bench path

- The web app's `runWorldCycle` calls `runWorldCycleLocked_`, whose `ensureEngine148Config_` runs before cache/Cycle work (`phase01-config/godWorldEngine2.js:446-495`). A reset from `BASELINE-1004-C112b` followed by C113–C117 through that entry therefore has the two new keys seeded before the feeder. The dry-run/replay wrappers still bypass self-arm and a missing key is swallowed at `safePhaseCall_` (`godWorldEngine2.js:159-169,2083-2119,2188-2229,2334-2335`), but neither wrapper is the stated bench fire. New youth rows also change shared RNG consumption (`generateGenericCitizens.js:640-651`); no historical byte-for-byte replay claim is made.

## 5. Tests — SHIP as bounded local coverage; HOLD Cycle proof

- The two local suites passed 19/19 and 59/59. Feeder and wave fallbacks run behaviorally (`scripts/engine304FamilyLottery.test.js:105-183`); household children exercise the real queue mint (`scripts/householdIntake.test.js:148-165`). Surfacing and the generic queue-mint guard are regex assertions only (`scripts/engine304FamilyLottery.test.js:201-211`), so these suites do not prove a GC child reaches the ledger, gets a HouseholdId, or receives only age-appropriate event text in a Cycle. The five-fire bench and typed readback remain the deciding evidence.
