---
title: Search & Retrieval Functions — World Data
created: 2026-07-31
updated: 2026-07-31
type: reference
tags: [infrastructure, engine, active]
sources:
  - scripts/godworld-mcp.py (read in full, 2026-07-31)
  - scripts/queryLedger.js (read in full, 2026-07-31)
  - lib/mags.js searchDisk/searchSupermemory (2026-07-31)
  - lib/citizenPage.js (read in full, 2026-07-31)
  - docs/SUPERMEMORY.md §Search/save matrix
pointers:
  - "[[SUPERMEMORY]] — container map these functions read from"
  - "[[engine/ROLLOUT_PLAN]] — engine.91 canon ingest sweep"
---

# Search & Retrieval Functions — World Data

Every function/tool that retrieves GodWorld **world** data (citizens, businesses,
initiatives, canon, neighborhoods). Not a container map — see [[SUPERMEMORY]] for
that. This is "which function do I call."

## Which tool for which question

| Question shape | Tool | What it searches |
|---|---|---|
| Exact entry: a specific citizen's row/field | `queryLedger.js citizen <name\|POPID>` | `Simulation_Ledger` direct read (54 cols) |
| Fuzzy/canon: "who is this person" | MCP `lookup_citizen(name)` | `wd-citizens` card + `bay-tribune` published history |
| Two citizens' shared bonds/household | `queryLedger.js pair <a> <b>` | `Simulation_Ledger` + `Relationship_Bonds` + `Household_Ledger` |
| Business by name | MCP `lookup_business(name)` | `wd-business` |
| Faith org by name | MCP `lookup_faith_org(name)` | `wd-faith` |
| Cultural figure (athlete/artist/celeb) | MCP `lookup_cultural(name)` | `wd-cultural` |
| Initiative status/phase/budget | MCP `lookup_initiative(name)` or `queryLedger.js initiative` | `output/initiative_tracker.json` (authoritative) → `wd-initiative` fallback |
| Council member by district/name | MCP `get_council_member(district)` or `queryLedger.js council` | `truesource_reference.json` → `Civic_Office_Ledger` |
| Neighborhood demographics/sentiment | MCP `get_neighborhood_state(name)` or `queryLedger.js neighborhood` | `wd-neighborhood` / live `Simulation_Ledger` + `Business_Ledger` slice |
| Player roster (A's, etc.) | MCP `get_roster(team)` | `output/desk-packets/truesource_reference.json` |
| "What has the Tribune published about X" | MCP `search_canon(query)` | `bay-tribune`, provenance-filtered |
| Broad city-state search, don't know entity type | MCP `search_world(query)` | fan-out over all `wd-*` domain tags |
| Don't know entity type AND want canon+articles+disk too | MCP `search_everything(query)` | world-data + bay-tribune + dashboard articles + live disk grep, concurrently |
| Free-text term across every sheet (audit/verify) | `queryLedger.js verify <term>` | 6 core ledger sheets, full-row scan |
| Term appearing in a published article | `queryLedger.js articles <term>` or MCP `search_articles` | `editions/` + `output/drive-files/` (CLI) vs dashboard article index (MCP) — not the same corpus, see below |
| Discord bot / citizen-loop free-text city search | `search_world` (Discord tool) → `lib/mags.js searchDisk` | live grep `output/` + `docs/` + `editions/` |
| A citizen's own private reflections/journal | `lib/citizenPage.js readPage_`/`recentPage_` | `citizen-pages` container, tag `cp-POP-XXXXX` |

## MCP surfaces — `scripts/godworld-mcp.py`

All `@mcp.tool()` functions. Consumers: any Claude Code session/agent with the
`godworld` MCP server wired (`.claude/settings.json` allowlist), desk agents,
`source-search` agent, skills (`interview`, `desk-slice`, `city-hall-prep`,
`make-citizen-voice`, `self-debug`).

| Tool | Line | Backing shelf | Matching semantics | Staleness |
|---|---|---|---|---|
| `lookup_citizen(name)` | L382 | `wd-citizens` (hybrid, threshold 0.3) + `published_canon_search` (bay-tribune, recency-sorted) | semantic hybrid | indexed (Supermemory) |
| `lookup_initiative(name)` | L398 | `output/initiative_tracker.json` (exact ID/substring-name match) + latest `output/desk-packets/civic_c*.json`; falls back to `wd-initiative` semantic search only on tracker miss | exact-match first, semantic fallback | live file read (tracker), indexed (fallback) |
| `search_canon(query)` | L487 | `published_canon_search` → `bay-tribune`, `metadata_filter={source: edition-ingest}` | semantic hybrid, threshold 0.3 | indexed |
| `search_world(query)` | L495 | `search_world_domains` — fans out over all 8 `WORLD_DOMAIN_TAGS` (see below) | semantic hybrid, threshold 0.3, per domain | indexed |
| `search_articles(query)` | L504 | dashboard API `/api/search/articles` | dashboard's own index (not inspected here) | dashboard-indexed |
| `get_roster(team)` | L515 | `output/desk-packets/truesource_reference.json`, `asRoster` key | exact team-alias map | live file read |
| `get_neighborhood(name)` | L580 | `wd-neighborhood` | semantic hybrid, threshold 0.3 | indexed |
| `get_neighborhood_state(name)` | L708 | same as above — explicit structured-card contract, same backing domain | semantic hybrid, threshold 0.3 | indexed |
| `get_council_member(district)` | L594 | `truesource_reference.json` council array (primary) | exact | live file read |
| `get_domain_ratings(cycle)` | L655 | dashboard `/api/health` + `published_canon_search` | semantic | indexed |
| `lookup_business(name)` | L675 | `wd-business` | semantic hybrid, threshold 0.3 | indexed |
| `lookup_faith_org(name)` | L684 | `wd-faith` | semantic hybrid, threshold 0.3 | indexed |
| `lookup_cultural(name)` | L694 | `wd-cultural` | semantic hybrid, threshold 0.3 | indexed |
| `search_everything(query)` | L723 | federated: `search_world_domains` + `published_canon_search` + dashboard articles + `disk_search`, all four concurrent, each degrades independently | mixed (semantic + literal/AND-of-terms) | mixed |

### Internal shelves these tools compose

- **`disk_search(query, max_files=12)`** (L295) — live `grep -rIliF` (fixed-string,
  case-insensitive) across `output/` + `docs/` + `editions/`, no index, reads
  files every call. **As of S345 (2026-07-31):** tries the full query as an exact
  phrase first; if zero files match and the query has >1 term, falls back to
  AND-of-terms (every term present, any order — same semantics as `lib/mags.js
  searchDisk`). Ranked via `_disk_rank`: live ledger snapshot > desk-packets >
  other `output/*.json` > other `output/` > `editions/` > `docs/*` (non-Mags) >
  `docs/mags-corliss/*` (journals, ranked last — noisy). Guarantees at least 2
  `editions/` hits survive the 12-file cap if any matched. Includes
  `output/drive-files` implicitly (under `output/`). Called by `search_everything`
  and indirectly documents the pattern `lib/mags.js searchDisk` mirrors.
- **`search_world_domains(query, per_domain_limit=2)`** (L216) — fans a
  `supermemory_search` call out over all 8 `WORLD_DOMAIN_TAGS` (`wd-citizens`,
  `wd-business`, `wd-faith`, `wd-cultural`, `wd-neighborhood`, `wd-initiative`,
  `wd-player-truesource`, `wd-summary`) via a 3-worker `ThreadPoolExecutor`
  (bounded for the 1 GB droplet). Backs `search_world`.
- **`published_canon_search(query, limit=5, sort=None)`** (L200) — wraps
  `supermemory_search` against `bay-tribune` with `PUBLISHED_CANON_FILTER`
  (`source=edition-ingest` only — excludes mixed archive/Drive-ingest noise).
  Backs `lookup_citizen`, `search_canon`, `get_domain_ratings`.
- **`supermemory_search(query, container, limit, mode, threshold, sort,
  metadata_filter, project, label)`** (L124) — the base Supermemory API v3
  search wrapper every named-container tool calls. `mode='hybrid'` +
  `threshold=0.3` is the standard pairing (default CLI `memories` mode/threshold
  0.6 misses short structured cards — S197).
- **`dashboard_get(endpoint)`** (L244) — HTTP GET to `localhost:3001` dashboard
  API with basic-auth from `DASHBOARD_USER`/`DASHBOARD_PASS`; backs
  `search_articles` and part of `search_everything`.

## `scripts/queryLedger.js` — CLI modes

Direct-sheet CLI (`node scripts/queryLedger.js <mode> <arg>`), no Supermemory
involvement, no MCP round-trip. Reads via `lib/sheets.js` (service account,
live Google Sheets read). Consumers: any terminal session doing exact-row
lookups, `/city-hall-prep`, ad hoc verification.

| Mode | Function | Reads | Notes |
|---|---|---|---|
| `citizen` | `queryCitizen` (L238) | `Simulation_Ledger` (exact name/POPID match) + `LifeHistory_Log` (last 10) + `Relationship_Bonds` + `Household_Ledger` | Emits **all 54** `Simulation_Ledger` columns via `buildCitizenProfile` (L121) — deliberately not trimmed (S345: trimming blinded story agents to migration/family-graph/memory fields). Parses `LifeHistory` lines matching either `YYYY-MM-DD` or `Y<n>C<m>` cycle-calendar shape via `parseLifeHistory` (L101). Age always computed `2041 − BirthYear`, never the empty `Age` column. |
| `pair` | `queryPair` (L257) | same sheets as `citizen`, for two citizens | Returns both full profiles + shared household/neighborhood/spouse flags + direct bonds + shared third-party bond partners. |
| `initiative` | `queryInitiative` (L324) | `Initiative_Tracker` (substring match on ID/name) + `Civic_Office_Ledger` for vote context | |
| `council` | `queryCouncil` (L378) | `Civic_Office_Ledger`, optional filter on faction/district/holder/officeId | Splits into council (9 seats) vs staff. |
| `neighborhood` | `queryNeighborhood` (L415) | `Simulation_Ledger` (citizens) + `Business_Ledger` + `WorldEvents_V3_Ledger`, all substring-matched on neighborhood name | |
| `articles` | `queryArticles` (L476) | `editions/*.txt` (canon, current pipeline) + `output/drive-files/**/*.txt` (deep archive, 680+ files) | Literal substring, case-insensitive, line-level with ±2 line context. Distinct corpus from MCP `search_articles`, which hits the dashboard API index instead. |
| `verify` | `queryVerify` (L618) | `Simulation_Ledger`, `Initiative_Tracker`, `Civic_Office_Ledger`, `Business_Ledger`, `WorldEvents_V3_Ledger`, `Storyline_Tracker` — every column of every row | Brute-force full-row substring scan; used for auditing whether a term appears anywhere in structured data. |

## `lib/mags.js` — Discord bot / citizen-loop search

- **`searchDisk(query, maxFiles=10)`** (L593) — strict AND-of-terms grep chain:
  first term matched via `grep -rIli` over `output/` + `docs/` + `editions/`,
  each subsequent term filters that file list further (`grep -Ili` on the
  survivors). No exact-phrase-first attempt (unlike the MCP `disk_search`
  post-S345 update). Ranking: live ledger snapshot > `editions/` > current
  `world_summary_c*.md` > other `output/` > everything else; ties broken by
  extracted cycle number descending. Exposed to Discord bots as the
  `search_world` tool (`scripts/mags-discord-bot.js` L496) — free, zero-API-cost,
  in-process. Also used by `scripts/cron-desk-writer.js` and
  `scripts/discord-reflection.js`.
- **`searchSupermemory(query, limit=3, timeoutMs=5000)`** (L678) — direct
  Supermemory v3 `/search` call against the single hardcoded container `mags`
  (`SUPERMEMORY_CONTAINER = 'mags'`, L13). Returns only chunks flagged
  `isRelevant`. Fails soft (empty string) on any error/timeout — callers never
  crash on a Supermemory outage. Called by `daily-reflection.js` and
  `discord-reflection.js` for Mags' own archive-context recall (not a
  general-purpose world-data search — it's her personal brain lane).

Note: `searchSupermemory(query, container)` is re-implemented independently in
~7 `scripts/build*Cards.js` batch card-builders (Citizen/Business/Faith/
Cultural/Initiative/Neighborhood/ArchiveContext) that populate the `wd-*`
containers the MCP tools above read from. Write-side, not query-time — out of
scope here beyond flagging the name collision.

## `lib/citizenPage.js` — per-citizen page recall

Isolated from every other shelf above — reads/writes only the `citizen-pages`
Supermemory container, tag `cp-POP-XXXXX` per citizen. Never touched by MCP
`lookup_citizen`, `search_world`, or any desk agent; wake-side only (never
called from the deterministic cycle path).

- **`readPage_(popId, query, limit=10)`** (L96) — v4 hybrid search scoped to
  the citizen's own tag (`containerTag: cp-POP-XXXXX`). Relevance-ranked.
- **`recentPage_(popId, limit=3)`** (L124) — recency retrieval, NOT v4 search:
  v4 hybrid search silently misses documents that provably exist (verified
  S272/S329), so this lists via `/v3/documents/list` then fetches each doc's
  raw content via per-ID `GET /v3/documents/{id}` (list-only returns an
  auto-summary, not raw text). Use this, not `readPage_`, for "citizen's
  recent reflections."
- Consumers: citizen-wake flow (Phase-2 narrative store, research.19),
  `magsPageRecall.js` (Mags' own EIC memory injection from her citizen page).

## Supermemory CLI (manual/ad hoc)

`npx supermemory search "<query>" --tag <container> [--mode hybrid --threshold
0.3] [--filter '{...}'] [--json]` — same v3/v4 API the above wrappers call,
run directly. Full per-question command table: `docs/SUPERMEMORY.md` §Search/save
matrix (L270+).

## Container/tag targets (cross-reference)

| Tag/container | Tool(s) reading it |
|---|---|
| `wd-citizens` | `lookup_citizen`, `search_world` fan-out |
| `wd-business` | `lookup_business`, `search_world` fan-out |
| `wd-faith` | `lookup_faith_org`, `search_world` fan-out |
| `wd-cultural` | `lookup_cultural`, `search_world` fan-out |
| `wd-neighborhood` | `get_neighborhood`, `get_neighborhood_state`, `search_world` fan-out |
| `wd-initiative` | `lookup_initiative` (fallback only), `search_world` fan-out |
| `wd-player-truesource` | `search_world` fan-out (elite Tier-1/2 A's players) |
| `wd-summary` | `search_world` fan-out (per-cycle world summaries) |
| `bay-tribune` | `search_canon`, `lookup_citizen`, `get_domain_ratings`, `search_everything` |
| `mags` | `lib/mags.js searchSupermemory` (Mags' personal archive lane only) |
| `citizen-pages` (`cp-POP-XXXXX`) | `lib/citizenPage.js` only |

## Out of scope

- **`graphify query "..."`** — persistent code-dependency graph. Searches the
  **codebase structure**, not world/citizen data. Mentioned here only to rule
  it out as a world-data search surface.
- **`claude-mem` / `mem-search`** — searches **session memory** (past Claude
  Code conversations, observations), not GodWorld world data. Use it to
  recall "what did a past session learn about this file," never to answer "who
  is this citizen" or "what happened in the sim."
