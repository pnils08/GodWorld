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

## Step 2: Understand the Desk Packet
The Chicago packet contains:
- **worldEvents** — Chicago-filtered events (CHICAGO domain + Bulls-keyword sports)
- **storylines** — active Chicago/Bulls storylines
- **storySeeds/storyHooks** — Chicago-related seeds
- **canon.bullsRoster** — full Bulls roster with positions and stats
- **chicagoSportsFeed** — current Bulls record, recent results
- **prevEditionExcerpts** — Chicago sections from last edition

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
