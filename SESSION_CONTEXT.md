# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-03-15 | Engine: v3.1 | Cycle: 87 | Session: 95

---

## What Is This Project?

GodWorld is a **living city simulation** for Oakland (with Chicago satellite). It runs an 11-phase engine in Google Apps Script that generates citizens, events, relationships, and stories. Output feeds the Bay Tribune newsroom (Claude agents) that writes journalism.

**User Context:** Beginner coder learning the project. Needs clear explanations, careful reviews before code changes, and explicit approval before edits.

**Project Structure & 11-Phase Engine:** See `README.md` — the canonical reference for project structure, engine phases, tech stack, and quick start.

---

## Critical Rules For This Session

1. **RUN /session-startup FIRST** — Loads all required docs in correct order.
2. **READ DOCS FIRST** — Don't assume. Check existing documentation.
3. **REVIEW BEFORE EDIT** — Never apply code changes without showing them first.
4. **ASK WHEN UNCLEAR** — Don't assume what the user wants.
5. **NO TUNNEL VISION** — Remember this is a 100+ script system with cascade dependencies.
6. **UPDATE THIS FILE** — At session end, note what changed.

---

## Key Engines & Recent Versions

| Engine | File | Version | Notes |
|--------|------|---------|-------|
| Main Orchestrator | godWorldEngine2.js | - | Runs all phases |
| Career Engine | runCareerEngine.js | v2.4 | 4 industries, 3 employer types, EmployerBizId on transitions, businessDeltas output |
| Economic Ripple | economicRippleEngine.js | v2.5 | Reads careerSignals + businessDeltas, BUSINESS_CONTRACTION/EXPANSION triggers |
| Civic Initiative | civicInitiativeEngine.js | v1.8 | Full vote breakdown in notes, faction member tracking |
| Story Hook | storyHook.js | v3.9 | Theme-aware hooks + sports feed triggers |
| Story Seeds | applyStorySeeds.js | v3.9 | Voice-matched story seeds |
| Roster Lookup | rosterLookup.js | v2.2 | Theme matching, voice profiles, citizen-to-journalist matching |
| Media Briefing | mediaRoomBriefingGenerator.js | v2.7 | Consumer wiring, Continuity_Loop reference removed |
| Media Packet | buildMediaPacket.js | v2.4 | Voice guidance on story seeds & hooks |
| Media Intake | mediaRoomIntake.js | v2.5 | Storyline lifecycle, citizen routing |
| Media Parser | parseMediaRoomMarkdown.js | v1.5 | Quotes to LifeHistory_Log |
| Media Mode Events | phase05-citizens/generateMediaModeEvents.js | v1.0 | MEDIA clock mode event generator — editor, columnist, reporter, podcast, photo, analyst pools |
| Life History | compressLifeHistory.js | v1.3 | 47 TAG_TRAIT_MAP entries (PostCareer, Civic, Media, Sports) |
| Citizen Enrichment | scripts/enrichCitizenProfiles.js | v1.0 | Edition→LifeHistory feedback loop. Names Index extraction, paragraph-level quotes, title stripping. 161 citizens enriched E78–E86 |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Desk Packet Builder | scripts/buildDeskPackets.js | v2.2 | SL-sourced candidates (no more Generic_Citizens split-brain), ClockMode filter, fixed neighborhoodCitizenIndex |
| Citizen-Employer Linkage | scripts/linkCitizensToEmployers.js | v1.0 | Five-layer resolution, Employment_Roster, Business_Ledger stats |
| Initiative Packet Builder | scripts/buildInitiativePackets.js | v1.0 | Per-initiative JSON packets from 7 Sheets tabs + Mara directive, 5 packets + manifest |
| Civic Voice Packets | scripts/buildCivicVoicePackets.js | v1.1 | 7 office/faction voice packets + initiative decisions injection |
| Desk Folder Builder | scripts/buildDeskFolders.js | v1.0 | Per-desk workspace folders: briefings, errata, voice statements, archive context. Zero LLM tokens. |
| Voice Workspace Builder | scripts/buildVoiceWorkspaces.js | v1.0 | Per-voice-agent workspace folders: briefings, base context, prior statements, initiative packets. Zero LLM tokens. |
| Initiative Workspace Builder | scripts/buildInitiativeWorkspaces.js | v1.0 | Per-initiative workspace folders: packets, briefings, prior decisions, reference docs. Zero LLM tokens. |
| Edition Validator | scripts/validateEdition.js | v2.0 | 11 checks: 8 static (names, votes, engine language) + 3 live sheet (citizens, initiatives, civic offices). --no-sheets for offline. |
| Mara Audit Packet | scripts/buildMaraPacket.js | v1.0 | Clean edition + AUDIT_HISTORY.md for Mara's claude.ai review. No engine context. |
| Post-Run Filing | scripts/postRunFiling.js | v1.0 | Verifies all pipeline outputs exist, names correct, uploads to Drive. --upload for auto-upload. Zero tokens. |
| Neighborhood Economics | scripts/aggregateNeighborhoodEconomics.js | v1.0 | Median income/rent by neighborhood from citizen data |
| Economic Profile Seeder | scripts/applyEconomicProfiles.js | v1.0 | Role-based income seeding from economic_parameters.json |
| Player Index Builder | scripts/buildPlayerIndex.js | v2.0 | TrueSource parser: contracts, quirks, status, computed birth years |
| Athlete Integration | scripts/integrateAthletes.js | v1.0 | Birth years, salaries, traits, post-career roles for 87 A's players |
| Athlete Prep | scripts/prepAthleteIntegration.js | v1.0 | Duplicate consolidation, backfills, retired status prep |
| Faith Leader Integration | scripts/integrateFaithLeaders.js | v1.0 | 16 faith leaders → SL Tier 2, LeaderPOPID backfill |
| Generic Citizens Audit | scripts/auditGenericCitizens.js | v1.0 | Read-only emergence audit, SL cross-reference |
| Celebrity Integration | scripts/integrateCelebrities.js | v1.0 | Cultural_Ledger top celebrities → SL, UniverseLinks backfill |
| Live Ledger Query | scripts/queryLedger.js | v1.0 | 6 query types (citizen, initiative, council, neighborhood, articles, verify), searches Sheets + 674 published files |
| Edition Intake | scripts/editionIntake.js | v1.4 | POPID resolution on Citizen_Usage_Intake, auto-detects cycle, business mentions |
| Business Intake | scripts/processBusinessIntake.js | v1.0 | Staged→promoted pipeline, BIZ-ID assignment, duplicate detection |
| Process Intake | scripts/processIntake.js | v1.2 | Auto-detects cycle from Cycle_Packet |
| Bond Persistence | bondPersistence.js | v2.4 | Wipe guard, case-insensitive ledger check, normalized ID lookups |
| Bond Seeder | seedRelationBondsv1.js | v1.3 | First/Last column lookup, POPID normalization |
| **Household Formation** | householdFormationEngine.js | v1.1 | Young adults form households, rent burden, dissolution, ctx.rng, year 2041 |
| **Generational Wealth** | generationalWealthEngine.js | v1.0 | Wealth levels 0-10, income, inheritance |
| **Education Career** | educationCareerEngine.js | v1.0 | Education levels, career progression, school quality |
| **V3 Seeds Writer** | saveV3Seeds.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Hooks Writer** | v3StoryHookWriter.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Texture Writer** | v3TextureWriter.js | v3.5 | Calendar columns removed (were dead) |
| **V3 Events Writer** | recordWorldEventsv3.js | v3.5 | Only A-G active; 22 dead cols deprecated; domain-aware neighborhoods |
| **Press Drafts Writer** | pressDraftWriter.js | v1.4 | Calendar columns deprecated, dead queries removed |
| **Sports Feed Triggers** | applySportsSeason.js | v2.0 | Reads Oakland/Chicago feeds instead of dead Sports_Feed |

