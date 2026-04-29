---
paths:
  - "phase*/**/*.js"
  - "scripts/*.js"
  - "lib/*.js"
---

# Engine Code Rules

- 100+ script system with cascade dependencies. Check what reads/writes affected ctx fields before editing.
- Never use `Math.random()` — use `ctx.rng` for deterministic simulation runs.
- Never write directly to sheets — use write-intents (`ctx.writeIntents`). Only `phase10-persistence/` files execute sheet writes.
  **Documented exceptions (direct sheet writes outside Phase 10):**
  - Phase 1 engine core: `godWorldEngine2.js` (Engine_Errors, Simulation_Ledger, Intake, Riley_Digest, World_Population — error log + intake processing + digest), `advanceSimulationCalendar.js` (Simulation_Calendar — cycle calendar state)
  - Phase 2 world state: `applyEditionCoverageEffects.js` (Edition_Coverage_Ratings — per-edition coverage scoring)
  - Phase 3 population: `applyDemographicDrift.js` (World_Population), `updateNeighborhoodDemographics.js` (Neighborhood_Demographics), `updateCrimeMetrics.js` (Crime_Metrics), `finalizeWorldPopulation.js` (World_Population — per-cycle world-state snapshot), `generateMonthlyDriftReport.js` (World_Drift_Report — monthly drift summary)
  - Phase 3 helper: `updateCityTier.js` (caller-passed sheet — column-update helper, write target decided by caller)
  - Phase 4 event generators: `generateGenericCitizenMicroEvent.js`, `generateGameModeMicroEvents.js`, `generationalEventsEngine.js` — write LifeHistory_Log + Simulation_Ledger citizen event rows (`generateCitizenEvents.js` deleted S185 — was dead duplicate of phase05's `generateCitizensEvents.js`)
  - Phase 4 helper: `worldEventsLedger.js` (caller-passed sheet — event ledger append helper)
  - Phase 5 Tier-5 engines: `householdFormationEngine.js`, `generationalWealthEngine.js`, `educationCareerEngine.js` — write to their own tracking sheets
  - Phase 5 SL writers: `generateCitizensEvents.js`, `generateNamedCitizensEvents.js`, `checkForPromotions.js`, `runEducationEngine.js`, `runAsUniversePipeline.js` — write to Simulation_Ledger + logs
  - Phase 5 civic: `civicInitiativeEngine.js` (Initiative_Tracker), `updateCivicLedgerFactions.js` (Civic_Ledger), `generateMonthlyCivicSweep.js` (Civic_Sweep), `updateCivicApprovalRatings.js` (Civic_Office_Ledger + Initiative_Tracker — approval recomputation), `generateCivicModeEvents.js` (Civic_Office_Ledger + LifeHistory_Log + Simulation_Ledger — civic-mode citizen events), `runCivicRoleEngine.js`, `runCivicElectionsv1.js` (Civic_Office_Ledger + Election_Log — election outcomes)
  - Phase 5 citizen life engines: `runHouseholdEngine.js`, `runRelationshipEngine.js`, `runNeighborhoodEngine.js`, `runCareerEngine.js`, `bondEngine.js`, `seedRelationBondsv1.js`, `bondPersistence.js` (Relationship_Bonds + Relationship_Bond_Ledger + Citizen_Directory + Neighborhood_Map — relationship/household/career lifecycle), `migrationTrackingEngine.js` (Household_Ledger + Neighborhood_Map + Simulation_Ledger), `gentrificationEngine.js` (Neighborhood_Map)
  - Phase 5 citizen generators: `generateChicagoCitizensv1.js` (Chicago_Citizens), `generateGenericCitizens.js` (Generic_Citizens), `processAdvancementIntake.js` (Advancement_Intake tabs + Generic_Citizens + Simulation_Ledger + LifeHistory_Log — citizen promotion pipeline), `generateMediaModeEvents.js` (LifeHistory_Log + Simulation_Ledger)
  - Phase 6 tracking: `arcLifecycleEngine.js`, `processArcLifeCyclev1.js` (Story_Arcs), `hookLifecycleEngine.js` (Hook tracking), `storylineHealthEngine.js`, `updateStorylineStatusv1.2.js` (Storylines), `applyMigrationDrift.js` (Neighborhood_Map), `economicRippleEngine.js` (Population_Stats)
  - Phase 7 media intake: `parseMediaRoomMarkdown.js`, `mediaRoomIntake.js`, `mediaRoomBriefingGenerator.js` — write Press_Drafts, Media_Ledger, Storyline_Tracker, Cultural_Ledger, MediaRoom_Paste, Media_Intake, Media_Briefing + citizen/advancement/continuity intake tabs (media pipeline from paste → structured tabs)
  - Phase 7 tracking: `citizenFameTracker.js` (Chicago_Citizens + Citizen_Media_Usage + Cultural_Ledger + Generic_Citizens + Simulation_Ledger + Storyline_Tracker — fame score propagation), `storylineWeavingEngine.js` (Storyline_Tracker)
  - Phase 7 helpers: `updateTrendTrajectory.js`, `updateMediaSpread.js`, `culturalLedger.js` (caller-passed sheet — column-update helpers)
  - Phase 8: `v3NeighborhoodWriter.js`, `v3DomainWriter.js`, `v3ChicagoWriter.js` — tracking sheets
  - Phase 9: `applyCycleWeightForLatestCycle.js`, `applyCycleWeight.js` — Cycle_Weight tab
  - Phase 11 media intake: `healthCauseIntake.js` (Health_Cause_Intake + Health_Cause_Queue + Simulation_Ledger — health-cause pipeline), `continuityNotesParser.js` (Continuity_Intake + Raw_Continuity_Paste — continuity notes pipeline)
  All non-exception direct writes are bugs. Phase 40.3 Path 1 audit (S156, 2026-04-17) verified all 38 previously-undocumented writers against `docs/engine/tech_debt_audits/2026-04-15.md` — every file writes to an engine-owned tracking or intake tab consistent with existing patterns; zero were bugs. See `docs/engine/tech_debt_audits/` for latest scan.
- Always check `ctx.summary` and `ctx.snapshot` field dependencies before modifying any phase function. Engine files alias `ctx.summary` as `S` — search for both patterns. See `docs/engine/tech_debt_audits/` for orphan field inventory.
- Engine phases execute in order (phase01 through phase11). Each phase reads ctx fields written by earlier phases.
- Test changes against the pre-commit hook: no `Math.random()`, no direct sheet writes outside persistence, no engine language in media files.
- **No maintenance scripts for ledger work.** Use the service account (lib/sheets.js) directly to read and write data. Scripts add conditional logic that silently skips rows. Direct writes are transparent — they work or they don't.
- **Verify after every write.** Read the live sheet data back and confirm values landed. Never report work as "complete" based on script output alone.
- **Depth over speed.** The user is not asking for fast. They are asking for correct and verified.
- **Math.random() fallbacks are violations.** FIXED S156 (Phase 40.3 Path 1): every fallback site now throws instead of silently falling back to Math.random. Closed: `phase04-events/generationalEventsEngine.js` (initRng_, rand_), `phase05-citizens/generateGenericCitizens.js` (inner rand()), `utilities/v2DeprecationGuide.js` (v3Random_ — had zero callers, throws if ever invoked).
- **Tech debt audits live in `docs/engine/tech_debt_audits/`.** Run `/tech-debt-audit` every 3-5 sessions.
- **Engine health commands:** `/health` (quick 30s check), `/ctx-map` (field dependency map), `/deploy` (clasp push + verify), `/pre-mortem` (full pre-cycle scan), `/tech-debt-audit` (comprehensive periodic scan).
- **Post-write hook catches engine violations at edit time.** Math.random() in engine files, new unrecognized ctx.summary fields, and simulation language in agent files are all flagged automatically.
