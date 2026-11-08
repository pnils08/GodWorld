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

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: each producer's own scale and whether it already carries a rank (hook severity, chaos/crisis tier, migration type, trajectory type, initiative intensity); readers of the SeedID format | es | not started |
| 2 | Bar per kind in the builder, from each kind's own scale; replay C110–C114 old vs new, every class change listed for the builder's read | es | not started |
| 3 | Cluster key carries the initiative (causeId) when the neighborhood is blank — the coverage-reaction pattern | es | not started |
| 4 | SeedID written so the sheet keeps it as text; existing numeric rows stay as written | es | not started |
| 5 | Tests; codex diff review; sandbox proof; PROD | es | not started |

## Acceptance

1. Replay C110–C114: every class change named with its kind and reason; no kind's bar reads another kind's number.
2. Live: each multi-hood initiative has its own deck row; every new SeedID reads back equal to the engine's id.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

## Open questions

- None.

## Changelog

- 2026-11-08 (engine-sheet) — Created on the builder's word from the engine.334 report; findings 1–4 from the engine.334 read-before, replay and G-ES14.
