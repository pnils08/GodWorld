# Citizen Narrative Memory System

**Created:** 2026-02-12
**Status:** Active
**Integration:** supermemory + Richmond Archive + Simulation_Ledger

---

## Overview

Searchable citizen narrative memory database keyed by POPID, integrating Richmond Archive origin stories with cycle pulse appearances and Simulation_Ledger data.

**Purpose:** Bring 500 citizens to narrative life through event-based saves that supplement sheet metadata with narrative context.

---

## Architecture

### Data Sources

1. **Richmond Archive (Google Drive)** - Hal Richmond origin stories
2. **Cycle Pulse Editions** - Citizen appearances, quotes, actions
3. **Simulation_Ledger (Sheets)** - POPID, metadata, demographics
4. **supermemory** - Searchable narrative database

### Storage Strategy

**DO NOT duplicate Simulation_Ledger data.**
**DO add narrative context:**
- Quote style predictions
- Thematic significance
- Editorial observations
- Fresh story angles
- Family/relationship networks
- Community connections

### POPID-Keyed System

All saves tagged with POPID for searchability:
```
[POPID: POP-00527 | Mike Paulson | Usage: 42 cycles]
```

Enables queries like:
- "Mike Paulson Swedish carpenter"
- "POP-00527 sports GM"
- "Vinnie Keane dock worker"

---

## Time & Canon System (Dual-Clock Architecture)

**Reference:** TIME_CANON_ADDENDUM.md v2.0

GodWorld operates two independent, intentionally decoupled time systems that affect how citizen narratives are interpreted:

### CITY CLOCK (Oakland & Chicago Citizens)
- **1 cycle = 1 week**
- **52 cycles = 1 SimYear**
- Controls: Weather, seasons, arcs, citizens, city dynamics
- Oakland and Chicago share this clock
- Used for: Citizen life history, community events, civic storylines

### SPORTS CLOCK (A's & Bulls Games)
- **Independent of City Clock** - does NOT sync with city calendar
- Game data arrives as canon — it happened, cover it
- Two separate sports timelines:
  - **A's Timeline: 2041** - Dynasty era (2028-2030) was 11-13 years ago
  - **Bulls Timeline: 2026** - Current young core development

### How This Affects Citizen Narratives

