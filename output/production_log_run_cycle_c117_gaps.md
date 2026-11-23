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
| engine.95 | 210.1 s of 330; no checkpoint; Phase-11 phases after ExecuteIntents 30.0 s (MaintainLifeHistoryLog 23.8) vs reserve 60 s | re-date C118 |
| engine.270 | D2 at the fire holds: registry 20 rows, initiative rows `age: null`, no invented week; stage changes open new rows (INIT-003:design-phase, INIT-006:construction-active, INIT-007:stalled). D1 is the Saturday attach | re-date Sat 2026-11-28 |
| pipeline.74 | P Slayer, Tanya, Noah all staged C116 (grok-4.3). Resolve count still not logged — no field in the staged JSON; a read cannot close it, it needs a log line | re-date C118 |
| governance.59 | C117 ran every step through the runner, each gate recorded in `output/run-cycle/c117.json`; one retry (5.55 quota). Codex hook trust still his | → needs-info |

research-build rows due (engine.338, .339, .347, .349, .351): not read — research-build busy with the builder at 17:57; Step 6.1 waits on them.
