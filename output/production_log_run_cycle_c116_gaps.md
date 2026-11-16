# /run-cycle Gap Log — Cycle 116

**Generated:** 2026-11-16T00:59:57.236Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 0 HIGH / 5 MED / 12 LOW patterns flagged by engineAuditor; 12 improvements; 0 incoherence findings. Pattern types: stuck-initiative=1, math-imbalance=2, coverage-gap=1, production-imbalance=1, improvement=12.

**Mechanical pass:** 29 entries (HIGH 0, MED 17, LOW 11). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c116.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC2 — updateTransitMetrics.js field 'Cycle' not on target 'Simulation_Ledger' (exists on Care_Justice_Census, Carry_Forward_Store, City_Treasury) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Cycle' is absent from that sheet's headers but exists on: Care_Justice_Census, Carry_Forward_Store, City_Treasury. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC3 — updateTransitMetrics.js field 'Domain' not on target 'Simulation_Ledger' (exists on Edition_Coverage_Ratings, Story_Hook_Deck, Story_Seed_Deck) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Domain' is absent from that sheet's headers but exists on: Edition_Coverage_Ratings, Story_Hook_Deck, Story_Seed_Deck. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC4 — updateTransitMetrics.js field 'Severity' not on target 'Simulation_Ledger' (exists on Engine_Errors, WorldEvents_Ledger, WorldEvents_V3_Ledger) [mechanical] [header-drift] [MED]

- **Source:** phase02-world-state/updateTransitMetrics.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Simulation_Ledger'; field 'Severity' is absent from that sheet's headers but exists on: Engine_Errors, WorldEvents_Ledger, WorldEvents_V3_Ledger. Either wrong sheet target, missing schema migration on 'Simulation_Ledger', or dead code path.
- **Status:** OPEN

### G-EC5 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC7 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC10 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — citizenDerivation.js field 'Neighborhood' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Business_Archive, Business_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'Neighborhood' is absent from that sheet's headers but exists on: Advancement_Intake1, Business_Archive, Business_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC13 — citizenDerivation.js field 'RoleType' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'RoleType' is absent from that sheet's headers but exists on: Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC14 — citizenDerivation.js field 'EducationLevel' not on target 'Economic_Parameters' (exists on Citizen_Archive, Simulation_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'EducationLevel' is absent from that sheet's headers but exists on: Citizen_Archive, Simulation_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC15 — citizenDerivation.js field 'BirthYear' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Citizen_Archive, Generic_Citizens) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'BirthYear' is absent from that sheet's headers but exists on: Advancement_Intake1, Citizen_Archive, Generic_Citizens. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC16 — Piedmont Ave: decay [RetailVitality -1.45, HousingPressure +0.500] — RetailVitality now 12.94 (7 of 22, city median 9.21); HousingPressure n [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c116.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 11 • Fields: Neighborhood="Piedmont Ave", decaySignals=["RetailVitality -1.45","HousingPressure +0.500"], standing={"RetailVitality":{"current":12.94,"rank":7,"of":22,"cityMedian":9.21},"HousingPressure":{"current":0.5,"rank":13,"of":22,"cityMedian":0},"Sentiment":{"current":0.21,"rank":5,"of":22,"cityMedian":0.06}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Piedmont Ave
- **Status:** OPEN

### G-EC17 — KONO: decay [RetailVitality -1.06, HousingPressure +1.000] — RetailVitality now 8.68 (12 of 22, city median 9.21); HousingPressure now 1.5 ( [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c116.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["RetailVitality -1.06","HousingPressure +1.000"], standing={"RetailVitality":{"current":8.68,"rank":12,"of":22,"cityMedian":9.21},"HousingPressure":{"current":1.5,"rank":15,"of":22,"cityMedian":0},"Sentiment":{"current":0.05,"rank":15,"of":22,"cityMedian":0.06}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC18 — Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 4 cycles (4 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c116.json (pattern type=stuck-initiative, cyclesInState=4)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 7 • Fields: InitiativeID="INIT-007", Name="Oakland Youth Apprenticeship Pipeline", Status="passed", ImplementationPhase="implementation-active" • Affected: init=INIT-007 / nbhd=West Oakland,East Oakland,Fruitvale
- **Status:** OPEN

