# OpenClaw Integration Plan for GodWorld

**Status:** Planning
**Goal:** Autonomous media layer with persistent citizen memory
**Last Updated:** 2026-02-02

---

## Why OpenClaw?

Current pain points with Claude Code / ChatGPT media sessions:
- No persistent memory (re-explain citizens, arcs, factions every session)
- Manual copy-paste of cycle data
- No scheduled automation
- Context resets lose continuity

OpenClaw solves:
- **Local execution** — no data sent to cloud
- **Persistent memory** — remembers citizens, their history, relationships
- **Autonomous triggers** — watch for cycle exports, auto-generate content
- **Multi-agent routing** — different "voices" for Tribune vs Echo

---

## Phase 1: Citizen Memory Layer

### Problem
Every media session requires re-teaching who citizens are:
- "Ramon Vega is IND swing voter, fence-sitter, key to initiatives"
- "Elliott Crane is CRC, currently injured, missed vote"
- "Denise Carter is OPP Council President"

### Solution: Citizen Context Store

OpenClaw maintains a local JSON/SQLite store of citizen profiles:

```
citizens/
├── POP-00042.json  (Ramon Vega)
├── POP-00043.json  (Janae Rivers)
├── POP-00044.json  (Elliott Crane)
└── index.json      (quick lookup)
```

Each citizen file:
```json
{
  "popId": "POP-00042",
  "name": "Ramon Vega",
  "tier": 1,
  "faction": "IND",
  "role": "Council Member D4",
  "personality": "Fence-sitter, pragmatic, community-focused",
  "keyEvents": [
    { "cycle": 78, "event": "Voted YES on West Oakland Fund", "significance": "high" },
    { "cycle": 75, "event": "Public statement on housing crisis", "significance": "medium" }
  ],
  "relationships": [
    { "target": "Leonard Tran", "type": "colleague", "tension": "low" },
    { "target": "Denise Carter", "type": "political-ally", "tension": "medium" }
  ],
  "mediaAppearances": 12,
  "lastUpdated": "2026-02-02"
}
```

### Auto-Sync from Ledgers

OpenClaw skill to pull from Google Sheets:
1. Watch `Civic_Office_Ledger` for changes
2. Update citizen profiles with new status/events
3. Pull from `Simulation_Ledger` for life events
4. Merge arc participation from `Event_Arc_Tracker`

---

## Phase 2: Autonomous Media Generation

### Trigger: New Cycle Export

When cycle advances:
1. Engine runs (godWorldEngine2.js)
2. Exports summary to `exports/cycle-XX-summary.json`
3. OpenClaw detects new file
4. Generates media content

### Media Generation Pipeline

```
[Cycle Export]
    ↓
[OpenClaw: Parse Summary]
    ↓
[OpenClaw: Load Relevant Citizens from Memory]
    ↓
[OpenClaw: Generate Prompts for Claude API]
    ↓
[Claude: Write Tribune Pulse / Echo Op-Ed]
    ↓
[OpenClaw: Format & Save to media/cycle-XX/]
    ↓
[Optional: Post to Discord for Review]
```

### Content Types

| Type | Voice | Trigger |
|------|-------|---------|
| Bay Tribune Pulse | Balanced, factual | Every cycle |
| Oakland Echo Op-Ed | Edgy, provocative | High-tension events |
| Citizen Spotlight | Human interest | Tier-1 life events |
| Council Watch | Political analysis | Initiative votes |
| Neighborhood Report | Local focus | Demographic shifts |

---

## Phase 3: Scheduled Automation

### Cron-Style Triggers

```yaml
triggers:
  - name: "Daily Cycle Check"
    schedule: "0 8 * * *"  # 8 AM daily
    action: "check_for_new_cycle"

  - name: "Weekly Digest"
    schedule: "0 10 * * 0"  # Sunday 10 AM
    action: "generate_weekly_summary"

  - name: "Citizen Memory Sync"
    schedule: "0 0 * * *"  # Midnight daily
    action: "sync_citizen_profiles"
```

### Watch Triggers

```yaml
watches:
  - name: "Cycle Export"
    path: "exports/cycle-*-summary.json"
    action: "generate_media_content"

  - name: "Initiative Vote"
    sheet: "Initiative_Tracker"
    column: "Outcome"
    action: "generate_vote_coverage"
```

