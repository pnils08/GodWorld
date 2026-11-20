# C116 anomalies — routed to engine-debug (CORRECTED: entry errors, repaired on the sheet 2026-11-15; see the gap log §G-EC33 and §G-EC34)

Source: `output/engine_anomalies_c116.json` (detectAnomalies 1.2.0). Four `route-to-engine-debug`, confidence high, all citizen-income. Rockridge migration (−2 → 2) is `suppress-until-verified`, medium, not routed.

| POPID | Name | Role (C115 snapshot) | Income C115 → C116 | Ratio |
|---|---|---|---|---|
| POP-00018 | Benji Dillon | Pitcher, Oakland A's Legend (Tier 1) | 13,000,000 → 250,000 | ×0.019 |
| POP-00527 | Mike Paulson | General Manager, Oakland A's & The Oaks (Tier 1) | 30,000,000 → 250,000 | ×0.008 |
| POP-00528 | Deacon Seymour | Manager, Oakland A's (Tier 2) | 7,600,000 → 120,000 | ×0.016 |
| POP-00598 | Vladimir Gonzalez | Right Fielder, Oakland A's (Tier 2) | 2,700,000 → 23,800,000 | ×8.8 |

## The first three — one feed row

One C116 Oakland_Sports_Feed row: EventType `rumor`, EventTrigger `retirement`, TeamsUsed A's, NamesUsed "Benji Dillon (SP), Mike Paulson (GM), Deacon Seymour (Manager)". Its Notes say Dillon "has not" made retirement official and is "leaving the door open on purpose." Execution log: `Sports trigger: A's -> retirement @ city-wide`; `applyGameNightMoments_: cycle 116 — 45 named, 0 staff, … 3 retired`. All three were GAME clock / Active / SPORTS_OVERRIDE in the C115 snapshot; live C116 has each on ENGINE with a `Former …` RoleType and a C116 `Retirement` life line. The incomes are the engine.338 post-career step by Tier (Tier 1 250,000, Tier 2 120,000) — the deployed step ran as written (`sportsRetire_`, `phase05-citizens/applyGameNightMoments.js`).

What is open (a ruling, not a repair): the step retires every GAME-clock Active row the row names. Here that is a pitcher the Notes say has not retired, a General Manager and a Manager, under a line that says "the playing salary ends." Nothing was hand-edited or reverted.

## POP-00598 — no identified writer

Live: GAME clock, Tier 2, SPORTS_OVERRIDE, Income 23,800,000. The engine's own wealth and career phases logged `Income: 0` at the fire; no C116 feed row carries a contract or a 23.8M figure for him (his name appears once, in a roster aside about right field); his C116 life lines are Reputation, Media and a media-usage Advancement stamp. C114's two income rises (Hayward, Henderson) had the same shape and were closed as hand-set contracts. Open until confirmed or ruled out.

## Why Step 2.5 did not catch it

`runCycle.js step 2.5` snapshots Neighborhood_Map, Crime_Metrics and Civic_Office_Ledger. Simulation_Ledger incomes are not in it, so an income written by hand between the C115 snapshot and the fire reaches the auditor as a world event.
