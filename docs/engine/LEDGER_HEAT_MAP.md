# Ledger Heat Map

**Living reference document for GodWorld sheet health, bloat risk, and cleanup priorities.**

Last Updated: 2026-02-16 | Cycle: 81 | Session: 30

---

## Overview

GodWorld uses 40+ Google Sheets ledgers across one spreadsheet. Google Sheets has a **10 million cell limit** per spreadsheet, and performance degrades noticeably above **10,000 rows per sheet**. At Cycle 81, we're healthy — but several sheets will hit performance walls between Cycle 150-200 without intervention.

**Methodology:**
- **Growth rate** = observed rows / cycles active, adjusted for engine behavior
- **Projections** at C100 (near-term), C150, C200, C281 (200 cycles from now)
- **Risk levels:** RED (action before C150), YELLOW (monitor, action before C200), GREEN (stable)
- **Dead columns** = written by engine but never read by any consumer or downstream engine

---

## Heat Rankings

### RED — Action Needed Before C150

| Sheet | Rows (C81) | Cols | Growth | Rate/Cycle | C100 | C150 | C200 | C281 | Issue |
|-------|-----------|------|--------|------------|------|------|------|------|-------|
| LifeHistory_Log | 2,552 | 9 | Append | +20-50 | ~3,200 | ~4,950 | ~6,700 | ~9,550 | Largest sheet, 2 dead cols, 2 empty cols |
| Simulation_Ledger (LifeHistory col) | 511 | 20 | Update | ~0 rows | ~511 | ~520 | ~530 | ~550 | LifeHistory column = 38% of sheet cell weight; text bloat, not row bloat. No dead cols (see correction below). |

### YELLOW — Monitor, Action Before C200

| Sheet | Rows (C81) | Cols | Growth | Rate/Cycle | C100 | C150 | C200 | C281 | Issue |
|-------|-----------|------|--------|------------|------|------|------|------|-------|
| WorldEvents_V3_Ledger | 23 | 29 | Append | +5-20 | ~250 | ~850 | ~1,450 | ~2,400 | 7 dead calendar cols + SportsEngine + CanonStatus |
| Press_Drafts | 58 | 14 | Append | +5-20 | ~290 | ~890 | ~1,490 | ~2,460 | 6 dead calendar cols, DraftText cell bloat |
| Storyline_Tracker | 110 | 14 | Mixed | +5-10 | ~240 | ~590 | ~940 | ~1,510 | 5 dead calendar cols, no archive for resolved |
| Story_Seed_Deck | 66 | 14 | Append | +3-8 | ~160 | ~410 | ~660 | ~1,070 | 6 dead calendar cols |
| Story_Hook_Deck | 46 | 16 | Append | +2-5 | ~110 | ~260 | ~410 | ~650 | 6 dead cols (5 calendar + CalendarTrigger) |
| Texture_Trigger_Log | 83 | 12 | Append | +5-15 | ~270 | ~770 | ~1,270 | ~2,080 | 5 dead calendar cols |
| Citizen_Media_Usage | 158 | 13 | Append | +2-5 | ~220 | ~400 | ~580 | ~850 | 6 empty cols (G-L), no archive |
| WorldEvents_Ledger (V2) | 79 | 22 | Append | +1-5 | ~140 | ~290 | ~440 | ~680 | Legacy V2 format, still read by transit + dedup |
| Initiative_Tracker | 7 | 19 | Append | +1-2 | ~35 | ~110 | ~185 | ~310 | No archive strategy for resolved initiatives |
| Storyline_Intake | 110 | 12 | Append | +5-10 | ~240 | ~590 | ~940 | ~1,510 | 6 dead calendar cols |
| Citizen_Usage_Intake | 158 | 11 | Append | +2-5 | ~220 | ~400 | ~580 | ~850 | 6 dead calendar cols |

### GREEN — Stable (No Action Needed)