---

## Phase 4: Multi-Agent Voices

### Bay Tribune Agent
- Tone: Professional, balanced
- Sources: All ledgers, official statements
- Format: Inverted pyramid, quotes, context

### Oakland Echo Agent
- Tone: Skeptical, community-focused
- Sources: Street-level data, citizen reactions
- Format: Opinion-forward, provocative headlines

### Continuity Agent
- Role: Fact-checker, consistency enforcer
- Checks: Name spelling, timeline accuracy, arc continuity
- Output: Corrections before publish

---

## Implementation Steps

### Step 1: Install OpenClaw (Local)
```bash
git clone https://github.com/openclaw/openclaw
cd openclaw
npm install
openclaw gateway
```

### Step 2: Configure Google Sheets API
- Create service account
- Share ledgers with service account
- Store credentials locally

### Step 3: Build Citizen Sync Skill
```javascript
// skills/citizen-sync.js
module.exports = {
  name: 'citizen-sync',
  trigger: 'manual | schedule',
  action: async (ctx) => {
    const sheets = await ctx.google.sheets();
    const civicLedger = await sheets.get('Civic_Office_Ledger');
    const simLedger = await sheets.get('Simulation_Ledger');

    // Merge and update local citizen store
    await ctx.memory.updateCitizens(civicLedger, simLedger);
  }
};
```

### Step 4: Build Media Generator Skill
```javascript
// skills/media-generator.js
module.exports = {
  name: 'media-generator',
  trigger: 'watch:exports/cycle-*-summary.json',
  action: async (ctx, file) => {
    const summary = await ctx.fs.readJSON(file);
    const citizens = await ctx.memory.getRelevantCitizens(summary);

    const prompt = buildTribunePrompt(summary, citizens);
    const content = await ctx.claude.generate(prompt);

    await ctx.fs.write(`media/cycle-${summary.cycleId}/tribune-pulse.md`, content);
  }
};
```

### Step 5: Test with Cycle 78
- Export cycle 78 summary
- Run citizen sync
- Generate test Pulse
- Review for accuracy

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GOOGLE SHEETS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Simulation   │  │ Civic_Office │  │ Initiative   │          │
│  │ Ledger       │  │ Ledger       │  │ Tracker      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OPENCLAW (Local)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  CITIZEN MEMORY STORE                     │  │
│  │  • Profiles (name, tier, faction, personality)           │  │
│  │  • Event history (votes, incidents, milestones)          │  │
│  │  • Relationships (allies, rivals, family)                │  │
│  │  • Media appearances (quotes, coverage count)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  MEDIA GENERATOR                          │  │
│  │  • Parse cycle summary                                    │  │
│  │  • Load relevant citizens from memory                     │  │
│  │  • Build prompts with full context                        │  │
│  │  • Call Claude API for generation                         │  │
│  │  • Format and save output                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Tribune     │  │ Echo        │  │ Continuity  │             │
│  │ Agent       │  │ Agent       │  │ Agent       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OUTPUT                                   │
│  media/                                                         │
│  ├── cycle-78/                                                  │
│  │   ├── tribune-pulse.md                                       │
│  │   ├── echo-oped.md                                           │
│  │   └── council-watch.md                                       │
│  └── citizens/                                                  │
│      └── spotlight-ramon-vega.md                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### Minimum Viable
- [ ] Citizen profiles auto-sync from ledgers
- [ ] OpenClaw generates Tribune Pulse from cycle export
- [ ] Output requires < 10 min manual editing

### Full Autonomy
- [ ] Scheduled cycle detection
- [ ] Multi-voice generation (Tribune + Echo)
- [ ] Continuity checking before publish
- [ ] Discord notification for review

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenClaw still young/buggy | Start with manual triggers, add automation later |
| Claude API costs | Use Haiku for drafts, Sonnet for final |
| Memory drift from truth | Weekly full-sync from ledgers |
| Security (local agent with shell) | Sandboxed execution, read-only for ledgers |

---

## Next Steps

