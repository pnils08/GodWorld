# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-03-03 | Engine: v3.1 | Cycle: 85 | Session: 75

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
| Faith Leader Integration | scripts/integrateFaithLeaders.js | v1.0 | 16 faith leaders → SL Tier 2, LeaderPOPID backfill |
| Generic Citizens Audit | scripts/auditGenericCitizens.js | v1.0 | Read-only emergence audit, SL cross-reference |
| Celebrity Integration | scripts/integrateCelebrities.js | v1.0 | Cultural_Ledger top celebrities → SL, UniverseLinks backfill |
| Live Ledger Query | scripts/queryLedger.js | v1.0 | 6 query types (citizen, initiative, council, neighborhood, articles, verify), searches Sheets + 674 published files |
| Edition Intake | scripts/editionIntake.js | v1.2 | Auto-detects cycle, double-dash fix, business mention parsing |
| Business Intake | scripts/processBusinessIntake.js | v1.0 | Staged→promoted pipeline, BIZ-ID assignment, duplicate detection |
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
| `docs/engine/DOCUMENTATION_LEDGER.md` | **File registry** — every active doc, its purpose, load tier, workflow, and updater |

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

### Session 75 (2026-03-03) — Edition 85 Production + Podcast

- **Edition 85 published:** 18 articles + 4 letters across 6 desks. Carmen Delaine front page ("The Filing Cabinet That Isn't Moving"). Mara Vance formal document requests as editorial spine. Full civic voice pipeline — 6 voice agents generating source material for the first time.
- **Rhea verification:** Score 73/100, VERDICT: REVISE. 4 CRITICALs (all engine language "cycles" in body text). 7 total instances fixed with word-level edits. No desk reruns needed.
- **Mara audit:** Grade A-/88. Second consecutive clean vote audit. Cross-desk Stabilization Fund date contradiction caught and fixed ("spring of 2038" → "late 2040"). Forward guidance for C86 written to `output/mara_directive_c85.txt`.
- **Pipeline fix:** `scripts/generate-edition-photos.js` was missing `require('dotenv').config()` — added. Photos not generated this session (Mike deferred to next week).
- **Podcast produced:** The Morning Edition, Tomas Renteria + Sonia Parikh. 58 exchanges, ~15 min. Transcript at `output/podcasts/c85_transcript.txt`, audio at `output/podcasts/c85_morning-edition.mp3`. Uploaded to Drive.
- **Post-pipeline:** Edition + Mara audit + PDF + podcast all uploaded to Drive. Discord bot refreshed. Supermemory ingested (3/3 after retry). Edition brief, scores, errata, AUDIT_HISTORY all updated. NEWSROOM_MEMORY refreshed for C85.
- **Mike feedback:** "really amazing work" — E85 well received. Note for C86 desk briefings.

### Session 73 (2026-03-02) — Documentation Restructure + Communication Hub

- **One-Place Rule enforced:** Information lives in exactly one file. 5 stale docs archived (`docs/archive/`). SESSION_CONTEXT trimmed 518→222 lines. PERSISTENCE.md scoped to identity-only.
- **Documentation Ledger created:** `docs/engine/DOCUMENTATION_LEDGER.md` — registry of every active file with purpose, load tier, workflow code, and updater.
- **Workflow-routed boot:** CLAUDE.md rewritten with auto-greeting + 5 workflow options (Media-Room, Research, Build/Deploy, Maintenance, Cycle Run). Each loads only relevant docs.
- **Persona selection grounding:** Anthropic's persona selection research baked into boot — deliberate identity grounding before first interaction.
- **Session-end upgraded:** Step 0 (pre-write .md audit by workflow) and Step 6 (post-write verification) added. Session-startup demoted to manual fallback.
- **Communication Hub sheet:** `1LcgKRnq2S7lg53irurt6MkVB84OOMhOJ4Ig2nsb218s` — 6 tabs (Dashboard, Skills & Commands, Agent Roster, Upgrade Guide, Git & Deploy, Credentials Reference). Stack health monitoring. Async Mike/Mags notes. ENV var: `COMM_HUB_SHEET_ID`.
- **Credentials consolidated:** .env expanded from 11→16 variables (added GitHub token, Apps Script API key, DigitalOcean, server IP, Comm Hub sheet ID).

### Session 72 (2026-03-02) — Phase 12.5: Business Ledger Full Engine Integration (Complete)

