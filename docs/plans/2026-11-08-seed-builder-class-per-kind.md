---
title: Seed Builder Class Per Kind Plan
created: 2026-11-08
updated: 2026-11-08
type: plan
tags: [engine, seeds, draft]
sources:
  - phase07-evening-media/buildContractSeeds.js:123-129 (contractSeedIsMajor_, one bar for every kind)
  - phase07-evening-media/buildContractSeeds.js:103-112, :668 (contractSeedHash_, SeedID)
  - phase02-world-state/applyInitiativeImplementationEffects.js:764 (multi-hood initiative ripple, blank neighborhood)
  - phase09-digest/finalizeCycleState.js:743 (carry: major → priority 3, texture → 2)
  - phase02-world-state/applyCityDynamics.js:1037 (seedWeight_ reads the carried priority)
  - scripts/buildLivesSlice.js:315 (Lives seeds sorted major first)
  - phase10-persistence/saveV3Seeds.js:114-133 (deck append, raw SeedID string)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.340"
  - "[[2026-11-05-story-seed-mixed-magnitudes]] — engine.334, Open questions (both raised there)"
  - "[[../../output/production_log_run_cycle_c114_gaps]] — G-ES14"
---

# Seed Builder Class Per Kind Plan

**Builder's words (2026-11-08), on the engine.334 report:** "why would fame and civic every compete other than by content quality? also you need me to tell you what is a major event vs a minor one?" · on the multi-hood initiative merge: "sounds like weak trick code … great choice that nooen sees it" · on the SeedID the sheet stores as a number: "the seed ids are inconsistent"

**Goal:** a seed's class says whether the event is big for its own kind; each initiative is its own seed; every SeedID reads back as the id the engine wrote.

**Rows:** engine.340 · **Owner:** engine-sheet

## Found (2026-11-08, engine.334 read-before and replay)

1. **One bar for every kind.** `contractSeedIsMajor_` is major when the cluster has ≥3 effects, `|m| ≥ 3`, or `0.05 ≤ |m| < 1`. Set in S296 (`b8359fc95`). Ripple magnitude is a dial delta, a head-count, points, an intensity or a fixed tag depending on the producer (C110–C114 ledger): every chaos, fame, crisis and service-disruption tag (constant 0.05) ranks major; every faith (0.01), city-event (0.02) and sighting (0.01) tag ranks texture; a full-strength initiative (intensity 1.0) ranks texture while 0.05–0.9 rank major; every migration (5/7/8) and trajectory (5–7) tag clears 3.
2. **Where class is read.** Phase 9 carry: major → priority 3, texture → 2 (`finalizeCycleState.js:743`) → next Cycle's hood seed weight (`applyCityDynamics.js:1037`). Lives slice sorts major first under its daily cap (`buildLivesSlice.js:315`). Content drafter takes the first three majors (`draftContentRows.js:281`). `/sift` (manual) sends texture to atmospheric. The desks otherwise read their own seeds; the carry cap of 60 has not bound (deck ~49 rows per Cycle).
3. **Initiatives merge.** A ripple from an initiative with more than one target hood carries a blank neighborhood (`applyInitiativeImplementationEffects.js:764`); the builder clusters by causeType|hood, so every multi-hood initiative in a Cycle becomes one citywide seed.
4. **SeedID read as a number.** The id is an 8-char hex hash (`contractSeedHash_`). The append writes it through `setValues`, which parses digits-e-digits (`97e00012`) as a number and all-digit ids as numbers (leading zeros lost). The C113 row reads back `9.70E+13`. Readers that key on the id (`buildLivesSlice` covered keys, `/sift` seedId) lose it.

## Read-before (2026-11-21, engine-sheet — Task 1, corrected same day)

Every ripple producer — the literal `recordRipple_` callers **and** the `recordHookRipple_` callers (`utilities/rippleLedger.js:104`, magnitude = `hook.severity`) — with the rank its magnitude already carries. Live counts are Ripple_Ledger C110–C116 (510 rows).

