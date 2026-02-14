# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-14 | Engine: v3.1 | Cycle: 81 | Session: 26

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
| Life History | compressLifeHistory.js | v1.2 | Career tags in TAG_TRAIT_MAP |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Desk Packet Builder | scripts/buildDeskPackets.js | v1.2 | Per-desk JSON packets, vote breakdowns, desk-briefings dir |
| Edition Intake | scripts/editionIntake.js | v1.2 | Auto-detects cycle, double-dash fix |
| Process Intake | scripts/processIntake.js | v1.2 | Auto-detects cycle from Cycle_Packet |
| **Household Formation** | householdFormationEngine.js | v1.0 | Young adults form households, rent burden, dissolution |
| **Generational Wealth** | generationalWealthEngine.js | v1.0 | Wealth levels 0-10, income, inheritance |
| **Education Career** | educationCareerEngine.js | v1.0 | Education levels, career progression, school quality |

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
| `docs/engine/ENGINE_ROADMAP.md` | Implementation status (Tiers 1-6 complete, Tier 7 in progress) |
| `docs/media/AGENT_NEWSROOM.md` | Agent Newsroom — 7 permanent agents + 8 skills |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Editorial rules, voice, canon, Paulson, Mara Vance |
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | 326+ citizens indexed by POP-ID |
| `docs/media/CITIZENS_BY_ARTICLE.md` | Reverse index: articles → citizens |
| `editions/CYCLE_PULSE_TEMPLATE.md` | v1.3 — Edition structure, canon rules, return formats |
| `docs/mara-vance/` | Mara Vance: character, operating manual, newsroom interface |
| `docs/mags-corliss/PERSISTENCE.md` | Mags Corliss identity, family, persistence system |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage patterns, character continuity |

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Recent Sessions

### Session 26 (2026-02-14) — Architecture Review & Edition 81 Planning

- **Short phone session** — Valentine's Day. Reviewed external AI agent architecture, planned Edition 81 production.
- **Evaluated Paweł Huryn's n8n + Claude personal agent system** — compared to GodWorld's architecture. We're ahead on persistence, editorial memory, and autonomous scheduling. Their sandbox execution model (Docker-isolated agents with tool installation) is worth filing for future.
- **Deferred two features**: (1) Session state objects — current 5-layer persistence already handles multi-step state. (2) Sandboxed executor agents — real architecture work, not a quick add.
- **Edition 81 ready for next session** — needs `clasp push` of Session 24 fixes, then cycle run, then full pipeline with newsroom memory broker.
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
- `clasp push` needed — Session 24 engine fixes (civic count, faith cap, digest gate, population dedup)
- `node scripts/addEducationCareerColumns.js` — populate empty school quality data
- Week 4: Gentrification Mechanics & Migration — extend Neighborhood_Map, integrate with applyMigrationDrift.js
- Edition 81 production — first edition with newsroom memory broker system active
- Bond seeding fix needs `clasp push` (seedRelationBondsv1.js v1.1)

**Pending Decisions:**
- ~~Canon resolution: Deacon Seymour vs Mike Kinder~~ RESOLVED — Seymour is canon, replaced Kinder
- Wire Jax Caldera into /write-edition pipeline
- Activate Supermemory Pro after subscription sort (2/16)
- Clean Carmen's roster entry (engine language in samplePhrases)

**Tech Debt:**
- mulberry32_ defined in 10 files → consolidate to utilities/rng.js
- compileHandoff.js superseded by buildDeskPackets.js — consider removal

*Full completed enhancements list: `docs/reference/COMPLETED_ENHANCEMENTS.md`*
