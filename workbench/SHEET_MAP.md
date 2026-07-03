# GODWORLD — Simulation_Narrative Sheet Map

**Sheet:** Simulation_Narrative  
**Sheet ID:** `1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk`  
**Owner:** riley.steward.system@gmail.com  
**Last Modified:** 2026-07-03T06:22:40Z  
**Map Generated:** 2026-07-03 (Automated Weekly Run)  
**Tabs Identified:** 6

---

## Overview

This spreadsheet is the central data layer for **GODWORLD**, a narrative city simulation. It tracks simulation cycles, citizen records, civic events, elections, chaos events, and narrative synthesis across two simulated cities — Oakland and Chicago. The sheet functions as a hybrid **game state store** and **narrative engine**, with tabs serving distinct roles in the simulation pipeline.

---

## Tab Structure

### Tab 1 — Dashboard (Mission Control)

**Purpose:** Read-only top-level overview of the current simulation state. Serves as the "control panel" for the GODWORLD engine. Displays aggregated metrics derived from all other tabs.

**Layout:** Two-column city panels (Oakland | Chicago) with stacked section blocks.

**Sections & Current Values (Cycle 100):**

| Section | Field | Oakland | Chicago |
|---|---|---|---|
| **City State** | Weather | mild | cold |
| | Sentiment | 0.8 | -0.2 |
| | Mood | Thriving | Troubled |
| | Sports Team | A's | Bulls |
| | Streak | — | — |
| **Global** | Cycle | 100 | — |
| | Economy | stable | — |
| | Population | 385,162 | — |
| | Events | 9 | — |
| | Shock | shock-flag | — |
| **Calendar** | Season | -- | — |
| | Holiday | — | — |
| | Sports | -- | — |
| | Special | — | — |
| **World Pulse** | Civic Load | minor-variance | — |
| | Migration | 6 | — |
| | Pattern | stability-streak | — |
| | Cycle Weight | high-signal | — |
| | Nightlife | — | 1.2 |
| | Traffic | — | 1.2 |
| | Retail | — | 1.3 |
| | Employment | — | 89.8% |
| **Civic** | Active Initiatives | 0 | — |
| | Pending Vote | 0 | — |
| | Passed | 0 | — |
| | Failed | 0 | — |
| **Bonds** | Active Bonds | -- | — |
| | Alliances + Mentorships | 0 | — |
| | Rivalries | 0 | — |
| | Peak Intensity | -- | — |

**Last Updated:** 2/6/2026, 1:36:46 AM  
⚠️ **Stale** — Dashboard timestamp predates latest simulation activity (Election_Log shows Cycle 97 events from 6/12/2026; current run is Cycle 100 as of 2026-07-03).

---

### Tab 2 — Chaos_Cars

**Purpose:** Event log for chaos vehicle dispatches during each simulation cycle. Each row is a single vehicle event targeting a neighborhood, business, or citizen. Outcomes modify metrics in Simulation_Ledger.

**Columns:**
| Column | Type | Description |
|---|---|---|
| CycleId | int | Simulation cycle number |
| EventId | string | Unique event identifier (8-char hash) |
| VehicleType | enum | Type of chaos vehicle dispatched |
| TargetScope | enum | `neighborhood` / `business` / `citizen` |
| TargetId | string | ID of target (neighborhood name, BIZ-xxxxx, or POP-xxxxx) |
| TargetTier | varies | Outcome tier / tier flag |
| DiceOutcome | string | Named outcome from dice roll |
| PrimaryMetric | string | Metric affected by event |
| MetricMagnitude | float | Signed delta applied to metric |
| ConsequenceFloorFired | bool | Whether consequence floor was triggered |
| ChaosNarrativeSeed | string | Narrative seed text for story generation |
| CycleStamp | string | Cycle stamp code (e.g. Y2C48) |

**Active Data (Cycle 100 / CycleStamp Y2C48):**
| EventId | VehicleType | TargetScope | TargetId | Outcome | Metric | Delta |
|---|---|---|---|---|---|---|
| 81co2md6 | fire_engine | neighborhood | KONO | false_alarm | Sentiment | -0.05 |
| vwde7ixb | building_inspector | business | BIZ-00010 | passed | Annual_Revenue | -11.6 |
| w5j77twu | cop_car | neighborhood | West Oakland | helped_by_police | CrimeIndex | -0.14 |
| lnh0tjnk | mail_truck | citizen | POP-00027 | mail_theft_reported | Setback | 0 |
| b79sms7t | ambulance | citizen | POP-00994 | minor_injury | Health | 0 |
| pkxgmxbs | pge_truck | business | BIZ-00016 | planned_shutoff | Annual_Revenue | -14.72 |

