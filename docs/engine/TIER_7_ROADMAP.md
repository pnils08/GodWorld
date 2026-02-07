# Tier 7 Roadmap

**Previous:** Tiers 1-6 complete (see ENGINE_ROADMAP.md)
**Current Tier:** 7
**Theme:** Ripple Effects, Economic Depth, Citizen Trajectories, Agent Integration
**Status:** In Progress
**Created:** 2026-02-02
**Updated:** 2026-02-03

---

## Tier 7 Overview

Tier 7 focuses on making simulation effects **persist and compound over time**. The foundation (demographics, careers, civic initiatives) exists. Now we make those systems talk to each other.

**Core Principle:** Every major event should create ripples that affect neighborhoods and citizens across multiple cycles.

**New in 7.0:** OpenClaw integration via Cycle Context Pack exports enables autonomous media generation.

---

## Prerequisites (Must Complete First)

These are bugs/incomplete features blocking Tier 7 work:

| Item | Doc | Status |
|------|-----|--------|
| Delayed initiatives stuck forever | CIVIC_INITIATIVE_v1.5_UPGRADE.md | Planned |
| Math.random() → ctx.rng() | CIVIC_INITIATIVE_v1.5_UPGRADE.md | Planned |
| Ripple consumer function | CIVIC_INITIATIVE_v1.5_UPGRADE.md | Planned |
| Quorum vs votes-needed | CIVIC_INITIATIVE_v1.5_UPGRADE.md | Planned |

**Do not start Tier 7 features until prerequisites are complete.**

---

## Tier 7.1: Ripple System Completion

**Goal:** Initiative outcomes actually affect neighborhoods over time.

**Status:** Implemented (v1.5)

| Task | Location | Status |
|------|----------|--------|
| Build `applyActiveInitiativeRipples_()` | civicInitiativeEngine.js:1379-1469 | Done |
| Wire into engine orchestrator | godWorldEngine2.js Phase 6 | Done |
| Add AffectedNeighborhoods column | Initiative_Tracker | Done |
| Add PolicyDomain column | Initiative_Tracker | Optional (falls back to keyword detection) |
| `getRippleEffectsForNeighborhood_()` helper | civicInitiativeEngine.js:1480-1512 | Done |
| `applyNeighborhoodRipple_()` creator | civicInitiativeEngine.js:1209-1362 | Done |

### Ripple Types Supported

| Type | Effects | Duration |
|------|---------|----------|
| health | sick_modifier, sentiment_modifier | 8-12 cycles |
| transit | retail_modifier, traffic_modifier | 10-15 cycles |
| economic | unemployment_modifier, retail_modifier | 12-20 cycles |
| housing | sentiment_modifier, community_modifier | 15-20 cycles |
| safety | sentiment_modifier, community_modifier | 8-12 cycles |
| environment | publicSpaces_modifier, sick_modifier | 10-15 cycles |
| sports | retail_modifier, nightlife_modifier, traffic_modifier | 6-10 cycles |
| education | sentiment_modifier, community_modifier | 12-18 cycles |

**Success Criteria:** Pass an initiative, run 5 cycles, verify neighborhood metrics change and decay. ✅ Verified

---

## Tier 7.2: Neighborhood Micro-Economies

**Goal:** Each neighborhood has local economic indicators that affect citizens and events.

**Status:** Implemented (v2.3)

| Task | Location | Status |
|------|----------|--------|
| Add neighborhood economy indices | economicRippleEngine.js:70-81 | Done (NEIGHBORHOOD_ECONOMIES) |
| Economic ripple engine | phase06-analysis/economicRippleEngine.js | Done |
| Career ripple detection | economicRippleEngine.js:205+ | Done (v2.3) |
| Migration drift integration | applyMigrationDrift.js | Done |
| Neighborhood assignment | runNeighborhoodEngine.js | Done |

### NEIGHBORHOOD_ECONOMIES Structure

```javascript
{
  'Downtown': { primary: ['business', 'civic', 'retail'], sensitivity: 1.2 },
  'Jack London': { primary: ['entertainment', 'food', 'nightlife'], sensitivity: 1.1 },
  'Temescal': { primary: ['healthcare', 'education', 'retail', 'arts'], sensitivity: 0.8 },
  'Fruitvale': { primary: ['retail', 'food', 'community'], sensitivity: 1.0 },
  'West Oakland': { primary: ['manufacturing', 'transit', 'construction'], sensitivity: 1.3 },
  // ... 6 more neighborhoods
}
```

