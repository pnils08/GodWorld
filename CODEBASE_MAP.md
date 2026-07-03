# GodWorld Codebase Map

> **Auto-generated** — 2026-07-03T11:06 UTC  
> **Head commit:** `05134fa` — S289 [engine-sheet] NEXT: S290 opener = G-RC5 sign-aware seed  
> **Version:** 2.10.0 (package.json)  
> **Runtime:** Google Apps Script V8 + Node.js toolchain  
> **Time zone:** America/Chicago

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Root](#2-repository-root)
3. [Simulation Pipeline — Phase Directories](#3-simulation-pipeline--phase-directories)
4. [scripts/ — Utility & Operations Layer](#4-scripts--utility--operations-layer)
5. [lib/ — Shared Library Modules](#5-lib--shared-library-modules)
6. [Supporting Directories](#6-supporting-directories)
7. [Schemas & Data](#7-schemas--data)
8. [Documentation](#8-documentation)
9. [Service Dependencies & Integrations](#9-service-dependencies--integrations)
10. [Test Coverage Inventory](#10-test-coverage-inventory)
11. [Architecture Notes](#11-architecture-notes)
12. [Flags: Deprecated Patterns, Risks & Undocumented Entry Points](#12-flags-deprecated-patterns-risks--undocumented-entry-points)
13. [Recent Changes (last 24 h)](#13-recent-changes-last-24-h)

---

## 1. Project Overview

GodWorld is a **Google Apps Script–based city-simulation engine** that models a fictional Oakland (Bay Area) metropolis across discrete "cycles" (each cycle ≈ one in-sim day). Each cycle runs a multi-phase pipeline that:

1. Configures the simulation clock and world state
2. Applies weather, sports-season, and economic dynamics
3. Updates neighbourhood demographics and population
4. Generates city-wide and citizen-level events
5. Runs citizen sub-engines (career, household, bonds, wealth, conduct, etc.)
6. Analyses and prioritises storylines
7. Produces an "evening media" packet and story hooks
8. Writes Chicago-satellite outputs (v3)
9. Finalises cycle state and produces a digest
10. Persists everything to the Google Sheet and Drive

A local Node.js toolchain (clasp push) synchronises `.js` source files to the bound Google Sheet project. Jest-style tests run locally via `scripts/run-tests.js`.

---

## 2. Repository Root

| File / Dir | Purpose |
|---|---|
| `appsscript.json` | GAS project manifest — V8 runtime, Drive v3 + Sheets v4 advanced services, Chicago time zone |
| `package.json` | Node.js meta — v2.10.0; test runner, lint, clasp push; key deps: `@anthropic-ai/sdk`, `googleapis`, `discord.js`, `better-sqlite3`, `playwright`, `puppeteer`, `xlsx` |
| `ecosystem.config.js` | PM2 process definitions for long-running Node servers (discord bot, daily-reflection daemon, etc.) |
| `.clasp.json` | clasp project binding (script ID + rootDir) |
| `.claspignore` | Excludes non-GAS files from push |
| `.eslintrc.json` | ESLint config for GAS + Node JS |
| `.env.example` | Required env-var template |
| `.aider.conf.yml` / `.aiderignore` | Aider AI assistant configuration |
| `CLAUDE.md` | Claude Code session rules and conventions |
| `AGENTS.md` | Agent protocol documentation |
| `CONVENTIONS.md` | Coding conventions and schema discipline rules |
| `CONTEXT.md` | High-level project context for AI sessions |
| `SESSION_CONTEXT.md` | Per-session quick-start context |
| `GodWorld_My_Oakland.md` | World-building canon — Oakland setting lore |
| `README.md` | Project overview |
| `The_Pulse.txt` | Narrative flavour doc |
| `AIDER_PLAN.md` | Outstanding aider plan items |
| `day1` | Tiny sentinel file (6 bytes) |
| `CODEBASE_MAP.md` | **This file** |

---

## 3. Simulation Pipeline — Phase Directories

The simulation is organised into numbered phase directories. The master orchestrator `phase01-config/godWorldEngine2.js` calls into these phases via `safePhaseCall_()`.

### Phase 01 — Config & Calendar (`phase01-config/`)

| File | Role |
|---|---|
| `godWorldEngine2.js` (~93 KB) | **Primary engine entry point.** Orchestrates the full cycle via `safePhaseCall_()`. Contains `openSimSpreadsheet_()`, `loadEventContentLedger_()` registration (L226 + L1568), and all phase dispatch. **Key entry point — every cycle starts here.** |
| `advanceSimulationCalendar.js` | Ticks the in-sim calendar; resolves sim date, day-of-week, season |
| `initSimulationLedger.js` | Creates or validates the Simulation Ledger sheet tab |
| `loadPreviousEvening.js` | Loads prior-cycle evening-media packet into engine state |

### Phase 02 — World State (`phase02-world-state/`)

| File | Role |
|---|---|
| `applyCityDynamics.js` (~66 KB) | Applies macro city-level economic + social dynamics |
| `applyEditionCoverageEffects.js` | Feeds back edition (newspaper) publication effects into world state |
| `applyInitiativeImplementationEffects.js` | Applies effects of fully-implemented civic initiatives |
| `applySeasonWeights.js` | Adjusts event-probability weights by season |
| `applySportsSeason.js` | Injects sports-season state (schedule, standings, fan mood) |
| `applyWeatherModel.js` (~58 KB) | Full weather simulation with seasonal/geographic variation |
| `calendarChaosWeights.js` | Per-calendar-day chaos multipliers |
| `calendarStorySeeds.js` | Calendar-date–driven story seed injection |
| `getSimHoliday.js` | Resolves sim holidays for the current date |
| `getsimseason.js` | Returns current season enum |
| `loadEventContentLedger.js` | **(New — S289 Task 10)** Loads the `Event_Content_Ledger` sheet tab; fail-closed loader mirroring `loadNeighborhoodState_` pattern. Registered at both `safePhaseCall_` sites. |
| `loadNeighborhoodState.js` | Loads per-neighbourhood state snapshot from sheet |
| `updateTransitMetrics.js` | Recalculates transit ridership / disruption metrics |

### Phase 03 — Population (`phase03-population/`)

| File | Role |
|---|---|
| `applyDemographicDrift.js` | Applies demographic change vectors to neighbourhood population |
| `deriveDemographicDrift.js` | Calculates drift magnitudes from economic + event inputs |
| `finalizeWorldPopulation.js` | Reconciles population totals |
| `generateCrisisBuckets.js` | Classifies at-risk citizen cohorts for crisis events |
| `generateCrisisSpikes.js` | Generates acute crisis-level events from bucket data |
| `generateMonthlyDriftReport.js` | Monthly demographic-drift summary |
| `updateCityTier.js` | Updates city-tier designation based on population/GDP |
| `updateCrimeMetrics.js` (~39 KB) | Detailed neighbourhood-by-neighbourhood crime simulation |
| `updateNeighborhoodDemographics.js` | Updates per-neighbourhood demographic columns on sheet |

### Phase 04 — Events (`phase04-events/`)

| File | Role |
|---|---|
| `buildCityEvents.js` (~42 KB) | Generates city-wide headline events for the cycle |
| `chaosCarsEngine.js` (~24 KB) | Chaos-Cars sub-event engine (traffic / car-culture events) |
| `chaosCarsEngine.test.js` | Tests for ChaosCars engine |
| `eventArcEngine.js` (~20 KB) | Manages multi-cycle event arc lifecycle |
| `faithEventsEngine.js` (~16 KB) | Generates faith-community events |
| `generateGameModeMicroEvents.js` (~24 KB) | Game-mode–specific micro-events |
| `generateGenericCitizenMicroEvent.js` (~24 KB) | Generic citizen micro-event generator |
| `generationalEventsEngine.js` (~40 KB) | Generational / long-horizon events (wealth transfer, inheritance, etc.) |
| `worldEventsEngine.js` (~24 KB) | Exogenous world-level events affecting the city |

### Phase 05 — Citizens (`phase05-citizens/`)

The largest and most complex phase; simulates individual citizen lifecycles each cycle.

| File | Role |
|---|---|
| `generateCitizensEvents.js` (~131 KB) | **Core citizen event generation.** For each citizen, draws events from pool. **(S289)** Now integrates `loadEventContentLedger_` fragments via pool injection; fail-closed skeleton-level dedup + within-cycle cycleSeen; loud skipped-row logging. |
| `civicInitiativeEngine.js` (~97 KB) | Full civic-initiative pipeline (proposal → vote → implementation) |
| `bondEngine.js` (~57 KB) | Social-bond formation, maintenance, and dissolution |
| `runCareerEngine.js` (~45 KB) | Career advancement, job changes, promotions |
| `citizenContextBuilder.js` (~42 KB) | Builds rich per-citizen context object for event generation |
| `runHouseholdEngine.js` (~32 KB) | Household formation, dissolution, co-habitation |
| `runRelationshipEngine.js` (~32 KB) | Romantic / social relationship lifecycle |
| `generateGenericCitizens.js` (~34 KB) | Generates generic (non-named) citizen rows |
| `runAsUniversePipeline.js` (~28 KB) | Top-level citizens pipeline runner |
| `processAdvancementIntake.js` (~25 KB) | Processes player-submitted advancement decisions |
| `bondPersistence.js` (~26 KB) | Persists bond state back to sheet |
| `applyNamedCitizenSpotlight.js` (~28 KB) | Spotlight logic for named/prominent citizens |
| `checkForPromotions.js` (~27 KB) | Evaluates promotion eligibility |
| `runCivicElectionsv1.js` (~25 KB) | Civic elections simulation |
| `runEducationEngine.js` (~25 KB) | Education attainment and school system simulation |
| `runNeighborhoodEngine.js` (~26 KB) | Neighbourhood-level citizen dynamics |
| `generationalWealthEngine.js` (~24 KB) | Generational wealth tracking and inheritance |
| `gentrificationEngine.js` (~15 KB) | Gentrification pressure on neighbourhood residents |
| `householdFormationEngine.js` (~23 KB) | Detailed household formation rules |
| `migrationTrackingEngine.js` (~18 KB) | Tracks in/out migration for citizens |
| `educationCareerEngine.js` (~20 KB) | Education-to-career pipeline |
| `runConductEngine.js` (~15 KB) | Citizen conduct scoring |
| `runCivicRoleEngine.js` (~20 KB) | Civic role assignments |
| `updateCivicApprovalRatings.js` (~18 KB) | Citizen civic-approval scoring |
| `updateCivicLedgerFactions.js` (~10 KB) | Faction membership updates |
| `generateMonthlyCivicSweep.js` (~8 KB) | Monthly civic-action sweep |
| `generateChicagoCitizensv1.js` (~15 KB) | Generates Chicago satellite citizens |
| `generateCivicModeEvents.js` (~24 KB) | Civic-mode specific events |
| `generateMediaModeEvents.js` (~21 KB) | Media-mode specific events |
| `applyChaosDecay.js` / `applyChaosDecay.test.js` | Chaos stat decay logic + tests |
| `processIntakeV3.js` (~10 KB) | V3 intake processing |
| `seedRelationBondsv1.js` (~17 KB) | Seeds initial relationship bonds |
| `runYouthEngine.js` (~20 KB) | Youth / child citizen lifecycle |

### Phase 06 — Analysis (`phase06-analysis/`)

| File | Role |
|---|---|
| `applyCivicLoadIndicator.js` | Computes civic-load stress indicator |
| `applyMigrationDrift.js` (~37 KB) | Applies migration drift to world state |
| `applyPatternDetection.js` | Detects recurring patterns across events |
| `applyShockMonitor.js` | Monitors for shock-level civic events |
| `computeRecurringCitizens.js` | Identifies citizens appearing repeatedly in events |
| `economicRippleEngine.js` (~39 KB) | Economic ripple effects from events |
| `filterNoiseEvents.js` | Filters low-signal events before prioritisation |
| `prePublicationValidation.js` | Validates event corpus before edition assembly |
| `prioritizeEvents.js` (~25 KB) | Scores and ranks events for editorial selection |
| `processArcLifeCyclev1.js` (~32 KB) | Arc lifecycle management (open → active → resolved) |
| `storylineHealthEngine.js` | Monitors storyline health metrics |
| `updateStorylineStatusv1.2.js` | Updates storyline tracker status columns |

### Phase 07 — Evening Media (`phase07-evening-media/`)

| File | Role |
|---|---|
| `applyStorySeeds.js` (~90 KB) | Applies calendar story seeds into the evening media packet |
| `buildEveningFamous.js` (~27 KB) | Builds the "Famous" section of the evening media packet |
| `buildEveningFood.js` (~29 KB) | Builds the "Food & Culture" section |
| `buildEveningMedia.js` (~28 KB) | Assembles the full evening media packet |
| `buildMediaPacket.js` (~27 KB) | Packages media output for export |
| `buildNightLife.js` (~30 KB) | Builds nightlife/entertainment section |
| `cityEveningSystems.js` (~19 KB) | City-level evening system updates |
| `culturalLedger.js` (~29 KB) | Cultural institution tracking ledger |
| `domainTracker.js` (~18 KB) | Per-domain (crime, civic, arts, sports…) event tracker |
| `mediaFeedbackEngine.js` (~50 KB) | Feeds media publication outcomes back into citizen state |
| `mediaRoomBriefingGenerator.js` (~92 KB) | Generates the full media room briefing document |
| `mediaRoomIntake.js` (~60 KB) | Intakes previously-published edition content |
| `parseMediaIntake.js` | Parses media intake Markdown |
| `parseMediaRoomMarkdown.js` (~30 KB) | Parses structured media room Markdown |
| `sportsStreaming.js` (~18 KB) | Sports streaming / play-by-play events |
| `storyHook.js` (~55 KB) | Generates story-hook suggestions for upcoming cycles |
| `storylineWeavingEngine.js` (~23 KB) | Weaves multiple storylines into coherent narrative arcs |
| `storylineWeavingEngine.chaos.test.js` | Chaos-mode weaving test |
| `textureTriggers.js` (~25 KB) | Atmospheric texture triggers (ambient events) |
| `updateMediaSpread.js` | Updates media spread metrics |
| `updateTrendTrajectory.js` | Updates trending topic trajectories |

### Phase 08 — V3 Chicago (`phase08-v3-chicago/`)

| File | Role |
|---|---|
| `chicagoSatellite.js` (~25 KB) | Chicago satellite city engine |
| `applyCycleRecovery.js` | Recovery logic for interrupted cycles |
| `applyDomainCooldowns.js` | Domain-level event cooldown enforcement |
| `v3preLoader.js` (~14 KB) | Pre-loads v3 data before main phase |
| `v3Integration.js` | Integrates v3 Chicago output into main sheet |
| `v3ChicagoWriter.js` (~16 KB) | Writes Chicago output to sheet tabs |
| `v3DomainWriter.js` (~15 KB) | Writes per-domain output |
| `v3NeighborhoodWriter.js` (~27 KB) | Writes neighbourhood-level output |
| `v3LedgerWriter.js` | Writes cycle ledger entries |
| `v3StoryHookWriter.js` | Writes story hooks to sheet |
| `v3TextureWriter.js` | Writes texture/atmosphere data |

### Phase 09 — Digest (`phase09-digest/`)

| File | Role |
|---|---|
| `applyCompressionDigestSummary.js` | Applies LLM-compressed summary to cycle digest |
| `applyCycleWeight.js` (~23 KB) | Calculates composite cycle-weight score |
| `finalizeCycleState.js` | Finalises and seals the current cycle state |

### Phase 10 — Persistence (`phase10-persistence/`)

| File | Role |
|---|---|
| `buildCyclePacket.js` (~44 KB) | Assembles the full cycle packet for archival |
| `commitSimulationLedger.js` | Commits the ledger row for the cycle |
| `compileHandoff.js` (~61 KB) | Compiles the handoff doc for next session |
| `cycleExportAutomation.js` (~18 KB) | Automates cycle export to Drive folders |
| `persistenceExecutor.js` (~17 KB) | Executes all persistence writes in sequence |
| `recordCycleWeather.js` | Records weather data to weather ledger |
| `recordMediaLedger.js` | Records media packet to media ledger |
| `recordWorldEventsv25.js` | Records world events (v2.5 schema) |
| `recordWorldEventsv3.js` (~17 KB) | Records world events (v3 schema) |
| `saveChaosCars.js` / `saveChaosCars.test.js` | Saves ChaosCars state + tests |
| `saveV3Seeds.js` | Saves V3 seed state for next cycle |

### Phase 11 — Media Intake (`phase11-media-intake/`)

| File | Role |
|---|---|
| `continuityNotesParser.js` (~11 KB) | Parses continuity notes from published editions |
| `healthCauseIntake.js` (~19 KB) | Intakes health/cause content from external sources |

---

## 4. scripts/ — Utility & Operations Layer

> Contains 150+ standalone scripts for maintenance, auditing, data migration, and editorial support. They run via Node.js (not GAS). Subdivided by concern below.

### 4.1 Engine-Level Audit & Testing

| File | Purpose |
|---|---|
| `engineAuditor.js` + `engineAuditor.integration.test.js` | Audits engine function registry for collisions and missing stubs |
| `engineCycleAudit.js` (~34 KB) | Full cycle audit report generator |
| `engine32MultiCycle.test.js` | Multi-cycle regression test for engine32 |
| `conductEngine.test.js` | Conduct engine unit tests |
| `aimGuard.test.js` | **9/9 tests** for the new `openSimSpreadsheet_` aim-guard (S289) |
| `contentLedgerLoader.test.js` | **14/14 tests** for `loadEventContentLedger_` (S289 Task 10) |
| `contentLedgerCompose.test.js` | **13/13 tests** for ledger-to-pool compose pipeline (S289 Task 11) |
| `biasFold.test.js` (25 tests) | Bias-fold event generation tests |
| `biasReadback.test.js` (18 tests) | Bias readback regression |
| `citizenDials.test.js` | Citizen dial regression tests |
| `citizenDialMultiCycle.test.js` | Multi-cycle dial tests |
| `chaosCarsCitizenDial.test.js` | ChaosCars dial tests |
| `chaosTrauma.test.js` | Chaos trauma integration |
| `citizensEventsFame.t3.test.js` | Citizens/Events/Fame tier-3 |
| `unlivedFold.test.js` | Unlived fold (23 tests) |
| `compressLifeHistory.dial.test.js` | Life-history compression dials |
| `buildWorldSummary.test.js` | World summary builder tests |
| `buildCitizenCards.test.js` | Citizen card builder tests |

### 4.2 Audit & Validation Scripts

| File | Purpose |
|---|---|
| `auditSheetHeaders.js` | Validates all sheet tab headers against SCHEMA_HEADERS |
| `auditBayTribune.js` | Audits Bay Tribune reporter assignments |
| `auditCanonDrift.js` | Detects canon drift in citizen/neighbourhood data |
| `auditGenericCitizens.js` | Audits generic-citizen row quality |
| `auditPhase5Headers.js` | Validates Phase 5 citizen-sheet headers |
| `auditRemainingHeaders.js` | Catches any remaining header mismatches |
| `auditSimulationLedger.js` | Validates simulation ledger integrity |
| `auditStorylineDomainRouting.js` | Audits storyline → domain routing tables |
| `auditWorldData.js` | Full world-data integrity audit |
| `auditFunctionCollisions.js` | Detects duplicate function names across GAS files |
| `auditPlanTagDrift.js` | Detects plan-tag drift between docs and code |
| `auditBayTribuneUnknowns.js` | Flags unknown entities in Bay Tribune data |
| `capabilityReviewer.js` | Reviews AI-generated content against capability constraints |
| `classifierGate.js` | Classification gate for editorial decisions |
| `gapLogGate.js` | Detects and logs coverage gaps |
| `finalArbiter.js` | Final editorial arbiter logic |

### 4.3 Builder / Packet Scripts

| File | Purpose |
|---|---|
| `buildDeskPackets.js` (~116 KB) | **Largest script.** Builds full journalist desk packets |
| `buildPlayerIndex.js` (~36 KB) | Builds player-character index |
| `buildCivicVoicePackets.js` (~38 KB) | Civic voice interview packets |
| `buildVoiceWorkspaces.js` (~30 KB) | Voice workspace documents |
| `buildCitizenCards.js` (~58 KB) | Citizen profile cards |
| `buildWorldSummary.js` (~30 KB) | World state summary document |
| `buildNeighborhoodCards.js` (~27 KB) | Neighbourhood info cards |
| `buildInitiativePackets.js` (~27 KB) | Initiative status packets |
| `buildArticleIndex.js` (~23 KB) | Bay Tribune article index |
| `buildBusinessCards.js` (~19 KB) | Business entity cards |
| `buildFaithCards.js` (~25 KB) | Faith community cards |
| `buildCulturalCards.js` (~22 KB) | Cultural institution cards |
| `buildInitiativeCards.js` (~22 KB) | Initiative summary cards |
| `buildInitiativeWorkspaces.js` | Initiative working documents |
| `buildDecisionQueue.js` (~19 KB) | Pending decision queue document |
| `buildDeskFolders.js` (~30 KB) | Creates journalist desk Drive folders |
| `buildArchiveContext.js` (~18 KB) | Archive context document builder |
| `buildNarrativeBridge.js` | Narrative bridge document |
| `buildNeighborhoodTexture.js` (~17 KB) | Neighbourhood atmosphere builder |
| `buildMaraReference.js` (~13 KB) | Mara Vance reference document |
| `buildMaraPacket.js` | Mara Vance packet |
| `buildFaithDigest.js` | Faith digest document |
| `buildCombinedManifest.js` | Combined manifest document |
| `buildPopidArticleIndex.js` | PopID article index |
| `emitFormatContractSections.js` (~41 KB) | Emits format-contract sections for editorial review |

### 4.4 Citizen & Column Maintenance

| File | Purpose |
|---|---|
| `addArcLifecycleColumns.js` | Adds arc-lifecycle columns to citizen sheet |
| `addCitizenFameColumns.js` | Adds fame-tracking columns |
| `addEducationCareerColumns.js` | Adds education/career columns |
| `addGenerationalWealthColumns.js` | Adds generational-wealth columns |
| `addGentrificationMigrationColumns.js` | Adds gentrification/migration columns |
| `addHouseholdFamilyColumns.js` | Adds household/family columns |
| `addMayoralVetoColumns.js` | Adds mayoral-veto columns |
| `addStorylineResolutionColumns.js` | Adds storyline-resolution columns |
| `addStorylineWeavingColumns.js` | Adds storyline-weaving columns |
| `backdateCitizenDials.js` | Backfills historical dial values |
| `backfillLifecycleDefaults.js` | Backfills lifecycle default values |
| `backfillNeighborhoodEducation.js` | Backfills neighbourhood education data |
| `applyCitizenBios.js` | Applies AI-generated citizen bios |
| `applyEconomicProfiles.js` | Applies economic profile templates |
| `applyFaithCanonSubsP3.js` | Applies faith canon substitutions |
| `applyTrackerUpdates.js` (~27 KB) | Applies batch tracker column updates |
| `cleanCitizenMediaUsage.js` | Cleans stale media-usage flags |
| `dedupWdCitizens.js` | De-duplicates world-data citizen rows |
| `enrichCitizenProfiles.js` (~17 KB) | Enriches citizen profiles via LLM |
| `citizenLifePoC.js` (~16 KB) | Citizen life proof-of-concept script |
| `citizen-wake.js` (~34 KB) | Citizen "wake" event generation |
| `citizen-signal-detector.js` (~15 KB) | Detects citizen signal events |

### 4.5 Edition / Intake Pipeline

| File | Purpose |
|---|---|
| `editionIntake.js` (~26 KB) | V1/V2 edition intake from Drive |
| `editionIntakeV3.js` (~18 KB) | V3 edition intake |
| `editionSeal.js` (~13 KB) | Seals and archives a published edition |
| `editionDiffReport.js` | Diff report between edition versions |
| `generate-edition-pdf.js` (~33 KB) | Generates edition PDF via Playwright/Puppeteer |
| `generate-edition-photos.js` (~31 KB) | Generates edition photo assets |
| `djDirect.js` (~38 KB) | DJ Direct music-event generation |
| `daily-reflection.js` (~15 KB) | Daily-reflection prompt runner |
| `discord-reflection.js` (~23 KB) | Discord-bot reflection commands |

### 4.6 Drive & Sheet Utilities

| File | Purpose |
|---|---|
| `backupSpreadsheet.js` | Copies the live spreadsheet to Drive archive |
| `crawlDriveArchive.js` | Inventories Drive archive folders |
| `crawlSheetsArchive.js` | Inventories Sheets archive |
| `downloadDriveArchive.js` | Downloads Drive archive to local disk |
| `diskInventory.js` | Local disk inventory |
| `diskClassify.js` | Classifies local disk files by type |
| `diskRefScan.js` | Scans for orphaned file references |
| `diskTriageReport.js` | Triage report for disk cleanup |
| `dumpLedger.js` | Dumps simulation ledger to local JSON |
| `aggregateNeighborhoodEconomics.js` | Aggregates neighbourhood economic metrics |
| `authorizeDriveWrite.js` | Authorizes Drive write scope |
| `gdrive_fetch.js` / `gdrive_fetch2.js` | Fetches files from Google Drive via API |
| `fetchDriveFile.js` / `downloadDriveFile.js` | Drive file download helpers |

### 4.7 Storyline & Arc Management

| File | Purpose |
|---|---|
| `assembleDecisions.js` (~20 KB) | Assembles pending decisions for player |
| `bindStorylineReporters.js` (~16 KB) | Binds reporters to storylines |
| `buildDecisionQueue.js` | Decision queue document |
| `cascadeMayorDecisions.js` (~14 KB) | Cascades mayor decisions to initiative tracker |
| `checkSupplementalTriggers.js` | Checks supplemental event triggers |
| `cleanupSimulationLedger.js` (~17 KB) | Cleans up stale ledger rows |
| `cleanupStorylineTracker.js` (~12 KB) | Cleans up storyline tracker |
| `closedPlanSweep.js` | Sweeps and archives closed plans |
| `checkBylineCadence.js` | Checks reporter byline cadence |
| `checkLetterEligibility.js` | Checks letter-to-editor eligibility |

### 4.8 LLM / AI Integration Scripts

| File | Purpose |
|---|---|
| `_compile_c97.js` (~13 KB) | Compiles cycle-97 context package for LLM |
| `_probe_classifier.js` (~14 KB) | Probes LLM classifier responses |
| `_probe_voice_grounded.js` | Probes grounded voice generation |
| `_probe_voice_openrouter.js` | Probes OpenRouter voice generation |
| `drainReflectionBacklog.js` | Drains queued reflection prompts |
| `ctxMap.js` | Context map generator for LLM sessions |
| `coverageReport.js` | Generates coverage report for LLM context |
| `capabilityReviewer.js` | Capability review via LLM |
| `daily-reflection.js` | Daily reflection via LLM |
| `discord-reflection.js` | Discord bot reflection via LLM |
| `extractExemplars.js` | Extracts exemplar events for LLM few-shot |
| `diagnosisRoutingMatcher.js` | Diagnoses routing-logic mismatches |

### 4.9 Sub-Directories inside `scripts/`

| Dir | Purpose |
|---|---|
| `scripts/__fixtures__/` | Test fixture data (JSON / GAS mocks) |
| `scripts/engine-auditor/` | Engine-auditor helper modules |
| `scripts/capability-reviewer/` | Capability-reviewer helper modules |

---

## 5. lib/ — Shared Library Modules

Pure-JS utility modules imported by both scripts and GAS files.

| Module | Purpose |
|---|---|
| `sheets.js` | Google Sheets API wrapper (batch reads/writes, header-by-name resolution) |
| `citizenDerivation.js` (~19 KB) | Derives citizen attributes from raw sheet row |
| `citizenDials.js` | Citizen dial (personality stat) schema and helpers |
| `citizenPage.js` (~10 KB) | Citizen page document builder |
| `canonBlocklist.js` | Canon blocklist — names/places that must not appear as generics |
| `canonNeighborhoods.js` | Canonical neighbourhood list with metadata |
| `districtMap.js` | District → neighbourhood mapping |
| `economicLookup.js` | Economic tier / income lookup tables |
| `editionParser.js` (~27 KB) | Parses published edition Markdown into structured data |
| `env.js` | Loads `.env` and validates required vars |
| `getCurrentCycle.js` | Returns current cycle number from sheet |
| `initiativePhaseContract.js` (~7 KB) | Defines the initiative phase-contract interface |
| `mags.js` (~30 KB) | Mags Corliss character / Bay Tribune editor module |
| `memoryFence.js` | Memory-fence utility (prevents stale-context writes) |
| `neighborhoodSlice.js` | Slices neighbourhood data by district |
| `personaProvider.js` (~9 KB) | Provides LLM persona prompts for named citizens |
| `photoGenerator.js` (~25 KB) | Photo / image asset generation via AI API |
| `pipelineLogger.js` | Structured pipeline step logger |
| `provocationBank.js` (~9 KB) | Bank of narrative provocation prompts |
| `reflectionClassifier.js` (~18 KB) | Classifies citizen reflection text by type |
| `resonanceRecall.js` (~9 KB) | Recalls resonant past events for context |
| `sessionLog.js` | Session activity logger |
| `staleness.js` | Detects stale data rows |
| `contextScan.js` | Scans context object for missing/invalid fields |
| `coverageAnchorRetirements.js` (~9 KB) | Manages retirement of coverage anchors |
| `diagnosticLedger.js` (~7 KB) | Ledger for diagnostic / debug output |

All `lib/` modules have co-located `*.test.js` files.

---

## 6. Supporting Directories

| Directory | Contents |
|---|---|
| `godworld/` | `memory.md` + `memory/` — in-world narrative memory store |
| `archive/` | Archived scripts and historical data |
| `legacy/` | Legacy script versions |
| `workbench/` | Experimental / scratch scripts (includes older `CODEBASE_MAP.md`) |
| `canon/` | Canon story documents |
| `config/` | Static configuration files |
| `data/` | Static reference data (JSON, CSV) |
| `dashboard/` | Dashboard HTML / GAS web app files |
| `editions/` | Published edition Markdown archives |
| `exports/` | Cycle export artifacts |
| `graphify-out/` | Graph visualisation output |
| `intake/` | Incoming media / editorial intake queue |
| `ledgers/` | Exported ledger snapshots |
| `maintenance/` | Scheduled maintenance scripts |
| `openclaw-skills/` | OpenClaw agent skill definitions |
| `output/` | Script output files |
| `riley/` | Riley character files |
| `templates/` | Document / email templates |
| `utilities/` | General-purpose utility scripts |
| `.agents/` | Agent instruction files |
| `.claude/` | Claude Code project config |
| `.gemini/` | Gemini model config |
| `.githooks/` | Git hooks (clasp gate check) |
| `.github/` | GitHub Actions workflows |

---

## 7. Schemas & Data

### `schemas/`

| File | Purpose |
|---|---|
| `SCHEMA_HEADERS.md` (~23 KB) | **Authoritative** column-header definitions for every sheet tab. Schema discipline rule: all new tab additions must update this file in the same commit. |
| `bay_tribune_roster.json` (~44 KB) | Canonical Bay Tribune reporter/editor roster |
| `Copy of Ledger_Index_Cycle_75.txt` | Historical ledger index snapshot |

### Key Sheet Tabs (from SCHEMA_HEADERS.md and code)

| Tab | Purpose |
|---|---|
| `Citizens` | Master citizen roster (Phase 5 primary target) |
| `WorldData` (WD) | City-level world state |
| `NeighborhoodState` | Per-neighbourhood dynamic state |
| `SimulationLedger` | One row per cycle — full audit trail |
| `StorylineTracker` | Active storyline states |
| `InitiativeTracker` | Civic initiative lifecycle |
| `EventLog` | Raw event emissions per cycle |
| `MediaLedger` | Published edition history |
| `BondTracker` | Citizen social bonds |
| `ChaosCars` | ChaosCars event state |
| `Event_Content_Ledger` | **(New — S289)** Author-controlled per-citizen event fragments with conditions DSL |

---

## 8. Documentation (`docs/`)

| Document | Purpose |
|---|---|
| `SPREADSHEET.md` | Sheet tab manifest — must match `SCHEMA_HEADERS.md`; drift detected by CI |
| `SCHEMA.md` | High-level schema overview |
| `SIMULATION_LEDGER.md` | Detailed ledger column documentation |
| `EDITION_PIPELINE.md` (~29 KB) | Full edition creation pipeline |
| `WORKFLOWS.md` (~16 KB) | Operator workflow guides |
| `STACK.md` (~11 KB) | Technology stack documentation |
| `ARCHITECTURE_VISION.md` | Long-horizon architecture goals |
| `BOOT_ARCHITECTURE.md` | Session boot / context-load process |
| `FOUR_COMPONENT_MAP.md` | Four-component system decomposition |
| `AUDITS.md` | Audit procedures and history |
| `DASHBOARD.md` (~24 KB) | Dashboard specification |
| `DISCORD.md` | Discord bot integration guide |
| `OPERATIONS.md` | Operational runbook |
| `ACTION_MANAGED_AGENTS.md` | Action-managed agent protocol |
| `MODEL_HIERARCHY.md` | AI model selection hierarchy |
| `GEMINI_OFFLOAD.md` | Gemini task-offload protocol |
| `SUPERMEMORY.md` (~64 KB) | Long-form simulation memory / world history |
| `WORLD_MEMORY.md` | World memory reference |
| `CLAUDE-MEM.md` (~11 KB) | Claude session memory |
| `RESEARCH.md` (~224 KB) | Extended research notes |
| `POST_MORTEM_C92_CONTAMINATION.md` | Post-mortem: C92 sandbox→live contamination event |
| `PRODUCT_VISION.md` | Product vision |
| `CANCELLATION.md` | Arc cancellation protocol |
| `index.md` (~136 KB) | Master index of all world entities |
| `docs/engine/` | Engine design docs |
| `docs/plans/` | Feature plans |
| `docs/adr/` | Architecture Decision Records |
| `docs/entities/` | Entity-specific docs (citizens, businesses, etc.) |
| `docs/canon/` | Canon narrative documents |
| `docs/concepts/` | Concept design docs |
| `docs/mara-vance/` | Mara Vance character dossier |
| `docs/mags-corliss/` | Mags Corliss character dossier |

---

## 9. Service Dependencies & Integrations

### Google Apps Script (GAS)

| Service | Usage |
|---|---|
| `SpreadsheetApp` | Primary data store — all simulation state lives in Google Sheets |
| `DriveApp` / Drive Advanced API v3 | Archive folders, file exports, backup copies |
| `Sheets Advanced API v4` | Batch reads/writes for performance |
| `PropertiesService` | Stores SPREADSHEET_ID, sandbox flags, `LIVE_SPREADSHEET_ID` |
| `Logger` / `Stackdriver` | Logging (exceptionLogging: STACKDRIVER) |
| `LockService` | Prevents concurrent cycle runs |
| `Utilities` | Digest / encode utilities |

### Node.js (local toolchain)

| Dependency | Usage |
|---|---|
| `@anthropic-ai/sdk` ^0.79.0 | LLM calls (Claude) for voice generation, reflection, bios |
| `googleapis` ^171.2.0 | Drive / Sheets API from Node scripts |
| `@google/clasp` ^3.1.3 | Push GAS source to script project |
| `discord.js` ^14.25.1 | Discord bot for reflection delivery |
| `better-sqlite3` ^12.6.2 | Local SQLite cache for cycle data |
| `playwright` / `puppeteer` | PDF generation, screenshot, edition photos |
| `xlsx` ^0.18.5 | Excel export utilities |
| `dotenv` ^17.2.3 | Environment variable loading |
| `js-yaml` ^4.1.1 | YAML config parsing |
| `@daytona/sdk` ^0.167.0 | Daytona sandbox integration |
| `eslint` ^8.57.0 | Linting |

### External Services

| Service | Usage |
|---|---|
| Anthropic API | LLM (Claude) — voice packets, citizen bios, reflections |
| OpenRouter API | Alternative LLM routing |
| Google Drive | Archive, edition PDFs, desk packets |
| Google Sheets | Simulation data store |
| Discord | Player-facing reflection delivery |

---

## 10. Test Coverage Inventory

Tests run via `node scripts/run-tests.js` (custom Jest-like runner).

| Test File | Scope | Count |
|---|---|---|
| `scripts/aimGuard.test.js` | `openSimSpreadsheet_` aim-guard | 9 |
| `scripts/contentLedgerLoader.test.js` | `loadEventContentLedger_` loader | 14 |
| `scripts/contentLedgerCompose.test.js` | Ledger → pool compose pipeline | 13 |
| `scripts/biasFold.test.js` | Bias-fold event generation | 25 |
| `scripts/biasReadback.test.js` | Bias readback | 18 |
| `scripts/citizenDials.test.js` | Citizen dials | ~10 |
| `scripts/citizenDialMultiCycle.test.js` | Multi-cycle dials | ~8 |
| `scripts/chaosCarsCitizenDial.test.js` | ChaosCars dials | ~5 |
| `scripts/chaosTrauma.test.js` | Chaos trauma | ~6 |
| `scripts/citizensEventsFame.t3.test.js` | Citizens / Events / Fame | ~6 |
| `scripts/conductEngine.test.js` | Conduct engine | ~9 |
| `scripts/unlivedFold.test.js` | Unlived fold | 23 |
| `scripts/buildWorldSummary.test.js` | World summary builder | ~20 |
| `scripts/buildCitizenCards.test.js` | Citizen card builder | ~12 |
| `scripts/engine32MultiCycle.test.js` | Engine32 multi-cycle | ~15 |
| `scripts/engineAuditor.integration.test.js` | Engine auditor | ~13 |
| `scripts/emitFormatContractSections.test.js` | Format contract sections | ~26 |
| `scripts/assembleDecisions.test.js` | Decision assembly | ~4 |
| `scripts/applyTrackerUpdates.contract.test.js` | Tracker updates contract | ~5 |
| `scripts/applyTrackerUpdates.gate.test.js` | Tracker updates gate | ~4 |
| `scripts/compressLifeHistory.dial.test.js` | Life-history compression | ~18 |
| `scripts/citizenReflectionWriteback.test.js` | Reflection writeback | ~6 |
| `scripts/archiveLifeHistory.test.js` | Life-history archive | ~5 |
| `scripts/checkLetterEligibility.test.js` | Letter eligibility | ~5 |
| `scripts/auditCanonDrift.test.js` | Canon drift | ~9 |
| `scripts/djDirect.schema-and-slot.test.js` | DJ Direct schema | ~6 |
| `scripts/generate-edition-pdf.section-normalize.test.js` | PDF section normalization | ~9 |
| `phase04-events/chaosCarsEngine.test.js` | ChaosCars engine | ~11 |
| `phase05-citizens/applyChaosDecay.test.js` | Chaos decay | ~4 |
| `phase10-persistence/saveChaosCars.test.js` | Save ChaosCars | ~3 |
| `phase07-evening-media/storylineWeavingEngine.chaos.test.js` | Storyline weaving chaos | ~2 |
| `lib/*.test.js` (20+ files) | Shared library unit tests | ~80 total |
| Contract test files (`*.contract.test.js`) | Sheet-header / API contracts | ~40 total |

**Total estimated: ~400+ test cases across the suite.**

---

## 11. Architecture Notes

### Simulation Clock
- Each "cycle" = 1 in-sim day. Real-world operator runs ~1 cycle per session.
- Cycle number tracked in `SimulationLedger` and `PropertiesService`.
- `phase01-config/advanceSimulationCalendar.js` ticks the clock; season/holiday/weather resolved here.

### Data Flow
```
Google Sheet (source of truth)
    ↕ openSimSpreadsheet_()  [aim-guarded]
GAS Engine (godWorldEngine2.js)
    → safePhaseCall_() x11 phases
    → Each phase reads/mutates sheet tabs
    → PropertiesService for cross-call state
    ↕ Drive API
Archive folders / Desk packets / Edition PDFs
```

### Content Ledger (S289 — NEW)
- New sheet tab: `Event_Content_Ledger` (9 columns: Source, Condition, Active, Fragment, VENUE, INSTITUTION, CONTACT, Weight, Tags)
- Loader: `phase02-world-state/loadEventContentLedger.js` — fail-closed, by-header resolution, conditions DSL pre-compiled to predicates
- Composer: pool-injection into `generateCitizensEvents.js` via additive merge
- Source routing: must match `primaryFromTags` whitelist; unknown source falls to `Daily`
- Draw-time gate: conditions checked against citizen scopes at event draw (not pre-filter)
- Dedup: skeleton-level AND rendered-level `cycleSeen` tracking

### Aim Guard (`openSimSpreadsheet_()` — S289 — NEW)
- Compares script's bound container against resolved write target via `PropertiesService`
- Blocks cross-target writes from unaimed copies (prevents sandbox→live contamination)
- Escape hatch: `ALLOW_CROSS_TARGET=1` property
- Covers: cycles, dry-run, exports, intake — all callers of `openSimSpreadsheet_()`

### Schema Discipline
- Every new sheet tab → same-commit update to `schemas/SCHEMA_HEADERS.md` + `docs/SPREADSHEET.md`
- `auditSheetHeaders.js` detects drift
- STUB_MAP regen required when adding new functions

### Versioning Conventions
- File version suffixes (e.g., `v1.2.js`, `v25`, `v3`) indicate **in-service major revisions** — older versions kept for reference but may be superseded
- `cleanup_storyline_tracker.js` vs `cleanupStorylineTracker.js` — duplicate naming pattern; prefer camelCase version

---

## 12. Flags: Deprecated Patterns, Risks & Undocumented Entry Points

### ⚠️ Deprecated / Legacy Patterns

| Item | Location | Notes |
|---|---|---|
| `recordWorldEventsv25.js` | `phase10-persistence/` | Superseded by `recordWorldEventsv3.js`; kept for reference |
| `cleanup_storyline_tracker.js` | `scripts/` | Duplicate of `cleanupStorylineTracker.js`; snake_case is the older version |
| `buildWorldEngine2.js` (implicit older versions) | — | Only v2 is active; v1 logic subsumed |
| `gdrive_fetch2.js` | `scripts/` | Appears to be a minor variant of `gdrive_fetch.js`; likely redundant |
| `editionIntake.js` vs `editionIntakeV3.js` | `scripts/` | V1/V2 vs V3 split; V3 is current |
| `updateStorylineStatusv1.2.js` | `phase06-analysis/` | Version suffix in filename — check if superseded |
| `day1` (root) | `/day1` | Unexplained 6-byte file; **undocumented entry point** — purpose unclear |

### 🔴 Risks & Safety Notes

| Risk | Details |
|---|---|
| **Sandbox → live contamination** | Post-mortem at `docs/POST_MORTEM_C92_CONTAMINATION.md`. S289 added `aimGuard` to `openSimSpreadsheet_()` to block this class of error. |
| **Multi-copy script state** | Bound GAS scripts inherit code but NOT `PropertiesService` — unaimed copies default to LIVE spreadsheet ID. Now blocked by aim-guard. |
| **Cycle dedup gap (pre-S289)** | `cycleSeen` in `generateCitizensEvents.js` previously stored only rendered text; skeleton-level dedup now added for ledger fragments. |
| **Schema drift** | `SCHEMA_HEADERS.md` and `SPREADSHEET.md` must be updated atomically with new tabs. Drift caught by `auditSheetHeaders.js`. |
| **LLM API secrets** | Anthropic/OpenRouter API keys live in `.env` (gitignored). Ensure `.env.example` is the only committed reference. |

### 🟡 Undocumented / Implicit Entry Points

| Entry Point | Notes |
|---|---|
| `godWorldEngine2.js` — `onOpen()` / `onEdit()` GAS triggers | GAS triggers are defined inside the engine; not listed in `appsscript.json` explicitly — inspect GAS project for trigger registrations |
| `ecosystem.config.js` PM2 processes | `discord-reflection.js`, `daily-reflection.js`, possibly others run as persistent daemons; lifecycle not documented in `OPERATIONS.md` beyond basics |
| `scripts/run-tests.js` | Custom test runner referenced in `package.json test` script; not present in the file listing — may be in a subdirectory or generated |
| `maintenance/` directory | Contents not explored; may contain scheduled GAS time-based triggers |
| `openclaw-skills/` | Agent skill definitions; invocation protocol not mapped |
| `phase08-v3-chicago/applyCycleRecovery.js` | Recovery logic for interrupted cycles — exact trigger conditions undocumented |

### 🟡 Potential Circular Dependencies

No explicit circular `require()` dependencies detected in the lib/ modules (they are individually self-contained). However:
- `godWorldEngine2.js` calls phases that each call back into shared utilities loaded at engine init — verify `loadEventContentLedger_` is called before `generateCitizensEvents.js` phase (confirmed: registered at L226 + L1568).
- `buildDeskPackets.js` is extremely large (~116 KB) and likely consolidates imports from many lib modules — monitor for implicit coupling.

---

## 13. Recent Changes (last 24 h)

All 10 commits are part of **sprint S289 [engine-sheet]**, focused on adding the `Event_Content_Ledger` tab and associated safety infrastructure.

| Commit | SHA | Summary |
|---|---|---|
| 1 | `05134fa` | NEXT: S290 opener — G-RC5 sign-aware seed work rehearsed on sandbox (dummy data ok, Mike-direct) |
| 2 | `90f233c` | Loose-end sweep: STUB_MAP regen (`loadEventContentLedger_` + composer helpers) + engine.38 row gains seams-plan pointer |
| 3 | `590e35c` | PIN v3.5 + NEXT true-up: S289 window live (sandbox-proven), real C101 = live smoke after sports load |
| 4 | `a62928c` | Seams plan: sandbox rehearsal record + Task 12 authoring rules (weights house-scale, whitelisted sources, skipped-log check, draw-time gate semantics) |
| 5 | `95c854c` | C102 rehearsal fixes: skeleton-level within-cycle dedup + loud skipped-row log |
| 6 | `2e0e746` | **Aim-guard**: `openSimSpreadsheet_` now blocks unaimed copies from writing cross-sheet; 9/9 `aimGuard.test.js` pass |
| 7 | `bb0cc50` | Atmospheric plan: Finding #1 reconcile — items 4/6/7 shipped-status contradiction annotated |
| 8 | `4c1add4` | Seams Task 11 (Design A): fragment composer + pool injection — the library opens; 12/12 `contentLedgerCompose.test.js` |
| 9 | `3ee4e47` | Seams Task 10 (Design A): `Event_Content_Ledger` tab + fail-closed loader — 14/14 `contentLedgerLoader.test.js` |
| 10 | `2823172` | Seams plan: Design A pre-build critique folded in — pool-injection bridge, fail-closed routing, DSL resolver table |

**Key files introduced / significantly modified in this sprint:**
- `phase02-world-state/loadEventContentLedger.js` ← NEW
- `scripts/aimGuard.test.js` ← NEW
- `scripts/contentLedgerLoader.test.js` ← NEW
- `scripts/contentLedgerCompose.test.js` ← NEW
- `phase01-config/godWorldEngine2.js` — aim-guard integration + ledger loader registration
- `phase05-citizens/generateCitizensEvents.js` — pool injection + skeleton dedup + skipped-row logging
- `schemas/SCHEMA_HEADERS.md` — `Event_Content_Ledger` tab schema added
- `docs/SPREADSHEET.md` — `Event_Content_Ledger` row added

---

*Map generated by automated codebase-mapping agent on 2026-07-03. Re-run on any push to main.*
