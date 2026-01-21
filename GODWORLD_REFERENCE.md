# GodWorld Simulation Reference Guide
## For Mara and Media Room Context

---

## What is GodWorld?

GodWorld is a **living city simulation** centered on **Oakland, California** with a sister simulation in **Chicago**. It generates emergent narratives about citizens, neighborhoods, politics, economics, weather, sports, and culture - all driven by an 11-phase engine that runs in cycles.

The simulation outputs are fed to **journalists** (Claude instances like Mara) who turn raw data into stories, news, and narrative content.

---

## Core Concepts

### Citizens

| Tier | Type | Description |
|------|------|-------------|
| **Tier-4** | Generic/Background | Anonymous background citizens in `Generic_Citizens` ledger. Can be promoted. |
| **Tier-3** | Promotable | Generic citizens with enough activity to potentially become named. |
| **Tier-2** | Named NPCs | Full characters in `Simulation_Ledger` with names, jobs, relationships. |
| **Tier-1** | Protected | Special flags: UNI (universe), MED (media), CIV (civic), GAME (video game characters) |

### Video Game Integration

- **MLB The Show** athletes are tracked as real citizens with lives outside the game
- **NBA 2K** players (especially Bulls for Chicago) have storylines
- Game results feed into the simulation as real sports events

### The GodWorld Calendar

- **52 cycles per year** (roughly weekly)
- **30+ holidays** affect mood, events, and story seeds
- **Seasons** impact weather, sports, nightlife, civic activity
- **First Friday** and **Creation Day** are special celebration cycles

---

## The 11-Phase Engine

Each cycle, the engine runs these phases in order:

### Phase 1: Config & Calendar
Sets the current cycle, derives year/season/holiday, establishes time basis.
- Key output: `cycleId`, `season`, `holiday`, `isFirstFriday`, `isCreationDay`

### Phase 2: World State
Calculates environmental modifiers for the cycle.
- Weather (temperature, conditions, mood impact)
- City dynamics (traffic, retail, tourism, nightlife, sentiment)
- Seasonal weights (affects all event probabilities)
- Sports season phase

### Phase 3: Population & Crisis
Simulates demographic changes and crisis conditions.
- Total population, illness rate, employment rate
- Migration in/out
- Crisis spike detection
- Economic label (boom/stable/recession)

### Phase 4: World Events
Generates 5-20 major events affecting the city.
- Categories: CIVIC, CRIME, HEALTH, ECONOMIC, CULTURE, SPORTS, CHAOS, CELEBRATION
- Severity: 1-5 scale
- Calendar-aware (holidays change event distributions)

### Phase 5: Citizens (Largest Phase)
Runs 14 sub-engines for citizen simulation:
- **Relationship Engine** - bonds form, strengthen, weaken, sever
- **Neighborhood Engine** - 12 Oakland districts, local events
- **Career Engine** - jobs, promotions, layoffs
- **Education Engine** - schools, learning events
- **Household Engine** - family formation, changes
- **Civic Role Engine** - mayors, council, officials
- **Bond Engine** - relationship depth tracking
- **Generational Engine** - births, aging, deaths

### Phase 6: Analysis
Post-processes events and derives flags.
- Filters noise events (keeps high-impact)
- Detects patterns across cycles
- Calculates civic load (how busy is government?)
- Identifies shock events (unusual severity)
- Spotlights prominent citizens

### Phase 7: Evening & Media
Generates evening/entertainment content.
- Famous people appearances
- Restaurant/food events
- Nightlife scene
- Sports broadcasts
- Streaming trends
- Story seeds for journalists
- Media briefing packet

### Phase 8: V3 Integration & Chicago
Handles game engine and Chicago satellite.
- V3 domains, seeds, hooks, textures
- Domain cooldowns
- Chicago citizen generation
- Chicago-specific events (Bulls, etc.)

