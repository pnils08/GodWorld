# /run-cycle Gap Log — Cycle 107

**Generated:** 2026-09-14T01:50:47.213Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 9 MED / 15 LOW patterns flagged by engineAuditor; 13 improvements; 1 incoherence findings. Pattern types: repeating-event=2, math-imbalance=7, coverage-gap=1, production-imbalance=1, improvement=13, incoherence=1.

**Mechanical pass:** 75 entries (HIGH 0, MED 65, LOW 9). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC2 — applyDemographicDrift.js references field-name 'totalPopulation' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase03-population/applyDemographicDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Hospital_Ledger. 'totalPopulation' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC3 — applyDemographicDrift.js references field-name 'illnessRate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase03-population/applyDemographicDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Hospital_Ledger. 'illnessRate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC4 — applyDemographicDrift.js references field-name 'employmentRate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase03-population/applyDemographicDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Hospital_Ledger. 'employmentRate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC5 — applyDemographicDrift.js references field-name 'migration' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase03-population/applyDemographicDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Hospital_Ledger. 'migration' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — applyDemographicDrift.js references field-name 'economy' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase03-population/applyDemographicDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Hospital_Ledger. 'economy' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — finalizeWorldPopulation.js field 'cycle' not on 'World_Population' (case-variant on Carry_Forward_Store) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'cycle' has no match (any case) on that sheet. Case-variant exists on: Carry_Forward_Store:'Cycle', Content_Telemetry:'Cycle', Cycle_Packet:'Cycle'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC8 — finalizeWorldPopulation.js field 'cycleWeight' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'cycleWeight' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'CycleWeight', Media_Ledger:'CycleWeight', Riley_Digest:'CycleWeight'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC9 — finalizeWorldPopulation.js field 'cycleWeightReason' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'cycleWeightReason' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'CycleWeightReason', Media_Ledger:'CycleWeightReason', Riley_Digest:'CycleWeightReason'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC10 — finalizeWorldPopulation.js field 'civicLoad' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'civicLoad' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'CivicLoad', Media_Ledger:'CivicLoad', Riley_Digest:'CivicLoad'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC11 — finalizeWorldPopulation.js field 'migrationDrift' not on 'World_Population' (case-variant on Riley_Digest) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'migrationDrift' has no match (any case) on that sheet. Case-variant exists on: Riley_Digest:'MigrationDrift'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC12 — finalizeWorldPopulation.js field 'patternFlag' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'patternFlag' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'PatternFlag', Media_Ledger:'PatternFlag', Riley_Digest:'PatternFlag'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC13 — finalizeWorldPopulation.js field 'shockFlag' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'shockFlag' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'ShockFlag', Media_Ledger:'ShockFlag', Riley_Digest:'ShockFlag'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC14 — finalizeWorldPopulation.js field 'worldEventsCount' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'worldEventsCount' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'WorldEventsCount'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC15 — finalizeWorldPopulation.js field 'weatherType' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'weatherType' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'WeatherType', Media_Ledger:'WeatherType'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC16 — finalizeWorldPopulation.js field 'weatherImpact' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'weatherImpact' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'WeatherImpact'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC17 — finalizeWorldPopulation.js field 'trafficLoad' not on 'World_Population' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'World_Population'; 'trafficLoad' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC18 — finalizeWorldPopulation.js field 'retailLoad' not on 'World_Population' (case-variant on Riley_Digest) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'retailLoad' has no match (any case) on that sheet. Case-variant exists on: Riley_Digest:'RetailLoad'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC19 — finalizeWorldPopulation.js field 'tourismLoad' not on 'World_Population' (case-variant on Riley_Digest) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'tourismLoad' has no match (any case) on that sheet. Case-variant exists on: Riley_Digest:'TourismLoad'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC20 — finalizeWorldPopulation.js field 'nightlifeLoad' not on 'World_Population' (case-variant on Riley_Digest) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'nightlifeLoad' has no match (any case) on that sheet. Case-variant exists on: Riley_Digest:'NightlifeLoad'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC21 — finalizeWorldPopulation.js field 'publicSpacesLoad' not on 'World_Population' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'World_Population'; 'publicSpacesLoad' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC22 — finalizeWorldPopulation.js field 'sentiment' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'sentiment' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'Sentiment', Media_Ledger:'Sentiment', Neighborhood_Map:'Sentiment'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC23 — finalizeWorldPopulation.js field 'timestamp' not on 'World_Population' (case-variant on Civic_Sweep_Report) [mechanical] [header-drift] [MED]

