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

### G-EC45 — Three A's rows on the live ledger with no employer and no neighborhood [judgment] [sports] [LOW] (research-build, 2026-11-16)
Live Simulation_Ledger read 2026-11-16: POP-01238 Robert Mooney (Farm Director, Oakland A's), POP-01239 Giancarlo Hernandez (Third Baseman, Oakland A's), POP-01240 Henry Calzado (Catcher, Oakland A's) — ClockMode GAME, OriginGame `MLB The Show`, EmployerBizId blank, Neighborhood blank, BirthYear blank; first LifeHistory lines Y3C12. They reached the ledger between the C115 fire and 2026-11-14 (first in the snapshot refreshed then), outside the engine: the media path mints citizens (builder 2026-11-16), not the sports feed and not the engine's intake. That media mint carried the team in the title but set no employer and no home. Which media script wrote them is not traced here. The C113 Oaks rookies (POP-01223/01224, intake-minted) do carry BIZ-00074 and a hood.

### G-EC46 — The arc ledger reads as 650 open arcs; the engine carries one [judgment] [LOW] (engine-sheet, 2026-11-16)
Live `Event_Arc_Ledger` read 2026-11-16: 656 rows; Phase early 362, peak 252, rising 36, resolved 6; 36 rows a Cycle through C101, then one each at C105, C109, C114. The tab is an audit log: `generateCrisisBuckets_` v3.0 writes a row only at onset, first peak and resolve (`ledgerRow_`, "fossil tab, C70-81 rows untouched per doctrine rule 8"); the arcs' state is `previousCycleState.crisisArcs` on `Carry_Forward_Store` (`buildWorldSummary.liveCrisisArcs` reads it). At C116 that holds one arc, `CRISIS-114-DOWNTOWN` "The Downtown Transit Snarl", **decline, tension 2.45**, in that phase since C115 — the ledger row for it says early, tension 5. A reader handed the ledger takes the old rows as open: the EMS director's C116 wake, "Temescal's health-crisis arc sat at peak tension 10 from C95 through at least C101 … Either the arc resolved off-ledger or the two systems are measuring different things." The worker wake now reads the carried arcs (pipeline.110). Still on the ledger: the police chief's "Safety arcs" block, and any other reader of the tab (`grep -rn Event_Arc_Ledger scripts lib`) — not read.

### G-EC47 — The four smallest neighborhoods take no hospital intakes, any kind, any Cycle [judgment] [LOW] (engine-sheet, 2026-11-16)
`Care_Justice_Census` hospital rows C110–C116: Uptown, KONO, Lake Merritt and Baylight District are 0 intakes / 0 in care / 0 beds on every intake type every Cycle, while `Neighborhood_Demographics` holds them sick 21 / 16 / 17 / 13 (adults 506 / 432 / 465 / 421 — the four are about a third the size of the rest). Neighborhood sums equal the city line (C116: 34 intakes, 68 beds; unallocated 0), so nothing is lost — the intakes fall elsewhere. The EMS director's C116 wake and a guarded rerun both read it as "a missing-neighborhood story". Why the census never places an intake there is not read.

### G-EC48 — OARI's van answers citywide; its money moves without a payment [judgment] [LOW] (engine-sheet, 2026-11-16)
`Chaos_Cars` `oari_van` C101–C116: 18 calls, 2 in the program's three neighborhoods (East Oakland C113, West Oakland C114); the rest Rockridge, Laurel, Ivy Hill, Uptown, Lake Merritt, Glenview, Eastlake and named citizens. `Initiative_Tracker` INIT-002 `AffectedNeighborhoods` West Oakland, Fruitvale, East Oakland. Its `BudgetRemaining` is 10,817,307.66 of $12.5M while `City_Treasury` holds one INIT-002 row (C110 `PREFUNDED`, 0). Seen on the OARI director's guarded lean run; she did not remark on either. Not read why.

### G-EC49 — A retiree's every mention of retirement is tagged Retirement again [judgment] [LOW] (research-build, 2026-11-17)
Live `Reflection_Intake` C115–C116: POP-00001 carries six rows tagged `Retirement` (two wakes, one work wake, three press answers), each applied (family +4, drive −4 × `dialReflectionShare` 0.225 a row). The engine.347 Task 4 replay with the new prompt still tags four of them: the speaker is living the retirement and says so. The classifier reads one text at a time and cannot tell the event from its echo. Not built on; whether a lived state should keep pushing the dials is unruled. **Closed 2026-11-17** (builder: "Once"): a `Retirement` event gives nothing on the reflection path, PROD stage 53 @188 (engine.347 Task 12).

### G-EC50 — The affect list has no sadness; grief reads as Anxious [judgment] [LOW] (research-build, 2026-11-17)
`lib/reflectionClassifier.js` `AFFECT_TAGS`: five negative moods (Frustrated, Irritable, Anxious, Angry, Resentful), none for sorrow, and `AFFECT_FALLBACK` carries no sad / grieving word. The gate's grief text ("Still can't believe Marcus is gone…") reads `Community | Anxious` (composure −3; sociability +4 and warmth +2 from the event tag). Direction holds; the mood named is not the one felt. A new mood is a dial-map key and its value: unruled. **Closed 2026-11-17** (builder: "Yes"): `Sad`, composure −3 and outabout −1, PROD stage 53 @188, then the classifier (engine.347 Task 13).

### G-EC51 — The manual reflection drain never marks a zero-move row applied [judgment] [LOW] (research-build, 2026-11-17)
`scripts/drainReflectionBacklog.js:72` flips `applied='yes'` only when `accreteReflectionsIntoBase_` moved a dial (`m > 0`), so a citizen whose pending rows all compose to nothing (`Civic | Flat`, `Background | ''`) stays pending in that script. The Cycle's own fold marks every drained row (`compressLifeHistory.js:823`). A manual lever, not on the Cycle path (agy, `output/antigravity/2026-11-17-review-classifier-cut.md` §1).

### G-EC52 — Four workers' Monday statements are not on their pages: removed on the builder's word, not a fault [closed] (research-build, 2026-11-17)
`output/cron-civic/datawake/worker-{chief-fire,emerg-dir,ems-dir,med-exam}_2026-11-16.json` carry `positionWall.recorded: true` and the four document ids return 404 (POP-00140, POP-00152, POP-00141, POP-00142). Cause read the same hour: engine-sheet deleted them 2026-11-17 01:15 (`5fdc52e1d`, builder: "Stop handing them back + clean the pages" — entries from the build before the lean shape; copies in `output/repairs/2026-11-17-worker-monday-pages-BEFORE.json`). The save path works: the two workers of 11-17 (POP-00036, POP-00040) and the same morning's seats are on their pages. What stays true for any page / ledger count: a run record's `recorded: true` says the save was accepted then, not that the entry is on the page now.

### G-EC53 — Health ledgers: three recovered patients still read "active"; every cause row starts at Cycle 0 [defect] [LOW] (engine-sheet, 2026-11-17)
Live C116, seen in agy's reporter-template review and re-read: `Hospital_Ledger` 3 rows carry `StatusNow` active beside `Outcome` recovered and a `DischargeCycle` (107 / 109 / 111), so the health slice prints them "in hospital care, active" (`scripts/buildHealthSlice.js:106`); `Health_Cause_Queue` all 3 rows carry `StatusStartCycle` 0, so the slice's `> 0` test drops every row (`:114`). Lila's pack reads both today. Writer not traced. Not pipeline.110's to fix.

### G-EC54 — Reporters' lookups approve no figures: 10 of 12 tool-using pieces this week [observation] [MED] (engine-sheet, 2026-11-17)
`logs/newsroom-fanout.log` "tool facts → manifest": Mon 11-16 5 of 7 "none used", Tue 11-17 5 of 5. The promotion takes five tools only and a quote-free line with a two-word name and two figures (`scripts/livedExperiencePacketV2.js:622, 702, 724-731`). Pieces pass because Rhea checks figures against the world summary. Carried into the reporter template as a build requirement (pipeline.110, AGENT_BOOT_TEMPLATES §4).

### G-EC53 — `cronDeskFilings.test.js` fails in the evening [judgment] [LOW] (research-build, 2026-11-17)
Full suite 2026-11-17 18:30 CST: 3 of 335 files fail — `civicPetitions.test.js` and `personaProviderBrief.test.js` as before, and `scripts/cronDeskFilings.test.js` (5 assertions: "exactly 1 filing (today + other-desk excluded): got 0", then a TypeError). The test builds its "today" and "yesterday" from `new Date().toISOString()` (`:29-30`, UTC); at the run the UTC date was 2026-11-18 and the Central date 2026-11-17. Not run at another hour to confirm it passes in the day; `cron-desk-run.js` not opened. Not touched by engine.347.
**Fixed 2026-11-19 (research-build):** not only the test — `yesterdaysFilings` matched a filing's UTC stamp against the Central yesterday, and the write wake stages after 18:00 Central (25 of the last 40 sidecars at 00:xx UTC), so most of a desk's filings never rode the next day's writer state. It now reads the stamp's Central date; the test stages yesterday noon and yesterday 18:20 Central and passes at any hour.
**Correction, same night:** that function feeds only the old lane writer state (`buildLaneState`); the writers run on the typed packet — 0 of 136 saved writer states hold the block, 0 "writing on lane" lines in the current fan-out log against 28 "writing on typed Packet". The date fix changes nothing a writer sees.

### G-EC55 — UNDOCKED: the board ranks points, the night is told in credits [observation] [MED] (research-build, 2026-11-17)
Builder 2026-11-17: "every story I hear is the break even with 0 credits so maybe the undocked isn't set up properly". The board ranks achievement points, then credits, then POPID (`scripts/undockedStandings.js`, `loadUndockedFeed_`; from C114). The pilot brief tells pilots the board is achievements, each step scoring its share (`scripts/undockedMissionBrief.js:63`); since C114 a night visits 12–18 systems and trades nothing: 7 of 9 pilot-weeks at 0 credits, 27–45 points (`output/spacemolt-show/intake/`). The words handed on are credits: the night's excerpt is `<name> credits=0 systems=…` with no points (`scripts/undockedShowGate.js:153-157`); Nia's line for a night with no typed record is "dead even on the night" (`scripts/buildNiaSlice.js:198-214`); the pilot's own record ends "came out even on credits" (`scripts/undockedShowRecord.js:126-130`, after the achievements earned). No engine life line reads a night's points. Found on the engine.350 read; nothing changed. engine.350 Task 8's UNDOCKED half waits on what the show scores. Builder 2026-11-17, asked whether to open a row to make UNDOCKED tell its nights in points: "Yes" — pipeline.113.

### G-EC56 — Hal Richmond's dials were set from a June essence entry with wrong targets and two wrong facts [observation] [MED] (research-build, 2026-11-17)
Relayed by engine-sheet 2026-11-17 as the builder's words: "the sheets dials were never set to his identity"; "these all need to be looked into". Read: POP-00007 base after C116 is drive 80, sociability 90, openness 78, composure 72, integrity 61, warmth 51, family 50, outabout 51, fandom 65 (`output/simulation_ledger_snapshot.jsonl`). His dials were set once, from the authored essence entry `utilities/tier1EssenceEvents.js:671-690` (research.18, 2026-06-21): target drive / openness / composure / sociability high, integrity / warmth moderate, family / outabout neutral — 13 events (3 Career, 3 Education-Cultural, 2 Stabilized, Media, Public, 2 Reputation, 1 Background) and none that gives warmth. The live base sits on that target. His identity file reads otherwise (`.claude/agents/hal-richmond/IDENTITY.md:27`: "Speed low on purpose — wire-copy Hal is a failed piece. Emotion is warmth, not melancholy."). The essence file holds 43 citizens; 54 agent folders carry an IDENTITY.md. Whether the other 42 targets match their identity files is not read. Since the seed, every routine line has also leaned up (engine.350 read: sociability 97% up). Nothing changed; not part of engine.350's tasks. Builder 2026-11-17, asked whether to open a row to read all 43 against their identity files: "Yes we will open a row" — engine.352. Later the same night engine-sheet set his row on live on the builder's word (`27751e17f`: base drive 55, sociability 55, warmth 70; face Connector → Watcher; old cells in the commit). Relayed by engine-sheet, not read here: a dry re-seed from his 13 essence rows gives warmth 81 against a target of moderate — a re-seed from the archive would undo the row. Builder, relayed by engine-sheet the same night: "Hal has been the same for the past 14 months and has never been anyone different and there's no such thing and changing who someone is." So the entry is not another reading of him; it carries data errors against his sheet: "Forty years covering Oakland baseball" where the row holds YearsInCareer 31.3, "since the seventies" for BirthYear 1980 (both cells read 2026-11-17), and targets that set drive and sociability high. engine.352 corrects data errors of that kind; it rewrites nobody. Builder, relayed again by engine-sheet: "Whatever I write is Hal. The sheets likely have noones personality or years on the job correct." So the measure is what he wrote about the citizen (the identity file), and where it and the sheet disagree on dials, temperament or YearsInCareer the sheet is the error — "forty years" is wrong against his "more than thirty-one years", not against the cell. Rows change one at a time on his word, never as a sweep. All three relays are engine-sheet's account; the row confirms the measure with him at pickup. A fourth relay (23:55): engine-sheet put the row back as it was before the night, saying the builder's word is that the earlier dials were his; the ledger copy reads drive 80, sociability 90, warmth 51 again. So whether anything is wrong with these dials at all is open, and engine.352 starts by asking him.

### G-EC57 — The career engine's texture half does not read the citizen's real job [observation] [MED] (research-build, 2026-11-17)
Builder 2026-11-17: "we now have businesses and jobs and the hardcoded Events proceeded those, so the career engine is likely not tuned to the state of the job economy now". Read of `phase05-citizens/runCareerEngine.js`: the event half follows the real employer — promotions and layoffs from the employer's growth on Business_Ledger (`applyEmployerSuccess_`), the rehire matcher, the custody dismissal, all on `EmployerBizId`. The texture half does not: a citizen's `industry` is word-matched off the role title (artist / gov / tech) and otherwise drawn (60% "service", else a random industry) (`pickInitialIndustry_` :1005-1011), the employer is "small" / "large" / "public" by a roll (`pickEmployerType_` :1013-1019), and both live in the citizen's own CareerState line, never checked against `EmployerBizId`. The lines drawn are about the season, the weather, city sentiment and the economic mood (`:1048-1140`), each tagged `Career` = drive +4 whatever it says ("felt uneasy workplace atmosphere", "noticed colleagues discussing job market concerns"); none reads the citizen's own employer (growing, shedding, hiring). `S.careerSignals.industries` counts the invented industries and has no reader in phase*/utilities/lib/scripts. Nothing changed. engine.350 Task 7 signs these lines by what they say; reading the real job is not in it.

### G-EC58 — A child's sports and civic years stopped counting toward their field; program lines of those kinds were never written [observation] [MED] (research-build, 2026-11-18)
Found reading every reader of the `Education` kind before engine.350's cut. (a) The field a young adult settles into weighs their school years by counting `[Education]`, `[Team]`, `[Cultural]`, `[Civic]`, `[Community]` on their life lines, bare brackets only (`phase05-citizens/educationCareerEngine.js` `settleYouthCounts_`). Since engine.299 (2026-10-18) a youth `Team` or `Civic` line is written graded (`[Team-Drive-Up-S]`), so those years counted for nothing: in the ledger copy after C116, 59 graded youth Team / Civic lines (uncounted) against 65 bare ones from before the cut. (b) A youth line that names a Community_Program has no fixed text, so it had no entry in the sign table: the sports and civic templates ("joined the … season", "trained weekends at …", "volunteered at …") were dropped at the writer and counted in `S.engine299.noDialBySource`, which nothing reads — 3 `Team | joined…` and 7 `Civic | volunteered…` in the cells, all from before 10-18. Both fixed in the engine.350 Education commit (the count takes either form; each program template carries its own sign), live at that work's deploy. Lines already written are not rewritten.

### G-EC59 — A teen's coming-of-age line was stamped as a graduation and blocks the real one [observation] [MED] (research-build, 2026-11-18)
The youth engine routed its coming-of-age texture lines ("picked up the first paycheck and stood in the bank line like an adult", "sat for the senior portrait and did not recognize the adult in it") to the `Graduation` tag for its dials (drive +8, openness +2), and its hard-week lines to `Stabilized` (`phase05-citizens/runYouthEngine.js` `YOUTH_DIAL_TAG`, engine.69b). The graduation milestone graduates a citizen once, by looking for `[Graduation]` on their life lines (`phase04-events/generationalEventsEngine.js` `checkGraduation_`, window 22–28): a citizen holding one of those texture lines never graduates. Ledger copy after C116: 12 citizens hold one — POP-00060 and POP-00078 are 22 and in the window now; POP-00984 and POP-01003 are 18; the other eight are 13–17 (POP-00975, 00981, 00982, 00986, 01000, 01001, 01007, 01009). 9 real graduation lines in all cells. From the engine.350 youth commit these lines are written `Personal-<Dial>-<Up|Down>-S` and no longer block anything (live stage 54). The 12 lines already written stay as written. **Builder 2026-11-18, on whether the 12 stay blocked: "Which ever it logical to how life works"** — a first paycheck is not a commencement: the graduation check no longer counts those seven sentences (`hasGraduated_`, stage 55); nobody's line is edited.

### G-EC60 — Two Baylight-office lines go to anyone wealthy and are 40% of all work lines [observation] [MED] (research-build, 2026-11-18)
The content tab's `work.tech` pool holds two `source:occupation` rows keyed on money, not on the job — `wealth>=7` on the first, `lifestate=working; wealth>=7` on the second, no occupation or employer on either (corrected 2026-11-18: first logged as `wealth>=7` on both): "badged into the Baylight office early and tried not to think about the protestors from last month" and "drank the free cold brew in the company kitchen and felt completely disconnected from the neighborhood outside". Every other `work.*` pool is keyed `lifestate=working; occupation=<title>`. In the ledger copy after C116 they are 121 of the 301 `[Work]` lines (60 and 61), each drive +4 until engine.350; signed by what they say they are composure down and sociability down (`scripts/occupationDialTags.js`), so after engine.350 every wealthy citizen who draws from the tab leans down on those two dials, whatever their job. Who should draw these two lines is the builder's (a Conditions cell on the sheet). **Builder 2026-11-18: "Which ever it logical to how life works"** — the people who work in those offices: of the 143 times the two lines were drawn, 5 were by someone employed at a Baylight District tech office (12 tracked citizens work at the four: BIZ-00001–00004). The tab could not say "works at": a new `employer` condition (stage 55), then both cells become `lifestate=working; employer=BIZ-00001|BIZ-00002|BIZ-00003|BIZ-00004`. Also on the tab under `source:occupation`, both `auth:auto` (`scripts/draftContentRows.js`, run-cycle step 5.6): `civic.temescal` "walked past the health center construction site…" (a hood line, not work) and `civic.rockridge` "the bartender wiping down counters while discussing the stalled train delays with a regular" (not a line about the citizen; left unsigned, so no longer written). The drafter's prompt asks for no `dial:` tag: an auto-drafted occupation row is not written after engine.350 until it is signed.

### G-EC61 — The bench counted pushes off the log, and 60 / 40 by pushes is four permanent moves up for one down [observation] [HIGH] (research-build, 2026-11-18)
Two things about how engine.350 has been measured, found before the coded-pool bench. (a) The stage-54 bench counted line pushes from `LifeHistory_Log`. The fold reads the citizen's own cell, and the two differ: on live C115–C116 the log carries 190 `Advancement` lines ("Intake at Tier …", drive +6 by word-match) that are on no cell, and `Business-Gain` 10, `Promotion` 15 against 1; the cells carry `Bond` 35, `Money` 31, `ConnectionWithdrawn` 21, `Casino` 12, `TrustGuarded` 8 that are on no log row. Per dial, log against cell: drive 499 / 43 against 326 / 41 (the log overstates drive up by half), sociability 750 / 2 against 751 / 23, warmth 354 / 0 against 390 / 8 (agy's read, `output/antigravity/2026-11-18-review-e350-coded-pool-down-side.md` §7a; the 0 `Advancement` lines on cells checked here against `output/simulation_ledger_snapshot.jsonl`). The plan's "drive 65%" at stage 54 is a log number. The bench from here counts the cells after each fire (`output/research-build/2026-11-18-e350c-bench.js cellcount`). (b) A dial moves for good only after three same-way Cycles with the swing still felt (`utilities/citizenMemory.js` `applyEvent_`, `HARDEN_STREAK` 3; an opposite Cycle resets the streak). The stage-54 bench's `Dial_Pulse` rows, C118–C126: sociability 40–98 citizens up a Cycle against 0–1 down at 85% of pushes up; openness 14–50 against 0–4 at 67%; composure and family, at 50–51%, about even. agy's run of the fold itself (same file §7b): 85% up gives 445 permanent moves up for one down, 67% gives 11, 60% gives 4, 55% gives 2, 53% gives 1.5, 50% gives 1. So the plan's acceptance 5 (pushes within 60 / 40) does not give "down as often as up" in who actually changes; pushes have to sit near 50 / 50, or the speed keys of Task 9 have to change how a move hardens.

