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
| CRITICAL | 4 | 1 | 3 |
| HIGH | 8 | 1 | 7 |
| MEDIUM | 6 | 0 | 6 |

**Last Updated:** After eval() removal and filename fix

---

## CRITICAL ISSUES

### 1. ~~eval() Security Vulnerability~~ - FIXED
- **File:** `phase08-v3-chicago/v3Integration.js` (was v3Intergration.js)
- **Status:** COMPLETED
- **Fix:** Replaced with function registry pattern (v3.5)
- **Date Fixed:** Jan 2026

### 2. Hardcoded Spreadsheet ID - PENDING
- **File:** `phase01-config/godWorldEngine2.js:24`
- **Also in:** 15 other files
- **Issue:** `SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk'`
- **Risk:** Cannot deploy to different environments, V3 will need different sheets
- **Fix Required:** Move to World_Config sheet lookup
- **Schema Impact:** Would need `SpreadsheetID` row in World_Config
- **Status:** WAITING - Needs Maker approval on schema change

### 3. No Sheets API Caching/Batching - PENDING
- **Files:** 86 files with 1,347 getRange/getValue calls
- **Issue:** Each call = network roundtrip, risk of timeout on large datasets
- **Risk:** V3 scaling will hit rate limits
- **Fix Required:** Implement caching layer in Phase 1
- **Schema Impact:** None (internal optimization)
- **Status:** READY TO IMPLEMENT

### 4. Missing Error Handling - PENDING
- **Files:** 86 files lack try/catch on Sheets operations
- **Issue:** Silent failures, no error recovery
- **Risk:** Data loss, cycle corruption
- **Fix Required:** Add error handler wrapper in main cycle
- **Schema Impact:** None (internal code)
- **Status:** READY TO IMPLEMENT

---

## HIGH PRIORITY ISSUES

### 5. ~~Filename Typo~~ - FIXED
- **File:** v3Intergration.js → v3Integration.js
- **Status:** COMPLETED
- **Date Fixed:** Jan 2026

### 6. Duplicate Utility Functions - PENDING
- **Functions:** `pickRandom_()`, `safeGet_()`, `shortId_()`, `ensureSheet_()`
- **Copies:** 2-3 instances each across files
- **Fix Required:** Consolidate to `utilities/utilityFunctions.js`
- **Schema Impact:** None
- **Status:** READY TO IMPLEMENT

### 7. Hardcoded Sheet Names - PENDING
- **Count:** 100+ occurrences of string literals like `'World_Config'`
- **Fix Required:** Create `SHEET_NAMES` constant object
- **Schema Impact:** None (just code organization)
- **Status:** READY TO IMPLEMENT

### 8. Missing Null/Undefined Checks - PENDING
- **Count:** 272 instances of loose conditionals
- **Example:** `if (!arr)` without checking if arr is actually an array
- **Risk:** Runtime errors on unexpected data
- **Fix Required:** Add guards throughout
- **Schema Impact:** None
- **Status:** LOW PRIORITY - address during V3 refactor

### 9. Column Index -1 Bug - PENDING
- **File:** `phase01-config/godWorldEngine2.js:547-551`
- **Issue:** If column not found, `idx = -1`, then `getRange(2, 0)` fails
- **Fix Required:** Add bounds check before write
- **Schema Impact:** None
- **Status:** READY TO IMPLEMENT

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

### 15. Hardcoded Neighborhood Lists - PENDING
- **File:** `bondEngine.js:72-78`
- **Count:** 72 lines of hardcoded neighborhoods
- **Fix Required:** Read from Neighborhood_Map ledger
- **Schema Impact:** None (already exists)
- **Status:** READY TO IMPLEMENT

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

## V3 UPGRADE PREPARATION

### Before V3 Work Begins:
1. [ ] Implement Sheets caching layer
2. [ ] Add error handling to main cycle
3. [ ] Centralize sheet names
4. [ ] Add column index bounds checking

### V3 Architecture Changes Needed:
1. [ ] Sheet ID configuration system
2. [ ] API call batching
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
1. Add error handling wrapper to `runWorldCycle()`
2. Add column index bounds checking in `godWorldEngine2.js`
3. Consolidate duplicate utility functions
4. Create SHEET_NAMES constant

---

*This document tracks technical debt and audit findings. Mara coordinates prioritization. Claude Code implements fixes. Maker approves schema changes.*
