# /run-cycle Gap Log — Cycle 113

**Generated:** 2026-10-26T05:32:53.757Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 6 MED / 12 LOW patterns flagged by engineAuditor; 8 improvements; 0 incoherence findings. Pattern types: math-imbalance=8, coverage-gap=1, cascade-failure=1, production-imbalance=1, improvement=8.

**Mechanical pass:** 34 entries (HIGH 1, MED 18, LOW 14). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Chinatown: decay [Sentiment -0.050, RetailVitality -2.07, HousingPressure +1.000] — Sentiment now -0.06 (20 of 22, city median 0.03); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.050","RetailVitality -2.07","HousingPressure +1.000"], standing={"Sentiment":{"current":-0.06,"rank":20,"of":22,"cityMedian":0.03},"RetailVitality":{"current":7.78,"rank":9,"of":22,"cityMedian":7.165},"HousingPressure":{"current":1.5,"rank":14,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC2 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c113.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC3 — updateTransitMetrics.js field 'Cycle' not on target 'Simulation_Ledger' (exists on Care_Justice_Census, Carry_Forward_Store, City_Treasury) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Cycle' is absent from that sheet's headers but exists on: Care_Justice_Census, Carry_Forward_Store, City_Treasury. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC4 — updateTransitMetrics.js field 'Domain' not on target 'Simulation_Ledger' (exists on Edition_Coverage_Ratings, Story_Hook_Deck, Story_Seed_Deck) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Domain' is absent from that sheet's headers but exists on: Edition_Coverage_Ratings, Story_Hook_Deck, Story_Seed_Deck. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC5 — updateTransitMetrics.js field 'Severity' not on target 'Simulation_Ledger' (exists on Engine_Errors, WorldEvents_Ledger, WorldEvents_V3_Ledger) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Severity' is absent from that sheet's headers but exists on: Engine_Errors, WorldEvents_Ledger, WorldEvents_V3_Ledger. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC6 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC8 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC10 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC13 — citizenDerivation.js field 'Neighborhood' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Business_Archive, Business_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'Neighborhood' is absent from that sheet's headers but exists on: Advancement_Intake1, Business_Archive, Business_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC14 — citizenDerivation.js field 'RoleType' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'RoleType' is absent from that sheet's headers but exists on: Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC15 — citizenDerivation.js field 'EducationLevel' not on target 'Economic_Parameters' (exists on Citizen_Archive, Simulation_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'EducationLevel' is absent from that sheet's headers but exists on: Citizen_Archive, Simulation_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC16 — citizenDerivation.js field 'BirthYear' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Citizen_Archive, Generic_Citizens) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'BirthYear' is absent from that sheet's headers but exists on: Advancement_Intake1, Citizen_Archive, Generic_Citizens. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC17 — Temescal: decay [Sentiment -0.060, RetailVitality -1.11] — Sentiment now 0.08 (6 of 22, city median 0.03); RetailVitality now 5.29 (17 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 3 • Fields: Neighborhood="Temescal", decaySignals=["Sentiment -0.060","RetailVitality -1.11"], standing={"Sentiment":{"current":0.08,"rank":6,"of":22,"cityMedian":0.03},"RetailVitality":{"current":5.29,"rank":17,"of":22,"cityMedian":7.165}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Temescal
- **Status:** OPEN

### G-EC18 — Grand Lake: decay [RetailVitality -1.18, HousingPressure +1.000] — RetailVitality now 11.57 (4 of 22, city median 7.165); HousingPressure no [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["RetailVitality -1.18","HousingPressure +1.000"], standing={"RetailVitality":{"current":11.57,"rank":4,"of":22,"cityMedian":7.165},"HousingPressure":{"current":6.5,"rank":19,"of":22,"cityMedian":0},"Sentiment":{"current":-0.03,"rank":17,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC19 — Uptown: decay [RetailVitality -1.60, HousingPressure +1.000] — RetailVitality now 11.07 (7 of 22, city median 7.165); HousingPressure now 10 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["RetailVitality -1.60","HousingPressure +1.000"], standing={"RetailVitality":{"current":11.07,"rank":7,"of":22,"cityMedian":7.165},"HousingPressure":{"current":10,"rank":22,"of":22,"cityMedian":0},"Sentiment":{"current":0.05,"rank":9,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
- **Status:** OPEN

### G-EC20 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC21 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC22 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC23 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC24 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC25 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC26 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC27 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC28 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC29 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC30 — Downtown: decay [RetailVitality -2.18, HousingPressure +1.000] — RetailVitality now 11.31 (6 of 22, city median 7.165); HousingPressure now  [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["RetailVitality -2.18","HousingPressure +1.000"], standing={"RetailVitality":{"current":11.31,"rank":6,"of":22,"cityMedian":7.165},"HousingPressure":{"current":10,"rank":21,"of":22,"cityMedian":0},"Sentiment":{"current":0.16,"rank":5,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Downtown
- **Status:** OPEN

### G-EC31 — West Oakland: decay [RetailVitality -1.87, HousingPressure +1.000] — RetailVitality now 9.68 (8 of 22, city median 7.165); HousingPressure n [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["RetailVitality -1.87","HousingPressure +1.000"], standing={"RetailVitality":{"current":9.68,"rank":8,"of":22,"cityMedian":7.165},"HousingPressure":{"current":2.5,"rank":16,"of":22,"cityMedian":0},"Sentiment":{"current":0.25,"rank":1,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=["INIT-001","INIT-007"] • Affected: init=INIT-001,INIT-007 / nbhd=West Oakland
- **Status:** OPEN

