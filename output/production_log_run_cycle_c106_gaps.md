# /run-cycle Gap Log — Cycle 106

**Generated:** 2026-09-07T02:46:45.560Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 4 HIGH / 15 MED / 8 LOW patterns flagged by engineAuditor; 4 improvements; 1 incoherence findings. Pattern types: repeating-event=1, math-imbalance=19, coverage-gap=1, production-imbalance=1, improvement=4, incoherence=1.

**Mechanical pass:** 53 entries (HIGH 3, MED 36, LOW 13). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Downtown: decay [Sentiment -0.400, RetailVitality -2.76, HousingPressure +1.000] — Sentiment now 0.41 (8 of 22, city median 0.36); RetailVit [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["Sentiment -0.400","RetailVitality -2.76","HousingPressure +1.000"], standing={"Sentiment":{"current":0.41,"rank":8,"of":22,"cityMedian":0.36},"RetailVitality":{"current":9.55,"rank":4,"of":22,"cityMedian":7.404999999999999},"HousingPressure":{"current":3,"rank":18,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Downtown
- **Status:** OPEN

### G-EC2 — Rockridge: decay [Sentiment -0.380, RetailVitality -0.62, HousingPressure +1.000] — Sentiment now 0.46 (3 of 22, city median 0.36); RetailVi [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 8 • Fields: Neighborhood="Rockridge", decaySignals=["Sentiment -0.380","RetailVitality -0.62","HousingPressure +1.000"], standing={"Sentiment":{"current":0.46,"rank":3,"of":22,"cityMedian":0.36},"RetailVitality":{"current":9.89,"rank":3,"of":22,"cityMedian":7.404999999999999},"HousingPressure":{"current":3,"rank":19,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Rockridge
- **Status:** OPEN

### G-EC3 — Grand Lake: decay [Sentiment -0.670, RetailVitality -2.17, HousingPressure +1.000] — Sentiment now 0.32 (17 of 22, city median 0.36); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["Sentiment -0.670","RetailVitality -2.17","HousingPressure +1.000"], standing={"Sentiment":{"current":0.32,"rank":17,"of":22,"cityMedian":0.36},"RetailVitality":{"current":8.46,"rank":6,"of":22,"cityMedian":7.404999999999999},"HousingPressure":{"current":2.5,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC4 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC5 — generationalEventsEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — runCareerEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2. Writer touches Business_Ledger, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — runCivicRoleEngine.js field 'TierRole' not on 'Simulation_Ledger' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'Simulation_Ledger'; 'TierRole' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC9 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC10 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — applyStorySeeds.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC13 — applyStorySeeds.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC14 — applyStorySeeds.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC15 — applyStorySeeds.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC16 — applyStorySeeds.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC17 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC18 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC19 — storylineWeavingEngine.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC20 — storylineWeavingEngine.js references field-name 'CitizenRoles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CitizenRoles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC21 — storylineWeavingEngine.js references field-name 'ConflictType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ConflictType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC22 — storylineWeavingEngine.js references field-name 'RelationshipImpact' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelationshipImpact' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC23 — storylineWeavingEngine.js references field-name 'CrossStorylineLinks' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CrossStorylineLinks' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC24 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC25 — bylineEngine.js references field-name 'AssignedReporter' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'AssignedReporter' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC26 — priorityEngine.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC27 — priorityEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC28 — Piedmont Ave: decay [Sentiment -0.350, RetailVitality -1.40] — Sentiment now 0.4 (9 of 22, city median 0.36); RetailVitality now 7.3 (12 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 11 • Fields: Neighborhood="Piedmont Ave", decaySignals=["Sentiment -0.350","RetailVitality -1.40"], standing={"Sentiment":{"current":0.4,"rank":9,"of":22,"cityMedian":0.36},"RetailVitality":{"current":7.3,"rank":12,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Piedmont Ave
- **Status:** OPEN

### G-EC29 — Chinatown: decay [Sentiment -0.400, RetailVitality -1.75] — Sentiment now 0.39 (10 of 22, city median 0.36); RetailVitality now 8.07 (8 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.400","RetailVitality -1.75"], standing={"Sentiment":{"current":0.39,"rank":10,"of":22,"cityMedian":0.36},"RetailVitality":{"current":8.07,"rank":8,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC30 — Brooklyn: decay [Sentiment -0.710, RetailVitality -0.84] — Sentiment now 0.26 (21 of 22, city median 0.36); RetailVitality now 5.54 (19 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 13 • Fields: Neighborhood="Brooklyn", decaySignals=["Sentiment -0.710","RetailVitality -0.84"], standing={"Sentiment":{"current":0.26,"rank":21,"of":22,"cityMedian":0.36},"RetailVitality":{"current":5.54,"rank":19,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Brooklyn
- **Status:** OPEN

### G-EC31 — Eastlake: decay [Sentiment -0.680, RetailVitality -0.73] — Sentiment now 0.3 (19 of 22, city median 0.36); RetailVitality now 6.77 (13 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 14 • Fields: Neighborhood="Eastlake", decaySignals=["Sentiment -0.680","RetailVitality -0.73"], standing={"Sentiment":{"current":0.3,"rank":19,"of":22,"cityMedian":0.36},"RetailVitality":{"current":6.77,"rank":13,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Eastlake
- **Status:** OPEN

### G-EC32 — Glenview: decay [Sentiment -0.670, RetailVitality -1.25] — Sentiment now 0.31 (18 of 22, city median 0.36); RetailVitality now 5.66 (18 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 15 • Fields: Neighborhood="Glenview", decaySignals=["Sentiment -0.670","RetailVitality -1.25"], standing={"Sentiment":{"current":0.31,"rank":18,"of":22,"cityMedian":0.36},"RetailVitality":{"current":5.66,"rank":18,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Glenview
- **Status:** OPEN

### G-EC33 — Dimond: decay [Sentiment -0.680, RetailVitality -0.67] — Sentiment now 0.33 (14 of 22, city median 0.36); RetailVitality now 6.55 (14 of 22, [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 16 • Fields: Neighborhood="Dimond", decaySignals=["Sentiment -0.680","RetailVitality -0.67"], standing={"Sentiment":{"current":0.33,"rank":14,"of":22,"cityMedian":0.36},"RetailVitality":{"current":6.55,"rank":14,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Dimond
- **Status:** OPEN

### G-EC34 — Ivy Hill: decay [Sentiment -0.730, RetailVitality -0.72] — Sentiment now 0.36 (12 of 22, city median 0.36); RetailVitality now 3.66 (22 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 17 • Fields: Neighborhood="Ivy Hill", decaySignals=["Sentiment -0.730","RetailVitality -0.72"], standing={"Sentiment":{"current":0.36,"rank":12,"of":22,"cityMedian":0.36},"RetailVitality":{"current":3.66,"rank":22,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Ivy Hill
- **Status:** OPEN

### G-EC35 — San Antonio: decay [Sentiment -0.670, RetailVitality -0.65] — Sentiment now 0.23 (22 of 22, city median 0.36); RetailVitality now 6.48 (15 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 18 • Fields: Neighborhood="San Antonio", decaySignals=["Sentiment -0.670","RetailVitality -0.65"], standing={"Sentiment":{"current":0.23,"rank":22,"of":22,"cityMedian":0.36},"RetailVitality":{"current":6.48,"rank":15,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=San Antonio
- **Status:** OPEN

### G-EC36 — KONO: decay [Sentiment -0.380, RetailVitality -2.29] — Sentiment now 0.33 (15 of 22, city median 0.36); RetailVitality now 8.24 (7 of 22, ci [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["Sentiment -0.380","RetailVitality -2.29"], standing={"Sentiment":{"current":0.33,"rank":15,"of":22,"cityMedian":0.36},"RetailVitality":{"current":8.24,"rank":7,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC37 — Lake Merritt: decay [Sentiment -0.340, RetailVitality -1.13] — Sentiment now 0.46 (4 of 22, city median 0.36); RetailVitality now 7.51 (11 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 20 • Fields: Neighborhood="Lake Merritt", decaySignals=["Sentiment -0.340","RetailVitality -1.13"], standing={"Sentiment":{"current":0.46,"rank":4,"of":22,"cityMedian":0.36},"RetailVitality":{"current":7.51,"rank":11,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Lake Merritt
- **Status:** OPEN

### G-EC38 — Uptown: decay [Sentiment -0.450, HousingPressure +1.000] — Sentiment now 0.43 (6 of 22, city median 0.36); HousingPressure now 3 (21 of 22,  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["Sentiment -0.450","HousingPressure +1.000"], standing={"Sentiment":{"current":0.43,"rank":6,"of":22,"cityMedian":0.36},"HousingPressure":{"current":3,"rank":21,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
- **Status:** OPEN

### G-EC39 — Baylight District: decay [Sentiment -0.720, RetailVitality -1.09] — Sentiment now 0.33 (16 of 22, city median 0.36); RetailVitality now 3.93 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 22 • Fields: Neighborhood="Baylight District", decaySignals=["Sentiment -0.720","RetailVitality -1.09"], standing={"Sentiment":{"current":0.33,"rank":16,"of":22,"cityMedian":0.36},"RetailVitality":{"current":3.93,"rank":21,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Baylight District
- **Status:** OPEN

### G-EC40 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC41 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC42 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC43 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC44 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC45 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC46 — storylineWeavingEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC47 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC48 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC49 — Temescal: decay [Sentiment -0.370, RetailVitality -0.98, HousingPressure +1.000] — Sentiment now 0.51 (1 of 22, city median 0.36); RetailVit [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 3 • Fields: Neighborhood="Temescal", decaySignals=["Sentiment -0.370","RetailVitality -0.98","HousingPressure +1.000"], standing={"Sentiment":{"current":0.51,"rank":1,"of":22,"cityMedian":0.36},"RetailVitality":{"current":10.24,"rank":1,"of":22,"cityMedian":7.404999999999999},"HousingPressure":{"current":4.5,"rank":22,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-005"] • Affected: init=INIT-005 / nbhd=Temescal
- **Status:** OPEN

### G-EC50 — West Oakland: decay [Sentiment -0.340, RetailVitality -1.16] — Sentiment now 0.43 (5 of 22, city median 0.36); RetailVitality now 5.01 (20 o [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["Sentiment -0.340","RetailVitality -1.16"], standing={"Sentiment":{"current":0.43,"rank":5,"of":22,"cityMedian":0.36},"RetailVitality":{"current":5.01,"rank":20,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=["INIT-001","INIT-002","INIT-007"] • Affected: init=INIT-001,INIT-002,INIT-007 / nbhd=West Oakland
- **Status:** OPEN

### G-EC51 — Fruitvale: decay [Sentiment -0.310, RetailVitality -1.67] — Sentiment now 0.48 (2 of 22, city median 0.36); RetailVitality now 8.05 (9 of 22 [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.310","RetailVitality -1.67"], standing={"Sentiment":{"current":0.48,"rank":2,"of":22,"cityMedian":0.36},"RetailVitality":{"current":8.05,"rank":9,"of":22,"cityMedian":7.404999999999999}}, matchingActiveInitiatives=["INIT-002","INIT-007"] • Affected: init=INIT-002,INIT-007 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC52 — East Oakland: decay [Sentiment -0.680, RetailVitality -1.34, HousingPressure +0.500] — Sentiment now 0.28 (20 of 22, city median 0.36); Reta [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c106.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 23 • Fields: Neighborhood="East Oakland", decaySignals=["Sentiment -0.680","RetailVitality -1.34","HousingPressure +0.500"], standing={"Sentiment":{"current":0.28,"rank":20,"of":22,"cityMedian":0.36},"RetailVitality":{"current":6.01,"rank":17,"of":22,"cityMedian":7.404999999999999},"HousingPressure":{"current":0.5,"rank":15,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-002","INIT-007"] • Affected: init=INIT-002,INIT-007 / nbhd=East Oakland
- **Status:** OPEN

### G-EC53 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC54 — Prior cycle's gap log (C105) had 56 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c105_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC55 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC56 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC57 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*

- **G-EC58 [judgment] [HIGH]** — Neighborhood_Map Sentiment sawtooth: all 22 hoods +0.375 mean at C105 (4 hoods >1.0 — Adams Point 1.03, Baylight 1.05, Dimond 1.01, Ivy Hill 1.09; the scale's ceiling is 1), −0.515 mean at C106, landing just under C104. C105 log's named sentiment sources sum ≈ +0.14; ≈ +0.25/hood at C105 has no logged source. G-EC1–3 + G-EC28–43 (19 `math-anomaly` hood rows) are the C106 half of this one event, not 19 decays; C105's 22 "improvement" rows were the other half. Anomaly detector can't see it (3-cycle mean includes C105). Investigate the Sentiment write path Phase2-CityDynamics → Phase10-NeighborhoodMap for a one-shot term at C105 (first live fire after the @46–@57 stack) and confirm whether Sentiment is clamped on save (no `Math.min(1` on Sentiment found in phase10-persistence on first grep). Detail: `output/engine_anomalies_c106_followup.md` §B. **Status:** OPEN — engine row filed.

- **G-EC59 [judgment] [HIGH]** — Sim-year literal `2041` still live at ≥15 engine sites one cycle after the calendar rolled to 2042 (advanceSimulationCalendar.js §SIM YEAR: cycles 105–156 = 2042; engine.148 swept the `2040+floor(cycle/52)` class, not the literal class). Assigning sites (not fallbacks): generateGenericCitizens.js:511,600 · runConductEngine.js:78 · householdFormationEngine.js:821 · citizenContextBuilder.js:39 · runNeighborhoodEngine.js:234 · godWorldEngine2.js:1384,1435,1446 · processAdvancementIntake.js:1477,1658,1845 · updateCivicApprovalRatings.js:1016,1144,1222 · runCareerEngine.js:867 · utilities/ensureNeighborhoodDemographics.js:372; scripts side auditSimulationLedger.js + utilities/archiveCitizenExits.js:120. Effect since C105: ages one year young at those sites, roster/household-intake mints stamp BirthYear one year late, generic-citizen type boundaries off by one. Empirical: POP-01084 Zora Whitfield (P6 BIRTH C106) BirthYear 2042 is CORRECT and the ledger audit flags her age −1 — the audit's anchor is the stale one. Fix = one sweep to `S.simYear` / `simYearFromCycle`, bench C107, audit age-OOB 0. **Status:** OPEN — engine row filed.

- **G-EC60 [judgment] [HIGH]** — Two Tier-4 Lake Merritt incomes doubled with 1% peer share: POP-00260 Kevel Phoul (warehouse worker) 45,400→104,500→215,100 over C104–C106; POP-00268 Shane Phelps (janitor) 93,271→106,000→283,800. Both carry a C106 `Maneuver-Climb` LifeHistory row; audit `citizenIncomes` shows 0 other ≥50% movers among 195 climbers. A janitor at 283,800 is a write, not a story. Identify the Income writer (engine.157 climb payoff / engine.96 T10 ownerDraw / engine.61 money loop) and cap to the hood pay band. Suppressed from the edition. Detail: followup §A. **Status:** OPEN — engine row filed.

- **G-EC61 [judgment] [MED]** — Remedy-measurement expectations are uncalibrated: both measured rows this cycle (INIT-002 ViolentCrimeIndex expected −0.05 observed −6; RetailVitality expected +0.02 observed −1.16 after +2.65 at C105) miss by 50–120×. Every verdict the loop has produced (C105 overshot, C106 overshot + not-firing) is against a constant two orders of magnitude below the engine's step size. Expectation writer (engineAuditor `measureRemedies` / `recommendRemedy`) should take magnitude from the prior cycle's observed delta. **Status:** OPEN.

- **G-EC62 [judgment] [LOW]** — Step 5.5 `buildNeighborhoodTexture.js` failed twice on `deepseek/deepseek-chat` "Provider returned error" (upstream 429; the civic chain fell back to kimi the same evening). Script had a single hardcoded model; world_state.json shipped with 0 hoods until the retry. Fixed this session: `TEXTURE_MODELS` chain deepseek → kimi → qwen, same family order as the civic cron. **Status:** CLOSED (commit this session).

- **G-EC63 [judgment] [LOW]** — `applyOwnerDraw_` engine.96 T10: 5 businesses, 5 owners, **2 paid, 1 gains, 6 unresolved** — more unresolved than owners. Carried from C105 shape? Not checked this cycle. Verify the unresolved count's denominator next fire. **Status:** OPEN.

- **G-EC64 [judgment] [INFO]** — `affectedEntities.citizens` resolver seated 6 citizens minted THIS cycle (POP-01086–01091) as the voice of Brooklyn / Eastlake / Glenview / Dimond in the hood-decay rows. Thin-ledger hoods pick the newest row. Sift: don't quote a one-cycle-old citizen as a neighborhood's mood; resolver could weight by tenure. **Status:** OPEN (research-build, resolveAffectedCitizens).

- **G-EC65 [judgment] [INFO]** — header-drift mechanical count fell 52 (C105) → 33 (C106); the remainder is the same carried set (applyStorySeeds/storylineWeaving/bylineEngine/priorityEngine legacy field names, TierRole/FullName). No new drift from the @46–@64 deploys. **Status:** carried.

- **G-EC66 [judgment] [INFO]** — Civic chain re-entry (cron-civic-run.js): every re-entry re-rolled all 18 voices; C105 halted twice (council_d1 14:33, mayor on re-roll 14:37). Fixed `cf62c58c` — `existingVoice()` reuse per seat, agenda re-injected, 911 allowed. Third entry closed 14:54, tracker written live. Sunday `--stage=status` crashed every week on a missing `https` require (rb catch) — fixed this session. **Status:** CLOSED.

- **G-EC67 [judgment] [INFO]** — engine.90 Citizen Archive first live fire: flag 1, Phase 11 archived 54 (44 traded-away, 10 deceased), 0 skipped, ledger 968→922 (+8 minted), LifeHistory retain 12 cycles archived 106 rows, audit on-both 0 / restored 0 / flagged 0. Commit 11 acceptance MET. `buildCitizenCards.js --apply --from-archive` still to run (NEXT). **Status:** CLOSED.

