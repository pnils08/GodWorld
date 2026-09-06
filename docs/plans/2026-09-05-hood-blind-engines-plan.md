---
title: Hood-Blind Engines — One Source for Neighborhoods Plan
created: 2026-09-05
updated: 2026-09-05
type: plan
tags: [engine, neighborhoods, truth-source, engine.148, in-progress, phases-1-3-live]
sources:
  - docs/research/2026-09-05-hood-blind-engines.md — research basis (data pull, literal classification, builder rulings)
  - docs/adr/0016-data-ledgers-are-the-truth-source.md; docs/adr/0015-world-config-tunable-values.md
  - scripts/fixtures/hood-geography.json — the authored WeatherZone / Adjacent / AttentionWeight source (66 cells)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.148 row (state lives there)"
  - "[[../research/2026-09-05-hood-blind-engines]] — Research basis"
  - "[[../reference/DEPLOY_HISTORY]] — PROD @54 (P1), @55 (P2)"
---

# Hood-Blind Engines — One Source for Neighborhoods Plan

**Goal:** Changing a neighborhood's facts is a cell edit on Neighborhood_Map (or World_Config), never a code edit, and no engine can be blind to a hood that is on the map.

**Architecture:** Neighborhood_Map stays the one hood truth (ADR-0016). Per-hood *facts* become columns (geography: `ChildAreas`, `WeatherZone`, `Adjacent`; one shared knob: `AttentionWeight`); city-wide *dials* go to World_Config (ADR-0015); *formulas* and what a label means stay in code. The Phase-1 loader seeds everything once per cycle; accessors fail loud on a blank or missing cell; no `|| default` survives.

**Research basis:** [[../research/2026-09-05-hood-blind-engines]] — ten hoods held 0–7 citizens because the door from the Generic_Citizens waiting room into the ledger was a 6% lottery that only fired where tracked citizens already lived; 26 keyed hood tables (three classes) left ten hoods invisible or defaulted.

**Terminal:** engine/sheet

**Builder rulings (2026-09-05):** hood untangling is a *project* (overrides ADR-0015 §2 migrate-on-touch for the hood domain); "gifted" emergence = a **migration event**, because the earned drip cannot fill ten hoods (supersedes the engine.58 tick gate for under-floor hoods only).

**The column rule (standing):** a geography fact gets a column; a mechanic knob gets at most one shared label many readers interpret (`EmployerCharacter`, `AttentionWeight`); a formula stays in code. Never one column per reader.

## Phases

| Phase | What | State |
|---|---|---|
| 0 | Measure: named-local-citizens per story per hood (coverage ≠ headcount); diff the thirteen 12-key literals (three classes, not one) | done S423 |
| 1 | Doors: World_Config `hoodCitizenFloor` 12 / `hoodFloorPromotePerCycle` 6 / `hoodFloorSurfaceQuota` 20 / `gcSurfaceChance` 0.06 (self-armed); lazy tracked headcount per hood; feeder weights from CoreSimRank × deficit; surfacing floor draw; **migration wave** in `checkForPromotions_` | **LIVE PROD @54** (`9dcc2a78`; bench C106/C107) |
| 1c | Sex balance (builder-ruled): feeder floors on World_Config F 120 / M 40, full-cap refill while under floor, wave draws the under-represented sex first, one-cycle seasoning | **LIVE PROD @56** (`e30021f6`–`9acb6065`; bench C109–C111) |
| 2 | Tables: `WeatherZone` (10-zone table in code, every hood gets weather), `Adjacent` (mirrored seed → crime spillover), `AttentionWeight` (spotlight bonus + event priority 0.8+0.25w), crisis weight earned from IncomeTier + CrimeIndex, gender table deleted, dead transit corridor map deleted | **LIVE PROD @55** (`bdccc08b` + `1a20a32f`; bench C108; 66 live cells) |
| 3 | Texture: 7 phrase pools keyed by hood → keyed by `EmployerCharacter` (17 label pools per engine, the twelve keep bespoke lines on top, `hoodTexturePool_`); arts / holiday / crowd membership lists → `Scenes` column (tag:weight); `lib/photoGenerator.js` left alone (ROLLOUT: media lane, not touched) | **LIVE PROD @57** (`9fa4cf43`; bench @56 C106/C107 clean, 0 errors, 457 label-pool lines, ten-hood hits in 7 of 10 — the other three drew no citizen yet; `hoodBlindTexture.test.js` 23/23) |

## Crisis weight — before / after (Phase 2 judgment, reversible by editing IncomeTier)

Formula: `clamp(0.5 + 0.15·(6 − IncomeTier) + 0.3·(CrimeIndex − 0.7), 0.4, 1.5)`, CrimeIndex engine-written (moves with the sim).

