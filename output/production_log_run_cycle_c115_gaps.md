# /run-cycle Gap Log — Cycle 115

**Generated:** 2026-11-09T08:14:43.901Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 0 HIGH / 5 MED / 6 LOW patterns flagged by engineAuditor; 2 improvements; 0 incoherence findings. Pattern types: stuck-initiative=1, math-imbalance=5, coverage-gap=1, cascade-failure=1, production-imbalance=1, improvement=2.

**Mechanical pass:** 32 entries (HIGH 0, MED 17, LOW 14). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c115.json (pattern type=coverage-gap)
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

### G-EC16 — San Antonio: decay [Sentiment -0.200, RetailVitality -1.21] — Sentiment now -0.16 (22 of 22, city median -0.015); RetailVitality now 5.22 (2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c115.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 18 • Fields: Neighborhood="San Antonio", decaySignals=["Sentiment -0.200","RetailVitality -1.21"], standing={"Sentiment":{"current":-0.16,"rank":22,"of":22,"cityMedian":-0.015},"RetailVitality":{"current":5.22,"rank":21,"of":22,"cityMedian":8.945}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=San Antonio
- **Status:** OPEN

### G-EC17 — KONO: decay [Sentiment -0.180, HousingPressure +0.500] — Sentiment now -0.02 (12 of 22, city median -0.015); HousingPressure now 0.5 (14 of  [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c115.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 19 • Fields: Neighborhood="KONO", decaySignals=["Sentiment -0.180","HousingPressure +0.500"], standing={"Sentiment":{"current":-0.02,"rank":12,"of":22,"cityMedian":-0.015},"HousingPressure":{"current":0.5,"rank":14,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=KONO
- **Status:** OPEN

### G-EC18 — Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 3 cycles (3 cycles) [mechanical] [cross-cycle-debt] [LOW]

- **Source:** output/engine_audit_c115.json (pattern type=stuck-initiative, cyclesInState=3)
- **Diagnosis:** Sheet: `Initiative_Tracker` • Rows: 7 • Fields: InitiativeID="INIT-007", Name="Oakland Youth Apprenticeship Pipeline", Status="announced", ImplementationPhase="implementation-active" • Affected: init=INIT-007 / nbhd=West Oakland,East Oakland,Fruitvale
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

### G-EC29 — West Oakland: decay [Sentiment -0.100, HousingPressure +1.000] — Sentiment now 0.31 (1 of 22, city median -0.015); HousingPressure now 4.5 ( [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c115.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 5 • Fields: Neighborhood="West Oakland", decaySignals=["Sentiment -0.100","HousingPressure +1.000"], standing={"Sentiment":{"current":0.31,"rank":1,"of":22,"cityMedian":-0.015},"HousingPressure":{"current":4.5,"rank":16,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-001","INIT-007"] • Affected: init=INIT-001,INIT-007 / nbhd=West Oakland
- **Status:** OPEN

### G-EC30 — Fruitvale: decay [Sentiment -0.030, HousingPressure +1.000] — Sentiment now 0.29 (2 of 22, city median -0.015); HousingPressure now 8.5 (19  [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c115.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 6 • Fields: Neighborhood="Fruitvale", decaySignals=["Sentiment -0.030","HousingPressure +1.000"], standing={"Sentiment":{"current":0.29,"rank":2,"of":22,"cityMedian":-0.015},"HousingPressure":{"current":8.5,"rank":19,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-007"] • Affected: init=INIT-007 / nbhd=Fruitvale
- **Status:** OPEN

### G-EC31 — Jack London: decay [Sentiment -0.070, HousingPressure +0.500] — Sentiment now 0.2 (3 of 22, city median -0.015); HousingPressure now 10 (21  [mechanical] [math-anomaly] [LOW]

- **Source:** output/engine_audit_c115.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 7 • Fields: Neighborhood="Jack London", decaySignals=["Sentiment -0.070","HousingPressure +0.500"], standing={"Sentiment":{"current":0.2,"rank":3,"of":22,"cityMedian":-0.015},"HousingPressure":{"current":10,"rank":21,"of":22,"cityMedian":0}}, matchingActiveInitiatives=["INIT-006"] • Affected: init=INIT-006 / nbhd=Jack London
- **Status:** OPEN

### G-EC32 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC33 — Prior cycle's gap log (C114) had 41 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c114_gaps.md OPEN entries and flag any that recur in this cycle's findings.
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
## LEG: /city-hall (G-R)

- G-R (AUTO): 2 voice(s) pending this window: council_d3, council_d1
### G-EC37 — C115 content drafter wrote ten semantically unsupported lines [judgment] [content-ledger] [MED]

