---
name: city-hall-prep
description: Prepare all inputs for city-hall voice agents. Reads tracker, approvals, world summary, engine review, coverage ratings, previous log, canon, Mara directive. Writes pending decisions per voice.
effort: high
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

Each voice looks at different data. Route the right inputs to the right pending decision:

| Voice | District/Scope | Data They Need |
|-------|---------------|----------------|
| Mayor Santana | Citywide | All initiatives, all approval ratings, engine review ailments, Mara directive, coverage feedback across all domains |
| Chief Montez | Public Safety | Crime metrics, OARI data, safety-related engine ailments, safety coverage ratings |
| Rivers (OPP/D5) | D5 — East Oakland | OARI in her district, displacement data, D5 neighborhood state, her approval + vulnerability |
| Delgado (OPP/D3) | D3 — Fruitvale | Transit Hub (Fruitvale), OARI in D3, D3 neighborhood state, her approval |
| Carter (OPP/D1) | D1 — Jack London/W Oakland | Baylight jobs, Stab Fund (W Oakland), D1 neighborhood state, her approval |
| Vega (IND/D4) | D4 — Council President | Stab Fund oversight, procedural matters, his approval |
| Tran (IND/D2) | D2 | OARI expansion demand, D2 neighborhood state (no active initiatives), his approval |
| Ashford (CRC/D7) | D7 — Fiscal oversight | Baylight audits, Transit Hub cost caps, fiscal data, his approval |
| Crane (CRC/D6) | D6 | District-specific state, his approval |
| Chen (CRC/D8) | D8 | District-specific state, her approval |
| Mobley (OPP/D9) | D9 | District-specific state, his approval |
| DA Dane | Legal framework | Only runs when legal dimension exists this cycle |
| Baylight (Ramos) | Construction project | Baylight initiative state, construction milestones, workforce data |
| OARI (Tran-Muñoz) | Crisis response program | OARI initiative state, dispatch data, expansion planning |
| Stab Fund (Webb) | Disbursement program | Stab Fund initiative state, processing numbers, applicant queue |
| Health Center (Chen-Ramirez) | Facility project | Health Center initiative state, construction planning, health ailments from engine review |
| Transit Hub (Soria D.) | Transit project | Transit Hub initiative state, CBA framework, transit metrics |

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

**Sheets:** Read Initiative_Tracker, Civic_Office_Ledger, Edition_Coverage_Ratings via service account.

**MCP:** Run `get_council_member` for each district with an active voice. Run `lookup_initiative` for each active initiative. Run `get_neighborhood` for affected neighborhoods.

**Canon:** Run `search_canon` per active initiative to find what the Tribune has published — promises made, citizen reactions, coverage tone.

**Disk:** Read world summary, engine review, previous city-hall log, previous voice outputs, Mara directive.

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
