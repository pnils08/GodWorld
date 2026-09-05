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
- *The creating doors are the blind ones* → feeder + intake. The feeder cannot draw ten hoods (no key); intake's blank-hood draw is proportional to who already lives where, so 0 citizens → 0 chance. Authoring households is a patch over a bug in the door.
- *"Gifted allowance" = deficit weighting at the doors* → feeder + intake. Base weight from the sheet (CoreSimRank / IncomeTier), plus a deficit term that raises a hood's draw while it sits under its floor, and a pool-floor gate that also opens for a hood deficit. Fix-not-add: the 12-key literal is deleted, not extended.
- *Coverage does not follow headcount* → the health metric. East Oakland (2 citizens) has 15 story files; Uptown (94) has 0. Desks write from neighborhood state and businesses, so a bare hood produces stories with no citizen living the consequence — the exact defect in `feedback_civic-story-needs-affected-citizen`. The floor is therefore not "enough citizens to get covered" but "enough citizens that a story there has a protagonist": per story-type, one affected household + one employer + one bystander. Measure it from the desk packets (which citizens the c95–c109 stories actually quoted, per hood) before fixing a number.
- *Thirteen copies of one 12-key shape* → the untangle target. One Phase-1 seed (`S.canonHoods` already exists) plus a per-hood weight column or label on Neighborhood_Map replaces thirteen literals; a hood change becomes a cell edit, live next cycle, no deploy.
- *What is data and what is logic* → the builder's "what we need vs what I think we need" question. **Per-hood facts are data and belong on Neighborhood_Map** (weights, bands, characters, child areas, arts/nightlife/holiday leans — `EmployerCharacter` is the working pattern: one label many mechanics interpret). **City-wide scalars are data and belong on World_Config** (ADR-0015). **Formulas, phase order, and how a label is interpreted are logic and stay in code.** The tell: if changing a hood needs a code edit, a hood fact is living in code.

**Not applicable / hazard:**

- *One column per mechanic* would push Neighborhood_Map from 31 to 60+ columns and recreate the spaghetti in a spreadsheet. Use a handful of label columns that many readers interpret (EmployerCharacter style), not a column per reader.
- *Silent defaults.* Every migrated reader must throw on a missing hood (ADR-0015 §4, ADR-0016 accessors already throw when unseeded). A `|| 1.0` is the same bug in a new home; bench proves absence with a 22-hood assertion, not "0 errors."
- *ADR-0015 §2 says migrate-on-touch, never a project.* Builder ruling 2026-09-05 overrides that for the hood domain only: the 26 keyed tables are a scheduled project (engine.148). Membership lists stay on-touch (engine.99 long tail) — a hood absent from an arts list is not a defect.
- *Determinism.* Deficit weighting must read the ledger count once at cycle start and draw with `ctx.rng`; no live re-count mid-phase.
- *Household grouping.* Intake-side deficit weighting must respect the Family-key grouping (engine.109): a household moves as one, into one hood.
- *Do not touch the citizen spread by moving existing citizens.* Reassigning a Neighborhood cell is a canon change (identity.md); the fill comes through the doors, and through the builder's authored households.

**Verdict:** `adopt` — ignites engine.148 (ROLLOUT, `ready`, engine-sheet). Phase 0 is two measurements before any code: (a) per-story quoted-citizen count per hood from the c95–c109 packets, to set the floor; (b) diff the thirteen 12-key literals to confirm they are one shape. Then the door fix (feeder + intake deficit weighting from the sheet), then the keyed-table migration in caller-graph order.

**Ignited plans:** engine.148 plan to be written from Phase 0 results — `[[../plans/2026-09-05-hood-blind-engines-plan]]` (not yet written).

---

## Applications (living)

- 2026-09-05 — civic.21 row corrected: "remainder = engine.109 Task 7" was wrong; the feeder is the bug, T7 is the patch.

---

## Changelog

- 2026-09-05 — Initial extraction (S423, engine-sheet). Data pull + literal classification + builder ruling that hood untangling is in scope as a project.