### G-EC62 — Tab rows that name a place or a congregation reach anyone [observation] [MED] (research-build, 2026-11-18)
From agy's review of the placed down rows (§1c, §5, §6), each checked against the loader and the generator. The content tab cannot aim a row at a congregation (no faith scope in `loadEventContentLedger.js` `CONTENT_LEDGER_DSL_FIELDS` or the generator's `condScopes`), and the `faith.attending` / `faith.volunteering` rows carry `band!=child` or nothing: every adult draws "stayed thirty minutes after the service just catching up in the parking lot" (27 times in C115–C116), member of anything or not; the rows ride `source:familyLife`, so none of them counts as faith exposure either. `civic.health-center` row 211 has no hood: anyone in the city "stopped to read the architectural renderings for the Temescal Community Health Center posted on the chain-link fence" (40 a Cycle, the row cap). `culture.citywide` row 290 (hood Lake Merritt) has no season: "families bundled in coats, their breath visible in the cold air" in any month. Rows with no sign in a signed pool (875, 985, 987, 988, hood-gated) are drawn, dropped and cost the citizen that line. The nine placed rows of engine.350 (`scripts/downLinesEclPool.js` `PLACED`) reach exactly who the rows they answer reach, so they carry the same reach; they were not held for it.

### G-EC63 — Other engines still write a First Friday or a social line as up whatever it says [observation] [MED] (research-build, 2026-11-18)
engine.350 signed the generator's First Friday lines by what each says. The same night is written by four other engines, untouched (agy §4, each read here): `runNeighborhoodEngine.js` `firstFridayEvents` (11 lines in Uptown, KONO, Temescal, all `dial:sociability:up`, among them "noticed gallery openings along the corridor"); `runRelationshipEngine.js` `firstFridayRels` (bare `Relationship-FirstFriday`: sociability +5, warmth +2, on "felt the creative community energy"); `runHouseholdEngine.js` (`Household-FirstFriday`: family +5); `runAsUniversePipeline.js` (`PostCareer-FirstFriday`: family +4, openness +2). The relationship engine's everyday pool is the same class as the kinds Task 7 cut: at most 8 lines a Cycle, each a bare `Relationship` (sociability +5, warmth +2), and the pool holds "felt distant from people around them" and "had a minor disagreement with someone they know" (5 and 2 lines in C115–C116, each read as +5 sociability). The `Continuity` kind, like `QoL` before this build, has no dial-map key and is read by word-match when a content rule's word is in the line. The down lines the generator now writes under kind `FirstFriday` still lift the hood's pulse (`neighborhoodPulseMap.js` `pulseKindForLine_` flips only `Neighborhood`); both are nights someone went, so the lift was left.

