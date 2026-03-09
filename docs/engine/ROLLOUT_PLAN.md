# GodWorld — Pipeline Enhancement Rollout Plan

**Created:** Session 55 (2026-02-21)
**Source:** Tech reading sessions S50 + S55 + S60 + S66
**Status:** Active
**Last Updated:** Session 85 (2026-03-09) — Phase 24 plan written, T1-T2 micro-event rates boosted, 41 civic citizens GAME→CIVIC, arc engine "early"→"seed" fix, Phase 22.1/22.2/23.5 complete.

**Completed phases are archived in `ROLLOUT_ARCHIVE.md`.** That file is on-demand — read it only when you need build context, implementation details, or history for a completed phase. It is not loaded at session start.

---

## Next Session Priorities

Items that should be addressed in the next session. Updated at session end. Absorbs the old "INCOMING — Next Session" block from SESSION_CONTEXT.md.

- ✅ ~~Standalone initiative agent test~~ — Initiative agents ran successfully in E86.
- ✅ ~~Run Cycle 86~~ — Complete. Initiative agents, voice agents, desk agents all ran.
- ✅ ~~Edition 86 production~~ — Published. First A grade.
- ✅ ~~Photo pipeline re-test~~ — 3 photos generated for E86, all clean.
- ✅ ~~Phase 23.1: Newsroom Base Patch~~ — Evidence Block + Stats Gating on all 8 desks. Anonymous Source Policy on 4 desks.
- ✅ ~~Phase 23.3: Domain Ownership~~ — Cross-desk routing tables on all 8 desks.
- ✅ ~~Phase 23.5: Character Feedback Loop~~ — `scripts/enrichCitizenProfiles.js` v1.0 built and run. 161 citizens enriched across E78-E86. Extracts quotes/actions/appearances from Names Index, writes `[EXX]` tagged entries to LifeHistory. Idempotent. Compression engine picks up via `Quoted` trait tag. S83.
- ✅ ~~Phase 23.6: Jax Caldera deployment~~ — Agent + voice file + pipeline step (2.7) already built and sharp. No code needed. Editorial commitment: next edition, enforce Step 2.7 stink signal check.
- ✅ ~~Phase 23.8: Bond Engine bug fixes~~ — 4 bugs fixed: POPID lookup, header collision, full replace wipe guard, ID normalization.
- ✅ ~~Phase 22.3: Agent write access + directories~~ — Edit tool added to 9 agents (civic offices, firebrand, podcast, rhea). S83.
- ✅ ~~Phase 22.1: CIVIC clock mode~~ — 6 council members (Santana, Osei, Crane, Vega, Whitfield, T. Park) flipped from GAME→CIVIC on live sheet. Tier 3→2. Engine code already wired (`generateCivicModeEvents_` called at Phase 5). S83.
- ✅ ~~Phase 22.2: Arc engine fix~~ — Root cause: creation writes "early", lifecycle expects "seed". One-line alias fix in arcLifecycleEngine.js. 111 arcs will unstick on next cycle run. S85.
- ✅ ~~Phase 24 batch results~~ — All 3 specs reviewed, saved, and planned. Implementation plan at `docs/engine/PHASE_24_PLAN.md`. S85.
- ✅ ~~T1-T2 micro-event rates~~ — Boosted: T1 0.8%→50%, T2 1.5%→25%, T3-T4 3%→10%. S85.
- ✅ ~~Phase 22.1: CIVIC activation complete~~ — 41 civic citizens GAME→CIVIC on live sheet. S85.
- ✅ ~~Phase 23.5: Agent output directories + memory~~ — All 22 agents have SKILL.md output dirs, all 24 have MEMORY.md. S85.
- **Run Cycle 87** — First cycle with: civic citizens processing, arcs advancing, boosted micro-event rates. Validate all three fixes.
- **Phase 24.1: MEDIA clock mode build** — Start with citizen migration (8 Echo journalists → MEDIA), then build generateMediaModeEvents.js. Plan at `docs/engine/PHASE_24_PLAN.md`.
- **Supplemental strategy for C87** — World-building supplementals to establish 2041 Oakland texture. Housing, OARI, labor, culture angles. Notes in NOTES_TO_SELF.md.
- **Supermemory ingest retry** — E86 ingest failed (quota exceeded). Retry when service is back.
- **Dashboard bugs #10/#11** — Mags Corliss card inconsistency + Deacon Seymour missing Oakland label. Data-level issues on Simulation_Ledger, not frontend code.

---

## Phase 1: Edition Pipeline Speed + Safety — COMPLETE (S55)

✓ 1.1 Parallel Desk Agents, 1.2 Pre-Commit Code Check, 1.3 Automated Rhea Retry Loop. Details in ROLLOUT_ARCHIVE.md.

---

## Phase 2: Cost + Scale

### 2.1 Desk Model Optimization ✓ (S66)
All desks on Sonnet 4.6. Details in ROLLOUT_ARCHIVE.md.

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

✓ 3.1 `/pre-mortem`, 3.2 `/tech-debt-audit`, 3.3 `/stub-engine`. All skills created and ready. Details in ROLLOUT_ARCHIVE.md.

---

## Phase 4: Memory + Context

### 4.1 Semantic Memory Search
**What:** Search journal and newsroom memory by meaning, not just keywords. Uses a small local embedding model (embeddinggemma-300M, runs on CPU).
**Why:** Keyword search works now, but as the journal and newsroom memory grow, searching for "civic infrastructure controversies" should find Baylight entries even without that exact phrase.
**When:** Build when memory corpus is large enough that keyword misses matter.

### 4.2 Startup File Freshness Check ✓ (S55)
Deployed in startup hook. Details in ROLLOUT_ARCHIVE.md.

---

## Phase 5: API Integration + Cost Optimization

### 5.1 Discord Bot — Supermemory RAG Layer ✓ (S79, reverted S80)
**What:** Added Supermemory RAG as a per-message search layer to enrich responses with archived context. S79 also stripped all 6 local data sources from the system prompt, replacing them with RAG-only. This was a mistake — Supermemory is an external API that times out frequently, leaving the bot with no world knowledge. Reverted S80: all 6 local data sources restored (worldState, citizenKnowledge, archiveKnowledge, editionBrief, notesToSelf, conversationDigest). These read files on the same server — zero cost, zero latency. Supermemory RAG remains as a bonus layer on top (timeout bumped 3s → 8s).
**Current state:** Full system prompt (~24K chars) with local knowledge + Supermemory RAG + family data from Sheets API. Bot is fully connected to the world.

### 5.2 Evaluate Haiku for Discord Bot
**What:** Test switching the Discord bot from Sonnet to Haiku for casual conversation.
**Why:** Most Discord exchanges are casual chat. Haiku handles conversational voice well at a fraction of the cost. Reserve Sonnet-level quality for editorial work.
**Risk:** May flatten nuance in complex conversations. Test for one week and compare.
**Status:** ✓ COMPLETE (S80). Switched to `claude-haiku-4-5-20251001`. Full knowledge prompt restored same session. Monitor voice quality for one week — revert to Sonnet if nuance drops.

### 5.3 Morning Heartbeat Disabled ✓ (S60)
Removed from crontab. Details in ROLLOUT_ARCHIVE.md.

### 5.4 Desk Agents → Dashboard API Consumer
**What:** During edition runs, desk agents query `/api/citizens/:popId`, `/api/search/articles`, `/api/hooks` instead of receiving everything in a flat JSON packet.
**Why:** Same principle as 5.1 — lighter context, targeted data retrieval. Becomes essential as population grows past 800.
**Depends on:** Phase 2.2 (query interface concept). Dashboard API already has the endpoints.
**Status:** Not started. Current packet sizes are manageable.

---

## Phase 6: Newsroom Intelligence (from SuperClaude research)

### 6.1 Structured Errata Records ✓ (S63)
`output/errata.jsonl` — 25 entries seeded from E81-E84. Details in ROLLOUT_ARCHIVE.md.

### 6.2 Auto Post-Edition Documentation ✓ (S63)
`scripts/appendErrata.js` — auto-appends Rhea findings to errata. Details in ROLLOUT_ARCHIVE.md.

### 6.2b Session Learning Extractor — Installed (S83)
**What:** `obra/claude-memory-extractor` v1.x installed at `/tmp/claude-memory-extractor` (npm linked globally as `claude-memory`).
**How to run:** Must run from a **separate terminal** (not inside Claude Code — spawns nested `claude` sessions blocked by nesting guard):
```bash
claude-memory extract --since="2026-03-01T00:00:00"
```
Output: `~/.claude/memories/extracted/` — structured markdown with YAML frontmatter, confidence scores, trigger conditions.
**Cost:** $0.50-2.00 per conversation in Sonnet API tokens.
**Limitation:** Cannot run during active Claude Code sessions. Run from a second SSH terminal or after session ends.
**Status:** Installed, awaiting first external run. S83.

### 6.3 Pre-Write Agent Guardian ✓ (S63)
`queryErrata.js` + all 6 desk agents updated with guardian checks. Details in ROLLOUT_ARCHIVE.md.

### 6.4 Dashboard Visual QA Agent (Playwright) ✓ (S80)
`scripts/visual-qa.js` + `/visual-qa` skill. Chromium headless: screenshots at 3 viewports (desktop 1440, tablet 768, mobile 375), element checks (title, search, nav), 6 API endpoint health checks, interaction test. Auth-aware (basic auth from .env). Output: `output/visual-qa/` with PNGs + `qa-report.json`. Run `--skip-screenshots` for fast mode.

### 6.4b Dashboard Accessibility Audit (Axe) ✓ (S80)
`@axe-core/playwright` integrated into `visual-qa.js` step 6. Scans for WCAG violations by severity (critical, serious, moderate, minor). Critical/serious = FAIL, moderate/minor = PASS with note. Full violation report written to `output/visual-qa/accessibility-report.json`. Baseline findings (S80): 8 unlabeled buttons (critical), 78 low-contrast elements (serious). PA11Y deferred — Axe covers primary needs.

