# /run-cycle Gap Log — Cycle 110

**Generated:** 2026-10-05T03:09:24.423Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 0 HIGH / 3 MED / 25 LOW patterns flagged by engineAuditor; 23 improvements; 0 incoherence findings. Pattern types: stuck-initiative=2, repeating-event=1, coverage-gap=1, production-imbalance=1, improvement=23.

**Mechanical pass:** 26 entries (HIGH 0, MED 12, LOW 13). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c110.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC2 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC3 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Casino_Ledger:'POPID'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC4 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC5 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC9 — citizenDerivation.js field 'Neighborhood' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Business_Archive, Business_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'Neighborhood' is absent from that sheet's headers but exists on: Advancement_Intake1, Business_Archive, Business_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC10 — citizenDerivation.js field 'RoleType' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'RoleType' is absent from that sheet's headers but exists on: Advancement_Intake1, Bay_Tribune_Oakland, Citizen_Archive. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC11 — citizenDerivation.js field 'EducationLevel' not on target 'Economic_Parameters' (exists on Citizen_Archive, Simulation_Ledger) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'EducationLevel' is absent from that sheet's headers but exists on: Citizen_Archive, Simulation_Ledger. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC12 — citizenDerivation.js field 'BirthYear' not on target 'Economic_Parameters' (exists on Advancement_Intake1, Citizen_Archive, Generic_Citizens) [mechanical] [header-drift] [MED]

- **Source:** utilities/citizenDerivation.js
- **Diagnosis:** Type 2 (target-sheet mismatch). Writer targets 'Economic_Parameters'; field 'BirthYear' is absent from that sheet's headers but exists on: Advancement_Intake1, Citizen_Archive, Generic_Citizens. Either wrong sheet target, missing schema migration on 'Economic_Parameters', or dead code path.
- **Status:** OPEN

### G-EC13 — Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "design-phase" for 3 cycles (3 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c110.json (pattern type=stuck-initiative, cyclesInState=3)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 4 • Fields: InitiativeID="INIT-003", Name="Fruitvale Transit Hub Phase II — Visioning", Status="proposed", ImplementationPhase="design-phase" • Affected: init=INIT-003 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC14 — Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 3 cycles (3 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c110.json (pattern type=stuck-initiative, cyclesInState=3)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 7 • Fields: InitiativeID="INIT-007", Name="Oakland Youth Apprenticeship Pipeline", Status="announced", ImplementationPhase="operational" • Affected: init=INIT-007 / nbhd=West Oakland,East Oakland,Fruitvale
- **Status:** OPEN

### G-EC15 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC16 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC17 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC18 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC19 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC20 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC21 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC22 — runCivicRoleEngine.js defensive-fallback literal 'TierRole' on 'Simulation_Ledger' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'Simulation_Ledger'; 'TierRole' isn't on it, but a nearby sibling literal 'RoleType' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC23 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC24 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC25 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC26 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC27 — Prior cycle's gap log (C109) had 72 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c109_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC28 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC29 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC30 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->
## LEG: /city-hall (G-R)

- G-R (AUTO): sanity-read verdict FAIL — see output/cron-civic/gate_c110.json


## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


## Judgment entries (engine-sheet, S529)

### G-EC31 — run-cycle Step 5 ingest curl hung ~4h55m; chain launched on a stale beats dump [judgment] [phase-ordering] [HIGH]
Two Supermemory POSTs, no `--max-time`: world_summary 17:12 CDT, disposition cache 22:07, dumpLedger 22:07:50, dumpBeatTabs 22:07:58. Tick 17:17 launched the chain on summary+audit (correct per civic.42) with beats at c109 → `petition sweep: local data load failed: Requested cycle does not match beats cycle 109`. Fix landed: `--max-time 60` in SKILL.md. Open: 5.56 should run before Step 4 (reads sheets only; no dependency), or the tick launch condition should also require `output/beats/meta.json` cycle == {XX}.

### G-EC32 — C110 civic apply stranded on sanity-read FAIL; two readings of one verdict [judgment] [silent-fail] [HIGH]
gate_c110 sanity: INIT-005 phase/milestone contradiction (real), INIT-002 "LastWorkCycle only" (false positive — a move-fold write is only LastWorkCycle/LastWorkSeat by design). `decideApply` blocks on `sanityStatus === 'fail'` with no cutoff path. The 21:00 retry read `detPass` (sanity-read failures count as deterministic-pass, cron-civic-run.js:3639) and printed "passed the gate and waits on verdicts/cutoff — the hourly tick applies it"; the tick never will. 5 work moves (001/002/003/005/006) unapplied; LastWorkCycle stays 108 on all five. All-or-nothing apply: one bad decision voids four good ones. Sim call on C110 raised to the builder; mechanism (per-initiative block) is engine-sheet's.

### G-EC33 — health-center director agent is construction-era; row is operational since C88 [judgment] [cohort-collision] [MED]
`.claude/agents/civic-project-health-center/LENS.md` (2026-04-25) sits her at a construction fence; IDENTITY frames capital-projects delivery. INIT-005 `ImplementationPhase operational`, `OpensCycle 88`. The C110 projects voice wrote `construction-active` + "Final inspections complete + drywall authorized". Agent brief needs the opened-center chapter (coordinate: civic agent files).

### G-EC34 — sanity-read does not know the move-fold write shape [judgment] [silent-fail] [MED]
Reader flagged INIT-002's `{LastWorkCycle, LastWorkSeat}` write as "no other updates" — that IS the work move. Either feed the reader the fold contract or exempt `primaryVoice: move-fold` decisions from the content check.

### G-EC35 — HousingPressure has no standalone detector [judgment] [cross-cycle-debt] [LOW]
C109 math-imbalance keyed on Sentiment decay; C110 sentiment rose city-wide on the championship (band 6) and the three decay hoods' HousingPressure kept climbing +1 (Downtown 6→7, Fruitvale 2.5→3.5, Grand Lake 4→5) unflagged.

### G-EC36 — measureRemedies carried 0 of 8 C109 patterns [judgment] [cross-cycle-debt] [LOW]
`measurementHistory[]` empty; repeating-event "strain" and coverage-gap faith are the same findings as C109 under a re-based window and did not match. Key too narrow.

### G-EC37 — pre-flight STALE on a Proposed row [judgment] [header-drift] [LOW]
INIT-008 NextActionCycle 108 flagged past-due; Proposed rows carry no clock (civic.38 ruling 2026-09-21). preflightInputCheck.js still reads the pre-civic.38 time gate.

### G-EC38 — civisJournal Sonnet route returned fenced markdown, not JSON [judgment] [silent-fail] [LOW]
`Civis Sonnet failed or returned invalid output: Unexpected token '*', "**Civis Sy"...`; DeepSeek wrote the entry (arm 1 pass). First writer never lands while it fences its output.

### G-EC39 — two propose moves rejected with no recorded reason [judgment] [silent-fail] [LOW]
moves_c109.jsonl: D2 "Commercial Stabilization for Grand Lake", D1 "West Oakland Tenant Defense Fund" — `status: rejected`, no outcome/reason on the move; fold wrote 0 candidates.

### G-EC40 — pre-mortem §6 looks in the wrong place for intent targets [judgment] [header-drift] [LOW]
Skill text says scan Phase 10 for target sheet names; targets ride `intent.tab` from the queuing sites (`tab: 'Neighborhood_Map'` etc. across phase0*/) plus `SHEET_NAMES`. C110 manual check: every literal and constant on live except `MediaRoom_Paste` (off-cycle `parseMediaRoomMarkdown.js` only).
