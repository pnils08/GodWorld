# GodWorld Documentation Ledger

**Created:** Session 73 (2026-03-02) | **Last Updated:** Session 113 (2026-03-23)
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
| `docs/SUPERMEMORY.md` | Supermemory container architecture — 3 containers, contents, access patterns, reference file generation | On-Demand | Manual (when containers change) | P, D |
| `docs/CLAUDE-MEM.md` | Claude-mem local work history — observations, skills, config, disk usage, cost optimization | On-Demand | Manual (when config changes) | P, D |
| `docs/DASHBOARD.md` | Dashboard API — 31 endpoints, data sources, frontend tabs, agent integration potential | On-Demand | Manual (when endpoints change) | P, D, M |
| `docs/DISCORD.md` | Discord bot — knowledge sources, Supermemory integration, crons, Moltbook heartbeat | On-Demand | Manual (when bot changes) | P, I |
| `docs/SPREADSHEET.md` | All 65 spreadsheet tabs — active, dead, ghost references, row counts, which code reads/writes each | On-Demand | Manual (after audits) | D, X |
| `docs/SIMULATION_LEDGER.md` | Citizen architecture — 675 citizens, ClockMode processing, tier system, column data flow (A-AT), engine processing by mode | On-Demand | Manual (after audits/changes) | D, X, M |
| `docs/WORKFLOWS.md` | 4 workflows (Media-Room, Build/Deploy, Maintenance, Cycle Run) — files loaded, commands, risks, rules | On-Demand | Manual (when workflows change) | All |
| `docs/EDITION_PIPELINE.md` | Full 27-step edition pipeline — scripts, dependencies, failure modes, broken steps, supplemental subset | On-Demand | Manual (when pipeline changes) | M, D |
| `docs/OPERATIONS.md` | PM2 processes, cron schedule, health checks, troubleshooting, mobile access | On-Demand | Manual (when infra changes) | P, D |
| `docs/WORLD_MEMORY.md` | The city's history in articles — archive state, gaps, execution plan for connecting C1-C77 to all systems | On-Demand | Manual (as phases complete) | M, D, P |
| `docs/STACK.md` | All services, URLs, credentials, PM2 processes. Points to SUPERMEMORY.md for container details | On-Demand | Manual (when infra changes) | P, D |

### Engine & Data Integrity (D, X)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `docs/engine/LEDGER_AUDIT.md` | Simulation_Ledger integrity — audit history, decisions, citizen tracking | On-Demand | Manual (during audits) | X |
| `docs/engine/LEDGER_REPAIR.md` | Recovery history (S68-S94), post-recovery fixes (S99), process for future major sheet upgrades, full column reference (46 cols A–AT) | On-Demand | Manual (during maintenance) | X |
| `docs/engine/LEDGER_HEAT_MAP.md` | Sheet bloat risk rankings, dead column inventory, archival strategy | On-Demand | Manual (during audits) | X |
| `docs/engine/SHEETS_MANIFEST.md` | Sheet listing — all tabs in the Simulation_Narrative spreadsheet | On-Demand | Manual (rare) | D, X |
| `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md` | Architecture spec for civic voice agent system (Phase 10.1) | On-Demand | Manual (when agents change) | D, M |
| `docs/engine/ENGINE_MAP.md` | Condensed stub reference — every exported function across 11 phases, ctx reads/writes, dependencies | On-Demand | `/stub-engine` skill | D |
| `scripts/post-cycle-review.js` | Post-cycle review script for engine output analysis | On-Demand | Manual (after cycle runs) | D, X |
| `docs/engine/DOCUMENTATION_LEDGER.md` | **This file.** Registry of all active docs | On-Demand | `/session-end` (when files change) | All |
| `output/DISK_MAP.md` | Local disk map — directory structure, naming conventions, Drive destinations, retention policy | On-Demand | `/session-end` cleanup or manual | M, D, X |

### Editorial & Newsroom (M)