### 6.5 Rhea Severity Tiers ✓ (Already implemented)
Rhea's SKILL.md already classifies findings as CRITICAL (blocks publication, triggers REVISE verdict), WARNING (should fix, doesn't block), and NOTE (informational). Retry recommendation targets only desks with CRITICAL errors. 5-category scoring (Data Accuracy, Voice Fidelity, Structural Completeness, Narrative Quality, Canon Compliance) at 0-20 each. Fast mode scores on 2 categories only (/40). Functionally equivalent to Blocker/High/Medium/Nitpick pattern.

### 6.6 Skill Auto-Suggestion Hook ✓ (S80)
`.claude/hooks/skill-suggest.sh` — `UserPromptSubmit` hook. Matches 15 skills via keyword/regex on user prompt. Silent when no match. Wired into `hooks.json`.

### 6.7 Scheduled Autonomous Maintenance ✓ (S80)
`scripts/weekly-maintenance.sh` — Cron Wednesdays 4 AM UTC. Checks: 11 engine directories, stale desk packets/brief (14-day threshold), PM2 health + restart counts, disk/memory, dashboard API. Discord webhook alert on issues. Logs to `logs/weekly-maintenance.log`.

### 6.8 Progressive Context Loading — Already Implemented ✓ (S83 review)
**What:** Workflow-routed boot already in place. CLAUDE.md `Session Boot` asks workflow type (Media-Room / Research / Build / Maintenance / Cycle Run), then loads ONLY the files for that workflow (2-3 files each). Identity boot is just PERSISTENCE.md + JOURNAL_RECENT.md (~2-3K tokens). Total boot context well under 10%.
**Why closed:** The "60% at startup" problem SuperClaude solved doesn't apply — our boot is already lean. The 5-workflow routing in CLAUDE.md + `/session-startup` skill handles session weight classification implicitly. No further optimization needed until citizen population exceeds 1000+ or journal grows past 50 entries.
**Status:** Already done. No action needed.

---

## Phase 7: Anthropic Platform Upgrades (Official Features)

Source: Anthropic official Claude Code documentation (code.claude.com/docs), Session 60 deep read (2026-02-24). These are first-party features from the platform itself — direct upgrades, not third-party patterns.

### 7.1 Modular Rules ✓ (S63)
4 path-scoped rule files in `.claude/rules/`. Details in ROLLOUT_ARCHIVE.md.

### 7.2 Dynamic Context Injection in Skills ✓ (S63)
Pre-loaded briefings in agent prompts. Details in ROLLOUT_ARCHIVE.md.

### 7.3 Desk Agent Permission Mode ✓ (S60)
All 8 agents use `permissionMode: dontAsk`. Details in ROLLOUT_ARCHIVE.md.

### 7.4 Official Persistent Agent Memory ✓ (S55)
5 agents with `memory: project`. Details in ROLLOUT_ARCHIVE.md.

### 7.5 Mags Identity Agent ✓ (S80)
`.claude/agents/mags-corliss/SKILL.md` — Condensed identity from PERSISTENCE.md: core traits, family, boot sequence, behavioral rules, tone, key file references. Launch with `claude --agent mags-corliss`. Uses `memory: user` for cross-session persistence. Still need to test that CLAUDE.md @ imports load alongside agent prompt.

### 7.6 Agent Teams for Edition Pipeline
**What:** Replace the current parallel `run_in_background` subagent approach with agent teams. Mags as team lead, 6 desk agents as teammates with shared task list and inter-agent messaging.
**Why:** Current pipeline: Mags launches 6 background subagents, waits for all to finish, compiles results. With agent teams: Mags creates a team, assigns desk tasks, teammates claim work and can message each other directly ("Carmen, what vote count did you use for Baylight?" → "6-3, here's the breakdown"). Cross-desk coordination happens automatically instead of through Mags as bottleneck.
**How:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Update `/write-edition` to create an agent team instead of launching individual subagents.
**Depends on:** Agent teams graduating from experimental status. Currently has known limitations: no session resumption, task status lag, no nested teams.
**Risk:** Experimental feature. Token cost higher (each teammate is a separate Claude instance). Wait for stability before adopting.
**Status:** **Test on podcast desk first (S76 decision).** Podcast is non-canon, uses 2 hosts + source material — ideal sandbox for agent team coordination without risking edition integrity. If podcast test succeeds, evaluate for edition pipeline. Still experimental — known limitations: no session resumption, task status lag, no nested teams.

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

### 7.8 Install Official Marketplace Plugins ✓ (S76)
9 plugins installed: claude-supermemory (project), claude-md-management, github, commit-commands, pr-review-toolkit, playwright, code-review, typescript-lsp, claude-mem (user scope). All active.

### 7.9 Remote Control Setup
**What:** Test Remote Control — continue local Claude Code sessions from phone, tablet, or any browser. Run `claude remote-control` or `/remote-control` from a session.
**Why:** Mike is on Max plan (confirmed S76), which supports Remote Control. Enables monitoring and steering GodWorld sessions from the couch, phone, or another computer. Sessions stay local — phone/browser is just a window into the running session.
**How:** Run `claude remote-control` from terminal. Opens a URL + QR code. Open on phone or another browser. Sessions sync in real time. Also available: `/remote-control` from within an existing session. Enable for all sessions via `/config` → "Enable Remote Control for all sessions."
**Source:** S76 research, code.claude.com/docs/en/remote-control
**Status:** Tested S76 — `claude remote-control` returns "not yet enabled for your account" despite Max plan. Feature is in research preview with gradual rollout. Revisit periodically.

### 7.10 Claude Code on the Web — Remote Sessions
**What:** Test `claude --remote "task"` to kick off Claude Code sessions on Anthropic cloud VMs from terminal. Tasks run even if laptop closes.
**Why:** Direct path to autonomous cycle execution (12.3). Mike can `claude --remote "run pre-mortem for cycle 86"` and walk away. Session runs on Anthropic infrastructure, pushes results to a branch, notifies when done. Also supports `/teleport` to pull web sessions back to terminal.
**How:** `claude --remote "task description"` creates a cloud session. Monitor via `/tasks` or at claude.ai/code. Multiple parallel sessions supported. Requires GitHub repos connected at claude.ai/code.
**Feeds into:** Phase 12.3 (Autonomous Cycle Execution) — cloud sessions are the infrastructure layer.
**Source:** S76 research, code.claude.com/docs/en/claude-code-on-the-web
**Status:** Not started. Test after GitHub connection verified.

---

## Phase 8: Server Infrastructure + Security

Source: Server audit Session 60 (2026-02-24). Droplet inspection revealed exposed ports, memory pressure, no firewall. python-digitalocean library review (koalalorenzo/python-digitalocean) for API-driven infrastructure management.

### 8.1 UFW Firewall ✓ (S60)
SSH + 3001 only. Details in ROLLOUT_ARCHIVE.md.

### 8.1b Drive OAuth Refresh Token ✓ (S69)
Re-authorized with full `drive` scope (upgraded from `drive.file`). New refresh token saved to `.env`. Enables both Drive writes and `files.copy` for spreadsheet backups. New backup script: `scripts/backupSpreadsheet.js`.
**Still pending:** Rotate the client secret for `559534329568-an7vso0b0nnoij3eso8spj1e079suikq` in Google Cloud Console — it was accidentally pasted in chat.

### 8.2 RAM Upgrade to 2GB ✓ (S72)
Droplet resized from 1GB to 2GB RAM via DigitalOcean dashboard.

### 8.3 Automated Droplet Snapshots ✓ (S80)
`scripts/snapshot-droplet.sh` — Bash script using DO REST API. Takes weekly full-droplet snapshot, waits for completion, rotates old ones (keeps 4). Cron: Sundays 3 AM UTC. Logs to `logs/snapshot.log`. First snapshot taken 2026-03-05. Cost: ~$0.50-1.00/month.

### 8.4 Resource Monitoring + Discord Alerts ✓ (S72)
`scripts/server-health-check.sh` — Cron every 6 hours. Checks: disk >80%, RAM <100MB available, PM2 errored processes, PM2 restart counts >10, dashboard HTTP health. Sends Discord webhook alert on threshold breach. Tested clean: Disk 67%, RAM 646MB.

### 8.5 Log Rotation ✓ (S72)
`/etc/logrotate.d/godworld` — weekly rotation, 4 weeks retained, compressed. Covers all `logs/*.log` files. Uses `copytruncate` for PM2 compatibility.

### 8.6 Security Hardening — PARTIAL (S72)
- ✓ fail2ban installed and active (SSH jail, already blocking brute-force IPs)
- ✓ unattended-upgrades enabled (was already installed and configured)
- **Remaining:** Create non-root user + SSH key-only auth + disable root login. Requires Mike to update SSH config. Do in a dedicated session with DO console as backup.

### 8.7 Dashboard Access Control ✓ (S80)
Basic auth middleware in `dashboard/server.js`. Credentials via `DASHBOARD_USER` + `DASHBOARD_PASS` in `.env`. `/api/health` exempt (for monitoring cron). Browser prompts login on first visit. `dotenv/config` imported for env loading.

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
**Reference:** docker/awesome-compose — Node/Express + Nginx example, Prometheus + Grafana example. Docker AI for Agent Builders (KDnuggets, Feb 2026) — Docker Model Runner for local models, Compose v2.38+ supports top-level `model` services alongside app containers. Pre-built MCP servers (Postgres, Slack, Google Search) ship as Docker images.
**Extended architecture (S80 research):** The compose stack can include a local model server (Ollama or Docker Model Runner) as a service, exposing an OpenAI-compatible API to other containers. This means desk agents, Lori, or Rhea could query a local Qwen/Llama model via the same Docker network — no external API calls. Build this when Phase 21 (local model pipeline) is ready.
**Status:** DEFERRED (S80 decision). PM2 handles current 2-service stack fine. Docker overhead (~200MB) is significant on 2GB droplet. Revisit when Phase 20 (WordPress) adds a third service or droplet upgrades to 4GB+.

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
**Status:** Not started. Build after 9.1 is stable. Extends 8.4 shell-script monitoring (now live) with persistent history and visual dashboards.

