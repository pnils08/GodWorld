---
title: A Moment Has a Place Plan
created: 2026-11-21
updated: 2026-11-21
type: plan
tags: [engine, world-view, active, draft]
sources:
  - docs/research/2026-11-21-citybound-vs-godworld.md (research.35) — finding 2, the standing links
  - docs/research/2026-11-21-micropolis-vs-godworld.md (research.34) — the other candidates, not in this plan
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md step 8 — the citizen's spot (Cut C live), 8b `$VENUE` (ready, not built)
  - world-view/README.md §Somewhere to go, §What comes from the sim, §Who a person is on the page
  - phase05-citizens/generateCitizensEvents.js :255-270 (`citizenSpotFor_`, `citizenSpotLines_`), :330-352 (venue name tables), :1039-1057 (`$VENUE` / `$CONTACT` lines), :1674 (`pickVenue_`), :3078-3080
  - schemas/SCHEMA_HEADERS.md §LifeHistory_Log, §Reflection_Intake, §Employment_Roster, §Business_Ledger
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.356"
  - "[[2026-11-15-parcels-on-the-ledger]] — engine.345; a place id becomes a parcel id when it lands"
  - "[[../../world-view/README]] — the page that would read the places"
---

# A Moment Has a Place Plan

**Builder's words (2026-11-21):** "the code shapes everything and AI lives the moment, or chooses what is next" · "instead of making a avatar and running its life sims, im creating agents that are the avatars" · "the sims reflections and wakes are reflected on its life the city view would be them walking to work, to get dinner, visiting a friend, going to the As game. So it would be a second layer to the cribs experience on moments it chooses and reflects on it" ("cribs" read here as the crons') · "Let's get your notes and plans worked out and we can start to dive into how to implement"

**Builder's words (2026-10-19, engine.214 step 8), still standing:** "the engine firing \"a citizens spot\" makes the cron build on that an allows it to tell us their spot"

**Scope today:** the lines the engine writes. The builder's words name "moments it chooses and reflects on" — the citizen's own moments (reflections, wakes, exchanges) are not covered until Open question 1 is answered.

**Goal:** every moment the engine writes into a citizen's week names the place it happened — a business, a home, a person — by an id the sheet holds, so the city view can show that citizen going there and the citizen's own wake can build on it.

**Rows:** engine.356 · **Owner:** engine-sheet (engine side). The page's side is research-build's infrastructure.19 and is not built from this row.

## Where it stands (read 2026-11-21)

