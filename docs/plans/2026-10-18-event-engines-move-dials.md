---
title: Event Engines Move Dials — review and repair Plan
created: 2026-10-18
updated: 2026-10-18
type: plan
tags: [engine, citizens, dials, events, draft]
sources:
  - builder 2026-10-18 (verbatim below)
  - docs/SIM_DOCTRINE.md §1–§3, §7, §15–§17
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md (the ruled die pattern; Tasks 3/4/5/7/11 not started)
  - docs/plans/2026-09-10-inactivity-is-regression.md §Dial read 2026-10-17, §Builder rulings 2026-10-17
  - utilities/citizenDialMap.js (ruling 1b — plain-day tags map to {})
  - output/engine201/measure-c121-all.json (bench C107–C121 tag counts)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.299"
---

# Event Engines Move Dials — review and repair Plan

**Builder's words (2026-10-18, verbatim):** "In some of the work lately it's been turning up some of the hardcoded event code engines are send real world Oakland hardship and throwing events that don't move a life , like a divorce or promotion, we have moved away from events for color and events like those actually change a citizen now. There are a lot of these engines in the code base through the phases and feel like starting to fix the offenders is some good overnight work you can do . You can use wire cards , codex and agy, once rb finishes up it current work it can help too. Come up with a plan to address this review and repairs , use a plan template.md, things to consider when applying a fix, the reality of the sim, other ledgers the events could pull from to add depth , aligning Events that will move the 9 dials state, the rare big event , the often everyday events , events that fire if they have debt at a certain level , a certain tier , net worth , creating differences in citizens based on Their differences. If this makes sense you can get started and set your hourly wakes to keep on the plan , follow my doctrines and avoid basing this off real world Oakland , only use the land mass and landmarks"

**Builder's correction (2026-10-18, verbatim, minutes later):** "I did not say events should move a life , I never said that I said move a dial, this whole review is garbage already"

**Builder's second correction (2026-10-18, verbatim):** "Every event that always exists dms move a dial so it's not something complicated and if you don't understand what I mean this is useless just quit"

**Builder's third correction (2026-10-18, verbatim):** "What I'm saying is not event would have a divorce or a promotion , that happens somewhere else not as a color event , this is a waste of time you aren't following what I said at all"

**Builder's fourth (2026-10-18, verbatim):** "So you missed the entire point and 80% of what the ask was and god knows what stupid shit you wrote up"

**What the ask is (es, read against every word above):** rebuild how the hardcoded event engines *generate* a citizen's events. Today they deal one hood-flavored deck to everyone and most of what they deal moves nothing. They should read the citizen's own row and the ledgers around them — debt level, tier, net worth, hood, employer, household, bonds, health, the law — and throw events that move the nine dials: everyday ones small and often, big ones rare, with a citizen's differences making their events different. Big life events (a divorce, a promotion) are not this layer's business; they happen in their owning engines. Nothing in it reads real-world Oakland; the map is the land mass and the landmarks.

**Goal:** the seven everyday engines generate each citizen's week from their reality and move their dials by it.

**Rows:** engine.299 · **Owner:** engine-sheet

## What is wrong today (live C111, read 2026-10-18)

- 2,771 lines fired on 1,001 citizens; ≈2,400 (87%) carry a tag that maps to `{}` in `utilities/citizenDialMap.js` — Neighborhood 702, Civic Perception 321, Daily 435, PrevEvening 182, Personal 254, Sports 146, Background 74, Lifestyle 76, Micro-Event 74, Undocked-Audience 63, Holiday 28. 20 tags are inert by design (ruling 1b, 2026-09-13). 63.6% of the ledger sits all-neutral.
- The everyday engines read no money column. `runNeighborhoodEngine`, `runHouseholdEngine`, `runRelationshipEngine`, `runEducationEngine`, `runYouthEngine`, `generateGenericCitizenMicroEvent`, `generateCitizensEvents`: DebtLevel 0×, NetWorth 0×, Income 0× (grep 2026-10-18). They key on Tier and the dial bands — the same deck for a citizen at DebtLevel 6 and one sitting on a paid-off house.
- The deck is hood-flavored text, not a reading of the hood: `hoodTexturePool_` picks a label pool by Neighborhood_Map.EmployerCharacter and the line says "noticed the creative energy shifting in Temescal" whether Temescal is growing or decaying this Cycle.
- Real-world Oakland premises on the path: `migrationTrackingEngine.js` is built on a displacement/gentrification model ("Week 4 Gentrification & Migration Tracking", DisplacementRisk 0–10, "priced out"); `ensureCrimeMetrics.js` profiles carry the inherited crime ranking (engine.237 memory); ECL rows 130 ("priced out"), 219 ("Mandela Parkway encampment site"), 532 (pothole) read the real city.