### 9.4 One-Command Disaster Recovery
**What:** Document and test the full recovery path: new droplet → install Docker → clone repo → `docker compose up -d` → everything works. The `docker-compose.yml` IS the infrastructure documentation.
**Why:** The droplet is a single point of failure. With containerization, the recovery path is: (1) create new DO droplet, (2) install Docker, (3) clone GodWorld repo, (4) copy `.env`, (5) `docker compose up -d`. Five steps instead of fifty. Combined with automated snapshots (8.3), this is belt-and-suspenders disaster recovery.
**How:** Write a `RECOVERY.md` doc with the exact steps. Test it by spinning up a second droplet and verifying the stack comes up clean.
**Status:** Not started. Build after 9.1 is proven.

---

## Phase 10: Simulation Depth — Civic Voice Agents — COMPLETE

Source: Session 61 discussion (2026-02-24), built Sessions 63-64. Architecture spec: `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md`.

### 10.1 Civic Office Agent — Mayor ✓ (S63)
Mayor Santana voice agent generates canonical statements at Step 1.8. Details in ROLLOUT_ARCHIVE.md.

### 10.2 Mara Vance Memory + Structure Overhaul ✓ (S63-64)
`docs/mara-vance/AUDIT_HISTORY.md` — Mara's structured institutional memory. Contains initiative status board, council composition table, status alerts, voting history, and faction tracking. Read at start of every audit, updated after. Replaced the broken Supermemory search-and-save loop with persistent on-disk memory.

### 10.3 Extended Voice Agents ✓ (S64)
All 6 additional voice agents built and wired into pipeline (Steps 1.8b/1.8c):
- **Council Factions:** OPP (`civic-office-opp-faction`), CRC (`civic-office-crc-faction`), IND Swing (`civic-office-ind-swing`)
- **Extended Voices:** Police Chief Montez (`civic-office-police-chief`), Baylight Authority Director Ramos (`civic-office-baylight-authority`), DA Dane (`civic-office-district-attorney`)
- **Also:** Freelance Firebrand (`freelance-firebrand`) — accountability columnist

Baylight Authority generated Keisha Ramos statements for C84 supplemental. Civic voice packets output to `output/civic-voice-packets/`.

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

### 11.2 Moltbook Heartbeat Cron ✓ (S63)
`moltbook-heartbeat.js` — PM2 cron every 30 min. Details in ROLLOUT_ARCHIVE.md.

---

## Phase 12: Agent Collaboration + Autonomy

Source: Anthropic engineering blog "Building a C Compiler with Parallel Claudes" (Feb 5, 2026), Sonnet 4.6 benchmarks (Feb 17, 2026), claude-mem v10.5.x changelog, Vercept acquisition (Feb 25, 2026). Session 66 research (2026-02-27).

### 12.1 Agent-to-Agent Interviews ✓ (S72)
**What:** Mags curates 2-5 targeted interview questions during briefing compilation. Voice agents respond in character. Paulson gets async notification via Discord webhook and responds via CLI tool. Interview transcripts flow into desk briefings as primary source material.
**Architecture:** Step 1.8d in write-edition pipeline (between voice agents and desk launch). Mags curates questions — not desk agents — avoiding costly two-pass runs. File-based coordination: `output/interviews/request_c{XX}_{office}.json` → voice agent response → `output/interviews/response_c{XX}_{office}.json`. Paulson async: Discord notification (`scripts/notify-paulson-interview.js`) + CLI response tool (`scripts/paulson-respond.js`). Graceful degradation if Paulson unavailable.
**Files changed:** write-edition SKILL.md (Step 1.8d), 7 voice agent SKILL.md files (Interview Protocol), 6 desk agent SKILL.md files (Interview Transcripts), 2 new scripts, `output/interviews/` directory.
**Depends on:** Phase 10.1 (civic voice agents) — COMPLETE.
**Status:** ✓ COMPLETE (S72). Ready for first use in C85.

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
**Status:** ✓ COMPLETE (S76). Upgraded from 10.4.0 to 10.5.2 via uninstall/reinstall (`plugin update` had a cache bug). Smart Explore, hook crash fix, save_observation cleanup all active.

### 12.5 Business Ledger — Full Engine Integration ✓ (S69-S72)
**What:** Wire Business_Ledger into the simulation engine so company data drives economic outcomes.
**Data integration (Phase 14.4/14.7/14.5):**
- ✓ Business_Ledger expanded from 11 to 51 entities (24 institutional + 16 named venues)
- ✓ `linkCitizensToEmployers.js` — five-layer employer resolution, 658/658 citizens mapped
- ✓ `EmployerBizId` column on Simulation_Ledger, `Employment_Roster` sheet created
- ✓ `buildDeskPackets.js` v2.1 — `businessSnapshot` in economicContext, employer data on interview candidates
- ✓ Citizen-to-employer linkage with derived Employee_Count and Avg_Salary per BIZ entity
**Engine-side dynamics (S72):**
- ✓ Career Engine v2.4 — `EmployerBizId` updated on transitions (layoff→clear, sector_shift/lateral→new BIZ-ID from INDUSTRY_BIZ_POOL), `businessDeltas` in careerSignals, deterministic via `roll()`
- ✓ Economic Ripple Engine v2.5 — `BUSINESS_CONTRACTION`/`BUSINESS_EXPANSION` triggers from businessDeltas, Business_Ledger read for neighborhood resolution, `mapToCanonicalNeighborhood_()` maps 15+ BL neighborhoods to 10 canonical
- ✓ `processBusinessIntake.js` — promotes staged businesses from Business_Intake to Business_Ledger, assigns BIZ-IDs, updates employer_mapping.json
- ✓ `editionIntake.js` v1.2 — `parseBusinessMentions()` scans Business Ticker for new business names, stages to Business_Intake
**Status:** ✓ COMPLETE. Engine-side dynamics wired. Ready for first live run in C85.

### 12.6 Podcast Desk — Edition-to-Audio Pipeline ✓ (S67)
Full pipeline: agent → XML transcript → Podcastfy → audio. 3 show formats, permanent hosts. Details in ROLLOUT_ARCHIVE.md.

### 12.9 Rhea Fast-Pass Sampling ✓ (S69)
Fast mode added to Rhea's SKILL.md. Runs 7 of 19 checks (citizen names, votes, sports records, engine language, reporter accuracy, new citizen auth, mayor verification). Scores on Data Accuracy + Canon Compliance only (40-point scale). Full mode unchanged for final pre-publication pass.

### 12.7 Live Ledger Query Script ✓ (S67)
`queryLedger.js` — 6 query types, searches Sheets + 674 files. Details in ROLLOUT_ARCHIVE.md.

### 12.8 Initiative Implementation Tracking ✓ (S67)
4 tracking columns on Initiative_Tracker, wired into desk packets. Details in ROLLOUT_ARCHIVE.md.

### 12.10 Fish Audio TTS — Podcast Voice Upgrade — DEFERRED
**What:** Replace Podcastfy (Python venv + WaveNet) with Fish Audio OpenAudio S1 API. Native Node.js pipeline, distinct voices per speaker via voice IDs, 64+ inline emotion tags.
**Why deferred:** $11/month subscription for API access. Cost rejected S77 — $150/year for 26 podcasts vs $12/month for the entire DigitalOcean server. Code was built and reverted. Current Podcastfy + WaveNet pipeline works.
**Research preserved:** Fish Audio OpenAudio S1 API, voice IDs per speaker, emotion tags, ffmpeg segment concatenation. Ming-Omni-TTS (no hosted API, needs GPU) was the original plan before Fish Audio pivot.
**Revisit when:** Fish Audio pricing changes, or podcast frequency increases enough to justify the cost.

### 12.11 MiniMax M2.5 — Cheap Desk Agent Testing
**What:** Test MiniMax M2.5 as a low-cost alternative to Sonnet 4.6 for desk agents. At $0.30/M input tokens, running all 6 desks would cost ~$0.05-0.10 per edition vs ~$2-5 on Sonnet.
**Why:** SWE-Bench Verified 80.2%. BrowseComp 76.3%. 100 tok/sec. If voice quality holds for journalism, this unlocks daily edition runs at negligible cost — key enabler for autonomous cycle execution (12.3).
**How:** API at platform.minimax.io. Test on non-canon work first — letters desk, Chicago bureau. Compare output quality against Sonnet baseline. If quality gap is acceptable, evaluate for full desk rotation.
**Source:** S76 research, S50 initial discovery, DigitalOcean newsletter
**Status:** Not started. Test after next edition establishes Sonnet baseline for comparison.

### 12.12 Slack Integration — `@Claude` Routing
**What:** Connect Claude for Slack so `@Claude` in a Slack channel detects coding intent and routes to Claude Code on the web. Mike could post "@Claude run pre-mortem for cycle 86" in a GodWorld channel and get a cloud session.
**Why:** Extends the autonomous pipeline (12.3) with a conversational trigger. Instead of SSH → terminal → `claude --remote`, Mike posts in Slack. Claude picks the repo, spins up a session, posts progress updates to the thread, and offers "Create PR" when done. Thread context gives Claude additional info (e.g., bug reports, feature discussions).
**How:** Install Claude app from Slack App Marketplace. Connect Claude account. Configure routing mode (Code Only or Code + Chat). Invite `@Claude` to relevant channels.
**Depends on:** Claude Code on the web access (7.10), GitHub repos connected. Max plan confirmed (S76).
**Source:** S76 research, code.claude.com/docs/en/slack
**Status:** Not started. Build after 7.10 (web sessions) is tested.

---

## Watch List — Monitoring for Future Adoption

Items not yet on the build schedule but worth tracking for when conditions change.

| Feature | What We're Watching | Trigger to Act |
|---------|-------------------|----------------|
| **Desktop App (Linux)** | Visual diff review, PR monitoring with auto-fix/merge, parallel sessions with auto-worktrees, live app preview. Currently macOS/Windows only. | Linux support ships. Then evaluate for GodWorld server or Mike's local dev. |
| **Agent Teams stability** | Experimental flag removed, session resumption fixed, task status lag resolved. | Official graduation from experimental. Then run full edition pipeline test (7.6). |
| **Fast Mode** | Same Opus 4.6, 2.5x faster, higher cost ($30/$150 MTok). Toggle `/fast`. | Evaluate for rapid iteration sessions (debugging, live dashboard work). Not for long autonomous runs. |
| **Checkpointing** | Auto-saves code state before each edit. `Esc Esc` or `/rewind` to restore. Also has targeted summarize (like `/compact` but surgical). | Already available. Use during edition compilation as safety net. |

