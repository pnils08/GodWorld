# GodWorld Operations — Processes, Crons, Scheduled Tasks

**Droplet:** `ubuntu-s-1vcpu-2gb` | 1 vCPU, 2GB RAM, 25GB disk | $12/mo | nyc3
**IP:** 64.225.50.16 | **Access:** SSH as root, or `mags` command (tmux auto-wiring)
**Last verified:** crontab 2026-08-10 via live `crontab -l`; PM2 2026-07-28 via
live `pm2 list`. Dashboard transport reverified 2026-08-03 via live Tailscale,
UFW, and health probes.

---

## PM2 Managed Processes

| Process | Script | Purpose | Expected status |
|---------|--------|---------|-----------------|
| `godworld-dashboard` | `dashboard/server.js` | Express API + React frontend, local port 3001 behind private Tailscale HTTPS | online |
| `mags-bot` | `scripts/mags-discord-bot.js` | Mags presence in Discord | online |
| `wd-cards-daemon` | `scripts/wdCardsDaemon.js` | Polls the invalidation queue and rebuilds world-data cards | online |
| `moltbook` | `scripts/moltbook-heartbeat.js` | One autonomous Moltbook visit daily at 14:00 Central | stopped between scheduled runs |

**Disabled PM2 jobs:** `spacemolt-miner` was removed from the live registry and
the saved reboot state on 2026-07-27 after repeated fixed-sequence no-fuel runs.
Its source and logs remain. The dormant `ecosystem.config.js` declaration must
also be removed before a future full ecosystem reload.

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
This table was verified against the live crontab on 2026-08-10.

| Schedule (UTC) | Job | Script | Log |
|----------------|-----|--------|-----|
| `0 5 * * *` | Daily backup | `scripts/backup.sh` | `logs/backup.log` |
| `0 6 * * *` | Newsroom digest | `scripts/newsroom-digest.js` | `logs/newsroom-digest.log` |
| `15 6 * * 1-5` | Weekday newsroom angle wake | `scripts/cron-desk-run.js --stage=angle --fanout` | `logs/newsroom-fanout.log` |
| `0 7,12,19 * * *` | Mags Discord reflections | `scripts/discord-reflection.js` | `logs/discord-reflection.log` |
| `30 7 * * *` | Citizen morning wake | `scripts/citizen-wake.js --wake=morning` | `logs/citizen-wake.log` |
| `0 8 * * *` | NotebookLM newsroom listening brief | `scripts/notebooklmDailyNews.js` | `logs/notebooklm-daily-news.log` |
| `30 12 * * *` | Citizen midday wake | `scripts/citizen-wake.js --wake=midday` | `logs/citizen-wake.log` |
| `15 13 * * 1-5` | Weekday newsroom report wake | `scripts/cron-desk-run.js --stage=report --fanout` | `logs/newsroom-fanout.log` |
| `0 17 * * *` | Citizen exchange | `scripts/citizen-exchange.js` | `logs/citizen-exchange.log` |
| `15 18 * * 1-5` | Weekday newsroom write + Rhea gate | `scripts/cron-desk-run.js --stage=write --fanout --gate-backend api` | `logs/newsroom-fanout.log` |
| `30 21 * * *` | Citizen night wake | `scripts/citizen-wake.js --wake=night` | `logs/citizen-wake.log` |
| `0 */6 * * *` | Server health check | `scripts/server-health-check.sh` | `logs/health-check.log` |
| `7 23 * * 0` | Citizen bond graph rebuild (post-cycle, --live from Sheets) | `scripts/buildCitizenBondGraph.js` | `logs/bond-graph.log` |
| `0 4 * * 3` | Weekly maintenance | `scripts/weekly-maintenance.sh` | `logs/weekly-maintenance.log` |
| `0 3 1 * *` | Monthly droplet snapshot | `scripts/snapshot-droplet.sh` | `logs/snapshot.log` |

**Disabled:**
| Job | Script | Why |
|-----|--------|-----|
| Morning heartbeat (8 AM CST) | `scripts/daily-reflection.js` | Disabled — cron commented out to save API calls |

**Edit crontab:** `crontab -e`

---

## What Each Job Does

### Mags Discord Reflections (Three Daily)
Reads the Discord log and writes Mags's reflection to her citizen page,
Supermemory, and claude-mem.

### Citizen Wakes (Three Daily)
Runs the morning, midday, and night citizen-loop wakes. Each wake reads Sheets,
generates a reflection, writes the citizen page, and queues gated
`Reflection_Intake`.

