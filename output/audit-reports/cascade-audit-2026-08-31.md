# Cascade Consistency Audit — 2026-08-31

> **Read this first:** This is a read-only snapshot of the three city scales (World_Population city face, Neighborhood_Demographics hood layer, Simulation_Ledger citizen sample). It measures the current gap between the city dials and the ground layers that should support them, per the invariants in `docs/research/2026-08-07-city-neighborhood-cascade-team-review.md` §8 (with Kimi's amendment: the sick-rate convergence window is ≥25 cycles, not 10).

- **Generated:** 2026-08-31T18:20:13.756Z
- **Source:** `scripts/cascadeAudit.js`
- **Tabs read:** World_Population, Neighborhood_Map, Neighborhood_Demographics, World_Config, Simulation_Ledger, Hospital_Ledger, Relationship_Bonds
- **Missing tabs:** none
- **Missing columns:** none

## Three-denominator scale table

| Scale | Denominator | Ratio to city |
|---|---|---|
| City model (World_Population) | 389122.0 | — |
| Hood demo (Neighborhood_Demographics people columns) | 38109 | 1:10.2 |
| Ledger sample (Simulation_Ledger rows) | 968 (Active: 867) | 1:402 |

## Per-metric cascade table

### Illness

| Layer | Value | Numerator | Denominator |
|---|---|---|---|
| City dial (WP illnessRate) | 5.16% | — | 389122.0 |
| Hood layer (Σ Sick / Σ people) | 5.03% | 1915 | 38109 |
| Ledger layer (sick Status / HealthCause) | 0.21% | 2 | 968 |

Ledger sick-status breakdown: `{"Active":867,"Traded":48,"Retired":45,"critical":1,"deceased":5,"recovering":1,"active":1}`; HealthCause non-empty: 2.

### Employment

| Layer | Value | Numerator | Denominator |
|---|---|---|---|
| City dial (WP employmentRate) | 93.53% | — | — |
| Hood layer (Σ Unemployed / Σ Adults) | 6.58% | 1803 | 27384 |
| Ledger layer (empty EmployerBizId / sample) | 6.71% | 65 | 968 |

Ledger employer breakdown: `{"nonEmpty":835,"untracked":68,"empty":65}` (UNTRACKED is intentional feedstock, not WP unemployment).

### Migration

| Layer | Value | Note |
|---|---|---|
| City dial (WP migration) | 1176 | — |
| Hood layer (Σ per-hood migration) | n/a (no migration column) | no migration column found |

## Invariant checks

| Invariant | Result | Detail |
|---|---|---|
| Σ hood migration deltas ≈ city migration ±10% | **SKIP** | No migration column in Neighborhood_Demographics |
| Hood Σ Sick / Σ pop inside the WP illnessRate envelope (−3pp relief … +2pp lag) | **PASS** | inside the envelope (≤5-cycle convergence lag applies) |
| Hood Sick rates uneven (max/min ≥ 1.3) — envelope filled from hood canon, not copied | **PASS** | max/min 2.57 |
| Hood Unemployed/Adults within ±2pp of 1 − employmentRate | **PASS** | hood 6.58% vs dial 6.47% — gap 0.11pp |
| Hood unemployment spread ≥ 2pp between top and bottom IncomeTier | **PASS** | tier 1 6.87% vs tier 6 4.14% — spread 2.74pp |
| illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause | **PASS** | WP illnessRate 5.16% below 8% threshold |
| Sign(city migration) preserved in aggregate hood migration | **SKIP** | No hood migration column |

### Unemployment by IncomeTier

| IncomeTier | Hoods | Unemployed / Adults |
|---|---|---|
| 1 | 1 | 6.87% |
| 2 | 5 | 7.96% |
| 3 | 8 | 6.71% |
| 4 | 3 | 5.20% |
| 5 | 4 | 5.97% |
| 6 | 1 | 4.14% |

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
- employmentAttractorPull
- employmentConvergenceRate
- employmentFallbackRate
- employmentFloor
- employmentHoodWeightMax
- employmentHoodWeightMin
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
- illnessAttractorPull
- illnessBaseline
- illnessCalmStep
- illnessCap
- illnessEventStrain
- illnessFallbackRate
- illnessHoodWeightMax
- illnessHoodWeightMin
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
- Hospital_Ledger: 2 rows; Relationship_Bonds: 599 rows.
- The sick-rate band is intentionally soft: the hood chase is designed to lag the city dial by many cycles, so a ≥25-cycle convergence window is expected before failing.
- Migration invariant is currently SKIP because Neighborhood_Demographics has no migration/inflow column; the known `/17` over-allocation bug is latent in the code, not visible in this sheet layout.