1. **The citizen's spot exists and is live** (engine.214 Cut C, PROD stage 17). `citizenSpotFor_` (`generateCitizensEvents.js:255`) picks one food / retail / arts business in the citizen's hood by a fixed hash of POPID + BIZ_ID over `S.hoodSpots` (written by Phase5-BusinessDynamics): the same spot every week, moving only when it closes or a better-ranked one opens. It is engine-held, by the builder's 2026-10-19 ruling.
2. **The spot never leaves the cycle.** `S.hoodSpots` and the pick live in memory for one fire. No tab, no beat dump, no page and no wake reads it (grep `hoodSpots|citizenSpot`: `applyBusinessDynamics.js`, `generateCitizensEvents.js`, two test scripts). It reaches a citizen's record only as a line on a week something happened there (`citizenSpotLines_` :270).
3. **Ordinary lines name places the sheet does not hold.** `$VENUE` is filled by `pickVenue_` (:1674-1678, body read: one draw from `hoodTexturePool_` over the two tables) from name tables in code — "a bar patio", "a late-night diner", "Temescal Alley" (:330-352). 8b, which makes `$VENUE` draw the citizen's own spot, is designed and not built (ROLLOUT engine.214 "Next: 8b").
4. **A line carries no place and no time of day.** `LifeHistory_Log`: Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle. `$CONTACT` is a name inside the text. `Reflection_Intake` (the citizen's own words) does carry Daypart.
5. **What the page shows of a person** (world-view/README): the street their week's rows name; up to two spots on that street — their own door (`Household_Ledger`) and the business they work at (`Employment_Roster`); people with a bond stop to talk. "Where a person stands" and "that two of them are standing together" are drawn, not sim data. Streets are separate scenes; nobody walks between them.
7. **What a week holds, C116 dump (counted 2026-11-21):** 2,480 engine lines for 993 people. By lead tag: Neighborhood 446, Civic Perception 361, Daily 276, Sports 274 (192 people), Personal 246, PrevEvening 114, Media 98, Advancement 93, Work 55, Career 12, Promotion 8, Relationship 8. Lines naming a `Business_Ledger` business: 353 (14%), 287 people — 176 of them Civic Perception and 92 Advancement (Bay Tribune 94, OARI 73, the Temescal clinic 40, the apprenticeship pipeline 40); 20 Daily and 20 Neighborhood. Lines naming another person in full: 1. People with a week and an Active roster job at a ledger business: 576 of 993. The citizen's own words, C115 (the C116 dump predates that week's): 236 rows, 127 people; `Daypart` is mostly a source label — PRESS 163, work 38, CONVO 6, DEBATE 4 — and a time of day (morning / midday / night / nightly) on 25. Saved conversations: one pair a day (`output/exchanges/`, 72 files).
8. **What the page already draws** (world-view/README §Somewhere to go, §People who know each other): a person walks to their own door and to the business they work at when either is on the street they are shown on; people with a bond stop and talk; a saved conversation rides on the tie. All of it "now and then", drawn — none of it because of a line in that person's week. Builder rulings that bind the page: nobody is drawn twice ("How can a citizen exists twice in the same time ?"); the sim holds the tie, not a meeting; a joined residential street is its own job.
9. **The bond ledger does not reach the week** (builder 2026-11-21: "sound the bonds engine isn't resonating in this"; read against the C116 dump the same hour). `Relationship_Bonds`: 722 rows, 689 active — friendship 398, professional 97, family 80, neighbor 73, rivalry 38, alliance 13, tension 12. Touched at C116: 60 (25 created). Active rows not touched since C110 or earlier: 441 of 689 (229 last at C102, 170 at C103 — the seeding). Lines about other people in C116's weeks: 9 — eight plain `Relationship` lines naming nobody ("spent time with a close friend", "felt distant from people around them" ×3, "built a new casual acquaintance") and one `Rivalry` line naming the rival. Mechanism (`runRelationshipEngine.js`): a social line is a 2% base draw per citizen (:442) from a fixed pool (:75-104); the citizen's bonds are read only as three yes/no flags — has a rivalry, an alliance, a mentorship (:491-495) — each adding themed lines to the pool at 0.30–0.35 (:553-561). Friendship, family, neighbor and professional rows — 648 of 722 — add nothing, and no pool line names the person on the bond. A bond that moved leaves no line on either citizen (bondEngine writes the `LifeHistory` cell for family and marriage catches only, :2635, :2840).
10. **What a citizen's wake reads** (builder 2026-11-21: "53 tabs and I'm guessing only handful make it to the sims experience"; counted the same hour). `schemas/SCHEMA_HEADERS.md` lists 71 tabs (the 2026-11-14 page review counted 85 on the live sheet). `lib/wakePerception.js` + `scripts/citizen-wake.js` name 18: Simulation_Ledger, LifeHistory_Log, Reflection_Intake, Relationship_Bonds (`loadBonds` :288 — the wake is told who the citizen is tied to), Relationship_Bond_Ledger, Household_Ledger, Heritage_Ledger, Generic_Citizens and Citizen_Archive (family), Neighborhood_Map (co-residents), Civic_Office_Ledger, Oakland_Sports_Feed, Business_Ledger, Advancement_Intake1, Casino_Ledger, Judicial_Ledger, Hospital_Ledger, Chaos_Cars; plus one paragraph of neighborhood texture from `output/world_state.json`. Named nowhere in either file: Crime_Metrics, Transit_Metrics, Cycle_Weather, Faith_Ledger, Faith_Organizations, Community_Programs, Initiative_Tracker, Cultural_Ledger, Employment_Roster, City_Treasury, Neighborhood_Demographics, WorldEvents_V3_Ledger — those reach a citizen only as a line the engine wrote or through that paragraph. So bonds reach the citizen's own view; what is missing is item 9 — the engine never makes a week out of them.
6. **Places a citizen already has on the sheet:** work (`Employment_Roster` BIZ_ID), home (`Household_Ledger` HouseholdId), a congregation (`Faith_Organizations` MembersList). Not read today: how each is handed to the citizen's wake.

## Order (builder 2026-11-21: asked "Should we do world-view work before the engine work?", then "Ok go ahead" on the page first, taken here)

1. **Page:** what a person does on the street follows what their own week holds, from data the page already reads. No engine change.
2. **Engine, small:** Cut 1 and Cut 3 — lines name the real spot; the spot is readable outside the fire.
3. **Engine, larger:** Cut 2 — ids on every line — only for what the page step shows it cannot source.

