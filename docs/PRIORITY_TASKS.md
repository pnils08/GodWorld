# Priority Task List

**Created:** 2026-02-02
**Status:** Active tracking document

---

## How to Use This Document

Tasks are ordered by priority. Complete tasks in order unless dependencies require otherwise. Check off items as completed and add notes.

---

## Completed This Session

| Task | Source Doc | Status |
|------|------------|--------|
| VoteRequirement date parsing bug | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE (v1.6) |
| Faction whitespace trim | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE (v1.6) |
| Bug #7: ss vs ctx parameter mismatch | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE |
| Math.random() → ctx.rng() | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE (v1.5) |
| Ripple consumer function created | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE (v1.5) |
| Delayed status handling | CIVIC_INITIATIVE_v1.5_UPGRADE.md | DONE (v1.5) |
| OpenClaw integration doc | New | DONE |
| AutoGen integration doc | New | DONE |

---

## Priority 1: Immediate (Next Session)

### 1.1 Wire Ripple Consumer into Engine
**Source:** TIER_7_ROADMAP.md (Tier 7.1)
**File:** godWorldEngine2.js
**Task:** Call `applyActiveInitiativeRipples_(ctx)` in Phase 02 or Phase 06
**Why:** Ripple consumer function exists but isn't called yet. No effect until wired in.
**Status:** [ ] Not started

### 1.2 Test Ripple System End-to-End
**Source:** TIER_7_ROADMAP.md (Tier 7.1)
**Task:**
- Create initiative with AffectedNeighborhoods populated
- Run 5 cycles
- Verify neighborhood metrics change and decay
**Why:** Validates the ripple system actually works
**Status:** [ ] Not started

### 1.3 Add AffectedNeighborhoods Helper
**Source:** CIVIC_INITIATIVE_v1.5_UPGRADE.md
**File:** civicInitiativeEngine.js
**Task:** Create `addAffectedNeighborhoodsColumn()` helper for existing Initiative_Tracker sheets
**Why:** Column exists in schema but may be missing from existing sheets
**Status:** [ ] Not started

---

## Priority 2: Engine Integration (After Priority 1)

### 2.1 Quorum vs Votes-Needed Separation
**Source:** CIVIC_INITIATIVE_v1.5_UPGRADE.md
**File:** civicInitiativeEngine.js
**Task:** Separate minimum quorum (5) from votes to pass. Allow 5-4 failures instead of delays.
**Why:** More realistic politics, more dramatic outcomes
**Status:** [ ] Not started

### 2.2 Add PolicyDomain Column
**Source:** CIVIC_INITIATIVE_v1.5_UPGRADE.md
**File:** civicInitiativeEngine.js + Initiative_Tracker
**Task:** Add optional PolicyDomain column (Health, Housing, Transit, etc.)
**Why:** Better than fallback name keywording for demographic influence
**Status:** [ ] Not started

