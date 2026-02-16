---
name: culture-desk
description: Write the culture and seasonal section using Maria Keen and the culture desk reporters.
---

# /culture-desk — Write Culture/Seasonal Section

## Usage
`/culture-desk [reporter-name]`
- Default: Maria Keen
- Other options: Elliot Graye (faith/religious), Kai Marston (arts), Farrah Del Rio (opinion), Mason Ortega (food), Angela Reyes (education), Noah Tan (weather/environment)

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent citizen names — only use names from the desk packet or existing canon
- No engine metrics in article text
- Cultural Ledger entities should be referenced by correct name and neighborhood
- Faith_Organizations has 16 Oakland congregations — use correct names

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar, weather, holidays
2. Read `output/desk-packets/culture_c{XX}.json` — the culture desk packet
3. Read `schemas/bay_tribune_roster.json` — look up reporter voice profiles
4. If reporter name given, use that reporter. Otherwise default to Maria Keen.
5. If desk briefing exists, read `output/desk-briefings/culture_briefing_c{XX}.md` — Mags' editorial guidance + citizen cards + archive findings

## Local Archive Search Pool
The culture desk has Grep access to the local Drive mirror for research and voice reference:
- **Past culture coverage:** `output/drive-files/_Tribune Media Archive/Maria_Keen/` — Maria's cultural features
- **Arts/entertainment:** `output/drive-files/_Tribune Media Archive/Kai_Marston/` — arts coverage
- **Food/hospitality:** `output/drive-files/_Tribune Media Archive/Mason_Ortega/` — food features
- **Education:** `output/drive-files/_Tribune Media Archive/Angela_Reyes/` — education reporting
- **Faith:** `output/drive-files/_Tribune Media Archive/Elliot_Graye/` — faith essays
- **Weather:** `output/drive-files/_Tribune Media Archive/Noah_Tan/` — weather/environment
- **Lifestyle:** `output/drive-files/_Tribune Media Archive/Sharon_Okafor/` — lifestyle features
- **Past editions:** `output/drive-files/_Publications Archive/` — every Cycle Pulse for continuity

## Step 2: Understand the Desk Packet
The culture packet contains:
- **events** — culture/faith/community/arts/education/weather events with priority scoring
- **storylines** — active cultural storylines
- **seeds/hooks** — culture-related seeds and hooks
- **canonReference.culturalEntities** — cultural venues, organizations, landmarks
- **previousCoverage** — culture sections from last edition
- **households** — active households, formations this cycle (marriage, family events)
- **bonds** — active relationship bonds between citizens
- **storyConnections** — **(v1.4 enrichment — USE THIS):**
  - `eventCitizenLinks` — each event linked to named citizens who live in that neighborhood
  - `citizenBonds` — per-citizen relationship map (families, community ties)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (recent experiences)
  - `coverageEcho` — citizens from previous edition (follow-up or avoid over-covering)

## Step 3: Write Articles
Delegate to the **culture-desk agent** (`.claude/agents/culture-desk/`). The agent has Maria Keen's full personality and all secondary reporter profiles baked in permanently.

Pass the agent:
1. The culture desk packet JSON
2. The base_context JSON
3. The reporter name (if user specified one other than Maria Keen)

The agent handles voice, article writing, canon rules, and engine returns on its own.

## Step 4: Review Output
- Verify cultural entity names against Cultural_Ledger data in packet
- Check faith organization names are real (from Faith_Organizations)
- Confirm neighborhood accuracy
- Check article lengths

## Culture Desk Domains
CULTURE, FAITH, COMMUNITY, FESTIVAL, ARTS, EDUCATION, WEATHER, ENVIRONMENT, FOOD

## Reporter Roster (Culture Desk)
| Reporter | Role | Best For |
|----------|------|----------|
| Maria Keen | Culture Lead | Community features, neighborhood texture, seasonal |
| Elliot Graye | Religious Affairs | Faith events, interfaith, congregations |
| Kai Marston | Arts/Entertainment | Galleries, music, First Friday, performances |
| Farrah Del Rio | Civic/Cultural Opinion | Op-eds, cultural commentary |
| Mason Ortega | Food/Hospitality | Restaurants, food culture, hospitality industry |
| Angela Reyes | Education/Youth | Schools, youth programs, education policy |
| Noah Tan | Weather/Environment | Climate, environment, seasonal patterns |
