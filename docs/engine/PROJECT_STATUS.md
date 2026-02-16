# GodWorld Project Status

**Single source of truth for what's open, what's done, and what's next.**

Last Updated: 2026-02-16 | Session: 32 | Cycle: 81

---

## Deploy Queue

Items ready to go — just need `clasp push` on Cloud Shell.

| Item | Files | Session | Notes |
|------|-------|---------|-------|
| Phase A calendar cleanup | saveV3Seeds v3.4, v3StoryHookWriter v3.4, v3TextureWriter v3.5, recordWorldEventsv3 v3.5, pressDraftWriter v1.4 | 30 | Stop writing dead calendar columns |
| Bond seeding fix | seedRelationBondsv1.js v1.1 | 24 | Bonds not creating (0 rows after 81 cycles) |
| LifeHistory dead columns | 14 files, 17 write sites | 31 | Stop writing cols F-I |
| recordWorldEventsv3 v3.5 | recordWorldEventsv3.js | 31 | 16 dead cols, Math.random fix, domain neighborhoods |
| compressLifeHistory v1.3 | compressLifeHistory.js | 31 | 14 new TAG_TRAIT_MAP entries |
| buildDeskPackets v1.5 | scripts/buildDeskPackets.js | 31 | Sports feed digest — structured intel from raw feeds |
| applySportsFeedTriggers v2.0 | applySportsSeason.js | 31 | Engine reads Oakland/Chicago feeds instead of dead Sports_Feed |
| setupSportsFeedValidation v2.1 | setupSportsFeedValidation.js | 31 | Streak column (O) added to feed sheets |
| setupCivicLedgerColumns v1.0 | setupCivicLedgerColumns.js | 31 | Approval + ExecutiveActions columns, Elliott Crane recovering |

**Deploy command:** `cd ~/GodWorld && git pull && clasp push`

---

## Active Work

Items in progress or planned for upcoming sessions.

| # | Item | Priority | Status | Deadline |
|---|------|----------|--------|----------|
| 1 | **Run Cycle 82** to validate deployments | HIGH | Blocked by clasp push | After deploy |
| 2 | **LifeHistory archive scheduling** — run `maintenance/archiveLifeHistory.js` | HIGH | Script ready, not scheduled | Before C150 |
| 3 | **LifeHistory compression enforcement** — schedule compressLifeHistory.js regularly | HIGH | Needs scheduling logic | Before C150 |
| 4 | **Gentrification Mechanics & Migration** — extend Neighborhood_Map, integrate with applyMigrationDrift.js | MEDIUM | Planned (Week 4) | No deadline |
| 5 | **Google Drive reorganization** — standardize folder naming across 5 archives (see notes below) | LOW | Documented | No deadline |

---

## Pending Decisions

Items that need a human call before work can proceed.

| # | Item | Options | Blocking |
|---|------|---------|----------|
| 1 | **Wire Jax Caldera into /write-edition** | When to use Jax vs Carmen/Luis for civic desk | Freelance coverage |
| 2 | **Supermemory Pro subscription** ($19/mo) | Activate or skip — unblocks codebase indexing | Memory tooling |
| 3 | **Remove weather columns from sheets** | Delete actual sheet columns (schema change) | Ledger cleanup |
| 4 | **Create BayTribune_Roster sheet** | JSON exists, create in Sheets? | Reporter data access |
| 5 | **compileHandoff.js removal** | Superseded by buildDeskPackets.js — delete? | Code cleanup |

---

## Quick Fixes (Ready to Implement)

Small items with no blockers — can be done in any session.

| # | Item | File | Effort |
|---|------|------|--------|
| 1 | Clean Carmen's roster entry (engine language in samplePhrases) | schemas/bay_tribune_roster.json | 5 min |
| 2 | Fix Media Briefing continuity dedup | mediaRoomBriefingGenerator.js | 30 min |
| 3 | Filter Priority 1 filler seeds ("Barbecue smoke rises") | worldEventsEngine or story seed engine | 30 min |
| 4 | Delete orphaned sheets: Continuity_Loop, Continuity_Intake | Google Sheets | 5 min |
| 5 | Archive World_Drift_Report (write-only, never read) | Google Sheets | 5 min |
| 6 | Delete dead columns from 7 sheets (calendar cols already stopped writing) | Google Sheets | 15 min |

---

## Testing Backlog

Validation work that should happen after deployment.

| # | Test | Scope | Status |
|---|------|-------|--------|
| 1 | **Integration testing** — run 5+ cycles with all Tier 7 systems | Full engine | Not started |
| 2 | **Verify ripple decay** — neighborhood effects decay as expected | economicRippleEngine | Not started |
| 3 | **Verify economic triggers** — test 22 trigger types | economicRippleEngine | Not started |
| 4 | **Validate bond seeding** — confirm bonds appear after v1.1 deploy | seedRelationBondsv1.js | Blocked by deploy |

---

## Tech Debt (Low Priority)

Items that work but could be cleaner. No deadlines.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 1 | **mulberry32_ in 10 files** | Consolidate to utilities/rng.js | LOW |
| 2 | **4 functions >1000 lines** | mediaRoomBriefingGenerator (1452), mediaFeedbackEngine (1340), bondEngine (1271), civicInitiativeEngine (1229) | DEFERRED |
| 3 | **ctx.summary tight coupling** | 40+ fields assumed to exist, no validation | DEFERRED |
| 4 | **Hardcoded holiday lists** | godWorldEngine2.js:331-471, 30+ holidays | DEFERRED |
| 5 | **Float precision drift** | godWorldEngine2.js:315-356, illness/employment rounding | LOW |
| 6 | **Array mutation in loops** | utilities/utilityFunctions.js:16, .splice() while iterating | LOW |