- **Source:** `Event_Content_Ledger` rows 983–992 after `node scripts/draftContentRows.js --cycle 115 --apply`; `output/beats/Story_Seed_Deck.jsonl` C115.
- **Diagnosis:** Loader parity accepted all ten rows. One described the Oaks basketball game in "innings"; several others added flyers, deliveries, pamphlets or venue details absent from the C115 seeds.
- **Repair:** Builder ordered erasure. Deleted exactly rows 983–992 from the live ledger after verifying `auth:auto` and `Active=no` on all ten. Readback `A979:I994` now ends at the prior row 982. No C115 engine refire or content re-append.
- **Status:** LIVE ROWS REMOVED; semantic grounding gate in `scripts/draftContentRows.js` remains open.

### G-EC38 — C115 neighborhood texture attached programs to unsupported venues [judgment] [texture] [MED]

- **Source:** `output/neighborhood_texture_c115.md` generated by Step 5.5; C115 `Story_Seed_Deck` source lines.
- **Diagnosis:** The generated text assigned the Chinatown job training workshop to Bay Pure Land Buddhist Temple, Lake Merritt tutoring to Cathedral of the Living Word, and East Oakland seniors lunch to Masjid An-Nur without source links. It called the Fruitvale transit hub under physical construction while its seed says design-phase.
- **Repair:** Corrected ten hood blocks against C115 seeds. `buildWorldState.js 115` could not reach Google OAuth (`EAI_AGAIN`); re-folded only `world_state.json.hoods` locally from the corrected texture, with exact 22-hood key match and C115/current-canon readback. Prior consumption of the first texture by citizen wakes is unverified.
- **Status:** CURRENT C115 ARTIFACT REPAIRED; generator grounding gate remains open.

### G-EC39 — C115 fire complete; seven ROLLOUT live reads still owed [judgment] [process] [MED]

- **Source:** `output/execution_log_c115.txt` (`Cycle completed`, engine errors 0), `node scripts/docLoopStatus.js --due` (7 rows), `docs/engine/ROLLOUT_PLAN.md` §2.
- **Diagnosis:** engine.333, engine.338, engine.331, engine.332, engine.335, engine.334 and engine.94 name C115. Their row-owning Claude terminals must perform the specified live reads and flip or re-date each row. Codex did not mark those rows complete.
- **Status:** OPEN; Step 6 ROLLOUT close unverified.

### G-EC40 — Repeat mechanical flags and runtime detector stubs [judgment] [audit] [LOW]

- **Source:** C114 and C115 gap logs; C115 execution log on disk.
- **Diagnosis:** The faith coverage flag and 24 header-drift titles recur from C114. G-EC32/34/35/36 are V2 detector stubs that claim execution-log capture is absent, although `output/execution_log_c115.txt` exists; detector implementation remains absent.
- **Status:** OPEN for detector and underlying findings; no engine fault inferred solely from these repeated scanner titles.

### G-EC41 — World-state texture parser carried footer into East Oakland wake input [judgment] [texture] [MED]

- **Source:** `scripts/buildWorldState.js:parseHoodBlocks`; first C115 `output/world_state.json.hoods["East Oakland"]` readback.
- **Diagnosis:** `split(/^### /m)` consumes the final hood section through end of file, including the generated `---` footer and metadata. `loadNeighborhoodTexture` can surface that metadata in a citizen wake.
- **Repair:** Moved the C115 artifact provenance note into the preamble and removed the footer; locally re-folded all 22 hood blocks into `world_state.json`, readback `footerLeak=false`, canon current.
- **Status:** CURRENT C115 ARTIFACT REPAIRED; parser code still needs a footer boundary.


## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*

### G-EC42 — C115 chain re-run after the fire through the step runner [judgment] [process] [MED]
Steps 5.5 → 6 re-run in order 2026-11-09 via scripts/runCycle.js (governance.59); 1–2.5 recorded from codex's pre-fire run, 3 confirmed on live, 3.5–5.56 verified from fire-time output and not re-run (a re-run reads the sheet after the civic chain wrote). Record: output/run-cycle/c115.json.

### G-EC43 — Texture re-run still names a venue the world does not hold [judgment] [texture] [MED]
Fresh script output replaced the hand-corrected file. 21/22 hood blocks trace to C115 seeds or identity; Glenview "Civic Watch Patio" is in no tab. Seed sightings carry citizen names into wake text (Rowan Pierce, Vinnie Keane, Rico Valez). pipeline.107.

### G-EC44 — Drafter re-run: transit-hub construction again; one invented street detail [judgment] [content-ledger] [MED]
10 rows written Active=yes. 8 trace to C115 facts. "a commuter glancing at the Fruitvale Transit Hub construction site" contradicts the design-phase initiative (same miss as the erased batch); "a pothole on Telegraph" is in no tab. Kill switch is the builder's. pipeline.107.

