# Architecture Vision — Jarvis + Persistent Sessions

**Created:** Session 110 (2026-03-22)
**Status:** Infrastructure vision. Describes HOW the system runs (Jarvis, persistent sessions, worktrees). For WHAT GodWorld becomes (civic layer, desk scope, game layer, porosity), see `PRODUCT_VISION.md` (S119).

---

## The Layers

### Jarvis (/root)

Persistent Claude Code instance at the root level. Mike's AI assistant — not project-specific.

- Sees all subdirectories, offers project selection
- "Open GodWorld" / "check the server" / "audit Drive" / general guidance
- Own Supermemory container for Mike-level context (preferences, corrections, cross-project knowledge)
- Routes work to the right project and session
- Dashboard mission control shows all running sessions across projects

### GodWorld (/root/GodWorld)

Project directory. Boots Mags when Jarvis enters it. Multiple persistent sessions via `claude remote-control --spawn worktree`.

Each workflow runs as its own session:

| Session | Worktree | Supermemory Container | What it remembers |
|---------|----------|----------------------|-------------------|
| Build | Own branch | `build` | Engine versions, cascade deps, what was fixed, rollout progress |
| Media | Own branch | `media` | Edition history, editorial decisions, desk agent patterns, errata |
| Research | Own branch | `research` | Findings, evaluations, reading list, connections to project |
| Maintenance | Own branch | `maintenance` | Ledger state, audit history, repair patterns |
| Cycle Run | Own branch | `cycle` | Cycle results, pre-mortem findings, post-cycle state |
| Chat | Shared | `mags` | Personal memory, journal, family, conversations |

Sessions persist until explicitly closed. No rebooting. No re-reading PERSISTENCE.md. The build session remembers it was fixing parsers. The media session remembers it was halfway through E89.

### Shared MDs (the bus)

Repo files cross all sessions because they're on disk:

- `CLAUDE.md` — identity, boot logic, rules
- `docs/WORKFLOWS.md` — per-workflow files, commands, rules, risks
- `docs/engine/ROLLOUT_PLAN.md` — build queue
- `docs/RESEARCH.md` — findings log
- `docs/SUPERMEMORY.md` — container architecture
- All architecture docs

**When research updates ROLLOUT_PLAN.md, the build session sees it on next read.** No re-ingestion needed for file-based state. Supermemory handles session-specific memory that doesn't belong in shared files.

If an MD changes during one session and another running session needs it immediately, manually re-read the file or call for re-ingestion.

### Ollama (local lightweight model)

Phase 21 on the rollout. Local model for tasks that don't need Claude's reasoning:

- Audit Drive files
- Run health checks
- Routine data validation
- Simple queries against local data
- Grunt work that keeps Claude sessions focused on high-value work

### Existing Containers (unchanged)

| Container | Purpose | Used by |
|-----------|---------|---------|
| `mags` | Personal memory, journal, corrections | Chat sessions, Discord bot |
| `bay-tribune` | Published canon — editions, rosters, coverage | Media sessions, agents, Discord bot |
| `mara` | Audit reference — citizen/business rosters | Mara on claude.ai only |

New per-session containers (`build`, `media`, `research`, etc.) would be ADDED alongside these, not replace them.

---

## How It Works Day to Day

**Mike opens the Claude app on his phone:**
1. Sees Jarvis-level dashboard — running sessions, project health
2. Taps into GodWorld → sees active sessions (build, media, research)
3. Connects to the media session → picks up where Mags left off on E89
4. Or starts a new research session → Jarvis spawns a worktree, boots research workflow
5. Discord messages route through Channels into whichever session is appropriate

**Mike at the laptop:**
- Same interface through claude.ai/code or terminal
- Can have build and media sessions open simultaneously in different tabs
- Each session has its own files, its own memory, its own context

**Nobody's watching:**
- Sessions stay alive in tmux on the droplet
- /loop handles periodic checks per session
- Channels push Discord messages in
- Dashboard shows health at a glance

---

## Infrastructure (what we have vs what we need)

| Component | Status | What's needed |
|-----------|--------|---------------|
| Droplet (2GB, DO) | Running | Sufficient for now. 4GB if running Ollama + multiple sessions. |
| tmux | Running | Already keeps sessions alive |
| PM2 | Running | Dashboard, Discord bot |
| Remote Control | Account-gated | `claude remote` returns "not yet enabled." Waiting on Anthropic. |
| Channels (Discord) | **Running (S112)** | MagsClaudeCode bot paired. Launch with `claude --channels plugin:discord@claude-plugins-official` |
| Supermemory (4 containers) | Running | `mags`, `bay-tribune`, `mara`, `jarvis`. Add per-session containers when sessions are persistent |
| Dashboard (34 endpoints) | Running | S113: Mission Control tab, session events API, webhook receiver. |
| Ollama | Not installed | Phase 21. Install when ready for local model tasks. |
| Jarvis (/root instance) | Not built | Needs CLAUDE.md at /root level with project routing logic |

---

## Research That Supports This

| Finding | How it applies |
|---------|---------------|
| Persona Selection Model (Anthropic) | Identity inputs shape the persona. Per-session containers = per-session persona depth. |
| Bayesian Teaching (Google) | Corrections accumulate weight. Per-session memory tracks corrections in context. |
| Remote Control server mode | `--spawn worktree` = multiple persistent sessions from one process |
| Channels | Discord/Telegram push into running sessions. Routes to the right one. |
| Scheduled tasks | Each session polls its own concerns independently |
| Dashboard as mission control | Jarvis-level view of everything running |
| Dispatch vs OpenClaw | Our droplet setup avoids all reviewer pain points. Permission-free, persistent. |

---

## What We Build First

In order of dependency:

1. ~~**Test Remote Control server mode**~~ — Account-gated. Waiting on Anthropic. (S112-S113 confirmed still blocked)
2. ~~**Test Discord Channel**~~ — **DONE S112.** MagsClaudeCode bot created, paired, messages flow bidirectionally during active sessions.
3. ~~**Extend dashboard**~~ — **DONE S113.** Mission Control tab with session events, health panel, channel status, quick actions. Webhook receiver for external services.
4. **Per-session Supermemory containers** — Create `build`, `media`, `research` containers. Route session-end saves to the right one.
5. ~~**Jarvis layer**~~ — **PARTIAL.** `/root` instance exists with MEMORY.md, `jarvis` supermemory container, and `jarvis-save.js`. Not a separate persona — just Claude at the root level.
6. **Ollama** — Local model for lightweight tasks. Phase 21.