| Kind | Magnitude | Rank the code already holds | C110–C116 rows |
|---|---|---|---|
| Authored tag: chaos-event, fame-event, bond-event (marriage `bondEngine.js:2497`, divorce `householdFormationEngine.js:1212`), weather-event (incl. heat-wave-health, storm-/flood-business), transit-event (service-disruption 0.05, gridlock 0.02), crisis-event, faith-event, faith-join, youth-event, city-event, lifestyle-sighting | 0.05 / 0.1 or 0.01–0.02 | **Yes — the tag is the class.** 0.05 is written as "solo-major" (`chaosCarsEngine.js:815`, `bondEngine.js:2493`, `generateCitizensEvents.js:4004`, `WEATHER_SALIENCE.MAJOR_MAGNITUDE` `applyWeatherModel.js:160`); 0.01–0.02 as texture (`faithEventsEngine.js:181`, `runYouthEngine.js:485`). Crisis onset/peak 0.05, resolved 0.02 (`generateCrisisBuckets.js:75`). Chaos is gated at emit: consequence-class citizen outcomes and narrative-seeded (high-severity) business/hood hits only (`chaosCarsEngine.js:822,844`). fame-permanent 0.1 | 13 chaos, 45 fame, 1 crisis, 5 transit tags, 41 faith/join, 25 city, 22 sighting; 0 weather, 0 bond, 0 youth |
| Hook severity: migration, trajectory, household, seat-filled, left-office, approval-ceiling, challenger-campaign, demotion | 4–8 | **A ladder, no bar.** Severity per hook type (`migrationTrackingEngine.js:48-51`: relocated 5, forced 7, exodus 8 — return 4 is in the header only, no emit; `neighborhoodTrajectoryEngine.js:41-44`: rising 5, cooling 6, boom 7, housing-pressure 7). Copied to hook priority (`storyHook.js:1434`); no reader thresholds it | 85 migration, 70 trajectory; 0 household, 0 civic hooks |
| Initiative intensity: initiative-implementation | phase intensity × upkeep (`INITIATIVE_PHASE_INTENSITY_` :150-166; upkeep decays positive phases only, :575) | **Named, not read.** `:722` builds `initiative-active` at \|intensity\| ≥ 0.8 and `:734` `initiative-stalled` below 0, but only `triggerCount` is kept (:850; publish removed, header :10) | 48 |
| Vote ripple: initiative | +1.0 / −0.6 on birth and every carryover (`civicInitiativeEngine.js:1849,2080`) | None — every row is the same number | 6 |
| Ridership lift: transit-event game-day-crowds | `0.3 × unsigned × venueShare` (`updateTransitMetrics.js:88,649-661`) | None — a computed fraction, not a tag | 5 |
| Pressure delta: relocation-pressure | largest per-hood HousingPressure change from moves, 0–10 scale, ±0.05–0.1 per household (`neighborhoodTrajectoryEngine.js:310-325`) | None | 0 |
| Points: economic-event | impact table 4–25 (`economicRippleEngine.js` types), closure fixed −25/−40; carryover rows carry the birth impact undecayed (`:291`) | No bar (MAJOR_LAYOFFS is a name, not a threshold) | 33 (24 carryover) |
| Points: approval-shift, coverage-reaction | approval delta −4..7; coverage rating ±3..5 | No bar | 51, 3 |
| Fractional: edition-coverage, neighborhood-fold, sports sentiment | 0.003–0.136 | No bar beyond today's 0.05 arm | 14, 14, 13 |
| Head-count: sports game-night, game-night-household, game-night-texture | citizens touched 1–69 | None — a count of who was drawn, not the size of the game | 14 |
| Crime ladder: crime | `crimeMaxSpikes` (emits only at ≥ 2; 3 = wave, `applyCityDynamics.js:1588-1606`) | **Yes** — level 3 is the wave | 0 |

