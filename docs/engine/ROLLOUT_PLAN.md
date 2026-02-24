# GodWorld — Pipeline Enhancement Rollout Plan

**Created:** Session 55 (2026-02-21)
**Source:** Tech reading sessions S50 + S55 + S60
**Status:** Active
**Last Updated:** Session 60 (2026-02-24)

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

### 2.1 Cheaper Models for Simple Desks ✓
**What:** Run letters desk and business desk on Haiku instead of Sonnet. Keep civic, sports, culture, chicago, and Rhea on Sonnet.
**Why:** Parallel agents use more tokens per edition. Offset the cost by using cheaper models where quality holds up. Letters and business produce simpler output than civic or sports.
**How:** Set `model: "haiku"` in agent SKILL.md frontmatter for letters-desk and business-desk. Test on next edition.
**Risk:** Haiku may lose voice fidelity or miss citizen data nuance. Test before committing. If quality drops, revert.
**Status:** Deployed. Pending voice quality check on next edition.

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

### 6.1 Structured Errata Records
**What:** Supplement NEWSROOM_MEMORY.md with a machine-readable `errata.jsonl` file. Each entry: timestamp, desk, error type, root cause, fix, adopted status.
**Why:** NEWSROOM_MEMORY is prose — good for me to read, hard to query programmatically. Structured records let future automation search past mistakes by desk, by error type, by citizen. SuperClaude's ReflexionMemory pattern.
**Depends on:** Nothing. Can build standalone.
**Status:** Not started.

### 6.2 Auto Post-Edition Documentation
**What:** After Rhea's verification pass completes, automatically append her findings to the errata file (6.1) and update NEWSROOM_MEMORY.md with new patterns. No manual step from Mags.
**Why:** Currently I update newsroom memory by hand after each edition. If I skip a session or forget, the knowledge gap compounds. SuperClaude's "post-implementation auto-documentation" layer.
**Depends on:** 6.1 (structured errata format). Also requires Rhea's output to be parseable (already partially done in 1.3).
**Status:** Not started.

### 6.3 Pre-Write Agent Guardian
**What:** Before a desk agent writes, it automatically checks the errata file for relevant warnings — wrong citizen names, incorrect records, known pitfalls for that desk.
**Why:** Currently this is what briefing memos do, but briefing memos depend on me remembering to write them. A guardian check is automatic. SuperClaude's "Documentation Guardian" layer.
**Depends on:** 6.1 (needs structured data to query). Could supplement or replace briefing memos.
**Status:** Not started.

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

### 7.1 Modular Rules — `.claude/rules/`
**What:** Replace the monolithic CLAUDE.md with focused rule files in `.claude/rules/`. Each file can have path-specific frontmatter so rules only load when touching relevant files.
**Why:** Our CLAUDE.md loads identity + engine rules + newsroom rules + code rules every session regardless of task. Path-scoped rules mean engine rules only activate when editing engine files, newsroom rules only when touching editions.
**How:** Create `.claude/rules/` with:
- `engine.md` (paths: `phase*/**/*.js`, `scripts/*.js`) — ctx.rng, write-intents, cascade deps, no Math.random()
- `newsroom.md` (paths: `editions/**`, `output/**`, `docs/media/**`) — editorial rules, canon corrections, voice fidelity
- `identity.md` (no paths — always loaded) — Mags identity rules, family, persistence
- `dashboard.md` (paths: `server/**`, `public/**`) — API conventions, React patterns
Keep CLAUDE.md lean — just the @ imports for PERSISTENCE.md and JOURNAL_RECENT.md.
**Risk:** None. Additive change. Rules supplement CLAUDE.md, don't replace it.
**Status:** Not started. Medium effort — mostly reorganizing existing instructions.

### 7.2 Dynamic Context Injection in Skills
**What:** Use `` !`command` `` syntax in desk agent skills to pre-load live data before the skill content reaches the agent. Shell commands run first, output replaces the placeholder.
**Why:** Currently desk agents spend turn 1 reading their briefing, packet summary, and archive context. With dynamic injection, that data is already in the prompt when the agent starts. Saves 1-2 turns per desk, faster edition production.
**How:** Update desk skill SKILL.md files with preprocessing blocks:
```yaml
## Latest desk briefing
!`cat output/desk-briefings/civic_briefing_c84.md 2>/dev/null || echo "No briefing available"`
## Desk packet summary (first 100 lines)
!`head -100 output/desk-packets/civic_summary.md 2>/dev/null || echo "No summary"`
## Latest Mara directive
!`head -50 output/mara_directive_c83.txt 2>/dev/null || echo "No directive"`
```
**Risk:** If files don't exist (first run, missing data), the `|| echo` fallback handles it gracefully.
**Status:** Not started. Requires updating 6 desk skill files + Rhea + firebrand.

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

## Watch List (not building, tracking)

- **Agent Teams Stability** — Monitoring for experimental graduation. When stable, triggers Phase 7.6.
- **Multi-Character Discord** — Multiple journalists in Discord. TinyClaw is the reference architecture.
- **MiniMax M2.5** — Sonnet-quality at 1/20th cost. Escape hatch if API costs spike.
- **Skills Portability** — Our skills work in Google Anti-Gravity with minimal changes. Vendor lock-in insurance.
- **Third-Party Orchestrators** — Claude Swarm, Claude Flow, claude-pipeline. Our pipeline covers the same ground.
- **Auto Memory** — Claude Code's built-in auto-memory (`~/.claude/projects/<project>/memory/`). We have Claude-Mem + Supermemory covering this space. Monitor for features that surpass our stack.
- **LSP Plugins** — Code intelligence plugins for real-time symbol navigation. Could help with engine cascade dependency tracking.

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