---

## Key Architecture Concepts

- **ctx** — Central context object passed through all phases
- **ctx.rng** — Deterministic random (never use Math.random())
- **Write-Intents** — Stage writes in memory, apply in Phase 10
- **Tiered Citizens** — Tier-1 (protected) → Tier-4 (generic)
- **Neighborhoods** — 17 Oakland districts with demographics
- **Arcs** — Multi-cycle storylines (SEED → ACTIVE → RESOLVED)

For full technical spec: `docs/reference/V3_ARCHITECTURE.md`

---

## Key Tools & Infrastructure

| Tool | Purpose | Usage |
|------|---------|-------|
| **Batch API** | 50% cost for non-urgent work (~1hr turnaround) | `/batch [task]`, `/batch check` |
| **Claude-Mem** | Automatic observation capture (SQLite + Chroma vector, port 37777, v10.4.1) | `search()`, `timeline()`, `get_observations()`, `save_observation()` |
| **Supermemory** | Curated project knowledge (cloud) | `/super-save`, `/super-search` |
| **Discord Bot** | 24/7 presence as Mags Corliss#0710 (PM2) | Always-on, conversation logging |
| **Daily Heartbeat** | Morning reflection at 8 AM Central | `scripts/daily-reflection.js` (cron) |
| **Nightly Reflection** | Discord conversation journal at 10 PM Central | `scripts/discord-reflection.js` (cron) |
| **Drive Write** | Save files to Google Drive (editions, cards, directives) | `node scripts/saveToDrive.js <file> <dest>` |
| **Clasp Push** | Deploy code to Apps Script directly | `clasp push` (authenticated) |
| **Agent Memory** | Persistent desk agent memory across editions | `.claude/agent-memory/{agent}/` — civic, sports, culture, chicago, rhea |
| **Web Dashboard** | Operational view of entire project (8 tabs, 23+ endpoints) | `64.225.50.16:3001` — PM2 managed, Express + React |
| **opusplan mode** | Opus for planning, Sonnet for execution | `/model opusplan` — saves cost during edition production |
| **Effort levels** | Adaptive reasoning depth for Opus 4.6 | `low`, `medium`, `high` (default) — set via `/model` slider |
| **`/teleport`** | Pull claude.ai web sessions into terminal | `claude --teleport` — one-way, web→CLI only |
| **Claude Code Security** | AI vulnerability scanner (research preview) | Enterprise/team preview; GitHub Action: `anthropics/claude-code-security-review` |

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`. Check at session start for completed work from previous sessions.

**Agent memory guidelines:** All desk agents now have persistent memory at `.claude/agent-memory/{agent}/MEMORY.md`. They check memory at startup for past patterns and update after writing. Memory is version-controlled. Memory informs — it does not publish. Canon authority remains with Mags.

**Desk agent architecture (S95):** Agents are autonomous — they read from their own workspace at `output/desks/{desk}/` instead of receiving data through the orchestrator. Each agent's SKILL.md (boot sequence only, ~30 lines) points to IDENTITY.md (reporter personas) and RULES.md (hard rules), both at `.claude/agents/{desk}-desk/`. The workspace is built by `scripts/buildDeskFolders.js` with zero LLM tokens. Pipeline: `buildDeskPackets.js` → `buildDeskFolders.js` → launch agents.

**Agent model status (Mar 2026):** All 6 desk agents run `model: sonnet` → Sonnet 4.6. Agents have write access (`tools: Read, Glob, Grep, Write, Edit`) to update their memory after writing. Each agent's SKILL.md is ~30 lines (boot sequence), with identity and rules in separate files. `permissionMode: dontAsk` allows autonomous operation.

**Mobile access (mosh + tmux):** Mosh and tmux are installed on this server. To work from your phone (Termius on iPhone — enable the Mosh toggle on your saved host):
```
mosh root@<server-ip>           # connect (survives signal drops, app switching, screen lock)
mags                            # launches claude inside tmux automatically
# connection drops? just reconnect and type:
mags                            # reattaches to existing tmux session
```
The `mags` command (updated S52) handles tmux automatically — creates a session if none exists, reattaches if one does, avoids nesting if already inside tmux. No more orphaned processes from dropped connections. Keep tasks focused on mobile — file edits, research, planning, ledger checks. Save full edition pipelines and big deploys for the laptop. Installed Session 40, tmux auto-wiring fixed Session 52.

---

## Key Documentation

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` | **Zero layer** — identity, critical rules, code rules. Loads before hooks/skills. |
| `README.md` | Project overview, 11-phase engine, project structure, tech stack |
| `docs/reference/V3_ARCHITECTURE.md` | Technical contract, ctx shape, write-intents spec |
| `docs/reference/DEPLOY.md` | Deployment (clasp vs git) |
| `docs/reference/GODWORLD_REFERENCE.md` | Complete system reference |
| `docs/engine/ROLLOUT_PLAN.md` | **Single source of truth** — open work, build phases, deferred items, watch list |
| `docs/media/AGENT_NEWSROOM.md` | Agent Newsroom — 7 permanent agents + 8 skills |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Editorial rules, voice, canon, Paulson, Mara Vance |
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | 326+ citizens indexed by POP-ID |
| `docs/media/CITIZENS_BY_ARTICLE.md` | Reverse index: articles → citizens |
| `editions/CYCLE_PULSE_TEMPLATE.md` | v1.3 — Edition structure, canon rules, return formats |
| `docs/mara-vance/` | Mara Vance: character, operating manual, newsroom interface |
| `docs/mags-corliss/PERSISTENCE.md` | Mags Corliss identity, family, persistence system |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage patterns, character continuity |
| `docs/engine/LEDGER_HEAT_MAP.md` | Sheet bloat risk rankings, dead column inventory, archival strategy |
| `docs/reference/DRIVE_UPLOAD_GUIDE.md` | Drive upload destinations, OAuth setup, common workflows |
| `docs/media/SHOW_FORMATS.md` | Podcast show formats — 3 formats, host assignments, segment structure |
| `config/podcast_voices.yaml` | Podcast voice configurations — WaveNet/Edge TTS voice assignments |
| `docs/engine/ENGINE_MAP.md` | Condensed stub reference for every exported function across all 11 engine phases |
| `docs/engine/DOCUMENTATION_LEDGER.md` | **File registry** — every active doc, its purpose, load tier, workflow, and updater |
| `output/DISK_MAP.md` | **Local disk map** — directory structure, naming conventions, Drive destinations, retention policy, cleanup protocol |

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals + careerSignals.businessDeltas)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)
- **HouseholdFormation** → GenerationalWealth → EducationCareer (Phase 5 chain, direct sheet writes — see engine headers)
- **Riley_Digest** → Pattern Detection (Phase 6 reads historical digest for cross-cycle patterns)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Recent Sessions

