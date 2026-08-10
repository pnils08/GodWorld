# CRON_PIPELINE_MAP.md

## 1. Trigger Times and Scheduled Jobs

All server times are in UTC. Central Daylight Time (CDT) is UTC-5.

### PM2 Cron Jobs (Server Background Processes)
- **WD Cards Daemon (`wd-cards-daemon`)**:
  - Polls continuously every 300 seconds (5 minutes) if enabled manually.
- *(Retired from pm2: `moltbook` moved to system crontab 14:00 CDT daily, S360 — pm2 `cron_restart` re-fired one-shot runs and duplicated actions. `spacemolt-miner` de-registered 2026-07-27 and its dormant ecosystem.config.js block removed S360; successor is research.27, docs/plans/2026-08-07-spacemolt-game-show.md.)*

### System Cron Jobs (`crontab`)
- **Moltbook Heartbeat**: 2 PM server time daily (`0 14 * * *`) — `moltbook-heartbeat.js`, moved off pm2 S360
- **Nightly Discord Reflection**: 11 PM CDT (`0 4 * * *`)
- **Daily Backup (tar.gz)**: 12 AM CDT (`0 5 * * *`)
- **Server Health Check**: Every 6 Hours (`0 */6 * * *`)
- **Weekly Droplet Snapshot**: Sundays at 10 PM CDT (`0 3 * * 0`)
- **Weekly Maintenance**: Wednesdays at 11 PM CDT (`0 4 * * 3`)
- *(Disabled)* Morning Heartbeat Reflection: Was at 8 AM CST.
- **Civic Datawakes (civic.15)**: Mon–Thu 5:45 AM server time (`45 5 * * 1-4`) — `cron-civic-run.js --stage=datawake`, 3 offices/day voice their domain data into `output/cron-civic/datawake/`
- **Civic Sunday Chain (civic.15)**: Sundays 14:30 + 21:00 retry (`30 14 * * 0`, `0 21 * * 0`) — `cron-civic-run.js --stage=chain`, guarded (exits clean if engine not fired / already ran). DRY era: no `--apply` until two clean dry Sundays are reviewed.

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

### Journalist Slice Build & Delivery (newsroom fanout)

Slices are built **once per cycle, at the 06:15 M–F angle wake only** (`cron-desk-run.js --stage=angle --fanout` → `newsroom-fanout.js`). No other job builds them.

1. Fanout picks the day's roster from the ~20-byline pool (least-recently-used, max 6/day).
2. Per rostered journalist, before the model call, fanout builds that persona's slice from the current cycle's engine artifacts in `output/cron-compare/` and writes it to `output/cron-compare/`:
   - freelance-firebrand → `jax_slice_c{N}.json` (`newsroom-fanout.js:307-309`)
   - p-slayer → `pslayer_slice_c{N}.json` (:442-443)
   - anthony-raines → `anthony_slice_c{N}.json` (:478-479)
   - hal-richmond → `hal_slice_c{N}.json` (:514-515)
   - business desk → `economic_slice_c{N}.json` (:552-553)
   - evening consumers → `evening_slice_c{N}.json` (:591-592)
   - If the slice file already exists for the cycle, it is reused, not rebuilt (:430, :467).
3. `cron-desk-run.js` injects the slice content into the journalist's prompt packet (:395-624) on top of the desk lane. Journalists without a slice builder get the desk lane only.
4. **13:15 report and 18:15 write wakes do not rebuild** — they `load*Slice` the same file written at 06:15. Same slice, all three wakes, one per cycle per persona. Anything landing after 06:15 (e.g. that day's civic datawakes if they run late) is not in the slice wakes 2/3 consume.

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

## Weekly Lifecycle — civic.15 era (S344)

The week as it actually runs, with MANUAL steps notated. Sunday chain + datawakes are live crons (dry mode); everything marked MANUAL is a bottleneck candidate.

| When | What happens | Automated? |
|---|---|---|
| Sunday | Mike runs pre-checks (sports + civic intake entries) and fires `runWorldCycle()` in Apps Script | **MANUAL** (engine fire is the world's heartbeat — deliberate) |
| Sunday | `buildWorldSummary.js` + `engineAuditor.js` produce `world_summary_c{XX}.md`, `engine_audit_c{XX}.json`, `desk_signal_c{XX}.json`, `baseline_briefs_c{XX}.json` | **MANUAL prompt today** — but both are deterministic scripts; cron-able behind a "new cycle detected" guard (candidate next automation) |
| Sunday | `/engine-review` prose review + gap log | **MANUAL** (LLM skill, engine-sheet terminal) |
| Sunday 14:30 | Civic chain cron: directive → prep → Mayor → voices → projects → close. Replaces the interactive `/city-hall-prep` + `/city-hall` civic-terminal session entirely | **CRON** (dry: decisions staged, no sheet write until `--apply` flips) |
| Sunday (chain close) | Production log civic sections written BY SCRIPT: `--stage=prep` opens `production_log_c{XX}.md` + `## /city-hall-prep (AUTO)`; `--stage=close` writes `## /city-hall (AUTO)` (voice decisions table, tracker updates, media handoff). No Claude CLI involved | **CRON** |
| Sunday (chain close) | Media handoff, three paths: (1) `## /city-hall` production-log section (sift's canonical civic source), (2) `output/cron-civic/decisions_lane_c{XX}.json` — decisions as lane entries merged into the civic desk lane by `cron-desk-run.js loadLane` (because `desk_signal` is built BEFORE city hall runs), (3) `output/civic-voice/*_c{XX}.json` full statements | **CRON** |
| Mon–Thu 05:45 | Civic datawakes (3 offices/day, numeric-grounded) → merged into the civic lane before the 06:15 angle wake | **CRON** |
| Mon–Fri 06:15/13:15/18:15 | Newsroom fanout wakes (angle/report/write + Rhea gate) | **CRON** |
| Daily 06:00 | Morning digest (now includes Civic section: chain result, would-apply tracker moves, datawake quotes) | **CRON** |
| Saturday | Mags compiles best-scored staged articles into the edition; scoring refinement owed (see plan); compile not yet designed as cron | **MANUAL** (headless-newsroom plan Phase 3 territory) |
| Saturday | Print pipeline + canon ingest | **MANUAL** (skill runs, approval-gated) |

Remaining manual bottlenecks, ranked: (1) Saturday compile + ingest (biggest; research-build/media design), (2) Sunday post-fire script prompts (world summary + auditor — mechanically cron-able), (3) engine-review prose + gap log (LLM, stays manual for now), (4) engine fire itself (stays manual by design).
