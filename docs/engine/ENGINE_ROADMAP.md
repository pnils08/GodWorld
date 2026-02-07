# GOD WORLD ENGINE - Implementation Roadmap

**Purpose:** Actionable implementation plan with clear priorities.
**Companion:** See `V3_ARCHITECTURE.md` for technical specifications.

**Last Updated:** 2026-01-26
**Current Cycle:** 75
**Engine Version:** v3.1

---

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## TIER 1: IMMEDIATE (v2.x compatible)

These can be done now without architectural changes.

### [x] 1.1 Sheet Caching Layer
**Status:** Complete (v2.10)
- `cache.getData()` for read caching
- `cache.queueWrite()` / `cache.queueAppend()` for batched writes
- `cache.flush()` for end-of-cycle commit

### [x] 1.2 Phase Runners with Error Isolation
**Status:** Complete (v2.x)
- `safePhaseCall_()` wrapper pattern
- 11 phases operational

### [x] 1.3 Normalize Identity Fields
**Status:** Complete (v2.11)
**Target:** `existsInLedger_()` and intake validation
**Actions:**
- Added `normalizeIdentity_()` to utilities/utilityFunctions.js
- Updated `existsInLedger_()` to use normalized comparison
- Handles case differences, extra whitespace
**Priority:** High

### [x] 1.4 Transactional Intake Writes
**Status:** Complete (v2.11)
**Actions:**
- Stages all valid rows in memory before writing
- Checks for intra-batch duplicates (same name twice in intake)
- Batch writes all rows at once
- Clears intake only after successful write
**Priority:** High

### [x] 1.5 Couple Illness to Mortality
**Status:** Complete (v2.11)
**Target:** `updateWorldPopulation_()`
**Implementation:**
- Illness above 5% baseline increases death rate
- ILLNESS_MORTALITY_FACTOR = 0.02 (2% of excess illness adds to death rate)
- At 15% illness (max): +0.002 death rate increase
**Priority:** Medium

### [x] 1.6 Clamp Migration Magnitude
**Status:** Complete (v2.11)
**Rule:** `|migration| <= 0.5% of total population`
**Implementation:**
- MAX_MIGRATION_RATE = 0.005 (0.5%)
- Migration clamped before applying to total
- Prevents unrealistic population swings
**Priority:** Medium

---

## TIER 2: CONSOLIDATION

Reduce redundancy, establish single sources of truth.

### [x] 2.1 Centralized Weather
**Problem:** Weather data duplicated across multiple ledgers.
**Solution:** New sheet `Cycle_Weather`

| Field | Type | Description |
|-------|------|-------------|
| CycleID | int | Cycle number |
| Type | string | clear, fog, rain, storm, heatwave |
| Temp | int | Temperature (F) |
| Impact | float | Mood modifier (1.0 = neutral) |
| Advisory | string | Optional alert text |

**Status:** COMPLETE (Jan 2026)
- Created `recordCycleWeather.js` with central weather persistence
- Added to Phase 10 in `godWorldEngine2.js`
- Includes helper functions: `getWeatherForCycle_()`, `getWeatherHistory_()`
- Other ledgers still embed weather for self-contained readability
- Cycle_Weather is now the canonical lookup source for historical weather

### [x] 2.2 Ledger Audit & Trim
**Audit targets:**

| Ledger | Concern | Proposal |
|--------|---------|----------|
| `LifeHistory_Log` | 2500+ rows, append-only | Archive entries older than 10 cycles |
| `WorldEvents_Ledger` | Every event ever | Prune severity 1-2 after 5 cycles |
| `Relationship_Bonds` | Read every cycle | Batch caching, only load active bonds |

**Method:**
- Document read/write frequency per ledger
- Update AUDIT_TRACKER.md with findings
- Trim decisions made with Maker approval

**Status:** COMPLETE (Jan 2026)
- Audited all 3 target ledgers (LifeHistory_Log, WorldEvents_Ledger, Relationship_Bonds)
- Identified citizenContextBuilder.js as main performance bottleneck
- Added cache support instead of pruning data
- See AUDIT_TRACKER.md for full findings

### [x] 2.3 BayTribune Roster
**Purpose:** Single source of truth for journalists.
**Status:** COMPLETE (Jan 2026)

**Completed:**
- Created `schemas/bay_tribune_roster.json` with 28 journalists
- Created `utilities/rosterLookup.js` with lookup functions
- Migrated `mediaRoomBriefingGenerator.js` to v2.3 with roster integration
  - `getArcReporter_()` now delegates to `getArcReporterFromRoster_()`
  - `determineFrontPage_()` uses roster lookups
  - `generateSectionAssignments_()` uses roster lookups
  - Added helper functions: `getFormattedJournalist_()`, `getReporterBySignal_()`
  - Section guidance and briefing strings use dynamic lookups
  - Maintains backwards compatibility with fallback values