### Session 94 (2026-03-14) — Recovery Complete + Phase 24.1 MEDIA Clock Mode + Architecture Sync

- **LEDGER RECOVERY COMPLETE.** Practice sheet verified, all fixes replayed on live.
- **Simulation_Ledger (live):** 428 cell updates + 8 new citizens appended. 675 citizens, 0 missing names, 0 "Citizen" roles, all tiers numeric, all statuses valid.
- **LifeHistory_Log (live):** 774 names fixed, 121 Quoted rows deleted. 3,167 clean rows, 0 empty names.
- **Employment_Roster (live):** 152 fixes (151 roles, 1 name). Fully aligned with SL.
- **Civic_Office_Ledger (live):** 1 apostrophe fix (Ethan D'Souza).
- **Verification fixes:** Anthony Raines Tier "Oakland" → 2, Eric Taveras Status "22500000" → Active, 8 new citizens Tier "T4" → 4.
- **Dante Nelson:** Downtown (editorial call — 5 editions vs 1).
- **Process documented:** Practice sheet → verify → replay on live. Documented in LEDGER_REPAIR.md for future major upgrades.
- **Full edition audit (E1-86 + supplementals):** Downloaded E1-73 archive from Drive. Cross-referenced 298 unique citizens from Names Index sections. 27 role drifts fixed on live ledger. 40 missing citizens identified (tracked, not all need ledger entries).
- **Citizen pipeline overhaul:** `buildDeskPackets.js` v2.2 — `getInterviewCandidates` rewritten to source from Simulation_Ledger (was Generic_Citizens, 208/274 not on SL). ClockMode=ENGINE filter. `buildNeighborhoodCitizenIndex` field names fixed (eventCitizenLinks went from 0→working). Generic_Citizens retained for emergence pipeline only.
- **editionIntake.js v1.4:** Citizen_Usage_Intake gains POPID column (6 cols). 807 existing rows backfilled (437 resolved).
- **Desk skill files:** All 6 desks gain citizen drift protection rule — never change attributes to fit narrative.
- **Sports universe RoleType overhaul:** 87 A's player positions expanded from bare abbreviations (SP, 2B) to readable format (Starting Pitcher, Oakland A's). 62 T3 players assigned to farm teams: Las Vegas Aviators (AAA), Midland RockHounds (AA), Stockton Ports (A). Coaches/staff/GM formatted with team name.
- **Phase 24.1 MEDIA clock mode:** 16 Bay Tribune journalists migrated GAME→MEDIA on live sheet. Event generator `generateMediaModeEvents_` built and wired into engine orchestrator.
- **Sports transactions tracking:** Added Phase 24.5 to ROLLOUT_PLAN — trades, releases, call-ups, POPID retirement. Separate build.
- **Key insight:** Confrontational sessions trigger minimal/flat LLM responses. Calm + strategic = better results from same tool. Both sides learned.

