---
title: GodWorld Dashboard
created: 2026-03-20
updated: 2026-08-03
type: reference
tags: [infrastructure, sports, active]
sources:
  - dashboard/server.js
  - dashboard/sportsRoutes.js
  - dashboard/src/App.jsx
  - dashboard/package.json
  - live PM2, Tailscale Serve, UFW, and authenticated route verification 2026-08-03
pointers:
  - "[[STACK]] — service and provider inventory"
  - "[[OPERATIONS]] — dashboard health, transport, and recovery runbooks"
  - "[[OAKLAND_SPORTS_FEED]] — feed and roster contract"
  - "[[plans/2026-07-30-oakland-sports-workspace]] — sports workspace rollout"
  - "[[plans/2026-08-02-sports-stat-event-intake]] — gated stat and roster mutation work"
---

# GodWorld Dashboard

The Dashboard is a private single-operator browser UI and authenticated local
JSON API for inspecting GodWorld. It reads live Sheets and repository
artifacts; it is not a canon authority. Sheets remain authoritative for
structured world state, and published Bay Tribune artifacts remain
authoritative for narrative appearances.

## Current runtime

| Item | Verified state |
|---|---|
| Private URL | `https://godworld.tail6d8700.ts.net` from a device connected to Mike's tailnet |
| Local URL | `http://127.0.0.1:3001` on the droplet |
| Process | PM2 `godworld-dashboard`, online, running `dashboard/server.js` |
| Stack | Express 4, React 19, Vite 6 |
| Frontend | `dashboard/dist/` is served directly by Express |
| Authentication | Basic auth or the login cookie; credentials load from `/root/.config/godworld/.env` |
| Private transport | Tailscale Serve terminates HTTPS and proxies `/` to `http://127.0.0.1:3001` |
| Direct port | The Node process currently listens on `0.0.0.0:3001`, but UFW has no IPv4 or IPv6 rule allowing `3001/tcp` |
| Sports writes | Disabled and not fully configured; `POST /api/sports/entries` returns `403 sports_write_disabled` |

The transport, firewall, PM2 state, and authenticated route reads were
reverified on 2026-08-03. The operator also verified the private URL from a
Chromebook.

### Authentication exceptions

When Dashboard credentials are configured, all routes require Dashboard auth
except:

- `GET /api/health`, `/login`, and `/auth`;
- localhost-only `POST /api/session-events`;
- `POST /api/webhooks`, which uses `x-webhook-secret` instead.

`POST /api/actions/restart-bot`, `DELETE /api/session-events`, and the sports
write route are mutating operations. They were not exercised while truthing
this document.

## Frontend tabs

The built frontend contains ten views:

| Tab | Current source and purpose |
|---|---|
| Edition | Latest parsed Edition, supplemental links, top cards, and Tier 1 key figures |
| Newsroom | Journal preview, desk packet status, Mara scores, file/index counts, reporter roster, and process summary |
| Council | Live `Civic_Office_Ledger` council and mayor rows |
| Tracker | Editorial initiative tracker merged with recent civic desk outcomes, civic documents, and related articles |
| Intel | Latest desk-packet hooks, arcs, and storylines; any of these collections may legitimately be empty |
| Sports | Exact-Cycle A's/Oaks workspace, live rosters and state, local non-canon Notebook inbox, preview, and gated confirmation |
| City | Neighborhood cards from `Neighborhood_Map`, enriched from demographics and crime data |
| Search | Full-text article search across the aggregated Edition/archive/civic-document corpus |
| Chicago | Deprecated sports packet's Chicago slice plus Chicago-section article search |
| Mission | Service health, persisted session events, and authenticated quick actions |

The frontend loads core data on page load and lazy-loads Newsroom, Intel,
Chicago, and Mission. It has no general real-time subscription. Sports provides
its own refresh and Cycle controls.

## API contract

The source registers 42 `/api/*` routes: 35 GET, 6 POST, and 1 DELETE. The
tables below describe source contracts. A `200` means that the route completed;
an empty collection is still a valid result and does not prove that its
upstream artifact is fresh.

### System and operations