### G-EC45 — Signed fan lines run at about twice the pre-engine.331 volume [judgment] [sports] [MED]
LifeHistory_Log Sports-Fandom-Up-S: C112 84, C113 99, C114 127, C115 142; engine.331 P3 bar was C105–C110 37–74. Builder's call (engine.331 row to needs-info). Feed word "roster-decision" (A's catcher rumor) is on no pitch route — no pitch, as coded.

### G-EC46 — INIT-003 Fruitvale Transit Hub and INIT-006 Baylight closed by hand on the builder's word [judgment] [civic] [MED]
Builder 2026-11-09: "Fruitvale hub is built , 4 rounds is 4 cycles and it's been 20 , I'm not waiting ont at anymore , that's done , Baylight is done" / "Close them". Live Initiative_Tracker rows 4 and 6 via lib/sheets: ImplementationPhase design-phase / construction-active → complete, NextScheduledAction + NextActionCycle blanked, LastStageChangeCycle 115, MilestoneNotes line added; read back. C116 Step 2.5 counts these as tracker moves (never rebased). The 4-round schedule did not advance either row for 20 Cycles — builder: "I changed it to 4 phases and it's still doing stupid shit".

### G-EC47 — Write packet still names "unanswered question" as the article's shape [judgment] [newsroom] [MED] (research-build, 2026-11-11)
`scripts/livedExperiencePacket.js:994` `output.rule`: "Article shape is assigned-fact lede, one scene, one Packet quote, unanswered question." Commit 5c8c16f2e (2026-11-11, closing no longer handed) removed `closeQuestion` and left this line; the 11-11 18:22 / 18:23 write packets for Tamsin Pruitt and Ines Sorensen carry it (`output/cron-compare/culture_c115_*_packet-v2_*.state.json`). Not traced: whether the writer's prompt includes the packet's `output` block. pipeline.111.

### G-EC48 — "D3 East Oakland" in two office records; East Oakland is D5 [judgment] [civic] [LOW] (engine-sheet, 2026-11-13)
C115 office-position docs on the Mayor's page (POP-00034: "[D3 East Oakland briefing before any OARI expansion]", "[D3 East Oakland briefing and OARI expansion hold]") and D5 Rivers' (POP-00043: "[Oakland Alternative Response Initiative — D3 East Oakland community briefing bef…]"). `lib/districtMap.js` D3 = Fruitvale, San Antonio; D5 = East Oakland. The label rides the civic cron's topic line, not the work wake. Read during pipeline.110 Task 7; feeds the office boot-file check.

### G-EC49 — DA work wake: empty model reply, nothing written, no retry [silent-fail] [wakes] [LOW] (engine-sheet, 2026-11-13)
Thu 2026-11-12 20:18 work wake (log 02:18:42 UTC): POP-00143 Clarissa Dane woke on civic-office + crime-metrics (pack built: East Oakland 33 / Dimond 30 / San Antonio 30 …); `deepseek/deepseek-v4-flash-0731` returned empty content; `cron-work-wake.js` sent it to `appendReflection_`, the store answered "Content field is empty"; no page doc, no Reflection_Intake row, no second try. She is registry-only on Thursday, so C115 has no DA work doc.

