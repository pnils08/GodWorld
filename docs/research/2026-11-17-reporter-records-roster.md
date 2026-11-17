---
title: Reporter records roster — what each reporter reads today, and the proposed lead and shared records
date: 2026-11-17
lane: engine-sheet
verdict: adopt — the map the reporter template is built from (pipeline.110)
---

# Reporter records roster (2026-11-17)

**Ignited plans:** [[../plans/2026-11-10-role-citizens-wake-as-themselves]] (Task 9, Reporter rulings 2026-11-17).
**Source:** code read 2026-11-17 (slice builders, `newsroom-fanout.js`, `newsroomSourcing.js`, `newsroomWakePackages.js`, `cron-desk-run.js`, `cron-desk-writer.js`, crontab); tab list [[2026-11-15-worker-records-all-tabs]]; workers `scripts/workerWake.js` JOBS.

A map. It changes no wake (builder 2026-11-17: "the media has been writing decent so this is a very cautious build in that we dont make them worse"). The **Proposed** columns are for the builder to rule on; everything else is what the code does today.

## How a reporter is fed today

- Morning angle → afternoon quotes → evening write (weekdays 06:15 / 13:15 / 18:15). The day grid is `WEEK_GRID` (`newsroom-fanout.js:49-55`): each seat writes once a week on its day; Tamsin Mon–Fri; Ines Wed–Fri plus her own Sat/Sun crons; Nia daily when UNDOCKED has an episode, weekly digest Saturday.
- The pack is a **beat slice**: a builder per seat reads the local `output/beats/*.jsonl` dump of this Cycle (refuses a dump stamped for another Cycle) and mostly compares with `output/beats/prev/`. So the pack is this Cycle only, already cut to what the builder chose.
- **Tools:** 15 seats have writer tools (`newsroomWakePackages.js:15-18`, 1–8 calls). `sheet_read` reaches 12 tabs live (`cron-desk-writer.js:796-798`): by name it returns the newest 12 matching rows; without a name it returns the **first 40 rows** of the tab with no Cycle bound (`:862`). **12 seats have no tools at all:** Noah, Selena, Talia, Mason, Kai, Sharon, Maria, Ines, Celeste, Simon, Tanya, P Slayer.
- **Worker reports:** only Carmen and Luis receive them (`buildCivicDomainSlice.js:537-551`), and only as a 240-character cut of each statement. No other seat reads one.

## The roster

Days: M T W Th F, Sa Su. "Today" = records the seat's pack reads now. "Proposed lead" = records the reporter would cover whole. "Proposed shared" = records they would pull the part of. "Worker reports" = workers whose weekly report fits the beat.