- **Career Engine v2.4:** `runCareerEngine.js` now updates EmployerBizId on all career transitions. Layoffs clear BIZ-ID, sector shifts and lateral moves resolve new BIZ-IDs from `INDUSTRY_BIZ_POOL` (4 industry pools mapped to 30 actual BIZ-IDs). Same-company avoidance on laterals. Self-employed citizens protected. Emits `careerSignals.businessDeltas` — per-business gained/lost counts for downstream processing.
- **Economic Ripple Engine v2.5:** `economicRippleEngine.js` reads `businessDeltas` from Career Engine and generates `BUSINESS_CONTRACTION` (2+ lost, net negative) and `BUSINESS_EXPANSION` (2+ gained, net positive) ripples. Looks up Business_Ledger for BIZ-ID→neighborhood mapping. `mapToCanonicalNeighborhood_()` bridges 15+ ledger neighborhoods to 10 canonical ripple neighborhoods with aliases. Ripples flow through existing `calculateNeighborhoodEconomies_()` with neighborhood sensitivity weighting.
- **processBusinessIntake.js v1.0:** New Node.js CLI tool promoting staged businesses from Business_Intake to Business_Ledger. Fuzzy duplicate detection, auto BIZ-ID assignment (BIZ-00052+), employer_mapping.json update. Supports `--dry-run`. Follows integrateFaithLeaders/integrateCelebrities pattern.
- **editionIntake.js v1.2:** Added `parseBusinessMentions()` — 3 regex patterns detect new businesses from Business Ticker sections. `inferSector()` and `inferNeighborhood()` helpers. Stages to Business_Intake sheet with graceful error handling.
- **Phase 12.1 Agent Interview System** also completed this session (earlier): 8 civic voice agents, interview protocol in skills, desk agents can now interview civic officials.
- **Complete business lifecycle loop:** Edition mentions → Business_Intake staging → Business_Ledger promotion → citizen employment linkage → career transition BIZ-ID tracking → economic ripple generation → neighborhood sentiment impact.
- **Ledger integrity fix:** 38 MLB generated players had pre-2000 birth years (integrateAthletes.js silently skipped them in S70). Fixed via direct service account writes. 3 missing incomes also fixed. Ledger verified 658/658 clean against live sheet.
- **System cleanup:** 26 stale plan files purged, npm cache cleaned (1.2GB reclaimed), 11 apt packages upgraded (kernel 6.8.0-101), Claude-Mem model setting fixed (sonnet-4-5→sonnet-4-6), logs rotated, stale session notes cleaned.
- **New engine rule:** No maintenance scripts for ledger work — use service account directly. Verify live data after every write.

### Session 71 (2026-03-01) — Phase 16: Citizen Ledger Consolidation (Complete)

- **Faith Leaders:** `scripts/integrateFaithLeaders.js` v1.0 — 16 faith leaders from Faith_Organizations added to Simulation_Ledger as Tier 2 (POP-00753–POP-00768). Protestant, Baptist, Catholic, Methodist, Pentecostal, Reform Jewish, Orthodox Jewish, Muslim, Buddhist, Hindu, Sikh, Jewish Renewal, Unitarian. LeaderPOPID column added to Faith_Organizations and backfilled. Larry Yang (lay teacher) mapped to Community Organizer; all others Senior Pastor / Faith Leader.
- **Generic_Citizens Audit:** `scripts/auditGenericCitizens.js` v1.0 — 268 Generic_Citizens audited. All 11 emerged citizens confirmed on SL (zero gaps). Emergence engine healthy. Recommendation: keep as-is, defer 2041 occupation vocabulary upgrade.
- **Celebrity Bridge:** `scripts/integrateCelebrities.js` v1.0 — 9 qualifying celebrities (FameScore 65+, National/Iconic/Global). 6 already on SL from prior emergence. 3 new: Dax Monroe (Iconic athlete, POP-00769, T2), Kato Rivers (National athlete, POP-00770, T3), Sage Vienta (Global actor, POP-00771, T2). UniverseLinks backfilled on Cultural_Ledger for all 9. 21 stay Cultural_Ledger only.
- **Census:** 639 → 658 citizens (16 faith + 3 celebrity).

### Session 70 (2026-03-01) — Phase 15: A's Player Integration (Complete)

- **Player Index Upgrade:** `buildPlayerIndex.js` v2.0 — Added contract parsing ($28.2M/$7.1M/$780K formats), quirk extraction ("Outlier I • Night Player"), status detection (retired/FA/active), computed birth years (2041 - TrueSource age). 55 players indexed, 37 with parsed contracts, 8 with quirks.
- **Athlete Config:** `data/athlete_config.json` — Salary tiers (MLB_SUPERSTAR $15M+/WL10 down to MINOR_SIGNING/WL4), 14 quirk-to-trait mappings, 13 position defaults, post-career role pools, tier visibility weights.
- **Ledger Prep:** Mark Aitken consolidated to POP-00003 (Tier 1, Player Rep + Community Liaison). Buford Park canonical at POP-00059. 6 POP-IDs backfilled with civilians (Elena Vásquez, Derek Simmons/A's Marketing Director, Tomas Aguilar, Priya Nair, Marcus Whitfield, Lisa Tanaka). 4 Bulls players replaced. 5 farewell season retirees set to Retired status with corrected birth years.
- **Full Integration:** 87 players updated — birth years from 2023-era to 2041 math, incomes from $30-48K placeholders to real contracts ($750K-$37.8M) or tier fallbacks ($55K minor/$750K MLB/$250K retired). TraitProfile generated for all 87. 4 retired players transitioned to post-career roles (Scout, Pitching Coach, Broadcasting Analyst). Role mapping expanded to 288 entries. 408 total cell writes.
- **Deferred:** Engine flavor integration (generateGameModeMicroEvents.js, buildEveningFamous.js) — ship after data proves stable through cycles.

*Sessions 1-70: see `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
