# Simulation_Ledger Column Interaction Map

**Generated:** 2026-11-21 by `scripts/mapSimulationLedgerCols.js` (mechanical — no LLM).

**Source headers:** `schemas/SCHEMA_HEADERS.md` → `## Simulation_Ledger`

**Purpose:** Per-column writers/readers on Simulation_Ledger so jobs do not re-search the tree for "who mutates Income / DialState / Status".

**Regenerate:** `node scripts/mapSimulationLedgerCols.js` (after schema or engine changes)

**Machine form:** `docs/engine/SIMULATION_LEDGER_COL_MAP.json`

**Entrypoint:** [[COUPLING_INDEX]] · behavioral meaning: [[ENGINE_COUPLING_MAP]] · S.* reverse: [[ENGINE_STUB_REVERSE]]

**Method limits:** detects `header.indexOf('Col')` + `row[iCol]=` write pattern and string-literal mentions. Misses pure positional column numbers with no header name. False readers possible when a string appears only in a comment or unrelated context.

---

**Columns:** 55

| Col | Header | Writers | Readers | #W | #R |
|---|---|---|---|---:|---:|
| A | `POPID` | `phase02-world-state/loadEventContentLedger.js::loadUndockedFeed_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/initSimulationLedger.js::initSimulationLedger_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase04-events/buildCityEvents.js::buildCityEvents_`, …(+112) | 1 | 116 |
| B | `First` | _(none)_ | `phase01-config/godWorldEngine2.js::existsInLedger_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, …(+83) | 0 | 87 |
| C | `MaidenName` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/citizenContextBuilder.js::findInSimulationLedger_`, …(+4) | 0 | 8 |
| D | `Last` | _(none)_ | `phase01-config/godWorldEngine2.js::existsInLedger_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, …(+84) | 0 | 88 |
| E | `OriginGame` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/updateCivicApprovalRatings.js::mintChallengerOnLedger_`, `phase07-evening-media/buildEveningFamous.js::buildEveningFamous_` | 0 | 4 |
| F | `UNI (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase05-citizens/bondEngine.js::detectNewBonds_`, `phase05-citizens/bondEngine.js::diagnoseBondEngine`, …(+18) | 0 | 22 |
| G | `MED (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase05-citizens/bondEngine.js::detectNewBonds_`, `phase05-citizens/bondEngine.js::diagnoseBondEngine`, …(+18) | 0 | 22 |
| H | `CIV (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase04-events/generationalEventsEngine.js::triggerRetirementCascade_`, …(+26) | 0 | 30 |
| I | `ClockMode` | `phase04-events/chaosCarsEngine.js::runChaosEvent_` | `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, …(+38) | 1 | 42 |
| J | `Tier` | _(none)_ | `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, …(+44) | 0 | 48 |
| K | `RoleType` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, …(+39) | 0 | 43 |
| L | `Status` | `phase04-events/chaosCarsEngine.js::runChaosEvent_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase04-events/chaosCarsEngine.test.js::reset`, `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_` | `phase01-config/canonNeighborhoodLoader.js::countTrackedByHood_`, `phase01-config/engine94SheetContract.js::inspectEngine94CivicHeader_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, …(+141) | 4 | 145 |
| M | `BirthYear` | `phase05-citizens/generationalWealthEngine.js::executeOwnerMove_`, `phase05-citizens/generationalWealthEngine.js::sellHouseholdHome_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, …(+59) | 2 | 63 |
| N | `OrginCity` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/citizenContextBuilder.js::findInSimulationLedger_`, …(+1) | 0 | 5 |
| O | `LifeHistory` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase05-citizens/bondEngine.js::appendBondLifeLine_`, `phase05-citizens/generationalWealthEngine.js::executeOwnerMove_`, `phase05-citizens/generationalWealthEngine.js::sellHouseholdHome_`, …(+2) | `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/chaosCarsEngine.test.js::reset`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, …(+52) | 6 | 56 |
| P | `SpouseId` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase04-events/generationalEventsEngine.js::widowSurvivingSpouse_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, …(+8) | 0 | 12 |
| Q | `LastUpdated` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase05-citizens/processAdvancementIntake.js::applyTierLadderState_`, `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`, `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, …(+35) | 4 | 39 |
| R | `TraitProfile` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase05-citizens/bondEngine.js::bondTraitOf_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, …(+3) | 0 | 7 |
| S | `UsageCount` | `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, …(+4) | 1 | 8 |
| T | `Neighborhood` | `phase04-events/chaosCarsEngine.test.js::reset`, `phase05-citizens/civicInitiativeEngine.js::freezeCivicStageCohort_`, `phase05-citizens/processAdvancementIntake.js::applyTierLadderState_`, `utilities/archiveCitizenExits.js::restoreCitizenPlan_` | `phase01-config/canonNeighborhoodLoader.js::countTrackedByHood_`, `phase01-config/canonNeighborhoodLoader.js::loadCanonNeighborhoods_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/commuteFlowEngine.js::buildCommuteFlows_`, …(+140) | 4 | 144 |
| U | `HouseholdId` | `phase05-citizens/householdFormationEngine.js::dissolveStressedHouseholds_`, `phase05-citizens/householdFormationEngine.js::formNewHouseholds_` | `phase04-events/generationalEventsEngine.js::arcInvolvedCitizens_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, …(+29) | 2 | 33 |
| V | `MaritalStatus` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase04-events/generationalEventsEngine.js::widowSurvivingSpouse_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, …(+16) | 0 | 20 |
| W | `NumChildren` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/householdFormationEngine.js::loadCitizens_`, …(+6) | 0 | 10 |
| X | `ParentIds` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/generationalWealthEngine.js::findHeirs_`, …(+9) | 0 | 13 |
| Y | `ChildrenIds` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/generationalWealthEngine.js::updateHeritage_`, `phase05-citizens/householdFormationEngine.js::formCriteriaHouseholds_`, `phase05-citizens/householdFormationEngine.js::loadCitizens_`, …(+7) | 0 | 11 |
| Z | `WealthLevel` | _(none)_ | `phase05-citizens/bondEngine.js::ensureBondEngineData_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, …(+8) | 0 | 12 |
| AA | `Income` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, …(+29) | 0 | 33 |
| AB | `InheritanceReceived` | _(none)_ | `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, `phase05-citizens/generationalWealthEngine.js::collectPropertyTax_`, `phase05-citizens/generationalWealthEngine.js::distributeInheritance_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_` | 0 | 4 |
| AC | `NetWorth` | _(none)_ | `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, …(+19) | 0 | 23 |
| AD | `SavingsRate` | _(none)_ | `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_` | 0 | 3 |
| AE | `DebtLevel` | _(none)_ | `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, …(+11) | 0 | 15 |
| AF | `EducationLevel` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::hoodEducationFreq_`, …(+13) | 0 | 17 |
| AG | `SchoolQuality` | _(none)_ | `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/educationCareerEngine.js::updateMinorSchoolQuality_`, `utilities/archiveCitizenExits.js::citizenExitDefects_` | 0 | 4 |
| AH | `CareerStage` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, …(+11) | 0 | 15 |
| AI | `YearsInCareer` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, …(+5) | 0 | 9 |
| AJ | `CareerMobility` | _(none)_ | `phase05-citizens/educationCareerEngine.js::detectCareerMobility_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_` | 0 | 2 |
| AK | `LastPromotionCycle` | _(none)_ | `phase05-citizens/educationCareerEngine.js::detectCareerMobility_`, `phase05-citizens/educationCareerEngine.js::updateCareerProgression_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_`, `phase05-citizens/runCareerEngine.js::careerEmployerBook_` | 0 | 4 |
| AL | `DisplacementRisk` | _(none)_ | `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/migrationTrackingEngine.js::assessDisplacementRisk_`, `phase05-citizens/migrationTrackingEngine.js::checkForDisplacedCitizens_`, `phase05-citizens/migrationTrackingEngine.js::generateMigrationHooks_`, …(+2) | 0 | 6 |
| AM | `MigrationIntent` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::checkForDisplacedCitizens_`, `phase05-citizens/migrationTrackingEngine.js::generateMigrationHooks_`, `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::updateMigrationIntent_`, …(+1) | 0 | 5 |
| AN | `MigrationReason` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_`, `phase05-citizens/updateCivicApprovalRatings.js::mintChallengerOnLedger_` | 0 | 3 |
| AO | `MigrationDestination` | `utilities/archiveCitizenExits.js::restoreCitizenPlan_` | `phase05-citizens/casinoLedgerEngine.js::undockedEligible_`, `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_` | 1 | 3 |
| AP | `MigratedCycle` | _(none)_ | `phase05-citizens/casinoLedgerEngine.js::undockedEligible_`, `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_`, `phase05-citizens/updateCivicApprovalRatings.js::mintChallengerOnLedger_` | 0 | 4 |
| AQ | `ReturnedCycle` | _(none)_ | `phase05-citizens/casinoLedgerEngine.js::undockedEligible_`, `utilities/archiveCitizenExits.js::restoreCitizenPlan_` | 0 | 2 |
| AR | `EconomicProfileKey` | _(none)_ | `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/educationCareerEngine.js::deriveMinorEducationStage_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/educationCareerEngine.js::updateCareerProgression_`, …(+8) | 0 | 12 |
| AS | `EmployerBizId` | _(none)_ | `phase02-world-state/commuteFlowEngine.js::buildCommuteFlows_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase05-citizens/applyBusinessDynamics.js::archiveClosedBusinesses_`, `phase05-citizens/applyBusinessDynamics.test.js::ctxWith`, …(+18) | 0 | 22 |
| AT | `CitizenBio` | _(none)_ | `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/processAdvancementIntake.js::processAdvancementRowsBody_` | 0 | 2 |
| AU | `Gender` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, …(+11) | 0 | 15 |
| AV | `DialState` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `utilities/citizenDialMap.js::pressureRunFromState_` | `phase01-config/initSimulationLedger.js::initSimulationLedger_`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, …(+25) | 2 | 29 |
| AW | `SMPageId` | _(none)_ | _(none)_ | 0 | 0 |
| AX | `MemoryRegisters` | _(none)_ | `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `utilities/compressLifeHistory.js::compressLifeHistory_` | 0 | 2 |
| AY | `StatusStartCycle` | `phase04-events/chaosCarsEngine.js::runChaosEvent_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `utilities/archiveCitizenExits.js::restoreCitizenPlan_` | `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/generationalWealthEngine.js::applyTrackedEmployerFloor_`, …(+4) | 3 | 8 |
| AZ | `HealthCause` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `utilities/archiveCitizenExits.js::restoreCitizenPlan_` | `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase10-persistence/buildCyclePacket.js::persistHospitalLedger_` | 2 | 3 |
| BA | `LineageId` | _(none)_ | `phase05-citizens/generationalWealthEngine.js::applyOwnerDraw_`, `phase05-citizens/generationalWealthEngine.js::decrementHeritageHomesLate_`, `phase05-citizens/generationalWealthEngine.js::ensureHeritageSchema_`, `phase05-citizens/generationalWealthEngine.js::heritageLastOpenedFromLife_`, …(+5) | 0 | 9 |
| BB | `SkillTags` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyBusinessDynamics.test.js::ctxWith`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, …(+9) | 0 | 13 |
| BC | `Famous` | `phase05-citizens/processAdvancementIntake.js::applyTierLadderState_` | `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`, `phase05-citizens/processAdvancementIntake.js::processMediaUsage_`, `phase05-citizens/runCivicRoleEngine.js::runCivicRoleEngine_` | 1 | 3 |

## Triage

- **No engine touch detected:** `SMPageId`
- **Read-only in scan (no write pattern):** `First`, `MaidenName`, `Last`, `OriginGame`, `UNI (y/n)`, `MED (y/n)`, `CIV (y/n)`, `Tier`, `RoleType`, `OrginCity`, `SpouseId`, `TraitProfile`, `MaritalStatus`, `NumChildren`, `ParentIds`, `ChildrenIds`, `WealthLevel`, `Income`, `InheritanceReceived`, `NetWorth`, `SavingsRate`, `DebtLevel`, `EducationLevel`, `SchoolQuality`, `CareerStage`, `YearsInCareer`, `CareerMobility`, `LastPromotionCycle`, `DisplacementRisk`, `MigrationIntent`, `MigrationReason`, `MigratedCycle`, `ReturnedCycle`, `EconomicProfileKey`, `EmployerBizId`, `CitizenBio`, `Gender`, `MemoryRegisters`, `LineageId`, `SkillTags`

## How to use

1. "Who sets Status?" → row `Status` writers column.
2. "Is UsageCount dead?" → no writers + no readers (or readers only in audits).
3. Need dial fold path → `DialState` / `MemoryRegisters` writers (expect compressLifeHistory).
4. Cross-sheet S.* cascades still live in [[ENGINE_STUB_REVERSE]] + [[ENGINE_COUPLING_MAP]].

## Detail — multi-writer columns

### L — `Status` (4 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::runChaosEvent_`
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase04-events/chaosCarsEngine.test.js::reset`
- `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`

**Readers (145):** `phase01-config/canonNeighborhoodLoader.js::countTrackedByHood_`, `phase01-config/engine94SheetContract.js::inspectEngine94CivicHeader_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_`, `phase02-world-state/commuteFlowEngine.js::buildCommuteFlows_`, `phase02-world-state/updateTransitMetrics.js::transitStaffing_`, `phase04-events/careJusticeService.js::careJusticeResidentIndex_`, `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, …(+133)

