---
name: sports-desk
description: Write the Oakland sports section using P Slayer, Anthony, and Hal Richmond.
---

# /sports-desk — Write Oakland Sports Section

## Usage
`/sports-desk [reporter-name]`
- Default: P Slayer (fan voice) + Anthony (data/analysis)
- Other options: Hal Richmond (legacy/history), Simon Leary (culture crossover), Tanya Cruz (social/breaking)

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent player names — only use names from the A's/Warriors rosters in the packet
- No engine metrics in article text
- Verify all player names, positions, and records against Oakland_Sports_Feed in the packet
- Sports Clock rules: A's and Warriors operate on real sports time (see TIME_CANON_ADDENDUM.md)

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar, weather
2. Read `output/desk-packets/sports_c{XX}.json` — the sports desk packet
3. Read `schemas/bay_tribune_roster.json` — look up reporter voice profiles
4. If reporter name given, use that reporter. Otherwise use P Slayer as primary, Anthony as secondary.

## Step 2: Understand the Desk Packet
The sports packet contains:
- **events** — sports-domain events this cycle with anomaly detection and priority scoring
- **storylines** — active sports storylines
- **seeds/hooks** — sports-related seeds and trigger hooks
- **canonReference.asRoster** — full A's roster with positions and stats
- **sportsFeeds** — raw feed entries (legacy, kept for reference)
- **sportsFeedDigest** — **(v1.5 — USE THIS instead of raw sportsFeeds):**
  - `gameResults` — parsed game scores, key performers, stat lines
  - `rosterMoves` — trades, signings, injuries with story angles
  - `playerFeatures` — off-field appearances, community events, milestones
  - `frontOffice` — GM decisions, coaching, organizational moves
  - `fanCivic` — stadium events, fan reactions, civic appearances
  - `editorialNotes` — Paulson's editorial instincts and story angle suggestions
  - `activeStoryAngles` — headline-ready angles from the feed ("Paulson silence finally breaking")
  - `playerMoods` — per-player emotional register (confident, frustrated, hungry, etc.)
  - `relatedStorylines` — active storylines cross-referenced with feed player names
  - `currentRecord`, `seasonState`, `teamMomentum` — team snapshot
- **previousCoverage** — sports sections from last edition
- **bonds** — active relationship bonds between citizens (sorted by intensity)
- **storyConnections** — **(v1.4 enrichment):**
  - `eventCitizenLinks` — each event linked to named citizens who live in that neighborhood
  - `citizenBonds` — per-citizen relationship map (teammates, rivals, fan connections)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (recent experiences)
  - `coverageEcho` — citizens from previous edition (follow-up or avoid over-covering)

## Step 3: Write Articles
Delegate to the **sports-desk agent** (`.claude/agents/sports-desk/`). The agent has P Slayer, Anthony, and Hal Richmond's full personalities baked in permanently.

Pass the agent:
1. The sports desk packet JSON
2. The base_context JSON
3. The reporter name (if user specified one other than P Slayer/Anthony)

The agent handles voice, article writing, canon rules, and engine returns on its own.

## Step 4: Review Output
- Verify all player names against A's/Warriors rosters in packet
- Check team records match Oakland_Sports_Feed data
- Confirm no invented roster moves or game results
- Check article lengths

## Sports Desk Domains
SPORTS (Oakland-filtered — excludes Chicago/Bulls content)

## Reporter Roster (Sports Desk)
| Reporter | Role | Best For |
|----------|------|----------|
| P Slayer | Fan Columnist (lead) | Opinion, emotional pulse, fan voice |
| Anthony | Lead Beat Reporter | A's data, roster moves, scouting, front office |
| Hal Richmond | Senior Historian | Legacy essays, dynasty context, retrospectives |
| Simon Leary | Long View Columnist | Sports culture, history crossover |
| Tanya Cruz | Sideline Reporter | Breaking news, social feeds, clubhouse access |
| DJ Hartley | Senior Photographer | Visual/atmospheric pieces |
| Elliot Marbury | Data Desk | Statistical support (usually supports Anthony) |
