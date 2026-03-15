# Output Disk Map

**What lives where. Read this before searching for files.**

Last Updated: Session 95 (2026-03-15)

---

## Retention Policy

- **Current + prior cycle** — desk packets, briefings, civic voice data. Delete older on cleanup.
- **Permanent** — editions, PDFs, photos, civic database, Mara directives, rhea reports, supplemental briefs.
- **Regenerable** — HTML intermediates (delete after PDF), Drive file cache (re-download via script).

---

## output/ — Local Working Directory

| Directory | Contents | Retention | Notes |
|-----------|----------|-----------|-------|
| `pdfs/` | Final newspaper PDFs | Permanent | Named: `bay_tribune_e{XX}.pdf`, `bay_tribune_supplemental_c{XX}_{slug}.pdf` |
| `photos/` | AI-generated edition photos | Permanent | Subdirs: `e{XX}/`, `supplemental_c{XX}_{slug}/` |
| `podcasts/` | Audio files | Permanent | |
| `city-civic-database/` | Canonical civic documents | Permanent | Subdirs: `clerk/`, `council/`, `elections/`, `initiatives/`, `mayor/` |
| `mara-directives/` | Mara audit files, all cycles | Permanent | Named: `mara_directive_c{XX}.txt` |
| `rhea-reports/` | Rhea verification reports | Permanent | Named: `rhea_report_c{XX}.txt` |
| `supplemental-briefs/` | Topic briefs for supplementals | Permanent | Named: `{slug}_c{XX}_brief.md` |
| `desk-packets/` | Agent input JSON (per desk, per cycle) | Current + prior | Named: `{desk}_c{XX}.json`, `{desk}_summary_c{XX}.json` |
| `desk-briefings/` | **LEGACY** — old agent briefing docs (pre-S95) | Archive | Named: `{desk}_briefing_c{XX}.md`, `{desk}_archive_c{XX}.md` |
| `desk-output/` | Raw agent output (current cycle) | Current only | Named: `{desk}_c{XX}.md` |
| `desk-raw/` | Uncompiled desk output (prior cycle) | Prior only | Named: `{desk}_c{XX}_raw.md` |
| `desks/` | **Per-desk autonomous workspaces** (built by `buildDeskFolders.js`) | Current cycle | `desks/{desk}/current/` (briefing, packets, errata, voice statements), `desks/{desk}/archive/` (last 3 outputs), `desks/{desk}/reference/` (truesource, citizen archive). See README.md in each desk folder. |
| `civic-voice/` | Civic office voice data | Current + prior | Named: `{office}_c{XX}.json` |
| `civic-voice-packets/` | Civic voice packets for agents | Current + prior | Named: `{office}_c{XX}.json` + `manifest.json` |
| `initiative-packets/` | Initiative agent input | Current cycle | |
| `batch-reviews/` | Actionable summaries of batch API results | Permanent | Named: `batch_{slug}_{date}.md`. Raw results at `~/.claude/batches/results/` |
| `visual-qa/` | Dashboard QA screenshots | Latest run | |

### Root Files

| File | Purpose | Updated |
|------|---------|---------|
| `latest_edition_brief.md` | Bot + agent reference — what just published | Every edition |
| `initiative_tracker.json` | Initiative status for dashboard | Every cycle |
| `edition_scores.json` | Mara audit scores by edition | Every edition |
| `errata.jsonl` | Error log from Rhea/Mara | Every edition |
| `player-index.json` | Athlete data for sports desk | Every cycle |
| `article-index.json` | Article search index | Periodic rebuild |
| `article-ledger.md` | Article reference by citizen | Periodic rebuild |
| `character_continuity_audit.md` | Cross-edition character check | On demand |

---

## editions/ — Published Canon

| Pattern | Example | Purpose |
|---------|---------|---------|
| `cycle_pulse_edition_{XX}.txt` | `cycle_pulse_edition_86.txt` | Main Cycle Pulse editions |
| `supplemental_{slug}_c{XX}.txt` | `supplemental_food_scene_c86.txt` | Supplemental editions |
| `cycle_pulse_supplemental_{XX}_{slug}.txt` | (legacy naming, pre-S86) | Old supplemental format |
| `CYCLE_PULSE_TEMPLATE.md` | — | Edition structure template |
| `SUPPLEMENTAL_TEMPLATE.md` | — | Supplemental structure template |

---

## .claude/agent-memory/ — Persistent Agent Memory

22 agents with `MEMORY.md` files. Memory informs, does not publish. Canon authority is Mags.

**Desk agents:** business-desk, chicago-desk, civic-desk, culture-desk, letters-desk, podcast-desk, sports-desk
**Civic offices:** baylight-authority, crc-faction, district-attorney, health-center, ind-swing, mayor, oari, opp-faction, police-chief, stabilization-fund, transit-hub
**Editorial:** freelance-firebrand, mags-corliss, rhea-morgan

---

## Google Drive — Remote Archive

Upload via: `node scripts/saveToDrive.js <file> <destination>`

| Destination Key | Drive Folder | What Goes There |
|-----------------|-------------|-----------------|
| `edition` | 1_The_Cycle_Pulse/Y_001 | Main edition .txt + print PDFs |
| `supplement` | 2_Oakland_Supplementals | Supplemental .txt + print PDFs |
| `chicago` | Chicago_Supplementals | Chicago supplementals |
| `mara` / `briefing` | Mara_Vance | Mara directives + audit files |
| `presser` | Mike_Paulson_Pressers | Paulson press conferences |
| `player` | MLB_Roster_Data_Cards | A's player cards |
| `prospect` | Top_Prospects_Data_Cards | Prospect cards |
| `bulls` | Player_Cards | Bulls player cards |
| `podcast` | Podcasts | Audio files |
| `civic` | City_Civic_Database | Civic initiative documents |
| `backup` | GodWorld_Backups | System backups |
| `sports` | (sports folder) | Sports reference |
| `publications` | (publications root) | General publications |
| `tribune` | (tribune root) | Tribune-branded assets |

---

## logs/ — Runtime Logs

PM2-managed services + cron jobs. Rotated automatically.

| Log | Service |
|-----|---------|
| `mags-discord-out.log` | Discord bot stdout |
| `daily-heartbeat.log` | 8 AM morning reflection |
| `discord-reflection.log` | 10 PM nightly journal |
| `discord-conversation-history.json` | Bot conversation state (reset at edition publish) |
| `discord-conversations/` | Archived conversation logs |
| `moltbook/` | Moltbook heartbeat logs |

---

## Cleanup Protocol

Run at session end or when output/ exceeds ~60MB:

1. Delete desk packets older than prior cycle
2. Delete desk briefings older than prior cycle (legacy `desk-briefings/`)
3. Run `node scripts/buildDeskFolders.js {cycle} --clean` to rebuild desk workspaces
3. Delete civic voice data older than prior cycle
4. Delete HTML intermediates from pdfs/
5. Delete drive-files/ cache (re-downloadable)
6. Verify editions/ and pdfs/ are intact (permanent)