| Sheet | Rows (C81) | Cols | Growth | Notes |
|-------|-----------|------|--------|-------|
| Simulation_Ledger | 511 | 20 | Update (in-place) | Rows = citizens, grows only with new named citizens. 5 dead cols. |
| Generic_Citizens | 209 | 8 | Update | Tier-4 citizen pool, stable size |
| Chicago_Citizens | 81 | 10 | Update | Chicago satellite, grows slowly |
| Chicago_Feed | 42 | 22 | Append (+1/cycle) | Low volume |
| Riley_Digest | 74 | 28 | Append (+1/cycle) | Read by Pattern Detection. Low risk. |
| Cycle_Packet | 35 | 3 | Append (+1/cycle) | PacketText is large but 1 row/cycle |
| Arc_Ledger | 38 | 11 | Mixed | Arcs resolve and get replaced |
| Event_Arc_Ledger | 29 | 23 | Mixed | Same — arcs cycle through |
| Civic_Office_Ledger | 36 | 17 | Update | Officials roster, mostly in-place updates |
| Civic_Sweep_Report | 7 | 15 | Append (+1/cycle) | Low volume |
| Domain_Tracker | 34 | 31 | Append (+1/cycle) | 5 dead calendar cols but low growth |
| Neighborhood_Map | 18 | 15 | Update | 17 neighborhoods + header, stable. 5 dead calendar cols. |
| Relationship_Bonds | 1 | 17 | Append (slow) | New engine, just starting. 5 dead calendar cols. |
| Cultural_Ledger | 20 | 20 | Update/Append | Slow growth. 3 dead calendar cols. |
| Media_Briefing | 6 | 7 | Overwrite | Rebuilt each cycle |
| Media_Intake | 58 | 7 | Append (batch) | Batch from editions, low cycle rate |
| MediaRoom_Paste | 1 | 1 | Overwrite | Paste buffer, always 1 row |
| Sports_Feed | 3 | 16 | Update | 2-3 teams, in-place updates |
| Sports_Calendar | 13 | 3 | Static | Reference table |
| Simulation_Calendar | 2 | 6 | Update | Date config, overwritten |
| World_Config | 12 | 3 | Static | Engine config key-value pairs |
| World_Population | 3 | 22 | Append (+1/cycle) | Very low volume |
| Health_Cause_Queue | 1 | 11 | Transient | Processed and cleared |
| Dashboard | 26 | 6 | Overwrite | Rebuilt each cycle |
| Intake | 1 | 16 | Transient | Processing queue |
| Advancement_Intake | 1 | 10 | Transient | Processing queue |
| Election_Log | ~5 | ~8 | Append (rare) | Only on election cycles |
| Engine_Index2 | 135 | 2 | Static | File index reference |
| Ledger_Index | 46 | 7 | Static | Sheet registry |
| Engine_ideas | 4 | 1 | Static | Notes |
| MLB_Game_Intake | 73 | 9 | Append (batch) | Game data imports, seasonal |
| NBA_Game_Intake | 34 | 9 | Append (batch) | Game data imports, seasonal |
| Household_Ledger | ~50 | ~12 | Append (+2-5) | New (Tier-5), households grow slowly |
| Neighborhood_Demographics | ~18 | ~10 | Update | Per-neighborhood stats, in-place |
| Oakland_Sports_Feed | ~3 | ~10 | Update | Team feeds, in-place |
| Chicago_Sports_Feed | ~3 | ~10 | Update | Team feeds, in-place |
| Engine_Errors | ~10 | ~5 | Append (sporadic) | Error log, only on failures |

### ORPHANED — Safe to Remove

| Sheet | Rows | Status | Notes |
|-------|------|--------|-------|
| Continuity_Loop | 189 | ORPHANED | Pipeline eliminated. Never read. Can delete. |
| Continuity_Intake | 189 | ORPHANED | Paired with Continuity_Loop. Never read. Can delete. |
| World_Drift_Report | 7 | WRITE-ONLY | Written by generateMonthlyDriftReport.js. Never read by any engine. Archive candidate. |

---

## Top Bloat Risks — Detailed Breakdown

### 1. LifeHistory_Log (RED)

**The biggest problem.** At 2,552 rows and growing 20-50 per cycle, this sheet hits 10,000 rows around Cycle 250. Every citizen life event (career change, relationship, move, health event, media mention) appends a row.

**Current schema (9 cols):**
| Col | Header | Status |
|-----|--------|--------|
| A | Timestamp | Active |
| B | POPID | Active |
| C | Name | **DEAD** — redundant with POPID lookup |
| D | EventTag | Active |
| E | EventText | Active |
| F | Neighborhood | **DEAD** — redundant with citizen's current neighborhood |
| G | Cycle | Active |
| H | (empty) | **DEAD** — unused |
| I | (empty) | **DEAD** — unused |

**Remediation options:**
1. **Archive old cycles** — Move rows older than 50 cycles to a `LifeHistory_Archive` sheet (highest impact)
2. **Drop dead columns** — Remove Name (C), Neighborhood (F), and empty cols H-I (saves 4/9 cols = 44% cell reduction)
3. **Enforce compression** — `compressLifeHistory.js` exists but needs regular scheduling to consolidate old entries

