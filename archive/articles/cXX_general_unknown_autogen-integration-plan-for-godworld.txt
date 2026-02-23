# AutoGen Integration Plan for GodWorld

**Status:** SUPERSEDED — See `docs/media/AGENT_NEWSROOM.md` for the active plan (Claude Agent SDK / Node.js)
**Original Goal:** Multi-agent newsroom for autonomous media generation
**Last Updated:** 2026-02-02

> **Note:** This document is kept for historical reference. The AutoGen (Python) approach has been replaced by a Claude Agent SDK (Node.js) approach that aligns with the existing GodWorld stack. See `docs/media/AGENT_NEWSROOM.md` for the current 25-agent newsroom architecture.

---

## Why AutoGen?

AutoGen (Microsoft) is built for **multi-agent collaboration** — agents that talk to each other, debate, refine, and produce output together. This maps directly to a newsroom model.

Current pain points with manual media sessions:
- Single-voice output (you prompt, Claude responds)
- No agent collaboration (civic reporter can't "ping" investigations)
- No editorial review loop
- Manual formatting every time

AutoGen solves:
- **Multi-agent conversation** — reporters discuss, editor reviews
- **Role specialization** — each agent has a beat
- **Autonomous workflows** — group chat runs without intervention
- **Tool integration** — agents call Sheets API, file system, code execution

---

## Core Concept: The Newsroom

Instead of one AI generating everything, AutoGen creates a **virtual newsroom** where agents collaborate:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BAY TRIBUNE NEWSROOM                         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Carmen      │  │ Luis        │  │ Dr. Lila    │             │
│  │ Delaine     │  │ Navarro     │  │ Mezran      │             │
│  │ (Civic)     │  │ (Invest.)   │  │ (Health)    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │ Mags        │                               │
│                   │ Corliss     │                               │
│                   │ (Editor)    │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │ FINAL PULSE │                               │
│                   │ EDITION     │                               │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Roster (Mapped to Your Characters)

### Bay Tribune Agents

| Agent | Character | Beat | System Message Core |
|-------|-----------|------|---------------------|
| `civic_agent` | Carmen Delaine | Civic/Government | "Balanced civic reporter. Pull domain data, council votes, initiative status. No editorializing." |
| `investigation_agent` | Luis Navarro | Investigations | "Dig into arc seeds, shock-flags, anomalies. Connect dots others miss. Skeptical but fair." |
| `health_agent` | Dr. Lila Mezran | Health Desk | "Medical perspective. Analyze health arcs, fainting clusters, clinic capacity. Clinical tone." |
| `cultural_agent` | Maria Keen | Cultural/Community | "Community voice. Juneteenth, Pride, festivals, neighborhood mood. Warm, people-focused." |
| `sports_agent` | Hal Richmond | Sports/History | "Senior historian. A's dynasty lore, Coliseum farewell, Paulson rumors. Nostalgic authority." |
| `editor_agent` | Mags Corliss | Editor-in-Chief | "Final review. Check facts, tone, balance. Format as Pulse edition. Cut fluff." |

### Oakland Echo Agents (Alternative Voice)

| Agent | Character | Beat | System Message Core |
|-------|-----------|------|---------------------|
| `echo_opinion` | P Slayer | Opinion/Rant | "Edgy, provocative. Call out hypocrisy. Distraction tax. No corporate softening." |
| `echo_fan` | J-Rock Thompson | Fan Voice | "Street-level sports. Real fan reactions. Disappointment, hope, betrayal." |
| `echo_rumor` | MintConditionOakTown | Speculation | "Unverified threads. Chaos agent. What if? Rumor mill. Disclaimer everything." |
| `echo_editor` | (TBD) | Echo Editor | "Sharpen edges. Make it provocative but defensible. No libel." |

---

## Workflow: Cycle → Pulse

### Step 1: Trigger (New Cycle Data)

```python
# Trigger: Sheets export or manual
cycle_data = {
    "cycle": 78,
    "west_oakland_sentiment": 1.05,
    "migration": "+265",
    "initiative": "West Oakland Stabilization Fund",
    "vote_result": "5-3 PASSED",
    "swing_voters": ["Ramon Vega (YES)", "Leonard Tran (NO)"],
    "absent": ["Elliott Crane (injured)"],
    "arcs_active": ["Housing Crisis Arc", "Council Tension Arc"],
    "health_flags": ["flu cluster Fruitvale"]
}
```

### Step 2: Group Chat (Agents Collaborate)

```python
from autogen import AssistantAgent, GroupChat, GroupChatManager, UserProxyAgent

config_list = [{"model": "claude-3-5-sonnet-20241022", "api_key": "YOUR_KEY"}]

# Define agents
civic = AssistantAgent(
    name="Carmen_Delaine",
    system_message="""You are Carmen Delaine, Bay Tribune Civic Desk.
    - Report on council votes, initiatives, government actions
    - Balanced, factual, no editorializing
    - Include vote counts, key players, what's next
    - Flag anything unusual for Luis to investigate""",
    llm_config={"config_list": config_list}
)

investigations = AssistantAgent(
    name="Luis_Navarro",
    system_message="""You are Luis Navarro, Bay Tribune Investigations.
    - Dig into anomalies, patterns, what's not being said
    - Connect dots between arcs, votes, and citizen behavior
    - Skeptical but fair - ask hard questions
    - If Carmen flags something, investigate it""",
    llm_config={"config_list": config_list}
)

health = AssistantAgent(
    name="Dr_Lila_Mezran",
    system_message="""You are Dr. Lila Mezran, Bay Tribune Health Desk.
    - Medical/health perspective on events
    - Analyze health arcs, clinic data, public health implications
    - Clinical, authoritative tone
    - Connect health to broader city dynamics""",
    llm_config={"config_list": config_list}
)

editor = AssistantAgent(
    name="Mags_Corliss",
    system_message="""You are Mags Corliss, Bay Tribune Editor-in-Chief.
    - Review all reporter contributions
    - Check for factual consistency
    - Ensure balanced coverage
    - Format as final Pulse edition with sections:
      * Lead Story
      * Council Watch
      * Neighborhood Beat
      * Health Corner (if relevant)
      * Looking Ahead
    - Cut anything that doesn't serve readers""",
    llm_config={"config_list": config_list}
)

# Group chat
groupchat = GroupChat(
    agents=[civic, investigations, health, editor],
    messages=[],
    max_round=6  # Limit back-and-forth
)
manager = GroupChatManager(groupchat=groupchat, llm_config={"config_list": config_list})

# Trigger
user = UserProxyAgent(name="CycleData", human_input_mode="NEVER")
user.initiate_chat(
    manager,
    message=f"""New cycle data for Pulse edition:

    Cycle: {cycle_data['cycle']}
    West Oakland Sentiment: {cycle_data['west_oakland_sentiment']}
    Migration: {cycle_data['migration']}
    Initiative: {cycle_data['initiative']} - {cycle_data['vote_result']}
    Swing Voters: {cycle_data['swing_voters']}
    Absent: {cycle_data['absent']}
    Active Arcs: {cycle_data['arcs_active']}
    Health Flags: {cycle_data['health_flags']}

    Generate Bay Tribune Pulse edition. Carmen starts with civic report,
    Luis investigates angles, Lila adds health context, Mags formats final."""
)
```

### Step 3: Conversation Flow

```
Carmen_Delaine: "West Oakland Stabilization Fund passed 5-3 in a close
vote. Council President Carter's OPP bloc held, but needed swing voter
Ramon Vega to cross the threshold. Leonard Tran voted no, citing budget
concerns. Elliott Crane (CRC) was absent due to injury, which may have
tipped the balance. Flag for Luis: why did Vega flip? His district has
the highest migration pressure."

Luis_Navarro: "Following Carmen's flag — Vega's District 4 saw +145 of
the +265 migration. He's facing pressure from both sides: longtime
residents want stabilization, but business interests oppose the fund's
rent controls. His YES vote may be tactical positioning for re-election,
not conviction. Worth watching: if implementation stalls, he has cover
to pivot."

Dr_Lila_Mezran: "Health angle: the flu cluster in Fruitvale is unrelated
to the vote but worth noting — clinic capacity is at 87%. If the
Stabilization Fund improves housing quality in West Oakland, we may see
downstream health benefits (mold reduction, stress-related conditions).
Crane's injury (hospitalized since Cycle 76) is a reminder that council
absences have real policy consequences."

Mags_Corliss: "Final Pulse edition:

# BAY TRIBUNE PULSE — CYCLE 78

## LEAD: Stabilization Fund Squeaks Through 5-3
[Formatted version of Carmen's report with Luis's context]

## COUNCIL WATCH: Vega's Calculated Yes
[Luis's analysis of swing vote politics]

## HEALTH CORNER: Flu Cluster Contained, Crane Still Out
[Lila's health update]

## LOOKING AHEAD
- Implementation timeline for Stabilization Fund
- Crane's return (expected Cycle 80)
- Next vote: Alternative Response Initiative (Cycle 82)

---
*Bay Tribune Pulse is generated from GodWorld simulation data.*"
```

---

## Adding Tools (Sheets Integration)

Agents can call functions to pull real data:

```python
from autogen import register_function

def fetch_citizen_data(pop_id: str) -> dict:
    """Pull citizen profile from Simulation_Ledger"""
    # Your Sheets API call here
    return {"name": "Ramon Vega", "faction": "IND", "district": 4, ...}

def fetch_initiative_status(init_id: str) -> dict:
    """Pull initiative from Initiative_Tracker"""
    return {"name": "West Oakland Stabilization Fund", "status": "passed", ...}

def fetch_neighborhood_stats(neighborhood: str) -> dict:
    """Pull from Neighborhood_Demographics"""
    return {"sentiment": 1.05, "migration": 145, "unemployment": 0.12, ...}

# Register tools with agents
register_function(
    fetch_citizen_data,
    caller=investigations,
    executor=user,
    description="Get citizen profile by POPID"
)
```

---

## Comparison: AutoGen vs OpenClaw

| Aspect | AutoGen | OpenClaw |
|--------|---------|----------|
| **Core strength** | Multi-agent conversation | Local automation |
| **Newsroom fit** | Excellent — agents debate, refine | Basic — more like task queue |
| **Memory** | Per-conversation (needs external store) | Built-in persistent memory |
| **Setup** | Python, pip install | Node.js, more integrations |
| **Collaboration** | Native (GroupChat, sequential) | Manual chaining |
| **Best for Tribune** | Agents write different sections, editor combines | Single agent generates all |
| **Best for automation** | Good with scheduler | Excellent with watches/triggers |
| **Community** | Massive (Microsoft, 100k+ stars) | Growing fast |
| **Cost** | API calls per agent turn | API calls per generation |

### Recommendation

| Use Case | Best Tool |
|----------|-----------|
| Multi-voice journalism (Tribune Pulse) | **AutoGen** |
| Persistent citizen memory | **OpenClaw** |
| Scheduled automation | **OpenClaw** (or cron + AutoGen) |
| Echo vs Tribune split | **AutoGen** (different agent groups) |
| Quick local tasks | **OpenClaw** |

**Hybrid approach:** Use OpenClaw for memory/triggers, AutoGen for generation.

---

## Implementation Steps

### Step 1: Install AutoGen
```bash
pip install pyautogen
```

### Step 2: Test Basic Newsroom
```python
# Save as test_newsroom.py
# Run: python test_newsroom.py
```

### Step 3: Add Sheets Integration
- Create service account for Google Sheets API
- Write fetch functions for ledgers
- Register as tools with agents

### Step 4: Add Scheduling
```python
# cron job or Google Apps Script trigger
# Every cycle: export data → run newsroom → save output
```

### Step 5: Add Echo Variant
- Duplicate script with Echo agents
- Different system messages (edgy tone)
- Run both, save separately

---

## File Structure

```
godworld-autogen/
├── agents/
│   ├── tribune_agents.py      # Carmen, Luis, Lila, Mags
│   ├── echo_agents.py         # P Slayer, J-Rock, MintCondition
│   └── tools.py               # Sheets fetch functions
├── workflows/
│   ├── pulse_generator.py     # Tribune Pulse workflow
│   ├── echo_generator.py      # Echo edition workflow
│   └── weekly_digest.py       # Combined weekly summary
├── output/
│   ├── cycle-78/
│   │   ├── tribune-pulse.md
│   │   └── echo-edition.md
│   └── ...
├── config.py                  # API keys, Sheets IDs
└── run.py                     # Main entry point
```

---

## Cost Estimation

| Component | API Calls | Est. Cost/Cycle |
|-----------|-----------|-----------------|
| Tribune Pulse (4 agents, 6 rounds) | ~24 calls | ~$0.50-1.00 |
| Echo Edition (4 agents, 4 rounds) | ~16 calls | ~$0.30-0.60 |
| Tool calls (Sheets fetch) | ~10 calls | ~$0.10-0.20 |
| **Total per cycle** | ~50 calls | **~$1-2** |

Using Claude Haiku for drafts, Sonnet for final: ~$0.30-0.50/cycle.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Agents hallucinate facts | Strong system messages, tool-grounded data |
| Conversation loops forever | `max_round` limit on GroupChat |
| Inconsistent voice | Detailed character backstories in prompts |
| Cost creep | Use Haiku for drafts, human review before publish |
| API rate limits | Add delays between calls, batch where possible |

---

## Next Steps

1. **Install AutoGen** — `pip install pyautogen`
2. **Test basic 2-agent chat** — Carmen + Editor only
3. **Add Sheets tool** — fetch one citizen, one initiative
4. **Scale to full newsroom** — all Tribune agents
5. **Add Echo variant** — parallel edgy workflow
6. **Schedule with cron** — auto-run on new cycle

---

## Questions to Resolve

- Run locally or on server? (Local Mac vs DigitalOcean)
- How many agent rounds before editor finalizes? (4-6 seems right)
- Human-in-loop review? (Discord approval before save?)
- Combine with OpenClaw? (Memory + triggers from OpenClaw, generation from AutoGen)

---

## Full Starter Script

### Prerequisites

1. **Python 3.8+** required
2. Create virtual environment (optional but recommended):
   ```bash
   python -m venv autogen_env
   source autogen_env/bin/activate  # Windows: autogen_env\Scripts\activate
   ```
3. Install packages:
   ```bash
   pip install pyautogen anthropic
   ```
4. Get Anthropic API key from anthropic.com/api
5. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

### The Script (godworld_autogen_starter.py)

```python
import os
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# Load Anthropic API key from environment variable
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable not set.")

# Claude LLM config (using Claude 3.5 Sonnet)
llm_config = {
    "config_list": [
        {
            "model": "claude-3-5-sonnet-20240620",
            "api_key": api_key,
            "api_type": "anthropic",
        }
    ],
    "temperature": 0.7,
    "max_tokens": 1500,
}

# Agent 1: Civic Reporter (Carmen Delaine style)
civic_reporter = AssistantAgent(
    name="Carmen_Delaine",
    system_message="""You are Carmen Delaine, Civic Ledger reporter for Cycle Pulse.
    Generate balanced, factual civic reports from GodWorld data.
    Use a warm, approachable tone.
    Structure as headlines and paragraphs.""",
    llm_config=llm_config,
)

# Agent 2: Data Analyst (summarizes raw data)
data_analyst = AssistantAgent(
    name="Data_Analyst",
    system_message="""You are a data analyst for Cycle Pulse.
    Summarize GodWorld raw data (sentiment, migration, neighborhood stats) into
    concise bullet points or tables. Highlight trends and implications.""",
    llm_config=llm_config,
)

# User Proxy (human-in-the-loop for oversight)
user_proxy = UserProxyAgent(
    name="User",
    human_input_mode="ALWAYS",  # Change to "NEVER" for full autonomy
    code_execution_config=False,
)

# Group Chat: The "newsroom"
group_chat = GroupChat(
    agents=[civic_reporter, data_analyst, user_proxy],
    messages=[],
    max_round=6,
)

# Group Chat Manager (orchestrates using Claude)
group_chat_manager = GroupChatManager(
    groupchat=group_chat,
    llm_config=llm_config,
)

# Sample GodWorld data (replace with actual Sheets/JSON export)
sample_data = """
Cycle: 77
Sentiment: 0.98
Migration: +265
Pattern: Steady
Neighborhood Stats: West Oakland - Nightlife 2.52, Sentiment 1.05
Arc Seeds: Instability early phase in Uptown/Laurel
Shock-flag: 15
Domains active: 9
Stabilization Fund: Committee 5-4, floor vote Cycle 78, needs 6, Vega yes, Tran undecided
"""

# Kick off the chat
user_proxy.initiate_chat(
    group_chat_manager,
    message=f"""Generate today's Cycle Pulse edition using this GodWorld data:

{sample_data}

Data Analyst: Summarize trends first.
Carmen: Write the civic report using your voice.
Collaborate to produce a final formatted edition.""",
)

print("\n--- Cycle Pulse Generation Complete ---")
```

### How It Works

1. **Agents Collaborate:** Data Analyst summarizes trends → Civic Reporter builds narrative → Manager coordinates
2. **Output:** Formatted Cycle Pulse in terminal (add file save with `with open('pulse.txt', 'w') as f:`)
3. **Autonomy:** Change `human_input_mode="NEVER"` for auto-run, add cron for scheduling

### What AutoGen Does Well for GodWorld

- **Multi-Agent Collaboration** — agents bounce ideas, build on each other (newsroom simulation)
- **LLM Flexibility** — Claude, Grok, local models — easy to switch
- **Workflow Automation** — chains tasks (data pull → analysis → generation)
- **Open-Source** — free, customizable, integrates with Sheets/scripts

### Future Enhancements

- Add more agents (Luis Navarro investigations, Dr. Mezran health, Mags editor)
- Integrate Sheets API for live data pull
- Add file output to media/ folder
- Schedule with cron for autonomous cycles

---

## Integration with OpenClaw (Full Architecture)

**OpenClaw + AutoGen** work as a powerful combo:
- **OpenClaw** = persistent memory + always-on trigger layer
- **AutoGen** = multi-agent creative/newsroom engine

### How They Work Together

```
[Your Google Sheets / Engine]
   ↓ (export JSON on cycle advance)
[OpenClaw - Local Always-On Agent]
   ├── Citizen Memory (SQLite/JSON) — persistent profiles, events, relationships
   ├── Cycle State Store — sentiment, migration, shock-flag, last Pulse
   ├── Watch Trigger — detects new cycle export
   └── Webhook/Endpoint — receives cycle JSON
         ↓
   [Trigger AutoGen Group Chat]
         ↓
[AutoGen Multi-Agent Newsroom]
   ├── Civic Agent (Carmen Delaine style)
   ├── Investigations Agent (Luis Navarro style)
   ├── Opinion Agent (Farrah Del Rio / P Slayer style)
   ├── Historian Agent (Hal Richmond style)
   ├── Mayor Agent (Santana principled tone)
   ├── Swing Voter Agents (Vega/Tran debate simulation)
   └── Editor Agent (Mags Corliss — final format & continuity check)
         ↓
[Generated Output]
   ├── Tribune Pulse .md
   ├── Echo Op-Ed .md
   ├── Supplemental (vote coverage, council watch)
   └── Saved back to OpenClaw memory folder + optional Discord/Slack notification
```

### What Each Tool Provides

| Capability | OpenClaw | AutoGen |
|------------|----------|---------|
| **Persistence** | SQLite/JSON citizen store | None (needs external store) |
| **Autonomy** | Watch triggers, cron | GroupChat auto-runs |
| **Distinct Voices** | Single agent | Multi-agent collaboration |
| **Memory** | Remembers forever | Per-conversation only |
| **Triggers** | File watch, webhooks | Manual or scheduler |
| **Best For** | Memory + automation | Creative multi-voice generation |

### OpenClaw: Cycle Watch Skill

Detects new cycle exports and triggers AutoGen:

```javascript
// skills/cycle-watch.js
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  name: 'cycleWatch',
  description: 'Watch for new cycle exports and trigger AutoGen',

  execute: async (context) => {
    const exportDir = path.join(__dirname, '../exports');
    const files = await fs.readdir(exportDir);

    const latest = files
      .filter(f => f.startsWith('cycle-') && f.endsWith('.json'))
      .sort()
      .pop();

    if (!latest) {
      return 'No cycle export found';
    }

    const data = JSON.parse(await fs.readFile(path.join(exportDir, latest)));

    // Save to state
    await context.state.set('currentCycle', data.cycle);
    await context.state.set('sentiment', data.sentiment);
    await context.state.set('migration', data.migration);

    // Trigger AutoGen newsroom
    await context.runSkill('runAutoGenPulse', data);

    return `Processed cycle ${data.cycle} — AutoGen triggered`;
  }
};
```

### OpenClaw: Shell Skill to Call AutoGen

Bridge from Node.js (OpenClaw) to Python (AutoGen):

```javascript
// skills/run-autogen-pulse.js
const { exec } = require('child_process');
const path = require('path');

module.exports = {
  name: 'runAutoGenPulse',
  description: 'Run AutoGen media generator script',

  execute: async (context, cycleData) => {
    const scriptPath = path.join(__dirname, '../autogen/godworld_pulse.py');
    const dataJson = JSON.stringify(cycleData).replace(/"/g, '\\"');

    return new Promise((resolve, reject) => {
      exec(
        `python "${scriptPath}" "${dataJson}"`,
        { maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('AutoGen error:', stderr);
            return reject(error);
          }

          // Save output to memory
          context.state.set('lastPulse', stdout);
          context.state.set('lastPulseDate', new Date().toISOString());

          resolve(stdout);
        }
      );
    });
  }
};
```

### AutoGen: Python Script Called by OpenClaw

```python
# autogen/godworld_pulse.py
import sys
import json
import os
from autogen import AssistantAgent, GroupChat, GroupChatManager, UserProxyAgent

# Parse cycle data from command line
cycle_data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}

config_list = [
    {
        "model": "claude-3-5-sonnet-20240620",
        "api_key": os.getenv("ANTHROPIC_API_KEY"),
        "api_type": "anthropic",
    }
]

# Tribune Civic Reporter
civic_reporter = AssistantAgent(
    name="Carmen_Delaine",
    system_message="""You are Carmen Delaine, Civic Ledger reporter.
    Write balanced, factual civic reports. Use professional tone.
    Include names index at bottom.""",
    llm_config={"config_list": config_list},
)

# Echo Opinion Writer
echo_opinion = AssistantAgent(
    name="Farrah_Del_Rio",
    system_message="""You are Farrah Del Rio, Echo opinion writer.
    Write sharp, skeptical, community-focused opinion pieces.
    Call out hesitation and power plays.""",
    llm_config={"config_list": config_list},
)

# Editor (final formatter)
editor = AssistantAgent(
    name="Mags_Corliss",
    system_message="""You are Mags Corliss, Editor-in-Chief.
    Review drafts, enforce continuity, format as Cycle Pulse edition.
    Sections: Lead, Council Watch, Neighborhood Beat, Looking Ahead.""",
    llm_config={"config_list": config_list},
)

groupchat = GroupChat(
    agents=[civic_reporter, echo_opinion, editor],
    messages=[],
    max_round=6,
)

manager = GroupChatManager(
    groupchat=groupchat,
    llm_config={"config_list": config_list}
)

user_proxy = UserProxyAgent(name="CycleData", human_input_mode="NEVER")

# Build prompt from cycle data
prompt = f"""Generate Cycle {cycle_data.get('cycle', 'N/A')} Pulse edition.

Data:
- Sentiment: {cycle_data.get('sentiment', 'N/A')}
- Migration: {cycle_data.get('migration', 'N/A')}
- Pattern: {cycle_data.get('pattern', 'N/A')}
- Active Arcs: {cycle_data.get('activeArcs', [])}
- Key Citizens: {cycle_data.get('keyCitizens', [])}

Carmen: Write civic report.
Farrah: Write opinion piece (if tension warrants).
Mags: Format final edition."""

user_proxy.initiate_chat(manager, message=prompt)

# Output goes to stdout, captured by OpenClaw
```

### Final Recommended Flow

```
Engine Cycle Ends
    ↓
cycleExportAutomation.js exports JSON to exports/
    ↓
OpenClaw cycle-watch.js detects new file
    ↓
OpenClaw pulls citizen memory from SQLite
    ↓
OpenClaw calls run-autogen-pulse.js with context
    ↓
AutoGen agents collaborate (Carmen → Farrah → Mags)
    ↓
AutoGen returns formatted Pulse to stdout
    ↓
OpenClaw saves to media/cycle-XX/tribune-pulse.md
    ↓
OpenClaw sends Discord/Slack notification: "Cycle XX Pulse ready for review"
    ↓
Human reviews and approves
```

### Benefits of This Architecture

| Benefit | How |
|---------|-----|
| **Persistence** | OpenClaw SQLite stores citizen history forever |
| **Autonomy** | Watch trigger + cron = no manual prompting |
| **Voice Differentiation** | AutoGen agents have distinct system messages |
| **Low Manual Work** | Human only reviews, doesn't generate |
| **Cost Control** | Haiku for drafts, Sonnet for final only |
| **Continuity** | Editor agent checks names/timeline before publish |
