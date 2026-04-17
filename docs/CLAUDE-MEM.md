# Claude-Mem — Local Work History & Code Tools

**Plugin:** `claude-mem` v10.5.2 (thedotmack, marketplace install)
**Worker:** Bun service on port 37777 | **DB:** SQLite + Chroma at `~/.claude-mem/`
**Role:** Work log — what happened, what was built, what went wrong. Complements Supermemory (the brain).

---

## How It Fits With Supermemory

These are NOT competing systems. They serve different purposes:

| System | What it stores | How | Where |
|--------|---------------|-----|-------|
| **Supermemory** | Who I am + what I know (curated identity, project facts, reference data) | Manual saves + session summaries | Cloud (P N org) |
| **claude-mem** | What I did + what I found (granular work log, observations, discoveries) | Automatic capture on every tool use | Local (SQLite + Chroma) |
| **Local files** | Ground truth (identity, editorial, engine docs) | Manual, version-controlled | Disk |

If both try to be "the memory," it's noise. Supermemory is the brain. Claude-mem is the work log.

---

## What It Captures

Every tool call triggers the PostToolUse hook, which summarizes what happened into a typed observation:

| Type | What it captures |
|------|-----------------|
| discovery | Code patterns, data findings, system state |
| change | File modifications, config updates |
| feature | New scripts, skills, functionality |
| bugfix | Error fixes, repair work |
| decision | Architectural choices, editorial calls |
| refactor | Code restructuring |

Each observation includes: title, narrative, type, concepts, files read/modified, discovery tokens, content hash (dedup). Counts drift every session — check live via the claude-mem MCP tools (`mcp__plugin_claude-mem_mcp-search__timeline`) rather than pinning a snapshot here.

---

## What It Gives Me At Session Boot

The SessionStart hook injects a **context index** — a semantic table of recent observations with:
- Session boundaries and timestamps
- Observation types and titles
- Token costs (read cost vs work investment)
- File associations
- Savings calculation (how much context reuse saves)

This is the structured work history at the top of every conversation. It shows ~50 recent observations and tells me what happened without re-reading everything.

---

## Skills (Non-Memory)

Claude-mem bundles useful code tools that have nothing to do with memory:

| Skill | Purpose | Overlap |
|-------|---------|---------|
| `smart-explore` | AST-based code navigation via tree-sitter. Structural search without reading full files. | None — unique |
| `make-plan` | Create phased implementation plans with documentation discovery | None — unique |
| `do` | Execute phased plans using subagents | None — unique |
| `mem-search` | Search observation history by keyword/semantic | Partial overlap with `/super-search` |

---

## Hooks

| Hook | When | What |
|------|------|------|
| Setup | Plugin init | Install dependencies, check versions |
| SessionStart | Boot | Start worker, inject context index |
| UserPromptSubmit | Each message | Initialize session tracking |
| PostToolUse | Every tool call | Summarize into typed observation (uses AI model) |
| Stop | Session end | Generate session summary, mark complete |

---

## Configuration

Settings at `~/.claude-mem/settings.json`:

| Setting | Current Value | Notes |
|---------|--------------|-------|
| `CLAUDE_MEM_MODEL` | `claude-sonnet-4-6` | Model used for observation summarization. **Cost concern — see below.** |
| `CLAUDE_MEM_PROVIDER` | `claude` | AI provider for summarization |
| `CLAUDE_MEM_CONTEXT_OBSERVATIONS` | `50` | Observations loaded at boot |
| `CLAUDE_MEM_WORKER_PORT` | `37777` | Worker HTTP API port |
| `CLAUDE_MEM_SKIP_TOOLS` | ListMcpResourcesTool, SlashCommand, Skill, TodoWrite, AskUserQuestion | Tools excluded from capture |
| `CLAUDE_MEM_CONTEXT_OBSERVATION_TYPES` | bugfix, feature, refactor, discovery, decision, change | Which types to capture |
| `CLAUDE_MEM_CONTEXT_FULL_COUNT` | `5` | Full narrative observations at boot |
| `CLAUDE_MEM_CONTEXT_SESSION_COUNT` | `10` | Sessions shown in context index |
| `CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED` | `false` | Don't auto-write to CLAUDE.md |

---

## Disk Usage

| Component | Size | Location |
|-----------|------|----------|
| SQLite DB | 219 MB | `~/.claude-mem/claude-mem.db` |
| Chroma vector store | 383 MB | `~/.claude-mem/chroma/` |
| Logs + misc | ~5 MB | `~/.claude-mem/logs/` |
| **Total** | **741 MB** | 3% of 25GB droplet |

Monitor this. If it grows past 1GB, investigate retention/cleanup options.

---

## Cost Optimization — TODO

The PostToolUse hook calls Sonnet 4.6 to summarize every tool call into an observation. Over 120 sessions and 6,282 observations, that's significant token spend.

**Cheaper alternatives (need API keys):**
- `CLAUDE_MEM_PROVIDER: "openrouter"` + `CLAUDE_MEM_OPENROUTER_MODEL: "xiaomi/mimo-v2-flash:free"` — literally free
- `CLAUDE_MEM_PROVIDER: "gemini"` + `CLAUDE_MEM_GEMINI_MODEL: "gemini-2.5-flash-lite"` — free tier

Both require API keys we don't currently have:
- OpenRouter: sign up at openrouter.ai, get free API key, set `CLAUDE_MEM_OPENROUTER_API_KEY`
- Gemini: Google AI Studio, get free API key, set `CLAUDE_MEM_GEMINI_API_KEY`

Either would eliminate the observation summarization cost entirely.

---

## Correction Tracking — Future Gap

Neither claude-mem nor Supermemory tracks **corrections** — when Mike says "that's wrong" or "that sheet is dead," nothing records the correction for future sessions. The anti-guess rules in identity.md are manually written after repeated failures.

**Concept from HelloRuru's claude-memory-engine:** A pitfall detection system that automatically logs when the user corrects an error, tracks recurrence, and reminds future sessions. Could be built as a simple `/correct` skill that appends to a corrections log, loaded at boot. Not a new memory system — just a file and a skill on top of what we have.

---

## Maintenance Commands

```bash
# Check worker health
curl http://localhost:37777/health

# View web UI (if accessible)
# http://localhost:37777

# Database stats
sqlite3 ~/.claude-mem/claude-mem.db "SELECT type, COUNT(*) FROM observations GROUP BY type ORDER BY COUNT(*) DESC;"

# Disk usage
du -sh ~/.claude-mem/
```
