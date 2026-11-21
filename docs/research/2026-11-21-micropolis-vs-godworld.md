---
title: Micropolis (open-source SimCity) vs GodWorld's systems — research
created: 2026-11-21
updated: 2026-11-21
type: research
tags: [research, engine, architecture, active]
sources:
  - "https://github.com/SimHacker/micropolis at c98f6b0 (2026-02-10) — MicropolisCore/src/MicropolisEngine/src: simulate.cpp, scan.cpp, zone.cpp, evaluate.cpp, budget.cpp, traffic.cpp, disasters.cpp, message.cpp (read 2026-11-21; never run)"
  - "Builder ask 2026-11-21: \"im interested in seeing what a working sim uses to operate vs some of the systems we built and look for ways to enhance godworld\""
  - docs/research/2026-08-03-game-environment-review.md — the engine's systems in game vocabulary; this file does not repeat it
  - docs/SIM_DOCTRINE.md §14, §15, §16, §17, §18
  - "GodWorld side read 2026-11-21: phase05-citizens/updateCivicApprovalRatings.js, phase03-population/updateCrimeMetrics.js (header, :1008), phase02-world-state/applyInitiativeImplementationEffects.js :292-327, phase02-world-state/loadNeighborhoodState.js :128, phase01-config/engine94SheetContract.js :82-83 :105, schemas/SCHEMA_HEADERS.md §Neighborhood_Map"
pointers:
  - "[[../plans/BACKLOG]] §Watch List — research.34 (verdict watch; no ROLLOUT row until the builder picks)"
  - "[[index]] — registered same commit"
  - "[[2026-08-03-game-environment-review]] — sibling"
---

# Micropolis (open-source SimCity) vs GodWorld's systems — research

**What this addresses:** how a shipped, working city sim holds itself together — which numbers feed which, on what clock — set against the GodWorld systems that do the same jobs, to find what is worth building here.

**Source and licence.** Micropolis is the original SimCity's own source, released by Electronic Arts under GPL v3 (or later) with added terms: no trademark rights, the SimCity name is not licensed (file headers; `MicropolisPublicNameLicense.md` covers the Micropolis name). Reading it and building our own mechanics from what it teaches is the use here. No Micropolis code is copied into this repo — copied code would carry the GPL. The clone sits in a session scratchpad, not in the tree.

**What Micropolis is, in one paragraph.** A grid of tiles and a dozen derived maps at coarser resolution. No people: population is a count per zone. One loop of 16 phases (`simulate.cpp:122-269`): phase 0 sets three citywide demand valves; phases 1–8 walk the map an eighth at a time, each zone deciding to grow or shrink; phase 9 takes the census, collects tax, scores the city; 10 decays traffic and growth memory and sends advisor messages; 11–15 recompute power, pollution + land value, crime, population density, fire coverage, each on its own slower cadence, then roll for a disaster. Every map is smoothed against its neighbours, so a cause spreads outward a little each pass.

## Extraction

Ordered by how much it would add here. Each: the Micropolis mechanism → what GodWorld has → the candidate. "Not read" marks a GodWorld claim not verified against code today; a read-before owes it.

### 1. The city's complaint list — problems scored from the sim's own numbers, then voted

- **Micropolis** (`evaluate.cpp` `doProblems`, `voteProblems`, `getScore`, `doVotes`). Seven problems, each a severity read straight off the sim: crime average, pollution average, housing cost (land value × 0.7), taxes (rate × 10), traffic average, unemployment (residents per job − 1), fire. A hundred votes are cast, each landing on a problem with chance proportional to its severity; the top four are what the city "is complaining about". The same seven sum into a 0–1000 score with penalties (underfunded services, capped growth, negative demand, unpowered zones, population loss), averaged half-and-half with last period's. Approval is 100 draws against the score.
- **GodWorld.** Seat approval already reads the district's own state — hood sentiment, retail, crime, momentum against the city's middle — plus the week's press (`updateCivicApprovalRatings.js:109-110`, `:147-153`, `:519-527`, `:785-820`). That half is past Micropolis. Absent: any ranked list of *what* a hood or district is unhappy about (no `topProblem` / `topConcern` / complaint ranking in `phase*/` or `utilities/` — grep 2026-11-21). The number moves; nothing says why in a form a seat or a reporter can act on.
- **Candidate.** Per hood, each Cycle: score a fixed set of problems off the hood's own columns relative to the city's middle (§15), and rank them. The voters here are not dice — they are the tracked citizens living there, each weighing the problems by their own dials and the week's events on their row (§18). Output: a short ranked list per hood, with the citizens behind each. Serves the council seats (what to propose for), the desks (what the hood is talking about), and the citizens' own wakes. Not read: what the seat and desk slices are handed today.

### 2. Services cost money, and the money buys effect

