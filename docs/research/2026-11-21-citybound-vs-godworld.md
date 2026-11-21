---
title: Citybound (agent-based city sim) vs GodWorld's systems — research
created: 2026-11-21
updated: 2026-11-21
type: research
tags: [research, engine, architecture, active]
sources:
  - "https://github.com/citybound/citybound at 817de55 (last commit 2020-11-20) — cb_simulation/src: economy/households/mod.rs, economy/households/household_kinds/{family,grocery_shop}/mod.rs, economy/resources.rs, economy/market/mod.rs, economy/immigration_and_development/mod.rs, land_use/buildings/mod.rs, land_use/zone_planning/mod.rs, land_use/vacant_lots/mod.rs (read 2026-11-21; never run)"
  - "Builder 2026-11-21: \"Yes let's check out city bound\" · on parcels: \"in the sheets the data does all the work but on world-view thier household value would decide what 'parcel' they land on\""
  - docs/research/2026-11-21-micropolis-vs-godworld.md — sibling, same ask
  - docs/plans/2026-11-15-parcels-on-the-ledger.md (engine.345)
  - docs/SIM_DOCTRINE.md §1, §2, §7, §14, §18
  - "GodWorld side read 2026-11-21: phase05-citizens/generateCitizensEvents.js (header), phase05-citizens/maneuverEngine.js (header), the parcels plan's 2026-11-15 ledger read"
pointers:
  - "[[../plans/BACKLOG]] §Watch List — research.35 (verdict watch)"
  - "[[index]] — registered same commit"
  - "[[2026-11-21-micropolis-vs-godworld]] — sibling"
  - "[[../plans/2026-11-15-parcels-on-the-ledger]] — the plan finding 1 speaks to"
---

# Citybound (agent-based city sim) vs GodWorld's systems — research

**What this addresses:** Micropolis has no people. Citybound is the open city sim built from individuals — every household and every business acts on its own — so it is the one to set against GodWorld's citizen and business layers, and against the parcels plan.

**Source and licence.** AGPL v3 (`LICENSE.txt`). Rust. Unfinished: last commit 2020-11-20; half its needs are commented out. Read for its design; nothing copied.

**What Citybound is, in one paragraph.** There is one kind of actor, the *household*, and a family and a business are both one (`economy/households/mod.rs:50`, trait `Household`). A household holds an inventory, has members, publishes *offers*, and occupies one *unit* of a building that stands on a *lot*. Members' needs run down over time; when a member is idle the household ranks that member's worst shortages, asks the market for offers that fix them, picks the best one for the time it costs including the trip, sends the member there, and applies the trade when the trip succeeds. There is no city-level formula for anything: traffic, shop income and who works where fall out of those choices.

## Extraction

### 1. A household lives in a unit, of a building, on a lot — and arrival waits on a vacancy

- **Citybound.** `Building { units, lot, style }`, `Unit(Option<HouseholdID>, UnitType)` — one occupant per unit, typed Dwelling / Retail / Agriculture / Mill / Bakery (`land_use/buildings/mod.rs:25-35`, `:64`). `Lot { area, road_boundaries, zone_configs }` (`land_use/zone_planning/mod.rs:57`). A newcomer of a given kind is first offered a free unit of the matching type (`try_offer_unit`); only if none answers does the developer look for a vacant lot whose width, depth and compactness along a road fit that building style, splitting an oversized lot (`immigration_and_development/mod.rs`; `land_use/vacant_lots/mod.rs:79-126`). A household that ends frees its unit (`on_destroy` → `home.remove_household`). Families and businesses go through the same door.
- **GodWorld.** The parcels plan (engine.345): no `Parcels` tab, no parcel or address on `Business_Ledger` or `Household_Ledger` (read 2026-11-15); the page chooses lots at build time. Design already written: a `Parcels` row per lot with `Kind` and `Units`, `ParcelID` on both ledgers, a household in a building carries its unit.
- **What Citybound adds to that plan.** (a) The same shape, proven: parcel → building → typed units → one occupant, for homes and businesses alike — the plan's "like the business" ruling. (b) **Vacancy as the gate**: formation, a move, a purchase or a business opening takes a free unit of the right kind or does not happen; a dissolution or closing frees one. That turns housing supply into something the engine can run short of, by hood. (c) Lots are born from street frontage, sized for what will stand on them — the plan's "preattach the parcel by size and price".
- **What it does not have.** Value. Citybound hands a newcomer the first unit offered. Matching a household to a parcel by what the household is worth — the builder's 2026-11-21 line — is GodWorld's own, and it runs the §14 direction: the household's money picks the parcel; the parcel never sets the money.

### 2. Every recurring thing a person does is a standing link to a place with hours and room

