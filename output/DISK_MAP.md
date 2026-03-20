# Output Disk Map

**What lives where. Read this before searching for files.**

Last Updated: Session 99 (2026-03-17)

---

## Retention Policy

- **Current + prior cycle** — desk packets, briefings, civic voice data. Delete older on cleanup.
- **Permanent** — editions, PDFs, photos, civic database, Mara directives, rhea reports, supplemental briefs.
- **Regenerable** — HTML intermediates (delete after PDF), Drive file cache (re-download via script).
- **Forward-staging** — Civic voice and initiative workspace outputs may be tagged with a future cycle number (e.g. stabilization fund docs tagged c87 during c86 work). This is accepted practice — the civic pipeline runs ahead of the edition pipeline.

---

## output/ — Local Working Directory

| Directory | Contents | Retention | Notes |
|-----------|----------|-----------|-------|
| `pdfs/` | Final newspaper PDFs | Permanent | Named: `bay_tribune_e{XX}.pdf`, `bay_tribune_supplemental_c{XX}_{slug}.pdf` |
| `photos/` | AI-generated edition photos | Permanent | Subdirs: `e{XX}/`, `supplemental_c{XX}_{slug}/` |
| `podcasts/` | Audio files | Permanent | |
| `city-civic-database/` | Canonical civic documents | Permanent | Subdirs: `clerk/`, `council/`, `elections/`, `initiatives/`, `mayor/` |
| `mara-directives/` | Mara audit directives only | Permanent | Named: `mara_directive_c{XX}.txt`. Non-directives (briefings, audits) belong in `mara-audit/`. |
| `rhea-reports/` | Rhea verification reports | Permanent | Named: `rhea_report_c{XX}.txt` |
| `supplemental-briefs/` | Topic briefs for supplementals | Permanent | Named: `{slug}_c{XX}_brief.md` |
| `desk-packets/` | Agent input JSON (per desk, per cycle) + shared config | Current + prior | Named: `{desk}_c{XX}.json`, `{desk}_summary_c{XX}.json`. Also contains `base_context.json`, `citizen_archive.json`, `truesource_reference.json` (shared across all agents, do not relocate). |
| `desk-briefings/` | **LEGACY** — old agent briefing docs (pre-S95) | Archive | Named: `{desk}_briefing_c{XX}.md`, `{desk}_archive_c{XX}.md` |
| `desk-output/` | Raw agent output (current cycle) | Current only | Named: `{desk}_c{XX}.md` |
| `desk-raw/` | Uncompiled desk output (prior cycle) | Prior only | Named: `{desk}_c{XX}_raw.md` |
| `desks/` | **Per-desk autonomous workspaces** (built by `buildDeskFolders.js`) | Current cycle | `desks/{desk}/current/` (briefing, packets, errata, voice statements), `desks/{desk}/archive/` (last 3 outputs), `desks/{desk}/reference/` (truesource, citizen archive). See README.md in each desk folder. |
| `civic-voice/` | Civic office voice data | Current + prior | Named: `{office}_c{XX}.json` |
| `civic-voice-packets/` | Civic voice packets for agents | Current + prior | Named: `{office}_c{XX}.json` + `manifest.json` |
| `civic-voice-workspace/` | **Per-voice-agent autonomous workspaces** (built by `buildVoiceWorkspaces.js`) | Current cycle | `civic-voice-workspace/{office}/current/` (briefing, base context, mayor statements, initiative packets), `civic-voice-workspace/{office}/archive/` (last 3 statements). See README.md in each folder. |
| `initiative-packets/` | Initiative agent input | Current cycle | |
| `initiative-workspace/` | **Per-initiative autonomous workspaces** (built by `buildInitiativeWorkspaces.js`) | Current cycle | `initiative-workspace/{init}/current/` (briefing, packet, base context), `initiative-workspace/{init}/archive/` (prior decisions), `initiative-workspace/{init}/reference/` (historical docs). See README.md in each folder. |
| `mara-audit/` | Mara audit support files (briefings, review copies) | Permanent | Not directives — those go in `mara-directives/` |
| `grades/` | Edition grading output | Permanent | Named: `grades_c{XX}.json` |
| `grade-examples/` | Exemplar articles (A-grade) | Permanent | Named: `{desk}_exemplar_c{XX}.md` |
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
| `supplemental_{slug}_c{XX}.txt` | `supplemental_food_scene_c86.txt` | Supplemental editions. Slug is the topic only — no city prefix (e.g. `housing_market`, not `oakland_housing_market`). |
| `supplemental_{slug}_c{XX}.txt` | `supplemental_chicago_presser_c70.txt` | Legacy supplementals renamed to current convention (S99) |
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
4. Run `node scripts/buildVoiceWorkspaces.js {cycle} --clean` to rebuild voice workspaces
5. Run `node scripts/buildInitiativeWorkspaces.js {cycle} --clean` to rebuild initiative workspaces
6. Delete civic voice data older than prior cycle
7. Delete HTML intermediates from pdfs/
8. Delete drive-files/ cache (re-downloadable)
9. Verify editions/ and pdfs/ are intact (permanent)

---

## Archive Policy — Keep Local Disk Lean

**Goal:** The 25GB droplet runs Claude Code, the engine pipeline, and 3 PM2 services. Local disk is working memory, not long-term storage. Once files are confirmed on Drive, local copies are redundant.

**Current disk pressure (S105):** 17GB / 25GB (73%). Key consumers:
- `.claude/projects/` — 1.1GB (81 session transcripts, Feb-Mar 2026)
- `.claude-mem/` — 741MB (observation DB + Chroma vectors)
- `.claude/plugins/` — 666MB (installed plugins)
- `node_modules/` — 534MB (NPM deps)
- `backups/` — 141MB (tar.gz + sheet CSVs)

### Photos & PDFs
**Rule:** Delete local copies after confirmed Drive upload.
**How:** `postRunFiling.js --upload` confirms upload. After verification, delete from `output/photos/` and `output/pdfs/`.
**Savings:** ~25MB now, grows each edition.

### Local Backups
**Rule:** Keep only the 2 most recent tar.gz files. Older backups live on Drive only.
**How:** Manual cleanup or script. Sheet CSV backups in `backups/sheets/` follow the same rule.
**Savings:** ~70MB per cleanup.

### Session Transcripts (`.claude/projects/-root-GodWorld/`)
**Rule:** Archive oldest sessions to Drive quarterly. No summarization needed — the lessons are already in the docs (identity.md, NEWSROOM_MEMORY, LEDGER_REPAIR, SESSION_CONTEXT, journal).
**How:**
1. `tar -czf session_archive_YYYY-MM.tar.gz <oldest-30-jsonl-files-and-dirs>`
2. Upload to Drive: `GodWorld_Backups/session_archive/`
3. Verify upload, then delete local originals
4. Do NOT delete the `memory/` subdirectory (MEMORY.md lives there)
**Safety:** Raw files preserved on Drive. If we ever need to dig into a specific old session, pull from Drive.
**Savings:** ~150-200MB per batch of 30 sessions.

### claude-mem Database
**Rule:** Monitor. If `~/.claude-mem/` passes 1GB, investigate retention or prune old observations.
**Current:** 741MB (6,282 observations across 120 sessions).

### What NEVER Gets Deleted Locally
- `editions/` — published canon
- `docs/` — project knowledge
- `.claude/rules/` — behavioral rules
- `.claude/projects/-root-GodWorld/memory/` — auto-memory (MEMORY.md)
- `credentials/` — service account, API keys
- `.env` — environment config
