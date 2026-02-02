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
