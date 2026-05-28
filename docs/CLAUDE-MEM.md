# Claude-Mem — Local Work History & Code Tools

**Plugin:** `claude-mem` v13.3.0 (thedotmack, marketplace install) — upgraded from v10.5.2 S241, restart-applied + smoke-tested S242. License relicensed AGPL-3.0 → Apache-2.0 at v13.0.0.
**Worker:** Bun service on port 37777 | **DB:** SQLite + Chroma at `~/.claude-mem/`
**Role:** Work log — what happened, what was built, what went wrong. Complements Supermemory (the brain).

> **Upgrade lineage:** v10.5.2 → v13.3.0 (three majors). Breaking-change scan + per-version migration table: [[plans/2026-05-28-claude-mem-v13-upgrade-evaluation]] §Breaking-change scan. All v11/v12/v13 migrations auto-ran on first restart (Migration 25 `platform_source` column, schema v31→v32 dead-column drops, one-shot v12.4.3 cleanup). Pre-upgrade insurance: full 2.2 GB store backed up to `/root/.claude-mem.bak-S241/`; old `10.5.2` plugin cache retained for rollback.

## Post-upgrade gotcha (S242) — missing zod

The v13.3.0 cache shipped **without `zod` installed** (declares `zod: ^4.3.6` in package.json; only the tree-sitter native modules got built). The Stop/PostToolUse/SessionStart hooks all run through `worker-service.cjs`, which imports `zod/v3` — so every session-end threw `Cannot find module 'zod/v3'` and **no memory was captured**. Fix (S242): `cd /root/.claude/plugins/cache/thedotmack/claude-mem/13.3.0/ && npm install zod@^4.3.6 --no-save` (zod 4 ships the `zod/v3` back-compat subpath). Smoke test confirmed clean. **This fix lives in the version-pinned cache dir — if claude-mem auto-updates, the new dir may ship without zod again; same one-line fix.**

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

Claude-mem bundles code/workflow tools. v13.3.0 ships a much larger set than v10.5.2 (added: `oh-my-issues`, `design-is`, `pathfinder`, `learn-codebase`, `knowledge-agent`, `timeline-report`, `weekly-digests`, `wowerpoint`, `babysit`, `version-bump`, `how-it-works`). **The two GodWorld previously fit-checked both came back SKIP** — `oh-my-issues` assumes GitHub-issues-as-source-of-truth (project tracks defects in files), `design-is` audits against Dieter Rams (wrong lineage for newspaper-layout editions). Verdicts: [[plans/2026-05-28-claude-mem-v13-upgrade-evaluation]] §oh-my-issues + §design-is.

| Skill | Purpose | Overlap |
|-------|---------|---------|
| `smart-explore` | AST-based code navigation via tree-sitter. Structural search without reading full files. | None — unique |
| `make-plan` | Create phased implementation plans with documentation discovery | None — unique |
| `do` | Execute phased plans using subagents | None — unique |
| `mem-search` | Search observation history by keyword/semantic | Partial overlap with `/super-search` |
| `oh-my-issues` | Root-cause clustering of a GitHub issue backlog → plan-master issues | SKIP (GitHub-issues input; project uses files) |
| `design-is` | Audit a design against Dieter Rams' ten principles | SKIP for editions (wrong design lineage); DEFER for dashboard |
| `pathfinder` / `learn-codebase` / `knowledge-agent` / `timeline-report` / `weekly-digests` | Codebase mapping, priming, knowledge-base build, timeline narratives | Unevaluated — on-demand only |

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
| `CLAUDE_MEM_PROVIDER` | `openrouter` | AI provider for summarization. **Live value drifted from `claude` → `openrouter`** (model row still says sonnet; `CLAUDE_MEM_OPENROUTER_MODEL=deepseek/deepseek-chat:free`). Both `CLAUDE_MEM_OPENROUTER_API_KEY` and `CLAUDE_MEM_GEMINI_API_KEY` are **empty** in `settings.json`; `CLAUDE_MEM_CLAUDE_AUTH_METHOD=cli` is also set. Which path actually runs at summarization time is unverified as of S242 — flagged, not resolved. v13's local mode does **not** expose the server-beta multi-provider routing ([[plans/2026-05-28-claude-mem-v13-upgrade-evaluation]] §Multi-provider verdict: DEFER). |
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
| SQLite DB | 418 MB | `~/.claude-mem/claude-mem.db` |
| Chroma vector store | 1.5 GB | `~/.claude-mem/chroma/` |
| **Live store total** | **2.2 GB** | `~/.claude-mem/` (live as of S242) |
| S241 pre-upgrade backup | 2.2 GB | `/root/.claude-mem.bak-S241/` — delete after a few sessions of confirmed-stable post-upgrade operation |

Store nearly tripled since the last snapshot (was 741 MB) — Chroma growth dominates. Monitor; the duplicate 2.2 GB backup means ~4.4 GB committed to memory until the backup is retired. Retention/cleanup investigation is now overdue, not "if it grows past 1GB."

---

## AutoDream — DISABLED S228 (2026-05-23)

`autoDreamEnabled: false` in `~/.claude/settings.json`. The consolidation layer is off.

**Lineage:** Sonnet 4.6 (S120, $$$) → Gemini 2.5 Pro (S141, "free tier") → DeepSeek via OpenRouter (S228, free) → **disabled (S228 same day)**.

**Why disabled, not just rerouted:** every provider switch was cost-management on a layer whose load-bearing-ness was never tested. The Always-Load tables in `.claude/terminals/*/TERMINAL.md` point at MD files (CHARACTER, JOURNAL_RECENT, MEMORY.md, SESSION_CONTEXT, NEWSROOM_MEMORY) and Supermemory containers — nothing explicitly reads autodream-generated summaries. claude-mem still captures raw observations (the daemon stays alive for MCP search). Supermemory ($9/mo) is the deliberate brain. MDs are the explicit persistence layer. AutoDream's semantic-summary middle layer is redundant given those three.

**What stays running:** claude-mem worker daemon (port 37777) for MCP memory search (`mcp__plugin_claude-mem_mcp-search__*` tools still work — they query the existing observations DB). Observations DB also keeps growing from raw tool-call captures.

**To re-enable if a real gap surfaces:** flip `autoDreamEnabled: true` in `~/.claude/settings.json` + set a working provider/key in `/root/.claude-mem/settings.json`. Observations DB intact — no data lost by the disable.

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
