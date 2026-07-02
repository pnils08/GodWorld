# GODWORLD — Base Dependency Map
> **Source:** `Simulation_Narrative` Google Sheet  
> **Snapshot Cycle:** 100 | **Last Updated:** 2/6/2026 1:36 AM  
> **Mapped By:** Environment & Dependency Mapping Agent

---

## 🌐 Overview

GODWORLD is a multi-environment simulation engine controlled by a central **Mission Control** dashboard. The world runs in discrete **Cycles**, with state flowing outward from global configuration → city environments → citizens → media → narrative output.

| Field         | Value           |
|---------------|-----------------|
| Simulation Cycle | 100          |
| Global Economy | Stable          |
| Population    | 385,162         |
| Active Events | 9               |
| Shock Flag    | shock-flag      |
| Employment    | 89.8%           |
| Migration     | 6               |
| Cycle Weight  | high-signal     |
| World Pattern | stability-streak |
| Civic Load    | minor-variance  |

---

## 🏙️ City Environments

### OAKLAND
| Field     | Value    |
|-----------|----------|
| Weather   | Mild     |
| Sentiment | +0.8     |
| Mood      | Thriving |
| Team      | A's      |
| Streak    | —        |

### CHICAGO
| Field     | Value    |
|-----------|----------|
| Weather   | Cold     |
| Sentiment | −0.2     |
| Mood      | Troubled |
| Team      | Bulls    |
| Streak    | —        |

### Contrast Flags
- ⚠️ **Sentiment Divergence:** Oakland (+0.8) vs Chicago (−0.2) = **1.0 gap** — significant mood split across environments
- ⚠️ **Weather Mismatch:** Oakland Mild vs Chicago Cold — likely influencing economic and social outputs differently
- ℹ️ Both sports teams currently show no active streak — calendar/season may be dormant

---

## 🗂️ Sheet Inventory (66 Tabs)

### 🔧 Core Engine / Control
| Sheet | Role |
|-------|------|
| `Dashboard` | Mission Control — top-level state aggregator |
| `World_Config` | Master simulation configuration |
| `Cycle_Packet` | Per-cycle snapshot bundle |
| `Ledger_Index` | Index/registry of all ledgers |
| `Simulation_Ledger` | Master simulation state log |
| `Simulation_Calendar` | Calendar engine driving time/events |
| `Engine_Errors` | Error log for simulation faults |
| `Reflection_Intake` | Post-cycle reflection capture |

### 🌍 World-Level Systems
| Sheet | Role |
|-------|------|
| `World_Population` | Global population data |
| `World_Drift_Report` | Macro-level drift/trend tracking |
| `WorldEvents_Ledger` | World events log (v1) |
| `WorldEvents_V3_Ledger` | World events log (v3 — current) |
| `Economic_Parameters` | Global economic variables |
| `Cycle_Weather` | Weather state per cycle |

### 🏙️ Oakland Environment
| Sheet | Role |
|-------|------|
| `Neighborhood_Map` | Neighborhood topology |
| `Neighborhood_Demographics` | Population breakdown by neighborhood |
| `Crime_Metrics` | Crime data |
| `Transit_Metrics` | Transit/traffic data |
| `Bay_Tribune_Oakland` | Oakland's primary news outlet |
| `Oakland_Sports_Feed` | Oakland sports event feed |
| `As_Roster` | Oakland A's team roster |

### 🏙️ Chicago Environment
| Sheet | Role |
|-------|------|
| `Chicago_Feed` | Chicago event/news feed |
| `Chicago_Sports_Feed` | Chicago sports event feed |
| `Chicago_Citizens` | Chicago citizen registry |

### 👥 Citizens & Social
| Sheet | Role |
|-------|------|
| `Generic_Citizens` | Global citizen pool |
| `LifeHistory_Log` | Active citizen life history |
| `LifeHistory_Archive` | Archived citizen histories |
| `Household_Ledger` | Household compositions |
| `Family_Relationships` | Family linkage graph |
| `Relationship_Bond_Ledger` | Bond event log |
| `Relationship_Bonds` | Active bond registry |
| `Youth_Events` | Youth-specific event tracking |
| `Employment_Roster` | Citizen employment records |

### 🏛️ Civic / Government
| Sheet | Role |
|-------|------|
| `Initiative_Tracker` | Active civic initiatives |
| `Civic_Office_Ledger` | Office-holder records |
| `Civic_Sweep_Report` | Civic outcome sweeps |
| `Election_Log` | Election history |

### 📰 Media & Narrative
| Sheet | Role |
|-------|------|
| `Narrative_Bridge` | Bridge between sim state and story output |
| `Media_Ledger` | Media outlet tracking |
| `Media_Briefing` | Cycle media briefing |
| `Media_Intake` | Incoming media signals |
| `Press_Drafts` | Draft press content |
| `Riley_Digest` | Riley narrative digest |
| `Bay_Tribune_Oakland` | Oakland newspaper (also in Oakland env) |
| `Edition_Coverage_Ratings` | Coverage quality/ratings |
| `Domain_Tracker` | Narrative domain tracking |
| `Citizen_Media_Usage` | How citizens consume media |
| `Citizen_Usage_Intake` | Citizen media usage intake |