Also found:
- **SeedID readers.** Every reader keys on the id as read back: `buildLivesSlice.js:318` (covered keys `seed:<id>:<cycle>:<pop>`), `beatSliceKit.js:151`, `buildEconomicSlice.js:262`, `sportsSubstrate.js:386`, `citizen-signal-detector.js:157`, `validatePriorityEngine.js:74`. All take the sheet's value verbatim. `lib/sheets.js` writes RAW; the loss is Apps Script `setValues` on the Phase-10 append.
- **Crime's pipe-joined hood is not a merge.** One ripple names several hoods as `A|B`; `contractSeedNormHood_` (`buildContractSeeds.js:234`) strips it to one key for that one ripple. (Retracts the first-pass claim.)
- **The cluster-count arm** (≥3 effects → major) is one bar for every kind: 29 faith community_program rows, 33 fame tier-climbs and 78 relocations reach major by volume in a hood. Two producers were written for it: faith-event (crisis-response cluster, `faithEventsEngine.js:181-183`) and faith-join (congregation surge, `bondEngine.js:1056-1058`).
- The C110 `sports` row with effectType `traffic/retail/nightlife/communityEngagement` (0.46) came from an older `applySportsFeedTriggers_`; today it emits `sentiment` only (`applySportsSeason.js:895,914`).
- 0 bond-event rows in seven Cycles → gap log, not this job.

## Task 2 design — the bar per unit

The class is decided per **unit group** (`contractSeedUnit_`, engine.334), so a sports seed's sentiment and its head-count never share a bar. A seed is major when any unit group is major (unchanged rule). Each unit group carries the causeType and effectType of its first ripple (added in `contractSeedUnitGroups_`); `contractSeedIsMajor_(causeType, effectType, figure, n)` — one caller (`buildContractSeeds.js:594-596`) and the test file. Table `CONTRACT_SEED_CLASS` by causeType, effectType override where a cause mixes scales:

