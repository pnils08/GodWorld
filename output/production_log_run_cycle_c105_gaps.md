# /run-cycle Gap Log — Cycle 105

**Generated:** 2026-08-31T06:20:55.054Z
**Script:** `scripts/engineCycleAudit.js` (mechanical V1)
**Plan:** `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md`

**Cycle headline metrics:** 1 HIGH / 3 MED / 26 LOW patterns flagged by engineAuditor; 26 improvements; 1 incoherence findings. Pattern types: repeating-event=1, coverage-gap=1, production-imbalance=1, improvement=26, incoherence=1.

**Mechanical pass:** 52 entries (HIGH 0, MED 41, LOW 11). 4 V2-runtime classes appended below.

**Taxonomy** (9 classes): `phase-skip` `writeback-drift` `cohort-collision` `math-anomaly` `determinism-break` `phase-ordering` `silent-fail` `cross-cycle-debt` `header-drift`.

---

### G-EC1 — Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle [mechanical] [coverage-gap] [MED]

- **Source:** output/engine_audit_c105.json (pattern type=coverage-gap)
- **Diagnosis:** Sheet: `WorldEvents_V3_Ledger` • Fields: domain="faith", eventCount=5, priorCycleCoverage=0, subCheck="production-without-consumption" • Mitigator: none (no-mitigator)
- **Status:** OPEN

