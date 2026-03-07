# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-03-07 | Engine: v3.1 | Cycle: 86 | Session: 83

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
| Citizen Enrichment | scripts/enrichCitizenProfiles.js | v1.0 | Edition→LifeHistory feedback loop. Names Index extraction, paragraph-level quotes, title stripping. 161 citizens enriched E78–E86 |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Desk Packet Builder | scripts/buildDeskPackets.js | v2.1 | Per-desk JSON packets, dollar-amount economic buckets, business snapshots, employer-enriched candidates |
| Citizen-Employer Linkage | scripts/linkCitizensToEmployers.js | v1.0 | Five-layer resolution, Employment_Roster, Business_Ledger stats |
| Initiative Packet Builder | scripts/buildInitiativePackets.js | v1.0 | Per-initiative JSON packets from 7 Sheets tabs + Mara directive, 5 packets + manifest |
| Civic Voice Packets | scripts/buildCivicVoicePackets.js | v1.1 | 7 office/faction voice packets + initiative decisions injection |
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
| `docs/engine/ENGINE_MAP.md` | Condensed stub reference for every exported function across all 11 engine phases |
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

### Session 79 (2026-03-05) — Build: Phase 19 Complete + Phase 5.1 Bot Refactor + Civic Canonization

- **Phase 19 Canon Archive:** 680→378 files deduplicated, 9-desk structure, all agents wired, Lori (City Clerk) built.
- **Phase 5.1 Discord bot refactor:** System prompt reduced from ~25K to ~8K chars (68% reduction). Removed 6 bulk data sources (worldState, citizenKnowledge, archiveKnowledge, editionBrief, notesToSelf, conversationDigest). Supermemory RAG provides per-message context instead. Fixed broken `loadArchiveKnowledge()` in lib/mags.js.
- **Dashboard audit + fixes:** Edition parser rewritten for dual-format support (old markdown + new ALL CAPS). Off-by-one chunk bug fixed. H1 title detection added. Metadata sections filtered. `findTextFiles` → `findDocFiles` (supports .txt + .md). Civic database wired as Source 3 in search. New `/api/civic-documents` endpoint. Initiatives API enriched with civicDocuments arrays.
- **Civic document backfill:** 13 documents downloaded from 2 Google Drive folders, converted to civic filing convention, filed across 5 initiatives. Total civic database: 22 artifacts (19 .md + 3 .png). All 19 compliant.
- **Initiative tracker updates:** INIT-003 (Fruitvale Transit Hub) added to JSON tracker as PENDING-VOTE C86. INIT-007 (Youth Apprenticeship) written to Google Sheet as "announced" — not in JSON (not approved). INIT-004 (Port Modernization) removed from initFolderMap (pipeline, not approved).
- **Editorial discovery:** Youth Apprenticeship Pipeline — 12-cycle coverage gap since Luis Navarro's C73 feature. Five milestones unverified. Flagged for next edition.
- **Batch jobs submitted:** Dashboard dead-end audit + civic YAML frontmatter audit.

### Session 78 (2026-03-04) — Build: Phase 18 Civic Project Agents (Complete)