| Reporter | Beat | Days | Today | Tools | Proposed lead | Proposed shared | Worker reports |
|---|---|---|---|---|---|---|---|
| Carmen Delaine | civic ledger | M | Initiative_Tracker, Civic_Office_Ledger, Election_Log, City_Treasury, Judicial_Ledger, Story_Hook_Deck; worker reports (240 chars) | yes | Initiative_Tracker, Civic_Office_Ledger, Election_Log | City_Treasury | City Manager, Stabilization Fund, Baylight, both Deputy Mayors (whole) |
| Luis Navarro | investigations | T | same civic slice as Carmen | yes | — none of his own | Initiative_Tracker, Judicial_Ledger, Civic_Office_Ledger | every worker (a filed report or its absence is his record) |
| Jordan Velez (business-desk seat) | business | M | Business_Ledger, Employment_Roster, Business_Archive, Casino_Ledger, City_Treasury, seed/hook decks | yes | Business_Ledger, Employment_Roster, Business_Archive, Casino_Ledger | City_Treasury | Deputy Mayor (Econ), Baylight |
| Dr. Lila Mezran | health | M | Neighborhood_Demographics, Hospital_Ledger, Health_Cause_Queue, Care_Justice_Census, hook deck | yes | Hospital_Ledger, Health_Cause_Queue, Care_Justice_Census (hospital side) | Neighborhood_Demographics | Health Center, EMS, OARI, Medical Examiner |
| Trevor Shimizu | transit | M | Transit_Metrics, Cycle_Weather, Employment_Roster, Business_Ledger, Sports_Feed, LifeHistory_Log, decks | yes | Transit_Metrics | Cycle_Weather, Oakland_Sports_Feed | Transit Hub |
| Anthony Raines | A's analytics | M | Sports_Feed (this + 2 prior Cycles), world summary sports, player mirror | yes | Oakland_Sports_Feed (A's) | As_Roster (not read today) | — |
| Tamsin Pruitt | Lives | M–F | Lived_Events, LifeHistory_Log, Hospital_Ledger, Household_Ledger, Casino_Ledger, decks, page index | yes | Lived_Events, LifeHistory_Log | Hospital_Ledger, Household_Ledger, Health_Cause_Queue | Medical Examiner |
| Sgt. Rachel Torres | public safety | T | Crime_Metrics, Judicial_Ledger, Care_Justice_Census (judicial), City_Treasury, Employment_Roster, Business_Ledger | yes | Crime_Metrics, Judicial_Ledger, Care_Justice_Census (judicial side) | City_Treasury (fines) | Police Chief, District Attorney, Fire Chief |
| Angela Reyes | schools, youth | T | Neighborhood_Demographics (+prev), hook deck, one Business_Ledger row | yes | — none of her own (Youth_Events exists, not read: `buildSchoolsSlice.js:20`) | Neighborhood_Demographics, Initiative_Tracker (apprenticeship) | — |
| Selena Grant | Oaks analysis | T | Sports_Feed, seed/hook decks | no | Oaks_Roster (not read today), Oakland_Sports_Feed (Oaks) | NBA_Game_Intake | — |
| Jax Caldera | accountability | W | Civic_Office_Ledger, hook deck, snapshot, desk signal, past coverage | yes | — none of his own | Civic_Office_Ledger, Neighborhood_Map, Relationship_Bonds | every worker (where a report and the records disagree) |
| Noah Tan | weather, environment | W | Cycle_Weather, hook deck, world summary | no | Cycle_Weather | Neighborhood_Map | Emergency Management |
| Elliot Marbury | data desk | W | Sports_Feed (this Cycle), player mirror | yes | — | any tab (his beat is checking figures) | — |
| P Slayer | fan heat | W | world summary sports, desk signal, his own past pieces | no | — | Oakland_Sports_Feed | — |
| Tanya Cruz | sideline | W | world summary sports | no | — | Oakland_Sports_Feed | — |
| Ines Sorensen | Voices | W–F, Sa, Su | citizen pages (whole store), covered lists | no | the citizen pages | Reflection_Intake (not read today) | — |
| Elliot Graye | faith | Th | Faith_Organizations, Faith_Ledger, Community_Programs, hook deck | yes | Faith_Organizations, Faith_Ledger | Community_Programs | Deputy Mayor (Community) |
| Simon Leary | sports as civic | Th | Sports_Feed (this + 2 prior), world summary sports | no | — | Oakland_Sports_Feed, Initiative_Tracker (Baylight) | Baylight |
| Hal Richmond | history | Th | world summary sports, his past pieces, player mirror | yes | — | Oakland_Sports_Feed, As_Roster | — |
| Talia Finch | Oaks from the street | Th | Sports_Feed, seed/hook decks | no | — | Oakland_Sports_Feed (Oaks), Cultural_Ledger (bars, venues) | — |
| Mason Ortega | restaurants | F | economic slice, food filter | no | — | Business_Ledger (food), Employment_Roster | Deputy Mayor (Econ) |
| Kai Marston | arts | F | evening texture first, then Cultural_Ledger, decks | no | Cultural_Ledger | Community_Programs | — |
| Sharon Okafor | behavior, daily life | F | evening texture first, then Cultural_Ledger, hook deck | no | — | Cultural_Ledger, LifeHistory_Log | — |
| Maria Keen | neighborhood | F | evening texture first, then Community_Programs, Neighborhood_Demographics, Crime_Metrics, Hospital_Ledger, Judicial_Ledger, Care_Justice_Census | no | Neighborhood_Map, Neighborhood_Demographics | Community_Programs, Crime_Metrics, Household_Ledger | Deputy Mayor (Community) |
| Celeste Tran | trends | F | Cultural_Ledger (+prev), Neighborhood_Demographics, hook deck, 8-Cycle pulse | no | — | Cultural_Ledger, Neighborhood_Demographics, Relationship_Bonds | — |
| Nia Rook | UNDOCKED | daily (episode); Sa digest | the show's local feed, standings, recaps | own tools | the show feed | — | — |

## What the map shows

1. **Twelve reporters can't open a record at all.** The worker split needs a tool; they have none today.
2. **The no-name read is the old shape** (first 40 rows, no Cycle bound); the named read stops at 12 rows — for the hospital census in one neighborhood that is about one Cycle. The workers' reader (newest first, whole rows, match + Cycles) is the fix the rulings call for.
3. **Worker reports reach two reporters, cut to 240 characters.** Twelve reporters have a worker whose report fits.
4. **Four reporters have no records of their own:** Luis and Jax (their beat is other people's records), Angela (Youth_Events is never read), Marbury (his beat is checking). Like a thin worker, a reporter with no records is a finding about the sim, not the template.
5. **Records nobody reads that fit a beat:** As_Roster, Oaks_Roster, Youth_Events, Reflection_Intake, Relationship_Bonds, Neighborhood_Map (tool only), NBA_Game_Intake, WorldEvents_V3_Ledger, Storyline_Ledger, Undocked_Standings (Nia reads a local copy).
6. Carmen's and Luis's slice reads a `Civic_Ledger` tab that is not in the dump (`buildCivicDomainSlice.js:262`); the read comes back empty without error.

## For the builder

Each **Proposed** cell is a judgment about the sim: who leads which record, which worker report fits which beat, and what the four reporters with no records of their own should hold.