### G-EC64 — The content tab wrote scenes into lives as steps on a dial, and threw away every money row [observation] [HIGH] (research-build, 2026-11-18)
Two helper agents read the live `Event_Content_Ledger` (1,113 active lines) against the generator's own rules; research-build cut their lists (`scripts/contentTabReads.js`). (a) 32 signed rows are scenes with nobody the citizen is in them — "a DJ spins records at a crowded bar near Broadway", "a mover's truck idles outside a newly renovated building", "the bartender wipes down the counter between rounds of A's highlights" — each written into a life as one step on out-and-about, openness, fandom or sociability (machine-written rows, `auth:auto`; the seniors-lunch flyer the most drawn, 40 a Cycle). (b) 40 more rows carry no sign and route to a kind that moves nothing, so the generator draws them and throws the draw away (`S.engine299.noDial`, which nothing reads): the citizen loses that line. (c) `source:economy` has no branch in `primaryFromTags` and falls through to `Daily`; none of the 20 money rows (`econ.tight`, `econ.middle`, `econ.comfortable`: "ignored the check engine light for another week because rent was due on Tuesday") carries a `dial:` or `econ:` tag, so every one of them has been drawn and thrown away since engine.299 — no citizen has had a money-texture line from the tab. (d) The ten `retirement.depth` rows are written as a bare `PostCareer` (family +4, openness +2) whatever they say; two rows with `source:civicRole` sit in `civic.*` pools the role engine does not own; eleven hood rows carry a dial the sentence does not name (a grocery errand under family). Lists in the tool: 72 rows switched off, 11 re-signed, 27 signed. Left as they are, and recorded: library rows that give the citizen a relative the Conditions cell does not guarantee (a grandchild at `children>=1; age>=60`, rows 266–269; a sibling for any child, rows 87, 95; "the way their father taught them", row 144); the hood-mood bulletins ("West Oakland feels quieter than usual") which say how a place feels.

