# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-06 | Engine: v3.1 | Cycle: 78

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
| Story Hook | storyHook.js | v3.9 | Theme-aware hooks + sports feed triggers |
| Story Seeds | applyStorySeeds.js | v3.9 | Voice-matched story seeds |
| Roster Lookup | rosterLookup.js | v2.2 | Theme matching, voice profiles, citizen-to-journalist matching |
| Media Briefing | mediaRoomBriefingGenerator.js | v2.6 | Consumer wiring: Section 13/14/17 enhancements |
| Media Packet | buildMediaPacket.js | v2.4 | Voice guidance on story seeds & hooks |
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
| docs/ENGINE_ROADMAP.md | Implementation status (Tiers 1-6 complete, Tier 7 in TIER_7_ROADMAP) |
| docs/TIER_7_ROADMAP.md | Tier 7 planning (ripples, micro-economies, life paths) |
| docs/CIVIC_INITIATIVE_v1.5_UPGRADE.md | Bug fixes and upgrades tracking |
| docs/OPENCLAW_INTEGRATION.md | OpenClaw setup for citizen memory + automation |
| docs/AUTOGEN_INTEGRATION.md | AutoGen multi-agent newsroom (superseded by AGENT_NEWSROOM.md) |
| docs/AGENT_NEWSROOM.md | **NEW** - 25-agent Bay Tribune newsroom using Claude Agent SDK |
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

### 2026-02-06 (Session 3)
- **Consumer Wiring**: mediaRoomBriefingGenerator.js v2.5 → v2.6
  - **Section 13 Enhanced**: Desk assignments now show journalist `openingStyle` + top 3 `themes` as indented detail lines
    - New helper: `getAssignmentDetail_(assignmentStr)` — extracts lead journalist, looks up roster data
  - **Section 14 Wired**: `matchCitizenToJournalist_()` now called for each citizen spotlight entry
    - Shows best-fit journalist, interview angle, and confidence level
    - Uses first active arc domain as story context
  - **Section 17 Added**: VOICE PROFILES — new section between Section 16 and Footer
    - Outputs `getFullVoiceProfile_()` for up to 5 priority-assigned journalists
    - New helper: `generateVoiceProfiles_(frontPageCall, assignments, arcReport)`
  - **Shared helper**: `extractJournalistName_(str)` — parses journalist names from assignment strings
  - All changes backward compatible with `typeof` guards
- **Git workflow**: Synced local main with GitHub (was 9 commits behind), configured GitHub token for pushes
- **Stale local changes**: Committed leftover uncommitted work from previous sessions (rosterLookup.js v2.2 matchCitizenToJournalist_, .gitignore credentials/, googleapis dependency, lib/sheets.js, scripts/)
- **PRIORITY_TASKS.md**: Consumer Wiring tasks marked Done (3/3), next action → integration testing
- **buildMediaPacket.js v2.4**: Voice guidance added to Section 7 (Story Seeds & Hooks)
  - Seeds and hooks now show suggestedJournalist, suggestedAngle, matchConfidence
  - First line of voiceGuidance displayed inline
  - Last open roster integration item — all consumer wiring now complete
- **Multi-journalist coverage gap fix**: `extractAllJournalistNames_()` splits multi-journalist strings (e.g., "Anthony/P Slayer/Hal Richmond"), sports + chicago desks added to Section 17 voice profile collection, cap raised to 8
- **Hardcoded Spreadsheet ID**: Already done (v2.14) — marked as Done in PRIORITY_TASKS.md
- **Sports Integration**: Wired orphaned `sportsEventTriggers` and `sportsNeighborhoodEffects` into consumers
  - **storyHook.js v3.9**: 9 trigger types (hot-streak, cold-streak, playoff-push, playoff-clinch, eliminated, championship, rivalry, home-opener, season-finale) generate team-specific story hooks
  - **cityEveningSystems.js**: Game-day crowd boost — sports neighborhood effects added to crowd map
  - **mediaRoomBriefingGenerator.js**: Section 12 (SPORTS DESK) now shows active triggers with team, streak, and sentiment
  - **buildMediaPacket.js v2.4**: Voice guidance on story seeds and hooks (Section 7)
- **PRIORITY_TASKS.md**: Sports Integration marked Done, Hardcoded Spreadsheet ID marked Done
- **Engine-side continuityHints**: `computeRecurringCitizens_(ctx)` — v1.0
  - **New file**: `phase06-analysis/computeRecurringCitizens.js`
  - Aggregates citizen appearances across 4 data sources: namedSpotlights, cycleActiveCitizens, eventArcs, relationshipBonds
  - Citizens appearing in 2+ distinct sources marked as "recurring" (capped at 15)
  - Builds reverse name→popId lookup from `ctx.namedCitizenMap` to resolve bond citizen names
  - Populates `S.recurringCitizens` — consumed by `buildContinuityHints_()` in exportCycleArtifacts.js (Source 2, previously empty)
  - Wired into both V2 and V3 engines as `Phase6-RecurringCitizens` (after Spotlights, before CivicLoad)
  - **PRIORITY_TASKS.md**: Engine-side continuityHints marked Done (v1.0)
