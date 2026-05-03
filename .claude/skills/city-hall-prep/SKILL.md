---
name: city-hall-prep
description: Prepare all inputs for city-hall voice agents. Reads tracker, approvals, world summary, engine review, coverage ratings, previous log, canon, Mara directive. Writes pending decisions per voice.
version: "1.1"
updated: 2026-05-03
tags: [civic, active]
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /city-hall-prep — Civic Government Preparation

## Purpose

Assemble everything the voice agents need before city-hall runs. Each voice represents a neighborhood or city function and looks at different data. This skill gathers it all, routes the right data to the right voice, then Mags writes targeted pending decisions.

When this is done right, `/city-hall` runs clean — voices wake, decide, done.

## Inputs

### From disk (produced by earlier skills)

1. **World summary** — `output/world_summary_c{XX}.md` (from `/build-world-summary`)
2. **Engine review** — `output/engine_review_c{XX}.md` (from `/engine-review`) — ailments that need civic response, stuck initiatives, recurring crises
3. **Previous city-hall log** — `output/production_log_city_hall_c{XX-1}.md` — what was promised last cycle, what cascaded
4. **Previous voice outputs** — `output/civic-voice/{office}_c{XX-1}.json` — exact quotes, positions, tracker updates from last cycle per voice. Continuity source.
5. **Mara directive** — `output/mara-directives/mara_directive_c{XX}.txt` (if exists) — Mara's editorial pressure for this cycle

### From sheets (via service account)

6. **Initiative_Tracker** — ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle, AffectedNeighborhoods, PolicyDomain, Budget
7. **Civic_Office_Ledger** — all seats, approval ratings, district, faction
8. **Edition_Coverage_Ratings** — did the Tribune cover civic topics positively or negatively last cycle? Voices should know if the city noticed.

### From MCP + Supermemory

9. **GodWorld MCP** — `get_council_member(district)` per voice for live approval + faction data. `lookup_initiative(name)` per active initiative. `get_neighborhood(name)` for affected neighborhoods.
10. **Bay-tribune canon** — `search_canon(initiative_name)` per active initiative. What has the Tribune published about each initiative? What was promised in coverage? What did citizens say? Grounds decisions in published history.

## Voice Data Routing

Each voice looks at different data. Route the right inputs to the right pending decision.

**Agent topology (G-10, S192 — 11 actual agents, NOT 17).** Only Mayor / Chief / DA have individual agents. The 9 council members are grouped into 3 faction-bloc agents (`opp-faction`, `crc-faction`, `ind-swing`). One pending_decisions.md per agent — bloc agents speak for all members in their bloc within one file. The 5 project agents (Baylight / OARI / Stab Fund / Health Center / Transit Hub) are individual.

