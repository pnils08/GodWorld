---
title: Reporter records roster — what each reporter reads today, and the proposed lead and shared records
date: 2026-11-17
lane: engine-sheet
verdict: adopt — the map the reporter template is built from (pipeline.110)
---

# Reporter records roster (2026-11-17)

**Ignited plans:** [[../plans/2026-11-10-role-citizens-wake-as-themselves]] (Task 9, Reporter rulings 2026-11-17).
**Source:** code read 2026-11-17 (slice builders, `newsroom-fanout.js`, `newsroomSourcing.js`, `newsroomWakePackages.js`, `cron-desk-run.js`, `cron-desk-writer.js`, crontab); tab list [[2026-11-15-worker-records-all-tabs]]; workers `scripts/workerWake.js` JOBS.

**Not the plan (builder 2026-11-17: "There is already a plan so idk whats going on"; "Everyone has roles and jobs I already set").** The reporters' order is pipeline.111's (the stop-puppeting plan (deleted 2026-11-18)); its inventory is the record. This page is notes for it.

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
| Luis Navarro | investigations | T | same civic slice as Carmen | yes | what is owed and what was answered — Initiative_Tracker scheduled actions against their due Cycle, the offices' answers to demands (confrontation answers), the workers' reports or their absence (his role: "accountability pressure, records, silence clocks", `.claude/agents/luis-navarro/IDENTITY.md`) | Judicial_Ledger, Civic_Office_Ledger | every worker, whole |
| Jordan Velez (business-desk seat) | business | M | Business_Ledger, Employment_Roster, Business_Archive, Casino_Ledger, City_Treasury, seed/hook decks | yes | Business_Ledger, Employment_Roster, Business_Archive, Casino_Ledger | City_Treasury | Deputy Mayor (Econ), Baylight |
| Dr. Lila Mezran | health | M | Neighborhood_Demographics, Hospital_Ledger, Health_Cause_Queue, Care_Justice_Census, hook deck | yes | Hospital_Ledger, Health_Cause_Queue, Care_Justice_Census (hospital side) | Neighborhood_Demographics | Health Center, EMS, OARI, Medical Examiner |
| Trevor Shimizu | transit | M | Transit_Metrics, Cycle_Weather, Employment_Roster, Business_Ledger, Sports_Feed, LifeHistory_Log, decks | yes | Transit_Metrics | Cycle_Weather, Oakland_Sports_Feed | Transit Hub |
| Anthony Raines | A's analytics | M | Sports_Feed (this + 2 prior Cycles), world summary sports, player mirror | yes | Oakland_Sports_Feed (A's); the truesource cards (builder 2026-11-17: "he also gets truesource cards that Im working on", Drive folder `13Ft4uQxLKiTeymKIKpfeIktfnKmyG0sB`; today he reads the local copy `output/player_truesource_mirror.json`, 29 players, written 2026-09-26 by `scripts/ingestPlayerTrueSource.js` — the new cards reach him when it is refreshed) | As_Roster (not read today) | — |
| Tamsin Pruitt | Lives | M–F | Lived_Events, LifeHistory_Log, Hospital_Ledger, Household_Ledger, Casino_Ledger, decks, page index | yes | LifeHistory_Log (cut open: 2,480 lines at C116); Lived_Events is a local file, `output/beats/Lived_Events.jsonl`, not a sheet tab | Hospital_Ledger, Household_Ledger, Health_Cause_Queue | Medical Examiner |
| Sgt. Rachel Torres | public safety | T | Crime_Metrics, Judicial_Ledger, Care_Justice_Census (judicial), City_Treasury, Employment_Roster, Business_Ledger | yes | Crime_Metrics, Judicial_Ledger, Care_Justice_Census (judicial side) | City_Treasury (fines) | Police Chief, District Attorney, Fire Chief |
| Angela Reyes | schools, youth | T | Neighborhood_Demographics (+prev), hook deck, one Business_Ledger row | yes | the youth lines (ages 5–22) of LifeHistory_Log — Youth_Events is retired by ruling (`phase05-citizens/runYouthEngine.js:104`, S411 2026-09-02); builder 2026-11-17 "yes" | Neighborhood_Demographics (school figures), Initiative_Tracker (apprenticeship), LifeHistory_Log (Tamsin leads adults) | — |
| Selena Grant | Oaks analysis | T | Sports_Feed, seed/hook decks | no | Oaks_Roster (not read today), Oakland_Sports_Feed (Oaks) | NBA_Game_Intake | — |
| Jax Caldera | accountability | W | Civic_Office_Ledger, hook deck, snapshot, desk signal, past coverage | yes | the official story against the record — the workers' and offices' statements, whole, beside the raw tabs they speak for, and the engine's audit (his role: "when the ledger, the audit, and the official story refuse to line up", `.claude/agents/freelance-firebrand/IDENTITY.md`) | any tab a statement speaks for; Neighborhood_Map, Relationship_Bonds | every worker, whole |
| Noah Tan | weather, environment | W | Cycle_Weather, hook deck, world summary | no | Cycle_Weather | Neighborhood_Map | Emergency Management |
| Elliot Marbury | data desk | W | Sports_Feed (this Cycle), player mirror | yes | — | any tab (his beat is checking figures) | — |
| P Slayer | fan heat | W | world summary sports, desk signal, his own past pieces | no | — | Oakland_Sports_Feed | — |
| Tanya Cruz | sideline | W | world summary sports | no | — | Oakland_Sports_Feed | — |
| Ines Sorensen | Voices | W–F, Sa, Su | citizen pages (whole store), covered lists | no | the citizen pages | Reflection_Intake (not read today) | — |
| Elliot Graye | faith | Th | Faith_Organizations, Faith_Ledger, Community_Programs, hook deck | yes | Faith_Organizations, Faith_Ledger | Community_Programs | Deputy Mayor (Community) |
| Simon Leary | sports as civic | Th | Sports_Feed (this + 2 prior), world summary sports | no | — | Oakland_Sports_Feed, Initiative_Tracker (Baylight) | Baylight |
| Hal Richmond | history | Th | world summary sports, his past pieces, player mirror | yes | — | Oakland_Sports_Feed, As_Roster | — |
| Talia Finch | Oaks from the street | Th | Sports_Feed, seed/hook decks | no | — | Oakland_Sports_Feed (Oaks), bars and venues — Business_Ledger (bar / lounge, music venue, nightlife sectors) and the evening phase (corrected 2026-11-17: `Cultural_Ledger` holds 55 cultural figures, no places) | — |
| Mason Ortega | restaurants | F | economic slice, food filter | no | — | Business_Ledger (food), Employment_Roster | Deputy Mayor (Econ) |
| Kai Marston | arts | F | evening texture first, then Cultural_Ledger, decks | no | Cultural_Ledger | Community_Programs; the evening phase (as today) | — |
| Sharon Okafor | behavior, daily life | F | evening texture first, then Cultural_Ledger, hook deck | no | — | Cultural_Ledger, LifeHistory_Log (cut open: 2,480 lines at C116); the evening phase (as today) | — |
| Maria Keen | neighborhood | F | evening texture first, then Community_Programs, Neighborhood_Demographics, Crime_Metrics, Hospital_Ledger, Judicial_Ledger, Care_Justice_Census | no | Neighborhood_Map, Neighborhood_Demographics | Community_Programs, Crime_Metrics, Household_Ledger; the evening phase (as today) | Deputy Mayor (Community) |
| Celeste Tran | trends | F | Cultural_Ledger (+prev), Neighborhood_Demographics, hook deck, 8-Cycle pulse | no | — | Cultural_Ledger, Neighborhood_Demographics, Relationship_Bonds | — |
| Nia Rook | UNDOCKED | daily (episode); Sa digest | the show's local feed, standings, recaps | own tools | the show feed | — | — |