| File | Purpose | Tier | Updated By | Workflows |
|------|---------|------|------------|-----------|
| `docs/mags-corliss/NOTES_TO_SELF.md` | Editorial flags only — story tracking, character tracking, Discord notes | On-Demand | Manual (during sessions) | M, I |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage patterns, character continuity, per-desk notes | On-Demand | `/session-end` Step 3 (edition sessions only) | M |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | Research notes from tech reading sessions (S50, S55, S66) | On-Demand | Manual (during research) | R |
| `docs/media/AGENT_NEWSROOM.md` | Agent roster — 7 permanent agents + 8 skills | On-Demand | Manual (when agents change) | M |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Editorial rules, voice, canon, Paulson, Mara Vance | On-Demand | Manual (rare) | M |
| `docs/media/DESK_PACKET_PIPELINE.md` | v2.0 — 8-stage edition pipeline: packets → desk folders → agents → compile → verify → intake | On-Demand | Manual (when pipeline changes) | M, D |
| `scripts/buildDeskFolders.js` | Build per-desk workspace folders (briefings, errata, voice, archive). Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `scripts/buildVoiceWorkspaces.js` | Build per-voice-agent workspace folders (briefings, base context, prior statements, initiative packets). Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `scripts/buildInitiativeWorkspaces.js` | Build per-initiative workspace folders (packets, briefings, prior decisions, reference docs). Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `scripts/buildMaraPacket.js` | Generate Mara Vance's canon audit packet — clean edition + AUDIT_HISTORY.md, no engine context. Upload to Drive for claude.ai review. | On-Demand | Auto (code) | M |
| `scripts/validateEdition.js` | v2.0 — 11 programmatic checks (8 static + 3 live sheet). Runs before Rhea. Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `output/mara-audit/` | Generated Mara audit packet: edition for review + audit history + manifest | On-Demand | `buildMaraPacket.js` | M |
| `scripts/postRunFiling.js` | Post-run filing check — verifies all pipeline outputs exist, names correct, uploads to Drive. --upload for auto. Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `scripts/gradeEdition.js` | Phase 26 — Grade desk agents and reporters from edition text + errata + Mara audit. Output: `output/grades/grades_c{XX}.json`. Zero LLM tokens. | On-Demand | Auto (code) | M, D |
| `scripts/gradeHistory.js` | Phase 26 — Rolling averages (5-edition window), trends, roster recommendations (STAR/SOLID/WATCH/PROBATION/BENCH). Output: `output/grades/grade_history.json`. | On-Demand | Auto (code) | M, D |
| `scripts/extractExemplars.js` | Phase 26 — Extract A-grade articles as desk workspace exemplars. Output: `output/grade-examples/{desk}_exemplar_c{XX}.md`. | On-Demand | Auto (code) | M, D |
| `lib/pipelineLogger.js` | Append-only JSONL pipeline logging with correlation IDs. CLI viewer: `node lib/pipelineLogger.js summary <cycle>`. Output: `output/pipeline-log/pipeline_c{XX}.jsonl`. | On-Demand | Auto (code) | M, D |
| `scripts/cleanCitizenMediaUsage.js` | Deduplicates Citizen_Media_Usage sheet, cleans dirty names, removes C79 backlog. --dry-run/--apply. | On-Demand | Manual (maintenance) | X |
| `scripts/applyCitizenBios.js` | Adds CitizenBio column (AT) to Simulation_Ledger with stable narrative bios + EconomicProfileKey fixes. --dry-run/--apply. | On-Demand | Manual (maintenance) | X |
| `output/run_manifest_c{XX}.json` | Run manifest — what exists, what's missing, what uploaded for a given cycle | On-Demand | `postRunFiling.js` | M |
| `output/civic-voice-workspace/{office}/README.md` | Static workspace navigation for civic voice agents (7 offices) | On-Demand | Manual (when folder structure changes) | M |
| `output/initiative-workspace/{init}/README.md` | Static workspace navigation for initiative agents (5 initiatives) | On-Demand | Manual (when folder structure changes) | M |
| `.claude/agents/{desk}-desk/IDENTITY.md` | Reporter personas, voice descriptions, examples (6 desks) | On-Demand | Manual (when reporters change) | M |
| `.claude/agents/{desk}-desk/RULES.md` | Hard rules, output format, domain lock (6 desks) | On-Demand | Manual (when rules change) | M |
| `output/desks/{desk}/README.md` | Static workspace navigation for desk agents (6 desks) | On-Demand | Manual (when folder structure changes) | M |
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
| `/write-edition` | Full edition pipeline — buildDeskFolders, 6 autonomous desk agents, compile, verify, audit | NEWSROOM_MEMORY, edition template, `output/desks/` workspaces |
| `/write-supplemental` | Supplemental pipeline — custom reporter teams | Same as write-edition but smaller scope |
| `/run-cycle` | Engine cycle with pre-flight and post-cycle review | SESSION_CONTEXT (engines table), ROLLOUT_PLAN |
| `/pre-mortem` | Engine health scan before cycle runs | Engine phase files, ctx dependencies |
| `/tech-debt-audit` | Code health scan | All engine files |
| `/grill-me` | Discovery before building — 16-50+ questions to reach shared understanding before implementation | None (conversation-only) |
| `.claude/hooks/post-compact-hook.sh` | PostCompact lifecycle hook — injects `/boot` directive after compaction to restore identity | PERSISTENCE, JOURNAL_RECENT, identity.md |

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
| Ledger recovery history & column reference | `LEDGER_REPAIR.md` | CLAUDE.md, MEMORY.md |
| Editorial patterns & errata | `NEWSROOM_MEMORY.md` | — |
| Edition pipeline architecture | `docs/media/DESK_PACKET_PIPELINE.md` | NEWSROOM_MEMORY, SESSION_CONTEXT |
| Desk agent identity/rules | `.claude/agents/{desk}-desk/IDENTITY.md` + `RULES.md` | DESK_PACKET_PIPELINE |
| Desk workspace structure | `output/desks/{desk}/README.md` | DISK_MAP |
| Voice agent workspace structure | `output/civic-voice-workspace/{office}/README.md` | DISK_MAP |
| Initiative workspace structure | `output/initiative-workspace/{init}/README.md` | DISK_MAP |
| Mags identity & family | `PERSISTENCE.md` | — |
| Mags emotional state | `JOURNAL.md` / `JOURNAL_RECENT.md` | — |
| Tech reading & research | `TECH_READING_ARCHIVE.md` | — |
| Agent grades & history | `output/grades/` | buildDeskFolders (→ previous_grades.md), buildVoiceWorkspaces |
| A-grade exemplars | `output/grade-examples/` | buildDeskFolders (→ exemplar.md) |
| Pipeline execution logs | `output/pipeline-log/` | — |
