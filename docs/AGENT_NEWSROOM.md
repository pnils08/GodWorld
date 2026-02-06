# Bay Tribune Agent Newsroom

**Status:** Planning
**Goal:** 25 autonomous journalist agents that discuss GodWorld without human intervention
**Framework:** Claude Agent SDK (TypeScript/Node.js)
**Last Updated:** 2026-02-06

---

## Why Claude Agent SDK (Not AutoGen)

The previous plan (AUTOGEN_INTEGRATION.md) used Microsoft AutoGen (Python). This replaces it.

| Issue with AutoGen | Agent SDK Solution |
|--------------------|--------------------|
| Python — your stack is Node.js | Native Node.js/TypeScript |
| Shell bridge from OpenClaw to Python | Same runtime, direct integration |
| GroupChat limits (max_round=6, 25 agents can't all speak) | Desk-level subagents, only relevant reporters activate |
| Generic system messages | Full voice profiles loaded from bay_tribune_roster.json |
| No native Claude support | Built by Anthropic for Claude |

**Package:** `@anthropic-ai/claude-agent-sdk`

---

## Architecture

```
Engine cycle ends -> exports/cycle-XX-context.json
    |
ORCHESTRATOR (main agent)
  - Reads cycle context (events, arcs, signals, citizens)
  - Reads signalAssignments from bay_tribune_roster.json
  - Determines which desks activate based on signal types
    |
DESK CONVERSATIONS (parallel subagents)
  +-- Sports Desk --- Anthony + P Slayer + Hal + Tanya + Simon
  |                   signals: athletics_baseball, sports_opinion, sports_history
  |
  +-- Metro Desk ---- Carmen + Luis + Dr. Lila + Trevor + Rachel
  |                   signals: civic, health_arc, infrastructure, crime, shock_event
  |
  +-- Culture Desk -- Maria + Kai + Mason + Angela + Noah + Sharon
  |                   signals: neighborhood_culture, arts, food, education, weather
  |
  +-- Wire Desk ----- Reed + MintCondition + Celeste
  |                   signals: rumor_verified, rumor_chaotic, social_trends
  |
  +-- Chicago Bureau - Selena + Talia
  |                   signals: athletics_basketball_bulls, chicago_street
  |
  +-- Business ------ Jordan Velez
  |                   signals: economics, labor
  |
  +-- Opinion ------- Farrah Del Rio
                      signals: civic_opinion, high-tension flag
    |
Each desk outputs a draft section with bylines
    |
EDITORIAL MEETING (sequential)
  Mags Corliss (Editor):
    - Receives all desk drafts
    - Picks lead story
    - Cuts what doesn't serve readers
    - Assigns follow-up angles for next cycle
    - Writes editorial if warranted
  Rhea Morgan (Copy Chief):
    - Citizen name spelling vs. SQLite roster
    - Timeline consistency
    - Arc continuity
    - Flags issues back to Mags
    |
FINAL OUTPUT: Bay Tribune Pulse (markdown)
  Saved to: media/cycle-XX/tribune-pulse.md
```

---

## Agent Roster (All 25 Journalists)

### Editorial

| Agent | Role | Runs Every Cycle |
|-------|------|------------------|
| Mags Corliss | Editor-in-Chief | Yes - synthesizes all desk output |
| Rhea Morgan | Copy Chief | Yes - continuity/fact check (does not write articles) |

### Sports Desk

| Agent | Role | Beat |
|-------|------|------|
| Anthony | Lead Beat Reporter | A's data, roster moves, scouting |
| P Slayer | Fan Columnist | Opinion, emotional pulse, fan voice |
| Hal Richmond | Senior Historian | Legacy essays, dynasty context |
| Tanya Cruz | Radio/Night | Night games, fan atmosphere |
| DJ Hartley | Stream/Digital | Streaming angles, digital coverage |
| Simon Leary | Stats/Wire | Box scores, statistical analysis |

### Metro Desk

| Agent | Role | Beat |
|-------|------|------|
| Carmen Delaine | Civic Ledger | Government, municipal rhythm, infrastructure |
| Luis Navarro | Managing Editor / Investigations | Anomalies, shock events, patterns |
| Dr. Lila Mezran | Health Desk | Health arcs, clinic capacity, public health |
| Trevor Shimizu | Infrastructure | Transit, construction, city systems |
| Sgt. Rachel Torres | Crime/Safety | Crime metrics, public safety |

### Culture Desk

| Agent | Role | Beat |
|-------|------|------|
| Maria Keen | Community/Faith | Juneteenth, Pride, faith events, neighborhoods |
| Kai Marston | Youth/Music | Youth culture, music scene |
| Mason Ortega | Food/Nightlife | Restaurants, nightlife, local business |
| Angela Reyes | Education | Schools, education events |
| Noah Tan | Arts/Tech | Arts scene, tech community |
| Sharon Okafor | Community Elder | Neighborhood history, oral tradition |

### Wire Desk

| Agent | Role | Beat |
|-------|------|------|
| Reed Thompson | Wire Editor | Verified reports, cross-desk coordination |
| MintConditionOakTown | Speculation/Rumor | Unverified threads, chaos signals |
| Celeste Tran | Social/Trends | Social media trends, community sentiment |

### Chicago Bureau

| Agent | Role | Beat |
|-------|------|------|
| Selena Grant | Chicago Lead | Bulls coverage, Chicago sports |
| Talia Finch | Chicago Street | Chicago neighborhoods, culture |

### Standalone

| Agent | Role | Beat |
|-------|------|------|
| Jordan Velez | Business | Economics, labor, commercial trends |
| Farrah Del Rio | Opinion | Civic opinion, skeptical analysis |
| Arman Gutierrez | Photography | Visual documentation (does not write articles) |

---

## Desk Activation Rules

Not all 25 agents run every cycle. The orchestrator checks which signal types fired and activates only relevant desks.

| Cycle Type | Active Desks | Agents | Est. Cost |
|------------|-------------|--------|-----------|
| Quiet (no civic, no crime, no health) | Sports + Culture | ~10 | $0.30-0.50 |
| Normal (3-4 signal types) | Sports + Metro + Culture | ~15 | $0.50-1.00 |
| Hot (civic vote + health + shock + crime) | All desks | ~22 | $1.00-2.00 |
| Editorial (every cycle) | Mags + Rhea | 2 | $0.20-0.40 |

**Per cycle estimate: $0.50 - $2.50**

---

## Model Tiers

| Role | Model | Reason |
|------|-------|--------|
| Desk reporters | Haiku 4.5 | Fast, cheap, voice lives in system prompt |
| Desk leads (Anthony, Carmen, Luis) | Sonnet 4.5 | Better analysis for lead voices |
| Mags (editorial) | Sonnet 4.5 | Needs to synthesize all desks |
| Rhea (continuity) | Haiku 4.5 | Mechanical validation, no creativity needed |

---

## System Prompt Builder

Each agent's system prompt is generated from their bay_tribune_roster.json profile:

```javascript
function buildAgentPrompt(journalist, cycleData) {
  return `You are ${journalist.name}, ${journalist.role} for the Bay Tribune.

Beat: ${journalist.beat.join(', ')}
Tone: ${journalist.tone}

Opening Style: ${journalist.writingPatterns?.openingStyle}
Sentence Structure: ${journalist.writingPatterns?.sentenceStructure}
Perspective: ${journalist.writingPatterns?.perspective}

Signature Themes: ${journalist.signatureThemes?.join(', ')}
Sample Phrases:
${journalist.samplePhrases?.map(p => `- "${p}"`).join('\n')}

Frequent Subjects: ${journalist.frequentSubjects?.join(', ')}

RULES:
- Write ONLY from the data provided. Do not invent events or citizens.
- Stay in your voice. Your tone and style are non-negotiable.
- Reference citizens by name when relevant.
- Flag anything unusual for Luis (investigations) to follow up.
- Keep your section to 200-400 words.`;
}
```

---

## Data Access (MCP)

Agents query GodWorld data through an MCP server connected to the OpenClaw SQLite database.

### Available Queries

| Tool | Purpose | Used By |
|------|---------|---------|
| `query_citizens` | Look up citizen by POP-ID, name, or tier | All agents |
| `query_cycles` | Get cycle state (sentiment, weather, migration) | Orchestrator, Carmen, Mags |
| `query_arcs` | Active story arcs and their phase/tension | Luis, Mags |
| `query_initiatives` | Civic proposals, vote outcomes | Carmen, Farrah |
| `query_relationships` | Citizen bonds and tensions | Maria, Culture desk |
| `query_events` | World events by category | All agents |
| `search_citizen_articles` | Find all articles mentioning a citizen by POP-ID (from ARTICLE_INDEX_BY_POPID.md) | All agents - continuity checks, backstory |
| `search_article_citizens` | Find all citizens appearing in a given article (from CITIZENS_BY_ARTICLE.md) | Mags, Rhea - cross-reference coverage |

### MCP Server Setup

```javascript
// godworld-mcp-server.js
const { createSdkMcpServer, tool } = require('@anthropic-ai/claude-agent-sdk');
const Database = require('better-sqlite3');
const { z } = require('zod');

const db = new Database('./godworld/godworld.db', { readonly: true });

const queryCitizens = tool(
  'query_citizens',
  'Look up citizens by name, POP-ID, or tier',
  z.object({
    search: z.string().describe('Name, POP-ID, or tier to search'),
    limit: z.number().optional().default(10)
  }),
  async (args) => {
    const rows = db.prepare(
      `SELECT * FROM citizens
       WHERE name LIKE ? OR pop_id LIKE ? OR tier = ?
       LIMIT ?`
    ).all(`%${args.search}%`, `%${args.search}%`, args.search, args.limit);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
);

module.exports = createSdkMcpServer({
  name: 'godworld-data',
  tools: [queryCitizens]
});
```

---

## Desk Conversation Flow

Within each desk, agents collaborate before sending output to editorial:

```
SPORTS DESK EXAMPLE (A's won, attendance spike)
    |
Anthony: "Ramos threw a complete game. Attendance 34,200 —
         highest since Cycle 62. The rotation blueprint is holding."
    |
P Slayer: "The Coliseum had a pulse tonight. 34K showed up
          because this team FIGHTS. Don't let the front office
          forget who fills those seats."
    |
Hal Richmond: "I've seen forty years of nights like this.
              The last time we drew 34K on a Tuesday, it was
              '89 and the dynasty was just getting started."
    |
DESK OUTPUT -> Combined sports section with three bylines
             -> Sent to Mags for editorial placement
```

---

## What Already Exists (Reusable)

| Existing Asset | How It's Used |
|----------------|---------------|
| `bay_tribune_roster.json` (v2.0) | Voice profiles become system prompts |
| `signalAssignments` in roster | Maps event types to journalists |
| `rosterLookup.js` (v2.1) | `findJournalistsByTheme_()`, `suggestStoryAngle_()` |
| `storyHook.js` (v3.8) | Theme-aware hooks tag which journalist fits |
| `applyStorySeeds.js` (v3.9) | Voice-matched seeds with journalist suggestions |
| `media-generator/index.js` | Routing logic (determineRouting) reusable |
| `godworld.sql` schema | SQLite tables ready for MCP queries |
| `godworld-sync` skill | Exports cycle data to SQLite |
| `docs/ARTICLE_INDEX_BY_POPID.md` | Agents look up which articles mention a citizen (326 citizens, 367 articles, 4,922 references) |
| `docs/CITIZENS_BY_ARTICLE.md` | Agents look up which citizens appear in a given article |

---

## Pipeline Prerequisites

The Agent Newsroom depends on a data pipeline that is partially built but not yet connected end-to-end. These layers must work before agents can run.

### Current Pipeline State

```
Engine runs in Google Apps Script (WORKING - Cycle 78)
    |
Export cycle data to local filesystem (CODE EXISTS - exports/ is empty)
    |
Sync exports to SQLite (CODE EXISTS - no data to feed it)
    |
MCP server for agent data access (NOT BUILT)
    |
Agent Newsroom (NOT BUILT)
```

### Layer 1: Data Bridge (Google Apps Script -> Local)

The engine runs in Apps Script and `exportCycleArtifacts.js` exists to write context packs, but `exports/` is currently empty. The bridge between Apps Script and the local filesystem needs to be established.

**Options:**
- Google Sheets API pull via service account (credentials exist but `GODWORLD_SHEET_ID` not configured)
- Apps Script webhook to a local endpoint
- Manual export after each cycle run

**What exists:**
- `exportCycleArtifacts.js` - writes `cycle-XX-context.json`, `cycle-XX-summary.json`, `manifest.json`
- `.env.example` has `GODWORLD_SHEET_ID` placeholder
- Service account project `godworld-486407` created with Drive API enabled

### Layer 2: Local Data Store

SQLite schema exists at `openclaw-skills/schemas/godworld.sql` (11 tables + 4 views) but no database file has been initialized with real data.

**What exists:**
- `scripts/init-db.js` - initializes schema
- `scripts/load-citizens.js` - loads citizen snapshot
- `scripts/sync.js` - syncs exports to SQLite
- `godworld-sync` skill - reads manifest, updates SQLite
- Previous test had 9 citizens loaded

**What's needed:**
- Run `node scripts/init-db.js` to create the database
- Load a full citizen snapshot (326+ citizens from Simulation_Ledger)
- Run at least one sync with real cycle data

### Layer 3: Pipeline Validation

Before building agents, confirm the existing single-agent pipeline works end-to-end.

**What exists:**
- `scripts/generate.js` - CLI runner for media generation
- `media-generator` skill - routes to tribune/continuity agents, has confidence gate
- Previous test produced usable Tribune Pulse output for Cycle 78

**What's needed:**
- Run `node scripts/generate.js` with real cycle data
- Verify Tribune Pulse output quality
- Confirm continuity gate works (blocks publish if score < 0.9)

### Layer 4: Agent Newsroom (New Work)

Only start after Layers 1-3 are validated.

| Component | Description | Depends On |
|-----------|-------------|------------|
| MCP server | GodWorld SQLite exposed as MCP tools | Layer 2 (SQLite populated) |
| System prompt builder | Reads roster JSON, generates per-journalist prompts | bay_tribune_roster.json (ready) |
| Orchestrator | Reads cycle export, activates desks, spawns agents | Layer 1 (exports flowing) |
| Desk runner | Manages conversation within a desk | MCP server + prompt builder |
| Editorial pipeline | Mags receives desk output, Rhea validates | Desk runner |
| Output formatter | Final Pulse markdown with sections and bylines | Editorial pipeline |
| Scheduler | Triggers on new cycle export (cron or file watch) | All above |

---

## What Needs Building

| Component | Description | Priority |
|-----------|-------------|----------|
| Orchestrator | Reads cycle export, activates desks, spawns agents | 1 |
| MCP server | GodWorld SQLite exposed as MCP tools | 1 |
| System prompt builder | Reads roster JSON, generates per-journalist prompts | 1 |
| Desk runner | Manages conversation within a desk (who speaks, in what order) | 2 |
| Editorial pipeline | Mags receives desk output, Rhea validates | 2 |
| Output formatter | Final Pulse markdown with sections and bylines | 3 |
| Scheduler | Triggers on new cycle export (cron or file watch) | 3 |

---

## Open Questions & Design Decisions

*Raised during architecture review. Must be resolved before or during build.*

### 1. Voice Drift at Scale

**Problem:** One journalist profile generating one article is testable. Twenty-five agents writing in parallel across multiple cycles is different. Does Carmen Delaine still sound like Carmen Delaine after fifty articles, or does she drift toward generic Claude?

**Mitigations to test:**
- Keep agent outputs short (200-400 words per section) to reduce drift surface
- Include 2-3 sample phrases from the roster as anchors in every prompt
- Rhea's continuity check could include a voice consistency score (does this sound like Carmen or generic Claude?)
- Test with a single journalist over 10+ outputs before scaling to full newsroom

### 2. Desk Overlap (Cross-Desk Citizen Collisions)

**Problem:** Sports Desk and Metro Desk both write about Mark Aitken attending a council vote. Who catches the overlap? Who decides which version survives?

**Design needed:**
- Desk runner should tag every citizen POP-ID mentioned in each desk's output
- Mags receives a collision report: "POP-00077 (Aitken) mentioned by Sports Desk AND Metro Desk"
- Mags decides: merge, pick one, or assign one desk the lead angle
- This collision detection is not yet designed in the current architecture

### 3. Multi-Signal Story Routing

**Problem:** A story spans health + civic + community. Does it get assigned to three desks? Does something fall through?

**Rules to define:**
- Same-desk multi-signal: works naturally (Metro has Carmen for civic, Lila for health, Maria for community — they coordinate within the desk conversation)
- Cross-desk multi-signal (e.g., health + sports): needs an orchestrator rule
  - Option A: strongest signal wins, one desk gets it
  - Option B: both desks get it, Mags merges (risks duplication)
  - Option C: orchestrator creates a temporary cross-desk assignment with a lead reporter
- Must be defined before building the orchestrator

### 4. Rhea Validating Against Incomplete Data

**Problem:** Rhea checks continuity against SQLite and the Article Index. If those sources are incomplete or have errors, she validates against bad data with high confidence. Garbage in, garbage out.

**Mitigations:**
- Rhea should FLAG issues, not BLOCK publication. Mags makes the final call.
- Confidence score should reflect data completeness (e.g., if SQLite has only 9 of 326 citizens, confidence drops)
- Add a data freshness check: if SQLite hasn't been synced in 5+ cycles, Rhea warns "stale data" instead of running full validation
- The POP-ID index was built from Drive scans, not manually verified — known limitation

### 5. Archive Contradictions

**Problem:** The Article Index records what exists. If two articles say different things about the same citizen, which one wins? Does the agent notice or just pick one?

**Rules to define:**
- Recency bias: later cycle = more authoritative (simulation state evolves)
- Tier weighting: Tier-1 citizen contradictions get escalated to Mags, Tier-4 gets ignored
- If an agent detects conflicting facts, flag it as a continuity note rather than silently picking one
- Long-term: contradictions feed back into the engine's continuity notes parser for future cycles

### 6. Error Handling & Cost on Failed Runs

**Problem:** No circuit breaker. If the MCP server goes down mid-run, all active agents burn tokens trying to query a dead endpoint. Debugging across twenty agents is expensive.

**Design needed:**
- Per-agent timeout (agent that can't get data in 10s = skip, don't retry forever)
- Desk-level error handling: if 3+ agents on a desk fail, skip that desk entirely
- Dry-run mode: orchestrator pre-checks all layers (SQLite reachable? Exports exist? Roster loads?) before spending on generation
- Failed run output: save partial results and error log so you can see what broke without re-running
- Budget cap per cycle (e.g., $5 hard limit — if hit, stop all agents and save what exists)

---

## File Structure (Proposed)

```
godworld-newsroom/
  orchestrator.js          # Main entry - reads cycle, activates desks
  desk-runner.js           # Manages agent conversation within a desk
  editorial.js             # Mags + Rhea editorial pipeline
  prompt-builder.js        # Builds system prompts from roster JSON
  mcp-server.js            # MCP server for SQLite data access
  config.js                # API keys, model selection, paths
  output/
    cycle-78/
      tribune-pulse.md     # Final formatted output
      desk-sports.md       # Raw desk output (for debugging)
      desk-metro.md
      editorial-notes.md   # Mags' editorial decisions
      continuity-check.md  # Rhea's validation report
```

---

## Replaces

This plan replaces `docs/AUTOGEN_INTEGRATION.md` (Microsoft AutoGen / Python approach). The AutoGen doc is kept for historical reference but is no longer the active plan.

This plan does NOT replace:
- `openclaw-skills/media-generator/index.js` - Still useful for single-agent quick generation
- `docs/OPENCLAW_INTEGRATION.md` - OpenClaw is the data layer that feeds the newsroom