### 2.3 Fix getCurrentCycle_ Parameter Handling
**Source:** CIVIC_INITIATIVE_v1.5_UPGRADE.md (Bug #7 related)
**File:** phase10-persistence/cycleExportAutomation.js
**Task:** Make function accept both ctx and ss parameters
**Why:** EventArc engine may still be blocked
**Status:** [ ] Not started

---

## Priority 3: Tier 7.2 - Neighborhood Micro-Economies

### 3.1 Add Neighborhood Economy Indices
**Source:** TIER_7_ROADMAP.md (Tier 7.2)
**File:** Neighborhood_Demographics sheet
**Task:** Add columns: retail_health, employment_local, business_activity
**Status:** [ ] Not started

### 3.2 Extend City Dynamics for Per-Neighborhood Economics
**Source:** TIER_7_ROADMAP.md (Tier 7.2)
**File:** phase02-world-state/applyCityDynamics.js
**Task:** Compute per-neighborhood economic state
**Status:** [ ] Not started

### 3.3 Connect Demographics to Micro-Economy
**Source:** TIER_7_ROADMAP.md (Tier 7.2)
**File:** phase03-population
**Task:** Consumer demand tied to demographics
**Status:** [ ] Not started

### 3.4 Local Economy Affects Career Engine
**Source:** TIER_7_ROADMAP.md (Tier 7.2)
**File:** runCareerEngine.js
**Task:** Job availability varies by neighborhood economy
**Status:** [ ] Not started

---

## Priority 4: Tier 7.3 - Citizen Life Path Evolution

### 4.1 Add Life Path Fields to Citizens
**Source:** TIER_7_ROADMAP.md (Tier 7.3)
**File:** Simulation_Ledger schema
**Task:** Add skill_level, health_state, mobility_score
**Status:** [ ] Not started

### 4.2 Career Affects Skill Level
**Source:** TIER_7_ROADMAP.md (Tier 7.3)
**File:** runCareerEngine.js
**Task:** Promotions increase skill, layoffs decrease
**Status:** [ ] Not started

### 4.3 Education Affects Mobility
**Source:** TIER_7_ROADMAP.md (Tier 7.3)
**File:** runEducationEngine.js
**Task:** Degree completion unlocks career paths
**Status:** [ ] Not started

### 4.4 Health Events Affect Trajectory
**Source:** TIER_7_ROADMAP.md (Tier 7.3)
**File:** generateCitizenEvents.js
**Task:** Illness/recovery modifies health_state
**Status:** [ ] Not started

---

## Priority 5: Tier 7.4 - Continuity Threading

### 5.1 Track Citizen Mention Counts
**Source:** TIER_7_ROADMAP.md (Tier 7.4)
**File:** LifeHistory_Log or new field
**Task:** Track how many cycles each citizen has appeared
**Status:** [ ] Not started

### 5.2 Thread Events to Past Mentions
**Source:** TIER_7_ROADMAP.md (Tier 7.4)
**File:** generateCitizenEvents.js
**Task:** Reference previous events for same citizen
**Status:** [ ] Not started

### 5.3 Media Room Continuity Hints
**Source:** TIER_7_ROADMAP.md (Tier 7.4)
**File:** buildMediaPacket.js
**Task:** Flag citizens with ongoing story threads
**Status:** [ ] Not started

---

## Priority 6: Optional Enhancements

### 6.1 Sports Integration
**Source:** TIER_7_ROADMAP.md (Optional)
**Task:** Add trigger columns to Sports_Feed, wire into city dynamics
**Status:** [ ] Not started

### 6.2 OpenClaw Setup
**Source:** OPENCLAW_INTEGRATION.md
**Task:** Install OpenClaw, configure citizen memory persistence
**When:** When ready to add AI memory layer
**Status:** [ ] Not started

---

## Future Projects (Deferred)

| Project | Source | Notes |
|---------|--------|-------|
| AutoGen Multi-Agent Newsroom | AUTOGEN_INTEGRATION.md | Python project, multi-agent collaboration |
| City Memory / Epigenetics | TIER_7_ROADMAP.md (Tier 8) | Needs ripple system complete |
| Shock Cascades | TIER_7_ROADMAP.md (Tier 8) | Future tier |
| Branching Story Arcs | TIER_7_ROADMAP.md (Tier 8) | Enhancement, not urgent |

---

## Progress Tracking

| Priority | Total Tasks | Completed | Remaining |
|----------|-------------|-----------|-----------|
| 1 (Immediate) | 3 | 0 | 3 |
| 2 (Integration) | 3 | 0 | 3 |
| 3 (Micro-Economy) | 4 | 0 | 4 |
| 4 (Life Path) | 4 | 0 | 4 |
| 5 (Continuity) | 3 | 0 | 3 |
| 6 (Optional) | 2 | 0 | 2 |

**Next Action:** Start with Priority 1.1 - Wire ripple consumer into godWorldEngine2.js
