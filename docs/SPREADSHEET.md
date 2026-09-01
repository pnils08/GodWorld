# GodWorld Spreadsheet Environment

**Sheet ID:** `GODWORLD_SHEET_ID` in `/root/.config/godworld/.env` (relocated S156 Phase 40.3)
**Service account:** `maravance@godworld-486407.iam.gserviceaccount.com` (read/write; CAN add tabs via batchUpdate addSheet — verified S305 Intake creation; cannot create new spreadsheet files)
**Total tabs:** ~65 total (53 visible in SCHEMA_HEADERS + 6 hidden/archived + utility tabs) | **Active:** ~45 | **Hidden (S139):** 6 | **Utility:** ~8

**Canonical column map:** `schemas/SCHEMA_HEADERS.md` — auto-generated row/col counts and A/B/C header list for every visible tab (53 as of 2026-04-15 refresh). Refresh via Apps Script `exportAndPushToGitHub` in `utilities/exportSchemaHeaders.js`. Ground truth when this doc's tab descriptions drift. *(Phase 41.6 backlink, S156.)*

Last audited: Session 234 (2026-05-24, /doc-audit data group) — Simulation_Ledger row count bumped to 858 (S232 canon.3 T9 backfill +22; max POPID POP-00973). Other per-tab row counts still from S105 and increasingly drifted — SCHEMA_HEADERS is the authoritative source for any specific tab. SCHEMA_HEADERS itself last regenerated 2026-05-12 (S213). Active Tabs table below carries S187 row counts — engine-sheet refresh on next dedicated audit pass.

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
| **Simulation_Ledger** | 922 | ENGINE, SCRIPT, DASHBOARD | ENGINE | **The citizens.** 50 columns (A-AX; MemoryRegisters at AX S282, SMPageId AW S262, DialState AV S256, Gender AU). All ClockModes. Max POPID POP-01037 (S282 live). |
| **LifeHistory_Log** | 3,223 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Citizen life events. 7 columns. |
| **Generic_Citizens** | 277 | ENGINE, SCRIPT | ENGINE | Emergence pipeline — Tier 4 citizen generation |
| **Household_Ledger** | 529 | ENGINE | ENGINE | Household groupings, rent, ownership |
| **Casino_Ledger** | (unarmed) | ENGINE | ENGINE | 4b wager tab — missing = no-op. Armed on bench by engine-sheet. |
| **Family_Relationships** | 2 | ENGINE | ENGINE | Parent-child links (mostly in SL ParentIds/ChildrenIds) |
| **Relationship_Bonds** | 211 | ENGINE | ENGINE | Active alliance/rivalry/mentorship bonds |
| **Relationship_Bond_Ledger** | 2,424 | ENGINE | ENGINE | Full bond history |
| **Neighborhood_Map** | 22 | ENGINE, SCRIPT | ENGINE, SCRIPT | 22 neighborhoods, 30 cols (S398 engine.135 B1: cols Y–AD `IncomeTier, BoomExposure, BoomIndex, EmployerCharacter, WealthMin, WealthMax` authored from INSTITUTIONS §Neighborhoods, `MedianIncome` re-based; live 2026-08-30) (S315: trajectory block replaced gentrification block; S352 engine.99: East Oakland row added + CoreSimRank col X — ADR-0016 truth source for the hood set AND the core-sim subset/draw order; loader: phase01-config/canonNeighborhoodLoader.js, detector: scripts/auditHoodDrift.js) |
| **Event_Content_Ledger** | 253 | ENGINE, SCRIPT | HAND, SCRIPT | Sheet-resident event content (S289 Design A + engine.49 auto-author): `line` pool rows + `fragment` slot fillers, 9 cols A–I (Kind/PoolKey/Slot/Text/Weight/Conditions/Tags/Grain/Active). Read by `loadEventContentLedger_` Phase 2 → `S.contentLedger`; empty/missing tab = no-op fallback to hardcoded pools. Written by hand + post-cycle `scripts/draftContentRows.js` (`auth:auto` provenance; Active kill switch). DSL + source whitelist live in the loader — see `loadEventContentLedger.js` |
| **Neighborhood_Demographics** | 22 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Per-neighborhood population/income/age; 22 hoods = the Neighborhood_Map set (East Oakland row added S398, live 2026-08-30); Unemployed/Sick are envelopes of the World_Population dials (engine.133/135) |
| **Crime_Metrics** | 17 | ENGINE, SCRIPT, DASHBOARD | ENGINE | QoL index, patrol, hotspots per neighborhood |
| **Transit_Metrics** | 180 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Ridership, delays, construction |
| **Domain_Tracker** | 46 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Domain activity and cooldowns |
| **Edition_Coverage_Ratings** | 9 | ENGINE | SCRIPT | Per-domain media ratings (-5 to +5). Cols: Cycle, Domain, Rating, ArticleCount, Reporter, Tone, Processed. Written by rateEditionCoverage.js post-publish, read by applyEditionCoverageEffects_ Phase 2 (S137b) |
| **Civic_Office_Ledger** | 999* | ENGINE, SCRIPT, DASHBOARD | ENGINE | Council members, civic officials, factions |
| **Initiative_Tracker** | 994* | ENGINE, SCRIPT, DASHBOARD | ENGINE | 5 civic initiatives with votes, status, timeline |
| **Civic_Sweep_Report** | 8 | ENGINE | ENGINE | Civic sweep results |
| **WorldEvents_Ledger** | 239 | ENGINE, SCRIPT | ENGINE | Legacy world events |
| **WorldEvents_V3_Ledger** | 183 | ENGINE, SCRIPT | ENGINE | V3 world events |
| **Event_Arc_Ledger** | 653 | SCRIPT, DASHBOARD | — (frozen) | **FROZEN S313 (Mike-direct)** — arc loop retired (loader + lifecycle + writer disabled; stories are seeded, never re-ingested). Historical data C70–C101; cols T–AF were the deleted v1 arc engine's, never written since. |
| **Cultural_Ledger** | 33 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Cultural figures, fame scores |
| **Texture_Trigger_Log** | 295 | ENGINE | ENGINE | Neighborhood texture triggers |
| **Story_Seed_Deck** | 1,346 | ENGINE, SCRIPT | ENGINE | Story seeds for media |
| **Story_Hook_Deck** | 288 | ENGINE, SCRIPT, DASHBOARD | ENGINE | Story hooks for desks |
| **Cycle_Seeds** | 10 | ENGINE | ENGINE | RNG seeds per cycle |
| **Cycle_Packet** | 46 | ENGINE, SCRIPT | ENGINE | Serialized cycle output (JSON blobs) |
| **Media_Briefing** | 18 | ENGINE, SCRIPT | ENGINE | Media room briefing packet |
| **Media_Ledger** | 39 | ENGINE, DASHBOARD | ENGINE | Media event records |
| **Riley_Digest** | 85 | ENGINE | ENGINE | Compressed cycle digest for pattern detection |
| **Engine_Errors** | 25 | ENGINE, SCRIPT | ENGINE | Unified diagnostic ledger (S216 engine.15 P3 expanded 5→10 cols: +Class/Source/Severity/Resolved/Hash). Captures runtime errors (godWorldEngine2), test fails (`lib/diagnosticLedger` opt-in), audit findings (`engineAuditor --ledger`). |