1. **Install OpenClaw locally** — test basic gateway
2. **Export citizen data** — build initial memory store from current ledgers
3. **Write citizen-sync skill** — manual trigger first
4. **Write media-generator skill** — test with cycle 78 data
5. **Add watch triggers** — automate cycle detection
6. **Add multi-agent voices** — Tribune vs Echo differentiation

---

## Questions to Resolve

- Where to run OpenClaw? (Local Mac? DigitalOcean droplet?)
- How to handle cycle exports? (Google Sheets export? Apps Script webhook?)
- Review workflow? (Discord? Email? Just check folder?)
- How much autonomy first pass? (Full auto or human-in-loop?)

---

## Full Setup Guide (From Scratch)

### What is OpenClaw?

OpenClaw (formerly Clawdbot/Moltbot) is an open-source, local-first AI agent that runs on your machine as a proactive personal assistant. With 68k+ GitHub stars, it's viral for integrating AI models with apps/files (e.g., WhatsApp, Discord, email, system commands) to automate tasks. It's Node.js-based, privacy-focused (no cloud required), and extensible with skills/plugins.

### Prerequisites

- **Node.js 18+** — download from nodejs.org
- **Git** — for cloning repo
- **API key** from LLM provider (Anthropic for Claude, xAI for Grok)
- **Optional:** Docker for containerized run (easier for production)

### Installation Steps

```bash
# 1. Clone the repo (still named moltbot on GitHub)
git clone https://github.com/moltbot/moltbot.git

# 2. Navigate to folder
cd moltbot

# 3. Install dependencies
npm install

# 4. Create .env file with your API key
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env

# 5. Run locally (starts gateway on localhost:3000)
npm start
```

### Configuration

Edit `config.js` to set:
- LLM model (e.g., `"claude-3.5-sonnet"`)
- Integrations (Discord bot token, WhatsApp via Twilio)
- Sandbox mode (least privilege for security)

### Test It

Message via Discord/Slack: "Summarize today's news" — it should respond autonomously.

### Security & Sandbox

- Enable sandbox mode in config (limits agent to specific folders)
- Add browser control: Install Puppeteer extension for web tasks
- Deploy options: Raspberry Pi (always-on), DigitalOcean droplet (1-Click setup)

---

## Custom Skills for Sheets → Pulse Workflow

OpenClaw's strength is extensibility — you add skills/plugins as Node.js modules.

### Basic Skill Structure

Create `skills/sheets-to-pulse.js`:

```javascript
module.exports = {
  name: 'sheetsToPulse',
  description: 'Pull from Google Sheets and generate Cycle Pulse edition',
  execute: async (context) => {
    const { message, config } = context;
    // Logic goes here
    return 'Pulse edition generated.';
  }
};
```

Add to config's skills array.

### Step 1: Sheets Integration (Pull Raw Data)

Install Google APIs client:
```bash
npm install googleapis
```

Skill code for fetching:
```javascript
const { google } = require('googleapis');

// Inside your skill execute function:
const sheets = google.sheets({ version: 'v4', auth: config.googleApiKey });

// Fetch from Sheets
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: 'your-sheets-id',  // Replace with GodWorld Sheets ID
  range: 'Cycle_76!A1:Z1000',       // Raw data sheet
});

const rawData = res.data.values;
// rawData now has neighborhood map, citizens, arcs, etc.
```

Trigger: Message "Run Sheets to Pulse for Cycle 77"

### Step 2: Process Data & Generate with Claude

Install Anthropic SDK:
```bash
npm install @anthropic-ai/sdk
```

Generation code:
```javascript
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20240620',
  max_tokens: 2000,
  messages: [{
    role: 'user',
    content: `Generate Cycle Pulse edition from this GodWorld data:
      Sentiment 0.98, Migration +265, West Oakland Sentiment 1.05, Shock-flag 15.
      Use Bay Tribune voice: balanced, procedural.
      Structure as Front Page, Civic Affairs, etc.`
  }],
});

const pulseText = response.content[0].text;
```

### Step 3: Autonomous Loop with Cron

Install cron:
```bash
npm install cron
```

Schedule daily generation:
```javascript
const CronJob = require('cron').CronJob;

new CronJob('0 0 * * *', async () => {
  // Run sheetsToPulse skill daily at midnight
  await skills.sheetsToPulse.execute(context);
  // Send output to Discord/Slack
}, null, true);
```

