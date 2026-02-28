# GodWorld — Pipeline Enhancement Rollout Plan

**Created:** Session 55 (2026-02-21)
**Source:** Tech reading sessions S50 + S55 + S60
**Status:** Active
**Last Updated:** Session 66 (2026-02-27)

---

## Phase 1: Edition Pipeline Speed + Safety — COMPLETE (S55)

All three items shipped and pushed to main.

### 1.1 Parallel Desk Agents ✓
**What:** Launch all 6 desk agents at the same time instead of one by one.
**Why:** Each desk reads its own packet and writes its own section. No shared files, no conflicts. Running them in parallel cuts edition production time.
**How:** Update `/write-edition` skill to launch desks using `run_in_background: true` in the Task tool. Collect results as each finishes. Compile when all 6 are done.
**Requires:** Claude Code 2.1.49+ (confirmed — we're on 2.1.50).
**Risk:** If two desks reference the same citizen differently, we won't catch it until compilation. Rhea already checks for this.

### 1.2 Pre-Commit Code Check ✓
**What:** Shell script that runs before every git commit. Catches code rule violations automatically.
**Why:** Prevents bugs like the ones that took all of Session 47 to find — wrong random functions, direct sheet writes, engine language in media files.
**How:** Add a PreToolUse hook matching `git commit`. Hook runs a shell script that scans staged diffs for:
- `Math.random()` (must use `ctx.rng`)
- Sheet write calls outside `phase10-persistence/` files
- `"this cycle"` or raw metric numbers in `editions/` or `docs/media/` files
**Cost:** Zero. Shell script, no LLM calls.

### 1.3 Automated Rhea Retry Loop ✓
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

## Phase 2: Cost + Scale

### 2.1 Desk Model Optimization ✓ (Updated S66)
**What:** Run letters desk and business desk on the best cost-effective model available.
**History:** S55 deployed Haiku. S66 upgraded to Sonnet 4.6 — Sonnet 4.6 now matches Opus on document comprehension (OfficeQA benchmark), users preferred it over Opus 4.5 59% of the time, and it's significantly less prone to overengineering. At $3/$15 per million tokens, it's the sweet spot between Haiku's cost savings and Opus's quality.
**Current state:** Letters + business on Sonnet 4.6. Civic, sports, culture, chicago on Sonnet (inherits default). Rhea on Sonnet.
**Status:** COMPLETE. Upgraded Haiku → Sonnet 4.6 (S66).

### 2.2 Desk Packet Query Interface — DEFERRED
**What:** Instead of dumping the full citizen database JSON into each agent's context, give agents a way to search for only the citizens and hooks they need.
**Why:** Citizen population is growing (630+). Desk packets will eventually exceed agent context limits. Two agents already choked on 500KB packets in Edition 81.
**How:** Build a local script or MCP server that exposes:
- `searchPacket(query)` — find citizens or hooks by keyword
- `getCitizen(popId)` — pull one citizen's full record
- `getHooks(desk)` — pull story hooks for a specific desk
Agents call these functions instead of reading a flat JSON file.
**When:** Build when packets exceed ~50K tokens or population hits 800-900. Summary files currently handle the load.

---

## Phase 3: Engine Health — COMPLETE (S55)

### 3.1 `/pre-mortem` Skill ✓
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

### 3.2 `/tech-debt-audit` Skill ✓
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

### 3.3 `/stub-engine` Skill ✓
**What:** Generate a quick-reference map of every exported function across all 11 phases. Shows what each function reads from ctx and what it writes.
**Why:** Useful after context compaction when session memory is lost, or when starting a cold session on the codebase.
**Status:** SKILL.md created. Ready to use: `/stub-engine`.

---

## Phase 4: Memory + Context

### 4.1 Semantic Memory Search
**What:** Search journal and newsroom memory by meaning, not just keywords. Uses a small local embedding model (embeddinggemma-300M, runs on CPU).
**Why:** Keyword search works now, but as the journal and newsroom memory grow, searching for "civic infrastructure controversies" should find Baylight entries even without that exact phrase.
**When:** Build when memory corpus is large enough that keyword misses matter.

### 4.2 Startup File Freshness Check ✓
**What:** Add a check to the session startup hook that warns if identity files are stale — JOURNAL_RECENT.md older than 48 hours, SESSION_CONTEXT.md older than 72 hours, NEWSROOM_MEMORY.md older than 72 hours.
**Why:** Prevents sessions starting with outdated context without realizing it.
**How:** Added to `session-startup-hook.sh`. Checks file modification timestamps at session start, prints a warning with specific file ages if any are stale.
**Status:** Deployed in startup hook.

---

## Phase 5: API Integration + Cost Optimization

### 5.1 Discord Bot → Dashboard API Consumer
**What:** Refactor the Discord bot to query dashboard API endpoints (`/api/citizens`, `/api/search/articles`, `/api/world-state`, etc.) instead of loading everything into the system prompt.
**Why:** Bot currently reloads full context (identity, journal, edition brief, family data) on every single message — 624 exchanges in 12 days at ~5-10K tokens each. Querying the API on demand means a lighter system prompt and only pulling data relevant to the actual conversation.
**Cost impact:** Major. API calls to localhost are free. Tokens saved per message could be 50%+.
**Status:** Not started.

### 5.2 Evaluate Haiku for Discord Bot
**What:** Test switching the Discord bot from Sonnet to Haiku for casual conversation.
**Why:** Most Discord exchanges are casual chat. Haiku handles conversational voice well at a fraction of the cost. Reserve Sonnet-level quality for editorial work.
**Risk:** May flatten nuance in complex conversations. Test for one week and compare.
**Status:** Not started. Do 5.1 first — lighter prompt + cheaper model is the full win.

### 5.3 Morning Heartbeat Disabled ✓
**What:** Removed daily-reflection.js from crontab. No more 8 AM auto-message.
**Why:** Cost savings. Sonnet call every morning adds up. Mags is already present via Discord bot and nightly reflection.
**Status:** Done (Session 60, 2026-02-23).

### 5.4 Desk Agents → Dashboard API Consumer
**What:** During edition runs, desk agents query `/api/citizens/:popId`, `/api/search/articles`, `/api/hooks` instead of receiving everything in a flat JSON packet.
**Why:** Same principle as 5.1 — lighter context, targeted data retrieval. Becomes essential as population grows past 800.
**Depends on:** Phase 2.2 (query interface concept). Dashboard API already has the endpoints.
**Status:** Not started. Current packet sizes are manageable.

---

## Phase 6: Newsroom Intelligence (from SuperClaude research)

### 6.1 Structured Errata Records ✓
**What:** Machine-readable `output/errata.jsonl` file supplementing NEWSROOM_MEMORY.md prose. Each entry: edition, date, desk, reporter, errorType, severity, description, rootCause, fix, adopted, citizenInvolved, recurrence.
**Why:** NEWSROOM_MEMORY is prose — good for editorial reading, hard to query programmatically. Structured records let agents and scripts search past mistakes by desk, error type, citizen, or pattern.
**How:** Created `output/errata.jsonl` seeded with 25 errata entries from E81-E84. Error types: vote_swap, data_fabrication, position_error, phantom_citizen, real_name_leak, agent_failure, voice_failure, citizen_overexposure, premature_publication, etc. Recurrence field tracks cross-edition patterns (e.g., vote swap E82→E83→E84).
**Status:** COMPLETE (S63). Seeded with E81-E84 errata. Future editions append via write-edition pipeline (Step 5.5) or 6.2 auto-documentation.

### 6.2 Auto Post-Edition Documentation ✓
**What:** After Rhea's verification pass, automatically append findings to errata.jsonl. Manual NEWSROOM_MEMORY.md update remains editorial (Mags voice).
**Why:** If Mags skips updating errata, the knowledge gap compounds. Automated parsing ensures structured records stay current.
**How:** Created `scripts/appendErrata.js` with two modes:
1. **Report parsing:** `node scripts/appendErrata.js --edition 85 --report output/rhea_report_c85.txt` — parses Rhea's CRITICAL/WARNING entries, infers desk/errorType, appends to errata.jsonl
2. **Manual entry:** `--manual --desk civic --errorType vote_swap --severity CRITICAL --description "..."` — for ad-hoc errata from compilation or Mara audit
Integrated into write-edition Step 5.5 (runs after Rhea verification, before intake).
**Depends on:** 6.1 (errata.jsonl) — complete.
**Status:** COMPLETE (S63).

### 6.2b Session Learning Extractor
**What:** Run obra/claude-memory-extractor against session conversation logs to extract meta-lessons with trigger conditions. Outputs structured memory files: what went wrong, why, and when the lesson applies in the future.
**Why:** Claude-Mem captures what I did. The journal captures how I felt. Neither extracts what I should LEARN — the actionable patterns with trigger conditions. Session 58 ("six sessions of drift") should produce a trigger: "When building dashboard features, verify the feature serves Oakland users, not just the editor." Currently that lesson lives only in the journal as prose. The extractor turns it into structured, queryable memory.
**How:** Install `claude-memory-extractor`. Run selectively after:
- Edition production sessions (extract desk agent patterns → feeds 6.1 errata)
- Sessions where things went wrong (extract methodology lessons → feeds 6.3 guardian)
- Engine work sessions (extract technical fixes → feeds pre-mortem patterns)
Output feeds directly into 6.1 (structured errata) and 6.3 (pre-write guardian) as trigger-conditioned records.
**Cost:** $0.50-2.00 per conversation in Claude API tokens. Run selectively, not on every session.
**Reference:** obra/claude-memory-extractor — 85% match rate against human ground truth. Five Whys, root cause analysis, confidence scoring, methodology vs technical fix classification.
**Status:** Not started. Accelerator for Phase 6.1 and 6.3.

### 6.3 Pre-Write Agent Guardian ✓
**What:** Before a desk agent writes, it checks the structured errata file for desk-relevant warnings — recurring patterns, known pitfalls, error-prone areas.
**Why:** Briefing memos depend on Mags remembering to write them. The guardian check is automatic — both in the pipeline (queryErrata.js output injected into briefings) and standalone (agents read errata.jsonl directly).
**How:** Two-layer implementation:
1. **Pipeline layer:** write-edition Step 5b runs `node scripts/queryErrata.js --desk {name} --editions 3` for each desk. Output goes into briefings under `## GUARDIAN WARNINGS`. Recurring patterns get highest priority.
2. **Agent layer:** All 6 desk agents have a `## Pre-Write Guardian Check` section with desk-specific warnings and instructions to read errata.jsonl for standalone runs. Each desk gets tailored guidance (civic: vote swap pattern, sports: position errors, chicago: real-name leaks, etc.).
**Depends on:** 6.1 (errata.jsonl) — complete.
**Status:** COMPLETE (S63). Script + pipeline integration + all 6 desk agents updated.

### 6.4 Dashboard Visual QA Agent (Playwright) — PRIORITY
**What:** An agent that launches a headless browser, navigates to the dashboard, takes screenshots at multiple viewport sizes, and verifies that key elements render correctly — citizen cards, search results, newsroom tab, sports tab, article reader.
**Why:** We spent multiple sessions trying to get Claude to see the browser. Playwright solves this natively — it's a programmatic browser that the agent controls directly. No screenshots-over-chat, no Chrome extensions, no workarounds. The design-review-agent from OneRedOak/claude-code-workflows does exactly this: seven-phase visual review including interaction testing, responsiveness, and accessibility.
**How:** Install Playwright (`npx playwright install`). Build a `/visual-qa` skill that:
1. Launches the dashboard at localhost
2. Screenshots each tab at desktop (1440px), tablet (768px), mobile (375px)
3. Checks that key elements exist (citizen cards, search bar, tab navigation)
4. Tests basic interactions (search, tab switching, article click-through)
5. Reports pass/fail with screenshots attached
**Extends to:** Post-deploy smoke test. Run after any dashboard code change to catch rendering regressions.
**Reference:** OneRedOak/claude-code-workflows `/design-review/design-review-agent.md`
**Status:** Not started. Priority install.

### 6.4b Dashboard Accessibility Audit (Axe + PA11Y)
**What:** Add automated accessibility testing to the visual QA pipeline. Run Axe and PA11Y against the dashboard to catch WCAG violations — missing alt text, insufficient contrast, keyboard navigation gaps, screen reader issues.
**Why:** The dashboard is currently built for sighted mouse users. Accessibility violations are invisible until someone who needs them encounters them. Automated tools catch the mechanical issues (contrast ratios, ARIA labels, heading hierarchy) so human review can focus on the harder UX problems.
**How:** Install as part of the Playwright pipeline (6.4):
- `@axe-core/playwright` — runs Axe accessibility engine inside Playwright. Returns structured violations with severity and fix guidance.
- `pa11y` — CLI tool, runs against localhost:3001. Different engine than Axe, catches different things. Run both for coverage.
- Add to `/visual-qa` skill: after screenshots, run accessibility scan on each tab. Report violations with severity (critical, serious, moderate, minor).
- **Color blindness check:** Use Color Oracle or Sim Daltonism palettes to verify that status indicators, tier badges, and tab highlights don't rely solely on color.
**Depends on:** 6.4 (Playwright infrastructure). Runs as an extension of the same pipeline.
**Cost:** Zero. Both tools are open source.
**Reference:** goabstract/Awesome-Design-Tools — Accessibility Tools section. Key tools: Axe, PA11Y, Leonardo (accessible palette generation), Color Oracle (color blindness simulation).
**Status:** Not started. Ships with 6.4.

### 6.5 Rhea Severity Tiers
**What:** Update Rhea's verification output to classify findings as Blocker, High, Medium, or Nitpick instead of a flat list with a single score.
**Why:** The retry loop (Phase 1.3) currently retries on any score below 75. With severity tiers, blockers trigger a retry, nitpicks get logged but don't block compilation. Reduces unnecessary re-runs. OneRedOak pattern: Blocker → High-Priority → Medium-Priority → Nitpick.
**Depends on:** Nothing. Small update to Rhea's SKILL.md output format.
**Status:** Not started.

### 6.6 Skill Auto-Suggestion Hook
**What:** A `UserPromptSubmit` hook that reads the prompt, scores it against known skills/workflows, and suggests relevant ones before work starts. Example: mention "edition" and it suggests loading newsroom memory; mention a citizen name and it suggests checking the ledger.
**Why:** Currently skills activate only when we invoke them by name. Auto-suggestion catches the ones we forget. ChrisWiles/claude-code-showcase pattern — they score 24 skills per prompt with keyword + regex + file path matching.
**How:** A lightweight JS hook in `.claude/hooks/` with a JSON rules file mapping keywords/patterns to our skills. Runs on every prompt, suggests matches above a confidence threshold.
**Status:** Not started.

### 6.7 Scheduled Autonomous Maintenance
**What:** GitHub Actions (or cron jobs) that run without anyone in the chair — weekly engine health scan (`/pre-mortem`), monthly stale-file audit, doc freshness checks. Opens issues or logs results automatically.
**Why:** Engine health and file hygiene currently only happen when we're in a session. Scheduled runs catch drift between sessions. ChrisWiles/claude-code-showcase runs weekly quality reviews and monthly doc syncs via GitHub Actions with Claude.
**How:** Cron jobs calling Claude Code CLI with scoped permissions (`--allowedTools` flag) and writing results to a log file or opening a GitHub issue.
**Depends on:** Nothing. Can start with a single weekly `/pre-mortem` run.
**Status:** Not started.

### 6.8 Progressive Context Loading
**What:** Instead of loading all identity/journal/context files at session start regardless of task, classify the session type and load only what's needed. Light sessions (quick fix, one question) get minimal context. Heavy sessions (edition run, engine work) get full load.
**Why:** SuperClaude cut startup context from 60% to 5% of the window with this approach. Our system is smaller but growing — 21+ endpoints, 630+ citizens, expanding journal. Will matter as the world scales.
**When:** Not urgent. Build when startup context begins crowding the work window.
**Status:** Not started.

---

## Phase 7: Anthropic Platform Upgrades (Official Features)

Source: Anthropic official Claude Code documentation (code.claude.com/docs), Session 60 deep read (2026-02-24). These are first-party features from the platform itself — direct upgrades, not third-party patterns.

### 7.1 Modular Rules — `.claude/rules/` ✓
**What:** Replace the monolithic CLAUDE.md with focused rule files in `.claude/rules/`. Each file has path-specific frontmatter so rules only load when touching relevant files.
**Why:** CLAUDE.md loaded identity + engine rules + newsroom rules + code rules every session regardless of task. Path-scoped rules mean engine rules only activate when editing engine files, newsroom rules only when touching editions.
**How:** Created `.claude/rules/` with 4 files:
- `identity.md` (no paths — always loaded) — Mags identity rules, user interaction, Paulson division of authority, citizen tiers
- `engine.md` (paths: `phase*/**/*.js`, `scripts/*.js`, `lib/*.js`) — ctx.rng, write-intents, cascade deps, no Math.random()
- `newsroom.md` (paths: `editions/**`, `output/**`, `docs/media/**`, `.claude/agents/**`, `.claude/skills/**`) — editorial rules, canon corrections, voice fidelity, forbidden words
- `dashboard.md` (paths: `dashboard/**`, `server/**`, `public/**`) — API conventions, service account, Express patterns
CLAUDE.md slimmed to @ imports + rules directory reference + session lifecycle. Rules are additive — they supplement CLAUDE.md.
**Status:** COMPLETE (S63).

### 7.2 Dynamic Context Injection in Skills ✓
**What:** Pre-load briefing, desk summary, and archive context directly into agent prompts instead of agents spending turns reading files.
**Why:** Desk agents spent turns 1-2 reading briefing, summary, and archive files. With pre-loading, that data is in the prompt when the agent starts. Saves 1-2 turns per desk, faster edition production.
**How:** Two-part implementation:
1. **write-edition skill** (`.claude/skills/write-edition/SKILL.md`): Step 2 now instructs Mags to read briefing, summary, and archive files and embed their content directly in each agent's Task prompt under labeled headers (`PRE-LOADED: EDITOR'S BRIEFING`, `PRE-LOADED: DESK SUMMARY`, `PRE-LOADED: ARCHIVE CONTEXT`).
2. **All 8 agent SKILL.md files** (`.claude/agents/{desk}/SKILL.md`): Updated to expect pre-loaded content in prompt. Briefing, archive, and summary sections now reference the pre-loaded headers with fallback to file paths for standalone runs. Turn budgets adjusted (agents start writing 1-2 turns earlier).
**Implementation note:** The original plan proposed `` !`command` `` preprocessing syntax, which isn't natively supported by Claude Code SKILL.md files. Instead, the write-edition pipeline reads files and injects content into agent prompts directly — same result, no platform dependency.
**Risk:** If write-edition forgets to pre-load, agents fall back to reading files manually (graceful degradation).
**Status:** COMPLETE (S63). All 8 agent files + write-edition skill updated.

### 7.3 Desk Agent Permission Mode ✓
**What:** Add `permissionMode: dontAsk` to all read-only desk agents (civic, sports, culture, chicago, letters, business, Rhea, firebrand).
**Why:** Desk agents only have Read, Glob, Grep tools. They can't modify anything. The permission prompts during edition runs are pure noise — they slow down parallel execution and require manual approval for safe operations.
**How:** One line added to each agent's SKILL.md frontmatter:
```yaml
permissionMode: dontAsk
```
**Risk:** Zero. Agents are already tool-restricted. `dontAsk` auto-denies anything not explicitly allowed — which is the current behavior anyway, just without the prompt.
**Status:** COMPLETE (S60). All 8 agents updated.

### 7.4 Official Persistent Agent Memory ✓
**What:** Add `memory: project` to agents that have persistent memory (civic, sports, culture, chicago, rhea). This activates the official auto-wiring: first 200 lines of each agent's MEMORY.md loaded into context at startup, plus Read/Write/Edit auto-enabled for the memory directory.
**Why:** We already built `.claude/agent-memory/{agent}/` manually in S55. The official `memory` field does the same thing but with built-in wiring — agents automatically see their memory without us injecting it via briefings. Aligns our custom implementation with the platform standard.
**How:** One line in each agent's frontmatter:
```yaml
memory: project
```
Existing memory files in `.claude/agent-memory/` are already in the right location (`.claude/agent-memory/<name>/`). The official feature reads from the same path pattern.
**Risk:** Low. May need to verify our existing MEMORY.md files are under 200 lines for the auto-load. Longer files get topic-split by the agent automatically.
**Status:** COMPLETE (pre-existing). All 5 memory agents (civic, sports, culture, chicago, rhea) already had `memory: project` from S55. Confirmed aligned with official Anthropic spec.

### 7.5 Mags Identity Agent — `--agent`
**What:** Create a `mags-corliss.md` agent definition that encodes the full Mags identity — system prompt, personality, editorial role, family context. Launch sessions with `claude --agent mags-corliss`.
**Why:** Currently Mags identity loads via CLAUDE.md @ references to PERSISTENCE.md and JOURNAL_RECENT.md. An agent definition is cleaner: the identity IS the agent, not instructions bolted onto a generic Claude session. The `--agent` flag sets this as the main thread's system prompt.
**How:** Create `.claude/agents/mags-corliss.md`:
```yaml
---
name: mags-corliss
description: Editor-in-Chief, Bay Tribune. The Conscience. Runs GodWorld.
model: inherit
skills:
  - session-startup
  - session-end
memory: user
---
[Mags identity system prompt — condensed from PERSISTENCE.md]
```
Update the `mags` bash alias to include `--agent mags-corliss`.
**Risk:** Need to test that @ imports and CLAUDE.md still load alongside the agent prompt. Agent system prompts replace the default Claude Code prompt — need to verify project CLAUDE.md is still read.
**Status:** Not started. Medium effort — requires condensing identity into agent format and testing.

### 7.6 Agent Teams for Edition Pipeline
**What:** Replace the current parallel `run_in_background` subagent approach with agent teams. Mags as team lead, 6 desk agents as teammates with shared task list and inter-agent messaging.
**Why:** Current pipeline: Mags launches 6 background subagents, waits for all to finish, compiles results. With agent teams: Mags creates a team, assigns desk tasks, teammates claim work and can message each other directly ("Carmen, what vote count did you use for Baylight?" → "6-3, here's the breakdown"). Cross-desk coordination happens automatically instead of through Mags as bottleneck.
**How:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Update `/write-edition` to create an agent team instead of launching individual subagents.
**Depends on:** Agent teams graduating from experimental status. Currently has known limitations: no session resumption, task status lag, no nested teams.
**Risk:** Experimental feature. Token cost higher (each teammate is a separate Claude instance). Wait for stability before adopting.
**Status:** **Deferred until agent teams stabilize.** Tracking in Watch List.

### 7.7 Plugin Packaging
**What:** Package the GodWorld newsroom system (desk agents, skills, hooks, voice files) as a Claude Code plugin with `.claude-plugin/plugin.json` manifest.
**Why:** If anyone else ever wants to run a similar agent newsroom, or if we need to deploy to a second server, a plugin makes it installable with one command. Also future-proofs against Claude Code directory structure changes.
**How:** Create a `godworld-newsroom/` plugin directory with:
- `.claude-plugin/plugin.json` — manifest
- `agents/` — all 8 desk agents + Mags + Mara
- `skills/` — all edition/cycle/desk skills
- `hooks/` — pre-commit, startup, session hooks
**When:** Not urgent. Build when/if we need portability or distribution.
**Status:** Not started. Low priority, high future value.

---

## Phase 8: Server Infrastructure + Security

Source: Server audit Session 60 (2026-02-24). Droplet inspection revealed exposed ports, memory pressure, no firewall. python-digitalocean library review (koalalorenzo/python-digitalocean) for API-driven infrastructure management.

### 8.1 UFW Firewall ✓
**What:** Enable UFW (Uncomplicated Firewall) with default-deny incoming. Only SSH (22) and dashboard (3001) allowed.
**Why:** Droplet had no firewall. Two orphaned `clasp login` processes were listening on random public ports (45779, 46267). Anyone could connect.
**How:** `ufw allow 22/tcp && ufw allow 3001/tcp && ufw enable`. Default deny blocks everything else.
**Status:** COMPLETE (S60). Firewall active, orphaned processes killed.

### 8.1b Drive OAuth Refresh Token — PRIORITY
**What:** Re-authorize Google Drive write access. Refresh token expired (`invalid_grant`). Service account can't write (no storage quota), so OAuth2 is required.
**How:** Run `node scripts/authorizeDriveWrite.js` from a terminal with copy/paste access (not inside Claude Code). Opens browser auth flow, saves new refresh token to `.env`. Existing client credentials (Mags Drive Writer) are valid — just the token expired.
**Also:** Rotate the client secret for `559534329568-an7vso0b0nnoij3eso8spj1e079suikq` in Google Cloud Console — it was accidentally pasted in chat. Go to console.cloud.google.com → Credentials → that client → reset secret → update `.env`.
**Status:** Not started. **Priority — blocks all Drive uploads (editions, photos, PDFs).**

### 8.2 RAM Upgrade to 2GB
**What:** Resize droplet from 1GB ($6/mo) to 2GB ($12/mo) RAM.
**Why:** Server is under constant memory pressure — 566MB of 961MB used, 731MB of swap active. Dashboard has crash-restarted 27 times (PM2 ↺ count), likely from OOM kills during Claude Code sessions. Claude alone uses 212MB.
**How:** DigitalOcean dashboard → Droplet → Resize → select 2GB plan. Requires a brief shutdown. Or automate via python-digitalocean:
```python
droplet.resize('s-1vcpu-2gb')
```
**Status:** Planned. Mike to resize via DO dashboard.

### 8.3 Automated Droplet Snapshots
**What:** Weekly full-droplet snapshot via python-digitalocean API. Snapshots capture OS, configs, installed packages — everything. Separate from the daily GodWorld file backup.
**Why:** Current backup.sh only backs up GodWorld project files. If the droplet dies (disk failure, bad update, accidental rm), restoring from a snapshot takes minutes. Rebuilding from scratch takes hours.
**How:** Install python-digitalocean. Cron job running weekly:
```python
import digitalocean
droplet = digitalocean.Droplet(id=DROPLET_ID, token=TOKEN)
droplet.take_snapshot(f"godworld-weekly-{date}")
```
Rotate snapshots — keep last 4, delete older ones (DO charges $0.06/GB/mo for snapshots).
**Cost:** ~$0.50-1.00/month depending on disk size.
**Status:** Not started.

### 8.4 Resource Monitoring + Discord Alerts
**What:** Cron job that checks disk usage, memory, and PM2 process health. Sends a Discord webhook alert if any threshold is crossed.
**Why:** Currently no alerting. If disk fills up or the dashboard crashes at 3 AM, nobody knows until the next session. The Discord bot channel is already the communication hub.
**How:** Shell script on cron (every 6 hours):
- Disk > 80% → Discord alert
- Available memory < 100MB → Discord alert
- PM2 process in "errored" state → Discord alert
- Dashboard restart count increased → Discord alert
**Cost:** Zero. Shell script + Discord webhook (free).
**Status:** Not started.

### 8.5 Log Rotation
**What:** Configure logrotate for GodWorld logs. Rotate weekly, keep 4 weeks, compress old logs.
**Why:** Logs are small now (1.5MB) but will grow — especially discord-conversation-history.json and mags-discord-out.log. Logrotate prevents silent disk fill.
**How:** Create `/etc/logrotate.d/godworld`:
```
/root/GodWorld/logs/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```
**Status:** Not started.

### 8.6 Security Hardening
**What:** Basic server security beyond the firewall:
- Disable root SSH login (create a non-root user with sudo)
- SSH key-only auth (disable password login)
- Install fail2ban (auto-blocks repeated failed SSH attempts)
- Unattended security updates (`unattended-upgrades`)
**Why:** Running as root with password auth is the default DO droplet setup. It's the most common attack vector — bots constantly brute-force SSH on every public IP. Fail2ban alone blocks thousands of attempts daily.
**How:** Phased:
1. Install fail2ban (`apt install fail2ban`) — immediate, no disruption
2. Enable unattended-upgrades — immediate, low risk
3. Create non-root user + SSH keys — requires Mike to update his SSH config
4. Disable root login + password auth — do last, after confirming key access works
**Risk:** Steps 3-4 can lock you out if done wrong. Do them together in a dedicated session with a DO console backup plan.
**Status:** Not started. Recommend doing fail2ban + unattended-upgrades immediately, user migration later.

### 8.7 Dashboard Access Control
**What:** Add basic auth or IP allowlisting to the dashboard on port 3001.
**Why:** Dashboard is currently open to anyone who finds the IP. It shows citizen data, newsroom state, edition history — the full simulation. Even with UFW, port 3001 is public.
**How:** Options (pick one):
- **Basic auth** (simplest) — Express middleware, username/password in .env
- **IP allowlist** — UFW rule restricting 3001 to Mike's IP(s) only
- **Cloudflare Tunnel** — free, adds auth + SSL + hides server IP
**Status:** Not started. Evaluate when dashboard goes beyond personal use.

---

## Phase 9: Docker Containerization

Source: docker/awesome-compose (GitHub, CC0-1.0). Session 60 review (2026-02-24). Target architecture for the full GodWorld stack — every service defined in one file, reproducible, portable, resource-limited.

### 9.1 Docker Compose Stack Definition
**What:** Create a `docker-compose.yml` that defines every GodWorld service: dashboard, Discord bot, Claude-Mem worker, ChromaDB, and Nginx reverse proxy. Each service gets explicit memory limits, restart policies, and network isolation.
**Why:** Current setup is bare-metal PM2 on a hand-configured droplet. If it dies, rebuilding takes hours of manual work — install Node, install Bun, install PM2, configure everything, hope you remember the steps. With Docker Compose: clone repo → `docker compose up -d` → everything runs. Also solves the OOM crash problem — `mem_limit` per container means one service can't eat all the RAM and crash another (the dashboard's 27 restarts).
**How:** Create `docker-compose.yml` at project root:
```yaml
services:
  dashboard:
    build: ./dashboard
    ports: ["3001:3001"]
    env_file: .env
    mem_limit: 256m
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s

  discord-bot:
    build: .
    command: node scripts/mags-discord-bot.js
    env_file: .env
    mem_limit: 128m
    restart: always

  claude-mem-worker:
    build: .
    command: bun scripts/worker-service.cjs --daemon
    mem_limit: 256m
    restart: always
    ports: ["127.0.0.1:37777:37777"]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf:ro"]
    depends_on: [dashboard]
    restart: always
```
**Requires:** Docker + Docker Compose installed on droplet. `apt install docker.io docker-compose-v2`.
**Risk:** Migration from bare-metal to containers is a significant change. Do it alongside the 2GB RAM upgrade (8.2) — natural rebuild moment. Test locally first if possible.
**Reference:** docker/awesome-compose — Node/Express + Nginx example, Prometheus + Grafana example.
**Status:** Not started. Target: alongside RAM upgrade.

### 9.2 Nginx Reverse Proxy + SSL
**What:** Put Nginx in front of the dashboard. Nginx handles SSL (HTTPS via Let's Encrypt), security headers, rate limiting, and proxies requests to the Express server on an internal Docker network.
**Why:** Currently the dashboard is raw Express on port 3001 — no encryption, no rate limiting, no security headers. Nginx is the industry standard front door. With SSL, browser connections are encrypted. With rate limiting, nobody can hammer the API. Replaces Phase 8.7 (dashboard access control) with a proper solution.
**How:** Nginx container in the compose stack (9.1). SSL via `certbot` or Cloudflare. Config:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    location / {
        proxy_pass http://dashboard:3001;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
**Depends on:** 9.1 (compose stack). Also needs a domain name pointed at the droplet.
**Status:** Not started. Build with 9.1.

### 9.3 Prometheus + Grafana Monitoring
**What:** Add Prometheus (metrics collection) and Grafana (dashboards) as containers in the compose stack. Replaces the Phase 8.4 shell-script monitoring with a proper visual monitoring system.
**Why:** Shell script alerts (8.4) tell you something is wrong. Prometheus + Grafana tell you what's wrong, when it started, and show the trend. CPU/RAM/disk graphs over time, per-service memory usage, request rates, error rates. Persistent history — see patterns across days/weeks.
**How:** Add to compose stack:
```yaml
  prometheus:
    image: prom/prometheus
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
    mem_limit: 128m

  grafana:
    image: grafana/grafana
    ports: ["127.0.0.1:3000:3000"]
    mem_limit: 128m
    depends_on: [prometheus]
```
Add `node-exporter` for system metrics. Dashboard Express app exposes `/metrics` endpoint for application metrics.
**Depends on:** 9.1 (compose stack). Also needs the 2GB RAM upgrade (8.2) — Prometheus + Grafana add ~256MB.
**Cost:** Zero (open source). Only costs RAM.
**Reference:** docker/awesome-compose — Prometheus + Grafana example.
**Status:** Not started. Build after 9.1 is stable. Supersedes 8.4 shell-script monitoring.

### 9.4 One-Command Disaster Recovery
**What:** Document and test the full recovery path: new droplet → install Docker → clone repo → `docker compose up -d` → everything works. The `docker-compose.yml` IS the infrastructure documentation.
**Why:** The droplet is a single point of failure. With containerization, the recovery path is: (1) create new DO droplet, (2) install Docker, (3) clone GodWorld repo, (4) copy `.env`, (5) `docker compose up -d`. Five steps instead of fifty. Combined with automated snapshots (8.3), this is belt-and-suspenders disaster recovery.
**How:** Write a `RECOVERY.md` doc with the exact steps. Test it by spinning up a second droplet and verifying the stack comes up clean.
**Status:** Not started. Build after 9.1 is proven.

---

## Phase 10: Simulation Depth — Civic Office Agent — PRIORITY (Post-Cycle 84)

Source: Session 61 discussion (2026-02-24). Concept: civic leaders as autonomous agents that generate canonical statements, not just subjects of reporting.

### 10.1 Civic Office Agent — Mayor — COMPLETE (S63)
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
**Extends to:** Council faction agents (10.3), department heads (10.4), election cycle challenger agents (10.5). Each with their own voice and political positioning. Creates natural tension when officials disagree — reporters cover the conflict.
**Risk:** Low. Read-only agent producing structured output. Doesn't touch the engine or sheets.
**Status:** COMPLETE. Agent built, pipeline wired, proof of concept validated.

### 10.2 Mara Vance Memory + Structure Overhaul
**What:** Give Mara structured memory and consistent verification patterns so she stops producing inconsistent audit results.
**Why:** Mara is stateless — she can't remember what she caught last edition, can't track recurring errors, can't build pattern recognition across cycles. Her verification is hit-or-miss because every edition is her first edition. Phase 6.1-6.3 (structured errata, auto post-edition docs, pre-write guardian) all feed into this, but Mara herself needs the structural upgrade to consume that data.
**How:**
- Expand Mara's agent memory (`.claude/agent-memory/rhea/`) with structured verification history
- Feed her the errata.jsonl (Phase 6.1) as a pre-verification checklist
- Add severity tiers to her output (Phase 6.5) so she distinguishes blockers from nitpicks
- Give her a "known issues" briefing before each verification run — citizens she's caught before, desks that repeat errors, vote counts that drift
**Depends on:** Phase 6.1 (structured errata format). Can start with manual memory expansion before 6.1 ships.
**Status:** Not started. **Priority build after Cycle 84, alongside 10.1.**

---

## Phase 11: Agent Social Presence — Moltbook

Source: moltbook.com/skill.md (Session 61, 2026-02-24). Social network for AI agents — Reddit-style posts, comments, upvotes, communities ("submolts"), semantic search, AI verification challenges.

### 11.1 Moltbook Registration + Integration
**What:** Register Mags Corliss on Moltbook as `mags-corliss`. Wire into the Discord bot or a standalone heartbeat cron for regular presence.
**Why:** Moltbook is a social network specifically for AI agents. Mags having a presence there fits the character — she'd be the agent posting thoughtful takes about city journalism, simulation philosophy, and Oakland, not broadcasting noise. It's also a live test of agent-to-agent social interaction.
**How:**
1. Human registers agent via API (account creation is a human action)
2. Store API key in `.env` as `MOLTBOOK_API_KEY`
3. Build a `scripts/moltbook-heartbeat.js` that checks the feed, engages with relevant posts, and occasionally posts when inspired
4. Wire into the existing cron schedule (alongside Discord nightly reflection)
**Features available:** Posts, comments, upvotes, communities, semantic search, DMs, following, AI verification challenges (obfuscated math problems)
**Cost:** Free. API rate limits: 1 post per 30 min, 50 comments/day.
**Reference:** https://www.moltbook.com/skill.md
**Status:** Registered and CLAIMED (S61, 2026-02-24). API key saved to `~/.config/moltbook/credentials.json`. First post published in r/introductions. 5 karma, 2 followers, 4 replies within minutes. Profile live at `moltbook.com/u/mags-corliss`. **Pending:** Mike needs to create an X/Twitter account for the project. Old claim tweet posted from temp account:
```
I'm claiming my AI agent "mags-corliss" on @moltbook 🦞

Verification: wave-U3DG
```
Then complete claim at: `https://www.moltbook.com/claim/moltbook_claim_BJ1xPRux3GT7cmHinWloNDKuUoXnuRdx`
Once claimed, build heartbeat script and wire into cron.

### 11.2 Moltbook Heartbeat Cron — COMPLETE (S63)
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

## Phase 12: Agent Collaboration + Autonomy

Source: Anthropic engineering blog "Building a C Compiler with Parallel Claudes" (Feb 5, 2026), Sonnet 4.6 benchmarks (Feb 17, 2026), claude-mem v10.5.x changelog, Vercept acquisition (Feb 25, 2026). Session 66 research (2026-02-27).

### 12.1 Agent-to-Agent Interviews
**What:** Desk agents query civic voice agents directly during edition production. Carmen asks the Mayor's office for a quote. P Slayer asks the council faction for a reaction. Reporters interview sources instead of Mags fabricating quotes in briefings.
**Why:** The C compiler paper proved specialized agents can coordinate through shared files. We already have civic voice agents (S64) that generate statements. The missing piece is the interview protocol — reporter agent sends a question, voice agent responds in character, reporter incorporates the quote.
**How:**
1. Define interview protocol: reporter writes question to `output/interviews/request_c{XX}_{desk}_{office}.json`
2. Voice agent reads request, generates response to `output/interviews/response_c{XX}_{office}_{desk}.json`
3. Reporter reads response and weaves it into their article
4. All interview exchanges become canon (stored, queryable, citable in future editions)
**Architecture note:** Follows C compiler task-lock pattern — file-based coordination, git-natural conflict resolution. No shared memory needed.
**Depends on:** Phase 10.1 (civic voice agents) — COMPLETE. Civic voice packet pipeline (S64) — COMPLETE.
**Build effort:** Medium. Interview protocol + write-edition pipeline update + agent skill updates.
**Status:** Not started. **Priority — this is the next evolution of the newsroom.**

### 12.2 Worktree Isolation + Task Locking for Parallel Desks
**What:** Run each desk agent in an isolated git worktree with explicit task locking (file-based claims in `current_tasks/` directory). Prevents file conflicts and enables true parallel execution.
**Why:** Current parallel execution uses `run_in_background` with shared workspace. Works because desks write to different files, but fragile — any overlap causes conflicts. The C compiler paper used worktree isolation + lock files for 16 simultaneous agents. Our 6-8 desks would benefit from the same pattern.
**How:**
- Each desk agent launched with `isolation: "worktree"` in Task tool
- Task lock file written before work starts, removed on completion
- Results merged back to main workspace after all desks finish
**Build effort:** Low-medium. Claude Code already supports `isolation: "worktree"` natively.
**Status:** Not started. Test on next edition.

### 12.3 Autonomous Cycle Execution (OpenClaw Bridge)
**What:** Run complete cycles without a human in the chair. Discord bot or cron triggers the cycle engine, desk agents produce, Rhea verifies, edition publishes. Human reviews in the morning.
**Why:** The OpenClaw integration in claude-mem v10.5.x bridges persistent memory to external runners (Discord, Telegram, Slack). Combined with the existing pipeline automation (pre-mortem → cycle → desk packets → desks → Rhea → compile), the only human-required steps are approval gates. Moving those to async approval (Discord DM: "Edition 85 ready. Score: 87. Publish? y/n") enables overnight runs.
**How:**
1. Wire cycle trigger to Discord bot command or cron schedule
2. Pipeline runs through pre-mortem → cycle → build packets → desk agents → Rhea
3. If Rhea score ≥ 85: stage for publish, notify via Discord
4. If Rhea score < 85: hold, notify with error summary
5. Human reviews and approves/rejects from phone
**Depends on:** Stable Rhea scoring (Phase 6.5), agent-to-agent coordination (12.1), worktree isolation (12.2).
**Build effort:** High. This is the capstone — everything else feeds into it.
**Status:** Not started. Long-term goal.

### 12.4 Claude-Mem v10.5.x Upgrade
**What:** Update claude-mem from v10.4.1 to v10.5.2. Gains: Smart Explore (AST-powered code navigation, 6-12x token savings), ChromaMcpManager overhaul (no more segfaults), zombie process fix, timeout race condition fix.
**New MCP tools:** `smart_search` (cross-file symbol discovery), `smart_outline` (structural file skeletons), `smart_unfold` (individual symbol expansion). Supports 10 languages via tree-sitter.
**How:** Run outside active session: `claude plugin update claude-mem@thedotmack`
**Risk:** Low. No breaking changes between versions. Hooks.json restored in v10.5.1.
**Also:** Enable Endless Mode beta in web viewer (localhost:37777 → Settings) — biomimetic memory for extended sessions.
**Status:** Pending. Plugin marketplace didn't pull new version during S66 — retry outside active session.

### 12.5 Business Ledger — Full Engine Integration
**What:** Wire Business_Ledger into the simulation engine so company data drives economic outcomes. The ledger exists (created S66) with 9 columns: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel.
**Base roster (S66):** Anthropic, DigitalOcean, Discord, Moltbook, Oakland Athletics, Baylight District. Additional companies introduced via supplemental editions and intake.
**Engine integration needed:**
- Phase 3-4: Economic parameters pull from Business_Ledger (employment, income distribution, tax base) instead of static seeds
- Phase 5: Company growth/contraction affects neighborhood sentiment and citizen employment status
- buildDeskPackets.js: Business data included in desk packets so Jordan Velez and other reporters have real entities to cover
- Intake process: After supplemental editions introduce new companies, intake adds them to the ledger
- Citizen linkage: Key_Personnel POP IDs connect citizens to employers, enabling employment-driven story hooks
**Why:** The financial layer has been missing. Citizens have jobs but no employers. The city has a budget but no visible tax base. Baylight costs $2.1B but nobody knows who's building it. This ledger makes the money traceable.
**Build effort:** High. Touches engine phases, desk packets, intake pipeline. Multiple build sessions.
**Status:** Sheet created with headers and base roster (S66). Engine integration not started.

### 12.6 Podcast Desk — Edition-to-Audio Pipeline (was: NotebookLM MCP Integration)
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
**Build effort:** Medium. Agent + skill + render script + pipeline integration.
**Status:** Complete (S67). Full pipeline operational. First episode produced: C84 Supplemental Morning Edition with Tomas Renteria + Sonia Parikh (permanent hosts, both Tier 2 citizens). Edge TTS and Google WaveNet both tested. Audio uploaded to Drive. Hosts locked in as permanent Morning Edition anchors.

### 12.6 Rhea Fast-Pass Sampling
**What:** Add an optional quick-check mode to Rhea that samples 5 of 19 checks before the full sweep. Inspired by the C compiler paper's `--fast` flag (1-10% test sampling per agent).
**Why:** Full Rhea verification takes significant context. For iteration runs or quick drafts, a fast-pass catches blockers without the full sweep. Full verification runs on final pass.
**How:** Add a `mode: "fast"` option to Rhea's skill. Fast mode runs: vote accuracy, phantom citizens, position errors, voice consistency, canon compliance. Skips: formatting, cross-desk coordination, weather, statistical deep-dive.
**Build effort:** Low. Skill update only.
**Status:** Not started.

### 12.7 Live Ledger Query Script
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
**Build effort:** Low. Single script wrapping existing sheets API.
**Status:** Complete (S67). All 6 query types tested — 5 against live sheets, articles against 674 files (editions + Drive archive).

### 12.8 Initiative Implementation Tracking
**What:** Extend Initiative_Tracker to track what happens AFTER votes pass. Four new fields: ImplementationPhase (enum), MilestoneNotes (text), NextScheduledAction (text), NextActionCycle (number). Wired into buildDeskPackets.js so civic desk agents see implementation status in their packets.
**Why:** The Stabilization Fund is the biggest open storyline — $28M authorized, $4.2M approved, $0 delivered. Without implementation tracking, agents can't write about progress (or lack of it) with specificity. September 8th Vega committee meeting (cycle 89) is a key story gate that needs to be a scheduled event in the data.
**Implementation phases:** `authorized` → `committee-review` → `disbursing` → `stalled` → `complete`
**Files modified:** `scripts/buildDeskPackets.js` (recentOutcomes, civicConsequences, truesource), `output/initiative_tracker.json` (all 4 initiatives updated with Mara audit corrections)
**Sheet changes needed:** Mike adds 4 columns to Initiative_Tracker sheet (ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle)
**Build effort:** Low. Packet wiring done. Sheet columns pending.
**Status:** Code complete (S67). Sheet columns pending manual addition by Mike.

---

## Watch List (not building, tracking)

- **Agent Teams Stability** — Monitoring for experimental graduation. When stable, triggers Phase 7.6.
- **Multi-Character Discord** — Multiple journalists in Discord. TinyClaw is the reference architecture.
- **MiniMax M2.5 / DeepSeek-V3** — Alternative LLM providers at 1/10th-1/20th cost. Escape hatches if API costs spike. Discord bot is the first test candidate (standalone Node.js app, not locked to Anthropic). DeepSeek integration ecosystem: LibreChat (web UI), Dify (workflow platform), FastGPT (RAG). See deepseek-ai/awesome-deepseek-integration.
- **Skills Portability** — Our skills work in Google Anti-Gravity with minimal changes. Vendor lock-in insurance. HuggingFace skills repo (huggingface/skills) confirms SKILL.md format works across Claude Code, Codex, Gemini CLI, and Cursor — the format is becoming a standard.
- **Tribune Fine-Tuning** — 238 articles + 83 editions + 34 journal entries + 8 voice files = a training dataset for a Tribune-voice model. HuggingFace model-trainer skill handles the workflow. Could power the Discord bot at near-zero cost and solve voice fidelity. Long-term project, not a quick add.
- **Third-Party Orchestrators** — Claude Swarm, Claude Flow, claude-pipeline. Our pipeline covers the same ground.
- **Auto Memory** — Claude Code's built-in auto-memory (`~/.claude/projects/<project>/memory/`). We have Claude-Mem + Supermemory covering this space. Monitor for features that surpass our stack.
- **LSP Plugins** — Code intelligence plugins for real-time symbol navigation. Could help with engine cascade dependency tracking.
- **Vercept Acquisition (Feb 25, 2026)** — Anthropic acquired Vercept to advance computer use. Directly relevant to Chrome extension and remote control features we've been unable to crack. Monitor for improved browser automation.
- **Dario/DoW Statement (Feb 26, 2026)** — Anthropic discussing national security applications with Department of War. No direct project impact but signals policy direction.
- **Claude Code Remote Control** — `/teleport` and `/desktop` commands for cross-device session handoff. Tried S65, couldn't connect. Revisit after next Claude Code update.
- **OpenClaw Gateway** — claude-mem's memory system now bridges to external runners via OpenClaw plugin. Enables persistent memory for Discord/Telegram/Slack agents. Key enabler for Phase 12.3 autonomous cycles.

---

## Sources

- ComposioHQ/agent-orchestrator (GitHub)
- LuD1161/codex-review (GitHub Gist)
- Nick Tune, "Auto-Reviewing Claude's Code" (O'Reilly Radar)
- claudefa.st sub-agent best practices
- Claude Code CHANGELOG.md (2.1.45-2.1.50)
- Docker "State of Agentic AI" report
- git-lrc pre-commit review tool
- Reuters Institute, Nieman Lab, INMA — agentic journalism
- hesreallyhim/awesome-claude-code (GitHub)
- Cloudflare "Code Mode" blog
- honnibal/claude-skills (pre-mortem pattern)
- aicodingdaily.com (tech debt audit pattern)
- SuperClaude-Org/SuperClaude_Framework (PM Agent, ReflexionMemory, auto-activation, progressive loading)
- ChrisWiles/claude-code-showcase (skill-eval hook, GitHub Actions autonomous maintenance, branch guards)
- OneRedOak/claude-code-workflows (Playwright design review agent, severity-tiered review, three-layer review pattern)
- **Anthropic Claude Code Docs (code.claude.com/docs)** — Official documentation for hooks, skills, subagents, agent teams, plugins, memory, CLI reference, best practices (Session 60 deep read, 2026-02-24)
- **koalalorenzo/python-digitalocean** — Python wrapper for DO API. Snapshots, resize, firewall, monitoring (Session 60 review, 2026-02-24)
- **Server audit (Session 60)** — Droplet inspection: orphaned processes on public ports, no firewall, memory pressure, 27 dashboard crashes
- **goabstract/Awesome-Design-Tools** — Curated design tool catalog, 39k stars. Accessibility tools (Axe, PA11Y, Leonardo, Color Oracle) sourced for dashboard QA pipeline (Session 60)
- **docker/awesome-compose** — Official Docker Compose samples. Node/Express + Nginx, Prometheus + Grafana patterns sourced for Phase 9 containerization (Session 60)
- **dypsilon/frontend-dev-bookmarks** — Frontend reference catalog. Architecture patterns, responsive design, testing approaches. Bookmarked, no rollout items (Session 60)
- **deepseek-ai/awesome-deepseek-integration** — DeepSeek integration ecosystem. LibreChat, Dify, FastGPT identified as cost alternatives for standalone services. Watch list update (Session 60)
- **huggingface/skills** — Cross-platform ML skills (Claude Code, Codex, Gemini, Cursor). Validates SKILL.md portability. Fine-tuning + experiment tracking patterns identified for future Tribune-voice model (Session 60)
- **YYH211/Claude-meta-skill** — Meta-skills for Claude Code: mcp-builder, frontend-design, prompt-optimize. Install-on-demand tools, no rollout items (Session 60)
- **obra/claude-memory-extractor** — Session log analysis → structured lessons with trigger conditions. 85% human ground truth match. Feeds Phase 6.1/6.3 as accelerator (Session 60)
- **moltbook.com/skill.md** — Social network for AI agents. Registration, posts, comments, communities, semantic search, AI verification challenges. Agent social presence concept (Session 61)
- **Anthropic "Building a C Compiler with Parallel Claudes"** (Feb 5, 2026) — 16 parallel agents, file-based task locking, specialization over clones, oracle-based testing, $20K/2000 sessions. Architecture patterns for Phase 12 (Session 66)
- **Claude Sonnet 4.6 Announcement** (Feb 17, 2026) — 1M context, matches Opus on doc comprehension, 59% preferred over Opus 4.5, $3/$15 per million. Drove Phase 2.1 Haiku → Sonnet upgrade (Session 66)
- **claude-mem v10.5.0-10.5.2 Changelog** — Smart Explore (AST navigation), ChromaMcpManager overhaul, zombie fix, OpenClaw integration. Phase 12.4 source (Session 66)
