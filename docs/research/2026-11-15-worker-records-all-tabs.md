---
title: Worker records — every tab on the live sheet, read for which worker holds it
created: 2026-11-15
type: research
tags: [civic, workers, data-map, active]
sources:
  - Live sheet read 2026-11-15 after the C116 fire: all 85 tabs (rows, columns, newest Cycle, headers); category columns counted on 16 of them
  - docs/reference/AGENT_BOOT_TEMPLATES.md §3 (the worker template, the police chief as spec), §3.1 (roster)
pointers:
  - "[[2026-11-13-boot-templates-test-runs]] §Worker data map — the 2026-11-14 map this replaces (about 15 tabs)"
  - "[[../reference/AGENT_BOOT_TEMPLATES]] §3 — the template these fills go into"
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110, the job"
---

# Worker records — every tab, read for which worker holds it

**Why:** builder 2026-11-15: "police chief is the template, what they get either has the search review on file or needs one" · "awful review, 83 l3dgers and thats all you got?" · "you showed me 5 things when 1000s of data points are tracked". The 11-14 map named about 15 tabs. This is all 85, read live. Row counts are C116.

**Verdict:** adopt. Which tab is whose is the builder's call; nothing here is built.

## 1. What a worker can be handed, by worker

Counts are rows; "/Cycle" is rows written each Cycle. A tab named under several workers is shared.