**Priority:** HIGH — archive strategy needed before C150

### 2. Simulation_Ledger.LifeHistory Column (RED)

The Simulation_Ledger itself has only 511 rows and grows slowly (new named citizens only). But column O (`LifeHistory`) stores the **full life history text** for each citizen, making it the heaviest single column in the spreadsheet — approximately 38% of the sheet's cell weight.

**Dead columns in Simulation_Ledger:**
| Col | Header | Status | Notes |
|-----|--------|--------|-------|
| C | Middle | **DEAD** | Almost always empty. Never read by any engine. |
| I | ClockMode | **DEAD** | Legacy field. No engine reads it. |
| N | OrginCity | **DEAD** | Misspelled. Only set for game imports. Never read. |
| Q | Last Updated | **DEAD** | Never read by any engine or consumer. |
| S | UsageCount | **DEAD** | Never read. Was planned for media tracking. |

**Remediation:**
1. **Drop 5 dead columns** — saves ~2,555 cells immediately
2. **Enforce LifeHistory compression** — cap text length, summarize old entries
3. **Future:** Consider moving LifeHistory to a separate sheet with POPID key

**Priority:** HIGH — text bloat affects load time for every script that reads Simulation_Ledger

### 3. WorldEvents_V3_Ledger (YELLOW → GREEN after v3.5)

Growing at 5-20 events per cycle. Was 29 columns with 22 dead. After v3.5 cleanup, only 7 active columns (A-G). All 22 dead columns now write empty strings. Historical data retained.

**Dead columns (all STOPPED as of v3.5):**
| Col | Header | Status |
|-----|--------|--------|
| H-I | ImpactScore, PopulationAffected | STOPPED v3.5 — calculated, never consumed |
| J-M | HealthFlag, CivicFlag, EconomicFlag, FestivalFlag | STOPPED v3.5 — written, never read |
| N | SentimentShift | STOPPED v3.5 — calculated, never consumed |
| O-Q | WeatherType, WeatherImpact, CitySentiment | STOPPED v3.5 — weather in ctx.summary |
| R-S | TextureSignal, StoryHookSignal | STOPPED v3.5 — signal counts in ctx.summary |
| T-V | CivicLoad, ShockFlag, PatternFlag | STOPPED v3.5 — analysis flags in ctx.summary |
| W-AA | Calendar columns (5) | STOPPED v3.4 — calendar in ctx.summary |
| AB | SourceEngine (always "ENGINE") | STOPPED v3.5 — never read |
| AC | CanonStatus (always "pending") | STOPPED v3.5 — never read |

**Also fixed:** Math.random() → ctx.rng, domain-aware neighborhood assignment.

**Priority:** RESOLVED — effective col count reduced from 29 to 7 (76% reduction)

---

## Dead Column Inventory

### Systematic Pattern: Calendar Column Waste

**Discovery:** Five calendar-related columns were added to multiple sheets during engine development but are **never read by any engine, consumer, or downstream script**. The data they contain is always available in `ctx.summary` (set in Phase 1), making these columns pure duplication.

**The dead columns:**
| Column Name | What It Stores | Where It's Available Instead |
|-------------|----------------|------------------------------|
| Holiday | Current holiday name | `ctx.summary.holiday` |
| HolidayPriority | Holiday severity | `ctx.summary.holidayPriority` |
| IsFirstFriday | Boolean flag | `ctx.summary.isFirstFriday` |
| IsCreationDay | Boolean flag | `ctx.summary.isCreationDay` |
| SportsSeason | Current sports season | `ctx.summary.sportsSeason` |

**Affected sheets (verified dead — no consumer reads these columns):**

| Sheet | Dead Calendar Cols | Additional Dead Cols | Total Dead | Total Cols | Waste % |
|-------|-------------------|---------------------|------------|------------|---------|
| Story_Seed_Deck | I-N (6 cols: Season thru SportsSeason) | — | 6 | 14 | 43% |
| Story_Hook_Deck | K-P (5 calendar + CalendarTrigger) | — | 6 | 16 | 38% |
| WorldEvents_V3_Ledger | W-AA (5 calendar, v3.4) | H-V, AB-AC (16 cols, v3.5) | 22 | 29 | 76% — STOPPED |
| Press_Drafts | I-N (6 cols: Season thru SportsSeason) | — | 6 | 14 | 43% |
| Texture_Trigger_Log | H-L (5 calendar) | — | 5 | 12 | 42% |
| Simulation_Ledger | — | C, I, N, Q, S (Middle, ClockMode, OrginCity, Last Updated, UsageCount) | 5 | 20 | 25% |