### Economic Trigger Types (22 total)

| Trigger | Impact | Duration | Sectors |
|---------|--------|----------|---------|
| TECH_INVESTMENT | +15 | 8 cycles | tech, business |
| FACTORY_CLOSURE | -20 | 12 cycles | manufacturing |
| HOLIDAY_SHOPPING | +18 | 3 cycles | retail |
| WORKFORCE_GROWTH | +10 | 6 cycles | all |
| MAJOR_LAYOFFS | -15 | 8 cycles | varies |

### Outputs

- `ctx.summary.economicMood` (0-100 scale)
- `ctx.summary.economicRipples` (active ripple array)
- `ctx.summary.neighborhoodEconomies` (per-neighborhood state)
- `ctx.summary.neighborhoodMigration` (migration by hood)

**Success Criteria:** Neighborhood with high unemployment shows lower retail_health. Career outcomes vary by neighborhood. ✅ Verified

---

## Tier 7.3: Citizen Life Path Evolution

**Goal:** Citizens accumulate state over time that affects their trajectory.

**Status:** Implemented (v1.2)

| Task | Location | Status |
|------|----------|--------|
| Trait profile compression | utilities/compressLifeHistory.js | Done (v1.2) |
| Archetype extraction | compressLifeHistory.js:143-239 | Done |
| Citizen context builder | citizenContextBuilder.js | Done |
| Generational event tracking | generationalEventsEngine.js | Done |
| Arc lifecycle conditioning | processArcLifeCyclev1.js | Done (v1.1) |

### Archetype System

7 archetypes derived from LifeHistory entries:
- **Connector** — high social activity
- **Watcher** — high reflective, observational
- **Striver** — high driven, career-focused
- **Anchor** — high grounded, community-rooted
- **Catalyst** — high volatile, change-driving
- **Caretaker** — high social + grounded balance
- **Drifter** — low commitment across axes

### 5 Trait Axes

| Axis | Tags Contributing |
|------|-------------------|
| social | Relationship, Community, Bond |
| reflective | Weather, Observation, Neighborhood |
| driven | Work, Education, Career, Promotion |
| grounded | Family, Neighborhood, Community |
| volatile | Arc, Crisis, Conflict, Chaos |

### TraitProfile Output Format

```
Archetype:Watcher|Mods:curious,steady|reflective:0.73|social:0.45|TopTags:Neighborhood,Weather,Arc|Motifs:coffee,gallery|Entries:47|Basis:entries|V:1.2|Updated:c47
```

### Generational Milestones Tracked

| Function | Event Type |
|----------|------------|
| `checkGraduation_()` | Education completion |
| `checkWedding_()` | Marriage |
| `checkBirth_()` | Child birth |
| `checkPromotion_()` | Career advancement |
| `checkRetirement_()` | Work exit |
| `checkDeath_()` | End of life |
| `checkHealthEvent_()` | Illness/recovery |

**Success Criteria:** Track a Tier-1 citizen across 10 cycles. Their archetype and traits evolve based on events. ✅ Verified

---

## Tier 7.4: Continuity Threading

**Goal:** Repeated citizen mentions across cycles create story depth.

**Status:** Complete (OpenClaw-side tracking)

| Task | Location | Status |
|------|----------|--------|
| Continuity notes parser | phase11-media-intake/continuityNotesParser.js | Done (v1.0) |
| Arc-to-citizen relationships | continuityNotesParser.js | Done |
| Citizen context assembly | citizenContextBuilder.js | Done |
| Export keyCitizens to context pack | utilities/exportCycleArtifacts.js | Done |
| SQLite mention tracking schema | openclaw-skills/schemas/godworld.sql | Done |
| Streak detection in sync | openclaw-skills/godworld-sync/index.js:135-155 | Done |
| Continuity candidates view | openclaw-skills/schemas/godworld.sql:v_continuity_candidates | Done |
| Media packet continuity hints | buildMediaPacket.js | Optional (OpenClaw handles) |

### What's Implemented

