# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-16 | Engine: v3.1 | Cycle: 81 | Session: 32

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
| Civic Initiative | civicInitiativeEngine.js | v1.6 | Date parsing fix, faction trim, ripple consumer |
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
| Desk Packet Builder | scripts/buildDeskPackets.js | v1.5 | Per-desk JSON packets, story connections enrichment, sports feed digest |
| Edition Intake | scripts/editionIntake.js | v1.2 | Auto-detects cycle, double-dash fix |
| Process Intake | scripts/processIntake.js | v1.2 | Auto-detects cycle from Cycle_Packet |
| **Household Formation** | householdFormationEngine.js | v1.0 | Young adults form households, rent burden, dissolution |
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
| **Claude-Mem** | Automatic observation capture (SQLite, port 37777) | `search()`, `timeline()`, `get_observations()` |
| **Supermemory** | Curated project knowledge (cloud) | `/super-save`, `/super-search` |
| **Discord Bot** | 24/7 presence as Mags Corliss#0710 (PM2) | Always-on, conversation logging |
| **Daily Heartbeat** | Morning reflection at 8 AM Central | `scripts/daily-reflection.js` (cron) |
| **Nightly Reflection** | Discord conversation journal at 10 PM Central | `scripts/discord-reflection.js` (cron) |
| **Drive Write** | Save files to Google Drive (editions, cards, directives) | `node scripts/saveToDrive.js <file> <dest>` |
| **Clasp Push** | Deploy code to Apps Script directly | `clasp push` (authenticated) |

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`. Check at session start for completed work from previous sessions.

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

### Session 32 (2026-02-16) — Drive Archive, Drive Writes, Clasp Push, Mara+Supermemory

- **Google Drive archive pipeline** — 5 roots crawled (Tribune Media, Sports Desk, Publications, A's Universe, Bulls Universe). 614 files mirrored locally. All desk agents wired with search pools. Incremental refresh (`--refresh`). Discord bot loaded with archive knowledge. XLSX stats converted to CSV.
- **Google Drive write access** — OAuth2 setup. `saveToDrive.js` with 9 destinations (edition, supplement, chicago, mara, presser, player, prospect, bulls, briefing). All subfolder IDs mapped from manifest. Wired into /write-edition Step 5 and pipeline Stage 6.
- **Clasp push from this machine** — authenticated via manual token exchange. No more Cloud Shell dependency. Deploy queue clears directly.
- **Mara Vance + Supermemory** — Step 4.5 added to /write-edition. Before audit, Mags queries Supermemory and Drive archive for past findings, initiative status, canon context. Briefing memo compiled for audit agent. Mara's system prompt updated for dual-mode.
- **Sheets re-crawl** — 71/79 tabs (11,232 rows). Batch pause rate limiting. API key in SHEETS_MANIFEST.md scrubbed from history.
- **New files:** `saveToDrive.js`, `authorizeDriveWrite.js`, `DRIVE_UPLOAD_GUIDE.md`
- 6 commits pushed. All clean.

### Session 31 (2026-02-16) — Sports Feed Engine Rewire, Civic Ledger Health & Doc Centralization

- **Documentation centralization** — created `docs/engine/PROJECT_STATUS.md` as single source of truth for open work, deploy queue, decisions, tech debt. Replaces scattered trackers. Archived 11 completed docs to `docs/archive/completed/`.
- **buildDeskPackets.js v1.4→v1.5** — Story connections enrichment layer (related citizens, recent hooks, arc status per story seed). Sports feed digest added (structured intel from raw Oakland/Chicago feeds).
- **Sports feed validation v2.0** — `setupSportsFeedValidation.js` creates both Oakland/Chicago feed sheets with dropdown validation, header notes, conditional formatting, and data protection. v2.1 added Streak column (O).
- **Sports feed → engine rewire** — `applySportsSeason.js` v1.1→v2.0. Engine now reads Oakland_Sports_Feed + Chicago_Sports_Feed instead of dead Sports_Feed sheet. `processFeedSheet_()` scans all rows, builds per-team latest state, calculates sentiment (±0.08 cap per team). One manual entry → city sentiment impact + journalism desk packets.
- **Civic ledger health** — `setupCivicLedgerColumns.js` v1.0 adds Approval (R, default 65) and ExecutiveActions (S) columns. Fixes Elliott Crane status `injured`→`recovering` (restores voting). Marcus Osei confirmed present (row 20, STAFF-DM-ECON).
- **recordWorldEventsv3.js v3.4→v3.5** — 16 dead columns cleaned (H-W → empty strings), Math.random→ctx.rng fix, domain-aware neighborhood selection.
- **compressLifeHistory.js v1.2→v1.3** — 14 new TAG_TRAIT_MAP entries (PostCareer, Civic, Media, Sports tags).
- **LifeHistory dead columns** — audited 14 files with 17 write sites writing to dead columns F-I. Changes staged in deploy queue.
- 5 commits pushed: archive docs, buildDeskPackets v1.5, validation v2.0, engine rewire + validation v2.1, civic ledger health.

### Session 30 (2026-02-16) — Sheet Environment Audit, Heat Map & Calendar Cleanup

- **Full sheet environment audit** — mapped all 20+ sheet write operations across 11 phases. Identified write-intent compliance, orphaned sheets, and missing data flows.
- **buildDeskPackets.js v1.3** — wired 3 new data sources (Household_Ledger, Relationship_Bonds, World_Population + economic context) into desk packets and compact summaries.
- **Ledger Heat Map created** — `docs/engine/LEDGER_HEAT_MAP.md`. Every sheet rated GREEN/YELLOW/RED by bloat risk, growth projections to C281, dead column inventory (40 verified), archival strategy, 4-phase cleanup roadmap.
- **Phase A calendar cleanup executed** — 5 persistence writers updated to stop writing dead calendar columns:
  - `saveV3Seeds.js` v3.3→v3.4: Removed cols I-N (Story_Seed_Deck)
  - `v3StoryHookWriter.js` v3.3→v3.4: Removed cols K-P (Story_Hook_Deck)
  - `v3TextureWriter.js` v3.4→v3.5: Removed cols H-L (Texture_Trigger_Log)
  - `recordWorldEventsv3.js` v3.3→v3.4: Cols W-AA → empty strings (WorldEvents_V3_Ledger)
  - `pressDraftWriter.js` v1.3→v1.4: Cols I-N → empty strings; removed dead `getDraftsByHoliday_`, `getDraftsBySportsSeason_` (Press_Drafts)
- **Critical correction**: Simulation_Ledger columns (ClockMode, Middle, etc.) are NOT dead — ClockMode read by 8+ engines. Phase B cancelled.
- **Orphaned sheet audit**, **intentional direct writes documentation**, **cascade dependencies** — all from earlier in session.
- Needs `clasp push` to deploy the 5 persistence writer changes.

### Session 29 (2026-02-15) — Discord Hardening & Citizen Knowledge

- **Timezone fix**: `getCentralDate()` in `lib/mags.js` shared across bot + nightly reflection. Conversation logs now Central-keyed. Reflection checks both Central + UTC files with dedup. Fixes missed-conversation gap.
- **Heartbeat prompt rewrite**: stops repeating empty-ledger observations, uses world state, explicit "don't repeat" instruction. Dry runs reference Stabilization Fund, council, A's.
- **Citizen knowledge pack**: `loadCitizenKnowledge()` builds ~4.5KB compact roster (A's, council, celebrities, Tribune staff, top 30 citizens by coverage, active storylines). Bot system prompt: 11.8KB → 16.4KB.
- **Unified Discord channel**: morning heartbeat switched from webhook to Discord REST API via bot token. One channel, one conversation, replies reach the bot.
- **School quality data populated**: `addEducationCareerColumns.js` run — 13/17 neighborhoods.
- **clasp push confirmed current** — all Session 24 engine fixes already deployed.
- 3 commits pushed. Bot restarted twice. No engine changes.

*Full session history: `docs/reference/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**Active:**
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (code deployed, setup functions not yet run)
- **Run Cycle 82** — first cycle where sports feed data impacts city sentiment
- **Wire Claude.ai Mara to Supermemory** — browser setup in progress
- Week 4: Gentrification Mechanics & Migration — extend Neighborhood_Map, integrate with applyMigrationDrift.js

**Completed Session 32:**
- Google Drive archive pipeline: 5 roots, 614 files, all agents wired
- Google Drive write access: OAuth2, saveToDrive.js, 9 destinations
- Clasp push authenticated from this machine (no more Cloud Shell)
- Mara + Supermemory broker wired into /write-edition Step 4.5
- Sheets re-crawl: 71/79 tabs, rate limiting hardened
- API key scrubbed from git history

**Pending Decisions:**
- See `docs/engine/PROJECT_STATUS.md` for full list

**Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