*Civic_Office_Ledger and Initiative_Tracker show ~1000 rows due to Google Sheets grid allocation, actual data is much smaller.

### `World_Config` grief calibration (engine.94)

These six required key→value rows calibrate the bounded `MemoryRegisters.grief` consumer. They are loaded through `loadConfig_`; missing, nonnumeric, or out-of-range values fail loud. Structural behavior—C+1 start, inclusive expiry, source cap 3, deduplication, non-stacking, maximum one grief response per Cycle, and existing-tag dial routing—remains in code.

| Key | Approved value | Purpose |
|---|---:|---|
| `griefDurationCycles` | 3 | ordinary grief duration in Cycles |
| `griefHolidayDurationCycles` | 5 | stress-holiday grief duration in Cycles |
| `griefParticipationMultiplier` | 0.80 | active-grief atmospheric participation multiplier |
| `griefPublicActivityMultiplier` | 0.75 | public and out-and-about pool multiplier |
| `griefSupportMultiplier` | 1.25 | living-support pool multiplier |
| `griefResponseChance` | 0.35 | maximum-one reserved response probability |

`phase01-config/engine94SheetContract.js` code-carries the approved starting calibration and seeds only missing rows before cache creation or any Cycle mutation. Existing valid operator-tuned values are preserved. `scripts/applyGriefWorldConfig.js` remains an explicit audit/rehearsal tool; the production Sheet does not depend on replaying sandbox writes.

