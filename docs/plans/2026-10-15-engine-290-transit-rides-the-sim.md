---
title: engine.290 — Transit Rides the Sim Plan
created: 2026-10-15
updated: 2026-10-15
type: plan
tags: [engine, transit, citizens, active]
sources:
  - output/antigravity/2026-10-14-review-engine290-transit.md — agy adversarial review (rb-verified 2026-10-15 against the code)
  - docs/plans/2026-09-09-transit-hood-alignment-plan.md — engine.183, the causal frame this builds on
  - docs/SIM_DOCTRINE.md §1, §2, §4, §6, §8
  - phase02-world-state/updateTransitMetrics.js (v1.3), utilities/ensureTransitMetrics.js, phase02-world-state/commuteFlowEngine.js, phase04-events/chaosCarsEngine.js, utilities/chaosCarsConfig.js, phase02-world-state/loadEventContentLedger.js, phase05-citizens/generateCitizensEvents.js:2821-2834, phase09-digest/finalizeCycleState.js:173,193, phase01-config/engine94SheetContract.js (World_Config seed table)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.290"
  - "[[../index]] — registered same commit"
---

# engine.290 — Transit Rides the Sim Plan

**Builder's words (2026-10-14):** "tie the transit system to the sim so it peaks and slows with the sim, make sure it is staffed enough with having at least 1 employee as conductor, engineer, etc."

**Builder's words (2026-10-15):** "align the transit system with the sim , same clocks, avoid hard coded math where possible, tie is which hoods are where people work , where the hot spots are , and this is using sim reality not real world. Transit ledgers , hood ledgers , business ledgers , sports feed , etc. to determine ridership , you can have a chaos car that creates off chance transit issues , delays , the ECL ledger to create transit related events . I believe this is just trains not sure buses are involved here ."

**Goal:** The eight BART stations and ten corridors read the sim's own clock, workforce and hot spots for their numbers, feel their own crew, take an off-chance bad week from a chaos car, and put commute events into citizens' lives through the content ledger. Trains only; AC Transit per-line stays held (builder 2026-09-09).

**Rows:** engine.290 · **Owner:** research-build (plan, reviews) → engine-sheet (build, bench, deploy)

## What is true today (rb read 2026-10-15, agy review verified)

- `batchRecordTransitMetrics_` (`utilities/ensureTransitMetrics.js:463-464`) writes `m.onTimePerformance || 0.85` and `m.trafficIndex || 50`. Stations compute `trafficIndex: 0`, corridors `onTimePerformance: 0`; `0` is falsy, so every station row carries TrafficIndex 50 and every corridor row OnTimePerformance 0.85 (272/272 and 340/340 on C78–C111). The single-row writer `recordTransitMetrics_` has the same shape.
- `dayType` rolls its own weekend at `updateTransitMetrics.js:127` (`rng() < 2/7`) while Phase 1 already set `S.isWeekend` (`advanceSimulationCalendar.js:197`). Any holiday collapses to `dayType='holiday'` → ridership ×0.4, traffic ×0.5, regardless of `S.holidayPriority` (major / minor / oakland). `S.holidayNeighborhood`, `S.isFirstFriday`, `S.neighborhoodState`, `S.neighborhoodDynamics`, `S.sportsCity` are unread.
- Base ridership is the authored `OAKLAND_BART_STATIONS[].baseRidership` table ("pre-pandemic reference" — real-world numbers). The sim's own workforce enters only as two multipliers: the station hood's adults ratio and a capped commute-inbound lift (`:376-398`).
- The engine never reads `Employment_Roster.jsonl` (a Node dump). `ctx.ledger` is loaded before Phase 2 (`buildCommuteFlows_` reads it) and carries `RoleType` (col K) and `EmployerBizId` (col AS). BART Oakland Division is `BIZ-00014` (Business_Ledger, Downtown). Active ledger rows at BIZ-00014: a Station Manager and a PR specialist; no conductor, operator, dispatcher or maintenance role exists.
- The engine's own rehiring (`runCareerEngine.js:1752-1757`) writes `RoleType` from `SETTLE_ROLES_BY_FIELD[category]` (`educationCareerEngine.js:893`) — a field-generic title, so it can grow BART's headcount but can only satisfy a named role floor if the transit field table carries those titles.
- Chaos cars run Phase 4 (`godWorldEngine2.js:608`), transit runs Phase 2 (`:585`); a one-cycle lag through `S.previousCycleState` is the established carry (`transitDisrupted` :173, `chaosShip` :193 in `finalizeCycleState.js`). Transit also rolls its own `breakdownRoll = rng() < 0.015` (`updateTransitMetrics.js:~235`).
- Content ledger lines draw only through `Conditions` (`generateCitizensEvents.js:2926-2941`); the four transit-disruption lines are hardcoded at `:2829-2833` under a code gate (`S.transitState.disruptionOngoing && working && chance`). There is no transit field in `CONTENT_LEDGER_DSL_FIELDS`, and no `source:transit` in the whitelist — the lines use `source:occupation`.
- `ctx.rng` is one stream per cycle (`utilities/safeRand.js:28`). Removing or adding draws in Phase 2 shifts every later draw in the cycle.
- Consumers of the sheet columns: `scripts/buildTransitSlice.js` parses with `K.num` (blank → null, and it already guards `!= null`); `dashboard/server.js:1590` uses `parseFloat(...) || 0`; `getTransitStorySignals_` reads the in-memory `S.transitMetrics`, not the sheet. A blank N/A cell breaks nothing.