### Phase 9: Digest
Compresses cycle into summary.
- Cycle weight (low/medium/high signal)
- Compressed digest summary
- Finalizes population metrics

### Phase 10: Persistence
Writes everything to ledgers (20+ sheets).
- Riley_Digest (main cycle summary)
- WorldEvents_Ledger
- Relationship_Bonds
- All V3 ledgers
- Cycle_Packets

### Phase 11: Media Intake (Conditional)
Processes feedback from Media Room.
- Parses journalist-written articles
- Updates citizen fame/notoriety
- Integrates narrative choices back into simulation

---

## Key Ledgers

### Core Simulation
| Ledger | Purpose |
|--------|---------|
| `Simulation_Ledger` | Named citizens (Oakland) - the main character database |
| `Generic_Citizens` | Background citizens (Tier-4) |
| `Chicago_Citizens` | Chicago citizen pool |
| `World_Population` | Population totals, illness, employment, migration |
| `World_Config` | Engine parameters, cycle counter |

### Events & Stories
| Ledger | Purpose |
|--------|---------|
| `WorldEvents_Ledger` | All generated world events |
| `WorldEvents_V3_Ledger` | V3-format events with extended context |
| `Arc_Ledger` | Multi-cycle story arcs with phase/tension |
| `Story_Hook_Deck` | Narrative hooks for journalists |
| `Story_Seed_Deck` | Story seeds prioritized from engine |
| `Storyline_Tracker` | Active storylines and their status |

### Relationships
| Ledger | Purpose |
|--------|---------|
| `Relationship_Bonds` | Current bonds between citizens (300-500 active) |
| `LifeHistory_Log` | Historical life events for citizens |

### Media System
| Ledger | Purpose |
|--------|---------|
| `Media_Briefing` | Formatted guidance for newsroom |
| `Press_Drafts` | Story summaries ready for expansion |
| `Citizen_Media_Usage` | Tracks who's been featured (prevents overuse) |
| `Continuity_Loop` | What to remember across sessions |
| `Cultural_Ledger` | Famous citizens, cultural figures |

### Cycle Output
| Ledger | Purpose |
|--------|---------|
| `Cycle_Packet` | Raw engine output - weather, sentiment, arcs, Chicago snapshot |
| `Riley_Digest` | Engine summary - feeds Media_Briefing |

### Game Integration
| Ledger | Purpose |
|--------|---------|
| `NBA_Game_Intake` | Manual intake for NBA 2K events |
| `MLB_Game_Intake` | Manual intake for MLB The Show events |
| `Sports_Calendar` | Sports schedule |

### Civic System
| Ledger | Purpose |
|--------|---------|
| `Civic_Office_Ledger` | Elected/appointed officials, factions, status |
| `Initiative_Tracker` | Mara Civic project tracker |
| `Civic_Sweep_Report` | Civic load data |

### Geography
| Ledger | Purpose |
|--------|---------|
| `Neighborhood_Map` | 12 Oakland district definitions |
| `Domain_Tracker` | Domain activity by cycle |

---

## Oakland Neighborhoods (12 Districts)

1. **Temescal** - Arts, dining, boutiques
2. **Downtown** - Business, civic center
3. **Fruitvale** - Latino culture, families
4. **Lake Merritt** - Recreation, diverse
5. **West Oakland** - Historic, gentrifying
6. **Laurel** - Residential, community-focused
7. **Rockridge** - Affluent, College Ave shops
8. **Jack London** - Waterfront, nightlife
9. **Uptown** - Arts district, nightlife
10. **KONO** - Koreatown-Northgate, emerging
11. **Chinatown** - Asian culture, markets
12. **Piedmont Ave** - Boutiques, restaurants

Each neighborhood has:
- Mood/sentiment that shifts
- Local events generated
- Citizen concentration
- Economic indicators

---

## Event Domains (20+)

Events are tagged with domains that affect cooldowns and patterns:

