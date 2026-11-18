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

### G-EC55 — UNDOCKED: the board ranks points, the night is told in credits [observation] [MED] (research-build, 2026-11-17)
Builder 2026-11-17: "every story I hear is the break even with 0 credits so maybe the undocked isn't set up properly". The board ranks achievement points, then credits, then POPID (`scripts/undockedStandings.js`, `loadUndockedFeed_`; from C114). The pilot brief tells pilots the board is achievements, each step scoring its share (`scripts/undockedMissionBrief.js:63`); since C114 a night visits 12–18 systems and trades nothing: 7 of 9 pilot-weeks at 0 credits, 27–45 points (`output/spacemolt-show/intake/`). The words handed on are credits: the night's excerpt is `<name> credits=0 systems=…` with no points (`scripts/undockedShowGate.js:153-157`); Nia's line for a night with no typed record is "dead even on the night" (`scripts/buildNiaSlice.js:198-214`); the pilot's own record ends "came out even on credits" (`scripts/undockedShowRecord.js:126-130`, after the achievements earned). No engine life line reads a night's points. Found on the engine.350 read; nothing changed. engine.350 Task 8's UNDOCKED half waits on what the show scores. Builder 2026-11-17, asked whether to open a row to make UNDOCKED tell its nights in points: "Yes" — pipeline.113.

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