**Schema (JSON implemented, Sheet pending approval):**

| Field | Type | Description |
|-------|------|-------------|
| name | string | Full name |
| desk | string | sports, metro, culture, business, opinion, wire, etc. |
| role | string | Beat title |
| tone | string | Voice keywords |
| background | string | Brief bio (optional) |

**Future Enhancements (V3):**
- Add LastAppearance/ArticleCount tracking (schema approval needed)
- Create BayTribune_Roster sheet for runtime updates

**Integration:**
- Phase 7 reads for story assignment (utility ready)
- Media Room reads for voice lookup (utility ready)
- mediaRoomBriefingGenerator.js v2.3 uses roster for all reporter assignments

---

## TIER 3: NEIGHBORHOOD DEMOGRAPHICS

The core feature for v3 narrative depth.

### [x] 3.1 Neighborhood_Demographics Sheet
**Status:** COMPLETE (Jan 2026)

**Schema:**

| Field | Type | Description |
|-------|------|-------------|
| Neighborhood | string | e.g., "Temescal", "Downtown" |
| Students | int | School-age (5-22) |
| Adults | int | Working-age (23-64) |
| Seniors | int | 65+ |
| Unemployed | int | Not currently working |
| Sick | int | Currently ill |
| LastUpdated | int | Cycle last recalculated |

**Implementation:**
- Created `utilities/ensureNeighborhoodDemographics.js` with:
  - `ensureNeighborhoodDemographicsSchema_()` - append-only safe schema creation
  - `getNeighborhoodDemographics_()` - reads all neighborhood data
  - `updateNeighborhoodDemographics_()` - single neighborhood update
  - `batchUpdateNeighborhoodDemographics_()` - efficient bulk update
  - `seedNeighborhoodDemographicsFromLedger_()` - initial data seeding
  - `calculateDemographicShifts_()` - detects significant changes
  - `getDemographicWeightedNeighborhoods_()` - citizen placement weights
- 17 Oakland neighborhoods with character profiles (studentMod, adultMod, seniorMod)
- Seed method derives from `Simulation_Ledger` citizen distribution
- Cross-referenced with neighborhood character (e.g., Rockridge skews older/wealthier)

### [x] 3.2 Demographics Engine Integration
**Status:** COMPLETE (Jan 2026)

**Phase 3 (Population):**
- Created `phase03-population/updateNeighborhoodDemographics.js`
- Updates counts based on:
  - Migration (incoming/outgoing citizen profiles)
  - Status changes (employment, illness)
  - Calendar-aware modifiers (holidays affect specific neighborhoods)
  - Natural population changes (aging, mortality, births)

**Phase 5 (Citizens):**
- Updated `generateGenericCitizens.js` to v2.5:
  - `pickWeightedNeighborhood()` considers citizen age for demographic fit
  - Young professionals → urban/professional neighborhoods
  - Students → neighborhoods with existing student populations
  - Seniors → established/senior-heavy neighborhoods
- Updated `runNeighborhoodEngine.js` to v2.3:
  - `pickDemographicNeighborhood_()` for age-based assignment
  - Falls back to random selection if demographics unavailable

### [x] 3.3 Demographics as Story Signals
**Status:** COMPLETE (Jan 2026)

**Phase 6 (Analysis):**
- Updated `prioritizeEvents.js` to v2.3:
  - Population shifts → boost migration/community/economic events
  - Unemployment shifts → boost economic/civic events
  - Illness shifts → boost health/community events
  - Age demographic shifts → boost community/health events
  - Large shifts (>10%) get extra story priority
- `ctx.summary.demographicShifts` array available for story generation
- `ctx.summary.eventPrioritization.demographicContext` tracks shift statistics

---

## TIER 4: INTEGRATION

Connect subsystems properly.

### [x] 4.1 Civic Voting + Demographics
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Updated `civicInitiativeEngine.js` to v1.3:
  - Swing vote probability modified by initiative's affected neighborhoods
  - Demographics influence: senior-heavy areas boost senior-benefit initiatives
  - Health initiatives: +8% if >25% seniors, +6% if >8% sick
  - Housing/stabilization: +10% if >12% unemployed
  - Transit: +6% if >55% working adults
  - Education: +10% if >25% students
  - Maximum demographic modifier: ±15%
- Added `AffectedNeighborhoods` column support
- `calculateDemographicInfluence_()` function for vote probability

### [x] 4.2 Media Hooks + Demographics
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Updated `storyHook.js` to v3.4:
  - Population shifts → community/housing story angles
  - Senior demographic changes → health/aging stories
  - Student population shifts → education angles
  - Unemployment changes → economic impact stories
  - Illness rate spikes → public health investigation hooks