| Method and route | Source / behavior |
|---|---|
| `GET /api/health` | Unauthenticated process health plus latest local ledger-archive directory and latest main Edition filename |
| `GET /api/world-state` | `base_context.json` when present, enriched with live weather/config/population; otherwise live Sheet and Edition fallback |
| `GET /api/newsroom` | Journal, desk packets, Edition corpus, roster schema, indexes, score file, citizen archive, and PM2 dump/PID files |
| `GET /api/session-events` | In-memory/file-backed event ring; optional `since` and `type` filters |
| `POST /api/session-events` | Local hook intake; appends to `output/session-events.jsonl` |
| `DELETE /api/session-events` | Clears the in-memory ring and persisted event file |
| `POST /api/webhooks` | Secret-authenticated external event intake |
| `POST /api/actions/restart-bot` | Restarts only `mags-bot` through PM2 |
| `POST /api/actions/health-check` | Returns disk, memory, uptime, and live PM2 JSON; also records an event |

### Citizens, civic state, and world state

| Method and route | Source / behavior |
|---|---|
| `GET /api/citizens` | Live `Simulation_Ledger`, with latest ledger archive fallback; filters: `tier`, `neighborhood`, `search`, `limit` |
| `GET /api/citizens/:popId` | Live/fallback ledger record plus life events, citizen archive, voice card, Edition appearances, and optional player profile |
| `GET /api/citizen-coverage/:nameOrId` | Name-or-ID text matches across the aggregated Edition corpus |
| `GET /api/council` | Live `Civic_Office_Ledger`, with ledger archive fallback |
| `GET /api/neighborhoods` | Live `Neighborhood_Map`, with ledger archive fallback, enriched by `Neighborhood_Demographics` and `Crime_Metrics` |
| `GET /api/initiatives` | `initiative_tracker.json`, recent civic packet outcomes, related articles, and civic database filings |
| `GET /api/civic-documents` | `output/city-civic-database/`; filters: `initiative`, `type`, `cycle` |
| `GET /api/weather` | Live `Cycle_Weather` |
| `GET /api/culture` | Live `Cultural_Ledger` |
| `GET /api/transit` | Live `Transit_Metrics` |
| `GET /api/faith` | Live `Faith_Organizations` |
| `GET /api/domains` | Live `Domain_Tracker` |

### Editions, articles, and newsroom indexes

| Method and route | Source / behavior |
|---|---|
| `GET /api/edition/latest` | Latest `cycle_pulse_edition_<N>.txt` in `editions/`, parsed into header and Articles |
| `GET /api/edition/:cycle` | Main Edition and supplemental `.txt` files for one Cycle from `editions/` |
| `GET /api/editions` | Deduplicated Edition-level inventory; individual Drive-cache Articles are reported separately as `archiveArticleCount` |
| `GET /api/search/articles` | Full-text search across the aggregated corpus; requires one of `q`, `author`, `section`, or `citizen`; optional `cycle`, `limit` |
| `GET /api/article?file=F&index=N` | One parsed Article selected by the exact search-result file and zero-based `articleIndex` |
| `GET /api/article/raw?file=F` | Raw text for one sanitized filename in `editions/`; used for supplemental display |
| `GET /api/articles/index` | `output/article-index.json`; filters: `cycle`, `desk`, `author`, `classification`, `q`, `limit` |
| `GET /api/hooks` | Latest desk-packet hooks; filters: `desk`, `domain`, `priority` |
| `GET /api/arcs` | Latest desk-packet arcs; filters: `domain`, `phase` |
| `GET /api/storylines` | Latest desk-packet storylines; filters: `status`, `priority`, `neighborhood` |
| `GET /api/scores` | `output/edition_scores.json` |
| `GET /api/mara` | Legacy `output/mara_directive_c<N>.txt` history and latest text |
| `GET /api/roster` | `schemas/bay_tribune_roster.json` |

The aggregated article corpus is assembled in this priority order:

1. `editions/` — current canonical Edition and supplemental files;
2. `output/drive-files/` — older Drive cache when present;
3. `output/city-civic-database/` — civic documents;
4. `archive/articles/` — curated historical Articles.