### M — `BirthYear` (2 writers)

**Writers:**
- `phase05-citizens/generationalWealthEngine.js::executeOwnerMove_`
- `phase05-citizens/generationalWealthEngine.js::sellHouseholdHome_`

**Readers (63):** `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::chaosTicketFine_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::ensureBondEngineData_`, `phase05-citizens/bondEngine.js::hoodEducationFreq_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, …(+51)

### O — `LifeHistory` (6 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase05-citizens/bondEngine.js::appendBondLifeLine_`
- `phase05-citizens/generationalWealthEngine.js::executeOwnerMove_`
- `phase05-citizens/generationalWealthEngine.js::sellHouseholdHome_`
- `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_`
- `utilities/archiveCitizenExits.js::restoreCitizenPlan_`

**Readers (56):** `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/chaosCarsEngine.test.js::reset`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyBusinessDynamics.js::noteVentureClosedOwners_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/bondEngine.js::bondPairDivorced_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, …(+44)

### Q — `LastUpdated` (4 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase05-citizens/processAdvancementIntake.js::applyTierLadderState_`
- `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`
- `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_`

**Readers (39):** `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/civicInitiativeEngine.js::createInitiativeTrackerSheet_`, `phase05-citizens/civicInitiativeEngine.js::freezeCivicStageCohort_`, `phase05-citizens/civicInitiativeEngine.js::manualRunVote`, `phase05-citizens/civicInitiativeEngine.js::runCivicInitiativeEngine_`, …(+27)

