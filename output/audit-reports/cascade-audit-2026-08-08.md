# Cascade Consistency Audit — 2026-08-08

> **Read this first:** This is a read-only snapshot of the three city scales (World_Population city face, Neighborhood_Demographics hood layer, Simulation_Ledger citizen sample). It measures the current gap between the city dials and the ground layers that should support them, per the invariants in `docs/research/2026-08-07-city-neighborhood-cascade-team-review.md` §8 (with Kimi's amendment: the sick-rate convergence window is ≥25 cycles, not 10).

- **Generated:** 2026-08-30T19:17:00.998Z
- **Source:** `scripts/cascadeAudit.js`
- **Tabs read:** World_Population, Neighborhood_Map, Neighborhood_Demographics, World_Config, Simulation_Ledger, Hospital_Ledger, Relationship_Bonds
- **Missing tabs:** none
- **Missing columns:** none

## Three-denominator scale table

| Scale | Denominator | Ratio to city |
|---|---|---|
| City model (World_Population) | 387975.0 | — |
| Hood demo (Neighborhood_Demographics people columns) | 36917 | 1:10.5 |
| Ledger sample (Simulation_Ledger rows) | 968 (Active: 869) | 1:400.8 |

## Per-metric cascade table

### Illness

| Layer | Value | Numerator | Denominator |
|---|---|---|---|
| City dial (WP illnessRate) | 5.18% | — | 387975.0 |
| Hood layer (Σ Sick / Σ people) | 5.18% | 1911 | 36917 |
| Ledger layer (sick Status / HealthCause) | 0.00% | 0 | 968 |

Ledger sick-status breakdown: `{"Active":869,"Traded":48,"Retired":45,"deceased":5,"active":1}`; HealthCause non-empty: 0.

### Employment

| Layer | Value | Numerator | Denominator |
|---|---|---|---|
| City dial (WP employmentRate) | 93.15% | — | — |
| Hood layer (Σ Unemployed / Σ people) | 4.91% | 1814 | 36917 |
| Ledger layer (empty EmployerBizId / sample) | 6.71% | 65 | 968 |

Ledger employer breakdown: `{"nonEmpty":835,"untracked":68,"empty":65}` (UNTRACKED is intentional feedstock, not WP unemployment).

### Migration

| Layer | Value | Note |
|---|---|---|
| City dial (WP migration) | 1107 | — |
| Hood layer (Σ per-hood migration) | n/a (no migration column) | no migration column found |

## Invariant checks

| Invariant | Result | Detail |
|---|---|---|
| Σ hood migration deltas ≈ city migration ±10% | **SKIP** | No migration column in Neighborhood_Demographics |
| Hood Σ Sick / Σ pop inside the WP illnessRate envelope (−3pp relief … +2pp lag) | **PASS** | inside the envelope (≤5-cycle convergence lag applies) |
| Hood Sick rates uneven (max/min ≥ 1.3) — envelope filled from hood canon, not copied | **PASS** | max/min 1.96 |
| Hood Unemployed/pop within ±2pp of 1 − employmentRate | **PASS** | citySign=undefined, hoodSign=undefined |
| illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause | **PASS** | WP illnessRate 5.18% below 8% threshold |
| Sign(city migration) preserved in aggregate hood migration | **SKIP** | No hood migration column |

## Hood-set diff (Neighborhood_Map vs Neighborhood_Demographics)

- **In Neighborhood_Map but not Neighborhood_Demographics:** (none)
- **In Neighborhood_Demographics but not Neighborhood_Map:** (none)

## World_Config keys present

- approvalCeilingApprovalDrop
- approvalCeilingBaseChance
- approvalCeilingChanceStep
- approvalCeilingElectionPenalty
- approvalCeilingMaxChance
- approvalCeilingMinStreakCycles
- approvalCeilingScandalDurationCycles
- approvalCeilingThreshold
- bizIdHighWater
- cycleCount
- deathRate
- digestSheetID
- eclExclusiveMinLines
- eclExclusivePools
- employmentAttractor
- employmentFallbackRate
- employmentFloor
- employmentStep
- griefDurationCycles
- griefHolidayDurationCycles
- griefParticipationMultiplier
- griefPublicActivityMultiplier
- griefResponseChance
- griefSupportMultiplier
- growthRate
- hospitalBaseCapacity
- hospitalLoadPerSick
- hospitalTalkbackGain
- illnessCalmStep
- illnessCap
- illnessFallbackRate
- illnessStepDown
- illnessStepUp
- illnessSupportCycles
- illnessSupportThreshold
- lastRun
- logDriveID
- migrationClampHigh
- migrationClampLow
- migrationPopulationFallback
- migrationRate
- prosperityEarnedOnly
- simulationLedgerID
- worldName
- worldYearBase

## Notes

- This audit is read-only; no sheet was modified.
- Hospital_Ledger: 0 rows; Relationship_Bonds: 597 rows.
- The sick-rate band is intentionally soft: the hood chase is designed to lag the city dial by many cycles, so a ≥25-cycle convergence window is expected before failing.
- Migration invariant is currently SKIP because Neighborhood_Demographics has no migration/inflow column; the known `/17` over-allocation bug is latent in the code, not visible in this sheet layout.