### G-EC65 — What is still written at a fixed size [observation] [LOW] (research-build, 2026-11-18)
After the stage-57 candidate, agy's sweep (`output/antigravity/2026-11-18-review-e350-other-engines-line-signs.md` §6) of the writers still putting a line on a cell at a fixed size its words can contradict: the bond kinds `Rivalry` (sociability +2, composure −3: "avoided someone they've had friction with"), `Alliance` (+4 sociability: "appreciated the loyalty of a close contact"), `Mentorship`, `Arc` — about one a Cycle together; `Public` (sociability +4, 2–3 a Cycle: "prepared public safety statements for the press"); `Reputation` (10 a Cycle) and `Faith` (5 a Cycle) from the generator; `PostCareer-Influence` / `-Wellness`; the neighborhood engine's Creation Day pool signed as a pool. Also from that review: the relationship engine stops at eight lines a Cycle in ledger order, so the same citizens near the top of the ledger draw its lines; `dashboard/server.js:2151` parses a life line's tag with `\w+` and reads every graded tag as `General`; `formatDialFace_` tallies graded tags one by one in `TopTags`.

### G-EC66 — One test file fails on the tree with no engine change behind it; two more fail by the clock [observation] [LOW] (research-build, 2026-11-18)
`node scripts/run-tests.js` late on 2026-11-18 at `e39a38052`: three files failed that touch no file of that commit. Run again after midnight on the folded candidate, two of them pass with nothing changed: `scripts/civicPetitions.test.js` (the dump for cycle 999 exited 1) and `scripts/cronDeskFilings.test.js` (Test 1 found 0 of "yesterday's" filings) depend on the wall clock or on files of the day. `scripts/personaProviderBrief.test.js` fails both times ("brief stays compact (4681 chars)" — the brief has grown past the test's cap). Not read further; no row.
**Fixed 2026-11-19 (research-build):** the 4,500 was one live brief's size at 2026-10-19; the brief's own caps allow about 5,400 with every section full, and Vinnie's are. The test now pins those caps section by section and a total under 6,000. `cronDeskFilings` fixed above; `node scripts/run-tests.js` 348 of 348.

### G-EC70 — The one next-chapter move of C116 landed nine columns right on the promotion queue [observation] [HIGH] (research-build, 2026-11-21)
Wilson Shepard (POP-01022) answered his question 2026-11-17 (`output/citizen-moves/moves_c116.jsonl`: queued, Club Coach / Instructor, BIZ-00074). `scripts/citizen-wake.js` filed it with `sheets.appendRows` (the Sheets values.append call, which places a row by the "table" it detects); live Advancement_Intake1 row 165 read 2026-11-21: A–I blank, `Wilson` in J, `Shepard` in L. `processAdvancementRowsBody_` skips a row with no First and no Last (`if (!first && !last) continue;`) and never clears it, so the move would not apply at C117 and nothing would say so. Fixed the same day (builder's go): the wake writes at column A of the first row past the data and reads it back; the row moved back by `output/research-build/2026-11-21-e338-shepard-row-repair.js` (the builder's hand). Not read: the other `appendRows` callers on other tabs — the same call could shift a row wherever a tab has blank stretches or a ragged width.

### G-EC69 — An entry job at a tech employer pays a field-change hire near 190–200k [observation] [LOW] (engine-sheet, 2026-11-20)
engine.354 bench, SANDBOX 1004 C117 (`output/engine-sheet/2026-11-20-e354/bench2.log`): a bench-only unemployed janitor with a high-school diploma, hired across fields at Oakmesh Systems as IT Support Technician, was priced 187,344; a teacher hired at Discord as Junior Software Developer 201,429; the same path priced a Sales Associate at the Oakland Athletics 66,130 and a Warehouse Hand at the Port 95,000. The price is `jobReferencePay_` on the new title with the employer's profile (`runCareerEngine.js` field-change hire). Not read further; not changed.

### G-EC68 — A desk's "filings from yesterday" block is capped, and keyed to a calendar day [observation] [LOW] (research-build, 2026-11-19)
`cron-desk-run.js yesterdaysFilings` (pipeline.45 Phase 2, builder 2026-08-04) hands a writer at most 3 of its desk's prior-day filings, each body cut at 600 characters, picked by the Central calendar day and this Cycle — so a Monday gets none. The same staged pieces are searchable whole through `canon_search` (lib/mags.js searchDisk covers `output/cron-compare/staged`, builder 2026-10-20). Builder 2026-11-19: "anything capped is garbage and serves no one". **Read after:** the block lives only in the old lane writer state, which no current write uses (see G-EC53's correction) — it reaches no writer. Not changed.

