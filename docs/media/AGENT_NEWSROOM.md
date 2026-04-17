# Bay Tribune Agent Newsroom

**Status:** Implemented (Claude Code agents + skills)
**Architecture:** Claude Code permanent agents (`.claude/agents/`) + orchestration skills (`.claude/skills/`)
**Last Updated:** 2026-04-17 (S156)

---

## Architecture

The Agent Newsroom runs inside Claude Code using two layers:

1. **Permanent Agents** (`.claude/agents/`) — 27 agents across: desk (7 — business, chicago, civic, culture, letters, podcast, sports), civic office (7 — mayor, opp-faction, crc-faction, ind-swing, police-chief, baylight-authority, district-attorney), civic project (4 — stabilization-fund, oari, health-center, transit-hub), review lanes (rhea-morgan, final-arbiter, freelance-firebrand), audit (city-clerk, engine-validator), media support (dj-hartley), core (mags-corliss). Each has IDENTITY.md (persona), RULES.md (constraints), and a lean SKILL.md (boot sequence). **Pipeline v2 (S134):** edition production launches 9 individual reporter personas mapped across the 7 desk folders via `/write-edition`.

2. **Workspace Builders** (`scripts/`) — Zero-LLM scripts that populate per-agent workspace folders before launch: `buildDeskFolders.js` (7 desks), `buildVoiceWorkspaces.js` (7 civic offices), `buildInitiativeWorkspaces.js` (4 civic projects).

3. **Orchestration Skills** (`.claude/skills/`) — Playbooks that verify state and delegate to agents. The skill handles logistics; the agent handles writing.

```
/run-cycle (orchestrator)
  /pre-flight → /pre-mortem → engine run → /engine-review → /build-world-summary
    ↓
/city-hall (separate terminal)
  Read tracker → voices govern → tracker updates → production log
    ↓
/sift (planned)
  World summary + engine review + city-hall log → story picks + angle briefs
    ↓
/write-edition
  Read sift output → launch 9 reporters → compile → verify → publish
```

### Pipeline Flow (S134+, updated S144)