Filename and content fingerprints remove duplicates. Counts are intentionally
not hard-coded here because they change as artifacts are filed.

### Players and sports

| Method and route | Source / behavior |
|---|---|
| `GET /api/players` | `output/player-index.json`; filters: `sport`, `team`, `position`, `q`, `limit` |
| `GET /api/players/:popId` | Exact POPID player record, with an optional name fallback for universe players |
| `GET /api/sports` | Deprecated Oakland/Chicago desk-packet compatibility endpoint; Oakland callers should migrate |
| `GET /api/sports/overview?cycle=N` | Live feed and both rosters; exact-Cycle events, effective state, roster counts, available Cycles, provenance, warnings |
| `GET /api/sports/workspace?cycle=N&team=as\|oaks` | One live team workspace with citizen-resolved roster, state, events, valid fields/actions, and public write policy |
| `GET /api/sports/notebook?limit=1..7` | Complete local NotebookLM Daily News artifacts only; permanent `NOT_CANON`; invokes no NotebookLM call |
| `POST /api/sports/preview` | Deterministic feed/stat/roster preview; does not write |
| `POST /api/sports/entries` | Signed, revalidated, atomic write boundary; currently disabled |

## Live verification snapshot

Authenticated localhost probes on 2026-08-03 exercised all 35 registered GET
routes with valid required parameters:

- every GET route returned `200`;
- dynamic citizen detail, citizen coverage, player detail, Cycle Edition,
  parsed Article (`file` + `index`), and raw Edition (`file`) routes returned
  their expected shapes;
- the live citizens, council, neighborhoods, weather, culture, transit, faith,
  domains, and sports routes reported live-Sheet sources;
- `/api/arcs` and `/api/storylines` returned valid empty collections;
- `/api/health` reported latest local ledger archive `cycle-75` and latest main
  Edition `cycle_pulse_edition_101.txt`; these are different artifacts and must
  not be treated as one current-Cycle signal;
- the current article index reports 274 unique entries from 293 files, while
  full-text search scans a broader aggregated corpus;
- A's workspace returned 90 roster rows, Oaks returned 7, and both resolved
  successfully after the A's roster contract repair;
- all 90 A's POPIDs resolved to citizens and none of the 90 A's `Middle` cells
  were populated.

Counts in this snapshot are evidence for the audit date, not durable schema
contracts.

## Oakland sports boundary

The live `As_Roster` contract is 22 physical columns (`A:V`):

- batting SO is column O;
- SV is column S and is displayed read-only;
- pitching SO is column T and is allowlisted for reviewed stat capture;
- pitching BB is column U and is allowlisted for reviewed stat capture;
- WAR is column V and is displayed read-only.

The private overview and both team workspaces returned `200` after the
2026-08-03 dashboard restart. `POST /api/sports/entries` was separately probed
and returned `403 sports_write_disabled`; no Sheet write occurred.

The writer reports `configured: false`; the current non-loopback Node listener
alone is enough to fail its transport-ready condition. Secret and cookie
readiness are intentionally not exposed by the public policy response. This
does not block private read-only use: UFW blocks direct public `3001`, and
Tailscale Serve supplies private HTTPS. It does keep confirmation unavailable.

The full stat/roster mutation contract, atomic read-back, audit behavior, and
remaining proving gates live in
[[plans/2026-08-02-sports-stat-event-intake]]. Sports writes must remain
disabled unless the builder separately approves configuration and a proving
event.

## Caches and freshness

| Data path | Current behavior |
|---|---|
| General live Sheets | In-memory 10-minute cache; refresh errors return the prior cached value when one exists |
| Citizens, council, neighborhoods | Live Sheet primary; selected ledger-archive fallback when no live value is available |
| Sports overview/workspace/preview | 60-second per-Sheet cache with cache age, cache-hit, stale state, and warnings in provenance |
| Sports confirmation | Re-reads fresh bound sources before a write can proceed |
| Edition/search corpus | Five-minute in-memory directory scan and parse cache |
| Article and player JSON indexes | Ten-minute in-memory cache |
| Session events | Up to 500 events in memory, restored from and appended to `output/session-events.jsonl` |
| Other local JSON/text | Read from disk when the owning route runs |

