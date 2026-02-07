# GodWorld Engine Audit Tracker
## For Mara, Claude Code, and Maker Coordination

**Audit Date:** January 2026
**Auditor:** Claude Code (first full codebase review)
**Engine Version:** v2.7
**Total Files:** 129 (110 active + 19 in _legacy)
**Total Lines:** ~52,000

---

## Audit Status Overview

| Priority | Total Issues | Fixed | Remaining |
|----------|-------------|-------|-----------|
| CRITICAL | 4 | 4 | 0 |
| HIGH | 8 | 4 | 4 |
| MEDIUM | 6 | 1 | 5 |

**Last Updated:** Feb 2026 - Hardcoded Spreadsheet ID fix (v2.14)

---

## CRITICAL ISSUES

### 1. ~~eval() Security Vulnerability~~ - FIXED
- **File:** `phase08-v3-chicago/v3Integration.js` (was v3Intergration.js)
- **Status:** COMPLETED
- **Fix:** Replaced with function registry pattern (v3.5)
- **Date Fixed:** Jan 2026

### 2. ~~Hardcoded Spreadsheet ID~~ - FIXED
- **File:** `phase01-config/godWorldEngine2.js:24`
- **Also in:** 16 other files (17 total)
- **Issue:** `SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk'`
- **Risk:** Cannot deploy to different environments, V3 will need different sheets
- **Fix:** Created `getSimSpreadsheetId_()` and `openSimSpreadsheet_()` in utilityFunctions.js (v2.14)
  - Reads from Script Properties (`SIM_SSID`) if set
  - Falls back to default production ID
  - Updated all 17 files to use `openSimSpreadsheet_()`
- **Schema Impact:** None (uses Script Properties, not World_Config)
- **Status:** COMPLETED
- **Date Fixed:** Feb 2026

### 3. ~~No Sheets API Caching/Batching~~ - FIXED
- **Files:** 86 files with 1,347 getRange/getValue calls
- **Issue:** Each call = network roundtrip, risk of timeout on large datasets
- **Risk:** V3 scaling will hit rate limits
- **Fix:** Created `utilities/sheetCache.js` with `createSheetCache_()` (v2.10)
  - Caches sheet reads (reduces redundant API calls)
  - Queues writes for batch execution
  - Flushes all writes at cycle end
  - Integrated into Phase 1 (loadConfig_, advanceWorldTime_, updateWorldPopulation_)
- **Schema Impact:** None (internal optimization)
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 4. ~~Missing Error Handling~~ - FIXED
- **Files:** godWorldEngine2.js (main cycle)
- **Issue:** Silent failures, no error recovery
- **Risk:** Data loss, cycle corruption
- **Fix:** Added `safePhaseCall_()` wrapper and `logEngineError_()` helper (v2.9)
- **Schema Impact:** None (creates Engine_Errors sheet only if errors occur)
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

---

## HIGH PRIORITY ISSUES

### 5. ~~Filename Typo~~ - FIXED
- **File:** v3Intergration.js → v3Integration.js
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 6. ~~Duplicate Utility Functions~~ - FIXED
- **Functions:** `pickRandom_()`, `safeGet_()`, `shortId_()`, `ensureSheet_()`, etc.
- **Copies:** Was 2-3 instances each across files
- **Fix:** Consolidated to `utilities/utilityFunctions.js`, removed duplicates (v2.9)
- **Schema Impact:** None
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 7. ~~Hardcoded Sheet Names~~ - PARTIALLY FIXED
- **Count:** 100+ occurrences of string literals like `'World_Config'`
- **Fix:** Created `utilities/sheetNames.js` with SHEET_NAMES constant (v2.9)
- **Schema Impact:** None (just code organization)
- **Status:** CONSTANT CREATED - Gradual migration during refactors
- **Date Fixed:** Jan 2026
- **Note:** Existing code still uses strings; new code should use SHEET_NAMES

