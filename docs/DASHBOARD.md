# GodWorld Dashboard

**URL:** `http://64.225.50.16:3001` (or `localhost:3001` from the droplet)
**Auth:** Basic auth — credentials in `.env` (`DASHBOARD_USER`, `DASHBOARD_PASS`)
**PM2:** `godworld-dashboard` (always running)
**Stack:** Express + React (Vite build) | Port 3001

Last audited: Session 120 (2026-03-27)

---

## The Dashboard Is the Search Engine

**Every API call is free.** The dashboard runs on the droplet at `localhost:3001`. When any script, agent, or bot queries it, that's local HTTP — no external API, no tokens, no cost. This makes the dashboard the most powerful and cheapest data access layer in the entire stack.

**Implication:** Any time a script needs to find data — citizens, articles, initiatives, player stats — the dashboard API should be the first option, not Supermemory (cloud, rate-limited) or flat JSON packets (context-expensive). One `localhost` call returns exactly what's needed.

**Current consumers:**
- `buildArchiveContext.js` — searches articles via `/api/search/articles` (added S106)
- Frontend UI — React app for visual browsing

**Future consumers (Phase 2.2/5.4):**
- Desk agents querying `/api/citizens/:popId` instead of loading full packets
- Voice agents checking initiative status via `/api/initiatives`
- Any script that needs citizen, article, or civic data

---

## Frontend Tabs

| Tab | What it shows |
|-----|--------------|
| **Edition** | Latest edition articles as cards — headline, subtitle, quote, reporter avatar. Lead story first. |
| **Newsroom** | Operational view — editor state (journal preview), desk status, agent health, pipeline metrics |
| **Council** | 9 council seats, factions (OPP/CRC/IND), civic officials |
| **Tracker** | Initiative status — Stabilization Fund, OARI, Baylight, Transit Hub, Health Center |
| **Intel** | Story hooks, arcs, domains, storylines |
| **Sports** | Oakland + Chicago sports feeds, player index |
| **City** | Weather, culture events, transit, faith orgs, neighborhoods |
| **Search** | Full-text article search across all editions and supplementals |
| **Chicago** | Chicago bureau — Bulls card, feed events, bureau coverage, reporters (menu only) |
| **Mission** | Mission Control — session events, system health, channel status, quick actions |

**Top cards:** Cycle number, Sentiment score, Neighborhood count, Council seat count, system status.

**Key Figures section:** Tier 1 citizens displayed with role, neighborhood, tier badge.

---

## API Endpoints (40 total)

### System
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/health` | Local files | Status, engine version, latest cycle archive, latest edition | Working |
| `GET /api/newsroom` | Journal, desk packets, output dir | Editor state, desk status per desk, article counts, pipeline metrics | Working |
| `POST /api/session-events` | Hook input (localhost only) | Accepts session events from Claude Code hooks. No auth required. | Working (S113) |
| `GET /api/session-events` | In-memory ring buffer | Session event history. Filter: `?since=`, `?type=`. Auth required. | Working (S113) |
| `POST /api/webhooks` | External services | Accepts webhook events. Requires `x-webhook-secret` header. Secret in `.env`. | Working (S113) |
| `DELETE /api/session-events` | — | Clears all session events (memory + disk). Auth required. | Working (S113) |
| `POST /api/actions/restart-bot` | PM2 | Restarts `mags-bot` process. Auth required. | Working (S113) |
| `POST /api/actions/health-check` | System | Returns disk, RAM, uptime, PM2 process status. Auth required. | Working (S113) |

### Citizens & People
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/citizens` | **Live Simulation_Ledger** (falls back to archive) | All citizens. Filter: `?tier=`, `?neighborhood=`, `?search=`, `?limit=` | **Working** — clean data from live SL |
| `GET /api/citizens/:popId` | **Live SL** + citizen_archive + editions + bonds | Full citizen detail — demographics, life history, article appearances, relationships, household | **Partially broken** — see Citizen Detail Audit below |
| `GET /api/citizen-coverage/:nameOrId` | All edition files (editions/ + archive/) | Coverage trail — every article mentioning a citizen | **Working but noisy** — archive bundle files generate junk entries |
| `GET /api/roster` | `output/desk-packets/truesource_reference.json` | TrueSource player roster | Working |
| `GET /api/players` | `output/player-index.json` | All players with stats, contracts, attributes. Filter: `?sport=`, `?team=`, `?search=` | Working |
| `GET /api/players/:popId` | `output/player-index.json` | Single player full detail | Working |