| Rule | Kinds | Major when | Source |
|---|---|---|---|
| tag | chaos, fame, bond, weather, transit service-disruption / gridlock, crisis, youth, city-event, lifestyle-sighting | \|m\| ≥ 0.05 | code (the producers' solo-major tag) — same as today |
| tag + surge | faith-event, faith-join | \|m\| ≥ 0.05, or n ≥ 3 in the unit | code (both producers name the ≥3 cluster as their surge story) |
| crime | crime | m ≥ 3 (the wave) | code |
| intensity | initiative-implementation | \|m\| ≥ 0.8 or m < 0 | code names these cuts (`:722,734`) but nothing reads them — **mine, from the code's words** |
| vote | initiative | the birth row (vote landed) | **mine** — the number never varies |
| carryover | effectType `carryover` (initiative, economic-event) | never decides class | **mine** — the same event a later week, at its birth figure |
| hook | migration, trajectory, household, seat-filled, left-office, approval-ceiling, challenger-campaign, demotion | severity ≥ 7 | **mine** — forced move, exodus, boom, housing pressure; a single move or a hood turning is texture |
| points | economic-event (birth) | \|m\| ≥ 10; business-closure always | **mine** — the impact table's large events |
| points | approval-shift, coverage-reaction | \|m\| ≥ 3 | **mine** — today's number kept |
| fraction | edition-coverage, neighborhood-fold, sports sentiment | \|m\| ≥ 0.05 | **mine** — today's number kept. fold-applied/approval-shift tops out at 0.021 (`ch.delta × 0.003`), so it is always texture; the approval-shift seed itself carries that event |
| lift | transit game-day-crowds | \|m\| ≥ 0.1 | **mine** — a tenth more riders |
| pressure | relocation-pressure | \|m\| ≥ 0.5 | **mine** — about five net households in one hood |
| count | game-night, game-night-household, game-night-texture | never decides class | **mine** — the game's sentiment unit decides |

- **Cluster-count arm removed** except where the producer wrote it as its bar (faith surge, above) — volume in a hood is not size for its kind (builder 11-08: kinds compete by content, not by number). Every flip is listed in the replay.
- **Unlisted kind:** texture, and an `Engine_Errors` row through `logEngineError_` naming the causeType / effectType (the engine.209 shape, `sportsWeekRecord.js:230`) — visible, never a throw. A test scans every `recordRipple_` / `recordHookRipple_` call under `phase0*/` for its causeType literal and fails on any not in the table.
- **Downstream, listed in the replay, not changed:** Phase-9 carry priority 3 → 2 for each demoted seed (`finalizeCycleState.js:743`) and so next Cycle's hood seed weight (`applyCityDynamics.js:1037`); the Lives slice's major-first order (`buildLivesSlice.js:315`); the drafter's first three majors (`draftContentRows.js:281`) — per-Cycle count of COMMUNITY/SPORTS majors before and after.
- **Tests rewritten:** the builder's test cases 3b (three small economic ripples promoted by count) and 13c (15 relocations at severity 5 major) assert the old bar.
- **Replay** (before Task 3, which changes the cluster key the SeedID hashes): `--old` pinned to the pre-cut commit; per seed, the arm that made it major; per-Cycle major/texture totals. Kinds with no rows in the window are covered by tests and named "no rows".

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: each producer's own scale and whether it already carries a rank (hook severity, chaos/crisis tier, migration type, trajectory type, initiative intensity); readers of the SeedID format | es | done 2026-11-21 (§Read-before) |
| 2 | Bar per kind in the builder, from each kind's own scale; replay C110–C114 old vs new, every class change listed for the builder's read | es | done 2026-11-21 — replay C110–C116: 323 seeds, 91 flips (`output/engine-sheet/2026-11-21-engine340-replay-c110-c116.txt`); bars stand (builder 11-21: he does not set major/minor) |
| 3 | Cluster key carries the initiative (causeId) when the neighborhood is blank — the coverage-reaction pattern | es | done 2026-11-21 — C110–C116: the merged citywide initiative seed splits into its three initiatives each Cycle (+2 seeds a Cycle) |
| 4 | SeedID written so the sheet keeps it as text; existing numeric rows stay as written | es | built 2026-11-21 — leading apostrophe on the Phase-10 row (`saveV3Seeds.js`); proof is the bench read-back |
| 5 | Sandbox proof (row read-off; no tests on this project, builder 11-21); PROD | es | waits: research-build's unbenched engine.350 pile is in flight on the shared sandbox |

## Acceptance

1. Replay C110–C114: every class change named with its kind and reason; no kind's bar reads another kind's number.
2. Live: each multi-hood initiative has its own deck row; every new SeedID reads back equal to the engine's id.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Task 2 plan review | agy | `output/antigravity/2026-11-21-review-e340-class-per-kind.md` | HOLD, 6 findings; all verified and folded (relocation-pressure missing; unit group carries no causeType; initiative ranks unread and vote rows constant; game-day-crowds is a lift; no sports venue producer; faith surge wrote the count arm; Engine_Errors row for an unlisted kind) |

## Open questions

- None.

## Changelog

- 2026-11-22 (engine-sheet) — **C117 live read (Task 5).** Acceptance 2b holds: SeedIDs read back as text — C117's all-digit `78033564` stayed text (C113 `9.70E+13`, C115 `6.55E+07` before the fix). Acceptance 2a not readable: 48 C117 seeds (texture 25, major 23), 0 name an initiative; the one CIVIC coverage reaction is citywide with no initiative. Re-dated C118.
- 2026-11-21 (engine-sheet) — Tasks 3 and 4 built; Task 2 bars stand on the builder's word. Sandbox next, behind research-build's engine.350 pile.
- 2026-11-21 (engine-sheet) — agy plan review HOLD folded (6 of 6 verified against the code).
- 2026-11-21 (engine-sheet) — Task 1 corrected (advisor): hook-ripple producers added; the tags and the initiative intensity already carry a rank; crime pipe-hood retracted as a merge case. Task 2 design written; codex plan review next.
- 2026-11-21 (engine-sheet) — Task 1 done: producer scales table, crime pipe-hood merge case, SeedID readers listed. No code touched.
- 2026-11-08 (engine-sheet) — Created on the builder's word from the engine.334 report; findings 1–4 from the engine.334 read-before, replay and G-ES14.
- 2026-11-21 (engine-sheet, session close) — Row flipped to live-observing: Tasks 1–4 are on PROD since stage 63 (pushed without a bench on the builder's order); Task 5's read is the first live fire, C117.