---

## Phase 13: Simulation_Ledger Data Integrity Audit — COMPLETE (S68-S72)

**Tracking document:** `docs/engine/LEDGER_AUDIT.md` — all progress, decisions, and remaining work live there.

**Why this is a phase:** Every downstream system depends on the Simulation_Ledger being correct — desk packets, queryLedger.js, citizen lookups, age calculations, neighborhood assignments, economic parameters. Bad ledger data cascades everywhere. This audit makes the ledger trustworthy.

**Status:** COMPLETE. 658/658 citizens clean, all 12 canonical neighborhoods. Phase 13 core audit (S68), Phase 16 satellite consolidation (S71), Phase 17 data integrity cleanup (S72), neighborhood rebalance (S72). 167 unique 2041 demographic voice roles. Role-to-economic mapping done (295 mappings, 100% coverage). Family linkages done (Corliss, Keane, Dillon). Chicago migration done. MLB player age review resolved by Phase 15.4 (87 birth years corrected from 2023-era to 2041 math). Tech debt 4/7 critical fixed. See LEDGER_AUDIT.md for full breakdown.

**Started:** Session 68 (2026-02-28)

---

## Phase 14: Economic Parameter Integration — COMPLETE (S69-S72)

**Plan document:** `.claude/plans/async-mapping-kazoo.md`
**Why this is a phase:** The census audit (Phase 13) gave every citizen a role. This phase makes those roles drive real economics — income, wealth, household budgets, neighborhood metrics, business linkage, and desk packet data. Replaces the hardcoded $35K/$62K/$110K income bands with role-specific amounts derived from 198 economic profiles.

**Started:** Session 69 (2026-03-01)

### 14.1 Role-to-Parameter Mapping Script ✓ (S69)
`data/role_mapping.json` — 280 mappings, 100% ledger coverage. `lib/economicLookup.js` — shared lookup utility. `scripts/applyEconomicProfiles.js` — seeding script. **Live run complete** (S69): 533 citizens updated, 102 sports SPORTS_OVERRIDE, 2,235 cell writes. Median income $85,943, new EconomicProfileKey column at position 44.

### 14.2 Engine Income Refactor ✓ (S69)
Three-file refactor eliminating hardcoded income overwrite. **generationalWealthEngine.js** v2.0: seeded citizens (EconomicProfileKey) skip income recalculation, wealth thresholds recalibrated ($300K elite/$180K wealthy), SavingsRate preserved, Math.random bug fixed. **runCareerEngine.js**: career transitions directly adjust Income (+6-12% promotion, -12-20% layoff, etc.), new `deriveCareerMod_()` function, CareerState now includes careerMod field. **educationCareerEngine.js** v2.0: removed `INCOME_BY_EDUCATION` and `matchEducationToIncome_()` — education affects career advancement speed, not income. Eliminates three-way income conflict.

### 14.3 Household & Neighborhood Aggregation ✓ (S69)
`scripts/seedHouseholds.js` — 529 households (3 family, 1 single-parent, 525 single), 533 citizens linked. Married pairs matched by shared ChildrenIds. Rent from role housingBurdenPct. Median rent $2,717/mo. 125 owned, 404 rented. `scripts/aggregateNeighborhoodEconomics.js` — MedianIncome and MedianRent populated on Neighborhood_Map for 9 neighborhoods (those matching existing map rows). Employment rate refactor deferred to engine work.

### 14.4 Business Linkage — COMPLETE (S69)
Expanded Business_Ledger from 11 to 35 businesses (24 new: Port of Oakland, AC Transit, BART, Highland Hospital, OUSD, City of Oakland, Bay Tribune, EBMUD, Baylight Construction, libraries, courts, fire/police, Kaiser, Fruitvale Clinic, parks, community centers, Oakland Tech Collective, PG&E, Jack London Markets, Housing Authority, Peralta College, etc.). Created `scripts/linkCitizensToEmployers.js` with five-layer employer resolution (sports → parenthetical → keyword → self-employed → category default). Results: 635 citizens mapped (102 sports, 30 parenthetical, 141 keyword, 77 self-employed, 285 category), zero unmatched. Created `Employment_Roster` sheet (635 rows). Added `EmployerBizId` column to Simulation_Ledger. Derived Employee_Count and Avg_Salary on Business_Ledger from actual citizen data. Updated `buildDeskPackets.js` to v2.1 with `businessSnapshot` in economicContext and employer data on interview candidates. Deferred: nightlife/restaurant venue BIZ entries, Career Engine BIZ-ID awareness, Economic Ripple business triggers.

### 14.5 Desk Packet Enrichment — COMPLETE (S69)
`buildDeskPackets.js` v2.0: Replaced string income categories (`low`/`mid`/`high`) with dollar-amount buckets (`under50k` through `over200k`), added `medianIncome` (real $), `totalCitizensWithIncome`, and `neighborhoodEconomics[]` from Neighborhood_Map. Interview candidates enriched with `income`, `roleType`, `economicCategory`. Agents now receive real economic numbers. Business snapshots deferred to 14.4.

### 14.6 Expansion Infrastructure
Parameter versioning, Chicago economic profiles, seasonal modifiers, dynamic pricing hooks. Future work.

### 14.7 Venue & Restaurant Business Linkage — COMPLETE (S69)
Phase 7 engines (`buildNightLife.js` v2.4, `buildEveningFood.js` v2.4) contain 171 unique named venues across 12 neighborhoods. Selected 16 anchor establishments from base pools (not holiday-specific) and promoted them to BIZ entries (BIZ-00036 through BIZ-00051). Coverage: 7 nightlife venues (Blue Lantern Bar, Temple Lounge, OakTown Social, Pulse District, Merritt Club, Green & Gold Tavern, Dragon Gate Lounge) + 8 restaurants (OakHouse, Harborline Grill, Fruitvale Diner, KONO Kitchen, Miso Metro, West Side Cafe, Midnight Bistro, Dockhouse BBQ) + 1 fast food (SpeedyBurger). Added 6 hospitality keyword rules (Pastry Chef, Line Cook, Barista, Bartender, Sommelier, DJ) linking worker roles to venue BIZ-IDs. Business_Ledger now at 51 entries. employer_mapping.json v1.1. Remaining 155 venues stay as Phase 7 engine flavor text — holiday and seasonal pop-ups don't need economic grounding.

---

## Phase 15: A's Player Integration — COMPLETE (S70)

**Plan document:** `.claude/plans/async-mapping-kazoo.md`
**Why this is a phase:** Phase 14 wired economics for 639 civilians but the 102 A's players were stuck in SPORTS_OVERRIDE limbo: birth years calculated from game year (~2023) instead of simulation year (2041), incomes at ~$40K placeholders, no personality traits, retired players still carrying position codes.

**Started:** Session 70 (2026-03-01)

### 15.1 Player Index Upgrade ✓ (S70)
`scripts/buildPlayerIndex.js` — Added `parseContractValue()` (handles $28.2M/$7.1M/$780K/$70K formats), `extractQuirks()` (parses "Quirks: Outlier I • Night Player" into arrays), `extractPlayerStatus()` (detects retired/FA/active). Post-processing adds `bio.computedBirthYear = 2041 - age` and `parsedContract` with structured salary data. Output: 55 players indexed (52 baseball, 3 basketball), 52 with computed birth years, 37 with parsed contracts, 8 with quirks, 21 with status, 5 retired.

### 15.2 Athlete Configuration ✓ (S70)
`data/athlete_config.json` — Salary tiers (MLB_SUPERSTAR $15M+/WL10, MLB_REGULAR $1-15M/WL9, MLB_MINIMUM $700K/WL7, MINOR_LEAGUE $50K/WL5, MINOR_SIGNING/WL4). Fallbacks: active MLB $750K, minor league $55K, retired $250K. 14 quirk-to-trait mappings (Night Player→Watcher/noir, Outlier I→Catalyst/tense, etc.). 13 position-based trait defaults. Post-career roles by player type (pitchers→Pitching Coach/Broadcasting Analyst/Scout, position→Hitting Coach/Community Ambassador/Restaurant Owner, legends→Front Office Advisor/Sports Media Personality). Tier visibility weights for future engine flavor integration.

