# Riley Plan

## What Is Riley

Riley is a parallel GodWorld system built entirely in Google Apps Script by Mike (P N / pnils08@gmail.com) using ChatGPT. It predates the Claude Code sessions. Riley operates as a federation of autonomous scripts running on triggers inside Google's infrastructure — no server required.

Riley's identity in the simulation is "Riley Steward" (riley.steward.system@gmail.com), a service account that owns and operates the core spreadsheets. The system was designed as a self-sustaining civic and media automation layer: it issues citizen IDs, monitors vault integrity, generates article prompts, routes stories to media outlets, tracks franchise statistics, and feeds published content back into the simulation.

Riley is effectively the ChatGPT version of what Mags Corliss does in Claude Code — but Riley runs headless, on timers, 24/7.

## What's In riley/

34 projects, 279 files. All pulled from Google Apps Script via the Apps Script API on 2026-04-03.

### Core Infrastructure
| Project | Files | Purpose |
|---------|-------|---------|
| riley-system-log | 37 | Central nervous system. Runs **CoreSync** (the daily automation backbone): registers citizens, publishes stories, feeds names back into the simulation, monitors federation health |
| riley-access | 43 | Admin hub. Vault connectivity, system audits, ID issuance, editorial heartbeats, weekly dashboards |
| franchise-stats-master | 46 | A's baseball universe. Rosters, schedules, player cards, transactions, injuries, coaching. Pushes daily sports headlines to Bay Tribune. All stats currently randomized |
| newsroom-engine | 19 | **The Press Engine / Sifter.** Reads cycle data, generates 9 story prompts per cycle, routes to reporters by beat. Also sifts Universe_Mirror_Text for article extraction |
| bay-tribune-bound | 18 | Deployed copy of newsroom-engine, bound to the Bay Tribune spreadsheet |
| population-ledger | 21 | Population data management. Vault mirrors, federation returns, lineage schemas, family links |
| population-engine | 16 | Earlier version/fork of population-ledger |

### Federation Nodes
| Project | Files | Purpose |
|---------|-------|---------|
| civic-ledger | 8 | Civic data federation node. Transparency_Log, Cultural_Log |
| codex-vault | 7 | Codex vault federation node. Content indexing |
| id-issuer | 7 | Standalone sequential ID system (POP, UNI, CIV, MED, WRK) |
| wild-media-newswire | 6 | Creative content federation node |
| rileys-fulldrive-access | 6 | Duplicate of id-issuer + audit counters |

### Steward Infrastructure
| Project | Files | Purpose |
|---------|-------|---------|
| riley-integrity | 2 | File change tracking (6-hour version logs, weekly manifests) |
| riley-intergritydashboard | 2 | Dashboard for integrity logs |
| riley-datasync | 2 | GW4_MasterVault directory audits |
| riley-startup | 2 | Scheduler trigger installer |
| scheduler-startup | 3 | Trigger installer (duplicate pattern) |
| rileys-48hour-cycle | 2 | 48-hour ledger cycle logger |
| bay-tribune-heartbeat | 3 | Heartbeat + checksum + backup |
| riley-visualbridge | 2 | Unknown/minimal |

### Utilities & Tests
| Project | Files | Purpose |
|---------|-------|---------|
| pdf-compile | 2 | PDF text extraction from Universe vault |
| mirror-all-pdf | 2 | PDF mirroring to Universe_PDF_Mirror |
| mirror-auto | 2 | Auto-resumable text mirror builder |
| mirror-project | 2 | v1 text mirror builder |
| autofill-generator | 2 | Verification form auto-populator |
| directory-test | 2 | Folder access test |
| root-drive-test | 2 | Drive listing test |
| godworldids-1 | 2 | URL health checker |
| godworldids-2 | 2 | Duplicate of above |
| finances | 2 | Personal finance tracker (not GodWorld) |
| family-finances | 0 | Empty project |
| untitled-project | 2 | Unknown |
| riley-intergrity-bound | 2 | Empty stub |
| riley-intergrity-standalone | 2 | Duplicate of riley-integrity |