### G-EC32 — Fruitvale: decay [RetailVitality -1.48, HousingPressure +1.000] — RetailVitality now 11.35 (5 of 22, city median 7.165); HousingPressure now [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["RetailVitality -1.48","HousingPressure +1.000"], standing={"RetailVitality":{"current":11.35,"rank":5,"of":22,"cityMedian":7.165},"HousingPressure":{"current":6.5,"rank":18,"of":22,"cityMedian":0},"Sentiment":{"current":0.24,"rank":2,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=["INIT-007"] • Affected: init=INIT-007 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC33 — Jack London: decay [RetailVitality -1.79, HousingPressure +1.000] — RetailVitality now 13.4 (1 of 22, city median 7.165); HousingPressure no [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c113.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 7 • Fields: Neighborhood="Jack London", decaySignals=["RetailVitality -1.79","HousingPressure +1.000"], standing={"RetailVitality":{"current":13.4,"rank":1,"of":22,"cityMedian":7.165},"HousingPressure":{"current":8.5,"rank":20,"of":22,"cityMedian":0},"Sentiment":{"current":0.17,"rank":4,"of":22,"cityMedian":0.03}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Jack London
- **Status:** OPEN

### G-EC34 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC35 — Prior cycle's gap log (C112) had 45 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c112_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC36 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC37 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC38 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->
## LEG: /city-hall (G-R)

- G-R (AUTO): sanity-read FAIL-SCOPED — INIT-010 excluded from the write, rest applied — see output/cron-civic/gate_c113.json


## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC39 — scoreboard `newlyMarried` 39 = engine.302 live MaritalStatus migration (2026-10-19), not a C113 wedding [judgment] [cross-cycle-debt] [MED]
- audit_c112 citizenStates read `partnered`; audit_c113 reads `married`; 0 wedding lines; `runHouseholdEngine.js:536` "partnered is not a status"
- migration `output/engine-sheet/2026-10-19-engine302-marital-migrate.js --target live --apply` (39 partnered→married, 70 blank→single, 47 minors→youth) landed between audits
- scoreboard married 0 is the true count; strike the 39 from the week's story; `changes` diff keys on the prior audit, so any live ledger migration between fires reads as an event — rebase the prior audit's citizenStates next time (same rule as G-EC86 for Neighborhood_Map)

### G-EC40 — Civis journal: no entry this Cycle [judgment] [silent-fail] [LOW]
- `civisJournal.js --cycle 113` → `{"skipped":"assertion-failure"}`; Sonnet: "Oaks/Paulson exceeds one line"; reasoner: "repeats a sentence from an earlier entry"
- no `Civis Sonnet failed or returned invalid output` in stderr → no re-run per run-cycle Step 5.58; neither file exists; deliver-articles sends nothing for C113

### G-EC41 — engine.301 F1 `crimeWaveHoods` not readable from the live sheet after the fire [judgment] [writeback-drift] [LOW]
- the ring persists as the `PREV_CYCLE_STATE_JSON` carry-forward blob (`phase01-config/loadPreviousEvening.js:276`); no tab, no Phase-2 log line names the carried hoods
- live readback of the stage-27 watch item is 0 Engine_Errors only; a Phase-2 Logger line (`crimeWaveHoods: [...]`) or a blob dump is the read — needs a row, not built under the halt

### G-EC42 — pre-flight "Harry Hayward does NOT resolve" closed by the fire [judgment] [cross-cycle-debt] [INFO]
- `applyGameNightMoments_: unresolved feed names, cycle 113: Harry Hayward` at Phase 5, then the hiring engine minted POP-01223 Harry Hayward (Oaks PF, KONO) and POP-01224 Trevor Henderson (Oaks C, Lake Merritt) the same Cycle
- feed E251/E252 missing comma fixed by hand before the fire (two names read as one); the desk can interview him from C113

### G-EC43 — rate read: 13 real outcomes of 2,489 lines (C112: 6 of 2,335); married 0, laid off 0 for the second Cycle [judgment] [math-anomaly] [INFO]
- born 1, promoted 1, hired 1, bought 4 (2 also heritage steps), sold 3, heritage 3; rate and severity are the builder's dials — recorded, not filed

### G-EC44 — civic chain launched on the Step-4/5 files before the beat dump; directive stage died on the C112 dump [judgment] [phase-ordering] [MED]
- hourly tick 23:17 CDT: `world_summary_c113.md` + `engine_audit_c113.json` on disk (23:10) → chain launched; prep → close 23:22, tracker written (9 rows, INIT-010 excluded by sanity-read), 50 decision entries
- `beats/meta.json` still c112 (Step 5.56 ran 00:30) → `runDirective` → `buildCivicOfficeSlice.js:760` "cycle mismatch (expected C113)"; the hearing's per-seat beat reads ran on the c112 dump; tick then reads "already applied — nothing to do", no retry
- repaired 00:39: `cron-civic-run.js --stage=directive --cycle 113` on the c113 dump → 7 blocks, 0 rejected (`directive_c113.json`, `mara_directive_c113_AUTO.txt`); local files + one model call, no sheet write
- same hole as C110 (Step 5 gate note); the tick's launch key is two files, the chain's inputs are four — ordering row, not built under the halt

### G-EC45 — INIT-013 "Ivy Hill Community Revitalization" filed by Vega (D4) at C113 beside his own INIT-011 "Ivy Hill Revitalization Initiative" (legislation-filed C113) [judgment] [cross-cycle-debt] [INFO]
- two live rows, one hood, one proposer; the gate's touchedInitiatives names both; the clerk did not flag the pair — world event, a civic-desk read, not a sheet edit
