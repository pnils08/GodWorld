# AutoGen Integration Plan for GodWorld

**Status:** Planning
**Goal:** Multi-agent newsroom for autonomous media generation
**Last Updated:** 2026-02-02

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