## Design

Seven moves, all inside existing files. No new phase file. Every new number is a World_Config dial seeded through `engine94SheetContract.js` with a default; the code reads `ctx.config.<key>` and falls back to the default when the row is absent.

1. **Write boundary** — a station row writes OTP and a blank TrafficIndex; a corridor row writes TrafficIndex and a blank OTP. Decide by `m.station !== ''`, never by truthiness. Both writers.
2. **Same clocks** — `dayType` = `S.isWeekend ? 'weekend' : 'weekday'`, holiday only when `S.holidayPriority === 'major'` (cut by `transitMajorHolidayMult`); minor/oakland holidays are a Factors tag with no cut. `S.holidayNeighborhood` lifts the station(s) serving that hood and the surface corridor through it (`transitHolidayHoodLift`). `S.isFirstFriday` lifts the stations serving KONO / Uptown / Downtown and Telegraph + Broadway (`transitFirstFridayLift`). The private weekend `rng()` goes.
3. **Ridership from the ledgers** — one dial `transitCityRiders` (default 60,000 = today's table sum) is the only authored magnitude; each station's base is its *share* of it. Share = Σ over the station's served hoods of `w(h) / stationsServing(h)`, where `w(h) = adults(h)` from Neighborhood_Demographics `× (1 + inboundRatio(h))` from `S.commuteInbound` (ledger scale, so a ratio, never a count) `× (1 + retailTerm(h))` from `S.neighborhoodState[h].retailVitality` relative to the city median. The old adults-ratio and inbound multipliers in `calculateStationMetrics_` are deleted (they are the share now, not a second multiplier). Corridors: base = `transitCityTraffic` (default 50) × the corridor's mean `S.neighborhoodDynamics[h].traffic` over its hoods relative to the city mean, × `transitFreewayMult` (default 1.2) when `freeway`. Served-hood names that are child areas (`Coliseum`, `Elmhurst`, `North Oakland`, `Montclair` have no Neighborhood_Demographics row; `Adams Point`, `Piedmont Ave`, `Brooklyn` do) fold to their canon hood through `resolveHoodOrChild_` (`phase01-config/canonNeighborhoodLoader.js:441`) before weighting, so a hood is never counted twice. Crowding comes from the sim too: `S.cityDynamicsCapacity.transitCongestion` (0–0.38, `applyCityDynamics.js:1335`) replaces the `context.events > 2 → −0.03` on-time hardcode as `−transitCongestion × transitCongestionOnTimeMult` (dial, default 0.25). The authored `baseRidership` / `baseTrafficIndex` fields stay in the table as the fallback when a hood has no demographics row, and the Factors string says `base: ledger` or `base: table` so the slice can tell. The first cycle on the new base carries the token `rebased` in every Factors string (detected via `previousCycleState.transitBaseVersion !== 2`) so `buildTransitSlice.js` does not narrate a repair as a ridership event.
4. **The crew is felt** — Phase 2 counts Active `ctx.ledger` rows at BIZ-00014 by role class from `RoleType`: conductor (`/conductor/i`), operator (`/train operator|train engineer|rail operator/i`), dispatcher (`/dispatch/i`), maintenance (`/track|maintenance|systems tech/i`), stationManager (`/station manager/i`). Publishes `S.transitStaffing = { conductor, operator, dispatcher, maintenance, stationManager, total, short: [] }`. Governor, armed by the dial `transitStaffingGovernor` (default **0** until the Intake mints land — see Sequencing): no conductor *and* no operator → OTP −`transitNoCrewOnTimeDrop` (0.10) and ridership ×`transitNoCrewRidershipMult` (0.85); no dispatcher → OTP −`transitNoDispatchOnTimeDrop` (0.05) and the rain/fog penalty doubles; no maintenance → the breakdown chance (now the chaos carry, move 5) doubles. Independently of the governor: a rostered BART crew citizen whose `Status` is a care or custody state this cycle (`judicialLifecycle.js:320` lists `hospitalized / critical / serious-condition / injured / recovering`; the custody value is whatever `judicialCustodyClock_` writes — es reads it; `Retired` is not crew-short, it is not crew) is a *named* cause: Factors `crew short: <Name> (<role>)`, and `S.transitState.disruptionCause` names it when a disruption fires. This is the citizen→infrastructure loop agy asked for, with a real row behind it (doctrine §6).
5. **The chaos train** — one new `VEHICLE_CONFIGS` entry in `utilities/chaosCarsConfig.js`: `bart_train` / "BART train", scopes `['neighborhood','citizen']`, `baseFrequencyWeight` 0.5 (lean negative like the fleet), outcomes: `signal_failure` (medium, Friction, subject, delay 0.06), `stalled_train` (high, Friction, delay 0.10, narrativeSeed), `door_fault_holds_the_line` (low, delay 0.03), `platform_overcrowding` (low, delay 0.02), `medical_hold_on_board` (medium, Friction, delay 0.05 — no death token; the patient is off-camera), `clean_run` (positive, delay 0, weight small). Neighborhood targets are restricted to hoods that have a station (a `hoodFilter` on the vehicle honoured by `pickNeighborhoodTarget_`); the citizen target is a working citizen in a served hood (the commuter whose morning broke) and takes the Friction tag through the existing col-O/LifeHistory path. Each outcome writes `S.chaosTransit = { hood, station, outcome, delay, cycle }`, carried on `previousCycleState.chaosTransit` (finalizeCycleState) and read by Phase 2 next cycle: the station serving that hood takes `−delay` on OTP, Factors names `BART train: stalled train in Fruitvale (last week)`, and the carry replaces transit's private `breakdownRoll` — the dice live in one engine. A `transitChaosWeight` dial scales the vehicle's weight (0 = off).
6. **ECL transit events** — a new conditions-DSL flag `transitdisrupted` in `CONTENT_LEDGER_DSL_FIELDS` (`loadEventContentLedger.js`), evaluated per citizen as `S.transitState.disruptionOngoing && (citizen hood ∈ affectedHoods || affectedHoods is empty)`; `condScopes` carries it. The four hardcoded lines at `generateCitizensEvents.js:2829-2833` move into Event_Content_Ledger rows (`Kind=line`, `PoolKey=occupation.transit`, Tags `source:occupation, transit:disruption`, Conditions `lifestate=working; transitdisrupted`) following the engine.97 Task 4 pattern, plus authored rows for delays, crowding, a conductor's own week (`Conditions: lifestate=working; transitdisrupted` and, for the crew, a `hood`-free occupation line). The chaos carry sets `affectedHoods` to the chaos hood, so a chaos week draws these rows too. The code gate at `:2826` stays as the entry point (it supplies `transitdisrupted`), its inline pool goes.
7. **Hiring plumbing** so the mints and the engine's own hiring land at BART: `data/economic_parameters.json` adds `Train Conductor` (68–98k, median 84k), `Train Operator` (76–112k, median 94k), `Transit Maintenance Technician` (64–96k, median 80k) under Transit & Infrastructure (`Transit Dispatcher` exists at :381); `data/employer_mapping.json` keywordRules and `MINT_KEYWORD_RULES` (`processAdvancementIntake.js:1562+`) add `Train Conductor`, `Train Operator`, `Rail Dispatcher`, `Transit Dispatcher`, `Track Maintenance` → `BIZ-00014` (both lists; `scripts/mintEmployerPick.test.js` fails on drift); `DEMOGRAPHIC_VOICE_ROLES` (`:52-85`) adds `BART Train Conductor`, `BART Train Operator`, `BART Rail Dispatcher`; `SETTLE_ROLES_BY_FIELD['Transit & Infrastructure']` (`educationCareerEngine.js:898`) is bus-shaped today (`Transit Operator Trainee` → `Bus Operator`, `Station Attendant`), so a hire the engine lands at BIZ-00014 would carry a bus title at a rail employer; the smallest fix is an employer-sector check in the settle step that gives a BIZ-00014 hire a train title (`Train Operator Trainee` → `Train Operator`, `Station Attendant` stays). Then BART's hiring windows (Growth_Rate 12.87) can fill the floor without a mint. **No citizen is moved** (builder 2026-10-11).

## Sequencing (the part that can make canon wrong)

- **Governor after mints.** Engine output is canon (doctrine §8). If move 4's governor is armed before any conductor row exists, the next live fire writes "BART on-time fell — no crew" on every station row and Trevor prints it. So `transitStaffingGovernor` ships at 0; es flips it to 1 on PROD the fire *after* the Intake mints land (`node scripts/dumpLedger.js` shows the four BIZ-00014 rows). The *named* crew-short cause (move 4, second half) needs no gate — it only fires on a real row.
- **Mints are the builder's.** Intake rows (`Advancement_Intake1`: First / Middle / Last / RoleType / Tier / ClockMode …) with titles `BART Train Conductor`, `BART Train Operator`, `BART Rail Dispatcher`, `BART Track Maintenance Technician`. Names and whether all four land at once are a §6 morning line; nothing here authors a citizen.
- **Bench.** SANDBOX 1004 is at C112 on stage 4c (= PROD) with the two journalists minted, next fire `&expect=112` (`docs/reference/DEPLOY.md` §Current bench pointer). engine.214's pair is DONE (2026-10-13), so transit can bench on top of 4c; es owns the stage number. Moves 2 and 5 change the Phase 2 rng draw count, so a transit bench is not pairable against a PROD fire row-for-row — compare transit rows and Engine_Errors, not the whole cycle.
- **Rebase cycle.** The first fire on move 3 reads as a city-wide ridership jump in `buildTransitSlice.js` prevBy deltas. The `rebased` Factors token is how the slice knows; es checks the C112 bench slice says so.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Write boundary: `batchRecordTransitMetrics_` + `recordTransitMetrics_` write blank for the N/A column by row kind; `scripts/transitCauses.test.js` asserts a station row's TrafficIndex is `''` and a corridor row's OTP is `''`. | es | not started |
| 2 | Clocks: `dayType` from `S.isWeekend`; holiday cut only on `S.holidayPriority==='major'`; `S.holidayNeighborhood` + `S.isFirstFriday` lifts; private weekend rng removed; dials `transitMajorHolidayMult` 0.4, `transitWeekendMult` 0.6, `transitHolidayHoodLift` 0.25, `transitFirstFridayLift` 0.15 seeded in `engine94SheetContract.js`. Test: a `minor` holiday cycle leaves ridership uncut and tagged; a `major` one cuts. | es | not started |
| 3 | Ridership from the ledgers: station share from demographics adults × commute-inbound ratio × retail term; corridor base from `S.neighborhoodDynamics[h].traffic`; dials `transitCityRiders` 60000, `transitCityTraffic` 50, `transitFreewayMult` 1.2; table values kept as fallback with `base: table` tag; `rebased` token on the first cycle (`previousCycleState.transitBaseVersion`). Test: shares sum to 1; a hood with no demographics row falls back and tags it. **Needs proof first:** the scale of `S.neighborhoodDynamics[h].traffic` (applyCityDynamics.js:43,1847) and whether Neighborhood_Demographics adults are hood-scale counts (Downtown 2286 at C111) — both read by es before cutting. | es | not started |
| 4 | Crew: `S.transitStaffing` from `ctx.ledger` (BIZ-00014, Active, RoleType classes); governor behind `transitStaffingGovernor` 0 with dials `transitNoCrewOnTimeDrop` 0.10, `transitNoCrewRidershipMult` 0.85, `transitNoDispatchOnTimeDrop` 0.05; named `crew short: <Name> (<role>)` cause for a non-Active crew row. Test: a fixture ledger with no crew + governor 1 drops OTP; governor 0 leaves it; a hospitalized conductor names himself in Factors. | es | not started |
| 5 | Chaos train: `bart_train` vehicle with `hoodFilter` (station hoods) and `delay` per outcome; `S.chaosTransit` written in `runChaosEvent_`, carried on `previousCycleState.chaosTransit`, read in Phase 2 (station OTP −delay, Factors names it); `breakdownRoll` deleted; dial `transitChaosWeight` 0.5. `validateAllChaosConfigs_` passes (no death tokens). Test: a carried stalled train lowers Fruitvale's OTP next cycle and names it. | es | not started |
| 6 | ECL: `transitdisrupted` flag in `CONTENT_LEDGER_DSL_FIELDS` + `condScopes`; the four inline lines become Event_Content_Ledger rows (`occupation.transit`, `source:occupation`) plus ≥6 authored rows (delays, crowding, crew's week); inline pool at `generateCitizensEvents.js:2829-2833` removed. Sheet rows are a PROD write — es lands them with the deploy (rows are additive, `Active=no` is the kill switch). Test: loader accepts `transitdisrupted`; a working citizen in an affected hood is eligible, a retiree is not. | es | not started |
| 7 | Hiring plumbing: economic_parameters + employer_mapping + `MINT_KEYWORD_RULES` + `DEMOGRAPHIC_VOICE_ROLES`; settle-step train titles for a BIZ-00014 hire; `scripts/mintEmployerPick.test.js` green. | es | not started |
| 8 | Docs same commit: `docs/engine/EVENT_SYSTEM_MAP.md` (transit + chaos + ECL entries), `docs/engine/ENGINE_COUPLING_MAP.md` §transit, `docs/engine/SHEETS_MANIFEST.md` if a read is new, World_Config dial rows in `docs/reference/DEPLOY.md` or wherever engine94 dials are listed, ROLLOUT engine.290 pointer. | es | not started |
| 9 | Bench on SANDBOX 1004 off stage 4c: C112 + C113 fires, 0 Engine_Errors; station rows blank TrafficIndex, corridor rows blank OTP; dayType equals `S.isWeekend`; Factors carry `base: ledger` and (C112 only) `rebased`; chaos train fires at least once across a longer run or is unit-proven via the carry; slice md reads clean. Then PROD, governor at 0. | es | not started |
| 10 | Morning §6 lines for the builder: the four Intake mints (names), governor arming, BART/AC Transit names (already on the row). | rb | not started |

## Acceptance

1. No Transit_Metrics row carries a value in a column its row kind does not compute — proven by the C112 bench rows and `transitCauses.test.js`.
2. `dayType` never disagrees with `S.isWeekend`; a minor holiday leaves ridership uncut — bench Factors vs the calendar line.
3. Station ridership shares come from demographics + commute + retail with no authored per-station magnitude in the live path; the slice prints `base: ledger` — bench C112.
4. With the governor armed on a bench ledger lacking crew, OTP and ridership fall by the dials and Factors say why; with it off, nothing moves — unit test + one bench fire with the dial flipped.
5. A hospitalized or detained BART crew citizen is named in Factors the cycle it happens — unit test (fixture row) and, when it happens live, the row.
6. A `bart_train` chaos outcome in cycle N lowers the serving station's OTP in cycle N+1 and names itself; `breakdownRoll` is gone — unit test + Chaos_Cars row on the bench.
7. Transit commute lines draw only from Event_Content_Ledger rows under `transitdisrupted`; the inline pool is gone — loader test + a disruption bench cycle's LifeHistory lines.
8. A citizen minted with any of the five BART titles lands at BIZ-00014 — `mintEmployerPick.test.js`.
9. PROD fire with 0 Engine_Errors; governor armed only after the Intake rows exist.

## Reviews reconciled

| Review | Pointer | Disposition |
|---|---|---|
| agy adversarial review 2026-10-14 | `output/antigravity/2026-10-14-review-engine290-transit.md` | reconciled below |
| codex plan review 2026-10-15 | `docs/for-claude-review/2026-10-15-codex-engine290-plan.md` | pending |

### Agreed
- Write coercion at `ensureTransitMetrics.js:463-464` (agy §Verdict 1, §Q1 D) → move 1.
- Private weekend rng, flat holiday cut, `S.holidayNeighborhood` / `S.isFirstFriday` unread (agy §Verdict 4, §Q2 1-2) → move 2.
- `S.neighborhoodState`, `S.neighborhoodDynamics`, commute flows as ridership inputs (agy §Q2 3) → move 3.
- Zero conductors / operators / dispatchers; role floor table; mapping + catalog + Intake sync (agy §Q3 A-C) → moves 4, 7.
- Worker life events as disruption seeds (agy §Q3 D 4) → move 4, named cause.
- Real-world names BART / AC Transit are a builder question, not a finding (agy §Q4) → on the ROLLOUT row since 2026-10-14; §6.

### Needs proof
- agy's staffing magnitudes (OTP 0.85 → 0.70 with no dispatcher; ridership ×0.60 with no crew; crowding penalty ×3) are asserted, not measured → shipped as dials with milder defaults (0.05 / 0.10 / ×0.85); the builder moves them.
- "OTP never experiences genuine collapse" (agy §Verdict 2): the floor is `Math.max(0.6, …)` at `updateTransitMetrics.js:~460`; the chaos train and the governor are what reach it. Whether the floor itself should move is a sim call — held.
- `S.neighborhoodDynamics[h].traffic` scale and Neighborhood_Demographics scale → Task 3 read-before.

### New concepts (held)
- AC Transit dispatcher floor and bus-side staffing (agy §Q3 B rows 6-8) — buses out of scope (builder 2026-10-15 "just trains"; per-line held 2026-09-09).
- Station-level maintenance notes / per-station manager coupling (agy §Q3 D 3) — held; one maintenance class citywide this pass.
- `S.sportsCity` / `S.sportsSeason` as a transit input (agy §Q2 5) — held; game day is already the feed (engine.204/205), and a championship week with no home game is nightlife, not platforms.
- `S.shockFlag` / `cityCapacity` / `dialHoodPressureBar` (agy §Q2 4) — held; no mechanism named.

## Changelog

- 2026-10-15 (rb, own review) — child areas fold through `resolveHoodOrChild_`; `S.cityDynamicsCapacity.transitCongestion` replaces the events>2 on-time hardcode; Status care/custody vocabulary named; the transit settle table is bus-shaped → employer-sector check. agy dispatched a share read-before (`output/antigravity/2026-10-15-engine290-share-readbefore.md`).
- 2026-10-15 (rb) — plan drafted from the agy review and a full read of the transit, commute, chaos, ECL and carry code; codex plan review dispatched; es build after the fold.
