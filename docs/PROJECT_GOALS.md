# GodWorld Project Goals

**Last Updated:** 2026-02-09

---

## Core Concept

GodWorld is a **living city simulation** that generates emergent narratives. The system has two main parts:

### 1. Simulation Engine (Working)
- Runs in **Google Apps Script**
- 11-phase engine generates citizens, events, civic votes, relationships
- Outputs to **Google Sheets** (20+ ledgers)
- Runs ~weekly cycles

### 2. Media Room (Working — parallel-agent production validated)
- Claude-powered journalism layer
- Reads simulation output, writes news content (Bay Tribune Pulse, Council Watch, etc.)
- **Handoff Guide:** `docs/MEDIA_ROOM_HANDOFF.md` — structured workflow reducing 402KB raw exports to ~15KB compiled handoff (96% reduction)
- **Edition 78 produced by Claude Code** using 5 parallel desk agents (Civic, Sports, Chicago, Faith/Culture, Letters) — 6 articles + 3 letters in ~70 seconds wall time. See `editions/cycle_pulse_edition_78.txt`
- **Production workflow validated:** compileHandoff → parallel desk agents → editorial compilation → canon correction → engine returns
- **Remaining pain point:** No persistent memory. Handoff is documented but still manual. Returns need to be fed back to engine.

---

## The Automation Goal

**Problem:**
Every Media Room session starts fresh. Claude forgets who citizens are, what happened in previous cycles, and the ongoing story arcs. This means:
- Manually exporting/moving documents after each cycle
- Juggling 3+ chat sessions to maintain context
- Re-explaining citizen details every time

**Solution: MCP-Based Stack (replaces OpenClaw plan)**

```
BEFORE (Manual):
Simulation → Manual export → Juggle 3 chats → Manually compile Pulse

AFTER (Automated):
Simulation → cron sync to SQLite → Supermemory shares context across clients
         → Agent Newsroom generates media → claude.ai MCP queries data directly
```

The automation stack is built from focused tools instead of a monolithic framework:

| Need | Tool | Status |
|------|------|--------|
| Persistent session memory | **Supermemory MCP** — shared across Claude Code, claude.ai, Desktop | Plugin installed, needs Pro sub |
| Citizen data access | **claude.ai MCP connector** — query SQLite or Sheets directly | Not started |
| Media generation | **Claude Code parallel agents** — 5 desk agents write simultaneously | **Validated** (Edition 78) |
| Media generation (alt) | **Agent Newsroom (Claude Agent SDK)** — 25 journalist agents | Planned (docs/AGENT_NEWSROOM.md) |
| Auto-sync from Sheets | **cron + scripts/sync.js** — on DigitalOcean | Scripts exist, cron not configured |
| Continuity checking | **Agent Newsroom** — Rhea Morgan (continuity agent) runs every cycle | Planned |

