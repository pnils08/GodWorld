# GodWorld

A **living city simulation engine** for Oakland, California that generates emergent narratives about citizens, neighborhoods, politics, economics, weather, sports, and culture — and a full media pipeline (the **Bay Tribune** / Cycle Pulse editions) that reports on the world and feeds back into it.

**Engine Version:** v3.1 | **Architecture:** Google Apps Script + Sheets engine, Node.js tooling & dashboard

## Overview

GodWorld runs an **11-phase cycle engine** that simulates city life and outputs data for the **Media Room** to transform into stories and news content. Each cycle represents roughly one week of in-simulation time (52 cycles = 1 sim-year). Published editions feed back into the engine: coverage ratings, civic decisions, and named entities shape the next cycle's world state.

### Key Features

- **Citizen Simulation** — Tiered citizen system (Tier-1 protected → Tier-4 generic) with relationships, careers, education, households, aging, and death. Bidirectional tier pipeline: generic citizens who keep emerging get promoted to named citizens (`checkForPromotions.js`); faded fame demotes (`decayMediaAttention_`)
- **Economy Engine** — Real money loop (engines 60/61): net worth accrual, debt, inheritance with estate tax, mean-reverting bank rates, neighborhood credit factors, and career/education-driven income (`generationalWealthEngine.js`, `runCareerEngine.js`)
- **Housing & Migration** — Rent burden tracking (warn at 40%, crisis at 50% → household dissolution), neighborhood trajectory drift (`MedianRent`, `HousingPressure`, `TrajectoryMomentum`), and priced-out household relocation between neighborhoods (engine 55)
- **Civic Politics** — Elections (`runCivicElectionsv1.js` → Election_Log), per-initiative approval ratings, and an initiative tracker wired to city-hall voice agents
- **World Events** — 5-20 events per cycle across 8 categories (CIVIC, CRIME, HEALTH, ECONOMIC, CULTURE, SPORTS, CHAOS, CELEBRATION)
- **17 Oakland Neighborhoods** — Each with mood, local events, demographics, rent/income drift, and housing pressure
- **Media Feedback Loop** — `mediaFeedbackEngine.js` turns coverage into sentiment pressure, anxiety/hope factors, per-neighborhood perception shifts, and arc amplification. Post-publish, `rateEditionCoverage.js` + `applyTrackerUpdates.js` + sports-feed triggers write back into the engine; entities named in print are promoted to canon (`ingestPublishedEntities.js`)
- **Fame System** — FameScore, MediaMentions, and FameTrend tracked per citizen; usage in editions drives tier advancement
- **Video Game Integration** — MLB The Show and NBA 2K athletes tracked as citizens
- **Chicago Bureau** — Bulls coverage via the Bay Tribune's Chicago bureau. Note: the Chicago satellite sim is dormant (citizen generation disabled S229; pool frozen at ~124 rows)

## Technology Stack

- **Google Apps Script** (V8 Runtime) — Engine execution environment
- **Google Sheets API** — Data persistence across ~65 ledger tabs
- **CLASP** — Deployment tooling
- **Node.js** — Tooling layer: edition pipeline, engine auditor, backups, grading, Discord bot
- **Express + React/Vite** — Dashboard API and frontend (port 3001)
- **GitHub Actions** — CI (lint + test) and security scanning

## Prerequisites

- **Node.js** (v18+) and npm
- **Google Account** with access to Google Apps Script
- **Git** for version control

## Quick Start

```bash
# First time setup
cd ~
git clone https://github.com/pnils08/GodWorld.git
cd GodWorld
npm install
npx clasp login
npx clasp push

# Run a cycle (in Apps Script editor)
runWorldCycle()
```

See [docs/reference/DEPLOY.md](docs/reference/DEPLOY.md) for detailed deployment instructions.

## Development Workflow

All work happens on `main`. Engine code deploys to Google Apps Script via `clasp push`.

```bash
clasp push    # Deploy engine to Apps Script
npm test      # Run the test suite (gate tests must pass before deploy)
```

The GitHub repo is the source of truth for code. The simulation runs in Apps Script.

## Project Structure

