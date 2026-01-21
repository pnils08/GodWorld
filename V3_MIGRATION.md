# GodWorld V3 Migration Plan
## Draft v0.1 - For Discussion

**Created:** Jan 2026
**Authors:** Claude Code (initial draft), Maker (revisions pending)
**Status:** DRAFT - Awaiting Maker input

---

## Overview

V3 represents the next major evolution of GodWorld Engine. This document tracks:
- What's changing and why
- Migration phases and tasks
- Decision points requiring Maker input
- Session-by-session progress

---

## V3 Goals (Claude's Understanding)

1. **Scalability** - Support larger citizen populations, Chicago expansion
2. **Configurability** - Move hardcoded values to sheets for easier tuning
3. **Maintainability** - Break up massive functions, improve code organization
4. **Reliability** - Schema validation, better error recovery
5. **Portability** - Support multiple spreadsheet environments

**Maker: What am I missing? What's the primary driver for V3?**

---

## Proposed Migration Phases

### Phase A: Foundation (No Schema Changes)
*Can proceed without Maker approval*

| Task | Status | Notes |
|------|--------|-------|
| Sheets caching layer | DONE (v2.10) | `sheetCache.js` |
| Error handling wrapper | DONE (v2.9) | `safePhaseCall_()` |
| Centralized sheet names | DONE (v2.9) | `SHEET_NAMES` constant |
| Dynamic neighborhood loading | DONE (v2.3) | bondEngine reads from sheet |
| Break up 1000+ line functions | PENDING | See task list below |
| ctx.summary schema validation | PENDING | Validate required fields in Phase 1 |

### Phase B: Configuration Migration (Schema Changes Required)
*Requires Maker approval*

| Task | Status | Schema Impact |
|------|--------|---------------|
| Spreadsheet ID to World_Config | BLOCKED | Add `SpreadsheetID` row |
| Holiday lists to Holiday_Config | PROPOSED | New sheet needed |
| Move hardcoded weights to config | PROPOSED | TBD |

### Phase C: Chicago/Multi-City (Major Feature)
*Architecture decisions needed*

| Task | Status | Notes |
|------|--------|-------|
| Separate Chicago spreadsheet? | DECISION NEEDED | Or tabs in same sheet? |
| City-specific config loading | PROPOSED | One engine, multiple configs |
| Cross-city citizen migration | PROPOSED | Story hooks |

---

## Tasks Moved from AUDIT_TRACKER

These audit issues are now V3 scope:

### From CRITICAL
- **#2 Hardcoded Spreadsheet ID** - Needs schema approval

### From HIGH
- **#11 Functions >1000 Lines** - Refactor targets:
  - `mediaRoomBriefingGenerator.js` (1,452 lines)
  - `mediaFeedbackEngine.js` (1,340 lines)
  - `bondEngine.js` (1,271 lines)
  - `civicInitiativeEngine.js` (1,229 lines)

- **#12 Tight Coupling via ctx.summary** - 40+ fields assumed to exist

### From MEDIUM
- **#14 Hardcoded Holiday Lists** - Move to Holiday_Config sheet
- **#18 Memory Inefficiency** - citizenContextBuilder profiles

---

## Open Questions for Maker

1. **What's driving V3?** Performance? Features? Chicago expansion? All of the above?

2. **Schema changes** - Are you ready to approve adding rows/sheets, or should V3 stay schema-neutral?

3. **Chicago architecture** - Same spreadsheet with new tabs, or separate spreadsheet?

4. **Function breakup priority** - Which 1000+ line file is most painful? Start there?

5. **Timeline** - Any external deadlines, or purely quality-driven?

6. **Testing approach** - Can we create a test spreadsheet clone for V3 work?

---

## Session Log

| Date | Session | Work Done | Next Steps |
|------|---------|-----------|------------|
| Jan 2026 | Initial | Created V3_MIGRATION.md draft | Await Maker feedback |

---

## How To Use This Document

**At session start:**
1. Claude reads this doc
2. Checks "Current Phase" and "Next Task"
3. Maker confirms or redirects

**At session end:**
1. Update task status
2. Log session in table
3. Note blockers/decisions needed
4. Commit and push

**When Maker has input:**
- Add comments inline or new sections
- Bump version (v0.1 → v0.2)
- Claude incorporates in next session

---

## Current Status

**Phase:** Pre-V3 (Foundation work in progress)
**Next Task:** Await Maker feedback on this document
**Blockers:** None - awaiting direction

---

*This is a living document. Version it, argue with it, make it yours.*