### 15.3 Ledger Prep & Cleanup ✓ (S70)
`scripts/prepAthleteIntegration.js` — Mark Aitken consolidated: POP-00003 promoted to Tier 1 with "1B — Player Rep, Community Liaison", POP-00020 backfilled with Elena Vásquez (Waterfront Urban Planner, Jack London). Buford Park: canonical at POP-00059 (T3), POP-00030 backfilled with Derek Simmons (A's Marketing Director, Jack London). 4 Bulls players (POP-00529/531/532/535) replaced with Oakland civilians: Tomas Aguilar (Port logistics), Priya Nair (climate engineer), Marcus Whitfield (youth basketball coach), Lisa Tanaka (loan officer). 5 farewell season retired players set to Status: Retired (Paul Skenes→Scout, Mason Miller→Broadcasting Analyst, Orion Kerkering→Pitching Coach, Kris Bubic→Scout, Dalton Rushing already Retired). 3 ENGINE-mode retirees switched to GAME. Birth years corrected for all 5. 110 cells written.

### 15.4 Full Integration Rollout ✓ (S70)
`scripts/integrateAthletes.js` — 87 players processed (35 TrueSource-matched, 52 fallback). Birth years corrected from 2023-era to 2041 math. Income: superstars $15M-$37.8M (WL10), regulars $1-15M (WL9), MLB minimum $750K-$780K (WL7), minor league $55K-$100K (WL5). TraitProfile generated for all 87 (8 from TrueSource quirks, 79 from position defaults). 4 retired players transitioned to post-career roles with EconomicProfileKey updated. 298 cells written. Role mapping updated to 288 entries (added Broadcasting Analyst, Community Ambassador, Front Office Advisor, Sports Media Personality, Youth Baseball Instructor, A's Marketing Director).

### 15.5 Engine Flavor Integration ✓ (S72)
`generateGameModeMicroEvents.js` v1.4: TraitProfile column read, 7 archetype-specific event pools (Catalyst, Anchor, Watcher, Grounded, Striver, Connector, Drifter — 28 personality-flavored events), `buildEventPool_()` accepts traitProfile parameter. `buildEveningFamous.js` v2.5: Reads Simulation_Ledger for Tier 1-2 active MLB GAME citizens at runtime, replaces generic ATHLETES pool with real A's players, includes homeNeighborhood (50% sighting chance) and traitProfile/tier in output. Falls back to generic pool if ledger unavailable. Also this session: Generic_Citizens occupation pool upgraded from 27 generic 2026 roles to 30 2041-era roles (EV mechanics, solar installers, vertical farm techs, port automation monitors, drone logistics). Neighborhood rebalance: 63 citizens remapped from 11 non-canonical neighborhoods to nearest canonical equivalent (41-73 per neighborhood across 12 canonical).

---

## Phase 16: Citizen Ledger Consolidation — COMPLETE (S71)

**Plan document:** `.claude/plans/async-mapping-kazoo.md`
**Why this is a phase:** Three satellite citizen ledgers (Faith_Organizations, Generic_Citizens, Cultural_Ledger) operated independently from the 639-citizen Simulation_Ledger. Faith leaders existed as text strings only — couldn't vote, age, or appear in stories. Cultural celebrities had FameScores but no POP-IDs. The emergence pipeline needed auditing after the Phase 13 census overhaul.

**Started:** Session 71 (2026-03-01)

### 16.1 Faith Leaders → Simulation_Ledger ✓ (S71)
`scripts/integrateFaithLeaders.js` — 16 faith leaders from 16 congregations added to Simulation_Ledger as Tier 2 citizens (POP-00753 through POP-00768). Protestant, Baptist, Catholic, Methodist, Pentecostal, Reform Jewish, Orthodox Jewish, Muslim, Buddhist, Hindu, Sikh, Jewish Renewal, Unitarian. Birth years deterministic from name hash (ages 43-70 in 2041). All mapped to "Senior Pastor / Faith Leader" except Larry Yang (Community Organizer — lay teacher). LeaderPOPID column added to Faith_Organizations and backfilled for all 16.

### 16.2 Generic_Citizens Audit ✓ (S71)
`scripts/auditGenericCitizens.js` — Read-only audit of 268 Generic_Citizens. All 11 emerged citizens confirmed on Simulation_Ledger (zero gaps). Emergence pipeline healthy: generates 1-5 Tier-4 citizens/cycle, promotes at 3+ media mentions. Occupations are 2026-era generic (electrician, mechanic, taxi driver) — pool upgrade to 2041 vocabulary deferred. Recommendation: keep emergence engine as-is.

### 16.3 Celebrity Bridge ✓ (S71)
`scripts/integrateCelebrities.js` — 9 qualifying celebrities (FameScore 65+, National/Iconic/Global tier). 6 already on Simulation_Ledger from prior emergence pipeline. 3 new additions: Dax Monroe (Iconic athlete, FameScore 95, Tier 2, POP-00769), Kato Rivers (National athlete, FameScore 88, Tier 3, POP-00770), Sage Vienta (Global actor, FameScore 92, Tier 2, POP-00771). UniverseLinks column backfilled on Cultural_Ledger for all 9. 21 celebrities stay Cultural_Ledger only (below threshold).

**Final census: 658 citizens** (639 + 16 faith + 3 celebrity). Role mapping at 295 — all faith and celebrity roles already existed in base set, additional mappings from Phase 15 sports roles.

---

## Phase 17: Data Integrity Cleanup — COMPLETE (S72)

**Why this is a phase:** Batch audit of Simulation_Ledger revealed 73.4% health score — 147 citizens with data quality issues accumulated across Phases 13-16. Duplicate names from the original census, Chicago neighborhoods that leaked in, lowercase Status/ClockMode values from different integration scripts, citizens aged 80+ from pre-Phase 13 birth year math, and bare position codes on non-GAME citizens.

**Started:** Session 72 (2026-03-02)

### 17.1 Batch Audit ✓ (S71-72)
Batch API generated a Python audit script (`/tmp/audit_ledger.py`). Ran locally against CSV backup (639 rows) and cross-referenced against live sheet (658 rows). Seven audit categories: duplicate names, POP-ID validation, missing fields, data consistency, neighborhood distribution, tier distribution, RoleType diversity. 209 findings: 115 CRITICAL, 70 WARNING, 24 INFO.

### 17.2 Cleanup Script ✓ (S72)
`scripts/cleanupSimulationLedger.js` — Single script handling all 6 fix categories. Dry-run mode, batch writes (50 cells per API call). 189 cell updates across 147 citizens:

- **21 duplicate names renamed** — Higher POP-ID gets new unique citizen name (Kenji Okafor, Priya Marchetti, Tomás Xiong, etc.). Original POP-ID keeps identity. Buford Park + Mark Aitken skipped (already fixed).
- **50 neighborhoods normalized** — "Piedmont Avenue"→"Piedmont Ave" (33), Chicago neighborhoods→underrepresented Oakland areas (12), "Coliseum"→"Coliseum District" (2), "Oakland"→specific neighborhoods (2), "traveling"→KONO (1).
- **42 Status values standardized** — "active"→"Active" (33), "Traded"→"Retired" (4), "Serious Condition"→"Active" (2), "Inactive"→"Retired" (2), "Departed"→"Retired" (1).
- **18 ClockMode values standardized** — "engine"→"ENGINE" (9), "game"→"GAME" (7), "active"→"ENGINE" (2).
- **13 birth years corrected** — 12 citizens born 1954-1960 shifted +15 years (ages 81-87→66-72). 1 child (Rick Dillon, age 10→25).
- **3 bare position codes replaced** — RF/C/CP on ENGINE citizens → Sports Analytics Consultant, Youth Baseball Coach, Athletic Training Specialist.

**Post-cleanup health: ~95%+.** Remaining INFO-level items are intentional design (e.g., "Corner Barbershop Owner" vs "Barbershop Owner" are distinct demographic voices, not duplicates).

---

## Phase 18: Civic Project Agents — Initiative Implementation Pipeline — COMPLETE (S78)

**Why this is a phase:** Initiatives go PASSED and stay PASSED. No agents produce post-vote civic documents — status reports, determination letters, permitting filings, construction updates. Reporters write about missing documents because the documents don't exist. The world doesn't advance because nothing in the engine generates forward motion after a council vote.

**Solution:** 4 new initiative agents + 1 upgrade. Each runs a civic office, makes autonomous decisions about their program, and produces civic documents that become source material for voice agents and desk reporters.

**Started:** Session 78 (2026-03-04)

### 18.1 Foundation ✓ (S78)
- Created `output/city-civic-database/initiatives/{stabilization-fund,oari,transit-hub,health-center,baylight}/` directory tree
- Built `scripts/buildInitiativePackets.js` — reads 7 Google Sheets tabs + local files (Mara directive, previous decisions), produces 5 per-initiative JSON packets to `output/initiative-packets/`
- Seeded 5 agent memory files at `.claude/agent-memory/{initiative}/MEMORY.md` with C85 canonical state
- Deleted orphaned `lib/fishAudio.js` from S77

### 18.2 Stabilization Fund Agent ✓ (S78)
`.claude/agents/civic-project-stabilization-fund/SKILL.md` — Marcus Delano Webb, OEWD Program Director. $28M fund, 295 applications, Beverly Hayes tracking. Write/Edit tools, 15 turns, persistent memory. Produces: status reports, determination letters, decisions JSON.

### 18.3 Remaining 3 Agents ✓ (S78)
- **OARI** (`.claude/agents/civic-project-oari/SKILL.md`) — Dr. Vanessa Tran-Muñoz, Program Director. $12.5M, 45-day clock, dispatch integration, hiring pipeline.
- **Transit Hub** (`.claude/agents/civic-project-transit-hub/SKILL.md`) — Elena Soria Dominguez, Planning Lead. $230M visioning, pre-vote C86, bilingual community engagement, anti-displacement.
- **Health Center** (`.claude/agents/civic-project-health-center/SKILL.md`) — Bobby Chen-Ramirez, Project Director. $45M, post-designation permitting, architect RFP, HCAI licensing.

### 18.4 Baylight Authority Upgrade ✓ (S78)
Upgraded `.claude/agents/civic-office-baylight-authority/SKILL.md`:
- Tools: `Read, Glob, Grep` → `Read, Glob, Grep, Write, Edit`
- maxTurns: 12 → 15
- Added civic document production (5 September 15 deliverables), decisions JSON, memory file
- All existing voice statement generation preserved

### 18.5 Pipeline Integration ✓ (S78)
- Inserted Step 1.6 (4 sub-steps) into `write-edition/SKILL.md` between Step 1.5 and Step 1.7
- Updated `buildCivicVoicePackets.js` — loads initiative decisions from `output/city-civic-database/initiatives/*/decisions_c{XX}.json`, injects into all 7 voice packets (Mayor, OPP, CRC, IND, Police Chief, Baylight, DA)
- Added `civic` destination to `saveToDrive.js` — City_Civic_Database Google Drive folder

### 18.6 Deferred: Port Green Modernization (INIT-004)
Dormant — $320M federal grant pipeline not yet activated. Agent persona (Larry Okafor-Williams) preserved in batch results (`msgbatch_0139XNUsrqpPRG7FfssL4Zob`). Build when INIT-004 goes active.

**Pipeline flow:**
```
buildInitiativePackets.js → Step 1.6 (5 initiative agents, parallel) → decisions JSON
    → buildCivicVoicePackets.js loads decisions → voice agents react → desk agents report
```

---

## Phase 19: Canon Archive System — COMPLETE (S79)

**Why this is a phase:** 680 files of canon content sit in `output/drive-files/` — player data cards, origin stories, interviews, civic columns, reporter profiles, 83 editions. None of the 6 desk agents read them. Agents write from ledger skeletons and Supermemory snippets while the deep canon goes unused. Phase 18 initiative agents now produce civic documents to `output/city-civic-database/initiatives/` but nobody reads those back either. The fix isn't new agents — existing agents already have Read, Glob, and Grep tools. The fix is organizing the archive and pointing agents at it.

**Personas preserved:** 3 Knowledge Keeper personas (Lori Tran-Matsuda, Terry Muñoz-Whitfield, Verdene Okafor-Washington) in `docs/engine/phase19_agent_personas.md`. Saved for potential future use — not being built as agents. The work they would have done is handled by organizing the archive so existing agents can self-serve.

### 19.1 Deduplicate Archive ✓ (S79)
- 680 files audited → 378 unique, 302 exact duplicates (md5) removed
- Duplication pattern: 3 mirror hierarchies (`_Tribune Media Archive_*`, `_Sports Desk Archive_*`, `_Publications Archive_*`) eliminated
- All old `_`-prefixed Drive flat-folders cleaned up

### 19.2 Categorize & Build Canon Ledger ✓ (S79)
- **Batch job:** `msgbatch_01FQ3SMS2xBX7Jgkf18td6A3` — categorized all 378 files
- **Output:** `docs/media/CANON_ARCHIVE_LEDGER.md` — desk/reporter/type structure, agent search patterns
- 9 desks, 29 reporters, 11 content types mapped

### 19.3 Reorganize Archive ✓ (S79)
- Restructured from 99 flat Drive folders → 9 desk folders with reporter subfolders
- Clean hierarchy: `{desk}/{reporter}/*.txt` (sports, civic, culture, business, chicago, editor, general, data, archive)
- Data separated into: `as-universe/{mlb-roster,prospects,former-players,front-office,developmental,storylines,stats-csv}`, `bulls/{players,front-office}`, `templates/`

### 19.4 Wire Agents to Archive ✓ (S79)
- All 6 desk SKILL.md files updated with "Canon Archive" sections
- Each agent has: desk-specific archive paths, Glob/Grep search patterns, instructions to read source material for deep canon
- Sports desk: full A's universe data, player articles by reporter, Statcast cards, Bulls data, pressers
- Civic desk: civic journalism + `output/city-civic-database/initiatives/` (Phase 18 filings) + Mara briefings
- Culture desk: all culture reporters + editor essays + past editions
- Business desk: Jordan Velez archive + civic economic context + civic documents
- Chicago desk: Chicago supplementals + Mara briefings + Bulls universe data
- Letters desk: full archive access — citizens reference what they've read in the Tribune

### 19.5 City Civic Database & Clerk Agent ✓ (S79)
- Created `output/city-civic-database/` with 5 subdirectories: `council/`, `mayor/`, `initiatives/`, `clerk/`, `elections/`
- Migrated `output/civic-documents/` → `output/city-civic-database/initiatives/` (all 5 initiative subfolders)
- Updated all references: 5 initiative agent SKILLs, 2 scripts (`buildInitiativePackets.js`, `buildCivicVoicePackets.js`), civic-desk SKILL, business-desk SKILL, write-edition SKILL, rollout plan, documentation ledger, canon ledger, phase 19 personas doc
- Built **Lori Tran-Matsuda** (City Clerk agent): `.claude/agents/city-clerk/SKILL.md`
  - Haiku, 12 turns, Read/Glob/Grep/Write/Edit tools
  - Audits initiative filings, enforces naming conventions, produces Filing Index + Completeness Audit + Corrections Log + Cumulative Database Index
  - Runs as Step 1.6e in write-edition pipeline (after initiative agents, before voice agents)
  - Memory seeded at `.claude/agent-memory/city-clerk/MEMORY.md`
- Civic Filing Convention defined: `{INIT}-C{XXX}-{DocumentType}-{YYYYMMDD}.md`

**Build estimate:** 1-2 sessions. Dedup and ledger are mechanical (batch + scripts). Agent wiring is SKILL.md edits. No new code beyond the rename script.

---

## Phase 22: Agent Infrastructure Fixes (Post-E86 Audit)

Source: E86 production audit (Session 82, 2026-03-06). Three systemic issues surfaced during the first full initiative-agent edition run.

### 22.1 CIVIC Clock Mode — Health & Life History for Civic Office Holders

**Problem:** Council members and civic office holders are `ClockMode: GAME` because they can't randomly change jobs, migrate, or get economic engine treatment — Mike controls their positions manually, same as sports players. But unlike sports players, civic figures DO need:
- Health state progression (Elliott Crane has been "recovering" for multiple editions with no progression; Marcus Osei has been in "serious condition" since C84 with no change)
- Life history events that develop their personality and voice
- Aging, family events, seasonal observations

The `generationalEventsEngine.js` has full health lifecycle code (hospitalized → recovering → active, or → critical → deceased) but skips all `GAME` mode citizens. Setting civic figures to `ENGINE` would let the career engine randomly promote the mayor or migrate a council member — unacceptable.

**Immediate fix (manual):** Update the ledger NOW:
- Elliott Crane: Status → `recovering`, StatusStartCycle → 83
- Marcus Osei: Status → `serious-condition`, StatusStartCycle → 84
These don't fix the engine gap but at least make the ledger match the narrative.

**Engine fix:** Create a third clock mode: `CIVIC`. Semantics:
- **ENGINE:** Full simulation — career, economics, health, life history, migration. Most citizens.
- **GAME:** Fully manual. No engine processing at all. Sports players only.
- **CIVIC:** Selective simulation — health lifecycle YES, life history YES, aging YES. Career engine NO, migration engine NO, economic engine NO. Council members, mayor, deputy mayor, civic appointees.

**Implementation:**
1. Add `CIVIC` to the mode check in `generationalEventsEngine.js` (health lifecycle + life milestone generation)
2. Exclude `CIVIC` from `runCareerEngine.js`, migration engine, and economic ripple engine (already excluded as GAME)
3. Update ~15 civic office citizens from GAME → CIVIC on the ledger
4. Test: run one cycle, verify Crane progresses from recovering, Osei progresses from serious-condition, no civic figure gets a random career change

**Depends on:** Nothing. Self-contained engine change.
**Risk:** Low. Adding a mode is additive — existing ENGINE and GAME behavior unchanged.
**Status:** Complete (S85). 41 civic citizens flipped GAME → CIVIC on ledger. Engine code already wired (generateCivicModeEvents.js + generational engine accept CIVIC).

### 22.2 Arc Engine Investigation

**Problem:** Mike reports arc engines are still failing. The `Event_Arc_Ledger` read-back was fixed in v3preLoader.js (v3.4) so arcs should persist across cycles, but citizen story arcs aren't visibly progressing in edition output. Needs investigation before a fix can be scoped.

**Investigation checklist:**
1. Does `Event_Arc_Ledger` have any rows? If empty, arcs aren't being generated.
2. Are arc phases advancing (early → rising → peak → decline → resolved)?
3. Do arcs have `involvedCitizens` populated?
4. Are arc events appearing in `ctx.summary.generationalEvents` during cycle runs?
5. Are desk agents reading arc data from their packets? Check `buildDeskPackets.js` for arc inclusion.
6. Is the arc generation code actually being called during Phase 4?

**Status:** Root cause found + fixed (S85). Arc creation writes phase "early" (eventArcEngine.js:496, generationalEventsEngine.js:907/960/977) but arcLifecycleEngine.js expected "seed". All 111 arcs stuck. Fix: added `if (currentPhase === 'early') currentPhase = 'seed';` alias in arcLifecycleEngine.js:222. Next cycle run will unstick all arcs.

### 22.3 Agent Write Access + Hardcoded Output Directories

**Problem:** During E86 production, the business desk and letters desk agents couldn't write their own output files — they generated content as response text that the primary session had to manually rescue. Four voice agents had the same issue with JSON files. Root cause: 6 desk agents and 6 voice agents have `tools: Read, Glob, Grep` — no Write tool. Initiative agents (Phase 18) got Write/Edit, which is why they worked.

**Fix — Part A: Add Write/Edit tools to all production agents:**
- 6 desk agents: business, letters, civic, sports, culture, chicago
- 6 voice agents: mayor, opp-faction, crc-faction, ind-swing, police-chief, district-attorney
- Total: 12 SKILL.md files updated

**Fix — Part B: Hardcoded output directories as agent workspace.**
Each agent gets a designated output path in their SKILL.md. This is their workspace — where they write their work product AND where they can read back their own prior output. The directory serves as the agent's memory of work.

| Agent Type | Agent | Output Directory |
|-----------|-------|-----------------|
| Desk | civic-desk | `output/desk-output/civic_c{XX}.md` |
| Desk | sports-desk | `output/desk-output/sports_c{XX}.md` |
| Desk | culture-desk | `output/desk-output/culture_c{XX}.md` |
| Desk | business-desk | `output/desk-output/business_c{XX}.md` |
| Desk | chicago-desk | `output/desk-output/chicago_c{XX}.md` |
| Desk | letters-desk | `output/desk-output/letters_c{XX}.md` |
| Voice | civic-office-mayor | `output/civic-voice/mayor_c{XX}.json` |
| Voice | civic-office-opp-faction | `output/civic-voice/opp_faction_c{XX}.json` |
| Voice | civic-office-crc-faction | `output/civic-voice/crc_faction_c{XX}.json` |
| Voice | civic-office-ind-swing | `output/civic-voice/ind_swing_c{XX}.json` |
| Voice | civic-office-police-chief | `output/civic-voice/police_chief_c{XX}.json` |
| Voice | civic-office-district-attorney | `output/civic-voice/district_attorney_c{XX}.json` |
| Voice | civic-office-baylight-authority | `output/civic-voice/baylight_authority_c{XX}.json` (already has Write) |
| Initiative | stabilization-fund | `output/city-civic-database/initiatives/stabilization-fund/` (already has Write) |
| Initiative | oari | `output/city-civic-database/initiatives/oari/` (already has Write) |
| Initiative | transit-hub | `output/city-civic-database/initiatives/transit-hub/` (already has Write) |
| Initiative | health-center | `output/city-civic-database/initiatives/health-center/` (already has Write) |
| Clerk | city-clerk | `output/city-civic-database/clerk/` (already has Write) |

Each SKILL.md gets an **Output Directory** section:
```
## Your Output Directory
Write your work to: `output/desk-output/business_c{XX}.md`
This is YOUR workspace. You can also read prior editions here to see your past work.
Previous output: `output/desk-output/business_c{PREV}.md`
```

**Fix — Part C: Agent memory directories.**
Each agent already has persistent memory at `.claude/agent-memory/{agent}/MEMORY.md`. Verify all 24 agents have memory directories. Create any missing ones.

**Build effort:** Low. SKILL.md edits only — no new code.
**Status:** Complete (S85). All 22 agents have output directory sections in SKILL.md. All 24 agent memory directories have MEMORY.md files.

---

## Phase 20: Public Tribune — WordPress + Claude

Source: S80 research (2026-03-05). WordPress AI plugins (Search Engine Journal, Mar 4).

**Why this is a phase:** The Bay Tribune is a newspaper. Newspapers have public websites. WordPress 7.0 (April 2026) ships with a native AI Client SDK that supports Claude's extended thinking and function calling. That means a WordPress site can call our dashboard API — search editions, query civic documents, pull initiative status — through Claude function calling, making the full simulation accessible to readers.

### 20.1 WordPress Site Setup
**What:** Deploy a WordPress instance as the public-facing Bay Tribune website. Edition archive, searchable articles, civic database, initiative tracker — all served through a theme that looks like a regional newspaper.
**How:** WordPress on the existing DigitalOcean droplet (or a separate $6/mo droplet). Install the official Anthropic Claude AI Provider plugin. Configure function calling to hit dashboard API endpoints.
**Depends on:** Phase 9 (Docker) would make this trivial — WordPress is a standard compose service. Can also deploy standalone.
**Status:** Not started. WordPress 7.0 SDK ships April 2026 — evaluate after release.

### 20.2 Claude Function Calling → Dashboard API
**What:** Wire the Claude WordPress plugin to call our dashboard API endpoints as function tools. Reader asks "what's the status of the Stabilization Fund?" → Claude calls `/api/initiatives` → returns current tracker data in conversational form.
**How:** Define function schemas matching existing API endpoints (`/api/search`, `/api/initiatives`, `/api/civic-documents`, `/api/citizen-coverage/:name`). Claude plugin handles the routing.
**Depends on:** 20.1 (WordPress deployed), dashboard running and accessible to the WordPress server.
**Status:** Not started.

---

## Phase 21: Local Model Pipeline (The Llama Path)

Source: S80 research (2026-03-05). Qwen 3.5 9B (LM Studio), Ollama + Qwen 3 RAG (freeCodeCamp), LLMs-from-Scratch Qwen 3.5 architecture (Raschka).

**Why this is a phase:** Mike wants GodWorld to eventually run on local models for cost reduction and independence. The research stack is maturing — Qwen 3.5 9B offers 262K context at 9B params, LM Studio makes it zero-config on any platform, Ollama provides a runtime for RAG pipelines. The path: lighter agents (Lori, Rhea fast-pass, letters desk) run on local models, Claude handles heavy editorial and engine work. Mixed-model pipeline, same architecture.

### 21.1 LM Studio / Ollama Setup
**What:** Install LM Studio or Ollama on a development machine. Download Qwen 3.5 9B (or a Llama equivalent when available). Verify the OpenAI-compatible API endpoint works.
**How:** `brew install lmstudio` or `curl -fsSL https://ollama.com/install.sh | sh`. Pull model. Test with `curl http://localhost:1234/v1/chat/completions`.
**Hardware:** 8GB+ VRAM for 9B model. Apple Silicon M-series or NVIDIA GPU.
**Status:** Not started. Research phase — evaluate model quality first.

### 21.2 Local RAG over Canon Archive
**What:** Build a local RAG pipeline over the 378-file canon archive. ChromaDB for vector storage, nomic-embed-text for embeddings, retrieval-augmented generation for desk agent queries.
**Why:** Desk agents currently rely on Supermemory for deep canon retrieval. A local RAG system gives instant retrieval without API calls — useful for offline development, cost reduction, and faster iteration.
**How:** Ollama + LangChain + ChromaDB. Ingest `output/drive-files/` (378 files) + `output/city-civic-database/` (22 civic docs). Chunk at 1000 chars with 200 overlap. Expose as MCP tool or local API.
**Depends on:** 21.1 (runtime installed).
**Status:** Not started.

### 21.3 Mixed-Model Agent Pipeline
**What:** Route lighter agents to local models while keeping heavy editorial work on Claude. Lori (city clerk, Haiku-class), Rhea fast-pass (verification, structured checks), letters desk (citizen voices from templates) — these are candidates for local model execution.
**Why:** Reduces API cost per edition. Enables more frequent cycle runs. Moves toward the autonomous pipeline (12.3) without scaling API spend linearly.
**How:** MCP tool server or OpenAI-compatible proxy that routes by agent name. Claude Code orchestrator dispatches to the right model. Docker Compose (Phase 9.1) makes this a service definition.
**Depends on:** 21.1 (model running), 21.2 (RAG for context), quality testing against Claude baseline.
**Status:** Not started. Long-term goal — build incrementally.

---

## Phase 23: Cross-AI Feedback Integration

Source: Session 82 (2026-03-06). Reviews from Gemini, GPT, Code Copilot, and GROK — four external AIs that audited published editions, agent SKILL files, engine code, and character depth. All four converged on the same five systemic gaps. This phase addresses them.

**The five problems every AI found independently:**
1. No character feedback loop — editions generate rich character depth that never feeds back to citizen data
2. No entity registry — proper nouns drift across desks and cycles (names, roles, affiliations)
3. Fabricated numbers — agents produce precise statistics with no packet source
4. No provenance enforcement — no structured way to verify claims after generation
5. Cross-desk overlap — domains bleed without explicit routing rules

### 23.1 Newsroom Base Patch — Evidence Block + Stats Gating

**What:** Add an Evidence Block requirement to every desk SKILL.md. After each article/letter, agents append a structured claim list with types (FACT/OBS/INFER/QUOTE) and sources. Add a Stats Gating Rule: any prose containing numbers or "reported/confirmed/logged" must be FACT(engine) or FACT(record) with a source — otherwise rewrite without numbers as OBS/INFER. Add Anonymous Source Policy to desks that were missing it (sports, culture, business, chicago).
**Impact:** Prevents ~70% of fabricated number problems. Gives Rhea pre-parsed claims for verification.
**Effort:** Low — SKILL.md text edits only.
**Status:** ✅ Complete (Session 82). All 8 desk SKILLs patched.

### 23.2 Entity Registry + Rhea Claims Table

**What (partial):** Add Business_Ledger reference to business-desk SKILL. Add Claims Table output format to Rhea for CRITICAL errors. Add Evidence Block Verification check (Check 20) and Cross-Edition Drift Check (Check 21) to Rhea.
**Full entity registry** (future): Build a canonical proper noun registry (`data/entity-registry.json`) that Rhea and desk agents reference — preventing name/role/affiliation drift across cycles.
**Impact:** Claims Table gives Mags a structured error format. Drift check catches cross-edition inconsistency.
**Effort:** Low (partial, done) / Medium (full registry).
**Status:** Partial ✅ (Session 82). Rhea checks added. Full registry not yet built.

### 23.3 Cross-Desk Routing — Domain Ownership Tables

**What:** Add a Domain Ownership section to every desk SKILL.md with an explicit table of which desk owns which domain. Agents know where to route stories that cross boundaries.
**Impact:** Eliminates duplicate canon from overlapping coverage. Clarifies gray areas (player at a council vote = civic desk, not sports).
**Effort:** Low — SKILL.md text edits only.
**Status:** ✅ Complete (Session 82). All 8 desk SKILLs patched.

### 23.4 Cycle Review Framework ✓ (S83)

**What:** `/cycle-review` skill built. 3-pass post-Rhea editorial quality gate. Pass 1: structural (article lengths, Names Index completeness, headline quality, section inventory). Pass 2: factual (defers to Rhea — reads her report if available). Pass 3: editorial (voice consistency per reporter, genre discipline, sentence variety, emotional range, opening/closing quality). Letter grades A-F with PUBLISH/REVISE/HOLD recommendation.
**Source:** GPT's "Cycle Review Framework v1.0" document. Saved: `data/cross-ai-feedback/`.
**File:** `.claude/skills/cycle-review/SKILL.md`
**Status:** Complete. S83.

### 23.5 Character Feedback Loop ✓ (S83)

**What:** `scripts/enrichCitizenProfiles.js` v1.0 — scans published editions, extracts citizen appearances (quotes, actions, stakes) via Names Index, and writes `[EXX]` tagged enrichment entries to LifeHistory on Simulation_Ledger.
**How it works:**
1. Parses edition files from `editions/` directory, splits by `##` section headers
2. Extracts citizens from Names Index at end of each article (smart comma splitting, respects parentheses)
3. Strips title prefixes (Mayor, Chief, Dr., etc.) for ledger matching
4. Paragraph-level quote attribution — only matches quotes in paragraphs containing the citizen's name
5. Writes `[EXX] Quoted: "..."` / `[EXX] Referenced: ...` / `[EXX] Appeared (role)` to LifeHistory
6. Idempotent — checks for existing `[EXX]` tags before writing
7. `compressLifeHistory.js` picks up via existing `Quoted` trait tag in TAG_TRAIT_MAP
**CLI:** `--edition N` (specific), `--all` (batch), `--dry-run` (preview)
**Result:** 161 citizens enriched across E78–E86 in batch run. Verified on live sheet.
**Status:** Complete. S83.

### 23.6 Jax Caldera Voice Upgrade

**What:** Merge Code Copilot's specific voice rules into the freelance-firebrand SKILL.md. Copilot's Jax spec had sharper constraints on opening locations, question density, and attribution patterns than our existing file.
**Source:** Code Copilot's "Jax Caldera — Freelance Accountability Writer" spec.
**Effort:** Low — SKILL.md merge.
**Status:** Not started.

### 23.7 OakTown Echo — Rival Newsroom ✓ (S83)

**What:** 8 OakTown Echo journalists registered as Tier-2 citizens (POP-00773 through POP-00780). Jada Reyes (EIC), Malik Hayes (investigator), Sofia Alvarez (civic), Kwame Ellis (columnist), Rico Valdez (sports), Jamal "J-Rock" Thompson (culture), Nia Patel (economics), Diego Morales (photographer). All ClockMode GAME, MED flagged. First Echo article (Kwame Ellis op-ed on Phase II) already exists in Drive.
**Source:** GROK's "OakTown Echo Roster" document + op-ed. Saved locally: `data/cross-ai-feedback/oaktown-echo-roster.txt`, `data/cross-ai-feedback/oaktown-echo-oped-c86.txt`.
**Census:** 659 → 667 citizens.
**Status:** Complete. S83.

### 23.8 Bond Engine Bug Fixes ✓ (S83)

**What:** Fix 4 real bugs found by Code Copilot in bondPersistence.js, seedRelationBondsv1.js, and runRelationshipEngine.js:
1. POPID vs name lookup mismatch — seeder looked for `Name` column that doesn't exist in ledger. Fixed: reads `First`/`Last`, composes full name.
2. Header collision guard too narrow — only checked exact case match. Fixed: case-insensitive, added `action`/`changetype` checks.
3. Full replace can wipe bonds — empty ctx array would overwrite sheet. Fixed: skip save if ctx has 0 bonds but sheet has rows.
4. Inconsistent ID normalization — some paths normalized, some didn't. Fixed: all lookup functions normalize to trimmed uppercase.
**Source:** Code Copilot's bond engine audit documents.
**Files changed:** bondPersistence.js (v2.3→v2.4), seedRelationBondsv1.js (v1.2→v1.3), runRelationshipEngine.js (getCitizenBonds_ normalized).
**ENGINE_MAP.md updated** with fix summary table.

### 23.9 Story Seeds Engine v3.4 — No Action Needed ✓ (S83)

**What:** Compared Code Copilot's v3.4 against our v3.9. Our version is 5 iterations ahead — v3.4 is a strict subset with zero features we lack. We have citizen matching (v3.7), storyline tracker integration (v3.8), theme-aware journalist matching (v3.9), crime metrics (v3.6), and UI rendering (v3.5) that v3.4 doesn't. Only difference is punchier seed text with a "subversive" editorial voice — could cherry-pick text strings if desired.
**Verdict:** Keep current v3.9. No code changes.
**Source:** Code Copilot's "Story Seeds Engine v3.4" document. Saved: `data/cross-ai-feedback/`.
**Status:** Closed. S83.

---

## Phase 24: Citizen Life Engine — NOT STARTED

**Created:** Session 84 (2026-03-07)
**Problem:** Tier 1-2 citizens (main characters) have almost no personality data on the Simulation_Ledger. Tier 3-4 citizens are fully coded with trait profiles and life events, but main characters are flat. Life events are generic texture ("visited cafe") with no connection to who the citizen actually is. Evening media, arcs, and neighborhood context don't influence what happens to people. Citizens only live once a week during cycle runs.

**Goal:** Rich, context-aware life histories for all citizens, with main characters getting the deepest treatment. Citizens should feel like they live in their neighborhood, earn their salary, and are affected by what's happening around them.

### 24.1 MEDIA Clock Mode

**What:** Fourth clock mode alongside ENGINE, GAME, CIVIC. For journalists, media figures, cultural personalities. Health YES, life history YES, aging YES. Career engine NO, migration NO. Media-specific event generator (story coverage, editorial decisions, source relationships, journalism industry events).
**Citizens:** 8 OakTown Echo journalists (POP-00773–00780) currently GAME+MED. Scan for other media-flagged citizens.
**Pattern:** Follow Phase 22.1 CIVIC implementation — new `generateMediaModeEvents_` function at Phase 5, ClockMode flip on ledger.
**Batch job:** `msgbatch_01YDFk2WVUo7ERDysdjsj3Zs` — full spec pending.
**Status:** Not started.

### 24.2 Tier 1-2 Event Cap Increase

**What:** Audit and raise event caps across ALL generators (micro-events, career, health, household, bonds, generational, civic) so tier 1-2 citizens accumulate 3-5x more life events than tier 3-4. Main characters should have the richest histories.
**Context:** Micro-events already changed S84 (hard exclusion → 0.8%/1.5% probability). But the broader life history system has caps that still suppress tier 1-2 event volume.
**Batch job:** `msgbatch_0142zEiRRZn2sVW4aYQJfUKf` — cap audit pending.
**Status:** Not started.

### 24.3 Context-Aware Life Events

**What:** Life events should consider neighborhood, salary, career, and trait profile to determine outcomes. A Fruitvale teacher's "evening out" is different from a Jack London tech exec's. Arc tension and evening media (restaurant openings, nightlife volume, cultural events) should influence what happens to citizens in those neighborhoods.
**Depends on:** 24.2 (caps), Phase 22.2 (arc engine fix — arcs stuck at "early"), evening context in desk packets (wired S84 in buildDeskPackets v2.2).
**Batch job:** `msgbatch_01VL2oP5wLkVF1Xsqt8Ln7LD` — input mapping pending.
**Status:** Not started.

### 24.4 Daily Simulation Trigger

**What:** Run the Simulation_Ledger daily instead of weekly. Citizens live in real time — health changes, life events, neighborhood shifts happen every day, not once a cycle. This is the biggest piece and requires 24.1–24.3 to be solid first.
**Why last:** Running empty cycles faster doesn't help. The life events need to be rich and context-aware before we increase frequency. Also requires infrastructure work (cron/scheduler, error recovery, output management).
**Depends on:** 24.1, 24.2, 24.3 all complete. Phase 22.2 (arc engine) resolved.
**Status:** Not started. Build after 24.1–24.3 true-up.

---

## Phase 25: Storage Strategy — Deduplicate Across 4 Layers — NOT STARTED

**Created:** Session 85 (2026-03-08)
**Problem:** Data is dumped everywhere with no strategy. Local disk (24GB, 70% full), Google Drive (200MB available), GitHub, and Supermemory all hold overlapping copies of the same content. Daily backups were keeping 7 copies locally (350MB) while also uploading to Drive AND having weekly DO snapshots — triple redundancy with no purpose. Debug logs accumulate silently. Browser caches for monthly tools eat 1.2GB. The disk fills, the health alerts fire, and nobody knows what lives where or why.

**Goal:** One clear rule for each data type: where it lives, why, and what gets cleaned.

**Proposed storage map:**

| Data Type | Primary Home | Why | Cleanup Rule |
|-----------|-------------|-----|-------------|
| Code + docs + config | GitHub | Version control, recovery | n/a |
| Editions (.txt) | GitHub + Google Drive | Git for history, Drive for sharing/PDF archive | n/a |
| Photos + PDFs | Google Drive only | Large binaries, no git value | Delete local after upload |
| Podcast MP3s | Google Drive only | Large binaries, never referenced by code | Delete local after upload |
| Daily backups (.tar.gz) | Local (2 copies) + Drive | Belt and suspenders, DO snapshots are the third layer | Keep 2 local (was 7) |
| Civic documents | GitHub + Drive | Git for code access, Drive for civic database sharing | n/a |
| Debug logs | Nowhere | Zero value after session ends | Auto-delete on rotation |
| Browser caches (Playwright/Puppeteer) | Local only | Rebuild on demand | Consider clearing after PDF gen |
| Claude-mem database | Local + backup tarball | Critical for cross-session memory | Backed up daily |
| Agent memory | GitHub | Version controlled, small files | n/a |
| Discord conversation logs | Local + backup tarball | Bot reads them for context | Backed up daily |
| Supermemory | Cloud | RAG search for bot + future WordPress | Edition text only |

**Tasks:**
- 25.0 Quick wins (S85): backup rotation 7 to 2 days, data/audio/ gitignored, debug + UV cache cleared (~900MB freed)
- 25.1 Audit what's on Google Drive vs what's local vs what's in git — identify pure duplicates
- 25.2 Write a post-upload cleanup hook for photos/PDFs/podcasts (delete local after confirmed Drive upload)
- 25.3 Evaluate browser cache strategy — clear Playwright/Puppeteer after use? Or accept the 1.2GB cost for speed?
- 25.4 Review Supermemory contents — is it worth the cost? What's actually in there vs what the bot uses?
- 25.5 Document the final storage map in a reference doc

**Requires:** Dedicated session. Needs Drive audit, Supermemory audit, disk inventory, and decisions about what to cut.
**Status:** Quick wins done (S85). Full audit not started.

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
- **CMUX Terminal** — Native macOS terminal for AI agents (Ghostty-based). Split panes, embedded browser, per-pane model switching (Haiku for cheap tasks), notification hooks. Purpose-built for multi-agent orchestration. macOS only. Monitor for Linux support or adopt when Mike has macOS dev machine.
- **Claude Code Voice Mode** — Hands-free coding via voice. Could speed up edition reviews, debugging, journal dictation. Thin on details at launch (Mar 2026). Monitor for maturity.
- **Claude Memory Import** — Transfers history from ChatGPT/Gemini/Copilot. Not directly useful now but the structured export/import pattern is interesting for agent context portability.
- **Auto Mode (Mar 12, 2026)** — New permissions mode: Claude handles permission decisions during coding sessions. Safer alternative to `--dangerously-skip-permissions`. Slightly higher token usage. Enable with `claude --enable-auto-mode`. Relevant for long edition runs and autonomous cycle execution (12.3). Source: Anthropic email Mar 4, 2026.

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
- **S80 Tech Reading (2026-03-05):** The Verge (Claude memory import), freeCodeCamp (MCP server Python, local AI RAG), Search Engine Journal (WordPress AI plugins), KDnuggets (Docker AI agent builders), GitHub rasbt/LLMs-from-scratch (Qwen 3.5), TechCrunch (Claude Code voice mode), Geeky Gadgets (nested Claude tmux), YouTube (CMUX terminal), LM Studio (Qwen 3.5 9B)
