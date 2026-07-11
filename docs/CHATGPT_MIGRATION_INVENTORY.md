# GodWorld → ChatGPT/OpenAI Migration Inventory

Mike-directed (2026-07-10, S309, media). Documentation only — nothing in this repo changes because this file exists. Catalogs what carries over as-is versus what needs rebuilding if GodWorld moves off Claude Code to ChatGPT/the OpenAI stack.

**How to read this:** each section is either PORTABLE (copy/paste or upload, works immediately) or REBUILD (the mechanism is Claude-Code-specific; the same *behavior* needs to be re-implemented on OpenAI's tools, not just copied).

---

## PORTABLE — moves as-is

| What | Where | Why it's portable |
|---|---|---|
| The simulation itself | Google Sheets (Simulation_Ledger, Initiative_Tracker, Story_Seed_Deck, etc.) | Pure data. No AI involved in storage. |
| The engine | Google Apps Script (`godWorldEngine2.js` + related) | Runs on Google's infra, independent of whichever AI is used to talk about it. |
| Canon & doctrine docs | `docs/` — 338 `.md` files (CHARACTER.md, NEWSROOM_MEMORY.md, canon archive, reporter voice files, ADRs, etc.) | Plain text. Any LLM can read it if you give it to them — paste into a ChatGPT Project's instructions, or upload as Custom GPT knowledge files. |
| Governing rule files | `CLAUDE.md`, `.claude/rules/*.md` (identity.md, newsroom.md, civic.md, research-build.md, etc.) | Same — text, portable content, not portable *auto-loading behavior* (see REBUILD). |
| Utility scripts | `scripts/*.js` — 298 files (queryLedger.js, dumpLedger.js, checkLetterEligibility.js, etc.) | Plain Node.js. Runs from any shell; not tied to Claude Code. |
| Memory content | `.claude/projects/-root-GodWorld/memory/*.md` (this auto-memory system's files) | Text content is portable; the auto-recall *mechanism* (see REBUILD) is not. |

---

## REBUILD — mechanism is Claude-Code-specific

### 1. Skills (50 files, `.claude/skills/*/SKILL.md`)
**What it does here:** Claude Code reads each skill's frontmatter `description`, matches it against what you type, and invokes the matching skill automatically — or you type `/skill-name` directly. `/sift`, `/write-edition`, `/city-hall`, `/session-end`, etc. are all this mechanism.
**OpenAI equivalent:** No native auto-trigger-by-description matching. Closest options: (a) a Custom GPT's "Instructions" field manually enumerating available "skills" as callable procedures, with the model deciding when to apply them from context — weaker matching than Claude Code's; (b) the OpenAI Assistants/Agents API with function-calling, where you'd register each skill as a callable function/tool and write the dispatch logic yourself.
**Scope:** 50 skill files, each would need re-authoring as either a Custom GPT instruction block or an Agents-SDK tool definition.

### 2. Subagents (33 agent configs, `.claude/agents/*`, the Agent tool)
**What it does here:** Parallel/background dispatch — e.g. tonight's 7 Haiku-tier scouts running concurrent canon-archive research, or the desk-reporter agents (`business-desk`, `civic-desk`, `sports-desk`, etc.) each writing their section independently.
**OpenAI equivalent:** No built-in parallel subagent dispatcher. Rebuildable on the OpenAI Agents SDK (multi-agent orchestration primitives exist there) or by hand-rolling concurrent API calls, but the orchestration code is net-new, not a port.
**Scope:** 31 distinct agent directories (desk agents, civic-office agents, civic-project agents, citizen-voice agents, reviewer agents like Rhea/Final Arbiter).

### 3. MCP servers (1 project-level: `godworld`)
**What it does here:** `scripts/godworld-mcp.py` exposes `lookup_citizen`, `search_canon`, `get_neighborhood_state`, etc. as Model Context Protocol tools Claude calls directly. Plus plugin-level MCP servers used this session: claude-mem (persistent memory search), Supermemory, Discord, Playwright.
**OpenAI equivalent:** MCP is an Anthropic-originated open spec; it is not natively wired into ChatGPT. The same Python server's *logic* (it's just a script reading Google Sheets) is reusable, but it needs a different transport layer — OpenAI Actions (OpenAPI-described HTTP endpoints) or function-calling definitions instead of MCP's tool-call protocol.
**Scope:** 1 custom server + however many of the plugin MCP servers (claude-mem, supermemory, discord) the ChatGPT-side build wants to keep.

### 4. Hooks (`.claude/settings.json` — 3 event types: `PreToolUse`, `SessionStart`, `Stop`)
**What it does here:** `SessionStart` runs the terminal-boot sequence (reads CLAUDE.md, character files, runs `queryFamily.js`); `PreToolUse` enforces things like the boot-doc-read gate and the control-plane commit guard; `Stop` handles session-end bookkeeping.
**OpenAI equivalent:** No direct analog. This behavior would move into whatever orchestration wrapper you build around the OpenAI API calls (a Python/Node script that runs boot logic before every conversation turn, etc.) — outside ChatGPT's own product surface entirely if using the raw API.

### 5. claude-mem / auto-memory system
**What it does here:** Auto-captures session observations, journals, and enables `mcp__plugin_claude-mem_mcp-search__*` recall across sessions — the "MEMORY.md force-loaded + per-topic files on demand" pattern documented in this repo's own memory index.
**OpenAI equivalent:** Would need either the Assistants API's thread/file-based memory, a custom vector-store retrieval layer, or a hand-rolled equivalent of this project's own MEMORY.md-plus-pointer-files convention (which is itself portable as a *pattern*, just not the auto-search plumbing).

### 6. Four-terminal tmux architecture
**What it does here:** `claude --name "media"` / `"civic"` / `"engine-sheet"` / `"research-build"` — four persistent named Claude Code sessions in one tmux window, each boot-reading a different `TERMINAL.md` scope via the SessionStart hook.
**OpenAI equivalent:** Nothing product-specific to port — this is just a convention (four separate conversations/contexts, each with its own system prompt). Directly replicable as four separate ChatGPT Projects or four separate Assistants API threads, each seeded with the matching `TERMINAL.md` content as instructions.

---

## Net summary

| Category | Portable | Rebuild |
|---|---|---|
| World data + engine | ✅ | — |
| Canon/doctrine text | ✅ | — |
| Utility scripts | ✅ | — |
| Skills (auto-trigger) | — | 50 files |
| Subagents (parallel dispatch) | — | 31 configs |
| MCP tool servers | — | 1 custom + plugin servers |
| Hooks | — | 3 event types |
| Cross-session memory | — | 1 system |
| Terminal architecture | ✅ (as convention) | — |

The world and its canon move for free. The apparatus that runs edition production, city-hall, engine review, and cross-session memory is a second build.

---

Related: [[../CLAUDE.md]] (what this inventories), [[../.claude/skills]] (the 50 skills), [[../.claude/agents]] (the 33 agent configs).
