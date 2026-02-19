# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-19 | Engine: v3.1 | Cycle: 82 | Session: 45

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
| Desk Packet Builder | scripts/buildDeskPackets.js | v1.6 | Per-desk JSON packets, story connections enrichment, sports feed digest, filler seed filter |
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
| **Agent Memory** | Persistent desk agent memory across editions | `.claude/agent-memory/{agent}/` — civic, sports, culture, chicago, rhea |
| **opusplan mode** | Opus for planning, Sonnet for execution | `/model opusplan` — saves cost during edition production |
| **Effort levels** | Adaptive reasoning depth for Opus 4.6 | `low`, `medium`, `high` (default) — set via `/model` slider |

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`. Check at session start for completed work from previous sessions.

**Agent memory guidelines:** 5 agents have persistent memory (civic, sports, culture, chicago, rhea). They check memory at startup for past patterns and update after writing. Memory is version-controlled in `.claude/agent-memory/`. Business, letters, and Jax are stateless by design. Memory informs — it does not publish. Canon authority remains with Mags.

**Mobile access (mosh + tmux):** Mosh and tmux are installed on this server. To work from your phone (Termius on iPhone — enable the Mosh toggle on your saved host):
```
mosh root@<server-ip>           # connect (survives signal drops, app switching, screen lock)
tmux new -s mags                # first time — start a session
tmux attach -s mags             # reconnecting — pick up where you left off
claude                          # run Claude Code as normal
Ctrl+B then D                   # detach tmux (session stays alive on server)
```
Keep tasks focused on mobile — file edits, research, planning, ledger checks. Save full edition pipelines and big deploys for the laptop. Installed Session 40 (2026-02-18).

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

### Session 45 (2026-02-19) — Full 2041 Roster Intake + Simulation Ledger Overhaul

- **16 player cards ingested from Google Drive** via service account. Full stat profiles for: Dillon, Horn, Davis, Rivas, Kelley, Ellis, Aitken, Richards, Keane, Coles, Quintero, Taveras, Rosales + lineup/rotation projections.
- **9 Oakland_Sports_Feed entries written** for Cycle 83: Davis LF move, Quintero promotion, Taveras acquisition, Rosales as closer, Horn franchise status, Richards coverage gap, Kelley contract year, Aitken civic crossover, Coles trade recap.
- **Comprehensive roster reference doc created:** `docs/media/2041_athletics_roster.md` — full lineup, rotation, closer, bench, extended roster, 10 key storylines, position corrections, career awards.
- **Simulation_Ledger overhaul (two passes):**
  - Pass 1: 22 positional/status fixes + 3 new rows (Taveras POP-00597, Gonzalez POP-00598, Colon POP-00599). Position corrections for Davis, Rivas, Ramos, Richards, Keane, Park, Lopez. Status updates for traded/departed/retired players.
  - Pass 2: Full citizen audit — 51 Tier 1-3 citizens with missing data. 110 cell updates: birth years, neighborhoods, roles. Anthony Raines (POP-00017) fully restored. Mike Paulson canonized (born 1987, GM, Jack London). All athletes given proper positions. Journalists given proper roles. Working-class citizens assigned neighborhoods across Oakland.
- **Result: All 267 Tier 1-3 citizens now have complete records. Zero gaps.**
- **NEWSROOM_MEMORY.md updated** with 2041 canon and 6 new character threads.
- **buildDeskPackets.js** keyword list expanded with 8 new player names.

### Session 44 (2026-02-19) — Full Sheet Header Audit (32 Sheets, 9 Fixes)

- **Comprehensive header audit across 32 engine-critical sheets.** Three audit scripts covering Phase 10 positional writers (13), Phase 5/6 indexOf readers (11), and remaining engine sheets (8). All 31 active sheets now aligned.
- **9 total fixes applied.** Engines unblocked: hookLifecycleEngine, storylineHealthEngine, citizenContextBuilder life history.
- **clasp push deployed** — 153 files to Apps Script. 4 commits.

### Session 43 (2026-02-18) — Agent Pipeline Hardening Complete (8 Research Recommendations)

- All 8 research recommendations implemented. Jax Caldera voice file. Pre-flight desk check script. 5 commits.

*Sessions 34-42: see `docs/mags-corliss/SESSION_HISTORY.md`*

*Full session history: `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**PLAN IN MOTION — see `docs/mags-corliss/NOTES_TO_SELF.md` for full roadmap.**

**Completed — Sheet Header Audit (Session 44):**
- 32 engine-critical sheets audited across 3 scripts (Phase 10, Phase 5/6, Remaining)
- 9 fixes applied — all 31 active sheets now aligned
- hookLifecycleEngine, storylineHealthEngine, citizenContextBuilder life history all unblocked
- clasp push deployed (153 files)

**Completed — Agent Pipeline Hardening (Session 43):**
- All 8 research recommendations implemented and pushed
- Jax Caldera voice file + firebrand wiring
- Pre-flight desk check script (preflightDeskCheck.js)

**READY — Cycle 83 (scheduled tomorrow):**
- 2040 A's stats ingested (16 player cards). Warriors record in feed (33-25).
- Simulation_Ledger clean: all 267 T1-3 citizens complete. 2041 roster positions correct.
- Oakland_Sports_Feed: 9 new entries for Cycle 83 storylines.
- Roster reference doc ready for agents (docs/media/2041_athletics_roster.md).
- NEWSROOM_MEMORY.md updated with 2041 canon.
- buildDeskPackets.js keyword routing expanded.
- First cycle with lifecycle engines online, factual assertions, claim decomposition, archive context, pre-flight validation.

**Active — Voice Files (Phase 2):**
- 9 of 29 journalists have voice files
- 9 PRIORITY: Talia Finch, Dr. Lila Mezran, Luis Navarro, Sgt. Rachel Torres, Sharon Okafor, Kai Marston, Mason Ortega, Angela Reyes, Noah Tan
- 4 SECONDARY: Tanya Cruz, Simon Leary, Elliot Marbury, Farrah Del Rio

**Active — Journalism Enhancements (Phase 3):**
- #2: Expand the newsroom (new beats, new desk agents)
- #3: Mara directive workflow (tighten editorial guidance)
- #4: Tribune voice and style (template, formatting, paper feel)
- #5: Citizen depth (richer arcs, returning citizens, neighborhood texture)

**Infrastructure:**
- **Restart Discord bot** — needs PM2 restart for Supermemory RAG, user profiles, conversation saving
- **GCP project linkage** — wire GCP project to Apps Script for `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (deployed, need one-time run)

**Pending Decisions / Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