### Citizen Exchange (Daily)
Runs one conversation, street interview, or debate and writes its transcript
under `output/exchanges/`, with the configured Supermemory and intake handoffs.

### Newsroom Digest and Weekday Fanout
The 06:00 digest summarizes the prior 36 hours. Monday through Friday, angle,
report, and write cron entries consume the daily fanout. ADR-0017 now gates that
fanout by `scripts/newsroom-wake-packages.json`: only active journalist packages
wake, and missing packages are logged and skipped with no generic fallback. Jax
Caldera and Carmen Delaine occupy separate required civic seats; P Slayer is the
first required sports seat; Jordan Velez is the first required business seat.
Jax runs Llama/Llama/Sonnet, Carmen and Jordan run DeepSeek on all three wakes,
and P Slayer runs Llama on all three wakes. P Slayer's fan-pulse slice and
Jordan's economic/storefront slice travel as typed LEP/2 evidence and creative
limits. Their write stages run the persona-aware Rhea API gate and leave output
staged or flagged behind the probation wall.

### NotebookLM Newsroom Brief (Daily)
Builds a source-grounded listening brief. The brief is a newsroom aid and is not
canon.

### Citizen Bond Graph Rebuild (Weekly)
Regenerates the WORLD tab bond web from live `Relationship_Bonds` +
`Simulation_Ledger` names after the Sunday cycle: exports both tabs to
`output/bond-ledger-live.tsv` / `output/citizen-names.tsv`, then writes
`output/citizen-bond-graph.json` + `.html`. The dashboard reads the JSON via
`/api/world/bond-graph` (10-min cache). Added 2026-08-04 (kimi).

### Daily Backup
Creates `godworld_backup_YYYY-MM-DD_HHMM.tar.gz` in `backups/`, keeps seven
local backup days, and uploads the archive to Drive.

### Server Health Check (Every 6 Hours)
Checks: disk >80%, RAM <100MB, PM2 errors, PM2 restart counts >10, dashboard HTTP health. Sends Discord webhook alert on threshold breach.

### Monthly Droplet Snapshot
Runs on the first day of the month at 03:00 UTC. Takes a full DigitalOcean
droplet snapshot and keeps one rolling restore point.

### Weekly Maintenance
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

# Private Dashboard transport
tailscale status
tailscale serve status

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

## Private Dashboard Access

The operator URL is `https://godworld.tail6d8700.ts.net`. It resolves and
connects only from a device signed into Mike's tailnet. Tailscale Serve
terminates HTTPS on the server's private Tailscale addresses and proxies to
`http://127.0.0.1:3001`.

The direct dashboard port is not public: UFW has no IPv4 or IPv6 allow rule for
`3001/tcp`. Check the boundary without changing it:

```bash
tailscale status
tailscale serve status
ufw status numbered
curl -s http://127.0.0.1:3001/api/health | python3 -m json.tool
```

If the private URL fails, verify `tailscaled` and restore the private proxy:

```bash
systemctl status tailscaled --no-pager
tailscale serve --bg http://127.0.0.1:3001
```

Do not reopen public port `3001` as a routine recovery step. Disabling Serve
uses `tailscale serve --https=443 off`; restoring public access requires a
separate builder decision.

---

## When Things Break

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Dashboard returns 502 | PM2 process crashed | `pm2 restart godworld-dashboard` |
| Private Dashboard name does not resolve | Chromebook/device is disconnected from Tailscale or its Tailscale DNS setting is off | Connect the Tailscale client and enable its DNS setting; do not reopen public `3001` |
| Bot not responding in Discord | PM2 process crashed or rate limited | `pm2 restart mags-bot`, check error log |
| Supermemory timeouts in bot log | API latency or outage | Graceful — bot falls back to local files. Wait it out. |
| Disk >80% | Session transcripts, claude-mem, backups | Run archive policy from DISK_MAP.md |
| `clasp push` fails | Auth expired | `clasp login` to re-authenticate |
| Crontab job not firing | Missing crontab entry, bad path, permissions, or script failure | Run `crontab -l`, inspect the named job log, and do not manually fire a state-changing job without approval |
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
| AutoDream | user | **DISABLED S228 2026-05-23** (`autoDreamEnabled: false` in `~/.claude/settings.json`). Was redundant given MD persistence + Supermemory + claude-mem observations DB. claude-mem daemon stays alive for MCP search. |
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
