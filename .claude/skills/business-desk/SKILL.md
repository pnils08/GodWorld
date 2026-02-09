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

## Step 2: Understand the Desk Packet
The business packet contains:
- **worldEvents** — economic/nightlife/retail/labor events
- **storylines** — active business/economic storylines
- **storySeeds/storyHooks** — business-related seeds
- **prevEditionExcerpts** — business sections from last edition

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
