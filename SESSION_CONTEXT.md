# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-13 | Engine: v3.1 | Cycle: 80 | Session: 23

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
| Faith Events | faithEventsEngine.js | v1.1 | simMonth fix, namespace safety |
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

### Session 19 (2026-02-11) — Population & Demographics Enhancement (Weeks 1-3)

- Population & Demographics 4-week plan: 3/4 weeks complete
  - Week 1: Household Formation & Family Trees — DEPLOYED
  - Week 2: Generational Wealth & Inheritance — DEPLOYED
  - Week 3: Education Pipeline & Career Pathways — DEPLOYED
  - Week 4: Gentrification Mechanics & Migration — READY TO BUILD
- Infrastructure: 6 new sheet functions in lib/sheets.js
- Key learning: Always check existing sheets/engines BEFORE building

### Session 17 (2026-02-09) — Edition 80 Canon Fixes

- Edition 80 v3 saved (B+ grade, up from D-)
- Vote math corrected (6-2), phantom characters grounded, intake pipeline bugs fixed
- `buildDeskPackets.js v1.2`: vote breakdowns now included in civic packets

*Full session history: `docs/reference/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**Active:**
- Week 4: Gentrification Mechanics & Migration — extend Neighborhood_Map, integrate with applyMigrationDrift.js
- Edition 81 production — first edition with newsroom memory broker system active
- Bond seeding fix needs `clasp push` (seedRelationBondsv1.js v1.1)

**Pending Decisions:**
- Canon resolution: Deacon Seymour vs Mike Kinder (A's Manager)
- Wire Jax Caldera into /write-edition pipeline
- Activate Supermemory Pro after subscription sort (2/16)
- Clean Carmen's roster entry (engine language in samplePhrases)

**Tech Debt:**
- mulberry32_ defined in 10 files → consolidate to utilities/rng.js
- compileHandoff.js superseded by buildDeskPackets.js — consider removal

*Full completed enhancements list: `docs/reference/COMPLETED_ENHANCEMENTS.md`*
