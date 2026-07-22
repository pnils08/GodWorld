# Simulation_Ledger Column Interaction Map

**Generated:** 2026-07-21 by `scripts/mapSimulationLedgerCols.js` (mechanical — no LLM).

**Source headers:** `schemas/SCHEMA_HEADERS.md` → `## Simulation_Ledger`

**Purpose:** Per-column writers/readers on Simulation_Ledger so jobs do not re-search the tree for "who mutates Income / DialState / Status".

**Regenerate:** `node scripts/mapSimulationLedgerCols.js` (after schema or engine changes)

**Machine form:** `docs/engine/SIMULATION_LEDGER_COL_MAP.json`

**Entrypoint:** [[COUPLING_INDEX]] · behavioral meaning: [[ENGINE_COUPLING_MAP]] · S.* reverse: [[ENGINE_STUB_REVERSE]]

**Method limits:** detects `header.indexOf('Col')` + `row[iCol]=` write pattern and string-literal mentions. Misses pure positional column numbers with no header name. False readers possible when a string appears only in a comment or unrelated context.

---

**Columns:** 52

| Col | Header | Writers | Readers | #W | #R |
|---|---|---|---|---:|---:|
| A | `POPID` | _(none)_ | `phase01-config/godWorldEngine2.js::getMaxPopId_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/buildCityEvents.js::buildCityEvents_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, …(+74) | 0 | 78 |
| B | `First` | _(none)_ | `phase01-config/godWorldEngine2.js::existsInLedger_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, …(+63) | 0 | 67 |
| C | `MaidenName` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/citizenContextBuilder.js::findInSimulationLedger_`, …(+5) | 0 | 9 |
| D | `Last` | _(none)_ | `phase01-config/godWorldEngine2.js::existsInLedger_`, `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, …(+64) | 0 | 68 |
| E | `OriginGame` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/processIntakeV3.js::processIntakeV3_`, `phase07-evening-media/buildEveningFamous.js::buildEveningFamous_`, …(+1) | 0 | 5 |
| F | `UNI (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase05-citizens/bondEngine.js::detectNewBonds_`, `phase05-citizens/bondEngine.js::diagnoseBondEngine`, …(+18) | 0 | 22 |
| G | `MED (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase05-citizens/bondEngine.js::detectNewBonds_`, `phase05-citizens/bondEngine.js::diagnoseBondEngine`, …(+19) | 0 | 23 |
| H | `CIV (y/n)` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase04-events/generationalEventsEngine.js::triggerRetirementCascade_`, …(+24) | 0 | 28 |
| I | `ClockMode` | _(none)_ | `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, …(+21) | 0 | 25 |
| J | `Tier` | _(none)_ | `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, …(+33) | 0 | 37 |
| K | `RoleType` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, …(+20) | 0 | 24 |
| L | `Status` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`, `utilities/cycleRollback.js::revertInitiativeVotes_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, …(+114) | 3 | 118 |
| M | `BirthYear` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, …(+35) | 0 | 39 |
| N | `OrginCity` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/citizenContextBuilder.js::findInSimulationLedger_` | 0 | 4 |
| O | `LifeHistory` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase05-citizens/bondEngine.js::appendBondLifeLine_`, `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_` | `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/chaosCarsEngine.test.js::reset`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, …(+32) | 3 | 36 |
| P | `SpouseId` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/generationalWealthEngine.js::updateHeritage_`, `phase05-citizens/householdFormationEngine.js::buildCitizenMoneyLookup_`, …(+2) | 0 | 6 |
| Q | `LastUpdated` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`, `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_`, `utilities/cycleRollback.js::revertInitiativeVotes_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, …(+29) | 4 | 33 |
| R | `TraitProfile` | _(none)_ | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase05-citizens/bondEngine.js::bondTraitOf_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase07-evening-media/buildEveningFamous.js::buildEveningFamous_`, …(+1) | 0 | 5 |
| S | `UsageCount` | `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_` | `phase01-config/godWorldEngine2.js::processIntake_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, …(+4) | 1 | 8 |
| T | `Neighborhood` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase02-world-state/loadNeighborhoodState.js::loadNeighborhoodState_`, `phase04-events/buildCityEvents.js::buildCityEvents_`, `phase04-events/chaosCarsEngine.js::loadBusinessRows_`, …(+114) | 0 | 118 |
| U | `HouseholdId` | `phase05-citizens/householdFormationEngine.js::dissolveStressedHouseholds_`, `phase05-citizens/householdFormationEngine.js::formNewHouseholds_` | `phase04-events/generationalEventsEngine.js::arcInvolvedCitizens_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, …(+19) | 2 | 23 |
| V | `MaritalStatus` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::marryCitizens_`, …(+13) | 0 | 17 |
| W | `NumChildren` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/householdFormationEngine.js::loadCitizens_`, …(+5) | 0 | 9 |
| X | `ParentIds` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/generationalWealthEngine.js::findHeirs_`, …(+5) | 0 | 9 |
| Y | `ChildrenIds` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/generationalWealthEngine.js::updateHeritage_`, `phase05-citizens/householdFormationEngine.js::formCriteriaHouseholds_`, `phase05-citizens/householdFormationEngine.js::loadCitizens_`, …(+2) | 0 | 6 |
| Z | `WealthLevel` | _(none)_ | `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, `phase05-citizens/generationalWealthEngine.js::captureWealthLevels_`, `phase05-citizens/generationalWealthEngine.js::getCitizenWealth_`, …(+2) | 0 | 6 |
| AA | `Income` | _(none)_ | `phase01-config/godWorldEngine2.js::processIntake_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, …(+14) | 0 | 18 |
| AB | `InheritanceReceived` | _(none)_ | `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, `phase05-citizens/generationalWealthEngine.js::distributeInheritance_` | 0 | 2 |
| AC | `NetWorth` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, …(+9) | 0 | 13 |
| AD | `SavingsRate` | _(none)_ | `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/generationalWealthEngine.js::calculateCitizenWealth_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_` | 0 | 3 |
| AE | `DebtLevel` | _(none)_ | `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, …(+5) | 0 | 9 |
| AF | `EducationLevel` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, …(+8) | 0 | 12 |
| AG | `SchoolQuality` | _(none)_ | `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/educationCareerEngine.js::updateMinorSchoolQuality_` | 0 | 2 |
| AH | `CareerStage` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/educationCareerEngine.js::detectCareerMobility_`, …(+4) | 0 | 8 |
| AI | `YearsInCareer` | _(none)_ | `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, …(+3) | 0 | 7 |
| AJ | `CareerMobility` | _(none)_ | `phase05-citizens/educationCareerEngine.js::detectCareerMobility_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_` | 0 | 2 |
| AK | `LastPromotionCycle` | _(none)_ | `phase05-citizens/educationCareerEngine.js::detectCareerMobility_`, `phase05-citizens/educationCareerEngine.js::updateCareerProgression_` | 0 | 2 |
| AL | `DisplacementRisk` | _(none)_ | `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/migrationTrackingEngine.js::assessDisplacementRisk_`, `phase05-citizens/migrationTrackingEngine.js::checkForDisplacedCitizens_`, `phase05-citizens/migrationTrackingEngine.js::generateMigrationHooks_`, …(+2) | 0 | 6 |
| AM | `MigrationIntent` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::checkForDisplacedCitizens_`, `phase05-citizens/migrationTrackingEngine.js::generateMigrationHooks_`, `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::updateMigrationIntent_` | 0 | 4 |
| AN | `MigrationReason` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_` | 0 | 2 |
| AO | `MigrationDestination` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_` | 0 | 2 |
| AP | `MigratedCycle` | _(none)_ | `phase05-citizens/migrationTrackingEngine.js::processRelocations_`, `phase05-citizens/migrationTrackingEngine.js::processSettledInCheck_` | 0 | 2 |
| AQ | `ReturnedCycle` | _(none)_ | _(none)_ | 0 | 0 |
| AR | `EconomicProfileKey` | _(none)_ | `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/generationalWealthEngine.js::calculateCitizenIncomes_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_` | 0 | 3 |
| AS | `EmployerBizId` | _(none)_ | `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_` | 0 | 2 |
| AT | `CitizenBio` | _(none)_ | _(none)_ | 0 | 0 |
| AU | `Gender` | _(none)_ | `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, …(+5) | 0 | 9 |
| AV | `DialState` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_` | `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, …(+8) | 1 | 12 |
| AW | `SMPageId` | _(none)_ | _(none)_ | 0 | 0 |
| AX | `MemoryRegisters` | _(none)_ | `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `utilities/compressLifeHistory.js::compressLifeHistory_` | 0 | 2 |
| AY | `StatusStartCycle` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_` | `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/runCareerEngine.js::runCareerEngine_`, `phase11-media-intake/healthCauseIntake.js::exportHealthCauseQueue_` | 1 | 3 |
| AZ | `HealthCause` | `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`, `phase11-media-intake/healthCauseIntake.js::processHealthCauseIntake_` | `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase11-media-intake/healthCauseIntake.js::exportHealthCauseQueue_` | 2 | 2 |

## Triage

- **No engine touch detected:** `ReturnedCycle`, `CitizenBio`, `SMPageId`
- **Read-only in scan (no write pattern):** `POPID`, `First`, `MaidenName`, `Last`, `OriginGame`, `UNI (y/n)`, `MED (y/n)`, `CIV (y/n)`, `ClockMode`, `Tier`, `RoleType`, `BirthYear`, `OrginCity`, `SpouseId`, `TraitProfile`, `Neighborhood`, `MaritalStatus`, `NumChildren`, `ParentIds`, `ChildrenIds`, `WealthLevel`, `Income`, `InheritanceReceived`, `NetWorth`, `SavingsRate`, `DebtLevel`, `EducationLevel`, `SchoolQuality`, `CareerStage`, `YearsInCareer`, `CareerMobility`, `LastPromotionCycle`, `DisplacementRisk`, `MigrationIntent`, `MigrationReason`, `MigrationDestination`, `MigratedCycle`, `EconomicProfileKey`, `EmployerBizId`, `Gender`, `MemoryRegisters`

## How to use

1. "Who sets Status?" → row `Status` writers column.
2. "Is UsageCount dead?" → no writers + no readers (or readers only in audits).
3. Need dial fold path → `DialState` / `MemoryRegisters` writers (expect compressLifeHistory).
4. Cross-sheet S.* cascades still live in [[ENGINE_STUB_REVERSE]] + [[ENGINE_COUPLING_MAP]].

## Detail — multi-writer columns

### L — `Status` (3 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`
- `utilities/cycleRollback.js::revertInitiativeVotes_`

**Readers (118):** `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_`, `phase04-events/chaosCarsEngine.js::pickCitizenTarget_`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::ensureBondEngineData_`, `phase05-citizens/bondEngine.js::marryCitizens_`, …(+106)

### O — `LifeHistory` (3 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase05-citizens/bondEngine.js::appendBondLifeLine_`
- `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_`

**Readers (36):** `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/chaosCarsEngine.test.js::reset`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/bondEngine.js::processGCCourtship_`, `phase05-citizens/bondEngine.js::processGCMarriageLottery_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/educationCareerEngine.js::deriveEducationLevels_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, …(+24)

### Q — `LastUpdated` (4 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase05-citizens/processAdvancementIntake.js::decayMediaAttention_`
- `phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_`
- `utilities/cycleRollback.js::revertInitiativeVotes_`

**Readers (33):** `phase01-config/godWorldEngine2.js::processIntake_`, `phase01-config/godWorldEngine2.js::updateNamedCitizens_`, `phase04-events/chaosCarsEngine.test.js::makeCtx`, `phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_`, `phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_`, `phase05-citizens/checkForPromotions.js::checkForPromotions_`, `phase05-citizens/civicInitiativeEngine.js::createInitiativeTrackerSheet_`, `phase05-citizens/civicInitiativeEngine.js::manualRunVote`, `phase05-citizens/civicInitiativeEngine.js::runCivicInitiativeEngine_`, `phase05-citizens/educationCareerEngine.js::updateCareerProgression_`, …(+21)

### U — `HouseholdId` (2 writers)

**Writers:**
- `phase05-citizens/householdFormationEngine.js::dissolveStressedHouseholds_`
- `phase05-citizens/householdFormationEngine.js::formNewHouseholds_`

**Readers (23):** `phase04-events/generationalEventsEngine.js::arcInvolvedCitizens_`, `phase04-events/generationalEventsEngine.js::createChildRow_`, `phase04-events/generationalEventsEngine.js::formSingleParentHousehold_`, `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase05-citizens/bondEngine.js::buildBondLedgerIndex_`, `phase05-citizens/bondEngine.js::marryCitizens_`, `phase05-citizens/educationCareerEngine.js::settleAdulthood_`, `phase05-citizens/educationCareerEngine.js::updateMinorSchoolQuality_`, `phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_`, `phase05-citizens/generationalWealthEngine.js::findHouseholdSurvivors_`, `phase05-citizens/generationalWealthEngine.js::processMoneyLoop_`, `phase05-citizens/generationalWealthEngine.js::trackHomeOwnership_`, …(+11)

### AZ — `HealthCause` (2 writers)

**Writers:**
- `phase04-events/chaosCarsEngine.js::writeCitizenEvent_`
- `phase11-media-intake/healthCauseIntake.js::processHealthCauseIntake_`

**Readers (2):** `phase04-events/generationalEventsEngine.js::runGenerationalEngine_`, `phase11-media-intake/healthCauseIntake.js::exportHealthCauseQueue_`

