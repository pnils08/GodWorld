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
