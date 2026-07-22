---
title: engine.55 — Intra-City Relocation (citizen neighborhood sorting)
created: 2026-07-12
updated: 2026-07-12
type: plan
tags: [engine, citizens, migration, done]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md engine.55
  - docs/plans/2026-06-14-ledger-representative-sample-migration-removal.md (nodes-permanent rule)
  - S315 engine.54 commit 66f3c7e8 (trajectory substrate this builds on)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[../SIMULATION_LEDGER]] §Migration (AL–AQ) — column semantics updated same commit"
---

# engine.55 — Intra-City Relocation

**Approved Mike-direct S316 (2026-07-12).** Built + tested same session.

## What it is

Citizens spawn into random neighborhoods at ingest. engine.54 gave neighborhoods
living economic state (trajectory / momentum / HousingPressure / MedianRent /
MedianIncome). engine.55 is the slow-burn sorter that uses it: whole household
units relocate **within** Oakland toward neighborhoods their economic life fits,
so citizen events, bonds, and careers fire against realistic context.

The dead Week-4 migration columns AN–AP (MigrationReason / MigrationDestination
/ MigratedCycle) become live causal fields. AQ (ReturnedCycle) stays legacy-dead
— no exit states exist (S313 nodes-permanent).

## Mechanic (v1, shipped)

All logic inside `phase05-citizens/migrationTrackingEngine.js` (v1.2) —
fix-don't-add; the `processMigrationEvents_` placeholder was the designed slot.
Runs Phase 5, immediately after Phase5-Trajectory, consuming its same-cycle
`ctx.summary.neighborhoodTrajectory` export (extended with post-drift
rent/income this build).

- **Two eligibility lanes, one shared cap** (`RELOCATION` constants):
  - *Pressure lane* — intent `planning-to-leave` (risk ≥8), 0.35 roll/cycle:
    priced-out units sort down toward affordability.
  - *Misfit lane* — unit income ≥2.5× current hood MedianIncome, 0.15
    roll/cycle: under-housed units sort up. Corrects random ingest placement.
- **Unit = household** (all SL rows sharing HouseholdId move together;
  Household_Ledger row re-hoods + re-prices to destination median rent) or a
  solo citizen. Split households (members in different hoods) are skipped.
- **Destination scoring, deterministic:** affordability peak at 30% rent burden
  (hard skip >40%), growth pulls +1.5 / decay repels −2, −pressure/4,
  income-proximity class alignment. Destination must beat the current hood by
  MIN_SCORE_GAIN 1.5 or the unit stays. Only the move roll consumes ctx.rng.
- **Cap 2 units/cycle** — moves are rare and qualitative (1:438 sample rule;
  no headcount claims).
- **Writes:** member rows via ctx.ledger (Phase 10 commits) — Neighborhood,
  MigrationReason (cost/displaced/opportunity), MigrationDestination,
  MigratedCycle, intent reset to `staying`. Household_Ledger direct
  (documented own-tracking exception). Hook `CITIZEN_RELOCATED` (sev 5,
  eventType `moved-within`) → ctx.summary.storyHooks + Ripple_Ledger.
- **Inline fix (same commit):** `buildHouseholdRentBurdenMap_` read a
  `RentBurdenPct` column Household_Ledger never had — rent burden was silently
  zero in risk scoring since Week 4. Now computed from MonthlyRent ×12 /
  HouseholdIncome when the column is absent.

## Verification

- `scripts/migrationRelocation.test.js` — 28/28: same-cycle payload (A1),
  burden fallback (A2), household unit move + AN–AP stamps + HH re-price +
  hook (A3), misfit upward sort (A4), cap (A5), nodes-permanent (A6),
  determinism (A7), no-better-fit stays (A8), split household untouched (A9).
- Regression: `scripts/testNeighborhoodLoop.js` 24/24,
  `auditFunctionCollisions` clean.
- Sandbox smoke: fire a cycle (C129+) and check SL AN–AP fills + Ripple_Ledger
  `CITIZEN_RELOCATED` rows. Expect zero-to-few moves early — pressure is still
  low (max 1.5 at C128) and misfit units must clear the score margin; the burn
  is deliberately slow.

## Expected behavior knobs (if tuning needed later)

`RELOCATION` block at the top of migrationTrackingEngine.js — cap, lane
chances, misfit ratio, burden band, score margin. All tuning is constants-only.