| Worker | Records on the sheet | In the chief's fill today |
|---|---|---|
| **Police chief** | `Crime_Metrics` 22 hoods × 13 · `Care_Justice_Census` judicial 336 (48/Cycle: arrests, custody occupancy, exits, by hood) · `Chaos_Cars` cop car 28 (2 at C116) · `City_Treasury` COURT 7, TICKETS 4 · `World_Config` patrol setting · **not in his fill:** `WorldEvents_V3_Ledger` SAFETY 26 · `Texture_Trigger_Log` SAFETY 18 · `Story_Seed_Deck` SAFETY 21 · `Domain_Tracker` CRIME and SAFETY columns, 75 Cycles of history (his own sheet keeps one Cycle) · `Neighborhood_Map` CrimeIndex, NoiseIndex by hood · `Event_Arc_Ledger` SAFETY 2 · `Judicial_Ledger` 0 rows | first five |
| District attorney, two ADAs, public defender and deputy, court liaison, reentry director | `Care_Justice_Census` judicial 336 (custody: opening, closing, beds, transfers, exits) · `City_Treasury` COURT 7 ("cleared charges, fined") · `Judicial_Ledger` 21 columns, 0 rows · nothing on charge, plea, sentence or release for anyone | — |
| EMS director | `Care_Justice_Census` hospital 1,176 (168/Cycle: injury, illness, heat, mental-health crisis, substance treatment, unclassified × hood; beds, transfers, exits) · `Hospital_Ledger` 3 · `Health_Cause_Queue` 3 · `Neighborhood_Demographics.Sick` 22 · `World_Population.illnessRate` · `Chaos_Cars` ambulance 12 · `Event_Arc_Ledger` health-crisis 144 · `WorldEvents_V3_Ledger` HEALTH 18 · `Texture_Trigger_Log` HEALTH 61 · `Domain_Tracker` HEALTH · `World_Config` illness and hospital settings | — |
| Medical examiner | `Citizen_Archive` 59 (people off the ledger, 62 columns incl. `HealthCause`) · `LifeHistory_Log` death rows · `Hospital_Ledger` outcomes · `World_Config.deathRate` · no cause-of-death tab | — | **engine.348 (builder 2026-11-16):** the engine writes no cause of death — `HealthCause` blank on all nine deceased (C106–C114); the only wording is the `[Death]` life line ("passed away peacefully"). On his guarded run he refused to certify a cause on that; true to the sheet. Why, from the code (agy [[../../output/antigravity/2026-11-16-review-death-causes]], checked): all nine died by the age roll (`generationalEventsEngine.js` `checkDeath_`), which writes a generic line and no cause; only a death out of critical care (`processHealthLifecycle_`) carries one ("due to complications from …"). None of the nine was ever named in an edition or article. `Health_Cause_Queue` has had no writer since 2026-09-09 |
| OARI director | `Initiative_Tracker` INIT-002 (48 columns) · `Chaos_Cars` OARI van 18 · `Care_Justice_Census` mental-health crisis 168, substance treatment 168 · `City_Treasury` INIT-002 | — |
| Stabilization Fund director · Deputy Mayor (community development) | INIT-001 · `Household_Ledger` 933 (rent, income, savings, `LastGrantCycle`, `LastGrantInitiativeID`, `LastGrantAmount`) · `City_Treasury` INIT-001 · `Community_Programs` 33 · `Neighborhood_Map` HousingPressure, MedianRent, MigrationFlow, NeighborhoodTrajectory · `Ripple_Ledger` migration 131, trajectory 137, initiative-implementation 95 · `Faith_Organizations` 16, `Faith_Ledger` 250 (community programs 99) · `Youth_Events` 168 (newest C102) | — |
| Health Center director | INIT-005 · `Care_Justice_Census` hospital, his hood's rows · `City_Treasury` INIT-005 · `Neighborhood_Demographics.Sick` | — |
| Transit Hub director | INIT-003 · `Transit_Metrics` 702 (18/Cycle: ridership, on-time, traffic, by station and corridor) · `Chaos_Cars` BART train 3 · `Ripple_Ledger` transit-event 13 · `WorldEvents_V3_Ledger` TRAFFIC 8 · `World_Population.trafficLoad` | — |
| Baylight director | INIT-006 · `Chaos_Cars` cargo ship 1 (target `port`) · `Neighborhood_Map` BoomExposure, BoomIndex | — |
| City Manager | `City_Treasury` 23 (allocation, court, tickets, initiative draws, balance) · `Chaos_Cars` garbage truck 28, street sweeper 13, power-and-gas truck 11 · `WorldEvents_V3_Ledger` INFRASTRUCTURE 25 · `Texture_Trigger_Log` INFRASTRUCTURE 20 · `World_Population` loads (traffic, retail, tourism, nightlife, public spaces), civicLoad · `Riley_Digest` 114 Cycles of the same · `Domain_Tracker` 75 Cycles × 21 domains · `Civic_Sweep_Report` 9 | — |
| Deputy Mayor (economic development) | `Business_Ledger` 283 (sector, staff, salary, revenue, growth) · `Employment_Roster` 971 · `Business_Archive` 2 · `Business_Intake` 103 · `Economic_Parameters` 315 roles (income bands, tax, housing burden) · `Neighborhood_Map` RetailVitality, MedianIncome, IncomeTier, EmployerCharacter, BoomIndex · `Neighborhood_Demographics.Unemployed` · `World_Population` employmentRate, economy · `Chaos_Cars` building inspector 9, mail truck 28 · `Ripple_Ledger` economic-event 62 · `WorldEvents_V3_Ledger` BUSINESS and ECONOMIC 15 · `Casino_Ledger` 224 wagers | — |
| Emergency management director | `Event_Arc_Ledger` crisis 147 (phase, tension, hood; newest C114) · `Cycle_Weather` 41 (type, impact, advisory, alerts, streak) · `World_Population` and `Riley_Digest` shockFlag, patternFlag · `Ripple_Ledger` crisis-event 3 · `WorldEvents_V3_Ledger` ENVIRONMENT and WEATHER 5 | — |
| Fire chief | `Chaos_Cars` fire engine 12 (1 at C116) · no incident tab | — |
| Chief of Staff · communications director · legal counsel | `Civic_Office_Ledger` 39 held offices (approval, faction, executive actions, streaks, scandal fields) · `Initiative_Tracker` 14 × 48 · `Ripple_Ledger` approval-shift 120 · `Civic_Sweep_Report` 9 (scandals, resignations, retirements) · communications also `Edition_Coverage_Ratings` 148 (the paper's rating by domain, the term that moves approval) and `Media_Ledger` 131 | — |
| Ombudsman · police review chair · internal affairs · two deputy chiefs | the deputy chiefs share the chief's records · the other three: nothing of their own (no complaint tab on the sheet; no officer-conduct record) | — |
| Mara Vance (planning; her own cron) | `Transit_Metrics` · `Neighborhood_Map` 22 × 36 · `Household_Ledger` · `Neighborhood_Demographics` 22 × 12 (schools: quality, graduation, college readiness, teacher quality, funding) | — |

**Still nothing for:** fire incidents; charge, plea and sentence; cause of death; permits and zoning; complaints; officer conduct. `Neighborhood_Demographics` school columns have no worker (no education office on the roster).

## 2. Tabs every worker reaches through a tool, not a fill

Citizens and their lives: `Simulation_Ledger` 1,073 × 55 · `LifeHistory_Log` 28,010 (679 advancement, 403 strain, 161 promotion … 93 advancement rows at C116) · `Relationship_Bonds` 722 · `Relationship_Bond_Ledger` 7,234 · `Family_Relationships` 168 · `Heritage_Ledger` 11 · `Generic_Citizens` 409 · `Cultural_Ledger` 53 · `Reflection_Intake` 2,808. The template's citizen tool and sheet tool read these; a worker's fill does not carry them.

## 3. Tabs that are not a worker's records

| Kind | Tabs |
|---|---|
| The paper | `Story_Seed_Deck` 650 · `Story_Hook_Deck` 2,211 · `Storyline_Ledger` 119 · `Media_Ledger` · `Media_Briefing` (C102) · `Press_Drafts` (C86) · `Citizen_Media_Usage` 1,340 · `Citizen_Usage_Intake` · `Media_Intake` · `Bay_Tribune_Oakland` 36 |
| Sports and the show | `Oakland_Sports_Feed` 287 · `As_Roster` 95 · `Oaks_Roster` 13 · `Sports_Calendar` · `NBA_Game_Intake`, `MLB_Game_Intake` (C77) · `Undocked_Feed`, `Undocked_Standings`, `Undocked_Draw` |
| Intake queues | `Intake` · `Advancement_Intake1` · `Business_Intake` |
| Engine plumbing | `Cycle_Seeds` · `_CycleCheckpoint` · `Carry_Forward_Store` · `Engine_Errors` · `Event_Wiring_Ledger` · `Content_Telemetry` · `Event_Content_Ledger` 1,001 · `Cycle_Packet` · `Dashboard` · `Simulation_Calendar` · `World_Config` 253 settings (a worker's own setting is his: the chief's patrol) · `Election_Log` 0 |
| Old or closed | `Chicago_Feed`, `Chicago_Sports_Feed`, `Chicago_Citizens` (C94) · `Story_Seed_Deck_v3_legacy` · `Story_Seed_Deck_Archive` · `LifeHistory_Archive` 19,217 · `Arc_Ledger` (C68) · `World_Drift_Report` (C110) · `WorldEvents_Ledger` 537 (its Domain column is blank on every row; `WorldEvents_V3_Ledger` is the one with domains) |

## 4. Read with care

- `WorldEvents_V3_Ledger.Domain` is written in two cases (HEALTH 10 and Health 8; SAFETY 24 and Safety 2): a filter has to fold case or it drops rows.
- `Event_Arc_Ledger` newest Cycle is 114; `Youth_Events` 102. A fill built on either hands old news unless it prints the Cycle.
- `Crime_Metrics`, `Neighborhood_Map`, `Neighborhood_Demographics` hold one Cycle; history lives in `Domain_Tracker` and `Riley_Digest`.
- `Civic_Office_Ledger` reads 999 rows; 39 are held offices (the rest blank).

## Ignited plans

- [[../plans/2026-11-10-role-citizens-wake-as-themselves]] — worker fills, on the builder's word per worker.
