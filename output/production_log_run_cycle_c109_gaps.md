# /run-cycle Gap Log — Cycle 109

**Generated:** 2026-09-28T06:03:00.365Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 0 HIGH / 6 MED / 2 LOW patterns flagged by engineAuditor; 2 improvements; 0 incoherence findings. Pattern types: repeating-event=1, math-imbalance=3, coverage-gap=1, writeback-drift=1, improvement=2.

**Mechanical pass:** 51 entries (HIGH 0, MED 41, LOW 9). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c109.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC2 — generationalEventsEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC3 — civicInitiativeEngine.js references field-name 'BizID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'BizID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC4 — civicInitiativeEngine.js references field-name 'OpenTrackedSlots' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'OpenTrackedSlots' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC5 — civicInitiativeEngine.js references field-name 'OpensCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'OpensCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — civicInitiativeEngine.js references field-name 'RenewalVoteCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'RenewalVoteCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — civicInitiativeEngine.js references field-name 'RenewalAmount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'RenewalAmount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — civicInitiativeEngine.js references field-name 'RenewalOutcome' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/civicInitiativeEngine.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, World_Config, Simulation_Ledger. 'RenewalOutcome' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC10 — householdFormationEngine.js references field-name 'LastGrantCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/householdFormationEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Initiative_Tracker, Simulation_Ledger. 'LastGrantCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — householdFormationEngine.js references field-name 'LastGrantInitiativeID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/householdFormationEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Initiative_Tracker, Simulation_Ledger. 'LastGrantInitiativeID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — householdFormationEngine.js references field-name 'LastGrantAmount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/householdFormationEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Initiative_Tracker, Simulation_Ledger. 'LastGrantAmount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC13 — runCareerEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2. Writer touches Business_Ledger, Initiative_Tracker, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC14 — runCivicRoleEngine.js field 'TierRole' not on 'Simulation_Ledger' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'Simulation_Ledger'; 'TierRole' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC15 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC16 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC17 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC18 — applyStorySeeds.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC19 — applyStorySeeds.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC20 — applyStorySeeds.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC21 — applyStorySeeds.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC22 — applyStorySeeds.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC23 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC24 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC25 — storylineWeavingEngine.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC26 — storylineWeavingEngine.js references field-name 'CitizenRoles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CitizenRoles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC27 — storylineWeavingEngine.js references field-name 'ConflictType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ConflictType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC28 — storylineWeavingEngine.js references field-name 'RelationshipImpact' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelationshipImpact' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC29 — storylineWeavingEngine.js references field-name 'CrossStorylineLinks' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CrossStorylineLinks' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC30 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC31 — bylineEngine.js references field-name 'AssignedReporter' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'AssignedReporter' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC32 — citizenDerivation.js field 'Neighborhood' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Business_Archive, Business_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'Neighborhood' is absent from that sheet's headers but exists on: Advancement_Intake1, Business_Archive, Business_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC33 — citizenDerivation.js field 'RoleType' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'RoleType' is absent from that sheet's headers but exists on: Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC34 — citizenDerivation.js field 'EducationLevel' not on target 'Economic_Parameters' (exists on Citizen_Archive, Simulation_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'EducationLevel' is absent from that sheet's headers but exists on: Citizen_Archive, Simulation_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC35 — citizenDerivation.js field 'BirthYear' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Citizen_Archive, Generic_Citizens) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'BirthYear' is absent from that sheet's headers but exists on: Advancement_Intake1, Citizen_Archive, Generic_Citizens. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC36 — priorityEngine.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC37 — priorityEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC38 — Downtown: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (10 of 22, city median 0.28); HousingPressure now 6 (20 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c109.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["Sentiment -0.050","HousingPressure +1.000"], standing={"Sentiment":{"current":0.28,"rank":10,"of":22,"cityMedian":0.28},"HousingPressure":{"current":6,"rank":20,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Downtown
- **Status:** OPEN

### G-EC39 — Fruitvale: decay [Sentiment -0.020, HousingPressure +1.000] — Sentiment now 0.42 (2 of 22, city median 0.28); HousingPressure now 2.5 (15 of [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c109.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.020","HousingPressure +1.000"], standing={"Sentiment":{"current":0.42,"rank":2,"of":22,"cityMedian":0.28},"HousingPressure":{"current":2.5,"rank":15,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Affected: nbhd=Fruitvale
- **Status:** OPEN

### G-EC40 — Grand Lake: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (12 of 22, city median 0.28); HousingPressure now 4 (17 of [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c109.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["Sentiment -0.050","HousingPressure +1.000"], standing={"Sentiment":{"current":0.28,"rank":12,"of":22,"cityMedian":0.28},"HousingPressure":{"current":4,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC41 — 8 council approvals unchanged from last cycle despite edition coverage [mechanical] [writeback-drift] [MED]

- **Source:** output/engine_audit_c109.json (pattern type=writeback-drift)
- **Diagnosis:** Sheet: `Civic_Office_Ledger` • Fields: flatApprovalCount=8 • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC42 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC43 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC44 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC45 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC46 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC47 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC48 — storylineWeavingEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC49 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC50 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC51 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC52 — Prior cycle's gap log (C108) had 72 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c108_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC53 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC54 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC55 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC56 — household door took a head's sex from the dice; Husband/Wife swapped on live [judgment] [silent-fail] [HIGH]
- **Source:** phase05-citizens/generateGenericCitizens.js `inferSexFromFirstName_`; phase05-citizens/processAdvancementIntake.js `queueHouseholdIntake_`
- **Evidence:** live C109 POP-01130 Tomás Villanueva Gender `female`, POP-01131 Renata `male`; Family_Relationships row 117 Husband=Renata, Wife=Tomás. Pool holds "Tomas"; the match was exact-string, so the accent missed. "Renata" is not in either pool. Bench C145 did not catch it — the smoke list checked ids and links, not Gender.
- **Fix:** DONE in code — accents folded on both sides; head+spouse where one resolves gives the other the opposite. `scripts/householdIntake.test.js` §2c (39/39). Live corrected: Simulation_Ledger rows 960/961 Gender, Family_Relationships row 117 Husband/Wife — written and read back before `dumpLedger`.
- **Open:** rides the stacked ship; bench proof owed.

### G-EC57 — media room files reporters as new citizens, honorific as First, every cycle [judgment] [silent-fail] [HIGH]
- **Source:** phase07-evening-media/mediaRoomIntake.js `routeCitizenUsageToIntake_` → `splitName_`
- **Evidence:** live Intake rows 2–6 + 2 appended at C109 Phase 11: "Dr." / "Lila Mezran", "Sgt." / "Rachel Torres". `processIntake_` parks each in `review`; nothing clears review. Both are ledger citizens, so their usage never reaches Advancement_Intake1 either.
- **Fix:** DONE in code — one leading honorific stripped when 3+ tokens (reuses `splitUsageName_`); two-token names untouched.
- **Open:** rides the stacked ship. 7 parked rows on live Intake are history; left. `USAGE_HONORIFIC_RE` lists `deacon` — `splitUsageName_("Deacon Seymour")` returns null; check whether POP-00528 usage counts.

### G-EC58 — Riley_Digest IntakeProcessed 0 on a cycle that minted a household [judgment] [math-anomaly] [MED]
- **Source:** phase01-config/godWorldEngine2.js:1472; world_summary_c109.md "Intake processed: 0"
- **Evidence:** counter summed the lean-row mints only; household-door members and promotions never counted. mediaRoomIntake.js:89 also overwrites `S.intakeProcessed` with a results object at Phase 11.
- **Fix:** DONE in code for household members. Phase-11 overwrite open.

### G-EC59 — mediaEffects read at Phase 5, written at Phase 8 [judgment] [phase-ordering] [MED]
- **Source:** `node scripts/ctxMap.js` ORDERING; runRelationshipEngine.js:558, mediaFeedbackEngine.js:1258/1358
- **Evidence:** all three reads guarded — no crash, branch never takes. Media climate has never influenced a citizen event.
- **Open:** engine.266. Carry last cycle's effects forward or move the writer; sim-facing effect, builder included before it turns on.

### G-EC60 — storylineWeaving logs "column not found. Run migration first." every fire [judgment] [header-drift] [MED]
- **Source:** output/execution_log_c109.txt:190-191 (CitizenRoles, CrossStorylineLinks); mechanical G-EC rows for storylineWeavingEngine / applyStorySeeds / bylineEngine / priorityEngine
- **Evidence:** same 23 MED header-drift rows as C108, untriaged. Each is an indexOf −1 branch that never writes.
- **Open:** engine.266.

### G-EC61 — anomaly detector: 19 of 22 hoods flagged on migration flow; approval "drift" predates the level model [judgment] [math-anomaly] [MED]
- **Source:** scripts/engine-auditor/detectAnomalies.js, detectWritebackDrift.js; output/engine_anomalies_c109.json
- **Evidence:** MigrationFlow moves 1–5 per week on a small integer; all 19 `suppress-until-verified`. "8 council approvals unchanged" reads the engine.213 level model holding level as a defect. POP-00226 income −53% routed to engine-debug while LifeHistory carries the cause.
- **Open:** engine.266. Band relative to the column's own range (SIM_DOCTRINE §15).

### G-EC62 — fire after Sunday 21:00 has no civic chain slot [judgment] [phase-skip] [HIGH]
- **Source:** crontab (chain `30 14 * * 0`, `0 21 * * 0`); logs/civic-cron.log lines 77-79, 114-116; scripts/cron-civic-run.js `runTick`
- **Evidence:** both 2026-09-27 chain runs exited clean on "close_c108 applied" — engine not fired. C109 fired Mon 00:50 CDT. Tick executes close-det/gate/apply only; prep, directive, mayor, hearing live in `runChain`. C109 closes at the 6h cutoff with no hearing.
- **Open:** civic.42 — chain keys off the fire (week_state `engineFiredAt` + inputs on disk), not the weekday.

### G-EC63 — pre-flight and pre-mortem read repo HEAD, not the deployed version [judgment] [silent-fail] [MED]
- **Source:** scripts/preflightInputCheck.js (requires `utilities/sportsWeekRecord.js` at HEAD); scripts/preMortemScan.js
- **Evidence:** pre-flight "every WeekRecord cell passes" → PROD @132 refused 3 (rows 230, 231, 233 duplicate per franchise). HEAD carries the engine.202 fold; PROD did not.
- **Open:** closes itself when the stack ships. Standing rule in the skill: between a commit and its ship the two can disagree.

### G-EC64 — pre-flight reported Citizen Intake "NOT WIRED" while the engine read it [judgment] [silent-fail] [MED]
- **Fix:** DONE — scripts/preflightInputCheck.js Step 2 reads `Intake`: pending rows by fate (household / single / headed for review), rows parked in review.

### G-EC65 — Step 2.5 hand-write diff had no script [judgment] [silent-fail] [HIGH]
- **Fix:** DONE — `node scripts/engineAuditor.js --hand-write-check [--rebase --why "…"]`. C109 pre-fire: 0 cells. Closes C108 G-EC53.

### G-EC66 — dead inputs in the packet builders [judgment] [silent-fail] [LOW]
- **Source:** output/run_cycle_c109_steps.log
- **Evidence:** buildDeskPackets: Chicago Citizens 124 / Chicago Sports 87 still pulled; Active Arcs 0, Previous Drafts 0, Recent Quotes 0. buildInitiativePackets: "Mara directive (C108): not found", "Voice decisions (C108): none found" — reads for files nothing writes any more.
- **Open:** research-build's Chicago remnant cut covers the first; the rest engine.266.

## LEG: /city-hall (G-R)

No gaps this run.

### G-EC67 — tracker apply replaced MilestoneNotes; one weekly sentence would have erased the standing rulings [judgment] [silent-fail] [HIGH]
- **Source:** scripts/applyTrackerUpdates.js `normalizeTrackerWrite` plain-writeback block
- **Evidence:** C109 dry run: INIT-001/002/003 cells holding the C108 conversion rulings → one "C109: …" line each.
- **Fix:** DONE — the week's line is appended; a re-run with the same line is a no-op. contract 17/17, gate 34/34; C109 dry run shows history kept.

### G-EC68 — four offices moved the Stabilization Fund to Downtown; the tracker row taught them to [judgment] [silent-fail] [HIGH]
- **Source:** Initiative_Tracker INIT-001 MilestoneNotes "C107: Downtown canvass deployment authorized…", NextScheduledAction "…Downtown outreach impact assessment"; output/civic-voice/{mayor_gavel,okoro,council_d1,stabilization_fund}_c109.json
- **Evidence:** gavel wrote "C109: Accelerated disbursement to 32 Downtown businesses". Engine fact C109: tranche $400,000, 2 household grants $81,188, West Oakland. Builder 2026-09-28: the Fund is West Oakland, businesses and residents; Downtown is INIT-008 (Tran, D2, proposed C108, not voted). Sanity-read — the check that reads for this — deferred on a provider error and nothing retries it (civic.41).
- **Fix:** DONE — record fields only, speech untouched: `trackerUpdates` on decisions_c109.json + the gavel and Fund-office statements carry the engine's figures; live row NextScheduledAction → "Month-nine disbursement review", scope correction line appended and read back. The C108 "residents only" scope line was also wrong and is superseded on the row.
- **Open:** the four statements stand as said and feed "what you did last cycle" in the C110 packs. The Downtown overreach is a world event; INIT-008 is its lawful vehicle.

### G-EC69 — hourly tick ran inside the chain [judgment] [phase-ordering] [MED]
- **Source:** logs/civic-cron.log — chain mayor-gavel 06:16Z, tick close-det 06:17Z
- **Evidence:** no lock between `runChain` and `runTick`. Harmless at C109 (0 initiatives touched, no apply). With verdicts in, a tick could apply a half-built week.
- **Open:** civic.42.

## LEG: engine.265 bench (SANDBOX 0908 @131, C110, 2026-09-28)

### G-EC70 — a household minted this Cycle relocated the same week [judgment] [phase-ordering] [MED]
Bench C110: the Quintana test household arrived in Fruitvale (Phase5-Advancement) and Phase5-MigrationTracking moved all three to West Oakland ("moving up from Fruitvale") in the same fire — the intake row's neighborhood lived zero weeks. Fix (engine.267): processAdvancementRows_ records each mint in `ctx.mintedThisCycle`; processRelocations_ skips any unit holding one. Unbenched.

### G-EC71 — LifeHistory_Log Timestamp column carries three formats [judgment] [data-contract] [LOW]
Live last 3000 rows: Gregorian dates from `ctx.now` (Strain, CIVIC/MEDIA-Event, Career, Neighborhood, Household …), `C<n>` stamps (Advancement, Promotion, Media), and `Y3C4` stamps (Micro-Event, youth texture). The `Cycle` column carries the sim clock on every row; 265 of 3000 rows have a blank Name (relocation writes `''`). Not fixed — a reader audit of the Timestamp column comes first (compressLifeHistory and page tooling may parse it). Filed under engine.266.

### G-EC72 — relocations funnel into West Oakland from C110 [sim] [observation] [MED]
Bench C110: 20 of 23 relocations landed in West Oakland; C111: 13 of 20. Live C109 spread 9 moves over 4 hoods. Not the stack: the trajectory is deterministic on last Cycle's Neighborhood_Map, and live C109's map already scores West Oakland +2 (Sentiment 0.45 vs city 0.29, MigrationFlow 4) → `growth` (+1.5 fit, pressure 0→1) at the C110 fire on any code. The self-limit is HousingPressure (−pressure/4) rising under sustained growth. Sim call for the builder: a one-hood boom week after the Stabilization Fund's West Oakland scope correction — ride it (start/peak/end is the doctrine) or damp the fit bonus.