## Design

- **The split.** The engine holds the facts of where — the spot, the job, the home, the door of a friend — and what happened there. The citizen lives it and says what it was, in its own wake. The page draws the week from the facts. No step here hands a citizen a want, a feeling or a choice (research.35 §Not applicable; SIM_DOCTRINE §18).
- **A place is an id the sheet already holds:** `BIZ_ID`, `HouseholdId`, a POPID for a person met. No parcel is needed to start; when engine.345 lands, a place id resolves to its parcel.
- **Cut 1 — the line names the real spot.** 8b as designed in the engine.214 plan: `$VENUE` draws the citizen's own spot by default. Built under engine.214's own row, before this one.
- **Cut 2 — the line carries its place.** Two columns at the right edge of `LifeHistory_Log`: the place id (spot, employer, home) and the other person's POPID when the line has a `$CONTACT`. Filled by the engine writers that already know them at the moment of writing; blank where a line has no place (an empty relational field is design).
- **Cut 3 — the spot is readable outside the fire.** One row per citizen: their spot this Cycle. Where it lives (a tab, a column, the dump) is settled by Task 1.
- **Then the page** (infrastructure.19, research-build): it is handed a place id and a met-person id on each line, and each citizen's spot. What it draws from them is the page's design and the builder's, not this plan's. A supermemory recall (2026-11-12) says a "follow one life" redesign of the page was rejected and parked; no record of it is in world-view/README, BACKLOG or ROLLOUT (grep 2026-11-21) — the page work reads that ruling before it designs.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 0 | **The page step** (world-view; infrastructure.19 stays research-build's row — this is one slice of it carried here on the builder's word). A person's moves come from their own week: a work line → their workplace; a sports line → their team's place or the street's game night; a saved conversation → that person; a home line → their own door. The card says which line it was. Someone whose week holds none of these stays as drawn today. Nothing new is invented: no dinner spot until the engine hands one over. Waits on Open question 1 | es | not started |
| 1 | Read-before. (a) `S.hoodSpots` and `citizenSpotFor_` end to end; what it would take to write the pick out. (b) Every fill site of `$VENUE`, `$CONTACT`, `$INSTITUTION`; a count of C116's lines that name a venue, a contact, a workplace, a home, a game. (c) Wiring card for `LifeHistory_Log`: every writer, every reader by column position — whether two right-edge columns are safe; the same for `LifeHistory_Archive`, where the rows move; and the cost of two more cells on every line against the end-of-run tail (74 s at C116 against the 60 s reserve, ROLLOUT engine.95). (d) What a wake is handed about the citizen's places (`lib/wakePerception`, the wake script) and what the question door (engine.338) does with an answer. (e) `Lived_Events`, `output/exchanges/`, game-night lines: the place each already implies. (f) `world-view/build.js`: how a person's street and spots are chosen | es | not started |
| 2 | The builder's calls (§Open questions), put to him with the Task 1 numbers | builder | waits on 1 |
| 3 | Cut 1 = engine.214 8b, on its own row | es | waits on 1 |
| 4 | Cut 2: place id and met-person id on the line | es | waits on 1, 2 |
| 5 | Cut 3: the spot readable outside the fire, in the beat dump | es | waits on 1, 2 |
| 6 | Advisor, one external review of this plan after Task 1 folds in; diff review per cut; sandbox proof (rows read off the bench: lines with a place, each id resolving to a live row); PROD | es | not started |
| 7 | The page reads the places | rb (infrastructure.19) | its own row; needs 4 and 5 |

## Acceptance

1. A C-next line that names a venue names a business on `Business_Ledger`, and its row carries that `BIZ_ID`.
2. A line with a contact carries the contact's POPID, and that POPID is a live row.
3. Every citizen with a spot has it in the dump for the Cycle; the engine's pick and the dump agree for every POPID.
4. No line, column or dump field written here says what a citizen wants or feels.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

## Open questions

