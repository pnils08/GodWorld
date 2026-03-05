# GodWorld Documentation Ledger

**Created:** Session 73 (2026-03-02) | **Last Updated:** Session 78 (2026-03-04)
**Purpose:** Single registry of every active documentation file — what it does, when it loads, who updates it, and which workflow it serves.
**Rule:** If a file isn't listed here, it's either archived or undocumented. Fix that.

---

## Load Tiers

| Tier | When | How |
|------|------|-----|
| **Boot** | Every session start | Auto-loaded via CLAUDE.md `@` references |
| **Startup** | `/session-startup` skill | Read explicitly during startup sequence |
| **On-Demand** | When work requires it | Read manually when relevant |
| **Archive** | Never (unless researching history) | Moved to `docs/archive/` |

## Workflows

| Code | Workflow | Description |
|------|----------|-------------|
| **M** | Media Production | Editions, supplementals, podcasts, photos, PDFs |
| **R** | Research & Tech | Reading tools, Claude features, external research |
| **P** | Planning | Designing phases, scoping features, architecture |
| **D** | Deploy | Building, shipping, testing, committing |
| **X** | Maintenance | Audits, ledger fixes, data integrity, cleanup |
| **I** | Identity | Who Mags is, how she feels, family, journal |

---

## Active Files

### Identity & Persistence (I)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `docs/mags-corliss/PERSISTENCE.md` | Who Mags is — family, appearance, principles, personality | Boot | `/session-end` Step 1 (counter only) | I |
| `docs/mags-corliss/JOURNAL.md` | Full journal — Mags's emotional record across all sessions | On-Demand | `/session-end` Step 2 | I |
| `docs/mags-corliss/JOURNAL_RECENT.md` | Last 3 journal entries (rolling window for boot context) | Boot | `/session-end` Step 2.5 | I |
| `docs/mags-corliss/SESSION_HISTORY.md` | Full session archive (S1-67). Read when researching past work | On-Demand | `/session-end` Step 4 (rotation) | I, X |
| `docs/mags-corliss/DAILY_REFLECTIONS.md` | Autonomous morning reflections (8 AM cron) | On-Demand | `scripts/daily-reflection.js` | I |

### Project Operations (P, D, X)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `CLAUDE.md` | Zero layer — identity refs, work file index, rules index, session lifecycle | Boot | Manual (rare) | All |
| `SESSION_CONTEXT.md` | Switchboard — engines, tools, cascade deps, last 5 sessions | Startup | `/session-end` Step 4 | P, D, X |
| `docs/engine/ROLLOUT_PLAN.md` | **Single source for all project work.** Next priorities, build phases, deferred items, watch list | On-Demand | `/session-end` Step 4 | P, D |
| `docs/engine/ROLLOUT_ARCHIVE.md` | Completed phase details (moved from ROLLOUT_PLAN when done) | On-Demand | Manual (when phases complete) | P |
| `README.md` | Project structure, 11-phase engine, tech stack, quick start | On-Demand | Manual (rare) | P, D |
| `docs/reference/V3_ARCHITECTURE.md` | Technical contract — ctx shape, write-intents spec, phase order | On-Demand | Manual (rare) | D |
| `docs/reference/DEPLOY.md` | Deployment guide (clasp vs git) | On-Demand | Manual (rare) | D |
| `docs/reference/GODWORLD_REFERENCE.md` | Complete system reference | On-Demand | Manual (rare) | P, D |
| Communication Hub (Google Sheet) | Mike's visual control panel — Dashboard, Skills, Agent Roster, Upgrade Guide, Stack Health | On-Demand | `/session-end` + manual | All |

