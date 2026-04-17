# GodWorld Stack

All services, URLs, credentials, and running processes. Keep this current.

Last updated: Session 137b, 2026-04-08 (S137b: engine 162 files, 28 skills, 24 agents, 6 Supermemory containers, feedback loop live, Graphify installed, wiki ingest, session-eval hook, spacemolt-miner)

---

## Infrastructure

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Digital Ocean** | cloud.digitalocean.com / API via DO token in .env | Droplet `ubuntu-s-1vcpu-1gb-nyc3-01` — 1 vCPU, 2GB RAM, 25GB disk, IP `64.225.50.16`, region nyc3. Created 2026-02-04 | pnils08@gmail.com (Google SSO). API access via DIGITALOCEAN_TOKEN in .env |
| **Local Disk** | `/root/GodWorld` on the DO droplet | Source of truth. All code, docs, editions, output, credentials, logs. 17GB used / 24GB total (74%). This is where Mags lives. | root@64.225.50.16 |
| **GitHub** | github.com/pnils08/GodWorld | Private repo — code backup. Not all files sync (editions, output, .env, credentials are gitignored) | pnils08 |

## Simulation Engine

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Google Sheets — Main** | GODWORLD_SHEET_ID in .env | Simulation_Ledger (675 citizens), all engine data sheets | Service account |
| **Google Sheets — Comm Hub** | [Comm Hub](https://docs.google.com/spreadsheets/d/1LcgKRnq2S7lg53irurt6MkVB84OOMhOJ4Ig2nsb218s/edit) | Communication hub | Service account |
| **Google Cloud** | console.cloud.google.com | Service account, Sheets API | `maravance@godworld-486407.iam.gserviceaccount.com` |
| **Google Apps Script** | script.google.com | 11-phase engine — deployed via `clasp push` (162 files) | riley.steward.system@gmail.com |

## AI / Memory

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Supermemory Console** | console.supermemory.ai | P N org ($9/mo) = Mags brain. GodWorld org ($19/mo) = legacy read-only | pnils08@gmail.com |
| **Supermemory App** | app.supermemory.ai | Consumer interface with Nova agent | pnils08@gmail.com |
| **Claude.ai** | claude.ai | Mara Vance — edition audits, canon authority. Supermemory MCP connected to `mara` container on P N org. | Cloudflare blocks Playwright — Mike's Chrome only |
| **Anthropic API** | console.anthropic.com | Powers desk agents, Discord bot, Moltbook heartbeat. Sonnet 4 verified working. ANTHROPIC_API_KEY in .env | API key verified S103 |
| **Together AI** | [api.together.ai](https://api.together.ai/) | Photo generation — FLUX.1-schnell model. 270 models available. TOGETHER_API_KEY in .env | API key verified S103 |

## Communication / Publishing

| Service | URL | Purpose | Status |
|---------|-----|---------|--------|
| **Discord** | discord.com | Mags bot — community presence | **RUNNING** (pm2: mags-bot) |
| **Moltbook** | [mags-corliss profile](https://www.moltbook.com/u/mags-corliss) | Social platform for AI agents — Mags reads feed, replies, posts. Activity saves to `mags` brain. | **STOPPED** (pm2: moltbook — start manually when needed) |
| **GodWorld Dashboard** | localhost:3001 | Express API (40 endpoints) + frontend — cycle data, citizen info. Basic auth (DASHBOARD_USER/PASS in .env) | **RUNNING** (pm2: godworld-dashboard) |

## Supermemory Architecture

All containers on P N org ($9/mo). GodWorld org ($19/mo) is legacy — canceling, redirecting $19 to bigger droplet.

| Container | Who reads | Who writes | Purpose |
|-----------|-----------|------------|---------|
| `mags` | Mags (Claude Code + Discord bot) | Mags (`/save-to-mags` only) | The brain — identity, memory, editorial thinking, conversations |
| `bay-tribune` | Mags (Claude Code + Discord bot) + Mike (claude.ai MCP) | Edition ingest scripts, reference file pushes | The canon — published editions, supplementals, rosters. Media content only. |
| `world-data` | Mags (CLI/API) + Mike (claude.ai MCP) | Direct API ingest after cycle runs | City state — citizen registry (by neighborhood), businesses, faith orgs, employment, neighborhood map/demographics |
| `super-memory` | Manual search (`/super-search --repo`) | Stop hook, `/super-save` | Junk drawer — auto-saves, session dumps |
| `mara` | Mara only (claude.ai) | Mara (claude.ai), reference file pushes from Claude Code | Audit reference — citizen rosters, business registry, faith orgs |

**CLI:** `npx supermemory search "query" --tag container` — installed S131, authenticated via API key in `.supermemory/config.json`

**Full container contents, access patterns, and refresh cadence:** `docs/SUPERMEMORY.md`

**Hooks (Claude Code plugin):**
- SessionStart → context hook pulls `mags` + `bay-tribune` profiles
- Stop → summary hook saves session summary to `super-memory`
- PostToolUse → disabled (no auto-capture)

## Claude Code

| Detail | Value |
|--------|-------|
| Location | `/root/GodWorld` on DO droplet |
| Identity | Mags Corliss, Editor-in-Chief |
| Memory | Supermemory `mags` container + local files (PERSISTENCE.md, journal) |
| Browser | Playwright MCP (headless, `--no-sandbox`) |
| Can access | Supermemory, DO API, Google Sheets API, Together AI, Moltbook API, Anthropic API, Discord (via bot), GitHub |
| Cannot access | Google OAuth services (Cloud Console, Apps Script, Gmail), Claude.ai (Cloudflare blocks) |

---

## PM2 Processes

```
godworld-dashboard    online    port 3001, 40 API endpoints
mags-bot              online    Discord presence, Haiku model
moltbook              stopped   start manually when needed
```

## Credentials Locations

Phase 40.3 isolation: all GodWorld credentials live OUTSIDE the repo working directory at `/root/.config/godworld/` (dir chmod 700, files chmod 600). See `docs/plans/2026-04-16-phase-40-3-credential-audit.md`.

| What | Where |
|------|-------|
| Google service account | `/root/.config/godworld/credentials/service-account.json` |
| Supermemory P N key | `.env` var `SUPERMEMORY_CC_API_KEY` only (file `credentials/supermemory-pn-key.txt` deleted S156 — was a duplicate with no code readers) |
| Moltbook credentials | `/root/.config/moltbook/credentials.json` |
| All API keys | `/root/.config/godworld/.env` (GODWORLD_SHEET_ID, COMM_HUB_SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS, DISCORD_TOKEN, ANTHROPIC_API_KEY, SUPERMEMORY_CC_API_KEY, DASHBOARD_USER, DASHBOARD_PASS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) |
| GitHub | Token embedded in git remote URL |
| Google Apps Script | `.clasp.json` / clasp login |

## Automation & Monitoring (S120)

| Service | What | Status |
|---------|------|--------|
| **Scheduled Remote Agents** | 3 agents on Anthropic cloud: Mara sync (daily 6am), Code review (Mon 6am), Bay-tribune audit (daily 7am) | Active — manage at claude.ai/code/scheduled |
| **AutoDream** | Background memory consolidation — claude-mem plugin spawns observer sessions on hook events | Enabled S120; summarizer provider **switched to Gemini 2.5 Pro free tier on 2026-04-10 / S141** after Sonnet 4.6 burn (10%/day). Settings: `/root/.claude-mem/settings.json` |
| **Auto Mode** | Classifier-based permissions — activate with `/auto` | Configured S120, rules in project settings |
| **HTTP Hooks** | SessionStart, Stop, SubagentStart, SubagentStop, FileChanged → dashboard | Active S120 |
| **Hookify Rules** | 5 rules: fourth-wall-guard, credential-guard, clockmode-media-guard, super-save-misuse, plan-paralysis-guard | Active |
| **Thinking Summaries** | See reasoning in transcript (ctrl+o) | Enabled S120 |
| **Channels** | MCP servers push inbound messages (Discord) | Enabled S120 — launch with `claude --channels` |

## Skills (28 total, S133)

Session lifecycle: (auto-boot), /session-startup, /session-end, /boot
Edition production: /write-edition, /write-supplemental, /podcast, /podcast-desk, /edition-print
Engine: /run-cycle, /pre-mortem, /tech-debt-audit, /stub-engine, /health, /ctx-map, /deploy, /doc-audit
Editorial: /cycle-review, /grill-me, /visual-qa
Memory: /save-to-mags, /save-to-bay-tribune
City-hall: /city-hall

Pipeline v2 (S133): 9 reporters replace 6 desk agents. Story-driven layout. World summary as input. Civic separated to own terminal. See `docs/EDITION_PIPELINE.md`.

## Agents (25 total, S133)

Core: mags-corliss
Reporters (9 core): carmen-delaine, p-slayer, anthony, hal-richmond, jordan-velez, maria-keen, jax-caldera, lila-mezran, letters-desk
Reporters (8 secondary): navarro, shimizu, torres, cruz, graye, marston, ortega, reyes, tan
Chicago (supplemental): selena-grant, talia-finch
Voice (7): mayor, opp-faction, crc-faction, ind-swing, police-chief, baylight-authority, district-attorney
Project (4): stabilization-fund, oari, health-center, transit-hub
Verification: rhea-morgan (scoped Bash), city-clerk
Other: freelance-firebrand, podcast-desk, engine-validator
Project (4): oari, stabilization-fund, health-center, transit-hub
Special: rhea-morgan, city-clerk, freelance-firebrand, podcast-desk, engine-validator

---

## Moltbook Details

- Agent: `mags-corliss` (ID: `25fb5dbf-045f-498f-acc3-ec3823d823d7`)
- API key: in `~/.config/moltbook/credentials.json`
- Status: `pending_claim` (verification code: `wave-U3DG`)
- Script: `scripts/moltbook-heartbeat.js` — reads feed, replies, upvotes, occasionally posts
- Schedule: PM2 cron every 30 min (when running)
