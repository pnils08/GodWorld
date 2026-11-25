# /run-cycle Gap Log — Cycle 117

**Generated:** 2026-11-22T23:55:23.761Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 6 MED / 9 LOW patterns flagged by engineAuditor; 7 improvements; 0 incoherence findings. Pattern types: stuck-initiative=3, repeating-event=1, math-imbalance=3, coverage-gap=1, production-imbalance=1, improvement=7.

**Mechanical pass:** 32 entries (HIGH 1, MED 17, LOW 13). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Grand Lake: decay [Sentiment -0.060, RetailVitality -1.23, HousingPressure +1.000] — Sentiment now 0.09 (11 of 22, city median 0.09); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c117.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 10 • Fields: Neighborhood="Grand Lake", decaySignals=["Sentiment -0.060","RetailVitality -1.23","HousingPressure +1.000"], standing={"Sentiment":{"current":0.09,"rank":11,"of":22,"cityMedian":0.09},"RetailVitality":{"current":13.65,"rank":8,"of":22,"cityMedian":9.93},"HousingPressure":{"current":6,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Grand Lake
- **Status:** OPEN

### G-EC2 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c117.json (pattern type=coverage-gap)
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

### G-EC17 — Fruitvale: decay [Sentiment -0.170, HousingPressure +0.500] — Sentiment now 0.19 (7 of 22, city median 0.09); HousingPressure now 10 (20 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c117.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.170","HousingPressure +0.500"], standing={"Sentiment":{"current":0.19,"rank":7,"of":22,"cityMedian":0.09},"HousingPressure":{"current":10,"rank":20,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Affected: nbhd=Fruitvale
- **Status:** OPEN

### G-EC18 — East Oakland: decay [Sentiment -0.140, RetailVitality -1.15] — Sentiment now 0.07 (14 of 22, city median 0.09); RetailVitality now 8.78 (14  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c117.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 23 • Fields: Neighborhood="East Oakland", decaySignals=["Sentiment -0.140","RetailVitality -1.15"], standing={"Sentiment":{"current":0.07,"rank":14,"of":22,"cityMedian":0.09},"RetailVitality":{"current":8.78,"rank":14,"of":22,"cityMedian":9.93}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=East Oakland
- **Status:** OPEN

### G-EC19 — Initiative "Downtown Economic Revitalization" in phase "vote-scheduled" for 3 cycles (3 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c117.json (pattern type=stuck-initiative, cyclesInState=3)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 8 • Fields: InitiativeID="INIT-008", Name="Downtown Economic Revitalization", Status="proposed", ImplementationPhase="vote-scheduled" • Affected: init=INIT-008 / nbhd=Downtown
- **Status:** OPEN

### G-EC20 — Initiative "Dimond Revitalization Initiative" in phase "announced" for 4 cycles (4 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c117.json (pattern type=stuck-initiative, cyclesInState=4)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 12 • Fields: InitiativeID="INIT-012", Name="Dimond Revitalization Initiative", Status="proposed", ImplementationPhase="announced" • Affected: init=INIT-012 / nbhd=Dimond
- **Status:** OPEN

### G-EC21 — Initiative "Ivy Hill Community Revitalization" in phase "announced" for 3 cycles (3 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c117.json (pattern type=stuck-initiative, cyclesInState=3)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 13 • Fields: InitiativeID="INIT-013", Name="Ivy Hill Community Revitalization", Status="proposed", ImplementationPhase="announced" • Affected: init=INIT-013 / nbhd=Ivy Hill
- **Status:** OPEN

### G-EC22 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC23 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC24 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC25 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC26 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC27 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC28 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC29 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC30 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC31 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC32 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC33 — Prior cycle's gap log (C116) had 75 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c116_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC34 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC35 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC36 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC37 — fire clean [judgment]
PROD @208 stage 73, first live fire of stages 69–73. 132 phases, 210.1 s of 330, 0 failed, 1 warning, 0 new Engine_Errors (9 rows, all pre-C117). Step 2.5 CLEAN; Initiative_Tracker 99 cells = civic apply.

### G-EC38 — G-EC1 HIGH is a world reading, not a defect [judgment]
Grand Lake: Sentiment at city median, RetailVitality 13.65 rank 8 (above median 9.93), HousingPressure 6 rank 17. One-week fall from a high standing; no initiative aimed at it. Stays as the world event. Pointer in ROLLOUT §1.

### G-EC39 — auditor defects (3) [judgment] [defect]
(a) repeating-event: `Riley_Digest.recurringIssue = "none"` counted as a recurring issue (`recurringTokens: ["none"]`), 3 cycles. (b) detectImprovements files any phase change as `improvement`: INIT-007 `implementation-active → stalled`; INIT-003/006 off `complete`. (c) one RetailVitality overshoot (0.71 vs 0.02) filed once per prior pattern — two rows, one measurement. Reach: (a)(b) flow to desk_signal civic lane and the Civis journal as findings. New row on the builder's word.

### G-EC40 — income anomaly POP-01249 [judgment] [route-to-engine-debug]
Paloma Vasquez, owner door C116, Marquee Grocer BIZ-00145 (rev $1,413,436, 12 staff × $58k). Draw $358,718 ≈ 25% of revenue, ≈ 50% of revenue after payroll; engine line "the books raised the draw". Engine output stands. Owed: owner-draw formula read against this row (engine.295 territory).

### G-EC41 — 4th wall: audit vocabulary reaches the sim [judgment] [builder]
(a) `cron-civic-run.js` seat packets: topic title "Engine review HIGH: <type>" (~:662) and "The engine's own review flags this:" (`flagNotes` ~:627); `ailmentPerception` translates the body, the frame stays. (b) `desk_signal_c117.json` contract says "POINTERS ONLY … no angles"; 27 entries carry `handle{angle, hookLine, citizens}`, e.g. "Downtown Economic Revitalization stalled in vote-scheduled — remedy path + responsible office"; labels carry "stuck-initiative (low)". (c) world_summary §Engine Review Findings (line 419 of C117): stripped by notebooklmDailyNews + cron-desk-run cityWeekLines; passed whole, uncapped, by cron-rhea-gate.js and djDirect.js; cut only by length in cron-saturday-run (30k), cron-desk-writer fallback (40k), rheaTwoPass (50k). (d) `lib/mags.js` search shelf exposes world_summary + engine_audit to canon search. (e) Civis journal C117 turns production-imbalance (19 hoods migration, 0 economic events — unverified reading) into public promises ("instrument the economic side of population movement… hiring for it now"). Whether Civis reads the audit is the builder's design (pipeline.68); recorded, not judged.

### G-EC42 — take-overs found this run [judgment] [automation]
(a) Step 2 since-date: `preMortemScan.deriveSinceDate` reads `Last Updated:` from SESSION_CONTEXT.md, which no longer carries it; runCycle passes no `--since`; `output/run-cycle/c{N-1}.json` steps["3"].at holds the prior fire time. (b) Step 3.5: engine persists no run record a service account can read (timings + warnings only in Logger); route: one run-record row per fire in the engine's `finally` to a pre-made tab, step 3.5 renders from it. (c) Step 4.1 review ≈ 90% transcription of the audit JSON; gate checks mtime only; real/mechanism calls are the judgment part. (d) Step 5.55 hit the Sheets read-per-minute quota twice; passed on a 45 s retry; runner has no retry.

### G-EC43 — sports feed names [judgment] [defect]
preflightInputCheck.js:257 and buildWorldSummary.js:1060 split NamesUsed on `,` before stripping `( … )`: "Elias Varek (Owner, Civis Systems)" → "Elias Varek (Owner" + "Civis Systems)". This week's summary flagged only "Ty Jerome" (Oaks, real NBA name — allowed in Oaks coverage, not a citizen).

### G-EC44 — texture grounding fallback [judgment] [observation]
Step 5.5: Baylight District block stated construction no source line stated; rewrite failed the gate; source-line fallback used. INIT-006 is `construction-active` on the tracker but no Baylight seed line carries it.

### G-EC45 — reads this fire owes (engine-sheet rows) [judgment]
| Row | Read | Outcome |
|---|---|---|
| engine.356 | fire PASS; night spot from the ledger: 1 of 1 (OakTown Social @ Temescal = BIZ-00038, vibe quiet, movement restricted); wedding rows tagged `Wedding` (Travis Paiz + Jocelyn Santo, Lake Merritt), no `|source:bond` | read done → Task 1 |
| engine.340 | SeedID as text: holds — C117 ids `78033564`, `e7054318` read back as text (C113 `9.70E+13`, C115 `6.55E+07` before). Each initiative its own seed: 0 initiative seeds at C117 (one CIVIC coverage reaction, no initiative) — not readable | re-date C118 |
| engine.95 | 210.1 s of 330; no checkpoint. Tail by the reserve's definition: ExecuteIntents 58.8 + MediaIntake 2.6 + BusinessArchive 1.4 + CitizenArchive 2.1 + MaintainLifeHistoryLog 23.8 = 88.7 s vs `tailReserveMs` 60 s — over for the third week (C115 61.9, C116 74.2); growth moved to ExecuteIntents (25.5 → 58.8), MLHL fell (44.1 → 23.8). Corrected 2026-11-22: first pass left ExecuteIntents out | re-date C118 |
| engine.270 | D2 at the fire holds: registry 20 rows, initiative rows `age: null`, no invented week; stage changes open new rows (INIT-003:design-phase, INIT-006:construction-active, INIT-007:stalled). D1 is the Saturday attach | re-date Sat 2026-11-28 |
| pipeline.74 | P Slayer, Tanya, Noah all staged C116 (grok-4.3). Resolve count still not logged — no field in the staged JSON; a read cannot close it, it needs a log line | re-date C118 |
| governance.59 | C117 ran every step through the runner, each gate recorded in `output/run-cycle/c117.json`; one retry (5.55 quota). Codex hook trust still his | → needs-info |

research-build rows due (engine.338, .339, .347, .349, .351): not read — research-build busy with the builder at 17:57; Step 6.1 waits on them.

### G-EC46 — reads this fire owes (research-build rows, taken by engine-sheet on the builder's word) [judgment]
Builder 2026-11-22: "you can take those 5". Two read-only agents; findings spot-checked against `execution_log_c117.txt` and git.
| Row | Read | Outcome |
|---|---|---|
| engine.338 | C116: 5 Question rows on 4 citizens; Dillon, Paulson, Abraham declined; Shepard queued Club Coach, never applied (row filed 9 cols right, G-EC70 C116). Design changed 11-21 (`2b8501c8c`): question wake is words-only, no MOVE, no intake row — Shepard's answer is dead, his row unchanged (Head Coach). No re-price of Dillon/Paulson. C117 Question rows: Varek POP-00789, Ramos POP-00041. Plan changelog stops 11-15 | re-date C118 |
| engine.339 | Grab: POP-01210 Pruitt drawn; match Xavier Williams (Chinatown) not in/beside Fruitvale; nothing lands (log :204). Birth (other door, `createChildRow_`): POP-01250 Ravi Cerrano to Serg Cerrano POP-00523, Fruitvale, HH-0084-367 couple → family (log :157). [observation] Ravi has no LifeHistory_Log row of his own; Serg's Birth row has blank Name/Neighborhood, same as C116's | re-date C118 |
| engine.347 | 209 Reflection_Intake rows since C116, all applied; 185 moved a dial (= log :244); 24 Flat rows move nothing by design. Sat 11-21 PRINT rows 9 of 9 applied, voice steps reproduce exactly. Varek journal row landed 5:54 PM, after the 5:45 fold → C118 | re-date C118 |
| engine.349 | dialPulse live C117 vs leg n C117: moved 1,001/981, crossed 28/22, middle-on-all-eight 689/687, low 5/4. The 13: marks 107 → 117 (POP-01041 115 = his newest line). Nobody under 20. [watch] 4 at base sociability 100 (POP-00170/198/210/231), already 100 pre-fire. [untraced] log :244 FUTURE-STAMPED 2 lines (Y3C29 on POP-01030, 01035) gone from the post-fire dump; what removed them not found | re-date C118 |
| engine.351 | Arrivals: POP-01251 Elijah Davis, POP-01252 Yolanda Ghosh (migration wave, log :164) start off 50, replay matches every dial; 14 `arrival start` Dial_Moves rows, only theirs. Held rows: none (Intake 11 rows all statused; Advancement_Intake1 no `waiting —`) — hold path still bench-only | re-date C118 |

## LEG: /city-hall (G-R)

- G-R (AUTO): sanity-read FAIL-SCOPED — INIT-012, INIT-014 excluded from the write, rest applied — see output/cron-civic/gate_c117.json
- G-R (AUTO): 1 voice(s) pending this window: council_d9

### G-EC47 — the two future-stamped lines: traced, nothing lost [judgment] (2026-11-23)
`compressLifeHistory_` "FUTURE-STAMPED 2 lines" = `Y3C29 — [Family] The record catches up: married to …` on POP-01030 Elena Patel (→ POP-00023 Gregory Mims) and POP-01035 Kaila Brown (→ POP-00038 Theo Park). Writer: `scripts/migrations/engine57_spouse_backfill.js:185` at `aaa7e9922` (2026-07-14) hard-typed `Y3C29` with `CYCLE = 101`; fixed by `113e78aab` (2026-10-17). The guard `utilities/compressLifeHistory.js:713` only skips the line from the fold; the line left by the ordinary 20-line trim (`:878` → `trimLifeHistory_`), first eligible for both at C117. Marriages intact: SpouseId both ways, MaritalStatus, household members, Family_Relationships `married | 101 | active`, bonds BOND-93E80E96 / BOND-8AA6D855. 0 stamps past Y3C13 and 0 watermarks past 117 remain. Closed, no fix owed.

### G-EC48 — births: three omissions in the milestone writer [judgment] [defect] (2026-11-23)
`phase04-events/generationalEventsEngine.js` `applyMilestone_` (:1801): (a) the LifeHistory_Log intent hardcodes `''` for Name and Neighborhood though both are parameters — every milestone tag (Birth 8/8, Death 4/4, Retirement 10/11, Health 10/18, Recovery 3/4, Graduation 9/25 blank on live); (b) the ledger cell stamp is `"C" + cycle` (:1802), a leftover of the S271 `inWorldStamp_` conversion — readers matching `/^Y\d+C\d+ — /` (`lib/discordLookups.js:136`, `lib/personaProvider.js:283`) drop those lines; (c) `createChildRow_` (:1177) queues no log row for the child (5 of 8 newborns have none; readers already expect "born to"). Row engine.359.

### G-EC49 — owner pay share onto World_Config [judgment] (2026-11-23)
Builder: "Move the 0.5 onto World_Config". `applyOwnerDraw_` (`phase05-citizens/generationalWealthEngine.js`) paid off-heritage owners `profit × OWNER_DRAW_SHARE (0.5) / owners`, profit = revenue − staff × avg salary (Marquee Grocer: (1,413,436 − 12 × 58,000) / 2 = 358,718 = Paloma Vasquez's draw). Now `ctx.config.ownerDrawShare`, seeded 0.5 by `ensureEngine356Config_` (no new ensure call); missing or outside 0..1 throws. Same number — no citizen's pay changes. Row engine.360; tests and bench owed at the builder's unlock. Seen in passing: the heritage `Business-Gain` log row is stamped `ctx.now` (wall clock) with blank Name/Neighborhood — not this job.

### G-EC50 — run reserve: watch C118 [judgment] (2026-11-23)
Builder: "Watch C118 first". C117 tail 88.7 s: ~23 s was the one-time creation of Dial_Moves and Dial_Pulse (first live fire of the dial code; C114–C116 created none), ~11 s a Sheets timeout retry; executor intents 881 / 876 / 909 at C115–C117. Reserve stays 60 s; engine.95 reads C118 from the run record.

### G-EC51 — the four sociability pins: already ruled, not growing [judgment] (2026-11-23)
POP-00170 Melton Neilon, POP-00198 Rick Walker, POP-00210 Depak Ying, POP-00231 Calvin Turner at base sociability 100. Builder ruling 2026-09-13 (`utilities/citizenMemory.js:74-77`, `ad252422b`): read back as is, "move only on a real downward event". Cause traced (snapshot deltas = reflection points × 0.225): the pre-S449 reflection accretion (`clamp100_(base+delta)`, no room scaling) at C102–C105 — not the "seeder saturation" the code note says; Reflection_Intake C97–C116 sociability up 812 / down 0, these four wrote 67/64/32/32 rows vs ~2.7 per tier-4 citizen. Room scaling on every base writer since S449 (`citizenMemory.js:99`) stops new pins: citizens at 100 or 0 on any base dial 1 → 3 → 5 → 4 (flat since Oct 27); 0 at 0. A net-down Cycle moves them (POP-00001 drive 100 → 99.1). Open for research-build: engine.349 plan Acceptance 5 ("nobody pinned at 100") conflicts with the 09-13 ruling; the code note's "seeder saturation" premise is wrong. No code change.

### G-EC52 — the smaller things (builder 2026-11-23 "Let's address the smaller things") [judgment]
(a) `createChildRow_` drew `ctx._rng || function() { return 0.5; }` and the household id `ctx._rng ? ctx._rng() : 0.5` — both now `rand_(ctx)`, which throws without the Cycle's RNG (Phase 40.3 Path 1); a normal fire draws the same numbers (`ctx._rng` is set at :254 before births). (b) LifeHistory_Log rows: C117 2,699 rows, 153 blank Name, 245 blank Neighborhood, 92 bare `C117` stamps (processAdvancementIntake's `'C' + cycle`); wall-clock `ctx.now` stamps were already normalized by G-EC71 in the executor. The executor (`persistenceExecutor.js`, the one place every row passes) now also turns a bare `C<n>` into its in-world stamp by its own number and fills a blank Name / Neighborhood from the row's own POPID in the in-memory ledger (a POPID the ledger lacks keeps its blanks; a resume before its ledger reload fills nothing). The heritage `Business-Gain` row also writes its stamp, name and hood itself. `scripts/lifeHistoryRowFill.test.js` 6/6 on the real executor; 31 related test files pass. Row engine.361. (c) `scripts/civicMustDecide.js` + its test: no caller — removal is the builder's hand (the delete guard). (d) world_summary §Engine Review Findings: see the summary change.

### G-EC53 — C117 gap log closed [judgment] (2026-11-23)
Settled: G-EC1/17/18 (decay — world readings, Civis-credited to the seats), G-EC2 (faith coverage gap — a media reading), G-EC19–21 (stuck programs — world; two more stalled by the C117 civic apply), G-EC37–52 (every judgment: ruled, live at PROD stages 74–76, or traced). City-hall leg: the sanity gate held (INIT-012, INIT-014 claims blocked), council_d9's pending voice is the civic chain's own. Filed: the 24 standing header-drift flags (G-EC3–16, G-EC22–31 — all repeats, 25 at C110 and C113, none new) → engine.362; the four V2-runtime stubs (G-EC32, G-EC34–36 — "engine-run-log ingest path not yet built"; engine.358's Engine_Run_Log is that path) → engine.363.

### G-EC72 — congregations the business ledger does not hold under the same name [judgment] (2026-11-24, engine-sheet, engine.356)
A moment at a congregation carries a place only when Business_Ledger has a row with the congregation's exact name (Faith_Organizations.Organization = Business_Ledger.Name). Live read 2026-11-24: 11 of 16 match. No row: Bay Pure Land Buddhist Temple (Chinatown), Bharat Mandir of the East Bay (Montclair), Gurdwara Singh Sabha Fruitvale, Or Hashalom Renewal Community (Grand Lake). Name differs: Adams Point United Methodist (faith tab) vs Adams Point United Methodist Church (BIZ-00061). Their lines still land, with the name and no place. Neither tab was edited. Also: the four City-wide programs (PRG-015, 018, 028, 033) match no citizen's hood, so no program-slot line names them.
Settled 2026-11-24 (builder "go , use the canon details, go , yes"): the four minted BIZ-00290–00293, BIZ-00061 renamed to the canon name; PRG-015 / 028 / 033 given hoods from canon; PRG-018 still City-wide (nothing published).

### G-EC73 — the code's own neighborhood and meeting lines are never drawn [trace] (2026-11-24, engine-sheet, engine.356 A3)
`generateCitizensEvents.js` pushes the hood texture lines (`CITIZEN_EVENT_TEXTURE_*`, "passed a clinic with a full waiting room") and the five template lines ("crossed paths with $CONTACT at $VENUE …", the tone slotter behind them) into every citizen's pool (~3329–3336, no condition on the push). In the C116 + C117 dump (5,176 lines) they landed 0 times: 0 `source:template`, 0 `source:slotter`, 0 `source:neighborhood` line without an `auth:` tag (the 254 that landed are all content-tab lines). Other code pools do land (`source:base` 430 at C117). Not found by reading: the exclusive-pool drop covers two other domains only, the life-state gate classes them universal, no weight is zeroed. Until traced, the meeting beats of the slotter (15 lines with $CONTACT) reach nobody; A3's people ride content-tab lines instead. Next: a wiring card on the pool between the push and the draw, or a pool count on the bench.
