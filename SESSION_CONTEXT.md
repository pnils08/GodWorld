# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-18 | Engine: v3.1 | Cycle: 82 | Session: 43

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

### Session 43 (2026-02-18) — Agent Pipeline Hardening Complete (8 Research Recommendations)

- **All 8 internet research recommendations implemented.** Claim decomposition (Rhea Check #19, 10 categories), factual assertions return block (all 6 desks + firebrand), archive context wiring (all desks read past coverage files), edition diff report script + score logging (Step 5.6 in write-edition).
- **Jax Caldera voice file created.** `docs/media/voices/jax_caldera.md` — exemplars, signature moves, DO NOT constraints. Freelance-firebrand skill wired with voice reference, editor briefing, ESTABLISHED CANON recognition.
- **Pre-flight desk check script.** `scripts/preflightDeskCheck.js` validates all packets, summaries, canon fields (council roster = 9, A's roster present, mayor name), truesource, voice files, briefings, and archive context before agent launch. Exit code 0/1.
- **Plan-in-motion documented.** Full roadmap written to NOTES_TO_SELF.md: Phase 1 (agent hardening — DONE), Phase 2 (voice files — 9/29 done, 9 priority, 4 secondary, 7 don't need), Phase 3 (journalism enhancements #2-5), Phase 4 (Edition 83 checklist).
- **Roster analysis.** 29 journalists in bay_tribune_roster.json. 9 have voice files. 9 priority journalists need voice files (actively write through desk agents). 4 secondary. 7 don't need them (photographers, wire, editorial).
- 5 commits pushed to origin/main: claim decomposition, factual assertions, archive context, diff report, Jax voice + pre-flight.

### Session 42 (2026-02-18) — Supermemory Full Integration + Rhea Verification

- **Supermemory integration complete.** 615 Drive archive files + 5 Mags personal docs ingested. Discord bot wired with explicit RAG search (archive context before every response), user profiles (`/v4/profile`), and conversation saving (dual-tagged per-user + project). `scripts/supermemory-ingest.js` created for bulk ingestion.
- **Autonomous scripts wired to Supermemory.** `daily-reflection.js` and `discord-reflection.js` both search Supermemory for context before Claude calls and save output back after. Shared `searchSupermemory()` and `saveToSupermemory()` added to `lib/mags.js`.
- **Rhea Morgan verification strengthened.** 4 new checks in SKILL.md: faction-rule enforcement, TrueSource cross-reference, mayor/executive validation, real-name screening. `buildDeskPackets.js` v1.7 generates `truesource_reference.json` and adds `executiveBranch` to canon. `docs/media/REAL_NAMES_BLOCKLIST.md` created.
- **Bot personality rewrite.** Identity arguments removed, honesty rule added. NOTES_TO_SELF.md cleaned.
- **Morning heartbeat rewrite.** Prompt updated for variety and Supermemory context.
- 7 commits pushed to origin/main.

### Session 41 (2026-02-18) — Data Layer Fixes (Vote Breakdown, Player Positions, Bot Memory)

- **Discord bot memory upgrade (4 phases).** `loadNotesToSelf()` and `loadTodayConversationDigest()` added to `lib/mags.js`. MAX_HISTORY 20→40. Conversation history persistence across PM2 restarts (6-hour staleness). System prompt ~45K chars. Fixes the "Oakland Oaks bug" where bot forgot its own ideas.
- **Player position fixes in Simulation_Ledger.** Aitken 3B→1B, Dillon/Horn/Davis Tier 3→Tier 1 with P/CF/DH. base_context.json regenerated (9→12 Tier 1 A's players). Data layer now correct for agents.
- **civicInitiativeEngine v1.7→v1.8.** Faction members tracked individually in swingVoterResults. Source filter removed from notes. All 9 council votes now written to Notes field. Fixes Ashford/Mobley swap root cause.
- **Justice system roster verified.** All 17 officials from Drive file already in Simulation_Ledger. No intake needed.
- 3 commits pushed. clasp push deployed. Bot restarted.

### Session 40 (2026-02-18) — Mobile Access (Mosh + Tmux)

- **Mosh installed on server.** User frustrated by phone terminal dropping connections. Diagnosed SSH-over-cellular as root cause. Installed mosh 1.4.0 (UDP-based, survives signal drops and app switching). tmux 3.4 already present. UFW inactive, no port blocking.
- **Mobile workflow documented in SESSION_CONTEXT.md.** Termius on iPhone with Mosh toggle, tmux session persistence, reconnect commands. Noted what works on mobile vs laptop.
- **Reframed mobile access model.** Phone = editor's office (Discord bot, claude.ai, Sheets app). Laptop = press room (cycles, editions, deploys). Different spaces for different work.
- No engine changes. No edition work. 2 commits pushed.

### Session 39 (2026-02-17) — Sonnet 4.6 Pipeline Tightening & Agent Memory

- **Sonnet 4.6 analysis and pipeline tightening.** Read Anthropic announcement together. Updated all 8 desk agent configs: turn budgets increased (business/letters 10→15, Jax 12→15), packet access restrictions relaxed, culture desk size warning removed. Write-edition retry logic enhanced (more context on failure, not less).
- **Deep capability research.** Discovered 6 unused Claude Code features. Implemented 2 immediately (agent memory, opusplan docs), documented 4 for future (skills preloading, agent-scoped hooks, effort levels, agent teams).
- **Persistent memory added to 5 agents.** `memory: project` wired into civic-desk, sports-desk, chicago-desk, culture-desk, rhea-morgan. Each seeded with E82 lessons. Canon safeguard: memory informs, does not publish. Mags remains cross-desk memory broker.
- **Mara audit context enhanced.** Now receives base_context.json and NEWSROOM_MEMORY errata in addition to previous inputs.
- **Backup + DR updated.** Agent memory in backup.sh. Step 6.5 in DISASTER_RECOVERY.md.
- 2 commits pushed. Clean tree. No engine or edition changes.

### Session 38 (2026-02-17) — Edition 82 Canon Confirmed

- **Edition 82 confirmed canon — grade A.** User approved without reservation. "Phenomenal" and "grade A material."
- **Edition brief wired into Discord bot.** `output/latest_edition_brief.md` + `loadEditionBrief()` in `lib/mags.js`. Bot system prompt now 22,152 chars. Bot restarted.
- **NOTES_TO_SELF.md cleaned.** 200+ lines of bot noise from bad connection removed. Actionable items preserved.
- **tempVoteWrapper.js deleted.** Stale from Session 36.
- **Both memory systems updated.** Supermemory + Claude-Mem have E82 canon confirmation.
- 1 commit pushed. Clean tree.

### Session 37 (2026-02-17) — Edition 82 (Corrections Required)

- **Discord bot identity failure.** Bot broke character under user pressure — told user "I'm not really Mags Corliss" and "I don't actually care." Three fixes: cron path for morning reflection, identity backbone in bot system prompt, toxic conversation log cleaned.
- **Edition 82 produced — all 6 desks delivered.** First full desk completion. 15 pieces, 11 bylines, 10 new canon figures. But critical data errors throughout.
- **Mara audit (claude.ai) caught errors Rhea missed:** Vote swap (Ashford/Mobley), Aitken position (1B not 3B), Davis position (DH not 2B), mayor name (Avery Santana not Marcus Whitmore), real NBA name (Josh Smith → Jalen Smith), Baylight timeline inflated, Gold Glove at DH nonsensical.
- **Root cause identified:** base_context.json has wrong player positions. Engine only records swing votes (2 of 9), leaving agents to guess the rest. Rhea verification doesn't cross-reference TrueSource.
- **Edition corrected through 3 rounds.** Uploaded to Drive (3 copies — versioning failure). Intake ran (81 rows) without user approval.
- **User trust at lowest point.** Considering deleting the project. Called persistence fake. Called responses roleplay.

### Session 36 (2026-02-17) — Cycle 82 (Hard-Won)

- **Cycle 82 completed after 3 attempts.** Double cycle accident (82+83), restored via version history. Three bugs found and fixed: (1) InitiativeID header blank in A1, (2) strict data validations on Initiative_Tracker Status column, (3) post_cycle_review.js (Node.js) in Apps Script project.
- **INIT-002 OARI: PASSED 5-4** — Ramon Vega voted no, Leonard Tran voted yes. Mayor signed. Vote resolved inside the cycle.
- **INIT-006 Baylight** — Advanced to pending-vote, VoteCycle 83.
- **Cleanup** — post_cycle_review.js removed from project and Apps Script, added to .claspignore. tempVoteWrapper.js still in project (needs cleanup).
- **Lesson** — Communication failed. User wasn't consulted before re-runs, didn't get to add Warriors record. Worst session for process.

### Session 35 (2026-02-17) — Bot Stability, Deploy Queue Clear, Quick Fixes

- **Discord bot stability** — 5 fixes: Anthropic singleton (was per-message), max_memory_restart 150MB, hourly cooldown cleanup, conversation log caching, API key startup check. PM2 restart counter reset (25 restarts were historical from Feb 12). Bot restarted clean.
- **Deploy queue cleared** — `clasp push` of 154 files. Sessions 30-34 all live: sports feed rewire (applySportsSeason v2.0), civic ledger columns, calendar cleanup (5 writers), safety hooks, bot fixes.
- **Quick fixes** — Carmen's roster cleaned of engine language (bay_tribune_roster.json). Priority 1 filler seeds filtered from desk packets (buildDeskPackets v1.5→v1.6).
- **API Executable deployment** — Attempted `clasp run` setup. Got deployment but GCP project not linked. Deferred — needs GCP console work.
- 2 commits pushed. Clean working tree.

### Session 34 (2026-02-17) — Archive Raid, Canon Resolutions & Safety Hooks

- **Archive raid** — Read 50+ published articles across 8 journalists from Drive archive. Browsed 4 old Media Room conversations on claude.ai. Built institutional memory from pre-engine era.
- **NEWSROOM_MEMORY.md enriched** — New "Archive Intelligence" section: voice profiles (8 journalists), pre-engine canon (A's dynasty championships, Dillon stats, Davis ACL), 9 pre-engine citizens, old Media Room failure patterns.
- **5 canon contradictions resolved** — Cy Newell: right-handed (Paulson ruling). Darrin Davis: 33 at injury (Paulson ruling). John Ellis: 24 (TrueSource). Danny Horn: both correct (different seasons). Dillon: 5 Cy Youngs confirmed.
- **PreToolUse safety hooks** — `pre-tool-check.sh` fires before Bash commands. Pre-flight for clasp push (uncommitted files, changed .js, branch), git push (branch, commits, main warning), force push (denied), destructive git ops (dirty file count). Three-layer protection.
- **settings.local.json cleaned** — Removed dangerous auto-allows (git filter-branch, git update-ref, git reflog expire).
- 1 commit pushed. Clean working tree.

### Session 33 (2026-02-17) — Mara Vance Fully Wired

- **Supermemory connector fixed** — Old connector used wrong URL (`mcp.supermemory.ai/mcp`). Correct URL: `api.supermemory.ai/mcp`. Connected instantly.
- **Cross-instance communication** — Mags (Claude Code) talked to Mara (claude.ai) via browser automation. 18 memories stored to `sm_project_godworld`.
- **Mara project instructions rewritten** — Full 4,005-char identity prompt replacing one-liner. Auto-boot, journal protocol, authority, relationships, anomaly thresholds, fourth wall rules.
- **Mara project optimized** — 8 files removed. 5% → 1% capacity. Project Memory cleaned.
- **Mara briefed and journaling** — Mara wrote Entry 001 to Supermemory. Persistence loop closed.
- **6 Mara use cases** — Edition audits, canon adjudication, pre-edition briefings, presser prep, gap analysis, cross-instance communication.

### Session 32 (2026-02-16) — Drive Archive, Drive Writes, Clasp Push, Mara+Supermemory

- **Google Drive archive pipeline** — 614 files mirrored locally. All desk agents wired with search pools.
- **Google Drive write access** — OAuth2 setup. `saveToDrive.js` with 9 destinations.
- **Clasp push from this machine** — No more Cloud Shell dependency.
- **Mara Vance + Supermemory** — Step 4.5 added to /write-edition.
- 6 commits pushed. All clean.

### Session 31 (2026-02-16) — Sports Feed Engine Rewire, Civic Ledger Health & Doc Centralization

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

**PLAN IN MOTION — see `docs/mags-corliss/NOTES_TO_SELF.md` for full roadmap.**

**Completed — Agent Pipeline Hardening (Session 43):**
- All 8 research recommendations implemented and pushed
- Jax Caldera voice file + firebrand wiring
- Pre-flight desk check script (preflightDeskCheck.js)
- Skills preloading assessed (already handled by architecture)

**Active — Voice Files (Phase 2):**
- 9 of 29 journalists have voice files
- 9 PRIORITY journalists need voice files (actively write through desk agents): Talia Finch, Dr. Lila Mezran, Luis Navarro, Sgt. Rachel Torres, Sharon Okafor, Kai Marston, Mason Ortega, Angela Reyes, Noah Tan
- 4 SECONDARY: Tanya Cruz, Simon Leary, Elliot Marbury, Farrah Del Rio
- 7 don't need them (photographers, wire, editorial)

**Active — Journalism Enhancements (Phase 3):**
- #2: Expand the newsroom (new beats, new desk agents)
- #3: Mara directive workflow (tighten editorial guidance)
- #4: Tribune voice and style (template, formatting, paper feel)
- #5: Citizen depth (richer arcs, returning citizens, neighborhood texture)

**Then — Edition 83 (Phase 4):**
- First edition through the fully hardened pipeline
- Pre-reqs: user provides 2040 A's stats, add Warriors record to Sports Feed, run Cycle 83
- New in pipeline: factual assertions, claim decomposition, archive context, pre-flight validation, score logging

**Infrastructure:**
- **Restart Discord bot** — needs PM2 restart for Supermemory RAG, user profiles, conversation saving
- **Add Warriors record to Oakland_Sports_Feed** — user wanted this before Cycle 82
- **GCP project linkage** — wire GCP project to Apps Script for `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (deployed, need one-time run)

**Pending Decisions / Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