- **Source:** phase03-population/finalizeWorldPopulation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'timestamp' has no match (any case) on that sheet. Case-variant exists on: Civic_Sweep_Report:'Timestamp', Cultural_Ledger:'Timestamp', Cycle_Packet:'Timestamp'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC24 — generationalEventsEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC25 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC26 — runCareerEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2. Writer touches Business_Ledger, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC27 — runCivicRoleEngine.js field 'TierRole' not on 'Simulation_Ledger' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'Simulation_Ledger'; 'TierRole' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC28 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC29 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC30 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC31 — applyMigrationDrift.js references field-name 'migration' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/applyMigrationDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Neighborhood_Map. 'migration' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC32 — applyMigrationDrift.js references field-name 'totalPopulation' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/applyMigrationDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Neighborhood_Map. 'totalPopulation' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC33 — applyMigrationDrift.js references field-name 'employmentRate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/applyMigrationDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Neighborhood_Map. 'employmentRate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC34 — applyMigrationDrift.js references field-name 'economy' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/applyMigrationDrift.js
- **Diagnosis:** Type 2. Writer touches World_Population, Neighborhood_Map. 'economy' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC35 — applyStorySeeds.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC36 — applyStorySeeds.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC37 — applyStorySeeds.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC38 — applyStorySeeds.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC39 — applyStorySeeds.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC40 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC41 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC42 — storylineWeavingEngine.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC43 — storylineWeavingEngine.js references field-name 'CitizenRoles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CitizenRoles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC44 — storylineWeavingEngine.js references field-name 'ConflictType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ConflictType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC45 — storylineWeavingEngine.js references field-name 'RelationshipImpact' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelationshipImpact' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC46 — storylineWeavingEngine.js references field-name 'CrossStorylineLinks' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CrossStorylineLinks' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC47 — cycleExportAutomation.js field 'cycle' not on 'World_Population' (case-variant on Carry_Forward_Store) [mechanical] [header-drift] [MED]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2. Writer targets 'World_Population'; 'cycle' has no match (any case) on that sheet. Case-variant exists on: Carry_Forward_Store:'Cycle', Content_Telemetry:'Cycle', Cycle_Packet:'Cycle'. Likely wrong sheet target or missing schema migration.
- **Status:** OPEN

### G-EC48 — cycleExportAutomation.js field 'Cycle' not on target 'World_Population' (exists on Carry_Forward_Store, Content_Telemetry, Cycle_Packet) [mechanical] [header-drift] [MED]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'World_Population'; field 'Cycle' is absent from that sheet's headers but exists on: Carry_Forward_Store, Content_Telemetry, Cycle_Packet. Either wrong sheet target, missing schema migration on 'World_Population', or dead code path.
- **Status:** OPEN

### G-EC49 — cycleExportAutomation.js field 'AbsoluteCycle' not on 'World_Population' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'World_Population'; 'AbsoluteCycle' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC50 — recordWorldEventsv25.js field 'HolidayPriority' not on target 'WorldEvents_Ledger' (exists on Cultural_Ledger, Domain_Tracker, Event_Arc_Ledger) [mechanical] [header-drift] [MED]

- **Source:** phase10-persistence/recordWorldEventsv25.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'WorldEvents_Ledger'; field 'HolidayPriority' is absent from that sheet's headers but exists on: Cultural_Ledger, Domain_Tracker, Event_Arc_Ledger. Either wrong sheet target, missing schema migration on 'WorldEvents_Ledger', or dead code path.
- **Status:** OPEN

### G-EC51 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC52 — bylineEngine.js references field-name 'AssignedReporter' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'AssignedReporter' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC53 — ensureCrimeMetrics.js references field-name 'PropertyCrimeIndex' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureCrimeMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'PropertyCrimeIndex' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC54 — ensureCrimeMetrics.js references field-name 'ViolentCrimeIndex' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureCrimeMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'ViolentCrimeIndex' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC55 — ensureCrimeMetrics.js references field-name 'PropertyLevel' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureCrimeMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'PropertyLevel' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC56 — ensureCrimeMetrics.js references field-name 'ViolentLevel' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureCrimeMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'ViolentLevel' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC57 — ensureCrimeMetrics.js references field-name 'QolLevel' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureCrimeMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'QolLevel' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC58 — ensureTransitMetrics.js references field-name 'Factors' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/ensureTransitMetrics.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'Factors' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC59 — priorityEngine.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC60 — priorityEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC61 — Downtown: decay [Sentiment -0.080, HousingPressure +1.000] — Sentiment now 0.33 (20 of 22, city median 0.46499999999999997); HousingPressure [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["Sentiment -0.080","HousingPressure +1.000"], standing={"Sentiment":{"current":0.33,"rank":20,"of":22,"cityMedian":0.46499999999999997},"HousingPressure":{"current":4,"rank":18,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Downtown
- **Status:** OPEN