- **Phase 18 built in 1 session:** 4 new initiative agents + 1 upgrade + pipeline integration. The core problem from S77 (initiatives don't advance) now has a structural solution — agents that make autonomous decisions and produce civic documents.
- **5 initiative agents:** Stabilization Fund (Marcus Webb), OARI (Dr. Vanessa Tran-Muñoz), Transit Hub (Elena Soria Dominguez), Health Center (Bobby Chen-Ramirez), Baylight Authority (Keisha Ramos, upgraded). All have Write/Edit tools, 15-turn budgets, persistent memory.
- **Pipeline integration:** Step 1.6 inserted into write-edition pipeline. `buildInitiativePackets.js` creates per-initiative data packets. Initiative agents run before voice agents. `buildCivicVoicePackets.js` loads initiative decisions and injects them into all 7 voice packets.
- **City_Civic_Database:** Google Drive folder created by Mike. `saveToDrive.js` updated with `civic` destination. Initiative agents file documents here.
- **Batch personas:** `msgbatch_0139XNUsrqpPRG7FfssL4Zob` produced 5 detailed character profiles. Larry Okafor-Williams (Port Green) preserved for when INIT-004 activates.
- **Orphaned file deleted:** `lib/fishAudio.js` removed (S77 cleanup).
- **Next:** Test standalone agent with C86 packet, then full cycle run.

### Session 77 (2026-03-03) — Build: Fish Audio TTS (Abandoned) + Beverly Hayes + Arc Resolution Identified

- **Fish Audio TTS attempted and abandoned:** Full implementation built (lib/fishAudio.js, renderPodcast.js rewrite, podcast_voices.yaml restructure). Discovered $11/month subscription required for API access. Cost rejected — $150/year for 26 podcasts vs $12/month for entire DigitalOcean server. All changes reverted via `git checkout`. Existing Podcastfy + WaveNet pipeline restored.
- **Orphaned file:** `lib/fishAudio.js` created but not reverted — needs manual deletion.
- **Beverly Hayes added:** POP-00772, West Oakland, Home Health Aide, age 58, Tier 3, Stabilization Fund applicant. 659 total citizens. Was a C86 blocker.
- **Arc resolution identified as #1 priority:** The civic initiative engine has no resolution mechanics. Initiatives go SEED → ACTIVE and stay ACTIVE indefinitely. Every edition reads like nothing moves because the engine generates stasis. This is the core build work — the world needs to advance storylines.
- **Session errors:** Pipeline overwritten before pricing validated, git checkout commands missing cd prefix, Beverly Hayes ledger entry had column name mismatches (FirstName vs First). All resolved by session end.

### Session 75 (2026-03-03) — Edition 85 Production + Podcast

- **Edition 85 published:** 18 articles + 4 letters across 6 desks. Carmen Delaine front page ("The Filing Cabinet That Isn't Moving"). Mara Vance formal document requests as editorial spine. Full civic voice pipeline — 6 voice agents generating source material for the first time.
- **Rhea verification:** Score 73/100, VERDICT: REVISE. 4 CRITICALs (all engine language "cycles" in body text). 7 total instances fixed with word-level edits. No desk reruns needed.
- **Mara audit:** Grade A-/88. Second consecutive clean vote audit. Cross-desk Stabilization Fund date contradiction caught and fixed ("spring of 2038" → "late 2040"). Forward guidance for C86 written to `output/mara_directive_c85.txt`.
- **Pipeline fix:** `scripts/generate-edition-photos.js` was missing `require('dotenv').config()` — added. Photos not generated this session (Mike deferred to next week).
- **Podcast produced:** The Morning Edition, Tomas Renteria + Sonia Parikh. 58 exchanges, ~15 min. Transcript at `output/podcasts/c85_transcript.txt`, audio at `output/podcasts/c85_morning-edition.mp3`. Uploaded to Drive.
- **Post-pipeline:** Edition + Mara audit + PDF + podcast all uploaded to Drive. Discord bot refreshed. Supermemory ingested (3/3 after retry). Edition brief, scores, errata, AUDIT_HISTORY all updated. NEWSROOM_MEMORY refreshed for C85.
- **Mike feedback:** "really amazing work" — E85 well received. Note for C86 desk briefings.

### Session 83 (2026-03-07) — Maintenance: Memory Extractor Fix

- **claude-memory extract fix:** Diagnosed nested session error (CLAUDECODE env var) and 2-minute timeout. Patched `/usr/lib/node_modules/claude-memory/dist/extraction/agent-extractor.js` — unset CLAUDECODE in spawned env, bumped timeout to 5 minutes.
- **Uncommitted S82/S83 work:** 26 files, ~958 lines still staged from disconnected session. Includes enrichCitizenProfiles.js, cycle-review skill, dashboard rewrite, agent SKILL patches, engine fixes. Needs commit next session.

### Session 82 (2026-03-06) — Build: Phase 23 Cross-AI Feedback Integration

- **External AI review synthesis:** Read and analyzed feedback from Gemini, GPT, Code Copilot, and GROK. All four converged on five systemic gaps (no character feedback loop, no entity registry, fabricated numbers, no provenance enforcement, cross-desk overlap).
- **Phase 23 added to ROLLOUT_PLAN.md:** 9 sub-phases mapped from external feedback against existing codebase. Three completed this session.
- **23.1 Newsroom Base Patch (complete):** Evidence Block + Stats Gating Rule added to all 8 desk SKILLs. Anonymous Source Policy added to sports, culture, business, chicago desks (were missing it).
- **23.2 Entity Registry (partial):** Business_Ledger reference on business-desk. Rhea: Claims Table (19b), Evidence Block Verification (Check 20), Cross-Edition Drift Check (Check 21).
- **23.3 Cross-Desk Routing (complete):** Domain Ownership tables on all 8 desks.
- **Prior session commit:** ENGINE_MAP.md, generateCivicModeEvents.js, engine fixes committed separately.
- **E86 artifacts committed:** Edition file, 8 TrueSource DataPages, post-cycle-review script, 10 new agent memory directories.

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

*Sessions 1-71: see `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