**Vehicle Types Seen:** fire_engine, building_inspector, cop_car, mail_truck, ambulance, pge_truck  
**Target Scopes:** neighborhood, business, citizen  
**Metrics Affected:** Sentiment, Annual_Revenue, CrimeIndex, Health, Setback

---

### Tab 3 — Advancement_Intake1

**Purpose:** Intake form for character advancement submissions. Characters promoted or modified via this form are then propagated to Simulation_Ledger.

**Columns:** First, Middle, Last, RoleType, Tier, ClockMode, CIV, MED, UNI, Notes  
**Status:** ⚠️ **Empty** — No advancement records present.

---

### Tab 4 — Election_Log

**Purpose:** Records the outcome of all elections within the GODWORLD simulation.

**Columns:**
| Column | Type | Description |
|---|---|---|
| Timestamp | datetime | Real-world date of election processing |
| Cycle | int | Simulation cycle |
| GodWorldYear | int | In-world year |
| OfficeId | string | Unique office identifier |
| Title | string | Office title |
| District | string | District code |
| Incumbent | string | Incumbent candidate name |
| Challenger | string | Challenger candidate name |
| Winner | string | Winning candidate |
| Margin | percent | Victory margin |
| MarginType | enum | `comfortable` / `landslide` / etc. |
| IncumbentAdvantage | bool | Whether incumbent advantage applied |
| EconFactor | int | Economic factor weight used |
| Narrative | string | Generated narrative summary |

**Active Data (Cycle 97 — Oakland City Council Elections, 6/12/2026):**
| OfficeId | Title | District | Incumbent | Challenger | Winner | Margin | Type |
|---|---|---|---|---|---|---|---|
| COUNCIL-D1 | City Council D1 | D1 | Denise Carter | Jia Carmichael | Denise Carter | 39% | comfortable |
| COUNCIL-D3 | City Council D3 | D3 | Rose Delgado | Tobias Jurko | Rose Delgado | 65% | landslide |
| COUNCIL-D5 | City Council D5 | D5 | Janae Rivers | Rasha Brown | Janae Rivers | 65% | landslide |
| COUNCIL-D7 | City Council D7 | D7 | Warren Ashford | Erica Le | Warren Ashford | 75% | landslide |
| COUNCIL-D9 | City Council D9 | D9 | Terrence Mobley | Clark Saryan | Terrence Mobley | 62% | comfortable |

**Observation:** All incumbents won. Only odd-numbered districts (D1, D3, D5, D7, D9) held elections — consistent with a staggered term cycle. Even districts (D2, D4, D6, D8) not up for election this cycle.

---

### Tab 5 — Narrative_Bridge

**Purpose:** Synthesis layer that bridges raw simulation data to narrative output. Each row represents a full narrative package for a simulation cycle — theme, city tone, causal linkages, key players, stage direction.

**Columns:** Cycle, Cycle_Theme, City_Tone, Lead_Synthesis, Causal_Link, Neighborhood_Focus, Key_Players, Stage_Direction, Data_Anchors  
**Status:** ⚠️ **Empty** — No narrative records present. This is the primary narrative bottleneck.

---

### Tab 6 — Simulation_Ledger

**Purpose:** Master registry of all simulated citizens. The canonical source of truth for citizen identity, biography, economics, career, household, and memory state. The largest and most complex tab in the sheet.

**Column Schema (50+ fields):**

| Category | Fields |
|---|---|
| **Identity** | POPID, First, Middle, Last, Gender, BirthYear, OriginCity |
| **Game Origin** | OriginGame, ClockMode, UNI (y/n), MED (y/n), CIV (y/n) |
| **Role** | Tier, RoleType, Status |
| **Household** | Neighborhood, HouseholdId, MaritalStatus, NumChildren, ParentIds, ChildrenIds |
| **Economics** | WealthLevel, Income, InheritanceReceived, NetWorth, SavingsRate, DebtLevel, EconomicProfileKey, EmployerBizId |
| **Education** | EducationLevel, SchoolQuality |
| **Career** | CareerStage, YearsInCareer, CareerMobility, LastPromotionCycle |
| **Migration** | DisplacementRisk, MigrationIntent, MigrationReason, MigrationDestination, MigratedCycle, ReturnedCycle |
| **Narrative** | CitizenBio, LifeHistory, TraitProfile, MemoryRegisters |
| **Meta** | CreatedAt, LastUpdated, UsageCount, DialState, SMPageId |

