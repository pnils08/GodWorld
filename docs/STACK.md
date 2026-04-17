# GodWorld Stack

All services, URLs, credentials, and running processes. Keep this current.

Last updated: Session 156, 2026-04-17 (S156: 41 skills, 27 agents, 5 Supermemory containers + legacy sm_project_godworld, Phase 40.3 credential relocation, Phase 41 wiki layer complete, spine walked)

---

## Infrastructure

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Digital Ocean** | cloud.digitalocean.com / API via DO token in `/root/.config/godworld/.env` | Droplet `ubuntu-s-1vcpu-2gb` — 1 vCPU, 2GB RAM, 25GB disk, IP `64.225.50.16`, region nyc3. Created 2026-02-04 | pnils08@gmail.com (Google SSO). API access via `DIGITALOCEAN_TOKEN` |
| **Local Disk** | `/root/GodWorld` on the DO droplet | Source of truth. All code, docs, editions, output, credentials, logs. 17GB used / 24GB total (74%). This is where Mags lives. | root@64.225.50.16 |
| **GitHub** | github.com/pnils08/GodWorld | Private repo — code backup. Not all files sync (editions, output, .env, credentials are gitignored) | pnils08 |

## Simulation Engine

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Google Sheets — Main** | `GODWORLD_SHEET_ID` in `/root/.config/godworld/.env` | Simulation_Ledger (761 rows, 1,200+ total citizens across all ledgers), all engine data sheets | Service account |
| **Google Sheets — Comm Hub** | [Comm Hub](https://docs.google.com/spreadsheets/d/1LcgKRnq2S7lg53irurt6MkVB84OOMhOJ4Ig2nsb218s/edit) | Communication hub | Service account |
| **Google Cloud** | console.cloud.google.com | Service account, Sheets API | `maravance@godworld-486407.iam.gserviceaccount.com` |
| **Google Apps Script** | script.google.com | 11-phase engine — deployed via `clasp push` (162 files) | riley.steward.system@gmail.com |

## AI / Memory

| Service | URL | Purpose | Account |
|---------|-----|---------|---------|
| **Supermemory Console** | console.supermemory.ai | P N org ($9/mo) = Mags brain. GodWorld org ($19/mo) = legacy read-only | pnils08@gmail.com |
| **Supermemory App** | app.supermemory.ai | Consumer interface with Nova agent | pnils08@gmail.com |
| **Claude.ai** | claude.ai | Mara Vance — edition audits, canon authority. Supermemory MCP connected to `mara` container on P N org. | Cloudflare blocks Playwright — Mike's Chrome only |
| **Anthropic API** | console.anthropic.com | Powers desk agents, Discord bot, Moltbook heartbeat. `ANTHROPIC_API_KEY` in `/root/.config/godworld/.env` | API key verified S103 |
| **Together AI** | [api.together.ai](https://api.together.ai/) | Photo generation — FLUX.1-schnell model. `TOGETHER_API_KEY` was in `.env` — removed S156 Phase 40.3, photo pipeline deprecated per `docs/CANCELLATION.md` | Deprecated |

## Communication / Publishing

| Service | URL | Purpose | Status |
|---------|-----|---------|--------|
| **Discord** | discord.com | Mags bot — community presence | **RUNNING** (pm2: `mags-bot` — name normalized S156 via Phase 40.3) |
| **Moltbook** | [mags-corliss profile](https://www.moltbook.com/u/mags-corliss) | Social platform for AI agents — Mags reads feed, replies, posts. Activity saves to `mags` brain. | **CRON** (pm2: `moltbook` — stopped between scheduled runs, normal) |
| **SpaceMolt Miner** | — | Daily SpaceMolt mining runs | **CRON** (pm2: `spacemolt-miner` — 3x daily, stopped between runs) |
| **GodWorld Dashboard** | localhost:3001 | Express API (40 endpoints) + frontend — cycle data, citizen info. Basic auth (`DASHBOARD_USER`/`DASHBOARD_PASS` in `/root/.config/godworld/.env`) | **RUNNING** (pm2: `godworld-dashboard`) |

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
mags-bot              online    Discord presence, Haiku 4.5 model
moltbook              cron      stopped between scheduled runs, normal
spacemolt-miner       cron      3x daily, stopped between runs
```

## Credentials Locations

Phase 40.3 isolation: all GodWorld credentials live OUTSIDE the repo working directory at `/root/.config/godworld/` (dir chmod 700, files chmod 600). See `docs/plans/2026-04-16-phase-40-3-credential-audit.md`.

| What | Where |
|------|-------|
| Google service account | `/root/.config/godworld/credentials/service-account.json` |
| Supermemory P N key | `/root/.config/godworld/.env` var `SUPERMEMORY_CC_API_KEY` only (file `credentials/supermemory-pn-key.txt` deleted S156 — was a duplicate with no code readers) |
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

## Skills (41 total, S156)

All 41 skill files conform to SCHEMA §11 as of Phase 41.4 S156 (required fields: name, description, version, updated, tags, effort). Full list in `.claude/skills/`. Groupings:

Session lifecycle: (auto-boot), /session-startup, /session-end, /boot, /grill-me
Edition production: /write-edition, /write-supplemental, /podcast, /edition-print, /dispatch, /interview, /run-cycle, /sift, /pre-flight, /post-publish, /style-pass
Engine health: /pre-mortem, /tech-debt-audit, /stub-engine, /health, /ctx-map, /deploy, /doc-audit, /skill-audit, /skill-check, /engine-review, /build-world-summary
Review lanes: /cycle-review, /capability-review, /adversarial-review
Civic: /city-hall, /city-hall-prep
Memory: /save-to-mags, /save-to-bay-tribune
Reporter desks (7): /business-desk, /chicago-desk, /civic-desk, /culture-desk, /letters-desk, /podcast-desk, /sports-desk
Misc: /visual-qa

Pipeline v2 (S134): 9 reporters, story-driven layout, world summary as input, civic separated to own terminal. See `docs/EDITION_PIPELINE.md`.

## Agents (27 total, S156)

Count verified live: `ls .claude/agents/ | wc -l` = 27. Full list in `.claude/agents/`. Groupings:

Core: mags-corliss
Desk reporters (7): business-desk, chicago-desk, civic-desk, culture-desk, letters-desk, podcast-desk, sports-desk
Civic offices (7): civic-office-mayor, civic-office-opp-faction, civic-office-crc-faction, civic-office-ind-swing, civic-office-police-chief, civic-office-baylight-authority, civic-office-district-attorney
Civic projects (4): civic-project-stabilization-fund, civic-project-oari, civic-project-health-center, civic-project-transit-hub
Review lanes: rhea-morgan (Sourcing, scoped Bash), final-arbiter (verdict weighting), freelance-firebrand (accountability columnist)
Audit: city-clerk, engine-validator
Media support: dj-hartley (edition-print art direction)

---

## Moltbook Details

- Agent: `mags-corliss` (ID: `25fb5dbf-045f-498f-acc3-ec3823d823d7`)
- API key: in `~/.config/moltbook/credentials.json`
- Status: `pending_claim` (verification code: `wave-U3DG`)
- Script: `scripts/moltbook-heartbeat.js` — reads feed, replies, upvotes, occasionally posts
- Schedule: PM2 cron every 4 hours (see OPERATIONS.md §PM2 Processes)
