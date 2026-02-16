# Bay Tribune Agent Newsroom

**Status:** Implemented (Claude Code agents + skills)
**Architecture:** Claude Code permanent agents (`.claude/agents/`) + orchestration skills (`.claude/skills/`)
**Last Updated:** 2026-02-09

---

## Architecture

The Agent Newsroom runs inside Claude Code using two layers:

1. **Permanent Agents** (`.claude/agents/`) — Desk workers with journalist personalities baked in. Each has its own model, tools, and system prompt. They don't need to be rebuilt each session.

2. **Orchestration Skills** (`.claude/skills/`) — Playbooks that load data, verify state, and delegate to agents. The skill handles logistics; the agent handles writing.

```
/run-cycle (skill)
  Pre-flight checks (30+ sheets) → User triggers engine → Post-cycle review
    ↓
/write-edition (skill)
  Verify desk packets → Launch 6 desk agents in parallel → Compile → Verify → Save
    ↓
Individual desk skills (/civic-desk, /sports-desk, etc.)
  Load desk packet → Delegate to permanent agent → Return articles + engine returns
```

### Pipeline Flow

```
1. ENGINE COMPLETES CYCLE
   ↓
2. /run-cycle — pre-flight checks, trigger engine, post-cycle review
   ↓
3. GENERATE DESK PACKETS
   node scripts/buildDeskPackets.js [cycle]
   Output: output/desk-packets/{desk}_c{XX}.json
   ↓
4. /write-edition — launches all 6 desk agents in parallel
   Each agent receives desk packet + base context
   Each agent writes articles + engine returns
   ↓
5. COMPILE (Mags Corliss role — main session)
   Call front page, order sections, merge returns
   ↓
6. VERIFY (Rhea Morgan agent)
   Cross-check names, votes, records against canon
   Uses ARTICLE_INDEX_BY_POPID.md + CITIZENS_BY_ARTICLE.md + live sheet data
   ↓
7. FIX + FINALIZE
   Apply corrections, save to editions/
   ↓
8. ENGINE INTAKE
   node scripts/editionIntake.js + node scripts/processIntake.js
```

---

## Signal Intelligence Layer

The pipeline includes automated signal intelligence (implemented in `buildDeskPackets.js` and engine phases):

| Feature | What It Does | Where |
|---------|-------------|-------|
| **Anomaly Detection** | Flags events with >2σ variance from 10-cycle baseline | `buildDeskPackets.js` → each event gets `anomalyFlag` |
| **Priority Scoring** | Auto-ranks signals by newsworthiness (severity × citizen count × variance) | `buildDeskPackets.js` → top 3 per desk flagged `priority: true` |
| **Signal Chain Tracking** | Records which engines detected what and why | 4 engine files → `signalChain` on outputs |
| **Pre-Publication Validation** | 4 validators: tone, continuity, distribution, sensitivity | `phase06-analysis/prePublicationValidation.js` (Phase 6.5) |
| **Story Connections (v1.4)** | Cross-references events↔citizens↔bonds↔initiatives↔coverage | `buildDeskPackets.js` → `storyConnections` in each packet |

### Journalism AI Role Mappings

For external communication, engine components map to journalism industry terminology:

| Engine Component | Journalism AI Term |
|-----------------|-------------------|
| `worldEventsEngine_` | City Desk Monitor Agent |
| `updateTransitMetrics_` | Transit Correspondent Agent |
| `faithEventsEngine_` | Faith & Ethics Correspondent Agent |
| `textureTriggerEngine_` | Story Editor (Texture Detection) |
| `storyHookEngine_` | Story Editor (Hook Generation) |
| `godWorldEngine2.js` | Managing Editor Orchestrator |
| Desk agents (Carmen, Maria, etc.) | Beat Reporter Agents |
| Mags compilation | Editor-in-Chief Review |
| Phase 6.5 Validation | Pre-Publication Quality Control |
| Signal chain | Detection Provenance Trail |
| `buildDeskPackets.js` enrichment | Editorial Intelligence Layer |