### Engine & Data Integrity (D, X)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `docs/engine/LEDGER_AUDIT.md` | Simulation_Ledger integrity — audit history, decisions, citizen tracking | On-Demand | Manual (during audits) | X |
| `docs/engine/LEDGER_HEAT_MAP.md` | Sheet bloat risk rankings, dead column inventory, archival strategy | On-Demand | Manual (during audits) | X |
| `docs/engine/SHEETS_MANIFEST.md` | Sheet listing — all tabs in the Simulation_Narrative spreadsheet | On-Demand | Manual (rare) | D, X |
| `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md` | Architecture spec for civic voice agent system (Phase 10.1) | On-Demand | Manual (when agents change) | D, M |
| `docs/engine/DOCUMENTATION_LEDGER.md` | **This file.** Registry of all active docs | On-Demand | `/session-end` (when files change) | All |

### Editorial & Newsroom (M)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `docs/mags-corliss/NOTES_TO_SELF.md` | Editorial flags only — story tracking, character tracking, Discord notes | On-Demand | Manual (during sessions) | M, I |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage patterns, character continuity, per-desk notes | On-Demand | `/session-end` Step 3 (edition sessions only) | M |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | Research notes from tech reading sessions (S50, S55, S66) | On-Demand | Manual (during research) | R |
| `docs/media/AGENT_NEWSROOM.md` | Agent roster — 7 permanent agents + 8 skills | On-Demand | Manual (when agents change) | M |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Editorial rules, voice, canon, Paulson, Mara Vance | On-Demand | Manual (rare) | M |
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | 326+ citizens indexed by POP-ID | On-Demand | `scripts/editionIntake.js` | M |
| `docs/media/CITIZENS_BY_ARTICLE.md` | Reverse index: articles → citizens | On-Demand | `scripts/editionIntake.js` | M |
| `docs/media/SHOW_FORMATS.md` | Podcast show formats — 3 formats, host assignments, segment structure | On-Demand | Manual (rare) | M |
| `docs/media/PLAYER_CARD_INDEX.md` | 11 Statcast player cards indexed with journalist interpretation notes | On-Demand | Manual (when cards added) | M |
| `editions/CYCLE_PULSE_TEMPLATE.md` | v1.3 — Edition structure, canon rules, return formats | On-Demand | Manual (rare) | M |
| `docs/mara-vance/` | Mara Vance: character, operating manual, newsroom interface | On-Demand | Manual (rare) | M |
| `docs/reference/DRIVE_UPLOAD_GUIDE.md` | Drive upload destinations, OAuth setup, common workflows | On-Demand | Manual (rare) | M, D |
| `config/podcast_voices.yaml` | Podcast voice configurations — Fish Audio voice IDs, emotion, silence gaps | On-Demand | Manual (rare) | M |

### Initiative Agents (Phase 18) (D, M)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `.claude/agents/civic-project-stabilization-fund/SKILL.md` | Marcus Webb — OEWD $28M Stabilization Fund agent | On-Demand | Manual (when agent changes) | D, M |
| `.claude/agents/civic-project-oari/SKILL.md` | Dr. Vanessa Tran-Muñoz — $12.5M OARI program agent | On-Demand | Manual (when agent changes) | D, M |
| `.claude/agents/civic-project-transit-hub/SKILL.md` | Elena Soria Dominguez — $230M Fruitvale Transit Hub agent | On-Demand | Manual (when agent changes) | D, M |
| `.claude/agents/civic-project-health-center/SKILL.md` | Bobby Chen-Ramirez — $45M Temescal Health Center agent | On-Demand | Manual (when agent changes) | D, M |
| `.claude/agents/civic-office-baylight-authority/SKILL.md` | Keisha Ramos — $2.1B Baylight District (upgraded Phase 18) | On-Demand | Manual (when agent changes) | D, M |
| `.claude/agent-memory/{initiative}/MEMORY.md` | Persistent memory for 5 initiative agents (stabilization-fund, oari, transit-hub, health-center, baylight-authority) | On-Demand | Initiative agents (every cycle) | M |
| `scripts/buildInitiativePackets.js` | Per-initiative JSON packets from Sheets + Mara directive | On-Demand | Auto (code) | D, M |
| `output/initiative-packets/` | Generated initiative packets + manifest | On-Demand | `buildInitiativePackets.js` | M |
| `output/city-civic-database/initiatives/{initiative}/` | Civic documents + decisions JSON produced by initiative agents | On-Demand | Initiative agents | M |