| Agent (write pending_decisions to) | Speaks for | District/Scope | Data They Need |
|-------------------------------------|-----------|----------------|----------------|
| `civic-office-mayor` | Mayor Santana | Citywide | All initiatives, all approval ratings, engine review ailments, Mara directive, coverage feedback across all domains |
| `civic-office-police-chief` | Chief Montez | Public Safety | Crime metrics, OARI data, safety-related engine ailments, safety coverage ratings |
| `civic-office-district-attorney` | DA Dane | Legal framework | Only runs when legal dimension exists this cycle |
| `civic-office-opp-faction` | Rivers (D5) + Delgado (D3) + Carter (D1) + Chen (D8) + Mobley (D9) | OPP bloc — 5 council members | Per-member district data: D5 East Oakland (OARI + displacement), D3 Fruitvale (Transit Hub + OARI), D1 Jack London/W Oakland (Baylight + Stab Fund), D8/D9 district state. Bloc-level political alignment + each member's approval + vulnerability flags |
| `civic-office-crc-faction` | Ashford (D7) + Crane (D6) | CRC bloc — 2 council members (Chen D8 + Mobley D9 are OPP, NOT CRC — see #note) | D7 fiscal-oversight scope (Baylight audits, Transit Hub cost caps), D6 district state, each member's approval. CRC fiscal-conservative framing |
| `civic-office-ind-swing` | Vega (D4 Council President) + Tran (D2) | IND swing — 2 council members | Vega: Stab Fund oversight + procedural matters + Council Pres role. Tran: OARI expansion demand + D2 state (no active initiatives in D2). Each speaks for himself — not a bloc, no coordination |
| `civic-office-baylight-authority` | Director Keisha Ramos | Construction project | Baylight initiative state, construction milestones, workforce data |
| `civic-project-oari` | Director Vanessa Tran-Muñoz | Crisis response program | OARI initiative state, dispatch data, expansion planning |
| `civic-project-stabilization-fund` | Director Marcus Webb | Disbursement program | Stab Fund initiative state, processing numbers, applicant queue |
| `civic-project-health-center` | Director Bobby Chen-Ramirez | Facility project | Health Center initiative state, construction planning, health ailments from engine review |
| `civic-project-transit-hub` | Lead Elena Soria Dominguez | Transit project | Transit Hub initiative state, CBA framework, transit metrics |

**Council canonical roster (per `Civic_Office_Ledger`):** D1 Carter (OPP), D2 Tran (IND), D3 Delgado (OPP), D4 Vega (IND, Council Pres), D5 Rivers (OPP, Progressive Caucus Lead), D6 Crane (CRC), D7 Ashford (CRC), D8 Chen (OPP — note: previous versions of this skill mis-listed Chen as CRC; corrected S195/S197), D9 Mobley (OPP).

**Why the bloc topology matters (G-R11 from S193 city-hall run gap log):** When an initiative reaches `vote-ready` phase with NextActionCycle = current cycle, the prep MUST route that initiative to the relevant faction-bloc agents to surface positions for ALL 9 council members — otherwise the vote can't tally and the project agent silently invents council positions (G-R6/R7/R10). Single-member routing (e.g., only Vega had Transit Hub on his desk in C93) is the structural cause of vote-not-trigger + fabrication failures.

## Prerequisites (from /run-cycle)

Verify these exist before starting:
- `output/world_summary_c{XX}.md` — from `/build-world-summary`
- `output/engine_review_c{XX}.md` — from `/engine-review`

If either is missing, `/run-cycle` didn't complete. Don't proceed.

## Memory Fence (Phase 40.6 Layer 2)

`pending_decisions_*.md` packets and voice briefings are consumed by voice agents — a downstream model context. Any content pulled from prior logs, `search_canon`, or Supermemory results that lands in a packet must be wrapped before the voice agent sees it.

```javascript
const { wrap } = require('/root/GodWorld/lib/memoryFence');
const fencedCanon = wrap(canonExcerpt, 'bay-tribune');
```

Full convention: [[SUPERMEMORY]] §Memory Fence. Covers the threat model and when *not* to fence.

## Steps

### Step 0: Production Log

Create `output/production_log_city_hall_c{XX}.md` with header, timestamp, cycle, Mike's pressure.

### Step 1: Read All Inputs

Read all 10 inputs above. For each:

**Disk (PRIMARY — G-13, S192).** Read in this order, treat as authoritative:
1. `output/world_summary_c{XX}.md` — snapshots Civic_Office_Ledger (approval ratings + factions) + Initiative_Tracker (phase + MilestoneNotes) post-cycle. This is the canonical pre-civic state input.
2. `output/engine_review_c{XX}.md` — derives from Initiative_Tracker; surfaces ailments + remedy-firing patterns.
3. Previous `output/production_log_c{XX-1}.md` — last cycle's voice outputs + tracker updates + dramatic moments.
4. Mara directive — the cycle's editorial pressure (citizen accountability questions).
5. **Prior-cycle published canon** (G-15, S192). `editions/cycle_pulse_*_c{XX-1}_*.txt` + `output/reporters/*/articles/c{XX-1}_*.md` — interviews, dispatches, supplementals from prior cycle. Cross-reference each against active topic-assignment initiatives. If interview/dispatch text mentions an active initiative, the voice agents owning that initiative MUST see the canon excerpt in their pending_decisions.md (memory-fenced). Without this, prep ships stale framing — C92's Mayor interview answered 6 OARI/admin questions that voices would otherwise re-litigate.

**Sheets (VERIFICATION — drop unless world-summary is stale).** Sheet reads of Initiative_Tracker / Civic_Office_Ledger / Edition_Coverage_Ratings are redundant if world summary is fresh — every cell that matters is already in the disk inputs above. Run sheet reads ONLY when world_summary mtime is older than the city-hall start time, or when verifying a specific cell. Routine prep reads disk first, sheet second-and-rarely.

**MCP (LOOKUP).** Run `get_council_member` for each district with an active voice — returns live approval/faction (cross-checks world_summary). Run `lookup_initiative` for each active initiative — returns Initiative_Tracker row with MilestoneNotes (cross-checks world_summary phase). Run `get_neighborhood` / `get_neighborhood_state` for affected neighborhoods (S183 wd-neighborhood layer; the latter is narrower). Full tool inventory: [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix.

**Canon.** Run `search_canon` per active initiative to find what the Tribune has published — promises made, citizen reactions, coverage tone.

Log tracker state, approval ratings, and key findings in the production log. Present to Mike.

### Step 2: Topic Assignments

Based on tracker state + Mike's pressure + engine review ailments + Mara directive, determine:
- Which voices have decisions this cycle
- Which initiative/topic each voice owns (atomic checkout — no overlap)
- Cascade order (Mayor always first, then who reacts to Mayor)
- Engine review ailments auto-assign to relevant voices (Temescal health → Health Center + whoever owns health policy)

Log assignments in the production log:
```
## Topic Assignments
- OARI: Mayor (political) → Montez (operational) → Tran-Muñoz (project)
- Stabilization Fund: Mayor (enforcement) → Vega (oversight)
- [ENGINE AILMENT] Temescal health 4-cycle: Health Center (Chen-Ramirez) + Mayor
```

### Step 3: Write Pending Decisions

For each voice with a decision, write `output/civic-voice-workspace/{office}/current/pending_decisions.md`.

**Each pending decision includes:**
- The situation in plain language
- 2-3 predefined options with real consequences
- An open option ("Your call. Make your own move.")
- Who's watching
- Their current approval rating and vulnerability
- Their district's neighborhoods and how initiatives affect them
- Coverage feedback — did the Tribune cover their domain positively or negatively
- Engine review context — is an ailment in their domain recurring or worsening
- What they said last cycle (from previous voice output JSON) — continuity
- What the Tribune published about their initiatives (from canon search) — public record
- Mara directive pressure if relevant
- "No decision is not an option this cycle."

**Each pending decision does NOT include:**
- Citizen lists
- Raw neighborhood demographics
- Full crime data dumps
- Full initiative packets
- Anything from buildInitiativePackets.js

### Step 4: Verify Prep Outputs

Check all files exist:
- Production log created with tracker state + approvals + topic assignments
- Pending decisions written for each assigned voice
- Previous cycle context loaded and referenced

Present to Mike for approval before running `/city-hall`.

## Output Files

| File | Purpose |
|------|---------|
| `output/production_log_city_hall_c{XX}.md` | Started — Steps 0-2 complete, tracker state, approvals, topic assignments |
| `output/civic-voice-workspace/{office}/current/pending_decisions.md` | One per voice with decisions this cycle |

## Handoff to /city-hall

When this skill completes, `/city-hall` picks up by reading:

| File | What city-hall does with it |
|------|---------------------------|
| `output/production_log_city_hall_c{XX}.md` | Continues writing to this log — adds voice decisions, tracker updates, media handoff |
| `output/civic-voice-workspace/{office}/current/pending_decisions.md` | Each voice agent reads ONLY this file + their IDENTITY.md. Nothing else. |

`/city-hall` does NOT re-read sheets, MCP, or Supermemory. Everything it needs is in the files this skill produced. If the prep is right, city-hall is mechanical.

## What This Skill Does NOT Do

- Launch voice agents — that's `/city-hall`
- Apply tracker updates — that's `/city-hall`
- Run project agents — that's `/city-hall`
- Run the City Clerk — that's `/city-hall`
- Pick edition stories — that's `/sift`

## Where This Sits

After `/run-cycle` (which produces world summary and engine review). Before `/city-hall`.

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
GodWorld MCP for structured lookups. Supermemory `bay-tribune` for canon search.

## Changelog

- 2026-04-17 — v1.0 initial (S156). Voice routing table listed 17 voices including 9 individual council members.
- 2026-05-03 — v1.1 (S197, engine-sheet executing research-build Wave 1 plan per [[../../../docs/plans/2026-05-03-c93-gap-triage-execution]]). **G-10 Voice Data Routing rewritten:** table now shows the 11 actual agent rows (Mayor + Chief + DA + 3 faction-bloc agents speaking for the 9 council members + 5 project agents) instead of misleading reader into expecting 17 individual agents. Faction membership per Civic_Office_Ledger; previous text mis-listed Chen D8 as CRC, corrected to OPP. **G-13 Step 1 sheet reads demoted to verification:** Disk inputs (world_summary + engine_review + prior production log + prior published canon) are PRIMARY; sheet reads run ONLY when world_summary is stale. Captures actual S192 working practice (sheet reads were skipped because world_summary already snapshotted everything that mattered). Companion entry on G-15 (between-cycle published canon ingestion) added to Step 1 as Disk source #5.