On a server restart, all in-memory caches clear. The first request repopulates
them.

## Agent and script access

Local API calls still require authentication unless they use an exception
listed above.

| Consumer | Current state |
|---|---|
| `scripts/godworld-mcp.py` | Sends Basic auth from Dashboard environment variables; article search is working |
| `scripts/mags-discord-bot.js` | Sends Basic auth for its article-search shelf |
| `scripts/buildPopidArticleIndex.js` | Loads the canonical environment and sends Basic auth |
| `.claude/hooks/session-event-post.sh` and HTTP hooks | Use the localhost-only unauthenticated session-event exception |
| `scripts/server-health-check.sh` | Uses unauthenticated `/api/health` |
| `scripts/buildArchiveContext.js` | Calls protected article search without auth and currently degrades to an empty Dashboard result |
| `scripts/weekly-maintenance.sh` | Calls protected `/api/citizens` without auth and currently observes `401` instead of a health result |

The last two entries are caller drift, not transport failures. They require
separate script changes if those consumers should use protected data.

## Known current drift

- Dashboard version labels disagree: `dashboard/package.json` and PM2 report
  `1.0.0`, `/api/health` says `GodWorld Dashboard v1.0`, and the startup log
  says API `v3.0`. Treat these as labels, not a release contract.
- The Newsroom process card reads PM2 dump/PID files using a filename
  assumption that currently marks `godworld-dashboard` and
  `wd-cards-daemon` stopped even while PM2 reports them online. Mission's
  explicit health-check action uses live `pm2 jlist` and is the stronger
  process view.
- The latest ledger archive reported by health is much older than the latest
  Edition. Use the endpoint's named fields and provenance; do not infer a
  canonical Cycle from their maximum or equality.
- Current latest desk packets contain hooks but no arcs or storylines, so Intel
  renders those two sections empty.
- `citizen_archive.json` currently contributes zero citizens to the Newsroom
  summary. Citizen detail still returns live ledger data and Edition
  appearances, but archive/voice-card enrichment depends on that local
  artifact.

## Build, restart, and recovery

- Frontend changes require `npm run build` from `dashboard/`. The build
  overwrites ignored `dashboard/dist/`, which the live Express process serves
  immediately; a PM2 restart is not required for asset-only changes.
- Backend changes under `dashboard/server.js`, `dashboard/sportsRoutes.js`, or
  imported server-side scripts require `pm2 restart godworld-dashboard`.
- A restart clears in-memory caches and rotates the login cookie token. Users
  may need to sign in again.
- Do not reopen public `3001/tcp` as a recovery step. Follow
  [[OPERATIONS]] §Private Dashboard access and §Failure recovery.
- The server itself may not resolve its own tailnet hostname. Server-side
  callers should use `127.0.0.1:3001`; browser clients should connect through
  Tailscale with its DNS setting enabled.

## Files

| File | Purpose |
|---|---|
| `dashboard/server.js` | Express app, authentication, general routes, data readers, and static serving |
| `dashboard/sportsRoutes.js` | Versioned sports routes, projection, preview, and write-policy enforcement |
| `dashboard/src/App.jsx` | Main ten-tab React shell |
| `dashboard/src/components/Sports*.jsx` | Oakland sports workspace and confirmation UI |
| `dashboard/src/lib/sportsApi.js` | Sports contract client and typed errors |
| `dashboard/dist/` | Ignored production frontend build served by Express |
| `output/session-events.jsonl` | Persisted session-event ring |
| `output/article-index.json` | Prebuilt Article index route source |
| `output/player-index.json` | Player API route source |
| `output/initiative_tracker.json` | Editorial initiative status layer |

## Changelog

- 2026-08-03 (Codex) — Replaced the mixed S106/current-state audit with a
  source- and runtime-verified reference: current private transport and auth,
  all 42 API routes, correct article parameters and cache durations, live
  sports schema/read proof, authenticated caller status, and explicit remaining
  drift.