```
1. /run-cycle ORCHESTRATOR
   ├── /pre-flight — verify manual inputs (sports feed, tracker, ratings)
   ├── /pre-mortem — engine code health scan
   ├── Mike runs engine in GAS
   ├── /engine-review — world state diagnostic (Phase 38)
   └── /build-world-summary — factual cycle document
   ↓
2. /city-hall (separate terminal)
   Initiative agents → voice agents (Mayor first) → tracker updates
   Output: production_log_city_hall_c{XX}.md
   ↓
3. /sift (planned — currently part of /write-edition Steps 2-3)
   Read world summary + engine review + city-hall log
   Pick stories with Mike, assign reporters, verify citizens, write angle briefs
   ↓
4. /write-edition — 9 individual reporters
   Each gets angle brief → writes articles → Mags reviews
   ↓
5. COMPILE (Mags)
   Story-driven layout, no fixed sections
   ↓
6. VALIDATE + RHEA
   validateEdition.js (11 checks) → Rhea Morgan (scoped Bash)
   ↓
7. MARA CANON AUDIT (external — claude.ai)
   ↓
8. PUBLISH
   Drive upload + bay-tribune ingest + wiki ingest
   ↓
9. POST-PUBLISH
   Coverage ratings → engine reads next cycle (loop closes)
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

## Permanent Agents (25+)

### Individual Reporters (9 core) — Write journalism (S134+)

S134 replaced 6 desk agents with 9 individual reporters. Each reporter is one agent, one voice, one identity. Launched directly by `/write-edition` with a targeted angle brief.

| Reporter | Role | Model | Runs when |
|----------|------|-------|-----------|
| Carmen Delaine | Civic lead | Sonnet | Civic story assigned |
| P Slayer | Sports opinion/fan | Sonnet | Sports story assigned |
| Anthony | Sports beat/stats | Sonnet | Sports story assigned |
| Hal Richmond | Sports legacy | Sonnet | Dynasty/farewell content |
| Jordan Velez | Business/economics | Haiku | Business story assigned |
| Maria Keen | Culture/neighborhoods | Haiku | Culture story assigned |
| Jax Caldera | Freelance accountability | Sonnet | Something smells wrong (conditional) |
| Dr. Lila Mezran | Health/human cost | Haiku | Health event in engine data (conditional) |
| Letters | Citizen voices | Haiku | Always — runs last, reacts to edition |

**Model tiering (S99):** Complex reporters (civic, sports, accountability) run Sonnet. Routine reporters (business, culture, health, letters) run Haiku.

Secondary reporters (Navarro, Shimizu, Torres, Graye, Marston, Ortega, Reyes, Tan, Cruz) launch ONLY when assigned. Chicago bureau (Grant, Finch) is supplemental-only.

### Legacy Desk Agents (6) — Infrastructure preserved

| Agent | Model | Status |
|-------|-------|--------|
| `civic-desk` | Sonnet | Infrastructure exists. Not used in pipeline v2. |
| `sports-desk` | Sonnet | Infrastructure exists. Not used in pipeline v2. |
| `culture-desk` | Haiku | Infrastructure exists. Not used in pipeline v2. |
| `business-desk` | Haiku | Infrastructure exists. Not used in pipeline v2. |
| `chicago-desk` | Sonnet | Infrastructure exists. Not used in pipeline v2. |
| `letters-desk` | Haiku | Infrastructure exists. Not used in pipeline v2. |

Each desk agent has: IDENTITY.md (persona), RULES.md (output format + hard rules), lean SKILL.md (boot sequence). Persistent memory at `.claude/agent-memory/{desk}/MEMORY.md`.

### Civic Voice Agents (7) — Generate source material

| Agent | Speaker(s) | Model | Output |
|-------|-----------|-------|--------|
| `civic-office-mayor` | Mayor Avery Santana | Haiku | `output/civic-voice/mayor_c{XX}.json` |
| `civic-office-opp-faction` | Janae Rivers (OPP) | Haiku | `output/civic-voice/opp_faction_c{XX}.json` |
| `civic-office-crc-faction` | Warren Ashford (CRC) | Haiku | `output/civic-voice/crc_faction_c{XX}.json` |
| `civic-office-ind-swing` | Ramon Vega, Leonard Tran | Haiku | `output/civic-voice/ind_swing_c{XX}.json` |
| `civic-office-police-chief` | Chief Rafael Montez | Haiku | `output/civic-voice/police_chief_c{XX}.json` |
| `civic-office-baylight-authority` | Director Keisha Ramos | Haiku | `output/civic-voice/baylight_authority_c{XX}.json` |
| `civic-office-district-attorney` | DA Clarissa Dane | Haiku | `output/civic-voice/district_attorney_c{XX}.json` |

Each voice agent reads workspace at `output/civic-voice-workspace/{office}/current/`. Workspace includes `domain_briefing.md` (v2.0) — v3.9 engine data routed by role (crime→chief, displacement→OPP, fiscal→CRC, all→independents). Produces JSON statements that desk agents quote. Not journalists — source material.

### Initiative Agents (5) — Advance civic projects

| Agent | Director | Model | Output |
|-------|---------|-------|--------|
| `civic-project-stabilization-fund` | Marcus Webb | Haiku | `output/city-civic-database/initiatives/stabilization-fund/` |
| `civic-project-oari` | Dr. Vanessa Tran-Munoz | Haiku | `output/city-civic-database/initiatives/oari/` |
| `civic-project-health-center` | Bobby Chen-Ramirez | Haiku | `output/city-civic-database/initiatives/health-center/` |
| `civic-project-transit-hub` | Elena Soria Dominguez | Haiku | `output/city-civic-database/initiatives/transit-hub/` |
| `civic-office-baylight-authority` | Keisha Ramos (dual role) | Haiku | `output/city-civic-database/initiatives/baylight/` |

Each initiative agent reads workspace at `output/initiative-workspace/{init}/current/`. Produces civic documents and decisions JSON.

### Editorial/Utility Agents (5)

| Agent | Role | Model |
|-------|------|-------|
| `rhea-morgan` | Verification — scoped Bash, dashboard API, Supermemory | Sonnet |
| `freelance-firebrand` | Jax Caldera — accountability columnist | Sonnet |
| `city-clerk` | Document hygiene enforcement | Haiku |
| `dj-hartley` | Senior Photographer / art direction | Haiku |
| `engine-validator` | Engine output validation | Haiku |

Rhea verifies against:
- `docs/media/ARTICLE_INDEX_BY_POPID.md` — 326+ citizens with POP-IDs
- `docs/media/CITIZENS_BY_ARTICLE.md` — reverse article-citizen index
- `schemas/bay_tribune_roster.json` — reporter names and beats
- Desk packet canon sections — council, rosters, cultural entities
- Live sheet data via service account (Civic_Office_Ledger, Initiative_Tracker, Simulation_Ledger, Sports_Feeds)

Rhea's 7-point check: citizen names, vote positions, sports records, engine metric sweep, reporter accuracy, cross-desk duplicates, format compliance.

---

## Orchestration Skills

| Skill | Purpose |
|-------|---------|
| `/run-cycle` | Orchestrator — calls pre-flight → pre-mortem → engine run → engine-review → build-world-summary |
| `/pre-flight` | Verify manual inputs (sports feed, intakes, tracker, ratings) |
| `/pre-mortem` | Engine code health scan (determinism, deps, headers) |
| `/engine-review` | Post-cycle world state diagnostic (Phase 38) |
| `/build-world-summary` | Mechanical data assembly → world summary document |
| `/city-hall` | Civic voices govern — separate terminal |
| `/write-edition` | Launch 9 reporters from sift output, compile, verify, publish |
| `/write-supplemental` | Supplemental edition pipeline |
| `/podcast` | Podcast production (3 show formats) |
| `/edition-print` | Photos, PDF, Drive upload |

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

## Local Drive Archive (Searchable Institutional Memory)

All agents have Grep/Read access to **`output/drive-files/`** — a local mirror of the entire Google Drive archive (614 files, 6.9 MB). This is every article ever written, every player data card, every edition ever published.

### Archive Contents

| Archive | Files | Content |
|---------|-------|---------|
| Tribune Media Archive | 101 | 20 journalist desks — Carmen, Maria, Hal, Anthony, P Slayer, Luis, etc. |
| Sports Desk Archive | 155 | Features, analytics, interviews, origin series, dugout scenes |
| Publications Archive | 67 | Cycle Pulse editions 1-81, supplementals, Paulson pressers, Mara directives |
| As Universe Database | 100 | TrueSource player cards (30+ MLB, 14 prospects, 13 former), rosters, transactions |
| Bulls Universe Database | 9 | Chicago player profiles (3), contracts, financials |
| Stats CSV | 4 | Batting stats, master stats (2039-2040 seasons as searchable CSV) |

### Per-Desk Search Pools

| Desk | Primary Search Targets | What to Search For |
|------|----------------------|-------------------|
| **Sports** | `_Sports Desk Archive/`, `_As Universe Database/`, `_As_Universe_Stats_CSV/` | Player histories, past features by Hal/Anthony/P Slayer, batting stats, roster data, TrueSource cards |
| **Civic** | `_Tribune Media Archive/Carmen_Delaine/`, `_Tribune Media Archive/Luis_Navarro/` | Past civic coverage, initiative history, infrastructure reporting, investigation precedents |
| **Culture** | `_Tribune Media Archive/Maria_Keen/`, `_Tribune Media Archive/Kai_Marston/`, `_Tribune Media Archive/Mason_Ortega/` | Past cultural coverage, neighborhood features, faith reporting, food coverage |
| **Business** | `_Tribune Media Archive/Jordan_Velez/` | Past business tickers, economic analysis, labor reporting |
| **Chicago** | `_Bulls Universe Database/`, `_Publications Archive/Chicago_Supplementals/` | Bulls player cards, Chicago satellite editions, Selena/Talia past coverage |
| **Letters** | All archives | Citizen mentions anywhere, past letters for voice continuity |
| **Rhea (Verification)** | `_As Universe Database/`, `_Bulls Universe Database/`, `_Publications Archive/` | Player data cards for stat verification, edition history for continuity checks |

### How Agents Use the Archive

1. **During briefing compilation (Step 1.5):** Mags Greps the archive for citizens, storylines, and reporters relevant to this cycle. Key findings go into desk briefing memos.
2. **During writing (Step 3):** Agents can Grep their search pool for voice reference, historical context, or continuity checks.
3. **During verification (Step 4):** Rhea can cross-reference player stats against TrueSource data cards and CSV stat files.

### Manifest & Index

- **Full manifest:** `output/drive-manifest.json` (JSON, all 432 files with IDs and paths)
- **Human-readable index:** `docs/media/DRIVE_MANIFEST.md`
- **Local file index:** `output/drive-files/_INDEX.md`
- **Rebuild command:** `node scripts/buildCombinedManifest.js` (re-crawls all 5 Drive roots)
- **Re-download:** `node scripts/downloadDriveArchive.js` (downloads all text files from manifest)

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