### T — `Neighborhood` (4 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.test.js::reset`
- `phase05-citizens/civicInitiativeEngine.js::freezeCivicStageCohort_`
- `phase05-citizens/processAdvancementIntake.js::applyTierLadderState_`
- `utilities/archiveCitizenExits.js::restoreCitizenPlan_`

**Readers (144):** `phase01-config/canonNeighborhoodLoader.js::countTrackedByHood_`, `phase01-config/canonNeighborhoodLoader.js::loadCanonNeighborhoods_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/commuteFlowEngine.js::buildCommuteFlows_`, `phase02-world-state/loadNeighborhoodState.js::loadNeighborhoodState_`, `phase02-world-state/updateTransitMetrics.js::loadPreviousCycleEvents_`, `phase04-events/buildCityEvents.js::buildCityEvents_`, `phase04-events/careJusticeService.js::careJusticeResidentIndex_`, `phase04-events/chaosCarsEngine.js::chaosCitizenTargetAt_`, `phase04-events/chaosCarsEngine.js::loadBusinessRows_`, `phase04-events/chaosCarsEngine.js::loadNeighborhoodNames_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, …(+132)

### U — `HouseholdId` (2 writers)

**Writers:**
- `phase05-citizens/householdFormationEngine.js::dissolveStressedHouseholds_`
- `phase05-citizens/householdFormationEngine.js::formNewHouseholds_`

**Readers (33):** `phase04-events/generationalEventsEngine.js::arcInvolvedCitizens_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::householdHousingById_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/educationCareerEngine.js::updateMinorSchoolQuality_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/generationalWealthEngine.js::findHouseholdSurvivors_`, …(+21)

### AV — `DialState` (2 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `utilities/citizenDialMap.js::pressureRunFromState_`

**Readers (29):** `phase01-config/initSimulationLedger.js::initSimulationLedger_`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyBusinessDynamics.js::bizOwnerDials_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/bondEngine.js::bondTraitOf_`, `phase05-citizens/casinoLedgerEngine.js::processCasinoLedger_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/generationalWealthEngine.js::payProfileFromRow_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_`, `phase05-citizens/generationalWealthEngine.js::trackHomeOwnership_`, …(+17)

### AY — `StatusStartCycle` (3 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::runChaosEvent_`
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `utilities/archiveCitizenExits.js::restoreCitizenPlan_`

**Readers (8):** `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/generationalWealthEngine.js::applyTrackedEmployerFloor_`, `phase05-citizens/generationalWealthEngine.js::applyUntrackedJobReference_`, `phase05-citizens/judicialLifecycle.js::runJudicialLifecycle_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_`, `phase10-persistence/buildCyclePacket.js::persistHospitalLedger_`

### AZ — `HealthCause` (2 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `utilities/archiveCitizenExits.js::restoreCitizenPlan_`

**Readers (3):** `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase10-persistence/buildCyclePacket.js::persistHospitalLedger_`

