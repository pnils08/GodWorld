# /run-cycle Gap Log — Cycle 114

**Generated:** 2026-11-01T22:53:42.529Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 3 MED / 14 LOW patterns flagged by engineAuditor; 14 improvements; 0 incoherence findings. Pattern types: math-imbalance=2, coverage-gap=1, cascade-failure=1, improvement=14.

**Mechanical pass:** 28 entries (HIGH 1, MED 16, LOW 10). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Rockridge: decay [Sentiment -0.030, RetailVitality -2.16, HousingPressure +1.000] — Sentiment now 0.03 (17 of 22, city median 0.085); Retail [mechanical] [math-anomaly] [HIGH]

- **Source:** output/engine_audit_c114.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 8 • Fields: Neighborhood="Rockridge", decaySignals=["Sentiment -0.030","RetailVitality -2.16","HousingPressure +1.000"], standing={"Sentiment":{"current":0.03,"rank":17,"of":22,"cityMedian":0.085},"RetailVitality":{"current":10.98,"rank":8,"of":22,"cityMedian":8.265},"HousingPressure":{"current":5,"rank":17,"of":22,"cityMedian":0}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Rockridge
- **Status:** OPEN

### G-EC2 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c114.json (pattern type=coverage-gap)
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

### G-EC17 — Laurel: decay [Sentiment -0.030, RetailVitality -3.00] — Sentiment now -0.03 (20 of 22, city median 0.085); RetailVitality now 4.34 (22 of 2 [mechanical] [math-anomaly] [MED]

- **Source:** output/engine_audit_c114.json (pattern type=math-imbalance)
- **Diagnosis:** Sheet: `Neighborhood_Map` • Rows: 4 • Fields: Neighborhood="Laurel", decaySignals=["Sentiment -0.030","RetailVitality -3.00"], standing={"Sentiment":{"current":-0.03,"rank":20,"of":22,"cityMedian":0.085},"RetailVitality":{"current":4.34,"rank":22,"of":22,"cityMedian":8.265}}, matchingActiveInitiatives=[] • Mitigator: none (no-mitigator) • Affected: nbhd=Laurel
- **Status:** OPEN

### G-EC18 — generationalEventsEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC19 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC20 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC21 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC22 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC23 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC24 — runCareerEngine.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC25 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC26 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC27 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC28 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC29 — Prior cycle's gap log (C113) had 45 entries — manual review for repeats recommended [mechanical] [cross-cycle-debt] [INFO]

- **Diagnosis:** Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c113_gaps.md OPEN entries and flag any that recur in this cycle's findings.
- **Status:** OPEN

### G-EC30 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC31 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC32 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->

## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*


### G-EC33 — run-cycle chain called locked skills; 50 SKILL.md carried disable-model-invocation since c5d6ebd43 [judgment] [process] [HIGH]
- Steps 1/2/4/5 of /run-cycle name skills the Skill tool refused to load. Prior sessions ran the underlying scripts by hand; es did not write the C114 review. Builder: "Take all the locks off." Flag off in all 50 (cbeddf759). Review write-up for C114 landed 16:24, ~55 min after the fire.
- **Status:** CLOSED (cbeddf759)

### G-EC34 — Civis journal C114: two runs, no entry [judgment] [civis-journal] [MED]
- Run 1: Sonnet returned prose not JSON (`Unexpected token 'L', "Last week "…`); reasoner fallback 309 words, failed "one lead and two or three carried findings". Run 2 (permitted re-run): Sonnet failed "private identifier or machine vocabulary in prose"; fallback 188 words, same structure failure. No journal this week; no files; delivery sends nothing for C114.
- Pattern: Sonnet route has not passed the prose gate in either run; the structural assertion ("one lead + 2–3 carried") fails on both routes. Prompt/assertion mismatch candidate, not a data fault.
- **Status:** OPEN (pipeline.68)

### G-EC35 — Anomalies POP-01223 / POP-01224 income ×45 / ×14 routed to engine-debug [judgment] [anomaly] [MED]
- Oaks 2nd-round picks promoted Tier 4 C113; income 100000 → 4.5M / 1.4M at C114. Builder: salaries set by hand (rookie contracts). World event. Detector flagged correctly — Simulation_Ledger income is outside the Step 2.5 hand-write tabs, so a builder sheet write there always reads as an anomaly.
- **Status:** CLOSED (builder ruling 2026-11-01)

### G-EC36 — Citizen scoreboard: 6 outcomes / 2528 lines; 0 married, 0 promoted, 0 laid off [judgment] [dice] [MED]
- 1 born, 3 hired, 1 bought, 1 sold. 8 tier-ups, 5 of them journalists. Second quiet life-week read; rate/severity are the builder's dials. Recorded, not tuned.
- **Status:** OPEN (builder)

### G-EC37 — Auditor emits the EventAttractiveness overshoot measurement twice in patterns[] [judgment] [auditor] [LOW]
- Two identical `improvement` entries ("Remedy overshot expectation on Neighborhood_Map.EventAttractiveness: observed 0.24 (expected 0.02)"). Counted twice in summary.improvements (14 → 13 distinct). engineAuditor measureRemedies 1.0.0.
- **Status:** OPEN

### G-EC38 — Step 2.5 pre-fire hand-write cell list not on disk [judgment] [process] [LOW]
- es's record says the pre-fire check ran; no output file. Post-fire check against the C114 close: 0/0/0 + 0 tracker moves. If a pre-fire cell list existed it is unrecoverable; C114 briefs carry no artifact from the three covered tabs.
- **Status:** CLOSED (unrecoverable; no artifact found)

### G-EC39 — DEPLOY_HISTORY §PROD tops at stage 36; C114 fired on stage 37 (@173, transit reader) [judgment] [docs] [LOW]
- Entry owed (NEXT[research-build], 18cc893df).
- **Status:** OPEN

### G-EC40 — buildNeighborhoodTexture warned "Rockridge: possible metric/system-word leak" [judgment] [texture] [LOW]
- Block reads: "retail strip is bustling … BART delays … New residents from Downtown". No metric word present; "retail" trips the blocklist. False positive; block shipped as written.
- **Status:** CLOSED (false positive)

### G-EC41 — Content drafter wrote 10 rows Active=yes (auth:auto) [judgment] [content-ledger] [INFO]
- 7 lines + 2 fragments + 1 line across Fruitvale, West Oakland, Temescal, Jack London, Brooklyn, Downtown, KONO, Rockridge. Readback verified. Builder kill switch: Active=no in-sheet.
- **Status:** CLOSED

## Triage 2026-11-01 (research-build) — all 41 checked

Read against engine code and live sheet headers. No code or sheet changed. Sits below the mechanical marker, so a re-run keeps it. Split: 9 judgment (G-EC33–41), 32 mechanical (G-EC1–32).

**Judgment 9**
- Closed 5: G-EC33, 35, 38, 40, 41.
- Open 4: G-EC34 Civis journal; G-EC36 life outcomes (builder dials); G-EC37 double count (detectImprovements emits the same remedy twice, 14 → 13); G-EC39 DEPLOY_HISTORY stage 37.
- G-EC34 owner: its `pipeline.68` tag is the withdrawn roster row (ROLLOUT_ARCHIVE), not the journal. No live row owns it. Failed drafts go to stderr only; none on disk.

**Mechanical 32**
- No defect, 24 (header-drift, 21 repeat C110–C114, 3 repeat C112–C114):
  - Scanner read the wrong tab, 9. G-EC3–5: reads are WorldEvents_V3_Ledger, which has Cycle/Domain/Severity. G-EC13–16: `headers` is the ledger's (processAdvancementIntake), not Economic_Parameters. G-EC22–23: Citizen_Media_Usage has UsageType/Context.
  - Fallback resolves, 13. G-EC6, 9 (First + Last); G-EC7 (POPID); G-EC8 (row-based ID, Generic_Citizens has no ID column); G-EC12 (SuggestedJournalist, and loadCycleCadence_ has no live caller); G-EC18, 19, 20, 21, 24, 25, 26, 27.
  - Column absent, write skipped, 2. G-EC10–11: Cultural_Ledger has no LastSeenHoliday/CalendarContext; noted in culturalLedger.js engine.314.
- Boilerplate, 5. G-EC28, 30, 31, 32: text says the execution log is not captured; output/execution_log_c114.txt is on disk (Step 3.5). The detectors behind them are unbuilt. G-EC29: repeat check, done here.
- Open, 3:
  - G-EC2 faith: repeats every cycle and cannot clear. Exactly 5 faith events per cycle; Edition_Coverage_Ratings has no faith Domain and DOMAIN_TRACKER_COLUMNS has no FAITH. Elliot Graye filed C110–C113, ranked each cycle, selected 0 of 9 each time.
  - G-EC1 Rockridge: new this cycle. Retail 13.14 → 10.98 (8 of 22, above median 8.265). Packet hood line: street trade busy; trajectory growth. Same dip C111 (13.08 → 10.2), back to 12.61 C112. The flag is a one-week compare; 3 signals with no initiative = HIGH, which made it Decision 1 in the District 7 packet.
  - G-EC17 Laurel: new this cycle. Retail 7.34 → 4.34 (22 of 22). D9 packet showed street trade struggling; the seat declined to act (voices_c114). A seat can file under economic ($2M–$50M), but economic is playable:false: 2026-09-21 bench found no effect beyond noise. No live row for engine.252.
  - Decay flags C108–C114: 53, 9 HIGH, 21 of 22 hoods at least once. All one-week compares.
  - Builder 2026-11-01: a city program does not answer a one-week fall; Laurel is up to civic. Status of G-EC1 and G-EC17 waits on his ruling.
  - Packet pressure C114: "Crisis:" label in 15 of 15 packets (C113 15, C112 14), unconditional on the seat's lowest-mood hood; Fruitvale and West Oakland carried it at mood clearly upbeat, trade busy, crime low. "charged for" in 8, "visibly declining" in 3. Crisis label dates 2026-07-29, charged line 2026-08-13; both predate the 2026-09-23 direction. Builder 2026-11-01: the D9 seat was smarter than the packet; the packet forces a struggling city. Removed on his go after Codex review; first live packets C115 (civic.47 Changelog).

## LEG: /city-hall (G-R)

- G-R (AUTO): sanity-read FAIL-SCOPED — INIT-005, INIT-008 excluded from the write, rest applied — see output/cron-civic/gate_c114.json

## engine-sheet: engine.330 sandbox observations (2026-11-05)

- G-ES1 sports feed: a blank EventTrigger or PlayerMood keeps the team's last non-blank value (`reduceFeedTeamState_`, `applySportsSeason.js:1098-1099`), and `processFeedSheet_` fires it again whenever the team has a row for the Cycle (`:1018-1051`). A `championship` or `confident` cell re-fires every later week until a row overwrites it. Live hand rows leave both blank. Not fixed (engine code, outside engine.330); the seeder writes `none` / `quiet`.
- G-ES2 media-feedback seeds: `applyStorySeeds.js:1307-1320` builds a "Citywide reaction" seed for every coverage domain at |rating| ≥ 3. Live Story_Seed_Deck has 0 such rows ever; the seeded sandbox fire (ECONOMIC +3, ENVIRONMENT +5) also wrote 0. Path from `seeds` to the deck not traced.
- Builder 2026-11-05 on G-ES1 (now engine.331): "the issue is there aren't any triggers that aren't "in-season" and there isn't much variety , not sure if all need a trigger but if they do there really isn't anything for the oaks off season decisions, and a team is either hot or cold when winning or losing 1 game wouldn't be either . So have ing some more variety on positive and negative type triggers."
- Builder 2026-11-05 on G-ES2 (now engine.332): "great catch excited to fix this"
- G-RB3 (research-build 2026-11-05, research.32): Vinnie Keane POP-00001 — the C114 feed says he is stepping away ("Vinnie Keane made it clear"); his ledger Status is Active and no engine phase writes Status Retired or a [Retirement] LifeHistory line (43 Retired rows were minted so). The wake loop would perceive [Retirement] if written (wakePerception.js:758,828). Not hand-edited. Builder 2026-11-05: "Vinnie would still need to have his press conference" → engine.333.
- G-RB4 (research-build 2026-11-05, research.32): the Discord talk recorder wrote Vinnie's conversational hedge onto his page as a TENSION ("one more run, or step away for good?", cp-POP-00001-c114-DISCORD-tension) and the voice now reads it back; it feeds reflections and his container. Design question for the builder: should a talk's hedge be a page tension at all.
- Builder 2026-11-05 on G-RB4: "Yeah I like it how it is, and yes my input goes to Paulson in both [Vinnie] and Mags chats" → the talk recorder stays as built (a talk can open a page tension; the builder's lines go to Paulson's row + the bond in both channels). Closed.
- G-ES3 (engine-sheet 2026-11-05, engine.331 trace): the C114 sports Story_Seed_Deck row (SeedID fd4277fa) reads `What: sentiment +36.06 (4 related effects)` — the seed builder summed magnitudes across effect types (sentiment 0.006 + aftermath 0.052 + game-night 35 citizens + household 1). Not in engine.331; `buildContractSeeds.js` clustering, path not traced.
- engine.331 trace (2026-11-05): engine-sheet read + codex independent trace (`docs/research/2026-11-05-codex-engine331-trigger-trace.md`) agree. Added by codex, verified: carried trigger labels also reach Ripple_Ledger CauseDetail → Story_Seed_Deck `Why` → world summary "What Moved" (C114: "A's W3 [player-energy]; A's W3 [hot-streak]; Oaks W2 [hot-streak]"); `none` is the only cell value that stops the carry and the dashboard rejects it (not in SAFE_ENUMS), so a dashboard-entered row cannot clear a trigger.
- G-ES4 (engine-sheet 2026-11-05, engine.331 Q3 read): `gameNightBucket_` (`applyGameNightMoments.js:64-71`) matches moods `confident|energized|high` and `frustrat|low|tense`; the PlayerMood dropdown (`setupSportsFeedValidation.js:116-127`) offers confident, frustrated, hungry, reflective, dominant, uncertain, locked-in, quiet, electric. Only confident and frustrated move a game-night line; the other seven fall to neutral (they still reach the wake text and the newsroom). Not engine.331; no row filed.
- G-ES4 update (2026-11-06): builder pulled it into engine.331 — "handle the dropdowm moods add to the night line" (plan Mechanism 8).
- G-ES5 (engine-sheet 2026-11-06, engine.331 bench): the city's game-night lines (generateCitizensEvents gnTexts, engine.47 Hop 4) carry no sign tag, so engine.299's admission gate dropped every one unwritten. Live LifeHistory_Log: 37–74 a Cycle at C105–C110, 0 at C112–C114 though the Oaks played all three. Fixed inside engine.331 (the builder's cold set cannot reach fans otherwise): win night dial:fandom:up, loss night dial:fandom:down, neutral unsigned. Households (Household-GameNight) write but the tag is in no dial map — they move nothing; not changed here.
- G-RB5 (research-build 2026-11-07, engine.333 Task 2a): `applyMilestone_` (`generationalEventsEngine.js:1762`) stamps the ledger LifeHistory line `C<n>` (ES-1 S264) while its own LifeHistory_Log row and every other writer stamp `Y<y>C<c>` (`inWorldStamp_` = `S.cycleRef`); live POP-00366 C113: line `C113 — [Retirement] …`, log `Y3C9`. The owed-wake pin matched one spelling and never the engine's milestones — the dry replay reported the retiree "no matching life line". Fixed on the wake side (a milestone pin carries both stamps). Engine-side normalisation of the milestone stamp is a candidate row, not engine.333's.
- G-RB6 (research-build 2026-11-07, codex review of engine.333 2a): `lib/wakePerception.test.js` page-writer cases (`:607-629`) stub `fetch` and `getRawSheetData`, but `lib/citizenPage.js:183-189` calls `recordFamilyMentions_`, which reads `Generic_Citizens` through Sheets (`:104-109`) — the broad test attempts OAuth and logs DNS failures while every assertion passes. Pre-existing, not engine.333's diff; the new `wakeOwedMilestone.test.js` is injected-only. Candidate: stub that read in the test, or run the file with network blocked in `run-tests.js`.
- G-ES6 (engine-sheet 2026-11-07, engine.331 Task 8 dashboard receipt): the dashboard's sports workspace and preview return 500 on live — `scripts/sportsWorkspaceProjection.js:22,34,70` require the `As_Roster` header `POPID, First, Middle, Last, …` (26 columns, contract since `b8028b5db` 2026-08-05), and live `As_Roster` reads 25 columns with no `Middle` (91 rows). No engine phase reads `As_Roster`; only the dashboard's sports page and its write path stop. Validation itself is current after the restart (preview rejects `hot-streak` at 422 before the data load; `SAFE_ENUMS.EventTrigger` = the 39 ruled words). When the column left live is not on record (dashboard-error.log holds only today's two hits; older log rotated 09-06). Candidate row: reconcile the projection with the live roster header, or restore the column — builder's call which.
- G-ES7 (engine-sheet 2026-11-07, engine.331 bench 3): the game-night Ripple rows name the first game row's streak (`generateCitizensEvents.js` causeDetail, `runHouseholdEngine.js:635`), so a 2-0 week ending W5 reads "(streak W4)" while the bucket is the week's `winStreak` and the hook says W5. Pre-existing (engine.204/205 "the first game row names the night"); the label reaches Story_Seed_Deck through Ripple `CauseDetail`. Candidate: name the week's last streak (`S.sportsWeek[team].streak`).
- Builder 2026-11-07 on engine.331 Q5 (should families watching at home also move the fan dial, on top of family?): "1. Yes" → engine.335. Today `Household-GameNight` strips to `Household` (family +5, engine.299 suffix rule, `citizenDialMap.js:97,301`); the build signs fandom by the night's bucket as the city's fan lines do (win / winStreak up, loss / coldStreak down).
- G-ES6 update (2026-11-07): the builder put `Middle` back on live `As_Roster` (26 columns, aligned, read back). The dashboard still 500s: live `Oaks_Roster` is a newer layout (`POPID, First, Last, Tier, Position, Team, Salary, MIN, PTS, REB, AST, STL, BLK, TO, FG%, FGA, 3P%, 3PA`), the contract (`sportsWorkspaceProjection.js` ROSTER_SCHEMAS.oaks) still wants `Middle` + `PPG, ASST, REB, STL, FG%, 3P%`, and the stat write maps go by fixed column index — the strict header check is what keeps a write off the wrong column. Fix is code (contract + stat maps follow the live layout), not the sheet.
- G-ES6 → pipeline.102 (builder 2026-11-07: "Yes address the oaks dashboard"). Cut: Oaks contract = the live 18 headers (no Middle; MIN PTS REB AST STL BLK TO FG% FGA 3P% 3PA at H–R, all eleven editable — no derived stat); identity cells by header on both tabs (projection + writer), stats stay by column (As_Roster has two SO); pin: every stat field's header = the schema header at its index and letter. Left alone: live `-` cells (Coen FGA / 3P% / 3PA, Trevor 3P% / 3PA) fail a stat-capture's before-check — the write route is feature-gated off; the blank-POPID row warns (design).
- pipeline.102 codex diff review HOLD (2026-11-07) → F1 (percent points written as a fraction: 51.5 → 0.515, read-back passed it) and F2 (`-` cells blocked the whole stat form and a `-` → value edit) verified and fixed in place; the `-` note in the cut line above is superseded. Dashboard dist rebuilt (also carries pipeline.90's COSTS tab commits of 10-28, archived).
- pipeline.102 live (2026-11-07 ~03:10 CST, dashboard restarted on `a68a72d4b`): workspace 200 for both teams — A's 91 rows (Vinnie Keane, Designated Hitter), Oaks 11 rows with the eleven live stat fields (POP-01224 C, PTS 4.3, FG% 60.0, 3P% `-`); one expected warning (Oaks row 12, blank POPID); trigger options = the 39 ruled words; preview `re-signed` 200, `hot-streak` 422. G-ES6 closed.
- G-RB7 (research-build 2026-11-07, engine.333 bench C115): the retired player, now an ENGINE / Active row with EmployerBizId still the A's (BIZ-00005), drew an Occupation `[Work]` texture line the same Cycle ("drank the free cold brew in the company kitchen…", `generateCitizensEvents.js` occupation source) — generic, not a ballplayer's shift, because RoleType reads `Former …`. His employer of record is still the club until the builder's next-chapter row (intake / owner door / roster) sets the new one; until then the work texture treats him as club staff. Design as ruled (C4: employer kept); recorded so the first live week's lines are read with this in mind.
- G-RB8 (research-build 2026-11-07, codex engine.333 engine-cut review F2): three live ledger rows sit half on the sports layer — POP-00508 Freddie Silecki, POP-00509 Johhny Necklar, POP-00510 Billy Storip (MUBA Hall-of-Famers): ClockMode ENGINE, EconomicProfileKey `SPORTS_OVERRIDE`, Status Retired. `isSportsLayerRow_` reads the key, so the wealth, career-stage and pool skips still treat them as athletes though they are off the clock. engine.333's retirement now flips only a GAME-clock Active row, so they are safe from a false re-retirement; the half state itself is not this job's (rule 4: no hand edit) — a candidate row to settle what key an off-clock retired athlete carries.
- G-ES8 (engine-sheet 2026-11-07, engine.332 trace): `scripts/draftContentRows.js:289` turns any major COMMUNITY Story_Seed_Deck row into a "counted the moving trucks" line (`nbhdState.turnover`, conditions `hood=<seed hood>; displacement>=4`), reading COMMUNITY as displacement. The merged citywide edition-coverage row is COMMUNITY major most Cycles, and engine.332's coverage reactions for CULTURE / COMMUNITY / EDUCATION / ENVIRONMENT land COMMUNITY major too, all with hood `Citywide`. Whether the `hood=Citywide` condition ever matches is not traced. Not fixed (outside engine.332).
  - Traced 2026-11-07 (engine-sheet, before engine.335): inert on live. The rule is `draftStub` (`--backend stub`, tests and offline only); `/run-cycle` Step 5.6 runs the default `openrouter` backend (`draftContentRows.js:78,449`). On the stub path the Citywide gate is rejected before write: `canonizeHood('Citywide', hoods)` and `normalizeHoodGate('hood=Citywide; displacement>=4', hoods)` both return null (`:453-464`, "dead hood gate"). Nothing to build. Watch: C115's COMMUNITY +3 reaction seed (Tamsin Pruitt's Lives, rated C114) is in the facts the LLM drafter reads at Step 5.6; read that draft report.
- G-ES9 (engine-sheet 2026-11-07, C114 corrections re-file): Supermemory `POST /v3/documents` under an existing customId does not replace the content; it appends it as a revision (`latestRevision` 2, content = old text + new text, `dreamingStatus` dreaming). Identical content is a no-op (the 16:00 sweep left the untouched C114 docs at revision 1). So `cron-saturday-run.js` stepSweep's "idempotent via customId upsert" (`:257`, `postDocument :300`) holds only for unchanged text; any changed article re-posted under its id would carry both versions in canon. Full replace is `PATCH /v3/documents/{id}` (Supermemory docs, "Replace entire document"). Not fixed (outside the job); used PATCH for the seven builder-ordered corrections (`output/engine-sheet/2026-11-07-c114-refile-corrections.js --replace`). Read back 2026-11-07 17:59 CST: all seven at revision 3, content = the corrected reader copy exactly (`output/corrections/c114/verify.txt`; the PATCH applies a moment after its 200, so the script's own immediate read-back in `replace-log.json` still saw the old content).
- G-ES10 (engine-sheet 2026-11-07, C114 notebook swap): the permanent notebook's C114 edition (printed text) swapped for a corrected copy on the builder's word — `docs/reference/NotebookLM.md` §Change log 2026-11-07. The NotebookLM canon-source validator's default inventory is stale (2026-10-18) and the policy lists lore `3824b8b0-…` that is no longer in the notebook (strict check fails before and after the swap). Not fixed (outside the job). Corrected the same evening: the canon search scopes to that stale inventory (no validator), 22 live sources out of search → pipeline.103 (builder: next session first).
- C114 fix-file open items (2026-11-07): the builder fixed by hand the three items the fix file left open — Darrin Davis DH vs left fielder, Tanya Cruz's draft (Morton's mom in the Dimond, Mesa's pronoun), Ellis's WAR typed "3,7" on As_Roster. Not touched by engine-sheet.
- G-ES11 (engine-sheet 2026-11-08, lore gate hand-run, pipeline.105): ledger birthplace vs the player TrueSource card. Martin Richards POP-00031: ledger `originCity` Oakland + bio "Oakland native"; card and Edition 83 say born Maryland — builder 11-08: the card is right, the ledger origin is wrong. Henry Rivas POP-00024: `originCity` Puerto Rico matches the card; the bio line "Oakland native" is wrong (builder 11-08). Builder plans a Claude Duet pass of every player's ledger origin against the card's birthplace (its findings are leads). No ledger edit made here (Rule 4). Same run: the lore writer did not invent Richards' Oakland origin — its first call was `query_ledger citizen POP-00031`; its `search_articles` returns 68 of 82 hits and missed Edition 83's Maryland line, and it cannot reach `archive/non-articles/data/` cards. Writer = Gemini `gemini-3.7-flash`, no thinking config set; upstream Doriandarko/gemini-writer (unchanged since its 2025-12-24 init, = our copy) sets `thinking_level` HIGH. Grades: `output/lore-quarantine/grades/2026-11-08-*.json`.
- G-ES12 (engine-sheet 2026-11-08, lore gate ruling for pipeline.105): builder verbatim, on whether invented detail no record contradicts (the mayor's degree field, career path, an office floor) fails: "Nothing about a citizen is private and we only gate 4th wall like , sim , made up , fake ,etc". Same session the builder still had record contradictions repaired before canon (Rivas, Ramos, Richards rewrite, the mayor's five record errors). Reading for the automatic gate: color and citizen detail pass; a claim the record contradicts is repaired; fourth-wall language blocks. Re-read the verbatim before building.
- G-ES13 (engine-sheet 2026-11-08, engine.334 read-before, Story_Seed_Deck wiring card): STUB_REVERSE lists no Story_Seed_Deck writer (misses `saveV3Seeds.js:136` intent and the migrator's direct writes `:74`, `:84`); SHEETS_MANIFEST §9 has no row for those, `cycleRollback.js:143`, `citizen-signal-detector.js:231,238` or `routePatternSeeds.js:699,706`; the two scripts write positionally to the v3 header (`SeedType`) and their own guards throw on the v4 deck. `compileHandoff.js:300-325` reads v3 `SeedType`/`Priority`/`SeedText`, absent on v4, so every row drops. Not engine.334; filed 2026-11-08 as engine.341.
- G-ES14 (engine-sheet 2026-11-08, engine.334 replay check): a Story_Seed_Deck SeedID made of digits-e-digits (an 8-char hex hash such as `97e00012`) is stored by the sheet as a number — the C113 row exports as `9.70E+13` — so the seed's id is lost to anything that keys on it (`/sift` stamps `seedId`). Writer `saveV3Seeds.js:114-133` appends the raw string. Not engine.334; filed 2026-11-08 as engine.340.