### G-EC62 — Rockridge: decay [RetailVitality -0.70, HousingPressure +1.000] — RetailVitality now 9.19 (5 of 22, city median 7.29); HousingPressure now 4 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 8 • Fields: Neighborhood="Rockridge", decaySignals=["RetailVitality -0.70","HousingPressure +1.000"], standing={"RetailVitality":{"current":9.19,"rank":5,"of":22,"cityMedian":7.29},"HousingPressure":{"current":4,"rank":19,"of":22,"cityMedian":0},"Sentiment":{"current":0.45,"rank":13,"of":22,"cityMedian":0.46499999999999997}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Rockridge
- **Status:** OPEN

### G-EC63 — Chinatown: decay [Sentiment -0.060, HousingPressure +0.500] — Sentiment now 0.33 (21 of 22, city median 0.46499999999999997); HousingPressur [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.060","HousingPressure +0.500"], standing={"Sentiment":{"current":0.33,"rank":21,"of":22,"cityMedian":0.46499999999999997},"HousingPressure":{"current":0.5,"rank":14,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC64 — KONO: decay [Sentiment -0.090, HousingPressure +0.500] — Sentiment now 0.24 (22 of 22, city median 0.46499999999999997); HousingPressure now [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["Sentiment -0.090","HousingPressure +0.500"], standing={"Sentiment":{"current":0.24,"rank":22,"of":22,"cityMedian":0.46499999999999997},"HousingPressure":{"current":0.5,"rank":15,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC65 — Uptown: decay [Sentiment -0.030, HousingPressure +1.000] — Sentiment now 0.4 (16 of 22, city median 0.46499999999999997); HousingPressure no [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["Sentiment -0.030","HousingPressure +1.000"], standing={"Sentiment":{"current":0.4,"rank":16,"of":22,"cityMedian":0.46499999999999997},"HousingPressure":{"current":4,"rank":21,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
- **Status:** OPEN

### G-EC66 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC67 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC68 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC69 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC70 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC71 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC72 — storylineWeavingEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC73 — Temescal: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.46 (12 of 22, city median 0.46499999999999997); HousingPressure [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 3 • Fields: Neighborhood="Temescal", decaySignals=["Sentiment -0.050","HousingPressure +1.000"], standing={"Sentiment":{"current":0.46,"rank":12,"of":22,"cityMedian":0.46499999999999997},"HousingPressure":{"current":5.5,"rank":22,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-005"] • Affected: init=INIT-005 / nbhd=Temescal
- **Status:** OPEN

### G-EC74 — West Oakland: decay [Sentiment -0.090, RetailVitality -1.48] — Sentiment now 0.34 (19 of 22, city median 0.46499999999999997); RetailVitalit [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c107.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["Sentiment -0.090","RetailVitality -1.48"], standing={"Sentiment":{"current":0.34,"rank":19,"of":22,"cityMedian":0.46499999999999997},"RetailVitality":{"current":3.53,"rank":22,"of":22,"cityMedian":7.29}}, matchingActiveInitiatives=["INIT-001","INIT-002"] • Affected: init=INIT-001,INIT-002 / nbhd=West Oakland
- **Status:** OPEN

### G-EC75 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC76 — Prior cycle's gap log (C106) had 57 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c106_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC77 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC78 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC79 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC80 — engine.165 root cause: ten of 22 hoods missing from the Phase-2 `CLUSTERS` literal ride the city scalar 1:1 [judgment] [math-anomaly] [HIGH]
- **Source:** phase02-world-state/applyCityDynamics.js:585 (CLUSTERS, 5 clusters / 12 hoods), :1395 (neighborhoodDynamics populated only for those 12); phase08-v3-chicago/v3NeighborhoodWriter.js:411-413 (fallback to `dynamics.sentiment` when no entry)
- **Evidence:** C106→C107 ΔSentiment — 12 in-table hoods mean −0.037 (range −0.09..+0.02); 10 out-of-table hoods (Adams Point, Baylight District, Brooklyn, Dimond, East Oakland, Eastlake, Glenview, Grand Lake, Ivy Hill, San Antonio) mean +0.306 (+0.25..+0.35) while Riley CitySentiment moved 0.25→0.51. Reverse split at C106 (0.84→0.25). All ten have citizens on the ledger (1–7 each).
- **Effect:** every mood-fed consumer (approval level engine.213, crime :231/:924, texture) inherits a sawtooth for ten hoods that the other twelve do not show. The auditor files the ten as `improvement` one cycle and `math-imbalance` the next.
- **Fix:** cluster membership from the sheet (Neighborhood_Map District + Adjacent, all 22 rows), not a literal. Bench first. ROLLOUT engine.165.
- **Status:** CUT S458 (engine.214) — anchors + Adjacent-majority flood, District tie-break, drift throws; all 22 seated (LAKE 6, EAST 6, WATERFRONT 4, DOWNTOWN 4, NORTH_HILLS 2); test `scripts/clusterMembership.test.js` 37/37 (codex FIX-FIRST → fixed: tie deferral, wrapper-level proof). Bench fire pending the live-C107 resync; readback = 22 ΔSentiment vs the scalar move, two fires (momentum proves on the second)

