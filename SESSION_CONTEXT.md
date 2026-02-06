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

### 2026-02-06
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
2. Tier 7.1 (Ripple System) ready to start - wire ripple consumer into engine
3. OpenClaw integration ready for setup when desired
4. AutoGen deferred to future project
5. POP-ID article index available for media continuity checks
6. **COMPLETE**: Journalist personas enriched (v2.0) - 25 full voice profiles ready for Media Room
7. **COMPLETE**: rosterLookup.js enhanced (v2.0) - new voice profile functions available
8. **COMPLETE**: Theme-aware hook generation (storyHook.js v3.8)
9. **COMPLETE**: Voice-matched story seeds (applyStorySeeds.js v3.9)

---

## Future Enhancements: Journalist Roster Integration

*Added 2026-02-05 for future review*

### Files to Enhance

| File | Current State | Enhancement |
|------|--------------|-------------|
| `mediaRoomBriefingGenerator.js` | Lists reporter assignments | Add voice profiles to Section 13 (SECTION ASSIGNMENTS) |
| `storyHook.js` | Desk mapping only | Match journalist `themes` to story topics for better assignment |
| `buildMediaPacket.js` | Story seeds without voice guidance | Include voice guidance with each story seed |

### New Functions to Add (rosterLookup.js)

1. **`findJournalistsByTheme_(theme)`**
   - Input: theme keyword (e.g., "accountability", "faith", "infrastructure")
   - Output: Array of journalists whose `themes` array contains that keyword
   - Use case: Route stories to journalists whose voice fits the topic

2. **`suggestStoryAngle_(journalistName, storyTopic)`**
   - Based on journalist's `themes` and `samplePhrases`, suggest angles they'd naturally pursue
   - Example: Health story + Dr. Lila Mezran → "expansion pattern" or "containment" angle

3. **`matchCitizenToJournalist_(citizenArchetype, neighborhoodContext)`**
   - Match citizen archetypes to journalist styles for interview assignments
   - Example: Neighborhood elder in Fruitvale → Maria Keen (Faith, Family themes)

### Briefing Generator Enhancements

1. **Section 17: VOICE PROFILES**
   - Add new section with `getFullVoiceProfile_()` output for all journalists assigned to priority stories
   - Gives Media Room complete voice guidance in one place

2. **Enhanced Section 13**
   - Include `openingStyle` and top 3 `themes` next to each reporter assignment
   - Example: `Carmen Delaine (Civic) — Opening: System status reports | Themes: Civic load, Calm cycles`

### Story Hook Enhancements

1. **Theme-Aware Hook Generation**
   - When generating hooks, check which journalist's themes align with the story topic
   - Prioritize assignments where journalist themes match story domain

2. **Voice-Matched Story Seeds**
   - Include journalist voice guidance with each story seed
   - Example: "Health cluster expanding → Dr. Lila Mezran | Angle: 'What we didn't predict'"
