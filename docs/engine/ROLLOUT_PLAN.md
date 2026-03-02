# GodWorld — Pipeline Enhancement Rollout Plan

**Created:** Session 55 (2026-02-21)
**Source:** Tech reading sessions S50 + S55 + S60 + S66
**Status:** Active
**Last Updated:** Session 72 (2026-03-02) — Phase 17 Data Integrity Cleanup complete

**Completed phases are archived in `ROLLOUT_ARCHIVE.md`.** That file is on-demand — read it only when you need build context, implementation details, or history for a completed phase. It is not loaded at session start.

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

### 6.3 Pre-Write Agent Guardian ✓ (S63)
`queryErrata.js` + all 6 desk agents updated with guardian checks. Details in ROLLOUT_ARCHIVE.md.

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

### 7.1 Modular Rules ✓ (S63)
4 path-scoped rule files in `.claude/rules/`. Details in ROLLOUT_ARCHIVE.md.

### 7.2 Dynamic Context Injection in Skills ✓ (S63)
Pre-loaded briefings in agent prompts. Details in ROLLOUT_ARCHIVE.md.

### 7.3 Desk Agent Permission Mode ✓ (S60)
All 8 agents use `permissionMode: dontAsk`. Details in ROLLOUT_ARCHIVE.md.

### 7.4 Official Persistent Agent Memory ✓ (S55)
5 agents with `memory: project`. Details in ROLLOUT_ARCHIVE.md.

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

### 8.1 UFW Firewall ✓ (S60)
SSH + 3001 only. Details in ROLLOUT_ARCHIVE.md.

### 8.1b Drive OAuth Refresh Token ✓ (S69)
Re-authorized with full `drive` scope (upgraded from `drive.file`). New refresh token saved to `.env`. Enables both Drive writes and `files.copy` for spreadsheet backups. New backup script: `scripts/backupSpreadsheet.js`.
**Still pending:** Rotate the client secret for `559534329568-an7vso0b0nnoij3eso8spj1e079suikq` in Google Cloud Console — it was accidentally pasted in chat.

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

### 12.6 Podcast Desk — Edition-to-Audio Pipeline ✓ (S67)
Full pipeline: agent → XML transcript → Podcastfy → audio. 3 show formats, permanent hosts. Details in ROLLOUT_ARCHIVE.md.

### 12.9 Rhea Fast-Pass Sampling ✓ (S69)
Fast mode added to Rhea's SKILL.md. Runs 7 of 19 checks (citizen names, votes, sports records, engine language, reporter accuracy, new citizen auth, mayor verification). Scores on Data Accuracy + Canon Compliance only (40-point scale). Full mode unchanged for final pre-publication pass.

### 12.7 Live Ledger Query Script ✓ (S67)
`queryLedger.js` — 6 query types, searches Sheets + 674 files. Details in ROLLOUT_ARCHIVE.md.

### 12.8 Initiative Implementation Tracking ✓ (S67)
4 tracking columns on Initiative_Tracker, wired into desk packets. Details in ROLLOUT_ARCHIVE.md.

---

## Phase 13: Simulation_Ledger Data Integrity Audit — COMPLETE (S68-S72)

**Tracking document:** `docs/engine/LEDGER_AUDIT.md` — all progress, decisions, and remaining work live there.

**Why this is a phase:** Every downstream system depends on the Simulation_Ledger being correct — desk packets, queryLedger.js, citizen lookups, age calculations, neighborhood assignments, economic parameters. Bad ledger data cascades everywhere. This audit makes the ledger trustworthy.

**Status:** COMPLETE. 658/658 citizens clean. Phase 13 core audit (S68), Phase 16 satellite consolidation (S71), Phase 17 data integrity cleanup (S72). 167 unique 2041 demographic voice roles. Role-to-economic mapping done (288 mappings, 100% coverage). Family linkages done (Corliss, Keane, Dillon). Chicago migration done. Tech debt 4/7 critical fixed. Remaining: 42 MLB player age review (sports universe, needs Mike), ~27 medium/low tech debt items. See LEDGER_AUDIT.md for full breakdown.

**Started:** Session 68 (2026-02-28)

---

## Phase 14: Economic Parameter Integration — ACTIVE

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

### 15.5 Engine Flavor Integration — DEFERRED
`generateGameModeMicroEvents.js` v1.3 upgrade (TraitProfile-weighted event pools, tier-specific city-life pools). `buildEveningFamous.js` v2.4 upgrade (Tier 1-2 player sightings from ctx.citizenLookup, season-aware weighting). Ship after data layer proves stable through 2-3 cycles. Both files are Apps Script (ES5 — no const/let/arrow functions).

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

**Final census: 658 citizens** (639 + 16 faith + 3 celebrity). Role mapping unchanged at 288 — all faith and celebrity roles already existed.

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