- Significant shifts (8%+) generate hooks, major shifts (12%+) get priority 3
- Aggregate shifts trigger city-wide story angles

### [x] 4.3 Economic Indicators + Demographics
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Updated `applyCityDynamics.js` to v2.5:
  - Aggregate unemployment affects retail (-4% to -8%) and sentiment
  - High illness rates dampen public spaces, community, nightlife
  - Youth population boosts nightlife (+5-10%) and culture
  - Senior population boosts community engagement (+4-8%)
- Gentrification signals from demographic shift patterns
- `ctx.summary.economicIndicators` tracks city-wide rates
- `ctx.summary.gentrificationSignal` boolean flag

### [x] 4.4 Initiative Outcome → Neighborhood Ripple
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Added `applyNeighborhoodRipple_()` function to civicInitiativeEngine.js
- Initiative type → ripple effects mapping:
  - Health → sick_modifier, sentiment, community (12 cycles)
  - Transit → retail, traffic, sentiment (10 cycles)
  - Economic → unemployment, retail, sentiment (15 cycles)
  - Housing → sentiment, community, stability (20 cycles)
  - Safety → sentiment, community (8 cycles)
  - Environment → sentiment, sick, publicSpaces (12 cycles)
  - Sports → retail, traffic, nightlife, sentiment (20 cycles)
  - Education → sentiment, community, student_attraction (15 cycles)
- Ripple records stored in `ctx.summary.initiativeRipples`
- Immediate first-cycle impact + ongoing effects

**Schema Addition (Initiative_Tracker):**
- `AffectedNeighborhoods`: comma-separated list of neighborhoods
- `RippleDuration`: cycles (default based on initiative type)
- `RippleStatus`: active | exhausted

---

## TIER 5: V3 COMPLETION

Full architecture migration.

### [x] 5.1 Migrate Remaining Engines to Write-Intents
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/writeIntents.js` with intent creation helpers
- Created `phase10-persistence/persistenceExecutor.js` for intent execution
- Migrated engines to write-intents:
  - `processIntake_` → `processIntakeV3_` (phase05-citizens/processIntakeV3.js)
  - `saveV3Seeds_` v3.3 (uses queueBatchAppendIntent_)
  - `saveRelationshipBonds_` v2.3 (uses queueReplaceIntent_)
  - `recordCycleWeather_` v1.2 (uses queueAppendIntent_)
  - `recordWorldEvents25_` v2.2 (uses queueBatchAppendIntent_)
  - `recordWorldEventsv3_` v3.3 (uses queueBatchAppendIntent_)
  - `recordMediaLedger_` v3.2 (uses queueBatchAppendIntent_)

**Intent Types:**
- `cell`: Single value write
- `range`: 2D array write
- `append`: Add rows to end
- `replace`: Clear and rewrite (for master state sheets)

### [x] 5.2 Implement Replay Mode
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/cycleModes.js` with replay support
- `initializeReplayMode_(ctx, cycleId)` to set up replay
- `seededRng_(seed)` for deterministic random generation
- `saveCycleSeed_(ctx)` persists cycle seed and checksum
- `loadCycleSeed_(ss, cycleId)` retrieves stored seed
- `compareReplayOutput_(ctx)` validates replay accuracy
- New sheet: `Cycle_Seeds` tracks CycleID, Seed, key outputs, checksum

### [x] 5.3 Implement Dry-Run Mode
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- `ctx.mode.dryRun = true` flag
- `initializeDryRunMode_(ctx)` for setup
- Persistence executor logs intents but skips writes
- `getIntentSummary_(ctx)` shows planned operations
- Full cycle execution without side effects