### Civic & Government
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/council` | **Live Civic_Office_Ledger** | Council members, factions, staff, mayor | Working |
| `GET /api/initiatives` | `output/initiative_tracker.json` + civic docs | All 5 initiatives with status, votes, timeline, linked articles | Working |
| `GET /api/civic-documents` | `output/city-civic-database/` | All civic documents — clerk records, council actions, initiative files | Working |

### World State
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/world-state` | **Live Dashboard tab** + desk packets | Cycle, sentiment, neighborhoods, council, population, weather, crime | Working |
| `GET /api/neighborhoods` | **Live Neighborhood_Demographics** | Per-neighborhood stats — population, income, age, education | Working |
| `GET /api/weather` | **Live Cycle_Weather** | Weather history by cycle | Working |
| `GET /api/culture` | **Live Cultural_Ledger** | Cultural events and figures | Working |
| `GET /api/transit` | **Live Transit_Metrics** | Transit ridership, delays, construction | Working |
| `GET /api/faith` | **Live Faith_Organizations** | 16 faith orgs with leaders, traditions, congregation size | Working |
| `GET /api/domains` | **Live Domain_Tracker** | Domain activity levels and cooldowns | Working |

### Editions & Articles
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/edition/latest` | `editions/` dir | Latest edition filename and cycle | Working |
| `GET /api/editions` | `editions/` + `archive/articles/` + civic docs | All editions with article counts, reporters, cycles. 273 total entries. | **Working** — archive wired S106 |
| `GET /api/edition/:cycle` | `editions/` dir | Full parsed edition for a specific cycle | Working (C78+ only) |
| `GET /api/articles/index` | `output/article-index.json` | Article search index | **Stale** — last built Feb 23, missing E83-E87 |
| `GET /api/search/articles` | All edition + archive files | Full-text search. Params: `?q=`, `?author=`, `?section=`, `?citizen=`, `?cycle=`, `?limit=`. Returns `source` field. | **Working** — covers C1-C87 (273 articles) |
| `GET /api/article` | Edition files | Single article by `?cycle=` + `?title=` | Working |

### Story & Narrative
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/hooks` | Desk packets (Story_Hook_Deck) | Story hooks for latest cycle. Filter: `?desk=` | Working |
| `GET /api/arcs` | Desk packets (Event_Arc_Ledger) | Multi-cycle arcs with phase, tension, citizens | Working |
| `GET /api/storylines` | Desk packets (Storyline_Tracker) | Storyline status and health | Working |

### Sports & Scores
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/sports` | Desk packets (sports + chicago) | Oakland + Chicago sports feeds and digest | Working |
| `GET /api/scores` | `output/edition_scores.json` | Mara audit scores by edition | Working |

### Mara
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/mara` | `output/mara_directive_c*.txt` | Latest Mara directive + history of all directives | Working |

---

## Data Sources (4 layers)

The dashboard reads from four layers for article data:

1. **`editions/`** (Source 1, canonical) — C78-C87 Cycle Pulse editions + supplementals. 18 files. Current pipeline output. Takes priority for dedup.
2. **`output/drive-files/`** (Source 2, Drive cache) — **Currently empty.** Superseded by Source 4.
3. **`output/city-civic-database/`** (Source 3, civic docs) — 39 civic documents from initiative agents. Council actions, determination letters, status reports.
4. **`archive/articles/`** (Source 4, curated archive) — 199 clean articles from C1-C77. Strict naming: `c{cycle}_{desk}_{slug}_{reporter}.txt`. Wired S106. Junk/mirror files filtered.

**Total searchable:** 273 articles across all sources and eras.

For citizen data, the dashboard reads from:
- **Live Google Sheets** (primary) — Simulation_Ledger, Civic_Office_Ledger, Neighborhood_Demographics, etc. Uses service account. Falls back to local cycle archive if Sheets API fails.
- **Desk packets** — `output/desk-packets/` for citizen archive, player index, base context.
- **Player index** — `output/player-index.json` for athlete details.

---

## Citizen Detail Audit (S106)

The `/api/citizens/:popId` endpoint builds a citizen card from 4 layers. Here's the current state:

### Layer 1: Ledger Data — WORKING
Reads live Simulation_Ledger via Sheets API. Returns all 46 columns. Falls back to cycle archive TSV. This is the authoritative source and it works cleanly.

### Layer 2: Citizen Archive — STALE
Reads `citizen_archive.json` from the civic desk packet. Issues:
- Only searches the civic desk packet, not the consolidated archive
- `citizen_archive.json` (174 entries) was built from pre-curation data
- Contains GEN-* IDs instead of POP-* IDs
- References junk files ("Media_Cannon_Text_Mirror")
- **Needs rebuilding** from curated `archive/articles/` data