### G-EC50 — A wake does not carry its own holder's health; the ME carries a thread no record holds [judgment] [wakes] [LOW] (engine-sheet, 2026-11-13)
Health_Cause_Queue C115: POP-00044 Elliott Crane (the D6 seat, Uptown, 79) `recovering`, broken leg. The EMS and ME wakes see it ("Elliott will walk again" on POP-00142's page); his own work wake carries office-week + civic-office only and writes Piedmont Avenue trash and permits. Separately, the ME (POP-00142) has written "Yu Zen's lacerations don't match the fall" across several wakes; Hospital_Ledger has Yu Zen (POP-00194) admitted C105 for a workplace accident, discharged recovered C109; no death, no record of the doubt — his own page lines re-read each wake. Engine output stands; recorded for the builder.

### G-EC51 — A director's old page lines outweigh the closed record; the wake re-writes its own earlier reflection [judgment] [wakes] [MED] (engine-sheet, 2026-11-13)
After pipeline.110 Task 8 (the pack now hands INIT-003/006 as "complete … nothing left on the books"; stale role lines cut), three dry runs 2026-11-13: Soria Dominguez 2 of 2 still write "one comment period away from a real vote" — one run word for word her own earlier reflection, which already sits twice in her page readback (written by earlier wakes; dry runs write nothing). Ramos writes soil reports and remediation. Source: `lib/wakePerception` `loadOwnPageReadback` hands back her own reflections; the cheap model copies them over the record's line. Shared readback lib, every wake — outside this row. Engine output stands; recorded for the builder.

### G-EC52 — A written office file contradicts the ledger on the holder's own age and home [judgment] [wakes] [LOW] (engine-sheet, 2026-11-13)
`.claude/agents/civic-project-stabilization-fund/IDENTITY.md` gives Marcus Webb as 52, living in the Laurel district; the ledger line the citizen wake prints for POP-00790 is 42, Downtown (dry run 2026-11-13). The file also pins moving state as identity (Osei "serious condition, unavailable", a first named applicant, who holds the checkbook). The Sunday chain loads the file whole (`cron-civic-run.js` `readPersonaDir`). Not edited; recorded for pipeline.110 Task 9.

### G-EC53 — The daily wake tells a journalist "You are an ordinary person, not a writer" [judgment] [wakes] [LOW] (engine-sheet, 2026-11-13)
Kai Marston (POP-00158, Journalist, Arts & Entertainment), evening dry run 2026-11-13: the system line reads "You are an ordinary person, not a writer." Citizens of station get "You are not a writer." (`citizen-wake.js` `stationLine`). A fixed line about what the person is not. Recorded for pipeline.110 Task 9.

### G-EC54 — A wake question drops the whole temperament list into one sentence [judgment] [wakes] [LOW] (engine-sheet, 2026-11-13)
Vinnie Keane evening dry run 2026-11-13, provocation `self_disposition`: "You've been carrying a can't switch off, working themselves thin; magnetic, center of every room; … a real fan, plans around games mood lately." Nine temperament phrases where the sentence expects one mood (`selectProvocation`, question bank). The wake still answered in voice. Recorded; not fixed.

### G-EC55 — A citizen dry run is not fully dry: it appends to the offered-neighbours log [silent-fail] [wakes] [LOW] (engine-sheet, 2026-11-13)
`scripts/citizen-wake.js --dry-run` reaches the `OFFERED_FILE` append (the block that records what the wake put in front of the citizen) before the dry-run exit, and writes its own log. Seven lines from the 2026-11-13 boot test (lines 274–280, daypart `evening`, POP-00158, POP-00790, POP-00034, POP-00001 ×4) sit beside eight older `evening` lines from earlier dry runs. Reader: `scripts/extractBondsFromWakes.js` (hand-run, keyed citizen|Cycle|daypart); scheduled wakes write morning / midday / night, so the lines match no page. No page, sheet or canon write. Lines left in place. Later runs in the same test were made under a write guard that refused the append. Fix is one guard on the append; not made here. Builder 2026-11-13: "if dry runs leak but are in the current cycle and is relevant to the sim it can stay" — the lines stay.

### G-EC56 — The police chief is not handed his own tab's response times or clearance rates [judgment] [civic] [MED] (engine-sheet, 2026-11-13)
`Crime_Metrics` carries `ResponseTimeAvg` and `ClearanceRate` per neighborhood (C115: San Antonio 11.7 / 0.25, Fruitvale 10.7 / 0.18). The chief's weekday pack (`buildCivicOfficeSlice.js` `buildPack`, agentDir `civic-office-police-chief`) contains neither field. In the 2026-11-13 ask dry run a District 3 question on the response-time gap between the two got "the export doesn't carry a response-time field at all" and a promised records pull, three times of three. `Judicial_Ledger` holds 0 rows, so no incident-level record exists for that pull. Recorded for pipeline.110 Task 9; nothing changed.

### G-EC57 — Two office holders' role on the citizen ledger disagrees with the office sheet [judgment] [civic] [LOW] (engine-sheet, 2026-11-13)
Live read 2026-11-13: `Civic_Office_Ledger` STAFF-DM-ECON Marcus Osei (POP-00036) is Deputy Mayor (Econ Dev); `Simulation_Ledger.RoleType` reads "City Council Member". COUNCIL-D4 Ramon Vega (POP-00042): `RoleType` "City Council President - D1". Carter, Rivers and Crane read "City Council Member" with no district; Delgado "City Council District - D3". All 39 positions are otherwise on the ledger, Active, CIV yes. The daily wake's sheet line prints `RoleType`. Not edited; the builder's call.

### G-EC58 — Chaos-car events reach an office by place only; no worker receives the events of its own trade [judgment] [civic] [MED] (engine-sheet, 2026-11-13)
`buildCivicOfficeSlice.js` `loadCycleEvents` admits a chaos row only when its text names a hood on the seat's turf; the work wake has no event node. C113–C115 world summaries: 30 events; six council packs carried one, all by place; 2 cop cars, 2 OARI vans and 2 ambulances reached neither the police chief, the OARI director nor the EMS director as theirs; 13 business-targeted and 4 citizen-targeted events name no hood and reached no office. Routing by kind proposed in `docs/reference/AGENT_BOOT_TEMPLATES.md` §3.2; nothing changed.