### 8. Missing Null/Undefined Checks - PARTIALLY FIXED
- **Count:** 272 instances of loose conditionals (original audit)
- **Example:** `if (!arr)` without checking if arr is actually an array
- **Risk:** Runtime errors on unexpected data
- **Fix Applied (Feb 2026):** Null guards added to top 3 highest-risk files:
  - `civicInitiativeEngine.js`: 6 fixes — ripple.neighborhoods guard, swing voter array element checks, unavailable member guards, manual vote policyDomain
  - `bondEngine.js`: 8 fixes — element null checks in ensureBondEngineData_ (4 source arrays), generateBondSummary_ (3 loops + hottest bonds)
  - `economicRippleEngine.js`: 8 fixes — element null checks in all ripple iteration loops (processActiveRipples_, calculateEconomicMood_, createRipple_, calculateNeighborhoodEconomies_, generateEconomicSummary_)
- **Schema Impact:** None
- **Status:** PARTIALLY FIXED — Phase 7 media files (64 remaining) deferred

### 9. ~~Column Index -1 Bug~~ - FIXED
- **File:** `phase01-config/godWorldEngine2.js:547-551`
- **Issue:** If column not found, `idx = -1`, then `getRange(2, 0)` fails
- **Fix:** Added `if (idx >= 0)` guards before each write
- **Schema Impact:** None
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 10. Array Mutation in Loops - PENDING
- **File:** `utilities/utilityFunctions.js:16`
- **Issue:** `.splice()` while iterating
- **Risk:** Could skip elements
- **Fix Required:** Use reverse iteration or copy
- **Schema Impact:** None
- **Status:** LOW PRIORITY

### 11. Functions >1000 Lines - PENDING
- **Files:**
  - `mediaRoomBriefingGenerator.js` (1,452 lines)
  - `mediaFeedbackEngine.js` (1,340 lines)
  - `bondEngine.js` (1,271 lines)
  - `civicInitiativeEngine.js` (1,229 lines)
- **Fix Required:** Break into smaller focused functions
- **Schema Impact:** None
- **Status:** V3 REFACTOR - too risky to change now

### 12. Tight Coupling via ctx.summary - PENDING
- **Issue:** 40+ fields assumed to exist, no validation
- **Risk:** Silent failures if Phase 1 doesn't set expected values
- **Fix Required:** Add schema validation in Phase 1
- **Schema Impact:** None (internal validation)
- **Status:** V3 REFACTOR

---

## MEDIUM PRIORITY ISSUES

### 13. var Instead of const/let - PENDING
- **Count:** 100+ instances in modern code
- **Status:** LOW PRIORITY - cosmetic

### 14. Hardcoded Holiday Lists - PENDING
- **File:** `godWorldEngine2.js:331-471`
- **Count:** 30+ holiday names hardcoded
- **Fix Required:** Move to configuration sheet
- **Schema Impact:** Would need Holiday_Config sheet
- **Status:** V3 FEATURE

### 15. ~~Hardcoded Neighborhood Lists~~ - FIXED
- **File:** `bondEngine.js:72-78`
- **Count:** 72 lines of hardcoded neighborhoods
- **Fix:** Added `loadNeighborhoodsFromSheet_()` to read from Neighborhood_Map (v2.3)
  - Uses ctx.cache for efficient access
  - Falls back to direct sheet access if cache unavailable
  - Falls back to defaults if sheet is empty/missing
- **Schema Impact:** None (already exists)
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 16. Float Precision Drift - PENDING
- **File:** `godWorldEngine2.js:315-356`
- **Issue:** Illness/employment rates accumulate rounding errors
- **Fix Required:** Round after each operation, not just at bounds
- **Schema Impact:** None
- **Status:** LOW PRIORITY

### 17. Race Condition in Export - PENDING
- **File:** `cycleExportAutomation.js:245-276`
- **Issue:** File operations not atomic
- **Risk:** Data corruption with concurrent runs
- **Fix Required:** Add LockService
- **Schema Impact:** None
- **Status:** LOW PRIORITY (single-user currently)

### 18. Memory Inefficiency - PENDING
- **File:** `citizenContextBuilder.js:62-75`
- **Issue:** Building massive profiles without cleanup
- **Risk:** Timeout on large citizen populations
- **Status:** V3 REFACTOR

