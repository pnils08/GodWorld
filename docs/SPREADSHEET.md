# GodWorld Spreadsheet Environment

**Sheet ID:** `GODWORLD_SHEET_ID` in `/root/.config/godworld/.env` (relocated S156 Phase 40.3)
**Service account:** `maravance@godworld-486407.iam.gserviceaccount.com` (read/write, CANNOT create new sheets)
**Total tabs:** ~65 total (53 visible in SCHEMA_HEADERS + 6 hidden/archived + utility tabs) | **Active:** ~45 | **Hidden (S139):** 6 | **Utility:** ~8

**Canonical column map:** `schemas/SCHEMA_HEADERS.md` — auto-generated row/col counts and A/B/C header list for every visible tab (53 as of 2026-04-15 refresh). Refresh via Apps Script `exportAndPushToGitHub` in `utilities/exportSchemaHeaders.js`. Ground truth when this doc's tab descriptions drift. *(Phase 41.6 backlink, S156.)*

Last audited: Session 187 (2026-04-29, /doc-audit data group) — Simulation_Ledger row count bumped to ~837 (S185 sheet-hygiene trim). Other per-tab row counts still from S105 and increasingly drifted — SCHEMA_HEADERS is the authoritative source for any specific tab. SCHEMA_HEADERS itself last regenerated 2026-04-27 (pre-S185 trim); next regen on engine-sheet's schedule.

---

## Tab Status Key

- **ENGINE** — Read/written by the GAS 11-phase engine (`clasp push` deploys)
- **SCRIPT** — Read/written by Node.js scripts (`scripts/`, `lib/`)
- **DASHBOARD** — Read by the Express dashboard API
- **MIKE** — Manually maintained by Mike
- **DEAD** — Not read by any active code. Candidate for archival/deletion.
- **LEGACY** — Referenced in engine code but the reference is dead or bypassed

---

## Active Tabs — Engine Core

These are read/written during every cycle run.

| Tab | Rows | Read By | Write By | Purpose |
|-----|------|---------|----------|---------|
| **World_Config** | 11 | ENGINE | ENGINE | Engine configuration parameters |
| **Simulation_Calendar** | 1 | ENGINE | ENGINE | Current sim date, season, holiday |
| **Dashboard** | 50 | ENGINE, DASHBOARD | ENGINE | 7 cards, 28 data points for dashboard |
| **World_Population** | 1 | ENGINE | ENGINE | Birth/death/migration totals |
| **World_Drift_Report** | 1 | ENGINE | ENGINE | Demographic drift metrics |
| **Cycle_Weather** | 12 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Weather by cycle |
| **Simulation_Ledger** | ~837 | ENGINE, SCRIPT, DASHBOARD | ENGINE | **The citizens.** 47 columns (A-AU; Gender in AU confirmed S146). All ClockModes. Max POPID POP-00951 (S184 +150 female balance, S185 -74 blank-row trim). |
| **LifeHistory_Log** | 3,223 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Citizen life events. 7 columns. |
| **Generic_Citizens** | 277 | ENGINE, SCRIPT | ENGINE | Emergence pipeline — Tier 4 citizen generation |
| **Household_Ledger** | 529 | ENGINE | ENGINE | Household groupings, rent, ownership |
| **Family_Relationships** | 2 | ENGINE | ENGINE | Parent-child links (mostly in SL ParentIds/ChildrenIds) |
| **Relationship_Bonds** | 211 | ENGINE | ENGINE | Active alliance/rivalry/mentorship bonds |
| **Relationship_Bond_Ledger** | 2,424 | ENGINE | ENGINE | Full bond history |
| **Neighborhood_Map** | 17 | ENGINE, SCRIPT | ENGINE, SCRIPT | 17 Oakland neighborhoods with economics |
| **Neighborhood_Demographics** | 17 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Per-neighborhood population/income/age |
| **Crime_Metrics** | 17 | ENGINE, SCRIPT, DASHBOARD | ENGINE | QoL index, patrol, hotspots per neighborhood |
| **Transit_Metrics** | 180 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Ridership, delays, construction |
| **Domain_Tracker** | 46 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Domain activity and cooldowns |
| **Edition_Coverage_Ratings** | 9 | ENGINE | SCRIPT | Per-domain media ratings (-5 to +5). Cols: Cycle, Domain, Rating, ArticleCount, Reporter, Tone, Processed. Written by rateEditionCoverage.js post-publish, read by applyEditionCoverageEffects_ Phase 2 (S137b) |
| **Civic_Office_Ledger** | 999* | ENGINE, SCRIPT, DASHBOARD | ENGINE | Council members, civic officials, factions |
| **Initiative_Tracker** | 994* | ENGINE, SCRIPT, DASHBOARD | ENGINE | 5 civic initiatives with votes, status, timeline |
| **Civic_Sweep_Report** | 8 | ENGINE | ENGINE | Civic sweep results |
| **WorldEvents_Ledger** | 239 | ENGINE, SCRIPT | ENGINE | Legacy world events |
| **WorldEvents_V3_Ledger** | 183 | ENGINE, SCRIPT | ENGINE | V3 world events |
| **Event_Arc_Ledger** | 148 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Multi-cycle story arcs |
| **Cultural_Ledger** | 33 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Cultural figures, fame scores |
| **Texture_Trigger_Log** | 295 | ENGINE | ENGINE | Neighborhood texture triggers |
| **Story_Seed_Deck** | 1,346 | ENGINE, SCRIPT | ENGINE | Story seeds for media |
| **Story_Hook_Deck** | 288 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Story hooks for desks |
| **Cycle_Seeds** | 10 | ENGINE | ENGINE | RNG seeds per cycle |
| **Cycle_Packet** | 46 | ENGINE, SCRIPT | ENGINE | Serialized cycle output (JSON blobs) |
| **Media_Briefing** | 18 | ENGINE, SCRIPT | ENGINE | Media room briefing packet |
| **Media_Ledger** | 39 | ENGINE, DASHBOARD | ENGINE | Media event records |
| **Riley_Digest** | 85 | ENGINE | ENGINE | Compressed cycle digest for pattern detection |
| **Engine_Errors** | 21 | ENGINE | ENGINE | Runtime error log |

