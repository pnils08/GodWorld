# /run-cycle Gap Log — Cycle 108

**Generated:** 2026-09-20T20:56:57.500Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 4 HIGH / 13 MED / 3 LOW patterns flagged by engineAuditor; 2 improvements; 0 incoherence findings. Pattern types: repeating-event=2, math-imbalance=14, coverage-gap=1, production-imbalance=1, improvement=2.

**Mechanical pass:** 48 entries (HIGH 4, MED 33, LOW 10). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Fruitvale: decay [Sentiment -0.030, RetailVitality -1.32, HousingPressure +1.000] — Sentiment now 0.44 (2 of 22, city median 0.33); RetailVi [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.030","RetailVitality -1.32","HousingPressure +1.000"], standing={"Sentiment":{"current":0.44,"rank":2,"of":22,"cityMedian":0.33},"RetailVitality":{"current":9.67,"rank":5,"of":22,"cityMedian":6.43},"HousingPressure":{"current":1.5,"rank":15,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Affected: nbhd=Fruitvale
- **Status:** OPEN

### G-EC2 — Jack London: decay [Sentiment -0.110, RetailVitality -1.07, HousingPressure +1.000] — Sentiment now 0.33 (11 of 22, city median 0.33); Retai [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 7 • Fields: Neighborhood="Jack London", decaySignals=["Sentiment -0.110","RetailVitality -1.07","HousingPressure +1.000"], standing={"Sentiment":{"current":0.33,"rank":11,"of":22,"cityMedian":0.33},"RetailVitality":{"current":12.06,"rank":1,"of":22,"cityMedian":6.43},"HousingPressure":{"current":3.5,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Jack London
- **Status:** OPEN

### G-EC3 — Grand Lake: decay [Sentiment -0.300, RetailVitality -2.12, HousingPressure +1.000] — Sentiment now 0.33 (12 of 22, city median 0.33); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["Sentiment -0.300","RetailVitality -2.12","HousingPressure +1.000"], standing={"Sentiment":{"current":0.33,"rank":12,"of":22,"cityMedian":0.33},"RetailVitality":{"current":8.52,"rank":7,"of":22,"cityMedian":6.43},"HousingPressure":{"current":3,"rank":16,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC4 — Uptown: decay [Sentiment -0.150, RetailVitality -1.26, HousingPressure +1.000] — Sentiment now 0.25 (20 of 22, city median 0.33); RetailVita [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["Sentiment -0.150","RetailVitality -1.26","HousingPressure +1.000"], standing={"Sentiment":{"current":0.25,"rank":20,"of":22,"cityMedian":0.33},"RetailVitality":{"current":10.04,"rank":4,"of":22,"cityMedian":6.43},"HousingPressure":{"current":5,"rank":22,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
- **Status:** OPEN

### G-EC5 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC6 — generationalEventsEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — runCareerEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2. Writer touches Business_Ledger, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — runCivicRoleEngine.js field 'TierRole' not on 'Simulation_Ledger' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'Simulation_Ledger'; 'TierRole' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC10 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC11 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC13 — applyStorySeeds.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC14 — applyStorySeeds.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC15 — applyStorySeeds.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC16 — applyStorySeeds.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC17 — applyStorySeeds.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC18 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC19 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC20 — storylineWeavingEngine.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC21 — storylineWeavingEngine.js references field-name 'CitizenRoles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CitizenRoles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC22 — storylineWeavingEngine.js references field-name 'ConflictType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ConflictType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC23 — storylineWeavingEngine.js references field-name 'RelationshipImpact' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelationshipImpact' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC24 — storylineWeavingEngine.js references field-name 'CrossStorylineLinks' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CrossStorylineLinks' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC25 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC26 — bylineEngine.js references field-name 'AssignedReporter' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'AssignedReporter' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC27 — priorityEngine.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC28 — priorityEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC29 — Downtown: decay [RetailVitality -0.67, HousingPressure +1.000] — RetailVitality now 11.18 (2 of 22, city median 6.43); HousingPressure now 5 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["RetailVitality -0.67","HousingPressure +1.000"], standing={"RetailVitality":{"current":11.18,"rank":2,"of":22,"cityMedian":6.43},"HousingPressure":{"current":5,"rank":19,"of":22,"cityMedian":0},"Sentiment":{"current":0.33,"rank":10,"of":22,"cityMedian":0.33}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Downtown
- **Status:** OPEN

### G-EC30 — Rockridge: decay [Sentiment -0.160, HousingPressure +1.000] — Sentiment now 0.29 (16 of 22, city median 0.33); HousingPressure now 5 (21 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 8 • Fields: Neighborhood="Rockridge", decaySignals=["Sentiment -0.160","HousingPressure +1.000"], standing={"Sentiment":{"current":0.29,"rank":16,"of":22,"cityMedian":0.33},"HousingPressure":{"current":5,"rank":21,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Rockridge
- **Status:** OPEN

### G-EC31 — Adams Point: decay [Sentiment -0.280, RetailVitality -1.38] — Sentiment now 0.37 (7 of 22, city median 0.33); RetailVitality now 4.96 (19 of [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 9 • Fields: Neighborhood="Adams Point", decaySignals=["Sentiment -0.280","RetailVitality -1.38"], standing={"Sentiment":{"current":0.37,"rank":7,"of":22,"cityMedian":0.33},"RetailVitality":{"current":4.96,"rank":19,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Adams Point
- **Status:** OPEN

### G-EC32 — Chinatown: decay [Sentiment -0.040, RetailVitality -2.07] — Sentiment now 0.29 (17 of 22, city median 0.33); RetailVitality now 7.54 (10 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.040","RetailVitality -2.07"], standing={"Sentiment":{"current":0.29,"rank":17,"of":22,"cityMedian":0.33},"RetailVitality":{"current":7.54,"rank":10,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC33 — Brooklyn: decay [Sentiment -0.240, RetailVitality -0.80] — Sentiment now 0.32 (13 of 22, city median 0.33); RetailVitality now 6.07 (12 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 13 • Fields: Neighborhood="Brooklyn", decaySignals=["Sentiment -0.240","RetailVitality -0.80"], standing={"Sentiment":{"current":0.32,"rank":13,"of":22,"cityMedian":0.33},"RetailVitality":{"current":6.07,"rank":12,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Brooklyn
- **Status:** OPEN

### G-EC34 — Glenview: decay [Sentiment -0.280, RetailVitality -0.59] — Sentiment now 0.38 (6 of 22, city median 0.33); RetailVitality now 4.02 (22 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 15 • Fields: Neighborhood="Glenview", decaySignals=["Sentiment -0.280","RetailVitality -0.59"], standing={"Sentiment":{"current":0.38,"rank":6,"of":22,"cityMedian":0.33},"RetailVitality":{"current":4.02,"rank":22,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Glenview
- **Status:** OPEN

### G-EC35 — Dimond: decay [Sentiment -0.390, RetailVitality -1.12] — Sentiment now 0.26 (19 of 22, city median 0.33); RetailVitality now 5.67 (16 of 22, [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 16 • Fields: Neighborhood="Dimond", decaySignals=["Sentiment -0.390","RetailVitality -1.12"], standing={"Sentiment":{"current":0.26,"rank":19,"of":22,"cityMedian":0.33},"RetailVitality":{"current":5.67,"rank":16,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Dimond
- **Status:** OPEN

### G-EC36 — Ivy Hill: decay [Sentiment -0.320, RetailVitality -0.91] — Sentiment now 0.29 (18 of 22, city median 0.33); RetailVitality now 4.33 (21 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 17 • Fields: Neighborhood="Ivy Hill", decaySignals=["Sentiment -0.320","RetailVitality -0.91"], standing={"Sentiment":{"current":0.29,"rank":18,"of":22,"cityMedian":0.33},"RetailVitality":{"current":4.33,"rank":21,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Ivy Hill
- **Status:** OPEN

### G-EC37 — San Antonio: decay [Sentiment -0.230, RetailVitality -1.02] — Sentiment now 0.31 (15 of 22, city median 0.33); RetailVitality now 4.37 (20 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 18 • Fields: Neighborhood="San Antonio", decaySignals=["Sentiment -0.230","RetailVitality -1.02"], standing={"Sentiment":{"current":0.31,"rank":15,"of":22,"cityMedian":0.33},"RetailVitality":{"current":4.37,"rank":20,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=San Antonio
- **Status:** OPEN

### G-EC38 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC39 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC40 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC41 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC42 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC43 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC44 — storylineWeavingEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC45 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC46 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC47 — Temescal: decay [Sentiment -0.080, RetailVitality -1.03] — Sentiment now 0.38 (5 of 22, city median 0.33); RetailVitality now 5.02 (18 of 22 [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c108.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 3 • Fields: Neighborhood="Temescal", decaySignals=["Sentiment -0.080","RetailVitality -1.03"], standing={"Sentiment":{"current":0.38,"rank":5,"of":22,"cityMedian":0.33},"RetailVitality":{"current":5.02,"rank":18,"of":22,"cityMedian":6.43}}, matchingActiveInitiatives=["INIT-005"] • Affected: init=INIT-005 / nbhd=Temescal
- **Status:** OPEN

### G-EC48 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC49 — Prior cycle's gap log (C107) had 87 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c107_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC50 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC51 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC52 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC53 — G-EC86 snapshot rebase must run BEFORE the fire, and it is two scratch scripts [judgment] [silent-fail] [HIGH]
- **Source:** .claude/skills/run-cycle/SKILL.md Step 4 "Hand writes between fires"; output/engine_audit_c107.json `snapshotNotes` (commit cb108e84)
- **Evidence:** engine.241 Civis recalibration hand-wrote live Crime_Metrics (100 cells, Montclair row 23→22) + Neighborhood_Map (CrimeIndex 21, RetailVitality 22) on 2026-09-19. Pre-fire diff snapshot-vs-live caught it; after the fire live no longer holds C107's closing values and the correction cannot be derived.
- **Effect:** uncorrected, the C108 audit files "Downtown property crime 51→31" class diffs and ships them to cron-civic-run as world events.
- **Fix:** skill text moved to a pre-fire Step 2.5 this session. Still owed: one deterministic script (diff `engine_audit_c{XX-1}.json snapshots.*` vs live; report; `--rebase` with a note). An unattended run has no one to notice a hand write.
- **Residue:** detectAnomalies 5-cycle mean reads C103–C106 on the old scale — KONO "−3.0σ" is scale, real move 23→21. Ages out by C112.

### G-EC54 — schemas/SCHEMA_HEADERS.md carried 5 quota-SKIPPED tabs; header-drift detector filed 34 false entries [judgment] [header-drift] [HIGH]
- **Source:** scripts/regenSchemaHeaders.js (pre-fix :95-104); schemas/SCHEMA_HEADERS.md dated 2026-09-09
- **Evidence:** World_Drift_Report, World_Population, WorldEvents_Ledger, WorldEvents_V3_Ledger, Youth_Events written as `SKIPPED: Quota exceeded`. First Step 6 pass: 82 entries, 67 header-drift (every World_Population field "not on any sheet" while the live row reads them fine). After regen: 48 entries, 32 header-drift.
- **Fix:** DONE — quota errors retry 3× at 65s; any tab still quota-blocked aborts non-zero and leaves the old file. Regenerated: 66 tabs, 0 SKIPPED.
- **Open:** the remaining 23 MED header-drift rows (`TierRole`, `FullName`, applyStorySeeds/storylineWeaving/bylineEngine/priorityEngine storyline fields, runYouthEngine `PopID`/`ID`) are real indexOf-returns-−1 candidates, pre-date C108, untriaged.

### G-EC55 — real-world faith names survive on Business_Ledger; the engine drew one into a C108 seed [judgment] [silent-fail] [HIGH]
- **Source:** Business_Ledger BIZ-00087; Story_Seed_Deck C108 seed cb09b09b ("Eric Taveras spotted at …"); docs/canon/INSTITUTIONS.md:240 (ruled sub → Lake Merritt Mindfulness Sangha); scripts/applyFaithCanonSubsP3.js (touched Faith_Organizations + Simulation_Ledger only)
- **Evidence:** Step 5.5 canon sweep failed loud on "East Bay Meditation Center" and wrote nothing. Beat dump shows 9 more ruled-away names still on Business_Ledger: Acts Full Gospel, Allen Temple, Cathedral of Christ the Light, Beth Jacob, Masjid Al-Islam, Temple Sinai, Islamic Center of Oakland, First Unitarian Church, St. Columba. Faith_Ledger rows C78–C82 also carry the old name (history, left).
- **Fix:** DONE for the blocker — 3 cells written + read back (Business_Ledger!B84; Story_Seed_Deck!H274 Why, row 274 Businesses). Texture rebuilt 17/22 hoods.
- **Open (builder go — canon names on the world's record):** apply the other 9 ruled substitutions to Business_Ledger. Any sighting/venue draw can surface them into seeds the desk crons read.

### G-EC56 — content drafter wrote a line that contradicts the tracker [judgment] [silent-fail] [MED]
- **Source:** Event_Content_Ledger row 339 `civic.fruitvale` "the Fruitvale Transit Hub construction site buzzes with activity" (auth:auto, Active=yes); Initiative_Tracker INIT-003 `design-phase`
- **Fix:** row set Active=no, read back. 4 other drafted rows left active.
- **Open:** draftContentRows validates shape (loader parity), not facts. A `source:civicNews` row should be checked against the initiative's phase before it lands active.

### G-EC57 — Engine_Errors 1: WeekRecord on a season-state row (feed authoring, engine correct) [judgment] [writeback-drift] [LOW]
- **Source:** Oakland_Sports_Feed row 226 (A's, `season-state`, `WeekRecord=A:W`); phase02-world-state/applySportsSeason.js:246
- **Evidence:** cell refused with its row named, row still counted (6 entries). Rows 224 `H:W` and 228 `A:L` accepted — first live cycle on the weekly casino path. `SportsSeason` = `playoffs` 22/22, matching the feed (no `championship` row); the @97 expectation was written against the 09-18 feed.
- **Open:** pre-flight checks required/recommended columns and names but not WeekRecord-vs-EventType; the reject was knowable before the fire. Add the `sportsWeekRecord` validator to `preflightInputCheck.js`.

### G-EC58 — POP-00957 hired out of retirement at 4.1× income [judgment] [math-anomaly] [MED]
- **Source:** Simulation_Ledger POP-00957 David Okonkwo, RoleType "Retired Insurance Adjuster", Income 29,950 → 123,500, `[Career-Hired] Hired at Alameda County Courts`
- **Evidence:** 1 of 867 comparable rows ≥1.9×. Routed engine.216: is a retired row eligible for the hire pool, and does the hire set income from the employer band without reading the prior.

### G-EC59 — ENGINE187_DIAG unreachable on a live fire [judgment] [silent-fail] [LOW]
- **Source:** utilities/webTrigger.js:52 (diag rides the web-app response only); live fire is an editor run
- **Fix owed:** `Logger.log` the diag at Phase6-ShockMonitor so it lands in the execution log Step 3.5 already pulls. Moot the day the live fire goes through the trigger.

### G-EC60 — skill-vs-reality, trued this session unless marked [judgment] [cross-cycle-debt] [MED]
- run-cycle Step 5.56: "16 beat tabs" → `meta.json` reports 22. Step 5.85: "~55KB, hood/disposition counts" → fold is 34.6KB at both C107 and C108, keys `canon,hoods,meta,orientation,pointers`, no dispositions key. Text trued to what the script prints.
- pre-mortem: `--since` auto-derive reports "no engine touches" on any same-day session (passed 2026-09-13 by hand) — OPEN, source should be `output/execution_log_c{XX-1}.txt` mtime. §3 "UNDECLARED 0 today" → 1 (`utilities/resolveCitizen.js`, header rides next deploy). §4 "MANUAL" → three read-only audit scripts exist; `auditSheetHeaders.js` schemas are S44-era (3 false misaligns: WorldEvents_V3_Ledger 7-vs-29, Story_Seed_Deck, Story_Hook_Deck) — OPEN, true the tool before wiring it.
- engine-review + build-world-summary: consumer prose still named `/sift` → `/write-edition`; pointed at run-cycle §What Happens After.
- Step 3 live fire is the one hand step; bench already fires from the terminal via the trigger token. Autonomy blocker, builder's call.
- Civic chain timing (21:00 slot decided C107 40 min after its fire, before Mon–Thu was lived; today's 14:30 decide exited on `applied:true`) — PARKED by the builder 2026-09-20, civic approach is being repurposed. No change made.

## Execution-log review — `output/execution_log_c108.txt` read line by line against `execution_log_c107.txt` (engine-sheet, 2026-09-20)

### G-EC61 — Sheets stores feed records like `4-1` / `7-2` as DATES; the engine reads the first text record of the cycle instead [judgment] [silent-fail] [HIGH]
- **Source:** log :31 `Sports sentiment: A's … (record: 3-0 … streak: W1)`; feed rows 223–226 Team Record 3-0 / 4-1 / 4-1 / 7-2; phase02-world-state/applySportsSeason.js:763, :778-781, :950
- **Evidence:** `UNFORMATTED_VALUE` read of the column — row 224 = 46113, 225 = 46113, 226 = 46205, and C107's 221 = 46054, 222 = 46082 are date serials; `3-0`, `1-0`, `0-1`, `127-35` are text (no such date). 14 of 227 cells in the column are dates. Apps Script `getValues()` returns a Date → `toString()` → the `(\d+)-(\d+)` parse returns null → the clobber guard at :778 keeps the earlier record. Same code run offline on the same rows through the Sheets API (which returns the display string) gives `record: 7-2`, A's 0.095 — so every Node reader (pre-flight, world summary, dashboard) sees the right value and nothing flags it. C107 shows the identical signature: logged `1-0` with streak `W2`, rows were 1-0 / 2-1 / 3-1.
- **Effect:** sports sentiment and anything pricing off the A's record (casino, engine.207a) run on the first text-safe record of the cycle, not the last row. C108: 3-0 instead of 7-2. Any W-L that is a valid month-day (1-1 … 12-31) is hit; early-season and playoff records are exactly that range.
- **Fix owed (code, engine-sheet):** in `readOaklandFeedEntries_` and `processFeedSheet_`, a Date in the record column becomes `(month)-(day)`; bench with a row holding a real date serial. **Sheet side (builder's tab):** format the Team Record column as plain text and re-enter the 14 cells. **Pre-flight:** fail on any numeric-stored Team Record cell — the script reads display strings today and cannot see it.

### G-EC62 — hood demographics absorb the whole CITY's migration on a table one-tenth the city's size; four small hoods grow 13–16% a cycle [judgment] [math-anomaly] [HIGH]
- **Source:** log :63-90 "24 significant shifts" (C107: 28, same four hoods); phase03-population/updateNeighborhoodDemographics.js:161-164 (`migration / liveHoodCount` per hood, absolute heads); output/beats/Neighborhood_Demographics.jsonl vs prev/
- **Evidence:** table sum 40,661 → 41,962 (+3.2%) in one cycle against city 391,510 → 392,748 (+0.32%). Net city migration 1,239 ÷ 22 ≈ 56 heads lands on every hood regardless of size: the 18 hoods near 2,000 grow 2.5–2.8%; Lake Merritt 471 → 532 (+13.0%), Uptown 493 → 559 (+13.4%), KONO 399 → 463 (+16.0%), Baylight 381 → 443 (+16.3%). C107 logged 15 / 15 / 19 / 19% for the same four.
- **Effect:** the table doubles in ~23 cycles, the four small hoods in ~5. Unemployed and Sick are counts on that base, so the log's "KONO unemployment up 17%, illness up 15%" is headcount growth, not a labour or health event — and those lines are shift events consumers can pick up. Lake Merritt at 532 people beside Temescal at 2,645 is a seeding artefact the equal split is now erasing from the wrong direction.
- **Fix:** sim judgement, builder included — what scale the table stands at relative to the city, and whether inflow splits by hood size / canon attraction instead of equally. Not cut.

### G-EC63 — engine-review C108 mis-stated the ledger growth; corrected [judgment] [writeback-drift] [LOW]
- **Source:** log :91 (`generateGenericCitizens_` 8 → the Generic_Citizens POOL, not the ledger), :117 (`checkForPromotions_` 7 promoted, 6 by migration wave), :110 (`P6 BIRTH POP-01114`), :129 (emergence `POP-01122`)
- **Evidence:** ledger 943 → 952 = 1 birth (Marcus Skenes, Lake Merritt, HH-0102-F014) + 7 pool promotions POP-01115…01121 (Grand Lake, Ivy Hill, Uptown, Eastlake, Brooklyn, Dimond, Glenview) + 1 emergence (Joel Roberts, West Oakland, 2 friendship bonds). `popIdHighWater` 1113 → 1122, 9 ids, matches. The review's "8 generic citizens minted into the short hoods" was read off the wrong log line. Review text fixed.
- **Note:** the newborn's RoleType is `student` at age 0 (BirthYear 2042).

### G-EC64 — honorifics parsed as first names: the same two reporters are re-filed to Intake review every cycle [judgment] [cross-cycle-debt] [MED]
- **Source:** log :113 `processIntake_ v3: … flagged 1 for review` (C107: 2); :199 `routeCitizenUsageToIntake_ … new: 2`; Intake tab rows `Sgt. | Rachel Torres`, `Dr. | Lila Mezran` (C105, C106, C107 pieces)
- **Evidence:** both are existing ledger citizens and Tribune reporters. The usage router splits "Dr. Lila Mezran" as First=`Dr.`, finds no match, files a new-citizen intake; the intake guard correctly refuses it as an honorific. Net: nothing is minted, but their usage never credits the real rows and the review queue grows by 1–2 a cycle with no reader.
- **Fix owed:** strip a leading honorific before the name lookup in the usage router (the refusal message already has the list).

### G-EC65 — mobility and career counters read zero two cycles running [judgment] [math-anomaly] [MED]
- **Source:** log :144 `trackWealthMobility_ … 0 moves`, :149 `processEducationCareer_ … Education 0, MinorStages 0/41, Career 0, Stagnant 279, Income 0`; C107 :136/:142 identical zeros (Stagnant 272); C105 logged 48 mobility moves (12 up / 36 down)
- **Effect:** 279 adults flagged stagnant and no career, education or income transition fires; wealth brackets have not moved since C105 at the latest. SIM_DOCTRINE §16 candidate — a gate whose input stopped crossing it. Not traced.

### G-EC66 — four CIVIC seeds saturate the priority cap at the identical raw score [judgment] [math-anomaly] [LOW]
- **Source:** log :162-165 `priorityEngine clamp: raw=11.70 final=10.00 domain=CIVIC severity=MED` ×4 (C107: ×8, same 11.70); utilities/priorityEngine.js:380
- **Effect:** every CIVIC/MED seed computes the same 11.70 and clamps to 10.00 — they tie at the ceiling, so priority carries no order among them and CIVIC always outranks everything capped below 10.

### G-EC67 — bond engine counts the header row as a 23rd neighborhood [judgment] [header-drift] [LOW]
- **Source:** log :119 `Loaded 23 neighborhoods from Neighborhood_Map` (map has 22; C107 also 23); phase05-citizens/bondEngine.js:157-158 (`startRow` is forced to 0 whether or not `cached.values[0]` is the header)
- **Effect:** the literal string `Neighborhood` sits in `ctx.neighborhoodList`. Today it is only a membership test (:1164), so nothing reads it as a place. One-line fix, rides the next deploy.

### G-EC68 — smaller log observations, no action owed this cycle [judgment] [cross-cycle-debt] [INFO]
- `compactCrimeSpikes_` logs twice per cycle (:173, :189, both "carrying 2") — called from the evening snapshot and again from the state save; same result both times. New since C107.
- 25s gap inside Advancement between `checkEmergencePromotions_` (:128) and `seedEmergenceBonds_` (:129) for one promotion; C107 was 47s. The slowest phase (30.6s) is mostly this.
- `buildCommuteFlows_` "1 dangling biz-id" (C107 and C108) = POP-00239 Xiu Cello `BIZ-000181`, a six-digit typo for BIZ-00181 Mayday Movers (same hood, role Mover). **Fixed on live, read back.** 205 unresolved commuters remain by design (137 city-wide, 67 off-ledger).
- `updateCivicApprovalRatings_` logs 9 officials; D7 Warren Ashford is absent because his rating did not move (67 → 67), not because the seat was skipped.
- engine.174 short-hood deficits are closing as built: East Oakland 7 → 5, Baylight 9 → 6, Glenview 7 → 5, Dimond 3 → 2, Brooklyn 6 → 5.
