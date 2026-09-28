# Engine Review — Cycle 109

**Cycle:** 109 | **In-world:** Y3C5
**Auditor version:** 1.0.0
**Fire:** PROD @132, 133 phases, 190.5s, 0 failed phases, 32,169 rng draws (`output/execution_log_c109.txt`)
**Source files:**
- `output/engine_audit_c109.json` — 8 patterns
- `output/engine_anomalies_c109.json` — 20 anomalies
- `output/baseline_briefs_c109.json` — 75 briefs

Pre-fire hand-write diff (run-cycle Step 2.5): 0 cells changed on Neighborhood_Map, Crime_Metrics, Civic_Office_Ledger since the C108 close. No snapshot rebase; briefs and anomalies carry no hand-write artifacts.

## What is real

- **Temescal Community Health Center opened.** INIT-005 `construction-active → operational`, build clock stamped to C88, baseline stamped for conversion. One `initiative-milestone` brief carries it.
- **Stabilization Fund paid out.** INIT-001 tranche $400,000: 2 household grants totalling $81,188, `BudgetRemaining` 23,800,000 → 23,400,000, `LastDisburseCycle` 109. Eligible 2; 39 skipped unflagged, 491 off-hood.
- **A household arrived.** Villanueva family of four, San Antonio, `HH-0109-I001`, POP-01130..01133, rented at $1,632.
- **12 citizens minted** (POP-01123..01134); ledger 952 → 963 rows.
- **A's take World Series Game 1; Oaks winless in preseason.** SportsSeason `playoffs` 22/22 hoods.
- **POP-00226 (Jemeal Brim) income 112,917 → 52,600.** LifeHistory Y3C4: "school-district side work ended; full hours back at the bakery". A lived event, not a defect — the anomaly's `route-to-engine-debug` triage is wrong for this row.

## Ailments

### 1. Downtown, Grand Lake, Fruitvale: mood slips while housing pressure climbs
- **Tech diagnosis:** Neighborhood_Map Sentiment −0.05 / −0.05 / −0.02, HousingPressure +1.0 each (Downtown 6, Grand Lake 4, Fruitvale 2.5; city median 0).
- **Existing mitigators:** none for Downtown or Grand Lake; Fruitvale reads `remedy-working` on the gap and `remedy-not-firing` on measurement (expected +0.02, observed −0.02) — the two fields disagree.
- **Why working/not:** no initiative targets housing pressure in any of the three.
- **Remedy path:** initiative design is a sim call — not proposed here.
- **Measure next cycle:** HousingPressure and Sentiment on the three rows.
- **Down from C108:** 15 hoods flagged decay at C108, 3 at C109.

### 2. "strain" recurred 4 cycles
- **Tech diagnosis:** Riley_Digest pattern flag `strain-trend`, 4 consecutive cycles.
- **Existing mitigators:** none. **Measure:** whether the flag clears at C110.

### 3. Faith: 5 events, zero coverage last cycle
- **Tech diagnosis:** domain count FAITH 5 of 10 world events; no faith piece in the C108 media record.
- **Remedy path:** desk routing, not engine.

### 4. Eight council approvals unchanged despite coverage
- **Mechanism, not world:** the approval model is level-based since engine.213 (a seat reads its district and moves on events). "Unchanged" is the model holding level. The detector predates it. Routed to engine-debug as a detector defect.

## Anomalies

- **POP-00226 income −53%** — real (see above). Cover-as-story eligible.
- **19 of 22 hoods "migration flow shifted"** — every one a week-to-week move of 1–5 on a small integer. This is the column's normal variation; the detector has no band. All `suppress-until-verified`. Routed to engine-debug as a detector defect: a flag that fires on 19 of 22 rows carries no signal.

## Improvements

- **IMPROVEMENT — Temescal Community Health Center operational.**
- **RetailVitality overshoot** across 19 hoods: observed +0.28 against an expected +0.02 from the prior production-imbalance remedy.

## Baseline Briefs

- Total: 75 (citizen-life-event 64, world-event 10, initiative-milestone 1)
- With promotion hints: 43
- Source: `output/baseline_briefs_c109.json`

## Measurement Check

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| repeating-event | city | — | — | — | — |
| math-imbalance | Downtown | — | — | — | no prior expectation |
| math-imbalance | Fruitvale | propose-new-initiative | +0.02 | −0.02 | remedy-not-firing |
| math-imbalance | Grand Lake | — | — | — | no prior expectation |
| coverage-gap | faith | — | — | — | — |
| writeback-drift | council | — | — | — | — |
| improvement | Temescal | — | — | — | — |
| improvement | 19 hoods | — | — | — | — |

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| propose-new-initiative | 0 | 0 | 1 | 0 |

## Routed to engine-debug

Detail and evidence: `output/production_log_run_cycle_c109_gaps.md` judgment entries.

1. Household intake assigned sex by dice to Tomás (female) and Renata (male); Family_Relationships Husband/Wife swapped. Four cells corrected on live and read back before the ledger snapshot was taken.
2. Media intake files reporters as new citizens with the honorific as first name, every cycle (7 rows now on Intake, all `review`).
3. Riley_Digest `IntakeProcessed` reads 0 on a cycle that minted a household and 12 citizens.
4. `mediaEffects` is read at Phase 5 and written at Phase 8 — media never influences citizen events.
5. storylineWeaving logs "CitizenRoles / CrossStorylineLinks column not found. Run migration first." every fire.
6. 3 duplicate-WeekRecord Engine_Errors (rows 230, 231, 233): the deployed engine takes one week record per franchise. Authoring shape, fixed by the engine.202 fold in the stacked ship.

## Summary

- Ailments: 6 (0 high, 6 medium)
- Anomalies: 20 (1 real event, 19 detector noise)
- Improvements: 2
- Baseline briefs: 75 (43 with promotion hints)
- Measurements: 0 / 1 firing as expected; 1 not firing