1. **Which moments?** The plan as written covers the engine's lines only. The citizen's own moments — what it said in a wake, a reflection, a conversation with another citizen — carry a time of day but no place. Engine lines only, the citizen's own moments too, or both from the start? Giving its own words a place means reading a place out of what it wrote, or asking it. — builder.
2. **Does a citizen's own word move their spot?** Today the engine holds it fixed by identity (2026-10-19 ruling: stable, so the cron builds on it). If a citizen says in a wake they have started going somewhere else, does that change the record, or is the spot a fact of their life like their job? — builder.
3. **One spot or several?** Today one, from food / retail / arts. Dinner, a bar and a coffee line could be one place or three. — builder.
4. **Does a line get a time of day?** Reflections carry Daypart; engine lines do not. Ordering a week on the page needs one or it is drawn. — builder; Task 1(b) says how many lines could carry one honestly.
5. **The bond in the week** (§Where it stands 9). Which of these, and at what rate, is the sim's call: a line about a friend names the friend on the bond ledger; a bond that moved writes a line on both people; the 441 untouched active bonds get a week now and then. SIM_DOCTRINE §7 ("Bonds cause; events record") is the standing rule. Its own cut, or its own row. — builder.
6. **A moment on another street** — the page's call (streets are separate scenes): shown there, or shown as away. — builder, with infrastructure.19.

## Rulings

- **The page shows what the week holds, not a routine** (builder 2026-11-21, "Sounds good", on: a person with a work line goes to work; a person with a job and no work line stays as drawn today).

## Not in this plan

- The complaint list per hood, services funded from the treasury, the needs table (research.34) — on the Watch List; each its own row on the builder's pick.
- Vacancy as the gate on arrival and formation (research.35 finding 1) — engine.345's cut.
- Hours and capacity on a business — no reader yet; revisit when a line needs "closed" or "full" beyond what Cut C already writes.

## Changelog

- 2026-11-21 (engine-sheet) — Created on the builder's word, from research.34 / research.35 and the same-day read of the spot, the line and the page.
- 2026-11-21 (engine-sheet) — **LIVE PROD stage 68, @203: bond lines on the log.** §Where it stands 9 was wrong in part and is corrected here: bond changes do write named lines — into the citizen's `LifeHistory` cell (`appendBondLifeLine_`; ledger snapshot C114 20 people, C115 10, C116 31) — and this session counted LifeHistory_Log, where none of them land. The cut: the same line also goes on LifeHistory_Log with `source:bond` and the other person as `contactPopId`. Bench @228 C117: 62 cell lines = 62 log rows. What item 9 still says truly: the relationship engine's own social lines are a 2% draw from a fixed pool that names nobody, and 441 of 689 active bonds have not moved since C110 — the builder's call.
- 2026-11-21 (engine-sheet) — **LIVE PROD stage 67, @202** on the builder's word ("We can raise the odds a notch and push"): going-out weights 2.0 / 1.2 × out-and-about / 1.6; re-benched @227, C118 30 of 1,008 with a named line, two of them out (Harry Hayward at KONO Kitchen, Yasmin Robinson saw Marcus Duval). The notch did not move the count: who can go is a resident of the place's hood (12–23 tracked people in three of the hoods) or the top out-and-about band — eligibility, not weight, is the limit; widening it is the builder's call. First named lines on live: C118.
- 2026-11-21 (engine-sheet) — **Built and benched, not live: the evening reaches the week** (builder: "Who watched the top shows this week, who ate at the trending restaurants" · "Let me know when you're going to act on what I'm saying"). `a15dbb895`: the evening snapshot carries the night's restaurants, night spots, programmes, films and sightings; the last-night pool writes named lines for the people who were there, each out line tagged `nh:` and `biz:` (this is Cut 2's place id, for this one pool). Bench SANDBOX 1004 @225, C117 + C118 PASS: 28 of 1,019 people with a named line at C118 — 26 a programme or the sports show, 1 dinner, 1 the bar, 0 sightings (DEPLOY_HISTORY §Current sandbox). The rates (weights 1.3 home hood, 0.8 × out-and-about across town, 1.1 a sighting, 0.6 a programme) and the three dial directions are set from the pool's own siblings and are the builder's to change. PROD push stopped by the session's permission gate; waits on the builder's go. Not in the cut: the game itself; the five hearsay kinds still dropped at the admission gate (famous, food trend, streaming trend, sports talk, a city event heard about).
- 2026-11-21 (engine-sheet) — The builder's read on bonds checked against the C116 dump and the relationship engine (§Where it stands 9, Open question 5); his page ruling recorded.
- 2026-11-21 (engine-sheet) — Page step first, on the builder's word; Task 0 added; the C116 week counted (§Where it stands 7–8).
- 2026-11-21 (engine-sheet) — Advisor fold: scope stated against the builder's words and made Open question 1; his quote restored verbatim; `pickVenue_` body read; the page paragraph cut to what the engine hands it; Task 1(c) carries the archive tab and the run-time cost.