### Full Workflow

```
Sheets pull → Data process (sentiment/migration) → Claude generation → Save to ledger → Notify
```

---

## Complete Sheets-to-Pulse Skill

```javascript
// skills/sheets-to-pulse.js
const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;

module.exports = {
  name: 'sheetsToPulse',
  description: 'Pull GodWorld data from Sheets and generate Cycle Pulse',

  execute: async (context) => {
    const { config } = context;

    // 1. Initialize APIs
    const sheets = google.sheets({ version: 'v4', auth: config.googleApiKey });
    const claude = new Anthropic({ apiKey: config.anthropicApiKey });

    // 2. Fetch cycle data from Sheets
    const cycleData = await sheets.spreadsheets.values.get({
      spreadsheetId: config.godworldSheetId,
      range: 'Cycle_Summary!A1:Z100',
    });

    const citizenData = await sheets.spreadsheets.values.get({
      spreadsheetId: config.godworldSheetId,
      range: 'Simulation_Ledger!A1:Z500',
    });

    const initiativeData = await sheets.spreadsheets.values.get({
      spreadsheetId: config.godworldSheetId,
      range: 'Initiative_Tracker!A1:Q20',
    });

    // 3. Parse into structured format
    const summary = parseCycleData(cycleData.data.values);
    const citizens = parseCitizens(citizenData.data.values);
    const initiatives = parseInitiatives(initiativeData.data.values);

    // 4. Load citizen memory for context
    const relevantCitizens = await loadRelevantCitizens(summary, citizens);

    // 5. Build prompt with full context
    const prompt = buildTribunePrompt(summary, relevantCitizens, initiatives);

    // 6. Generate with Claude
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const pulseContent = response.content[0].text;

    // 7. Save to file
    const cycleId = summary.cycleId || 'unknown';
    const outputPath = `media/cycle-${cycleId}/tribune-pulse.md`;
    await fs.mkdir(`media/cycle-${cycleId}`, { recursive: true });
    await fs.writeFile(outputPath, pulseContent);

    // 8. Update citizen memory with new events
    await updateCitizenMemory(summary, initiatives);

    return `Pulse generated: ${outputPath}`;
  }
};

// Helper functions
function parseCycleData(rows) {
  // Convert Sheets rows to structured object
  // ... implementation
}

function buildTribunePrompt(summary, citizens, initiatives) {
  return `
You are generating the Bay Tribune Pulse for Cycle ${summary.cycleId}.

## Cycle Data
- Sentiment: ${summary.sentiment}
- Migration: ${summary.migration}
- Active Arcs: ${summary.arcs.join(', ')}

## Key Citizens This Cycle
${citizens.map(c => `- ${c.name} (${c.role}): ${c.recentEvents}`).join('\n')}

## Initiative Updates
${initiatives.map(i => `- ${i.name}: ${i.status} (${i.outcome || 'pending'})`).join('\n')}

Generate a full Pulse edition with:
1. Front Page (lead story)
2. Council Watch (political analysis)
3. Neighborhood Beat (local impacts)
4. Looking Ahead (what's next)

Use balanced, professional Tribune voice.
  `;
}
```

---

## Future: Claude Calling OpenClaw (Reverse Integration)

Currently: OpenClaw → calls Claude API → gets text back

Possible future: Claude → calls OpenClaw → gets citizen data

### How It Would Work

1. OpenClaw exposes REST API locally:
   ```
   GET localhost:8080/citizen/POP-00042
   → Returns Ramon Vega's full profile
   ```

2. Claude Code configured with custom tool to call that endpoint

3. Flow:
   ```
   You: "Write a spotlight on Ramon Vega"
   Claude: [calls OpenClaw tool] → "get citizen POP-00042"
   OpenClaw: [returns profile, history, relationships]
   Claude: [writes spotlight using that data]
   ```

### Setup (Future)

```javascript
// OpenClaw API server mode
const express = require('express');
const app = express();

app.get('/citizen/:popId', async (req, res) => {
  const citizen = await memory.getCitizen(req.params.popId);
  res.json(citizen);
});

app.listen(8080);
```

Then configure Claude Code with MCP server integration pointing to `localhost:8080`.

This adds complexity — start with OpenClaw driving the workflow first.
