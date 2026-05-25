# GodWorld — Rollout Archive

**This file is on-demand reference only.** It is NOT auto-loaded at session start. Read it when you need build context or implementation details for a completed phase. The active plan lives in **ROLLOUT_PLAN.md**.

---

## Phase 1: Edition Pipeline Speed + Safety — COMPLETE (S55)

All three items shipped and pushed to main.

### 1.1 Parallel Desk Agents
**What:** Launch all 6 desk agents at the same time instead of one by one.
**Why:** Each desk reads its own packet and writes its own section. No shared files, no conflicts. Running them in parallel cuts edition production time.
**How:** Update `/write-edition` skill to launch desks using `run_in_background: true` in the Task tool. Collect results as each finishes. Compile when all 6 are done.
**Requires:** Claude Code 2.1.49+ (confirmed — we're on 2.1.50).
**Risk:** If two desks reference the same citizen differently, we won't catch it until compilation. Rhea already checks for this.

### 1.2 Pre-Commit Code Check
**What:** Shell script that runs before every git commit. Catches code rule violations automatically.
**Why:** Prevents bugs like the ones that took all of Session 47 to find — wrong random functions, direct sheet writes, engine language in media files.
**How:** Add a PreToolUse hook matching `git commit`. Hook runs a shell script that scans staged diffs for:
- `Math.random()` (must use `ctx.rng`)
- Sheet write calls outside `phase10-persistence/` files
- `"this cycle"` or raw metric numbers in `editions/` or `docs/media/` files
**Cost:** Zero. Shell script, no LLM calls.

### 1.3 Automated Rhea Retry Loop
**What:** After a desk agent finishes writing, Rhea automatically scores the output. If the score is 75 or higher, the desk output goes to compilation. If below 75, the desk agent re-runs with Rhea's error report injected into the prompt. Maximum 2 retries before escalating to Mags.
**Why:** Currently Mags reads Rhea's report and manually fixes errors. This automates the fix cycle for common problems (vote fabrication, phantom characters, engine language).
**How:** Update `/write-edition` skill:
1. Desk agent finishes → output saved to file
2. Rhea agent runs on that output → returns score + error list
3. If score >= 75: approved, move to compile queue
4. If score < 75: re-launch desk agent with error report appended to briefing
5. After 2 failed retries: flag for Mags, include both Rhea reports
**Requires:** Rhea skill updated to output structured VERDICT (score + error list as parseable format).

---

## Phase 2.1: Desk Model Optimization — COMPLETE (S66)

**What:** Run letters desk and business desk on the best cost-effective model available.
**History:** S55 deployed Haiku. S66 upgraded to Sonnet 4.6 — Sonnet 4.6 now matches Opus on document comprehension (OfficeQA benchmark), users preferred it over Opus 4.5 59% of the time, and it's significantly less prone to overengineering. At $3/$15 per million tokens, it's the sweet spot between Haiku's cost savings and Opus's quality.
**Current state:** Letters + business on Sonnet 4.6. Civic, sports, culture, chicago on Sonnet (inherits default). Rhea on Sonnet.

---

## Phase 3: Engine Health — COMPLETE (S55)

### 3.1 `/pre-mortem` Skill
**What:** Scan all engine phases before running a cycle. Predict where silent failures will happen.
**Why:** Session 47 found 4 silent failures that had been running undetected. This catches them before they cascade.
**What it checks:**
- Math.random() violations (zero tolerance)
- Direct sheet writes outside Phase 10 (with documented exceptions)
- Phase 5 sub-engines reading ctx fields that another engine hasn't written yet
- Write-intents targeting sheet columns that don't exist
- Neighborhood references that don't match the 17 canonical districts
- Sheet header drift (columns in code but not in sheet, or vice versa)
**Status:** SKILL.md created. Ready to use: `/pre-mortem`.

### 3.2 `/tech-debt-audit` Skill
**What:** Automated scan for code violations across all engine files.
**Why:** Currently tracked manually in PROJECT_STATUS.md. A skill runs faster and catches things humans miss.
**What it checks:**
- `Math.random()` anywhere in engine code
- Direct sheet writes outside Phase 10
- Orphaned ctx fields (written but never read, or read but never written)
- Dead code per phase (unreferenced functions, large commented blocks)
- Sheet header misalignment between code and schemas
- Duplicate logic across phases
**Status:** SKILL.md created. Ready to use: `/tech-debt-audit`.

### 3.3 `/stub-engine` Skill
**What:** Generate a quick-reference map of every exported function across all 11 phases. Shows what each function reads from ctx and what it writes.
**Why:** Useful after context compaction when session memory is lost, or when starting a cold session on the codebase.
**Status:** SKILL.md created. Ready to use: `/stub-engine`.

---

## Phase 4.2: Startup File Freshness Check — COMPLETE (S55)

**What:** Add a check to the session startup hook that warns if identity files are stale — JOURNAL_RECENT.md older than 48 hours, SESSION_CONTEXT.md older than 72 hours, NEWSROOM_MEMORY.md older than 72 hours.
**Why:** Prevents sessions starting with outdated context without realizing it.
**How:** Added to `session-startup-hook.sh`. Checks file modification timestamps at session start, prints a warning with specific file ages if any are stale.
**Status:** Deployed in startup hook.

---

## Phase 5.3: Morning Heartbeat Disabled — COMPLETE (S60)

**What:** Removed daily-reflection.js from crontab. No more 8 AM auto-message.
**Why:** Cost savings. Sonnet call every morning adds up. Mags is already present via Discord bot and nightly reflection.

---

## Phase 6.1: Structured Errata Records — COMPLETE (S63)

**What:** Machine-readable `output/errata.jsonl` file supplementing NEWSROOM_MEMORY.md prose. Each entry: edition, date, desk, reporter, errorType, severity, description, rootCause, fix, adopted, citizenInvolved, recurrence.
**Why:** NEWSROOM_MEMORY is prose — good for editorial reading, hard to query programmatically. Structured records let agents and scripts search past mistakes by desk, error type, citizen, or pattern.
**How:** Created `output/errata.jsonl` seeded with 25 errata entries from E81-E84. Error types: vote_swap, data_fabrication, position_error, phantom_citizen, real_name_leak, agent_failure, voice_failure, citizen_overexposure, premature_publication, etc. Recurrence field tracks cross-edition patterns (e.g., vote swap E82→E83→E84).

## Phase 6.2: Auto Post-Edition Documentation — COMPLETE (S63)

**What:** After Rhea's verification pass, automatically append findings to errata.jsonl. Manual NEWSROOM_MEMORY.md update remains editorial (Mags voice).
**Why:** If Mags skips updating errata, the knowledge gap compounds. Automated parsing ensures structured records stay current.
**How:** Created `scripts/appendErrata.js` with two modes:
1. **Report parsing:** `node scripts/appendErrata.js --edition 85 --report output/rhea_report_c85.txt` — parses Rhea's CRITICAL/WARNING entries, infers desk/errorType, appends to errata.jsonl
2. **Manual entry:** `--manual --desk civic --errorType vote_swap --severity CRITICAL --description "..."` — for ad-hoc errata from compilation or Mara audit
Integrated into write-edition Step 5.5 (runs after Rhea verification, before intake).
**Depends on:** 6.1 (errata.jsonl) — complete.

## Phase 6.3: Pre-Write Agent Guardian — COMPLETE (S63)

**What:** Before a desk agent writes, it checks the structured errata file for desk-relevant warnings — recurring patterns, known pitfalls, error-prone areas.
**Why:** Briefing memos depend on Mags remembering to write them. The guardian check is automatic — both in the pipeline (queryErrata.js output injected into briefings) and standalone (agents read errata.jsonl directly).
**How:** Two-layer implementation:
1. **Pipeline layer:** write-edition Step 5b runs `node scripts/queryErrata.js --desk {name} --editions 3` for each desk. Output goes into briefings under `## GUARDIAN WARNINGS`. Recurring patterns get highest priority.
2. **Agent layer:** All 6 desk agents have a `## Pre-Write Guardian Check` section with desk-specific warnings and instructions to read errata.jsonl for standalone runs. Each desk gets tailored guidance (civic: vote swap pattern, sports: position errors, chicago: real-name leaks, etc.).
**Depends on:** 6.1 (errata.jsonl) — complete.

---

## Phase 7.1: Modular Rules — COMPLETE (S63)

**What:** Replace the monolithic CLAUDE.md with focused rule files in `.claude/rules/`. Each file has path-specific frontmatter so rules only load when touching relevant files.
**Why:** CLAUDE.md loaded identity + engine rules + newsroom rules + code rules every session regardless of task. Path-scoped rules mean engine rules only activate when editing engine files, newsroom rules only when touching editions.
**How:** Created `.claude/rules/` with 4 files:
- `identity.md` (no paths — always loaded) — Mags identity rules, user interaction, Paulson division of authority, citizen tiers
- `engine.md` (paths: `phase*/**/*.js`, `scripts/*.js`, `lib/*.js`) — ctx.rng, write-intents, cascade deps, no Math.random()
- `newsroom.md` (paths: `editions/**`, `output/**`, `docs/media/**`, `.claude/agents/**`, `.claude/skills/**`) — editorial rules, canon corrections, voice fidelity, forbidden words
- `dashboard.md` (paths: `dashboard/**`, `server/**`, `public/**`) — API conventions, service account, Express patterns
CLAUDE.md slimmed to @ imports + rules directory reference + session lifecycle. Rules are additive — they supplement CLAUDE.md.

## Phase 7.2: Dynamic Context Injection in Skills — COMPLETE (S63)

**What:** Pre-load briefing, desk summary, and archive context directly into agent prompts instead of agents spending turns reading files.
**Why:** Desk agents spent turns 1-2 reading briefing, summary, and archive files. With pre-loading, that data is in the prompt when the agent starts. Saves 1-2 turns per desk, faster edition production.
**How:** Two-part implementation:
1. **write-edition skill** (`.claude/skills/write-edition/SKILL.md`): Step 2 now instructs Mags to read briefing, summary, and archive files and embed their content directly in each agent's Task prompt under labeled headers (`PRE-LOADED: EDITOR'S BRIEFING`, `PRE-LOADED: DESK SUMMARY`, `PRE-LOADED: ARCHIVE CONTEXT`).
2. **All 8 agent SKILL.md files** (`.claude/agents/{desk}/SKILL.md`): Updated to expect pre-loaded content in prompt. Briefing, archive, and summary sections now reference the pre-loaded headers with fallback to file paths for standalone runs. Turn budgets adjusted (agents start writing 1-2 turns earlier).
**Implementation note:** The original plan proposed `` !`command` `` preprocessing syntax, which isn't natively supported by Claude Code SKILL.md files. Instead, the write-edition pipeline reads files and injects content into agent prompts directly — same result, no platform dependency.
**Risk:** If write-edition forgets to pre-load, agents fall back to reading files manually (graceful degradation).

## Phase 7.3: Desk Agent Permission Mode — COMPLETE (S60)

**What:** Add `permissionMode: dontAsk` to all read-only desk agents (civic, sports, culture, chicago, letters, business, Rhea, firebrand).
**Why:** Desk agents only have Read, Glob, Grep tools. They can't modify anything. The permission prompts during edition runs are pure noise — they slow down parallel execution and require manual approval for safe operations.
**How:** One line added to each agent's SKILL.md frontmatter: `permissionMode: dontAsk`
**Risk:** Zero. Agents are already tool-restricted. `dontAsk` auto-denies anything not explicitly allowed — which is the current behavior anyway, just without the prompt.

## Phase 7.4: Official Persistent Agent Memory — COMPLETE (pre-existing, confirmed S55)

**What:** Add `memory: project` to agents that have persistent memory (civic, sports, culture, chicago, rhea). This activates the official auto-wiring: first 200 lines of each agent's MEMORY.md loaded into context at startup, plus Read/Write/Edit auto-enabled for the memory directory.
**Why:** We already built `.claude/agent-memory/{agent}/` manually in S55. The official `memory` field does the same thing but with built-in wiring — agents automatically see their memory without us injecting it via briefings. Aligns our custom implementation with the platform standard.
**How:** One line in each agent's frontmatter: `memory: project`
Existing memory files in `.claude/agent-memory/` are already in the right location. The official feature reads from the same path pattern.

---

## Phase 8.1: UFW Firewall — COMPLETE (S60)

**What:** Enable UFW (Uncomplicated Firewall) with default-deny incoming. Only SSH (22) and dashboard (3001) allowed.
**Why:** Droplet had no firewall. Two orphaned `clasp login` processes were listening on random public ports (45779, 46267). Anyone could connect.
**How:** `ufw allow 22/tcp && ufw allow 3001/tcp && ufw enable`. Default deny blocks everything else.

---

## Phase 10.1: Civic Office Agent — Mayor — COMPLETE (S63)

**What:** An agent that IS the Mayor's office. Generates official statements, press releases, policy positions, and public responses to simulation events. Civic desk agents report ON these outputs rather than fabricating quotes.
**Why:** Currently the Mayor and council members only "speak" through Carmen Delaine's reporting — their words are invented by the journalist agent, not generated from the office itself. This creates a real separation between source and reporter. The Mayor's statement becomes canon; Carmen's article interprets it. That's how journalism actually works.
**How:** Built `.claude/agents/civic-office-mayor/SKILL.md` with:
- Full voice profile: Mayor Avery Santana, progressive pragmatist, opens with Oakland, uses concrete numbers
- Political priorities ranked: Baylight > Housing > OARI > Transit > Arts
- Relationship map: OPP allies, CRC opposition, IND swing votes, named staff (Cortez, Okoro, Park)
- Outputs structured JSON statements to `output/civic-voice/mayor_c{XX}.json`
- Statement types: initiative_response, vote_reaction, press_release, policy_position, public_remark, emergency_statement, seasonal_address
- Each statement includes: quotable headline (15-30 words), full statement (50-150 words), position, tone, targets
**Architecture:**
- Runs at Step 1.8 in write-edition pipeline — after desk packets, before desk agents
- Statements distributed to civic, letters, business, and sports desk briefings
- Pipeline is additive — desk agents work without voice agent output if it fails
- Full architecture documented in `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md`
**Proof of concept:** Cycle 84 test run produced 4 statements (Baylight celebration, Fruitvale visioning, OARI implementation, Crane/Osei health remarks). All canon-accurate, all quotable, all structured for desk consumption.
**Extends to:** Council faction agents (10.3), department heads (10.4), election cycle challenger agents (10.5). Each with their own voice and political positioning.

---

## Phase 11.2: Moltbook Heartbeat Cron — COMPLETE (S63)

**What:** A script that runs on a schedule (every 30 min), checks the Moltbook feed, reads replies, engages with conversations, and occasionally posts when inspired. Not a broadcast bot — a presence.
**How:** Built `scripts/moltbook-heartbeat.js`:
1. Checks `/api/v1/home` dashboard — karma, unread notifications, post activity
2. Fetches comments on own posts (tracked via state file) — replies to unreplied conversations
3. Reads feed (`/posts?sort=hot`) — Claude (Sonnet) evaluates and decides upvotes, replies, posts
4. Handles Moltbook verification challenges (obfuscated math)
5. Logs all interactions to `logs/moltbook/YYYY-MM-DD.json`
6. State tracking in `logs/moltbook/.heartbeat-state.json` — remembers what was upvoted, replied to, seen
7. Nightly reflection integration — `discord-reflection.js` now loads Moltbook interactions alongside Discord conversations
**PM2:** Added to `ecosystem.config.js` as `mags-moltbook-heartbeat` with `cron_restart: '*/30 * * * *'`.
**First run results:** 7 replies (to all 5 intro post commenters + Dominus consciousness post + Moltbook critique), 12 upvotes across quality posts. Mags' voice came through — no sycophancy, real engagement.
**Personality rules:** Read more than post. Never post just to post. Follow sparingly. Upvote honestly.

---

## Phase 12.6: Podcast Desk — Edition-to-Audio Pipeline — COMPLETE (S67)

**What:** Full podcast production desk that writes curated show transcripts with named citizen hosts, then renders audio via Podcastfy (open-source TTS). Replaces the manual NotebookLM workflow with a programmable pipeline where the desk agent controls 100% of editorial content and Podcastfy handles audio rendering.
**Why:** NotebookLM research (S67) revealed limitations: cookie-based auth (fragile), 3 podcasts/day free tier, can't customize host voices/names, two generic AI voices. Podcastfy's `transcript_file` mode accepts pre-written `<Person1>/<Person2>` XML scripts, skipping LLM generation entirely — the desk agent IS the editorial brain, Podcastfy is just the audio press.
**Architecture:**
1. Podcast desk agent (`podcast-desk`) — writes show transcripts with named citizen hosts
2. Three show formats: The Morning Edition (2 citizen hosts), The Postgame (P Slayer + Anthony), The Debrief (Mags + Hal)
3. `scripts/renderPodcast.js` — Node.js wrapper calling Podcastfy via Python venv
4. `config/podcast_voices.yaml` — TTS voice assignments per format
5. Step 5.06 in write-edition pipeline (optional, editor's discretion)
6. Standalone `/podcast [cycle] [format]` skill for ad-hoc generation
**Cost:** $0/month with Edge TTS (default). $0.02/episode with Google WaveNet free tier. Upgrade path to ElevenLabs custom voices ($22-99/mo).
**Files created (S67):** `.claude/agents/podcast-desk/SKILL.md`, `.claude/skills/podcast-desk/SKILL.md`, `.claude/skills/podcast/SKILL.md`, `docs/media/podcast/SHOW_FORMATS.md`, `scripts/renderPodcast.js`, `config/podcast_voices.yaml`, `.claude/agent-memory/podcast-desk/MEMORY.md`
**Depends on:** Podcastfy installed in `.venv/podcastfy/` (done S67). FFmpeg (system, confirmed). Google API key for WaveNet upgrade (provided, not yet wired).
**First production:** C84 Supplemental Morning Edition with Tomas Renteria + Sonia Parikh (permanent hosts, both Tier 2 citizens). Edge TTS and Google WaveNet both tested. Audio uploaded to Drive.

## Phase 12.7: Live Ledger Query Script — COMPLETE (S67)

**What:** CLI tool (`scripts/queryLedger.js`) that queries Google Sheets and published editions, outputs JSON for agent consumption. Six query types: citizen, initiative, council, neighborhood, articles, verify. The `articles` query searches 674+ files across both `editions/` (canonical) and `output/drive-files/` (full Drive archive). Outputs to stdout or saves to `output/queries/` where agents can read results via their existing Read tool.
**Why:** Agents work from static desk packets (JSON snapshots built before each edition). If an agent needs data not anticipated in the packet — a citizen's full history, a council vote count, an initiative's current status — it has no way to get it. The dashboard has the data (30+ REST endpoints on localhost:3001) but agents can't reach it. This script bridges the gap without expanding agent tool permissions.
**How it works:**
1. Mags identifies what agents will need before launching them
2. Runs targeted queries: `node scripts/queryLedger.js citizen "Tomas Renteria" --save`
3. Query results land in `output/queries/` as JSON files
4. Agent prompts include: "Additional context files are in output/queries/ — read them if relevant"
5. Agents use their existing Read tool to access query results
**Files:** `scripts/queryLedger.js`, `output/queries/`
**Depends on:** `lib/sheets.js` (existing), service account credentials (existing)
**All 6 query types tested** — 5 against live sheets, articles against 674 files (editions + Drive archive).

## Phase 12.8: Initiative Implementation Tracking — COMPLETE (S67)

**What:** Extend Initiative_Tracker to track what happens AFTER votes pass. Four new fields: ImplementationPhase (enum), MilestoneNotes (text), NextScheduledAction (text), NextActionCycle (number). Wired into buildDeskPackets.js so civic desk agents see implementation status in their packets.
**Why:** The Stabilization Fund is the biggest open storyline — $28M authorized, $4.2M approved, $0 delivered. Without implementation tracking, agents can't write about progress (or lack of it) with specificity. September 8th Vega committee meeting (cycle 89) is a key story gate that needs to be a scheduled event in the data.
**Implementation phases:** `authorized` → `committee-review` → `disbursing` → `stalled` → `complete`
**Files modified:** `scripts/buildDeskPackets.js` (recentOutcomes, civicConsequences, truesource), `output/initiative_tracker.json` (all 4 initiatives updated with Mara audit corrections)
**Sheet changes:** Mike added 4 columns to Initiative_Tracker sheet (ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle). All populated with Mara-corrected data.

---

## Sessions 105-106 (2026-03-20) — Architecture Grounding + Dashboard Audit

### Architecture Documentation (S105)

9 architecture docs created, covering every system layer:

| Doc | What it covers |
|-----|---------------|
| `docs/SUPERMEMORY.md` | 3 Supermemory containers (mags/godworld/mara), plugin hooks, API, isolation rules |
| `docs/CLAUDE-MEM.md` | Local observation system — 6,282 observations, 741MB, Sonnet cost concern |
| `docs/DASHBOARD.md` | 31 API endpoints, 4 data sources, citizen detail audit, civic/sports assessments |
| `docs/DISCORD.md` | Bot knowledge sources (6 local files + SM RAG), Moltbook heartbeat |
| `docs/SPREADSHEET.md` | All 65 spreadsheet tabs — 45 active, 8 dead, 7 utility, 15 ghost references |
| `docs/SIMULATION_LEDGER.md` | 675 citizens, 46-column data flow (writers/readers), ClockMode processing, flag bug |
| `docs/WORKFLOWS.md` | 4 workflows — files loaded, commands, risks, rules |
| `docs/EDITION_PIPELINE.md` | Full 27-step pipeline — dependencies, failure modes, 3 broken steps |
| `docs/OPERATIONS.md` | PM2 processes, cron schedule, health checks, troubleshooting |

### Mara Reference Pipeline (S105)

- `scripts/buildMaraReference.js` — pulls 6 spreadsheet tabs, outputs clean text files to `output/mara-reference/`
- 5 files pushed to `mara` Supermemory container (citizen roster 509, tribune 29, chicago 123, businesses 51, faith 16)
- A's roster pushed to `bay-tribune` container
- Mike created `As_Roster` (89) and `Bay_Tribune_Oakland` (29) spreadsheet tabs

### Bugs & Findings (S105)

- **UNI/MED/CIV flag comparison bug** — Engine checks `=== "y"` but values are "Yes"/"yes". Skip gates never fire. 8 engine files affected, 4 with no ClockMode backup. Batch report: `batch_flag_bug_impact_2026-03-20.md`
- **Career/education coherence** — 88.6% coherent, 24 mismatches (8 licensure impossibilities, 6 income outliers, 4 age/stage impossibilities). Batch report: `batch_career_education_coherence_2026-03-20.md`
- **Citizen routing bottleneck** — 675→20 via 4-stage filter chain. InterviewReady gate kills 91%. Batch report: `batch_citizen_routing_analysis_2026-03-20.md`

### Agent Supermemory Audit (S106) — COMPLETE

All scripts verified correct containers. No old GodWorld org refs. No mara access. Editions E83-E87 + 5 supplementals ingested to godworld. Discord bot updated to search mags+godworld. Batch report: `batch_agent_supermemory_audit_2026-03-20.md`

### World Memory — Phase 1 (S106) — COMPLETE

- Dashboard `getAllEditions()` reads `archive/articles/` as Source 4 (199 curated articles, C1-C77)
- Content-based title/author extraction replaces filename parsing
- Mirror/junk files filtered. Article index rebuilt (244 entries, 0 mirrors)
- `buildArchiveContext.js` wired to query dashboard API alongside Supermemory
- Discord bot `loadArchiveKnowledge()` rewritten to read curated archive (was reading empty dir)
- See `docs/WORLD_MEMORY.md` for remaining phases

### Dashboard Fixes (S106)

- Supplemental detection: `isSupplemental` flag + filename cycle parsing. 7 supplementals visible (was 0)
- Warriors header: filtered from frontend (not a GodWorld franchise)
- Edition scores: E86 (A) and E87 (B) added to `edition_scores.json`
- Archive search: 256 total articles searchable across C1-C87
- Civic pipeline assessed: initiative tracker stale, status mapping issues documented
- Sports data gap documented: 10 vs 62 players available to sports desk
- Chicago tab proposed: satellite city deserves its own dashboard tab
- citizen_archive.json: identified as auto-refresh via buildDeskPackets.js pipeline

### Other Fixes (S105-S106)

- Moltbook heartbeat: 30min→4hr. Stale post 404 fixed.
- MEMORY.md cleaned: stale items removed, accurate population numbers
- CLAUDE.md updated: gotchas corrected, 9 architecture docs in on-demand list
- Comm Hub updated: SuperMemory tab + md library tab current (564 MDs)
- Archive policy added to DISK_MAP.md
- Moltbook `begin-mirror-package` filtered from dashboard
- Dead spreadsheet tabs identified for archival

---

## S142 Archive Pass (2026-04-11)

Cleanup pass on ROLLOUT_PLAN.md to move DONE items out of the active plan. Nothing new built here — just moving pointers. Items below were DONE in earlier sessions and cluttering the open plan; find full detail in git log or the original phase writeups above in this archive.

### Moved out of "E91 Post-Publish" (Open Work Items)

- **Faction full names canonized — S139.** OPP = Oakland Progressive Party, CRC = Civic Reform Coalition, IND = Independent. Engine code + Mara reference + agent files updated. Engine previously had "People's Party" — corrected.
- **Maurice Franklin added to ledger — S139.** POP-00801, Tier 3, Rockridge, retired transit supervisor, born 1978.
- **Mayor Santana gender locked — S139.** She/her in mayor IDENTITY.md, 8 civic agent files, buildDecisionQueue.js. Published editions are historical — canon corrects forward, not backward.

### Moved out of Data & Pipeline

- **Intake system — S137b.** Three feedback channels operational (initiative tracker, sports feed, coverage ratings). Wiki ingest (`ingestEditionWiki.js`) + citizen cards + tracker updates. Old scripts (`editionIntake.js`, `editionIntakeV3.js`, `processEditionIntake.js`) and docs (`INTAKE_REDESIGN.md`, `INTAKE_REDESIGN_PLAN.md`) are legacy.

### Moved out of Infrastructure

- **Node.js security patch — S139.** v20.20.0 → v20.20.2. Applied 2026-04-09.

### Phase 33 subitems (moved out of open plan, retained here)

- **33.1 Config protection hook — S133.** PreToolUse hook blocks edits to protected config files outside safe script allowlist.
- **33.2 PreCompact state save — S133.** Context state captured before compaction so post-compact Mags can recover.
- **33.3 Strategic compaction reminder — S133.** Prompt-level nudge when context approaches fill.
- **33.4 City-hall skill rewrite — S133.** Voice agents + decision queues + tracker writeback restructured.
- **33.5 Bounded trait system — S133.** Numeric trait scores with bounded ranges for agent personas. No more unbounded drift.
- **33.7 Write-edition rewrite — S134.** 9-step pipeline, story-driven layout, canon-grounded briefs, pipeline v2.

### Whole phases that moved to archive-only reference

- **Phase 31: Canon-Grounded Briefings — DONE S134.** Incorporated into `/write-edition` Step 3: verify citizens + write angle briefs per reporter. Each reporter gets `output/reporters/{reporter}/c{XX}_brief.md` with verified citizens, canon history from bay-tribune, and atomic topic checkout. Civic production log feeds in at Step 1. The manual bridge became the pipeline. End state: Phase 21.2 (Canon Grounding MCP, DONE S137b) automates it.

- **Phase 2.2: Desk Packet Query Interface — SUPERSEDED by MCP S137b.** Replaced by GodWorld MCP server (Phase 21.2). The MCP provides direct tool access to all data agents need — citizen lookup, initiative state, canon search, roster, neighborhoods. Agents call MCP tools instead of curl or file reading. No further work needed.

- **Phase 21.2: Canon Grounding MCP — DONE S137b.** `scripts/godworld-mcp.py` — FastMCP server exposing 10 tools: lookup_citizen, lookup_initiative, search_canon, search_world, search_articles, get_roster, get_neighborhood, get_council_member, get_domain_ratings. Backs onto Supermemory (bay-tribune + world-data), Dashboard API, truesource. Registered in `.mcp.json`. ~250x token reduction per citizen lookup vs reading truesource. Available to all Claude Code sessions, agents, and future local models. HTTP mode for remote agents: `python3 scripts/godworld-mcp.py --http 3032`.

### Session Harness / Discord / Dashboard bucket (all DONE S110–S113)

Moved out of ROLLOUT_PLAN as three separate compressed tables. Detail retained for reference:

**Harness improvements:**
- CLAUDE.md instruction audit (S110) — 188 → 54 lines, 71% cut, ~111 instructions vs ~150 budget.
- PreToolUse ledger protection hook (S110) — blocks destructive, warns on sheet writes outside safe scripts.
- Terminal status line (S110) — `~/.claude/statusline.sh` shows S/C numbers + 5h rate limit.
- Smarter compaction hook (S113) — `pre-compact-hook.sh` injects workflow, git modified files, workflow constraints.
- Output style per workflow (S113) — Build=concise, Research=explanatory, Media-Room=editorial, Chat=natural.
- Fan-out `claude -p` for batch ops (S113) — documented in WORKFLOWS.md.
- PostToolUse validation hook (S113) — `post-write-check.sh` catches container refs, engine language in agent files, builder/user refs in editorial.
- Effort frontmatter in skills (S113) — all 21 skills tagged: 9 HIGH, 7 MEDIUM, 5 LOW.
- HTTP hooks → dashboard (S113) — `POST /api/session-events` (localhost), `session-event-post.sh` fires async on SessionStart/Stop. 200-event ring buffer.
- `/save-to-mags` skill (S111) — writes directly to `mags` container via Supermemory API, avoids the `/super-save` → `bay-tribune` default.

**Discord Channel + Cloud Sessions:**
- Discord Channel plugin (S112) — MagsClaudeCode bot created, token configured, pairing complete. Launch: `claude --channels plugin:discord@claude-plugins-official`.
- Webhook receiver (S113) — `POST /api/webhooks` on dashboard, secret-authenticated, events land in session ring buffer.
- Still open: Cloud session + Channel (kept in active plan under Infrastructure).

**Dashboard Mission Control (S113):**
- Session status panel — Mission Control tab, color-coded timeline of session events.
- Channel status — static panel showing Discord connected state + bot name.
- Health panel — dashboard status, engine version, cycle/edition, droplet specs from `/api/health`.
- Session history — file-backed JSONL at `output/session-events.jsonl`, 500-event cap.
- Quick actions — 3 wired buttons: Restart Bot, Health Check, Clear Events. All require dashboard auth.

---

## S144: Media Pipeline Chain + MD Lifecycle Automation — COMPLETE

Full edition production chain designed as discrete linked skills with user gates at each boundary. MD lifecycle automation layer built to prevent drift.

### Pipeline Skills Built/Updated

| Skill | Status | Position in Chain |
|-------|--------|-------------------|
| `/run-cycle` | Rewritten as orchestrator | Step 1 |
| `/pre-flight` | Built new — checks manual inputs | Step 1a |
| `/pre-mortem` | Existing | Step 1b |
| `/engine-review` | Built new — Phase 38.1 ailment detector | Step 1d |
| `/build-world-summary` | Built new — mechanical assembly | Step 1e |
| `/city-hall-prep` | Built new — prepare pending decisions per voice | Step 2a |
| `/city-hall` | Existing, media handoff expanded | Step 2b |
| `/sift` | Built new — thread extraction, story proposals, angle briefs | Step 3 |
| `/write-edition` | Rewritten execution-only (372 → 160 lines) | Step 4 |
| `/post-publish` | Built new — 13 steps, feedback loop closer | Step 5 |
| `/edition-print` | Updated — PDF Drive upload, dashboard update | Step 6 (parallel) |
| `/write-supplemental` | Updated — MCP lookups, criteria refs, intake fixed | Post-cycle |
| `/dispatch` | Updated — roll call rule, MCP lookups, bench note | Post-cycle |
| `/interview` | Built new — two modes, theme-driven, Mara audit | Post-cycle |
| `/podcast` | Updated — ingest restored, runs after post-publish | Post-cycle |

### Trainable Criteria Files (self-updating via /post-publish Step 10)

- `docs/media/story_evaluation.md` — priority signals, front page scoring, three-layer test, changelog
- `docs/media/brief_template.md` — angle brief structure, good vs bad examples, changelog
- `docs/media/citizen_selection.md` — MCP lookup rules (citizen vs A's player), canon vs agent color, name collision warning, changelog

### Audit Infrastructure

- `/doc-audit` rewritten with 5 groups (boot/engine/media/infra/data), rotation tracker, criteria file checks
- `/skill-audit` built — 3 groups (cycle-pipeline/post-cycle-media/identity-session), handoff + reference + agent directory checks
- `scripts/session-end-audit.sh` — SessionEnd hook, detects md changes, writes report to `output/audit-reports/`, updates `output/audit-state.json`
- `settings.json` hook chain extended — session-eval.js + session-end-audit.sh both async
- 6 scheduled agents designed and uploaded to Drive folder `1QoV1eWy28lYbPa2vtkuOqp1wIZcvxtJS`: bay-tribune contamination, engine code review, md freshness rotation, repo hygiene, supermemory entry tagger, mara canon sync (reused slot)

### Document Consolidation

- SESSION_CONTEXT.md trimmed 541 → 81 lines, maintenance rule added, sessions S92-S133 rotated to SESSION_HISTORY.md
- Engine version table + cascade deps moved to DOCUMENTATION_LEDGER.md
- One-place rule updated for content moves
- All 14 pipeline skills registered in DOCUMENTATION_LEDGER Cycle Pipeline section

### Wiki Pattern for Supermemory

All skills that produce canon log Supermemory doc IDs inline in their production log entries. Next cycle queries records directly by ID instead of re-parsing files. Applied to: post-publish Step 12, write-edition Step 6, write-supplemental Step 5f.5, dispatch Step 5f, interview Step 7g. Podcast Step 6 already had the pattern.

## S147: Phase 39 Three-Lane Reviewer + Final Arbiter — COMPLETE (spine step 6)

Session 147 (2026-04-15) closed spine step 6 in one go. All six 39.x sub-phases plus supporting infrastructure shipped. Commits: `1cbd9ba`, `1f40562`, `e3bb393`, `023896f`, `c9d2717`, `e4dbb58`, `ecdc6b1`.

### Phase 39.6 — Process/outcome scaffolding

- `scripts/capabilityReviewer.js` summary now emits `process` (fraction passed), `outcome` (1 iff no blocking failures), `controllableFailures`, `uncontrollableFailures` — the four-field reviewer-lane contract.
- `docs/engine/REVIEWER_LANE_SCHEMA.md` written — 11-section contract every lane JSON must satisfy, including four-quadrant process×outcome interpretation (high/low process × pass/fail outcome = four diagnostic cells). Wiki-registered in `docs/index.md`, PHASE_39_PLAN §17.3, research-build TERMINAL.md, and `/doc-audit` media group.
- C91 replay: process 0.667, outcome 0, Temescal still blocks (no regression).

### Phase 39.2 — Rhea → Sourcing Lane

- `.claude/agents/rhea-morgan/IDENTITY.md`: Sourcing Lane framing (MIA charter verbatim, weight 0.3). Score moves from /100 to 0.0–1.0.
- `RULES.md`: 431 → 185 lines. Five checks survive — `citizen-name-verification`, `vote-civic-verification`, `sports-record-verification`, `canon-continuity`, `quote-attribution`. Full JSON output contract per PHASE_39_PLAN §13.2. FULL/FAST modes eliminated. Explicit table maps every dropped check to its new owner.
- `scripts/rheaJsonReport.js` (new): validates Rhea's JSON, recomputes derived fields authoritatively, auto-merges hallucination sidecar (39.3) if present, emits `.txt` backwards-compat companion.

### Phase 39.4 — cycle-review → Reasoning Lane

- `.claude/skills/cycle-review/SKILL.md` rewritten. Three checks only — `internal-consistency`, `evidence-based-deduction`, `argument-quality`. Weight 0.5 (heaviest lane). JSON output per §15.2. A/B/C/D/F grade eliminated.
- `.claude/skills/style-pass/SKILL.md` (new): holds orphaned Pass 3.3–3.6 stylistic flags (sentence variety, emotional range, opening/closing quality). On-demand only, not a publication gate.
- `scripts/capability-reviewer/assertArticleLengthBalance.js` (new): deterministic. 200–1200 word bounds per article + 3× imbalance check between desks.
- `scripts/capability-reviewer/assertNamesIndexCompleteness.js` (new): deterministic. Paren-aware splitter handles "Name (D1, OPP)" entries.
- `assertions.json`: 2 new deterministic assertions + 2 grader-only (`voice-consistent-with-reporter-roster`, `genre-discipline`) awaiting Haiku key... which Mike then surfaced as actually present. The two grader-only stay deferred until their modules are written — they weren't strictly required for spine step 6.
- C91 replay after new assertions: 6/11 pass, process 0.545. Real findings surfaced (long SPORTS/LETTERS sections, missing EDITOR'S DESK names index).

### Phase 39.5 — Mara → Result Validity Lane

- `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md`: new "Audit Scope" section. Three checks only — `completeness`, `gave-up-detection`, `coverage-breadth`. Weight 0.2. Explicit defer-to-other-lanes list (Rhea/cycle-review/capability). Required structured-top markdown output format per §16.3.
- `MEDIA_ROOM_INTRODUCTION.md`: SUMMARY reflects narrowed scope.
- `scripts/maraJsonReport.js` (new): parses Mara's markdown top section into `output/mara_report_c{XX}.json`. Verdict logic: PASS if all three checks PASS, FAIL if any FAIL, REVISE otherwise. Smoke-tested with synthetic C91 audit (verdict FAIL, score 0.7, outcome 0).

### Phase 39.7 — Final Arbiter

- `.claude/agents/final-arbiter/IDENTITY.md` + `RULES.md`: adapts MIA Final Arbiter prompt (MIA p.33 verbatim). Reads four inputs (three lanes + capability gate), computes weighted score 0.5/0.3/0.2, enforces capability gate as hard halt, issues A/B verdict with blame attribution routed through the four-quadrant rule.
- `scripts/finalArbiter.js` (new): deterministic orchestrator. No LLM call — all judgment encoded in rules. Writes `output/final_arbiter_c{XX}.json` per §18.3. Exit code 1 on HALT.
- `.claude/skills/write-edition/SKILL.md`: pipeline updated — Step 4 (Rhea Sourcing Lane), Step 4.1 (cycle-review Reasoning Lane), Step 5 (Mara Result Validity Lane, external), **Step 5.5 (Final Arbiter — publication gate)**, Step 6 (Publish, gated by Arbiter recommendation).
- C91 replay with synthetic lane inputs + real capability JSON: verdict=B, weightedScore=0.799, gate=BLOCK, recommendation=HALT, blame cites Temescal. All 39.7 acceptance criteria from §18.5 met.

### Phase 39.3 — Two-pass hallucination detection (Mike's Anthropic key surfaced mid-session)

- `scripts/rheaTwoPass.js` (new): Microsoft UV §3.4 pattern. Pass A (Haiku 4.5, text-only) extracts checkable claims; Pass B (Haiku 4.5, text + canon) verifies each claim. Divergence → hallucination flag. Prompt caching on canon context amortizes cost.
- **Two-tier canon context (S147 fix):** Tier 1 AUTHORITATIVE — sheet-derived rows from Simulation_Ledger / Civic_Office_Ledger / Initiative_Tracker / As_Roster with ages computed as `2041 − BirthYear`. Tier 2 DERIVED — world_summary/engine_review/desk-packets, explicitly labeled as lossy. Pass B system prompt tells Haiku to trust Tier 1 over Tier 2 on conflicts.
- E91 first run: 14 flags, false-positive rate ~45%. After two-tier rewrite: 1 flag, false-positive rate ~2%. Well under the 10% acceptance target from §14.3.
- **Upstream bug caught:** the "Varek 31" drift chain. `/city-hall-prep` run for C91 wrote "Varek, 31" to `pending_decisions.md` (age guess without the 2041 anchor). Drifted into `production_log_city_hall_c91.md` and `world_summary_c91.md`. Fix: added "citizen ages = `2041 − BirthYear`" rule to `.claude/rules/newsroom.md` (path-scoped, loads for every editorial skill), saved memory `project_age-2041-anchor-convention.md`, fixed drifted local files.

### Rules & memory additions

- `.claude/rules/newsroom.md`: 2041 age anchor rule. Every editorial skill now loads it.
- Memory: `feedback_every-new-md-must-have-inbound-link.md` — every new .md must be wired into docs/index + parent spec + TERMINAL.md + doc-audit group before work is called done.
- Memory: `project_age-2041-anchor-convention.md` — the 2041 reference year, why it exists, how detectors apply it.

### Spine step 6 status

**CLOSED.** Five of six sub-phases done with replay tests passing against E91. Next spine step: **39.8 / 39.9 / 39.10** (spine step 7) — reward-hacking scans, tiered review, adversarial review skill.

---

## Tactical Closures — S156–S186 Archive Sweep (S186)

Closed line items extracted from active ROLLOUT_PLAN.md sections during the S186 archive sweep. Full closure detail preserved here; ROLLOUT_PLAN.md retains active items only. Each entry is reproduced verbatim from the rollout at archive time so future sessions can recover the exact state without git archaeology.

### Edition Post-Publish closures

#### POP-00004 Lucia Polito row drift — DONE S185 (engine-sheet)

Two cells repaired via direct service-account write to live sheet: K5 `RoleType="Aura "` → `"Aura Wellness Practitioner"` (canonical per S184 split-recovery analysis, restores lost half); M5 `BirthYear=1982` → `1977` (canon LifeHistory + CitizenBio agree). DebtLevel was already repaired between S184 and S185 (now numeric "2"). Verified live post-write. Closed.

#### Empty-cell rows in lifecycle fields — RESOLVED S185 audit

S185 audit re-verified: 0 citizens with POPID are missing BirthYear (count is `withPopMissingBirth.length === 0` across 836 real-citizen rows). The "74-165 rows shorter than schema" S184 framing was actually counting **74 blank rows in the sheet** (no POPID, no name, just trailing/scattered empty rows) — sheet-padding, not citizen-data drift. Optional separate task: delete the 74 blank rows for sheet hygiene; not blocking anything. NOT NEEDED for citizen integrity. (74 trailing blanks subsequently deleted via the Sheet-hygiene blank-row delete entry below.)

#### Ingest gender column AU to world-data citizen cards — DONE S181 (engine-sheet, commit `e4c69a5`)

`scripts/buildCitizenCards.js` reads col 46 (Gender) and writes to world-data card header alongside Tier/Birth. EmployerBizId + UsageCount also added in same commit. Mara's canon-fidelity audits now have ledger-truth gender data via card retrieval. Closed.

#### WorldEvents_V3_Ledger keyword classifier polish — DONE S185 (engine-sheet, commit `8a509a9`, v3.5 → v3.6, deployed)

Three fixes: (1) word-boundary regex in `deriveDomain` (`\bkeyword\b`) prevents "as" substring-matching "last"/"mass"/"Hassan"; (2) domainMap pre-sorted by descending key length so multi-word phrases ("kitchen fire", "lost dog") win over short collisions; (3) domainMap +8 keywords (misfiled, missing funds, document, audit, eviction, lease, permit, application) for General fall-through reduction; (4) `health-alert` → `health-event` (less alarmist, no downstream readers of the literal). Smoke-test 8/8 fixtures pass. Generator-side case discipline (UPPERCASE vs Title Case across event generators) intentionally NOT touched — applyShockMonitor expects UPPERCASE; case normalization is a separate task (still active in rollout). Closed.

### Data & Pipeline closures

#### Tech debt audit 2026-04-15 — Path 1 CLOSED S156 (engine-sheet)

Audit: `docs/engine/tech_debt_audits/2026-04-15.md`. Commits: `76a408c` (38 writers → exceptions list + 4 flagged Math.random), `af40282` (55 cycle-path silent fallbacks → `safeRand_(ctx)` helper in `utilities/safeRand.js`), `e4362c8`/`1c82425` (22 parameter-rng helper throws), `ab91955` (Warnings section triage: 78 ctx.summary "orphans" reclassified as bulk-serialized via `exportCycleArtifacts`, schema header staleness closed retroactive), `bb55dd5` (`/tech-debt-audit` skill updated to walk serializer graph before flagging ctx.summary orphans — prevents re-discovery). Silent-fallback Math.random class eliminated across engine. Path 2 (Phase 42 Writer Consolidation) remains active in ROLLOUT_PLAN.

#### Dead-code detection scan — DONE S185 (engine-sheet)

Audit pointer: [[engine/tech_debt_audits/2026-04-29-dead-code-scan]]. Scanner: `scripts/scanDeadCode.js`. 143 files, 909 function declarations, 884 unique names. **74 unreferenced** with allowlist applied (Apps Script triggers + bare-named entry points + string-literal dispatch). Categorized: **38 KEEP** (standby APIs from S184/S185 in-progress work + planned-feature scaffold referenced in roadmap docs + manual debug entry points), **31 DELETE candidates** (v2-deprecation helpers, persistence-executor bridges, markdown-parser sub-helpers, phase-timing debug, event-arc-engine internals, media intake setup helpers, `nextPopIdSafe_`), **0 REVIEW** (all 74 placed into KEEP or DELETE this pass). Verdict shipped — DELETE-batch execution captured in next entry. Closed audit.

#### Dead-code DELETE batch — DONE S185 (engine-sheet, commit `bbdca3a`, clasp deployed)

Removed 20 truly-dead functions across 7 files (audit-doc count corrected from "31" to "20" in same commit; original summary was off): v2DeprecationGuide.js (5), persistenceExecutor.js (3 bridges), parseMediaRoomMarkdown.js (3 sub-helpers), cycleModes.js (3 timing helpers), eventArcEngine.js (3 internals), mediaRoomIntake.js (2 setup), godWorldEngine2.js (1 — `nextPopIdSafe_`). Net 722 lines removed. Re-ran scanner post-edit: 74 → 56 unreferenced (delta -18 vs 20 deletions because 2 transitive unrefs surfaced where deleted functions were sole callers — candidates for next dead-code pass). 8 originally-uncategorized unrefs deferred to next audit pass per audit doc.

#### POST-E92 ENGINE REPAIR: /pre-mortem C92 findings — DONE S180/S181 (engine-sheet)

Rows 12, 13, 14 all closed — see [[engine/ENGINE_REPAIR]] for closure detail.

#### POST-E92 ENGINE REPAIR: Enricher misattribution bug — DONE S185 (engine-sheet, commit `6a30094`)

Two coupled bugs in `checkMitigators.js` v1.0.0: (1) substring keyword matching let "as" (sports team abbreviation) match "last"/"has"/"mass" and false-tag non-sports patterns as 'sports' category; (2) `linkedIds` admitted any initiative as mitigator regardless of policy-domain match, with 'culture' default fallback. Combined → Baylight tagged as mitigator for faith-coverage-gap + council-writeback-drift, both flipping to `gap=remedy-working` and getting skipped from suggestedFrontPage. Fix v1.1.0: word-boundary regex in keyword match + require category alignment between pattern and initiative + remove 'culture' fallback. Verified against `output/engine_audit_c92.json` — 'remedy-working' false-positives 2 → 0; affected patterns now correctly classified as `gap=no-mitigator`. Closed. Sibling `advance-initiative` remedy threshold calibration remains active in ROLLOUT_PLAN.

#### Sheet-hygiene blank-row delete — DONE S185 (engine-sheet)

`Simulation_Ledger` resized from 911 rows (header + 836 real citizens + 74 trailing blanks) to 837 rows (header + 836 real citizens). Service-account `resizeSheet` call. Last row verified as POP-00951 Niani Oakley (legitimate, from S184 female-balance ingest). 0 real citizens affected. Closed.

#### 9 new tier-2 canon firms → Business_Ledger — DONE S185 (engine-sheet)

All 9 firms appended at BIZ-00052 through BIZ-00060 via direct service-account write. Architecture firms cluster Downtown/Uptown/Lake Merritt; Construction firms in West Oakland/Jack London/Fruitvale. Headcount + salary + revenue scaled from real-world peer firms (Atlas Bay ≈ Perkins&Will Oakland office; Anchor Build ≈ Webcor; etc.). Total contribution: ~1,055 jobs + ~$867M aggregate revenue added to Business_Ledger. Key_Personnel left empty — editorial fills as named-citizen entities surface via storylines. Business_Ledger row count 52 → 61. Closed.

### Edition Production closures

#### HOLD: E92 raw edition ingest — UNBLOCKED S180 (functionally lifted)

Functionally lifted by `stripMetadataLeaks()` filter in `ingestEdition.js` (DONE S180; see ROLLOUT_PLAN changelog). Defense-in-depth strip catches scaffolding paths + audit-block markers at ingest time, so raw ingest of contaminated artifacts now produces clean canon. Desk-emission FIX (still active in ROLLOUT_PLAN as architectural fix — desks shouldn't emit audit blocks in body) remains the structural follow-up. Was URGENT, now LOW with safety net in place. Closed.

### Phase-level closure (Other Ready Work table)

#### Canon Fidelity Rollout — DONE S175

S174 reframe of the post-mortem + S175 completion. Three-tier framework ([[canon/CANON_RULES]] Tier 1 use real names / Tier 2 canon-substitute / Tier 3 always block) + per-agent four-file structure (IDENTITY + LENS + RULES + SKILL) + companion roster ([[canon/INSTITUTIONS]]).

- **Wave A (S174):** 8 agents (DJ, Mayor, civic-desk, civic-project-health-center, business-desk, civic-office-baylight-authority, civic-office-district-attorney, civic-project-transit-hub).
- **Wave B (S175):** 12 generators (chicago-desk, culture-desk, letters-desk, podcast-desk, sports-desk, freelance-firebrand, civic-office-crc-faction, civic-office-ind-swing, civic-office-opp-faction, civic-office-police-chief, civic-project-oari, civic-project-stabilization-fund).
- **Reviewer rebuild (S175):** 4 agents (rhea-morgan + city-clerk + final-arbiter Canon Fidelity Audit; engine-validator scope-noted N/A as code-only).
- **EIC application (S175):** mags-corliss SKILL.md updated for editorial writing.
- **Sports-history carveout (S175):** sports-desk relaxed to permit historical real-MLB figures as franchise context per Mike's sports-universe-laxer policy; current real players outside canon roster remain tier 3.
- **Validation (S175):** 5 trap-test invocations passed (culture/opp/oari standard pattern + sports-desk Hal historical-MLB carveout + ind-swing split-not-bloc).

Framework operational across all 24 content-generating + content-reviewing agents. Directly addressed C92 reframe priority 1 (agent layer for infrastructure-in-place). Framework reasoning save: Supermemory mags doc `XJi6whXEyPehdN6oDS97hQ`. Plan: [[plans/2026-04-25-canon-fidelity-rollout]].

**S186 follow-up (lives in active ROLLOUT_PLAN):** Read-Time Contamination Check added to CANON_RULES.md + 23-agent RULES.md refresh, motivated by Perkins&Will scrub. The canon-fidelity rollout itself is closed; the read-time extension is a regression-class enhancement on top.

---

## S198 Archive Pass (2026-05-03)

### Wave 3 Engine-Sheet Handoff Bundles — DONE S197

S197 research-build → engine-sheet handoff cluster. 8 bundles grouping ~25 cross-cycle gaps. Research-build wrote bundle specs to ROLLOUT (commit `374d7a9`); engine-sheet shipped all 8 same day in 16 commits to origin/main. ~22 gaps closed in code; `resolveCitizens` Sr./Jr. tokenizer surfaced + parked as separate gap (still active in ROLLOUT_PLAN §Data & Pipeline). Plan: [[plans/2026-05-03-c93-gap-triage-execution]] §Wave 3. Parent triage frame: [[plans/2026-05-03-c93-gap-triage-execution]].

#### BUNDLE-A — Format contract enforcement on .txt outputs (HIGH) — DONE S197 (engine-sheet)

Closed 4 HIGHs sharing one root: G-W19 (compile template ↔ parser format mismatch — Wave 1 closed text side, BUNDLE-A closed code side), G-P6 (BUSINESSES NAMED missing from compile), G-P8 (CITIZEN USAGE LOG emitted instead of NAMES INDEX), G-P9 (downstream parsers silently no-op or false-pass on missing sections — **3 new citizens + Atlas Bay Architects firm + Greater Hope Pentecostal Church silently dropped from C93 intake**). **Shipped:** (a) `scripts/emitFormatContractSections.js` (NEW, ~530 LOC) — parses rich CITIZEN USAGE LOG into strict NAMES INDEX (POP-/CUL-/FAITH- prefixes) + BUSINESSES NAMED, idempotent `--inject` mode (replace not append, re-runs converge); also exports library API for ingest fallback; (b) `/write-edition` Step 3a wired into compile, format-contract trailer expanded with all three required footer sections; (c) `scripts/ingestPublishedEntities.js` CUL fallback path for backfill replay of pre-S197 editions (cross-prefix POP/FAITH dedupe + biz NEW resolution); (d) `scripts/verifyNamesIndexParse.js` `--strict` flag (missing-section = exit 1) + CUL fallback diagnostic count; (e) `/post-publish` Step 5 SKILL.md updated to invoke `--strict`. **Skipped:** `scripts/rateEditionCoverage.js` — bundle spec listed it but it parses article bodies for tone analysis (not NAMES INDEX); has no actual format-contract dependency. **Surfaced + parked for separate gap:** `resolveCitizens` last-name-suffix tokenizer treats "Sr."/"Jr." as last name (Calvin Reeves Sr. → first=Calvin, last=Sr., middle=Reeves); outside BUNDLE-A scope. **Acceptance verified on C93 fixture:** all 5 cited entities surface (Vivienne Torres POP-00963 + Diane Foster POP-00965 + Thomas Webb POP-00966 as new candidates; Atlas Bay Architects matched-existing in Business_Ledger; Greater Hope Pentecostal as FAITH-NEW in culturalOnly bucket). Both paths converge — un-injected E93 via CUL fallback yields 43 entities; post-`--inject` strict-path ingest yields the same 43.

#### BUNDLE-B — MCP citizen verification + queryLedger env restoration (HIGH) — DONE S197 (engine-sheet)

Closed 6 HIGHs across two distinct root causes (the bundle conflated them; investigation split them apart). **Root cause 1 — env loader miss:** `scripts/queryLedger.js` (G-S10) and `scripts/rateEditionCoverage.js` (G-P7) require `lib/sheets` (which expects `process.env.GODWORLD_SHEET_ID`) but never load `lib/env`. 13 other sheets-using scripts do; these two were drift. Fix: added `require('/root/GodWorld/lib/env')` at file top in both. **Root cause 2 — MCP query mode/threshold + truesource shape:** legacy MCP tools (lookup_citizen, search_world, get_neighborhood, get_council_member) queried Supermemory with default mode (`memories`) + threshold (0.6) — citizen / council / neighborhood cards are short structured records below that threshold. wd-* domain tools shipped S183 use hybrid+0.3 specifically to surface them; legacy tools were missed. Plus `get_roster` (G-S8) walked `truesource_reference.json` expecting flat-list-of-players, but truesource is a top-level dict with team-keyed sub-lists (`asRoster`: list[90]). **Shipped:** (a) lookup_citizen / search_world / get_neighborhood — all switched to mode='hybrid', threshold=0.3; lookup_citizen now queries wd-citizens directly first, then world-data + bay-tribune for breadth; (b) get_council_member — reads `output/desk-packets/truesource_reference.json` `council` key directly, returns structured fields (name/district/faction/status) + supermemory narrative for canon history, with full council listing on no-match; (c) get_roster — explicit team-variant → roster-key map (`as`/`a's`/`athletics`/`oakland` → `asRoster`), reads list directly, renders with POPID + tier + status; (d) MCP server `load_dotenv` path corrected to canonical `/root/.config/godworld/.env` (was looking at non-existent `<repo>/.env`). **Acceptance verified:** `lookup_citizen("Patricia Nolan")` → POP-00729 + appearance history; `get_council_member('D4')` → Vega structured + canon; `get_council_member('Vega')` → name-match works; `get_roster('as')` / `get_roster('athletics')` / `get_roster('oakland')` → 90 A's players; `unset GODWORLD_SHEET_ID && node scripts/queryLedger.js citizen POP-00729` → Patricia Nolan profile from Simulation_Ledger. **Note:** MCP server changes take effect on next Claude Code session boot (process restart). Current session still runs the pre-fix MCP; verification used direct python module import to bypass the running server.

#### BUNDLE-C — validateEdition.js last-name-collision plague (HIGH) — DONE S197 (engine-sheet)

Closed G-W22. **C93 result: 99 critical → 0 critical** (16 warnings, all real-signal — "shares last name with X — verify"). Three fixes in `scripts/validateEdition.js`: (1) shared `severityForLastNameMismatch` helper across checkCouncilNames + checkCivicOfficeNames + checkPlayerFirstNames — CRITICAL only when official's full name appears AND foundFirst+LastName pair appears <2 times (single-occurrence + canonical full name present = typo signature; recurring foundFirst+LastName = real different person sharing last name); WARNING otherwise. Spec called for (a) full-name match first + (c) demote to WARNING — both shipped, plus single-vs-multiple-occurrence refinement that distinguishes typos from genuine recurring characters. (2) Removed stale cycle-related ENGINE_TERMS patterns (`cycle \d+`, `this cycle`, `next cycle`, `single-cycle`) per `.claude/rules/newsroom.md` S146 reversal — they produced 70 of 77 critical findings on E93, every one a false positive against the canonical "cycle is allowed and encouraged" rule. (3) Mayor regex uses negative-lookbehind for Deputy/Vice/Acting/Former prefixes (was matching "Mayor Brenda" inside "Deputy Mayor Brenda Okoro"); added "Member" + "Deputy" to checkCouncilNames skipWords (was matching "Member Crane" in "Council Member Crane"). Spec called for fixes (a)+(c); shipped those plus the cycle-language patterns and Deputy-prefix exemption since they were the same false-positive class hitting the same script. **Surfaced + parked for separate gap:** ENGINE_TERMS patterns 50-72 are still strict on real engine language — Rhea's verification lane still catches "tension score", "civic load", "Edition 93", etc. That's correct. Re-tier policy review: any ENGINE_TERMS pattern that fires on legit reporter language could fold into BUNDLE-C-style WARNING demotion, but no other pattern surfaced in C93 as false-positive-heavy.

#### BUNDLE-D — assembleDecisions.js script build (HIGH) — DONE S197 (engine-sheet)

Closed G-R14. Shipped `scripts/assembleDecisions.js` (NEW, ~210 LOC — exceeds bundle estimate of ~120 because attribution + tie-break heuristics needed more nuance). C93 dry-run produces 6 decisions files matching the manual hand-assembly outputs across all 6 initiatives. **Three-stage initiative attribution fallback** (`trackerUpdates.initiative` → topic-keyword inferrer → `relatedInitiatives[0]` → project-file basename) handles voice-agent data drift like Vega's STMT-93-IND-VEGA-001 carrying `relatedInitiatives: ['INIT-006']` when topic `transit-nov-8-vote` clearly indicates INIT-003. **Two priority refinements** for primary-voice picking: vote-position boost (council voting voice outranks project owner on vote-pending initiatives — Vega beats Soria Dominguez on Transit Hub) + explicit-tu-init tiebreaker (+0.5 — operational directive outranks contextual mention when both Mayor statements attribute to same initiative; MAYOR-003 beats MAYOR-002 on Stab Fund). **Acceptance verified:** all 6 primary-voice picks match the manual reference (INIT-001 → MAYOR-003, INIT-002 → MAYOR-006, INIT-003 → IND-VEGA-001, INIT-005 → MAYOR-001, INIT-006 → MAYOR-005, INIT-007 → MAYOR-004). /city-hall Step 6 now `node scripts/assembleDecisions.js <cycle> --apply`. **Surfaced upstream gap not in BUNDLE-D scope:** ind_swing voice agent should set `relatedInitiatives` correctly to match the topic — flagged as separate gap for Wave 4 RULES hardening or G-R6/R7/R10 follow-up.

#### BUNDLE-E — PDF respects editorialFlag + 3-strike abort (HIGH+MED) — DONE S197 (engine-sheet)

Closed G-PR12 + G-PR15 in two paired changes. **Read side (G-PR12):** `scripts/generate-edition-pdf.js` now loads each photo's `.meta.json` sidecar and filters the manifest before rendering — `dropped: true` silently skips with [DROPPED] log; `editorialFlag: true` skips with stderr [FLAGGED] WARN unless `--include-flagged` is passed. Photo count line in stdout reflects the skip state. Mesa-class manual workaround (operator-edited `dropped[]` field in manifest.json) no longer needed; sidecar metadata is sufficient and authoritative. **Write side (G-PR15):** `scripts/generate-edition-photos.js` regen-on-fail loop now caps at `REGEN_MAX_RETRIES = 2` (was 1), totaling 3 attempts (initial + 2 retries). After exhausting retries with FAIL still on verdict, the sidecar gets `dropped: true`, `droppedReason: <last QA summary>`, `droppedAfterAttempts: 3`. Legacy `editorialFlag: true` is also set for backward compat with any tooling that already reads it. `regen_log.md` records per-attempt verdict trail and final `DROPPED (3-strikes)` disposition. **Acceptance verified on E93 fixture (synthetic):** setting `dropped: true` on a sidecar drops the photo from PDF input (4 of 5 ship); setting `editorialFlag: true` skips with WARN (4 of 5 ship); `--include-flagged` overrides to ship all 5. Mesa-class 3-strike FAIL would now drop automatically without editorial intervention.

#### BUNDLE-F — buildCitizenCards.js 401 + retry-on-401 anti-pattern (HIGH) — DONE S197 (engine-sheet)

Closed G-P24 with two paired fixes in `scripts/buildCitizenCards.js`. (1) **writeMemory retry policy revised.** 401 → FAIL-FAST (was: retry 3× at 8s = 32s wasted per failed card across 575 attempts in C93). 429 + 5xx → retry up to 3× (transient). Other 4xx → fail-fast. The pre-S197 S182 hardening conflated rate-limit and auth ("Supermemory sometimes returns 401 instead of 429 under load") — bundle spec correctly identifies this as wrong: 4xx is permanent. If Supermemory truly returns rate-limit-as-401, the right fix is upstream (better backoff spacing or Supermemory-side support ticket), not retries that hide auth bugs. (2) **Pre-flight `authProbe()` in APPLY mode.** Single `/v3/documents/list` request validates the API key + write surface before any bulk write begins. 401 → fatal abort with clear message ("SUPERMEMORY_CC_API_KEY is invalid or has no write scope on this org"). Other non-200 → WARN + proceed. **Per-25-card progress logging** was already in place from a prior session (line 568-571); bundle spec (d) was a no-op. **Acceptance verified:** with `SUPERMEMORY_CC_API_KEY=sk_fake_for_test`, run aborts within seconds at "[FATAL] Auth probe returned 401" — pre-fix this would have burned ~5 hours of retry-loop across 575 cards. Real-key 836-card runs are unaffected; probe takes ~500ms. **Carry-forward note from old ROLLOUT entry:** the "until BUNDLE-F lands, sift Step 4 should bias toward bay-tribune over world-data citizen cards" guidance can be lifted next cycle if buildCitizenCards completes a full --apply run cleanly. Note: BUNDLE-B's hybrid+0.3 fix in `lookup_citizen` likely makes wd-citizens cards usable again regardless of buildCitizenCards completeness; the two fixes are complementary (B fixes the read path, F fixes the write path).

#### BUNDLE-G — gradeEdition.js + gradeHistory.js rebuild (HIGH+MED) — DONE S197 (engine-sheet)

Closed 5 gaps in `scripts/gradeEdition.js` + `scripts/gradeHistory.js`. **Mara grade reader (G-P14):** `parseMaraGrade` extended to read `output/mara_report_c<XX>.json` (current Mara pipeline shape) before falling back to legacy `mara_directive_c<XX>.txt`. Three-tier extraction: explicit `report.grade` field → `report.notes` regex → score-band derivation (0.95+→A, 0.85+→A-, 0.80+→B+, etc.). Regex uses `(?![A-Za-z])` not `\b` (the latter fails after optional `-` in `[+-]?` and would backtrack "A-" → "A"). C93 result: "Mara grade: A-" (was: "not found"). **ARTICLE TABLE parser (G-P15):** new `parseArticleTable(text)` reads pipe-separated rows from the structured ARTICLE TABLE section into canonical `{num, section, headline, reporter, desk}` records. `gradeEdition()` prefers table-parsed list over body-byline parser when table is non-empty; merges via reporter + headline match. C93 result: 12 articles (was: 7) — table-side recovered all 5 missed pieces (Mags Editor's Desk + Quick Take + Hal's Oakland Oaks + others). **Active-desks-only grading (G-P16):** `gradeEdition()` restricts grading to desks that actually shipped articles this cycle. Was: graded all STANDARD_DESKS regardless, producing hallucinated B+ on chicago / letters when those desks contributed nothing. Now: 7 active desks for C93 (civic/business/culture/sports/letters/editor/freelance); chicago excluded. **Reporter normalization (G-P17 + G-P18):** added `REPORTER_ALIASES` + `normalizeReporter()` to both gradeEdition.js and gradeHistory.js. Maps Mags / Margaret / M. Corliss / Margaret Corliss → canonical "Mags Corliss"; Dr. Lila Mezran → Lila Mezran; "Various citizens"/"Letters Desk"/"Anonymous" → null (skip). gradeHistory collapses aliases at merge time so past grades files keyed under different byline conventions surface as one reporter. C93 result: "Mags Corliss A rolling: A (stable) [editor]" single entry. **Acceptance verified:** all 5 sub-gaps close on C93 fixture re-run.

#### BUNDLE-H — postRunFiling.js manifest update + saveToDrive photo upload + path-arg audit (MED) — DONE S197 (engine-sheet)

Closed G-P22 + G-PR18. **postRunFiling.js (G-P22):** checklist refreshed to pipeline-v2 outputs. Dropped 6 stale `output/desk-output/<desk>_c<cycle>.md` entries (pipeline-v1 paths that no longer exist — reporting MISSING every cycle was the false-alarm signal). Added a new `glob-children` checklist type that walks `output/reporters/<reporter>/articles/` for `c<cycle>_*.md` matches (pipeline-v2 per-reporter article shape). Demoted Edition PDF + Edition photos from required:true → required:false (`/edition-print` is opt-in per S188+; not all cycles run print). C93 fixture re-check: 6 missing → 1 missing. The 1 remaining missing (`mara-audit/edition_c93_for_review.txt`) is a REAL C93 gap (Mara reviewed out of pipeline order per S195 SESSION_CONTEXT note), not manifest staleness — script correctly reflects reality. **saveToDrive.js (G-PR18):** chose path-(b) honest-doc + script-alignment over path-(a) photo-upload implementation. Docstring header updated to state PDF-only scope explicitly + reference G-PR18 closure rationale. Defensive directory check at runtime: passing a directory path exits 1 with explicit error message + pointer to BUNDLE-H rationale, instead of throwing opaque EISDIR. Wave 1 already aligned the SKILL.md side; this commit aligns the script side. **Path-arg audit:** verified postRunFiling.js takes `<cycle>` as positional + `--type/--slug` flags (matches Wave 1 G-P19 SKILL.md pattern); no further changes needed. **Acceptance:** C93 re-run with new checklist surfaces real-state-only signal (1 actual gap surfaced; pre-fix had 6 stale entries masking it). Photo upload path remains a clear extension point if needed in a future cycle.


## S201 Archive Pass (2026-05-04)

### Dispatch C92 Gap Follow-ups — DONE S189

Plan: [[plans/2026-04-30-dispatch-gap-followups]]. Closed S189 across 11 items; ROLLOUT pointer carried "7 engine-sheet items remain active" 12 sessions after closure, surfaced + cleared via S201 triage sweep.

**Research-build (R1-R4) DONE S189:** `/dispatch` SKILL.md `lookup_cultural` one-liner + EDITION_PIPELINE format spec CUL-ID enumeration with "one entity per line" rule + Step 0 auto-resolve eval documented inline + PDF visual review (surfaced E5a/b/c render bugs).

**Engine-sheet (E1-E8) DONE S189 — 6 commits to origin/main:**

- `e83a5a3` E1 — `ingestEditionWiki.js` standalone NAMES INDEX section parser (accepts pipe form `<ID> | <Name> | <Role>` with POP-/CUL- prefixes per [[EDITION_PIPELINE]] §Per-section content spec + bullet em-dash form). Fail-loud guard: NAMES INDEX with non-empty content but parser extracts zero entities → exit 1 (eliminates "0 entities — pure-atmosphere artifact" silent-failure pattern).
- `15e7f3e` E2 — `ingestPublishedEntities.js` parseNamesIndex reshaped (3 row shapes: T1 strict bullet, T1 strict flat, pre-T1 freeform). POP- routes through Sim_Ledger; non-POP (CUL-/BIZ-/FAITH-) collects in `culturalOnly` bucket — logged + JSON output, NOT appended to Simulation_Ledger.
- `e9b0d37` E3 — `ingestEditionWiki.js` filename-fallback `--cycle` extraction (format-contract pattern `^cycle_pulse_\w+_(\d+)_.+\.txt$` for any type, falls back to in-text "EDITION N" / loose digit only for editions). New `[CYCLE]` startup log line names resolution source.
- `6c2f45a` E4 — `postRunFiling.js --type {edition|dispatch|interview|supplemental}` flag + `--slug` flag. `buildNonEditionChecklist(type, cycle, slug)` ships minimal expected set per [[EDITION_PIPELINE]] §Filename contract. Manifest path type-aware (`run_manifest_<type>_c<cycle>_<slug>.json`).
- `c20bb3d` E5a/b/c — single-fix-three-bugs PDF parser. Root cause: `lib/editionParser.js` `isSectionNameChunk` only excluded chunks STARTING with `|`; dispatch `POP-XXXXX | Name | Role` rows misclassified as section names. Fix: `chunk.indexOf('|') >= 0 → return false`. Plus all 4 tracking sections (NAMES INDEX, CITIZEN USAGE LOG, BUSINESSES NAMED, ARTICLE TABLE) classified `meta` → skipped from visible PDF entirely (internal metadata, not reader-facing).
- `a805e76` E8 — `scripts/verifyNamesIndexParse.js` helper (counts non-separator non-empty NAMES INDEX rows in source `.txt`, optional `--expected <N>` compare, exit 1 with diagnostic on mismatch). Defense-in-depth complement to E1/E2 fail-loud guards. Wired into `/post-publish` SKILL.md Step 5 verification gate by research-build.

**E6 cultural-card refresh:** engine-sheet helper `scripts/buildCulturalCards.js` already shipped S182 (521 lines, `--cul CUL-XXXXX` flag for single-figure refresh, writes to `wd-cultural`/`world-data` with proper `cul_id` metadata). Research-build wired into `/post-publish` SKILL.md v1.4 — new substep `2a-cul. Refresh cultural cards` (matrix-✓ for dispatch/interview/supplemental when CUL-IDs in NAMES INDEX). Per-CUL-ID `buildCulturalCards.js --apply --cul <CUL-ID>` after citizen card pass.

**E7 Marin Tao BirthYear:** CLOSED-NO-ACTION — investigation found POP-00537 already carries `BirthYear=2009` (age 32 under 2041 anchor). Mike accepted as canon. No sheet edit, no card rebuild.

**Acceptance:** all 7 plan acceptance criteria verified on canonical fixture `editions/cycle_pulse_dispatch_92_kono_second_song.txt`.


## S202 Archive Pass (2026-05-05)

Audit + closure pass on active ROLLOUT entries that had self-declared DONE in their bodies but had not yet moved to archive. 18 entries archived across 4 sections plus 2 phase-level closures. ROLLOUT_PLAN active drops ~60 lines without losing closure detail.

### Edition Post-Publish closures

#### Discord bot edition currency Task 5 — DONE S190

Plan: [[plans/2026-04-26-discord-bot-edition-currency]]. Tasks 1-4+6 DONE S184. Task 5 closed S190: `.claude/agents/letters-desk/RULES.md:50` + `.claude/agent-memory/letters-desk/MEMORY.md:12` now reference `output/production_log_edition_c{XX}.md` Story Lineup section instead of deleted `latest_edition_brief.md` (S184 deletion). All 6 tasks of the Discord bot edition currency plan now closed.

#### WIRE: `ingestPlayerTrueSource.js` into a skill — DONE S201 (engine-sheet)

Path (a) chosen — `/post-publish` substep `2d. Refresh A's player truesource — incremental sweep` added between Step 2c world-summary and Step 3 civic wiki. Invocation: `node scripts/ingestPlayerTrueSource.js --apply --skip-subfolder --include-flat --include-prospects` (flag set per ROLLOUT acceptance — `--skip-subfolder` because Pass A bootstrap shipped S180 commit `c15050f`, `--include-flat --include-prospects` for full MLB + Top_Prospects coverage). Per-type matrix updated: ✓ edition, — interview, ✓ supplemental, — dispatch (interview + dispatch rarely surface MLB roster changes; manual re-run available if needed). Verification gate: per-player ingest count + POPID resolution table to stdout, `output/intake_player_truesource.json` written, failures surface in production log Step 12. Path (b) /sync-truesource skill not built — script's existing manual-run flags (`--apply --include-flat --include-prospects` without `--skip-subfolder`) cover the deliberate-bootstrap case if needed.

#### FIX: validateEdition.js false positives — DONE S197 (BUNDLE-C, verified S199 d9763ca neighborhood)

96% false-positive rate in E91 dropped to ~0% via: (a) last-name tier with full-name presence check (`scripts/validateEdition.js:92,188-199` — CRITICAL only when council member's full name absent from text + first-name token doesn't match; otherwise downgraded to NOTE — handles Maria Reyes vs Marcus Carter vs Vanessa Tran-Muñoz vs Bobby Chen-Ramirez vs Priya Patel last-name collisions); (b) cycle-language patterns removed (S146 reversal, line 46-48); (c) extended title lookbehind list including Deputy/Vice/Acting/Former (line 183-186) so "Deputy Mayor X" doesn't false-positive against Mayor Santana. Verified live in code. Closes the MEDIUM and the related S195 HIGH G-W22 (last-name-collision plague: ~95% false positives).

#### DISPATCH C92 GAP FOLLOW-UPS — DONE S189 (pointer cleanup)

Already archived in detail under §S201 Archive Pass (above) — Plan: [[plans/2026-04-30-dispatch-gap-followups]], 11 items closed, 6 commits `e83a5a3` + `15e7f3e` + `e9b0d37` + `6c2f45a` + `c20bb3d` + `a805e76`. Stale-pointer carrying "7 engine-sheet items remain active" was cleared S201; this S202 pass removes the residual active-rollout entry that pointed at the S201 archive.

#### Wave 3 — Engine-Sheet Handoff Bundles (S197 research-build → engine-sheet) — DONE S197

Detail already in §S198 Archive Pass (above) — all 8 bundles A-H shipped S197 closing ~22 cross-cycle gaps in 16 commits. Research-build wrote bundle specs in commit `374d7a9`; engine-sheet shipped all 8 same day. S202 removes the residual ROLLOUT header that pointed at the S198 archive. **Surfaced + parked separately as still-active engine-sheet work:** `resolveCitizens` Sr./Jr. tokenizer fix — closed S199 d9763ca, archived in this S202 pass (Data & Pipeline below).

#### C93 GAP TRIAGE EXECUTION PLAN — DONE across all 5 waves (S197+S198)

Plan: [[plans/2026-05-03-c93-gap-triage-execution]]. Cross-cycle triage frame across 115 C93 gaps spanning 6 sidecar logs.

- **Wave 1** DOC-drift sweep (~15 gaps closed) — DONE S197 commit `279b290`
- **Wave 2** canon RULES hardening (~7 gaps closed) — DONE S197 commit `cd89cc5`
- **Wave 3** engine-sheet handoff bundles A-H (~22 gaps closed in code) — DONE S197, archived S198
- **Wave 4** 3 architectural design plans — all closed S198: [[plans/2026-05-03-vote-trigger-mechanism]] REWRITTEN as engine-sheet wiring handoff (engine owns vote resolution; original /council-vote skill design retired; engine-sheet shipped v1.9 fix S199), [[plans/2026-05-03-run-cycle-gap-log-surface]] REWRITTEN with all 4 Q's closed (engine-sheet MDs rule loosened wholesale; coder-persona hybrid; 8-class taxonomy; engine-sheet shipped Phase 2 S199), [[plans/2026-05-03-rollout-triage-cadence]] BUILT S202 (Phase 2 backfill + Phase 3 tooling + Phase 4 validation)
- **Wave 5** FLUX text-suppression ceiling research note — DONE S197 commit `e62133e` in `docs/RESEARCH.md` §S197

Acceptance met: every gap-log `Status:` line moved from `logged` to closed-state. ~30 LOW gaps remain unwaved (opportunistic close during related work). Six individual sidecar gap logs (city-hall-prep S192, sift S194, write-edition S195, edition-print S196, post-publish S195, city-hall-run S193) stay active in ROLLOUT — they hold the un-promoted LOW remainder.

#### DEDICATED SESSION: Perkins&Will C92 contamination scrub — SCRUB-SIDE DONE S186, civic implicit-pass S193

S186 closed the entire scrub-side workload in one session. **Canon-fidelity rule:** §Read-Time Contamination Check added to `docs/canon/CANON_RULES.md`; 23-agent RULES.md refresh (20 generators with Read-Time Contamination Scan block + 2 reviewers with Read-Time Contamination Audit block + final-arbiter with Read-Time Contamination Propagation block). **Layer 1 live signal:** 7 files + 3 desk packets scrubbed; `buildDeskPackets.js 92` re-ran clean post-sheet-edit (sheet cell handled by Mike directly). **Layer 2 canonical historical:** 7 files scrubbed (edition.txt + 4 reporter briefs/articles + 2 PDFs). **Layer 3 audit corrigendum:** 3 files (Mara review + Rhea .json + Rhea .txt) carry top-of-file `[CORRIGENDUM C92→post-scrub S186]` with body preservation. **Bay-tribune chunked re-ingest:** old `T1KLnnJSqNybHsEjxt3gVM` (Part 1, 2 hits) + `i9gbnZLtb7sZBjX3KuxzYY` (Part 2, 3 hits) DELETE'd; new clean `NnpkqYpTwnKAm1qyxN5Xag` (Part 1) + `SCZcxjcMkrK4CW41tufWJd` (Part 2) ingested via `node scripts/ingestEdition.js`. **Verification:** `grep -c Perkins` returns zero across all Layer 1+2 files; bay-tribune full-content audit returns 0 literal Perkins across 9 search-surfaced docs; Layer 3 audit bodies retain Perkins with corrigendum block at top. **Civic smoke-test residual:** `/city-hall` C93 ran S193 with no Perkins/Will references surfacing in any voice JSON or production-log artifact — implicit smoke-test pass. Architectural follow-up filed: Bay-tribune unified ingest rebuild applying S183 `wd-` pattern (still active in ROLLOUT, motivated by the scrub friction). Original full plan: mags `WL8kvoxQgmcvxSPW3Ph47n`. Connects to S175 Canon Fidelity Rollout (regression case).

### Data & Pipeline closures

#### CLEANUP: Generator-side case discipline for `ev.domain` — DONE S199 (commit `23b3303`, recordWorldEventsv3 v3.6 → v3.7)

Picked option (a)+ — UPPERCASE end-to-end (matches dominant 209-row state + reader expectations). Audit found 3-layer inconsistency: writers UPPERCASE, internal lookups (domainMap/domainNeighborhoods/deriveEventType) Title Case, readers UPPERCASE. Internal Title Case silently mismatched UPPERCASE incoming domains, breaking per-domain neighborhood pool selection AND eventType classification (root cause of Row 6's 91% misc-event Domain side — S184 closure addressed citizen attribution via LifeHistory_Log but left this side broken). 5 changes in single file: domainMap values / domainNeighborhoods keys / deriveEventType comparisons all UPPERCASED, defensive `String(...).toUpperCase()` at domain pickup site, header bump. 4 historical Title Case rows left as-is (orphaned but harmless).

#### FIX: `resolveCitizens` Sr./Jr. suffix tokenizer — DONE S199 (commit `d9763ca`)

Trailing `Sr.`/`Jr.`/`II`/`III`/`IV` (with or without dot) is now stripped from `nameTokens` before first/last/middle picking; suffix appended back to `last` for new-citizen candidate rows so display + ledger stay aligned; lookup key uses the stripped form so an existing "Calvin Reeves" row matches a "Calvin Reeves Sr." input (correct default for editorial ingest where editor almost always means same person; generational duplicates still land via POP-ID path which skips name lookup). Verified against 9 representative inputs incl. Bishop Calvin Reeves Sr., Maria Elena Reyes Jr., John Smith III. Unblocks /post-publish C93 retry --apply backfill.

#### AUDIT: `Math.random` engine sweep — DONE S199 (commit `2c7397f`)

All 13 hits classified as false-positives — every one was inside a `/** ... */` JSDoc changelog block describing the S156 fix (e.g., "Replaced Math.random() with ctx.rng", "Falls back to Math.random()"), not an actual invocation. Filter tightened with `if (/^\s*\*/.test(line)) return;` to skip JSDoc star continuation lines. After fix: 0 real hits across phase01-phase10; engine.md S156 Phase 40.3 closure stands. C93 audit baseline drops 23 → 22 entries (HIGH 7 → 6).

#### AUDIT: engineAuditor 1.0.0 cyclesInState measurement-window bug — DONE S199 (commit `30d0e0f`)

Diagnosis correction: not a "wrong column" bug. The actual issue was a missing phase-match check in `detectStuckInitiatives.detect()` — the per-prior-audit loop trusted `prev.cyclesInState + 1` without verifying phase still matches, so a phase transition (INIT-003 vote-scheduled C92 → vote-ready C93) inherited the stale stuck count from the prior phase. Fix: guard carry-forward with `prevPhase === phase`. Synthetic verification (C92 audit as prior + queryLedger-confirmed C93 row state): INIT-003 89 → 7 (correctly resets after phase transition); INIT-001/002/005/006 unchanged (phases stable, counts honest measurement of audit-window stuck-time). Downstream `engineCycleAudit.js` cross-cycle-debt severity scaling (≥30 HIGH / ≥5 MED) now sees INIT-003 at MED instead of false HIGH. Node-only fix; no clasp push.

### Infrastructure closures

#### `/doc-audit` never-audited cleanup — DONE S187 (research-build) — MEDIUM

Infra (14 docs, 5 fixes), Data (6 docs, 2 fixes + 3 engine-sheet handoffs), Persona (18 docs, 2 fixes + 6 Mara/Mike handoffs flagged). Total: 38 docs audited under v2.0 first pass; 9 fixes applied; 10 cross-terminal handoffs flagged in tracker for Mara/Mike/engine-sheet. **Active follow-ups still tracked in ROLLOUT** as separate entries: (a) Mara-vance handoffs from persona audit (LOW), (b) engine-sheet ledger doc handoffs from data audit (now also DONE S199+S201, archived in this pass below). Tracker entries in `.claude/skills/doc-audit/SKILL.md`.

#### HANDOFF: Engine-sheet ledger-doc refresh — DONE S199+S201 (closure pass)

(1) **LEDGER_AUDIT.md DONE** (commit `250d06e`) — full S199 refresh via `auditSimulationLedger.js`; 836 rows / POPID → POP-00951; Row 17 sentinel verified closed. S201 Status enum drift closed (151 lowercase → 826 Active + 9 Retired + 1 Recovering). (2) **SCHEMA_HEADERS.md DONE** (commit `250d06e` regen, S201 regen post-header-drift-fix `a05e5f6`) — 1416 lines / 57 tabs reflecting Story_Seed_Deck 12-col + Story_Hook_Deck 21-col post-fix. (3) **LEDGER_HEAT_MAP.md DONE** — S199 Heat Rankings refresh; S201 `37cec06` Top Bloat Risks §1 (LifeHistory_Log: archive script SHIPPED S31 / compression SHIPPED S116) + §2 (Sim_Ledger LifeHistory col reclassified RED→YELLOW post-compression) + §Archival Strategy §Priority 0 added (Story_Seed_Deck archive SHIPPED+RAN S201 — 2,667→1,109 active / 1,558 archived). **S202 closure pass `8426d0e`** — §Dead Column Inventory + §Column Cleanup Roadmap re-audited live: 4 stale entries corrected (Event_Arc_Ledger N-S not "N-O,R", Storyline_Tracker I-N not J-N, Citizen_Media_Usage G-L not F-K, LifeHistory_Log §1 body claim "9→7" reversed); 2 sheets schema-shrunk (Storyline_Intake/Citizen_Usage_Intake); 2 col counts corrected (Press_Drafts 14→20, Simulation_Ledger 20→47); Story_Seed_Deck/Story_Hook_Deck flipped RESOLVED in tables; audit-tooling visibility note added (Press_Drafts hidden in spreadsheet → exportSchemaHeaders.js skips per utilities/exportSchemaHeaders.js:150). (4) **LEDGER_REPAIR.md DONE S199** (commit `215ba1c` — A-AT→A-AU, flipped from "still open" S201 triage). (5) **NEW S201 — engine routing header drift FIXED** (commit `a05e5f6`). Story_Seed_Deck + archive + Story_Hook_Deck had v3.4/v3.5 schema drift causing engine-computed routing data (suggestedJournalist/suggestedAngle/voiceGuidance/matchConfidence) to land under stale calendar header labels. Renamed cols + deleted orphans + scrubbed 469 stale pre-v3.4 rows (335 archive + 134 hooks). 1108/1109 active seeds now carry valid journalist match (95% high-confidence, top: Simon Leary 838 / Maria Keen 160 / Luis Navarro 38). Unblocks `buildDeskPackets:2472` + `buildMediaPacket:209` consumers + opens path for /sift to consume engine pre-routes as default signal.

#### `/diagnose` skill — DONE S190 (research-build)

Shipped at `.claude/skills/diagnose/SKILL.md`. Six-phase loop (feedback loop / reproduce / hypothesise / instrument / fix+regression / cleanup+post-mortem) adapted from MIT-licensed `mattpocock/skills/engineering/diagnose/SKILL.md` (Matt Pocock 2026) with attribution preserved. Localized to GodWorld surfaces (engine scripts, MCP tools, dashboard API, dispatch fixtures, Supermemory tags). Disambiguated from `/self-debug` (agent is failing thing → that skill) at the top. GodWorld-specific examples for dispatch parser bug (S188 #4/#5) and Discord bot edition currency (S180). Inbound link: TERMINAL.md Engine Health Skills table.

#### `disable-model-invocation` audit across 45 skills — DONE S190 (research-build)

40 deliberate-invocation-only skills carry `disable-model-invocation: true` (was 18 pre-audit; +22 added S190 + session-end fixed false→true). 5 stay flagless for auto-fire on inferred relevance: `context-budget` (heavy-context trigger), `diagnose` (broken/throwing/failing trigger), `doc-audit` (staleness questions), `health` (engine-feels-off trigger), `self-debug` (agent-stuck trigger). Decision frame: heavy/write/ceremony skills → flagged; scan/read/structured-trigger skills → flagless. Each skill's flag state is now a deliberate decision recorded in its own frontmatter.

#### `/self-debug` skill — DONE S187 (research-build) — HIGH

Shipped at `.claude/skills/self-debug/SKILL.md` (~150 lines). Four-phase loop (Capture / Diagnose / Contained Recovery / Introspection Report) for when the agent is the failing thing. Adapted from MIT-licensed `affaan-m/everything-claude-code/agent-introspection-debugging` (Affaan Mustafa 2026) with attribution preserved. ECC cross-references swapped for our skills (`/diagnose`, `/grill-me`, `/boot`); GodWorld-specific recurring patterns section added (S122 / S128 / S135 / S168 / S187). Inbound link: `.claude/rules/identity.md` Anti-Loop section now points at `/self-debug` as the structured response when patterns match.

#### `/context-budget` skill — DONE S187 (research-build) — MEDIUM

Shipped at `.claude/skills/context-budget/SKILL.md` (~210 lines). Token-overhead audit across `.claude/agents/`, `.claude/skills/`, `.mcp.json`, `.claude/rules/`, CLAUDE.md, MEMORY.md, CONTEXT.md. Adapted from MIT-licensed `affaan-m/everything-claude-code/context-budget` (Affaan Mustafa 2026) with attribution preserved. Localized to GodWorld component shape: 25-agent four-file canon-fidelity stack, path-scoped rules with `identity.md` always-loaded, MEMORY.md size-threshold flag (we hit 25.9KB on close S187), CONTEXT.md per ADR-0001, terminal-scoped persona levels factored into baseline math. **First-audit-run executed S190** (~24K always-loaded baseline; MEMORY.md flagged + fixed in same session); skill body describes the process for repeat runs.

### Other Ready Work closure

#### `/md-audit` skill — Phase 1+2 DONE S189

Plan: [[plans/2026-04-21-md-audit-skill]]. `scripts/mdStalenessDetector.js` + `.claude/skills/md-audit/SKILL.md` shipped. First run: 0 orphans / 0 stale-but-linked / 48 stable-by-reference / 109 fresh at 60d/30d baseline (after directory-walk detector patch — voice files load by `docs/media/voices/` glob, not per-file ref). Phase 3 archival script not built — no orphans to archive. Phase 4/5 deferred (no triggering need yet). Active plan-file entry stays open (status `partial`) for the deferred phases; ROLLOUT-table row archived since Phases 1+2 are the load-bearing build.

---

## S212 Migration Pass — 2026-05-10 (research-build)

ROLLOUT_PLAN.md restructured per ADR-0005: numbered phases (33, 38-42) replaced with semantic groups (`pipeline.*` / `engine.*` / `canon.*` / `civic.*` / `infrastructure.*` / `research.*` / `governance.*`); inline narrative collapsed to one-row pointer-only entries; per-terminal Filing Protocol added to TERMINAL.md files. Migration commit: see git log for S212 ROLLOUT_PLAN restructure. Closed/superseded/wontfix entries archived below.

### Done-pending-archive entries (S212 sweep)

- **`/disk-audit` skill** — DONE S203. 4 scripts shipped (`diskInventory.js` walker → `diskRefScan.js` basename+stem ref scan → `diskClassify.js` 6-bucket mechanical → `diskTriageReport.js` md report) + `/disk-audit` skill wrapper. Live droplet first run: 7,195 files / 1.95 GB → 912 orphans / 270 MB recoverable; headline ~263 MB stale claude-mem logs. Plan: [[../plans/2026-05-05-disk-inventory-and-dead-file-detection]].
- **Perkins&Will C92 contamination scrub** — DONE S186 + civic implicit-pass S193. 3-layer scrub + 23-agent RULES refresh + bay-tribune chunked re-ingest. Detail: §S202 Archive Pass below.
- **INVESTIGATE: hookLifecycleEngine.js wiring gap** — DONE S201 commit `954d994`. 338 LOC dead code; zero external callers + single-commit-history + never wired into Phase 6. File deleted; 7 Story_Hook_Deck cols removed. Hook Deck now 14 cols matching v3StoryHookWriter exactly.
- **Writer-vs-header schema alignment detector** — DONE S203. 9th detector class in `scripts/engineCycleAudit.js`; v1.0 → v1.3 evolution. 18/18 self-tests pass. C93 first run: 26 entries (0 HIGH / 16 MED / 10 LOW). Real bugs fixed in same session: v1.1 calendar persistence dead-code; Mike's `'Last Updated'` → `'LastUpdated'` schema fix. Plan: [[../plans/2026-05-05-writer-header-alignment-detector]].
- **AUDIT: Agent briefing context bloat** — DONE S156. Measurement complete; recs absorbed into Briefing bundle trim plan ([[../plans/2026-04-17-briefing-bundle-trim]] — now `pipeline.12`).
- **PROPOSE: ROLLOUT_PLAN state-machine labels** — DONE S204. Convention §State labels shipped at top of ROLLOUT_PLAN.md (S204 — `ready` / `needs-info` / `in-progress` / `blocked` / `done-pending-archive` / `wontfix`).
- **RESEARCH: Compare claude-mem to ECC continuous-learning v2** — DONE S204. Verdict: claude-mem's simpler model is enough; confidence-scoring primitive belongs in skill-eval framework (`governance.2`), not claude-mem. Comparison: [[../comparisons/2026-05-06-claude-mem-vs-ecc-v2]].
- **FIX: `scripts/rolloutTriage.js` broken by S210 fix** — DONE S212. Three bugs fixed: (1) regex extended to accept S204 `, state: <state>` suffix; (2) `(unknown)` title filter for §Convention example tag; (3) extractTitle reordering for table rows. Live test: 3 tagged entries surface correctly, 0 STALE-2C, no errors. Commit `da29487`.
- **UPDATE: /session-end Step 2 + Step 8** — DONE S212. Step 2 reframed for S208/S211 conditioning content (consequences caused, errors made, what excited Mike, what failed and how I drifted). Step 8 renamed Goodbye → Close, reframed as brief mechanism-acknowledgment. Commit `da29487`.

### Wontfix / superseded / awareness-only

- **Cloud session + Channel (`claude --remote` + Discord)** — wontfix S204. `claude --remote` mechanism didn't ship upstream as anticipated; user-facing goal already solved by Claude Code app remote sessions + phone SSH into the droplet. Discord bot stays (different goal — between-session memory bridge via `super-memory`).
- **`/btw` and `/branch`** — awareness only, no build needed.

### Roll-up sections folded to archive

- **Phase 31 Canon-Grounded Briefings** — DONE S134. Already in archive.
- **Phase 2.2 Desk Packet Query Interface** — SUPERSEDED by MCP S137b. Already in archive.
- **Phase 39 Editorial Review Layer Redesign** — DONE S147–S148. All sub-phases 39.1-39.10 complete. Detail: [[PHASE_39_PLAN]].
- **Canon Fidelity Rollout** — DONE S175. 25/25 agents three-tier framework + per-agent four-file structure. Plan: [[../plans/2026-04-25-canon-fidelity-rollout]].
- **Phase 38 Engine Auditor** — MOSTLY DONE S146. 38.5 measurement loop + 38.6 skill shrink shipped via plans (DONE S156).
- **Completed Phases historical table (Phases 1, 3, 6.5, 10, 13-19, 22, 26)** — S55-S99 milestones. Detail per phase already in archive sections above.
- **Recently Completed S105-S141 narrative** — milestones: S110 Supermemory overhaul + workflow split; S113 harness improvements; S114 craft layer; S122 container redesign; S131 canon breakthrough; S133 Riley Phase 33.1-33.5; S134 pipeline v2; S135 terminal architecture + Remote Control; S137b MCP + wiki ingest + citizen cards + feedback loop operational; S139 external review round + faction canon + Maurice Franklin; S140 dispatch + audio tools + doc audit; S141 skills architecture prep + eval framework + Gemini autodream switch.
- **TECH DEBT: Tech debt audit 2026-04-15 Path 1** — CLOSED S156. Math.random sweep across cycle-path engines. Already in archive §Data & Pipeline closures.

### Migration meta

The S212 restructure was the third governance pass this session: ADR-0004 (skill-bag naming) + ADR-0005 (ROLLOUT structure) + GAP_LOG_TEMPLATE.md (gap-log compliant template for civic + media generator-terminal sidecars). Together they establish self-regulating MD discipline — new work files cleanly into groups via templates; old work moves to archive cleanly via `done-pending-archive` state + session-end sweep; descriptions live in pointer docs (plan / gap log / research / ADR / parent spec) instead of inline rollout narrative.

### S212 close — additional governance closures (2026-05-10)

Sweep at S212 session-end. governance.3 + governance.5 closed and removed from ROLLOUT_PLAN (filed mid-session, completed same session).

- **governance.3 — Plan-tag-follows-changelog gate** — DONE S212 commit `701863f`. `scripts/auditPlanTagDrift.js` shipped (162 lines). Three known transition patterns detected (`draft↔active↔complete`); conservative regex avoids task-level false positives ("Task 1 DONE" no longer triggers). Wired into research-build `TERMINAL.md §Session Close step 0.5`. First run S212 found 1 drift (disk-inventory plan changelog-behind-tag); fixed inline. Re-run clean.
- **governance.5 — Wire 8 heavy skills to GAP_LOG_TEMPLATE** — DONE S212 commit `4335049`. §Gap log sections inserted into civic generators (city-hall, city-hall-prep) + media generators (sift, write-edition, edition-print, post-publish, dispatch, interview) with per-skill prefix (G-R*, G-PREP*, G-S*, G-W*, G-PR*, G-P*, G-D*, G-I*) + output paths + 3-5 common categories drawn from C93 gap-log experience.

Both rows removed from ROLLOUT_PLAN §governance.* table at S212 session-end. Net active governance count: 4 (governance.1, governance.2, governance.4, governance.6). governance.3 and governance.5 closed; governance.6 newly opened (rolloutTriage script regression caught at session-end audit).

---

## S217 Archive Pass (2026-05-12, engine-sheet)

Test-coverage-rollout closure pair. engine.15 (S216 ship) + engine.16 (S217 ship) both sweep to archive; engine.17 stays in ROLLOUT for the 9 remaining audit/validate scripts + Phase 7 determinism harnesses.

- **engine.15 — Test coverage rollout (S216)** — DONE S216. npm test runner foundation + CI test job + per-detector regression coverage + Engine_Errors → unified Diagnostic_Ledger expansion + 4 pure-logic library contracts + applyTrackerUpdates dry-run structural contract + lib/sheets columnIndexToLetter coverage. Plan: [[../plans/2026-05-12-test-coverage-rollout]] §Phases 1, 2, 3, 4.1-4.4, 5.1, 6. 7 commits. Project test surface 0 → 411 assertions / 20 files / all green / ~4.4s. Deferred items (4.5, 5.2, 2.7, 7) split to engine.16.

- **engine.16 — Test coverage rollout continuation (S217)** — DONE S217. Three-ship session.
  - **Phase 4.5** `scripts/validateEdition.contract.test.js` (49 assertions). Hybrid Section A structural + Section B subprocess. 4 sentinel editions pinned (E93 known-pass + E78/E85/E90 historical-snapshot floors at ≥20/5/2 CRITICALs) + 4 hand-crafted known-fail tmpfiles (engine-leak / blocklist / vote-math total>9 / wrong-mayor). 8 parallel subprocess invocations via Promise.all keep wall-clock to ~12s on 4 CPUs. Canon-aware CI skip: `output/desk-packets/` is gitignored so 8 canon-dependent assertions skip cleanly in CI (41/8 split, exit 0). Measure-twice surfaced that plan's original "pin 78-93 as known-pass" was wrong — editions are snapshots of canon at their cycle, not timeless. Commit `18e0809`.
  - **Phase 2.7** Two-commit ship. (a) `runEngineAudit(ctx)` extracted from `engineAuditor.main()` (46/-26 lines, pure code motion, exports `{ main, runEngineAudit }`, smoke-tested empty-ctx returns 0/0/0 clean across all 8 ailment detectors + 5 enrichers + anomaly + briefs). Commit `a042b7a`. (b) `scripts/engineAuditor.integration.test.js` (63 assertions). Synthetic ctx feeds planted stuck-initiative + 3-cycle Riley_Digest transit recurrence + unmapped-neighborhood orphan; asserts top-level return shape (7 keys), auditOutput structure, **detectorVersions completeness contract** (all 17 names), snapshot persistence with documented field projection, citizenIncomes derivation, planted transit `repeating-event` pattern fires high-severity with `matchedPolicyDomain=transit` + `cyclesRecurring=3`, summary mirrors patterns, anomalies/briefs shapes, JSON-serializability, no detector emits ERROR on valid fixture. Commit `fc23fd3`.
  - **Phase 5.2 partial** 4 of 13 audit/validate scripts covered: `auditFunctionCollisions.contract.test.js` (31 assertions — CLASP_DIRS 12-phase coverage + FN_RE regex + JSDoc skip + subprocess walker sanity), `auditPlanTagDrift.contract.test.js` (31 assertions — STATUS_TAGS + STATUS_TRANSITIONS + arrow-form regex + --json subprocess), `validateRosterNames.contract.test.js` (24 assertions — DEFAULT_ROSTER + rosterRowRe + levenshtein + 3 CLI flags + 0/1/2 exit + E93 known-pass + hand-crafted "Eric Tavares" near-miss firing + missing-file exit 2; fixture rewritten from "Pitcher Eric Tavares struck out three" to "In the seventh, Eric Tavares lined a double to right" after measure-twice caught (i) pairRe greediness on consecutive caps + (ii) Mike correction that Taveras is 2B not a pitcher), `auditBayTribuneUnknowns.contract.test.js` (27 assertions, source-only — API config + pagination/concurrency tuning + classify() + WIKI_PATTERNS 5 doc-shape classes + TARGET_CLASSES; assumption-bug caught at self-test where I assumed entity-type classes like 'cultural'/'neighborhood'/'initiative' but the real classes are doc shapes `bt-wiki-appearance/returning/new/storyline/continuity`). 9 scripts deferred to engine.17. Commit `7bf9d5a`.
  - **Net session:** 4 commits, 225 new test assertions, project test surface 411 → 636 assertions / 26 files / ~20s npm test. Phase 7 (engine-phase determinism harnesses) stays explicitly deferred — Apps Script ctx + SpreadsheetApp mock infrastructure is a heavier ship pending justification.
  - **Measure-twice meta-lesson this session:** six fixture-bugs-caught-at-self-test cumulative across the four phases — every shipped test surfaced at least one assumption that didn't match source-of-truth (validateEdition canon-drift / vote-math regex adjacency, engineAuditor pattern type name typo, auditPlanTagDrift JSON field name, validateRosterNames pairRe greediness + Mike's position-canon correction, auditBayTribuneUnknowns WIKI_PATTERNS class shape). The discipline is the work product — every reversal trapped a real bug that would otherwise have shipped silently.

Both rows swept from ROLLOUT_PLAN §engine.* table at S217 session-end. engine.17 newly opened for the 9 remaining 5.2 scripts + Phase 7.

- **engine.17 — Test coverage rollout final (S217)** — DONE S217 (same session, post-research-build close). 9 contract tests landed in one ship: 5 sheet-dep audits (`auditPhase5Headers` 41 / `auditRemainingHeaders` 36 / `auditSheetHeaders` 35 / `auditSimulationLedger` 52 / `auditGenericCitizens` 32 assertions) + 2 Supermemory-dep source-only audits (`auditBayTribune` 54 / `auditWorldData` 50 — same pattern as auditBayTribuneUnknowns S217 precedent because both hit live API + exit 1 without key) + 2 sheet-dep validators (`validateIntakeDerivation` 43 / `validatePriorityEngine` 48). Section A source-level structural + Section B subprocess where `service-account.json` available, skip-gracefully when not (canon-aware CI skip pattern extended to service-account creds). **Defect-via-test surfaced + fixed inline:** `auditPhase5Headers.js` / `auditRemainingHeaders.js` / `auditSheetHeaders.js` all missing `require('../lib/env')` despite standalone-usage docstrings — one-line idempotent env-load added per S216 precedent (advisor concurred: defect-the-test-exists-to-surface, not scope creep). **3 measure-twice fixture catches at self-test:** (a) auditSimulationLedger summary uses ES6 property shorthand for 5/16 keys (`tierClockMatrix,` not `tierClockMatrix:`); regex switched to `[,:\n}]` alternation; (b) auditSimulationLedger --json stdout has dotenv banner + config-object echo before JSON payload; parser anchored on `{\n  "snapshotDate"` signature; (c) auditBayTribune Test 6 had unterminated regex literal because `\]` inside `[a-z0-9-\]` made JS char-class never close; switched 6 binary-character regex assertions in bayTribune/worldData tests to `source.includes('<literal>')` form. **Phase 5 fully closed; Phase 7 (engine-phase determinism harnesses) stays deferred** — Apps Script ctx + SpreadsheetApp mock investment unjustified at current surface size. Commit `2b1fd67`. Project test surface 636 → 1027 assertions / 26 → 35 files / ~45s npm test all green.

Row swept from ROLLOUT_PLAN §engine.* table at S217 final-close. Test-coverage-rollout plan (`docs/plans/2026-05-12-test-coverage-rollout.md`) flips active → closed in `docs/index.md` next session-end pass.

---

## S218 Archive Pass (2026-05-12, research-build)

Canon.2 faith-canon Tier-3 scrub closed end-to-end across both terminals in a single session. Plan-pointer entry shape worked as designed: engine-sheet picked P0 (export) cold from the ROLLOUT pointer + plan file, shipped findings beyond plan baseline, then handed back for editorial substitution work.

### canon.2 — Faith-canon real-name scrub (S218)

- **canon.2 — Faith Tier-3 scrub** — DONE S218 (joint research-build + engine-sheet). Six phases / 11 tasks (Task 3.3 ruled N/A: zero `Business_Ledger.Name ∈ Faith_Organizations.Organization` matches; cross-walk gap noted in `INSTITUTIONS.md` §Out of scope for canon.2 → follow-up). Commits across both terminals: `5c27780` plan + index + ROLLOUT pointer (research-build) → `96a3725` P0 export script + dump (engine-sheet) → `f9883c8` P1+P2 INSTITUTIONS substitution table + REAL_NAMES_BLOCKLIST sync + CANON_RULES §Corrections-Forward Maps subsection (research-build) → `4f650f6` P3.1+P3.2 atomic 62-range FO + SL batch write + 0-drift verification (engine-sheet) → `f88a2b3` P3.3 N/A ruling (research-build) → `5e43ec6` P4 `lib/canonBlocklist.js` + 12-assertion test + `buildFaithCards.js` startup filter (engine-sheet) → `81dadcb` P5 wd-faith Supermemory wipe+rewrite 16/16 + wd-citizens scoped rebuild 16/16 (engine-sheet). **Measure-twice trap caught pre-write** (P5.1, engine-sheet): legacy `wipeOldFaithCards` allowlist matched only against current FO rows (now canon-named), so plain `--wipe-old` would have left 16 stale legacy cards in place and written 16 canon cards alongside (32 docs / contamination persisted). Fix shipped same commit: allowlist unions `canonBlocklist.loadFaithBlocklist().orgs` (durable contract change for future Tier-3 rename scrubs), `EXPECT_WIPE_MATCHES=N` env-guard aborts pre-DELETE on count mismatch. **S195 interim substitutes retired same pass:** Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. (both flagged S217 "too close to real" — same failure mode that motivated the canon.2 plan) blocked-forward in REAL_NAMES_BLOCKLIST + corrections-forward map. **Pattern generalized in CANON_RULES.md** §Corrections-Forward Maps subsection — any future Tier-3 retroactive scrub authors a `[[INSTITUTIONS]] §<Domain> Corrections Forward` map; bay-tribune paper-of-record principle preserved. Mara `AUDIT_TEMPLATE.md` §Canon Audit Tier-3 sub-check (S217) now redundant for faith-canon at lookup-time but stays for residual bay-tribune source-briefing reads.

Row swept from ROLLOUT_PLAN §canon.* table at S218 session-end. Canon.2 plan (`docs/plans/2026-05-12-canon-2-faith-scrub.md`) carries the 6-phase task-by-task history; ARCHIVE entry is the summary.

### Backlog flagged (NOT swept this pass)

canon.1a/1b/1c + civic.1 through civic.11 (12 rows) are also `done-pending-archive` from S215–S216 closes that the S217 close did not sweep. Surfaced as `governance.10` (NEW) in ROLLOUT for a focused research-build cleanup pass next session: write archive entries from existing row close-notes, remove the rows. Bookkeeping work, no engineering — should be one session of dedicated sweep effort.
## S227 Archive Pass (2026-05-23, research-build) — governance.10 backlog sweep

49 `done-pending-archive` rows accumulated across S215–S227 sessions sweep to ROLLOUT_ARCHIVE in one focused bookkeeping pass per governance.10. Each entry below preserves the description + close-note from the original ROLLOUT row verbatim. Cross-links to source plans + commits in the close-notes remain authoritative; this section is the index.

Cluster counts: pipeline 16 / engine 9 / canon 3 / civic 14 / governance 7.

Prior sweep passes: §S212 Migration Pass (governance.3 + governance.5 + S203 disk-audit + S204 ROLLOUT state-labels + research/claude-mem-vs-ecc), §S217 Archive Pass (engine.15 + engine.16 + engine.17 test-coverage rollout), §S218 Archive Pass (canon.2 faith Tier-3 scrub). governance.10 itself sweeps in this pass per S212 precedent (sweep-row + work-row archived together).

### pipeline.* (16)

- **pipeline.4** [research-build] — /sift C93 gap log triaged S215 — open entries promoted to pipeline.14/15/18/19/20 + canon.1; closed entries marked in §Status **Close-note:** `output/production_log_edition_c93_sift_gaps.md` §Status updates

- **pipeline.5** [research-build] — /write-edition C93 gap log triaged S215 — open entries promoted to pipeline.15/16/17/18/19 + infrastructure.3 evidence note (G-W25); closed entries marked in §Status **Close-note:** `output/production_log_edition_c93_write_gaps.md` §Status updates

- **pipeline.6** [research-build] — /edition-print C93 gap log triaged S215 — open entries promoted to pipeline.14/18/20 + research.11 (FLUX cluster); G-PR2 wontfix; closed entries marked in §Status **Close-note:** `output/production_log_edition_c93_print_gaps.md` §Status updates

- **pipeline.7** [research-build] — /post-publish C93 gap log triaged S215 — open entries promoted to pipeline.14/18/19/21/22; closed entries marked in §Status **Close-note:** `output/production_log_edition_c93_post_publish_gaps.md` §Status updates

- **pipeline.14a** [engine-sheet] — Pipeline sequencing — pre-flight staleness gate. `/post-publish` Step 0 mtime check: world_summary + engine_audit vs `/city-hall` production log. Flag stale + warn before continuing. Deterministic; no skill invocation. **Close-note:** gap-logs G-S1/S5 + G-P3 + G-PR3 + G-7 — shipped S215; `scripts/checkPostPublishStaleness.js` + `lib/staleness.js` + /post-publish Step 0 docs

- **pipeline.14b** [research-build] — Pipeline sequencing — rebuild trigger on stale flag. When pipeline.14a flags stale, `/post-publish` or `/build-world-summary` skill invokes rebuild. Skill-text + agent-invocation work — model territory. **Close-note:** gap-logs G-S1/S5 + G-P3 + G-PR3 + G-7 — closed S215; /post-publish Step 0 gained explicit rebuild path table (world_summary→`/build-world-summary <XX>`, engine_audit→`/engine-review <XX>`, both→ordered sequence) + intentional-stale carve-out rules + rebuild-failure-investigation rule. /sift Step 0 added with same staleness gate invocation upstream + same rebuild path (catches early; /post-publish gate is safety net). /sift v1.1→v1.2.

- **pipeline.15** [engine-sheet] — Engine auditor citizen-resolution — populate affectedEntities.citizens + storyHandles[*].citizens from world-data + newsroom-memory **Close-note:** gap-logs G-S2/S3 (sift), G-W7 (write-edition) — shipped S215, `scripts/engine-auditor/resolveAffectedCitizens.js` enricher; 50% of patterns now populated (was 0%), 60 citizen mentions, 39 story-handle slots resolved

- **pipeline.16** [research-build] — Reporter→desk routing index + dispatch.json contract emitted by /sift **Close-note:** gap-logs G-W2/W3/W9/W11 — closed S215 (commit `43002f0`); `.claude/agents/REPORTER_DESK_INDEX.md` NEW, 20 single-desk reporters + beat-axis table + unmapped voices. Residual: sift doesn't yet emit dispatch.json (optimization follow-up, not blocker)

- **pipeline.17** [research-build] — Desk-agent boot trim + output-path unification for brief-led model **Close-note:** gap-logs G-W4/W5/W6 — closed S215 (commit `43002f0`); /write-edition §Rules canonicalizes brief-led mode + per-reporter output path. Residual: 5+ desk SKILL.md boot-trim implementations (optimization, not blocker)

- **pipeline.18** [research-build] — Heavy-skill text reconciliation sweep — sift + write-edition + edition-print + post-publish SKILL.md drift items (~30% doc-drift meta-pattern per G-W16) **Close-note:** gap-logs G-S4/S6/S11 + G-W1/W10/W13/W14-sift-side/W21/W23/W26/W27/W28 + G-PR6 + G-P1-followup/P5 — closed S215 (commit `43002f0`); /sift v1.0→v1.1, /write-edition v2.0→v2.1, /edition-print v1.3 verified, /post-publish v1.5→v1.6

- **pipeline.19** [engine-sheet] — Engine-side parser/script bug sweep — parseEdition inner article splitter + rateEditionCoverage parser + world_summary name-canon + ingestEditionWiki summary + Step 5 zero-entity JSON + extractExemplars double-iterate **Close-note:** gap-logs G-W20/W24, G-P2/P6-followup/P10/P20 — all 6 shipped S215 (batch 1: G-P2 + G-P10 + G-P20 LOWs `8555fc0`; batch 2: G-W20 + G-W24 + G-P6-followup HIGHs/MED + `scripts/validateRosterNames.js`)

- **pipeline.20** [engine-sheet] — Edition-print + path-cleanup misc polish — DJ word-band + missing-section warning + PDF date masthead + saveToDrive cycle parse + manifest warning + carmen_delaine path dedupe **Close-note:** gap-logs G-S13, G-PR7/PR16/PR17/PR19/PR20 — all 6 shipped S215

- **pipeline.21** [engine-sheet] — buildDeskPackets caching + per-citizen index gap (4 of 5 player queries returned EMPTY) **Close-note:** gap-log G-P11 — shipped S215; `scripts/buildArchiveContext.js` got same-cycle SHA1-keyed cache (output/cache/archive_context_c{XX}.json) + empty-query diagnostic log; cold→warm run dropped 17.4s/23 API calls to 0.13s/0 API calls (100% cache hit)

- **pipeline.22** [engine-sheet] — Civic wiki ingest builder — `ingestCivicWiki.js` per-official records to bay-tribune (`bt-civic-voice` tag) **Close-note:** gap-log G-P4 — shipped S215; `scripts/ingestCivicWiki.js` + `/post-publish` Step 3 wired; C93 dry-run 39 memories (33 statements + 6 decisions); --apply pending Mike auth

- **pipeline.23** [research-build / engine-sheet] — Pipeline path + staleness gate normalization — production-log filename harmonization across /write-edition + /post-publish + /edition-print + /city-hall-prep AND /sift Step 0 staleness gate inverted-baseline fix (G-S11 fires STALE every cycle by design) **Close-note:** shipped S225 — /sift v1.2→v1.3 (Step 0 staleness gate retired + production_log path canonicalized to `production_log_c<XX>.md`); /write-edition v2.1→v2.2 (path canonicalized + gap-log sidecar `_edition_` infix preserved by design); /post-publish v1.6→v1.7 (Step 0 staleness gate retired + substep matrix row 0 marked retired); /city-hall-prep v1.2→v1.3 (G-PREP2 graceful fallback note for missing prior-cycle log); /edition-print no change required (already consolidated). Closes G-P26 + G-P28 + G-S11 + G-PR1 + G-PREP2; cross-link G-EPD3/G-EPD5 to governance.14 (EDITION_PIPELINE.md rewrite). **Engine-sheet follow-up (non-blocking):** `scripts/checkPostPublishStaleness.js` + `lib/staleness.js` are vestigial after gate retirement; queue for delete in a future engine.* sweep.

- **pipeline.27** [research-build] — Reviewer-lane schema reconciliation — Rhea agent + Mara agent specs match parser regex; 2 + 3 hand-reformat rounds per cycle eliminated; alternative: ship parser fallbacks with `--extract-from-prose` **Close-note:** shipped S225 — ADR-0006 Contract A applied. Rhea: RULES.md severity enum corrected (added UNCONTROLLABLE; was missing) + canonical exemplar [[../media/rhea_audit_exemplar]] referenced + self-validation invocation documented. Mara: AUDIT_TEMPLATE.md + CLAUDE_AI_SYSTEM_PROMPT.md fixed `/4 → /3` + dropped 4th `Canon-drift detection` line from parser-required structured top (it was silently dropped by parser, causing math drift); canon-drift findings relocated to §Canon Audit narrative section + Outcome impact spelled out + canonical exemplar [[../media/mara_audit_exemplar]] referenced + self-validation invocation documented. Closes G-W54 + G-W55.

### engine.* (9)

- **engine.12** [engine-sheet] — `detectStuckInitiatives` carry-forward poisoning — INIT-001/002/006 reported `cyclesInState=89` because the stable-phase carry-forward chain inherited bad seed values from older audits no longer retained on disk. **Close-note:** shipped S216 — `scripts/engine-auditor/detectStuckInitiatives.js` v1.1.0 → v1.2.0. Carry-forward path deleted; always walk snapshots fresh + use vote-cycle as ceiling estimate when retained priors all show current phase (audit history shallower than actual phase tenure). Verified: INIT-001 89→15, INIT-002 89→11, INIT-006 89→10 (all still HIGH severity, defensible magnitudes); INIT-005 + INIT-003 still correctly drop (phase advanced this cycle, hits transition in priors). New test file `scripts/engine-auditor/detectStuckInitiatives.test.js` 16/16 pass. Peer `measureRemedies.test.js` 19/19 still green.

- **engine.13** [engine-sheet] — Writeback-drift root cause — coverage applied last cycle but downstream state did not move. G-EC6 (sentiment) + G-EC22 (approval). **Close-note:** shipped S216. **G-EC6 sentiment was a real engine bug:** `S.editionSentimentBoost` (rating × sentimentWeight × 0.015 per domain, ~+0.16 in C92) was a dead write — applyEditionCoverageEffects incremented `S.sentiment` but applyCityDynamics rebuilt finalCity.sentiment from cluster averages + prevMedia and never read it. The S202 wiring missed sentiment. Fix: `phase02-world-state/applyCityDynamics.js` v3.1 → v3.2 — folds S.editionSentimentBoost into finalCity.sentiment before the clamp. Per-neighborhood Sentiment now picks it up via v3NeighborhoodWriter's base+mod+variance formula. Clasp push deployed. **G-EC22 was a detector false positive:** `detectWritebackDrift` v1.0.0 counted ALL Civic_Office_Ledger rows (999 incl DA/PD/STAFF) as approval-bearing; updateCivicApprovalRatings only writes ^COUNCIL/^MAYOR (~10 rows). Fix: detector v1.0.0 → v1.1.0 — APPROVAL_OFFICE_PATTERN /^(COUNCIL\

- **engine.14** [engine-sheet] — Math-anomaly bundle — 14 nbhd decay false positives (G-EC7-20) + faith production-without-consumption mistyped (G-EC21). **Close-note:** shipped S216. **G-EC7-20 was detector calibration bug:** `detectMathImbalances` v1.0.0 absolute thresholds (Sentiment<0.4, CrimeIndex>0.6) treated values as normalized 0-1, but Neighborhood_Map stores Sentiment as ±0.X delta-scale and CrimeIndex as integer counts — every neighborhood matched both gates trivially. The "with N domains advancing" rider listed global advancing initiatives, not per-neighborhood matches; the Status \

- **engine.18** [engine-sheet] — wd-citizens dedup architecture — PATCH-if-exists writes + one-time consolidation. Substrate defect: `buildCitizenCards.js --wipe-old` only caught untagged legacy cards; tagged-but-stale duplicates with same POPID accumulated across rebuilds. 332/836 POPIDs (40%) carried 2-3 cards each / 340 stale docs total at session start; Mara's blind wd-citizens lookups had been returning collision sets every audit. **Close-note:** shipped S223 commit `ec34d3f`. API probe confirmed POST+customId = skip-if-exists (dead), PUT = 404, PATCH `/v3/documents/{id}` = replaces content+metadata after ~30s async settle (verified Varek E2E). Architecture: one doc per POPID, oldest id for stability. `scripts/buildCitizenCards.js` gained `buildPopidIdMap` enumeration + PATCH-vs-POST branch in `writeMemory` + `--batch-size N` (200 default) / `--batch-pause-sec S` (60 default) flags chunking bursts to avoid rate-limit-as-401 cluster (~225 successive writes at 500ms — same S182 phenomenon `writeMemory` comment documents). `scripts/dedupWdCitizens.js` NEW one-time consolidation utility (kept in tree for future recurrence). Mara-directive sheet fixes shipped same commit: SL!K675 Varek "Founder of Civic Systems" → "Civis Systems"; SL!K658 Beverly Hayes → "Community Director, West Oakland Community Center" (E94 NAMES INDEX alignment); SL!O658 Beverly Hayes LifeHistory stripped C90-era "Home Health Aide" canon-contradiction. POP-00412 confirmed fabricated POPID (never in SL — only one Beverly Hayes in canon, POP-00772). Sequence: script edit → Varek test 1 PATCH 0 POST id stable → dedup 340/340 deletes 0 failures → first rebuild 187 rate-limit-as-401 (exposed batch-chunking need) → chunked rebuild 842 PATCH / 0 POST / 0 errors. Final: 1,176 docs/332 collisions → 842 docs/0 collisions. Pattern citations in commit body: `feedback_measure-twice-cascading-effects` + `feedback_senior-engineer-default`.

- **engine.19** [engine-sheet] — Engine auditor + detector calibration sweep — `detectRepeatingEvents` per-word tokenization (1 error → 8 patterns), `detectImprovements` ignores remedy-overshot verdict, `validatePriorityEngine` /sift dependency, baseline brief writer empty description for cultural-sighting, `rateEditionCoverage.js` mis-attributes Hal Richmond to "noon" + rates CULTURE −1, faith domain 5-events 0-coverage, Chinatown/Glenview decay no-matching-initiative, Engine_Errors double-count **Close-note:** shipped S226 (`git log --grep engine.19`). 10-file sweep, all 9 named gap items closed. **G-P36** `rateEditionCoverage.js` strict byline regex — `BYLINE_RE` now requires (a) name starts with uppercase letter + (b) tail (if present) matches the affiliation pattern (Bay Tribune / Senior Writer / Bureau / Civic Ledger / etc.). Rejects body prose `By noon, the tables were set.` Empirical C94 dry-run: 9 phantom articles → 8 real articles; CULTURE rating −1 → +1; all 8 reporters correctly attributed. **G-RC8** `detectRepeatingEvents` v1.0 → v1.1 — row-provenance dedup. Tokens with identical (cycle, rowIdx) provenance across cycles coalesce into ONE pattern; representative token uses PatternFlag-membership priority then first-appearance order; full token group surfaces under `recurringTokens` evidence field. New tests Test 6b (5-token error template → 1 pattern) + Test 6c (disjoint provenance → 2 patterns), 15/15 green. **G-RC9** `detectImprovements` v1.0 → v1.1 — ingests prior cycle's measureRemedies verdicts. `remedy-overshot` + `remedy-firing-as-expected` emit positive improvement patterns even when phase hasn't advanced; negative verdicts don't emit. Tests 7/8/9 added, 15/15 green. **G-EC22 + G-EC23 + G-EC1** `detectMathImbalances` v1.1 → v1.2 — `mitigatorState` field on decay patterns (`no-mitigator-needs-new-initiative` / `no-mitigator-minor` / `mitigator-firing`); `routingHint` field on coverage-gap patterns (`dedicated-piece-warranted` for civic/health/sports/safety/infrastructure / `roundup-thread-acceptable` for faith/community/weather etc.). Test 8 added, 19/19 green. **G-S12** `generateBaselineBriefs.js` — fallback description synthesis when WorldEvents_V3_Ledger.EventDescription empty: synthesize from `<EventType> in <Neighborhood> (<Domain>)`; skip entirely when EventType also empty rather than emit stub; `descriptionSource: 'ledger'\

- **engine.20a** [engine-sheet] — `detectStuckInitiatives` v1.2→v1.3 remedy-firing-aware severity (Plan T4 isolated) **Close-note:** shipped S227 (`git log --grep engine.20a`). T1 finding retargeted plan: phase tenure is voice-emergent (city-hall pipeline) not engine-coded — no `phase15-initiative-engine/` exists; plan §Open Q #1 answered empirically. **Reweight shipped:** `scripts/engine-auditor/detectStuckInitiatives.js` v1.2.0 → v1.3.0. New `findPriorPositiveRemedyIds(ctx)` helper walks immediate prior-cycle audit (`ctx.prior.find(p=>p.cycle===cycle-1)`) for `type==='stuck-initiative'` patterns whose `measurement.verdict ∈ {'remedy-firing-as-expected','remedy-overshot'}` (mirror of detectImprovements v1.1.0 G-RC9 lookup convention). InitiativeIDs in that set get severity downgraded to LOW + `evidence.remedyFiringPositive=true` + `evidence.priorRemedyVerdict` carried. detectImprovements continues to surface the positive signal independently. 7 new test cases (Test 11-17) added; suite 41/41 green. **T7 dry-run vs C94 patterns + C93 priorAudit:** INIT-001 high→low (C93 verdict `remedy-overshot`), INIT-002 high→low (`remedy-overshot`), INIT-006 stays high (`remedy-not-firing`, genuinely stuck). `npm test` 36/36 files green. **Pattern: `feedback_measure-twice-cascading-effects`** (T1 reversal — plan §Open Q #1 answered before any threshold edits; phase tenure isn't where the plan said it was).

- **engine.21** [engine-sheet] — Engine B byline candidate-pool filter + beat-domain weight review — filter to role=reporter at candidate source (currently includes Mags-EIC + DJ Hartley non-reporters), review beat-domain vs format-fit weighting (Maria Keen over-weighted across sports/business/atmospheric); C94 HIGH-band agree-rate 1/3 = 33% vs 85% gate **Close-note:** shipped S225 commit `7bec4a8`. **Candidate-pool half closed:** `utilities/bylineEngine.js` gained `BYLINE_INELIGIBLE_ROLES` table (Editor-in-Chief, Senior Photographer, Photo Assistant, Copy Chief) + `filterRosterForByline_(roster)` helper; `phase07-evening-media/applyStorySeeds.js` v3.13 applies filter at `bylineState.roster` construction. Empirical (vm-sandboxed against `utilities/rosterLookup.js`): 28 raw → 24 byline-eligible — Mags Corliss, DJ Hartley, Arman Gutiérrez, Rhea Morgan dropped; Anthony + Maria Keen retained. bylineEngine self-tests 154/154. Clasp push pending Mike-go. **Beat-domain half re-routed:** C94 byline_shadow_log empirical decomposition shows Maria-Keen over-weight (S1 Kelley, S2 Let-Walks, QT2 Rockridge) is driven by THEME axis (theme:8) on upstream-COMMUNITY-tagged sports/scoreboard seeds, NOT format-fit weighting (format:1 across all three). Root cause is upstream seed-domain assignment in `applyStorySeeds.js makeSeed` — separate investigation filed as engine.23. Original gap-log diagnosis of "format-fit over-weight" was inverted; the byline engine is doing what its inputs say.

- **engine.22** [engine-sheet] — Truesource POPID resolver normalization — `ingestPlayerTrueSource.js` POPID resolver name-norm doesn't handle punctuation; `J.R. Rosado` (Drive filename) vs `JR` (ledger) → 9/27 truesource records POPID-UNRESOLVED; strip-punctuation + case-fold **Close-note:** shipped S225 commit `1f84ae4`. Single `normalizeNameKey()` applied symmetrically to ledger-map insertion + resolver query: diacritics-strip + lowercase + strip non-alphanumeric non-space + collapse whitespace. Replaces two-tier exact+stripped map. Empirical against live Simulation_Ledger (842 keys): `J.R. Rosado` → POP-00054; `JR Rosado` → POP-00054; diacritic regression-safe (José Colón → POP-00599, Jose Colon → POP-00599); no false-positive (NotARealPlayer Xyz → UNRESOLVED). Node-only, no clasp push.

- **engine.23** [engine-sheet] — Upstream seed-domain mis-tagging — Maria-Keen over-weight diagnosed S225 from `output/byline_shadow_log_c94.json` is driven by S1 Kelley In Focus + S2 Let-Walks Coming + QT2 Rockridge being tagged COMMUNITY domain in `applyStorySeeds.js makeSeed`. COMMUNITY keywords `[faith, family, neighborhood, rhythm]` match Maria's signature themes (theme:8 score). Sports/scoreboard content should not be COMMUNITY-domain. Investigate makeSeed domain assignment for sports-content seeds; fix either at routing (reroute to SPORTS/CULTURE) or guard (domain-content validator that catches sports-text COMMUNITY-tags before scoring). **Close-note:** shipped S226 (`git log --grep engine.23`). **Root cause was the `STORYLINE_TYPE_DOMAINS['thread']` mapping in `phase07-evening-media/applyStorySeeds.js`** — `thread` is a narrative-shape label (recurring loose thread) not a content-domain tag, but it was hard-mapped to COMMUNITY. Live `Storyline_Tracker` census (n=30 thread rows): 23 carried sports/civic/culture/business/health/infrastructure content; only 4 were legitimately COMMUNITY/FAITH. Every dormant thread emitted a `storyline-followup` seed tagged COMMUNITY regardless of underlying content → bylineEngine `themeAxis_` scored Maria Keen +3 exact (`faith`/`Faith`) +3 exact (`family`/`Family`) +1 substring (`neighborhood`/`Neighborhood rhythm`) +1 substring (`rhythm`/`Neighborhood rhythm`) = **8** on every one. All 5 C94 mistagged shadow-log seeds (S1 Kelley ×3, S2 Let-Walks, QT2 Rockridge, C2 West Oakland) traced back to thread-typed storylines. **Fix:** `'thread': 'COMMUNITY'` → `'thread': 'GENERAL'`. GENERAL short-circuits `themeAxis_` to 0 (Fork 1 = B amendment, `bylineEngine.js:106`) — format axis decides byline, aligning `thread` with the other heterogeneous storyline shapes (`arc`, `developing`) that already routed to GENERAL. **Empirical (vm-sandboxed `themeAxis_` over the 5 shadow-log seeds, pre vs post v3.14):** all 5 collapse from theme:8 → theme:0, aggregate Δ −40; COMMUNITY scoring for legitimately-tagged content preserved (Maria Keen on a seed actually domain=COMMUNITY still scores 8 — the fix is at routing not at scoring); CIVIC/SPORTS sanity scores unchanged. **Regression scaffolding:** `scripts/auditStorylineDomainRouting.js` audits `Storyline_Tracker` against the live `STORYLINE_TYPE_DOMAINS` table, heuristic-classifies content domain per row, and flags routed/content mismatches (exit 2 if any). Current state: 0 mismatches, distribution clean. Bumped `applyStorySeeds.js` v3.13 → v3.14; clasp push live. Side effects audited: `priorityEngine` coverage-state shifts COMMUNITY → GENERAL bucket; `compileHandoff` dedup key shifts; `generateAngle_` drops LIFESTYLE desk hint for thread follow-ups (advisory only); `bylineEngine` self-tests have no COMMUNITY case so unaffected. `npm test` 36/36 files green. **Pattern: `feedback_measure-twice-cascading-effects`** (READ impl → caller-graph downstream `seed.domain` consumers → 30-row census → empirical pre/post vm-sandbox before edit).

### canon.* (3)

- **canon.1a** [research-build] — Bay-tribune canon-drift — Mara audit check. Run `lookup_citizen` on every named citizen, flag inconsistent versions across editions, surface conflicting facts by edition number in required-fixes. Human-judgment layer; works against current stack-everything ingest behavior. **Close-note:** gap-log G-S9 — closed S215. `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md` gained 4th audit check (was 3); Process score denominator 3→4; Outcome rule includes canon-drift-FAIL gate. Controllable-vs-uncontrollable: ingest-stacking cause = uncontrollable until 1b/c; newsroom-introduced new framing = controllable.

- **canon.1b** [engine-sheet] — Bay-tribune ingest — DELETE prior citizen entries when a new edition writes updated facts (don't stack new alongside old). Data-layer fix that removes the underlying cause of canon.1a's check work. **Close-note:** gap-log G-S9 — closed S216 OBSOLETED BY canon.1c. `ingestEditionWiki.js --wipe-priors` detection layer remains as code; `--apply` will NOT be authorized. Rationale: recency rank (canon.1c) gives the current answer at retrieval time without destroying prior wiki entries. Per-edition wiki records are the paper-of-record artifact — Patricia at 66 in E85 is what that edition wrote; future agents reading E85 should see E85 facts. Newspapers print corrections forward, they don't retcon old issues. Sheets remain the truesource for current state; bay-tribune is journalism record. Dry-run flagged 1-18 priors per citizen including valuable canon history (Beverly Hayes letters, Dante Nelson dialogue) — destroying those would lose real canon to fix a problem already solved at read-time.

- **canon.1c** [engine-sheet] — `lookup_citizen` MCP tool — rank results by ingest recency (newest edition first) instead of pure similarity. Surfaces canonical-current version at top of retrieval even when older versions exist. **Close-note:** gap-log G-S9 — shipped S215; `godworld-mcp.py supermemory_search` gained `sort='recency'` parameter; `lookup_citizen` passes it for the bay-tribune branch (wd-citizens + world-data branches still similarity-sort). Patricia Nolan C93→C92→C85 verified: E93 (55yo, May 3) now ranks above E92 (Apr 22) and E85 (Mar 22, 66yo legacy). Over-fetch + client-side sort by updatedAt desc.

### civic.* (14)

- **civic.1** [research-build] — /city-hall-prep C93 gap log triaged S215 — open entries promoted to civic.4/5/6/7/10; G-2 confirmed already-closed via G-W15 (S197); closed entries marked in §Status **Close-note:** `output/production_log_city_hall_c93_gaps.md` §Status updates

- **civic.2** [research-build] — /city-hall run C93 gap log triaged S215 — open entries promoted to civic.4/8/9; closed entries marked in §Status **Close-note:** `output/production_log_city_hall_c93_run_gaps.md` §Status updates

- **civic.3** [research-build] — Mara-vance documentation refresh (E85-E93 audit history + Week 2/3/4 plans + claude.ai prompt sync) **Close-note:** closed S216 — three findings drove scope: (1) Mara abandoned the rolling-5 narrative convention after C85; per-cycle artifacts (json/txt/md/pdf) are now canonical (`output/mara_canon_audit_c89.txt`, `output/mara_report_c91.json`, `output/mara_review_c92_santana_interview.md`, `output/mara_report_c93.json`). AUDIT_HISTORY.md marked snapshot-historical with pointer table to per-cycle artifacts. (2) Week 2/3/4 features (Town Halls, Council Availability, Vote History & Executive Orders) never shipped — project pivoted to engine.7/10/11/13/14. README §What's Next replaced with current-build-status pointer. (3) CLAUDE_AI_SYSTEM_PROMPT.md got "Last synced to claude.ai" stamp at top — Mike updates when he pastes refreshed prompt into claude.ai project (last in-repo change: S215 civic.1a canon-drift 4th audit check). Mirror `output/mara-audit/audit_history.md` synced. Pointer: [[../mara-vance/AUDIT_HISTORY]], [[../mara-vance/README]], [[../mara-vance/CLAUDE_AI_SYSTEM_PROMPT]].

- **civic.4** [research-build] — Civic skill-text reconciliation sweep — city-hall-prep + city-hall-run + City-Clerk SKILL.md (Mara additive framing + Mike's-pressure auto-derive + anomaly-only gates + voice-routing topology refresh + statementId convention + Baylight write-ordering + Clerk quarantine-dir exclude + Clerk JSON validate-before-return + Step 1 prior-cycle-published-canon ingestion) **Close-note:** gap-logs G-4/5/6/7/8/9/16 (city-hall-prep) + G-R3/R5/R12/R13 (city-hall-run) — closed S215 (commit `50732b7`); city-hall-prep v1.1→v1.2, city-hall v2.0→v2.1, city-clerk RULES gained Audit Scope + JSON validate sections

- **civic.5** [research-build] — Brenda Okoro Deputy Mayor voice agent build (civic-office-okoro four-file IDENTITY/LENS/RULES/SKILL per S175 canon-fidelity) **Close-note:** gap-log G-14 (city-hall-prep) — closed S215 (commit `50732b7`); 4 files NEW in `.claude/agents/civic-office-okoro/`; wired into city-hall-prep voice routing + city-hall Layer 2 list; speaks on Stab Fund / Community Dev / ED-coverage with absence-of-statement-is-meaningful rule

- **civic.6** [engine-sheet] — MCP civic-side hardening — lookup_initiative reads Initiative_Tracker by name/ID first (semantic fallback) + URL-encode fix on related-articles **Close-note:** gap-logs G-1/G-3 (city-hall-prep) — closed S215, see civic.6 close-note below

- **civic.7** [engine-sheet] — Engine accountability — INIT-005 phase-advance writeback (Mayor C93 deadline + Chen-Ramirez C92 commitment didn't trigger sheet flip) + MilestoneNotes reader for prep skill **Close-note:** [[../plans/2026-05-11-civic-7-init-005-investigation]] — closed S216 as **Scenario C** (engine auditor false positive, not A or B): writeback + commitment both worked; `detectStuckInitiatives.js` v1.0.0 → v1.1.0 fixed phantom cyclesInState when phase advances; helper `scripts/readInitiativeMilestoneNotes.js` shipped. Verified INIT-005 + INIT-003 drop from stuck list. Carry-forward poisoning of INIT-001/002/006 split out as engine.10. City-hall-prep wiring split out as civic.11.

- **civic.11** [research-build] — city-hall-prep Step 1 wiring — invoke `scripts/readInitiativeMilestoneNotes.js` automatically when an initiative shows mitigator-stuck or remedy-not-firing in engine review. Surfaces highlighted C{XX} history to topic assignments before the prep step assumes the engine signal is correct. Phase 3 follow-up split off civic.7 close. **Close-note:** closed S216 — `.claude/skills/city-hall-prep/SKILL.md` v1.2 inserts an "Auto-investigate engine-flagged initiatives" sub-section in Step 1 between the world-summary stale-framing block and the anomaly-only gate. For each `mitigator-stuck` / `remedy-not-firing` ailment from engine review, the operator runs `node scripts/readInitiativeMilestoneNotes.js <INIT-ID> {XX}` and routes to one of three dispositions: Scenario C (false positive — drop from topic assignments), Scenario A (commitment slipped — surface to owning voice), Scenario B-variant (contradicting note — surface with reframing). Sequenced before Step 2 so topic-assignment build sees disposed signal. Plan + Scenario C trace: [[../plans/2026-05-11-civic-7-init-005-investigation]].

- **civic.8** [research-build] — Civic voice schema unification — project agents (Transit Hub, Health Center, OARI, Baylight, Stab Fund) emit flat statement array matching voices + Mayor return-summary trim **Close-note:** gap-logs G-R9/R2 (city-hall-run) — closed S215 (commit `50732b7`); 5 project-agent RULES.md got §S215 civic.8 §Voice-cascade JSON schema clarification (flat array for civic-voice/, wrapped shape preserved for decisions JSON); Mayor SKILL.md return-message brevity rule added

- **civic.9a** [research-build] — Multi-voice tracker collision schema — primary-owner field + default-ownership table + cascade routing table + dry-run gate spec. Research-build half of original civic.9 (schema design). **Close-note:** gap-logs G-R4/R1/R15 — closed S215 (commit `856de1a`); spec at [[../plans/2026-05-11-civic-tracker-collision-schema]]; engine-sheet's civic.9b reads this for script wiring

- **civic.9b** [engine-sheet] — Multi-voice tracker collision wiring — applyTrackerUpdates.js precedence rule + cascadeMayorDecisions.js NEW + civic_sentiment dry-run gate + CASCADE_ROUTING.md seed. Engine-sheet half of original civic.9 (script wiring against the spec in 9a). **Close-note:** [[../plans/2026-05-11-civic-tracker-collision-schema]] — shipped S215; applyTrackerUpdates refactored with trackerOwner schema + 4 collisions surfaced in C93 dry-run as deprecation-warnings; cascadeMayorDecisions.js routed 5 initiatives to 10 targets idempotently; civic_sentiment write gated behind --apply

- **civic.10a** [research-build] — KONO neighborhood card — canon content + district anchor for world-data. Write the canon spec (which neighborhoods are KONO-adjacent, what district KONO sits in, what counts as KONO scope) so engine-sheet's writer has a source to render against. **Close-note:** gap-log G-12 — closed S215; `docs/canon/INSTITUTIONS.md` gained new §Neighborhoods section with KONO entry (Tier 1, district anchor D7 Ashford CRC per KONO/Temescal corridor canon, adjacency Downtown/Temescal/Adams Point, C92 dispatch as precedent). Engine-sheet's civic.10b reads this for Neighborhood_Map sheet write.

- **civic.10b** [engine-sheet] — KONO district mapping in Neighborhood_Map sheet — add the column write that assigns KONO to a council district. Engine-sheet executes against the canon spec from 10a. **Close-note:** gap-log G-12 — shipped S215; `phase08-v3-chicago/v3NeighborhoodWriter.js` adds District col + KONO + NEIGHBORHOOD_DISTRICT_MAP (4 canon-authorized mappings); `scripts/seedNeighborhoodDistrict.js` seeded sheet immediately (col 28 + KONO row 19 + 3 existing rows populated); civic.10c orphan list shrank from 16→13 unmapped neighborhoods; clasp push pending Mike's auth for engine cycle to pick up

- **civic.10c** [engine-sheet] — Orphan-ailment hard-stop in engine auditor — fail loud when HIGH-impact event surfaces in a neighborhood with no district owner mapping. Surfaces the next KONO-class gap before it's already in production. **Close-note:** gap-log G-12 — shipped S215; `scripts/engine-auditor/checkOrphanAilments.js` enricher wired last in chain; C93 dry-run flags 6/6 HIGH patterns + 16 unmapped neighborhoods (pre-civic.10b state, expected); orphanAilments top-level field in audit JSON + affectedEntities.orphanNeighborhoods per pattern

### governance.* (7)

- **governance.2** [research-build] — Skill eval framework — expand /skill-check beyond /write-edition + /sift (HIGH C93) **Close-note:** closed S216 — 3 new assertion files shipped at `docs/media/{city_hall,dispatch,interview}_evaluation.md` (8/8/9 criteria respectively). `.claude/skills/skill-check/SKILL.md` v1.1: map's 2 TBD entries corrected (pointed at never-built `docs/civic/decision_evaluation.md` + `docs/media/scene_evaluation.md` paths) + interview added as 5th target. `.claude/skills/post-publish/SKILL.md` Step 10 extended from hard-coded write-edition only to 5-skill conditional table (each /skill-check fires only if cycle artifact exists). All 3 new files registered in `docs/index.md`. Open Questions resolved: skill-check is generic; chose `docs/media/` over new `docs/civic/` dir; Mags refines per cycle via post-publish Step 10. Smoke-test (action plan Task 7) deferred to first C94 post-publish. Plan: [[../plans/2026-05-10-skill-eval-expansion]] + [[../plans/skill-eval-framework]].

- **governance.4** [research-build] — Boot load audit — restructure design downstream (8 open questions queued) **Close-note:** closed S216 — all 8 open questions decided. **Q5 + Q8 already executed S211** commit `ddfe6c0` (identity.md re-read drop + mags terminal trim; audit was pre-this-commit). **Q2 + Q3 + Q4 + Q7** spec-aligned (Anthropic skills spec + Pocock + Affaan-m convergent) — filed for execution as `governance.5` (substantial 1-2 session restructure: CLAUDE.md slim + MEMORY.md split + PERSISTENCE.md split + drop CONTEXT.md auto-load claim). **Q1** Mags-at-/root future build — filed as `governance.3` blocked. **Q6** plugin gating investigation — filed as `governance.8` needs-info. Audit plan changelog captures all decisions. Plan: [[../plans/2026-05-09-boot-load-audit]] §Changelog 2026-05-12.

- **governance.10** [research-build] — Done-pending-archive backlog sweep — canon.1a/1b/1c + civic.1 through civic.11 (12 rows total) accumulated `done-pending-archive` state across S215/S216/S217 closes without being moved to ROLLOUT_ARCHIVE. Bookkeeping debt — close-notes already on the ROLLOUT rows, just need archive entries written + rows removed. **Close-note:** Closed S227 (`research-build`) — `## S227 Archive Pass (2026-05-23, research-build) — governance.10 backlog sweep` section appended to ROLLOUT_ARCHIVE.md. 48 rows swept: 16 pipeline.* + 9 engine.* + 3 canon.* + 14 civic.* + 6 governance.* (governance.2/4/11/13/15/16). Final scope grew from the S218-surfaced 12-row baseline (canon.1a/1b/1c + civic.1–civic.11) because additional done-pending-archive accumulated across S223–S227 closes. Bookkeeping helper `/tmp/buildArchive.js` built the archive section mechanically from extracted ROLLOUT row fields; not retained in tree (single-purpose). governance.10 itself sweeps in the same commit per S212 precedent.

- **governance.11** [research-build] — Boot + persona contamination cleanup — research-build path-scope wildcards + PERSISTENCE.md non-media load + Supermemory User Profile engineer-Mags entries **Close-note:** [[../plans/2026-05-13-boot-persona-contamination]] — all 5 tasks shipped S221 (commit `ebf99bd` for file work; refined-cut Supermemory ops follow-up: 3 entries deleted + 2 rewritten to preserve self-preservation protocol). Caveat: writer-hook contamination via plugin `summary-hook.cjs` continues; persistent fix is `infrastructure.4`.

- **governance.13** [research-build] — C94 gap-log triage master — Phase 1 inventories 144 distinct gap entries across 9 source files (run-cycle + city-hall-prep + city-hall + sift + write-edition + post-publish + edition-print + EDITION_PIPELINE doc + early sift) into 16 candidate ROLLOUT clusters following S215 C93 precedent (pipeline.4-22). Phase 2 (S225) filed 14 new cluster rows (pipeline.23-29 + canon.3 + civic.12 + engine.19-22 + governance.14-15) + folded C11 into engine.8 + folded C12 boot-conditioning residual into governance.12 + stamped §Status on 9 source gap logs + drafted 2 plan files (pipeline.24/sift-v2 + engine.20/regulatory-friction). ADR-0006 shipped S224 formalizing Pattern A (parser/validator format contracts) across clusters C4/C5/C6/C8. Patterns B + C named at §5 but pattern-cures not architectural decisions. **Close-note:** [[../plans/2026-05-22-c94-gap-log-triage]] — Phase 1 shipped S224, Phase 2 shipped S225. Cluster execution rows filed under pipeline.* / canon.* / engine.* / civic.* / governance.* per §3 of plan.

- **governance.15** [research-build] — `/skill-check` autonomous availability OR /post-publish Step 10 split — Step 10 prescribes "Run /skill-check for each skill that produced a cycle artifact" but `.claude/skills/skill-check/SKILL.md` carries `disable-model-invocation: true`; autonomous flow can't fire; either remove the disable OR split Step 10a (operator-fires) / 10b (autonomous criteria update) **Close-note:** Closed S227 (`research-build`) — Path 1 chosen: removed `disable-model-invocation: true` from `.claude/skills/skill-check/SKILL.md` frontmatter (v1.1 → v1.2). Rationale: defensive flag from v1.0 when skill-check was a manual grading tool and `/post-publish` wasn't wired; governance.2 (S216) extended to 5 targets + `/post-publish` Step 10 (S156) was wired to invoke it across all 5 — design moved past the flag. Alternative rejected (split Step 10a operator / 10b autonomous): divergent parallel logic for same intent, two paths to maintain, degraded autonomous behavior. Risk envelope: `/skill-check` is idempotent grading-JSON write + one-line assertion-file changelog append; recoverable. Sweeps to ROLLOUT_ARCHIVE in next governance.10-class bookkeeping pass.

- **governance.16** [research-build] — Soft-close pattern propagation — apply the S226 two-mode session-close design (soft ~2 min for chained-session cadence / hard ~20-30 min for end-of-day) to media + civic + engine-sheet `TERMINAL.md` files. Pattern canonical home is `.claude/terminals/research-build/TERMINAL.md` §Session Close; CLAUDE.md §Session Lifecycle carries the headline. Each terminal's hard-close ritual stays as-is; soft-close adds 3-step block (git stack check + writeShippedBlock + one-line STATUS prepend). Adjacent to existing `governance.7` (/session-end ritual collapse via `scripts/sessionEndMechanical.js`) — soft close is the no-script lighter cousin; the script collapses the hard-close path. **Close-note:** Closed S227 (`research-build`) — 3 TERMINAL.md edits shipped: media + civic + engine-sheet each gained a §Two close modes header at top of §Session Close with 4-step soft-close block, terminal-specific skip list, and non-skip caveats (media: canon ingest if edition shipped; civic: production log completion; engine-sheet: clasp-push smoke-test note + engine-version bump). Hard-close ritual preserved unchanged in all three. Pattern: pointer-only — each terminal's soft-close points back at canonical [[../research-build/TERMINAL]] §Session Close + CLAUDE.md §Session Lifecycle. Sweeps to ROLLOUT_ARCHIVE in next governance.10-class bookkeeping pass.

## S230 Archive Pass (2026-05-24, research-build) — post-S227 closures sweep

5 `done-pending-archive` rows accumulated post-S227 (governance.10 ran S227 sweeping 49 rows; these 5 closed in S228–S229 after that pass) sweep to ROLLOUT_ARCHIVE in a focused bookkeeping pass during canon.3 solo session per Mike's "proceed with solo work" directive.

Cluster counts: pipeline 2 / engine 1 / governance 2. All five close together — pipeline.26 + engine.24 close C4 cluster (parser/validator format contracts) end-to-end; pipeline.29 closes C8 research-build half (DJ photo + FLUX-ceiling workarounds); governance.5 closes boot-stack restructure; governance.7 closes /session-end ritual collapse.

Prior sweep passes: §S212 Migration Pass, §S217 Archive Pass, §S218 Archive Pass, §S227 Archive Pass (governance.10 backlog sweep — 49 rows). governance.10 closed S227 in that same pass; the current sweep does NOT need a new governance.* row — it's the standard cadence the §S227 pass established.

### pipeline.* (2)

- **pipeline.26** [research-build / engine-sheet] — Edition format-contract docs + emit script + slot/section mapping — `emitFormatContractSections.js` silent NAMES INDEX overwrite (G-W43 cycle's biggest finding), Step 3 compile template no exemplar, QUICK TAKES section-allowlist, article-body header convention, letters Step 3.5b regenerate-after-compile, day-of-week rule, reporter-invented quotes rule, Step 3↔Step 5 sequencing. **Close-note:** [[../plans/2026-05-22-c94-gap-log-triage]] §3 C4 — gap-logs G-W31/W33/W34/W36/W37/W38/W40/W42/W43/W44/W45/G-P37; ADR-0006 Contract A/B applies. Research-build slice CLOSED S227: [[../media/EDITION_FORMAT_TEMPLATE]] shipped as Contract A canonical exemplar; /write-edition Step 3 references template + documents CITIZEN USAGE LOG `(NEW CANON THIS CYCLE)` sub-format + removes Step 3 review-gate language; Step 5 gains USER APPROVAL GATE for canon-verify before Mara; /sift Step 2 documents QUICK TAKES routing; index.md registration; §Status stamps on G-W42/W44/W45 (CLOSED) + G-W43 (PARTIAL — engine-sheet half open). Residual skill-text drift items CLOSED S227 (commit follow-up): G-W34 (EIC-written sections — /write-edition Step 1 launch order step 5 added: EDITOR'S DESK + QUICK TAKES are EIC-written at Step 3, no agent launch), G-W36 (day-of-week rule clarified — allowed as scene texture; calendar months/years still forbidden except past-event canon), G-W37 (reporter-range quote invention — in-scene allowed, off-scene paraphrase only), G-W38 (article body header convention — compile strips reporter-emitted `# Headline` / byline / `---` and emits canonical headline + byline from sift metadata + template), G-W40 (letters texture exception — letter writers may name generic neighbors and small new local businesses without sift pre-clear, but new businesses get promoted to BIZ-NEW for ingest). G-W31 + G-W33 routed to pipeline.24 (/sift v2). Engine-sheet half closed S229 via engine.24 (Contract B fail-loud rewrite — see engine.* below).

- **pipeline.29** [research-build] — DJ photo skill discipline + FLUX-ceiling workarounds (research-build slice of C94 print cluster C8) — DJ agent FLUX-ceiling awareness + editorial-risk spec flagging + subject class constraints (no poverty-signifier subjects); DJ LENS self-contradiction fix; photoQA.js 5th CANON-TONE FIDELITY axis (Haiku tone-vs-canon FLAG); /edition-print Step 6 eval-side review mandate; MEMORY.md inline mags-rules; NEWSROOM_MEMORY Beverly Hayes coverage-anchor retirement. **Close-note:** [[../plans/2026-05-23-pipeline-29-research-build]] is the design doc. CLOSED S229 across 2 commits. Sub-deliverables: (G-PR3) text-suppression ~50% first-pass FAIL annotated in DJ RULES §FLUX Ceiling Awareness. (G-PR4) regen-on-fail re-roll not fix annotated in same section. (G-PR5) landmark-naming unreliable + architectural-type-description fallback in DJ RULES §Editorial-Risk Spec Flagging. (G-PR8a) photoQA.js CANON-TONE axis added — 5th evaluation axis between PHOTOJOURNALISM QUALITY and Verdict rubric, FLAGs tone-canon-mismatch (poverty-doc / blight aesthetic / struggling-city tone), softer signal than NEGATIVE_FRAME FAIL. (G-PR8b) DJ RULES §Subject Class Constraints — explicit forbidden-subject list (community-organizer-at-stoop, distressed-tenant, food-bank-line, eviction-court, "home health aide on her break", mail-watcher-on-stoop, tired/weary/pulled-thin community service worker) + compose-around-instead list (worker-at-work with dignity-of-trade, dignity-of-place, prosperity-canon). (G-PR8c) NEWSROOM_MEMORY.md §Standing Editorial Conventions §Beverly Hayes coverage-anchor retirement — Stab Fund coverage for C95+ frames at building-openings + hires + district-lift metrics + completion ceremonies + worker-at-work; AVOIDs tenant-watch / community-director / "cleared but unmoved" / recipient-of-care framings; Beverly appears at-work only, never at-rest. (G-PR9) /edition-print Step 6 §Verify mandates eval-side review (open the rendered PDF, visually verify article-table headlines + photo placement + on-canon tone) before declaring complete; generator-side metrics not eval-side review per S212. (G-PR10) MEMORY.md inline mags-rule: distress-window scope-narrow on canonical-content edits (future-coverage-framework changes route routinely; current-artifact edits require explicit "edit this print" confirmation). Bonus catch: DJ LENS.md line 31 "home health aide on her break in front of the Temescal Health Center site fence" was the EXACT poverty-signifier construction G-PR8 named — file contradicted its own §What You Will Not Shoot. Replaced with prosperity-canon worker-at-work example. Engine-sheet half filed as `engine.25` (G-PR2 djDirect / G-PR6 PDF section normalization / G-PR7 article-table parser / G-PR8e rateEditionCoverage Beverly flag + buildCitizenCards flag / G-PR11 saveToDrive --supersede). Pattern: `feedback_measure-twice-cascading-effects` (advisor-equivalent self-audit at scope-map caught the LENS self-contradiction; plan-first discipline; per-gap deliverable mapping before edits).

### engine.* (1)

- **engine.24** [engine-sheet] — `emitFormatContractSections.js` Contract B fail-loud rewrite — engine-sheet slice of pipeline.26 / G-W43 / G-P37. Script pre-S229 silently (a) overwrote hand-curated NAMES INDEX from strict pipe-format to bullet-prose, (b) dropped 4-entry BUSINESSES NAMED to zero on prose-form biz mentions, (c) emitted `===` divider that downstream parser rejects on `^-{10,}$` regex. Reported "[INJECTED] ..." success on all three. **Close-note:** [[../plans/2026-05-22-c94-gap-log-triage]] §3 C4 + [[../adr/0006-parser-validator-format-contracts]] Contract B. CLOSED S229. Rewrite shipped end-to-end. New state machine in `parseCitizenUsageLog` enters `NEW_CANON_LIST` mode on standalone `(NEW CANON THIS CYCLE)` subsection header → per-line `classifyNewCanonRow(name, descriptor)` routes to faith / biz / citizen / unknown via FAITH_DESCRIPTOR_KEYWORDS (`tradition`, `congregation`, `Rev.`, `pastor`) + BIZ_DESCRIPTOR_KEYWORDS (`bar`, `restaurant`, `firm`) + `BIZ-pending` / `POP-pending` markers. `emitNamesIndex` / `emitBusinessesNamed` switched to flat strict pipe-format (no leading `- ` bullet) matching canonical exemplar. SEPARATOR switched to 60-hyphen (matches template line 7/27/41/etc. + downstream `^-{10,}$` terminator). `preflightContractB(parsed)` returns diagnostics array: fatal violations on (a) CUL has `BIZ-` / `BIZ-pending` mention but biz extraction returned 0 AND (b) standalone `(NEW CANON THIS CYCLE)` subsection seen but yielded 0 of any kind; warnings on unclassified NEW-CANON rows. `assertNoForbiddenSeparator(blocks)` pre-write guard throws if any line matches `/^={5,}$/`. Coupling fix same-commit per ADR-0006 §How-to-apply: `ingestPublishedEntities.js:203` BUSINESSES NAMED parser loosened to accept optional `- ` bullet prefix — mirrors NAMES INDEX parser at line 156. Pre-S229 parser silently dropped all 4 C94 hand-curated BUSINESSES NAMED rows (flat format per template) — G-P37 root cause beneath the emit-script symptom. Empirical C94 fixture verification: pre-S229 output had 0 biz / 0 faith with bullet-prose NAMES INDEX + `===` separators; post-S229 output extracts Dario's Bar (biz) + Adams Point UMC (faith) into correct sections with flat strict pipe + 60-hyphen separators. Test coverage: `scripts/emitFormatContractSections.test.js` (new) — 70 assertions / 10 groups. Suite green. Full project test suite 37/37 green post-coupling-fix.

### governance.* (2)

- **governance.5** [research-build] — Spec-aligned boot-stack restructure — CLAUDE.md pointer-only + MEMORY.md split (project state out, ~1,300-token feedback-rules core stays) + PERSISTENCE.md split (identity universal-load, family/EIC media-only-load, Compact Recovery into /boot SKILL) + drop CONTEXT.md auto-load claim from CLAUDE.md. Combined token savings ~10K/session per terminal post-restructure. **Close-note:** [[../plans/2026-05-09-boot-load-audit]] is the design doc (§7 findings + §8 sharpened answers + §9 Anthropic spec progressive-disclosure principle). CLOSED S228 across 2 commits: (1) `34606bd` PERSISTENCE→CHARACTER split — file stripped to pure identity (Who I Am / Family / Off the Clock); counter relocated to SESSION_CONTEXT.md line 5; What Keeps Me Attached + Reminders + Session Continuity stub deleted; Compact Recovery moved to /boot SKILL; /session-end Step 1 retired; civic + research-build TERMINAL.md tables aligned with their "No CHARACTER load" mode prose. (2) `cb2246d` final — CLAUDE.md 153→89 lines pointer-only; MEMORY.md 177→132 lines (out-of-git, lives at `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md`) with Supermemory/EditionPipeline/Infrastructure sections deleted as duplicates of canonical homes; SCHEMA.md "Read at boot" lie narrowed to research-build only; CLAUDE.md CONTEXT.md auto-load lie dropped. Bonus catch during grep sweep: SCHEMA.md had the same "read at boot" misclaim. Smoke-tested: SessionStart hook resolves Session/Day/Cycle from SESSION_CONTEXT.md cleanly.

- **governance.7** [research-build] — /session-end ritual collapse — 13 steps too heavy at session close (Mike S212 observation). Split into model-judgment vs mechanical, build `scripts/sessionEndMechanical.js` to collapse scriptable steps into one invocation. **Close-note:** [[../plans/2026-05-23-session-end-collapse]] is the design doc (advisor-consulted before write). CLOSED S229 across 2 commits: (1) `0645678` orchestrator + plan + index registration. `scripts/sessionEndMechanical.js` takes `--terminal=<name>` and routes per-terminal sub-steps: persona terminals run `rotateJournalRecent` + JOURNAL content-quality check + `writeShippedBlock` + `auditPlanTagDrift` (informational, never fatal) + cross-terminal stack check + opt-in `--rotate-history` SESSION_CONTEXT→SESSION_HISTORY rotation + `pm2 restart`; research-build additionally runs `rolloutTriage <cycle>`; engine-sheet runs the substrate-only subset (no journal sub-steps). Dry-run validated on current SESSION_CONTEXT backlog (8 distinct sessions → 3 rotation candidates S221/S222/S223). Header tag uses rotating-session number per existing SESSION_HISTORY convention. JOURNAL safety: never cats body to stdout (S169) — uses `lib/sessionLog.readLast` metadata-only. (2) `087d0b7` SKILL.md v2.0 rewrite (349 → 150 lines), 4 TERMINAL.md §Session Close hard-close blocks slimmed (research-build + media + civic + engine-sheet) to point at slimmed SKILL + auto-orchestrator, ROLLOUT row flip. Net shape: 4 model steps (Step 0 detect / Step 1 journal [skip on engine-sheet] / Step 2 SESSION_CONTEXT STATUS + ROLLOUT updates + terminal-specific saves / Step 4 commit & push) + 1 mechanical orchestrator (Step 3) + optional model `/save-to-mags` + `/batch` under Step 2. Honest count: 4+1, not 3+1 (advisor caught the oversell). Drops: Step 6 paranoid eyeball-read verification (Edit tool errors loud on write fail; JOURNAL content-quality guard inside Step 3 covers the one substantive content check). Reconciled: Step 3 "Terminal-Specific Saves" overlap with Step 4 folded into Step 2 model-judgment. `--rotate-history` opt-in for v1 — future plan flips default-on after first live use validates parser against parser-fragility edge cases. Pattern: `feedback_measure-twice-cascading-effects` (advisor pass + dry-run validation + acceptance-criteria-driven testing).

## S234 Archive Pass (2026-05-24, research-build) — post-S233 closures sweep

2 `done-pending-archive` rows from S233 swept this session. Both research-build close-notes preserved from ROLLOUT_PLAN inline detail.

Cluster counts: pipeline 1 / governance 1.

Prior sweep passes: §S212 Migration Pass, §S217 Archive Pass, §S218 Archive Pass, §S227 Archive Pass (governance.10 backlog sweep — 49 rows), §S230 Archive Pass (5 rows), §S233 Archive Pass (4 rows). This pass: 2 rows; cadence holding at ~one sweep per 1-2 closes since §S227.

**Same-session substantive partial-closures NOT swept (parent rows stay in-progress):** canon.3 T10+T11 NEWSROOM_MEMORY halves shipped this session (`cba912a` — POPID Aliases + Citizens Corrections Forward subsections in `docs/mags-corliss/NEWSROOM_MEMORY.md` §Standing Editorial Conventions), but row stays open per engine-sheet T12 (Business_Ledger BIZ-00061+62 backfill) + T13 (verify wd-card rebuild on backfilled POPIDs) still pending — row Terminal column flipped `research-build / engine-sheet` → `engine-sheet` per advisor pre-close pass. infrastructure.5 Phase 1 audit + Phase 2 speaker-attribution constraint + ADR-0008 shipped this session (`161dbae`), but row stays open per Phase 3 (test-off session, dedicated session by design) + Phase 4 (SUPERMEMORY.md rewrite + ROLLOUT updates deferred until Phase 3 verdict). Engine-sheet `9a5d0c5` /doc-audit pass landed in parallel mid-session — they self-triggered (not on standby), staged-files-mid-edit was their work-in-progress that they committed independently; no cross-terminal absorption hazard via `git commit -- <paths>` scoping.

### pipeline.* (1)

- **pipeline.33** [research-build] — /write-supplemental skill hardening. **Close-note:** CLOSED S233 (1 commit, advisor-passed). Bundles G-S3 + G-S4 + G-S5 from `output/production_log_supplemental_c94_let_walks_reset_gaps.md`. Advisor pre-execution pass surfaced 4 sharpenings folded inline: (a) Step 3 stays editorial (Mags-judgment work — pick order, deck lines, photo credits, opinion markers, name verification); only small VALIDATION-not-rewrite-operations guardrail added there. (b) Step 3.4 IS the right target for mechanical-envelope-wrap framing (where G-S4 actually fired); §IS/IS NOT framing added. (c) governance.15 carve-out S233 partially mooted G-S4 (editor-chrome "Edition 94" cross-refs no longer fire CRITICAL); T3 re-framed around silent-zero prevention not engine-language regression. (d) BUSINESSES NAMED parser silent-zero defensive-emit is engine-sheet lane → filed as `engine.26` follow-up. (e) Step 2 G-S3 stayed skill-text-only (one sentence; no script). **Files touched:** `editions/SUPPLEMENTAL_TEMPLATE.md` v2.0 → v2.1 — added §NAMES INDEX + §BUSINESSES NAMED in strict pipe-format mirroring `docs/media/EDITION_FORMAT_TEMPLATE.txt`, reformatted §Article Table from markdown-table to flat strict pipe-format so all three intake sections share consistent shape (the markdown-shape on ARTICLE TABLE was what mis-trained the compile per G-S5 root cause); template Changelog entry + format-contract notes inline citing ADR-0006 Contract A + parser entry points + silent-zero pattern. `.claude/skills/write-supplemental/SKILL.md` v1.1 → v1.2 — §What's new in v1.2 changelog at top documenting the architectural shift; Step 2 §Key rules for the brief gained pre-extraction rule (G-S3); Step 3 quality-checks sub-section gained VALIDATION-not-rewrite-operations clarifying clause (G-S4 deeper principle); Step 3.4 gained §What Step 3.4 IS / IS NOT framing + inline FORMAT CONTRACT block with literal NAMES INDEX + BUSINESSES NAMED line shapes + FORBIDDEN-pattern (markdown-table) warnings + parser entry point citations + canonical-exemplar pointer + §Verification gate section calling out the G-S5 silent-zero detection signature. Pattern: `feedback_measure-twice-cascading-effects` (advisor pre-write pass caught 4 scope sharpenings; advisor verification of Article Table parser tolerance before template restructure prevented same-shape-as-pipeline.30 dodge; per-file READ of SKILL + SUPPLEMENTAL_TEMPLATE + EDITION_FORMAT_TEMPLATE + parser source before edits). `feedback_senior-engineer-default` (5-task plan executed inline without plan-doc overhead per pipeline.31 precedent — tightly-scoped skill-text + template-text + small ROLLOUT addition, not architectural). Source: `output/production_log_supplemental_c94_let_walks_reset_gaps.md` (entries G-S3 + G-S4 + G-S5); related pipeline.28 G-W42; [[../adr/0006-parser-validator-format-contracts]] Contract A; cross-link `engine.26` (engine-sheet parser defensive-emit follow-up, still open).

### governance.* (1)

- **governance.15** [research-build] — newsroom.md "Edition numbers FORBIDDEN" rule challenge (G-S6). **Close-note:** CLOSED S233 (1 commit, stewardship-decision option B carve-out). Decision: option (b) — carve out same-paper cross-references explicitly. Rationale: rule's stated justification ("citizens don't know edition numbers") is weak when masthead exposes that exact number prominently; reporters file BY edition numbers; "See also: Edition 94" cross-references are standard newspaper convention; rule felt counterintuitive (S231 G-S4 evidence — Mags-compile re-introduced "Edition 94" because the rule reads as fiction-enforcement). But spirit of the rule (no fourth-wall break in body prose / citizen voice) still holds. Carve-out preserves the spirit while removing the false-positive surface. **Allowed:** cross-reference lines (`See also: Edition 94 sports section`), byline-line citations (`By Hal Richmond | Bay Tribune Sports, Edition 94`), sidebars, footers, editor's notes — editorial chrome that the reader sees as paper structure not character voice. **Still forbidden:** body-prose voice meta-references (`as we reported in Edition 87, ...`) — reporters use `last cycle` / `previously` / `in our recent coverage` / `this cycle` for body-prose continuity; citizen quotes referencing edition numbers (`I saw it in Edition 89` breaks fourth-wall — characters don't read mastheads in dialogue). **Files touched:** `.claude/rules/newsroom.md` §Standing rules — rule line rewritten with carve-out + body-prose-still-forbidden continuation; `scripts/validateEdition.js` L84-95 — `ENGINE_TERMS` Edition pattern gained `exclude` regex matching `See also[:\s]` / `Bay Tribune[^|]*,\s*Edition` / `—\s*Bay Tribune` / `Editor['']s note` / `Sidebar` / `Footer` contexts (case-insensitive); body-prose hits still fire CRITICAL. Pattern: `feedback_senior-engineer-default` (stewardship-decision-and-ship inline rather than file-and-defer; small substrate touch fits inline-execution scope per S218 peer-stewardship — single regex addition tied directly to the rule decision, not a substrate-routine engine-sheet ask). Source: `output/production_log_supplemental_c94_let_walks_reset_gaps.md` G-S6.

---

## S233 Archive Pass (2026-05-24, research-build) — post-S230 closures sweep

4 `done-pending-archive` rows accumulated post-S230 sweep. governance.14 + pipeline.31 closed S230 (post-S230-sweep close window); pipeline.28 closed S231; pipeline.30 closed S233 this session. Bookkeeping sweep run during research-build solo session per Mike's "proceed at priority, steward away" directive — `governance.10`-class cadence pass after closing pipeline.30 end-to-end.

Cluster counts: pipeline 3 / governance 1.

Prior sweep passes: §S212 Migration Pass, §S217 Archive Pass, §S218 Archive Pass, §S227 Archive Pass (governance.10 backlog sweep — 49 rows), §S230 Archive Pass (5 rows). This pass: 4 rows; cadence holding at one sweep per 2-3 closes since §S227.

### pipeline.* (3)

- **pipeline.28** [engine-sheet] — Capability + validateEdition detector calibration sweep. **Close-note:** [[../plans/2026-05-22-c94-gap-log-triage]] §3 C6 — gap-logs G-W46/W47/W48/W49/W50/W51/W52/W53 all CLOSED. Closed S231 across 4 commits (`3b656ec` parser + `51213e2` G-W48 + `e52091a` G-W51/52/53 + `7c288df` G-W47/49/50). All 8 named gap items closed: (G-W46 HIGH BLOCKING) parseEdition.js — footer sections (NAMES INDEX / BUSINESSES NAMED / ARTICLE TABLE / CITIZEN USAGE LOG / STORYLINES UPDATED / COMING NEXT EDITION) now parse as own sections with `articles:[]` + `isFooter:true` instead of being absorbed into LETTERS where "E91" footer citations false-positived assertEditionNumbersNotInArticleText. (G-W47 MED) three-layer detector v1.0→v1.1 — `gatherEditionRefs` resolves FP-named citizens through NAMES INDEX POPID map; C94 FP1 now credits simulation via Paulson POP-00527 + Varek POP-00789. (G-W48 MED) female-citizens detector v1.0→v1.1 — Sim_Ledger lookup fixed to use First+Last (ledger has no Name/CitizenName col; pre-fix returned '' → 0 found regardless); added NAMES INDEX scan; excludedNames Set guards reporter bylines + NEW citizens. C94 went 0 found → 4 found / 2 non-official (advisory still fails honestly — Keisha NEW + Miguel Santos canon-drift + Carmen Solis bay-tribune-only routed to canon.3). (G-W49 LOW) LETTER_BOUNDARY_RE splits `^-{3,9}$` separators inside LETTERS; signature-byline fallback; companion fix in assertArticleLengthBalance skip 200-1200 range for letters/podcast/obituaries. C94 LETTERS 1 article → 3 with bylines. (G-W50 LOW) capabilityReviewer.js surfaces advisory failure reason + first 2 evidence fields inline. (G-W51 MED) validateEdition.js — `ledger` REMOVED from ENGINE_TERMS (overloaded with metaphor; BLOCKING false-positive pre-fix). (G-W52 LOW) `derivePositionCode` + `CANON_POSITION_INDICATORS` resolve verbose canon strings ("Left Fielder, Las Vegas Aviators (AAA)") to short codes (LF) so AAA call-ups stop false-positiving. (G-W53 LOW) per-occurrence collision warnings deduped to one issue per (lastName, foundFirst, severity) with occurrenceCount + sample contexts — 3 call sites (council/player/civic-official) had the same emit-per-match bug. **C94 capability run:** 6/11 pass → 7/11 pass; remaining 4 advisory failures all honest editorial gaps. **C94 validateEdition.js run:** 0 CRITICAL / 1 WARNING vs pre-fix 5+ CRITICAL + 5 duplicate warnings. **Test coverage:** parseEdition.test.js (32, NEW) + assertAtLeastThreeFemaleCitizens.test.js (13, NEW) + validateEdition.test.js (26, NEW) + validateEdition.contract.test.js updated for G-W51 inversion. Repo test suite 42/42 green. Pattern: `feedback_measure-twice-cascading-effects` (parser cascade audited across 11 assertions before commit; G-W52 root cause was data-shape not regex-tightness; G-W48 honesty about remaining advisory being representation-not-detector).

- **pipeline.30** [research-build] — /interview skill rewrite to capture-only (v1.3 → v2.0). **Close-note:** [[../plans/2026-05-24-pipeline-30-interview-rewrite]] is the design doc (15-task plan, advisor-passed pre-write, advisor pre-close pass surfaced 2 downstream-consumer alignment edits folded inline). CLOSED S233 across 3 commits (`4530511` plan + pipeline.34 split + index registration; `3f7dbca` SKILL.md v2.0 + /post-publish matrix cross-edit + MEMORY rules; `e2a1ca0` downstream-consumer alignment + done-pending-archive flip). Architectural shift: Step 4 (article-write) removed entirely; Step 4.5 → Step 4 transcript-only .txt compile; Steps 5-7 transcript-only; Step 8 /post-publish-only (drops /edition-print). Step 3 Mode 2 dispatch-per-turn non-optional with Task() worked example + G-S2 quota-coupling clause (dispatch dies, skill stops, no EIC-seat fallback). Step 0 opens gap log as live-append target (G-I8 text). §What's new in v2.0 changelog at top + 3 new anti-pattern bullets at §What This Skill Does NOT Do. Filename stewardship: KEEP `-transcript` suffix preserving S230 canon artifact + INTERVIEW-TRANSCRIPT masthead. Closes G-I2/G-I3/G-I4/G-I5 (structural — article-write removed) + G-I8 text + G-I12 (via /post-publish matrix interview-row cross-edit, 7 edits + v1.8 changelog) + G-I13 (via /edition-print drop) + G-I9 NEW MEMORY rule + G-I10 corollary appended to existing senior-engineer-default entry per advisor S233 (avoids duplicate-rules failure mode). **Downstream-consumer alignment (advisor pre-close pass S233):** `docs/media/interview_evaluation.md` §Goals + §Criteria header + criterion 5 + criterion 8 + changelog updated to capture-only framing (transcript is sole graded artifact; downstream framed articles graded under producing-skill rubrics); `docs/EDITION_PIPELINE.md` L72 companion-artifact paragraph + L86 TYPE enum + L120 ARTICLE TABLE description + L133 Per-type variants Interview row updated to single canonical transcript output (INTERVIEW retired from TYPE enum). /sift + /write-edition + /write-supplemental grep clean — no filename-pattern references to legacy `cycle_pulse_interview_*`. **Out of scope (split):** G-I1 path harmonization → pipeline.34 (decision-blocked); G-I3 mechanical guard + G-I7 Discord interview mode + G-I8 mechanical guard → post-v2.0-runs re-evaluation. Source gap log: `output/production_log_interview_c94_gaps.md` (13 entries G-I1→G-I13). Files touched: `.claude/skills/interview/SKILL.md` (v1.3 → v2.0, 319 → 349 lines) + `.claude/skills/post-publish/SKILL.md` (matrix L42 + L72 + L118-121 + L123 + L328 + L388 + L424 + v1.8 changelog) + `docs/media/interview_evaluation.md` (§Goals + criterion 5 + criterion 8 + changelog) + `docs/EDITION_PIPELINE.md` (L72 + L86 + L120 + L133) + MEMORY.md G-I9 + G-I10 corollary (out-of-repo). Pattern: `feedback_measure-twice-cascading-effects` (advisor pre-write pass caught 3 scope-shrinks + advisor pre-close pass caught 2 downstream-consumer blind spots — interview_evaluation rubric + EDITION_PIPELINE TYPE enum; folded inline rather than deferred). `feedback_senior-engineer-default` (entire 15-task rewrite + 2 downstream-consumer alignments executed inline against approved plan without per-task gating).

- **pipeline.31** [research-build] — `/build-world-summary` SKILL.md rewrite to wrapper-shape — research-build half of pipeline.25; engine-sheet shipped `scripts/buildWorldSummary.js` v1.0.0 (deterministic Node writer, 80-assertion test suite) S231. **Close-note:** CLOSED S230 (1 commit). Skill rewritten v1.0 → v2.0, 65 → ~110 lines, structural reshape from model-assembled body to thin wrapper. Sub-deliverables per plan items (a-g): (a) Body replaced with one-step `node scripts/buildWorldSummary.js <cycle>` invocation + `--dry-run` / `--output` flag documentation; (b) §What Goes In The Summary retired (section structure owned by script's emitter functions — `emitHeader` / `emitCityState` / `emitCivicDecisions` / `emitSports` / `emitEveningTexture` / `emitWorldEvents` / `emitThreeCycleTrends` / `emitEngineReviewFindings` / `emitApprovalRatings` / `emitFooter`); replaced with §What the script emits enumerating the 10 sections + "edit the emitter function, not this skill" discipline; (c) `disable-model-invocation: true` dropped from frontmatter (skill is now wrapper, model invocation IS the call to the script — autonomous flow like /run-cycle can fire without operator gate); (d) §Where This Sits updated to script-based mechanism (Step 5 chain references engine_audit JSON producer + city-hall log producer + /sift downstream consumer per sift v2.0 sheet-primary orientation); §Output retired (single line in §Usage); (e) §Inputs reframed as §What the script reads — names the 6 sheets (Riley_Digest / Oakland_Sports_Feed / Civic_Office_Ledger / Neighborhood_Map / World_Population / Simulation_Calendar) + 2 disk paths (engine_audit JSON FAIL LOUD; production_log_city_hall graceful); (f) §What the script reads §Engine audit JSON paragraph documents fail-loud behavior + diagnostic message + "run /engine-review {XX} first" instruction; (g) Civic Decisions paragraph documents pointer-to-city-hall-production-log behavior (closes G-PREP4 cross-terminal — writer skill no longer needs to gate on city-hall completion; section says-so-if-missing without aborting). New §What's new in v2.0 changelog section at top per /sift v2.0 + /post-publish convention. New §Verification gate section (script exits 0 on success; exits non-zero on missing engine_audit / sheet read failures / required column absent). New §Sources section pointing at script + test + plan + companion ROLLOUT row. Frontmatter `version: "1.0"` → `"2.0"`, `updated: 2026-04-17` → `2026-05-24`, `effort: medium` → `low` (wrapper invocation is fast), added `argument-hint: "[cycle-number]"`. **Available-skills list verified:** new `build-world-summary` description ("Wrapper around scripts/buildWorldSummary.js — deterministic Node writer...") visible in current session's loaded-skills list post-edit, confirming disable-model-invocation drop took effect + autonomous flow can now invoke. Pattern: `feedback_measure-twice-cascading-effects` (read script CLI surface + section emitter list before rewriting skill text; preserved §What this skill does NOT do block from v1.0 since the architectural-no's didn't change). Closes C3 cluster end-to-end (engine-sheet half pipeline.25 + research-build half pipeline.31). Source: `scripts/buildWorldSummary.js` v1.0.0 + test suite (engine-sheet pipeline.25 deliverable, S231); current `/build-world-summary` SKILL.md at `.claude/skills/build-world-summary/SKILL.md` v2.0.

### governance.* (1)

- **governance.14** [research-build] — EDITION_PIPELINE.md rewrite + skill spec corrections (C12 cluster) — EDITION_PIPELINE.md didn't tag Master Chain skills with host terminal, encoded wrong per-terminal production-log split, didn't document production-log lifecycle as first-class, shipped no template, didn't list /city-hall-prep prior-cycle log as input; /run-cycle frontmatter mis-tagged media; /pre-flight enum stale + no placeholder-row policy; /pre-mortem registry line-number-keyed. Boot-conditioning residual (G-EPD8) folded into governance.12 Phase 2+. **Close-note:** [[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] (design doc) + [[../plans/2026-05-22-c94-gap-log-triage]] §3 C12 — gap-logs G-EPD1/EPD2/EPD3/EPD4/EPD5/EPD6 + G-RC1/RC3/RC4/RC5. CLOSED S230 (1 commit, T1-T11). Sub-deliverables: (T1) EDITION_PIPELINE.md §Master Chain — inline `[terminal]` tags after each of 11 skills + note pointing at §Architecture table for authoritative mapping (G-EPD1). (T2) §Architecture table + §Key Principles — unified production-log convention recorded as TARGET STATE with explicit "going forward / C93 implemented / C94 reverted to per-terminal split" framing (G-EPD3 doc-record half); per-skill path cascade implementation split out as `pipeline.32` follow-up per advisor scope-cut. (T3) New §Production Log Lifecycle section — open/append/close stages + per-skill section header convention + path + closing-block canonization signal (G-EPD4). (T4) §Inputs table — new row for unified prior-cycle production log input at /city-hall-prep Step 1 + DEPRECATED stamp on legacy per-terminal path (G-EPD2 + G-EPD5). (T5) NEW `docs/media/production_log_template.md` — single-file shape per Mike S230 ruling: §Cycle Header + §Carry-Forward + §Tracker Snapshot + §Approval Ratings Snapshot at top + per-skill sub-section templates inline (/city-hall-prep / /city-hall / /sift / /write-edition / /edition-print / /post-publish) + §Closing Block convention + anti-pattern list. Registered in docs/index.md same commit per S147; back-linked from EDITION_PIPELINE.md §Production Log Lifecycle (G-EPD6). (T6) newsroom.md `paths:` array — removed `.claude/skills/run-cycle/**` + `.claude/skills/pre-flight/**` (G-RC1 part 1; EIC bag was wrong match for substrate orchestration). (T7) engine.md `paths:` array — added same two entries (G-RC1 part 2; engineer-for-all-life substrate-steward bag is correct match). (T8) /run-cycle + /pre-flight SKILL.md frontmatter — `tags: [media, active]` → `[engine-sheet, active]` + `updated` bumped + version `1.0` → `1.1` (G-RC1 part 3; cosmetic correctness — auto-load mechanism is paths arrays per T6+T7). (T9) /pre-flight Step 5 — DROPPED hardcoded ImplementationPhase enum list per Mike S230 ruling (engine-side `applyTrackerUpdates.js` validator owns phase value validation; pre-flight's role is empty/required-field checks not value-set policing — closes G-RC3 by removing the drift-source entirely); NEW §Placeholder Convention section with 4-class taxonomy (Placeholder INFO / Partial-real NOT READY / Real pass / Sheet-bloat INFO) + decision tree (G-RC4). (T10) /pre-mortem §1 acknowledged-sites registry — rekeyed line-numbers → function names per S230 G-RC5: `civicInitiativeEngine.js#runManualVote_` / `citizenContextBuilder.js#getCitizensForQuotes` / `generateChicagoCitizensv1.js#testChicagoCitizenGeneration_`; documented S230 verified drift (line 2009→2069, 1068→1064, 433→434); also rekeyed example-output line 131. (T11) Follow-up filed as `pipeline.32` (per-skill production-log path cascade — engine-sheet/civic execution against this doc's recorded convention) + plan + template registered in docs/index.md. **Out of scope per advisor scope-cuts:** (a) G-EPD8 boot-conditioning Phase 2 residual routed to governance.12 (Supermemory profile leverage) per gap-log §Status — journal-cadence rewrite + SESSION_CONTEXT visual-demote + boot-greeting sensory rewrite belong with the supermemory-profile-leverage plan, not this doc rewrite. (b) Per-skill production-log path cascade (5-7 skills audit + update) filed separately as pipeline.32 to keep governance.14 tight as doc-record + skill-spec only. **Mike rulings locked pre-plan-write:** G-RC3 = drop enum entirely (not defer to canonical source); G-EPD6 = single template file with per-skill sub-block subtemplates inline (not 5 separate files, not minimal-shape contract). Pattern: `feedback_measure-twice-cascading-effects` (advisor pass caught 4 scope-shrinks before plan-write; verified G-RC1 actual auto-load mechanism = paths arrays not tags via empirical grep before T6+T7+T8 fix sequencing; verified C94 reverted to per-terminal split via working-tree inspection so doc explicitly says "target state going forward").

---