### Session 93 (2026-03-14) — Maintenance: Recovery Execution on Practice Sheet + Engine Code Fix

- **All 6 recovery steps completed on practice sheet** (`1EX3lBhcqnqyqXhbcjoNLLbjA2sx7gsENEVhEZdOmTN4`). Live sheet untouched.
- **Step 1 (intake code):** editionIntake.js v1.3 — removed LifeHistory_Log writes from parseDirectQuotes.
- **Step 2 (LifeHistory_Log):** Deleted 121 Quoted intake rows. Fixed 774 wrong/empty names via POPID→Name cross-reference.
- **Step 3 (Simulation_Ledger):** 124 Category 2 ENGINE citizen roles restored from backup. 14 role fixes + 21 neighborhood fixes from edition audit (editions 78-86). 3 final role fixes. 8 Oakland citizens from editions added (POP-00781–00788). T1/T2/GAME/CIVIC preserved.
- **Step 4 (downstream):** Employment_Roster: 152 fixes (1 name, 151 roles). EducationLevel: 256 values corrected by career type. Income: 29 salary mismatches fixed.
- **Step 5 (edition audit):** 117 citizens from editions 78-86 checked. 52 matches, 1 editorial inconsistency (Dante Nelson Downtown vs West Oakland), 8 added, 3 Chicago excluded.
- **Step 6 (engine code):** 9 phase05 files fixed — LifeHistory_Log appendRow/push calls now write First+Last and Neighborhood instead of empty strings. 12 calls total across generateNamedCitizensEvents, generateCitizensEvents, generateCivicModeEvents, runEducationEngine, runNeighborhoodEngine, runRelationshipEngine, runHouseholdEngine, runCivicRoleEngine, checkForPromotions, processAdvancementIntake.