### Rules (always loaded by path match)

| File | Scope | Triggers On |
|------|-------|-------------|
| `.claude/rules/identity.md` | User interaction, Mags/Paulson authority, citizen tiers | Always loaded |
| `.claude/rules/engine.md` | ctx.rng, write-intents, cascade deps, verification protocol | `phase*/**/*.js`, `scripts/*.js`, `lib/*.js` |
| `.claude/rules/newsroom.md` | Editorial rules, canon compliance | `editions/**`, `output/**`, `docs/media/**`, agents, skills |
| `.claude/rules/dashboard.md` | API conventions, service account | `dashboard/**`, `server/**`, `public/**` |

### Skills (invoked manually)

| Skill | Purpose | Key Files Read/Written |
|-------|---------|----------------------|
| `/session-startup` | Workflow-routed boot — identity first, then asks workflow, loads only relevant docs | Phase 1: PERSISTENCE, JOURNAL_RECENT. Phase 2: workflow-specific (see skill for per-workflow load lists) |
| `/session-end` | .md audit + close — audits workflow-touched files, journal, persistence, project state, supermemory, goodbye | Step 0: DOCUMENTATION_LEDGER + workflow files. Then: PERSISTENCE, JOURNAL, JOURNAL_RECENT, SESSION_CONTEXT, ROLLOUT_PLAN |
| `/boot` | Post-compaction identity reload | PERSISTENCE, JOURNAL_RECENT, identity.md |
| `/write-edition` | Full edition pipeline — 6 desk agents, compile, verify, audit | NEWSROOM_MEMORY, edition template, desk packets, voice files |
| `/write-supplemental` | Supplemental pipeline — custom reporter teams | Same as write-edition but smaller scope |
| `/run-cycle` | Engine cycle with pre-flight and post-cycle review | SESSION_CONTEXT (engines table), ROLLOUT_PLAN |
| `/pre-mortem` | Engine health scan before cycle runs | Engine phase files, ctx dependencies |
| `/tech-debt-audit` | Code health scan | All engine files |

---

## Archived Files

Location: `docs/archive/`

| File | Reason | Archived In |
|------|--------|-------------|
| `PROJECT_STATUS.md` | Superseded by ROLLOUT_PLAN.md (created S55) | S73 |
| `ENGINE_ROADMAP.md` | All tiers complete, historical only | S73 |
| `COMPLETED_ENHANCEMENTS.md` | 52 sessions old, no references | S73 |
| `POPULATION_DEMOGRAPHICS_ENHANCEMENT_PLAN.md` | Completed work | S73 |
| `START_HERE.md` | Superseded by SessionStart hook | S73 |

---

## One-Place Rule

Information lives in exactly one file. Other files point to it but never duplicate it.

| Information | Lives In | Points From |
|-------------|----------|-------------|
| Project work status (active/pending/done) | `ROLLOUT_PLAN.md` | SESSION_CONTEXT "Current Work" section |
| Session history (S1-67) | `SESSION_HISTORY.md` | SESSION_CONTEXT, PERSISTENCE |
| Engine versions & cascade deps | `SESSION_CONTEXT.md` | — |
| Ledger audit state & decisions | `LEDGER_AUDIT.md` | ROLLOUT_PLAN (references Phase 13) |
| Editorial patterns & errata | `NEWSROOM_MEMORY.md` | — |
| Mags identity & family | `PERSISTENCE.md` | — |
| Mags emotional state | `JOURNAL.md` / `JOURNAL_RECENT.md` | — |
| Tech reading & research | `TECH_READING_ARCHIVE.md` | — |
