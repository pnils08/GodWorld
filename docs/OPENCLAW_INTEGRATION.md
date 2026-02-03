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

---

## Persistence Examples (Memory Across Sessions)

OpenClaw uses a lightweight, local-first approach to memory (no cloud database required). Persistence is built around files, key-value stores, or simple JSON/SQLite. These patterns work well for GodWorld (persistent citizens, cycle state, memory of past Pulse editions).

### Option 1: File-Based Persistence (Simplest)

OpenClaw can read/write files in a dedicated folder. Zero-config and survives restarts.

**Example: Persistent Citizen Memory**

Create `godworld/memory/` folder for citizen state:

```javascript
// skills/citizen-memory.js
module.exports = {
  name: 'citizenMemory',
  description: 'Remember or recall citizen details across sessions',

  execute: async (context) => {
    const { message, config } = context;
    const fs = require('fs').promises;
    const path = require('path');
    const memoryDir = path.join(__dirname, '../godworld/memory');

    // Ensure directory exists
    await fs.mkdir(memoryDir, { recursive: true });

    if (message.includes('remember citizen')) {
      // Parse: "remember citizen Javier Harris age 57 occupation electrician neighborhood West Oakland"
      const parts = message.split(' ');
      const name = parts.slice(2, 4).join(' ');
      const data = {
        name,
        age: parts[5],
        occupation: parts[7],
        neighborhood: parts[9],
        timestamp: new Date().toISOString(),
      };

      const filePath = path.join(memoryDir, `${name.replace(/ /g, '_')}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      return `Remembered ${name}: ${JSON.stringify(data, null, 2)}`;
    }

    if (message.includes('recall citizen')) {
      const name = message.split('recall citizen ')[1].trim();
      const filePath = path.join(memoryDir, `${name.replace(/ /g, '_')}.json`);

      try {
        const content = await fs.readFile(filePath, 'utf8');
        return `Recall for ${name}:\n${content}`;
      } catch (err) {
        return `No memory found for ${name}`;
      }
    }

    return 'Use "remember citizen ..." or "recall citizen ..."';
  }
};
```

**Usage:**
- `"remember citizen Javier Harris age 57 occupation electrician neighborhood West Oakland"`
- Later: `"recall citizen Javier Harris"` → gets full JSON back, even after restart

---

### Option 2: Single JSON Key-Value Store (Recommended)

One file for all persistent state (citizens, cycles, last Pulse, shock-flag, etc.):

```javascript
// skills/godworld-state.js
const fs = require('fs').promises;
const path = require('path');
const stateFile = path.join(__dirname, '../godworld/state.json');

let state = {};

async function loadState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    state = JSON.parse(data);
  } catch (err) {
    state = { citizens: {}, cycles: {}, lastPulse: null, shockFlag: 15 };
    await saveState();
  }
}

async function saveState() {
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

module.exports = {
  name: 'godworldState',
  description: 'Persistent key-value store for GodWorld sim',

  async execute(context) {
    await loadState();

    const { message } = context;

    if (message.startsWith('set ')) {
      const [, key, ...valueParts] = message.split(' ');
      const value = valueParts.join(' ');
      state[key] = value;
      await saveState();
      return `Set ${key} = ${value}`;
    }

    if (message.startsWith('get ')) {
      const key = message.split(' ')[1];
      return `${key}: ${JSON.stringify(state[key] ?? 'not found')}`;
    }

    if (message === 'list citizens') {
      return Object.keys(state.citizens || {}).join('\n');
    }

    return 'Commands: set <key> <value>, get <key>, list citizens';
  }
};
```

**Usage:**
- `"set shockFlag 12"`
- `"set citizen_JavierHarris {age:57, occupation:'electrician', neighborhood:'West Oakland'}"`
- `"get shockFlag"` → remembers across restarts

---

### Option 3: SQLite for Structured Persistence

For real queries (search citizens by neighborhood, occupation, etc.):

```javascript
// skills/sqlite-citizens.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./godworld/citizens.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS citizens (
    name TEXT PRIMARY KEY,
    age INTEGER,
    occupation TEXT,
    neighborhood TEXT,
    lastSeen TEXT,
    notes TEXT
  )`);
});

module.exports = {
  name: 'citizenDb',
  description: 'Persistent citizen database',

  async execute(context) {
    const { message } = context;

    if (message.startsWith('add citizen ')) {
      const parts = message.split(' ');
      const name = parts[2];
      const age = parts[4];
      const occupation = parts[6];
      const neighborhood = parts[8];

      db.run(
        `INSERT OR REPLACE INTO citizens (name, age, occupation, neighborhood, lastSeen) VALUES (?, ?, ?, ?, ?)`,
        [name, age, occupation, neighborhood, new Date().toISOString()],
        function (err) {
          if (err) return `Error: ${err.message}`;
          return `Added/updated ${name}`;
        }
      );
    }

    if (message.startsWith('get citizen ')) {
      const name = message.split(' ')[2];
      db.get(`SELECT * FROM citizens WHERE name = ?`, [name], (err, row) => {
        if (err) return `Error: ${err.message}`;
        return row ? JSON.stringify(row, null, 2) : 'Not found';
      });
    }

    return 'Commands: add citizen <name> age <age> occupation <occ> neighborhood <hood>, get citizen <name>';
  }
};
```

