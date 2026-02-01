# GodWorld

A **living city simulation engine** for Oakland, California (with Chicago satellite) that generates emergent narratives about citizens, neighborhoods, politics, economics, weather, sports, and culture.

**Engine Version:** v2.11 | **Architecture:** Google Apps Script + Sheets

## Overview

GodWorld runs an **11-phase cycle engine** that simulates city life and outputs data for the **Media Room** (Claude instance) to transform into stories and news content. Each cycle represents roughly one week of in-simulation time.

### Key Features

- **Citizen Simulation** - Tiered citizen system (Tier-1 protected → Tier-4 generic) with relationships, careers, education, and households
- **World Events** - 5-20 events per cycle across 8 categories (CIVIC, CRIME, HEALTH, ECONOMIC, CULTURE, SPORTS, CHAOS, CELEBRATION)
- **12 Oakland Neighborhoods** - Each with mood, local events, and economic indicators
- **Media Integration** - Story hooks, press drafts, and briefing packets for journalists
- **Video Game Integration** - MLB The Show and NBA 2K athletes tracked as citizens
- **Chicago Satellite** - Parallel simulation focused on Bulls basketball

## Technology Stack

- **Google Apps Script** (V8 Runtime) - Execution environment
- **Google Sheets API** - Data persistence across 20+ ledger sheets
- **CLASP** - Deployment tooling

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

See [docs/DEPLOY.md](docs/DEPLOY.md) for detailed deployment instructions.

## Development Workflow

### Git Branching with Claude Code

Each Claude Code chat session creates a branch with the format `claude/<task>-<sessionID>`. The session can only push to its own branch.

**User Deploy (on Cloud Shell):**
```bash
cd ~/GodWorld
git fetch origin
git checkout main
git merge origin/claude/<branch-name>
git push origin main
clasp push
```

**If merge conflicts occur:** User tells Claude, Claude fixes on the branch, user retries.

### Deployment

Code is deployed to Google Apps Script via clasp from Google Cloud Shell:

```bash
cd ~/GodWorld
clasp push
```

The simulation runs in Apps Script. The GitHub repo is the source of truth for code.

## Project Structure

```
GodWorld/
├── phase01-config/       # Cycle initialization, calendar
├── phase02-world-state/  # Weather, city dynamics, seasons
├── phase03-population/   # Demographics, migration, crisis
├── phase04-events/       # World event generation
├── phase05-citizens/     # 14 sub-engines for citizen simulation
├── phase06-analysis/     # Event filtering, pattern detection
├── phase07-evening-media/# Entertainment, media briefings
├── phase08-v3-chicago/   # Game integration, Chicago satellite
├── phase09-digest/       # Cycle compression
├── phase10-persistence/  # Write to ledger sheets
├── phase11-media-intake/ # Feedback processing
├── utilities/            # Shared helpers, caching
├── schemas/              # Data structure documentation
├── docs/                 # Architecture & reference docs
├── maintenance/          # Repair utilities
└── ledgers/              # Archived cycle data
```

## The 11-Phase Engine

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | Config | Set cycle, season, holiday, time basis |
| 2 | World State | Weather, city dynamics, seasonal weights |
| 3 | Population | Demographics, illness, employment, migration |
| 4 | Events | Generate 5-20 world events with severity |
| 5 | Citizens | Relationships, careers, households, civic roles |
| 6 | Analysis | Filter noise, detect patterns, prioritize |
| 7 | Media | Evening content, story hooks, briefing packets |
| 8 | V3/Chicago | Game integration, Chicago satellite |
| 9 | Digest | Compress cycle summary, finalize metrics |
| 10 | Persistence | Write all updates to 20+ ledger sheets |
| 11 | Media Intake | Process journalist feedback |

## Key Ledgers

**Citizens:** `Simulation_Ledger` (named), `Generic_Citizens` (Tier-4), `Chicago_Citizens`

**Events:** `WorldEvents_Ledger`, `Arc_Ledger` (multi-cycle arcs), `Story_Hook_Deck`

**Relationships:** `Relationship_Bonds`, `LifeHistory_Log`

**Media:** `Media_Briefing`, `Press_Drafts`, `Continuity_Loop`

**Civic:** `Civic_Office_Ledger`, `Initiative_Tracker`

## Architecture Highlights

- **Deterministic RNG** - Seeded random generation for reproducibility
- **Sheet Caching** - Reduces API calls by ~93% per cycle
- **Write-Intents Model** - Stages writes in memory, applies in Persistence phase
- **Mode Flags** - `dryRun`, `replay`, `strict`, `profile`

## Documentation

| Document | Description |
|----------|-------------|
| [GODWORLD_REFERENCE.md](docs/GODWORLD_REFERENCE.md) | Complete system reference (356 lines) |
| [V3_ARCHITECTURE.md](docs/V3_ARCHITECTURE.md) | Technical design contract |
| [ENGINE_ROADMAP.md](docs/ENGINE_ROADMAP.md) | Implementation priorities |
| [SCHEMA_HEADERS.md](schemas/SCHEMA_HEADERS.md) | All ledger schemas |

## Main Entry Point

The engine orchestrator is at `phase01-config/godWorldEngine2.js` (~1073 lines). Key function:

```javascript
function runWorldCycle() {
  // Runs all 11 phases sequentially
}
```