- **Citybound.** An `Offer` = a deal (what is given, what is taken, how long), opening hours, a maximum number of users, published by a household. A job is one: `Money +50` for 5 hours, 07:00–15:00, five takers (`grocery_shop/mod.rs:46-52`). A shop's goods are one: `Groceries +30, Money −81`, 30 minutes, 07:00–20:00 (`:36-45`). Home is one: sleep. A member keeps the offer it used last for each need (`used_offers`, `member_used_offers` — `households/mod.rs:1008-1017`) and goes back to it first (`find_new_task_for` :265-346); the link drops only when the trip fails or the offer is withdrawn (`on_trip_result` :587-676, `destroy` :184-216). A full or closed offer turns people away and they search again.
- **GodWorld.** A citizen's week is drawn: pools filtered by life-state, weighted by archetype, hood conditions and weather, slotted with venues and named contacts (`generateCitizensEvents.js` header v2.5–v2.9). Employment is a link (EmployerBizId; not re-read today). `Business_Ledger` carries no hours and no capacity (columns per the parcels plan read). A citizen's regular spot is open work (ROLLOUT engine.214 step 8b, "`$VENUE` draws the citizen's spot").
- **Candidate.** A citizen's regular places — work, the shop, the spot, the congregation — as links kept on the row, to businesses that carry hours and room. A closing, a business at capacity or a move then *breaks a habit*, and the break is an event with a cause on both rows (§2, §7). The draw keeps deciding what happens there; the link decides where.
- **Who sets the link (builder 2026-11-21, on this file):** "I'm not running the citizen or households choices in code, the code shapes everything and AI lives the moment, or chooses what is next" · "instead of making a avatar and running its life sims, im creating agents that are the avatars". So the engine's side is the menu and the consequences — what is open, near, has room, and what closed or filled; the choice of place is the citizen's own, made in its wake and recorded. An engine that assigns the regular place is Citybound's design, not this one. A door from a citizen's answer to their record exists (ROLLOUT engine.338, the question rows); not read for this file.

### 3. The trip is part of every choice

- **Citybound.** A deal's worth = the sum over the member's top problems of (how bad × how much this fixes) ÷ (the deal's time + travel time at an assumed speed) — `deal_usefulness` :427-456, `market/mod.rs` `TripCostEstimator::on_distance`. A trip that cannot be routed undoes the deal.
- **GodWorld.** A commute matrix and transit metrics exist (`commuteFlowEngine`, `updateTransitMetrics`). Not read: what, if anything, on a citizen's row moves with their own commute.
- **Candidate.** None claimed until that read.

### 4. Shared and personal inside one household

- **Citybound.** Money and groceries are the household's; sleep and hunger are each member's (`family/mod.rs` `is_shared`). One member earning feeds all; each member's needs still run on their own clock, with a fixed per-person rate between 0.8 and 1.2 seeded off their id (`decay`).
- **GodWorld.** Already here: HouseholdSavings on the household, income and net worth on the citizen (parcels plan ledger read; `maneuverEngine.js` header). Nothing to take.

### 5. A closed loop of businesses, with the outside world as a named party

- **Citybound.** Farms → mill → bakery → grocery → family, each a household buying inputs and selling outputs by offers; a `NeighboringTownTrade` household buys and sells anything, so a missing link starves nobody.
- **GodWorld.** Not read: whether any business buys from another. A ship delay reaches port-dependent businesses (DEPLOY_HISTORY, engine.193 cut 3b).
- **Candidate.** None claimed. Noted for the day business-to-business trade is on the table.

## Not applicable / hazard

- **Needs that decide what a person does.** Citybound's core loop — hunger and tiredness run down, the worst shortage picks the next act — is its engine choosing for the person. Here a citizen's wants are the cron's own (§18: "I have no clue what they see or want"), and the wake was stripped of scripted states the same day this was written (commits `fff60e121`, `07aa45583`: "Stop puppeting them"). A needs meter that tells a citizen what they feel or want is the rejected thing in a new wrapper. What survives is finding 2: facts on the row (where they work, where they shop, what closed), not feelings.
- **Arrivals.** Citybound rolls newcomers on fixed shares with no demand behind them (`immigration_and_development/mod.rs`). GodWorld's intake and migration are past it.
- **Not in Citybound at all:** crime, government, money for services, relationships, life events, age. Nothing to compare.
- **Road geometry, lane traffic, building architecture** — the bulk of its code — have no counterpart at hood scale.

**Verdict:** watch — finding 1 feeds a plan already on the board (engine.345: the unit as the gate, the same door for homes and businesses) and needs no new row; finding 2 is a candidate that ignites on the builder's pick.

**Ignited plans:** none. Speaks to [[../plans/2026-11-15-parcels-on-the-ledger]].

## Changelog

- 2026-11-21 (engine-sheet) — Created (research.35) on the builder's ask.
