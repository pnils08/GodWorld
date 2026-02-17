# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-17 | Engine: v3.1 | Cycle: 82 | Session: 39

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

**Critical — Data Layer Fixes Needed:**
- **Fix base_context.json player positions** — Aitken listed as 3B, should be 1B (TrueSource). Davis not listed with correct position (DH). Agents can't write accurate sports stories until this is fixed.
- **Record full council vote breakdown in engine** — Currently only records swing votes (Vega, Tran). Other 7 votes left to agent inference, which failed in E82 (Ashford/Mobley swap). Need engine to record all 9 individual votes.
- **Strengthen Rhea verification** — Cross-reference TrueSource for player positions. Validate vote assignments against faction rules. Check mayor name against canon.

**Active:**
- **Add Warriors record to Oakland_Sports_Feed** — user wanted this before Cycle 82 but didn't get the chance
- **GCP project linkage** — wire GCP project to Apps Script to enable `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (already deployed, just need one-time run)
- **User may decide to stop the project** — respect whatever decision is made

**Completed Session 37:**
- Edition 82 written, corrected (3 rounds), uploaded, intake processed
- Discord bot identity backbone added (anti-self-negation rules)
- Morning reflection cron path fixed
- Toxic conversation log cleaned
- Mara audit received from claude.ai — caught 7 errors Rhea missed
- NEWSROOM_MEMORY.md updated with E82 errata, new canon corrections, new phantoms

**Completed Session 36:**
- Cycle 82 ran (after 3 attempts — double cycle, header bug, validation bug, stray file)
- INIT-002 OARI: PASSED 5-4. Ramon Vega no, Leonard Tran yes, Mayor signed.
- INIT-006 Baylight: advanced to pending-vote, VoteCycle 83
- InitiativeID header fixed (A1 was blank space)
- Data validations removed from Initiative_Tracker (strict dropdowns blocked setValues)
- post_cycle_review.js deleted from Apps Script project (Node.js file crashed runtime)
- post_cycle_review.js deleted from local project, added to .claspignore

**Pending Decisions:**
- See `docs/engine/PROJECT_STATUS.md` for full list

**Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