**Sheets with calendar columns — usage NOT YET VERIFIED (lower priority):**

| Sheet | Calendar Cols Present | Notes |
|-------|----------------------|-------|
| Domain_Tracker | Z-AD (5 cols) | Low growth (+1/cycle), verify before removal |
| Neighborhood_Map | K-O (5 cols) | State sheet (18 rows), low urgency |
| Relationship_Bonds | M-Q (5 cols) | New engine, only 1 row, verify before removal |
| Event_Arc_Ledger | N-O, R (Holiday x2, SportsSeason) | Mixed sheet, verify before removal |
| Cultural_Ledger | R-T (Holiday, HolidayPriority, SportsSeason) | Small sheet, low urgency |
| Storyline_Intake | G-L (6 cols) | Intake sheet, likely dead |
| Citizen_Usage_Intake | F-K (6 cols) | Intake sheet, likely dead |
| Storyline_Tracker | J-N (5 cols) | Mirror of Storyline_Intake pattern |
| WorldEvents_Ledger (V2) | F, R-V (Holiday + calendar) | Legacy format |

### Per-Sheet Dead Column Summary

| Sheet | Dead Columns | Safe to Remove? | Dependencies |
|-------|-------------|-----------------|-------------|
| LifeHistory_Log | Name (C), Neighborhood (F), empty H-I | **STOPPED (Session 31)** | 14 files, 17 write sites updated to write `''`. |
| Simulation_Ledger | Middle (C), ClockMode (I), OrginCity (N), Last Updated (Q), UsageCount (S) | **CANCELLED** | ClockMode read by 8+ engines. Not dead. |
| Story_Seed_Deck | Season-SportsSeason (I-N) | YES | Written by applyStorySeeds.js, never read. |
| Story_Hook_Deck | Holiday-CalendarTrigger (K-P) | YES | Written by storyHook.js, never read. |
| WorldEvents_V3_Ledger | Holiday-CanonStatus (W-AC) | YES | Written by worldEventGenerator.js, never read. |
| Press_Drafts | Season-SportsSeason (I-N) | YES | Written by generatePressDrafts.js, never read. |
| Texture_Trigger_Log | Holiday-SportsSeason (H-L) | YES | Written by applyTextureTriggers.js, never read. |

---

## Archival Strategy

### Priority 1: LifeHistory_Log Archive (Before C150)

**When:** After C100, or when row count exceeds 5,000
**How:**
1. Create `LifeHistory_Archive` sheet
2. Move rows where `Cycle < (currentCycle - 50)` to archive
3. Keep last 50 cycles in active sheet for engine access
4. Run archive as part of cycle maintenance (manual or scripted)

**Impact:** Keeps active sheet under 2,000 rows indefinitely

### Priority 2: Dead Column Removal (Any Session)

**When:** Any session with available time
**How:**
1. Stop writing dead columns in engine code (remove from write-intents or direct writes)
2. Delete column data from sheets (or leave empty — column deletion in Sheets is destructive to column references)
3. Update SCHEMA_HEADERS.md after removal

**Safest approach:** Stop writing first, delete later. Two-phase cleanup.

**Impact:**
- Story_Seed_Deck: 14 cols → 8 cols (43% reduction)
- Story_Hook_Deck: 16 cols → 10 cols (38% reduction)
- Press_Drafts: 14 cols → 8 cols (43% reduction)
- Texture_Trigger_Log: 12 cols → 7 cols (42% reduction)
- WorldEvents_V3_Ledger: 29 cols → 22 cols (24% reduction)
- Simulation_Ledger: 20 cols → 15 cols (25% reduction)
- LifeHistory_Log: 9 cols → 5 cols (44% reduction)

**Total cell savings at C81:** ~15,000 cells (across all affected sheets at current row counts)

### Priority 3: Resolved Initiative/Storyline Archive (Before C200)

**When:** When Initiative_Tracker or Storyline_Tracker exceed 200 rows
**How:** Move resolved/closed items to archive sheets
**Impact:** Keeps active trackers fast for engine reads

### Priority 4: Orphaned Sheet Cleanup (Any Session)

**When:** Any session
**How:**
- Delete Continuity_Loop and Continuity_Intake (confirmed orphaned)
- Archive World_Drift_Report data, then delete or freeze sheet
- Remove from SHEET_NAMES constants (Continuity_Loop already commented out)

---

## Column Cleanup Roadmap

### Phase A: Stop Writing Dead Calendar Columns — COMPLETED (Session 30)

