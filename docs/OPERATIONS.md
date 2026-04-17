# GodWorld Operations — Processes, Crons, Scheduled Tasks

**Droplet:** `ubuntu-s-1vcpu-2gb` | 1 vCPU, 2GB RAM, 25GB disk | $12/mo | nyc3
**IP:** 64.225.50.16 | **Access:** SSH as root, or `mags` command (tmux auto-wiring)

---

## PM2 Processes (Always Running)

| Process | Script | Purpose | Memory | Notes |
|---------|--------|---------|--------|-------|
| `godworld-dashboard` | `dashboard/server.js` | Express API + React frontend, port 3001 | ~50MB | Basic auth via `/root/.config/godworld/.env` |
| `mags-bot` | `scripts/mags-discord-bot.js` | Mags presence in Discord #mags-morning | ~50MB | Haiku 4.5, searches mags+bay-tribune containers. Renamed from `mags-discord-bot` S156 via Phase 40.3 ecosystem.config.js rewrite. |
| `moltbook` | `scripts/moltbook-heartbeat.js` | Moltbook social presence | ~35MB | Cron mode — shows "stopped" between runs, normal |
| `spacemolt-miner` | `scripts/spacemolt-miner.js` | SpaceMolt daily mining runs | ~35MB | Cron mode — 3x daily, shows "stopped" between runs |

**Common PM2 commands:**
```bash
pm2 list                    # Status of all processes
pm2 logs mags-bot           # Live bot logs
pm2 restart mags-bot        # Restart after code change
pm2 save                    # Persist process list for reboot survival
```

---

## Cron Schedule

All times in UTC. Server is UTC. Central time = UTC - 5 (CDT) or UTC - 6 (CST).

| Time (UTC) | CDT | Job | Script | Log |
|------------|-----|-----|--------|-----|
| `0 4 * * *` | 11 PM | Nightly Discord reflection | `scripts/discord-reflection.js` | `logs/discord-reflection.log` |
| `0 5 * * *` | 12 AM | Daily backup (tar.gz) | `scripts/backup.sh` | `logs/backup.log` |
| `0 */6 * * *` | Every 6h | Server health check | `scripts/server-health-check.sh` | `logs/health-check.log` |
| `0 3 * * 0` | Sun 10 PM | Weekly droplet snapshot | `scripts/snapshot-droplet.sh` | `logs/snapshot.log` |
| `0 4 * * 3` | Wed 11 PM | Weekly maintenance | `scripts/weekly-maintenance.sh` | `logs/weekly-maintenance.log` |

**Disabled:**
| Job | Script | Why |
|-----|--------|-----|
| Morning heartbeat (8 AM CST) | `scripts/daily-reflection.js` | Disabled — cron commented out to save API calls |

**Edit crontab:** `crontab -e`

---

## What Each Job Does

### Nightly Discord Reflection (11 PM CDT)
Reads today's Discord conversation log, reflects on it as Mags, appends a journal entry to `JOURNAL_RECENT.md`. Uses Anthropic API (Sonnet). Output goes to the journal — this is how Discord conversations become part of Mags' emotional continuity.

### Daily Backup (12 AM CDT)
Creates `godworld_backup_YYYY-MM-DD_HHMM.tar.gz` in `backups/`. Keeps last 2. Archive policy says older ones should go to Drive.

### Server Health Check (Every 6 Hours)
Checks: disk >80%, RAM <100MB, PM2 errors, PM2 restart counts >10, dashboard HTTP health. Sends Discord webhook alert on threshold breach.

### Weekly Droplet Snapshot (Sunday 10 PM CDT)
Full droplet snapshot via DigitalOcean API. Keeps 4 snapshots, rotates oldest. Cost: ~$0.50-1.00/month.

### Weekly Maintenance (Wednesday 11 PM CDT)
Checks: 11 engine directories exist, stale desk packets (14-day threshold), PM2 health, disk/memory, dashboard API. Discord webhook alert on issues.

---

## Health Checks

```bash
# Quick status
pm2 list
df -h /
free -m

# Dashboard
curl -s http://localhost:3001/api/health | python3 -m json.tool

# Discord bot
pm2 logs mags-bot --lines 10 --nostream

# Moltbook
pm2 logs moltbook --lines 10 --nostream

# Supermemory
curl -s -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY" https://api.supermemory.ai/v3/settings | head -c 200

# claude-mem worker
curl -s http://localhost:37777/health
```

---

## When Things Break

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Dashboard returns 502 | PM2 process crashed | `pm2 restart godworld-dashboard` |
| Bot not responding in Discord | PM2 process crashed or rate limited | `pm2 restart mags-bot`, check error log |
| Supermemory timeouts in bot log | API latency or outage | Graceful — bot falls back to local files. Wait it out. |
| Disk >80% | Session transcripts, claude-mem, backups | Run archive policy from DISK_MAP.md |
| `clasp push` fails | Auth expired | `clasp login` to re-authenticate |
| Cron not firing | PM2 dump stale after reboot | `pm2 save` then `pm2 startup` |
| Moltbook 404 errors | Stale post ID in state file | Remove dead ID from `logs/moltbook/.heartbeat-state.json` |

---

## Mobile Access

Mosh + tmux for phone sessions (Termius on iPhone):
```bash
mosh root@64.225.50.16    # Connect (survives signal drops)
mags                      # Creates/reattaches tmux session
```

Keep mobile sessions focused: file edits, research, planning, ledger checks. Save full pipelines for the laptop.

---

## Scheduled Remote Agents (Anthropic Cloud)

3 agents running on Anthropic's cloud infrastructure. Each spawns an isolated session with a fresh git checkout. Manage at https://claude.ai/code/scheduled.

| Agent | Schedule | MCP | What it does |
|-------|----------|-----|-------------|
| Daily Mara Canon Sync | 6am CDT daily | Mara | Checks citizen data consistency against repo canon |
| Weekly Code Review | Monday 6am CDT | — | Reviews past 7 days of commits for engine rule violations |
| Bay-Tribune Container Audit | 7am CDT daily | Mara | Checks bay-tribune for fourth-wall contamination |

## Claude Code Settings (S120)

| Setting | Where | What |
|---------|-------|------|
| AutoDream | user | Background memory consolidation — claude-mem plugin spawns observer sessions. Summarizer runs on **Gemini 2.5 Pro free tier** (switched from Sonnet 4.6 on 2026-04-10 / S141). Config: `/root/.claude-mem/settings.json` |
| Auto Mode | project | Classifier-based permissions (try `/auto` to enable) |
| Thinking Summaries | user | Show reasoning in transcript (ctrl+o) |
| Channels | user | MCP servers can push inbound messages |

## Hook Events (11 wired)

| Event | Type | Target |
|-------|------|--------|
| SessionStart | HTTP + shell | Dashboard + startup script |
| UserPromptSubmit | shell | Skill suggestions |
| PreToolUse (Bash) | shell | Safety checks |
| PostToolUse (Write/Edit) | shell | Contamination + determinism guard |
| PostToolUse (Bash) | shell | Post-deploy verification |
| PreCompact | shell | Workflow state injection |
| PostCompact | shell | Recovery instructions |
| Stop | HTTP + shell | Dashboard + journal/persistence |
| SubagentStart | HTTP | Dashboard — agent launched |
| SubagentStop | HTTP | Dashboard — agent finished |
| FileChanged | HTTP | Dashboard — external file change |

---

## Log Rotation

`/etc/logrotate.d/godworld` — weekly rotation, 4 weeks retained, compressed. Covers all `logs/*.log`. Uses `copytruncate` for PM2 compatibility.