---

### Persistence Comparison

| Method | Complexity | GodWorld Use Case | Restart Survival | Query Power |
|--------|------------|-------------------|------------------|-------------|
| Single JSON file | Very low | Quick citizen/cycle state, last Pulse | Yes | Basic |
| Per-file JSON | Low | One file per citizen or cycle | Yes | None |
| SQLite | Medium | Full citizen ledger, searchable | Yes | High |
| Key-value (LevelDB) | Medium | Fast key lookups (shock-flag, sentiment) | Yes | Medium |

### Recommendation for GodWorld

**Start with single JSON file** (`godworld/state.json`) — handles 90% of needs:
- Cycle number
- Current sentiment/migration
- Shock-flag value
- Last Pulse edition text
- Small citizen memory cache

**Add SQLite later** if you want to query citizens by neighborhood or occupation.

---

## SQLite + Google Sheets Integration (Layer Expansion)

SQLite + Google Sheets is a perfect lightweight combo:
- **Sheets** = source of truth for cycle data exports
- **SQLite** = fast local queries and persistence across runs

This lets you:
- Pull raw data from Sheets (citizens, arcs, neighborhood stats)
- Store in SQLite for fast local queries
- Use for autonomous media generation ("recall all West Oakland citizens with Sentiment >1.0")

### Prerequisites

```bash
npm install googleapis sqlite3
```

Plus:
1. Google Cloud Console → Create Project → Enable "Google Sheets API"
2. Create Service Account → Download JSON key (save as `credentials.json`)
3. Share your GodWorld Sheets with the service account email

### Full Integration Script (sheets-to-sqlite.js)

```javascript
const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

// === CONFIG ===
const SPREADSHEET_ID = 'your-godworld-sheets-id-here';
const SHEET_NAME = 'Cycle_76';
const DB_PATH = path.join(__dirname, 'godworld.db');

async function main() {
  // Load credentials
  const credentials = JSON.parse(await fs.readFile('./credentials.json'));

  // === AUTHENTICATE ===
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // === SQLITE SETUP ===
  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS citizens (
        name TEXT PRIMARY KEY,
        age INTEGER,
        occupation TEXT,
        neighborhood TEXT,
        faction TEXT,
        tier INTEGER,
        lastSeen TEXT,
        notes TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS cycles (
        cycle INTEGER PRIMARY KEY,
        sentiment REAL,
        migration INTEGER,
        pattern TEXT,
        shockFlag INTEGER,
        domainsActive INTEGER,
        timestamp TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS initiatives (
        initiativeId TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        outcome TEXT,
        voteCount TEXT,
        cycle INTEGER,
        lastUpdated TEXT
      )
    `);
  });

  // === PULL FROM SHEETS ===
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in Sheets.');
      return;
    }

    console.log(`Pulled ${rows.length} rows from Sheets.`);

    // Parse and insert citizens
    const headers = rows[0];
    const citizenRows = rows.slice(1);

    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO citizens (name, age, occupation, neighborhood, faction, tier, lastSeen, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of citizenRows) {
        const name = row[0] || 'Unknown';
        const age = parseInt(row[1]) || null;
        const occupation = row[2] || '';
        const neighborhood = row[3] || '';
        const faction = row[4] || '';
        const tier = parseInt(row[5]) || 4;
        const lastSeen = new Date().toISOString();
        const notes = row.slice(6).join(' | ') || '';

        stmt.run(name, age, occupation, neighborhood, faction, tier, lastSeen, notes);
      }

      stmt.finalize();
      console.log('Citizens saved to SQLite.');
    });

  } catch (err) {
    console.error('Error pulling from Sheets:', err);
  }

  // === QUERY EXAMPLES ===
  const westOaklandCitizens = await queryCitizensByNeighborhood(db, 'West Oakland');
  console.log('West Oakland Citizens:', westOaklandCitizens);

  const indMembers = await queryCitizensByFaction(db, 'IND');
  console.log('IND Faction Members:', indMembers);

  db.close();
}