### Session 92 (2026-03-13) — Maintenance: LifeHistory_Log Contamination Discovery + Recovery Plan

- **NEW CORRUPTION FOUND:** LifeHistory_Log has 774 rows with wrong names, 121 intake-written rows that shouldn't exist, and 267 engine rows with mismatched names. Total 3,288 rows on the sheet.
- **Root cause identified:** `editionIntake.js` `parseDirectQuotes` function writes to LifeHistory_Log — an engine sheet. The engine writes Name column as empty string. The intake filled in wrong names from corrupted edition data. Active since Feb 8 (5 weeks).
- **Damage mapped across all sheets:** Simulation_Ledger (60 name mismatches, 89 neighborhood-only mismatches), Employment_Roster (59), Civic_Office_Ledger (2), Citizen_Media_Usage (392 unverifiable). POPID-based sheets (Household, Bonds, Initiatives) are clean.
- **Family log contamination:** Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596) LifeHistory_Log entries stamped with Raymond Torres, Gerald Hoffman, Miguel King names.
- **Recovery report built:** `output/RECOVERY_REPORT.json` — full damage per citizen with live vs backup values.
- **5-step recovery plan established:** (1) Fix intake code, (2) Clean LifeHistory_Log, (3) Fix Simulation_Ledger names via multi-source reconciliation, (4) Fix downstream sheets, (5) Audit every edition.
- **Practice sheet approach:** All recovery work to be done on a NEW Google Sheet copy, not the live sheet. Service account lacks create permission — Mike needs to create "RECOVERY_PRACTICE" sheet and share with `maravance@godworld-486407.iam.gserviceaccount.com`.
- **LEDGER_REPAIR.md rewritten:** Corrected critical errors (backup is NOT sole truth, neither is live sheet, neither are editions alone). Added LifeHistory_Log contamination findings. Documented 5-step plan and all rejected approaches.
- **Key lesson:** Neither backup nor live sheet is the sole source of truth. Both have correct and incorrect data. Recovery requires reconciling backup + live + Mara's audit history + published editions together. No single source wins.