---

## LEDGER AUDIT (Tier 2.2)

**Status:** IN PROGRESS
**Started:** Jan 2026

### LifeHistory_Log (18 files reference)
**Concern:** 2500+ rows, append-only

| File | Phase | Operation |
|------|-------|-----------|
| citizenContextBuilder.js | 5 | READ |
| generateGenericCitizens.js | 5 | WRITE |
| runRelationshipEngine.js | 5 | WRITE |
| generateNamedCitizensEvents.js | 5 | WRITE |
| runAsUniversePipeline.js | 5 | WRITE |
| runCareerEngine.js | 5 | WRITE |
| runEducationEngine.js | 5 | WRITE |
| checkForPromotions.js | 5 | WRITE |
| processAdvancementIntake.js | 5 | WRITE |
| runCivicRoleEngine.js | 5 | WRITE |
| runHouseholdEngine.js | 5 | WRITE |
| runNeighborhoodEngine.js | 5 | WRITE |
| godWorldEngine2.js | 1 | CONFIG |
| generateGenericCitizenMicroEvent.js | 4 | WRITE |
| generateGameModeMicroEvents.js | 4 | WRITE |
| generationalEventsEngine.js | 4 | WRITE |
| generateCitizenEvents.js | 4 | WRITE |
| cycleExportAutomation.js | 10 | READ/EXPORT |

### WorldEvents_Ledger (4 files reference)
**Concern:** Every event ever stored

| File | Phase | Operation |
|------|-------|-----------|
| worldEventsLedger.js | 4 | WRITE |
| recordWorldEventsv25.js | 10 | WRITE |
| cycleExportAutomation.js | 10 | READ/EXPORT |

### Relationship_Bonds (6 files reference)
**Concern:** Read every cycle

| File | Phase | Operation |
|------|-------|-----------|
| seedRelationBondsv1.js | 5 | WRITE (seed) |
| citizenContextBuilder.js | 5 | READ |
| bondPersistence.js | 5 | WRITE |
| bondEngine.js | 5 | READ/WRITE |
| cycleExportAutomation.js | 10 | READ/EXPORT |

### Key Finding: citizenContextBuilder.js Performance Issue
**Location:** `phase05-citizens/citizenContextBuilder.js:387-404`
**Problem:** Reads ENTIRE LifeHistory_Log with `getDataRange().getValues()` every cycle
**Also reads:** All of Relationship_Bonds
**Impact:** Gets slower as ledgers grow. With 2500+ rows, this is wasteful.

### Proposed Prune Strategies (Maker Approval Required)

| Ledger | Strategy | Retention | Notes |
|--------|----------|-----------|-------|
| LifeHistory_Log | Archive old entries | Keep last 10 cycles | Move older to LifeHistory_Archive sheet |
| WorldEvents_Ledger | Prune low-severity | Keep severity 3+ forever, prune 1-2 after 5 cycles | Low severity = noise |
| Relationship_Bonds | Filter on read | Only load Status=ACTIVE | Don't load DORMANT/SEVERED |

### IMPLEMENTED: Optimize citizenContextBuilder.js
**Status:** COMPLETE
**Date:** Jan 2026

Fix applied - citizenContextBuilder.js now uses sheetCache when available:
- [x] `buildCitizenContext()` accepts optional cache parameter
- [x] `getLifeHistory_()` uses `cache.getValues()` when cache provided
- [x] `getRelationships_()` uses `cache.getValues()` when cache provided

**Result:** When called during engine cycle with ctx.cache, LifeHistory_Log
and Relationship_Bonds are read once per cycle instead of once per citizen.

### Tier 2.2 Status: COMPLETE
The ledger audit is done. Performance bottleneck in citizenContextBuilder.js
has been fixed via caching. No data pruning needed at this time.

---

## JOURNALIST ROSTER AUDIT (Tier 2.3)

**Status:** IN PROGRESS
**Started:** Jan 2026

### Purpose
Establish single source of truth for Bay Tribune journalists.
Currently 100+ hardcoded journalist references scattered across Phase 7 files.

