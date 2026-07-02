# GODWORLD — Sheet Map
> **Source:** `Simulation_Narrative` Google Sheet
> **Sheet Last Modified:** 2026-07-02 | **Mapped:** 2026-07-02
> **Simulation Cycle:** 100 | **GodWorld Year:** 2 | **Cycle Stamp:** Y2C48
> **Mapped By:** Weekly Mapping Agent (automated)

---

## 🌐 Global State (Dashboard — Cycle 100)

| Field             | Value              | Signal |
|-------------------|--------------------|--------|
| Simulation Cycle  | 100                | —      |
| GodWorld Year     | 2                  | —      |
| Cycle Stamp       | Y2C48              | —      |
| Economy           | Stable             | 🟢     |
| Population        | 385,162            | 🟢     |
| Active Events     | 9                  | 🟡     |
| Shock Flag        | `shock-flag`       | 🔴     |
| Employment        | 89.8%              | 🟢     |
| Migration         | 6                  | 🟢     |
| World Pattern     | stability-streak   | 🟢     |
| Cycle Weight      | high-signal        | 🔴     |
| Civic Load        | minor-variance     | 🟡     |
| Nightlife Index   | 1.2×               | 🟢     |
| Traffic Index     | 1.2×               | 🟢     |
| Retail Index      | 1.3×               | 🟢     |

> ⚠️ **Dashboard "Updated" timestamp reads 2/6/2026** but the sheet was last modified **2026-07-02** — the timestamp field inside the Dashboard tab is stale/uncached.

---

## 🏙️ City Environments

### OAKLAND
| Field     | Value    | Notes |
|-----------|------------|-------|
| Weather   | Mild     | — |
| Sentiment | +0.8     | 🟢 Positive |
| Mood      | Thriving | 🟢 |
| Team      | A's      | No active streak |
| Streak    | —        | Off-season / blank |

### CHICAGO
| Field     | Value    | Notes |
|-----------|------------|-------|
| Weather   | Cold     | — |
| Sentiment | −0.2     | 🔴 Negative |
| Mood      | Troubled | 🔴 |
| Team      | Bulls    | No active streak |
| Streak    | —        | Off-season / blank |

### City Contrast Flags
- 🔴 **Sentiment Divergence:** Oakland (+0.8) vs Chicago (−0.2) = **1.0 gap** — significant mood split across environments
- ⚠️ **Weather Mismatch:** Mild vs Cold — diverging economic and social outputs expected
- ℹ️ Both sports teams show no active streak — calendar may be in transition

---

## 🗂️ Tab Inventory (Confirmed Active Tabs)

The following tabs are directly confirmed with data in this mapping run:

### ✅ Tabs With Active Data

| Tab | Status | Notes |
|-----|--------|-------|
| `Dashboard` | 🟢 Active | Mission Control — Cycle 100, Y2C48 |
| `Chaos_Cars` | 🟢 Active | 6 events logged, Cycle 100 |
| `Election_Log` | 🟢 Active | 5 council elections logged, Cycle 97 |
| `Simulation_Ledger` | 🟢 Active | At least 1 citizen entry (POP-00001) |

### 🚧 Tabs Confirmed Empty This Cycle

| Tab | Status | Notes |
|-----|--------|-------|
| `Advancement_Intake1` | 🟡 Empty | No advancement submissions this cycle |
| `Narrative_Bridge` | 🟡 Empty | No narrative bridge entries this cycle — pipeline gap |

### 📋 Full Domain Sheet Map (66 Tabs)

#### Core Engine / Control
| Sheet | Role |
|-------|------|
| `Dashboard` | Mission Control — top-level state aggregator |
| `World_Config` | Master simulation configuration |
| `Cycle_Packet` | Per-cycle snapshot bundle |
| `Ledger_Index` | Registry of all ledgers |
| `Simulation_Ledger` | Master simulation state log |
| `Simulation_Calendar` | Calendar engine driving time/events |
| `Engine_Errors` | Error log for simulation faults |
| `Reflection_Intake` | Post-cycle reflection capture |

#### World-Level Systems
| Sheet | Role |
|-------|------|
| `World_Population` | Global population data |
| `World_Drift_Report` | Macro-level drift/trend tracking |
| `WorldEvents_Ledger` | World events log (v1) |
| `WorldEvents_V3_Ledger` | World events log (v3 — current) |
| `Economic_Parameters` | Global economic variables |
| `Cycle_Weather` | Weather state per cycle |

