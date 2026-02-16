---
name: business-desk
description: Write the business ticker section using Jordan Velez.
---

# /business-desk — Write Business Ticker Section

## Usage
`/business-desk [reporter-name]`
- Default: Jordan Velez
- Other options: Simon Leary (business culture crossover)

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent business names — use only businesses from the desk packet
- No engine metrics in article text
- Business Ticker has a specific format — follow it exactly

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar, economic data
2. Read `output/desk-packets/business_c{XX}.json` — the business desk packet
3. Read `schemas/bay_tribune_roster.json` — Jordan Velez voice profile
4. If desk briefing exists, read `output/desk-briefings/business_briefing_c{XX}.md` — Mags' editorial guidance + citizen cards + archive findings

## Local Archive Search Pool
The business desk has Grep access to the local Drive mirror for research and voice reference:
- **Past business coverage:** `output/drive-files/_Tribune Media Archive/Jordan_Velez/` — Jordan's economics features
- **Past editions:** `output/drive-files/_Publications Archive/` — past Business Ticker sections for format/voice reference

## Step 2: Understand the Desk Packet
The business packet contains:
- **events** — economic/nightlife/retail/labor events with priority scoring
- **storylines** — active business/economic storylines
- **seeds/hooks** — business-related seeds
- **previousCoverage** — business sections from last edition
- **households** — active households, rent burden context
- **economicContext** — employment, income distribution, rent burden stats, average household income
- **bonds** — active relationship bonds between citizens
- **storyConnections** — **(v1.4 enrichment — USE THIS):**
  - `eventCitizenLinks` — each event linked to named citizens who live in that neighborhood
  - `citizenBonds` — per-citizen relationship map (business partners, colleagues)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (career changes, economic events)
  - `coverageEcho` — citizens from previous edition (follow-up or avoid over-covering)

## Step 3: Write Articles
Delegate to the **business-desk agent** (`.claude/agents/business-desk/`). The agent IS Jordan Velez — his full personality and Business Ticker format are baked in permanently.

Pass the agent:
1. The business desk packet JSON
2. The base_context JSON

The agent handles voice, ticker format, canon rules, and engine returns on its own.

## Step 4: Review Output
- Verify restaurant/venue names against Cultural_Ledger data
- Check economic numbers match packet data
- Confirm Business Ticker format is exact
- Check article length

## Business Desk Domains
ECONOMIC, NIGHTLIFE, RETAIL, LABOR

## Reporter Roster (Business Desk)
| Reporter | Role | Best For |
|----------|------|----------|
| Jordan Velez | Business Reporter (lead) | Business Ticker, economic features, retail/nightlife |
| Simon Leary | Long View Columnist | Business culture crossover, economic commentary |