*Civic_Office_Ledger and Initiative_Tracker show ~1000 rows due to Google Sheets grid allocation, actual data is much smaller.

---

## Active Tabs — Intake & Media Pipeline

Read/written by Node.js scripts during edition production.

| Tab | Rows | Read By | Write By | Purpose |
|-----|------|---------|----------|---------|
| **Media_Intake** | 222 | SCRIPT | SCRIPT | Citizen intake from editions |
| **Storyline_Intake** | 346 | SCRIPT | SCRIPT | Storyline intake from editions |
| **Citizen_Usage_Intake** | 852 | SCRIPT | SCRIPT | Citizen usage tracking with POPID |
| **Citizen_Media_Usage** | 500 | ENGINE, SCRIPT | ENGINE, SCRIPT | Citizen media appearances (cleaned S99) |
| **Storyline_Tracker** | 212 | ENGINE, SCRIPT, DASHBOARD | ENGINE, SCRIPT | Storyline status and health |
| **Employment_Roster** | 658 | SCRIPT | SCRIPT | Citizen-employer linkage |
| **Health_Cause_Queue** | 3 | ENGINE | ENGINE | Phase 11 health cause assignments |

---

## Active Tabs — Sports Feeds

Game data from Mike's MLB The Show / NBA 2K sessions.

| Tab | Rows | Read By | Write By | Purpose |
|-----|------|---------|----------|---------|
| **Oakland_Sports_Feed** | 134 | ENGINE, SCRIPT | MIKE | A's/NBA game results, transactions, player features. 20 columns — engine reads SeasonType, TeamsUsed, Team Record, Streak, EventTrigger, HomeNeighborhood, FanSentiment, PlayerMood, FranchiseStability, EconomicFootprint, CommunityInvestment, MediaProfile. Last row per cycle = season-state (S137b) |
| **Chicago_Feed** | 53 | ENGINE | MIKE | Chicago city events |
| **Chicago_Sports_Feed** | 72 | LEGACY | MIKE | Bulls game results — engine no longer reads (phased out S136, after C91) |

---

## Active Tabs — Reference & Roster

Maintained for reference by scripts and Mara audits.

| Tab | Rows | Read By | Write By | Purpose |
|-----|------|---------|----------|---------|
| **As_Roster** | 89 | SCRIPT | MIKE | A's player roster — POPID, position, team, tier. NEW S105. |
| **Bay_Tribune_Oakland** | 29 | SCRIPT | MIKE | Tribune journalist roster. NEW S105. |
| **Chicago_Citizens** | 123 | SCRIPT | ENGINE | Bulls players + Chicago city citizens |
| **Business_Ledger** | 51 | ENGINE, SCRIPT, DASHBOARD | SCRIPT | 51 businesses with sectors, employees |
| **Faith_Organizations** | 16 | SCRIPT, DASHBOARD | SCRIPT | 16 faith orgs with leaders |
| **Economic_Parameters** | 198 | — | SCRIPT | 198 role economic profiles (local copy at `data/economic_parameters.json`) |