### Roster Schema Created
**File:** `schemas/bay_tribune_roster.json`

| Field | Type | Description |
|-------|------|-------------|
| name | string | Full journalist name |
| desk | string | sports, metro, culture, business, opinion, wire, etc. |
| role | string | Beat title (e.g., "Lead Beat Reporter") |
| tone | string | Voice/style keywords for content generation |
| background | string | Brief bio (optional) |

### Phase 7 Journalist Audit Findings

#### Files with Hardcoded Journalist References

| File | References | Primary Usage |
|------|------------|---------------|
| mediaRoomBriefingGenerator.js | 100+ | All assignment functions, holiday coverage, front page |
| buildEveningFamous.js | 3 | JOURNALISTS array for celebrity pool |
| pressDraftWriter.js | 2 | Example documentation |
| mediaRoomStandAloneWriter.js | 4 | Example documentation |
| parseMediaIntake.js | 2 | Field parsing |
| culturalLedger.js | 2 | Entity registration |
| updateMediaSpread.js | 1 | Function signature |
| mediaRoomIntake.js | 1 | Cultural mention logging |

#### Key Assignment Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `getArcReporter_()` | mediaRoomBriefingGenerator.js:1266-1273 | Arc type → journalist |
| `generateSectionAssignments_()` | mediaRoomBriefingGenerator.js:1373-1453 | Context → desk assignments |
| `determineFrontPage_()` | mediaRoomBriefingGenerator.js:1117-1263 | Priority → front page lead |
| `getHolidayStoryIdeas_()` | mediaRoomBriefingGenerator.js:861-1111 | Holiday → journalist lists |

#### Assignment Patterns Identified

1. **String Concatenation:** `briefing.push('- [CATEGORY] Story — Journalist Name');`
2. **Object Properties:** `{ reporter: 'Journalist Name (Desk)', ... }`
3. **Function Returns:** `return 'Dr. Lila Mezran';`
4. **Array Elements:** `{ name: "Tara Ellison", role: "journalist" }`

#### Primary Journalists by Usage Frequency

| Tier | Journalists | Usage |
|------|-------------|-------|
| Heavy (20+) | Carmen Delaine, Anthony, Hal Richmond, P Slayer, Mags Corliss | Desk leads |
| Moderate (5-20) | Kai Marston, Sharon Okafor, Luis Navarro, Trevor Shimizu, Jordan Velez | Specialists |
| Light (1-5) | Dr. Lila Mezran, Sgt. Rachel Torres, Selena Grant, Talia Finch, Farrah Del Rio | Domain experts |

### Roster Lookup Utility Created
**File:** `utilities/rosterLookup.js`

| Function | Purpose |
|----------|---------|
| `getJournalist_(name)` | Get journalist { desk, role, tone } |
| `getJournalistTone_(name)` | Get voice/tone string |
| `getJournalistBySignal_(signalType)` | Signal → primary journalist |
| `getJournalistsByDesk_(deskName)` | Get all journalists on desk |
| `formatJournalist_(name, suffix)` | Format for briefing output |
| `getArcReporterFromRoster_(arcType, domain)` | Roster-based arc assignment |
| `getSportsAssignment_(sportsSeason)` | Season-aware sports desk |
| `getVoiceGuidance_(name, storyType)` | Tone + story type guidance |

### Missing from Current System (Future Work)

- No journalist availability/workload tracking
- No story-to-journalist suitability scoring
- No LastAppearance or ArticleCount tracking
- No explicit voice calibration per story type

### Tier 2.3 Status: COMPLETE (Migration Deferred to Tier 3)
- [x] Roster JSON schema created
- [x] Phase 7 journalist audit complete
- [x] Lookup utility created
- [ ] Migrate hardcoded strings to use rosterLookup.js (DEFERRED → Tier 3)
- [ ] Add LastAppearance/ArticleCount tracking (DEFERRED → Tier 3, schema approval needed)

**Note:** Tier 2.3 deliverables complete. Remaining migration work deferred to Tier 3 as part of V3 refactor.