#### Oakland Environment
| Sheet | Role |
|-------|------|
| `Neighborhood_Map` | Neighborhood topology |
| `Neighborhood_Demographics` | Population breakdown by neighborhood |
| `Crime_Metrics` | Crime data |
| `Transit_Metrics` | Transit/traffic data |
| `Bay_Tribune_Oakland` | Oakland's primary news outlet |
| `Oakland_Sports_Feed` | Oakland sports event feed |
| `As_Roster` | Oakland A's team roster |

#### Chicago Environment
| Sheet | Role |
|-------|------|
| `Chicago_Feed` | Chicago event/news feed |
| `Chicago_Sports_Feed` | Chicago sports event feed |
| `Chicago_Citizens` | Chicago citizen registry |

#### Citizens & Social
| Sheet | Role |
|-------|------|
| `Generic_Citizens` | Global citizen pool |
| `LifeHistory_Log` | Active citizen life histories |
| `LifeHistory_Archive` | Archived citizen histories |
| `Household_Ledger` | Household compositions |
| `Family_Relationships` | Family linkage graph |
| `Relationship_Bond_Ledger` | Bond event log |
| `Relationship_Bonds` | Active bond registry |
| `Youth_Events` | Youth-specific event tracking |
| `Employment_Roster` | Citizen employment records |

#### Civic / Government
| Sheet | Role |
|-------|------|
| `Initiative_Tracker` | Active civic initiatives |
| `Civic_Office_Ledger` | Office-holder records |
| `Civic_Sweep_Report` | Civic outcome sweeps |
| `Election_Log` | Election history ✅ |

#### Media & Narrative
| Sheet | Role |
|-------|------|
| `Narrative_Bridge` | Bridge between sim state and story output 🚧 |
| `Media_Ledger` | Media outlet tracking |
| `Media_Briefing` | Cycle media briefing |
| `Media_Intake` | Incoming media signals |
| `Press_Drafts` | Draft press content |
| `Riley_Digest` | Riley narrative digest |
| `Bay_Tribune_Oakland` | Oakland newspaper |
| `Edition_Coverage_Ratings` | Coverage quality/ratings |
| `Domain_Tracker` | Narrative domain tracking |
| `Citizen_Media_Usage` | How citizens consume media |
| `Citizen_Usage_Intake` | Citizen media usage intake |

#### Story Engine
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

#### Events & Chaos
| Sheet | Role |
|-------|------|
| `Texture_Trigger_Log` | Environmental texture triggers |
| `Chaos_Cars` | Chaos/random event generator ✅ |
| `Health_Cause_Queue` | Health event queue |
| `Advancement_Intake1` | Advancement/progression intake 🚧 |

#### Culture & Faith
| Sheet | Role |
|-------|------|
| `Cultural_Ledger` | Cultural events/state |
| `Faith_Organizations` | Faith org registry |
| `Faith_Ledger` | Faith activity log |

#### Economy & Business
| Sheet | Role |
|-------|------|
| `Business_Ledger` | Business registry/activity |
| `Economic_Parameters` | Global economic config |

#### Sports
| Sheet | Role |
|-------|------|
| `Oakland_Sports_Feed` | Oakland game/event feed |
| `Chicago_Sports_Feed` | Chicago game/event feed |
| `As_Roster` | Oakland A's roster |
| `NBA_Game_Intake` | NBA game data intake |
| `MLB_Game_Intake` | MLB game data intake |
| `Sports_Calendar` | Sports schedule |

---

## ⚡ Chaos_Cars — Active Events (Cycle 100 / Y2C48)

Six chaos events were dispatched this cycle across neighborhoods, businesses, and citizens:

| EventId | Vehicle | Scope | Target | Outcome | Metric | Δ |
|---------|---------|-------|--------|---------|--------|---|
| `81co2md6` | fire_engine | neighborhood | KONO | false_alarm | Sentiment | −0.05 |
| `vwde7ixb` | building_inspector | business | BIZ-00010 | passed | Annual_Revenue | −11.6 |
| `w5j77twu` | cop_car | neighborhood | West Oakland | helped_by_police | CrimeIndex | −0.14 |
| `lnh0tjnk` | mail_truck | citizen | POP-00027 | mail_theft_reported | Setback | 0 |
| `b79sms7t` | ambulance | citizen | POP-00994 | minor_injury | Health | 0 |
| `pkxgmxbs` | pge_truck | business | BIZ-00016 | planned_shutoff | Annual_Revenue | −14.72 |

