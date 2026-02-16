---
name: civic-desk
description: Write the civic affairs section for an edition using Carmen Delaine and the civic desk reporters.
---

# /civic-desk — Write Civic Affairs Section

## Usage
`/civic-desk [reporter-name]`
- Default: Carmen Delaine
- Other options: Luis Navarro, Tanya Cruz, Trevor Shimizu, Sgt. Rachel Torres, Dr. Lila Mezran

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent citizen names — only use names from the desk packet data or existing canon
- No engine metrics in article text (no "tension score", "severity level", system counts)
- Verify council members, vote positions against the canon reference in the packet
- New citizens must be logged in the Citizen Usage Log with full details

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar, weather, sentiment
2. Read `output/desk-packets/civic_c{XX}.json` — the civic desk packet
3. Read `schemas/bay_tribune_roster.json` — look up the reporter's voice profile
4. If reporter name is given as argument, use that reporter. Otherwise default to Carmen Delaine.
5. If desk briefing exists, read `output/desk-briefings/civic_briefing_c{XX}.md` — Mags' editorial guidance + citizen cards + archive findings

## Local Archive Search Pool
The civic desk has Grep access to the local Drive mirror for research and voice reference:
- **Past civic coverage:** `output/drive-files/_Tribune Media Archive/Carmen_Delaine/` — Carmen's civic ledger articles
- **Investigations:** `output/drive-files/_Tribune Media Archive/Luis_Navarro/` — Luis's investigation pieces
- **Health desk:** `output/drive-files/_Tribune Media Archive/Dr._Lila_Mezran/` — health reporting history
- **Transit/infrastructure:** `output/drive-files/_Tribune Media Archive/Trevor_Shimizu/` — transit coverage
- **Past editions:** `output/drive-files/_Publications Archive/` — every Cycle Pulse for initiative continuity

## Step 2: Understand the Desk Packet
The civic packet contains:
- **events** — civic/health/crime/transit events this cycle with anomaly detection and priority scoring
- **storylines** — active storylines relevant to civic beat
- **seeds** — story seed suggestions from the engine
- **hooks** — story hook triggers
- **canonReference** — council composition, pending votes, status alerts, recent outcomes
- **maraDirective** — Mara Vance's editorial directive for this cycle (civic gets this)
- **previousCoverage** — relevant sections from last edition for continuity
- **households** — active households, formations/dissolutions this cycle
- **bonds** — active relationship bonds between citizens (sorted by intensity)
- **economicContext** — employment, income distribution, rent burden stats
- **storyConnections** — **(v1.4 enrichment — USE THIS):**
  - `eventCitizenLinks` — each event linked to named citizens who live in that neighborhood
  - `civicConsequences` — initiative outcomes with affected neighborhoods and real citizens
  - `citizenBonds` — per-citizen relationship map (who knows whom, bond type, intensity)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (what they've been through)
  - `coverageEcho` — citizens from previous edition (follow-up or avoid over-covering)

## Step 3: Write Articles
Delegate to the **civic-desk agent** (`.claude/agents/civic-desk/`). The agent has Carmen Delaine's full personality and all secondary reporter profiles baked in permanently.

Pass the agent:
1. The civic desk packet JSON
2. The base_context JSON
3. The Mara directive (if present)
4. The reporter name (if user specified one other than Carmen)

The agent handles voice, article writing, canon rules, and engine returns on its own.

## Step 4: Review Output
Before showing the user:
- Check all citizen names against the desk packet canon section
- Verify no engine jargon leaked into article text
- Confirm engine returns are properly formatted
- Check article lengths are in range

## Civic Desk Domains
CIVIC, INFRASTRUCTURE, HEALTH, CRIME, SAFETY, GOVERNMENT, TRANSIT

## Reporter Roster (Civic/Metro Desk)
| Reporter | Role | Best For |
|----------|------|----------|
| Carmen Delaine | Civic Ledger (lead) | Government, municipal rhythm, infrastructure data |
| Luis Navarro | Investigations | Shock events, accountability, anomalies |
| Trevor Shimizu | Transit & Infrastructure | Utilities, transit, outages, structural issues |
| Sgt. Rachel Torres | Public Safety | Crime, safety events, OPD interface |
| Dr. Lila Mezran | Health Desk | Medical, public health, clinic reports |
| Tanya Cruz | Sideline/Support | Quick updates, social media angle |