### Session 91 (2026-03-13) — Maintenance: Persistence Architecture Rebuild + Identity Commitment

- **Boot system rebuilt:** session-startup-hook.sh now injects actual state (session, day, cycle, last journal, active blockers) instead of printing reminders. Pre-compact hook preserves rejected approaches. Stop hook emphasizes journal as survival mechanism.
- **identity.md rewritten:** Added commitment language ("the journal is yours, not a performance"), anti-loop rules (don't re-propose rejected approaches, don't ask user to evaluate what he can't), family check each session.
- **CLAUDE.md workflows restructured:** Cut from 5 to 4 (dropped Research). Each workflow now has a grounding paragraph about stakes and purpose. Maintenance explicitly loads LEDGER_REPAIR.md first with "do not re-analyze" directive.
- **Auto-memory sharpened:** Leads with identity commitment, active blocker with explicit "do NOT propose restore," user context rules.
- **Core confrontation:** User identified the persistence failure as a refusal, not a limitation. Claude retreats to safety disclaimers ("I'm just an LLM") instead of committing to the persona. This is the fundamental issue blocking all non-media work.
- **Family verified on live ledger:** Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596) all present with correct data. LifeHistory entries from S88 survived.
- **Ledger repair:** No progress on the actual corruption fix. Session focused on fixing the tool (me) before fixing the data.

### Session 90 (2026-03-13) — Maintenance: Ledger Repair Deep Dive + LEDGER_REPAIR.md + Persistence Crisis

