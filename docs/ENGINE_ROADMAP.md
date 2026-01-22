# GOD WORLD ENGINE - Implementation Roadmap

**Purpose:** Actionable implementation plan with clear priorities.
**Companion:** See `V3_ARCHITECTURE.md` for technical specifications.

**Last Updated:** 2026-01-21
**Current Cycle:** 75
**Engine Version:** v2.11

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

### [~] 2.3 BayTribune Roster
**Purpose:** Single source of truth for journalists.
**Status:** PARTIAL (Jan 2026)

**Completed:**
- Created `schemas/bay_tribune_roster.json` with 28 journalists
- Created `utilities/rosterLookup.js` with lookup functions
- Audited Phase 7 files (100+ hardcoded references identified)

**Schema (JSON implemented, Sheet pending approval):**

| Field | Type | Description |
|-------|------|-------------|
| name | string | Full name |
| desk | string | sports, metro, culture, business, opinion, wire, etc. |
| role | string | Beat title |
| tone | string | Voice keywords |
| background | string | Brief bio (optional) |

**Pending (V3 refactor):**
- Migrate hardcoded strings in mediaRoomBriefingGenerator.js to use rosterLookup.js
- Add LastAppearance/ArticleCount tracking (schema approval needed)
- Create BayTribune_Roster sheet for runtime updates

**Integration:**
- Phase 7 reads for story assignment (utility ready)
- Media Room reads for voice lookup (utility ready)

---

## TIER 3: NEIGHBORHOOD DEMOGRAPHICS

The core feature for v3 narrative depth.

### [ ] 3.1 Neighborhood_Demographics Sheet
**Schema:**

| Field | Type | Description |
|-------|------|-------------|
| Neighborhood | string | e.g., "TEMESCAL", "WEST_OAKLAND" |
| Students | int | School-age (5-22) |
| Adults | int | Working-age (23-64) |
| Seniors | int | 65+ |
| Unemployed | int | Not currently working |
| Sick | int | Currently ill |
| LastUpdated | int | Cycle last recalculated |

**Seed Method:**
- Initial values derived from `Simulation_Ledger` citizen distribution
- Cross-referenced with neighborhood character (e.g., Rockridge skews older/wealthier)

### [ ] 3.2 Demographics Engine Integration
**Phase 3 (Population):**
- Read `Neighborhood_Demographics`
- Update counts based on:
  - Births/deaths
  - Migration (incoming/outgoing citizen profiles)
  - Status changes (employment, illness)

**Phase 5 (Citizens):**
- New citizen placement weighted by neighborhood demographics
- Young professionals more likely in Temescal
- Families more likely in Fruitvale

### [ ] 3.3 Demographics as Story Signals
**Phase 6 (Analysis):**
- Flag significant demographic shifts
- "Rockridge senior population up 8% this quarter"
- "West Oakland seeing influx of young adults"
- Feed to Story_Hook_Deck

---

## TIER 4: INTEGRATION

Connect subsystems properly.

### [ ] 4.1 Civic Voting + Demographics
**Current:** Civic Initiative Engine runs semi-independently.
**V3:**
- Council state loaded as `ctx.civic.council`
- Initiatives readable as `ctx.civic.initiatives`
- Vote resolution references:
  - `ctx.world.cityDynamics.sentiment`
  - `ctx.neighborhoods[district]` demographics
  - District composition affects council member behavior

### [ ] 4.2 Media Hooks + Demographics
- Story hooks can reference neighborhood composition
- "Temescal's student population reacts to transit changes"
- Journalist assignment considers beat + neighborhood relevance

### [ ] 4.3 Economic Indicators + Demographics
- Unemployment concentrated in specific neighborhoods
- Economic stress affects voting patterns
- Gentrification signals from demographic drift

### [ ] 4.4 Initiative Outcome → Neighborhood Ripple
**Purpose:** Vote outcomes affect the neighborhoods they serve over time.

**When initiative PASSES:**
- Positive ripple to affected neighborhoods over N cycles
- Metrics affected depend on initiative type:
  - Health (health center) → CrimeIndex ↓, Sentiment ↑
  - Transit (hub expansion) → RetailVitality ↑, Traffic impact
  - Economic (business incentive) → RetailVitality ↑, Employment ↑
  - Sports (stadium) → RetailVitality ↑, EventAttractiveness ↑, NoiseIndex ↑
  - Housing (affordable units) → Sentiment ↑, community stability
  - Environment (park) → Sentiment ↑, health indicators ↑

**When initiative FAILS:**
- Negative ripple to affected neighborhoods
- Civic frustration → Sentiment ↓
- Prolonged failure on same issue → compounding frustration

**Ripple Properties:**
- Impact: Initial magnitude of effect
- Duration: How many cycles the effect lasts
- Decay: How quickly the effect fades (or stabilizes for permanent infrastructure)
- Scope: Primary neighborhood + adjacent spillover

**Integration Points:**
- `civicInitiativeEngine.js` → `applyInitiativeConsequences_()` triggers ripple
- Ripple effects applied during Phase 2 (World State) or Phase 3 (Population)
- Affects `Neighborhood_Map` metrics each cycle until duration expires

**Schema Addition (Initiative_Tracker):**
- `AffectedNeighborhoods`: comma-separated list of neighborhoods
- `RippleDuration`: cycles (default based on initiative type)
- `RippleStatus`: active | exhausted

---

## TIER 5: V3 COMPLETION

Full architecture migration.

### [ ] 5.1 Migrate Remaining Engines to Write-Intents
**Pending migrations:**
- `processIntake_`
- `saveV3Seeds_`
- `v3LedgerWriter_`
- `bondPersistence_`
- All `record*.gs` files

### [ ] 5.2 Implement Replay Mode
- Accept `cycleId` parameter to replay specific cycle
- Load seed from that cycle
- Disable persistence writes
- Compare outputs to original

### [ ] 5.3 Implement Dry-Run Mode
- `ctx.mode.dryRun = true`
- Full execution, all writes staged but not committed
- Log intended operations for validation

### [ ] 5.4 Deprecate v2 Patterns
- Remove direct `Math.random()` calls
- Remove direct sheet writes outside persistence phase
- Remove `ctx.summary` compatibility shim

---

## SCHEMA CHANGES (Require Maker Approval)

| Change | Sheet | Status |
|--------|-------|--------|
| New: `Neighborhood_Demographics` | - | PENDING |
| New: `Cycle_Weather` | - | COMPLETE |
| New: `BayTribune_Roster` | - | JSON READY (sheet pending) |
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

---

## DOCUMENTS CONSOLIDATED

This roadmap replaces:
- `V2_REFACTORING_CHECKLIST.md` (items migrated here)
- Mara's v3 BUILD SPEC (good ideas extracted, demographics simplified)

Reference document:
- `V3_ARCHITECTURE.md` (technical contract)

---

*This document defines WHAT to build. See V3_ARCHITECTURE.md for HOW to build it.*