---

## V3 UPGRADE PREPARATION

### Before V3 Work Begins:
1. [x] Implement Sheets caching layer (v2.10 - sheetCache.js)
2. [x] Add error handling to main cycle (v2.9)
3. [x] Centralize sheet names (v2.9 - SHEET_NAMES constant created)
4. [x] Add column index bounds checking (v2.8)

### V3 Architecture Changes Needed:
1. [ ] Sheet ID configuration system
2. [x] API call batching (v2.10 - via sheetCache.js queueWrite/flush)
3. [ ] Schema validation layer
4. [ ] Break up 1000+ line functions

### Files Requiring Most V3 Work:
1. `godWorldEngine2.js` - Main orchestrator
2. `v3Integration.js` - V3 module coordination
3. `bondEngine.js` - Complex state management
4. `mediaRoomBriefingGenerator.js` - Massive function
5. `citizenContextBuilder.js` - Memory issues

---

## Change Log

| Date | Change | Files | By |
|------|--------|-------|-----|
| Jan 2026 | Initial audit completed | All 129 | Claude Code |
| Jan 2026 | Removed eval(), fixed to v3.5 | v3Integration.js | Claude Code |
| Jan 2026 | Fixed filename typo | v3Intergration→v3Integration | Claude Code |
| Jan 2026 | Organized into phase folders | All 129 | Claude Code |
| Jan 2026 | Created GODWORLD_REFERENCE.md | New file | Claude Code |
| Jan 2026 | Created AUDIT_TRACKER.md | New file | Claude Code |
| Jan 2026 | Column bounds fix, bumped to v2.8 | godWorldEngine2.js | Claude Code |
| Jan 2026 | Error handling wrapper, bumped to v2.9 | godWorldEngine2.js | Claude Code |
| Jan 2026 | Consolidated duplicate utility functions | 3 files | Claude Code |
| Jan 2026 | Created SHEET_NAMES constant | utilities/sheetNames.js | Claude Code |
| Jan 2026 | Implemented Sheets caching layer, bumped to v2.10 | utilities/sheetCache.js, godWorldEngine2.js | Claude Code |
| Jan 2026 | Dynamic neighborhood loading, bumped to v2.3 | phase05-citizens/bondEngine.js | Claude Code |
| Jan 2026 | Bay Tribune roster JSON schema | schemas/bay_tribune_roster.json | Claude Code |
| Jan 2026 | Roster lookup utility for Phase 7 | utilities/rosterLookup.js | Claude Code |
| Jan 2026 | Tier 2.3 journalist audit complete | AUDIT_TRACKER.md | Claude Code |

---

## How Mara Uses This Document

### When coordinating Engine work:
1. Check **Audit Status Overview** for current priorities
2. Review **PENDING** items before requesting new features
3. Note **Schema Impact** before approving changes
4. Track **V3 Preparation** progress

### When the Maker asks about technical debt:
1. Reference specific issue numbers
2. Check if issue is READY TO IMPLEMENT or needs approval
3. Note which issues are V3 REFACTOR (too risky now)

### When Claude Code returns:
1. Point to this document for context
2. Identify next READY TO IMPLEMENT item
3. Ensure Schema Impact is understood

---

## Notes for Claude Code

**Schema Safety Rules:**
- NO changes to column names without Maker approval
- NO adding/removing columns without Maker approval
- NO changing data formats written to sheets
- Internal code changes (logic, error handling, caching) are OK

**Next Recommended Fixes (no schema impact):**
1. ~~Add error handling wrapper to `runWorldCycle()`~~ DONE (v2.9)
2. ~~Add column index bounds checking in `godWorldEngine2.js`~~ DONE (v2.8)
3. ~~Consolidate duplicate utility functions~~ DONE (v2.9)
4. ~~Create SHEET_NAMES constant~~ DONE (v2.9)
5. ~~Implement Sheets caching layer~~ DONE (v2.10)

---

*This document tracks technical debt and audit findings. Mara coordinates prioritization. Claude Code implements fixes. Maker approves schema changes.*
