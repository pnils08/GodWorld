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
  - Phase 5 Tier-5 engines: `householdFormationEngine.js`, `generationalWealthEngine.js`, `educationCareerEngine.js` — write to their own tracking sheets
  - Phase 5 SL writers: `generateCitizensEvents.js`, `generateNamedCitizensEvents.js`, `checkForPromotions.js`, `runEducationEngine.js`, `runAsUniversePipeline.js` — write to Simulation_Ledger + logs
  - Phase 5 civic: `civicInitiativeEngine.js` (Initiative_Tracker), `updateCivicLedgerFactions.js` (Civic_Ledger), `generateMonthlyCivicSweep.js` (Civic_Sweep)
  - Phase 6 tracking: `arcLifecycleEngine.js`, `processArcLifeCyclev1.js` (Story_Arcs), `hookLifecycleEngine.js` (Hook tracking), `storylineHealthEngine.js`, `updateStorylineStatusv1.2.js` (Storylines), `applyMigrationDrift.js` (Neighborhood_Map), `economicRippleEngine.js` (Population_Stats)
  - Phase 8: `v3NeighborhoodWriter.js`, `v3DomainWriter.js`, `v3ChicagoWriter.js` — tracking sheets
  - Phase 2: `applyEditionCoverageEffects.js` (Edition_Coverage_Ratings — marks Processed column)
  - Phase 3: `applyDemographicDrift.js` (World_Population), `updateNeighborhoodDemographics.js` (Neighborhood_Demographics), `updateCrimeMetrics.js` (Crime_Metrics)
  - Phase 9: `applyCycleWeightForLatestCycle.js`, `applyCycleWeight.js` — Cycle_Weight tab
  All non-exception direct writes are bugs. See `docs/engine/tech_debt_audits/` for latest scan.
- Always check `ctx.summary` and `ctx.snapshot` field dependencies before modifying any phase function. Engine files alias `ctx.summary` as `S` — search for both patterns. See `docs/engine/tech_debt_audits/` for orphan field inventory.
- Engine phases execute in order (phase01 through phase11). Each phase reads ctx fields written by earlier phases.
- Test changes against the pre-commit hook: no `Math.random()`, no direct sheet writes outside persistence, no engine language in media files.
- **No maintenance scripts for ledger work.** Use the service account (lib/sheets.js) directly to read and write data. Scripts add conditional logic that silently skips rows. Direct writes are transparent — they work or they don't.
- **Verify after every write.** Read the live sheet data back and confirm values landed. Never report work as "complete" based on script output alone.
- **Depth over speed.** The user is not asking for fast. They are asking for correct and verified.
- **Math.random() fallbacks are violations.** Two files had silent fallbacks (FIXED S120 — now log warnings): `generateGenericCitizens.js:96`, `generationalEventsEngine.js:105,111`. `v2DeprecationGuide.js` has a deprecated helper with the same pattern.
- **Tech debt audits live in `docs/engine/tech_debt_audits/`.** Run `/tech-debt-audit` every 3-5 sessions.
- **Engine health commands:** `/health` (quick 30s check), `/ctx-map` (field dependency map), `/deploy` (clasp push + verify), `/pre-mortem` (full pre-cycle scan), `/tech-debt-audit` (comprehensive periodic scan).
- **Post-write hook catches engine violations at edit time.** Math.random() in engine files, new unrecognized ctx.summary fields, and simulation language in agent files are all flagged automatically.