## What the map shows

**Corrected 2026-11-17 after agy's review** (`output/antigravity/2026-11-17-review-reporter-template.md` §3): Talia's venues, the evening phase on Kai / Sharon / Maria, `Lived_Events`; sizes per row are in the review's table.

**The same record, read by role (builder 2026-11-17):** "everty journlist would report differently on that same data given ther role and beat descriptions i set". Lead and shared say whose pack carries a record; they do not split what a reporter may read or say about it. **Tool reach (builder 2026-11-17, "Every record, all of them"):** the pack carries the records a reporter leads, this Cycle; the lookup tool opens every record on the sheet to every reporter. **Calling a worker (builder 2026-11-17):** every reporter can call any of the 14 workers, who answers off their own records (the worker template's question path, `scripts/workerWake.js:545-549`; nothing calls it yet). Packs approved (all 26 rows, 2026-11-17): Carmen, Jordan, Lila, Trevor, Anthony (with the truesource cards), Tamsin, Rachel, Selena (Oaks truesource cards to come — builder: "im working on them today so they will be there just not yet"), Noah, Marbury, P Slayer, Tanya, Ines, Graye, Simon, Hal. **Hal (builder 2026-11-17):** "he is able to speak on historic real world sports comparisons pre 2026 in his articles" — today his slice forbids it (`scripts/buildHalSlice.js:478-479`); it changes when he switches, not before. Talia, Mason, Kai, Sharon, Maria, Celeste, Nia approved. **Mason (builder 2026-11-17):** "yes and making sure it gets all the color we provide, there is an entire nightlife phase that runs" — today he gets none of it: the evening phase (`phase07-evening-media/buildNightLife.js`, `buildEveningFood.js`, `buildEveningFamous.js`, `buildEveningMedia.js`, `cityEveningSystems.js`) lands in Riley_Digest and world summary `## Evening Texture`, read by Maria, Kai and Sharon only (`scripts/cron-desk-run.js:994-1001`); his food read is Business_Ledger only (`scripts/buildEconomicSlice.js:85`). His pack carries the evening output whole. **Nia (builder 2026-11-17):** "she also needs to know the shows rules and what the gameshow is to properly feed this into canon" — today the show's rules reach her only through her bag (`docs/media/NIA_ROOK_UNDOCKED_BAG.md` §What the show is, five lines); the bag is out of the template, so the rules and scoring ride in her pack from `docs/plans/2026-08-07-spacemolt-game-show.md` §3.2 and §Progress scoring review.

1. **Twelve reporters can't open a record at all.** The worker split needs a tool; they have none today.
2. **The no-name read is the old shape** (first 40 rows, no Cycle bound); the named read stops at 12 rows — for the hospital census in one neighborhood that is about one Cycle. The workers' reader (newest first, whole rows, match + Cycles) is the fix the rulings call for.
3. **Worker reports reach two reporters, cut to 240 characters.** Twelve reporters have a worker whose report fits.
4. **Reporters with no records of their own today:** Luis and Jax — ruled from their roles 2026-11-17 (rows above); Angela — the youth lines of LifeHistory_Log (Youth_Events retired by ruling); Marbury (his beat is checking). Like a thin worker, a reporter with no records is a finding about the sim, not the template.
5. **Records nobody reads that fit a beat:** As_Roster, Oaks_Roster, Reflection_Intake, Relationship_Bonds, Neighborhood_Map (tool only), NBA_Game_Intake, WorldEvents_V3_Ledger, Storyline_Ledger, Undocked_Standings (Nia reads a local copy).
6. Carmen's and Luis's slice reads a `Civic_Ledger` tab that is not in the dump (`buildCivicDomainSlice.js:262`); the read comes back empty without error.

## For the builder

Each **Proposed** cell is a judgment about the sim: who leads which record, which worker report fits which beat, and what the four reporters with no records of their own should hold.