### G-EC2 — generationalEventsEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase04-events/generationalEventsEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Family_Relationships, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC3 — generateMonthlyCivicSweep.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generateMonthlyCivicSweep.js
- **Diagnosis:** Type 2. Writer touches Simulation_Ledger, World_Population, Civic_Sweep_Report. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC4 — generationalWealthEngine.js references field-name 'InheritanceCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generationalWealthEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Business_Ledger, Family_Relationships, Heritage_Ledger, Simulation_Ledger. 'InheritanceCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC5 — generationalWealthEngine.js references field-name 'InheritanceFrom' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generationalWealthEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Business_Ledger, Family_Relationships, Heritage_Ledger, Simulation_Ledger. 'InheritanceFrom' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC6 — generationalWealthEngine.js references field-name 'InheritanceNote' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/generationalWealthEngine.js
- **Diagnosis:** Type 2. Writer touches Household_Ledger, Business_Ledger, Family_Relationships, Heritage_Ledger, Simulation_Ledger. 'InheritanceNote' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC7 — runCareerEngine.js references field-name 'TierRole' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCareerEngine.js
- **Diagnosis:** Type 2. Writer touches Business_Ledger, Simulation_Ledger. 'TierRole' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC8 — runCivicRoleEngine.js field 'TierRole' not on 'Simulation_Ledger' or any sheet [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runCivicRoleEngine.js
- **Diagnosis:** Type 2 (orphan literal). Writer targets 'Simulation_Ledger'; 'TierRole' is absent from that sheet and from all other sheets in SCHEMA_HEADERS. Defensive-fallback literal, dead code, or typo.
- **Status:** OPEN

### G-EC9 — runYouthEngine.js case-mismatch (multi-sheet): 'PopID' vs live As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Civic_Office_Ledger:'PopId' [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2 (case mismatch, multi-sheet). Writer touches multiple sheets: Community_Programs, Generic_Citizens, Simulation_Ledger. Case-variant of 'PopID' exists on: As_Roster:'POPID', Bay_Tribune_Oakland:'POPID', Civic_Office_Ledger:'PopId'. `headers.indexOf` is case-sensitive — confirm which sheet the literal targets and whether the case is correct.
- **Status:** OPEN

### G-EC10 — runYouthEngine.js references field-name 'ID' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/runYouthEngine.js
- **Diagnosis:** Type 2. Writer touches Community_Programs, Generic_Citizens, Simulation_Ledger. 'ID' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC11 — updateCivicApprovalRatings.js references field-name 'FullName' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2. Writer touches Civic_Office_Ledger, Initiative_Tracker, Generic_Citizens, Simulation_Ledger. 'FullName' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC12 — processArcLifeCyclev1.js references field-name 'InvolvedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/processArcLifeCyclev1.js
- **Diagnosis:** Type 2. Writer touches World_Population, Event_Arc_Ledger. 'InvolvedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC13 — storylineHealthEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC14 — storylineHealthEngine.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC15 — storylineHealthEngine.js references field-name 'CoverageGap' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CoverageGap' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC16 — storylineHealthEngine.js references field-name 'ResolutionCondition' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ResolutionCondition' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC17 — storylineHealthEngine.js references field-name 'StaleAfterCycles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'StaleAfterCycles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC18 — storylineHealthEngine.js references field-name 'IsStale' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'IsStale' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC19 — storylineHealthEngine.js references field-name 'WrapUpGenerated' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'WrapUpGenerated' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC20 — applyStorySeeds.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC21 — applyStorySeeds.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC22 — applyStorySeeds.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC23 — applyStorySeeds.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC24 — applyStorySeeds.js references field-name 'MentionCount' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/applyStorySeeds.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker, Edition_Coverage_Ratings. 'MentionCount' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC25 — culturalLedger.js references field-name 'LastSeenHoliday' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'LastSeenHoliday' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC26 — culturalLedger.js references field-name 'CalendarContext' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/culturalLedger.js
- **Diagnosis:** Type 2. Writer touches Cultural_Ledger, Simulation_Ledger. 'CalendarContext' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC27 — mediaRoomBriefingGenerator.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/mediaRoomBriefingGenerator.js
- **Diagnosis:** Type 2. Writer touches Media_Briefing, Storyline_Tracker, Civic_Office_Ledger, Election_Log. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC28 — mediaRoomBriefingGenerator.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/mediaRoomBriefingGenerator.js
- **Diagnosis:** Type 2. Writer touches Media_Briefing, Storyline_Tracker, Civic_Office_Ledger, Election_Log. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC29 — mediaRoomBriefingGenerator.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/mediaRoomBriefingGenerator.js
- **Diagnosis:** Type 2. Writer touches Media_Briefing, Storyline_Tracker, Civic_Office_Ledger, Election_Log. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC30 — storyHook.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storyHook.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC31 — storyHook.js references field-name 'StorylineType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storyHook.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'StorylineType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC32 — storyHook.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storyHook.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC33 — storylineWeavingEngine.js references field-name 'RelatedCitizens' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelatedCitizens' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC34 — storylineWeavingEngine.js references field-name 'CitizenRoles' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CitizenRoles' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC35 — storylineWeavingEngine.js references field-name 'ConflictType' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'ConflictType' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC36 — storylineWeavingEngine.js references field-name 'RelationshipImpact' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'RelationshipImpact' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC37 — storylineWeavingEngine.js references field-name 'CrossStorylineLinks' not in any live header [mechanical] [header-drift] [MED]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Type 2. Writer touches Storyline_Tracker. 'CrossStorylineLinks' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC38 — bylineEngine.js references field-name 'BylineCandidate' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'BylineCandidate' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC39 — bylineEngine.js references field-name 'AssignedReporter' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/bylineEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'AssignedReporter' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC40 — priorityEngine.js references field-name 'CycleAdded' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'CycleAdded' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC41 — priorityEngine.js references field-name 'LastCoverageCycle' not in any live header [mechanical] [header-drift] [MED]

- **Source:** utilities/priorityEngine.js
- **Diagnosis:** Type 2. Writer touches no detected sheet target. 'LastCoverageCycle' is absent from every sheet in SCHEMA_HEADERS. Defensive-fallback literal or dead code.
- **Status:** OPEN

### G-EC42 — bondEngine.js defensive-fallback literal 'NH' (sibling 'Neighborhood' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/bondEngine.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'NH' which has no exact live-header match, but a nearby sibling literal 'Neighborhood' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC43 — citizenContextBuilder.js defensive-fallback literal 'OriginCity' (sibling 'OrginCity' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'OriginCity' which has no exact live-header match, but a nearby sibling literal 'OrginCity' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC44 — citizenContextBuilder.js defensive-fallback literal 'EngineCycle' (sibling 'Cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'EngineCycle' which has no exact live-header match, but a nearby sibling literal 'Cycle' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC45 — citizenContextBuilder.js defensive-fallback literal 'UsageType' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'UsageType' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC46 — citizenContextBuilder.js defensive-fallback literal 'Context' (sibling 'Name' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/citizenContextBuilder.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'Context' which has no exact live-header match, but a nearby sibling literal 'Name' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC47 — updateCivicApprovalRatings.js defensive-fallback literal 'TierRole' (sibling 'RoleType' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase05-citizens/updateCivicApprovalRatings.js
- **Diagnosis:** Type 2 (defensive-fallback sibling, multi-sheet). Writer references 'TierRole' which has no exact live-header match, but a nearby sibling literal 'RoleType' exact-matches a live header on one of the writer's target sheets. Acceptable noise.
- **Status:** OPEN

### G-EC48 — storylineHealthEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase06-analysis/storylineHealthEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC49 — storyHook.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storyHook.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC50 — storylineWeavingEngine.js targets sheet 'Storyline_Tracker' not in SCHEMA_HEADERS [mechanical] [header-drift] [LOW]

- **Source:** phase07-evening-media/storylineWeavingEngine.js
- **Diagnosis:** Sheet 'Storyline_Tracker' referenced in writer but absent from schemas/SCHEMA_HEADERS.md. Sheet may be hidden (exportSchemaHeaders.js skips hidden tabs per utilities/exportSchemaHeaders.js:150), deleted, or renamed. Manual review.
- **Status:** OPEN

### G-EC51 — cycleExportAutomation.js defensive-fallback literal 'Cycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer's literal 'Cycle' has a case-variant 'cycle' on 'World_Population', AND a nearby sibling literal 'cycle' exact-matches the live header. The fallback chain handles both cases — 'Cycle' is defensive, not silent-fail. Acceptable noise; no fix needed.
- **Status:** OPEN

### G-EC52 — cycleExportAutomation.js defensive-fallback literal 'AbsoluteCycle' on 'World_Population' (sibling 'cycle' matches) [mechanical] [header-drift] [LOW]

- **Source:** phase10-persistence/cycleExportAutomation.js
- **Diagnosis:** Type 2 (defensive-fallback sibling). Writer targets 'World_Population'; 'AbsoluteCycle' isn't on it, but a nearby sibling literal 'cycle' exact-matches the live header. Acceptable noise.
- **Status:** OPEN

### G-EC53 — cohort-collision — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [cohort-collision] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC54 — phase-ordering — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-ordering] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC55 — phase-skip — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [phase-skip] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

### G-EC56 — silent-fail — V2-runtime (engine-run-log ingest path not yet built) [mechanical] [silent-fail] [INFO]

- **Diagnosis:** Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.
- **Status:** V2-PENDING

<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->
---

## LEG: /pre-flight (G-PF)

**Run:** 2026-08-30 (S403, engine-sheet) — `node scripts/preflightInputCheck.js --cycle=105`
**Verdict:** READY (with warnings), exit 0. C105 unfired at time of writing; live `cycleCount` 104.
**Total gaps:** 20 (8 HIGH / 11 MED / 1 LOW)

Pre-flight passed. The gaps below are what it *reported as warnings* or *did not look at* — in both cases the underlying condition is worse than the verdict line suggests.

## HIGH-severity gaps

### G-PF7: coverage ratings resolve every article to one wrong domain since the edition reformat

- **Severity:** HIGH
- **Category:** quiet-pipe
- **What happened:** `scripts/rateEditionCoverage.js --dry-run` against `editions/cycle_pulse_c104.txt` finds 7 articles and maps **all 7** to `(unknown)` section → COMMUNITY, emitting a single `COMMUNITY: 3 (7 articles)` rating and exiting 0. Sports (Anthony Raines, Tanya Cruz), faith (Sharon Okafor) and weather (Noah Tan) pieces are all labelled COMMUNITY. Cause: the C104 edition carries no section headers at all — `====` separators plus article titles and `## INTAKE` blocks — while the detector's three patterns (`SEP_HEADER_RE` / `MD_HEADER_RE` / `BARE_HEADER_RE`, `scripts/rateEditionCoverage.js:135-137`) each require a name from `SECTION_NAMES` on its own line. `currentSection` never promotes, so `section: currentSection || '(unknown)'` (`:194`) falls through for every article.
- **Why it matters:** This is the S196 G-P6 failure the script's own v2.1 header says it closed, recurring in a new shape. The v2.1 fail-loud gate (`:260`) guards **article count == 0** only; 7 articles with 0 resolved domains sails past it. The engine reads this channel through `applyEditionCoverageEffects_` to ripple media influence into domain dynamics — applying it would push a positive COMMUNITY signal and **zero** SPORTS/CIVIC/HEALTH signal into the world. `Edition_Coverage_Ratings` currently ends at C102 (77 rows); C103 and C104 have no rows, so nothing wrong has been written yet. Compounding: the script has **no cron line** — it is a manual step nobody has run since the edition format changed.
- **Suggested action:** promote to ROLLOUT. Two parts, and the order matters: (1) widen the gate so "articles found but 0 domains resolved" exits non-zero — the current gate cannot detect the exact failure it was written for; (2) decide the domain source for the new format. Section headers are gone, so either the edition regains them or the detector keys off reporter→domain (the reporter name is already parsed and is a reliable domain proxy — Raines/Cruz sports, Okafor faith, Navarro civic, Mezran health). Do NOT `--apply` until (2) lands.
- **Pointer:** pipeline.62

### G-PF8: the civic Sunday chain halts at mayor-open — city hall has not applied a decision since C104

- **Severity:** HIGH
- **Category:** pipeline-fragility
- **What happened:** Both of today's cron chains (14:30 and the 21:00 late retry, `logs/civic-cron.log`) ran directive → prep (16 packets, lint clean) → **HALT** at mayor-open: `civic-office-mayor attempt 1/2 call failed: mistralai/mistral-large: Provider returned error`. Probed directly against OpenRouter: the model resolves and is listed, and returns **HTTP 429** — `"mistralai/mistral-large is temporarily rate-limited upstream … limit_source: upstream_provider_shared_pool"`. So this is a shared-free-pool throttle, not a dead or renamed model. The mayor seat is configured at `scripts/civic-office-map.json:36`; the caller makes 2 attempts back-to-back (~0.4s apart, per the log timestamps) with no backoff and no fallback seat.
- **Why it matters:** `HALT: Hearing must not start` is correct by design — a hearing without the mayor opening it would be canon garbage — but it makes one rate-limited third-party model a hard stop on the entire civic chain. Downstream: `output/cron-civic/close_c104.json` stays `applied:false`, so the C104 decisions staged on 2026-08-29 never write back, and `Initiative_Tracker` rows INIT-001 / INIT-005 / INIT-007 sit at `NextActionCycle=C104` — which is precisely the "3 past-due" warning pre-flight reports without being able to explain. Two retries 0.4s apart cannot clear a shared-pool 429; the retry policy guarantees the halt rather than surviving it.
- **Suggested action:** promote to ROLLOUT (civic group). Minimum viable: a fallback seat for mayor-open plus real backoff, and unwrap the provider error so the log prints the 429 and the remedy instead of collapsing to "Provider returned error" — two weeks of that string reads like a dead model, not a throttle.
- **Pointer:** civic.26

### G-PF13: `--step=x` silently ran the ENTIRE Saturday chain, publish included

- **Severity:** HIGH
- **Category:** pipeline-fragility
- **What happened:** `arg()` in `scripts/cron-saturday-run.js` read only the spaced form (`indexOf(flag)` then `argv[i+1]`). An `=`-joined flag matched nothing and returned the default — and the default for `--step` is "run every step". Hit live this session: `--step=coverage --cycle=104`, intended as one isolated step, ran audit → curate → narrate → publish → coverage → sweep → sheets → signals. It was harmless only because `--apply` was absent.
- **Why it matters:** `--apply` on this script is the canon door — it ingests the edition and pushes to the permanent NotebookLM notebook. `--step=publish --apply`, a plausible thing to type, would have run the whole chain against live canon with no error and no warning. The two argument styles are used interchangeably across this repo's scripts (`cron-civic-run.js` documents `--stage=prep`), so the wrong one is the easy one to reach for.
- **Suggested action:** FIXED same session — `arg()` now accepts `--flag=value` and `--flag value`, verified on both forms. A flag this script gets wrong writes canon, so it takes both rather than failing on one.
- **Pointer:** pipeline.62

## MED-severity gaps

### G-PF9: pre-flight reports the symptom of a halted civic chain, never the cause

- **Severity:** MED
- **Category:** process-gap
- **What happened:** Pre-flight's Initiative_Tracker step surfaces `STALE: 3 row(s) with past-due NextActionCycle (city hall behind)` and stops there. It has no check on civic chain health — it does not read `output/cron-civic/close_c<XX>.json` for `applied:false`, does not read `gate_c<XX>.json` for `pass:false`, and does not look at `logs/civic-cron.log` for a HALT. The operator reads "READY (with warnings)" and moves on.
- **Why it matters:** The stale rows are a *consequence*; the halt is the *cause*. Answering "why is city hall behind?" today took reading the cron log, the close/gate JSON, and an OpenRouter probe — none of which pre-flight points at. That is the difference between a check that says "READY" and one that is doing all we need it to do.
- **Suggested action:** promote with G-PF7 under pipeline.62 — add a civic-chain-health step to `scripts/preflightInputCheck.js` reading the two JSONs (both already on disk, deterministic, no API call) and reporting `applied` / `gatePass` / last HALT line.

### G-PF10: the C104 apply is blocked twice over — the gate also fails on engine verbiage in canon

- **Severity:** MED
- **Category:** canon-risk
- **What happened:** `output/cron-civic/gate_c104.json` records `pass: false`, one failure: `engine-verbiage — council_d3: [metric-decimal] "0.42 sentiment"`. A council voice quoted a raw engine metric in canon text.
- **Why it matters:** Recorded separately from G-PF8 so it is not lost behind the 429 fix — **fixing mayor-open alone will not let C104 apply.** The gate correctly refuses it, and the canon-is-color rule is the reason: an article restating an engine number writes it into canon twice.
- **Suggested action:** already visible as the AUTO line in `output/production_log_run_cycle_c104_gaps.md`; keep in the civic.26 scope so the two blockers get cleared together.

### G-PF12: the coverage rater was a manual step, so it ran never

- **Severity:** MED
- **Category:** process-gap
- **What happened:** `scripts/rateEditionCoverage.js` had no crontab line and no caller. Nothing scheduled it, so `Edition_Coverage_Ratings` simply stopped at C102 and C103/C104 published carrying no media-feedback signal. Discovering it took running pre-flight by hand and chasing a warning.
- **Why it matters:** G-PF7 (the domain-resolution bug) would have stayed invisible regardless of the fix, because nothing was invoking the code that had the bug. A correct script nobody runs and a broken script nobody runs are the same artifact.
- **Suggested action:** FIXED same session — new `stepCoverage` in `cron-saturday-run.js`, running straight after `stepPublish` in the Saturday chain. Hung off the edition artifact rather than a second cron line so it cannot fire before the file exists or drift onto another cycle's edition. Deliberately **non-fatal**: publish has already ingested canon by that point, so a ratings failure must not strand sweep/sheets/signals — it logs `[COVERAGE FAIL]` loudly instead, and `preflightInputCheck.js` independently reports missing coverage for the previous cycle, so a silent miss is no longer possible the way it was for C103/C104.
- **Pointer:** pipeline.62

### G-PF14: `rateEditionCoverage.test.js` is intermittent under the full suite — needs a fresh look

- **Severity:** MED
- **Category:** pipeline-fragility
- **What happened:** The new test passes 16/16 every time in isolation (`node scripts/rateEditionCoverage.test.js`, ~10s), passes through the runner when filtered (`--filter=rateEditionCoverage`, 9.81s), and passes with the runner's own env (`GODWORLD_TEST_LIVE=0`). Under the full 190-file `npm test` it **failed twice and passed once** (the passing run logged `✓ … (11.63s)` with all 16 assertions ok). The runner uses `stdio: 'inherit'` and no per-test timeout, so on the failing runs the assertions themselves were not reported failing — the file exited non-zero without a visible assertion failure.
- **Why it matters:** Not a defect in the code under test — the rater is separately proven (C102 re-rates byte-identical to the old code; C103/C104 backfilled and verified live). But a flaky test is worse than no test: it trains the reader to ignore a red suite, and this suite already carries one permanently-red file (`djDirect`, missing C94 fixture), so a second intermittent one erodes the signal to nothing.
- **Suspicion, NOT diagnosed:** the test drives the rater as 7 `execFileSync` subprocesses, each loading `lib/env` + `googleapis`. Something in that — resource contention late in a long suite, an inherited env difference, or `execFileSync` defaults (maxBuffer) — is the likely culprit. Deliberately not chased further this session; it wants a fresh look rather than more guessing.
- **Suggested action:** OPEN. Cheapest next step is to capture the failing run's exit code and stderr explicitly (wrap the runner spawn, or have the test print its own exit path) rather than infer from `stdio: 'inherit'`. If subprocess count is the cause, the fix is to export the rater's resolution functions and unit-test them in-process, keeping only one or two subprocess tests for the CLI gates.
- **Pointer:** pipeline.62 (residual)

### G-PF15: the pre-mortem's sheet-write gate had an EMPTY exception list

- **Severity:** HIGH
- **Category:** quiet-pipe
- **What happened:** `scripts/preMortemScan.js` scraped its scan-2 carve-out list out of the engine rules boot doc, which used to inline the direct-write exception table. That doc was later trimmed to rules-only and now just points at `docs/engine/SHEETS_MANIFEST.md` §9. The scraper kept reading it and kept finding **0** filenames (verified: 0 from the boot doc, 70 from §9), so the exception set was empty and every direct writer in phases 1–9 was reported — 41 files.
- **Why it matters:** A gate that flags everything discriminates nothing. Scan 2's entire job is to surface a NEW undocumented sheet writer, and a genuinely new one would have been the 42nd line in a wall of 41 false ones. This is the G-PM1 lesson the pre-mortem skill itself teaches — "a stale known gap teaches the operator to disbelieve the scan" — occurring inside the scan. It also means every `SAFE TO RUN` since the boot-doc trim carried a scan-2 result that was never actually checked.
- **Suggested action:** FIXED same session — repointed at `SHEETS_MANIFEST.md` §9, scoped to that section (the tab inventory above it names scripts that are NOT authorized writers), matching by basename. Result: **41 → 0**. Every direct writer in phases 1–9 is accounted for in the manifest, including the `repairCycleCount_` carve-out added this morning. A missing §9 heading returns an empty set so the scan flags loudly rather than emitting a false all-clear. `preMortemScan.test.js` 10/10.
- **Pointer:** engine.137

### G-PF16: arc + bond escalation mechanics are structurally unreachable

- **Severity:** HIGH
- **Category:** quiet-pipe
- **What happened:** Found by the new ordering scan (G-PF17). `S.civicLoad` has exactly one writer — `phase06-analysis/applyCivicLoadIndicator.js:373`, **Phase 6** — but `phase04-events/eventArcEngine.js:219,220,225,226` gates rivalry-arc escalation on it in **Phase 4**. `S.cycleWeight` is written in **Phase 9** (`applyCycleWeight.js`) and read at `eventArcEngine.js:143,145` (**P04**) and `bondEngine.js:710` (**P05**). The reads are `===` comparisons against undefined, so nothing throws — the branches simply never take.
- **Why it matters:** These are designed mechanics that cannot fire. Rivalry arcs are written to escalate under civic strain (`t += 1` on `load-strain`, `+= 0.3` on `minor-variance`) and never do; the same for high/medium-signal cycle weighting on arcs and on rivalry bonds. The world has been running without a tension-escalation path that the code says it has, silently, for as long as the phase order has stood. Exactly the silent-failure class pre-mortem §3 exists to catch — and §3 was manual, so it never was.
- **Suggested action:** OPEN, engine.137. NOT a C105 blocker: none of the read-side files changed in this window (verified via `git log --since=2026-08-19` over all six), so this is long-standing, not a regression. The fix is a design call, not a mechanical move — either these reads want the PREVIOUS cycle's value (in which case carry-forward must seed them at Phase 1, and nothing currently does) or the consumers belong after their writers. Needs the builder's read on which.
- **CORRECTION (2026-08-31, S405, engine.137):** This entry is **wrong on its stated mechanism and incomplete on its scope.** Verified against `runWorldCycle()` (the production entry, reached from `utilities/webTrigger.js:41` and the sheet menu), the live `World_Population` tab, and a zero-caller grep:
  - `eventArcEngine.js` is **never called from anywhere** — retired S313 (engine.72 G-EC55), confirmed by `grep -rn "eventArcEngine_("` returning only its own definition, and by the standing comment at `godWorldEngine2.js:356`. Its 4 `civicLoad` and 2 `cycleWeight` reads are **dead code, not misordered code.** Rivalry-arc escalation has indeed never fired, but because the engine that would escalate it is retired — a different problem with a different fix.
  - `finalizeWorldPopulation.js` is **not a Phase-3 reader.** It sits in `phase03-population/` but `runWorldCycle()` calls it at `Phase9-FinalizePopulation`, after both writers. Its reads are correct, and the live sheet proves it: at C105 `World_Population` holds `cycleWeight=high-signal`, `civicLoad=load-strain`, not the empty strings a genuine Phase-3 read would have written.
  - **Root cause of the false finding:** the ordering pass added in G-PF17 keyed execution order off the phase **directory number**. The directory records where a file was filed, not when it runs. Fixed — see G-PF27.
  - **What was actually broken, and was missed here:** `applyCycleRecovery.js:162,163,170,171,173` (Phase4-CycleRecovery) read `S.shockFlag`, `S.civicLoad` and `S.civicLoadScore` written five slots later at Phase6; `bondEngine.js:710,714` (Phase5-Bonds) read `S.cycleWeight` and `S.shockFlag` written at Phase8/Phase6. Six live undefaulted sites, none of them named in this entry.
  - **Resolution:** the carry-forward path already existed end-to-end and was never consumed — `finalizeCycleState.js:62-75` packs `shockFlag`, `civicLoad`, `civicLoadScore` and `cycleWeight` into `S.previousCycleState`, `loadPreviousCycleState_` restores it at Phase1, and its own docstring says it exists "so Phase 6 analyzers (ShockMonitor, PatternDetection, CivicLoad) can compare against last cycle's state." All six sites now read the snapshot. Recovery scores the strain the city is recovering *from*; a rivalry escalates on the tension it is *carrying*. Both are last cycle's reading by definition.
- **Pointer:** engine.137

### G-PF17: pre-mortem §3 had no deterministic support, so it was effectively never run

- **Severity:** MED
- **Category:** process-gap
- **What happened:** The skill calls §3 (ctx read-before-write) "the most important check" and then leaves it judgment-based (G-PM5) — read the phase order by eye, scan every sub-engine's `ctx.summary` reads, verify each against execution order. `ctxMap.js` reported connected / orphaned / phantom but never the ORDERING question, which is the one §3 asks.
- **Why it matters:** The check most likely to find a silent failure was the one with the least tooling, so in practice it got a spot-check of the four chains the skill names and nothing more. G-PF16 sat undetected behind exactly that gap.
- **Suggested action:** FIXED same session — folded an ordering pass into `ctxMap.js` (existing file, not a new script). Phase-dir number is the execution order, so it is deterministic. Excludes the orchestrator (`godWorldEngine2.js` is not a phase-1 participant; its reads run at cycle close) and same-file read+write (internal bookkeeping, not a cross-phase dependency), and flags whether each early read has a fallback — a defaulted read degrades silently, an undefaulted one is a live defect. Current state: **20 fields read before write, 5 with an undefaulted read.** Note the line attribution needs care: a hit on an `if (idx('x') >= 0)` line can sit one line above the actual defaulted read, so confirm each by eye before acting.
- **Pointer:** engine.137

### G-PF18: civic voice sentiment has never reached the live world

- **Severity:** HIGH
- **Category:** quiet-pipe
- **What happened:** C105 logged `loadCivicVoiceSentiment_ v1.0: No civic sentiment file found (defaulting to 0)`. The file exists — `output/civic_sentiment_c104.json`, `civicVoiceSentiment: 0.41`, written by the C104 close. The loader at `phase02-world-state/applyInitiativeImplementationEffects.js:55-64` reads it via `if (typeof require !== 'undefined') { var fs = require('fs'); … }`. **Apps Script has neither `require` nor a filesystem**, so on the live engine that branch never runs, `content` stays empty, both candidate cycles miss, and it defaults to 0.
- **Why it matters:** This is not a stale file or an off-by-one cycle — the channel is structurally incapable of reaching the live engine and only ever worked under a Node harness. Every civic hearing the city has held has been scored, written down, and felt by nobody. On C105 every other sentiment channel landed (sports +0.029, edition coverage +0.048, initiatives +0.083) and civic voice contributed exactly 0, on a cycle whose hearing scored 0.410 across 20 statements and 6 initiatives.
- **Suggested action:** **FIXED 2026-08-31 (S405, engine-sheet).** Carrier is a `World_Config` key pair, chosen over a civic tab because `loadConfig_` already folds every World_Config row into `ctx.config` at `Phase1-LoadConfig` — the value is in memory one slot before `Phase2-CivicSentiment` needs it, with no extra sheet read and nothing Apps Script cannot do.
  - **Writer:** `scripts/applyTrackerUpdates.js` — `writeCivicSentimentToConfig()`, called under the existing `--apply` gate beside the JSON write (the JSON stays; it is a useful local artifact, it is just not a carrier). Upserts `civicVoiceSentiment` and `civicVoiceSentimentCycle` together, appending both with descriptions if absent. Dry-run touches nothing.
  - **Reader:** `loadCivicVoiceSentiment_` v2.0 — reads `ctx.config`, no `require`, no filesystem.
  - **Staleness gate:** the score is accepted only when its stamped cycle is the engine's cycle or the one before (the civic close runs a cycle behind the fire). Beyond that it is refused and the refusal is logged **with both numbers**. That is the point of the pair: the old failure mode was a silent 0 that looked identical to "the city felt nothing," and a stalled civic chain now reads as a named stale value instead. Non-numeric and never-written both log distinctly too.
  - **Live state:** neither key exists on `World_Config` yet (verified) — the next civic close with `--apply` appends them. Acceptance is that scheduled run, not a hand-fired one.
  - Tests: 189/190 files pass; the single failure (`djDirect.schema-and-slot`) fails identically on a clean tree.
- **Pointer:** engine.138

### G-PF19: the approval engine and the audit disagree about the same six initiatives

- **Severity:** HIGH
- **Category:** incoherence
- **What happened:** On C105 the approval engine docked Mayor Avery Santana 2 points on each of six initiatives for "sitting, nothing free" (82 → 69, Δ−13), and docked council seats the same way (Carter −7, Delgado −7, Rivers −5). In the *same cycle*, the engine audit counted four of those six as **improvements** because they advanced phase: OARI → implementation-active, Youth Apprenticeship → pilot-active, Transit Hub → visioning, Baylight → vote-scheduled. Separately `civicInitiativeEngine v1.6` reported `Processed 0 initiatives | Votes: 0 | Grants: 0` against the same six live rows.
- **Why it matters:** Three civic systems read the same tracker and returned three different answers in one cycle — advanced, sitting, and absent. The city's most visible number moved 13 points on the "sitting" reading. Either "sitting" means something narrower than phase movement (no free action slot) and the label is wrong, or the approval engine is not reading phase at all.
- **Suggested action:** OPEN, engine.138. Determine which of the three readings is authoritative before any of them is written as canon.
- **Pointer:** engine.138

### G-PF20: the storyline engine has no "resolved" path — 9 of 9 abandoned

- **Severity:** MED
- **Category:** pipeline-fragility
- **What happened:** `updateStorylineStatus_ v1.2: Complete. Dormant: 0, Concluded: 0, Abandoned: 9, Reactivated: 0`. Every open thread dropped in a single pass — Stabilization Fund, OARI, Transit Hub, Baylight, Health Center, Osei, A's, Bulls, Paulette/Raymond. Several described states the world has since moved past (the OARI line reads "whether the program launches is the story" — it launched this cycle), so abandonment is arguably right for those; but zero concluded and zero dormant across nine suggests the only available terminal state is abandonment.
- **Why it matters:** `/sift` opens C105 with an empty storyline slate. A story that resolves should conclude, not be abandoned — the distinction is what lets the newsroom write an ending rather than drop a thread.
- **Suggested action:** OPEN, engine.138.
- **Pointer:** engine.138

## LOW-severity gaps

- **G-PF11:** `/pre-flight` with no argument always exits 2. `scripts/preflightInputCheck.js` derives the target cycle by grepping SESSION_CONTEXT for a literal `Cycle: N` token; the PIN line has never carried one (verified 0 matches at both `f10d226c` and HEAD), so the documented canonical invocation cannot work and every run needs `--cycle=`. One-line fix — teach the deriver the PIN's actual `canonical C<NN>` format.

## Cross-gap patterns

- **Fail-loud gates guard the shape of the last failure, not the failure class.** G-PF7's gate checks article count because the S196 incident produced zero articles; the same root cause now produces 7 articles and 0 domains and passes. A gate written from one incident's symptom does not cover the next expression of that incident's cause.
- **Two independent channels have gone quiet without raising anything.** Coverage ratings have written nothing since C102 and the civic chain has applied nothing since C104 — neither surfaced anywhere until pre-flight was run by hand and its warnings chased. Both are "silence reads as fine" failures, the same class engine.136 just closed inside the engine.
- **Pre-flight verifies inputs exist, not that the producers of those inputs are alive.** Every gap here is upstream of the sheet it checks.

## Status updates

- 2026-08-30 (S403) — leg opened. G-PF7 + G-PF9 promoted to pipeline.62; G-PF8 + G-PF10 promoted to civic.26. G-PF11 left in log.
- 2026-08-30 (S403) — **G-PF8 CLOSED.** `callVoice` gained a cross-family fallback chain + backoff; provider errors now print the HTTP code and the upstream's own text. Probed all four fleet models: the 429 had already cleared, so the halt was transient — the fragility was the retry policy, not the model.
- 2026-08-30 (S403) — **G-PF10 CLOSED, by ruling not by edit.** Mike-direct: "'.42 sentiment' is not a gated term, nothing should fail on data all cities track." `metric-decimal` narrowed to engine-internal vocabulary (civic load, momentum); sentiment/approval/severity/tension removed and pinned CLEAN in `lintCivicPackets.test.js` so the list cannot be quietly re-tightened. `signed-delta` untouched — a cycle delta is engine output whatever noun it modifies.
- 2026-08-30 (S403) — **C104 APPLIED.** Re-gated the 2026-08-29 hearing outputs (no re-run of 16 voice calls): clerk pass, validator 0 violations, engine-verbiage clean over 17 voice files, sanity-read pass → GATE PASS. 6 initiatives written to `Initiative_Tracker`, verified by live read-back. INIT-001/005/007 no longer past due; pre-flight's stale warning is gone. Coverage (G-PF7) remains the one open warning.
- 2026-08-31 (S403) — **G-PF7 CLOSED.** Mike-direct: key domain off the reporter. Section headers still win where an edition has them; the reporter's beat is the fallback, sourced from `scripts/persona-map.json` so a beat change lives in one place. C104's 7 articles now resolve to CULTURE 4 / SPORTS 3 / ENVIRONMENT -2 instead of one COMMUNITY bucket. The gate now fails on 0-domains-resolved. C102 re-rates identical to the old code — regression proof, not assertion. C103 + C104 backfilled (10 rows, verified live).
- 2026-08-31 (S403) — **G-PF9 partially open.** Coverage now populates, so pre-flight reads clean READY with zero warnings, but the civic-chain-health step (reading `close_c<XX>.json` / `gate_c<XX>.json`) was NOT added — the underlying halt was fixed instead, so the check has nothing to report today. Still worth adding before the next silent stall; carried on pipeline.62's residual line.
- 2026-08-31 (S403) — **G-PF12 CLOSED** (and it retires the residual line above): coverage now runs inside the Saturday chain as `stepCoverage`, right after publish. Non-fatal by design; pre-flight is the independent backstop.
- 2026-08-31 (S403) — C105 FIRED and reviewed. engine.136 acceptance PASSED on the live fire (flush clean, 0 engine errors, cycleCount 105, no false positive from the read-back guard). pipeline.62 and civic.26 both closed their loops on the same fire — coverage ratings consumed (+0.048 sentiment), the four C104 civic decisions read back as engine-observed improvements. Full anomaly list annotated on the execution log (`output/execution_log_c105.md`) and filed as engine.138, this week's chase list. G-PF18/19/20 opened from it.
- 2026-08-31 (S403) — /pre-mortem run for C105: **SAFE TO RUN**, 0 CRITICAL across 98 engine-path commits since the last live cycle. Manual scans done: §3 via the new ordering pass (G-PF16/G-PF17), §4 header alignment clean on all 8 Phase-10-written tabs, §6 all 10 write-intent target tabs exist. G-PF15 + G-PF17 fixed; G-PF16 opened for the builder.
- 2026-08-31 (S403) — **G-PF14 opened, left OPEN by choice** (Mike-direct: gap-log it if it needs a fresh look). Intermittent test, not an intermittent product — the rater's behaviour is proven by the C102 byte-identical re-rate and the live C103/C104 backfill.
- 2026-08-31 (S403) — **G-PF13 opened and CLOSED same session.** Found by making the mistake: `--step=coverage` ran the entire chain because `arg()` only read spaced flags. Harmless here (no `--apply`), one keystroke from publishing canon. `arg()` now takes both forms.

### G-PF21: the mechanical gap-log pass DESTROYED the operator leg it was supposed to join

- **Severity:** HIGH
- **Category:** silent-fail
- **What happened:** `scripts/engineCycleAudit.js 105 --write` (run-cycle Step 6) overwrote `output/production_log_run_cycle_c105_gaps.md`, deleting the 14-entry `## LEG: /pre-flight (G-PF)` leg written earlier this session. The script has preservation logic, but it only engages when the file already contains `MECHANICAL_FOOTER`. A log opened by another skill's leg — which `GAP_LOG_TEMPLATE` §Destination explicitly sanctions ("every operator-run heavy skill **appends its own leg** to that same file") — carries no such marker, so `indexOf` returned −1 and the write proceeded clean.
- **Why it matters:** The one-true-log is the cycle's canonical inventory of sub-issues, and the mechanical pass is documented as the thing that *opens* it for others to append to. Instead it is the thing that erases them. Recovered here only because the leg happened to be committed; an uncommitted leg would have been gone with no trace and no error — the run reported success both times.
- **Suggested action:** FIXED same session. Added the missing branch: when no footer marker is present, preserve the existing `## LEG:` sections (or the whole body if there are none), and print a stderr notice naming what was kept. Guarded against re-preserving a prior mechanical log. Proven on the exact failing shape — a marker-less hand-written leg with a canary entry survives a mechanical pass, notice fires. Destroying an operator's gap log is worse than duplicating a section, and the fix errs that way deliberately.
- **Pointer:** engine.138

### G-PF22: `Simulation_Ledger` has no `Name` column — the snapshot synthesizes one

- **Severity:** MED
- **Category:** process-gap
- **What happened:** The live sheet's header is `POPID, First, MaidenName, Last, …`. `output/simulation_ledger_snapshot.jsonl` carries a synthesized `Name` field, and `scripts/canon-name-check.js` reads the snapshot. A name query written against the sheet with `headers.indexOf('Name')` gets −1 and reads `undefined` for every row — reporting "citizen not found" for citizens who are present. Hit live this session: I reported Carmen Mesa and Pablo Almanzar "NOT IN LEDGER"; both are Active (POP-00081, POP-01078) and resolve immediately on `First`+`Last`.
- **Why it matters:** The failure is silent and inverted — it manufactures absence rather than erroring. It is one `indexOf` away from a false "this citizen does not exist" in any script, review, or article that checks a name against the sheet, and it directly contradicts the standing rule to resolve by NAME rather than by supplied POPID: the obvious way to obey that rule is the way that breaks.
- **Suggested action:** OPEN. Either add a computed `Name` to the sheet contract, or give `lib/sheets.js` a name resolver that owns the First+Last join so no caller writes `indexOf('Name')` again. The second is the smaller surface.
- **Pointer:** engine.138

### G-PF23: neighborhood texture is written with blocklists but not with the hoods' canon identity

- **Severity:** MED
- **Category:** canon-risk
- **What happened:** Mike-direct, 2026-08-31: "we have canon identity in institutions.md on the neighborhoods." `scripts/buildNeighborhoodTexture.js` reads Riley_Digest + Neighborhood_Map + `lib/neighborhoodSlice` + `lib/canonBlocklist` + `docs/media/REAL_NAMES_BLOCKLIST.md`. It does **not** read `docs/canon/INSTITUTIONS.md` (453 lines, 42 sections, tiered: "use real names" vs "canon-substitute required").
- **Why it matters:** The generator knows what it must not say and not what the places actually are. Its output is injected into every citizen wake as "Around your neighborhood:", so a hood's texture can float free of the named institutions that constitute its canon identity — generic venues where the world has specific ones. C105's own content-drafter output shows the shape: `$VENUE`, "the bookstore", "the health center site".
- **Suggested action:** OPEN. Feed the per-hood institution set into the texture prompt alongside the blocklists, so the generator is told what exists as well as what is forbidden.
- **Pointer:** engine.138

### G-PF24: the content drafter threw away 5 of 6 rows on a dead hood gate

- **Severity:** MED
- **Category:** quiet-pipe
- **What happened:** Step 5.6 `draftContentRows.js --cycle 105 --apply` rejected five candidates as `INVALID … [dead hood gate: hood=temescal]`, `hood=lake_merritt`, `hood=downtown;nightlife>=0.7`, `hood=rockridge;retired`, `hood=fruitvale`. One ungated citywide row was written. The gate vocabulary is snake_case (`lake_merritt`); canon hood names are `Lake Merritt`.
- **Why it matters:** Five of six texture rows for the cycle discarded, and the ones lost are exactly the hood-specific ones — the content pools grow only with citywide filler while every neighborhood-anchored line fails validation. Exit code 0, reported as a normal run.
- **Suggested action:** OPEN. Confirm whether the gate vocabulary is meant to be snake_case and the hood list is stale, or the gates should be written in canon hood names.
- **Pointer:** engine.138

### G-PF25: the world-state fold runs before the file it depends on is built

- **Severity:** MED
- **Category:** phase-ordering
- **What happened:** Chain order puts Step 5.57 (`buildWorldState.js`) before Step 5.8 (`buildDeskPackets.js`), but the fold reads `output/desk-packets/base_context.json`, which 5.8 produces. First run this cycle wrote `world_state.json` at **5,465 bytes** with the note `canon absent: base_context.json unreadable — ENOENT`. Re-run after 5.8: **55,684 bytes**, `canon current`.
- **Why it matters:** `world_state.json` is the single artifact the 24/7 loops read — Discord bot, citizen wakes, citizen exchange, desk-writer fallback. Following the documented order exactly leaves every one of them reading a world with no canon for the rest of the cycle, and the step exits 0 while doing it. Ten times smaller and nothing said so.
- **Suggested action:** OPEN. Either move 5.57 after 5.8, or have the fold fail loudly when canon is absent instead of writing a canon-less file. Caught only because the note was read.
- **Pointer:** engine.138

### G-PF26: nothing validates sports-feed names at write time

- **Severity:** MED
- **Category:** canon-risk
- **What happened:** `Oakland_Sports_Feed!E212` (C105) carried two stacked defects in one cell: a missing comma merging two pitchers into one token, and, underneath it, a misspelling — `"… Pablo Almanzar (SP) Carmes Mesa (SP)"`. The engine consumed the row at Phase 2 without complaint; the defect surfaced only downstream at `/build-world-summary`, which reported the merged name as unresolvable and then, after the comma fix, auto-rescued `Carmes` → `Carmen Mesa` (POP-00081) by edit distance. Both repaired at source, read-back verified.
- **Why it matters:** The row's story angle is "A's pitching rotation is stellar all season" — the sports desk could reach neither pitcher in it. Sports is the world, and its feed has no name validation between authoring and the engine reading it; the only thing that caught this was a downstream summary builder choosing to be loud.
- **Suggested action:** OPEN. Run the same `canon-name-check` resolver over `NamesUsed` at feed-write time, or add a pre-flight check on the target cycle's feed rows so a name that cannot resolve is caught before the engine consumes it.
- **Pointer:** engine.138

## Cross-gap patterns (second pass, 2026-08-31)

- **Every gap in this log is a silence, not a crash.** Coverage stopped writing, the civic chain stopped applying, the rater mis-filed every article, and `--step` ran the wrong thing — all at exit 0. Nothing in this cycle's inventory announced itself; each one had to be walked into. That is the same class engine.136 closed inside the engine on the same day, which suggests the project's dominant failure mode right now is not breakage but unreported success.
- **Two of the seven were only findable by running the thing by hand.** G-PF12 (no cron) and G-PF13 (arg parsing) had no artifact, no log line and no failing test — they were invisible until a human invoked the code. Automation that is never invoked cannot report that it was never invoked.

### G-PF27: the ordering scan keyed execution order off the phase DIRECTORY, and smeared files across slots

- **Severity:** HIGH
- **Category:** instrument-defect
- **What happened:** Two defects in the `ctxMap.js` ordering pass built for G-PF17, both of which manufactured findings. (1) It read the `phase<NN>` directory number as execution order. The orchestrator does not honour that: `finalizeWorldPopulation.js` is filed under `phase03-population/` and runs at the Phase9 slot; `eventArcEngine.js` is filed under `phase04-events/` and never runs at all. (2) It resolved a slot to a **file**, so a file with two entry points was smeared across the whole span between them — `applyCivicLoadIndicator.js` defines both `applyCivicLoadIndicator_` (Phase6-CivicLoad) and `resetCycleAuditIssues_` (Phase1-ResetAudit), so the file carried the range Phase1..Phase6 and its own real `civicLoad` finding was silently swallowed. A third, smaller defect: `isDefaulted()` tested for `||`/`?`/`&&` **anywhere on the line**, so `if (S.cycleWeight === 'high-signal' && bond.bondType === RIVALRY)` was classed as safely defaulted purely because of the `&&` — which is precisely the engine.137 headline site.
- **Why it matters:** This is the check pre-mortem §3 calls its most important, and it was reporting fiction in both directions at once — inventing G-PF16 while hiding the six real sites. A gate that flags the wrong things is worse than one that flags everything, because its output looks credible. Same lesson as G-PF15, one layer up.
- **Suggested action:** FIXED same session. `scripts/ctxMap.js` now parses the `safePhaseCall_` sequence out of `runWorldCycle()` (126 slots) and resolves ordinals **per top-level function**, walking the call graph from each slot. Reports only when the read ALWAYS precedes the write (readMax < writeMin); overlapping ranges go to AMBIGUOUS, and a file is called DEAD only when *every* top-level function in it is unreachable — a partially-unreachable file is not reported, because a static call graph cannot see non-literal dispatch and that bucket would over-report. `isDefaulted` is now field-aware. Result: 5 undefaulted fields → 6 real ones, all verified by eye; after the engine.137 wiring, 3 remain (see G-PF28, G-PF29). Independent validation: the scan rediscovered `applySeasonWeights.js:34`, which already carried a hand-written comment saying "has always been undefined here and these multipliers have never fired."
- **Pointer:** engine.137

### G-PF28: media feedback has never reached the citizens who are supposed to feel it

- **Severity:** MED
- **Category:** quiet-pipe
- **What happened:** `S.mediaEffects` is written at `Phase7-MediaFeedback` but read at `runRelationshipEngine.js:558` (Phase5-Relationships) and at `mediaFeedbackEngine.js:1231,1331` — `getMediaInfluencedEvent_` and `getMediaEventModifier_`, both reached from Phase5-CitizenEvents. All three are guarded, so nothing throws; the media-influenced event pool and the media event modifier simply resolve to null/1.0 every cycle.
- **Why it matters:** The whole point of the feedback engine is that what the paper prints changes what happens next. It has never done so for citizen events.
- **Suggested action:** OPEN. Not fixed with the engine.137 batch: unlike `civicLoad`/`cycleWeight`/`shockFlag`, `mediaEffects` is **not** in the `finalizeCycleState_` carry-forward payload, so there is no snapshot to point at. Fix is either to add it to the payload (then wire as engine.137 did) or to move `mediaFeedbackEngine_` ahead of Phase5. Needs a read on which — the second changes what the feedback engine itself sees.
- **Pointer:** engine.137

### G-PF29: seasonal weights read the sports state one slot before sports writes it

- **Severity:** MED
- **Category:** quiet-pipe
- **What happened:** `applySeasonWeights.js:34` reads `S.sportsAtmosphereEnabled` and `S.sportsSeason` at `Phase2-SeasonalWeights`; `applySportsSeason_` writes both at `Phase2-SportsSeason`, the very next slot. The file already carries a hand-written comment at :32-33 acknowledging this — "has always been undefined here and these multipliers have never fired. Gated for correctness if the ordering ever changes."
- **Why it matters:** Sports is the world. A seasonal weighting that has never once seen the sports season is a live gap in the layer that matters most, not a curiosity. The fix is plausibly a one-line orchestrator swap (`Phase2-SportsSeason` before `Phase2-SeasonalWeights`), which is cheap — but it turns on multipliers that have never fired, so it is a world-behaviour change, not a mechanical repair.
- **Suggested action:** OPEN, needs a call on intent before the swap. Deliberately not bundled with engine.137.
- **Pointer:** engine.137

### G-PF30: dry-run and replay do not run the same cycle production does

- **Severity:** LOW
- **Category:** process-gap
- **What happened:** `godWorldEngine2.js` carries two phase sequences. `runWorldCycle()` (production, 126 slots) and `runCyclePhases_` (124 slots, used only by `runDryRunCycle` at :1830 and `replayCycle` at :1940). The replay path omits `Phase7-StorylineWeaving` and `Phase9-DigestSummary`.
- **Why it matters:** A dry run is supposed to answer "what will the live cycle do." It answers a slightly different question, silently, and the two slots it drops are both content-producing.
- **Suggested action:** OPEN, unowned. Either reconcile the two sequences or have `runCyclePhases_` derive from one list.
- **Pointer:** engine.138

### G-PF31: three map/manifest defects surfaced while tracing engine.137

- **Severity:** LOW
- **Category:** doc-drift
- **What happened:** Byproducts of the wiring trace, each verified: (1) `ENGINE_STUB_REVERSE.json` counts `===` comparisons as writes — it lists four writers for `S.civicLoad` where only `applyCivicLoadIndicator.js:373` assigns, and the same for `S.cycleWeight`. That is a `/stub-engine` generator defect and it will keep poisoning wiring cards. (2) `writeCycleWeightToDigest_` (`applyCycleWeight.js:476,480,485`) writes `Riley_Digest` directly, has zero callers, and is absent from `SHEETS_MANIFEST.md` §9 — currently harmless because it is unreachable, a manifest violation the moment anyone wires it. (3) `Riley_Digest` does not appear in `SHEETS_MANIFEST.md` at all, though the live `writeDigest_` intent path appends to it every cycle.
- **Why it matters:** (1) misleads every future `engine-wiring` card. (3) means a tab the engine writes every cycle is not in the tab inventory.
- **Suggested action:** OPEN, unowned.
- **Pointer:** engine.138

## Changelog

- 2026-08-30 — Initial /pre-flight leg (S403, engine-sheet), C105 pre-fire.
- 2026-08-31 — G-PF18 fixed (S405, engine-sheet): civic voice sentiment now rides a World_Config key pair with a staleness gate; acceptance rides the next scheduled civic close.
- 2026-08-31 — engine.137 closed (S405, engine-sheet). G-PF16 annotated as incorrect on mechanism and incomplete on scope; G-PF27 (instrument defect) fixed; six read-before-write sites wired to the existing carry-forward snapshot; G-PF28/29/30/31 opened.


## Judgment-layer entries (engine-sheet appends here)

*Coder voice: terse, mechanical, commit-message style. Tag each entry `[judgment]`. Use G-EC{N+} numbering continuing from the mechanical pass.*