## The design — the builder's six considerations

### 1. The reality of the sim
A citizen's week is a reading of their row and what the ledgers say happened around them this Cycle — not a draw from a deck. The engine assembles, per citizen, the facts that are true of them right now and throws an event *about one of those facts*.

| Fact about the citizen | Where it is read | What it throws (dial) |
|---|---|---|
| Money: DebtLevel, NetWorth vs the hood's MedianIncome, SavingsRate, WealthLevel, `DialState.debtDefault` | Simulation_Ledger AE/AC/AD/Z, Neighborhood_Map | money-tight / comfortable / stretched weeks → composure, outabout, drive |
| Work: the employer's week | EmployerBizId → Business_Ledger (revenue drift, closure risk, hiring), Employment_Roster | a good/bad week at work → drive, composure (never the promotion/layoff — engine.286 owns those) |
| Household: spouse, children, HouseholdId | Household_Ledger, Family_Relationships, ChildrenIds, Youth_Events | the household's week → family, warmth |
| Bonds | Relationship_Bonds / Bond_Ledger (strength, last contact, rivalry) | a bond warming or cooling → sociability, warmth (`ConnectionWithdrawn/Maintained` already exist) |
| Hood: trend, momentum, pressure, the initiative in it | S.neighborhoodState, Neighborhood_Map (IncomeTier, BoomIndex, Adjacent, ChildAreas), Initiative_Tracker, Transit_Metrics | the block this week → outabout, sociability, composure |
| Health | Status, StatusStartCycle, Hospital/Health_Cause_Queue; `hoodhospital` | a scare, a recovery, a neighbor in the hospital → composure, outabout |
| The law | Judicial_Ledger (`charged`, `hoodcharged`), Chaos_Cars | a charge near them, a chaos car on their street → composure, integrity |
| Faith, culture | Faith_Organizations (membership), Cultural_Ledger | a service, a show → integrity, warmth, openness |
| Sports | Sports_Feed, `DialState.fan` | their team's week → fandom |
| Weather, season, holiday | S.weather, Simulation_Calendar | → outabout |

### 2. Other ledgers for depth
Every row in the table above names a ledger the engine reads before it writes. A line names what the ledger says — the employer by name, the bond by name, the hood by its trend — never an invented crowd. Facts gate; color is the wording (§13).

### 3. Aligned to the nine dials
Every event maps to a dial and a sign. The sign comes from the fact's direction (the business lost money → down; the bond warmed → up; the hood is growing → up). The tag the row keeps carries kind, direction and band — `<Kind>-<Up|Down>-<S|M|L>` — because Phase 9 folds the cell's tag, not the log's (codex 2026-10-17 hunt 1a); `DIAL_MAP` maps every one of them to deltas and no tag maps to `{}`. Sign skews up and the heavier event is rarer at every aura (builder 2026-10-10, standing rule for every kind added).

### 4. The rare big event, the often everyday event
S: most citizens most weeks, ±1, the texture of a life. M: rarer, ±2–3, a two-Cycle hold where the kind supports it. L: rare, ±4–5, the lottery grabs two (§10) — a citywide handful a Cycle. Band odds and deltas are World_Config keys (rate and severity ARE the dials, 2026-09-22); no cap, no quota (§1). Proposed numbers in §Rates for the builder.

### 5. Events that fire on debt, tier, net worth
Eligibility is the row. DebtLevel ≥ 4 opens the money-pressure family and its odds rise with the level (at 6 the default already exists, engine.276); NetWorth above the hood median opens the comfortable family; a stretched mortgage (engine.286 "over half") opens the stretched one. Tier sets the stage — Tier 1–2 events carry the media-scale wording and reach, Tier 4 the everyday scale. The one predicate is `CONTENT_LEDGER_DSL_FIELDS` (wealth, tier, hood, hoodtrend, defaulted, charged, bereaved, married, children, age… already there) plus `debt` and `networth`; the hardcoded pools route through the same predicate as the ECL rows.

### 6. Differences in citizens from their differences
Two citizens in the same hood with different rows draw different events. The fixture that proves it: same hood, one at DebtLevel 5 / NetWorth under the median / Tier 4, one at DebtLevel 0 / NetWorth over / Tier 2 — the same Cycle gives them different families, different signs, different reach.

### The map
Hood character comes from Neighborhood_Map and INSTITUTIONS §Neighborhoods; places are the land mass and the landmarks (the lake, the estuary, the hills, the port, the square, the parkway). No displacement, gentrification, blight, encampment, crime-ranking or "priced out" premise anywhere on the path.