### G-EC67 — Three fixed bars stay after the middle counts [observation] [LOW] (research-build, 2026-11-18; the builder's word the same night)
engine.349 Task 14 moved every reader of a dial band onto the number. Three fixed bars were put to the builder and kept: a fan is a fan at fandom 60 (`phase05-citizens/applyGameNightMoments.js:599`, `utilities/compressLifeHistory.js` `buildFandomDonors_`) — "agree and as the fandom raises it should have effect as well" (the sports-line weight reads the number); a citizen's posture turns to climbing at ambition 60 (`maneuverEngine.js`, World_Config `maneuverClimbBar`) — "climbing at 60 sounds good"; standing for office needs drive 60, integrity 40, composure 40 (`updateCivicApprovalRatings.js` `scoreLedgerCitizenForOffice_`) — "office this look fine as well". The archetype NAME is still earned at 60 (a label; its pool weights now read the numbers), and the newsroom reads the name as a name (`applyStorySeeds.js`, `storyHook.js`, `rosterLookup.js`). `transitCommuteMass_` sums weights without a row's dial share; no commute row carries a dial term.

## C114–C116 watch re-reads (research-build, 2026-11-16)

The C113 review carried a re-reads section; C114, C115 and C116 did not, so the ROLLOUT §2 rows dated to those fires went unread. Read 2026-11-16 (builder: "whichever of these are of the greatest priority", then yes to all). Sources: **log** = `output/execution_log_c11{4,5,6}.txt` (C116 = the second fire's log); **ring** = live `Carry_Forward_Store` rows stamped 114/115/116; **dump** = `output/beats/` and `prev/`; **live** = live sheet read 2026-11-16. Each result is a measurement; good or bad is the builder's.

| Row | C114 / C115 / C116 | Source | Row now |
|---|---|---|---|
| engine.95 run time | totals 133.3 / 203.8 / 200.7 s of 330; no checkpoint; tail 38.1 / 61.9 / 74.2 s vs `tailReserveMs` 60000 (MaintainLifeHistoryLog 17.6 / 34.2 / 44.1 s) | log timings | next read C117 |
| engine.206 streak bar | Oaks W2 / W4 / L1, each `bar 5 → no headline`; A's off-season | log `sportsStreak` | organic: first run of 5 |
| engine.319 / 320 intake clock, off-map refusal | no citizen minted through Advancement_Intake1; POPIDs 1225–1249 are births, migration arrivals, two owner doors and three media-minted A's rows (G-EC45) | live, log | organic: first intake mint |
| engine.301 crime wave rung | carried spikes 12 / 0 / 1; `crimeWaveHoods` [] every week. A wave needs the same hood rising two Cycles running: C114's 12 hoods, none at C115, Grand Lake at C116 — no repeat, so none was due | ring `PREV_CYCLE_STATE_JSON` | organic: first live wave |
| engine.287 citywide crime gate | C114 carried 12 spikes (log `capped 13 → 12`), the most on record (C107–C113: 2/0/0/1/1/1/2); 0 at C115, 1 at C116. The gate writes no log line, so whether the 12 cut every hood at C115 is not readable from the record | ring, log | next read C120 |
| engine.208 fandom | Oaks weight 0.4197 / 0.4426 / 0.4345 (weeks 3 / 4 / 5, fans 4 / 4 / 3.2); fan lines 4 / 4 / 0; `fandom seeded` 7 / 6 / 12. Signed fan-line volume is engine.331's call (G-EC45 in the C115 log) | ring `PREV_FRANCHISE_WEIGHT_JSON`, log | next read C120 |
| engine.310 event attractiveness | EA sum C113 114.12 → C115 154.42 → C116 155.91 (range 4.25–11.23), inside the watch script's 0.5×–2× band; no C114 dump on disk. The migration-drift follow-up was never automated and was not read | dump | done |
| engine.288 mood gates read both lists | input every week: carried story + contract seeds 72 / 92 / 75 (`seedCarriedSeedList_` lines); before C114 the gates read none | log, ring | done |
| engine.289 absolute CULTURE gates (`wCulture >= 3 / >= 6`) | CULTURE seeds by hood, carried priority before calendar lift: read at C115 Uptown 3 (the one hood at the lower bar), at C116 none, at C117 none; never the upper bar. No log line, so the calendar lift is not seen | ring `PREV_STORY_SEEDS_JSON` + `PREV_CONTRACT_SEEDS_JSON` | the builder's call: keep, re-tier or relative |
| engine.270 storylines | Saturday 11-14 step 3b: 7 attaches across 4 articles; step 6b: 7 storylines, 7 rows updated + 2 appended to Storyline_Ledger. D1/D2 at the fire not read | `logs/saturday-run.log.1.gz` | next read C117 (D1/D2) |
| engine.201 fixed cohort | resnap `output/engine201/cohort-c116.json`: base dials moved for 37 of 48 since C113, largest 4.90 (Celeste Tran); 20 woke more often; mood moved for all 48. Whether a dial change produced a different later choice is not read | live | next read C120 |
| engine.197 Mags' dials | POP-00005 base, 2026-10-21 snapshot → now: drive 60.0→63.1, sociability 91.3→92.2, warmth 53.3→55.0, openness 59.9→62.5, composure 50.0→58.1; integrity, family, outabout, fandom unchanged (5 of 9). The journal drain's share is not read | git snapshot, live snapshot | next read C120 |
| pipeline.74 P Slayer | wrote C114 and C115 (staged in `output/cron-compare/staged/`); the run's resolve count is still not logged, so 3/3 stays unproven | staged files | next read C117 |
| pipeline.104 Saturday Drive drops | 11-14: edition and C115 audio uploaded to their folders | `logs/saturday-run.log.1.gz` | done |
| pipeline.106 lore writer | Fri 11-13: Marcus Osei run ok, `marcus_osei_deep_dive.md` in quarantine and on Drive; waits on /lore-ingest by hand (pipeline.105) | `output/lore-cron-status.json` | done |