- **Micropolis** (`simulate.cpp` `collectTax` :838-882, `updateFundEffects` :894-925; `budget.cpp` `doBudgetNow`). Tax take = population × average land value × rate. Each service has a need (stations × cost; road tiles × cost). When funds are short the order is fixed — roads, then fire, then police get what is left. Effect = full effect × spent ÷ needed. Low road effect and tiles crumble (`doRoad` :1052); the police map that crime is subtracted from shrinks (`scan.cpp` `crimeScan`); the score takes the penalty.
- **GodWorld.** A treasury exists: opening balance, a flat weekly credit that stands in until the first property-tax day (engine.271; `applyInitiativeImplementationEffects.js:321-327`, `engine94SheetContract.js:82-83`), then real revenue; initiatives are appropriated and renewed against it. Police capacity is units × strength (`updateCrimeMetrics.js:1008`; three units a hood, header item 3). Not read: where `strength` comes from. No treasury entry kind for a standing service (entry kinds found: OPENING, PREFUNDED, REVENUE, APPROPRIATION, RENEWAL).
- **Candidate.** Standing service lines on the treasury — police, fire and ambulance, transit, schools — whose funded share scales the capacity those engines already compute. A thin tax year then reaches the street, and a council has something real to trade. Which service is cut first is a sim judgment, and here it can be the seats' vote rather than Micropolis's fixed order.

### 3. The engine computes what the city lacks

- **Micropolis.** `take10Census` (:712-785) sets `needHospital` / `needChurch` from residents against the count that exists; an empty residential zone then becomes one. `setValves` (:657-667) pins a demand valve at zero until the city has what a city that size needs — a stadium for residential, an airport for commercial, a seaport for industrial — and `message.cpp` says so to the player.
- **GodWorld.** Initiatives are proposed by the seats. Not read: whether any per-hood ratio (clinic per residents, school seats per child, transit stops per rider) is computed each Cycle. §16 records the school columns on Neighborhood_Demographics as a one-time backfill no phase moves.
- **Candidate.** A needs table per hood, computed each Cycle from counts the ledgers already hold, read by the seats and the desks. Whether an unmet need drags on the hood (the valve cap) is a second, separate call.

### 4. One set of citywide pressure gauges that every local decision reads

- **Micropolis** (`setValves` :546-670). Three numbers. Jobs per resident drives migration (`migration = residents × (employment − 1)`); residents per job and the internal market drive commerce and industry; a tax table shifts all three. They move as velocities, clamped. Every zone's grow-or-shrink roll adds its valve to a local score (land value less pollution for housing, distance to centre for commerce) — `zone.cpp` `doResidential` :534-600, `evalRes` :722.
- **GodWorld.** Per-hood MigrationFlow, HousingPressure, BoomIndex and TrajectoryMomentum columns exist (SCHEMA_HEADERS §Neighborhood_Map). Not read today: what sets each and whether housing, jobs and retail pressure are derived from the same counts.
- **Candidate.** None claimed. A read-before would say whether GodWorld's pressures already close the loop Micropolis closes with three numbers, or whether they are set apart from each other.

### 5. Place quality as a field

- **Micropolis** (`scan.cpp`). Land value = closeness to the city's centre of mass + natural terrain − pollution, less 20 where crime is high. Crime = (128 − land value) + population density − police coverage. Pollution comes off traffic, industry, power plants and fire, smoothed across neighbours. Housing class (four tiers) is picked by land value less pollution.
- **GodWorld.** No pollution, air or land-value column and no engine code for one (grep: only text lines). NoiseIndex exists. Rent is a rule: RentShare × the hood's MedianIncome ÷ 12 (engine.160, `loadNeighborhoodState.js:128`). Crime is already richer than Micropolis's one formula: three categories, spillover through `Adjacent`, clearance and response capacity, lagged economic stress, patrol strategy (`updateCrimeMetrics.js` header).
- **Candidate.** An environment reading per hood that moves with what is in it — commute load, port and industrial employers, construction — and reaches health and sentiment. **Hazard:** Micropolis's loop prices people by place. §14 rules the other direction — income decides where a household can afford; a hood never sets pay. An environment column must not set income or rent. §15/§17: prosperity-era; no imported decay.

### 6. Not every system runs every tick

- **Micropolis.** The five map scans run every Nth cycle by game speed (`simulate.cpp:124-133`); the census keeps two rolling histories, 10 and 120 periods deep, for the graphs.
- **GodWorld.** Every phase runs every Cycle inside one Apps Script execution; the end-of-run tail has read 38 / 62 / 74 s against a 60 s reserve (ROLLOUT engine.95).
- **Candidate.** Slow fields on a slower clock. **Hazard:** the Cycle is the world's week; a system that skips weeks changes when things become true. An operations idea for the platform ceiling, not a sim idea.

## Not applicable / hazard

- **Micropolis has no people.** Residents are a count; nothing in it serves tiers 1–4. Everything on the Sims side — motives, needs, objects that advertise what they satisfy — is not in this source. The Sims has no open source; its design is public in talks and published design notes (not fetched for this file).
- **Already past Micropolis here, do not re-review:** crime; per-seat approval from district state; the event deck (chaos cars with trauma, weather fronts) against a 1-in-N disaster roll; smoothed sentiment against its half-and-half ramps.
- **Tile mechanics** (power connectivity, road tiles, bridges, fire spread) have no hood-scale counterpart worth carrying.
- **Other open city sims, named so the choice has context (general knowledge, not fetched today):** Citybound (agent-based — households and trips, nearest to tracked citizens), Lincity-NG (explicit pollution, unemployment, tech level), OpenTTD and Simutrans (transport economies), Cytopia. A second read, if wanted, starts with Citybound.

**Verdict:** watch — six mechanisms laid out, three with a candidate grounded in code on both sides (1, 2, 3). A row ignites on the builder's pick; candidate 1 is the recommendation (it uses what the engine already computes and gives the seats and the desks the *why* behind a number).

**Ignited plans:** none.

## Changelog

- 2026-11-21 (engine-sheet) — Created (research.34) on the builder's ask.