## Tasks (overnight order — biggest offender first)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Wiring cards** for `runNeighborhoodEngine_`, `generateCitizensEvents_`, `runHouseholdEngine_`, `runRelationshipEngine_`, `runEducationEngine_`, `generateGenericCitizenMicroEvents_`, `runYouthEngine_` and the fold (`nudgesForEvent_` / `DIAL_MAP` consumers); `scripts/deadBranchScan.js` on live. | es + wiring agent | in progress |
| 2 | **The citizen-fact reader** — one pure function the seven engines share: given a row + ctx, returns the facts in §1 with direction (money, work, household, bonds, hood, health, law, faith/culture, sports, weather). Reads only; unit-tested against fixture rows; FIX-don't-ADD: lives in `citizenContextBuilder.js` beside `deriveLifeState_` / `isEventEligible_` (engine.286 Task 3's contract). | es | not started |
| 3 | **No inert tag.** `DIAL_MAP`: every `{}` kind becomes a graded family with deltas; `TAG_REGISTRY.md` + `EVENT_SYSTEM_MAP.md` §2 same commit; test: every key resolves to ≥1 dial or is STRUCTURAL. | es | not started |
| 4 | **Neighborhood (702 lines).** `runNeighborhoodEngine.js` + the `neighborhood/communityLife/nbhdState` pools: the event is about the hood's trend and the citizen's standing in it (fact reader); both directions; graded tag; row-gated; ECL families per direction/band. codex diff → bench 1004 → PROD. | es → codex | not started |
| 5 | **Household / familyLife (222) + Relationship.** The household's week from Household_Ledger / bonds / children; graded; row-gated. | es → codex | not started |
| 6 | **Civic Perception (321) + PrevEvening (182) + Personal (254).** civicNews about the initiative/office in *their* hood with the outcome's sign; prevEvening from the evening's own result; Personal from a fact, or not thrown. | es → codex | not started |
| 7 | **Money family.** DebtLevel / NetWorth / stretched-mortgage events (composure, outabout, drive) through the fact reader; ECL families money-tight / comfortable / stretched; `debt`, `networth` DSL fields. | es → codex | not started |
| 8 | **Work week, health, law, faith/culture, sports (fandom), weather** — the remaining facts, each a small family; Sports moves fandom by result and team followed. | es → codex | not started |
| 9 | **Real-Oakland premise sweep.** `migrationTrackingEngine.js` premise (displacement model) — re-source the intra-city move to income-fit (§14) and cut the displacement framing; `ensureCrimeMetrics.js` profiles trued to INSTITUTIONS; ECL rows 130, 219, 532 and any pool text; agy adversarial read. | es + agy | not started |
| 10 | **Rates table** (§Rates) for the builder: per family, S/M/L odds and deltas as World_Config keys with the live range each reads. | es → builder | not started |
| 11 | **Prove it.** Fixture pair (§6) through the real entry points; bench 1004 fire from live-synced C112: zero lines mapping to `{}`, both directions per family, S > M > L; C113 live readback (Sun 2026-10-25). | es | not started |
| 12 | engine.286 Tasks 3/4/5/7/11 are this work; that plan's rows point here. | es | not started |

## Rates (proposed for the builder's ruling — engineering proceeds on World_Config keys, numbers are his)

| Family | S odds / Cycle per eligible citizen | M | L | S / M / L deltas |
|---|---|---|---|---|
| hood (outabout, sociability) | .35 | .06 | .01 | ±1 / ±2 / ±4 |
| household (family, warmth) | .30 | .05 | .01 | ±1 / ±2 / ±4 |
| money (composure, outabout, drive) — opens at DebtLevel ≥ 4 or NetWorth over median | .25, rising .05 per debt level | .05 | .01 | ±1 / ±3 / ±5 |
| work week (drive, composure) | .30 | .05 | — (L is engine.286's) | ±1 / ±2 |
| bonds (sociability, warmth) | .25 | .04 | .005 | ±1 / ±2 / ±4 |
| health / law / chaos (composure, integrity) — opens on a fact | .15 | .04 | .01 | ±1 / ±3 / ±5 |
| faith / culture (integrity, warmth, openness) — opens on membership / a show | .20 | .03 | — | ±1 / ±2 |
| sports (fandom) — opens on a game week | .40 | .05 | .01 | ±1 / ±2 / ±4 |

Sign skews up (≈ .6 / .4) except where the fact's direction is known, which decides it.

## Acceptance

1. A bench fire on live-synced state produces zero event lines whose tag maps to `{}` — C112 bench fire + a tag→delta check over LifeHistory_Log.
2. Every family shows both directions in one bench fire, S > M > L.
3. The fixture pair (§6) draws different families, signs and reach through the real entry points.
4. The premise sweep list closes to zero, agy's read agrees.
5. All-neutral share falls from 63.6% at the C113 live readback — reported, not targeted (§1).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

## Changelog

- 2026-10-18 (engine-sheet) — Created with the builder's verbatim and his correction; audit and tasks follow.