**Summary:** 2 business revenue hits (−11.6, −14.72), 1 neighborhood sentiment dip (−0.05), 1 crime index reduction (−0.14), 1 mail theft setback, 1 minor health event. Net tone: negative pressure on businesses and one neighborhood; policing action in West Oakland.

---

## 🗳️ Election_Log — Cycle 97 Results (GodWorldYear 2)

All five City Council elections resolved with incumbent victories:

| Office | District | Incumbent | Challenger | Winner | Margin | Type |
|--------|----------|-----------|------------|--------|--------|------|
| City Council D1 | D1 | Denise Carter | Jia Carmichael | Denise Carter | 39% | Comfortable |
| City Council D3 | D3 | Rose Delgado | Tobias Jurko | Rose Delgado | 65% | Landslide |
| City Council D5 | D5 | Janae Rivers | Rasha Brown | Janae Rivers | 65% | Landslide |
| City Council D7 | D7 | Warren Ashford | Erica Le | Warren Ashford | 75% | Landslide |
| City Council D9 | D9 | Terrence Mobley | Clark Saryan | Terrence Mobley | 62% | Comfortable |

**All incumbents had `IncumbentAdvantage: Yes` and `EconFactor: 50`.** Stable civic continuity — no challenger upsets. 4 of 5 races were landslides.

---

## 👤 Simulation_Ledger — Active Citizen Sample

**POP-00001 — Vinnie Keane**
| Field | Value |
|-------|-------|
| Role | Designated Hitter, Oakland A's |
| Tier | 1 (Elite) |
| Status | Active |
| Neighborhood | Rockridge |
| Household | HH-KEANE |
| Employer | BIZ-00005 |
| Career Stage | Senior (18.5 yrs) |
| Career Mobility | Stagnant |
| Wealth Level | 10 |
| Income | $45,735 |
| Net Worth | $240,000,000 |
| Savings Rate | 2% |
| Debt Level | 2 |
| Education | Bachelors, School Quality 5 |
| Last Updated | 2026-06-23 (Y2C48) |
| OriginGame | MLB The Show |

> ℹ️ Keane is a farewell-season character — elite net worth, stagnant career mobility (appropriate for a retiring player). Drives narrative through sports layer.

---

## 🔗 Dependency Graph

```
LAYER 0 — Config
  World_Config ──► Economic_Parameters
  World_Config ──► Simulation_Calendar
  World_Config ──► Cycle_Packet

LAYER 1 — Time & Cycle
  Simulation_Calendar ──► Sports_Calendar ──► MLB_Game_Intake
                                           ──► NBA_Game_Intake
  Cycle_Packet ──► Dashboard
  Cycle_Weather ──► Dashboard

LAYER 2 — Environment State
  Dashboard ──► Oakland ENV (Neighborhood_Map, Crime_Metrics, Transit_Metrics, ...)
           ──► Chicago ENV (Chicago_Feed, Chicago_Sports_Feed, Chicago_Citizens)
           ──► World_Population ──► World_Drift_Report
                                ──► WorldEvents_V3_Ledger

LAYER 3 — Citizens
  World_Population ──► Generic_Citizens ──► LifeHistory_Log ──► LifeHistory_Archive
                                        ──► Household_Ledger ──► Family_Relationships
                                                             ──► Relationship_Bonds ──► Relationship_Bond_Ledger
                                        ──► Employment_Roster ──► Business_Ledger
                                                             ──► Civic_Office_Ledger

LAYER 4 — Activity Systems
  Chaos_Cars ──► Texture_Trigger_Log ──► Story_Seed_Deck
             ──► WorldEvents_V3_Ledger
  Health_Cause_Queue ──► WorldEvents_V3_Ledger
  Initiative_Tracker ──► Civic_Sweep_Report
  Election_Log ──► Civic_Office_Ledger
  MLB_Game_Intake ──► Oakland_Sports_Feed ──► Bay_Tribune_Oakland
  NBA_Game_Intake ──► Chicago_Sports_Feed

LAYER 5 — Narrative & Media
  Storyline_Tracker ──► Narrative_Bridge ──► Media_Briefing ──► Press_Drafts ──► Bay_Tribune_Oakland
  Narrative_Bridge [EMPTY this cycle — pipeline gap]             ──► Riley_Digest
  Story_Seed_Deck ──► Cycle_Seeds ──► Storyline_Intake ──► Storyline_Tracker ──► Arc_Ledger ──► Event_Arc_Ledger
  Cultural_Ledger ──► Story_Seed_Deck
  Media_Intake ──► Media_Ledger ──► Edition_Coverage_Ratings
  Bay_Tribune_Oakland ──► Citizen_Media_Usage ──► Citizen_Usage_Intake

LAYER 6 — Archive
  Dashboard ──► Simulation_Ledger ──► Ledger_Index
  Engine_Errors ──► Reflection_Intake
```

