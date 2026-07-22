# CRON_PIPELINE_MAP.md

## 1. Trigger Times and Scheduled Jobs

All server times are in UTC. Central Daylight Time (CDT) is UTC-5.

### PM2 Cron Jobs (Server Background Processes)
- **Moltbook Heartbeat (`moltbook`)**: 
  - `0 14,2 * * *` (9 AM and 9 PM CDT daily)
- **SpaceMolt Miner (`spacemolt-miner`)**: 
  - `0 8,16,0 * * *` (3 AM, 11 AM, and 7 PM CDT daily)
- **WD Cards Daemon (`wd-cards-daemon`)**:
  - Polls continuously every 300 seconds (5 minutes) if enabled manually.

### System Cron Jobs (`crontab`)
- **Nightly Discord Reflection**: 11 PM CDT (`0 4 * * *`)
- **Daily Backup (tar.gz)**: 12 AM CDT (`0 5 * * *`)
- **Server Health Check**: Every 6 Hours (`0 */6 * * *`)
- **Weekly Droplet Snapshot**: Sundays at 10 PM CDT (`0 3 * * 0`)
- **Weekly Maintenance**: Wednesdays at 11 PM CDT (`0 4 * * 3`)
- *(Disabled)* Morning Heartbeat Reflection: Was at 8 AM CST.

### Anthropic Cloud Scheduled Agents
- **Daily Mara Canon Sync**: 6 AM CDT daily
- **Weekly Code Review**: Mondays at 6 AM CDT
- **Bay-Tribune Container Audit**: 7 AM CDT daily

---

## 2. Dependency Graph: Node Scripts & LLM Pipeline

The GodWorld pipeline follows a strict sequence from engine execution to LLM generation (Civic decision-making, followed by Media production).

### Cycle Run Pipeline
1. **Engine Execution**: Operator runs `runWorldCycle()` manually in Google Apps Script.
2. **Data Extraction & Desk Setup**:
   - `node scripts/buildDeskPackets.js [cycle]` (4a)
   - `node scripts/buildInitiativePackets.js [cycle]` (4b)
3. **Civic Agent Pipeline**:
   - `node scripts/buildInitiativeWorkspaces.js [cycle]` (4c)
   - `node scripts/applyTrackerUpdates.js [cycle]` (4c.5 - dry run)
   - `node scripts/applyTrackerUpdates.js [cycle] --apply` (4c.5 - apply to Sheets)
   - `node scripts/buildDecisionQueue.js [cycle]` (4c.6 - outputs pending decisions)
   - `node scripts/buildVoiceWorkspaces.js [cycle]` (4d)
4. **Media Preparation**:
   - `node scripts/buildDeskFolders.js [cycle]` (4e)
   - `node scripts/checkSupplementalTriggers.js [cycle]` (4f)

### Media-Room LLM Generation Pipeline
- **Edition Production** (Primary pipeline path):
  - Agent starts `/write-edition`
  - *Post-generation validation & publishing:*
    - `node scripts/validateEdition.js`
    - *(User Approval Gate Required)*
    - `node scripts/saveToDrive.js [file] [dest]`
    - `node scripts/ingestEdition.js [file]`
    - `node scripts/postRunFiling.js [cycle]`
    - `node scripts/editionIntake.js [file]`
    - `node scripts/gradeEdition.js [cycle]`
- **Optional Post-Edition Media**:
  - `node scripts/generate-edition-photos.js`
  - `node scripts/photoQA.js output/photos/eXX`
  - `node scripts/generate-edition-pdf.js`

---

## 3. Rate-Limiting & Delays

To prevent hitting third-party API quotas and ensure stable operations, the following throttles and limits are in place:

- **Google Sheets API**: Uses `batchUpdate` extensively in `lib/sheets.js` to minimize network overhead and avoid hitting concurrent write quotas instead of relying on explicit hardcoded MS delays.
- **Supermemory Ingest API (`supermemory-ingest.js`)**: 500ms delay between batch requests.
- **Google Drive Archive Scripts (`crawlDriveArchive.js`, `downloadDriveArchive.js`)**: Delays of 100ms to 150ms between requests to respect Drive API quotas.
- **Moltbook Social Posting**: Enforced logical limit of 1 post per 30 minutes to avoid rapid spam or rate-limiting by endpoints.

---

## 4. Automatic Error-Recovery Paths

The system utilizes automated failovers, recovery paths, and threshold monitoring to maintain stability:

- **PM2 Process Crashes**: All background processes (e.g., Dashboard, Mags Discord bot, Daemons) are configured with `autorestart: true`, `max_restarts: 10`, and a `restart_delay: 5000` (5 seconds). PM2 will gracefully restart them if they crash.
- **API Outages (Supermemory)**: If the Supermemory API times out or goes down, the Mags Discord bot falls back to local file querying seamlessly.
- **Automated Health Checks**: The `server-health-check.sh` cron runs every 6 hours, checking for Disk space > 80%, RAM < 100MB, and PM2 errors > 10. Breaches trigger an immediate Discord webhook alert.
- **Data Integrity Failures (LLM Pipeline)**: GodWorld's "Plan Mode Gate" prevents silent LLM hallucinations. If an agent blocks mid-execution (e.g., citizen not found, missing intake), it halts, logs the failure, and re-enters Plan Mode instead of guessing or forging data.
- **System Reboots**: Crons and jobs are registered in `ecosystem.config.js`. If the droplet restarts, `pm2 startup` and `pm2 save` ensure the dashboard and bot resume immediately upon boot.