```
GodWorld/
├── phase01-config/       # Cycle initialization, calendar
├── phase02-world-state/  # Weather, city dynamics, seasonal weights
├── phase03-population/   # Demographics, migration, crisis
├── phase04-events/       # World event generation
├── phase05-citizens/     # Citizen sub-engines (wealth, careers, housing, elections, promotions, fame)
├── phase06-analysis/     # Event filtering, pattern detection
├── phase07-evening-media/# Entertainment, media feedback engine, briefings
├── phase08-v3-chicago/   # Game integration, Chicago satellite (dormant)
├── phase09-digest/       # Cycle compression, life-history compression
├── phase10-persistence/  # Write to ledger sheets
├── phase11-media-intake/ # Feedback processing
├── utilities/            # Shared helpers, caching, mode flags, write intents
├── schemas/              # Auto-generated canonical column definitions
├── scripts/              # Node.js tooling (desk packets, photos, PDFs, Drive, Discord, grading,
│                         #   engine-auditor, backups, edition validation/ingest)
├── lib/                  # Shared Node.js libraries (sheets API, photo generator, edition parser)
├── dashboard/            # Express API (40 endpoints) + React/Vite frontend (port 3001)
├── editions/             # Published Cycle Pulse editions + template
├── output/               # Desk packets, briefs, photos, PDFs, grades, pipeline logs
├── backups/              # Daily CSV exports of every sheet tab
├── ledgers/              # Per-cycle ledger snapshots committed to git
├── docs/                 # Architecture, plans, research, engine & media docs (wiki-shaped, see docs/SCHEMA.md)
└── .claude/              # Agent identities, rules, skills, hooks, memory
```

## The 11-Phase Engine

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | Config | Set cycle, season, holiday, time basis |
| 2 | World State | Weather, city dynamics, seasonal weights, published-edition effects |
| 3 | Population | Demographics, illness, employment, migration |
| 4 | Events | Generate 5-20 world events with severity |
| 5 | Citizens | Relationships, careers, wealth, housing, elections, promotions |
| 6 | Analysis | Filter noise, detect patterns, prioritize |
| 7 | Media | Evening content, media feedback engine, story hooks, briefing packets |
| 8 | V3/Chicago | Game integration, Chicago satellite (dormant) |
| 9 | Digest | Compress cycle summary, life-history → trait profiles, finalize metrics |
| 10 | Persistence | Write all updates to ledger sheets |
| 11 | Media Intake | Process journalist/media-room feedback |

## Key Ledgers

**Citizens:** `Simulation_Ledger` (named), `Generic_Citizens` (Tier-4), `Household_Ledger`, `Chicago_Citizens` (frozen)

**Events:** `WorldEvents_Ledger`, `Arc_Ledger` (multi-cycle arcs), `Story_Hook_Deck`

**Relationships:** `Relationship_Bonds`, `LifeHistory_Log`

**Media:** `Media_Briefing`, `Citizen_Media_Usage`, `Media_Ledger`, `Edition_Coverage_Ratings`

**Civic:** `Civic_Office_Ledger`, `Initiative_Tracker`, `Election_Log`

**Economy:** `Business_Ledger` (revenue/employee deltas), citizen NetWorth/debt columns

**Diagnostics:** `Engine_Errors` (unified diagnostic ledger), `World_Drift_Report`

## Testing & Quality

- **Test suite** — `npm test` runs a custom runner over `scripts/` + `lib/` (`*.test.js`, `*.contract.test.js`, `*.gate.test.js`); ~1,000+ assertions. Gate tests must pass before deploy
- **CI** — `.github/workflows/lint.yml` (ESLint + tests on push/PR) and `security.yml`
- **Engine auditor** — `scripts/engine-auditor/`: 15+ drift detectors (stuck initiatives, math imbalances, writeback drift, repeating events, cascade failures, ledger completeness) feeding the `Engine_Errors` tab with remedy recommendations
- **Known limitation** — the Apps Script engine phases themselves are not unit-tested (GAS mocking cost); tests cover the Node.js tooling layer

## Data Safety