---

## Permanent Agents (7 total)

### Desk Agents (6)

| Agent | Lead Reporter(s) | Model | Domains | Articles |
|-------|-----------------|-------|---------|----------|
| `civic-desk` | Carmen Delaine | Sonnet | CIVIC, HEALTH, CRIME, TRANSIT, INFRASTRUCTURE | 2-4 |
| `sports-desk` | P Slayer, Anthony, Hal Richmond | Sonnet | SPORTS (Oakland) | 2-5 |
| `culture-desk` | Maria Keen | Sonnet | CULTURE, FAITH, ARTS, FOOD, EDUCATION | 2-4 |
| `business-desk` | Jordan Velez | Sonnet | ECONOMIC, NIGHTLIFE, RETAIL, LABOR | 1-2 |
| `chicago-desk` | Selena Grant, Talia Finch | Sonnet | CHICAGO, SPORTS (Bulls) | 2-3 |
| `letters-desk` | (citizen voices) | Sonnet | ALL | 2-4 |

Each agent has:
- Deep journalist personality profiles from BAY_TRIBUNE_JOURNALIST_PROFILES.pdf
- Voice patterns, signature themes, sample phrases, backstory
- Read-only tools (Read, Glob, Grep) — they write articles, not code
- Canon rules embedded (no invented names, no engine metrics)
- Engine return format (Article Table, Storylines, Citizen Usage, Continuity)

### Verification Agent (1)

| Agent | Role | Model | Runs |
|-------|------|-------|------|
| `rhea-morgan` | Data Analyst / Verification | Sonnet | After compilation, before publication |

Rhea verifies against:
- `docs/media/ARTICLE_INDEX_BY_POPID.md` — 326+ citizens with POP-IDs
- `docs/media/CITIZENS_BY_ARTICLE.md` — reverse article-citizen index
- `schemas/bay_tribune_roster.json` — reporter names and beats
- Desk packet canon sections — council, rosters, cultural entities
- Live sheet data via service account (Civic_Office_Ledger, Initiative_Tracker, Simulation_Ledger, Sports_Feeds)

Rhea's 7-point check: citizen names, vote positions, sports records, engine metric sweep, reporter accuracy, cross-desk duplicates, format compliance.

---

## Orchestration Skills (8 total)

| Skill | Purpose |
|-------|---------|
| `/run-cycle` | Pre-flight sheet checks (30+ sheets), engine trigger, post-cycle review |
| `/write-edition` | Master pipeline — verify packets, launch 6 agents, compile, verify, save |
| `/civic-desk` | Load civic packet → delegate to civic-desk agent |
| `/sports-desk` | Load sports packet → delegate to sports-desk agent |
| `/culture-desk` | Load culture packet → delegate to culture-desk agent |
| `/business-desk` | Load business packet → delegate to business-desk agent |
| `/chicago-desk` | Load Chicago packet → delegate to chicago-desk agent |
| `/letters-desk` | Load letters packet → delegate to letters-desk agent |

---

## Full Reporter Roster (25 Journalists)

### Editorial
| Name | Role | Agent |
|------|------|-------|
| Mags Corliss | Editor-in-Chief | Main session (compilation role) |
| Luis Navarro | Managing Editor / Investigations | civic-desk agent |
| Rhea Morgan | Data Analyst / Copy Chief | rhea-morgan agent |

### Civic/Metro Desk
| Name | Role |
|------|------|
| Carmen Delaine | Civic Ledger (lead) |
| Luis Navarro | Investigations (dual role) |
| Dr. Lila Mezran | Health Desk |
| Trevor Shimizu | Transit & Infrastructure |
| Sgt. Rachel Torres | Public Safety / Crime |

