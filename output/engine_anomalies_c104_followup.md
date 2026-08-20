# C104 Anomaly Follow-up — all 54 suppressed, no engine defect

**Verdict: the auditor's baseline is stale. The C104 run is not implicated.**

## What the auditor flagged

54 anomalies, every one an income delta. 28 `route-to-engine-debug` (high confidence), 26 `suppress-until-verified` (medium).

## Why none of them are C104 events

**The values are stamped, not simulated.** 24 of 54 land on exactly $100,000; 31 of 54 land on a round thousand. Extremes: POP-00026 39,534 → 12,000,000 (+30,254%), POP-01052 32,414 → 23,000,000.

**C104's own income activity was small and irregular**, per the execution log:
- `processGenerationalWealth_ v2.1: Complete. Income: 10`
- `processEducationCareer_ v2.1: Complete. Income: 0`
- `runCareerEngine v2.7 rehire matcher: 10 hired (5 career changes) from unemployed pool of 60`
- `settleAdulthood_ engine.60 T4: settled 9` at 31,300 / 34,800 / 28,800 / 65,600 / 39,900

~20 changes, none round. The run cannot account for 54 deltas or for 24 identical $100,000 landings.

**The baseline explains it.** `engineAuditor.js` diffs against `output/engine_audit_c103.json`, dated 2026-08-11. C104 ran 2026-08-19. In that eight-day window a salary-floor backfill ran `applyEconomicProfiles.js` — the same event `engine.120` documents as the source of live stale `WealthLevel` values. Those backfilled incomes have no intervening snapshot, so the auditor attributes them to C104.

## Action

- **Edition: suppress all 54.** Not one is a world event.
- **Engine: do NOT open a bug against the income path.** The `route-to-engine-debug` triage on 28 of these is wrong for the same reason the anomalies are.
- **Real fix:** re-baseline the auditor so C105 diffs against C104 rather than against a pre-backfill snapshot. Until then every audit inherits this distortion — it also blanked the measurement loop on 18 of 19 patterns this cycle.

## Second follow-up (separate, same root cause class)

`effectEvidence.expectedField` for initiative mitigators is `Neighborhood_Map.RetailVitality`. The execution log shows initiative implementation effects landing in **sentiment**: `applyInitiativeImplementationEffects_ v1.0: 6 initiatives → sentiment 0.0890, 6 neighborhoods, 3 triggers` — and the cycle's two largest sentiment gains (Downtown +0.18, Lake Merritt +0.14) sit exactly where those effects were applied.

Consequence: the auditor reports `effects-not-firing` for INIT-001 and INIT-007, produces a `remedy-not-firing` verdict, and raises `techSide.bugReport` against `phase06/economicRippleEngine.js` + phase10 RetailVitality persistence. **Verify the expectation before treating that as an engine bug.** On present evidence the initiatives are firing and the auditor is watching the wrong column.

**Source:** `output/engine_audit_c104.json`, `output/engine_anomalies_c104.json`, C104 execution log ("Execution log 104d text.txt", Drive).
