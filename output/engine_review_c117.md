# Engine Review — C117

Source: `output/engine_audit_c117.json` (16 patterns), `output/engine_anomalies_c117.json` (1), `output/baseline_briefs_c117.json` (104). Fire: PROD @208 stage 73, first live fire of stages 69–73. Written for the next engine session and the civic chain's reader: what is real, what is mechanism, what goes to engine-debug.

## Fire

- 132 phases, 210.1 s, 0 failed phases, 1 warning, 0 errors (`output/execution_log_c117.txt`). Completed line: engine errors 0, audit issues 0, rng draws 45,669.
- Slowest: Phase10-ExecuteIntents 58.8 s · Phase11-MaintainLifeHistoryLog 23.8 s · Phase5-CitizenEvents 12.0 s · Phase5-Advancement 10.6 s · Phase5-GenericCitizens 7.6 s.
- Engine_Errors: 9 rows, none C117 (C108/C109 sports-feed rejects, 11-12 cards daemon timeout, four C116 FireGuard refusals).
- Hand writes since C116: 0 cells (Step 2.5 CLEAN). Initiative_Tracker: 99 cells moved by the civic apply — world event.

## Scoreboard

married 2 · born 1 · promoted 1 · hired 4 · laid off 0 · bought home 2 · sold 0 · forced sale 0 · heritage 1.

## Ailments — real (world)

| Pattern | Sev | Reading | Call |
|---|---|---|---|
| Grand Lake decay | high | Sentiment −0.06 (0.09, rank 11/22 = median), RetailVitality −1.23 (13.65, rank 8, above median 9.93), HousingPressure +1 (6, rank 17) | Real one-week move. The hood stands at or above the city middle on two of three signals; the fall is from a high place. No active initiative. |
| Fruitvale decay | medium | Sentiment −0.17 (0.19, rank 7), HousingPressure +0.5 (10, rank 20 of 22) | Real. Housing pressure is the city's third highest. |
| East Oakland decay | medium | Sentiment −0.14 (0.07, rank 14), RetailVitality −1.15 (8.78, rank 14) | Real. Below the middle on both. |
| Dimond Revitalization (INIT-012) | medium | `announced` 4 cycles | Real institutional drag. |
| Downtown Economic Revitalization (INIT-008) | low | `vote-scheduled` 3 cycles | Real. |
| Ivy Hill Community Revitalization (INIT-013) | low | `announced` 3 cycles | Real. Note INIT-011 "Ivy Hill Revitalization Initiative" moved announced → legislation-filed the same week — two Ivy Hill revitalization rows on the tracker. Not traced. |
| Faith coverage gap | medium | 5 faith events this cycle, 0 Tribune pieces last cycle | Real media gap. |
| Production imbalance | medium | 19 hoods with migration flow, 0 economic events | Reading stands; not traced whether the economic-event generator is meant to fire per hood. |

## Ailments — mechanism (auditor defects, not world events)

- **repeating-event "none" (medium):** `Riley_Digest.recurringIssue = "none"` for 3 cycles; the detector counts the literal string "none" as a recurring issue (`recurringTokens: ["none"]`). Auditor defect. Nothing in the world recurs.
- **"Improvement" on a fall:** INIT-007 Oakland Youth Apprenticeship Pipeline `implementation-active → stalled` is filed as `improvement` — the detector files every phase change as an advance. The pipeline stalled; that is the opposite reading.
- **Duplicate measurement:** the RetailVitality overshoot (observed 0.71, expected 0.02) is filed twice, once per prior pattern (INIT-007 stuck-initiative, the production-imbalance). One measurement.
- INIT-003 Fruitvale Transit Hub Phase II and INIT-006 Baylight District moved `complete → design-phase` / `complete → construction-active`. The move is in the 99 civic-apply cells; filing it as an "advance" off `complete` is the same detector rule. Which writer set the phase not traced.

## Anomaly — route to engine-debug

- **POP-01249 Paloma Vasquez, Grand Lake — income 75,400 → 358,718 (×4.76).** Not a stray number: she took the owner door at C116 (Marquee Grocer, BIZ-00145) and the engine wrote "Marquee Grocer paid its owner $358718 this year — the books raised the draw" to her history. Marquee Grocer: revenue $1,413,436, 12 staff at $58,000 average (payroll ≈ $696k). The draw is ≈ 25% of revenue and ≈ 50% of what is left after payroll. Engine output stands (a bug is an event). Owed: read the owner-draw formula in the business engine against this row before calling it right or wrong.

## Improvements — real

- INIT-010 West Oakland Tenant Defense Fund `vote-scheduled → operational`.
- INIT-011 Ivy Hill Revitalization Initiative `announced → legislation-filed`.

## Baseline briefs

104 written; pass-through to the civic chain (`cron-civic-run` required input). Not hand-edited.

## Routed

- Auditor: "none" as a recurring issue; any phase change filed as improvement; one measurement filed per prior pattern → gap log C117.
- Business engine: owner draw read against POP-01249 → gap log C117.