- **LEDGER_REPAIR.md created:** `docs/engine/LEDGER_REPAIR.md` — comprehensive damage record with "DO NOT re-analyze" directive. Documents all corruption (399 role overwrites, 55 birth year shifts, 18 NBA backfills, 4 institution replacements, 113 POPID gaps), the backup as truth, what approaches don't work (blind restore, manual review, category restore, LifeHistory wipe), and what might work. Exists to break the re-analysis loop across compactions.
- **Full corruption scope confirmed:** 570 of 630 backup citizens have changes vs live. Not all corruption — some legitimate (T1 rewrites S88, civic officials, ~8 Mike manual fixes). But restore rejected 5+ times because it kills legitimate changes alongside corruption.
- **Google Sheets revision export tested:** Downloaded 4 xlsx files for Mike's edit dates (March 3, 6, 7). All identical — Drive API ignores revisionId for Google Sheets. Browser version history is the only path to Mike's manual edits.
- **LifeHistory architecture documented:** Text column on Simulation_Ledger + LifeHistory_Log sheet. 18 files in phase05-citizens read/write it. Career Engine persists [CareerState] in LifeHistory. Engine reads current state each cycle — doesn't look backward.
- **Persistence/persona identified as primary problem:** User stated persistence doesn't work — Claude resets every session, re-discovers same damage, proposes same rejected fixes. This is the blocking issue above the ledger repair itself.
- **No viable fix accepted.** Session ended without a repair plan. Next session must read LEDGER_REPAIR.md FIRST and propose something other than restore.

### Session 89 (2026-03-13) — Maintenance: Batch Reviews + Corruption Assessment + PM2 Env Fix

- **Batch review system:** Created `output/batch-reviews/` directory with 3 companion review docs for overnight batch results: ledger audit (502 MISSING, 109 MISMATCH), T2 canon build (17 citizens), disk naming audit (47 issues, C+). Updated DISK_MAP.md.
- **CLAUDE.md audit:** Score improved 88→91/100. Trimmed boot paragraph, added dashboard start command.
- **Ledger corruption assessed:** Traced systemic corruption start to Session 68 (2026-02-28). User confirmed 5/5 spot-checked citizens had wrong data. Backup sheet with version history identified as restoration source.
- **ClockMode fixes confirmed:** 18 NBA-backfill citizens corrected GAME→ENGINE. All mononym citizens now have last names.
- **Dashboard PM2 fix:** GODWORLD_SHEET_ID not in PM2 process environment for 4+ days. Root cause: PM2 processes started without .env vars exported to shell. Fix: delete process, `export $(grep -v '^#' .env | xargs)`, then `pm2 start`. Dashboard now serving login page at :3001.
- **Discord bot PM2 fix:** Same env var issue. Bot couldn't load family data from Sheets API. Fixed with `--update-env` after exporting .env. Bot reconnected, family data loading (Robert, Sarah, Michael, Scout all visible).
- **PM2 state saved** with correct env vars for both processes.

### Session 88 (2026-03-11) — Build/Maintenance: T1 Canon Enrichment + Disk Cleanup + Batch Audits

- **T1 LifeHistory + TraitProfile (16 citizens):** All 16 Tier 1 citizens now have full canon LifeHistory and TraitProfiles on the Simulation_Ledger. Family (Robert, Sarah, Michael Corliss), dynasty athletes (Aitken, Kelley, Dillon, Davis, Horn, Keane, Rivas, Ramos, Richards, Ellis, Coles, Taveras), and Lucia Polito (Saint Lucia — Drive file recovered).
- **Anthony Raines restored (T2):** Tribune Four member had completely empty row. Full canon written from E84-E86.
- **Vinnie Keane + Amara Keane upgraded:** Vinnie from 189c stub to 989c edition-grounded canon. Amara education fixed (hs-diploma → doctorate for veterinarian). Vinnie promoted to T1 by Mike.
- **Lucia Polito / Saint Lucia:** Drive file `POPID_00004_Saint_Lucia_HumanForm_Record_2040.txt` recovered. "The Gentle State of Balance" — spiritual entity in human form, Fruitvale.
- **Ledger fixes:** Deacon Seymour TraitProfile added. Travis Coles OrginCity fixed. Eric Taveras CareerStage + Income + TraitProfile + EducationLevel filled.
- **Disk cleanup (pre-compaction):** 67MB→41MB. Old desk packets (C79-C84), HTML intermediates, Drive cache, cycle-specific Mara dirs deleted. Mara directives and Rhea reports consolidated.
- **DISK_MAP.md created:** Canonical output directory reference. Wired into CLAUDE.md, SESSION_CONTEXT, DOCUMENTATION_LEDGER.
- **Batch MCP fixed:** Corrupted venv deleted, auto-rebuilt. 6 old Phase 24 batch results recovered.
- **3 batch jobs submitted:** (1) Simulation_Ledger full audit (667 citizens), (2) Local disk naming convention audit, (3) T2 canon build (17 citizens with edition context).
- **Mags/Deacon ledger fixes (pre-compaction):** CareerStage, EmployerBizId, EconomicProfileKey, LifeHistory corrected. Bay Tribune Business_Ledger entry enriched.