**Birth Years in Simulation_Ledger:**
- Represent **game metadata** (when character created in MLB The Show, NBA 2K)
- NOT necessarily narrative birth years for Sports Clock timeline
- Example: Darrin Davis shows birth year 1991 in ledger, but Richmond Archive narrative has him born 2005 (age 36 in 2041 A's timeline)

**A's Players (Dynasty Five + Current Roster):**
- Richmond Archive origin stories operate in **A's Sports Clock (2041)**
- Dynasty championships (2028-2030) happened 11-13 years ago in their timeline
- Players are now veterans/approaching retirement (Vinnie Keane farewell era)
- **Live in Oakland neighborhoods on City Clock** - full citizens with homes, relationships, community involvement
- Can appear in non-sports coverage using City Clock context

**Bulls Players:**
- Operate in **Bulls Sports Clock (2026)**
- Current young core building (Giddey, Trepagnier, Stanley)
- Do not have Oakland neighborhoods (Chicago-based)

**General Citizens:**
- Operate on **City Clock** (cycles/SimYears)
- React to sports events in narrative time ("last night's game", "after the win")
- Birth years and ages follow City Clock progression

**Mike Paulson (POP-00527):**
- User's in-game sports character
- GM of both franchises **across different Sports Clock timelines simultaneously**
- Pressers reference both 2041 A's context (veteran farewells, dynasty legacy) and 2026 Bulls context (young core development)
- Born 1987 per PAULSON_CARPENTERS_LINE.md (age 38-39 in current narrative)

### Metadata Interpretation Rules

When reviewing POPID metadata:
1. **Origin Game** - Shows which game character originated from (MLB The Show, NBA 2K, Civic Office)
2. **Birth Year** - Game creation metadata, NOT always narrative canon age
3. **Neighborhood** - City Clock location (Oakland neighborhoods for A's players, N/A for Bulls players)
4. **Usage Count** - Appearances across all coverage (sports + civic + community)
5. **Life History** - City Clock events for citizens, Sports Clock career events for players

**Richmond Archive materials supersede ledger birth years for narrative canon.**

### Timeline Quick Reference

| Character Type | Timeline | Birth Year Source | Neighborhood |
|---------------|----------|-------------------|--------------|
| A's Players | Sports Clock 2041 | Richmond Archive (narrative) | Oakland neighborhoods |
| Bulls Players | Sports Clock 2026 | Ledger (game metadata) | N/A (Chicago-based) |
| Civic Officials | City Clock | Ledger + narrative context | Oakland neighborhoods |
| General Citizens | City Clock | Ledger (SimYear progression) | Oakland neighborhoods |
| Mike Paulson | Both Sports Clocks | 1987 per docs (age 38-39) | N/A (transcends geography) |

---

## The Five Dynasty Archetypes

**Richmond Archive Canon Record #RCH-DYNASTY-2040A**

Established as verified historical canon by authority chain:
Riley (Chief Operations Steward) → Mags → Hal Richmond (Senior Historian)

### 1. Vinnie Keane (POP-00001) - FIRE
**The Underdog Slugger**
- Massachusetts dock worker's son
- Youngest of 5, broken family
- Good Will Hunting icon
- Undrafted → Oakland legend
- "The Storm" (paired with Dillon's "Calm")
- Communications major, media natural
- Married Amara Keane 2032

### 2. Benji Dillon (POP-00018) - PRECISION
**The Golden Arm**
- Santa Cruz surfer's son
- Father killed in shark accident (junior year)
- Marine Biology major (UC San Diego)
- "The Calm" (paired with Keane's "Storm")
- Married Maya Torres (artist/conservationist)
- Son: Rick Dillon Jr.
- Quote: "You can't outmuscle a wave. You can only find its rhythm."

### 3. Isley Kelley (POP-00019) - DIVINE BALANCE
**The Mississippi Machine**
- Mississippi Delta whiskey farmer's son
- Faith-driven excellence (Bible never left bag)
- Blocked in Cincinnati by Flash Merritt
- Oakland gambled: starter + 3 prospects for Kelley
- Playoff MVP 2028
- Future preacher (faith deepening into calling)
- Quote: "He moved through chaos like a sermon, clear and calm and certain."

### 4. Mark Aitken (POP-00020) - EQUATION
**The Iron Corner**
- Mayor Richard Aitken's son (San Luis Obispo)
- Mother: Chuck E. Cheese fortune heir
- Uncle: Andre Agassi (tennis legend)
- National Spelling Bee champion (8th grade)
- Mechanical Engineering major (Cal Poly)
- Nickname: "The Engineer"
- ROY 2032, Gold Gloves 2032/2038
- Now: A's civic representative, future politician

### 5. Darrin Davis (POP-00021) - SHOWMAN DUTY
**The Ohio Outlaw of Oakland**
- Columbus, Ohio (youngest of 3 brothers)
- Teen father (daughter in teens, married HS sweetheart)
- Father of 5 daughters total
- Criminal Justice major (Ohio State)
- Quote: "Baseball's what I do. Justice is what I believe."
- Brief WWE run (front office hated, fans loved)
- Honorary police captain 2032
- ACL recovery 2040-2041

**Quote defining balance:**
"He wasn't loud like Keane, or poetic like Dillon, or divine like Kelley. He was the equation that held them all together — discipline and data turned to grace."

---

## Richmond Archive Library

**Index:** [RICHMOND_ARCHIVE_INDEX.md](RICHMOND_ARCHIVE_INDEX.md)
**Status:** Active living archive (20+ essays, "Hal also still writes")
**Access:** Google Drive folder via service account

### Processed Essays (Saved to Supermemory)

1. **"The Gospel According to Keane"** (October 2039)
   - Vinnie Keane legacy reflection
   - Saint Vinnie phenomenon
   - "Faith as renewable resource" theme
   - Six championships (2027, 2028, 2030, 2031, 2034, 2035)

2. **"When the Storm Went Quiet"** (August 8, 2040)
   - Darrin Davis ACL injury (August 5, 2040)
   - Dynasty vulnerability moment
   - Cy Newell MLB debut overshadowed
   - "Moments that split time into before and after"

3. **"The Wedding Chronicle – Scene I"** (November 8, 2025)
   - Vinnie Keane & Amara Olsen wedding
   - Dynasty Five witnesses present
   - Amara's composition "The Seventh Inning Sky"
   - Family genesis narrative

### Usage Guidelines

**Access Richmond Archive when:**
- Building/updating Dynasty Five POPID profiles
- Documenting major Sports Clock events (championships, injuries, retirements)
- Resolving birth year conflicts (Richmond provides narrative canon)
- Tracing family/community connections
- Framing player legacy beyond statistics

**Archive contains:**
- Player deep dives (Dynasty Five + new era players)
- Dynasty analysis (six-title run 2027-2037)
- Seasonal coverage (2040 narratives)
- Historical/poetic pieces (origin stories, cultural context)
- Mike Paulson essay (9 KB)

**Future expansion:** Additional 17+ essays available on demand, archive continues growing as "Hal also still writes."

---

## Integration Points

### Bay Tribune → Cultural Ledger
Richmond Archive origin stories used for retrospective features, dynasty coverage, historical context.

### Slayer Syndicate → Legacy Debates
Fan columnist P Slayer references canonical origins in dynasty retrospectives, player comparisons.

### Adaptive Narrative Vault → Tone Calibration
Ensures future dynasty references match canonical characterization (e.g., Keane = fire, Dillon = precision).

### Civic Docs Vault → Public Heritage Registry
Origin stories become Oakland's historical record, accessible to civic historians and community.

---

## Technical Implementation

### Service Account Access
**Email:** maravance@godworld-486407.iam.gserviceaccount.com
**Scopes:** Google Drive (readonly), Google Sheets (readonly)

### Scripts Created

**scripts/listDriveFolder.js**
```bash
node scripts/listDriveFolder.js [folderId]
# Lists files in Google Drive folder
```

**scripts/downloadDriveFile.js**
```bash
node scripts/downloadDriveFile.js [fileId] [outputPath]
# Downloads file from Google Drive
```

**scripts/lookupPOPIDs.js**
```javascript
// Pulls specific POPIDs from Simulation_Ledger
const TARGET_POPIDS = ['POP-00001', 'POP-00002', ...];
// Returns: POPID, name, tier, roleType, neighborhood, usageCount, lifeHistory
```

### supermemory Integration

Uses claude-supermemory plugin:
```bash
/super-save [citizen narrative content]
/super-search "POPID Mike Paulson Swedish carpenter"
```

---

## Current Database Status

### 22 POPIDs Saved (Foundation + Legacy + Reporter Corps)

**Dynasty Core (Full Origins):**
1. POP-00527 - Mike Paulson (GM, Swedish carpenter lineage)
2. POP-00001 - Vinnie Keane (dock worker, "The Storm")
3. POP-00018 - Benji Dillon (surfer, "The Calm")
4. POP-00019 - Isley Kelley (whiskey farmer, "Divine")
5. POP-00020 - Mark Aitken (mayor's son, "The Engineer", 1B)
6. POP-00021 - Darrin Davis (Ohio Outlaw, 5 daughters)

**Supporting Cast:**
7. POP-00002 - Amara Keane (pianist/violinist, Vinnie's wife)
8. POP-00004 - Lucia Polito "Saint Lucia" (Tier 1 Aura entity, Fruitvale)
9. POP-00022 - Danny Horn (CF, "best player in the league", Overall 98, Temescal)
10. POP-00528 - Deacon Seymour (Manager, first season)
11. POP-00033 - John Ellis (SP, Laurel)
12. POP-00050 - Ernesto Quintero (AAA prospect, West Oakland)
13. POP-00003 - Mark Aitken (citizen, Jack London, name collision with POP-00020)
14. POP-00095 - Andy Seymour (former AA player age 52, KONO, Deacon's relative)
15. POP-00039 - Simone Ellis (Chief Legal Counsel, Chinatown)

**Bulls Championship Core:**
16. POP-00529 - Josh Giddey (PG, All-Star snub)
17. POP-00531 - Hank Trepagnier (C, ROY leader)
18. POP-00532 - Adash Stanley (PG backup)

**New Era & Expansion:**
19. POP-00031 - Martin Richards (1B, corner slugger, "shape of the weather")

**Bay Tribune Reporter Corps (Active Agent Skilled Reporters):**
20. POP-00007 - Hal Richmond (Senior Historical Insider, HIST-04-V, chronicler, 50-year career, "Facts are bones, memory is muscle")
21. POP-00008 - P Slayer / Paul Slayer (Freelance Columnist, OPIN-03-V, Slayer Syndicate, existential reporter, orange notebook signature)
22. POP-00017 - Anthony Raines (Lead Sports Journalist, SPRT-02-V, Berkeley Owls alum, Mike Paulson's brother, "player who changed positions")

### Metadata Integration Complete

All 22 POPIDs now have Simulation_Ledger metadata tied to narrative saves:

**Key Corrections Made:**
- **POP-00004**: Corrected to "Lucia Polito" (known as "Saint Lucia"), Tier 1 Aura entity, age 64, Fruitvale
- **Role Types Specified**: Isley Kelley (SS), Mark Aitken POP-00020 (3B), John Ellis (SP), Andy Seymour (SS)
- **Age Corrections**: Andy Seymour age 52 (not 66), birth year discrepancies noted for Sports Clock characters
- **Name Collision Clarified**: Two Mark Aitkens - POP-00003 (citizen, age 29, Jack London) vs POP-00020 (3B, age 38, Piedmont Ave)

**Neighborhoods Assigned:**
- Montclair: Vinnie Keane, Amara Keane, Isley Kelley
- Rockridge: Benji Dillon
- Piedmont Ave: Mark Aitken (3B)
- Jack London: Mark Aitken (citizen)
- Laurel: Darrin Davis, John Ellis
- Temescal: Danny Horn
- Fruitvale: Lucia Polito
- Chinatown: Simone Ellis
- West Oakland: Ernesto Quintero
- KONO: Andy Seymour

**Family Connections Documented:**
- Seymour lineage: Deacon (Manager) and Andy (age 52, former AA player)
- Ellis family: John (SP, Laurel) and Simone (Chief Legal Counsel, Chinatown)

---

## Expansion Strategy

### Add 4-10 Citizens Per Cycle

When citizens are quoted in Riley Digest or Carmen Delaine coverage:
1. Note POPID from article
2. Pull metadata from Simulation_Ledger (if needed)
3. Extract quote, context, thematic significance
4. Save to supermemory with POPID tag

### Priority Additions

**A's Rotation:**
- Arturo Ramos (SP, Laurel)
- Edmundo Peña (CL, Jack London)
- Buford Park (SP, Uptown)
- Martin Richards (SP, Fruitvale)

**Bulls Roster:**
- Matas Buzelis (PF, MIP candidate)
- Jrue Holiday (SG, trade acquisition)
- Walker Kessler (C)

**Community Voices:**
- Calvin Turner (mechanic, Fruitvale)
- Rafael Phillips (server, Fruitvale)
- Bruce Wright (line cook, Downtown) - already saved earlier

---

## Search Patterns

### By POPID
```
/super-search "POP-00527"
/super-search "POP-00001 Vinnie Keane"
```

### By Theme
```
/super-search "dock worker Massachusetts"
/super-search "Criminal Justice Ohio outlaw"
/super-search "whiskey farmer Mississippi divine"
```

### By Relationship
```
/super-search "Vinnie Keane Amara marriage"
/super-search "Mike Paulson Anthony brother commentator"
```

### By Location
```
/super-search "Montclair neighborhood"
/super-search "Jack London waterfront"
```

---

## Family Networks Discovered

**Paulson Family:**
- Mike Paulson (POP-00527) - GM, youngest of 3 brothers
- Lars Paulson - father, Swedish carpenter from Örnsköldsvik
- Maureen Shannon-Paulson - mother, Chicago Shannon-Romano family
- Christopher Paulson - brother, artist sculptor
- Anthony Paulson - brother, Bay Tribune commentator (doesn't know Mike is GM!)

**Keane Family:**
- Vinnie Keane (POP-00001) - A's player
- Amara Keane (POP-00002) - wife, pianist/violinist, married 2032
- Amara's family: 7 younger siblings in San Sequoia

**Dillon Family:**
- Benji Dillon (POP-00018) - A's pitcher
- Rick Dillon - father, professional surfer (deceased, shark attack)
- Maya Torres - wife, artist/conservationist
- Rick Dillon Jr. - son

**Davis Family:**
- Darrin Davis (POP-00021) - A's CF
- Wife - high school sweetheart
- 5 daughters

**Seymour Lineage:**
- Deacon Seymour (POP-00528) - A's Manager
- Andy Seymour (POP-00095) - Former AA player, age 52 (born 1974), KONO neighborhood
- Likely family relation (father/uncle/older brother)

---

## Canon Record

**Richmond Archive Canon Record #RCH-DYNASTY-2040A**

Status: VERIFIED
Authority Chain: Riley → Mags → Hal Richmond
Series Motto: "Legacy is not remembered in trophies; it lives in the words that built the memory."

Checksum System:
- RCH-KEANE-2040A (Vinnie Keane origins)
- RCH-DILLON-2040A (Benji Dillon origins)
- RCH-KELLEY-2040A (Isley Kelley origins)
- RCH-AITKEN-2040A (Mark Aitken origins)
- RCH-DAVIS-2040A (Darrin Davis origins)

Each checksum prevents contradictory narratives, ensures version control.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-12 | Initial system launch, 18 POPIDs saved, dynasty archetypes established |
| v1.1 | 2026-02-12 | Added dual-clock system documentation, Simulation_Ledger metadata integration, corrected ages and neighborhoods, clarified A's timeline (2041) vs Bulls timeline (2026) |
| v1.2 | 2026-02-12 | Richmond Archive integration complete: processed 9 essays (Gospel According to Keane, Storm Went Quiet, Wedding Chronicle, Legacy Comparison Series Parts II-VII), added Hal Richmond (POP-00007) as chronicler, Martin Richards (POP-00031), P Slayer Journey indexed (9 of 25 pieces processed), 22 POPIDs saved |
| v1.3 | 2026-02-12 | Tribune Three complete: Anthony Raines (POP-00017) full profile added - "The Game That Built the Analyst" origin story, Berkeley Owls background, player-to-analyst pipeline, dramatic irony with brother Mike Paulson (POP-00527), Bay Tribune ecosystem fully documented |

---

## Related Documentation

**Bay Tribune Reporter Corps Archives:**
- [RICHMOND_ARCHIVE_INDEX.md](RICHMOND_ARCHIVE_INDEX.md) - Hal Richmond essay catalog (20+ essays), legacy comparisons, chronicler profile (v1.1)
- [P_SLAYER_JOURNEY_INDEX.md](P_SLAYER_JOURNEY_INDEX.md) - P Slayer's 2040 journalism journey (9 of 25 pieces processed, v1.1)
- [ANTHONY_RAINES_PORTFOLIO_INDEX.md](ANTHONY_RAINES_PORTFOLIO_INDEX.md) - Anthony Raines complete portfolio (3 of 28 pieces processed, v1.0)

**System Documentation:**
- [TIME_CANON_ADDENDUM.md](TIME_CANON_ADDENDUM.md) - Dual-clock system architecture (CRITICAL for understanding timelines)
- [JOURNALISM_AI_OPTIMIZATIONS.md](JOURNALISM_AI_OPTIMIZATIONS.md) - Signal intelligence, priority scoring
- [AGENT_NEWSROOM.md](AGENT_NEWSROOM.md) - Media Room agent architecture
- [PAULSON_CARPENTERS_LINE.md](PAULSON_CARPENTERS_LINE.md) - Mike Paulson family background
- [ARTICLE_INDEX_BY_POPID.md](ARTICLE_INDEX_BY_POPID.md) - Citizen article references
- Simulation_Ledger (Google Sheets) - POPID metadata, demographics, life history