### 📖 Story Engine
| Sheet | Role |
|-------|------|
| `Story_Seed_Deck` | Active story seed cards |
| `Story_Seed_Deck_Archive` | Archived story seeds |
| `Story_Hook_Deck` | Active story hooks |
| `Cycle_Seeds` | Per-cycle story seed outputs |
| `Storyline_Intake` | Incoming storyline inputs |
| `Storyline_Tracker` | Active storylines |
| `Arc_Ledger` | Story arc records |
| `Event_Arc_Ledger` | Event-driven arc records |

### ⚡ Event & Chaos Systems
| Sheet | Role |
|-------|------|
| `Texture_Trigger_Log` | Environmental texture triggers |
| `Chaos_Cars` | Chaos/random event generator |
| `Health_Cause_Queue` | Health event queue |
| `Advancement_Intake1` | Advancement/progression intake |

### ⛪ Culture & Faith
| Sheet | Role |
|-------|------|
| `Cultural_Ledger` | Cultural events/state |
| `Faith_Organizations` | Faith org registry |
| `Faith_Ledger` | Faith activity log |

### 💼 Economy & Business
| Sheet | Role |
|-------|------|
| `Business_Ledger` | Business registry/activity |
| `Economic_Parameters` | Global economic config (also in World) |

### ⚽ Sports
| Sheet | Role |
|-------|------|
| `Oakland_Sports_Feed` | Oakland game/event feed |
| `Chicago_Sports_Feed` | Chicago game/event feed |
| `As_Roster` | Oakland A's roster |
| `NBA_Game_Intake` | NBA game data intake |
| `MLB_Game_Intake` | MLB game data intake |
| `Sports_Calendar` | Sports schedule |

---

## 🔗 Dependency Graph

```
                        ┌─────────────────────────────┐
                        │       WORLD_CONFIG           │  ← Master Config
                        └──────────────┬──────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
     ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
     │  CYCLE_PACKET   │    │  ECONOMIC_PARAMS │    │  SIMULATION_CALENDAR │
     │  (Cycle #100)   │    │  Economy: Stable │    │  Season / Holidays   │
     └────────┬────────┘    └────────┬─────────┘    └──────────┬───────────┘
              │                      │                          │
              ▼                      │                          │
     ┌─────────────────┐             │                ┌─────────────────────┐
     │   DASHBOARD     │◄────────────┘                │   SPORTS_CALENDAR   │
     │ MISSION CONTROL │◄─────────────────────────────┤   NBA / MLB Intake  │
     └────────┬────────┘                              └─────────────────────┘
              │
    ┌─────────┼────────────────────────────────────────┐
    │         │                                        │
    ▼         ▼                                        ▼
┌──────┐  ┌────────────────┐                ┌──────────────────────┐
│ OAK  │  │    CHICAGO     │                │   WORLD SYSTEMS      │
│ ENV  │  │      ENV       │                │                      │
├──────┤  ├────────────────┤                │ World_Population     │
│Nbhd  │  │Chicago_Feed    │                │ World_Drift_Report   │
│Map   │  │Chicago_Sports  │                │ WorldEvents_V3_Ledger│
│Nbhd  │  │Chicago_Citizens│                │ Cycle_Weather        │
│Demo  │  └───────┬────────┘                └──────────┬───────────┘
│Crime │          │                                     │
│Metr  │          └──────────────┐                      │
│Trans │                         │                      │
│Metr  │                         │                      │
│Bay   │                         │                      │
│Trib  │                         ▼                      ▼
│OAK   │              ┌────────────────────────────────────────┐
│A's   │              │            CITIZEN LAYER               │
│Sport │              │                                        │
│Feed  │              │  Generic_Citizens  LifeHistory_Log     │
└──┬───┘              │  Household_Ledger  Family_Relationships │
   │                  │  Relationship_Bonds  Employment_Roster  │
   └──────────────────►  Youth_Events  LifeHistory_Archive     │
                      └──────────────────┬─────────────────────┘
                                         │
              ┌──────────────────────────┼─────────────────────────┐
              ▼                          ▼                          ▼
   ┌──────────────────┐       ┌────────────────────┐    ┌──────────────────────┐
   │   CIVIC LAYER    │       │  CULTURAL / FAITH  │    │   STORY ENGINE       │
   │                  │       │                    │    │                      │
   │ Initiative_Track │       │ Cultural_Ledger    │    │ Story_Seed_Deck      │
   │ Civic_Office_Led │       │ Faith_Org          │    │ Story_Hook_Deck      │
   │ Civic_Sweep_Rpt  │       │ Faith_Ledger       │    │ Cycle_Seeds          │
   │ Election_Log     │       │ Business_Ledger    │    │ Storyline_Tracker    │
   └────────┬─────────┘       └──────────┬─────────┘    │ Arc_Ledger           │
            │                            │               │ Event_Arc_Ledger     │
            └──────────────┬─────────────┘               └──────────┬───────────┘
                           ▼                                         │
                  ┌─────────────────────┐                            │
                  │   CHAOS & EVENTS    │                            │
                  │                     │                            │
                  │ Chaos_Cars          │                            │
                  │ Texture_Trigger_Log │                            │
                  │ Health_Cause_Queue  │                            │
                  │ Advancement_Intake1 │                            │
                  └──────────┬──────────┘                            │
                             │                                       │
                             └───────────────────────────────────────┘
                                         │
                                         ▼
                            ┌────────────────────────────┐
                            │       MEDIA LAYER          │
                            │                            │
                            │  Narrative_Bridge          │
                            │  Media_Ledger              │
                            │  Media_Briefing            │
                            │  Media_Intake              │
                            │  Press_Drafts              │
                            │  Bay_Tribune_Oakland       │
                            │  Riley_Digest              │
                            │  Domain_Tracker            │
                            │  Edition_Coverage_Ratings  │
                            │  Citizen_Media_Usage       │
                            └────────────────────────────┘
                                         │
                                         ▼
                            ┌────────────────────────────┐
                            │     SIMULATION LEDGER      │
                            │   (Master Archive + Log)   │
                            │                            │
                            │  Simulation_Ledger         │
                            │  Ledger_Index              │
                            │  Engine_Errors             │
                            │  Reflection_Intake         │
                            └────────────────────────────┘
```

