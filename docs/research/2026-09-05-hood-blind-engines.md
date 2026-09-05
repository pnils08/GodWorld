---
title: Hood-blind engines — one source for neighborhoods
created: 2026-09-05
updated: 2026-09-05
type: reference
tags: [research, engine, neighborhoods, truth-source, active]
sources:
  - output/simulation_ledger_snapshot.jsonl — headcount per hood, MigratedCycle / MigrationDestination / MigrationIntent columns (read S423, 2026-09-05)
  - live Neighborhood_Map (31 cols incl. MedianRent, MedianIncome, WealthMin, WealthMax, CoreSimRank, ChildAreas) — read 2026-09-05
  - output/execution_log_c105.md:141-146 — processMigrationTracking_ / applyMigrationDrift_ lines
  - phase05-citizens/migrationTrackingEngine.js:119-127 (RELOCATION), :540-700 (buildRelocationHoodState_, scoreHoodFit_, relocationCap_, processRelocations_)
  - phase02-world-state/loadNeighborhoodState.js hoodAdmits_; phase05-citizens/generationalWealthEngine.js homeHoodFloorAdmits_
  - phase05-citizens/generateGenericCitizens.js:411-430 (base weights literal), :506-575 (pickWeightedNeighborhood)
  - utilities/citizenDerivation.js:231 NEIGHBORHOOD_GENDER_VARIANCE_, lookupNeighborhood_ (freq-weighted blank-hood draw)
  - hood-literal classification pass over phase*/ utilities/ lib/ (non-test), 2026-09-05 — table below
  - output/cron-compare/*c95–c109*.md — 146 story files, hood-mention counts
  - docs/adr/0015-world-config-tunable-values.md, docs/adr/0016-data-ledgers-are-the-truth-source.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (engine.148)"
  - "[[index]] — registered same commit"
  - "[[../plans/2026-08-02-neighborhood-truth-source-migration]] — engine.99, the Cohort-1/2 migration this extends"
  - "[[../plans/2026-08-30-hood-identity-remainder-plan]] — engine.134, shipped PROD @51/@52"
---

# Hood-blind engines — one source for neighborhoods

**Source:** Internal. A data pull on 2026-09-05 (S423, engine-sheet) answering the builder's question after the ChildAreas wave: *does the net-worth migration fix the citizen spread, is there an acceptance mechanism per hood, do we need a gifted allowance into bare hoods, and what is a healthy minimum tracked count.* Builder ruling the same day: untangling this is **in scope as a project**, not migrate-on-touch — "when tweaking data or hoods it shouldn't require 50 code edits."

**What this addresses:** Ten of the 22 tracked hoods hold 0–7 citizens twenty days after ranking (civic.21). The builder's instinct is that engines are blind to hoods. This file records what the data says, which engines are blind and how, and what "one source" has to mean so the fix is a fix and not another copy.

**What it does (the mechanisms as built):**

- *Relocation* (`processRelocations_`): a household attempts a move only when planning-to-leave (0.35 roll) or income-misfit (0.15 roll). Destination = best rent-burden/income fit across every hood with rent+income on Neighborhood_Map (all 22 have them), gated by `hoodAdmits_` — the unit's best WealthLevel must sit inside the hood's WealthMin–WealthMax band. Cap = 5% of movable units (~43). Home purchase gates on WealthMin (`homeHoodFloorAdmits_`).
- *Generic feeder* (`generateGenericCitizens_`): hood drawn from a 12-key base-weight literal (the old twelve), blended with demographic weights only for hoods already in that literal. Grows only when the name pool is under floor (F60/M40, max 8/cycle).
- *Intake with blank hood* (`lookupNeighborhood_`): frequency-weighted draw over the current ledger population per hood.
- *Authored households on Intake* (engine.109 Task 7): the builder's hand.

## Data

Headcount (live ledger, non-deceased) vs story files mentioning the hood (c95–c109, 146 files):

| Hood | Citizens | Tier-1/2 | Story files |
|---|---|---|---|
| Lake Merritt | 103 | 11 | 8 |
| Fruitvale | 102 | 10 | 34 |
| Uptown | 94 | 5 | 0 |
| Downtown | 91 | 8 | 14 |
| Rockridge | 89 | 13 | 19 |
| Temescal | 89 | 4 | 21 |
| West Oakland | 81 | 7 | 41 |
| Chinatown | 76 | 6 | 2 |
| Jack London | 75 | 4 | 12 |
| Laurel | 68 | 4 | 2 |
| Piedmont Ave | 59 | 4 | 12 |
| KONO | 17 | 1 | 1 |
| Adams Point | 7 | 0 | 8 |
| Grand Lake | 3 | 1 | 5 |
| San Antonio | 3 | 0 | 1 |
| Baylight District | 2 | 1 | 9 |
| East Oakland | 2 | 0 | 15 |
| Dimond | 1 | 0 | 9 |
| Ivy Hill | 1 | 0 | 0 |
| Brooklyn | 0 | 0 | 0 |
| Eastlake | 0 | 0 | 0 |
| Glenview | 0 | 0 | 0 |

Relocation record on the ledger since the engine went live: C99 1, C102 2, C103 3, C104 3 (9 total; destinations Rockridge 3, Grand Lake 2, KONO 2, Lake Merritt 1). MigrationIntent: 662 staying, 1 considering, 1 planning-to-leave.

Hood-literal classification, 57 non-test engine files:

| Class | Files | What a missing hood does | Examples |
|---|---|---|---|
| Keyed table (`'Hood': value`) | 26 | silent default or invisible | 13 phase-05 files carry the same 12-key weight shape (`runCareerEngine`, `runHouseholdEngine`, `runEducationEngine`, `runCivicRoleEngine`, `runNeighborhoodEngine`, `runAsUniversePipeline`, `generateGenericCitizens`, `generateCitizensEvents`, `applyNamedCitizenSpotlight`, `prioritizeEvents`, `generateCrisisSpikes`, `updateCrimeMetrics`, `applyWeatherModel`); gender table 20 keys (3 stale); transit 17 (3 stale); `lib/photoGenerator` 16 (3 stale) |
| Membership list (`["Hood", …]`) | 31 | hood is simply not special | arts corridors, holiday zones, nightlife lists, validation dropdowns (2 still list Montclair/Old Oakland) |

Three files already read the sheet's 22 (`ensureCrimeMetrics`, `ensureNeighborhoodDemographics`, `v3NeighborhoodWriter`) — the pattern to copy.

**Extraction — what's usable:**

- *Net-worth migration is a gate, not a pull* → the spread. Bands and rent-fit stop the wrong household arriving; nothing attracts anyone. At ≈3 movers a cycle from a 662-staying population the bare hoods never fill through relocation. Leave relocation alone; it is physics and it is correct.
- *The dead door is Generic_Citizens → Simulation_Ledger emergence, not the feeder* → the spread. **Reversal (same day, live read of Generic_Citizens):** the pool already holds all 22 hoods (275 active; San Antonio 17, Ivy Hill 15, Eastlake 12, Brooklyn 6, Glenview 5), so the feeder's 12-key literal is a blindness worth deleting but is not what starves the ledger. Emergence is: 13 GCs emerged ever, ~50 EmergenceCount ticks across the whole pool, because surfacing (`generateCitizensEvents.js:2509`) is a 6% roll per unnamed ENGINE citizen event that prefers the event's own hood — and events happen where tracked citizens already live. A bare hood's GCs are never named, never tick, never earn the row. Intake's blank-hood draw is proportional to who already lives where (0 citizens → 0 chance). Authoring households is a patch over a dead door.
- *"Gifted allowance" = deficit weighting at the doors* → feeder + intake. Base weight from the sheet (CoreSimRank / IncomeTier), plus a deficit term that raises a hood's draw while it sits under its floor, and a pool-floor gate that also opens for a hood deficit. Fix-not-add: the 12-key literal is deleted, not extended.
- *Coverage does not follow headcount* → the health metric. East Oakland (2 citizens) has 15 story files; Uptown (94) has 0. Desks write from neighborhood state and businesses, so a bare hood produces stories with no citizen living the consequence — the exact defect in `feedback_civic-story-needs-affected-citizen`. The floor is therefore not "enough citizens to get covered" but "enough citizens that a story there has a protagonist": per story-type, one affected household + one employer + one bystander. Measure it from the desk packets (which citizens the c95–c109 stories actually quoted, per hood) before fixing a number.
- *Thirteen 12-key tables are three classes, not one shape* (Phase 0(b), measured): **texture-phrase pools** keyed by hood (7 files: the run*Engine flavor arrays, citizen-event venues — missing hood → generic pool), **numeric weights** (feeder base, spotlight bonus, event priority, crisis weight — missing hood → `|| 0` / `|| 1.0`), **structure** (weather profile — the loop iterates the literal's keys so ten hoods get no weather at all; crime adjacency — ten hoods have no neighbours for spillover; gender variance; transit corridor). Numeric weights derive from Neighborhood_Map columns that already exist (CoreSimRank, BoomIndex); structure needs two authored label columns (weather zone, adjacency); texture pools key by character label, not hood name.
- *What is data and what is logic* → the builder's "what we need vs what I think we need" question. **Per-hood facts are data and belong on Neighborhood_Map** (weights, bands, characters, child areas, arts/nightlife/holiday leans — `EmployerCharacter` is the working pattern: one label many mechanics interpret). **City-wide scalars are data and belong on World_Config** (ADR-0015). **Formulas, phase order, and how a label is interpreted are logic and stay in code.** The tell: if changing a hood needs a code edit, a hood fact is living in code.

**Not applicable / hazard:**

- *One column per mechanic* would push Neighborhood_Map from 31 to 60+ columns and recreate the spaghetti in a spreadsheet. Use a handful of label columns that many readers interpret (EmployerCharacter style), not a column per reader.
- *Silent defaults.* Every migrated reader must throw on a missing hood (ADR-0015 §4, ADR-0016 accessors already throw when unseeded). A `|| 1.0` is the same bug in a new home; bench proves absence with a 22-hood assertion, not "0 errors."
- *ADR-0015 §2 says migrate-on-touch, never a project.* Builder ruling 2026-09-05 overrides that for the hood domain only: the 26 keyed tables are a scheduled project (engine.148). Membership lists stay on-touch (engine.99 long tail) — a hood absent from an arts list is not a defect.
- *Determinism.* Deficit weighting must read the ledger count once at cycle start and draw with `ctx.rng`; no live re-count mid-phase.
- *Household grouping.* Intake-side deficit weighting must respect the Family-key grouping (engine.109): a household moves as one, into one hood.
- *Do not touch the citizen spread by moving existing citizens.* Reassigning a Neighborhood cell is a canon change (identity.md); the fill comes through the doors, and through the builder's authored households.

**Standing-ruling collision:** engine.58 (S320, builder-ruled, `godWorldEngine2.js:1266-1269`): "there should be a reason we are tracking you" — a Simulation_Ledger row is earned at EmergenceCount 3, never direct-minted. A "gifted allowance" that promotes bare-hood GCs without ticks contradicts it. Recorded here as the sim-behaviour call for the builder; the build takes the earned path (surface under-floor hoods' GCs more, keep the 3-tick gate) with the pace on World_Config cells. A bypass is not built unless ruled.

**Phase 0 results (2026-09-05):** (a) named-local-citizens per story — East Oakland 0.2 (13 of 15 stories quote nobody who lives there), Dimond 0.0 (9/9), Downtown 0.8 (9/14 zero-local despite 91 citizens), Adams Point 3.8 with only 7 citizens (0 zero-local). Headcount is not the floor; reachable citizens are. Floor is a World_Config cell (`hoodCitizenFloor`, default 12), tuned by the builder. (b) the thirteen literals are three classes (above), not one shape.

**Verdict:** `adopt` — ignites engine.148 (ROLLOUT, `ready`, engine-sheet). Phase 1: World_Config dials (`hoodCitizenFloor`, `gcSurfaceChance`, `hoodFloorSurfaceBoost`), tracked headcount per hood seeded once per cycle, feeder weights from the seed with deficit, surfacing deficit-draw with ChildAreas fold on the pool. Phase 2: structure + numeric tables. Phase 3: texture pools by character label.

**Ignited plans:** engine.148 plan to be written from Phase 0 results — `[[../plans/2026-09-05-hood-blind-engines-plan]]` (not yet written).

---

## Applications (living)

- 2026-09-05 — civic.21 row corrected: "remainder = engine.109 Task 7" was wrong; the feeder is the bug, T7 is the patch.
- 2026-09-05 — Phase 1 built (S423): builder ruled the slow drip will not fill ten hoods ("gifted" emergence = a migration event), superseding the engine.58 tick gate for under-floor hoods only. Four World_Config dials (`hoodCitizenFloor` 12, `hoodFloorPromotePerCycle` 6, `hoodFloorSurfaceQuota` 20, `gcSurfaceChance` 0.06), lazy per-cycle headcount seed, feeder weights from the rank order, surfacing floor draw, migration wave in `checkForPromotions_`. Tests `scripts/hoodBlindDoors.test.js` 16/16; suite 201/202.
- 2026-09-05 — Bench @51 C106/C107 on live-synced C105: World_Config +4 rows self-armed; wave 6+6 rows greedy by deficit (C106 Dimond 2 / Glenview 2 / Eastlake 1 / Brooklyn 1; C107 Ivy Hill 2 / Brooklyn / Glenview / Dimond / Eastlake); EmergenceCount 50 → 63 → 76 with ticks in San Antonio / Ivy Hill / Brooklyn / Glenview; 0 Engine_Errors. **PROD @54** = HEAD, pull-back 0 differing. **Findings (S423 bench):** Generic_Citizens is 205 M / 64 F, so the wave inherits the skew (F floor 60 is met, the feeder never refills — builder's call whether the wave draws sex-balanced); wave roles in employer-less hoods all price at 60000 (`lookupIncome_` default — engine.135 D2 has no Business_Ledger reference pay there; resolves as businesses arrive).

---

## Changelog

- 2026-09-05 — Initial extraction (S423, engine-sheet). Data pull + literal classification + builder ruling that hood untangling is in scope as a project.
- 2026-09-05 — Reversal after the live Generic_Citizens read: the pool holds all 22 hoods; the dead door is emergence, not the feeder. Phase 0 results recorded; engine.58 collision recorded.