> **Note:** The original OpenClaw integration plan is preserved in `docs/OPENCLAW_INTEGRATION.md` if needed down the line. OpenClaw was planned before MCP connectors, Supermemory, and the Agent SDK existed. The individual capabilities it provided are now covered by simpler, focused tools.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE APPS SCRIPT                        │
│                                                              │
│  godWorldEngine2.js (11 phases)                             │
│       ↓                                                      │
│  Google Sheets (20+ ledgers)                                │
│       ↓                                                      │
│  exportCycleArtifacts_() → exports/cycle-XX-context.json   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               DIGITALOCEAN DROPLET ($5/mo)                   │
│                                                              │
│  Claude Code ← Supermemory MCP (persistent dev memory)      │
│       ↓                                                      │
│  cron + sync.js → reads exports, updates SQLite             │
│       ↓                                                      │
│  SQLite database (citizens, cycles, initiatives, arcs)      │
│       ↓                                                      │
│  Agent Newsroom (Claude Agent SDK) → media generation       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CLAUDE.AI (Media Room)                      │
│                                                              │
│  MCP connector → queries SQLite / Supermemory               │
│       ↓                                                      │
│  Journalists write with full context + persistent memory    │
│       ↓                                                      │
│  Output: Bay Tribune Pulse, Council Watch, etc.             │
└─────────────────────────────────────────────────────────────┘
```

---

## What This Is NOT (Yet)

Future concepts (not current priority):
- Chatting directly with citizens as characters
- Interactive Media Room conversations
- Real-time citizen Q&A

These are interesting future directions but **not the core goal**. The core goal is **automating the document flow and giving the Media Room persistent memory**.

---

## Infrastructure

| Component | Purpose | Status |
|-----------|---------|--------|
| DigitalOcean droplet | Headless server — Claude Code, git repo, SQLite, future Agent Newsroom | Active ($5/mo) |
| Google Cloud Shell | clasp push deployment to Apps Script | Active (free) |
| Google service account | Sheets API read access for sync scripts | Configured (free) |
| Anthropic API key | LLM calls for Agent Newsroom (future) | Key exists, not yet active |

---

## Success Criteria

1. After simulation cycle completes, no manual document moving required
2. Media Room remembers all citizens and history without re-explanation
3. Tribune Pulse generates automatically with comparable quality to manual 3-chat method
4. Continuity score >= 0.9 (no hallucinated names, consistent timelines)

---

## Subscription & Tooling Optimization

**Goal:** Maximize development efficiency while reducing monthly costs.

### Current Subscriptions (as of 2026-02-07)

| Subscription | Cost | Notes |
|-------------|------|-------|
| Claude Max 5x (Apple) | $149/mo | Overpaying — Apple App Store 30% markup |
| ~~Supermemory browser extension~~ | ~~$9/mo~~ | Canceled 2026-02-07 — wrong product |
| **Total** | **$149/mo** | |

### Recommended Changes

| Action | Savings | Notes |
|--------|---------|-------|
| Cancel Apple subscription, re-subscribe at claude.ai | -$49/mo | Same Max 5x plan, $100/mo direct vs $149 via Apple |
| Add Supermemory Pro (developer tier) | +$19/mo | Persistent memory via MCP for Claude Code + claude.ai |
| **Optional:** Downgrade Claude Max → Pro | -$80/mo | Test after Supermemory proves value |

**Phase 1 target: $124/mo** (Claude Max $100 + Supermemory $19 + DigitalOcean $5)
**Phase 2 target: $44/mo** (Claude Pro $20 + Supermemory $19 + DigitalOcean $5) — only if Supermemory offsets reduced usage limits

### Full Monthly Stack

| Service | Purpose | Cost |
|---------|---------|------|
| Claude (direct at claude.ai) | Claude Code + Media Room + web chat | $100/mo (Max) or $20/mo (Pro) |
| Supermemory Pro | Persistent memory via MCP across all Claude clients | $19/mo |
| DigitalOcean | Headless server — Claude Code, git repo, SQLite, Agent Newsroom | $5/mo |
| Anthropic API | LLM calls from Agent Newsroom (future) | ~$5-15/mo (usage-based) |
| **Total (Phase 1)** | | **~$129-139/mo** |
| **Total (Phase 2)** | | **~$49-59/mo** |

### Supermemory Integration

**Product:** [supermemory.ai](https://supermemory.ai) — persistent memory layer via MCP (Model Context Protocol)

**What it does:**
- Saves project knowledge (architecture, decisions, bugs, patterns) across sessions
- Auto-captures tool usage (edits, commands, file creation) during Claude Code sessions
- Injects relevant memories at session start — no more "read SESSION_CONTEXT.md"
- Shared memory across ALL Claude clients (Code, Desktop, Web, Mobile)

**Why it matters for GodWorld:**
- 100+ script project with deep cascade dependencies
- Sessions regularly run to context compaction (lost knowledge)
- Two separate Claude workflows (Code for engine dev, Web for Media Room) that currently share no context
- Hard-won lessons ("clasp push doesn't auto-delete files", "A:Z only covers 26 columns") get lost between sessions

**MCP connectivity:**

| Client | MCP Support | Use Case |
|--------|------------|----------|
| Claude Code | Plugin (installed) | Engine development, debugging |
| claude.ai (web) | Custom connectors (Pro+ plans) | Media Room journalism sessions |
| Claude Desktop | Native MCP | Local development alternative |

All three clients can connect to the same Supermemory MCP server, sharing a unified memory pool tagged by project (`godworld` repo tag) and user (`pnils08` personal tag).

**Setup status:**

| Step | Status |
|------|--------|
| Supermemory account created | Done |
| API key generated | Done (in ~/.bashrc as SUPERMEMORY_CC_API_KEY) |
| Claude Code plugin installed | Done (claude-supermemory) |
| Project config (.claude/.supermemory-claude/config.json) | Done (repoContainerTag: godworld) |
| Codebase indexed | Blocked — requires Pro plan ($19/mo) |
| claude.ai MCP connector | Not started — configure after Pro subscription |
| Cancel Apple Claude subscription | Canceled — expires 2/16 |
| Re-subscribe direct at claude.ai | Pending — after 2/16 expiry |
| Cancel browser extension | Done (2026-02-07) |

**Plugin commands (once Pro is active):**
- `/claude-supermemory:index` — Index codebase into memory
- `/claude-supermemory:super-save` — Save important knowledge manually
- `/claude-supermemory:super-search` — Search past session knowledge
- `/claude-supermemory:project-config` — Configure project settings

### Supermemory vs SESSION_CONTEXT.md

| | SESSION_CONTEXT.md | Supermemory |
|--|-------------------|-------------|
| Cost | Free | $19/mo |
| Setup | Manual "read this file" each session | Automatic context injection |
| Coverage | Only what's manually documented | Auto-captures tool usage + manual saves |
| Cross-client | Claude Code only | Code + Web + Desktop |
| Media Room access | No | Yes (via MCP connector) |
| Maintenance | Must update manually each session | Self-learning |

**Recommendation:** Keep SESSION_CONTEXT.md as backup/fallback even with Supermemory active. It's free and serves as a human-readable project onboarding doc.

---

## OpenClaw — Deferred

The original automation plan was built around OpenClaw as a monolithic middleware framework. With the arrival of MCP connectors, Supermemory, and the Claude Agent SDK, OpenClaw's individual capabilities are now covered by simpler, focused tools (see "The Automation Goal" above).

**Full OpenClaw plan preserved in:** `docs/OPENCLAW_INTEGRATION.md`

Existing OpenClaw code that remains useful without the framework:
- `openclaw-skills/schemas/godworld.sql` — SQLite schema (used by sync scripts)
- `openclaw-skills/godworld-sync/index.js` — sync logic (adaptable to standalone cron)
- `openclaw-skills/media-generator/index.js` — routing logic (reference for Agent Newsroom)
- `scripts/sync.js`, `scripts/init-db.js` — standalone Node.js tools

---

## Current Status

- [x] Simulation engine working (v3.1, Cycle 78)
- [x] Export code written (exportCycleArtifacts.js)
- [x] SQLite schema defined (openclaw-skills/schemas/godworld.sql)
- [x] Sync scripts written (scripts/sync.js, godworld-sync/index.js)
- [x] Media generator reference code (openclaw-skills/media-generator/index.js)
- [x] Agent Newsroom architecture planned (docs/AGENT_NEWSROOM.md)
- [x] Media Room Handoff Guide (docs/MEDIA_ROOM_HANDOFF.md — 96% data reduction)
- [x] Cycle 78 compiled handoff demonstrated (15KB vs 402KB raw)
- [x] **Edition 78 written by parallel agents** — 5 desks, 6 articles + 3 letters, 14 citizens quoted, 4 new canon figures
- [x] **Parallel-agent workflow validated** — production model for future editions confirmed
- [x] Supermemory plugin installed + configured for Claude Code
- [ ] Feed Edition 78 returns back to engine (Article Table, Storylines, Usage Log, Continuity Notes)
- [ ] Supermemory Pro subscription (blocks codebase indexing)
- [ ] Cancel Apple Claude subscription, re-subscribe direct (expires 2/16)
- [ ] claude.ai MCP connector for Media Room sessions
- [ ] Cron job for auto-sync (scripts/sync.js on DigitalOcean)
- [ ] Agent Newsroom implementation (Claude Agent SDK)
- [ ] Build compileHandoff() script in Google Apps Script
- [ ] End-to-end test with cycle comparison