### Approval ceiling state and calibration (engine.94)

The sustained-high-approval ceiling uses eight required `World_Config` rows. Missing, nonnumeric, or out-of-range values fail loud; code owns streak/lifecycle invariants while Sheet values own calibration.

| Key | Approved value | Purpose |
|---|---:|---|
| `approvalCeilingThreshold` | 80 | approval at or above this value advances the streak |
| `approvalCeilingMinStreakCycles` | 3 | minimum consecutive high-approval Cycles before rolls begin |
| `approvalCeilingBaseChance` | 0.05 | scandal probability at the minimum streak |
| `approvalCeilingChanceStep` | 0.05 | probability added per further high-approval Cycle |
| `approvalCeilingMaxChance` | 0.30 | maximum scandal probability per Cycle |
| `approvalCeilingScandalDurationCycles` | 3 | inclusive owned-scandal duration |
| `approvalCeilingApprovalDrop` | 12 | immediate approval-point correction on trigger |
| `approvalCeilingElectionPenalty` | 25 | incumbent-score penalty while `Status=scandal` |

`Civic_Office_Ledger` carries three engine-owned columns appended after `Approval`: `HighApprovalStreak` (integer), `AutoScandalUntilCycle` (inclusive Cycle), and `AutoScandalSource` (`approval-ceiling` or blank). The source field distinguishes bounded engine-created scandals from manual/civic status; the engine never auto-clears a scandal it does not own. Election turnover clears all three fields so a challenger cannot inherit an incumbent's state.

`phase01-config/engine94SheetContract.js` seeds missing rows and appends missing state headers before cache creation, ledger loading, time advance, or any other Cycle mutation. It is idempotent, preserves valid operator tuning, and aborts before writes on malformed config or schema conflicts. `scripts/applyApprovalCeilingConfig.js` remains an explicit audit/rehearsal tool rather than a production deployment prerequisite. Regenerate `schemas/SCHEMA_HEADERS.md` from live after the first production Cycle self-arms the columns.

---

## Active Tabs — Intake & Media Pipeline

Read/written by Node.js scripts during edition production.

| Tab | Rows | Read By | Write By | Purpose |
|-----|------|---------|----------|---------|
| **Intake** | 1 | ENGINE | MIKE, ENGINE | Lean engine.51 citizen front door (First/Last/Age/Neighborhood/RoleType/Category/Family/Notes/IntakeStatus) — created on prod S305; processed by `processIntake_` Phase 5, fed by `mediaRoomIntake.js` |
| **Media_Intake** | 222 | SCRIPT | SCRIPT | Citizen intake from editions |
| **Storyline_Intake** | 346 | SCRIPT | SCRIPT | Storyline intake from editions |
| **Citizen_Usage_Intake** | 852 | SCRIPT | SCRIPT | Citizen usage tracking with POPID |
| **Citizen_Media_Usage** | 500 | ENGINE, SCRIPT | ENGINE, SCRIPT | Citizen media appearances (cleaned S99) |
| **Storyline_Tracker** | 239 | ENGINE (`monitorStorylineHealth_` only) | ENGINE, SCRIPT | DISCONTINUED 2026-08-05 (Mike-direct) — superseded by Storyline_Ledger. S407: last script reader repointed, Phase-8 ager disabled (engine.140); only `monitorStorylineHealth_` still reads it |
| **Storyline_Ledger** | 23 | SCRIPT (buildWorldSummary desk_signal, buildDeskPackets, curation) | SCRIPT (cron-saturday-run.js step 6b) | INTAKE-fed storyline threads (pipeline.45) — reporter slugs, verb-driven status; read back to the desks S407 |
| **Employment_Roster** | 658 | SCRIPT | SCRIPT | Citizen-employer linkage |
| **Health_Cause_Queue** | 3 | ENGINE | ENGINE | Phase 11 health cause assignments |