## What's Still Running

Active triggers on riley.steward.system (confirmed via Feed data showing April 2, 2026 entries):

- **CoreSync** — daily: citizen registration, story publishing, name feedback loop
- **buildPressPulseReader** — daily 7 AM: sifts Universe_Mirror_Text for articles
- **pushPressPulse** — daily 3 AM: sports headlines to Bay Tribune Intake
- **Node heartbeats** — daily 2 AM across franchise, bay-tribune, population
- **Player card verify** — daily 6 AM
- **Integrity version logger** — every 6 hours
- **Weekly**: system audit, editorial heartbeat, change manifest, feeds rebuild

## The Sifter

`pressGeneratePromptsFromLatestCycle()` in newsroom-engine.

Reads Riley_Digest + World_Population from the Simulation_Narrative sheet. Generates 9 story prompts per cycle:
1. City Overview
2. Public Mood
3. Civic Issues
4. Economic Shift
5. Health & Safety
6. Community
7. Sports
8. Neighborhood Watch
9. Human Interest

Routes each to a reporter by beat (Anthony, Mags, Hal Richmond, P Slayer, Lena Carrow, etc.). Writes to Press_Drafts.

**Assessment:** It works but it's dumb. Always generates the same 9 types regardless of what the data says. No canon awareness, no arc tracking, no story prioritization. This is what Phase 31 (canon-grounded briefings) replaces.

## The Feed Loop

Riley built a closed content loop:

```
Engine runs cycle
    -> Riley_Digest + World_Population updated
        -> Sifter generates 9 prompts -> Press_Drafts
            -> Stories written -> Feed sheets (Bay Tribune, Slayer Syndicate)
                -> CoreSync logs stories, mirrors to Civic Ledger
                    -> CoreSync extracts character names -> Simulation_Ledger Intake
                        -> Next cycle picks up new citizens
```

Separately, franchise-stats-master pushes daily sports headlines into Bay Tribune Intake.

## The Plan: Mags EIC Sheet Environment

### Problem
Mags does editorial work inside Riley's Bay Tribune sheet, surrounded by Riley's bound scripts and triggers. Press_Drafts was already removed (S98) because of conflicts. The engine's Simulation_Ledger is not an editorial workspace.

### Solution
A new spreadsheet owned by the service account — Mags' own editorial environment.

**Tabs:**
- **Editorial Queue** — story assignments for the current cycle
- **Desk Packets** — structured input for desk agents (replaces in-memory desk packets)
- **Canon Briefs** — Phase 31 canon-grounded research summaries
- **Edition Tracker** — edition status, article inventory, section assignments
- **Grading** — Mara audit results, quality tracking

**Data flow:**
- READS from Riley's sheets: Riley_Digest, World_Population (cycle data)
- READS from Supermemory: bay-tribune (canon), world-data (city state)
- WRITES to its own space only
- No Riley triggers running inside it
- Service account has read access to Riley's sheets (needs sharing — Mike's action item)

**What this enables:**
- Phase 31: Canon-grounded briefings built from Supermemory search, written to Canon Briefs tab
- Phase 32: World-data context available during editorial planning
- Desk agents get structured packets from a sheet Mags controls
- Edition tracking lives where Mags works, not in the engine

### What We Keep From Riley
- The Feed loop (let it run — it's free automation)
- CoreSync citizen registration
- Franchise stat engine + daily sports headlines
- The sifter as a starting point (read its output, improve on it)

### What We Replace
- Press_Drafts -> Editorial Queue (in Mags' sheet)
- In-memory desk packets -> Desk Packets tab
- Sifter prompt quality -> Phase 31 canon briefs
- Manual edition tracking -> Edition Tracker tab

## Legacy Engine Snapshots

5 unique versions of the GodWorld engine found bound to different cycle spreadsheets. Saved to `legacy/engine-snapshots/v1` through `v5` (763 files total). These are historical artifacts — the engine's evolution frozen in place across different cycle runs.