### Sports Desk (Oakland)
| Name | Role |
|------|------|
| Anthony | Lead Beat Reporter |
| P Slayer | Fan Columnist |
| Hal Richmond | Senior Historian |
| Tanya Cruz | Sideline Reporter |
| DJ Hartley | Senior Photographer |
| Simon Leary | Long View Columnist |
| Elliot Marbury | Data Desk |

### Culture Desk
| Name | Role |
|------|------|
| Maria Keen | Cultural Liaison (lead) |
| Elliot Graye | Religious Affairs |
| Kai Marston | Arts & Entertainment |
| Mason Ortega | Food & Hospitality |
| Angela Reyes | Education / Youth |
| Noah Tan | Weather / Environment |
| Sharon Okafor | Lifestyle |

### Business Desk
| Name | Role |
|------|------|
| Jordan Velez | Economics & Labor |

### Chicago Bureau
| Name | Role |
|------|------|
| Selena Grant | Bulls Beat Reporter |
| Talia Finch | Chicago Ground Reporter |

### Wire/Social (not currently agents — available for future expansion)
| Name | Role |
|------|------|
| Reed Thompson | Wire Editor |
| MintConditionOakTown | Speculation / Rumor |
| Celeste Tran | Social / Trends |

### Opinion (covered by existing desk agents)
| Name | Role |
|------|------|
| Farrah Del Rio | Civic & Cultural Opinion (via culture-desk) |
| P Slayer | Sports Opinion (via sports-desk) |

---

## Canon Reference Files

All agents can access these for verification and continuity:

| File | Contents | Used By |
|------|----------|---------|
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | 326+ citizens indexed by POP-ID, all articles they appear in | Rhea (verification), all desks (continuity) |
| `docs/media/CITIZENS_BY_ARTICLE.md` | Reverse index — articles and their citizens | Rhea (cross-reference), Mags (overlap detection) |
| `schemas/bay_tribune_roster.json` | 25 journalist voice profiles, beats, themes | All agents (voice reference) |
| `editions/CYCLE_PULSE_TEMPLATE.md` | Section format, canon rules, return formats | All agents (structure) |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Voice rules, Paulson canon, data treatment | All agents (tone) |
| `docs/media/TIME_CANON_ADDENDUM.md` | Dual-clock system, desk-specific time rules | Sports + Chicago agents |

---

## What Changed (Session 13)

This document previously described a **planned** Agent Newsroom using the Claude Agent SDK with MCP servers and SQLite. That architecture has been **superseded** by the simpler Claude Code agent pipeline:

| Old Plan | Current Implementation |
|----------|----------------------|
| Claude Agent SDK (TypeScript) | Claude Code permanent agents (`.claude/agents/`) |
| MCP server for SQLite queries | Direct file reads + service account for Google Sheets |
| Custom orchestrator.js | `/write-edition` skill |
| Custom prompt-builder.js | Personalities baked directly into agent definitions |
| 25 individual agent processes | 6 desk agents + 1 verification agent (7 total) |
| Planned (not built) | **Working** — ready for Edition 80 |

The Claude Agent SDK plan is preserved below for reference but is no longer the active approach.

---

## Future: Claude Agent SDK (Deferred)

The original Agent SDK plan envisioned 25 individual agents with MCP data access, desk conversations, and automated scheduling. This remains a valid long-term upgrade path if:
- The desk packet pipeline becomes too manual
- Per-agent voice drift becomes a problem at scale
- Real-time data access (MCP → SQLite) is needed during writing
- Automated scheduling (cron-triggered editions) is desired

Key components that would be needed:
- MCP server exposing SQLite data (schema exists at `openclaw-skills/schemas/godworld.sql`)
- Orchestrator that activates desks based on signal types
- Desk runner managing conversation within a desk
- Budget cap and error handling for token costs

See `docs/archive/AUTOGEN_INTEGRATION.md` for the even earlier AutoGen plan (fully superseded).