### Layer 3: Edition Appearances — WORKING (cleaned S106)
Searches all editions (including archive) for citizen name matches. S106 fixes:
- Content-based title/author extraction (not filename parsing)
- Mirror/junk files filtered from archive Source 4
- Article index rebuilt from clean sources (244 entries, 0 mirrors)
- Remaining rough edge: multi-cycle bundle files (C44, C46) still show filename-derived titles for the bundle itself

### Layer 4: Voice Card — STALE
Same source as Layer 2 (`citizen_archive.json`). Same staleness issues. Underlying data needs rebuilding.

### Flags — MOSTLY WORKING
Correctly parses UNI/MED/CIV using `=== 'yes'` (lowercase comparison). Note: this works for the dashboard because it checks `toLowerCase() === 'yes'` — unlike the engine bug that checks `=== "y"`.

### Player Profile — WORKING
For UNI-flagged citizens, enriches with player-index.json data. POPID matching avoids name collisions.

---

## Civic Pipeline Assessment (S106)

The civic data pipeline is rich underneath but has freshness and display issues.

**What's working:**
- Council composition from live Civic_Office_Ledger — all 9 seats, factions, POPIDs, notes
- All 5 initiatives documented with implementation detail, key contacts, newsroom notes, Mara corrections
- 40 civic documents from initiative agents
- Article counts per initiative via keyword cross-reference (73-147 articles each)

**What needs work:**
| Issue | Impact | Fix |
|-------|--------|-----|
| `initiative_tracker.json` last updated Feb 28 | Stale status, stale milestones, stale `nextActionCycle` values | Refresh at each cycle or edition. `buildInitiativePackets.js` should update this. |
| 3 initiatives show "UNTRACKED" on frontend | Misleading — data has full implementation detail but frontend maps status labels inconsistently | Frontend status mapping needs to recognize "committee-review", "mobilizing", "pre-vote" as tracked states |
| No per-member vote breakdown | Can't see who voted yes/no on each initiative | Vote data exists in `recentOutcomes` in desk packets but not in initiative_tracker.json |
| Transit Hub vote targeted C86, current is C87 | Did the vote happen? Tracker doesn't know. | Update status after cycle runs |
| No council↔initiative link in UI | Can't click a council member to see their positions | Future enhancement |

**For voice agents and civic desk:** The initiative tracker data is what feeds voice agent briefings via `buildInitiativePackets.js`. Stale tracker = stale voice statements = stale civic coverage. Refreshing this file before each edition is critical for the civic pipeline.

---

## Sports Tab Assessment (S106)

**What's working:**
- A's card with record (0-0), season state (regular-season), trend (STEADY)
- Player features with cycle tags and featured player names
- Story angles as clickable tags
- Bulls card with full season data (58-24, playoffs, RISING)
- Feed events from both Oakland and Chicago sports feeds with event types, records

**Issues:**
| Issue | Impact | Fix |
|-------|--------|-----|
| **"Warriors" header in Oakland section** | Oakland feed events render under a Warriors header. Warriors don't exist in GodWorld (A's + Bulls only). | Frontend bug — feed parser/renderer labels non-A's Oakland events as Warriors |
| **No player roster on Sports tab** | `/api/players` has 62 players with full TrueSource data. None surfaced in the Sports UI. | Add player roster section to Sports tab, or link to individual player cards |
| **No player↔coverage link** | Clicking a player name doesn't navigate to their citizen detail or article coverage trail | Future enhancement |
| **Chicago buried in Sports tab** | Chicago is a satellite city (123 citizens, 2 reporters, full season data, Paulson GM) but shares a tab with Oakland sports | Consider dedicated CHICAGO tab — see below |

## Chicago Tab Proposal

Chicago isn't just a franchise — it's a satellite city with its own civic context:
- **123 citizens** on Chicago_Citizens tab (separate from SL)
- **Bulls** — 58-24, #1 seed East, playoffs, Trepagnier ROY, Paulson Executive of Year
- **Two bureau reporters** — Selena Grant (beats), Talia Finch (neighborhood texture)
- **Paulson two-city tension** — GM of both A's and Bulls, the storyline that connects both worlds
- **Bridgeport/Bronzeville/Near North** — Chicago neighborhoods with their own character

A dedicated CHICAGO tab would surface: Bulls card + feed events, Chicago citizens, bureau output, Paulson front office coverage. Currently all of this is compressed into the bottom half of the Sports tab.

**Dashboard API already supports this** — `/api/sports` returns Chicago feeds separately, Chicago_Citizens is a queryable tab, `/api/search/articles?section=chicago` finds bureau coverage.

