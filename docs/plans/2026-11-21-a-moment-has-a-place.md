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

**Builder's words (2026-11-21):** "the code shapes everything and AI lives the moment, or chooses what is next" · "instead of making a avatar and running its life sims, im creating agents that are the avatars" · "the sims reflections and wakes are reflected on its life the city view would be them walking to work, to get dinner, visiting a friend, going to the As game. So it would be a second layer to the [cron's] experience on moments it chooses and reflects on it" · "Let's get your notes and plans worked out and we can start to dive into how to implement"

**Builder's words (2026-10-19, engine.214 step 8), still standing:** "the engine firing \"a citizens spot\" makes the cron build on that an allows it to tell us their spot"

**Goal:** every moment the engine writes into a citizen's week names the place it happened — a business, a home, a person — by an id the sheet holds, so the city view can show that citizen going there and the citizen's own wake can build on it.

**Rows:** engine.356 · **Owner:** engine-sheet (engine side). The page's side is research-build's infrastructure.19 and is not built from this row.

## Where it stands (read 2026-11-21)

1. **The citizen's spot exists and is live** (engine.214 Cut C, PROD stage 17). `citizenSpotFor_` (`generateCitizensEvents.js:255`) picks one food / retail / arts business in the citizen's hood by a fixed hash of POPID + BIZ_ID over `S.hoodSpots` (written by Phase5-BusinessDynamics): the same spot every week, moving only when it closes or a better-ranked one opens. It is engine-held, by the builder's 2026-10-19 ruling.
2. **The spot never leaves the cycle.** `S.hoodSpots` and the pick live in memory for one fire. No tab, no beat dump, no page and no wake reads it (grep `hoodSpots|citizenSpot`: `applyBusinessDynamics.js`, `generateCitizensEvents.js`, two test scripts). It reaches a citizen's record only as a line on a week something happened there (`citizenSpotLines_` :270).
3. **Ordinary lines name places the sheet does not hold.** `$VENUE` is filled by `pickVenue_` (:1674) from name tables in code — "a bar patio", "a late-night diner", "Temescal Alley" (:330-352). 8b, which makes `$VENUE` draw the citizen's own spot, is designed and not built (ROLLOUT engine.214 "Next: 8b").
4. **A line carries no place and no time of day.** `LifeHistory_Log`: Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle. `$CONTACT` is a name inside the text. `Reflection_Intake` (the citizen's own words) does carry Daypart.
5. **What the page shows of a person** (world-view/README): the street their week's rows name; up to two spots on that street — their own door (`Household_Ledger`) and the business they work at (`Employment_Roster`); people with a bond stop to talk. "Where a person stands" and "that two of them are standing together" are drawn, not sim data. Streets are separate scenes; nobody walks between them.
6. **Places a citizen already has on the sheet:** work (`Employment_Roster` BIZ_ID), home (`Household_Ledger` HouseholdId), a congregation (`Faith_Organizations` MembersList). Not read today: how each is handed to the citizen's wake.

## Design

- **The split.** The engine holds the facts of where — the spot, the job, the home, the door of a friend — and what happened there. The citizen lives it and says what it was, in its own wake. The page draws the week from the facts. No step here hands a citizen a want, a feeling or a choice (research.35 §Not applicable; SIM_DOCTRINE §18).
- **A place is an id the sheet already holds:** `BIZ_ID`, `HouseholdId`, a POPID for a person met. No parcel is needed to start; when engine.345 lands, a place id resolves to its parcel.
- **Cut 1 — the line names the real spot.** 8b as designed in the engine.214 plan: `$VENUE` draws the citizen's own spot by default. Built under engine.214's own row, before this one.
- **Cut 2 — the line carries its place.** Two columns at the right edge of `LifeHistory_Log`: the place id (spot, employer, home) and the other person's POPID when the line has a `$CONTACT`. Filled by the engine writers that already know them at the moment of writing; blank where a line has no place (an empty relational field is design).
- **Cut 3 — the spot is readable outside the fire.** One row per citizen: their spot this Cycle. Where it lives (a tab, a column, the dump) is settled by Task 1.
- **Then the page** (infrastructure.19, research-build): a person's week on a street is their lines in order, each at its place — own door, work, the spot, a friend's door, the game. The street flight stays the page (the parked "follow one life" redesign is not this).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before. (a) `S.hoodSpots` and `citizenSpotFor_` end to end; what it would take to write the pick out. (b) Every fill site of `$VENUE`, `$CONTACT`, `$INSTITUTION`; a count of C116's lines that name a venue, a contact, a workplace, a home, a game. (c) Wiring card for `LifeHistory_Log`: every writer, every reader by column position — whether two right-edge columns are safe. (d) What a wake is handed about the citizen's places (`lib/wakePerception`, the wake script) and what the question door (engine.338) does with an answer. (e) `Lived_Events`, `output/exchanges/`, game-night lines: the place each already implies. (f) `world-view/build.js`: how a person's street and spots are chosen | es | not started |
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

1. **Does a citizen's own word move their spot?** Today the engine holds it fixed by identity (2026-10-19 ruling: stable, so the cron builds on it). If a citizen says in a wake they have started going somewhere else, does that change the record, or is the spot a fact of their life like their job? — builder.
2. **One spot or several?** Today one, from food / retail / arts. Dinner, a bar and a coffee line could be one place or three. — builder.
3. **Does a line get a time of day?** Reflections carry Daypart; engine lines do not. Ordering a week on the page needs one or it is drawn. — builder; Task 1(b) says how many lines could carry one honestly.
4. **A moment on another street** — the page's call (streets are separate scenes): shown there, or shown as away. — builder, with infrastructure.19.

## Not in this plan

- The complaint list per hood, services funded from the treasury, the needs table (research.34) — on the Watch List; each its own row on the builder's pick.
- Vacancy as the gate on arrival and formation (research.35 finding 1) — engine.345's cut.
- Hours and capacity on a business — no reader yet; revisit when a line needs "closed" or "full" beyond what Cut C already writes.

## Changelog

- 2026-11-21 (engine-sheet) — Created on the builder's word, from research.34 / research.35 and the same-day read of the spot, the line and the page.