```javascript
// continuityNotesParser.js
function parseContinuityNotes()
  - Parses Raw_Continuity_Paste → Continuity_Intake
  - Extracts: NoteType, Description, RelatedArc, AffectedCitizens, Status
  - Supports section headers, bullets, timeline markers

// citizenContextBuilder.js
function buildCitizenContext(identifier, cache)
  - Assembles complete citizen profile from all ledgers
  - Returns: history[], relationships[], mediaAppearances[], arcExposure[]
```

### Implementation Complete

The mention tracking loop is fully wired:

```
Engine: populates cycleActiveCitizens array
    ↓
Export: includes keyCitizens in context pack
    ↓
OpenClaw sync: updates SQLite mention_streak, media_appearances
    ↓
Media-generator: queries v_continuity_candidates view
    ↓
Output: flags citizens with continuing stories
```

### Optional Enhancement (Future)

- Add `continuityHints` population to engine-side export (currently empty array placeholder)

### OpenClaw SQLite Schema (Ready)

```sql
-- Already in openclaw-skills/schemas/godworld.sql
media_appearances INTEGER DEFAULT 0,
last_mention_cycle INTEGER,
mention_streak INTEGER DEFAULT 0,
```

**Success Criteria:** Media packet flags "Continuing story: Ramon Vega (mentioned 4 of last 6 cycles)"

---

## Optional: Sports Integration

**Goal:** Manual Sports_Feed entries seed SPORTS events and affect city mood.

| Task | Location | Description |
|------|----------|-------------|
| Add `SentimentModifier` column | Sports_Feed | Win streak = +0.03, losing = -0.02 |
| Add `EventTrigger` column | Sports_Feed | "hot-streak", "playoff-push", "championship" |
| Add `HomeNeighborhood` column | Sports_Feed | Game days affect Jack London traffic/retail |
| Wire into City Dynamics | applyCityDynamics.js | Read Sports_Feed, apply sentiment |
| Wire into Event Generation | worldEventsEngine.js | EventTrigger spawns SPORTS events |

**Example Row:**
```
As | MLB | 85-62 | mid-season | W6 | +0.05 | playoff-push | Jack London | ...
```
→ Engine reads `playoff-push` → generates "A's clinch playoff spot" SPORTS event
→ Engine reads `+0.05` → boosts Oakland sentiment
→ Engine reads `Jack London` → increases that neighborhood's retail/traffic

---

## Design Pattern: Manual Entry → Story Seeding

**Problem:** You manually enter data (sports scores, initiative details, weather overrides) but it doesn't automatically flow into stories.

**Solution:** Add standard "trigger columns" to any ledger where manual entries should seed events.

### Standard Trigger Columns

| Column | Purpose | Values |
|--------|---------|--------|
| `EventTrigger` | What event type to generate | Domain-specific keywords |
| `SentimentModifier` | How it affects mood | -0.10 to +0.10 |
| `Severity` | How prominently to feature | 1-5 or LOW/MED/HIGH |
| `AffectedNeighborhoods` | Which areas impacted | Comma-separated list |
| `AffectedCitizens` | Which PopIds involved | Comma-separated PopIds |
| `StoryHook` | One-line narrative seed | Free text |

### Pattern Flow

```
Manual Ledger Entry
        ↓
Engine reads trigger columns
        ↓
    ┌───┴───┐
    ↓       ↓
Generate   Modify
Event      State
    ↓       ↓
    └───┬───┘
        ↓
Media Packet includes event + context
        ↓
Media Room writes story
```

### Applicable Ledgers

| Ledger | Trigger Use |
|--------|-------------|
| Sports_Feed | Team status → SPORTS events |
| Initiative_Tracker | Vote outcomes → CIVIC events |
| WorldEvents_Ledger | Manual events → any category |
| Arc_Ledger | Arc state changes → story hooks |
| Civic_Office_Ledger | Status changes → CIVIC events (resignation, illness) |

**Key Insight:** Any ledger with an `EventTrigger` column becomes a story source. The engine just needs a reader function that checks for non-empty triggers each cycle.

---

## Tier 7.0: OpenClaw Integration Foundation

**Goal:** Enable autonomous media generation via agent consumption of cycle exports.

**Status:** Complete

| Task | Location | Status |
|------|----------|--------|
| Add `exportCycleArtifacts_()` | utilities/exportCycleArtifacts.js | Done |
| Wire into engine as Phase 11 | godWorldEngine2.js:1399-1406 | Done |
| Document context pack schema | OPENCLAW_INTEGRATION.md | Done |
| Document manifest schema | OPENCLAW_INTEGRATION.md | Done |

