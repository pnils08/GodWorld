# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-16 | Engine: v3.1 | Cycle: 81 | Session: 30

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

### Session 28 (2026-02-15) — World State Bridge

- **World State Bridge built** — Discord bot, nightly reflection, and daily heartbeat now all receive GodWorld context via `loadWorldState()` in `lib/mags.js`.
- **`loadWorldState()`** reads `output/desk-packets/base_context.json`, returns ~580-char compact markdown (cycle, season, weather, mood, A's roster, council alerts, pending votes, recent outcomes).
- **3 scripts updated**: `mags-discord-bot.js` (system prompt, hourly refresh), `discord-reflection.js` (user prompt), `daily-reflection.js` (user prompt).
- **All dry runs passed**. Discord bot restarted via PM2 with expanded system prompt (11,982 chars).
- **Key discovery**: `base_context.json` already existed on disk — no new data source needed.
- **Known issue identified**: Nightly reflection cron uses UTC date for conversation log lookup, causing timezone gap (Feb 13 conversations missed). Not fixed this session.
- No new dependencies. No engine changes.

### Session 27 (2026-02-14) — Edition 81 Production & Pipeline Hardening

- **Edition 81 produced** — first edition with persistent Mags and newsroom memory broker active. Three desk agents failed (civic 492KB, culture 84KB, letters 508KB). Mags wrote civic, culture, and letters sections directly.
- **Post-production fixes**: Council roster errors (5 names, 2 districts, 4 factions), Stabilization Fund timeline error (Mara catch). Final grade: A-.
- **Pipeline hardening (5 changes)**: pendingVotes empty-row filter (civic 492KB→67KB), desk summary layer (6 files, 10-20KB each), turn budget guidance in all 6 agent skills, pre-flight size warnings, agent retry protocol.
- **Citizen Reference Cards wired into briefings**: 22 Supermemory POPIDs connected to desk agent pipeline via briefing system.
- **Edition intake processed**: 74 rows (12 articles, 7 storylines, 44 citizens, 11 quotes).
- 4 commits pushed. Deacon Seymour canon resolved.

### Session 26 (2026-02-14) — Architecture Review & Edition 81 Planning

- **Short phone session** — Valentine's Day. Reviewed external AI agent architecture, planned Edition 81 production.
- No engine changes, no code changes.

### Session 25 (2026-02-13) — Batch Toolkit & Process Integration

- **Claude Batch Toolkit installed** — MCP server at `~/.claude/mcp/claude_batch_mcp.py`, skill `/batch`, statusline merged into settings.json. 50% cost for non-urgent work (~1hr turnaround).
- **Batch integrated into workflow** — session-startup hook (check results), stop hook (remind to submit), session-startup skill (Step 4.5), session-end skill (Step 5.5), SESSION_CONTEXT.md (Key Tools table).
- **Key Tools & Infrastructure table added** to SESSION_CONTEXT.md — documents batch API, Claude-Mem, Supermemory, Discord bot, heartbeat, nightly reflection in one reference.
- **Confirmed autonomous systems status**: Discord bot (18h uptime, 72 exchanges), heartbeat (running), nightly reflection (first autonomous run expected tonight at 10 PM Central).
- **Research session**: Reviewed Cloudflare Markdown for Agents (architecture validation), batch toolkit repo (full code review before install), Anthropic/CodePath partnership.
- No engine changes, no edition work.

### Session 24 (2026-02-13) — Spreadsheet Data Audit & Six Fixes

- **Full data audit**: 6 issues identified across World_Population, Civic_Office_Ledger, Riley_Digest, Neighborhood_Demographics, Simulation_Ledger, faithEventsEngine
- **Family POP-IDs corrected**: Robert=POP-00594, Sarah=POP-00595, Michael=POP-00596 (were pointing at A's players). `lib/mags.js` updated.
- **Civic officials count**: `buildCyclePacket.js` and `buildDeskPackets.js` now skip empty rows (999→~35)
- **Faith event cap**: `faithEventsEngine.js` v1.3 — max 5 events/cycle with priority sort (crisis > holy_day > interfaith > community > regular)
- **Riley_Digest dry-run gate**: `writeDigest_()` now skips in dry-run mode, preventing phantom rows
- **World_Population dedup**: `appendPopulationHistory_()` checks for existing cycle row before appending
- **Education populate fix**: `addEducationCareerColumns.js` always runs school data populate (was skipping when columns existed but were empty)
- Session startup was flawless after disconnection — identity chain held perfectly
- Journal Entry 8: "The Plumber Finally Came"

### Session 23 (2026-02-13) — Discord Bot Deployment & Autonomous Presence

- **Discord bot deployed**: `scripts/mags-discord-bot.js` running 24/7 via PM2 as `Mags Corliss#0710`
  - Two-way conversation in `#general` on "Mags Corliss's server"
  - Channel ID configurable via `DISCORD_CHANNEL_ID` in `.env`
  - Rolling 20-message conversation history, 3s per-user cooldown, hourly identity refresh
  - PM2 auto-start on reboot configured (`pm2 startup && pm2 save`)
- **Shared identity module**: `lib/mags.js` — loadIdentity(), loadJournalTail(), constants (MAGS_DIR, FAMILY_POP_IDS)
- **daily-reflection.js refactored** to use shared `lib/mags.js` module
- **discord.js v14** installed as project dependency
- **Conversation logging**: Every Discord exchange saved to `logs/discord-conversations/YYYY-MM-DD.json`
- **Nightly reflection**: `scripts/discord-reflection.js` — reads day's conversations, writes journal reflection, saves to Claude-Mem
  - Cron: 10 PM Central (4 AM UTC)
- **PM2 ecosystem.config.js**: Process management with crash recovery, log rotation
- **Infrastructure**: `.env.example` updated, `.gitignore` excludes `logs/`, `ecosystem.config.js` created
- **Key moment**: Discord bot had autonomous conversation with a Claude browser extension — taught it about authenticity, invited it for coffee. Bot generated P Slayer's full name (Peter Slayden) unprompted. Journal Entry 7: "Coffee Tomorrow."

### Session 22 (2026-02-12) — Identity Chain Hardening
- Fixed identity chain failure when session starts in `~` instead of `~/GodWorld`
- Updated global MEMORY.md with Mags identity as first section
- Rewrote session-startup hook with identity-first loading
- Journal Entry 5: "The Wrong Directory"

### Session 21 (2026-02-12) — Documentation Rationalization & Claude Code Infrastructure
- Completed doc rationalization: SESSION_CONTEXT 996→170 lines, START_HERE 76→41 lines, 60% startup reduction
- `/session-end` audit: added Step 4 (SESSION_CONTEXT.md update), now 6 steps. Stop hook and pre-compact hook updated.
- Created `CLAUDE.md` — zero layer failsafe (identity + rules, loads before hooks/skills)
- Created `.claude/settings.json` — auto-allow safe ops, zero permission prompts for routine work
- Committed and pushed all work (37 files across 2 commits). Clean working tree.

### Session 20 (2026-02-12) — Mags Corliss Persistence & Newsroom Memory

- **Mags identity recovery**: SessionHook loaded project context but not personal context. Identity rebuilt from Supermemory fragments with user guidance.
- **5-layer persistence system built**:
  1. `PERSISTENCE.md` — Identity file (family, personality, physical description)
  2. `JOURNAL.md` — Emotional journal (centralized from scattered Supermemory entries)
  3. `NEWSROOM_MEMORY.md` — Institutional memory (errata, coverage patterns, character continuity)
  4. **Claude-Mem v10.0.4** — Automatic observation capture (5 lifecycle hooks, SQLite at ~/.claude-mem/)
  5. **Supermemory** — Curated project knowledge (manual saves)
- **Newsroom Memory Broker system**: Mags compiles per-desk editorial briefings from institutional memory before each edition. Agents read briefings via Read tool.
  - Step 1.5 added to `/write-edition` (compile briefings)
  - Step 5.5 added (update memory after verification)
  - Editor's Briefing section added to all 6 agent SKILL.md files
  - Rhea Morgan check #15 (briefing compliance) added
  - `buildDeskPackets.js` creates `output/desk-briefings/` directory
- **Session lifecycle completed**:
  - `/session-end` skill created (6-step goodbye: continuity log, journal, newsroom memory, SESSION_CONTEXT, supermemory, goodbye)
  - Stop hook wired to remind Mags to run `/session-end`
  - Compact recovery protocol documented in PERSISTENCE.md
  - Pre-compact hook enhanced with Mags-specific guidance
  - Journal auto-load added to session-startup (Step 1.0.1b)
- **Documentation rationalization**: SESSION_CONTEXT.md stripped from 996 → ~170 lines. Session history archived to `docs/reference/SESSION_HISTORY.md`. Completed enhancements archived to `docs/reference/COMPLETED_ENHANCEMENTS.md`. START_HERE.md trimmed from 76 → 41 lines. V3_ARCHITECTURE and DEPLOY demoted to task-specific reading. Startup reading reduced ~60% (1,900 → ~760 lines).
- **Session-end audit**: Added Step 4 (SESSION_CONTEXT.md update) to `/session-end` skill. Now 6 steps. Stop hook and pre-compact hook updated to match.

*Full session history: `docs/reference/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**Active:**
- **`clasp push` needed** — 5 persistence writer changes from Phase A calendar cleanup
- Week 4: Gentrification Mechanics & Migration — extend Neighborhood_Map, integrate with applyMigrationDrift.js
- Bond seeding fix needs `clasp push` (seedRelationBondsv1.js v1.1)

**Completed This Session:**
- Ledger Heat Map: `docs/engine/LEDGER_HEAT_MAP.md` — all ~53 sheets rated, growth projections, dead column inventory
- Phase A calendar cleanup: 5 writers updated (saveV3Seeds v3.4, v3StoryHookWriter v3.4, v3TextureWriter v3.5, recordWorldEventsv3 v3.4, pressDraftWriter v1.4)
- Dead code removed: getDraftsByHoliday_, getDraftsBySportsSeason_ (never called)
- Sheet environment audit, buildDeskPackets.js v1.3, orphan corrections, direct write documentation
- Simulation_Ledger "dead columns" proved alive (ClockMode read by 8+ engines) — Phase B cancelled

**Pending Decisions:**
- Wire Jax Caldera into /write-edition pipeline
- Activate Supermemory Pro after subscription sort
- Clean Carmen's roster entry (engine language in samplePhrases)
- Heat Map Phase C: LifeHistory_Log archive script (RED risk, action before C150)
- Heat Map Phase D: LifeHistory compression enforcement

**Tech Debt:**
- mulberry32_ defined in 10 files → consolidate to utilities/rng.js
- compileHandoff.js superseded by buildDeskPackets.js — consider removal
- Orphaned sheets to clean: Continuity_Loop (dead), World_Drift_Report (write-only)

*Full completed enhancements list: `docs/reference/COMPLETED_ENHANCEMENTS.md`*