### [x] 5.4 Deprecate v2 Patterns
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/v2DeprecationGuide.js` with:
  - Pattern detection (scanForDeprecatedPatterns_)
  - Report generation (generateDeprecationReport_)
  - Migration helpers (v3Random_, v3PickRandom_, v3Chance_)
  - ctx.summary shim (createSummaryShim_)

**Deprecated Patterns (HIGH):**
- `Math.random()` → `ctx.rng()`
- `.appendRow()` → `queueAppendIntent_()`
- `.setValue()` → `queueCellIntent_()`
- `.setValues()` → `queueRangeIntent_()`

**ES5 Compatibility (LOW):**
- `const/let` → `var`
- Arrow functions → `function()`
- Template literals → string concatenation
- `Object.entries/forEach` → for loops

---

## SCHEMA CHANGES (Require Maker Approval)

| Change | Sheet | Status |
|--------|-------|--------|
| New: `Neighborhood_Demographics` | - | COMPLETE |
| New: `Cycle_Weather` | - | COMPLETE |
| New: `BayTribune_Roster` | - | JSON READY (sheet pending) |
| New: `Cycle_Seeds` | - | COMPLETE (Tier 5) |
| New: `Crime_Metrics` | - | COMPLETE (Tier 6) |
| New: `Faith_Ledger` | - | COMPLETE (Tier 6) |
| New: `Faith_Organizations` | - | COMPLETE (Tier 6) |
| New: `Youth_Events` | - | COMPLETE (Tier 6) |
| New: `Transit_Metrics` | - | COMPLETE (Tier 6) |
| Remove weather columns | `WorldEvents_Ledger` | PENDING |
| Remove weather columns | `Neighborhood_Map` | PENDING |

---

## IMPLEMENTATION SEQUENCE

| Order | Item | Dependency |
|-------|------|------------|
| 1 | Tier 1 fixes (1.3-1.6) | None |
| 2 | Ledger audit (2.2) | None |
| 3 | Centralized weather (2.1) | Audit complete |
| 4 | BayTribune roster (2.3) | Schema approval |
| 5 | Neighborhood demographics (3.1-3.3) | Schema approval |
| 6 | Civic integration (4.1) | Demographics complete |
| 7 | Media integration (4.2) | Demographics complete |
| 8 | V3 completion (5.1-5.4) | All above complete |
| 9 | Crime metrics (6.1) | Demographics complete |
| 10 | Faith community (6.2) | World events integration |
| 11 | Youth engine (6.3) | Demographics + citizen engine |
| 12 | Transit metrics (6.4) | Demographics complete |

---

## DOCUMENTS CONSOLIDATED

This roadmap replaces:
- `V2_REFACTORING_CHECKLIST.md` (items migrated here)
- Mara's v3 BUILD SPEC (good ideas extracted, demographics simplified)

Reference document:
- `V3_ARCHITECTURE.md` (technical contract)

---

## TIER 6: NARRATIVE DEPTH

Adds narrative richness to the simulation with new data domains.

### [x] 6.1 Crime / Public Safety
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/ensureCrimeMetrics.js` with:
  - `Crime_Metrics` sheet schema (neighborhood, property/violent crime indices, response times, clearance rates)
  - 17 neighborhood crime profiles with character-based modifiers
  - Crime metrics CRUD functions with write-intents support
  - `calculateCrimeShifts_()` for story signals
  - `getHighCrimeNeighborhoods_()` for event targeting
- Created `phase03-population/updateCrimeMetrics.js` with:
  - `updateCrimeMetrics_Phase3_()` engine integration
  - Crime influenced by: unemployment, youth population, sentiment, weather, season
  - `generateCrimeEvents_()` for world events integration
  - `getCrimeStorySignals_()` for Phase 6 analysis

### [x] 6.2 Faith / Religious Community
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/ensureFaithLedger.js` with:
  - `Faith_Ledger` sheet schema for events
  - `Faith_Organizations` sheet with 16 Oakland congregations
  - Multi-tradition support (Protestant, Catholic, Jewish, Muslim, Buddhist, Hindu, Sikh, Unitarian)
  - Holy days calendar by tradition
  - Event pools: services, holy days, community programs, interfaith dialogue, outreach, crisis response
- Created `phase04-events/faithEventsEngine.js` with:
  - `runFaithEventsEngine_()` integration
  - Organization-specific event generation
  - Interfaith event generation
  - `getFaithStorySignals_()` for Elliot Graye (Faith & Ethics) desk

### [x] 6.3 Youth / Next Generation
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/youthActivities.js` with:
  - `Youth_Events` sheet schema
  - Oakland schools (elementary, middle, high, college)
  - Academic calendar with seasonal periods
  - Event pools: academic, sports, arts, civic participation, coming-of-age, achievement, challenge
  - School assignment by age and neighborhood
- Created `phase05-citizens/runYouthEngine.js` with:
  - `runYouthEngine_()` engine integration
  - Youth citizen retrieval from Generic_Citizens and Simulation_Ledger
  - School-wide event generation (graduations, homecoming, sports seasons)
  - Life history integration for named youth
  - `getYouthStorySignals_()` for education/sports desks

### [x] 6.4 Transportation / Transit
**Status:** COMPLETE (Jan 2026)

**Implementation:**
- Created `utilities/ensureTransitMetrics.js` with:
  - `Transit_Metrics` sheet schema
  - 8 Oakland BART stations with baseline ridership
  - 12 AC Transit lines
  - 10 major traffic corridors
  - Ridership/traffic modifiers by context (weather, events, day type)
- Created `phase02-world-state/updateTransitMetrics.js` with:
  - `updateTransitMetrics_Phase2_()` engine integration
  - Station metrics: ridership volume, on-time performance
  - Corridor metrics: traffic index
  - Game day handling for Coliseum area
  - `getTransitStorySignals_()` for metro desk

---

*This document defines WHAT to build. See V3_ARCHITECTURE.md for HOW to build it.*
