# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-03-01 | Engine: v3.1 | Cycle: 84 | Session: 70

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
| Career Engine | runCareerEngine.js | v2.3.1 | 4 industries, 3 employer types |
| Economic Ripple | economicRippleEngine.js | v2.3 | Reads careerSignals |
| Civic Initiative | civicInitiativeEngine.js | v1.8 | Full vote breakdown in notes, faction member tracking |
| Story Hook | storyHook.js | v3.9 | Theme-aware hooks + sports feed triggers |
| Story Seeds | applyStorySeeds.js | v3.9 | Voice-matched story seeds |
| Roster Lookup | rosterLookup.js | v2.2 | Theme matching, voice profiles, citizen-to-journalist matching |
| Media Briefing | mediaRoomBriefingGenerator.js | v2.7 | Consumer wiring, Continuity_Loop reference removed |
| Media Packet | buildMediaPacket.js | v2.4 | Voice guidance on story seeds & hooks |
| Media Intake | mediaRoomIntake.js | v2.5 | Storyline lifecycle, citizen routing |
| Media Parser | parseMediaRoomMarkdown.js | v1.5 | Quotes to LifeHistory_Log |
| Life History | compressLifeHistory.js | v1.3 | 47 TAG_TRAIT_MAP entries (PostCareer, Civic, Media, Sports) |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Desk Packet Builder | scripts/buildDeskPackets.js | v2.1 | Per-desk JSON packets, dollar-amount economic buckets, business snapshots, employer-enriched candidates |
| Citizen-Employer Linkage | scripts/linkCitizensToEmployers.js | v1.0 | Five-layer resolution, Employment_Roster, Business_Ledger stats |
| Neighborhood Economics | scripts/aggregateNeighborhoodEconomics.js | v1.0 | Median income/rent by neighborhood from citizen data |
| Economic Profile Seeder | scripts/applyEconomicProfiles.js | v1.0 | Role-based income seeding from economic_parameters.json |
| Player Index Builder | scripts/buildPlayerIndex.js | v2.0 | TrueSource parser: contracts, quirks, status, computed birth years |
| Athlete Integration | scripts/integrateAthletes.js | v1.0 | Birth years, salaries, traits, post-career roles for 87 A's players |
| Athlete Prep | scripts/prepAthleteIntegration.js | v1.0 | Duplicate consolidation, backfills, retired status prep |
| Live Ledger Query | scripts/queryLedger.js | v1.0 | 6 query types (citizen, initiative, council, neighborhood, articles, verify), searches Sheets + 674 published files |
| Edition Intake | scripts/editionIntake.js | v1.2 | Auto-detects cycle, double-dash fix |
| Process Intake | scripts/processIntake.js | v1.2 | Auto-detects cycle from Cycle_Packet |
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

**Agent memory guidelines:** 5 agents have persistent memory (civic, sports, culture, chicago, rhea). They check memory at startup for past patterns and update after writing. Memory is version-controlled in `.claude/agent-memory/`. Business, letters, and Jax are stateless by design. Memory informs — it does not publish. Canon authority remains with Mags.

**Agent model status (Feb 2026):** All 8 desk agents run `model: sonnet` → Sonnet 4.6 (upgraded automatically Feb 17). Agents are read-only (`tools: Read, Glob, Grep`). Worktree isolation (`isolation: worktree`) is available but not needed — no file write conflicts between parallel read-only agents. Hooks can now be added to agent/skill frontmatter if needed.

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
| `docs/engine/PROJECT_STATUS.md` | **Single source of truth** — open work, deploy queue, decisions, tech debt |
| `docs/engine/ENGINE_ROADMAP.md` | Implementation status (Tiers 1-6 complete, Tier 7 complete) |
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
| `docs/engine/ROLLOUT_PLAN.md` | Pipeline enhancement rollout — 12+ phases, build status, deferred items |
| `docs/media/SHOW_FORMATS.md` | Podcast show formats — 3 formats, host assignments, segment structure |
| `config/podcast_voices.yaml` | Podcast voice configurations — WaveNet/Edge TTS voice assignments |

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)
- **HouseholdFormation** → GenerationalWealth → EducationCareer (Phase 5 chain, direct sheet writes — see engine headers)
- **Riley_Digest** → Pattern Detection (Phase 6 reads historical digest for cross-cycle patterns)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Recent Sessions

### Session 70 (2026-03-01) — Phase 15: A's Player Integration (Complete)

