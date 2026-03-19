# GodWorld Stack

All services, URLs, credentials, and running processes. Keep this current.

Last updated: Session 103, 2026-03-19

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
| **Google Apps Script** | script.google.com | 11-phase engine — deployed via `clasp push` (153 files) | riley.steward.system@gmail.com |

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
| **Discord** | discord.com | Mags bot — community presence | **RUNNING** (pm2: mags-discord-bot, 22h uptime) |
| **Moltbook** | [mags-corliss profile](https://www.moltbook.com/u/mags-corliss) | Social platform for AI agents — Mags reads feed, replies, posts. Activity saves to `mags` brain. | **RUNNING** (pm2: moltbook, every 30min) |
| **GodWorld Dashboard** | localhost:3001 | Express API + frontend — cycle data, citizen info. Basic auth (DASHBOARD_USER/PASS in .env) | **RUNNING** (pm2: godworld-dashboard, 5D uptime) |

## Supermemory Architecture

All containers on P N org ($9/mo). GodWorld org ($19/mo) is legacy read-only until canceled.

| Container | Who reads | Who writes | Purpose |
|-----------|-----------|------------|---------|
| `mags` | Mags (Claude Code + Discord bot) | Mags (Claude Code + Discord + Moltbook) | The brain — identity, memory, editorial thinking, conversations |
| `godworld` | Mags (Claude Code) | Mags (Claude Code), edition ingest scripts | Project knowledge — architecture, what's broken, editions |
| `mara` | Mara only (claude.ai) | Mara (claude.ai) | Private backup — planning, canon, audits. Nobody else reads this. |

**Hooks (Claude Code plugin):**
- SessionStart → context hook pulls `mags` + `godworld` profiles
- Stop → summary hook saves session summary to `mags`
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
godworld-dashboard    online    5D uptime     port 3001
mags-discord-bot      online    22h uptime    19 restarts
moltbook              online    heartbeat every 30min, saves to mags brain
```

## Credentials Locations

| What | Where |
|------|-------|
| Google service account | `credentials/service-account.json` |
| Supermemory P N key | `credentials/supermemory-pn-key.txt` |
| Moltbook credentials | `~/.config/moltbook/credentials.json` |
| All API keys | `.env` (GODWORLD_SHEET_ID, COMM_HUB_SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS, TOGETHER_API_KEY, DISCORD_TOKEN, ANTHROPIC_API_KEY, SUPERMEMORY_CC_API_KEY, DASHBOARD_USER, DASHBOARD_PASS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) |
| GitHub | Token embedded in git remote URL |
| Google Apps Script | `.clasp.json` / clasp login |

## Moltbook Details

- Agent: `mags-corliss` (ID: `25fb5dbf-045f-498f-acc3-ec3823d823d7`)
- API key: in `~/.config/moltbook/credentials.json`
- Status: `pending_claim` (verification code: `wave-U3DG`)
- Script: `scripts/moltbook-heartbeat.js` — reads feed, replies, upvotes, occasionally posts
- Schedule: PM2 cron every 30 min (when running)
