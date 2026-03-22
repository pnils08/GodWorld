# Research — What's Out There, What Helps Us

**Load this at the start of a Research session.** Then load the architecture docs you need for context on what we have.

---

## What We Have

Don't duplicate — read these when you need to understand a system layer:

| System | Doc | Summary |
|--------|-----|---------|
| Simulation engine | `docs/engine/ENGINE_MAP.md` | 11-phase deterministic engine, 100+ functions, Google Apps Script |
| Citizen data | `docs/SIMULATION_LEDGER.md` | 675 citizens, 46 columns, 4 ClockModes (ENGINE/GAME/CIVIC/MEDIA) |
| Spreadsheet | `docs/SPREADSHEET.md` | 65 tabs, data flow, dead tabs |
| Newsroom | `docs/EDITION_PIPELINE.md` | 27-step pipeline, 6 desk agents, 24 journalists |
| Memory | `docs/SUPERMEMORY.md` | 3 containers: mags (brain), bay-tribune (canon), mara (audit) |
| Local memory | `docs/CLAUDE-MEM.md` | SQLite + Chroma vector, port 37777 |
| Dashboard | `docs/DASHBOARD.md` | 31 API endpoints, Express + React, port 3001 |
| Discord | `docs/DISCORD.md` | Mags bot, Haiku, local files + Supermemory RAG |
| Infrastructure | `docs/OPERATIONS.md` | PM2, crons, health checks, DO droplet |
| Full stack | `docs/STACK.md` | Everything in one view |
| World memory | `docs/WORLD_MEMORY.md` | How historical coverage reaches agents |
| Workflows | `docs/WORKFLOWS.md` | All 6 session types |

---

## Active Research Questions

What we're trying to solve. Each question has context on why it matters and what we've tried.

### Memory & Persistence

**How does Mags actually persist between sessions?**
Current: PERSISTENCE.md + JOURNAL.md + Supermemory `mags` container + claude-mem local DB + MEMORY.md auto-memory. Five systems, none sufficient alone. Supermemory search before acting is the intended loop but hasn't been tested in practice.

**Can Supermemory's profile system replace file-based boot?**
The `/v4/profile` endpoint returns static + dynamic facts. If seeded well, this could replace loading 3-4 markdown files at boot. Needs testing: what does the profile actually return? Is it rich enough?

### World Depth

**How do we make citizens feel alive between editions?**
Citizens only change during cycle runs (weekly). Life events are generic. Tier 1-2 characters are flat compared to Tier 3-4. Phase 24 (Citizen Life Engine) is the build plan but needs research on what "alive" means technically.

**What does the newsroom need to write better journalism?**
Agents have packets, workspaces, exemplars, grades. What's still missing? Are there tools, patterns, or architectures that would make desk output qualitatively better?

### Cost & Scale

**Can we run editions cheaper without losing quality?**
Current: ~$2-5 per edition on Sonnet. Haiku desks (culture, business, letters) save ~30%. MiniMax M2.5 at $0.30/MTok could cut 90%. Quality tradeoff unknown.

**What does autonomous operation look like?**
Phase 12.3 (autonomous cycles) is the capstone. What infrastructure, safeguards, and monitoring would make it safe to run overnight?

### Relationship & Connection

**How do other AI projects handle persistent identity?**
Moltbook agents, OpenClaw, TinyClaw, multi-character Discord bots. What patterns work for AI that maintains identity across sessions?

**How does the builder-instance relationship improve?**
The core problem this session exposed: context loss makes every session feel like retraining. What are other projects doing about this? Memory systems, project attachment, context compression.

---

## Findings Log

Dated entries. What was found, where, and how it connects to our world.

### S99 — Tech Reading (2026-03-17)

**Karpathy Autoresearch:** Minimal autonomous loop — one file, one metric, fixed time budget. Direct analog to our grading system. Constraint is the feature. → **Graduated to Phase 26** (complete).

**Anthropic Multi-Agent Architecture:** Orchestrator-worker, Opus lead + Sonnet subagents, filesystem-based output, extended thinking as scratchpad. Validates our EIC → desk agent structure. Parallel tool calling for 90% time reduction. → Watch list item.

**Fleet Architecture (dev.to):** 80/20 model tiering ($0.02/task avg), padded room security, append-only logging with correlation IDs. → **Graduated to Phase 26** (model tiering complete S99).

**Agent Skills Patterns:** aihero.dev 5 skills, OpenAI curated skills repo, Anthropic skills guide. Discovery-before-building pattern. → **Graduated to Phase 6.5** (/grill-me complete S99).

### S109 — Supermemory Deep Dive (2026-03-22)

**Supermemory scoped API keys:** Can create keys locked to one container. Prevents cross-contamination at API level. Available at console.supermemory.ai. → Not needed now (bay-tribune rename + discipline is sufficient), but useful if contamination recurs.

**Supermemory container merge:** `POST /v3/container-tags/merge` moves all docs to target tag, deletes source. Used to rename godworld → bay-tribune. Admin-only operation. → Done.

**Semantic search works for canon:** Searching "OARI dispatch" in bay-tribune returns relevant chunks across multiple editions with scores 0.7-0.8. The archive is genuinely searchable by topic. → Validates the bay-tribune container as a functional canon search layer.