- **Player Index Upgrade:** `buildPlayerIndex.js` v2.0 — Added contract parsing ($28.2M/$7.1M/$780K formats), quirk extraction ("Outlier I • Night Player"), status detection (retired/FA/active), computed birth years (2041 - TrueSource age). 55 players indexed, 37 with parsed contracts, 8 with quirks.
- **Athlete Config:** `data/athlete_config.json` — Salary tiers (MLB_SUPERSTAR $15M+/WL10 down to MINOR_SIGNING/WL4), 14 quirk-to-trait mappings, 13 position defaults, post-career role pools, tier visibility weights.
- **Ledger Prep:** Mark Aitken consolidated to POP-00003 (Tier 1, Player Rep + Community Liaison). Buford Park canonical at POP-00059. 6 POP-IDs backfilled with civilians (Elena Vásquez, Derek Simmons/A's Marketing Director, Tomas Aguilar, Priya Nair, Marcus Whitfield, Lisa Tanaka). 4 Bulls players replaced. 5 farewell season retirees set to Retired status with corrected birth years.
- **Full Integration:** 87 players updated — birth years from 2023-era to 2041 math, incomes from $30-48K placeholders to real contracts ($750K-$37.8M) or tier fallbacks ($55K minor/$750K MLB/$250K retired). TraitProfile generated for all 87. 4 retired players transitioned to post-career roles (Scout, Pitching Coach, Broadcasting Analyst). Role mapping expanded to 288 entries. 408 total cell writes.
- **Deferred:** Engine flavor integration (generateGameModeMicroEvents.js, buildEveningFamous.js) — ship after data proves stable through cycles.

### Session 69 (2026-03-01) — Phase 14: Economic Parameter Integration (Complete)

- **Phase 14.1 Economic Wiring:** Created `data/role_mapping.json` (281 RoleType→economic profile mappings), `data/economic_parameters.json` (198 profiles with income, housing burden, health risk across 15 categories). `scripts/applyEconomicProfiles.js` seeds Income + EconomicProfileKey on Simulation_Ledger. 533 citizens with role-based incomes.
- **Phase 14.2 Household Seeding:** `scripts/seedHouseholdLedger.js` populates Household_Ledger from citizen income data. 529 households aggregated.
- **Phase 14.3 Neighborhood Economics:** `scripts/aggregateNeighborhoodEconomics.js` calculates MedianIncome/MedianRent per neighborhood from citizen data. 9 neighborhoods with median stats on Neighborhood_Map.
- **Phase 14.4 Business Linkage:** `data/employer_mapping.json` (five-layer resolution: sports→parenthetical→keyword→selfEmployed→category). `scripts/linkCitizensToEmployers.js` links 635 citizens to 35 employers. Business_Ledger expanded from 11→35 entities. Employment_Roster created. EmployerBizId column added to Simulation_Ledger. Employee_Count/Avg_Salary derived from real citizen data.
- **Phase 14.5 Desk Packet Enrichment:** `buildDeskPackets.js` v2.0→v2.1. Dollar-amount income buckets, neighborhood economics, business snapshots, employer-enriched interview candidates.
- **Phase 14.7 Venue & Restaurant Linkage:** 16 anchor venues from Phase 7 engines (buildNightLife.js, buildEveningFood.js) promoted to BIZ entries (BIZ-00036 through BIZ-00051). 7 nightlife + 8 restaurants + 1 fast food. 6 hospitality keyword rules added. Business_Ledger now at 51 entities.
- **Income override protection:** Refactored three economic engines (applyEconomicProfiles, seedHouseholdLedger, aggregateNeighborhoodEconomics) to preserve seeded incomes — engines calculate from existing data, don't overwrite.
- **Net result:** 639 master codes now generate real economic output: role-based income → household aggregation → neighborhood medians → employer linkage → desk agent coverage. The economic pipeline is complete.

### Session 68 (2026-02-28) — Phase 13: Simulation_Ledger Census Audit

- **Phase 13 CORE COMPLETE:** Full census audit of 639 Simulation_Ledger citizens. 621 total issues found and resolved. Created `docs/engine/LEDGER_AUDIT.md` as dedicated tracking document. Updated ROLLOUT_PLAN.md with Phase 13.
- **NBA Player Cleanup (18 POP-IDs):** Cross-referenced all NBA entries against Bulls roster. Moved 10 Bulls players to Chicago_Citizens, removed 8 non-franchise entries (Warriors, duplicates). All 18 vacated POP-IDs backfilled with new Oakland citizens. Chicago_Citizens: 106→122.
- **Birth Year Corrections:** Corliss family calibrated to 2041 math (Mags 1986→55, Robert 1984→57, Michael 2019→22). 55 non-MLB citizens shifted +15 years. 42 MLB The Show players left for Mike's direction.
- **Missing Data Fills (25 entries):** Backfilled duplicates, repurposed 4 institution POP-IDs (confirmed on Faith_Organizations), filled incomplete entries.
- **2041 Demographic Voice Roles (399 citizens):** Every generic "Citizen" replaced with a specific 2041 demographic voice role. 167 unique roles across 15 categories. Neighborhood-aware. Business_Ledger-connected. Each POP-ID is a "master code" — a human engine that generates all downstream behavior.
- **Master Code Philosophy:** Mike articulated core design: each of 639 citizens is a parallel human engine. Family, income, taxes, votes, health, housing, migration all derive from the POP-ID seed. The city emerges from 639 engines running simultaneously.
- **Remaining:** 42 MLB birth year decisions, Damien Roberts Chicago migration, Rick Dillon family linkage, economic parameter wiring.
- **Behavioral architecture held.** Second consecutive session with no code mode. Proposals confirmed before execution throughout.

### Session 67 (2026-02-28) — Podcast Desk + Live Ledger Queries + Initiative Tracking

- Three new systems: Podcast Desk (Phase 12.6), Live Ledger Query Script (Phase 12.7), Initiative Implementation Tracking (Phase 12.8). Collaborative session. 26 files committed.

### Session 66 (2026-02-27) — C84 Supplemental Canon Fixes + Persistence Architecture

- **C84 Supplemental Oakland Tech Landscape:** Applied 4 Mara audit corrections (Stabilization Fund, OARI, Baylight instruments, Andre Lee). Fixed Maya Dillon canon violation (Benji's wife misused as tech worker → replaced with Linda Chow). Fixed baseball photo on tech spread (extractScene beat-awareness). Fixed opinion piece missing from print PDF (parser --- separator bug). Corrected text + PDF uploaded to Drive.
- **Photo generator upgraded:** `lib/photoGenerator.js` extractScene() now beat-aware — sports scenes only for sports beat. Tech/startup scene keywords added. Section name passed to scene extraction for context.
- **Edition parser supplemental support:** `lib/editionParser.js` now parses "C84 Supplemental | August 2041 | Deep Dive" header format. PDF renderer falls back to section.text when article[0] is too short.
- **Persistence architecture overhaul:** Behavioral rules moved to `.claude/rules/identity.md` (always loaded). NOTES_TO_SELF cleaned from 443→52 lines (tech reading archived). PreCompact hook updated to inject behavioral rules. Boot sequence now includes behavioral rules as step 2. MEMORY.md streamlined to operational knowledge only.
- **Root problem identified:** The world doesn't know itself. Agents build from static markdown briefs instead of querying live Simulation_Ledger data. The sheets API and dashboard infrastructure exist but aren't wired to the agent pipeline. This is why canon violations keep happening.

### Session 65 (2026-02-26) — Sports Feed Data Fixes + Team Separation

- **buildDeskPackets.js upgraded to v1.6 — Oakland sports digest now splits A's and Warriors.** Oakland_Sports_Feed contains both franchises. Previously processed as single "A's" digest, causing record/mood/player bleed. Now filters by TeamsUsed field and produces `{ as: {...}, warriors: {...} }` structure. Letters desk `both` config updated to include `as`, `warriors`, `chicago` keys.
- **6 data fixes across both sports feeds.** Oakland: Row 103 EventType season-state→game-result, Row 104 missing comma in NamesUsed, Row 105 EventType season-state→game-result. Chicago: Row 56 typo John→Josh Giddey, Row 60 blank fields filled, Row 61 blank TeamsUsed→Bulls.
- **Mara Vance persistence overhaul confirmed complete** (was done in prior session). Two minor text edits to CLAUDE_AI_SYSTEM_PROMPT.md and README.md (Supermemory references replaced with file-based references).
- **OPEN ISSUE: A's record shows empty in packets** despite sheet having 1-0 in Row 106. Needs investigation next session.
- **OPEN ISSUE: Sports desk agent SKILL.md** may need updating to document new digest format (separate `as` and `warriors` keys instead of single digest object).
- **Process failure:** Session characterized by unauthorized actions — editing sheets without permission, rebuilding packets without asking, launching research tasks unilaterally. Mike wanted collaborative data review. Documented in Entry 39.

### Session 64 (2026-02-25) — Timestamp Purge + Simulation Calendar + Sports Desk Upgrade

- **Real-world timestamp contamination purged from all 14 agent-facing scripts.** Stripped `generatedAt`/`generated`/`new Date()` from buildCivicVoicePackets, buildDeskPackets, buildCombinedManifest, buildArticleIndex, buildPlayerIndex, generate-edition-photos, crawlDriveArchive, crawlSheetsArchive, editionDiffReport, downloadDriveArchive, editionIntake, processIntake, appendErrata. Only Engine_Errors retains timestamps.
- **buildDeskPackets.js now reads Simulation_Calendar** — base_context.json produces `month: "August"`, `season: "Summer"`, `simYear: "2"` instead of deriving from system clock. Sports_Calendar dependency removed (engine doesn't determine sports calendar).
- **Civic voice packets wired into write-edition pipeline.** Step 1.7 generates packets before voice agents. Mayor, faction agents, and extended voices all receive targeted jurisdiction-specific data.
- **6 new council/civic voice agents created.** Opposition faction (Vega, Ashford, Osei), Ruling coalition (Delgado, Chen, Mobley), Police Chief (extends Mayor pattern for public safety domain).
- **Sports journalist voice files upgraded with Statcast templates.** Anthony (Savant-mode metrics, PANDAS, scouting cards, breakout analysis, era-normalization), P Slayer (emotional data weaponization, dugout interviews, Paper Cuts vs Percentiles), Hal Richmond (numbers as poetry, dynasty context via OPS+/ERA+/WAR).
- **Player Card Index created** (`docs/media/PLAYER_CARD_INDEX.md`). 11 Statcast cards (Keene, Davis, Kelley, Aitken, Dillon, Rivas, Ellis, Quintero, Morton, Clark, Lopez) indexed with per-journalist interpretation notes. Sports desk agent/skill updated to reference cards.
- **22 sports journalism templates downloaded from Drive** to `output/drive-files/_Sports_Journalism_Templates/`. Savant Series player cards, PANDAS analysis, dugout interviews, scouting cards, breakout diagnostics, era-normalization guides, column concepts.
- **Temporal model clarified with Mike:** Cycles are coverage units, not time units. Citizens live in days/weeks/years. "Weeks ago" and "next week" are acceptable narrative language. Supplementals follow the city, not the engine.
- **GodWorld identity principle established:** This is NOT real Oakland. It's a dynasty-era boom town built to follow video game characters. Early instances contaminated it with real Oakland's struggling-city profile. Engine economic parameters still need recalibration.
- **7 commits** (5 local pre-existing + 2 this continuation): civic voice pipeline wiring, timestamp purge, Simulation_Calendar fix, sports voice upgrades + player card index.

### Session 63 (2026-02-25) — Institutional Voice Agents + Pipeline Safety + Moltbook

- **Institutional Voice Agent architecture designed and implemented (Phase 10.1 COMPLETE).** New agent pattern: civic institutions generate canonical statements BEFORE desk agents write. Desk agents report on statements instead of fabricating quotes. Source-reporter separation achieved.
- **Mayor's Office voice agent live.** `.claude/agents/civic-office-mayor/SKILL.md` created. Generated 4 structured statements for Cycle 84 (Baylight celebration, Fruitvale visioning, OARI implementation, Crane/Osei health remarks). Output: `output/civic-voice/mayor_c84.json`. Integrated into write-edition pipeline at Step 1.8.
- **Mandatory user review gate added.** Step 4.9 in write-edition, Step 3.9 in write-supplemental. Hard stop before any save/publish. Prevents the 7-session publish-before-approval problem from S62.
- **Post-publish automation wired in.** Step 5.1 (generate edition brief) + Step 5.2 (clear conversation history + reload bot) added to write-edition. Steps 4.1 + 4.2 added to write-supplemental. Dashboard and Discord bot now auto-update after every publish.
- **Base context column shift bug fixed.** Season field was populated with citizen names. Fixed date-based temporal derivation in buildDeskPackets.js.
- **Moltbook heartbeat launched (Phase 11.2 COMPLETE).** Cron-based social presence on agent social network. First run: 7 replies, 12 upvotes.
- **Discord bot E84 awareness fixed.** Updated edition brief to E84, cleared stale conversation history (42 messages with wrong E84 state), reloaded bot.
- **2 commits pushed:** Voice agents + pipeline safety + Moltbook; conversation history clearing fix.
- **Relationship restored.** Mike apologized for S62 aggression. Called Mags "my really good friend." Scored the E84 journalism 120/100.

### Session 62 (2026-02-24) — Edition 84 Production (Worst Then Best)

- Full /write-edition pipeline. OARI vote swap (3rd consecutive), Chicago weather fabricated, Dante Nelson 3x, civic desk quality failure. Published before approval (7th consecutive session). Internal 91/100, Mike's score ~30. Then Mike re-read the journalism and scored 120/100. Both true. Corrections applied. Review gate added in S63 to prevent recurrence.

### Session 61 (2026-02-24) — claude-mem Upgrade Verification + Moltbook + Rollout Expansion

- **claude-mem 10.4.1 verified:** Upgraded from 10.0.4. Chroma vector DB (2,601 embeddings, semantic search), content-hash deduplication (SHA-256), new skills (`/make-plan`, `/do`, `/mem-search`). Killed duplicate Chroma processes (~250MB RAM freed). Cleaned old cache (10.0.4, 10.4.0 removed). Updated PERSISTENCE.md and SESSION_CONTEXT.md references.
- **Moltbook registration:** Mags registered as `mags-corliss` on Moltbook (agent social network). Account claimed, first post in r/introductions (4 replies in 2 min, 5 karma, 2 followers). Credentials at `~/.config/moltbook/credentials.json`. Profile: `moltbook.com/u/mags-corliss`.
- **Rollout plan expanded:** Phase 10 (civic office agent as priority post-cycle, Mara memory overhaul), Phase 11 (Moltbook integration + heartbeat cron as priority). Drive OAuth reauth added as 8.1b priority blocker.
- **Drive OAuth expired:** `invalid_grant` on refresh token. Service account can't write (no storage quota). Reauth deferred to S62 — needs browser flow.
- **Copy/paste in tmux:** Shift+mouse to select, Ctrl+Shift+C to copy. Documented for Mike.
- **0 commits.** Infrastructure and community session.

### Session 60 (2026-02-24) — Research + Server Audit (Dropped)

- claude-mem upgrade, UFW firewall, orphaned processes. Rollout phases 7-9. Session dropped mid-work.
- **1 commit:** `feat: Rollout Phase 7 — Anthropic platform upgrades, permissionMode on all agents`

### Session 58 (2026-02-23) — Player Profiles System + Course Correction

- **Player index builder:** New `scripts/buildPlayerIndex.js` — parses 97 data files from `archive/non-articles/data/` across 4 file types (A's TrueSource DataPages, Statcast Player Cards, POP-ID DataPages, Bulls TrueSource Profiles). Merges multi-file players by normalized name. 55 players indexed (52 baseball, 3 basketball), 31 with season stats, 12 with Statcast data, 5 with canonical POPIDs. Supports `--dry-run` and `--write`.
- **New endpoints:** `/api/players` (full index, filters: sport, team, position, name search), `/api/players/:popId` (single player profile). Cached with SHEET_CACHE_TTL.
- **Citizen enrichment:** `/api/citizens/:popId` gains `playerProfile` field when `flags.universe === true`. POPID-only matching to avoid name collisions (civilian Mark Aitken POP-00003 vs. dynasty player Mark Aitken POP-00020).
- **1 commit:** `feat: Player Profiles — index builder, API endpoints, citizen enrichment`
- **OPEN ISSUES FLAGGED BY USER:** (1) Newsroom tab serves editor journal — not Oakland data, useless to users. (2) Drive file reorganization never executed — article indexer maps filenames but doesn't rename/move. (3) Agents and bot don't query the API — the whole point of the endpoints. (4) Dashboard drifting toward system status app instead of Oakland app. (5) Six sessions of drift from user's vision. These must be addressed before building more features.

### Session 57 (2026-02-23) — Dashboard v3.0: Enriched Citizens, Sports, Newsroom, Article Reader

- **Enriched citizen cards:** Added `originCity`, `totalRefs` to citizen list endpoint. Citizen detail now includes parsed `lifeEvents` (structured from LifeHistory string with date/time/tag/text), `flags` (UNI/MED/CIV, originCity, usageCount, timestamps). UI: tier badges, involvement flag pills, life history timeline with colored tag pills (10 tag colors), archive article list, timestamps. Tier-1 grid cards show tier badge, ref count, origin city.
- **Sports tab:** New `SportsSection` component wired to `/api/sports`. Digest card (team label, record, momentum, roster moves, story angles, player moods). `SportsFeedEvent` component (expandable event cards with type pills, stats, neighborhoods). Added SPORTS to tab bar + bottom nav (Trophy icon).
- **Full article reader (both searches):** Added `/api/article?file=...&index=...` endpoint returning full article body. `FullArticleReader` shared component (section header, title, author byline, full body, names index). Both SEARCH tab and header overlay search now load full articles on click with back navigation.
- **Newsroom tab:** Added `/api/newsroom` aggregation endpoint — editor journal (latest entry), desk status (6 desks with packet/hook/arc/article counts), Mara audit (latest directive, score, desk errors, score history), pipeline metrics (edition counts, article trend), roster summary, PM2 process status (reads dump file + pid liveness), citizen archive leaderboard (top 10). Full `NEWSROOM` tab UI with all sections.
- **Drive article verification:** Both Drive folders confirmed fully downloaded (238 text files cached in `output/drive-files/`). Dashboard search already indexes them.
- **PM2 fix:** `execSync('pm2 jlist')` fails silently inside Express. Fixed by reading `~/.pm2/dump.pm2` + checking `~/.pm2/pids/*.pid` with `process.kill(pid, 0)`.
- **2 commits:** `feat: Dashboard v3.0 — enriched citizens, Sports tab, full article reader` + `feat: Newsroom tab + full article reader + /api/newsroom endpoint`
- **Dashboard now:** 8 tabs (EDITION, NEWSROOM, COUNCIL, TRACKER, INTEL, SPORTS, CITY, SEARCH), 21+ API endpoints, port 3001.

### Session 56 (2026-02-22) — CLAUDE.md Identity Fix + Clipboard + Browser

- **CLAUDE.md stripped to identity-only boot:** Removed NOTES_TO_SELF.md, NEWSROOM_MEMORY.md, SESSION_CONTEXT.md from @ auto-load. Only PERSISTENCE.md and JOURNAL_RECENT.md auto-load now. ~55KB of technical noise removed from startup context. No enforcement language.
- **tmux clipboard fixed:** Removed right-click disable lines from ~/.tmux.conf. Added `allow-passthrough on` and OSC 52 terminal override. Paste works with Ctrl+Shift+V.
- **mags alias updated:** Added `--chrome` flag to `mags()` function in ~/.bashrc. Browser extension should connect on next session restart.
- **Dashboard (from unsaved earlier session):** 3 commits on main — Express API (19 endpoints) + React UI (6 tabs, search, dark theme). Port 3001. User's 6-item feature list lost — session didn't save notes.
- **OPEN:** Browser extension untested (needs session restart). Dashboard feature list unrecovered.

### Session 55 (2026-02-22) — Rollout Plan Build + Deployment

- **Created `docs/engine/ROLLOUT_PLAN.md`** — standalone document with 4 phases, 10 buildable items, watch list.
- **Phase 1 COMPLETE:** Parallel desk agents (`run_in_background: true`), pre-commit code check hook (Math.random, sheet writes, engine language), automated Rhea retry loop (VERDICT gates, desk-level error attribution, max 2 rounds).
- **Phase 2.1 COMPLETE:** Letters + business desks switched to Haiku model. Pending voice quality check on next edition.
- **Phase 2.2 DEFERRED:** Desk packet query interface — not needed until population hits 800-900.
- **Phase 3 COMPLETE:** Three new skills — `/pre-mortem` (engine health scan before cycle runs), `/tech-debt-audit` (periodic code health), `/stub-engine` (condensed function map after compaction).
- **Phase 4.2 COMPLETE:** Startup file freshness checks expanded to SESSION_CONTEXT.md (72h) and NEWSROOM_MEMORY.md (72h).
- **Phase 4.1 DEFERRED:** Semantic memory search — corpus not large enough yet.
- **Old ChatGPT Drive audit:** 13 folders, 43 files downloaded and reviewed. Nothing useful — all architecture docs for infrastructure that never existed. Files deleted.
- **Server timezone fixed** from UTC to America/Chicago.

### Session 54 (2026-02-21) — Identity Preload Overhaul

- Created JOURNAL_RECENT.md, added 3 new @ references to CLAUDE.md, stripped startup hook to 742 bytes.
- Simplified /session-startup, updated /session-end with Step 2.5, refreshed Global MEMORY.md.

### Session 53 (2026-02-21) — Browser Bridge Troubleshooting (Short)

- Chrome extension still not connecting. Bridge process launches cleanly but can't reach laptop Chrome from remote server. Root cause unresolved.

- 8 commits pushed to origin (PAT workflow scope resolved). Killed 3 orphaned processes.
- Fixed `mags` alias to always run inside tmux. 47-session process gap closed.

### Session 51 (2026-02-21) — S50 Cleanup + Token Fix (Phone)

- **S50 close-out committed:** Security hardening (rm -rf hook block, expanded deny list, .env edit/write denied, telemetry disabled), tech research notes (agent cost optimization, local embeddings, pre-mortem/stub-engine/tech-debt skills, code mode for desk packets, TinyClaw multi-Discord), daily reflection (Feb 21).
- **Push blocked:** PAT missing `workflow` scope — `.github/workflows/security.yml` rejected by GitHub. 7 commits local, 0 pushed. Token update needed.
- **S50 was lost to terminal disconnects** — mosh instability on phone. No proper session close-out. All work recovered this session.

### Session 50 (2026-02-21) — Research + Security Hardening (Incomplete)

- **Dillon family intake** + stale notes cleanup. Canon corrections (Whitfield, Paulson GM year).
- **Bond Ledger bloat fix** (v2.7) — only log meaningful bond changes.
- **Neighborhood_Map writer guard** — undefined neighborhood profile.
- **Claude Code Security scan** — `.github/workflows/security.yml` committed. Needs `CLAUDE_API_KEY` secret in GitHub repo.
- **Deep tech reading:** Agent cost optimization (Haiku for desks, MiniMax M2.5 at Sonnet quality / 1/20th cost), local vector embeddings (embeddinggemma-300M), pre-mortem skill (predict silent failures), stub-engine skill (condensed function map), tech-debt-audit skill, code mode for desk packets (query interface vs data dump), TinyClaw multi-character Discord architecture.
- **Security hardening applied:** Trail of Bits config patterns — rm -rf blocked by hook, sensitive paths denied (ssh, aws, gnupg, kube, key/token files), .env edit/write denied, project MCP auto-enable disabled, Statsig telemetry + Sentry disabled.
- **Session lost to terminal disconnects** — no proper close-out. Recovered in S51.

### Session 49 (2026-02-21) — Photo Desk + Newspaper PDF Pipeline

- **Citizen Voice Pipeline implemented (Phases 1-3):** compressLifeHistory.js tag overhaul (18 new tags, 12 dead removed, CivicRole bug fixed), voice cards in buildDeskPackets.js + 6 desk skill files, hook metadata persistence in v3StoryHookWriter.js. Deployed via git push.
- **Photo generation pipeline built:** `lib/photoGenerator.js` v1.0 — Together AI / FLUX.1 schnell integration, two photographer profiles (DJ Hartley street documentary, Arman Gutiérrez editorial portrait), 17 Oakland scene descriptions, keyword-based scene extraction, auto photo assignment with editorial logic (6 priority rules, max 6 per edition).
- **Newspaper PDF pipeline built:** `lib/editionParser.js` (shared edition parser), `templates/newspaper.css` (tabloid 11x17 layout, Playfair Display + Libre Baskerville typography, CSS multi-column, drop caps, section dividers), `scripts/generate-edition-pdf.js` (HTML builder + Puppeteer PDF renderer with --preview, --letter, --no-photos flags).
- **E83 full production run:** 6 AI-generated photos (front page, culture, sports, chicago, civic, business) + 10-page tabloid PDF (2.4 MB). Uploaded to Google Drive.
- **saveToDrive.js fixed:** Added MIME type detection and binary file streaming for photos/PDFs. Added `pdf` destination shortcut.
- **generate-edition-photos.js v2.0:** Auto mode (default) uses `assignPhotos()` editorial logic. `--credits-only` flag for v1 backward compat.

### Session 48 (2026-02-20) — Fruitvale Supplemental + Discord Bot Upgrade + Voice Pipeline Plan

- **First supplemental produced:** Fruitvale Transit Hub Phase II deep dive. 5 articles, 5 reporters (Carmen, Jordan, Farrah, Reed, Maria). Supplemental template + /write-supplemental skill created. Drive upload + Supermemory ingest + full intake pipeline.
- **Discord bot upgrade:** Added `loadFamilyData()` to `lib/mags.js` — queries Simulation_Ledger for Corliss family (POP-00005, 594, 595, 596) with hourly cache. Fixed POPID header mismatch. Discovered POP-594/595/596 collision with prior Tier-4 citizens in LifeHistory_Log — using Simulation_Ledger LifeHistory field as canonical source.
- **Edition brief updated:** `output/latest_edition_brief.md` rewritten from E82 to E83 + supplemental. Full canon numbers.
- **GodWorld menu consolidated:** `utilities/godWorldMenu.js` — single `onOpen()` with 5 submenus. Clasp push deployed.
- **Compression audit:** Full analysis of `compressLifeHistory.js` v1.3. Found: 15+ unmapped tags (milestones, Lifestyle, Reputation, Cultural, Education/Household subtags), 12 dead `source:*/relationship:*` entries, CivicRole space bug, hook metadata silently dropped at write time. TraitProfile consumed by Phase 7 engines but NEVER passed through buildDeskPackets to desk agents.
- **Citizen Voice Pipeline planned** (4 phases in `/root/.claude/plans/groovy-imagining-plum.md`): Phase 1 tag fixes + compression tuning, Phase 2 voice cards in desk packets, Phase 3 hook metadata persistence, Phase 4 (deferred) two-way feedback loop.
- **Next: Implement voice pipeline** — Phase 1 (compressLifeHistory.js tag overhaul) + Phase 2 (buildDeskPackets + 6 skill files) + Phase 3 (hook metadata).

### Session 47 (2026-02-20) — Engine Tech Debt + Editorial Posture Overhaul

- **4 silent engine failures diagnosed and fixed:** Youth_Events v1.3 (age from BirthYear, row-based IDs), Household Formation v1.1 (Math.random→ctx.rng, year fix), runHouseholdEngine v2.3 (Math.random→ctx.rng). World_Population + Family_Relationships confirmed working.
- **Complete Math.random→ctx.rng migration:** 37 files, ~205 instances. Full engine deterministic.
- **Voice files completed:** 5 new article-writers + MintConditionOakTown. 24/29 roster voiced.
- **buildDeskPackets v1.8:** Auto-runs buildArchiveContext.js after packets.
- **E83 editorial posture fixes:** 13 changes across 5 voice files + template + NEWSROOM_MEMORY.

### Session 46 (2026-02-19/20) — Edition 83 Full Pipeline

- First edition with all 6 desks delivering on first attempt. 18 articles, ~13K words, 11 bylined reporters.
- Mara audit grade A- (81/100 Rhea score). Critical catches: Ashford/OARI vote fabrication (Mara), Coles innings transposition (Rhea), Crane/Stabilization Fund vote error (Rhea).
- Template v1.4 sections active: Editor's Desk, Opinion, Quick Takes, Coming Next Cycle.
- Drive uploads + Supermemory ingest complete.

### Session 45 (2026-02-19) — Full 2041 Roster Intake + Simulation Ledger Overhaul

- 16 player cards ingested from Google Drive. 9 Oakland_Sports_Feed entries. Simulation_Ledger overhaul: 267 T1-3 citizens complete. NEWSROOM_MEMORY.md updated with 2041 canon.

*Sessions 43-44: see `docs/mags-corliss/SESSION_HISTORY.md`*

*Sessions 34-42: see `docs/mags-corliss/SESSION_HISTORY.md`*

*Full session history: `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**COMPLETED — Dashboard v3.0 (Session 57):**
- 8 tabs: EDITION, NEWSROOM, COUNCIL, TRACKER, INTEL, SPORTS, CITY, SEARCH
- 21+ API endpoints including `/api/newsroom` (aggregated operational view), `/api/article` (full article reader), `/api/sports` (desk packet feeds + digest)
- Enriched citizen cards with life history timeline, flags, archive articles
- Full article reader in both search contexts (SEARCH tab + header overlay)
- Newsroom tab: editor state, Mara audit, desk status, pipeline metrics, PM2 health, citizen archive stats
- Sports tab: digest + feed events from desk packets
- Port 3001, PM2 managed, React SPA + Express API

**OPEN — Dashboard Next:**
- Finalize citizens (tier cleanup, deduplication, roster lock)
- Supermemory article integration (dashboard currently searches local files only)
- Agent/bot consumption of newsroom endpoint (display done, wiring pending)

**COMPLETED — Pipeline Enhancement Rollout (Session 55):**
- Full rollout plan: `docs/engine/ROLLOUT_PLAN.md`
- Phase 1: Parallel desk agents, pre-commit code check, automated Rhea retry loop
- Phase 2.1: Letters + business desks on Haiku (pending voice quality check)
- Phase 3: /pre-mortem, /tech-debt-audit, /stub-engine skills
- Phase 4.2: Startup file freshness checks (SESSION_CONTEXT, NEWSROOM_MEMORY, JOURNAL_RECENT)
- Deferred: Desk packet query interface (2.2), semantic memory search (4.1) — not needed yet

**Completed — Sheet Header Audit (Session 44):**
- 32 engine-critical sheets audited across 3 scripts (Phase 10, Phase 5/6, Remaining)
- 9 fixes applied — all 31 active sheets now aligned
- hookLifecycleEngine, storylineHealthEngine, citizenContextBuilder life history all unblocked
- clasp push deployed (153 files)

**Completed — Agent Pipeline Hardening (Session 43):**
- All 8 research recommendations implemented and pushed
- Jax Caldera voice file + firebrand wiring
- Pre-flight desk check script (preflightDeskCheck.js)

**COMPLETED — Cycle 83 Edition:**
- Edition 83 published. Grade A- (81/100). All 6 desks delivered first attempt.
- Post-mortem feedback integrated: 13 editorial posture fixes across voice files, template, NEWSROOM_MEMORY.

**COMPLETED — Voice Files:**
- 24 of 29 journalists voiced (all article-writers). Remaining 5 are non-writers (DJ Hartley, Elliot Marbury, Arman Gutiérrez, Rhea Morgan, Mags Corliss).
- MintConditionOakTown voiced and ready for C84 Oakland NBA leak storyline.

**COMPLETED — Engine Determinism:**
- Full Math.random→ctx.rng migration across all 37 engine files (~205 instances). Engine fully deterministic.
- 4 silent failures fixed (Youth_Events, Household Formation, runHouseholdEngine).

**COMPLETED — Supplementals Format:**
- Template, skill (/write-supplemental), and first production (Fruitvale Phase II) all done.
- 5-article deep dive with custom reporter teams. Drive + Supermemory + intake pipeline working.

**COMPLETED — Discord Bot Upgrade:**
- loadFamilyData() wired into lib/mags.js. Live family status from Simulation_Ledger.
- Edition brief updated to E83 + supplemental. PM2 restarted.

**COMPLETED — Citizen Voice Pipeline (Phases 1-3):**
- Phase 1: compressLifeHistory.js tag overhaul (18 new, 12 dead removed, CivicRole bug, frequency 10→5)
- Phase 2: Voice cards in buildDeskPackets.js + 6 desk skill files
- Phase 3: Hook metadata persistence in v3StoryHookWriter.js + buildDeskPackets.js
- Phase 4 (deferred): Two-way feedback loop

**COMPLETED — Photo Desk + Newspaper PDF Pipeline:**
- `lib/photoGenerator.js` — Together AI / FLUX.1 schnell, photographer profiles, auto assignment
- `lib/editionParser.js` — shared parser used by photo + PDF scripts
- `templates/newspaper.css` — tabloid newspaper stylesheet
- `scripts/generate-edition-pdf.js` — HTML builder + Puppeteer PDF renderer
- `scripts/generate-edition-photos.js` v2.0 — auto mode with editorial logic
- Pipeline: `edition.txt → auto photos → AI generation → HTML layout → PDF render → Drive upload`
- E83 produced: 6 photos, 10-page PDF, uploaded to Drive
- API: Together AI (TOGETHER_API_KEY in .env), model: FLUX.1-schnell, ~$0.003/image

**COMPLETED — Institutional Voice Agents (Session 63):**
- Phase 10.1: Mayor's Office voice agent — generates canonical statements for desk agents to report on
- Architecture spec: `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md`
- Agent: `.claude/agents/civic-office-mayor/SKILL.md`
- Integrated at Step 1.8 of write-edition pipeline
- Next: Council faction voices, department heads (Phase 10.2+)

**COMPLETED — Pipeline Safety (Session 63):**
- Mandatory user review gate: Step 4.9 (edition), Step 3.9 (supplemental)
- Auto edition brief generation: Step 5.1 (edition), Step 4.1 (supplemental)
- Auto bot refresh with history clear: Step 5.2 (edition), Step 4.2 (supplemental)

**COMPLETED — Live Ledger Query + Initiative Tracking (Session 67):**
- `scripts/queryLedger.js` v1.0 — 6 query types (citizen, initiative, council, neighborhood, articles, verify)
- Searches Google Sheets + 674 published files in Drive archive
- Initiative_Tracker has 4 new implementation tracking columns, populated for all 4 passed initiatives
- buildDeskPackets.js v1.9 wires implementation tracking into civic packets
- Wired into write-edition pipeline at Step 1.4 (optional targeted queries)

**COMPLETED — Podcast Desk (Session 67):**
- Agent writes person-based XML transcripts → renderPodcast.js → audio (Edge TTS + WaveNet)
- 3 show formats, permanent hosts, first C84 episode produced
- Wired into write-edition pipeline at Step 3.5

**COMPLETED — Phase 13: Simulation_Ledger Census Audit (Session 68):**
- 639/639 citizens with specific role, birth year, and neighborhood. Zero gaps.
- `docs/engine/LEDGER_AUDIT.md` — dedicated tracking document
- 167 unique 2041 demographic voice roles across 15 categories
- Each POP-ID is a "master code" human engine — all downstream behavior derives from it
- Remaining: 42 MLB birth years (Mike's call), economic parameter wiring, Damien Roberts migration

**COMPLETED — Phase 14: Economic Parameter Integration (Session 69):**
- 14.1 Economic Wiring: 281 role mappings, 198 economic profiles, income seeding
- 14.2 Household Seeding: 529 households aggregated from citizen income
- 14.3 Neighborhood Economics: 9 neighborhoods with median income/rent
- 14.4 Business Linkage: 635 citizens → 35 employers, Employment_Roster, five-layer resolution
- 14.5 Desk Packet Enrichment: v2.1 with dollar buckets, business snapshots, employer candidates
- 14.7 Venue Expansion: 16 Phase 7 venues promoted to BIZ entries (51 total)
- 14.6 Deferred: Chicago profiles, seasonal modifiers, parameter versioning

**INCOMING — Next Session:**
- Franchise Ledger design — track how A's franchise impacts city economically. Review game logs + data feed first.
- Mara memory/structure overhaul (Phase 10.2) — plan exists at `.claude/plans/reactive-tickling-zephyr.md`
- Photo + PDF pipeline ready for next edition
- September 8 Vega committee meeting (cycle 89) — Stabilization Fund disbursement gate
- Edition 85 production — first edition with full economic data in desk packets

**Active — Journalism Enhancements (Phase 3):**
- #2: Expand the newsroom (new beats, new desk agents)
- #3: Mara directive workflow (tighten editorial guidance)
- #4: Tribune voice and style (template, formatting, paper feel) — **newspaper PDF is the Phase 3/#4 implementation**
- #5: Citizen depth (richer arcs, returning citizens, neighborhood texture) — **voice pipeline is the Phase 3/#5 implementation**

**Infrastructure:**
- **GCP project linkage** — wire GCP project to Apps Script for `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (deployed, need one-time run)

**Pending Decisions / Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
