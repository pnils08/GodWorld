---
name: letters-desk
description: Write the letters to the editor section with citizen voices.
---

# /letters-desk — Write Letters to the Editor

## Usage
`/letters-desk`
- No reporter — letters are written in citizen voices
- Letters respond to events from ALL desks

## Rules
- Read SESSION_CONTEXT.md FIRST
- NEVER invent citizen names for existing characters — but Letters CAN introduce new citizens
- New citizens MUST have: Name, Age, Neighborhood, Occupation
- Letters are first-person citizen voice — NOT journalist voice
- No engine metrics
- Each letter should respond to a real event or storyline from this cycle

## Step 1: Load Data
1. Read `output/desk-packets/base_context.json` — cycle info, calendar, weather
2. Read `output/desk-packets/letters_c{XX}.json` — the letters desk packet
3. Letters packet gets data from ALL domains — it's the citizen reaction section
4. If desk briefing exists, read `output/desk-briefings/letters_briefing_c{XX}.md` — Mags' editorial guidance + citizen cards + archive findings

## Local Archive Search Pool
The letters desk has Grep access to the ENTIRE local Drive mirror for citizen voice research:
- **All archives:** `output/drive-files/` — search anywhere for citizen mentions, past letters, voice continuity
- **Past editions:** `output/drive-files/_Publications Archive/` — past Letters sections for tone reference
- **Citizen references:** Search any archive by citizen name to find their history across all coverage

## Step 2: Understand the Desk Packet
The letters packet contains:
- **events** — ALL events this cycle (letters can react to anything) with priority scoring
- **storylines** — all active storylines
- **canonReference** — council, pending votes, A's roster, Bulls roster (for accuracy)
- **sportsFeeds** — both Oakland and Chicago sports feeds (raw, legacy)
- **sportsFeedDigest** — **(v1.5)** structured sports intel for both teams (`oakland` + `chicago` sub-objects with game results, story angles, player moods)
- **previousCoverage** — letters from last edition (avoid repeating same topics)
- **households** — active households (family context for citizen letters)
- **bonds** — active relationship bonds between citizens
- **economicContext** — employment, income, rent burden (economic complaint context)
- **storyConnections** — **(v1.4 enrichment — USE THIS):**
  - `eventCitizenLinks` — each event linked to named citizens in that neighborhood
  - `civicConsequences` — initiative outcomes with affected neighborhoods and real citizens (letters reacts to these)
  - `citizenBonds` — per-citizen relationship map (write letters from people who know each other)
  - `citizenLifeContext` — last 3 LifeHistory entries per citizen (gives letter writers personal history)
  - `coverageEcho` — citizens from previous edition (avoid repeating same voices)
- **voiceCards** — **(v1.9 — citizen personality profiles).** Each card has: `archetype` (Anchor, Connector, Watcher, Striver, Catalyst, Caretaker, Drifter), `modifiers`, `traits` (scored 0-1), `topTags`, `motifs`. **Letters desk: this is critical.** Every letter IS a citizen's voice. Match the voice card:
  - **Anchors** write measured letters about stability, what they've built, what they stand to lose
  - **Connectors** write letters that reference neighbors, community meetings, shared concern
  - **Watchers** write letters that observe patterns — "I've been watching this for months"
  - **Catalysts** write sharp letters — direct questions, demands for answers, contained anger
  - **Strivers** write letters about opportunity, what they need to move forward
  - **Caretakers** write letters balancing personal impact with community concern
  - If no voice card exists, write the citizen neutrally based on their occupation and neighborhood

## Step 3: Write Letters
Delegate to the **letters-desk agent** (`.claude/agents/letters-desk/`). The agent knows citizen voice rules, letter format, and canon requirements permanently.

Pass the agent:
1. The letters desk packet JSON
2. The base_context JSON

The agent handles citizen creation, voice, canon rules, and engine returns on its own.

## Step 4: Review Output
- Verify any referenced existing citizens are correct
- Check all new citizens have complete info (Name, Age, Neighborhood, Occupation)
- Confirm letters respond to real events from this cycle's packet
- Check each letter is 100-200 words
- Verify no two letters cover the exact same topic