---

## Hidden Tabs — Backed Up and Archived (S139)

These tabs were backed up to `output/dead-tab-backups/` as CSV and hidden on the spreadsheet. No active engine code reads or writes them.

| Tab | Rows | Why Hidden |
|-----|------|------------|
| **Press_Drafts** | 164 | Writer deleted S98. No active code. |
| **MLB_Game_Intake** | 76 | Mike confirmed dead S105. |
| **NBA_Game_Intake** | 41 | Same as MLB_Game_Intake. |
| **Sports_Calendar** | 12 | Killed S64. |
| **Arc_Ledger** | 37 | Superseded by Event_Arc_Ledger. |
| **LifeHistory_Archive** | 565 | Offload storage for LifeHistory. No active reader. |

## Active But Orphaned Tabs — Engine Writes, Nothing Reads

| Tab | Rows | Status | What's Needed |
|-----|------|--------|---------------|
| **Faith_Ledger** | 125 | `faithEventsEngine.js` (Phase 4) writes via `ensureFaithLedger.js`. Active write target. | Needs a consumer — culture desk briefings or MCP tool. See rollout. |
| **Youth_Events** | 24 | `runYouthEngine_()` (Phase 5) writes via `youthActivities.js`. Active but sparse — only 21 citizens aged 5-22 in ledger, only 1 actual child (age 11). | Needs children in the ledger. See rollout. |

---

## Utility Tabs — GAS Infrastructure

Not simulation data. Google Apps Script infrastructure and debugging.

| Tab | Rows | Purpose |
|-----|------|---------|
| **/commands** | 35 | GAS command definitions |
| **GitHub_token** | 29 | Token storage for GAS GitHub integration |
| **ToDo** | ERROR | Broken — can't read |
| **GitHub_Templates** | ERROR | Broken — can't read |
| **Engine_Index** | ERROR | Old engine index — broken |
| **Engine_Index2** | 134 | Engine debugging/indexing |
| **Ledger_Index** | 45 | Ledger debugging/indexing |

---

## Ghost References — Engine Code Points to Tabs That Don't Exist

These tab names appear in the GAS engine code but have no matching tab on the spreadsheet. Some are old names, some were never created. They cause silent failures (empty reads, skipped writes).

| Ghost Tab | Where Referenced | Likely Reality |
|-----------|-----------------|---------------|
| **Intake** | `editionIntake.js` (old) | **FIXED S106.** Now writes to `Citizen_Usage_Intake`. |
| **Advancement_Intake** / **Advancement_Intake1** | `editionIntake.js` (old), `processAdvancementIntake.js` | **FIXED S106.** Now writes to `Citizen_Usage_Intake`. `processAdvancementIntake.js` still references old name — separate fix. |
| **Business_Intake** | `editionIntake.js` (old) | **FIXED S106.** Now writes to `Storyline_Intake`. |
| **Sports_Feed** | `applySportsSeason.js` | Renamed to `Oakland_Sports_Feed`. Code updated S89 but old name may linger. |
| **Citizens** | `buildDeskPackets.js` | Old name for Simulation_Ledger query. |
| **Citizen_Directory** | Engine code | Never existed. |
| **City_Dynamics** | Engine code | Never existed — city dynamics stored in ctx, not a tab. |
| **Simulation_Config** | Engine code | Renamed to `World_Config`. |
| **Game_Intake** | Engine code | Old name, possibly for MLB/NBA_Game_Intake. |
| **Health_Cause_Intake** | Engine code | Renamed or never created. `Health_Cause_Queue` exists. |
| **MediaRoom_Paste** / **Raw_Continuity_Paste** | Engine code | Old manual paste targets from pre-pipeline era. |
| **Story_Hook_Archive** | Engine code | Never existed as a tab. |
| **Election_Log** | Engine code | Never existed as a tab. |
| **Continuity_Intake** | Engine code | Never existed. |

---

## Maintenance Notes

- **Row counts from S105 audit.** Re-run after cycle runs to check growth.
- **Civic_Office_Ledger and Initiative_Tracker** show ~1000 rows in the grid but actual data is much smaller. Google Sheets allocates rows in advance.
- **The 3 ghost tab bugs are FIXED (S106).** `editionIntake.js` v2.1 now writes to `Citizen_Usage_Intake` and `Storyline_Intake`. `processAdvancementIntake.js` still references `Advancement_Intake1` — separate fix needed.
- To archive a dead tab: copy data to a local CSV (`scripts/backupSpreadsheet.js`), then delete or hide the tab. Don't delete without a backup.
