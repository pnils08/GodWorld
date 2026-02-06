# GodWorld Project Goals

**Last Updated:** 2026-02-07

---

## Core Concept

GodWorld is a **living city simulation** that generates emergent narratives. The system has two main parts:

### 1. Simulation Engine (Working)
- Runs in **Google Apps Script**
- 11-phase engine generates citizens, events, civic votes, relationships
- Outputs to **Google Sheets** (20+ ledgers)
- Runs ~weekly cycles

### 2. Media Room (Working, but manual)
- Claude-powered journalism layer
- Reads simulation output, writes news content (Bay Tribune Pulse, Council Watch, etc.)
- **Current pain point:** No persistent memory. Requires manually moving documents and managing multiple chat sessions per cycle.

---

## The Automation Goal

**Problem:**
Every Media Room session starts fresh. Claude forgets who citizens are, what happened in previous cycles, and the ongoing story arcs. This means:
- Manually exporting/moving documents after each cycle
- Juggling 3+ chat sessions to maintain context
- Re-explaining citizen details every time

**Solution: OpenClaw Integration**

```
BEFORE (Manual):
Simulation → Manual export → Juggle 3 chats → Manually compile Pulse

AFTER (Automated):
Simulation → Auto-sync to persistent memory → Single Media Room with full context → Auto-generate Pulse
```

OpenClaw provides:
1. **Persistent citizen memory** - SQLite database that remembers all citizens, their history, relationships
2. **Automatic sync** - Pulls from Google Sheets after each cycle
3. **Autonomous generation** - Media Room can generate content without manual prompting
4. **Continuity checking** - Validates names, timelines, arc consistency before publishing

---

## What This Is NOT (Yet)

Future concepts (not current priority):
- Chatting directly with citizens as characters
- Interactive Media Room conversations
- Real-time citizen Q&A

These are interesting future directions but **not the core goal**. The core goal is **automating the document flow and giving the Media Room persistent memory**.

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
│                    OPENCLAW (Server)                         │
│                                                              │
│  godworld-sync/ → reads exports, updates SQLite             │
│       ↓                                                      │
│  SQLite database (citizens, cycles, initiatives)            │
│       ↓                                                      │
│  media-generator/ → queries SQLite, calls Claude API        │
│       ↓                                                      │
│  Output: media/cycle-XX/tribune-pulse.md                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Infrastructure

| Component | Purpose | Status |
|-----------|---------|--------|
| DigitalOcean droplet | Headless server — Claude Code, OpenClaw, git repo | Active ($5/mo) |
| Google Cloud Shell | clasp push deployment to Apps Script | Active (free) |
| Google service account | Sheets API read access for OpenClaw | Configured (free) |
| Anthropic API key | LLM for OpenClaw media generation | Key exists, not yet active |

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
| Supermemory browser extension | $9/mo | Wrong product — not useful for development |
| **Total** | **$158/mo** | |

### Recommended Changes

| Action | Savings | Notes |
|--------|---------|-------|
| Cancel Apple subscription, re-subscribe at claude.ai | -$49/mo | Same Max 5x plan, $100/mo direct vs $149 via Apple |
| Cancel Supermemory browser extension | -$9/mo | Not useful for GodWorld dev workflow |
| Add Supermemory Pro (developer tier) | +$19/mo | Persistent memory via MCP for Claude Code + claude.ai |
| **Optional:** Downgrade Claude Max → Pro | -$80/mo | Test after Supermemory proves value |

**Phase 1 target: $124/mo** (Claude Max $100 + Supermemory $19 + DigitalOcean $5)
**Phase 2 target: $44/mo** (Claude Pro $20 + Supermemory $19 + DigitalOcean $5) — only if Supermemory offsets reduced usage limits

### Full Monthly Stack

| Service | Purpose | Cost |
|---------|---------|------|
| Claude (direct at claude.ai) | Claude Code + Media Room + web chat | $100/mo (Max) or $20/mo (Pro) |
| Supermemory Pro | Persistent memory via MCP across all Claude clients | $19/mo |
| DigitalOcean | Headless server — runs Claude Code, OpenClaw, GodWorld repo | $5/mo |
| Anthropic API | LLM calls from OpenClaw media-generator (future) | ~$5-15/mo (usage-based) |
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

## Current Status

- [x] Simulation engine working (v3.1, Cycle 78)
- [x] Export code written (exportCycleArtifacts.js)
- [x] SQLite schema defined
- [x] Media generator code written
- [ ] OpenClaw server setup
- [ ] Google Sheets credentials configured
- [ ] End-to-end test with cycle comparison
- [ ] Supermemory Pro subscription (blocks codebase indexing)
- [ ] Cancel Apple Claude subscription, re-subscribe direct
- [ ] claude.ai MCP connector for Media Room sessions