- **Daily backups** — full spreadsheet export: Drive copy (exact duplicate) + local CSV of every tab (`scripts/backupSpreadsheet.js`), plus daily tar.gz of local files (7-day retention) offloaded to Drive
- **Weekly droplet snapshots** — DigitalOcean snapshot cron (keeps 4), 6-hourly health checks with Discord webhook alerts
- **Git snapshots** — per-cycle ledger snapshots committed under `ledgers/`
- See [docs/reference/DISASTER_RECOVERY.md](docs/reference/DISASTER_RECOVERY.md)

## Architecture Highlights

- **Deterministic RNG** — Seeded random generation for reproducibility
- **Sheet Caching** — Reduces API calls by ~93% per cycle
- **Write-Intents Model** — Stages writes in memory, applies in Persistence phase
- **Mode Flags** — `dryRun`, `replay` (seeded LCG + checksum diffing), `strict`, `profile` (`utilities/cycleModes.js`)
- **Media Feedback Loop** — Published editions measurably shape the next cycle's world state

## Known Gaps & Roadmap

Tracked in [docs/plans/BACKLOG.md](docs/plans/BACKLOG.md). Highlights of designed-but-unbuilt work:

- **Political ripple locality** — initiative consequences apply city-wide only; per-neighborhood ripple attribution is computed but discarded
- **Inter-neighborhood spillover** — no commuting, crime displacement, or resource competition between the 17 neighborhoods yet
- **Folk memory (27.9)** — neighborhoods remembering the same event differently; the sim tracks what happened, not what people *think* happened
- **Negative feedback loops (27.10)** — corrective pressure for runaway golden eras (scandal probability, displacement from success)
- **Arc state machines (Phase 37)** — structured tension meters and phase progression for multi-cycle arcs
- **Institutions & business lifecycles (36.1/36.2)** — businesses that open, close, expand; schools/hospitals/unions as ledger entities
- **Tribune audio (Phase 30)** — listenable editions, podcast render, civic character voices
- **Headless newsroom** — full pipeline automation (`docs/plans/2026-07-20-headless-newsroom-pipeline.md`)
- **Apps Script execution ceiling** — no chunking/resume if a cycle exceeds the 6-minute limit; write-intents confine writes to Phase 10 as partial mitigation

## Documentation

The docs layer is wiki-shaped (frontmatter + index) — see [docs/SCHEMA.md](docs/SCHEMA.md) and [docs/index.md](docs/index.md) for conventions and the full registry.

| Document | Description |
|----------|-------------|
| [PROJECT_GOALS.md](docs/reference/PROJECT_GOALS.md) | Core automation concept and architecture |
| [GODWORLD_REFERENCE.md](docs/reference/GODWORLD_REFERENCE.md) | Complete system reference |
| [V3_ARCHITECTURE.md](docs/reference/V3_ARCHITECTURE.md) | Technical design contract |
| [BACKLOG.md](docs/plans/BACKLOG.md) | Designed-but-unbuilt phases (27.9 folk memory, 27.10 feedback loops, Phase 36/37, etc.) |
| [ROLLOUT_PLAN.md](docs/engine/archive/ROLLOUT_PLAN.md) | Archived rollout plan — historical record of shipped work |
| [ENGINE_MAP.md](docs/engine/archive/ENGINE_MAP.md) | Every function across all 11 phases (archived) |
| [EDITION_PIPELINE.md](docs/EDITION_PIPELINE.md) | Cycle Pulse pipeline: run-cycle → pre-flight → sift → write-edition → post-publish |
| [DASHBOARD.md](docs/DASHBOARD.md) | Dashboard API and frontend reference |
| [SIMULATION_LEDGER.md](docs/SIMULATION_LEDGER.md) | Citizen ledger schema and semantics |
| [STACK.md](docs/STACK.md) | Full technology stack reference |
| [MEDIA_ROOM_STYLE_GUIDE.md](docs/media/MEDIA_ROOM_STYLE_GUIDE.md) | Newsroom voice, Paulson canon, data rules, editorial chain |

## Main Entry Point

The engine orchestrator is at `phase01-config/godWorldEngine2.js`. Key function:

```javascript
function runWorldCycle() {
  // Runs all 11 phases sequentially
}
```
