# GodWorld Engine Map

**What this is:** Every function the engine calls, in execution order. What file it lives in, what it does.

**Source:** `phase01-config/godWorldEngine2.js` v2.14 — two identical engine paths (live + dry-run/replay).

**Last verified:** 2026-05-30, Session 248 (engine-sheet /doc-audit engine). **Phase dispatch sequence changes since S120**: S188 §5.6 redesign added Phase 1 `initSimulationLedger_(ctx)` pre-phase-04 + Phase 10 `commitSimulationLedger_(ctx)` bookends for shared `ctx.ledger` shape; S205 commented out `Phase5-GenericCitizens` call sites (2 of them — `runCyclePhases_` line 192 + `runWorldCycle_` line 1501) per Path B no-grow-legacy decision (generator file retained for reversibility); **S229 commented out `Phase8-ChicagoCitizens` + `Phase10-Chicago` call sites** (4 of them across production + cycle-phases entry points) per Path B no-grow-legacy decision (Chicago canonically dead in sim; generator file `phase05-citizens/generateChicagoCitizensv1.js` retained for reversibility). All other Phase 5/7/8/10 entries unchanged. **S207→S248 engine-sheet touches:**
- **S229** `7b68695` (Phase 42 §3.5 batch 1 — runCivicElectionsv1 v1.1→v1.2: L394 appendRow → queueAppendIntent_(Election_Log), L432 setValues → queueRangeIntent_(Civic_Office_Ledger), L213-219 lazy-create stays direct as schema-setup carve-out), `5d25656` (§3.5 batch 2 — generateChicagoCitizens L173 inline carve-out comment; bondEngine L1417 dead-fallback REMOVED + replaced with fail-loud throw), `a1eb569` (§3.5 batch 3 — **Chicago Path B DISABLE**: 4 safePhaseCall_ sites commented in godWorldEngine2.js), `7ab89ab` (engine.4 Faith_Ledger orphan-status closed via S180-consumer audit, doc-only), `c3809cc` (engine.11 chaos-cars Phase 1 T1.4 — `lib/chaosCarsConfig.js` shipped, 158 LOC, 21-token FORBIDDEN_OUTCOMES, 66 assertions across 8 test groups). 2 clasp deploys live S229.
- **S232** Node-side only — `d5fae07` (canon.3 T6 buildCitizenCards.js Errors-gate + emitErrorGateDump helper + cycle resolution chain + 10-assertion test suite), `796ec36` (T8 auditCanonDrift.js proper-noun extraction + 25-assertion test suite), `7b5a9cb` (T9 canon3_backfill_t9.js dry-run-then-apply: 2 squatter updates + 16 appends POP-00958..00973), `17a228f` (followup squatter realignment POP-00954..00957), `c027d61` (**ingestPublishedEntities.js root-cause fix** — extractLetterFooterSignals + detectGenderFromPronouns + enrichCandidateWithProseSignals integration + 15-assertion test suite). Sim_Ledger 836→858 rows.
- **S233** Node-side only — `87c0096` (canon.3 T7 ingest-side bay-tribune cross-check + buildBayTribuneNameIndex/loadSimLedgerNames/loadSheetNameColumn export refactor on auditCanonDrift.js + 13-assertion test suite), `9368ae2` (T10 INSTITUTIONS.md Citizens § + Corrections Forward subsection + CANON_RULES.md active-maps list), `50be447` (T11 POPID alias resolver — `POPID_ALIASES = { 'POP-00020': { canonicalPopId: 'POP-00003', surfaceNamePattern: /^mark\s+aitken$/i } }` + resolvePopIdAlias helper + name-scoped to prevent Elena-Vásquez no-contamination case + 13-assertion test suite). No clasp deploys.
- **S234** Node-side only — `9a5d0c5` (/doc-audit engine + data pass — substrate-state refresh: TERMINAL §Current Engine State C92→C94 + LEDGER_AUDIT S199→S234 with 22-row delta + LEDGER_HEAT_MAP stamp-pass + ENGINE_REPAIR stamp + 3 log entries + Row 8 §3.5 closure update + SIMULATION_LEDGER + SPREADSHEET stamps + AUDITS.md run history + /doc-audit tracker), `a5072fe` (engine.26 closed — assertParserSanity helper extracted at `ingestPublishedEntities.js` mirroring engine.24 NAMES INDEX guard pattern + BUSINESSES NAMED guard at callsite + 14-assertion test suite covering silent-pass + throw + empirical-regression + edge cases; 3 scope corrections caught pre-write — filed-scope file-name typo + S229 dry-run claim inaccuracy + irrelevant line-number reference), `aa8ba49` (engine.25 G-PR6 closed — `normalizeSectionId(s)` helper at `generate-edition-pdf.js` collapsing `[_\s]+` runs into single space + symmetric application at 4 comparison sites — `findPhotoForSection` + `photoSections` index + missing-sections scan + module.exports + require.main guard for testability + 17-assertion test suite covering pure-function exhaustive + findPhotoForSection wiring + empirical C94 manifest fixture). No clasp deploys.
- **S312** `e914e855`+`380e3594` (**engine.52 Oakland_Hospital** — `generationalEventsEngine` v2.7→v2.8: health lifecycle moved ABOVE the mode gate (all modes transition; milestones stay ENGINE/CIVIC), `checkHealthEvent_` incidence ×(illnessRate/0.05) + severity shift ≥0.08, moderate→injured/serious-condition 30% branch with status-matched log lines, `ctx.summary.hospitalEvents` collector; `buildCyclePacket` +`persistHospitalLedger_` — lazy-creates Hospital_Ledger, open/close admission rows, `ctx.summary.hospitalCensus` + packet census line; `runCareerEngine` hospital gate + one-time income hit ([IncomeHit A{n}] marker); `runHouseholdEngine` hospital-strain pool. SL schema 50→52 cols AY/AZ), `2d7aabc4` (**bond-key repair** — `bondPersistence` +`normalizeBondCitizenId_` at persist boundary; `bondEngine` `makeBond_` POPID-canonical + dual-shape membership map preserving Row-33 intensity updates). **Phase dispatch sequence UNCHANGED.** Deploys: sandbox only (byte-OK); prod rides C102-smoke batch.
- **S248** `d173310` (**engine.5 Phase 2b Track 1 — `generationalEventsEngine` v2.6→v2.7**: milestone events now mutate structural state — wedding→`MaritalStatus='married'`, birth→`NumChildren++` (off-sample per Mike's seam decision); 2 indices added (iMarital/iNumChildren) + 2 in-place `row[]` mutations at the wedding/birth call-sites. **DEPLOY HELD for C96** — NOT live; phase dispatch sequence + function set UNCHANGED, so the call-order map below still holds), `7ee5d87` + `9a532ad` (doc-only — ENGINE_REPAIR Rows 24/25 + `docs/plans/2026-05-30-citizen-lifecycle-fame-system` + ROLLOUT engine.29). No clasp deploys (Track 1 committed local, awaits C96 deploy window).

**S186→S206 engine-sheet touches:**
- **S188** `0e31e66..6609c4a` (9 commits) — §5.6 phase05-ledger redesign: 23 cycle-path SL touchers + Phase 1 init + Phase 10 commit handler migrated to shared `ctx.ledger`; cohort-A/B writers + spec'd readers + audit-miss readers + processIntake_ Phase 10 clobber fix.
- **S199** `2cbe045..eb3cbcb` (~28 commits, 6 workstreams) — civicInitiativeEngine v1.9 (G-R11 vote-trigger reschedule), Phase 19 collisions cleared 16→0 (auditFunctionCollisions.js detector + 11 commits Phase A/B.1-B.6), recordWorldEventsv3 v3.7 ev.domain UPPERCASE, ledger-doc refresh.
- **S200** `a829c7f..12cf9ce` (6 commits) — ENGINE_REPAIR Row 18 cohort-C migration: householdFormationEngine v1.2 + generationalWealthEngine v2.1 + educationCareerEngine v2.1 + migrationTrackingEngine v1.1 all routed through `ctx.ledger`; A7 amendment for file-name-vs-`process*_`-name dispatch lesson.
- **S204** `40981ee..3f3ac3c` (9 commits) — Phase 42 B2 batch CLOSED (8 of 8) + Row 21 §5.6 half-migration FIX (`fd9758e` runNeighborhoodEngine v2.5 read-side aliasing).
- **S205** `dc465c6` (Phase 42 B3-B7 deferred-list triage CLOSED, 5 files / 11 sites classified), `d89693f` (**Phase5-GenericCitizens DISABLED — both call sites commented out**), `0f89860` (Path B reader rewire — runYouthEngine drops getGenericYouth_ + citizenContextBuilder drops findInGenericCitizens_ + buildDeskPackets dead read removed), `aff403c` (hookLifecycle stale-pointer fix).
- **S206** `dc8ff22` (T2.6 + T2.7 Engine A wired into applyStorySeeds v3.10→v3.11 + saveV3Seeds v3.5→v3.6 + Story_Seed_Deck cols 12→15), `3fead54` (T3.5a + T3.6 + T3.7 Engine B wired into applyStorySeeds v3.11→v3.12 + saveV3Seeds v3.6→v3.7 + Story_Seed_Deck 15→18 + Storyline_Tracker 25→26 AssignedReporter col).

**S180/S181 verification preserved:** Phase 38 auditor, Phase 39 reviewer lanes, and Phase 40 architecture hardening all shipped S146-S156 as cross-cutting work OUTSIDE this map: Phase 38 auditor runs as Node script `scripts/engineAuditor.js` (post-cycle), Phase 39 reviewers run as Node scripts (`finalArbiter.js`, `rheaTwoPass.js`, `capabilityReviewer.js`, `rewardHackingScanner.js`, `tierClassifier.js`) in the edition review lane, Phase 40 is hooks + settings + credential layout + `utilities/safeRand.js` helper. None alter the phase*/ dispatch below. **Phase 42 (writer consolidation §5.6 + B-batch migrations) DOES touch the dispatch via the Phase 1 init + Phase 10 commit bookends added S188** — see `docs/engine/PHASE_42_PATTERNS.md` Changelog for full history.

**S156 helper added:** `utilities/safeRand.js` — `safeRand_(ctx)` is the canonical deterministic RNG resolver called from every phase. Returns `ctx.rng` or throws; never silently falls back to `Math.random`. Replaces 57 inline fallbacks across phases. See `docs/engine/tech_debt_audits/2026-04-15.md`.

---

## Phase 1: CONFIG + TIME

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 1-LoadConfig | `loadConfig_()` | godWorldEngine2.js | Load World_Config sheet, set ctx.config |
| 1-AdvanceTime | `advanceWorldTime_()` | godWorldEngine2.js | Increment cycle counter, set simulation date |
| 1-Calendar | `advanceSimulationCalendar_()` | phase01-config/advanceSimulationCalendar.js | Set holiday, season, isFirstFriday, isCreationDay on ctx.summary |
| 1-ResetAudit | `resetCycleAuditIssues_()` | godWorldEngine2.js | Clear previous cycle's audit flags |
| 1-PrevEvening | `loadPreviousEvening_()` | phase01-config/loadPreviousEvening.js | Load previous cycle's evening snapshot from PropertiesService. **S116** |

**ctx.summary after Phase 1:** `cycleId`, `simDate`, `simYear`, `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `previousEvening`

---

## Phase 2: WORLD STATE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 2-SeasonalWeights | `applySeasonalWeights_()` | phase02-world-state/applySeasonWeights.js | Season-based multipliers for event domains |
| 2-SportsSeason | `applySportsSeason_()` | phase02-world-state/applySportsSeason.js | Read Oakland_Sports_Feed, set sportsSeason from SeasonType, store sportsFeedEntries (v3.0) |
| 2-SportsFeed | `applySportsFeedTriggers_()` | phase02-world-state/applySportsSeason.js | Oakland feed → sentiment, triggers, neighborhood effects. Now wires FanSentiment, PlayerMood, FranchiseStability, EconomicFootprint, CommunityInvestment, MediaProfile (v3.0 S137b) |
| 2-CivicSentiment | `loadCivicVoiceSentiment_()` | phase02-world-state/applyInitiativeImplementationEffects.js | Load civic voice sentiment from decision files. Sets S.civicVoiceSentiment for EditionCoverage compounding (v1.0 S137b) |
| 2-EditionCoverage | `applyEditionCoverageEffects_()` | phase02-world-state/applyEditionCoverageEffects.js | Per-domain media ratings (-5 to +5) → sentiment, domain cooldowns, neighborhood effects, story triggers. Compounds with civic voice sentiment (v2.0 S137b) |
| 2-InitiativeEffects | `applyInitiativeImplementationEffects_()` | phase02-world-state/applyInitiativeImplementationEffects.js | Reads ImplementationPhase from Initiative_Tracker → domain ripples into AffectedNeighborhoods. Active programs benefit, stalled programs harm (v1.0 S137b) |
| 2-Weather | `applyWeatherModel_()` | phase02-world-state/applyWeatherModel.js | Temperature, precipitation, visibility, wind, fronts |
| 2-CityDynamics | `applyCityDynamics_()` | phase02-world-state/applyCityDynamics.js | Sentiment, cultural activity, community engagement, nightlife |
| 2-Transit | `updateTransitMetrics_Phase2_()` | phase02-world-state/updateTransitMetrics.js | Transit ridership, delays, construction status |

**ctx.summary after Phase 2:** adds `weather`, `sportsSeason`, `sportsFeedEntries`, `activeSports`, `cityDynamics`, `seasonalWeights`, `transitMetrics`, `editionSentimentBoost`, `editionDomainBalance`, `editionCoverageTriggers`, `editionNeighborhoodEffects`, `editionCoverageEffects`, `civicVoiceSentiment`, `initiativeImplementationEffects`, `initiativeNeighborhoodEffects`, `initiativeImplementationTriggers`

---

## Phase 3: POPULATION + DEMOGRAPHICS

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 3-Population | `updateWorldPopulation_()` | godWorldEngine2.js | Birth/death/migration numbers for World_Population |
| 3-Demographics | `applyDemographicDrift_()` | phase03-population/applyDemographicDrift.js | Age/income/education shifts across neighborhoods |
| 3-CrisisSpikes | `generateCrisisSpikes_()` | phase03-population/generateCrisisSpikes.js | Acute crisis events (housing, health, etc.) |
| 3-CrisisBuckets | `generateCrisisBuckets_()` | phase03-population/generateCrisisBuckets.js | Categorize crisis events by domain |
| 3-Crime | `updateCrimeMetrics_Phase3_()` | phase03-population/updateCrimeMetrics.js | QoL index, patrol strategy, hotspots, enforcement capacity |
| 3-NeighborhoodDemo | `updateNeighborhoodDemographics_()` | phase03-population/updateNeighborhoodDemographics.js | Per-neighborhood population/income/age stats |

**ctx.summary after Phase 3:** adds `populationMetrics`, `demographicDrift`, `crisisSpikes`, `crisisBuckets`, `crimeMetrics`

---

## Phase 4: RECOVERY + WORLD EVENTS

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 4-CycleRecovery | `applyCycleRecovery_()` | phase08-v3-chicago/applyCycleRecovery.js | Recover stale/stuck state from previous cycles |
| 4-DomainCooldowns | `applyDomainCooldowns_()` | phase08-v3-chicago/applyDomainCooldowns.js | Prevent domain event spam (cooldown timers) |
| 4-WorldEvents | `worldEventsEngine_()` | phase04-events/worldEventsEngine.js | Generate chaos/crisis world events |
| 4-FaithEvents | `runFaithEventsEngine_()` | phase04-events/faithEventsEngine.js | Faith community events |

**ctx.summary after Phase 4:** adds `worldEvents`, `faithEvents`, `domainCooldowns`

---

## Phase 5: CITIZENS + RELATIONSHIPS (largest phase)

### 5a: Event Generation

| Step | Function | File | Who it processes | Gate |
|------|----------|------|-----------------|------|
| ~~5-GenericCitizens~~ | ~~`generateGenericCitizens_()`~~ | ~~phase05-citizens/generateGenericCitizens.js~~ | **DISABLED S205** — Path B no-grow-legacy decision; SL is single source for citizens; both call sites commented out at `phase01-config/godWorldEngine2.js:192` + `:1501`. Generator file retained for reversibility. | — |
| 5-GenericMicroEvents | `generateGenericCitizenMicroEvents_()` | phase04-events/generateGenericCitizenMicroEvent.js | Tier 3-4 ENGINE citizens | ClockMode check |
| 5-GameModeMicroEvents | `generateGameModeMicroEvents_()` | phase04-events/generateGameModeMicroEvents.js | GAME mode citizens | `mode !== "GAME"` skip |
| 5-CivicModeEvents | `generateCivicModeEvents_()` | phase05-citizens/generateCivicModeEvents.js | CIVIC mode citizens | `mode !== "CIVIC"` skip |
| 5-MediaModeEvents | `generateMediaModeEvents_()` | phase05-citizens/generateMediaModeEvents.js | MEDIA mode citizens | `mode !== "MEDIA"` skip |

### 5b: Schema Ensure (idempotent setup)

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-EnsureEventsLedger | `ensureWorldEventsLedger_()` | phase04-events/worldEventsLedger.js | Ensure World_Events sheet exists |
| 5-EnsureMediaLedger | `ensureMediaLedger_()` | utilities/ensureMediaLedger.js | Ensure Media_Ledger sheet exists |
| 5-EnsureEventsV3 | `ensureWorldEventsV3Ledger_()` | utilities/ensureWorldEventsV3Ledger.js | Ensure v3 events ledger exists |
| 5-EnsureBonds | `ensureRelationshipBondSchemas_()` | utilities/ensureRelationshipBonds.js | Ensure bond sheets exist |

### 5c: Relationship + Civic Systems

| Step | Function | File | Who it processes | Gate |
|------|----------|------|-----------------|------|
| 5-LoadBonds | `loadRelationshipBonds_()` | phase05-citizens/bondPersistence.js | All citizens | — |
| 5-SeedBonds | `seedRelationshipBonds_()` | phase05-citizens/seedRelationBondsv1.js | Citizens without bonds | — |
| 5-Relationships | `runRelationshipEngine_()` | phase05-citizens/runRelationshipEngine.js | ENGINE citizens without UNI/MED/CIV flags | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Neighborhoods | `runNeighborhoodEngine_()` | phase05-citizens/runNeighborhoodEngine.js | ENGINE citizens without UNI/MED/CIV flags | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Universe | `runAsUniversePipeline_()` | phase05-citizens/runAsUniversePipeline.js | UNI-flagged citizens ONLY | `!isUNI` skip |
| 5-CivicRoles | `runCivicRoleEngine_()` | phase05-citizens/runCivicRoleEngine.js | CIV-flagged citizens | CIV check |
| 5-Elections | `runCivicElections_()` | phase05-citizens/runCivicElectionsv1.js | Council election logic | — |
| 5-Initiatives | `runCivicInitiativeEngine_()` | phase05-citizens/civicInitiativeEngine.js | Initiative_Tracker sheet | — |
| 5-ApprovalRatings | `updateCivicApprovalRatings_()` | phase05-citizens/updateCivicApprovalRatings.js | Dynamic approval from initiative performance + media + district alignment. Writes to Civic_Office_Ledger Approval column. Triggers: vulnerable (<30), recall-pressure (<20), popular (>80) (v1.0 S137b) | — |

### 5d: Lifecycle Engines (ENGINE mode only, flag-excluded)

| Step | Function | File | Gate |
|------|----------|------|------|
| 5-Career | `runCareerEngine_()` | phase05-citizens/runCareerEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Education | `runEducationEngine_()` | phase05-citizens/runEducationEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Household | `runHouseholdEngine_()` | phase05-citizens/runHouseholdEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Generational | `runGenerationalEngine_()` | phase04-events/generationalEventsEngine.js | `mode !== "ENGINE" && mode !== "CIVIC"` skip |
| 5-Youth | `runYouthEngine_()` | phase05-citizens/runYouthEngine.js | Age-gated |

### 5e: Bond Processing

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-Bonds | `runBondEngine_()` | phase05-citizens/bondEngine.js | Process alliance/rivalry/mentorship bonds |

### 5f: Intake + Named Citizen Updates

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-Intake | `processIntake_()` | phase05-citizens/processIntakeV3.js | Process new citizen intake rows |
| 5-NamedCitizens | `updateNamedCitizens_()` | godWorldEngine2.js | Update named citizen status/fields |
| 5-CitizenEvents | `generateCitizensEvents_()` | phase05-citizens/generateCitizensEvents.js | ENGINE-only citizen life events (rich pipeline) |
| 5-Promotions | `checkForPromotions_()` | phase05-citizens/checkForPromotions.js | Career promotions |
| 5-Advancement | `processAdvancementIntake_()` | phase05-citizens/processAdvancementIntake.js | Process advancement intake rows | **⚠ AUDIT:** Writes `ctx.summary.advancementResults` — nothing reads it. |

### 5g: Tier-5 Engines (direct sheet writes)

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-HouseholdFormation | `processHouseholdFormation_()` | phase05-citizens/householdFormationEngine.js | Marriage, household creation |
| 5-GenerationalWealth | `processGenerationalWealth_()` | phase05-citizens/generationalWealthEngine.js | Wealth accumulation, inheritance |
| 5-EducationCareer | `processEducationCareer_()` | phase05-citizens/educationCareerEngine.js | Education-career link |
| 5-Gentrification | `processGentrification_()` | phase05-citizens/gentrificationEngine.js | Displacement risk, neighborhood change |
| 5-MigrationTracking | `processMigrationTracking_()` | phase05-citizens/migrationTrackingEngine.js | Migration intent, movement |

---

## Phase 6: ANALYSIS + PATTERN DETECTION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 6-FilterNoise | `filterNoiseEvents_()` | phase06-analysis/filterNoiseEvents.js | Remove low-signal events |
| 6-Prioritize | `prioritizeEvents_()` | phase06-analysis/prioritizeEvents.js | Rank events by importance |
| 6-Spotlights | `applyNamedCitizenSpotlights_()` | phase05-citizens/applyNamedCitizenSpotlight.js | Highlight named citizens for coverage |
| 6-RecurringCitizens | `computeRecurringCitizens_()` | phase06-analysis/computeRecurringCitizens.js | Identify citizens appearing in multiple data sources |
| 6-CivicLoad | `applyCivicLoadIndicator_()` | phase06-analysis/applyCivicLoadIndicator.js | Civic system strain level |
| 6-EconomicRipple | `runEconomicRippleEngine_()` | phase06-analysis/economicRippleEngine.js | Business economic triggers. Reads `S.careerSignals` from Career Engine, writes `S.economicMood`. |
| 6-InitiativeRipple | `applyActiveInitiativeRipples_()` | (conditional) | Initiative cascading effects |
| 6-Migration | `applyMigrationDrift_()` | phase06-analysis/applyMigrationDrift.js | Population movement trends. Reads `S.economicMood` from Economic Ripple. |
| 6-PatternDetect | `applyPatternDetection_()` | phase06-analysis/applyPatternDetection.js | Multi-cycle pattern recognition. Writes `S.patternFlag` (9+ readers). `S.patternCalendarContext` is orphaned. |
| 6-ShockMonitor | `applyShockMonitor_()` | phase06-analysis/applyShockMonitor.js | Detect sudden state changes |
| ~~6-ArcLifecycle~~ | ~~`processArcLifecycle_()`~~ | — | **Moved to Phase 8** (S116). Was no-op here — arcs load in Phase 8. |
| ~~6-StorylineStatus~~ | ~~`updateStorylineStatus_()`~~ | — | **Moved to Phase 8** (S116). Depends on arc data. |
| 6-Textures | `textureTriggerEngine_()` | phase07-evening-media/textureTriggers.js | Generate neighborhood texture triggers |
| 6-TransitSignals | `getTransitStorySignals_()` | (conditional) | Transit-related story signals |
| 6-FaithSignals | `getFaithStorySignals_()` | (conditional) | Faith-related story signals |
| 6.5-Validation | `prePublicationValidation_()` | phase06-analysis/prePublicationValidation.js | Data integrity checks |

---

## Phase 7: EVENING MEDIA + STORY GENERATION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 7-CityEvents | `buildCityEvents_()` | phase04-events/buildCityEvents.js | City-level event compilation. **SETS** `S.cityEvents` |
| 7-Nightlife | `buildNightlife_()` | phase07-evening-media/buildNightLife.js | Nightlife scene generation. **SETS** `S.nightlife`, `S.nightlifeVolume` |
| 7-Sports | `buildEveningSportsAndStreaming_()` | phase07-evening-media/sportsStreaming.js | Feed-driven S.eveningSports from sportsFeedEntries + streaming trends (v3.0) |
| 7-Food | `buildEveningFood_()` | phase07-evening-media/buildEveningFood.js | Restaurant/food scene events. Reads `S.nightlifeVolume` |
| 7-Famous | `buildEveningFamous_()` | phase07-evening-media/buildEveningFamous.js | Celebrity/famous citizen sightings. Reads `S.eveningSports` |
| 7-EveningMedia | `buildEveningMedia_()` | phase07-evening-media/buildEveningMedia.js | TV, movies, streaming selection. Reads `S.eveningSports` |
| 7-CitySystems | `buildCityEveningSystems_()` | phase07-evening-media/cityEveningSystems.js | Infrastructure/transit evening updates. Reads `S.nightlife`, `S.eveningSports`, `S.cityEvents` |
| 7-MediaPacket | `buildMediaPacket_()` | phase07-evening-media/buildMediaPacket.js | Compile media room briefing packet |
| 7-MediaFeedback | `runMediaFeedbackEngine_()` | phase07-evening-media/mediaFeedbackEngine.js | Media coverage feedback loops |
| 7-SeasonalSeeds | `applySeasonalStorySeeds_()` | phase07-evening-media/buildEveningMedia.js | Season-specific story prompts |
| 7-ChaosWeights | `applyChaosCategoryWeights_()` | phase02-world-state/calendarChaosWeights.js | Holiday/calendar chaos modifiers |
| 7-StorySeeds | `applyStorySeeds_()` | phase07-evening-media/applyStorySeeds.js | Inject story seeds for next cycle |

---

## Phase 8: V3 INTEGRATION + CHICAGO

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 8-CycleWeight | `applyCycleWeightForLatestCycle_()` | phase09-digest/applyCycleWeightForLatestCycle.js | Signal scoring (low/medium/high) |
| 8-V3Preload | `v3PreloadContext_()` | phase08-v3-chicago/v3preLoader.js | Load arc/domain/neighborhood state from ledgers. **LOADS** `S.eventArcs` |
| 8-ArcLifecycle | `processArcLifecycle_()` | phase06-analysis/processArcLifeCyclev1.js | Advance arc phases (early→rising→peak→decline→resolved). **Moved from Phase 6 S116.** S199: arcLifecycleEngine.js (the 4-arg shadowed version) deleted as confirmed-dead per ENGINE_MAP.md line 279. |
| 8-StorylineStatus | `updateStorylineStatus_()` | phase06-analysis/updateStorylineStatusv1.2.js | Track storyline health. **Moved from Phase 6 S116** | **⚠ AUDIT:** Writes `ctx.summary.storylineUpdates` — nothing reads it. |
| 8-StorylineHealth | `monitorStorylineHealth_()` | phase06-analysis/hookLifecycleEngine.js | Monitor storyline decay. **Moved from Phase 6 S116** |
| 8-V3Integration | `v3Integration_()` | phase08-v3-chicago/v3Integration.js | V3 module orchestrator (arcs, domains, textures, hooks) |
| 8-DemographicDrift | `deriveDemographicDrift_()` | phase03-population/deriveDemographicDrift.js | Derive drift metrics |
| 8-ChicagoCitizens | `generateChicagoCitizens_()` | phase05-citizens/generateChicagoCitizensv1.js | Chicago bureau citizen generation | **⚠ AUDIT:** Writes `ctx.summary.chicagoPopulation` — nothing reads the count (chicagoCitizens array IS read). |

---

## Phase 9: DIGEST + COMPRESSION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 9-DigestSummary | `applyCompressedDigestSummary_()` | phase09-digest/applyCompressionDigestSummary.js | Compress cycle data for summary |
| 9-CompressLifeHistory | `compressLifeHistory_()` | utilities/compressLifeHistory.js | LifeHistory → TraitProfile compression (v1.5) |
| 9-FinalizePopulation | `finalizeWorldPopulation_()` | phase03-population/finalizeWorldPopulation.js | Lock population numbers |
| 9-EveningSnapshot | `snapshotEveningForCarryForward_()` | phase09-digest/finalizeCycleState.js | Snapshot evening data for next cycle's citizen events. **S116** |
| 9-FinalizeCycleState | `finalizeCycleState_()` | phase09-digest/finalizeCycleState.js | Lock cycle state |

---

## Phase 10: PERSISTENCE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 10-WriteDigest | `writeDigest_()` | godWorldEngine2.js | Write cycle digest to sheet |
| 10-CycleWeather | `recordCycleWeather_()` | phase10-persistence/recordCycleWeather.js | Archive weather to ledger |
| 10-RecordEvents25 | `recordWorldEvents25_()` | phase10-persistence/recordWorldEventsv25.js | Archive events (v2.5 format) |
| 10-RecordEventsV3 | `recordWorldEventsv3_()` | phase10-persistence/recordWorldEventsv3.js | Archive events (v3 format) |
| 10-NeighborhoodMap | `saveV3NeighborhoodMap_()` | phase08-v3-chicago/v3NeighborhoodWriter.js | Persist neighborhood state |
| 10-Arcs | `saveV3ArcsToLedger_()` | phase08-v3-chicago/v3LedgerWriter.js | Persist arc state to Event_Arc_Ledger |
| 10-Bonds | `saveRelationshipBonds_()` | phase05-citizens/bondPersistence.js | Persist bonds to sheet |
| 10-BondLedger | `saveV3BondsToLedger_()` | phase08-v3-chicago/v3LedgerWriter.js | Persist bonds (v3 format) |
| 10-Domains | `saveV3Domains_()` | phase08-v3-chicago/v3DomainWriter.js | Persist domain state |
| 10-Seeds | `saveV3Seeds_()` | phase10-persistence/saveV3Seeds.js | Persist story seeds |
| 10-Hooks | `saveV3Hooks_()` | phase08-v3-chicago/v3StoryHookWriter.js | Persist story hooks |
| 10-Textures | `saveV3Textures_()` | phase08-v3-chicago/v3TextureWriter.js | Persist texture triggers |
| 10-Chicago | `saveV3Chicago_()` | phase08-v3-chicago/v3ChicagoWriter.js | Persist Chicago state |
| 10-CyclePacket | `buildCyclePacket_()` | phase10-persistence/buildCyclePacket.js | Build JSON cycle packet |
| 10-MediaBriefing | `generateMediaBriefing_()` | phase07-evening-media/mediaRoomBriefingGenerator.js | Generate media room briefing |
| 10-MediaLedger | `recordMediaLedger_()` | phase10-persistence/recordMediaLedger.js | Archive media events |
| 10-CycleSeed | `saveCycleSeed_()` | phase10-persistence/saveV3Seeds.js | Save RNG seed for replay |
| 10-EveningSnapshot | `saveEveningSnapshot_()` | phase09-digest/finalizeCycleState.js | Save evening snapshot to PropertiesService (~800 bytes). **S116** |
| 10-ExecuteIntents | `executePersistIntents_()` | utilities/writeIntents.js | Execute all deferred write-intents |

---

## Phase 11: MEDIA INTAKE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 11-MediaIntake | `processMediaIntake_()` | phase11-media-intake/healthCauseIntake.js | Process health cause assignments from media room |

---

## Post-Engine Pipeline (Local Node.js — runs AFTER engine cycle)

These scripts run locally on the droplet after the GAS engine completes. They transform engine output into agent workspaces and close the feedback loop. Full pipeline order in `/run-cycle` SKILL.md Steps 4a-4f.

| Step | Script | Purpose |
|------|--------|---------|
| 4a | `buildDeskPackets.js` | Split Cycle_Packet into per-desk JSON packets + truesource + citizen archive |
| 4b | `buildInitiativePackets.js` | Per-initiative packets from 7 sheets + previous voice decisions |
| 4c | `buildInitiativeWorkspaces.js` | Populate initiative agent workspaces |
| 4c.5 | `applyTrackerUpdates.js` | **Write initiative decisions back to Initiative_Tracker sheet.** Closes the world-action loop. Dry run by default, `--apply` for live writes. |
| 4c.6 | `buildDecisionQueue.js` | Map initiative blockers to voice agent offices. Writes `pending_decisions.md` with A/B/C options and consequences. |
| 4d | `buildVoiceWorkspaces.js` | Per-agent workspaces with domain briefings, RD political lens injection |
| 4e | `buildDeskFolders.js` | Per-desk workspaces with voice distribution, briefings, errata, RD creative lens injection |
| 4f | `checkSupplementalTriggers.js` | Scan civic data for supplemental edition candidates |

**Added S113:** Steps 4c.5 and 4c.6 close the voice-agent-world-action-pipeline. Initiative agents make operational decisions → `applyTrackerUpdates.js` writes them to the sheet → `buildDecisionQueue.js` maps blockers to voice agents → voice agents read `pending_decisions.md` and respond → their decisions feed into the next cycle via `buildInitiativePackets.js`. The city moves itself.

---

## Files NOT Called by the Engine

These exist in the codebase but are NOT in the engine call chain:

| File | Status |
|------|--------|
| `phase05-citizens/generateNamedCitizensEvents.js` | **Dead code** — never called |
| `phase05-citizens/generateMonthlyCivicSweep.js` | Not in engine — standalone script? |
| `phase05-citizens/updateCivicLedgerFactions.js` | Not in engine — setup script |
| `phase06-analysis/hookLifecycleEngine.js` | Not in engine |
| `phase06-analysis/storylineHealthEngine.js` | Not in engine |
| `phase06-analysis/processArcLifeCyclev1.js` | **ACTIVE** — called by engine at godWorldEngine2.js:322,1622. The 4-param shadowed `arcLifecycleEngine.js` deleted S199. |
| `phase07-evening-media/storylineWeavingEngine.js` | Not in engine |
| `phase07-evening-media/culturalLedger.js` | Not in engine |
| `phase07-evening-media/citizenFameTracker.js` | Not in engine |
| `phase07-evening-media/domainTracker.js` | Not in engine |
| `phase07-evening-media/updateMediaSpread.js` | Not in engine |
| `phase07-evening-media/updateTrendTrajectory.js` | Not in engine |
| `phase07-evening-media/parseMediaIntake.js` | Helper |
| `phase07-evening-media/parseMediaRoomMarkdown.js` | Helper |

---

## Bond Engine Bug Fixes (S83, Phase 23.8)

| Bug | File | Fix |
|-----|------|-----|
| POPID vs name lookup | seedRelationBondsv1.js | Seeder now reads `First`/`Last` columns (not `Name`), composes full name. POPIDs normalized to trimmed uppercase on store. |
| Header collision guard too narrow | bondPersistence.js | `isLedgerSchema_` now case-insensitive, also checks `action`/`changetype` columns. |
| Full replace wipe | bondPersistence.js | `saveRelationshipBonds_` skips save if ctx has 0 bonds but sheet has existing rows. Prevents accidental wipe. |
| Inconsistent ID normalization | bondPersistence.js, runRelationshipEngine.js | `getCitizenBondsFromStorage_`, `getBondBetween_`, `getCitizenBonds_` all normalize IDs to trimmed uppercase before comparison. |

---

## CIVIC Clock Mode Activation (S83, Phase 22.1)

6 council members flipped from GAME→CIVIC, Tier 3→2:
- Avery Santana (Mayor), Marcus Osei, Elliott Crane, Ramon Vega, Aaron Whitfield, Theo Park
- `generateCivicModeEvents_` already wired at Phase 5 — now has citizens to process
- `generateCivicModeEvents.js` hex literal fix: `0xC1V1C` → `0xC1C1C` (invalid hex digit)
- Crane Status="recovering", Osei Status="serious-condition" — enables healthPenalty logic

## MEDIA Clock Mode Activation (S94, Phase 24.1)

16 Bay Tribune journalists migrated GAME→MEDIA:
- Mags Corliss (EIC), Hal Richmond, P Slayer, Jordan Velez, Lila Mezran, Trevor Shimizu, Angela Reyes, Noah Tan, Kai Marston, Sharon Okafor, Mason Ortega, Farrah Del Rio, Reed Thompson, Celeste Tran, Arman Gutierrez, Elliot Marbury
- `generateMediaModeEvents_` wired at Phase 5a after CivicModeEvents
- 7 role-specific event pools: editor, columnist, reporter, podcast-host, photographer, analyst, media-staff
- Base chance 20%, T1 +10%, T2 +5%, cap 45%
- Context-aware: reads civic load, sentiment, crime, weather, sports season, cultural activity
- 87 A's players expanded from bare position abbreviations to "Position, Team" format
- 62 T3 minor leaguers assigned to farm teams (AAA/AA/A affiliates)

**Current ClockMode breakdown (S105 audit):** ENGINE 509, GAME 91, CIVIC 46, MEDIA 29, LIFE 0

---

## Arc Engine Investigation (S83, Phase 22.2)

All 37 arcs stuck at phase "early" despite tension ≥3. Diagnostic logging added to `eventArcEngine_` v3.7.
- Phase progression code is correct: `early→rising (t≥3)→peak (t≥5)→decline (t≤4)→resolved (t≤1.5)`
- Staleness pruning (8+ cycles at early) also not firing
- Tension IS changing between cycles, confirming engine runs
- Root cause likely deployment drift — all code synced via `clasp push` S83
- Batch report found: `involvedCitizens` hardcoded to `[]` in `v3preLoader.js:208`, arcs excluded from desk packets

---

## Known Classification Issues (updated S106)

| Issue | Count | Description |
|-------|-------|-------------|
| `LIFE` mode citizens | 0 | S105 audit found 0 LIFE-mode citizens on live sheet. Previously 25. Likely reclassified during S94 recovery. |
| MED+CIV double flag | 3 | Undefined behavior — both flags trigger the same exclusions |
| GAME + no flags | 7 | Get GAME micro-events but classified as generic public-figure type |
| Tier 1-2 with zero processing | varies | Any Tier 1-2 with conflicting flag/mode |
| **RESOLVED (S106):** UNI/MED/CIV flag check | 9 files | Flag comparison fixed from `=== "y"` to `.startsWith("y")`. Skip gates now fire correctly. Deployed to GAS. |
| **RESOLVED (S94):** MEDIA mode | 16→29 | Bay Tribune journalists processed by `generateMediaModeEvents_`. Count updated S105 (29 on live sheet). |

---

## ctx.summary Field Health (Audit 2026-03-26, Rev 2)

### Connected Pipelines (verified working)

| Chain | Writer | Field | Reader |
|-------|--------|-------|--------|
| Career → Economic | runCareerEngine.js | `S.careerSignals` | economicRippleEngine.js |
| Economic → Migration | economicRippleEngine.js | `S.economicMood` | applyMigrationDrift.js |
| Pattern → Downstream | applyPatternDetection.js | `S.patternFlag` | 9+ reader files |

Note: All engine files use `var S = ctx.summary`. Grep for `S.fieldName`, not `ctx.summary.fieldName`.

### Orphaned Fields (written but never read — WARNING)

| Field | Writer | Line(s) | Notes |
|-------|--------|---------|-------|
| `patternCalendarContext` | applyPatternDetection.js | 36, 46 | Always {} |
| `storylineUpdates` | updateStorylineStatusv1.2.js | 171 | |
| `arcResolutions` | processArcLifeCyclev1.js | 200 | Active engine file |
| `arcPhaseChanges` | processArcLifeCyclev1.js | 201 | Active engine file |
| `advancementResults` | processAdvancementIntake.js | 53 | |
| `chicagoPopulation` | generateChicagoCitizensv1.js | 161 | chicagoCitizens array IS read |

### Math.random() Fallbacks (determinism risk)

| File | Line | Status |
|------|------|--------|
| ~~generateGenericCitizens.js~~ | ~~96~~ | ~~**FIXED S120**~~ — generator DISABLED S205; throw guard preserved on file but cycle-path off |
| generationalEventsEngine.js | 105, 111 | **FIXED S120** — logs warning |
| v2DeprecationGuide.js | 202 | Open — deprecated helper |

Full audit: `docs/engine/tech_debt_audits/2026-03-26.md`
