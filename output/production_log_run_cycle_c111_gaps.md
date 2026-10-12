# /run-cycle Gap Log — Cycle 111

**Generated:** 2026-10-11T21:30:10.011Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 2 HIGH / 18 MED / 4 LOW patterns flagged by engineAuditor; 1 improvements; 0 incoherence findings. Pattern types: stuck-initiative=2, repeating-event=1, math-imbalance=18, coverage-gap=1, production-imbalance=1, improvement=1.

**Mechanical pass:** 43 entries (HIGH 2, MED 25, LOW 15). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Fruitvale: decay [Sentiment -0.170, RetailVitality -2.04, HousingPressure +1.000] — Sentiment now 0.52 (1 of 22, city median 0.32); RetailVi [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.170","RetailVitality -2.04","HousingPressure +1.000"], standing={"Sentiment":{"current":0.52,"rank":1,"of":22,"cityMedian":0.32},"RetailVitality":{"current":10.55,"rank":5,"of":22,"cityMedian":8.275},"HousingPressure":{"current":4.5,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Affected: nbhd=Fruitvale
- **Status:** OPEN

### G-EC2 — Grand Lake: decay [Sentiment -0.240, RetailVitality -1.91, HousingPressure +1.000] — Sentiment now 0.25 (17 of 22, city median 0.32); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["Sentiment -0.240","RetailVitality -1.91","HousingPressure +1.000"], standing={"Sentiment":{"current":0.25,"rank":17,"of":22,"cityMedian":0.32},"RetailVitality":{"current":10.39,"rank":6,"of":22,"cityMedian":8.275},"HousingPressure":{"current":6,"rank":19,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC3 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC4 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC5 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC6 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC10 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — citizenDerivation.js field 'Neighborhood' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Business_Archive, Business_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'Neighborhood' is absent from that sheet's headers but exists on: Advancement_Intake1, Business_Archive, Business_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC12 — citizenDerivation.js field 'RoleType' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'RoleType' is absent from that sheet's headers but exists on: Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC13 — citizenDerivation.js field 'EducationLevel' not on target 'Economic_Parameters' (exists on Citizen_Archive, Simulation_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'EducationLevel' is absent from that sheet's headers but exists on: Citizen_Archive, Simulation_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC14 — citizenDerivation.js field 'BirthYear' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Citizen_Archive, Generic_Citizens) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'BirthYear' is absent from that sheet's headers but exists on: Advancement_Intake1, Citizen_Archive, Generic_Citizens. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC15 — Laurel: decay [Sentiment -0.260, RetailVitality -1.04] — Sentiment now 0.32 (11 of 22, city median 0.32); RetailVitality now 6.47 (15 of 22, [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 4 • Fields: Neighborhood="Laurel", decaySignals=["Sentiment -0.260","RetailVitality -1.04"], standing={"Sentiment":{"current":0.32,"rank":11,"of":22,"cityMedian":0.32},"RetailVitality":{"current":6.47,"rank":15,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Laurel
- **Status:** OPEN

### G-EC16 — Rockridge: decay [Sentiment -0.190, RetailVitality -2.88] — Sentiment now 0.36 (9 of 22, city median 0.32); RetailVitality now 10.2 (7 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 8 • Fields: Neighborhood="Rockridge", decaySignals=["Sentiment -0.190","RetailVitality -2.88"], standing={"Sentiment":{"current":0.36,"rank":9,"of":22,"cityMedian":0.32},"RetailVitality":{"current":10.2,"rank":7,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Rockridge
- **Status:** OPEN

### G-EC17 — Adams Point: decay [Sentiment -0.180, RetailVitality -1.14] — Sentiment now 0.2 (20 of 22, city median 0.32); RetailVitality now 5.58 (18 of [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 9 • Fields: Neighborhood="Adams Point", decaySignals=["Sentiment -0.180","RetailVitality -1.14"], standing={"Sentiment":{"current":0.2,"rank":20,"of":22,"cityMedian":0.32},"RetailVitality":{"current":5.58,"rank":18,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Adams Point
- **Status:** OPEN

### G-EC18 — Piedmont Ave: decay [Sentiment -0.190, RetailVitality -1.34] — Sentiment now 0.32 (12 of 22, city median 0.32); RetailVitality now 11.55 (4  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 11 • Fields: Neighborhood="Piedmont Ave", decaySignals=["Sentiment -0.190","RetailVitality -1.34"], standing={"Sentiment":{"current":0.32,"rank":12,"of":22,"cityMedian":0.32},"RetailVitality":{"current":11.55,"rank":4,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Piedmont Ave
- **Status:** OPEN

### G-EC19 — Chinatown: decay [Sentiment -0.200, RetailVitality -0.84] — Sentiment now 0.38 (8 of 22, city median 0.32); RetailVitality now 9.27 (9 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.200","RetailVitality -0.84"], standing={"Sentiment":{"current":0.38,"rank":8,"of":22,"cityMedian":0.32},"RetailVitality":{"current":9.27,"rank":9,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC20 — Eastlake: decay [Sentiment -0.280, RetailVitality -0.78] — Sentiment now 0.23 (18 of 22, city median 0.32); RetailVitality now 6.72 (14 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 14 • Fields: Neighborhood="Eastlake", decaySignals=["Sentiment -0.280","RetailVitality -0.78"], standing={"Sentiment":{"current":0.23,"rank":18,"of":22,"cityMedian":0.32},"RetailVitality":{"current":6.72,"rank":14,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Eastlake
- **Status:** OPEN

### G-EC21 — Glenview: decay [Sentiment -0.150, RetailVitality -1.64] — Sentiment now 0.33 (10 of 22, city median 0.32); RetailVitality now 4.38 (22 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 15 • Fields: Neighborhood="Glenview", decaySignals=["Sentiment -0.150","RetailVitality -1.64"], standing={"Sentiment":{"current":0.33,"rank":10,"of":22,"cityMedian":0.32},"RetailVitality":{"current":4.38,"rank":22,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Glenview
- **Status:** OPEN

### G-EC22 — Ivy Hill: decay [Sentiment -0.140, RetailVitality -1.14] — Sentiment now 0.2 (21 of 22, city median 0.32); RetailVitality now 4.53 (21 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 17 • Fields: Neighborhood="Ivy Hill", decaySignals=["Sentiment -0.140","RetailVitality -1.14"], standing={"Sentiment":{"current":0.2,"rank":21,"of":22,"cityMedian":0.32},"RetailVitality":{"current":4.53,"rank":21,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Ivy Hill
- **Status:** OPEN

### G-EC23 — San Antonio: decay [Sentiment -0.160, RetailVitality -1.38] — Sentiment now 0.28 (16 of 22, city median 0.32); RetailVitality now 4.88 (20 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 18 • Fields: Neighborhood="San Antonio", decaySignals=["Sentiment -0.160","RetailVitality -1.38"], standing={"Sentiment":{"current":0.28,"rank":16,"of":22,"cityMedian":0.32},"RetailVitality":{"current":4.88,"rank":20,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=San Antonio
- **Status:** OPEN

### G-EC24 — KONO: decay [Sentiment -0.210, RetailVitality -1.34] — Sentiment now 0.3 (13 of 22, city median 0.32); RetailVitality now 8.48 (11 of 22, ci [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["Sentiment -0.210","RetailVitality -1.34"], standing={"Sentiment":{"current":0.3,"rank":13,"of":22,"cityMedian":0.32},"RetailVitality":{"current":8.48,"rank":11,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC25 — Lake Merritt: decay [Sentiment -0.240, RetailVitality -1.37] — Sentiment now 0.3 (14 of 22, city median 0.32); RetailVitality now 8.07 (12 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 20 • Fields: Neighborhood="Lake Merritt", decaySignals=["Sentiment -0.240","RetailVitality -1.37"], standing={"Sentiment":{"current":0.3,"rank":14,"of":22,"cityMedian":0.32},"RetailVitality":{"current":8.07,"rank":12,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Lake Merritt
- **Status:** OPEN

### G-EC26 — Uptown: decay [Sentiment -0.200, HousingPressure +1.000] — Sentiment now 0.41 (7 of 22, city median 0.32); HousingPressure now 8 (22 of 22,  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["Sentiment -0.200","HousingPressure +1.000"], standing={"Sentiment":{"current":0.41,"rank":7,"of":22,"cityMedian":0.32},"HousingPressure":{"current":8,"rank":22,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
- **Status:** OPEN

### G-EC27 — East Oakland: decay [Sentiment -0.140, RetailVitality -0.75] — Sentiment now 0.48 (4 of 22, city median 0.32); RetailVitality now 5.99 (16 o [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 23 • Fields: Neighborhood="East Oakland", decaySignals=["Sentiment -0.140","RetailVitality -0.75"], standing={"Sentiment":{"current":0.48,"rank":4,"of":22,"cityMedian":0.32},"RetailVitality":{"current":5.99,"rank":16,"of":22,"cityMedian":8.275}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=East Oakland
- **Status:** OPEN

### G-EC28 — Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "design-phase" for 4 cycles (4 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c111.json (pattern type=stuck-initiative, cyclesInState=4)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 4 • Fields: InitiativeID="INIT-003", Name="Fruitvale Transit Hub Phase II — Visioning", Status="proposed", ImplementationPhase="design-phase" • Affected: init=INIT-003 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC29 — Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 4 cycles (4 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c111.json (pattern type=stuck-initiative, cyclesInState=4)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 7 • Fields: InitiativeID="INIT-007", Name="Oakland Youth Apprenticeship Pipeline", Status="announced", ImplementationPhase="operational" • Affected: init=INIT-007 / nbhd=West Oakland,East Oakland,Fruitvale
- **Status:** OPEN

### G-EC30 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC31 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC32 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC33 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC34 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC35 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC36 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC37 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC38 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC39 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC40 — Downtown: decay [Sentiment -0.160, RetailVitality -1.79, HousingPressure +1.000] — Sentiment now 0.46 (5 of 22, city median 0.32); RetailVit [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["Sentiment -0.160","RetailVitality -1.79","HousingPressure +1.000"], standing={"Sentiment":{"current":0.46,"rank":5,"of":22,"cityMedian":0.32},"RetailVitality":{"current":11.9,"rank":3,"of":22,"cityMedian":8.275},"HousingPressure":{"current":8,"rank":21,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Downtown
- **Status:** OPEN

### G-EC41 — West Oakland: decay [Sentiment -0.150, RetailVitality -1.36, HousingPressure +0.500] — Sentiment now 0.51 (2 of 22, city median 0.32); Retai [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["Sentiment -0.150","RetailVitality -1.36","HousingPressure +0.500"], standing={"Sentiment":{"current":0.51,"rank":2,"of":22,"cityMedian":0.32},"RetailVitality":{"current":8.65,"rank":10,"of":22,"cityMedian":8.275},"HousingPressure":{"current":1,"rank":14,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-001"] • Affected: init=INIT-001 / nbhd=West Oakland
- **Status:** OPEN

### G-EC42 — Jack London: decay [Sentiment -0.140, HousingPressure +1.000] — Sentiment now 0.5 (3 of 22, city median 0.32); HousingPressure now 6.5 (20 o [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c111.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 7 • Fields: Neighborhood="Jack London", decaySignals=["Sentiment -0.140","HousingPressure +1.000"], standing={"Sentiment":{"current":0.5,"rank":3,"of":22,"cityMedian":0.32},"HousingPressure":{"current":6.5,"rank":20,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Jack London
- **Status:** OPEN

### G-EC43 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC44 — Prior cycle's gap log (C110) had 40 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c110_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC45 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC46 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC47 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC48 — 18 math-anomaly entries (G-EC1/2/15–27/40–42) are one cause: the C110 title-week mood unwinding [judgment] [math-anomaly] [LOW]
- C110 base = championship band 6 + First Friday on all 22 hoods; C111 = Valentine (minor) + off-season shade, 30% hood momentum (`applyCityDynamics` Pass B). All 22 fell 0.14–0.28; CitySentiment 0.85 → 0.44 with +0.085 aftermath / +0.116 initiative / +0.034 media in. Not a defect; §15 chain running. Detector has no "spike unwind" class — a one-cause fold on the auditor side would cut 18 entries to 1.
- Real signal under it: HousingPressure +1.0 on Downtown/Uptown (8), Jack London (6.5), Grand Lake (6), Fruitvale (4.5); +0.5 West Oakland. No standalone detector (C110 carry, G-EC35 there).

### G-EC49 — crime-outlier σ on a 0.5-wide band: two false `cover-as-story` HIGH anomalies [judgment] [math-anomaly] [MED]
- Dimond ViolentCrimeIndex 23 at "−7.0σ" (mean 26.5, stddev 0.50); Laurel 26 at "+3.3σ" (stddev 0.76). `detectAnomalies` stddev floor too low for a 23–27 integer index; any 3-point move reads as a multi-σ event. Both overruled to suppress in engine_review_c111.md. Fix: stddev floor (≥1.0) or a min absolute delta on the crime subCheck.
- **FIXED S553** (`scripts/engine-auditor/detectAnomalies.js` 1.2.0): σ floored at the city's typical weekly move — RMS of the other hoods' ΔViolentCrimeIndex since the last audit, min 1.0; a σ-0 history can now fire. Replay on the real C111 audit + 6 priors: old 1.1.0 flags Dimond −7.0σ / Laurel +3.3σ, new flags none; a 9-point solo jump still fires (test 8).

### G-EC50 — engine.193 (b) settle: magnitude unverified on all nine institutions; AC Transit flat, City +0.01 [judgment] [math-anomaly] [MED]
- 7 of 9 fell 0.18–3.31; settle alone = 0.05 × (norm 2–3 − track) = −0.30…−0.53. Residual = weekly drift (cap ±1) on a retail-unwind week — plausible, not shown: `parts.settle` is computed per row (`applyBusinessDynamics.js:476`) and never logged. AC Transit 12.00 → 12.00 and City of Oakland 10.93 → 10.94 took no visible settle. Fix: one log line per institution (`name settle drift ship → growth`) so the C112 read is a number, not an inference; then explain the two flat rows.
- **Log line BUILT S553** (`applyBusinessDynamics.js`, after `bizDriftOne_`): one `engine.193b settle:` line per institution — growth before → after = settle + capped drift [ev, vit, pressure, shock, noise pre-vol] + ship. Only writer of Growth_Rate is this function (grep), so the flats are computed, not overwritten; all three Downtown institutions (AC Transit, City, EBMUD) netted a positive drift (≈+0.50 / +0.46 / +0.31) against settle −0.50 / −0.45 / −0.49 — the parts get read off the C112 execution log.
- Port of Oakland 12.69 → 9.38: settle (engine.193 b) accounts for −0.53 (5% of gap to norm 2). Remainder = chaos ship `berth_delay` start, port sector at full offset (engine.193 3b). Log: `ship berth_delay start on 178` — the echo (`bizShipEchoShare` 0.15) touched every non-port row. Verify at C112 the echo rows moved 0.15 × peak, not the full hit; read the ship's next phase.

### G-EC51 — generateGenericCitizens_ generated 8, ledger +7 (1,025 → 1,032) [judgment] [writeback-drift] [LOW]
- Log line 109: `Generated 8 (baseCount=8)`. dumpLedger rowCount 1032 vs pre-fire 1025 (auditSimulationLedger). One row short or one pre-fire count off — reconcile against Generic_Citizens before C112.

### G-EC52 — civisJournal Sonnet route returned fenced markdown again; DeepSeek wrote the entry [judgment] [silent-fail] [LOW]
- stderr `Civis Sonnet failed or returned invalid output: Unexpected token '*', "**Civis Sy"`. Repeat of G-EC38 (C110). Journal written on the fallback; the prompt's JSON instruction does not hold on Sonnet 5.5 — fence-strip before parse or move the first route.

### G-EC53 — Riley CycleWeightReason "Very positive sentiment" at CitySentiment 0.44 [judgment] [header-drift] [LOW]
- The weight text reads a band from the prior carry, not the live figure. Cosmetic; summary writer copies it verbatim.

### G-EC54 — `measureRemedies` three verdicts `remedy-not-firing` against prior remedy `none`, expected +0.02 default [judgment] [cross-cycle-debt] [LOW]
- INIT-003 / INIT-007 / migration: expected +0.02, observed −0.17 / −2.04 / −1.36 = the unwind. A `none` prior should yield `prior-had-no-expectation`, not a verdict. Same matcher class as G-EC36 (C110): strain / faith still carried 0 across.

### G-EC55 — pre-flight STALE on Proposed rows, second Cycle: INIT-009 / INIT-010 NextActionCycle 110 [judgment] [header-drift] [LOW]
- Same as G-EC37 (C110, INIT-008). Two seat proposals filed C109, `legislation-filed` due C110, neither moved at the C110 apply. Pre-flight will warn every Cycle until either the civic chain moves them or the script reads Proposed rows as clockless (civic.38). The C110 chain stranded on a sanity-read FAIL (G-EC32) — the C111 chain is the test.

### G-EC56 — 7 Intake rows parked in review since C105–C109: honorific read as a first name [judgment] [silent-fail] [LOW]
- "Sgt." Rachel Torres (POP-00057) ×3, "Dr." Lila Mezran (POP-00154) ×4 — Media Room name scanner files the title as First, engine refuses the mint, row sits. Fix: scanner strips honorifics and matches the remainder against the ledger before filing; then clear the seven rows. Pre-flight warns every Cycle meanwhile.

### G-EC57 — autonomy gaps in the /run-cycle chain, read at the C111 run [judgment] [phase-ordering] [INFO]
- A1 Step 3: the fire is a builder menu click; live has no trigger token (DEPLOY_HISTORY §c49074fc). Unattended = timed trigger or token on live — a deploy decision for the builder.
- A2 Step 3.5: execution log reaches disk only via the builder's Drive export; `fetchExecutionLog.js` reads what is shared.
- A3 Step 1: sports feed is builder-authored; a half-typed row (C111 row 243: `111, early-season`, no team) passes pre-flight silently (engine skips teamless rows). Pre-flight should name it.
- A4 Step 2 §3/§4/§6: ctxMap ordering, header alignment, write-intent targets are read by eye; no pass/fail. C111 ctxMap ORDERING = engine.95 resume-path reads only (bench-proven) — a script could assert "no new undefaulted read since last fire".
- A5 Step 4 + Step 6 judgment: model-written (the premium seat). Everything else in the chain (5–5.85) ran unattended-shaped this Cycle: every script exited 0 with its gate read back.
- A6 Civic chain: the hourly tick launches on `world_summary_c111.md` + `engine_audit_c111.json`; at 16:30 CDT the log still showed the c110 APPLY tick — confirm `launched the chain` for c111 at the next tick.

## LEG: /city-hall (G-R)

No gaps this run.
