---
title: World_Config Centralization Plan
created: 2026-11-24
updated: 2026-11-25
type: plan
tags: [engine, config, draft]
sources:
  - phase01-config/engine94SheetContract.js (the 25 seed lists, :15-:766)
  - phase05-citizens/bondEngine.js:268-290 (loadBondDials_ / bondDial_, commit e788cafe7)
  - docs/reference/DEPLOY_HISTORY.md §PROD stage 84 (top at the time of writing); every file:line below is asserted against HEAD 3d1abeb2a
  - live World_Config tab read 2026-11-25, read-only (293 data rows: 291 keyed, 2 empty; cycleCount 117, lastRun 11/22/2026)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.368 (builder 2026-11-25: \"we can add a row on rollout for deep world_config work, you can spin a sub-agent to complile a start of plan with what needs to come out and be centralized\"); inventory only, no cut approved"
---

# World_Config Centralization Plan

**Status:** draft — inventory only, no tasks approved. Nothing in this file is a ruling; every cut below waits for the builder.

**Builder's words (2026-11-24, as quoted in commit e788cafe7):** "the cleaner way is to have the 'variants' out side of the code into world_config"

**Goal:** every number that tunes a citizen's week is a row the builder can change on the World_Config tab, with the value the code holds today seeded and the read failing loud when the row is missing; no behaviour moves in any cut.

**Rows:** none claimed · **Owner:** unassigned

## What this file is

Step 1 of "deep World_Config work": an inventory. 17 bond numbers already moved (e788cafe7) and are not re-listed. Counts below are of **candidates**, not of decisions: a candidate is a number in code that looks like a tuning dial; some are dead, some are structural, some are builder-ruled and carry the ruling in a comment. Each row says where it is, what it holds, what it controls, whether `ctx` is in scope where it is read, and what else names it.

### Method and depth (what each directory got)

Scripts were scratch only (acorn from `node_modules`, run from the scratchpad; nothing committed, no tests, no bench). Passes: **(d)** declarations — module-level `var NAME = <number | all-number table | literal arithmetic>` and function-local UPPER_CASE equivalents; **(r)** rolls — an `rng()` / `rand()` / `roll()` result, direct or stored in a variable, compared to a numeric literal; **(s)** steps — `+=` / `-=` of a non-integer literal; **(g)** `ctx` scope at each use site (innermost-out parameter chain); **(x)** a grep of the name in `*.test.js`, `scripts/`, `lib/`, `dashboard/`, other phases.

| directory | .js files (tests included) | depth |
|---|---|---|
| phase05-citizens | 35 | d + r + s + g + x on every non-test file; every ladder, table and bond / household / wealth / youth / career file opened at the sites listed. **Not run:** a pass on `>= N` threshold comparisons (only the ones in `updateExistingBonds_`, `detectNewBonds_`, `bondCompatibility_` were read) and rolls whose chance variable is defined far from the roll (listed in Not swept) |
| phase04-events | 9 | d + r + g + x; `generationalEventsEngine.js` check*_ functions and tables opened; `faithEventsEngine.js` table heads opened |
| phase03-population | 9 | d + r + g + x; the `cfgNum_` sites in `applyDemographicDrift.js` and `updateNeighborhoodDemographics.js` read |
| phase02-world-state | 15 | d + r + g + x; nothing opened beyond the declaration and roll lines |
| phase06-analysis | 9 | d + r + g + x; `applyMigrationDrift.js` config reads opened |
| phase01-config | 7 | d + r + g + x; `godWorldEngine2.js` `updateWorldPopulation_` rate block and fire-guard read opened |
| phase07-evening-media, utilities | 19, 52 | d + r + g + x at declaration level; `citizenDialMap.js`, `citizenMemory.js`, `compressLifeHistory.js`, `sportsWeekRecord.js` opened at the rows listed |
| phase08-v3-chicago, phase09-digest, phase10-persistence | 8, 4, 12 | d + r + g + x (the roll sweep found no literal-chance rolls in these three) |
| phase11 | — | no `phase11-*` directory exists in this tree (phase01 through phase10) |

All `file:line` references are checked against the working tree at HEAD `3d1abeb2a` (2026-11-25) by the script that wrote this file: it refuses a row whose quoted text is not on its line. The tree moves under a sweep — two engine.356 commits landed during it (`bondEngine.js` 2 lines, `generateCitizensEvents.js` 52 lines) — so re-run the check before building from a line number. In the ctx column: `yes` = an enclosing function takes `ctx`; `partial` = it takes `S` / `cfg` / `config` but not `ctx`; `NO` = neither (the move needs plumbing); `[file]` marks a use in a different file than the definition.

Caveats on the last column: a name grep misses tests that reach a constant only through the function; it over-counts for generic names (`LIMIT`, `THRESHOLD`, `HI`, `LO` are flagged). "No use outside the definition" means no other occurrence of the identifier in `phase*`, `utilities`, `lib`, `scripts`, `dashboard` — Apps Script files share one flat namespace, so a use in any other file would show.

## Proposed cuts (smallest risk first; none approved)

| cut | scope | candidates | rows | `ctx` plumbing needed | no-behaviour-change proof |
|---|---|---|---|---|---|
| A | Reconcile what is already there | no value moves: dead sheet rows, dead constants, in-code copies of seeded keys, the 24 `cfgNum_` defaults, one read pattern per phase | §2 and §Cut A tables | none (plumbing already present) | grep-level; one same-sync fire before / after, every sheet tab identical |
| B | Citizen event volume | 15 rows + the participation ladder (E1: 29 adds) | B1-B15 | SPOT_LINE_WEIGHT_, TRANSIT_COMMUTE_MASS read in helpers with no ctx | same sync, same rng seed: LifeHistory_Log rows for the Cycle byte-identical, `ctx.rng.draws` equal |
| C | Bond engine remainder | 84 rows: weekly adds, thresholds, birth intensities, discovery chances, compat score, faith, courtship, GC lottery, seed bonds | C1-C84 | HOME_OWNED_ / HOUSEHOLD_COURTSHIP_BOOST read in `courtshipHousingBoost_` (no ctx) | stage-84 shape: every bond's after-value identical (Relationship_Bonds, Lived_Events, LifeHistory_Log `source:bond`) |
| E | Per-citizen drift ladders | 13 ladders, one base + adds + cap each, plus 5 per-engine citizen limits and 4 pool-pick rolls | E1-E22 | none: every ladder is inside its `run*Engine_(ctx)` | same sync: the engine's LifeHistory_Log rows identical, draws equal |
| F | Life-event base rates | 14 rows + modifier lines of 7 check*_ functions | F1-F14 | none (`check*_(ctx, ...)`); two builder-ruled age edges move with their quote | same sync: Generational_Events / LifeHistory_Log milestone rows identical |
| J | Youth | 17 rows | J1-J17 | none | same sync: youth lines identical |
| H | Careers, education, advancement | 26 rows | H1-H26 | DRIP_PARENT_AGE_MIN / MAX read in `mintFamilyGcRow_` (no ctx) | same sync: Simulation_Ledger career columns + tier changes identical |
| K | Civic, approval, conduct, initiative votes, and the rest at declaration depth | 24 read rows + 51 declaration-only rows + 36 rolls found, context not read | K1-K111 | mixed; see rows | same sync: Civic_Office_Ledger, Initiative_Tracker, vote results identical |
| I | Population rates, migration, trajectory | 21 rows; sheet already holds migrationRate / deathRate / growthRate that no code reads, at values that differ from the code's | I1-I21 | hood-fit scorer `scoreHoodFit_` has no ctx | same sync: World_Population, Neighborhood_Map, Household_Ledger identical |
| G | Household, wealth, money, casino | 75 rows incl. tables; three 48000s and two 12s to settle first | G1-G75 | many: `homeSaleProceeds_`, `homeCarries_`, `homeBuyChance_`, `debtDrag_` and the casino helpers have no ctx; 4 test files name `HOME_PRICE_TO_RENT` | same sync: Simulation_Ledger money columns, Household_Ledger, Casino_Ledger identical |
| D | Dial sizes and memory (module-level, no ctx, node-side readers) | 27 rows | D1-D27 | most: `BAND_DELTA` and friends live in files with no ctx and are called from `lib/` and `scripts/` with no World_Config | same sync: Dial_Moves / Dial_Pulse identical; every node-side caller still loads |

Proof for every cut, in one form: fire the same live sync twice in the shared sandbox, once on the tree before the move and once after, with the cycle seed the same (`initializeSeededRng_` seeds `ctx.rng` from the cycle id, `utilities/cycleModes.js:199`, called at the `Phase1-SeedRng` step of both phase runners, `phase01-config/godWorldEngine2.js:656` and `phase01-config/godWorldEngine2.js:2377`; a replay mode that reuses a stored seed exists at `utilities/cycleModes.js:176`), seed the new rows at the values the code held, and compare the named tabs byte for byte plus `ctx.rng.draws` (reported at `phase01-config/godWorldEngine2.js:1004-1008`). A move that adds or drops a draw fails the proof by itself. The engine.356 bond-dial commit e788cafe7 names the same kind of proof ("every bond's after-value identical to stage 84's") but records it as not benched and suites not run, so it is a named precedent, not a run one. Those fires need the sandbox protocol in `docs/reference/DEPLOY.md`; this file does not run one.

## 1. What World_Config already carries (seed lists)

`phase01-config/engine94SheetContract.js` holds **25 seed lists, 265 keys**. Shape `[key, value, description, min, max, isInt]`; 24 `ensureEngine<N>Config_(ss)` calls run from `phase01-config/godWorldEngine2.js:582-606` before `loadConfig_` (the engine.94 list rides `ensureEngine94SheetContract_`). Key names only, grouped by list; prefix families (`bizVol_*`, `bizHoodWeight_*` ...) are folded:

| Seed list | contract line | self-arm | keys |
|---|---|---|---|
| ENGINE94 (15) | :15 | ensureEngine94SheetContract_ :894 | `folkMemoryWindow`, `griefDurationCycles`, `griefHolidayDurationCycles`, `griefParticipationMultiplier`, `griefPublicActivityMultiplier`, `griefSupportMultiplier`, `griefResponseChance`, `approvalCeilingThreshold`, `approvalCeilingMinStreakCycles`, `approvalCeilingBaseChance`, `approvalCeilingChanceStep`, `approvalCeilingMaxChance`, `approvalCeilingScandalDurationCycles`, `approvalCeilingApprovalDrop`, `approvalCeilingElectionPenalty` |
| ENGINE133 (7) | :36 | ensureEngine133Config_ :954 | `illnessBaseline`, `illnessAttractorPull`, `illnessEventStrain`, `illnessHoodWeightMin`, `illnessHoodWeightMax`, `illnessConvergenceRate`, `illnessInitiativeRelief` |
| ENGINE96 (71) | :53 | ensureEngine96Config_ :747 | `bizDriftMaxUp`, `bizDriftMaxDown`, `bizGrowthCeil`, `bizGrowthFloor`, `bizNoiseBound`, `bizCoverageUnit`, `bizVitalityGain`, `bizSuccessWindow`, `bizSuccessVitalityHigh`, `bizSuccessApprovalHigh`, `bizSuccessPenalty`, `bizDisruptBaseChance`, `bizDisruptSuccessMult`, `bizDisruptShock`, `bizClosureStreak`, `bizClosureRevenueFloorPct`, `bizEventShockScale`, `bizVol_*` (10: faith, retail, food, health, tech, professional, construction, arts, education, default), `bizInitiativeStallDrag`, `treasuryOpeningBalance`, `treasuryWeeklyAllocation`, `bizSportsWeekPp`, `bizShipEchoShare`, `bizSettleRate`, `bizSettleMinStaff`, `chaosShipChancePerCycle`, `bizDeclineStreak`, `bizOwnerMintP`, `bizOwnerMaxStaff`, `bizOwnerMinAge`, `bizHoodWeight_*` (8: vitality, sentiment, crime, momentum, events, migration, income, boom), `bizHoodUnit_*` (8: vitality, sentiment, crime, momentum, events, migration, income, boom), `bizHoodSpan`, `bizHoodPull`, `bizHoodMaxPp`, `bizEventCap`, `bizWeatherPp`, `bizClassMiddle_*` (10: arts, construction, default, education, faith, food, health, professional, retail, tech), `bizOwnerMinProfit` |
| ENGINE160 (1) | :136 | ensureEngine160Config_ :140 | `hoodRentShare` |
| ENGINE213 (31) | :159 | ensureEngine213Config_ :230 | `approvalLevelBase`, `approvalLevelInertia`, `approvalStateGainDistrict`, `approvalStateGainCity`, `approvalStateGainPress`, `approvalStateCouncilCityShare`, `approvalMoodSmoothing`, `approvalStateCitySentimentUnit`, `approvalMediaStep1`, `approvalMediaStep2`, `civicStageStallCycles`, `civicStageUntendedStallCycles`, `civicDeliverMargin`, `civicDeliverMargin_health`, `civicDeliverHoldCycles`, `civicDeliverRegressShare`, `civicTendGraceCycles`, `civicTendDecayPerCycle`, `civicBuildCycles_*` (5: health, education, transit, sports, environment), `civicTendFloor`, `civicCapitalShare`, `civicOperatingWeeks`, `civicOpenSlots`, `civicDisburseTranche`, `civicGrantCapMonths`, `civicGrantHeadroomMonths`, `civicGrantCooldownCycles` |
| ENGINE192 (4) | :247 | ensureEngine192Config_ :254 | `schoolDriftStep`, `schoolDriftPull`, `schoolGradStep`, `schoolFundingInitiativePct` |
| ENGINE286 (17) | :270 | ensureEngine286Config_ :291 | `civicRoleFireChance`, `civicRoleUpChance`, `civicRolePremiseLean`, `civicRoleMediumOdds`, `civicRoleLargeOdds`, `lifeEventFireChance`, `lifeEventUpChance`, `lifeEventPremiseLean`, `lifeEventMediumOdds`, `lifeEventLargeOdds`, `lifeEventLiftCycles`, `lifeEventPromotionLift`, `lifeEventPromotionDrop`, `lifeEventPromotionOwnChance`, `lifeEventHomeRollBoost`, `homeLossChance`, `lifeEventHomeCarryBar` |
| ENGINE221 (1) | :305 | ensureEngine221Config_ :309 | `econMoodInertia` |
| ENGINE209 (7) | :326 | ensureEngine209Config_ :338 | `franchiseWeightResultRate`, `franchiseWeightTenureRate`, `franchiseWeightFanRate`, `franchiseWeightCap`, `franchiseWeightFloor`, `sportsStreakHeadline`, `sportsFadeRate` |
| ENGINE290 (16) | :358 | ensureEngine290Config_ :377 | `transitCityRiders`, `transitCityTraffic`, `transitFreewayMult`, `transitResidentWeight`, `transitCatchmentShare`, `transitRetailWeight`, `transitWeekendMult`, `transitMajorHolidayMult`, `transitHolidayHoodLift`, `transitFirstFridayLift`, `transitCongestionOnTimeMult`, `transitStaffingGovernor`, `transitNoCrewOnTimeDrop`, `transitNoCrewRidershipMult`, `transitNoDispatchOnTimeDrop`, `transitChaosWeight` |
| ENGINE275 (1) | :392 | ensureEngine275Config_ :396 | `fireGuardMinutes` |
| ENGINE95 (6) | :410 | ensureEngine95Config_ :419 | `wallBudgetMs`, `tailReserveMs`, `checkpointSaveMs`, `checkpointForce`, `checkpointFaultAt`, `checkpointResumeFaultAt` |
| ENGINE272 (2) | :433 | ensureEngine272Config_ :438 | `integrityWearRate`, `integrityWearFloor` |
| ENGINE349 (5) | :456 | ensureEngine349Config_ :464 | `dialLineScale`, `dialDirectShare`, `dialMoodFade`, `dialHardenShare`, `dialReflectionShare` |
| ENGINE276 (6) | :481 | ensureEngine276Config_ :490 | `debtLineMultiple`, `debtRiseRate`, `debtFallRate`, `debtDragCapShare`, `debtDefaultCycles`, `debtDefaultMarkCycles` |
| ENGINE338 (2) | :509 | ensureEngine338Config_ :514 | `postCareerIncomeTier1`, `postCareerIncomeTier2` |
| ENGINE356 (27) | :531 | ensureEngine356Config_ :564 | `trajectoryCrimeBand`, `ownerDrawShare`, `bondMomentMaxPerWeek`, `bondMomentChanceScale`, `bondMomentDialSize`, `bondMomentStepPartner`, `bondMomentStepFriend`, `bondMomentStepFamily`, `bondMomentStepRival`, `bondWeeklyRival`, `bondWeeklySportsRival`, `bondWeeklyAlliance`, `bondWeeklyMentor`, `bondWeeklyFestival`, `bondWeeklyFriend`, `bondWeeklyUpkeep`, `bondFadeOneAbsent`, `bondFadeBothAbsent`, `bondEncounterChance`, `bondDeepenAt`, `bondRomanceAt`, `bondRomanceChance`, `bondRomanceStepChance`, `bondRomanceStepChanceApart`, `bondRomanceStep`, `bondMarriageAt`, `migrationCrimeBand` |
| ENGINE271 (11) | :583 | ensureEngine271Config_ :597 | `fineRateTicket`, `fineCapTicket`, `fineRateMinor`, `fineCapMinor`, `fineRateSerious`, `fineCapSerious`, `fineRateGrave`, `propertyTaxRate`, `businessTaxRate`, `taxDayCyclePosition`, `taxThinHoodFloor` |
| ENGINE254 (3) | :615 | ensureEngine254Config_ :621 | `hospitalStrainWindow`, `hospitalStrainBand`, `hospitalStrainGain` |
| ENGINE176 (6) | :635 | ensureEngine176Config_ :644 | `dialFrictionRentBurden`, `dialSetbackLossPct`, `dialBetMediumPct`, `dialBetLargePct`, `dialHoodPressureBar`, `dialHoodCrimeBar` |
| ENGINE178 (6) | :658 | ensureEngine178Config_ :667 | `dialOpenMoveThresholdMult`, `dialOwnerStreakRoom`, `dialOwnerDriveExpandMult`, `dialIntegrityScandalLow`, `dialIntegrityScandalHigh`, `dialBurnoutHealthMult` |
| ENGINE157 (6) | :681 | ensureEngine157Config_ :733 | `maneuverClimbBar`, `maneuverRetreatDebt`, `maneuverStandingMargin`, `maneuverClimbOdds`, `maneuverRetreatOdds`, `maneuverDriveWeight` |
| ENGINE161 (1) | :690 | ensureEngine161Config_ :719 | `relocationMaxShare` |
| ENGINE148 (8) | :694 | ensureEngine148Config_ :705 | `hoodCitizenFloor`, `gcSurfaceChance`, `hoodFloorPromotePerCycle`, `gcPoolFloorFemale`, `gcPoolFloorMale`, `gcPoolFloorYouth`, `gcPoolMaxPerCycle`, `hoodFloorSurfaceQuota` |
| ENGINE135 (5) | :761 | ensureEngine135Config_ :940 | `employmentAttractorPull`, `employmentHoodWeightMin`, `employmentHoodWeightMax`, `employmentConvergenceRate`, `employmentDistressGain` |

Nothing below re-lists a key in this table. Five prefix families are folded above (`bizVol_*`, `bizHoodWeight_*`, `bizHoodUnit_*`, `bizClassMiddle_*`, `civicBuildCycles_*`). `civicBuildCycles_` is read by building the key from the domain (`phase05-citizens/civicInitiativeEngine.js:4040`); so is `civicDeliverMargin_` (`:4397`: seeded `_health`, live `_housing` at row 153).

## 2. The sheet, the seeds and the code do not agree everywhere

### 2.1 Seed keys absent from the live tab — deploy state, not a defect

Live tab read 2026-11-25 (read-only): 291 keyed rows plus 2 empty rows (sheet rows 19, 20), `cycleCount` 117, `lastRun` 11/22/2026 (no live fire since). 25 seeded keys are not on it yet; `ensureEngine356Config_` writes them at fire open before `loadConfig_`. That order holds for `runWorldCycleLocked_` (the live and sandbox fire, `phase01-config/godWorldEngine2.js:575`, ensure calls `:582-606`, `loadConfig_` `:647`). It does **not** hold for the dry-run and replay entry points: `runCyclePhases_` (`:2358`, `loadConfig_` at `:2367`) is reached from `runDryRunCycle` (`:2221`) and a second caller (`:2331`) and runs no ensure — a dry run on a sheet that lacks the rows reads without them (the bond dials throw).

| keys | in seed list | code on PROD? | evidence |
|---|---|---|---|
| `ownerDrawShare` (1) | ENGINE356 | yes — stage 75 (2026-11-23), commit 21403b0b0 | `phase05-citizens/generationalWealthEngine.js:1168` reads it and throws when missing (:1169), and the ensure runs at fire open before `loadConfig_` (`phase01-config/godWorldEngine2.js:582-606`, `:647`), so the first fire after the deploy writes the row before any phase reads it; `docs/reference/DEPLOY_HISTORY.md` stage 75 back-out line says "the seeded `ownerDrawShare` row" |
| `bondMomentMaxPerWeek`, `bondMomentChanceScale`, `bondMomentDialSize`, `bondMomentStepPartner`, `bondMomentStepFriend`, `bondMomentStepFamily`, `bondMomentStepRival` (7) | ENGINE356 | yes — stage 84 (2026-11-24, 82da34162) | DEPLOY_HISTORY stage 84 smoke line: "World_Config holds the seven `bondMoment*` rows" is a check still owed at C118 |
| the 17 bond dials `bondWeekly*`, `bondFade*`, `bondEncounterChance`, `bondDeepenAt`, `bondRomance*`, `bondMarriageAt` | ENGINE356 | **no** — commit e788cafe7 (2026-11-24), "Suites not run (test lock)", after stage 84 | `phase05-citizens/bondEngine.js:271-290` throws naming any missing key; the same-fire ensure order above covers it, so the check owed is a readback after the first fire |

### 2.2 Live values that differ from the seed (operator-tuned; the ensure keeps them)

| key | seed | live (row) |
|---|---|---|
| `checkpointSaveMs` | 0 | 6000 (218) |
| `integrityWearRate` | 0 | 1 (185) |
| `dialLineScale` | 1 | 2 (255) |
| `dialDirectShare` | 0 | 0.25 (256) |

A move that "seeds at the value the code held" must read the live row first for any key already tuned; these four show the seed is not always the live truth.

### 2.3 The 51 keyed live rows outside every seed list (and the empty rows)

| group | n | keys (live row) |
|---|---|---|
| empty rows | 2 | sheet rows 19, 20: key, value and description all empty |
| state, ids, switches written by the engine or by tools (not tunables) | 14 | `lastRun` (24), `cycleCount` (25), `logDriveID` (26), `simulationLedgerID` (27), `digestSheetID` (28), `worldName` (29), `bizIdHighWater` (30), `popIdHighWater` (75), `citizenArchiveEnabled` (76), `citizenArchiveTabLive` (77), `civicVoiceSentiment` (78), `civicVoiceSentimentCycle` (79), `patrolStrategy` (253), `patrolStrategyCycle` (254) |
| dials read through `cfgNum_` with the default in code | 11 | `illnessCalmStep` (34), `illnessStepUp` (35), `illnessStepDown` (36), `illnessCap` (37), `illnessSupportThreshold` (38), `illnessSupportCycles` (39), `employmentFloor` (42), `employmentAttractor` (43), `migrationClampLow` (46), `migrationClampHigh` (47), `hospitalBaseCapacity` (48) — table in 2.4 |
| dials read another way, sheet row the only definition or a loud default | 7 | `illnessFallbackRate` (40), `employmentFallbackRate` (41), `migrationPopulationFallback` (33), `prosperityEarnedOnly` (45), `eclExclusivePools` (31), `eclExclusiveMinLines` (32), `civicDeliverMargin_housing` (153) |
| dials read fail-loud, no seed list (a fresh sheet would throw) | 11 | `judicialReleasedRate` (179), `judicialDivertedRate` (180), `judicialHeldRate` (181), `investigationArrestRate` (182), `judicialRepeatHeldMultiplier` (183), `judicialDismissAfterCycles` (184), `careJusticeAdmitPerSick` (176), `careJusticeOariEligibleShare` (177), `careJusticeExposureDial` (178), `careJusticeOtherHospitalStayCycles` (188), `careJusticeOtherCustodyStayCycles` (189) — read at `phase05-citizens/judicialLifecycle.js:150-160` (`loadJudicialRates_`, throws on a missing cell, split must sum to 1), `phase04-events/careJusticeService.js:179-188`, `phase10-persistence/buildCyclePacket.js:1123-1124` through `utilities/careJusticeAccounting.js:422-428` (`careJusticeStay_`: whole number 1-8, the 8 being `CARE_JUSTICE_STAY_MAX` in code) |
| **no reader found by grep** | 8 | `migrationRate` (21), `deathRate` (22), `growthRate` (23), `employmentStep` (44), `hospitalLoadPerSick` (49), `hospitalTalkbackGain` (50), `worldYearBase` (65), `bizVitalityNeutral` (85) — see 2.5 |

### 2.4 `cfgNum_` sites: the default lives in code AND on the sheet

`cfgNum_(ctx, cfg, key, default)` (`phase03-population/applyDemographicDrift.js:537-548`) returns the in-code default and pushes a one-time warning when the cell is missing. 24 call sites; 11 keys have no seed list at all. One disagrees with the sheet today:

| site | key | code default | live value (row) | seeded? | note |
|---|---|---|---|---|---|
| `phase03-population/applyDemographicDrift.js:80` | `illnessCalmStep` | 0.0004 | 0.0004 (34) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:81` | `illnessStepUp` | 0.0002 | 0.0002 (35) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:82` | `illnessStepDown` | 0.0002 | 0.0002 (36) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:83` | `illnessCap` | 0.15 | 0.15 (37) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:84` | `illnessSupportThreshold` | 0.08 | 0.08 (38) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:85` | `illnessSupportCycles` | 3 | 3 (39) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:88` | `employmentFloor` | 0.88 | 0.85 (42) | no seed list | **differs** |
| `phase03-population/applyDemographicDrift.js:89` | `employmentAttractor` | 0.96 | 0.96 (43) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:94` | `migrationClampLow` | -5000 | -5000 (46) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:95` | `migrationClampHigh` | 5000 | 5000 (47) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:100` | `hospitalBaseCapacity` | 100 | 100 (48) | no seed list |  |
| `phase03-population/applyDemographicDrift.js:142` | `illnessBaseline` | 0.035 | 0.035 (66) | 0.035 ENGINE133 |  |
| `phase03-population/applyDemographicDrift.js:143` | `illnessAttractorPull` | 0.12 | 0.12 (67) | 0.12 ENGINE133 |  |
| `phase03-population/applyDemographicDrift.js:157` | `illnessEventStrain` | 0.015 | 0.015 (68) | 0.015 ENGINE133 |  |
| `phase03-population/applyDemographicDrift.js:276` | `employmentDistressGain` | 0.3 | 0.3 (190) | 0.3 ENGINE135 |  |
| `phase03-population/applyDemographicDrift.js:281` | `employmentAttractorPull` | 0.12 | 0.12 (71) | 0.12 ENGINE135 |  |
| `phase03-population/applyDemographicDrift.js:285` | `employmentAttractorPull` | 0.12 | 0.12 (71) | 0.12 ENGINE135 |  |
| `phase03-population/updateNeighborhoodDemographics.js:242` | `illnessInitiativeRelief` | 0.25 | 0.25 (147) | 0.25 ENGINE133 |  |
| `phase03-population/updateNeighborhoodDemographics.js:261` | `illnessConvergenceRate` | 0.25 | 0.25 (146) | 0.25 ENGINE133 |  |
| `phase03-population/updateNeighborhoodDemographics.js:282` | `employmentConvergenceRate` | 0.25 | 0.25 (74) | 0.25 ENGINE135 |  |
| `phase03-population/updateNeighborhoodDemographics.js:418` | `illnessHoodWeightMin` | 0.5 | 0.5 (69) | 0.5 ENGINE133 |  |
| `phase03-population/updateNeighborhoodDemographics.js:419` | `illnessHoodWeightMax` | 2.0 | 2 (70) | 2 ENGINE133 |  |
| `phase03-population/updateNeighborhoodDemographics.js:510` | `employmentHoodWeightMin` | 0.5 | 0.5 (72) | 0.5 ENGINE135 |  |
| `phase03-population/updateNeighborhoodDemographics.js:511` | `employmentHoodWeightMax` | 2.0 | 2 (73) | 2 ENGINE135 |  |

`employmentFloor`: the code default and three comments say **0.88** (`applyDemographicDrift.js:88`, `:263`, `:610`); the `:263` comment records it as the plan-approved value ("approved 2026-08-29: World_Config employmentAttractor 0.96, floor 0.88"). The live row holds **0.85** (row 42, described "engine.102 W2b: minimum city employment rate"); `ENGINE135_CONFIG_SEEDS` does not include `employmentFloor`, so nothing has moved the row to the approved value. The sheet value runs while the row exists; the 0.88 runs only on a fresh sheet. So the live row looks like the stale side, not the code — a reading, not a ruling; the builder says which number the sim means.

### 2.5 Sheet rows with no reader found by grep

Searched `phase*`, `utilities`, `lib`, `scripts`, `dashboard` (non-comment lines) and the whole repo outside `docs/` and `archive/`.

| row | key = value | what the code does instead |
|---|---|---|
| 21 | `migrationRate` = 0.001 | only `ledgers/cycle-75/World_Config_Cycle_75.txt:9` (a Cycle 75 dump) names it; migration is `updateWorldPopulation_` noise + clamp (`phase01-config/godWorldEngine2.js:1491`) |
| 22 | `deathRate` = 0.009 | only the cycle-75 dump (`:10`); the code holds `phase01-config/godWorldEngine2.js:1394` — **a different number** |
| 23 | `growthRate` = 0.012 | no reader of the key (the 11 grep hits are the business `Growth_Rate` field); the code holds `phase01-config/godWorldEngine2.js:1393` — **a different number** |
| 44 | `employmentStep` = 0.0003 | named only in a test fixture, `scripts/illnessEnvelope.test.js:92` |
| 49, 50 | `hospitalLoadPerSick` = 1, `hospitalTalkbackGain` = 0.001 | named only in a comment, `phase03-population/applyDemographicDrift.js:99`; the engine.254 plan seeds them (`docs/plans/2026-09-21-care-and-justice-system.md:811`) but `ENGINE254_CONFIG_SEEDS` (`phase01-config/engine94SheetContract.js:615-619`) holds three other keys |
| 65 | `worldYearBase` = 2039 | the sim year is `2040 + (Math.ceil(c / 52) - 1)` at `phase01-config/advanceSimulationCalendar.js:334` — the row says 2039 for SimYear 0, the code says 2040 for Cycle 1, and nothing links them |
| 85 | `bizVitalityNeutral` = 6 | named only in `docs/plans/2026-08-01-business-lifecycle-generator.md:100`; the seeded `bizVitalityGain` description says the term now reads the city median hood RetailVitality (`phase01-config/engine94SheetContract.js:60`, engine.193) |
| 26, 27, 28, 29 | ids and a label | no JS reader found; non-JS tooling (Apps Script editor, scripts outside `*.js`) not swept |

### 2.6 Config reads with no row anywhere (the coded default is the only definition)

| site | key | missing means |
|---|---|---|
| `phase06-analysis/applyMigrationDrift.js:524` | `enableMigrationEconomicFeedback` | enabled (`!== false`) |
| `phase06-analysis/applyMigrationDrift.js:525` | `migrationEconomicFeedbackMaxDelta` | `|| 3`, clamped 0-10 |
| `phase06-analysis/applyMigrationDrift.js:526` | `migrationEconomicFeedbackScale` | `|| 2`, clamped 0-10 |
| `phase06-analysis/applyMigrationDrift.js:551` | `enableMigrationNeighborhoodEconomicFeedback` | enabled |
| `phase06-analysis/applyMigrationDrift.js:552` | `migrationNeighborhoodEconomicFeedbackMaxDelta` | `|| 2` |
| `phase06-analysis/applyMigrationDrift.js:553` | `migrationNeighborhoodEconomicFeedbackScale` | `|| 2` |
| `phase06-analysis/applyMigrationDrift.js:650` | `migrationBriefIncludeNeighborhoods` | true |
| `phase06-analysis/applyMigrationDrift.js:651` | `migrationBriefNeighborhoodCount` | `|| 3` |
| `phase06-analysis/applyMigrationDrift.js:655` | `migrationBriefIncludeEconDeltas` | true |
| `phase02-world-state/applyCityDynamics.js:867` | `cityCapacity` (an object; sub-values read with `safeNum_(capCfg.x, 1.0)` at :869-870) | a scalar-per-row tab cannot hold the object; it would be four to six rows if moved |

### 2.7 Four read patterns in use — each cut names the one it takes

| pattern | sites | on a missing or bad cell |
|---|---|---|
| **P1 throw naming the key** (the house pattern) | `bondEngine.js:275-290` loadBondDials_ / bondDial_; `generationalWealthEngine.js:1168-1169` applyOwnerDraw_; `migrationTrackingEngine.js:616-621` relocationCap_; `careJusticeService.js:182-188`; `applyBusinessDynamics.js` asserts every key (seed-list comment, `phase01-config/engine94SheetContract.js:50-52`) | the phase stops by name |
| **P2 log to Engine_Errors and use the seed value** | `utilities/compressLifeHistory.js:286-313` (dial tuning); `utilities/sportsWeekRecord.js:213-235` (franchise weights: absent key = in-code default, unusable = log + no drift), `:409-444`; `phase01-config/godWorldEngine2.js:231, :265` (fire guard: absent = 60) | the comment at `compressLifeHistory.js:286-290` says why: a throw in Phase 9 is swallowed by `safePhaseCall_` and the Cycle commits with the whole fold skipped |
| **P3 `cfgNum_` default + one-time warning** | 24 sites in 2.4; `phase04-events/generationalEventsEngine.js:1453-1457` (`illnessFallbackRate`, 0.05) | runs on the in-code number; the warning reaches the cycle digest |
| **P4 optional key, silent coded default** | 9 keys in 2.6; `phase04-events/chaosCarsEngine.js:1094-1095` (`chaosShipChancePerCycle`, default 0.18) | runs on the in-code number, nothing logged |

The two commits that started this work (21403b0b0, e788cafe7) use P1. A cut that lands in Phase 9 or later (`utilities/compressLifeHistory.js`, `phase09-digest`) cannot use P1 without the swallow problem above — flagged per cut.

## Cut A — reconcile what is already there

Smallest risk: no value is read differently. It settles what later cuts would otherwise build on.

| # | item | where | evidence |
|---|---|---|---|
| A1 | constant with no use outside its definition | `phase05-citizens/generationalWealthEngine.js:1057` | applyOwnerDraw_ reads the seeded `ownerDrawShare` instead (:1168); `HERITAGE_GAIN_SHARE` (:1058) is the live sibling |
| A2 | constants with no use outside their definition | `phase05-citizens/householdFormationEngine.js:106`, `phase05-citizens/householdFormationEngine.js:107` | `SOLO_INCOME_FLOOR` (:302) is the income bar the file reads for establishing a household |
| A3 | constants with no use outside their definition | `phase05-citizens/householdFormationEngine.js:127` (25), `phase05-citizens/householdFormationEngine.js:128` (45), `phase05-citizens/householdFormationEngine.js:129` (20), `phase05-citizens/householdFormationEngine.js:130` (45) | the live ones are `AGE_RANGES` WEDDING 24-58 (`generationalEventsEngine.js:80`) and BIRTH 26-40 (:81), builder-ruled (engine.302, engine.339). If revived these four would contradict them |
| A4 | table member read nowhere | `phase05-citizens/migrationTrackingEngine.js:125` | named in its own comment ("legacy floor — the share rule below replaces it") and in a test header comment, `scripts/migrationRelocation.test.js:20`; `relocationCap_` (:616) uses `relocationMaxShare` |
| A5 | constant with no use outside its definition | `phase06-analysis/prePublicationValidation.js:32` | `COVERAGE_IMBALANCE_THRESHOLD` (:31) is used |
| A6 | sheet rows no code reads | migrationRate, deathRate, growthRate, employmentStep, hospitalLoadPerSick, hospitalTalkbackGain, worldYearBase, bizVitalityNeutral | 2.5 |
| A7 | sheet row and code disagree | employmentFloor 0.85 live / 0.88 code and in the approved-plan comment; deathRate row 0.009 / code 0.008; growthRate row 0.012 / code 0.010 | 2.4, 2.5 |
| A8 | in-code copies of seeded keys | `phase04-events/chaosCarsEngine.js:1062`, `phase01-config/godWorldEngine2.js:231`, `utilities/sportsWeekRecord.js:374`, `utilities/sportsWeekRecord.js:426`, `utilities/sportsWeekRecord.js:215`, `utilities/compressLifeHistory.js:293`-297 | seeds `chaosShipChancePerCycle` 0.18, `fireGuardMinutes` 60, `sportsFadeRate` 0.85, `sportsStreakHeadline` 5, `franchiseWeight*`, `dial*`; each default is a second copy of a seeded number, read when the key is absent (patterns P2 / P4) |
| A9 | 24 `cfgNum_` in-code defaults | table in 2.4 | 2.4 — 11 keys need a seed list first (ENGINE102-style), then the default can go (P1) |
| A10 | one read pattern per phase | 2.7 | builder choice: P1 everywhere except Phase 9+, where P2 holds |

Candidates in Cut A: 10 items covering 9 dead constants / table members, 8 sheet rows with no reader, 3 value disagreements, 6 in-code copies of seeded keys and 24 `cfgNum_` sites.

## Cut B — citizen event volume

The named constants sit in `generateCitizensEvents_(ctx)` except the two flagged; B14 is one inline roll. Dials the builder named: `PARTICIPATION_BASE` and `ATMOSPHERIC_MAX_EVENTS` (the comment at `phase05-citizens/generateCitizensEvents.js:742` records a target of 6-8, "depending on what a cycle run can handle", and a conservative 4 until a perf gate passes; the code holds 4). The participation ladder is E1 below (29 literal adds, `:3329-3454`).

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| B1 | `phase05-citizens/generateCitizensEvents.js:740` | `PARTICIPATION_BASE` | `0.72` | chance an engine citizen lives a logged week, before dial / calendar adds (target band 60-80% coverage; comment: tuned via scripts/coverageReport.js) | yes (generateCitizensEvents_) | none |
| B2 | `phase05-citizens/generateCitizensEvents.js:741` | `PARTICIPATION_MAX` | `0.97` | upper bound on that chance (never guaranteed) | yes (generateCitizensEvents_) | none |
| B3 | `phase05-citizens/generateCitizensEvents.js:747` | `ATMOSPHERIC_MAX_EVENTS` | `4` | most lines one participating citizen emits in a Cycle (random 1..N); comment: target 6-8, code holds 4 until a perf gate | yes (generateCitizensEvents_) | none |
| B4 | `phase05-citizens/generateCitizensEvents.js:550` | `ANTI_INERT_N` | `3` | cycles dark before a citizen in the log is forced in | yes (generateCitizensEvents_) | code: scripts/coverageReport.js |
| B5 | `phase05-citizens/generateCitizensEvents.js:648` | `PUBLIC_FIGURE_FAME_MIN` | `8` | UsageCount at which a ledger citizen counts as a public figure for recognition lines | yes (generateCitizensEvents_) | none |
| B6 | `phase05-citizens/generateCitizensEvents.js:649` | `PUBLIC_FIGURE_CAP` | `15` | how many public figures the pass keeps (ledger order) | yes (generateCitizensEvents_) | none |
| B7 | `phase05-citizens/generateCitizensEvents.js:1024` | `TEMPLATE_COOLDOWN_CYCLES` | `3` | cycles a template rests after use (spam guard) | yes (generateCitizensEvents_) | none |
| B8 | `phase05-citizens/generateCitizensEvents.js:1491` | `CONTENT_DIAL_RAMP` | `10` | width (dial points) of the soft ramp on a content row dial term | yes (generateCitizensEvents_) | none |
| B9 | `phase05-citizens/generateCitizensEvents.js:3154` | `HH_QUIET_CHANCE` | `0.012` | weekly odds a household has a quiet shared moment (~1 in 80) | yes (generateCitizensEvents_) | none |
| B10 | `phase05-citizens/generateCitizensEvents.js:3155` | `HH_CRISIS_CHANCE` | `0.0025` | weekly odds a household has a crisis / celebration that ripples (~1 in 400) | yes (generateCitizensEvents_) | none |
| B11 | `phase05-citizens/generateCitizensEvents.js:2335` | `DOMAIN_MOMENT_MASS_LINES_` | `8` | line count a domain-moment source draws as, however many it holds | yes (generateCitizensEvents_) | tests: codedPoolDownSide.test.js |
| B12 | `phase05-citizens/generateCitizensEvents.js:273` | `SPOT_LINE_WEIGHT_` | `11` | weight of each spot fact (builder 2026-10-20: a holder draws its line about 1 Cycle in 10) | NO (citizenSpotLines_) | tests: testNeighborhoodLoop.js |
| B13 | `phase05-citizens/generateCitizensEvents.js:114` | `TRANSIT_COMMUTE_MASS` | `1.15` | draw mass of the transit commute pool against the rest | NO (transitCommuteMass_) | none |
| B14 | `phase05-citizens/generateCitizensEvents.js:1706` | `(inline)` | `roll() < 0.5` | chance a place line uses the citizen's own spot over a random one (inline) | yes (generateCitizensEvents_) | literal (no name) |
| B15 | `phase05-citizens/generateCitizensEvents.js:1438` | `CONTENT_ENTITY_SLOTS` | `{ VENUE: 1, INSTITUTION: 1, CONTACT: 1, PILOT: 1, PILOTROLE: 1, LEADER: 1, PROGRAM: 1, CONGR...` | slots per entity kind a content line may fill (table) | yes (generateCitizensEvents_) | none |

Candidates in Cut B: 15.

## Cut C — bond engine remainder

Rows are in source order within each group: `updateExistingBonds_(ctx)` adds and thresholds, `bondCompatibility_`, `detectNewBonds_` chances and birth intensities, then the named constants, then `seedRelationBondsv1.js`; every row has `ctx` except where flagged. The 17 numbers already on World_Config (`bondWeekly*`, `bondFade*`, `bondEncounterChance`, `bondDeepenAt`, `bondRomance*`, `bondMarriageAt`) are not listed. Same-line duplicates are separate rows because each is its own edit.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| C1 | `phase05-citizens/bondEngine.js:796` | `(inline)` | `rr < 0.02` | romance: the "week that changes everything" roll (2%) | yes (updateExistingBonds_) | literal (no name) |
| C2 | `phase05-citizens/bondEngine.js:796` | `(inline)` | `intensity += 1.0` | romance: size of that big week | yes (updateExistingBonds_) | literal (no name) |
| C3 | `phase05-citizens/bondEngine.js:797` | `(inline)` | `0.02 + stepP` | second copy of the 2% (the step window starts after it) | yes (updateExistingBonds_) | literal (no name) |
| C4 | `phase05-citizens/bondEngine.js:794` | `(inline)` | `Math.min(0.5` | ceiling on a romance step chance after the housing / tier boosts | yes (updateExistingBonds_) | literal (no name) |
| C5 | `phase05-citizens/bondEngine.js:810` | `(inline)` | `intensity += 0.5` | rival bond when last Cycle was high-signal | yes (updateExistingBonds_) | literal (no name) |
| C6 | `phase05-citizens/bondEngine.js:815` | `(inline)` | `intensity += 1` | rival bond when last Cycle had a shock | yes (updateExistingBonds_) | literal (no name) |
| C7 | `phase05-citizens/bondEngine.js:817` | `(inline)` | `rng() < 0.2` | alliance bond: chance a shock cracks it | yes (updateExistingBonds_) | literal (no name) |
| C8 | `phase05-citizens/bondEngine.js:817` | `(inline)` | `intensity -= 0.5` | alliance bond: size of that crack | yes (updateExistingBonds_) | literal (no name) |
| C9 | `phase05-citizens/bondEngine.js:825` | `(inline)` | `sentiment <= -0.3` | city sentiment bar that feeds tension bonds | yes (updateExistingBonds_) | literal (no name) |
| C10 | `phase05-citizens/bondEngine.js:826` | `(inline)` | `intensity += 0.3` | tension bond add on low sentiment | yes (updateExistingBonds_) | literal (no name) |
| C11 | `phase05-citizens/bondEngine.js:828` | `(inline)` | `sentiment >= 0.3` | city sentiment bar that feeds alliance bonds | yes (updateExistingBonds_) | literal (no name) |
| C12 | `phase05-citizens/bondEngine.js:829` | `(inline)` | `intensity += 0.2` | alliance bond add on high sentiment | yes (updateExistingBonds_) | literal (no name) |
| C13 | `phase05-citizens/bondEngine.js:838` | `(inline)` | `intensity += 0.5` | festival bond add on a holiday week | yes (updateExistingBonds_) | literal (no name) |
| C14 | `phase05-citizens/bondEngine.js:845` | `(inline)` | `intensity += 1.5` | sports-rival add at band top | yes (updateExistingBonds_) | literal (no name) |
| C15 | `phase05-citizens/bondEngine.js:847` | `(inline)` | `intensity += 1.0` | sports-rival add at band high | yes (updateExistingBonds_) | literal (no name) |
| C16 | `phase05-citizens/bondEngine.js:849` | `(inline)` | `intensity += 0.5` | sports-rival add at band elevated | yes (updateExistingBonds_) | literal (no name) |
| C17 | `phase05-citizens/bondEngine.js:856` | `(inline)` | `intensity += 0.5` | neighbor bond add on a family holiday | yes (updateExistingBonds_) | literal (no name) |
| C18 | `phase05-citizens/bondEngine.js:863` | `(inline)` | `intensity += 0.3` | professional bond add on First Friday | yes (updateExistingBonds_) | literal (no name) |
| C19 | `phase05-citizens/bondEngine.js:868` | `(inline)` | `intensity += 0.4` | neighbor / alliance bond add on Creation Day | yes (updateExistingBonds_) | literal (no name) |
| C20 | `phase05-citizens/bondEngine.js:878` | `(inline)` | `intensity += 0.5` | add when both ends share a story arc | yes (updateExistingBonds_) | literal (no name) |
| C21 | `phase05-citizens/bondEngine.js:880` | `(inline)` | `intensity += 0.5` | extra add when that arc is at peak | yes (updateExistingBonds_) | literal (no name) |
| C22 | `phase05-citizens/bondEngine.js:886` | `(inline)` | `intensity -= 0.1` | neighbor bond with no neighborhood fades | yes (updateExistingBonds_) | literal (no name) |
| C23 | `phase05-citizens/bondEngine.js:908` | `(inline)` | `intensity -= 0.3` | festival bond decay outside a holiday | yes (updateExistingBonds_) | literal (no name) |
| C24 | `phase05-citizens/bondEngine.js:913` | `(inline)` | `intensity -= 0.4` | sports-rival decay in the off-season | yes (updateExistingBonds_) | literal (no name) |
| C25 | `phase05-citizens/bondEngine.js:916` | `(inline)` | `intensity = 0` | bond intensity floor | yes (updateExistingBonds_) | literal (no name) |
| C26 | `phase05-citizens/bondEngine.js:917` | `(inline)` | `intensity > 10` | bond intensity ceiling (same 10 as compressLifeHistory.js BOND_INTENSITY_MAX) | yes (updateExistingBonds_) | literal (no name) |
| C27 | `phase05-citizens/bondEngine.js:921` | `(inline)` | `intensity <= 1` | active -> dormant at or below this | yes (updateExistingBonds_) | literal (no name) |
| C28 | `phase05-citizens/bondEngine.js:924` | `(inline)` | `intensity >= 3` | dormant -> active at or above this | yes (updateExistingBonds_) | literal (no name) |
| C29 | `phase05-citizens/bondEngine.js:930` | `(inline)` | `intensity >= 6` | tension -> rivalry at or above this (same 6 as seeded bondDeepenAt, a different rule) | yes (updateExistingBonds_) | literal (no name) |
| C30 | `phase05-citizens/bondEngine.js:933` | `(inline)` | `intensity <= 2 && bondAge > 3` | tension settles to professional at or below 2, after bond age 3 | yes (updateExistingBonds_) | literal (no name) |
| C31 | `phase05-citizens/bondEngine.js:950` | `(inline)` | `intensityDelta >= 2.0` | size of a move that stamps lastUpdate (ledger-bloat rule) | yes (updateExistingBonds_) | literal (no name) |
| C32 | `phase05-citizens/bondEngine.js:1277` | `(inline)` | `compat < 3` | like-at-all bar: below it a pair never bonds | yes (detectNewBonds_) | literal (no name) |
| C33 | `phase05-citizens/bondEngine.js:1278` | `(inline)` | `compat < 6` | friction-lane bar: 3-5 gets along (and breeds enemies), 6+ friendship lane | yes (detectNewBonds_) | literal (no name) |
| C34 | `phase05-citizens/bondEngine.js:994` | `(inline)` | `score += 3` | compat points: same neighborhood | yes (bondCompatibility_) | literal (no name) |
| C35 | `phase05-citizens/bondEngine.js:997` | `(inline)` | `score += 2` | compat points: same job family | yes (bondCompatibility_) | literal (no name) |
| C36 | `phase05-citizens/bondEngine.js:1001` | `(inline)` | `ageGap <= 10` | compat: age gap for +2 | yes (bondCompatibility_) | literal (no name) |
| C37 | `phase05-citizens/bondEngine.js:1002` | `(inline)` | `ageGap <= 20` | compat: age gap for +1 | yes (bondCompatibility_) | literal (no name) |
| C38 | `phase05-citizens/bondEngine.js:1006` | `(inline)` | `aA >= 23 && aA <= 64` | compat +1: both working age (23-64) or both 65+ | yes (bondCompatibility_) | literal (no name) |
| C39 | `phase05-citizens/bondEngine.js:1008` | `(inline)` | `score += 1` | compat +1: unknown ages | yes (bondCompatibility_) | literal (no name) |
| C40 | `phase05-citizens/bondEngine.js:1015` | `(inline)` | `(wf - 0.75) * 4` | compat: warmth factor mapped to 0-2 points | yes (bondCompatibility_) | literal (no name) |
| C41 | `phase05-citizens/bondEngine.js:1038` | `(inline)` | `gap <= 1` | spouse quality: WealthLevel gap for +2 | NO (bondWealthTerm_(wlA,wlB)) | literal (no name) |
| C42 | `phase05-citizens/bondEngine.js:1039` | `(inline)` | `gap <= 3` | spouse quality: WealthLevel gap for +1 | NO (bondWealthTerm_(wlA,wlB)) | literal (no name) |
| C43 | `phase05-citizens/bondEngine.js:1040` | `(inline)` | `gap >= 6` | spouse quality: WealthLevel gap that costs a point | NO (bondWealthTerm_(wlA,wlB)) | literal (no name) |
| C44 | `phase05-citizens/bondEngine.js:1301` | `(inline)` | `rng() < 0.4` | festival-zone encounter bond chance | yes (detectNewBonds_) | literal (no name) |
| C45 | `phase05-citizens/bondEngine.js:1326` | `(inline)` | `rng() < 0.3 *` | sports-zone rival bond chance (x sports intensity) | yes (detectNewBonds_) | literal (no name) |
| C46 | `phase05-citizens/bondEngine.js:1348` | `(inline)` | `rng() < 0.35` | arts-district First Friday professional bond chance | yes (detectNewBonds_) | literal (no name) |
| C47 | `phase05-citizens/bondEngine.js:1367` | `(inline)` | `rng() < 0.35` | Creation Day alliance bond chance | yes (detectNewBonds_) | literal (no name) |
| C48 | `phase05-citizens/bondEngine.js:1387` | `(inline)` | `rng() < 0.35` | holiday gathering neighbor bond chance | yes (detectNewBonds_) | literal (no name) |
| C49 | `phase05-citizens/bondEngine.js:1433` | `(inline)` | `rng() < 0.15` | friction-lane tension bond chance | yes (detectNewBonds_) | literal (no name) |
| C50 | `phase05-citizens/bondEngine.js:1452` | `(inline)` | `(frictionLane ? 0.2 : 0.3)` | neighbor bond chance, same / adjacent hood (friction 0.2, else 0.3) | yes (detectNewBonds_) | literal (no name) |
| C51 | `phase05-citizens/bondEngine.js:1469` | `(inline)` | `rng() < 0.2` | job-family friendship bond chance | yes (detectNewBonds_) | literal (no name) |
| C52 | `phase05-citizens/bondEngine.js:1486` | `(inline)` | `rng() < 0.25` | shared-domain professional bond chance | yes (detectNewBonds_) | literal (no name) |
| C53 | `phase05-citizens/bondEngine.js:1527` | `(inline)` | `rng() < 0.15` | mentorship bond chance (tier gap 2+) | yes (detectNewBonds_) | literal (no name) |
| C54 | `phase05-citizens/bondEngine.js:1549` | `(inline)` | `(frictionLane ? 0.2 : 0.3)` | random-encounter neighbor bond chance | yes (detectNewBonds_) | literal (no name) |
| C55 | `phase05-citizens/bondEngine.js:2748` | `(inline)` | `rng() >= 0.20` | GC courtship pass: share of eligible pairs that act this Cycle | yes (processGCCourtship_) | literal (no name) |
| C56 | `phase05-citizens/bondEngine.js:1308` | `makeBond_ intensity arg` | `4,` | starting intensity of a new festival encounter bond (makeBond_ call at 1302) | yes (detectNewBonds_) | literal (no name) |
| C57 | `phase05-citizens/bondEngine.js:1333` | `makeBond_ intensity arg` | `5,` | starting intensity of a new sports rival bond (makeBond_ call at 1327) | yes (detectNewBonds_) | literal (no name) |
| C58 | `phase05-citizens/bondEngine.js:1355` | `makeBond_ intensity arg` | `4,` | starting intensity of a new First Friday professional bond (makeBond_ call at 1349) | yes (detectNewBonds_) | literal (no name) |
| C59 | `phase05-citizens/bondEngine.js:1374` | `makeBond_ intensity arg` | `4,` | starting intensity of a new Creation Day alliance bond (makeBond_ call at 1368) | yes (detectNewBonds_) | literal (no name) |
| C60 | `phase05-citizens/bondEngine.js:1394` | `makeBond_ intensity arg` | `4,` | starting intensity of a new holiday-gathering neighbor bond (makeBond_ call at 1388) | yes (detectNewBonds_) | literal (no name) |
| C61 | `phase05-citizens/bondEngine.js:1416` | `makeBond_ intensity arg` | `4,` | starting intensity of a new career-overlap tension bond (makeBond_ call at 1410) | yes (detectNewBonds_) | literal (no name) |
| C62 | `phase05-citizens/bondEngine.js:1440` | `makeBond_ intensity arg` | `4,` | starting intensity of a new neighborhood tension bond (makeBond_ call at 1434) | yes (detectNewBonds_) | literal (no name) |
| C63 | `phase05-citizens/bondEngine.js:1459` | `makeBond_ intensity arg` | `3,` | starting intensity of a new neighbor bond (makeBond_ call at 1453) | yes (detectNewBonds_) | literal (no name) |
| C64 | `phase05-citizens/bondEngine.js:1476` | `makeBond_ intensity arg` | `3,` | starting intensity of a new job-family friendship bond (makeBond_ call at 1470) | yes (detectNewBonds_) | literal (no name) |
| C65 | `phase05-citizens/bondEngine.js:1493` | `makeBond_ intensity arg` | `3,` | starting intensity of a new shared-domain professional bond (makeBond_ call at 1487) | yes (detectNewBonds_) | literal (no name) |
| C66 | `phase05-citizens/bondEngine.js:1514` | `makeBond_ intensity arg` | `5,` | starting intensity of a new arc-proximity bond (makeBond_ call at 1508) | yes (detectNewBonds_) | literal (no name) |
| C67 | `phase05-citizens/bondEngine.js:1536` | `makeBond_ intensity arg` | `4,` | starting intensity of a new mentorship bond (makeBond_ call at 1530) | yes (detectNewBonds_) | literal (no name) |
| C68 | `phase05-citizens/bondEngine.js:1556` | `makeBond_ intensity arg` | `3,` | starting intensity of a new random-encounter neighbor bond (makeBond_ call at 1550) | yes (detectNewBonds_) | literal (no name) |
| C69 | `phase05-citizens/bondEngine.js:1066` | `FAITH_JOIN_CHANCE` | `0.08` | roll per faith exposure that a citizen joins a congregation | yes (processFaithJoins_) | none |
| C70 | `phase05-citizens/bondEngine.js:1067` | `FAITH_DRIFT_CHANCE` | `0.003` | roll that a member drifts away | yes (processFaithJoins_) | none |
| C71 | `phase05-citizens/bondEngine.js:1974` | `HOME_OWNED_COURTSHIP_BOOST` | `2.0` | romance step chance multiplier when a partner owns a home | NO (courtshipHousingBoost_) | tests: householdReconcile.test.js |
| C72 | `phase05-citizens/bondEngine.js:1975` | `HOUSEHOLD_COURTSHIP_BOOST` | `1.5` | romance step chance multiplier when a partner holds a household | NO (courtshipHousingBoost_) | tests: householdReconcile.test.js |
| C73 | `phase05-citizens/bondEngine.js:1978` | `TRIANGLE_BIRTH_INTENSITY` | `5` | starting intensity of a rivalry born from a shared love | yes (detectTriangleRivalries_) | none |
| C74 | `phase05-citizens/bondEngine.js:1979` | `CONFRONT_ADAPT` | `6` | cycles a feud rests after a confrontation | yes (checkConfrontationTriggers_) | none |
| C75 | `phase05-citizens/bondEngine.js:1984` | `GC_MARRY_CHANCE` | `0.02` | base weekly odds in the generic-citizen marriage lottery | yes (processGCMarriageLottery_) | none |
| C76 | `phase05-citizens/bondEngine.js:1985` | `GC_POOL_REF` | `60` | scarcity denominator in that lottery | yes (processGCMarriageLottery_) | none |
| C77 | `phase05-citizens/bondEngine.js:1986` | `GC_SPOUSE_INCOME` | `48000` | income priced to an off-camera spouse | yes (processGCCourtship_, processGCMarriageLottery_) | code: phase05-citizens/householdFormationEngine.js |
| C78 | `phase05-citizens/seedRelationBondsv1.js:227` | `(inline)` | `rng() > 0.20` | seed bonds: share of pairs that bond (first pass) | yes (seedRelationshipBonds_) | literal (no name) |
| C79 | `phase05-citizens/seedRelationBondsv1.js:229` | `(inline)` | `rng() < 0.7` | seed bonds: friendship vs professional split | yes (seedRelationshipBonds_) | literal (no name) |
| C80 | `phase05-citizens/seedRelationBondsv1.js:278` | `(inline)` | `rng() > 0.15` | seed bonds: share of pairs that bond (second pass) | yes (seedRelationshipBonds_) | literal (no name) |
| C81 | `phase05-citizens/seedRelationBondsv1.js:280` | `(inline)` | `rng() < 0.6` | seed bonds: professional vs friendship split | yes (seedRelationshipBonds_) | literal (no name) |
| C82 | `phase05-citizens/seedRelationBondsv1.js:321` | `(inline)` | `typeRoll < 0.4` | seed bonds: friendship edge | yes (seedRelationshipBonds_) | literal (no name) |
| C83 | `phase05-citizens/seedRelationBondsv1.js:322` | `(inline)` | `typeRoll < 0.7` | seed bonds: professional edge | yes (seedRelationshipBonds_) | literal (no name) |
| C84 | `phase05-citizens/seedRelationBondsv1.js:323` | `(inline)` | `typeRoll < 0.85` | seed bonds: alliance edge | yes (seedRelationshipBonds_) | literal (no name) |

Candidates in Cut C: 84.

## Cut E — per-citizen drift ladders

The older v2.x engines each build a per-citizen `chance` from a base (0.02 in five of them) plus conditional adds — weather impact, season, sentiment, econ mood, chaos, holiday, First Friday, Creation Day, culture and engagement indexes — then multiply by a dial band and cap. All inside `run*Engine_(ctx)` / `generate*(ctx)`: `ctx` is in scope. 13 ladders, 205 literal adds in total. Raw lines are in appendix E.

| # | ladder (file:range) | controls | base line | adds (+= / -= literal) | cap / threshold line | scaling lines (*=) | ctx |
|---|---|---|---|---|---|---|---|
| E1 | `phase05-citizens/generateCitizensEvents.js:3329-3454` | participation chance per engine citizen (cut B; cap is PARTICIPATION_MAX, B2) | L3329 `var chance = PARTICIPATION_BASE;` | 29 | - | 5 (L3387, L3397, L3440, L3445, L3454) | yes (generateCitizensEvents_) |
| E2 | `phase05-citizens/runCareerEngine.js:1547-1604` | career drift-texture chance | L1547 `var chance = 0.02;` | 17 | L1604 `if (chance > 0.14) chance = 0.14;` | 1 (L1601) | yes (runCareerEngine_) |
| E3 | `phase05-citizens/runEducationEngine.js:494-539` | education drift chance | L494 `var chance = 0.02;` | 16 | L539 `if (chance > 0.12) chance = 0.12;` | 1 (L537) | yes (runEducationEngine_) |
| E4 | `phase05-citizens/runHouseholdEngine.js:608-654` | household drift chance | L608 `var chance = 0.02;` | 15 | L654 `if (chance > 0.12) chance = 0.12;` | 1 (L651) | yes (runHouseholdEngine_) |
| E5 | `phase05-citizens/runNeighborhoodEngine.js:543-603` | neighborhood (out-and-about) drift chance | L543 `var driftChance = 0.02;` | 21 | L603 `if (driftChance > 0.12) driftChance = 0.12;` | 1 (L600) | yes (runNeighborhoodEngine_) |
| E6 | `phase05-citizens/runRelationshipEngine.js:442-541` | relationship drift chance | L442 `var driftChance = 0.02; // base chance` | 21 | L541 `if (driftChance > 0.15) driftChance = 0.15;` | 5 (L489, L515, L521, L527, L538) | yes (runRelationshipEngine_) |
| E7 | `phase05-citizens/runAsUniversePipeline.js:580-614` | AsUniverse pipeline chance | L580 `var chance = 0.02;` | 14 | L614 `if (chance > 0.10) chance = 0.10;` | - | yes (runAsUniversePipeline_) |
| E8 | `phase05-citizens/checkForPromotions.js:188-292` | promotion chance modifier (base 0.20 passed at :324) | L189 `var c = base;` | 21 | L291 `if (c > 0.45) c = 0.45;`; L292 `if (c < 0.05) c = 0.05;` | - | yes (checkForPromotions_) |
| E9 | `phase05-citizens/generateCivicModeEvents.js:413-436` | civic-figure event chance | L413 `var chance = 0.15;` | 9 | L436 `if (chance > 0.40) chance = 0.40;` | 1 (L433) | yes (generateCivicModeEvents_) |
| E10 | `phase05-citizens/generateMediaModeEvents.js:362-387` | journalist event chance | L362 `var chance = 0.20;` | 9 | L387 `if (chance > 0.45) chance = 0.45;` | 1 (L384) | yes (generateMediaModeEvents_) |
| E11 | `phase05-citizens/runConductEngine.js:202-215` | moral-test chance | L202 `var chance = 0.012;` | 0 | L215 `if (chance > 0.03) chance = 0.03;` | 3 (L206, L207, L212) | yes (runConductEngine_) |
| E12 | `phase05-citizens/generateGenericCitizens.js:307-363` | generic-citizen count rolls (each adds 1 to baseCount) | - | 11 | - | - | yes (generateGenericCitizens_) |
| E13 | `phase05-citizens/applyNamedCitizenSpotlight.js:256-446` | spotlight scoring and threshold | L434 `var baseThreshold = 6;` | 22 | L434 `var baseThreshold = 6;`; L437 `if (chaos.length > 0) baseThreshold -= 1;` (+5 more threshold lines) | - | yes (applyNamedCitizenSpotlights_) |

Per-engine citizen limits (the per-cycle cap on how many citizens a drift engine touches):

| # | file:line | value | ctx |
|---|---|---|---|
| E14 | `phase05-citizens/runCareerEngine.js:1036` | `var LIMIT = 10;` | yes (runCareerEngine_) |
| E15 | `phase05-citizens/runEducationEngine.js:301` | `var LIMIT = 10;` | yes (runEducationEngine_) |
| E16 | `phase05-citizens/runHouseholdEngine.js:289` | `var LIMIT = 6;` | yes (runHouseholdEngine_) |
| E17 | `phase05-citizens/runRelationshipEngine.js:188` | `var LIMIT = 8;` | yes (runRelationshipEngine_) |
| E18 | `phase05-citizens/runConductEngine.js:92` | `var LIMIT = 3; // resolved moral tests per cycle (committed OR resisted)` | yes (runConductEngine_) |

Pool-pick rolls in `runRelationshipEngine.js` (a bond kind adds its event pool to the draw):

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| E19 | `phase05-citizens/runRelationshipEngine.js:553` | `(inline)` | `rng() < 0.35` | relationship drift: a rivalry bond adds its event pool | yes (runRelationshipEngine_) | literal (no name) |
| E20 | `phase05-citizens/runRelationshipEngine.js:556` | `(inline)` | `rng() < 0.35` | relationship drift: an alliance bond adds its event pool | yes (runRelationshipEngine_) | literal (no name) |
| E21 | `phase05-citizens/runRelationshipEngine.js:559` | `(inline)` | `rng() < 0.30` | relationship drift: a mentorship bond adds its event pool | yes (runRelationshipEngine_) | literal (no name) |
| E22 | `phase05-citizens/runRelationshipEngine.js:564` | `(inline)` | `rng() < 0.4` | relationship drift: an active arc adds its event pool | yes (runRelationshipEngine_) | literal (no name) |

Open question for the builder, not decided here: 205 adds is a lot of rows. Prefix families already exist as a shape (`bizVol_*`, `bizHoodWeight_*`, `civicBuildCycles_*`, :71-80, :95-112, :202-206 of the contract).

Candidates in Cut E: 13 ladders + 5 limits + 4 pool-pick rolls (205 literal adds).

## Cut F — life-event base rates (`generationalEventsEngine.js`, phase 4)

The base weekly odds of graduation, wedding, birth, promotion, retirement, death and a health event, each with a stack of month / season / holiday / age multipliers (appendix F). `AGE_RANGES` carries builder rulings in its comments (wedding to 58 "Expand to 58", birth to 40 "no one over 40", spouse floor 21 "no one under 21") — a move keeps the quote with the row.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| F1 | `phase04-events/generationalEventsEngine.js:78` | `AGE_RANGES` | `{ GRADUATION: { min: 22, max: 28 }, WEDDING: { min: 24, max: 58 }, BIRTH: { min: 26, max: 40...` | age windows of graduation, wedding (24-58), birth (26-40), promotion, retirement, death (table; builder-ruled edges) | yes (runGenerationalEngine_, checkGraduation_, checkWedding_, checkBirth_, checkPromotion_, checkRetirement_, processRomanceAndMarriage_ [bondEngine.js], processGCCourtship_ [bondEngine.js], processGCMarriageLottery_ [bondEngine.js]) | tests: engine339Births.test.js; code: phase05-citizens/bondEngine.js |
| F2 | `phase04-events/generationalEventsEngine.js:87` | `BIRTH_COPARENT_MIN_AGE` | `21` | spouse floor for a birth (builder 2026-11-20: no one under 21) | yes (runGenerationalEngine_) | none |
| F3 | `phase04-events/generationalEventsEngine.js:1054` | `HOUSEHOLD_MARRIAGE_BOOST` | `1.5` | wedding chance multiplier when a household exists | yes (checkWedding_) | none |
| F4 | `phase04-events/generationalEventsEngine.js:106` | `HEALTH_TRANSITIONS` | `{ hospitalized: { short: { recovering: 0.40, critical: 0.10, stay: 0.50 }, medium: { recover...` | per-status, per-duration odds of recovering / worsening / staying (table) | yes (processHealthLifecycle_) | none |
| F5 | `phase04-events/generationalEventsEngine.js:604` | `(inline)` | `var smChance = 0.0005` | base weekly odds of a solo / small-moment event | yes (runGenerationalEngine_) | literal (no name) |
| F6 | `phase04-events/generationalEventsEngine.js:1455` | `(inline)` | `illnessFallbackRate = 0.05` | city illness rate used when neither hood nor city rate exists (loud fallback; the row illnessFallbackRate is live) | yes (checkHealthEvent_) | literal (no name) |
| F7 | `phase04-events/generationalEventsEngine.js:1029` | `(inline)` | `var c = 0.005` | graduation: base weekly odds (checkGraduation_; 0.01 at tier >= 3, +0.005 at 24-26, x3 spring, x2 May / June) | yes (checkGraduation_) | literal (no name) |
| F8 | `phase04-events/generationalEventsEngine.js:1060` | `(inline)` | `var c = 0.002` | wedding: base weekly odds (checkWedding_; 0.004 at 28-35, 0.001 over 40, x3 June, x2.5 Valentine, +0.01 romantic bond) | yes (checkWedding_) | literal (no name) |
| F9 | `phase04-events/generationalEventsEngine.js:1126` | `(inline)` | `var c = 0.003 - (childCount * 0.001)` | birth: base weekly odds (checkBirth_; +0.002 at 28-35, -0.001 over 38, floor 0.0005, x2 Sept) | yes (checkBirth_) | literal (no name) |
| F10 | `phase04-events/generationalEventsEngine.js:1350` | `(inline)` | `var c = 0.002` | promotion: base weekly odds (checkPromotion_; 0.003 tier 3, 0.004 tier 4, 0.001 tier <= 2) | yes (checkPromotion_) | literal (no name) |
| F11 | `phase04-events/generationalEventsEngine.js:1382` | `(inline)` | `var c = 0.02` | retirement: base weekly odds (checkRetirement_; 0.05 from 70, x0.5 tier >= 4, x2 Dec) | yes (checkRetirement_) | literal (no name) |
| F12 | `phase04-events/generationalEventsEngine.js:1401` | `(inline)` | `var c = 0.0001` | death: base weekly odds (checkDeath_; 0.001 / 0.005 / 0.01 / 0.02 / 0.05 at 65 / 75 / 80 / 85 / 90) | yes (checkDeath_) | literal (no name) |
| F13 | `phase04-events/generationalEventsEngine.js:1413` | `(inline)` | `chance_(ctx, 0.0002)` | death: odds of a rare shock override (c = 0.01) | yes (checkDeath_) | literal (no name) |
| F14 | `phase04-events/generationalEventsEngine.js:1430` | `(inline)` | `var c = 0.0005` | health event: base weekly odds (checkHealthEvent_; 0.001 / 0.002 / 0.003 at 50 / 60 / 70) | yes (checkHealthEvent_) | literal (no name) |

Candidates in Cut F: 14.

## Cut J — youth (`runYouthEngine.js`)

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| J1 | `phase05-citizens/runYouthEngine.js:40` | `YOUTH_EVENT_LIMITS` | `{ MAX_EVENTS_PER_CYCLE: 25, MAX_EVENTS_PER_NEIGHBORHOOD: 5, MIN_AGE: 5, MAX_AGE: 22 }` | per-cycle and per-hood event caps and age window (table) | mixed: runYouthEngine_ yes; getGenericYouth_ no; getNamedYouth_ yes | none |
| J2 | `phase05-citizens/runYouthEngine.js:48` | `YOUTH_EVENT_PROBS` | `{ elementary: 0.15, middle: 0.2, high: 0.25, college: 0.15 }` | event odds by school level (table) | yes (runYouthEngine_) | none |
| J3 | `phase05-citizens/runYouthEngine.js:113` | `YOUTH_TEXTURE_BASE` | `0.65` | weekly texture odds per minor 5-17 (adult decks 0.72) | yes (runYouthEngine_) | none |
| J4 | `phase05-citizens/runYouthEngine.js:114` | `YOUTH_TEXTURE_MAX` | `0.95` | ceiling on that odds | yes (runYouthEngine_) | none |
| J5 | `phase05-citizens/runYouthEngine.js:120` | `YOUTH_TYPE_WEIGHTS` | `{ child: { academic: 0.30, sports: 0.22, arts: 0.18, clubs: 0.14, civic_participation: 0.08,...` | mix of youth event types by stage (table) | NO (selectYouthEventType_) | none |
| J6 | `phase05-citizens/runYouthEngine.js:326` | `(inline)` | `r < 0.15` | outcome mix: recognized | NO (generateYouthOutcome_(eventType,rng)) | literal (no name) |
| J7 | `phase05-citizens/runYouthEngine.js:327` | `(inline)` | `r < 0.30` | outcome mix: completed | NO (generateYouthOutcome_(eventType,rng)) | literal (no name) |
| J8 | `phase05-citizens/runYouthEngine.js:525` | `(inline)` | `tQoL <= 0.35 && rng() < 0.2` | low-QoL hood: chance of a resilience / support event | yes (runYouthEngine_) | literal (no name) |
| J9 | `phase05-citizens/runYouthEngine.js:526` | `(inline)` | `rng() < 0.1` | hotspot hood: chance of a safety event | yes (runYouthEngine_) | literal (no name) |
| J10 | `phase05-citizens/runYouthEngine.js:530` | `(inline)` | `rng() < 0.2` | chance a line names a local program | yes (runYouthEngine_) | literal (no name) |
| J11 | `phase05-citizens/runYouthEngine.js:773` | `(inline)` | `qolContext.qol <= 0.35 && rng() < 0.25` | low-QoL stress-type event chance | NO (generateYouthEventForCitizen_(youth,month,rng,qolContext,programsByHood)) | literal (no name) |
| J12 | `phase05-citizens/runYouthEngine.js:777` | `(inline)` | `rng() < 0.15` | hotspot safety-event chance | NO (generateYouthEventForCitizen_(youth,month,rng,qolContext,programsByHood)) | literal (no name) |
| J13 | `phase05-citizens/runYouthEngine.js:805` | `(inline)` | `rng() < 0.25` | chance an event names a local program | NO (generateYouthEventForCitizen_(youth,month,rng,qolContext,programsByHood)) | literal (no name) |
| J14 | `phase05-citizens/runYouthEngine.js:861` | `(inline)` | `rng() < 0.8` | graduation: chance a school-wide event fires | yes (generateSchoolWideEvents_) | literal (no name) |
| J15 | `phase05-citizens/runYouthEngine.js:864` | `(inline)` | `rng() < 0.5` | graduation: chance each high school holds one | yes (generateSchoolWideEvents_) | literal (no name) |
| J16 | `phase05-citizens/runYouthEngine.js:881` | `(inline)` | `rng() < 0.6` | fall start: chance of a sports kickoff event | yes (generateSchoolWideEvents_) | literal (no name) |
| J17 | `phase05-citizens/runYouthEngine.js:896` | `(inline)` | `rng() < 0.7` | fall: chance of a homecoming event | yes (generateSchoolWideEvents_) | literal (no name) |

Candidates in Cut J: 17.

## Cut H — careers, education, advancement

`TIER_BAR` (`phase05-citizens/processAdvancementIntake.js:1419`) is the media tier bar: 9 / 6 / 3 for tiers 1 / 2 / 3 (the demotion comment above it reads "T1:9 / T2:6 / T3:3"). Builder 2026-10-18, from the memory note `feedback_tier-bars-stay-dont-ask`: "the tier bars can stay for now, stop asking me that every session, we need to see how they hold up when this actually works." Listing the bars here as a dial is not asking; a move would copy the values unchanged.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| H1 | `phase05-citizens/runCareerEngine.js:135` | `RARE_EVENT_SCALE` | `0.1` | scale on rare employer-success events (engine.135 doctrine point 21) | yes (applyEmployerSuccess_) | tests: employerSuccess.test.js |
| H2 | `phase05-citizens/runCareerEngine.js:216` | `RETRENCH_WINDOW` | `13` | cycles a retrench stays remembered after a field change | yes (noteRetrenchAfterFieldChange_) | none |
| H3 | `phase05-citizens/runCareerEngine.js:1538` | `(inline)` | `0.01 + (roll() * 0.02)` | weekly skill XP base | yes (runCareerEngine_) | literal (no name) |
| H4 | `phase05-citizens/runCareerEngine.js:1616` | `(inline)` | `chanceHit(0.25)` | chance a career line draws from the training pool | yes (runCareerEngine_) | literal (no name) |
| H5 | `phase05-citizens/educationCareerEngine.js:155` | `ADVANCEMENT_CYCLES` | `{ ENTRY_TO_MID: 10, MID_TO_SENIOR: 20, STAGNATION: 40 }` | cycles to advance entry->mid, mid->senior, and stagnation (table) | yes (updateCareerProgression_, detectCareerMobility_) | none |
| H6 | `phase05-citizens/educationCareerEngine.js:946` | `SETTLE_SOURCE_WEIGHT` | `3` | equal pull of each source in field settling | NO (settleField_) | none |
| H7 | `phase05-citizens/educationCareerEngine.js:295` | `(inline)` | `rng() < 0.8` | seed mix: share given a diploma (the rest dropout) | yes (deriveEducationLevels_) | literal (no name) |
| H8 | `phase05-citizens/educationCareerEngine.js:302` | `(inline)` | `eduRoll < 0.05` | seed mix: dropout edge | yes (deriveEducationLevels_) | literal (no name) |
| H9 | `phase05-citizens/educationCareerEngine.js:303` | `(inline)` | `eduRoll < 0.15` | seed mix: some-college edge | yes (deriveEducationLevels_) | literal (no name) |
| H10 | `phase05-citizens/educationCareerEngine.js:627` | `(inline)` | `rng() < 0.005` | weekly chance for a tracked stagnant citizen | yes (detectCareerMobility_) | literal (no name) |
| H11 | `phase05-citizens/educationCareerEngine.js:1215` | `(inline)` | `rng() < 0.15` | chance a rough-band row reads as dropout | yes (settleAdulthood_) | literal (no name) |
| H12 | `phase05-citizens/educationCareerEngine.js:514` | `(inline)` | `yearsInCareer += 0.5` | years of career a Cycle adds | yes (updateCareerProgression_) | literal (no name) |
| H13 | `phase05-citizens/processAdvancementIntake.js:296` | `SPORTS_BASE_SALARY` | `100000` | base salary for a sports-career row | yes (processAdvancementRowsBody_) | none |
| H14 | `phase05-citizens/processAdvancementIntake.js:1418` | `ATTENTION_QUIET_CYCLES` | `10` | quiet cycles before media attention decays (cf. CULTURAL_FAME_QUIET_CYCLES) | yes (decayMediaAttention_) | none |
| H15 | `phase05-citizens/processAdvancementIntake.js:1419` | `TIER_BAR` | `{ 1: 9, 2: 6, 3: 3 }` | media worth bar per tier 1/2/3 = 9/6/3 (builder holds 3/6/9; memory: do not raise as a question) | mixed: tierForEarnedUsage_ no; applyTierLadderState_ yes; decayMediaAttention_ yes | tests: tierLadderState.test.js; code: phase05-citizens/runCareerEngine.js |
| H16 | `phase05-citizens/processAdvancementIntake.js:1429` | `TIER_PAY` | `{ 1: 1.50, 2: 1.30, 3: 1.15, 4: 1.00 }` | pay multiplier per tier | NO (tierPayFactor_) | tests: tierLadderState.test.js |
| H17 | `phase05-citizens/processAdvancementIntake.js:1469` | `FAME_USAGE_BAR` | `25` | UsageCount that counts as fame (cf. CULTURAL_FAME_BAR) | yes (ensureFamousOnCulturalLedger_, applyTierLadderState_) | tests: tierLadderState.test.js |
| H18 | `phase05-citizens/processAdvancementIntake.js:1519` | `MEDIA_PUBLISHED_WORTH` | `2` | media worth of a landed + published piece | yes (applyTierLadderState_) | none |
| H19 | `phase05-citizens/processAdvancementIntake.js:1782` | `GC_EMERGENCE_PROMOTION_THRESHOLD` | `3` | EmergenceCount that promotes a generic citizen | yes (checkEmergencePromotions_, checkFamilyMatchPromotions_) | none |
| H20 | `phase05-citizens/processAdvancementIntake.js:1792` | `DRIP_CAP_PER_CYCLE` | `2` | family-match promotions per cycle | yes (processAdvancementIntake_) | tests: ownerDoor.test.js |
| H21 | `phase05-citizens/processAdvancementIntake.js:1793` | `DRIP_SPOUSE_AGE_BAND` | `10` | birth-year gap allowed between a candidate and a partner | yes (checkFamilyMatchPromotions_) | none |
| H22 | `phase05-citizens/processAdvancementIntake.js:1796` | `DRIP_PARENT_AGE_MIN` | `21` | parent age floor when a family row is minted (builder 21 floor, cf. BIRTH_COPARENT_MIN_AGE) | mixed: mintFamilyGcRow_ no; wireFamilyMatch_ yes; wireFamilyToDeceased_ yes | none |
| H23 | `phase05-citizens/processAdvancementIntake.js:1797` | `DRIP_PARENT_AGE_MAX` | `40` | parent age ceiling when a family row is minted | NO (mintFamilyGcRow_) | none |
| H24 | `phase05-citizens/processAdvancementIntake.js:2371` | `(inline)` | `rng() < 0.5` | sex drawn for a minted citizen when none is asked (female / male) | NO (mintFamilyGcRow_(gData,c,type,wantSex,hood,taken,rowByPop,L,simYear,cycle,rng)) | literal (no name) |
| H25 | `phase05-citizens/processAdvancementIntake.js:2776` | `(inline)` | `rng() < 0.5` | sex drawn for a minted citizen (male / female) | yes (checkBusinessOwnerPromotions_) | literal (no name) |
| H26 | `phase05-citizens/processAdvancementIntake.js:2251` | `FAMILY_LOTTERY_TIER_WEIGHT` | `{ 1: 10, 2: 5, 3: 2, 4: 1 }` | family lottery weight per tier (builder 2026-10-19 statement 8) | yes (checkFamilyMatchPromotions_) | none |

Candidates in Cut H: 26.

## Cut K — civic, approval, conduct, initiative votes; the rest at declaration depth

The first table is rows I opened (civic and conduct engines, vote odds, name caps). The second is every other numeric module constant in phase01-04 and 06-10 and `utilities/` not already above, at **declaration depth**: the "controls" cell is the line's own trailing comment, or "(name only; body not read)". Excluded as structural without listing: version / schema stamps, column indexes, cell-size chunking, dashboard font sizes, archive trim windows (`ARCHIVE_RETAIN_CYCLES`, `CYCLE_TRIGGER_ROWS`, `CYCLE_RETAIN_CYCLES`, `LIFE_STAMP_TAIL_ROWS`), snapshot caps (`SNAPSHOT_*_CAP`), ripple caps (`RIPPLE_*_CAP`), `CHECKPOINT_*`, `TRANSIT_BASE_VERSION`.

### Cut K, rows I opened

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| K1 | `phase05-citizens/updateCivicApprovalRatings.js:1296` | `CHALLENGER_NAMED_BELOW_` | `40` | approval under which a challenger is named (shouldStartCampaign_) | mixed: updateCivicApprovalRatings_ yes; shouldStartCampaign_ no | tests: civicApprovalCeiling.test.js |
| K2 | `phase05-citizens/updateCivicApprovalRatings.js:1297` | `SEAT_LOST_BELOW_` | `30` | approval under which the seat is lost (shouldLeaveOffice_) | mixed: updateCivicApprovalRatings_ yes; shouldLeaveOffice_ no | tests: civicApprovalCeiling.test.js |
| K3 | `phase05-citizens/runCivicRoleEngine.js:50` | `CIVIC_ROLE_AURA_BASE_` | `1.2` | civic role aura base (aura sizes life events, fire chance is flat) | NO (civicRoleAura_) | none |
| K4 | `phase05-citizens/runCivicRoleEngine.js:51` | `CIVIC_ROLE_AURA_APPROVAL_` | `0.8` | aura added per approval / 100 | NO (civicRoleAura_) | none |
| K5 | `phase05-citizens/runCivicRoleEngine.js:52` | `CIVIC_ROLE_AURA_TIER_` | `{ 1: 0.6, 2: 0.4, 3: 0.2, 4: 0 }` | aura added by tier 1-4 (table) | mixed: civicRoleAura_ no; runCivicRoleEngine_ yes | none |
| K6 | `phase05-citizens/runCivicRoleEngine.js:53` | `CIVIC_ROLE_AURA_FAMOUS_` | `0.5` | aura added for a famous holder | NO (civicRoleAura_) | none |
| K7 | `phase05-citizens/civicInitiativeEngine.js:3270` | `ENGINE_CLOCK_GRACE_` | `3` | cycles of grace in the engine-clock hold | mixed: applyEngineClockHold_ yes; engineClockHold_ no | tests: civicApprovalCeiling.test.js |
| K8 | `phase05-citizens/civicInitiativeEngine.js:1329` | `(inline)` | `0.5 + (sentiment * 0.15)` | unnamed council voter yes odds: toss-up plus sentiment lean | yes (resolveCouncilVote_) | literal (no name) |
| K9 | `phase05-citizens/civicInitiativeEngine.js:1366` | `(inline)` | `0.5 + (sentiment * 0.15)` | third voter yes odds (same expression as :1329) | yes (resolveCouncilVote_) | literal (no name) |
| K10 | `phase05-citizens/civicInitiativeEngine.js:1698` | `(inline)` | `var baseProb = 0.50` | base approval odds in the vote at this site | yes (resolveExternalDecision_) | literal (no name) |
| K11 | `phase05-citizens/civicInitiativeEngine.js:2716` | `(inline)` | `var baseVetoProb = 0.10` | mayor veto base odds | yes (checkMayoralVeto_) | literal (no name) |
| K12 | `phase05-citizens/civicInitiativeEngine.js:2845` | `(inline)` | `var prob = 0.55` | override vote yes odds (comment: slight override bias) | yes (processOverrideVote_) | literal (no name) |
| K13 | `phase05-citizens/judicialLifecycle.js:31` | `JUDICIAL_REPEAT_WINDOW_` | `52` | cycles a prior arrest counts toward the repeat-held multiplier | NO (countPriorArrests_) | none |
| K14 | `phase05-citizens/judicialLifecycle.js:28` | `JUDICIAL_HELD_RANGE_` | `{ minor: [1, 1], serious: [1, 3], grave: [3, 4] }` | held length in cycles by charge gravity (table; the outcome split is already on the sheet) | mixed: judicialDecidePending_ no; judicialSettleFine_ yes | tests: judicialLifecycle.test.js |
| K15 | `phase05-citizens/maneuverEngine.js:53` | `MANEUVER_TIER_BARS_FALLBACK` | `{ Founding: 0, Established: 30, Prominent: 50, Dynasty: 70 }` | tier bars used as a fallback (name says fallback; ENGINE157 maneuver keys are seeded) | NO (maneuverTierBars_) | none |
| K16 | `phase05-citizens/runConductEngine.js:52` | `CONDUCT_SLIP_P_` | `[0.35, 0.35, 0.25, 0.15, 0.05]` | moral test: odds of giving in, by integrity band (table) | yes (runConductEngine_) | none |
| K17 | `phase05-citizens/runConductEngine.js:53` | `CONDUCT_GRAVE_P_` | `[0.10, 0.05, 0.02, 0.02, 0.02]` | moral test: a committed act is grave, by integrity band (table) | yes (runConductEngine_) | none |
| K18 | `phase05-citizens/runConductEngine.js:54` | `CONDUCT_SERIOUS_P_` | `[0.45, 0.30, 0.15, 0.15, 0.15]` | moral test: or serious, by integrity band (table) | yes (runConductEngine_) | none |
| K19 | `phase05-citizens/runConductEngine.js:92` | `(inline)` | `var LIMIT = 3` | resolved moral tests per cycle | yes (runConductEngine_) | name too generic to grep |
| K20 | `phase05-citizens/generateGenericCitizens.js:497` | `FIRST_NAME_CAP` | `3` | times one first name may repeat in a mint | yes (generateGenericCitizens_) | code: scripts/ingestFemaleCitizensBalance.js |
| K21 | `phase05-citizens/generateGenericCitizens.js:498` | `LAST_NAME_CAP` | `4` | times one last name may repeat in a mint | yes (generateGenericCitizens_) | code: scripts/ingestFemaleCitizensBalance.js |
| K22 | `phase05-citizens/runAsUniversePipeline.js:474` | `(inline)` | `rng() < 0.30` | fundraiser pool joins the draw | yes (runAsUniversePipeline_) | literal (no name) |
| K23 | `phase05-citizens/runAsUniversePipeline.js:475` | `(inline)` | `rng() < 0.15` | vacation pool joins the draw | yes (runAsUniversePipeline_) | literal (no name) |
| K24 | `phase05-citizens/runAsUniversePipeline.js:476` | `(inline)` | `rng() < 0.25` | business pool joins the draw | yes (runAsUniversePipeline_) | literal (no name) |

### Cut K, declaration depth

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| K25 | `phase01-config/loadPreviousEvening.js:34` | `CARRY_FORWARD_RING` | `3` | (name only; body not read) | yes (mirrorCarryForwardToSheet_) | none |
| K26 | `phase02-world-state/applyCityDynamics.js:87` | `CITYWIDE_CRIME_FLOOR` | `3` | (name only; body not read) | yes (applyCityDynamics_) | tests: perHoodDynamics.test.js, sentimentRestingLevel.test.js |
| K27 | `phase02-world-state/applyCityDynamics.js:88` | `CITYWIDE_CRIME_SHARE` | `0.5` | (name only; body not read) | yes (applyCityDynamics_) | tests: perHoodDynamics.test.js, sentimentRestingLevel.test.js |
| K28 | `phase02-world-state/applyCityDynamics.js:413` | `WEATHER_MOOD_SCALE` | `0.3` | (name only; body not read) | yes (applyCityDynamics_) | none |
| K29 | `phase02-world-state/applyCityDynamics.js:414` | `WEATHER_CAT_MOOD` | `0.15` | (name only; body not read) | yes (applyCityDynamics_) | none |
| K30 | `phase02-world-state/applyCityDynamics.js:523` | `HOLIDAY_MOOD_SCALE` | `0.6` | (name only; body not read) | yes (applyCityDynamics_) | none |
| K31 | `phase02-world-state/applyCityDynamics.js:1460` | `COMMUTE_DAYTIME_FULL_LIFT` | `40` | (name only; body not read) | yes (applyCityDynamics_) | none |
| K32 | `phase02-world-state/applySportsSeason.js:657` | `BAYLIGHT_OPEN_AFTER_CYCLE_` | `104` | canon declared at C104; openings are the first qualifying phase AFTER it | yes (deriveBaylightOpenings_) | none |
| K33 | `phase03-population/generateCrisisBuckets.js:194` | `CRISIS_MEMORY_CAP` | `6` | (name only; body not read) | partial: S/cfg only (rememberCrisis_) | code: phase09-digest/finalizeCycleState.js |
| K34 | `phase04-events/careJusticeService.js:34` | `CARE_JUSTICE_ADMIT_CARRY_START` | `0.5` | (name only; body not read) | yes (runCareJusticeDemand_) | none |
| K35 | `phase04-events/careJusticeService.js:35` | `CARE_JUSTICE_ADMIT_CARRY_PLACES` | `1e6` | (name only; body not read) | NO (careJusticeAdmitSplit_) | none |
| K36 | `phase04-events/chaosCarsEngine.js:26` | `CHAOS_MIN_EVENTS` | `3` | (name only; body not read) | NO (pickEventCount_) | none |
| K37 | `phase04-events/chaosCarsEngine.js:27` | `CHAOS_MAX_EVENTS` | `15` | (name only; body not read) | NO (pickEventCount_) | none |
| K38 | `phase04-events/faithEventsEngine.js:150` | `MAX_FAITH_EVENTS` | `5` | (name only; body not read) | yes (runFaithEventsEngine_) | none |
| K39 | `phase06-analysis/applyPatternDetection.js:110` | `EVENT_BASELINE_FLOOR` | `50` | (name only; body not read) | yes (applyPatternDetection_) | none |
| K40 | `phase06-analysis/prePublicationValidation.js:31` | `COVERAGE_IMBALANCE_THRESHOLD` | `0.6` | 60% in one neighborhood | yes (checkDistribution_) | none |
| K41 | `phase06-analysis/prePublicationValidation.js:32` | `HIGH_SEVERITY_THRESHOLD` | `4` | (name only; body not read) | no use outside the definition | none |
| K42 | `phase07-evening-media/applyStorySeeds.js:1392` | `TEXTURE_SEED_CAP` | `8` | (name only; body not read) | yes (applyStorySeeds_) | none |
| K43 | `phase07-evening-media/applyStorySeeds.js:1393` | `TEXTURE_FAITH_CAP` | `2` | (name only; body not read) | yes (applyStorySeeds_) | none |
| K44 | `phase07-evening-media/buildContractSeeds.js:83` | `CONTRACT_SEED_MAX_CITIZENS` | `6` | exact-participant cap per seed row | yes (buildContractSeeds_) | none |
| K45 | `phase07-evening-media/buildContractSeeds.js:84` | `CONTRACT_SEED_FILL_N` | `4` | Grade 1: fill Citizens to this count via neighborhood draw | NO (contractSeedPickCitizens_) | tests: buildContractSeeds.test.js |
| K46 | `phase07-evening-media/buildContractSeeds.js:85` | `CONTRACT_SEED_FILL_BIZ` | `2` | S313: fill Businesses to this count via neighborhood draw | yes (buildContractSeeds_) | tests: buildContractSeeds.test.js |
| K47 | `phase07-evening-media/buildContractSeeds.js:86` | `CONTRACT_SEED_FILL_OTHER` | `1` | S313: fill OtherEntities to this count via neighborhood draw | yes (buildContractSeeds_) | none |
| K48 | `phase07-evening-media/culturalLedger.js:81` | `CULTURAL_FAME_BAR` | `25` | (name only; body not read) | mixed: culturalFameFinal_ no; culturalFamePendingFinal_ no; culturalStatusByPop_ yes | none |
| K49 | `phase07-evening-media/culturalLedger.js:82` | `CULTURAL_FAME_QUIET_CYCLES` | `10` | (name only; body not read) | yes (decayCulturalFame_) | none |
| K50 | `phase07-evening-media/culturalLedger.js:101` | `CULTURAL_FAME_CEILING` | `100` | (name only; body not read) | NO (clampCulturalFame_) | none |
| K51 | `phase08-v3-chicago/v3NeighborhoodWriter.js:101` | `PULSE_REF_EVENTS` | `8` | (name only; body not read) | NO (pulseFoldDelta_) | tests: pulseFoldNormalize.test.js |
| K52 | `phase08-v3-chicago/v3NeighborhoodWriter.js:114` | `CITY_SENTIMENT_NUDGE` | `0.15` | (name only; body not read) | yes (saveV3NeighborhoodMap_) | tests: testNeighborhoodLoop.js |
| K53 | `phase08-v3-chicago/v3NeighborhoodWriter.js:165` | `HOOD_RETAIL_BOOM_WEIGHT` | `0.10` | × BoomIndex (−1..+1) | partial: S/cfg only (hoodRetailRaw_) | none |
| K54 | `phase08-v3-chicago/v3NeighborhoodWriter.js:243` | `HOOD_BIZ_GROWTH_GAIN` | `0.01` | retail share per pp of growth vs the city median | partial: S/cfg only (hoodBusinessFactor_) | none |
| K55 | `phase08-v3-chicago/v3NeighborhoodWriter.js:245` | `HOOD_BIZ_CLOSURE_CAP` | `0.5` | a closure never removes more than half the street | partial: S/cfg only (hoodBusinessFactor_) | none |
| K56 | `utilities/bylineEngine.js:64` | `CONFIDENCE_HIGH_FLOOR` | `3` | (name only; body not read) | NO (categorizeConfidence_) | none |
| K57 | `utilities/bylineEngine.js:65` | `CONFIDENCE_HIGH_GAP` | `0.4` | (name only; body not read) | NO (categorizeConfidence_) | none |
| K58 | `utilities/bylineEngine.js:66` | `CONFIDENCE_MED_GAP` | `0.2` | (name only; body not read) | NO (categorizeConfidence_) | none |
| K59 | `utilities/bylineEngine.js:207` | `FORMAT_FIT_DEFAULT` | `1` | (name only; body not read) | NO (formatFitScore_) | none |
| K60 | `utilities/bylineEngine.js:242` | `CADENCE_CAP_KNEE` | `0.20` | (name only; body not read) | NO (cadenceMultiplier_) | none |
| K61 | `utilities/bylineEngine.js:243` | `CADENCE_CAP_RATIO` | `0.25` | (name only; body not read) | NO (cadenceMultiplier_) | code: scripts/checkBylineCadence.js |
| K62 | `utilities/bylineEngine.js:244` | `CADENCE_CAP_FLOOR` | `0.3` | (name only; body not read) | NO (cadenceMultiplier_) | none |
| K63 | `utilities/careJusticeAccounting.js:403` | `CARE_JUSTICE_GAP_LIMIT` | `8` | more missing Cycles than this is a broken tab, not a gap | NO (planCareJusticeCensus_) | none |
| K64 | `utilities/careJusticeAccounting.js:404` | `CARE_JUSTICE_STAY_MAX` | `8` | the tail read holds ten blocks | NO (careJusticeStay_) | none |
| K65 | `utilities/careJusticeAccounting.js:906` | `HOSPITAL_STRAIN_MIN_CYCLES` | `4` | (name only; body not read) | NO (careJusticeHospitalStrain_) | none |
| K66 | `utilities/careJusticeAccounting.js:907` | `HOSPITAL_STRAIN_MIN_MIDDLE` | `10` | (name only; body not read) | NO (careJusticeHospitalStrain_) | none |
| K67 | `utilities/careJusticeAccounting.js:908` | `HOSPITAL_STRAIN_EXCESS_CAP` | `0.5` | (name only; body not read) | NO (careJusticeHospitalStrain_) | none |
| K68 | `utilities/citizenDerivation.js:75` | `BASE_FEMALE_PCT_` | `0.51` | (name only; body not read) | NO (deriveGender_) | none |
| K69 | `utilities/citizenDerivation.js:81` | `FALLBACK_INCOME_` | `60000` | (name only; body not read) | mixed: lookupIncome_ no; checkForPromotions_ [checkForPromotions.js] yes | code: phase05-citizens/checkForPromotions.js |
| K70 | `utilities/priorityEngine.js:70` | `DOMAIN_WEIGHT_DEFAULT` | `1` | (name only; body not read) | NO (computePriorityScore_) | none |
| K71 | `utilities/sportsWeekRecord.js:89` | `SPORTS_EXPECT_WINDOW_` | `8` | trailing game weeks (Cycles with g > 0), survives the off-season | NO (buildSportsWeek_, deriveSportsIntensity_ [applySportsSeason.js]) | code: phase02-world-state/applySportsSeason.js |
| K72 | `utilities/sportsWeekRecord.js:90` | `SPORTS_EXPECT_MIN_WEEKS_` | `4` | below this the prior stands | NO (buildSportsWeek_, sportsWeekClass_, addSportsWeekIntensity_, buildSportsCity_) | none |
| K73 | `utilities/sportsWeekRecord.js:91` | `SPORTS_SURPRISE_BAND_` | `0.2` | 204/205 §2.7: \|surprise\| past this is a signed week | NO (sportsWeekClass_) | none |
| K74 | `utilities/sportsWeekRecord.js:163` | `SPORTS_DEPTH_MAX_` | `6` | SPORTS_PHASE_DEPTH_.championship — stakes = depth / max | NO (sportsUnsigned_, addSportsWeekIntensity_) | none |
| K75 | `utilities/sportsWeekRecord.js:164` | `SPORTS_VOL_GAMES_` | `3` | vol = 1 - e^(-g/3): 1 game .28, 3 → .63, 7 → .90 | NO (sportsUnsigned_, addSportsWeekIntensity_) | none |

### Cut K, rolls found outside phase05 (r pass; the surrounding code was not read)

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| K76 | `phase01-config/advanceSimulationCalendar.js:197` | `(inline)` | `rng() < 0.29` | (roll at this site; context not read) | yes (advanceSimulationCalendar_) | literal (no name) |
| K77 | `phase01-config/advanceSimulationCalendar.js:212` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (advanceSimulationCalendar_) | literal (no name) |
| K78 | `phase01-config/advanceSimulationCalendar.js:215` | `(inline)` | `rng() < 0.2` | (roll at this site; context not read) | yes (advanceSimulationCalendar_) | literal (no name) |
| K79 | `phase01-config/advanceSimulationCalendar.js:217` | `(inline)` | `rng() < 0.25` | (roll at this site; context not read) | yes (advanceSimulationCalendar_) | literal (no name) |
| K80 | `phase01-config/advanceSimulationCalendar.js:219` | `(inline)` | `rng() < 0.25` | (roll at this site; context not read) | yes (advanceSimulationCalendar_) | literal (no name) |
| K81 | `phase02-world-state/applyWeatherModel.js:263` | `(inline)` | `rng() < 0.45` | (roll at this site; context not read) | yes (applyWeatherModel_) | literal (no name) |
| K82 | `phase02-world-state/applyWeatherModel.js:264` | `(inline)` | `rng() < 0.50` | (roll at this site; context not read) | yes (applyWeatherModel_) | literal (no name) |
| K83 | `phase02-world-state/applyWeatherModel.js:265` | `(inline)` | `rng() < 0.35` | (roll at this site; context not read) | yes (applyWeatherModel_) | literal (no name) |
| K84 | `phase02-world-state/applyWeatherModel.js:266` | `(inline)` | `rng() < 0.45` | (roll at this site; context not read) | yes (applyWeatherModel_) | literal (no name) |
| K85 | `phase02-world-state/applyWeatherModel.js:1286` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (getWeatherEvent_) | literal (no name) |
| K86 | `phase02-world-state/applyWeatherModel.js:1290` | `(inline)` | `rng() < 0.35` | (roll at this site; context not read) | yes (getWeatherEvent_) | literal (no name) |
| K87 | `phase02-world-state/applyWeatherModel.js:1294` | `(inline)` | `rng() < 0.4` | (roll at this site; context not read) | yes (getWeatherEvent_) | literal (no name) |
| K88 | `phase02-world-state/applyWeatherModel.js:1313` | `(inline)` | `rng() < 0.25` | (roll at this site; context not read) | yes (getNeighborhoodWeatherEvent_) | literal (no name) |
| K89 | `phase03-population/updateCrimeMetrics.js:647` | `(inline)` | `rng() > 0.5` | (roll at this site; context not read) | partial (calculateNeighborhoodCrime_(neighborhood,profile,demo,prev,context,events,advanced,rng)) | literal (no name) |
| K90 | `phase03-population/updateNeighborhoodDemographics.js:295` | `(inline)` | `rng() < 0.1` | (roll at this site; context not read) | yes (updateNeighborhoodDemographics_) | literal (no name) |
| K91 | `phase03-population/updateNeighborhoodDemographics.js:301` | `(inline)` | `rng() < 0.05` | (roll at this site; context not read) | yes (updateNeighborhoodDemographics_) | literal (no name) |
| K92 | `phase03-population/updateNeighborhoodDemographics.js:307` | `(inline)` | `rng() < 0.02` | (roll at this site; context not read) | yes (updateNeighborhoodDemographics_) | literal (no name) |
| K93 | `phase03-population/updateNeighborhoodDemographics.js:312` | `(inline)` | `rng() < 0.03` | (roll at this site; context not read) | yes (updateNeighborhoodDemographics_) | literal (no name) |
| K94 | `phase04-events/buildCityEvents.js:579` | `(inline)` | `rng() < 0.4` | (roll at this site; context not read) | yes (buildCityEvents_) | literal (no name) |
| K95 | `phase04-events/faithEventsEngine.js:258` | `(inline)` | `rng() < 0.7` | (roll at this site; context not read) | partial (generateOrgEvents_(org,context,rng)) | literal (no name) |
| K96 | `phase04-events/generationalEventsEngine.js:1191` | `(inline)` | `rng() < 0.5` | (roll at this site; context not read) | yes (createChildRow_) | literal (no name) |
| K97 | `phase07-evening-media/buildEveningFamous.js:405` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (buildEveningFamous_) | literal (no name) |
| K98 | `phase07-evening-media/buildEveningFamous.js:469` | `(inline)` | `rng() < 0.5` | (roll at this site; context not read) | yes (buildEveningFamous_) | literal (no name) |
| K99 | `phase07-evening-media/buildEveningFamous.js:633` | `(inline)` | `rng() < 0.6` | (roll at this site; context not read) | partial (pickAthleteSightingHood_(S,rng)) | literal (no name) |
| K100 | `phase07-evening-media/buildEveningFood.js:124` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (buildEveningFood_) | literal (no name) |
| K101 | `phase07-evening-media/mediaFeedbackEngine.js:1262` | `(inline)` | `rng() < 0.4` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K102 | `phase07-evening-media/mediaFeedbackEngine.js:1270` | `(inline)` | `rng() < 0.5` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K103 | `phase07-evening-media/mediaFeedbackEngine.js:1278` | `(inline)` | `rng() < 0.4` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K104 | `phase07-evening-media/mediaFeedbackEngine.js:1286` | `(inline)` | `rng() < 0.35` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K105 | `phase07-evening-media/mediaFeedbackEngine.js:1296` | `(inline)` | `rng() < 0.5` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K106 | `phase07-evening-media/mediaFeedbackEngine.js:1306` | `(inline)` | `rng() < 0.4` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K107 | `phase07-evening-media/mediaFeedbackEngine.js:1314` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K108 | `phase07-evening-media/mediaFeedbackEngine.js:1322` | `(inline)` | `rng() < 0.3` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K109 | `phase07-evening-media/mediaFeedbackEngine.js:1330` | `(inline)` | `rng() < 0.25` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K110 | `phase07-evening-media/mediaFeedbackEngine.js:1337` | `(inline)` | `rng() < 0.2` | (roll at this site; context not read) | yes (getMediaInfluencedEvent_) | literal (no name) |
| K111 | `utilities/utilityFunctions.js:56` | `(inline)` | `rng() < 0.5` | (roll at this site; context not read) | NO (maybePick_(arr,rng)) | literal (no name) |

Candidates in Cut K: 24 + 51 + 36 = 111.

## Cut I — population rates, migration, trajectory

Rows I1-I8 are the births / deaths / migration block of `updateWorldPopulation_(ctx)` (`godWorldEngine2.js:1252-1520`; it owns totalPopulation and migration since engine.102, :1510-1517). Migration noise amplitudes (`mig += Math.round((rng() - 0.5) * 20)` and 13 siblings, `:1423-1483`) are not listed row by row.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| I1 | `phase01-config/godWorldEngine2.js:1393` | `(inline)` | `var baseBirthRate = 0.010` | city births per head per cycle | yes (updateWorldPopulation_) | literal (no name) |
| I2 | `phase01-config/godWorldEngine2.js:1394` | `(inline)` | `var baseDeathRate = 0.008` | city deaths per head per cycle | yes (updateWorldPopulation_) | literal (no name) |
| I3 | `phase01-config/godWorldEngine2.js:1397` | `(inline)` | `baseBirthRate += 0.002` | summer birth bump | yes (updateWorldPopulation_) | literal (no name) |
| I4 | `phase01-config/godWorldEngine2.js:1398` | `(inline)` | `baseDeathRate += 0.002` | winter death bump | yes (updateWorldPopulation_) | literal (no name) |
| I5 | `phase01-config/godWorldEngine2.js:1401` | `(inline)` | `baseBirthRate += 0.001` | fall birth bump | yes (updateWorldPopulation_) | literal (no name) |
| I6 | `phase01-config/godWorldEngine2.js:1404` | `(inline)` | `baseDeathRate += 0.001` | severe weather death bump (impact >= 1.5) | yes (updateWorldPopulation_) | literal (no name) |
| I7 | `phase01-config/godWorldEngine2.js:1411` | `ILLNESS_MORTALITY_FACTOR` | `0.02` | share of illness above 5% added to the death rate | yes (updateWorldPopulation_) | none |
| I8 | `phase01-config/godWorldEngine2.js:1491` | `MAX_MIGRATION_RATE` | `0.005` | city migration per cycle as a share of population | yes (updateWorldPopulation_) | none |
| I9 | `phase05-citizens/migrationTrackingEngine.js:104` | `RISK_WEIGHTS` | `{ RENT_BURDEN_HIGH: 4, RENTER: 2, INCOME_BELOW_MEDIAN: 3, NO_COLLEGE: 2, SENIOR: 1, RENT_INC...` | displacement risk points per factor (table) | yes (assessDisplacementRisk_) | none |
| I10 | `phase05-citizens/migrationTrackingEngine.js:119` | `RELOCATION` | `{ MAX_UNITS_PER_CYCLE: 2, PRESSURE_MOVE_CHANCE: 0.35, MISFIT_MOVE_CHANCE: 0.15, MISFIT_INCOM...` | move odds, income ratio, burden bars, score gain (table; MAX_UNITS_PER_CYCLE is read nowhere) | mixed: scoreHoodFit_ no; processRelocations_ yes | tests: migrationRelocation.test.js |
| I11 | `phase05-citizens/migrationTrackingEngine.js:100` | `RELOCATION_PRESSURE_IN` | `0.1` | housing-pressure added to a hood per household arrival | yes (processRelocations_) | none |
| I12 | `phase05-citizens/migrationTrackingEngine.js:101` | `RELOCATION_PRESSURE_OUT` | `-0.05` | housing-pressure relieved per departure | yes (processRelocations_) | none |
| I13 | `phase05-citizens/migrationTrackingEngine.js:482` | `SETTLED_IN_CYCLES` | `10` | cycles before a mover counts as settled | yes (processSettledInCheck_) | none |
| I14 | `phase05-citizens/migrationTrackingEngine.js:93` | `SAVINGS_BUFFER_MONTHS` | `12` | second declaration of the same global (householdFormationEngine.js:117) | mixed: assessDisplacementRisk_ yes; planFundDisbursement_ [householdFormationEngine.js] no; detectHouseholdStress_ [householdFormationEngine.js] no | tests: householdReconcile.test.js; code: phase05-citizens/householdFormationEngine.js |
| I15 | `phase05-citizens/migrationTrackingEngine.js:604` | `(inline)` | `score += 1.5` | hood fit bonus for a growth hood | NO (scoreHoodFit_(unitIncome,hood)) | literal (no name) |
| I16 | `phase05-citizens/migrationTrackingEngine.js:605` | `(inline)` | `score -= 2` | hood fit penalty for a decay hood | NO (scoreHoodFit_(unitIncome,hood)) | literal (no name) |
| I17 | `phase05-citizens/neighborhoodTrajectoryEngine.js:60` | `TRAJECTORY_THRESHOLDS` | `{ GROWTH_MIN: 2, DECAY_MAX: -2 }` | composite score at which a hood is growth / decay (table) | yes (updateNeighborhoodTrajectories_) | none |
| I18 | `phase05-citizens/neighborhoodTrajectoryEngine.js:68` | `TRAJECTORY_DRIFT` | `{ INCOME_GROWTH: 0.002, INCOME_DECAY: -0.001 }` | income drift per cycle: growth +0.002, decay -0.001 (table) | yes (updateNeighborhoodTrajectories_) | none |
| I19 | `phase05-citizens/neighborhoodTrajectoryEngine.js:231` | `(inline)` | `pressure -= 0.5` | housing pressure relief per cycle | yes (updateNeighborhoodTrajectories_) | literal (no name) |
| I20 | `phase06-analysis/applyMigrationDrift.js:435` | `(inline)` | `HI = 1.15` | migration read: high band edge (with LO 0.85, SENT_BAND 0.05) | yes (applyMigrationDrift_) | literal (no name) |
| I21 | `phase06-analysis/applyMigrationDrift.js:439` | `(inline)` | `MOOD_BAND = 1.5` | migration read: mood band | yes (applyMigrationDrift_) | literal (no name) |

Candidates in Cut I: 21.

## Cut G — household, wealth, money, casino

Seed first: the same 48000 exists three times and `SAVINGS_BUFFER_MONTHS` twice (Duplicates). Tables are shown as their source text.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| G1 | `phase05-citizens/householdFormationEngine.js:110` | `RENT_BURDEN_WARNING` | `0.40` | rent share of income that flags a household (copy at migrationTrackingEngine.js:407) | mixed: planFundDisbursement_ no; detectHouseholdStress_ no; updateMigrationIntent_ [migrationTrackingEngine.js] yes | code: phase05-citizens/migrationTrackingEngine.js |
| G2 | `phase05-citizens/householdFormationEngine.js:111` | `RENT_BURDEN_CRISIS` | `0.50` | rent share of income that is a crisis (copy at migrationTrackingEngine.js:406) | mixed: processHouseholdFormation_ yes; detectHouseholdStress_ no; updateMigrationIntent_ [migrationTrackingEngine.js] yes | tests: migrationRelocation.test.js, householdReconcile.test.js, buildLivesSlice.test.js +1; code: phase05-citizens/migrationTrackingEngine.js, scripts/buildTrendsSlice.js |
| G3 | `phase05-citizens/householdFormationEngine.js:117` | `SAVINGS_BUFFER_MONTHS` | `12` | months of housing cost savings that absorb burden stress (declared twice) | mixed: planFundDisbursement_ no; detectHouseholdStress_ no; assessDisplacementRisk_ [migrationTrackingEngine.js] yes | tests: householdReconcile.test.js; code: phase05-citizens/migrationTrackingEngine.js |
| G4 | `phase05-citizens/householdFormationEngine.js:122` | `GENERIC_SPOUSE_SALARY` | `48000` | income of an off-camera spouse in a couple household | yes (updateHouseholdIncomes_) | tests: engine304FamilyLottery.test.js; code: scripts/migrations/engine57_kids_backfill.js, scripts/migrations/engine57_household_twotype.js |
| G5 | `phase05-citizens/householdFormationEngine.js:289` | `GENERIC_OFFCAM_INCOME` | `48000` | income of an off-camera family member (same rate as GC_SPOUSE_INCOME, comment) | yes (formCriteriaHouseholds_) | none |
| G6 | `phase05-citizens/householdFormationEngine.js:125` | `YOUNG_ADULT_MIN_AGE` | `22` | young-adult age floor in household formation | yes (formNewHouseholds_) | none |
| G7 | `phase05-citizens/householdFormationEngine.js:126` | `YOUNG_ADULT_MAX_AGE` | `28` | young-adult age ceiling in household formation | yes (formNewHouseholds_) | none |
| G8 | `phase05-citizens/householdFormationEngine.js:302` | `SOLO_INCOME_FLOOR` | `85000` | income at which a single establishes their own household | yes (formCriteriaHouseholds_, reconcileHouseholds_, processDivorces_) | none |
| G9 | `phase05-citizens/householdFormationEngine.js:303` | `SOLO_ESTABLISH_CHANCE` | `0.10` | weekly odds a qualified single establishes | yes (formCriteriaHouseholds_) | tests: maneuverEngine.test.js |
| G10 | `phase05-citizens/householdFormationEngine.js:1023` | `DIVORCE_CRISIS_WINDOW` | `13` | cycles (a quarter) the divorce crisis count looks back (builder dial) | NO (divorceCrisisKinds_) | tests: engine302Marital.test.js |
| G11 | `phase05-citizens/householdFormationEngine.js:1024` | `DIVORCE_CRISIS_COUNT` | `3` | distinct crisis kinds that open a divorce (builder dial) | yes (processDivorces_) | tests: engine302Marital.test.js |
| G12 | `phase05-citizens/householdFormationEngine.js:895` | `(inline)` | `rng() < 0.15` | chance a single young adult without a household is considered for formation each cycle (comment: 15%) | yes (formNewHouseholds_) | literal (no name) |
| G13 | `phase05-citizens/householdFormationEngine.js:1659` | `(inline)` | `rng() < 0.10` | chance a crisis-severity stressed household dissolves (comment: 10%) | yes (dissolveStressedHouseholds_) | literal (no name) |
| G14 | `phase05-citizens/generationalWealthEngine.js:236` | `DEBT_DRAG` | `40` | dollars per debt level per cycle drained from income | NO (debtDrag_) | tests: debtLean.test.js |
| G15 | `phase05-citizens/generationalWealthEngine.js:237` | `DEBT_PAYOFF_COST` | `800` | dollars per debt level to pay off from NetWorth | yes (processMoneyLoop_) | tests: debtLean.test.js |
| G16 | `phase05-citizens/generationalWealthEngine.js:238` | `DEBT_TOP` | `6` | highest debt level any writer reaches | yes (processMoneyLoop_) | tests: debtLean.test.js |
| G17 | `phase05-citizens/generationalWealthEngine.js:239` | `DEBT_DEFAULT_RESET` | `1` | debt level a default leaves | yes (processMoneyLoop_) | tests: debtLean.test.js |
| G18 | `phase05-citizens/generationalWealthEngine.js:241` | `SUPERCOUPLE_SAVINGS_FACTOR` | `1.2` | savings multiplier for a high-earning couple | yes (processMoneyLoop_) | none |
| G19 | `phase05-citizens/generationalWealthEngine.js:242` | `NETWORTH_MILESTONE` | `100000` | NetWorth at which a milestone is marked | yes (processMoneyLoop_) | none |
| G20 | `phase05-citizens/generationalWealthEngine.js:253` | `BANK_RATE_MEAN` | `5.0` | bank rate resting level (percent) | yes (processBankRate_, processMoneyLoop_) | none |
| G21 | `phase05-citizens/generationalWealthEngine.js:254` | `BANK_RATE_MIN` | `2.0` | bank rate floor | yes (processBankRate_) | none |
| G22 | `phase05-citizens/generationalWealthEngine.js:254` | `BANK_RATE_MAX` | `10.0` | bank rate ceiling | yes (processBankRate_) | none |
| G23 | `phase05-citizens/generationalWealthEngine.js:255` | `BANK_RATE_REVERSION` | `0.1` | share of the gap to the mean closed per cycle | yes (processBankRate_) | none |
| G24 | `phase05-citizens/generationalWealthEngine.js:256` | `BANK_RATE_MOOD_NUDGE` | `0.3` | rate move from city mood | yes (processBankRate_) | none |
| G25 | `phase05-citizens/generationalWealthEngine.js:257` | `BANK_RATE_JITTER` | `0.4` | rate noise per cycle | yes (processBankRate_) | none |
| G26 | `phase05-citizens/generationalWealthEngine.js:258` | `SHOCK_EXPENSE_P` | `0.004` | per-citizen weekly odds of a shock expense (~once in 5 years) | yes (processMoneyLoop_) | none |
| G27 | `phase05-citizens/generationalWealthEngine.js:259` | `SHOCK_WINDFALL_P` | `0.002` | per-citizen weekly odds of a windfall | yes (processMoneyLoop_) | none |
| G28 | `phase05-citizens/generationalWealthEngine.js:1057` | `OWNER_DRAW_SHARE` | `0.5` | DEAD: superseded by seeded ownerDrawShare (applyOwnerDraw_ reads the key) | no use outside the definition | code: phase01-config/engine94SheetContract.js |
| G29 | `phase05-citizens/generationalWealthEngine.js:1058` | `HERITAGE_GAIN_SHARE` | `0.5` | share of profit landing on a heritage owner NetWorth (sibling of ownerDrawShare) | yes (applyOwnerDraw_) | none |
| G30 | `phase05-citizens/generationalWealthEngine.js:1776` | `HOME_PRICE_TO_RENT` | `22` | annual-rent multiple that prices a home | mixed: collectPropertyTax_ yes; trackHomeOwnership_ yes; homeDieOwned_ yes; homeSaleProceeds_ no; planOwnerMove_ yes | tests: debtLean.test.js, homeSale.test.js, householdReconcile.test.js +1 |
| G31 | `phase05-citizens/generationalWealthEngine.js:1777` | `HOME_ELIGIBLE_NW` | `0.35` | share of price a household must hold to buy | yes (trackHomeOwnership_, planOwnerMove_) | tests: debtLean.test.js, householdReconcile.test.js |
| G32 | `phase05-citizens/generationalWealthEngine.js:1778` | `HOME_DOWN` | `0.20` | share of price paid at closing | mixed: trackHomeOwnership_ yes; homeDieOwned_ yes; homeSaleProceeds_ no; planOwnerMove_ yes | tests: homeSale.test.js |
| G33 | `phase05-citizens/generationalWealthEngine.js:1779` | `HOME_MORTGAGE_MONTHLY` | `0.8 * 0.07 / 12` | financed share (0.8) x rate (0.07) / 12 | yes (trackHomeOwnership_, planOwnerMove_) | tests: householdReconcile.test.js |
| G34 | `phase05-citizens/generationalWealthEngine.js:1795` | `HOME_BUY_P` | `0.01` | weekly roll for a qualified household to buy | NO (homeBuyChance_) | tests: householdReconcile.test.js |
| G35 | `phase05-citizens/generationalWealthEngine.js:1796` | `HOME_CARRY_MAX` | `0.30` | mortgage ceiling as a share of household income (same 0.30 as hoodRentShare) | NO (homeCarries_) | tests: householdReconcile.test.js, cityRevenue.test.js; code: phase01-config/engine94SheetContract.js |
| G36 | `phase05-citizens/generationalWealthEngine.js:1851` | `TAX_DAY_MIN_GAP` | `26` | cycles before a household can be billed property tax twice | yes (collectPropertyTax_) | none |
| G37 | `phase05-citizens/generationalWealthEngine.js:2556` | `HERITAGE_EMPTY_CYCLES` | `4` | cycles with no living member before a lineage goes dormant | yes (updateHeritage_) | none |
| G38 | `phase05-citizens/generationalWealthEngine.js:2557` | `HERITAGE_LOW_STANDING` | `10` | standing under which an Established line counts as low | yes (updateHeritage_) | none |
| G39 | `phase05-citizens/generationalWealthEngine.js:2558` | `HERITAGE_LOW_CYCLES` | `52` | cycles at low standing (a year) before it goes dormant | yes (updateHeritage_) | none |
| G40 | `phase05-citizens/generationalWealthEngine.js:2560` | `HERITAGE_DOOR_A_MEMBERS` | `3` | door A: living on-camera members to found a lineage | yes (updateHeritage_) | none |
| G41 | `phase05-citizens/generationalWealthEngine.js:2561` | `HERITAGE_DOOR_A_NETWORTH` | `1000000` | door A: combined family savings | yes (updateHeritage_) | none |
| G42 | `phase05-citizens/generationalWealthEngine.js:2562` | `HERITAGE_DOOR_B_NETWORTH` | `350000000` | door B: apex-wealth NetWorth | yes (updateHeritage_) | none |
| G43 | `phase05-citizens/generationalWealthEngine.js:2569` | `HERITAGE_DOOR_C_SOLO_NETWORTH` | `50000000` | door C: one living member | yes (updateHeritage_) | none |
| G44 | `phase05-citizens/generationalWealthEngine.js:2570` | `HERITAGE_DOOR_C_FAMILY_NETWORTH` | `50000000` | door C: two or more combined | yes (updateHeritage_) | none |
| G45 | `phase05-citizens/generationalWealthEngine.js:2583` | `HERITAGE_BIZ_CITIZEN_CAP` | `2` | firms a heritage citizen may own before a line stops staking | yes (updateHeritage_) | none |
| G46 | `phase05-citizens/generationalWealthEngine.js:2584` | `HERITAGE_BIZ_COOLDOWN` | `12` | cycles a line waits between business openings | yes (updateHeritage_) | none |
| G47 | `phase05-citizens/generationalWealthEngine.js:2578` | `HERITAGE_BIZ_ROLL` | `{ 'Established': { p: 0.15, step: 0 }, 'Prominent': { p: 0.25, step: 1 }, 'Dynasty': { p: 0....` | per-tier odds and step of a heritage business opening (table) | mixed: heritageLineBizCap_ no; updateHeritage_ yes | none |
| G48 | `phase05-citizens/generationalWealthEngine.js:2607` | `HERITAGE_BIRTH_MULT` | `{ 'Founding': 1.15, 'Established': 1.3, 'Prominent': 1.45, 'Dynasty': 1.6 }` | per-tier birth-odds multiplier read by checkBirth_ (table) | yes (checkBirth_ [generationalEventsEngine.js]) | code: phase04-events/generationalEventsEngine.js |
| G49 | `phase05-citizens/casinoLedgerEngine.js:41` | `CASINO_HOUSE_SEED` | `250000` | house starting bankroll | yes (processCasinoLedger_) | none |
| G50 | `phase05-citizens/casinoLedgerEngine.js:42` | `CASINO_JUICE` | `1.83` | house edge: odds are priced at fair x JUICE/2 (CASINO_JUICE_FACTOR) | mixed: load-time module-level use NO; casinoOddsCredits_ no; casinoOddsSports_ no; processCasinoLedger_ yes | none |
| G51 | `phase05-citizens/casinoLedgerEngine.js:44` | `CASINO_DEBT_MAX` | `6` | ceiling on a citizen casino debt level (+1 per loss, capped here) | NO (casinoApplyMoney_) | none |
| G52 | `phase05-citizens/casinoLedgerEngine.js:45` | `CASINO_STAKE_FLOOR` | `20` | smallest stake | NO (casinoStake_) | none |
| G53 | `phase05-citizens/casinoLedgerEngine.js:46` | `CASINO_STAKE_CEIL` | `2000` | largest stake | NO (casinoStake_) | none |
| G54 | `phase05-citizens/casinoLedgerEngine.js:403` | `(inline)` | `nw * 0.04` | stake cap as a share of NetWorth | NO (casinoStake_(income,netWorth,wealthLevel,rng,posture,tilt)) | literal (no name) |
| G55 | `phase05-citizens/casinoLedgerEngine.js:47` | `CASINO_NW_FLOOR` | `1000` | NetWorth below which a citizen does not bet | NO (casinoEligible_) | none |
| G56 | `phase05-citizens/casinoLedgerEngine.js:48` | `CASINO_COOL_LOSSES` | `3` | losses in a row that trigger a cooldown | NO (casinoCooldown_) | none |
| G57 | `phase05-citizens/casinoLedgerEngine.js:49` | `CASINO_COOL_CYCLES` | `3` | cooldown length (cycles) | NO (casinoCooldown_) | none |
| G58 | `phase05-citizens/casinoLedgerEngine.js:50` | `CASINO_BIG_LOSS` | `0.5` | a settled stake this share of the weekly budget earns the long cooldown | NO (casinoCooldown_) | none |
| G59 | `phase05-citizens/casinoLedgerEngine.js:51` | `CASINO_BIG_COOL` | `2` | cooldown length after a big loss (cycles) | NO (casinoCooldown_) | none |
| G60 | `phase05-citizens/casinoLedgerEngine.js:52` | `CASINO_VOID_AFTER` | `3` | cycles after placing before an open wager is voided | yes (processCasinoLedger_) | none |
| G61 | `phase05-citizens/casinoLedgerEngine.js:53` | `CASINO_SHRINK` | `8` | pseudo-count that shrinks a team record toward even in the sports odds | NO (casinoOddsSports_) | none |
| G62 | `phase05-citizens/casinoLedgerEngine.js:54` | `CASINO_ODDS_FLOOR` | `1.40` | lowest posted odds on the show market | yes (processCasinoLedger_) | none |
| G63 | `phase05-citizens/casinoLedgerEngine.js:55` | `CASINO_ODDS_CEIL` | `8.00` | highest posted odds (show and sports) | mixed: casinoOddsSports_ no; processCasinoLedger_ yes | none |
| G64 | `phase05-citizens/casinoLedgerEngine.js:56` | `CASINO_SPORTS_FLOOR` | `1.05` | lowest sports odds | NO (casinoOddsSports_) | none |
| G65 | `phase05-citizens/casinoLedgerEngine.js:57` | `CASINO_PLACE_P` | `0.012` | weekly odds a citizen places a bet | yes (processCasinoLedger_) | none |
| G66 | `phase05-citizens/casinoLedgerEngine.js:58` | `CASINO_DRIVE_F_` | `[1.0, 1.0, 1.0, 1.4, 1.4]` | placing-odds multiplier by drive band (table) | yes (processCasinoLedger_) | none |
| G67 | `phase05-citizens/casinoLedgerEngine.js:66` | `UNDOCKED_CAST_N` | `3` | cast size drawn for the UNDOCKED show | yes (undockedDrawCast_) | none |
| G68 | `phase05-citizens/casinoLedgerEngine.js:67` | `UNDOCKED_ALT_N` | `3` | alternates drawn | yes (undockedDrawCast_) | none |
| G69 | `phase05-citizens/casinoLedgerEngine.js:68` | `UNDOCKED_MIN_AGE` | `18` | age floor to be drawn | NO (undockedEligible_) | none |
| G70 | `phase05-citizens/casinoLedgerEngine.js:986` | `(inline)` | `rng() < 0.5` | when both a show and a sports bet are wanted: show vs sports | yes (processCasinoLedger_) | literal (no name) |
| G71 | `phase05-citizens/casinoLedgerEngine.js:1000` | `(inline)` | `kindRoll < 0.55` | bet kind mix: market 1 (pos / neg side) below this edge | yes (processCasinoLedger_) | literal (no name) |
| G72 | `phase05-citizens/casinoLedgerEngine.js:1003` | `(inline)` | `rng() < 0.5` | market 1: pos vs neg side | yes (processCasinoLedger_) | literal (no name) |
| G73 | `phase05-citizens/casinoLedgerEngine.js:1005` | `(inline)` | `kindRoll < 0.85` | bet kind mix: "mishap" market (yes / no side) below this edge | yes (processCasinoLedger_) | literal (no name) |
| G74 | `phase05-citizens/casinoLedgerEngine.js:1008` | `(inline)` | `rng() < 0.5` | mishap market: yes vs no side | yes (processCasinoLedger_) | literal (no name) |
| G75 | `phase05-citizens/casinoLedgerEngine.js:1020` | `(inline)` | `rng() < 0.55` | win / loss side of the draw | yes (processCasinoLedger_) | literal (no name) |

Candidates in Cut G: 75.

## Cut D — dial sizes and memory

`citizenDialMap.js` and `citizenMemory.js` have no `ctx` anywhere; `compressLifeHistory.js` has it only in `compressLifeHistory_` and what it calls (the ctx column says which row). `citizenMemory.js` already takes tuning from World_Config through a setter: `setDialTuning_(t)` (`utilities/citizenMemory.js:50`) is called once a Cycle from `compressLifeHistory.js` `readDialTuning_(ctx)` (`utilities/compressLifeHistory.js:299`) for `dialMoodFade` and `dialHardenShare`; with no call the module keeps the constants. `BAND_DELTA` is read by `gradedNudges_` (`utilities/citizenDialMap.js:356`) and `gradedTag_` (`utilities/citizenDialMap.js:365`), exported at `utilities/citizenDialMap.js:617`. `nudgesForEvent_` (which reaches `gradedNudges_`) is called, with no ctx, from: `phase04-events/generateGameModeMicroEvents.js:531`, `phase05-citizens/generateCitizensEvents.js:1287`, `phase05-citizens/generateMediaModeEvents.js:433`, `phase05-citizens/generateCivicModeEvents.js:473`, `utilities/citizenMemory.js:169`, `utilities/compressLifeHistory.js:1900`, `utilities/compressLifeHistory.js:1945`, `lib/resonanceRecall.js:74`, `lib/wakePerception.js:42`, `scripts/seedTier1EssenceLive.js:67`, `scripts/seedTier1EssenceLive.js:131`, `scripts/deadBranchScan.js:217`, `scripts/deadBranchScan.js:276`, `scripts/backdateCitizenDials.js:67`, `scripts/_probe_classifier.js:116`, `scripts/seedTier1Essence.js:35`. `scripts/citizenDials.test.js:239` and `scripts/citizenDials.test.js:243` assert it is 1 / 2 / 4. A moved `BAND_DELTA` therefore needs a loader that works with no World_Config (the node callers), not only a setter.

| # | file:line | name / expression | value | controls | ctx at use site | tests / other code naming it |
|---|---|---|---|---|---|---|
| D1 | `utilities/citizenDialMap.js:343` | `BAND_DELTA` | `{ S: 1, M: 2, L: 4 }` | dial points a graded line (S / M / L) moves a citizen: 1 / 2 / 4 | NO (gradedNudges_, gradedTag_) | tests: citizenDials.test.js |
| D2 | `utilities/citizenDialMap.js:480` | `PRESSURE_LOOKBACK` | `3` | cycles back a pressure tag still counts as an ongoing breach | NO (pressureState_) | none |
| D3 | `utilities/citizenDialMap.js:481` | `PRESSURE_ADAPT` | `6` | consecutive tagged cycles before the citizen adapts | mixed: pressureState_ no; pressureRun_ no; emitPressureTag_ yes | tests: integrityWear.test.js |
| D4 | `utilities/citizenDialMap.js:482` | `PRESSURE_SCAN_LINES` | `24` | LifeHistory lines scanned for pressure tags | NO (pressureState_, pressureRun_) | none |
| D5 | `utilities/citizenDialMap.js:268` | `PRESSURE_CAUSE_FX` | `{ rent: { outabout: -1 }, debt: { outabout: -1 }, hood: { outabout: -1 }, unemployed: { driv...` | second-dial nudge per pressure cause (table) | NO (nudgesForEvent_) | none |
| D6 | `utilities/citizenDialMap.js:292` | `EDITION_FX` | `{ sociability: 2 }` | sociability points a newsroom edition citation gives (table) | NO (nudgesForEvent_) | none |
| D7 | `utilities/citizenMemory.js:37` | `MOOD_DECAY` | `0.8` | share of a temporary swing kept each cycle (seed dialMoodFade is a copy) | mixed: load-time module-level use NO; setDialTuning_ no | tests: dialMoves.test.js; code: utilities/compressLifeHistory.js |
| D8 | `utilities/citizenMemory.js:40` | `MOOD_DECAY_BY_DIAL` | `{ fandom: 0.9 }` | per-dial override of that fade (fandom 0.9) | NO (settleCycle_) | none |
| D9 | `utilities/citizenMemory.js:41` | `HARDEN_STREAK` | `3` | same-direction pushes before a swing bakes into the baseline | NO (applyEvent_) | none |
| D10 | `utilities/citizenMemory.js:42` | `HARDEN_FRACTION` | `0.4` | share of a sustained swing that bakes in (seed dialHardenShare is a copy) | mixed: load-time module-level use NO; setDialTuning_ no | tests: dialMoves.test.js |
| D11 | `utilities/citizenMemory.js:63` | `CHAOS_FADE_GAP` | `6` | chaos-free cycles before exposure fades one step | NO (decayChaosExposure_) | none |
| D12 | `utilities/citizenMemory.js:69` | `BAND_MULT` | `[0.5, 0.75, 1.0, 1.25, 1.5]` | event-probability multiplier by dial band (table) | NO (dialMultiplier_) | tests: citizenDials.test.js |
| D13 | `utilities/citizenMemory.js:512` | `CONTEST_GAIN` | `0.08` | contest roll: odds shift per point of dial gap | partial: S/cfg only (contestRoll_) | none |
| D14 | `utilities/citizenMemory.js:512` | `CONTEST_FLOOR` | `0.2` | contest roll: lowest odds | partial: S/cfg only (contestRoll_) | none |
| D15 | `utilities/citizenMemory.js:512` | `CONTEST_CEIL` | `0.8` | contest roll: highest odds | partial: S/cfg only (contestRoll_) | none |
| D16 | `utilities/compressLifeHistory.js:75` | `TAG_DECAY_RATE` | `0.95` | decay per unit of a tag in the compressed profile | NO (computeProfile_) | none |
| D17 | `utilities/compressLifeHistory.js:78` | `KEEP_RAW_ENTRIES` | `20` | raw LifeHistory entries kept per citizen | yes (compressLifeHistory_) | none |
| D18 | `utilities/compressLifeHistory.js:81` | `MIN_CYCLES_BETWEEN_COMPRESS` | `5` | cycles between compression runs per citizen | yes (compressLifeHistory_) | none |
| D19 | `utilities/compressLifeHistory.js:126` | `REFLECTION_MULT` | `0.45` | reflection weight (x ACCRETION_FRAC = seed dialReflectionShare 0.225) | NO: load-time use at module level | tests: compressLifeHistory.dial.test.js, citizenDials.test.js, dialMoves.test.js; code: scripts/drainReflectionBacklog.js |
| D20 | `utilities/compressLifeHistory.js:127` | `REFLECTION_ACCRETION_FRAC` | `0.5` | accretion share of a reflection | mixed: load-time module-level use NO; compressLifeHistory_ yes | tests: compressLifeHistory.dial.test.js, citizenDials.test.js, dialMoves.test.js; code: scripts/drainReflectionBacklog.js |
| D21 | `utilities/compressLifeHistory.js:143` | `BOND_NUDGE` | `0.25` | bond intensity nudge per named reflection | yes (compressLifeHistory_) | tests: compressLifeHistory.bond.test.js |
| D22 | `utilities/compressLifeHistory.js:144` | `BOND_NUDGE_CYCLE_CAP` | `0.5` | most a bond pair moves from reflections in a Cycle | NO (nudgeBondIntensity_) | tests: compressLifeHistory.bond.test.js |
| D23 | `utilities/compressLifeHistory.js:322` | `DIAL_MOVE_MIN` | `0.05` | smallest dial change written to Dial_Moves | yes (buildDialMoves_) | none |
| D24 | `utilities/compressLifeHistory.js:1701` | `GRIEF_SOURCE_CAP` | `3` | POPIDs of provenance kept on a grief record | NO (foldGriefCascades_, activeGriefFromRegisters_) | none |
| D25 | `utilities/compressLifeHistory.js:1802` | `BIAS_CAP` | `5` | bias targets kept per citizen | NO (foldBiasIntents_) | none |
| D26 | `utilities/compressLifeHistory.js:1803` | `BIAS_S_MAX` | `3` | cap on a bias sentiment magnitude | NO (foldBiasIntents_) | none |
| D27 | `utilities/compressLifeHistory.js:1858` | `UNLIVED_CAP` | `3` | unlived-branch entries kept per citizen | NO (captureUnlived_) | none |

Candidates in Cut D: 27.

## Same number in two places

| # | number | place 1 | place 2 | note |
|---|---|---|---|---|
| S1 | 12 months of savings buffer | `phase05-citizens/householdFormationEngine.js:117` | `phase05-citizens/migrationTrackingEngine.js:93` | one global name declared in two files; both comments say "keep the two aligned" |
| S2 | 48,000 off-camera income | `phase05-citizens/householdFormationEngine.js:122`, `phase05-citizens/householdFormationEngine.js:289` | `phase05-citizens/bondEngine.js:1986` | three names; comments say "same rate" on purpose (`householdFormationEngine.js:287-288`) |
| S3 | rent burden 0.50 / 0.40 | `phase05-citizens/householdFormationEngine.js:110`, `phase05-citizens/householdFormationEngine.js:111` | `phase05-citizens/migrationTrackingEngine.js:406`, `phase05-citizens/migrationTrackingEngine.js:407` | migration reads the household constant with a typeof guard and an in-code copy as fallback |
| S4 | 2% big week | `phase05-citizens/bondEngine.js:796` | `phase05-citizens/bondEngine.js:797` | one number twice on adjacent lines; moving one without the other changes the step window |
| S5 | bond intensity 0..10 | `phase05-citizens/bondEngine.js:916`, `phase05-citizens/bondEngine.js:917` | `utilities/compressLifeHistory.js:145` | bound defined in both files; `bondEngine.js:1633` clamps at 0 a third time |
| S6 | dial speed: 0.8 / 0.4 / 1 / 0 / 0.225 | `utilities/citizenMemory.js:37`, `utilities/citizenMemory.js:42` | `utilities/compressLifeHistory.js:295` (table :293-297); seeds `dialMoodFade` 0.8, `dialHardenShare` 0.4, `dialLineScale` 1, `dialDirectShare` 0, `dialReflectionShare` 0.225 (phase01-config/engine94SheetContract.js:457-461) | three copies (module constant, tuning-table default, seed); 0.225 = `REFLECTION_MULT` 0.45 x `REFLECTION_ACCRETION_FRAC` 0.5 (`compressLifeHistory.js:126-127`); `scripts/dialMoves.test.js:73` mirrors the seeds, `:228` asserts the reset equals the constants |
| S7 | 0.5 owner share | `phase05-citizens/generationalWealthEngine.js:1057` | phase01-config/engine94SheetContract.js:534 `ownerDrawShare` 0.5 | the constant is the pre-move copy and is read nowhere; `HERITAGE_GAIN_SHARE` (:1058) is also 0.5 but a separate rule |
| S8 | 0.30 housing share | `phase05-citizens/generationalWealthEngine.js:1796` | phase01-config/engine94SheetContract.js:137 `hoodRentShare` 0.30 | the engine.160 comment states they are the same share on purpose (`phase01-config/engine94SheetContract.js:131`) |
| S9 | 0.18 chaos ship, 60 min fire guard, 0.85 fade, 5 streak | in-code defaults (A8) | seeds `chaosShipChancePerCycle`, `fireGuardMinutes`, `sportsFadeRate`, `sportsStreakHeadline` | default and seed must agree by hand |
| S10 | illness baseline 5% vs 3.5% | `phase01-config/godWorldEngine2.js:1412` | seed `illnessBaseline` 0.035 (phase01-config/engine94SheetContract.js:37) | the death-rate coupling reads illness above a hard-coded 0.05 (comment: "At 5% illness (baseline)"), while the city illness attractor rests at 0.035; the coupling's reference is not the baseline the sim now uses |
| S11 | 2040 year anchor / 52 cycles a year | `phase01-config/advanceSimulationCalendar.js:334` | live row `worldYearBase` 2039 (row 65) | row unread (2.5) |
| S12 | age floors for a parent | `phase04-events/generationalEventsEngine.js:81`, `phase04-events/generationalEventsEngine.js:87` | `phase05-citizens/processAdvancementIntake.js:1796`, `phase05-citizens/processAdvancementIntake.js:1797`; dead: `householdFormationEngine.js:129-130` 20 / 45 | 26-40 (birth), 21 (spouse) and 21-40 (family row mint) are three live rules that rhyme; the dead 20 / 45 would conflict if revived |
| S13 | 25 fame bar, 10 quiet cycles | `phase05-citizens/processAdvancementIntake.js:1469`, `phase05-citizens/processAdvancementIntake.js:1418` | `phase07-evening-media/culturalLedger.js:81`, `phase07-evening-media/culturalLedger.js:82` | same values, different quantities (UsageCount vs FameScore); do not merge without a ruling |
| S14 | 1.5 household boost | `phase04-events/generationalEventsEngine.js:1054` | `phase05-citizens/bondEngine.js:1975` | wedding odds vs romance step; two rules, one value |
| S15 | 6 cycles to adapt | `utilities/citizenDialMap.js:481` | `phase05-citizens/bondEngine.js:1979` | two rules, one value |
| S16 | validation bounds | each seed row's min / max (`phase01-config/engine94SheetContract.js`) | `phase05-citizens/runCivicRoleEngine.js:316`, `utilities/compressLifeHistory.js:293` (min, max in the table) | the allowed range of a seeded key is written in the seed and again in the reader |

Same number in two places: 16 groups.

## Appendix E — ladder lines, as written

**phase05-citizens/generateCitizensEvents.js:3329-3454** — participation chance per engine citizen (cut B; cap is PARTICIPATION_MAX, B2) (42 lines)

```
L3331 if (weather.impact >= 1.3) chance += 0.01;
L3332 if (dynamics.sentiment <= -0.3) chance += 0.01;
L3333 if (chaos.length > 0) chance += 0.015;
L3334 if (season === "Winter") chance += 0.005;
L3335 if (season === "Summer") chance += 0.005;
L3336 if (econMood <= 35 || econMood >= 65) chance += 0.005;
L3339 if (holidayPriority === "major") chance += 0.02;
L3340 else if (holidayPriority === "oakland") chance += 0.02;
L3341 else if (holidayPriority === "cultural") chance += 0.015;
L3342 else if (holidayPriority === "minor") chance += 0.008;
L3344 if (isFirstFriday) {
L3345 chance += 0.015;
L3346 if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal" || neighborhood === "Jack Lond
L3347 chance += 0.01;
L3351 if (isCreationDay) chance += 0.01;
L3353 if (sportsRung === "championship") chance += 0.015;
L3354 else if (sportsRung === "playoffs" || sportsRung === "post-season") chance += 0.01;
L3356 if (dynamics.culturalActivity >= 1.4) chance += 0.008;
L3357 if (dynamics.communityEngagement >= 1.3) chance += 0.005;
L3360 if (nhQoL <= 0.35) chance += 0.012; // More events in low-QoL areas (stress, tension)
L3361 if (isHotspot) chance += 0.008; // Hotspots generate more citizen reactions
L3362 if (enforcementCapacity < 0.6) chance += 0.005; // Stretched enforcement = more noticeable events
L3366 if (dynamics.nightlife && dynamics.nightlife >= 1.2) chance += 0.004;
L3367 if (isFirstFriday) chance += 0.003;
L3369 if (ageGroup === "senior" && dynamics.communityEngagement >= 1.2) chance += 0.003;
L3373 if (usageCount >= 8) chance += 0.005;
L3375 if (weather.impact >= 1.3) chance += 0.003;
L3381 if (prevCrowdScore >= 6) chance += 0.008;
L3382 if (prevCrowdScore >= 8) chance += 0.005;
L3385 if (typeof getCombinedEventBoost_ === "function") {
L3386 var eventBoost = getCombinedEventBoost_(ctx, popId);
L3387 chance *= eventBoost;
L3427 if (hasRivalry) chance += 0.02;
L3438 if (typeof getWeatherEventModifier_ === "function") {
L3439 var weatherMod = getWeatherEventModifier_(ctx, "social");
L3440 chance *= weatherMod;
L3443 if (typeof getMediaEventModifier_ === "function") {
L3444 var mediaMod = getMediaEventModifier_(ctx, "social");
L3445 chance *= mediaMod;
L3448 if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
L3449 chance += 0.01;
L3454 if (griefState) chance *= griefConfig.participationMultiplier;
```

**phase05-citizens/runCareerEngine.js:1547-1604** — career drift-texture chance (23 lines)

```
L1547 var chance = 0.02;
L1550 if (weather.impact >= 1.3) chance += 0.01;
L1553 if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;
L1556 if (season === "Fall") chance += 0.01;
L1557 if (season === "Spring") chance += 0.005;
L1560 if (dynamics.sentiment <= -0.3) chance += 0.015;
L1563 if (econMood <= 35) chance += 0.01;
L1564 if (econMood >= 65) chance += 0.005;
L1567 if (chaos.length > 0) chance += 0.015;
L1570 if (holidayPriority === "major") chance += 0.01;
L1571 else if (holidayPriority === "minor") chance += 0.005;
L1574 if (holiday === "Thanksgiving") {
L1575 chance += 0.008;
L1580 if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
L1581 chance += 0.015;
L1582 } else {
L1583 chance += 0.005;
L1588 if (isCreationDay) chance += 0.008;
L1591 if (dynamics.culturalActivity >= 1.4) chance += 0.005;
L1594 if (dynamics.communityEngagement >= 1.3) chance += 0.005;
L1598 if (macroP <= -0.65 || macroP >= 0.7) chance += 0.006;
L1601 if (dialBands) chance *= dialBands.careerFreq;
L1604 if (chance > 0.14) chance = 0.14;
```

**phase05-citizens/runEducationEngine.js:494-539** — education drift chance (22 lines)

```
L494 var chance = 0.02;
L496 if (weather.impact >= 1.3) chance += 0.01;
L497 if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) chance += 0.005;
L498 if (season === "Spring") chance += 0.01;
L499 if (season === "Fall") chance += 0.005;
L500 if (dynamics.sentiment <= -0.3) chance += 0.01;
L501 if (econMood <= 35) chance += 0.01;
L502 if (chaos.length > 0) chance += 0.015;
L505 if (age >= 18 && age <= 35) chance += 0.01;
L508 if (holidayPriority === "cultural") chance += 0.012; // Cultural holidays boost learning
L509 else if (holidayPriority === "major") chance += 0.005;
L512 if (holiday === "BackToSchool") {
L513 chance += 0.015;
L518 if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
L519 chance += 0.015;
L520 } else {
L521 chance += 0.008;
L526 if (isCreationDay) chance += 0.008;
L529 if (dynamics.culturalActivity >= 1.4) chance += 0.008;
L532 if (dynamics.communityEngagement >= 1.3) chance += 0.005;
L537 if (dialBands) chance *= dialBands.mult.openness;
L539 if (chance > 0.12) chance = 0.12;
```

**phase05-citizens/runHouseholdEngine.js:608-654** — household drift chance (20 lines)

```
L608 var chance = 0.02;
L611 if (season === "Winter") chance += 0.01;
L612 if (season === "Fall") chance += 0.005;
L615 if (weather.impact >= 1.3) chance += 0.01;
L616 if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.01;
L619 if (dynamics.sentiment <= -0.3) chance += 0.008;
L620 if (dynamics.sentiment >= 0.3) chance += 0.005;
L623 if (econMood <= 35) chance += 0.01;
L626 if (chaos.length > 0) chance += 0.01;
L629 if (holidayPriority === "major") chance += 0.015;
L630 else if (holidayPriority === "cultural") chance += 0.012;
L631 else if (holidayPriority === "minor") chance += 0.005;
L634 if (holiday === "Thanksgiving" || holiday === "Holiday" ||
L635 holiday === "Easter" || holiday === "Halloween") {
L636 chance += 0.02;
L640 if (isFirstFriday) chance += 0.005;
L643 if (isCreationDay) chance += 0.008;
L646 if (dynamics.communityEngagement >= 1.3) chance += 0.005;
L651 if (dialBands) chance *= dialBands.familyFreq;
L654 if (chance > 0.12) chance = 0.12;
```

**phase05-citizens/runNeighborhoodEngine.js:543-603** — neighborhood (out-and-about) drift chance (27 lines)

```
L543 var driftChance = 0.02;
L546 if (weather.impact >= 1.3) driftChance += 0.015;
L547 if (weather.type === "fog") driftChance += 0.01;
L548 if (weather.type === "rain") driftChance += 0.01;
L551 if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) driftChance += 0.01;
L552 if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) driftChance += 0.01;
L555 if (season === "Winter") driftChance += 0.01;
L556 if (season === "Summer") driftChance += 0.005;
L559 if (dynamics.sentiment <= -0.3) driftChance += 0.015;
L560 if (dynamics.sentiment >= 0.3) driftChance += 0.005;
L563 if (dynamics.culturalActivity >= 1.4) driftChance += 0.01;
L566 if (dynamics.communityEngagement >= 1.3) driftChance += 0.008;
L569 if (econMood <= 35) driftChance += 0.01;
L572 if (chaos.length > 0) driftChance += 0.015;
L575 if (holidayPriority === "major") driftChance += 0.012;
L576 else if (holidayPriority === "cultural") driftChance += 0.015;
L577 else if (holidayPriority === "oakland") driftChance += 0.012;
L578 else if (holidayPriority === "minor") driftChance += 0.005;
L582 if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal") {
L583 driftChance += 0.025; // Higher in art walk neighborhoods
L584 } else {
L585 driftChance += 0.01;
L590 if (isCreationDay) driftChance += 0.01;
L593 if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
L594 driftChance += 0.02;
L600 if (dialBands) driftChance *= dialBands.mult.outabout;
L603 if (driftChance > 0.12) driftChance = 0.12;
```

**phase05-citizens/runRelationshipEngine.js:442-541** — relationship drift chance (37 lines)

```
L442 var driftChance = 0.02; // base chance
L445 if (season === "Winter") driftChance += 0.005;
L446 if (season === "Spring") driftChance += 0.010;
L447 if (season === "Summer") driftChance += 0.015;
L448 if (season === "Fall") driftChance += 0.008;
L451 if (weather.type === "rain") driftChance += 0.005;
L452 if (weather.type === "fog") driftChance += 0.007;
L453 if (weather.type === "hot") driftChance += 0.005;
L456 if (dynamics.sentiment >= 0.4) driftChance += 0.005;
L457 if (dynamics.sentiment <= -0.4) driftChance += 0.010;
L460 if (dynamics.culturalActivity >= 1.4) driftChance += 0.01;
L463 if (dynamics.communityEngagement >= 1.3) driftChance += 0.008;
L466 if (chaos.length > 0) driftChance += 0.015;
L469 if (holidayPriority === "major") driftChance += 0.015;
L470 else if (holidayPriority === "cultural") driftChance += 0.012;
L471 else if (holidayPriority === "oakland") driftChance += 0.01;
L472 else if (holidayPriority === "minor") driftChance += 0.005;
L475 if (isFirstFriday) driftChance += 0.015;
L478 if (isCreationDay) driftChance += 0.012;
L481 if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
L482 driftChance += 0.02; // Extra boost if in the holiday's focal neighborhood
L488 var eventBoost = getCombinedEventBoost_(ctx, popId);
L489 driftChance *= eventBoost;
L498 if (hasRivalry) driftChance += 0.015;
L513 if (typeof getWeatherEventModifier_ === 'function') {
L514 var weatherMod = getWeatherEventModifier_(ctx, 'social');
L515 driftChance *= weatherMod;
L519 if (typeof getEconomicEventModifier_ === 'function') {
L520 var econMod = getEconomicEventModifier_(ctx, 'social');
L521 driftChance *= econMod;
L525 if (typeof getMediaEventModifier_ === 'function') {
L526 var mediaMod = getMediaEventModifier_(ctx, 'social');
L527 driftChance *= mediaMod;
L531 if (typeof hasWeatherCondition_ === 'function' && hasWeatherCondition_(ctx, 'heat_wave')) {
L532 driftChance += 0.01;
L538 if (dialBands) driftChance *= dialBands.mult.sociability;
L541 if (driftChance > 0.15) driftChance = 0.15;
```

**phase05-citizens/runAsUniversePipeline.js:580-614** — AsUniverse pipeline chance (16 lines)

```
L580 var chance = 0.02;
L583 if (season === "Winter") chance += 0.005;
L584 if (season === "Spring") chance += 0.005;
L587 if (weather.impact >= 1.3) chance += 0.005;
L590 if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;
L593 if (dynamics.sentiment <= -0.3) chance += 0.004;
L596 if (chaos.length > 0) chance += 0.005;
L599 if (holidayPriority === "major") chance += 0.008;
L600 else if (holidayPriority === "oakland") chance += 0.01;
L601 else if (holidayPriority === "cultural") chance += 0.005;
L604 if (isFirstFriday) chance += 0.005;
L607 if (isCreationDay) chance += 0.006;
L610 if (canonSportsPhase === "in-season") chance += 0.004;
L611 if (canonSportsPhase === "spring-training") chance += 0.003;
L612 if (canonSportsPhase === "off-season") chance += 0.003;
L614 if (chance > 0.10) chance = 0.10;
```

**phase05-citizens/checkForPromotions.js:188-292** — promotion chance modifier (base 0.20 passed at :324) (35 lines)

```
L196 if (season === "Spring") c += 0.05;
L197 if (season === "Fall") c += 0.03;
L202 if (weather.impact >= 1.3) c += 0.02;
L203 if (weatherMood.perfectWeather) c += 0.02;
L208 if (chaos.length > 0) c += 0.04;
L213 if (dynamics.sentiment >= 0.3) c += 0.03;
L214 if (dynamics.sentiment <= -0.3) c -= 0.02;
L219 if (econMood >= 65) c += 0.02;
L220 if (econMood <= 35) c -= 0.02;
L230 if (gatheringHolidays.indexOf(holiday) >= 0) {
L231 c += 0.03;
L239 if (holidayPriority === "major") {
L240 c += 0.02;
L244 if (isFirstFriday) {
L245 c += 0.04;
L247 if (artsNeighborhoods.indexOf(neigh) >= 0) {
L248 c += 0.03;
L253 if (occ.indexOf(creativeOccs[co]) >= 0) {
L254 c += 0.03;
L261 if (isCreationDay) {
L262 c += 0.05;
L266 if (sportsRung === "championship") {
L267 c += 0.04;
L268 } else if (sportsRung === "playoffs" || sportsRung === "post-season") {
L269 c += 0.02;
L273 if (dynamics.culturalActivity >= 1.4) {
L274 c += 0.03;
L278 if (dynamics.communityEngagement >= 1.4) {
L279 c += 0.03;
L280 } else if (dynamics.communityEngagement <= 0.7) {
L281 c -= 0.02;
L286 if (quietHolidays.indexOf(holiday) >= 0) {
L287 c -= 0.03;
L291 if (c > 0.45) c = 0.45;
L292 if (c < 0.05) c = 0.05;
```

**phase05-citizens/generateCivicModeEvents.js:413-436** — civic-figure event chance (12 lines)

```
L413 var chance = 0.15;
L414 if (tier === 1) chance += 0.05;
L415 else if (tier === 2) chance += 0.03;
L418 if (civicLoad === "load-strain") chance += 0.05;
L419 else if (civicLoad === "minor-variance") chance += 0.02;
L422 if (votesThisCycle.length > 0) chance += 0.05;
L423 if (grantsThisCycle.length > 0) chance += 0.03;
L426 if (Math.abs(sentiment) >= 0.3) chance += 0.03;
L429 if (weather.impact >= 1.3) chance += 0.02;
L430 if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.02;
L433 chance *= healthPenalty;
L436 if (chance > 0.40) chance = 0.40;
```

**phase05-citizens/generateMediaModeEvents.js:362-387** — journalist event chance (12 lines)

```
L362 var chance = 0.20;
L363 if (tier === 1) chance += 0.10;
L364 else if (tier === 2) chance += 0.05;
L367 if (civicLoad === "load-strain") chance += 0.05;
L368 else if (civicLoad === "minor-variance") chance += 0.02;
L371 if (votesThisCycle.length > 0) chance += 0.05;
L374 if (culturalActivity >= 1.5) chance += 0.03;
L377 if (Math.abs(sentiment) >= 0.3) chance += 0.03;
L380 if (weather.impact >= 1.3) chance += 0.02;
L381 if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.02;
L384 chance *= healthPenalty;
L387 if (chance > 0.45) chance = 0.45;
```

**phase05-citizens/runConductEngine.js:202-215** — moral-test chance (6 lines)

```
L202 var chance = 0.012;
L205 var conductCur = dialBands.current;
L206 chance *= 1 + 0.25 * dialLow_(conductCur.composure, 1);
L207 if (econMood <= 35) chance *= 1.2;
L212 if (spike) chance *= 0.7;
L215 if (chance > 0.03) chance = 0.03;
```

**phase05-citizens/generateGenericCitizens.js:307-363** — generic-citizen count rolls (each adds 1 to baseCount) (19 lines)

```
L307 if (chaos.length > 0 && rand() < 0.4) baseCount += 1;
L310 if (weather.impact >= 1.3 && rand() < 0.3) baseCount += 1;
L313 if (econMood >= 65 && rand() < 0.3) baseCount += 1;
L316 if (weatherMood.perfectWeather && rand() < 0.2) baseCount += 1;
L326 if (travelHolidays.indexOf(holiday) >= 0) {
L327 baseCount += 1;
L335 if (isFirstFriday && rand() < 0.4) {
L336 baseCount += 1;
L340 if (isCreationDay && rand() < 0.3) {
L341 baseCount += 1;
L345 if (sportsRung === "championship") {
L346 baseCount += 1;
L347 } else if ((sportsRung === "playoffs" || sportsRung === "post-season") && rand() < 0.4) {
L348 baseCount += 1;
L352 if (dynamics.culturalActivity >= 1.4 && rand() < 0.3) {
L353 baseCount += 1;
L357 if (dynamics.communityEngagement >= 1.4 && rand() < 0.25) {
L358 baseCount += 1;
L363 if (quietHolidays.indexOf(holiday) >= 0 && rand() < 0.5) {
```

**phase05-citizens/applyNamedCitizenSpotlight.js:256-446** — spotlight scoring and threshold (40 lines)

```
L256 scores[pid] += 3; // This IS event-specific (civic event during strain)
L263 if (econMood <= 35 && evTypeLower === "economic") {
L264 scores[pid] += 2; // Event-specific: economic event during stress
L312 if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
L313 scores[pid] += 3;
L318 if (evTag.indexOf("holiday") !== -1) {
L319 scores[pid] += 2;
L328 if (evTypeLower === "culture") {
L329 scores[pid] += 3; // Event-specific
L332 if (evTypeLower === "community") {
L333 scores[pid] += 2; // Event-specific
L336 if (evTag.indexOf("firstfriday") !== -1) {
L337 scores[pid] += 2; // Event-specific
L341 if (neighborhood === "Uptown" || neighborhood === "KONO" ||
L342 neighborhood === "Temescal" || neighborhood === "Jack London") {
L343 scores[pid] += 2;
L352 if (evTypeLower === "community") {
L353 scores[pid] += 3; // Event-specific
L356 if (evTypeLower === "civic") {
L357 scores[pid] += 2; // Event-specific
L360 if (evTag.indexOf("creationday") !== -1) {
L361 scores[pid] += 2; // Event-specific
L370 if (sportsRung === "championship") {
L371 scores[pid] += 5; // Event-specific (sports event during championship)
L373 } else if (sportsRung === "playoffs" || sportsRung === "post-season") {
L374 scores[pid] += 3;
L376 } else if (sportsRung === "late-season") {
L377 scores[pid] += 1;
L386 if (dynamics.culturalActivity >= 1.4 && evTypeLower === "culture") {
L387 scores[pid] += 2;
L394 if (dynamics.communityEngagement >= 1.3 && evTypeLower === "community") {
L395 scores[pid] += 2;
L434 var baseThreshold = 6;
L437 if (chaos.length > 0) baseThreshold -= 1;
L438 if (shock && shock !== "none") baseThreshold -= 2;
L439 if (econMood <= 35) baseThreshold -= 1;
L442 if (holidayPriority === "major" || holidayPriority === "oakland") {
L443 baseThreshold -= 1;
L445 if (isFirstFriday) baseThreshold -= 0.5;
L446 if (isCreationDay) baseThreshold -= 0.5;
```

## Appendix F — life-event modifier lines, as written

**phase04-events/generationalEventsEngine.js:1025-1040** — graduation

```
L1029 var c = 0.005;
L1030 if (tier >= 3) c = 0.01;
L1031 if (age >= 24 && age <= 26) c += 0.005;
L1033 if (cal.season === "spring") c *= 3.0;
L1034 if (cal.month === 5 || cal.month === 6) c *= 2.0;
L1036 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1056-1085** — wedding

```
L1060 var c = 0.002;
L1061 if (hasHousehold) c *= HOUSEHOLD_MARRIAGE_BOOST; // engine.57 P4
L1062 if (age >= 28 && age <= 35) c = 0.004;
L1063 if (age > 40) c = 0.001;
L1065 if (cal.month === 6) c *= 3.0;
L1066 else if (cal.season === "spring" || cal.season === "summer") c *= 2.0;
L1068 if (cal.holiday === "Valentine") c *= 2.5;
L1069 if (cal.holiday === "NewYearsEve") c *= 1.5;
L1076 if (romanticBond) c += 0.01;
L1080 if (dialBands) c *= dialBands.familyFreq;
L1082 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1118-1152** — birth

```
L1126 var c = 0.003 - (childCount * 0.001);
L1127 if (age >= 28 && age <= 35) c += 0.002;
L1128 if (age > 38) c -= 0.001;
L1133 if (hhType === "family") c *= 1.25;
L1135 if (cal.month === 9) c *= 2.0;
L1136 if (cal.month >= 7 && cal.month <= 10) c *= 1.3;
L1140 if (dialBands) c *= dialBands.familyFreq;
L1147 c *= HERITAGE_BIRTH_MULT[hTier];
L1150 if (c < 0.0005) c = 0.0005;
L1151 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1346-1362** — promotion

```
L1350 var c = 0.002;
L1351 if (tier === 3) c = 0.003;
L1352 if (tier === 4) c = 0.004;
L1353 if (tier <= 2) c = 0.001;
L1355 if (cal.month === 1 || cal.month === 12) c *= 1.5;
L1359 if (dialBands) c *= dialBands.careerFreq;
L1361 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1378-1390** — retirement

```
L1382 var c = 0.02;
L1383 if (age >= 70) c = 0.05;
L1384 if (tier >= 4) c *= 0.5;
L1386 if (cal.month === 12) c *= 2.0;
L1387 if (cal.month === 1) c *= 1.5;
L1389 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1400-1415** — death

```
L1401 var c = 0.0001;
L1403 if (age >= 65) c = 0.001;
L1404 if (age >= 75) c = 0.005;
L1405 if (age >= 80) c = 0.01;
L1406 if (age >= 85) c = 0.02;
L1407 if (age >= 90) c = 0.05;
L1409 if (lifeHistory.indexOf("[Health]") >= 0) c *= 1.5;
L1410 if (cal.season === "winter") c *= 1.3;
L1411 if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0 && age >= 70) c *= 1.2;
L1413 if (chance_(ctx, 0.0002)) c = 0.01; // rare shock override
L1414 if (!chance_(ctx, c)) return null;
```

**phase04-events/generationalEventsEngine.js:1429-1440** — health event

```
L1430 var c = 0.0005;
L1431 if (age >= 50) c = 0.001;
L1432 if (age >= 60) c = 0.002;
L1433 if (age >= 70) c = 0.003;
L1435 if (cal.season === "winter") c *= 1.5;
L1436 if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) c *= 1.4;
L1437 if (cal.month === 1) c *= 1.3;
```

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| — | none approved. The cuts above are an inventory; the builder rules which, in which order, and what a row is named. | — | not started |

## Acceptance

Draft, per cut, once approved:

1. Every moved number is a World_Config row seeded at the value the code held (live value where the row already exists), a self-arming seed list entry, and a read that fails loud naming the key (P1; P2 in Phase 9+) — proven by a sandbox fire from a missing cell.
2. The same live sync, fired before and after on the shared sandbox with the same cycle seed, leaves the named tabs byte-identical and `ctx.rng.draws` equal — proven by the sandbox protocol in `docs/reference/DEPLOY.md`.
3. No in-code copy of a moved number remains (grep of the old name returns nothing outside the seed list and the test fixture) — proven by grep.
4. Tests and node-side callers named in the last column of the cut's tables still load and pass — proven by the suites touching the changed files (the engine.356 commits note the test lock; the builder lifts it).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| none yet | — | — | — |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | the eight sheet rows in 2.5 and the dead constants in Cut A have no reader | this inventory (grep of `phase*`, `utilities`, `lib`, `scripts`, `dashboard`) | a reviewer lane greps the same names; non-JS tooling (clasp-side files, `.gs`) is not swept | 2.5, Cut A |
| P2 | the 25 absent keys arm at the next live fire | this inventory | live readback after the fire shows all 25 rows | 2.1 |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | a single `ensure<N>Config_` for the engine.102 W2b rows already on the live tab (11 `cfgNum_` keys + 4 read other ways) so a fresh sheet is self-arming | this inventory, 2.3 / 2.4 | removes the in-code defaults without a behaviour change | held for builder |
| N2 | one loader for no-ctx modules (dial map, memory) that node-side callers can also call | this inventory, Cut D | `BAND_DELTA` and friends move without breaking `lib/` and `scripts/` | held for builder |

## Not swept

- **Thresholds on `>= N` / `<= N` comparisons** outside the bond functions listed — intensity, score, index, severity gates in `generateCitizensEvents.js`, `civicInitiativeEngine.js` (4,632 lines), `updateCivicApprovalRatings.js`, `processAdvancementIntake.js`, `runCareerEngine.js` (career-state tables, layoff / promotion odds `promoP`, `layoffP`, `overworkP` at `:657-675, :1519`), `educationCareerEngine.js` (`ADVANCEMENT_CYCLES` consumers), `citizenContextBuilder.js:863-879` (personalMod 0.1 / 0.2).
- **Chance variables defined away from their roll** (the roll was found, the number was not traced): `runEducationEngine.js:541` is the E3 ladder (traced); not traced: `migrationTrackingEngine.js:767` (`chance`), `runYouthEngine.js:466, :523` (`prob`, `tProb`), `civicInitiativeEngine.js:1265-1370, :1716, :2758, :2848-2869` vote odds beyond K1, `casinoLedgerEngine.js:984` (`p`), `bondEngine.js:2877, :1106, :1256`, `generationalWealthEngine.js:452-514, :2088-2262, :3243` (debt lean, default, home loss, business), `processAdvancementIntake.js:2760`, `runConductEngine.js:217` (traced: ladder), `runHouseholdEngine.js:656` (traced: ladder).
- **Rolls compared to a variable outside phase05** (found by the roll pass, chance variable not traced): the `roll-vs-expr` hits in `phase02-world-state/applyWeatherModel.js` (3), `phase03-population/generateCrisisSpikes.js` (1), `phase04-events/chaosCarsEngine.js` (2), `faithEventsEngine.js` (5), `generateGameModeMicroEvents.js` (1), `generateGenericCitizenMicroEvent.js` (1), `phase07-evening-media/textureTriggers.js` (1) — counts from the sweep, lines not listed.
- **Mixed tables** (numbers beside strings or functions) are not caught by the declaration pass: `phase05-citizens/applyBusinessDynamics.js:76` `BIZ_CLASS_MINT` was seen as a number table but not opened; `phase02-world-state/applyWeatherModel.js:64, :85, :151` (climate, front transitions, salience), `phase02-world-state/applyInitiativeImplementationEffects.js:145, :372, :403` (phase intensity, domain effects), `phase02-world-state/updateTransitMetrics.js:55, :68`, `phase03-population/updateCrimeMetrics.js:46, :71, :1093` (`CRIME_FACTORS`, `CRIME_ADVANCED`, `HOOD_QOL_WEIGHTS`), `phase03-population/generateCrisisBuckets.js:52`, `phase04-events/faithEventsEngine.js:39, :48` (`FAITH_EVENT_PROBS`, `FAITH_SEASONAL_MODS` — heads read, not listed as rows), `phase04-events/buildCityEvents.js:529`, `phase07-evening-media/cityEveningSystems.js:181-241`, `phase07-evening-media/culturalLedger.js:102`, `phase08-v3-chicago/v3NeighborhoodWriter.js:82, :141, :163-167, :243-245`, `utilities/priorityEngine.js:38, :79, :120`, `utilities/bylineEngine.js:169`, `utilities/sportsWeekRecord.js:88-215` tables, `utilities/chaosCarsConfig.js` and `utilities/chaosCarsDecay.js:36` (the chaos event config, 400+ lines of tables), `phase05-citizens/generationalWealthEngine.js:61-85, :786, :919, :1319`.
- **The `godWorldEngine2.js` population block beyond the rate rows**: `ill` / `emp` local drift at `:1300-1387` (engine.102 says these locals feed the births-deaths coupling and the summary only), migration noise `:1423-1483`.
- **`manualDynamicsInputs`, `manualMigrationInputs`, `manualStoryInputs`** (`ctx.config` reads at `applyCityDynamics.js:178`, `applyMigrationDrift.js:135`, `applyStorySeeds.js:114`) — flagged by a read-key scan, not opened.
- **`lib/`, `scripts/`, `dashboard/`** were searched for names, not swept for their own tuning numbers; Apps Script-only globals outside the ten phase dirs are not covered; `ensure*` bodies and `loadConfig_` (`godWorldEngine2.js:1019`) were not read.
- **Descriptions** in the "controls" column are one-line reads of the line, its comment and its use site; casino, wealth-heritage and several K2 rows were not read past that.

## Open questions

- Registration is owed: this file is not yet in `docs/index.md` and no ROLLOUT row points at it (written read-only plus this one file); a row is claimed only on the builder's word. — blocks any Task.
- Does the builder want a row per ladder add (about 205), a prefix family per ladder, or only the base and cap? — blocks Cut E.
- Which is true for the three legacy population rows and `employmentFloor`: the sheet value or the code / approved-plan value (2.4, 2.5)? — blocks Cuts A and I; a sim judgment.
- Pattern per phase (P1 vs P2, 2.7)? — blocks every cut that lands after Phase 8.
- (none for 2.1: the ensure runs before `loadConfig_` in the same fire, so the 25-key lag closes by itself; the readback is P2 under Needs proof.)

## Changelog

- 2026-11-25 (research-build, helper agent) — Created: inventory of 265 seeded keys, 52 unseeded live rows, 394 candidate rows (36 of them rolls with context not read), plus Cut A (10 items), 13 ladders and 5 limits, in 11 cuts; no task approved.

