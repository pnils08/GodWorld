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