- **PolicyDomain column**: civicInitiativeEngine.js v1.6 integration complete
  - `createInitiativeTrackerSheet_()`: Added AffectedNeighborhoods (R) and PolicyDomain (S) columns to base schema
  - `seedInitiativeTracker_()`: All 6 seed initiatives now include PolicyDomain and AffectedNeighborhoods values
  - `calculateDemographicInfluence_()`: Now checks `demoContext.policyDomain` first, falls back to name keyword detection
  - Domains supported: health, housing, transit, education, economic, safety, environment, sports, senior
  - **PRIORITY_TASKS.md**: PolicyDomain column marked Done (v1.6)
- **Tech Debt: Null/Undefined Checks** — 22 fixes across top 3 highest-risk files
  - **civicInitiativeEngine.js** (6 fixes): `ripple.neighborhoods` guard in `getRippleEffectsForNeighborhood_`, swing voter array element checks, unavailable member guards in `isSwingVoterAvailable_` and vote result notes, manual vote `demoContext` missing `policyDomain`
  - **bondEngine.js** (8 fixes): Element null checks in `ensureBondEngineData_` (citizenEvents, storySeeds, eventArcs, worldEvents), `generateBondSummary_` active bond loops and hottest bonds
  - **economicRippleEngine.js** (8 fixes): Element null checks in all ripple iteration loops (`processActiveRipples_`, `calculateEconomicMood_`, `createRipple_`, `calculateNeighborhoodEconomies_`, `generateEconomicSummary_`)
  - **AUDIT_TRACKER.md**: Issue #8 updated to PARTIALLY FIXED

### 2026-02-06 (Session 2, continued)
- **Echo removal**: Removed all Echo (Oakland Echo) code and references — Echo was never a real publication (originated from Grok experimentation)
  - `openclaw-skills/media-generator/index.js`: Removed voice profile, routing logic, `buildEchoPrompt()`, prompt selection branch, filename mapping (47 lines deleted)
  - `docs/OPENCLAW_INTEGRATION.md`: Removed ~15 Echo references, updated routing matrix to tribune/continuity only
  - `docs/PROJECT_GOALS.md`: Removed "Echo Op-Ed" from Media Room description
  - `docs/AUTOGEN_INTEGRATION.md`: Marked as SUPERSEDED with header pointing to AGENT_NEWSROOM.md
- **Doc cleanup**: Aligned all documentation with current project state
  - `docs/CIVIC_INITIATIVE_v1.5_UPGRADE.md`: Status updated to v1.6 complete
  - `docs/PRIORITY_TASKS.md`: AutoGen reference → Agent Newsroom (Claude Agent SDK)
  - `SESSION_CONTEXT.md`: Future Enhancements section cleaned up, implemented items marked done

### 2026-02-06 (Session 2)
- **Agent Newsroom Architecture**: Designed Claude Agent SDK-based newsroom to replace AutoGen plan
  - 25 journalist agents from bay_tribune_roster.json, organized into 7 desks
  - Desk activation based on signal types (not all agents run every cycle)
  - MCP server for SQLite data access (citizens, arcs, cycles)
  - Mags Corliss (editor) + Rhea Morgan (continuity) run every cycle
  - Model tiers: Haiku for reporters, Sonnet for leads/editor
  - Estimated $0.50-2.50 per cycle depending on activity
  - **File**: `docs/AGENT_NEWSROOM.md`
  - Supersedes AutoGen approach (docs/AUTOGEN_INTEGRATION.md)

### 2026-02-06 (Session 1)
- **Theme-Aware Hook Generation & Voice-Matched Story Seeds**: Core implementation complete
  - **rosterLookup.js v2.1**: Added 3 new functions
    - `findJournalistsByTheme_(theme)` - find journalists by theme keyword (partial match)
    - `getThemeKeywordsForDomain_(domain, hookType)` - map domains to theme arrays
    - `suggestStoryAngle_(eventThemes, signalType)` - scoring-based journalist matching
  - **storyHook.js v3.8**: Theme-aware hook generation
    - `mapHookTypeToSignal_()` helper for signal-based fallback
    - `makeHook()` now includes: themes, suggestedJournalist, suggestedAngle, voiceGuidance, matchConfidence
  - **applyStorySeeds.js v3.9**: Voice-matched story seeds
    - `mapSeedTypeToSignal_()` helper for signal-based fallback
    - `makeSeed()` now includes same 5 new fields as hooks
  - **Backward Compatible**: All existing fields unchanged, new fields additive (null if no match)