---

## Active Tabs — Sports Feeds

**`Undocked_Feed`** (S376) — approved UNDOCKED episodes. Engine cannot read repo
disk, so this is the transport for the show feed. Pushed post-approval by
`undockedShowGate.js --push`, read Phase-2 by `loadUndockedFeed_`. Sits with the
sports feeds because it is the same shape: `Oakland_Sports_Feed` is feed instance
1, this is instance 2.

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
| **Business_Ledger** | 175 | ENGINE, SCRIPT, DASHBOARD | SCRIPT | 175 businesses (BIZ-00001–00179 with gaps); every Neighborhood_Map hood ≥ 6 rows since S398 (engine.135 Phase C, 72-row fill BIZ-00108–00179 + 32 storefront rows re-based to the plan §Pay scale); `Avg_Salary` is the tracked-employer Income floor's input (D3) |
| **Faith_Organizations** | 16 | SCRIPT, DASHBOARD | SCRIPT | 16 faith orgs with leaders |
| **Economic_Parameters** | 198 | ENGINE (engine.51 intake salary pools, `godWorldEngine2.js` L1242+, S305) | SCRIPT | 198 role economic profiles (local copy at `data/economic_parameters.json`). Was "no readers" pre-S305; nearly retired S311 on that stale verdict — final pre-delete grep reversed it. |
| **Event_Wiring_Ledger** | 39 | MIKE (grid-health view) | SCRIPT (regen on matrix change) | Rendered view of the engine.67 generator conditioning matrix — one row per event generator, gate status per citizen dimension (Age/Status/Wealth/Household/Heritage). Source of truth: `docs/plans/2026-07-18-event-pools-design.md`; regenerate tab same-commit when matrix changes. NEW S325. |

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
| **Youth_Events** | 24 | `runYouthEngine_()` (Phase 5) writes via `youthActivities.js`. Active but sparse — only 21 citizens aged 5-22 in ledger, only 1 actual child (age 11). | Needs children in the ledger. See rollout — engine.4 blocked on engine.5 (household structure + 120 youth ingest). |

**Faith_Ledger orphan status closed S229:** previously listed here as "needs a consumer". Consumer shipped S180 — `scripts/buildFaithDigest.js` reads Faith_Ledger for culture-desk briefing rendering (`scripts/buildDeskFolders.js` L204/L275/L485) + `scripts/buildFaithCards.js` reads for recent-events history. Faith_Ledger now sits in the consumer chain; row moved out of orphaned table during engine.4 audit cleanup.

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
| **Ledger_Index** | ~~45~~ | **DELETED S311** (engine.44 C4, Mike-confirmed) — old manual tab tracker, zero code refs; snapshot at `docs/archive/tab-snapshots/S311-retired-tabs.json`. Narrative_Bridge deleted same pass (header-only, never listed here). |

---

## Ghost References — Engine Code Points to Tabs That Don't Exist

infrastructure.6 Track B close (2026-08-16, `c3fe1780` + `86f43999`). Each row carries a disposition. One row stays open.

**Correction:** `Chicago_Feed` is **not** a ghost. A Track B pass flagged it and that change was reverted in `c3fe1780`. The engine writes the tab every cycle (`v3ChicagoWriter.js` `ensureSheet_`); `cycleExportAutomation.js`, `cycleRollback.js`, and `auditSheetHeaders.js` all reference it. Leave it off this table.