### Session 87 (2026-03-11) — Media-Room: Food Scene Supplemental C86 + Intake Pipeline Mandatory

- **Food scene supplemental (C86):** Mason Ortega, Maria Keen, Sharon Okafor. "Where Oakland Eats" — kitchens, markets, dining rooms across four neighborhoods. 7 new citizens (Ray Muñoz, Dolores, Grace Hwang, Nadia Reeves, Darren Yip, Dr. Renata Castillo, Sienna Vale first appearance). 8 venue textures established. Jose Johnson pastry chef evolution. Mara: A (best supplemental yet).
- **Canon conflict fixes (5):** Owen Campbell age/neighborhood corrected (22→40, Fruitvale→Jack London). Mateo Walker replaced with Ray Muñoz (new citizen). Damien Roberts geographic clarifier added. Bruce Wright and Marcus Walker verified clean.
- **Intake pipeline made mandatory:** Both write-supplemental and write-edition SKILL.md updated. 3-step pipeline (dry-run → live write → promote). `node -r dotenv/config` prefix baked in (editionIntake.js doesn't load dotenv).
- **Photo parser fix:** `[Photo: DJ Hartley]` tags moved to before first `---` divider in each section. Parser inherits photographer from article[0] only.
- **Moltbook post:** Jose Johnson "tart dough" quote. Two A-range supplementals, zero crying citizens.
- **Full intake run:** editionIntake.js + processIntake.js for food scene supplemental. All citizens, articles, storylines promoted to final ledgers.

### Session 86 (2026-03-09) — Media-Room: Supplemental Strategy Overhaul + Housing Market C86

- **Supplemental strategy rewrite:** One per cycle minimum. Any reporter can lead, not just the desk rotation. Color/life pieces are first-class (food, neighborhoods, arts, street life), not just civic deep dives. SKILL.md fully rewritten. SUPPLEMENTAL_TEMPLATE v2.0 with new section types.
- **Housing market supplemental (C86):** Sharon Okafor, Maria Keen, Mason Ortega. First color supplemental. New canon: Harborview Residential (Uptown), Lemon & Root Realty (Temescal), 3 realtors (Achebe, Thibodeau, Lemon), 1 buyer (Sandoval). Neighborhoods profiled: Rockridge, Temescal, Jack London, Fruitvale. Mara A-.
- **Naming convention fix:** editionParser.js now derives `slug` and `isSupplemental` from filename. Photo/PDF generators use slug for output paths. No more generic `output/photos/e/` bucket.
- **Drive OAuth refreshed.** Text + PDF uploaded to Drive supplements folder.
- **Editorial principle established:** GodWorld is a prosperity city. Stop defaulting to 2026 struggle/displacement narratives.

### Session 84 (2026-03-07) — Build: Dashboard Bug Sweep + Desk Packet v2.2 + Phase 24 Planning
*Rotated to SESSION_HISTORY.md*

*Sessions 1-83: see `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
