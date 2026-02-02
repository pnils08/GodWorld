# Tier 7 Roadmap

**Previous:** Tiers 1-6 complete (see ENGINE_ROADMAP.md)
**Current Tier:** 7
**Theme:** Ripple Effects, Economic Depth, Citizen Trajectories
**Created:** 2026-02-02

---

## Tier 7 Overview

Tier 7 focuses on making simulation effects **persist and compound over time**. The foundation (demographics, careers, civic initiatives) exists. Now we make those systems talk to each other.

**Core Principle:** Every major event should create ripples that affect neighborhoods and citizens across multiple cycles.

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

| Task | Location | Description |
|------|----------|-------------|
| Build `applyActiveInitiativeRipples_()` | civicInitiativeEngine.js | Decay and apply ripple effects each cycle |
| Wire into engine orchestrator | godWorldEngine2.js | Call ripple consumer in Phase 02 or 06 |
| Add AffectedNeighborhoods column | Initiative_Tracker | Helper function for existing sheets |
| Add PolicyDomain column | Initiative_Tracker | Optional, fallback to name keywording |

**Success Criteria:** Pass an initiative, run 5 cycles, verify neighborhood metrics change and decay.

---

## Tier 7.2: Neighborhood Micro-Economies

**Goal:** Each neighborhood has local economic indicators that affect citizens and events.

| Task | Location | Description |
|------|----------|-------------|
| Add neighborhood economy indices | Neighborhood_Demographics | retail_health, employment_local, business_activity |
| Extend applyCityDynamics.js | phase02-world-state | Compute per-neighborhood economic state |
| Connect to demographic drift | phase03-population | Consumer demand tied to demographics |
| Feed into Career Engine | runCareerEngine.js | Local economy affects job availability |

**Builds On:**
- Existing 17 neighborhoods with demographics
- Career Engine v2.3.1
- Economic Ripple Engine v2.3

**Success Criteria:** Neighborhood with high unemployment shows lower retail_health. Career outcomes vary by neighborhood.

---

## Tier 7.3: Citizen Life Path Evolution

**Goal:** Citizens accumulate state over time that affects their trajectory.

| Task | Location | Description |
|------|----------|-------------|
| Add life_path fields to citizens | Simulation_Ledger | skill_level, health_state, mobility_score |
| Career affects skill | runCareerEngine.js | Promotions increase skill, layoffs decrease |
| Education affects mobility | runEducationEngine.js | Degree completion unlocks career paths |
| Health events affect trajectory | generateCitizenEvents.js | Illness/recovery modifies health_state |

**Builds On:**
- Career Engine v2.3.1 (currently "soft observations only")
- Education Engine
- Citizen tier system

**Success Criteria:** Track a Tier-1 citizen across 10 cycles. Their skill/health/mobility changes based on events.

---

## Tier 7.4: Continuity Threading

**Goal:** Repeated citizen mentions across cycles create story depth.

| Task | Location | Description |
|------|----------|-------------|
| Track citizen mention counts | LifeHistory_Log or new field | How many cycles has this citizen appeared? |
| Thread events to past mentions | generateCitizenEvents.js | Reference previous events for same citizen |
| Media Room continuity hints | buildMediaPacket.js | Flag citizens with story threads |

**Builds On:**
- LifeHistory_Log
- Citizen event generation
- Media briefing system

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

---

## Version History

| Tier | Theme | Status |
|------|-------|--------|
| 1-6 | Foundation (demographics, careers, civic, media) | Complete |
| 7 | Ripple effects, economic depth, citizen trajectories | Planning |
| 8 | City memory, shock cascades | Future |
