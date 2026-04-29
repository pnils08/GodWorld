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