| Hood | Literal (priors) | Earned (C105 state) |
|---|---|---|
| Temescal | 0.9 | 1.26 |
| Downtown | 1.2 | 0.91 |
| Fruitvale | 1.0 | 1.04 |
| Lake Merritt | 0.8 | 0.54 |
| West Oakland | 1.3 | 0.79 |
| Laurel | 0.7 | 0.89 |
| Rockridge | 0.6 | 0.60 |
| Jack London | 1.0 | 0.86 |
| Uptown | 1.1 | 0.93 |
| KONO | 0.9 | 0.91 |
| Chinatown | 1.0 | 1.00 |
| Piedmont Ave | 0.5 | 0.56 |
| East Oakland / San Antonio / Dimond / Glenview / Ivy Hill | (invisible) | 1.24 / 1.12 / 1.08 / 1.04 / 0.94 |

The literal encoded real-world Oakland (West Oakland poor). Canon says West Oakland is IncomeTier 5, boom-born money; Temescal is tier 1, health-strained. Canon beats priors. Hazard: crisis spikes can raise CrimeIndex which raises the weight — bounded by the clamp and by `generateCrisisSpikes_`'s own caps.

## Acceptance criteria

- [x] Bench: World_Config gains the four rows on the first fire; 6 wave rows per cycle in the emptiest hoods; EmergenceCount ticks land in under-floor hoods; 0 Engine_Errors (C106–C108).
- [x] Unit: `scripts/hoodBlindDoors.test.js` 16/16, `scripts/hoodBlindTables.test.js` 9/9; suite green but djDirect (pre-existing).
- [x] PROD @54 / @55 byte-identical to HEAD (pull-back 0 differing).
- [ ] Live smoke at the builder's C106 fire: six World_Config rows, six 'migration wave' ledger rows, 22 Crime_Metrics rows refreshed, no throw on a blank cell.
- [x] Phase 3 shipped — bench C106/C107 on @56: 0 errors; ten-hood label lines landed (Adams Point 7, East Oakland 2, Baylight 2, Grand Lake 2, Eastlake 2, San Antonio 2, Dimond 1; Glenview / Ivy Hill / Brooklyn 0 — wave rows just arrived); PROD @57 pull-back 0 differing.
- [ ] Live smoke of @57 at the builder's C106 fire: a label-pool line on a ten-hood citizen, arts spotlight lists KONO, no throw on `Scenes` / `EmployerCharacter`.

## Findings filed

- Generic_Citizens was 205 M / 64 F → builder ruled the room skews female; shipped as Phase 1c (room women 61→69 across three bench cycles while the wave ran).
- Wave roles in employer-less hoods price at 60000 (`lookupIncome_` default — engine.135 D2 has no Business_Ledger reference pay there). Resolves as businesses arrive.

## Changelog

- 2026-09-05 — Plan written after Phase 1 + 2 shipped (S423).
- 2026-09-05 — Phase 1c (sex balance) shipped PROD @56; crisis-weight judgment confirmed by the builder (canon is the basis). Phase 0 results and rulings recorded in the research file.
- 2026-09-05 (S427) — Phase 3 built and shipped PROD @57 (bench @56 C106/C107 clean; proof trail in DEPLOY_HISTORY). Design: every hood draws the pool for its `EmployerCharacter` label (17 labels × 9 pool sets across 7 engines — a label with no pool throws, a new label is new logic); the twelve original hoods keep their bespoke lines on top; `|| genericEvents` and the "a familiar spot / corner" hood defaults deleted (memory venue path kept). New `Neighborhood_Map.Scenes` column replaces the five identical arts lists, `bondEngine` `ARTS_DISTRICT_NEIGHBORHOODS` + `FESTIVAL_NEIGHBORHOODS`, `mediaFeedbackEngine` `artsSpotlight`, and `cityEveningSystems` `HOLIDAY_CROWD` / First-Friday / Creation-Day boosts. Behaviour changes stated: arts spotlight gains KONO (was a 3-hood list); festival crowd union adds Jack London ArtSoulFestival:1, Grand Lake OaklandPride:1, San Antonio Cinco/Día:1 (bondEngine hosts the crowd table never had). Left alone by design: `recordWorldEventsv3` domain lists, `economicRippleEngine` triggers, `applyCityDynamics` corridors, `parseMediaRoomMarkdown`, `holidayNeighborhoodEvents` / `firstFridayEvents` bespoke prose. Live ledger read: 0 blank / 0 unresolvable hoods → `hoodTexturePool_` throws on an off-map name, blank = empty pool.
