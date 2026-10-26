# /run-cycle Gap Log — Cycle 112

**Generated:** 2026-10-19T03:37:26.383Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 6 MED / 7 LOW patterns flagged by engineAuditor; 3 improvements; 0 incoherence findings. Pattern types: math-imbalance=8, coverage-gap=1, cascade-failure=1, production-imbalance=1, improvement=3.

**Mechanical pass:** 34 entries (HIGH 1, MED 18, LOW 14). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — KONO: decay [Sentiment -0.310, RetailVitality -0.60, HousingPressure +0.500] — Sentiment now -0.01 (11 of 22, city median -0.025); RetailVit [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["Sentiment -0.310","RetailVitality -0.60","HousingPressure +0.500"], standing={"Sentiment":{"current":-0.01,"rank":11,"of":22,"cityMedian":-0.025},"RetailVitality":{"current":7.88,"rank":13,"of":22,"cityMedian":8.879999999999999},"HousingPressure":{"current":0.5,"rank":13,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC2 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c112.json (pattern type=coverage-gap)
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

### G-EC17 — Chinatown: decay [Sentiment -0.390, HousingPressure +0.500] — Sentiment now -0.01 (10 of 22, city median -0.025); HousingPressure now 0.5 (1 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 12 • Fields: Neighborhood="Chinatown", decaySignals=["Sentiment -0.390","HousingPressure +0.500"], standing={"Sentiment":{"current":-0.01,"rank":10,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":0.5,"rank":12,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Chinatown
- **Status:** OPEN

### G-EC18 — Dimond: decay [Sentiment -0.350, RetailVitality -1.01] — Sentiment now -0.18 (22 of 22, city median -0.025); RetailVitality now 8.77 (12 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 16 • Fields: Neighborhood="Dimond", decaySignals=["Sentiment -0.350","RetailVitality -1.01"], standing={"Sentiment":{"current":-0.18,"rank":22,"of":22,"cityMedian":-0.025},"RetailVitality":{"current":8.77,"rank":12,"of":22,"cityMedian":8.879999999999999}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Dimond
- **Status:** OPEN

### G-EC19 — Uptown: decay [Sentiment -0.350, HousingPressure +1.000] — Sentiment now 0.06 (6 of 22, city median -0.025); HousingPressure now 9 (22 of 22 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 21 • Fields: Neighborhood="Uptown", decaySignals=["Sentiment -0.350","HousingPressure +1.000"], standing={"Sentiment":{"current":0.06,"rank":6,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":9,"rank":22,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Uptown
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

### G-EC30 — Downtown: decay [Sentiment -0.370, HousingPressure +1.000] — Sentiment now 0.09 (5 of 22, city median -0.025); HousingPressure now 9 (21 of  [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 2 • Fields: Neighborhood="Downtown", decaySignals=["Sentiment -0.370","HousingPressure +1.000"], standing={"Sentiment":{"current":0.09,"rank":5,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":9,"rank":21,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Downtown
- **Status:** OPEN

### G-EC31 — West Oakland: decay [Sentiment -0.320, HousingPressure +0.500] — Sentiment now 0.19 (1 of 22, city median -0.025); HousingPressure now 1.5 ( [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["Sentiment -0.320","HousingPressure +0.500"], standing={"Sentiment":{"current":0.19,"rank":1,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":1.5,"rank":14,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=["INIT-001","INIT-007"] • Affected: init=INIT-001,INIT-007 / nbhd=West Oakland
- **Status:** OPEN

### G-EC32 — Fruitvale: decay [Sentiment -0.330, HousingPressure +1.000] — Sentiment now 0.19 (2 of 22, city median -0.025); HousingPressure now 5.5 (18  [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.330","HousingPressure +1.000"], standing={"Sentiment":{"current":0.19,"rank":2,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":5.5,"rank":18,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=["INIT-007"] • Affected: init=INIT-007 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC33 — Jack London: decay [Sentiment -0.360, HousingPressure +1.000] — Sentiment now 0.14 (4 of 22, city median -0.025); HousingPressure now 7.5 (2 [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c112.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 7 • Fields: Neighborhood="Jack London", decaySignals=["Sentiment -0.360","HousingPressure +1.000"], standing={"Sentiment":{"current":0.14,"rank":4,"of":22,"cityMedian":-0.025},"HousingPressure":{"current":7.5,"rank":20,"of":22,"cityMedian":0.25}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Jack London
- **Status:** OPEN

### G-EC34 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC35 — Prior cycle's gap log (C111) had 74 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c111_gaps.md OPEN entries and flag any that recur in this cycle's findings.
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

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC35 — engine.299 live readback PASS: 0 inert, acceptanceEmpty true, 2,344 lines = bench @54 [judgment] [determinism-break] [LOW]
- `deadBranchScan.js --offenders` on live C112: `{"scannedLines":2344,"inert":0,"structural":8,"premise":62,"lifeVerbs":20,"acceptanceEmpty":true}` (`output/engine299/offenders_c112_live.txt`). Line count identical to the bench. 249.7 s (bench 192 s, budget 360). The one Household-GameNight line folds as Household — 4p ran, not 4o. 0 raw `$TOKEN` in 2,344 texts (engine.291/294 pass). Nothing to fix.

### G-EC36 — Citizen scoreboard zeros, second Cycle running: 0 married / born / promoted / laid off / hired across ~1,030 citizens [judgment] [math-anomaly] [MED]
- Real outcomes 6 of 2,335 lines: 2 bought (POP-00004 Polito, POP-01029 Allen), 3 sold (POP-00345 Brown, POP-00527 Paulson, POP-00672 Brown — all the migration engine's "sold up and bought", not the home die), 1 heritage (POP-00789). The dice fired (`Promotion` 12, `LifeEvent` 20, `CivicRole` 11 lines, `checkForPromotions_` 6 by migration wave) and none crossed into a scoreboard outcome. Rate and severity are the dials — builder's read, not an engine fix. Carry as the week's sim question.

### G-EC37 — BART crew mint: three at $86,086, the Track Maintenance Technician (POP-01215) at $214,800 [judgment] [math-anomaly] [LOW]
- engine.290 Sequencing 3 rows minted as POP-01212–01215, all BIZ-00014, T4 ENGINE. The outlier is the engine's own job-rule draw (ledger technician titles run $60k–$285k; 103 citizens ≥ $200k) — stands as lived. Read `processAdvancementIntake.js` pay rule for the title before the crew ECL rows + governor build (plan §Sequencing 4).

### G-EC38 — `output/engine201/cohort-snapshot.js --resnap` reads its Cycle from the freshest world summary — run it AFTER Step 5, never before [judgment] [phase-ordering] [LOW]
- Run before Step 5 it labelled a post-fire read "C111" and overwrote `cohort-c111.json` (restored from git `git checkout --`); re-run after `world_summary_c112.md` wrote `cohort-c112.json` 48/48, 0 missing. Order note only; no script change.

### G-EC39 — civisJournal Sonnet route returned prose, not the reply object ("This week'…"); DeepSeek wrote the entry [judgment] [silent-fail] [LOW]
- Third Cycle running on the Sonnet route (C111 G-EC52 fenced markdown). Journal written (422 words, keys read back). The 373e757d "reply object read out of surrounding text" does not cover a reply with no object. Non-blocking; pipeline.68.

### G-EC40 — 25 header-drift MED/LOW entries (G-EC3–16, 20–28…) are the standing set (C111: 28) — no new writer drifted [judgment] [header-drift] [LOW]
- updateTransitMetrics / citizenDerivation target-mismatch lines and the defensive-fallback literals recur every Cycle; nothing in the 133 engine-path commits since C111 added one.

### G-EC41 — Uptown HousingPressure 9/10 (22 of 22) with no initiative; Downtown 9/10 with INIT-006 swamped (EventAttractiveness −5.16 vs +0.02) [judgment] [cross-cycle-debt] [MED]
- Third Cycle the +0.5/+1.0 climb is flagged under the mood unwind (CitySentiment 0.85 → 0.44 → 0.32). Trajectory engine wrote `HOUSING_PRESSURE_HIGH` on both. World-side: the civic chain's `propose-new-initiative` on Uptown is the auditor's call; sim judgement → builder.
- **Builder 2026-10-20 night (verbatim):** "let’s see if the civic districts pick up the pressure , put a review on it for post 113 to see if it got picked up" → no hand intervention; review after C113's civic week (Sunday chain 2026-10-25 + Mon–Thu datawakes) — ROLLOUT civic.45, Fri 2026-10-30.
  - **Baseline (es, 2026-10-20, read from disk):** C112 civic week `moves_c112.jsonl` 10 moves, 0 on housing; D2 proposed "Downtown Economic Support Package" (rejected, `:rej0`), D9 no move. Tracker: no initiative names Uptown; INIT-006 Baylight passed / construction-active (Jack London, Downtown); INIT-008 Downtown Economic Revitalization proposed / legislation-filed. Auditor C112: math-imbalance Uptown medium, Downtown low (`HousingPressure +1.000`, Sentiment −0.35 / −0.37).
  - **Wiring as it stands:** D9 = Laurel + Uptown, D2 = Downtown + Chinatown + Jack London + Baylight (`lib/districtMap.js`). A seat's hood turn scores sentiment gap, crime and decay only (`scripts/buildCivicOfficeSlice.js` `scoreHoods`, no HousingPressure); Uptown 0.06 / Downtown 0.09 sit above the city median −0.025, so neither is an outlier and neither seat's turn lands there. A hood fact carrying "housing pressure 9" enters a pack only for the picked hood (`:658-662`; D2 c111/c112 packs carry Jack London's). The C112 directive targeted seats by stall clock only, D9 not at all. The pressure reaches a seat only through an auditor directive.
  - **Pickup (the review's acceptance):** a recorded move or referral on Uptown / Downtown housing in `moves_c113.jsonl`, a new tracker row naming it, or an INIT-006 phase change. A directive that mentions it is not pickup (D2's c111 pack already asked for a referral).

## LEG: /city-hall (G-R)

- G-R (AUTO): 1 voice(s) pending this window: council_d1