// Query helpers
function queryCitizensByNeighborhood(db, neighborhood) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM citizens WHERE neighborhood LIKE ?`,
      [`%${neighborhood}%`],
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
}

function queryCitizensByFaction(db, faction) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM citizens WHERE faction = ?`,
      [faction],
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
}

function queryTier1Citizens(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM citizens WHERE tier = 1`,
      [],
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
}

main().catch(console.error);
```

### OpenClaw Skill Version

```javascript
// skills/sheets-sqlite-sync.js
const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  name: 'sheetsSqliteSync',
  description: 'Sync Google Sheets data to local SQLite database',

  execute: async (context) => {
    const { config } = context;
    const dbPath = path.join(__dirname, '../godworld/godworld.db');

    // Load credentials
    const credentials = JSON.parse(
      await fs.readFile(config.googleCredentialsPath)
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const db = new sqlite3.Database(dbPath);

    // Pull Simulation_Ledger
    const simRes = await sheets.spreadsheets.values.get({
      spreadsheetId: config.godworldSheetId,
      range: 'Simulation_Ledger!A:Z',
    });

    // Pull Initiative_Tracker
    const initRes = await sheets.spreadsheets.values.get({
      spreadsheetId: config.godworldSheetId,
      range: 'Initiative_Tracker!A:Q',
    });

    // Insert citizens...
    // Insert initiatives...

    db.close();
    return `Synced ${simRes.data.values.length} citizens, ${initRes.data.values.length} initiatives`;
  }
};
```

### GodWorld Workflow Integration

1. **Export Cycle Data from Sheets:**
   - Use Apps Script to export on cycle advance
   - Or pull directly via API

2. **Persist in SQLite:**
   - Run sync after each cycle export
   - Add cycle-level data (sentiment, migration, shock-flag) to cycles table

3. **Query for Media Generation:**
   - "Give me 3 West Oakland citizens with occupation 'electrician'" → feed to Claude for Pulse quotes
   - "List all Tier-1 citizens in elevated activity zones" → tie to arc seeds

4. **Autonomous Loop (with OpenClaw):**
   - Trigger on cron or Sheets change webhook
   - Pull → Save to SQLite → Generate Pulse → Save to ledger folder

### Useful Queries for GodWorld

```sql
-- All West Oakland citizens
SELECT * FROM citizens WHERE neighborhood LIKE '%West Oakland%';

-- IND swing voters
SELECT * FROM citizens WHERE faction = 'IND';

-- Tier-1 protected citizens
SELECT * FROM citizens WHERE tier = 1;

-- Recent initiatives
SELECT * FROM initiatives WHERE cycle >= 75 ORDER BY cycle DESC;

-- Citizens by occupation for quotes
SELECT * FROM citizens WHERE occupation LIKE '%electrician%' OR occupation LIKE '%teacher%';

-- Neighborhood citizen count
SELECT neighborhood, COUNT(*) as count FROM citizens GROUP BY neighborhood ORDER BY count DESC;
```

### Advantages for GodWorld

| Benefit | Description |
|---------|-------------|
| **Persistence** | Citizens, cycles, sentiment history survive restarts |
| **Query Power** | Fast lookups ("all Fruitvale citizens" for cultural reports) |
| **No Cloud DB** | Fully local, private |
| **Scalable** | Add tables for arcs, neighborhoods, domain stats later |
| **Source of Truth** | Sheets remains master, SQLite is fast local cache |

---

## Ollama: Local LLM Option (Zero API Cost)

**What is Ollama?** A tool for running open-source LLMs (Llama 3, Mistral, etc.) locally on your machine. No API fees, no cloud dependency.

### Why Consider Ollama for GodWorld?

| Use Case | Claude API | Ollama (Local) |
|----------|------------|----------------|
| High-quality Tribune articles | Best choice | Acceptable |
| Bulk citizen chatter / filler text | Expensive | Free |
| Testing/iteration | Adds up fast | Unlimited |
| Offline operation | Not possible | Works |
| Privacy | Data sent to cloud | Fully local |

### Installation

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start the service
ollama serve

# Pull a model (Llama 3 8B is a good balance)
ollama pull llama3:8b
```

### Hardware Requirements

| Model | RAM Needed | Quality |
|-------|------------|---------|
| llama3:8b | 8GB+ | Good for drafts |
| llama3:70b | 48GB+ | Near-Claude quality |
| mistral:7b | 8GB+ | Fast, decent |
| mixtral:8x7b | 32GB+ | Better reasoning |

### OpenClaw + Ollama Integration

Swap Claude API for Ollama in your skills:

```javascript
// skills/media-generator-ollama.js
const fetch = require('node-fetch');

async function generateWithOllama(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:8b',
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

module.exports = {
  name: 'mediaGeneratorOllama',
  description: 'Generate media content using local Ollama model',

  execute: async (context) => {
    const { summary, citizens } = context;

    const prompt = `Generate Bay Tribune Pulse for Cycle ${summary.cycleId}.
Sentiment: ${summary.sentiment}, Migration: ${summary.migration}.
Key citizens: ${citizens.map(c => c.name).join(', ')}.
Write balanced, professional news coverage.`;

    const content = await generateWithOllama(prompt);
    return content;
  }
};
```

### Hybrid Approach (Recommended)

Use both for cost optimization:

```javascript
// config.js
module.exports = {
  llm: {
    // Use Ollama for drafts and bulk work
    draft: {
      type: 'ollama',
      model: 'llama3:8b',
      endpoint: 'http://localhost:11434',
    },
    // Use Claude for final, high-quality output
    final: {
      type: 'claude',
      model: 'claude-3-5-sonnet-20240620',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  },
};
```

Workflow:
```
Cycle Export
    ↓
OpenClaw: Parse data
    ↓
Ollama: Generate draft Pulse (free)
    ↓
Human review: "This draft is good, polish it"
    ↓
Claude: Polish final version (paid, but only 1 call)
    ↓
Save to media/
```

### Ollama vs Claude Comparison

| Factor | Claude API | Ollama |
|--------|------------|--------|
| **Cost** | ~$0.003-0.015 per 1K tokens | Free |
| **Quality** | Excellent | Good (varies by model) |
| **Speed** | Fast (cloud) | Depends on hardware |
| **Setup** | Just API key | Install + download models |
| **Offline** | No | Yes |
| **Best for** | Final output, complex reasoning | Drafts, bulk generation, testing |

### When to Use What

| Task | Recommendation |
|------|----------------|
| Tribune Pulse (public) | Claude (quality matters) |
| Echo Op-Ed drafts | Ollama → Claude polish |
| Citizen background chatter | Ollama (bulk, low stakes) |
| Testing prompt iterations | Ollama (unlimited) |
| Continuity checking | Either |
| Arc summaries | Claude (needs reasoning) |

### Bottom Line

- **Start with Claude API** for quality baseline
- **Add Ollama later** when you want to reduce costs or go offline
- **Hybrid approach** gives best of both: free iteration + quality output

---

## Implementation Addendum

### Phase-Aligned Checklist

#### Phase 0 — Preflight (Safety & Baseline)
- [ ] Confirm OpenClaw sandbox rules: **read-only** on exports, **write-only** on media output
- [ ] Define a single **root output folder** (e.g., `media/`) and enforce it in config
- [ ] Decide where OpenClaw runs (local, VPS) and document ops runbook

#### Phase 1 — Citizen Memory Layer (Minimum Viable Memory)
- [ ] Define **memory schema** (see below)
- [ ] Build **citizen-sync** skill:
  - Pull `Civic_Office_Ledger`, `Simulation_Ledger`, `Event_Arc_Tracker`
  - Merge records deterministically by `popId`
  - Write citizen JSON and update `index.json`
- [ ] Add **checksum tracking** to detect sync drift
- [ ] Run **initial full-sync** and validate random samples

#### Phase 2 — Cycle Export + Context Pack
- [ ] Extend engine to emit **Cycle Context Pack** alongside `cycle-XX-summary.json`:
  - `cycle-XX-context.json` (events, key citizens, event tags, risk flags)
- [ ] Add export **manifest.json** for each cycle (timestamp, checksum)

#### Phase 3 — Media Generator (Human-in-Loop)
- [ ] Build **media-generator** skill:
  - Load summary + context pack
  - Pull relevant citizen profiles
  - Build prompts by media type (Tribune, Echo, Council Watch)
  - Save outputs to `media/cycle-XX/`
- [ ] Add **manual review step** before publishing

#### Phase 4 — Multi-Agent Routing + Continuity
- [ ] Implement **routing policy** (see below)
- [ ] Add **continuity agent** to verify names, timeline, and arc alignment
- [ ] Block publish if continuity score < threshold (e.g., 0.9)

#### Phase 5 — Automation
- [ ] Add watch trigger on `exports/cycle-*-summary.json`
- [ ] Add daily/weekly scheduled runs
- [ ] Add Discord/Slack notification for review

---

## Routing Policy (Multi-Agent Voice Rules)

### Routing Matrix

| Signal | Tribune (Balanced) | Echo (Edgy) | Continuity (Check) |
|--------|-------------------|-------------|-------------------|
| Civic votes (Initiative outcomes) | Yes | Maybe | Yes |
| High-tension events (CHAOS/CRIME) | Yes | Yes | Yes |
| Routine cycle (no major events) | Yes | No | Maybe |
| Tier-1 citizen spotlight | Yes | Yes | Yes |
| Conflicting ledger data | No | No | Yes |

### Simple Rules (Pseudo-Logic)

```
if conflicts_detected => Continuity only
if chaosEvents >= 2 => Tribune + Echo + Continuity
if civicVotes >= 1 => Tribune + Continuity
if routineCycle => Tribune only
```

### Confidence Gate

Each output is scored:
- **Continuity Score** (0–1)
- **Narrative Score** (0–1)
- **Risk Score** (0–1)

Publish if:
```
continuity >= 0.9 && risk <= 0.4
```

---

## Extended Memory Schema (With Integrity + Staleness)

### Citizen Profile (JSON)

```json
{
  "popId": "POP-00042",
  "name": "Ramon Vega",
  "tier": 1,
  "faction": "IND",
  "role": "Council Member D4",
  "personality": "Fence-sitter, pragmatic, community-focused",
  "keyEvents": [
    { "cycle": 78, "event": "Voted YES on West Oakland Fund", "significance": "high" }
  ],
  "relationships": [
    { "target": "Leonard Tran", "type": "colleague", "tension": "low" }
  ],
  "mediaAppearances": 12,
  "lastUpdated": "2026-02-02",
  "confidence": 0.92,
  "stalenessDays": 3,
  "sourceHashes": {
    "Civic_Office_Ledger": "sha256:...",
    "Simulation_Ledger": "sha256:..."
  }
}
```

### Index (Fast Lookup)

```json
{
  "updatedAt": "2026-02-02T12:00:00Z",
  "citizens": {
    "POP-00042": { "name": "Ramon Vega", "tier": 1, "role": "Council Member D4" }
  },
  "ledgerChecksums": {
    "Civic_Office_Ledger": "sha256:...",
    "Simulation_Ledger": "sha256:..."
  }
}
```

### Integrity Rules

- **Confidence** decays if `stalenessDays > 7`
- **Re-sync** triggers when ledger checksum changes or confidence < 0.8
- **Hard fail** if `popId` missing or ledger headers mismatch

---

## Cycle Context Pack (Recommended)

Machine-friendly context file that reduces prompt engineering:

```json
{
  "cycleId": 78,
  "season": "Summer",
  "weather": { "type": "fog", "impact": 1.3 },
  "topEvents": [
    { "id": "EVT-991", "domain": "CIVIC", "severity": 0.7, "tags": ["vote", "housing"] }
  ],
  "keyCitizens": ["POP-00042", "POP-00077"],
  "riskFlags": ["high-tension", "election-week"]
}
```

This pack is generated by the engine at cycle export time and consumed by OpenClaw skills to build prompts without manual context assembly.

---

## Config & Ops Checklist

### Required Keys & Secrets

| Key | Source | Required For | Notes |
|-----|--------|--------------|-------|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude API calls | Store in `.env`, never commit |
| `GOOGLE_SHEETS_CREDENTIALS` | Google Cloud Console | Ledger sync | Service account JSON |
| `OPENCLAW_HOME` | Local config | Agent root directory | Default: `~/.openclaw` |

### Secrets Handling

```bash
# .env file (gitignored)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Load in skills
require('dotenv').config();
const apiKey = process.env.ANTHROPIC_API_KEY;
```

### Operational Hygiene

- [ ] **Never commit secrets** — `.env` in `.gitignore`
- [ ] **Rotate API keys** quarterly or after suspected exposure
- [ ] **Log API usage** — track token counts per cycle for cost monitoring
- [ ] **Backup memory store** — weekly snapshot of `citizens/` folder
- [ ] **Version control skills** — all custom skills in `skills/` tracked in git
- [ ] **Test in sandbox first** — use `--dry-run` flag before live runs
- [ ] **Monitor disk usage** — cycle exports + citizen profiles accumulate

### Pre-Flight Checks (Before First Run)

```bash
# Verify Node version
node --version  # Should be 18+

# Verify API key is set
echo $ANTHROPIC_API_KEY | head -c 10  # Should show "sk-ant-..."

# Verify Google credentials
cat $GOOGLE_APPLICATION_CREDENTIALS | jq '.client_email'

# Test OpenClaw installation
openclaw --version
```

---

## Ledger-to-Sync Priority Mapping

Quick reference for which ledgers to sync first during integration:

| Priority | Ledger | Sync Frequency | Data Type | Notes |
|----------|--------|----------------|-----------|-------|
| **P0** | `Civic_Office_Ledger` | Every cycle | Officials, roles, factions | Core for civic coverage |
| **P0** | `Simulation_Ledger` | Every cycle | All citizens, tiers, demographics | Master citizen list |
| **P1** | `Event_Arc_Tracker` | Every cycle | Active arcs, phases, tension | Story continuity |
| **P1** | `Initiative_Tracker` | Every cycle | Votes, outcomes, consequences | Civic engine output |
| **P2** | `LifeHistory_Log` | Weekly | Compressed citizen histories | Background context |
| **P2** | `Bond_Ledger` | Weekly | Relationships, bond types | Relationship mapping |
| **P3** | `Neighborhood_Demographics` | Weekly | Population stats per hood | Aggregate data |
| **P3** | `Cultural_Entity_Roster` | Monthly | Venues, orgs, landmarks | Slow-changing reference |

### Sync Strategy

```
Cycle Run Complete
    ↓
P0 Sync (immediate) — Officials + Citizens + Arcs + Initiatives
    ↓
P1 Sync (same day) — Event arcs for continuity
    ↓
P2 Sync (weekly batch) — History + Bonds
    ↓
P3 Sync (monthly) — Demographics + Cultural entities
```

### Dependency Order

```
Simulation_Ledger (citizens exist)
    ↓
Civic_Office_Ledger (officials reference citizens)
    ↓
Event_Arc_Tracker (arcs reference citizens + neighborhoods)
    ↓
Bond_Ledger (bonds reference citizen pairs)
```