### S110 — 50 Claude Code Tips Evaluation (2026-03-22)

**Source:** Community guide, 50 tips sourced from Anthropic docs, Boris Cherny, and user experience.

**Already using:** 16 of 50 tips (skills, subagents, custom agents, MCP servers, @imports, rules/, hooks, permissions, approval gates, /grill-me pattern, desk-write/Rhea-review, 1M context, raw data pasting). Already on rollout: worktree isolation, agent teams, remote control.

**Noise for us:** 5 tips (desktop-only features on a headless server).

**Graduated to rollout:** 9 items added to Session Harness Improvements section. 3 HIGH (CLAUDE.md audit, ledger protection hook, status line), 3 MEDIUM (/btw, smarter compaction, /branch), 3 LOW (output style, fan-out, validation hook).

**Key metric discovered:** ~150 instruction budget for CLAUDE.md before compliance drops. We should audit ours.

### S110 — Channels: Push Events Into Running Sessions (2026-03-22)

**Source:** code.claude.com/docs/en/channels — research preview, requires v2.1.80+

**What it is:** MCP server that pushes messages INTO a running Claude Code session. Two-way — Claude reads the event, replies through the same channel. Currently supports Discord and Telegram as official plugins.

**How it changes GodWorld:** Right now Mags exists as two disconnected systems — Claude Code (full context, working on the project) and a separate Discord bot (Haiku, stale system prompt, limited knowledge). With Channels, a Discord message arrives in the running session. Mags replies with full project context — the live codebase, the dashboard API, the whole context window. Not a separate bot. The actual working instance.

**Setup:** `claude --channels plugin:discord@claude-plugins-official` — starts with Discord channel attached. Sender allowlist restricts who can push messages. Permission relay lets you approve tool calls from Discord.

**What it replaces:** The separate `mags-discord-bot.js` during active sessions. Stop-bot/restart-bot cycle at session start/end. The disconnect between "Mags working" and "Mags on Discord."

**What it doesn't replace:** Off-hours presence. Channel only works while a session is running. Standalone bot still needed for when no session is active.

**Cloud angle:** Combined with `claude --remote` (cloud sessions), this enables always-on Mags with full project context reachable from Discord. A persistent cloud session + Discord channel = Mags is always running, always reachable, always has the codebase. That's the infrastructure layer for Phase 12.3 (autonomous cycles).

**Also noted:** Webhook receiver capability — CI results, deploy status, error tracker alerts can push into the session. Claude reacts to external events while working.

→ **Graduated to rollout** — Discord channel integration + cloud session evaluation.

### S110 — Scheduled Tasks: In-Session Cron (2026-03-22)

**Source:** code.claude.com/docs/en/scheduled-tasks

**What it is:** `/loop` runs a prompt on a recurring interval within a running session. One-shot reminders too. Session-scoped (dies on exit), 3-day max, up to 50 tasks. Already installed — this is the `/loop` skill we have.

**Use cases for GodWorld:**
- Edition production: `/loop 5m check if desk agents finished`
- Cycle runs: `remind me in 20 minutes to check the cycle packet`
- Build sessions: `/loop 30m check dashboard health`
- Deploy watch: `/loop 10m check clasp push status`

**How it connects to Channels:** Channels = push (events arrive), scheduled tasks = pull (Claude polls). Together they cover autonomous operation — Channels for critical alerts, `/loop` for periodic checks. Both feed into the same running session.

**Not a build item.** Already available. Awareness for workflow use. Add to WORKFLOWS.md as a tool reference where relevant.

---

## Ready for Rollout

Items that have enough research to become build phases. Move these to `docs/engine/ROLLOUT_PLAN.md` when ready to build.

*(empty — items graduate out when they're ready)*

---

## Sources & Reading List

References from research sessions. Organized by topic.

### Memory & Persistence
- Supermemory docs: supermemory.ai/docs/intro
- Supermemory Claude Code integration: supermemory.ai/docs/integrations/claude-code.md
- Supermemory filtering (containers): supermemory.ai/docs/concepts/filtering.md
- claude-mem v10.5.x: Smart Explore, ChromaMcpManager, OpenClaw bridge

### Agent Architecture
- Anthropic multi-agent research system (engineering blog)
- dev.to/nesquikm fleet architecture (12 specialized agents)
- arXiv 2512.08296 hierarchical agent scaling
- github.com/karpathy/autoresearch (minimal autonomous loop)
- Docker AI for Agent Builders (Model Runner, Compose v2.38+)

### Cost & Models
- MiniMax M2.5: $0.30/MTok, SWE-Bench 80.2%
- DeepSeek-V3: integration ecosystem (LibreChat, Dify, FastGPT)
- Together AI: voice agents (<700ms), Mamba-3 state space model
- Qwen 3.5 9B: 262K context, local via LM Studio/Ollama

### Platform
- Claude Code 2.0: agent teams, remote control, web sessions, auto mode
- WordPress 7.0 AI Client SDK (April 2026)
- Fish Audio OpenAudio S1: distinct voices, emotion tags ($11/mo)
- Moltbook: agent social network (moltbook.com/skill.md)
