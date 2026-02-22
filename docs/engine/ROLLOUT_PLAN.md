# GodWorld — Pipeline Enhancement Rollout Plan

**Created:** Session 55 (2026-02-21)
**Source:** Tech reading sessions S50 + S55
**Status:** Draft — awaiting approval

---

## Phase 1: Edition Pipeline Speed + Safety

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

## Phase 2: Cost + Scale

### 2.1 Cheaper Models for Simple Desks
**What:** Run letters desk and business desk on Haiku instead of Sonnet. Keep civic, sports, culture, chicago, and Rhea on Sonnet.
**Why:** Parallel agents use more tokens per edition. Offset the cost by using cheaper models where quality holds up. Letters and business produce simpler output than civic or sports.
**How:** Set `model: "haiku"` in the Task tool call for letters-desk and business-desk. Run one test edition comparing Haiku output to Sonnet output for those desks.
**Risk:** Haiku may lose voice fidelity or miss citizen data nuance. Test before committing. If quality drops, revert.
**Also available:** `CLAUDE_CODE_SUBAGENT_MODEL` environment variable for global subagent model control.

### 2.2 Desk Packet Query Interface
**What:** Instead of dumping the full citizen database JSON into each agent's context, give agents a way to search for only the citizens and hooks they need.
**Why:** Citizen population is growing (630+). Desk packets will eventually exceed agent context limits. Two agents already choked on 500KB packets in Edition 81.
**How:** Build a local script or MCP server that exposes:
- `searchPacket(query)` — find citizens or hooks by keyword
- `getCitizen(popId)` — pull one citizen's full record
- `getHooks(desk)` — pull story hooks for a specific desk
Agents call these functions instead of reading a flat JSON file.
**When:** Build before packets exceed ~50K tokens. Not urgent yet but will become a bottleneck.

---

## Phase 3: Engine Health

### 3.1 `/pre-mortem` Skill
**What:** Scan all engine phases before running a cycle. Predict where silent failures will happen.
**Why:** Session 47 found 4 silent failures that had been running undetected. This catches them before they cascade.
**What it checks:**
- Phase 5 sub-engines reading ctx fields that another engine hasn't written yet
- Write-intents targeting sheet columns that don't exist
- Neighborhood references that don't match the 17 canonical districts
- Cascade dependencies where one engine's output feeds another without validation
- Sheet header drift (columns in code but not in sheet, or vice versa)

### 3.2 `/tech-debt-audit` Skill
**What:** Automated scan for code violations across all engine files.
**Why:** Currently tracked manually in PROJECT_STATUS.md. A skill runs faster and catches things humans miss.
**What it checks:**
- `Math.random()` anywhere in engine code
- Direct sheet writes outside Phase 10
- Unused ctx fields (written but never read, or vice versa)
- Dead code per phase
- Sheet header misalignment between code and actual sheets

### 3.3 `/stub-engine` Skill
**What:** Generate a quick-reference map of every exported function across all 11 phases. Shows what each function reads from ctx and what it writes.
**Why:** Useful after context compaction when session memory is lost, or when starting a cold session on the codebase.

---

## Phase 4: Memory + Context

### 4.1 Semantic Memory Search
**What:** Search journal and newsroom memory by meaning, not just keywords. Uses a small local embedding model (embeddinggemma-300M, runs on CPU).
**Why:** Keyword search works now, but as the journal and newsroom memory grow, searching for "civic infrastructure controversies" should find Baylight entries even without that exact phrase.
**When:** Build when memory corpus is large enough that keyword misses matter.

### 4.2 Startup File Freshness Check
**What:** Add a check to `/session-startup` that warns if identity files are stale — JOURNAL_RECENT.md older than 48 hours, SESSION_CONTEXT.md not updated since last session, NEWSROOM_MEMORY.md out of date.
**Why:** Prevents sessions starting with outdated context without realizing it.
**How:** Small addition to existing `/session-startup` skill. Check file modification timestamps.

---

## Watch List (not building, tracking)

- **Agent Teams** — Experimental Claude Code feature. Teammates communicate directly. Monitor for stability.
- **Multi-Character Discord** — Multiple journalists in Discord. TinyClaw is the reference architecture.
- **MiniMax M2.5** — Sonnet-quality at 1/20th cost. Escape hatch if API costs spike.
- **Skills Portability** — Our skills work in Google Anti-Gravity with minimal changes. Vendor lock-in insurance.
- **Third-Party Orchestrators** — Claude Swarm, Claude Flow, claude-pipeline. Our pipeline covers the same ground.

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