### 2026-02-05
- **Git cleanup**: Merged `super-memory-chat-3bC53` (.mcp.json gitignore) and `main-branch-work-9q5nB` (README improvements) into main
- **Google Drive API**: Enabled for service account project `godworld-486407`
- **POP-ID Article Index**: Created searchable index linking citizens to media articles
  - Scanned 8 Drive folders: Oakland_Sports_Desk, Bay_Tribune_Oakland, As_Universe, The_Cycle_Pulse, Oakland_Supplementals, Mike_Paulson_Pressers, Chicago_Supplementals, Mara_Vance
  - Added citizens from sheets: Cultural_Ledger (+25), Chicago_Citizens (+90), Generic_Citizens (+175)
  - **Result**: 326 citizens, 367 articles, 4,922 references
  - **Files**: `docs/ARTICLE_INDEX_BY_POPID.md`, `docs/CITIZENS_BY_ARTICLE.md`
  - **Raw URLs**: `https://raw.githubusercontent.com/pnils08/GodWorld/main/docs/ARTICLE_INDEX_BY_POPID.md`
- **Journalist Persona Enrichment**: Updated `schemas/bay_tribune_roster.json` (v1.0 → v2.0)
  - Analyzed actual articles from Drive for 25 journalists
  - Added new fields: `writingPatterns`, `signatureThemes`, `samplePhrases`, `frequentSubjects`
  - Filled null `background` fields with character-appropriate backstories
  - Updated `quickLookup` section with themes and opening styles for all journalists
  - **Full voice profiles**: Anthony, P Slayer, Hal Richmond, Mags Corliss, Luis Navarro, Carmen Delaine, Maria Keen, Kai Marston, Farrah Del Rio, Tanya Cruz, DJ Hartley, Simon Leary, Selena Grant, Talia Finch, Dr. Lila Mezran, Trevor Shimizu, Sgt. Rachel Torres, Sharon Okafor, Mason Ortega, Angela Reyes, Noah Tan, Reed Thompson, MintConditionOakTown, Celeste Tran, Arman Gutiérrez
  - **Committed & pushed**: `29d7a95`
- **rosterLookup.js Enhancement**: Updated to v2.0 to use enriched persona data
  - `loadRoster_()` now includes `openingStyle`, `themes`, `samplePhrases`, `background` for all journalists
  - New functions: `getJournalistOpeningStyle_()`, `getJournalistThemes_()`, `getJournalistSamplePhrases_()`, `getJournalistBackground_()`
  - Enhanced `getVoiceGuidance_()` returns multi-line guidance with themes and sample phrases
  - New `getFullVoiceProfile_()` returns complete briefing block for Media Room use

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
2. **COMPLETE**: Tier 7.1 (Ripple System) - wired into engine Phase 6, next civic vote Cycle 80
3. OpenClaw integration ready for setup when desired
4. **Agent Newsroom planned** - Claude Agent SDK, 25 journalists, replaces AutoGen approach (see docs/AGENT_NEWSROOM.md)
5. POP-ID article index available for media continuity checks
6. **COMPLETE**: Journalist personas enriched (v2.0) - 25 full voice profiles ready
7. **COMPLETE**: rosterLookup.js enhanced (v2.1) - theme matching, voice profiles
8. **COMPLETE**: Theme-aware hook generation (storyHook.js v3.8)
9. **COMPLETE**: Voice-matched story seeds (applyStorySeeds.js v3.9)
10. **COMPLETE**: Consumer wiring — briefing v2.6 (Section 13 enhanced, Section 14 wired, Section 17 voice profiles)
11. **COMPLETE**: Sports Integration — trigger hooks, crowd effects, briefing display
12. **COMPLETE**: buildMediaPacket.js v2.4 — voice guidance on seeds/hooks
13. **COMPLETE**: Engine-side continuityHints — computeRecurringCitizens v1.0, wired Phase 6
14. **COMPLETE**: PolicyDomain column — sheet schema, seed data, demographic influence all wired
15. **PARTIAL**: Tech debt null checks — 22 fixes in civicInitiativeEngine, bondEngine, economicRippleEngine

---

## Completed Enhancements: Journalist Roster Integration

*Originally planned 2026-02-05, implemented 2026-02-06*

### Implemented (Session 1, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `findJournalistsByTheme_(theme)` | **Done** | rosterLookup.js v2.1 |
| `suggestStoryAngle_(eventThemes, signalType)` | **Done** | rosterLookup.js v2.1 |
| Theme-aware hook generation | **Done** | storyHook.js v3.8 |
| Voice-matched story seeds | **Done** | applyStorySeeds.js v3.9 |

### Implemented (Session 3, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `matchCitizenToJournalist_()` | **Done** | rosterLookup.js v2.2, wired in briefing Section 14 |
| Briefing Section 17: VOICE PROFILES | **Done** | mediaRoomBriefingGenerator.js v2.6 |
| Enhanced Section 13 | **Done** | mediaRoomBriefingGenerator.js v2.6 |

### Implemented (Session 3, continued, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `buildMediaPacket.js` voice guidance | **Done** | buildMediaPacket.js v2.4, Section 7 |
