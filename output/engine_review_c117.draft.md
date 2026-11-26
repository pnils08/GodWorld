# Engine Review — C117

Drafted by `scripts/draftEngineReview.js` from `output/engine_audit_c117.json` (16 patterns), `engine_anomalies_c117.json` (1), `baseline_briefs_c117.json` (104), the execution log and the run-cycle record. The session writes the calls (§Calls). Written for the next engine session and the civic chain's reader: what is real, what is mechanism, what goes to engine-debug.

## Fire

- 132 phases, 210.1 s, 0 failed phase(s), 1 warning(s), 0 error(s) (`output/execution_log_c117.txt`, from the Drive export).
- Completed line: Cycle completed. Engine errors logged: 0; audit issues tracked: 0; rng draws: 45669
- Slowest: Phase10-ExecuteIntents 58.8s · Phase11-MaintainLifeHistoryLog 23.8s · Phase5-CitizenEvents 12.0s · Phase5-Advancement 10.6s · Phase5-GenericCitizens 7.6s.
- Engine_Errors: 10 row(s), none for C117.
- Hand writes since C116 (Step 2.5): C116 close CLEAN.

## Scoreboard

married 2 · born 1 · promoted 1 · laidOff 0 · hired 4 · boughtHome 2 · soldHome 0 · forcedSale 0 · heritage 1.

## Findings

Each row is the record's own words; the id matches the desk signal's `finding C117-<i>`. The Call column is the session's.

| Id | Type | Sev | Where | Record | Call |
|---|---|---|---|---|---|
| C117-0 | stuck-initiative | low | Downtown · INIT-008 | Initiative "Downtown Economic Revitalization" in phase "vote-scheduled" for 3 cycles | _call_ |
| C117-1 | stuck-initiative | medium | Dimond · INIT-012 | Initiative "Dimond Revitalization Initiative" in phase "announced" for 4 cycles | _call_ |
| C117-2 | stuck-initiative | low | Ivy Hill · INIT-013 | Initiative "Ivy Hill Community Revitalization" in phase "announced" for 3 cycles | _call_ |
| C117-3 | repeating-event | medium | Citywide | Issue "none" recurred 3 cycles | _call_ |
| C117-4 | math-imbalance | medium | Fruitvale | Fruitvale: decay [Sentiment -0.170, HousingPressure +0.500] — Sentiment now 0.19 (7 of 22, city median 0.09); HousingPressure now 10 (20 of 22, city median 0) — with no matching active initiative | _call_ |
| C117-5 | math-imbalance | high | Grand Lake | Grand Lake: decay [Sentiment -0.060, RetailVitality -1.23, HousingPressure +1.000] — Sentiment now 0.09 (11 of 22, city median 0.09); RetailVitality now 13.65 (8 of 22, city median 9.93); HousingPressure now 6 (17 of 22, city median 0) — with no matching active initiative | _call_ |
| C117-6 | math-imbalance | medium | East Oakland | East Oakland: decay [Sentiment -0.140, RetailVitality -1.15] — Sentiment now 0.07 (14 of 22, city median 0.09); RetailVitality now 8.78 (14 of 22, city median 9.93) — with no matching active initiative | _call_ |
| C117-7 | coverage-gap | medium | Citywide | Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle | _call_ |
| C117-8 | production-imbalance | medium | Downtown, Temescal, Laurel, West Oakland, Jack London, Rockridge, Adams Point, Grand Lake, Piedmont Ave, Chinatown, Brooklyn, Glenview, Dimond, Ivy Hill, San Antonio, KONO, Uptown, Baylight District, East Oakland | 19 neighborhoods report migration flow with zero economic events this cycle | _call_ |

## Improvements

- C117-9: Initiative "Fruitvale Transit Hub Phase II — Visioning" advanced: complete → design-phase
- C117-10: Initiative "Baylight District — Final Council Vote" advanced: complete → construction-active
- C117-11: Initiative "Oakland Youth Apprenticeship Pipeline" advanced: implementation-active → stalled
- C117-12: Initiative "West Oakland Tenant Defense Fund" advanced: vote-scheduled → operational
- C117-13: Initiative "Ivy Hill Revitalization Initiative" advanced: announced → legislation-filed
- C117-14: Remedy overshot expectation on Neighborhood_Map.RetailVitality: observed 0.71 (expected 0.02) — from prior "stuck-initiative"
- C117-15: Remedy overshot expectation on Neighborhood_Map.RetailVitality: observed 0.71 (expected 0.02) — from prior "production-imbalance"

## Anomalies

- [high] POPID POP-01249 income Δ 376% (75400 → 358718); peer move share 0% — triage `route-to-engine-debug` (high). _call_

## Baseline briefs

104 written; pass-through to the civic chain (`cron-civic-run` required input). Not hand-edited.

## Calls

<!-- CALLS-PENDING: the session replaces this line with its calls; Step 4.1 refuses while it stands -->

