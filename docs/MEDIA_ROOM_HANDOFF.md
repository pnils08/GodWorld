# Media Room Handoff Guide

## What This Document Is

This guide defines how GodWorld simulation data gets handed to the Media Room (a Claude session that writes The Cycle Pulse newspaper). It replaces the ad-hoc "drop everything into chat" workflow with a structured process that reduces noise, eliminates redundancy, and produces better journalism.

**Quality benchmark**: Edition 77 (Father's Day) — the best Cycle Pulse to date.

---

## Current Workflow (v1 — Manual)

```
GodWorld Engine → Export Script → Google Drive (txt files)
                                        ↓
                              Manual copy/paste into Claude chat
                              Manual upload to Claude Project
                                        ↓
                              Media Room writes The Cycle Pulse
```

### What gets exported (10 files, ~1.5MB total)

| File | Size | Currently Shared? | Actually Needed? |
|------|------|-------------------|------------------|
| media_briefing | 122KB | Yes (Raw_Data) | **YES — but only current cycle** |
| cycle_packet | 45KB | Yes (Raw_Data) | **YES — current cycle only** |
| storyline_tracker | 104KB | Yes (Storylines) | **YES — active entries only** |
| citizen_ledgers (9 files) | 774KB | Yes (Project) | **YES — essential for sourcing** |
| press_drafts | 12KB | Yes (Raw_Data) | **YES — current cycle** |
| story_seeds | 23KB | Yes (Raw_Data) | Partial — Priority 2-3 only |
| world_events | 12KB | Yes (Raw_Data) | Partial — current cycle only |
| riley_digest | 64KB | Yes (Raw_Data) | **NO — engine analytics, not for journalists** |
| story_hooks | 14KB | Yes (Raw_Data) | **NO — redundant with Media Briefing** |
| world_population | 1KB | Yes (Raw_Data) | **NO — already in cycle_packet** |
| feeders (19 files) | 526KB | No | **NO — engine internals** |

### Problems with v1

1. **Media Briefing contains ALL cycles stacked** — Cycle 78 briefing starts at line 1498 of 2357. The first 63% is old data.
2. **Continuity notes are never deduplicated** — The Baylight Timeline appears 4 times, Council Composition 3 times, Paulson quotes 3 times. In Cycle 78, continuity notes are 584 lines (68% of the briefing), of which ~70-80% are verbatim duplicates.
3. **Story Seeds are padded** — Priority 1 seeds like "Barbecue smoke rises from backyards" waste tokens without guiding journalism.
4. **Signal fatigue** — Every cycle is flagged "shock-flag" with "breaking news priority," making the signal meaningless.
5. **Riley Digest and Story Hooks are noise** — Engine analytics and raw hook data duplicate what's already in the Media Briefing.
6. **Total token cost is enormous** — Raw Data alone is ~310KB of text. Much of it is historical or duplicated.

---

## Proposed Workflow (v2 — Structured Handoff)

```
GodWorld Engine → Export Script → Google Drive
                                        ↓
                              Handoff Compiler (new script)
                              Extracts current cycle only
                              Deduplicates continuity
                              Filters low-priority seeds
                                        ↓
                              Single HANDOFF document (~30KB target)
                              + Citizen Ledgers (Project upload)
                              + Previous Edition (for tone/continuity)
                                        ↓
                              Media Room writes The Cycle Pulse
```

### What the Media Room receives

**Document 1: CYCLE HANDOFF** (paste into chat — target ~30KB, down from 310KB)

Contains these sections in order:

```
1. EDITORIAL HEADER
   - Cycle number, date, season, holiday, weather, sentiment
   - One-sentence editorial direction (not generic "shock event")

2. FRONT PAGE RECOMMENDATION
   - Lead story pitch with specific angle
   - Recommended reporter

3. CIVIC STATUS
   - Officials count, vacancies, health alerts
   - Council composition table (ONE copy)
   - Vote math for next pending vote (ONE copy)

4. ACTIVE STORYLINES (from Storyline Tracker)
   - Only "active" status entries
   - Phase changes since last cycle
   - New threads introduced
   - Resolved threads

5. STORY ASSIGNMENTS (from Press Drafts)
   - Current cycle assignments only
   - Reporter, type, headline, draft summary

6. WORLD EVENTS (current cycle only)
   - Skip generic/broken entries
   - Include domain, severity, neighborhood

7. STORY SEEDS (Priority 2-3 only)
   - Drop all Priority 1 filler
   - Drop seasonal boilerplate

8. ARC STATUS (from Media Briefing Section 6)
   - Active arcs with tension scores
   - Reporter assignments

9. CALENDAR & TEXTURE
   - Holiday guidance (only when there IS a holiday)
   - Texture triggers (atmosphere cues)
   - Sports season status with actual records

10. CULTURAL ENTITIES
    - New profiles available
    - Active figures with fame scores

11. CONTINUITY REFERENCE (DEDUPLICATED)
    - Council composition (latest version only)
    - All pending vote counts (latest version only)
    - Key civic status items (Osei, Crane)
    - Sports state (records, key facts)
    - A's universe (compact)
    - Key Baylight facts (ONE canonical copy)

12. SECTION ASSIGNMENTS
    - Only when changed from previous cycle

13. RETURNS EXPECTED
    - Article Table format
    - Storylines Carried Forward format
    - Citizen Usage Log format
    - Continuity Notes format
```

**Document 2: CITIZEN LEDGERS** (upload to Project — unchanged)
- All 9 ledger files
- Essential for finding quotable citizens with neighborhoods, occupations, ages

**Document 3: PREVIOUS EDITION** (paste into chat or Project)
- The complete prior Cycle Pulse (e.g., Edition 77)
- Sets tone, provides callback opportunities, maintains voice continuity

---

## What Makes Edition 77 Great (Quality Standards)

These are the patterns the handoff must enable:

### 1. Named citizens with specific details
Every article sources real citizens from the ledgers:
```
Javier Harris, 57, an electrician who's lived in West Oakland for thirty years
```
Not "a local resident" — full name, age, occupation, neighborhood, context.

### 2. Direct quotes that reveal character
```
"I'm not here to talk about policy. I'm here because three families on my block packed trucks this year."
```
Citizens speak in their own voice. The quote advances the story AND reveals who they are.

### 3. Specific addresses and numbers
```
1847 Filbert, 1852 Filbert, 1859 Filbert — three houses, three families.
```
Not "several houses" — specific addresses. Not "many evictions" — "two hundred evictions annually."

### 4. Continuity callbacks
```
Christopher Walker, 34, a mechanic who was quoted in last cycle's letters section, returned with his kids.
```
Characters recur. The world remembers itself.

### 5. Vote math tracked precisely
```
4 YES: Carter (D1), Delgado (D3), Rivers (D5), Mobley (D9)
1 Lean YES: Vega (D4) — under OPOA pressure
1 Undecided: Tran (D2)
```
Every council vote has exact counts, named members, faction affiliations.

### 6. Letters that feel written by real people
```
"My father worked at the port for forty-two years. Never missed a day."
```
Letters reference personal history, specific places, emotional reactions to the cycle's events.

### 7. Chicago Bureau has its own texture
```
"Not since Rose," Turner said. "Maybe not since Jordan."
```
Chicago scenes use Chicago details — the lakefront, Boystown, dim sum in Chinatown.

### 8. Clean returns for engine intake
Article Table, Storylines Updated, Citizen Usage Log, Continuity Notes — all structured for engine processing.

---

## Handoff Compiler (Future Script)

A Google Apps Script function `compileHandoff(cycleNumber)` that:

1. Reads Media_Briefing sheet → extracts only the target cycle row
2. Reads Storyline_Tracker → filters to active/recent entries
3. Reads Press_Drafts → filters to current cycle
4. Reads World_Events_V3 → filters to current cycle
5. Reads Story_Seed_Deck → filters to current cycle, Priority >= 2
6. Reads World_Population → gets current cycle metrics
7. Deduplicates continuity data (keeps latest version of each block)
8. Assembles into the structured format above
9. Writes to a single "Handoff_C{XX}" sheet or exports to Drive

**Estimated token reduction**: ~310KB raw → ~30KB compiled (90% reduction)

This means the Media Room session:
- Starts faster (less context to process)
- Has cleaner signal (no noise)
- Produces better stories (more token budget for actual writing)

---

## Edition Structure (What The Cycle Pulse Should Contain)

Based on Edition 77:

```
THE CYCLE PULSE — EDITION {N}
{MONTH} | {WEEK} | {HOLIDAY if any}

Weather: {temp}, {type} | {descriptor}
Sentiment: {value} | Migration: {drift} | Pattern: {flag}

############################################################
FRONT PAGE (2-3 major stories)
############################################################
- Lead civic or breaking story
- Secondary story (different beat)

############################################################
CIVIC AFFAIRS (1-2 stories)
############################################################
- Council/government updates
- Infrastructure incidents

############################################################
SPORTS (2-3 stories)
############################################################
- A's coverage (Anthony)
- Bulls coverage (Selena Grant)

############################################################
CHICAGO BUREAU (1-2 stories)
############################################################
- Game recap (Selena Grant)
- Ground snapshot (Talia Finch)

############################################################
{HOLIDAY/CULTURAL SECTION if applicable}
############################################################
- Feature tied to current holiday or cultural event

############################################################
LETTERS TO THE EDITOR (2-3 letters)
############################################################
- Citizens reacting to current cycle events
- Mix of perspectives

############################################################
ARTICLE TABLE (engine intake)
############################################################
|Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|

############################################################
STORYLINES UPDATED (engine intake)
############################################################
NEW THIS CYCLE: (bullet list)
PHASE CHANGES: (bullet list)
STILL ACTIVE: (bullet list)
RESOLVED: (bullet list)

############################################################
CITIZEN USAGE LOG (engine intake)
############################################################
CIVIC OFFICIALS: (named, with title)
SPORTS — A'S: (named, with position)
SPORTS — BULLS: (named, with position)
JOURNALISTS: (named, with article count)
CITIZENS QUOTED: (name, age, neighborhood, occupation, context)
CITIZENS IN LETTERS: (name, age, neighborhood, occupation)

############################################################
CONTINUITY NOTES — CYCLE {N} (engine intake)
############################################################
Council composition table
Vote counts for pending initiatives
Civic staff status
Sports records
A's universe facts
Cultural notes
New canon figures
```

---

## Reporter Roster

| Reporter | Beat | Style | Status |
|----------|------|-------|--------|
| Carmen Delaine | Civic Affairs | Measured, precise, source-heavy | Core |
| Anthony | Lead Sports (A's) | Direct, analytical | Core |
| P Slayer | Sports Opinion | Personal, emotional, fan perspective | Core |
| Hal Richmond | Opinion/Analysis | Historical context, institutional | Core |
| Selena Grant | Bulls Beat | Game-focused, stat-driven | Core |
| Talia Finch | Chicago Ground | Sensory, street-level | Core |
| Maria Keen | Cultural Liaison | Community-focused, warm | Core |
| Marla Keen | Neighborhoods | Hyper-local, detail-oriented | Support |
| Mags Corliss | Front Page | Major breaking stories | Support |
| Jordan Velez | Business/Analysis | Numbers-driven, comprehensive | Support |
| Luis Navarro | Features/Community | Human interest, neighborhood voices | Support |
| Dr. Lila Mezran | Health | Medical precision, public health | Specialist |
| Trevor Shimizu | Infrastructure | Technical, procedural | Specialist |
| Rachel Torres | Public Safety | Official, measured | Specialist |
| Elliot Graye | Faith & Ethics | Reflective, ethical framing | Tier 2 |
| Mason Ortega | Food & Hospitality | Sensory, grounded, former chef | Tier 2 |
| Farrah Del Rio | Civic Opinion | Sharp, informed, unapologetically Oakland | Tier 2 |
| MintConditionOakTown | Internet/Speculation | Messy, impulsive, unverified | Tier 2 |

---

## Implementation Priority

1. **Immediate (this session)**: Use this document structure manually for Cycle 78
2. **Next session**: Build `compileHandoff()` script in Google Apps Script
3. **After Supermemory Pro**: Persist handoff structure + continuity in MCP memory
4. **Agent Newsroom era**: Automate the full pipeline

---

## Appendix: Data Source Reference

| Export File | Sheet Source | Key Columns |
|-------------|-------------|-------------|
| media_briefing | Media_Briefing | Cycle, Briefing (text blob) |
| cycle_packet | Cycle_Packet | Cycle, PacketText |
| storyline_tracker | Storyline_Tracker | CycleAdded, Type, Description, Status |
| press_drafts | Press_Drafts | Cycle, Reporter, StoryType, DraftText |
| story_seeds | Story_Seed_Deck | Cycle, Priority, SeedText, Domain |
| world_events | WorldEvents_V3_Ledger | Cycle, EventDescription, Severity, Domain |
| world_population | World_Population | cycle, sentiment, migration, economy |
| riley_digest | Riley_Digest | Cycle, all metrics |
| citizen_ledgers | Multiple (9 sheets) | Varies per ledger |