---

## 🏛️ Civic State (Cycle 100)

| Metric              | Value |
|---------------------|-------|
| Active Initiatives  | 0 |
| Pending Vote        | 0 |
| Passed Total        | 0 |
| Failed              | 0 |
| Active Bonds        | — |
| Alliances + Mentorships | 0 |
| Rivalries           | 0 |
| Peak Intensity      | — |

> ℹ️ Civic layer is dormant post-election. Bond/alliance layer still at baseline.

---

## ⚠️ Flags & Issues

| Flag | Severity | Description |
|------|----------|-------------|
| `shock-flag` | 🔴 HIGH | Active shock condition in simulation — source sheet not yet traceable from dashboard alone |
| Dashboard timestamp stale | 🔴 HIGH | Dashboard shows "Updated: 2/6/2026" but sheet was modified 2026-07-02 — internal clock not syncing |
| Sentiment Divergence | 🟠 MEDIUM | Oakland +0.8 vs Chicago −0.2 = 1.0 gap — may stress cross-city dependencies |
| `Narrative_Bridge` empty | 🟠 MEDIUM | Narrative pipeline gap — Chaos_Cars events not yet bridged to story/media layer this cycle |
| `Advancement_Intake1` empty | 🟡 LOW | No advancement intake this cycle — progression pipeline idle |
| Cycle Weight: high-signal | 🟠 MEDIUM | Cycle 100 carries elevated consequence weight — chaos events may cascade |
| Business revenue hits | 🟡 MEDIUM | BIZ-00010 (−11.6) and BIZ-00016 (−14.72) from Chaos_Cars — check Business_Ledger for compound effects |
| Civic Layer Dormant | 🟡 LOW | Zero civic activity post-election — expected quiet period |
| Bond Layer Inactive | 🟡 LOW | No active bonds or rivalries — citizen relationship dynamics not yet emergent |
| WorldEvents_Ledger v1 | 🟡 LOW | Legacy `WorldEvents_Ledger` (v1) still present alongside v3 — deprecation candidate |
| `Engine_Errors` sheet | 🟡 MONITOR | Error logging sheet exists — should be reviewed for active faults each cycle |

---

## 📐 Layer Architecture Summary

```
LAYER 0 (Config)       →  World_Config, Economic_Parameters
LAYER 1 (Time/Cycle)   →  Simulation_Calendar, Cycle_Packet, Sports_Calendar, Cycle_Weather
LAYER 2 (Env State)    →  Oakland ENV, Chicago ENV, World Systems
LAYER 3 (People)       →  Citizens, Households, Families, Employment
LAYER 4 (Activity)     →  Civic, Sports, Faith, Culture, Business, Chaos/Events
LAYER 5 (Narrative)    →  Story Engine, Media Layer, Narrative_Bridge
LAYER 6 (Archive)      →  Simulation_Ledger, Ledger_Index, Engine_Errors, Reflection_Intake
```

---

## 📋 Sheet Count by Domain

| Domain           | Sheet Count |
|------------------|-------------|
| Core Engine      | 8           |
| World Systems    | 6           |
| Oakland ENV      | 7           |
| Chicago ENV      | 3           |
| Citizens/Social  | 9           |
| Civic/Gov        | 4           |
| Media/Narrative  | 10          |
| Story Engine     | 8           |
| Events/Chaos     | 4           |
| Culture/Faith    | 3           |
| Economy/Business | 2           |
| Sports           | 6           |
| **TOTAL**        | **66**      |

---

*Weekly automated map — Simulation_Narrative Google Sheet | Cycle 100 / Year 2 / Y2C48 | Mapped 2026-07-02*
