---
name: chicago-desk
description: Write the Chicago bureau section using Selena Grant and Talia Finch.
---

# /chicago-desk — Write Chicago Bureau Section

## Usage
`/chicago-desk [reporter-name]`
- Default: Selena Grant (Bulls) + Talia Finch (Chicago Ground)
- No other options — this is a 2-person bureau

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent player names — only use Bulls roster names from the packet
- No engine metrics in article text
- Chicago has its OWN weather — use Chicago weather from the packet, not Oakland's
- Sports Clock applies for Bulls coverage

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar
2. Read `output/desk-packets/chicago_c{XX}.json` — the Chicago desk packet
3. Read `schemas/bay_tribune_roster.json` — Selena Grant + Talia Finch voice profiles
4. If desk briefing exists, read `output/desk-briefings/chicago_briefing_c{XX}.md` — Mags' editorial guidance + citizen cards + archive findings

## Local Archive Search Pool
The Chicago desk has Grep access to the local Drive mirror for research and voice reference:
- **Bulls player data:** `output/drive-files/_Bulls Universe Database/` — TrueSource player profiles, contracts, financials
- **Bulls cannon mirror:** `Bulls_Universe_Cannon_Text_Mirror` — complete Bulls universe reference
- **Past Chicago coverage:** `output/drive-files/_Publications Archive/Chicago_Supplementals/` — Chicago satellite editions
- **Past editions:** `output/drive-files/_Publications Archive/` — Skyline Tribune sections from past editions

## Step 2: Understand the Desk Packet
The Chicago packet contains:
- **events** — Chicago-filtered events (CHICAGO domain + Bulls-keyword sports) with priority scoring
- **storylines** — active Chicago/Bulls storylines
- **seeds/hooks** — Chicago-related seeds
- **canonReference.bullsRoster** — full Bulls roster with positions and stats
- **sportsFeeds** — raw feed entries (legacy, kept for reference)
- **sportsFeedDigest** — **(v1.5 — USE THIS instead of raw sportsFeeds):**
  - `gameResults` — parsed game scores, key performers, stat lines
  - `rosterMoves` — trades, signings, injuries with story angles
  - `playerFeatures` — off-field appearances, community events, milestones
  - `frontOffice` — GM decisions, coaching, organizational moves
  - `fanCivic` — stadium events, fan reactions, civic appearances
  - `editorialNotes` — Paulson's editorial instincts and story angle suggestions
  - `activeStoryAngles` — headline-ready angles from the feed
  - `playerMoods` — per-player emotional register (confident, frustrated, hungry, etc.)
  - `relatedStorylines` — active storylines cross-referenced with feed player names
  - `currentRecord`, `seasonState`, `teamMomentum` — team snapshot
- **previousCoverage** — Chicago sections from last edition
- **bonds** — active relationship bonds between Chicago citizens
- **storyConnections** — **(v1.4 enrichment):**
  - `eventCitizenLinks` — each event linked to named citizens in that neighborhood
  - `citizenBonds` — per-citizen relationship map (teammates, community ties)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (recent experiences)
  - `coverageEcho` — citizens from previous edition (follow-up or avoid over-covering)
- **voiceCards** — **(v1.9 — citizen personality profiles).** Each card has: `archetype` (Anchor, Connector, Watcher, Striver, Catalyst, Caretaker, Drifter), `modifiers`, `traits` (scored 0-1), `topTags`, `motifs`. Use these when writing citizen dialogue:
  - **Anchors** speak about neighborhood roots, Bulls history, loyalty
  - **Connectors** reference block parties, barber shops, community gatherings
  - **Watchers** observe the city analytically, notice what's shifting
  - **Catalysts** bring intensity — front office pressure, trade demands
  - If no voice card exists for a citizen, write them neutrally

## Step 3: Write Articles
Delegate to the **chicago-desk agent** (`.claude/agents/chicago-desk/`). The agent has Selena Grant and Talia Finch's full personalities baked in permanently, plus the Skyline Tribune section format.

Pass the agent:
1. The Chicago desk packet JSON
2. The base_context JSON

The agent handles voice, section format, canon rules, and engine returns on its own.

## Step 4: Review Output
- Verify all Bulls player names against roster in packet
- Check Bulls record matches Chicago_Sports_Feed
- Confirm Chicago weather is used (not Oakland)
- Check article lengths

## Chicago Desk Domains
CHICAGO, SPORTS (Bulls-filtered)

## Reporter Roster (Chicago Bureau)
| Reporter | Role | Best For |
|----------|------|----------|
| Selena Grant | Bulls Beat Reporter | Bulls coverage, roster analysis, stats |
| Talia Finch | Chicago Ground Reporter | Street-level Chicago, neighborhoods, local texture |