---

## Sports Data Gap — FIXED (S106)

The sports desk truesource was enriched:

| Data Source | Before | After |
|-------------|--------|-------|
| `truesource_reference.json` (desk workspace) | 10 players × 3 fields | **91 players × 8-14 fields** |
| `player-index.json` (dashboard API) | 62 players × 20+ | Unchanged — available for deeper queries |

`buildAsRoster()` rewritten to pull all GAME-mode citizens and enrich with player-index.json data (overall rating, potential, contract, quirks, last 2 seasons stats, awards, player status). 4 T1 dynasty players have full TrueSource enrichment.

---

## Open Dashboard Work

| Item | Priority | Description | Tracked In |
|------|----------|-------------|-----------|
| **Rebuild citizen_archive.json** | High | 174 stale entries with GEN-* IDs and junk file refs. **Auto-refreshes when `buildDeskPackets.js` runs** (edition pipeline step 6). Will be current at E88 production. No manual rebuild needed — just run the pipeline. | — |
| **Rebuild POPID article index** | High | `ARTICLE_INDEX_BY_POPID.md` (176 citizens) generated Feb 5 from Drive downloads. Needs rebuilding from clean article-index.json. No automated builder exists. | WORLD_MEMORY.md Phase 2 |
| ~~Rebuild article indexes~~ | — | **DONE S106.** 244 entries, 0 mirrors. | — |
| ~~Filter archive bundle noise~~ | — | **DONE S106.** Content-based title/author extraction. Junk/mirror filtered. | — |
| ~~Supplemental detection~~ | — | **DONE S106.** 7 supplementals with cycle numbers. `isSupplemental` flag on Source 1. | — |
| ~~Warriors header bug~~ | — | **DONE S106.** Filtered from frontend. Feed data retained for storyline context. | — |
| ~~Edition scores E86-E87~~ | — | **DONE S106.** A and B scores added to `edition_scores.json`. | — |
| ~~Enrich sports desk truesource~~ | — | **DONE S106.** 91 players × 8-14 fields. `buildAsRoster()` rewritten. | — |
| **Supplemental display on frontend** | Medium | 7 supplementals now detected with cycle numbers but no visual placement on the frontend. Need a supplementals section — either on the Edition tab alongside the main edition or as a sidebar/filter. Data is ready (`isSupplemental` flag, cycle, articles). | ROLLOUT_PLAN |
| **Agent integration (Phase 2.2/5.4)** | Next | Route desk agents to dashboard API instead of flat packets. `/api/citizens/:popId` for targeted citizen data, `/api/players/:popId` for sports, `/api/search/articles` for historical context. All free local calls. | ROLLOUT_PLAN |

---

## Full Tab Audit (S106)

| Tab | Status | Key Issues |
|-----|--------|-----------|
| **Edition** | Working | Articles display with titles, reporters, quotes. Key Figures section shows T1 citizens. |
| **Newsroom** | Working (stale data) | Mags journal current. Mara scores stop at E85 (missing E86-E87). Citizen archive stale (174 entries, wrong POPIDs). PM2 shows dashboard "stopped" while serving the page. Supplemental count shows 0. |
| **Council** | Working | All 9 seats + mayor from live Sheets. Factions, districts, POPIDs, notes all correct. |
| **Tracker** | Working (stale data) | 5 initiatives with rich implementation detail. Last updated Feb 28. 3 show "UNTRACKED" despite having data. |
| **Intel** | Working — strongest tab | 64 story hooks, 37 arcs (all stuck at "early" — known bug), 53 storylines with citizen/desk routing. Rich engine data. |
| **Sports** | Partially broken | "Warriors" header bug. No player roster in UI. Chicago buried in bottom half. |
| **City** | Working | 17 neighborhoods ranked by sentiment with crime, nightlife, retail, events metrics. Status flags on pressure zones. |
| **Search** | Working | Full-text search across 256 articles (editions + archive + civic). Source field in results. |

### Stale Data Files Referenced by Dashboard

| File | Last Updated | Status |
|------|-------------|--------|
| `citizen_archive.json` | Mar 16 | Stale — auto-refreshes when `buildDeskPackets.js` runs (E88 pipeline) |
| `initiative_tracker.json` | Feb 28 | Stale — needs manual refresh before E88 |
| `edition_scores.json` | S106 | **Current** — E81-E87 scored |
| `article-index.json` | S106 | **Current** — 244 entries, 0 mirrors |

---

## How the Dashboard Stays Current

The dashboard reads from two categories: live data that auto-refreshes, and local files that require pipeline actions.

### Auto-Refresh (no action needed)

