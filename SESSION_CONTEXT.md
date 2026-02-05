# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-05 | Engine: v3.1 | Cycle: 78

---

## What Is This Project?

GodWorld is a **living city simulation** for Oakland (with Chicago satellite). It runs an 11-phase engine in Google Apps Script that generates citizens, events, relationships, and stories. Output feeds a Media Room (Claude) that writes journalism.

**User Context:** Beginner coder learning the project. Needs clear explanations, careful reviews before code changes, and explicit approval before edits.

---

## Critical Rules For This Session

1. **READ DOCS FIRST** - Don't assume. Check existing documentation.
2. **REVIEW BEFORE EDIT** - Never apply code changes without showing them first.
3. **ASK WHEN UNCLEAR** - Don't assume what the user wants.
4. **NO TUNNEL VISION** - Remember this is a 100+ script system with cascade dependencies.
5. **UPDATE THIS FILE** - At session end, note what changed.

---

## Project Structure (100+ scripts)

```
GodWorld/
├── phase01-config/        # Calendar, cycle init
├── phase02-world-state/   # Weather, city dynamics, transit
├── phase03-population/    # Demographics, migration, crisis
├── phase04-events/        # World events, faith events
├── phase05-citizens/      # 14 sub-engines (relationships, careers, civic, etc.)
├── phase06-analysis/      # Event filtering, economic ripple
├── phase07-evening-media/ # Media briefings, nightlife
├── phase08-v3-chicago/    # Chicago satellite, game integration
├── phase09-digest/        # Cycle summary
├── phase10-persistence/   # Write to 20+ ledgers
├── phase11-media-intake/  # Feedback processing
├── utilities/             # Shared helpers (caching, write-intents, etc.)
├── schemas/               # Data structure docs
├── docs/                  # Architecture references
└── _legacy/               # Disabled old code
```

---

## The 11-Phase Engine

| Phase | Purpose |
|-------|---------|
| 1 | Config - cycle, calendar, season, holiday |
| 2 | World State - weather, city dynamics, transit |
| 3 | Population - demographics, illness, employment |
| 4 | Events - 5-20 world events per cycle |
| 5 | Citizens - relationships, careers, households, civic |
| 6 | Analysis - filter, prioritize, detect patterns |
| 7 | Media - briefings, story hooks, nightlife |
| 8 | V3/Chicago - game integration |
| 9 | Digest - compress summary |
| 10 | Persistence - write to all ledgers |
| 11 | Media Intake - process feedback |

---

## Key Engines & Recent Versions

| Engine | File | Version | Notes |
|--------|------|---------|-------|
| Main Orchestrator | godWorldEngine2.js | - | Runs all phases |
| Career Engine | runCareerEngine.js | v2.3.1 | 4 industries, 3 employer types |
| Economic Ripple | economicRippleEngine.js | v2.3 | Reads careerSignals |
| Civic Initiative | civicInitiativeEngine.js | v1.6 | Date parsing fix, faction trim, ripple consumer |
| Story Hook | storyHook.js | v3.4 | Demographic story angles |
| Life History | compressLifeHistory.js | v1.2 | Career tags in TAG_TRAIT_MAP |

---

## Key Architecture Concepts

- **ctx** - Central context object passed through all phases
- **ctx.rng** - Deterministic random (never use Math.random())
- **Write-Intents** - Stage writes in memory, apply in Phase 10
- **Tiered Citizens** - Tier-1 (protected) → Tier-4 (generic)
- **Neighborhoods** - 17 Oakland districts with demographics (see GODWORLD_REFERENCE.md for list)
- **Arcs** - Multi-cycle storylines (SEED → ACTIVE → RESOLVED)

---

## Key Documentation

| Doc | Purpose |
|-----|---------|
| docs/ENGINE_ROADMAP.md | Implementation status (Tiers 1-6 complete) |
| docs/TIER_7_ROADMAP.md | Tier 7 planning (ripples, micro-economies, life paths) |
| docs/CIVIC_INITIATIVE_v1.5_UPGRADE.md | Bug fixes and upgrades tracking |
| docs/OPENCLAW_INTEGRATION.md | OpenClaw setup for citizen memory + automation |
| docs/AUTOGEN_INTEGRATION.md | AutoGen multi-agent newsroom (future project) |
| docs/GODWORLD_REFERENCE.md | Full system reference |
| docs/V3_ARCHITECTURE.md | Technical contract, ctx shape |
| docs/ARTICLE_INDEX_BY_POPID.md | **NEW** - Search articles by POP-ID (326 citizens, 367 articles) |
| docs/CITIZENS_BY_ARTICLE.md | **NEW** - Search citizens by article name |
| schemas/SCHEMA_HEADERS.md | All ledger schemas |

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Session History

### 2026-02-05
- **Git cleanup**: Merged `super-memory-chat-3bC53` (.mcp.json gitignore) and `main-branch-work-9q5nB` (README improvements) into main
- **Google Drive API**: Enabled for service account project `godworld-486407`
- **POP-ID Article Index**: Created searchable index linking citizens to media articles
  - Scanned 8 Drive folders: Oakland_Sports_Desk, Bay_Tribune_Oakland, As_Universe, The_Cycle_Pulse, Oakland_Supplementals, Mike_Paulson_Pressers, Chicago_Supplementals, Mara_Vance
  - Added citizens from sheets: Cultural_Ledger (+25), Chicago_Citizens (+90), Generic_Citizens (+175)
  - **Result**: 326 citizens, 367 articles, 4,922 references
  - **Files**: `docs/ARTICLE_INDEX_BY_POPID.md`, `docs/CITIZENS_BY_ARTICLE.md`
  - **Raw URLs**: `https://raw.githubusercontent.com/pnils08/GodWorld/main/docs/ARTICLE_INDEX_BY_POPID.md`

### 2026-02-02 (Session 2)
- **civicInitiativeEngine v1.6**: Fixed VoteRequirement date parsing bug (Google Sheets auto-formats "6-3" as June 3rd), faction whitespace trim
- **CIVIC_INITIATIVE_v1.5_UPGRADE.md**: Updated - Bug #7 fixed (function naming collision), ripple consumer implemented
- **OPENCLAW_INTEGRATION.md**: Created - Full setup guide, custom skills, citizen memory layer, SQLite integration
- **AUTOGEN_INTEGRATION.md**: Created - Multi-agent newsroom planning, full starter script, cost analysis
- **utilities/ensureNeighborhoodDemographics.js**: Renamed `updateNeighborhoodDemographics_` to `updateSingleNeighborhoodDemographics_`

### 2026-02-02 (Session 1)
- Created SESSION_CONTEXT.md
- Previous session: Career Engine v2.3.1, Economic Ripple v2.3, compressLifeHistory v1.2

### Prior Work
- Tiers 1-6 complete per ENGINE_ROADMAP.md
- Neighborhood Demographics integrated
- Faith/Youth/Transit/Crime engines added
- Write-intents model implemented

---

## How To Use This File

**At session start:** Tell Claude "read SESSION_CONTEXT.md"

**During session:** Reference this for architecture questions

**At session end:** Update the Session History section with what changed

---

## Current Work / Next Steps

(Update this section each session)

**Priority Task List:** See `docs/PRIORITY_TASKS.md` for ordered task list

**Summary:**
1. v1.5/v1.6 bug fixes mostly complete
2. Tier 7.1 (Ripple System) ready to start - wire ripple consumer into engine
3. OpenClaw integration ready for setup when desired
4. AutoGen deferred to future project
5. **NEW**: POP-ID article index available for media continuity checks - can load into Claude for citizen lookup