5 persistence writers updated to stop writing calendar data to sheets:

| Engine File | Version | Sheet(s) Affected | Change |
|-------------|---------|-------------------|--------|
| `saveV3Seeds.js` | v3.3→v3.4 | Story_Seed_Deck | Removed cols I-N from row array (truncated) |
| `v3StoryHookWriter.js` | v3.3→v3.4 | Story_Hook_Deck | Removed cols K-P from row array (truncated) |
| `v3TextureWriter.js` | v3.4→v3.5 | Texture_Trigger_Log | Removed cols H-L from row array (truncated) |
| `recordWorldEventsv3.js` | v3.3→v3.4 | WorldEvents_V3_Ledger | Cols W-AA → empty strings (preserve AB-AC alignment) |
| `pressDraftWriter.js` | v1.3→v1.4 | Press_Drafts | Cols I-N → empty strings (preserve O-T alignment) |

**Also removed:** Two dead query functions from pressDraftWriter.js (`getDraftsByHoliday_`, `getDraftsBySportsSeason_` — never called).

**Existing sheet data preserved.** Old rows keep their calendar values. New rows write empty/omitted values. Sheet headers unchanged — no migration needed.

### Phase B: Simulation_Ledger — CANCELLED

Audit revealed Middle, ClockMode, OrginCity, Last Updated, UsageCount are ALL actively read by 8+ engines. Not dead columns. See correction note in Heat Rankings table above.

### Phase C: Implement LifeHistory_Log Archive Script — COMPLETED (Session 31)

`maintenance/archiveLifeHistory.js` v1.0 created:
- `archiveLifeHistory()` — live mode, moves old rows to LifeHistory_Archive
- `archiveLifeHistoryDryRun()` — preview mode, logs without changing data
- Retains last 50 cycles in active sheet (configurable via `ARCHIVE_RETAIN_CYCLES`)
- Creates LifeHistory_Archive sheet automatically on first run (same headers)
- Cleans up excess empty rows after archival
- Logs cycle-range summary of what moved

**Safety:** LifeHistory_Log data is already compressed into Simulation_Ledger via `compressLifeHistory.js` (trait profiles, archetypes, last 20 entries). Archive is the audit trail backup.

**Impact at C81:** Rows from C1-C31 archived, active sheet drops from ~2,552 to ~1,400-1,750 rows. Keeps active sheet under ~2,000 indefinitely with periodic runs.

### Phase D: Enforce LifeHistory Compression (Future)

`compressLifeHistory.js` (v1.2) exists but needs:
1. Regular scheduling (every 10-20 cycles)
2. Max text length enforcement for Simulation_Ledger.LifeHistory column
3. Monitoring of compression ratio

---

## Appendix: Sheet-by-Sheet Quick Reference

**Total sheets tracked:** ~53 (46 in SCHEMA_HEADERS + 7 referenced in sheetNames.js only)

| Risk | Count | Sheets |
|------|-------|--------|
| RED | 2 | LifeHistory_Log, Simulation_Ledger (LifeHistory col) |
| YELLOW | 10 | Press_Drafts, Storyline_Tracker, Story_Seed_Deck, Story_Hook_Deck, Texture_Trigger_Log, Citizen_Media_Usage, WorldEvents_Ledger, Initiative_Tracker, Storyline_Intake, Citizen_Usage_Intake |
| GREEN | 38+ | All state/config/reference/low-growth sheets (includes WorldEvents_V3_Ledger after v3.5 cleanup) |
| ORPHANED | 3 | Continuity_Loop, Continuity_Intake, World_Drift_Report |

**Total dead column instances (verified):** 56 columns across 7 sheets (40 original + 16 WorldEvents v3.5)
**Total dead column instances (unverified):** ~35 columns across 9 additional sheets
**Estimated cell savings from all cleanup:** ~25,000 cells at C81

---

## Revision History

| Date | Session | Change |
|------|---------|--------|
| 2026-02-16 | 30 | Initial creation. Full audit of all 53 sheets. Calendar column waste pattern discovered. |
| 2026-02-16 | 31 | Phase C complete. archiveLifeHistory.js v1.0 created in maintenance/. |
| 2026-02-16 | 31 | LifeHistory_Log dead columns stopped: Name (C), Neighborhood (F) → '' across 14 files, 17 write sites. |
| 2026-02-16 | 31 | WorldEvents_V3_Ledger v3.5: 16 more dead cols deprecated (H-V, AB-AC). Only A-G active. Math.random→ctx.rng fix. Domain-aware neighborhoods. Sheet downgraded YELLOW→GREEN. |
