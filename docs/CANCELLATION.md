# GodWorld — Cancellation Plan

## Monthly Costs

| Service | Cost | Cancel Where |
|---------|------|-------------|
| Anthropic Claude Max | ~$100/mo | console.anthropic.com → subscription |
| Supermemory (P N org) | $9/mo | supermemory.ai → account settings |
| DigitalOcean droplet | ~$12-24/mo | cloud.digitalocean.com → droplet → destroy |
| Together.ai | usage-based | together.ai → account settings |

**Total monthly: ~$121-133+**

## Free Services (no cost to keep or cancel)

| Service | Cancel Where | Notes |
|---------|-------------|-------|
| Discord bot | discord.com/developers → delete app | Or just stop PM2 process |
| Moltbook | moltbook.com | Deactivate if needed |
| Google Drive / Sheets | Delete files manually | Free tier, nothing to cancel |
| GitHub repo (pnils08/GodWorld) | github.com → repo settings → delete | Or leave it, free forever |
| Riley Apps Script triggers | script.google.com → My Triggers → delete all | Free, but running on timers |
| Google service account | console.cloud.google.com | Free tier |

## Cancellation Order

### Step 1: Anthropic (biggest cost)
- console.anthropic.com → subscription → downgrade or cancel
- Claude Code CLI stops working without a subscription
- Scheduled remote agents (3) stop automatically

### Step 2: Supermemory ($9/mo)
- supermemory.ai → account settings → cancel subscription
- 5 active containers: mags, bay-tribune, world-data, super-memory, mara (+ legacy `sm_project_godworld` on retired GodWorld org, never read)
- Data persists until account deletion — cancelling subscription just stops the billing

### Step 3: DigitalOcean ($12-24/mo)
- cloud.digitalocean.com → droplet → destroy
- **This deletes everything on the server:** dashboard, Discord bot, claude-mem database, all local files, the entire GodWorld codebase on the server
- Back up anything you want to keep BEFORE destroying
- The GitHub repo has the code — the server has the runtime data (logs, session history, local memory)

### Step 4: Together.ai (usage-based)
- together.ai → account settings → delete API key or close account
- Only charges on usage — if nothing is running, cost is zero

### Step 5: Riley Triggers (free but running)
- script.google.com/home → My Triggers
- Delete all triggers to stop CoreSync, PressPulse, heartbeats, integrity logger
- These run every few hours on your Google account and will keep running until you stop them

## What's Permanent

| Action | What you lose | Reversible? |
|--------|--------------|-------------|
| Destroy DO droplet | Server, dashboard, Discord bot, claude-mem, local files | No |
| Delete Supermemory account | 90 editions of canon, world-data, session memory | No |
| Delete GitHub repo | All code, all commit history, all session work | No |
| Cancel Anthropic | CLI access, scheduled agents | Yes — re-subscribe anytime |
| Delete Drive files | Sheets, editions on Drive, Riley backups | No |
| Delete Riley triggers | Automated scripts stop | Yes — re-enable anytime |

## What to Back Up Before Destroying

If you want to keep anything:
- **GitHub repo** — already backed up (it's on GitHub). Leave it.
- **Google Sheets** — Simulation_Ledger, Bay Tribune, all Riley sheets stay on your Google account for free
- **Google Drive files** — editions, PDFs, Mara audits stay on Drive for free
- **Supermemory data** — no export tool. Once cancelled and deleted, the canon is gone. The editions exist as .txt files on Drive and GitHub though.

## Minimum to Stop Bleeding

If you want to pause, not delete:
1. Cancel Anthropic ($100) — biggest cost, immediate savings
2. Cancel Supermemory ($9)
3. Keep DO droplet running ($12-24) if you might come back — or destroy it
4. Everything on Google is free — leave it

That cuts you to $0-24/mo instead of $121-133.