- **CIVIC** - Government, policy, officials
- **CRIME** - Criminal activity, safety
- **HEALTH** - Medical, wellness, illness
- **ECONOMIC** - Jobs, business, money
- **CULTURE** - Arts, music, community
- **SPORTS** - Athletics, games, teams
- **EDUCATION** - Schools, learning
- **HOUSING** - Real estate, living
- **TRANSPORT** - Traffic, transit
- **ENVIRONMENT** - Weather, nature
- **MEDIA** - News, coverage
- **SOCIAL** - Relationships, gatherings
- **RELIGIOUS** - Faith, spiritual
- **TECH** - Technology, innovation
- **FOOD** - Restaurants, dining
- **NIGHTLIFE** - Bars, clubs, evening

---

## Story Arc Lifecycle

Arcs are multi-cycle storylines that evolve:

```
SEED → EMERGING → ACTIVE → PEAK → DECLINING → DORMANT → RESOLVED/ABANDONED
```

Each arc has:
- **Phase** - Where in lifecycle
- **Tension** - 1-10 intensity
- **Citizens involved** - Named characters
- **Domain** - Primary category
- **Cycle age** - How long it's been running

Arcs can:
- Spawn from crisis events
- Connect multiple citizens
- Generate story hooks
- Be resolved by journalist coverage
- Go dormant and revive

---

## Weather System

Weather is generated per-cycle with:
- **Base conditions** from season
- **Temperature** (realistic for Bay Area)
- **Type** (clear, fog, rain, etc.)
- **Mood impact** (affects citizen behavior)
- **Neighborhood microclimates** (fog in some areas, sun in others)
- **Weather events** (storms, heat waves, etc.)

Bay Area specifics:
- Fog common in summer mornings
- Mild year-round
- Microclimates vary significantly

---

## How to Use This as Mara

### When receiving a Cycle Packet:
1. Note the **cycle reference** (e.g., Y2C18 = Year 2, Cycle 18)
2. Check the **season and holiday** for context
3. Review **world events** by severity (5 = major, 1 = minor)
4. Look at **spotlight citizens** for story subjects
5. Check **story seeds** for journalist assignments
6. Review **arc updates** for ongoing storylines

### When writing stories:
1. Reference **neighborhood** where events occur
2. Use **citizen names** from Simulation_Ledger
3. Maintain **continuity** with prior coverage
4. Don't overuse the same citizens (check Citizen_Media_Usage)
5. Connect events to **active arcs** when relevant

### When processing intake:
1. New citizens go to **Intake** sheet
2. Advancement cases go to **Advancement_Intake**
3. Health causes go to **Health_Cause_Queue**
4. Your written articles log to **Media_Intake**

---

## Key Engine Files (for reference)

| File | Purpose |
|------|---------|
| `godWorldEngine2.js` | Main orchestrator - runs all 11 phases |
| `worldEventsEngine.js` | Generates world events |
| `bondEngine.js` | Manages relationships |
| `eventArcEngine.js` | Multi-cycle story arcs |
| `mediaRoomBriefingGenerator.js` | Creates briefings for journalists |
| `citizenContextBuilder.js` | Assembles full citizen profiles |
| `storyHook.js` | Generates narrative hooks |

---

## Quick Reference: Cycle Flow

```
1. What time is it? → Calendar, season, holiday
2. What's the world like? → Weather, city dynamics
3. How's the population? → Demographics, crisis
4. What happened? → World events (5-20)
5. What are citizens doing? → 14 sub-engines
6. What matters most? → Filter, prioritize, analyze
7. What's the evening like? → Media, nightlife, food, sports
8. V3 and Chicago? → Game integration, satellite city
9. Summarize → Digest, weight
10. Save everything → Write to 20+ ledgers
11. Feedback? → Process media intake
```

---

*This document is for Mara and other GodWorld assistants to understand the simulation architecture. Last updated after engine v2.7 analysis.*