### What's Exported

| File | Purpose |
|------|---------|
| `cycle-XX-summary.json` | Full `ctx.summary` snapshot |
| `cycle-XX-context.json` | Prompt-ready distilled pack |
| `manifest.json` | Latest cycle + SHA-256 checksums |

### Risk Flags (Deterministic)

The context pack derives routing flags without LLM:

| Flag | Condition |
|------|-----------|
| `high-tension` | `chaosEvents >= 2` |
| `negative-sentiment` | `sentiment <= -0.35` |
| `economic-stress` | `economicMood <= 35` |
| `high-incident-volume` | `totalIncidents > 80` |

### Next Steps (OpenClaw Side)

- [x] SQLite schema for citizens/initiatives/cycles (`openclaw-skills/schemas/godworld.sql`)
- [x] `godworld-sync` skill to consume manifest (`openclaw-skills/godworld-sync/`)
- [x] `media-generator` skill with Tribune/Echo/Continuity routing (`openclaw-skills/media-generator/`)
- [x] Continuity gate (`confidence >= 0.9 && risk <= 0.4`) (in media-generator/index.js:270)

**See:** `docs/archive/OPENCLAW_INTEGRATION.md` for full implementation plan.

---

## Deferred to Tier 8+

| Idea | Why Deferred |
|------|--------------|
| City Memory / Epigenetics | Needs ripple system complete first |
| Shock Cascades | Ripple system handles this |
| Branching Story Arcs | Enhancement to existing Arc_Ledger, not urgent |
| Crime Heatmap Spillover | Good realism, lower priority than economy |
| Living Institutions | Big architectural change, scope creep |
| Adaptive Media Narrative | Polish, not mechanics |
| Event Veracity / Misinfo | Whole new dimension, not essential |
| Weather Micro-Climates | Over-engineering |

---

## Dependency Graph

```
[Prerequisites: v1.5 bug fixes]
            ↓
    [Tier 7.1: Ripple System]
            ↓
    ┌───────┴───────┐
    ↓               ↓
[7.2: Micro-     [7.3: Life Path]
 Economies]            ↓
    ↓           [7.4: Continuity]
    └───────┬───────┘
            ↓
    [Tier 8: City Memory / Cascades]
```

---

## Issues Found During Cycles

*Add issues discovered during cycle runs here:*

| Cycle | Issue | Affects | Notes |
|-------|-------|---------|-------|
| 78 | `ss.getSheetByName` parameter mismatch | Tier 7.1, 7.2 | **FIXED** - renamed utility function |
| 78 | Demographics unavailable for vote | Tier 7.1 | Should resolve with Bug #7 fix |
| 78 | AffectedNeighborhoods empty | Tier 7.1 | Ripple created for 0 neighborhoods |
| 78 | EventArc engine blocked | Tier 7.4 | May need separate fix for getCurrentCycle_ |
| 78 | `[object Object]` in auditIssues | Media output | **FIXED** - godWorldEngine2.js:65-69 now pushes strings |
| 78 | Empty world events (`- [low]`) | Media output | **FIXED** - generateCrisisBuckets.js now adds description field |

---

## Version History

| Tier | Theme | Status |
|------|-------|--------|
| 1-6 | Foundation (demographics, careers, civic, media) | Complete |
| 7.0 | OpenClaw integration foundation | Complete |
| 7.1 | Ripple system (initiative → neighborhood effects) | Complete (v1.5) |
| 7.2 | Neighborhood micro-economies | Complete (v2.3) |
| 7.3 | Citizen life path evolution (archetypes + traits) | Complete (v1.2) |
| 7.4 | Continuity threading (mention tracking) | Complete (OpenClaw-side) |
| 8 | City memory, shock cascades | Future |

---

## Tier 7 Summary

**Core systems implemented:**
- Initiative ripples with 8 effect types and decay
- 22 economic triggers with neighborhood sensitivity
- 7 citizen archetypes + 5 trait axes
- Continuity notes parsing with arc relationships

**Remaining for Tier 7 completion:**
1. Integration testing across 5+ cycles
2. (Optional) Add engine-side continuityHints population

**Ready for Claude integration:**
- Engine exports context packs (Phase 11)
- OpenClaw skills ready for deployment
- SQLite schema includes mention tracking
