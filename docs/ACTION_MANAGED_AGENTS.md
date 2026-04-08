# Action Document: Claude Managed Agents for GodWorld

**Created:** S137b (2026-04-08) | **Status:** Research Complete, Ready to Evaluate

---

## What It Is

Claude Managed Agents = cloud-hosted agents on Anthropic's infrastructure. You define the agent (instructions, tools, permissions), Anthropic handles orchestration, context management, error recovery, sandboxed execution. Agents run in the cloud, not on your server.

Two components:
1. **Claude Agent SDK** (Python + TypeScript) — build agents programmatically with the same tools as Claude Code (Read, Edit, Bash, Glob, Grep, WebSearch, etc.)
2. **Managed infrastructure** — Anthropic hosts and runs the agents, handles sessions, checkpointing, and scaling

## Pricing

- Standard API token pricing (input/output)
- **$0.08 per session-hour** for active runtime
- Idle time doesn't count

## Key Capabilities

| Feature | What it means for GodWorld |
|---------|---------------------------|
| **Built-in tools** | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch — same as Claude Code |
| **MCP support** | Agents can connect to MCP servers. Our GodWorld MCP would work. |
| **Subagents** | Main agent spawns specialized subagents — exactly our Mags→reporter pattern |
| **Hooks** | PreToolUse, PostToolUse, Stop, SessionStart — same as our local hooks |
| **Sessions** | Persistent sessions with resume. Context survives across exchanges. |
| **Skills** | `.claude/skills/*/SKILL.md` — our existing skills would work |
| **CLAUDE.md** | Project instructions — our CLAUDE.md works as-is |
| **Permissions** | allowed_tools, permission modes — same as our agent SKILL.md configs |
| **Custom agents** | Define agents with description, prompt, tools — our IDENTITY.md + RULES.md pattern |

## What This Enables for GodWorld

### Tier 1: Reporter Agents in the Cloud (Immediate Value)

Deploy all 9 reporters as managed agents. Each reporter gets:
- Their IDENTITY.md as the agent prompt
- Tools: Read, Glob, Grep, Write (same as current SKILL.md)
- MCP: GodWorld MCP for citizen lookup, canon search
- Runs in parallel on Anthropic's cloud, not our 4GB server

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

# Define Carmen Delaine as a managed agent
carmen = AgentDefinition(
    description="Bay Tribune civic reporter",
    prompt=open(".claude/agents/civic-desk/IDENTITY.md").read(),
    tools=["Read", "Glob", "Grep", "Write"],
)

# Launch with angle brief as input
async for msg in query(
    prompt="Write a civic article about OARI deployment. Brief: ...",
    options=ClaudeAgentOptions(
        agents={"carmen-delaine": carmen},
        mcp_servers={"godworld": {"command": "python3", "args": ["scripts/godworld-mcp.py"]}}
    )
):
    print(msg)
```

**Cost estimate per edition:** 9 reporters × ~5 min each × $0.08/hr = ~$0.06 session cost + tokens (~$2-5 for Sonnet). Total: ~$3-6 per edition vs current $2-4 (slightly more but parallel, no server load).

### Tier 2: City-Hall Voices as Persistent Agents

Mayor Santana, Chief Montez, council members — each as a managed agent with session persistence. Between cycles, their session state survives. Next cycle, they "remember" their last decision.

```python
# Mayor with session persistence
async for msg in query(
    prompt=open("output/civic-voice-workspace/civic-office-mayor/current/pending_decisions.md").read(),
    options=ClaudeAgentOptions(
        system_prompt=open(".claude/agents/civic-office-mayor/IDENTITY.md").read(),
        resume=mayor_session_id,  # Resume from last cycle
    )
):
    process(msg)
```

### Tier 3: Mara as a Managed Agent (Solves the MCP Problem)

Instead of Mara on claude.ai with broken MCP access, deploy her as a managed agent with full MCP access to our GodWorld server.

```python
mara = AgentDefinition(
    description="Canon auditor for the Bay Tribune",
    prompt="You are Mara Vance, City Planning Director...",
    tools=["Read", "Glob", "Grep"],
)

# Mara with GodWorld MCP access
async for msg in query(
    prompt="Audit Edition 91 for canon errors",
    options=ClaudeAgentOptions(
        agents={"mara": mara},
        mcp_servers={"godworld": {"command": "python3", "args": ["scripts/godworld-mcp.py"]}}
    )
):
    print(msg)
```

### Tier 4: Autonomous Cycle (Phase 12.3)

The full pipeline as a managed agent orchestrator:

1. Orchestrator agent runs `/city-hall` → spawns voice subagents
2. Orchestrator runs `/write-edition` → spawns 9 reporter subagents in parallel
3. Orchestrator compiles, validates, runs Rhea subagent
4. Orchestrator sends to Mara subagent for audit
5. Human approval gate → publish

All on Anthropic's cloud. Server only needs to run the GodWorld MCP and serve sheet data.

## What Needs to Happen

### Prerequisites (already done)
- [x] GodWorld MCP server (`scripts/godworld-mcp.py`)
- [x] Agent IDENTITY.md + RULES.md for all reporters and voices
- [x] Skills defined in `.claude/skills/`
- [x] CLAUDE.md with project instructions

### To Build
1. **Install Agent SDK:** `pip install claude-agent-sdk`
2. **Create orchestrator script:** `scripts/run-edition-managed.py` — defines all 9 reporters as agents, launches them with angle briefs, collects output
3. **Test one reporter:** Deploy Carmen Delaine as a managed agent, give her an E90-style brief, compare output quality to local subagent
4. **Test MCP access:** Verify the managed agent can call `lookup_citizen` through our MCP server
5. **Session persistence test:** Run Mayor twice with resume — does he remember the last decision?

### Open Questions
- Can managed agents connect to MCP servers on our VPS? (need to test — may need HTTPS tunnel like Cloudflare)
- Does session resume work across days? (documentation says yes but needs verification)
- Can we run the orchestrator locally and agents in the cloud? (likely yes — that's the SDK model)
- Token costs at scale — 9 reporters × 90 cycles/year = 810 agent sessions per year

## Recommendation

**Start with Tier 1 — one reporter as a test.** Install the SDK, deploy Carmen Delaine with an E90 brief and the GodWorld MCP. Compare output, cost, and speed against the local subagent approach. If it works, we have our production architecture for E92+.

This is the infrastructure answer for Phase 12.3 (autonomous cycles). The server becomes a data layer (MCP + sheets), Anthropic's cloud becomes the compute layer, and the feedback loop we built tonight feeds both.