| Data Source | Refresh | Cache | Endpoints Served |
|-------------|---------|-------|-----------------|
| **Simulation_Ledger** (live sheet) | Every API call | 5 min | `/api/citizens`, `/api/citizens/:popId`, `/api/world-state` |
| **Civic_Office_Ledger** (live sheet) | Every API call | 5 min | `/api/council` |
| **Neighborhood_Demographics** (live sheet) | Every API call | 5 min | `/api/neighborhoods` |
| **Cycle_Weather** (live sheet) | Every API call | 5 min | `/api/weather` |
| **Cultural_Ledger** (live sheet) | Every API call | 5 min | `/api/culture` |
| **Transit_Metrics** (live sheet) | Every API call | 5 min | `/api/transit` |
| **Faith_Organizations** (live sheet) | Every API call | 5 min | `/api/faith` |
| **Domain_Tracker** (live sheet) | Every API call | 5 min | `/api/domains` |
| **Crime_Metrics** (live sheet) | Every API call | 5 min | `/api/world-state` |
| **World_Config** (live sheet) | Every API call | 5 min | `/api/world-state` |
| **Edition files** (editions/ + archive/) | 5 min cache | Re-scans dirs | `/api/editions`, `/api/search/articles`, `/api/edition/:cycle` |

### Pipeline-Refresh (requires action)

| File | Generator | When to Run | Endpoints Affected | Current Status |
|------|-----------|------------|-------------------|---------------|
| `citizen_archive.json` | `buildDeskPackets.js` | Step 6 of edition pipeline | `/api/citizens` (ref counts), `/api/citizens/:popId` (Layer 2+4), `/api/newsroom` (archive ranking) | Stale (Mar 16) — refreshes at E88 |
| `base_context.json` | `buildDeskPackets.js` | Step 6 of edition pipeline | `/api/world-state` (fallback), sports digests | Stale — refreshes at E88 |
| `initiative_tracker.json` | `buildInitiativePackets.js` (auto S106) | Step 2 of edition pipeline | `/api/initiatives`, `/api/newsroom` | Stale (Feb 28) — **auto-refreshes next pipeline run** |
| `edition_scores.json` | `gradeEdition.js` (auto S106) | Step 25 of edition pipeline | `/api/scores`, `/api/newsroom` (score history) | Current (S106 — E81-E87) |
| `article-index.json` | `postRunFiling.js` → `buildArticleIndex.js` (auto S106) | Step 22 of edition pipeline | `/api/articles/index` | Current (S106 — 244 entries) |
| `player-index.json` | `buildPlayerIndex.js --write` | After TrueSource data changes | `/api/players`, `/api/players/:popId` | Current (62 players) |
| `bay_tribune_roster.json` | Manual schema file | When reporter roster changes | `/api/newsroom` (roster section) | Current |

### Automated Refresh (S106)

These files now auto-refresh as part of the pipeline:

| File | Automated By | When It Fires |
|------|-------------|--------------|
| `article-index.json` | `postRunFiling.js` runs `buildArticleIndex.js --write` | Step 22 of edition pipeline |
| `edition_scores.json` | `gradeEdition.js` auto-appends new score entry | Step 25 of edition pipeline (dedup by cycle) |
| `initiative_tracker.json` | `buildInitiativePackets.js` writes fresh tracker from live sheet | Step 2 of edition pipeline |

### Dashboard Restart Behavior

On restart (PM2 or `node dashboard/server.js`):
- All sheet caches clear — first request re-fetches live data
- Edition cache clears — `getAllEditions()` re-scans all 4 source directories
- Local JSON files re-read from disk
- No warm-up needed — first request triggers all loads

---

## Frontend Status

The frontend is functional but not user-optimized:
- Dark theme, responsive layout, card-based articles
- Login page with cookie-based auth
- Tab navigation across 10 views (Mission Control + Chicago added S113)
- Key Figures section with Tier 1 citizen cards
- Mission Control: session events timeline, system health, channel status, quick actions
- **Not mobile-friendly** in current state
- **No real-time updates** — data loads on page load

The frontend is a visualization layer. The backend API is the primary value.

---

## Files

| File | Purpose |
|------|---------|
| `dashboard/server.js` | Express API (~2,350 lines, 40 endpoints) |
| `output/session-events.jsonl` | File-backed session event history (persists across restarts) |
| `dashboard/src/` | React frontend source (Vite) |
| `dashboard/dist/` | Built frontend (served as static) |
| `dashboard/index.html` | Entry point |
| `.claude/rules/dashboard.md` | Path-scoped rules (loaded when editing dashboard code) |