### G-EC19 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC20 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC21 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC22 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC23 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC24 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC25 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC26 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC27 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC28 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC29 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC30 — Prior cycle's gap log (C115) had 72 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c115_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC31 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC32 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC33 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC34 — C116 ran twice: the 15:00 fire carried a feed-entry error and was rewound; this log is the 18:52 fire [judgment] [engine] [MED] (research-build, 2026-11-15)
Fire 1: Oakland_Sports_Feed row 278 (rumor; Dillon / Paulson / Seymour) carried EventTrigger `retirement` by entry error; `sportsRetire_` retired the three GAME-clock names. POP-00598 Income 23,800,000 was also an entry error. Repaired by script, then the builder rewound the live sheet to C115 by version history. Fire 2 (18:52 CST, 200.7 s, 0 errors): the three unchanged, POP-00598 2,700,000, one Retirement row (POP-00440, an ordinary retiree). Everything fire 1 produced is held, not deleted: `output/repairs/c116-first-fire-held/` (STATE.txt; its gap log carries the first run's entries). Pre-fire restore point: `backups/sheets/2026-11-16/` (85 tabs).

### G-EC35 — The fire guard's record does not rewind with the sheet, and the Script Properties page did not keep the delete [judgment] [engine] [MED] (research-build, 2026-11-15)
After the rewind `FIRE_ADMISSION_JSON` still read Cycle 116 done; four fires were refused (Engine_Errors rows 23:39Z, 00:41Z, 00:42Z, 00:43Z). The builder's delete in Script Properties did not persist (read back through the door: same record). Added `clearFireRecordAfterRollback` (godWorldEngine2.js, `c4c929b40`; hand-run from the editor; clears only a finished record with cycleCount behind it; 8-case test) — pushed by the builder, PROD @183 = stage 48, no sandbox fire, no watch windows. The ten carry-forward values stamped 116 needed nothing: the loader logged SELF-GHOST on each and re-read 115 from Carry_Forward_Store.

### G-EC36 — Feed word `off-season` (engine.346) shipped to PROD the same evening; its exact wording had no sandbox fire [judgment] [engine] [MED] (research-build, 2026-11-15)
Built as `news` (`f50b367c9`), sandbox PASS 39/39 on SANDBOX 1004 @200 (stage 46), PROD @181. Renamed to the builder's word `off-season` (`ccf50997b`), PROD @182 = stage 47 on his order without a bench (bench script project at the 200-version cap) and without the watch windows. Live read at fire 2: row 278 raised the hook "A's off-season. What is being said, …", `A's [off-season]` in the sports ripple, no `trigger:off-season` line on any citizen. The sheet dropdown does not list the word until Setup Sports Feed Validation is run. Owed: a bench fire of stage 48 once versions are cleared.

### G-EC37 — Pre-flight reads names and columns, not what a trigger will do [process] [judgment] [MED] (research-build, 2026-11-15)
Step 1 passed READY with `retirement` on a rumor row naming three people. `preflightInputCheck.js` checks required columns, record text and that NamesUsed resolve; it reads EventTrigger only to exempt `question` rows from TeamsUsed. Nothing lists who an acting word (retirement, injury, injury-return, question) will change. The session passed Step 1 on the script's word without reading the rows. Candidate: a pre-flight preview per acting trigger (who, what cells), and a stop on `retirement` naming more than one person. Unfiled.

### G-EC38 — Step 3.5 passed on the wrong file [process] [silent-fail] [MED] (research-build, 2026-11-15)
With no `--file`, `fetchExecutionLog` searched Drive by name and matched "Execution log 116 SANDBOX SEED.txt" (2026-07-05, a sandbox log); the gate (`Execution started … Cycle completed`, no failed phases) passed it. Caught by the 3:00 PM start time; set aside; re-run with the builder's link (18:52 fire). The gate does not check the log's date or cycle against the fire.

### G-EC39 — City hall reran on the new C116 over the first run's 65 office positions and Varek's journal entry [judgment] [civic] [MED] (research-build, 2026-11-15)
The first fire's hearing wrote 65 office-position entries on 15 holders' pages and one Civis journal entry, keyed per Cycle (`cp-POP-…-c116-…`; list `output/repairs/2026-11-15-c116-office-positions.json`). The builder's word to delete them was asked for and not given; the chain ran as written. A second write under a taken key is appended into the first entry, so those pages may now hold both runs' statements. Not verified here. City hall's move ledger was reset first (8 status lines from the first close removed; 19 moves pending; old file held).

### G-EC40 — Dillon and Paulson carry a `Question` line; the question wake asks every citizen for a next-chapter move [judgment] [wakes] [MED] (research-build, 2026-11-15)
Row 285 (`question`) named POP-00018 and POP-00527; both are owed a wake in the two-Cycle window. `citizen-wake.js` hands any question wake the next-chapter frame (titles for a former player) with no check that the citizen has retired; a MOVE files an Advancement_Intake1 row, and the next fire would re-role and re-price a GAME / SPORTS_OVERRIDE row to catalog pay (agy review 2026-11-15, verified against the code). Before the C117 fire: read Advancement_Intake1 for `citizen-wake:question` rows on those two.

### G-EC41 — Step 5.5 texture named a real street; the rewrite did not ground and the block fell back to source lines [judgment] [newsroom] [LOW] (research-build, 2026-11-15)
`[texture] grounding gate: Temescal (names "Telegraph Avenue", which no source line names) — rewriting` → `still ungrounded after rewrite — source-line fallback`. Gate held as built (fire 1's draft named a real saloon in Jack London).

### G-EC42 — Carried from fire 1, still true [judgment] [process] [LOW] (research-build, 2026-11-15)
Step 2.5 does not read Simulation_Ledger incomes (the POP-00598 entry passed it). Step 2 prints "date unresolved" without `--since`. Step 6.1 asks for reads whose evidence is written after the close (civic.48 needs the hearing the tick starts after Step 5.56). The engine review is field transcription except the anomaly paragraphs (rendered by a scratch script again). engine.208 writes a stock sentence to every named citizen whatever their role (the GM gets a traded player's lines). Five feed names do not resolve (Porter Broadway, Antone Baez, T. Jerome ×3). SANDBOX 1004's script project is at the 200-version cap; one bench fire that evening was cut at Apps Script's 6-minute limit mid-write.

## LEG: /city-hall (G-R)

- G-R (AUTO): sanity-read FAIL-SCOPED — INIT-006, INIT-014, INIT-003 excluded from the write, rest applied — see output/cron-civic/gate_c116.json
- G-R (AUTO): 1 voice(s) pending this window: council_d1

### G-EC43 — City hall's close excluded three initiatives and two project moves failed: the offices' week-old decisions against rows the fire had moved [judgment] [civic] [MED] (research-build, 2026-11-15)
Close 19:26 CST: sanity-read FAIL-SCOPED INIT-006 (complete → construction-active), INIT-014 (vote-scheduled → announced), INIT-003 (phase complete, notes say design held); `APPLYING WITH INIT-006, INIT-014, INIT-003 EXCLUDED`, decisions stay staged. Move ledger 6 applied / 2 failed (`MV-115-proj-transit-hub`, `MV-115-proj-baylight`: "write failed: row not processed"). Same shape as the first run's INIT-003 exclusion, now on three rows: a project office decides during the week against the tracker as it stood, and the Sunday close applies it after the fire has advanced the row. Gate held as built. Not changed.

### G-EC44 — civic.48 read, C116 hearing: no office files a hood under the wrong district [judgment] [civic] [LOW] (research-build, 2026-11-15)
Scan of the C116 office / hearing / decision files: 36 hood-district labels, 35 match `lib/districtMap.js`; the one flag is two sentences read as one ("…and Fruitvale data. The D5 audit…"). The Mayor's statement now says "the D3 Fruitvale briefing" (C115 said "D3 East Oakland"). Row closed.
