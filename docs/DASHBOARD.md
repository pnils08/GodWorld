# GodWorld Dashboard

**URL:** `http://64.225.50.16:3001` (or `localhost:3001` from the droplet)
**Auth:** Basic auth — credentials in `.env` (`DASHBOARD_USER`, `DASHBOARD_PASS`)
**PM2:** `godworld-dashboard` (always running)
**Stack:** Express + React (Vite build) | Port 3001

Last audited: Session 106 (2026-03-20)

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

**Top cards:** Cycle number, Sentiment score, Neighborhood count, Council seat count, system status.

**Key Figures section:** Tier 1 citizens displayed with role, neighborhood, tier badge.

---

## API Endpoints (31 total)

### System
| Endpoint | Data Source | Returns | Health |
|----------|-----------|---------|--------|
| `GET /api/health` | Local files | Status, engine version, latest cycle archive, latest edition | Working |
| `GET /api/newsroom` | Journal, desk packets, output dir | Editor state, desk status per desk, article counts, pipeline metrics | Working |

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
2. **`output/drive-files/`** (Source 2, Drive cache) — **Currently empty.** Intended for cached Drive downloads of older editions.
3. **`output/city-civic-database/`** (Source 3, civic docs) — 39 civic documents from initiative agents. Council actions, determination letters, status reports.
4. **`archive/articles/`** (Source 4, curated archive) — 216 individual articles from C1-C77. Strict naming: `c{cycle}_{desk}_{slug}_{reporter}.txt`. Wired S106.

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

### Layer 3: Edition Appearances — WORKING BUT NOISY
Searches all editions (including archive) for citizen name matches. Issues:
- Archive bundle files (e.g. `Cycle_1-69_Text_Mirror`) match as single articles with filenames as titles
- Multi-edition archive files inflate appearance counts
- No source field filtering to separate clean matches from junk matches
- **Needs:** Filter out source=archive entries from bundle/mirror files, or improve archive parser to skip bundles

### Layer 4: Voice Card — STALE
Same source as Layer 2 (`citizen_archive.json`). Same staleness issues. Underlying data needs rebuilding.

### Flags — MOSTLY WORKING
Correctly parses UNI/MED/CIV using `=== 'yes'` (lowercase comparison). Note: this works for the dashboard because it checks `toLowerCase() === 'yes'` — unlike the engine bug that checks `=== "y"`.

### Player Profile — WORKING
For UNI-flagged citizens, enriches with player-index.json data. POPID matching avoids name collisions.

---

## Open Dashboard Work

| Item | Priority | Description | Tracked In |
|------|----------|-------------|-----------|
| **Rebuild citizen_archive.json** | High | Current archive has 174 entries from pre-curation data with GEN-* IDs and junk file references. Needs rebuilding from curated `archive/articles/` + `editions/`. | ROLLOUT_PLAN |
| **Rebuild article indexes** | High | `output/article-index.json` and `output/article-ledger.md` last built Feb 23. Missing E83-E87 + archive articles. | WORLD_MEMORY.md Phase 2 |
| **Filter archive bundle noise** | Medium | Edition appearance search returns junk entries from multi-edition archive bundle files. Either filter bundles from results or improve parser. | WORLD_MEMORY.md |
| **Article index rebuild for POPID index** | Medium | `ARTICLE_INDEX_BY_POPID.md` (176 citizens) and `CITIZENS_BY_ARTICLE.md` generated Feb 5. Missing 5 editions of citizen appearances. | WORLD_MEMORY.md Phase 2 |
| **Agent integration (Phase 2.2/5.4)** | Future | Route desk agents to dashboard API instead of flat packets. `/api/citizens/:popId` gives targeted data. | ROLLOUT_PLAN |
| **Populate drive-files cache** | Low | Source 2 is empty. Could cache Drive editions for offline search. | Not urgent — archive/articles covers the same content. |

---

## Frontend Status

The frontend is functional but not user-optimized:
- Dark theme, responsive layout, card-based articles
- Login page with cookie-based auth
- Tab navigation across 8 views
- Key Figures section with Tier 1 citizen cards
- **Not mobile-friendly** in current state
- **No real-time updates** — data loads on page load

The frontend is a visualization layer. The backend API is the primary value.

---

## Files

| File | Purpose |
|------|---------|
| `dashboard/server.js` | Express API (1,900+ lines, 31 endpoints) |
| `dashboard/src/` | React frontend source (Vite) |
| `dashboard/dist/` | Built frontend (served as static) |
| `dashboard/index.html` | Entry point |
| `.claude/rules/dashboard.md` | Path-scoped rules (loaded when editing dashboard code) |