**ClockMode Values:** GAME (sport/entertainment imports), LIVE (active simulation citizens), and potentially others  
**Tier System:** Numeric (1–N), where Tier 1 = highest profile

**Sample Record:**
- **POP-00001** — Vinnie Keane (MLB The Show import)
  - Role: Designated Hitter, Oakland A's Legend | Tier 1 | GAME clock
  - Neighborhood: Rockridge | Household: HH-KEANE | Married
  - Net Worth: $240M | Income: $45,735 | Bachelors degree | Senior career stage
  - Employer: BIZ-00005 (Oakland A's organization)
  - Bio highlight: 436 career HRs, 6 World Series rings, 2031 championship walk-off HR

---

## Dependency Graph

```
Simulation_Ledger
    ↑ feeds ←── Advancement_Intake1  (character promotions)
    ↑ targeted by ←── Chaos_Cars     (POP-xxxxx citizen events)
    ↓ aggregates to ──→ Dashboard     (Population count, citizen metrics)

Chaos_Cars
    → modifies → Simulation_Ledger   (citizen Health, Setback metrics)
    → modifies → [Business Registry] (Annual_Revenue via BIZ-xxxxx)
    → modifies → [Neighborhood data] (Sentiment, CrimeIndex)
    → informs  → Dashboard           (Events count, Shock flag)

Election_Log
    → informs  → Dashboard           (Civic section — initiatives, votes)
    → references → Simulation_Ledger (candidate names map to citizens)

Narrative_Bridge
    ← reads from → Chaos_Cars        (event data for cycle narrative)
    ← reads from → Election_Log      (election outcomes for synthesis)
    ← reads from → Simulation_Ledger (key player profiles)
    ← reads from → Dashboard         (city tone, cycle theme)

Advancement_Intake1
    → writes to → Simulation_Ledger  (Tier, RoleType, ClockMode updates)

Dashboard
    ← aggregated from → all tabs     (read-only display layer)
```

---

## Issues Flagged

| # | Severity | Tab | Issue |
|---|---|---|---|
| 1 | 🔴 HIGH | Dashboard | **Stale timestamp** — last updated 2/6/2026; current cycle is 100 as of 2026-07-03. Dashboard appears frozen. |
| 2 | 🔴 HIGH | Narrative_Bridge | **Completely empty** — no narrative records for any cycle. This tab should be the simulation's storytelling output. |
| 3 | 🟡 MED | Advancement_Intake1 | **Empty** — no advancement records. Either no advancements are pending (normal) or intake pipeline is not being used. |
| 4 | 🟡 MED | Dashboard | **Sports data missing** — A's and Bulls streaks show `--`/`—`, Calendar fields all empty. Sports subsystem appears disconnected. |
| 5 | 🟡 MED | Dashboard | **Shock flag active** (`shock-flag`) but Civic Load shows only `minor-variance` — shock severity not reflected in civic load metric. Possible mismatch between shock detection and civic response. |
| 6 | 🟡 MED | Dashboard | **Chicago vs. Global divergence** — Chicago Sentiment -0.2 (Troubled) while global Economy shows `stable`. City-level distress not propagating to macro indicator. |
| 7 | 🟢 LOW | Election_Log | **Even districts absent** — Districts D2, D4, D6, D8 have no election records. Expected if on a staggered cycle, but should be documented. |
| 8 | 🟢 LOW | Chaos_Cars | **BIZ-xxxxx references undocumented** — Business IDs (BIZ-00010, BIZ-00016) referenced in events but no Business Registry tab exists in this sheet. |
| 9 | 🟢 LOW | Dashboard | **Bonds/Alliances all zeroed** — All bond metrics show `0` or `--`. May be accurate early-state but worth confirming no bond data has been lost. |

---

## Environment Summary

| Environment | Description |
|---|---|
| **Oakland** | Primary city. Positive sentiment (0.8), Thriving mood. Home base for A's, most citizen records. |
| **Chicago** | Secondary city. Negative sentiment (-0.2), Troubled mood. Bulls sports team. Appears less populated in ledger. |
| **GAME clock** | Sport/entertainment character imports (e.g. MLB The Show). High-profile Tier 1 citizens. |
| **LIVE clock** | Standard simulation citizens. Regular civic life participants. |

---

*Map auto-generated by weekly mapping agent. Do not edit manually — changes will be overwritten on next run.*