---

## 🌐 World Pulse (Cycle 100 State)

| Metric       | Value           | Signal |
|--------------|-----------------|--------|
| Civic Load   | minor-variance  | 🟡 Low activity |
| Migration    | 6               | 🟢 Stable |
| Pattern      | stability-streak | 🟢 Consistent |
| Cycle Weight | high-signal     | 🔴 High impact cycle |
| Nightlife    | 1.2x            | 🟢 Above baseline |
| Traffic      | 1.2x            | 🟢 Above baseline |
| Retail       | 1.3x            | 🟢 Above baseline |
| Employment   | 89.8%           | 🟢 Healthy |

---

## 🏛️ Civic State

| Metric           | Value |
|------------------|-------|
| Active Initiatives | 0   |
| Pending Vote       | 0   |
| Passed Total       | 0   |
| Failed             | 0   |

> ℹ️ **Civic layer is dormant** — no active initiatives or pending votes at Cycle 100.

---

## 🤝 Bonds & Relations

| Metric                  | Value |
|-------------------------|-------|
| Active Bonds            | --    |
| Rivalries               | 0     |
| Alliances + Mentorships | 0     |
| Peak Intensity          | --    |

> ℹ️ **Bond layer is at baseline** — no active rivalries or alliances recorded yet.

---

## ⚠️ Flags & Risk Summary

| Flag | Severity | Description |
|------|----------|-------------|
| `shock-flag` | 🔴 HIGH | A shock condition is active in the simulation — source unknown from dashboard alone |
| Sentiment Divergence | 🟠 MEDIUM | Oakland (+0.8) vs Chicago (−0.2) — city mood gap may stress cross-city dependencies |
| Cycle Weight: high-signal | 🟠 MEDIUM | This cycle carries elevated consequence weight — events may have outsized impact |
| Civic Layer Dormant | 🟡 LOW | Zero civic activity could indicate suppressed initiative or pre-election quiet period |
| Bond Layer Inactive | 🟡 LOW | No active bonds or rivalries — citizen relationship dynamics not yet emergent |
| Sports: No Streaks | 🟡 LOW | Both A's and Bulls show no active streak — calendar may be in off-season |
| `Engine_Errors` sheet | 🟡 MONITOR | Error logging sheet exists — should be reviewed for any active faults |

---

## 📐 Layer Architecture Summary

```
LAYER 0 (Config)     →  World_Config, Economic_Parameters
LAYER 1 (Time/Cycle) →  Simulation_Calendar, Cycle_Packet, Sports_Calendar, Cycle_Weather
LAYER 2 (Env State)  →  Oakland ENV, Chicago ENV, World Systems
LAYER 3 (People)     →  Citizens, Households, Families, Employment
LAYER 4 (Activity)   →  Civic, Sports, Faith, Culture, Business, Chaos/Events
LAYER 5 (Narrative)  →  Story Engine, Media Layer, Narrative_Bridge
LAYER 6 (Archive)    →  Simulation_Ledger, Ledger_Index, Engine_Errors, Reflection_Intake
```

---

## 📋 Sheet Count by Domain

| Domain         | Sheet Count |
|----------------|-------------|
| Core Engine    | 8           |
| World Systems  | 6           |
| Oakland ENV    | 7           |
| Chicago ENV    | 3           |
| Citizens/Social| 9           |
| Civic/Gov      | 4           |
| Media/Narrative| 10          |
| Story Engine   | 8           |
| Events/Chaos   | 4           |
| Culture/Faith  | 3           |
| Economy/Business| 2          |
| Sports         | 6           |
| **TOTAL**      | **66**      |

---

*Generated from Simulation_Narrative Google Sheet — Cycle 100 snapshot*