| Ghost Tab | Where Referenced | Disposition (2026-08-16) |
|-----------|-----------------|---------------|
| **Intake** | `editionIntake.js` (old) | **CLOSED S106 / S305.** Old writer rerouted to `Citizen_Usage_Intake`. Tab created on prod S305 for the engine.51 `processIntake_` front door. |
| **Advancement_Intake** | `processAdvancementIntake.js`, `mediaRoomIntake.js` fallbacks | **CLOSED `c3fe1780` — fallbacks dropped.** Bare `Advancement_Intake` does not exist; each site already guarded (return / lazy-create / `if (advSheet)`). No behavior change. **`Advancement_Intake1` is live** (`schemas/SCHEMA_HEADERS.md`) and is not a ghost. `sheetNames.js` `ADVANCEMENT_INTAKE` constant removed. |
| **Business_Intake** | `editionIntake.js` (old) | **CLOSED S106.** Writes to `Storyline_Intake`. |
| **Sports_Feed** | `diagnoseDashboardData.js` (old), `sheetNames.js` | **CLOSED `c3fe1780`.** Diagnostic read repointed to `Oakland_Sports_Feed`. `SPORTS_FEED` constant removed. Zero consumers of the ghost name. |
| **Citizens** | `buildDeskPackets.js` (historical) | **CLOSED — stale doc-only.** Zero live `getSheetByName('Citizens')` in `phase*/`, `utilities/`, `lib/`. Simulation_Ledger is the citizen tab. |
| **Citizen_Directory** | `bondEngine.js` (historical), `sheetNames.js` | **CLOSED.** Tab never existed. Constant absent from `sheetNames.js`. Live lookup is Simulation_Ledger. |
| **City_Dynamics** | `civicInitiativeEngine.js` `manualRunVote` | **CLOSED `c3fe1780` — ghost-read removed.** Tab never existed; sentiment already defaulted to 0. |
| **Simulation_Config** | `civicInitiativeEngine.js` `manualRunVote` | **CLOSED `c3fe1780` — repointed to `World_Config`.** Fixes a silently-zero `cycleCount` read (operator-fired, not cycle-path). |
| **Game_Intake** | `chicagoSatellite.js` `getBullsSentimentImpact_` | **CLOSED `c3fe1780` — full delete.** Mike-direct: Chicago dormant. Function + caller removed together (caller-only leftover would throw). Zero live `Game_Intake` reads remain. |
| **Health_Cause_Intake** | `healthCauseIntake.js` | **PENDING — do not mark done.** Mike-ruled CREATE. Live tab creation is engine-sheet execute domain and must reach es from Mike, not a relay. `Health_Cause_Queue` exists. Allowlisted in `scripts/tabReferenceIntegrity.test.js` until the tab exists. |
| **MediaRoom_Paste** | `parseMediaRoomMarkdown.js`, `mediaRoomIntake.js` | **CLOSED — kept + allowlisted.** Auto-created on operator run (`insertSheet`). Same class as `Election_Log`. |
| **Raw_Continuity_Paste** | `continuityNotesParser.js` | **CLOSED — file deleted whole.** Tab never existed. Zero live callers. |
| **Story_Hook_Archive** | `hookLifecycleEngine.js` (historical) | **CLOSED — stale doc-only.** Zero live code refs. `hookLifecycleEngine` itself is gone. |
| **Election_Log** | `runCivicElectionsv1.js` | **CLOSED — reclassified, not a ghost.** Schema-documented; auto-created on write. Precedent for `MediaRoom_Paste`. |
| **Continuity_Intake** | `continuityNotesParser.js` | **CLOSED — file deleted whole.** Tab never existed. Zero live callers. |

---

## Maintenance Notes

- **Row counts from S105 audit.** Re-run after cycle runs to check growth.
- **Civic_Office_Ledger and Initiative_Tracker** show ~1000 rows in the grid but actual data is much smaller. Google Sheets allocates rows in advance.
- **Ghost-tab sweep (infrastructure.6 Track B, 2026-08-16).** Dispositions above. Open remainder: `Health_Cause_Intake` CREATE, Mike → engine-sheet directly. Regression guard: `scripts/tabReferenceIntegrity.test.js` (`86f43999`).
- To archive a dead tab: copy data to a local CSV (`scripts/backupSpreadsheet.js`), then delete or hide the tab. Don't delete without a backup.