### G-EC81 — `illnessConvergenceRate` missing from World_Config for three cycles; repeating-event detector reads the engine notice as a civic issue [judgment] [cross-cycle-debt] [MED]
- **Source:** Riley_Digest.Issues C105–C107 (`World_Config key "illnessConvergenceRate" missing; using default 0.25 (engine.102 W2b)`); output/engine_audit_c107.json patterns[1] (`Issue "world" (+ 6 co-occurring tokens) recurred 3 cycles`)
- **Fix:** add the key to the engine.94 contract seeds (engine94SheetContract.js) so it self-arms; the detector then stops matching. One line, next bench.
- **Status:** OPEN — engine-sheet

### G-EC82 — four Tier-4 incomes doubled in one pass (three Plumbers, UNTRACKED employer) [judgment] [math-anomaly] [MED]
- **Source:** output/engine_anomalies_c107.json route-to-engine-debug; POP-00784 45,800→99,200, POP-00812 47,800→98,900, POP-00951 49,300→111,300, POP-00874 28,522→61,000; cohort POP-00867/889/899/909 +110–172%
- **Note:** POP-00260 / POP-00268 (C106 G-EC item A) are CLOSED — the @66 catalog floor landed at C107 (215,100→60,800; 283,800→93,271).
- **Check:** the Income writer at C107 for these rows (applyTierLadderState_ / engine.157 climb / processGenerationalWealth_ / applyUntrackedJobReference_). Followup: output/engine_anomalies_c107_followup.md §B.
- **Status:** OPEN — engine-sheet

### G-EC83 — ViolentCrimeIndex fell in nine hoods at −3.5σ..−9σ in one cycle, six outside INIT-002's footprint; OARI credit unproven [judgment] [math-anomaly] [MED]
- **Source:** output/engine_anomalies_c107.json cover-as-story ×9; measureRemedies INIT-002 `remedy-overshot` (−7 vs −0.05) second cycle
- **Check:** phase03-population/updateCrimeMetrics.js writer path at C107 (reads neighborhoodDynamics — G-EC80's object). Followup §C.
- **Status:** OPEN — engine-sheet

### G-EC84 — Phase5-Advancement 56.1s (C106 23.9s): 47s gap between checkEmergencePromotions_ and seedEmergenceBonds_ [judgment] [cross-cycle-debt] [LOW]
- **Source:** output/execution_log_c107.txt 8:31:58 → 8:32:45; PHASE_TIMING slowest[0]
- **Status:** WATCH — re-read at C108

### G-EC85 — measurement expectations still uncalibrated (0.05 / 0.02 vs engine steps of 1–7): three cycles, zero calibrated verdicts [judgment] [cross-cycle-debt] [MED]
- **Source:** output/engine_audit_c107.json measurementHistory (remedy-overshot ×3, remedy-not-firing ×4, as-expected 0)
- **Fix:** measureRemedies / recommendRemedy take magnitudeThreshold from the prior cycle's observed |delta| (floor at the current constant). scripts-side, no engine change.
- **Status:** OPEN — carried from C106

### G-EC86 — first auditor pass reported 9 approval-shift briefs + an Ashford 45→67 anomaly that were the builder's pre-fire rebase, not the world [judgment] [writeback-drift] [INFO]
- **Source:** output/civic_approval_rebase_c106.plan.json §superseded; engine_audit_c106.json snapshotNotes (Civic_Office_Ledger.Approval set to the rebased closing values); auditor re-run 20:44 → 0 approval-shift briefs, no approval anomaly
- **Rule going forward:** a hand write to a sheet between fires is a C{n} closing-state change — correct the prior audit snapshot before running the C{n+1} auditor, never let the diff report it as an event.
- **Status:** CLOSED

### G-EC87 — buildWorldSummary.js crashed on C107 (`worldConfigAll is not defined`): World_Config was fetched but not passed from loadCycleData to buildWorldSummary since e358293c (2026-09-10) [judgment] [silent-fail] [MED]
- **Fix:** returned through `data` and destructured with a `[]` default (this session). Test 234/234. Would have blocked every cron consumer of world_summary_c107 / desk_signal_c107.
- **Status:** CLOSED

## LEG: /city-hall (G-R)

No gaps this run.
