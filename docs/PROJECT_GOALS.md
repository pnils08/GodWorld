# GodWorld Project Goals

**Last Updated:** 2026-02-04

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
- Reads simulation output, writes news content (Tribune Pulse, Echo Op-Ed, etc.)
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

## Setup Requirements

| Component | Purpose | Cost |
|-----------|---------|------|
| Cloud server | Runs OpenClaw 24/7 | ~$5/mo |
| Google service account | Read access to Sheets | Free |
| Anthropic API key | LLM for media generation | ~$5-15/mo |

**Total: ~$10-20/month** to automate the manual workflow.

---

## Success Criteria

1. After simulation cycle completes, no manual document moving required
2. Media Room remembers all citizens and history without re-explanation
3. Tribune Pulse generates automatically with comparable quality to manual 3-chat method
4. Continuity score >= 0.9 (no hallucinated names, consistent timelines)

---

## Current Status

- [x] Simulation engine working (v3.1, Cycle 78)
- [x] Export code written (exportCycleArtifacts.js)
- [x] SQLite schema defined
- [x] Media generator code written
- [ ] OpenClaw server setup
- [ ] Google Sheets credentials configured
- [ ] End-to-end test with cycle comparison