---

## Google Drive Archive Infrastructure (Session 32)

**Local mirror:** `output/drive-files/` (614 files, 6.9 MB) — 5 Drive roots crawled and downloaded.

| Root | Drive ID | Files | Purpose |
|------|----------|-------|---------|
| Tribune Media Archive | `10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS` | 101 | 20 journalist desks — full body of work |
| Sports Desk Archive | `1KPftAbw3dmjJjlUS9Wo97mFRZ-9Oqq0p` | 155 | Hal, Anthony, P Slayer features + analytics |
| Publications Archive | `1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ` | 67 | Cycle Pulse editions 1-81, supplementals |
| A's Universe Database | `1g3c82HA9iGNUdY7Oxe6cGIWpn5nILJFG` | 100 | TrueSource player cards, rosters, stats |
| Bulls Universe Database | `1VbXGpcierDXN3LCzywgJfXtU1ABGhZZM` | 9 | Chicago player profiles, contracts |

**Scripts:**
- `buildCombinedManifest.js` — crawl all 5 roots into combined manifest
- `downloadDriveArchive.js` — download text files (`--refresh` for incremental)
- `crawlSheetsArchive.js` — index Sheets tabs with headers + row counts
- `fetchDriveFile.js` — single file retrieval by Drive ID

**Refresh workflow:** After adding new files to Drive:
```bash
node scripts/buildCombinedManifest.js     # re-crawl (updates manifest)
node scripts/downloadDriveArchive.js --refresh   # download only new files
```

### Drive Reorganization (Future)

Current Drive folder naming is inconsistent across the 5 archives. Not blocking (local search works fine), but cleaner structure would help manual browsing.

**Current issues:**
- Numbered prefixes in some folders (`1_The_Cycle_Pulse`, `2_Oakland_Supplementals`) but not others
- Mixed case/underscores (`Former_Players_Data_Cards` vs `Player_Cards`)
- Some duplicate content across archives (text mirrors in both Tribune Media and Sports Desk)
- PDFs stored alongside text files without clear separation

**Recommended structure (if reorganizing):**
```
GodWorld_Drive/
├── 01_Tribune_Media/          ← journalist desk folders (one per reporter)
├── 02_Sports_Oakland/         ← A's Universe: player cards, stats, rosters
├── 03_Sports_Chicago/         ← Bulls Universe: player cards, contracts
├── 04_Publications/           ← Cycle Pulse editions + supplementals
│   ├── Editions/
│   ├── Supplementals/
│   ├── Chicago/
│   └── PDFs/
├── 05_Front_Office/           ← Paulson pressers, Mara directives, season data
└── 06_Archives/               ← Text mirrors, legacy content
```

**Impact on scripts:** If reorganized, update `ROOTS` array in `buildCombinedManifest.js` with new folder IDs. Re-run crawl + download. All local paths regenerate automatically.

---

## Completed Roadmaps (Archive)

These docs are **done** and no longer need tracking. Kept for reference.

| Document | Status | Notes |
|----------|--------|-------|
| `docs/engine/TIER_7_ROADMAP.md` | **COMPLETE** | All Tier 7 features implemented |
| `docs/engine/CIVIC_INITIATIVE_v1.5_UPGRADE.md` | **COMPLETE** | v1.7 with mayoral veto |
| `docs/media/JOURNALISM_AI_OPTIMIZATIONS.md` | **COMPLETE** (v1.2) | All phases done, Session 31 |
| `docs/engine/ENGINE_ROADMAP.md` | **COMPLETE** (Tiers 1-6) | 2 schema items remain (weather cols, roster sheet) |
| `docs/reference/COMPLETED_ENHANCEMENTS.md` | **ARCHIVE** | Historical record through Session 18 |

---

## Tracking Docs Consolidated

This file replaces the need to check multiple scattered docs. Previous trackers:

| Old Doc | What It Tracked | Status Now |
|---------|----------------|------------|
| `ENGINE_ROADMAP.md` | Tier 1-6 implementation | Complete — 2 schema items captured above |
| `TIER_7_ROADMAP.md` | Tier 7 features | Complete |
| `PRIORITY_TASKS.md` | Active work items | Open items moved here |
| `AUDIT_TRACKER.md` | Technical debt | Open items moved to Tech Debt above |
| `JOURNALISM_AI_OPTIMIZATIONS.md` | Signal intelligence features | Complete |
| `LEDGER_HEAT_MAP.md` | Sheet health + cleanup roadmap | Phase C/D items captured in Active Work above |
| `SESSION_CONTEXT.md` | Current work / next steps | Still maintained per session — this doc is the longer view |

**Rule:** Update this file at session end. Keep it honest — mark things done when they're done, not when they're planned.

---

## Timeline Constraints

| Deadline | Items | Risk |
|----------|-------|------|
| **Before C100** (~19 cycles) | Run LifeHistory archive as preventive measure | LOW — manageable if missed |
| **Before C150** (~69 cycles) | LifeHistory archive + compression enforcement | **HIGH** — LifeHistory_Log will exceed safe size |
| **Before C200** (~119 cycles) | Dead column deletion, resolved initiative archive | MEDIUM — sheet bloat accumulates |

---

*Previous tracking docs remain in place for historical reference but should not be used for active planning. This is the single source of truth.*
