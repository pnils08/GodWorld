# GodWorld Dashboard

**URL:** `http://64.225.50.16:3001` (or `localhost:3001` from the droplet)
**Auth:** Basic auth — credentials in `.env` (`DASHBOARD_USER`, `DASHBOARD_PASS`)
**PM2:** `godworld-dashboard` (always running)
**Stack:** Express + React (Vite build) | Port 3001

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
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/health` | Local files | Status, engine version, latest cycle archive, latest edition |
| `GET /api/newsroom` | Journal, desk packets, output dir | Editor state, desk status per desk, article counts, pipeline metrics |

### Citizens & People
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/citizens` | **Live Simulation_Ledger** (falls back to archive) | All citizens. Filter: `?tier=`, `?neighborhood=`, `?search=`, `?limit=` |
| `GET /api/citizens/:popId` | **Live SL** + LifeHistory_Log + articles + bonds | Full citizen detail — demographics, life history, article appearances, relationships, household |
| `GET /api/citizen-coverage/:nameOrId` | Edition files | Coverage trail — every article mentioning a citizen |
| `GET /api/roster` | `output/desk-packets/truesource_reference.json` | TrueSource player roster |
| `GET /api/players` | `output/player-index.json` | All players with stats, contracts, attributes. Filter: `?sport=`, `?team=`, `?search=` |
| `GET /api/players/:popId` | `output/player-index.json` | Single player full detail |

### Civic & Government
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/council` | **Live Civic_Office_Ledger** | Council members, factions, staff, mayor |
| `GET /api/initiatives` | `output/initiative_tracker.json` + civic docs | All 5 initiatives with status, votes, timeline, linked articles |
| `GET /api/civic-documents` | `output/city-civic-database/` | All civic documents — clerk records, council actions, initiative files |

### World State
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/world-state` | **Live Dashboard tab** + desk packets | Cycle, sentiment, neighborhoods, council, population, weather, crime |
| `GET /api/neighborhoods` | **Live Neighborhood_Demographics** | Per-neighborhood stats — population, income, age, education |
| `GET /api/weather` | **Live Cycle_Weather** | Weather history by cycle |
| `GET /api/culture` | **Live Cultural_Ledger** | Cultural events and figures |
| `GET /api/transit` | **Live Transit_Metrics** | Transit ridership, delays, construction |
| `GET /api/faith` | **Live Faith_Organizations** | 16 faith orgs with leaders, traditions, congregation size |
| `GET /api/domains` | **Live Domain_Tracker** | Domain activity levels and cooldowns |

### Editions & Articles
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/edition/latest` | `editions/` dir | Latest edition filename and cycle |
| `GET /api/editions` | `editions/` dir | All editions with article counts, reporters, cycles |
| `GET /api/edition/:cycle` | `editions/` dir | Full parsed edition for a specific cycle |
| `GET /api/articles/index` | `output/article-index.json` | Article search index |
| `GET /api/search/articles` | All edition files | Full-text search. Params: `?q=`, `?author=`, `?section=`, `?citizen=`, `?cycle=`, `?limit=` |
| `GET /api/article` | Edition files | Single article by `?cycle=` + `?title=` |

### Story & Narrative
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/hooks` | Desk packets (Story_Hook_Deck) | Story hooks for latest cycle. Filter: `?desk=` |
| `GET /api/arcs` | Desk packets (Event_Arc_Ledger) | Multi-cycle arcs with phase, tension, citizens |
| `GET /api/storylines` | Desk packets (Storyline_Tracker) | Storyline status and health |

### Sports & Scores
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/sports` | Desk packets (sports + chicago) | Oakland + Chicago sports feeds and digest |
| `GET /api/scores` | `output/edition_scores.json` | Mara audit scores by edition |

### Mara
| Endpoint | Data Source | Returns |
|----------|-----------|---------|
| `GET /api/mara` | `output/mara_directive_c*.txt` | Latest Mara directive + history of all directives |

---

## Data Sources

The dashboard reads from three layers:

1. **Live Google Sheets** (primary) — Citizens, council, neighborhoods, weather, culture, transit, faith, domains. Uses the service account. Falls back to local files if Sheets API fails.
2. **Local files** (secondary) — Desk packets (`output/desk-packets/`), editions (`editions/`), civic docs, player index, article index, Mara directives.
3. **Parsed editions** — The server parses edition text files into structured articles on startup. Supports both Cycle Pulse (`===` delimiters) and supplemental (`###` delimiters) formats.

---

## Agent Integration Potential

The dashboard API already serves everything agents need:

| Agent Need | Endpoint |
|-----------|----------|
| "Who is Dante Nelson?" | `GET /api/citizens/POP-00636` |
| "What articles mention Beverly Hayes?" | `GET /api/citizen-coverage/Beverly%20Hayes` |
| "What happened last cycle?" | `GET /api/world-state` |
| "What are the active story hooks for civic?" | `GET /api/hooks?desk=civic` |
| "Search for Baylight articles" | `GET /api/search/articles?q=Baylight` |
| "What's the Stabilization Fund status?" | `GET /api/initiatives` |

Currently agents read flat JSON packets from `output/desks/`. Routing them to the dashboard API instead (Phase 2.2 / 5.4 in ROLLOUT_PLAN) would give them targeted data retrieval — ask for one citizen instead of loading 675.

---

## Frontend Status

The frontend is functional but not user-optimized:
- Dark theme, responsive layout, card-based articles
- Login page with cookie-based auth
- Tab navigation across 8 views
- Key Figures section with Tier 1 citizen cards
- **Not mobile-friendly** in current state
- **No real-time updates** — data loads on page load

The backend API is the primary value. The frontend is a visualization layer.

---

## Files

| File | Purpose |
|------|---------|
| `dashboard/server.js` | Express API (1,800+ lines, 31 endpoints) |
| `dashboard/src/` | React frontend source (Vite) |
| `dashboard/dist/` | Built frontend (served as static) |
| `dashboard/index.html` | Entry point |
| `.claude/rules/dashboard.md` | Path-scoped rules (loaded when editing dashboard code) |
